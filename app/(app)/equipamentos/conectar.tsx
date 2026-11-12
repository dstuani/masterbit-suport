"use client";

import { Copy, KeyRound, MonitorPlay } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatarIdRustdesk, linkRustdesk } from "@/lib/rustdesk";

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("Não foi possível copiar. Selecione e copie à mão.");
  }
}

export function ConectarRustdesk({ rustdeskId, senha }: { rustdeskId: string; senha: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-muted-foreground">ID do RustDesk</p>
        <p className="font-mono text-lg font-medium tabular-nums select-all">{formatarIdRustdesk(rustdeskId)}</p>
      </div>
      <Button asChild>
        <a href={linkRustdesk(rustdeskId)}>
          <MonitorPlay />
          Conectar
        </a>
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => copiar(rustdeskId, "ID copiado.")}>
          <Copy />
          Copiar ID
        </Button>
        {senha ? (
          <Button type="button" size="sm" variant="outline" onClick={() => copiar(senha, "Senha copiada.")}>
            <KeyRound />
            Copiar senha
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {senha
          ? "Conectar abre o RustDesk deste computador; cole a senha quando ele pedir."
          : "Conectar abre o RustDesk deste computador. Este cliente não tem senha cadastrada: a conexão depende de alguém aceitar na outra ponta."}
      </p>
    </div>
  );
}
