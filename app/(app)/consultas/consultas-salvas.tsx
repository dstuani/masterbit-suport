"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConsultaSalva = {
  id: string;
  nome: string;
  url: string;
  salvaEm: string;
};

const CHAVE = "supportdesk:consultas-salvas";

const EVENTO = "supportdesk:consultas-salvas-mudou";

function lerBruto(): string {
  try {
    return localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function salvar(lista: ConsultaSalva[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // Ignora erros de localStorage (modo privado, limite de espaço)
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function ConsultasSalvas({ urlAtual }: { urlAtual: string }) {
  const router = useRouter();
  // O snapshot do servidor é "": localStorage só existe no cliente.
  const bruto = useSyncExternalStore(assinar, lerBruto, () => "");
  const lista = useMemo<ConsultaSalva[]>(() => {
    try {
      return bruto ? (JSON.parse(bruto) as ConsultaSalva[]) : [];
    } catch {
      return [];
    }
  }, [bruto]);
  const [nome, setNome] = useState("");
  const [aberto, setAberto] = useState(false);

  const temFiltros = urlAtual.includes("?");
  const jaSalva = lista.some((c) => c.url === urlAtual);

  function adicionarConsulta() {
    if (!nome.trim() || !temFiltros) return;
    const nova: ConsultaSalva = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      url: urlAtual,
      salvaEm: new Date().toISOString(),
    };
    salvar([nova, ...lista].slice(0, 10)); // máx 10
    setNome("");
    setAberto(false);
  }

  function remover(id: string) {
    salvar(lista.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Botão salvar consulta atual */}
      {temFiltros && !jaSalva ? (
        aberto ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Nome desta busca…"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionarConsulta();
                if (e.key === "Escape") setAberto(false);
              }}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={adicionarConsulta} disabled={!nome.trim()}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
              ×
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
            <Bookmark className="size-3.5" />
            Salvar esta busca
          </Button>
        )
      ) : jaSalva ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookmarkCheck className="size-3.5" />
          Busca salva
        </span>
      ) : null}

      {/* Lista de consultas salvas */}
      {lista.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {lista.map((consulta) => (
            <div key={consulta.id} className="flex items-center gap-0.5">
              <button
                onClick={() => router.push(consulta.url)}
                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-surface-muted transition-colors"
              >
                <Bookmark className="size-3 text-muted-foreground" />
                {consulta.nome}
              </button>
              <button
                onClick={() => remover(consulta.id)}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remover ${consulta.nome}`}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
