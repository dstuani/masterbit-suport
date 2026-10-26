-- ─────────────────────────────────────────────────────────────────────────────
-- Regras dos papéis restritos (solicitante e agenda).
--
-- Desenho: org_atual() passa a devolver NULL para os papéis restritos. Como TODAS
-- as policies existentes (e as do Storage) começam por org_id = org_atual(), esses
-- usuários perdem de uma vez o acesso a tudo — inclusive a tabelas criadas no
-- futuro, que nascem fechadas para eles sem precisar lembrar. O que eles podem
-- fazer fica só nas policies abaixo, que usam org_restrita() no lugar.
--
-- pode_escrever() continua só para owner e técnico: nenhuma policy de escrita
-- antiga se abre para os papéis novos.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cliente do solicitante ──────────────────────────────────────────────────

alter table profiles
  add column cliente_id uuid references clientes (id) on delete restrict;

alter table profiles
  add constraint profiles_solicitante_tem_cliente
  check (role <> 'solicitante' or cliente_id is not null);

create index profiles_cliente on profiles (cliente_id) where cliente_id is not null;

-- ─── Funções de identidade ───────────────────────────────────────────────────

create or replace function org_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles
   where id = auth.uid() and ativo and role in ('owner', 'tecnico', 'visualizador');
$$;

/** Organização de quem tem papel restrito (e está ativo); NULL para os demais. */
create or replace function org_restrita()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles
   where id = auth.uid() and ativo and role in ('solicitante', 'agenda');
$$;

/** Cliente a que o solicitante pertence; NULL para qualquer outro papel. */
create or replace function cliente_do_solicitante()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from profiles
   where id = auth.uid() and ativo and role = 'solicitante';
$$;

-- ─── Próprio perfil ──────────────────────────────────────────────────────────
-- Sem isto o app não acharia o perfil e trataria a pessoa como desativada.
-- Só leitura: nome e telefone o owner ajusta na tela Equipe.

create policy profiles_ler_proprio_restrito on profiles
  for select using (id = auth.uid() and org_restrita() is not null);

-- ─── Clientes ────────────────────────────────────────────────────────────────
-- Solicitante: só o próprio cliente (o nome aparece nos atendimentos dele).
-- Agenda: todos, para vincular o evento a um cliente.

create policy clientes_ler_restrito on clientes
  for select using (
    org_id = org_restrita()
    and (papel_atual() = 'agenda' or id = cliente_do_solicitante())
  );

-- ─── Atendimentos do solicitante ─────────────────────────────────────────────

create policy atendimentos_ler_solicitante on atendimentos
  for select using (
    org_id = org_restrita()
    and papel_atual() = 'solicitante'
    and created_by = auth.uid()
  );

-- Nasce aberto, no cliente dele, sem responsável nem valores: o resto é com a equipe.
create policy atendimentos_abrir_solicitante on atendimentos
  for insert with check (
    org_id = org_restrita()
    and papel_atual() = 'solicitante'
    and created_by = auth.uid()
    and cliente_id = cliente_do_solicitante()
    and status = 'aberto'
    and responsavel_id is null
    and solucao is null
    and tempo_gasto_minutos = 0
    and not faturavel
    and valor is null
  );

create policy interacoes_ler_solicitante on atendimento_interacoes
  for select using (
    org_id = org_restrita()
    and papel_atual() = 'solicitante'
    and exists (
      select 1 from atendimentos a
       where a.id = atendimento_id and a.created_by = auth.uid()
    )
  );

-- Só mensagem de texto, em nome dele, sem tempo nem anexo.
create policy interacoes_escrever_solicitante on atendimento_interacoes
  for insert with check (
    org_id = org_restrita()
    and papel_atual() = 'solicitante'
    and autor_id = auth.uid()
    and tipo = 'nota'
    and tempo_gasto_minutos = 0
    and anexos = '[]'::jsonb
    and exists (
      select 1 from atendimentos a
       where a.id = atendimento_id and a.created_by = auth.uid()
    )
  );

-- A mensagem do solicitante precisa subir o atendimento na lista da equipe
-- (updated_at), mas ele não tem UPDATE em atendimentos. Rodando como dono da
-- função, o trigger só toca o atendimento da interação que o RLS já aceitou.
create or replace function acumular_tempo_interacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcao$
begin
  update atendimentos
     set tempo_gasto_minutos = tempo_gasto_minutos + new.tempo_gasto_minutos,
         updated_at = now()
   where id = new.atendimento_id;
  return new;
end;
$funcao$;

-- ─── Agenda ──────────────────────────────────────────────────────────────────

create policy eventos_ler_agenda on agenda_eventos
  for select using (org_id = org_restrita() and papel_atual() = 'agenda');

create policy eventos_criar_agenda on agenda_eventos
  for insert with check (
    org_id = org_restrita()
    and papel_atual() = 'agenda'
    and created_by = auth.uid()
    and status = 'agendado'
  );

-- Remarcar = o evento antigo vira "remarcado" e nasce outro "agendado". Cancelar e
-- realizar ficam de fora; DELETE não tem policy para este papel.
create policy eventos_remarcar_agenda on agenda_eventos
  for update
  using (
    org_id = org_restrita()
    and papel_atual() = 'agenda'
    and status in ('agendado', 'confirmado')
  )
  with check (
    org_id = org_restrita()
    and papel_atual() = 'agenda'
    and status in ('agendado', 'confirmado', 'remarcado')
  );

-- ─── Proteção do perfil ──────────────────────────────────────────────────────
-- O cliente do solicitante decide o que ele enxerga: só o owner muda. Corpo igual
-- ao de 20260919120000_equipe.sql, com cliente_id junto de papel e situação.

create or replace function proteger_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.org_id is distinct from old.org_id then
    raise exception 'A organização de um usuário não pode ser alterada';
  end if;

  if new.role is distinct from old.role
     or new.ativo is distinct from old.ativo
     or new.cliente_id is distinct from old.cliente_id then
    if papel_atual() is distinct from 'owner' then
      raise exception 'Somente o owner altera papel, situação ou cliente de usuários';
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
