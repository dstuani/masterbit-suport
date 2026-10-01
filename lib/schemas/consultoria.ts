import { z } from "zod";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null));

export const STATUS_TOPICO = ["pendente", "em_andamento", "concluido", "cancelado"] as const;

export const topicoSchema = z.object({
  projeto_id: z.uuid(),
  codigo: textoOpcional,
  titulo: z.string().trim().min(3, "Descreva o tópico"),
  descricao: textoOpcional,
});

export const statusTopicoSchema = z.object({
  id: z.uuid(),
  status: z.enum(STATUS_TOPICO, "Status inválido"),
});

export const progressoTopicoSchema = z.object({
  id: z.uuid(),
  progresso: z.coerce
    .number("Informe um número")
    .int("Use um número inteiro")
    .min(0, "O progresso vai de 0 a 100")
    .max(100, "O progresso vai de 0 a 100"),
});

export const comentarioSchema = z.object({
  topico_id: z.uuid(),
  conteudo: z.string().trim().min(1, "Escreva um comentário"),
});

export type DadosTopico = z.infer<typeof topicoSchema>;
export type DadosStatusTopico = z.infer<typeof statusTopicoSchema>;
export type DadosProgressoTopico = z.infer<typeof progressoTopicoSchema>;
export type DadosComentario = z.infer<typeof comentarioSchema>;
