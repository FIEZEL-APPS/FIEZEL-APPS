#!/usr/bin/env node
/**
 * E5 — pipeline PRA-RENDER TTS ke Cloudflare R2 (cf-b4 §3, angka kanonik cf-c1 K1).
 *
 * INI TEMUAN TERBESAR SELURUH MIGRASI, dan bentuknya satu kalimat aritmetika:
 *   korpus kanonik 604.962 karakter × US$0,015/1.000 karakter (@cf/deepgram/aura-1)
 *   = US$9,07 SEKALI BAYAR, dan sesudah itu ±99% biaya TTS runtime hilang.
 * Perbandingannya: cf-a10 memperkirakan US$524/bulan pada 1.000 pengguna kalau setiap kalimat
 * dirender saat murid menekan putar. Membayar sembilan dolar satu kali untuk menghapus lima ratus
 * dolar per bulan bukan optimasi; ia keputusan arsitektur.
 *
 * Dua angka lain yang harus dibaca bersamaan:
 *   - Ukuran R2: ±925 byte/karakter (kalibrasi 273 aset nyata, cf-a10 §1) ⇒ ±0,56 GB, MASUK
 *     free tier R2 (10 GB-bulan). Ambang gelisah baru di ±18× korpus sekarang.
 *   - JATAH GRATIS TIDAK CUKUP, dan ini yang wajib dilaporkan: Workers AI Free hanya 10.000
 *     neuron/hari ≈ 7.333 karakter/hari di aura-1 untuk SELURUH akun. Seluruh korpus ≈ 825.000
 *     neuron. Jadi pra-render TIDAK bisa dijalankan gratis dengan menunggu; ia US$9,07 yang harus
 *     dibelanjakan owner. Karena itu `--budget-usd` ada, bawaannya kecil, dan `--apply` wajib.
 *
 * DRY-RUN ADALAH BAWAAN dan dry-run TIDAK MENYENTUH JARINGAN SAMA SEKALI. Bukan "tidak memanggil
 * provider" — tidak memanggil apa pun. Sifat itu diuji `prerender-dryrun-test.js` dengan mengganti
 * `fetch` global menjadi fungsi yang melempar: satu permintaan HTTP saja membuat gerbang merah.
 * Alasannya sederhana: satu salah ketik `--content` tidak boleh berbiaya, dan seorang peninjau
 * harus bisa menjalankan rencana ini di laptopnya tanpa satu kredensial pun.
 *
 * Pemakaian:
 *   node tools/prerender-tts.mjs                             # rencana seluruh korpus, nol biaya
 *   node tools/prerender-tts.mjs --content=listening --limit=200
 *   node tools/prerender-tts.mjs --content=vocabulary --budget-usd=1.00 --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TtsKey = require(path.join(ROOT, 'workers/api/tts/tts-key.js'));

export const MANIFEST_PATH = path.join(ROOT, 'audio/manifest-tts-v2.json');

/** Angka kanonik cf-c1 §K1. Dipaku di sini supaya penyimpangan korpus terlihat sebagai gagal uji. */
export const CANONICAL = Object.freeze({
  totalChars: 604962,
  byDomain: Object.freeze({ listening: 414779, book: 101749, vocabulary_word: 13602, vocabulary_example: 74832 }),
  usdPer1kChars: 0.015,
  bytesPerChar: 925,
  neuronsPerChar: 825000 / 604962,
  freeNeuronsPerDay: 10000
});

export const ENGINE = Object.freeze({
  id: '@cf/deepgram/aura-1',
  engineVersion: 'cf-aura-1@v1',
  voiceId: 'aura-asteria-en',
  locale: 'en-US',
  settings: Object.freeze({ container: 'mp3', sampleRate: 24000, bitRate: 128 })
});

const BANKS = Object.freeze({
  listening: 'features/speaking-listening/listening-bank-v1.json',
  book: 'features/library/library-books-v1.json',
  vocabulary: 'vocabulary-master.json'
});

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

/**
 * Membaca bank dan memancarkan satu baris per kalimat yang akan dibunyikan.
 * `domain` dipakai untuk sharding manifest; `contentType` hanya metadata (ia SENGAJA di luar hash
 * — lihat catatan di workers/api/tts/tts-key.js).
 */
