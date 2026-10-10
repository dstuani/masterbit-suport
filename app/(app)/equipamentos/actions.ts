"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { montarScriptAgente } from "@/lib/agente";
import { env } from "@/lib/env";
import { erroDeValidacao, mensagemDoErro, type EstadoFormulario } from "@/lib/forms";
import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import {
  edicaoEquipamentoSchema,
  equipamentoSchema,
  gerarChaveSchema,
  manutencaoSchema,
  revogarChaveSchema,
  situacaoEquipamentoSchema,
  type EstadoChave,
} from "@/lib/schemas/equipamentos";
import { obterCliente } from "@/lib/services/clientes";
import {
  atualizarEquipamento,
  criarEquipamento,
  gerarChave,
  mudarSituacaoEquipamento,
  registrarManutencao,
  revogarChave,
} from "@/lib/services/equipamentos";

export async function criarEquipamentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = equipamentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  let id: string;
  try {
    id = (await criarEquipamento(analise.data)).id;
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/equipamentos");
  redirect(`/equipamentos/${id}`);
}

export async function atualizarEquipamentoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = edicaoEquipamentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await atualizarEquipamento(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath("/equipamentos");
  redirect(`/equipamentos/${analise.data.id}`);
}

export async function mudarSituacaoEquipamentoAction(formData: FormData): Promise<void> {
  const analise = situacaoEquipamentoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return;
  await mudarSituacaoEquipamento(analise.data.id, analise.data.ativo);
  revalidatePath("/equipamentos");
  revalidatePath(`/equipamentos/${analise.data.id}`);
}

export async function registrarManutencaoAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = manutencaoSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    await registrarManutencao(analise.data);
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }

  revalidatePath(`/equipamentos/${analise.data.equipamento_id}`);
  return { erro: null };
}

/** Gera a chave e já devolve o script pronto: é a única vez que a chave aparece em texto. */
export async function gerarChaveAction(_estado: EstadoChave, formData: FormData): Promise<EstadoChave> {
  const analise = gerarChaveSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return erroDeValidacao(analise.error.issues);

  try {
    const cliente = await obterCliente(analise.data.cliente_id);
    if (!cliente) return { erro: "Cliente não encontrado." };

    const chave = await gerarChave(analise.data.cliente_id, analise.data.descricao);
    // URL e chave pública são as mesmas que o navegador já recebe; nunca a service role.
    const script = montarScriptAgente({
      url: env.supabaseUrl,
      chavePublica: env.supabaseAnonKey,
      chaveColeta: chave,
      cliente: cliente.razao_social,
    });

    revalidatePath(`/clientes/${analise.data.cliente_id}`);
    return { erro: null, chave, script };
  } catch (erro) {
    return { erro: mensagemDoErro(erro) };
  }
}

export async function revogarChaveAction(formData: FormData): Promise<void> {
  const analise = revogarChaveSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) return;
  await revogarChave(analise.data.id);
  revalidatePath(`/clientes/${analise.data.cliente_id}`);
}
