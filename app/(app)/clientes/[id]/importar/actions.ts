"use server";

import { revalidatePath } from "next/cache";

import { importacaoSchema } from "@/lib/schemas/importacao";
import { importarContatos, type ResultadoImportacao } from "@/lib/services/importacao";

type Resposta = { resultado: ResultadoImportacao } | { erro: string };

/**
 * Importa os contatos já mapeados pelo navegador.
 *
 * Recebe JSON em vez de FormData porque o payload é uma lista, não um
 * formulário. O schema revalida tudo: a Action é um endpoint POST público, e
 * "veio do nosso parser" não é garantia de nada.
 */
export async function importarContatosAction(dados: unknown): Promise<Resposta> {
  const analise = importacaoSchema.safeParse(dados);

  if (!analise.success) {
    const primeiro = analise.error.issues[0];
    const onde = primeiro?.path.join(".") ?? "";
    return { erro: onde ? `${onde}: ${primeiro?.message}` : (primeiro?.message ?? "Dados inválidos") };
  }

  try {
    const resultado = await importarContatos(analise.data);
    revalidatePath(`/clientes/${analise.data.cliente_id}`);
    return { resultado };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Não foi possível importar." };
  }
}
