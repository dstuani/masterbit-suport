"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/** Abre a janela de impressão sozinha (lá se escolhe "Salvar como PDF"); o botão serve para repetir. */
export function BarraDeImpressao({ automatico }: { automatico: boolean }) {
  useEffect(() => {
    if (!automatico) return;
    // Pequena espera para as fontes e a logo terminarem de carregar antes de imprimir.
    const espera = setTimeout(() => window.print(), 600);
    return () => clearTimeout(espera);
  }, [automatico]);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 print:hidden">
      <p>
        Na janela de impressão, escolha <strong>Salvar como PDF</strong> como destino.
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-[#c4561b] px-3 py-1.5 font-medium text-white hover:bg-[#a9470f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4561b]"
      >
        <Printer className="size-4" />
        Imprimir / salvar PDF
      </button>
    </div>
  );
}
