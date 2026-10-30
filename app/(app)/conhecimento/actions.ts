"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import {
  conhecimentoSchema,
  edicaoConhecimentoSchema,
  excluirConhecimentoSchema,
} from "@/lib/schemas/conhecimento";
import { atualizarConhecimento, criarConhecimento, excluirConhecimento } from "@/lib/services/conhecimento";

export async function criarConhecimentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = conhecimentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await criarConhecimento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/conhecimento");
  redirect(`/conhecimento?tipo=${analise.data.tipo}`);
}

export async function atualizarConhecimentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = edicaoConhecimentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await atualizarConhecimento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/conhecimento");
  redirect(`/conhecimento?tipo=${analise.data.tipo}`);
}

export async function excluirConhecimentoAction(formData: FormData): Promise<EstadoFormulario> {
  const analise = excluirConhecimentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await excluirConhecimento(analise.data.id);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/conhecimento");
  return { erro: null };
}
