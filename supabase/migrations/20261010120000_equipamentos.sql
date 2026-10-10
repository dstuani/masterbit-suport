-- ─────────────────────────────────────────────────────────────────────────────
-- Equipamentos: o parque de máquinas dos clientes.
--
-- Os dados de hardware chegam por um agente (script PowerShell agendado em cada
-- computador do cliente), que chama a função registrar_coleta com a chave de coleta
-- do cliente. A ficha guarda o hardware atual; as manutenções formam o histórico.
-- ─────────────────────────────────────────────────────────────────────────────

create type origem_equipamento as enum ('agente', 'manual');

create table equipamentos (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizacoes (id) on delete cascade,
  cliente_id          uuid not null references clientes (id) on delete restrict,
  filial_id           uuid references filiais (id) on delete set null,
  -- MachineGuid do Windows: identifica a máquina mesmo se mudar de nome. Nulo no cadastro manual.
  identificador       text,
  nome                text not null,
  tipo                text not null default 'computador',
  patrimonio          text,
  setor               text,
  observacoes         text,
  fabricante          text,
  modelo              text,
  numero_serie        text,
  sistema_operacional text,
  versao_so           text,
  processador         text,
  nucleos             integer,
  memoria_mb          integer,
  discos              jsonb not null default '[]'::jsonb,
  volumes             jsonb not null default '[]'::jsonb,
  rede                jsonb not null default '[]'::jsonb,
  usuario             text,
  dominio             text,
  origem              origem_equipamento not null default 'manual',
  ativo               boolean not null default true,
  ultima_coleta_em    timestamptz,
  coletas             integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint equipamentos_nome_valido check (length(btrim(nome)) between 1 and 120),
  constraint equipamentos_tipo_valido check (tipo in ('computador', 'notebook', 'servidor', 'impressora', 'outro')),
  constraint equipamentos_identificador_por_cliente unique (cliente_id, identificador)
);

create index equipamentos_org_cliente on equipamentos (org_id, cliente_id) where ativo;
create index equipamentos_ultima_coleta on equipamentos (org_id, ultima_coleta_em);

create trigger equipamentos_updated_at
  before update on equipamentos
  for each row execute function definir_updated_at();

-- Sem auditoria automática: cada coleta é um UPDATE, e o agente roda todo dia em cada
-- máquina — o audit_logs viraria um diário de coletas.

-- ─── Manutenções: histórico append-only, como a timeline do atendimento ──────

create table equipamento_manutencoes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizacoes (id) on delete cascade,
  equipamento_id uuid not null references equipamentos (id) on delete cascade,
  atendimento_id uuid references atendimentos (id) on delete set null,
  realizada_em   timestamptz not null default now(),
  descricao      text not null,
  tempo_minutos  integer,
  autor_id       uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint manutencoes_descricao_valida check (length(btrim(descricao)) between 1 and 4000),
  constraint manutencoes_tempo_valido check (tempo_minutos is null or tempo_minutos between 0 and 10080)
);

create index manutencoes_equipamento on equipamento_manutencoes (equipamento_id, realizada_em desc);

-- ─── Chaves de coleta: uma ou mais por cliente ───────────────────────────────
-- Só o hash SHA-256 fica no banco. A chave em texto aparece uma vez, na hora de gerar,
-- e vai embutida no script do agente. Quem tiver a chave só consegue enviar inventário
-- daquele cliente; para cortar, revoga-se a chave.

create table coleta_chaves (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizacoes (id) on delete cascade,
  cliente_id    uuid not null references clientes (id) on delete cascade,
  hash          text not null unique,
  prefixo       text not null,
  descricao     text,
  criada_por    uuid references profiles (id) on delete set null,
  criada_em     timestamptz not null default now(),
  revogada_em   timestamptz,
  ultimo_uso_em timestamptz,
  usos          integer not null default 0
);

create index coleta_chaves_cliente on coleta_chaves (cliente_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table equipamentos            enable row level security;
alter table equipamento_manutencoes enable row level security;
alter table coleta_chaves           enable row level security;

create policy equipamentos_ler on equipamentos
  for select using (org_id = org_atual());
create policy equipamentos_escrever on equipamentos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy manutencoes_ler on equipamento_manutencoes
  for select using (org_id = org_atual());
create policy manutencoes_inserir on equipamento_manutencoes
  for insert with check (org_id = org_atual() and pode_escrever());

create policy coleta_chaves_ler on coleta_chaves
  for select using (org_id = org_atual() and pode_escrever());
create policy coleta_chaves_criar on coleta_chaves
  for insert with check (org_id = org_atual() and pode_escrever());
-- Só a revogação muda uma chave pelo app; o uso é registrado pela função abaixo.
create policy coleta_chaves_revogar on coleta_chaves
  for update using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

-- ─── Porta de entrada do agente ──────────────────────────────────────────────
-- Chamada pelo script em cada computador (RPC do Supabase com a chave pública).
-- O mesmo cuidado de registrar_solicitacao: nada do corpo é confiado.
--   * a chave de coleta decide cliente e organização — o agente nunca informa ids;
--   * cada texto é cortado no tamanho da coluna e as listas no máximo de itens;
--   * a mesma máquina só atualiza a cada 5 minutos (repetições são ignoradas em
--     silêncio) e uma chave cria no máximo 300 máquinas novas por hora;
--   * campos que o técnico preenche (patrimônio, setor, observações, tipo, filial)
--     nunca são sobrescritos pela coleta.
-- Códigos de erro lidos pelo agente: chave_invalida, dados_invalidos, limite_excedido.

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
  v_existente    equipamentos%rowtype;
  v_novas        integer;
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
    ultima_coleta_em, coletas
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
    ultima_coleta_em    = now(),
    coletas             = e.coletas + 1;

  update coleta_chaves
     set ultimo_uso_em = now(), usos = usos + 1
   where id = v_chave.id;

  return 'ok';
end;
$$;

revoke all on function registrar_coleta(text, jsonb) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function registrar_coleta(text, jsonb) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function registrar_coleta(text, jsonb) to authenticated;
  end if;
end;
$$;
