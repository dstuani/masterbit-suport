import { NextResponse } from "next/server";

import { obterUsuario } from "@/lib/auth";
import { contextoDoCliente } from "@/lib/services/atendimentos";

/**
 * Filiais, contatos e sistemas de um cliente, para os selects dependentes do
 * formulário de atendimento.
 *
 * É Route Handler e não Server Action porque a chamada é uma leitura disparada
 * por mudança de select, não uma mutação — Server Actions são sempre POST e
 * serializam entre si.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Route Handlers são endpoints públicos: a sessão é conferida aqui, e o RLS
  // confere de novo no banco.
  if (!(await obterUsuario())) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    return NextResponse.json(await contextoDoCliente(id));
  } catch {
    return NextResponse.json({ filiais: [], contatos: [], sistemas: [] }, { status: 200 });
  }
}
