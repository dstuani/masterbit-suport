-- =============================================================================
-- SupportDesk — schema completo
--
-- Alternativa ao 'supabase db push': cole no SQL Editor do Supabase e execute.
-- Contém todas as migrations na ordem correta.
--
-- Gerado em: 2026-09-08 15:14
-- =============================================================================


-- ▼▼▼ 20260908120000_base.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────────────────────
-- Base: extensões, organizações e enums do domínio.
--
-- Os enums espelham lib/constants.ts. Ao alterar um lado, altere o outro.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- busca aproximada por nome

-- ─── Organização ─────────────────────────────────────────────────────────────
-- Existe desde o dia 1 mesmo com um único usuário: incluir org_id depois exigiria
-- reescrever todas as policies de RLS e fazer backfill.

create table organizacoes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type role_usuario as enum ('owner', 'tecnico', 'visualizador');

create type tipo_pessoa    as enum ('PJ', 'PF');
create type status_cliente as enum ('ativo', 'inativo', 'prospect');
create type tipo_contrato  as enum ('avulso', 'mensal', 'pacote_horas');

create type tipo_sistema     as enum ('erp', 'fiscal', 'sistema_proprio', 'infraestrutura', 'outro');
create type ambiente_sistema as enum ('producao', 'homologacao', 'teste');

create type canal_atendimento as enum (
  'telefone', 'whatsapp', 'email', 'presencial', 'acesso_remoto', 'chat', 'interno'
);

create type tipo_atendimento as enum (
  'duvida', 'erro', 'treinamento', 'implantacao', 'melhoria', 'manutencao', 'consultoria'
);

create type status_atendimento as enum (
  'aberto', 'em_andamento', 'aguardando_cliente', 'aguardando_terceiro',
  'agendado', 'resolvido', 'cancelado'
);

create type prioridade as enum ('baixa', 'media', 'alta', 'urgente');

create type tipo_interacao as enum (
  'nota', 'ligacao', 'email', 'whatsapp', 'acesso_remoto', 'visita',
  'mudanca_status', 'anexo', 'sistema'
);

create type status_pendencia      as enum ('aberta', 'em_andamento', 'concluida', 'cancelada');
create type responsavel_pendencia as enum ('eu', 'cliente', 'terceiro');

create type tipo_evento   as enum (
  'retorno', 'visita', 'reuniao', 'tarefa', 'lembrete', 'manutencao_preventiva'
);
create type status_evento as enum ('agendado', 'confirmado', 'realizado', 'cancelado', 'remarcado');

create type acao_auditoria as enum ('INSERT', 'UPDATE', 'DELETE');

-- ─── Funções utilitárias ─────────────────────────────────────────────────────

create or replace function definir_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizacoes_updated_at
  before update on organizacoes
  for each row execute function definir_updated_at();

-- ▼▼▼ 20260908120100_identidade.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────────────────────
-- Identidade: profiles espelha auth.users e ancora o multi-tenant.
-- ─────────────────────────────────────────────────────────────────────────────

create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  org_id     uuid not null references organizacoes (id) on delete restrict,
  nome       text not null,
  email      text not null,
  telefone   text,
  avatar_url text,
  role       role_usuario not null default 'tecnico',
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_por_org on profiles (org_id, lower(email));
create index profiles_org on profiles (org_id) where ativo;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function definir_updated_at();

-- ─── Organização do usuário logado ───────────────────────────────────────────
-- SECURITY DEFINER de propósito: as policies de RLS chamam esta função, e sem o
-- bypass a leitura de profiles dentro da própria policy de profiles recursaria.

create or replace function org_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function papel_atual()
returns role_usuario
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function pode_escrever()
returns boolean
language sql
stable
as $$
  select coalesce(papel_atual() in ('owner', 'tecnico'), false);
$$;

-- ─── Provisionamento de novo usuário ─────────────────────────────────────────
-- Cria o profile no cadastro. O primeiro usuário vira owner e ganha uma
-- organização; os seguintes entram como técnicos na organização existente.

create or replace function tratar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org        uuid;
  eh_primeiro boolean;
begin
  select id into org from organizacoes order by created_at limit 1;

  if org is null then
    insert into organizacoes (nome) values ('Minha organização') returning id into org;
    eh_primeiro := true;
  else
    eh_primeiro := not exists (select 1 from profiles);
  end if;

  insert into profiles (id, org_id, nome, email, role)
  values (
    new.id,
    org,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when eh_primeiro then 'owner'::role_usuario else 'tecnico'::role_usuario end
  );

  return new;
end;
$$;

create trigger criar_profile_ao_cadastrar
  after insert on auth.users
  for each row execute function tratar_novo_usuario();

