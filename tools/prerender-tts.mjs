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
/**
 * A12/1 — nama parameter provider (`speaker` untuk keluarga aura) dan voice bawaan hidup di SATU
 * berkas bersama dengan runtime, supaya jalur pra-render dan `POST /api/tts/render` tidak bisa
 * menyimpang. Penyimpangan itulah cacatnya: `voiceId` masuk kunci cache, tidak pernah sampai ke
 * provider, dan aset yang sudah dibayar dianggap belum ada.
 */
export const ProviderParams = require(path.join(ROOT, 'workers/api/tts/tts-provider-params.js'));

export const MANIFEST_PATH = path.join(ROOT, 'audio/manifest-tts-v2.json');

/** Angka kanonik cf-c1 §K1, dimutakhirkan m025-177: bank listening tumbuh +109 karakter
 * (414.779 -> 414.888; perbaikan konten skip-integrity-repair), total 604.962 -> 605.071,
 * pending dedup 286.851 -> 286.876 (objek tetap 5.657). Dipaku supaya penyimpangan korpus
 * berikutnya terlihat sebagai gagal uji, bukan lolos diam-diam. */
export const CANONICAL = Object.freeze({
  /** V20 wave-2: bank vocabulary tumbuh 1.765 -> 2.370 kata (+605), sehingga vocabulary_word
   * 13.602 -> 17.494 dan vocabulary_example 74.832 -> 104.902; total 605.071 -> 639.033,
   * pending dedup 286.876 -> 320.816 (objek 5.657 -> 6.866). Listening dan book tidak berubah.
   * m025-192 gen2-union: +70 kosakata C1 kurasi non-duplikat (30 duplikat kata vs wave-2 DIBUANG),
   * vocabulary_word 17.494 -> 18.065, vocabulary_example 104.902 -> 110.628; total 639.033 -> 645.330. */
  totalChars: 645330,
  byDomain: Object.freeze({ listening: 414888, book: 101749, vocabulary_word: 18065, vocabulary_example: 110628 }),
  usdPer1kChars: 0.015,
  bytesPerChar: 925,
  neuronsPerChar: 825000 / 604962,
  freeNeuronsPerDay: 10000,
  // Sesudah dedup kunci v2: 6.640 baris bank ⇒ 5.657 objek unik yang BELUM ada di R2,
  // 286.876 karakter. Ini angka yang benar-benar akan dibayar pada jalan pertama; 604.962
  // adalah ukuran korpus, bukan tagihan. Keduanya dipaku supaya pergeseran bank terlihat.
  uniqueObjectsPending: 7006,
  pendingChars: 327113,
  // Estimasi durasi audio. INI ESTIMASI, bukan pengukuran: 14,5 karakter/detik ≈ 175 kata/menit
  // pada 5,9 karakter/kata, kecepatan bicara aura yang biasa. Dipakai hanya untuk memberi owner
  // rasa "berapa jam audio yang ia beli", tidak dipakai untuk menghitung biaya apa pun.
  charsPerSecond: 14.5
});

/**
 * MODEL YANG BOLEH DIPAKAI — harga dari API Cloudflare, latensi/ukuran dari uji nyata 84 karakter,
 * WER dari transkripsi ulang Whisper. Tidak satu pun angka di blok ini ditebak.
 *
 * Bacaan pentingnya: aura-2-en dua kali lipat harganya (US$0,030 vs US$0,015 per 1.000 karakter)
 * dan 2,6× lebih lambat (2.510 ms vs 961 ms untuk 84 karakter), tetapi WER-nya separuh
 * (0,018 vs 0,038). Karena itu bawaannya aura-1 untuk korpus, dan aura-2-en dipakai TERARAH pada
 * frasa yang terbukti salah dilafalkan aura-1 (lihat RISKY_PHRASES). Membayar dua kali lipat
 * untuk 604.962 karakter demi memperbaiki puluhan kalimat adalah pemborosan; membayarnya untuk
 * puluhan kalimat itu saja adalah harga yang wajar.
 */
