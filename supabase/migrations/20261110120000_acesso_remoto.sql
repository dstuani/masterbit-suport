-- ─────────────────────────────────────────────────────────────────────────────
-- Acesso remoto pelo RustDesk com servidor próprio.
--
-- O agente de coleta instala o RustDesk apontado para o servidor da organização,
-- aplica a senha permanente do cliente e envia o ID do RustDesk junto com o hardware.
-- A ficha do equipamento mostra o ID e o botão Conectar.
--
-- Senha e configuração do servidor: só owner e técnico leem e escrevem
-- (visualizador e papéis restritos não). Nenhuma das duas tabelas tem auditoria
-- automática: o audit_logs guardaria a senha em texto.
-- ─────────────────────────────────────────────────────────────────────────────

-- ID do RustDesk: 9 ou 10 dígitos no padrão, mas o RustDesk aceita ID personalizado.
alter table equipamentos
  add column rustdesk_id text,
  add constraint equipamentos_rustdesk_id_valido
    check (rustdesk_id is null or rustdesk_id ~ '^[A-Za-z0-9_-]{6,32}$');

-- ─── Servidor RustDesk da organização ────────────────────────────────────────
-- A "config string" que o próprio RustDesk exporta (Rede → Exportar configuração do
-- servidor): base64 com servidor de ID, relay e chave pública do servidor.

create table acesso_remoto_config (
  org_id          uuid primary key references organizacoes (id) on delete cascade,
  rustdesk_config text not null,
  updated_at      timestamptz not null default now(),

  -- Tamanho à parte: o Postgres não aceita repetição acima de 255 dentro da regex.
  constraint acesso_config_valida
    check (length(rustdesk_config) between 20 and 4000 and rustdesk_config ~ '^[A-Za-z0-9+/=_-]+$')
);

create trigger acesso_remoto_config_updated_at
  before update on acesso_remoto_config
  for each row execute function definir_updated_at();

alter table acesso_remoto_config enable row level security;

create policy acesso_config_ler on acesso_remoto_config
  for select using (org_id = org_atual() and pode_escrever());
create policy acesso_config_criar on acesso_remoto_config
  for insert with check (org_id = org_atual() and pode_escrever());
create policy acesso_config_alterar on acesso_remoto_config
  for update using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

-- ─── Senha permanente do RustDesk, uma por cliente ───────────────────────────
-- Fica em texto porque o técnico precisa dela para conectar. Caracteres limitados:
-- ela vai numa linha de comando do Windows (aspas, espaço e $ quebrariam o comando).

create table cliente_acesso_remoto (
  cliente_id uuid primary key references clientes (id) on delete cascade,
  org_id     uuid not null references organizacoes (id) on delete cascade,
  senha      text not null,
  updated_at timestamptz not null default now(),

  constraint acesso_senha_valida check (senha ~ '^[A-Za-z0-9!@#%&*+=?_.:-]{8,64}$')
);

create trigger cliente_acesso_remoto_updated_at
  before update on cliente_acesso_remoto
  for each row execute function definir_updated_at();

alter table cliente_acesso_remoto enable row level security;

-- O cliente precisa ser da mesma organização: o org_id da linha sozinho não garante isso.
create policy acesso_senha_ler on cliente_acesso_remoto
  for select using (org_id = org_atual() and pode_escrever());
create policy acesso_senha_criar on cliente_acesso_remoto
  for insert with check (
    org_id = org_atual() and pode_escrever()
    and exists (select 1 from clientes c where c.id = cliente_id and c.org_id = org_atual())
  );
create policy acesso_senha_alterar on cliente_acesso_remoto
  for update using (org_id = org_atual() and pode_escrever())
  with check (
    org_id = org_atual() and pode_escrever()
    and exists (select 1 from clientes c where c.id = cliente_id and c.org_id = org_atual())
  );

