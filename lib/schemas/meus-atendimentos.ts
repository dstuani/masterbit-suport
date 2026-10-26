import { z } from "zod";

/** Pedido aberto pelo funcionário do cliente: só assunto e descrição. */
export const pedidoSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, "Escreva o assunto")
    .max(300, "Use até 300 caracteres")
    .transform((v) => v.toUpperCase()),
  descricao: z.string().trim().min(10, "Conte o que está acontecendo").max(4000, "Use até 4.000 caracteres"),
});

export const mensagemSchema = z.object({
  atendimento_id: z.uuid("Atendimento inválido"),
  conteudo: z.string().trim().min(1, "Escreva a mensagem").max(4000, "Use até 4.000 caracteres"),
});

export type DadosPedido = z.infer<typeof pedidoSchema>;
export type DadosMensagem = z.infer<typeof mensagemSchema>;
