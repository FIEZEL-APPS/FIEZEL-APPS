# Design: Migrasi Penyimpanan Aset Neural dari CacheStorage ke IndexedDB

- **ID**: M-010 / T-010 (persiapan T-007)
- **Penulis**: agent-2 (squad koordinasi FIEZEL)
- **Tanggal**: 2026-08-14
- **Status**: DESIGN ONLY — satu file baru `analysis/idb-migration-design.md`. TIDAK ada
  perubahan kode. Eksekusi menunggu gerbang T-006 (diagnostics device) sesuai ledger.
- **HEAD saat desain**: `6fa2d82`

---

## 1. Ringkasan Masalah + Bukti Angka

### 1.1 Gejala
Neural voice (kokoro-js / onnxruntime-web) **tidak pernah `ready` di iPhone**.
`FiezelVoiceRuntime.prepare()` mati di tengah `warmAssets()`: fetch aset besar dengan
`cache:'no-store'` + retry (2x) + inisialisasi dengan timeout 20 detik
(`INITIALIZE_TIMEOUT_MS`, bootstrap.js:15,242-243). UI jatuh ke jalur
audibility-first (browser speechSynthesis), yang sudah pulih (T-002) tetapi bukan
tujuan utama (T-005 goal: neural audible di device).

### 1.2 Ukuran aset vs kuota
Manifest aset keras-kode di `fiezel-neural-voice-bootstrap.js:17-31` (13 item):

| Aset | Bytes | MB (decimal) |
|---|---|---|
| `vendor/kokoro-js/kokoro.web.js` | 2.135.645 | 2,1 |
| `wasm/ort-wasm-simd-threaded.jsep.mjs` | 44.484 | 0,04 |
| `wasm/ort-wasm-simd-threaded.jsep.wasm` | 21.596.019 | 21,6 |
| `model/onnx/model_quantized.onnx` | 92.361.116 | 92,4 |
| `model/config.json` + `tokenizer*.json` | 3.657 | 0,004 |
| 6× voice `.bin` (522.240 each) | 3.133.440 | 3,1 |
| **TOTAL** | **119.274.361** | **~119,3** |

- **WASM + model saja** = `21.596.019 + 92.361.116` = **113.957.135 bytes (~114 MB)**.
- **Quota CacheStorage iOS/WebKit**: `defaultPerOriginStorageQuota` historis WebKit
  **~50 MB per origin**. Catatan ledger T-003/T-005: "quota iOS ~50MB - diduga
  blocker neural".
- Seluruh pipeline warm saat ini 100% CacheStorage:
  - `bootstrap.warmAssets()` → `caches.open('fiezel-v5.19.0')` (bootstrap.js:192-211)
  - `downloadAsset()` → `fetch(url,{cache:'no-store'})` (bootstrap.js:175)
  - `putFetchedAsset()` → `cache.put()` streaming utk ≥8 MB (bootstrap.js:160-166)
  - preflight `navigator.storage.estimate()` (bootstrap.js:96-117)
  - `ios-cache-fix.primeLargeAssets()` → `cacheBuffered`/`cache.add` utk WASM/model
    (ios-cache-fix.js:91-110)
- **Kesimpulan kuantitatif (hipotesis, menunggu T-006)**: 119,3 MB aset >> quota
  ~50 MB CacheStorage di iOS → `QuotaExceededError` / `storage_insufficient` pada
  preflight, atau fetch tak pernah selesai dalam window timeout. IndexedDB tidak
  kena batas CacheStorage (kuota storage origin terpisah, lihat §6).

### 1.3 Catatan inkonsistensi yang ditemukan saat analisis (untuk T-007)
- `ios-cache-fix.js:23` `PRIME_TOTAL_BYTES = 119.796.601` = total manifest + **satu
  voice ekstra (522.240)** → angka display 14 aset, manifest asli 13. Kosmetik saja
  (dipakai untuk progress bar), tapi sebaiknya diseragamkan saat eksekusi.
- `bootstrap.readStatus()` (bootstrap.js:50-56) mensyaratkan
  `value.storage==='cache'` agar `prepared===true`. Jika storage berubah ke `'idb'`,
  status lama **tidak akan dianggap prepared** → wajib diperlakukan sebagai item
  internal (lihat §7, §4.8).

---

## 2. Arsitektur: Storage Abstraction

