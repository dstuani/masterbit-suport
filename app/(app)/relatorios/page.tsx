import { format, startOfMonth } from "date-fns";
import { BarChart3, TriangleAlert } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { obterOpcoesDeFiltro, obterRelatorio, type FiltrosRelatorio as Filtros } from "@/lib/services/relatorios";

import { BotaoExportarRelatorio } from "./exportar";
import { FiltrosRelatorio } from "./filtros";
import { GraficoLinhas } from "./grafico-linhas";
import { Indicadores, ListaDoRecorte, MapaDeCalor, RankingBarras, type Metrica } from "./graficos";
import { BlocoSituacao, BlocoSituacaoPorDimensao } from "./situacao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Relatórios" />
        <AvisoSupabase />
      </>
    );
  }

  const hoje = new Date();
  // A URL é entrada de qualquer pessoa: data fora do formato volta para o padrão.
  let de = params.de && DATA.test(params.de) ? params.de : format(startOfMonth(hoje), "yyyy-MM-dd");
  let ate = params.ate && DATA.test(params.ate) ? params.ate : format(hoje, "yyyy-MM-dd");
  if (de > ate) [de, ate] = [ate, de];

  const metrica: Metrica = params.metrica === "tempo" ? "tempo" : "atendimentos";

  const filtros: Filtros = {
    de,
    ate,
    cliente: params.cliente,
    categoria: params.categoria,
    sistema: params.sistema,
    responsavel: params.responsavel,
    canal: params.canal,
    tipo: params.tipo,
    prioridade: params.prioridade,
    status: params.status,
  };

  const [relatorio, opcoes] = await Promise.all([obterRelatorio(filtros), obterOpcoesDeFiltro()]);

  // Parâmetros atuais, repassados às barras para o clique aplicar um filtro sem perder os outros.
  const paramsAtuais: Record<string, string> = { de, ate };
  for (const [chave, v] of Object.entries(params)) {
    if (v && !["de", "ate"].includes(chave)) paramsAtuais[chave] = v;
  }

  const { ranking, serie, situacao } = relatorio;

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        descricao="Volume, prazos e tempo de suporte. Clique numa barra para filtrar por ela."
        acoes={<BotaoExportarRelatorio itens={relatorio.itens} periodo={{ de, ate }} />}
      />

      <FiltrosRelatorio de={de} ate={ate} metrica={metrica} opcoes={opcoes} />

      <div id="relatorio-conteudo" className="transition-opacity data-[carregando=true]:opacity-60">
        {relatorio.truncado ? (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-app border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <TriangleAlert className="size-4 shrink-0" />
            Há atendimentos demais neste recorte e os números ficaram parciais. Estreite o período ou use um filtro.
          </p>
        ) : null}

        <Indicadores relatorio={relatorio} />

        {relatorio.kpis.total === 0 && serie.pontos.every((p) => p.resolvidos === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <BarChart3 className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Nenhum atendimento neste recorte</p>
                <p className="mt-1 text-sm text-muted-foreground">Mude o período ou tire algum filtro.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
              <BlocoSituacao totais={situacao.totais} params={paramsAtuais} />
              <BlocoSituacaoPorDimensao
                grupos={{ tipo: situacao.porTipo, categoria: situacao.porCategoria, canal: situacao.porCanal }}
                metrica={metrica}
                params={paramsAtuais}
              />
              <RankingBarras
                titulo="Resolvidos por categoria"
                descricao={`${relatorio.kpis.resolvidos} ${relatorio.kpis.resolvidos === 1 ? "resolvido" : "resolvidos"} no período`}
                itens={relatorio.resolvidosPorCategoria}
                metrica={metrica}
                params={paramsAtuais}
                cor="var(--viz-2)"
                limite={6}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Evolução {serie.granularidade === "dia" ? "por dia" : serie.granularidade === "semana" ? "por semana" : "por mês"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GraficoLinhas pontos={serie.pontos} granularidade={serie.granularidade} />
                {/* Gêmea em tabela: o mesmo dado sem depender de ver o gráfico. */}
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Ver como tabela</summary>
                  <div className="mt-2 max-h-72 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface text-left">
                        <tr className="border-b border-border">
                          <th className="py-1.5 pr-4 font-medium">{serie.granularidade === "semana" ? "Semana de" : "Período"}</th>
                          <th className="py-1.5 pr-4 text-right font-medium">Abertos</th>
                          <th className="py-1.5 text-right font-medium">Resolvidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serie.pontos.map((p) => (
                          <tr key={p.chave} className="border-b border-border last:border-0">
                            <td className="py-1.5 pr-4 capitalize">{p.rotulo}</td>
                            <td className="py-1.5 pr-4 text-right tabular-nums">{p.criados}</td>
                            <td className="py-1.5 text-right tabular-nums">{p.resolvidos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <RankingBarras titulo="Por cliente" itens={ranking.cliente} metrica={metrica} params={paramsAtuais} limite={10} />
              <RankingBarras titulo="Por categoria" itens={ranking.categoria} metrica={metrica} params={paramsAtuais} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <RankingBarras titulo="Por prioridade" itens={ranking.prioridade} metrica={metrica} params={paramsAtuais} />
              <RankingBarras titulo="Por canal" itens={ranking.canal} metrica={metrica} params={paramsAtuais} />
              <RankingBarras titulo="Por sistema" itens={ranking.sistema} metrica={metrica} params={paramsAtuais} limite={6} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className={ranking.responsavel.length > 1 ? "" : "lg:col-span-2"}>
                <MapaDeCalor heatmap={relatorio.heatmap} />
              </div>
              {ranking.responsavel.length > 1 ? (
                <RankingBarras titulo="Por responsável" itens={ranking.responsavel} metrica={metrica} params={paramsAtuais} />
              ) : null}
            </div>

            <ListaDoRecorte relatorio={relatorio} />
          </div>
        )}
      </div>
    </>
  );
}
