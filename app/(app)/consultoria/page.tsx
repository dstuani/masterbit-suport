import Link from "next/link";
import { Presentation } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_TOPICO_CONSULTORIA } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { listarTopicos, obterProjetoPrincipal } from "@/lib/services/consultoria";
import { NovoTopico } from "./novo-topico";

export const metadata = { title: "Consultoria Citel" };
export const dynamic = "force-dynamic";

export default async function ConsultoriaPage() {
  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Consultoria Citel" />
        <AvisoSupabase />
      </>
    );
  }

  const projeto = await obterProjetoPrincipal();

  if (!projeto) {
    return (
      <>
        <PageHeader titulo="Consultoria Citel" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Presentation className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhum projeto de consultoria ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Rode as migrations (<code className="font-mono">npm run db:push</code>) para criar
                o projeto &ldquo;Consultoria Citel&rdquo; com os tópicos do escopo.
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const topicos = await listarTopicos(projeto.id);

  return (
    <>
      <PageHeader
        titulo={projeto.nome}
        descricao="Tópicos do escopo, com comentários e anexos de cada visita."
      />

      {topicos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum tópico cadastrado.
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4 overflow-hidden">
          <ul className="divide-y divide-border">
            {topicos.map((topico) => {
              const status = STATUS_TOPICO_CONSULTORIA[topico.status];
              return (
                <li key={topico.id}>
                  <Link
                    href={`/consultoria/${topico.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-muted/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {topico.codigo ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {topico.codigo}
                          </span>
                        ) : null}
                        <span className="font-medium text-primary">{topico.titulo}</span>
                      </div>
                      {topico.descricao ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                          {topico.descricao}
                        </p>
                      ) : null}
                    </div>
                    <Badge className={`${status.cor} shrink-0`}>{status.rotulo}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <NovoTopico projetoId={projeto.id} />
    </>
  );
}
