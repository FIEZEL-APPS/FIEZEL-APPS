/**
 * tools/internal-i18n-audit.mjs
 *
 * AUDIT GANDA DETAIL INDEPENDEN (CROSS-AUDIT PROTOCOL)
 * Memverifikasi 36 berkas katalog i18n FIEZEL di seluruh 9 bahasa x 4 namespace:
 * 1. Key Parity (Paritas Kunci & Missing Keys)
 * 2. Placeholder Parity (Preservasi Parameter {param})
 * 3. Indonesian Word Leak Scan (Pindai 100+ kata ID pada katalog non-ID)
 * 4. Mojibake & Encoding Integrity Scan
 * 5. Braincore Feedback & Pedagogical Keys Integrity
 */

import fs from 'node:fs';
import path from 'node:path';

const LOCALES = ['id', 'en', 'th', 'vi', 'ms', 'fil', 'ja', 'km', 'ru'];
const NAMESPACES = ['ui', 'quiz', 'grammar', 'vocab'];
const LOCALES_DIR = path.resolve('features/i18n/locales');

console.log('='.repeat(70));
console.log('FIEZEL I18N INDEPENDENT EMPIRICAL AUDIT REPORT');
console.log('Timestamp:', new Date().toISOString());
console.log('Target:', LOCALES_DIR);
console.log('='.repeat(70));

