import { exigirPerfil, exigirPermissaoDeEscrita } from "@/lib/auth";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Inserir, Tabelas } from "@/lib/types/database";
import type {
  DadosConclusaoPendencia,
  DadosMudarStatusPendencia,
  DadosPendencia,
} from "@/lib/schemas/pendencias";

export type Pendencia = Tabelas<"pendencias">;

export type PendenciaComContexto = Pendencia & {
  clientes: { razao_social: string } | null;
  atendimentos: { titulo: string; numero: string } | null;
};

export type FiltrosPendencias = {
  status?: "aberta" | "em_andamento" | "abertas" | "concluida" | "cancelada";
  responsavel?: "eu" | "cliente" | "terceiro";
  prioridade?: string;
  clienteId?: string;
  atendimentoId?: string;
};

export async function listarPendencias(filtros: FiltrosPendencias = {}): Promise<PendenciaComContexto[]> {
  const supabase = await criarClienteServidor();

  let query = supabase
    .from("pendencias")
    .select("*, clientes(razao_social), atendimentos(titulo, numero)")
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("prioridade", { ascending: false })
    .order("created_at", { ascending: false });

  if (filtros.status === "abertas") {
    query = query.in("status", ["aberta", "em_andamento"]);
  } else if (filtros.status) {
    query = query.eq("status", filtros.status);
  } else {
    // Padrão: só as ativas
    query = query.in("status", ["aberta", "em_andamento"]);
  }

  if (filtros.responsavel) query = query.eq("responsavel_tipo", filtros.responsavel);
  if (filtros.prioridade) query = query.eq("prioridade", filtros.prioridade as "baixa" | "media" | "alta" | "urgente");
  if (filtros.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  if (filtros.atendimentoId) query = query.eq("atendimento_id", filtros.atendimentoId);

  const { data, error } = await query;
  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? []) as PendenciaComContexto[];
}

export async function obterPendencia(id: string): Promise<PendenciaComContexto | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("pendencias")
    .select("*, clientes(razao_social), atendimentos(titulo, numero)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? null) as PendenciaComContexto | null;
}

export async function criarPendencia(dados: DadosPendencia): Promise<Pendencia> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  // Se veio atendimento_id mas não cliente_id, busca o cliente do atendimento.
  let clienteId = dados.cliente_id;
  if (!clienteId && dados.atendimento_id) {
    const { data } = await supabase
      .from("atendimentos")
      .select("cliente_id")
      .eq("id", dados.atendimento_id)
      .maybeSingle();
    clienteId = data?.cliente_id ?? null;
  }

  const registro: Inserir<"pendencias"> = {
    org_id: perfil.org_id,
    cliente_id: clienteId,
    atendimento_id: dados.atendimento_id,
    titulo: dados.titulo,
    descricao: dados.descricao,
    responsavel_tipo: dados.responsavel_tipo,
    responsavel_id: dados.responsavel_tipo === "eu" ? perfil.id : null,
    terceiro_nome: dados.terceiro_nome,
    prioridade: dados.prioridade,
    prazo: dados.prazo ?? null,
    status: "aberta",
    created_by: perfil.id,
  };

  const { data, error } = await supabase.from("pendencias").insert(registro).select().single();
  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function concluirPendencia(dados: DadosConclusaoPendencia): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("pendencias")
    .update({
      status: "concluida",
      resultado: dados.resultado,
      concluida_em: new Date().toISOString(),
      concluida_por: perfil.id,
    })
    .eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function mudarStatusPendencia(dados: DadosMudarStatusPendencia): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("pendencias")
    .update({ status: dados.status })
    .eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function cancelarPendencia(id: string): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("pendencias")
    .update({ status: "cancelada" })
    .eq("id", id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function contarPendenciasVencidas(): Promise<number> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();

  const agora = new Date().toISOString();
  const { count, error } = await supabase
    .from("pendencias")
    .select("*", { count: "exact", head: true })
    .in("status", ["aberta", "em_andamento"])
    .lt("prazo", agora);

  if (error) throw new Error(traduzirErro(error.message));
  return count ?? 0;
}
