# FIEZEL Product Roadmap 2026–2027

Status acuan: source package 5.18.0 tersedia dan automated source gate lulus, tetapi real-device neural voice promotion belum terbukti. GitHub `main` masih 5.17.0 pada saat handoff ini. Rekonsiliasi sumber dan bukti perangkat menjadi pekerjaan pertama, bukan pengembangan fitur baru.

## Prinsip roadmap

Roadmap memakai gerbang bukti. Milestone hanya selesai bila source, pengujian, pengalaman pengguna, privasi, migrasi, dan rollback telah terbukti. Fitur baru tidak boleh menutupi blocker lama. Synthetic proof tidak menggantikan bukti perangkat atau produksi.

## Jalur pembangunan

### R0: Rekonsiliasi 5.17.0 dan 5.18.0

- Bandingkan GitHub `main`, FULL 5.17.0, FULL 5.18.0, dan GITHUB ESSENTIAL 5.18.0.
- Verifikasi bahwa 5.18.0 benar-benar turunan baseline GitHub yang sah.
- Jalankan seluruh gate dari source yang akan dipromosikan.
- Buat manifest perbedaan, keputusan adopsi, rollback SHA, dan paket GitHub Essential.
- Dilarang force-push, menimpa `main`, atau mengklaim 5.18.0 live tanpa otorisasi eksplisit.

Exit gate: baseline resmi tunggal, diff dapat dijelaskan, seluruh tes lulus, dan rollback tersedia.

### R1: 5.18.x Device Readiness

Tujuan: membuktikan Speaking, Listening, dan Local Neural Voice pada perangkat target.

- diagnostics untuk cold start, peak memory, time-to-first-audio, repeat latency, audio unlock, interruption, dan cleanup;
- indikator ukuran unduhan, progres, sisa ruang, status offline, dan tombol hapus aset suara;
- fallback browser voice yang jelas;
- network-trace proof tanpa model, voice, atau inference lintas origin;
- proteksi service-worker upgrade agar versi cache tidak tercampur.

Exit gate: bukti iPhone 12 Installed PWA dan minimal satu Android kelas menengah, tanpa crash, dengan offline synthesis berhasil setelah warmup.

### R2: 5.19 Personal Learning Journey

- Weekly Mission dari Learner Evidence dan Adaptive Policy;
- Today Plan berisi sesi pendek, review wajib, dan target realistis;
- skill map Vocabulary, Grammar, Reading, Listening, dan Speaking;
- recovery plan setelah sesi terputus atau beberapa hari tidak belajar;
- goal profile untuk sekolah, IT, beasiswa, dan fondasi IELTS/TOEFL tanpa klaim skor;
- penjelasan mengapa sesi dipilih dan evidence yang digunakan.

Guardrail: AI menjelaskan rencana, sedangkan prioritas tetap deterministic, bounded, dan dapat diaudit.

### R3: 5.20 Unified Skills Evidence

- proyeksi aggregate-only dari `fiezel-sl-v1-state` ke Learner Evidence;
- confidence, completion, target coverage, replay count, dan response latency yang dibatasi;
- migrasi schema yang versioned dan idempotent;
- domain policy baru hanya setelah shadow evaluation stabil;
- dashboard yang membedakan score latihan, coverage target, dan kemampuan yang belum dapat diukur.

Raw audio, transcript, dan dictation tetap dilarang. Spoken-production coverage tidak boleh disebut pronunciation score.

### R4: 5.21 Academic and Scholarship Readiness

- academic reading mini-path untuk teks sains dan teknologi;
- vocabulary pathway bertema IT dan kehidupan kampus;
- listening note-taking dan speaking response untuk situasi akademik;
- scholarship communication lab untuk email, perkenalan, dan interview practice;
- IELTS/TOEFL foundation map yang menjelaskan prasyarat, bukan prediksi skor;
- ringkasan kemampuan agregat yang dapat diekspor pengguna.

### R5: 5.22 Safe Content Evolution

- Content QA queue dengan alasan, severity, evidence, dan keputusan reviewer;
- patch preview untuk stem, opsi, kunci, penjelasan, level, dan dampak duplikasi;
- shadow cohort lokal dan canary overlay yang dapat dihentikan;
- Adoption Receipt dan replay protection setelah real production rehearsal;
- provenance ledger yang mengikat source, candidate, reviewer, gate, staging, dan rollback.

### R6: 5.23 Reliability and Multi-Device Continuity

- encrypted user-controlled backup/export dan restore preview;
- conflict-safe progress merge yang bounded;
- install/update health check;
- observability tanpa raw answer history;
- accessibility pass untuk keyboard, screen reader, reduced motion, caption, contrast, dan touch target.

Milestone ini memerlukan keputusan arsitektur dan consent terpisah. Cloud sync tidak boleh aktif secara implisit.

## Prioritas masalah

1. keselamatan data dan source-of-truth;
2. blocker nyata dan regression;
3. validitas pedagogis serta privasi;
4. keberhasilan alur pengguna utama;
5. performa dan aksesibilitas;
6. fitur baru;
7. polish visual.

## Metrik yang boleh digunakan

Completion, interrupted-session recovery, review retention, target-skill adherence, error recurrence, confidence calibration, audio success, time-to-first-audio, dan weekly mission completion. Satu metrik tidak boleh dipakai sendiri sebagai bukti mastery atau sebab-akibat. Engagement tidak boleh didorong melalui shame, dark pattern, atau reminder berlebihan.

## Keputusan yang belum boleh dipaksakan

- pronunciation scoring berbasis phoneme;
- cloud sync otomatis;
- canonical content mutation saat runtime;
- scheduled remote push sebelum closed-app proof lulus;
- klaim neural voice production-ready sebelum real-device gate;
- klaim skor IELTS/TOEFL atau peluang beasiswa tanpa instrumen tervalidasi.
