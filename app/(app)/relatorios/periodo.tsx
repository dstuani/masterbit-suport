"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function presets() {
  const hoje = new Date();
  return [
    {
      rotulo: "Este mês",
      de: format(startOfMonth(hoje), "yyyy-MM-dd"),
      ate: format(hoje, "yyyy-MM-dd"),
    },
    {
      rotulo: "Mês passado",
      de: format(startOfMonth(subMonths(hoje, 1)), "yyyy-MM-dd"),
      ate: format(endOfMonth(subMonths(hoje, 1)), "yyyy-MM-dd"),
    },
    {
      rotulo: "Últimos 3 meses",
      de: format(startOfMonth(subMonths(hoje, 2)), "yyyy-MM-dd"),
      ate: format(hoje, "yyyy-MM-dd"),
    },
    {
      rotulo: "Últimos 6 meses",
      de: format(startOfMonth(subMonths(hoje, 5)), "yyyy-MM-dd"),
      ate: format(hoje, "yyyy-MM-dd"),
    },
    {
      rotulo: "Este ano",
      de: format(startOfYear(hoje), "yyyy-MM-dd"),
      ate: format(hoje, "yyyy-MM-dd"),
    },
  ];
}

export function SeletorDePeriodo({
  de,
  ate,
}: {
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navegar(novoDe: string, novoAte: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("de", novoDe);
    params.set("ate", novoAte);
    router.replace(`/relatorios?${params}`);
  }

  const lista = presets();
  const ativoIndex = lista.findIndex((p) => p.de === de && p.ate === ate);
  const deHumano = de
    ? format(new Date(`${de}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })
    : "";
  const ateHumano = ate
    ? format(new Date(`${ate}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })
    : "";

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {lista.map((preset, i) => (
        <Button
          key={preset.rotulo}
          size="sm"
          variant={i === ativoIndex ? "primary" : "outline"}
          onClick={() => navegar(preset.de, preset.ate)}
        >
          {preset.rotulo}
        </Button>
      ))}

      <span className="text-muted-foreground text-xs px-1">ou</span>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={de}
          className="w-36 text-sm h-8"
          aria-label="Data inicial"
          onChange={(e) => {
            if (e.target.value) navegar(e.target.value, ate);
          }}
        />
        <span className="text-sm text-muted-foreground">até</span>
        <Input
          type="date"
          value={ate}
          className="w-36 text-sm h-8"
          aria-label="Data final"
          onChange={(e) => {
            if (e.target.value) navegar(de, e.target.value);
          }}
        />
      </div>

      {ativoIndex === -1 && de && ate ? (
        <span className="text-xs text-muted-foreground">
          {deHumano} → {ateHumano}
        </span>
      ) : null}
    </div>
  );
}
