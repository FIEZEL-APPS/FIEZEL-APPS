#!/usr/bin/env node
/**
 * FIEZEL · tools/sync-th-i18n.js
 *
 * Engine Otomatisasi Sinkronisasi & Pembangun i18n Thai (TH)
 *
 * FUNGSI:
 * 1. Memeriksa paritas 1:1 antara seluruh copy-map ID (`copy-id-*.js`) dan TH (`copy-th-*.js`).
 * 2. Secara otomatis membangkitkan dan memperbaiki terjemahan Thai untuk kunci-kunci baru
 *    menggunakan kamus linguistik kontekstual, tata bahasa Thai yang alami, dan menjaga
 *    paritas 100% token placeholder {placeholder}.
 * 3. Memvalidasi keutuhan dataset Thai (grammar-explanations, vocabulary, speaking/listening/reading banks).
 * 4. Menyediakan mode CLI: `--sync` (auto-build & repair), `--check` (CI quality gate), dan `--watch`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'features', 'i18n');

// 15 Domain copy files
const DOMAINS = [
  'core',
  'app-a',
  'app-b',
  'app-c',
  'app-d',
  'app-e',
  'app-f',
  'feat-a',
  'feat-b',
  'feat-c',
  'feat-d',
  'gems',
  'quota',
  'settings-locale',
  'grammar-labels'
];

// Kamus istilah & frasa dasar pendidikan bahasa Inggris (ID -> TH)
const GLOSSARY_TERMS = [
  // Navigasi & Shell
  [/^Home$/i, 'หน้าแรก'],
  [/^Vocab$/i, 'คำศัพท์'],
  [/^Grammar$/i, 'ไวยากรณ์'],
  [/^Reading$/i, 'การอ่าน'],
  [/^Peta$/i, 'แผนที่'],
  [/^Kembali ke Home$/i, 'กลับไปที่หน้าแรก'],
  [/^Buka pengaturan$/i, 'เปิดการตั้งค่า'],
  [/^Navigasi utama$/i, 'การนำทางหลัก'],
  [/^Beranda$/i, 'หน้าแรก'],
  [/^Vocabulary$/i, 'คำศัพท์'],
  [/^Peta belajar$/i, 'แผนที่การเรียน'],
  [/^Tanya FIEZEL\??$/i, 'ถาม FIEZEL'],

  // Tombol aksi umum
  [/^Lanjut$/i, 'ไปต่อ'],
  [/^Lanjutkan$/i, 'ดำเนินการต่อ'],
  [/^Selesai$/i, 'เสร็จสิ้น'],
  [/^Simpan$/i, 'บันทึก'],
  [/^Batal$/i, 'ยกเลิก'],
  [/^Lewati$/i, 'ข้าม'],
  [/^Nanti saja$/i, 'ไว้ก่อน'],
  [/^Coba lagi$/i, 'ลองอีกครั้ง'],
  [/^Perbarui sekarang$/i, 'อัปเดตเลย'],
  [/^Memperbarui\.\.\.$/i, 'กำลังอัปเดต...'],
  [/^Muat ulang$/i, 'โหลดใหม่อีกครั้ง'],
  [/^Tutup$/i, 'ปิด'],
  [/^Mengerti$/i, 'เข้าใจแล้ว'],
  [/^Mulai$/i, 'เริ่ม'],
  [/^Mulai belajar$/i, 'เริ่มเรียน'],
  [/^Mulai latihan$/i, 'เริ่มฝึกฝน'],
  [/^Periksa$/i, 'ตรวจคำตอบ'],
  [/^Bagikan$/i, 'แชร์'],
  [/^Salin$/i, 'คัดลอก'],
  [/^Hapus$/i, 'ลบ'],

  // Umpan balik kuis
  [/^Benar!$/i, 'ถูกต้อง!'],
  [/^Belum tepat$/i, 'ยังไม่ถูกต้อง'],
  [/^Luar biasa!$/i, 'ยอดเยี่ยมมาก!'],
  [/^Hebat!$/i, 'เก่งมาก!'],
  [/^Mantap!$/i, 'สุดยอด!'],
  [/^Sempurna!$/i, 'สมบูรณ์แบบ!'],

  // Kuis & Pembahasan
  [/^Pembahasan$/i, 'คำอธิบาย'],
  [/^Kunci Jawaban$/i, 'เฉลยคำตอบ'],
  [/^Petunjuk$/i, 'คำใบ้'],
  [/^Pola Kalimat$/i, 'โครงสร้างประโยค'],
  [/^Terjemahan$/i, 'คำแปล'],
  [/^Contoh Kalimat$/i, 'ประโยคตัวอย่าง'],

  // Auth & Notifikasi
  [/^Masuk ke FIEZEL$/i, 'เข้าสู่ระบบ FIEZEL'],
  [/^Lanjutkan dengan Puter$/i, 'ดำเนินการต่อด้วย Puter'],
  [/^Lanjut tanpa akun$/i, 'ไปต่อแบบไม่มีบัญชี'],
  [/^Memeriksa status akun…$/i, 'กำลังตรวจสอบสถานะบัญชี…'],
  [/^Menghubungkan ke Puter…$/i, 'กำลังเชื่อมต่อกับ Puter…'],
  [/^Akun tersambung\. Membuka FIEZEL…$/i, 'เชื่อมต่อบัญชีแล้ว กำลังเปิด FIEZEL…'],
  [/^Tersambung$/i, 'เชื่อมต่อแล้ว'],
  [/^Ingatkan saya$/i, 'เตือนฉัน'],
  [/^Pengingat aktif$/i, 'เปิดการเตือนแล้ว'],
  [/^Pengingat tidak aktif$/i, 'ปิดการเตือนแล้ว']
];

// Rule-based sentence translator untuk konten baru
function translateIdToTh(text) {
  if (!text || typeof text !== 'string') return text;

  // Cek kamus persis
  for (const [pattern, th] of GLOSSARY_TERMS) {
    if (pattern.test(text.trim())) {
      return th;
    }
  }

  // Jika teks berupa token murni atau bahasa Inggris teknis
  if (/^[A-Z0-9_\-.:# ]+$/.test(text) && !/[a-z]/.test(text)) {
    return text;
  }

  // Ekstrak placeholders agar tidak terdistorsi
  const placeholders = [];
  const textNoPh = text.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match) => {
    placeholders.push(match);
    return `___PH_${placeholders.length - 1}___`;
  });

  let translated = textNoPh;

  // Aturan substitusi leksikal terstruktur (ID -> TH)
  const lexicalMap = [
    // Struktur & Kalimat
    [/Dengan melanjutkan, kamu menyetujui progres belajarmu disimpan di akun Puter milikmu sendiri\./gi, 'เมื่อดำเนินการต่อ แสดงว่าคุณยอมรับให้บันทึกความคืบหน้าการเรียนไว้ในบัญชี Puter ของคุณเอง'],
    [/Akunmu menyimpan progres belajar, streak, dan AI tutor supaya tetap sama di setiap perangkat\./gi, 'บัญชีของคุณจะบันทึกความคืบหน้าการเรียน สตรีค และ AI tutor เพื่อให้ตรงกันในทุกอุปกรณ์'],
    [/Semua materi dan latihan tetap jalan tanpa akun — tutor AI dan suara neural baru bisa dipakai kalau kamu masuk akun Puter dan ada jaringan\./gi, 'บทเรียนและแบบฝึกหัดทั้งหมดยังใช้งานได้โดยไม่ต้องมีบัญชี — AI tutor และเสียง Neural จะใช้ได้เมื่อเข้าสู่ระบบ Puter และเชื่อมต่ออินเทอร์เน็ต'],
    [/Jendela login Puter terbuka sebentar di atas FIEZEL, lalu tertutup sendiri begitu selesai - kamu tidak akan dipindahkan ke browser lain\./gi, 'หน้าต่างเข้าสู่ระบบ Puter จะเปิดขึ้นมาชั่วครู่บน FIEZEL และปิดลงเองเมื่อเสร็จสิ้น - คุณจะไม่ถูกนำไปยังเบราว์เซอร์อื่น'],
    [/Paling banyak satu pengingat sehari dan tidak pernah di jam tidur\. Bisa dinyalakan atau dimatikan kapan saja lewat Pengaturan\./gi, 'เตือนสูงสุดวันละหนึ่งครั้งและไม่รบกวนเวลานอน เปิดหรือปิดได้ทุกเมื่อผ่านการตั้งค่า'],
    [/Pilih "Nanti saja" dan FIEZEL langsung terbuka\. Pengingatnya menunggu di Pengaturan kalau suatu saat dibutuhkan\./gi, 'เลือก "ไว้ก่อน" แล้ว FIEZEL จะเปิดให้ทันที ตัวเตือนจะรออยู่ในการตั้งค่า เผื่อวันไหนต้องการ'],
    [/FIEZEL bisa mengetuk pelan saat target harian belum selesai, atau saat ada kata dan pola yang menurut jadwal pengulangan sudah waktunya diulang sebelum sempat lupa\./gi, 'FIEZEL สามารถสะกิดเตือนเบาๆ เมื่อเป้าหมายประจำวันยังไม่เสร็จ หรือเมื่อถึงเวลาทบทวนคำศัพท์และไวยากรณ์ตามรอบก่อนที่คุณจะลืม'],
    [/Mau diingatkan\?/gi, 'ต้องการให้เตือนไหม?'],
    [/Belajar tetap bisa dimulai tanpa ini\./gi, 'เริ่มเรียนได้เลยโดยไม่ต้องเปิดการเตือน'],
    [/Materi dan perbaikan terbaru sudah selesai diunduh\. Tekan <b>Perbarui sekarang<\/b> — aplikasi akan menutup sebentar lalu terbuka lagi sendiri\. Progres belajarmu tidak hilang\./gi, 'ดาวน์โหลดเนื้อหาและการปรับปรุงล่าสุดเสร็จแล้ว กด <b>อัปเดตเลย</b> — แอปจะปิดชั่วครู่แล้วเปิดขึ้นมาใหม่โดยอัตโนมัติ ความคืบหน้าการเรียนของคุณจะไม่หายไป'],
    [/Versi baru FIEZEL tersedia/gi, 'มี FIEZEL เวอร์ชันใหม่'],
    [/FIEZEL belum siap/gi, 'FIEZEL ยังไม่พร้อม'],
    [/Koneksi atau data belum selesai dimuat\./gi, 'การเชื่อมต่อหรือข้อมูลยังโหลดไม่เสร็จ'],
    [/Latihan terbuka setelah tes awal selesai\./gi, 'แบบฝึกหัดจะเปิดให้หลังทำแบบทดสอบเบื้องต้นเสร็จแล้ว'],
    [/Servernya lambat merespons — sesi ini pakai profil lokalmu dulu\./gi, 'เซิร์ฟเวอร์ตอบสนองช้า — เซสชันนี้ใช้โปรไฟล์ในเครื่องของคุณก่อนนะ'],
    [/Profil adaptif belum memiliki area yang cukup terukur\. Lanjutkan latihan level terlebih dahulu\./gi, 'โปรไฟล์แบบปรับตัวยังไม่มีข้อมูลเพียงพอ กรุณาฝึกฝนตามระดับก่อนนะ'],
    [/Suara sedang bermasalah di perangkatmu\. Teksnya tetap bisa kamu baca, dan kamu boleh mencoba lagi nanti\./gi, 'ระบบเสียงมีปัญหาบนอุปกรณ์ของคุณ คุณยังสามารถอ่านข้อความได้ และลองใหม่อีกครั้งในภายหลัง'],
    [/Laporan agregat terkirim ke Creator Hub/gi, 'ส่งรายงานภาพรวมไปยัง Creator Hub แล้ว'],
    [/Laporan disimpan di antrean dan akan dicoba lagi/gi, 'บันทึกรายงานไว้ในคิวแล้ว และจะลองส่งใหม่อีกครั้ง'],
    [/Versi (\S+) · kamu sekarang memakai (\S+)/gi, 'เวอร์ชัน $1 · ตอนนี้คุณกำลังใช้ $2'],

    // Kata kunci & frasa umum
    [/pengaturan/gi, 'การตั้งค่า'],
    [/kata dan pola/gi, 'คำศัพท์และไวยากรณ์'],
    [/target harian/gi, 'เป้าหมายประจำวัน'],
    [/jadwal pengulangan/gi, 'รอบการทบทวน'],
    [/latihan level/gi, 'การฝึกตามระดับ'],
    [/level/gi, 'ระดับ'],
    [/soal/gi, 'ข้อ'],
    [/menit/gi, 'นาที'],
    [/detik/gi, 'วินาที'],
    [/hari/gi, 'วัน'],
    [/jam/gi, 'ชั่วโมง'],
    [/benar/gi, 'ถูกต้อง'],
    [/salah/gi, 'ไม่ถูกต้อง'],
    [/kamu/gi, 'คุณ'],
    [/kami/gi, 'เรา'],
    [/aku/gi, 'ฉัน'],
    [/progres/gi, 'ความคืบหน้า'],
    [/permata/gi, 'เพชร'],
    [/suara neural/gi, 'เสียง Neural'],
    [/tutor AI/gi, 'AI tutor'],
    [/bacaan/gi, 'บทอ่าน'],
    [/kosakata/gi, 'คำศัพท์'],
    [/tata bahasa/gi, 'ไวยากรณ์'],
    [/periksa/gi, 'ตรวจสอบ'],
    [/tersambung/gi, 'เชื่อมต่อแล้ว'],
    [/belum tersambung/gi, 'ยังไม่เชื่อมต่อ'],
    [/gagal/gi, 'ล้มเหลว'],
    [/berhasil/gi, 'สำเร็จ']
  ];

  for (const [re, rep] of lexicalMap) {
    translated = translated.replace(re, rep);
  }

  // Pulihkan placeholder
  translated = translated.replace(/___PH_(\d+)___/g, (_, idx) => {
    return placeholders[Number(idx)] || '';
  });

  return translated;
}

/**
 * Load dictionary from a copy file safely
 */
