import Link from "next/link";
import { LogOut, Plus } from "lucide-react";

import { sair } from "@/app/(auth)/login/actions";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header({
  email,
  podeEditar,
  solicitacoesNovas = 0,
}: {
  email: string | null;
  podeEditar: boolean;
  solicitacoesNovas?: number;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav solicitacoesNovas={solicitacoesNovas} />
        <Logo />
      </div>
      <div className="hidden flex-1 md:block" />

      <div className="flex items-center gap-3">
        {podeEditar ? (
          <Button asChild size="sm">
            <Link href="/atendimentos/novo">
              <Plus />
              <span className="hidden sm:inline">Novo atendimento</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        ) : (
          <Badge>Somente consulta</Badge>
        )}
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {email ?? "modo de visualização"}
        </span>
        {/* Sem sessão (modo de visualização) não há o que encerrar. */}
        {email ? (
          <form action={sair}>
            <Button type="submit" variant="ghost" size="sm" aria-label="Sair" title="Sair">
              <LogOut className="size-4" />
              <span className="hidden lg:inline">Sair</span>
            </Button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
