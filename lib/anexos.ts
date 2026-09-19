/**
 * Regras dos anexos, compartilhadas entre o formulário (cliente) e o serviço
 * (servidor). O cliente usa só para avisar cedo; quem decide é o servidor.
 */

export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

/**
 * Extensões aceitas e o tipo que o servidor grava para cada uma. O tipo enviado
 * pelo navegador não é confiável (e vem vazio para .log e .xml no Windows), então
 * a extensão manda. SVG e HTML ficam de fora de propósito: executam script.
 */
export const TIPOS_DE_ANEXO: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const EXTENSOES_DE_IMAGEM = ["png", "jpg", "jpeg", "gif", "webp"];

export const ACCEPT_DO_INPUT = Object.keys(TIPOS_DE_ANEXO)
  .map((ext) => `.${ext}`)
  .join(",");

export function extensaoDe(nome: string): string {
  const posicao = nome.lastIndexOf(".");
  return posicao === -1 ? "" : nome.slice(posicao + 1).toLowerCase();
}

export function ehImagem(tipoMime: string): boolean {
  return tipoMime.startsWith("image/");
}
