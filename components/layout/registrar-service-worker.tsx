"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (public/sw.js), que só serve a tela de "sem conexão".
 * Fora de produção fica desligado: em desenvolvimento um worker ativo atrapalha o
 * hot reload e prende versões antigas do código.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sem worker o app continua funcionando; só perde a tela offline.
    });
  }, []);

  return null;
}
