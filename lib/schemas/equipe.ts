import { z } from "zod";

import type { EstadoFormulario } from "@/lib/forms";

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

/**
 * Papel na criação: sem "owner" de propósito. Promover a owner é uma ação
 * deliberada à parte, no controle que já existe na lista de usuários — não algo
 * que se escolha de passagem ao preencher um formulário de cadastro.
 */
export const ROLES_PARA_NOVO_USUARIO = ["tecnico", "visualizador"] as const;

export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  email: z.email("E-mail inválido"),
  role: z.enum(ROLES_PARA_NOVO_USUARIO, "Papel inválido"),
});

export type DadosPerfil = z.infer<typeof perfilSchema>;
export type DadosPapel = z.infer<typeof papelSchema>;
export type DadosSituacao = z.infer<typeof situacaoSchema>;
export type DadosAtribuicao = z.infer<typeof atribuicaoSchema>;
export type DadosCriarUsuario = z.infer<typeof criarUsuarioSchema>;

/** Carrega a senha temporária de volta pro formulário — só existe em memória, uma vez. */
export type EstadoCriarUsuario = EstadoFormulario & {
  senhaTemporaria?: string;
  emailCriado?: string;
};
