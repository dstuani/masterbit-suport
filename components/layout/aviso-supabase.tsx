import { Card, CardContent } from "@/components/ui/card";

/** Estado vazio das telas que dependem do banco antes de o Supabase existir. */
export function AvisoSupabase() {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium">Banco de dados não conectado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta tela lê e grava no Supabase. Para ativá-la, crie um projeto em supabase.com,
          copie a URL e a chave <code className="font-mono">anon</code> de Project Settings →
          API para o arquivo <code className="font-mono">.env.local</code> e rode as migrations
          com <code className="font-mono">npm run db:push</code>.
        </p>
      </CardContent>
    </Card>
  );
}