export const MODELS = Object.freeze({
  '@cf/deepgram/aura-1': Object.freeze({
    id: '@cf/deepgram/aura-1',
    engineVersion: 'cf-aura-1@v1',
    voiceId: 'aura-asteria-en',
    usdPer1kChars: 0.015,
    probe: Object.freeze({ chars: 84, ms: 961, bytes: 25704 }),
    wer: 0.038,
    role: 'default'
  }),
  '@cf/deepgram/aura-2-en': Object.freeze({
    id: '@cf/deepgram/aura-2-en',
    engineVersion: 'cf-aura-2-en@v1',
    voiceId: 'aura-2-thalia-en',
    usdPer1kChars: 0.030,
    probe: Object.freeze({ chars: 84, ms: 2510, bytes: 32688 }),
    wer: 0.018,
    role: 'accuracy'
  })
});

/**
 * MODEL YANG DITOLAK, dengan alasan yang bisa diperiksa. Ditulis sebagai data, bukan sebagai
 * catatan di README, supaya `--model` tidak bisa memilihnya diam-diam pada jalan berbayar.
 */
export const REJECTED_MODELS = Object.freeze({
  '@cf/myshell-ai/melotts': Object.freeze({
    id: '@cf/myshell-ai/melotts',
    reason: 'gagal HTTP 500 pada 3 dari 4 kalimat uji walau diulang 3×, dan keluarannya WAV ' +
      'base64 — bukan MP3 yang dilayani worker audio (nama objek <sha256>.mp3).',
    evidence: '3/4 kalimat 500 setelah 3 percobaan; container=wav-base64'
  })
});

export function modelOf(id) {
  const key = String(id || ENGINE.id);
  if (REJECTED_MODELS[key]) throw new Error(`model_rejected: ${key} — ${REJECTED_MODELS[key].reason}`);
  const model = MODELS[key];
  if (!model) throw new Error(`model_unknown: ${key}`);
  return model;
}

/**
 * FRASA BERISIKO. Temuan yang memaksa daftar ini ada: aura-1 melafalkan "On balance" cukup
 * bersambung sehingga Whisper menuliskannya "Unbalanced" — arti yang BERLAWANAN dengan maksud
 * stem soal. aura-2-en membacanya benar. Frasa itu kini menjadi awalan puluhan stem C1 di
 * `reading-bank.json`, jadi salah lafal satu frasa merusak seluruh keluarga soal sekaligus.
 *
 * Pola yang dikumpulkan di bawah semuanya sejenis dan sebabnya sama: preposisi satu suku kata
 * yang melebur ke kata berikutnya sampai ASR (dan telinga murid) mendengar SATU kata dengan arti
 * lain — on balance/unbalanced, on going/ongoing, on set/onset, in depth/indepth, on line/online.
 * Deteksinya otomatis atas bank, bukan daftar tangan berisi id soal, karena bank berubah dan
 * daftar tangan akan menua tanpa suara.
 */
export const RISKY_PHRASES = Object.freeze([
  Object.freeze({ phrase: 'On balance', heardAs: 'Unbalanced', severity: 'confirmed', evidence: 'transkripsi ulang Whisper atas keluaran aura-1' }),
  Object.freeze({ phrase: 'On going', heardAs: 'Ongoing', severity: 'suspected', evidence: 'pola lebur preposisi yang sama' }),
  Object.freeze({ phrase: 'On set', heardAs: 'Onset', severity: 'suspected', evidence: 'pola lebur preposisi yang sama' }),
  Object.freeze({ phrase: 'On line', heardAs: 'Online', severity: 'suspected', evidence: 'pola lebur preposisi yang sama' }),
  Object.freeze({ phrase: 'On board', heardAs: 'Onboard', severity: 'suspected', evidence: 'pola lebur preposisi yang sama' }),
  Object.freeze({ phrase: 'In depth', heardAs: 'Indepth', severity: 'suspected', evidence: 'pola lebur preposisi yang sama' }),
  Object.freeze({ phrase: 'In balance', heardAs: 'Imbalance', severity: 'suspected', evidence: 'pola lebur preposisi yang sama' })
]);

