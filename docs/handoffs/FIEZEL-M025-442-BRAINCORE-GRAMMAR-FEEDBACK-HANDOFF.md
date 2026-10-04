# FIEZEL m025-442 — Umpan balik BrainCore saat murid salah (grammar) + tiga audit lanjutan — Handoff

Tanggal: 2026-10-04 WIB
Release: `FIEZEL_PAGE_BUILD=m025-442`, `DIAG_BUILD=m025-442`, `SW_REV=m025-442-unified-grammar-20261002` (lewat
`tools/bump-build.mjs`; perubahan `features/neural-voice/fiezel-diag-panel.js` di PR ini HANYA
nomor build)
Branch / PR: `claude/inspiring-franklin-xml8hz` → FIEZEL-APPS/FIEZEL-APPS#484
Base: `origin/main` @ `1dff4b6d` (m025-441)
Otoritas: OWNER meminta audit umpan balik grammar (2026-10-03), menyetujui tangga bantuan yang
terlihat di layar retry (2026-10-04, "iya setuju"), lalu meminta seluruh temuan audit diperbaiki
(2026-10-04). Audit kosakata/FSRS, penempatan/IRT, dan offline diminta OWNER 2026-10-04.

## STATUS

Machine-verified lokal. Seluruh gerbang `.github/workflows/quality.yml` dijalankan: 324/326
hijau; `i18n-kunci-hantu` diperbaiki lalu hijau; `e2e-bridge-selftest` gagal identik di `main`
(tidak disentuh). CI GitHub `quality` hijau pada `cce82e55`. Terjemahan Thai baru = draf AI,
WAJIB ditinjau penutur asli sebelum rilis ke murid Thai.

## APA YANG BERUBAH (grammar, `reports/BRAINCORE-GRAMMAR-FEEDBACK-AUDIT-2026-10-03.md` §8)

1. **G1** widget susun kata tidak lagi menahan kiriman salah — 2 kesempatan, salah-lalu-benar
   tercatat salah (juga menutup celah di mode ukur).
2. **G2** satu pencocok alasan `grammarReasonEntry()` (eksak dulu, tidak pernah kunci): salah
   alamat 21% → 0.
3. **G3** 17 literal → copy id/th; gloss susun kata dari bank kosakata ber-overlay locale.
4. **G4** lencana "Nx keliru" dari riwayat sungguhan. **G6** tutor sesudah pembahasan tidak
   mengulang alasan / menyuruh coba lagi. **G12** tombol palsu "Simpan Rumus" dihapus.
5. **G5 + G7** retry menampilkan SATU anak tangga BrainCore (penuntun / pegangan ingatan /
   contoh mirip dari soal LAIN); sesi tutor dikirim ke `composeTurn` (rotasi + pemudaran hidup).
6. **G8** tingkat petunjuk dicatat (`hintLevel`), bobot BKT jawaban benar sesudah petunjuk
   diturunkan, tingkat 4 tidak lagi membuka `explain.why`. **G9** AI explain susun kata.
   **G10** pil "Penguasaan x%". **G11** kalimat cadangan tutor tidak lagi soal waktu.
7. Grader cloze menyetarakan kontraksi tak-ambigu.

Gerbang baru: `tests/grammar-feedback-regression-test.js` (22 cek, bagian browser lewat
`page.route` tanpa socket; merah pada kode lama).

## TIGA AUDIT LANJUTAN (laporan + probe, BELUM ada perbaikan kode)

- `reports/VOCAB-FSRS-AUDIT-2026-10-04.md` — rumus FSRS-lite benar, tetapi "Uji kosakata"/
  flashcards mengacak tanpa jadwal, naik level menghapus ulangan level lama, kartu matang yang
  lupa baru diulang ±3,8 hari. Probe: `tools/dev/vocab-fsrs-audit-2026-10-04-probe.js`.
- `reports/PLACEMENT-IRT-AUDIT-2026-10-04.md` — 3PL & Fisher benar; tebakan acak tidak lolos;
  murid sejati ditempatkan terlalu rendah di tes ringkas; tombol petunjuk tetap ada di mode ukur.
  Probe: `tools/dev/placement-irt-audit-2026-10-04-probe.js`.
- `reports/OFFLINE-SYNC-AUDIT-2026-10-04.md` — data lokal utuh lintas offline; dua tab saling
  menimpa (riwayat & gem hilang); `brainSyncFlush()` tidak pernah dipanggil. Probe:
  `tools/dev/offline-sync-audit-2026-10-04-probe.js`.

## LANGKAH BERIKUTNYA (menunggu keputusan OWNER)

1. Perbaikan temuan Tinggi tiga audit di atas (dua tab menimpa; tombol petunjuk di mode ukur;
   kalibrasi tes ringkas; jadwal ulangan di "Uji kosakata" dan lintas level).
2. G13: penjelasan bank video-grammar (20 entri) masih Inggris — butuh konten id/th.
3. Utang kebocoran Thai di luar jalur grammar yang ikut terlihat (lihat §8 laporan grammar).
4. Tinjauan penutur asli Thai untuk kunci baru `quiz.retry-why-*`, `tutor.ladder-*`,
   `grammar.gloss.*`, `quiz.pill-penguasaan`.
