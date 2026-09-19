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
  const { error } = await supabase.auth.signInWithPassword({
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

  redirect(analise.data.de || "/dashboard");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
