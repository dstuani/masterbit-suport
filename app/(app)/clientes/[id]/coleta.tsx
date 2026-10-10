"use client";

import { useActionState, useState } from "react";
import { Download, KeyRound, ShieldOff } from "lucide-react";

import { gerarChaveAction, revogarChaveAction } from "@/app/(app)/equipamentos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EstadoChave } from "@/lib/schemas/equipamentos";
import type { ChaveDeColeta } from "@/lib/services/equipamentos";
import { cn, formatarData, formatarRelativo } from "@/lib/utils";

const inicial: EstadoChave = { erro: null };

function baixar(script: string) {
  // BOM: sem ele o PowerShell 5.1 lê o arquivo como ANSI e estraga os acentos.
  const blob = new Blob(["﻿" + script], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "coletar-inventario.ps1";
  link.click();
  URL.revokeObjectURL(url);
}

export function ColetaAutomatica({
  clienteId,
  chaves,
  podeEditar,
}: {
  clienteId: string;
  chaves: ChaveDeColeta[];
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState(gerarChaveAction, inicial);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const ativas = chaves.filter((c) => !c.revogada_em);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          Coleta automática
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Um script instalado em cada computador do cliente envia o hardware uma vez por dia e ao ligar. Ele
          usa uma chave deste cliente: quem tiver a chave só consegue enviar inventário para cá.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {podeEditar ? (
          estado.script && estado.chave ? (
            <div className="rounded-app border border-primary/40 bg-primary/5 p-4 text-sm" role="status">
              <p className="font-medium">Script gerado com uma chave nova.</p>
              <p className="mt-1 text-muted-foreground">
                Baixe agora: por segurança a chave não fica guardada e não aparece de novo. Se perder o arquivo,
                gere outra chave e revogue esta.
              </p>
              <Button type="button" size="sm" className="mt-3" onClick={() => baixar(estado.script!)}>
                <Download />
                Baixar coletar-inventario.ps1
              </Button>
              <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-muted-foreground">
                <li>Copie o arquivo para o computador (pen drive, pasta de rede ou acesso remoto).</li>
                <li>Abra o PowerShell como administrador na pasta do arquivo.</li>
                <li>
                  Rode:{" "}
                  <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-foreground">
                    powershell -ExecutionPolicy Bypass -File .\coletar-inventario.ps1 -Instalar
                  </code>
                </li>
                <li>A máquina aparece em Equipamentos em alguns segundos. Repita em cada computador.</li>
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Para ver o que seria enviado sem enviar nada, use <code>-Mostrar</code> no lugar de <code>-Instalar</code>.
                Para tirar de um computador, <code>-Remover</code>.
              </p>
            </div>
          ) : (
            <form action={acao} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input type="hidden" name="cliente_id" value={clienteId} />
              <div className="flex-1">
                <label htmlFor="descricao-chave" className="mb-1.5 block text-sm font-medium">
                  Identificação da chave <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <Input id="descricao-chave" name="descricao" maxLength={80} placeholder="Ex.: Matriz, Loja 2" />
              </div>
              <Button type="submit" disabled={pendente}>
                <KeyRound />
                {pendente ? "Gerando…" : ativas.length > 0 ? "Gerar outra chave e script" : "Gerar chave e script"}
              </Button>
            </form>
          )
        ) : null}

        {estado.erro ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {estado.erro}
          </p>
        ) : null}

        {chaves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Chave</th>
                  <th className="py-2 pr-3 font-medium">Criada</th>
                  <th className="py-2 pr-3 font-medium">Último envio</th>
                  <th className="py-2 pr-3 text-right font-medium">Envios</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {chaves.map((c) => (
                  <tr key={c.id} className={cn("border-b border-border last:border-0", c.revogada_em && "opacity-60")}>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs">{c.prefixo}…</span>
                      {c.descricao ? <span className="ml-2">{c.descricao}</span> : null}
                      {c.revogada_em ? (
                        <span className="ml-2 text-xs text-muted-foreground">revogada em {formatarData(c.revogada_em)}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{formatarData(c.criada_em)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.ultimo_uso_em ? formatarRelativo(c.ultimo_uso_em) : "Nunca"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.usos}</td>
                    <td className="py-2 text-right">
                      {podeEditar && !c.revogada_em ? (
                        confirmando === c.id ? (
                          <form action={revogarChaveAction} className="inline-flex items-center gap-1">
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="cliente_id" value={clienteId} />
                            <span className="text-xs text-muted-foreground">Os computadores com esta chave param de enviar.</span>
                            <Button type="submit" size="sm" variant="destructive">
                              Revogar
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
                              Cancelar
                            </Button>
                          </form>
                        ) : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(c.id)}>
                            <ShieldOff />
                            Revogar
                          </Button>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
