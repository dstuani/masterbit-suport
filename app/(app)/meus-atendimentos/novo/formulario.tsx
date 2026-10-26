"use client";

import { useActionState } from "react";

import { abrirPedidoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";

function Erro({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

export function FormularioPedido() {
  const [estado, acao, pendente] = useActionState(abrirPedidoAction, estadoInicial);

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form action={acao} className="flex flex-col gap-4">
          <Campo id="titulo" rotulo="Assunto" obrigatorio dica="Uma frase curta, como “Impressora do caixa não imprime”.">
            <Input id="titulo" name="titulo" required minLength={3} maxLength={300} className="uppercase" />
            <Erro texto={estado.campos?.titulo} />
          </Campo>

          <Campo
            id="descricao"
            rotulo="O que está acontecendo?"
            obrigatorio
            dica="Se puder, inclua a mensagem de erro, o computador ou sistema e desde quando acontece."
          >
            <Textarea id="descricao" name="descricao" rows={6} required minLength={10} maxLength={4000} />
            <Erro texto={estado.campos?.descricao} />
          </Campo>

          {estado.erro && !estado.campos ? <Erro texto={estado.erro} /> : null}

          <Button type="submit" disabled={pendente} className="self-start">
            {pendente ? "Enviando…" : "Abrir atendimento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
