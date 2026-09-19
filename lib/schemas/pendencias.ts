import { z } from "zod";

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

const dataOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null))
  .refine((valor) => valor === null || !Number.isNaN(Date.parse(valor)), "Data inválida");

export const PRIORIDADE_PENDENCIA = ["baixa", "media", "alta", "urgente"] as const;
export const RESPONSAVEL_PENDENCIA = ["eu", "cliente", "terceiro"] as const;
export const STATUS_PENDENCIA = ["aberta", "em_andamento", "concluida", "cancelada"] as const;

// ─── Criação ─────────────────────────────────────────────────────────────────

export const pendenciaSchema = z
  .object({
    cliente_id: uuidOpcional,
    atendimento_id: uuidOpcional,
    titulo: z.string().trim().min(3, "Descreva o que ficou pendente"),
    descricao: textoOpcional,
    responsavel_tipo: z.enum(RESPONSAVEL_PENDENCIA),
    terceiro_nome: textoOpcional,
    prioridade: z.enum(PRIORIDADE_PENDENCIA),
    prazo: dataOpcional,
  })
  .refine((d) => d.cliente_id !== null || d.atendimento_id !== null, {
    message: "Informe o cliente ou o atendimento de origem",
    path: ["cliente_id"],
  })
  .refine(
    (d) =>
      d.responsavel_tipo !== "terceiro" ||
      (d.terceiro_nome !== null && d.terceiro_nome.trim().length > 0),
    { message: "Informe quem é o terceiro responsável", path: ["terceiro_nome"] },
  );

export type DadosPendencia = z.infer<typeof pendenciaSchema>;

// ─── Conclusão ───────────────────────────────────────────────────────────────

export const conclusaoPendenciaSchema = z.object({
  id: z.uuid(),
  resultado: z.string().trim().min(3, "Registre como foi resolvida"),
});

export type DadosConclusaoPendencia = z.infer<typeof conclusaoPendenciaSchema>;

// ─── Mudança de status ───────────────────────────────────────────────────────

export const mudarStatusPendenciaSchema = z.object({
  id: z.uuid(),
  status: z.enum(["aberta", "em_andamento"] as const),
});

export type DadosMudarStatusPendencia = z.infer<typeof mudarStatusPendenciaSchema>;

// ─── Cancelamento ────────────────────────────────────────────────────────────

export const cancelarPendenciaSchema = z.object({
  id: z.uuid(),
});
