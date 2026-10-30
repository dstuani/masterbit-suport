import { notFound } from "next/navigation";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { exigirEscritaNaPagina } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { obterConhecimento } from "@/lib/services/conhecimento";
import { FormularioConhecimento } from "../../formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar comando" };

export default async function EditarConhecimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirEscritaNaPagina("/conhecimento");

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Editar comando" />
        <AvisoSupabase />
      </>
    );
  }

  const item = await obterConhecimento(id);
  if (!item) notFound();

  return (
    <>
      <PageHeader titulo="Editar comando" descricao={item.titulo} />
      <FormularioConhecimento item={item} />
    </>
  );
}
