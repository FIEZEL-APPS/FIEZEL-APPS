/**
 * FIEZEL · features/i18n/copy-id-app-b.js — COPY-MAP INDONESIA, segmen app.js baris 2001–4000
 *
 * MENGAPA: audit multilingual v2 (AI-02 F01) — app.js tidak punya lapisan string; berkas ini
 * memindahkan literal Indonesia segmen B (progress/OLM, quiz SRL+burst, tutor, home coach +
 * jam langit, settings laporan, grammar fallback, notif, auth Puter, quota fallback, sys,
 * ask) ke copy-map sesuai plan W1-APPJS-B, supaya copy-th-app-b.js bisa 1:1. Nilai DISALIN
 * BYTE-PER-BYTE dari app.js — gerbang id-golden-snapshot-test.js membekukan HIMPUNAN literal
 * (PINDAH boleh, BERUBAH tidak). Kunci ber-slug netral: lexer gerbang menghitung kunci
 * berpenanda Indonesia sebagai "tambahan liar" (laporan W1-INFRA; auth.tombol-retry dan
 * auth.galat-unfinished di-rename karena itu). Placeholder BERNAMA {nama} (konvensi brief).
 *
 * HTML-TRUSTED: notif.bantuan-ditolak (<b>Allow / Izinkan</b>) dan ask.intro (<b>...</b>)
 * dikonsumsi lewat innerHTML — JANGAN pindahkan ke textContent; nilai berinterpolasi dari
 * input murid tetap di-esc() di sisi pemanggil (pola app.js:3954).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // app.js:3976 — judul daftar materi terkait
    'ask.materi-terkait': 'Materi terkait',
    // app.js:3988 — status menunggu jawaban AI
    'ask.memikirkan': 'FIEZEL sedang memikirkan jawabannya…',
    // app.js:2928 — galat layanan Puter tidak tersedia
    'auth.galat-layanan': 'Layanan akun Puter belum bisa dihubungi. Periksa koneksi lalu coba lagi.',
    // app.js:2934 — new Error(t(...)): pesan Error tampil di status auth
    'auth.galat-timeout': 'Login Puter tidak merespons. Periksa jendela loginnya, atau coba lagi.',
    // app.js:2937 — login belum selesai; slug netral (belum+selesai = 2 COMMON lexer gerbang)
    'auth.galat-unfinished': 'Login belum selesai. Coba lagi.',
    // app.js:2757 — status skipped
    'auth.status-dilewati': 'Oke, lanjut tanpa akun.',
    // app.js:2758 — status idle
    'auth.status-idle': 'Progres belajar, streak, dan AI tutor tersimpan di akunmu.',
    // app.js:2753 — status pending
    'auth.status-menghubungkan': 'Menghubungkan ke Puter…',
    // app.js:2752 — status signed_in (karakter … asli)
    'auth.status-tersambung': 'Akun tersambung. Membuka FIEZEL…',
    // app.js:2836 — toast lanjut tanpa akun
    'auth.toast-lewati': 'Lanjut tanpa akun. Masuk kapan saja lewat Pengaturan.',
    // app.js:2762 — toast completeAuthGate
    'auth.toast-tersambung': 'Akun FIEZEL tersambung.',
    // app.js:2758 — tombol idle
    'auth.tombol-lanjutkan': 'Lanjutkan dengan Puter',
    // app.js:2753 — tombol pending
    'auth.tombol-menghubungkan': 'Menghubungkan…',
    // app.js:2752 — tombol signed_in (hanya isi <span>)
    'auth.tombol-tersambung': 'Tersambung',
    // app.js:2496 — fallback whyCorrect (masuk item[4] pilihan jawaban)
    'grammar.alasan-benar-fallback': 'Bentuk ini cocok dengan aturan grammar sekaligus dengan konteks kalimatnya.',
    // app.js:2549/2551/2559 — nama benda langit (3 titik sambung)
    'home.celestial-bulan': 'Bulan',
    // app.js:2549 — detail jam langit; kunci gabungan supaya urutan kata Thai bebas
    'home.celestial-detail': '{benda} {posisi}. Posisi mengikuti pukul {pukul} pada perangkat ini.',
    // app.js:2549 — label jam langit (malam)
    'home.celestial-label-bulan': 'Perjalanan bulan',
    // app.js:2549 — label jam langit (siang)
    'home.celestial-label-matahari': 'Perjalanan matahari',
    // app.js:2549/2551/2559 — nama benda langit (3 titik sambung)
    'home.celestial-matahari': 'Matahari',
    // app.js:2546 — ternary posisi jam langit
    'home.celestial-posisi-naik': 'sedang naik',
    // app.js:2546 — ternary posisi jam langit
    'home.celestial-posisi-puncak': 'berada di titik tertinggi',
    // app.js:2546 — ternary posisi jam langit
    'home.celestial-posisi-tenggelam': 'mendekati tenggelam',
    // app.js:2546 — ternary posisi jam langit
    'home.celestial-posisi-terbit': 'baru terbit',
    // app.js:2546 — ternary posisi jam langit
    'home.celestial-posisi-turun': 'sedang turun',
    // app.js:2551+2559 — status jam langit (sambungan benda+posisi, mini-desain plan)
    'home.celestial-status': '{benda} {posisi}',
    // app.js:2713 — badan denied
    'notif.badan-ditolak': 'Browser ini sudah menolak izin notifikasi untuk FIEZEL, jadi pengingatnya tidak bisa dinyalakan dari sini. Belajar tetap berjalan penuh tanpa itu.',
    // app.js:2715 — badan unsupported
    'notif.badan-unsupported': 'Browser ini belum menyediakan Web Notifications, jadi FIEZEL tidak bisa mengirim pengingat di sini. Seluruh materi dan latihannya tetap bisa dipakai.',
    // app.js:2711 — bantuan granted
    'notif.bantuan-aktif': 'Bisa dimatikan lagi kapan saja lewat Pengaturan.',
    // app.js:2719 — bantuan default; mengutip "Nanti saja"
    'notif.bantuan-default': 'Pilih "Nanti saja" dan FIEZEL langsung terbuka. Pengingatnya menunggu di Pengaturan kalau suatu saat dibutuhkan.',
    // app.js:2713 — bantuan denied; HTML-TRUSTED (<b>), konsumen innerHTML, jangan pindah ke textContent
    'notif.bantuan-ditolak': 'Kalau suatu saat ingin dinyalakan, ubah izin situs ini menjadi <b>Allow / Izinkan</b> lewat ikon gembok browser, lalu nyalakan dari Pengaturan.',
    // app.js:2717 — bantuan declined
    'notif.bantuan-nanti': 'Pengingatnya menunggu di Pengaturan.',
    // app.js:2715 — bantuan unsupported
    'notif.bantuan-unsupported': 'Memasang FIEZEL sebagai PWA di perangkat yang mendukung notifikasi akan menyalakan pengingatnya.',
    // app.js:2711 — status granted
    'notif.status-aktif': 'Pengingat aktif. Selamat belajar!',
    // app.js:2719 — status default
    'notif.status-default': 'Belajar tetap bisa dimulai tanpa ini.',
    // app.js:2713 — status denied
    'notif.status-ditolak': 'Tidak apa-apa - FIEZEL tetap terbuka seperti biasa.',
    // app.js:2717 — status declined
    'notif.status-nanti': 'Oke, lanjut tanpa pengingat.',
    // app.js:2715 — status unsupported
    'notif.status-unsupported': 'Browser ini tidak punya Notification API.',
    // app.js:3837 — toast izin notifikasi granted
    'notif.toast-aktif': 'Pengingat belajar aktif.',
    // app.js:2711 — tombol granted (ikon+spasi tetap di kode)
    'notif.tombol-aktif': 'Pengingat aktif',
    // app.js:2719 — tombol default (ikon SETELAH teks, mini-desain plan)
    'notif.tombol-ingatkan': 'Ingatkan saya',
    // app.js:2717 — tombol declined; frasa dikutip di notif.bantuan-default (konsistensi th)
    'notif.tombol-nanti': 'Nanti saja',
    // app.js:2713 — tombol denied
    'notif.tombol-nonaktif': 'Pengingat tidak aktif',
    // app.js:2715 — tombol unsupported (textContent polos)
    'notif.tombol-unsupported': 'Pengingat tidak tersedia',
    // app.js:2049 — olmDispute() toast discount_evidence
    'progress.olm-bukti-diskon': 'Bukti itu aku beri bobot lebih ringan mulai sekarang.',
    // app.js:2033 — olmDispute() toast tunggu probe
    'progress.olm-tunggu-probe': 'Klaim itu sedang diukur ulang - tunggu hasil probenya dulu.',
    // app.js:2653 — judul panel ANALYZING; sumber lama menulis \u2026, runtime = karakter … (byte-identik saat render)
    'quiz.analyzing-judul': 'FIEZEL menyiapkan pembahasannya…',
    // app.js:2185 — toast tujuan sesi tersimpan
    'quiz.srl-tujuan-kepegang': 'Oke, tujuan sesinya kepegang.',
    // app.js:2171 — tombol lewati popup tujuan SRL (teks polos dalam template)
    'quiz.srl-tujuan-lewati': 'Lewati',
    // app.js:2163+2167 — popup tujuan SRL (aria-label + isi <p>); gp.ask modul tetap prioritas
    'quiz.srl-tujuan-tanya': 'Apa tujuanmu sesi ini?',
    // app.js:2435 — status laporan: queued
    'settings.laporan-antrean': 'Antrean pengiriman aktif',
    // app.js:2435 — status laporan: endpoint kosong
    'settings.laporan-hub-belum': 'Creator Hub belum tersambung',
    // app.js:2435 — status laporan: error
    'settings.laporan-menunggu-koneksi': 'Menunggu koneksi',
    // app.js:2435 — status laporan Creator Hub: consent off
    'settings.laporan-privat': 'Laporan privat',
    // app.js:2435 — status laporan terkirim + tanggal (pecahan .trim(), mini-desain plan)
    'settings.laporan-terkirim': 'Terkirim {tanggal}',
    // app.js:2435 — status laporan terkirim tanpa tanggal (hasil .trim() lama)
    'settings.laporan-terkirim-polos': 'Terkirim',
    // app.js:3725 — toast boot: health gagal
    'sys.core-belum-tersambung': 'Core Brain belum tersambung dengan benar.',
    // app.js:3725 — toast boot: push aktif
    'sys.core-push-aktif': 'Core Brain + push aktif.',
    // app.js:3725 — toast boot: push belum tersambung
    'sys.core-push-belum': 'Core Brain aktif, tetapi remote push belum tersambung.',
    // app.js:2243 — eyebrow tuntunan langkah (kapital = bagian naskah, bukan CSS)
    'tutor.tuntunan-eyebrow': 'TUNTUNAN LANGKAH',

    // ---------- W2-REGEN: entri tunda gelombang regen baseline ----------
    // app.js:3994 — judul kartu jawaban
    'ask.answer-judul': 'Jawaban FIEZEL',
    // app.js:3994 — disclosure AI (spasi ikon-teks tetap di template)
    'ask.disclosure': 'Pertanyaan dan konteks materi yang kamu buka diproses oleh Core AI. Jangan masukkan data pribadi.',
    // app.js:4000 — judul galat tanya
    'ask.galat-judul': 'Belum bisa menjawab sekarang.',
    // app.js:3954 — intro; HTML-TRUSTED (<b>), esc() tetap di pemanggil (mini-desain plan)
    'ask.intro': 'Tanya apa saja yang belum kamu mengerti, pakai bahasa sehari-hari. Misalnya <b>kenapa pakai did bukan do</b>. Materi terkait dibatasi ke level {level}.',
    // app.js:3954 — judul halaman Tanya FIEZEL
    'ask.judul': 'Tanya FIEZEL',
    // app.js:3955 — aria-label tombol kirim
    'ask.kirim-aria': 'Kirim pertanyaan',
    // app.js:4000 — tombol minta materi (spasi ikon-teks tetap di template)
    'ask.minta-materi': 'Minta materi ini',
    // app.js:3955 — placeholder input tanya
    'ask.placeholder': 'Tulis pertanyaanmu…',
    // app.js:2754 — tombol error; slug netral (coba+lagi = 2 COMMON lexer gerbang)
    'auth.tombol-retry': 'Coba lagi',
    // app.js:2498 — fallback whyFails; kutip tipografis “ ” WAJIB byte-identik
    'grammar.alasan-salah-fallback': '“{pilihan}” belum memenuhi aturan grammar yang sedang diuji pada kalimat ini.',
    // app.js:2430 — kartu coach lokal; p.summary dari fallback policy (koordinasi lintas segmen)
    'home.coach-fokus': '{ringkasan} Fokus: {fokus}. {jumlahSoal} soal, sekitar {menit} menit.',
    // app.js:2038 — olmDispute() toast konfirmasi remeasure (precompute jumlahSoal, mini-desain plan)
    'progress.olm-ukur-ulang': 'Oke. Kita ukur ulang {skill} lewat {jumlahSoal} soal di sesi berikutnya.',
    // app.js:2608 — vonis kilas jawaban salah
    'quiz.burst-miss': 'Belum tepat',
    // app.js:2608 — subteks vonis salah
    'quiz.burst-miss-sub': 'Tenang, kita bedah jawabannya.',
    // app.js:2608 — vonis kilas jawaban benar
    'quiz.burst-ok': 'Benar!',
    // app.js:2608 — subteks vonis benar
    'quiz.burst-ok-sub': 'Mantap, polanya sudah terbaca.',
    // app.js:2905 — badan modal fallback jatah
    'quota.fallback-badan': 'Materi, latihan, dan progresmu tetap jalan seperti biasa. Jatahnya kembali sesudah tengah malam.',
    // app.js:2905 — judul modal fallback jatah (naskah utama di features/quota/quota-copy.js)
    'quota.fallback-judul': 'Jatah hari ini sudah habis',
    // app.js:2905 — tombol modal fallback jatah
    'quota.fallback-tombol': 'Oke, lanjut belajar',
    // app.js:2435 — status laporan: default
    'settings.laporan-siap': 'Siap mengirim otomatis'
  });
}());
