"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import { comentarioSchema, statusTopicoSchema, topicoSchema } from "@/lib/schemas/consultoria";
import {
  criarTopico,
  enviarAnexoTopico,
  mudarStatusTopico,
  registrarComentario,
  removerAnexoTopico,
} from "@/lib/services/consultoria";

export async function criarTopicoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = topicoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await criarTopico(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/consultoria");
  return { erro: null };
}

export async function mudarStatusTopicoAction(formData: FormData): Promise<void> {
  const analise = statusTopicoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return;

  await mudarStatusTopico(analise.data);
  revalidatePath("/consultoria");
  revalidatePath(`/consultoria/${analise.data.id}`);
}

export async function registrarComentarioAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = comentarioSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await registrarComentario(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/consultoria/${analise.data.topico_id}`);
  return { erro: null };
}

export async function enviarAnexoTopicoAction(formData: FormData): Promise<EstadoFormulario> {
  const topicoId = z.uuid().safeParse(formData.get("topico_id"));
  const arquivo = formData.get("arquivo");

  if (!topicoId.success) return { erro: "Tópico inválido." };
  if (!(arquivo instanceof File)) return { erro: "Nenhum arquivo recebido." };

  try {
    await enviarAnexoTopico(topicoId.data, arquivo);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/consultoria/${topicoId.data}`);
  return { erro: null };
}

export async function removerAnexoTopicoAction(formData: FormData): Promise<EstadoFormulario> {
  const anexoId = z.uuid().safeParse(formData.get("anexo_id"));
  if (!anexoId.success) return { erro: "Anexo inválido." };

  try {
    const { topicoId } = await removerAnexoTopico(anexoId.data);
    revalidatePath(`/consultoria/${topicoId}`);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  return { erro: null };
}
