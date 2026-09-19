import { z } from "zod";

/** Schemas do atendimento. Validam no formulário e revalidam na Server Action. */

// Um <select> ou <input> desabilitado não é enviado no FormData, e um campo
// ausente chegaria aqui como `undefined`. Por isso todos os opcionais aceitam
// undefined além de string vazia — do contrário o formulário reprova por um
// campo que o próprio formulário decidiu desabilitar.
const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null));

const uuidOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null))
  .refine((valor) => valor === null || z.uuid().safeParse(valor).success, "Seleção inválida");

const minutos = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? Number.parseInt(valor, 10) : 0))
  .refine(
    (valor) => Number.isInteger(valor) && valor >= 0,
    "Informe os minutos como número inteiro",
  );

export const CANAL = [
  "telefone",
  "whatsapp",
  "email",
  "presencial",
  "acesso_remoto",
  "chat",
  "interno",
] as const;

export const TIPO = [
  "duvida",
  "erro",
  "treinamento",
  "implantacao",
  "melhoria",
  "manutencao",
  "consultoria",
] as const;

export const STATUS = [
  "aberto",
  "em_andamento",
  "aguardando_cliente",
  "aguardando_terceiro",
  "agendado",
  "resolvido",
  "cancelado",
] as const;

export const PRIORIDADE = ["baixa", "media", "alta", "urgente"] as const;

export const TIPO_INTERACAO = [
  "nota",
  "ligacao",
  "email",
  "whatsapp",
  "acesso_remoto",
  "visita",
] as const;

// ─── Abertura ────────────────────────────────────────────────────────────────

export const atendimentoSchema = z.object({
  cliente_id: z.uuid("Selecione o cliente"),
  titulo: z.string().trim().min(3, "Descreva o assunto em poucas palavras"),
  categoria_id: uuidOpcional,
  subcategoria_id: uuidOpcional,
  filial_id: uuidOpcional,
  contato_id: uuidOpcional,
  sistema_id: uuidOpcional,
  responsavel_id: uuidOpcional,
  descricao: textoOpcional,
  canal: z.enum(CANAL),
  tipo: z.enum(TIPO),
  prioridade: z.enum(PRIORIDADE),
});

export type DadosAtendimento = z.infer<typeof atendimentoSchema>;

// ─── Interação ───────────────────────────────────────────────────────────────

export const interacaoSchema = z.object({
  atendimento_id: z.uuid(),
  tipo: z.enum(TIPO_INTERACAO),
  conteudo: z.string().trim().min(1, "Escreva o que foi feito"),
  tempo_gasto_minutos: minutos,
});

export type DadosInteracao = z.infer<typeof interacaoSchema>;

// ─── Mudança de status ───────────────────────────────────────────────────────

export const mudancaStatusSchema = z
  .object({
    atendimento_id: z.uuid(),
    status: z.enum(STATUS),
    aguardando_o_que: textoOpcional,
    observacao: textoOpcional,
  })
  .refine(
    (dados) =>
      (dados.status !== "aguardando_cliente" && dados.status !== "aguardando_terceiro") ||
      (dados.aguardando_o_que !== null && dados.aguardando_o_que.length > 2),
    {
      // Sem isso, "aguardando" vira um limbo: daqui a duas semanas ninguém sabe
      // o que estava sendo esperado nem de quem cobrar.
      message: "Diga o que está sendo aguardado",
      path: ["aguardando_o_que"],
    },
  );

export type DadosMudancaStatus = z.infer<typeof mudancaStatusSchema>;

// ─── Conclusão ───────────────────────────────────────────────────────────────

export const conclusaoSchema = z.object({
  atendimento_id: z.uuid(),
  solucao: z.string().trim().min(5, "Registre como o problema foi resolvido"),
  causa_raiz: textoOpcional,
  tempo_gasto_minutos: minutos,
  faturavel: z.coerce.boolean(),
});

export type DadosConclusao = z.infer<typeof conclusaoSchema>;