/** Model yang WAJIB dipakai untuk teks berisiko: yang WER-nya separuh dan melafalkannya benar. */
export const RISK_MODEL_ID = '@cf/deepgram/aura-2-en';

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
  vocabulary: 'vocabulary-master.json',
  reading: 'reading-bank.json'
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
    // Kedua harga dilaporkan berdampingan supaya keputusan model tidak perlu dihitung tangan:
    // aura-1 US$0,015/1.000 karakter, aura-2-en US$0,030/1.000 karakter (harga API Cloudflare).
    costByModel: Object.fromEntries(Object.values(MODELS).map((m) =>
      [m.id, (totalChars / 1000) * m.usdPer1kChars])),
    estimatedBytes: totalChars * CANONICAL.bytesPerChar,
    estimatedBytesByModel: Object.fromEntries(Object.values(MODELS).map((m) =>
      [m.id, Math.round(totalChars * (m.probe.bytes / m.probe.chars))])),
    estimatedSeconds: totalChars / CANONICAL.charsPerSecond,
    estimatedRenderMsByModel: Object.fromEntries(Object.values(MODELS).map((m) =>
      [m.id, Math.round(totalChars * (m.probe.ms / m.probe.chars))])),
    estimatedNeurons: Math.round(totalChars * CANONICAL.neuronsPerChar),
    freeDaysNeeded: Math.ceil((totalChars * CANONICAL.neuronsPerChar) / CANONICAL.freeNeuronsPerDay)
  };
}

/**
 * Deteksi otomatis frasa berisiko. Dicari di DUA tempat, dan pemisahan itu penting:
 *
 *   - baris korpus TTS (listening/book/vocabulary) — ini yang benar-benar akan dirender, jadi
 *     temuan di sini langsung menjadi override model per-item (aura-2-en) di rencana;
 *   - `reading-bank.json` — stem soal reading TIDAK ikut korpus pra-render hari ini, tetapi ia
 *     tempat frasa "On balance" berkembang biak. Kalau suatu hari stem itu dibunyikan (tombol
 *     baca-nyaring soal), ia HARUS lewat aura-2-en atau diverifikasi manual. Karena itu ia
 *     dilaporkan sebagai `manual_verify`, bukan disembunyikan.
 *
 * Pencocokan tidak sensitif huruf besar dan menuntut batas kata, supaya "balance" biasa atau
 * "onset" yang memang satu kata tidak ikut tertangkap.
 */
