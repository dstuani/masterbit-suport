-- ─────────────────────────────────────────────────────────────────────────────
-- Consultoria: acompanhamento de projetos de consultoria por tópico.
--
-- Diferente do atendimento (reativo, um problema por vez), aqui o trabalho é
-- combinado antes e acompanhado ao longo de várias sessões — cada tópico do
-- escopo vira um registro com status, comentários e anexos próprios.
-- ─────────────────────────────────────────────────────────────────────────────

create type status_topico_consultoria as enum ('pendente', 'em_andamento', 'concluido', 'cancelado');

create table consultoria_projetos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizacoes (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint consultoria_projetos_nome_nao_vazio check (length(btrim(nome)) > 0)
);

create index consultoria_projetos_org on consultoria_projetos (org_id) where ativo;

create trigger consultoria_projetos_updated_at
  before update on consultoria_projetos
  for each row execute function definir_updated_at();

-- ─── Tópicos ─────────────────────────────────────────────────────────────────

create table consultoria_topicos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizacoes (id) on delete cascade,
  projeto_id uuid not null references consultoria_projetos (id) on delete cascade,
  codigo     text,
  titulo     text not null,
  descricao  text,
  status     status_topico_consultoria not null default 'pendente',
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint consultoria_topicos_titulo_nao_vazio check (length(btrim(titulo)) > 0)
);

create index consultoria_topicos_projeto on consultoria_topicos (projeto_id, ordem);

create trigger consultoria_topicos_updated_at
  before update on consultoria_topicos
  for each row execute function definir_updated_at();

-- ─── Comentários: append-only, como a timeline do atendimento ────────────────

create table consultoria_comentarios (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizacoes (id) on delete cascade,
  topico_id  uuid not null references consultoria_topicos (id) on delete cascade,
  autor_id   uuid references profiles (id) on delete set null,
  conteudo   text not null,
  created_at timestamptz not null default now(),

  constraint consultoria_comentarios_conteudo_nao_vazio check (length(btrim(conteudo)) > 0)
);

create index consultoria_comentarios_topico on consultoria_comentarios (topico_id, created_at);

-- ─── Anexos: mesmo padrão de atendimento_anexos, reaproveitando o bucket ─────
-- "anexos" já existe (migration de anexos dos atendimentos) e a policy de storage
-- só confere a primeira pasta do caminho (= org_id) — nenhuma policy nova de
-- storage é necessária, só o caminho seguir a mesma convenção.

create table consultoria_anexos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizacoes (id) on delete cascade,
  topico_id      uuid not null references consultoria_topicos (id) on delete cascade,
  caminho        text not null,
  nome_original  text not null,
  tipo_mime      text not null,
  tamanho_bytes  integer not null,
  enviado_por    uuid references profiles (id) on delete set null,
  removido_em    timestamptz,
  created_at     timestamptz not null default now(),

  constraint consultoria_anexos_nome_nao_vazio check (length(btrim(nome_original)) > 0),
  constraint consultoria_anexos_tamanho_valido check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  constraint consultoria_anexos_caminho_da_org check (caminho like org_id::text || '/%')
);

create unique index consultoria_anexos_caminho_unico on consultoria_anexos (caminho);
create index consultoria_anexos_topico on consultoria_anexos (topico_id, created_at desc);

create or replace function proteger_anexo_consultoria()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if (new.id, new.org_id, new.topico_id, new.caminho, new.nome_original,
      new.tipo_mime, new.tamanho_bytes, new.enviado_por, new.created_at)
     is distinct from
     (old.id, old.org_id, old.topico_id, old.caminho, old.nome_original,
      old.tipo_mime, old.tamanho_bytes, old.enviado_por, old.created_at) then
    raise exception 'Um anexo não pode ser alterado, apenas removido';
  end if;

  if old.removido_em is not null and new.removido_em is distinct from old.removido_em then
    raise exception 'Um anexo removido não pode ser restaurado';
  end if;

  return new;
end;
$$;

create trigger proteger_consultoria_anexo
  before update on consultoria_anexos
  for each row execute function proteger_anexo_consultoria();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table consultoria_projetos    enable row level security;
alter table consultoria_topicos     enable row level security;
alter table consultoria_comentarios enable row level security;
alter table consultoria_anexos      enable row level security;

