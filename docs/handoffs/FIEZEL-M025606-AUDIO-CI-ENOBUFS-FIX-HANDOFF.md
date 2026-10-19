# FIEZEL M025-606 Handoff Dossier: Eliminasi ENOBUFS Manifest Buffer Overflow di CI Audio Gemini TTS

**Nomor Rilis**: `m025-606`
**Cakupan**: `fix(audio): eliminasi ENOBUFS manifest buffer overflow di workflow ci gemini tts (m025-606)`
**Tanggal**: 19 Oktober 2026
**Status CI & Mutu**: 100% HIJAU (PASS)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Pada alur eksekusi produksi audio Gemini TTS (`.github/workflows/audio-gemini-generate.yml`), langkah penyimpanan manifest ke Git (`Simpan perubahan manifest ke Git`) mengalami kegagalan fatal pada percobaan rilis otomatis:

1. **Buffer Overflow `ENOBUFS` pada `child_process.execSync`**:
   - Berkas `audio/manifest.json` kini berukuran **1.077.726 byte (~1,03 MB)** seiring bertambahnya aset audio kosakata dan listening yang diproduksi.
   - Pada blok rekonsiliasi remote manifest saat push langsung ditolak oleh proteksi branch `main`:
     ```javascript
     const remote = JSON.parse(cp.execSync("git show origin/main:audio/manifest.json").toString());
     ```
   - Node.js `execSync` memiliki batas `maxBuffer` default sebesar 1.048.576 byte (1 MB). Ketika manifest melampaui 1 MB, pemanggilan tersebut langsung melempar galat:
     ```
     Error: spawnSync /bin/sh ENOBUFS
         at Object.spawnSync (node:internal/child_process:1120:20)
         at Object.execSync (node:child_process:983:15)
     ```
   - Kegagalan ini menghentikan alur kerja CI secara prematur sebelum alur fallback pembentukan Pull Request (`gh pr create`) dapat dieksekusi.

2. **Dampak terhadap Aset Cloudflare R2**:
   - Pada run #39115682139, 65 aset audio baru telah berhasil diproduksi oleh Gemini TTS API dan sukses diunggah ke Cloudflare R2, namun catatan manifest gagal di-commit ke Git akibat error `ENOBUFS` tersebut.

---

## 2. Solusi Teknis & Perubahan Sistemik

1. **Streaming Berkas Manifest Remote ke Temporary File**:
   - Menghilangkan ketergantungan pada buffer memori internal `child_process.execSync` di Node.js.
   - Mengalirkan keluaran `git show` secara langsung ke berkas sementara di disk `/tmp/remote-manifest.json`:
     ```bash
     git show origin/main:audio/manifest.json > /tmp/remote-manifest.json
     ```
   - Membaca berkas sementara tersebut menggunakan `fs.readFileSync("/tmp/remote-manifest.json", "utf8")` di dalam Node.js yang kebal terhadap batas ukuran berkas buffer spawnSync.
   - Menghapus berkas sementara (`rm -f /tmp/remote-manifest.json`) setelah penggabungan aset selesai.

2. **Penyelarasan Arbiter Hexa-Sync (m025-606)**:
   - Build version dinaikkan secara resmi melalui `tools/bump-build.mjs` ke `m025-606`.
   - 6 titik sinkronisasi terverifikasi selaras:
     - `coordination/BUILD-VERSION.json` (`m025-606`)
     - `sw.js` (`m025-606`)
     - `core-config.js` (`m025-606`)
     - `features/neural-voice/fiezel-diag-panel.js` (`m025-606`)
     - `kurikulum.html` (`?v=m025-606`)
     - `misi.html` (`?v=m025-606`)

---

## 3. Bukti Pengujian Empiris & Verifikasi Mutu

Seluruh gerbang mutu lokal telah diuji dan lulus 100%:
1. `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
2. `node tests/th-ui-leak-test.js` -> PASS (Nol kebocoran teks)
3. `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan pada build m025-606)
4. `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)

---

## 4. Daftar Berkas yang Dimodifikasi

1. `.github/workflows/audio-gemini-generate.yml`: Mengganti `execSync` manifest buffer dengan pengaliran berkas `/tmp/remote-manifest.json`.
2. `coordination/BUILD-VERSION.json`: Bump version ke `m025-606`.
3. `sw.js`: Sinkronisasi versi cache service worker `m025-606`.
4. `core-config.js`: Sinkronisasi konstanta build runtime `m025-606`.
5. `features/neural-voice/fiezel-diag-panel.js`: Sinkronisasi panel diagnosis `m025-606`.
6. `kurikulum.html`: Cache bust query string `?v=m025-606`.
7. `misi.html`: Cache bust query string `?v=m025-606`.
8. `docs/handoffs/FIEZEL-M025606-AUDIO-CI-ENOBUFS-FIX-HANDOFF.md`: Dokumen serah terima rilis resmi.
