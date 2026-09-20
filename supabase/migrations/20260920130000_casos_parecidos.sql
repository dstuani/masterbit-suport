-- ─────────────────────────────────────────────────────────────────────────────
-- Casos parecidos: dado o relato de um atendimento novo, devolve os atendimentos
-- já resolvidos que mais se parecem, com a solução aplicada.
--
-- p_consulta é uma lista de termos ligados por " or " (montada no servidor, só com
-- letras e números). websearch_to_tsquery aceita esse formato sem erro de sintaxe,
-- e ts_rank ordena por quantos termos casam — o caso que compartilha mais palavras
-- do relato vem primeiro.
--
-- SECURITY INVOKER: roda com as permissões de quem chama, então o RLS continua
-- valendo e ninguém enxerga atendimento de outra organização.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function buscar_atendimentos_parecidos(
  p_consulta   text,
  p_cliente_id uuid default null,
  p_limite     integer default 5
)
returns table (
  id            uuid,
  numero        text,
  titulo        text,
  solucao       text,
  causa_raiz    text,
  cliente_id    uuid,
  cliente_nome  text,
  sistema_nome  text,
  finalizado_em timestamptz,
  relevancia    real
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select websearch_to_tsquery('portuguese', coalesce(p_consulta, '')) as tsq
  )
  select a.id,
         a.numero,
         a.titulo,
         a.solucao,
         a.causa_raiz,
         a.cliente_id,
         c.razao_social,
         s.nome,
         a.finalizado_em,
         -- Normalização 32: nota entre 0 e 1. Mesmo cliente pesa um pouco mais: o
         -- problema costuma ser do ambiente dele.
         (ts_rank(a.busca, q.tsq, 32)
            * case when a.cliente_id = p_cliente_id then 1.15 else 1 end)::real as relevancia
    from atendimentos a
    join clientes c on c.id = a.cliente_id
    left join sistemas s on s.id = a.sistema_id
    cross join q
   where a.status = 'resolvido'
     and a.busca @@ q.tsq
   order by relevancia desc, a.finalizado_em desc nulls last
   limit least(greatest(coalesce(p_limite, 5), 1), 10)
$$;
