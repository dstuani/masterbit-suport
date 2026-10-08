"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CANAIS, PRIORIDADES, STATUS_ATENDIMENTO, TIPOS_ATENDIMENTO } from "@/lib/constants";
import type { OpcoesDeFiltro } from "@/lib/services/relatorios";
import { cn } from "@/lib/utils";

const AAAA_MM_DD = "yyyy-MM-dd";

function periodosRapidos() {
  const hoje = new Date();
  return [
    { rotulo: "Últimos 7 dias", de: format(subDays(hoje, 6), AAAA_MM_DD), ate: format(hoje, AAAA_MM_DD) },
    { rotulo: "Últimos 30 dias", de: format(subDays(hoje, 29), AAAA_MM_DD), ate: format(hoje, AAAA_MM_DD) },
    { rotulo: "Este mês", de: format(startOfMonth(hoje), AAAA_MM_DD), ate: format(hoje, AAAA_MM_DD) },
    {
      rotulo: "Mês passado",
      de: format(startOfMonth(subMonths(hoje, 1)), AAAA_MM_DD),
      ate: format(endOfMonth(subMonths(hoje, 1)), AAAA_MM_DD),
    },
    { rotulo: "Últimos 3 meses", de: format(startOfMonth(subMonths(hoje, 2)), AAAA_MM_DD), ate: format(hoje, AAAA_MM_DD) },
    { rotulo: "Este ano", de: format(startOfYear(hoje), AAAA_MM_DD), ate: format(hoje, AAAA_MM_DD) },
  ];
}

/** Parâmetros que são filtros de recorte (o período e a métrica ficam de fora da contagem). */
const CHAVES_DE_FILTRO = ["cliente", "categoria", "sistema", "responsavel", "canal", "tipo", "prioridade", "status"] as const;

export function FiltrosRelatorio({
  de,
  ate,
  metrica,
  opcoes,
}: {
  de: string;
  ate: string;
  metrica: "atendimentos" | "tempo";
  opcoes: OpcoesDeFiltro;
}) {
  const router = useRouter();
  const buscaAtual = useSearchParams();
  const [pendente, iniciar] = useTransition();

  // "Refetch mantém a moldura": enquanto os números novos carregam, o conteúdo atual
  // fica esmaecido em vez de piscar ou sumir.
  useEffect(() => {
    document.getElementById("relatorio-conteudo")?.setAttribute("data-carregando", String(pendente));
  }, [pendente]);

  function aplicar(mudancas: Record<string, string | null>) {
    const params = new URLSearchParams(buscaAtual.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) params.set(chave, valor);
      else params.delete(chave);
    }
    iniciar(() => router.replace(`/relatorios?${params}`, { scroll: false }));
  }

  const ativos = CHAVES_DE_FILTRO.filter((c) => buscaAtual.get(c));
  const valor = (chave: string) => buscaAtual.get(chave) ?? "";
  const periodos = periodosRapidos();
  const periodoAtivo = periodos.findIndex((p) => p.de === de && p.ate === ate);

  const seletor = (chave: string, rotulo: string, todos: string, itens: { valor: string; nome: string }[]) => (
    <Select
      key={chave}
      aria-label={rotulo}
      value={valor(chave)}
      onChange={(e) => aplicar({ [chave]: e.target.value || null })}
      className={cn("h-8", valor(chave) && "border-primary bg-primary/5 font-medium")}
    >
      <option value="">{todos}</option>
      {itens.map((i) => (
        <option key={i.valor} value={i.valor}>
          {i.nome}
        </option>
      ))}
    </Select>
  );

  const doEnum = (obj: Record<string, string | { rotulo: string }>) =>
    Object.entries(obj).map(([v, o]) => ({ valor: v, nome: typeof o === "string" ? o : o.rotulo }));

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Período e métrica */}
      <div className="flex flex-wrap items-center gap-2">
        {periodos.map((p, i) => (
          <Button
            key={p.rotulo}
            size="sm"
            variant={i === periodoAtivo ? "primary" : "outline"}
            onClick={() => aplicar({ de: p.de, ate: p.ate })}
          >
            {p.rotulo}
          </Button>
        ))}
        <span className="px-1 text-xs text-muted-foreground">ou</span>
        <Input
          type="date"
          value={de}
          max={ate}
          className="h-8 w-36 text-sm"
          aria-label="Data inicial"
          onChange={(e) => e.target.value && aplicar({ de: e.target.value })}
        />
        <span className="text-sm text-muted-foreground">até</span>
        <Input
          type="date"
          value={ate}
          min={de}
          className="h-8 w-36 text-sm"
          aria-label="Data final"
          onChange={(e) => e.target.value && aplicar({ ate: e.target.value })}
        />

        <div role="radiogroup" aria-label="O que medir nas barras" className="ml-auto flex rounded-app border border-border p-0.5">
          {(
            [
              ["atendimentos", "Atendimentos"],
              ["tempo", "Tempo gasto"],
            ] as const
          ).map(([chave, rotulo]) => (
            <button
              key={chave}
              type="button"
              role="radio"
              aria-checked={metrica === chave}
              onClick={() => aplicar({ metrica: chave === "atendimentos" ? null : chave })}
              className={cn(
                "rounded-[8px] px-3 py-1 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                metrica === chave ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Recortes */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {seletor("cliente", "Cliente", "Todos os clientes", opcoes.clientes.map((c) => ({ valor: c.id, nome: c.nome })))}
        {seletor("categoria", "Categoria", "Todas as categorias", opcoes.categorias.map((c) => ({ valor: c.id, nome: c.nome })))}
        {seletor("sistema", "Sistema", "Todos os sistemas", opcoes.sistemas.map((s) => ({ valor: s.id, nome: s.nome })))}
        {seletor("responsavel", "Responsável", "Todos os responsáveis", opcoes.responsaveis.map((r) => ({ valor: r.id, nome: r.nome })))}
        {seletor("status", "Situação", "Todas as situações", doEnum(STATUS_ATENDIMENTO))}
        {seletor("canal", "Canal", "Todos os canais", doEnum(CANAIS))}
        {seletor("tipo", "Tipo", "Todos os tipos", doEnum(TIPOS_ATENDIMENTO))}
        {seletor("prioridade", "Prioridade", "Todas as prioridades", doEnum(PRIORIDADES))}
      </div>

      {ativos.length > 0 ? (
        <div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => aplicar(Object.fromEntries(CHAVES_DE_FILTRO.map((c) => [c, null])))}
          >
            <X />
            Limpar {ativos.length === 1 ? "o filtro" : `os ${ativos.length} filtros`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
