import { format, subDays } from "date-fns";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { PageHeader } from "@/components/layout/page-header";
import { supabaseConfigurado } from "@/lib/env";
import { opcoesDoCadastro } from "@/lib/services/equipamentos";
import { obterRelatorioEquipamentos } from "@/lib/services/relatorio-equipamentos";
import { PainelRelatorioEquipamentos } from "./painel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório de equipamentos" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const AAAA_MM_DD = "yyyy-MM-dd";

export default async function RelatorioEquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Relatório de equipamentos" />
        <AvisoSupabase />
      </>
    );
  }

  // A URL é entrada de qualquer pessoa: data fora do formato volta ao padrão (últimos 90 dias).
  const hoje = new Date();
  let de = params.de && DATA.test(params.de) ? params.de : format(subDays(hoje, 89), AAAA_MM_DD);
  let ate = params.ate && DATA.test(params.ate) ? params.ate : format(hoje, AAAA_MM_DD);
  if (de > ate) [de, ate] = [ate, de];

  const [relatorio, opcoes] = await Promise.all([
    obterRelatorioEquipamentos({
      de,
      ate,
      cliente: params.cliente,
      tipoEquipamento: params.tipo,
      tipoManutencao: params.manutencao,
    }),
    opcoesDoCadastro(),
  ]);

  return <PainelRelatorioEquipamentos relatorio={relatorio} clientes={opcoes.clientes} params={params} de={de} ate={ate} />;
}
