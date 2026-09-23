"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRIORIDADES, STATUS_ATENDIMENTO } from "@/lib/constants";

type Valores = {
  busca: string;
  status: string;
  prioridade: string;
  cliente: string;
  categoria: string;
  responsavel: string;
};

/** Filtros da lista. O estado vive na URL — compartilhável e resistente a refresh. */
export function FiltrosAtendimentos({
  valores,
  clientes,
  categorias,
  responsaveis,
}: {
  valores: Valores;
  clientes: { id: string; razao_social: string }[];
  categorias: { id: string; nome: string }[];
  responsaveis: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function aplicar(campo: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    // URL vazia = lista aberta pelo menu, que já está filtrada por "Em aberto".
    // Ao mexer em outro filtro, o status precisa ficar explícito na URL; sem isso
    // ele sumiria e a lista passaria a mostrar tudo.
    if (searchParams.size === 0 && campo !== "status") params.set("status", "abertos");
    if (valor) {
      params.set(campo, valor);
    } else {
      params.delete(campo);
    }
    // Qualquer mudança de filtro volta para a primeira página: manter a página 3
    // de um resultado que agora tem uma página só mostraria uma lista vazia.
    params.delete("pagina");

    iniciarTransicao(() => {
      router.replace(params.size > 0 ? `/atendimentos?${params}` : "/atendimentos");
    });
  }

  // "Em aberto" é o padrão da lista, não um filtro que o usuário precise limpar.
  const temFiltro = Object.entries(valores).some(
    ([campo, valor]) => valor && !(campo === "status" && valor === "abertos"),
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" data-pendente={pendente}>
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={valores.busca}
          placeholder="Buscar por número, assunto, cliente ou histórico…"
          className="pl-8"
          onChange={(e) => {
            const valor = e.target.value;
            if (temporizador.current) clearTimeout(temporizador.current);
            temporizador.current = setTimeout(() => aplicar("busca", valor), 350);
          }}
        />
      </div>

      <Select
        defaultValue={valores.status}
        className="w-44"
        aria-label="Filtrar por status"
        onChange={(e) => aplicar("status", e.target.value)}
      >
        <option value="todos">Todos os status</option>
        <option value="abertos">Em aberto</option>
        <option value="aguardando">Aguardando (cliente ou terceiro)</option>
        {Object.entries(STATUS_ATENDIMENTO).map(([chave, info]) => (
          <option key={chave} value={chave}>
            {info.rotulo}
          </option>
        ))}
      </Select>

      <Select
        defaultValue={valores.prioridade}
        className="w-36"
        aria-label="Filtrar por prioridade"
        onChange={(e) => aplicar("prioridade", e.target.value)}
      >
        <option value="">Prioridade</option>
        {Object.entries(PRIORIDADES).map(([chave, info]) => (
          <option key={chave} value={chave}>
            {info.rotulo}
          </option>
        ))}
      </Select>

      <Select
        defaultValue={valores.cliente}
        className="w-48"
        aria-label="Filtrar por cliente"
        onChange={(e) => aplicar("cliente", e.target.value)}
      >
        <option value="">Todos os clientes</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.razao_social}
          </option>
        ))}
      </Select>

      <Select
        defaultValue={valores.categoria}
        className="w-40"
        aria-label="Filtrar por categoria"
        onChange={(e) => aplicar("categoria", e.target.value)}
      >
        <option value="">Categoria</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </option>
        ))}
      </Select>

      {responsaveis.length > 1 ? (
        <Select
          defaultValue={valores.responsavel}
          className="w-40"
          aria-label="Filtrar por responsável"
          onChange={(e) => aplicar("responsavel", e.target.value)}
        >
          <option value="">Responsável</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </Select>
      ) : null}

      {temFiltro ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => iniciarTransicao(() => router.replace("/atendimentos"))}
        >
          <X />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
