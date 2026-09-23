"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { criarTopicoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";

export function NovoTopico({ projetoId }: { projetoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(criarTopicoAction, estadoInicial);
  const form = useRef<HTMLFormElement>(null);

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="size-3.5" />
        Novo tópico
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo tópico</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={form}
          action={async (formData) => {
            await acao(formData);
            form.current?.reset();
          }}
          className="grid gap-3 sm:grid-cols-4"
        >
          <input type="hidden" name="projeto_id" value={projetoId} />

          <Campo id="topico_codigo" rotulo="Código" dica="Opcional, ex.: 2.6">
            <Input id="topico_codigo" name="codigo" />
          </Campo>

          <Campo id="topico_titulo" rotulo="Título" obrigatorio className="sm:col-span-3">
            <Input id="topico_titulo" name="titulo" required autoFocus />
            {estado.campos?.titulo ? (
              <p className="text-xs text-red-600 dark:text-red-400">{estado.campos.titulo}</p>
            ) : null}
          </Campo>

          <Campo id="topico_descricao" rotulo="Descrição" className="sm:col-span-4">
            <Textarea id="topico_descricao" name="descricao" />
          </Campo>

          <div className="flex items-center gap-3 sm:col-span-4">
            <Button type="submit" size="sm" disabled={pendente}>
              {pendente ? "Criando…" : "Criar tópico"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            {estado.erro ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {estado.erro}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
