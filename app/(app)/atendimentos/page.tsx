import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORIDADES, STATUS_ATENDIMENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { listarAtendimentos, opcoesDeFormulario } from "@/lib/services/atendimentos";
import { listarResponsaveis } from "@/lib/services/equipe";
import { formatarDuracao, formatarRelativo } from "@/lib/utils";
import { FiltrosAtendimentos } from "./filtros";

export const metadata = { title: "Atendimentos" };

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const acoes = (
    <Button asChild size="sm">
      <Link href="/atendimentos/novo">
        <Plus />
        Novo atendimento
      </Link>
    </Button>
  );

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Atendimentos" descricao="Registro de tudo que foi tratado." />
        <AvisoSupabase />
      </>
    );
  }

  const pagina = Number.parseInt(params.pagina ?? "1", 10) || 1;

  const [{ itens, total, paginas }, opcoes, responsaveis] = await Promise.all([
    listarAtendimentos({
      busca: params.busca,
      status: params.status as never,
      prioridade: params.prioridade,
      clienteId: params.cliente,
      categoriaId: params.categoria,
      responsavelId: params.responsavel,
      pagina,
    }),
    opcoesDeFormulario(),
    listarResponsaveis(),
  ]);

  const temFiltro = Boolean(
    params.busca ||
      params.status ||
      params.prioridade ||
      params.cliente ||
      params.categoria ||
      params.responsavel,
  );

  return (
    <>
      <PageHeader
        titulo="Atendimentos"
        descricao="Registro de tudo que foi tratado com cada cliente."
        acoes={acoes}
      />

      <FiltrosAtendimentos
        valores={{
          busca: params.busca ?? "",
          status: params.status ?? "",
          prioridade: params.prioridade ?? "",
          cliente: params.cliente ?? "",
          categoria: params.categoria ?? "",
          responsavel: params.responsavel ?? "",
        }}
        clientes={opcoes.clientes}
        categorias={opcoes.categorias}
        responsaveis={responsaveis}
      />

      {itens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {temFiltro ? "Nenhum atendimento encontrado" : "Nenhum atendimento registrado"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {temFiltro
                  ? "Ajuste os filtros para ampliar a busca."
                  : "Registre o primeiro atendimento para começar a construir o histórico."}
              </p>
            </div>
            {!temFiltro ? acoes : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nº</th>
                  <th className="px-4 py-2.5 font-medium">Assunto</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Prioridade</th>
                  <th className="px-4 py-2.5 font-medium">Tempo</th>
                  <th className="px-4 py-2.5 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const status = item.status ? STATUS_ATENDIMENTO[item.status] : null;
                  const prioridade = item.prioridade ? PRIORIDADES[item.prioridade] : null;

                  return (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                        {item.numero}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/atendimentos/${item.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.titulo}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {item.categoria_nome ? <span>{item.categoria_nome}</span> : null}
                          {item.sistema_nome ? <span>· {item.sistema_nome}</span> : null}
                          {(item.pendencias_abertas ?? 0) > 0 ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              · {item.pendencias_abertas} pendência
                              {item.pendencias_abertas === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{item.cliente_nome}</td>
                      <td className="px-4 py-2.5">
                        {status ? <Badge className={status.cor}>{status.rotulo}</Badge> : null}
                      </td>
                      <td className="px-4 py-2.5">
                        {prioridade ? (
                          <Badge className={prioridade.cor}>{prioridade.rotulo}</Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatarDuracao(item.tempo_gasto_minutos)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                        {formatarRelativo(item.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {total > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {total} {total === 1 ? "atendimento" : "atendimentos"}
            {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}
          </span>

          {paginas > 1 ? (
            <div className="flex gap-2">
              <PaginaLink params={params} pagina={pagina - 1} desabilitado={pagina <= 1}>
                Anterior
              </PaginaLink>
              <PaginaLink params={params} pagina={pagina + 1} desabilitado={pagina >= paginas}>
                Próxima
              </PaginaLink>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Preserva os filtros ao paginar — trocar de página não pode zerar a busca. */
function PaginaLink({
  params,
  pagina,
  desabilitado,
  children,
}: {
  params: Record<string, string | undefined>;
  pagina: number;
  desabilitado: boolean;
  children: React.ReactNode;
}) {
  if (desabilitado) {
    return <span className="cursor-not-allowed opacity-40">{children}</span>;
  }

  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor && chave !== "pagina") query.set(chave, valor);
  }
  if (pagina > 1) query.set("pagina", String(pagina));

  return (
    <Link
      href={query.size > 0 ? `/atendimentos?${query}` : "/atendimentos"}
      className="text-primary hover:underline"
    >
      {children}
    </Link>
  );
}
