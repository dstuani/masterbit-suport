import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseConfigurado } from "@/lib/env";
import { ehImagem } from "@/lib/anexos";
import {
  listarAnexosTopico,
  listarComentarios,
  obterTopico,
} from "@/lib/services/consultoria";
import { formatarRelativo, formatarTamanho } from "@/lib/utils";
import { EnviarAnexosDoTopico, RemoverAnexoDoTopico } from "../anexos";
import { CaixaDeComentario, LinhaDoTempo } from "../comentarios";
import { SeletorDeStatus } from "../status";

export default async function TopicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!supabaseConfigurado) return <AvisoSupabase />;

  const topico = await obterTopico(id);
  if (!topico) notFound();

  const [comentarios, anexos] = await Promise.all([
    listarComentarios(id),
    listarAnexosTopico(id),
  ]);

  return (
    <>
      <Link
        href="/consultoria"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Consultoria
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {topico.codigo ? (
            <span className="font-mono text-sm text-muted-foreground">{topico.codigo}</span>
          ) : null}
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{topico.titulo}</h1>
        </div>
        <SeletorDeStatus topicoId={id} statusAtual={topico.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-5">
              <CaixaDeComentario topicoId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comentários</CardTitle>
            </CardHeader>
            <CardContent>
              <LinhaDoTempo comentarios={comentarios} />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          {topico.descricao ? (
            <Card>
              <CardHeader>
                <CardTitle>Escopo</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{topico.descricao}</CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>
                Anexos
                {anexos.length > 0 ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({anexos.length})
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {anexos.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {anexos.map((anexo) => (
                    <li key={anexo.id} className="flex items-center gap-2.5">
                      {anexo.url && ehImagem(anexo.tipo_mime) ? (
                        <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {/* URL assinada externa: next/image exigiria configurar o domínio do Storage. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={anexo.url}
                            alt={anexo.nome_original}
                            className="size-12 rounded-app border border-border object-cover"
                          />
                        </a>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        {anexo.url ? (
                          <a
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate font-medium text-primary hover:underline"
                          >
                            {anexo.nome_original}
                          </a>
                        ) : (
                          <span className="block truncate font-medium">{anexo.nome_original}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatarTamanho(anexo.tamanho_bytes)}
                          {anexo.profiles?.nome ? ` · ${anexo.profiles.nome}` : ""}
                          {" · "}
                          {formatarRelativo(anexo.created_at)}
                        </span>
                      </div>
                      <RemoverAnexoDoTopico anexoId={anexo.id} nome={anexo.nome_original} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum anexo.</p>
              )}
              <EnviarAnexosDoTopico topicoId={id} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
