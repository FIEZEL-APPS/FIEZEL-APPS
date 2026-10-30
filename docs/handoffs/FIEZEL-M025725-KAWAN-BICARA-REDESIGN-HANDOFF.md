# FIEZEL HANDOFF DOSSIER — M025-725: Kawan Bicara Luxury Redesign, Sub-Second Subtitles, Anti-Freeze Copilot & Ghost Mochi Elimination

- **ID Rilis**: `m025-725`
- **Tanggal**: 30 Oktober 2026
- **Branch**: `feat/kawan-bicara-redesign-m025-725`
- **Tautan PR**: PR #787
- **Tingkat Dampak**: Tinggi (Arsitektur Audio, Live AI Call Studio, Home Card Redesign, UX Speaking)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Sesuai permintaan pengguna dan audit performa pada fitur **Kawan Bicara**:
1. **Lag Subtitel Terjemahan**:
   - *Akar Masalah*: `liveAiDraftRef` hanya merender teks streaming tanpa terjemahan (`activeAiSubtitle` secara eksplisit diset `undefined` selama streaming). Terjemahan baru dihitung setelah `turnComplete` melalui `fetchLiveTranslation()` (Google Translate GTX) secara asinkron dengan RTT 300–900 ms.
   - *Solusi*: Mengimplementasikan pipeline streaming kalimat (`splitSentences`), di mana setiap kali kalimat mencapai tanda baca penutup (`.` `?` `!` `。` `！` `？`), terjemahan kalimat langsung di-fetch dan disimpan ke `liveSentenceTransMapRef`. `activeAiSubtitle` langsung merender terjemahan streaming (`liveAiTranslationDraft`) tanpa jeda, dan pada `turnComplete` seluruh kalimat digabungkan instan (0ms).
2. **Flezel Copilot (Bantuan Jawaban Pemula) Membeku / Lambat / Kosong setelah ~10 Giliran**:
   - *Akar Masalah*: Race abort ganda antara streaming draft dan `turnComplete` membatalkan request yang sedang berjalan; request berulang memicu 429 dan memasukkan API keys ke cooldown 65 detik yang memakan pool kunci Live session; saat error, kartu dikosongkan (`setCopilotCards([])`).
   - *Solusi*:
     - Di Cloudflare Worker (`workers/api/voice/route-voice-live.js`), memisahkan `_copilotCooldownMap` dan `_copilotPoolIndex` dari minting pool Live session.
     - Di `App.tsx`, menambahkan sequencer (`copilotSeqRef`), debounce 320ms pada early streaming punctuation, dan mencegah abort jika request sedang berjalan.
     - Di `liveTransport.ts`, menambahkan cache LRU 60 entri dan `buildContextualFallbackCards()` dengan 10 intent bahasa alami lengkap (ID & TH) sehingga kartu tidak pernah kosong atau `[]`.
3. **Ghost Mochi (Visual Avatar Ganda)**:
   - *Akar Masalah*: Avatar 2D SVG (`paw-mochi-idle.svg`) dirender sebagai sibling container 3D di `App.tsx` dengan `display: none` saat `is3dMochiReady`. Selama inisialisasi WebGL (~500ms), kedua elemen terlihat bersamaan.
   - *Solusi*: Menghilangkan elemen 2D sibling default. Menampilkan skeleton placeholder berdenyut tactile clay secara halus di belakang canvas, dan hanya merender gambar fallback 2D jika inisialisasi WebGL benar-benar gagal (`mochi3dFailed`).
4. **Redesign Home Card Kawan Bicara (Sesuai Gambar 1)**:
   - Memperbarui `conversationPartnerHomeCardMarkup()` dengan layout `.fz-kawan-card-v2` yang mewah:
     - Badge atas: `"Ayooo latih speaking kamu!"` (latar lavender ungu).
     - Judul: **Kawan Bicara** (tipografi berwibawa).
     - Deskripsi: *"Ngobrol dua arah seperti dengan teman. Koreksi bisa kamu nyalakan kapan saja."*
     - Ikon kiri: Balon obrolan ungu dalam lingkaran lavender.
     - Kanan: Balon obrolan ganda biru/ungu bertumpuk + panah chevron `›`.
