"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Code, Copy, Pencil, Trash2 } from "lucide-react";

import { excluirConhecimentoAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ItemConhecimento = {
  id: string;
  titulo: string;
  descricao: string;
  comando: string;
  sistema: string | null;
  categoria: string | null;
};

export function CartaoConhecimento({
  item,
  podeEditar,
}: {
  item: ItemConhecimento;
  podeEditar: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const [verSql, setVerSql] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(item.comando);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
    }
  }

  function excluir() {
    setErro(null);
    iniciar(async () => {
      const dados = new FormData();
      dados.set("id", item.id);
      const resultado = await excluirConhecimentoAction(dados);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{item.titulo}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {item.sistema ? <Badge>{item.sistema}</Badge> : null}
              {item.categoria ? <Badge>{item.categoria}</Badge> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setVerSql((v) => !v)}
              aria-expanded={verSql}
            >
              <Code />
              {verSql ? "Ocultar detalhes" : "Ver detalhes"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={copiar}>
              {copiado ? <Check /> : <Copy />}
              {copiado ? "Copiado" : "Copiar SQL"}
            </Button>
            {podeEditar ? (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/conhecimento/${item.id}/editar`}>
                    <Pencil />
                    Editar
                  </Link>
                </Button>
                {confirmando ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmando(true)}
                  >
                    <Trash2 />
                    Excluir
                  </Button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {verSql ? (
          <>
            <p className="text-sm whitespace-pre-wrap">{item.descricao}</p>
            <pre className="max-h-80 overflow-auto rounded-app border border-border bg-surface-muted p-3 text-xs leading-relaxed">
              <code>{item.comando}</code>
            </pre>
          </>
        ) : null}

        {confirmando ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-red-600 dark:text-red-400">
              Excluir este comando? Não dá para desfazer.
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pendente}
              onClick={excluir}
            >
              {pendente ? "Excluindo…" : "Excluir"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pendente}
              onClick={() => setConfirmando(false)}
            >
              Manter
            </Button>
          </div>
        ) : null}
        {erro ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {erro}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
