# LAPORAN — Rebrand Layar A (Onboarding · Home · Library)

Hi-fi redesign HTML statis offline, mobile 390×844, konsep **"Warm Paper, Bright Mind"** sesuai `/home/user/workspace/redesign/DIRECTION.md` dan temuan `/home/user/workspace/redesign/audit/AUDIT.md`.

## Deliverable

| File | Isi |
|---|---|
| `onboarding.html` / `onboarding.png` | Langkah 1 dari 6 (nama) — struktur 6 langkah asli dipertahankan (Nama · Intro · Tujuan · Level · Pengingat · Ringkasan), kulit baru |
| `home.html` / `home.png` | Dashboard: sapaan + kartu lanjut belajar + grid 6 modul + streak/target harian + bottom nav baru; maskot di dock |
| `library.html` / `library.png` | Pemilihan lesson (Grammar Hub): CEFR chips A1–C2 + daftar lesson dengan prasyarat/gembok, disabled state baru |
| `base.css` | Token + komponen bersama (topbar, tombol, chips, nav, dock maskot) |
| `assets/fonts/` | FZ Plus Jakarta Sans 400–700 (aset lokal app) + Fredoka variable (di-bundle lokal → tetap offline) |
| `render_audit.js` + `audit_report.json` | Skrip render Playwright + audit programatik dan hasil lengkapnya |

Semua halaman berjalan **offline penuh** (font woff2 lokal, semua ikon & maskot SVG inline, tanpa CDN/JS runtime).

## Arsitektur informasi: dipertahankan

- **Onboarding** — 6 langkah asli utuh; layar nama memuat elemen yang sama dengan `m02_onboarding_1_name.png` (judul, penjelasan, label NAMA PANGGILAN, input, catatan privasi, CTA Lanjut). Ditambah *logo reveal statis* (panel Bright Mind gelap `#1B1418` + wordmark ivory/gold + garis neural kuning) yang menjembatani splash gelap → app krem (temuan audit 3c), dan *maskot greeting* mengisi lingkaran maskot yang kosong pada desain lama (temuan 3c "aset tidak termuat").
- **Home** — urutan asli dipertahankan: topbar (wordmark + Tanya FIEZEL + settings) → identitas hari (tanggal, level A2, target Sekolah) → ring target harian 2/5 + streak → CTA utama belajar → "Pilih fokus hari ini" grid 2 kolom 6 modul (Vocabulary/Grammar/Reading/Perpustakaan/Classroom/Speaking+Listening dengan meta asli) → bottom nav 5 tab. Hero dipadatkan sesuai audit 3b ("hero memakan >1 layar") — grid kini terlihat tanpa scroll. "KATA FIEZEL"/coaching menjadi bagian kartu **Lanjut belajar** di panel Bright Mind (momen AI, dipakai hemat sesuai DIRECTION).
- **Library/lesson selection** — elemen `m14_grammar_view` utuh: judul hub, deskripsi prasyarat, pemilih level (baris "Level belajar A2 · Ganti" → CEFR chips A1–C2 dengan fade-indicator, perbaikan pola overflow chips temuan 3b), kartu "Jalur A2 · Dasar, percakapan sehari-hari", daftar lesson bernomor dengan judul asli, focus-line, Mastery %, CTA per lesson, badge A2.

## Perbaikan wajib DIRECTION yang diterapkan di layar-layar ini

1. **CTA kontras tinggi** — semua tombol utama permukaan sun-grad (#FFDE59→#FFA500) teks ink; rasio terukur terburuk **8.64:1** (≥4.5 ✓).
2. **Lantai font 12px** — audit programatik computed style: **0 teks <12px** di ketiga layar (eyebrow 12px tracking lebar, label nav 12px — menggantikan 7–10.6px lama).
3. **Disabled state baru** — lesson terkunci: latar `--panel-soft`, teks `--muted` #6E5E47 (≈5.2:1 di panel-soft, ≥4.5 ✓), ikon gembok + baris prasyarat eksplisit ("Prasyarat: selesaikan Lesson 3 dulu") + pill "Terkunci" — bukan opacity rendah.
4. **Touch target ≥44px** — audit programatik: **0 kontrol <44px** (icon-button 44, chips min-height 44, nav item 56, dismiss maskot hit-area 44 dengan visual 26).
5. **Aturan maskot** — PAW tidak pernah menutupi konten: onboarding = slot inline greeting; home = dock kanan-bawah 88px **dengan tombol dismiss**, layout grid disetel (teks di atas, tile ikon kiri-bawah) sehingga dock hanya menimpa whitespace kartu — diverifikasi programatik (0 overlap teks); library = slot inline di kartu Jalur (menggantikan bubble melayang yang menutupi kartu buku di `m17`).
6. **Focus-visible ring** 2px `--sun-deep` offset 2px konsisten di semua kontrol.
7. **Demosi pastel** — coral/mint/lilac tidak lagi jadi permukaan tombol; aksen tinggal di maskot & semantic (good/bad).
8. **Tipografi** — Fredoka (display/judul layar) + Jakarta 400–700 (UI); Instrument Serif dihapus perannya; weight hanya yang ada file font (tidak ada faux-bold 650/750/800); angka data tabular-nums.

## Verifikasi mandiri (programatik, Playwright 390×844 dSF2)

Skrip `render_audit.js` mengevaluasi computed style seluruh elemen; hasil penuh di `audit_report.json`:

| Cek | onboarding | home | library |
|---|---|---|---|
| Teks <12px | **0** | **0** | **0** |
| Touch target <44px | **0** | **0** | **0** |
| Kontras teks gagal (AA 4.5:1 / 3:1 large, worst-case gradien) | **0** | **0** | **0** |
| Dock maskot menimpa teks | **0** | **0** | **0** |

Sampel rasio kontrol kunci: btn-sun (ink di worst-stop #FFA500) 8.64:1 · chip aktif 16.28:1 · label nav 5.97:1 · btn-ghost 17.06:1. Satu temuan iterasi (badge "Lanjut di sini" 4.37:1 di `--info-soft`) diperbaiki → teks #6F561A ≥4.5:1.

## Catatan aset

- Fredoka tidak ada di `fiezel-apps/assets/fonts/`; variable font (latin, weight 300–700) diunduh sekali dari Google Fonts dan **di-bundle lokal** — HTML tetap 100% offline.
- Wordmark: versi ivory/gold asli untuk panel gelap (onboarding reveal); varian baru **ink + sun-deep** (geometri sama) untuk topbar di permukaan Warm Paper.
- Maskot: `paw-mascot-head.svg` asli, inline.
