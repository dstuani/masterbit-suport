import { NextResponse, type NextRequest } from "next/server";

import { supabaseConfigurado } from "@/lib/env";
import { atualizarSessao } from "@/lib/supabase/proxy";

const ROTAS_PUBLICAS = ["/login", "/recuperar-senha", "/nova-senha"];

/**
 * Proxy (o antigo middleware — renomeado no Next.js 16).
 *
 * Faz apenas a checagem otimista de sessão e renova os cookies. A autorização de
 * verdade é feita pelo RLS no Postgres e revalidada em cada Server Action.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Antes da configuração do Supabase o app roda em modo de visualização, para que
  // o shell seja navegável. Em produção isso nunca é permitido.
  if (!supabaseConfigurado) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        { status: 500 },
      );
    }
    return NextResponse.next();
  }

  const { resposta, user } = await atualizarSessao(request);
  const ehRotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));

  if (!user && !ehRotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("de", pathname);
    return NextResponse.redirect(url);
  }

  if (user && ehRotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  // Ignora assets estáticos e imagens — o proxy roda em toda navegação real.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
