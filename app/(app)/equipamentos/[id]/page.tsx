import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Power, Wrench } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { podeEscreverAgora } from "@/lib/auth";
import { DIAS_SEM_COLETA, TIPOS_EQUIPAMENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import {
  atendimentosParaVincular,
  limiteSemColeta,
  listarManutencoes,
  obterEquipamento,
} from "@/lib/services/equipamentos";
import { formatarDataHora, formatarDuracao, formatarMemoria, formatarRelativo } from "@/lib/utils";
import { mudarSituacaoEquipamentoAction } from "../actions";
import { FormularioManutencao } from "./manutencao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipamento" };

// discos, volumes e rede chegam do agente como JSON livre: lidos com cuidado, campo a campo.
type Registro = Record<string, unknown>;
const lista = (valor: unknown): Registro[] =>
  Array.isArray(valor) ? valor.filter((v): v is Registro => typeof v === "object" && v !== null) : [];
const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export default async function EquipamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Equipamento" />
        <AvisoSupabase />
      </>
    );
  }

  const equipamento = await obterEquipamento(id);
  if (!equipamento) notFound();

  const [manutencoes, atendimentos, podeEditar] = await Promise.all([
    listarManutencoes(id),
    atendimentosParaVincular(equipamento.cliente_id),
    podeEscreverAgora(),
  ]);

  const e = equipamento;
  const semColeta =
    e.origem === "agente" &&
    e.ativo &&
    (!e.ultima_coleta_em || new Date(e.ultima_coleta_em).getTime() < new Date(limiteSemColeta()).getTime());
  const tempoTotal = manutencoes.reduce((s, m) => s + (m.tempo_minutos ?? 0), 0);

  const discos = lista(e.discos);
  const volumes = lista(e.volumes);
  const rede = lista(e.rede);

  return (
    <>
      <PageHeader
        titulo={e.nome}
        descricao={[e.clientes?.razao_social, e.filiais?.nome, e.setor].filter(Boolean).join(" · ")}
        acoes={
          podeEditar ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/atendimentos/novo?${new URLSearchParams({ cliente: e.cliente_id, titulo: `${e.nome}: ` })}`}
                >
                  <Plus />
                  Abrir atendimento
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/equipamentos/${e.id}/editar`}>
                  <Pencil />
                  Editar
                </Link>
              </Button>
              <form action={mudarSituacaoEquipamentoAction}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="ativo" value={e.ativo ? "false" : "true"} />
                <Button type="submit" size="sm" variant="ghost" title={e.ativo ? "Tirar da lista do parque" : "Voltar à lista do parque"}>
                  <Power />
                  {e.ativo ? "Desativar" : "Reativar"}
                </Button>
              </form>
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge>{TIPOS_EQUIPAMENTO[e.tipo as keyof typeof TIPOS_EQUIPAMENTO] ?? e.tipo}</Badge>
        {!e.ativo ? <Badge>Desativado</Badge> : null}
        {semColeta ? (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Sem coleta há mais de {DIAS_SEM_COLETA} dias
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Esquerda: manutenções */}
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4 text-muted-foreground" />
              Manutenções
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {manutencoes.length === 0
                ? "Nenhuma manutenção registrada ainda."
                : `${manutencoes.length} ${manutencoes.length === 1 ? "registro" : "registros"}${tempoTotal > 0 ? ` · ${formatarDuracao(tempoTotal)} no total` : ""}`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {podeEditar ? (
              <div className="rounded-app border border-border bg-surface-muted/50 p-4">
                <FormularioManutencao equipamentoId={e.id} atendimentos={atendimentos} />
              </div>
            ) : null}

            {manutencoes.length > 0 ? (
              <ol className="flex flex-col">
                {manutencoes.map((m) => (
                  <li key={m.id} className="border-l-2 border-border pb-5 pl-4 last:pb-0">
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(m.realizada_em)}
                      {m.tempo_minutos ? ` · ${formatarDuracao(m.tempo_minutos)}` : ""}
                      {m.profiles?.nome ? ` · ${m.profiles.nome}` : ""}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{m.descricao}</p>
                    {m.atendimentos && m.atendimento_id ? (
                      <Link
                        href={`/atendimentos/${m.atendimento_id}`}
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        {m.atendimentos.numero} · {m.atendimentos.titulo}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </CardContent>
        </Card>

        {/* Direita: ficha */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Hardware</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2.5 text-sm">
                <Item rotulo="Fabricante e modelo" valor={[e.fabricante, e.modelo].filter(Boolean).join(" ") || null} />
                <Item rotulo="Número de série" valor={e.numero_serie} />
                <Item
                  rotulo="Processador"
                  valor={e.processador ? `${e.processador}${e.nucleos ? ` (${e.nucleos} núcleos)` : ""}` : null}
                />
                <Item rotulo="Memória" valor={formatarMemoria(e.memoria_mb)} />
                <Item
                  rotulo="Sistema"
                  valor={e.sistema_operacional ? `${e.sistema_operacional}${e.versao_so ? ` (${e.versao_so})` : ""}` : null}
                />
                <Item rotulo="Usuário" valor={e.usuario} />
                <Item rotulo="Domínio / grupo" valor={e.dominio} />
              </dl>
            </CardContent>
          </Card>

          {discos.length > 0 || volumes.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Discos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {discos.map((d, i) => (
                  <p key={i}>
                    {texto(d.modelo) ?? "Disco"}
                    <span className="text-muted-foreground">
                      {numero(d.tamanho_gb) ? ` · ${numero(d.tamanho_gb)} GB` : ""}
                      {texto(d.interface) ? ` · ${texto(d.interface)}` : ""}
                    </span>
                  </p>
                ))}
                {volumes.map((v, i) => {
                  const total = numero(v.total_gb) ?? 0;
                  const livre = numero(v.livre_gb) ?? 0;
                  const usado = total > 0 ? Math.min(100, Math.round(((total - livre) / total) * 100)) : 0;
                  return (
                    <div key={`v${i}`}>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{texto(v.letra) ?? "Volume"}</span>
                        <span className="text-muted-foreground">
                          {livre.toLocaleString("pt-BR")} GB livres de {total.toLocaleString("pt-BR")} GB
                        </span>
                      </div>
                      {/* Acima de 90% de uso a barra fica em âmbar, com o texto acima dizendo o espaço livre. */}
                      <div
                        className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"
                        role="meter"
                        aria-label={`Uso do volume ${texto(v.letra) ?? ""}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={usado}
                      >
                        <div
                          className={usado >= 90 ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-primary"}
                          style={{ width: `${usado}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {rede.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Rede</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {rede.map((r, i) => (
                  <div key={i}>
                    <p className="tabular-nums">{texto(r.ip) ?? "Sem IPv4"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[texto(r.mac), texto(r.descricao)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Cadastro</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2.5 text-sm">
                <Item rotulo="Patrimônio" valor={e.patrimonio} />
                <Item rotulo="Setor / local" valor={e.setor} />
                <Item
                  rotulo="Origem"
                  valor={e.origem === "agente" ? `Coleta automática · ${e.coletas} envios` : "Cadastro manual"}
                />
                {e.origem === "agente" ? (
                  <Item
                    rotulo="Última coleta"
                    valor={e.ultima_coleta_em ? `${formatarRelativo(e.ultima_coleta_em)} (${formatarDataHora(e.ultima_coleta_em)})` : "Nunca"}
                  />
                ) : null}
                {e.observacoes ? <Item rotulo="Observações" valor={e.observacoes} /> : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="whitespace-pre-wrap break-words">{valor || "—"}</dd>
    </div>
  );
}
