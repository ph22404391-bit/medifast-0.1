// ═══════════════════════════════════════════
// MEDIFAST SERVICE WORKER v1.0
// Enables offline support, caching & PWA
// ═══════════════════════════════════════════

const CACHE_NAME = 'medifast-v1.0';
const OFFLINE_URL = '/medifast-0.1/offline.html';

// Files to cache for offline use
const STATIC_CACHE = [
  '/medifast-0.1/',
  '/medifast-0.1/index.html',
  '/medifast-0.1/medifast-auth.html',
  '/medifast-0.1/medifast-patient-search.html',
  '/medifast-0.1/medifast-pharmacy.html',
  '/medifast-0.1/medifast-admin.html',
  '/medifast-0.1/medifast-order-tracking.html',
  '/medifast-0.1/medifast-healthcare.html',
  '/medifast-0.1/medifast-maps.html',
  '/medifast-0.1/medifast-profile.html',
  '/medifast-0.1/medifast-prescription-reader.html',
  '/medifast-0.1/medifast-landing.html',
  '/medifast-0.1/manifest.json',
  '/medifast-0.1/medifast-icon.svg',
  '/medifast-0.1/offline.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  console.log('🚀 MediFast Service Worker Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Caching MediFast files...');
      return cache.addAll(STATIC_CACHE.map(url => {
        return new Request(url, { mode: 'no-cors' });
      })).catch(err => console.log('Cache error:', err));
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  console.log('✅ MediFast Service Worker Active!');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase requests (always need fresh data)
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis.com/maps') ||
      event.request.url.includes('anthropic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version if available
      if (cachedResponse) {
        // Also fetch fresh version in background
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache — fetch from network
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;

        // Cache the new response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '💊 MediFast';
  const options = {
    body: data.body || 'You have a new notification!',
    icon: '/medifast-0.1/medifast-icon.svg',
    badge: '/medifast-0.1/medifast-icon.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/medifast-0.1/' },
    actions: [
      { action: 'view', title: '👁️ View', icon: '/medifast-0.1/medifast-icon.svg' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/medifast-0.1/';
    event.waitUntil(clients.openWindow(url));
  }
});

// ── BACKGROUND SYNC ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    console.log('🔄 Background sync: orders');
  }
});

console.log('💊 MediFast Service Worker Loaded!');
