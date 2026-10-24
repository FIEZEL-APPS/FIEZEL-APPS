# FIEZEL Dossier Serah Terima Rilis: m025-661
**Subjek**: Perbaikan UX Voice Call Studio (Pembersihan Topbar API Key, Eliminasi Lonjakan Bottom Dock ke Ruang Hampa, dan Penghapusan Suara Aizuchi "Naruhodo")
**Tanggal**: 2026-10-24
**Versi Rilis**: `m025-661`
**Status CI Mutu**: 100% HIJAU (Lokal & CI Workflow)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

| Masalah yang Dilaporkan Pengguna | Akar Masalah (Root Cause) | Solusi & Tindakan Perbaikan |
|---|---|---|
| **1. Tombol & Modal API Key di Topbar** | Pada bilah navigasi atas `App.tsx`, terdapat tombol kunci (`<Key>`) dan modal input Gemini API key manual. Padahal 16 kunci API sudah dikelola otomatis di sisi backend Cloudflare Worker. | Tombol kunci dan modal API Key manual dihapus 100% dari UI. Pengguna tidak perlu lagi melihat atau mengisi API key apapun. |
| **2. Bottom dock naik & halaman nge-scroll ke ruang hampa saat murid menjawab** | `useEffect` memanggil `chatEndRef.current.scrollIntoView({ behavior: 'smooth' })`. Pada peramban seluler (Safari/Chrome), `scrollIntoView()` menggulir seluruh `window`/viewport dokumen ke atas melampaui dock `sticky bottom-0`, menciptakan ruang kosong putih ("ruang hampa") di bawah dock. | 1) `scrollIntoView()` dan elemen `chatEndRef` dihapus total.<br>2) Pengguliran dibatasi hanya pada elemen internal `<main ref={mainScrollRef}>` melalui `mainScrollRef.current.scrollTo(...)`.<br>3) `call.html` diproteksi dengan `overflow: hidden; position: fixed; inset: 0;` sehingga `window` mustahil bergulir.<br>4) Dock distabilkan sebagai flex child statis (`shrink-0 w-full z-30`). |
| **3. Suara asing ("なるほど！" / "Naruhodo!") muncul sebelum AI membalas** | Fungsi `playAcousticFiller()` memanggil `getThinkingFillers()` yang memutar suara aizuchi pra-rekam/sintesis Edge-TTS saat murid selesai bicara, menimbulkan desinkronisasi fatal dan benturan audio. | 1) Panggilan `playAcousticFiller()` dihapus total.<br>2) `getThinkingFillers()` dikembalikan sebagai array kosong `[]`.<br>3) Prewarming aizuchi dinonaktifkan sepenuhnya. AI membalas langsung secara alami tanpa frase buatan. |
| **4. Timeout koneksi WebSocket 3 detik memicu fallback lambat** | Ambang `connectTimer` 3000ms terlalu singkat untuk jaringan seluler Indonesia yang membutuhkan 3–5 detik untuk TLS + handshake Google AI Studio, memicu fallback ke Edge-TTS. | Ambang `connectTimer` dinaikkan menjadi 8000ms dengan 2 kali percobaan reconnect otomatis sebelum beralih ke cadangan. |

---

## 2. Bukti Pengujian Empiris (Probe-Driven Empirical Audit)

Skrip pengujian headless Chromium Playwright dijalankan pada viewport seluler iPhone 14 (390×844) melalui `tools/dev/probe-voice-call-ux-fixes.mjs`:

```
Test server running on port 56777
Navigating to call.html?tab=call&lang=ja...
API Key buttons found in topbar: NO (PASS)
Lucide Key icons found: 0 (PASS if 0)
Initial window.scrollY: 0
Dock bounding box before turn: y=777, height=67
After turn window.scrollY: 0
Dock bounding box after turn: y=777, height=67
Dock distance from bottom of viewport: 0px
Has unwanted "naruhodo" text: NO (PASS)

========================================
ALL EMPIRICAL AUDIT CHECKS PASSED (7/7)!
========================================
```

---

## 3. Daftar Berkas yang Diubah

1. `features/voice-studio/src/App.tsx`:
   - Menghapus import `Key`, `getThinkingFillers`, `prewarmThinkingFillers`.
   - Menghapus state `isApiKeyModalOpen`, `geminiApiKey`, `tempApiKey`.
   - Mengganti `chatEndRef` dan `scrollIntoView()` dengan `mainScrollRef.current.scrollTo(...)`.
   - Menghapus tombol modal API key dari topbar dan modal API key dari JSX.
   - Menghapus fungsi `playAcousticFiller()` dan pemanggilannya di `submitStudentTurn`.
   - Menyesuaikan timeout koneksi WebSocket ke 8000ms dan reconnect attempts ke 2.
   - Menstabilkan bottom dock menjadi `shrink-0 w-full z-30`.
2. `features/voice-studio/src/lib/liveTransport.ts`:
   - Mengembalikan `getThinkingFillers()` sebagai `[]`.
   - Menjadikan `prewarmThinkingFillers()` sebagai fungsi no-op.
3. `call.html` & `features/voice-studio/call.html`:
   - Menambahkan aturan viewport tetap `position: fixed; inset: 0; overflow: hidden;` pada `html, body`.
4. `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`:
   - Kompilasi ulang aset produksi Vite 6.4.5.
5. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json`, `kurikulum.html`, `misi.html`:
   - Sinkronisasi versi build arbiter ke `m025-661`.
6. `id-golden-baseline.json`:
   - Pembaruan baseline emas literal pasca-build.
7. `tools/dev/probe-voice-call-ux-fixes.mjs`:
   - Skrip probe otomatis verifikasi 7 kriteria kelulusan.

---

## 4. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS**
- `node tests/voice-studio-ui-architecture-test.js` -> **PASS**
- `node tools/dev/probe-voice-call-ux-fixes.mjs` -> **PASS**
- Hexa-Sync Check (`node tools/bump-build.mjs --check`) -> **Selaras (`m025-661`)**
