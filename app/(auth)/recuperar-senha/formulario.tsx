"use client";

import { useActionState } from "react";
import Link from "next/link";

import { solicitarRecuperacao, type EstadoRecuperacao } from "./actions";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoRecuperacao = { erro: null, enviado: false };

export function FormularioRecuperacao({ aviso }: { aviso: string | null }) {
  const [estado, acao, pendente] = useActionState(solicitarRecuperacao, estadoInicial);

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <Logo tamanho="lg" className="mb-6" />

        <h1 className="text-base font-semibold">Recuperar senha</h1>

        {estado.enviado ? (
          <div className="mt-3 flex flex-col gap-4 text-sm">
            <p role="status">
              Se este e-mail estiver cadastrado, enviamos um link para criar uma nova senha.
              Confira também a caixa de spam.
            </p>
            <p className="text-muted-foreground">
              Abra o link no <strong className="font-medium">mesmo navegador</strong> em que fez
              este pedido. Ele vale por pouco tempo e só funciona uma vez.
            </p>
            <Link href="/login" className="text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form action={acao} className="mt-3 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
            </div>

            {estado.erro ?? aviso ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {estado.erro ?? aviso}
              </p>
            ) : null}

            <Button type="submit" disabled={pendente}>
              {pendente ? "Enviando…" : "Enviar link"}
            </Button>

            <Link href="/login" className="text-center text-sm text-muted-foreground hover:underline">
              Voltar ao login
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
