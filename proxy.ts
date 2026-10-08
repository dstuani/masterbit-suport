import { NextResponse, type NextRequest } from "next/server";

import { supabaseConfigurado } from "@/lib/env";
import { atualizarSessao } from "@/lib/supabase/proxy";

// Públicas e "só para deslogado": quem já está logado é mandado ao dashboard.
// /nova-senha NÃO entra aqui: o link do e-mail abre uma sessão de recuperação, e
// quem chega nela está logado — exige sessão, mas não pode ser desviado.
const ROTAS_PUBLICAS = ["/login", "/recuperar-senha"];

// Passam sem desvio em nenhum sentido (veja o uso abaixo).
const ROTAS_SEM_DESVIO = ["/sair", "/auth/confirmar"];

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

  // /sair: logado precisa chegar até ela para o logout acontecer, e deslogado não
  // deve ser mandado ao login com ?de=/sair (o que o deslogaria de novo ao entrar).
  // /auth/confirmar: recebe o link do e-mail de recuperação, ainda sem sessão, e
  // troca o código por uma.
  if (ROTAS_SEM_DESVIO.includes(pathname)) return resposta;

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
  // O manifesto, o service worker e a tela offline também ficam de fora: o navegador
  // os busca sem sessão, e um redirecionamento ao login invalidaria o PWA.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
