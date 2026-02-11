const CACHE_NAME = 'barberpro-v3.1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/barber-shop.png',
];

// ========== INSTALL ==========
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Instalando Service Worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Service Worker ativado');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ========== FETCH (INTERCEPTAÇÃO) ==========
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // 🌐 NAVEGAÇÃO (HTML)
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

  // 📦 CACHE-FIRST PARA OUTROS RECURSOS
  if (event.request.method === 'GET') {
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
  }
});

// ========== FUNÇÃO: GERAR MANIFEST DINÂMICO ==========
async function handleManifestRequest(request) {
  try {
    // Pega a slug do cliente (URL que solicitou o manifest)
    const clients = await self.clients.matchAll({ type: 'window' });
    let slug = 'barberpro';
    let shopName = 'BarberPro';

    if (clients.length > 0) {
      const clientUrl = new URL(clients[0].url);
      const pathParts = clientUrl.pathname.split('/').filter(Boolean);
      
      // Lista de rotas reservadas
      const RESERVED = [
        'admin', 'login', 'profile', 'settings', 
        'create_barbershop', 'my_appointments', 
        'registrar', 'install', ''
      ];

      // Pega a primeira parte do path se não for rota reservada
      if (pathParts.length > 0 && !RESERVED.includes(pathParts[0])) {
        slug = pathParts[0];
        shopName = slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    }

    console.log('📄 [SW] Gerando manifest para slug:', slug);

    // Constrói o manifest dinâmico
    const manifest = {
      name: `BarberPro - ${shopName}`,
      short_name: shopName,
      start_url: `/${slug}`,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: '#f59e0b',
      background_color: '#09090b',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    return new Response(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('❌ [SW] Erro ao gerar manifest:', error);
    
    // Fallback: manifest padrão
    const fallbackManifest = {
      name: 'BarberPro',
      short_name: 'BarberPro',
      start_url: '/',
      display: 'standalone',
      theme_color: '#f59e0b',
      background_color: '#09090b',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    };

    return new Response(JSON.stringify(fallbackManifest), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ========== MESSAGE HANDLER (PARA COMUNICAÇÃO COM O APP) ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
