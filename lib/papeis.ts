import type { Database } from "@/lib/types/database";

export type Papel = Database["public"]["Enums"]["role_usuario"];

export const ROTULOS_PAPEL: Record<Papel, string> = {
  owner: "Owner",
  tecnico: "Técnico",
  visualizador: "Visualizador",
  solicitante: "Solicitante (cliente)",
  agenda: "Só agenda",
};

/** O que cada papel faz, para a tela Equipe. */
export const DESCRICAO_PAPEL: Record<Papel, string> = {
  owner: "Tudo, inclusive equipe e auditoria.",
  tecnico: "Opera o sistema inteiro.",
  visualizador: "Consulta tudo, sem alterar nada.",
  solicitante: "Funcionário de um cliente: abre atendimentos e acompanha só os que ele abriu.",
  agenda: "Só a agenda: vê, cria e remarca eventos. Não cancela nem exclui.",
};

/**
 * Papéis com acesso restrito. No banco, org_atual() devolve NULL para eles, então
 * nenhuma policy geral se aplica; o que podem fazer está na migration
 * 20261026120100_papeis_restritos.sql. Aqui fica só o lado das telas.
 */
export const PAPEIS_RESTRITOS: readonly Papel[] = ["solicitante", "agenda"];

export function ehRestrito(papel: Papel | null | undefined): boolean {
  return papel !== null && papel !== undefined && PAPEIS_RESTRITOS.includes(papel);
}

/** Rotas que cada papel restrito pode abrir; os demais papéis abrem tudo menos /meus-atendimentos. */
const ROTAS_RESTRITAS: Partial<Record<Papel, string[]>> = {
  solicitante: ["/meus-atendimentos", "/configuracoes"],
  agenda: ["/agenda", "/configuracoes"],
};

/** Primeira tela depois do login. */
export function inicioDoPapel(papel: Papel | null | undefined): string {
  if (papel === "solicitante") return "/meus-atendimentos";
  if (papel === "agenda") return "/agenda";
  return "/dashboard";
}

export function rotaPermitida(papel: Papel | null | undefined, caminho: string): boolean {
  const dentro = (base: string) => caminho === base || caminho.startsWith(`${base}/`);
  const restritas = papel ? ROTAS_RESTRITAS[papel] : undefined;
  if (restritas) return restritas.some(dentro);
  return !dentro("/meus-atendimentos");
}

/** Escreve na agenda: a equipe e o papel "agenda". Espelha as policies de agenda_eventos. */
export function podeEscreverNaAgenda(papel: Papel | null | undefined): boolean {
  return papel === "owner" || papel === "tecnico" || papel === "agenda";
}
