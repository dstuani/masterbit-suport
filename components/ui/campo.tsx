import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Rótulo + controle + dica, com o espaçamento padrão dos formulários. */
export function Campo({
  id,
  rotulo,
  dica,
  obrigatorio,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio ? <span className="ml-0.5 text-red-600">*</span> : null}
      </Label>
      {children}
      {dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}

export function CampoCheckbox({
  id,
  rotulo,
  className,
  ...props
}: React.ComponentProps<"input"> & { id: string; rotulo: string }) {
  return (
    <label htmlFor={id} className={cn("flex items-center gap-2 text-sm", className)}>
      <input
        id={id}
        type="checkbox"
        className="size-4 rounded border-border accent-[var(--primary)]"
        {...props}
      />
      {rotulo}
    </label>
  );
}
