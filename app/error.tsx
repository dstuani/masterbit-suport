"use client";

import { TelaDeErro } from "@/components/layout/tela-de-erro";

// Rede de segurança para o que não está na área logada (login, recuperação de senha).
export default function Erro({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <TelaDeErro error={error} retry={retry} destino="/login" />
    </div>
  );
}
