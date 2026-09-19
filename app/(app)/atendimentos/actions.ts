"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import {
  atendimentoSchema,
  conclusaoSchema,
  interacaoSchema,
  mudancaStatusSchema,
} from "@/lib/schemas/atendimentos";
import {
  concluirAtendimento,
  criarAtendimento,
  mudarStatus,
  registrarInteracao,
} from "@/lib/services/atendimentos";
import { atribuicaoSchema } from "@/lib/schemas/equipe";
import { atribuirAtendimento } from "@/lib/services/equipe";

export async function atribuirAtendimentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = atribuicaoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await atribuirAtendimento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/atendimentos/${analise.data.atendimento_id}`);
  revalidatePath("/atendimentos");
  return { erro: null };
}

export async function criarAtendimentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = atendimentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  let destino: string;
  try {
    const criado = await criarAtendimento(analise.data);
    destino = `/atendimentos/${criado.id}`;
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/atendimentos");
  redirect(destino);
}

export async function registrarInteracaoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = interacaoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await registrarInteracao(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/atendimentos/${analise.data.atendimento_id}`);
  revalidatePath("/atendimentos");
  return { erro: null };
}

export async function mudarStatusAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = mudancaStatusSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await mudarStatus(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/atendimentos/${analise.data.atendimento_id}`);
  revalidatePath("/atendimentos");
  return { erro: null };
}

export async function concluirAtendimentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = conclusaoSchema.safeParse(dadosDoFormulario(formData, ["faturavel"]));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await concluirAtendimento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/atendimentos/${analise.data.atendimento_id}`);
  revalidatePath("/atendimentos");
  return { erro: null };
}
