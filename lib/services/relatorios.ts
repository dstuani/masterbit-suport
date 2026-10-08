import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { CANAIS, ORDEM_SITUACAO, PRIORIDADES, STATUS_ATENDIMENTO, TIPOS_ATENDIMENTO } from "@/lib/constants";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type LinhaLista = Database["public"]["Views"]["atendimentos_lista"]["Row"];

// O Brasil não tem horário de verão desde 2019: -03:00 fixo é seguro. Sem o
// deslocamento, o servidor (em UTC) cortaria o dia 3 horas fora do de Brasília.
const FUSO = "America/Sao_Paulo";
const DESLOCAMENTO = "-03:00";

/** Mesmo teto do limite de linhas do Supabase por requisição. */
const TAMANHO_DA_PAGINA = 1000;
/** Trava de segurança: mais que isso o relatório avisa que está truncado. */
const LIMITE_DE_LINHAS = 20000;

// ─── Filtros ─────────────────────────────────────────────────────────────────

export type FiltrosRelatorio = {
  de: string;
  ate: string;
  cliente?: string;
  categoria?: string;
  sistema?: string;
  responsavel?: string;
  canal?: string;
  tipo?: string;
  prioridade?: string;
  status?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só entra no banco o que é UUID ou um valor conhecido do enum — a URL é entrada de estranhos. */
function paresDeFiltro(f: FiltrosRelatorio): [string, string][] {
  const pares: [string, string][] = [];
  const uuid = (coluna: string, valor?: string) => {
    if (valor && UUID.test(valor)) pares.push([coluna, valor]);
  };
  const enumerado = (coluna: string, valor: string | undefined, validos: object) => {
    if (valor && valor in validos) pares.push([coluna, valor]);
  };
  uuid("cliente_id", f.cliente);
  uuid("categoria_id", f.categoria);
  uuid("sistema_id", f.sistema);
  uuid("responsavel_id", f.responsavel);
  enumerado("canal", f.canal, CANAIS);
  enumerado("tipo", f.tipo, TIPOS_ATENDIMENTO);
  enumerado("prioridade", f.prioridade, PRIORIDADES);
  enumerado("status", f.status, STATUS_ATENDIMENTO);
  return pares;
}

type ComEq<T> = { eq(coluna: string, valor: string): T };

function aplicar<T>(query: T, pares: [string, string][]): T {
  let atual = query;
  for (const [coluna, valor] of pares) atual = (atual as unknown as ComEq<T>).eq(coluna, valor);
  return atual;
}

type Pagina<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Busca todas as páginas: o Supabase corta cada resposta em 1.000 linhas. */
async function buscarTudo<T>(pagina: (inicio: number, fim: number) => Pagina<T>) {
  const linhas: T[] = [];
  let truncado = false;
  for (let inicio = 0; ; inicio += TAMANHO_DA_PAGINA) {
    const { data, error } = await pagina(inicio, inicio + TAMANHO_DA_PAGINA - 1);
    if (error) throw new Error(traduzirErro(error.message));
    const bloco = data ?? [];
    linhas.push(...bloco);
    if (bloco.length < TAMANHO_DA_PAGINA) break;
    if (linhas.length >= LIMITE_DE_LINHAS) {
      truncado = true;
      break;
    }
  }
  return { linhas, truncado };
}

// ─── Datas no fuso de Brasília ───────────────────────────────────────────────

function diaLocal(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: FUSO });
}

const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const INGLES_PARA_INDICE: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const formatadorDeHora = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

function diaDaSemanaEHora(iso: string): { dia: number; hora: number } {
  const partes = formatadorDeHora.formatToParts(new Date(iso));
  const dia = INGLES_PARA_INDICE[partes.find((p) => p.type === "weekday")?.value ?? "Mon"] ?? 0;
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  return { dia, hora };
}

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export type ItemRanking = {
  chave: string;
  rotulo: string;
  total: number;
  minutos: number;
  /** Parâmetros de URL que filtram por este item (clicar na barra aplica o filtro). */
  filtro?: { nome: string; valor: string }[];
};

export type ContagemSituacao = { total: number; minutos: number };

