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
    'google.email-belum-terverifikasi': 'อีเมลของบัญชี Google นั้นยังไม่ได้รับการยืนยันจาก Google จึงยังใช้เข้าสู่ระบบไม่ได้'
  });
}());
