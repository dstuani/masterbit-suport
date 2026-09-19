import { z } from "zod";

import { exigirPermissaoDeEscrita } from "@/lib/auth";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";
import type { categoriaSchema, sistemaSchema, subcategoriaSchema } from "@/lib/schemas/cadastros";

export type Sistema = Tabelas<"sistemas">;
export type Categoria = Tabelas<"categorias">;
export type Subcategoria = Tabelas<"subcategorias">;

/** Catálogo compartilhado: sistemas atendidos e a classificação dos atendimentos. */

export async function listarSistemas(incluirInativos = false) {
  const supabase = await criarClienteServidor();

  let query = supabase.from("sistemas").select("*").order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function salvarSistema(dados: z.infer<typeof sistemaSchema>, id?: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase.from("sistemas").update(dados).eq("id", id);
    if (error) throw new Error(traduzirErro(error.message));
    return id;
  }

  const { data, error } = await supabase
    .from("sistemas")
    .insert({ ...dados, org_id: perfil.org_id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

// ─── Categorias ──────────────────────────────────────────────────────────────

export type CategoriaComSubs = Categoria & { subcategorias: Subcategoria[] };

export async function listarCategorias(): Promise<CategoriaComSubs[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("*, subcategorias(*)")
    .order("ordem")
    .order("nome");

  if (error) throw new Error(error.message);

  // O join não garante a ordem das subcategorias; ordenar aqui evita a lista
  // pular de posição entre renders.
  return (data ?? []).map((categoria) => ({
    ...categoria,
    subcategorias: [...(categoria.subcategorias ?? [])].sort(
      (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
    ),
  }));
}

export async function salvarCategoria(dados: z.infer<typeof categoriaSchema>, id?: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase.from("categorias").update(dados).eq("id", id);
    if (error) throw new Error(traduzirErro(error.message));
    return id;
  }

  const { data, error } = await supabase
    .from("categorias")
    .insert({ ...dados, org_id: perfil.org_id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

export async function salvarSubcategoria(dados: z.infer<typeof subcategoriaSchema>, id?: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase.from("subcategorias").update(dados).eq("id", id);
    if (error) throw new Error(traduzirErro(error.message));
    return id;
  }

  const { data, error } = await supabase
    .from("subcategorias")
    .insert({ ...dados, org_id: perfil.org_id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}
