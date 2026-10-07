import { z } from "zod";

export const STATUS_SOLICITACAO = ["nova", "tratada", "descartada"] as const;

export const mudarStatusSolicitacaoSchema = z.object({
  id: z.uuid("Solicitação inválida"),
  status: z.enum(STATUS_SOLICITACAO, "Situação inválida"),
});

export type DadosMudarStatusSolicitacao = z.infer<typeof mudarStatusSolicitacaoSchema>;
