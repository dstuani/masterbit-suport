import { z } from "zod";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null));

export const ROLES = ["owner", "tecnico", "visualizador"] as const;

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  telefone: textoOpcional,
});

export const senhaSchema = z
  .object({
    senha: z.string().min(8, "Use ao menos 8 caracteres"),
    confirmacao: z.string(),
  })
  .refine((v) => v.senha === v.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não conferem",
  });

export const papelSchema = z.object({
  id: z.uuid("Usuário inválido"),
  role: z.enum(ROLES, "Papel inválido"),
});

export const situacaoSchema = z.object({
  id: z.uuid("Usuário inválido"),
  ativo: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const atribuicaoSchema = z.object({
  atendimento_id: z.uuid("Atendimento inválido"),
  responsavel_id: z.uuid("Selecione o responsável"),
});

export type DadosPerfil = z.infer<typeof perfilSchema>;
export type DadosPapel = z.infer<typeof papelSchema>;
export type DadosSituacao = z.infer<typeof situacaoSchema>;
export type DadosAtribuicao = z.infer<typeof atribuicaoSchema>;
