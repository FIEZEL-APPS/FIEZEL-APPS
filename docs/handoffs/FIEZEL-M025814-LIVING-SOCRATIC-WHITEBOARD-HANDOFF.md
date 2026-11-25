# FIEZEL Handoff Dossier — m025-814: Living Socratic Whiteboard v2 (Combinatorial Interactive Labs & Dual Scratch Engine)

- **Authority**: Disetujui langsung oleh **OWNER / MASTER** (`FIEZEL-APPS`) setelah inspeksi visual 8 tangkapan layar *preview* lintas perangkat Desktop (`1280×860`) & Mobile PWA (`390×844`).
- **Build Target**: `m025-814` (`SW_REV`, `FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `kurikulum.html`, `misi.html`, `call.html`, `index.html`, `coordination/BUILD-VERSION.json` 100% selaras).
- **Status**: **READY FOR PRODUCTION MERGE & LIVE PWA DEPLOYMENT** (15/15 Whiteboard Contract Gates HIJAU, 36/36 Kawan-Bicara Lock-In Gates HIJAU, 8/8 Voice Studio UI Architecture HIJAU, Golden Snapshot Indonesia HIJAU).

---

## 1. Ringkasan Audit & Alasan Perubahan

Berdasarkan evaluasi empiris pada fitur Papan Tulis (*Kawan Bicara / Mitra Kaiwa Studio*), ditemukan empat keterbatasan utama pada generasi sebelumnya:
1. **Interaksi Pasif Satu Arah**: Murid hanya mendengarkan penjelasan tanpa jeda interaktif Sokratik (*pause-gate*) maupun manipulasi langsung di atas kanvas papan tulis.
2. **Visual & Interaksi Monoton**: Warna didominasi hijau seragam (`#15803D`) dan kontrol variabel menggunakan elemen `<input type="range">` standar peramban yang kaku.
3. **Ketiadaan Animasi Scratch Asli**: Belum tersedia efek goresan sketsa bertahap `roughjs` maupun lapisan kapur/perak gosok interaktif (*scratch-off foil*).
4. **Cakupan Lintas Disiplin (STEM + Bahasa)**: Papan tulis perlu menangani Bahasa Inggris/Jepang/Mandarin sekaligus Matematika (Aljabar, Geometri Pythagoras, Pecahan, Fungsi) dan Fisika (Vektor Gaya Hukum II Newton, Gelombang) dengan rumus KaTeX murni dan pelafalan TTS manusiawi.

### Solusi Arsitektural (`m025-814`)
- **11 Mekanik Interaktif Taktil Langsung di Kanvas**:
  1. `scratch_reveal` (*Tactile Scratch-Off Foil* — kanvas HTML5 `destination-out` berlapis arsiran `roughjs` yang digosok jari/kursor untuk menyingkap sketsa & rumus kunci).
  2. `balance_seesaw` (*Equilibrium Physical Scale* — jungkat-jungkit sketsa di atas tumpuan `roughjs` dengan fisika kemiringan beban *real-time*).
  3. `venn_bucket_sorter` (*Hand-Sketched Zone Sorter* — tiga zona elips berarsir *hachure / cross-hatch / dots* untuk menyortir konsep ruang/waktu/kategori).
  4. `wire_node_connector` (*Bezier Ink Circuit* — penarikan kabel tinta kurva Bezier antar pasangan pemicu dan kalimat/rumus).
  5. `rotary_dial_gauge` (*180° Sketched Protractor/Compass* — jarum derajat putar langsung di atas busur kompas `roughjs`).
  6. `fraction_slice_shader` (*Pie Sector Hachure Shader* — ketuk juring lingkaran untuk mengarsir pecahan secara hidup).
  7. `magnetic_slot_builder` (*Blueprint Magnet Rail* — perakitan urutan langkah aljabar/sintaksis ke slot cetak biru).
  8. `wave_pendulum_oscillator` (*Live 60fps Wave Canvas* — geser frekuensi gelombang sinus secara langsung di kanvas).
  9. `direct_2d_canvas_lab` (*Direct SVG Vertex/Rim/Vector Puller* — tarik titik sudut segitiga Pythagoras, tepi lingkaran, atau ujung panah gaya Newton langsung di atas sketsa tanpa *slider* peramban).
  10. `surgical_ink_strike` (*Rough Red Double-Slash Strike* — ketuk kata jebakan untuk mencoretnya dengan goresan merah ganda `roughjs`).
  11. `step_derivation` (*Cascading KaTeX Step Proof* — penurunan rumus langkah demi langkah dengan slot pembuktian interaktif).
- **8 Palet Tinta Studio Artisanal × 5 Gaya Arsiran Rough.js + Tombol Live `"Variasi Lab"`**:
  - Kolom Kiri (Beat 1) dan Kolom Kanan (Beat 2) dijamin selalu memakai mekanik berbeda dan palet kontras (*Cobalt Blueprint*, *Terracotta Atelier*, *Violet Prism*, *Crimson Scalpel*, *Amber Fulcrum*, *Teal Oscillator*, *Indigo Constellation*, *Emerald Botanical*).
  - Tombol **`Variasi Lab`** (`data-testid="wb-remix-mechanic-btn"`) merombak papan secara instan ke kombinasi mekanik, arsiran, dan palet baru pada topik yang sama.
- **Integrasi Otoritas Braincore**: Setiap percobaan murid pada ke-11 mekanik mengalirkan telemetri jujur (`isCorrect: true/false`, tanpa pujian palsu pada jawaban keliru) ke mesin penguasaan Braincore.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Chromium)

