"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import { cancelarPendenciaAction, concluirPendenciaAction, mudarStatusPendenciaAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";

// ─── Conclusão inline ─────────────────────────────────────────────────────────

export function BotaoConcluir({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(concluirPendenciaAction, estadoInicial);

  if (!aberto) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        onClick={() => setAberto(true)}
      >
        <CheckCircle2 className="size-3.5" />
        Concluir
      </Button>
    );
  }

  return (
    <form action={acao} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Textarea
        name="resultado"
        rows={2}
        autoFocus
        placeholder="Como foi resolvida?"
        className="text-sm"
      />
      {estado.erro ? (
        <p className="text-xs text-red-600 dark:text-red-400">{estado.erro}</p>
      ) : null}
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Confirmar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ─── Cancelar ────────────────────────────────────────────────────────────────

export function BotaoCancelar({ id }: { id: string }) {
  return (
    <form action={cancelarPendenciaAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
        Cancelar
      </Button>
    </form>
  );
}

// ─── Mudar status ─────────────────────────────────────────────────────────────

export function BotaoIniciar({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState(mudarStatusPendenciaAction, estadoInicial);

  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="em_andamento" />
      <Button type="submit" variant="ghost" size="sm" disabled={pendente}>
        Iniciar
      </Button>
      {estado.erro ? (
        <p className="text-xs text-red-600 dark:text-red-400">{estado.erro}</p>
      ) : null}
    </form>
  );
}
