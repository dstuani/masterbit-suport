import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_ATENDIMENTO } from "@/lib/constants";
import { supabaseConfigurado } from "@/lib/env";
import { listarMeusAtendimentos } from "@/lib/services/meus-atendimentos";
import { formatarRelativo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus atendimentos" };

export default async function MeusAtendimentosPage() {
  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Meus atendimentos" />
        <AvisoSupabase />
      </>
    );
  }

  const atendimentos = await listarMeusAtendimentos();

  return (
    <>
      <PageHeader
        titulo="Meus atendimentos"
        descricao="Os pedidos que você abriu e em que pé está cada um."
        acoes={
          <Button asChild size="sm">
            <Link href="/meus-atendimentos/novo">
              <Plus />
              Novo atendimento
            </Link>
          </Button>
        }
      />

      {atendimentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Abra seu primeiro atendimento</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Conte o que está acontecendo. Você acompanha a resposta por aqui.
            </p>
            <Button asChild size="sm">
              <Link href="/meus-atendimentos/novo">Novo atendimento</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Assunto</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Situação</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {atendimentos.map((a) => {
                  const status = STATUS_ATENDIMENTO[a.status];
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/meus-atendimentos/${a.id}`} className="font-medium text-primary hover:underline">
                          {a.titulo}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.numero}
                          {/* Celular: a situação vem junto do número. */}
                          <span className="sm:hidden"> · {status.rotulo}</span>
                        </p>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        <Badge className={status.cor}>{status.rotulo}</Badge>
                      </td>
                      <td className="hidden px-4 py-2.5 whitespace-nowrap text-muted-foreground md:table-cell">
                        {formatarRelativo(a.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
