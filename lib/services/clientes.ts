import { exigirPerfil, exigirPermissaoDeEscrita } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { traduzirErro } from "@/lib/services/erros";
import type { Tabelas } from "@/lib/types/database";
import type {
  DadosCliente,
  DadosClienteSistema,
  DadosContato,
  DadosFilial,
} from "@/lib/schemas/cadastros";

export type Cliente = Tabelas<"clientes">;
export type Filial = Tabelas<"filiais">;
export type Contato = Tabelas<"cliente_contatos">;

export type ClienteNaLista = Cliente & { atendimentos_abertos: number };

/**
 * Lógica de domínio dos cadastros de cliente.
 *
 * Estas funções são chamadas tanto por Server Components (leitura) quanto por
 * Server Actions (escrita). O org_id vem sempre do perfil do usuário logado,
 * nunca do formulário — do contrário bastaria forjar o campo para escrever em
 * outra organização. O RLS confere de novo no banco.
 */

export type FiltrosClientes = {
  busca?: string;
  status?: Cliente["status"];
};

export async function listarClientes(filtros: FiltrosClientes = {}) {
  const supabase = await criarClienteServidor();

  let query = supabase
    .from("clientes")
    .select("*")
    .order("razao_social", { ascending: true })
    .limit(200);

  if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  if (filtros.busca && filtros.busca.trim().length > 0) {
    const termo = `%${filtros.busca.trim()}%`;
    query = query.or(
      `razao_social.ilike.${termo},nome_fantasia.ilike.${termo},documento.ilike.${termo},cidade.ilike.${termo}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obterCliente(id: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function criarCliente(dados: DadosCliente) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...dados, org_id: perfil.org_id, created_by: perfil.id, updated_by: perfil.id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

export async function atualizarCliente(id: string, dados: DadosCliente) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("clientes")
    .update({ ...dados, updated_by: perfil.id })
    .eq("id", id);

  if (error) throw new Error(traduzirErro(error.message));
}

/** Cliente não é apagado: inativar preserva o histórico de atendimentos. */
export async function inativarCliente(id: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("clientes")
    .update({ status: "inativo", updated_by: perfil.id })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Filiais ─────────────────────────────────────────────────────────────────

export async function listarFiliais(clienteId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("filiais")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("matriz", { ascending: false })
    .order("nome");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function salvarFilial(dados: DadosFilial, id?: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase.from("filiais").update(dados).eq("id", id);
    if (error) throw new Error(traduzirErro(error.message));
    return id;
  }

  const { data, error } = await supabase
    .from("filiais")
    .insert({ ...dados, org_id: perfil.org_id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

// ─── Contatos ────────────────────────────────────────────────────────────────

export async function listarContatos(clienteId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("cliente_contatos")
    .select("*, filiais(nome)")
    .eq("cliente_id", clienteId)
    .order("ativo", { ascending: false })
    .order("principal", { ascending: false })
    .order("nome");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Contato não é apagado: excluir preserva o vínculo com atendimentos antigos. */
export async function inativarContato(id: string) {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("cliente_contatos")
    .update({ ativo: false, principal: false })
    .eq("id", id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function reativarContato(id: string) {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("cliente_contatos").update({ ativo: true }).eq("id", id);
  if (error) throw new Error(traduzirErro(error.message));
}

export async function salvarContato(dados: DadosContato, id?: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  // Só um contato principal por cliente: o banco garante com índice único, então
  // rebaixamos o anterior antes de gravar, ou a inserção seria recusada.
  if (dados.principal) {
    let rebaixar = supabase
      .from("cliente_contatos")
      .update({ principal: false })
      .eq("cliente_id", dados.cliente_id)
      .eq("principal", true);

    if (id) rebaixar = rebaixar.neq("id", id);

    const { error } = await rebaixar;
    if (error) throw new Error(error.message);
  }

  if (id) {
    const { error } = await supabase.from("cliente_contatos").update(dados).eq("id", id);
    if (error) throw new Error(traduzirErro(error.message));
    return id;
  }

  const { data, error } = await supabase
    .from("cliente_contatos")
    .insert({ ...dados, org_id: perfil.org_id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

// ─── Sistemas instalados ─────────────────────────────────────────────────────

export async function listarSistemasDoCliente(clienteId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes_sistemas")
    .select("*, sistemas(nome, fabricante), filiais(nome)")
    .eq("cliente_id", clienteId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function salvarSistemaDoCliente(dados: DadosClienteSistema, id?: string) {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase.from("clientes_sistemas").update(dados).eq("id", id);
    if (error) throw new Error(traduzirErro(error.message));
    return id;
  }

  const { data, error } = await supabase
    .from("clientes_sistemas")
    .insert({ ...dados, org_id: perfil.org_id })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

export async function removerSistemaDoCliente(id: string) {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes_sistemas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Indicadores da ficha ────────────────────────────────────────────────────

export async function contarAtendimentosDoCliente(clienteId: string) {
  const supabase = await criarClienteServidor();

  const [abertos, total] = await Promise.all([
    supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", clienteId)
      .in("status", ["aberto", "em_andamento", "aguardando_cliente", "aguardando_terceiro", "agendado"]),
    supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", clienteId),
  ]);

  return { abertos: abertos.count ?? 0, total: total.count ?? 0 };
}

/** Perfil do usuário logado, útil para decidir o que a UI habilita. */
export async function perfilAtual() {
  return exigirPerfil();
}
