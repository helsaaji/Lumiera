// =============================================
//  BRAND BUILDER KIT — SERVICE WORKER v2.0
// =============================================

const CACHE_NAME = 'bbk-cache-v2';
const OFFLINE_URL = './index.html';

// Aset yang di-cache saat install
const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png',
];

// =============================================
//  INSTALL — Precache core assets
// =============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// =============================================
//  ACTIVATE — Hapus cache lama
// =============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// =============================================
//  FETCH — Stale-while-revalidate strategy
// =============================================
self.addEventListener('fetch', event => {
  // Lewati request non-GET
  if (event.request.method !== 'GET') return;

  // Lewati request ke domain luar (Google Fonts, dll)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Simpan response terbaru ke cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline dan request ke halaman HTML, kembalikan offline page
          if (event.request.destination === 'document') {
            return cache.match(OFFLINE_URL);
          }
        });

      // Kembalikan cache dulu (jika ada), sambil update di background
      return cachedResponse || fetchPromise;
    })
  );
});

// =============================================
//  BACKGROUND SYNC (opsional)
// =============================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-brand-data') {
    console.log('[BBK SW] Background sync triggered');
  }
});

// =============================================
//  PUSH NOTIFICATIONS (opsional)
// =============================================
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'Brand Builder Kit',
    body: 'Ada update baru untuk kamu!',
    icon: './icons/icon-192x192.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icons/icon-192x192.png',
      badge: './icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});