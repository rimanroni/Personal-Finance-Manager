const CACHE = 'finance-app-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

// Vite dev modules must never be cached, otherwise an old backup.ts can be
// resurrected after an edit and produce false "missing export" errors.
const isDevModule = (url) =>
  url.pathname.startsWith('/@vite/') ||
  url.pathname.startsWith('/@react-refresh') ||
  url.pathname.startsWith('/src/') ||
  url.pathname.startsWith('/node_modules/') ||
  /\.[jt]sx?$/.test(url.pathname) ||
  !!url.search;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isDevModule(url)) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.pathname.endsWith('/config.json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => cached))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.action === 'open' || !e.action ? './' : './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(target);
  }));
});

self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch (_) { data = { body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Finance Reminder', {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: './' },
  }));
});