Pengujian dijalankan terhadap *build* produksi menggunakan Chromium Playwright pada dua profil perangkat:
- **Desktop (`1280×860`, DPR 2)** — 6 skenario berbeda + klik live `Variasi Lab`:
  - `visibleRangeSliders: 0` (nol elemen `<input type="range">` polos yang terlihat).
  - `hasVenn: true`, `hasScratchFoil: true`, `remixedLabIds: ["wb-wire-connector-lab"]`.
  - `docOverflowX: false`, `consoleErrors: []`.
- **Mobile PWA (`390×844`, DPR 2)** — Aljabar `BalanceSeesawLab` & Modal `RotaryDialGaugeLab`:
  - `hasDial: true`, `docOverflowX: false`, `consoleErrors: []`.

---

## 3. Daftar Berkas yang Disentuh

1. `features/voice-studio/src/types/voiceCall.ts` — Definisi tipe `InteractiveMechanicKind`, `InkPaletteId`, `RoughHatchKind`, dan payload mekanik pada `WhiteboardStepCommand`.
2. `features/voice-studio/src/components/RoughScratchEngine.tsx` — Mesin 8 palet tinta artisanal, animasi goresan `stroke-dashoffset`, dan 8 komponen lab interaktif baru.
3. `features/voice-studio/src/components/WhiteboardInteractiveManipulatives.tsx` — Manipulasi langsung SVG `roughjs` tanpa *slider* peramban, coretan bedah kalimat, penurunan KaTeX, dan router `PolymorphicInteractiveLab`.
4. `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx` — Tata letak *Borderless Living Ink*, tombol `Sela / Tanya`, tombol `Variasi Lab`, dan pewarnaan judul mengikuti palet tinta papan.
5. `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx` — Orkestrasi *Socratic pause-gate*, umpan balik ke Braincore, dan state `mechanicVariantNonce`.
6. `features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx` & `features/voice-studio/src/index.css` — Peningkatan keterbukaan kanvas sketsa tanpa kotak kaku berlapis.
7. `features/voice-studio/src/lib/boardSpeechText.ts` — Konversi simbol LaTeX/STEM ke pelafalan lisan alami untuk TTS.
8. `features/voice-studio/src/lib/whiteboardDirector.ts` — Orkestrator kombinatorik (`synthesizePolymathStemBeats`, `buildDynamicTopicRemixPair`, kontras palet Kiri vs Kanan).
9. `workers/api/voice/route-voice-live.js` — Pembaruan instruksi kompilator Gemini agar menghasilkan variasi mekanik, palet, dan arsiran secara generatif.
10. `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css` — Hasil kompilasi produksi Vite.
11. `tests/whiteboard-contract-test.js` & `id-golden-baseline.json` — Penambahan Gerbang Kontrak #15 (15/15 lulus) dan penyelarasan baseline snapshot Indonesia.
12. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html` — Kenaikan versi atomik `m025-814`.

---

## 4. Langkah Berikutnya / Roadmap Pasca-Rilis

1. Pantau telemetri penyelesaian gerbang Sokratik lintas mekanik di sesi live murid guna mengukur durasi interaksi rata-rata per *beat*.
2. Perluas variasi sketsa dasar di bawah lapisan `scratch_reveal` untuk topik Biologi/Kimia (struktur sel & ikatan molekul) pada iterasi berikutnya.