-- ▼▼▼ 20260908120200_clientes.sql ▼▼▼

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

-- ▼▼▼ 20260908120300_sistemas_categorias.sql ▼▼▼

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

-- ▼▼▼ 20260908120400_atendimentos.sql ▼▼▼

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

-- ▼▼▼ 20260908120500_pendencias_agenda.sql ▼▼▼

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

-- ▼▼▼ 20260908120600_auditoria.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────────────────────
-- Trilha de auditoria. Preenchida por trigger, nunca pela aplicação — assim
-- nenhuma escrita escapa do registro, inclusive as feitas direto no SQL.
-- ─────────────────────────────────────────────────────────────────────────────

create table audit_logs (
  id               bigserial primary key,
  org_id           uuid,
  actor_id         uuid,
  tabela           text not null,
  registro_id      uuid,
  acao             acao_auditoria not null,
  dados_antes      jsonb,
  dados_depois     jsonb,
  campos_alterados text[],
  created_at       timestamptz not null default now()
);

create index audit_logs_registro on audit_logs (tabela, registro_id, created_at desc);
create index audit_logs_org on audit_logs (org_id, created_at desc);
create index audit_logs_actor on audit_logs (actor_id, created_at desc);

create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
declare
  antes    jsonb;
  depois   jsonb;
  campos   text[];
  registro uuid;
  org      uuid;
begin
  if tg_op = 'INSERT' then
    depois := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    antes  := to_jsonb(old);
    depois := to_jsonb(new);
    select array_agg(chave)
      into campos
      from jsonb_each(depois) as d(chave, valor)
     where antes -> d.chave is distinct from d.valor
       and d.chave not in ('updated_at', 'busca');

    -- UPDATE que só mexeu em updated_at não é mudança de conteúdo.
    if campos is null then
      return new;
    end if;
  else
    antes := to_jsonb(old);
  end if;

  registro := nullif(coalesce(depois ->> 'id', antes ->> 'id'), '')::uuid;
  org      := nullif(coalesce(depois ->> 'org_id', antes ->> 'org_id'), '')::uuid;

  insert into audit_logs (org_id, actor_id, tabela, registro_id, acao, dados_antes, dados_depois, campos_alterados)
  values (org, auth.uid(), tg_table_name, registro, tg_op::acao_auditoria, antes, depois, campos);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$funcao$;

-- Auditar só o que tem valor probatório. A timeline já é imutável por natureza,
-- e auditá-la duplicaria todo o histórico.
create trigger auditar_clientes
  after insert or update or delete on clientes
  for each row execute function registrar_auditoria();

create trigger auditar_atendimentos
  after insert or update or delete on atendimentos
  for each row execute function registrar_auditoria();

create trigger auditar_pendencias
  after insert or update or delete on pendencias
  for each row execute function registrar_auditoria();

create trigger auditar_profiles
  after insert or update or delete on profiles
  for each row execute function registrar_auditoria();

create trigger auditar_clientes_sistemas
  after insert or update or delete on clientes_sistemas
  for each row execute function registrar_auditoria();

-- ▼▼▼ 20260908120700_rls.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security.
--
-- Esta é a autorização de verdade do sistema. O proxy.ts faz apenas checagem
-- otimista de rota; as Server Actions podem ser chamadas por POST direto. Se uma
-- linha não passa aqui, ela não existe para o usuário.
--
-- Regra geral: enxerga-se a própria organização; escreve quem tem papel owner
-- ou tecnico. O papel visualizador é somente leitura.
-- ─────────────────────────────────────────────────────────────────────────────

alter table organizacoes         enable row level security;
alter table profiles             enable row level security;
alter table clientes             enable row level security;
alter table filiais              enable row level security;
alter table cliente_contatos     enable row level security;
alter table sistemas             enable row level security;
alter table clientes_sistemas    enable row level security;
alter table categorias           enable row level security;
alter table subcategorias        enable row level security;
alter table atendimentos         enable row level security;
alter table atendimento_interacoes enable row level security;
alter table pendencias           enable row level security;
alter table agenda_eventos       enable row level security;
alter table audit_logs           enable row level security;

-- ─── Organização ─────────────────────────────────────────────────────────────

create policy organizacoes_ler on organizacoes
  for select using (id = org_atual());

create policy organizacoes_editar on organizacoes
  for update using (id = org_atual() and papel_atual() = 'owner')
  with check (id = org_atual());

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- org_atual() é SECURITY DEFINER, então não recursa nesta própria policy.

create policy profiles_ler on profiles
  for select using (org_id = org_atual());

create policy profiles_editar_proprio on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and org_id = org_atual());

create policy profiles_gerenciar on profiles
  for all using (org_id = org_atual() and papel_atual() = 'owner')
  with check (org_id = org_atual());

