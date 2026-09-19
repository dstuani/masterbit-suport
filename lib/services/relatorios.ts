import { format, parseISO, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

import { criarClienteServidor } from "@/lib/supabase/server";
import { traduzirErro } from "@/lib/services/erros";
import { STATUS_ATENDIMENTO, PRIORIDADES, TIPOS_ATENDIMENTO, CANAIS } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type LinhaLista = Database["public"]["Views"]["atendimentos_lista"]["Row"];

export type ItemGrafico = {
  chave: string;
  rotulo: string;
  total: number;
  minutos: number;
};

export type DadosRelatorio = {
  total: number;
  resolvidos: number;
  cancelados: number;
  emAberto: number;
  tempoTotalMinutos: number;
  tempoMedioMinutos: number;
  porStatus: ItemGrafico[];
  porPrioridade: ItemGrafico[];
  porTipo: ItemGrafico[];
  porCanal: ItemGrafico[];
  porCliente: { nome: string; total: number; minutos: number }[];
  porCategoria: { nome: string; total: number; minutos: number }[];
  evolucaoMensal: { mes: string; rotulo: string; criados: number; resolvidos: number }[];
  itens: LinhaLista[];
};

function agrupar<T>(itens: T[], chave: (item: T) => string | null): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item) ?? "—";
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(item);
  }
  return mapa;
}

export async function obterRelatorio(de: string, ate: string): Promise<DadosRelatorio> {
  const supabase = await criarClienteServidor();

  const [criados, resolvidosPeriodo] = await Promise.all([
    supabase
      .from("atendimentos_lista")
      .select("*")
      .gte("iniciado_em", `${de}T00:00:00`)
      .lte("iniciado_em", `${ate}T23:59:59`)
      .order("iniciado_em"),

    // Resolvidos pelo finalizado_em (para o gráfico de evolução)
    supabase
      .from("atendimentos")
      .select("finalizado_em")
      .eq("status", "resolvido")
      .not("finalizado_em", "is", null)
      .gte("finalizado_em", `${de}T00:00:00`)
      .lte("finalizado_em", `${ate}T23:59:59`),
  ]);

  if (criados.error) throw new Error(traduzirErro(criados.error.message));

  const dados = criados.data ?? [];
  const resolvidosData = resolvidosPeriodo.data ?? [];

  const resolvidos = dados.filter((d) => d.status === "resolvido");
  const cancelados = dados.filter((d) => d.status === "cancelado");
  const emAberto = dados.filter(
    (d) =>
      d.status === "aberto" ||
      d.status === "em_andamento" ||
      d.status === "aguardando_cliente" ||
      d.status === "aguardando_terceiro" ||
      d.status === "agendado",
  );

  const tempoTotalMinutos = dados.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0);
  const tempoMedioMinutos =
    resolvidos.length > 0
      ? Math.round(
          resolvidos.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0) / resolvidos.length,
        )
      : 0;

  const porStatus: ItemGrafico[] = Object.entries(STATUS_ATENDIMENTO)
    .map(([chave, info]) => {
      const grupo = dados.filter((d) => d.status === chave);
      return {
        chave,
        rotulo: info.rotulo,
        total: grupo.length,
        minutos: grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
      };
    })
    .filter((i) => i.total > 0)
    .sort((a, b) => b.total - a.total);

  const porPrioridade: ItemGrafico[] = Object.entries(PRIORIDADES)
    .map(([chave, info]) => {
      const grupo = dados.filter((d) => d.prioridade === chave);
      return {
        chave,
        rotulo: info.rotulo,
        total: grupo.length,
        minutos: grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
      };
    })
    .filter((i) => i.total > 0);

  const porTipo: ItemGrafico[] = Object.entries(TIPOS_ATENDIMENTO)
    .map(([chave, rotulo]) => {
      const grupo = dados.filter((d) => d.tipo === chave);
      return {
        chave,
        rotulo,
        total: grupo.length,
        minutos: grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
      };
    })
    .filter((i) => i.total > 0)
    .sort((a, b) => b.total - a.total);

  const porCanal: ItemGrafico[] = Object.entries(CANAIS)
    .map(([chave, rotulo]) => {
      const grupo = dados.filter((d) => d.canal === chave);
      return {
        chave,
        rotulo,
        total: grupo.length,
        minutos: grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
      };
    })
    .filter((i) => i.total > 0)
    .sort((a, b) => b.total - a.total);

  const clienteMap = agrupar(dados, (d) => d.cliente_nome);
  const porCliente = Array.from(clienteMap.entries())
    .map(([nome, grupo]) => ({
      nome,
      total: grupo.length,
      minutos: grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const categoriaMap = agrupar(dados, (d) => d.categoria_nome);
  const porCategoria = Array.from(categoriaMap.entries())
    .map(([nome, grupo]) => ({
      nome: nome === "—" ? "Sem categoria" : nome,
      total: grupo.length,
      minutos: grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total);

  let evolucaoMensal: DadosRelatorio["evolucaoMensal"] = [];
  try {
    const deDate = parseISO(`${de}T00:00:00`);
    const ateDate = parseISO(`${ate}T00:00:00`);
    const meses = eachMonthOfInterval({ start: deDate, end: ateDate });
    evolucaoMensal = meses.map((mes) => {
      const mesStr = format(mes, "yyyy-MM");
      const criados = dados.filter((d) => d.iniciado_em?.startsWith(mesStr)).length;
      const resolv = resolvidosData.filter((d) => d.finalizado_em?.startsWith(mesStr)).length;
      return {
        mes: mesStr,
        rotulo: format(mes, "MMM/yy", { locale: ptBR }),
        criados,
        resolvidos: resolv,
      };
    });
  } catch {
    // datas inválidas — ignora evolução
  }

  return {
    total: dados.length,
    resolvidos: resolvidos.length,
    cancelados: cancelados.length,
    emAberto: emAberto.length,
    tempoTotalMinutos,
    tempoMedioMinutos,
    porStatus,
    porPrioridade,
    porTipo,
    porCanal,
    porCliente,
    porCategoria,
    evolucaoMensal,
    itens: dados,
  };
}
