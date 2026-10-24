# FIEZEL HANDOFF DOSSIER: M025-650 — FIX CREAM BLANK SCREEN BY DESTRUCTURING TARGETLANG

Tanggal: 24 Oktober 2026
Build: m025-650
Branch: fix/m025-650-fix-cream-screen-targetlang-reference-error
Target: main
Arbiter: node tools/bump-build.mjs "fix(voice-studio): m025-650 fix cream screen reference error by destructuring targetLang in BeginnerAnswerAssistant"

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

* **Keluhan Pengguna**:
  > *"kenapa jadi error ketika dibuka fitur ini"*
  > *"hanya muncul layar warna cream seluruh layar"*
* **Akar Masalah (Bukti Empiris Playwright Probe)**:
  - Eksekusi Playwright headless pada `call.html` menangkap fatal error:
    `[PAGE CRASH/ERROR] targetLang is not defined`
    `DOM childCount: 0, bgColor: rgb(255, 249, 238)` (warna krem latar `bg-[#FFF9EE]`).
  - Pada iterasi M025-649, properti `targetLang` ditambahkan ke `interface BeginnerAnswerAssistantProps` di `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx` dan dipanggil di baris 126 (`targetLang={targetLang}`) serta 136 (`targetLang === 'ja'`).
  - Namun, variabel `targetLang` lupa dimasukkan ke dalam objek destrukturisasi parameter fungsi komponen (`export const BeginnerAnswerAssistant = ({ locale, ... })`).
  - Akibatnya, saat React merender komponen ini, terjadi JavaScript runtime `ReferenceError: targetLang is not defined` yang menyebabkan seluruh pohon komponen React unmount dan hanya menyisakan latar belakang halaman berwarna krem.
* **Solusi**:
  - Menambahkan `targetLang` dan `scenario` ke dalam parameter destrukturisasi `BeginnerAnswerAssistant.tsx`.
  - Rebuild bundel produksi Vite `dist/voice-studio.js`.
  - Verifikasi empiris melalui Playwright probe `tools/dev/verify-cream-fix.mjs`:
    * `rootFound: true`
    * `childCount: 1`
    * `hasHudAiText: true`
    * `hasPttBtn: true`
    * `Errors caught: 0`
    * Halaman berhasil tampil utuh tanpa error.

---

## 2. Bukti Pengujian Empiris

Dijalankan melalui skrip probe peramban Chromium: `node tools/dev/verify-cream-fix.mjs`

```text
DOM Results: {
  "rootFound": true,
  "childCount": 1,
  "hasHudAiText": true,
  "hasPttBtn": true,
  "hudText": "Hey there! Good to see you at the cafe. What would you like to drink today, and what are you doing after our coffee?",
  "headerTitle": ""
}
Errors caught: 0
Screenshot saved to tools/dev/verify-cream-fix.png
SUCCESS: Full Voice Studio UI rendered cleanly with zero errors!
```

Quality Gate Results:
- `node tests/id-golden-snapshot-test.js`: **HIJAU**
- `node tests/curriculum-cache-version-test.js`: **OK (m025-650)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **Selaras m025-650**

---

## 3. Berkas yang Disentuh

1. `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`: Destrukturisasi `targetLang` dan `scenario`.
2. `features/voice-studio/dist/voice-studio.js`: Bundel produksi Vite terbaru.
3. `id-golden-baseline.json`: Pembaruan baseline literal bundel.
4. PWA Build Hexa-Sync: `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`.
5. `docs/handoffs/FIEZEL-M025650-FIX-CREAM-SCREEN-DESTRUCTURE-TARGETLANG-HANDOFF.md`: Dokumen serah terima ini.
