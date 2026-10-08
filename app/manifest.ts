import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masterbit Suport",
    short_name: "Suport",
    description: "Memória profissional do suporte técnico: atendimentos, pendências e retornos.",
    lang: "pt-BR",
    // Abre direto no painel; quem não tem sessão é levado ao login pelo proxy.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#c4561b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novo atendimento", url: "/atendimentos/novo" },
      { name: "Agenda", url: "/agenda" },
      { name: "Solicitações", url: "/solicitacoes" },
    ],
  };
}
