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
    'nav.home-primary-aria': 'วันนี้ สิ่งที่ต้องเน้นวันนี้',
    'nav.progress': 'คืบหน้า',
    'nav.progress-aria': 'แผนที่ CEFR และระดับความชำนาญ',
    'nav.profile': 'โปรไฟล์',
    'nav.profile-aria': 'โปรไฟล์ผู้เรียนและเพื่อน',
    'nav.game': 'เกม',
    'nav.game-aria': 'อาร์เคดและความท้าทาย',

    /* ── Home "Hari ini" ───────────────────────────────────── */
    'today.eyebrow': 'วันนี้',
    'today.cta': 'เริ่ม {menit} นาที',
    'today.cta-lanjut': 'เรียนต่อ',
    'today.cta-kenalan': 'หาระดับของคุณก่อน',
    'today.cta-tes-awal': 'เริ่มแบบทดสอบแรก · ประมาณ {menit} นาที',
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
    /* SLOT 13: การ์ดทางเข้าเวทีเสียงสดในแท็บฝึกฝน (คู่ไทยของ copy-id-redesign.js) */
    'latihan.panggung': 'เวทีเสียงสด (เรียนคู่)',
    'latihan.panggung-note': 'พูดคุยสองทางและเล่นเกมคำ',

    /* ── Ringkasan akhir sesi ──────────────────────────────── */
    'ringkas.judul': 'สรุปรอบนี้',
    'ringkas.naik': 'สิ่งที่ดีขึ้นวันนี้',
    'ringkas.naik-kosong': 'ยังไม่มีอะไรขึ้นมากพอจะบันทึก เป็นเรื่องปกติของรอบเดียว',
    'ringkas.besok': 'ครบกำหนดพรุ่งนี้',
    'ringkas.kalibrasi': 'ความมั่นใจของเธอแม่นแค่ไหน',
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
    'account.offline-catatan': 'ตอนนี้ไม่มีสัญญาณ คุณเริ่มเรียนได้เลย แล้วค่อยเชื่อมบัญชีทีหลังก็ได้',

    /* ── SUMBU BAHASA (m025-314) ────────────────────────────────
       Padanan satu-satu dari blok penutup copy-id-redesign.js. Nama skill sengaja
       PENDEK: keenamnya duduk di kartu selebar setengah layar 360 px, dan terjemahan
       yang benar tapi panjang akan terpotong — sama rusaknya dengan tidak diterjemahkan. */
    'skill.vocab': 'คำศัพท์',
    'skill.grammar': 'ไวยากรณ์',
    'skill.reading': 'การอ่าน',
    'skill.writing': 'การเขียน',
    'skill.listening': 'การฟัง',
    'skill.speaking': 'การพูด',

    'home.sapaan-runtun-aktif': 'ต่อเนื่อง {hari} วันแล้ว! วันนี้ไปต่ออีก {menit} นาทีไหม',
    'home.sapaan-selesai': 'ต่อเนื่อง {hari} วันแล้ว! รอบของวันนี้เสร็จแล้ว เก่งมาก {nama}',
    'home.sapaan-selesai-baru': 'รอบของวันนี้เสร็จแล้ว เก่งมาก {nama}!',
    'home.paw-avatar-aria': 'มาสคอต PAW',
    'home.paw-bubble-title': 'PAW บอกว่า',
    'home.ritme-harian': 'จังหวะประจำวัน',
    'home.ritme-harian-hitung': '({selesai}/{target} ข้อ)',
    'home.latihan-singkat': 'ฝึกสั้น ๆ',
    'home.chip-vocab-sub': 'การ์ดเร็ว 10 ใบ',
    'home.chip-grammar-sub': 'รูปประโยค',
    'home.chip-dengar': 'ฟัง',
    'home.chip-dengar-sub': 'เสียงสั้น ๆ',
    'home.classroom-eyebrow': 'เร็ว ๆ นี้',
    'home.classroom-card': 'ห้องเรียนของฉัน',

    'latihan.lanjut-eyebrow': 'ทำต่อจากล่าสุด · ระดับ {level}',
    'latihan.lanjut-sub': 'เรียนบทนี้ให้จบเพื่อยืนยันความเข้าใจของคุณ',
    'latihan.booster-tag': 'AI Booster',
    'latihan.booster-sub': 'ความแม่นยำ {akurasi}% · แนะนำให้ฝึก {menit} นาที',
    'latihan.booster-tag-tertukar': 'มักสับสนกัน',
    'latihan.booster-sub-tertukar': '{persen}% ของข้อผิดพลาดตรงนี้ใช้กฎของ {lawan} มาฝึกแยกความต่างกัน',
    'latihan.booster-cta': 'ฝึก',

    'flash.suara-belum-ada': 'ยังไม่มีเสียงสำหรับ{bahasa} เราจึงซ่อนปุ่มฟังไว้ก่อน เพื่อไม่ให้คุณจำคำอ่านที่ผิดไป',
    'today.quiz_suffix': 'ข้อ',
    'today.start_practice_btn': 'เริ่มฝึกฝนตอนนี้ ➔',
    'today.vocab_suffix': 'คำศัพท์',
    'splash.tagline_for_teacher': 'สำหรับครู',
    /* m025-375 (OWNER 2026-09-26): panel Home saat hasil latihan masih mengumpulkan jawaban. */
    'home.bukti-judul': 'ยังประเมินผลการฝึกของคุณไม่ได้',
    'home.bukti-isi': 'ทำอีก {sisa} ข้อ เพื่อให้ FIEZEL ประเมินผลการฝึกของคุณได้อย่างแม่นยำ',
    'home.bukti-hitung': 'เก็บคำตอบแล้ว {n}/{target} ข้อ',
    'home.bukti-cta': 'ฝึกต่อ',
    'home.bukti-aria': 'ความคืบหน้าการเก็บคำตอบเพื่อประเมินผลการฝึก',
    /* Audit UI/UX Home 2026-09-27 (m025-376): teks kartu Home dipindah dari app.js; angkanya kini dihitung. */
    'home.sapa': 'สวัสดี {nama}!',
    'home.motivasi-kembali': 'หายไปไหนมา คิดถึงจัง! มาฝึกกันต่อเพื่อรักษาจังหวะการเรียนรู้นะ 🔥',
    'home.motivasi-2': 'เรียนทีละนิดทุกวัน ได้ผลกว่าเรียนหนักรวดเดียวสัปดาห์ละครั้ง มาเริ่มกันเลย! 💪',
    'home.motivasi-3': 'แค่ 10 นาทีวันนี้ ช่วยรักษาจังหวะการเรียนให้ยอดเยี่ยม อย่าเพิ่งผัดวันประกันพรุ่งนะ! 🚀',
    'home.motivasi-4': 'ก้าวเล็ก ๆ ที่สม่ำเสมอในวันนี้ คือการก้าวกระโดดที่ยิ่งใหญ่ในวันพรุ่งนี้ ⭐',
    'home.motivasi-5': 'คำศัพท์ใหม่ทุกคำที่คุณเรียนรู้ จะเปิดโอกาสใหม่ ๆ ในอนาคต สู้ ๆ นะ! 🌟',
    'home.motivasi-6': 'การเดินทางนับพันไมล์เริ่มต้นจากก้าวเล็ก ๆ ก้าวแรกเสมอ เดินหน้าต่อไป! 🌸',
    'home.kartu-level': 'ระดับ {level}',
    'home.kartu1-kicker': '📖 คำศัพท์วันนี้',
    'home.kartu1-soal': '{n} ข้อ',
    'home.kartu1-menit': '± {n} นาที',
    'home.kartu1-cta-tes': 'เริ่มทำแบบทดสอบวัดระดับเลย',
    'home.hero-cta-mulai': 'เริ่มเรียนเลย',
    'home.hero-cta-lanjut': 'ทำภารกิจต่อ',
    'home.hero-cta-sub': '{soal} ข้อ · ±{menit} นาที · ฝึกได้ทันที',
    'home.aurora-target-title': 'เป้าหมายฝึกฝนหลากหลายทักษะ',
    'home.aurora-target-desc': 'การฝึกฝนแบบปรับตัวรวมไวยากรณ์ การอ่าน และคำศัพท์',
    'home.soal-selesai': 'ข้อเสร็จแล้ว',
    'home.latihan-soal-title': 'ฝึกทำโจทย์',
    'home.latihan-soal-sub': 'ทุกโมดูล',
    'kelasku.strip-tugas-aktif': 'งานที่มอบหมาย',
    'kelasku.strip-latihan-materi': 'แบบฝึกหัดและเนื้อหาในชั้นเรียน',
    'kelasku.strip-sinkron-guru': 'การซิงโครไนซ์หลักสูตรและครู',
    'home.kartu2-kicker': '📖 แฟลชการ์ดและทบทวนซ้ำ',
    'home.kartu2-judul': 'คำศัพท์ประจำวัน',
    'home.kartu2-isi-baru': 'ฝึกคำศัพท์ระดับ {level} ด้วยการ์ดทบทวนซ้ำ (SRS) เพื่อจดจำได้นานขึ้น',
    'home.kartu2-isi': 'คุณฝึกคำศัพท์ระดับ {level} ไปแล้ว {n} คำ คำที่ใกล้ลืมจะขึ้นมาก่อน',
    'home.kartu2-kata': 'ฝึกแล้ว {n} คำ',
    'home.kartu2-jatuh-tempo': 'ต้องทบทวนวันนี้',
    'home.kartu2-cta': 'เปิดคำศัพท์ประจำวัน',
    'home.kartu3-kicker': '📊 พัฒนาการเรียนรู้',
    'home.kartu3-judul': 'พัฒนาการสัปดาห์นี้',
    'home.kartu3-isi-naik': 'ความแม่นยำของคุณเพิ่มขึ้น {delta} จุดจากสัปดาห์ที่แล้ว รักษาจังหวะไว้นะ!',
    'home.kartu3-isi-turun': 'ความแม่นยำของคุณลดลง {delta} จุดจากสัปดาห์ที่แล้ว ฝึกสั้น ๆ วันนี้จะช่วยให้กลับมาได้',
    'home.kartu3-isi-stabil': 'ความแม่นยำของคุณคงที่เมื่อเทียบกับสัปดาห์ที่แล้ว ฝึกต่อไปเพื่อขึ้นระดับ',
    'home.kartu3-isi-kurang': 'ตอบอย่างน้อย {min} ข้อในสัปดาห์นี้และสัปดาห์หน้า เพื่อให้เปรียบเทียบพัฒนาการของคุณได้',
    'home.kartu3-akurasi': 'ความแม่นยำ {n}%',
    'home.kartu3-akurasi-kosong': 'ความแม่นยำ —',
    'home.kartu3-perubahan': 'จุด เทียบสัปดาห์ที่แล้ว',
    'home.kartu3-runtun': '🔥 {n} วัน',
    'home.kartu3-cta': 'ดูรายละเอียดพัฒนาการ',
    'home.bukti-materi': 'บทเรียน: {materi}',
    /* ── Dynamic Habit-Forming Hero (th) ── */
    'home.sapaan-fajar': 'สวัสดี {nama}! เริ่มวันด้วยการมุ่งมั่น {menit} นาที',
    'home.sapaan-siang': 'สวัสดี {nama}! เวลาที่เหมาะสมสำหรับการฝึกฝน',
    'home.sapaan-senja': 'สวัสดี {nama}! รักษาจังหวะการเรียนรู้วันนี้',
    'home.sapaan-malam': 'สวัสดี {nama}! ปิดวันด้วยการทบทวน',
    'home.mood-fajar': 'เช้าไฟ',
    'home.mood-siang': 'กลางวันโฟกัส',
    'home.mood-senja': 'เย็นสติ',
    'home.mood-malam': 'รีวิว',
    'home.streak-badge-aktif': '🔥 ต่อเนื่อง {hari} วัน',
    'home.streak-badge-baru': '🔥 เริ่มรันวันนี้',
    'home.misi-adaptif-rekomendasi': 'ภารกิจต่อไป',
    'home.misi-adaptif-sub': 'ฝึกแนวคิดสำคัญ • ประมาณ {menit} นาที',
    'home.ritual-anchor-title': 'จังเกอร์พิธีกรรมวันนี้',
    'home.ritual-target-1': 'เปิดเนื้อหา & สวัสดีติวเตอร์',
    'home.ritual-target-2': 'ทำ {target} ข้อ ({selesai}/{target})',
    'home.ritual-target-3': 'ฝึก "{kata}" ({due} รอบ)',
    'home.percaya-diri-quote': 'คุณใกล้จะเข้าใจแนวคิดนี้มากขึ้น',
    /* ── FIEZEL NUJUM (The Ruthless Mentor) ────────────────────────────────── */
    'nujum.status_broken': 'สถานะ: บันทึกการหักล้างคำทำนายลงในสมุดชัยชนะของคุณแล้ว',
    'nujum.next_duel': 'ดำเนินการดวลถัดไป →',
    'nujum.dispute_claim': '⚡ คัดค้านคำทำนาย (พิสูจน์ 3 ข้อ)',
    'nujum.accept_next': 'ยอมรับและไปรอบถัดไป →',
    'nujum.teleport_practice': 'ฝึกฝนบทเรียนนี้ตอนนี้ (โหมดฝึกฝน) →',
    'nujum.next_round': 'ดำเนินการรอบดวลถัดไป →',
    'nujum.cancel_dispute': 'ยกเลิกการคัดค้าน',
    'nujum.start_dispute': 'เริ่มการพิสูจน์ 3 ข้อ →',
    'nujum.dispute_status_revoked': 'สถานะ: ถอนฉลากความเข้าใจผิดออกจากบัญชีของคุณแล้ว',
    'nujum.dispute_status_failed': 'สถานะ: ข้อกล่าวหาของระบบยังคงอยู่ เข้าสู่ห้องฝึกฝนและฝึกฝนรูปแบบนี้',
    'nujum.surrender_unclear': 'ยังไม่เข้าใจ?',
    'nujum.surrender_learn': 'ยอมแพ้และเรียนรู้',
    'nujum.speech_unsupported': 'เบราว์เซอร์นี้ไม่รองรับไมโครโฟน Web Speech API โปรดใช้ปุ่มคำด้านล่าง',
    'nujum.empty_victories': 'ยังไม่มีการเดิมพันที่ถูกหักล้างในเซสชันนี้',
    'nujum.return_home': 'กลับสู่หน้าหลัก',
    'nujum.home_cta': 'เข้าสู่สังเวียนเดิมพันเสียง →',
    /* ── BUG × Sarang (th) ── */
    'bug.hp': 'HP {hp}%',
    'bug.mengincar': 'กำลังเล็ง',
    'bug.belum-ketahuan': 'ยังไม่ถูกพบ',
    'bug.whisper-pulih': '{nama} ฟื้น +{hp} HP ระหว่างที่เธอหายไป',
    'bug.whisper-siaga': 'บั๊กฟื้นเร็วเท่าที่เธอลืม ล่ามันก่อนจะอ้วน',
    'bug.whisper-kosong': 'ตอบ 5 ข้อ — บั๊กตัวแรกของเธอจะโผล่มา',
    'bug.sub': 'มีบั๊ก {n} ตัวอยู่ในหัวเธอ',
    'bug.sub-kosong': 'หัวของเธอยังไม่ถูกทำแผนที่',
    'bug.sarang': 'รัง',
    'bug.fosil-n': 'ฟอสซิล {n}',
    'bug.cta': 'ล่าบั๊ก 5 ตัววันนี้',
    'bug.cta-sub': '· 5 รอบ · 8 วินาที · {nama} กำลังเล็ง',
    'bug.cta-sub-kosong': '· 5 รอบ · ค้นหาบั๊กตัวแรกของเธอ',
    'bug.memuat': 'กำลังดมกลิ่นบั๊ก…',
    'bug.kosong': 'คลังข้อสอบยังไม่โหลด ลองอีกครั้งสักครู่',
    'bug.kembali': 'กลับไปที่รัง',
    'bug.beat-who': 'บั๊กกำลังเล็ง',
    'bug.beat-lock': 'กำลังล็อกเป้า…',
    'bug.beat-hint': 'โอกาสที่เธอจะถูกกัด ตามที่ {nama} คิด',
    'bug.kegigit': 'ถูกกัด',
    'bug.ronde': 'รอบ {n}',
    'bug.umpan': 'เหยื่อ 2×',
    'bug.detik': 'วินาที',
    'bug.paw-bantu': 'PAW ช่วยด้วย!',
    'bug.umpan-aktif': 'เหยื่อทำงาน · ผล 2×',
    'bug.benar': 'ถูก',
    'bug.kamu': 'เธอ',
    'bug.hp-nama': 'HP {nama}',
    'bug.paw-tag': 'PAW เข้าช่วย · ไม่มีการแซว',
    'bug.jawabannya': 'คำตอบคือ',
    'bug.pecah-tag': 'บั๊กแตก · คำทาย {bet}% พลาด',
    'bug.umpan-berhasil': 'เหยื่อ 2× สำเร็จ',
    'bug.digigit-tag': 'ถูกกัด · {nama} ชนะพนัน',
    'bug.berikutnya': 'บั๊กตัวถัดไป →',
    'bug.lihat-laporan': 'ดูรายงานการล่า →',
    'bug.v-sempurna': 'สมบูรณ์แบบ',
    'bug.v-pemburu': 'นักล่า',
    'bug.v-bertahan': 'ยืนหยัด',
    'bug.v-habis': 'ถูกกัดจนหมด',
    'bug.laporan': 'รายงานการล่า',
    'bug.sarang-nama': 'รังของ {nama}',
    'bug.rekap': 'บั๊กแตก {p} · หลุด {g}',
    'bug.rekap-bantu': 'PAW ช่วย {n}',
    'bug.akurasi': 'ความแม่น',
    'bug.pecah': 'แตก',
    'bug.gigitan': 'ถูกกัด',
    'bug.menggigit': 'กัด',
    'bug.dibantu': 'PAW ช่วย',
    'bug.bagikan': 'แชร์ไป WHATSAPP',
    'bug.share-teks': 'รังของฉันวันนี้: บั๊กแตก {p} หลุด {g} กล้าล่าบั๊กของตัวเองไหม? fiezel.my.id #BuruBug',
    'bug.tersimpan': 'บันทึกรูปรายงานแล้ว — ส่งให้กลุ่มห้องเลย!',
    // m025-454 Gelombang 1 audit kabel BrainCore: bahasa murid, tanpa istilah mesin, tanpa tanda pisah.
    'bc.aria': 'คำแนะนำจาก Braincore สำหรับวันนี้',
    'bc.judul': 'Braincore บอกอะไรวันนี้',
    'bc.arah-naik': 'ก้าวของคุณคล่องขึ้นแล้ว! วันนี้มาเก็บให้เรียบร้อย: {fokus}',
    'bc.arah-datar': 'คุณทำได้สม่ำเสมอแล้ว วันนี้มาดันต่ออีกนิด: {fokus}',
    'bc.arah-turun': 'ค่อย ๆ ไปนะ วันนี้มาทบทวนให้แน่นอีกครั้ง: {fokus}',
    'bc.arah-baru': 'มาเริ่มกันเลย! วันนี้เราจะฝึก: {fokus}',
    'bc.pudar-kata': 'คำ {n} คำนี้เริ่มเลือนจากความจำแล้ว: {daftar}',
    'bc.segarkan': 'ทบทวนตอนนี้',
    'bc.tertukar': 'มักสลับกัน: {a} กับ {b}',
    'bc.perbaiki': 'แก้ที่พื้นฐาน',
    'bc.bukti-judul': 'หลักฐานว่าคุณเก่งขึ้น',
    'bc.bukti-cepat': 'คุณตอบเร็วขึ้น {kali} เท่าเมื่อเทียบกับสัปดาห์ที่แล้ว',
    'bc.bukti-stabil': 'ความเร็วในการตอบของคุณคงที่เมื่อเทียบกับสัปดาห์ที่แล้ว',
    'bc.bukti-melekat': 'คำที่เรียนแล้ว {persen}% ยังจำได้แม่น',
    'bc.bukti-naik': 'ความแม่นยำของคุณเพิ่มขึ้น {poin} คะแนนตั้งแต่เริ่มฝึก',
    'bc.bukti-kosong': 'ทำอีกสักสองสามรอบ แล้วหลักฐานจะขึ้นที่นี่',
    'bc.fokus-pasangan': 'โฟกัสตอนนี้: แยก {a} กับ {b} ให้ออก',
    'bc.fokus-materi': 'โฟกัสตอนนี้: {materi}',

    /* ── Game Hub Arcade ────────────────────────────────────────────────────── */
    'game.title': 'อาร์เคดและเกม',
    'game.subtitle': 'ท้าทายทักษะภาษาผ่านมินิเกมแสนสนุก',
    'game.streak-label': 'สตรีคเกม',
    'game.days-unit': 'วัน',
    'game.trophy-label': 'ถ้วยรางวัลอารีนา',
    'game.mastery-label': 'ระดับความชำนาญ',
    'game.arena-kicker': 'โหมดดวลสุดมันส์',
    'game.arena-live': 'ผู้เล่นพร้อม',
    'game.paw-arena-title': 'PAW ARENA',
    'game.paw-arena-desc': 'ท้าบอทหรือเพื่อน: ทายความหมาย ต่อคำ และชิงถ้วยรางวัล!',
    'game.paw-arena-cta': 'เริ่มดวลอารีนา',
    'game.mode-story': 'Story Chain',
    'game.mode-signal': 'สัญญาณแม่นยำ',
    'game.mode-stakes': 'เดิมพันแต้ม',
    'game.section-title': 'เลือกสนามประลอง',
    'game.section-sub': 'เลือกโหมดเกมที่คุณชื่นชอบเพื่อฝึกฝนอย่างเพลิดเพลิน',
    'game.bubble-badge': 'ความเร็ว',
    'game.bubble-title': 'Mochi Crunch',
    'game.bubble-desc': 'จับคู่คำศัพท์แบบรวดเร็วพร้อมเอฟเฟกต์โมจินุ่มหนึบ',
    'game.play-cta': 'เล่นเลย',
    'game.puzzle-badge': 'ไวยากรณ์',
    'game.puzzle-title': 'Sentence Puzzle',
    'game.puzzle-desc': 'ต่อชิ้นส่วนคำให้เป็นประโยคที่สมบูรณ์แบบไร้ที่ติ',
    'game.puzzle-cta': 'ต่อประโยค',
    'game.voice-badge': 'การออกเสียง',
    'game.voice-title': 'เวทีเสียงสด',
    'game.voice-desc': 'ทดสอบการออกเสียงและจังหวะการพูดสดบนเวทีเสียง',
    'game.stage-cta': 'เปิดเวที',
    'game.nujum-badge': 'เมนเทอร์สุดโหด',
    'game.nujum-title': 'NUJUM',
    'game.nujum-desc': 'คุยกับเมนเทอร์จอมเข้มงวดที่พร้อมชี้จุดผิดแบบตรงไปตรงมา',
    'game.nujum-cta': 'เผชิญหน้ากับ NUJUM'
  });
}());