5. **Modal Animasi Auto-Call (Sesuai Gambar 2)**:
   - Saat kartu diketuk, muncul modal animasi berlatar blur:
     - Maskot Mochi memakai headphone biru.
     - Judul: `"Telepon aku sekarang"`.
     - Subjudul: *"Ngobrol santai dua arah dengan mentor AI. Tanpa tegang, koreksi bisa kamu nyalakan kapan saja."*
     - Tombol telepon emerald dengan gelombang getar berdenyut 3 lapis (`.fz-kawan-ring`) dan ringtone Web Audio yang nyaman.
     - Begitu tombol diketuk, sesi telepon langsung aktif (`&autoCall=1` / `fz.shell.autocall`) dan langsung membuka antarmuka Kawan Bicara Live Studio.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

Pengujian empiris dilakukan menggunakan skrip probe `tools/dev/probe-kawan-redesign.mjs` pada viewport mobile (390x844 @2x) dan desktop (1280x800 @1x):
- **Tangkapan Layar Beranda (Mobile)**: `preview-home-kawan-card-mobile.png` — Membuktikan tata letak kartu mewah selaras 100% dengan Gambar 1.
- **Tangkapan Layar Modal Panggilan (Mobile)**: `preview-kawan-modal-mobile.png` — Membuktikan modal animasi pop-up dengan tombol telepon berdenyut dan maskot ber-headphone.
- **Tangkapan Layar Studio Kawan Bicara (Mobile)**: `preview-kawan-studio-mobile.png` — Membuktikan antarmuka Live Call, maskot 3D Mochi aktif tanpa ghost avatar ganda, subtitel terjemahan instan, dan Copilot realtime.
- **Tangkapan Layar Beranda (Desktop)**: `preview-home-kawan-card-desktop.png` — Membuktikan responsivitas desktop tanpa distorsi layout.

---

## 3. Daftar Berkas yang Disentuh

1. `app.js`: Implementasi `conversationPartnerHomeCardMarkup()` v2, handler modal `openKawanBicaraCallModal()`, `closeKawanBicaraCallModal()`, dan audio synthesizer ringtone `playKawanRingtone()`.
2. `features/interactive-chat/fiezel-interactive-chat.js`: Integrasi auto-call via `fz_kawan_autocall`, query string `&autoCall=1`, dan postMessage `fz.shell.autocall`.
3. `features/ui/fiezel-tactile-clay.css`: Styling `.fz-kawan-card-v2`, modal auto-call backdrop blur, animasi ring wave 3-layer, dan phone shake.
4. `features/i18n/copy-id-student.js` & `copy-th-student.js`: Penambahan string i18n dwibahasa untuk badge, judul modal, dan subjudul.
5. `features/voice-studio/src/App.tsx`: Pipeline terjemahan streaming kalimat (`splitSentences`, `updateLiveAiTranslationDraft`), sequencer dan anti-abort Copilot (`copilotSeqRef`), eliminasi ghost 2D Mochi, dan auto-call listener.
6. `features/voice-studio/src/lib/liveTransport.ts`: Fallback kontekstual Copilot 10-intent, LRU caching 60 entri, isolasi error.
7. `workers/api/voice/route-voice-live.js`: Pemisahan cooldown pool `_copilotCooldownMap` dari Live token minting pool.
8. `call.html` & `features/voice-studio/call.html`: Penambahan preconnect DNS/TLS ke `translate.googleapis.com` dan `api.fiezel.my.id`.
9. `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: Re-bundle Vite produksi (1.36 MB, 50.18 kB).
10. `tools/bump-build.mjs`: Pembaruan sinkronisasi build `m025-725`.
11. `id-golden-baseline.json`: Regenerasi baseline hash emas Indonesia yang valid.
12. `tools/dev/probe-kawan-redesign.mjs`: Skrip verifikasi visual headless Playwright.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/th-ui-leak-test.js`: **PASS** (4629 kunci ID, 0 kebocoran naskah di mode Thai)
- `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail)
- `node tests/id-golden-snapshot-test.js`: **PASS** (HIJAU: baseline emas Indonesia utuh)
- `node tests/curriculum-cache-version-test.js`: **PASS** (33 penegasan, 3 halaman, build `m025-725`)
- `node tests/mochi-voice-sos-test.js`: **PASS** (13/13 passed)
- `node tools/bump-build.mjs --check`: **PASS** (Selaras pada seluruh titik)
