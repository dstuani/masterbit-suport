"use client";

import { Trash2 } from "lucide-react";

import { inativarClienteAction } from "../actions";
import { Button } from "@/components/ui/button";

export function BotaoExcluirCliente({ clienteId, nome }: { clienteId: string; nome: string }) {
  return (
    <form
      action={inativarClienteAction}
      onSubmit={(evento) => {
        const confirmado = window.confirm(
          `Excluir "${nome}"?\n\nO cadastro e o histórico de atendimentos são mantidos — o cliente só sai das listas e buscas ativas. Para reverter, volte aqui e mude o Status de volta para Ativo.`,
        );
        if (!confirmado) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={clienteId} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 />
        Excluir cliente
      </Button>
    </form>
  );
}
