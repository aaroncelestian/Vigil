var CACHE = 'vigil-5';
var ASSETS = [
  './',
  './index.html',
  './about.html',
  './privacy.html',
  './legal.css',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-32.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(new Request(url, {cache: 'reload'})).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function fromNetwork(request) {
  var doc = request.mode === 'navigate' || request.destination === 'document';
  if (!doc) return fetch(request);
  return fetch(request.url, {cache: 'reload', credentials: 'same-origin', redirect: 'follow'}).then(function (response) {
    if (!response || !response.redirected) return response;
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers: response.headers});
  });
}
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    fromNetwork(request).then(function (response) {
      var copy = response.clone();
      if (response.ok && new URL(request.url).origin === location.origin) {
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy).catch(function () {});
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (hit) {
        if (hit) return hit;
        if (request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
