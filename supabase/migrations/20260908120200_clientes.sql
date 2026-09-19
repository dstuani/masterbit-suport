-- ─────────────────────────────────────────────────────────────────────────────
-- Clientes, filiais e contatos.
-- ─────────────────────────────────────────────────────────────────────────────

create table clientes (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizacoes (id) on delete cascade,
  codigo            text,
  razao_social      text not null,
  nome_fantasia     text,
  tipo              tipo_pessoa not null default 'PJ',
  documento         text,
  status            status_cliente not null default 'ativo',
  segmento          text,
  cep               text,
  logradouro        text,
  numero            text,
  complemento       text,
  bairro            text,
  cidade            text,
  uf                char(2),
  email             text,
  telefone          text,
  site              text,
  contrato_tipo     tipo_contrato not null default 'avulso',
  horas_contratadas numeric(6, 2),
  observacoes       text,
  tags              text[] not null default '{}',
  created_by        uuid references profiles (id) on delete set null,
  updated_by        uuid references profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint clientes_uf_valida check (uf is null or uf ~ '^[A-Z]{2}$')
);

-- Documento é único por organização, mas só quando informado.
create unique index clientes_documento_por_org
  on clientes (org_id, documento)
  where documento is not null;

create unique index clientes_codigo_por_org
  on clientes (org_id, codigo)
  where codigo is not null;

create index clientes_org_status on clientes (org_id, status);
create index clientes_razao_social_trgm on clientes using gin (razao_social gin_trgm_ops);
create index clientes_tags on clientes using gin (tags);

create trigger clientes_updated_at
  before update on clientes
  for each row execute function definir_updated_at();

-- ─── Filiais ─────────────────────────────────────────────────────────────────

create table filiais (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizacoes (id) on delete cascade,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  nome        text not null,
  codigo      text,
  cep         text,
  logradouro  text,
  numero      text,
  complemento text,
  bairro      text,
  cidade      text,
  uf          char(2),
  telefone    text,
  responsavel text,
  matriz      boolean not null default false,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint filiais_uf_valida check (uf is null or uf ~ '^[A-Z]{2}$')
);

create unique index filiais_codigo_por_cliente
  on filiais (cliente_id, codigo)
  where codigo is not null;

-- Uma única matriz por cliente.
create unique index filiais_matriz_unica
  on filiais (cliente_id)
  where matriz;

create index filiais_cliente on filiais (cliente_id) where ativo;

create trigger filiais_updated_at
  before update on filiais
  for each row execute function definir_updated_at();

-- ─── Contatos ────────────────────────────────────────────────────────────────

create table cliente_contatos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizacoes (id) on delete cascade,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  filial_id   uuid references filiais (id) on delete set null,
  nome        text not null,
  cargo       text,
  setor       text,
  email       text,
  telefone    text,
  whatsapp    text,
  principal   boolean not null default false,
  observacoes text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Um único contato principal por cliente.
create unique index contatos_principal_unico
  on cliente_contatos (cliente_id)
  where principal;

create index contatos_cliente on cliente_contatos (cliente_id) where ativo;
create index contatos_filial on cliente_contatos (filial_id);

create trigger contatos_updated_at
  before update on cliente_contatos
  for each row execute function definir_updated_at();
