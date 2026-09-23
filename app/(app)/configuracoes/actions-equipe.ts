"use server";

import { revalidatePath } from "next/cache";

import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import {
  criarUsuarioSchema,
  papelSchema,
  perfilSchema,
  senhaSchema,
  situacaoSchema,
  type EstadoCriarUsuario,
} from "@/lib/schemas/equipe";
import {
  alterarMinhaSenha,
  alterarPapel,
  alterarSituacao,
  atualizarMeuPerfil,
  criarUsuario,
} from "@/lib/services/equipe";

export async function atualizarPerfilAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = perfilSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await atualizarMeuPerfil(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}

export async function alterarSenhaAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = senhaSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await alterarMinhaSenha(analise.data.senha);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  return { erro: null };
}

export async function criarUsuarioAction(
  _estado: EstadoCriarUsuario,
  formData: FormData,
): Promise<EstadoCriarUsuario> {
  const analise = criarUsuarioSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    const criado = await criarUsuario(analise.data);
    revalidatePath("/configuracoes");
    return { erro: null, senhaTemporaria: criado.senhaTemporaria, emailCriado: analise.data.email };
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }
}

export async function alterarPapelAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = papelSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await alterarPapel(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}

export async function alterarSituacaoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = situacaoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await alterarSituacao(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}
