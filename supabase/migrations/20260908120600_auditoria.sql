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
