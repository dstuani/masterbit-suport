import { exigirPermissaoDeEscrita } from "@/lib/auth";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import { STATUS_EM_ABERTO, type Prioridade, type StatusAtendimento } from "@/lib/constants";
import type { Database, Tabelas } from "@/lib/types/database";
import type {
  DadosAtendimento,
  DadosConclusao,
  DadosInteracao,
  DadosMudancaStatus,
} from "@/lib/schemas/atendimentos";

export type Atendimento = Tabelas<"atendimentos">;
export type Interacao = Tabelas<"atendimento_interacoes">;
export type AtendimentoNaLista = Database["public"]["Views"]["atendimentos_lista"]["Row"];

export const POR_PAGINA = 25;

export type FiltrosAtendimentos = {
  busca?: string;
  status?: StatusAtendimento | "abertos" | "aguardando";
  prioridade?: string;
  clienteId?: string;
  categoriaId?: string;
  responsavelId?: string;
  pagina?: number;
};

/**
 * Lista paginada no servidor.
 *
 * Lê da view `atendimentos_lista`, que já resolve os nomes de cliente, categoria
 * e responsável — sem ela seriam quatro embeds por linha. A view usa
 * security_invoker, então o RLS continua valendo.
 */
export async function listarAtendimentos(filtros: FiltrosAtendimentos = {}) {
  const supabase = await criarClienteServidor();
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const inicio = (pagina - 1) * POR_PAGINA;
  const termo = filtros.busca?.trim() ?? "";

  // A view atendimentos_lista não traz descrição, solução nem o histórico — só
  // título e números. Para a busca alcançar isso, primeiro levanta os IDs que
  // batem no full-text da tabela base (título + descrição + solução) e no texto
  // das interações da timeline (onde entram números de requisito, protocolo etc.
  // que não aparecem em campo nenhum do atendimento), e depois junta os dois
  // conjuntos ao ilike de título/número/cliente na consulta da view.
  // Termos curtos (< 3 letras) ficam só no ilike: websearch_to_tsquery os rejeita.
  let idsDoConteudo: string[] = [];
  if (termo.length >= 3) {
    const [conteudo, historico] = await Promise.all([
      supabase
        .from("atendimentos")
        .select("id")
        .textSearch("busca", termo, { config: "portuguese", type: "websearch" }),
      supabase
        .from("atendimento_interacoes")
        .select("atendimento_id")
        .ilike("conteudo", `%${termo}%`),
    ]);
    if (conteudo.error) throw new Error(conteudo.error.message);
    if (historico.error) throw new Error(historico.error.message);

    idsDoConteudo = [
      ...new Set([
        ...conteudo.data.map((r) => r.id),
        ...historico.data.map((r) => r.atendimento_id),
      ]),
    ];
  }

  let query = supabase
    .from("atendimentos_lista")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(inicio, inicio + POR_PAGINA - 1);

  if (filtros.status === "abertos") {
    query = query.in("status", STATUS_EM_ABERTO);
  } else if (filtros.status === "aguardando") {
    // Grupo, não status: o card do dashboard conta cliente + terceiro juntos, e
    // o filtro precisa devolver exatamente o mesmo conjunto.
    query = query.in("status", ["aguardando_cliente", "aguardando_terceiro"]);
  } else if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  if (filtros.prioridade) {
    query = query.eq("prioridade", filtros.prioridade as Prioridade);
  }
  if (filtros.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  if (filtros.categoriaId) query = query.eq("categoria_id", filtros.categoriaId);
  if (filtros.responsavelId) query = query.eq("responsavel_id", filtros.responsavelId);

  if (termo.length > 0) {
    const like = `%${termo}%`;
    const condicoes = [`titulo.ilike.${like}`, `numero.ilike.${like}`, `cliente_nome.ilike.${like}`];
    if (idsDoConteudo.length > 0) {
      condicoes.push(`id.in.(${idsDoConteudo.join(",")})`);
    }
    query = query.or(condicoes.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    itens: data ?? [],
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

export async function obterAtendimento(id: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("atendimentos")
    .select(
      "*, clientes(id, razao_social, nome_fantasia), filiais(nome), cliente_contatos(nome, telefone, email), sistemas(nome), categorias(nome, cor), subcategorias(nome), profiles!atendimentos_responsavel_id_fkey(nome)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listarInteracoes(atendimentoId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("atendimento_interacoes")
    .select("*, profiles(nome)")
    .eq("atendimento_id", atendimentoId)
    .order("ocorrido_em", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Cria o atendimento. A interação de abertura é inserida por trigger no banco,
 * não aqui — assim ela existe mesmo se a escrita vier por outro caminho.
 */
export async function criarAtendimento(dados: DadosAtendimento) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("atendimentos")
    .insert({
      ...dados,
      org_id: perfil.org_id,
      created_by: perfil.id,
      updated_by: perfil.id,
      responsavel_id: dados.responsavel_id ?? perfil.id,
    })
    .select("id, numero")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function atualizarAtendimento(id: string, dados: Partial<DadosAtendimento>) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("atendimentos")
    .update({ ...dados, updated_by: perfil.id })
    .eq("id", id);

  if (error) throw new Error(traduzirErro(error.message));
}

/** Registra uma nota, ligação, acesso remoto — o que efetivamente foi feito. */
export async function registrarInteracao(dados: DadosInteracao) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("atendimento_interacoes").insert({
    org_id: perfil.org_id,
    atendimento_id: dados.atendimento_id,
    autor_id: perfil.id,
    tipo: dados.tipo,
    conteudo: dados.conteudo,
    tempo_gasto_minutos: dados.tempo_gasto_minutos ?? 0,
  });

  if (error) throw new Error(traduzirErro(error.message));

  // A primeira interação de trabalho tira o atendimento de "aberto": ele deixou
  // de ser uma caixa de entrada e virou trabalho em andamento.
  const { data: atual } = await supabase
    .from("atendimentos")
    .select("status")
    .eq("id", dados.atendimento_id)
    .single();

  if (atual?.status === "aberto") {
    await supabase
      .from("atendimentos")
      .update({ status: "em_andamento", updated_by: perfil.id })
      .eq("id", dados.atendimento_id);
  }
}

/**
 * Muda o status. A interação de mudança é gravada por trigger.
 *
 * Os estados de espera exigem dizer o que se espera — é essa frase que permite
 * cobrar depois, em vez de reabrir o atendimento tentando lembrar.
 */
export async function mudarStatus(dados: DadosMudancaStatus) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const esperando =
    dados.status === "aguardando_cliente" || dados.status === "aguardando_terceiro";

  const { error } = await supabase
    .from("atendimentos")
    .update({
      status: dados.status,
      aguardando_o_que: esperando ? dados.aguardando_o_que : null,
      updated_by: perfil.id,
    })
    .eq("id", dados.atendimento_id);

  if (error) throw new Error(traduzirErro(error.message));

  if (dados.observacao && dados.observacao.trim().length > 0) {
    await registrarInteracao({
      atendimento_id: dados.atendimento_id,
      tipo: "nota",
      conteudo: dados.observacao,
      tempo_gasto_minutos: 0,
    });
  }
}

/**
 * Conclui o atendimento.
 *
 * A solução é obrigatória aqui e no banco (constraint
 * atendimentos_resolvido_tem_solucao). É o que transforma o atendimento em
 * memória consultável em vez de um registro de que "algo aconteceu".
 */
export async function concluirAtendimento(dados: DadosConclusao) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("atendimentos")
    .update({
      status: "resolvido",
      solucao: dados.solucao,
      causa_raiz: dados.causa_raiz,
      faturavel: dados.faturavel,
      aguardando_o_que: null,
      updated_by: perfil.id,
    })
    .eq("id", dados.atendimento_id);

  if (error) throw new Error(traduzirErro(error.message));

  if (dados.tempo_gasto_minutos && dados.tempo_gasto_minutos > 0) {
    await registrarInteracao({
      atendimento_id: dados.atendimento_id,
      tipo: "nota",
      conteudo: `Fechamento: ${dados.solucao}`,
      tempo_gasto_minutos: dados.tempo_gasto_minutos,
    });
  }
}

/** Pendências abertas ligadas ao atendimento, mostradas na lateral do detalhe. */
export async function listarPendenciasDoAtendimento(atendimentoId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("pendencias")
    .select("*")
    .eq("atendimento_id", atendimentoId)
    .order("prazo", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Dados de apoio dos formulários, carregados em paralelo. */
export async function opcoesDeFormulario() {
  const supabase = await criarClienteServidor();

  const [clientes, categorias, subcategorias, sistemas] = await Promise.all([
    supabase.from("clientes").select("id, razao_social").eq("status", "ativo").order("razao_social"),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("subcategorias").select("id, nome, categoria_id").eq("ativo", true).order("ordem"),
    supabase.from("sistemas").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return {
    clientes: clientes.data ?? [],
    categorias: categorias.data ?? [],
    subcategorias: subcategorias.data ?? [],
    sistemas: sistemas.data ?? [],
  };
}

/** Filiais, contatos e sistemas de um cliente, para os selects dependentes. */
export async function contextoDoCliente(clienteId: string) {
  const supabase = await criarClienteServidor();

  const [filiais, contatos, sistemas] = await Promise.all([
    supabase.from("filiais").select("id, nome").eq("cliente_id", clienteId).eq("ativo", true),
    supabase
      .from("cliente_contatos")
      .select("id, nome")
      .eq("cliente_id", clienteId)
      .eq("ativo", true),
    supabase
      .from("clientes_sistemas")
      .select("sistema_id, sistemas(nome)")
      .eq("cliente_id", clienteId)
      .eq("ativo", true),
  ]);

  return {
    filiais: filiais.data ?? [],
    contatos: contatos.data ?? [],
    sistemas: (sistemas.data ?? [])
      .map((item) => ({ id: item.sistema_id, nome: item.sistemas?.nome ?? "" }))
      .filter((item) => item.nome.length > 0),
  };
}
