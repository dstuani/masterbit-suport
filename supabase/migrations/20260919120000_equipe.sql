-- ─────────────────────────────────────────────────────────────────────────────
-- Equipe: proteção de papel e situação dos usuários.
--
-- A policy profiles_editar_proprio deixa qualquer usuário atualizar a própria linha,
-- inclusive a coluna role — um técnico poderia se promover a owner por chamada direta
-- à API. Este trigger fecha o buraco no banco: só o owner muda papel ou situação, e a
-- organização nunca fica sem owner ativo.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function proteger_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Escrita sem sessão (SQL administrativo, migrations) não passa pela API.
  if auth.uid() is null then
    return new;
  end if;

  if new.org_id is distinct from old.org_id then
    raise exception 'A organização de um usuário não pode ser alterada';
  end if;

  if new.role is distinct from old.role or new.ativo is distinct from old.ativo then
    if papel_atual() is distinct from 'owner' then
      raise exception 'Somente o owner altera papel ou situação de usuários';
    end if;

    if old.role = 'owner'
       and old.ativo
       and (new.role <> 'owner' or not new.ativo)
       and not exists (
         select 1 from profiles
          where org_id = old.org_id
            and role = 'owner'
            and ativo
            and id <> old.id
       ) then
      raise exception 'A organização precisa manter ao menos um owner ativo';
    end if;
  end if;

  return new;
end;
$$;

create trigger proteger_profile
  before update on profiles
  for each row execute function proteger_profile();
