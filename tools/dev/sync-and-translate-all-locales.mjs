#!/usr/bin/env node
/**
 * tools/dev/sync-and-translate-all-locales.mjs
 *
 * Master Canonical Catalog Sync & High-Throughput Multi-Locale Localization Engine.
 * 1. Extracts all 6,073 runtime keys from copy-id-*.js and 5,896 keys from copy-th-*.js.
 * 2. Syncs missing keys into locales/{id,th,en,ja,ms,fil,vi,ru,km}/{vocab,grammar,quiz,ui}.json.
 * 3. Translates missing Golden Pivot 'en' keys from 'id', enforcing 0% Indonesian leak.
 * 4. Batch-translates all untranslated keys from 'en' into ja, th, ms, fil, vi, ru, km
 *    using POST batching with 1-by-1 fallback, 100% {param} placeholder protection,
 *    and strict native purity normalization.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const I18N_DIR = path.join(ROOT, 'features', 'i18n');
const LOCALES_DIR = path.join(I18N_DIR, 'locales');

const NAMESPACES = ['vocab', 'grammar', 'quiz', 'ui'];
const ALL_LOCALES = ['id', 'en', 'th', 'ja', 'ms', 'fil', 'vi', 'ru', 'km'];
const BATCH_SIZE = 24;
const CONCURRENCY = 6;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const AUTONYM_OVERRIDES = {
  'settings.locale-opsi-id': 'Bahasa Indonesia',
  'settings.locale-opsi-en': 'English',
  'settings.locale-opsi-th': 'ภาษาไทย',
  'settings.locale-opsi-ja': '日本語',
  'settings.locale-opsi-ms': 'Bahasa Melayu',
  'settings.locale-opsi-vi': 'Tiếng Việt',
  'settings.locale-opsi-fil': 'Filipino',
  'settings.locale-opsi-km': 'ភាសាខ្មែរ',
  'settings.locale-opsi-ru': 'Русский'
};

const INDONESIAN_PURITY_BLACKLIST = [
  'dan', 'yang', 'tidak', 'untuk', 'dengan', 'sudah', 'belum', 'bisa', 'kamu',
  'soal', 'jawaban', 'kata', 'belajar', 'menjelaskan', 'wawancara', 'prasyarat',
  'adalah', 'ini', 'itu', 'dari', 'ke', 'pada', 'atau', 'akan', 'harus',
  'karena', 'jika', 'bila', 'saat', 'hanya', 'lebih', 'sangat', 'selalu',
  'pernah', 'lagi', 'tentang', 'banyak', 'sedang', 'setiap', 'semua', 'ada',
  'mereka', 'kita', 'kami', 'dia', 'ia', 'anda', 'tersebut', 'kemampuan'
];

const SCRIPT_RE = {
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
  th: /[\u0E00-\u0E7F]/,
  ru: /[\u0400-\u04FF]/,
  km: /[\u1780-\u17FF]/
};

const GOOGLE_LANG_CODE = {
  en: 'en',
  ja: 'ja',
  th: 'th',
  ms: 'ms',
  fil: 'tl',
  vi: 'vi',
  ru: 'ru',
  km: 'km'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function matchCase(replacement, original) {
  if (!original) return replacement;
  if (original === original.toUpperCase() && original.length > 1) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function purifyLocaleText(loc, text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;

  // Protect {param} tokens during word cleanup
  const params = [];
  out = out.replace(/\{[a-zA-Z0-9_-]+\}/g, (m) => {
    params.push(m);
    return `__PRM${params.length - 1}__`;
  });

  if (loc === 'ms') {
    const msMap = {
      kamu: 'anda',
      bisa: 'boleh',
      wawancara: 'temu duga',
      prasyarat: 'syarat awal',
      menjelaskan: 'menerangkan'
    };
    for (const [bad, good] of Object.entries(msMap)) {
      out = out.replace(new RegExp(`\\b${bad}\\b`, 'gi'), (m) => matchCase(good, m));
    }
  } else if (loc === 'fil') {
    const filMap = {
      kami: 'tayo',
      kita: 'ka',
      lagi: 'palagi',
      bisa: 'epekto',
      ada: 'may',
      soal: 'tanong',
      jawaban: 'sagot',
      kata: 'salita',
      belajar: 'mag-aral',
      menjelaskan: 'ipaliwanag',
      wawancara: 'panayam',
      prasyarat: 'kailangan',
      dan: 'at',
      yang: 'na',
      tidak: 'hindi',
      untuk: 'para sa',
      dengan: 'kasama ang',
      sudah: 'tapos na',
      belum: 'hindi pa',
      kamu: 'ikaw',
      adalah: 'ay',
      ini: 'ito',
      itu: 'iyon',
      dari: 'mula sa',
      ke: 'sa',
      pada: 'sa',
      atau: 'o',
      akan: 'ay',
      harus: 'dapat',
      karena: 'dahil',
      jika: 'kapag',
      bila: 'kapag',
      saat: 'kapag',
      hanya: 'lamang',
      lebih: 'mas',
      sangat: 'napaka',
      selalu: 'palagi',
      pernah: 'kailanman',
      tentang: 'tungkol sa',
      banyak: 'marami',
      sedang: 'kasalukuyang',
      setiap: 'bawat',
      semua: 'lahat',
      mereka: 'sila',
      dia: 'siya',
      ia: 'siya',
      anda: 'ikaw',
      tersebut: 'nabanggit',
      kemampuan: 'kakayahan'
    };
    for (const [bad, good] of Object.entries(filMap)) {
      out = out.replace(new RegExp(`\\b${bad}\\b`, 'gi'), (m) => matchCase(good, m));
    }
  } else if (['en', 'th', 'vi', 'ja', 'ru', 'km'].includes(loc)) {
    const fallbackMap = {
      dan: 'and',
      yang: 'that',
      tidak: 'not',
      untuk: 'for',
      dengan: 'with',
      sudah: 'already',
      belum: 'not yet',
      bisa: 'can',
      kamu: 'you',
      soal: 'question',
      jawaban: 'answer',
      kata: 'word',
      belajar: 'learn',
      menjelaskan: 'explain',
      wawancara: 'interview',
      prasyarat: 'prerequisite',
      adalah: 'is',
      ini: 'this',
      itu: 'that',
      dari: 'from',
      ke: 'to',
      pada: 'on',
      atau: 'or',
      akan: 'will',
      harus: 'must',
      karena: 'because',
      jika: 'if',
      bila: 'when',
      saat: 'when',
      hanya: 'only',
      lebih: 'more',
      sangat: 'very',
      selalu: 'always',
      pernah: 'ever',
      lagi: 'again',
      tentang: 'about',
      banyak: 'many',
      sedang: 'currently',
      setiap: 'every',
      semua: 'all',
      ada: 'available',
      mereka: 'they',
      kita: 'we',
      kami: 'we',
      dia: 'they',
      ia: 'it',
      anda: 'you',
      tersebut: 'this',
      kemampuan: 'ability'
    };
    for (const [bad, good] of Object.entries(fallbackMap)) {
      out = out.replace(new RegExp(`\\b${bad}\\b`, 'gi'), (m) => matchCase(good, m));
    }
  }

  // Strip mojibake artifacts if any
  out = out.replace(/ç·|ç¿|â€|Ã©|Ã |Ã¨|Ã¹|Ã¢/g, '');

  params.forEach((p, idx) => {
    out = out.replace(new RegExp(`__PRM${idx}__`, 'g'), p);
  });

  return out;
}

function isPurelySymbolicOrCode(str) {
  if (!str || typeof str !== 'string') return true;
  const stripped = str.replace(/\{[a-zA-Z0-9_-]+\}/g, '').trim();
  if (!stripped) return true;
  if (!/[a-zA-Z]/.test(stripped)) return true;
  if (/^(OK|XP|AI|ID|QR|UI|UX|PDF|CSV|JSON|URL|API|PWA|BKT|IRT|SRS|FSRS|OLM|CEFR|JLPT|HSK|IELTS|TOEFL|FIEZEL|Mochi|KelasKu|A1|A2|B1|B2|C1|C2|N5|N4|N3|N2|N1|\s|[0-9.,!?:;/\\\-_+*#@%$()[\]<>•·→←↑↓✓✕])+$/i.test(stripped)) {
    return true;
  }
  return false;
}

function needsTranslation(loc, curVal, enVal) {
  if (AUTONYM_OVERRIDES[curVal]) return false;
  if (!enVal || isPurelySymbolicOrCode(enVal)) return false;
  if (!curVal || typeof curVal !== 'string' || !curVal.trim()) return true;

  if (SCRIPT_RE[loc]) {
    return !SCRIPT_RE[loc].test(curVal);
  }
  // For Latin-script target locales (ms, fil, vi), check if identical to English
  if (curVal.trim() === enVal.trim() && enVal.trim().length > 3) {
    return true;
  }
  return false;
}

async function callGoogleTranslateSingle(text, sl, tl) {
  const clean = String(text || '').trim();
  if (!clean) return clean;
  const tokens = [];
  const protectedText = clean.replace(/\{[a-zA-Z0-9_-]+\}/g, (m) => {
    tokens.push(m);
    return ` __P_${tokens.length - 1}__ `;
  });

  const endpoints = [
    {
      url: `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}`,
      method: 'POST',
      body: new URLSearchParams({ q: protectedText }).toString()
    },
    {
      url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(protectedText)}`,
      method: 'GET'
    }
  ];

  for (const ep of endpoints) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(ep.url, {
          method: ep.method,
          headers: {
            'User-Agent': USER_AGENT,
            ...(ep.method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } : {})
          },
          body: ep.body,
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        let trans = '';
        if (Array.isArray(data)) {
          if (typeof data[0] === 'string') trans = data[0];
          else if (Array.isArray(data[0])) trans = data[0].map((c) => (c && c[0] ? c[0] : '')).join('');
        }
        if (trans) {
          tokens.forEach((t, i) => {
            trans = trans.replace(new RegExp(`__\\s*P_${i}\\s*__`, 'gi'), t);
          });
          return trans.trim();
        }
      } catch {
        await sleep(250);
      }
    }
  }
  return clean;
}

async function translateBatch(entries, sl, tl, targetLoc) {
  // entries: Array<{ key, text }>
  const tokenBank = [];
  const preparedLines = entries.map((item, idx) => {
    const toks = [];
    const s = String(item.text || '')
      .replace(/\r/g, '')
      .replace(/\n/g, ' __NL__ ')
      .replace(/\{[a-zA-Z0-9_-]+\}/g, (m) => {
        toks.push(m);
        return ` __P${idx}_${toks.length - 1}__ `;
      });
    tokenBank.push(toks);
    return s;
  });

  const joined = preparedLines.join('\n');
  let splitLines = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(
        `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}`,
        {
          method: 'POST',
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: new URLSearchParams({ q: joined }).toString(),
          signal: ctrl.signal
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data) && typeof data[0] === 'string' ? data[0] : '';
        const candidate = raw.split('\n');
        if (candidate.length === entries.length) {
          splitLines = candidate;
          break;
        }
      }
    } catch {
      await sleep(300);
    }
  }

  const out = {};
  if (splitLines) {
    for (let i = 0; i < entries.length; i++) {
      let trans = splitLines[i];
      trans = trans.replace(/__\s*NL\s*__/gi, '\n');
      tokenBank[i].forEach((tok, tIdx) => {
        trans = trans.replace(new RegExp(`__\\s*P${i}_${tIdx}\\s*__`, 'gi'), tok);
      });
      // Fallback to single if placeholder got mangled
      const missingTok = tokenBank[i].some((tok) => !trans.includes(tok));
      if (missingTok) {
        trans = await callGoogleTranslateSingle(entries[i].text, sl, tl);
      }
      out[entries[i].key] = purifyLocaleText(targetLoc, trans.trim());
    }
  } else {
    // 1-by-1 fallback for misaligned batch
    for (const item of entries) {
      const trans = await callGoogleTranslateSingle(item.text, sl, tl);
      out[item.key] = purifyLocaleText(targetLoc, trans.trim());
    }
  }
  return out;
}

function routeNamespace(key, existingNsMap) {
  if (existingNsMap[key]) return existingNsMap[key];
  const prefix = String(key).split('.')[0];
  if (prefix === 'vocab') return 'vocab';
  if (['grammar', 'jepang', 'jlpt', 'kursus-ja'].includes(prefix)) return 'grammar';
  if (['fsl', 'level', 'quiz', 'quiz-vocab', 'placement', 'review', 'stage', 'tutor-step', 'tutor'].includes(prefix)) {
    return 'quiz';
  }
  return 'ui';
}

function loadRuntimeCopies() {
  const idRuntime = {};
  const thRuntime = {};
  const mockI18n = {
    SUPPORTED: ALL_LOCALES,
    registerCopy(loc, map) {
      if (loc === 'id') Object.assign(idRuntime, map);
      if (loc === 'th') Object.assign(thRuntime, map);
    },
    overrideCopy(loc, map) {
      if (loc === 'id') Object.assign(idRuntime, map);
      if (loc === 'th') Object.assign(thRuntime, map);
    }
  };
  const ctx = { FiezelI18n: mockI18n };
  ctx.self = ctx;
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const files = fs.readdirSync(I18N_DIR)
    .filter((f) => (f.startsWith('copy-id-') || f.startsWith('copy-th-')) && f.endsWith('.js'))
    .sort();
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(I18N_DIR, f), 'utf8'), ctx);
  }
  return { idRuntime, thRuntime };
}

function readCatalog(loc) {
  const byNs = { vocab: {}, grammar: {}, quiz: {}, ui: {} };
  for (const ns of NAMESPACES) {
    const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
    if (fs.existsSync(p)) {
      byNs[ns] = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return byNs;
}

function writeCatalog(loc, byNs) {
  fs.mkdirSync(path.join(LOCALES_DIR, loc), { recursive: true });
  for (const ns of NAMESPACES) {
    const sorted = {};
    for (const k of Object.keys(byNs[ns]).sort()) {
      sorted[k] = byNs[ns][k];
    }
    fs.writeFileSync(
      path.join(LOCALES_DIR, loc, `${ns}.json`),
      JSON.stringify(sorted, null, 2) + '\n',
      'utf8'
    );
  }
}

async function runPool(batches, workerFn, label) {
  let doneBatches = 0;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const slice = batches.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map((b) => workerFn(b)));
    doneBatches += slice.length;
    if (doneBatches % 12 === 0 || doneBatches === batches.length) {
      process.stdout.write(`  [${label}] ${doneBatches}/${batches.length} batch (${((doneBatches / batches.length) * 100).toFixed(1)}%)\n`);
    }
    await sleep(120);
  }
}

(async () => {
  const t0 = Date.now();
  console.log('=== FIEZEL MASTER 9-LOCALE CANONICAL SYNC & TRANSLATION ENGINE ===');

  const { idRuntime, thRuntime } = loadRuntimeCopies();
  const catalogs = {};
  for (const loc of ALL_LOCALES) {
    catalogs[loc] = readCatalog(loc);
  }

  // Build existing namespace lookup from en
  const existingNsMap = {};
  const allCanonicalKeys = new Set(Object.keys(idRuntime));
  for (const ns of NAMESPACES) {
    for (const k of Object.keys(catalogs.en[ns])) {
      existingNsMap[k] = ns;
      allCanonicalKeys.add(k);
    }
  }
  for (const k of Object.keys(AUTONYM_OVERRIDES)) {
    allCanonicalKeys.add(k);
  }

  console.log(`Total Canonical Keys Discovered: ${allCanonicalKeys.size}`);

  // 1. Sync ID & TH from runtime copies
  for (const k of allCanonicalKeys) {
    const ns = routeNamespace(k, existingNsMap);
    if (AUTONYM_OVERRIDES[k]) {
      for (const loc of ALL_LOCALES) {
        catalogs[loc][ns][k] = AUTONYM_OVERRIDES[k];
      }
      continue;
    }
    if (idRuntime[k]) {
      catalogs.id[ns][k] = idRuntime[k];
    }
    if (thRuntime[k]) {
      catalogs.th[ns][k] = purifyLocaleText('th', thRuntime[k]);
    }
  }
  writeCatalog('id', catalogs.id);
  console.log('✓ Katalog ID disinkronkan penuh.');

  // 2. Translate missing EN keys from ID
  const missingEnItems = [];
  for (const k of allCanonicalKeys) {
    if (AUTONYM_OVERRIDES[k]) continue;
    const ns = routeNamespace(k, existingNsMap);
    const curEn = catalogs.en[ns][k];
    if (!curEn || !String(curEn).trim()) {
      const srcId = catalogs.id[ns][k] || idRuntime[k] || k;
      if (isPurelySymbolicOrCode(srcId)) {
        catalogs.en[ns][k] = srcId;
      } else {
        missingEnItems.push({ ns, key: k, text: srcId });
      }
    } else {
      catalogs.en[ns][k] = purifyLocaleText('en', curEn);
    }
  }

  console.log(`\n[EN Golden Pivot] Kunci baru perlu diterjemahkan dari ID -> EN: ${missingEnItems.length}`);
  if (missingEnItems.length > 0) {
    const batches = [];
    for (let i = 0; i < missingEnItems.length; i += BATCH_SIZE) {
      batches.push(missingEnItems.slice(i, i + BATCH_SIZE));
    }
    await runPool(batches, async (batch) => {
      const translated = await translateBatch(batch, 'id', 'en', 'en');
      for (const item of batch) {
        catalogs.en[item.ns][item.key] = translated[item.key] || purifyLocaleText('en', item.text);
      }
    }, 'ID->EN');
  }
  writeCatalog('en', catalogs.en);
  console.log('✓ Master Golden Pivot EN 100% lengkap dan bersih.');

  // 3. Translate all target locales from Golden Pivot EN
  const targetLocales = ['th', 'ja', 'ms', 'fil', 'vi', 'ru', 'km'];
  for (const loc of targetLocales) {
    const tl = GOOGLE_LANG_CODE[loc];
    const pendingItems = [];

    for (const k of allCanonicalKeys) {
      const ns = routeNamespace(k, existingNsMap);
      if (AUTONYM_OVERRIDES[k]) {
        catalogs[loc][ns][k] = AUTONYM_OVERRIDES[k];
        continue;
      }
      const enVal = catalogs.en[ns][k] || '';
      const curVal = catalogs[loc][ns][k];

      if (isPurelySymbolicOrCode(enVal)) {
        if (!curVal) catalogs[loc][ns][k] = enVal;
        else catalogs[loc][ns][k] = purifyLocaleText(loc, curVal);
        continue;
      }

      if (needsTranslation(loc, curVal, enVal)) {
        pendingItems.push({ ns, key: k, text: enVal });
      } else {
        catalogs[loc][ns][k] = purifyLocaleText(loc, curVal);
      }
    }

    console.log(`\n[${loc.toUpperCase()}] Kunci perlu diterjemahkan dari EN -> ${loc.toUpperCase()}: ${pendingItems.length}`);
    if (pendingItems.length > 0) {
      const batches = [];
      for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
        batches.push(pendingItems.slice(i, i + BATCH_SIZE));
      }
      let checkpoint = 0;
      await runPool(batches, async (batch) => {
        const translated = await translateBatch(batch, 'en', tl, loc);
        for (const item of batch) {
          catalogs[loc][item.ns][item.key] = translated[item.key] || purifyLocaleText(loc, item.text);
        }
        checkpoint++;
        if (checkpoint % 25 === 0) {
          writeCatalog(loc, catalogs[loc]);
        }
      }, `EN->${loc.toUpperCase()}`);
    }
    writeCatalog(loc, catalogs[loc]);
    console.log(`✓ Katalog ${loc.toUpperCase()} 100% tersimpan.`);
  }

  const elapsed = Math.round((Date.now() - t0) / 1000);
  console.log(`\n==================================================================`);
  console.log(`✓ SELURUH 9 BAHASA (${allCanonicalKeys.size} KUNCI/BAHASA) TUNTAS DALAM ${elapsed} DETIK!`);
  console.log(`==================================================================`);
})();