/** Um item (tipo, categoria ou canal) com a divisão dos seus atendimentos por situação. */
export type LinhaSituacao = {
  chave: string;
  rotulo: string;
  total: number;
  minutos: number;
  porStatus: Record<string, ContagemSituacao>;
  filtro?: { nome: string; valor: string };
};

export type PontoDaSerie = { chave: string; rotulo: string; criados: number; resolvidos: number };

export type Relatorio = {
  periodo: { de: string; ate: string; dias: number };
  anterior: { de: string; ate: string; total: number; resolvidos: number; minutos: number };
  kpis: {
    total: number;
    emAberto: number;
    resolvidos: number;
    cancelados: number;
    taxaResolucao: number;
    minutosTotal: number;
    minutosPorAtendimento: number;
    /** Média de horas entre abrir e resolver; nulo quando nada foi resolvido. */
    horasAteResolver: number | null;
  };
  serie: { granularidade: "dia" | "semana" | "mes"; pontos: PontoDaSerie[] };
  heatmap: { colunas: string[]; faixas: { rotulo: string; celulas: number[] }[]; maximo: number };
  ranking: {
    status: ItemRanking[];
    prioridade: ItemRanking[];
    tipo: ItemRanking[];
    canal: ItemRanking[];
    cliente: ItemRanking[];
    categoria: ItemRanking[];
    sistema: ItemRanking[];
    responsavel: ItemRanking[];
  };
  situacao: {
    totais: { chave: string; rotulo: string; total: number }[];
    porTipo: LinhaSituacao[];
    porCategoria: LinhaSituacao[];
    porCanal: LinhaSituacao[];
  };
  resolvidosPorCategoria: ItemRanking[];
  recentes: LinhaLista[];
  itens: LinhaLista[];
  truncado: boolean;
};

const ABERTOS = ["aberto", "em_andamento", "aguardando_cliente", "aguardando_terceiro", "agendado"];

function somaMinutos(grupo: LinhaLista[]) {
  return grupo.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0);
}

function ranking(
  itens: LinhaLista[],
  chave: (d: LinhaLista) => string | null,
  rotulo: (c: string) => string,
  nomeDoFiltro?: string,
): ItemRanking[] {
  const grupos = new Map<string, LinhaLista[]>();
  for (const item of itens) {
    const k = chave(item);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(item);
  }
  return Array.from(grupos.entries())
    .map(([k, grupo]) => ({
      chave: k,
      rotulo: rotulo(k),
      total: grupo.length,
      minutos: somaMinutos(grupo),
      filtro: nomeDoFiltro ? [{ nome: nomeDoFiltro, valor: k }] : undefined,
    }))
    .sort((a, b) => b.total - a.total);
}

