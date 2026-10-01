import { cache } from "react";
import { redirect } from "next/navigation";

import { supabaseConfigurado } from "@/lib/env";
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

export async function exigirPermissaoDeEscrita(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (!podeEscrever(perfil)) throw new Error("Sem permissão para esta operação");
  return perfil;
}
