import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { opcoesDeFormulario } from "@/lib/services/atendimentos";
import { FormularioAtendimento } from "./formulario";

export const metadata = { title: "Novo atendimento" };

export default async function NovoAtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; titulo?: string }>;
}) {
  const { cliente, titulo } = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Novo atendimento" />
        <AvisoSupabase />
      </>
    );
  }

  const opcoes = await opcoesDeFormulario();

  if (opcoes.clientes.length === 0) {
    return (
      <>
        <PageHeader titulo="Novo atendimento" />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Cadastre um cliente antes de abrir um atendimento — todo atendimento pertence a
            um cliente, e é por ele que o histórico é consultado depois.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Novo atendimento"
        descricao="Cliente e assunto bastam; o resto pode ser completado durante o atendimento."
      />
      <FormularioAtendimento
        opcoes={opcoes}
        clienteInicial={cliente}
        tituloInicial={titulo?.slice(0, 300)}
      />
    </>
  );
}