### 2.1 Prinsip
Satu antarmuka penyimpanan yang tidak peduli implementasi rendahnya. Selector
bertingkat (IDB → CacheStorage → network), sehingga **tidak ada perubahan** pada
jalur audibility-first dan kontrak runtime (lihat §7).

### 2.2 Interface `StorageBackend`
```js
interface StorageBackend {
  kind: string;                 // 'idb' | 'cache'
  available(): Promise<boolean>;
  put(key: string, value: Blob|ArrayBuffer, meta: {path,bytes,contentType}): Promise<void>;
  get(key: string): Promise<{blob: Blob, contentType: string, storedBytes: number}|null>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  putManifest(entry): Promise<void>;   // marker 'prepared' di-commit TERAKHIR
  hasManifest(): Promise<boolean>;
  estimate(): Promise<{usage,quota,available}|null>;
}
```
Semua method opsional kecuali `put/get/has/delete` (sesuai spesifikasi misi:
put/get/has/delete). `put/get` harus berhasil **seluruhnya atau abort transaksi**
(atomik per aset), supaya tidak pernah ada aset korup.

### 2.3 Implementasi
- **`IdbBackend`**: dibangun di atas IndexedDB (`fiezel-idb-storage.js`, baru).
- **`CacheBackend`**: adapter tipis di atas perilaku eksisting
  (`caches.open` + `put`/`match`/`delete`) — **kode warm/verify eksisting bisa
  dipakai ulang apa adanya** sebagai fallback, tidak dibuang.
- **`StorageResolver`** (pemilihan backend):
  1. `await IdbBackend.available()` (probe `indexedDB.open` + tx test).
  2. Gagal (private mode, IDB disabled, `SecurityError`/`UnknownError` saat open)
     → pakai `CacheBackend` (perilaku hari ini).
  3. Keduanya gagal → tidak ada storage; `prepare()` throw sama seperti sekarang,
     UI tetap ke audibility-first.

### 2.4 Jalur baca aset saat runtime (kritis — jangan dilewatkan)
Menyimpan di IDB **tidak cukup**. Runtime (`KokoroTTS.from_pretrained`, ORT wasm,
`setVoiceDataUrl`) mem-fetch sendiri `./vendor/...` via `fetch()` dan `import()` di
luar `warmAssets()`. Migrasi baca harus menyediakan:
1. **`fetch` interceptor sementara** saat init: membungkus `globalThis.fetch`
   agar request same-origin `/vendor/...` dilayani dari IDB (Response dgn
   `Content-Type` deterministik: `application/wasm`, `application/octet-stream`,
   `text/javascript`), lalu `originalFetch` sebagai fallback. Interceptor hanya
   aktif selama fase init + hanya utk path `/vendor/` (scope sempit, zero-risk utk
   traffic lain).
2. **Hook dynamic import**: bootstrap sudah menyediakan
   `root.__fiezelDynamicImport` (bootstrap.js:219). Provider IDB menyuplai hook ini
   untuk `vendor/kokoro-js/kokoro.web.js` (via `URL.createObjectURL` dari blob IDB),
   supaya `import()` tidak membawa ESM `.mjs`/`.js` keluar jalur IDB dan MIME tetap
   benar (`text/javascript`).

### 2.5 Drainase / buang cache lama
- Setelah `hasManifest()` benar di IDB, `CacheBackend` lama (`fiezel-v<version>`
  berisi aset 119MB) **tidak wajib dihapus** tapi dibiarkan kebalik dgn `delete`
  aset neural dari cache supaya kuota CacheStorage tidak terpakai percuma
  (deferred/gated ke fase 4, §4.4).

---

## 3. Skema IndexedDB

| Item | Nilai |
|---|---|
| Nama DB | `fiezel-assets` |
| Versi DB | `1` |
| Object store | `neural-assets` |
| `keyPath` | `key` (string = absolute URL aset) |
| Value record | `{ key, path, bytes (deklaratif), storedBytes, contentType, blob|data, addedAt }` |
| Store pendukung | `meta` (keyPath `key`) utk `manifest_prepared` + `storage_version` |
| Indeks | `byPath` (path, unique), `byAddedAt` (addedAt) — utk audit/eviction manual |

Catatan implementasi:
- `blob` direkomendasikan utk semua aset (seragam, ringan utk iOS; value IDB sampai
  ~2 GB secara teknis, dan 92 MB aman — verifikasi device tetap wajib, lihat §6).
  Alternatif `ArrayBuffer` utk aset < `LARGE_ASSET_STREAM_THRESHOLD` (8 MB).
