"use server";

import { z } from "zod";

import { env } from "@/lib/env";
import { criarClienteServidor } from "@/lib/supabase/server";

const schema = z.object({ email: z.email("Informe um e-mail válido") });

export type EstadoRecuperacao = { erro: string | null; enviado: boolean };

/**
 * Pede o e-mail de redefinição de senha.
 *
 * A resposta é a mesma exista o e-mail ou não: dizer "não encontrado" permitiria
 * descobrir quem tem conta. O endereço do link vem de NEXT_PUBLIC_APP_URL, nunca
 * do cabeçalho Host da requisição — esse é controlável por quem faz o pedido.
 */
export async function solicitarRecuperacao(
  _estado: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const analise = schema.safeParse({ email: formData.get("email") });
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos", enviado: false };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(analise.data.email, {
    redirectTo: `${env.appUrl}/auth/confirmar`,
  });

  if (error) {
    console.error("[recuperar-senha] falha:", { code: error.code, status: error.status, message: error.message });

    // O limite de envios é o único erro seguro de mostrar: não depende de a conta existir.
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return {
        erro: "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.",
        enviado: false,
      };
    }
  }

  return { erro: null, enviado: true };
}
