-- ─────────────────────────────────────────────────────────────────────────────
-- Usuário desativado perde o acesso no banco, não só no app.
--
-- org_atual() e papel_atual() alimentam todas as policies de RLS (e o storage).
-- Antes, ignoravam profiles.ativo: o bloqueio existia só nas Server Actions, e um
-- usuário desativado seguia lendo tudo e podia gravar pela API direta com o token
-- dele. Com o filtro, para ele as duas funções devolvem NULL — nenhuma policy casa,
-- nenhuma linha aparece, nenhuma escrita passa. pode_escrever() depende de
-- papel_atual() e herda a regra sem precisar mudar.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function org_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid() and ativo;
$$;

create or replace function papel_atual()
returns role_usuario
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() and ativo;
$$;
