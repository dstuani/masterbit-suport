import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Encerra a sessão e volta ao login.
 *
 * Route Handler, e não Server Component: só aqui os cookies da sessão podem ser
 * apagados durante um GET. O layout desvia para cá quem está desativado — num
 * Server Component o signOut não conseguiria limpar o cookie.
 */
export async function GET(request: NextRequest) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();

  const motivo = request.nextUrl.searchParams.get("motivo");
  redirect(motivo === "inativo" ? "/login?motivo=inativo" : "/login");
}
