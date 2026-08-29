#!/usr/bin/env node
/**
 * sync-grammar-explanations-id.js — Pemilik: F2 (wave F, gate anti-drift konten)
 *
 * KENAPA alat ini ada:
 * grammar-explanations-id.json disebut "sumber kebenaran terjemahan", tetapi
 * sejarah repo membuktikan arus perbaikan nyata berjalan SEBALIKNYA: perbaikan
 * konten dikerjakan (dan di-QA gerbang CI) langsung di grammar-templates.json
 * — field "...Id" — dan berkas sumbernya tertinggal diam-diam:
 *
 *   - b0d983c (Wave D): 4 soal fatal (TA-006, GI-002, b4_003, b4_018)
 *     diperbaiki di grammar-templates.json; grammar-explanations-id.json
 *     0 baris berubah. CI hijau.
 *   - c3e02f3 (E3, ±18 jam kemudian): 11 entri penjelasan basi (b4_018 dkk)
 *     ditemukan lewat AUDIT TANGAN, bukan oleh gerbang mana pun.
 *   - 5643a32 (wave2, 20 agen QA): menulis ulang puluhan whyFailsId di bank;
 *     berkas sumber terakhir disentuh m025-162 — 59 nilai distraktor melenceng.
 *   - f87a39a (GEN-2): 27 template baru, entri sumbernya dibuat TANPA blok
 *     distractors (10 entri A1-008..A1-017) dan indonesianCoverage dibiarkan
 *     222/222 padahal templates.length=249. Semua gerbang tetap hijau.
 *
 * Alat ini membuat kedua berkas bisa DISAMAKAN secara mekanis — nol karangan:
 * setiap nilai yang ditulis ke berkas sumber disalin verbatim dari field
 * "...Id" bank yang sudah lolos QA. Invarian kesamaannya dijaga oleh
 * content-drift-test.js; alat ini adalah tombol perbaikannya.
 *
 * Cara pakai:
 *   node tools/sync-grammar-explanations-id.js           -> cek; exit 1 bila drift
 *   node tools/sync-grammar-explanations-id.js --write   -> tulis ulang berkas sumber
 *                                                           dari field ...Id bank
 *
 * Setelah --write, jalankan `node audit/merge-grammar-id.js` supaya
 * indonesianCoverage di bank ikut dihitung ulang (alur resmi m025-125).
 *
 * Determinisme: tanpa Math.random, tanpa Date.now; urutan entri mengikuti
 * urutan yang sudah ada di berkas sumber, entri baru menyusul sesuai urutan
 * template di bank; bentuk serialisasi = JSON.stringify(..., null, 2) persis
 * konvensi kedua berkas saat ini.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK_PATH = path.join(ROOT, 'grammar-templates.json');
const SOURCE_PATH = path.join(ROOT, 'grammar-explanations-id.json');

/* Urutan kunci kanonik entri sumber — persis urutan 239 entri yang sudah ada. */
const ENTRY_KEYS = ['objective', 'misconception', 'reasoning', 'rule', 'whyCorrect',
  'whyOthersFail', 'howToAvoid', 'memoryCue', 'distractors'];

function loadBank() { return JSON.parse(fs.readFileSync(BANK_PATH, 'utf8')); }
function loadSource() { return JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8')); }

/** Entri sumber yang SEHARUSNYA ada untuk satu template, disalin dari field ...Id bank. */
function entryFromBank(t) {
  const ex = t.explanation || {};
  const entry = {
    objective: String(t.pedagogicalObjectiveId || ''),
    misconception: String(t.misconceptionTargetedId || ''),
    reasoning: String(t.reasoningOperationId || ''),
    rule: String(ex.ruleId || ''),
    whyCorrect: String(ex.whyCorrectId || ''),
    whyOthersFail: String(ex.whyOthersFailId || ''),
    howToAvoid: String(ex.howToAvoidId || ''),
    memoryCue: String(ex.memoryCueId || ''),
    distractors: {},
  };
  for (const d of t.distractors || []) {
    entry.distractors[String(d.option)] = {
      misconception: String(d.misconceptionId || ''),
      whyFails: String(d.whyFailsId || ''),
    };
  }
  return entry;
}

/**
 * Bangun berkas sumber tersinkron dari bank + sumber lama.
 * Urutan entri lama dipertahankan; entri baru ditambahkan mengikuti urutan bank.
 * Mengembalikan { source, changes: [{id, what}] }.
 */
function buildSynced(bank, oldSource) {
  const byId = new Map((bank.templates || []).map((t) => [String(t.id), t]));
  const out = { schema: oldSource.schema, catatan: oldSource.catatan, templates: {} };
  const changes = [];

  for (const [id, oldEntry] of Object.entries(oldSource.templates || {})) {
    const t = byId.get(id);
    if (!t) { changes.push({ id, what: 'entri yatim dibuang (template sudah tidak ada)' }); continue; }
    const fresh = entryFromBank(t);
    const rebuilt = {};
    for (const k of ENTRY_KEYS) rebuilt[k] = fresh[k];
    if (JSON.stringify(rebuilt) !== JSON.stringify(normalizeEntry(oldEntry))) {
      changes.push({ id, what: 'disamakan dengan field ...Id bank' });
    }
    out.templates[id] = rebuilt;
  }
  for (const t of bank.templates || []) {
    const id = String(t.id);
    if (!out.templates[id]) {
      out.templates[id] = entryFromBank(t);
      changes.push({ id, what: 'entri baru dibuat dari field ...Id bank' });
    }
  }
  return { source: out, changes };
}

/* Bentuk entri lama dengan urutan kunci kanonik + distractors selalu objek,
 * supaya perbandingan "berubah/tidak" tidak berbunyi karena urutan kunci saja. */
function normalizeEntry(e) {
  const n = {};
  for (const k of ENTRY_KEYS) n[k] = k === 'distractors' ? (e[k] || {}) : String(e[k] || '');
  return n;
}

function serialize(source) { return JSON.stringify(source, null, 2); }

function main() {
  const write = process.argv.indexOf('--write') !== -1;
  const bank = loadBank();
  const oldSource = loadSource();
  const { source, changes } = buildSynced(bank, oldSource);
  const next = serialize(source);
  const disk = fs.readFileSync(SOURCE_PATH, 'utf8');

  if (write) {
    fs.writeFileSync(SOURCE_PATH, next);
    console.log('grammar-explanations-id.json ditulis ulang: ' + changes.length + ' entri berubah.');
    for (const c of changes.slice(0, 20)) console.log('  - ' + c.id + ': ' + c.what);
    if (changes.length > 20) console.log('  ... (+' + (changes.length - 20) + ' lagi)');
    console.log('Lanjutkan dengan: node audit/merge-grammar-id.js');
    return;
  }
  if (disk === next) { console.log('SINKRON: grammar-explanations-id.json sudah sama dengan field ...Id bank.'); return; }
  console.error('DRIFT: ' + changes.length + ' entri berbeda dari field ...Id grammar-templates.json.');
  for (const c of changes.slice(0, 20)) console.error('  - ' + c.id + ': ' + c.what);
  console.error('Perbaiki dengan: node tools/sync-grammar-explanations-id.js --write && node audit/merge-grammar-id.js');
  process.exit(1);
}

if (require.main === module) main();

module.exports = { loadBank, loadSource, entryFromBank, buildSynced, serialize, ENTRY_KEYS, SOURCE_PATH, BANK_PATH };
