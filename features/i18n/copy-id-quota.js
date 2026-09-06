/**
 * FIEZEL · features/i18n/copy-id-quota.js — COPY-MAP INDONESIA, naskah blok notice app.js
 *
 * MENGAPA BERKAS TERPISAH: tests/quota-notice-a11y-test.js meng-union korpus kanonnya (K3) HANYA
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
    // app.js:7643 — aiErrorMessage
    'ai.answer-no-datang-dalam-waktu': 'Jawabannya nggak datang dalam waktu yang wajar. Periksa sambungan internetmu lalu coba lagi.',
    // app.js:7641 — aiErrorMessage
    'ai.jendela-masuk-akun-diblokir-peramban': 'Jendela masuk akun diblokir peramban. Izinkan jendela pop-up untuk situs ini, lalu coba lagi.',
    // app.js:7642 — aiErrorMessage
    'ai.masuk-akunnya-pending-finish-try': 'Masuk akunnya belum selesai. Coba lagi, ya — tinggal satu langkah.',
    // app.js:7655 — aiErrorMessage
    'ai.penjelasan-ai-nya-pending-can': 'Penjelasan AI-nya belum bisa dimuat sekarang. Ini bukan kesalahanmu — coba lagi sebentar lagi, ya.',

    /* m025-269 · NASKAH NOTICE KUOTA/SUARA MASUK COPY-MAP. Sebelum ini tabel kanon di
       features/quota/quota-copy.js dibaca LANGSUNG oleh presentQuotaNotice(), jadi murid
       th membaca ke-15 keadaan itu dalam bahasa Indonesia. Nilai id di bawah byte-identik
       dengan tabelnya — tabel itu tetap ada sebagai fallback kalau copy-map belum termuat. */
    'quota.copy.quota.ok.title': 'Jatah hari ini masih ada',
    'quota.copy.quota.ok.spoken': 'Semua masih berjalan seperti biasa.',
    'quota.copy.quota.ok.silent': 'Semua masih berjalan seperti biasa. Kalau suaranya belum keluar, teksnya tetap bisa kamu baca.',
    'quota.copy.quota.low.title': 'Jatah suara hari ini hampir habis',
    'quota.copy.quota.low.spoken': 'Masih berbunyi seperti biasa. Kalau nanti habis, aku pindah ke suara cadanganku.',
    'quota.copy.quota.low.silent': 'Kalimat ini belum berbunyi di perangkatmu. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.',
    'quota.copy.quota.exhausted.title': 'Jatah hari ini sudah habis',
    'quota.copy.quota.exhausted.spoken': 'Aku pakai suara cadanganku dulu. Pelajarannya nggak berhenti.',
    'quota.copy.quota.exhausted.silent': 'Suaranya nggak bisa dibunyikan sekarang. Teksnya tetap ada, dan jatahnya kembali sesudah tengah malam.',
    'quota.copy.quota.tts.exhausted.title': 'Jatah suara hari ini sudah habis',
    'quota.copy.quota.tts.exhausted.spoken': 'Aku pakai suara cadanganku dulu untuk sisa sesi ini. Bunyinya beda, pelajarannya tetap jalan.',
    'quota.copy.quota.tts.exhausted.silent': 'Suara cadanganku juga belum siap, jadi kalimat ini nggak bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali sesudah tengah malam.',
    'quota.copy.quota.ai.exhausted.title': 'Jatah tanya-jawab hari ini sudah habis',
    'quota.copy.quota.ai.exhausted.spoken': 'Penjelasan dari materi tetap muncul, dan itu nggak pakai jatah. Latihanmu jalan terus.',
    'quota.copy.quota.ai.exhausted.silent': 'Penjelasan dari materi tetap muncul, dan itu nggak pakai jatah. Suaranya belum keluar sekarang, jadi bacalah teksnya dulu.',
    'quota.copy.quota.aiTranslate.exhausted.title': 'Jatah terjemahan hari ini sudah habis',
    'quota.copy.quota.aiTranslate.exhausted.spoken': 'Arti kata dari kamus di perangkat ini tetap bisa kamu buka. Sesi dengarmu nggak terpengaruh.',
    'quota.copy.quota.aiTranslate.exhausted.silent': 'Arti kata dari kamus di perangkat ini tetap bisa kamu buka. Suaranya belum keluar sekarang, jadi bacalah teksnya dulu.',
    'quota.copy.quota.rate.slowdown.title': 'Kecepatan menekannya perlu diberi jeda',
    'quota.copy.quota.rate.slowdown.spoken': 'Aku pakai suara cadanganku untuk kalimat ini. Tunggu sebentar sebelum menekan lagi.',
    'quota.copy.quota.rate.slowdown.silent': 'Kalimat ini belum bisa dibunyikan. Tunggu beberapa detik lalu coba lagi — teksnya tetap ada.',
    'quota.copy.quota.concurrency.wait.title': 'Masih menyiapkan kalimat sebelumnya',
    'quota.copy.quota.concurrency.wait.spoken': 'Aku selesaikan yang tadi dulu, sebentar saja.',
    'quota.copy.quota.concurrency.wait.silent': 'Yang tadi belum selesai disiapkan, jadi kalimat ini belum berbunyi. Teksnya tetap bisa kamu baca sambil menunggu.',
    'quota.copy.quota.payload.tooLong.title': 'Kalimatnya kepanjangan untuk sekali baca',
    'quota.copy.quota.payload.tooLong.spoken': 'Aku bacakan sebagian dulu. Potong jadi dua bagian kalau mau utuh.',
    'quota.copy.quota.payload.tooLong.silent': 'Kalimatnya kepanjangan untuk sekali dibunyikan, jadi belum ada suaranya. Teksnya tetap bisa kamu baca — potong jadi dua bagian lalu coba lagi.',
    'quota.copy.service.degraded.title': 'Layanan suara sedang istirahat sebentar',
    'quota.copy.service.degraded.spoken': 'Suara cadanganku dulu, ya. Ini bukan kesalahanmu dan nggak ada yang hilang.',
    'quota.copy.service.degraded.silent': 'Aku belum berhasil membunyikan kalimat ini. Bukan kamu yang salah — teksnya tetap bisa dibaca, dan suaranya biasanya kembali beberapa menit lagi.',
    'quota.copy.service.providerError.title': 'Suara gagal disiapkan',
    'quota.copy.service.providerError.spoken': 'Aku pakai suara cadanganku untuk kalimat ini.',
    'quota.copy.service.providerError.silent': 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi sekarang.',
    'quota.copy.service.unknown.title': 'Suara belum tersedia untuk kalimat ini',
    'quota.copy.service.unknown.spoken': 'Aku pakai suara cadanganku dulu.',
    'quota.copy.service.unknown.silent': 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.',
    'quota.copy.quota.unavailable.title': 'Aku belum bisa membaca sisa jatahmu',
    'quota.copy.quota.unavailable.spoken': 'Jatahmu kemungkinan besar masih utuh — yang bermasalah catatannya, bukan kamu. Aku pakai suara cadanganku sementara ini.',
    'quota.copy.quota.unavailable.silent': 'Jatahmu kemungkinan besar masih utuh — yang bermasalah catatannya, bukan kamu. Kalimat ini belum bisa dibunyikan; teksnya tetap ada, dan coba lagi sebentar lagi.',
    'quota.copy.network.offline.title': 'Perangkatmu sedang lepas dari internet',
    'quota.copy.network.offline.spoken': 'Suara dari perangkatmu tetap jalan, dan latihan yang sudah tersimpan tetap bisa kamu kerjakan.',
    'quota.copy.network.offline.silent': 'Kalimat ini butuh internet supaya bisa dibunyikan, jadi sekarang belum ada suaranya. Teksnya tetap bisa kamu baca, dan jatahmu nggak terpakai sama sekali.',
    'quota.copy.session.expired.title': 'Kamu perlu masuk lagi supaya hasilmu tercatat',
    'quota.copy.session.expired.spoken': 'Masuk lagi sebentar, ya. Yang sudah selesai tetap aman.',
    'quota.copy.session.expired.silent': 'Masuk lagi sebentar, ya. Yang sudah selesai tetap aman, dan latihan berikutnya baru tercatat sesudah kamu masuk.',
    'quota.copy.reassurance': 'Item ini nggak dinilai dan nggak dikunci.',
    'quota.copy.reset-marker': 'sesudah tengah malam',
    'quota.copy.reset-inline': 'jam {jam} WIB',
    'quota.copy.reset-tail': ' Jatah berikutnya mulai jam {jam} WIB.',

    /* m025-269 · cermin naskah notice di zona suara (fiezel-cf-voice-notice.js). Nilai id
       byte-identik dengan tabel bekunya; tabel itu tetap menjadi cadangan fail-soft. */
    'voice.notice.quota.tts.exhausted.title': 'Jatah suara hari ini sudah habis',
    'voice.notice.quota.tts.exhausted.spoken': 'Aku pakai suara cadanganku dulu untuk sisa sesi ini. Bunyinya beda, pelajarannya tetap jalan.',
    'voice.notice.quota.tts.exhausted.silent': 'Perangkat ini juga belum punya suara cadangan, jadi kalimat ini belum bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali setelah tengah malam.',
    'voice.notice.quota.exhausted.title': 'Jatah hari ini sudah habis',
    'voice.notice.quota.exhausted.spoken': 'Aku pakai suara cadanganku dulu. Pelajarannya tetap jalan.',
    'voice.notice.quota.exhausted.silent': 'Suaranya belum bisa dibunyikan sekarang. Teksnya tetap ada, dan jatahnya kembali setelah tengah malam.',
    'voice.notice.quota.low.title': 'Jatah suara hari ini hampir habis',
    'voice.notice.quota.low.spoken': 'Masih berbunyi seperti biasa. Kalau nanti habis, aku pindah ke suara cadanganku.',
    'voice.notice.quota.low.silent': 'Suaranya belum berbunyi untuk kalimat ini. Teksnya tetap bisa kamu baca.',
    'voice.notice.quota.rate.slowdown.title': 'Terlalu cepat berurutan',
    'voice.notice.quota.rate.slowdown.spoken': 'Aku pakai suara cadanganku untuk kalimat ini. Tunggu sebentar sebelum menekan lagi.',
    'voice.notice.quota.rate.slowdown.silent': 'Kalimat ini belum bisa dibunyikan. Tunggu beberapa detik lalu coba lagi — teksnya tetap ada.',
    'voice.notice.service.degraded.title': 'Layanan suara sedang istirahat sebentar',
    'voice.notice.service.degraded.spoken': 'Suara cadanganku dulu, ya. Ini bukan kesalahanmu dan nggak ada yang hilang.',
    'voice.notice.service.degraded.silent': 'Aku belum berhasil membunyikan kalimat ini. Bukan kamu yang salah — teksnya tetap bisa dibaca, dan suaranya biasanya kembali dalam beberapa menit.',
    'voice.notice.service.providerError.title': 'Suara gagal disiapkan',
    'voice.notice.service.providerError.spoken': 'Aku pakai suara cadanganku untuk kalimat ini.',
    'voice.notice.service.providerError.silent': 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi sekarang.',
    'voice.notice.service.unknown.title': 'Suara belum tersedia untuk kalimat ini',
    'voice.notice.service.unknown.spoken': 'Aku pakai suara cadanganku dulu.',
    'voice.notice.service.unknown.silent': 'Aku belum berhasil membunyikan kalimat ini. Teksnya tetap bisa kamu baca, dan kamu boleh menekan Dengarkan lagi.',
    'voice.notice.reassurance': 'Item ini nggak dinilai dan nggak dikunci.',
    'voice.notice.reset-tail': ' Jatah berikutnya mulai jam {jam} WIB.',
    'voice.notice.reset-marker': 'setelah tengah malam',
    'voice.notice.reset-inline': 'jam {jam} WIB'
  });
}());
