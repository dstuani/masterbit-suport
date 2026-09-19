"use server";

import { revalidatePath } from "next/cache";

import { categoriaSchema, dadosDoFormulario, sistemaSchema, subcategoriaSchema } from "@/lib/schemas/cadastros";
import { salvarCategoria, salvarSistema, salvarSubcategoria } from "@/lib/services/catalogo";
import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";

export async function salvarSistemaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = sistemaSchema.safeParse(dadosDoFormulario(formData, ["ativo"]));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await salvarSistema(analise.data, typeof id === "string" && id ? id : undefined);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}

export async function salvarCategoriaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = categoriaSchema.safeParse(dadosDoFormulario(formData, ["ativo"]));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await salvarCategoria(analise.data, typeof id === "string" && id ? id : undefined);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}

export async function salvarSubcategoriaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = subcategoriaSchema.safeParse(dadosDoFormulario(formData, ["ativo"]));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await salvarSubcategoria(analise.data, typeof id === "string" && id ? id : undefined);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}
