import { TIPOS_EQUIPAMENTO, TIPOS_MANUTENCAO } from "@/lib/constants";
import { descreverAlteracao, type RelatorioEquipamentos } from "@/lib/services/relatorio-equipamentos";
import { formatarData, formatarDataHora, formatarDuracao, formatarMoeda } from "@/lib/utils";
import { BarraDeImpressao } from "./imprimir";

/**
 * A folha do relatório de manutenções (A4), separada da busca para poder ser vista com
 * dados de exemplo. Cores fixas: o papel é sempre branco, mesmo no tema escuro.
 */
export function FolhaManutencoes({
  relatorio,
  params,
  de,
  ate,
  nomeCliente,
}: {
  relatorio: RelatorioEquipamentos;
  params: Record<string, string | undefined>;
  de: string;
  ate: string;
  nomeCliente?: string;
}) {
  const hoje = new Date();
  const { kpis, manutencoes, alteracoes } = relatorio;
  const filtros = [
    nomeCliente ? `Cliente: ${nomeCliente}` : "Todos os clientes",
    params.tipo && params.tipo in TIPOS_EQUIPAMENTO ? `Equipamento: ${TIPOS_EQUIPAMENTO[params.tipo as keyof typeof TIPOS_EQUIPAMENTO]}` : null,
    params.manutencao && params.manutencao in TIPOS_MANUTENCAO
      ? `Manutenção: ${TIPOS_MANUTENCAO[params.manutencao as keyof typeof TIPOS_MANUTENCAO]}`
      : null,
  ].filter(Boolean);
  const periodo = `${formatarData(`${de}T12:00:00`)} a ${formatarData(`${ate}T12:00:00`)}`;

  return (
    <div className="min-h-screen bg-white text-stone-900 [color-scheme:light]">
      {/* Regras só de papel: A4, margens e linhas que não se partem entre páginas. */}
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .folha tr, .folha .bloco { break-inside: avoid; }
          .folha thead { display: table-header-group; }
        }
      `}</style>

      <main className="folha mx-auto max-w-[210mm] px-6 py-8 text-[11px] leading-snug print:max-w-none print:p-0">
        <BarraDeImpressao automatico={params.auto !== "0"} />

        <header className="mb-5 flex items-start justify-between gap-6 border-b-2 border-[#f47b36] pb-4">
          <div>
            <h1 className="text-xl font-semibold">Relatório de manutenções</h1>
            <p className="mt-1 text-sm text-stone-600">Período: {periodo}</p>
            <p className="text-stone-600">{filtros.join(" · ")}</p>
          </div>
          <div className="text-right">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem fixa e pequena; o otimizador não ajuda na impressão */}
            <img src="/masterbit-logo.png" alt="Masterbit" className="ml-auto h-9 w-auto" />
            <p className="mt-1 text-stone-500">Gerado em {formatarDataHora(hoje)}</p>
          </div>
        </header>

        <section className="bloco mb-5 grid grid-cols-4 gap-3">
          <Numero rotulo="Manutenções" valor={String(kpis.manutencoes)} />
          <Numero rotulo="Tempo de trabalho" valor={kpis.minutos > 0 ? formatarDuracao(kpis.minutos) : "—"} />
          <Numero
            rotulo="Trocas de peça"
            valor={String(kpis.trocasRegistradas + kpis.trocasDetectadas)}
            detalhe={`${kpis.trocasRegistradas} registradas · ${kpis.trocasDetectadas} pela coleta`}
          />
          <Numero rotulo="Custo registrado" valor={formatarMoeda(kpis.custo)} />
        </section>

        <h2 className="mb-2 text-sm font-semibold">Manutenções ({manutencoes.length})</h2>
        {manutencoes.length === 0 ? (
          <p className="mb-6 text-stone-600">Nenhuma manutenção neste período e filtro.</p>
        ) : (
          <table className="mb-6 w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-stone-300 text-left">
                <th className="py-1.5 pr-2 font-semibold">Data</th>
                <th className="py-1.5 pr-2 font-semibold">Equipamento</th>
                <th className="py-1.5 pr-2 font-semibold">Tipo</th>
                <th className="py-1.5 pr-2 font-semibold">O que foi feito</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Tempo</th>
                <th className="py-1.5 text-right font-semibold">Custo</th>
              </tr>
            </thead>
            <tbody>
              {manutencoes.map((m) => (
                <tr key={m.id} className="border-b border-stone-200 align-top">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{formatarData(m.realizada_em)}</td>
                  <td className="py-1.5 pr-2">
                    <span className="font-medium whitespace-nowrap">{m.equipamentos?.nome}</span>
                    <span className="block text-stone-500">{m.equipamentos?.clientes?.razao_social}</span>
                  </td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    {TIPOS_MANUTENCAO[m.tipo as keyof typeof TIPOS_MANUTENCAO] ?? m.tipo}
                  </td>
                  <td className="py-1.5 pr-2">
                    {m.peca_retirada || m.peca_instalada ? (
                      <span className="block">
                        <span className="text-stone-500">Saiu:</span> {m.peca_retirada ?? "—"}{" "}
                        <span className="text-stone-500">· Entrou:</span> {m.peca_instalada ?? "—"}
                      </span>
                    ) : null}
                    <span className="whitespace-pre-wrap">{m.descricao}</span>
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    {m.tempo_minutos ? formatarDuracao(m.tempo_minutos) : "—"}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    {m.custo === null ? "—" : formatarMoeda(Number(m.custo))}
                  </td>
                </tr>
              ))}
              {/* Total como última linha, não como <tfoot>: o navegador repetiria o rodapé em cada página. */}
              <tr className="border-t-2 border-stone-300 font-semibold">
                <td className="py-1.5 pr-2" colSpan={4}>
                  Total
                </td>
                <td className="py-1.5 pr-2 text-right whitespace-nowrap">{kpis.minutos > 0 ? formatarDuracao(kpis.minutos) : "—"}</td>
                <td className="py-1.5 text-right whitespace-nowrap">{formatarMoeda(kpis.custo)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {alteracoes.length > 0 ? (
          <>
            <h2 className="mb-1 text-sm font-semibold">Mudanças de hardware percebidas pela coleta ({alteracoes.length})</h2>
            <p className="mb-2 text-stone-500">Peças que mudaram entre dois envios do agente, mesmo sem manutenção registrada.</p>
            <table className="mb-6 w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-300 text-left">
                  <th className="py-1.5 pr-2 font-semibold">Data</th>
                  <th className="py-1.5 pr-2 font-semibold">Equipamento</th>
                  <th className="py-1.5 pr-2 font-semibold">Componente</th>
                  <th className="py-1.5 font-semibold">Antes → depois</th>
                </tr>
              </thead>
              <tbody>
                {alteracoes.map((a) => {
                  const d = descreverAlteracao(a);
                  return (
                    <tr key={a.id} className="border-b border-stone-200 align-top">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{formatarData(a.detectada_em)}</td>
                      <td className="py-1.5 pr-2">
                        <span className="font-medium">{a.equipamentos?.nome}</span>
                        <span className="block text-stone-500">{a.equipamentos?.clientes?.razao_social}</span>
                      </td>
                      <td className="py-1.5 pr-2">{d.nome}</td>
                      <td className="py-1.5">
                        {d.antes} → {d.depois}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : null}

        <footer className="border-t border-stone-200 pt-2 text-stone-500">Masterbit Suport · Masterbit Informática</footer>
      </main>
    </div>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-md border border-stone-200 px-3 py-2">
      <p className="text-stone-500">{rotulo}</p>
      <p className="text-base font-semibold">{valor}</p>
      {detalhe ? <p className="text-[10px] text-stone-500">{detalhe}</p> : null}
    </div>
  );
}
