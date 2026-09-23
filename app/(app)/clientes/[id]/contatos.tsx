"use client";

import { useRef, useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";

import { inativarContatoAction, reativarContatoAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contato, Filial } from "@/lib/services/clientes";
import { FormularioContato } from "./formularios";

type ContatoComFilial = Contato & { filiais: { nome: string } | null };

/**
 * Aba Contatos: tabela + formulário de adição/edição.
 *
 * Estado de qual contato está em edição fica aqui, no cliente — a lista e o
 * formulário precisam concordar sobre isso, e os dois vêm do servidor sem essa
 * informação.
 */
export function SecaoContatos({
  clienteId,
  contatos,
  filiais,
}: {
  clienteId: string;
  contatos: ContatoComFilial[];
  filiais: Filial[];
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const editando = contatos.find((c) => c.id === editandoId) ?? null;
  const formulario = useRef<HTMLDivElement>(null);

  // Clicar em "Editar" só troca um estado — sem isso, numa lista longa o
  // formulário reabre fora da tela e parece que o clique não fez nada.
  function editar(id: string) {
    setEditandoId(id);
    formulario.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        {contatos.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Cargo</th>
                  <th className="px-4 py-2.5 font-medium">E-mail</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatos.map((contato) => (
                  <tr
                    key={contato.id}
                    className={
                      contato.id === editandoId
                        ? "border-b border-border bg-primary/5 last:border-0"
                        : "border-b border-border last:border-0"
                    }
                  >
                    <td className="px-4 py-2.5 font-medium">{contato.nome}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{contato.cargo ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{contato.email ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {contato.telefone ?? contato.whatsapp ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {contato.principal ? <Badge>Principal</Badge> : null}
                        {!contato.ativo ? <Badge>Inativo</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {contato.id === editandoId ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary">
                            <Pencil className="size-3.5" />
                            Editando…
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editar(contato.id)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                        )}
                        {contato.ativo ? (
                          <BotaoExcluirContato
                            id={contato.id}
                            clienteId={clienteId}
                            nome={contato.nome}
                          />
                        ) : (
                          <BotaoReativarContato id={contato.id} clienteId={clienteId} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* div puro, não o componente Card: um alvo de scroll/ref não pode depender de
          um componente próprio encaminhar a ref corretamente. */}
      <div ref={formulario}>
        <Card className={editando ? "border-primary ring-1 ring-primary/30" : undefined}>
          <CardHeader>
            <CardTitle>{editando ? `Editar ${editando.nome}` : "Adicionar contato"}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioContato
              // Muda a key ao trocar de contato (ou para o modo de adição), o que
              // remonta o formulário — mais simples que sincronizar cada campo à mão.
              key={editando?.id ?? "novo"}
              clienteId={clienteId}
              filiais={filiais}
              contato={editando ?? undefined}
              aoCancelar={editando ? () => setEditandoId(null) : undefined}
              aoSalvarComSucesso={() => setEditandoId(null)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BotaoExcluirContato({
  id,
  clienteId,
  nome,
}: {
  id: string;
  clienteId: string;
  nome: string;
}) {
  return (
    <form
      action={inativarContatoAction}
      onSubmit={(evento) => {
        const confirmado = window.confirm(
          `Excluir o contato "${nome}"? Ele some das listas e dos formulários de atendimento, mas fica preservado nos atendimentos já registrados.`,
        );
        if (!confirmado) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        aria-label={`Excluir ${nome}`}
        className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </form>
  );
}

function BotaoReativarContato({ id, clienteId }: { id: string; clienteId: string }) {
  return (
    <form action={reativarContatoAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <Button type="submit" variant="ghost" size="sm">
        <RotateCcw className="size-3.5" />
        <span className="hidden sm:inline">Reativar</span>
      </Button>
    </form>
  );
}
