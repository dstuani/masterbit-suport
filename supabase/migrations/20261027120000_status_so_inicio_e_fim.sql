-- ─────────────────────────────────────────────────────────────────────────────
-- A timeline só marca o status do início e o do fim.
--
-- Antes, toda mudança de situação virava uma linha "Status: A → B" no histórico,
-- inclusive a passagem automática de Aberto para Em andamento que acontece na
-- primeira anotação. O histórico ficava poluído de linhas que só repetem o que
-- a pessoa já lançou. Agora:
--   · o início continua marcado por "Atendimento aberto" (trigger de abertura);
--   · o fim (resolvido ou cancelado) ganha a linha de status;
--   · reabrir um atendimento encerrado também ganha a linha, porque muda a história.
-- As mudanças do meio (andamento, aguardando…) seguem valendo no atendimento, só
-- não geram linha. Linhas antigas ficam como estão: a timeline é imutável.
-- Corpo igual ao de 20260908130000_automacoes_atendimento.sql, com a condição nova.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function registrar_mudanca_de_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
begin
  if new.status is distinct from old.status
     and (new.status in ('resolvido', 'cancelado') or old.status in ('resolvido', 'cancelado')) then
    insert into atendimento_interacoes (
      org_id, atendimento_id, autor_id, tipo, status_anterior, status_novo
    )
    values (new.org_id, new.id, auth.uid(), 'mudanca_status', old.status, new.status);
  end if;
  return new;
end;
$funcao$;
