import Link from "next/link";
import { Plus } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

export function Header({ email }: { email: string | null }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav />
        <Logo />
      </div>
      <div className="hidden flex-1 md:block" />

      <div className="flex items-center gap-3">
        <Button asChild size="sm">
          <Link href="/atendimentos/novo">
            <Plus />
            <span className="hidden sm:inline">Novo atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Link>
        </Button>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {email ?? "modo de visualização"}
        </span>
      </div>
    </header>
  );
}