export function collectCorpus(options = {}) {
  const want = String(options.content || 'all');
  const bookId = String(options.bookId || '');
  const rows = [];
  const take = (domain) => want === 'all' || want === domain ||
    (want === 'vocabulary' && domain.startsWith('vocabulary'));

  if (take('listening')) {
    const bank = readJson(BANKS.listening);
    for (const item of bank.items || []) {
      // `script` adalah kalimat yang benar-benar dibacakan. Pertanyaan dan pilihan jawaban TIDAK
      // ikut: membacakannya akan membocorkan jawaban dan merusak validitas latihan listening.
      if (typeof item.script === 'string' && item.script.trim()) {
        rows.push({ domain: 'listening', sourceId: String(item.id), contentType: 'sentence', text: item.script });
      }
    }
  }

  if (take('book')) {
    const lib = readJson(BANKS.book);
    for (const book of lib.books || []) {
      if (bookId && String(book.id) !== bookId) continue;
      let index = 0;
      for (const chapter of book.chapters || []) {
        for (const sentence of chapter.sentences || []) {
          const text = typeof sentence === 'string' ? sentence : String(sentence.en || '');
          if (!text.trim()) continue;
          rows.push({
            domain: 'book', sourceId: `${book.id}#${index++}`, contentType: 'sentence', text,
            bookId: String(book.id)
          });
        }
      }
    }
  }

  if (take('vocabulary_word') || take('vocabulary')) {
    const vocab = readJson(BANKS.vocabulary);
    const entries = Array.isArray(vocab) ? vocab : Object.values(vocab);
    for (const entry of entries) {
      if (typeof entry.word === 'string' && entry.word.trim()) {
        rows.push({ domain: 'vocabulary_word', sourceId: String(entry.id), contentType: 'word', text: entry.word });
      }
    }
    for (const entry of entries) {
      if (typeof entry.example === 'string' && entry.example.trim()) {
        rows.push({ domain: 'vocabulary_example', sourceId: String(entry.id), contentType: 'sentence', text: entry.example });
      }
    }
  }

  return rows;
}

/** Sensus murni: berapa karakter, per domain, tanpa menghitung kunci dan tanpa jaringan. */
export function censusCorpus(options = {}) {
  const rows = collectCorpus(options);
  const byDomain = {};
  let totalChars = 0;
  for (const row of rows) {
    const n = row.text.length;
    byDomain[row.domain] = byDomain[row.domain] || { items: 0, chars: 0 };
    byDomain[row.domain].items += 1;
    byDomain[row.domain].chars += n;
    totalChars += n;
  }
  return {
    items: rows.length,
    totalChars,
    byDomain,
    costUsd: (totalChars / 1000) * CANONICAL.usdPer1kChars,
    estimatedBytes: totalChars * CANONICAL.bytesPerChar,
    estimatedNeurons: Math.round(totalChars * CANONICAL.neuronsPerChar),
    freeDaysNeeded: Math.ceil((totalChars * CANONICAL.neuronsPerChar) / CANONICAL.freeNeuronsPerDay)
  };
}

export function loadManifest() {
  try {
    const doc = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (doc && doc.assets) return doc;
  } catch (_) { /* manifest belum ada: itu keadaan awal yang sah */ }
  return {
    schema: 'fiezel-tts-manifest-v2',
    keySchema: TtsKey.SCHEMA,
    version: 1,
    engineId: ENGINE.id,
    engineVersion: ENGINE.engineVersion,
    assets: {},
    shards: {}
  };
}

/**
 * Rencana: kunci v2 per baris, siapa yang sudah ada di manifest, siapa yang belum, berapa biayanya.
 * NOL JARINGAN. `existing` disuntik pemanggil (manifest lokal, atau hasil HEAD R2 saat --apply).
 */
export function buildPlan(options = {}) {
  const rows = collectCorpus(options);
  const manifest = options.manifest || loadManifest();
  const known = new Set(Object.keys(manifest.assets || {}));
  const extra = options.existingKeys instanceof Set ? options.existingKeys : new Set();
  const limit = Number(options.limit || 0);

  const pending = [];
  const seen = new Set();
  let duplicates = 0;
  let ready = 0;
  let plannedChars = 0;

  for (const row of rows) {
    const identity = TtsKey.build({
      text: row.text,
      locale: options.locale || ENGINE.locale,
      voiceId: options.voiceId || ENGINE.voiceId,
      engineId: options.engineId || ENGINE.id,
      engineVersion: options.engineVersion || ENGINE.engineVersion,
      contentType: row.contentType,
      settings: ENGINE.settings
    });
    const entry = { ...row, audioKey: identity.audioKey, objectName: TtsKey.objectName(identity), chars: identity.canonicalText.length, canonicalText: identity.canonicalText };
    if (seen.has(identity.audioKey)) { duplicates += 1; continue; }
    seen.add(identity.audioKey);
    if (known.has(identity.audioKey) || extra.has(identity.audioKey)) { ready += 1; continue; }
    if (limit > 0 && pending.length >= limit) continue;
    pending.push(entry);
    plannedChars += entry.chars;
  }

  return {
    rows: rows.length,
    uniqueKeys: seen.size,
    // Duplikat adalah PENGHEMATAN, bukan galat: kalimat yang sama di dua bank berbagi satu objek
    // karena kuncinya hash teks — itu memang tujuan kunci deterministik.
    duplicates,
    ready,
    pending,
    plannedChars,
    plannedCostUsd: (plannedChars / 1000) * CANONICAL.usdPer1kChars,
    plannedBytes: plannedChars * CANONICAL.bytesPerChar
  };
}

