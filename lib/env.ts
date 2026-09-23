/**
 * Leitura centralizada das variáveis de ambiente.
 *
 * Enquanto o Supabase não estiver configurado, `supabaseConfigurado` é `false` e a
 * aplicação roda em modo de visualização (apenas fora de produção) — assim o shell
 * é navegável antes da Fase 2.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// O Supabase renomeou a chave pública: projetos novos recebem uma
// `sb_publishable_...` em NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, enquanto os
// antigos seguem com a anon key em NEXT_PUBLIC_SUPABASE_ANON_KEY. Aceitar os dois
// evita que o app entre em modo de visualização por causa do nome da variável.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

const ehPlaceholder = (valor: string) =>
  valor.length === 0 || valor.includes("SEU-PROJETO") || valor.startsWith("cole-aqui");

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseConfigurado = !ehPlaceholder(url) && !ehPlaceholder(anonKey);
export const serviceRoleConfigurado = !ehPlaceholder(serviceRoleKey);

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  serviceRoleKey,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100",
} as const;

/** Em produção o Supabase é obrigatório — falhar cedo evita subir um app sem auth. */
export function exigirSupabase() {
  if (!supabaseConfigurado) {
    throw new Error(
      "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local (veja .env.example).",
    );
  }
  return { url: env.supabaseUrl, anonKey: env.supabaseAnonKey };
}

/**
 * A service role key ignora o RLS por completo — só existe para as poucas
 * rotinas que a API pública do Supabase não cobre (hoje, criar usuário). Falhar
 * cedo com uma mensagem clara evita um erro genérico do Supabase no meio do form.
 */
export function exigirServiceRole() {
  const { url } = exigirSupabase();
  if (!serviceRoleConfigurado) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Copie em Project Settings → API → service_role no painel do Supabase e cole em .env.local (veja .env.example) para criar usuários pelo sistema.",
    );
  }
  return { url, serviceRoleKey: env.serviceRoleKey };
}
