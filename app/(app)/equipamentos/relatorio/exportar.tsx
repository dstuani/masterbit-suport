"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

function celula(valor: string | number | null | undefined) {
  const s = valor === null || valor === undefined ? "" : String(valor);
  // Ponto e vírgula: é o separador que o Excel em português abre direto em colunas.
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function BotaoCsv({
  nomeArquivo,
  cabecalho,
  linhas,
  rotulo,
}: {
  nomeArquivo: string;
  cabecalho: string[];
  linhas: (string | number | null)[][];
  rotulo: string;
}) {
  function exportar() {
    const conteudo = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={exportar} disabled={linhas.length === 0}>
      <Download className="size-4" />
      {rotulo} ({linhas.length})
    </Button>
  );
}
