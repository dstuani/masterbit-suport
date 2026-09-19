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
