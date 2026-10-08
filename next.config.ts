import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // O navegador precisa rever o service worker a cada visita, senão uma versão
        // antiga ficaria presa nos aparelhos.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  experimental: {
    // Anexos de até 10 MB chegam por Server Action; o padrão do Next é 1 MB.
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
