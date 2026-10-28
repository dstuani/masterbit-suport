"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { editarInteracaoAction, excluirInteracaoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CLASSE_CABECALHO = "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground";

/**
 * Texto de uma anotação com lápis (corrigir) e lixeira (excluir).
 *
 * Excluir pede confirmação no próprio lugar e some com a anotação; o tempo dela sai do
 * total do atendimento. Só texto e tempo mudam: autor, data e anexos ficam como estão.
 */
export function NotaEditavel({
  id,
  atendimentoId,
  conteudo,
  tempo,
  cabecalho,
}: {
  id: string;
  atendimentoId: string;
  conteudo: string;
  tempo: number;
  /** Data, hora e tempo da anotação; os botões ficam na mesma linha. */
  cabecalho: ReactNode;
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "excluir">("ver");
  const [texto, setTexto] = useState(conteudo);
  const [minutos, setMinutos] = useState(String(tempo));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function voltar() {
    setModo("ver");
    setTexto(conteudo);
    setMinutos(String(tempo));
    setErro(null);
  }

  function enviar(acao: typeof editarInteracaoAction, extra: Record<string, string> = {}) {
    setErro(null);
    iniciar(async () => {
      const dados = new FormData();
      dados.set("id", id);
      dados.set("atendimento_id", atendimentoId);
      for (const [chave, valor] of Object.entries(extra)) dados.set(chave, valor);
      const resultado = await acao(dados);
      if (resultado.erro) setErro(resultado.erro);
      else setModo("ver");
    });
  }

  if (modo === "editar") {
    return (
      <div className="flex flex-col gap-2">
        <div className={CLASSE_CABECALHO}>{cabecalho}</div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          aria-label="Texto da anotação"
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Tempo (min)
            <Input
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              inputMode="numeric"
              className="h-8 w-20"
              aria-label="Tempo gasto em minutos"
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={pendente || texto.trim().length === 0}
            onClick={() => enviar(editarInteracaoAction, { conteudo: texto, tempo_gasto_minutos: minutos })}
          >
            <Check />
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={voltar} disabled={pendente}>
            <X />
            Cancelar
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

  return (
    <div className="group">
      {/* Data e hora à esquerda, Editar e Excluir na mesma linha. */}
      <div className={CLASSE_CABECALHO}>
        {cabecalho}
        {modo === "ver" ? (
          <span className="ml-1 inline-flex gap-1">
            <button
              type="button"
              onClick={() => setModo("editar")}
              className="inline-flex items-center gap-1 rounded-app px-1.5 py-0.5 text-xs hover:bg-surface-muted hover:text-foreground"
            >
              <Pencil className="size-3" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setModo("excluir")}
              className="inline-flex items-center gap-1 rounded-app px-1.5 py-0.5 text-xs hover:bg-surface-muted hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="size-3" />
              Excluir
            </button>
          </span>
        ) : null}
      </div>

      <p className="mt-0.5 text-sm whitespace-pre-wrap">{conteudo}</p>

      {modo === "excluir" ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-red-600 dark:text-red-400">Excluir esta anotação? Não dá para desfazer.</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pendente}
            onClick={() => enviar(excluirInteracaoAction)}
          >
            {pendente ? "Excluindo…" : "Excluir"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={voltar} disabled={pendente}>
            Manter
          </Button>
        </div>
      ) : null}
      {erro ? (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
