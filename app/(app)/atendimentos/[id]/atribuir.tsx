"use client";

import { useActionState } from "react";

import { atribuirAtendimentoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { estadoInicial } from "@/lib/forms";

export function AtribuirResponsavel({
  atendimentoId,
  responsavelAtual,
  responsaveis,
}: {
  atendimentoId: string;
  responsavelAtual: string | null;
  responsaveis: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(atribuirAtendimentoAction, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <div className="flex items-center gap-2">
        <Select
          name="responsavel_id"
          defaultValue={responsavelAtual ?? ""}
          aria-label="Responsável"
          className="h-8 flex-1"
        >
          {responsavelAtual ? null : (
            <option value="" disabled>
              Sem responsável
            </option>
          )}
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={pendente}>
          {pendente ? "…" : "Atribuir"}
        </Button>
      </div>
      {estado.erro ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      ) : null}
    </form>
  );
}
