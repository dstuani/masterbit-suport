-- ─────────────────────────────────────────────────────────────────────────────
-- Anexos dos atendimentos: arquivos e prints.
--
-- O binário fica no Supabase Storage (bucket privado "anexos"); aqui ficam os
-- metadados. O caminho no bucket é <org_id>/<atendimento_id>/<uuid>.<ext> — a
-- primeira pasta é a organização, e é ela que as policies de storage conferem.
--
-- Sem DELETE: remover um anexo só marca removido_em (soft delete), como o resto do
-- sistema. O arquivo permanece no bucket e a remoção fica registrada na timeline.
-- ─────────────────────────────────────────────────────────────────────────────

create table atendimento_anexos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizacoes (id) on delete cascade,
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  caminho        text not null,
  nome_original  text not null,
  tipo_mime      text not null,
  tamanho_bytes  integer not null,
  enviado_por    uuid references profiles (id) on delete set null,
  removido_em    timestamptz,
  created_at     timestamptz not null default now(),

  constraint anexos_nome_nao_vazio check (length(btrim(nome_original)) > 0),
  constraint anexos_tamanho_valido check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  -- O caminho precisa começar pela própria organização: impede um registro apontar
  -- para o arquivo de outra.
  constraint anexos_caminho_da_org check (caminho like org_id::text || '/%')
);

create unique index anexos_caminho_unico on atendimento_anexos (caminho);
create index anexos_atendimento on atendimento_anexos (atendimento_id, created_at desc);

-- ─── Só removido_em pode mudar ───────────────────────────────────────────────
-- A policy de UPDATE precisa existir para o soft delete, mas ela liberaria trocar
-- o caminho ou o nome. O trigger fecha isso no banco, e impede "desremover".

create or replace function proteger_anexo()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if (new.id, new.org_id, new.atendimento_id, new.caminho, new.nome_original,
      new.tipo_mime, new.tamanho_bytes, new.enviado_por, new.created_at)
     is distinct from
     (old.id, old.org_id, old.atendimento_id, old.caminho, old.nome_original,
      old.tipo_mime, old.tamanho_bytes, old.enviado_por, old.created_at) then
    raise exception 'Um anexo não pode ser alterado, apenas removido';
  end if;

  if old.removido_em is not null and new.removido_em is distinct from old.removido_em then
    raise exception 'Um anexo removido não pode ser restaurado';
  end if;

  return new;
end;
$$;

create trigger proteger_anexo
  before update on atendimento_anexos
  for each row execute function proteger_anexo();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table atendimento_anexos enable row level security;

create policy anexos_ler on atendimento_anexos
  for select using (org_id = org_atual());

create policy anexos_inserir on atendimento_anexos
  for insert with check (org_id = org_atual() and pode_escrever());

create policy anexos_remover on atendimento_anexos
  for update using (org_id = org_atual() and pode_escrever())
  with check (org_id = org_atual() and pode_escrever());

-- ─── Storage ─────────────────────────────────────────────────────────────────
-- O schema storage só existe no Supabase. Fora dele (validação local em PGlite) o
-- bloco é ignorado, e as tabelas acima continuam sendo testadas normalmente.
-- Nenhuma policy de UPDATE/DELETE em storage.objects: o arquivo, uma vez enviado,
-- não é reescrito nem apagado pela API.

do $storage$
begin
  if to_regnamespace('storage') is null then
    raise notice 'schema storage ausente: bucket e policies de anexos não criados';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'anexos',
    'anexos',
    false,
    10485760,
    array[
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv', 'application/json', 'application/xml',
      'application/zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
  on conflict (id) do nothing;

  execute $p$
    create policy anexos_storage_ler on storage.objects
      for select to authenticated
      using (bucket_id = 'anexos' and (storage.foldername(name))[1] = org_atual()::text)
  $p$;

  execute $p$
    create policy anexos_storage_enviar on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'anexos'
        and (storage.foldername(name))[1] = org_atual()::text
        and pode_escrever()
      )
  $p$;
end
$storage$;
