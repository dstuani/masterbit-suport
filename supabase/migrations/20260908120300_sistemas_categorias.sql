-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo de sistemas, o que cada cliente usa, e a classificação dos atendimentos.
-- ─────────────────────────────────────────────────────────────────────────────

create table sistemas (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizacoes (id) on delete cascade,
  nome         text not null,
  fabricante   text,
  versao_atual text,
  tipo         tipo_sistema not null default 'outro',
  descricao    text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index sistemas_nome_por_org on sistemas (org_id, lower(nome));

create trigger sistemas_updated_at
  before update on sistemas
  for each row execute function definir_updated_at();

-- ─── Sistemas instalados por cliente ─────────────────────────────────────────

create table clientes_sistemas (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizacoes (id) on delete cascade,
  cliente_id       uuid not null references clientes (id) on delete cascade,
  sistema_id       uuid not null references sistemas (id) on delete restrict,
  filial_id        uuid references filiais (id) on delete set null,
  versao_instalada text,
  data_implantacao date,
  ambiente         ambiente_sistema not null default 'producao',
  licencas         integer,
  -- Host, porta, caminho. Nunca senhas: não há criptografia em repouso aqui.
  dados_acesso     jsonb not null default '{}'::jsonb,
  observacoes      text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint clientes_sistemas_licencas_positivas check (licencas is null or licencas > 0)
);

-- Um mesmo sistema aparece uma vez por filial, e uma vez sem filial (matriz).
-- O coalesce evita o furo de NULL nunca colidir em índice único.
create unique index clientes_sistemas_unico
  on clientes_sistemas (
    cliente_id,
    sistema_id,
    coalesce(filial_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index clientes_sistemas_cliente on clientes_sistemas (cliente_id) where ativo;
create index clientes_sistemas_sistema on clientes_sistemas (sistema_id);

create trigger clientes_sistemas_updated_at
  before update on clientes_sistemas
  for each row execute function definir_updated_at();

-- ─── Categorias e subcategorias ──────────────────────────────────────────────

create table categorias (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizacoes (id) on delete cascade,
  nome       text not null,
  cor        text not null default '#667085',
  icone      text,
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categorias_cor_hex check (cor ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index categorias_nome_por_org on categorias (org_id, lower(nome));

create trigger categorias_updated_at
  before update on categorias
  for each row execute function definir_updated_at();

create table subcategorias (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizacoes (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete cascade,
  nome         text not null,
  ordem        integer not null default 0,
  sla_horas    integer,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint subcategorias_sla_positivo check (sla_horas is null or sla_horas > 0)
);

create unique index subcategorias_nome_por_categoria on subcategorias (categoria_id, lower(nome));

create trigger subcategorias_updated_at
  before update on subcategorias
  for each row execute function definir_updated_at();
