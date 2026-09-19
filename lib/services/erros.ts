/**
 * Traduz violações de constraint do Postgres em mensagens para o usuário.
 *
 * As constraints são a última linha de defesa e disparam mesmo quando o Zod
 * passou (concorrência, dado antigo, escrita por outra via). Sem esta tradução o
 * formulário mostraria a mensagem crua do banco.
 */
const TRADUCOES: [string, string][] = [
  ["clientes_documento_por_org", "Já existe um cliente com este CPF/CNPJ."],
  ["clientes_codigo_por_org", "Já existe um cliente com este código."],
  ["clientes_uf_valida", "UF inválida."],
  ["filiais_matriz_unica", "Este cliente já tem uma filial marcada como matriz."],
  ["filiais_codigo_por_cliente", "Já existe uma filial com este código neste cliente."],
  ["contatos_principal_unico", "Este cliente já tem um contato principal."],
  ["clientes_sistemas_unico", "Este sistema já está registrado para este cliente nesta filial."],
  ["clientes_sistemas_licencas_positivas", "A quantidade de licenças deve ser maior que zero."],
  ["sistemas_nome_por_org", "Já existe um sistema com este nome."],
  ["categorias_nome_por_org", "Já existe uma categoria com este nome."],
  ["categorias_cor_hex", "Cor inválida: use o formato #RRGGBB."],
  ["subcategorias_nome_por_categoria", "Já existe uma subcategoria com este nome."],
  ["subcategorias_sla_positivo", "O SLA deve ser maior que zero."],
  ["atendimentos_resolvido_tem_solucao", "Registre a solução antes de resolver o atendimento."],
  ["pendencias_tem_origem", "A pendência precisa estar ligada a um atendimento ou a um cliente."],
  ["pendencias_terceiro_identificado", "Informe quem é o terceiro responsável."],
  ["eventos_intervalo_valido", "O término do evento não pode ser antes do início."],
  ["violates foreign key constraint", "Existe registro dependente que impede esta operação."],
  ["row-level security", "Sem permissão para esta operação."],
];

export function traduzirErro(mensagem: string) {
  for (const [marca, texto] of TRADUCOES) {
    if (mensagem.includes(marca)) return texto;
  }
  return mensagem;
}
