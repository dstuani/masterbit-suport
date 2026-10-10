import { COMPONENTES_ALTERACAO, TIPOS_EQUIPAMENTO, TIPOS_MANUTENCAO } from "@/lib/constants";
import { exigirPerfil } from "@/lib/auth";
import { limiteSemColeta } from "@/lib/services/equipamentos";
import { buscarTudo, DESLOCAMENTO, type ItemRanking } from "@/lib/services/relatorios";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

export type FiltrosRelatorioEquipamentos = {
  de: string;
  ate: string;
  cliente?: string;
  tipoEquipamento?: string;
  tipoManutencao?: string;
};

type EquipamentoResumo = {
  id: string;
  nome: string;
  tipo: string;
  cliente_id: string;
  sistema_operacional: string | null;
  memoria_mb: number | null;
  volumes: unknown;
  ultima_coleta_em: string | null;
  origem: "agente" | "manual";
  clientes: { razao_social: string } | null;
};

type EquipamentoDaLinha = { id: string; nome: string; tipo: string; cliente_id: string; clientes: { razao_social: string } | null };

export type LinhaManutencao = Tabelas<"equipamento_manutencoes"> & { equipamentos: EquipamentoDaLinha | null };
export type LinhaAlteracao = Tabelas<"equipamento_alteracoes"> & { equipamentos: EquipamentoDaLinha | null };

