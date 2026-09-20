import Link from "next/link";
import { Lightbulb, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabaseConfigurado } from "@/lib/env";
import { buscarCasosParecidos, type CasoParecido } from "@/lib/services/similares";
import { PainelDeParecidos } from "./painel";

export const metadata = { title: "Casos parecidos" };
export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO_DA_BUSCA = 300;

export default async function CasosParecidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: bruto } = await searchParams;
  const q = (bruto ?? "").trim().slice(0, TAMANHO_MAXIMO_DA_BUSCA);

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Casos parecidos" />
        <AvisoSupabase />
      </>
    );
  }

  let casos: CasoParecido[] | null = null;
  let erro: string | null = null;

  if (q) {
    try {
      casos = await buscarCasosParecidos({ titulo: q, descricao: null, clienteId: null });
    } catch (e) {
      erro = e instanceof Error ? e.message : "Não foi possível buscar agora.";
    }
  }

  const linkNovoAtendimento = `/atendimentos/novo?titulo=${encodeURIComponent(q)}`;

  return (
    <>
      <PageHeader
        titulo="Casos parecidos"
        descricao="Pesquise por tópicos ou palavras e veja como problemas parecidos foram resolvidos antes."
      />

      <form action="/casos-parecidos" method="get" className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            autoFocus
            maxLength={TAMANHO_MAXIMO_DA_BUSCA}
            aria-label="Tópicos ou palavras"
            placeholder="Ex.: NF-e rejeitada erro 539, impressora fiscal não comunica…"
            className="pl-8 text-base"
          />
        </div>
        <Button type="submit">
          <Lightbulb />
          Buscar casos parecidos
        </Button>
      </form>

      {!q ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Lightbulb className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Já resolveu algo parecido?</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Digite os tópicos ou palavras-chave do problema. Códigos de erro, nomes de
                telas e mensagens ajudam a achar o caso certo.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : casos && casos.length > 0 ? (
        <div className="flex flex-col gap-3">
          <PainelDeParecidos casos={casos} />
          <p className="text-sm text-muted-foreground">
            Nenhum deles resolve?{" "}
            <Link href={linkNovoAtendimento} className="text-primary hover:underline">
              Abrir novo atendimento com estes termos
            </Link>
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Search className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhum caso resolvido parecido</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Não há atendimento resolvido com esses termos. Tente outras palavras ou
                abra um novo atendimento — o assunto já vai preenchido com o que você
                digitou.
              </p>
            </div>
            <Button asChild>
              <Link href={linkNovoAtendimento}>
                <Plus />
                Criar novo atendimento com estes termos
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
