/**
 * Executa todas as migrations em um Postgres efêmero (PGlite, WASM) e falha se
 * alguma não aplicar. Permite validar o schema sem Docker e sem tocar o projeto
 * Supabase remoto.
 *
 * Não substitui `supabase db push`: aqui o schema `auth` do Supabase é um stub.
 * O que se prova é que o SQL é válido e consistente entre si — sintaxe, ordem de
 * dependências, FKs, constraints, triggers, funções e policies.
 *
 *   npm run db:check
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const PASTA_MIGRATIONS = "supabase/migrations";

/** Stub mínimo do que o Supabase fornece: schema auth e auth.uid(). */
const STUB_SUPABASE = `
  create schema if not exists auth;

  create table auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at         timestamptz not null default now()
  );

  create table if not exists auth.sessao_teste (usuario uuid);

  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$ select usuario from auth.sessao_teste limit 1 $$;
`;

async function main() {
  const db = new PGlite({ extensions: { pgcrypto, pg_trgm } });
  await db.exec("create extension if not exists pgcrypto;");
  await db.exec(STUB_SUPABASE);

  const arquivos = (await readdir(PASTA_MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();

  if (arquivos.length === 0) {
    console.error("Nenhuma migration encontrada em " + PASTA_MIGRATIONS);
    process.exit(1);
  }

  for (const arquivo of arquivos) {
    const sql = await readFile(join(PASTA_MIGRATIONS, arquivo), "utf8");
    try {
      await db.exec(sql);
      console.log(`  ok   ${arquivo}`);
    } catch (erro) {
      console.error(`  FALHA ${arquivo}`);
      console.error(`        ${erro.message}`);
      process.exit(1);
    }
  }

  // Conferência estrutural: as 14 tabelas esperadas existem?
  const esperadas = [
    "organizacoes",
    "profiles",
    "clientes",
    "filiais",
    "cliente_contatos",
    "sistemas",
    "clientes_sistemas",
    "categorias",
    "subcategorias",
    "atendimentos",
    "atendimento_interacoes",
    "pendencias",
    "agenda_eventos",
    "audit_logs",
    "atendimento_anexos",
  ];

  const { rows } = await db.query(
    `select tablename, rowsecurity
       from pg_tables
      where schemaname = 'public'
      order by tablename`,
  );
  const encontradas = new Set(rows.map((r) => r.tablename));

  const faltando = esperadas.filter((t) => !encontradas.has(t));
  if (faltando.length > 0) {
    console.error(`\nTabelas faltando: ${faltando.join(", ")}`);
    process.exit(1);
  }

  const semRls = rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);
  if (semRls.length > 0) {
    console.error(`\nTabelas sem RLS habilitado: ${semRls.join(", ")}`);
    process.exit(1);
  }

  const { rows: policies } = await db.query(
    `select tablename, count(*)::int as total
       from pg_policies where schemaname = 'public'
      group by tablename order by tablename`,
  );

  const semPolicy = esperadas.filter((t) => !policies.some((p) => p.tablename === t));
  if (semPolicy.length > 0) {
    console.error(`\nTabelas com RLS mas sem policy (ficariam inacessíveis): ${semPolicy.join(", ")}`);
    process.exit(1);
  }

  console.log(
    `\n${arquivos.length} migrations aplicadas · ${rows.length} tabelas · ` +
      `${policies.reduce((s, p) => s + p.total, 0)} policies · RLS em todas`,
  );

  await db.close();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
