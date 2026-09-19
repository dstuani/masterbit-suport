import Link from "next/link";
import { Plus } from "lucide-react";
import { startOfDay, endOfDay, addDays, startOfMonth, endOfMonth, format, isSameDay, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TIPOS_EVENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { listarEventos, type EventoComContexto } from "@/lib/services/agenda";
import { formatarDataHora, cn } from "@/lib/utils";
import { MiniCalendario } from "./mini-calendario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agenda" };

const VISTAS = [
  { chave: "proximos", rotulo: "Próximos" },
  { chave: "mes", rotulo: "Este mês" },
  { chave: "todos", rotulo: "Todos" },
] as const;

type Vista = (typeof VISTAS)[number]["chave"];

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; dia?: string }>;
}) {
  const params = await searchParams;
  const vista = (VISTAS.some((v) => v.chave === params.vista) ? params.vista : "proximos") as Vista;
  const diaParam = params.dia;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Agenda" />
        <AvisoSupabase />
      </>
    );
  }

  const agora = new Date();
  let filtrosDe: string | undefined;
  let filtrosAte: string | undefined;

  if (vista === "proximos") {
    filtrosDe = startOfDay(agora).toISOString();
    filtrosAte = endOfDay(addDays(agora, 30)).toISOString();
  } else if (vista === "mes") {
    filtrosDe = startOfMonth(agora).toISOString();
    filtrosAte = endOfMonth(agora).toISOString();
  }
  // "todos" não filtra por data

  const eventos = await listarEventos({
    de: filtrosDe,
    ate: filtrosAte,
    status: vista === "proximos" ? "pendentes" : undefined,
  });

  // Agrupa por dia
  const diasComEventos = agruparPorDia(eventos, diaParam ? parseISO(diaParam) : undefined);

  return (
    <>
      <PageHeader
        titulo="Agenda"
        descricao="Retornos, visitas e lembretes programados."
        acoes={
          <Button asChild size="sm">
            <Link href="/agenda/novo">
              <Plus />
              Novo evento
            </Link>
          </Button>
        }
      />

      {/* Filtros de vista */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        {VISTAS.map((v) => {
          const href = `/agenda?vista=${v.chave}`;
          return (
            <Link
              key={v.chave}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                vista === v.chave
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {v.rotulo}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        {/* Lista de eventos */}
        <div className="flex flex-col gap-6">
          {diasComEventos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {vista === "proximos"
                  ? "Nenhum evento nos próximos 30 dias."
                  : "Nenhum evento encontrado."}
              </CardContent>
            </Card>
          ) : (
            diasComEventos.map(({ dia, eventos: evs }) => (
              <section key={dia.toISOString()}>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  {rotuloDoDia(dia)}
                </h2>
                <div className="flex flex-col gap-2">
                  {evs.map((evento) => (
                    <CartaoEvento key={evento.id} evento={evento} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Mini-calendário lateral */}
        <aside className="hidden lg:block">
          <MiniCalendario
            eventos={eventos.map((e) => ({
              id: e.id,
              inicio: e.inicio,
              status: e.status,
            }))}
            mes={agora.getFullYear() * 100 + agora.getMonth()}
          />
        </aside>
      </div>
    </>
  );
}

// ─── Componentes ─────────────────────────────────────────────────────────────

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

function CartaoEvento({ evento }: { evento: EventoComContexto }) {
  const pendente = evento.status === "agendado" || evento.status === "confirmado";

  return (
    <Link href={`/agenda/${evento.id}`}>
      <Card className={cn("transition-colors hover:border-primary/50", !pendente && "opacity-70")}>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge className={STATUS_COR[evento.status] ?? ""}>
                {STATUS_ROTULO[evento.status] ?? evento.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {TIPOS_EVENTO[evento.tipo as keyof typeof TIPOS_EVENTO] ?? evento.tipo}
              </span>
            </div>
            <p className="font-medium truncate">{evento.titulo}</p>
            {evento.clientes && (
              <p className="text-sm text-muted-foreground truncate">
                {evento.clientes.razao_social}
              </p>
            )}
            {evento.atendimentos && (
              <p className="text-xs text-muted-foreground truncate">
                {evento.atendimentos.numero} · {evento.atendimentos.titulo}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>{formatarDataHora(evento.inicio).split(" às ")[1]}</p>
            {evento.local && <p className="mt-0.5 truncate max-w-[8rem]">{evento.local}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function agruparPorDia(
  eventos: EventoComContexto[],
  diaFiltro?: Date,
): { dia: Date; eventos: EventoComContexto[] }[] {
  const mapa = new Map<string, { dia: Date; eventos: EventoComContexto[] }>();

  for (const evento of eventos) {
    const dia = startOfDay(parseISO(evento.inicio));
    if (diaFiltro && !isSameDay(dia, diaFiltro)) continue;
    const chave = dia.toISOString();
    if (!mapa.has(chave)) mapa.set(chave, { dia, eventos: [] });
    mapa.get(chave)!.eventos.push(evento);
  }

  return [...mapa.values()].sort((a, b) => a.dia.getTime() - b.dia.getTime());
}

function rotuloDoDia(dia: Date): string {
  if (isToday(dia)) return "Hoje";
  if (isTomorrow(dia)) return "Amanhã";
  return format(dia, "EEEE, d 'de' MMMM", { locale: ptBR });
}
