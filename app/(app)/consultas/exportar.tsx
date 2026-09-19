"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResultadoBusca } from "@/lib/services/consultas";

function escaparCSV(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const s = String(valor);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatarDataCSV(valor: string | null | undefined): string {
  if (!valor) return "";
  return new Date(valor).toLocaleDateString("pt-BR");
}

export function BotaoExportarCSV({ itens }: { itens: ResultadoBusca[] }) {
  function exportar() {
    const cabecalho = [
      "Número",
      "Assunto",
      "Cliente",
      "Status",
      "Prioridade",
      "Tipo",
      "Categoria",
      "Sistema",
      "Tempo (min)",
      "Aberto em",
      "Fechado em",
    ].join(",");

    const linhas = itens.map((item) =>
      [
        escaparCSV(item.numero),
        escaparCSV(item.titulo),
        escaparCSV(item.cliente_nome),
        escaparCSV(item.status),
        escaparCSV(item.prioridade),
        escaparCSV(item.tipo),
        escaparCSV(item.categoria_nome),
        escaparCSV(item.sistema_nome),
        escaparCSV(String(item.tempo_gasto_minutos ?? 0)),
        escaparCSV(formatarDataCSV(item.iniciado_em)),
        escaparCSV(formatarDataCSV(item.finalizado_em)),
      ].join(","),
    );

    const conteudo = [cabecalho, ...linhas].join("\n");
    const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atendimentos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={exportar} disabled={itens.length === 0}>
      <Download className="size-4" />
      Exportar CSV ({itens.length})
    </Button>
  );
}
