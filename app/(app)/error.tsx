"use client";

import { TelaDeErro } from "@/components/layout/tela-de-erro";

// Dentro do layout da área logada: o menu lateral continua na tela.
export default function Erro({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <TelaDeErro error={error} retry={retry} />;
}
