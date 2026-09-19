-- ─────────────────────────────────────────────────────────────────────────────
-- Pendências e agenda: o que ficou em aberto e o que está programado.
-- ─────────────────────────────────────────────────────────────────────────────

create table pendencias (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizacoes (id) on delete cascade,

  -- Pendência nasce de um atendimento ou é avulsa por cliente. Ao apagar o
  -- atendimento a pendência sobrevive (SET NULL), porque a cobrança continua.
  atendimento_id    uuid references atendimentos (id) on delete set null,
  cliente_id        uuid references clientes (id) on delete cascade,

  titulo            text not null,
  descricao         text,
  responsavel_tipo  responsavel_pendencia not null default 'eu',
  responsavel_id    uuid references profiles (id) on delete set null,
  terceiro_nome     text,
  prazo             timestamptz,
  prioridade        prioridade not null default 'media',
  status            status_pendencia not null default 'aberta',
  concluida_em      timestamptz,
  concluida_por     uuid references profiles (id) on delete set null,
  resultado         text,
  created_by        uuid references profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint pendencias_titulo_nao_vazio check (length(btrim(titulo)) > 0),
  -- Uma pendência solta, sem atendimento nem cliente, não é cobrável de ninguém.
  constraint pendencias_tem_origem check (
    atendimento_id is not null or cliente_id is not null
  ),
  constraint pendencias_concluida_tem_data check (
    status <> 'concluida' or concluida_em is not null
  ),
  constraint pendencias_terceiro_identificado check (
    responsavel_tipo <> 'terceiro' or (terceiro_nome is not null and length(btrim(terceiro_nome)) > 0)
  )
);

create index pendencias_org_status on pendencias (org_id, status, prazo);
create index pendencias_atendimento on pendencias (atendimento_id);
create index pendencias_cliente on pendencias (cliente_id);
create index pendencias_responsavel on pendencias (responsavel_id, status);

create trigger pendencias_updated_at
  before update on pendencias
  for each row execute function definir_updated_at();

-- ─── Agenda ──────────────────────────────────────────────────────────────────

create table agenda_eventos (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizacoes (id) on delete cascade,

  titulo           text not null,
  descricao        text,
  tipo             tipo_evento not null default 'retorno',

  cliente_id       uuid references clientes (id) on delete cascade,
  atendimento_id   uuid references atendimentos (id) on delete set null,
  pendencia_id     uuid references pendencias (id) on delete set null,
  responsavel_id   uuid references profiles (id) on delete set null,

  inicio           timestamptz not null,
  fim              timestamptz,
  dia_inteiro      boolean not null default false,
  local            text,
  status           status_evento not null default 'agendado',
  lembrete_minutos integer,
  recorrencia      text,
  resultado        text,
  created_by       uuid references profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint eventos_titulo_nao_vazio check (length(btrim(titulo)) > 0),
  constraint eventos_intervalo_valido check (fim is null or fim >= inicio),
  constraint eventos_lembrete_positivo check (lembrete_minutos is null or lembrete_minutos >= 0)
);

create index eventos_org_periodo on agenda_eventos (org_id, inicio);
create index eventos_responsavel on agenda_eventos (responsavel_id, inicio);
create index eventos_atendimento on agenda_eventos (atendimento_id);
create index eventos_pendencia on agenda_eventos (pendencia_id);
create index eventos_cliente on agenda_eventos (cliente_id);

create trigger eventos_updated_at
  before update on agenda_eventos
  for each row execute function definir_updated_at();
