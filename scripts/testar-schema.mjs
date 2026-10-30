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
  const { rows: perfis } = await db.query(`select p.id, p.role, p.ativo, p.org_id, o.nome as org
                                             from profiles p join organizacoes o on o.id = p.org_id`);
  verificar("cadastro cria profile automaticamente", perfis.length === 1);
  verificar("primeiro usuário vira owner", perfis[0]?.role === "owner");
  verificar("primeiro usuário já nasce ativo", perfis[0]?.ativo === true);
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
  const { rows: perfil2 } = await db.query(`select role, ativo, org_id from profiles where id = $1`, [
    segundo[0].id,
  ]);
  verificar("segundo usuário entra como tecnico", perfil2[0]?.role === "tecnico");
  verificar("segundo usuário fica na mesma organização", perfil2[0]?.org_id === orgId);
  verificar(
    "segundo usuário nasce desativado (autocadastro não ganha acesso)",
    perfil2[0]?.ativo === false,
  );

  // O owner ativa — é o que a tela Equipe faz ao criar ou ao clicar em Ativar.
  await db.exec(`update profiles set ativo = true where id = '${segundo[0].id}'`);
  const { rows: ativado } = await db.query(`select ativo from profiles where id = $1`, [segundo[0].id]);
  verificar("owner ativa o usuário novo", ativado[0]?.ativo === true);

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
    "mudança do meio (aguardando) não ganha linha na timeline",
    mudanca.length === 0,
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
  const { rows: fim } = await db.query(
    `select status_anterior, status_novo from atendimento_interacoes
      where atendimento_id = $1 and tipo = 'mudanca_status' order by created_at`,
    [atendimentoId],
  );
  verificar(
    "o fim (resolvido) ganha a linha de status",
    fim.length === 1 && fim[0].status_anterior === "aguardando_cliente" && fim[0].status_novo === "resolvido",
    `veio ${JSON.stringify(fim)}`,
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

  // ── Casos parecidos ──
  const { rows: parecidos } = await db.query(
    `select numero, solucao, cliente_nome, relevancia from buscar_atendimentos_parecidos($1, $2, 5)`,
    ["rejeitada or numeração or 539", clienteId],
  );
  verificar(
    "casos parecidos acha o resolvido pelo relato e devolve a solução",
    parecidos.length === 1 && parecidos[0].solucao.includes("Reemitida") && parecidos[0].relevancia > 0,
    JSON.stringify(parecidos),
  );

  const { rows: semParecido } = await db.query(
    `select numero from buscar_atendimentos_parecidos($1, null, 5)`,
    ["impressora or toner"],
  );
  verificar("casos parecidos não devolve o que não tem relação", semParecido.length === 0);

  const { rows: consultaVazia } = await db.query(
    `select numero from buscar_atendimentos_parecidos('', null, 5)`,
  );
  verificar("casos parecidos com consulta vazia não devolve nada", consultaVazia.length === 0);

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

  // ── Consultoria: tópicos, comentários e anexos ──
  const { rows: proj } = await db.query(
    `insert into consultoria_projetos (org_id, nome) values ('${orgId}', 'Consultoria Teste') returning id`,
  );
  const projetoId = proj[0].id;

  const { rows: top } = await db.query(
    `insert into consultoria_topicos (org_id, projeto_id, codigo, titulo, descricao)
     values ('${orgId}', '${projetoId}', '1.1', 'Tópico de teste', 'Descrição')
     returning id`,
  );
  const topicoId = top[0].id;

  await db.exec(
    `insert into consultoria_comentarios (org_id, topico_id, autor_id, conteudo)
     values ('${orgId}', '${topicoId}', '${userId}', 'Primeiro comentário')`,
  );
  verificar("comentário de consultoria é aceito", true);

  await db.exec(`update consultoria_topicos set status = 'em_andamento' where id = '${topicoId}'`);
  const { rows: auditoriaTopico } = await db.query(
    `select campos_alterados from audit_logs where tabela = 'consultoria_topicos' and acao = 'UPDATE'`,
  );
  verificar(
    "auditoria registra mudança de status do tópico de consultoria",
    auditoriaTopico.some((a) => a.campos_alterados?.includes("status")),
  );

  await db.exec(`update consultoria_topicos set progresso = 40 where id = '${topicoId}'`);
  const { rows: comProgresso } = await db.query(
    `select progresso from consultoria_topicos where id = $1`,
    [topicoId],
  );
  verificar("progresso do tópico de consultoria é gravado", comProgresso[0].progresso === 40);

  await deveRejeitar(
    db,
    "recusa progresso acima de 100%",
    `update consultoria_topicos set progresso = 101 where id = '${topicoId}'`,
    "consultoria_topicos_progresso_valido",
  );
  await deveRejeitar(
    db,
    "recusa progresso negativo",
    `update consultoria_topicos set progresso = -1 where id = '${topicoId}'`,
    "consultoria_topicos_progresso_valido",
  );

  const caminhoAnexoConsultoria =`${orgId}/consultoria/${topicoId}/${crypto.randomUUID()}.png`;
  await db.exec(
    `insert into consultoria_anexos (org_id, topico_id, caminho, nome_original, tipo_mime, tamanho_bytes, enviado_por)
     values ('${orgId}', '${topicoId}', '${caminhoAnexoConsultoria}', 'evidencia.png', 'image/png', 2048, '${userId}')`,
  );
  verificar("anexo de consultoria válido é aceito", true);

  await deveRejeitar(
    db,
    "recusa anexo de consultoria com caminho fora da organização",
    `insert into consultoria_anexos (org_id, topico_id, caminho, nome_original, tipo_mime, tamanho_bytes)
     values ('${orgId}', '${topicoId}', '${crypto.randomUUID()}/consultoria/${topicoId}/x.png', 'x.png', 'image/png', 10)`,
    "consultoria_anexos_caminho_da_org",
  );

  await deveRejeitar(
    db,
    "não deixa trocar o caminho de um anexo de consultoria",
    `update consultoria_anexos set caminho = '${orgId}/consultoria/${topicoId}/${crypto.randomUUID()}.png'
      where caminho = '${caminhoAnexoConsultoria}'`,
    "apenas removido",
  );

  await db.exec(
    `update consultoria_anexos set removido_em = now() where caminho = '${caminhoAnexoConsultoria}'`,
  );
  verificar("anexo de consultoria pode ser marcado como removido", true);

  await deveRejeitar(
    db,
    "não deixa restaurar um anexo de consultoria removido",
    `update consultoria_anexos set removido_em = null where caminho = '${caminhoAnexoConsultoria}'`,
    "não pode ser restaurado",
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

  // ── Usuário desativado perde o acesso no banco ──
  // As policies dependem de org_atual()/papel_atual()/pode_escrever(); testá-las
  // cobre todas as tabelas (os testes rodam como superusuário, que ignora o RLS).
  await db.exec(`update profiles set role = 'tecnico', ativo = false where id = '${tecnicoId}'`);
  await db.exec(`update auth.sessao_teste set usuario = '${tecnicoId}'`);
  const { rows: inativo } = await db.query(
    `select org_atual() as org, papel_atual() as papel, pode_escrever() as escreve`,
  );
  verificar(
    "usuário desativado não tem organização, papel nem escrita",
    inativo[0].org === null && inativo[0].papel === null && inativo[0].escreve === false,
    JSON.stringify(inativo[0]),
  );

  await db.exec(`update auth.sessao_teste set usuario = '${userId}'`);
  await db.exec(`update profiles set ativo = true where id = '${tecnicoId}'`);
  await db.exec(`update auth.sessao_teste set usuario = '${tecnicoId}'`);
  const { rows: reativado } = await db.query(
    `select org_atual() as org, papel_atual() as papel, pode_escrever() as escreve`,
  );
  verificar(
    "usuário reativado recupera o acesso",
    reativado[0].org === orgId && reativado[0].papel === "tecnico" && reativado[0].escreve === true,
    JSON.stringify(reativado[0]),
  );
  await db.exec(`update auth.sessao_teste set usuario = '${userId}'`);

  // ── Papéis restritos: solicitante e agenda ──
  // Aqui o RLS é testado de verdade: as consultas rodam com um papel sem
  // superusuário (SET ROLE), então as policies valem como no Supabase.
  const { rows: outroCli } = await db.query(
    `insert into clientes (org_id, razao_social) values ($1, 'Mercado Sol') returning id`,
    [orgId],
  );
  const outroClienteId = outroCli[0].id;
  const { rows: atendOutro } = await db.query(
    `insert into atendimentos (org_id, cliente_id, titulo, created_by)
     values ($1, $2, 'DO OWNER', $3) returning id`,
    [orgId, clienteId, userId],
  );

  const { rows: novoSol } = await db.query(
    `insert into auth.users (email) values ('funcionario@padaria.com.br') returning id`,
  );
  const solId = novoSol[0].id;
  await deveRejeitar(
    db,
    "solicitante precisa ter um cliente",
    `update profiles set role = 'solicitante', ativo = true where id = '${solId}'`,
    "profiles_solicitante_tem_cliente",
  );
  await db.exec(
    `update profiles set role = 'solicitante', cliente_id = '${clienteId}', ativo = true where id = '${solId}'`,
  );

  const { rows: novoAg } = await db.query(
    `insert into auth.users (email) values ('secretaria@exemplo.com.br') returning id`,
  );
  const agId = novoAg[0].id;
  await db.exec(`update profiles set role = 'agenda', ativo = true where id = '${agId}'`);

  await db.exec(`update auth.sessao_teste set usuario = '${solId}'`);
  const { rows: idSol } = await db.query(
    `select org_atual() as org, org_restrita() as restrita, cliente_do_solicitante() as cliente,
            pode_escrever() as escreve`,
  );
  verificar(
    "solicitante fica fora das policies gerais e preso ao cliente dele",
    idSol[0].org === null && idSol[0].restrita === orgId && idSol[0].cliente === clienteId &&
      idSol[0].escreve === false,
    JSON.stringify(idSol[0]),
  );
  await deveRejeitar(
    db,
    "solicitante não troca o próprio cliente",
    `update profiles set cliente_id = '${outroClienteId}' where id = '${solId}'`,
    "Somente o owner",
  );

  // Papel sem superusuário para o RLS valer. Fica dono de nada: só recebe acesso.
  await db.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'usuario_app') then
        create role usuario_app nologin;
      end if;
    end $$;
    grant usage on schema public, auth to usuario_app;
    grant select, insert, update, delete on all tables in schema public to usuario_app;
    grant select on all tables in schema auth to usuario_app;
    grant usage on all sequences in schema public to usuario_app;
  `);
  const comoUsuario = async (usuario, sql, params = []) => {
    await db.exec(`update auth.sessao_teste set usuario = '${usuario}'`);
    await db.exec("set role usuario_app");
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec("reset role");
    }
  };
  const rejeitaComo = async (usuario, nome, sql, trecho) => {
    await db.exec(`update auth.sessao_teste set usuario = '${usuario}'`);
    await db.exec("set role usuario_app");
    try {
      await db.exec(sql);
      verificar(nome, false, "o banco aceitou o que deveria recusar");
    } catch (erro) {
      verificar(nome, erro.message.includes(trecho), `mensagem inesperada: ${erro.message}`);
    } finally {
      await db.exec("reset role");
    }
  };

  const { rows: abertoSol } = await comoUsuario(
    solId,
    `insert into atendimentos (org_id, cliente_id, titulo, created_by, responsavel_id)
     values ($1, $2, 'IMPRESSORA PARADA', $3, null) returning id`,
    [orgId, clienteId, solId],
  );
  verificar("solicitante abre atendimento no cliente dele", abertoSol.length === 1);
  const atendSolId = abertoSol[0].id;

  await rejeitaComo(
    solId,
    "solicitante não abre atendimento para outro cliente",
    `insert into atendimentos (org_id, cliente_id, titulo, created_by)
     values ('${orgId}', '${outroClienteId}', 'OUTRO', '${solId}')`,
    "row-level security",
  );
  await rejeitaComo(
    solId,
    "solicitante não abre atendimento já atribuído a alguém",
    `insert into atendimentos (org_id, cliente_id, titulo, created_by, responsavel_id)
     values ('${orgId}', '${clienteId}', 'ATRIBUIDO', '${solId}', '${userId}')`,
    "row-level security",
  );

  const { rows: vistosSol } = await comoUsuario(solId, `select id from atendimentos`);
  verificar(
    "solicitante só enxerga os atendimentos que ele abriu",
    vistosSol.length === 1 && vistosSol[0].id === atendSolId,
    `viu ${vistosSol.length}`,
  );
  const { rows: listaSol } = await comoUsuario(solId, `select cliente_nome from atendimentos_lista`);
  verificar(
    "na lista do solicitante aparece o nome do cliente dele",
    listaSol.length === 1 && listaSol[0].cliente_nome === "Padaria Estrela Ltda",
  );
  const { rows: clientesSol } = await comoUsuario(solId, `select id from clientes`);
  verificar("solicitante enxerga só o próprio cliente", clientesSol.length === 1);
  const { rows: equipSol } = await comoUsuario(
    solId,
    `select (select count(*)::int from equipamentos) + (select count(*)::int from solicitacoes)
          + (select count(*)::int from pendencias) + (select count(*)::int from agenda_eventos) as total`,
  );
  verificar("solicitante não enxerga equipamentos, solicitações, pendências nem agenda", equipSol[0].total === 0);
  const { rows: perfisSol } = await comoUsuario(solId, `select id from profiles`);
  verificar("solicitante enxerga só o próprio perfil", perfisSol.length === 1 && perfisSol[0].id === solId);

  const { rows: timelineSol } = await comoUsuario(
    solId,
    `select tipo from atendimento_interacoes where atendimento_id = $1`,
    [atendSolId],
  );
  verificar("solicitante vê a timeline do atendimento dele", timelineSol.length === 1);
  await comoUsuario(
    solId,
    `insert into atendimento_interacoes (org_id, atendimento_id, autor_id, tipo, conteudo)
     values ($1, $2, $3, 'nota', 'Continua sem imprimir')`,
    [orgId, atendSolId, solId],
  );
  verificar("solicitante escreve mensagem no atendimento dele", true);
  await rejeitaComo(
    solId,
    "solicitante não lança tempo gasto",
    `insert into atendimento_interacoes (org_id, atendimento_id, autor_id, tipo, conteudo, tempo_gasto_minutos)
     values ('${orgId}', '${atendSolId}', '${solId}', 'nota', 'x', 30)`,
    "row-level security",
  );
  await rejeitaComo(
    solId,
    "solicitante não escreve em atendimento de outra pessoa",
    `insert into atendimento_interacoes (org_id, atendimento_id, autor_id, tipo, conteudo)
     values ('${orgId}', '${atendOutro[0].id}', '${solId}', 'nota', 'x')`,
    "row-level security",
  );
  const { rows: mudou } = await comoUsuario(
    solId,
    `update atendimentos set status = 'resolvido', solucao = 'x' where id = $1 returning id`,
    [atendSolId],
  );
  verificar("solicitante não muda a situação do atendimento", mudou.length === 0);

  // Agenda
  const { rows: idAg } = await comoUsuario(
    agId,
    `select org_atual() as org, org_restrita() as restrita, pode_escrever() as escreve`,
  );
  verificar(
    "usuário da agenda fica fora das policies gerais",
    idAg[0].org === null && idAg[0].restrita === orgId && idAg[0].escreve === false,
  );
  const { rows: eventoAg } = await comoUsuario(
    agId,
    `insert into agenda_eventos (org_id, titulo, inicio, cliente_id, created_by)
     values ($1, 'Visita na padaria', now() + interval '1 day', $2, $3) returning id`,
    [orgId, clienteId, agId],
  );
  verificar("usuário da agenda cria evento", eventoAg.length === 1);
  const eventoAgId = eventoAg[0].id;
  const { rows: vistosAg } = await comoUsuario(
    agId,
    `select (select count(*)::int from agenda_eventos) as eventos,
            (select count(*)::int from clientes) as clientes,
            (select count(*)::int from atendimentos) as atendimentos`,
  );
  verificar(
    "usuário da agenda vê eventos e clientes, mas nenhum atendimento",
    vistosAg[0].eventos >= 1 && vistosAg[0].clientes === 2 && vistosAg[0].atendimentos === 0,
    JSON.stringify(vistosAg[0]),
  );
  const { rows: cancelou } = await comoUsuario(
    agId,
    `update agenda_eventos set status = 'cancelado' where id = $1 returning id`,
    [eventoAgId],
  ).catch(() => ({ rows: [] }));
  verificar("usuário da agenda não cancela evento", cancelou.length === 0);
  const { rows: realizou } = await comoUsuario(
    agId,
    `update agenda_eventos set status = 'realizado' where id = $1 returning id`,
    [eventoAgId],
  ).catch(() => ({ rows: [] }));
  verificar("usuário da agenda não marca evento como realizado", realizou.length === 0);
  const { rows: apagou } = await comoUsuario(
    agId,
    `delete from agenda_eventos where id = $1 returning id`,
    [eventoAgId],
  );
  verificar("usuário da agenda não exclui evento", apagou.length === 0);
  const { rows: remarcou } = await comoUsuario(
    agId,
    `update agenda_eventos set status = 'remarcado' where id = $1 returning id`,
    [eventoAgId],
  );
  verificar("usuário da agenda remarca evento", remarcou.length === 1);

  // ── Editar e excluir anotações (owner e técnico) ──
  const { rows: tempoAntes } = await comoUsuario(userId, `select tempo_gasto_minutos as t from atendimentos where id = $1`, [atendSolId]);
  const { rows: notaDono } = await comoUsuario(
    userId,
    `insert into atendimento_interacoes (org_id, atendimento_id, autor_id, tipo, conteudo, tempo_gasto_minutos)
     values ($1, $2, $3, 'nota', 'Texto errado', 20) returning id`,
    [orgId, atendSolId, userId],
  );
  const notaId = notaDono[0].id;
  const { rows: tempoComNota } = await comoUsuario(userId, `select tempo_gasto_minutos as t from atendimentos where id = $1`, [atendSolId]);
  verificar("a nota soma o tempo no atendimento", tempoComNota[0].t === tempoAntes[0].t + 20);

  const { rows: editou } = await comoUsuario(
    userId,
    `update atendimento_interacoes set conteudo = 'Texto certo', tempo_gasto_minutos = 30
      where id = $1 returning editado_em`,
    [notaId],
  );
  verificar("owner edita o texto e o tempo da anotação, que fica marcada como editada", editou.length === 1 && editou[0].editado_em !== null);
  const { rows: tempoEditado } = await comoUsuario(userId, `select tempo_gasto_minutos as t from atendimentos where id = $1`, [atendSolId]);
  verificar("corrigir o tempo ajusta o total do atendimento", tempoEditado[0].t === tempoAntes[0].t + 30);
  await rejeitaComo(
    userId,
    "não dá para trocar o autor de uma anotação",
    `update atendimento_interacoes set autor_id = '${solId}' where id = '${notaId}'`,
    "só o texto e o tempo",
  );
  await rejeitaComo(
    userId,
    "não dá para mudar a data de uma anotação",
    `update atendimento_interacoes set ocorrido_em = now() - interval '1 day' where id = '${notaId}'`,
    "só o texto e o tempo",
  );
  const { rows: sistemaEditado } = await comoUsuario(
    userId,
    `update atendimento_interacoes set conteudo = 'adulterado'
      where atendimento_id = $1 and tipo = 'sistema' returning id`,
    [atendOutro[0].id],
  );
  verificar("linha do sistema não é editável", sistemaEditado.length === 0);
  const { rows: solEdita } = await comoUsuario(
    solId,
    `update atendimento_interacoes set conteudo = 'mexi' where id = $1 returning id`,
    [notaId],
  );
  verificar("solicitante não edita anotações", solEdita.length === 0);

  await comoUsuario(userId, `update atendimento_interacoes set removido_em = now() where id = $1`, [notaId]);
  const { rows: tempoExcluido } = await comoUsuario(userId, `select tempo_gasto_minutos as t from atendimentos where id = $1`, [atendSolId]);
  verificar("excluir a anotação tira o tempo dela do total", tempoExcluido[0].t === tempoAntes[0].t);
  const { rows: voltou } = await comoUsuario(
    userId,
    `update atendimento_interacoes set removido_em = null where id = $1 returning id`,
    [notaId],
  );
  verificar("anotação excluída não volta", voltou.length === 0);
  const { rows: soVeAtivas } = await comoUsuario(
    solId,
    `select id from atendimento_interacoes where id = $1`,
    [notaId],
  );
  verificar("o solicitante não enxerga anotação excluída", soVeAtivas.length === 0);

  await db.exec(`update auth.sessao_teste set usuario = '${userId}'`);
  // ── Base de conhecimento ──
  await comoUsuario(
    userId,
    `insert into conhecimentos (org_id, titulo, descricao, comando)
     values ($1, 'Estoque negativo', 'Lista produtos com saldo menor que zero', 'select * from estoque where saldo < 0')`,
    [orgId],
  );
  const { rows: conhTec } = await comoUsuario(userId, `select id from conhecimentos`);
  verificar("técnico grava e lê comando da base de conhecimento", conhTec.length === 1);
  const { rows: conhRestritos } = await comoUsuario(solId, `select id from conhecimentos`);
  const { rows: conhAgenda } = await comoUsuario(agId, `select id from conhecimentos`);
  verificar("solicitante e agenda não enxergam a base de conhecimento", conhRestritos.length === 0 && conhAgenda.length === 0);
  await rejeitaComo(
    solId,
    "solicitante não grava na base de conhecimento",
    `insert into conhecimentos (org_id, titulo, descricao, comando) values ('${orgId}', 'x', 'y', 'select 1')`,
    "row-level security",
  );
  await deveRejeitar(
    db,
    "comando em branco é recusado",
    `insert into conhecimentos (org_id, titulo, descricao, comando) values ('${orgId}', 'x', 'y', '   ')`,
    "conhecimentos_comando_valido",
  );
  await comoUsuario(
    userId,
    `insert into conhecimentos (org_id, titulo, comando) values ($1, 'Sem descrição', 'select 1')`,
    [orgId],
  );
  const { rows: semDescricao } = await db.query(`select descricao from conhecimentos where titulo = 'Sem descrição'`);
  verificar("comando sem descrição é aceito", semDescricao.length === 1 && semDescricao[0].descricao === null);
  await deveRejeitar(
    db,
    "sessão desconhecida é recusada",
    `insert into conhecimentos (org_id, tipo, titulo, descricao, comando) values ('${orgId}', 'outra', 'x', 'y', 'select 1')`,
    "conhecimentos_tipo_valido",
  );
  await comoUsuario(userId, `delete from conhecimentos`);
  const { rows: conhApagado } = await db.query(`select count(*)::int as n from conhecimentos`);
  verificar("excluir apaga o comando de vez", conhApagado[0].n === 0);

  // Os dois saem de cena para não mexer nas contagens dos testes seguintes.
  await db.exec(`update profiles set ativo = false where id in ('${solId}', '${agId}')`);

  // ── Anexos ──
  const { rows: alvo } = await db.query(`select id from atendimentos limit 1`);
  const alvoId = alvo[0].id;
  const caminhoOk = `${orgId}/${alvoId}/${crypto.randomUUID()}.png`;
  await db.exec(
    `insert into atendimento_anexos (org_id, atendimento_id, caminho, nome_original, tipo_mime, tamanho_bytes, enviado_por)
     values ('${orgId}', '${alvoId}', '${caminhoOk}', 'print.png', 'image/png', 2048, '${userId}')`,
  );
  verificar("anexo válido é aceito", true);

  await deveRejeitar(
    db,
    "recusa anexo maior que 10 MB",
    `insert into atendimento_anexos (org_id, atendimento_id, caminho, nome_original, tipo_mime, tamanho_bytes)
     values ('${orgId}', '${alvoId}', '${orgId}/${alvoId}/${crypto.randomUUID()}.zip', 'grande.zip', 'application/zip', 10485761)`,
    "anexos_tamanho_valido",
  );
  await deveRejeitar(
    db,
    "recusa caminho que não começa pela organização",
    `insert into atendimento_anexos (org_id, atendimento_id, caminho, nome_original, tipo_mime, tamanho_bytes)
     values ('${orgId}', '${alvoId}', '${crypto.randomUUID()}/${alvoId}/x.png', 'x.png', 'image/png', 10)`,
    "anexos_caminho_da_org",
  );
  await deveRejeitar(
    db,
    "não deixa trocar o caminho de um anexo",
    `update atendimento_anexos set caminho = '${orgId}/${alvoId}/${crypto.randomUUID()}.png' where caminho = '${caminhoOk}'`,
    "apenas removido",
  );
  await db.exec(`update atendimento_anexos set removido_em = now() where caminho = '${caminhoOk}'`);
  verificar("anexo pode ser marcado como removido", true);
  await deveRejeitar(
    db,
    "não deixa restaurar um anexo removido",
    `update atendimento_anexos set removido_em = null where caminho = '${caminhoOk}'`,
    "não pode ser restaurado",
  );

  // ── Integridade referencial ──
  await deveRejeitar(
    db,
    "impede apagar cliente com atendimento",
    `delete from clientes where id = '${clienteId}'`,
    "atendimentos_cliente_id_fkey",
  );

  const { rows: antesCascata } = await db.query(
    `select count(*)::int as total from atendimento_interacoes where atendimento_id = '${atendimentoId}'`,
  );
  await db.exec(`delete from atendimentos where id = '${atendimentoId}'`);
  const { rows: depoisCascata } = await db.query(
    `select count(*)::int as total from atendimento_interacoes where atendimento_id = '${atendimentoId}'`,
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

  // ── Solicitações: porta pública do formulário da landing ──
  const chamar = (nome, email = "ana@empresa.com.br", extra = "null") =>
    db.exec(
      `select registrar_solicitacao('${nome}', 'Empresa', '${email}', '11 99999-0000',
                                    'Impressora parou', 'A impressora fiscal não imprime desde cedo.', ${extra})`,
    );

  await chamar("Ana Souza");
  const { rows: sol } = await db.query(
    `select org_id, status, email from solicitacoes where nome = 'Ana Souza'`,
  );
  verificar(
    "formulário público grava solicitação nova na organização",
    sol.length === 1 && sol[0].status === "nova" && sol[0].org_id === orgId,
  );

  await chamar("Robô Spam", "robo@spam.com", "'http://spam.example'");
  const { rows: robo } = await db.query(`select 1 from solicitacoes where nome = 'Robô Spam'`);
  verificar("campo-armadilha preenchido não grava nada", robo.length === 0);

  await deveRejeitar(
    db,
    "recusa e-mail inválido",
    `select registrar_solicitacao('Beto', null, 'sem-arroba', null, 'Assunto ok', 'Descrição com tamanho ok', null)`,
    "dados_invalidos",
  );
  await deveRejeitar(
    db,
    "recusa descrição curta demais",
    `select registrar_solicitacao('Beto', null, 'beto@x.com', null, 'Assunto ok', 'curta', null)`,
    "dados_invalidos",
  );

  await chamar("Ana Souza");
  await chamar("Ana Souza");
  await deveRejeitar(
    db,
    "freia o 4º envio do mesmo e-mail em uma hora",
    `select registrar_solicitacao('Ana Souza', null, 'ANA@empresa.com.br', null, 'Assunto ok', 'Descrição com tamanho ok', null)`,
    "limite_excedido",
  );

  await deveRejeitar(
    db,
    "conteúdo enviado pelo cliente não pode ser editado",
    `update solicitacoes set descricao = 'reescrita' where nome = 'Ana Souza'`,
    "não pode ser alterado",
  );

  await db.exec(`update solicitacoes set status = 'tratada' where id = (select id from solicitacoes limit 1)`);
  const { rows: tratada } = await db.query(
    `select tratada_por, tratada_em from solicitacoes where status = 'tratada'`,
  );
  verificar(
    "tratar registra quem e quando",
    tratada.length === 1 && tratada[0].tratada_por === userId && tratada[0].tratada_em !== null,
  );

  // ── Equipamentos: porta do agente de coleta ──
  const CHAVE = "mbk_teste_chave_de_coleta_123456";
  await db.exec(
    `insert into coleta_chaves (org_id, cliente_id, hash, prefixo)
     values ('${orgId}', '${clienteId}', encode(sha256(convert_to('${CHAVE}', 'UTF8')), 'hex'), 'mbk_test')`,
  );
  const coleta = (dados, chave = CHAVE) =>
    db.query(`select registrar_coleta($1, $2::jsonb) as r`, [chave, JSON.stringify(dados)]);
  const maquina = {
    identificador: "4c4c4544-0042-3510-8052-b4c04f4e3332",
    nome: "CAIXA-01",
    tipo: "notebook",
    processador: "Intel Core i5",
    memoria_mb: "8192",
    discos: [{ modelo: "SSD 240", tamanho_gb: 240 }],
  };

  const { rows: r1 } = await coleta(maquina);
  const { rows: eq1 } = await db.query(
    `select id, origem, coletas, tipo, memoria_mb, org_id from equipamentos where identificador = $1`,
    [maquina.identificador],
  );
  verificar(
    "coleta com chave válida cria o equipamento do cliente",
    r1[0].r === "ok" && eq1.length === 1 && eq1[0].origem === "agente" && eq1[0].coletas === 1 && eq1[0].org_id === orgId,
  );

  const { rows: r2 } = await coleta(maquina);
  const { rows: eq2 } = await db.query(`select coletas from equipamentos where id = $1`, [eq1[0].id]);
  verificar("coleta repetida em menos de 5 minutos é ignorada", r2[0].r === "ignorada" && eq2[0].coletas === 1);

  await db.exec(
    `update equipamentos set ultima_coleta_em = now() - interval '10 minutes', patrimonio = 'PAT-001', tipo = 'servidor'
     where id = '${eq1[0].id}'`,
  );
  await coleta({ ...maquina, memoria_mb: "16384", discos: "não é lista" });
  const { rows: eq3 } = await db.query(
    `select coletas, memoria_mb, patrimonio, tipo, discos from equipamentos where id = $1`,
    [eq1[0].id],
  );
  verificar(
    "nova coleta atualiza o hardware e preserva o que o técnico preencheu",
    eq3[0].coletas === 2 && eq3[0].memoria_mb === 16384 && eq3[0].patrimonio === "PAT-001" && eq3[0].tipo === "servidor",
  );
  verificar("lista malformada vira lista vazia", Array.isArray(eq3[0].discos) && eq3[0].discos.length === 0);

  const { rows: alt } = await db.query(
    `select componente, antes, depois from equipamento_alteracoes where equipamento_id = $1 order by componente`,
    [eq1[0].id],
  );
  verificar(
    "coleta detecta a troca de memória (8 GB para 16 GB)",
    alt.some((a) => a.componente === "memoria" && a.antes === "8192" && a.depois === "16384"),
    JSON.stringify(alt),
  );
  verificar(
    "disco não lido não conta como troca de disco",
    !alt.some((a) => a.componente === "disco"),
    JSON.stringify(alt),
  );

  await db.exec(`update equipamentos set ultima_coleta_em = now() - interval '10 minutes' where id = '${eq1[0].id}'`);
  await coleta({ ...maquina, memoria_mb: "16384", discos: [{ modelo: "SSD 480", tamanho_gb: 480 }] });
  // Agora a base (SSD 480) foi lida: trocar por um de 1 TB tem de aparecer.
  await db.exec(`update equipamentos set ultima_coleta_em = now() - interval '10 minutes' where id = '${eq1[0].id}'`);
  await coleta({ ...maquina, memoria_mb: "16384", discos: [{ modelo: "SSD 1TB", tamanho_gb: 1000 }] });
  const { rows: altDisco } = await db.query(
    `select antes, depois from equipamento_alteracoes where equipamento_id = $1 and componente = 'disco'`,
    [eq1[0].id],
  );
  verificar(
    "troca de disco entre duas coletas lidas é registrada",
    altDisco.length === 1 && altDisco[0].antes === "SSD 480 480 GB" && altDisco[0].depois === "SSD 1TB 1000 GB",
    JSON.stringify(altDisco),
  );

  await deveRejeitar(
    db,
    "troca de peça exige informar a peça",
    `insert into equipamento_manutencoes (org_id, equipamento_id, descricao, tipo)
     values ('${orgId}', '${eq1[0].id}', 'Troca sem dizer qual', 'troca_peca')`,
    "manutencoes_troca_tem_peca",
  );
  await db.exec(
    `insert into equipamento_manutencoes (org_id, equipamento_id, descricao, tipo, peca_retirada, peca_instalada, custo)
     values ('${orgId}', '${eq1[0].id}', 'Troca do SSD', 'troca_peca', 'SSD 240 GB', 'SSD 480 GB', 289.90)`,
  );
  const { rows: troca } = await db.query(`select custo from equipamento_manutencoes where tipo = 'troca_peca'`);
  verificar("troca de peça com peça e custo é aceita", troca.length === 1 && Number(troca[0].custo) === 289.9);

  await deveRejeitar(
    db,
    "recusa chave de coleta desconhecida",
    `select registrar_coleta('mbk_chave_que_nao_existe_000000', '{"identificador":"abcdefgh-1","nome":"X"}'::jsonb)`,
    "chave_invalida",
  );
  await deveRejeitar(
    db,
    "recusa coleta sem identificador da máquina",
    `select registrar_coleta('${CHAVE}', '{"nome":"SEM-ID"}'::jsonb)`,
    "dados_invalidos",
  );

  const { rows: usos } = await db.query(`select usos from coleta_chaves where prefixo = 'mbk_test'`);
  verificar("uso da chave é contado", usos[0].usos === 4, `veio ${usos[0].usos}`);

  await db.exec(`update coleta_chaves set revogada_em = now() where prefixo = 'mbk_test'`);
  await deveRejeitar(
    db,
    "chave revogada para de funcionar",
    `select registrar_coleta('${CHAVE}', '{"identificador":"outra-maquina-123","nome":"NOVA"}'::jsonb)`,
    "chave_invalida",
  );

  await db.close();

  console.log(`\n${passou} verificações passaram, ${falhas.length} falharam`);
  if (falhas.length > 0) process.exit(1);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
