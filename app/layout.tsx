import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { RegistrarServiceWorker } from "@/components/layout/registrar-service-worker";
import { SCRIPT_DO_TEMA } from "@/lib/tema";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Masterbit Suport",
    template: "%s · Masterbit Suport",
  },
  description: "Memória profissional do suporte técnico: atendimentos, pendências e retornos.",
  // iOS ignora parte do manifesto: estes campos fazem o app instalado abrir em tela cheia.
  appleWebApp: { capable: true, title: "Suport", statusBarStyle: "default" },
};

// Cor da barra de status do celular quando o app está instalado.
export const viewport: Viewport = { themeColor: "#c4561b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script do tema adiciona a classe "dark"/"light" ao
    // <html> antes de o React hidratar, e a diferença é intencional.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_TEMA }} />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" richColors />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
