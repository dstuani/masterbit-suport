import { exigirPerfil } from "@/lib/auth";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";

export type CasoParecido = {
  id: string;
  numero: string;
  titulo: string;
  solucao: string | null;
  causa_raiz: string | null;
  cliente_nome: string;
  sistema_nome: string | null;
  finalizado_em: string | null;
  mesmo_cliente: boolean;
};

const LIMITE_DE_TERMOS = 25;
const LIMITE_DE_RESULTADOS = 5;

/** Palavras comuns que casariam com quase todo atendimento e escondem o que importa. */
const PALAVRAS_COMUNS = new Set([
  "para", "como", "esta", "está", "estao", "estão", "esse", "essa", "isso", "isto", "mais",
  "muito", "quando", "onde", "porque", "pelo", "pela", "pelos", "pelas", "mesmo", "mesma",
  "sendo", "esta", "estar", "esta", "tem", "tinha", "ter", "fazer", "feito", "feita", "fica",
  "ficou", "esta", "cliente", "clientes", "sistema", "sistemas", "ainda", "todos", "todas",
  "nosso", "nossa", "deles", "delas", "dele", "dela", "outro", "outra", "aqui", "agora",
  "depois", "antes", "sobre", "entre", "desde", "conseguindo", "consegue", "conseguir",
  "precisa", "preciso", "problema", "duvida", "dúvida",
]);

/**
 * Transforma o relato em termos de busca: só letras e números (sem operadores que
 * quebrariam a consulta), sem palavras comuns. Números de 3+ dígitos ficam — o
 * código de um erro ("539") costuma ser o que mais identifica o problema.
 */
export function extrairTermos(titulo: string, descricao: string | null): string[] {
  const texto = `${titulo} ${descricao ?? ""}`.toLowerCase();
  const vistos = new Set<string>();

  for (const palavra of texto.split(/[^\p{L}\p{N}]+/u)) {
    const util =
      (palavra.length >= 4 && !PALAVRAS_COMUNS.has(palavra)) || /^\d{3,}$/.test(palavra);
    if (util) vistos.add(palavra);
    if (vistos.size >= LIMITE_DE_TERMOS) break;
  }

  return [...vistos];
}

type LinhaDaBusca = {
  id: string;
  numero: string;
  titulo: string;
  solucao: string | null;
  causa_raiz: string | null;
  cliente_id: string;
  cliente_nome: string;
  sistema_nome: string | null;
  finalizado_em: string | null;
};

export async function buscarCasosParecidos(entrada: {
  titulo: string;
  descricao: string | null;
  clienteId: string | null;
}): Promise<CasoParecido[]> {
  await exigirPerfil();

  const termos = extrairTermos(entrada.titulo, entrada.descricao);
  if (termos.length === 0) {
    throw new Error("Descreva o problema com um pouco mais de detalhe para buscar casos parecidos.");
  }

  const supabase = await criarClienteServidor();

  // Os tipos gerados ainda não descrevem funções do banco; o formato do retorno é
  // o da função buscar_atendimentos_parecidos (migration casos_parecidos).
  const chamar = supabase.rpc.bind(supabase) as unknown as (
    nome: string,
    argumentos: Record<string, unknown>,
  ) => Promise<{ data: LinhaDaBusca[] | null; error: { message: string } | null }>;

  const { data, error } = await chamar("buscar_atendimentos_parecidos", {
    p_consulta: termos.join(" or "),
    p_cliente_id: entrada.clienteId,
    p_limite: LIMITE_DE_RESULTADOS,
  });

  if (error) throw new Error(traduzirErro(error.message));

  return (data ?? []).map((linha) => ({
    id: linha.id,
    numero: linha.numero,
    titulo: linha.titulo,
    solucao: linha.solucao,
    causa_raiz: linha.causa_raiz,
    cliente_nome: linha.cliente_nome,
    sistema_nome: linha.sistema_nome,
    finalizado_em: linha.finalizado_em,
    mesmo_cliente: entrada.clienteId !== null && linha.cliente_id === entrada.clienteId,
  }));
}
