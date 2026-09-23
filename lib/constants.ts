/**
 * Vocabulário do domínio.
 *
 * Estes valores espelham os enums do Postgres criados na Fase 2 — ao alterar um
 * lado, altere o outro. Os rótulos e cores são usados em badges e filtros.
 */

export const STATUS_ATENDIMENTO = {
  aberto: { rotulo: "Aberto", cor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  em_andamento: {
    rotulo: "Em andamento",
    cor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  aguardando_cliente: {
    rotulo: "Aguardando cliente",
    cor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  aguardando_terceiro: {
    rotulo: "Aguardando terceiro",
    cor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  agendado: {
    rotulo: "Agendado",
    cor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  },
  resolvido: {
    rotulo: "Resolvido",
    cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  cancelado: {
    rotulo: "Cancelado",
    cor: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
} as const;

export const PRIORIDADES = {
  baixa: {
    rotulo: "Baixa",
    cor: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  media: { rotulo: "Média", cor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  alta: {
    rotulo: "Alta",
    cor: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  urgente: { rotulo: "Urgente", cor: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
} as const;

export const CANAIS = {
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
  presencial: "Presencial",
  acesso_remoto: "Acesso remoto",
  chat: "Chat",
  interno: "Interno",
} as const;

export const TIPOS_ATENDIMENTO = {
  duvida: "Dúvida",
  erro: "Erro",
  treinamento: "Treinamento",
  implantacao: "Implantação",
  melhoria: "Melhoria",
  manutencao: "Manutenção",
  consultoria: "Consultoria",
} as const;

export const STATUS_PENDENCIA = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
} as const;

export const RESPONSAVEL_PENDENCIA = {
  eu: "Eu",
  cliente: "Cliente",
  terceiro: "Terceiro",
} as const;

export const TIPOS_EVENTO = {
  retorno: "Retorno",
  visita: "Visita",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  lembrete: "Lembrete",
  manutencao_preventiva: "Manutenção preventiva",
} as const;

export const TIPOS_INTERACAO = {
  nota: "Nota",
  ligacao: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  acesso_remoto: "Acesso remoto",
  visita: "Visita",
  mudanca_status: "Mudança de status",
  anexo: "Anexo",
  sistema: "Sistema",
} as const;

export type StatusAtendimento = keyof typeof STATUS_ATENDIMENTO;
export type Prioridade = keyof typeof PRIORIDADES;
export type Canal = keyof typeof CANAIS;
export type TipoAtendimento = keyof typeof TIPOS_ATENDIMENTO;
export type StatusPendencia = keyof typeof STATUS_PENDENCIA;
export type TipoEvento = keyof typeof TIPOS_EVENTO;
export type TipoInteracao = keyof typeof TIPOS_INTERACAO;

export const STATUS_TOPICO_CONSULTORIA = {
  pendente: {
    rotulo: "Pendente",
    cor: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  em_andamento: {
    rotulo: "Em andamento",
    cor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  concluido: {
    rotulo: "Concluído",
    cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  cancelado: {
    rotulo: "Cancelado",
    cor: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
} as const;

export type StatusTopicoConsultoria = keyof typeof STATUS_TOPICO_CONSULTORIA;

/** Status em que o atendimento continua consumindo atenção. */
export const STATUS_EM_ABERTO: StatusAtendimento[] = [
  "aberto",
  "em_andamento",
  "aguardando_cliente",
  "aguardando_terceiro",
  "agendado",
];
