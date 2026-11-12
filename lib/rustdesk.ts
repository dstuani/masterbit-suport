/** "123456789" → "123 456 789", como o RustDesk mostra. ID personalizado fica como veio. */
export function formatarIdRustdesk(id: string) {
  return /^\d{7,}$/.test(id) ? id.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : id;
}

/**
 * Abre o RustDesk instalado no computador do técnico já na conexão com a máquina.
 * A senha nunca vai no link: ele fica no histórico do navegador.
 */
export function linkRustdesk(id: string) {
  return `rustdesk://connection/new/${encodeURIComponent(id)}`;
}
