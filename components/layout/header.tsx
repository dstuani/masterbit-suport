import Link from "next/link";
import { LogOut, Plus } from "lucide-react";

import { sair } from "@/app/(auth)/login/actions";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Papel } from "@/lib/papeis";

/** O botão principal do cabeçalho muda com o papel: cada um cria o que pode criar. */
const CRIAR: Partial<Record<Papel, { href: string; rotulo: string }>> = {
  owner: { href: "/atendimentos/novo", rotulo: "Novo atendimento" },
  tecnico: { href: "/atendimentos/novo", rotulo: "Novo atendimento" },
  solicitante: { href: "/meus-atendimentos/novo", rotulo: "Novo atendimento" },
  agenda: { href: "/agenda/novo", rotulo: "Novo evento" },
};

export function Header({
  email,
  papel,
  solicitacoesNovas = 0,
}: {
  email: string | null;
  papel: Papel | null;
  solicitacoesNovas?: number;
}) {
  const criar = papel ? CRIAR[papel] : undefined;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav papel={papel} solicitacoesNovas={solicitacoesNovas} />
        <Logo />
      </div>
      <div className="hidden flex-1 md:block" />

      <div className="flex items-center gap-3">
        {criar ? (
          <Button asChild size="sm">
            <Link href={criar.href}>
              <Plus />
              <span className="hidden sm:inline">{criar.rotulo}</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        ) : papel === "visualizador" ? (
          <Badge>Somente consulta</Badge>
        ) : null}
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
