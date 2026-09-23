import { exigirPermissaoDeEscrita } from "@/lib/auth";
import {
  EXTENSOES_DE_IMAGEM,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_DE_ANEXO,
  assinaturaConfere,
  extensaoDe,
  limparNomeDoAnexo,
} from "@/lib/anexos";
import type { DadosComentario, DadosStatusTopico, DadosTopico } from "@/lib/schemas/consultoria";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

const BUCKET = "anexos";
const VALIDADE_DA_URL_SEGUNDOS = 60 * 60;

export type Projeto = Tabelas<"consultoria_projetos">;
export type Topico = Tabelas<"consultoria_topicos">;
export type Comentario = Tabelas<"consultoria_comentarios"> & { profiles: { nome: string } | null };
export type AnexoDoTopico = Tabelas<"consultoria_anexos"> & {
  profiles: { nome: string } | null;
  url: string | null;
};

/**
 * Por ora sempre um projeto só (o mais antigo ativo). Quando existir um segundo
 * projeto de consultoria, esta função vira uma lista com seletor — hoje, simplifica
 * a tela indo direto ao ponto.
 */
export async function obterProjetoPrincipal(): Promise<Projeto | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("consultoria_projetos")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function listarTopicos(projetoId: string): Promise<Topico[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("consultoria_topicos")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("ordem")
    .order("created_at");

  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

export async function obterTopico(id: string): Promise<Topico | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("consultoria_topicos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function criarTopico(dados: DadosTopico): Promise<string> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { count } = await supabase
    .from("consultoria_topicos")
    .select("id", { count: "exact", head: true })
    .eq("projeto_id", dados.projeto_id);

  const { data, error } = await supabase
    .from("consultoria_topicos")
    .insert({ ...dados, org_id: perfil.org_id, ordem: (count ?? 0) + 1 })
    .select("id")
    .single();

  if (error) throw new Error(traduzirErro(error.message));
  return data.id;
}

export async function mudarStatusTopico(dados: DadosStatusTopico): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("consultoria_topicos")
    .update({ status: dados.status })
    .eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));
}

export async function listarComentarios(topicoId: string): Promise<Comentario[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("consultoria_comentarios")
    .select("*, profiles(nome)")
    .eq("topico_id", topicoId)
    .order("created_at");

  if (error) throw new Error(traduzirErro(error.message));
  return data ?? [];
}

export async function registrarComentario(dados: DadosComentario): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("consultoria_comentarios").insert({
    org_id: perfil.org_id,
    topico_id: dados.topico_id,
    autor_id: perfil.id,
    conteudo: dados.conteudo,
  });

  if (error) throw new Error(traduzirErro(error.message));
}

// ─── Anexos do tópico ──────────────────────────────────────────────────────
// Mesmo padrão de lib/services/anexos.ts (atendimentos), reaproveitando o mesmo
// bucket "anexos" — a policy de storage só confere a pasta da organização.

export async function enviarAnexoTopico(topicoId: string, arquivo: File): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();

  const nome = limparNomeDoAnexo(arquivo.name);
  const extensao = extensaoDe(nome);
  const tipoMime = TIPOS_DE_ANEXO[extensao];

  if (!tipoMime) throw new Error(`Tipo de arquivo não permitido (.${extensao || "sem extensão"})`);
  if (arquivo.size === 0) throw new Error("O arquivo está vazio");
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) throw new Error("O arquivo passa de 10 MB");

  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  if (!assinaturaConfere(extensao, conteudo)) {
    throw new Error("O conteúdo do arquivo não corresponde à extensão");
  }

  const supabase = await criarClienteServidor();

  const { data: topico } = await supabase
    .from("consultoria_topicos")
    .select("id")
    .eq("id", topicoId)
    .maybeSingle();
  if (!topico) throw new Error("Tópico não encontrado");

  const id = crypto.randomUUID();
  const caminho = `${perfil.org_id}/consultoria/${topicoId}/${id}.${extensao}`;

  const { error: erroRegistro } = await supabase.from("consultoria_anexos").insert({
    id,
    org_id: perfil.org_id,
    topico_id: topicoId,
    caminho,
    nome_original: nome,
    tipo_mime: tipoMime,
    tamanho_bytes: arquivo.size,
    enviado_por: perfil.id,
  });
  if (erroRegistro) throw new Error(traduzirErro(erroRegistro.message));

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, conteudo, { contentType: tipoMime, upsert: false });

  if (erroUpload) {
    await supabase
      .from("consultoria_anexos")
      .update({ removido_em: new Date().toISOString() })
      .eq("id", id);
    throw new Error("Não foi possível enviar o arquivo. Tente novamente.");
  }

  await supabase.from("consultoria_comentarios").insert({
    org_id: perfil.org_id,
    topico_id: topicoId,
    autor_id: perfil.id,
    conteudo: `Anexou ${nome}`,
  });
}

export async function removerAnexoTopico(anexoId: string): Promise<{ topicoId: string }> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data: anexo } = await supabase
    .from("consultoria_anexos")
    .select("id, topico_id, nome_original, removido_em")
    .eq("id", anexoId)
    .maybeSingle();

  if (!anexo || anexo.removido_em) throw new Error("Anexo não encontrado");

  const { error } = await supabase
    .from("consultoria_anexos")
    .update({ removido_em: new Date().toISOString() })
    .eq("id", anexoId);
  if (error) throw new Error(traduzirErro(error.message));

  await supabase.from("consultoria_comentarios").insert({
    org_id: perfil.org_id,
    topico_id: anexo.topico_id,
    autor_id: perfil.id,
    conteudo: `Removeu o anexo ${anexo.nome_original}`,
  });

  return { topicoId: anexo.topico_id };
}

export async function listarAnexosTopico(topicoId: string): Promise<AnexoDoTopico[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("consultoria_anexos")
    .select("*, profiles(nome)")
    .eq("topico_id", topicoId)
    .is("removido_em", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(traduzirErro(error.message));
  const anexos = data ?? [];

  const bucket = supabase.storage.from(BUCKET);

  return Promise.all(
    anexos.map(async (anexo) => {
      const imagem = EXTENSOES_DE_IMAGEM.includes(extensaoDe(anexo.caminho));
      const { data: assinada } = await bucket.createSignedUrl(
        anexo.caminho,
        VALIDADE_DA_URL_SEGUNDOS,
        imagem ? undefined : { download: anexo.nome_original },
      );
      return { ...anexo, url: assinada?.signedUrl ?? null };
    }),
  );
}
