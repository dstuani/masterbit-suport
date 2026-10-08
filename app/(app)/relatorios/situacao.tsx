"use client";

import { useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDEM_SITUACAO, STATUS_ATENDIMENTO } from "@/lib/constants";
import type { LinhaSituacao, Relatorio } from "@/lib/services/relatorios";
import { cn, formatarDuracao } from "@/lib/utils";

type Metrica = "atendimentos" | "tempo";

const cor = (situacao: string) => `var(--sit-${situacao})`;

function href(params: Record<string, string>, itens: { nome: string; valor: string }[]) {
  const busca = new URLSearchParams(params);
  for (const i of itens) busca.set(i.nome, i.valor);
  return `/relatorios?${busca}`;
}

// ─── Bloco 1: como estão os atendimentos ─────────────────────────────────────

/** Barra única de 100%: a divisão do recorte entre as situações. A legenda carrega os números. */
export function BlocoSituacao({
  totais,
  params,
}: {
  totais: Relatorio["situacao"]["totais"];
  params: Record<string, string>;
}) {
  const soma = totais.reduce((s, t) => s + t.total, 0);

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Situação</CardTitle>
        <p className="text-xs text-muted-foreground">
          Como {soma === 1 ? "está o atendimento" : `estão os ${soma} atendimentos`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex h-5 gap-0.5" role="img" aria-label={`Divisão por situação: ${totais.filter((t) => t.total > 0).map((t) => `${t.rotulo} ${t.total}`).join(", ")}`}>
          {totais
            .filter((t) => t.total > 0)
            .map((t) => (
              <Link
                key={t.chave}
                href={href(params, [{ nome: "status", valor: t.chave }])}
                title={`${t.rotulo}: ${t.total}`}
                className="block h-full min-w-1 first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ flexGrow: t.total, background: cor(t.chave) }}
              />
            ))}
          {soma === 0 ? <span className="h-full flex-1 rounded-[4px] bg-surface-muted" /> : null}
        </div>

        <ul className="mt-4 space-y-1">
          {totais.map((t) => (
            <li key={t.chave}>
              <Link
                href={href(params, [{ nome: "status", valor: t.chave }])}
                className={cn(
                  "-mx-2 flex items-center gap-2 rounded-app px-2 py-1 text-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  t.total === 0 && "text-muted-foreground opacity-60",
                )}
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: cor(t.chave) }} />
                {t.rotulo}
                <span className="ml-auto font-semibold tabular-nums">{t.total}</span>
                <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                  {soma > 0 ? `${Math.round((t.total / soma) * 100)}%` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Bloco 2: situação dentro de cada tipo, categoria ou canal ───────────────

const ABAS = [
  { chave: "tipo", rotulo: "Tipo" },
  { chave: "categoria", rotulo: "Categoria" },
  { chave: "canal", rotulo: "Canal" },
] as const;

export function BlocoSituacaoPorDimensao({
  grupos,
  metrica,
  params,
}: {
  grupos: { tipo: LinhaSituacao[]; categoria: LinhaSituacao[]; canal: LinhaSituacao[] };
  metrica: Metrica;
  params: Record<string, string>;
}) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["chave"]>("tipo");
  const linhas = grupos[aba].slice(0, 8);
  const valorDe = (c?: { total: number; minutos: number }) => (c ? (metrica === "tempo" ? c.minutos : c.total) : 0);
  const totalDe = (l: LinhaSituacao) => (metrica === "tempo" ? l.minutos : l.total);
  const maximo = Math.max(1, ...linhas.map(totalDe));
  const formatar = (v: number) => (metrica === "tempo" ? formatarDuracao(v) : String(v));
  const presentes = ORDEM_SITUACAO.filter((s) => linhas.some((l) => (l.porStatus[s]?.total ?? 0) > 0));

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium">Situação por {ABAS.find((a) => a.chave === aba)!.rotulo.toLowerCase()}</CardTitle>
            <p className="text-xs text-muted-foreground">Quanto de cada um já foi resolvido</p>
          </div>
          <div role="tablist" aria-label="Agrupar por" className="flex shrink-0 gap-1">
            {ABAS.map((a) => (
              <button
                key={a.chave}
                type="button"
                role="tab"
                aria-selected={aba === a.chave}
                onClick={() => setAba(a.chave)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  aba === a.chave ? "border-foreground bg-foreground text-surface" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem dados neste recorte.</p>
        ) : (
          <div className="space-y-3">
            {linhas.map((l) => (
              <div key={l.chave} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-3">
                <span className="truncate text-sm" title={l.rotulo}>
                  {l.rotulo}
                </span>
                {/* Todas as barras na mesma escala: o comprimento compara os itens. */}
                <div className="flex h-3 gap-0.5" style={{ width: `${(totalDe(l) / maximo) * 100}%`, minWidth: 6 }}>
                  {ORDEM_SITUACAO.map((s) => {
                    const v = valorDe(l.porStatus[s]);
                    if (v === 0) return null;
                    const dica = `${l.rotulo} · ${STATUS_ATENDIMENTO[s].rotulo}: ${formatar(v)}`;
                    const itens = [{ nome: "status", valor: s }, ...(l.filtro ? [l.filtro] : [])];
                    return (
                      <Link
                        key={s}
                        href={href(params, itens)}
                        title={dica}
                        aria-label={dica}
                        className="block h-full min-w-[3px] first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ flexGrow: v, background: cor(s) }}
                      />
                    );
                  })}
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatar(totalDe(l))}</span>
              </div>
            ))}
          </div>
        )}

        {presentes.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {presentes.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: cor(s) }} />
                {STATUS_ATENDIMENTO[s].rotulo}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Gêmea em tabela: no tema claro alguns tons ficam abaixo de 3:1, então os números precisam estar à vista. */}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Ver como tabela</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 pr-3 font-medium">{ABAS.find((a) => a.chave === aba)!.rotulo}</th>
                  {presentes.map((s) => (
                    <th key={s} className="py-1.5 pr-3 text-right font-medium">
                      {STATUS_ATENDIMENTO[s].rotulo}
                    </th>
                  ))}
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.chave} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3">{l.rotulo}</td>
                    {presentes.map((s) => (
                      <td key={s} className="py-1.5 pr-3 text-right tabular-nums">
                        {formatar(valorDe(l.porStatus[s]))}
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-medium tabular-nums">{formatar(totalDe(l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
