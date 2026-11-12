"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, MonitorSmartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { salvarSenhaRustdeskAction } from "@/app/(app)/equipamentos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { estadoInicial, type EstadoFormulario } from "@/lib/forms";

// Só os caracteres que a senha aceita (veja FORMATO_SENHA_RUSTDESK), sem os parecidos (0/O, 1/l/I).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*+=?";

function gerarSenha(tamanho = 16) {
  const sorteio = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(sorteio, (n) => ALFABETO[n % ALFABETO.length]).join("");
}

export function AcessoRemotoDoCliente({
  clienteId,
  senha,
  servidorConfigurado,
}: {
  clienteId: string;
  senha: string | null;
  servidorConfigurado: boolean;
}) {
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [pendente, setPendente] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [valor, setValor] = useState(senha ?? "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-muted-foreground" />
          Acesso remoto (RustDesk)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Senha permanente usada em todos os computadores deste cliente. O script de coleta instala o RustDesk e
          aplica esta senha; a ficha de cada equipamento mostra o ID e o botão Conectar.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!servidorConfigurado ? (
          <p className="rounded-app border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            O servidor RustDesk ainda não foi informado. Configure em{" "}
            <Link href="/configuracoes?aba=acesso-remoto" className="font-medium underline">
              Configurações → Acesso remoto
            </Link>
            ; sem ele o script não instala o RustDesk.
          </p>
        ) : null}

        <form
          action={async (formData) => {
            setPendente(true);
            const resultado = await salvarSenhaRustdeskAction(estadoInicial, formData);
            setPendente(false);
            setEstado(resultado);
            if (resultado.erro) toast.error(resultado.erro);
            else toast.success("Senha do RustDesk salva.");
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="cliente_id" value={clienteId} />
          <Campo
            id="senha_rustdesk"
            rotulo="Senha do RustDesk"
            obrigatorio
            dica="8 a 64 caracteres: letras, números e ! @ # % & * + = ? _ . : -"
          >
            <div className="flex flex-wrap gap-2">
              <Input
                id="senha_rustdesk"
                name="senha"
                type={visivel ? "text" : "password"}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                maxLength={64}
                required
                autoComplete="new-password"
                spellCheck={false}
                className="min-w-0 flex-1 font-mono"
                aria-invalid={estado.campos?.senha ? true : undefined}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setVisivel((v) => !v)}
                aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
                title={visivel ? "Esconder senha" : "Mostrar senha"}
              >
                {visivel ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValor(gerarSenha());
                  setVisivel(true);
                }}
              >
                <Sparkles />
                Gerar senha
              </Button>
            </div>
            {estado.campos?.senha ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {estado.campos.senha}
              </p>
            ) : null}
          </Campo>
          <div>
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : senha ? "Trocar senha" : "Salvar senha"}
            </Button>
          </div>
          {senha ? (
            <p className="text-xs text-muted-foreground">
              Trocar a senha aqui não muda os computadores já instalados: gere um script novo e rode o -Instalar de
              novo em cada máquina (ou troque a senha no próprio RustDesk dela).
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
