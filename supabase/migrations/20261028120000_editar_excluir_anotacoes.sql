-- ─────────────────────────────────────────────────────────────────────────────
-- Editar e excluir anotações do histórico.
--
-- Até aqui a timeline era imutável (só SELECT e INSERT). Por decisão de produto, quem
-- escreve (owner e técnico) agora corrige e exclui as anotações que registrou à mão.
-- O resto continua fechado:
--   · só os tipos manuais (nota, ligação, e-mail, WhatsApp, acesso remoto, visita);
--     linhas do sistema, mudança de status e anexo nunca mudam;
--   · só o texto e o tempo mudam; autor, data, tipo e anexos ficam como estão;
--   · excluir é esconder (removido_em), como no resto do sistema: nada de DELETE e a
--     linha não volta;
--   · o tempo da anotação sai do total do atendimento quando ela é excluída e se ajusta
--     quando é corrigida.
-- O papel solicitante continua só com SELECT e INSERT, e não enxerga o que foi excluído.
-- ─────────────────────────────────────────────────────────────────────────────

alter table atendimento_interacoes
  add column editado_em  timestamptz,
  add column removido_em timestamptz;

create policy interacoes_editar on atendimento_interacoes
  for update
  using (
    org_id = org_atual() and pode_escrever()
    and tipo in ('nota', 'ligacao', 'email', 'whatsapp', 'acesso_remoto', 'visita')
    and removido_em is null
  )
  with check (
    org_id = org_atual() and pode_escrever()
    and tipo in ('nota', 'ligacao', 'email', 'whatsapp', 'acesso_remoto', 'visita')
  );

-- O solicitante não vê o que a equipe excluiu.
drop policy interacoes_ler_solicitante on atendimento_interacoes;
create policy interacoes_ler_solicitante on atendimento_interacoes
  for select using (
    org_id = org_restrita()
    and papel_atual() = 'solicitante'
    and removido_em is null
    and exists (
      select 1 from atendimentos a
       where a.id = atendimento_id and a.created_by = auth.uid()
    )
  );

-- ─── Só texto e tempo mudam; excluir não se desfaz ───────────────────────────

create or replace function proteger_interacao()
returns trigger
language plpgsql
as $funcao$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.org_id is distinct from old.org_id
     or new.atendimento_id is distinct from old.atendimento_id
     or new.autor_id is distinct from old.autor_id
     or new.tipo is distinct from old.tipo
     or new.status_anterior is distinct from old.status_anterior
     or new.status_novo is distinct from old.status_novo
     or new.anexos is distinct from old.anexos
     or new.visivel_cliente is distinct from old.visivel_cliente
     or new.ocorrido_em is distinct from old.ocorrido_em
     or new.created_at is distinct from old.created_at then
    raise exception 'Nesta anotação só o texto e o tempo podem ser alterados';
  end if;

  if old.removido_em is not null and new.removido_em is distinct from old.removido_em then
    raise exception 'Uma anotação excluída não pode ser restaurada';
  end if;

  if new.removido_em is not null and old.removido_em is null then
    return new;
  end if;

  if new.conteudo is distinct from old.conteudo
     or new.tempo_gasto_minutos is distinct from old.tempo_gasto_minutos then
    new.editado_em := now();
  end if;

  return new;
end;
$funcao$;

create trigger interacoes_proteger
  before update on atendimento_interacoes
  for each row execute function proteger_interacao();

-- ─── O total de tempo do atendimento acompanha a correção ────────────────────

create or replace function ajustar_tempo_interacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
declare
  antes  integer := case when old.removido_em is null then old.tempo_gasto_minutos else 0 end;
  depois integer := case when new.removido_em is null then new.tempo_gasto_minutos else 0 end;
begin
  if depois <> antes then
    update atendimentos
       set tempo_gasto_minutos = greatest(0, tempo_gasto_minutos + (depois - antes)),
           updated_at = now()
     where id = new.atendimento_id;
  end if;
  return new;
end;
$funcao$;

create trigger interacoes_ajustar_tempo
  after update on atendimento_interacoes
  for each row execute function ajustar_tempo_interacao();
