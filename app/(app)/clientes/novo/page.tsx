import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { exigirEscritaNaPagina } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { FormularioCliente } from "../formulario-cliente";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  await exigirEscritaNaPagina("/clientes");

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
