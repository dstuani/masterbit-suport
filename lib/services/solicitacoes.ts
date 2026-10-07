import { exigirPerfil, exigirPermissaoDeEscrita } from "@/lib/auth";
import type { DadosMudarStatusSolicitacao } from "@/lib/schemas/solicitacoes";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

export type Solicitacao = Tabelas<"solicitacoes">;

export type FiltroSolicitacoes = "nova" | "tratada" | "descartada" | "todas";

/** Mais recentes primeiro; as novas aparecem sozinhas por padrão (a caixa de entrada). */
export async function listarSolicitacoes(filtro: FiltroSolicitacoes = "nova"): Promise<Solicitacao[]> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();

  let query = supabase
    .from("solicitacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtro !== "todas") query = query.eq("status", filtro);

  const { data, error } = await query;
  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

/** Para o selo do menu. Devolve 0 em vez de lançar: o layout não pode quebrar por isso. */
export async function contarSolicitacoesNovas(): Promise<number> {
  try {
    const supabase = await criarClienteServidor();
    const { count } = await supabase
      .from("solicitacoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "nova");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function mudarStatusSolicitacao(dados: DadosMudarStatusSolicitacao): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("solicitacoes").update({ status: dados.status }).eq("id", dados.id);
  if (error) throw new Error(traduzirErro(error.message));
}
