import { createHash, randomBytes } from "node:crypto";

import { exigirPerfil, exigirPermissaoDeEscrita } from "@/lib/auth";
import { DIAS_SEM_COLETA } from "@/lib/constants";
import type { DadosEdicaoEquipamento, DadosEquipamento, DadosManutencao } from "@/lib/schemas/equipamentos";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

export type Equipamento = Tabelas<"equipamentos">;

export type EquipamentoComContexto = Equipamento & {
  clientes: { razao_social: string } | null;
  filiais: { nome: string } | null;
};

export type Manutencao = Tabelas<"equipamento_manutencoes"> & {
  atendimentos: { numero: string; titulo: string } | null;
  profiles: { nome: string } | null;
};

export type ChaveDeColeta = Pick<
  Tabelas<"coleta_chaves">,
  "id" | "prefixo" | "descricao" | "criada_em" | "revogada_em" | "ultimo_uso_em" | "usos"
>;

export type FiltrosEquipamentos = {
  busca?: string;
  clienteId?: string;
  tipo?: string;
  situacao?: "ativos" | "inativos" | "sem_coleta" | "todos";
};

/** Data de corte para "sem coleta": a partir dela a máquina deixou de dar notícias. */
export function limiteSemColeta() {
  return new Date(Date.now() - DIAS_SEM_COLETA * 86_400_000).toISOString();
}

export async function listarEquipamentos(filtros: FiltrosEquipamentos = {}): Promise<EquipamentoComContexto[]> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();

  let query = supabase
    .from("equipamentos")
    .select("*, clientes(razao_social), filiais(nome)")
    .order("nome")
    .limit(1000);

  const situacao = filtros.situacao ?? "ativos";
  if (situacao === "ativos") query = query.eq("ativo", true);
  if (situacao === "inativos") query = query.eq("ativo", false);
  if (situacao === "sem_coleta") {
    query = query.eq("ativo", true).eq("origem", "agente").lt("ultima_coleta_em", limiteSemColeta());
  }
  if (filtros.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);

  // A busca entra num filtro .or() do PostgREST: vírgula, parênteses e curingas mudariam a
  // expressão, então só letras, números, espaço, ponto, hífen, barra e sublinhado passam.
  const termo = (filtros.busca ?? "").replace(/[^\p{L}\p{N} ._\-/]/gu, "").trim().slice(0, 60);
  if (termo.length > 0) {
    const padrao = `%${termo}%`;
    query = query.or(
      ["nome", "patrimonio", "numero_serie", "usuario", "setor", "modelo"].map((c) => `${c}.ilike.${padrao}`).join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? []) as EquipamentoComContexto[];
}

export async function obterEquipamento(id: string): Promise<EquipamentoComContexto | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("equipamentos")
    .select("*, clientes(razao_social), filiais(nome)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? null) as EquipamentoComContexto | null;
}

export async function listarManutencoes(equipamentoId: string): Promise<Manutencao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("equipamento_manutencoes")
    .select("*, atendimentos(numero, titulo), profiles(nome)")
    .eq("equipamento_id", equipamentoId)
    .order("realizada_em", { ascending: false });
  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? []) as Manutencao[];
}

/** Atendimentos recentes do cliente, para ligar uma manutenção ao atendimento em que ela aconteceu. */
export async function atendimentosParaVincular(clienteId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("atendimentos")
    .select("id, numero, titulo")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function opcoesDoCadastro() {
  const supabase = await criarClienteServidor();
  const [clientes, filiais] = await Promise.all([
    supabase.from("clientes").select("id, razao_social").eq("status", "ativo").order("razao_social"),
    supabase.from("filiais").select("id, nome, cliente_id").eq("ativo", true).order("nome"),
  ]);
  return { clientes: clientes.data ?? [], filiais: filiais.data ?? [] };
}

// ─── Escrita ─────────────────────────────────────────────────────────────────

export async function criarEquipamento(dados: DadosEquipamento): Promise<Equipamento> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("equipamentos")
    .insert({ ...dados, org_id: perfil.org_id, origem: "manual" })
    .select()
    .single();
  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function atualizarEquipamento(dados: DadosEdicaoEquipamento): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { id, ...campos } = dados;
  const { error } = await supabase.from("equipamentos").update(campos).eq("id", id);
  if (error) throw new Error(traduzirErro(error.message));
}

export async function mudarSituacaoEquipamento(id: string, ativo: boolean): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("equipamentos").update({ ativo }).eq("id", id);
  if (error) throw new Error(traduzirErro(error.message));
}

export async function registrarManutencao(dados: DadosManutencao): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("equipamento_manutencoes")
    .insert({ ...dados, org_id: perfil.org_id, autor_id: perfil.id });
  if (error) throw new Error(traduzirErro(error.message));
}

// ─── Chaves de coleta ────────────────────────────────────────────────────────

export async function listarChaves(clienteId: string): Promise<ChaveDeColeta[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("coleta_chaves")
    .select("id, prefixo, descricao, criada_em, revogada_em, ultimo_uso_em, usos")
    .eq("cliente_id", clienteId)
    .order("criada_em", { ascending: false });
  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

/**
 * Gera a chave de coleta de um cliente e devolve o texto UMA vez.
 * O banco guarda só o SHA-256 — o mesmo cálculo que registrar_coleta faz para conferir.
 */
export async function gerarChave(clienteId: string, descricao: string | null): Promise<string> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const chave = `mbk_${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(chave, "utf8").digest("hex");

  const { error } = await supabase.from("coleta_chaves").insert({
    org_id: perfil.org_id,
    cliente_id: clienteId,
    hash,
    prefixo: chave.slice(0, 12),
    descricao,
    criada_por: perfil.id,
  });
  if (error) throw new Error(traduzirErro(error.message));
  return chave;
}

export async function revogarChave(id: string): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("coleta_chaves")
    .update({ revogada_em: new Date().toISOString() })
    .eq("id", id)
    .is("revogada_em", null);
  if (error) throw new Error(traduzirErro(error.message));
}
