"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { NAVEGACAO } from "@/components/layout/nav";
import { cn } from "@/lib/utils";

/** Navegação para telas estreitas, onde a sidebar fica oculta. */
export function MobileNav() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger
        aria-label="Abrir menu"
        className="inline-flex size-9 items-center justify-center rounded-app text-muted-foreground hover:bg-surface-muted hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface md:hidden">
          <Dialog.Title className="sr-only">Navegação</Dialog.Title>

          <div className="flex h-14 items-center justify-between border-b border-border px-5">
            <Logo />
            <Dialog.Close
              aria-label="Fechar menu"
              className="inline-flex size-8 items-center justify-center rounded-app text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            {NAVEGACAO.map((grupo) => (
              <div key={grupo.secao} className="mb-5">
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {grupo.secao}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {grupo.itens.map((item) => {
                    const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Dialog.Close asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-app px-2.5 py-2 text-sm transition-colors",
                              ativo
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                            )}
                          >
                            <item.icone className="size-4 shrink-0" />
                            {item.titulo}
                          </Link>
                        </Dialog.Close>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
