"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { aplicarTema, assinarTema, lerTema, type Tema } from "@/lib/tema";
import { cn } from "@/lib/utils";

const OPCOES: { valor: Tema; rotulo: string; descricao: string; icone: LucideIcon }[] = [
  { valor: "claro", rotulo: "Claro", descricao: "Fundo claro", icone: Sun },
  { valor: "escuro", rotulo: "Escuro", descricao: "Fundo escuro", icone: Moon },
  { valor: "automatico", rotulo: "Automático", descricao: "Segue o seu sistema", icone: Monitor },
];

export function SeletorDeTema() {
  // No servidor não há localStorage: "automatico" é o palpite inicial, corrigido
  // logo após a hidratação sem causar aviso.
  const atual = useSyncExternalStore(assinarTema, lerTema, () => "automatico" as Tema);

  return (
    <div role="radiogroup" aria-label="Tema" className="grid gap-2 sm:grid-cols-3">
      {OPCOES.map(({ valor, rotulo, descricao, icone: Icone }) => {
        const ativo = atual === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aplicarTema(valor)}
            className={cn(
              "flex items-center gap-3 rounded-app border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ativo
                ? "border-primary bg-primary/10"
                : "border-border bg-surface hover:bg-surface-muted",
            )}
          >
            <Icone className={cn("size-5 shrink-0", ativo ? "text-primary" : "text-muted-foreground")} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{rotulo}</span>
              <span className="block text-xs text-muted-foreground">{descricao}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
