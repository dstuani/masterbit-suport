import { cn } from "@/lib/utils";

/** Barra de progresso. Sem "use client": serve tanto à lista quanto ao detalhe. */
export function BarraDeProgresso({
  valor,
  className,
  mostrarValor = true,
}: {
  valor: number;
  className?: string;
  mostrarValor?: boolean;
}) {
  const limitado = Math.min(100, Math.max(0, valor));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={limitado}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            limitado === 100 ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ width: `${limitado}%` }}
        />
      </div>
      {mostrarValor ? (
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {limitado}%
        </span>
      ) : null}
    </div>
  );
}
