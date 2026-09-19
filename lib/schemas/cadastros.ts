import { z } from "zod";

/**
 * Schemas dos cadastros da Fase 2.
 *
 * Fonte única de verdade da validação: o mesmo schema valida o formulário no
 * cliente e revalida na Server Action. Server Actions são endpoints POST
 * públicos — validar só no formulário não protege nada.
 */

/**
 * Campos opcionais.
 *
 * Todos aceitam ausente além de vazio: um <select> ou <input> desabilitado não
 * entra no FormData, e o campo chegaria como `undefined`. Sem isso o formulário
 * reprova por um campo que ele mesmo decidiu não enviar.
 */
const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null));

const emailOpcional = textoOpcional.refine(
  (valor) => valor === null || z.email().safeParse(valor).success,
  "E-mail inválido",
);

const ufOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor.toUpperCase() : null))
  .refine((valor) => valor === null || /^[A-Z]{2}$/.test(valor), "UF deve ter 2 letras");

const numeroOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? Number(valor.replace(",", ".")) : null))
  .refine((valor) => valor === null || Number.isFinite(valor), "Número inválido");

const inteiroOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? Number.parseInt(valor, 10) : null))
  .refine((valor) => valor === null || Number.isInteger(valor), "Informe um número inteiro");

/** Guarda só os dígitos; a formatação é responsabilidade da exibição. */
const documentoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => {
    const digitos = (valor ?? "").replace(/\D/g, "");
    return digitos.length === 0 ? null : digitos;
  })
  .refine(
    (valor) => valor === null || valor.length === 11 || valor.length === 14,
    "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)",
  );

const uuidOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null))
  .refine((valor) => valor === null || z.uuid().safeParse(valor).success, "Seleção inválida");

// ─── Cliente ─────────────────────────────────────────────────────────────────

export const clienteSchema = z.object({
  razao_social: z.string().trim().min(2, "Informe a razão social"),
  nome_fantasia: textoOpcional,
  tipo: z.enum(["PJ", "PF"]),
  documento: documentoOpcional,
  codigo: textoOpcional,
  status: z.enum(["ativo", "inativo", "prospect"]),
  segmento: textoOpcional,
  cep: textoOpcional,
  logradouro: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: ufOpcional,
  email: emailOpcional,
  telefone: textoOpcional,
  site: textoOpcional,
  contrato_tipo: z.enum(["avulso", "mensal", "pacote_horas"]),
  horas_contratadas: numeroOpcional,
  observacoes: textoOpcional,
});

export type DadosCliente = z.infer<typeof clienteSchema>;

// ─── Filial ──────────────────────────────────────────────────────────────────

export const filialSchema = z.object({
  cliente_id: z.uuid(),
  nome: z.string().trim().min(2, "Informe o nome da filial"),
  codigo: textoOpcional,
  cep: textoOpcional,
  logradouro: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: ufOpcional,
  telefone: textoOpcional,
  responsavel: textoOpcional,
  matriz: z.coerce.boolean(),
  ativo: z.coerce.boolean(),
});

export type DadosFilial = z.infer<typeof filialSchema>;

// ─── Contato ─────────────────────────────────────────────────────────────────

export const contatoSchema = z.object({
  cliente_id: z.uuid(),
  filial_id: uuidOpcional,
  nome: z.string().trim().min(2, "Informe o nome do contato"),
  cargo: textoOpcional,
  setor: textoOpcional,
  email: emailOpcional,
  telefone: textoOpcional,
  whatsapp: textoOpcional,
  principal: z.coerce.boolean(),
  observacoes: textoOpcional,
  ativo: z.coerce.boolean(),
});

export type DadosContato = z.infer<typeof contatoSchema>;

// ─── Sistema ─────────────────────────────────────────────────────────────────

export const sistemaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do sistema"),
  fabricante: textoOpcional,
  versao_atual: textoOpcional,
  tipo: z.enum(["erp", "fiscal", "sistema_proprio", "infraestrutura", "outro"]),
  descricao: textoOpcional,
  ativo: z.coerce.boolean(),
});

export type DadosSistema = z.infer<typeof sistemaSchema>;

// ─── Sistema instalado no cliente ────────────────────────────────────────────

export const clienteSistemaSchema = z.object({
  cliente_id: z.uuid(),
  sistema_id: z.uuid("Selecione o sistema"),
  filial_id: uuidOpcional,
  versao_instalada: textoOpcional,
  data_implantacao: textoOpcional,
  ambiente: z.enum(["producao", "homologacao", "teste"]),
  licencas: inteiroOpcional,
  observacoes: textoOpcional,
  ativo: z.coerce.boolean(),
});

export type DadosClienteSistema = z.infer<typeof clienteSistemaSchema>;

// ─── Categoria e subcategoria ────────────────────────────────────────────────

export const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria"),
  cor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato #RRGGBB"),
  ordem: z.coerce.number().int().min(0),
  ativo: z.coerce.boolean(),
});

export const subcategoriaSchema = z.object({
  categoria_id: z.uuid(),
  nome: z.string().trim().min(2, "Informe o nome da subcategoria"),
  ordem: z.coerce.number().int().min(0),
  sla_horas: inteiroOpcional,
  ativo: z.coerce.boolean(),
});

// ─── Utilitário ──────────────────────────────────────────────────────────────

/**
 * Converte FormData em objeto tratando checkbox: um checkbox desmarcado não é
 * enviado, então os campos booleanos precisam de um valor explícito.
 */
export function dadosDoFormulario(formData: FormData, booleanos: string[] = []) {
  const dados: Record<string, unknown> = Object.fromEntries(formData.entries());
  for (const campo of booleanos) {
    dados[campo] = formData.get(campo) === "on" || formData.get(campo) === "true";
  }
  return dados;
}
