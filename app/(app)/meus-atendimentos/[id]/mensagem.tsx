"use client";

import { useActionState, useEffect, useRef } from "react";

import { escreverMensagemAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";

export function CaixaDeMensagem({ atendimentoId }: { atendimentoId: string }) {
  const [estado, acao, pendente] = useActionState(escreverMensagemAction, estadoInicial);
  const formulario = useRef<HTMLFormElement>(null);

  // Mensagem enviada: o campo volta vazio para a próxima.
  useEffect(() => {
    if (estado !== estadoInicial && !estado.erro) formulario.current?.reset();
  }, [estado]);

  return (
    <Card>
      <CardContent className="p-4">
        <form ref={formulario} action={acao} className="flex flex-col gap-2">
          <input type="hidden" name="atendimento_id" value={atendimentoId} />
          <Label htmlFor="conteudo">Escrever mensagem</Label>
          <Textarea id="conteudo" name="conteudo" rows={3} required maxLength={4000} placeholder="Alguma novidade ou informação a mais?" />
          {estado.campos?.conteudo || estado.erro ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {estado.campos?.conteudo ?? estado.erro}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={pendente} className="self-start">
            {pendente ? "Enviando…" : "Enviar mensagem"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
