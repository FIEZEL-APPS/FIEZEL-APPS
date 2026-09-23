/**
 * FIEZEL · features/i18n/copy-id-classjoin.js — MASUK KELAS LEWAT KODE (id)
 *
 * Naskah untuk satu momen kecil yang selama ini tidak punya suara: murid mengetik kode kelas
 * dan menekan Gabung. Sebelum m025-272 momen itu berakhir diam — murid tidak tahu apakah
 * gurunya menerima apa pun, dan guru tidak tahu ada yang mengetuk sampai murid itu
 * menyelesaikan tugas pertamanya. Kalimat di bawah menutup kedua sisi kebisuan itu.
 *
 * Pasangan Thai ada di copy-th-classjoin.js, kunci demi kunci.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('id', {
    'kelas.gabung-terkirim': 'Kode tersimpan. Permintaan bergabung sudah dikirim ke gurumu — tugas muncul otomatis setelah kamu ditambahkan.',
    'kelas.gabung-kode-salah': 'Kode tidak valid — bentuknya FZ-XXXXXX.',
    'kelas.menunggu-persetujuan': 'Menunggu persetujuan',
    'kelas.menunggu-penjelasan': 'Mereka memasukkan kode kelas ini. Tambahkan yang kamu kenal; yang tidak ditambahkan tidak menerima tugas apa pun.',
    'kelas.gabung-diterima': '{nama} ditambahkan ke {kelas}. Tugas berikutnya ikut terkirim ke dia.',
    'kelas.tambahkan': 'Tambahkan',
    'kelas.abaikan': 'Abaikan',
    'kelas.kurikulum-merdeka': 'Kurikulum Merdeka · Target Belajar',
    'kelas.misi-adaptif': 'Misi Adaptif',
    'kelas.misi-belajar-judul': 'Misi Belajar & Paspor Kompetensi',
    'kelas.misi-belajar-desc': 'Alur belajar adaptif berbasis capaian pembelajaran: tujuan jelas, diagnosis otomatis, dan bukti penguasaan materi.',
    'kelas.buka-misi': 'Buka Misi Belajar',
    'kelas.paspor-belajar': 'Paspor Belajar',
    'kelas.misi-kurikulum-link': 'Misi Belajar Kurikulum',
    'kelas.misi-kurikulum-sub': 'Target kompetensi SMP/SMA & Paspor Belajar adaptif.',
    'kelas.kembali-kelasku': '‹ Kembali ke KelasKu',
    'kelas.kembali-kelasku-app': '‹ Kembali ke KelasKu di aplikasi FIEZEL',
    'kelas.papan-kelas': 'Papan Kelas',
    'kelas.papan-minggu-ini': 'minggu ini',
    'kelas.kamu-badge': '(kamu)',
    'kelas.skor-xp': 'XP',
    'kelas.peringkat-kamu': 'Peringkatmu: #{rank} dari {total} murid',
    'kelas.papan-kosong': 'Belum ada data peringkat minggu ini.',
    'kelas.wali-kelas': 'wali kelas',
    'kelas.pengumuman-tugas-fokus': 'Minggu ini fokus {judul} ya. Selesaikan sebelum tenggat.',
    'kelas.sapaan-default': 'Selamat datang di {kelas}! Kerjakan latihan dan kumpulkan bukti belajar setiap minggu.',
    'kelas.misi-belajar-tab': 'Misi Belajar',
    'kelas.paspor-kompetensi-tab': 'Paspor Kompetensi',
    'kelas.mulai-misi': 'Mulai Misi',
    'kelas.tuntas': 'Tuntas',
    'kelas.perlu-latihan': 'Perlu Latihan',
    'kelas.belum-mulai': 'Belum Dimulai',
    'kelas.bab-dikuasai': 'Bab Dikuasai',
    'kelas.fase-semua': 'Semua Fase',
    'kelas.perlu-dikerjakan': 'Perlu dikerjakan',
    'kelas.soal-count': '{n} soal',
    'kelas.akurasi-rata': 'Akurasi Rata-rata',
    'kelas.total-soal-tuntas': 'Total Soal Tuntas',
    'kelas.ulangi-misi': 'Ulangi Misi',
    // KelasKu dasbor murid (659a1a0) memakai kunci ini tanpa mendaftarkannya - didaftarkan audit UI/UX 2026-09-23.
    'kelas.dikirim-ulang': 'dikirim ulang otomatis saat online.',
    'kelas.filter-mapel': 'Filter mata pelajaran',
    'kelas.gabung': 'Gabung',
    'kelas.gabung-btn': 'Gabung',
    'kelas.gabung-kelas': 'Gabung KelasKu',
    'kelas.ganti-kode': 'Ganti kode',
    'kelas.guru': 'Guru',
    'kelas.guru-terdaftar': 'Guru Terdaftar',
    'kelas.kode-label': 'Kode',
    'kelas.kpi-akurasi': 'rata-rata akurasi',
    'kelas.kpi-menunggu': 'menunggu',
    'kelas.kpi-selesai': 'tugas selesai',
    'kelas.kurikulum-merdeka-judul': 'Kurikulum Merdeka',
    'kelas.laporan-belum-terkirim': 'Laporan terakhir belum terkirim',
    'kelas.laporan-terkirim': 'Laporan terakhir terkirim ke guru',
    'kelas.minggu-akurasi': 'akurasi',
    'kelas.minggu-ini': 'Minggu ini',
    'kelas.minggu-selesai': 'dikerjakan',
    'kelas.papan-solo': 'Ini hanya skor pribadimu. Papan peringkat lengkap tersedia setelah teman sekelasmu bergabung.',
    'kelas.peta-skill': 'Peta skill',
    'kelas.semua': 'Semua',
    'kelas.skill-perlu-perhatian': 'Perlu perhatian',
    'kelas.skill-terkuat': 'Skill terkuat',
    'kelas.streak-n': '{n} hari berturut-turut',
    'kelas.streak-nol': 'Belum belajar hari ini',
    'kelas.streak-sub': 'Kerjakan tugas setiap hari untuk menjaga runtun belajar',
    'kelas.terhubung': 'terhubung',
    'kelas.tutor-judul': 'Tutor FIEZEL',
    'kelas.tutor-sub': 'Pelajaran bersuara Inggris + subtitle Indonesia, sesuai levelmu.',
    'kelas.belajar-mandiri-sub': 'Rencana harian dari peta kemampuanmu — tugas guru ikut masuk ke sana.'
  });
})();
