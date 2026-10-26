import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_ATENDIMENTO } from "@/lib/constants";
import { obterPerfil } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { listarMensagens, obterMeuAtendimento } from "@/lib/services/meus-atendimentos";
import { cn, formatarDataHora } from "@/lib/utils";
import { CaixaDeMensagem } from "./mensagem";

export const dynamic = "force-dynamic";
export const metadata = { title: "Atendimento" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MeuAtendimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigurado) return <AvisoSupabase />;
  if (!UUID.test(id)) notFound();

  const [atendimento, mensagens, perfil] = await Promise.all([
    obterMeuAtendimento(id),
    listarMensagens(id),
    obterPerfil(),
  ]);
  if (!atendimento) notFound();

  const status = STATUS_ATENDIMENTO[atendimento.status];
  const encerrado = atendimento.status === "resolvido" || atendimento.status === "cancelado";

  return (
    <>
      <Link
        href="/meus-atendimentos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Meus atendimentos
      </Link>

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={status.cor}>{status.rotulo}</Badge>
          <span className="text-sm text-muted-foreground">{atendimento.numero}</span>
        </div>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight">{atendimento.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aberto em {formatarDataHora(atendimento.created_at)}</p>
      </div>

      <div className="flex max-w-3xl flex-col gap-4">
        {atendimento.status === "resolvido" && atendimento.solucao ? (
          <Card className="border-emerald-300 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle>Solução</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{atendimento.solucao}</CardContent>
          </Card>
        ) : null}

        {atendimento.status === "aguardando_cliente" && atendimento.aguardando_o_que ? (
          <Card className="border-purple-300 dark:border-purple-800">
            <CardContent className="p-4 text-sm">
              <p className="font-medium">Precisamos de você</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{atendimento.aguardando_o_que}</p>
            </CardContent>
          </Card>
        ) : null}

        {atendimento.descricao ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>O que você contou</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{atendimento.descricao}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {mensagens.map((m) => {
                const sua = m.autor_id === perfil?.id;
                const texto =
                  m.tipo === "mudanca_status" && m.status_novo
                    ? `Situação mudou para ${STATUS_ATENDIMENTO[m.status_novo].rotulo.toLowerCase()}.`
                    : m.conteudo;
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-app border border-border p-3 text-sm",
                      sua ? "bg-primary/5" : "bg-surface",
                      m.tipo === "sistema" || m.tipo === "mudanca_status" ? "text-muted-foreground" : "",
                    )}
                  >
                    <p className="text-xs text-muted-foreground">
                      {sua ? "Você" : "Masterbit"} · {formatarDataHora(m.ocorrido_em)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{texto}</p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {encerrado ? (
          <p className="text-sm text-muted-foreground">
            Este atendimento foi encerrado. Se o problema voltou, abra um novo atendimento.
          </p>
        ) : (
          <CaixaDeMensagem atendimentoId={atendimento.id} />
        )}
      </div>
    </>
  );
}
