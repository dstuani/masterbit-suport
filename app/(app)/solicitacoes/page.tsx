import Link from "next/link";
import { Inbox, Mail, Phone, Plus } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { podeEscreverAgora } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import {
  listarSolicitacoes,
  type FiltroSolicitacoes,
  type Solicitacao,
} from "@/lib/services/solicitacoes";
import { cn, formatarDataHora, formatarRelativo } from "@/lib/utils";
import { BotoesDaSolicitacao } from "./acoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solicitações" };

const FILTROS = [
  { chave: "nova", rotulo: "Novas" },
  { chave: "tratada", rotulo: "Tratadas" },
  { chave: "descartada", rotulo: "Descartadas" },
  { chave: "todas", rotulo: "Todas" },
] as const;

const STATUS: Record<string, { rotulo: string; cor: string }> = {
  nova: { rotulo: "Nova", cor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  tratada: {
    rotulo: "Tratada",
    cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  descartada: {
    rotulo: "Descartada",
    cor: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
};

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filtro = (FILTROS.find((f) => f.chave === status)?.chave ?? "nova") as FiltroSolicitacoes;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Solicitações" />
        <AvisoSupabase />
      </>
    );
  }

  const [solicitacoes, podeEditar] = await Promise.all([listarSolicitacoes(filtro), podeEscreverAgora()]);

  return (
    <>
      <PageHeader
        titulo="Solicitações"
        descricao="Pedidos enviados pelo formulário do site. Responda por e-mail e abra o atendimento quando virar trabalho."
      />

      <div className="mb-4 flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Situação:</span>
        {FILTROS.map((f) => (
          <Link
            key={f.chave}
            href={f.chave === "nova" ? "/solicitacoes" : `/solicitacoes?status=${f.chave}`}
            className={cn(
              "rounded-md px-2 py-0.5 text-xs transition-colors",
              filtro === f.chave
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      {solicitacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Inbox className="size-6" />
            {filtro === "nova"
              ? "Nenhuma solicitação nova. Quando alguém preencher o formulário do site, o pedido aparece aqui."
              : "Nenhuma solicitação nesta situação."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {solicitacoes.map((s) => (
            <CartaoSolicitacao key={s.id} solicitacao={s} podeEditar={podeEditar} />
          ))}
        </div>
      )}
    </>
  );
}

function CartaoSolicitacao({ solicitacao: s, podeEditar }: { solicitacao: Solicitacao; podeEditar: boolean }) {
  const situacao = STATUS[s.status] ?? STATUS.nova;

  // O e-mail já vem com o assunto: a resposta nasce no cliente de e-mail do dono.
  const responder = `mailto:${s.email}?subject=${encodeURIComponent(`Re: ${s.assunto}`)}`;
  // Corta a descrição para o link caber: a íntegra continua nesta tela.
  const abrirAtendimento = `/atendimentos/novo?${new URLSearchParams({
    titulo: s.assunto,
    descricao: s.descricao.slice(0, 1500),
  })}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={situacao.cor}>{situacao.rotulo}</Badge>
              <span className="text-xs text-muted-foreground" title={formatarDataHora(s.created_at)}>
                {formatarRelativo(s.created_at)}
              </span>
            </div>

            <p className="mt-1.5 font-medium">{s.assunto}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {s.nome}
              {s.empresa ? ` · ${s.empresa}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3" />
                {s.email}
              </span>
              {s.telefone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {s.telefone}
                </span>
              ) : null}
            </div>

            {/* whitespace-pre-wrap: o visitante escreve texto puro; nunca HTML. */}
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">{s.descricao}</p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1">
            <Button asChild size="sm" variant="outline">
              <a href={responder}>
                <Mail />
                Responder por e-mail
              </a>
            </Button>
            {podeEditar ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={abrirAtendimento}>
                    <Plus />
                    Abrir atendimento
                  </Link>
                </Button>
                <BotoesDaSolicitacao id={s.id} status={s.status} />
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
