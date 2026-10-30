/**
 * FIEZEL · features/i18n/copy-id-core.js — COPY-MAP INDONESIA, domain "core" (TEMPLATE)
 *
 * Berkas ini adalah CONTOH BENTUK untuk semua copy-id-<domain>.js (login, home, grammar,
 * settings, progress, quiz, onboarding, tutor, dst — satu berkas per domain). Tiga entri
 * di bawah adalah placeholder NYATA: nilainya disalin byte-per-byte dari app.js hari ini,
 * dengan lokasi sumbernya dicatat, supaya pola "PINDAH boleh, BERUBAH tidak" terlihat
 * konkret.
 *
 * ATURAN untuk agent yang menyalin pola ini (pelanggaran = gerbang merah):
 *
 * 1. NILAI harus byte-identik dengan literal di app.js/features hari ini. Gerbang
 *    tests/id-golden-snapshot-test.js membekukan HIMPUNAN literal Indonesia dari app.js +
 *    features/**: kalimat boleh pindah ke sini (himpunan tidak berubah), tapi satu
 *    karakter yang berubah = merah. Salin-tempel, jangan ketik ulang.
 *
 * 2. KUNCI: `<domain>.<slug-pendek>` huruf kecil, deskriptif, stabil. HATI-HATI: gerbang
 *    yang sama me-lexer SEMUA string literal di folder ini, termasuk kunci. Kunci yang
 *    mengandung kata penanda Indonesia (kamu, belajar, soal, jawaban, latihan, lanjut,
 *    mulai+pilih, dst — lihat daftar STRONG/COMMON di tests/id-golden-snapshot-test.js) akan
 *    dihitung sebagai "literal Indonesia baru" dan MERAH. Pakai slug netral/Inggris
 *    (placement-cta, auth-skip-status), bukan terjemahan kalimatnya.
 *
 * 3. INTERPOLASI: template literal `${x}` di app.js menjadi placeholder BERNAMA `{nama}`
 *    di sini, dan pemanggilnya menjadi t('kunci', {nama: x}). Placeholder posisi dilarang —
 *    sintaks Thai menyusun ulang kalimat.
 *
 * 4. Kunci copy-th-<domain>.js HARUS 1:1 dengan berkas -id domainnya; gerbang coverage
 *    akan menghitung. registerCopy MELEMPAR pada kunci ganda — periksa domain lain sebelum
 *    memakai nama kunci.
 *
 * 5. Berkas ini dimuat lewat <script defer> di index.html SETELAH fiezel-i18n.js dan
 *    SEBELUM app.js (lihat blok penanda FIEZEL_I18N di index.html). Tambahkan berkas
 *    domain baru di blok yang sama, dan minta W1-SW menambahkannya ke precache sw.js.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // app.js:1515 dan app.js:4679 — CTA placement saat belum ada bukti level.
    'core.placement-cta': 'Cari tahu level kamu',
    // app.js:2757 — status kartu Akun Puter saat murid memilih tanpa akun.
    'core.auth-skip-status': 'Oke, lanjut tanpa akun.',
    // app.js:3837 dan app.js:7512 — toast saat izin pengingat diberikan.
    'core.reminder-on-toast': 'Pengingat belajar aktif.',
    'topbar.ask': 'Tanya FIEZEL?',
    'nav.peta': 'Peta',
    'nav.home': 'Home',
    'nav.vocab': 'Vocab',
    'nav.grammar': 'Grammar',
    'nav.reading': 'Reading',

    // features/mascot/fiezel-mochi-voice-sos.js — Mochi Live Voice SOS Lifeline
    'mochi-sos.bubble-tap': 'Ketuk aku',
    'mochi-sos.bubble-title': 'Diskusi suara langsung dengan Mochi',
    'mochi-sos.badge-free': 'Gratis',
    'mochi-sos.call-title': 'Bantuan Suara Mochi',
    'mochi-sos.call-listening': 'Mochi sedang mendengar...',
    'mochi-sos.call-speaking': 'Mochi sedang menjelaskan...',
    'mochi-sos.call-close-title': 'Ketuk untuk tutup panggilan',
    'mochi-sos.toast-insufficient': 'Gem belum cukup ({balance}/{cost} 💎). Selesaikan latihan untuk kumpulkan Gem!',
    'mochi-sos.toast-refund': 'Panggilan singkat: {cost} Gem dikembalikan 💎',
    'mochi-sos.toast-cashback': 'Sugoi! Jawaban benar: Cashback +{reward} Gem didapatkan! 🎉',
    'mochi-sos.intro-title': 'Bantuan Suara Langsung Mochi! ✨',
    'mochi-sos.intro-body': 'Jika merasa bingung saat latihan, cukup ketuk Mochi untuk berdiskusi dan meminta panduan suara tanpa merusak kuis!',
    'mochi-sos.intro-btn': 'Paham, Mulai Latihan!',
    'mochi-sos.guide-rule-prefix': 'Tips dari Mochi: ',
    'mochi-sos.guide-concept-prefix': 'Pertanyaan ini melatih konsep "{concept}". Perhatikan pola kata kerja atau partikel penanda ya!',
    'mochi-sos.guide-default': 'Mochi siap bantu! Coba perhatikan partikel penunjuk waktu atau arah di kalimat ini ya!',
    'mochi-sos.exam-locked': 'Tes mandiri: Mochi istirahat dulu saat ujian/tes awal ya!',
    'mochi-sos.greet-1': 'Halo! Mochi siap temani latihanmu hari ini! Kalau bingung, ketuk aku langsung ya! ✨',
    'mochi-sos.greet-2': 'Semangat! Ada Mochi di sini. Jangan ragu ketuk aku kalau butuh petunjuk!',
    'mochi-sos.greet-3': 'Yuk mulai! Aku di sini kalau kamu mau diskusi soalnya. Ketuk aku kapan saja!',
    'mochi-sos.greet-listening': 'Halo! Sesi mendengarkan nih. Dengarkan dulu baik-baik, kalau ada yang samar ketuk aku ya!',
    'mochi-sos.greet-reading': 'Halo! Ada bacaan hari ini. Baca santai dulu, kalau ada kata sulit ketuk aku!',
    'mochi-sos.greet-vocab': 'Halo! Waktunya kosakata! Kalau ada kata yang asing, ketuk aku, kita bahas maknanya!',
    'mochi-sos.greet-grammar': 'Halo! Sesi tata bahasa dimulai! Perhatikan partikel dan bentuk kata kerja. Ketuk aku kalau bingung!',
    'mochi-sos.greet-kanji': 'Halo! Sesi kanji! Lihat bentuk dan bunyinya pelan-pelan. Ketuk aku kalau butuh petunjuk!',
    'mochi-sos.greet-build': 'Halo! Ayo susun kalimatnya! Mulai dari subjek dan partikelnya. Ketuk aku kalau macet!',
    'mochi-sos.greet-cue': 'Halo! Mochi siap menemani. Ketuk aku kalau bingung ya!',
    'mochi-sos.leak-correction': '[SISTEM FIEZEL: Kamu hampir membocorkan kunci jawaban. DILARANG menyebut huruf pilihan atau teks jawaban benar. Ulangi dalam 1 kalimat sebagai petunjuk sokratik saja.]',
    'mochi-sos.connecting': 'Menyambungkan Mochi...',
    'mochi-sos.silence-prompt': 'Silakan bicara jika ingin bantuan dari aku'
  });
}());
