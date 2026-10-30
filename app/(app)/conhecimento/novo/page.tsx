import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { exigirEscritaNaPagina } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { TIPOS_CONHECIMENTO } from "@/lib/schemas/conhecimento";
import { FormularioConhecimento } from "../formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inclusão" };

export default async function NovoConhecimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  await exigirEscritaNaPagina("/conhecimento");

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Inclusão" />
        <AvisoSupabase />
      </>
    );
  }

  return (
    <>
      <PageHeader titulo="Inclusão" />
      <FormularioConhecimento tipoInicial={TIPOS_CONHECIMENTO.find((t) => t === tipo)} />
    </>
  );
}
