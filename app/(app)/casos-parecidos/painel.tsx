import Link from "next/link";
import { ExternalLink, Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CasoParecido } from "@/lib/services/similares";
import { formatarData } from "@/lib/utils";

const TAMANHO_DO_TRECHO = 320;

function trecho(texto: string) {
  return texto.length > TAMANHO_DO_TRECHO ? `${texto.slice(0, TAMANHO_DO_TRECHO).trimEnd()}…` : texto;
}

export function PainelDeParecidos({ casos }: { casos: CasoParecido[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-600 dark:text-amber-400" />
          Casos parecidos já resolvidos
          <span className="text-xs font-normal text-muted-foreground">({casos.length})</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Do mais para o menos parecido. Confira a solução aplicada antes de reaproveitar.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col">
        {casos.map((caso) => (
          <div key={caso.id} className="border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Link
                href={`/atendimentos/${caso.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {caso.titulo}
                <ExternalLink className="size-3" />
              </Link>
              {caso.mesmo_cliente ? <Badge>Mesmo cliente</Badge> : null}
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{caso.numero}</span>
              {" · "}
              {caso.cliente_nome}
              {caso.sistema_nome ? ` · ${caso.sistema_nome}` : ""}
              {caso.finalizado_em ? ` · resolvido em ${formatarData(caso.finalizado_em)}` : ""}
            </p>

            {caso.solucao ? (
              <p className="mt-1.5 whitespace-pre-wrap text-sm">
                <strong className="font-medium">Solução:</strong> {trecho(caso.solucao)}
              </p>
            ) : null}
            {caso.causa_raiz ? (
              <p className="mt-1 text-sm text-muted-foreground">
                <strong className="font-medium text-foreground">Causa raiz:</strong>{" "}
                {trecho(caso.causa_raiz)}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
