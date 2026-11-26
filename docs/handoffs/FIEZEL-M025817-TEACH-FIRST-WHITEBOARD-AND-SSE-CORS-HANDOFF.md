# FIEZEL Handoff Dossier — `m025-817` (Teach-First Whiteboard Pedagogy & SSE CORS Parity)

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Temuan Pedagogis Inti (Masukan Pengguna pada Topik *Past Tense* & Pertanyaan Umum)**:
   - Sebelum `m025-817`, kompilasi papan tulis AI (`route-voice-live.js` versi `wb-v6`) hanya membangkitkan 4 langkah di mana `Beat 1` langsung berupa latihan interaktif (`interactive_mechanic` / `socratic_slider` dengan `pauseForInteraction: true`) tanpa kartu pembahasan konsep, rumus, dan contoh nyata terlebih dahulu.
   - Selain itu, `whiteboardDirector.ts` sebelumnya menimpa diagram garis waktu `timeline_track` secara langsung menjadi kuis `socratic_slider`, menghapus langkah penjelasan `note` saat ada `interactive_mechanic`, serta menyisipkan `pauseForInteraction: true` pada diagram penjelasan utama sehingga murid langsung disodori pertanyaan interaktif sebelum memahami konsep dasarnya.
2. **Temuan CORS Streaming Produksi (`routeVoiceWhiteboardStream`)**:
   - Endpoint `POST /api/voice/whiteboard-stream` sebelumnya mengembalikan `'access-control-allow-origin': '*'` statis pada respons `ReadableStream`, padahal klien `fetch` di `https://fiezel.my.id` mengirim `credentials: 'include'`. Peramban memblokir respons wildcard tersebut (`net::ERR_FAILED`) sehingga jatuh ke jalur fallback JSON.

## 2. Solusi Arsitektural yang Diterapkan
1. **Arsitektur 5-Tahap *Teach-First* (`0 Konsep` -> `1 Penjelasan` -> `2 Praktik` -> `3 Bedah` -> `4 Uji`)**:
   - **`workers/api/voice/route-voice-live.js`**:
     * Menaikkan kunci cache papan tulis ke `wb-v7-teach-first-live` dan `wb-v7-teach-first`.
     * Memperbarui `runFastOpenerOnly` dan `buildBoardCompilerPrompt` ke protokol 5-langkah *Teach-First*: **Beat 0 (`heading`, `pauseForInteraction: false`)** berisi definisi inti yang utuh dan jelas (12-24 kata) + pembuka lisan langsung; **Beat 1 (`mind_map` / `formula_blocks` / `table` / `timeline_track` / `contrast_scale`, `pauseForInteraction: false`)** WAJIB menjelaskan fungsi, rumus/pola, contoh kalimat nyata beserta artinya, serta peringatan jebakan umum secara singkat namun detail (3-4 kalimat lisan ~40-65 kata) tanpa jeda kuis; baru setelah itu **Beat 2** dan **Beat 3** (`pauseForInteraction: true`) menyajikan latihan interaktif terbimbing yang menguji materi Beat 1.
     * Menambahkan pengaman di sanitizer `whiteboardSteps` agar langkah murni penjelasan (`heading`, `mind_map`, `formula_blocks`, `timeline_track`, `table`, `note`, `contrast_scale`, `metaphor_scene`, `rough_scene`, `kanji_grid`, `highlight_callout`) selalu memiliki `pauseForInteraction: false`.
     * Mengganti `'access-control-allow-origin': '*'` pada `routeVoiceWhiteboardStream` dengan `...(ctx?.corsHeaders || {})` agar SSE streaming berjalan mulus (`200 OK`) pada origin kredensial resmi.
   - **`features/voice-studio/src/lib/whiteboardDirector.ts`**:
     * Menghentikan penghapusan langkah penjelasan `note` dan pengubahan paksa `timeline_track` menjadi kuis; `socratic_slider` kini ditambahkan sebagai langkah latihan terpisah (Fase 2) setelah `timeline_track` (Fase 1).
     * Menambahkan jaminan deterministik *Teach-First* (`wb_teach_first_past_tense`, `wb_teach_first_past_vs_perfect`, dan `wb_teach_first_breakdown`) sehingga meskipun payload mentah hanya memiliki langkah interaktif atau berasal dari parser STEM, papan tulis selalu menampilkan kartu **Penjelasan & Contoh** yang lengkap (misalnya 4 cabang *Simple Past Tense*: Fungsi & Waktu, Kalimat Positif `S + Verb 2`, Kalimat Negatif `S + did not + Verb 1`, Kalimat Tanya `Did + S + Verb 1?`) sebelum jeda latihan interaktif pertama.
     * Menata ulang urutan kolom akhir sehingga seluruh langkah penjelasan selesai dan tetap terlihat di atas latihan interaktif baik pada layar ponsel satu kolom maupun desktop dua kolom.
   - **`features/voice-studio/src/components/LiveWhiteboardCanvas.tsx` & `WhiteboardVisualDiagrams.tsx`**:
     * Menampilkan lencana penanda eksplisit **`1. PENJELASAN & CONTOH DULU`** (`data-testid="wb-teaching-phase-badge"`) pada kartu penjelasan serta merapikan indikator pena agar tidak ganda pada komponen diagram.

## 3. Bukti Pengujian Empiris (Playwright Headless Mobile `390x844`)
Dieksekusi melalui probe Playwright Chromium pada 5 skenario lintas bahasa dan matematika (`past-tense`, `past-vs-perfect`, `algebra`, `prepositions`, `triangle-area`):
- `allPassed: true`, `pageErrors: []`.
- Pada seluruh 5 skenario, kartu `[data-wb-step-role="teaching-explanation"]` terbukti selesai dirender penuh (`state === "completed"`, `domIdx === 1`) tepat di atas kartu latihan interaktif pertama yang berhenti menunggu murid (`state === "waiting-socratic"`, `domIdx === 2`).

## 4. Berkas yang Disentuh & Status Gerbang Mutu Lokal
- `workers/api/voice/route-voice-live.js`
- `features/voice-studio/src/lib/whiteboardDirector.ts`
- `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx`
- `features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx`
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`
- `id-golden-baseline.json`
- Gerbang mutu lokal: `id-golden-snapshot-test.js` PASS, `th-ui-leak-test.js` PASS, `curriculum-cache-version-test.js` PASS (`m025-817`), `gate-registry-test.js` PASS (10/10), `bump-build.mjs --check` Selaras.
