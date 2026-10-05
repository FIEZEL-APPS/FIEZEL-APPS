/**
 * FIEZEL · features/i18n/copy-id-sekolah.js — COPY-MAP INDONESIA, domain "sekolah".
 *
 * Naskah fitur strategi sekolah Indonesia 2026 (docs/STRATEGI-SEKOLAH-INDONESIA-2026.md):
 * Kelas Tanpa HP (lembar soal cetak, nilai kertas, pemanasan proyektor) dan fitur sekolah
 * berikutnya. Keputusan owner 2026-10-05: fitur ini lahir DALAM BAHASA INDONESIA SAJA.
 * Kembaran copy-th-sekolah.js sengaja belum ada dan tercatat sebagai utang bertanggal di
 * UTANG_TANPA_TH (tests/th-coverage-test.js), bukan disembunyikan.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    'sekolah.cetak-gagal': "Lembar soal belum bisa disiapkan.",
    'sekolah.cetak-lembar': "Cetak lembar soal",
    'sekolah.kunci-judul': "Kunci jawaban — untuk guru",
    'sekolah.kunci-varian': "Kunci varian {v}",
    'sekolah.lembar-absen': "No. absen",
    'sekolah.lembar-benar': "Jumlah benar",
    'sekolah.lembar-judul-bawaan': "Lembar soal",
    'sekolah.lembar-jumlah': "{n} soal",
    'sekolah.lembar-kaki': "Dicetak dari FIEZEL KelasKu. Masukkan jumlah benar di KelasKu → Tugas → Nilai kertas.",
    'sekolah.lembar-kosong': "Tugas ini belum punya soal yang bisa dicetak.",
    'sekolah.lembar-nama': "Nama",
    'sekolah.lembar-petunjuk': "Lingkari huruf jawaban yang paling tepat.",
    'sekolah.lembar-tenggat': "Tenggat {d}",
    'sekolah.lembar-varian': "Varian {v}",
    'sekolah.nilai-kertas': "Nilai kertas",
    'sekolah.nilai-kertas-aria': "Jumlah benar {nama}",
    'sekolah.nilai-kertas-dari-aplikasi': "sudah dari aplikasi",
    'sekolah.nilai-kertas-judul': "Nilai kertas — {judul}",
    'sekolah.nilai-kertas-penjelasan': "Masukkan jumlah jawaban benar dari lembar kertas (0–{n}). Murid yang sudah mengerjakan lewat aplikasi tidak ditimpa.",
    'sekolah.nilai-kertas-simpan': "Simpan nilai",
    'sekolah.nilai-kertas-tersimpan': "Nilai kertas {n} murid tersimpan.",
    'sekolah.pemanasan-berikutnya': "Soal berikutnya",
    'sekolah.pemanasan-jawaban': "Tampilkan jawaban",
    'sekolah.pemanasan-kosong': "Belum ada soal untuk pemanasan. Kirim satu tugas dulu, atau pilih keterampilan di Analitik.",
    'sekolah.pemanasan-mulai': "Mulai pemanasan 5 menit",
    'sekolah.pemanasan-nomor': "Pemanasan · soal {i} dari {n}",
    'sekolah.pemanasan-salah': "{n} teman keliru di soal ini",
    'sekolah.pemanasan-selesai': "Selesai, lanjut pelajaran",
    'sekolah.pemanasan-tutup': "Tutup pemanasan"
  });
}());
