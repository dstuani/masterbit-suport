import { exigirPermissaoDeEscrita, type Perfil } from "@/lib/auth";
import {
  EXTENSOES_DE_IMAGEM,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_DE_ANEXO,
  assinaturaConfere,
  ehImagem,
  extensaoDe,
  limparNomeDoAnexo,
  type RefDeAnexo,
} from "@/lib/anexos";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tabelas } from "@/lib/types/database";

const BUCKET = "anexos";
const VALIDADE_DA_URL_SEGUNDOS = 60 * 60;

export type Anexo = Tabelas<"atendimento_anexos"> & { profiles: { nome: string } | null };
export type AnexoComUrl = Anexo & { url: string | null };
export type AnexoResolvido = RefDeAnexo & { url: string | null; tipoMime: string };

/** Validação, upload e registro do arquivo — sem tocar a timeline. */
async function processarUpload(
  perfil: Perfil,
  atendimentoId: string,
  arquivo: File,
): Promise<{ id: string; nome: string }> {
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

  // O RLS já esconde atendimento de outra organização; a consulta confirma que
  // ele existe e é visível antes de qualquer escrita.
  const { data: atendimento } = await supabase
    .from("atendimentos")
    .select("id")
    .eq("id", atendimentoId)
    .maybeSingle();
  if (!atendimento) throw new Error("Atendimento não encontrado");

  const id = crypto.randomUUID();
  const caminho = `${perfil.org_id}/${atendimentoId}/${id}.${extensao}`;

  // Metadado primeiro, arquivo depois: se o upload falhar, o registro é marcado
  // como removido. A ordem inversa deixaria arquivo órfão, e a API não apaga
  // objetos do bucket.
  const { error: erroRegistro } = await supabase.from("atendimento_anexos").insert({
    id,
    org_id: perfil.org_id,
    atendimento_id: atendimentoId,
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
      .from("atendimento_anexos")
      .update({ removido_em: new Date().toISOString() })
      .eq("id", id);
    throw new Error("Não foi possível enviar o arquivo. Tente novamente.");
  }

  return { id, nome };
}

/**
 * Envia um arquivo já amarrado a uma interação que o chamador vai criar (ex.: a
 * caixa de "o que foi feito", que junta texto e imagem num único registro da
 * timeline). Não cria interação própria — quem chama decide o que fazer com o id.
 */
export async function enviarAnexoBruto(
  atendimentoId: string,
  arquivo: File,
): Promise<{ id: string; nome: string }> {
  const perfil = await exigirPermissaoDeEscrita();
  return processarUpload(perfil, atendimentoId, arquivo);
}

/** Envio avulso (o card "Anexos"): cria sua própria entrada "Anexou X" na timeline. */
export async function enviarAnexo(atendimentoId: string, arquivo: File): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const { id, nome } = await processarUpload(perfil, atendimentoId, arquivo);

  const supabase = await criarClienteServidor();
  await supabase.from("atendimento_interacoes").insert({
    org_id: perfil.org_id,
    atendimento_id: atendimentoId,
    autor_id: perfil.id,
    tipo: "anexo",
    conteudo: `Anexou ${nome}`,
    anexos: [{ id, nome }],
  });
}

/** Resolve referências {id, nome} guardadas no jsonb da timeline para exibição, com URL assinada. */
export async function resolverAnexosCitados(refs: RefDeAnexo[]): Promise<Map<string, AnexoResolvido>> {
  const resultado = new Map<string, AnexoResolvido>();
  const ids = [...new Set(refs.map((r) => r.id))];
  if (ids.length === 0) return resultado;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("atendimento_anexos")
    .select("id, caminho, tipo_mime, nome_original")
    .in("id", ids)
    .is("removido_em", null);

  const bucket = supabase.storage.from(BUCKET);

  await Promise.all(
    (data ?? []).map(async (anexo) => {
      const imagem = ehImagem(anexo.tipo_mime);
      const { data: assinada } = await bucket.createSignedUrl(
        anexo.caminho,
        VALIDADE_DA_URL_SEGUNDOS,
        imagem ? undefined : { download: anexo.nome_original },
      );
      resultado.set(anexo.id, {
        id: anexo.id,
        nome: anexo.nome_original,
        url: assinada?.signedUrl ?? null,
        tipoMime: anexo.tipo_mime,
      });
    }),
  );

  return resultado;
}

export async function removerAnexo(anexoId: string): Promise<{ atendimentoId: string }> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { data: anexo } = await supabase
    .from("atendimento_anexos")
    .select("id, atendimento_id, nome_original, removido_em")
    .eq("id", anexoId)
    .maybeSingle();

  if (!anexo || anexo.removido_em) throw new Error("Anexo não encontrado");

  const { error } = await supabase
    .from("atendimento_anexos")
    .update({ removido_em: new Date().toISOString() })
    .eq("id", anexoId);
  if (error) throw new Error(traduzirErro(error.message));

  await supabase.from("atendimento_interacoes").insert({
    org_id: perfil.org_id,
    atendimento_id: anexo.atendimento_id,
    autor_id: perfil.id,
    tipo: "anexo",
    conteudo: `Removeu o anexo ${anexo.nome_original}`,
  });

  return { atendimentoId: anexo.atendimento_id };
}

/** Anexos ativos, com URL assinada de 1 hora — o bucket é privado. */
export async function listarAnexos(atendimentoId: string): Promise<AnexoComUrl[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("atendimento_anexos")
    .select("*, profiles(nome)")
    .eq("atendimento_id", atendimentoId)
    .is("removido_em", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(traduzirErro(error.message));
  const anexos = data ?? [];

  const bucket = supabase.storage.from(BUCKET);

  // Imagens abrem no navegador; os demais baixam com o nome original.
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
