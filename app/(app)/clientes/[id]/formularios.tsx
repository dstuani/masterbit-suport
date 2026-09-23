"use client";

import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";

import {
  salvarContatoAction,
  salvarFilialAction,
  salvarSistemaDoClienteAction,
} from "../actions";
import { estadoInicial, type EstadoFormulario } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Campo, CampoCheckbox } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Contato, Filial } from "@/lib/services/clientes";
import type { Sistema } from "@/lib/services/catalogo";

function Erro({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

/**
 * Formulários de adição das abas da ficha.
 *
 * Ficam sempre visíveis abaixo da lista, em vez de atrás de um botão: o cadastro
 * de filial/contato costuma acontecer em sequência, e um passo a menos importa.
 */

export function FormularioFilial({ clienteId }: { clienteId: string }) {
  const [estado, acao, pendente] = useActionState(
    salvarFilialAction,
    estadoInicial,
  );
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (formData) => {
        await acao(formData);
        form.current?.reset();
      }}
      className="grid gap-3 sm:grid-cols-4"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="ativo" value="true" />

      <Campo
        id="filial_nome"
        rotulo="Nome"
        obrigatorio
        className="sm:col-span-2"
      >
        <Input id="filial_nome" name="nome" required />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="filial_codigo" rotulo="Código">
        <Input id="filial_codigo" name="codigo" />
      </Campo>

      <Campo id="filial_telefone" rotulo="Telefone">
        <Input id="filial_telefone" name="telefone" />
      </Campo>

      <Campo id="filial_cidade" rotulo="Cidade" className="sm:col-span-2">
        <Input id="filial_cidade" name="cidade" />
      </Campo>

      <Campo id="filial_uf" rotulo="UF">
        <Input id="filial_uf" name="uf" maxLength={2} />
        <Erro texto={estado.campos?.uf} />
      </Campo>

      <Campo id="filial_responsavel" rotulo="Responsável">
        <Input id="filial_responsavel" name="responsavel" />
      </Campo>

      <div className="flex items-end gap-3 sm:col-span-4">
        <CampoCheckbox id="filial_matriz" name="matriz" rotulo="É a matriz" />
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Adicionar filial"}
        </Button>
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}

/**
 * Formulário de contato, usado tanto para adicionar quanto para editar.
 *
 * Sem `contato`: formulário de inclusão, sempre visível abaixo da lista. Com
 * `contato`: prefilled para edição — quem chama controla o modo trocando a `key`,
 * o que remonta o formulário e evita misturar estado entre um contato e outro.
 */
export function FormularioContato({
  clienteId,
  filiais,
  contato,
  aoCancelar,
  aoSalvarComSucesso,
}: {
  clienteId: string;
  filiais: Filial[];
  contato?: Contato;
  aoCancelar?: () => void;
  aoSalvarComSucesso?: () => void;
}) {
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [pendente, setPendente] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (formData) => {
        setPendente(true);
        const resultado = await salvarContatoAction(estadoInicial, formData);
        setPendente(false);
        setEstado(resultado);

        if (resultado.erro) {
          toast.error(resultado.erro);
        } else if (contato) {
          toast.success("Contato atualizado.");
          aoSalvarComSucesso?.();
        } else {
          toast.success("Contato adicionado.");
          form.current?.reset();
        }
      }}
      className="grid gap-3 sm:grid-cols-4"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="ativo" value={contato ? String(contato.ativo) : "true"} />
      {contato ? <input type="hidden" name="id" value={contato.id} /> : null}

      <Campo
        id="contato_nome"
        rotulo="Nome"
        obrigatorio
        className="sm:col-span-2"
      >
        <Input
          id="contato_nome"
          name="nome"
          defaultValue={contato?.nome ?? ""}
          autoFocus={Boolean(contato)}
          required
        />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="contato_cargo" rotulo="Cargo">
        <Input id="contato_cargo" name="cargo" defaultValue={contato?.cargo ?? ""} />
      </Campo>

      <Campo id="contato_setor" rotulo="Setor">
        <Input id="contato_setor" name="setor" defaultValue={contato?.setor ?? ""} />
      </Campo>

      <Campo id="contato_email" rotulo="E-mail" className="sm:col-span-2">
        <Input id="contato_email" name="email" type="email" defaultValue={contato?.email ?? ""} />
        <Erro texto={estado.campos?.email} />
      </Campo>

      <Campo id="contato_telefone" rotulo="Telefone">
        <Input id="contato_telefone" name="telefone" defaultValue={contato?.telefone ?? ""} />
      </Campo>

      <Campo id="contato_whatsapp" rotulo="WhatsApp">
        <Input id="contato_whatsapp" name="whatsapp" defaultValue={contato?.whatsapp ?? ""} />
      </Campo>

      <Campo id="contato_filial" rotulo="Filial" className="sm:col-span-2">
        <Select id="contato_filial" name="filial_id" defaultValue={contato?.filial_id ?? ""}>
          <option value="">Sem filial específica</option>
          {filiais.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.nome}
            </option>
          ))}
        </Select>
      </Campo>

      <div className="flex items-end gap-3 sm:col-span-4">
        <CampoCheckbox
          id="contato_principal"
          name="principal"
          rotulo="Contato principal"
          defaultChecked={contato?.principal ?? false}
        />
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : contato ? "Salvar alterações" : "Adicionar contato"}
        </Button>
        {aoCancelar ? (
          <Button type="button" variant="ghost" size="sm" onClick={aoCancelar} disabled={pendente}>
            Cancelar
          </Button>
        ) : null}
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}

