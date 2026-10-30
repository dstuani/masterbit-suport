import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { podeEscreverAgora } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { listarConhecimentos, opcoesDoConhecimento } from "@/lib/services/conhecimento";
import { CartaoConhecimento } from "./cartao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Base de conhecimento" };

export default async function ConhecimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; sistema?: string; categoria?: string }>;
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

  const [itens, opcoes, podeEditar] = await Promise.all([
    listarConhecimentos({
      busca: params.busca,
      sistemaId: params.sistema || undefined,
      categoriaId: params.categoria || undefined,
    }),
    opcoesDoConhecimento(),
    podeEscreverAgora(),
  ]);

  const filtrando = Boolean(params.busca || params.sistema || params.categoria);

  return (
    <>
      <PageHeader
        titulo="Base de conhecimento"
        descricao="Comandos SQL guardados com a explicação, para achar por palavra e copiar."
        acoes={
          podeEditar ? (
            <Button asChild size="sm">
              <Link href="/conhecimento/novo">
                <Plus />
                Novo comando
              </Link>
            </Button>
          ) : null
        }
      />

      {/* GET simples: os filtros ficam na URL e a página funciona sem JavaScript. */}
      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="busca"
            defaultValue={params.busca ?? ""}
            placeholder="Palavras do título, da descrição ou do SQL"
            aria-label="Buscar comando"
            className="pl-8"
          />
        </div>
        <Select name="sistema" defaultValue={params.sistema ?? ""} aria-label="Sistema">
          <option value="">Todos os sistemas</option>
          {opcoes.sistemas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </Select>
        <Select name="categoria" defaultValue={params.categoria ?? ""} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {opcoes.categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          {filtrando ? (
            <Button asChild variant="ghost">
              <Link href="/conhecimento">Limpar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {itens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            {filtrando ? (
              <p className="text-sm text-muted-foreground">Nenhum comando com esses filtros.</p>
            ) : (
              <>
                <p className="text-sm font-medium">Nenhum comando guardado ainda</p>
                {podeEditar ? (
                  <Button asChild size="sm">
                    <Link href="/conhecimento/novo">
                      <Plus />
                      Novo comando
                    </Link>
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {itens.length} {itens.length === 1 ? "comando" : "comandos"}
          </p>
          <div className="flex flex-col gap-3">
            {itens.map((i) => (
              <CartaoConhecimento
                key={i.id}
                podeEditar={podeEditar}
                item={{
                  id: i.id,
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