-- ─── Cadastros e operação ────────────────────────────────────────────────────
-- Mesmo par de policies para cada tabela: leitura por organização, escrita por
-- organização + papel. Escrito explicitamente por tabela porque o Postgres não
-- aceita policy genérica, e porque explícito é auditável.

create policy clientes_ler on clientes
  for select using (org_id = org_atual());
create policy clientes_escrever on clientes
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy filiais_ler on filiais
  for select using (org_id = org_atual());
create policy filiais_escrever on filiais
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy contatos_ler on cliente_contatos
  for select using (org_id = org_atual());
create policy contatos_escrever on cliente_contatos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy sistemas_ler on sistemas
  for select using (org_id = org_atual());
create policy sistemas_escrever on sistemas
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy clientes_sistemas_ler on clientes_sistemas
  for select using (org_id = org_atual());
create policy clientes_sistemas_escrever on clientes_sistemas
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy categorias_ler on categorias
  for select using (org_id = org_atual());
create policy categorias_escrever on categorias
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy subcategorias_ler on subcategorias
  for select using (org_id = org_atual());
create policy subcategorias_escrever on subcategorias
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy atendimentos_ler on atendimentos
  for select using (org_id = org_atual());
create policy atendimentos_escrever on atendimentos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy pendencias_ler on pendencias
  for select using (org_id = org_atual());
create policy pendencias_escrever on pendencias
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy eventos_ler on agenda_eventos
  for select using (org_id = org_atual());
create policy eventos_escrever on agenda_eventos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

-- ─── Timeline: append-only no próprio banco ──────────────────────────────────
-- Só existem policies de SELECT e INSERT. Sem policy de UPDATE ou DELETE, o RLS
-- nega essas operações — a imutabilidade não depende do código da aplicação.

create policy interacoes_ler on atendimento_interacoes
  for select using (org_id = org_atual());

create policy interacoes_inserir on atendimento_interacoes
  for insert with check (org_id = org_atual() and pode_escrever());

-- ─── Auditoria: leitura restrita, escrita só por trigger ─────────────────────
-- A função registrar_auditoria() é SECURITY DEFINER e por isso ignora o RLS.
-- Nenhuma policy de INSERT/UPDATE/DELETE: ninguém edita a trilha pela API.

create policy audit_logs_ler on audit_logs
  for select using (org_id = org_atual() and papel_atual() = 'owner');