create policy consultoria_projetos_ler on consultoria_projetos
  for select using (org_id = org_atual());
create policy consultoria_projetos_escrever on consultoria_projetos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy consultoria_topicos_ler on consultoria_topicos
  for select using (org_id = org_atual());
create policy consultoria_topicos_escrever on consultoria_topicos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

create policy consultoria_comentarios_ler on consultoria_comentarios
  for select using (org_id = org_atual());
create policy consultoria_comentarios_inserir on consultoria_comentarios
  for insert with check (org_id = org_atual() and pode_escrever());

create policy consultoria_anexos_ler on consultoria_anexos
  for select using (org_id = org_atual());
create policy consultoria_anexos_inserir on consultoria_anexos
  for insert with check (org_id = org_atual() and pode_escrever());
create policy consultoria_anexos_remover on consultoria_anexos
  for update using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

-- ─── Auditoria ───────────────────────────────────────────────────────────────
-- Só o tópico (status e edições têm valor probatório); comentário já é timeline
-- imutável, e anexo segue o mesmo critério do anexo de atendimento — sem auditoria.

create trigger auditar_consultoria_topicos
  after insert or update or delete on consultoria_topicos
  for each row execute function registrar_auditoria();

-- ─── Semente: escopo da Consultoria Citel enviado por e-mail em 22/09/2026 ───
-- Sem seed.sql avulso pelo mesmo motivo do catálogo inicial: precisa de um
-- org_id, e este projeto já tem organização criada. Roda uma vez só — se não
-- houver organização ainda (validação local do schema) ou o projeto já existir,
-- não faz nada.

do $seed$
declare
  org     uuid;
  projeto uuid;
begin
  select id into org from organizacoes order by created_at limit 1;
  if org is null then
    return;
  end if;

  if exists (select 1 from consultoria_projetos where org_id = org and nome = 'Consultoria Citel') then
    return;
  end if;

  insert into consultoria_projetos (org_id, nome)
  values (org, 'Consultoria Citel')
  returning id into projeto;

  insert into consultoria_topicos (org_id, projeto_id, codigo, titulo, descricao, ordem)
  values
    (org, projeto, '1.1', 'Automatização de cálculos',
     'Requisito 457099. Entrega do requisito e validação junto ao time de compras.', 1),
    (org, projeto, '1.3', 'Análise de custo de entrega e logística',
     'Apresentar o projeto do relatório para controle de custo de entrega.', 2),
    (org, projeto, '1.4', 'Situação do Produto e Giro',
     'Requisito 457107. Entrega do requisito e validação junto ao time de compras.', 3),
    (org, projeto, '2.4', 'Precificação — Exclusão do ICMS da base do PIS/COFINS',
     'Implantar a configuração para exclusão do ICMS da base de cálculo de PIS e COFINS e realizar '
     'as validações de preços com a nova parametrização.', 4),
    (org, projeto, '2.5', 'Rotina de Acordo de Objetivos',
     'Orientação e treinamento sobre a rotina de acordo de objetivos. A agenda tem como objetivo '
     'apresentar a funcionalidade, orientar os usuários e validar sua utilização conforme o '
     'processo definido pelo cliente.', 5),
    (org, projeto, '2.1', 'Expedição / Fluxo de trabalho',
     'Para utilização do Citel Abastece, há necessidade de implantação de expedição por pedidos na '
     'empresa abastecedora (CFG_TIPEXP=4). Ação: consultoria presencial para desenho e adequação de '
     'fluxo de trabalho + implantação de expedição de pedidos.', 6),
    (org, projeto, '2.2', 'Implantação Citel Abastece',
     'Desenho de fluxo de trabalho, configuração e implantação do processo. Acompanhamento e '
     'suporte da operação. Ação: consultoria presencial.', 7),
    (org, projeto, '2.3', 'Restrição de Venda e Orçamento pelo CRM',
     'Validação das configurações necessárias para que o processo comercial siga o fluxo definido '
     'pelo cliente, permitindo que vendas e orçamentos sejam iniciados pelo CRM conforme as regras '
     'estabelecidas. Os direitos de acesso e permissões dos usuários já foram orientados durante o '
     'levantamento e serão considerados na validação final da rotina.', 8);
end
$seed$;
