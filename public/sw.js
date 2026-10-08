// Service worker do Masterbit Suport.
//
// Faz uma coisa só: quando a pessoa abre o app sem internet, mostra /offline.html
// em vez do erro do navegador. Não guarda páginas nem respostas do sistema — os
// dados são de clientes e exigem login, então nada deles pode ficar no aparelho.

const VERSAO = "v1";
const CACHE = `suport-offline-${VERSAO}`;
const PAGINA_OFFLINE = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.add(PAGINA_OFFLINE)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  // Só navegações (abrir uma página). Ações do sistema e chamadas à API passam direto.
  if (pedido.mode !== "navigate") return;

  evento.respondWith(
    fetch(pedido).catch(() => caches.open(CACHE).then((cache) => cache.match(PAGINA_OFFLINE))),
  );
});
