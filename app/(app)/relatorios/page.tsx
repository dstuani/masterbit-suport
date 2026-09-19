import { format, startOfMonth } from "date-fns";
import { BarChart3, Clock, CheckCircle2, XCircle, InboxIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { obterRelatorio, type ItemGrafico } from "@/lib/services/relatorios";
import { formatarDuracao } from "@/lib/utils";

import { SeletorDePeriodo } from "./periodo";
import { BotaoExportarRelatorio } from "./exportar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios" };

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
  const de = params.de ?? format(startOfMonth(hoje), "yyyy-MM-dd");
  const ate = params.ate ?? format(hoje, "yyyy-MM-dd");

  const dados = await obterRelatorio(de, ate);

  const taxaResolucao =
    dados.total > 0 ? Math.round((dados.resolvidos / dados.total) * 100) : 0;

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        descricao="Volume e tempo de suporte no período selecionado."
        acoes={<BotaoExportarRelatorio itens={dados.itens} periodo={{ de, ate }} />}
      />

      <SeletorDePeriodo de={de} ate={ate} />

      {/* KPIs */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <KPI
          rotulo="Total no período"
          valor={String(dados.total)}
          icone={BarChart3}
        />
        <KPI
          rotulo="Em aberto"
          valor={String(dados.emAberto)}
          icone={InboxIcon}
        />
        <KPI
          rotulo="Resolvidos"
          valor={`${dados.resolvidos} (${taxaResolucao}%)`}
          icone={CheckCircle2}
          cor="text-emerald-600 dark:text-emerald-400"
        />
        <KPI
          rotulo="Cancelados"
          valor={String(dados.cancelados)}
          icone={XCircle}
          cor="text-neutral-500"
        />
        <KPI
          rotulo="Tempo total"
          valor={formatarDuracao(dados.tempoTotalMinutos)}
          detalhe={dados.resolvidos > 0 ? `Média: ${formatarDuracao(dados.tempoMedioMinutos)}` : undefined}
          icone={Clock}
        />
      </div>

      {dados.total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhum atendimento no período</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione outro período ou aguarde novos registros.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gráficos de distribuição */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-4">
            <GraficoBarras titulo="Por Status" itens={dados.porStatus} />
            <GraficoBarras titulo="Por Prioridade" itens={dados.porPrioridade} />
            <GraficoBarras titulo="Por Tipo" itens={dados.porTipo} />
            <GraficoBarras titulo="Por Canal" itens={dados.porCanal} />
          </div>

          {/* Clientes e categorias */}
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            {dados.porCliente.length > 0 ? (
              <GraficoBarras
                titulo="Top Clientes"
                itens={dados.porCliente.map((c) => ({
                  chave: c.nome,
                  rotulo: c.nome,
                  total: c.total,
                  minutos: c.minutos,
                }))}
                mostrarMinutos
              />
            ) : null}

            {dados.porCategoria.length > 0 ? (
              <GraficoBarras
                titulo="Por Categoria"
                itens={dados.porCategoria.map((c) => ({
                  chave: c.nome,
                  rotulo: c.nome,
                  total: c.total,
                  minutos: c.minutos,
                }))}
              />
            ) : null}
          </div>

          {/* Evolução mensal */}
          {dados.evolucaoMensal.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Evolução mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <TabelaEvolucao linhas={dados.evolucaoMensal} />
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}

// ─── Componentes internos (servidor) ────────────────────────────────────────

function KPI({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone: React.ElementType;
  cor?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{rotulo}</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums truncate ${cor ?? ""}`}>
            {valor}
          </p>
          {detalhe ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>
          ) : null}
        </div>
        <Icone className={`size-4 shrink-0 mt-0.5 ${cor ?? "text-muted-foreground"}`} />
      </CardContent>
    </Card>
  );
}

function GraficoBarras({
  titulo,
  itens,
  mostrarMinutos,
}: {
  titulo: string;
  itens: ItemGrafico[];
  mostrarMinutos?: boolean;
}) {
  if (itens.length === 0) return null;
  const max = Math.max(...itens.map((i) => i.total), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {itens.map((item) => (
          <div key={item.chave}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">{item.rotulo}</span>
              <span className="shrink-0 tabular-nums text-xs font-medium">
                {item.total}
                {mostrarMinutos && item.minutos > 0 ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {formatarDuracao(item.minutos)}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((item.total / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TabelaEvolucao({
  linhas,
}: {
  linhas: { mes: string; rotulo: string; criados: number; resolvidos: number }[];
}) {
  const maxCriados = Math.max(...linhas.map((l) => l.criados), 1);
  const maxResolvidos = Math.max(...linhas.map((l) => l.resolvidos), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-medium text-muted-foreground w-24">Mês</th>
            <th className="pb-2 font-medium text-muted-foreground">Criados</th>
            <th className="pb-2 font-medium text-muted-foreground">Resolvidos</th>
            <th className="pb-2 font-medium text-muted-foreground w-20 text-right">Taxa</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const taxa =
              linha.criados > 0
                ? Math.round((linha.resolvidos / linha.criados) * 100)
                : 0;
            return (
              <tr key={linha.mes} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-4 font-medium capitalize">{linha.rotulo}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0 tabular-nums text-right">{linha.criados}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-sky-500"
                        style={{
                          width: `${Math.round((linha.criados / maxCriados) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0 tabular-nums text-right">{linha.resolvidos}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.round((linha.resolvidos / maxResolvidos) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {taxa}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
