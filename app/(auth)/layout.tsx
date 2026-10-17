import Image from "next/image";

/** Tela dividida: painel da marca (cor fixa, igual nos dois temas) e, ao lado, o formulário da vez. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-[#0e1a2b] p-12 text-white lg:flex">
        <div>
          <Image src="/masterbit-logo.png" alt="Masterbit" width={217} height={80} priority />
          <p className="mt-1 pl-1 text-sm text-slate-300">Suport</p>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Atendimentos, pendências e equipamentos num só lugar.
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Registre cada atendimento, programe retornos e consulte como resolveu da última vez.
          </p>
        </div>

        <p className="text-xs text-slate-500">Acesso restrito a usuários autorizados.</p>
      </aside>

      <main className="flex items-center justify-center bg-background p-6">{children}</main>
    </div>
  );
}
