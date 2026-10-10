import Link from "next/link";
import { Monitor, Plus, Search } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { podeEscreverAgora } from "@/lib/auth";
import { DIAS_SEM_COLETA, TIPOS_EQUIPAMENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import {
  limiteSemColeta,
  listarEquipamentos,
  opcoesDoCadastro,
  type EquipamentoComContexto,
  type FiltrosEquipamentos,
} from "@/lib/services/equipamentos";
import { cn, formatarMemoria, formatarRelativo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipamentos" };

const SITUACOES = [
  { valor: "ativos", rotulo: "Em uso" },
  { valor: "sem_coleta", rotulo: `Sem coleta há ${DIAS_SEM_COLETA}+ dias` },
  { valor: "inativos", rotulo: "Desativados" },
  { valor: "todos", rotulo: "Todos" },
] as const;

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; cliente?: string; tipo?: string; situacao?: string }>;
}) {
  const params = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Equipamentos" />
        <AvisoSupabase />
      </>
    );
  }

  const situacao = (SITUACOES.find((s) => s.valor === params.situacao)?.valor ?? "ativos") as FiltrosEquipamentos["situacao"];
  const tipo = params.tipo && params.tipo in TIPOS_EQUIPAMENTO ? params.tipo : undefined;

  const [equipamentos, opcoes, podeEditar] = await Promise.all([
    listarEquipamentos({ busca: params.busca, clienteId: params.cliente || undefined, tipo, situacao }),
    opcoesDoCadastro(),
    podeEscreverAgora(),
  ]);

  const limite = new Date(limiteSemColeta()).getTime();
  const filtrando = Boolean(params.busca || params.cliente || tipo || (situacao && situacao !== "ativos"));

  return (
    <>
      <PageHeader
        titulo="Equipamentos"
        descricao="O parque de máquinas dos clientes, com o hardware coletado e o histórico de manutenções."
        acoes={
          podeEditar ? (
            <Button asChild size="sm">
              <Link href="/equipamentos/novo">
                <Plus />
                Novo equipamento
              </Link>
            </Button>
          ) : null
        }
      />

      {/* GET simples: os filtros ficam na URL e a página funciona sem JavaScript. */}
      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="busca"
            defaultValue={params.busca ?? ""}
            placeholder="Nome, patrimônio, série, usuário ou setor"
            aria-label="Buscar equipamento"
            className="pl-8"
          />
        </div>
        <Select name="cliente" defaultValue={params.cliente ?? ""} aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {opcoes.clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razao_social}
            </option>
          ))}
        </Select>
        <Select name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS_EQUIPAMENTO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
        <Select name="situacao" defaultValue={situacao} aria-label="Situação">
          {SITUACOES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          {filtrando ? (
            <Button asChild variant="ghost">
              <Link href="/equipamentos">Limpar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {equipamentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Monitor className="size-8 text-muted-foreground" />
            {filtrando ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento com esses filtros.</p>
            ) : (
              <>
                <p className="text-sm font-medium">Nenhum equipamento ainda</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Abra a ficha de um cliente, aba Equipamentos, e gere o script de coleta para instalar nos
                  computadores dele. Cada máquina aparece aqui sozinha depois da primeira coleta.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Equipamento</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Cliente</th>
                    <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Sistema</th>
                    <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Hardware</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Última coleta</th>
                  </tr>
                </thead>
                <tbody>
                  {equipamentos.map((e) => (
                    <LinhaEquipamento key={e.id} equipamento={e} limite={limite} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            {equipamentos.length} {equipamentos.length === 1 ? "equipamento" : "equipamentos"}
          </p>
        </>
      )}
    </>
  );
}

function LinhaEquipamento({ equipamento: e, limite }: { equipamento: EquipamentoComContexto; limite: number }) {
  const semColeta =
    e.origem === "agente" && e.ativo && (!e.ultima_coleta_em || new Date(e.ultima_coleta_em).getTime() < limite);
  const hardware = [e.processador, formatarMemoria(e.memoria_mb)].filter(Boolean).join(" · ");

  const coleta =
    e.origem === "manual" ? (
      <span className="text-muted-foreground">Cadastro manual</span>
    ) : (
      <span className={cn(semColeta ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
        {e.ultima_coleta_em ? formatarRelativo(e.ultima_coleta_em) : "Nunca"}
      </span>
    );

  return (
    <tr className={cn("border-b border-border last:border-0", !e.ativo && "opacity-60")}>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/equipamentos/${e.id}`} className="font-medium text-primary hover:underline">
            {e.nome}
          </Link>
          <Badge>{TIPOS_EQUIPAMENTO[e.tipo as keyof typeof TIPOS_EQUIPAMENTO] ?? e.tipo}</Badge>
          {!e.ativo ? <Badge>Desativado</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[e.patrimonio ? `Patr. ${e.patrimonio}` : null, e.setor, e.usuario].filter(Boolean).join(" · ") || "—"}
        </p>
        {/* Celular: o resumo das colunas escondidas. */}
        <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
          {e.clientes?.razao_social} · {coleta}
        </p>
      </td>
      <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
        {e.clientes?.razao_social}
        {e.filiais ? <span className="block text-xs">{e.filiais.nome}</span> : null}
      </td>
      <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">{e.sistema_operacional ?? "—"}</td>
      <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">{hardware || "—"}</td>
      <td className="hidden px-4 py-2.5 whitespace-nowrap md:table-cell">{coleta}</td>
    </tr>
  );
}