function formatReport(census, plan, opts) {
  const lines = [];
  lines.push('FIEZEL pra-render TTS — rencana');
  lines.push(`  mesin        : ${opts.engineId || ENGINE.id} (${opts.engineVersion || ENGINE.engineVersion})`);
  lines.push(`  kunci        : ${TtsKey.SCHEMA} (speed DIKELUARKAN dari kunci)`);
  lines.push(`  korpus       : ${census.items} kalimat, ${census.totalChars} karakter`);
  for (const [domain, v] of Object.entries(census.byDomain)) {
    lines.push(`    - ${domain.padEnd(20)} ${String(v.items).padStart(6)} item  ${String(v.chars).padStart(8)} karakter`);
  }
  lines.push(`  sudah siap   : ${plan.ready}`);
  lines.push(`  duplikat     : ${plan.duplicates} (kunci sama, dibayar sekali)`);
  lines.push(`  belum ada    : ${plan.pending.length}  (${plan.plannedChars} karakter)`);
  lines.push(`  biaya        : US$${plan.plannedCostUsd.toFixed(2)} untuk batch ini; seluruh korpus US$${census.costUsd.toFixed(2)}`);
  lines.push(`  ukuran R2    : ±${(plan.plannedBytes / 1e9).toFixed(3)} GB batch ini; korpus ±${(census.estimatedBytes / 1e9).toFixed(2)} GB (free tier 10 GB)`);
  lines.push(`  neuron       : ±${census.estimatedNeurons} untuk seluruh korpus = ${census.freeDaysNeeded} hari jatah gratis (10.000/hari).`);
  lines.push('               JATAH GRATIS TIDAK CUKUP — pra-render adalah biaya yang dibelanjakan, bukan ditunggu.');
  return lines.join('\n');
}

// --------------------------------------------------------------------------------------
// JALUR --apply: satu-satunya tempat jaringan disentuh.
// --------------------------------------------------------------------------------------

const R2_API = 'https://api.cloudflare.com/client/v4/accounts';

function r2Url(env, key) {
  return `${R2_API}/${env.accountId}/r2/buckets/${env.bucket}/objects/${encodeURIComponent(key)}`;
}

/** HEAD dulu, selalu. Objek yang sudah ada tidak boleh dibayar dua kali. */
async function r2Head(env, key) {
  try {
    const response = await fetch(r2Url(env, key), {
      method: 'HEAD',
      headers: { authorization: `Bearer ${env.token}` }
    });
    if (response.status === 404) return { absent: true };
    if (!response.ok) return { error: `r2_head_${response.status}` };
    return { bytes: Number(response.headers.get('content-length') || 0) };
  } catch (error) {
    return { error: `r2_network_${error?.message || 'error'}` };
  }
}

async function r2Put(env, key, body) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await fetch(r2Url(env, key), {
        method: 'PUT',
        headers: { authorization: `Bearer ${env.token}`, 'content-type': 'audio/mpeg' },
        body
      });
    } catch (error) {
      if (attempt === 3) return `r2_network_${error?.message || 'error'}`;
      await new Promise((r) => setTimeout(r, attempt * 3000));
      continue;
    }
    if (response.ok) return '';
    if (response.status !== 429 && response.status < 500) return `r2_put_${response.status}`;
    if (attempt === 3) return `r2_put_${response.status}`;
    await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  return 'r2_put_exhausted';
}

