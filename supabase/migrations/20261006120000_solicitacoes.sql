-- ─────────────────────────────────────────────────────────────────────────────
-- Solicitações: caixa de entrada do formulário público da landing page.
--
-- Quem preenche o formulário não tem conta. Por isso a escrita pública NÃO é uma
-- policy de INSERT para o papel anon (isso abriria a tabela para qualquer corpo
-- de requisição): é uma única função SECURITY DEFINER, que valida tudo e só sabe
-- fazer uma coisa — inserir uma solicitação nova. A tabela não tem policy de
-- INSERT nem de DELETE; só a função cria, e a equipe lê e muda o status.
--
-- A solicitação NÃO é um atendimento: o dono triageia, abre o atendimento (com o
-- cliente certo) e marca como tratada. Assim, spam nunca polui o histórico.
-- ─────────────────────────────────────────────────────────────────────────────

create type status_solicitacao as enum ('nova', 'tratada', 'descartada');

create table solicitacoes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizacoes (id) on delete cascade,
  nome        text not null,
  empresa     text,
  email       text not null,
  telefone    text,
  assunto     text not null,
  descricao   text not null,
  status      status_solicitacao not null default 'nova',
  tratada_por uuid references profiles (id) on delete set null,
  tratada_em  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint solicitacoes_nome_valido check (length(btrim(nome)) between 1 and 120),
  constraint solicitacoes_email_valido check (length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint solicitacoes_assunto_valido check (length(btrim(assunto)) between 1 and 150),
  constraint solicitacoes_descricao_valida check (length(btrim(descricao)) between 1 and 4000)
);

create index solicitacoes_org_status on solicitacoes (org_id, status, created_at desc);
create index solicitacoes_email_recente on solicitacoes (lower(email), created_at desc);

create trigger solicitacoes_updated_at
  before update on solicitacoes
  for each row execute function definir_updated_at();

-- Quem trata fica registrado; o status só avança pelo app (RLS abaixo), e o
-- conteúdo enviado pelo cliente nunca é editado.
create or replace function proteger_solicitacao()
returns trigger
language plpgsql
as $$
begin
  if (new.id, new.org_id, new.nome, new.empresa, new.email, new.telefone,
      new.assunto, new.descricao, new.created_at)
     is distinct from
     (old.id, old.org_id, old.nome, old.empresa, old.email, old.telefone,
      old.assunto, old.descricao, old.created_at) then
    raise exception 'O conteúdo de uma solicitação não pode ser alterado';
  end if;

  if new.status is distinct from old.status then
    new.tratada_por := case when new.status = 'nova' then null else auth.uid() end;
    new.tratada_em  := case when new.status = 'nova' then null else now() end;
  end if;

  return new;
end;
$$;

create trigger proteger_solicitacoes
  before update on solicitacoes
  for each row execute function proteger_solicitacao();

alter table solicitacoes enable row level security;

create policy solicitacoes_ler on solicitacoes
  for select using (org_id = org_atual());
create policy solicitacoes_tratar on solicitacoes
  for update using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

-- ─── Porta de entrada pública ────────────────────────────────────────────────
-- Chamada pelo navegador de quem visita a landing (RPC do Supabase, com a chave
-- pública). Tudo que vale para um endpoint público vale aqui:
--   * o texto nunca é confiado — limites de tamanho e formato do e-mail;
--   * p_site é uma armadilha: o formulário o esconde das pessoas, e robôs o
--     preenchem. Preenchido, a função finge que deu certo e não grava nada;
--   * freio de volume (3 por e-mail e 30 no total, por hora) contra enxurrada.
--     O custo: uma enxurrada consegue esgotar a cota e bloquear o formulário por
--     até uma hora; nada é perdido, e as solicitações já gravadas seguem a salvo;
--   * a organização é a primeira (mesma suposição de organização única do resto
--     do sistema) — o visitante nunca informa org_id.
-- Os códigos de erro (dados_invalidos, limite_excedido, sem_organizacao) são
-- lidos pela landing; ao trocar um, troque lá também.

create or replace function registrar_solicitacao(
  p_nome      text,
  p_empresa   text,
  p_email     text,
  p_telefone  text,
  p_assunto   text,
  p_descricao text,
  p_site      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org          uuid;
  v_nome         text := btrim(coalesce(p_nome, ''));
  v_empresa      text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_email        text := lower(btrim(coalesce(p_email, '')));
  v_telefone     text := nullif(btrim(coalesce(p_telefone, '')), '');
  v_assunto      text := btrim(coalesce(p_assunto, ''));
  v_descricao    text := btrim(coalesce(p_descricao, ''));
  v_do_email     integer;
  v_no_total     integer;
begin
  if btrim(coalesce(p_site, '')) <> '' then
    return;
  end if;

  if length(v_nome) not between 2 and 120
     or length(coalesce(v_empresa, '')) > 120
     or length(v_email) > 254
     or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(coalesce(v_telefone, '')) > 30
     or length(v_assunto) not between 3 and 150
     or length(v_descricao) not between 10 and 4000 then
    raise exception 'dados_invalidos';
  end if;

  select id into v_org from organizacoes order by created_at limit 1;
  if v_org is null then
    raise exception 'sem_organizacao';
  end if;

  select count(*) filter (where lower(email) = v_email), count(*)
    into v_do_email, v_no_total
    from solicitacoes
   where created_at > now() - interval '1 hour';

  if v_do_email >= 3 or v_no_total >= 30 then
    raise exception 'limite_excedido';
  end if;

  insert into solicitacoes (org_id, nome, empresa, email, telefone, assunto, descricao)
  values (v_org, v_nome, v_empresa, v_email, v_telefone, v_assunto, v_descricao);
end;
$$;

-- Funções nascem executáveis por todos (PUBLIC). Aqui só a porta pública é
-- aberta de propósito, e para quem chama via API: o papel anon (visitante) e o
-- authenticated (quem já está logado e abre a landing). O DO existe porque o
-- Postgres efêmero dos testes não tem os papéis do Supabase.
revoke all on function registrar_solicitacao(text, text, text, text, text, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function registrar_solicitacao(text, text, text, text, text, text, text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function registrar_solicitacao(text, text, text, text, text, text, text) to authenticated;
  end if;
end;
$$;