export function FormularioSistemaDoCliente({
  clienteId,
  filiais,
  sistemas,
}: {
  clienteId: string;
  filiais: Filial[];
  sistemas: Sistema[];
}) {
  const [estado, acao, pendente] = useActionState(
    salvarSistemaDoClienteAction,
    estadoInicial,
  );
  const form = useRef<HTMLFormElement>(null);

  if (sistemas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum sistema no catálogo ainda. Cadastre em Configurações → Sistemas
        antes de vincular a um cliente.
      </p>
    );
  }

  return (
    <form
      ref={form}
      action={async (formData) => {
        await acao(formData);
        form.current?.reset();
      }}
      className="grid gap-3 sm:grid-cols-4"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="ativo" value="true" />

      <Campo
        id="cs_sistema"
        rotulo="Sistema"
        obrigatorio
        className="sm:col-span-2"
      >
        <Select id="cs_sistema" name="sistema_id" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {sistemas.map((sistema) => (
            <option key={sistema.id} value={sistema.id}>
              {sistema.nome}
              {sistema.fabricante ? ` — ${sistema.fabricante}` : ""}
            </option>
          ))}
        </Select>
        <Erro texto={estado.campos?.sistema_id} />
      </Campo>

      <Campo id="cs_filial" rotulo="Filial">
        <Select id="cs_filial" name="filial_id" defaultValue="">
          <option value="">Matriz / sem filial</option>
          {filiais.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.nome}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo id="cs_ambiente" rotulo="Ambiente">
        <Select id="cs_ambiente" name="ambiente" defaultValue="producao">
          <option value="producao">Produção</option>
          <option value="homologacao">Homologação</option>
          <option value="teste">Teste</option>
        </Select>
      </Campo>

      <Campo id="cs_versao" rotulo="Versão instalada">
        <Input id="cs_versao" name="versao_instalada" />
      </Campo>

      <Campo id="cs_data" rotulo="Implantação">
        <Input id="cs_data" name="data_implantacao" type="date" />
      </Campo>

      <Campo id="cs_licencas" rotulo="Licenças">
        <Input id="cs_licencas" name="licencas" inputMode="numeric" />
        <Erro texto={estado.campos?.licencas} />
      </Campo>

      <Campo id="cs_obs" rotulo="Observações" className="sm:col-span-4">
        <Textarea id="cs_obs" name="observacoes" className="min-h-16" />
      </Campo>

      <div className="flex items-end gap-3 sm:col-span-4">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Vincular sistema"}
        </Button>
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}