export type RelatorioEquipamentos = {
  kpis: {
    emUso: number;
    semColeta: number;
    manutencoes: number;
    minutos: number;
    trocasRegistradas: number;
    trocasDetectadas: number;
    custo: number;
  };
  porTipoManutencao: ItemRanking[];
  porCliente: ItemRanking[];
  maisManutencoes: ItemRanking[];
  porTipoEquipamento: ItemRanking[];
  porSistema: ItemRanking[];
  porMemoria: ItemRanking[];
  discosCheios: { id: string; nome: string; cliente: string; letra: string; livreGb: number; totalGb: number; uso: number }[];
  semColeta: { id: string; nome: string; cliente: string; ultimaColeta: string | null }[];
  manutencoes: LinhaManutencao[];
  alteracoes: LinhaAlteracao[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Faixas fixas de memória, na ordem em que aparecem (do menor para o maior). */
const FAIXAS_MEMORIA = [
  { chave: "ate4", rotulo: "Até 4 GB", ate: 4 * 1024 },
  { chave: "8", rotulo: "Até 8 GB", ate: 8 * 1024 },
  { chave: "16", rotulo: "Até 16 GB", ate: 16 * 1024 },
  { chave: "32", rotulo: "Mais de 16 GB", ate: Number.POSITIVE_INFINITY },
];

function contar<T>(itens: T[], chave: (i: T) => string | null, rotulo: (c: string) => string, minutos?: (i: T) => number) {
  const mapa = new Map<string, { total: number; minutos: number }>();
  for (const i of itens) {
    const c = chave(i);
    if (!c) continue;
    const atual = mapa.get(c) ?? { total: 0, minutos: 0 };
    atual.total += 1;
    atual.minutos += minutos ? minutos(i) : 0;
    mapa.set(c, atual);
  }
  return Array.from(mapa.entries())
    .map(([c, v]) => ({ chave: c, rotulo: rotulo(c), total: v.total, minutos: v.minutos }))
    .sort((a, b) => b.total - a.total);
}

export async function obterRelatorioEquipamentos(f: FiltrosRelatorioEquipamentos): Promise<RelatorioEquipamentos> {
  await exigirPerfil();
  const supabase = await criarClienteServidor();

  // A URL é entrada de qualquer pessoa: só valores conhecidos viram filtro.
  const cliente = f.cliente && UUID.test(f.cliente) ? f.cliente : undefined;
  const tipoEquipamento = f.tipoEquipamento && f.tipoEquipamento in TIPOS_EQUIPAMENTO ? f.tipoEquipamento : undefined;
  const tipoManutencao = f.tipoManutencao && f.tipoManutencao in TIPOS_MANUTENCAO ? f.tipoManutencao : undefined;
  const inicio = `${f.de}T00:00:00${DESLOCAMENTO}`;
  const fim = `${f.ate}T23:59:59${DESLOCAMENTO}`;
  const daLinha = "equipamentos(id, nome, tipo, cliente_id, clientes(razao_social))";

  const [equipamentos, manutencoesBrutas, alteracoesBrutas] = await Promise.all([
    buscarTudo<EquipamentoResumo>((a, b) => {
      let q = supabase
        .from("equipamentos")
        .select("id, nome, tipo, cliente_id, sistema_operacional, memoria_mb, volumes, ultima_coleta_em, origem, clientes(razao_social)")
        .eq("ativo", true)
        .order("nome");
      if (cliente) q = q.eq("cliente_id", cliente);
      if (tipoEquipamento) q = q.eq("tipo", tipoEquipamento);
      return q.range(a, b) as unknown as PromiseLike<{ data: EquipamentoResumo[] | null; error: { message: string } | null }>;
    }),
    buscarTudo<LinhaManutencao>((a, b) => {
      let q = supabase
        .from("equipamento_manutencoes")
        .select(`*, ${daLinha}`)
        .gte("realizada_em", inicio)
        .lte("realizada_em", fim)
        .order("realizada_em", { ascending: false });
      if (tipoManutencao) q = q.eq("tipo", tipoManutencao);
      return q.range(a, b) as unknown as PromiseLike<{ data: LinhaManutencao[] | null; error: { message: string } | null }>;
    }),
    buscarTudo<LinhaAlteracao>((a, b) =>
      supabase
        .from("equipamento_alteracoes")
        .select(`*, ${daLinha}`)
        .gte("detectada_em", inicio)
        .lte("detectada_em", fim)
        .order("detectada_em", { ascending: false })
        .range(a, b) as unknown as PromiseLike<{ data: LinhaAlteracao[] | null; error: { message: string } | null }>,
    ),
  ]);

  // Cliente e tipo de equipamento filtram também o histórico, pela máquina de cada linha.
  const daMaquinaFiltrada = (e: EquipamentoDaLinha | null) =>
    e !== null && (!cliente || e.cliente_id === cliente) && (!tipoEquipamento || e.tipo === tipoEquipamento);
  const manutencoes = manutencoesBrutas.linhas.filter((m) => daMaquinaFiltrada(m.equipamentos));
  const alteracoes = alteracoesBrutas.linhas.filter((m) => daMaquinaFiltrada(m.equipamentos));
  const parque = equipamentos.linhas;

  const corte = new Date(limiteSemColeta()).getTime();
  const semColeta = parque.filter(
    (e) => e.origem === "agente" && (!e.ultima_coleta_em || new Date(e.ultima_coleta_em).getTime() < corte),
  );

  // Discos com 90% ou mais de uso, do mais cheio para o menos.
  const discosCheios: RelatorioEquipamentos["discosCheios"] = [];
  for (const e of parque) {
    if (!Array.isArray(e.volumes)) continue;
    for (const v of e.volumes as Record<string, unknown>[]) {
      const total = typeof v?.total_gb === "number" ? v.total_gb : 0;
      const livre = typeof v?.livre_gb === "number" ? v.livre_gb : 0;
      if (total <= 0) continue;
      const uso = Math.round(((total - livre) / total) * 100);
      if (uso >= 90) {
        discosCheios.push({
          id: e.id,
          nome: e.nome,
          cliente: e.clientes?.razao_social ?? "",
          letra: typeof v.letra === "string" ? v.letra : "",
          livreGb: livre,
          totalGb: total,
          uso,
        });
      }
    }
  }
  discosCheios.sort((a, b) => b.uso - a.uso);

  const nomeCliente = new Map<string, string>();
  for (const m of manutencoes) if (m.equipamentos) nomeCliente.set(m.equipamentos.cliente_id, m.equipamentos.clientes?.razao_social ?? "Sem nome");
  const nomeEquipamento = new Map<string, string>();
  for (const m of manutencoes) if (m.equipamentos) nomeEquipamento.set(m.equipamentos.id, m.equipamentos.nome);

  const porMemoria: ItemRanking[] = FAIXAS_MEMORIA.map((faixa, i) => {
    const anterior = i === 0 ? 0 : FAIXAS_MEMORIA[i - 1].ate;
    const total = parque.filter((e) => e.memoria_mb && e.memoria_mb > anterior && e.memoria_mb <= faixa.ate).length;
    return { chave: faixa.chave, rotulo: faixa.rotulo, total, minutos: 0 };
  });
  const semMemoria = parque.filter((e) => !e.memoria_mb).length;
  if (semMemoria > 0) porMemoria.push({ chave: "sem", rotulo: "Não informada", total: semMemoria, minutos: 0 });

  return {
    kpis: {
      emUso: parque.length,
      semColeta: semColeta.length,
      manutencoes: manutencoes.length,
      minutos: manutencoes.reduce((s, m) => s + (m.tempo_minutos ?? 0), 0),
      trocasRegistradas: manutencoes.filter((m) => m.tipo === "troca_peca").length,
      trocasDetectadas: alteracoes.filter((a) => a.componente !== "sistema").length,
      custo: manutencoes.reduce((s, m) => s + Number(m.custo ?? 0), 0),
    },
    porTipoManutencao: contar(
      manutencoes,
      (m) => m.tipo,
      (c) => TIPOS_MANUTENCAO[c as keyof typeof TIPOS_MANUTENCAO] ?? c,
      (m) => m.tempo_minutos ?? 0,
    ).map((i) => ({ ...i, filtro: [{ nome: "manutencao", valor: i.chave }] })),
    porCliente: contar(
      manutencoes,
      (m) => m.equipamentos?.cliente_id ?? null,
      (c) => nomeCliente.get(c) ?? "Sem nome",
      (m) => m.tempo_minutos ?? 0,
    ).map((i) => ({ ...i, filtro: [{ nome: "cliente", valor: i.chave }] })),
    maisManutencoes: contar(
      manutencoes,
      (m) => m.equipamentos?.id ?? null,
      (c) => nomeEquipamento.get(c) ?? "Equipamento",
      (m) => m.tempo_minutos ?? 0,
    )
      .slice(0, 10)
      .map((i) => ({ ...i, href: `/equipamentos/${i.chave}` })),
    porTipoEquipamento: contar(parque, (e) => e.tipo, (c) => TIPOS_EQUIPAMENTO[c as keyof typeof TIPOS_EQUIPAMENTO] ?? c).map(
      (i) => ({ ...i, filtro: [{ nome: "tipo", valor: i.chave }] }),
    ),
    porSistema: contar(parque, (e) => e.sistema_operacional ?? "Não informado", (c) => c),
    porMemoria,
    discosCheios,
    semColeta: semColeta.map((e) => ({
      id: e.id,
      nome: e.nome,
      cliente: e.clientes?.razao_social ?? "",
      ultimaColeta: e.ultima_coleta_em,
    })),
    manutencoes,
    alteracoes,
  };
}

/** Texto curto de uma alteração detectada, ex.: "Memória: 8 GB → 16 GB". */
export function descreverAlteracao(a: Pick<LinhaAlteracao, "componente" | "antes" | "depois">) {
  const nome = COMPONENTES_ALTERACAO[a.componente as keyof typeof COMPONENTES_ALTERACAO] ?? a.componente;
  const valor = (v: string | null) => {
    if (!v) return "—";
    if (a.componente === "memoria" && /^\d+$/.test(v)) {
      const mb = Number(v);
      return mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${mb} MB`;
    }
    return v;
  };
  return { nome, antes: valor(a.antes), depois: valor(a.depois) };
}
