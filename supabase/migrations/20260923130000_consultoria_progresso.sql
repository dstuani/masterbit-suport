-- ─────────────────────────────────────────────────────────────────────────────
-- Progresso percentual por tópico de consultoria.
--
-- Complementa o status: "em andamento" diz que começou, o percentual diz o
-- quanto já foi feito. Fica no próprio tópico (e não numa tabela à parte) porque
-- é um número atual, não um histórico — as mudanças ficam na auditoria do tópico.
-- ─────────────────────────────────────────────────────────────────────────────

alter table consultoria_topicos
  add column progresso integer not null default 0,
  add constraint consultoria_topicos_progresso_valido check (progresso between 0 and 100);

-- Tópicos que já estavam concluídos antes desta coluna existir.
update consultoria_topicos set progresso = 100 where status = 'concluido';
