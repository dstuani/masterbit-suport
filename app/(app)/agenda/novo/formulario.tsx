"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { criarEventoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo, CampoCheckbox } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TIPOS_EVENTO } from "@/lib/constants";
import { estadoInicial } from "@/lib/forms";

type AtendimentoBase = { id: string; titulo: string; numero: string; cliente_id: string };
type ClienteBase = { id: string; razao_social: string };
type PendenciaBase = { id: string; titulo: string; cliente_id: string | null };

type Opcoes = {
  clientes: ClienteBase[];
  atendimentoInicial?: AtendimentoBase;
  pendenciaInicial?: PendenciaBase;
};

function Mensagem({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600 dark:text-red-400">{texto}</p>;
}

/** Formata para datetime-local (YYYY-MM-DDTHH:MM) no fuso local do browser. */
function agora(offsetMinutos = 0) {
  const d = new Date(Date.now() + offsetMinutos * 60_000);
  // Remove segundos e ajusta para fuso local
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function FormularioEvento({ opcoes }: { opcoes: Opcoes }) {
  const [estado, acao, pendente] = useActionState(criarEventoAction, estadoInicial);
  const [diaInteiro, setDiaInteiro] = useState(false);

  const erroDe = (campo: string) => estado.campos?.[campo];
  const { atendimentoInicial, pendenciaInicial } = opcoes;

  const clienteIdInicial =
    atendimentoInicial?.cliente_id ?? pendenciaInicial?.cliente_id ?? "";

  return (
    <form action={acao} className="flex flex-col gap-4">
      {/* Vínculos pré-definidos (vindos de atendimento ou pendência) */}
      {atendimentoInicial ? (
        <>
          <input type="hidden" name="atendimento_id" value={atendimentoInicial.id} />
          <input type="hidden" name="cliente_id" value={atendimentoInicial.cliente_id} />
          <Card>
            <CardContent className="p-4 text-sm">
              <p className="text-muted-foreground">Vinculado ao atendimento:</p>
              <p className="mt-1 font-medium">
                <span className="font-mono text-muted-foreground mr-1.5">
                  {atendimentoInicial.numero}
                </span>
                {atendimentoInicial.titulo}
              </p>
            </CardContent>
          </Card>
        </>
      ) : pendenciaInicial ? (
        <>
          <input type="hidden" name="pendencia_id" value={pendenciaInicial.id} />
          {clienteIdInicial && (
            <input type="hidden" name="cliente_id" value={clienteIdInicial} />
          )}
          <Card>
            <CardContent className="p-4 text-sm">
              <p className="text-muted-foreground">Vinculado à pendência:</p>
              <p className="mt-1 font-medium">{pendenciaInicial.titulo}</p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vínculo</CardTitle>
          </CardHeader>
          <CardContent>
            <Campo id="cliente_id" rotulo="Cliente (opcional)">
              <Select id="cliente_id" name="cliente_id">
                <option value="">Nenhum</option>
                {opcoes.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razao_social}
                  </option>
                ))}
              </Select>
            </Campo>
          </CardContent>
        </Card>
      )}

      {/* Evento */}
      <Card>
        <CardHeader>
          <CardTitle>Evento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="titulo" rotulo="Título" obrigatorio className="sm:col-span-2">
            <Input
              id="titulo"
              name="titulo"
              autoFocus
              placeholder="Ex.: Retorno sobre NF-e rejeitada"
            />
            <Mensagem texto={erroDe("titulo")} />
          </Campo>

          <Campo id="tipo" rotulo="Tipo">
            <Select id="tipo" name="tipo" defaultValue="retorno">
              {Object.entries(TIPOS_EVENTO).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo id="local" rotulo="Local">
            <Input id="local" name="local" placeholder="Presencial, videoconferência…" />
          </Campo>

          <div className="sm:col-span-2">
            <CampoCheckbox
              id="dia_inteiro"
              name="dia_inteiro"
              rotulo="Dia inteiro"
              checked={diaInteiro}
              onChange={(e) => setDiaInteiro(e.target.checked)}
            />
          </div>

          <Campo id="inicio" rotulo="Início" obrigatorio>
            <Input
              id="inicio"
              name="inicio"
              type={diaInteiro ? "date" : "datetime-local"}
              defaultValue={diaInteiro ? agora().slice(0, 10) : agora(60)}
            />
            <Mensagem texto={erroDe("inicio")} />
          </Campo>

          {!diaInteiro ? (
            <Campo id="fim" rotulo="Término">
              <Input
                id="fim"
                name="fim"
                type="datetime-local"
                defaultValue={agora(120)}
              />
              <Mensagem texto={erroDe("fim")} />
            </Campo>
          ) : (
            <div />
          )}

          <Campo id="lembrete_minutos" rotulo="Lembrete antes">
            <Select id="lembrete_minutos" name="lembrete_minutos" defaultValue="">
              <option value="">Sem lembrete</option>
              <option value="0">No momento</option>
              <option value="15">15 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="1440">1 dia antes</option>
            </Select>
          </Campo>

          <Campo id="descricao" rotulo="Descrição" className="sm:col-span-2">
            <Textarea id="descricao" name="descricao" rows={2} placeholder="Contexto…" />
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
          {pendente ? "Salvando…" : "Agendar"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={atendimentoInicial ? `/atendimentos/${atendimentoInicial.id}` : "/agenda"}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}
