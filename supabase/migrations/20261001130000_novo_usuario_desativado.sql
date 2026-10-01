-- ─────────────────────────────────────────────────────────────────────────────
-- Usuário novo nasce desativado (exceto o primeiro, que é o owner).
--
-- Defesa em profundidade para o cadastro público do Supabase: o endereço de
-- signup é público e a chave usada nele vai no navegador. Se o cadastro estiver
-- ligado no painel — por padrão, ou religado por engano —, qualquer pessoa vira
-- usuário. Antes ela entrava como técnico ativo, com leitura e escrita; agora
-- entra sem acesso nenhum (org_atual()/papel_atual() ignoram inativos) até o
-- owner ativá-la em Configurações → Equipe.
--
-- Quem o owner cria pela tela Equipe sai ativo: o app ativa logo após criar.
-- Corpo igual ao de catalogo_inicial.sql, mudando só a coluna ativo.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function tratar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
declare
  org         uuid;
  eh_primeiro boolean;
begin
  select id into org from organizacoes order by created_at limit 1;

  if org is null then
    insert into organizacoes (nome) values ('Minha organização') returning id into org;
    eh_primeiro := true;
    perform semear_catalogos(org);
  else
    eh_primeiro := not exists (select 1 from profiles);
  end if;

  insert into profiles (id, org_id, nome, email, role, ativo)
  values (
    new.id,
    org,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when eh_primeiro then 'owner'::role_usuario else 'tecnico'::role_usuario end,
    eh_primeiro
  );

  return new;
end;
$funcao$;
