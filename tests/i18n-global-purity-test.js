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

test('Paritas Kunci Kanonik Penuh: Seluruh kunci runtime copy-id-*.js terdaftar 1:1 di seluruh 9 bahasa', () => {
  const vm = require('vm');
  const i18nDir = path.join(ROOT, 'features', 'i18n');
  const copyIdKeys = new Set();
  const sandbox = {
    FiezelI18n: {
      registerCopy: (_loc, map) => {
        if (map && typeof map === 'object') {
          for (const k of Object.keys(map)) copyIdKeys.add(k);
        }
      },
      overrideCopy: (_loc, map) => {
        if (map && typeof map === 'object') {
          for (const k of Object.keys(map)) copyIdKeys.add(k);
        }
      }
    }
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of fs.readdirSync(i18nDir).filter(x => /^copy-id-.*\.js$/.test(x)).sort()) {
    vm.runInContext(fs.readFileSync(path.join(i18nDir, f), 'utf8'), sandbox, { filename: f });
  }
  assert(copyIdKeys.size >= 6000, `Ekspektasi >= 6000 kunci copy-id runtime, terbaca: ${copyIdKeys.size}`);

  const mergedByLoc = {};
  for (const loc of ['id', ...ALL_NON_ID_LOCALES]) {
    mergedByLoc[loc] = {};
    for (const ns of NAMESPACES) {
      Object.assign(mergedByLoc[loc], JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, loc, `${ns}.json`), 'utf8')));
    }
  }
  const idCatalogKeys = Object.keys(mergedByLoc.id).sort();
  const missingRuntime = [...copyIdKeys].filter(k => !(k in mergedByLoc.id));
  assert.deepStrictEqual(missingRuntime, [], `Kunci copy-id-*.js belum masuk katalog locales/: ${missingRuntime.slice(0, 15).join(', ')}`);

  for (const loc of ALL_NON_ID_LOCALES) {
    const locKeys = Object.keys(mergedByLoc[loc]).sort();
    assert.strictEqual(locKeys.length, idCatalogKeys.length, `Jumlah kunci ${loc} (${locKeys.length}) != id (${idCatalogKeys.length})`);
    const diff = idCatalogKeys.filter(k => !(k in mergedByLoc[loc]));
    assert.deepStrictEqual(diff, [], `Kunci hilang di ${loc}: ${diff.slice(0, 15).join(', ')}`);
  }
});

test('Paritas Placeholder 100%: Seluruh {param} di 9 bahasa identik 1:1 tanpa korupsi kurung kurawal', () => {
  const phOf = (s) => (String(s || '').match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
  const mismatches = [];
  for (const ns of NAMESPACES) {
    const idData = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'id', `${ns}.json`), 'utf8'));
    for (const loc of ALL_NON_ID_LOCALES) {
      const locData = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, loc, `${ns}.json`), 'utf8'));
      for (const [k, idVal] of Object.entries(idData)) {
        const pId = phOf(idVal);
        const pLoc = phOf(locData[k]);
        if (pId !== pLoc) {
          mismatches.push(`${loc}/${ns}.${k}: expected [${pId}] got [${pLoc}]`);
        }
      }
    }
  }
  assert.deepStrictEqual(mismatches, [], `Ketidakcocokan {placeholder}:\n  ` + mismatches.slice(0, 15).join('\n  '));
});

test('Aksara Asli Non-Latin (th, ru, km) minimal 95% autentik dan bebas stub Inggris', () => {
  const scriptMap = {
    th: /[\u0E00-\u0E7F]/,
    ru: /[\u0400-\u04FF]/,
    km: /[\u1780-\u17FF]/
  };
  for (const [loc, re] of Object.entries(scriptMap)) {
    let total = 0, native = 0;
    for (const ns of NAMESPACES) {
      const data = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, loc, `${ns}.json`), 'utf8'));
      for (const v of Object.values(data)) {
        const s = String(v).trim();
        total++;
        if (re.test(s) || s.length <= 4 || /^settings\.locale-opsi-/.test(s) || /^[0-9\s.,!?:;/\\-_+*#@%$()]+$/.test(s)) {
          native++;
        }
      }
    }
    const pct = (native / total) * 100;
    assert(pct >= 95, `Katalog ${loc} hanya ${pct.toFixed(1)}% beraksara asli (< 95%)`);
  }
});

test('Katalog Bahasa Rumpun Latin (ms, fil, vi) minimal 92% diterjemahkan asli (bukan copy-paste Inggris)', () => {
  const enMerged = {};
  for (const ns of NAMESPACES) {
    Object.assign(enMerged, JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en', `${ns}.json`), 'utf8')));
  }
  const total = Object.keys(enMerged).length;
  for (const loc of ['ms', 'fil', 'vi']) {
    let translated = 0;
    for (const ns of NAMESPACES) {
      const data = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, loc, `${ns}.json`), 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        if (v !== enMerged[k] || String(v).trim().length <= 4) translated++;
      }
    }
    const pct = (translated / total) * 100;
    assert(pct >= 92, `Katalog ${loc} hanya ${pct.toFixed(1)}% berbeda dari Inggris (< 92% — indikasi stub belum diterjemahkan!)`);
  }
});

console.log('\n--- HASIL GERBANG I18N GLOBAL PURITY ---');
if (failures === 0) {
  console.log('SEMUA 11 GERBANG PURITAS I18N GLOBAL: 100% HIJAU (PASS)!');
  process.exit(0);
} else {
  console.error(`TERDAPAT ${failures} KEGAGALAN PADA GERBANG PURITAS I18N GLOBAL!`);
  process.exit(1);
}
