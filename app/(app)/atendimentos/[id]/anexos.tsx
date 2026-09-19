"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Paperclip, Trash2 } from "lucide-react";

import { enviarAnexoAction, removerAnexoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { ACCEPT_DO_INPUT, TAMANHO_MAXIMO_BYTES } from "@/lib/anexos";
import { formatarTamanho } from "@/lib/utils";

function Erro({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

/** Print colado do clipboard chega como "image.png"; um nome com data ajuda a achar depois. */
function nomearPrint(arquivo: File): File {
  if (arquivo.name && arquivo.name !== "image.png") return arquivo;
  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const carimbo = `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(agora.getHours())}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`;
  const extensao = arquivo.type === "image/jpeg" ? "jpg" : "png";
  return new File([arquivo], `print-${carimbo}.${extensao}`, { type: arquivo.type });
}

/**
 * Envio de anexos: botão, arrastar e soltar, e Ctrl+V para prints.
 *
 * Cada arquivo vai numa chamada própria — o limite de 10 MB vale por arquivo, e
 * uma falha não derruba os outros.
 */
export function EnviarAnexos({ atendimentoId }: { atendimentoId: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [arrastando, setArrastando] = useState(false);

  function enviar(arquivos: File[]) {
    if (arquivos.length === 0) return;
    setErros([]);

    iniciar(async () => {
      const falhas: string[] = [];

      for (const original of arquivos) {
        const arquivo = nomearPrint(original);
        if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
          falhas.push(`${arquivo.name}: passa de 10 MB (${formatarTamanho(arquivo.size)}).`);
          continue;
        }

        setEnviando(arquivo.name);
        const dados = new FormData();
        dados.set("atendimento_id", atendimentoId);
        dados.set("arquivo", arquivo);

        try {
          const resultado = await enviarAnexoAction(dados);
          if (resultado.erro) falhas.push(`${arquivo.name}: ${resultado.erro}`);
        } catch {
          falhas.push(`${arquivo.name}: falha de conexão ou arquivo grande demais.`);
        }
      }

      setEnviando(null);
      setErros(falhas);
    });
  }

  // Ctrl+V com imagem na área de transferência anexa o print, esteja o foco onde
  // estiver. Texto colado não é interceptado.
  useEffect(() => {
    function aoColar(evento: ClipboardEvent) {
      const arquivos = Array.from(evento.clipboardData?.files ?? []);
      if (arquivos.length === 0) return;
      evento.preventDefault();
      enviar(arquivos);
    }

    window.addEventListener("paste", aoColar);
    return () => window.removeEventListener("paste", aoColar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendimentoId]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        enviar(Array.from(e.dataTransfer.files));
      }}
      className={
        arrastando
          ? "rounded-app border border-dashed border-primary bg-primary/5 p-3"
          : "rounded-app border border-dashed border-border p-3"
      }
    >
      <input
        ref={entrada}
        type="file"
        multiple
        accept={ACCEPT_DO_INPUT}
        className="hidden"
        onChange={(e) => {
          enviar(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pendente}
          onClick={() => entrada.current?.click()}
        >
          <Paperclip className="size-3.5" />
          {pendente ? "Enviando…" : "Anexar arquivo"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {enviando
            ? `Enviando ${enviando}…`
            : "Ou arraste aqui, ou cole um print com Ctrl+V. Até 10 MB por arquivo."}
        </p>
        {erros.map((erro) => (
          <Erro key={erro} texto={erro} />
        ))}
      </div>
    </div>
  );
}

export function RemoverAnexo({ anexoId, nome }: { anexoId: string; nome: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function remover() {
    if (!window.confirm(`Remover o anexo "${nome}"?`)) return;
    setErro(null);

    iniciar(async () => {
      const dados = new FormData();
      dados.set("anexo_id", anexoId);
      const resultado = await removerAnexoAction(dados);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={remover}
        disabled={pendente}
        aria-label={`Remover ${nome}`}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
      <Erro texto={erro} />
    </>
  );
}
