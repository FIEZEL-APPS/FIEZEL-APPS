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
