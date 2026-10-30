"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { atualizarConhecimentoAction, criarConhecimentoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";
import type { TipoConhecimento } from "@/lib/schemas/conhecimento";
import type { Conhecimento } from "@/lib/services/conhecimento";

function Mensagem({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

export function FormularioConhecimento({
  item,
  tipoInicial,
}: {
  item?: Conhecimento;
  tipoInicial?: TipoConhecimento;
}) {
  const editando = Boolean(item);
  const [estado, acao, pendente] = useActionState(
    editando ? atualizarConhecimentoAction : criarConhecimentoAction,
    estadoInicial,
  );
  const [tipo, setTipo] = useState(item?.tipo ?? tipoInicial ?? "");
  const erroDe = (campo: string) => estado.campos?.[campo];

  return (
    <form action={acao} className="flex flex-col gap-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo id="tipo" rotulo="Sessão" obrigatorio className="sm:col-span-2">
            <Select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Selecione…</option>
              <option value="configuracao">Configurações</option>
              <option value="select">Select</option>
            </Select>
            <Mensagem texto={erroDe("tipo")} />
          </Campo>

          <Campo id="titulo" rotulo="Título" obrigatorio className="sm:col-span-2">
            <Input id="titulo" name="titulo" defaultValue={item?.titulo ?? ""} maxLength={160} />
            <Mensagem texto={erroDe("titulo")} />
          </Campo>

          <Campo id="comando" rotulo={tipo === "configuracao" ? "Configuração" : "Comando SQL"} obrigatorio className="sm:col-span-2">
            <Textarea
              id="comando"
              name="comando"
              rows={10}
              defaultValue={item?.comando ?? ""}
              maxLength={20000}
              spellCheck={false}
              className="font-mono text-xs"
            />
            <Mensagem texto={erroDe("comando")} />
          </Campo>
        </CardContent>
      </Card>

      {estado.erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Incluir"}
        </Button>
        <Button asChild variant="outline">
          <Link href={tipo ? `/conhecimento?tipo=${tipo}` : "/conhecimento"}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
