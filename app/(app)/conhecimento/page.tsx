import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { podeEscreverAgora } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { TIPOS_CONHECIMENTO, type TipoConhecimento } from "@/lib/schemas/conhecimento";
import { listarConhecimentos } from "@/lib/services/conhecimento";
import { CartaoConhecimento } from "./cartao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Base de conhecimento" };

const SESSOES: { valor: TipoConhecimento; rotulo: string }[] = [
  { valor: "configuracao", rotulo: "Configurações" },
  { valor: "select", rotulo: "Select" },
];

export default async function ConhecimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; busca?: string }>;
}) {
  const params = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Base de conhecimento" />
        <AvisoSupabase />
      </>
    );
  }

  const tipo = TIPOS_CONHECIMENTO.find((t) => t === params.tipo);
  // A tela de entrada traz só os botões e a pesquisa: a lista aparece ao escolher a sessão ou buscar.
  const mostrarLista = Boolean(tipo || params.busca);

  const [itens, podeEditar] = await Promise.all([
    mostrarLista ? listarConhecimentos({ tipo, busca: params.busca }) : [],
    podeEscreverAgora(),
  ]);

  return (
    <>
      <PageHeader titulo="Base de conhecimento" />

      <div className="mb-4 flex flex-wrap gap-2">
        {SESSOES.map((s) => (
          <Button key={s.valor} asChild variant={tipo === s.valor ? "primary" : "outline"}>
            <Link href={`/conhecimento?tipo=${s.valor}`}>{s.rotulo}</Link>
          </Button>
        ))}
        {podeEditar ? (
          <Button asChild variant="outline">
            <Link href={tipo ? `/conhecimento/novo?tipo=${tipo}` : "/conhecimento/novo"}>
              <Plus />
              Inclusão
            </Link>
          </Button>
        ) : null}
      </div>

      {/* GET simples: os filtros ficam na URL e a página funciona sem JavaScript. */}
      <form className="mb-4">
        {tipo ? <input type="hidden" name="tipo" value={tipo} /> : null}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="busca"
              defaultValue={params.busca ?? ""}
              placeholder="Pesquisar por palavra"
              aria-label="Pesquisar na base de conhecimento"
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          {mostrarLista ? (
            <Button asChild variant="ghost">
              <Link href="/conhecimento">Limpar</Link>
            </Button>
          ) : null}
        </div>

      </form>

      {!mostrarLista ? null : itens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </p>
          <div className="flex flex-col gap-3">
            {itens.map((i) => (
              <CartaoConhecimento
                key={i.id}
                podeEditar={podeEditar}
                item={{
                  id: i.id,
                  tipo: i.tipo as TipoConhecimento,
                  titulo: i.titulo,
                  descricao: i.descricao,
                  comando: i.comando,
                  sistema: i.sistemas?.nome ?? null,
                  categoria: i.categorias?.nome ?? null,
                }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
