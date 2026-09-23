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
  tituloSchema,
} from "@/lib/schemas/atendimentos";
import {
  atualizarAtendimento,
  concluirAtendimento,
  criarAtendimento,
  mudarStatus,
  registrarInteracao,
} from "@/lib/services/atendimentos";
import { z } from "zod";

import { atribuicaoSchema } from "@/lib/schemas/equipe";
import { enviarAnexo, removerAnexo } from "@/lib/services/anexos";
import { atribuirAtendimento } from "@/lib/services/equipe";

export async function enviarAnexoAction(formData: FormData): Promise<EstadoFormulario> {
  const atendimentoId = z.uuid().safeParse(formData.get("atendimento_id"));
  const arquivo = formData.get("arquivo");

  if (!atendimentoId.success) return { erro: "Atendimento inválido." };
  if (!(arquivo instanceof File)) return { erro: "Nenhum arquivo recebido." };

  try {
    await enviarAnexo(atendimentoId.data, arquivo);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/atendimentos/${atendimentoId.data}`);
  return { erro: null };
}

export async function removerAnexoAction(formData: FormData): Promise<EstadoFormulario> {
  const anexoId = z.uuid().safeParse(formData.get("anexo_id"));
  if (!anexoId.success) return { erro: "Anexo inválido." };

  try {
    const { atendimentoId } = await removerAnexo(anexoId.data);
    revalidatePath(`/atendimentos/${atendimentoId}`);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  return { erro: null };
}

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

export async function atualizarTituloAction(formData: FormData): Promise<EstadoFormulario> {
  const analise = tituloSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await atualizarAtendimento(analise.data.atendimento_id, { titulo: analise.data.titulo });
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/atendimentos/${analise.data.atendimento_id}`);
  revalidatePath("/atendimentos");
  return { erro: null };
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
