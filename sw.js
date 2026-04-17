// DELANUK Service Worker
// Guarda los archivos del sitio para que cargue rápido y funcione offline

const CACHE_NAME = 'delanuk-v6';
const ARCHIVOS_BASE = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './api.js',
  './render.js',
  './auth.js',
  './app.js',
  './manifest.json',
  './logo.png',
  './logo-blanco.png',
];

// Al instalarse, guarda los archivos base en la caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
  self.skipWaiting();
});

// Al activarse, borra versiones viejas de la caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cuando se pide algo, primero probar la red, si falla ir a la caché
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar las llamadas a Supabase ni a otros servidores externos
  if (url.origin !== location.origin) return;

  // Solo manejar GET (leer archivos), no POST/PUT/DELETE
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        // Si la respuesta es buena, actualizar la caché con la versión nueva
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resp;
      })
      .catch(() => caches.match(event.request)) // Sin internet: usar caché
  );
});