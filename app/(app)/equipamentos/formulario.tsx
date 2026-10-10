"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { atualizarEquipamentoAction, criarEquipamentoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TIPOS_EQUIPAMENTO } from "@/lib/constants";
import { estadoInicial } from "@/lib/forms";
import type { Equipamento } from "@/lib/services/equipamentos";

function Mensagem({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

type Opcoes = {
  clientes: { id: string; razao_social: string }[];
  filiais: { id: string; nome: string; cliente_id: string }[];
};

export function FormularioEquipamento({
  opcoes,
  equipamento,
  clienteInicial,
}: {
  opcoes: Opcoes;
  /** Presente na edição. */
  equipamento?: Equipamento;
  clienteInicial?: string;
}) {
  const editando = Boolean(equipamento);
  const [estado, acao, pendente] = useActionState(
    editando ? atualizarEquipamentoAction : criarEquipamentoAction,
    estadoInicial,
  );
  const [clienteId, setClienteId] = useState(equipamento?.cliente_id ?? clienteInicial ?? "");
  const erroDe = (campo: string) => estado.campos?.[campo];
  const filiais = opcoes.filiais.filter((f) => f.cliente_id === clienteId);
  // Dado que veio da coleta é reescrito a cada envio do agente; editar aqui não adianta.
  const coletado = equipamento?.origem === "agente";

  return (
    <form action={acao} className="flex flex-col gap-4">
      {equipamento ? <input type="hidden" name="id" value={equipamento.id} /> : null}

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo id="cliente_id" rotulo="Cliente" obrigatorio>
            <Select
              id="cliente_id"
              name="cliente_id"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              disabled={editando}
            >
              <option value="">Selecione…</option>
              {opcoes.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razao_social}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("cliente_id")} />
          </Campo>

          <Campo id="filial_id" rotulo="Filial">
            <Select id="filial_id" name="filial_id" defaultValue={equipamento?.filial_id ?? ""} disabled={filiais.length === 0}>
              <option value="">Matriz / não informada</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("filial_id")} />
          </Campo>

          <Campo
            id="nome"
            rotulo="Nome"
            obrigatorio
            dica={coletado ? "Vem da coleta (nome do computador no Windows)." : "Ex.: CAIXA-01, NOTE-FINANCEIRO."}
          >
            <Input id="nome" name="nome" defaultValue={equipamento?.nome ?? ""} maxLength={120} readOnly={coletado} />
            <Mensagem texto={erroDe("nome")} />
          </Campo>

          <Campo id="tipo" rotulo="Tipo" obrigatorio>
            <Select id="tipo" name="tipo" defaultValue={equipamento?.tipo ?? "computador"}>
              {Object.entries(TIPOS_EQUIPAMENTO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("tipo")} />
          </Campo>

          <Campo id="patrimonio" rotulo="Patrimônio">
            <Input id="patrimonio" name="patrimonio" defaultValue={equipamento?.patrimonio ?? ""} maxLength={60} />
            <Mensagem texto={erroDe("patrimonio")} />
          </Campo>

          <Campo id="setor" rotulo="Setor / local" dica="Ex.: Recepção, Financeiro, Sala do servidor.">
            <Input id="setor" name="setor" defaultValue={equipamento?.setor ?? ""} maxLength={80} />
            <Mensagem texto={erroDe("setor")} />
          </Campo>

          <Campo
            id="numero_serie"
            rotulo="Número de série"
            dica={coletado ? "Vem da coleta." : undefined}
          >
            <Input
              id="numero_serie"
              name="numero_serie"
              defaultValue={equipamento?.numero_serie ?? ""}
              maxLength={120}
              readOnly={coletado}
            />
            <Mensagem texto={erroDe("numero_serie")} />
          </Campo>

          <Campo id="observacoes" rotulo="Observações" className="sm:col-span-2">
            <Textarea id="observacoes" name="observacoes" defaultValue={equipamento?.observacoes ?? ""} maxLength={2000} />
            <Mensagem texto={erroDe("observacoes")} />
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
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar equipamento"}
        </Button>
        <Button asChild variant="outline">
          <Link href={equipamento ? `/equipamentos/${equipamento.id}` : "/equipamentos"}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
