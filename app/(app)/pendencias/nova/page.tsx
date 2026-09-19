import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { supabaseConfigurado } from "@/lib/env";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioPendencia } from "./formulario";

export const metadata = { title: "Nova pendência" };

export default async function NovaPendenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ atendimento?: string }>;
}) {
  const { atendimento: atendimentoId } = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Nova pendência" />
        <AvisoSupabase />
      </>
    );
  }

  const supabase = await criarClienteServidor();

  const [{ data: clientes }, atendimentoData] = await Promise.all([
    supabase.from("clientes").select("id, razao_social").eq("status", "ativo").order("razao_social"),
    atendimentoId
      ? supabase
          .from("atendimentos")
          .select("id, titulo, numero, cliente_id")
          .eq("id", atendimentoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const atendimentoInicial = atendimentoData.data ?? undefined;

  return (
    <>
      <PageHeader
        titulo="Nova pendência"
        descricao="Registre o que ficou em aberto — de quem depende e para quando."
      />
      <FormularioPendencia
        opcoes={{
          clientes: clientes ?? [],
          atendimentoInicial: atendimentoInicial
            ? {
                id: atendimentoInicial.id,
                titulo: atendimentoInicial.titulo,
                numero: atendimentoInicial.numero,
                cliente_id: atendimentoInicial.cliente_id,
              }
            : undefined,
        }}
      />
    </>
  );
}
