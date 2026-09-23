"use client";

import { useTransition } from "react";

import { mudarStatusTopicoAction } from "./actions";
import { Select } from "@/components/ui/select";
import { STATUS_TOPICO_CONSULTORIA, type StatusTopicoConsultoria } from "@/lib/constants";

export function SeletorDeStatus({
  topicoId,
  statusAtual,
}: {
  topicoId: string;
  statusAtual: StatusTopicoConsultoria;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <Select
      defaultValue={statusAtual}
      disabled={pendente}
      aria-label="Status do tópico"
      className="h-8 w-44"
      onChange={(e) => {
        const dados = new FormData();
        dados.set("id", topicoId);
        dados.set("status", e.target.value);
        iniciar(() => mudarStatusTopicoAction(dados));
      }}
    >
      {Object.entries(STATUS_TOPICO_CONSULTORIA).map(([chave, info]) => (
        <option key={chave} value={chave}>
          {info.rotulo}
        </option>
      ))}
    </Select>
  );
}
