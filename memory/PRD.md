# FIEZEL — PRD (Rencana Pengembangan)

## Problem statement (verbatim ringkas)
Tambah fitur sisi Learner (alur diagnostic → rencana → lesson → feedback, Today Plan, feedback
yang menjelaskan pola bahasa, export/import progres, tujuan belajar spesifik, ringkasan hasil
yang bisa dibagikan, bukti offline) dan Tutor Action Center (peta kemampuan kelas, antrian
intervensi, "Buat sesi review", rekomendasi per murid, laporan mingguan otomatis, export
PDF/CSV/anonim). Wajib: buat branch/PR baru sebelum mulai.

## Arsitektur
- PWA statis (vanilla JS, tanpa build) di root `/app`, dilayani `frontend/server.js` (preview) → port 3000.
- Fitur modular di `features/**`, dimuat via `<script defer>` di `index.html`; app inti `app.js`.
- State lokal (localStorage), tanpa network I/O untuk fitur baru → offline-friendly & privasi.
- Build ritual: `FIEZEL_PAGE_BUILD` (core-config.js) = `DIAG_BUILD` (fiezel-diag-panel.js) = prefix `SW_REV` (sw.js). Naik +1 bersama. Saat ini **m025-238** (dari m025-237).

## Yang sudah diimplementasikan (2026-09-03)
- Branch `feature/learner-flow-tutor-action-center` (dari `origin/main`). PUSH via "Save to GitHub" (pending user).
- `features/learner-flow/fiezel-review-bank.js` — bank soal deterministik (past tense, past questions, vocab A2, listening detail, reading inference) + generator umpan balik pola bahasa + `buildSession` (5–10 soal, tujuan, durasi, urutan, penjelasan pasca-sesi).
- `features/learner-flow/fiezel-progress-backup.js` — export/import JSON tanpa sandi, `preview` restore, penjelasan data per kelompok, `wipeAll` (hapus semua data).
- `features/learner-flow/fiezel-learner-flow.js` — view `learn`: pilih tujuan (school/campus/IT/scholarship/foundation IELTS-TOEFL/everyday) → 5 diagnostic → skill map → Today Plan (target/durasi/skill/review/mulai/alasan) → lesson (feedback menjelaskan pola) → alasan rekomendasi berikutnya; tab Ringkasan + kode hasil untuk tutor; tab Progres & backup.
- `features/tutor-action-center/fiezel-tutor-action-center.js` — view `tutor`: buat kelas / seed demo (English A2, 18 murid), peta kemampuan (angka+arti+tindakan+prioritas), antrian intervensi, "Buat sesi review" + kirim ke Today Plan murid, rekomendasi per murid (bahasa suportif), laporan mingguan otomatis, export PDF/CSV/anonim + pratinjau, impor murid dari kode hasil.
- `features/learner-flow/learner-flow.css` — styling pastel (.lf-* & .tac-*).
- Integrasi: `index.html`, `sw.js` (ASSETS + SW_REV), `app.js` (VALID_VIEWS, router, kartu Home), goals baru (campus/everyday) di personal-journey + i18n id/th, baseline emas Indonesia di-regenerate.

## Verifikasi
- E2E browser: alur learner lengkap OK; tutor (seed→map→queue→build→send→report/CSV/anon) OK.
- Gates hijau: install-health, pwa-cache, config-consistency, http-smoke, global-name-collision, gate-registry, no-network, id-golden-snapshot (baseline diperbarui), back-nav, onboarding, continuity, backup-ui, lesson-experience, experience-integration, content-integrity-audit.
- ui-render-audit: SKIP (playwright tak terpasang di env — bukan gagal).

## Bank soal tak-terbatas semua skill + Tren Kelas (2026-09-03)
- `canonicalFor()/generated()` kini mencakup vocab (16 frame), listening (10 dialog), reading (10 passage) — jawaban di posisi tetap lalu diacak `variant()`; id `gvc:/gld:/gri:` (+`~oXXXX`) direkonstruksi `byId()`. `pickFresh` dedupe per frame dalam satu batch. Terverifikasi 25 tarikan unik per skill, 0 opsi duplikat, roundtrip OK.
- Tutor tab **Tren kelas**: sparkline SVG 4 minggu per skill + delta & label (membaik/stabil/perlu perhatian). Snapshot coverage per ISO-minggu disimpan otomatis (`cls.weeklyCoverage`, maks 8) → setelah ≥2 minggu memakai riwayat nyata; sebelumnya ditandai jelas sebagai estimasi.

## Soal bergambar + Filter murid + Duel Belajar (2026-09-03)
- **Soal bergambar**: 20 pictogram SVG garis (offline) di `PIC` → `picItem(w,d1,d2,d3)` (id `gpi:…`), diselang-seling dengan soal kalimat untuk vocab_a2 dan dicampur ke pool awal `pickFresh` (4 gambar) agar muncul sejak soal pertama. Render `.lf-picture` di learner & duel.
- **Filter murid** (Tutor → Per murid): chip Semua / belum stabil / perlu bantuan ringan / belum kembali belajar / sedang berkembang / stabil, dengan hitungan; `st.studentFilter`.
- **Duel Belajar** (`features/learner-flow/fiezel-duel.js`, tab "Duel" di alur belajar): 8 soal × 15 detik, poin 100 + bonus cepat (≤50) + bonus beruntun (+20); salah tetap dijelaskan polanya. Tanpa server: tantangan = kode/link `?duel=KODE` (seed sama → soal identik); teman buka link → Duel tab auto-terbuka → main → head-to-head → kode balasan → papan skor di pembuat. Mode "Main berdua di satu HP" (hot-seat bergantian). Deep-link: `app.js` auto `go('learn')` + kartu "Terima Duel Belajar" di Home.
- Terverifikasi e2e: solo → link → teman gabung (Rina 720 vs Dimas 469) → kode balasan; hot-seat dengan soal bergambar; filter murid; semua gate hijau.

## Backlog / Next
- P1: Suara neural untuk listening di alur learner (kini SpeechSynthesis fallback + FiezelVoiceSay bila aktif). ✅ tersambung.
- P2: Grafik tren mingguan kelas; filter murid per status di Tutor.
- P2: Jalankan full CI suite (~240 gate) sebelum merge PR.

## Anti-pengulangan & variasi (2026-09-03)
Agar murid tidak bosan: `fiezel-review-bank.js` kini punya mesin variasi.
- `pickFresh(skill,n,{avoid,seed})` menghindari id soal yang sudah diuji.
- Bila stok pola grammar habis → generate soal baru dari template (20 verb × 8 subjek × 6 penanda waktu) via `generated()`; distraktor memakai bentuk present `-s` sehingga TIDAK pernah ada pilihan duplikat (verba dengan past==participle sekalipun).
- Bank terbatas (vocab/listening/reading) → `variant()` mengacak urutan pilihan (jawaban & penjelasan dipetakan ulang; urutan di-encode di id → `byId()` bisa rekonstruksi).
- Learner menyimpan ledger `seen` per skill (cap 40) → diagnostic (rotasi seed per run), lesson, dan review selalu ambil soal segar. Tutor menyimpan `sentItemIds` per kelas → "Buat sesi review" tidak mengirim soal yang sama dua kali.
Terverifikasi: 30 tarikan unik, ~6000 soal generate tanpa opsi duplikat, roundtrip `byId` untuk generated & variant, lesson e2e jalan.
