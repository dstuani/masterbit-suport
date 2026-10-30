-- ─────────────────────────────────────────────────────────────────────────────
-- Base de conhecimento em duas sessões: Configurações e Select.
-- O que já estava cadastrado entra em Select; a sessão se troca editando o item.
-- ─────────────────────────────────────────────────────────────────────────────

alter table conhecimentos
  add column tipo text not null default 'select',
  add constraint conhecimentos_tipo_valido check (tipo in ('configuracao', 'select'));

create index conhecimentos_org_tipo on conhecimentos (org_id, tipo);
