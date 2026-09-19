import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { supabaseConfigurado } from "@/lib/env";
import { obterCliente } from "@/lib/services/clientes";
import { Importador } from "./importador";

export const metadata = { title: "Importar contatos" };

export default async function ImportarContatosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Importar contatos" />
        <AvisoSupabase />
      </>
    );
  }

  const cliente = await obterCliente(id);
  if (!cliente) notFound();

  return (
    <>
      <Link
        href={`/clientes/${id}?aba=contatos`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {cliente.razao_social}
      </Link>

      <PageHeader
        titulo="Importar contatos"
        descricao="Cadastre em lote os usuários da empresa a partir de uma planilha."
      />

      <Importador clienteId={id} clienteNome={cliente.razao_social} />
    </>
  );
}
