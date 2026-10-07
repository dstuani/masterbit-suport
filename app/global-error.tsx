"use client";

import { useEffect } from "react";

/**
 * Último recurso: erro no layout raiz. Este arquivo substitui o documento inteiro e
 * roda sem o CSS global (nem Tailwind), por isso o estilo é inline e as cores seguem
 * o esquema do sistema operacional.
 */
export default function ErroGlobal({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <head>
        <title>Algo deu errado · Masterbit Suport</title>
        <style>{`
          :root { color-scheme: light dark; }
          body { margin: 0; font-family: system-ui, sans-serif; background: Canvas; color: CanvasText; }
          .caixa { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px; }
          .cartao { max-width: 420px; text-align: center; }
          button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 0; background: #c4561b; color: #fff; cursor: pointer; }
          p { color: GrayText; font-size: 14px; }
          code { font-size: 12px; }
        `}</style>
      </head>
      <body>
        <div className="caixa">
          <div className="cartao">
            <h1 style={{ fontSize: 18 }}>Algo deu errado</h1>
            <p>O sistema não conseguiu carregar. Tente de novo; se continuar, avise o administrador.</p>
            <button type="button" onClick={() => retry()}>
              Tentar de novo
            </button>
            {error.digest ? (
              <p>
                Código do erro: <code>{error.digest}</code>
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
