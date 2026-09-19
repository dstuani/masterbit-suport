"use client";

import { useActionState } from "react";

import { entrar, type EstadoLogin } from "./actions";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoLogin = { erro: null };

export function FormularioLogin({ de }: { de: string }) {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <Logo tamanho="lg" className="mb-6" />

        <form action={acao} className="flex flex-col gap-4">
          <input type="hidden" name="de" value={de} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {estado.erro ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {estado.erro}
            </p>
          ) : null}

          <Button type="submit" disabled={pendente} className="mt-1">
            {pendente ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
