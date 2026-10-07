import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Disparada por notFound() nas telas de detalhe (atendimento, cliente, evento, tópico).
export default function NaoEncontrado() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold">Não encontrado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Este registro não existe ou você não tem acesso a ele. Ele pode ter sido removido.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">Ir para o início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
