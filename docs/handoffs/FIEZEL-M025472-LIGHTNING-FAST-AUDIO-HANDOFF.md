# Berkas Serah Terima: FIEZEL-M025472-LIGHTNING-FAST-AUDIO-HANDOFF.md
Tanggal: 2026-10-05
Versi Rilis: `m025-472`
Komponen: Audio Playback Engine & Latency Optimization (`features/audio-assets/fiezel-audio-resolver.js`, `features/audio-assets/fiezel-audio-manifest.js`, `app.js`, `features/speaking-listening/fiezel-speaking-listening-addon.js`)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Pengguna melaporkan adanya jeda sekitar 3 detik sebelum audio berbunyi pada perangkat ponsel. Pengguna meminta perbaikan hingga menghasilkan suara secepat kilat (sub-100ms / seketika).

### Akar Masalah:
1. **Cold Manifest Latency**:
   - `warmAudioManifest()` di `app.js` menggunakan `window.requestIdleCallback(run, { timeout: 3000 })`. Pada CPU perangkat seluler, pemanggilan ditunda hingga 3000ms.
   - `fetchDoc()` di `features/audio-assets/fiezel-audio-manifest.js` memakai `{ cache: 'no-cache' }`, memaksa unduhan jaringan ulang 662 KB berkas JSON manifest di setiap sesi baru.
2. **Ketiadaan Prefetch Proaktif (Cold-Start di Layar)**:
   - Kartu flashcards (`flashcards(level)`), ulangan kosakata (`reviewVocab()`), dan soal listening kuis (`quizLoop()`) sebelumnya hanya menghangatkan item *berikutnya* setelah tombol diklik, namun item yang *sedang aktif* di layar baru mulai diunduh dari jaringan saat murid menekan tombol "Dengar".
3. **Overhead Cache API & Regenerasi Blob URL di Resolver**:
   - Setiap pemutaran audio di `FiezelAudioResolver` membaca Cache API via IPC peramban (~50-150ms) dan membuat `URL.createObjectURL` baru yang langsung di-revoke saat selesai.
4. **Cache Warming Tertunda**:
   - Streaming langsung di `streamWithBlobFallback` sebelumnya menunggu event `ended` sebelum memanggil `warmCache(url)`. Bila murid melompat atau menjawab cepat, aset tidak pernah tersimpan di cache lokal.
5. **Prefetch Idle Callback Delay**:
   - `prefetchNextVoice()` menunda pemanggilan `say.prefetch` hingga 1200ms melalui `requestIdleCallback`.

---

## 2. Solusi & Perubahan yang Dilakukan

1. **In-Memory LRU Object URL Cache (`features/audio-assets/fiezel-audio-resolver.js`)**:
   - Menambahkan cache in-memory `memCache = new Map()` (kapasitas 80 entri) yang memetakan URL aset R2 ke URL objek Blob memori.
   - Jalur cepat sinkron (`Fast-path`): Jika URL sudah ada di `memCache`, pemutaran dimulai secara sinkron dalam waktu <10ms tanpa menunggu Cache API IPC atau jaringan.
   - Menambahkan pengisian `memCache` pada saat `prefetch()` dan `loadForPlayback()`.
   - Menambahkan `el.crossOrigin = 'anonymous'` dan memicu `warmCache(url)` segera pada event `playing` dan saat inisiasi streaming.
   - Mengekspos `inMemoryCacheSize: memCache.size` pada `status()` untuk pemantauan diagnostik.

2. **Optimasi Manifest Audio (`features/audio-assets/fiezel-audio-manifest.js`)**:
   - Mengubah `cache: 'no-cache'` menjadi `cache: 'default'` pada `fetchDoc()`.
   - Menginisiasi pemanasan manifest di latar belakang seketika (`setTimeout(..., 0)`) pada saat berkas dimuat di peramban.

3. **Prefetch Proaktif & Eliminasi Penundaan Idle (`app.js`)**:
   - `prefetchNextVoice()`: Mengganti penundaan `requestIdleCallback(..., { timeout: 1200 })` dengan `setTimeout(run, 0)` agar prefetch dieksekusi seketika pada tick berikutnya.
   - `homeView`: Menambahkan prefetch audio untuk `dailyWord.word` saat halaman beranda dibuka.
   - `flashcards`: Menambahkan prefetch audio untuk `v.word` dan `v.example` pada saat kartu aktif dirender.
   - `reviewVocab`: Menambahkan prefetch audio untuk `v.word` dan `v.example` pada saat kartu ulangan dirender.
   - `quizLoop`: Menambahkan prefetch audio untuk `q.script` saat soal `listening` dirender.

4. **Prefetch Proaktif Skills Lab (`features/speaking-listening/fiezel-speaking-listening-addon.js`)**:
   - Menambahkan prefetch audio untuk `item.script` pada `renderListening()` (tanpa menyentuh `renderListeningExam` sesuai batas invariant anti-bocoran ujian).

5. **PWA Release Arbiter & Anti-Ghost-Deploy**:
   - Build dinaikkan ke `m025-472` via `node tools/bump-build.mjs "perf(audio): in-memory cache dan prefetch proaktif untuk pemutaran secepat kilat"`.
   - Hexa-Sync 6 titik diverifikasi `Selaras`:
     - `coordination/BUILD-VERSION.json` (`m025-472`)
     - `sw.js` (`m025-472`)
     - `core-config.js` (`m025-472`)
     - `features/neural-voice/fiezel-diag-panel.js` (`m025-472`)
     - `kurikulum.html` (`m025-472`)
     - `misi.html` (`m025-472`)

---

## 3. Bukti Pengujian Empiris Nyata (Headless Chromium Playwright)

Skrip probe `tools/dev/probe-lightning-audio.mjs` dijalankan di peramban Chromium headless dengan pengukuran metrik nyata:
- **Manifest load time**: 0 - 10 ms (sebelumnya ~1500 - 3000 ms)
- **Proactive Prefetch status**: `true`
- **In-Memory Cache Active**: `true` (1+ items cached)
- **Time to First Sound (`playing` event)**: **28 ms** (jauh di bawah batas sub-100ms "secepat kilat", turun drastis dari ~3000 ms sebelumnya).

---

## 4. Status Gerbang Mutu Lokal

- `node tests/voice-callsite-prefetch-test.js`: **PASS (68/68 pass)**
- `node tests/audio-asset-pipeline-test.js`: **PASS (51/51 pass)**
- `node tests/audio-csp-media-src-test.js`: **PASS (7/7 pass)**
- `node tests/id-golden-snapshot-test.js`: **PASS (baseline emas utuh, 0 hilang, 0 baru)**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, 2 halaman, build m025-472)**
- `node tests/gate-registry-test.js`: **PASS (10/10 pass)**
- `node tests/secret-scan-test.js`: **PASS (46/46 assert PASS, 0 temuan)**
- `node tools/bump-build.mjs --check`: **Selaras (m025-472)**
