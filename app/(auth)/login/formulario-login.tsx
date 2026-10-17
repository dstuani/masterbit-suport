"use client";

import { useActionState } from "react";
import Link from "next/link";

import { entrar, type EstadoLogin } from "./actions";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoLogin = { erro: null };

export function FormularioLogin({ de, aviso }: { de: string; aviso: string | null }) {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  return (
    <div className="w-full max-w-sm">
      {/* Painel da marca fica escondido no celular: a logo passa para cá. */}
      <Logo tamanho="lg" className="mb-8 lg:hidden" />

      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Digite seu e-mail e sua senha.</p>

      <form action={acao} className="flex flex-col gap-4">
        <input type="hidden" name="de" value={de} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>

        {(estado.erro ?? aviso) ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {estado.erro ?? aviso}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pendente}>
          {pendente ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-5 text-xs text-muted-foreground">
        Esqueceu a senha?{" "}
        <Link href="/recuperar-senha" className="font-medium text-foreground hover:underline">
          Receba um link por e-mail
        </Link>
        .
      </p>
    </div>
  );
}
