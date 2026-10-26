import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Renova a sessão do Supabase a cada requisição e devolve o usuário autenticado.
 *
 * A resposta devolvida carrega os cookies atualizados — ela precisa ser a resposta
 * final, ou o refresh token se perde.
 */
export async function atualizarSessao(request: NextRequest) {
  // O caminho vai junto para o layout desviar papéis restritos (layouts não recebem a
  // URL). Sempre sobrescrito aqui, então o navegador não consegue forjar o valor.
  const cabecalhos = () => {
    const h = new Headers(request.headers);
    h.set("x-caminho", request.nextUrl.pathname);
    return h;
  };
  let resposta = NextResponse.next({ request: { headers: cabecalhos() } });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaDefinir) {
        for (const { name, value } of cookiesParaDefinir) {
          request.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request: { headers: cabecalhos() } });
        for (const { name, value, options } of cookiesParaDefinir) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() valida o token no servidor do Supabase. Não use getSession() aqui:
  // ele apenas lê o cookie, que o cliente pode forjar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { resposta, user };
}
