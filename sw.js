/* Offline režim: aplikace a obrázky z cache, počasí vždy ze sítě (záložní kopie je v localStorage).
   Sdílený plán (Firebase) jde mimo service worker, cizí domény se tu neobsluhují. */
const CACHE = 'malaga-v13';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'plan.js', 'data/trip.js', 'data/activities.js', 'data/tips.js', 'data/food.js', 'data/calendar.js', 'data/secret.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'img/parking-ostrava.png', 'img/letiste-agp.svg',
  'fonts/fraunces-latin.woff2', 'fonts/fraunces-latin-ext.woff2',
  'fonts/atkinson-latin.woff2', 'fonts/atkinson-latin-ext.woff2',
  'fonts/dmmono-400-latin.woff2', 'fonts/dmmono-400-latin-ext.woff2',
  'fonts/dmmono-500-latin.woff2', 'fonts/dmmono-500-latin-ext.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('open-meteo.com')) return;            // počasí: jen síť
  if (url.origin === location.origin) {
    // stale-while-revalidate: rychle z cache, na pozadí stáhnout novou verzi
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
