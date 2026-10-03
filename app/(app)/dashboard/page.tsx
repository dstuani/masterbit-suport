import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListChecks,
  PauseCircle,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_ATENDIMENTO, TIPOS_EVENTO } from "@/lib/constants";
import { podeEscreverAgora } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { listarEventos, type EventoComContexto } from "@/lib/services/agenda";
import { obterResumo, type ResumoDashboard } from "@/lib/services/dashboard";
import { listarPendencias, type PendenciaComContexto } from "@/lib/services/pendencias";
import { formatarData, formatarDuracao, formatarRelativo } from "@/lib/utils";

const LIMITE_DE_PENDENCIAS_NO_DASHBOARD = 6;
const LIMITE_DE_EVENTOS_NO_DASHBOARD = 6;
const DIAS_DA_AGENDA_NO_DASHBOARD = 30;

export const metadata = { title: "Dashboard" };

// Ler os cookies da sessão já torna a rota dinâmica; a declaração é explícita de
// propósito, para que um refactor futuro não passe a servir números em cache.
export const dynamic = "force-dynamic";

type LinhaAtendimento = ResumoDashboard["recentes"][number];

export default async function DashboardPage() {
  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Dashboard" descricao="Visão do dia." />
        <AvisoSupabase />
      </>
    );
  }

  // A agenda parte do início de hoje: um compromisso das 9h ainda conta às 15h,
  // enquanto não for marcado como realizado.
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);
  const fimDaJanela = new Date(inicioDeHoje);
  fimDaJanela.setDate(fimDaJanela.getDate() + DIAS_DA_AGENDA_NO_DASHBOARD);

  const [resumo, pendencias, eventos, podeEditar] = await Promise.all([
    obterResumo(),
    listarPendencias({ status: "abertas", limite: LIMITE_DE_PENDENCIAS_NO_DASHBOARD }),
    listarEventos({
      status: "pendentes",
      de: inicioDeHoje.toISOString(),
      ate: fimDaJanela.toISOString(),
    }),
    podeEscreverAgora(),
  ]);

  const botaoNovo = podeEditar ? (
    <Button asChild size="sm">
      <Link href="/atendimentos/novo">
        <Plus />
        Novo atendimento
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão do dia: o que está aberto, parado e vencendo."
        acoes={botaoNovo}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Abertos"
          valor={resumo.abertos}
          icone={ClipboardList}
          href="/atendimentos?status=aberto"
        />
        <Indicador
          rotulo="Em andamento"
          valor={resumo.emAndamento}
          icone={Clock}
          href="/atendimentos?status=em_andamento"
        />
        <Indicador
          rotulo="Aguardando"
          valor={resumo.aguardando}
          icone={PauseCircle}
          href="/atendimentos?status=aguardando"
        />
        <Indicador
          rotulo="Resolvidos no mês"
          valor={resumo.resolvidosNoMes}
          icone={CheckCircle2}
          href="/atendimentos?status=resolvido"
          detalhe={`${formatarDuracao(resumo.minutosNoMes)} no mês`}
        />
      </div>

      {resumo.totalDeAtendimentos === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhum atendimento ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que você registrar o primeiro, os números e as listas aparecem aqui.
              </p>
            </div>
            {botaoNovo}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <BlocoDePendencias itens={pendencias} />

            <BlocoDeAgenda eventos={eventos.slice(0, LIMITE_DE_EVENTOS_NO_DASHBOARD)} total={eventos.length} />

            <BlocoDeAtendimentos
              titulo="Aguardando retorno"
              descricao="Esperando cliente ou terceiro — os mais antigos primeiro."
              icone={PauseCircle}
              itens={resumo.aguardandoRetorno}
              vazio="Nada aguardando resposta de terceiros."
            />
          </div>

          <BlocoDeAtendimentos
            titulo="Últimos atendimentos"
            descricao="O que está pendente, do movimentado por último."
            icone={ClipboardList}
            itens={resumo.recentes}
            vazio="Nada pendente. Todos os atendimentos estão resolvidos ou cancelados."
          />
        </div>
      )}

      {resumo.pendenciasVencidas > 0 ? (
        <Card className="mt-4 border-amber-300 dark:border-amber-800">
          <CardContent className="flex items-center gap-3 p-5">
            <ListChecks className="size-5 text-amber-700 dark:text-amber-400" />
            <p className="text-sm">
              <strong>{resumo.pendenciasVencidas}</strong>{" "}
              {resumo.pendenciasVencidas === 1 ? "pendência vencida" : "pendências vencidas"}.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function Indicador({
  rotulo,
  valor,
  icone: Icone,
  href,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  icone: LucideIcon;
  href: string;
  detalhe?: string;
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <Link href={href} className="block">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">{rotulo}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
            {detalhe ? <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p> : null}
          </div>
          <Icone className="size-5 text-muted-foreground" />
        </CardContent>
      </Link>
    </Card>
  );
}

function BlocoDePendencias({ itens }: { itens: PendenciaComContexto[] }) {
  const agora = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          Pendências
          {itens.length > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">({itens.length})</span>
          ) : null}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          O que ainda precisa de retorno, os prazos mais próximos primeiro.
        </p>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhuma pendência em aberto.</p>
        ) : (
          <ul className="flex flex-col">
            {itens.map((item) => {
              const vencida = item.prazo ? new Date(item.prazo) < agora : false;
              const destino = item.atendimento_id
                ? `/atendimentos/${item.atendimento_id}`
                : item.cliente_id
                  ? `/clientes/${item.cliente_id}`
                  : "/pendencias";

              return (
                <li key={item.id} className="border-b border-border py-2.5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link href={destino} className="text-sm font-medium text-primary hover:underline">
                      {item.titulo}
                    </Link>
                    {vencida ? (
                      <Badge className="shrink-0 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        Vencida
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.clientes?.razao_social ?? "Sem cliente vinculado"}
                    {item.prazo ? ` · prazo ${formatarData(item.prazo)}` : " · sem prazo"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/pendencias" className="mt-3 inline-block text-xs text-primary hover:underline">
          Ver todas as pendências →
        </Link>
      </CardContent>
    </Card>
  );
}

function BlocoDeAgenda({ eventos, total }: { eventos: EventoComContexto[]; total: number }) {
  const agora = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          Agenda
          {total > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">({total})</span>
          ) : null}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Retornos e visitas dos próximos {DIAS_DA_AGENDA_NO_DASHBOARD} dias.
        </p>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nada agendado para os próximos dias.</p>
        ) : (
          <ul className="flex flex-col">
            {eventos.map((evento) => {
              const inicio = new Date(evento.inicio);
              const atrasado = !evento.dia_inteiro && inicio < agora;

              return (
                <li key={evento.id} className="border-b border-border py-2.5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link
                      href={`/agenda/${evento.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {evento.titulo}
                    </Link>
                    {atrasado ? (
                      <Badge className="shrink-0 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        Atrasado
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {evento.dia_inteiro
                      ? formatarData(evento.inicio, "dd/MM")
                      : formatarData(evento.inicio, "dd/MM 'às' HH:mm")}
                    {" · "}
                    {TIPOS_EVENTO[evento.tipo]}
                    {evento.clientes?.razao_social ? ` · ${evento.clientes.razao_social}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/agenda" className="mt-3 inline-block text-xs text-primary hover:underline">
          Ver a agenda completa →
        </Link>
      </CardContent>
    </Card>
  );
}

function BlocoDeAtendimentos({
  titulo,
  descricao,
  icone: Icone,
  itens,
  vazio,
  destaque,
  className,
}: {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  itens: LinhaAtendimento[];
  vazio: string;
  destaque?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icone
            className={
              destaque && itens.length > 0
                ? "size-4 text-amber-600 dark:text-amber-400"
                : "size-4 text-muted-foreground"
            }
          />
          {titulo}
          {itens.length > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">({itens.length})</span>
          ) : null}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{vazio}</p>
        ) : (
          <ul className="flex flex-col">
            {itens.map((item) => {
              const status = item.status ? STATUS_ATENDIMENTO[item.status] : null;

              return (
                <li key={item.id} className="border-b border-border py-2.5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link
                      href={`/atendimentos/${item.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {item.titulo}
                    </Link>
                    {status ? (
                      <Badge className={`${status.cor} shrink-0`}>{status.rotulo}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.cliente_nome}
                    {" · "}
                    <span className="font-mono">{item.numero}</span>
                    {" · atualizado "}
                    {formatarRelativo(item.updated_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
