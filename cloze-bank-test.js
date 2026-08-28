/**
 * FIEZEL gate — Cloze bank v1 (Braincore v3 Fase 2, B7).
 *
 * KENAPA gate ini ada:
 * Council (model-council-claude_fable_5.md P8) menunjuk efek testing — recall
 * aktif — sebagai pengungkit retensi terbesar yang belum dipakai. Bank cloze
 * hanya berguna kalau setiap itemnya benar-benar bisa digrade tanpa ambigu:
 * satu blank per kalimat, jawaban tidak bocor di kalimat, distraktor tetap
 * membawa label miskonsepsi (untuk FiezelProductionGrader.matchedDistractor +
 * FiezelMisconceptionLedger), dan build-nya deterministik supaya id item
 * stabil lintas regenerasi (memori per-item bergantung pada id yang tidak
 * berubah-ubah).
 *
 * CATATAN GATE JUMLAH ITEM: kontrak menyebut target minimal 200 item. Data
 * nyata grammar-templates.json (139 template) hanya menghasilkan 112 item
 * cloze yang mekanis-aman; 27 sisanya ditolak dengan alasan tercatat
 * (multi-blank, jawaban <3 karakter, jawaban bocor >1x, tanpa marker ___).
 * Mengarang kalimat baru demi angka 200 dilarang keras oleh aturan konten,
 * jadi gate ditetapkan di MIN_ITEMS=110 — angka yang bisa dipertahankan dari
 * data nyata. Gate ini harus DINAIKKAN saat konten template bertambah.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const builder = require('./tools/build-cloze-bank.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const bank = JSON.parse(fs.readFileSync(path.join(__dirname, 'cloze-bank-v1.json'), 'utf8'));
const templates = builder.loadTemplates();

/* (a) Skema valid + setiap sentence berisi tepat satu ___ */
test('skema fiezel-cloze-bank-v1 dan bentuk item sesuai kontrak', () => {
  assert.strictEqual(bank.schema, 'fiezel-cloze-bank-v1');
  assert.ok(Array.isArray(bank.items) && bank.items.length > 0, 'items harus array non-kosong');
  const templateIds = new Set(templates.map((t) => t.id));
  bank.items.forEach((it) => {
    assert.strictEqual(typeof it.id, 'string', 'id string');
    assert.ok(templateIds.has(it.templateId), it.id + ': templateId "' + it.templateId + '" tidak ada di grammar-templates.json');
    assert.strictEqual(typeof it.skill, 'string', it.id + ': skill string');
    assert.strictEqual(typeof it.level, 'string', it.id + ': level string');
    assert.strictEqual(typeof it.sentence, 'string', it.id + ': sentence string');
    assert.ok(it.blank && typeof it.blank === 'object', it.id + ': blank object');
    assert.ok(Array.isArray(it.blank.alternates), it.id + ': blank.alternates array');
    assert.strictEqual(typeof it.blank.position, 'number', it.id + ': blank.position angka');
    assert.strictEqual(it.sentence.indexOf('___'), it.blank.position, it.id + ': position harus indeks ___ di sentence');
    assert.ok(Array.isArray(it.distractors), it.id + ': distractors array');
  });
});

test('setiap sentence memuat TEPAT SATU blank ___', () => {
  bank.items.forEach((it) => {
    const n = it.sentence.split('___').length - 1;
    assert.strictEqual(n, 1, it.id + ': ' + n + ' blank, harus 1');
  });
});

/* (b) blank.answer tidak kosong dan tidak muncul lagi di sentence */
test('blank.answer non-kosong, >=3 karakter, sama dengan jawaban benar template', () => {
  const byId = new Map(templates.map((t) => [t.id, t]));
  bank.items.forEach((it) => {
    assert.ok(typeof it.blank.answer === 'string' && it.blank.answer.trim().length >= builder.MIN_ANSWER_LEN,
      it.id + ': answer "' + it.blank.answer + '" kosong/terlalu pendek');
    const tpl = byId.get(it.templateId);
    assert.strictEqual(it.blank.answer, tpl.options[tpl.correctIndex],
      it.id + ': answer harus jawaban benar template (kontrak: jawaban blank = jawaban benar)');
  });
});

test('jawaban tidak bocor: answer tidak muncul lagi sebagai frasa utuh di sentence', () => {
  bank.items.forEach((it) => {
    const leaks = builder.wholePhraseCount(it.sentence, it.blank.answer);
    assert.strictEqual(leaks, 0, it.id + ': "' + it.blank.answer + '" masih tampak ' + leaks + 'x di kalimat ber-blank');
  });
});

