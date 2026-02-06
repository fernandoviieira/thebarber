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

// Fetch - Network First, fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cacheia respostas bem-sucedidas
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback para cache
        return caches.match(event.request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});
