import { randomBytes } from "node:crypto";

import { exigirPerfil, exigirPermissaoDeEscrita, type Perfil } from "@/lib/auth";
import type {
  DadosAtribuicao,
  DadosCriarUsuario,
  DadosPapel,
  DadosPerfil,
  DadosSituacao,
} from "@/lib/schemas/equipe";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type MembroEquipe = Pick<
  Perfil,
  "id" | "nome" | "email" | "telefone" | "role" | "ativo" | "created_at"
>;

export type RegistroAuditoria = Database["public"]["Tables"]["audit_logs"]["Row"] & {
  ator_nome: string | null;
};

export const POR_PAGINA_AUDITORIA = 50;

/** Tabelas auditadas por trigger (ver migration de auditoria). */
export const TABELAS_AUDITADAS: Record<string, string> = {
  clientes: "Clientes",
  atendimentos: "Atendimentos",
  pendencias: "Pendências",
  profiles: "Usuários",
  clientes_sistemas: "Sistemas do cliente",
  consultoria_topicos: "Tópicos de consultoria",
};

async function exigirOwner(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (perfil.role !== "owner") throw new Error("Somente o owner pode fazer isso");
  return perfil;
}

export async function listarEquipe(): Promise<MembroEquipe[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, telefone, role, ativo, created_at")
    .order("ativo", { ascending: false })
    .order("nome");

  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

// Sem caracteres ambíguos (0/O, 1/l/I): a senha é lida em voz alta ou digitada por
// outra pessoa ao repassar, e um erro de leitura não pode virar um acesso travado.
const ALFABETO_DA_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function gerarSenhaTemporaria(tamanho = 12): string {
  const bytes = randomBytes(tamanho);
  return Array.from(bytes, (byte) => ALFABETO_DA_SENHA[byte % ALFABETO_DA_SENHA.length]).join("");
}

export type UsuarioCriado = { id: string; senhaTemporaria: string };

/**
 * Cria o usuário direto pelo sistema, sem passar pelo painel do Supabase.
 *
 * Usa a service role key (via criarClienteAdmin) só para o insert em auth.users —
 * é o único jeito de criar login sem a pessoa se autocadastrar. O profile nasce
 * pelo trigger de cadastro (tratar_novo_usuario), sempre como técnico; se o papel
 * pedido for outro, ajusta logo em seguida com a sessão normal do owner, para o
 * RLS e o trigger de proteção de papel continuarem valendo nessa parte.
 *
 * A senha é temporária de propósito: não há como enviar e-mail sem configurar um
 * servidor de e-mail (SMTP) no Supabase, então o owner repassa por fora e a pessoa
 * troca no primeiro acesso, em Configurações → Conta.
 */
export async function criarUsuario(dados: DadosCriarUsuario): Promise<UsuarioCriado> {
  await exigirOwner();

  const admin = criarClienteAdmin();
  const senhaTemporaria = gerarSenhaTemporaria();

  const { data, error } = await admin.auth.admin.createUser({
    email: dados.email,
    password: senhaTemporaria,
    email_confirm: true,
    user_metadata: { nome: dados.nome },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      throw new Error("Já existe um usuário com este e-mail.");
    }
    throw new Error(error.message);
  }

  if (dados.role !== "tecnico") {
    const supabase = await criarClienteServidor();
    const { error: erroPapel } = await supabase
      .from("profiles")
      .update({ role: dados.role })
      .eq("id", data.user.id);

    if (erroPapel) throw new Error(traduzirErro(erroPapel.message));
  }

  return { id: data.user.id, senhaTemporaria };
}

/** Usuários ativos que podem receber atendimentos (papel de escrita). */
export async function listarResponsaveis(): Promise<{ id: string; nome: string }[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome")
    .eq("ativo", true)
    .in("role", ["owner", "tecnico"])
    .order("nome");

  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

export async function atualizarMeuPerfil(dados: DadosPerfil): Promise<void> {
  const perfil = await exigirPerfil();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("profiles")
    .update({ nome: dados.nome, telefone: dados.telefone })
    .eq("id", perfil.id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function alterarMinhaSenha(senha: string): Promise<void> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw new Error(error.message);
}

export async function alterarPapel(dados: DadosPapel): Promise<void> {
  const owner = await exigirOwner();
  if (dados.id === owner.id) throw new Error("Você não pode alterar o próprio papel");

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update({ role: dados.role }).eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function alterarSituacao(dados: DadosSituacao): Promise<void> {
  const owner = await exigirOwner();
  if (dados.id === owner.id) throw new Error("Você não pode desativar a própria conta");

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update({ ativo: dados.ativo }).eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));
}

/**
 * Atribui o atendimento a outro usuário. O destino precisa ser ativo e com papel
 * de escrita — atribuir a um visualizador criaria um atendimento que ninguém move.
 */
export async function atribuirAtendimento(dados: DadosAtribuicao): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data: destino } = await supabase
    .from("profiles")
    .select("id, ativo, role")
    .eq("id", dados.responsavel_id)
    .maybeSingle();

  if (!destino || !destino.ativo || destino.role === "visualizador") {
    throw new Error("Este usuário não pode receber atendimentos");
  }

  const { error } = await supabase
    .from("atendimentos")
    .update({ responsavel_id: dados.responsavel_id, updated_by: perfil.id })
    .eq("id", dados.atendimento_id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function listarAuditoria(
  filtros: { tabela?: string; atorId?: string },
  pagina = 1,
): Promise<{ itens: RegistroAuditoria[]; total: number; paginas: number }> {
  await exigirOwner();
  const supabase = await criarClienteServidor();
  const inicio = (pagina - 1) * POR_PAGINA_AUDITORIA;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(inicio, inicio + POR_PAGINA_AUDITORIA - 1);

  if (filtros.tabela && filtros.tabela in TABELAS_AUDITADAS) {
    query = query.eq("tabela", filtros.tabela);
  }
  if (filtros.atorId) query = query.eq("actor_id", filtros.atorId);

  const { data, error, count } = await query;
  if (error) throw new Error(traduzirErro(error.message));

  const nomes = new Map((await listarEquipe()).map((m) => [m.id, m.nome]));
  const total = count ?? 0;

  return {
    itens: (data ?? []).map((r) => ({
      ...r,
      ator_nome: r.actor_id ? (nomes.get(r.actor_id) ?? null) : null,
    })),
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA_AUDITORIA)),
  };
}