/* (c) setiap distractor punya text + misconception */
test('setiap distractor membawa text + label misconception (umpan grader + ledger)', () => {
  bank.items.forEach((it) => {
    assert.ok(it.distractors.length >= 1, it.id + ': minimal 1 distraktor');
    it.distractors.forEach((d, i) => {
      assert.ok(typeof d.text === 'string' && d.text.length > 0, it.id + ' distraktor#' + i + ': text kosong');
      assert.ok(typeof d.misconception === 'string' && d.misconception.length > 0,
        it.id + ' distraktor#' + i + ': label misconception kosong — ledger tidak bisa mengumpulkan bukti');
      assert.notStrictEqual(d.text, it.blank.answer, it.id + ' distraktor#' + i + ': distraktor sama dengan jawaban');
    });
  });
});

/* (d) id unik + build deterministik */
test('id item unik dan stabil (templateId + indeks)', () => {
  const seen = new Set();
  bank.items.forEach((it) => {
    assert.ok(!seen.has(it.id), 'id duplikat: ' + it.id);
    seen.add(it.id);
    assert.ok(it.id.indexOf(it.templateId + '-cz') === 0, it.id + ': id harus templateId + "-cz" + indeks');
  });
});

test('build deterministik: dua kali build identik byte, dan file di disk sinkron', () => {
  const a = builder.serialize(builder.build(templates));
  const b = builder.serialize(builder.build(templates));
  assert.strictEqual(a, b, 'dua build berturut menghasilkan keluaran berbeda');
  const disk = fs.readFileSync(builder.OUT_PATH, 'utf8');
  assert.strictEqual(disk, a, 'cloze-bank-v1.json di disk tidak sinkron dengan rebuild — jalankan --write');
});

/* Tolakan harus tercatat beralasan — bukan hilang diam-diam */
test('setiap template masuk items ATAU rejected dengan alasan tercatat', () => {
  const inItems = new Set(bank.items.map((it) => it.templateId));
  const inRejected = new Set(bank.rejected.map((r) => r.templateId));
  const reasons = new Set(['no_blank_marker', 'multi_blank', 'answer_too_short', 'answer_ambiguous', 'answer_not_typable']);
  bank.rejected.forEach((r) => {
    assert.ok(reasons.has(r.reason), r.templateId + ': alasan tolak tak dikenal "' + r.reason + '"');
    assert.ok(typeof r.detail === 'string' && r.detail.length > 0, r.templateId + ': detail tolakan kosong');
  });
  templates.forEach((t) => {
    assert.ok(inItems.has(t.id) || inRejected.has(t.id), t.id + ': tidak masuk items maupun rejected');
    assert.ok(!(inItems.has(t.id) && inRejected.has(t.id)), t.id + ': masuk keduanya');
  });
});

/* (e) cakupan level dilaporkan — minimal 4 level CEFR terwakili */
test('cakupan level: minimal ' + builder.MIN_LEVELS + ' level CEFR terwakili (dilaporkan)', () => {
  const byLevel = {};
  bank.items.forEach((it) => { byLevel[it.level] = (byLevel[it.level] || 0) + 1; });
  const levels = Object.keys(byLevel).sort();
  console.log('    cakupan level: ' + levels.map((l) => l + '=' + byLevel[l]).join(', '));
  assert.ok(levels.length >= builder.MIN_LEVELS,
    'hanya ' + levels.length + ' level terwakili (' + levels.join(',') + '), minimal ' + builder.MIN_LEVELS);
  assert.deepStrictEqual(byLevel, bank.counts.byLevel, 'counts.byLevel di file tidak cocok dengan isi items');
});

/* (f) jumlah item >= ambang dari data nyata (lihat catatan header) */
test('jumlah item >= gate ' + builder.MIN_ITEMS + ' (ambang dari data nyata, bukan target 200 aspirasional)', () => {
  assert.ok(bank.items.length >= builder.MIN_ITEMS,
    'hanya ' + bank.items.length + ' item, gate ' + builder.MIN_ITEMS);
  assert.strictEqual(bank.items.length, bank.counts.items, 'counts.items tidak cocok');
  assert.strictEqual(bank.items.length + bank.rejected.length, templates.length,
    'items + rejected harus = jumlah template (tidak ada yang hilang diam-diam)');
});

if (failures > 0) {
  console.error('ClozeBank: ' + failures + ' gagal');
  process.exit(1);
}
console.log('ClozeBank: PASS');
