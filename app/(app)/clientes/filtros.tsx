"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Filtros da lista. O estado vive na URL, não em useState: assim o filtro
 * sobrevive ao refresh, volta pelo botão do navegador e pode ser compartilhado.
 */
export function FiltrosClientes({ busca, status }: { busca: string; status: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancela um debounce pendente ao desmontar, para não navegar depois de sair.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function aplicar(campo: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(campo, valor);
    } else {
      params.delete(campo);
    }
    iniciarTransicao(() => {
      router.replace(params.size > 0 ? `/clientes?${params}` : "/clientes");
    });
  }

  return (
    <form
      className="mb-4 flex flex-wrap items-center gap-2"
      onSubmit={(e) => e.preventDefault()}
      data-pendente={pendente}
    >
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome, CNPJ ou cidade…"
          className="pl-8"
          onChange={(e) => {
            // Debounce: sem isso cada tecla dispararia uma navegação e uma query.
            const valor = e.target.value;
            if (temporizador.current) clearTimeout(temporizador.current);
            temporizador.current = setTimeout(() => aplicar("busca", valor), 350);
          }}
        />
      </div>

      <Select
        name="status"
        defaultValue={status}
        className="w-40"
        onChange={(e) => aplicar("status", e.target.value)}
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="prospect">Prospect</option>
        <option value="inativo">Inativo</option>
      </Select>
    </form>
  );
}
