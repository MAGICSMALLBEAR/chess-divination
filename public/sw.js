// 象棋占卜 Service Worker v2 — 離線完整支援
// 網路優先策略：先嘗試網路，失敗時回退到快取，確保內容最新
const CACHE_NAME = 'chess-divination-v2';

const STATIC_ROUTES = [
  '/',
  '/draw',
  '/board',
  '/reveal',
  '/library',
  '/stats',
  '/collection',
  '/settings',
  '/onboarding',
  '/achievements',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ROUTES))
  );
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  (self as any).clients.claim();
});

// 網路優先：成功時更新快取，失敗時從快取回應
self.addEventListener('fetch', (event: any) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response(
            '您目前處於離線模式。請連接網路後重試。',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
          );
        });
      })
  );
});
