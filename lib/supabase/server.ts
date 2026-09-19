import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { exigirSupabase } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Sempre criar um por requisição — nunca guardar em variável de módulo, senão a
 * sessão de um usuário vaza para outro.
 */
export async function criarClienteServidor() {
  const { url, anonKey } = exigirSupabase();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaDefinir) {
        try {
          for (const { name, value, options } of cookiesParaDefinir) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem escrever cookies; o proxy já renovou a sessão.
        }
      },
    },
  });
}
