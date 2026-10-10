-- ─────────────────────────────────────────────────────────────────────────────
-- Equipamentos, parte 2: tipo de manutenção, troca de peça e alterações detectadas.
--
-- A troca de peça entra de dois jeitos: registrada pelo técnico (manutenção do tipo
-- troca_peca, com peça retirada, peça instalada e custo) ou detectada pela coleta,
-- quando memória, processador, discos ou sistema mudam entre dois envios do agente.
-- ─────────────────────────────────────────────────────────────────────────────

-- Registros antigos não tinham tipo: ficam como "outro".
alter table equipamento_manutencoes
  add column tipo           text not null default 'outro',
  add column peca_retirada  text,
  add column peca_instalada text,
  add column custo          numeric(10, 2),
  add constraint manutencoes_tipo_valido
    check (tipo in ('preventiva', 'corretiva', 'troca_peca', 'instalacao', 'limpeza', 'outro')),
  add constraint manutencoes_pecas_tamanho
    check (length(coalesce(peca_retirada, '')) <= 200 and length(coalesce(peca_instalada, '')) <= 200),
  add constraint manutencoes_custo_valido check (custo is null or (custo >= 0 and custo <= 1000000)),
  add constraint manutencoes_troca_tem_peca
    check (tipo <> 'troca_peca' or peca_retirada is not null or peca_instalada is not null);

create index manutencoes_org_data on equipamento_manutencoes (org_id, realizada_em desc);

-- ─── Alterações de hardware detectadas pela coleta ───────────────────────────
-- Só a função registrar_coleta escreve aqui (SECURITY DEFINER); pelo app é só leitura.

create table equipamento_alteracoes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizacoes (id) on delete cascade,
  equipamento_id uuid not null references equipamentos (id) on delete cascade,
  componente     text not null,
  antes          text,
  depois         text,
  detectada_em   timestamptz not null default now(),

  constraint alteracoes_componente_valido check (componente in ('memoria', 'processador', 'disco', 'sistema'))
);

create index alteracoes_equipamento on equipamento_alteracoes (equipamento_id, detectada_em desc);
create index alteracoes_org_data on equipamento_alteracoes (org_id, detectada_em desc);

alter table equipamento_alteracoes enable row level security;

create policy alteracoes_ler on equipamento_alteracoes
  for select using (org_id = org_atual());

-- "Modelo 240 GB | Modelo 1000 GB", em ordem fixa: duas coletas da mesma máquina dão o
-- mesmo texto, e qualquer disco trocado, acrescentado ou retirado muda o texto.
-- Lista vazia devolve nulo (o agente não conseguiu ler os discos).
create or replace function assinatura_discos(p_discos jsonb)
returns text
language sql
immutable
as $$
  select nullif(string_agg(item, ' | ' order by item), '')
    from (
      select btrim(coalesce(d ->> 'modelo', 'Disco') || ' ' || coalesce(d ->> 'tamanho_gb', '?') || ' GB') as item
        from jsonb_array_elements(case when jsonb_typeof(p_discos) = 'array' then p_discos else '[]'::jsonb end) d
    ) itens;
$$;

-- Mesma função da migration 20261010120000, com a comparação de hardware antes de
-- atualizar a chave. CREATE OR REPLACE mantém as permissões já concedidas (anon).
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
