import { format, subDays } from "date-fns";

import { exigirUsuario } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/env";
import { opcoesDoCadastro } from "@/lib/services/equipamentos";
import { obterRelatorioEquipamentos } from "@/lib/services/relatorio-equipamentos";
import { FolhaManutencoes } from "./folha";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório de manutenções" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const AAAA_MM_DD = "yyyy-MM-dd";

/**
 * Versão para imprimir/salvar em PDF do relatório de manutenções.
 *
 * Fica fora do grupo (app) de propósito: sem menu lateral nem cabeçalho, só a folha.
 */
export default async function ImprimirManutencoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  if (!supabaseConfigurado) return <p className="p-8">Supabase não configurado.</p>;
  await exigirUsuario();

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

  const nomeCliente = opcoes.clientes.find((c) => c.id === params.cliente)?.razao_social;
  return <FolhaManutencoes relatorio={relatorio} params={params} de={de} ate={ate} nomeCliente={nomeCliente} />;
}
