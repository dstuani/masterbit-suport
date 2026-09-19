import Link from "next/link";
import {
  AlarmClock,
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
import { STATUS_ATENDIMENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { DIAS_PARA_PARADO, obterResumo, type ResumoDashboard } from "@/lib/services/dashboard";
import { formatarDuracao, formatarRelativo } from "@/lib/utils";

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

  const resumo = await obterResumo();
  const emAberto = resumo.abertos + resumo.emAndamento + resumo.aguardando;

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão do dia: o que está aberto, parado e vencendo."
        acoes={
          <Button asChild size="sm">
            <Link href="/atendimentos/novo">
              <Plus />
              Novo atendimento
            </Link>
          </Button>
        }
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

      {emAberto === 0 && resumo.recentes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhum atendimento ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que você registrar o primeiro, os números e as listas aparecem aqui.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/atendimentos/novo">
                <Plus />
                Novo atendimento
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <BlocoDeAtendimentos
            titulo={`Parados há mais de ${DIAS_PARA_PARADO} dias`}
            descricao="Em aberto e sem nenhum registro recente."
            icone={AlarmClock}
            itens={resumo.parados}
            vazio="Nada parado. Todos os atendimentos em aberto tiveram movimento recente."
            destaque
          />

          <BlocoDeAtendimentos
            titulo="Aguardando retorno"
            descricao="Esperando cliente ou terceiro — os mais antigos primeiro."
            icone={PauseCircle}
            itens={resumo.aguardandoRetorno}
            vazio="Nada aguardando resposta de terceiros."
          />

          <BlocoDeAtendimentos
            titulo="Últimos atendimentos"
            descricao="O que foi movimentado por último."
            icone={ClipboardList}
            itens={resumo.recentes}
            vazio="Nenhum atendimento registrado."
            className="lg:col-span-2"
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
