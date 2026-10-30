import { exigirPerfil, exigirPermissaoDeEscrita } from "@/lib/auth";
import type { DadosConhecimento, DadosEdicaoConhecimento } from "@/lib/schemas/conhecimento";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

export type Conhecimento = Tabelas<"conhecimentos">;

export type ConhecimentoComContexto = Conhecimento & {
  sistemas: { nome: string } | null;
  categorias: { nome: string } | null;
};

export type FiltrosConhecimento = {
  busca?: string;
  sistemaId?: string;
  categoriaId?: string;
};

const SELECAO = "*, sistemas(nome), categorias(nome)";

export async function listarConhecimentos(filtros: FiltrosConhecimento = {}): Promise<ConhecimentoComContexto[]> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();

  let query = supabase.from("conhecimentos").select(SELECAO).order("titulo").limit(500);

  if (filtros.sistemaId) query = query.eq("sistema_id", filtros.sistemaId);
  if (filtros.categoriaId) query = query.eq("categoria_id", filtros.categoriaId);

  // Cada palavra é um .or() próprio, e os .or() se combinam com E: "estoque negativo" acha
  // itens que tenham as duas palavras, em qualquer dos três campos. O termo entra numa
  // expressão do PostgREST, então só letras, números e alguns sinais passam.
  const palavras = (filtros.busca ?? "")
    .replace(/[^\p{L}\p{N} ._\-/]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  for (const palavra of palavras) {
    const padrao = `%${palavra}%`;
    query = query.or(["titulo", "descricao", "comando"].map((c) => `${c}.ilike.${padrao}`).join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? []) as ConhecimentoComContexto[];
}

export async function opcoesDoConhecimento() {
  await exigirPerfil();
  const supabase = await criarClienteServidor();
  const [sistemas, categorias] = await Promise.all([
    supabase.from("sistemas").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem").order("nome"),
  ]);
  return { sistemas: sistemas.data ?? [], categorias: categorias.data ?? [] };
}

export async function obterConhecimento(id: string): Promise<Conhecimento | null> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conhecimentos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(traduzirErro(error.message));
  return data ?? null;
}

export async function criarConhecimento(dados: DadosConhecimento): Promise<Conhecimento> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("conhecimentos")
    .insert({ ...dados, org_id: perfil.org_id, created_by: perfil.id, updated_by: perfil.id })
    .select()
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function atualizarConhecimento(dados: DadosEdicaoConhecimento): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { id, ...campos } = dados;

  const { error } = await supabase
    .from("conhecimentos")
    .update({ ...campos, updated_by: perfil.id })
    .eq("id", id);

  if (error) throw new Error(traduzirErro(error.message));
}

/** Apaga de vez: o item é só texto do próprio usuário, sem histórico a preservar. */
export async function excluirConhecimento(id: string): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("conhecimentos").delete().eq("id", id);
  if (error) throw new Error(traduzirErro(error.message));
}
