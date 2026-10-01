"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { criarClienteServidor } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
  de: z.string().optional(),
});

export type EstadoLogin = { erro: string | null };

const DESTINO_PADRAO = "/dashboard";
const ORIGEM_FICTICIA = "http://destino.invalid";

/**
 * Só aceita caminho interno. O `de` chega pela URL (/login?de=…), então é entrada
 * do usuário: sem isto, /login?de=https://site-falso levaria a pessoa para fora
 * logo após o login. Resolver contra uma origem fictícia pega também as formas
 * disfarçadas (//site, /\site), que o navegador trata como outro domínio.
 */
function destinoSeguro(de: string | undefined): string {
  if (!de || !de.startsWith("/")) return DESTINO_PADRAO;

  try {
    const url = new URL(de, ORIGEM_FICTICIA);
    if (url.origin !== ORIGEM_FICTICIA) return DESTINO_PADRAO;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DESTINO_PADRAO;
  }
}

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const analise = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    de: formData.get("de"),
  });

  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: analise.data.email,
    password: analise.data.senha,
  });

  if (error) {
    // Ao usuário, mensagem genérica de propósito: não revelar se o e-mail existe.
    // Ao operador, a causa real no log do servidor — sem isso, "e-mail não
    // confirmado" e "senha errada" ficam indistinguíveis na hora de diagnosticar.
    console.error("[login] falha:", { code: error.code, status: error.status, message: error.message });
    return { erro: "E-mail ou senha inválidos" };
  }

  // Senha certa não basta: conta desativada não entra. O RLS esconde o perfil de
  // quem está inativo, então "não achei o perfil" e "perfil inativo" dão no mesmo.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!perfil?.ativo) {
    await supabase.auth.signOut();
    return { erro: "Esta conta está desativada. Fale com o administrador do sistema." };
  }

  redirect(destinoSeguro(analise.data.de));
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
