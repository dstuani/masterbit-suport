import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { supabaseConfigurado } from "@/lib/env";
import { FormularioCliente } from "../formulario-cliente";

export const metadata = { title: "Novo cliente" };

export default function NovoClientePage() {
  return (
    <>
      <PageHeader
        titulo="Novo cliente"
        descricao="Só a razão social é obrigatória; o resto pode ser preenchido depois."
      />
      {supabaseConfigurado ? <FormularioCliente /> : <AvisoSupabase />}
    </>
  );
}
