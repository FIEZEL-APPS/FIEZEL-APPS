# FIEZEL 5.19.0 — R2 Personal Learning Journey Handoff

Tanggal: 2026-08-19 WIB
Lane: R2 (roadmap `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`)
Release: `DIAG_BUILD=m025-52`, `SW_REV=m025-52-personal-journey-r2-20260819-1`
Base: `main@a5f6c4d0c2936aff4de5ec03deddf2a90dce9838`
Otoritas: OWNER mengarahkan lane roadmap dilanjutkan; MASTER (sesi ini) memegang implementasi dan rilis.

## STATUS

`changed-not-tested-on-device` untuk UI (UI belum ada di PR ini). Engine: machine-verified.

Neural voice PARKED atas perintah OWNER. Retest fisik m025-51 DITUNDA sampai seluruh roadmap selesai dan ter-deploy. PR ini menyentuh `features/neural-voice/fiezel-diag-panel.js` hanya pada `DIAG_BUILD` (koherensi rilis A7), bukan perilaku audio, sehingga acceptance fisik di-waive OWNER untuk lane ini.

## SCOPE

```yaml
lane: R2
files_added:
  - features/personal-journey/fiezel-personal-journey.js
  - tests/personal-journey-test.js
  - FIEZEL-5.19.0-R2-PERSONAL-JOURNEY-HANDOFF.md
files_touched:
  - index.html            # satu script tag
  - sw.js                 # satu asset + SW_REV
  - features/neural-voice/fiezel-diag-panel.js   # DIAG_BUILD saja
  - .github/workflows/quality.yml                 # satu baris gate
  - neural-voice-m028-audio-integrity-test.js     # release marker floor, bukan nilai tetap
forbidden:
  - Mengubah perilaku audio/neural voice.
  - Mengubah kontrak learner-evidence atau adaptive-policy.
  - Memprediksi skor IELTS/TOEFL.
  - Menyimpan raw audio, transcript, atau dictation.
```

## KEPUTUSAN YANG PERLU DIWARISKAN

1. Modul PURE dan wajib menerima `now`. Tanpa `now` modul melempar error. Rencana belajar yang tidak reproducible tidak bisa diaudit, dan roadmap mewajibkan prioritas deterministic + bounded.
2. Penjelasan dibangun dari rationale code hasil keputusan mesin. AI hanya boleh menjelaskan, tidak boleh memilih. Ini batas yang tidak boleh dilonggarkan saat UI dibuat.
3. Listening dan Speaking berstatus `not_measured`, bukan angka tebakan. Buktinya ada di `fiezel-sl-v1-state` dan baru diproyeksikan di R3.
4. Target mingguan mengikuti ritme 14 hari terakhir dan tidak melompat lebih dari satu sesi. Abandonment tinggi menurunkan target, tidak menaikkannya.
5. Review wajib maksimal setengah sesi.
6. `neural-voice-m028-audio-integrity-test.js` semula mengunci `DIAG_BUILD` persis `m025-51`, sehingga setiap rilis berikutnya pasti gagal karena alasan yang tidak berhubungan dengan integritas audio. Sekarang dipasang sebagai batas bawah (`>= 51`) dan tetap memaksa `SW_REV` membawa build yang sama, jadi regresi marker dan desync tetap tertangkap.

## GATE

`node tests/personal-journey-test.js` — 14 kasus: reproducibility, kontrak `now`, batas minggu WIB, target realistis, skill belum terukur, batas review, recovery (sesi terputus dan lama tidak belajar), penjelasan dari kode saja, input kosong, dan kebocoran data.

Hijau lokal juga: `tests/pwa-cache-test.js`, `tests/pwa-release-coherence-test.js`, `tests/ui-structure-test.js`, `tests/diag-panel-test.js`, `neural-voice-m028-audio-integrity-test.js`.

## LANJUTAN (roadmap berikutnya)

1. UI R2: Home menampilkan Weekly Mission, Today Plan, skill map, dan alasan pemilihan sesi; goal profile dapat dipilih pengguna.
2. Sambungkan `beginLearningSession` ke `buildTodayPlan` agar sesi nyata memakai blok rencana.
3. R3 (5.20): proyeksi aggregate-only `fiezel-sl-v1-state` ke Learner Evidence, sehingga Listening/Speaking berpindah dari `not_measured` ke terukur.
4. Setelah seluruh roadmap ter-deploy: retest fisik neural voice m025-51 oleh OWNER, lalu lane audio dibuka lagi.
