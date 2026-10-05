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
    'sekolah.dan': "dan",
    'sekolah.deskripsi-kurang-data': "{nama} belum memiliki cukup bukti belajar untuk dideskripsikan.",
    'sekolah.deskripsi-rendah': "Ananda {nama} perlu bimbingan dalam {tp}.",
    'sekolah.deskripsi-rendah-tidak-ada': "Ananda {nama} telah mencapai kriteria pada seluruh tujuan pembelajaran yang diukur.",
    'sekolah.deskripsi-tinggi': "Ananda {nama} menunjukkan penguasaan yang baik dalam {tp}.",
    'sekolah.deskripsi-tinggi-belum': "Ananda {nama} sedang berproses dan belum mencapai kriteria pada tujuan pembelajaran yang diukur.",
    'sekolah.kktp-label': "KKTP kelas (%)",
    'sekolah.kktp-tersimpan': "KKTP kelas diubah menjadi {k}%. Deskripsi disusun ulang.",
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
    'sekolah.pemanasan-tutup': "Tutup pemanasan",
    'sekolah.rapor-csv': "Unduh CSV e-Rapor",
    'sekolah.rapor-csv-terunduh': "CSV rapor diunduh — buka di Excel lalu salin ke e-Rapor.",
    'sekolah.rapor-judul': "Rapor KKTP — {kelas}",
    'sekolah.rapor-kktp': "Rapor KKTP",
    'sekolah.rapor-penjelasan': "Tingkat dihitung per tujuan pembelajaran dari jawaban murid. Tujuan dengan kurang dari {n} jawaban ditulis \"belum cukup data\". Deskripsi bisa kamu sunting sebelum disalin ke e-Rapor.",
    'sekolah.rapor-rendah-aria': "Capaian yang perlu ditingkatkan {nama}",
    'sekolah.rapor-reset': "Susun ulang deskripsi",
    'sekolah.rapor-simpan': "Simpan KKTP & suntingan",
    'sekolah.rapor-tersimpan': "Rapor tersimpan.",
    'sekolah.rapor-tinggi-aria': "Capaian tertinggi {nama}",
    'sekolah.rapor-tp': "Tujuan pembelajaran yang diukur:",
    'sekolah.rekap-status-kktp': "Status (KKTP {k}%)",
    'sekolah.remedial-otomatis': "Remedial & pengayaan otomatis (KKTP {k}%)",
    'sekolah.status-belum-tercapai': "Belum tercapai",
    'sekolah.status-remedial': "Remedial",
    'sekolah.status-tercapai': "Tercapai",
    'sekolah.tingkat-kurang-data': "Belum cukup data",
    'sekolah.tka-catatan': "Ini peta latihan, bukan prediksi nilai TKA. Status muncul setelah 6 soal per kemampuan.",
    'sekolah.tka-judul': "Latihan Membaca TKA",
    'sekolah.tka-kicker': "Persiapan TKA",
    'sekolah.tka-latih': "Latih 6 soal",
    'sekolah.tka-lead': "Bahasa Inggris di TKA diuji lewat membaca. Latih tiga kemampuannya satu per satu.",
    'sekolah.tka-soal': "soal",
    'sekolah.tka-status-belum': "Belum cukup latihan",
    'sekolah.tka-status-kuat': "Kuat",
    'sekolah.tka-status-perlu': "Perlu latihan",
    'sekolah.tka-status-sedang': "Sedang"
  });
}());
