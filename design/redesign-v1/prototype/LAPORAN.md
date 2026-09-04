# LAPORAN — Rebrand: Prototype Flow Interaktif

Tanggal: 26 Agustus 2026 · Agen: prototype flow · Basis: `/home/user/workspace/redesign/DIRECTION.md` ("Warm Paper, Bright Mind")

## Deliverable

| File | Isi |
|---|---|
| `redesign/prototype/index.html` | Prototype offline — device frame 390×844 di tengah halaman, latar netral warm-gray, tombol **Reset flow** global di bawah frame |
| `redesign/prototype/app.js` | Logika alur + factory maskot SVG statis + templat 5 layar |
| `redesign/prototype/fonts/` | FZ Plus Jakarta Sans 400/500/600/700 (woff2, offline) |
| `redesign/prototype/qa/flow-01..06.png` | Screenshot 6 state hasil QA Playwright |
| `redesign/prototype/qa/qa_flow.js` | Skrip QA (bisa diulang: `node qa/qa_flow.js`, server `serve . -l 4173`) |

Dibangun mandiri (tidak menunggu file layar agen lain), IA mengikuti screenshot audit di `redesign/audit/shots/`.

## Alur 6 langkah (klik-able, ringkas)

1. **Home** (`flow-01`) — greeting display 28px, panel Bright Mind `#1B1418` + garis neural kuning ("BrainCore · Adaptif"), kartu Lanjut belajar dgn CTA ink, stat row, tab bar (label 12px), maskot **wave** di dock kanan-bawah 88px + coach bubble 2 baris auto-dismiss 4,5 dtk.
2. **Lesson select** (`flow-02`) — kartu rekomendasi PAW aktif + 2 kartu terkunci (ikon gembok + teks kontras di `--panel-soft`, bukan opacity rendah — perbaikan audit #4), maskot **curious** di slot inline kartu.
3. **Quiz benar** (`flow-03`) — jawab "walked" → verdict hijau `+10 XP`, **why card** "Kenapa benar?" (border kiri solar), maskot **happy** (mata arc + bintang) di slot verdict, tombol lanjut ink.
4. **Quiz salah + hint bertahap** (`flow-04`) — jawab "eat" → shake + verdict merah **encouraging** ("Belum tepat — dan itu nggak apa-apa"), maskot **encouraging** (keringat + paw terangkat) → tombol petunjuk membuka **hint 1 lalu hint 2** (maskot berganti pose **hinting** dgn bohlam); opsi tetap bisa dijawab sampai benar.
5. **Listening** (`flow-05`) — **player baru**: tombol play bundar 64px permukaan ink (kontras ≥10:1 — perbaikan audit #1), waveform + track gradasi solar, waktu tabular, tombol "Dengarkan ulang" permukaan `--sun`; transkrip muncul setelah audio (4 dtk simulasi) dan tombol selesai berubah dari disabled (gembok) → `--sun`. Maskot **listening** (headphone + not musik).
6. **Completion** (`flow-06`) — maskot **celebrating** (mata hati + dua tangan terangkat + bintang), ring progres 100% gradasi `#FFDE59→#FFA500` teranimasi, confetti, stat XP/akurasi/runtun (akurasi dihitung dari percobaan nyata: 2 benar dari 3 → 67%), panel gelap "Catatan PAW" adaptif (menyebut jumlah hint yang dipakai), tombol Kembali ke Home + **Ulangi alur (reset)**.

## Sistem visual & motion (kepatuhan DIRECTION)

- **Token**: seluruh blok `:root` DIRECTION dipakai apa adanya (surface krem, ink, keluarga Solar #FFC700, panel core, semantic good/bad/info, radius, shadow).
- **Motion**: transisi antar layar fade + slide **240ms** `--ease` (maju slide kanan, mundur slide kiri); press tombol/opsi pakai `--ease-spring` (scale .96); konten masuk `riseIn` 320ms. Tidak ada over-animasi pada konten edukasi.
- **Maskot**: SVG **statis** — 7 pose berbeda dirakit factory dari geometri `promo-v7/shared/mascot/fiezel-mascot.js` (bukan komponen `<fiezel-mascot>` penuh); patuh aturan maskot: dock 88px / slot inline, tak pernah menutupi konten interaktif, bubble maks 2 baris auto-dismiss.
- **Tipografi**: Jakarta 400–700; skala 28/22/18/15/13/12, lantai 12px, angka `tabular-nums`. ⚠️ **FZ Fredoka tidak tersedia offline** di `fiezel-apps/assets/fonts/` — `--font-display` fallback ke Jakarta 700 (family 'FZ Fredoka' tetap dideklarasikan duluan; tinggal drop woff2 + `@font-face` bila agen token menyediakan filenya).
- **Perbaikan audit yang ikut terbawa**: #1 CTA ink/sun kontras tinggi, #3 label nav & eyebrow 12px, #4 disabled state kontras + gembok, #6 semua kontrol ≥44px, #7 focus ring 2px `--sun-deep` offset 2px (terlihat di flow-03 pada tombol "Soal berikutnya").

## Aksesibilitas

- Semua interaksi `<button>` asli → keyboard-accessible penuh; QA memverifikasi jawab quiz via **Enter** dan fokus programatik.
- Fokus dipindah ke judul layar (`tabindex="-1"`) tiap transisi; fokus tidak hilang saat tombol hint habis (pindah ke kartu hint terakhir).
- `aria-live` pada area feedback, `role=progressbar` + `aria-valuenow` pada bar quiz, `aria-pressed` + label dinamis pada tombol play, `aria-label` deskriptif per pose maskot.
- **prefers-reduced-motion**: semua animasi/transisi dipangkas ke .01ms (float maskot, confetti, waveform dance, shake, count-up ring langsung ke nilai akhir). Diverifikasi via konteks Playwright `reducedMotion:'reduce'` → 0 animasi berjalan >50ms.

## Hasil QA Playwright (`qa/qa_flow.js`)

- Klik **seluruh alur** end-to-end dgn input pengguna nyata (klik + keyboard): Home → lessons → Q1 benar → Q2 salah → hint 1 → hint 2 → Q2 benar → listening (verifikasi tombol selesai disabled sebelum audio, enabled sesudah) → completion (ring 100%, akurasi 67%).
- Uji tambahan: tombol back per layar, **Reset flow** dari completion & tombol global (state kembali `{qIndex:0, attempts:0, ...}`), alur ulang pasca-reset, run reduced-motion.
- Screenshot 6 state → `qa/flow-01.png … flow-06.png` (deviceScaleFactor 2).
- **0 pageerror, 0 console error**; viewport 390×844 tanpa overflow horizontal; tak ditemukan clipping/kontras lemah pada 6 state yang diperiksa.

## Cara menjalankan

Buka `redesign/prototype/index.html` langsung di browser (offline, tanpa build). QA ulang: `serve /home/user/workspace/redesign/prototype -l 4173` lalu `node qa/qa_flow.js`.