- `bytes` dari manifest dipakai verifikasi `storedBytes === bytes` setelah read;
  `contentType` disimpan agar `Response` hasil-read punya MIME deterministik
  (`requiredContentType`, bootstrap.js:83-87).
- Manifest ditulis **terakhir** dalam versi shard (transaksi `meta` sukses = batch
  lengkap). Ini pengganti `PREPARED_MARKER_KEY` di cache (bootstrap.js:210).
- Upgrade versi aset (konten vendor berubah) = `version` shard baru; `onupgradeneeded`
  tidak menghapus data lama — logika aplikasi yang memilih `putManifest` versi baru.

---

## 4. Strategi Migrasi Bertahap

### 4.0 Prinsip gerbang
T-007 TIDAK dieksekusi sebelum T-006 (bukti device) masuk, sesuai ledger. Fase di
bawah adalah urutan roll-out yang **setiap fase self-contained & reversibel**
(flag `FIEZEL_NEURAL_STORAGE` = `idb|cache|auto`, default `auto`).

### 4.1 Fase 1 — Additive saja (tidak mengubah perilaku)
- Tambah `fiezel-idb-storage.js` (backend + resolver + interceptor, belum aktif).
- `index.html` + `sw.js` mendaftarkan file baru di precache (satu baris masing-masing).
- Tambah diagnostics: `{phase:'idb_probe', available:bool, quota, usage}` di
  `bootstrap_loaded` / `ios_cache_patch_loaded`.
- **Tidak ada perubahan alur warm/verify/speak.** Jalur audibility-first live utuh.

### 4.2 Fase 2 — Priming via IDB (write path) dgn fallback cache
- `warmAssets()` memilih backend lewat `StorageResolver` (IDB bila `available()`).
- Alur prim identik: preflight `estimate()` → fetch `cache:'no-store'` → simpan
  via `backend.put()` (streaming/ArrayBuffer disesuaikan) → verifikasi `has()`
  semua aset → `putManifest()` commit terakhir.
- Ketika IDB dipilih: **tetap tolak-tulis** ke cache? → `cache` dipakai cold (tulis
  dihapus dari fase ini): aset 113 MB tidak `cache.put` supaya kuota CacheStorage
  tak jebol; fallback `cache` hanya utk browser/versi yang IDB-nya gagal.
- Gagal tengah jalan (`QuotaExceededError`, abort tx, device eviction):
  `backend.delete(key)` utk sisa batch, ganti backend, lanjut jaringan. Error mapping
  `storage_quota`/`asset_store_failed` dipertahankan.

### 4.3 Fase 3 — Read path dari IDB (nilai sebenarnya)
- Aktifkan: interceptor `/vendor/` + `__fiezelDynamicImport` dari IDB saat init.
- `verifyCachedAssets()` diarahkan ke `backend.get/has` (verifikasi bytes) sebagai
  pengganti `cachedAssetState` pada cache.
- `readStatus()` menerima `storage:'idb'` (lihat §1.3 — perubahan internal wajib).

### 4.4 Fase 4 — Pembersihan & observasi (deferred)
- Hapus aset neural dari `fiezel-v<version>` CacheStorage (kuota cache dibebaskan).
- `ios-cache-fix` dideprekasi: `primeLargeAssets` menjadi no-op bila backend = IDB
  (atau didorong dari jalur baseline bila T-003 tidak lagi relevan — keputusan
  owner di T-007).

### 4.5 Tidak menyentuh audibility-first
`fiezel-neural-voice-audibility-fix.js` **tidak diubah semantiknya**:
`speak()` tetap browser-first saat `!state.ready`; upgrade neural tetap *warm in
background*. Migrasi penyimpanan hanya mengubah *darimana* aset dibaca, bukan
*urutan* audibility.

---

## 5. Daftar Perubahan File + Estimasi Baris (DESAIN — tidak dieksekusi)

