import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { supabaseConfigurado } from "@/lib/env";
import { obterCliente } from "@/lib/services/clientes";
import { FormularioCliente } from "../../formulario-cliente";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Editar cliente" />
        <AvisoSupabase />
      </>
    );
  }

  const cliente = await obterCliente(id);
  if (!cliente) notFound();

  return (
    <>
      <PageHeader titulo="Editar cliente" descricao={cliente.razao_social} />
      <FormularioCliente cliente={cliente} />
    </>
  );
}
