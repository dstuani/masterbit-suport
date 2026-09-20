"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";

import { criarAtendimentoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CANAIS, PRIORIDADES, TIPOS_ATENDIMENTO } from "@/lib/constants";
import { estadoInicial } from "@/lib/forms";

type Opcoes = {
  clientes: { id: string; razao_social: string }[];
  categorias: { id: string; nome: string }[];
  subcategorias: { id: string; nome: string; categoria_id: string }[];
  sistemas: { id: string; nome: string }[];
};

type ContextoCliente = {
  filiais: { id: string; nome: string }[];
  contatos: { id: string; nome: string }[];
  sistemas: { id: string; nome: string }[];
};

const CONTEXTO_VAZIO: ContextoCliente = { filiais: [], contatos: [], sistemas: [] };

export function FormularioAtendimento({
  opcoes,
  clienteInicial,
  tituloInicial,
}: {
  opcoes: Opcoes;
  clienteInicial?: string;
  tituloInicial?: string;
}) {
  const [estado, acao, pendente] = useActionState(criarAtendimentoAction, estadoInicial);
  const [clienteId, setClienteId] = useState(clienteInicial ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [contexto, setContexto] = useState<ContextoCliente>(CONTEXTO_VAZIO);

  // Filiais, contatos e sistemas dependem do cliente escolhido. Buscar sob demanda
  // evita mandar o cadastro inteiro de todos os clientes para o navegador.
  //
  // A busca acontece no onChange, não num efeito: é reação a um evento do usuário,
  // e o contador descarta respostas de uma seleção que já foi trocada.
  const requisicao = useRef(0);

  async function trocarCliente(novoId: string) {
    setClienteId(novoId);
    const atual = ++requisicao.current;

    if (!novoId) {
      setContexto(CONTEXTO_VAZIO);
      return;
    }

    try {
      const resposta = await fetch(`/api/clientes/${novoId}/contexto`);
      const dados = resposta.ok ? await resposta.json() : CONTEXTO_VAZIO;
      if (atual === requisicao.current) setContexto(dados);
    } catch {
      if (atual === requisicao.current) setContexto(CONTEXTO_VAZIO);
    }
  }

  const subcategorias = opcoes.subcategorias.filter((s) => s.categoria_id === categoriaId);

  // Sistemas do cliente primeiro; se ele não tem nenhum vinculado, cai no catálogo.
  const sistemas = contexto.sistemas.length > 0 ? contexto.sistemas : opcoes.sistemas;

  const erroDe = (campo: string) => estado.campos?.[campo];

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>O essencial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="cliente_id" rotulo="Cliente" obrigatorio>
            <Select
              id="cliente_id"
              name="cliente_id"
              required
              value={clienteId}
              onChange={(e) => trocarCliente(e.target.value)}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {opcoes.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.razao_social}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("cliente_id")} />
          </Campo>

          <Campo id="canal" rotulo="Canal">
            <Select id="canal" name="canal" defaultValue="telefone">
              {Object.entries(CANAIS).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo id="titulo" rotulo="Assunto" obrigatorio className="sm:col-span-2">
            <Input
              id="titulo"
              name="titulo"
              required
              autoFocus
              defaultValue={tituloInicial}
              placeholder="Ex.: NF-e rejeitada com erro 539"
            />
            <Mensagem texto={erroDe("titulo")} />
          </Campo>

          <Campo id="categoria_id" rotulo="Categoria">
            <Select
              id="categoria_id"
              name="categoria_id"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {opcoes.categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("categoria_id")} />
          </Campo>

          <Campo id="subcategoria_id" rotulo="Subcategoria">
            <Select id="subcategoria_id" name="subcategoria_id" disabled={subcategorias.length === 0}>
              <option value="">
                {categoriaId ? "Sem subcategoria" : "Escolha a categoria antes"}
              </option>
              {subcategorias.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("subcategoria_id")} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Campo id="filial_id" rotulo="Filial">
            <Select id="filial_id" name="filial_id" disabled={contexto.filiais.length === 0}>
              <option value="">Matriz / não informada</option>
              {contexto.filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("filial_id")} />
          </Campo>

          <Campo id="contato_id" rotulo="Quem falou">
            <Select id="contato_id" name="contato_id" disabled={contexto.contatos.length === 0}>
              <option value="">Não informado</option>
              {contexto.contatos.map((contato) => (
                <option key={contato.id} value={contato.id}>
                  {contato.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("contato_id")} />
          </Campo>

          <Campo id="sistema_id" rotulo="Sistema">
            <Select id="sistema_id" name="sistema_id">
              <option value="">Não informado</option>
              {sistemas.map((sistema) => (
                <option key={sistema.id} value={sistema.id}>
                  {sistema.nome}
                </option>
              ))}
            </Select>
            <Mensagem texto={erroDe("sistema_id")} />
          </Campo>

          <Campo id="tipo" rotulo="Tipo">
            <Select id="tipo" name="tipo" defaultValue="duvida">
              {Object.entries(TIPOS_ATENDIMENTO).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo id="prioridade" rotulo="Prioridade">
            <Select id="prioridade" name="prioridade" defaultValue="media">
              {Object.entries(PRIORIDADES).map(([chave, info]) => (
                <option key={chave} value={chave}>
                  {info.rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo
            id="descricao"
            rotulo="Descrição"
            dica="O que o cliente relatou, com as palavras dele."
            className="sm:col-span-3"
          >
            <Textarea id="descricao" name="descricao" />
            <Mensagem texto={erroDe("descricao")} />
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
          {pendente ? "Abrindo…" : "Abrir atendimento"}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href="/atendimentos">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

function Mensagem({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600 dark:text-red-400">{texto}</p>;
}
