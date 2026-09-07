/**
 * FIEZEL · features/i18n/copy-th-redesign.js — COPY-MAP PENYEDERHANAAN PENGALAMAN (th)
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum dianggap final. Aturannya sama dengan copy-th-quota.js:
 * status draft dikirim TERBUKA, karena alternatifnya bukan naskah yang lebih baik —
 * alternatifnya murid Thai membaca 76 kalimat berbahasa Indonesia di layar yang ia buka
 * setiap hari (navigasi 4 tab, Home "Hari ini", ringkasan akhir sesi, Pengaturan).
 *
 * KENAPA BERKAS INI BARU ADA SEKARANG. copy-id-redesign.js lahir di gelombang m025-246
 * tanpa padanan th, dan lubang itu TIDAK disembunyikan: ia terdaftar sebagai utang
 * bertanggal di UTANG_TANPA_TH pada tests/th-coverage-test.js. Berkas ini melunasi utang
 * itu, dan entri utangnya dihapus pada commit yang sama — gerbang itu memerahkan utang
 * yang sudah lunas tapi masih terdaftar, supaya pengecualian mati tidak menumpuk lalu
 * diam-diam melonggarkan pagar untuk domain lain.
 *
 * KANON NADA th (rujukan: header copy-th-quota.js, impl/TH-STYLE.md):
 *   - bahasa Thai sehari-hari yang hangat, sudut pandang คุณ (murid) / เรา (aplikasi);
 *   - tanpa istilah mesin (เซิร์ฟเวอร์, โควตา, เอนด์พอยต์, แคช, โทเค็น);
 *   - tanpa menyalahkan murid; tanpa janji hasil.
 *
 * PANJANG LABEL NAVIGASI ADALAH BAGIAN DARI TERJEMAHANNYA. Sembilan kunci nav.* yang
 * TAMPIL (bukan -aria) duduk di bar bawah selebar layar 360 px. Terjemahan yang benar
 * tapi panjang akan terpotong atau membungkus dua baris, dan itu sama rusaknya dengan
 * tidak diterjemahkan. Karena itu labelnya sengaja pendek — "คืบหน้า" bukan
 * "ความคืบหน้า", "ฝึกฝน" bukan "การฝึกฝน" — sementara padanan -aria yang dibacakan
 * pembaca layar memakai bentuk panjang yang lebih jelas. Lebar terpasangnya diukur di
 * Chromium 360 px, bukan ditaksir dari jumlah karakter.
 *
 * KONVENSI: kunci, urutan, dan pengelompokan komentar mengikuti copy-id-redesign.js
 * satu-satu. {placeholder} WAJIB identik dengan versi id — urutan katanya boleh (dan
 * kadang harus) berbeda karena tata bahasa Thai, tapi nama placeholder-nya tidak.
 */
