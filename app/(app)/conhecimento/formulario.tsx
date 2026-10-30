"use client";

import { useActionState } from "react";
import Link from "next/link";

import { atualizarConhecimentoAction, criarConhecimentoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial } from "@/lib/forms";
import type { Conhecimento } from "@/lib/services/conhecimento";

function Mensagem({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

type Opcoes = {
  sistemas: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
};

export function FormularioConhecimento({ opcoes, item }: { opcoes: Opcoes; item?: Conhecimento }) {
  const editando = Boolean(item);
  const [estado, acao, pendente] = useActionState(
    editando ? atualizarConhecimentoAction : criarConhecimentoAction,
    estadoInicial,
  );
  const erroDe = (campo: string) => estado.campos?.[campo];

  return (
    <form action={acao} className="flex flex-col gap-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo id="titulo" rotulo="Título" obrigatorio className="sm:col-span-2">
            <Input id="titulo" name="titulo" defaultValue={item?.titulo ?? ""} maxLength={160} />
            <Mensagem texto={erroDe("titulo")} />
          </Campo>

          <Campo id="sistema_id" rotulo="Sistema">
            <Select id="sistema_id" name="sistema_id" defaultValue={item?.sistema_id ?? ""}>
              <option value="">Nenhum</option>
              {opcoes.sistemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("sistema_id")} />
          </Campo>

          <Campo id="categoria_id" rotulo="Categoria">
            <Select id="categoria_id" name="categoria_id" defaultValue={item?.categoria_id ?? ""}>
              <option value="">Nenhuma</option>
              {opcoes.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("categoria_id")} />
          </Campo>

          <Campo
            id="descricao"
            rotulo="Descrição"
            obrigatorio
            dica="Escreva com as palavras que você buscaria depois: o que o comando faz, a tabela, o sintoma."
            className="sm:col-span-2"
          >
            <Textarea id="descricao" name="descricao" rows={4} defaultValue={item?.descricao ?? ""} maxLength={4000} />
            <Mensagem texto={erroDe("descricao")} />
          </Campo>

          <Campo id="comando" rotulo="Comando SQL" obrigatorio className="sm:col-span-2">
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
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar comando"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/conhecimento">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
