"use client";

import { useEffect, useRef, useState } from "react";

import type { PontoDaSerie } from "@/lib/services/relatorios";

const ALTURA = 264; // inclui a faixa do eixo X: o cartão não ganha rolagem interna
const MARGEM = { topo: 14, direita: 44, base: 30, esquerda: 38 };

/** Escala "redonda" até o máximo: 0, 5, 10, 15... em vez de números quebrados. */
function escalaDeY(maximo: number) {
  if (maximo <= 4) return { teto: 4, passo: 1 };
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  return { teto: passo * 4, passo };
}

export function GraficoLinhas({
  pontos,
  granularidade,
}: {
  pontos: PontoDaSerie[];
  granularidade: "dia" | "semana" | "mes";
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(entrada.contentRect.width, 280)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const n = pontos.length;
  const maximo = Math.max(1, ...pontos.flatMap((p) => [p.criados, p.resolvidos]));
  const { teto, passo } = escalaDeY(maximo);
  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;

  const x = (i: number) => MARGEM.esquerda + (n === 1 ? larguraUtil / 2 : (i / (n - 1)) * larguraUtil);
  const y = (v: number) => MARGEM.topo + alturaUtil - (v / teto) * alturaUtil;

  const caminho = (campo: "criados" | "resolvidos") =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[campo]).toFixed(1)}`).join(" ");

  // No máximo ~7 rótulos no eixo X, espaçados por igual.
  const saltoX = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(larguraUtil / 64))));
  // O último ponto só ganha rótulo se couber longe do anterior (senão os textos se sobrepõem).
  const mostraRotulo = (i: number) => i % saltoX === 0 || (i === n - 1 && (n - 1) % saltoX >= saltoX * 0.6);
  const ticksY = Array.from({ length: 5 }, (_, i) => i * passo);

  function indiceMaisProximo(clientX: number) {
    const caixaSvg = caixa.current?.getBoundingClientRect();
    if (!caixaSvg || n === 0) return null;
    const relativo = clientX - caixaSvg.left - MARGEM.esquerda;
    return Math.min(n - 1, Math.max(0, n === 1 ? 0 : Math.round((relativo / larguraUtil) * (n - 1))));
  }

  const ultimo = pontos[n - 1];
  const rotuloDoPonto = (p: PontoDaSerie) => (granularidade === "semana" ? `Semana de ${p.rotulo}` : p.rotulo);
  const dica = ativo !== null ? pontos[ativo] : null;
  const dicaNaDireita = ativo !== null && x(ativo) < largura / 2;

  return (
    <div>
      {/* Legenda: dois itens, com a chave em linha (como a marca do gráfico). */}
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: "var(--viz-1)" }} />
          Abertos no período
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: "var(--viz-2)" }} />
          Resolvidos no período
        </li>
      </ul>

      <div ref={caixa} className="relative" style={{ height: ALTURA }}>
        <svg
          width={largura}
          height={ALTURA}
          role="img"
          tabIndex={0}
          aria-label={`Gráfico de linhas: atendimentos abertos e resolvidos por ${granularidade === "mes" ? "mês" : granularidade}. Os mesmos números estão na tabela abaixo.`}
          className="touch-pan-y overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerMove={(e) => setAtivo(indiceMaisProximo(e.clientX))}
          onPointerLeave={() => setAtivo(null)}
          onFocus={() => setAtivo((a) => a ?? n - 1)}
          onBlur={() => setAtivo(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setAtivo((a) => Math.min(n - 1, (a ?? -1) + 1));
            if (e.key === "ArrowLeft") setAtivo((a) => Math.max(0, (a ?? n) - 1));
            if (e.key === "Escape") setAtivo(null);
          }}
        >
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(t)} y2={y(t)} stroke="var(--viz-grade)" strokeWidth={1} />
              <text x={MARGEM.esquerda - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                {Math.round(t * 10) / 10}
              </text>
            </g>
          ))}
          <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(0)} y2={y(0)} stroke="var(--viz-eixo)" strokeWidth={1} />

          {pontos.map((p, i) =>
            mostraRotulo(i) ? (
              <text key={p.chave} x={x(i)} y={ALTURA - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {p.rotulo}
              </text>
            ) : null,
          )}

          <path d={caminho("criados")} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={caminho("resolvidos")} fill="none" stroke="var(--viz-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Rótulos só no fim das linhas; o resto fica para a mira e a tabela. */}
          {ultimo ? (
            <>
              <circle cx={x(n - 1)} cy={y(ultimo.criados)} r={4} fill="var(--viz-1)" stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(n - 1)} cy={y(ultimo.resolvidos)} r={4} fill="var(--viz-2)" stroke="var(--surface)" strokeWidth={2} />
              <text x={x(n - 1) + 10} y={y(ultimo.criados)} dy="0.32em" className="fill-foreground text-[11px] font-medium">
                {ultimo.criados}
              </text>
              {Math.abs(y(ultimo.criados) - y(ultimo.resolvidos)) > 13 ? (
                <text x={x(n - 1) + 10} y={y(ultimo.resolvidos)} dy="0.32em" className="fill-foreground text-[11px] font-medium">
                  {ultimo.resolvidos}
                </text>
              ) : null}
            </>
          ) : null}

          {ativo !== null && dica ? (
            <g pointerEvents="none">
              <line x1={x(ativo)} x2={x(ativo)} y1={MARGEM.topo} y2={y(0)} stroke="var(--viz-eixo)" strokeWidth={1} />
              <circle cx={x(ativo)} cy={y(dica.criados)} r={4} fill="var(--viz-1)" stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(ativo)} cy={y(dica.resolvidos)} r={4} fill="var(--viz-2)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          ) : null}
        </svg>

        {dica && ativo !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-app border border-border bg-surface px-3 py-2 text-xs shadow-md"
            style={dicaNaDireita ? { left: x(ativo) + 12 } : { left: x(ativo) - 12, transform: "translateX(-100%)" }}
          >
            <p className="mb-1.5 font-medium text-muted-foreground">{rotuloDoPonto(dica)}</p>
            <p className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: "var(--viz-1)" }} />
              <span className="text-sm font-semibold tabular-nums">{dica.criados}</span>
              <span className="text-muted-foreground">abertos</span>
            </p>
            <p className="mt-0.5 flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: "var(--viz-2)" }} />
              <span className="text-sm font-semibold tabular-nums">{dica.resolvidos}</span>
              <span className="text-muted-foreground">resolvidos</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
