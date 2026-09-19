"use client";

import { useActionState } from "react";
import Link from "next/link";

import { salvarClienteAction } from "./actions";
import { estadoInicial } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Cliente } from "@/lib/services/clientes";

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const [estado, acao, pendente] = useActionState(
    salvarClienteAction,
    estadoInicial,
  );
  const erroDe = (campo: string) => estado.campos?.[campo];

  return (
    <form action={acao} className="flex flex-col gap-4">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="razao_social"
            rotulo="Razão social"
            obrigatorio
            className="sm:col-span-2"
          >
            <Input
              id="razao_social"
              name="razao_social"
              defaultValue={cliente?.razao_social ?? ""}
              required
              autoFocus
            />
            <MensagemCampo texto={erroDe("razao_social")} />
          </Campo>

          <Campo id="nome_fantasia" rotulo="Nome fantasia">
            <Input
              id="nome_fantasia"
              name="nome_fantasia"
              defaultValue={cliente?.nome_fantasia ?? ""}
            />
          </Campo>

          <Campo
            id="codigo"
            rotulo="Código interno"
            dica="Seu código de controle, opcional."
          >
            <Input
              id="codigo"
              name="codigo"
              defaultValue={cliente?.codigo ?? ""}
            />
            <MensagemCampo texto={erroDe("codigo")} />
          </Campo>

          <Campo id="tipo" rotulo="Tipo">
            <Select id="tipo" name="tipo" defaultValue={cliente?.tipo ?? "PJ"}>
              <option value="PJ">Pessoa jurídica</option>
              <option value="PF">Pessoa física</option>
            </Select>
          </Campo>

          <Campo
            id="documento"
            rotulo="CPF/CNPJ"
            dica="Só os dígitos; a formatação é automática."
          >
            <Input
              id="documento"
              name="documento"
              defaultValue={cliente?.documento ?? ""}
            />
            <MensagemCampo texto={erroDe("documento")} />
          </Campo>

          <Campo id="status" rotulo="Status">
            <Select
              id="status"
              name="status"
              defaultValue={cliente?.status ?? "ativo"}
            >
              <option value="ativo">Ativo</option>
              <option value="prospect">Prospect</option>
              <option value="inativo">Inativo</option>
            </Select>
          </Campo>

          <Campo id="segmento" rotulo="Segmento">
            <Input
              id="segmento"
              name="segmento"
              defaultValue={cliente?.segmento ?? ""}
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="email" rotulo="E-mail">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={cliente?.email ?? ""}
            />
            <MensagemCampo texto={erroDe("email")} />
          </Campo>

          <Campo id="telefone" rotulo="Telefone">
            <Input
              id="telefone"
              name="telefone"
              defaultValue={cliente?.telefone ?? ""}
            />
          </Campo>

          <Campo id="site" rotulo="Site" className="sm:col-span-2">
            <Input id="site" name="site" defaultValue={cliente?.site ?? ""} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <Campo id="cep" rotulo="CEP" className="sm:col-span-2">
            <Input id="cep" name="cep" defaultValue={cliente?.cep ?? ""} />
          </Campo>

          <Campo id="logradouro" rotulo="Logradouro" className="sm:col-span-4">
            <Input
              id="logradouro"
              name="logradouro"
              defaultValue={cliente?.logradouro ?? ""}
            />
          </Campo>

          <Campo id="numero" rotulo="Número" className="sm:col-span-2">
            <Input
              id="numero"
              name="numero"
              defaultValue={cliente?.numero ?? ""}
            />
          </Campo>

          <Campo
            id="complemento"
            rotulo="Complemento"
            className="sm:col-span-4"
          >
            <Input
              id="complemento"
              name="complemento"
              defaultValue={cliente?.complemento ?? ""}
            />
          </Campo>

          <Campo id="bairro" rotulo="Bairro" className="sm:col-span-2">
            <Input
              id="bairro"
              name="bairro"
              defaultValue={cliente?.bairro ?? ""}
            />
          </Campo>

          <Campo id="cidade" rotulo="Cidade" className="sm:col-span-3">
            <Input
              id="cidade"
              name="cidade"
              defaultValue={cliente?.cidade ?? ""}
            />
          </Campo>

          <Campo id="uf" rotulo="UF" className="sm:col-span-1">
            <Select id="uf" name="uf" defaultValue={cliente?.uf ?? ""}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
            <MensagemCampo texto={erroDe("uf")} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="contrato_tipo" rotulo="Tipo de contrato">
            <Select
              id="contrato_tipo"
              name="contrato_tipo"
              defaultValue={cliente?.contrato_tipo ?? "avulso"}
            >
              <option value="avulso">Avulso</option>
              <option value="mensal">Mensal</option>
              <option value="pacote_horas">Pacote de horas</option>
            </Select>
          </Campo>

          <Campo id="horas_contratadas" rotulo="Horas contratadas">
            <Input
              id="horas_contratadas"
              name="horas_contratadas"
              inputMode="decimal"
              defaultValue={cliente?.horas_contratadas ?? ""}
            />
            <MensagemCampo texto={erroDe("horas_contratadas")} />
          </Campo>

          <Campo
            id="observacoes"
            rotulo="Observações"
            className="sm:col-span-2"
          >
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={cliente?.observacoes ?? ""}
            />
          </Campo>
        </CardContent>
      </Card>

      {estado.erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente
            ? "Salvando…"
            : cliente
              ? "Salvar alterações"
              : "Cadastrar cliente"}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href={cliente ? `/clientes/${cliente.id}` : "/clientes"}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}

function MensagemCampo({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600 dark:text-red-400">{texto}</p>;
}