async function workersAiTts(env, text) {
  const response = await fetch(`${R2_API}/${env.accountId}/ai/run/${ENGINE.id}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text, speaker: env.speaker || ENGINE.voiceId })
  });
  if (!response.ok) return { error: `ai_${response.status}` };
  const buffer = Buffer.from(await response.arrayBuffer());
  // Balasan 200 bukan bukti apa pun: respons kosong, potongan HTML halaman galat, dan body
  // terpotong semuanya datang sebagai 200 di suatu hari (pelajaran tools/audio-batch-generate.mjs).
  if (buffer.length < 512) return { error: 'ai_empty_body' };
  return { bytes: buffer };
}

function writeManifestAtomic(doc) {
  const dir = path.dirname(MANIFEST_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${MANIFEST_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  fs.renameSync(tmp, MANIFEST_PATH);
}

function parseArgs(argv) {
  const out = { content: 'all', limit: 0, budgetUsd: 1.0, apply: false, bookId: '' };
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) continue;
    const [, name, value] = m;
    if (name === 'apply') out.apply = true;
    else if (name === 'content') out.content = String(value || 'all');
    else if (name === 'limit') out.limit = Number(value || 0);
    else if (name === 'budget-usd') out.budgetUsd = Number(value || 0);
    else if (name === 'book-id') out.bookId = String(value || '');
  }
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const census = censusCorpus({ content: opts.content, bookId: opts.bookId });
  const manifest = loadManifest();
  const plan = buildPlan({ content: opts.content, bookId: opts.bookId, limit: opts.limit, manifest });

  console.log(formatReport(census, plan, opts));

  if (!opts.apply) {
    console.log('\nDRY-RUN (bawaan). Tidak ada permintaan jaringan, tidak ada biaya. Tambahkan --apply untuk memproduksi.');
    return 0;
  }

  if (plan.plannedCostUsd > opts.budgetUsd) {
    console.error(`\nDIHENTIKAN: estimasi US$${plan.plannedCostUsd.toFixed(2)} melampaui --budget-usd=${opts.budgetUsd.toFixed(2)}.`);
    console.error('Turunkan --limit atau naikkan anggaran secara sadar. Batas ini ada supaya satu salah ketik tidak menghabiskan anggaran.');
    return 2;
  }

  const env = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    token: process.env.CLOUDFLARE_API_TOKEN || '',
    bucket: process.env.FIEZEL_AUDIO_BUCKET || 'fiezel-audio',
    speaker: process.env.FIEZEL_TTS_SPEAKER || ''
  };
  if (!env.accountId || !env.token) {
    console.error('\nDIHENTIKAN: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN tidak ada di environment.');
    return 2;
  }

  let produced = 0;
  let recovered = 0;
  let failed = 0;
  let spentChars = 0;

  for (const entry of plan.pending) {
    // HEAD SEBELUM PROVIDER, setiap kali. Manifest lokal bisa tertinggal dari R2 (push manifest
    // gagal padahal objeknya sudah ditulis), dan mempercayainya berarti membayar ulang.
    const head = await r2Head(env, entry.objectName);
    if (head.bytes) {
      manifest.assets[entry.audioKey] = {
        state: 'ready', url: `a/${entry.objectName}`, bytes: head.bytes, chars: entry.chars,
        domain: entry.domain, sourceId: entry.sourceId, engineId: ENGINE.id,
        engineVersion: ENGINE.engineVersion, voiceId: ENGINE.voiceId, contentType: entry.contentType
      };
      recovered += 1;
      continue;
    }
    if (head.error) { failed += 1; continue; }

    if (((spentChars + entry.chars) / 1000) * CANONICAL.usdPer1kChars > opts.budgetUsd) {
      console.log('Anggaran batch tercapai; berhenti dengan rapi.');
      break;
    }

    const audio = await workersAiTts(env, entry.canonicalText);
    if (audio.error) { failed += 1; continue; }
    spentChars += entry.chars;

    const putError = await r2Put(env, entry.objectName, audio.bytes);
    if (putError) { failed += 1; continue; }

    // Dibaca ULANG dari R2 sebelum ditandai ready (pasal 7 pipeline lama): balasan sukses dari
    // API bukan bukti berkasnya bisa diambil kembali, dan entri `ready` yang 404 terdengar sebagai
    // "aset rusak" bagi murid.
    const verify = await r2Head(env, entry.objectName);
    if (!verify.bytes || verify.bytes !== audio.bytes.length) { failed += 1; continue; }

    manifest.assets[entry.audioKey] = {
      state: 'ready', url: `a/${entry.objectName}`, bytes: verify.bytes, chars: entry.chars,
      domain: entry.domain, sourceId: entry.sourceId, engineId: ENGINE.id,
      engineVersion: ENGINE.engineVersion, voiceId: ENGINE.voiceId, contentType: entry.contentType
    };
    produced += 1;
  }

  const shards = {};
  for (const asset of Object.values(manifest.assets)) {
    shards[asset.domain] = (shards[asset.domain] || 0) + 1;
  }
  manifest.shards = shards;
  manifest.version = Number(manifest.version || 1) + 1;
  writeManifestAtomic(manifest);

  console.log(`\nselesai: ${produced} aset baru (US$${((spentChars / 1000) * CANONICAL.usdPer1kChars).toFixed(2)}), ` +
    `${recovered} dipulihkan dari R2 tanpa biaya, ${failed} gagal, manifest v${manifest.version}`);
  return failed > 0 ? 1 : 0;
}

// Modul ini di-import gerbang uji; jalankan main HANYA saat dieksekusi langsung, supaya
// mengimpornya tidak pernah membangkitkan biaya.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
