const CACHE_NAME = 'barberpro-v3.2'; // Atualizei a versão para forçar o navegador a ler o novo arquivo
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/barber-shop.png',
];

// ========== INSTALL (Cache inicial) ==========
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Instalando Service Worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ========== ACTIVATE (Limpeza de caches antigos) ==========
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Service Worker ativado e pronto');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ========== FETCH (Interceptação de requisições) ==========
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORAR REQUISIÇÕES PARA A API (Deixar o tráfego da API livre)
  if (url.hostname.includes('api.contafacilpro.com.br') || url.pathname.includes('/api/')) {
    return; // Não faz cache das chamadas de API para não vir dado velho
  }

  // 2. NAVEGAÇÃO (HTML) - Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/') || caches.match(OFFLINE_URL))
    );
    return;
  }

  // 3. ATIVOS ESTÁTICOS (Imagens, Scripts, CSS) - Cache First
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          // Apenas faz cache de respostas válidas
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Se falhar e for imagem, pode retornar um fallback aqui se quiser
        });
      })
    );
  }
});

// ========== MESSAGE HANDLER ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});