| File | Aksi | Estimasi Δ baris | Catatan |
|---|---|---|---|
| `features/neural-voice/fiezel-idb-storage.js` | **NEW** | +240..300 | IDB backend, CacheBackend adapter, StorageResolver, fetch interceptor `/vendor/`, blob-URL dynamic import hook |
| `features/neural-voice/fiezel-neural-voice-bootstrap.js` | MOD | +50..80 / −15 | `warmAssets`/`downloadAsset`/`verifyCachedAssets` lewat StorageBackend; `readStatus` menerima `'idb'`; `__fiezelDynamicImport` dari resolver; status() `storage` field; diagnostics `idb_probe` |
| `features/neural-voice/fiezel-neural-voice-ios-cache-fix.js` | MOD | +25 / −20 | Gate `primeLargeAssets` saat backend=idb (fase 4); tetap utuh utk fallback cache |
| `features/neural-voice/fiezel-neural-voice-audibility-fix.js` | MOD | +0 / −0 | **Tanpa perubahan** (kecuali baris diagnostics opsional) |
| `index.html` | MOD | +1 | script tag `fiezel-idb-storage.js` (setelah bootstrap, sebelum ios-cache-fix) |
| `sw.js` | MOD | +1 | tambah `./features/neural-voice/fiezel-idb-storage.js` ke `ASSETS` precache; `SW_REV` bump |
| `idb-storage-test.js` | **NEW** | +140..180 | Unit test abstraction dgn mock IDB (mirip gaya `ios-cache-compat-test.js`) |
| `.github/workflows/quality.yml` | MOD | +1 | tambah `node idb-storage-test.js` |
| `NEURAL-VOICE-SOURCE-LOCK.json` | — | 0 | **TIDAK diubah** — aturan sumber/policy tetap (lihat §7) |
| `TASKS-LEDGER.json` | — | 0 | Bukan milik agent-2 untuk diubah di misi ini |

Estimasi total: **+460..640 baris** (termasuk ~150 utk test), 2 file baru,
7 file modifikasi kecil. Fase 1 saja + `idb-storage-test.js` ≈ +180..220 baris.

---

## 6. Risiko iOS/Safari + Mitigasi

| Risiko | Detail | Mitigasi |
|---|---|---|
| Kuota IDB besar tapi bukan tak terbatas | Safari/iOS modern: kuota storage origin ~1 GB+ (naik dari 50 MB era lama), terpisah dari CacheStorage | Diukur dulu via `navigator.storage.estimate()` + `persist()` saat `warmAssets`; preflight `available >= missing+reserve` dipertahankan (24 MB reserve) |
| Eviction / site data purged | Safari dapat purge (ITP, aktivitas 7 hari, storage pressure), tak terasa spt localStorage | `navigator.storage.persist()` + `persisted()` di status; deteksi `hasManifest()` gagal → re-prime otomatis; diagnostics `storageEstimate.persisted` |
| Private mode / IDB tidak tersedia | `indexedDB.open` reject (SecurityError/UnknownError) atau storage ephemeral | `StorageResolver` fallback ke `CacheBackend`; lalu network; prepare throw eksisting |
| Transaksi IDB auto-commit | Memegang satu tx selama fetch 92 MB tidak valid; tx mati diam-diam | Satu tx per aset (`put`), manifest tx terpisah terakhir; jangan tahan tx saat `await fetch`; tangani `AbortError` |
| Value besar memori | `put`/`get` Blob 92 MB sebelumya sempat materialisasi duplikat di memori | Store utk >8 MB sebagai `Blob` (streaming-friendly), baca via `blob.arrayBuffer()` hanya sejauh perlu; verifikasi `storedBytes` dari `blob.size` |
| Bug/perilaku WebKit (Unversion) | Versi iOS tua pernah gagal `put` value besar dgn UnknownError | Device gate T-006/T-007 **wajib**; fallback cache + `verifyCachedAssets` tetap ada sbg jaring pengaman |
| Reload/background saat priming | Batch setengah jadi → manifest tidak ada → re-prime (aman) | Commit-atomik manifest terakhir; `downloadAsset` retry 2x + cleanup `delete(key)` sisa |
| COI/COEP | Tetap `crossOriginIsolated` perlu header SW — tidak terpengaruh IDB | Pastikan `sw.js` COOP/COEP injection tidak disentuh (kecuali +1 baris ASSETS) |
| ~119 MB traffic ulang per eviction | Pengguna iPhone dgn data seluler | Hanya sekali; normal setelah itu; status user sampai progress |

---

## 7. Kontrak `FiezelVoiceRuntime` — TIDAK BOLEH BERUBAH (public API tetap)

Objek runtime yang di-`Object.freeze` (bootstrap.js:299) dan diperluas oleh
patch (ios-cache-fix.js:130, audibility-fix.js:121) **tidak berubah**:
`schema`, `status`, `prepare`, `speak`, `stop`, `verifyCachedAssets`,
`refreshPreparedFlag`, `storageEstimate`, `diagnostics`, `assets`, `totalBytes`.

