"use client";

import { useState, useTransition } from "react";

import { mudarProgressoTopicoAction } from "./actions";

/**
 * Ajuste do progresso por arrastar. Grava ao soltar (ou ao soltar a tecla), não a
 * cada movimento: arrastar de 0 a 60 dispararia dezenas de gravações à toa.
 */
export function ControleDeProgresso({
  topicoId,
  progressoAtual,
}: {
  topicoId: string;
  progressoAtual: number;
}) {
  const [valor, setValor] = useState(progressoAtual);
  const [pendente, iniciar] = useTransition();

  function gravar() {
    if (valor === progressoAtual) return;
    const dados = new FormData();
    dados.set("id", topicoId);
    dados.set("progresso", String(valor));
    iniciar(() => mudarProgressoTopicoAction(dados));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor="progresso" className="text-sm text-muted-foreground">
          Progresso
        </label>
        <span className="text-lg font-semibold tabular-nums">{valor}%</span>
      </div>
      <input
        id="progresso"
        type="range"
        min={0}
        max={100}
        step={5}
        value={valor}
        disabled={pendente}
        onChange={(e) => setValor(Number(e.target.value))}
        onPointerUp={gravar}
        onKeyUp={gravar}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}
