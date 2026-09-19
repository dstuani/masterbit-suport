import { z } from "zod";

/**
 * Importação de contatos em lote.
 *
 * O arquivo é lido no navegador e chega aqui já como linhas mapeadas — o
 * servidor nunca recebe a planilha. Mesmo assim tudo é revalidado: a Server
 * Action é um endpoint POST público, e a origem "veio do nosso próprio parser"
 * não é garantia nenhuma.
 */

const texto = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null));

export const linhaImportacaoSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto"),
  cargo: texto,
  setor: texto,
  email: texto.refine(
    (valor) => valor === null || z.email().safeParse(valor).success,
    "E-mail inválido",
  ),
  telefone: texto,
  whatsapp: texto,
  filial: texto,
  observacoes: texto,
});

export type LinhaImportacao = z.infer<typeof linhaImportacaoSchema>;

export const importacaoSchema = z.object({
  cliente_id: z.uuid("Selecione a empresa"),
  /** Cria filiais que aparecem na planilha e ainda não existem no cadastro. */
  criar_filiais: z.boolean(),
  /** Ignora linhas cujo e-mail (ou nome, se não houver e-mail) já existe. */
  ignorar_duplicados: z.boolean(),
  linhas: z.array(linhaImportacaoSchema).min(1, "Nenhuma linha para importar").max(2000),
});

export type DadosImportacao = z.infer<typeof importacaoSchema>;

/** Campos que o importador sabe preencher, na ordem em que aparecem na tela. */
export const CAMPOS_IMPORTAVEIS = [
  { chave: "nome", rotulo: "Nome", obrigatorio: true },
  { chave: "cargo", rotulo: "Cargo", obrigatorio: false },
  { chave: "setor", rotulo: "Setor", obrigatorio: false },
  { chave: "email", rotulo: "E-mail", obrigatorio: false },
  { chave: "telefone", rotulo: "Telefone", obrigatorio: false },
  { chave: "whatsapp", rotulo: "WhatsApp", obrigatorio: false },
  { chave: "filial", rotulo: "Filial / unidade", obrigatorio: false },
  { chave: "observacoes", rotulo: "Observações", obrigatorio: false },
] as const;

export type CampoImportavel = (typeof CAMPOS_IMPORTAVEIS)[number]["chave"];

/**
 * Palpite de qual coluna da planilha corresponde a cada campo.
 *
 * Compara sem acento e sem caixa, do mais específico para o mais genérico — daí
 * "whatsapp" ser testado antes de "telefone", que casaria com "telefone celular"
 * e também com "whatsapp / telefone".
 */
const SINONIMOS: Record<CampoImportavel, string[]> = {
  nome: ["nome", "nome completo", "usuario", "usuário", "funcionario", "funcionário", "pessoa", "colaborador"],
  cargo: ["cargo", "funcao", "função", "posicao", "posição"],
  setor: ["setor", "departamento", "area", "área", "depto"],
  email: ["email", "e-mail", "e mail", "correio"],
  whatsapp: ["whatsapp", "whats", "zap", "celular"],
  telefone: ["telefone", "fone", "tel", "ramal", "contato"],
  filial: ["filial", "unidade", "loja", "local", "sede"],
  observacoes: ["observacoes", "observações", "obs", "notas", "anotacoes", "anotações"],
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Sugere o mapeamento coluna → campo a partir dos cabeçalhos da planilha. */
export function sugerirMapeamento(cabecalhos: string[]): Record<CampoImportavel, string> {
  const mapa = {} as Record<CampoImportavel, string>;
  const usados = new Set<string>();

  const ordem: CampoImportavel[] = [
    "nome",
    "email",
    "whatsapp",
    "telefone",
    "cargo",
    "setor",
    "filial",
    "observacoes",
  ];

  for (const campo of ordem) {
    const alvos = SINONIMOS[campo];

    const exato = cabecalhos.find(
      (cabecalho) => !usados.has(cabecalho) && alvos.includes(normalizar(cabecalho)),
    );
    const parcial =
      exato ??
      cabecalhos.find(
        (cabecalho) =>
          !usados.has(cabecalho) && alvos.some((alvo) => normalizar(cabecalho).includes(alvo)),
      );

    mapa[campo] = parcial ?? "";
    if (parcial) usados.add(parcial);
  }

  return mapa;
}
