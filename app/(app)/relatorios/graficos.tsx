import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_ATENDIMENTO } from "@/lib/constants";
import type { ItemRanking, Relatorio } from "@/lib/services/relatorios";
import { cn, formatarDuracao, formatarRelativo } from "@/lib/utils";

export type Metrica = "atendimentos" | "tempo";

// ─── Cartões de números ──────────────────────────────────────────────────────

/** Variação contra o período anterior. `bomSubir` define se subir merece a cor de sucesso. */
function Variacao({ atual, anterior, bomSubir }: { atual: number; anterior: number; bomSubir?: boolean }) {
  if (anterior === 0 && atual === 0) return null;
  if (anterior === 0) {
    return <p className="mt-1 text-xs text-muted-foreground">Sem dados no período anterior</p>;
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const Icone = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const destaque = bomSubir && pct > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground";
  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs", destaque)}>
      <Icone className="size-3" aria-hidden />
      <span>
        {Math.abs(pct)}% <span className="text-muted-foreground">vs período anterior</span>
      </span>
    </p>
  );
}

function Cartao({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export function Indicadores({ relatorio }: { relatorio: Relatorio }) {
  const { kpis, anterior } = relatorio;
  const horas = kpis.horasAteResolver;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cartao rotulo="Atendimentos abertos no período">
        <p className="mt-1 text-2xl font-semibold sm:text-3xl">{kpis.total}</p>
        <Variacao atual={kpis.total} anterior={anterior.total} />
        <p className="mt-1 text-xs text-muted-foreground">
          {kpis.emAberto} em aberto agora
          {kpis.cancelados > 0 ? ` · ${kpis.cancelados} cancelado${kpis.cancelados === 1 ? "" : "s"}` : ""}
        </p>
      </Cartao>

      <Cartao rotulo="Resolvidos">
        <p className="mt-1 flex items-baseline gap-2 text-2xl font-semibold sm:text-3xl">
          {kpis.resolvidos}
          <span className="text-sm font-medium text-muted-foreground">{kpis.taxaResolucao}%</span>
        </p>
        <Variacao atual={kpis.resolvidos} anterior={anterior.resolvidos} bomSubir />
        {/* Medidor: a trilha é a mesma cor, mais clara, para o estado ler na barra toda. */}
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full"
          style={{ background: "color-mix(in oklab, var(--viz-2) 18%, var(--surface))" }}
          role="meter"
          aria-label="Taxa de resolução"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={kpis.taxaResolucao}
        >
          <div className="h-full rounded-full" style={{ width: `${kpis.taxaResolucao}%`, background: "var(--viz-2)" }} />
        </div>
      </Cartao>

      <Cartao rotulo="Tempo gasto">
        <p className="mt-1 text-2xl font-semibold sm:text-3xl">{formatarDuracao(kpis.minutosTotal)}</p>
        <Variacao atual={kpis.minutosTotal} anterior={anterior.minutos} />
        <p className="mt-1 text-xs text-muted-foreground">
          {kpis.total > 0 ? `${formatarDuracao(kpis.minutosPorAtendimento)} por atendimento` : "Sem atendimentos"}
        </p>
      </Cartao>

      <Cartao rotulo="Tempo até resolver">
        <p className="mt-1 text-2xl font-semibold sm:text-3xl">
          {horas === null ? "—" : horas < 48 ? `${horas < 10 ? horas.toFixed(1).replace(".", ",") : Math.round(horas)} h` : `${Math.round(horas / 24)} dias`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {horas === null ? "Nada foi resolvido no período" : "Média entre abrir e resolver"}
        </p>
      </Cartao>
    </div>
  );
}

// ─── Barras de ranking ───────────────────────────────────────────────────────

/** Mantém todos os filtros da URL e acrescenta (ou troca) o do item clicado. */
function hrefDoFiltro(params: Record<string, string>, filtros: { nome: string; valor: string }[]) {
  const busca = new URLSearchParams(params);
  for (const f of filtros) busca.set(f.nome, f.valor);
  return `/relatorios?${busca}`;
}

export function RankingBarras({
  titulo,
  itens,
  metrica,
  params,
  limite = 8,
  cor = "var(--viz-1)",
  descricao,
}: {
  titulo: string;
  itens: ItemRanking[];
  metrica: Metrica;
  /** Parâmetros atuais da URL, para o clique na barra aplicar o filtro sem perder os outros. */
  params: Record<string, string>;
  limite?: number;
  /** Cor da barra: laranja (abertos) por padrão; azul quando o dado são os resolvidos. */
  cor?: string;
  descricao?: string;
}) {
  if (itens.length === 0) return null;

  const valor = (i: ItemRanking) => (metrica === "tempo" ? i.minutos : i.total);
  const ordenados = [...itens].sort((a, b) => valor(b) - valor(a));
  const visiveis = ordenados.slice(0, limite);
  const escondidos = ordenados.length - visiveis.length;
  const maximo = Math.max(...visiveis.map(valor), 1);
  const somaTotal = itens.reduce((s, i) => s + valor(i), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        {descricao ? <p className="text-xs text-muted-foreground">{descricao}</p> : null}
      </CardHeader>
      <CardContent className="space-y-0.5">
        {visiveis.map((item) => {
          const v = valor(item);
          const conteudo = (
            <>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate text-sm">{item.rotulo}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {metrica === "tempo" ? formatarDuracao(v) : v}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {somaTotal > 0 ? `${Math.round((v / somaTotal) * 100)}%` : ""}
                  </span>
                </span>
              </div>
              {/* Barra fina, com a ponta de dados arredondada e a base reta. */}
              <div className="h-2" style={{ background: `color-mix(in oklab, ${cor} 12%, var(--surface))` }}>
                <div
                  className="h-2 rounded-r-[4px]"
                  style={{ width: `${Math.max((v / maximo) * 100, v > 0 ? 1.5 : 0)}%`, background: cor }}
                />
              </div>
            </>
          );

          const classes = "block rounded-app px-2 py-1.5 -mx-2";
          return item.filtro ? (
            <Link
              key={item.chave}
              href={hrefDoFiltro(params, item.filtro)}
              className={cn(classes, "transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
              title={`Filtrar por ${item.rotulo}`}
            >
              {conteudo}
            </Link>
          ) : (
            <div key={item.chave} className={classes}>
              {conteudo}
            </div>
          );
        })}
        {escondidos > 0 ? (
          <p className="pt-1 text-xs text-muted-foreground">
            + {escondidos} {escondidos === 1 ? "outro" : "outros"}. Use o filtro acima para ver um específico.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Mapa de calor: quando os pedidos chegam ─────────────────────────────────

export function MapaDeCalor({ heatmap }: { heatmap: Relatorio["heatmap"] }) {
  const { colunas, faixas, maximo } = heatmap;

  return (
    // min-w-0: sem isso o cartão na grade cresce até a largura da tabela e estoura a tela do celular.
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Quando os pedidos chegam</CardTitle>
        <p className="text-xs text-muted-foreground">Atendimentos abertos, por dia da semana e faixa do dia (horário de Brasília).</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate text-xs" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th />
                {colunas.map((c) => (
                  <th key={c} scope="col" className="pb-1 text-center font-normal text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faixas.map((faixa) => (
                <tr key={faixa.rotulo}>
                  <th scope="row" className="whitespace-nowrap pr-2 text-left font-normal text-muted-foreground">
                    {faixa.rotulo}
                  </th>
                  {faixa.celulas.map((v, i) => {
                    const razao = maximo > 0 ? v / maximo : 0;
                    return (
                      <td
                        key={i}
                        title={`${colunas[i]}, ${faixa.rotulo}: ${v} atendimento${v === 1 ? "" : "s"}`}
                        className={cn(
                          "h-9 rounded-[4px] text-center tabular-nums",
                          razao > 0.5 ? "text-primary-foreground" : "text-foreground",
                        )}
                        style={{
                          background:
                            v === 0
                              ? "var(--surface-muted)"
                              : `color-mix(in oklab, var(--viz-1) ${Math.round(14 + razao * 86)}%, var(--surface))`,
                        }}
                      >
                        {v > 0 ? v : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
          <span>Menos</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--viz-1) 14%, var(--surface)), var(--viz-1))" }}
          />
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Lista dos atendimentos do recorte ───────────────────────────────────────

export function ListaDoRecorte({ relatorio }: { relatorio: Relatorio }) {
  const { recentes, kpis } = relatorio;
  if (recentes.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Atendimentos deste recorte</CardTitle>
        <p className="text-xs text-muted-foreground">
          Os {recentes.length} mais recentes de {kpis.total}. O CSV leva todos.
        </p>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y border-border bg-surface-muted text-left">
            <tr>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Nº</th>
              <th className="px-4 py-2 font-medium">Assunto</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Cliente</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Situação</th>
              <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((item) => {
              const status = item.status ? STATUS_ATENDIMENTO[item.status] : null;
              return (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="hidden px-4 py-2 whitespace-nowrap tabular-nums text-muted-foreground md:table-cell">{item.numero}</td>
                  <td className="px-4 py-2">
                    <Link href={`/atendimentos/${item.id}`} className="font-medium text-primary hover:underline">
                      {item.titulo}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground md:hidden">
                      <span className="tabular-nums">{item.numero}</span>
                      {item.cliente_nome ? <span>· {item.cliente_nome}</span> : null}
                      <span>· {formatarRelativo(item.iniciado_em)}</span>
                      {status ? <Badge className={status.cor}>{status.rotulo}</Badge> : null}
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">{item.cliente_nome}</td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    {status ? <Badge className={status.cor}>{status.rotulo}</Badge> : null}
                  </td>
                  <td className="hidden px-4 py-2 text-right whitespace-nowrap tabular-nums text-muted-foreground md:table-cell">
                    {formatarDuracao(item.tempo_gasto_minutos)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
