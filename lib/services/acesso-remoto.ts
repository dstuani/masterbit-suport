import { exigirPermissaoDeEscrita } from "@/lib/auth";
import type { RustDeskDoScript } from "@/lib/agente";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Acesso remoto pelo RustDesk: servidor da organização e senha permanente de cada cliente.
 * O RLS só deixa owner e técnico lerem as duas tabelas; para os demais as leituras
 * voltam vazias, como se nada estivesse configurado.
 */

export type ConfigRustdesk = { rustdesk_config: string; updated_at: string };

export async function obterConfigRustdesk(): Promise<ConfigRustdesk | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("acesso_remoto_config")
    .select("rustdesk_config, updated_at")
    .maybeSingle();
  if (error) throw new Error(traduzirErro(error.message));
  return data ?? null;
}

export async function salvarConfigRustdesk(config: string): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("acesso_remoto_config")
    .upsert({ org_id: perfil.org_id, rustdesk_config: config }, { onConflict: "org_id" });
  if (error) throw new Error(traduzirErro(error.message));
}

export async function obterSenhaRustdesk(clienteId: string): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("cliente_acesso_remoto")
    .select("senha")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (error) throw new Error(traduzirErro(error.message));
  return data?.senha ?? null;
}

export async function salvarSenhaRustdesk(clienteId: string, senha: string): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("cliente_acesso_remoto")
    .upsert({ cliente_id: clienteId, org_id: perfil.org_id, senha }, { onConflict: "cliente_id" });
  if (error) throw new Error(traduzirErro(error.message));
}

/** O que o script do agente precisa para instalar o RustDesk; null se faltar servidor ou senha. */
export async function rustdeskParaScript(clienteId: string): Promise<RustDeskDoScript | null> {
  const [config, senha] = await Promise.all([obterConfigRustdesk(), obterSenhaRustdesk(clienteId)]);
  return config && senha ? { config: config.rustdesk_config, senha } : null;
}
