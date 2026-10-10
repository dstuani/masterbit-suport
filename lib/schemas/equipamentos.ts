import { z } from "zod";

import type { EstadoFormulario } from "@/lib/forms";

// Campo desabilitado não entra no FormData: os opcionais aceitam ausente além de vazio.
const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Até ${maximo} caracteres`)
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null));

const uuidOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor && valor.length > 0 ? valor : null))
  .refine((valor) => valor === null || z.uuid().safeParse(valor).success, "Seleção inválida");

export const TIPO_EQUIPAMENTO = ["computador", "notebook", "servidor", "impressora", "outro"] as const;

const camposDoEquipamento = {
  filial_id: uuidOpcional,
  nome: z.string().trim().min(1, "Informe o nome").max(120, "Até 120 caracteres"),
  tipo: z.enum(TIPO_EQUIPAMENTO, "Tipo inválido"),
  patrimonio: textoOpcional(60),
  setor: textoOpcional(80),
  numero_serie: textoOpcional(120),
  observacoes: textoOpcional(2000),
};

export const equipamentoSchema = z.object({
  cliente_id: z.uuid("Escolha o cliente"),
  ...camposDoEquipamento,
});

/** Na edição o cliente não muda: a máquina coletada continuaria chegando pela chave do cliente antigo. */
export const edicaoEquipamentoSchema = z.object({
  id: z.uuid("Equipamento inválido"),
  ...camposDoEquipamento,
});

export const situacaoEquipamentoSchema = z.object({
  id: z.uuid("Equipamento inválido"),
  ativo: z.enum(["true", "false"]).transform((v) => v === "true"),
});

// datetime-local chega sem fuso ("2026-10-10T14:30"); o banco o leria como UTC. O Brasil
// não tem horário de verão desde 2019, então -03:00 fixo é o horário de Brasília.
const dataHoraLocal = z
  .string()
  .trim()
  .min(1, "Informe a data")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida")
  .transform((v) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00-03:00` : v));

export const TIPO_MANUTENCAO = ["preventiva", "corretiva", "troca_peca", "instalacao", "limpeza", "outro"] as const;

// "289,90", "1.289,90" ou "289.90": com vírgula, o ponto é separador de milhar.
const dinheiro = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    const limpo = (v ?? "").replace(/R\$|\s/g, "");
    if (limpo.length === 0) return null;
    const numero = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
    return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : Number.NaN;
  })
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 0 && v <= 1_000_000), "Valor inválido. Ex.: 289,90");

export const manutencaoSchema = z
  .object({
    equipamento_id: z.uuid("Equipamento inválido"),
    realizada_em: dataHoraLocal,
    descricao: z.string().trim().min(3, "Descreva o que foi feito").max(4000, "Até 4.000 caracteres"),
    tempo_minutos: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? Number.parseInt(v, 10) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 10080), "Informe os minutos (0 a 10.080)"),
    atendimento_id: uuidOpcional,
    tipo: z.enum(TIPO_MANUTENCAO, "Escolha o tipo"),
    peca_retirada: textoOpcional(200),
    peca_instalada: textoOpcional(200),
    custo: dinheiro,
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "troca_peca" && !d.peca_retirada && !d.peca_instalada) {
      ctx.addIssue({ code: "custom", path: ["peca_instalada"], message: "Informe a peça instalada ou a retirada" });
    }
  });

export const gerarChaveSchema = z.object({
  cliente_id: z.uuid("Cliente inválido"),
  descricao: textoOpcional(80),
});

export const revogarChaveSchema = z.object({
  id: z.uuid("Chave inválida"),
  cliente_id: z.uuid("Cliente inválido"),
});

export type DadosEquipamento = z.infer<typeof equipamentoSchema>;
export type DadosEdicaoEquipamento = z.infer<typeof edicaoEquipamentoSchema>;
export type DadosManutencao = z.infer<typeof manutencaoSchema>;

/** Resposta de "gerar chave": a chave e o script só existem nesta resposta — o banco guarda o hash. */
export type EstadoChave = EstadoFormulario & { chave?: string; script?: string };