function riskyMatcher(phrase) {
  const parts = String(phrase).trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b${parts.join('\\s+')}\\b`, 'i');
}

export function scanRiskyPhrases(options = {}) {
  const rows = options.rows || collectCorpus(options);
  const matchers = RISKY_PHRASES.map((r) => ({ ...r, re: riskyMatcher(r.phrase) }));
  const corpusHits = [];
  const readingHits = [];
  const byPhrase = {};

  const bump = (phrase) => { byPhrase[phrase] = (byPhrase[phrase] || 0) + 1; };

  for (const row of rows) {
    for (const m of matchers) {
      if (!m.re.test(row.text)) continue;
      corpusHits.push({
        phrase: m.phrase, heardAs: m.heardAs, severity: m.severity, evidence: m.evidence,
        where: 'corpus', domain: row.domain, sourceId: row.sourceId, text: row.text,
        action: 'render_with_' + RISK_MODEL_ID, model: RISK_MODEL_ID
      });
      bump(m.phrase);
      break;
    }
  }

  let readingItems = 0;
  try {
    const bank = readJson(BANKS.reading);
    const items = Array.isArray(bank) ? bank : (bank.items || []);
    for (const item of items) {
      const level = String(item.level || '');
      const candidates = [];
      if (typeof item.text === 'string') candidates.push(['text', item.text]);
      for (const q of item.qs || []) {
        const stem = Array.isArray(q) ? q[0] : (q && q.q);
        if (typeof stem === 'string') candidates.push(['stem', stem]);
      }
      let itemFlagged = false;
      for (const [kind, text] of candidates) {
        for (const m of matchers) {
          if (!m.re.test(text)) continue;
          readingHits.push({
            phrase: m.phrase, heardAs: m.heardAs, severity: m.severity, evidence: m.evidence,
            where: 'reading-bank', kind, level, sourceId: String(item.id || ''), text,
            action: 'render_with_' + RISK_MODEL_ID + '_or_manual_verify', model: RISK_MODEL_ID
          });
          bump(m.phrase);
          itemFlagged = true;
          break;
        }
      }
      if (itemFlagged) readingItems += 1;
    }
  } catch (_) { /* reading-bank absen bukan galat pipeline audio */ }

  const hits = corpusHits.concat(readingHits);
  return {
    phrases: RISKY_PHRASES.map((r) => r.phrase),
    hits,
    corpusHits,
    readingHits,
    readingItems,
    byPhrase,
    riskModelId: RISK_MODEL_ID,
    // Kunci override yang dipakai buildPlan: teks kanonik ⇒ model. Teks, bukan sourceId, karena
    // kalimat berisiko yang sama bisa muncul di dua bank dengan id berbeda dan keduanya harus
    // memakai model yang sama — kalau tidak, satu kalimat dibayar dua kali dengan dua kunci.
    overrides: corpusHits.reduce((acc, hit) => {
      acc[TtsKey.canonicalText(hit.text)] = RISK_MODEL_ID;
      return acc;
    }, {})
  };
}

/**
 * Override model per-item. Tiga sumber, urutan menang dari yang paling eksplisit:
 *   1. `overrides['<domain>:<sourceId>']` atau `overrides['<sourceId>']` — tangan owner;
 *   2. `overrides['text:<teks kanonik>']` atau kunci teks kanonik langsung;
 *   3. deteksi frasa berisiko (otomatis, bisa dimatikan `--no-risk-override`);
 *   4. bawaan `--model` / ENGINE (aura-1).
 */
export function resolveModelFor(row, options = {}) {
  const overrides = options.overrides || {};
  const canonical = TtsKey.canonicalText(row.text);
  const candidates = [
    overrides[`${row.domain}:${row.sourceId}`],
    overrides[String(row.sourceId)],
    overrides[`text:${canonical}`],
    overrides[canonical],
    (options.riskOverrides || {})[canonical],
    options.engineId
  ];
  for (const candidate of candidates) {
    if (candidate) return modelOf(candidate);
  }
  return modelOf(ENGINE.id);
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

  // Override risiko dihidupkan BAWAAN. Mematikannya harus disengaja (`riskOverride: false` /
  // `--no-risk-override`), karena keadaan bawaan yang aman di sini berarti soal C1 tidak
  // terdengar berlawanan arti.
  const risk = options.riskOverride === false
    ? { overrides: {}, corpusHits: [], readingHits: [], hits: [], byPhrase: {}, phrases: RISKY_PHRASES.map((r) => r.phrase), readingItems: 0, riskModelId: RISK_MODEL_ID }
    : scanRiskyPhrases({ ...options, rows });

  const pending = [];
  const seen = new Set();
  let duplicates = 0;
  let ready = 0;
  let plannedChars = 0;
  let plannedCostUsd = 0;
  let overridden = 0;
  const byModel = {};

  for (const row of rows) {
    // Model per-item diselesaikan SEBELUM kunci dihitung, karena engineId/engineVersion masuk
    // hash: satu kalimat yang dipindah ke aura-2-en memang objek berbeda dan memang berbayar
    // sendiri. Itu bukan cacat kunci, itu artinya kunci jujur soal apa yang tersimpan.
    const model = resolveModelFor(row, { ...options, riskOverrides: risk.overrides });
    const identity = TtsKey.build({
      text: row.text,
      locale: options.locale || ENGINE.locale,
      voiceId: options.voiceId || model.voiceId,
      engineId: model.id,
      engineVersion: options.engineVersion || model.engineVersion,
      contentType: row.contentType,
      settings: ENGINE.settings
    });
    const chars = identity.canonicalText.length;
    const entry = {
      ...row, audioKey: identity.audioKey, objectName: TtsKey.objectName(identity),
      chars, canonicalText: identity.canonicalText,
      modelId: model.id, engineVersion: identity.engineVersion, voiceId: identity.voiceId,
      usdPer1kChars: model.usdPer1kChars,
      costUsd: (chars / 1000) * model.usdPer1kChars,
      overridden: model.id !== ENGINE.id
    };
    if (seen.has(identity.audioKey)) { duplicates += 1; continue; }
    seen.add(identity.audioKey);
    if (known.has(identity.audioKey) || extra.has(identity.audioKey)) { ready += 1; continue; }
    if (limit > 0 && pending.length >= limit) continue;
    pending.push(entry);
    plannedChars += chars;
    plannedCostUsd += entry.costUsd;
    if (entry.overridden) overridden += 1;
    byModel[model.id] = byModel[model.id] || { items: 0, chars: 0, costUsd: 0 };
    byModel[model.id].items += 1;
    byModel[model.id].chars += chars;
    byModel[model.id].costUsd += entry.costUsd;
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
    // Biaya campuran: aura-1 untuk mayoritas, aura-2-en untuk item berisiko. Dua kolom di bawah
    // memberi batas atas/bawah yang jujur kalau owner memilih satu model untuk semuanya.
    plannedCostUsd,
    plannedCostAllAura1Usd: (plannedChars / 1000) * MODELS['@cf/deepgram/aura-1'].usdPer1kChars,
    plannedCostAllAura2Usd: (plannedChars / 1000) * MODELS['@cf/deepgram/aura-2-en'].usdPer1kChars,
    byModel,
    overridden,
    risky: {
      phrases: risk.phrases,
      corpusHits: risk.corpusHits.length,
      readingHits: risk.readingHits.length,
      readingItems: risk.readingItems,
      byPhrase: risk.byPhrase,
      model: RISK_MODEL_ID,
      hits: risk.hits
    },
    plannedBytes: plannedChars * CANONICAL.bytesPerChar,
    plannedSeconds: plannedChars / CANONICAL.charsPerSecond
  };
}

function formatReport(census, plan, opts) {
  const lines = [];
  lines.push('FIEZEL pra-render TTS — rencana');
  // engineVersion diambil dari catatan MODEL, bukan dari ENGINE bawaan: `--model=aura-2-en`
  // dengan label versi "cf-aura-1@v1" di header adalah laporan yang berbohong tentang apa yang
  // masuk kunci.
  const headModel = modelOf(opts.engineId || ENGINE.id);
  lines.push(`  mesin        : ${headModel.id} (${opts.engineVersion || headModel.engineVersion})`);
  lines.push(`  kunci        : ${TtsKey.SCHEMA} (speed DIKELUARKAN dari kunci)`);
  lines.push(`  korpus       : ${census.items} kalimat, ${census.totalChars} karakter`);
  for (const [domain, v] of Object.entries(census.byDomain)) {
    lines.push(`    - ${domain.padEnd(20)} ${String(v.items).padStart(6)} item  ${String(v.chars).padStart(8)} karakter`);
  }
  lines.push(`  sudah siap   : ${plan.ready}`);
  lines.push(`  duplikat     : ${plan.duplicates} (kunci sama, dibayar sekali)`);
  lines.push(`  belum ada    : ${plan.pending.length}  (${plan.plannedChars} karakter)`);
  lines.push(`  biaya        : US$${plan.plannedCostUsd.toFixed(2)} untuk batch ini; seluruh korpus US$${census.costUsd.toFixed(2)}`);

  // --- LAPORAN BIAYA DUA MODEL. Harga API Cloudflare, bukan taksiran. -------------------
  const aura1 = MODELS['@cf/deepgram/aura-1'];
  const aura2 = MODELS['@cf/deepgram/aura-2-en'];
  const hours = (s) => `${(s / 3600).toFixed(1)} jam`;
  lines.push('  biaya per model (harga API Cloudflare, per 1.000 karakter):');
  for (const model of [aura1, aura2]) {
    const batch = (plan.plannedChars / 1000) * model.usdPer1kChars;
    lines.push(`    - ${model.id.padEnd(24)} US$${model.usdPer1kChars.toFixed(3)}/1k  ` +
      `batch US$${batch.toFixed(2)}  korpus US$${census.costByModel[model.id].toFixed(2)}  ` +
      `WER ${model.wer.toFixed(3)}  probe ${model.probe.ms} ms/${model.probe.chars} char`);
  }
  lines.push(`    campuran terpakai (aura-1 + override risiko aura-2-en): US$${plan.plannedCostUsd.toFixed(2)} ` +
    `(${plan.overridden} item dipindah ke ${RISK_MODEL_ID})`);
  for (const [id, v] of Object.entries(plan.byModel)) {
    lines.push(`      · ${id.padEnd(24)} ${String(v.items).padStart(5)} item  ${String(v.chars).padStart(7)} char  US$${v.costUsd.toFixed(2)}`);
  }
  lines.push(`  model DITOLAK : ${Object.keys(REJECTED_MODELS).join(', ')} — ${REJECTED_MODELS['@cf/myshell-ai/melotts'].evidence}`);

  // --- DURASI AUDIO dan WAKTU RENDER ---------------------------------------------------
  lines.push(`  durasi audio : ±${hours(plan.plannedSeconds)} batch ini; korpus ±${hours(census.estimatedSeconds)} ` +
    `(estimasi ${CANONICAL.charsPerSecond} karakter/detik, bukan pengukuran)`);
  lines.push(`  waktu render : ±${(census.estimatedRenderMsByModel[aura1.id] / 3600000).toFixed(1)} jam berurutan di aura-1; ` +
    `±${(census.estimatedRenderMsByModel[aura2.id] / 3600000).toFixed(1)} jam di aura-2-en (dari probe nyata 84 karakter)`);

  // --- PENYIMPANAN R2 -----------------------------------------------------------------
  lines.push(`  ukuran R2    : ±${(plan.plannedBytes / 1e9).toFixed(3)} GB batch ini; korpus ±${(census.estimatedBytes / 1e9).toFixed(2)} GB (free tier 10 GB)`);
  lines.push(`                 kalibrasi 925 byte/karakter (273 aset nyata). Probe Workers AI memberi ` +
    `${Math.round(aura1.probe.bytes / aura1.probe.chars)} byte/char (aura-1) dan ` +
    `${Math.round(aura2.probe.bytes / aura2.probe.chars)} byte/char (aura-2-en) ⇒ korpus ±` +
    `${(census.estimatedBytesByModel[aura1.id] / 1e9).toFixed(2)}–${(census.estimatedBytesByModel[aura2.id] / 1e9).toFixed(2)} GB. ` +
    'Angka 925 dipakai sebagai batas atas; ketiganya jauh di dalam 10 GB.');

  // --- FRASA BERISIKO ------------------------------------------------------------------
  lines.push(`  frasa risiko : ${plan.risky.corpusHits} baris korpus + ${plan.risky.readingHits} stem/teks reading-bank ` +
    `(${plan.risky.readingItems} soal) wajib ${plan.risky.model} atau verifikasi manual`);
  for (const [phrase, n] of Object.entries(plan.risky.byPhrase)) {
    lines.push(`      · "${phrase}" ${n} kemunculan`);
  }
  if (!Object.keys(plan.risky.byPhrase).length) lines.push('      · tidak ada kemunculan pada filter ini');
  lines.push('                 Sebabnya terukur: aura-1 membaca "On balance" sampai Whisper menuliskan ' +
    '"Unbalanced" — arti berlawanan pada stem soal C1. aura-2-en benar.');

  // --- JATAH GRATIS -------------------------------------------------------------------
  lines.push(`  neuron       : ±${census.estimatedNeurons} untuk seluruh korpus = ${census.freeDaysNeeded} hari jatah gratis (10.000/hari).`);
  lines.push('               JATAH GRATIS TIDAK CUKUP — pra-render adalah biaya yang dibelanjakan, bukan ditunggu.');
  lines.push(`               Workers AI Free = ${CANONICAL.freeNeuronsPerDay} neuron/hari untuk SELURUH akun; korpus butuh ` +
    `±${census.estimatedNeurons} neuron. Pra-render WAJIB dibayar sekali (US$${census.costByModel[aura1.id].toFixed(2)} di aura-1).`);
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

/**
 * DIEKSPOR sejak A12 dengan satu alasan: `tts-provider-contract-test.js` memanggil jalur INI
 * (dengan `fetch` global distub) lalu membandingkan badan permintaannya dengan badan yang dikirim
 * `route-tts.js`. Tanpa itu, "kedua jalur cocok" hanya bisa diuji dengan menuliskan daftar
 * parameter untuk KEDUA kalinya di dalam gerbang — tepat duplikasi yang melahirkan cacat ini.
 */
export async function workersAiTts(env, text, modelId) {
  // modelOf melempar untuk model yang DITOLAK (melotts) dan yang tak dikenal. Penjagaan ini di
  // sini, tepat sebelum satu-satunya panggilan berbayar, bukan di parseArgs saja — override
  // per-item bisa datang dari berkas JSON yang tidak lewat parseArgs.
  const model = modelOf(modelId);
  // Badan permintaan dibangun registry bersama, bukan literal di sini. `FIEZEL_TTS_SPEAKER`
  // tetap boleh menimpa voice — dan kalau ia dipakai, kuncinya memang harus berbeda.
  const input = ProviderParams.buildProviderInput({
    engineId: model.id,
    text,
    voiceId: env.speaker || model.voiceId,
    locale: ENGINE.locale
  });
  const response = await fetch(`${R2_API}/${env.accountId}/ai/run/${model.id}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input)
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

