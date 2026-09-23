"use client";

import { useActionState, useRef } from "react";
import { Send } from "lucide-react";

import { registrarComentarioAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";
import type { Comentario } from "@/lib/services/consultoria";
import { formatarDataHora } from "@/lib/utils";

/** Caixa de comentário, sempre visível — o campo livre que o pedido pediu. */
export function CaixaDeComentario({ topicoId }: { topicoId: string }) {
  const [estado, acao, pendente] = useActionState(registrarComentarioAction, estadoInicial);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (formData) => {
        await acao(formData);
        form.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="topico_id" value={topicoId} />

      <Textarea
        name="conteudo"
        required
        placeholder="Escreva um comentário sobre este tópico…"
        className="min-h-20"
      />
      {estado.campos?.conteudo ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {estado.campos.conteudo}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          <Send className="size-3.5" />
          {pendente ? "Enviando…" : "Comentar"}
        </Button>
        {estado.erro ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {estado.erro}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function LinhaDoTempo({ comentarios }: { comentarios: Comentario[] }) {
  if (comentarios.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>;
  }

  return (
    <div className="flex flex-col">
      {comentarios.map((comentario, indice) => (
        <div
          key={comentario.id}
          className={
            indice === comentarios.length - 1
              ? "border-border pb-1"
              : "border-b border-border pb-3 mb-3"
          }
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{comentario.profiles?.nome ?? "—"}</span>
            <span>· {formatarDataHora(comentario.created_at)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{comentario.conteudo}</p>
        </div>
      ))}
    </div>
  );
}
