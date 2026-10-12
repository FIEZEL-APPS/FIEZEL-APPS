# FIEZEL HANDOFF: AUDIT PEDAGOGI UMPAN BALIK BRAINCORE (m025-568)

Tanggal: 2026-10-11 · Build: `m025-568` (lewat `tools/bump-build.mjs`; m025-567 sudah dipakai #595 yang mendarat lebih dulu) · Branch:
`claude/elegant-gates-lhkilc` · Basis: `main` @ `c541d5b` (m025-566), digabung dengan `main` @ `aa09537` (m025-567)

Otoritas: OWNER meminta audit forensik umpan balik BrainCore dengan lima dimensi (kesesuaian
stem, anti-tautologi/anti-gaslighting, presisi diagnosis, scaffolding vs spoiler, nada) dan
klasifikasi FATAL/MAJOR/MINOR. Laporan lengkap: `reports/BRAINCORE-PEDAGOGY-AUDIT-2026-10-11.md`.

## 1. Yang ditemukan & diperbaiki

| # | Tingkat | Ringkas | Kode/data |
|---|---------|---------|-----------|
| F1 | FATAL | Susun kata menuduh murid memasang pengecoh yang tidak ia pilih (75 pasangan soal) | `diagnoseTokenOrderMistake` hitung kelebihan kata (multiset); goyangan keping ikut |
| F2 | FATAL | Terjemahan berurutan sah dinilai salah + diagnosis "urutan salah" + tuntunan langkah yang menyuruh urutan yang ditolak | `tokenOrderMovableAlternates()` → `alternates`; naskah `tutor-step.token-step-1..3` id+th |
| F3 | FATAL (th) | Murid Thai menerima soal susun kata berbahasa Indonesia | locale th tidak memakai `FiezelGrammarTranslations` |
| F4 | FATAL | Reading "Pilihan … tidak ada di teks" bohong untuk pengecoh yang ada di teks (500 id + 530 th) | data + dua generator → "tidak didukung teks" |
| M1/M2 | MAJOR | Kunci bocor sebelum percobaan kedua: nudge retry, diagnosis susun kata, kalimat tutor, petunjuk tingkat 3/4 | `grammarHideKey()` (kunci → "…", teks pilihan murid dilindungi) |
| M3 | MAJOR | Petunjuk tingkat 1 selalu "subjek & penanda waktu" (juga untuk kata depan) | `explain.clue` = langkah pertama `reasoningId` (512/512, id+th) |
| M4 | MAJOR | Diagnosis urutan menempel aturan tense + HTML mentah | tempelan dihapus |
| M5 | MAJOR | Mode "bandingkan": "cuma kunci yang cocok" (tautologi) | `grammar.mode-contrast-expl-*` id+th → `{alasan}` |
| M6 | MAJOR | Soal percakapan cadangan tanpa alasan per pilihan & tanpa `sourceId` | dirakit lewat jalur pilihan ganda |
| M7–M10 | MAJOR | AR-004, QN-004, RS-008 ("admit" hantu), A1-009 (tautologi) | `tools/patch-braincore-pedagogy-2026-10-11.js` |
| M11 | MAJOR | Alasan berawalan "kata kerja…" tidak menamai kata yang salah | hanya `Kata “` yang dikembalikan apa adanya |
| m1–m4 | MINOR | b4_017/b5_002 alasan setengah, titik ganda cloze, kutipan dobel nudge, goyangan keping | diperbaiki |

## 2. Bukti

- Gerbang baru `tests/braincore-pedagogy-audit-2026-10-11-test.js` (15 cek, Node murni, fungsi asli
  dipotong dari `app.js` dan dicoba ke seluruh bank): `main` **0/15**, branch **15/15**.
- `tests/grammar-feedback-regression-test.js` (browser): B10 sempat merah di sesi ini karena
  menarik A1-303 (pegangan ingatan menyebut kunci) — gerbang lama itu hanya menguji satu soal
  acak; kelasnya ditutup M2 dan diuji ke seluruh bank di P2.
- Probe runtime (Chromium, id+th) dan pemindai `tools/dev/braincore-pedagogy-audit-2026-10-11-probe.js`
  — angka sebelum/sesudah di laporan §1–§2.
- `id-golden-baseline.json` diregenerasi sadar (`--write-baseline`).

## 3. Cara mengubah data ini lagi

1. Edit alasan di `grammar-templates.json` (field `...Id`) → `node tools/sync-grammar-explanations-id.js --write`
   → `node audit/merge-grammar-id.js`.
2. Kembaran Thai di `grammar-explanations-th.json`; salinan cloze di `cloze-bank-v1.json` +
   `features/i18n/cloze-bank-th.json` (+ peta `tools/th-strings/cloze.json`).
3. `tools/generate-th-cloze.js` **tidak bisa** dijalankan ulang di basis ini (600 string kurasi
   m025-541 belum terpeta — utang lama); tulis sidecar langsung seperti alat patch ini.
4. Reading: `tools/reading-a12-explain.mjs` (id) dan `tools/generate-th-reading.js` (th, byte-identik
   dengan data sekarang).

## 4. Utang (bertanggal 2026-10-11)

Terjemahan Thai 512 kalimat susun kata; penjelasan reading per jenis (anteseden untuk
*reference*); ±113 alasan "setengah"; jargon A1 (adverbia/nomina); pemetaan 600 string generator
cloze th; literal dua bahasa lama di `diagnoseTokenOrderMistake`; retry mode meta masih
mempersempit jawaban; pembangkit urutan alternatif sengaja konservatif. **Tinjauan penutur asli
Thai** untuk naskah baru (`tutor-step.token-step-*`, `grammar.mode-contrast-expl-*`, alasan th
RS-008/A1-009/QN-004-cloze, templat reading `ไม่มีข้อความในเนื้อเรื่องรองรับ`) — draf AI.
