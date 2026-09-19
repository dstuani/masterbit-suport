import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, User } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIPOS_EVENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { obterEvento } from "@/lib/services/agenda";
import { formatarDataHora, formatarRelativo } from "@/lib/utils";
import { BotaoCancelarEvento, PainelRealizar, PainelRemarcar } from "./acoes";

export const dynamic = "force-dynamic";

const STATUS_COR: Record<string, string> = {
  agendado: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  confirmado: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  realizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelado: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  remarcado: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const STATUS_ROTULO: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  remarcado: "Remarcado",
};

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!supabaseConfigurado) return <AvisoSupabase />;

  const evento = await obterEvento(id);
  if (!evento) notFound();

  const pendente = evento.status === "agendado" || evento.status === "confirmado";
  const encerrado = evento.status === "realizado" || evento.status === "cancelado";

  return (
    <>
      <Link
        href="/agenda"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Agenda
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={STATUS_COR[evento.status] ?? ""}>
              {STATUS_ROTULO[evento.status] ?? evento.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {TIPOS_EVENTO[evento.tipo as keyof typeof TIPOS_EVENTO] ?? evento.tipo}
            </span>
          </div>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight">{evento.titulo}</h1>
          {evento.clientes && (
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href={`/clientes/${evento.cliente_id}`} className="hover:underline">
                {evento.clientes.razao_social}
              </Link>
            </p>
          )}
        </div>

        {pendente ? (
          <div className="flex flex-wrap gap-2">
            <PainelRemarcar id={id} />
            <BotaoCancelarEvento id={id} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {pendente ? (
            <PainelRealizar id={id} temAtendimento={Boolean(evento.atendimento_id)} />
          ) : null}

          {evento.resultado ? (
            <Card>
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{evento.resultado}</CardContent>
            </Card>
          ) : null}

          {evento.descricao ? (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{evento.descricao}</CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p>{formatarDataHora(evento.inicio)}</p>
                  {evento.fim ? (
                    <p className="text-muted-foreground">até {formatarDataHora(evento.fim)}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{formatarRelativo(evento.inicio)}</p>
                </div>
              </div>

              {evento.local ? (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span>{evento.local}</span>
                </div>
              ) : null}

              {evento.lembrete_minutos !== null ? (
                <div className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {evento.lembrete_minutos === 0
                      ? "Lembrete no momento"
                      : evento.lembrete_minutos < 60
                        ? `Lembrete ${evento.lembrete_minutos} min antes`
                        : `Lembrete ${evento.lembrete_minutos / 60}h antes`}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {(evento.atendimentos || evento.pendencias) ? (
            <Card>
              <CardHeader>
                <CardTitle>Vínculos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {evento.atendimentos ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Atendimento</p>
                    <Link
                      href={`/atendimentos/${evento.atendimento_id}`}
                      className="font-medium hover:underline"
                    >
                      <span className="font-mono text-muted-foreground mr-1">
                        {evento.atendimentos.numero}
                      </span>
                      {evento.atendimentos.titulo}
                    </Link>
                  </div>
                ) : null}
                {evento.pendencias ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Pendência</p>
                    <p className="font-medium">{evento.pendencias.titulo}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>Criado {formatarRelativo(evento.created_at)}</p>
              {!encerrado && evento.updated_at !== evento.created_at ? (
                <p>Atualizado {formatarRelativo(evento.updated_at)}</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
