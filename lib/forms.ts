/**
 * Contrato entre os formulários e as Server Actions.
 *
 * Fica fora dos arquivos "use server" de propósito: um módulo com essa diretiva
 * só pode exportar funções assíncronas, então tipos e constantes precisam morar
 * aqui — do contrário o build falha ao coletar as rotas.
 */

export type EstadoFormulario = {
  erro: string | null;
  /** Mensagens por campo, exibidas junto do input que falhou. */
  campos?: Record<string, string>;
};

export const estadoInicial: EstadoFormulario = { erro: null };

/** Converte os erros do Zod no formato que os formulários consomem. */
export function erroDeValidacao(
  issues: { path: PropertyKey[]; message: string }[],
): EstadoFormulario {
  const campos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !campos[campo]) campos[campo] = issue.message;
  }

  // Com um problema só, mostrar a mensagem dele no topo: "confira os campos
  // destacados" não ajuda quando o campo com defeito é um que o formulário nem
  // exibe — o usuário fica procurando um destaque que não existe.
  const total = Object.keys(campos).length;
  const erro =
    total === 1
      ? Object.values(campos)[0]
      : total > 1
        ? "Confira os campos destacados."
        : (issues[0]?.message ?? "Dados inválidos.");

  return { erro, campos };
}

export function mensagemDoErro(erro: unknown) {
  return erro instanceof Error ? erro.message : "Não foi possível salvar.";
}
