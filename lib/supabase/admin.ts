import { createClient } from "@supabase/supabase-js";

import { exigirServiceRole } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cliente com a service role key: ignora o RLS por completo.
 *
 * Só para o que a API pública do Supabase não expõe — hoje, só criar usuário
 * (`auth.admin.createUser`). Nunca importar este arquivo de um componente
 * "use client", e nunca guardar o cliente numa variável de módulo — cria um por
 * chamada, como o cliente normal em lib/supabase/server.ts.
 */
export function criarClienteAdmin() {
  const { url, serviceRoleKey } = exigirServiceRole();

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
