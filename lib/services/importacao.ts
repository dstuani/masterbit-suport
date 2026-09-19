import { exigirPermissaoDeEscrita } from "@/lib/auth";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Inserir } from "@/lib/types/database";
import type { DadosImportacao, LinhaImportacao } from "@/lib/schemas/importacao";

export type ResultadoImportacao = {
  inseridos: number;
  ignorados: number;
  filiaisCriadas: string[];
  /** Linhas recusadas pelo banco, com o motivo — a planilha não é confiável. */
  erros: { linha: number; nome: string; motivo: string }[];
};

/** Quantas linhas por INSERT. Lotes evitam um payload gigante e isolam falhas. */
const TAMANHO_DO_LOTE = 100;

function chaveDeDuplicata(contato: { nome: string; email: string | null }) {
  // E-mail é o identificador confiável; sem ele, o nome normalizado serve de
  // aproximação. Duas pessoas homônimas sem e-mail vão colidir — por isso o
  // resultado informa quantas foram ignoradas, em vez de silenciar.
  return contato.email
    ? `email:${contato.email.toLowerCase()}`
    : `nome:${contato.nome.toLowerCase().replace(/\s+/g, " ")}`;
}

export async function importarContatos(dados: DadosImportacao): Promise<ResultadoImportacao> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const resultado: ResultadoImportacao = {
    inseridos: 0,
    ignorados: 0,
    filiaisCriadas: [],
    erros: [],
  };

  // ─── Filiais ───────────────────────────────────────────────────────────────
  const { data: filiaisExistentes, error: erroFiliais } = await supabase
    .from("filiais")
    .select("id, nome")
    .eq("cliente_id", dados.cliente_id);

  if (erroFiliais) throw new Error(traduzirErro(erroFiliais.message));

  const filialPorNome = new Map<string, string>();
  for (const filial of filiaisExistentes ?? []) {
    filialPorNome.set(filial.nome.toLowerCase(), filial.id);
  }

  if (dados.criar_filiais) {
    const novas = [
      ...new Set(
        dados.linhas
          .map((linha) => linha.filial)
          .filter((nome): nome is string => Boolean(nome) && !filialPorNome.has(nome!.toLowerCase())),
      ),
    ];

    if (novas.length > 0) {
      const { data: criadas, error } = await supabase
        .from("filiais")
        .insert(novas.map((nome) => ({ org_id: perfil.org_id, cliente_id: dados.cliente_id, nome })))
        .select("id, nome");

      if (error) throw new Error(traduzirErro(error.message));

      for (const filial of criadas ?? []) {
        filialPorNome.set(filial.nome.toLowerCase(), filial.id);
        resultado.filiaisCriadas.push(filial.nome);
      }
    }
  }

  // ─── Duplicados ────────────────────────────────────────────────────────────
  const jaCadastrados = new Set<string>();

  if (dados.ignorar_duplicados) {
    const { data: existentes, error } = await supabase
      .from("cliente_contatos")
      .select("nome, email")
      .eq("cliente_id", dados.cliente_id);

    if (error) throw new Error(traduzirErro(error.message));
    for (const contato of existentes ?? []) jaCadastrados.add(chaveDeDuplicata(contato));
  }

  // ─── Linhas a inserir ──────────────────────────────────────────────────────
  const paraInserir: { linha: number; nome: string; registro: Inserir<"cliente_contatos"> }[] = [];

  dados.linhas.forEach((linha: LinhaImportacao, indice) => {
    const chave = chaveDeDuplicata(linha);

    // Confere contra o banco e contra as linhas anteriores da própria planilha,
    // que costuma ter repetição interna.
    if (dados.ignorar_duplicados && jaCadastrados.has(chave)) {
      resultado.ignorados += 1;
      return;
    }
    jaCadastrados.add(chave);

    paraInserir.push({
      linha: indice + 2, // +2: cabeçalho da planilha e índice base 1
      nome: linha.nome,
      registro: {
        org_id: perfil.org_id,
        cliente_id: dados.cliente_id,
        filial_id: linha.filial ? (filialPorNome.get(linha.filial.toLowerCase()) ?? null) : null,
        nome: linha.nome,
        cargo: linha.cargo,
        setor: linha.setor,
        email: linha.email,
        telefone: linha.telefone,
        whatsapp: linha.whatsapp,
        observacoes: linha.observacoes,
        principal: false,
        ativo: true,
      },
    });
  });

  // ─── Inserção em lotes ─────────────────────────────────────────────────────
  for (let inicio = 0; inicio < paraInserir.length; inicio += TAMANHO_DO_LOTE) {
    const lote = paraInserir.slice(inicio, inicio + TAMANHO_DO_LOTE);

    const { error } = await supabase.from("cliente_contatos").insert(lote.map((i) => i.registro));

    if (!error) {
      resultado.inseridos += lote.length;
      continue;
    }

    // O lote inteiro falhou por causa de alguma linha. Reinserir uma a uma
    // identifica a culpada e salva as demais, em vez de perder as 100.
    for (const item of lote) {
      const { error: erroLinha } = await supabase.from("cliente_contatos").insert(item.registro);

      if (erroLinha) {
        resultado.erros.push({
          linha: item.linha,
          nome: item.nome,
          motivo: traduzirErro(erroLinha.message),
        });
      } else {
        resultado.inseridos += 1;
      }
    }
  }

  return resultado;
}
