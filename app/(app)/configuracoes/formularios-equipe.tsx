"use client";

import { useActionState, useRef, useState } from "react";
import { Copy } from "lucide-react";

import {
  alterarPapelAction,
  alterarSenhaAction,
  alterarSituacaoAction,
  atualizarPerfilAction,
  criarUsuarioAction,
} from "./actions-equipe";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { estadoInicial, type EstadoFormulario } from "@/lib/forms";
import type { EstadoCriarUsuario } from "@/lib/schemas/equipe";

const ROTULOS_PAPEL = {
  owner: "Owner",
  tecnico: "Técnico",
  visualizador: "Visualizador",
} as const;

function Erro({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {texto}
    </p>
  );
}

function Aviso({ estado, salvo }: { estado: EstadoFormulario; salvo: boolean }) {
  if (estado.erro) return <Erro texto={estado.erro} />;
  if (salvo) return <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvo.</span>;
  return null;
}

export function FormularioPerfil({ nome, telefone }: { nome: string; telefone: string | null }) {
  const [estado, acao, pendente] = useActionState(atualizarPerfilAction, estadoInicial);
  const [salvo, setSalvo] = useState(false);

  return (
    <form
      action={async (formData) => {
        setSalvo(false);
        await acao(formData);
        setSalvo(true);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <Campo id="perfil_nome" rotulo="Nome" obrigatorio>
        <Input id="perfil_nome" name="nome" defaultValue={nome} required />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="perfil_telefone" rotulo="Telefone">
        <Input id="perfil_telefone" name="telefone" defaultValue={telefone ?? ""} />
      </Campo>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar perfil"}
        </Button>
        <Aviso estado={estado} salvo={salvo} />
      </div>
    </form>
  );
}

export function FormularioSenha() {
  const [estado, acao, pendente] = useActionState(alterarSenhaAction, estadoInicial);
  const [salvo, setSalvo] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (formData) => {
        setSalvo(false);
        await acao(formData);
        form.current?.reset();
        setSalvo(true);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <Campo id="senha" rotulo="Nova senha" obrigatorio dica="Mínimo de 8 caracteres.">
        <Input id="senha" name="senha" type="password" autoComplete="new-password" required />
        <Erro texto={estado.campos?.senha} />
      </Campo>

      <Campo id="confirmacao" rotulo="Confirmar senha" obrigatorio>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
        />
        <Erro texto={estado.campos?.confirmacao} />
      </Campo>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" variant="outline" disabled={pendente}>
          {pendente ? "Alterando…" : "Alterar senha"}
        </Button>
        <Aviso estado={estado} salvo={salvo && !estado.erro} />
      </div>
    </form>
  );
}

/**
 * Criação de usuário sem passar pelo painel do Supabase.
 *
 * Sem e-mail configurado no projeto, a única forma de entregar o acesso é uma
 * senha temporária — o sistema gera, mostra uma vez na tela para o owner copiar e
 * repassar por fora (WhatsApp, presencialmente), e a pessoa troca no primeiro
 * acesso em Configurações → Conta.
 */
export function FormularioNovoUsuario() {
  const [estado, acao, pendente] = useActionState<EstadoCriarUsuario, FormData>(
    criarUsuarioAction,
    estadoInicial,
  );
  const [copiado, setCopiado] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  async function copiar(senha: string) {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de clipboard (ex.: contexto não-seguro): a senha continua
      // selecionável na tela, só não copia com um clique.
    }
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
      <Campo id="novo_nome" rotulo="Nome" obrigatorio className="sm:col-span-2">
        <Input id="novo_nome" name="nome" required />
        <Erro texto={estado.campos?.nome} />
      </Campo>

      <Campo id="novo_email" rotulo="E-mail" obrigatorio className="sm:col-span-2">
        <Input id="novo_email" name="email" type="email" required />
        <Erro texto={estado.campos?.email} />
      </Campo>

      <Campo id="novo_role" rotulo="Papel" dica="Owner se promove depois, na lista abaixo.">
        <Select id="novo_role" name="role" defaultValue="tecnico">
          <option value="tecnico">Técnico</option>
          <option value="visualizador">Visualizador</option>
        </Select>
      </Campo>

      <div className="flex items-end sm:col-span-3">
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pendente}>
            {pendente ? "Criando…" : "Criar usuário"}
          </Button>
          <Erro texto={estado.erro} />
        </div>
      </div>

      {estado.senhaTemporaria ? (
        <div className="rounded-app border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950 sm:col-span-4">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">
            {estado.emailCriado} criado. Repasse a senha abaixo por um canal seguro — ela some ao
            sair desta página.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded border border-emerald-300 bg-white px-2 py-1 font-mono text-sm dark:border-emerald-800 dark:bg-black/20">
              {estado.senhaTemporaria}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copiar(estado.senhaTemporaria!)}
            >
              <Copy className="size-3.5" />
              {copiado ? "Copiada" : "Copiar"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            Peça para trocar em Configurações → Conta assim que entrar.
          </p>
        </div>
      ) : null}
    </form>
  );
}

export function ControlesDoMembro({
  id,
  role,
  ativo,
  ehVoce,
}: {
  id: string;
  role: keyof typeof ROTULOS_PAPEL;
  ativo: boolean;
  ehVoce: boolean;
}) {
  const [estadoPapel, acaoPapel, pendentePapel] = useActionState(alterarPapelAction, estadoInicial);
  const [estadoSituacao, acaoSituacao, pendenteSituacao] = useActionState(
    alterarSituacaoAction,
    estadoInicial,
  );

  if (ehVoce) {
    return <span className="text-xs text-muted-foreground">Você</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={acaoPapel} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={id} />
          <Select
            name="role"
            defaultValue={role}
            aria-label="Papel"
            className="h-8 w-36"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            disabled={pendentePapel}
          >
            {Object.entries(ROTULOS_PAPEL).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </Select>
        </form>

        <form action={acaoSituacao}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="ativo" value={ativo ? "false" : "true"} />
          <Button type="submit" size="sm" variant="outline" disabled={pendenteSituacao}>
            {ativo ? "Desativar" : "Reativar"}
          </Button>
        </form>
      </div>
      <Erro texto={estadoPapel.erro ?? estadoSituacao.erro} />
    </div>
  );
}