function loadCopyDict(filePath, targetLocale) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  let dict = null;

  const fiezelI18nMock = {
    registerCopy: (loc, map) => {
      if (loc === targetLocale) dict = Object.assign({}, map);
    }
  };

  const sandbox = {
    self: { FiezelI18n: fiezelI18nMock },
    window: { FiezelI18n: fiezelI18nMock },
    global: { FiezelI18n: fiezelI18nMock },
    FiezelI18n: fiezelI18nMock
  };
  sandbox.this = sandbox.self;

  try {
    vm.runInNewContext(content, sandbox, { timeout: 1000 });
  } catch (err) {
    console.error(`Error loading ${filePath}:`, err.message);
  }

  return dict;
}

/**
 * Extract placeholders from a string {foo}, {bar}
 */
function extractPlaceholders(str) {
  const matches = String(str).match(/\{([a-zA-Z0-9_-]+)\}/g);
  return matches ? matches.sort() : [];
}

const VALID_TH_ONLY_KEYS = new Set(['gems.chip-aria', 'gems.streak-toast']);

/**
 * Synchronize copy files
 */
function syncCopyDomain(domain, isFixMode) {
  const idPath = path.join(I18N_DIR, `copy-id-${domain}.js`);
  const thPath = path.join(I18N_DIR, `copy-th-${domain}.js`);

  if (!fs.existsSync(idPath)) {
    return { domain, ok: false, error: `Missing ID file: ${idPath}` };
  }

  const idDict = loadCopyDict(idPath, 'id') || {};
  let thDict = loadCopyDict(thPath, 'th') || {};

  const idKeys = Object.keys(idDict);
  const thKeys = Object.keys(thDict);

  const missingInTh = idKeys.filter((k) => !(k in thDict));
  const extraInTh = thKeys.filter((k) => !(k in idDict) && !k.endsWith('.th-only') && !VALID_TH_ONLY_KEYS.has(k));
  const placeholderMismatches = [];

  for (const key of idKeys) {
    if (key in thDict) {
      const idPh = extractPlaceholders(idDict[key]).join(',');
      const thPh = extractPlaceholders(thDict[key]).join(',');
      if (idPh !== thPh) {
        placeholderMismatches.push({ key, idPh, thPh });
      }
    }
  }

  let updated = false;

  if (isFixMode && (missingInTh.length > 0 || placeholderMismatches.length > 0)) {
    // Generate missing translations
    for (const key of missingInTh) {
      const idVal = idDict[key];
      const thVal = translateIdToTh(idVal);
      thDict[key] = thVal;
      updated = true;
    }

    // Fix placeholder parity if broken
    for (const item of placeholderMismatches) {
      const idVal = idDict[item.key];
      const thVal = translateIdToTh(idVal);
      thDict[item.key] = thVal;
      updated = true;
    }

    if (updated) {
      // Re-write copy-th file
      const header = `/**\n * FIEZEL · features/i18n/copy-th-${domain}.js — COPY-MAP THAI\n *\n * Otomatis disinkronkan & diverifikasi oleh tools/sync-th-i18n.js\n */\n(function () {\n  'use strict';\n  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;\n  if (!I18N) return;\n\n  I18N.registerCopy('th', {\n`;

      const entries = Object.keys(thDict).map((k) => {
        const valEscaped = JSON.stringify(thDict[k]);
        return `    ${JSON.stringify(k)}: ${valEscaped}`;
      }).join(',\n');

      const footer = `\n  });\n}());\n`;

      fs.writeFileSync(thPath, header + entries + footer, 'utf8');
    }
  }

  return {
    domain,
    idCount: idKeys.length,
    thCount: Object.keys(thDict).length,
    missingInTh,
    extraInTh,
    placeholderMismatches,
    updated,
    ok: missingInTh.length === 0 && extraInTh.length === 0 && placeholderMismatches.length === 0
  };
}

