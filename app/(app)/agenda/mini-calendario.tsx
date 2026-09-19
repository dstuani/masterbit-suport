"use client";

import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  parseISO,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EventoMini = {
  id: string;
  inicio: string;
  status: string;
};

const STATUS_PONTO: Record<string, string> = {
  agendado: "bg-sky-500",
  confirmado: "bg-indigo-500",
  realizado: "bg-emerald-500",
  cancelado: "bg-neutral-400",
  remarcado: "bg-amber-500",
};

export function MiniCalendario({
  eventos,
  mes: mesInicial,
}: {
  eventos: EventoMini[];
  mes: number; // YYYYMM
}) {
  const anoInicial = Math.floor(mesInicial / 100);
  const mInicial = mesInicial % 100;
  const [ref, setRef] = useState(new Date(anoInicial, mInicial, 1));

  function anterior() {
    setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
  }
  function proximo() {
    setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1));
  }

  const inicioMes = startOfMonth(ref);
  const fimMes = endOfMonth(ref);
  const dias = eachDayOfInterval({
    start: startOfWeek(inicioMes, { weekStartsOn: 0 }),
    end: endOfWeek(fimMes, { weekStartsOn: 0 }),
  });

  const eventosNoDia = (dia: Date) =>
    eventos.filter((e) => isSameDay(parseISO(e.inicio), dia));

  return (
    <Card>
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between">
          <button
            onClick={anterior}
            className="rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium capitalize">
            {format(ref, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={proximo}
            className="rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Cabeçalho dos dias */}
        <div className="mt-2 grid grid-cols-7 text-center">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i} className="py-1 text-xs text-muted-foreground">
              {d}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-1">
        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const evs = eventosNoDia(dia);
            const fora = !isSameMonth(dia, ref);
            const hoje = isToday(dia);
            const dataParam = format(dia, "yyyy-MM-dd");

            return (
              <Link
                key={dia.toISOString()}
                href={`/agenda?dia=${dataParam}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded py-1 text-xs transition-colors hover:bg-surface-muted",
                  fora && "opacity-30 pointer-events-none",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full font-medium",
                    hoje && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(dia, "d")}
                </span>

                {/* Bolinhas dos eventos (máx 3) */}
                {evs.length > 0 ? (
                  <div className="flex gap-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn("size-1.5 rounded-full", STATUS_PONTO[e.status] ?? "bg-muted")}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-1.5" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {Object.entries(STATUS_PONTO).map(([status, cor]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full shrink-0", cor)} />
              <span className="capitalize">
                {status === "agendado" ? "Agendado" : status === "confirmado" ? "Confirmado" : status === "realizado" ? "Realizado" : status === "cancelado" ? "Cancelado" : "Remarcado"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
