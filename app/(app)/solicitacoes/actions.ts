"use server";

import { revalidatePath } from "next/cache";

import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import { mudarStatusSolicitacaoSchema } from "@/lib/schemas/solicitacoes";
import { mudarStatusSolicitacao } from "@/lib/services/solicitacoes";

export async function mudarStatusSolicitacaoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = mudarStatusSolicitacaoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await mudarStatusSolicitacao(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  // O layout inteiro, porque o selo da caixa de entrada vive no menu.
  revalidatePath("/", "layout");
  return { erro: null };
}
