import { criarClienteServidor } from "@/lib/supabase/server";
import { traduzirErro } from "@/lib/services/erros";
import type { Database } from "@/lib/types/database";

export type ResultadoBusca = Database["public"]["Views"]["atendimentos_lista"]["Row"];

export type FiltrosConsulta = {
  busca?: string;
  clienteId?: string;
  contatoId?: string;
  status?: string;
  prioridade?: string;
  tipo?: string;
  categoriaId?: string;
  sistemaId?: string;
  de?: string;
  ate?: string;
};

export const POR_PAGINA_CONSULTA = 50;

/**
 * Busca em atendimentos combinando full-text e filtros.
 *
 * O campo `busca` (tsvector português) indexa título + descrição + solução.
 * Termos curtos (< 3 letras) usam ilike no título — websearch_to_tsquery
 * rejeita termos muito curtos.
 */
export async function buscarAtendimentos(
  filtros: FiltrosConsulta,
  pagina = 1,
): Promise<{ itens: ResultadoBusca[]; total: number; paginas: number }> {
  const supabase = await criarClienteServidor();
  const inicio = (pagina - 1) * POR_PAGINA_CONSULTA;

  // Pré-filtros que precisam ir à tabela base (não à view): full-text e contato.
  let idsRestricao: string[] | null = null;

  const precisaIdsBase = Boolean(
    (filtros.busca && filtros.busca.trim().length >= 3) || filtros.contatoId,
  );

  if (precisaIdsBase) {
    let q = supabase.from("atendimentos").select("id");

    if (filtros.busca && filtros.busca.trim().length >= 3) {
      q = q.textSearch("busca", filtros.busca.trim(), {
        config: "portuguese",
        type: "websearch",
      });
    }
    if (filtros.contatoId) {
      q = q.eq("contato_id", filtros.contatoId);
    }

    const { data, error } = await q;
    if (error) throw new Error(traduzirErro(error.message));
    idsRestricao = (data ?? []).map((r) => r.id);

    if (idsRestricao.length === 0) {
      return { itens: [], total: 0, paginas: 0 };
    }
  }

  // Consulta na view (resolve joins de nome).
  let query = supabase
    .from("atendimentos_lista")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(inicio, inicio + POR_PAGINA_CONSULTA - 1);

  if (idsRestricao !== null) {
    query = query.in("id", idsRestricao);
  } else if (filtros.busca && filtros.busca.trim().length > 0) {
    const like = `%${filtros.busca.trim()}%`;
    query = query.or(`titulo.ilike.${like},numero.ilike.${like},cliente_nome.ilike.${like}`);
  }

  if (filtros.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  if (filtros.status) query = query.eq("status", filtros.status as "agendado" | "cancelado" | "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "resolvido");
  if (filtros.prioridade) query = query.eq("prioridade", filtros.prioridade as "baixa" | "media" | "alta" | "urgente");
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo as "duvida" | "erro" | "treinamento" | "implantacao" | "melhoria" | "manutencao" | "consultoria");
  if (filtros.categoriaId) query = query.eq("categoria_id", filtros.categoriaId);
  if (filtros.sistemaId) query = query.eq("sistema_id", filtros.sistemaId);
  if (filtros.de) query = query.gte("created_at", filtros.de);
  if (filtros.ate) query = query.lte("created_at", `${filtros.ate}T23:59:59`);

  const { data, error, count } = await query;
  if (error) throw new Error(traduzirErro(error.message));

  const total = count ?? 0;
  return {
    itens: data ?? [],
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA_CONSULTA)),
  };
}

export async function opcoesDeConsulta() {
  const supabase = await criarClienteServidor();
  const [clientes, categorias, sistemas] = await Promise.all([
    supabase.from("clientes").select("id, razao_social").eq("status", "ativo").order("razao_social"),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("sistemas").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return {
    clientes: clientes.data ?? [],
    categorias: categorias.data ?? [],
    sistemas: sistemas.data ?? [],
  };
}
