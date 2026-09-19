import { z } from "zod";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const uuidOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || z.uuid().safeParse(v).success, "Seleção inválida");

export const TIPO_EVENTO = [
  "retorno",
  "visita",
  "reuniao",
  "tarefa",
  "lembrete",
  "manutencao_preventiva",
] as const;

export const STATUS_EVENTO = ["agendado", "confirmado", "realizado", "cancelado", "remarcado"] as const;

// ─── Criação ─────────────────────────────────────────────────────────────────

export const eventoSchema = z
  .object({
    titulo: z.string().trim().min(2, "Dê um título ao evento"),
    descricao: textoOpcional,
    tipo: z.enum(TIPO_EVENTO),
    cliente_id: uuidOpcional,
    atendimento_id: uuidOpcional,
    pendencia_id: uuidOpcional,
    inicio: z
      .string()
      .trim()
      .min(1, "Informe a data e hora")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida"),
    fim: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null))
      .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Data inválida"),
    dia_inteiro: z.coerce.boolean(),
    local: textoOpcional,
    lembrete_minutos: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? Number.parseInt(v, 10) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Valor inválido"),
  })
  .refine((d) => d.fim === null || new Date(d.fim) >= new Date(d.inicio), {
    message: "O término não pode ser antes do início",
    path: ["fim"],
  });

export type DadosEvento = z.infer<typeof eventoSchema>;

// ─── Realização (marcar como feito) ──────────────────────────────────────────

export const realizarEventoSchema = z.object({
  id: z.uuid(),
  resultado: textoOpcional,
  // Quando true e o evento tem atendimento_id, grava uma interação no atendimento
  registrar_interacao: z.coerce.boolean(),
});

export type DadosRealizarEvento = z.infer<typeof realizarEventoSchema>;

// ─── Remarcação ───────────────────────────────────────────────────────────────

export const remarcarEventoSchema = z
  .object({
    id: z.uuid(),
    inicio: z
      .string()
      .trim()
      .min(1, "Informe a nova data e hora")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida"),
    fim: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null))
      .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Data inválida"),
    motivo: textoOpcional,
  })
  .refine((d) => d.fim === null || new Date(d.fim) >= new Date(d.inicio), {
    message: "O término não pode ser antes do início",
    path: ["fim"],
  });

export type DadosRemarcarEvento = z.infer<typeof remarcarEventoSchema>;

// ─── Cancelamento ─────────────────────────────────────────────────────────────

export const cancelarEventoSchema = z.object({
  id: z.uuid(),
});
