"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

// O evento não está nos tipos do DOM porque só existe em navegadores baseados no Chrome.
type EventoDeInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstalarApp() {
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Lê o ambiente do navegador depois da hidratação: no servidor não há window.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalado(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const antes = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoDeInstalacao);
    };
    const depois = () => {
      setEvento(null);
      setInstalado(true);
    };
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => {
      window.removeEventListener("beforeinstallprompt", antes);
      window.removeEventListener("appinstalled", depois);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  if (instalado) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="size-4" />
        Você já está usando o aplicativo instalado.
      </p>
    );
  }

  if (evento) {
    return (
      <Button type="button" onClick={instalar}>
        <Download />
        Instalar aplicativo
      </Button>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {ios
        ? "No iPhone, abra este endereço no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”."
        : "No Chrome, abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Se a opção não aparecer, o navegador pode não oferecer instalação para este endereço."}
    </p>
  );
}
