// Offline support: the page shell is cached on install; images and fonts are cached as they are used.
// Bump VERSION whenever files change, so returning visitors get the new release.
const VERSION = 'synthea-2026-11-01a';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/fonts.css', 'css/tokens.css', 'css/base.css', 'css/components.css', 'css/sections.css',
  'js/app.js', 'js/core/subject.js', 'js/core/storage.js', 'js/core/tabs.js', 'js/model/content.js', 'js/render/pearl.js',
  'js/viewmodels/appearance-view-model.js', 'js/viewmodels/selection-view-model.js', 'js/viewmodels/toast-view-model.js', 'js/viewmodels/ambience-view-model.js',
  'js/audio/calm-ocean-engine.js', 'js/audio/calm-ocean-processor.js', 'js/views/ambience-toggle-view.js',
  'js/views/hero-view.js', 'js/views/appearance-toggle-view.js', 'js/views/palette-view.js', 'js/views/toast-view.js',
  'js/views/evolution-view.js', 'js/views/code-view.js', 'js/views/gallery-view.js', 'js/views/pronounce-view.js', 'js/views/contact-view.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // pages: network first, so a new release shows at once; cached copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // everything else: cache first
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
