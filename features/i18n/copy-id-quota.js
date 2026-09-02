/**
 * FIEZEL · features/i18n/copy-id-quota.js — COPY-MAP INDONESIA, naskah blok notice app.js
 *
 * MENGAPA BERKAS TERPISAH: quota-notice-a11y-test.js meng-union korpus kanonnya (K3) HANYA
 * dari daftar eksplisit [copy-id-quota.js, copy-id-notice.js] (handoff W2-TEST-A §3).
 * Kalimat blok aiErrorMessage yang pindah ke copy-map WAJIB mendarat di sini supaya tetap
 * terhitung kanon register (nggak/kamu/no-blame) — pindah ke file lain = kalimat keluar
 * dari korpus dan gerbang kehilangan penjaganya. Nilai byte-identik dari app.js (Hukum
 * Besi #1); JANGAN campur naskah domain lain ke file ini (permintaan W2-TEST-A).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    'voicenotice.quota.tts.exhausted.title': "Jatah suara hari ini sudah habis",
    'voicenotice.quota.tts.exhausted.spoken': "Aku pakai suara cadanganku dulu untuk sisa sesi ini. Bunyinya beda, pelajarannya tetap jalan.",
    'voicenotice.quota.tts.exhausted.silent': "Perangkat ini juga belum punya suara cadangan, jadi kalimat ini belum bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali setelah tengah malam.",
    'voicenotice.quota.exhausted.title': "Jatah hari ini sudah habis",
    'voicenotice.quota.exhausted.spoken': "Aku pakai suara cadanganku dulu. Pelajarannya tetap jalan.",
    'voicenotice.quota.exhausted.silent': "Suaranya belum bisa dibunyikan sekarang. Teksnya tetap ada, dan jatahnya kembali setelah tengah malam.",
    'voicenotice.quota.low.title': "Jatah suara hari ini hampir habis",
    'voicenotice.quota.low.spoken': "Masih berbunyi seperti biasa. Kalau nanti habis, aku pindah ke suara cadanganku.",
    'voicenotice.quota.low.silent': "Suaranya belum berbunyi untuk kalimat ini. Teksnya tetap bisa kamu baca.",
    'voicenotice.quota.rate.slowdown.title': "Terlalu cepat berurutan",
    'voicenotice.quota.rate.slowdown.spoken': "Aku pakai suara cadanganku untuk kalimat ini. Tunggu sebentar sebelum menekan lagi.",
    'voicenotice.quota.rate.slowdown.silent': "Kalimat ini belum bisa dibunyikan. Tunggu beberapa detik lalu coba lagi — teksnya tetap ada.",
    'voicenotice.service.degraded.title': "Layanan suara sedang istirahat sebentar",
    'voicenotice.service.degraded.spoken': "Suara cadanganku dulu, ya. Ini bukan kesalahanmu dan nggak ada yang hilang.",
    'voicenotice.service.degraded.silent': "Aku belum berhasil membunyikan kalimat ini. Bukan kamu yang salah — teksnya tetap bisa dibaca, dan suaranya biasanya kembali dalam beberapa menit.",
    'voicenotice.service.providerError.title': "Suara gagal disiapkan",
    'voicenotice.service.providerError.spoken': "Aku pakai suara cadanganku untuk kalimat ini.",
    'voicenotice.service.providerError.silent': "Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi sekarang.",
    'voicenotice.service.unknown.title': "Suara belum tersedia untuk kalimat ini",
    'voicenotice.service.unknown.spoken': "Aku pakai suara cadanganku dulu.",
    'voicenotice.service.unknown.silent': "Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.",
    'voicenotice.reset.next': "Jatah berikutnya mulai jam {jam} WIB.",
    'quota.reset.marker': "sesudah tengah malam",
    'quota.reset.at': "jam {jam} WIB",
    'quota.reset.next': "Jatah berikutnya mulai jam {jam} WIB.",
    'quota.reassurance.text': "Item ini nggak dinilai dan nggak dikunci.",
    'quota.ok.title': "Jatah hari ini masih ada",
    'quota.ok.spoken': "Semua masih berjalan seperti biasa.",
    'quota.ok.silent': "Semua masih berjalan seperti biasa. Kalau suaranya belum keluar, teksnya tetap bisa kamu baca.",
    'quota.low.title': "Jatah suara hari ini hampir habis",
    'quota.low.spoken': "Masih berbunyi seperti biasa. Kalau nanti habis, aku pindah ke suara cadanganku.",
    'quota.low.silent': "Kalimat ini belum berbunyi di perangkatmu. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.",
    'quota.exhausted.title': "Jatah hari ini sudah habis",
    'quota.exhausted.spoken': "Aku pakai suara cadanganku dulu. Pelajarannya nggak berhenti.",
    'quota.exhausted.silent': "Suaranya nggak bisa dibunyikan sekarang. Teksnya tetap ada, dan jatahnya kembali sesudah tengah malam.",
    'quota.tts.exhausted.title': "Jatah suara hari ini sudah habis",
    'quota.tts.exhausted.spoken': "Aku pakai suara cadanganku dulu untuk sisa sesi ini. Bunyinya beda, pelajarannya tetap jalan.",
    'quota.tts.exhausted.silent': "Suara cadanganku juga belum siap, jadi kalimat ini nggak bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali sesudah tengah malam.",
    'quota.ai.exhausted.title': "Jatah tanya-jawab hari ini sudah habis",
    'quota.ai.exhausted.spoken': "Penjelasan dari materi tetap muncul, dan itu nggak pakai jatah. Latihanmu jalan terus.",
    'quota.ai.exhausted.silent': "Penjelasan dari materi tetap muncul, dan itu nggak pakai jatah. Suaranya belum keluar sekarang, jadi bacalah teksnya dulu.",
    'quota.aiTranslate.exhausted.title': "Jatah terjemahan hari ini sudah habis",
    'quota.aiTranslate.exhausted.spoken': "Arti kata dari kamus di perangkat ini tetap bisa kamu buka. Sesi dengarmu nggak terpengaruh.",
    'quota.aiTranslate.exhausted.silent': "Arti kata dari kamus di perangkat ini tetap bisa kamu buka. Suaranya belum keluar sekarang, jadi bacalah teksnya dulu.",
    'quota.rate.slowdown.title': "Kecepatan menekannya perlu diberi jeda",
    'quota.rate.slowdown.spoken': "Aku pakai suara cadanganku untuk kalimat ini. Tunggu sebentar sebelum menekan lagi.",
    'quota.rate.slowdown.silent': "Kalimat ini belum bisa dibunyikan. Tunggu beberapa detik lalu coba lagi — teksnya tetap ada.",
    'quota.concurrency.wait.title': "Masih menyiapkan kalimat sebelumnya",
    'quota.concurrency.wait.spoken': "Aku selesaikan yang tadi dulu, sebentar saja.",
    'quota.concurrency.wait.silent': "Yang tadi belum selesai disiapkan, jadi kalimat ini belum berbunyi. Teksnya tetap bisa kamu baca sambil menunggu.",
    'quota.payload.tooLong.title': "Kalimatnya kepanjangan untuk sekali baca",
    'quota.payload.tooLong.spoken': "Aku bacakan sebagian dulu. Potong jadi dua bagian kalau mau utuh.",
    'quota.payload.tooLong.silent': "Kalimatnya kepanjangan untuk sekali dibunyikan, jadi belum ada suaranya. Teksnya tetap bisa kamu baca \\u2014 potong jadi dua bagian lalu coba lagi.",
    'service.degraded.title': "Layanan suara sedang istirahat sebentar",
    'service.degraded.spoken': "Suara cadanganku dulu, ya. Ini bukan kesalahanmu dan nggak ada yang hilang.",
    'service.degraded.silent': "Aku belum berhasil membunyikan kalimat ini. Bukan kamu yang salah — teksnya tetap bisa dibaca, dan suaranya biasanya kembali beberapa menit lagi.",
    'service.providerError.title': "Suara gagal disiapkan",
    'service.providerError.spoken': "Aku pakai suara cadanganku untuk kalimat ini.",
    'service.providerError.silent': "Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi sekarang.",
    'service.unknown.title': "Suara belum tersedia untuk kalimat ini",
    'service.unknown.spoken': "Aku pakai suara cadanganku dulu.",
    'service.unknown.silent': "Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.",
    'quota.unavailable.title': "Aku belum bisa membaca sisa jatahmu",
    'quota.unavailable.spoken': "Jatahmu kemungkinan besar masih utuh — yang bermasalah catatannya, bukan kamu. Aku pakai suara cadanganku sementara ini.",
    'quota.unavailable.silent': "Jatahmu kemungkinan besar masih utuh — yang bermasalah catatannya, bukan kamu. Kalimat ini belum bisa dibunyikan; teksnya tetap ada, dan coba lagi sebentar lagi.",
    'network.offline.title': "Perangkatmu sedang lepas dari internet",
    'network.offline.spoken': "Suara dari perangkatmu tetap jalan, dan latihan yang sudah tersimpan tetap bisa kamu kerjakan.",
    'network.offline.silent': "Kalimat ini butuh internet supaya bisa dibunyikan, jadi sekarang belum ada suaranya. Teksnya tetap bisa kamu baca, dan jatahmu nggak terpakai sama sekali.",
    'session.expired.title': "Kamu perlu masuk lagi supaya hasilmu tercatat",
    'session.expired.spoken': "Masuk lagi sebentar, ya. Yang sudah selesai tetap aman.",
    'session.expired.silent': "Masuk lagi sebentar, ya. Yang sudah selesai tetap aman, dan latihan berikutnya baru tercatat sesudah kamu masuk.",
    // app.js:7643 — aiErrorMessage
    'ai.answer-no-datang-dalam-waktu': 'Jawabannya nggak datang dalam waktu yang wajar. Periksa sambungan internetmu lalu coba lagi.',
    // app.js:7641 — aiErrorMessage
    'ai.jendela-masuk-akun-diblokir-peramban': 'Jendela masuk akun diblokir peramban. Izinkan jendela pop-up untuk situs ini, lalu coba lagi.',
    // app.js:7642 — aiErrorMessage
    'ai.masuk-akunnya-pending-finish-try': 'Masuk akunnya belum selesai. Coba lagi, ya — tinggal satu langkah.',
    // app.js:7655 — aiErrorMessage
    'ai.penjelasan-ai-nya-pending-can': 'Penjelasan AI-nya belum bisa dimuat sekarang. Ini bukan kesalahanmu — coba lagi sebentar lagi, ya.'
  });
}());
