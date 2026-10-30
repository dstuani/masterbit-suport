import { z } from "zod";

export const TIPOS_CONHECIMENTO = ["configuracao", "select"] as const;
export type TipoConhecimento = (typeof TIPOS_CONHECIMENTO)[number];

export const conhecimentoSchema = z.object({
  tipo: z.enum(TIPOS_CONHECIMENTO, "Escolha a sessão"),
  titulo: z.string().trim().min(3, "Informe um título").max(160, "Use até 160 caracteres"),
  // O SQL é guardado como foi digitado (só as pontas são aparadas): recuo e quebras fazem parte dele.
  comando: z.string().trim().min(1, "Informe o comando").max(20000, "Use até 20.000 caracteres"),
});

export type DadosConhecimento = z.infer<typeof conhecimentoSchema>;

export const edicaoConhecimentoSchema = conhecimentoSchema.extend({ id: z.uuid() });
export type DadosEdicaoConhecimento = z.infer<typeof edicaoConhecimentoSchema>;

export const excluirConhecimentoSchema = z.object({ id: z.uuid() });
