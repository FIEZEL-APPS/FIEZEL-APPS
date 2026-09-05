# FIEZEL — Ruang Guru (PRD)

## Problem statement (asli)
Cek repo FIEZEL-APPS terbaru (github.com/FIEZEL-APPS/FIEZEL-APPS). Dashboard guru sudah ada, tapi UI/UX guru dan murid harus berbeda, dan tambahkan banyak fitur guru agar guru/tutor lebih mudah mengatur & mengelola siswa. Pikirkan ide kreatif yang menyelesaikan problem guru yang selama ini belum ada solusinya.

## Pilihan user
- Clone dari GitHub (branch main). Tanpa AI dulu. Prioritas: manajemen kelas & siswa, tugas & ujian, analitik & deteksi dini, komunikasi. Visual: bebas.

## Arsitektur
- Repo = PWA vanilla JS (index.html + app.js 12k baris + features/*), backend Cloudflare Workers/D1 (tidak bisa dijalankan di pratinjau).
- Pratinjau lokal: `tools/preview-server.mjs` (dipanggil oleh supervisor `frontend` via /app/frontend/package.json) melayani /app statis di :3000.
- Modul baru `features/teacher/`:
  - `fiezel-teacher-store.js` — data lokal (localStorage `fiezel-teacher-v1`) + analitik murni (risk score, heatmap, kelompok belajar, miskonsepsi, naskah pesan/laporan, kode tukar tugas/hasil).
  - `fiezel-teacher-shell.js` — cangkang UI guru terpisah (sidebar gelap + kertas hangat, Fraunces/IBM Plex), body.fz-teacher-mode menyembunyikan chrome murid.
  - `fiezel-teacher-icons.js` — ikon inline (lucide subset repo tidak memuat ikon yang dibutuhkan).
  - `teacher-shell.css`.
- Integrasi: `app.js` tutorCenterView() memasang shell (fallback ke Tutor Action Center lama), renderInner() melepas shell saat pindah view, isVerifiedTeacher() menerima pratinjau dev (`?teacher=preview`, host non-produksi saja). `sw.js` ASSETS diperbarui. Learner flow: input "Punya kode tugas dari guru?" + payload kode hasil membawa `assign[]` untuk penilaian presisi.

## Fitur selesai (2026-06)
- Briefing: KPI, "Siapa yang perlu disapa hari ini" (skor risiko + alasan + tindakan), agenda tenggat, miskonsepsi kelas, aksi cepat.
- Kelas & Siswa: multi-kelas, kode kelas, tambah siswa massal (tempel daftar absen), pencarian, tabel status/risiko, drawer siswa (skill, kehadiran, tugas, kontak ortu, catatan), absensi cepat (H/I/S/A), ekspor CSV, hapus.
- Tugas & Ujian: builder dari bank soal FIEZEL (skill, jumlah, tenggat, mode latihan/ujian acak+timer, target siswa), kode tugas + pesan WA, status siapa belum, penilaian otomatis via kode hasil murid, tandai selesai manual, pengingat.
- Analitik: tile skill, heatmap siswa×skill, kelompok belajar otomatis (mentor), 3 miskonsepsi + remedial 1 klik.
- Komunikasi: pengumuman (salin/WA), Kartu Sapa personal 1 ketuk, Rapor naratif orang tua (wa.me ke nomor ortu), laporan kelas mingguan (salin/cetak), salin semua laporan.
- Jurnal Guru (refleksi 60 detik, tag siswa → muncul di drawer), Mode Papan (proyektor, anonim), profil guru, ekspor/pulihkan cadangan, "Waktu terhemat".
- Testing: iteration_1 lulus (frontend). Gate repo: boot-order, pwa-cache, role-security, account-auth-client, splash lulus.

## Backlog
- P0: Sinkron server (route-teacher.js D1) agar hasil murid masuk otomatis lewat kode kelas tanpa tempel kode; login guru nyata di pratinjau.
- P1: Import CSV siswa lengkap (kolom HP ortu), riwayat kehadiran bulanan + ekspor, notifikasi tenggat, mode papan interaktif (kuis live).
- P1: Sisi murid — tampilkan badge "Tugas dari Guru" di Home & kirim kode hasil otomatis setelah tugas selesai.
- P2: AI opsional (ringkasan kelas, generator soal esai), multi-guru per kelas, template pesan kustom.


---

# FIEZEL — Redesign Sisi Murid (PRD tambahan, 2026-09-04)

## Problem statement (asli)
"Cek repo https://github.com/FIEZEL-APPS/FIEZEL-APPS.git ... redesign menyeluruh seluruh aplikasi agar lebih mudah diakses murid dan mudah dipahami; hapus/ganti semua bahasa yang susah dimengerti; panel tidak penting hilangkan/sembunyikan; seluruh UI/UX harus terlihat seperti aplikasi mahal dan eksklusif."
Pilihan user: gaya visual diserahkan; target SMP + SMA/SMK; panel jarang dipakai murid disembunyikan; i18n Indonesia + Thai; **palet warna resmi tetap** (kuning #FFC700/#E6A800, tinta #241A11, krem #FFF9EE); **Ruang Guru jangan disentuh**.

## Arsitektur perubahan (non-destruktif, lapisan di atas app.js)
- `features/ui/fiezel-lux.css` — tema premium; semua selector berprefiks `body.fz-lux` (tidak aktif di `body.fz-teacher-mode`). Kartu hitam (tinta) untuk hero, kuning hanya aksi/sorotan, garis tipis, bayangan lembut, judul serif (Instrument Serif), tab bar pil kaca mengambang, rel kiri di desktop ≥1000px. Termasuk aturan sembunyikan panel (tab Analisis / Cara soal dipilih, kartu Classroom coming-soon, kartu kreator).
- `features/ui/fiezel-student-mode.js` — memasang `body.fz-lux`, menyembunyikan kartu berjudul Laporan Diagnostik / Lab Kesalahan / BKT / panel sosial belum aktif (text-match via kunci i18n), membungkus `enhanceUI`/`render`.
- `features/i18n/fiezel-i18n.js` — fungsi baru `overrideCopy(locale, map)`.
- `features/i18n/copy-id-student.js` + `copy-th-student.js` — ~200 kalimat murid disederhanakan (mastery→dikuasai, Skip Level→Naik Level, Peta Belajar & Lab→Kemajuan Belajar, Review Due→Ulang, dst) + kunci baru `student.*`, `fsl.*`.
- `app.js` — edit kecil: hero greeting pakai `studentGreeting()` (bukan pesan login slang), literal Inggris (Vocabulary Hub/Grammar Hub/Today Plan/CONTROL ROOM/LEVEL CONTROL/Reading adaptif) → i18n, kartu Laporan Diagnostik dihapus dari ringkasan, label jalur grammar bisa diklik, hitungan materi di Home = jumlah lesson (konsisten dengan halaman Grammar), data-testid nav & lesson.
- `lucide.min.js` — subset ditambah 24 ikon yang sebelumnya kosong (user, user-x, languages, award, list, users, log-in, …).
- `features/speaking-listening/fiezel-speaking-listening-addon.js` — `T(key, fallback, params)` diperbaiki (placeholder {level} tidak terselesaikan).
- Build marker naik ke m025-250 (sw.js, core-config.js, diag panel, coordination/BUILD-VERSION.json). Baseline `id-golden-baseline.json` diregenerasi; 6 tes literal diperbarui.

## Status (2026-09-04)
- Suite repo: 224/230 lulus (6 gagal sudah gagal sebelum perubahan: app-interaction-policy, content-adoption, e2e-level-grammar, fiezel-evolution-loop, gate-registry, release-audit-gate, secret-scan).
- Testing agent iterasi 1: 14/14 skenario terverifikasi; temuan sudah diperbaiki (label lesson klik, ikon kosong, literal Vocabulary, duplikasi judul Skills/Kemajuan, kontras chip ujian, desktop kolom, Thai leaks).

## Backlog
- P1: Onboarding & layar pilih bahasa belum disesuaikan gaya lux (masih CSS onboarding lama).
- P1: Konsistensi kata ganti Thai (คุณ vs เธอ) di copy-th lama.
- P2: 'Keluar' dari kuis kosakata kembali ke Home (bukan Kosakata).
- P2: Sisa copy teknis di domain progress/analisis (disembunyikan, belum ditulis ulang).
- P2: Sembunyikan panel via data-attribute stabil (bukan text-match).

---

# Braincore Grammar Quality Upgrade (A1–B2) — sesi 2026-06

## Problem statement (asli)
Audit & tingkatkan grammar question bank A1–B2: soal singkat/natural, satu target grammar per soal,
"make the grammar challenging, not the reading", distractor masuk akal, explanation singkat, level sesuai
CEFR, kurangi monoton. Pertahankan schema/ID/curriculum/integritas; jangan rewrite arsitektur.
Tambahan user: semua soal & jawaban harus selaras dengan i18n Thai.

## Yang disentuh
- Master `grammar-templates.json` 249 → 282 template; turunan diregenerasi via alat resmi
  (sync id, taxonomy, th misconception, cloze bank + th, id-golden baseline). Curriculum TIDAK berubah.
- Patch data & applier idempoten: `tools/grammar-upgrade/*.json`, `tools/apply-grammar-upgrade.js`.
- `app.js` `grammarPeerBlocked()`: template saudara satu lesson otomatis diblokir dari kolam pinjaman.
- `tools/build-misconception-taxonomy.js`: +19 OVERRIDES label baru. Build bump → m025-255.
- Laporan: `FIEZEL-GRAMMAR-QUALITY-UPGRADE-A1B2-REPORT.md`; log gate: `test_reports/grammar-upgrade/`.

## Selesai
- 61 stem A1–B2 disederhanakan (avg A2 13.5→11.0, B1 15.1→12.7, B2 16.6→13.8 kata; 0 stem meta-akademik).
- 33 template kedua tri-bahasa (en/id/th) untuk lesson yang tadinya tunggal (A1 4, A2 15, B1 8, B2 6).
- Semua gerbang grammar/konten/i18n hijau.

## Gelombang 2 (selesai, build m025-256)
- 40 template kedua tambahan (packs c/d/e, shorthand `@sibling:N`) → 322 template, semua 139 lesson A1–B2 ≥ 2 template, 8.050 soal runtime.
- 12 explanation Indonesia A1–A2 > 170 karakter diringkas (kini 0), peta th cloze disinkronkan.
- Sesi Kilat: `startGrammarQuickSession()` + tombol `grammar-quick-session-btn` di hub Grammar; 10 soal bentuk lintas lesson terbuka di level aktif; i18n id+th.

## Backlog
- P2: C1–C2 di luar scope (masih banyak lesson tunggal). P2: Thai untuk 4 rule locale-netral (CO-203, PA-201, PA-202, LD-202) bila ingin 100% aksara Thai.
- P3: statistik Sesi Kilat (streak harian) bila diminta.
- Pra-eksis lingkungan: e2e-level-grammar-test (WebSocket global), cf-live-selftest, gerbang vendor/kokoro.
