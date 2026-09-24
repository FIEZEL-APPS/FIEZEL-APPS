/**
 * FIEZEL · features/i18n/copy-id-bahasa.js — COPY-MAP PEMILIH BAHASA TARGET (id)
 *
 * Kalimat yang dibaca murid saat memilih BAHASA YANG DIPELAJARI — bukan bahasa layar.
 * Dua hal itu berbeda dan gampang tertukar: `learnerLocale` mengatur bahasa antarmuka
 * (Indonesia / ไทย), sedangkan yang di sini mengatur kursus mana yang sedang dibuka.
 * Setiap kalimat dijaga supaya perbedaan itu terdengar.
 *
 * NADA: menyebut apa yang terjadi pada progres, karena itu pertanyaan pertama murid yang
 * berganti kursus. Progres tiap bahasa berdiri sendiri dan tidak ada yang terhapus —
 * dikatakan terbuka, bukan diasumsikan dimengerti.
 *
 * Pasangan Thai-nya di copy-th-bahasa.js, kunci demi kunci.
 */
(function () {
  'use strict';
  /* Akses lewat `self`, bukan identifier telanjang: gerbang paritas (th-ui-leak-test) memuat
     berkas ini di Node dengan `self` yang disuntik, dan berkas yang menyebut FiezelI18n
     telanjang tidak terlihat olehnya — kuncinya lolos tanpa pernah dihitung. */
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('id', {
    'bahasa.judul': 'Bahasa yang dipelajari',
    'bahasa.penjelasan': 'Progres tiap bahasa berdiri sendiri. Berganti tidak menghapus apa pun.',
    'bahasa.en': 'Bahasa Inggris',
    'bahasa.ja': 'Bahasa Jepang',
    'bahasa.en-catatan': 'Kursus lengkap',
    'bahasa.ja-catatan': 'Tingkat A1/N5 · kosakata & tata bahasa dasar',
    // m025-312: menulis DIKELUARKAN dari daftar yang belum ada - banknya sudah dibuat
    // (24 prompt N5, dua untuk tiap keluarga silabus) dan kartunya sudah ditawarkan.
    // Menyimak dan berbicara tetap disebut, dan alasannya kini disebut apa adanya:
    // bukan "banknya belum ditulis" melainkan suaranya masih bahasa Inggris.
    'bahasa.ja-peringatan': 'Kursus Jepang masih tahap awal: baru tingkat A1. Latihan menyimak dan berbicara belum ada karena suara dan pengenalan ucapannya masih bahasa Inggris, jadi kartunya disembunyikan. Latihan menulis sudah tersedia. Naskahnya belum ditinjau penutur asli.',
    'bahasa.chip-coba-ja': 'Coba Bahasa Jepang',
    'bahasa.chip-coba-ja-sub': 'Tingkat A1/N5 · kosakata & tata bahasa dasar',
    'bahasa.chip-aktif-ja': 'Bahasa Jepang aktif',
    'bahasa.chip-kembali-en': 'Ketuk untuk kembali ke Bahasa Inggris',
    'bahasa.chip-aria': 'Ganti bahasa yang dipelajari',
    'bahasa.berganti': 'Sekarang belajar {bahasa}.',
    // m025-314: penolakan rute. Muncul saat murid sampai ke permukaan yang isinya belum
    // ada untuk bahasa yang sedang dipelajari - lewat riwayat, tautan lama, atau layar
    // yang tersimpan dari sebelum ia berganti kursus. Ia menyebut ALASANNYA, karena
    // pintu yang menolak tanpa berkata apa-apa terbaca sebagai aplikasi yang rusak.
    'bahasa.permukaan-terkunci': 'Latihan ini belum ada untuk {bahasa}. Suaranya masih bahasa Inggris, jadi latihannya disembunyikan dulu.'
  });
  /* Lapisan kursus Bahasa Jepang (FiezelI18n.setCourse('ja')): saat kursus Jepang aktif,
     kunci 'kursus-ja.<kunci>' menang atas <kunci>. Nama bagian memakai istilah Jepang yang
     dipakai murid dan buku ajar (Kotoba, Bunpō, Dokkai...), keterangannya tetap berbahasa
     murid supaya tidak ada yang harus menebak. Istilah Jepang identik di id dan th (netral). */
  I18N.registerCopy('id', {
    'kursus-ja.nav.practice': 'Renshū',
    'kursus-ja.nav.school': '<span class="kelasku-wordmark">Kyōshitsu</span>',
    'kursus-ja.nav.home-primary': 'Kyō',
    'kursus-ja.nav.progress': 'Shinpo',
    'kursus-ja.nav.profile': 'Watashi',
    'kursus-ja.nav.practice-aria': 'Renshū (latihan)',
    'kursus-ja.nav.school-aria': 'Kyōshitsu (kelasku)',
    'kursus-ja.nav.home-primary-aria': 'Kyō (hari ini)',
    'kursus-ja.nav.progress-aria': 'Shinpo (progres)',
    'kursus-ja.nav.profile-aria': 'Watashi (profil)',
    'kursus-ja.latihan.judul': '練習 Renshū',
    'kursus-ja.skill.vocab': 'Kotoba',
    'kursus-ja.skill.grammar': 'Bunpō',
    'kursus-ja.skill.reading': 'Dokkai',
    'kursus-ja.skill.writing': 'Sakubun',
    'kursus-ja.skill.listening': 'Chōkai',
    'kursus-ja.skill.speaking': 'Kaiwa',
    'kursus-ja.latihan.vocab-note': '言葉 · kosakata',
    'kursus-ja.latihan.grammar-note': '文法 · tata bahasa',
    'kursus-ja.latihan.reading-note': '読解 · pemahaman bacaan',
    'kursus-ja.latihan.writing-note': '作文 · menulis kalimat',
    'kursus-ja.latihan.library-note': '図書館 · bacaan bebas',
    'kursus-ja.latihan.bicara-dengar': 'Kaiwa & Chōkai',
    'kursus-ja.latihan.bicara-dengar-note': '会話・聴解 · bicara & dengar',
    'kursus-ja.home.library-card': 'Toshokan',
    'kursus-ja.library.title': '図書館 Toshokan',
    'kursus-ja.home.latihan-singkat': 'Mini renshū',
    'kursus-ja.home.chip-vocab-sub': '言葉 · 10 kartu cepat',
    'kursus-ja.home.chip-grammar-sub': '文型 · pola kalimat',
    'kursus-ja.home.classroom-card': 'Kyōshitsu',
    'kursus-ja.today.eyebrow': '今日 · Kyō',
    'kursus-ja.today.judul-sapaan': 'Konnichiwa, {nama}',
    'kursus-ja.student.flow-heading': '勉強計画 · rencana belajar',
    'kursus-ja.student.vocab-title': 'Kotoba',
    'kursus-ja.student.grammar-title': 'Bunpō',
    'kursus-ja.student.skills-title': 'Kaiwa & Chōkai',
    'kursus-ja.student.classroom-title': 'Kyōshitsu',
    'kursus-ja.progress.vocab': 'Kotoba',
    'kursus-ja.nav.vocab': 'Kotoba',
    'kursus-ja.nav.grammar': 'Bunpō',
    'kursus-ja.grammar.keluarga-fallback': 'pola bunpō',
    'kursus-ja.grammar.keluarga-core-grammar': 'pola bunpō dasar',
    'kursus-ja.grammar.keluarga-advanced-grammar': 'pola bunpō tingkat lanjut',
    'kursus-ja.vocab.uji': ' Kotoba tesuto {level}</button>',
    'kursus-ja.student.vocab-level-title': 'Kotoba {level}',
    'kursus-ja.progress.peta-study-lab': '進歩 Shinpo',
    'kursus-ja.progress.peta-study': '進歩 · kemajuan materi',
    'kursus-ja.social.shell-title': 'Watashi',
    'kursus-ja.social.tab-profile': 'Watashi',
    'jepang.tampilan-aria': 'Tampilan teks Jepang',
    'jepang.furigana': 'ふりがな',
    'jepang.furigana-aria': 'Furigana: cara baca kecil di atas kanji',
    'jepang.romaji': 'ローマ字',
    'jepang.romaji-aria': 'Romaji: bacaan dalam huruf Latin',
    'jepang.hiragana': 'ひらがな',
    'jepang.katakana': 'カタカナ',
    'jepang.kana-judul': 'かな Kana',
    'jepang.kana-lead': 'Hiragana dan katakana dasar. Sembunyikan romaji untuk menguji dirimu.',
    'jepang.kana-dasar': 'Gojūon · 46 huruf dasar',
    'jepang.kana-dakuten': 'Dakuten & handakuten',
    'jepang.kana-kartu': 'Kana',
    'jepang.kana-note': 'かな · hiragana & katakana',
    'jepang.segera-hadir': 'Segera hadir',
    'jepang.segera-bagian': 'Segera hadir di kursus Jepang',
    'jepang.segera-aria': '{nama}, segera hadir',
    'jepang.chokai': 'Chōkai',
    'jepang.chokai-note': '聴解 · menyimak',
    'jepang.kaiwa': 'Kaiwa',
    'jepang.kaiwa-note': '会話 · berbicara',
    'jepang.kanji': 'Kanji',
    'jepang.kanji-note': '漢字 · urutan goresan',
    'jepang.moshi': 'JLPT Moshi',
    'jepang.moshi-note': '模試 · simulasi ujian JLPT',
    'jepang.kata-hari-ini': '今日の言葉 · kata hari ini'
  });
})();
