import { exigirSolicitante } from "@/lib/auth";
import type { DadosMensagem, DadosPedido } from "@/lib/schemas/meus-atendimentos";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Atendimentos vistos pelo funcionário do cliente (papel solicitante).
 *
 * Nenhuma consulta daqui filtra por usuário: quem limita aos atendimentos que ele
 * abriu é o RLS (policies *_solicitante). As colunas pedidas deixam de fora o que
 * é da equipe — tempo gasto, valores, causa, responsável.
 */

export async function listarMeusAtendimentos() {
  await exigirSolicitante();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("atendimentos")
    .select("id, numero, titulo, status, created_at, updated_at, finalizado_em")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

export async function obterMeuAtendimento(id: string) {
  await exigirSolicitante();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("atendimentos")
    .select("id, numero, titulo, descricao, status, solucao, aguardando_o_que, created_at, finalizado_em")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function listarMensagens(atendimentoId: string) {
  await exigirSolicitante();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("atendimento_interacoes")
    .select("id, tipo, conteudo, status_anterior, status_novo, autor_id, ocorrido_em")
    .eq("atendimento_id", atendimentoId)
    .is("removido_em", null)
    .order("ocorrido_em", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

export async function abrirPedido(dados: DadosPedido) {
  const perfil = await exigirSolicitante();
  const supabase = await criarClienteServidor();

  // Cliente, situação e responsável não vêm do formulário: o RLS recusaria
  // qualquer outro valor (policy atendimentos_abrir_solicitante).
  const { data, error } = await supabase
    .from("atendimentos")
    .insert({
      org_id: perfil.org_id,
      cliente_id: perfil.cliente_id,
      titulo: dados.titulo,
      descricao: dados.descricao,
      canal: "chat",
      status: "aberto",
      responsavel_id: null,
      created_by: perfil.id,
      updated_by: perfil.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function escreverMensagem(dados: DadosMensagem) {
  const perfil = await exigirSolicitante();
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("atendimento_interacoes").insert({
    org_id: perfil.org_id,
    atendimento_id: dados.atendimento_id,
    autor_id: perfil.id,
    tipo: "nota",
    conteudo: dados.conteudo,
  });

  if (error) throw new Error(traduzirErro(error.message));
}
