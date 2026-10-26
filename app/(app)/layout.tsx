import { headers } from "next/headers";

import { supabaseConfigurado } from "@/lib/env";
import { desviarSeForaDoPapel, exigirUsuario, obterPerfil } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { contarSolicitacoesNovas } from "@/lib/services/solicitacoes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await exigirUsuario();
  await desviarSeForaDoPapel((await headers()).get("x-caminho"));
  const perfil = await obterPerfil();
  // Modo de visualização (sem Supabase) mostra o shell como owner.
  const papel = perfil?.role ?? (supabaseConfigurado ? null : "owner");
  const solicitacoesNovas =
    supabaseConfigurado && (papel === "owner" || papel === "tecnico" || papel === "visualizador")
      ? await contarSolicitacoesNovas()
      : 0;

  return (
    <div className="flex h-dvh">
      <Sidebar papel={papel} solicitacoesNovas={solicitacoesNovas} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header email={user?.email ?? null} papel={papel} solicitacoesNovas={solicitacoesNovas} />
        {!supabaseConfigurado ? (
          <div className="border-b border-amber-300 bg-amber-50 px-5 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Supabase não configurado — modo de visualização. Preencha{" "}
            <code className="font-mono">.env.local</code> para ativar login e banco de dados.
          </div>
        ) : null}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
