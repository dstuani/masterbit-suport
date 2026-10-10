import { notFound } from "next/navigation";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { exigirEscritaNaPagina } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { obterEquipamento, opcoesDoCadastro } from "@/lib/services/equipamentos";
import { FormularioEquipamento } from "../../formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar equipamento" };

export default async function EditarEquipamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirEscritaNaPagina(`/equipamentos/${id}`);

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Editar equipamento" />
        <AvisoSupabase />
      </>
    );
  }

  const [equipamento, opcoes] = await Promise.all([obterEquipamento(id), opcoesDoCadastro()]);
  if (!equipamento) notFound();

  return (
    <>
      <PageHeader titulo={`Editar ${equipamento.nome}`} descricao={equipamento.clientes?.razao_social} />
      <FormularioEquipamento opcoes={opcoes} equipamento={equipamento} />
    </>
  );
}
