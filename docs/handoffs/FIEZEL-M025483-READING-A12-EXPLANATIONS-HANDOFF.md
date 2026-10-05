# FIEZEL M025-483 — Penjelasan Reading A1/A2 + Sidecar Thai + Penjaga Locale

Status: siap PR. Build: **m025-483** (6 titik selaras via arbiter).

## 1. Temuan audit dan alasan perubahan

Bank `reading-bank.json` tingkat A1/A2 (100 bacaan × 5 soal = 500 butir) hanya menyimpan
`meta.evidence`. Tidak ada `meta.why` / `meta.whyOthersFail`. Akibatnya, umpan balik pasca-jawab
jatuh ke delapan templat bersama di `features/i18n/copy-id-app-d.js`:

- `reading.bukti-dulu-answer-belakangan` → "Bukti dulu, jawaban belakangan."
- `reading.cara-cepat-cari-bukti-dulu`
- `reading.answer-aman-harus-punya-bukti`
- `reading.fokus-item-adalah-cari-bagian`
- `reading.bagian-paling-mendukung-answer-adalah: "{evidence}"`
- dst.

Untuk 500 soal, teksnya nyaris seragam — inilah "ai slop" yang dilaporkan. Hanya 30 butir
(jalur B1+) yang punya `why` terkurasi.

Perbaikan:
1. **500 butir A1/A2** diberi `meta.why` + `meta.whyOthersFail` yang MENGUTIP `evidence` +
   jawaban tiap soal dan MENUNJUK pilihan yang bertentangan. 13 varian frasa per jenis soal
   (detail, main_idea, why, time, dst.) mencegah satu kerangka global mendominasi 500 soal.
2. **Sidecar Thai** (`features/i18n/reading-bank-th.json`) kini membawa `why`/`whyOthersFail`
   versi Thai (530 penjelasan; 500 baru + 30 B1+ yang sudah ada), disusun dari templat Thai +
   bukti Inggris + pilihan Thai.
3. **Penjaga locale di `app.js`**: overlay Thai menyalin `why` hanya bila sidecar punya versi
   Thai; jika tidak, bidang itu DIBUANG supaya penyaji jatuh ke templat netral ber-i18n,
   bukan membocorkan naskah Indonesia ke layar murid Thai.

## 2. Bukti pengujian empiris

Alat deterministik & idempoten: `node tools/reading-a12-explain.mjs --write` (500 diisi, 30
dilewati) dan `node tools/generate-th-reading.js` (530 penjelasan). Dijalankan di worktree ini.

Gate lokal (semua HIJAU):

| Gate | Hasil |
|---|---|
| `tests/th-bank-purity-test.js` | 26/26 PASS |
| `tests/th-coverage-test.js` | PASS |
| `tests/th-content-overlay-test.js` | PASS |
| `tests/th-ui-leak-test.js` | PASS |
| `tests/content-integrity-gate-test.js` | PASS |
| `tests/gate-registry-test.js` | PASS |
| `tests/locale-enum-test.js` | PASS |
| `tests/curriculum-cache-version-test.js` | PASS |
| `tests/id-golden-snapshot-test.js` (setelah `--write-baseline`) | HIJAU |

## 3. Berkas yang disentuh

- `reading-bank.json` — 500 penjelasan A1/A2.
- `features/i18n/reading-bank-th.json` — regenerasi sidecar (530 penjelasan Thai).
- `app.js` — penjaga locale pada overlay reading Thai.
- `tools/reading-a12-explain.mjs` — alat penulis penjelasan (baru).
- `tools/generate-th-reading.js` — sidecar Thai ikut membawa `why`/`whyOthersFail`.
- `id-golden-baseline.json` — baseline emas diregenerasi (naskah murid berubah secara sadar).
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`,
  `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` — bump m025-483.

## 4. Status gerbang & utang teknis tersisa

- `id-golden-snapshot` sengaja merah sampai baseline diregenerasi; sudah diregenerasi di commit
  yang sama sesuai instruksi gate.
- Catatan: lexer string di `tests/id-golden-snapshot-test.js` mudah kehilangan sinkronisasi
  pada blok `String(p?.id||'')` (`app.js`), sehingga baseline menyimpan fragmen kode sebagai
  "literal". Ini utang teknis gate, bukan produk — sebaiknya dibereskan terpisah.
- Templat generik serupa di bank lain (Listening `fsl.explain-*`, Cloze `quiz.intinya`,
  Vocab `quiz-vocab.pilihan-lain-*`) BELUM disentuh. Pola cacatnya sama.
