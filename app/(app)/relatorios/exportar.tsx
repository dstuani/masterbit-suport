"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/types/database";

type LinhaLista = Database["public"]["Views"]["atendimentos_lista"]["Row"];

function escapar(valor: string | number | boolean | null | undefined): string {
  const s = valor === null || valor === undefined ? "" : String(valor);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function dataCSV(valor: string | null | undefined): string {
  if (!valor) return "";
  return new Date(valor).toLocaleDateString("pt-BR");
}

export function BotaoExportarRelatorio({
  itens,
  periodo,
}: {
  itens: LinhaLista[];
  periodo: { de: string; ate: string };
}) {
  function exportar() {
    const cabecalho = [
      "Número",
      "Assunto",
      "Cliente",
      "Status",
      "Prioridade",
      "Tipo",
      "Canal",
      "Categoria",
      "Sistema",
      "Responsável",
      "Tempo (min)",
      "Faturável",
      "Aberto em",
      "Fechado em",
    ].join(",");

    const linhas = itens.map((item) =>
      [
        escapar(item.numero),
        escapar(item.titulo),
        escapar(item.cliente_nome),
        escapar(item.status),
        escapar(item.prioridade),
        escapar(item.tipo),
        escapar(item.canal),
        escapar(item.categoria_nome),
        escapar(item.sistema_nome),
        escapar(item.responsavel_nome),
        escapar(item.tempo_gasto_minutos ?? 0),
        escapar(item.faturavel ? "Sim" : "Não"),
        escapar(dataCSV(item.iniciado_em)),
        escapar(dataCSV(item.finalizado_em)),
      ].join(","),
    );

    const conteudo = [cabecalho, ...linhas].join("\n");
    const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${periodo.de}-${periodo.ate}.csv`;
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