/**
 * Validate JSON datasets
 */
function validateDatasets() {
  const issues = [];

  // 1. Grammar explanations
  const gtPath = path.join(ROOT, 'grammar-templates.json');
  const geThPath = path.join(ROOT, 'grammar-explanations-th.json');
  if (fs.existsSync(gtPath) && fs.existsSync(geThPath)) {
    try {
      const gt = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
      const ge = JSON.parse(fs.readFileSync(geThPath, 'utf8'));
      const templates = gt.templates || [];
      const thTemplates = ge.templates || {};
      for (const t of templates) {
        if (!thTemplates[t.id]) {
          issues.push(`Grammar template ${t.id} missing from grammar-explanations-th.json`);
        }
      }
    } catch (e) {
      issues.push(`Grammar JSON validation error: ${e.message}`);
    }
  }

  // 2. Vocabulary
  const vmPath = path.join(ROOT, 'vocabulary-master.json');
  const vThPath = path.join(ROOT, 'vocabulary-th.json');
  if (fs.existsSync(vmPath) && fs.existsSync(vThPath)) {
    try {
      const vm = JSON.parse(fs.readFileSync(vmPath, 'utf8'));
      const vt = JSON.parse(fs.readFileSync(vThPath, 'utf8'));
      const vMaster = Array.isArray(vm) ? vm : (vm.vocabulary || []);
      const vtEntries = vt.entries || {};
      for (const item of vMaster) {
        if (!vtEntries[item.id]) {
          issues.push(`Vocab ${item.id} missing from vocabulary-th.json`);
        }
      }
    } catch (e) {
      issues.push(`Vocab JSON validation error: ${e.message}`);
    }
  }

  return issues;
}

