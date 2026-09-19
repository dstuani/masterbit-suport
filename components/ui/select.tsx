import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Select nativo. Escolhido no lugar do Radix Select porque estes formulários são
 * enviados por Server Action com FormData: o nativo já participa do <form>, sem
 * campo espelho nem estado no cliente.
 */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-app border border-border bg-surface px-2.5 text-sm",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