function situacaoPor(
  itens: LinhaLista[],
  chave: (d: LinhaLista) => string | null,
  rotulo: (c: string) => string,
  nomeDoFiltro?: string,
): LinhaSituacao[] {
  const grupos = new Map<string, LinhaLista[]>();
  for (const item of itens) {
    const k = chave(item);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(item);
  }
  return Array.from(grupos.entries())
    .map(([k, grupo]) => {
      const porStatus: Record<string, ContagemSituacao> = {};
      for (const g of grupo) {
        if (!g.status) continue;
        const atual = porStatus[g.status] ?? { total: 0, minutos: 0 };
        atual.total += 1;
        atual.minutos += g.tempo_gasto_minutos ?? 0;
        porStatus[g.status] = atual;
      }
      return {
        chave: k,
        rotulo: rotulo(k),
        total: grupo.length,
        minutos: somaMinutos(grupo),
        porStatus,
        filtro: nomeDoFiltro ? { nome: nomeDoFiltro, valor: k } : undefined,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Série temporal ──────────────────────────────────────────────────────────

function montarSerie(de: string, ate: string, criados: string[], resolvidos: string[]) {
  const inicio = parseISO(`${de}T12:00:00`);
  const fim = parseISO(`${ate}T12:00:00`);
  const dias = differenceInCalendarDays(fim, inicio) + 1;

  const granularidade = dias <= 45 ? "dia" : dias <= 150 ? "semana" : "mes";

  let chaves: { chave: string; rotulo: string }[];
  let paraChave: (dia: string) => string;

  if (granularidade === "dia") {
    chaves = eachDayOfInterval({ start: inicio, end: fim }).map((d) => ({
      chave: format(d, "yyyy-MM-dd"),
      rotulo: format(d, "dd/MM"),
    }));
    paraChave = (dia) => dia;
  } else if (granularidade === "semana") {
    chaves = eachWeekOfInterval({ start: inicio, end: fim }, { weekStartsOn: 1 }).map((d) => ({
      chave: format(d, "yyyy-MM-dd"),
      rotulo: format(d, "dd/MM"),
    }));
    paraChave = (dia) => format(startOfWeek(parseISO(`${dia}T12:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");
  } else {
    chaves = eachMonthOfInterval({ start: inicio, end: fim }).map((d) => ({
      chave: format(d, "yyyy-MM"),
      rotulo: format(d, "MMM/yy", { locale: ptBR }),
    }));
    paraChave = (dia) => dia.slice(0, 7);
  }

  const contar = (dias: string[]) => {
    const mapa = new Map<string, number>();
    for (const dia of dias) mapa.set(paraChave(dia), (mapa.get(paraChave(dia)) ?? 0) + 1);
    return mapa;
  };
  const c = contar(criados);
  const r = contar(resolvidos);

  return {
    granularidade: granularidade as "dia" | "semana" | "mes",
    pontos: chaves.map(({ chave, rotulo }) => ({
      chave,
      rotulo,
      criados: c.get(chave) ?? 0,
      resolvidos: r.get(chave) ?? 0,
    })),
  };
}

// ─── Consulta principal ──────────────────────────────────────────────────────

export async function obterRelatorio(filtros: FiltrosRelatorio): Promise<Relatorio> {
  const supabase = await criarClienteServidor();
  const pares = paresDeFiltro(filtros);
  const { de, ate } = filtros;

  const inicio = parseISO(`${de}T12:00:00`);
  const fim = parseISO(`${ate}T12:00:00`);
  const dias = Math.max(differenceInCalendarDays(fim, inicio) + 1, 1);
  const anteriorAte = format(subDays(inicio, 1), "yyyy-MM-dd");
  const anteriorDe = format(subDays(inicio, dias), "yyyy-MM-dd");

  const limites = (a: string, b: string) => ({
    de: `${a}T00:00:00${DESLOCAMENTO}`,
    ate: `${b}T23:59:59${DESLOCAMENTO}`,
  });
  const atual = limites(de, ate);
  const anterior = limites(anteriorDe, anteriorAte);

  // Resolvidos entram na série pela data em que foram resolvidos, não pela de abertura.
  // Se o filtro de situação exclui "resolvido", a linha de resolvidos fica zerada.
  const resolvidosPossiveis = !filtros.status || filtros.status === "resolvido";
  const paresSemStatus = pares.filter(([coluna]) => coluna !== "status");

  const [principal, resolvidosNaData, periodoAnterior] = await Promise.all([
    buscarTudo<LinhaLista>((a, b) =>
      aplicar(
        supabase
          .from("atendimentos_lista")
          .select("*")
          .gte("iniciado_em", atual.de)
          .lte("iniciado_em", atual.ate)
          .order("iniciado_em", { ascending: false }),
        pares,
      ).range(a, b),
    ),
    resolvidosPossiveis
      ? buscarTudo<{ finalizado_em: string | null }>((a, b) =>
          aplicar(
            supabase
              .from("atendimentos_lista")
              .select("finalizado_em")
              .eq("status", "resolvido")
              .gte("finalizado_em", atual.de)
              .lte("finalizado_em", atual.ate)
              .order("finalizado_em"),
            paresSemStatus,
          ).range(a, b),
        )
      : Promise.resolve({ linhas: [], truncado: false }),
    buscarTudo<{ status: string | null; tempo_gasto_minutos: number | null }>((a, b) =>
      aplicar(
        supabase
          .from("atendimentos_lista")
          .select("status, tempo_gasto_minutos")
          .gte("iniciado_em", anterior.de)
          .lte("iniciado_em", anterior.ate)
          .order("iniciado_em"),
        pares,
      ).range(a, b),
    ),
  ]);

  const dados = principal.linhas;
  const resolvidos = dados.filter((d) => d.status === "resolvido");
  const cancelados = dados.filter((d) => d.status === "cancelado");
  const emAberto = dados.filter((d) => d.status && ABERTOS.includes(d.status));
  const minutosTotal = somaMinutos(dados);

  const duracoes = resolvidos
    .filter((d) => d.iniciado_em && d.finalizado_em)
    .map((d) => (new Date(d.finalizado_em!).getTime() - new Date(d.iniciado_em!).getTime()) / 36e5)
    .filter((h) => h >= 0);
  const horasAteResolver = duracoes.length > 0 ? duracoes.reduce((s, h) => s + h, 0) / duracoes.length : null;

  // Faixas do dia, de cima para baixo no mapa de calor.
  const FAIXAS = [
    { rotulo: "Manhã (6–12h)", de: 6, ate: 12 },
    { rotulo: "Tarde (12–18h)", de: 12, ate: 18 },
    { rotulo: "Noite (18–24h)", de: 18, ate: 24 },
    { rotulo: "Madrugada (0–6h)", de: 0, ate: 6 },
  ];
  const celulas = FAIXAS.map(() => Array<number>(7).fill(0));
  for (const d of dados) {
    if (!d.iniciado_em) continue;
    const { dia, hora } = diaDaSemanaEHora(d.iniciado_em);
    const faixa = FAIXAS.findIndex((f) => hora >= f.de && hora < f.ate);
    if (faixa >= 0) celulas[faixa][dia] += 1;
  }

  const nomeStatus = (c: string) => STATUS_ATENDIMENTO[c as keyof typeof STATUS_ATENDIMENTO]?.rotulo ?? c;
  const nomePrioridade = (c: string) => PRIORIDADES[c as keyof typeof PRIORIDADES]?.rotulo ?? c;
  const nomeTipo = (c: string) => TIPOS_ATENDIMENTO[c as keyof typeof TIPOS_ATENDIMENTO] ?? c;
  const nomeCanal = (c: string) => CANAIS[c as keyof typeof CANAIS] ?? c;

  // Cliente, categoria e responsável agrupam pelo id (o nome pode repetir) e mostram o nome.
  const nomesPorId = (campoId: keyof LinhaLista, campoNome: keyof LinhaLista) => {
    const mapa = new Map<string, string>();
    for (const d of dados) {
      const id = d[campoId] as string | null;
      if (id) mapa.set(id, (d[campoNome] as string | null) ?? "Sem nome");
    }
    return (id: string) => mapa.get(id) ?? "Sem nome";
  };

  const semCategoria = dados.filter((d) => !d.categoria_id);
  const porCategoria = ranking(dados, (d) => d.categoria_id, nomesPorId("categoria_id", "categoria_nome"), "categoria");
  if (semCategoria.length > 0) {
    porCategoria.push({ chave: "sem", rotulo: "Sem categoria", total: semCategoria.length, minutos: somaMinutos(semCategoria) });
    porCategoria.sort((a, b) => b.total - a.total);
  }

  const idDaCategoria = (d: LinhaLista) => d.categoria_id ?? "sem";
  const nomeDaCategoria = (c: string) => (c === "sem" ? "Sem categoria" : nomesPorId("categoria_id", "categoria_nome")(c));
  const situacaoPorCategoria = situacaoPor(dados, idDaCategoria, nomeDaCategoria, "categoria").map((l) =>
    l.chave === "sem" ? { ...l, filtro: undefined } : l,
  );
  const resolvidosPorCategoria = ranking(resolvidos, idDaCategoria, nomeDaCategoria, "categoria").map((i) => ({
    ...i,
    filtro: i.chave === "sem" ? undefined : [...(i.filtro ?? []), { nome: "status", valor: "resolvido" }],
  }));

  const porResponsavel = ranking(dados, (d) => d.responsavel_id, nomesPorId("responsavel_id", "responsavel_nome"), "responsavel");

  return {
    periodo: { de, ate, dias },
    anterior: {
      de: anteriorDe,
      ate: anteriorAte,
      total: periodoAnterior.linhas.length,
      resolvidos: periodoAnterior.linhas.filter((d) => d.status === "resolvido").length,
      minutos: periodoAnterior.linhas.reduce((s, d) => s + (d.tempo_gasto_minutos ?? 0), 0),
    },
    kpis: {
      total: dados.length,
      emAberto: emAberto.length,
      resolvidos: resolvidos.length,
      cancelados: cancelados.length,
      taxaResolucao: dados.length > 0 ? Math.round((resolvidos.length / dados.length) * 100) : 0,
      minutosTotal,
      minutosPorAtendimento: dados.length > 0 ? Math.round(minutosTotal / dados.length) : 0,
      horasAteResolver,
    },
    serie: montarSerie(
      de,
      ate,
      dados.filter((d) => d.iniciado_em).map((d) => diaLocal(d.iniciado_em!)),
      resolvidosNaData.linhas.filter((d) => d.finalizado_em).map((d) => diaLocal(d.finalizado_em!)),
    ),
    heatmap: {
      colunas: DIAS_CURTOS,
      faixas: FAIXAS.map((f, i) => ({ rotulo: f.rotulo, celulas: celulas[i] })),
      maximo: Math.max(0, ...celulas.flat()),
    },
    ranking: {
      status: ranking(dados, (d) => d.status, nomeStatus, "status"),
      prioridade: ranking(dados, (d) => d.prioridade, nomePrioridade, "prioridade"),
      tipo: ranking(dados, (d) => d.tipo, nomeTipo, "tipo"),
      canal: ranking(dados, (d) => d.canal, nomeCanal, "canal"),
      cliente: ranking(dados, (d) => d.cliente_id, nomesPorId("cliente_id", "cliente_nome"), "cliente"),
      categoria: porCategoria,
      sistema: ranking(dados, (d) => d.sistema_id, nomesPorId("sistema_id", "sistema_nome"), "sistema"),
      responsavel: porResponsavel,
    },
    situacao: {
      totais: ORDEM_SITUACAO.map((c) => ({
        chave: c,
        rotulo: STATUS_ATENDIMENTO[c].rotulo,
        total: dados.filter((d) => d.status === c).length,
      })),
      porTipo: situacaoPor(dados, (d) => d.tipo, nomeTipo, "tipo"),
      porCategoria: situacaoPorCategoria,
      porCanal: situacaoPor(dados, (d) => d.canal, nomeCanal, "canal"),
    },
    resolvidosPorCategoria,
    recentes: dados.slice(0, 12),
    itens: dados,
    truncado: principal.truncado || periodoAnterior.truncado,
  };
}

// ─── Opções dos filtros ──────────────────────────────────────────────────────

export type OpcoesDeFiltro = {
  clientes: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  sistemas: { id: string; nome: string }[];
  responsaveis: { id: string; nome: string }[];
};

/** Listas completas (não só o que está no recorte atual), senão o filtro apagaria as próprias opções. */
export async function obterOpcoesDeFiltro(): Promise<OpcoesDeFiltro> {
  const supabase = await criarClienteServidor();
  const [clientes, categorias, sistemas, responsaveis] = await Promise.all([
    supabase.from("clientes").select("id, razao_social").order("razao_social"),
    supabase.from("categorias").select("id, nome").order("ordem"),
    supabase.from("sistemas").select("id, nome").order("nome"),
    supabase.from("profiles").select("id, nome").order("nome"),
  ]);
  return {
    clientes: (clientes.data ?? []).map((c) => ({ id: c.id, nome: c.razao_social })),
    categorias: (categorias.data ?? []).map((c) => ({ id: c.id, nome: c.nome })),
    sistemas: (sistemas.data ?? []).map((s) => ({ id: s.id, nome: s.nome })),
    responsaveis: (responsaveis.data ?? []).map((p) => ({ id: p.id, nome: p.nome })),
  };
}
