import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Upload } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { listarSistemas } from "@/lib/services/catalogo";
import {
  contarAtendimentosDoCliente,
  listarContatos,
  listarFiliais,
  listarSistemasDoCliente,
  obterCliente,
} from "@/lib/services/clientes";
import { formatarData, formatarDocumento } from "@/lib/utils";
import { removerSistemaDoClienteAction } from "../actions";
import { FormularioContato, FormularioFilial, FormularioSistemaDoCliente } from "./formularios";

const ABAS = [
  { chave: "geral", rotulo: "Visão geral" },
  { chave: "filiais", rotulo: "Filiais" },
  { chave: "contatos", rotulo: "Contatos" },
  { chave: "sistemas", rotulo: "Sistemas" },
] as const;

const AMBIENTES: Record<string, string> = {
  producao: "Produção",
  homologacao: "Homologação",
  teste: "Teste",
};

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba: abaParam } = await searchParams;
  const aba = ABAS.some((a) => a.chave === abaParam) ? abaParam! : "geral";

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Cliente" />
        <AvisoSupabase />
      </>
    );
  }

  const cliente = await obterCliente(id);
  if (!cliente) notFound();

  // Carregado em paralelo: a ficha mostra os contadores em todas as abas.
  const [filiais, contatos, sistemasDoCliente, catalogo, atendimentos] = await Promise.all([
    listarFiliais(id),
    listarContatos(id),
    listarSistemasDoCliente(id),
    listarSistemas(),
    contarAtendimentosDoCliente(id),
  ]);

  return (
    <>
      <PageHeader
        titulo={cliente.razao_social}
        descricao={cliente.nome_fantasia ?? undefined}
        acoes={
          <Button asChild size="sm" variant="outline">
            <Link href={`/clientes/${id}/editar`}>
              <Pencil />
              Editar
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Indicador rotulo="Atendimentos abertos" valor={atendimentos.abertos} />
        <Indicador rotulo="Atendimentos no total" valor={atendimentos.total} />
        <Indicador rotulo="Filiais" valor={filiais.length} />
        <Indicador rotulo="Sistemas" valor={sistemasDoCliente.length} />
      </div>

      <nav className="mb-4 flex gap-1 border-b border-border">
        {ABAS.map((item) => (
          <Link
            key={item.chave}
            href={`/clientes/${id}?aba=${item.chave}`}
            className={
              item.chave === aba
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>

      {aba === "geral" ? <AbaGeral cliente={cliente} /> : null}

      {aba === "filiais" ? (
        <Secao titulo="Filiais" formulario={<FormularioFilial clienteId={id} />}>
          {filiais.length === 0 ? (
            <Vazio texto="Nenhuma filial cadastrada." />
          ) : (
            <Tabela colunas={["Nome", "Código", "Cidade", "Responsável", ""]}>
              {filiais.map((filial) => (
                <tr key={filial.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{filial.nome}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{filial.codigo ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {filial.cidade ? `${filial.cidade}${filial.uf ? `/${filial.uf}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{filial.responsavel ?? "—"}</td>
                  <td className="px-4 py-2.5">{filial.matriz ? <Badge>Matriz</Badge> : null}</td>
                </tr>
              ))}
            </Tabela>
          )}
        </Secao>
      ) : null}

      {aba === "contatos" ? (
        <Secao
          titulo="Contatos"
          formulario={<FormularioContato clienteId={id} filiais={filiais} />}
          acoes={
            <Button asChild size="sm" variant="outline">
              <Link href={`/clientes/${id}/importar`}>
                <Upload />
                Importar planilha
              </Link>
            </Button>
          }
        >
          {contatos.length === 0 ? (
            <Vazio texto="Nenhum contato cadastrado." />
          ) : (
            <Tabela colunas={["Nome", "Cargo", "E-mail", "Telefone", ""]}>
              {contatos.map((contato) => (
                <tr key={contato.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{contato.nome}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{contato.cargo ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{contato.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {contato.telefone ?? contato.whatsapp ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {contato.principal ? <Badge>Principal</Badge> : null}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Secao>
      ) : null}

      {aba === "sistemas" ? (
        <Secao
          titulo="Sistemas instalados"
          formulario={
            <FormularioSistemaDoCliente clienteId={id} filiais={filiais} sistemas={catalogo} />
          }
        >
          {sistemasDoCliente.length === 0 ? (
            <Vazio texto="Nenhum sistema vinculado a este cliente." />
          ) : (
            <Tabela colunas={["Sistema", "Filial", "Versão", "Ambiente", "Implantação", ""]}>
              {sistemasDoCliente.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{item.sistemas?.nome ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {item.filiais?.nome ?? "Matriz"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {item.versao_instalada ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {AMBIENTES[item.ambiente] ?? item.ambiente}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatarData(item.data_implantacao)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={removerSistemaDoClienteAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="cliente_id" value={id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remover
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Secao>
      ) : null}
    </>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{rotulo}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      </CardContent>
    </Card>
  );
}

function Secao({
  titulo,
  formulario,
  acoes,
  children,
}: {
  titulo: string;
  formulario: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {acoes ? <div className="flex justify-end">{acoes}</div> : null}
      <Card className="overflow-hidden">{children}</Card>
      <Card>
        <CardHeader>
          <CardTitle>Adicionar a {titulo.toLowerCase()}</CardTitle>
        </CardHeader>
        <CardContent>{formulario}</CardContent>
      </Card>
    </div>
  );
}

function Tabela({ colunas, children }: { colunas: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface-muted text-left">
          <tr>
            {colunas.map((coluna, indice) => (
              <th key={`${coluna}-${indice}`} className="px-4 py-2.5 font-medium">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{texto}</p>;
}

function AbaGeral({
  cliente,
}: {
  cliente: NonNullable<Awaited<ReturnType<typeof obterCliente>>>;
}) {
  const endereco = [
    cliente.logradouro,
    cliente.numero,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade && cliente.uf ? `${cliente.cidade}/${cliente.uf}` : cliente.cidade,
    cliente.cep,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 text-sm">
          <Linha rotulo="Tipo" valor={cliente.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"} />
          <Linha rotulo="CPF/CNPJ" valor={formatarDocumento(cliente.documento)} />
          <Linha rotulo="Código interno" valor={cliente.codigo} />
          <Linha rotulo="Segmento" valor={cliente.segmento} />
          <Linha rotulo="E-mail" valor={cliente.email} />
          <Linha rotulo="Telefone" valor={cliente.telefone} />
          <Linha rotulo="Site" valor={cliente.site} />
          <Linha rotulo="Endereço" valor={endereco || null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contrato</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 text-sm">
          <Linha
            rotulo="Tipo"
            valor={
              cliente.contrato_tipo === "pacote_horas"
                ? "Pacote de horas"
                : cliente.contrato_tipo === "mensal"
                  ? "Mensal"
                  : "Avulso"
            }
          />
          <Linha
            rotulo="Horas contratadas"
            valor={cliente.horas_contratadas ? `${cliente.horas_contratadas} h` : null}
          />
          <Linha rotulo="Cliente desde" valor={formatarData(cliente.created_at)} />
          <Linha rotulo="Observações" valor={cliente.observacoes} />
        </CardContent>
      </Card>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="flex gap-3">
      <span className="w-40 shrink-0 text-muted-foreground">{rotulo}</span>
      <span className="min-w-0 break-words">{valor && valor.length > 0 ? valor : "—"}</span>
    </div>
  );
}
