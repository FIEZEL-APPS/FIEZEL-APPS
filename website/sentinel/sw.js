// Ghost Sentinel — Service Worker
// Tujuan: cache tracker offline + antri beacon saat offline/background

const CACHE = 'sentinel-tracker-v1';
const BEACON_STORE = 'sentinel-pending-beacons';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/sentinel/track.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// Cache-first untuk tracker page (jalan offline)
self.addEventListener('fetch', e => {
  if (new URL(e.request.url).pathname === '/sentinel/track.html') {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});

// Background Sync: kirim beacon yang tertunda saat koneksi kembali
self.addEventListener('sync', e => {
  if (e.tag === 'sentinel-beacon') {
    e.waitUntil(flushPendingBeacons());
  }
});

async function flushPendingBeacons() {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(BEACON_STORE, 'readwrite');
    const store = tx.objectStore(BEACON_STORE);
    const all = await promisify(store.getAll());
    if (!all || all.length === 0) return;

    for (const item of all) {
      try {
        const res = await fetch(item.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          const tx2 = db.transaction(BEACON_STORE, 'readwrite');
          tx2.objectStore(BEACON_STORE).delete(item.id);
          await promisify(tx2);
        }
      } catch {
        // jaringan belum ada, coba lagi nanti
      }
    }
  } catch {
    // IndexedDB tidak tersedia
  }
}

// ── IndexedDB helpers ────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('SentinelSW', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(BEACON_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisify(req) {
  if (req && typeof req.oncomplete !== 'undefined') {
    return new Promise((res, rej) => { req.oncomplete = res; req.onerror = rej; });
  }
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
}
