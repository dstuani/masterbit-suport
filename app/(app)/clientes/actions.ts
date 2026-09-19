"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clienteSchema,
  clienteSistemaSchema,
  contatoSchema,
  dadosDoFormulario,
  filialSchema,
} from "@/lib/schemas/cadastros";
import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import {
  atualizarCliente,
  criarCliente,
  inativarCliente,
  removerSistemaDoCliente,
  salvarContato,
  salvarFilial,
  salvarSistemaDoCliente,
} from "@/lib/services/clientes";

// ─── Cliente ─────────────────────────────────────────────────────────────────

export async function salvarClienteAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = clienteSchema.safeParse(dadosDoFormulario(formData));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  let destino: string;
  try {
    if (typeof id === "string" && id.length > 0) {
      await atualizarCliente(id, analise.data);
      destino = `/clientes/${id}`;
    } else {
      destino = `/clientes/${await criarCliente(analise.data)}`;
    }
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/clientes");
  redirect(destino);
}

export async function inativarClienteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await inativarCliente(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

// ─── Filial ──────────────────────────────────────────────────────────────────

export async function salvarFilialAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = filialSchema.safeParse(dadosDoFormulario(formData, ["matriz", "ativo"]));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await salvarFilial(analise.data, typeof id === "string" && id ? id : undefined);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/clientes/${analise.data.cliente_id}`);
  return { erro: null };
}

// ─── Contato ─────────────────────────────────────────────────────────────────

export async function salvarContatoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = contatoSchema.safeParse(dadosDoFormulario(formData, ["principal", "ativo"]));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await salvarContato(analise.data, typeof id === "string" && id ? id : undefined);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/clientes/${analise.data.cliente_id}`);
  return { erro: null };
}

// ─── Sistema instalado ───────────────────────────────────────────────────────

export async function salvarSistemaDoClienteAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = formData.get("id");
  const analise = clienteSistemaSchema.safeParse(dadosDoFormulario(formData, ["ativo"]));

  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await salvarSistemaDoCliente(analise.data, typeof id === "string" && id ? id : undefined);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/clientes/${analise.data.cliente_id}`);
  return { erro: null };
}

export async function removerSistemaDoClienteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");
  if (!id) return;

  await removerSistemaDoCliente(id);
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}
