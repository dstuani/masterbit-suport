import Link from "next/link";
import { format, startOfYear, subDays } from "date-fns";
import { ArrowLeft, HardDrive, Monitor, WifiOff, Wrench } from "lucide-react";

import { RankingBarras } from "@/app/(app)/relatorios/graficos";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DIAS_SEM_COLETA, TIPOS_EQUIPAMENTO, TIPOS_MANUTENCAO } from "@/lib/constants";
import { descreverAlteracao, type RelatorioEquipamentos } from "@/lib/services/relatorio-equipamentos";
import { cn, formatarData, formatarDuracao, formatarMoeda, formatarRelativo } from "@/lib/utils";
import { BotaoCsv } from "./exportar";

const AAAA_MM_DD = "yyyy-MM-dd";

/** A parte visual do relatório, separada da busca para poder ser vista com dados de exemplo. */
export function PainelRelatorioEquipamentos({
  relatorio,
  clientes,
  params,
  de,
  ate,
}: {
  relatorio: RelatorioEquipamentos;
  clientes: { id: string; razao_social: string }[];
  params: Record<string, string | undefined>;
  de: string;
  ate: string;
}) {
  const hoje = new Date();
  // Filtros atuais, repassados às barras e aos atalhos de período sem perder os outros.
  const atuais: Record<string, string> = { de, ate };
  for (const chave of ["cliente", "tipo", "manutencao"]) if (params[chave]) atuais[chave] = params[chave]!;
  const comPeriodo = (novoDe: string, novoAte: string) =>
    `/equipamentos/relatorio?${new URLSearchParams({ ...atuais, de: novoDe, ate: novoAte })}`;
  const atalhos = [
    { rotulo: "Últimos 30 dias", de: format(subDays(hoje, 29), AAAA_MM_DD) },
    { rotulo: "Últimos 90 dias", de: format(subDays(hoje, 89), AAAA_MM_DD) },
    { rotulo: "Últimos 12 meses", de: format(subDays(hoje, 364), AAAA_MM_DD) },
    { rotulo: "Este ano", de: format(startOfYear(hoje), AAAA_MM_DD) },
  ];
  const hojeTexto = format(hoje, AAAA_MM_DD);
  const filtrando = Boolean(params.cliente || params.tipo || params.manutencao);
  const { kpis } = relatorio;

  const linhasCsv = relatorio.manutencoes.map((m) => [
    formatarData(m.realizada_em),
    m.equipamentos?.nome ?? "",
    m.equipamentos?.clientes?.razao_social ?? "",
    TIPOS_MANUTENCAO[m.tipo as keyof typeof TIPOS_MANUTENCAO] ?? m.tipo,
    m.descricao,
    m.peca_retirada,
    m.peca_instalada,
    m.custo === null ? null : Number(m.custo).toFixed(2).replace(".", ","),
    m.tempo_minutos,
  ]);

  return (
    <>
      <PageHeader
        titulo="Relatório de equipamentos"
        descricao="Manutenções, trocas de peça e a situação do parque de máquinas."
        acoes={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/equipamentos">
                <ArrowLeft />
                Equipamentos
              </Link>
            </Button>
            <BotaoCsv
              nomeArquivo={`manutencoes-${de}-${ate}.csv`}
              cabecalho={["Data", "Equipamento", "Cliente", "Tipo", "O que foi feito", "Peça retirada", "Peça instalada", "Custo (R$)", "Tempo (min)"]}
              linhas={linhasCsv}
              rotulo="Exportar manutenções"
            />
          </div>
        }
      />

      {/* Filtros: GET simples, ficam na URL. */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {atalhos.map((a) => (
            <Button key={a.rotulo} asChild size="sm" variant={a.de === de && ate === hojeTexto ? "primary" : "outline"}>
              <Link href={comPeriodo(a.de, hojeTexto)}>{a.rotulo}</Link>
            </Button>
          ))}
        </div>
        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_auto_repeat(3,minmax(0,1fr))_auto]">
          <Input type="date" name="de" defaultValue={de} max={ate} aria-label="Data inicial" className="lg:w-40" />
          <Input type="date" name="ate" defaultValue={ate} min={de} aria-label="Data final" className="lg:w-40" />
          <Select name="cliente" defaultValue={params.cliente ?? ""} aria-label="Cliente">
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razao_social}
              </option>
            ))}
          </Select>
          <Select name="tipo" defaultValue={params.tipo ?? ""} aria-label="Tipo de equipamento">
            <option value="">Todos os equipamentos</option>
            {Object.entries(TIPOS_EQUIPAMENTO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Select>
          <Select name="manutencao" defaultValue={params.manutencao ?? ""} aria-label="Tipo de manutenção">
            <option value="">Todas as manutenções</option>
            {Object.entries(TIPOS_MANUTENCAO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {filtrando ? (
              <Button asChild variant="ghost">
                <Link href={`/equipamentos/relatorio?${new URLSearchParams({ de, ate })}`}>Limpar</Link>
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Equipamentos em uso" valor={String(kpis.emUso)}>
          {kpis.semColeta > 0 ? `${kpis.semColeta} sem coleta há ${DIAS_SEM_COLETA}+ dias` : "Todos enviando coleta"}
        </Indicador>
        <Indicador rotulo="Manutenções no período" valor={String(kpis.manutencoes)}>
          {kpis.minutos > 0 ? `${formatarDuracao(kpis.minutos)} de trabalho` : "Sem tempo registrado"}
        </Indicador>
        <Indicador rotulo="Trocas de peça" valor={String(kpis.trocasRegistradas + kpis.trocasDetectadas)}>
          {kpis.trocasRegistradas} registradas · {kpis.trocasDetectadas} percebidas pela coleta
        </Indicador>
        <Indicador rotulo="Custo registrado" valor={formatarMoeda(kpis.custo)}>
          Peças e serviços de terceiros
        </Indicador>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Manutenções no período</h2>
        {kpis.manutencoes === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Wrench className="size-6" />
              Nenhuma manutenção neste período e filtro. Registre manutenções na ficha de cada equipamento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <RankingBarras titulo="Por tipo de manutenção" itens={relatorio.porTipoManutencao} metrica="atendimentos" params={atuais} base="/equipamentos/relatorio" />
            <RankingBarras titulo="Por cliente" itens={relatorio.porCliente} metrica="atendimentos" params={atuais} base="/equipamentos/relatorio" />
            <RankingBarras
              titulo="Máquinas com mais manutenções"
              descricao="Clique para abrir a ficha"
              itens={relatorio.maisManutencoes}
              metrica="atendimentos"
              params={atuais}
              limite={10}
            />
          </div>
        )}

        <h2 className="mt-2 text-sm font-medium text-muted-foreground">Como está o parque hoje</h2>
        {kpis.emUso === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Monitor className="size-6" />
              Nenhum equipamento em uso com estes filtros.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <RankingBarras titulo="Por tipo de equipamento" itens={relatorio.porTipoEquipamento} metrica="atendimentos" params={atuais} base="/equipamentos/relatorio" />
            <RankingBarras titulo="Por sistema operacional" itens={relatorio.porSistema} metrica="atendimentos" params={atuais} limite={6} />
            <RankingBarras titulo="Por memória" itens={relatorio.porMemoria} metrica="atendimentos" params={atuais} ordenar={false} />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <HardDrive className="size-4 text-muted-foreground" />
                Discos quase cheios (90% ou mais)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatorio.discosCheios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum disco acima de 90% de uso.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {relatorio.discosCheios.slice(0, 15).map((d) => (
                    <li key={`${d.id}${d.letra}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <Link href={`/equipamentos/${d.id}`} className="font-medium text-primary hover:underline">
                          {d.nome}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {d.cliente} · {d.letra}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-semibold tabular-nums">{d.uso}%</span>
                        <span className="block text-xs text-muted-foreground">
                          {d.livreGb.toLocaleString("pt-BR")} GB livres
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <WifiOff className="size-4 text-muted-foreground" />
                Sem coleta há {DIAS_SEM_COLETA}+ dias
              </CardTitle>
              <p className="text-xs text-muted-foreground">Agente parado, máquina desligada ou fora da rede.</p>
            </CardHeader>
            <CardContent>
              {relatorio.semColeta.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todas as máquinas com agente enviaram coleta recentemente.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {relatorio.semColeta.slice(0, 15).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <Link href={`/equipamentos/${e.id}`} className="font-medium text-primary hover:underline">
                          {e.nome}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">{e.cliente}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {e.ultimaColeta ? formatarRelativo(e.ultimaColeta) : "Nunca"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {relatorio.manutencoes.length > 0 ? (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Manutenções do período ({relatorio.manutencoes.length})</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-surface-muted text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Manutenção</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">Equipamento</th>
                    <th className="hidden px-4 py-2 font-medium lg:table-cell">Peças</th>
                    <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.manutencoes.slice(0, 100).map((m) => (
                    <tr key={m.id} className="border-b border-border align-top last:border-0">
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge>{TIPOS_MANUTENCAO[m.tipo as keyof typeof TIPOS_MANUTENCAO] ?? m.tipo}</Badge>
                          <span className="text-xs text-muted-foreground">{formatarData(m.realizada_em)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap">{m.descricao}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                          {m.equipamentos?.nome} · {m.equipamentos?.clientes?.razao_social}
                        </p>
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        {m.equipamentos ? (
                          <Link href={`/equipamentos/${m.equipamentos.id}`} className="text-primary hover:underline">
                            {m.equipamentos.nome}
                          </Link>
                        ) : null}
                        <span className="block text-xs text-muted-foreground">{m.equipamentos?.clientes?.razao_social}</span>
                      </td>
                      <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">
                        {m.peca_retirada || m.peca_instalada ? `${m.peca_retirada ?? "—"} → ${m.peca_instalada ?? "—"}` : "—"}
                      </td>
                      <td className="hidden px-4 py-2 text-right whitespace-nowrap tabular-nums md:table-cell">
                        {m.custo === null ? "—" : formatarMoeda(Number(m.custo))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {relatorio.manutencoes.length > 100 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground">Mostrando as 100 mais recentes. O CSV leva todas.</p>
            ) : null}
          </Card>
        ) : null}

        {relatorio.alteracoes.length > 0 ? (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mudanças de hardware percebidas pela coleta ({relatorio.alteracoes.length})</CardTitle>
              <p className="text-xs text-muted-foreground">
                Peças que mudaram entre dois envios do agente, mesmo sem manutenção registrada.
              </p>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-surface-muted text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Mudança</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">Equipamento</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.alteracoes.slice(0, 100).map((a) => {
                    const d = descreverAlteracao(a);
                    return (
                      <tr key={a.id} className={cn("border-b border-border align-top last:border-0")}>
                        <td className="px-4 py-2">
                          <span className="text-xs text-muted-foreground">{d.nome}</span>
                          <p className="break-words">
                            {d.antes} <span className="text-muted-foreground">→</span> {d.depois}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                            {a.equipamentos?.nome} · {formatarData(a.detectada_em)}
                          </p>
                        </td>
                        <td className="hidden px-4 py-2 md:table-cell">
                          {a.equipamentos ? (
                            <Link href={`/equipamentos/${a.equipamentos.id}`} className="text-primary hover:underline">
                              {a.equipamentos.nome}
                            </Link>
                          ) : null}
                          <span className="block text-xs text-muted-foreground">{a.equipamentos?.clientes?.razao_social}</span>
                        </td>
                        <td className="hidden px-4 py-2 whitespace-nowrap text-muted-foreground md:table-cell">
                          {formatarData(a.detectada_em)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function Indicador({ rotulo, valor, children }: { rotulo: string; valor: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="mt-1 text-2xl font-semibold sm:text-3xl">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}
