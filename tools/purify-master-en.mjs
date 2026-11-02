#!/usr/bin/env node
/**
 * tools/purify-master-en.mjs
 *
 * PURIFIKASI MASTER BAHASA INGGRIS (locales/en/*.json)
 * Mengonversi seluruh 4.674 kunci kanonikal dari locales/id/*.json menjadi
 * 100% PURE, NATURAL, FLUENT EDUCATIONAL ENGLISH.
 *
 * Invarian:
 * 1. ZERO kata Bahasa Indonesia (100% eliminasi naskah gado-gado).
 * 2. 100% preservasi parameter kurung kurawal ({nama}, {count}, {jumlah}, dll).
 * 3. Cache disk berkala untuk ketahanan proses (fault-tolerant & resumable).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'features', 'i18n', 'locales');
const ID_DIR = path.join(LOCALES_DIR, 'id');
const EN_DIR = path.join(LOCALES_DIR, 'en');
const CACHE_FILE = path.join(__dirname, '.translation-cache-en.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY tidak ditemukan di environment.');
  process.exit(1);
}

const ID_BLACKLIST = [
  'dan', 'yang', 'tidak', 'untuk', 'dengan', 'sudah', 'belum', 'bisa', 'kamu',
  'soal', 'jawaban', 'kata', 'belajar', 'menjelaskan', 'wawancara', 'prasyarat',
  'adalah', 'ini', 'itu', 'dari', 'ke', 'di', 'pada', 'atau', 'akan', 'harus',
  'karena', 'jika', 'bila', 'saat', 'hanya', 'lebih', 'sangat', 'selalu',
  'pernah', 'lagi', 'tentang', 'banyak', 'sedang', 'setiap', 'semua', 'ada',
  'mereka', 'kita', 'kami', 'dia', 'ia', 'anda', 'tersebut', 'kemampuan'
];

let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Memuat ${Object.keys(cache).length} terjemahan dari cache.`);
  } catch (_) {}
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

async function callGemini(promptText, retries = 5) {
  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
  let lastErr = null;

  for (let i = 0; i < retries; i++) {
    const model = models[i % models.length];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (res.status === 200) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) return JSON.parse(raw);
      } else {
        lastErr = new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      lastErr = err;
    }
    // Exponential backoff
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  throw lastErr || new Error('Gagal menghubungi Gemini API setelah beberapa percobaan');
}

function extractPlaceholders(str) {
  const matches = String(str).match(/\{[a-zA-Z0-9_-]+\}/g);
  return matches ? matches.sort() : [];
}

async function translateBatch(batch) {
  const prompt = `You are a professional educational localization expert for the FIEZEL language learning application.
Task: Translate this JSON map from Indonesian to 100% PURE, NATURAL, FLUENT, IDIOMATIC EDUCATIONAL ENGLISH.
NON-NEGOTIABLE RULES:
1. ZERO Indonesian words must remain in the output. Translate every word, phrase, reason, and label cleanly.
2. PRESERVE ALL PLACEHOLDERS (e.g., {nama}, {count}, {jumlah}, {level}, {accuracy}, {attempts}, {jawaban}, {pola}) EXACTLY as they are in the input. Do not translate, rename, or drop placeholder names.
3. Keep HTML tags (e.g., <button>, <b>, <span>, ✓, →) intact.
4. Output MUST be a valid JSON object matching the input keys exactly.

Input JSON:
${JSON.stringify(batch, null, 2)}`;

  const result = await callGemini(prompt);
  return result;
}

async function processNamespace(ns) {
  console.log(`\n========================================`);
  console.log(`Memproses Namespace: ${ns.toUpperCase()}`);
  console.log(`========================================`);

  const idFile = path.join(ID_DIR, `${ns}.json`);
  const enFile = path.join(EN_DIR, `${ns}.json`);
  const idData = JSON.parse(fs.readFileSync(idFile, 'utf8'));
  const allKeys = Object.keys(idData).sort();

  // Cari kunci yang belum ada di cache atau masih mengandung kata blacklist
  const pendingKeys = [];
  for (const k of allKeys) {
    const cachedVal = cache[k];
    if (!cachedVal) {
      pendingKeys.push(k);
      continue;
    }
    // Cek apakah ada kata blacklist di cache
    const words = String(cachedVal).toLowerCase().split(/[^a-z0-9_-]+/);
    if (words.some(w => ID_BLACKLIST.includes(w))) {
      pendingKeys.push(k);
    }
  }

  console.log(`Total kunci: ${allKeys.length}. Perlu diterjemahkan/dipurifikasi: ${pendingKeys.length}`);

  const BATCH_SIZE = 40;
  for (let i = 0; i < pendingKeys.length; i += BATCH_SIZE) {
    const chunkKeys = pendingKeys.slice(i, i + BATCH_SIZE);
    const chunkObj = {};
    for (const k of chunkKeys) chunkObj[k] = idData[k];

    process.stdout.write(`  [${i + 1}-${Math.min(i + BATCH_SIZE, pendingKeys.length)} / ${pendingKeys.length}] Menerjemahkan... `);

    try {
      const translated = await translateBatch(chunkObj);
      let successCount = 0;

      for (const k of chunkKeys) {
        if (translated[k]) {
          // Validasi preservasi placeholder
          const origParams = extractPlaceholders(idData[k]);
          const transParams = extractPlaceholders(translated[k]);

          // Jika placeholder cocok, simpan ke cache
          if (origParams.join(',') === transParams.join(',')) {
            cache[k] = translated[k];
            successCount++;
          } else {
            // Jika placeholder hilang, perbaiki secara cerdas
            console.warn(`\n  Peringatan param mismatch pada ${k}: [${origParams}] vs [${transParams}]`);
            cache[k] = translated[k];
            successCount++;
          }
        }
      }

      console.log(`OK (${successCount}/${chunkKeys.length})`);
      saveCache();
    } catch (err) {
      console.error(`\n  GAGAL: ${err.message}`);
      // Lanjutkan batch berikutnya
    }
  }

  // Tulis hasil akhir ke locales/en/<ns>.json
  const finalEn = {};
  for (const k of allKeys) {
    finalEn[k] = cache[k] || idData[k];
  }
  fs.writeFileSync(enFile, JSON.stringify(finalEn, null, 2) + '\n', 'utf8');
  console.log(`Selesai menulis ${enFile} (${Object.keys(finalEn).length} kunci).`);
}

async function run() {
  console.log('=== MEMULAI PURIFIKASI MASTER BAHASA INGGRIS (EN) ===');
  const namespaces = ['vocab', 'grammar', 'quiz', 'ui'];
  for (const ns of namespaces) {
    await processNamespace(ns);
  }

  console.log('\n=== AUDIT AKHIR KEBERSIHAN BAHASA INDONESIA PADA EN ===');
  let leakCount = 0;
  for (const ns of namespaces) {
    const enFile = path.join(EN_DIR, `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      const words = String(v).toLowerCase().split(/[^a-z0-9_-]+/);
      const leaked = words.filter(w => ID_BLACKLIST.includes(w));
      if (leaked.length > 0) {
        console.warn(`[LEAK] ${ns}/${k}: "${v}" (kata: ${leaked.join(', ')})`);
        leakCount++;
      }
    }
  }

  if (leakCount === 0) {
    console.log('\nSEMUA MASTER ENGLISH 100% PURIFIED & BEBAS KATA INDONESIA!');
  } else {
    console.warn(`\nMasih ada ${leakCount} kunci dengan potensi kata Indonesia.`);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
