"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Paperclip, Send, X } from "lucide-react";

import {
  concluirAtendimentoAction,
  mudarStatusAction,
  prepararAnexoAction,
  registrarInteracaoAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Campo, CampoCheckbox } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_ATENDIMENTO, TIPOS_INTERACAO, type StatusAtendimento } from "@/lib/constants";
import { ACCEPT_DO_INPUT, TAMANHO_MAXIMO_BYTES, nomearArquivoDePrint } from "@/lib/anexos";
import { estadoInicial, type EstadoFormulario } from "@/lib/forms";
import { formatarTamanho } from "@/lib/utils";

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

type ArquivoPendente = { arquivo: File; preview: string | null };

/**
 * Caixa de registro, sempre visível no topo da timeline.
 *
 * É a ação mais frequente do sistema: fica sem clique de abertura, e o campo de
 * minutos vem ao lado em vez de escondido, para o tempo não ser esquecido.
 *
 * Arrastar, colar (Ctrl+V) ou clicar no clipe anexa arquivos à MESMA nota — eles
 * sobem antes do envio e entram no jsonb da interação, em vez de virar uma
 * entrada "Anexou X" separada como no card de Anexos.
 */
export function CaixaDeInteracao({ atendimentoId }: { atendimentoId: string }) {
  const [pendentes, setPendentes] = useState<ArquivoPendente[]>([]);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const pendentesRef = useRef(pendentes);

  useEffect(() => {
    pendentesRef.current = pendentes;
  }, [pendentes]);

  // Libera as pré-visualizações ao desmontar, para não vazar memória entre trocas
  // de atendimento na mesma sessão.
  useEffect(() => {
    return () => {
      for (const item of pendentesRef.current) {
        if (item.preview) URL.revokeObjectURL(item.preview);
      }
    };
  }, []);

  function adicionarArquivos(arquivos: File[]) {
    if (arquivos.length === 0) return;
    const validos: ArquivoPendente[] = [];

    for (const original of arquivos) {
      const arquivo = nomearArquivoDePrint(original);
      if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
        setErroAnexo(`${arquivo.name}: passa de 10 MB (${formatarTamanho(arquivo.size)}).`);
        continue;
      }
      validos.push({
        arquivo,
        preview: arquivo.type.startsWith("image/") ? URL.createObjectURL(arquivo) : null,
      });
    }

    if (validos.length > 0) {
      setErroAnexo(null);
      setPendentes((atual) => [...atual, ...validos]);
    }
  }

  function removerPendente(indice: number) {
    setPendentes((atual) => {
      const item = atual[indice];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return atual.filter((_, i) => i !== indice);
    });
  }

  async function enviar(formData: FormData) {
    setEnviando(true);
    setErroAnexo(null);

    const anexosEnviados: { id: string; nome: string }[] = [];
    for (const { arquivo } of pendentesRef.current) {
      const dadosAnexo = new FormData();
      dadosAnexo.set("atendimento_id", atendimentoId);
      dadosAnexo.set("arquivo", arquivo);

      const resultado = await prepararAnexoAction(dadosAnexo);
      if (resultado.erro || !resultado.anexo) {
        setErroAnexo(`${arquivo.name}: ${resultado.erro ?? "falha ao enviar"}`);
        setEnviando(false);
        return;
      }
      anexosEnviados.push(resultado.anexo);
    }

    formData.set("anexos", JSON.stringify(anexosEnviados));
    const resultado = await registrarInteracaoAction(estadoInicial, formData);
    setEnviando(false);
    setEstado(resultado);
    if (resultado.erro) return;

    for (const item of pendentesRef.current) {
      if (item.preview) URL.revokeObjectURL(item.preview);
    }
    setPendentes([]);
    form.current?.reset();
  }

  return (
    <form
      ref={form}
      action={enviar}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        adicionarArquivos(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        const arquivos = Array.from(e.clipboardData?.files ?? []);
        if (arquivos.length > 0) {
          e.preventDefault();
          adicionarArquivos(arquivos);
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <input
        ref={entrada}
        type="file"
        multiple
        accept={ACCEPT_DO_INPUT}
        className="hidden"
        onChange={(e) => {
          adicionarArquivos(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <Textarea
        name="conteudo"
        required
        placeholder="O que foi feito ou combinado… Arraste, cole (Ctrl+V) ou anexe uma imagem."
        className="min-h-24"
      />
      <Erro texto={estado.campos?.conteudo} />

      {pendentes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendentes.map((item, indice) => (
            <div
              key={indice}
              className="flex items-center gap-1.5 rounded-app border border-border bg-surface-muted py-1 pl-1.5 pr-2 text-xs"
            >
              {item.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt={item.arquivo.name} className="size-6 rounded object-cover" />
              ) : null}
              <span className="max-w-32 truncate">{item.arquivo.name}</span>
              <button
                type="button"
                onClick={() => removerPendente(indice)}
                aria-label={`Remover ${item.arquivo.name}`}
                className="text-muted-foreground hover:text-red-600"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

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

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={enviando}
          onClick={() => entrada.current?.click()}
        >
          <Paperclip className="size-3.5" />
          Anexar
        </Button>

        <Button type="submit" size="sm" disabled={enviando}>
          <Send />
          {enviando ? "Registrando…" : "Registrar"}
        </Button>

        <Erro texto={erroAnexo ?? estado.erro ?? estado.campos?.tempo_gasto_minutos} />
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
