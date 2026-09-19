"use client";

import { useActionState, useState } from "react";
import { CalendarCheck, CalendarX, RefreshCw } from "lucide-react";

import { cancelarEventoAction, realizarEventoAction, remarcarEventoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo, CampoCheckbox } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";

// ─── Realizar ────────────────────────────────────────────────────────────────

export function PainelRealizar({
  id,
  temAtendimento,
}: {
  id: string;
  temAtendimento: boolean;
}) {
  const [estado, acao, pendente] = useActionState(realizarEventoAction, estadoInicial);

  return (
    <Card className="border-emerald-300 dark:border-emerald-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CalendarCheck className="size-4" />
          Marcar como realizado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={acao} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />

          <Campo id="resultado" rotulo="O que aconteceu">
            <Textarea
              id="resultado"
              name="resultado"
              rows={3}
              placeholder="Resumo do que foi tratado, próximos passos…"
            />
          </Campo>

          {temAtendimento ? (
            <CampoCheckbox
              id="registrar_interacao"
              name="registrar_interacao"
              rotulo="Registrar como interação no atendimento vinculado"
              defaultChecked
            />
          ) : (
            <input type="hidden" name="registrar_interacao" value="false" />
          )}

          {estado.erro ? (
            <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>
          ) : null}

          <Button type="submit" disabled={pendente} className="self-start">
            {pendente ? "Salvando…" : "Confirmar realização"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Remarcar ─────────────────────────────────────────────────────────────────

export function PainelRemarcar({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(remarcarEventoAction, estadoInicial);

  if (!aberto) {
    return (
      <Button variant="outline" onClick={() => setAberto(true)}>
        <RefreshCw className="size-4" />
        Remarcar
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-4" />
          Remarcar evento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={acao} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="inicio" rotulo="Nova data / hora" obrigatorio>
              <Input id="inicio" name="inicio" type="datetime-local" />
              {estado.campos?.inicio ? (
                <p className="text-xs text-red-600 dark:text-red-400">{estado.campos.inicio}</p>
              ) : null}
            </Campo>

            <Campo id="fim" rotulo="Término">
              <Input id="fim" name="fim" type="datetime-local" />
            </Campo>
          </div>

          <Campo id="motivo" rotulo="Motivo (opcional)">
            <Input id="motivo" name="motivo" placeholder="Por que foi remarcado?" />
          </Campo>

          {estado.erro ? (
            <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Confirmar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Cancelar ─────────────────────────────────────────────────────────────────

export function BotaoCancelarEvento({ id }: { id: string }) {
  return (
    <form action={cancelarEventoAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" className="text-red-600 hover:text-red-700 dark:text-red-400">
        <CalendarX className="size-4" />
        Cancelar evento
      </Button>
    </form>
  );
}
