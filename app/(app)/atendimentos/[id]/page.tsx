import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, PauseCircle, Plus } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CANAIS,
  PRIORIDADES,
  STATUS_ATENDIMENTO,
  TIPOS_ATENDIMENTO,
  TIPOS_INTERACAO,
  type StatusAtendimento,
} from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import {
  listarInteracoes,
  listarPendenciasDoAtendimento,
  obterAtendimento,
} from "@/lib/services/atendimentos";
import { ehImagem } from "@/lib/anexos";
import { listarAnexos } from "@/lib/services/anexos";
import { listarResponsaveis } from "@/lib/services/equipe";
import {
  formatarDataHora,
  formatarDuracao,
  formatarRelativo,
  formatarTamanho,
} from "@/lib/utils";
import { CaixaDeInteracao, Conclusao, TrocaDeStatus } from "./acoes";
import { EnviarAnexos, RemoverAnexo } from "./anexos";
import { AtribuirResponsavel } from "./atribuir";

export default async function AtendimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!supabaseConfigurado) return <AvisoSupabase />;

  const atendimento = await obterAtendimento(id);
  if (!atendimento) notFound();

  const [interacoes, pendencias, responsaveis, anexos] = await Promise.all([
    listarInteracoes(id),
    listarPendenciasDoAtendimento(id),
    listarResponsaveis(),
    listarAnexos(id),
  ]);

  const status = STATUS_ATENDIMENTO[atendimento.status];
  const prioridade = PRIORIDADES[atendimento.prioridade];
  const encerrado = atendimento.status === "resolvido" || atendimento.status === "cancelado";
  const esperando =
    atendimento.status === "aguardando_cliente" || atendimento.status === "aguardando_terceiro";

  return (
    <>
      <Link
        href="/atendimentos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Atendimentos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{atendimento.numero}</span>
            <Badge className={status.cor}>{status.rotulo}</Badge>
            <Badge className={prioridade.cor}>{prioridade.rotulo}</Badge>
          </div>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight">{atendimento.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/clientes/${atendimento.cliente_id}`} className="hover:underline">
              {atendimento.clientes?.razao_social}
            </Link>
            {atendimento.filiais?.nome ? ` · ${atendimento.filiais.nome}` : ""}
            {atendimento.cliente_contatos?.nome ? ` · ${atendimento.cliente_contatos.nome}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {formatarDuracao(atendimento.tempo_gasto_minutos)}
          </span>
          {!encerrado ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/agenda/novo?atendimento=${id}`}>
                <Plus className="size-3.5" />
                Agendar
              </Link>
            </Button>
          ) : null}
          {!encerrado ? <Conclusao atendimentoId={id} /> : null}
        </div>
      </div>

      {esperando && atendimento.aguardando_o_que ? (
        <div className="mb-4 flex items-start gap-2 rounded-app border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200">
          <PauseCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Aguardando:</strong> {atendimento.aguardando_o_que}
            <span className="ml-1 opacity-75">
              (desde {formatarRelativo(atendimento.updated_at)})
            </span>
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {!encerrado ? (
            <Card>
              <CardContent className="p-5">
                <CaixaDeInteracao atendimentoId={id} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              {interacoes.map((interacao, indice) => (
                <ItemDaTimeline
                  key={interacao.id}
                  interacao={interacao}
                  ultimo={indice === interacoes.length - 1}
                />
              ))}
            </CardContent>
          </Card>

          {atendimento.solucao ? (
            <Card>
              <CardHeader>
                <CardTitle>Solução</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <p className="whitespace-pre-wrap">{atendimento.solucao}</p>
                {atendimento.causa_raiz ? (
                  <p className="text-muted-foreground">
                    <strong className="font-medium text-foreground">Causa raiz:</strong>{" "}
                    {atendimento.causa_raiz}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Finalizado em {formatarDataHora(atendimento.finalizado_em)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          {!encerrado ? (
            <Card>
              <CardHeader>
                <CardTitle>Situação</CardTitle>
              </CardHeader>
              <CardContent>
                <TrocaDeStatus
                  atendimentoId={id}
                  statusAtual={atendimento.status as StatusAtendimento}
                  aguardandoOQue={atendimento.aguardando_o_que}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Linha rotulo="Categoria" valor={atendimento.categorias?.nome} />
              <Linha rotulo="Subcategoria" valor={atendimento.subcategorias?.nome} />
              <Linha rotulo="Sistema" valor={atendimento.sistemas?.nome} />
              <Linha rotulo="Canal" valor={CANAIS[atendimento.canal]} />
              <Linha rotulo="Tipo" valor={TIPOS_ATENDIMENTO[atendimento.tipo]} />
              {!encerrado && responsaveis.length > 1 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Responsável</span>
                  <AtribuirResponsavel
                    atendimentoId={id}
                    responsavelAtual={atendimento.responsavel_id}
                    responsaveis={responsaveis}
                  />
                </div>
              ) : (
                <Linha rotulo="Responsável" valor={atendimento.profiles?.nome} />
              )}
              <Linha rotulo="Aberto em" valor={formatarDataHora(atendimento.iniciado_em)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Anexos
                {anexos.length > 0 ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({anexos.length})
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {anexos.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {anexos.map((anexo) => (
                    <li key={anexo.id} className="flex items-center gap-2.5">
                      {anexo.url && ehImagem(anexo.tipo_mime) ? (
                        <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {/* URL assinada externa: next/image exigiria configurar o domínio do Storage. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={anexo.url}
                            alt={anexo.nome_original}
                            className="size-12 rounded-app border border-border object-cover"
                          />
                        </a>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        {anexo.url ? (
                          <a
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate font-medium text-primary hover:underline"
                          >
                            {anexo.nome_original}
                          </a>
                        ) : (
                          <span className="block truncate font-medium">{anexo.nome_original}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatarTamanho(anexo.tamanho_bytes)}
                          {anexo.profiles?.nome ? ` · ${anexo.profiles.nome}` : ""}
                          {" · "}
                          {formatarRelativo(anexo.created_at)}
                        </span>
                      </div>
                      <RemoverAnexo anexoId={anexo.id} nome={anexo.nome_original} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum anexo.</p>
              )}
              <EnviarAnexos atendimentoId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Pendências</CardTitle>
              {!encerrado ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/pendencias/nova?atendimento=${id}`}>
                    <Plus className="size-3.5" />
                    Nova
                  </Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {pendencias.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma pendência registrada.</p>
              ) : (
                pendencias.map((pendencia) => (
                  <div key={pendencia.id} className="flex flex-col">
                    <span className={`font-medium ${pendencia.status === "concluida" || pendencia.status === "cancelada" ? "text-muted-foreground line-through" : ""}`}>
                      {pendencia.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pendencia.responsavel_tipo === "eu"
                        ? "Comigo"
                        : pendencia.responsavel_tipo === "cliente"
                          ? "Com o cliente"
                          : `Com ${pendencia.terceiro_nome ?? "terceiro"}`}
                      {pendencia.prazo ? ` · até ${formatarDataHora(pendencia.prazo)}` : ""}
                    </span>
                  </div>
                ))
              )}
              {pendencias.length > 0 ? (
                <Link
                  href={`/pendencias?status=abertas`}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  Ver todas as pendências →
                </Link>
              ) : null}
            </CardContent>
          </Card>

          {atendimento.descricao ? (
            <Card>
              <CardHeader>
                <CardTitle>Relato inicial</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {atendimento.descricao}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{rotulo}</span>
      <span className="min-w-0 break-words">{valor && valor.length > 0 ? valor : "—"}</span>
    </div>
  );
}

type ItemInteracao = Awaited<ReturnType<typeof listarInteracoes>>[number];

function ItemDaTimeline({ interacao, ultimo }: { interacao: ItemInteracao; ultimo: boolean }) {
  const ehSistema = interacao.tipo === "sistema" || interacao.tipo === "mudanca_status";

  const descricao =
    interacao.tipo === "mudanca_status"
      ? `Status: ${
          interacao.status_anterior ? STATUS_ATENDIMENTO[interacao.status_anterior].rotulo : "—"
        } → ${interacao.status_novo ? STATUS_ATENDIMENTO[interacao.status_novo].rotulo : "—"}`
      : interacao.conteudo;

  return (
    <div className="flex gap-3">
      {/* Trilho vertical: dá continuidade visual à sequência de eventos. */}
      <div className="flex flex-col items-center">
        <span
          className={
            ehSistema
              ? "mt-1.5 size-2 shrink-0 rounded-full bg-border"
              : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
          }
        />
        {!ultimo ? <span className="w-px flex-1 bg-border" /> : null}
      </div>

      <div className={ultimo ? "min-w-0 flex-1 pb-1" : "min-w-0 flex-1 pb-5"}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {ehSistema ? "Sistema" : (interacao.profiles?.nome ?? "—")}
          </span>
          {!ehSistema ? <span>· {TIPOS_INTERACAO[interacao.tipo]}</span> : null}
          <span>· {formatarDataHora(interacao.ocorrido_em)}</span>
          {interacao.tempo_gasto_minutos > 0 ? (
            <span>· {formatarDuracao(interacao.tempo_gasto_minutos)}</span>
          ) : null}
        </div>

        <p
          className={
            ehSistema
              ? "mt-0.5 text-sm text-muted-foreground"
              : "mt-0.5 text-sm whitespace-pre-wrap"
          }
        >
          {descricao}
        </p>
      </div>
    </div>
  );
}
