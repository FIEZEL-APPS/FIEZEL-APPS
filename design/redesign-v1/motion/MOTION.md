# FIEZEL REBRAND — SISTEM MOTION "WARM PAPER, BRIGHT MIND"

Kontrak motion untuk semua layar hi-fi. Turunan langsung dari
`/home/user/workspace/redesign/DIRECTION.md` (bagian "Bahasa motion") dan hasil audit
integrasi fiezel-motion v2.1 di `/home/user/workspace/fiezel-apps/features/mascot/`
(`fiezel-mascot.js`, `fiezel-motion.css`, `micro-ui.css`) + `features/ui/`.

**Prinsip payung: sistem v2.1 SUDAH BAGUS — PRESERVE arsitekturnya (custom element
`<fiezel-mascot>` 14 state, corong `FiezelPaw`, primitive kelas `.fz-*`), RETUNE
token rasanya ke identitas baru, TAMBAH primitive yang belum ada. Jangan tulis ulang.**

---

## 0. Token motion (final, dipakai semua primitive)

```css
:root{
  /* dari DIRECTION.md — WAJIB, jangan bikin easing lokal baru */
  --ease:        cubic-bezier(.22,.8,.28,1);   /* keluar-masuk umum, "confident" */
  --ease-spring: cubic-bezier(.34,1.4,.4,1);   /* overshoot LEMBUT (bukan 1.56 lama) */

  /* skala durasi — rentang kontrak 160–420ms */
  --t-press: 120ms;  /* SATU-SATUNYA pengecualian <160ms: feedback tekan harus instan */
  --t-fast:  160ms;  /* micro: fade, press-release, hover */
  --t-base:  240ms;  /* default: entrance kartu, morph panel, nav */
  --t-slow:  320ms;  /* emphasis: feedback benar/salah, hint reveal */
  --t-max:   420ms;  /* langit-langit: draw-in neural, progress fill, selebrasi per-beat */
  --stagger: 60ms;   /* jeda antar anak list/kartu, maks 5 anak ber-stagger */
}
```

Delta terhadap v2.1 (`fiezel-motion.css` baris 26–35):

| Token v2.1 | Nilai lama | Nilai baru | Alasan |
|---|---|---|---|
| `--fz-spring` | `cubic-bezier(.34,1.56,.64,1)` | `--ease-spring` `(.34,1.4,.4,1)` | overshoot 1.56 terasa "kartun anak"; 1.4 = warm-confident sesuai posisi brand |
| `--fz-out` | `cubic-bezier(.22,1,.36,1)` | `--ease` `(.22,.8,.28,1)` | satu bahasa keluar dengan style.css baru |
| `--fz-fast` | 120ms | 120ms (khusus press) / 160ms (lainnya) | lantai kontrak 160ms kecuali press-down |
| `--fz-base` | 240ms | 240ms (tetap) | sudah pas |
| `--fz-slow` | 420ms | 420ms (tetap, jadi langit-langit) | sudah pas |
| palet `--fz-yel #FFD94F` / `--fz-maroon #8C2233` | maroon/gold lama | `--sun #FFC700`, ink `--text #241A11`, `--good/--bad` | primitive UI ikut palet baru; SVG maskot TIDAK diwarnai ulang (identitas PRESERVE) |

---

## 1. Prinsip motion identitas baru

Narasi brand **OBSERVE → ANALYZE → ADAPT → TEACH → IMPROVE** bukan hiasan — tiap fase
dipetakan ke event aplikasi nyata. Aturan rasa per fase: *observe tenang, analyze fokus,
adapt tegas, teach hangat, improve rayakan sebentar lalu diam*.

