import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORIDADES, RESPONSAVEL_PENDENCIA } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { listarPendencias, type FiltrosPendencias, type PendenciaComContexto } from "@/lib/services/pendencias";
import { formatarDataHora, formatarRelativo, cn } from "@/lib/utils";
import { BotaoCancelar, BotaoConcluir, BotaoIniciar } from "./acoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pendências" };

const FILTROS_RESPONSAVEL = [
  { chave: "", rotulo: "Todos" },
  { chave: "eu", rotulo: "Comigo" },
  { chave: "cliente", rotulo: "Com cliente" },
  { chave: "terceiro", rotulo: "Com terceiro" },
] as const;

const FILTROS_PRIORIDADE = [
  { chave: "", rotulo: "Todas" },
  { chave: "urgente", rotulo: "Urgente" },
  { chave: "alta", rotulo: "Alta" },
  { chave: "media", rotulo: "Média" },
  { chave: "baixa", rotulo: "Baixa" },
] as const;

const FILTROS_STATUS = [
  { chave: "", rotulo: "Ativas" },
  { chave: "aberta", rotulo: "Abertas" },
  { chave: "em_andamento", rotulo: "Em andamento" },
  { chave: "concluida", rotulo: "Concluídas" },
  { chave: "cancelada", rotulo: "Canceladas" },
] as const;

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{
    responsavel?: string;
    prioridade?: string;
    status?: string;
  }>;
}) {
  const { responsavel, prioridade, status } = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Pendências" />
        <AvisoSupabase />
      </>
    );
  }

  const pendencias = await listarPendencias({
    responsavel: responsavel as "eu" | "cliente" | "terceiro" | undefined,
    prioridade: prioridade || undefined,
    status: (status || undefined) as FiltrosPendencias["status"],
  });

  const abertas = pendencias.filter((p) => p.status === "aberta");
  const emAndamento = pendencias.filter((p) => p.status === "em_andamento");
  const concluidas = pendencias.filter((p) => p.status === "concluida");
  const canceladas = pendencias.filter((p) => p.status === "cancelada");

  // Quando filtra por status específico, mostra flat; senão agrupa
  const mostraStatus = Boolean(status);

  return (
    <>
      <PageHeader
        titulo="Pendências"
        descricao="O que ficou em aberto — de quem depende e para quando."
        acoes={
          <Button asChild size="sm">
            <Link href="/pendencias/nova">
              <Plus />
              Nova pendência
            </Link>
          </Button>
        }
      />

      {/* ─── Filtros ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <BarraDeFiltro
          rotulo="Status"
          opcoes={FILTROS_STATUS}
          param="status"
          atual={status ?? ""}
          outros={{ responsavel: responsavel ?? "", prioridade: prioridade ?? "" }}
        />
        <BarraDeFiltro
          rotulo="Responsável"
          opcoes={FILTROS_RESPONSAVEL}
          param="responsavel"
          atual={responsavel ?? ""}
          outros={{ status: status ?? "", prioridade: prioridade ?? "" }}
        />
        <BarraDeFiltro
          rotulo="Prioridade"
          opcoes={FILTROS_PRIORIDADE}
          param="prioridade"
          atual={prioridade ?? ""}
          outros={{ status: status ?? "", responsavel: responsavel ?? "" }}
        />
      </div>

      {pendencias.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma pendência encontrada.
          </CardContent>
        </Card>
      ) : mostraStatus ? (
        <div className="flex flex-col gap-2">
          {pendencias.map((p) => (
            <CartaoPendencia key={p.id} pendencia={p} mostraStatus />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {emAndamento.length > 0 ? (
            <Grupo titulo="Em andamento" contagem={emAndamento.length}>
              {emAndamento.map((p) => (
                <CartaoPendencia key={p.id} pendencia={p} />
              ))}
            </Grupo>
          ) : null}

          {abertas.length > 0 ? (
            <Grupo titulo="Abertas" contagem={abertas.length}>
              {abertas.map((p) => (
                <CartaoPendencia key={p.id} pendencia={p} />
              ))}
            </Grupo>
          ) : null}

          {concluidas.length > 0 ? (
            <Grupo titulo="Concluídas" contagem={concluidas.length}>
              {concluidas.map((p) => (
                <CartaoPendencia key={p.id} pendencia={p} />
              ))}
            </Grupo>
          ) : null}

          {canceladas.length > 0 ? (
            <Grupo titulo="Canceladas" contagem={canceladas.length}>
              {canceladas.map((p) => (
                <CartaoPendencia key={p.id} pendencia={p} />
              ))}
            </Grupo>
          ) : null}
        </div>
      )}
    </>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Grupo({
  titulo,
  contagem,
  children,
}: {
  titulo: string;
  contagem: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {titulo}
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs tabular-nums">
          {contagem}
        </span>
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function CartaoPendencia({
  pendencia,
  mostraStatus,
}: {
  pendencia: PendenciaComContexto;
  mostraStatus?: boolean;
}) {
  const prioridade = PRIORIDADES[pendencia.prioridade as keyof typeof PRIORIDADES];
  const agora = new Date();
  const prazo = pendencia.prazo ? new Date(pendencia.prazo) : null;
  const vencida = prazo !== null && prazo < agora && pendencia.status !== "concluida" && pendencia.status !== "cancelada";
  const encerrada = pendencia.status === "concluida" || pendencia.status === "cancelada";

  const responsavelTexto =
    pendencia.responsavel_tipo === "eu"
      ? "Comigo"
      : pendencia.responsavel_tipo === "cliente"
        ? "Com o cliente"
        : `Com ${pendencia.terceiro_nome ?? "terceiro"}`;

  return (
    <Card className={cn(vencida && "border-red-300 dark:border-red-800")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={prioridade.cor}>{prioridade.rotulo}</Badge>
              {mostraStatus ? (
                <StatusBadge status={pendencia.status} />
              ) : null}
              {vencida ? (
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Vencida
                </span>
              ) : null}
            </div>

            <p className={cn("mt-1.5 font-medium", encerrada && "text-muted-foreground line-through")}>
              {pendencia.titulo}
            </p>

            <p className="mt-0.5 text-sm text-muted-foreground">
              {pendencia.clientes?.razao_social ?? ""}
              {pendencia.atendimentos ? (
                <>
                  {pendencia.clientes ? " · " : ""}
                  <Link
                    href={`/atendimentos/${pendencia.atendimento_id}`}
                    className="hover:underline"
                  >
                    {pendencia.atendimentos.numero}
                  </Link>
                </>
              ) : null}
            </p>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{responsavelTexto}</span>
              {prazo ? (
                <span className={cn(vencida && "text-red-600 dark:text-red-400")}>
                  {vencida ? "Venceu" : "Prazo"} {formatarRelativo(pendencia.prazo!)}
                  {" "}· {formatarDataHora(pendencia.prazo!)}
                </span>
              ) : null}
            </div>

            {pendencia.resultado ? (
              <p className="mt-2 text-sm italic text-muted-foreground">
                Resultado: {pendencia.resultado}
              </p>
            ) : null}
          </div>

          {!encerrada ? (
            <div className="flex shrink-0 items-start gap-0.5">
              {pendencia.status === "aberta" ? <BotaoIniciar id={pendencia.id} /> : null}
              <BotaoConcluir id={pendencia.id} />
              <BotaoCancelar id={pendencia.id} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_CORES: Record<string, string> = {
  aberta: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  em_andamento: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  concluida: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelada: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const STATUS_ROTULOS: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_CORES[status] ?? ""}>
      {STATUS_ROTULOS[status] ?? status}
    </Badge>
  );
}

function BarraDeFiltro({
  rotulo,
  opcoes,
  param,
  atual,
  outros,
}: {
  rotulo: string;
  opcoes: readonly { chave: string; rotulo: string }[];
  param: string;
  atual: string;
  outros: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{rotulo}:</span>
      {opcoes.map((op) => {
        const params = new URLSearchParams({
          ...outros,
          [param]: op.chave,
        });
        // Remove params vazios
        for (const [k, v] of [...params.entries()]) {
          if (!v) params.delete(k);
        }
        const href = params.size > 0 ? `/pendencias?${params}` : "/pendencias";
        const ativo = atual === op.chave;

        return (
          <Link
            key={op.chave}
            href={href}
            className={cn(
              "rounded-md px-2 py-0.5 text-xs transition-colors",
              ativo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {op.rotulo}
          </Link>
        );
      })}
    </div>
  );
}
