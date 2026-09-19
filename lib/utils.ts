import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Junta classes Tailwind resolvendo conflitos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarData(valor: string | Date | null | undefined, padrao = "dd/MM/yyyy") {
  if (!valor) return "—";
  return format(new Date(valor), padrao, { locale: ptBR });
}

export function formatarDataHora(valor: string | Date | null | undefined) {
  return formatarData(valor, "dd/MM/yyyy 'às' HH:mm");
}

export function formatarRelativo(valor: string | Date | null | undefined) {
  if (!valor) return "—";
  return formatDistanceToNow(new Date(valor), { addSuffix: true, locale: ptBR });
}

/** Converte minutos em "2h 15min", como aparece no tempo gasto do atendimento. */
export function formatarDuracao(minutos: number | null | undefined) {
  if (!minutos) return "0min";
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h ${resto}min`;
}

export function formatarMoeda(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor ?? 0);
}

export function formatarDocumento(documento: string | null | undefined) {
  if (!documento) return "—";
  const digitos = documento.replace(/\D/g, "");
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return documento;
}
