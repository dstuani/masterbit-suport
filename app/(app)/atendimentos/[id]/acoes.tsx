"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { concluirAtendimentoAction, mudarStatusAction, registrarInteracaoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo, CampoCheckbox } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_ATENDIMENTO, TIPOS_INTERACAO, type StatusAtendimento } from "@/lib/constants";
import { estadoInicial } from "@/lib/forms";

function Erro({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

/** Tipos de interação que o usuário registra à mão — os de sistema não entram. */
const TIPOS_MANUAIS = ["nota", "ligacao", "email", "whatsapp", "acesso_remoto", "visita"] as const;

/**
 * Caixa de registro, sempre visível no topo da timeline.
 *
 * É a ação mais frequente do sistema: fica sem clique de abertura, e o campo de
 * minutos vem ao lado em vez de escondido, para o tempo não ser esquecido.
 */
export function CaixaDeInteracao({ atendimentoId }: { atendimentoId: string }) {
  const [estado, acao, pendente] = useActionState(registrarInteracaoAction, estadoInicial);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (formData) => {
        await acao(formData);
        form.current?.reset();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="atendimento_id" value={atendimentoId} />

      <Textarea
        name="conteudo"
        required
        placeholder="O que foi feito ou combinado…"
        className="min-h-24"
      />
      <Erro texto={estado.campos?.conteudo} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select name="tipo" defaultValue="nota" aria-label="Tipo de registro">
            {TIPOS_MANUAIS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPOS_INTERACAO[tipo]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-32">
          <Input
            name="tempo_gasto_minutos"
            inputMode="numeric"
            placeholder="minutos"
            aria-label="Tempo gasto em minutos"
          />
        </div>

        <Button type="submit" size="sm" disabled={pendente}>
          <Send />
          {pendente ? "Registrando…" : "Registrar"}
        </Button>

        <Erro texto={estado.erro ?? estado.campos?.tempo_gasto_minutos} />
      </div>
    </form>
  );
}

/**
 * Troca de status.
 *
 * Os estados de espera abrem um campo obrigatório dizendo o que se aguarda — é o
 * que evita o atendimento virar limbo e permite cobrar depois.
 */
export function TrocaDeStatus({
  atendimentoId,
  statusAtual,
  aguardandoOQue,
}: {
  atendimentoId: string;
  statusAtual: StatusAtendimento;
  aguardandoOQue: string | null;
}) {
  const [estado, acao, pendente] = useActionState(mudarStatusAction, estadoInicial);
  const [status, setStatus] = useState<StatusAtendimento>(statusAtual);

  const esperando = status === "aguardando_cliente" || status === "aguardando_terceiro";
  const selecionavel = (Object.keys(STATUS_ATENDIMENTO) as StatusAtendimento[]).filter(
    (chave) => chave !== "resolvido",
  );

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="atendimento_id" value={atendimentoId} />

      <Campo id="status" rotulo="Status">
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusAtendimento)}
        >
          {selecionavel.map((chave) => (
            <option key={chave} value={chave}>
              {STATUS_ATENDIMENTO[chave].rotulo}
            </option>
          ))}
        </Select>
      </Campo>

      {esperando ? (
        <Campo id="aguardando_o_que" rotulo="Aguardando o quê" obrigatorio>
          <Input
            id="aguardando_o_que"
            name="aguardando_o_que"
            defaultValue={aguardandoOQue ?? ""}
            placeholder="Ex.: cliente enviar o XML da nota"
          />
          <Erro texto={estado.campos?.aguardando_o_que} />
        </Campo>
      ) : null}

      <Campo id="observacao" rotulo="Observação" dica="Opcional; vira uma nota na timeline.">
        <Input id="observacao" name="observacao" />
      </Campo>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pendente || status === statusAtual}>
          {pendente ? "Aplicando…" : "Aplicar status"}
        </Button>
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}

/**
 * Conclusão.
 *
 * A solução é exigida aqui e pela constraint no banco. Sem ela o atendimento não
 * vira memória consultável — só o registro de que algo aconteceu.
 */
export function Conclusao({ atendimentoId }: { atendimentoId: string }) {
  const [estado, acao, pendente] = useActionState(concluirAtendimentoAction, estadoInicial);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <Button size="sm" onClick={() => setAberto(true)}>
        <CheckCircle2 />
        Resolver atendimento
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolver atendimento</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={acao} className="flex flex-col gap-3">
          <input type="hidden" name="atendimento_id" value={atendimentoId} />

          <Campo
            id="solucao"
            rotulo="Solução"
            obrigatorio
            dica="O que resolveu. É isto que você vai reler daqui a seis meses."
          >
            <Textarea id="solucao" name="solucao" required className="min-h-24" />
            <Erro texto={estado.campos?.solucao} />
          </Campo>

          <Campo id="causa_raiz" rotulo="Causa raiz" dica="Por que aconteceu. Opcional.">
            <Input id="causa_raiz" name="causa_raiz" />
          </Campo>

          <Campo id="tempo_final" rotulo="Tempo do fechamento (minutos)">
            <Input id="tempo_final" name="tempo_gasto_minutos" inputMode="numeric" />
            <Erro texto={estado.campos?.tempo_gasto_minutos} />
          </Campo>

          <CampoCheckbox id="faturavel" name="faturavel" rotulo="Atendimento faturável" />

          <Erro texto={estado.erro} />

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pendente}>
              {pendente ? "Resolvendo…" : "Confirmar resolução"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
