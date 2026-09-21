import { criarClienteServidor } from "@/lib/supabase/server";
import { STATUS_EM_ABERTO } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type LinhaLista = Database["public"]["Views"]["atendimentos_lista"]["Row"];

/** Quantos dias sem movimento para um atendimento contar como parado. */
export const DIAS_PARA_PARADO = 3;

export type ResumoDashboard = {
  abertos: number;
  emAndamento: number;
  aguardando: number;
  resolvidosNoMes: number;
  pendenciasVencidas: number;
  minutosNoMes: number;
  parados: LinhaLista[];
  aguardandoRetorno: LinhaLista[];
  recentes: LinhaLista[];
  /** Todos os atendimentos, de qualquer status: distingue "sistema vazio" de "nada pendente". */
  totalDeAtendimentos: number;
};

/**
 * Números e listas do dashboard.
 *
 * Tudo em paralelo, e as contagens usam `head: true` — o Postgres devolve só o
 * total, sem trafegar as linhas. Nenhuma agregação é feita no JavaScript.
 */
export async function obterResumo(): Promise<ResumoDashboard> {
  const supabase = await criarClienteServidor();

  const agora = new Date();
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const limiteParado = new Date(
    agora.getTime() - DIAS_PARA_PARADO * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    abertos,
    emAndamento,
    aguardando,
    resolvidosNoMes,
    pendenciasVencidas,
    tempoDoMes,
    parados,
    aguardandoRetorno,
    recentes,
    totalDeAtendimentos,
  ] = await Promise.all([
    supabase.from("atendimentos").select("id", { count: "exact", head: true }).eq("status", "aberto"),

    supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "em_andamento"),

    supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .in("status", ["aguardando_cliente", "aguardando_terceiro"]),

    supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolvido")
      .gte("finalizado_em", inicioDoMes),

    supabase
      .from("pendencias")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberta", "em_andamento"])
      .lt("prazo", agora.toISOString()),

    // Soma das horas do mês: só a coluna necessária, das linhas do período.
    supabase
      .from("atendimentos")
      .select("tempo_gasto_minutos")
      .gte("iniciado_em", inicioDoMes),

    // Parados: em aberto e sem movimento há dias. É a lista que evita o
    // atendimento esquecido — a razão de o sistema existir.
    supabase
      .from("atendimentos_lista")
      .select("*")
      .in("status", STATUS_EM_ABERTO)
      .lt("updated_at", limiteParado)
      .order("updated_at", { ascending: true })
      .limit(8),

    supabase
      .from("atendimentos_lista")
      .select("*")
      .in("status", ["aguardando_cliente", "aguardando_terceiro"])
      .order("updated_at", { ascending: true })
      .limit(8),

    // Só o que ainda está pendente: resolvidos e cancelados saem desta lista.
    supabase
      .from("atendimentos_lista")
      .select("*")
      .in("status", STATUS_EM_ABERTO)
      .order("updated_at", { ascending: false })
      .limit(8),

    supabase.from("atendimentos").select("id", { count: "exact", head: true }),
  ]);

  const minutosNoMes = (tempoDoMes.data ?? []).reduce(
    (soma, linha) => soma + (linha.tempo_gasto_minutos ?? 0),
    0,
  );

  return {
    abertos: abertos.count ?? 0,
    emAndamento: emAndamento.count ?? 0,
    aguardando: aguardando.count ?? 0,
    resolvidosNoMes: resolvidosNoMes.count ?? 0,
    pendenciasVencidas: pendenciasVencidas.count ?? 0,
    minutosNoMes,
    parados: parados.data ?? [],
    aguardandoRetorno: aguardandoRetorno.data ?? [],
    recentes: recentes.data ?? [],
    totalDeAtendimentos: totalDeAtendimentos.count ?? 0,
  };
}
