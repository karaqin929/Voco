// Voco Service Worker — cache-first (instant load even when Render is cold)
const CACHE = 'voco-v64';
const FILES = ['/','/index.html?v=54','/style.css?v=54','/app.js?v=54','/manifest.json','/supabase-client.js?v=54','/parser.js?v=54','/icon.png','/bear-default.png','/bear-active.png','/bear-head-active.png','/bear-head-default.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Supabase API — always network
  if (e.request.url.includes('supabase.co') || e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // App shell — cache-first: instant from cache, update cache in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networked = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || networked;
    })
  );
});