/**
 * `--override` bisa diulang: `--override=listening:l0042=@cf/deepgram/aura-2-en`.
 * `--overrides-file` menerima JSON {"<domain>:<sourceId>"|"text:<teks>": "<modelId>"}.
 * Keduanya diperiksa terhadap MODELS/REJECTED_MODELS saat dibaca, supaya salah ketik model
 * gagal SEBELUM ada dolar yang bergerak, bukan di tengah batch.
 */
function parseArgs(argv) {
  const out = {
    content: 'all', limit: 0, budgetUsd: 1.0, apply: false, bookId: '',
    engineId: '', overrides: {}, riskOverride: true
  };
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) continue;
    const [, name, value] = m;
    if (name === 'apply') out.apply = true;
    else if (name === 'content') out.content = String(value || 'all');
    else if (name === 'limit') out.limit = Number(value || 0);
    else if (name === 'budget-usd') out.budgetUsd = Number(value || 0);
    else if (name === 'book-id') out.bookId = String(value || '');
    else if (name === 'model') out.engineId = modelOf(value).id;
    else if (name === 'no-risk-override') out.riskOverride = false;
    else if (name === 'override') {
      const at = String(value || '').lastIndexOf('=');
      if (at > 0) {
        const target = String(value).slice(0, at);
        out.overrides[target] = modelOf(String(value).slice(at + 1)).id;
      }
    } else if (name === 'overrides-file') {
      const doc = JSON.parse(fs.readFileSync(String(value), 'utf8'));
      for (const [target, modelId] of Object.entries(doc)) out.overrides[target] = modelOf(modelId).id;
    }
  }
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const census = censusCorpus({ content: opts.content, bookId: opts.bookId });
  const manifest = loadManifest();
  const plan = buildPlan({
    content: opts.content, bookId: opts.bookId, limit: opts.limit, manifest,
    engineId: opts.engineId || '', overrides: opts.overrides, riskOverride: opts.riskOverride
  });

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
  let spentUsd = 0;

  for (const entry of plan.pending) {
    // HEAD SEBELUM PROVIDER, setiap kali. Manifest lokal bisa tertinggal dari R2 (push manifest
    // gagal padahal objeknya sudah ditulis), dan mempercayainya berarti membayar ulang.
    const head = await r2Head(env, entry.objectName);
    if (head.bytes) {
      manifest.assets[entry.audioKey] = {
        state: 'ready', url: `a/${entry.objectName}`, bytes: head.bytes, chars: entry.chars,
        domain: entry.domain, sourceId: entry.sourceId, engineId: entry.modelId,
        engineVersion: entry.engineVersion, voiceId: entry.voiceId, contentType: entry.contentType
      };
      recovered += 1;
      continue;
    }
    if (head.error) { failed += 1; continue; }

    // Anggaran dihitung dengan harga MODEL ITEM ITU, bukan harga bawaan: item yang dipindah ke
    // aura-2-en berbiaya dua kali, dan menghitungnya dengan tarif aura-1 akan melewati batas
    // anggaran tanpa satu pun peringatan.
    if (spentUsd + entry.costUsd > opts.budgetUsd) {
      console.log('Anggaran batch tercapai; berhenti dengan rapi.');
      break;
    }

    const audio = await workersAiTts(env, entry.canonicalText, entry.modelId);
    if (audio.error) { failed += 1; continue; }
    spentChars += entry.chars;
    spentUsd += entry.costUsd;

    const putError = await r2Put(env, entry.objectName, audio.bytes);
    if (putError) { failed += 1; continue; }

    // Dibaca ULANG dari R2 sebelum ditandai ready (pasal 7 pipeline lama): balasan sukses dari
    // API bukan bukti berkasnya bisa diambil kembali, dan entri `ready` yang 404 terdengar sebagai
    // "aset rusak" bagi murid.
    const verify = await r2Head(env, entry.objectName);
    if (!verify.bytes || verify.bytes !== audio.bytes.length) { failed += 1; continue; }

    manifest.assets[entry.audioKey] = {
      state: 'ready', url: `a/${entry.objectName}`, bytes: verify.bytes, chars: entry.chars,
      domain: entry.domain, sourceId: entry.sourceId, engineId: entry.modelId,
      engineVersion: entry.engineVersion, voiceId: entry.voiceId, contentType: entry.contentType,
      // Kenapa item ini memakai model lain dicatat di manifest, bukan hanya di log CI: enam bulan
      // dari sekarang "kenapa 12 objek ini aura-2-en?" harus terjawab dari katalog itu sendiri.
      riskOverride: entry.overridden ? 'risky_phrase' : undefined
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

  console.log(`\nselesai: ${produced} aset baru (US$${spentUsd.toFixed(2)}, ${spentChars} karakter), ` +
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
