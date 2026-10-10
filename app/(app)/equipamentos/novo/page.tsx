import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { exigirEscritaNaPagina } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { opcoesDoCadastro } from "@/lib/services/equipamentos";
import { FormularioEquipamento } from "../formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo equipamento" };

export default async function NovoEquipamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  await exigirEscritaNaPagina("/equipamentos");

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Novo equipamento" />
        <AvisoSupabase />
      </>
    );
  }

  const opcoes = await opcoesDoCadastro();

  return (
    <>
      <PageHeader
        titulo="Novo equipamento"
        descricao="Para máquinas sem o agente de coleta (impressoras, equipamentos fora do Windows). Computadores com o agente aparecem sozinhos."
      />
      <FormularioEquipamento opcoes={opcoes} clienteInicial={cliente} />
    </>
  );
}
