/**
 * FIEZEL · features/i18n/copy-th-bahasa.js — COPY-MAP PEMILIH BAHASA TARGET (th)
 *
 * ⚠ DRAFT AI — WAJIB DIREVIEW PENUTUR ASLI THAI, sama seperti seluruh copy-th lain.
 *
 * Pasangan satu-satu dari copy-id-bahasa.js. Yang diatur di sini adalah BAHASA YANG
 * DIPELAJARI, bukan bahasa layar — perbedaan itu harus tetap terasa dalam bahasa Thai,
 * karena murid Thai melihat kedua pilihan itu berdekatan di Pengaturan.
 *
 * Placeholder {bahasa} dipertahankan namanya persis; urutan katanya mengikuti tata bahasa
 * Thai, bukan hasil menerjemahkan kata per kata dari Indonesia.
 */
(function () {
  'use strict';
  /* Akses lewat `self`, bukan identifier telanjang: gerbang paritas (th-ui-leak-test) memuat
     berkas ini di Node dengan `self` yang disuntik, dan berkas yang menyebut FiezelI18n
     telanjang tidak terlihat olehnya — kuncinya lolos tanpa pernah dihitung. */
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('th', {
    'bahasa.judul': 'ภาษาที่กำลังเรียน',
    'bahasa.penjelasan': 'ความคืบหน้าของแต่ละภาษาแยกจากกัน การเปลี่ยนภาษาไม่ลบข้อมูลใด ๆ',
    'bahasa.en': 'ภาษาอังกฤษ',
    'bahasa.ja': 'ภาษาญี่ปุ่น',
    'bahasa.en-catatan': 'หลักสูตรครบถ้วน',
    'bahasa.ja-catatan': 'ระดับ A1/N5 · คำศัพท์และไวยากรณ์พื้นฐาน',
    'bahasa.ja-peringatan': 'หลักสูตรภาษาญี่ปุ่นยังอยู่ในระยะเริ่มต้น มีเพียงระดับ A1 ยังไม่มีแบบฝึกการฟังและการพูด เพราะเสียงและการรู้จำเสียงยังเป็นภาษาอังกฤษ จึงซ่อนการ์ดเหล่านั้นไว้ก่อน แบบฝึกการเขียนพร้อมใช้งานแล้ว และเนื้อหายังไม่ผ่านการตรวจโดยเจ้าของภาษา',
    'bahasa.chip-coba-ja': 'ลองเรียนภาษาญี่ปุ่น',
    'bahasa.chip-coba-ja-sub': 'ระดับ A1/N5 · คำศัพท์และไวยากรณ์พื้นฐาน',
    'bahasa.chip-aktif-ja': 'กำลังเรียนภาษาญี่ปุ่น',
    'bahasa.chip-kembali-en': 'แตะเพื่อกลับไปเรียนภาษาอังกฤษ',
    'bahasa.chip-aria': 'เปลี่ยนภาษาที่กำลังเรียน',
    'bahasa.berganti': 'ตอนนี้กำลังเรียน{bahasa}',
    'bahasa.permukaan-terkunci': 'ยังไม่มีแบบฝึกนี้สำหรับ{bahasa} เพราะเสียงยังเป็นภาษาอังกฤษ เราจึงซ่อนไว้ก่อน'
  });
  /* Lapisan kursus Bahasa Jepang (FiezelI18n.setCourse('ja')): saat kursus Jepang aktif,
     kunci 'kursus-ja.<kunci>' menang atas <kunci>. Nama bagian memakai istilah Jepang yang
     dipakai murid dan buku ajar (Kotoba, Bunpō, Dokkai...), keterangannya tetap berbahasa
     murid supaya tidak ada yang harus menebak. Istilah Jepang identik di id dan th (netral). */
  I18N.registerCopy('th', {
    'kursus-ja.nav.practice': 'Renshū',
    'kursus-ja.nav.school': '<span class="kelasku-wordmark">Kyōshitsu</span>',
    'kursus-ja.nav.home-primary': 'Kyō',
    'kursus-ja.nav.progress': 'Shinpo',
    'kursus-ja.nav.profile': 'Watashi',
    'kursus-ja.nav.practice-aria': 'Renshū (แบบฝึกหัด)',
    'kursus-ja.nav.school-aria': 'Kyōshitsu (ห้องเรียนของฉัน)',
    'kursus-ja.nav.home-primary-aria': 'Kyō (วันนี้)',
    'kursus-ja.nav.progress-aria': 'Shinpo (ความคืบหน้า)',
    'kursus-ja.nav.profile-aria': 'Watashi (โปรไฟล์)',
    'kursus-ja.latihan.judul': '練習 Renshū',
    'kursus-ja.skill.vocab': 'Kotoba',
    'kursus-ja.skill.grammar': 'Bunpō',
    'kursus-ja.skill.reading': 'Dokkai',
    'kursus-ja.skill.writing': 'Sakubun',
    'kursus-ja.skill.listening': 'Chōkai',
    'kursus-ja.skill.speaking': 'Kaiwa',
    'kursus-ja.latihan.vocab-note': '言葉 · คำศัพท์',
    'kursus-ja.latihan.grammar-note': '文法 · ไวยากรณ์',
    'kursus-ja.latihan.reading-note': '読解 · การอ่านจับใจความ',
    'kursus-ja.latihan.writing-note': '作文 · การเขียนประโยค',
    'kursus-ja.latihan.library-note': '図書館 · อ่านตามใจชอบ',
    'kursus-ja.latihan.bicara-dengar': 'Kaiwa & Chōkai',
    'kursus-ja.latihan.bicara-dengar-note': '会話・聴解 · พูดและฟัง',
    'kursus-ja.home.library-card': 'Toshokan',
    'kursus-ja.library.title': '図書館 Toshokan',
    'kursus-ja.home.latihan-singkat': 'Mini renshū',
    'kursus-ja.home.chip-vocab-sub': '言葉 · การ์ดด่วน 10 ใบ',
    'kursus-ja.home.chip-grammar-sub': '文型 · รูปประโยค',
    'kursus-ja.home.classroom-card': 'Kyōshitsu',
    'kursus-ja.today.eyebrow': '今日 · Kyō',
    'kursus-ja.today.judul-sapaan': 'Konnichiwa, {nama}',
    'kursus-ja.student.flow-heading': '勉強計画 · แผนการเรียน',
    'kursus-ja.student.vocab-title': 'Kotoba',
    'kursus-ja.student.grammar-title': 'Bunpō',
    'kursus-ja.student.skills-title': 'Kaiwa & Chōkai',
    'kursus-ja.student.classroom-title': 'Kyōshitsu',
    'kursus-ja.progress.vocab': 'Kotoba',
    'kursus-ja.nav.vocab': 'Kotoba',
    'kursus-ja.nav.grammar': 'Bunpō',
    'kursus-ja.grammar.keluarga-fallback': 'รูปแบบ bunpō',
    'kursus-ja.grammar.keluarga-core-grammar': 'รูปแบบ bunpō พื้นฐาน',
    'kursus-ja.grammar.keluarga-advanced-grammar': 'รูปแบบ bunpō ขั้นสูง',
    'kursus-ja.vocab.uji': ' Kotoba tesuto {level}</button>',
    'kursus-ja.student.vocab-level-title': 'Kotoba {level}',
    'kursus-ja.progress.peta-study-lab': '進歩 Shinpo',
    'kursus-ja.progress.peta-study': '進歩 · ความคืบหน้าของบทเรียน',
    'kursus-ja.social.shell-title': 'Watashi',
    'kursus-ja.social.tab-profile': 'Watashi',
    'jepang.tampilan-aria': 'การแสดงข้อความภาษาญี่ปุ่น',
    'jepang.furigana': 'ふりがな',
    'jepang.furigana-aria': 'ฟุริงานะ: คำอ่านตัวเล็กเหนือคันจิ',
    'jepang.romaji': 'ローマ字',
    'jepang.romaji-aria': 'โรมาจิ: คำอ่านเป็นอักษรละติน',
    'jepang.hiragana': 'ひらがな',
    'jepang.katakana': 'カタカナ',
    'jepang.kana-judul': 'かな Kana',
    'jepang.kana-lead': 'ฮิรางานะและคาตากานะพื้นฐาน ซ่อนโรมาจิเพื่อทดสอบตัวเอง',
    'jepang.kana-dasar': 'Gojūon · ตัวอักษรพื้นฐาน 46 ตัว',
    'jepang.kana-dakuten': 'ดาคุเต็นและฮันดาคุเต็น',
    'jepang.kana-kartu': 'Kana',
    'jepang.kana-note': 'かな · ฮิรางานะและคาตากานะ',
    'jepang.segera-hadir': 'เร็ว ๆ นี้',
    'jepang.segera-bagian': 'เร็ว ๆ นี้ในหลักสูตรภาษาญี่ปุ่น',
    'jepang.segera-aria': '{nama} เร็ว ๆ นี้',
    'jepang.chokai': 'Chōkai',
    'jepang.chokai-note': '聴解 · การฟัง',
    'jepang.kaiwa': 'Kaiwa',
    'jepang.kaiwa-note': '会話 · การพูด',
    'jepang.kanji': 'Kanji',
    'jepang.kanji-note': '漢字 · ลำดับการเขียนขีด',
    'jepang.moshi': 'JLPT Moshi',
    'jepang.moshi-note': '模試 · ข้อสอบจำลอง JLPT',
    'jepang.kata-hari-ini': '今日の言葉 · คำศัพท์วันนี้'
  });
})();
