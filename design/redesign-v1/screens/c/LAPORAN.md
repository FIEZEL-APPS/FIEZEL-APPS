# LAPORAN — Rebrand Layar C (Listening + Vocabulary)

Hi-fi redesign HTML statis offline, 390×844, sistem **"Warm Paper, Bright Mind"** sesuai `redesign/DIRECTION.md` dan temuan `redesign/audit/AUDIT.md`. Referensi layar asli: `redesign/audit/shots/` (f10/f11/f11b-c listening, m13/f08b/f09b vocab).

## Deliverables

| File | Isi | PNG (390×844 @2x) |
|---|---|---|
| `listening.html` | Soal pilihan ganda listening + player audio baru | `listening.png` |
| `listening-dictation.html` | Mode dikte: player + input + "Nilai jawaban" | `listening-dictation.png` |
| `listening-feedback.html` | Hasil dikte + diff jawaban + transcript reveal + panel AI | `listening-feedback.png` |
| `vocab.html` | Flashcard depan/belakang + chip kategori + progress deck | `vocab.png` |
| `c.css` | Design system bersama (token DIRECTION.md, komponen) | — |
| `assets/` | Font FZ Plus Jakarta Sans 400–700 (woff2 lokal) + maskot | — |
| `verify_c.py` + `verify_report.json` | Verifikasi programatik (Playwright) | — |

Semua file berdiri sendiri offline (font lokal, ikon & maskot inline SVG, tanpa CDN/JS).

## Perbaikan wajib dari audit → status

| Temuan audit | Sebelum | Sesudah (terverifikasi) |
|---|---|---|
| Tombol "Dengarkan" coral pastel + putih | **1,92:1 GAGAL** | Permukaan ink `#241A11` + teks krem `#FDFAF3` = **16,37:1** |
| "Nilai jawaban" disabled pink pucat + putih | **1,45:1 GAGAL** | CTA ink + krem = **16,37:1**; state disabled baru: `--panel-soft` + teks `--muted` **5,69:1** + ikon gembok (bukan opacity) |
| Kunci internal "VOCABULARY PARTOFSPEECH" bocor ke UI | label teknis | Chip **"Kelas kata · Kata benda"** (mapping key→label Indonesia) di kedua sisi kartu |
| Lantai font 12px (nav 9,4px, eyebrow 9,6px, "Tanya FIEZEL?" 7px) | <12px | Semua teks ≥12px — dicek programatik per elemen, 0 pelanggaran |
| Touch target <44px (icon-button 39px) | <44px | Semua kontrol ≥44px (icon-btn 44, opsi 52–53, CTA 52+, nav item ≥52) |
| Maskot menutupi konten interaktif (menutup "Nilai jawaban" di f10) | overlap | **Slot khusus**: (a) slot inline 64px di player — maskot *listening* pakai **headphone**; (b) dock kanan-bawah di strip sendiri di atas bottom-nav, `pointer-events:none`, tidak pernah overlap kontrol |
| Tombol merah solid "Lanjut" tidak konsisten (f11b) | 2 bahasa visual | Satu sistem tombol: ink primer / sun / ghost putih |
| Teks hijau/merah kecil <4,5:1 | 3,97 / 4,24:1 | Varian teks `--good-ink #1F6B4E` (6,12:1) & `--bad-ink #A33422` (6,52:1) |

## Keputusan desain per layar

**listening.html** — IA asli dipertahankan (keluar, konteks level, soal MC, opsi, lanjut). Player audio baru: slot maskot headphone (kiri) + strip waveform statis **kuning Solar `#FFC700` di atas permukaan `--core`** (bagian terputar solid, sisa krem 30%) + waktu tabular `0:07/0:12` + chip "Diputar 1×" + CTA **"Dengarkan" ink/krem**. Opsi B menunjukkan state *selected* (sun-soft + border sun-deep). "Lanjut" ink aktif karena opsi terpilih.

**listening-dictation.html** — Judul & aturan dikte asli ("teks jawaban tidak disimpan", "script disembunyikan") dipertahankan. Input field 56px border sun-deep berisi jawaban; "Nilai jawaban" ink/krem; di bawahnya demo **state disabled baru**: "Lanjut — terbuka setelah dinilai" (panel-soft, teks 5,69:1, ikon gembok).

**listening-feedback.html** — Banner hasil hijau (ikon ✓, skor 80% tabular), **diff jawaban** token per kata (benar = good-soft, kata terlewat = chip sun putus-putus "+ Rio"), **transcript reveal** di panel-soft dengan `mark` kuning pada kata yang lolos, lalu satu panel **Bright Mind** (`--core` + garis neural kuning) "FIEZEL menganalisis" — dipakai hemat sesuai DIRECTION. CTA: "Ulangi audio" ghost + "Lanjut" ink. Maskot *celebrating* + coach bubble 2 baris di dock khusus.

**vocab.html** — Progress deck (bar sun-grad, "12 dari 310" + progressbar ARIA), kartu **depan** (chip level A2, chip "Kelas kata · Kata benda", kata 40px, IPA, hint "Ketuk kartu untuk membalik") dan kartu **belakang** ditampilkan sebagai state flip (panel-soft, rotasi 0,6°, arti + contoh kalimat dwibahasa, chip "Kata baru"). Aksi asli dipertahankan: Dengar kata / Dengar kalimat / **Tanya AI** (pill `--core` + sparkle sun = momen AI). Swipe hint 12px.

## Verifikasi programatik (`verify_c.py`, hasil `verify_report.json`)

Playwright merender tiap layar 390×844 dsf2 lalu memeriksa **semua elemen**:
1. **Kontras WCAG AA** — warna teks vs bg efektif (naik rantai ancestor, alpha di-composite): butuh ≥4,5:1 normal / ≥3:1 besar.
2. **Lantai font** — tidak ada teks <12px.
3. **Touch target** — semua `button/a/input/[role]` ≥44×44px.
4. **Layout** — tidak ada overflow 390×844 dan tidak ada konten terpotong di `main` (scrollHeight vs clientHeight).

Hasil akhir: **0 gagal** — listening 41 lolos, dictation 35, feedback 41, vocab 43 (total 160 cek).

Sampel angka kunci: "Dengarkan"/"Nilai jawaban"/"Lanjut" ink = 16,37:1; teks input = 17,06:1; disabled baru = 5,69:1; chip "Kelas kata" = 5,69–6,26:1; "Tanya AI" di core = 17,37:1; waktu waveform krem di core = ~16:1; eyebrow & label 12px+.

## Catatan

- **Fredoka tidak tersedia** di `fiezel-apps/assets/fonts/` (hanya Jakarta 400–700 + Instrument Serif). Sesuai fallback DIRECTION ("judul kartu/UI pakai Jakarta 700"), display/judul memakai **Jakarta 700** dengan tracking -0.01em; jika agen token menambahkan file Fredoka, cukup ganti `font-family` di `.q-title`/`.word`.
- Kuning dikanonisasi ke **Solar #FFC700** (waveform, nav aktif, chip, ikon F) — bukan #FFD23F lama.
- Coral/mint/lilac tidak dipakai sebagai permukaan tombol (demosi sesuai DIRECTION); semantik benar/salah memakai keluarga good/bad baru.
- `_shared.html` hanya catatan; markup topbar/nav disalin per file agar tiap layar berdiri sendiri.
