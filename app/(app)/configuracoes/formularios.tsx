"use client";

import { useActionState, useRef } from "react";

import {
  salvarCategoriaAction,
  salvarSistemaAction,
  salvarSubcategoriaAction,
} from "./actions";
import { estadoInicial } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function Erro({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

export function FormularioSistema() {
  const [estado, acao, pendente] = useActionState(
    salvarSistemaAction,
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
      <input type="hidden" name="ativo" value="true" />

      <Campo id="sis_nome" rotulo="Nome" obrigatorio>
        <Input id="sis_nome" name="nome" required />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="sis_fabricante" rotulo="Fabricante">
        <Input id="sis_fabricante" name="fabricante" />
      </Campo>

      <Campo id="sis_tipo" rotulo="Tipo">
        <Select id="sis_tipo" name="tipo" defaultValue="erp">
          <option value="erp">ERP</option>
          <option value="fiscal">Fiscal</option>
          <option value="sistema_proprio">Sistema próprio</option>
          <option value="infraestrutura">Infraestrutura</option>
          <option value="outro">Outro</option>
        </Select>
      </Campo>

      <Campo id="sis_versao" rotulo="Versão atual">
        <Input id="sis_versao" name="versao_atual" />
      </Campo>

      <div className="flex items-center gap-3 sm:col-span-4">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Adicionar sistema"}
        </Button>
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}

export function FormularioCategoria() {
  const [estado, acao, pendente] = useActionState(
    salvarCategoriaAction,
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
      <input type="hidden" name="ativo" value="true" />

      <Campo id="cat_nome" rotulo="Nome" obrigatorio className="sm:col-span-2">
        <Input id="cat_nome" name="nome" required />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="cat_cor" rotulo="Cor" dica="Usada no badge do atendimento.">
        <Input
          id="cat_cor"
          name="cor"
          type="color"
          defaultValue="#667085"
          className="h-9 p-1"
        />
        <Erro texto={estado.campos?.cor} />
      </Campo>

      <Campo id="cat_ordem" rotulo="Ordem">
        <Input
          id="cat_ordem"
          name="ordem"
          inputMode="numeric"
          defaultValue="0"
        />
      </Campo>

      <div className="flex items-center gap-3 sm:col-span-4">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Adicionar categoria"}
        </Button>
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}

export function FormularioSubcategoria({
  categorias,
}: {
  categorias: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(
    salvarSubcategoriaAction,
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
      <input type="hidden" name="ativo" value="true" />

      <Campo id="sub_categoria" rotulo="Categoria" obrigatorio>
        <Select id="sub_categoria" name="categoria_id" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo id="sub_nome" rotulo="Nome" obrigatorio>
        <Input id="sub_nome" name="nome" required />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="sub_sla" rotulo="SLA (horas)" dica="Opcional.">
        <Input id="sub_sla" name="sla_horas" inputMode="numeric" />
        <Erro texto={estado.campos?.sla_horas} />
      </Campo>

      <Campo id="sub_ordem" rotulo="Ordem">
        <Input
          id="sub_ordem"
          name="ordem"
          inputMode="numeric"
          defaultValue="0"
        />
      </Campo>

      <div className="flex items-center gap-3 sm:col-span-4">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Adicionar subcategoria"}
        </Button>
        <Erro texto={estado.erro} />
      </div>
    </form>
  );
}
