import { z } from "zod";

const uuidOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null))
  .refine((valor) => valor === null || z.uuid().safeParse(valor).success, "Seleção inválida");

export const conhecimentoSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título").max(160, "Use até 160 caracteres"),
  descricao: z.string().trim().min(3, "Descreva o que o comando faz").max(4000, "Use até 4.000 caracteres"),
  // O SQL é guardado como foi digitado (só as pontas são aparadas): recuo e quebras fazem parte dele.
  comando: z.string().trim().min(1, "Informe o comando").max(20000, "Use até 20.000 caracteres"),
  sistema_id: uuidOpcional,
  categoria_id: uuidOpcional,
});

export type DadosConhecimento = z.infer<typeof conhecimentoSchema>;

export const edicaoConhecimentoSchema = conhecimentoSchema.extend({ id: z.uuid() });
export type DadosEdicaoConhecimento = z.infer<typeof edicaoConhecimentoSchema>;

export const excluirConhecimentoSchema = z.object({ id: z.uuid() });
