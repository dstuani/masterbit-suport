import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { listarClientes } from "@/lib/services/clientes";
import { formatarDocumento } from "@/lib/utils";
import { FiltrosClientes } from "./filtros";

export const metadata = { title: "Clientes" };

const CORES_STATUS: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  inativo: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  prospect: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
};

const ROTULOS_STATUS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospect: "Prospect",
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string }>;
}) {
  const { busca, status } = await searchParams;

  const acoes = (
    <Button asChild size="sm">
      <Link href="/clientes/novo">
        <Plus />
        Novo cliente
      </Link>
    </Button>
  );

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Clientes" descricao="Cadastro, filiais, contatos e sistemas instalados." />
        <AvisoSupabase />
      </>
    );
  }

  const clientes = await listarClientes({
    busca,
    status: status === "ativo" || status === "inativo" || status === "prospect" ? status : undefined,
  });

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Cadastro, filiais, contatos e sistemas instalados."
        acoes={acoes}
      />

      <FiltrosClientes busca={busca ?? ""} status={status ?? ""} />

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {busca || status ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {busca || status
                  ? "Ajuste a busca ou o filtro de status."
                  : "Cadastre o primeiro cliente para começar a registrar atendimentos."}
              </p>
            </div>
            {!busca && !status ? (
              <Button asChild size="sm">
                <Link href="/clientes/novo">
                  <Plus />
                  Novo cliente
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">CPF/CNPJ</th>
                  <th className="px-4 py-2.5 font-medium">Cidade</th>
                  <th className="px-4 py-2.5 font-medium">Contrato</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {cliente.razao_social}
                      </Link>
                      {cliente.nome_fantasia ? (
                        <p className="text-xs text-muted-foreground">{cliente.nome_fantasia}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {formatarDocumento(cliente.documento)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {cliente.cidade ? `${cliente.cidade}${cliente.uf ? `/${cliente.uf}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {cliente.contrato_tipo === "pacote_horas"
                        ? "Pacote de horas"
                        : cliente.contrato_tipo === "mensal"
                          ? "Mensal"
                          : "Avulso"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={CORES_STATUS[cliente.status]}>
                        {ROTULOS_STATUS[cliente.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {clientes.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
        </p>
      ) : null}
    </>
  );
}
