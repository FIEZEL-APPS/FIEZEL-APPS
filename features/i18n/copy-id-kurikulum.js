/**
 * FIEZEL · features/i18n/copy-id-kurikulum.js — naskah penyemaian bank kurikulum.
 *
 * Kalimat-kalimat ini menjelaskan KEADAAN APLIKASI ("sudah tersemai atau belum",
 * "sedang berjalan", "gagal"), bukan istilah regulasi Kurikulum Merdeka. Karena itu
 * ia punya kembaran Thai penuh di copy-th-kurikulum.js — sama seperti naskah pintu
 * KelasKu, dan berbeda dari NAMA kompetensi di dalam banknya sendiri, yang hari ini
 * sengaja hanya berbahasa Indonesia (keputusan owner m025-327, dicatat di
 * docs/handoffs/KURIKULUM-SEKOLAH-HANDOFF.md).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    'kurikulum.semai-kicker': 'Bank kurikulum',
    'kurikulum.semai-judul': 'Kurikulum Bahasa Inggris Kelas 1–12',
    'kurikulum.semai-ajakan': 'Kurikulum Merdeka Bahasa Inggris lengkap Fase A–F: 72 tujuan pembelajaran, 144 kompetensi, plus materi ajar dan prasyarat antar kelas. Disemai sekali, lalu menjadi milik bank kurikulummu.',
    'kurikulum.semai-tombol': 'Semai sekarang',
    'kurikulum.semai-ulang': 'Semai ulang',
    'kurikulum.semai-jalan': 'Sedang menyemai — butuh beberapa detik.',
    'kurikulum.semai-sudah': 'Sudah tersemai: {tp} tujuan pembelajaran, {komp} kompetensi, {materi} materi ajar.',
    'kurikulum.semai-belum': 'Belum tersemai. Bank kurikulum masih berisi contoh demo saja.',
    'kurikulum.semai-selesai': 'Kurikulum Bahasa Inggris Kelas 1–12 tersemai.',
    'kurikulum.semai-gagal': 'Gagal menyemai kurikulum.',
    'kurikulum.mapel-judul': 'Mata pelajaran lain — Kelas 1–12',
    'kurikulum.mapel-ajakan': 'Empat belas mata pelajaran Fase A–F: Matematika, B.Indonesia, Pancasila, IPAS, IPA, IPS, Sejarah, Informatika, Fisika, Kimia, Biologi, Ekonomi, Sosiologi, Geografi. 150 tujuan pembelajaran, 300 kompetensi, lengkap materi ajar dan prasyarat antar kelas.',
    'kurikulum.mapel-selesai': 'Mata pelajaran Kelas 1–12 tersemai.',
    'kurikulum.semai-memeriksa': 'Memeriksa isi bank kurikulum…'
  });
})();
