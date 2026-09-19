import { supabaseConfigurado } from "@/lib/env";
import { exigirUsuario } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await exigirUsuario();

  return (
    <div className="flex h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header email={user?.email ?? null} />
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
