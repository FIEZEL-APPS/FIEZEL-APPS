# LAPORAN — Rebrand: motion

Tanggal: 26 Agustus 2026. Basis: `/home/user/workspace/redesign/DIRECTION.md` +
audit integrasi fiezel-motion v2.1.

## Deliverable

| Berkas | Isi |
|---|---|
| `/home/user/workspace/redesign/motion/MOTION.md` | Kontrak motion lengkap: (1) prinsip OBSERVE→ANALYZE→ADAPT→TEACH→IMPROVE dipetakan ke 9 event app nyata dengan token durasi/easing; (2) tabel 14 primitive dengan status ada/perlu-retune/baru; (3) aturan panel AI core (morph 240ms, neural draw-in sekali, larangan loop partikel); (4) kebijakan prefers-reduced-motion per primitive; (5) budget performa mobile. |
| `/home/user/workspace/redesign/motion/motion-demo.html` | Demo offline (390px, tanpa library, ~10KB) memperagakan 5 primitive kunci dengan token baru: CardEntrance+stagger, SpringButton/ScalePress (ink & sun-grad), SuccessPulse/ErrorShake, ProgressFill (scaleX)+NumberCount (rAF tabular-nums), panel AI core (morph 240ms + neural draw-in 420ms + GlowPulse maks 2 iterasi). Ada blok reduced-motion penuh. |
| `/home/user/workspace/redesign/motion/demo-preview.png` | Screenshot verifikasi demo (headless Chromium, semua state dipicu). |

## Hasil audit singkat v2.1 (features/mascot/ + features/ui/)

- **Arsitektur sehat — PRESERVE.** `<fiezel-mascot>` 14 state + tabel TRANSIENT hold,
  corong `FiezelPaw` (multi-instance), pembungkus `pawReact/pawSetState` di app.js yang
  menghormati reduced-motion, confetti cap 120 (reduced→8). Titik pasang event sudah ada
  untuk correct/wrong, lesson-complete, listening-start/stop, question-shown, onboarding,
  streak-lost, thinking→encouraging (coach bubble).
- **Token rasa perlu retune:** spring lama `(.34,1.56,.64,1)` terlalu kartun → brand baru
  `--ease-spring (.34,1.4,.4,1)`; `--fz-fast` 120ms hanya dipertahankan untuk press-down;
  palet primitive UI masih maroon/gold lama → ganti ink/`--sun`. SVG maskot TIDAK disentuh.
- **Temuan penting:** `micro-ui.css` (toast, ring progres, checkbox, skeleton, equalizer)
  berstatus "referensi, belum dimuat index.html / belum di-precache" — separuh primitive
  yang diminta sebenarnya sudah ditulis di sana; langkah implementasi = muat + retune,
  bukan tulis ulang.
- **Utang performa:** `.fz-xp`, `.bar i`, `.voice-bundle-track`, `.daily-lock-track`,
  `.library-progress-line` menganimasikan `width` (layout per frame) → wajib pindah ke
  `transform: scaleX`. Duplikat keyframes shake (style.css ±4px vs fiezel-motion ±8px)
  disatukan jadi ±6px.

## Ringkasan status 14 primitive

- **Ada (2):** ScalePress, MascotReaction.
- **Perlu-retune (9):** FadeIn, SlideUp, SpringButton, CardEntrance, SuccessPulse,
  ErrorShake, ProgressFill (width→scaleX), ListeningWave (muat micro-ui + recolor),
  CompletionCelebration (recolor solar, sekuens serial ≤2.4s).
- **Baru (3):** NumberCount (helper JS rAF), GlowPulse (maks 2 iterasi, bukan infinite),
  HintReveal (scaleY reveal + sinkron `pawReact('hint')`).

## Keputusan yang mengikat agen layar hi-fi

1. Durasi hanya dari skala 120(press)/160/240/320/420ms; easing hanya `--ease` /
   `--ease-spring`.
2. Panel AI core: masuk morph 240ms lurus (bukan spring), neural draw-in SEKALI 420ms,
   keluar fade 160ms, TANPA loop partikel; satu-satunya loop saat analyzing = thinking
   dots ATAU shimmer, berhenti saat hasil keluar.
3. Maks 2 animasi bersamaan; transform/opacity only (pengecualian: stroke-dashoffset SVG,
   transisi warna ≤240ms); loop idle = breathe maskot + maks 1 loop status.
4. Reduced-motion tidak menghapus informasi: setiap primitive punya fallback statis
   (tabel di MOTION.md §4); ErrorShake & ListeningWave punya fallback non-gerak eksplisit.
5. Konten edukasi (teks soal/penjelasan) tidak pernah dianimasikan per-kata.
