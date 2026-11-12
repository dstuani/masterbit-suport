"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Textarea } from "@/components/ui/textarea";
import { estadoInicial, type EstadoFormulario } from "@/lib/forms";
import { salvarConfigRustdeskAction } from "./actions";

export function FormularioServidorRustdesk({ atual }: { atual: string | null }) {
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [pendente, setPendente] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPendente(true);
        const resultado = await salvarConfigRustdeskAction(estadoInicial, formData);
        setPendente(false);
        setEstado(resultado);
        if (resultado.erro) toast.error(resultado.erro);
        else toast.success("Servidor RustDesk salvo.");
      }}
      className="flex flex-col gap-3"
    >
      <Campo
        id="rustdesk_config"
        rotulo="Configuração do servidor"
        obrigatorio
        dica="No RustDesk de um computador já ligado ao seu servidor: menu ao lado do ID → Rede → desbloquear → Exportar configuração do servidor. Cole aqui o texto copiado."
      >
        <Textarea
          id="rustdesk_config"
          name="rustdesk_config"
          defaultValue={atual ?? ""}
          rows={3}
          required
          spellCheck={false}
          autoComplete="off"
          className="font-mono text-xs"
          aria-invalid={estado.campos?.rustdesk_config ? true : undefined}
        />
        {estado.campos?.rustdesk_config ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {estado.campos.rustdesk_config}
          </p>
        ) : null}
      </Campo>
      <div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar servidor"}
        </Button>
      </div>
    </form>
  );
}
