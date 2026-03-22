const CACHE_NAME = 'couture-pro-v1';
const urlsToCache = [
  './',
  './index.html',
  './atelier.html',
  './boutique.html',
  './bibliotheque.html',
  './tailleur.html',
  './parametre.html',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/img/logo.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Pour l'API PHP, essayer le réseau d'abord, sinon échouer gracieusement
  if (event.request.url.includes('api.php')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    // Pour le reste (HTML/CSS/JS), essayer le cache d'abord, puis le réseau
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        }).catch(() => {
            // Si on demande la racine et que ça échoue (hors ligne total) sans cache dispo
            if(event.request.url.endsWith('/')) {
                return caches.match('./index.html');
            }
        })
    );
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
