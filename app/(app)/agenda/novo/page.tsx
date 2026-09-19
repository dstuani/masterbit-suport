import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { supabaseConfigurado } from "@/lib/env";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioEvento } from "./formulario";

export const metadata = { title: "Novo evento" };

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams: Promise<{ atendimento?: string; pendencia?: string }>;
}) {
  const { atendimento: atendimentoId, pendencia: pendenciaId } = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Novo evento" />
        <AvisoSupabase />
      </>
    );
  }

  const supabase = await criarClienteServidor();

  const [clientesRes, atendimentoRes, pendenciaRes] = await Promise.all([
    supabase.from("clientes").select("id, razao_social").eq("status", "ativo").order("razao_social"),
    atendimentoId
      ? supabase
          .from("atendimentos")
          .select("id, titulo, numero, cliente_id")
          .eq("id", atendimentoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    pendenciaId
      ? supabase
          .from("pendencias")
          .select("id, titulo, cliente_id")
          .eq("id", pendenciaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Novo evento"
        descricao="Retorno, visita, reunião ou lembrete."
      />
      <FormularioEvento
        opcoes={{
          clientes: clientesRes.data ?? [],
          atendimentoInicial: atendimentoRes.data ?? undefined,
          pendenciaInicial: pendenciaRes.data ?? undefined,
        }}
      />
    </>
  );
}
