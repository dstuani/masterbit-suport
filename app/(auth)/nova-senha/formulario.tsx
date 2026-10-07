"use client";

import { useActionState } from "react";

import { definirNovaSenha, type EstadoNovaSenha } from "./actions";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoNovaSenha = { erro: null };

export function FormularioNovaSenha() {
  const [estado, acao, pendente] = useActionState(definirNovaSenha, estadoInicial);

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <Logo tamanho="lg" className="mb-6" />

        <h1 className="text-base font-semibold">Crie uma nova senha</h1>

        <form action={acao} className="mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Ao menos 8 caracteres.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmacao">Repita a nova senha</Label>
            <Input
              id="confirmacao"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {estado.erro ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {estado.erro}
            </p>
          ) : null}

          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
