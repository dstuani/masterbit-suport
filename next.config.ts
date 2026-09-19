import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Anexos de até 10 MB chegam por Server Action; o padrão do Next é 1 MB.
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
