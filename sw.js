// Funciona sin internet: guarda la web app; la cotización se pide nueva y, si no hay internet, queda la última.
const CACHE = 'calc-v12';
const ARCHIVOS = ['./', 'index.html', 'nucleo.js', 'manifest.json', 'icono.svg', 'icono-192.png', 'icono-512.png', 'icono-maskable.png', 'importadores.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // primero internet (para ver cambios nuevos), si no hay, lo guardado
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
