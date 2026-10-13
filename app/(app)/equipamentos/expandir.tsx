"use client";

import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Abre ou fecha todos os blocos de cliente da lista (os <details> marcados com data-cliente). */
export function ExpandirTodos() {
  function alternar(abrir: boolean) {
    document.querySelectorAll<HTMLDetailsElement>("details[data-cliente]").forEach((d) => {
      d.open = abrir;
    });
  }

  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => alternar(true)}>
        <ChevronsUpDown />
        Expandir todos
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => alternar(false)}>
        <ChevronsDownUp />
        Recolher todos
      </Button>
    </div>
  );
}