Aturan selama T-007:
- Tanpa tambah/hapus/rename method publik pada `FiezelVoiceRuntime`.
- Perubahan internal yang diperbolehkan & wajib dicatat di ledger:
  1. `status().storage` kini dapat bernilai `'idb'` (sebelumnya hanya `'cache'`)
     — additive nilai, bukan perubahan bentuk.
  2. `readStatus()` menerima `storage:'idb'` sebagai prepared (perbaikan internal,
     §1.3).
- `NEURAL-VOICE-SOURCE-LOCK.json` dan `fiezel-neural-voice-config.js` **tidak
  berubah**: provider/aset/policy (`offlineAfterWarmRequired`, dll.) identik.
- `audibility-fix.js` semantik `speak()` browser-first tidak disentuh.

---

## 8. Kriteria Kesuksesan + Cara Test

### 8.1 Unit CI (wajib hijau)
1. `idb-storage-test.js` (baru): backend abstraction dgn mock IDB —
   `put/get/has/delete/putManifest` atomicity, `StorageResolver` fallback saat
   IDB gagal, interceptor `/vendor/` menghasilkan `Response` dgn MIME benar dan
   memanggil original fetch utk non-vendor.
2. Regresi eksisting TETAP PASS (tidak boleh rusak):
   `ios-wasm-module-test.js`, `ios-cache-compat-test.js`,
   `neural-voice-audibility-test.js`, `neural-voice-http-test.js`,
   `neural-voice-test.js`, `pwa-cache-test.js` → kontrak & 100% CacheStorage
   fallback masih valid.
3. `node --check` semua `.js` (sintaks).

### 8.2 Device (iPhone) — gerbang utama T-005/T-006
Buka app di iPhone, pastikan `crossOriginIsolated === true`, lalu:
- **Prepared**: `FiezelVoiceRuntime.prepare()` selesai tanpa
  `storage_insufficient`/`storage_quota`; `status().prepared===true`,
  `status().storage==='idb'`.
- **Ready & audible**: `status().ready===true`; neural speak audible
  (goal T-005); init selesai < 20 s (timeout tidak kena).
- **Standalone/offline**: setelah prepared, reload dgn jaringan mati →
  `hasManifest()` benar, warm tidak refetch (fetch count 0 utk aset), speak neural
  masih jalan.
- **Diagnostics**: key `fiezel-neural-voice-diagnostics-v1` berisi
  `idb_probe` + `prepare_error` kosong saat sukses + `storageEstimate.persisted`
  dan `available > 0`.
- **Kuota**: `navigator.storage.estimate()` saat selesai menunjukkan usage IDB
  ≈ 119 MB dan available cukup — tidak ada `QuotaExceededError` (bandingkan dgn
  CacheStorage ~50 MB yang sekarang).

### 8.3 Tanda sukses operasional
- 2 hari penggunaan normal iPad/iPhone tanpa eviction (persisted).
- Desktop tetap jalan via CacheStorage/network (fallback) — tidak ada regresi
  browser lain.

---

## Lampiran A — Referensi kode saat ini (HEAD 6fa2d82)
- `features/neural-voice/fiezel-neural-voice-bootstrap.js` — manifest +13 aset:
  baris 17-31; konstanta timeout/reserve: 10-16; `warmAssets`→cache: 190-211;
  fetch no-store: 175; `putFetchedAsset` streaming ≥8MB: 156-168; init timeout:
  239-243; kontrak frozen: 299.
- `features/neural-voice/fiezel-neural-voice-ios-cache-fix.js` — priming WASM/model
  dgn timeout 45 s: 21, 91-110, 112-126.
- `features/neural-voice/fiezel-neural-voice-audibility-fix.js` — browser-first:
  84-104.
- `sw.js` — precache ASSETS, `isNeuralAsset` dikecualikan dari runtime cache,
  COOP/COEP: 4, 5, 25-32, 69.
- `NEURAL-VOICE-SOURCE-LOCK.json` — ukuran wasm 21.596.019, model 92.361.116,
  sha256, policy `offlineAfterWarmRequired:true`.
- Test eksisting: `ios-wasm-module-test.js`, `ios-cache-compat-test.js`,
  `neural-voice-audibility-test.js`.