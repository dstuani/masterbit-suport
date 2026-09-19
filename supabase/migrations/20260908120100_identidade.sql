-- ─────────────────────────────────────────────────────────────────────────────
-- Identidade: profiles espelha auth.users e ancora o multi-tenant.
-- ─────────────────────────────────────────────────────────────────────────────

create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  org_id     uuid not null references organizacoes (id) on delete restrict,
  nome       text not null,
  email      text not null,
  telefone   text,
  avatar_url text,
  role       role_usuario not null default 'tecnico',
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_por_org on profiles (org_id, lower(email));
create index profiles_org on profiles (org_id) where ativo;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function definir_updated_at();

-- ─── Organização do usuário logado ───────────────────────────────────────────
-- SECURITY DEFINER de propósito: as policies de RLS chamam esta função, e sem o
-- bypass a leitura de profiles dentro da própria policy de profiles recursaria.

create or replace function org_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function papel_atual()
returns role_usuario
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function pode_escrever()
returns boolean
language sql
stable
as $$
  select coalesce(papel_atual() in ('owner', 'tecnico'), false);
$$;

-- ─── Provisionamento de novo usuário ─────────────────────────────────────────
-- Cria o profile no cadastro. O primeiro usuário vira owner e ganha uma
-- organização; os seguintes entram como técnicos na organização existente.

create or replace function tratar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org        uuid;
  eh_primeiro boolean;
begin
  select id into org from organizacoes order by created_at limit 1;

  if org is null then
    insert into organizacoes (nome) values ('Minha organização') returning id into org;
    eh_primeiro := true;
  else
    eh_primeiro := not exists (select 1 from profiles);
  end if;

  insert into profiles (id, org_id, nome, email, role)
  values (
    new.id,
    org,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when eh_primeiro then 'owner'::role_usuario else 'tecnico'::role_usuario end
  );

  return new;
end;
$$;

create trigger criar_profile_ao_cadastrar
  after insert on auth.users
  for each row execute function tratar_novo_usuario();
