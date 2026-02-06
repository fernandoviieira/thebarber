const CACHE_NAME = 'barberpro-v1';
const OFFLINE_URL = '/offline.html';

// Arquivos essenciais para cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/barber-shop.png',
];

// Instalação - cacheia recursos estáticos
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('⚠️ Alguns recursos não foram cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('✅ SW: Ativado');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
           .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ✅ ESTRATÉGIA PARA NAVEGAÇÃO: 
  // Se for uma navegação de página (ex: /slug), retorna o index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/'); // Retorna a raiz onde o React está
      })
    );
    return;
  }

  // Estratégia para arquivos estáticos (JS, CSS, Imagens)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
