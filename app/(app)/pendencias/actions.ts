"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import {
  cancelarPendenciaSchema,
  conclusaoPendenciaSchema,
  mudarStatusPendenciaSchema,
  pendenciaSchema,
} from "@/lib/schemas/pendencias";
import {
  cancelarPendencia,
  concluirPendencia,
  criarPendencia,
  mudarStatusPendencia,
} from "@/lib/services/pendencias";

export async function criarPendenciaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = pendenciaSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  let destino: string;
  try {
    const criada = await criarPendencia(analise.data);
    const atendimentoId = analise.data.atendimento_id;
    destino = atendimentoId
      ? `/atendimentos/${atendimentoId}`
      : `/pendencias`;
    void criada;
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/pendencias");
  revalidatePath("/atendimentos");
  redirect(destino);
}

export async function concluirPendenciaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = conclusaoPendenciaSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await concluirPendencia(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/pendencias");
  revalidatePath("/atendimentos");
  return { erro: null };
}

export async function mudarStatusPendenciaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = mudarStatusPendenciaSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await mudarStatusPendencia(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/pendencias");
  revalidatePath("/atendimentos");
  return { erro: null };
}

export async function cancelarPendenciaAction(formData: FormData): Promise<void> {
  const analise = cancelarPendenciaSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return;

  try {
    await cancelarPendencia(analise.data.id);
  } catch {
    return;
  }

  revalidatePath("/pendencias");
  revalidatePath("/atendimentos");
}
