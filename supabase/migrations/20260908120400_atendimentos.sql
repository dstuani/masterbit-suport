-- ─────────────────────────────────────────────────────────────────────────────
-- Atendimentos e sua timeline. É o núcleo do sistema.
-- ─────────────────────────────────────────────────────────────────────────────

-- Numeração legível. Sequence global em vez de contador por organização/ano:
-- um contador exigiria bloqueio de linha a cada inserção. O preço é que a
-- numeração não reinicia a cada ano — o número segue único e crescente.
create sequence atendimento_numero_seq;

create table atendimentos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizacoes (id) on delete cascade,
  numero         text not null,

  cliente_id     uuid not null references clientes (id) on delete restrict,
  filial_id      uuid references filiais (id) on delete set null,
  contato_id     uuid references cliente_contatos (id) on delete set null,
  sistema_id     uuid references sistemas (id) on delete set null,
  categoria_id   uuid references categorias (id) on delete set null,
  subcategoria_id uuid references subcategorias (id) on delete set null,
  responsavel_id uuid references profiles (id) on delete set null,

  titulo         text not null,
  descricao      text,
  canal          canal_atendimento not null default 'telefone',
  tipo           tipo_atendimento not null default 'duvida',
  status         status_atendimento not null default 'aberto',
  prioridade     prioridade not null default 'media',

  solucao        text,
  causa_raiz     text,
  aguardando_o_que text,

  iniciado_em    timestamptz not null default now(),
  finalizado_em  timestamptz,
  tempo_gasto_minutos integer not null default 0,
  faturavel      boolean not null default false,
  valor          numeric(10, 2),

  tags           text[] not null default '{}',
  created_by     uuid references profiles (id) on delete set null,
  updated_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  busca tsvector generated always as (
    to_tsvector(
      'portuguese',
      coalesce(titulo, '') || ' ' || coalesce(descricao, '') || ' ' || coalesce(solucao, '')
    )
  ) stored,

  constraint atendimentos_titulo_nao_vazio check (length(btrim(titulo)) > 0),
  constraint atendimentos_tempo_nao_negativo check (tempo_gasto_minutos >= 0),
  -- Um atendimento resolvido precisa registrar como foi resolvido: é isso que dá
  -- valor à consulta do histórico meses depois.
  constraint atendimentos_resolvido_tem_solucao check (
    status <> 'resolvido' or (solucao is not null and length(btrim(solucao)) > 0)
  ),
  constraint atendimentos_resolvido_tem_data check (
    status not in ('resolvido', 'cancelado') or finalizado_em is not null
  )
);

create unique index atendimentos_numero_por_org on atendimentos (org_id, numero);
create index atendimentos_org_status on atendimentos (org_id, status, prioridade);
create index atendimentos_cliente on atendimentos (cliente_id, created_at desc);
create index atendimentos_responsavel on atendimentos (responsavel_id, status);
create index atendimentos_sistema on atendimentos (sistema_id);
create index atendimentos_categoria on atendimentos (categoria_id);
create index atendimentos_busca on atendimentos using gin (busca);
create index atendimentos_tags on atendimentos using gin (tags);

create trigger atendimentos_updated_at
  before update on atendimentos
  for each row execute function definir_updated_at();

-- ─── Numeração automática ────────────────────────────────────────────────────

create or replace function gerar_numero_atendimento()
returns trigger
language plpgsql
as $funcao$
begin
  if new.numero is null or length(btrim(new.numero)) = 0 then
    new.numero := 'AT-'
      || to_char(coalesce(new.iniciado_em, now()), 'YYYY')
      || '-'
      || lpad(nextval('atendimento_numero_seq')::text, 5, '0');
  end if;
  return new;
end;
$funcao$;

create trigger atendimentos_numero
  before insert on atendimentos
  for each row execute function gerar_numero_atendimento();

-- ─── Timeline ────────────────────────────────────────────────────────────────
-- Append-only: sem UPDATE nem DELETE. Correção entra como nova interação.

create table atendimento_interacoes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizacoes (id) on delete cascade,
  atendimento_id  uuid not null references atendimentos (id) on delete cascade,
  autor_id        uuid references profiles (id) on delete set null,
  tipo            tipo_interacao not null default 'nota',
  conteudo        text,
  status_anterior status_atendimento,
  status_novo     status_atendimento,
  tempo_gasto_minutos integer not null default 0,
  anexos          jsonb not null default '[]'::jsonb,
  visivel_cliente boolean not null default false,
  ocorrido_em     timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  constraint interacoes_tempo_nao_negativo check (tempo_gasto_minutos >= 0),
  constraint interacoes_tem_conteudo check (
    tipo = 'mudanca_status' or (conteudo is not null and length(btrim(conteudo)) > 0)
  )
);

create index interacoes_atendimento on atendimento_interacoes (atendimento_id, ocorrido_em);
create index interacoes_autor on atendimento_interacoes (autor_id);

-- Acumula o tempo no atendimento pai e marca o registro como tocado, para que a
-- lista ordenada por "atualizado em" reflita a última interação.
create or replace function acumular_tempo_interacao()
returns trigger
language plpgsql
as $funcao$
begin
  update atendimentos
     set tempo_gasto_minutos = tempo_gasto_minutos + new.tempo_gasto_minutos,
         updated_at = now()
   where id = new.atendimento_id;
  return new;
end;
$funcao$;

create trigger interacoes_acumular_tempo
  after insert on atendimento_interacoes
  for each row execute function acumular_tempo_interacao();
