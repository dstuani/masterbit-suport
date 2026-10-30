-- ─────────────────────────────────────────────────────────────────────────────
-- A inclusão da base de conhecimento deixou de pedir descrição: o título basta.
-- A coluna fica, opcional, para não perder o que já foi escrito.
-- ─────────────────────────────────────────────────────────────────────────────

alter table conhecimentos
  alter column descricao drop not null,
  drop constraint conhecimentos_descricao_valida,
  add constraint conhecimentos_descricao_valida check (descricao is null or length(descricao) <= 4000);
