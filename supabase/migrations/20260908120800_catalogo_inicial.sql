-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo inicial de categorias e subcategorias.
--
-- Semeado junto com a organização, em vez de num seed.sql avulso: a organização
-- nasce no cadastro do primeiro usuário, então não há momento anterior em que um
-- seed teria um org_id para usar. Tudo aqui é editável em Configurações.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function semear_catalogos(org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $funcao$
declare
  categoria_id uuid;
  item         record;
begin
  -- Não semear duas vezes na mesma organização.
  if exists (select 1 from categorias where org_id = org) then
    return;
  end if;

  for item in
    select *
      from (values
        ('Fiscal',          '#d97706', 1, array['NF-e rejeitada', 'SPED', 'Certificado digital', 'Impostos']),
        ('Financeiro',      '#059669', 2, array['Contas a pagar', 'Contas a receber', 'Conciliação', 'Boletos']),
        ('Sistema',         '#1f6feb', 3, array['Erro na aplicação', 'Lentidão', 'Atualização de versão', 'Configuração']),
        ('Infraestrutura',  '#7c3aed', 4, array['Rede', 'Servidor', 'Backup', 'Impressora', 'Estação de trabalho']),
        ('Banco de dados',  '#0891b2', 5, array['Consulta', 'Correção de dados', 'Desempenho', 'Restauração']),
        ('Treinamento',     '#db2777', 6, array['Novo usuário', 'Novo módulo', 'Reciclagem']),
        ('Cadastros',       '#65a30d', 7, array['Produtos', 'Clientes', 'Fornecedores', 'Usuários e permissões'])
      ) as t(nome, cor, ordem, subs)
  loop
    insert into categorias (org_id, nome, cor, ordem)
    values (org, item.nome, item.cor, item.ordem)
    returning id into categoria_id;

    insert into subcategorias (org_id, categoria_id, nome, ordem)
    select org, categoria_id, sub, idx
      from unnest(item.subs) with ordinality as s(sub, idx);
  end loop;
end;
$funcao$;

-- Passa a semear ao criar a organização do primeiro usuário.
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
$funcao$;
