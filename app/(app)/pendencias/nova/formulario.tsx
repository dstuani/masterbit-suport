"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { criarPendenciaAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORIDADES } from "@/lib/constants";
import { estadoInicial } from "@/lib/forms";

type Opcoes = {
  clientes: { id: string; razao_social: string }[];
  atendimentoInicial?: { id: string; titulo: string; numero: string; cliente_id: string };
};

function Mensagem({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600 dark:text-red-400">{texto}</p>;
}

export function FormularioPendencia({ opcoes }: { opcoes: Opcoes }) {
  const [estado, acao, pendente] = useActionState(criarPendenciaAction, estadoInicial);
  const [responsavel, setResponsavel] = useState<string>("eu");

  const erroDe = (campo: string) => estado.campos?.[campo];
  const { atendimentoInicial } = opcoes;

  return (
    <form action={acao} className="flex flex-col gap-4">
      {/* Origem */}
      {atendimentoInicial ? (
        <>
          <input type="hidden" name="atendimento_id" value={atendimentoInicial.id} />
          <input type="hidden" name="cliente_id" value={atendimentoInicial.cliente_id} />
          <Card>
            <CardContent className="p-4 text-sm">
              <p className="text-muted-foreground">Originada do atendimento:</p>
              <p className="mt-1 font-medium">
                <span className="font-mono text-muted-foreground mr-1.5">
                  {atendimentoInicial.numero}
                </span>
                {atendimentoInicial.titulo}
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Origem</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Campo id="cliente_id" rotulo="Cliente" obrigatorio>
              <Select id="cliente_id" name="cliente_id">
                <option value="">Selecione…</option>
                {opcoes.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razao_social}
                  </option>
                ))}
              </Select>
              <Mensagem texto={erroDe("cliente_id")} />
            </Campo>
          </CardContent>
        </Card>
      )}

      {/* Pendência */}
      <Card>
        <CardHeader>
          <CardTitle>O que ficou pendente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="titulo" rotulo="Título" obrigatorio className="sm:col-span-2">
            <Input
              id="titulo"
              name="titulo"
              autoFocus
              placeholder="Ex.: Enviar acesso VPN ao cliente"
            />
            <Mensagem texto={erroDe("titulo")} />
          </Campo>

          <Campo id="descricao" rotulo="Detalhes" className="sm:col-span-2">
            <Textarea id="descricao" name="descricao" rows={3} placeholder="Contexto adicional…" />
          </Campo>

          <Campo id="responsavel_tipo" rotulo="Responsável">
            <Select
              id="responsavel_tipo"
              name="responsavel_tipo"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            >
              <option value="eu">Eu</option>
              <option value="cliente">Cliente</option>
              <option value="terceiro">Terceiro</option>
            </Select>
          </Campo>

          {responsavel === "terceiro" ? (
            <Campo id="terceiro_nome" rotulo="Nome do terceiro" obrigatorio>
              <Input id="terceiro_nome" name="terceiro_nome" placeholder="Fornecedor, parceiro…" />
              <Mensagem texto={erroDe("terceiro_nome")} />
            </Campo>
          ) : (
            /* Campo oculto mantém o índice do grid quando terceiro não é escolhido */
            <div />
          )}

          <Campo id="prioridade" rotulo="Prioridade">
            <Select id="prioridade" name="prioridade" defaultValue="media">
              {Object.entries(PRIORIDADES).map(([chave, { rotulo }]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo id="prazo" rotulo="Prazo">
            <Input id="prazo" name="prazo" type="datetime-local" />
          </Campo>
        </CardContent>
      </Card>

      {estado.erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Registrar pendência"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={atendimentoInicial ? `/atendimentos/${atendimentoInicial.id}` : "/pendencias"}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}
