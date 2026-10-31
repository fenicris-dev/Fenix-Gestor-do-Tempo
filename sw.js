/* FÊNIX | Gestor de Tempo — service worker v4.5
   Rede primeiro (para receber atualizações) com cache como reserva offline.
   Também guarda o fenix-core e o Firebase SDK, para o app abrir e sincronizar sem internet. */
const CACHE = 'fenix-tempo-v4.5';
const ARQUIVOS = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const EXTERNOS = ['www.gstatic.com', 'fenicris-dev.github.io'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ARQUIVOS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const mesma = u.origin === self.location.origin;
  if (!mesma && !EXTERNOS.includes(u.hostname)) return;
  e.respondWith(
    fetch(req)
      .then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return r;
      })
      .catch(() => caches.match(req).then(m => m || (mesma ? caches.match('index.html') : Response.error())))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs =>
      cs.length ? cs[0].focus() : self.clients.openWindow('./')
    )
  );
});
