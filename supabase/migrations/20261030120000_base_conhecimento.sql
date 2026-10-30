-- ─────────────────────────────────────────────────────────────────────────────
-- Base de conhecimento: comandos SQL guardados com a descrição do que fazem.
--
-- Consulta por palavra (título, descrição e o próprio comando), com filtro por sistema
-- e categoria. Leitura para a equipe da organização; escrita para owner e técnico.
-- Por decisão de produto, excluir apaga de vez (não é dado de cliente).
-- Papéis restritos (solicitante e agenda) ficam de fora: org_atual() é NULL para eles.
-- ─────────────────────────────────────────────────────────────────────────────

create table conhecimentos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizacoes (id) on delete cascade,
  titulo        text not null,
  descricao     text not null,
  comando       text not null,
  sistema_id    uuid references sistemas (id) on delete set null,
  categoria_id  uuid references categorias (id) on delete set null,
  created_by    uuid references profiles (id) on delete set null,
  updated_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint conhecimentos_titulo_valido check (length(btrim(titulo)) between 1 and 160),
  constraint conhecimentos_descricao_valida check (length(btrim(descricao)) between 1 and 4000),
  constraint conhecimentos_comando_valido check (length(btrim(comando)) between 1 and 20000)
);

create index conhecimentos_org on conhecimentos (org_id, updated_at desc);
create index conhecimentos_sistema on conhecimentos (sistema_id);
create index conhecimentos_categoria on conhecimentos (categoria_id);

create trigger conhecimentos_updated_at
  before update on conhecimentos
  for each row execute function definir_updated_at();

alter table conhecimentos enable row level security;

create policy conhecimentos_ler on conhecimentos
  for select using (org_id = org_atual());
create policy conhecimentos_escrever on conhecimentos
  for all using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());
