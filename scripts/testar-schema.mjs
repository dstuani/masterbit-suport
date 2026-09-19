/**
 * Testa o comportamento do schema em um Postgres efêmero: triggers, constraints
 * e a imutabilidade da timeline.
 *
 * Limite conhecido: o PGlite roda como superusuário, que ignora RLS. As policies
 * são validadas estruturalmente por `db:check`; o comportamento delas só pode ser
 * exercitado no Supabase de verdade.
 *
 *   npm run db:test
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const STUB_SUPABASE = `
  create schema if not exists auth;
  create table auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at         timestamptz not null default now()
  );
  create table auth.sessao_teste (usuario uuid);
  create or replace function auth.uid()
  returns uuid language sql stable
  as $$ select usuario from auth.sessao_teste limit 1 $$;
`;

let passou = 0;
const falhas = [];

function verificar(nome, condicao, detalhe = "") {
  if (condicao) {
    passou += 1;
    console.log(`  ok   ${nome}`);
  } else {
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
    console.error(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

/** Espera que a operação seja rejeitada pelo banco. */
async function deveRejeitar(db, nome, sql, trecho) {
  try {
    await db.exec(sql);
    verificar(nome, false, "o banco aceitou o que deveria recusar");
  } catch (erro) {
    verificar(nome, erro.message.includes(trecho), `mensagem inesperada: ${erro.message}`);
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

  // ── Provisionamento: o cadastro em auth.users cria profile e organização ──
  await db.exec(`insert into auth.users (email) values ('suporte@exemplo.com.br');`);
  const { rows: perfis } = await db.query(`select p.id, p.role, p.org_id, o.nome as org
                                             from profiles p join organizacoes o on o.id = p.org_id`);
  verificar("cadastro cria profile automaticamente", perfis.length === 1);
  verificar("primeiro usuário vira owner", perfis[0]?.role === "owner");
  verificar("organização é criada junto", perfis[0]?.org === "Minha organização");

  const { rows: catalogo } = await db.query(
    `select (select count(*)::int from categorias) as categorias,
            (select count(*)::int from subcategorias) as subcategorias`,
  );
  verificar(
    "catálogo inicial é semeado com a organização",
    catalogo[0].categorias === 7 && catalogo[0].subcategorias === 28,
    `veio ${catalogo[0].categorias} categorias e ${catalogo[0].subcategorias} subcategorias`,
  );

  const orgId = perfis[0].org_id;
  const userId = perfis[0].id;
  await db.exec(`insert into auth.sessao_teste (usuario) values ('${userId}');`);

  const { rows: segundo } = await db.query(
    `insert into auth.users (email) values ('ajudante@exemplo.com.br') returning id`,
  );
  const { rows: perfil2 } = await db.query(`select role, org_id from profiles where id = $1`, [
    segundo[0].id,
  ]);
  verificar("segundo usuário entra como tecnico", perfil2[0]?.role === "tecnico");
  verificar("segundo usuário fica na mesma organização", perfil2[0]?.org_id === orgId);

  // ── Cadastros ──
  const { rows: cli } = await db.query(
    `insert into clientes (org_id, razao_social, documento, cidade, uf)
     values ($1, 'Padaria Estrela Ltda', '12345678000190', 'Vitória', 'ES') returning id`,
    [orgId],
  );
  const clienteId = cli[0].id;

  await deveRejeitar(
    db,
    "recusa UF inválida",
    `insert into clientes (org_id, razao_social, uf) values ('${orgId}', 'Teste', 'xx')`,
    "clientes_uf_valida",
  );

  await deveRejeitar(
    db,
    "recusa documento duplicado na mesma organização",
    `insert into clientes (org_id, razao_social, documento)
     values ('${orgId}', 'Outra empresa', '12345678000190')`,
    "clientes_documento_por_org",
  );

  await db.exec(
    `insert into filiais (org_id, cliente_id, nome, matriz) values ('${orgId}', '${clienteId}', 'Matriz', true)`,
  );
  await deveRejeitar(
    db,
    "recusa duas matrizes para o mesmo cliente",
    `insert into filiais (org_id, cliente_id, nome, matriz) values ('${orgId}', '${clienteId}', 'Outra matriz', true)`,
    "filiais_matriz_unica",
  );

  await db.exec(
    `insert into cliente_contatos (org_id, cliente_id, nome, principal)
     values ('${orgId}', '${clienteId}', 'Joana', true)`,
  );
  await deveRejeitar(
    db,
    "recusa dois contatos principais",
    `insert into cliente_contatos (org_id, cliente_id, nome, principal)
     values ('${orgId}', '${clienteId}', 'Marcos', true)`,
    "contatos_principal_unico",
  );

  // ── Atendimento: numeração, tempo, conclusão ──
  const { rows: at } = await db.query(
    `insert into atendimentos (org_id, cliente_id, titulo, descricao, created_by, responsavel_id)
     values ($1, $2, 'NF-e rejeitada com erro 539', 'Duplicidade de chave na emissão', $3, $3)
     returning id, numero, tempo_gasto_minutos`,
    [orgId, clienteId, userId],
  );
  const atendimentoId = at[0].id;

  verificar(
    "número gerado no padrão AT-AAAA-NNNNN",
    /^AT-\d{4}-\d{5}$/.test(at[0].numero),
    `veio "${at[0].numero}"`,
  );

  await db.exec(
    `insert into atendimento_interacoes (org_id, atendimento_id, autor_id, tipo, conteudo, tempo_gasto_minutos)
     values ('${orgId}', '${atendimentoId}', '${userId}', 'ligacao', 'Cliente relatou o erro', 15)`,
  );
  await db.exec(
    `insert into atendimento_interacoes (org_id, atendimento_id, autor_id, tipo, conteudo, tempo_gasto_minutos)
     values ('${orgId}', '${atendimentoId}', '${userId}', 'acesso_remoto', 'Ajustada a numeração', 30)`,
  );

  const { rows: tempo } = await db.query(`select tempo_gasto_minutos from atendimentos where id = $1`, [
    atendimentoId,
  ]);
  verificar(
    "tempo das interações acumula no atendimento",
    tempo[0].tempo_gasto_minutos === 45,
    `esperado 45, veio ${tempo[0].tempo_gasto_minutos}`,
  );

  // ── Automações da Fase 3 ──
  const { rows: abertura } = await db.query(
    `select tipo, conteudo, status_novo from atendimento_interacoes
      where atendimento_id = $1 and tipo = 'sistema'`,
    [atendimentoId],
  );
  verificar(
    "abertura entra sozinha na timeline",
    abertura.length === 1 && abertura[0].conteudo === "Atendimento aberto",
  );

  await db.exec(
    `update atendimentos set status = 'aguardando_cliente',
            aguardando_o_que = 'XML da nota' where id = '${atendimentoId}'`,
  );
  const { rows: mudanca } = await db.query(
    `select status_anterior, status_novo from atendimento_interacoes
      where atendimento_id = $1 and tipo = 'mudanca_status' order by created_at`,
    [atendimentoId],
  );
  verificar(
    "mudança de status vira interação automática",
    mudanca.length === 1 &&
      mudanca[0].status_anterior === "aberto" &&
      mudanca[0].status_novo === "aguardando_cliente",
    `veio ${JSON.stringify(mudanca)}`,
  );

  await deveRejeitar(
    db,
    "recusa resolver sem registrar a solução",
    `update atendimentos set status = 'resolvido', finalizado_em = now() where id = '${atendimentoId}'`,
    "atendimentos_resolvido_tem_solucao",
  );

  // finalizado_em não é informado de propósito: o trigger deve preencher.
  await db.exec(
    `update atendimentos
        set status = 'resolvido',
            solucao = 'Reemitida a NF-e com nova numeração', causa_raiz = 'Sequência duplicada'
      where id = '${atendimentoId}'`,
  );
  const { rows: resolvido } = await db.query(
    `select status, finalizado_em from atendimentos where id = $1`,
    [atendimentoId],
  );
  verificar("resolve quando há solução", resolvido[0].status === "resolvido");
  verificar("finalizado_em é preenchido sozinho ao resolver", resolvido[0].finalizado_em !== null);

  await db.exec(`update atendimentos set status = 'em_andamento' where id = '${atendimentoId}'`);
  const { rows: reaberto } = await db.query(
    `select finalizado_em from atendimentos where id = $1`,
    [atendimentoId],
  );
  verificar("reabrir limpa a data de fechamento", reaberto[0].finalizado_em === null);

  const { rows: naLista } = await db.query(
    `select numero, cliente_nome, pendencias_abertas from atendimentos_lista where id = $1`,
    [atendimentoId],
  );
  verificar(
    "view da lista resolve os nomes e conta pendências",
    naLista.length === 1 && naLista[0].cliente_nome === "Padaria Estrela Ltda",
    `veio ${JSON.stringify(naLista)}`,
  );

  // Volta a resolver para os testes seguintes continuarem coerentes.
  await db.exec(`update atendimentos set status = 'resolvido' where id = '${atendimentoId}'`);

  // ── Busca full-text em português ──
  const { rows: busca } = await db.query(
    `select numero from atendimentos where busca @@ plainto_tsquery('portuguese', $1)`,
    ["rejeitada"],
  );
  verificar("busca full-text encontra pelo título", busca.length === 1);

  const { rows: buscaSolucao } = await db.query(
    `select numero from atendimentos where busca @@ plainto_tsquery('portuguese', $1)`,
    ["numeração"],
  );
  verificar("busca full-text indexa a solução gravada", buscaSolucao.length === 1);

  // ── Pendências ──
  await deveRejeitar(
    db,
    "recusa pendência sem atendimento nem cliente",
    `insert into pendencias (org_id, titulo) values ('${orgId}', 'Solta')`,
    "pendencias_tem_origem",
  );

  await deveRejeitar(
    db,
    "recusa responsável terceiro sem nome",
    `insert into pendencias (org_id, cliente_id, titulo, responsavel_tipo)
     values ('${orgId}', '${clienteId}', 'Aguardando contador', 'terceiro')`,
    "pendencias_terceiro_identificado",
  );

  await db.exec(
    `insert into pendencias (org_id, atendimento_id, cliente_id, titulo, responsavel_tipo, prazo)
     values ('${orgId}', '${atendimentoId}', '${clienteId}', 'Cliente enviar XML', 'cliente', now() + interval '2 days')`,
  );

  // ── Agenda ──
  await deveRejeitar(
    db,
    "recusa evento terminando antes de começar",
    `insert into agenda_eventos (org_id, titulo, inicio, fim)
     values ('${orgId}', 'Retorno', now(), now() - interval '1 hour')`,
    "eventos_intervalo_valido",
  );

  // ── Auditoria ──
  const { rows: auditoria } = await db.query(
    `select tabela, acao, campos_alterados from audit_logs order by id`,
  );
  verificar(
    "auditoria registra a criação do cliente",
    auditoria.some((a) => a.tabela === "clientes" && a.acao === "INSERT"),
  );
  verificar(
    "auditoria registra a resolução do atendimento",
    auditoria.some(
      (a) => a.tabela === "atendimentos" && a.acao === "UPDATE" && a.campos_alterados?.includes("solucao"),
    ),
  );
  verificar(
    "auditoria não registra a timeline (evita duplicar o histórico)",
    !auditoria.some((a) => a.tabela === "atendimento_interacoes"),
  );

  // ── Equipe: papel e situação protegidos por trigger ──
  const tecnicoId = segundo[0].id;
  await db.exec(`update auth.sessao_teste set usuario = '${tecnicoId}'`);
  await deveRejeitar(
    db,
    "técnico não consegue se promover a owner",
    `update profiles set role = 'owner' where id = '${tecnicoId}'`,
    "Somente o owner",
  );
  await deveRejeitar(
    db,
    "técnico não consegue reativar/desativar usuários",
    `update profiles set ativo = false where id = '${userId}'`,
    "Somente o owner",
  );
  await db.exec(`update profiles set nome = 'Ajudante' where id = '${tecnicoId}'`);
  verificar("técnico ainda edita o próprio nome", true);

  await db.exec(`update auth.sessao_teste set usuario = '${userId}'`);
  await deveRejeitar(
    db,
    "não deixa a organização sem owner ativo",
    `update profiles set role = 'tecnico' where id = '${userId}'`,
    "ao menos um owner",
  );
  await deveRejeitar(
    db,
    "não permite trocar a organização de um usuário",
    `update profiles set org_id = gen_random_uuid() where id = '${tecnicoId}'`,
    "não pode ser alterada",
  );
  await db.exec(`update profiles set role = 'visualizador' where id = '${tecnicoId}'`);
  const { rows: promovido } = await db.query(`select role from profiles where id = $1`, [tecnicoId]);
  verificar("owner altera o papel de outro usuário", promovido[0].role === "visualizador");

  // ── Integridade referencial ──
  await deveRejeitar(
    db,
    "impede apagar cliente com atendimento",
    `delete from clientes where id = '${clienteId}'`,
    "atendimentos_cliente_id_fkey",
  );

  const { rows: antesCascata } = await db.query(
    `select count(*)::int as total from atendimento_interacoes`,
  );
  await db.exec(`delete from atendimentos where id = '${atendimentoId}'`);
  const { rows: depoisCascata } = await db.query(
    `select count(*)::int as total from atendimento_interacoes`,
  );
  verificar(
    "timeline é apagada junto com o atendimento",
    antesCascata[0].total > 0 && depoisCascata[0].total === 0,
    `antes ${antesCascata[0].total}, depois ${depoisCascata[0].total}`,
  );

  const { rows: pendSobrevive } = await db.query(
    `select atendimento_id from pendencias where titulo = 'Cliente enviar XML'`,
  );
  verificar(
    "pendência sobrevive ao atendimento apagado",
    pendSobrevive.length === 1 && pendSobrevive[0].atendimento_id === null,
  );

  await db.close();

  console.log(`\n${passou} verificações passaram, ${falhas.length} falharam`);
  if (falhas.length > 0) process.exit(1);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
