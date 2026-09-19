-- ─────────────────────────────────────────────────────────────────────────────
-- Base: extensões, organizações e enums do domínio.
--
-- Os enums espelham lib/constants.ts. Ao alterar um lado, altere o outro.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- busca aproximada por nome

-- ─── Organização ─────────────────────────────────────────────────────────────
-- Existe desde o dia 1 mesmo com um único usuário: incluir org_id depois exigiria
-- reescrever todas as policies de RLS e fazer backfill.

create table organizacoes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type role_usuario as enum ('owner', 'tecnico', 'visualizador');

create type tipo_pessoa    as enum ('PJ', 'PF');
create type status_cliente as enum ('ativo', 'inativo', 'prospect');
create type tipo_contrato  as enum ('avulso', 'mensal', 'pacote_horas');

create type tipo_sistema     as enum ('erp', 'fiscal', 'sistema_proprio', 'infraestrutura', 'outro');
create type ambiente_sistema as enum ('producao', 'homologacao', 'teste');

create type canal_atendimento as enum (
  'telefone', 'whatsapp', 'email', 'presencial', 'acesso_remoto', 'chat', 'interno'
);

create type tipo_atendimento as enum (
  'duvida', 'erro', 'treinamento', 'implantacao', 'melhoria', 'manutencao', 'consultoria'
);

create type status_atendimento as enum (
  'aberto', 'em_andamento', 'aguardando_cliente', 'aguardando_terceiro',
  'agendado', 'resolvido', 'cancelado'
);

create type prioridade as enum ('baixa', 'media', 'alta', 'urgente');

create type tipo_interacao as enum (
  'nota', 'ligacao', 'email', 'whatsapp', 'acesso_remoto', 'visita',
  'mudanca_status', 'anexo', 'sistema'
);

create type status_pendencia      as enum ('aberta', 'em_andamento', 'concluida', 'cancelada');
create type responsavel_pendencia as enum ('eu', 'cliente', 'terceiro');

create type tipo_evento   as enum (
  'retorno', 'visita', 'reuniao', 'tarefa', 'lembrete', 'manutencao_preventiva'
);
create type status_evento as enum ('agendado', 'confirmado', 'realizado', 'cancelado', 'remarcado');

create type acao_auditoria as enum ('INSERT', 'UPDATE', 'DELETE');

-- ─── Funções utilitárias ─────────────────────────────────────────────────────

create or replace function definir_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizacoes_updated_at
  before update on organizacoes
  for each row execute function definir_updated_at();
