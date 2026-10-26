"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import { mensagemSchema, pedidoSchema } from "@/lib/schemas/meus-atendimentos";
import { abrirPedido, escreverMensagem } from "@/lib/services/meus-atendimentos";

export async function abrirPedidoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = pedidoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  let destino: string;
  try {
    const criado = await abrirPedido(analise.data);
    destino = `/meus-atendimentos/${criado.id}`;
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/meus-atendimentos");
  redirect(destino);
}

export async function escreverMensagemAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = mensagemSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await escreverMensagem(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/meus-atendimentos/${analise.data.atendimento_id}`);
  revalidatePath("/meus-atendimentos");
  return { erro: null };
}