-- ▼▼▼ 20260908120800_catalogo_inicial.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo inicial de categorias e subcategorias.
--
-- Semeado junto com a organização, em vez de num seed.sql avulso: a organização
-- nasce no cadastro do primeiro usuário, então não há momento anterior em que um
-- seed teria um org_id para usar. Tudo aqui é editável em Configurações.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function semear_catalogos(org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $funcao$
declare
  categoria_id uuid;
  item         record;
begin
  -- Não semear duas vezes na mesma organização.
  if exists (select 1 from categorias where org_id = org) then
    return;
  end if;

  for item in
    select *
      from (values
        ('Fiscal',          '#d97706', 1, array['NF-e rejeitada', 'SPED', 'Certificado digital', 'Impostos']),
        ('Financeiro',      '#059669', 2, array['Contas a pagar', 'Contas a receber', 'Conciliação', 'Boletos']),
        ('Sistema',         '#1f6feb', 3, array['Erro na aplicação', 'Lentidão', 'Atualização de versão', 'Configuração']),
        ('Infraestrutura',  '#7c3aed', 4, array['Rede', 'Servidor', 'Backup', 'Impressora', 'Estação de trabalho']),
        ('Banco de dados',  '#0891b2', 5, array['Consulta', 'Correção de dados', 'Desempenho', 'Restauração']),
        ('Treinamento',     '#db2777', 6, array['Novo usuário', 'Novo módulo', 'Reciclagem']),
        ('Cadastros',       '#65a30d', 7, array['Produtos', 'Clientes', 'Fornecedores', 'Usuários e permissões'])
      ) as t(nome, cor, ordem, subs)
  loop
    insert into categorias (org_id, nome, cor, ordem)
    values (org, item.nome, item.cor, item.ordem)
    returning id into categoria_id;

    insert into subcategorias (org_id, categoria_id, nome, ordem)
    select org, categoria_id, sub, idx
      from unnest(item.subs) with ordinality as s(sub, idx);
  end loop;
end;
$funcao$;

-- Passa a semear ao criar a organização do primeiro usuário.
create or replace function tratar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
declare
  org         uuid;
  eh_primeiro boolean;
begin
  select id into org from organizacoes order by created_at limit 1;

  if org is null then
    insert into organizacoes (nome) values ('Minha organização') returning id into org;
    eh_primeiro := true;
    perform semear_catalogos(org);
  else
    eh_primeiro := not exists (select 1 from profiles);
  end if;

  insert into profiles (id, org_id, nome, email, role)
  values (
    new.id,
    org,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when eh_primeiro then 'owner'::role_usuario else 'tecnico'::role_usuario end
  );

  return new;
end;
$funcao$;

-- ▼▼▼ 20260908130000_automacoes_atendimento.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────────────────────
-- Automações do atendimento.
--
-- Ficam no banco, não na aplicação: a timeline é a memória do sistema, e um
-- atendimento cuja abertura ou mudança de status não foi registrada é um buraco
-- no histórico. Por trigger, isso vale para qualquer origem da escrita — a UI,
-- uma Server Action, ou um UPDATE feito à mão no SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Abertura ────────────────────────────────────────────────────────────────

create or replace function abrir_timeline_do_atendimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
begin
  insert into atendimento_interacoes (
    org_id, atendimento_id, autor_id, tipo, conteudo, status_novo, ocorrido_em
  )
  values (
    new.org_id, new.id, coalesce(new.created_by, auth.uid()), 'sistema',
    'Atendimento aberto', new.status, new.iniciado_em
  );
  return new;
end;
$funcao$;

create trigger atendimentos_abrir_timeline
  after insert on atendimentos
  for each row execute function abrir_timeline_do_atendimento();

-- ─── Fechamento ──────────────────────────────────────────────────────────────
-- A constraint exige finalizado_em quando o status é resolvido ou cancelado.
-- Preencher aqui evita que cada chamador tenha de lembrar disso — e garante que
-- reabrir um atendimento limpe a data, em vez de deixar um fechamento fantasma.

create or replace function ajustar_fechamento_atendimento()
returns trigger
language plpgsql
as $funcao$
begin
  if new.status is distinct from old.status then
    if new.status in ('resolvido', 'cancelado') then
      if new.finalizado_em is null then
        new.finalizado_em := now();
      end if;
    else
      new.finalizado_em := null;
    end if;
  end if;
  return new;
end;
$funcao$;

create trigger atendimentos_ajustar_fechamento
  before update on atendimentos
  for each row execute function ajustar_fechamento_atendimento();

-- ─── Mudança de status ───────────────────────────────────────────────────────

create or replace function registrar_mudanca_de_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
begin
  if new.status is distinct from old.status then
    insert into atendimento_interacoes (
      org_id, atendimento_id, autor_id, tipo, status_anterior, status_novo
    )
    values (new.org_id, new.id, auth.uid(), 'mudanca_status', old.status, new.status);
  end if;
  return new;
end;
$funcao$;

create trigger atendimentos_registrar_status
  after update on atendimentos
  for each row execute function registrar_mudanca_de_status();

-- ─── Consulta da lista ───────────────────────────────────────────────────────
-- View com os nomes já resolvidos. Evita que a lista faça um embed por linha e
-- mantém a ordenação e a paginação no banco.

create or replace view atendimentos_lista
with (security_invoker = true) as
select a.id,
       a.org_id,
       a.numero,
       a.titulo,
       a.status,
       a.prioridade,
       a.canal,
       a.tipo,
       a.tempo_gasto_minutos,
       a.faturavel,
       a.iniciado_em,
       a.finalizado_em,
       a.created_at,
       a.updated_at,
       a.cliente_id,
       c.razao_social  as cliente_nome,
       a.categoria_id,
       cat.nome        as categoria_nome,
       cat.cor         as categoria_cor,
       a.sistema_id,
       s.nome          as sistema_nome,
       a.responsavel_id,
       p.nome          as responsavel_nome,
       (select count(*)
          from pendencias pe
         where pe.atendimento_id = a.id
           and pe.status in ('aberta', 'em_andamento')) as pendencias_abertas
  from atendimentos a
  join clientes   c   on c.id = a.cliente_id
  left join categorias cat on cat.id = a.categoria_id
  left join sistemas   s   on s.id = a.sistema_id
  left join profiles   p   on p.id = a.responsavel_id;

-- security_invoker faz a view respeitar o RLS de quem consulta, em vez de rodar
-- com os direitos do dono. Sem isso a view seria um furo no isolamento por
-- organização.

-- ─── Numeração e tipagem ─────────────────────────────────────────────────────
-- `numero` é preenchido pelo trigger gerar_numero_atendimento, mas sem DEFAULT o
-- gerador de tipos o marca como obrigatório na inserção — e nenhum chamador tem
-- como saber o número antes de inserir. O default vazio é sempre substituído
-- pelo trigger, que já trata string em branco.
alter table atendimentos alter column numero set default '';
