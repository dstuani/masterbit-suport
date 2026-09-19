import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORIDADES, STATUS_ATENDIMENTO, TIPOS_ATENDIMENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import {
  buscarAtendimentos,
  opcoesDeConsulta,
  POR_PAGINA_CONSULTA,
} from "@/lib/services/consultas";
import { formatarData, formatarDuracao, cn } from "@/lib/utils";
import { FiltrosConsulta } from "./filtros";
import { BotaoExportarCSV } from "./exportar";
import { ConsultasSalvas } from "./consultas-salvas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consultas" };

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Consultas" />
        <AvisoSupabase />
      </>
    );
  }

  const pagina = Number.parseInt(params.pagina ?? "1", 10) || 1;

  const temFiltro = Boolean(
    params.busca || params.status || params.prioridade || params.clienteId ||
    params.categoriaId || params.sistemaId || params.tipo || params.de || params.ate ||
    params.contatoId,
  );

  const [{ itens, total, paginas }, opcoes] = await Promise.all([
    temFiltro
      ? buscarAtendimentos(
          {
            busca: params.busca,
            clienteId: params.clienteId,
            contatoId: params.contatoId,
            status: params.status,
            prioridade: params.prioridade,
            tipo: params.tipo,
            categoriaId: params.categoriaId,
            sistemaId: params.sistemaId,
            de: params.de,
            ate: params.ate,
          },
          pagina,
        )
      : Promise.resolve({ itens: [], total: 0, paginas: 0 }),
    opcoesDeConsulta(),
  ]);

  // URL usada para salvar/carregar consultas
  const urlAtual = (() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "pagina") p.set(k, v);
    }
    return p.size > 0 ? `/consultas?${p}` : "/consultas";
  })();

  return (
    <>
      <PageHeader
        titulo="Consultas"
        descricao="Busca no histórico — o que já foi tratado, com quem e quando."
      />

      <FiltrosConsulta
        valores={{
          busca: params.busca ?? "",
          status: params.status ?? "",
          prioridade: params.prioridade ?? "",
          clienteId: params.clienteId ?? "",
          categoriaId: params.categoriaId ?? "",
          sistemaId: params.sistemaId ?? "",
          tipo: params.tipo ?? "",
          de: params.de ?? "",
          ate: params.ate ?? "",
        }}
        opcoes={opcoes}
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <ConsultasSalvas urlAtual={urlAtual} />

        {temFiltro && itens.length > 0 ? (
          <BotaoExportarCSV itens={itens} />
        ) : null}
      </div>

      {!temFiltro ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Search className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Busca no histórico de atendimentos</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Digite um termo ou escolha um filtro para consultar — a busca cobre
                títulos, descrições e soluções registradas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum atendimento encontrado com esses filtros.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Nº</th>
                    <th className="px-4 py-2.5 font-medium">Assunto</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Tipo</th>
                    <th className="px-4 py-2.5 font-medium">Tempo</th>
                    <th className="px-4 py-2.5 font-medium">Aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const status = item.status ? STATUS_ATENDIMENTO[item.status as keyof typeof STATUS_ATENDIMENTO] : null;
                    const prioridade = item.prioridade ? PRIORIDADES[item.prioridade as keyof typeof PRIORIDADES] : null;

                    return (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                        <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          <Link href={`/atendimentos/${item.id}`} className="hover:underline">
                            {item.numero}
                          </Link>
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
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          <Link href={`/clientes/${item.cliente_id}`} className="hover:underline">
                            {item.cliente_nome}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {status ? <Badge className={status.cor}>{status.rotulo}</Badge> : null}
                            {prioridade ? (
                              <Badge className={cn(prioridade.cor, "text-xs")}>{prioridade.rotulo}</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {item.tipo ? TIPOS_ATENDIMENTO[item.tipo as keyof typeof TIPOS_ATENDIMENTO] : "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatarDuracao(item.tempo_gasto_minutos)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatarData(item.iniciado_em)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {total} {total === 1 ? "atendimento" : "atendimentos"}
              {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}
              {total === POR_PAGINA_CONSULTA ? " (use mais filtros para refinar)" : ""}
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
        </>
      )}
    </>
  );
}

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
    <Link href={`/consultas?${query}`} className="text-primary hover:underline">
      {children}
    </Link>
  );
}
