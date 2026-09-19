/**
 * Gera lib/types/database.ts a partir das migrations, aplicando-as num Postgres
 * efêmero e lendo o catálogo. Mantém os tipos exatos sem depender de um projeto
 * Supabase linkado.
 *
 * Quando o projeto remoto existir, `npm run db:types` (Supabase CLI) é a fonte
 * preferida — este script é o equivalente offline.
 *
 *   npm run db:types:local
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const SAIDA = "lib/types/database.ts";

const STUB_SUPABASE = `
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table auth.sessao_teste (usuario uuid);
  create or replace function auth.uid()
  returns uuid language sql stable
  as $$ select usuario from auth.sessao_teste limit 1 $$;
`;

/** Tipo Postgres → tipo TypeScript. */
function tipoTs(coluna, enums) {
  const { tipo, udt, dimensoes } = coluna;

  if (dimensoes > 0) {
    const base = tipoTs({ ...coluna, dimensoes: 0, udt: udt.replace(/^_/, "") }, enums);
    return `${base}[]`;
  }

  if (enums.has(udt)) return enums.get(udt).map((v) => `"${v}"`).join(" | ");

  switch (tipo) {
    case "integer":
    case "bigint":
    case "smallint":
    case "numeric":
    case "real":
    case "double precision":
      return "number";
    case "boolean":
      return "boolean";
    case "json":
    case "jsonb":
      return "Json";
    default:
      // uuid, text, timestamptz, date, tsvector, char, inet — todos chegam como string.
      return "string";
  }
}