| Fase | Event app nyata (titik pasang yang sudah ada di `app.js`/README mascot) | Koreografi | Durasi / easing |
|---|---|---|---|
| **OBSERVE** | **Question entrance** — soal baru dirender (quiz/vocab/listening); hook `skillsLab()` → `question-shown` | Kartu soal `CardEntrance` (fade + slide-up 12px, TANPA scale besar); pilihan jawaban stagger; maskot `curious` 900ms hanya jika sedang idle | `--t-base` `--ease`; stagger `--stagger`, maks 5 anak |
| **OBSERVE** | **Listening aktif** — `listening-start` / `listening-stop` | `ListeningWave` (equalizer scaleY) hidup HANYA saat audio benar-benar berbunyi; maskot `st-listening` groove; berhenti total (`.paused`) saat pause/stop | wave loop 500ms `ease-in-out` alternate; masuk/keluar `--t-fast` |
| **ANALYZE** | **Answer press** — murid menekan pilihan | `ScalePress` turun `scale(.97)` saat pointer-down, balik dengan spring saat rilis; TIDAK ada animasi lain saat jari masih di layar | down `--t-press` `--ease`; up `--t-fast` `--ease-spring` |
| **ANALYZE** | **Analyzing / diagnosis AI** — "Nilai jawaban", BrainCore, coach `ask()` (`thinking`) | Panel AI core masuk **morph 240ms** (lihat §3); garis neural draw-in sekali; maskot `thinking` (titik-titik) sebagai SATU-SATUNYA loop selama menunggu | morph `--t-base` `--ease`; draw-in `--t-max` `--ease` |
| **ADAPT** | **Correct** — `answerFeedbackSignal()` → `FiezelPaw.react('correct')` | `SuccessPulse` di kartu jawaban (scale 1→1.04→1 + border/latar `--good`), maskot celebrating lv sesuai streak; XP `NumberCount` menyusul SETELAH pulse selesai (bukan bersamaan) | pulse `--t-slow` `--ease-spring`; count `--t-max` |
| **ADAPT** | **Wrong** — `react('wrong')` | `ErrorShake` translateX ±6px (turun dari ±8px — tegas tapi tidak menghukum), latar `--bad-soft`; maskot `confused`; jawaban BENAR di-highlight fade-in setelah shake selesai | shake `--t-slow` `ease-in-out`; highlight `--t-fast` |
| **TEACH** | **Hint reveal / teach card** — tombol hint, kartu re-teach, coach bubble | `HintReveal`: kartu clip-reveal dari atas (scaleY origin top di wrapper + counter-scale konten → tetap transform-only) + `GlowPulse` sekali di ikon bohlam; maskot `hinting` (bulb pop) | reveal `--t-slow` `--ease`; glow 2× 900ms lalu MATI |
| **IMPROVE** | **Completion** — `finishQuiz()` → `lesson-complete` | `CompletionCelebration`: maskot `completion` (jump ×2 + confetti sekali, cap 120 partikel sudah ada), ring skor `ProgressFill` + `NumberCount`, badge `SuccessPulse`. Total koreografi ≤2.4s lalu layar DIAM | per-beat ≤`--t-max`; urutan serial, bukan paralel |
| **IMPROVE** | **Nav transition** — pindah layar/tab, back-nav | Layar masuk `FadeIn` + slide-up 8px; layar keluar fade 120ms tanpa gerak; back-nav (fitur `fiezel-back-nav.js`) pakai arah kebalikan. TIDAK ada transisi >1 properti panel | masuk `--t-base` `--ease`; keluar `--t-press` |

Aturan lintas fase:
1. **Motion = informasi.** Setiap animasi menjawab "apa yang baru saja terjadi / apa yang sedang ditunggu". Konten edukasi (teks soal, penjelasan grammar) TIDAK dianimasikan per-karakter/per-kata — jangan over-animate materi belajar (kontrak DIRECTION).
2. **Satu momen, satu bintang.** Saat maskot bereaksi besar (celebrating/completion), UI di sekitarnya hanya boleh 1 animasi pendamping.
3. **Loop hanya untuk state menunggu**: idle breathe maskot, thinking dots, listening wave, skeleton shimmer. Semua feedback lain sekali jalan (`forwards`, iterasi ≤2).
4. **Panggil lewat corong.** Semua reaksi maskot lewat `pawReact()`/`pawSetState()` (pembungkus di `app.js`) — bukan `FiezelPaw` langsung, bukan `querySelector('fiezel-mascot')` (ada >1 instance hidup; pembungkus yang menghormati preferensi kurangi-gerak).

---

## 2. Inventaris primitive: ada / perlu-retune / baru

Basis audit: `fiezel-motion.css` (375 baris, dipakai), `micro-ui.css` (216 baris, referensi
belum di-load), `style.css` (keyframes `pageIn/riseIn/pop/shake`, token `--dur-s/m/l`),
`features/ui/skeleton-helpers.js`.

