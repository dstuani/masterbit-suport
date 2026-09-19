import Image from "next/image";

import { cn } from "@/lib/utils";

/** Marca do produto: logo da Masterbit + nome do sistema. */
export function Logo({ className, tamanho = "md" }: { className?: string; tamanho?: "md" | "lg" }) {
  const altura = tamanho === "lg" ? 36 : 28;

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/masterbit-logo.png"
        alt="Masterbit"
        width={Math.round((altura * 401) / 148)}
        height={altura}
        priority
      />
      <span
        className={cn(
          "border-l border-border pl-2 font-semibold tracking-tight",
          tamanho === "lg" ? "text-base" : "text-sm",
        )}
      >
        Suport
      </span>
    </span>
  );
}