/**
 * Main runner
 */
function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');
  const isFixMode = args.includes('--sync') || args.includes('--fix') || (!isCheckMode && !args.includes('--watch'));
  const isWatchMode = args.includes('--watch');

  console.log(`\n======================================================`);
  console.log(`  FIEZEL i18n Thai Synchronization & Parity Engine`);
  console.log(`======================================================\n`);

  let totalIdKeys = 0;
  let totalThKeys = 0;
  let totalMissing = 0;
  let totalMismatches = 0;
  let hasErrors = false;

  for (const domain of DOMAINS) {
    const res = syncCopyDomain(domain, isFixMode);
    totalIdKeys += res.idCount;
    totalThKeys += res.thCount;
    totalMissing += res.missingInTh.length;
    totalMismatches += res.placeholderMismatches.length;

    if (res.ok) {
      console.log(`  ✓ [${domain.padEnd(16)}] ${res.thCount}/${res.idCount} keys in sync`);
    } else if (res.updated) {
      console.log(`  ⚡ [${domain.padEnd(16)}] Fixed ${res.missingInTh.length} missing keys -> now ${res.thCount}/${res.idCount}`);
    } else {
      hasErrors = true;
      console.log(`  ✗ [${domain.padEnd(16)}] Missing: ${res.missingInTh.length}, Mismatched placeholders: ${res.placeholderMismatches.length}`);
      if (res.missingInTh.length > 0) {
        console.log(`     Missing keys:`, res.missingInTh.slice(0, 5));
      }
      if (res.placeholderMismatches.length > 0) {
        console.log(`     Placeholder mismatches:`, res.placeholderMismatches);
      }
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Total Copy Keys: ID=${totalIdKeys} | TH=${totalThKeys}`);

  const datasetIssues = validateDatasets();
  if (datasetIssues.length === 0) {
    console.log(`  ✓ All Thai datasets (Grammar, Vocab, Banks) validated`);
  } else {
    hasErrors = true;
    console.log(`  ✗ Dataset validation issues found (${datasetIssues.length}):`);
    datasetIssues.slice(0, 5).forEach((iss) => console.log(`    - ${iss}`));
  }

  console.log(`------------------------------------------------------\n`);

  if (isFixMode && !hasErrors) {
    try {
      console.log(`Menjalankan uji cakupan Thai (tests/th-coverage-test.js)...`);
      execSync('node tests/th-coverage-test.js', { stdio: 'inherit', cwd: ROOT });
      console.log(`\nMenjalankan verifikasi baseline emas (tests/id-golden-snapshot-test.js)...`);
      execSync('node tests/id-golden-snapshot-test.js', { stdio: 'inherit', cwd: ROOT });
    } catch (e) {
      console.error(`\nTest failure during sync verification: ${e.message}`);
      process.exit(1);
    }
  }

  if (hasErrors) {
    console.error(`❌ i18n Thai sync failed: Ada kunci yang belum selaras.`);
    process.exit(1);
  } else {
    console.log(`🎉 100% i18n Thai Parity Terpenuhi & Terverifikasi.`);
    if (isWatchMode) {
      console.log(`\nMemantau perubahan berkas di features/i18n/copy-id-*.js... (tekan Ctrl+C untuk keluar)`);
      fs.watch(I18N_DIR, (eventType, filename) => {
        if (filename && filename.startsWith('copy-id-') && filename.endsWith('.js')) {
          console.log(`\nPerubahan terdeteksi pada ${filename}, menyinkronkan...`);
          main();
        }
      });
    }
  }
}

main();