| Primitive | Sumber yang sudah ada | Status | Tindakan |
|---|---|---|---|
| **FadeIn** | `fzPopFade` (style.css confidence-pop, 200ms), fase opacity `pageIn` | **perlu-retune** | Jadikan kelas util `.m-fade`; durasi `--t-fast`, easing `--ease` |
| **SlideUp** | `riseIn` (style.css), `fzToastIn/fzToastLife` (micro-ui) | **perlu-retune** | Standarkan offset 8–12px (toast 28px → 16px); token baru; toast pindah warna ink+krem (perbaikan wajib audit #2) |
| **ScalePress** | `button:active{scale(.97)}` style.css (80ms), `.fz-btn:active` | **ada** | Pertahankan; seragamkan `--t-press` down / `--t-fast` spring up di SEMUA kontrol ≥44px |
| **SpringButton** | `.fz-btn` (hover lift −2px, active squash, shadow 3px) | **perlu-retune** | Ganti permukaan maroon → ink `--text`/`--sun-grad` (kontras ≥4.5:1, perbaikan audit #1); spring 1.56 → `--ease-spring` |
| **CardEntrance** | `.fz-motion-pop` + `.fz-stagger` (450ms, delay 30–330ms), `pageIn` | **perlu-retune** | 450ms → `--t-base`; translateY 16px → 12px; scale .94 → .97; stagger maks 5 anak (sekarang 6) |
| **SuccessPulse** | `.fz-answer.correct` (`fzCorrect` 500ms scale 1.04) | **perlu-retune** | 500 → `--t-slow`; warna `--good`/`--good-soft` token baru (nilai hampir sama, tinggal alias) |
| **ErrorShake** | `.fz-answer.wrong` (`fzShake` 450ms ±8px), `shake` style.css ±4px | **perlu-retune** | Satu versi saja: ±6px, `--t-slow`; hapus duplikat `shake` di style.css |
| **MascotReaction** | `<fiezel-mascot>` 14 state + `FiezelPaw.react()` + tabel TRANSIENT hold | **ada** (PRESERVE) | Jangan sentuh SVG/koreografi. Hanya retune `--fz-spring` → `--ease-spring` di scope `.fz-mascot` |
| **ProgressFill** | `.fz-xp` (transisi `width` .8s), `.bar i` (width .6s), `.fz-progress-ring` (dashoffset .8s) | **perlu-retune** | ⚠ transisi `width` = layout per frame → ganti `transform: scaleX(var(--p))` origin left (+ counter-scale label bila perlu); ring dashoffset boleh tetap (SVG paint-only); durasi `--t-max` |
| **NumberCount** | tidak ada (angka XP/skor langsung ganti) | **baru** | Helper JS kecil rAF, `Jakarta 700 tabular-nums` (anti layout-shift), durasi `--t-max`, ease-out; reduced-motion → set nilai final langsung |
| **GlowPulse** | mirip: `fzRingGlow` (internal maskot), `signalPulse` (style.css) | **baru** (sebagai primitive UI) | Kelas `.m-glow`: box-shadow/opacity halo `--sun` berdenyut, **iterasi maks 2 lalu berhenti** — bukan infinite; khusus momen AI & badge |
| **HintReveal** | maskot `st-hinting` ada; kartu hint muncul tanpa koreografi | **baru** | Wrapper scaleY 0→1 origin top + konten counter-fade; sinkron `pawReact('hint')`; `--t-slow` `--ease` |
| **ListeningWave** | `.fz-eq` equalizer 5 bar (micro-ui.css, transform-only, ada `.paused`) | **ada / perlu-retune** | Muat micro-ui.css (selama ini referensi saja!); warna maroon/gold → ink/`--sun`; wajib `.paused` saat audio berhenti |
| **CompletionCelebration** | `st-completion` + confetti JS (cap 120, reduced→8) + `.fz-levelup` pop+shine | **perlu-retune** | Confetti recolor solar (#FFDE59→#FFA500 + ink); shine sweep 1×; total sekuens ≤2.4s; TIDAK ada loop bintang infinite di luar hold 2600ms maskot |

Catatan integrasi: `micro-ui.css` berisi separuh primitive di atas tapi **belum dimuat
`index.html` dan belum di-precache `sw.js`** — langkah implementasi pertama adalah
memuatnya (setelah `fiezel-motion.css`) dan me-retune tokennya, bukan menulis ulang.

---

## 3. Aturan panel AI core (Bright Mind)

Panel gelap `--core #1B1418` adalah momen paling "AI" — motion-nya harus terasa presisi,
bukan pesta.

1. **Masuk: morph 240ms.** Panel muncul dengan `opacity 0→1` + `transform: scale(.96)→1`
   (origin dari elemen pemicu bila ada), durasi `--t-base`, easing `--ease`. Bukan pop
   spring — spring untuk dunia Warm Paper, panel AI masuk lurus dan yakin.
2. **Garis neural: draw-in SEKALI.** Path SVG kuning `--sun` dianimasikan
   `stroke-dashoffset → 0` selama `--t-max` (420ms), delay 80ms setelah morph mulai,
   `forwards`. Setelah tergambar, garis DIAM (boleh `GlowPulse` maks 2 denyut saat
   status berubah, mis. diagnosis selesai).
3. **DILARANG loop partikel terus-menerus.** Tidak ada bintang/orbit/partikel infinite
   di dalam panel. Satu-satunya loop yang diizinkan selama state `analyzing` adalah
   indikator menunggu tunggal (thinking dots maskot ATAU shimmer 1 baris) — dan harus
   berhenti pada frame hasil keluar.
4. **Keluar: 160ms fade** + scale ke .98, tanpa spring, tanpa confetti. Panel AI tidak
   merayakan dirinya sendiri; selebrasi milik hasil belajar di Warm Paper.
5. **Konten di dalam panel**: teks hasil `FadeIn` + slide-up 8px stagger maks 3 blok;
   angka diagnosis pakai `NumberCount`.

---

## 4. Kebijakan `prefers-reduced-motion` per primitive

Dua gerbang yang SUDAH ada dan dipertahankan: media query OS + `body.reduce-motion`
(preferensi in-app via `enhanceUI()`); pembungkus `pawReact/pawSetState` sudah menjaga
maskot. Kebijakan baru per primitive (fallback ≠ "mati semua" — informasi tetap sampai):

| Primitive | Saat reduced-motion |
|---|---|
| FadeIn | Tetap, dipersingkat 100ms (fade murni aman-vestibular) |
| SlideUp | Jadi FadeIn (hapus translate) |
| ScalePress / SpringButton | Hapus lift/scale; ganti perubahan warna latar `--sun-press` instan |
| CardEntrance | Konten langsung tampil; tanpa stagger, tanpa translate |
| SuccessPulse | Tanpa scale; perubahan warna border/latar `--good` instan + ikon ceklis statis |
| ErrorShake | TANPA shake (gerak lateral = pemicu vestibular terburuk); border+latar `--bad` instan + ikon X |
| MascotReaction | Sudah ditangani: subtree `.fz-mascot` durasi .01ms, confetti cap 8; pose akhir state tetap terlihat (ekspresi statis) |
| ProgressFill | Lompat ke nilai akhir tanpa transisi |
| NumberCount | Tampilkan angka final langsung |
| GlowPulse | Mati total; ganti outline statis `--sun-deep` 2px bila glow membawa makna |
| HintReveal | Kartu tampil instan; bohlam statis |
| ListeningWave | Bar statis tinggi 60% + label teks "Sedang memutar…" (status harus tetap terbaca tanpa gerak) |
| CompletionCelebration | Tanpa confetti/jump; kartu skor + badge tampil instan, `SuccessPulse` versi warna-saja |
| Panel AI core | Morph & draw-in jadi fade 100ms; garis neural langsung tergambar penuh; thinking dots jadi label "Menganalisis…" statis |

Aturan penulisan: setiap primitive baru WAJIB punya blok `@media (prefers-reduced-motion:
reduce)` + selektor `body.reduce-motion` sendiri, di-scope (JANGAN `*` global — sudah ada
dua jalur global di style.css:486 & :809, jangan ditumpuk lagi).

---

## 5. Budget performa mobile

Target: 60fps di perangkat Android kelas menengah, layar 390×844.

1. **Transform & opacity SAJA.** Pengecualian terdokumentasi: `stroke-dashoffset`/
   `stroke-dasharray` untuk draw-in SVG (paint-only), dan transisi warna latar/border
   pendek ≤240ms pada feedback jawaban. DILARANG menganimasikan `width/height/top/left/
   margin/padding/font-size/box-shadow besar`. Utang yang harus dibayar saat retune:
   `.fz-xp > b` (width .8s), `.bar i` (width .6s), `.voice-bundle-track span`,
   `.daily-lock-track span`, `.library-progress-line span` → semua ke `scaleX`.
2. **Maks 2 animasi bersamaan** di viewport (di luar loop idle maskot). Koreografi
   panjang (completion) dieksekusi serial per-beat, bukan paralel. Stagger dihitung
   1 animasi.
3. **No layout thrash.** JS tidak membaca `offsetWidth/getBoundingClientRect` di antara
   penulisan style dalam frame yang sama; `NumberCount` menulis `textContent` via rAF
   dengan `tabular-nums` agar lebar tidak berubah; force-reflow untuk replay animasi
   hanya lewat pola yang sudah ada (`void el.offsetWidth` sekali, sebelum menambah class).
4. **`will-change` hanya sesaat**: dipasang tepat sebelum animasi, dilepas di
   `animationend`. Tidak ada `will-change` permanen di CSS.
5. **Loop idle dibatasi**: breathe + ear-twitch maskot (sudah ada) + maksimal SATU loop
   status (thinking dots ATAU listening wave ATAU skeleton shimmer) — tidak pernah dua
   loop status bersamaan.
6. **Confetti**: tetap pakai cap 120 partikel per instance (sudah diimplementasi
   `fiezel-mascot.js` [P1-3], reduced → 8); satu burst per completion, tidak berulang.
7. Ukuran: tidak ada library motion eksternal. CSS keyframes + ≤2KB helper JS
   (NumberCount, will-change janitor).

---

## 6. Demo

`/home/user/workspace/redesign/motion/motion-demo.html` — offline, tanpa dependensi,
memperagakan 5 primitive kunci dengan token baru: CardEntrance (stagger), SpringButton +
ScalePress, SuccessPulse/ErrorShake, ProgressFill + NumberCount, dan panel AI core
(morph 240ms + neural draw-in, tanpa loop partikel). Menghormati
`prefers-reduced-motion`.
