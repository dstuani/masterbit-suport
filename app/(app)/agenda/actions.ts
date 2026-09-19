"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import {
  cancelarEventoSchema,
  eventoSchema,
  realizarEventoSchema,
  remarcarEventoSchema,
} from "@/lib/schemas/agenda";
import {
  cancelarEvento,
  criarEvento,
  realizarEvento,
  remarcarEvento,
} from "@/lib/services/agenda";

export async function criarEventoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = eventoSchema.safeParse(dadosDoFormulario(formData, ["dia_inteiro"]));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  let destino: string;
  try {
    const criado = await criarEvento(analise.data);
    destino = `/agenda/${criado.id}`;
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/agenda");
  redirect(destino);
}

export async function realizarEventoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = realizarEventoSchema.safeParse(
    dadosDoFormulario(formData, ["registrar_interacao"]),
  );
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await realizarEvento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/agenda");
  revalidatePath("/atendimentos");
  return { erro: null };
}

export async function remarcarEventoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = remarcarEventoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await remarcarEvento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/agenda");
  return { erro: null };
}

export async function cancelarEventoAction(formData: FormData): Promise<void> {
  const analise = cancelarEventoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return;

  try {
    await cancelarEvento(analise.data.id);
  } catch {
    return;
  }

  revalidatePath("/agenda");
}
