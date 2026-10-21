# FIEZEL Handoff Dossier: Audio Streaming Direct via R2 & CSP Media-Src Allowlist (m025-467)

## 1. Otoritas & Status Dokumen
- **Authority**: MASTER & OWNER Engineering Protocol (MANDAT V2).
- **Status**: SELESAI & LULUS VALIDASI (100% GREEN).
- **Build Target**: `m025-467` (Hexa-Sync: `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `BUILD-VERSION.json`).

## 2. Ringkasan Temuan Audit & Alasan Perubahan
- **Latar Belakang & Akar Masalah**:
  - Pada PR #491, pemutaran audio aset R2 dicoba beralih ke streaming langsung via `el.src = <URL R2>`, namun gagal total di lingkungan produksi karena `Content-Security-Policy` di `index.html` hanya mengizinkan `media-src 'self' blob: data:`. Browser memblokir semua URL audio eksternal sehingga suara menjadi bisu.
  - Pada PR #492, pemutar dikembalikan ke jalur lama (`fetch -> blob -> createObjectURL -> play()`). Masalah kebisuan teratasi, namun murid harus menunggu seluruh berkas MP3 selesai diunduh sebelum audio mulai berbunyi.
- **Solusi m025-467**:
  - Sinkronisasi CSP di `index.html`: Menambahkan allowlist origin eksplisit yang sah ke `media-src`:
    - `https://fiezel-audio.fitrajft.workers.dev` (manifest `assetBaseUrl`)
    - `https://audio.fiezel.my.id` (Cloudflare TTS transport default `AUDIO_PUBLIC_BASE`)
    - `https://api.fiezel.my.id` (`FIEZEL_CF_CONFIG.base`)
    - Tanpa menggunakan wildcard `*` atau generic scheme `https:`.
  - Peningkatan `playUrl()` di `features/audio-assets/fiezel-audio-resolver.js`:
    - Cache Hit (`cachedResponse(url)`): Memutar dari blob lokal Cache API (`fiezel-r2-audio-v1`) seketika.
    - Cache Miss: Streaming langsung via `el.src = url`. Saat event `ended` selesai, memicu pemanasan cache (`warmCache(url)` via `loadForPlayback()`) di latar belakang tanpa memblokir pemutaran.
    - Jaring Pengaman (Fallback): Jika pemutaran streaming gagal (misalnya error decode awal atau kegagalan pemutaran), pemutar secara otomatis mencoba sekali jalur blob lama sebelum mengembalikan `false`.
    - Mempertahankan guard 10 detik, `playbackRate = opts.speed`, `onProgress`, `stop()`, dan integrasi `__fiezelSettle`.

## 3. Bukti Pengujian Empiris (Playwright Headless Chromium)
- Skrip probe: `tools/dev/verify-audio-streaming-probe.mjs`
- Menjalankan server statis lokal dan peramban Chromium headless versi 153.0.8010.12.
- Hasil pengujian empiris:
  1. Live R2 Worker Reachable: **YES** (`https://fiezel-audio.fitrajft.workers.dev/health`)
  2. Pelanggaran CSP di Console Browser: **0 (Nol)**
  3. Pemutaran Pertama (Cache Miss -> Direct Streaming): **BERHASIL** (`plays: 1`, `persistentCacheMisses: 1`)
  4. Pengisian Cache di Belakang Layar: **BERHASIL** (`persistentCacheStores: 1`)
  5. Pemutaran Kedua (Cache Hit -> Blob Cache): **BERHASIL** (`persistentCacheHits: 1`, `plays: 2`)
  6. Seluruh assertion lulus dan exit code 0.

## 4. Daftar Berkas yang Disentuh
1. `index.html`: Memperbarui meta CSP `media-src` dengan allowlist origin eksplisit R2 dan CF.
2. `features/audio-assets/fiezel-audio-resolver.js`: Memperbarui `playUrl()` untuk mendukung progressive streaming, background cache warming, dan single-attempt blob fallback.
3. `tests/audio-csp-media-src-test.js`: Gerbang mutu baru yang memverifikasi seluruh origin manifest dan CF tercantum di CSP `media-src` tanpa wildcard, dan terbukti gagal jika origin manifest berubah tanpa pembaruan CSP.
4. `.github/workflows/quality.yml`: Mendaftarkan `tests/audio-csp-media-src-test.js` di tahap Core validation.
5. `tools/dev/verify-audio-streaming-probe.mjs`: Alat probe Playwright untuk verifikasi browser nyata.
6. Berkas koordinasi rilis & Hexa-Sync (`m025-467`):
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

## 5. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
- `node tests/audio-csp-media-src-test.js`: PASS (7 pass, 0 fail)
- `node tests/audio-asset-pipeline-test.js`: PASS (51 pass, 0 fail)
- `node tools/bump-build.mjs --check`: Selaras (Hexa-Sync 6 titik = m025-467)

## 6. Langkah Lanjut (Roadmap & Next Steps)
- Pantau metrik produksi `plays`, `playFailures`, `persistentCacheHits`, dan `persistentCacheStores` melalui panel diagnostik suara.
- Pastikan PWA shell murid memperbarui service worker ke revisi `m025-467`.
