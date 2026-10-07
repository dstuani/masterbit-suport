import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Endereço que não existe. Sem sessão o proxy já manda para o login antes de chegar
// aqui; quem vê esta tela é quem está logado e digitou um endereço errado.
export default function PaginaNaoEncontrada() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold">Página não encontrada</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              O endereço que você abriu não existe.
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
