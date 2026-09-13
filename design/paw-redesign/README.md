# Arsip Desain — Redesign PAW & Identitas Bunyi FIEZEL (2026-08)

Arsip permanen dokumen desain gelombang redesign maskot PAW + splash v4 + pustaka
SFX "Ascent & Crown" yang diintegrasikan pada build **m025-173**. Ini DOKUMENTASI,
bukan kode produksi — kode hidup di `features/brand/`, `features/audio/`, dan
aset produksinya di `assets/audio/sfx/` + `assets/audio/paw-textures/`.

## Indeks

| Lokasi | Isi |
|---|---|
| `FIEZEL-PAW-REDESIGN-SPECIFICATION.md` | Spesifikasi induk redesign PAW (satu dokumen payung untuk semua sistem di bawah) |
| `systems/07..20-*.md` | Sistem desain per bab: ekspresi (07), pose (08), state (09), motion (10), splash & onboarding (11), lesson layer (12), reaksi (13), voice-SFX (14), penjajaran pawprint (15), benchmark Duolingo (16), ruling isu terbuka (17), log penamaan & ruling (18), sistem outfit (19), sistem SFX (20) |
| `systems/*-sheet-*.png/.svg` | Proof sheet final: `expressions-sheet-14`, `poses-sheet-16`, `outfit-sheet`, `storyboard-splash-v3` (PNG + SVG) |
| `systems/proof-sheet-v2-notes.md`, `splash-v*-respec-findings.md`, `_v1.1-integration-log.md` | Catatan iterasi/respec yang melahirkan versi final |
| `directions/selected-direction.md` | Keputusan arah desain terpilih (Arah C — expressive) |
| `directions/direction-c.svg` | Vektor arah C yang dimenangkan |
| `assets/paw-master.svg`, `assets/paw-master-head.svg`, `assets/README.md` | Master vektor maskot PAW (badan penuh + kepala) beserta katalog rendernya |
| `sfx/SFX-CONTRACT.md` | Kontrak produksi 27 sampel SFX (mekanika render, tangga RMS, format) |
| `sfx/lib/MOTIF.md` | Motif merek "Ascent & Crown" (F4→A4→C5→G5) — DNA melodi seluruh pustaka |
| `sfx/reports/*.md` | Laporan QA/penerimaan per keluarga bunyi: foundation, answers, progress, exams, notifs, paw, splash_ui, qa-acceptance |

## Yang sengaja TIDAK diarsipkan

- Tangkapan layar dev/QA (`qa/`, `audit/`, render pembanding) — artefak kerja, bukan desain.
- Generator Python (`*.py`) beserta `__pycache__`-nya — perkakas sekali pakai;
  sumber kebenaran adalah SVG/PNG hasil akhirnya yang ada di sini.
- Spektrogram QA audio — bukti proses, tinggal di workspace desain.

## Kaitan ke produksi (m025-173)

- Splash v4: `features/brand/fiezel-splash.js` + `fiezel-splash-particles.js` +
  `fiezel-splash-equalizer.js` + `fiezel-splash-pawstamp.js` (ketukan dari
  `fiezel-choreography.js`).
- SFX: `features/audio/fiezel-ui-sfx.js` memutar 27 sampel `assets/audio/sfx/`
  (OGG + fallback MP3). `paw_greet` = suara khas FIEZEL (ruling OA-9);
  `stamp_thud` pensiun sebagai pemicu.
- Tekstur kucing mentah (OA-8): `assets/audio/paw-textures/` — bahan promo permanen OWNER.