-- ─── Coleta recebe o ID do RustDesk ──────────────────────────────────────────
-- Mesma função da migration 20261011120000, com o rustdesk_id. Coleta sem ID (RustDesk
-- não instalado ou não lido) mantém o ID anterior. CREATE OR REPLACE mantém o grant a anon.
create or replace function registrar_coleta(p_chave text, p_dados jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave        coleta_chaves%rowtype;
  v_ident        text := left(btrim(coalesce(p_dados ->> 'identificador', '')), 64);
  v_nome         text := left(btrim(coalesce(p_dados ->> 'nome', '')), 120);
  v_tipo         text := coalesce(p_dados ->> 'tipo', 'computador');
  v_rustdesk     text := nullif(regexp_replace(left(coalesce(p_dados ->> 'rustdesk_id', ''), 64), '\s', '', 'g'), '');
  v_existente    equipamentos%rowtype;
  v_novas        integer;
  v_novo         equipamentos%rowtype;
begin
  if p_chave is null or length(p_chave) < 20 or length(p_chave) > 100 then
    raise exception 'chave_invalida';
  end if;

  select * into v_chave
    from coleta_chaves
   where hash = encode(sha256(convert_to(p_chave, 'UTF8')), 'hex')
     and revogada_em is null;
  if not found then
    raise exception 'chave_invalida';
  end if;

  if p_dados is null or jsonb_typeof(p_dados) <> 'object' or pg_column_size(p_dados) > 65536
     or length(v_ident) < 8 or length(v_nome) < 1 then
    raise exception 'dados_invalidos';
  end if;

  if v_tipo not in ('computador', 'notebook', 'servidor', 'impressora', 'outro') then
    v_tipo := 'computador';
  end if;

  -- ID fora do formato é descartado em silêncio: o resto do inventário continua valendo.
  if v_rustdesk is not null and v_rustdesk !~ '^[A-Za-z0-9_-]{6,32}$' then
    v_rustdesk := null;
  end if;

  select * into v_existente
    from equipamentos
   where cliente_id = v_chave.cliente_id and identificador = v_ident;

  if found then
    if v_existente.ultima_coleta_em > now() - interval '5 minutes' then
      return 'ignorada';
    end if;
  else
    select count(*) into v_novas
      from equipamentos
     where cliente_id = v_chave.cliente_id
       and origem = 'agente'
       and created_at > now() - interval '1 hour';
    if v_novas >= 300 then
      raise exception 'limite_excedido';
    end if;
  end if;

  insert into equipamentos as e (
    org_id, cliente_id, identificador, nome, tipo, origem,
    fabricante, modelo, numero_serie, sistema_operacional, versao_so,
    processador, nucleos, memoria_mb, discos, volumes, rede, usuario, dominio,
    rustdesk_id, ultima_coleta_em, coletas
  ) values (
    v_chave.org_id, v_chave.cliente_id, v_ident, v_nome, v_tipo, 'agente',
    nullif(left(btrim(coalesce(p_dados ->> 'fabricante', '')), 120), ''),
    nullif(left(btrim(coalesce(p_dados ->> 'modelo', '')), 120), ''),
    nullif(left(btrim(coalesce(p_dados ->> 'numero_serie', '')), 120), ''),
    nullif(left(btrim(coalesce(p_dados ->> 'sistema_operacional', '')), 120), ''),
    nullif(left(btrim(coalesce(p_dados ->> 'versao_so', '')), 60), ''),
    nullif(left(btrim(coalesce(p_dados ->> 'processador', '')), 160), ''),
    case when (p_dados ->> 'nucleos') ~ '^\d{1,4}$' then (p_dados ->> 'nucleos')::integer end,
    case when (p_dados ->> 'memoria_mb') ~ '^\d{1,8}$' then (p_dados ->> 'memoria_mb')::integer end,
    case when jsonb_typeof(p_dados -> 'discos') = 'array' and jsonb_array_length(p_dados -> 'discos') <= 20
         then p_dados -> 'discos' else '[]'::jsonb end,
    case when jsonb_typeof(p_dados -> 'volumes') = 'array' and jsonb_array_length(p_dados -> 'volumes') <= 30
         then p_dados -> 'volumes' else '[]'::jsonb end,
    case when jsonb_typeof(p_dados -> 'rede') = 'array' and jsonb_array_length(p_dados -> 'rede') <= 20
         then p_dados -> 'rede' else '[]'::jsonb end,
    nullif(left(btrim(coalesce(p_dados ->> 'usuario', '')), 120), ''),
    nullif(left(btrim(coalesce(p_dados ->> 'dominio', '')), 120), ''),
    v_rustdesk,
    now(), 1
  )
  on conflict (cliente_id, identificador) do update set
    nome                = excluded.nome,
    fabricante          = excluded.fabricante,
    modelo              = excluded.modelo,
    numero_serie        = excluded.numero_serie,
    sistema_operacional = excluded.sistema_operacional,
    versao_so           = excluded.versao_so,
    processador         = excluded.processador,
    nucleos             = excluded.nucleos,
    memoria_mb          = excluded.memoria_mb,
    discos              = excluded.discos,
    volumes             = excluded.volumes,
    rede                = excluded.rede,
    usuario             = excluded.usuario,
    dominio             = excluded.dominio,
    rustdesk_id         = coalesce(excluded.rustdesk_id, e.rustdesk_id),
    ultima_coleta_em    = now(),
    coletas             = e.coletas + 1;

  -- Compara o hardware anterior com o recém-chegado. Só registra quando os dois lados
  -- foram lidos: um valor vazio costuma ser falha de leitura do agente, não troca de peça.
  if v_existente.id is not null then
    select * into v_novo from equipamentos where id = v_existente.id;

    if v_existente.memoria_mb is not null and v_novo.memoria_mb is not null
       and v_existente.memoria_mb <> v_novo.memoria_mb then
      insert into equipamento_alteracoes (org_id, equipamento_id, componente, antes, depois)
      values (v_novo.org_id, v_novo.id, 'memoria', v_existente.memoria_mb::text, v_novo.memoria_mb::text);
    end if;

    if v_existente.processador is not null and v_novo.processador is not null
       and v_existente.processador <> v_novo.processador then
      insert into equipamento_alteracoes (org_id, equipamento_id, componente, antes, depois)
      values (v_novo.org_id, v_novo.id, 'processador', v_existente.processador, v_novo.processador);
    end if;

    if assinatura_discos(v_existente.discos) is not null and assinatura_discos(v_novo.discos) is not null
       and assinatura_discos(v_existente.discos) <> assinatura_discos(v_novo.discos) then
      insert into equipamento_alteracoes (org_id, equipamento_id, componente, antes, depois)
      values (v_novo.org_id, v_novo.id, 'disco', assinatura_discos(v_existente.discos), assinatura_discos(v_novo.discos));
    end if;

    if v_existente.sistema_operacional is not null and v_novo.sistema_operacional is not null
       and (v_existente.sistema_operacional, coalesce(v_existente.versao_so, ''))
           is distinct from (v_novo.sistema_operacional, coalesce(v_novo.versao_so, '')) then
      insert into equipamento_alteracoes (org_id, equipamento_id, componente, antes, depois)
      values (v_novo.org_id, v_novo.id, 'sistema',
              btrim(v_existente.sistema_operacional || ' ' || coalesce(v_existente.versao_so, '')),
              btrim(v_novo.sistema_operacional || ' ' || coalesce(v_novo.versao_so, '')));
    end if;
  end if;

  update coleta_chaves
     set ultimo_uso_em = now(), usos = usos + 1
   where id = v_chave.id;

  return 'ok';
end;
$$;
