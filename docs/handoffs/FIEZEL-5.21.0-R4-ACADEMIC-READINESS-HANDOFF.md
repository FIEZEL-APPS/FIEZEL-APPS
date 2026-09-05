# FIEZEL 5.21 — R4 Academic and Scholarship Readiness Handoff

Tanggal: 2026-08-20 WIB
Lane: R4 (roadmap `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`)
Release: `DIAG_BUILD=m025-57`, `SW_REV=m025-57-academic-readiness-20260820-1`
Base: `main@5f6d93a` (R3 selesai)
Otoritas: OWNER memerintahkan roadmap dilanjutkan sampai ter-deploy. MASTER memegang implementasi dan nomor rilis; lane audio dipegang `HELPER:APEX` di bawah override OWNER.

## STATUS

Machine-verified. Slice pertama R4: mesin kesiapan + kartu di Peta Belajar.

## APA YANG ADA SEKARANG

`features/academic-readiness/fiezel-academic-readiness.js` — pure, deterministic, `now` wajib:

- **Peta prasyarat fondasi IELTS/TOEFL** dari bukti nyata: reading, grammar, kosakata, listening note-taking, academic speaking. Tidak ada prediksi skor, tidak ada klaim siap ujian.
- **Mini-path reading akademik** dari topik bank yang benar-benar ada (renewable energy, coastal ecology, river monitoring, museum conservation, urban gardening, food waste), disusun A2 → B1 → B2.
- **Lab komunikasi beasiswa**: email formal, perkenalan diri, latihan wawancara — masing-masing menyebut apa yang dilatih.
- **Jalur kosakata IT/kampus**: berstatus `content_pending`.

## KEPUTUSAN YANG PERLU DIWARISKAN

1. **`unknown` bukan `not_met`.** Prasyarat tanpa bukti berstatus belum terukur, bukan belum terpenuhi. Menyatakan murid belum memenuhi syarat padahal FIEZEL belum pernah mengukurnya adalah tuduhan, bukan asesmen. Ambang bukti minimalnya eksplisit: reading ≥8 jawaban, grammar ≥10, kosakata ≥10 materi terukur, listening/speaking ≥6 latihan.
2. **Tidak ada prediksi skor, dijaga gate.** Gate menyapu seluruh keluaran untuk angka berbentuk band IELTS atau skor TOEFL dan menolaknya. `scorePrediction: false` dan `readinessClaim: false` ditulis eksplisit supaya UI tidak perlu menyimpulkan sendiri.
3. **Jalur kosakata IT/kampus TIDAK dipalsukan.** Bank kosakata baru bertopik `general` dan `advanced`. Melabeli ulang kata umum sebagai "IT" akan membuat jalurnya terlihat ada padahal tidak. Statusnya `content_pending`, dan modul otomatis hidup begitu konten bertema benar-benar masuk — tanpa perubahan kode.
4. **Daftar topik akademik dijaga gate terhadap bank bacaan.** Bank berubah dan daftar tidak → test gagal, bukan jalur kosong yang diam.
5. **Prasyarat bukan gembok.** `locked: false`. Prasyarat adalah informasi; mengunci murid dari materinya sendiri karena bukti belum cukup akan menghukum orang yang justru perlu berlatih.

## GATE

`node tests/academic-readiness-test.js` — 12 kasus: kontrak `now`, reproducibility, larangan prediksi skor, `unknown` vs `not_met`, bukti tipis tetap `unknown`, topik ada di bank, mini-path dari materi nyata, tanpa bank dinyatakan menunggu konten, kejujuran jalur kosakata, lab beasiswa, dan tidak ada kebocoran data.

`node tests/skills-dashboard-test.js` bertambah 3 kasus untuk kartu Peta Kesiapan Akademik: tampil dari bukti nyata, tidak menjanjikan skor, dan halaman tetap hidup kalau modulnya tidak termuat.

Hijau lokal juga: `tests/skills-evidence-test.js`, `tests/personal-journey-test.js`, `tests/personal-journey-ui-test.js`, `tests/ui-structure-test.js`, `tests/pwa-cache-test.js`, `tests/pwa-release-coherence-test.js`, `validator.js`, `product-audit.js`, `content-audit.js`.

## LANJUTAN

1. **Konten**: kosakata bertema IT dan kehidupan kampus. Ini pekerjaan lane konten dengan gate-nya sendiri (`content-audit`, `content-qa-agent`), bukan tambalan di modul ini.
2. Listening note-taking dan academic speaking response sebagai latihan nyata di addon speaking-listening (butuh keputusan skema event; lihat juga `replayCount` yang tertunda di R3).
3. Scholarship communication lab sebagai latihan interaktif, bukan hanya daftar tugas.
4. R5 (5.22) Safe Content Evolution.
5. Setelah seluruh roadmap ter-deploy: retest fisik neural voice oleh OWNER.
