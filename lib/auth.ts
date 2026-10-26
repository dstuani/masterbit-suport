import { cache } from "react";
import { redirect } from "next/navigation";

import { supabaseConfigurado } from "@/lib/env";
import { inicioDoPapel, podeEscreverNaAgenda, rotaPermitida } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

export type Perfil = Tabelas<"profiles">;

/**
 * Camada de acesso a dados de identidade (DAL).
 *
 * Toda página e Server Action que toca dado do usuário passa por aqui — o proxy faz
 * só a checagem otimista e não substitui esta verificação.
 */
export const obterUsuario = cache(async () => {
  if (!supabaseConfigurado) return null;

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

/**
 * Perfil do usuário logado, com a organização a que pertence.
 *
 * O org_id daqui é o que as escritas usam. O RLS confere de novo no banco — se
 * divergir, a linha é recusada.
 */
export const obterPerfil = cache(async (): Promise<Perfil | null> => {
  const user = await obterUsuario();
  if (!user) return null;

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return data ?? null;
});

/**
 * Usa em páginas protegidas: devolve o usuário ou redireciona para o login.
 *
 * Sessão válida não basta: usuário desativado (ou sem perfil) é deslogado. O RLS
 * já esconde tudo dele — inclusive o próprio perfil, por isso `perfil` vem nulo —,
 * e sem este desvio ele veria um sistema vazio em vez de saber o que houve.
 */
export async function exigirUsuario() {
  const user = await obterUsuario();

  if (!supabaseConfigurado) {
    // Modo de visualização (pré-configuração do Supabase), apenas em desenvolvimento.
    return null;
  }

  if (!user) redirect("/login");

  const perfil = await obterPerfil();
  if (!perfil?.ativo) redirect("/sair?motivo=inativo");

  return user;
}

/**
 * Usa em Server Actions: devolve o perfil ou lança.
 *
 * Lançar em vez de redirecionar é proposital — uma Action chamada por POST direto
 * deve falhar, não devolver um redirect que o chamador ignora.
 */
export async function exigirPerfil(): Promise<Perfil> {
  const perfil = await obterPerfil();
  if (!perfil) throw new Error("Não autenticado");
  if (!perfil.ativo) throw new Error("Usuário inativo");
  return perfil;
}

/** Papéis que podem escrever. Espelha pode_escrever() no Postgres. */
export function podeEscrever(perfil: Perfil) {
  return perfil.role === "owner" || perfil.role === "tecnico";
}

/**
 * Usa em páginas para decidir se mostra botões e formulários de escrita.
 *
 * Esconder é só conveniência — quem barra de verdade é exigirPermissaoDeEscrita()
 * nas Server Actions e o RLS no banco. Sem isto, o visualizador via todos os botões
 * e só descobria a restrição ao clicar. Modo de visualização (sem Supabase): libera,
 * para o shell continuar navegável.
 */
export async function podeEscreverAgora(): Promise<boolean> {
  if (!supabaseConfigurado) return true;
  const perfil = await obterPerfil();
  return perfil !== null && perfil.ativo && podeEscrever(perfil);
}

/** Usa no topo de páginas de criar/editar: quem só consulta volta para a listagem. */
export async function exigirEscritaNaPagina(voltarPara: string): Promise<void> {
  if (!(await podeEscreverAgora())) redirect(voltarPara);
}

export async function exigirPermissaoDeEscrita(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (!podeEscrever(perfil)) throw new Error("Sem permissão para esta operação");
  return perfil;
}

/** Agenda: a equipe e o papel "agenda" criam e remarcam. Espelha as policies de agenda_eventos. */
export async function podeEscreverNaAgendaAgora(): Promise<boolean> {
  if (!supabaseConfigurado) return true;
  const perfil = await obterPerfil();
  return perfil !== null && perfil.ativo && podeEscreverNaAgenda(perfil.role);
}

export async function exigirEscritaNaAgenda(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (!podeEscreverNaAgenda(perfil.role)) throw new Error("Sem permissão para esta operação");
  return perfil;
}

/** Funcionário de cliente: só abre e acompanha os próprios atendimentos. */
export async function exigirSolicitante(): Promise<Perfil & { cliente_id: string }> {
  const perfil = await exigirPerfil();
  if (perfil.role !== "solicitante" || !perfil.cliente_id) {
    throw new Error("Sem permissão para esta operação");
  }
  return perfil as Perfil & { cliente_id: string };
}

/**
 * Desvia o papel restrito que abriu uma rota fora da dele (digitando a URL ou por um
 * link esquecido). É conveniência de tela: quem barra os dados é o RLS. O caminho
 * vem do cabeçalho que o proxy grava; sem ele, conta como rota não permitida.
 */
export async function desviarSeForaDoPapel(caminho: string | null): Promise<void> {
  if (!supabaseConfigurado) return;
  const perfil = await obterPerfil();
  if (!perfil) return;
  if (!rotaPermitida(perfil.role, caminho ?? "")) redirect(inicioDoPapel(perfil.role));
}
