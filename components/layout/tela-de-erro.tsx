"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Corpo das telas de erro (error.tsx).
 *
 * Em produção o Next esconde a mensagem real de erros do servidor, por segurança —
 * o que chega aqui é só o `digest`, um código que casa com a linha no log do
 * servidor. Mostrar o código dá ao usuário algo concreto para informar.
 */
export function TelaDeErro({
  error,
  retry,
  destino = "/dashboard",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  destino?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertTriangle className="size-8 text-red-600 dark:text-red-400" />
          <div>
            <h1 className="text-base font-semibold">Algo deu errado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Não foi possível concluir. Tente de novo; se continuar, volte ao início e repita o
              que estava fazendo.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => retry()}>
              Tentar de novo
            </Button>
            <Button asChild variant="outline">
              <Link href={destino}>Ir para o início</Link>
            </Button>
          </div>

          {error.digest ? (
            <p className="text-xs text-muted-foreground">
              Código do erro: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
