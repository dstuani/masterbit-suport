import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Destino do link do e-mail de recuperação de senha.
 *
 * O Supabase devolve o usuário para cá com `?code=` (fluxo PKCE); trocar o código
 * por uma sessão deixa a pessoa logada só o bastante para definir a nova senha. O
 * destino é fixo de propósito — nada vindo da URL decide para onde ir, o que
 * evitaria virar um redirecionamento aberto.
 *
 * O código só vale no mesmo navegador que pediu o link (o verificador PKCE fica num
 * cookie dele): abrir o e-mail em outro aparelho cai no erro abaixo.
 */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");

  if (codigo) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) redirect("/nova-senha");
    console.error("[recuperar-senha] código recusado:", { code: error.code, status: error.status });
  }

  redirect("/recuperar-senha?erro=link");
}
