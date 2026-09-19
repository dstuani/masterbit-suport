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
