"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRIORIDADES, STATUS_ATENDIMENTO, TIPOS_ATENDIMENTO } from "@/lib/constants";

type Valores = {
  busca: string;
  status: string;
  prioridade: string;
  clienteId: string;
  categoriaId: string;
  sistemaId: string;
  tipo: string;
  de: string;
  ate: string;
};

type Opcoes = {
  clientes: { id: string; razao_social: string }[];
  categorias: { id: string; nome: string }[];
  sistemas: { id: string; nome: string }[];
};

export function FiltrosConsulta({
  valores,
  opcoes,
}: {
  valores: Valores;
  opcoes: Opcoes;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, iniciarTransicao] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    params.delete("pagina");
    iniciarTransicao(() => {
      router.replace(params.size > 0 ? `/consultas?${params}` : "/consultas");
    });
  }

  const temFiltro = Object.values(valores).some(Boolean);

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Linha 1: busca principal */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={valores.busca}
          placeholder="Buscar em títulos, descrições e soluções…"
          className="pl-8 text-base"
          onChange={(e) => {
            const v = e.target.value;
            if (temporizador.current) clearTimeout(temporizador.current);
            temporizador.current = setTimeout(() => aplicar("busca", v), 400);
          }}
        />
      </div>

      {/* Linha 2: filtros combinados */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          defaultValue={valores.status}
          className="w-44"
          aria-label="Status"
          onChange={(e) => aplicar("status", e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_ATENDIMENTO).map(([chave, info]) => (
            <option key={chave} value={chave}>{info.rotulo}</option>
          ))}
        </Select>

        <Select
          defaultValue={valores.prioridade}
          className="w-36"
          aria-label="Prioridade"
          onChange={(e) => aplicar("prioridade", e.target.value)}
        >
          <option value="">Prioridade</option>
          {Object.entries(PRIORIDADES).map(([chave, info]) => (
            <option key={chave} value={chave}>{info.rotulo}</option>
          ))}
        </Select>

        <Select
          defaultValue={valores.tipo}
          className="w-36"
          aria-label="Tipo"
          onChange={(e) => aplicar("tipo", e.target.value)}
        >
          <option value="">Tipo</option>
          {Object.entries(TIPOS_ATENDIMENTO).map(([chave, rotulo]) => (
            <option key={chave} value={chave}>{rotulo}</option>
          ))}
        </Select>

        <Select
          defaultValue={valores.clienteId}
          className="w-48"
          aria-label="Cliente"
          onChange={(e) => aplicar("clienteId", e.target.value)}
        >
          <option value="">Todos os clientes</option>
          {opcoes.clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.razao_social}</option>
          ))}
        </Select>

        <Select
          defaultValue={valores.categoriaId}
          className="w-40"
          aria-label="Categoria"
          onChange={(e) => aplicar("categoriaId", e.target.value)}
        >
          <option value="">Categoria</option>
          {opcoes.categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Select>

        <Select
          defaultValue={valores.sistemaId}
          className="w-40"
          aria-label="Sistema"
          onChange={(e) => aplicar("sistemaId", e.target.value)}
        >
          <option value="">Sistema</option>
          {opcoes.sistemas.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </Select>
      </div>

      {/* Linha 3: período */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Período:</span>
        <Input
          type="date"
          defaultValue={valores.de}
          className="w-40"
          aria-label="Data inicial"
          onChange={(e) => aplicar("de", e.target.value)}
        />
        <span className="text-muted-foreground">até</span>
        <Input
          type="date"
          defaultValue={valores.ate}
          className="w-40"
          aria-label="Data final"
          onChange={(e) => aplicar("ate", e.target.value)}
        />

        {temFiltro ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => iniciarTransicao(() => router.replace("/consultas"))}
          >
            <X className="size-3.5" />
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
