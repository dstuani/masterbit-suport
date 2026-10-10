"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { registrarManutencaoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TIPOS_MANUTENCAO } from "@/lib/constants";
import { estadoInicial } from "@/lib/forms";

function Mensagem({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

/** Agora, no fuso do navegador, no formato do datetime-local (AAAA-MM-DDTHH:MM). */
function agoraLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function FormularioManutencao({
  equipamentoId,
  atendimentos,
}: {
  equipamentoId: string;
  atendimentos: { id: string; numero: string; titulo: string }[];
}) {
  const [estado, acao, pendente] = useActionState(registrarManutencaoAction, estadoInicial);
  const formulario = useRef<HTMLFormElement>(null);
  const erroDe = (campo: string) => estado.campos?.[campo];
  const [tipo, setTipo] = useState("corretiva");

  // Depois de gravar, o formulário volta limpo para a próxima manutenção.
  useEffect(() => {
    if (estado !== estadoInicial && !estado.erro) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={acao} onReset={() => setTipo("corretiva")} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="equipamento_id" value={equipamentoId} />

      <Campo id="tipo" rotulo="Tipo" obrigatorio className="sm:col-span-2">
        <Select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(TIPOS_MANUTENCAO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
        <Mensagem texto={erroDe("tipo")} />
      </Campo>

      {/* Só a troca de peça pede as peças; nos outros tipos os campos nem são enviados. */}
      {tipo === "troca_peca" ? (
        <>
          <Campo id="peca_retirada" rotulo="Peça retirada" dica="Ex.: SSD Kingston 240 GB">
            <Input id="peca_retirada" name="peca_retirada" maxLength={200} />
            <Mensagem texto={erroDe("peca_retirada")} />
          </Campo>
          <Campo id="peca_instalada" rotulo="Peça instalada" dica="Ex.: SSD Kingston 480 GB">
            <Input id="peca_instalada" name="peca_instalada" maxLength={200} />
            <Mensagem texto={erroDe("peca_instalada")} />
          </Campo>
        </>
      ) : null}

      <Campo id="descricao" rotulo="O que foi feito" obrigatorio className="sm:col-span-2">
        <Textarea
          id="descricao"
          name="descricao"
          rows={3}
          maxLength={4000}
          placeholder="Ex.: limpeza interna, troca da pasta térmica, formatação, troca do SSD de 240 GB por um de 480 GB."
        />
        <Mensagem texto={erroDe("descricao")} />
      </Campo>

      <Campo id="realizada_em" rotulo="Quando" obrigatorio>
        <Input id="realizada_em" name="realizada_em" type="datetime-local" defaultValue={agoraLocal()} />
        <Mensagem texto={erroDe("realizada_em")} />
      </Campo>

      <Campo id="tempo_minutos" rotulo="Tempo (minutos)">
        <Input id="tempo_minutos" name="tempo_minutos" type="number" min={0} max={10080} inputMode="numeric" />
        <Mensagem texto={erroDe("tempo_minutos")} />
      </Campo>

      <Campo id="custo" rotulo="Custo (R$)" dica="Opcional: peças ou serviço de terceiros.">
        <Input id="custo" name="custo" inputMode="decimal" placeholder="0,00" />
        <Mensagem texto={erroDe("custo")} />
      </Campo>

      <Campo id="atendimento_id" rotulo="Atendimento" dica="Opcional: o atendimento em que esta manutenção foi feita.">
        <Select id="atendimento_id" name="atendimento_id" defaultValue="">
          <option value="">Nenhum</option>
          {atendimentos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero} · {a.titulo}
            </option>
          ))}
        </Select>
        <Mensagem texto={erroDe("atendimento_id")} />
      </Campo>

      {estado.erro ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
          {estado.erro}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Registrando…" : "Registrar manutenção"}
        </Button>
      </div>
    </form>
  );
}