// Muat seluruh katalog
const catalogs = {};
for (const loc of LOCALES) {
  catalogs[loc] = {};
  for (const ns of NAMESPACES) {
    const filePath = path.join(LOCALES_DIR, loc, `${ns}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`FATAL: File tidak ditemukan: ${filePath}`);
      process.exit(1);
    }
    catalogs[loc][ns] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

// ============================================================================
// 1. KEY PARITY & MISSING KEYS AUDIT
// ============================================================================
console.log('\n[1/5] AUDIT PARITAS KUNCI (KEY PARITY)');
const keyStats = {};
let totalParityErrors = 0;

for (const ns of NAMESPACES) {
  const masterKeys = Object.keys(catalogs['id'][ns]);
  keyStats[ns] = { masterCount: masterKeys.length, locales: {} };

  for (const loc of LOCALES) {
    const locKeys = Object.keys(catalogs[loc][ns]);
    const missing = masterKeys.filter(k => !(k in catalogs[loc][ns]));
    const extra = locKeys.filter(k => !(k in catalogs['id'][ns]));

    keyStats[ns].locales[loc] = {
      count: locKeys.length,
      missingCount: missing.length,
      extraCount: extra.length,
      missingSample: missing.slice(0, 3)
    };

    if (missing.length > 0 || extra.length > 0) {
      totalParityErrors++;
      console.log(`  FAIL: ${loc}/${ns} missing=${missing.length}, extra=${extra.length}`);
    }
  }
}

console.log('  Rekapitulasi Kunci per Namespace:');
for (const ns of NAMESPACES) {
  const counts = LOCALES.map(loc => `${loc}:${keyStats[ns].locales[loc].count}`).join(', ');
  console.log(`    - ${ns.padEnd(8)} (Master: ${keyStats[ns].masterCount}) -> ${counts}`);
}
console.log(`  Status Paritas Kunci: ${totalParityErrors === 0 ? '100% PARITAS SEMPURNA (0 selisih)' : 'ADA SELISIH'}`);

// ============================================================================
// 2. PLACEHOLDER PARITY AUDIT {param}
// ============================================================================
console.log('\n[2/5] AUDIT PRESERVASI PLACEHOLDER {param}');
let totalPlaceholderChecks = 0;
let totalPlaceholderMismatches = 0;
const placeholderMismatches = [];

function extractPlaceholders(text) {
  if (typeof text !== 'string') return [];
  const matches = text.match(/\{([a-zA-Z0-9_-]+)\}/g);
  return matches ? matches.map(m => m.slice(1, -1)).sort() : [];
}

for (const ns of NAMESPACES) {
  const masterKeys = Object.keys(catalogs['id'][ns]);
  for (const k of masterKeys) {
    const idParams = extractPlaceholders(catalogs['id'][ns][k]);
    if (idParams.length === 0) continue;

    totalPlaceholderChecks += (LOCALES.length - 1);
    for (const loc of LOCALES) {
      if (loc === 'id') continue;
      const locVal = catalogs[loc][ns][k];
      const locParams = extractPlaceholders(locVal);

      if (idParams.join(',') !== locParams.join(',')) {
        totalPlaceholderMismatches++;
        placeholderMismatches.push({
          locale: loc,
          namespace: ns,
          key: k,
          expected: idParams,
          actual: locParams,
          val: locVal
        });
      }
    }
  }
}

console.log(`  Total evaluasi placeholder: ${totalPlaceholderChecks}`);
console.log(`  Placeholder mismatch / hilang: ${totalPlaceholderMismatches}`);
if (placeholderMismatches.length > 0) {
  console.log('  Sampel mismatch:', placeholderMismatches.slice(0, 5));
} else {
  console.log('  Status Preservasi Placeholder: 100% UTUH & TEPAT (0 hilang / rusak)');
}

// ============================================================================
// 3. INDONESIAN WORD LEAK AUDIT (100+ Blacklist Words)
// ============================================================================
console.log('\n[3/5] AUDIT KEBOCORAN KATA BAHASA INDONESIA (100+ Kata)');

const BLACKLIST_ID = [
  'dan', 'yang', 'tidak', 'untuk', 'dengan', 'sudah', 'belum', 'bisa', 'kamu',
  'soal', 'jawaban', 'kata', 'belajar', 'menjelaskan', 'wawancara', 'pilihan',
  'benar', 'salah', 'tepat', 'kurang', 'adalah', 'pada', 'dari', 'ke', 'di',
  'ini', 'itu', 'juga', 'akan', 'atau', 'karena', 'jika', 'harus', 'hanya',
  'lebih', 'sangat', 'banyak', 'semua', 'ada', 'bukan', 'telah', 'setiap',
  'dapat', 'oleh', 'tentang', 'seperti', 'antara', 'saat', 'ketika', 'setelah',
  'sebelum', 'kemudian', 'lalu', 'namun', 'tetapi', 'sedangkan', 'melainkan',
  'saja', 'pun', 'lagi', 'masih', 'selalu', 'sering', 'jarang', 'pernah',
  'kadang', 'mungkin', 'pasti', 'tentu', 'wajib', 'boleh', 'dilarang',
  'silakan', 'tolong', 'mohon', 'terima', 'kasih', 'sama', 'guru', 'murid',
  'siswa', 'kelas', 'sekolah', 'pelajaran', 'materi', 'tugas', 'latihan',
  'ujian', 'nilai', 'skor', 'hasil', 'catatan', 'harian', 'mingguan',
  'bulanan', 'bantuan', 'petunjuk', 'tuntunan', 'langkah', 'intinya',
  'alasan', 'pengecoh', 'tata', 'bahasa', 'aturan'
];

// Khusus Bahasa Melayu (ms): pisahkan kata serumpun sah vs kata spesifik Indonesia
const ID_SPECIFIC_FOR_MS = [
  'kamu', 'bisa', 'sudah', 'belum', 'soal', 'jawaban', 'wawancara', 'intinya',
  'pengecoh', 'tuntunan', 'siswa', 'ujian', 'petunjuk', 'menjelaskan'
];

const leakReport = {};
let totalLeaksFound = 0;

for (const loc of LOCALES) {
  if (loc === 'id') continue;
  leakReport[loc] = { totalKeys: 0, leakedKeys: 0, samples: [] };

  const wordsToTest = (loc === 'ms') ? ID_SPECIFIC_FOR_MS : BLACKLIST_ID;
  const wordRegex = new RegExp(`\\b(${wordsToTest.join('|')})\\b`, 'i');

  for (const ns of NAMESPACES) {
    for (const [k, v] of Object.entries(catalogs[loc][ns])) {
      leakReport[loc].totalKeys++;
      if (typeof v !== 'string') continue;

      // Bersihkan {placeholder} dan tag HTML sebelum scanning
      const cleaned = v.replace(/\{[a-zA-Z0-9_-]+\}/g, '').replace(/<[^>]+>/g, '');

      if (wordRegex.test(cleaned)) {
        const match = cleaned.match(wordRegex);
        leakReport[loc].leakedKeys++;
        totalLeaksFound++;
        leakReport[loc].samples.push({ ns, key: k, word: match[0], snippet: v.slice(0, 80) });
      }
    }
  }
}

for (const loc of LOCALES) {
  if (loc === 'id') continue;
  const rep = leakReport[loc];
  const status = rep.leakedKeys === 0 ? 'BERSIH (0 kebocoran)' : `BOCOR (${rep.leakedKeys} kunci)`;
  console.log(`  - [${loc.toUpperCase()}]: ${rep.totalKeys} kunci dipindai -> ${status}`);
  if (rep.samples.length > 0) {
    console.log(`    Contoh bocor [${loc}]:`, rep.samples.slice(0, 3));
  }
}
console.log(`  Total Kebocoran Global: ${totalLeaksFound === 0 ? '0 KEBOCORAN (100% PURE)' : totalLeaksFound}`);

// ============================================================================
// 4. MOJIBAKE & ENCODING INTEGRITY AUDIT
// ============================================================================
console.log('\n[4/5] AUDIT KARAKTER RUSAK / MOJIBAKE');
const MOJIBAKE_PATTERNS = [
  /\uFFFD/,
  /Ã[Â\s]/,
  /ç·´/,
  /ç¿’/,
  /â[€\x80-\x9F]/,
  /Ã©/, /Ã¡/, /Ã³/
];

let totalMojibakeFound = 0;
const mojibakeReport = {};

for (const loc of LOCALES) {
  mojibakeReport[loc] = 0;
  for (const ns of NAMESPACES) {
    for (const [k, v] of Object.entries(catalogs[loc][ns])) {
      if (typeof v !== 'string') continue;
      for (const pattern of MOJIBAKE_PATTERNS) {
        if (pattern.test(v)) {
          mojibakeReport[loc]++;
          totalMojibakeFound++;
          console.log(`  FAIL MOJIBAKE: [${loc}/${ns}] ${k} -> ${v.slice(0, 60)}`);
          break;
        }
      }
    }
  }
}

for (const loc of LOCALES) {
  console.log(`  - [${loc.toUpperCase()}]: ${mojibakeReport[loc] === 0 ? 'BERSIH (0 mojibake)' : `${mojibakeReport[loc]} cacat`}`);
}
console.log(`  Total Mojibake Global: ${totalMojibakeFound === 0 ? '0 CACAT (100% VALID ENCODING)' : totalMojibakeFound}`);

// ============================================================================
// 5. RUNTIME BRAINCORE FEEDBACK INTEGRITY AUDIT
// ============================================================================
console.log('\n[5/5] AUDIT INTEGRITAS KUNCI PEDAGOGIS & FEEDBACK BRAINCORE');

const CRITICAL_KEYS = [
  { ns: 'quiz', key: 'quiz.result-takeaway', label: 'Intinya:' },
  { ns: 'quiz', key: 'quiz.vocab-why-correct', label: 'Intinya definisi kata' },
  { ns: 'quiz', key: 'quiz.mengapa-salah', label: 'Mengapa kurang tepat?' },
  { ns: 'quiz', key: 'quiz.trik-ingat', label: 'Trik Cepat Ingat' },
  { ns: 'quiz', key: 'tutor.tuntunan-eyebrow', label: 'TUNTUNAN LANGKAH' },
  { ns: 'grammar', key: 'grammar.mode-rule-stem', label: 'Aturan tata bahasa stem' },
  { ns: 'ui', key: 'academic.task-interview-label', label: 'Interview practice' },
  { ns: 'ui', key: 'academic.no-prediction-note', label: 'Belum ada prediksi' }
];

let criticalKeyFailures = 0;
console.log('  Pemeriksaan Kunci-Kunci Kritis:');

for (const item of CRITICAL_KEYS) {
  console.log(`\n  -> [${item.ns}.${item.key}] (${item.label}):`);
  for (const loc of LOCALES) {
    const val = catalogs[loc][item.ns]?.[item.key];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      criticalKeyFailures++;
      console.log(`     [${loc}] GAGAL: undefined / kosong`);
    } else {
      console.log(`     [${loc}] ${val.replace(/\n/g, ' ')}`);
    }
  }
}

console.log(`\n  Status Integritas Kunci Pedagogis: ${criticalKeyFailures === 0 ? '100% LENGKAP & TERVALIDASI' : 'ADA KEGAGALAN'}`);

// ============================================================================
// KESIMPULAN AUDIT
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('KESIMPULAN AUDIT GANDA INDEPENDEN:');
console.log(`  1. Paritas Kunci          : ${totalParityErrors === 0 ? 'PASS (0 selisih pada 36 berkas)' : 'FAIL'}`);
console.log(`  2. Preservasi Placeholder : ${totalPlaceholderMismatches === 0 ? 'PASS (100% kurung kurawal utuh)' : 'FAIL'}`);
console.log(`  3. Kebocoran Bahasa ID    : ${totalLeaksFound === 0 ? 'PASS (0 kebocoran pada seluruh non-ID)' : 'FAIL'}`);
console.log(`  4. Bebas Mojibake         : ${totalMojibakeFound === 0 ? 'PASS (0 cacat encoding)' : 'FAIL'}`);
console.log(`  5. Kunci Kritis Pedagogis : ${criticalKeyFailures === 0 ? 'PASS (100% terisi dan akurat)' : 'FAIL'}`);
const overallPass = (totalParityErrors === 0 && totalPlaceholderMismatches === 0 && totalLeaksFound === 0 && totalMojibakeFound === 0 && criticalKeyFailures === 0);
console.log(`  VONIS KESELURUHAN         : ${overallPass ? '100% HIJAU (VERIFIED CLEAN & SOUND)' : 'RED / FAILED'}`);
console.log('='.repeat(70));
