# FIEZEL m025-376 — Audit Braincore & Fondasi (Langkah 1) Handoff

Tanggal: 2026-09-27 WIB
Release: `FIEZEL_PAGE_BUILD=m025-376`, `DIAG_BUILD=m025-376`, `SW_REV=m025-376-braincore-audit-20260927`
(semula disiapkan sebagai m025-375; nomor itu keburu dipakai #471 "Grammar latihan-dulu", jadi
`main` digabung ke branch ini dan build dinaikkan lewat `tools/bump-build.mjs`. Label "m025-375"
di komentar kode perubahan ini merujuk rilis yang sama.)
Base: `origin/main`
Laporan lengkap: `reports/BRAINCORE-AUDIT-2026-09-26.md` (temuan A1–A3, B1–B8, C1–C6)
Otoritas: OWNER meminta audit Braincore (2026-09-26) lalu memutuskan A1 (matikan), A2
(kumpulkan bukti lintas sesi + panel Home), dan urutan roadmap 6 langkah; Langkah 1 =
fondasi (A1, A2, B5, B6, A3).

## STATUS

Machine-verified lokal. Seluruh perintah gerbang `.github/workflows/quality.yml` dijalankan
(3 paralel); unit backend `backend/unit_test.py` 56/56. Langkah 1 (fondasi) lengkap: A1, A2,
B5, B6, dan A3 (OWNER memilih "ganti ukuran dulu", 2026-09-27).

## APA YANG BERUBAH

1. **Temuan pasti (commit 1).** Kartu akar masalah menyebut prasyarat dua kali (placeholder
   kembar) + gerbang baru `tests/i18n-param-collision-test.js`; reset progres kini menghapus
   kunci `FiezelDecisionTrace` (R5); backend: `TRANSFERRED`/`RETAINED` tidak lagi lengket,
   hint tidak lagi melunakkan hukuman jawaban salah.
2. **A1 — penyetel soal-gampang dimatikan.** `FiezelDecisionTrace.evaluateOutcome()` tidak
   menulis parameter; `readParams()` selalu bawaan dan mengabaikan sisa 0.90 di perangkat;
   `affectTargetSuccess()` tidak lagi membaca parameter DecisionTrace (base 0.80 sampai A3 menerima
   nilai baru lewat bukti retensi).
3. **A2 — hasil sesi dinilai setelah ≥ 25 jawaban sasaran** terkumpul lintas sesi (jendela
   bukti per sasaran), kebijakan bertindak atas penilaian terakhir; gerbang baru
   `tests/policy-evidence-window-test.js` (W1–W9).
4. **Panel Home** "Hasil latihanmu belum bisa dinilai — kerjakan N soal lagi" + bilah n/25 +
   tombol lanjut (id + th, `home.bukti-*`).
5. **B5 — urutan materi hampir lupa.** `reviewPriority` asimetris: di atas ambang Gauss, di
   bawah ambang turun landai ke lantai 0.45 — materi runtuh tidak terkubur lagi.
6. **B6 — model lupa BKT dipakai.** `FiezelMasteryBKT.update()` meluruhkan L sebelum
   melangkah; `gatePassedAt` + `gateEverPassed()` menjaga pembukaan lesson tetap awet;
   `rootCause(..., nowMs)` melihat prasyarat yang terlupa. Backend sepadan
   (`apply_attempt`, `next_best_item`).
7. **A3 — penyetel resmi disambung, diukur retensi.** `FiezelSelfTune.experiment()` (satu
   percobaan ±0.02, lesson dibagi `FiezelNof1.assign`, diputus retensi probe 3/7/21 hari; sulit =
   non-inferioritas, mudah = superioritas; penjaga Brier; kadaluwarsa 120 hari; ledger). State per
   murid (`sideStateKey`). Manifest 3.13.0 (`nof1` active). Gerbang `tests/self-tune-retention-test.js`.

```yaml
files_added:
  - reports/BRAINCORE-AUDIT-2026-09-26.md
  - docs/handoffs/FIEZEL-M025-376-BRAINCORE-AUDIT-HANDOFF.md
  - tests/i18n-param-collision-test.js
  - tests/policy-evidence-window-test.js
  - tests/self-tune-retention-test.js
  - tools/dev/braincore-audit-2026-09-26-probe.js
files_touched:
  - app.js
  - style.css
  - features/brain/fiezel-core-brain.js
  - features/brain/fiezel-mastery-bkt.js
  - features/brain/fiezel-self-tune.js
  - features/brain/fiezel-brain-manifest.js
  - index.html
  - features/learner-flow/fiezel-decision-trace.js
  - features/diagnostics/fiezel-live-chrome-runner.js
  - features/i18n/copy-{id,th}-app-d.js
  - features/i18n/copy-{id,th}-redesign.js
  - backend/braincore.py
  - backend/unit_test.py
  - docs/BRAINCORE-CAPABILITY-MATRIX.md
  - docs/BRAINCORE-RUNTIME-TRACE.md
  - sw.js, core-config.js, features/neural-voice/fiezel-diag-panel.js (bump build)
```

## BERIKUTNYA (roadmap OWNER, urutan tetap)

1. **Fondasi — selesai** (A1, A2, B5, B6, A3). Pantau di ledger kapan percobaan retensi
   pertama diputus; putusan butuh ≥ 25 probe per lengan, jadi realistisnya beberapa minggu.
2. Kesulitan soal dihitung dari semua murid (agregasi anonim lewat cohort 14 hari).
3. Angka-angka rumus disetel dari data (a, c, pertumbuhan memori, dst.).
4. Uji A/B antar murid, dibagi server, diukur retensi D1/D7/D30.
5. Retensi murid (streak, target harian, pengingat, Pau) — panel bukti Home termasuk di sini.
6. Dua ukuran rutin di dashboard owner: ketepatan prediksi (Brier) dan retensi 7/30 hari.

Setelah fondasi: audit & perbaikan UI/UX halaman Home (permintaan OWNER 2026-09-26).
