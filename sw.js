// La app se mudó a https://delanuk-calendarios.pages.dev/novias/
// Este service worker solo borra lo guardado por la versión anterior y se da de baja.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((cs) => cs.forEach((c) => c.navigate(c.url)))
  );
});
