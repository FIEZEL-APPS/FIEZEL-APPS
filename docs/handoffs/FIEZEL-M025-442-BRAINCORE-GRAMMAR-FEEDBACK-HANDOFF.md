# FIEZEL m025-442 — Umpan balik BrainCore saat murid salah (grammar) + tiga audit lanjutan — Handoff

Tanggal: 2026-10-04 WIB
Release: `FIEZEL_PAGE_BUILD=m025-442`, `DIAG_BUILD=m025-442`, `SW_REV=m025-442-unified-grammar-20261002` (lewat
`tools/bump-build.mjs`; perubahan `features/neural-voice/fiezel-diag-panel.js` di PR ini HANYA
nomor build)
Branch / PR: `claude/inspiring-franklin-xml8hz` → FIEZEL-APPS/FIEZEL-APPS#484
Base: `origin/main` @ `1dff4b6d` (m025-441)
Otoritas: OWNER meminta audit umpan balik grammar (2026-10-03), menyetujui tangga bantuan yang
terlihat di layar retry (2026-10-04, "iya setuju"), lalu meminta seluruh temuan audit diperbaiki
(2026-10-04). Audit kosakata/FSRS, penempatan/IRT, dan offline diminta OWNER 2026-10-04;
perbaikan prioritas tingginya (P-A, P-B, V-A/V-B, dua tab + brainSyncFlush) disetujui OWNER 2026-10-04.

## STATUS

Machine-verified lokal (bagian grammar; status suite untuk perbaikan audit lanjutan ada di PR). Seluruh gerbang `.github/workflows/quality.yml` dijalankan: 324/326
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

## TIGA AUDIT LANJUTAN + PERBAIKAN PRIORITAS TINGGI (disetujui OWNER 2026-10-04)

Laporan + probe: `reports/VOCAB-FSRS-AUDIT-2026-10-04.md`, `reports/PLACEMENT-IRT-AUDIT-2026-10-04.md`,
`reports/OFFLINE-SYNC-AUDIT-2026-10-04.md`; probe di `tools/dev/*-audit-2026-10-04-probe.js`. Status
perbaikan per temuan ada di bagian terakhir tiap laporan.

1. **P-A** mode ukur tanpa lampu petunjuk dan tanpa "intip arti" (`app.js` topbar `draw()`,
   `renderTokenOrder(..., {measure})`). Probe: 0/120 layar penempatan bertombol petunjuk (dulu
   108/108); strategi "baca petunjuk" turun 77% → 17,5% benar.
2. **P-B** tes ringkas: `placementLiteBandLevel` (tanpa plafon akurasi, satu kekeliruan di band
   A1/A2 dimaafkan sekali bila band berikutnya membuktikannya). Murid B1 tertahan di A1 38% → 6,5%,
   B2 9,4% → 0,4%. Ongkos: penebak A2 0,25% → 3,4%; tes penuh tidak berubah.
3. **V-A/V-B** `vocabReviewQueue()` dibaca "Uji kosakata", flashcards, "Review jatuh tempo";
   `dueItems()` kosakata mencakup level ≤ aktif. Probe: kata pertama jatuh tempo 1/15 → 15/15;
   kartu A1 sesudah naik ke A2 0 → 1.
4. **F1** dua tab: tanda revisi `fiezel-state-rev-v1|<kunci>` + gabungan tiga arah
   `FiezelContinuity.mergeConcurrentState` sebelum setiap tulisan + listener `storage`. Probe O6:
   kemajuan tab A tidak lagi hilang.
5. **F2/F3/F4/F5** `brainSyncFlush()` dipanggil (akhir sesi, `online`, boot, Pengaturan); daftar
   terkirim dipangkas menurut riwayat hidup (tidak macet); `online` juga mengirim aktivitas dan
   antrean hasil kebijakan. Sinkron TETAP mati secara bawaan - sakelar baru di Pengaturan → Online
   & Teman (kunci `settings.brain-sync-*`, id/th).

Gerbang baru: `tests/learning-integrity-2026-10-04-test.js` (35 cek, Node murni, merah 0/20 di
kode sebelum perbaikan); `tests/grammar-feedback-regression-test.js` C1-C2 (browser);
`tests/placement-accuracy-test.js` L1-L6; `tests/grammar-vocab-leveling-test.js` Test 10 diperluas.

## LANGKAH BERIKUTNYA (menunggu keputusan OWNER)

1. Temuan yang belum dikerjakan: P-C (`estimateAbility` mulai dari prior 1,5), P-D (dokumentasi
   kalibrasi), V-C (jeda belajar-ulang sesudah lupa), V-D (`markMastered` vs `stabilityDays`),
   V-E ("Masih belajar" dicatat sebagai lapse), gem hanya di perangkat (keputusan produk).
   Tinjauan penutur asli Thai juga untuk `settings.brain-sync-*` dan `state.tab-lain-digabung`.
2. G13: penjelasan bank video-grammar (20 entri) masih Inggris — butuh konten id/th.
3. Utang kebocoran Thai di luar jalur grammar yang ikut terlihat (lihat §8 laporan grammar).
4. Tinjauan penutur asli Thai untuk kunci baru `quiz.retry-why-*`, `tutor.ladder-*`,
   `grammar.gloss.*`, `quiz.pill-penguasaan`.
