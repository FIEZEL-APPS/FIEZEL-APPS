/**
 * FIEZEL · features/i18n/copy-th-google.js — COPY-MAP THAI, domain "masuk dengan Google".
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan sebaiknya
 * ditinjau penutur asli sebelum dianggap final. Ia dikirim SEKARANG, bukan ditunda, karena
 * alternatifnya adalah murid Thai melihat layar masuk berbahasa Indonesia — dan layar masuk
 * adalah layar pertama yang ia temui.
 *
 * KANON NADA th (sama dengan copy-th-quota.js):
 *   - bahasa Thai sehari-hari yang hangat, sudut pandang คุณ (murid) / เรา (aplikasi);
 *   - tanpa istilah mesin (เซิร์ฟเวอร์, โควตา, โทเคน);
 *   - tanpa menyalahkan murid — padanan "bukan kesalahanmu": ไม่ใช่ความผิดของคุณ;
 *   - setiap keadaan gagal berakhir pada SATU langkah berikutnya yang bisa dikerjakan.
 *
 * Kunci dan {placeholder} 1:1 dengan copy-id-google.js (kontrak tests/th-coverage-test.js).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    /* --- ajakan dan penjelasan ------------------------------------------------ */
    'google.judul': 'เข้าสู่ระบบด้วย Google',
    'google.penjelasan': 'เข้าสู่ระบบครั้งเดียว แล้วห้องเรียน งานที่ครูมอบหมาย และเพื่อน ๆ ของคุณจะตามไปกับคุณทุกเครื่องที่ใช้',
    'google.atau': 'หรือ',
    'google.pakai-akun-fiezel': 'ยังไม่มีบัญชี Google ใช่ไหม ใช้บัญชี FIEZEL ก็ได้เหมือนกัน',
    'google.menyiapkan': 'กำลังเตรียมปุ่ม Google…',
    'google.email-untuk-sekolah': 'เราเก็บอีเมลของคุณไว้เพื่อให้โรงเรียนหรือผู้ปกครองติดต่อได้เมื่อจำเป็น ไม่ได้นำไปใช้ทำอย่างอื่น',

    /* --- keadaan berhasil ----------------------------------------------------- */
    'google.status-masuk': 'คุณเข้าสู่ระบบด้วย Google ในชื่อ {email} แล้ว',
    'google.toast-berhasil': 'เข้าสู่ระบบด้วย Google สำเร็จแล้ว',
    'google.toast-tertaut': 'เชื่อมบัญชี Google ของคุณแล้ว ต่อจากนี้คุณเรียนต่อจากเครื่องอื่นได้เลย',

    /* --- keadaan gagal -------------------------------------------------------- */
    'google.gagal': 'ยังเข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองอีกครั้งนะ ไม่ใช่ความผิดของคุณ',
    'google.gagal-muat': 'ยังโหลดปุ่ม Google ไม่ขึ้น เข้าสู่ระบบด้วยบัญชี FIEZEL ด้านล่างไปก่อนนะ',
    'google.gagal-jaringan': 'การเชื่อมต่อหลุดกลางทาง ลองอีกครั้งเมื่ออินเทอร์เน็ตของคุณกลับมาปกติแล้วนะ',
    'google.belum-aktif': 'ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google ในแอปนี้',
    'google.terlalu-cepat': 'เร็วเกินไปนิดนะ รอสักครู่แล้วลองใหม่อีกครั้ง',
    'google.server-sibuk': 'ตอนนี้ยังตอบให้ไม่ได้ อีกสักครู่ลองใหม่อีกครั้งนะ',
    'google.sudah-tertaut': 'บัญชี FIEZEL นี้เชื่อมกับบัญชี Google อื่นอยู่แล้ว ออกจากระบบก่อน แล้วเข้าใหม่ด้วยบัญชี Google นั้นนะ',
    'google.email-belum-terverifikasi': 'อีเมลของบัญชี Google นั้นยังไม่ได้รับการยืนยันจาก Google จึงยังใช้เข้าสู่ระบบไม่ได้',
    /* m025-367 · หน้าจอเข้าสู่ระบบ: ยินดีต้อนรับ · เข้าสู่ระบบ · สมัคร */
    'auth.layar.aktifkan': 'เปิดใช้บัญชีครู',
    'auth.layar.aktifkan-singkat': 'เปิดใช้บัญชี',
    'auth.layar.atau-akun': 'หรือใช้บัญชี FIEZEL',
    'auth.layar.atau-buat': 'หรือสร้างบัญชี FIEZEL',
    'auth.layar.belum-akun': 'ยังไม่มีบัญชีใช่ไหม?',
    'auth.layar.belum-guru': 'ครูใหม่ใช่ไหม?',
    'auth.layar.daftar': 'สมัคร',
    'auth.layar.demo-guru': 'ดูตัวอย่างห้องครู',
    'auth.layar.galat-beda': 'รหัสผ่านทั้งสองช่องยังไม่ตรงกัน',
    'auth.layar.galat-bukan-guru': 'บัญชีนี้เป็นบัญชีนักเรียน เลือกแท็บนักเรียนเพื่อเข้าสู่ระบบ',
    'auth.layar.galat-cepat': 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่',
    'auth.layar.galat-kode-kelas': 'รหัส KelasKu ขึ้นต้นด้วย FZ- ตามด้วยตัวอักษรหรือตัวเลขหกตัว เช่น FZ-AB2C3D',
    'auth.layar.galat-kode-kosong': 'กรอกรหัสเชิญจากผู้ดูแล FIEZEL',
    'auth.layar.galat-kosong': 'กรอกชื่อผู้ใช้และรหัสผ่าน',
    'auth.layar.galat-kredensial': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'auth.layar.galat-nama': 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข จุด ขีดล่าง หรือขีดกลาง',
    'auth.layar.galat-nama-dipakai': 'ชื่อผู้ใช้นี้มีคนใช้แล้ว ลองชื่ออื่น',
    'auth.layar.galat-offline': 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต การเข้าสู่ระบบต้องใช้อินเทอร์เน็ตแค่ครั้งเดียว',
    'auth.layar.galat-sandi': 'ใช้รหัสผ่านนี้ไม่ได้ ลองรหัสผ่านอื่น',
    'auth.layar.galat-sandi-mudah': 'รหัสผ่านนี้เดาง่ายเกินไป เลือกรหัสอื่น',
    'auth.layar.galat-server': 'ยังติดต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกสักครู่',
    'auth.layar.galat-sudah-ada': 'อุปกรณ์นี้มีบัญชีอยู่แล้ว เข้าสู่ระบบด้วยบัญชีนั้น',
    'auth.layar.galat-umum': 'ยังไม่สำเร็จ ลองอีกครั้งนะ',
    'auth.layar.galat-undangan': 'รหัสเชิญใช้ไม่ได้หรือถูกใช้ไปแล้ว',
    'auth.layar.google-diblokir': 'โหลดปุ่ม Google ในเครือข่ายนี้ไม่ได้ ใช้บัญชี FIEZEL ด้านล่างแทน',
    'auth.layar.guru': 'ครู',
    'auth.layar.guru-daftar-hint': 'บัญชีครูสร้างด้วยรหัสเชิญจากผู้ดูแล FIEZEL',
    'auth.layar.guru-masuk-hint': 'เข้าสู่ระบบด้วยบัญชีครูที่คุณเปิดใช้แล้ว',
    'auth.layar.kata-sandi': 'รหัสผ่าน',
    'auth.layar.kode-kelasku': 'รหัส KelasKu',
    'auth.layar.kode-undangan': 'รหัสเชิญ',
    'auth.layar.lanjut': 'ต่อไป',
    'auth.layar.lihat-sandi': 'แสดงรหัสผ่าน',
    'auth.layar.lupa': 'ลืมรหัสผ่าน?',
    'auth.layar.lupa-guru': 'ติดต่อผู้ดูแล FIEZEL เพื่อตั้งรหัสผ่านครูใหม่',
    'auth.layar.lupa-murid': 'ยังไม่มีการกู้คืนอัตโนมัติ เข้าสู่ระบบด้วย Google หากบัญชีของคุณเชื่อมไว้ หรือขอความช่วยเหลือจากครู',
    'auth.layar.masuk': 'เข้าสู่ระบบ',
    'auth.layar.memproses': 'กำลังดำเนินการ…',
    'auth.layar.murid': 'นักเรียน',
    'auth.layar.nama-pengguna': 'ชื่อผู้ใช้',
    'auth.layar.opsional': '(ไม่บังคับ)',
    'auth.layar.peran-aria': 'เข้าสู่ระบบในฐานะ',
    'auth.layar.selamat-datang': 'ยินดีต้อนรับ',
    'auth.layar.sudah-akun': 'มีบัญชีแล้วใช่ไหม?',
    'auth.layar.sudah-guru': 'มีบัญชีครูแล้วใช่ไหม?',
    'auth.layar.ulangi-sandi': 'ยืนยันรหัสผ่าน',
    'auth.layar.welcome-lead': 'เรียนภาษาอังกฤษและภาษาญี่ปุ่นกับ PAW เข้าสู่ระบบครั้งเดียว ความคืบหน้าของคุณตามไปทุกเครื่อง'
  });
}());