(function () {
  'use strict';
  if (typeof FiezelI18n === 'undefined' || !FiezelI18n || typeof FiezelI18n.registerCopy !== 'function') return;
  FiezelI18n.registerCopy('th', {
    /* ── Navigasi 4 tab legacy & 5 tab utama ──────────────────────── */
    'nav.hari-ini': 'วันนี้',
    'nav.hari-ini-aria': 'วันนี้',
    'nav.latihan': 'ฝึกฝน',
    'nav.latihan-aria': 'ฝึกฝน',
    'nav.progres': 'คืบหน้า',
    'nav.progres-aria': 'ความคืบหน้า',
    'nav.pengaturan': 'ตั้งค่า',
    'nav.pengaturan-aria': 'เปิดการตั้งค่า',
    'nav.practice': 'ฝึกฝน',
    'nav.practice-aria': 'ฝึกด้วยตัวเองและทักษะต่าง ๆ',
    'nav.school': 'ห้องเรียน',
    'nav.school-aria': 'ห้องเรียนและงานจากโรงเรียน',
    'nav.home-primary': 'วันนี้',
    'nav.home-primary-aria': 'หน้าแรกและสิ่งที่ต้องเน้นวันนี้',
    'nav.progress': 'คืบหน้า',
    'nav.progress-aria': 'แผนที่ CEFR และระดับความชำนาญ',
    'nav.profile': 'โปรไฟล์',
    'nav.profile-aria': 'โปรไฟล์ผู้เรียนและเพื่อน',

    /* ── Home "Hari ini" ───────────────────────────────────── */
    'today.eyebrow': 'วันนี้',
    'today.cta': 'เริ่ม 10 นาที',
    'today.cta-lanjut': 'เรียนต่อ',
    'today.cta-kenalan': 'หาระดับของคุณก่อน',
    'today.isi-judul': 'เนื้อหาของรอบนี้',
    'today.ringkas': '{soal} ข้อ · ราว {menit} นาที',
    'today.streak': 'ต่อเนื่อง {days} วัน',
    'today.streak-kosong': 'ยังไม่มีสตรีค',
    'today.selesai-judul': 'รอบของวันนี้เสร็จแล้ว',
    'today.selesai-body': 'หยุดตรงนี้ได้เลย ถ้ายังอยากเรียนต่อ อีกสักรอบก็ไม่เป็นไร',
    'today.selesai-cta': 'ฝึกเพิ่มอีกรอบ',
    'today.belum-kenal': 'FIEZEL ยังไม่รู้ระดับของคุณ ข้อสั้น ๆ แปดถึงสิบสองข้อก็พอแล้ว',
    'today.blok-kosong': 'รอบแรกของคุณ: คำศัพท์และไวยากรณ์พื้นฐาน',
    'today.judul-sapaan': 'สวัสดี {nama}',
    'today.aria-kartu': 'รอบเรียนของวันนี้',

    /* ── Tab Latihan ─────────────────────────────────────── */
    'latihan.judul': 'ฝึกฝน',
    'latihan.lead': 'เลือกเองได้เลยว่าอยากฝึกอะไร',
    'latihan.bicara-dengar': 'ฝึกพูดและฟัง',
    'latihan.bicara-dengar-note': 'ฟังแล้วออกเสียงตาม',
    'latihan.vocab-note': 'คำศัพท์และความหมาย',
    'latihan.grammar-note': 'การเรียงประโยค',
    'latihan.reading-note': 'ความเข้าใจในการอ่าน',
    'latihan.writing-note': 'เขียนประโยค',
    'latihan.library-note': 'อ่านตามใจชอบ',

    /* ── Ringkasan akhir sesi ──────────────────────────────── */
    'ringkas.judul': 'สรุปรอบนี้',
    'ringkas.naik': 'สิ่งที่ดีขึ้นวันนี้',
    'ringkas.naik-kosong': 'ยังไม่มีอะไรขึ้นมากพอจะบันทึก เป็นเรื่องปกติของรอบเดียว',
    'ringkas.besok': 'ครบกำหนดพรุ่งนี้',
    'ringkas.besok-kosong': 'พรุ่งนี้ไม่มีอะไรครบกำหนด',
    'ringkas.besok-item': 'มี {jumlah} เรื่องรอทบทวน',
    'ringkas.baris-naik': '{skill} เพิ่มขึ้น {delta} คะแนน',
    'ringkas.tutup': 'เสร็จแล้ว',
    'ringkas.aria': 'สรุปท้ายรอบเรียน',

    /* ── Tema (Tema Malam, m025-246) ───────────────────────── */
    'settings.tema-judul': 'การแสดงผล',
    'settings.tema-catatan': 'สว่าง กลางคืน หรือตามเครื่องของคุณ',
    'settings.tema-opsi-system': 'ตามเครื่อง',
    'settings.tema-opsi-light': 'สว่าง',
    'settings.tema-opsi-dark': 'กลางคืน',
    'settings.tema-toast': 'บันทึกการแสดงผลแล้ว',

    /* ── Skor speaking ──────────────────────────────────── */
    'speaking.cakupan-judul': 'ความครอบคลุมของคำ',
    'speaking.cakupan-penjelasan': 'ตัวเลขนี้นับว่าได้ยินคำเป้าหมายกี่คำ ไม่ได้วัดว่าคุณออกเสียงดีแค่ไหน',
    'speaking.cakupan-nilai': 'ได้ยิน {terdengar} จาก {total} คำ',

    /* ── Listening: audio gagal ───────────────────────────── */
    'listening.gagal-judul': 'ยังเล่นเสียงไม่ได้',
    'listening.gagal-body': 'สัญญาณอาจกำลังหนาแน่น เลือกอย่างใดอย่างหนึ่ง:',
    'listening.gagal-coba-lagi': 'ลองอีกครั้ง',
    'listening.gagal-lewati': 'ข้ามข้อนี้',
    'listening.gagal-tanpa-penalti': 'ข้อที่ข้ามเพราะเสียงไม่เล่นจะไม่ถูกให้คะแนน และรอบเรียนของคุณไม่ถูกล็อก',
    'listening.gagal-dilewati': 'ข้ามข้อนี้แล้ว คะแนนของคุณไม่ได้รับผลกระทบ',

    /* ── Edge case iOS: penyimpanan bisa hilang setelah 7 hari ──────── */
    'settings.cadangan-judul': 'ความคืบหน้ายังไม่ได้สำรองไว้',
    'settings.cadangan-body': 'บน iPhone และ iPad ซาฟารีอาจลบข้อมูลของเว็บแอปที่ไม่ได้เปิดนาน 7 วัน เข้าสู่ระบบไว้ ความคืบหน้าของคุณจะได้ยังอยู่',
    'settings.cadangan-aksi': 'เข้าสู่ระบบ',
    'settings.cadangan-aman': 'ความคืบหน้าถูกสำรองไว้ในบัญชีแล้ว',

    /* ── Penempatan: jumlah soal jadi parameter ─────────────────── */
    'placement.lite-lead': '{jumlah} ข้อ เพื่อวัดความสามารถตั้งแต่ A1 ถึง C2',
    'placement.lite-hero': '{jumlah} ข้อ ราว {menit} นาที',
    'placement.lite-mulai': 'เริ่ม {jumlah} ข้อ',
    'placement.lite-isi': 'เนื้อหาเป็นไวยากรณ์และคำศัพท์รูปแบบพื้นฐานที่สุดของแต่ละระดับ A1 ถึง C2 และลำดับข้อจะสลับใหม่ทุกครั้งที่คุณเข้ามา เมื่อทำเสร็จ FIEZEL จะใช้ผลนี้เป็นจุดเริ่มต้น ไม่ใช่คำตัดสิน ระดับของคุณจะถูกปรับต่อไปเรื่อย ๆ จากรอบถัดไป',

    /* ── Edge case: gerbang akun saat offline ──────────────────── */
    'account.offline-lanjut': 'ไปต่อโดยไม่ใช้บัญชี',
    'account.offline-catatan': 'ตอนนี้ไม่มีสัญญาณ คุณเริ่มเรียนได้เลย แล้วค่อยเชื่อมบัญชีทีหลังก็ได้'
  });
}());
