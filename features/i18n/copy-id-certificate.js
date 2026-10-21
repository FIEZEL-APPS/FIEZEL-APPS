/**
 * FIEZEL · features/i18n/copy-id-certificate.js — COPY-MAP INDONESIA, domain sertifikat CEFR.
 *
 * ATURAN (lihat copy-id-core.js untuk penjelasan penuh):
 * 1. Kunci netral/Inggris, bukan terjemahan kalimatnya.
 * 2. Interpolasi memakai placeholder BERNAMA {nama}; pemanggil memakai
 *    FiezelI18n.t('kunci', {nama: x}).
 * 3. Kembarannya copy-th-certificate.js WAJIB memuat kunci yang sama persis
 *    (tests/th-coverage-test.js menemukan domain ini sendiri dan menuntutnya).
 *
 * KANON NADA DOMAIN INI — beda dari domain lain, dan sengaja:
 * Sertifikat dibaca ORANG LUAR (HRD, panitia kampus), bukan murid. Maka naskah di sini
 * lebih datar dan formal daripada sisa aplikasi: tanpa sapaan akrab, tanpa maskot, tanpa
 * seruan. Yang dijual sertifikat adalah KEPERCAYAAN, dan kepercayaan tidak dibangun dengan
 * kalimat riang.
 *
 * DUA KALIMAT DI BAWAH TIDAK BOLEH DILUNAKKAN, apa pun alasan pemasaran:
 *   - 'cert.disclaimer.body' — FIEZEL bukan lembaga terakreditasi. Menghapus atau
 *     mengaburkan kalimat ini membuat murid membawa sertifikat ke tempat yang tidak
 *     menerimanya, dan itu kerugian yang ditanggung murid, bukan kita.
 *   - 'cert.skill.notMeasured' — skill yang tidak diuji ditulis tidak diuji. Ia TIDAK
 *     boleh diganti '0', '-', atau dikosongkan sampai pembaca mengiranya nol.
 */
(function () {
  'use strict';
  var g = (typeof self !== 'undefined') ? self
    : (typeof globalThis !== 'undefined') ? globalThis : this;
  var I18N = g && g.FiezelI18n;
  if (!I18N && typeof require === 'function') {
    try { I18N = require('./fiezel-i18n.js'); } catch (loadError) { I18N = null; }
  }
  if (!I18N) return;

  I18N.registerCopy('id', {
    /* ---- dokumen sertifikat ---------------------------------------------- */
    'cert.doc.title': 'Sertifikat Asesmen Bahasa Inggris',
    'cert.doc.subtitle': 'Hasil asesmen adaptif FIEZEL, dipetakan ke skala CEFR',
    'cert.doc.holderLabel': 'Diberikan kepada',
    'cert.doc.levelLabel': 'Level keseluruhan',
    'cert.doc.idLabel': 'Nomor sertifikat',
    'cert.doc.issuedLabel': 'Diterbitkan',
    'cert.doc.expiresLabel': 'Berlaku sampai',
    'cert.doc.itemsLabel': 'Jumlah soal dikerjakan',
    'cert.doc.profileLabel': 'Profil per keterampilan',

    /* ---- keterampilan ----------------------------------------------------- */
    'cert.skill.grammar': 'Tata bahasa',
    'cert.skill.vocabulary': 'Kosakata',
    'cert.skill.reading': 'Membaca',
    'cert.skill.listening': 'Menyimak',
    'cert.skill.speaking': 'Berbicara',
    'cert.skill.notMeasured': 'Tidak diuji',
    'cert.skill.notMeasuredHint': 'Keterampilan ini tidak termasuk dalam asesmen, sehingga tidak dinilai. Ini bukan nilai nol.',

    /* ---- level ------------------------------------------------------------ */
    'cert.level.A1': 'A1 — Pemula',
    'cert.level.A2': 'A2 — Dasar',
    'cert.level.B1': 'B1 — Menengah',
    'cert.level.B2': 'B2 — Menengah atas',
    'cert.level.C1': 'C1 — Mahir',
    'cert.level.C2': 'C2 — Sangat mahir',

    /* ---- integritas sesi --------------------------------------------------- */
    'cert.integrity.proctored': 'Asesmen diawasi sistem',
    'cert.integrity.unproctored': 'Asesmen mandiri, tanpa pengawasan',
    'cert.integrity.screenExits': 'Tercatat keluar layar: {count} kali',

    /* ---- verifikasi -------------------------------------------------------- */
    'cert.verify.instruction': 'Periksa keaslian sertifikat ini di {url} dengan nomor di atas.',
    'cert.verify.pagePrompt': 'Masukkan nomor sertifikat',
    'cert.verify.pageHint': 'Contoh: FZ-A234-C679',
    'cert.verify.submit': 'Periksa',
    'cert.verify.valid': 'Sertifikat ini asli dan masih berlaku.',
    'cert.verify.expired': 'Sertifikat ini asli, tetapi masa berlakunya sudah lewat pada {date}.',
    'cert.verify.revoked': 'Sertifikat ini sudah dicabut dan tidak berlaku.',
    'cert.verify.notFound': 'Nomor ini tidak ditemukan. Periksa kembali ketikannya.',
    'cert.verify.malformed': 'Nomor sertifikat tidak berbentuk benar. Bentuknya FZ-XXXX-XXXX.',

    /* ---- penolakan penerbitan ----------------------------------------------- */
    'cert.refuse.title': 'Sertifikat belum bisa diterbitkan',
    'cert.refuse.tooFewItems': 'Soal yang kamu kerjakan belum cukup untuk menilai level dengan jujur. Selesaikan asesmen penuh dulu.',
    'cert.refuse.tooFewSkills': 'Baru satu keterampilan yang terukur. Sertifikat butuh minimal dua supaya levelnya bisa dipertanggungjawabkan.',
    'cert.refuse.noEvidence': 'Belum ada hasil asesmen yang bisa dibaca.',
    'cert.refuse.noLevel': 'Hasilnya belum cukup untuk menetapkan satu level. Coba kerjakan asesmen sekali lagi tanpa terburu-buru.',

    /* ---- penafian — JANGAN DILUNAKKAN --------------------------------------- */
    'cert.disclaimer.title': 'Penafian',
    'cert.disclaimer.body': 'FIEZEL bukan lembaga asesmen terakreditasi. Sertifikat ini melaporkan hasil asesmen adaptif di aplikasi FIEZEL yang dipetakan ke skala CEFR, dan TIDAK setara dengan TOEFL, IELTS, atau ujian terakreditasi lainnya. Penerima sertifikat dipersilakan menilai sendiri kecukupannya.',
    'cert.disclaimer.scope': 'Level yang tercantum hanya ditopang oleh keterampilan yang benar-benar diuji dan tercantum di profil di atas.'
  });
}());
