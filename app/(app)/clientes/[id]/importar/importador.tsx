"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { importarContatosAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Campo, CampoCheckbox } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  CAMPOS_IMPORTAVEIS,
  sugerirMapeamento,
  type CampoImportavel,
} from "@/lib/schemas/importacao";
import type { ResultadoImportacao } from "@/lib/services/importacao";

type Planilha = {
  cabecalhos: string[];
  linhas: Record<string, string>[];
  arquivo: string;
};

const LIMITE_LINHAS = 2000;

export function Importador({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [mapa, setMapa] = useState<Record<CampoImportavel, string> | null>(null);
  const [criarFiliais, setCriarFiliais] = useState(true);
  const [ignorarDuplicados, setIgnorarDuplicados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  const inputArquivo = useRef<HTMLInputElement>(null);

  async function lerArquivo(arquivo: File) {
    setErro(null);
    setResultado(null);

    try {
      // Import dinâmico: a biblioteca de planilha só é baixada por quem abre
      // esta tela, e não pesa no restante do sistema.
      const XLSX = await import("xlsx");
      const buffer = await arquivo.arrayBuffer();
      const pasta = XLSX.read(buffer, { type: "array" });

      const primeiraAba = pasta.SheetNames[0];
      if (!primeiraAba) {
        setErro("A planilha não tem nenhuma aba.");
        return;
      }

      const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(pasta.Sheets[primeiraAba], {
        defval: "",
        raw: false,
      });

      if (linhas.length === 0) {
        setErro("A primeira aba está vazia. Confira se os dados começam na primeira linha.");
        return;
      }

      if (linhas.length > LIMITE_LINHAS) {
        setErro(`A planilha tem ${linhas.length} linhas; o limite por importação é ${LIMITE_LINHAS}.`);
        return;
      }

      const cabecalhos = Object.keys(linhas[0]);
      const comoTexto = linhas.map((linha) => {
        const convertida: Record<string, string> = {};
        for (const chave of cabecalhos) convertida[chave] = String(linha[chave] ?? "").trim();
        return convertida;
      });

      setPlanilha({ cabecalhos, linhas: comoTexto, arquivo: arquivo.name });
      setMapa(sugerirMapeamento(cabecalhos));
    } catch {
      setErro("Não consegui ler este arquivo. Use .xlsx, .xls ou .csv.");
    }
  }

  function importar() {
    if (!planilha || !mapa) return;
    setErro(null);

    const colunaNome = mapa.nome;
    if (!colunaNome) {
      setErro("Indique qual coluna contém o nome — é o único campo obrigatório.");
      return;
    }

    const linhas = planilha.linhas
      .map((linha) => ({
        nome: linha[colunaNome] ?? "",
        cargo: mapa.cargo ? linha[mapa.cargo] : "",
        setor: mapa.setor ? linha[mapa.setor] : "",
        email: mapa.email ? linha[mapa.email] : "",
        telefone: mapa.telefone ? linha[mapa.telefone] : "",
        whatsapp: mapa.whatsapp ? linha[mapa.whatsapp] : "",
        filial: mapa.filial ? linha[mapa.filial] : "",
        observacoes: mapa.observacoes ? linha[mapa.observacoes] : "",
      }))
      .filter((linha) => linha.nome.trim().length > 0);

    if (linhas.length === 0) {
      setErro("Nenhuma linha tem nome preenchido na coluna escolhida.");
      return;
    }

    iniciarEnvio(async () => {
      const resposta = await importarContatosAction({
        cliente_id: clienteId,
        criar_filiais: criarFiliais,
        ignorar_duplicados: ignorarDuplicados,
        linhas,
      });

      if ("erro" in resposta) {
        setErro(resposta.erro);
      } else {
        setResultado(resposta.resultado);
        setPlanilha(null);
        setMapa(null);
        if (inputArquivo.current) inputArquivo.current.value = "";
      }
    });
  }

  // ─── Resultado ─────────────────────────────────────────────────────────────
  if (resultado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            Importação concluída
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ul className="flex flex-col gap-1">
            <li>
              <strong>{resultado.inseridos}</strong>{" "}
              {resultado.inseridos === 1 ? "contato cadastrado" : "contatos cadastrados"}
            </li>
            {resultado.ignorados > 0 ? (
              <li className="text-muted-foreground">
                {resultado.ignorados}{" "}
                {resultado.ignorados === 1 ? "linha ignorada" : "linhas ignoradas"} por já existirem
              </li>
            ) : null}
            {resultado.filiaisCriadas.length > 0 ? (
              <li className="text-muted-foreground">
                Filiais criadas: {resultado.filiaisCriadas.join(", ")}
              </li>
            ) : null}
          </ul>

          {resultado.erros.length > 0 ? (
            <div className="rounded-app border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4" />
                {resultado.erros.length}{" "}
                {resultado.erros.length === 1 ? "linha recusada" : "linhas recusadas"}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-amber-900 dark:text-amber-200">
                {resultado.erros.map((erroLinha) => (
                  <li key={`${erroLinha.linha}-${erroLinha.nome}`}>
                    Linha {erroLinha.linha} ({erroLinha.nome}): {erroLinha.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={`/clientes/${clienteId}?aba=contatos`}>Ver contatos</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResultado(null)}>
              Importar outra planilha
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Seleção do arquivo ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Escolha a planilha</CardTitle>
          <p className="text-sm text-muted-foreground">
            Os contatos serão cadastrados em <strong>{clienteNome}</strong>. Aceita .xlsx, .xls e
            .csv; é lida a primeira aba, e a primeira linha deve conter os títulos das colunas.
          </p>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-app border border-dashed border-border p-8 text-center hover:bg-surface-muted">
            <FileSpreadsheet className="size-7 text-muted-foreground" />
            <span className="text-sm font-medium">
              {planilha ? planilha.arquivo : "Clique para escolher o arquivo"}
            </span>
            <span className="text-xs text-muted-foreground">
              O arquivo é lido aqui no navegador; ele não é enviado para lugar nenhum.
            </span>
            <input
              ref={inputArquivo}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) lerArquivo(arquivo);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : null}

      {planilha && mapa ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. Confira as colunas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Adivinhei pelos títulos. Corrija o que estiver errado — deixe em branco o que não
                quiser importar.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {CAMPOS_IMPORTAVEIS.map((campo) => (
                <Campo
                  key={campo.chave}
                  id={`mapa-${campo.chave}`}
                  rotulo={campo.rotulo}
                  obrigatorio={campo.obrigatorio}
                >
                  <Select
                    id={`mapa-${campo.chave}`}
                    value={mapa[campo.chave]}
                    onChange={(e) => setMapa({ ...mapa, [campo.chave]: e.target.value })}
                  >
                    <option value="">— não importar —</option>
                    {planilha.cabecalhos.map((cabecalho) => (
                      <option key={cabecalho} value={cabecalho}>
                        {cabecalho}
                      </option>
                    ))}
                  </Select>
                </Campo>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Confira o resultado</CardTitle>
              <p className="text-sm text-muted-foreground">
                {planilha.linhas.length}{" "}
                {planilha.linhas.length === 1 ? "linha encontrada" : "linhas encontradas"} — abaixo,
                as cinco primeiras já com o mapeamento aplicado.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-app border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-surface-muted text-left">
                    <tr>
                      {CAMPOS_IMPORTAVEIS.filter((c) => mapa[c.chave]).map((campo) => (
                        <th key={campo.chave} className="px-3 py-2 font-medium whitespace-nowrap">
                          {campo.rotulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planilha.linhas.slice(0, 5).map((linha, indice) => (
                      <tr key={indice} className="border-b border-border last:border-0">
                        {CAMPOS_IMPORTAVEIS.filter((c) => mapa[c.chave]).map((campo) => (
                          <td
                            key={campo.chave}
                            className="px-3 py-2 whitespace-nowrap text-muted-foreground"
                          >
                            {linha[mapa[campo.chave]] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2">
                <CampoCheckbox
                  id="ignorar_duplicados"
                  rotulo="Ignorar quem já está cadastrado (compara pelo e-mail, ou pelo nome quando não houver)"
                  checked={ignorarDuplicados}
                  onChange={(e) => setIgnorarDuplicados(e.target.checked)}
                />
                <CampoCheckbox
                  id="criar_filiais"
                  rotulo="Criar as filiais que aparecerem na planilha e ainda não existirem"
                  checked={criarFiliais}
                  onChange={(e) => setCriarFiliais(e.target.checked)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={importar} disabled={enviando}>
                  <Upload />
                  {enviando ? "Importando…" : `Importar ${planilha.linhas.length} contatos`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPlanilha(null);
                    setMapa(null);
                    if (inputArquivo.current) inputArquivo.current.value = "";
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
