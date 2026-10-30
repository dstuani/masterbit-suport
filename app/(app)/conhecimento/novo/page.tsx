import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { exigirEscritaNaPagina } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { opcoesDoConhecimento } from "@/lib/services/conhecimento";
import { FormularioConhecimento } from "../formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo comando" };

export default async function NovoConhecimentoPage() {
  await exigirEscritaNaPagina("/conhecimento");

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Novo comando" />
        <AvisoSupabase />
      </>
    );
  }

  const opcoes = await opcoesDoConhecimento();

  return (
    <>
      <PageHeader titulo="Novo comando" descricao="Guarde o SQL junto da explicação para achar depois por palavra." />
      <FormularioConhecimento opcoes={opcoes} />
    </>
  );
}
