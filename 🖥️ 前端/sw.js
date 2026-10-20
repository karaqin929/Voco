// Voco Service Worker — cache-first (instant load even when Render is cold)
// v128 事故修复：① 缓存未命中且网络失败时不得返回 undefined（此前 respondWith(undefined) → TypeError →
//   浏览器视为网络错误——冷启动窗口内熊图 emoji 兜底的高发通道之一，现改为 Response.error() 干净收口）；
//   ② /version.json 强制网络优先（版本自动收敛的生命线，绝不允许被缓存锁旧）。
const CACHE = 'voco-v142';
const FILES = ['/','/index.html?v=132','/style.css?v=132','/app.js?v=132','/manifest.json','/supabase-client.js?v=132','/parser.js?v=132','/supabase-js.min.js?v=132','/lucide.min.js?v=132','/chart.umd.js?v=132','/icon.png','/bear-default.png?v=129','/bear-active.png?v=129','/version.json'];

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

  // 版本探测 — 永远网络优先（失败才回退缓存）：旧壳客户端靠它发现新版本并自动刷新
  if (e.request.url.includes('/version.json')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }
        return caches.match(e.request);
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell — cache-first: instant from cache, update cache in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networked = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }
        return cached || Response.error();
      }).catch(() => cached || Response.error());
      return cached || networked;
    })
  );
});
