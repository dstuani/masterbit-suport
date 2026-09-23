"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";

import { atualizarTituloAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Assunto editável inline: clicar no lápis troca o texto por um campo. */
export function TituloDoAtendimento({
  atendimentoId,
  titulo,
}: {
  atendimentoId: string;
  titulo: string;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(titulo);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  function cancelar() {
    setEditando(false);
    setValor(titulo);
    setErro(null);
  }

  function salvar() {
    const novo = valor.trim();
    if (novo.length < 3) {
      setErro("Descreva o assunto em poucas palavras");
      return;
    }
    if (novo === titulo) {
      setEditando(false);
      return;
    }

    setErro(null);
    iniciar(async () => {
      const dados = new FormData();
      dados.set("atendimento_id", atendimentoId);
      dados.set("titulo", novo);

      const resultado = await atualizarTituloAction(dados);
      if (resultado.erro) {
        setErro(resultado.erro);
      } else {
        setEditando(false);
      }
    });
  }

  if (!editando) {
    return (
      <div className="flex items-start gap-1.5">
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight">{titulo}</h1>
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label="Editar assunto"
          className="mt-2 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          ref={entrada}
          autoFocus
          value={valor}
          disabled={pendente}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar();
            if (e.key === "Escape") cancelar();
          }}
          className="text-base font-semibold"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={salvar}
          disabled={pendente}
          aria-label="Salvar assunto"
        >
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={cancelar}
          disabled={pendente}
          aria-label="Cancelar edição"
        >
          <X className="size-4" />
        </Button>
      </div>
      {erro ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
