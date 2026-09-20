/**
 * FIEZEL · features/i18n/copy-id-monetization.js — COPY-MAP INDONESIA, naskah hak akses
 * (rencana free / pro / sekolah, gerbang sesi, level, suara, fitur).
 *
 * Pasangan wajibnya: copy-th-monetization.js (kunci byte-identik, placeholder identik).
 * `features/monetization/fiezel-entitlement.js` HANYA mengembalikan copyKey; setiap kalimat
 * yang dibaca murid tinggal di sini dan di kembarannya.
 *
 * KANON NADA — ini naskah yang meminta uang, jadi aturannya lebih ketat dari layar lain:
 *   - JANGAN menakuti. Tidak ada hitungan mundur, tidak ada "kesempatan terakhir", tidak
 *     ada angka merah. Murid yang berhenti belajar karena cemas adalah pelanggan yang
 *     hilang dua kali.
 *   - JANGAN menyalahkan. Batas ini keputusan kami, bukan kegagalan murid. Tidak pernah
 *     ada kata "kamu tidak boleh"; yang ada "bagian ini terbuka lewat Pro".
 *   - SELALU tunjuk satu jalan yang masih terbuka SEKARANG, gratis. Murid yang jatahnya
 *     habis tetap punya ulangan, tetap punya A1-A2, tetap punya teks untuk dibaca.
 *   - JANGAN memakai istilah mesin: kuota, tier, entitlement, gate, token, endpoint.
 *     Murid membaca "jatah", "bagian", "kelas".
 *   - Harga ditulis sebagai {harga} — angkanya datang dari PRICING di modul, supaya harga
 *     tidak pernah berbeda antara naskah id, naskah th, dan aritmetika penawaran.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    /* --- nama rencana ------------------------------------------------------------- */
    'akses.rencana.free.nama': 'Gratis',
    'akses.rencana.free.ringkas': 'Latihan harian, A1 dan A2 terbuka penuh.',
    'akses.rencana.pro.nama': 'Pro',
    'akses.rencana.pro.ringkas': 'Latihan tanpa batas, A1 sampai C2, suara neural, ujian latihan, dan sertifikat.',
    'akses.rencana.sekolah.nama': 'Sekolah',
    'akses.rencana.sekolah.ringkas': 'Semua isi Pro, dibayar sekolahmu. Kamu tidak perlu membayar apa pun.',

    /* --- gerbang sesi harian ------------------------------------------------------- */
    'akses.sesi.sisa': 'Sisa {sisa} sesi latihan hari ini.',
    'akses.sesi.terakhir.judul': 'Ini sesi terakhirmu hari ini',
    'akses.sesi.terakhir.pesan': 'Santai saja, kerjakan seperti biasa. Ulangan dan bacaan tetap terbuka setelah ini, dan jatahnya kembali besok pagi.',
    'akses.sesi.habis.judul': 'Jatah latihan hari ini sudah penuh',
    'akses.sesi.habis.pesan': 'Kamu sudah menyelesaikan {limit} sesi hari ini — itu kerja yang bagus. Ulangan, bacaan, dan tugas dari gurumu tetap terbuka sekarang, dan latihannya kembali besok pagi.',

    /* --- gerbang level ------------------------------------------------------------- */
    'akses.level.terkunci.judul': 'Level {level} terbuka lewat Pro',
    'akses.level.terkunci.pesan': 'A1 dan A2 tetap terbuka penuh untukmu, dan progresmu di sana tidak hilang. Kalau kelasmu sudah punya kode dari sekolah, masukkan kodenya — {level} ikut terbuka tanpa biaya.',

    /* --- gerbang suara -------------------------------------------------------------- */
    'akses.suara.terkunci.judul': 'Suara neural ada di Pro',
    'akses.suara.terkunci.pesan': 'Kalimatnya tetap bisa dibunyikan dengan suara bawaan perangkatmu sekarang. Suara neural terdengar lebih manusiawi, dan ia berbunyi langsung di perangkatmu tanpa sambungan internet.',
    'akses.fitur.neuralVoice.terkunci.judul': 'Suara neural ada di Pro',
    'akses.fitur.neuralVoice.terkunci.pesan': 'Kalimatnya tetap bisa dibunyikan dengan suara bawaan perangkatmu sekarang. Suara neural terdengar lebih manusiawi, dan ia berbunyi langsung di perangkatmu tanpa sambungan internet.',

    /* --- gerbang fitur -------------------------------------------------------------- */
    'akses.fitur.examSim.terkunci.judul': 'Ujian latihan lengkap ada di Pro',
    'akses.fitur.examSim.terkunci.pesan': 'Ujian latihan meniru bentuk IELTS dan TOEFL dari awal sampai akhir, lengkap dengan waktunya. Ujian level yang menaikkan levelmu tetap terbuka gratis.',
    'akses.fitur.certificate.terkunci.judul': 'Sertifikat ada di Pro',
    'akses.fitur.certificate.terkunci.pesan': 'Sertifikatnya mencantumkan level CEFR-mu beserta bukti pengerjaannya, jadi bisa kamu lampirkan. Catatan kemajuanmu sendiri tetap tersimpan dan tetap bisa kamu lihat kapan saja.',

    /* --- sekolah -------------------------------------------------------------------- */
    'akses.sekolah.menunggu.judul': 'Kode kelasmu sedang diperiksa',
    'akses.sekolah.menunggu.pesan': 'Kode {kode} sudah tersimpan di perangkatmu. Setelah gurumu menyetujui, seluruh isi terbuka untukmu tanpa biaya. Sambil menunggu, A1 dan A2 tetap bisa kamu kerjakan.',
    'akses.sekolah.aktif.judul': 'Akses sekolah aktif',
    'akses.sekolah.aktif.pesan': 'Sekolahmu sudah membuka seluruh isi FIEZEL lewat kelas {kode}. Kamu tidak perlu membayar apa pun.',
    'akses.sekolah.tenggang.judul': 'Akses kelasmu tetap berjalan',
    'akses.sekolah.tenggang.pesan': 'Masa lisensi sekolahmu sedang diperpanjang. Belajarmu tidak terganggu sama sekali — teruskan saja seperti biasa.',

    /* --- harga & ajakan ------------------------------------------------------------- */
    'akses.pro.harga.bulanan': '{harga} per bulan',
    'akses.pro.harga.tahunan': '{harga} per tahun',
    'akses.pro.hemat': 'Hemat {persen}% dibanding bayar bulanan.',
    'akses.pro.aktif.judul': 'Pro aktif',
    'akses.pro.aktif.pesan': 'Seluruh isi terbuka untukmu sampai {tanggal}.',
    'akses.sekolah.harga': '{harga} per kelas per semester',
    'akses.cta.pro': 'Lihat Pro',
    'akses.cta.sekolah': 'Masukkan kode kelas',
    'akses.cta.nanti': 'Nanti saja'
  });
}());