async function main() {
  const db = new PGlite({ extensions: { pgcrypto, pg_trgm } });
  await db.exec("create extension if not exists pgcrypto;");
  await db.exec(STUB_SUPABASE);

  const pasta = "supabase/migrations";
  for (const arquivo of (await readdir(pasta)).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(join(pasta, arquivo), "utf8"));
  }

  const { rows: valoresEnum } = await db.query(`
    select t.typname as nome, e.enumlabel as valor
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
     order by t.typname, e.enumsortorder
  `);

  const enums = new Map();
  for (const { nome, valor } of valoresEnum) {
    if (!enums.has(nome)) enums.set(nome, []);
    enums.get(nome).push(valor);
  }

  const { rows: colunas } = await db.query(`
    select c.table_name          as tabela,
           c.column_name         as coluna,
           c.data_type           as tipo,
           c.udt_name            as udt,
           c.is_nullable = 'YES' as nulavel,
           c.column_default is not null or c.is_identity = 'YES' as tem_default,
           coalesce(a.attndims, 0) as dimensoes,
           c.is_generated = 'ALWAYS' as gerada,
           pc.relkind               as especie
      from information_schema.columns c
      join pg_class     pc on pc.relname = c.table_name
      join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = c.table_schema
      join pg_attribute a  on a.attrelid = pc.oid and a.attname = c.column_name
     where c.table_schema = 'public'
       and pc.relkind in ('r', 'v')
     order by c.table_name, c.ordinal_position
  `);

  const tabelas = new Map();
  const views = new Map();
  for (const coluna of colunas) {
    const destino = coluna.especie === "v" ? views : tabelas;
    if (!destino.has(coluna.tabela)) destino.set(coluna.tabela, []);
    destino.get(coluna.tabela).push(coluna);
  }

  // As chaves estrangeiras viram `Relationships`. Sem elas o supabase-js não
  // consegue inferir nada e todas as queries acabam tipadas como `never`.
  const { rows: fks } = await db.query(`
    select con.conname                                as nome,
           origem.relname                             as tabela,
           destino.relname                            as referencia,
           array_agg(ao.attname order by u.ord)       as colunas,
           array_agg(ad.attname order by u.ord)       as colunas_referencia,
           exists (
             select 1 from pg_index i
              where i.indrelid = con.conrelid
                and i.indisunique
                and i.indkey::int2[] @> con.conkey
                and array_length(i.indkey::int2[], 1) = array_length(con.conkey, 1)
           )                                          as um_para_um
      from pg_constraint con
      join pg_class     origem  on origem.oid = con.conrelid
      join pg_class     destino on destino.oid = con.confrelid
      join pg_namespace n       on n.oid = origem.relnamespace
      join unnest(con.conkey)  with ordinality as u(attnum, ord) on true
      join unnest(con.confkey) with ordinality as v(attnum, ord) on v.ord = u.ord
      join pg_attribute ao on ao.attrelid = con.conrelid  and ao.attnum = u.attnum
      join pg_attribute ad on ad.attrelid = con.confrelid and ad.attnum = v.attnum
     where con.contype = 'f' and n.nspname = 'public'
     group by con.conname, origem.relname, destino.relname, con.conrelid, con.conkey
     order by origem.relname, con.conname
  `);

  const relacoes = new Map();
  for (const fk of fks) {
    if (!relacoes.has(fk.tabela)) relacoes.set(fk.tabela, []);
    relacoes.get(fk.tabela).push(fk);
  }

  const linhas = [];
  linhas.push("/**");
  linhas.push(" * Tipos do banco — GERADO AUTOMATICAMENTE. Não edite à mão.");
  linhas.push(" *");
  linhas.push(" * Fonte: supabase/migrations/. Regenerar com `npm run db:types:local`");
  linhas.push(" * (offline) ou `npm run db:types` (a partir do projeto Supabase linkado).");
  linhas.push(" */");
  linhas.push("");
  linhas.push("export type Json =");
  linhas.push("  | string");
  linhas.push("  | number");
  linhas.push("  | boolean");
  linhas.push("  | null");
  linhas.push("  | { [key: string]: Json | undefined }");
  linhas.push("  | Json[];");
  linhas.push("");
  linhas.push("export type Database = {");
  linhas.push("  public: {");
  linhas.push("    Tables: {");

  for (const [tabela, cols] of [...tabelas].sort(([a], [b]) => a.localeCompare(b))) {
    linhas.push(`      ${tabela}: {`);

    linhas.push("        Row: {");
    for (const c of cols) {
      linhas.push(`          ${c.coluna}: ${tipoTs(c, enums)}${c.nulavel ? " | null" : ""};`);
    }
    linhas.push("        };");

    linhas.push("        Insert: {");
    for (const c of cols) {
      if (c.gerada) continue; // colunas GENERATED não podem ser escritas
      const opcional = c.nulavel || c.tem_default ? "?" : "";
      linhas.push(
        `          ${c.coluna}${opcional}: ${tipoTs(c, enums)}${c.nulavel ? " | null" : ""};`,
      );
    }
    linhas.push("        };");

    linhas.push("        Update: {");
    for (const c of cols) {
      if (c.gerada) continue;
      linhas.push(`          ${c.coluna}?: ${tipoTs(c, enums)}${c.nulavel ? " | null" : ""};`);
    }
    linhas.push("        };");

    const fksDaTabela = relacoes.get(tabela) ?? [];
    if (fksDaTabela.length === 0) {
      linhas.push("        Relationships: [];");
    } else {
      linhas.push("        Relationships: [");
      for (const fk of fksDaTabela) {
        linhas.push("          {");
        linhas.push(`            foreignKeyName: "${fk.nome}";`);
        linhas.push(`            columns: [${fk.colunas.map((c) => `"${c}"`).join(", ")}];`);
        linhas.push(`            isOneToOne: ${fk.um_para_um ? "true" : "false"};`);
        linhas.push(`            referencedRelation: "${fk.referencia}";`);
        linhas.push(
          `            referencedColumns: [${fk.colunas_referencia.map((c) => `"${c}"`).join(", ")}];`,
        );
        linhas.push("          },");
      }
      linhas.push("        ];");
    }

    linhas.push("      };");
  }

  linhas.push("    };");

  if (views.size === 0) {
    linhas.push("    Views: Record<string, never>;");
  } else {
    linhas.push("    Views: {");
    for (const [view, cols] of [...views].sort(([a], [b]) => a.localeCompare(b))) {
      linhas.push(`      ${view}: {`);
      linhas.push("        Row: {");
      for (const c of cols) {
        // O Postgres marca toda coluna de view como nulável; manter assim é o
        // comportamento honesto, e obriga a tratar o nulo na exibição.
        linhas.push(`          ${c.coluna}: ${tipoTs(c, enums)} | null;`);
      }
      linhas.push("        };");
      linhas.push("        Relationships: [];");
      linhas.push("      };");
    }
    linhas.push("    };");
  }
  linhas.push("    Functions: Record<string, never>;");
  linhas.push("    Enums: {");
  for (const [nome, valores] of [...enums].sort(([a], [b]) => a.localeCompare(b))) {
    linhas.push(`      ${nome}: ${valores.map((v) => `"${v}"`).join(" | ")};`);
  }
  linhas.push("    };");
  linhas.push("    CompositeTypes: Record<string, never>;");
  linhas.push("  };");
  linhas.push("};");
  linhas.push("");
  linhas.push("export type Tabelas<T extends keyof Database[\"public\"][\"Tables\"]> =");
  linhas.push("  Database[\"public\"][\"Tables\"][T][\"Row\"];");
  linhas.push("export type Inserir<T extends keyof Database[\"public\"][\"Tables\"]> =");
  linhas.push("  Database[\"public\"][\"Tables\"][T][\"Insert\"];");
  linhas.push("export type Atualizar<T extends keyof Database[\"public\"][\"Tables\"]> =");
  linhas.push("  Database[\"public\"][\"Tables\"][T][\"Update\"];");
  linhas.push("");

  await writeFile(SAIDA, linhas.join("\n"), "utf8");
  await db.close();

  console.log(`${SAIDA} gerado · ${tabelas.size} tabelas · ${enums.size} enums`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
