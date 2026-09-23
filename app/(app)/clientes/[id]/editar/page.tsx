import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { obterCliente } from "@/lib/services/clientes";
import { FormularioCliente } from "../../formulario-cliente";
import { BotaoExcluirCliente } from "../excluir";

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

      {cliente.status !== "inativo" ? (
        <Card className="mt-4 border-red-300 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">Excluir cliente</CardTitle>
            <p className="text-sm text-muted-foreground">
              O cadastro e o histórico de atendimentos são mantidos — o cliente só sai das listas e
              buscas ativas. Para reverter, volte aqui e mude o Status de volta para Ativo.
            </p>
          </CardHeader>
          <CardContent>
            <BotaoExcluirCliente clienteId={cliente.id} nome={cliente.razao_social} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
