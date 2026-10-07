"use client";

import { useActionState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";

import { mudarStatusSolicitacaoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { estadoInicial } from "@/lib/forms";

export function BotoesDaSolicitacao({ id, status }: { id: string; status: string }) {
  const [estado, acao, pendente] = useActionState(mudarStatusSolicitacaoAction, estadoInicial);

  return (
    <form action={acao} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-0.5">
        {status === "nova" ? (
          <>
            <Button
              type="submit"
              name="status"
              value="tratada"
              variant="ghost"
              size="sm"
              disabled={pendente}
              className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <Check className="size-3.5" />
              Marcar como tratada
            </Button>
            <Button
              type="submit"
              name="status"
              value="descartada"
              variant="ghost"
              size="sm"
              disabled={pendente}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
              Descartar
            </Button>
          </>
        ) : (
          <Button
            type="submit"
            name="status"
            value="nova"
            variant="ghost"
            size="sm"
            disabled={pendente}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Voltar para novas
          </Button>
        )}
      </div>
      {estado.erro ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      ) : null}
    </form>
  );
}
