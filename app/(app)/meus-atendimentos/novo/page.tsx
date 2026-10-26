import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { supabaseConfigurado } from "@/lib/env";
import { FormularioPedido } from "./formulario";

export const metadata = { title: "Novo atendimento" };

export default function NovoPedidoPage() {
  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Novo atendimento" />
        <AvisoSupabase />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Novo atendimento"
        descricao="Conte o que está acontecendo. A resposta aparece em Meus atendimentos."
      />
      <FormularioPedido />
    </>
  );
}
