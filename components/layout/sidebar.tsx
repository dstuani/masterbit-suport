"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { NAVEGACAO } from "@/components/layout/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Logo />
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
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
