// sw.js — Service Worker: cache offline do app shell e das bibliotecas de CDN
//
// IMPORTANTE: sempre que os arquivos do app forem alterados, aumente o número
// da versão abaixo (ex.: 'financas-cache-v2'). Isso força os celulares que já
// instalaram o PWA a baixarem os arquivos novos, em vez de continuar usando
// a versão antiga guardada em cache.
const CACHE_NAME = 'financas-cache-v2';

const ARQUIVOS_APP = [
  './',
  './index.html',
  './css/app.css',
  './js/db.js',
  './js/utils.js',
  './js/lancamentos.js',
  './js/reserva.js',
  './js/dashboard.js',
  './js/export.js',
  './js/backup.js',
  './js/ui-modais.js',
  './js/ui-contas.js',
  './js/ui-nova.js',
  './js/ui-dashboard.js',
  './js/ui-reserva.js',
  './js/ui-config.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const ARQUIVOS_CDN = [
  'https://unpkg.com/dexie@4.0.8/dist/dexie.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Instala o service worker e guarda em cache o app shell + bibliotecas externas.
// Cada arquivo é buscado individualmente (não com addAll) para que a falha em
// baixar um único arquivo (ex.: sem internet no primeiro acesso) não impeça
// o restante de ser cacheado.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const todos = [...ARQUIVOS_APP, ...ARQUIVOS_CDN];
      await Promise.all(
        todos.map(async (url) => {
          try {
            const resposta = await fetch(url, { cache: 'no-cache' });
            if (resposta.ok) await cache.put(url, resposta);
          } catch (erro) {
            console.warn('SW: não foi possível cachear', url, erro);
          }
        })
      );
      self.skipWaiting();
    })
  );
});

// Remove caches de versões antigas ao ativar a nova versão
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: cache primeiro, com atualização em segundo plano (stale-while-revalidate).
// Se o recurso não estiver em cache e não houver rede, cai no index.html (fallback de SPA offline).
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      const buscaRede = fetch(evento.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, respostaRede.clone()));
          }
          return respostaRede;
        })
        .catch(() => null);

      if (respostaCache) return respostaCache;

      return buscaRede.then((respostaRede) => {
        if (respostaRede) return respostaRede;
        if (evento.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
