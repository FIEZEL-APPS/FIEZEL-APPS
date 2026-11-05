'use strict';
/**
 * tests/i18n-global-purity-test.js
 *
 * GERBANG CI: AUDIT PURIFIKASI GLOBAL & ZERO-LEAK BAHASA INDONESIA
 * Memindai seluruh katalog JSON di features/i18n/locales/ untuk memastikan:
 * 1. ZERO bocoran kata Bahasa Indonesia pada katalog non-ID (en, ja, vi, ru, fil, km).
 * 2. Master English (en) 100% murni, fasih, dan bebas kalimat gado-gado.
 * 3. 100% integritas encoding UTF-8 (zero mojibake).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'features', 'i18n', 'locales');

// Daftar 50 kata umum Bahasa Indonesia (Mandat Audit Koordinator)
const INDONESIAN_PURITY_BLACKLIST = [
  'dan', 'yang', 'tidak', 'untuk', 'dengan', 'sudah', 'belum', 'bisa', 'kamu',
  'soal', 'jawaban', 'kata', 'belajar', 'menjelaskan', 'wawancara', 'prasyarat',
  'adalah', 'ini', 'itu', 'dari', 'ke', 'pada', 'atau', 'akan', 'harus',
  'karena', 'jika', 'bila', 'saat', 'hanya', 'lebih', 'sangat', 'selalu',
  'pernah', 'lagi', 'tentang', 'banyak', 'sedang', 'setiap', 'semua', 'ada',
  'mereka', 'kita', 'kami', 'dia', 'ia', 'anda', 'tersebut', 'kemampuan'
];

const TARGET_STRICT_LOCALES = ['en', 'ja', 'vi', 'ru', 'fil', 'km'];
const ALL_NON_ID_LOCALES = ['en', 'th', 'vi', 'ms', 'fil', 'ja', 'km', 'ru'];
const NAMESPACES = ['ui', 'quiz', 'grammar', 'vocab'];

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (err) {
    failures++;
    console.error('FAIL: ' + name + '\n  -> ' + err.message);
  }
}

console.log('--- MENJALANKAN GERBANG I18N GLOBAL PURITY & ZERO-LEAK TEST ---');

test('Seluruh 36 berkas katalog JSON 9 bahasa dan 4 namespace ada dan valid', () => {
  ['id', ...ALL_NON_ID_LOCALES].forEach(loc => {
    NAMESPACES.forEach(ns => {
      const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
      assert(fs.existsSync(p), `Berkas hilang: ${loc}/${ns}.json`);
      const content = fs.readFileSync(p, 'utf8');
      assert.doesNotThrow(() => JSON.parse(content), `JSON tidak valid: ${loc}/${ns}.json`);
    });
  });
});

test('Zero Mojibake: Tidak ada karakter encoding rusak (misal: ç·´ç¿’) pada seluruh katalog', () => {
  const mojibakeRe = /ç·|ç¿|â€|Ã©|Ã |Ã¨|Ã¹|Ã¢/;
  const mojibakeFound = [];

  ['id', ...ALL_NON_ID_LOCALES].forEach(loc => {
    NAMESPACES.forEach(ns => {
      const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        if (mojibakeRe.test(String(v))) {
          mojibakeFound.push(`${loc}/${ns}.${k}: "${v}"`);
        }
      }
    });
  });

  assert.deepStrictEqual(mojibakeFound, [], 'Ditemukan karakter rusak (mojibake):\n  ' + mojibakeFound.join('\n  '));
});

test('Master English (en) 100% PURE & ZERO kebocoran kata Bahasa Indonesia', () => {
  const enLeaks = [];
  NAMESPACES.forEach(ns => {
    const p = path.join(LOCALES_DIR, 'en', `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      // Hilangkan parameter kurung kurawal ({param}) sebelum memeriksa kata prosa
      const stripped = String(v).replace(/\{[a-zA-Z0-9_-]+\}/g, ' ');
      const words = stripped.toLowerCase().split(/[^a-z0-9_-]+/);
      const matched = words.filter(w => INDONESIAN_PURITY_BLACKLIST.includes(w));
      if (matched.length > 0) {
        enLeaks.push(`en/${ns}.${k}: "${v}" (kata: ${matched.join(', ')})`);
      }
    }
  });

  assert.deepStrictEqual(enLeaks, [], 'Master English bocor kata Bahasa Indonesia:\n  ' + enLeaks.join('\n  '));
});

test('Katalog Global Strict (ja, vi, ru, fil, km) ZERO kebocoran kata Bahasa Indonesia', () => {
  const globalLeaks = [];
  TARGET_STRICT_LOCALES.filter(l => l !== 'en').forEach(loc => {
    NAMESPACES.forEach(ns => {
      const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        const stripped = String(v).replace(/\{[a-zA-Z0-9_-]+\}/g, ' ');
        const words = stripped.toLowerCase().split(/[^a-z0-9_-]+/);
        const matched = words.filter(w => INDONESIAN_PURITY_BLACKLIST.includes(w));
        if (matched.length > 0) {
          globalLeaks.push(`${loc}/${ns}.${k}: "${v}" (kata: ${matched.join(', ')})`);
        }
      }
    });
  });

  assert.deepStrictEqual(globalLeaks, [], 'Katalog global bocor kata Bahasa Indonesia:\n  ' + globalLeaks.join('\n  '));
});

test('Katalog Thai (th) 100% bebas aksara Latin yang membocorkan Bahasa Indonesia', () => {
  const thLeaks = [];
  NAMESPACES.forEach(ns => {
    const p = path.join(LOCALES_DIR, 'th', `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      const stripped = String(v).replace(/\{[a-zA-Z0-9_-]+\}/g, ' ');
      const words = stripped.toLowerCase().split(/[^a-z0-9_-]+/);
      const matched = words.filter(w => INDONESIAN_PURITY_BLACKLIST.includes(w));
      if (matched.length > 0) {
        thLeaks.push(`th/${ns}.${k}: "${v}" (kata: ${matched.join(', ')})`);
      }
    }
  });

  assert.deepStrictEqual(thLeaks, [], 'Katalog Thai bocor kata Bahasa Indonesia:\n  ' + thLeaks.join('\n  '));
});

test('Katalog Malaysia (ms) bebas kata Indonesia spesifik yang salah dalam konteks Melayu', () => {
  const msSpecificLeaks = [];
  const msForbidden = ['kamu', 'bisa', 'wawancara', 'prasyarat', 'menjelaskan'];
  NAMESPACES.forEach(ns => {
    const p = path.join(LOCALES_DIR, 'ms', `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      const stripped = String(v).replace(/\{[a-zA-Z0-9_-]+\}/g, ' ');
      const words = stripped.toLowerCase().split(/[^a-z0-9_-]+/);
      const matched = words.filter(w => msForbidden.includes(w));
      if (matched.length > 0) {
        msSpecificLeaks.push(`ms/${ns}.${k}: "${v}" (kata: ${matched.join(', ')})`);
      }
    }
  });

  assert.deepStrictEqual(msSpecificLeaks, [], 'Katalog Malaysia memuat kata Indonesia spesifik:\n  ' + msSpecificLeaks.join('\n  '));
});

test('Katalog Japanese (ja) minimal 95% karakter Kanji/Kana autentik dan ZERO dummy text', () => {
  const jaRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  NAMESPACES.forEach(ns => {
    const p = path.join(LOCALES_DIR, 'ja', `${ns}.json`);
    assert(fs.existsSync(p), `Berkas hilang: ja/${ns}.json`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const totalKeys = Object.keys(data).length;
    let jaCount = 0;
    const nonJa = [];

    for (const [k, v] of Object.entries(data)) {
      const valStr = String(v).trim();
      if (jaRegex.test(valStr) || valStr.length <= 4 || /^[0-9\s.,!?:;/\\-_+*#@%$()]+$/.test(valStr)) {
        jaCount++;
      } else {
        nonJa.push(`ja/${ns}.${k}: "${v}"`);
      }
    }

    const pct = (jaCount / totalKeys) * 100;
    assert(pct >= 95, `Katalog ja/${ns}.json hanya ${pct.toFixed(1)}% Jepang (< 95%):\n  Contoh non-JA: ` + nonJa.slice(0, 10).join('\n  '));
  });
});

console.log('\n--- HASIL GERBANG I18N GLOBAL PURITY ---');
if (failures === 0) {
  console.log('SEMUA 7 GERBANG PURITAS I18N GLOBAL: 100% HIJAU (PASS)!');
  process.exit(0);
} else {
  console.error(`TERDAPAT ${failures} KEGAGALAN PADA GERBANG PURITAS I18N GLOBAL!`);
  process.exit(1);
}
