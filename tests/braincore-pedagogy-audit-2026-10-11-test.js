#!/usr/bin/env node
'use strict';
/**
 * tests/braincore-pedagogy-audit-2026-10-11-test.js — gerbang untuk temuan audit pedagogi
 * reports/BRAINCORE-PEDAGOGY-AUDIT-2026-10-11.md. Node murni: fungsi yang diuji DIPOTONG dari
 * app.js asli dan dijalankan di vm (bukan salinan), lalu dicobakan ke SELURUH bank soal.
 *
 * P1  Susun kata: murid yang hanya keliru urutan tidak pernah dituduh memasang pengecoh
 *     (75 soal punya pengecoh yang juga kata sah kalimatnya: "a" di "in a box").
 * P2  Alasan yang tampil sebelum jawaban dibuka tidak menyebut kunci (id + th).
 * P3  Terjemahan yang urutannya sah ("I watched a film ... last night") diterima penilai;
 *     pembangkit urutan alternatif tidak pernah membuat kalimat salah.
 * P4  Diagnosis urutan tidak lagi menempel aturan tense/HTML.
 * P5  Murid Thai tidak menerima soal susun kata berbahasa Indonesia.
 * P6  Mode "bandingkan" tidak lagi beralasan "cuma kunci yang cocok".
 * P7  Soal percakapan (video-grammar cadangan) membawa alasan per pilihan + sourceId.
 * P8  Petunjuk tingkat 1 memakai langkah penalaran template, bukan "subjek & penanda waktu".
 * D*  Data: alasan bank yang diperbaiki, templat reading "tidak ada di teks".
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const __fzRoot = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));
const app = read('app.js');

function slice(startMarker, endMarker) {
  const a = app.indexOf(startMarker);
  const b = app.indexOf(endMarker, a + startMarker.length);
  assert.ok(a >= 0 && b > a, 'potongan app.js tidak ditemukan: ' + startMarker);
  return app.slice(a, b);
}

// Fungsi yang belum ada di app.js (mis. di basis sebelum perbaikan) diganti stub yang melempar,
// supaya setiap cek gagal sendiri-sendiri dengan pesan yang jelas, bukan seluruh gerbang crash.
function sliceOrStub(name, startMarker, endMarker) {
  try { return slice(startMarker, endMarker); }
  catch (_) { return 'function ' + name + '(){throw new Error(' + JSON.stringify(name + ' tidak ada di app.js') + ')}'; }
}
let locale = 'id';
const ctx = { FiezelI18n: { getLocale: () => locale } };
vm.createContext(ctx);
vm.runInContext([
  slice('function tokenOrderInversionClue(', '/**\n * Alasan Indonesia mengapa pilihan yang diambil murid gagal.'),
  slice('function diagnoseTokenOrderMistake(', '/**\n * Entri alasan (q.explain.distractors)'),
  sliceOrStub('grammarHideKey', 'function grammarHideKey(', 'function tutorWhyFails('),
  sliceOrStub('tokenOrderMovableAlternates', 'function tokenOrderMovableAlternates(', 'function makeGrammarTokenOrderQuestion('),
  'this.diagnoseTokenOrderMistake=diagnoseTokenOrderMistake;this.grammarHideKey=grammarHideKey;this.tokenOrderMovableAlternates=tokenOrderMovableAlternates;'
].join('\n'), ctx);

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (error) { fail++; console.error('FAIL - ' + name + '\n    ' + String(error.message).split('\n').join('\n    ')); }
}

const T = json('grammar-templates.json').templates;
const TH = json('grammar-explanations-th.json').templates;
const cleanWord = (w) => String(w || '').trim().replace(/^[^\w\s]+|[^\w\s]+$/g, '');
const gradeNorm = (s) => String(s || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
const wordRx = (k) => new RegExp("(^|[^A-Za-z0-9'’])" + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(?=[^A-Za-z0-9'’]|$)", 'i');

// Soal susun kata dirakit dengan aturan yang sama dengan makeGrammarTokenOrderQuestion().
function tokenQuestion(t, thai) {
  const base = String(t.stem || '').trim(), correct = String(t.options[t.correctIndex] || '').trim();
  const blanks = base.match(/_{2,}|\[\.\.\.\]/g);
  if (!blanks || blanks.length !== 1) return null;
  if (/^(find and correct|which sentence|correct the error|what is the plural)\b/i.test(base)) return null;
  if (!correct || /[;/]/.test(correct) || correct.split(/\s+/).length > 3) return null;
  const full = base.replace(/_{2,}|\[\.\.\.\]/g, correct).trim();
  if (!full.includes(correct)) return null;
  const tokens = full.split(/\s+/).map(cleanWord).filter(Boolean);
  if (tokens.length < 3 || tokens.length > 18) return null;
  const distractors = t.options.filter((_, i) => i !== t.correctIndex).map(cleanWord).filter((w) => w && !w.includes(' ') && !/[;/]/.test(w)).slice(0, 2);
  const explainDistractors = distractors.map((d) => {
    const src = t.distractors.find((x) => cleanWord(x.option).toLowerCase() === d.toLowerCase()) || {};
    const reason = thai ? String(TH[t.id]?.distractors?.[src.option]?.whyFails || '') : String(src.whyFailsId || '');
    return { option: d, reason, whyFailsId: reason };
  });
  return { type: 'token-order', tokens, distractors, blankAnswer: correct, options: [full], answerIndex: 0, explain: { rule: String(t.explanation?.ruleId || ''), distractors: explainDistractors }, __full: full, __id: t.id };
}
const tokenQs = T.map((t) => tokenQuestion(t, false)).filter(Boolean);

test('P1 susun kata: salah urutan murni tidak pernah dituduh memasang pengecoh (seluruh bank)', () => {
  locale = 'id';
  const accused = [];
  let shared = 0;
  for (const q of tokenQs) {
    if (q.distractors.some((d) => q.tokens.some((x) => x.toLowerCase() === d.toLowerCase()))) shared++;
    // Tukar dua kata bersebelahan yang berbeda: semua kata sah terpasang, hanya urutannya keliru.
    const i = q.tokens.findIndex((w, k) => k < q.tokens.length - 1 && w.toLowerCase() !== q.tokens[k + 1].toLowerCase());
    if (i < 0) continue;
    const placed = q.tokens.slice();[placed[i], placed[i + 1]] = [placed[i + 1], placed[i]];
    const msg = ctx.diagnoseTokenOrderMistake(Object.assign({}, q, { __placedTokens: placed, __unplacedTokens: q.distractors.slice() }));
    if (/^Kata “/.test(msg)) accused.push(q.__id + ': ' + msg.slice(0, 90));
  }
  assert.ok(shared >= 50, 'kasus uji melemah: hanya ' + shared + ' soal berpengecoh-kembar');
  assert.deepStrictEqual(accused, [], accused.length + ' tuduhan palsu, mis.: ' + accused.slice(0, 3).join(' | '));
});

test('P1 susun kata: pengecoh yang SUNGGUH dipasang tetap dikenali dan dinamai', () => {
  locale = 'id';
  let checked = 0;
  for (const q of tokenQs) {
    const d = q.distractors[0];
    if (!d || q.tokens.some((x) => x.toLowerCase() === d.toLowerCase())) continue;
    const at = q.tokens.findIndex((x) => x.toLowerCase() === cleanWord(q.blankAnswer).toLowerCase());
    if (at < 0) continue;
    const placed = q.tokens.slice(); placed[at] = d;
    const msg = ctx.diagnoseTokenOrderMistake(Object.assign({}, q, { __placedTokens: placed, __unplacedTokens: [q.tokens[at]] }));
    assert.ok(msg.includes('“' + d + '”'), q.__id + ': pengecoh "' + d + '" tidak dinamai: ' + msg);
    checked++;
  }
  assert.ok(checked > 200, 'terlalu sedikit soal teruji: ' + checked);
});

test('P2 alasan sebelum pembahasan tidak menyebut kunci — seluruh bank id + th, MC dan susun kata', () => {
  const leaks = [];
  let masked = 0;
  for (const t of T) {
    const key = String(t.options[t.correctIndex] || '');
    for (const d of t.distractors) {
      for (const reason of [String(d.whyFailsId || ''), String(TH[t.id]?.distractors?.[d.option]?.whyFails || '')]) {
        if (!reason) continue;
        const out = ctx.grammarHideKey(reason, key, d.option);
        if (out !== reason) masked++;
        // Kunci boleh tersisa HANYA di dalam teks pilihan murid sendiri ("To open" vs kunci "Open").
        const withoutOwn = out.replace(new RegExp(d.option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
        if (wordRx(key).test(withoutOwn)) leaks.push(t.id + ' [' + d.option + '] ' + out.slice(0, 100));
      }
    }
  }
  assert.ok(masked >= 150, 'pemeriksaan melemah: hanya ' + masked + ' alasan yang memuat kunci');
  assert.deepStrictEqual(leaks, [], leaks.length + ' alasan masih menyebut kunci: ' + leaks.slice(0, 3).join(' | '));
});

test('P2 penyamar kunci: kalimat tetap utuh, alasan tanpa kunci tidak berubah', () => {
  assert.strictEqual(ctx.grammarHideKey('sesudah “wish” kata kerjanya mundur: “can” jadi “could”.', 'could', 'can'), 'sesudah “wish” kata kerjanya mundur: “can” jadi “…”.');
  assert.strictEqual(ctx.grammarHideKey('“To open” kesannya nyatain tujuan.', 'Open', 'To open'), '“To open” kesannya nyatain tujuan.');
  assert.strictEqual(ctx.grammarHideKey('bentuk lampau, padahal “usually” nunjuk kebiasaan.', 'walks', 'walked'), 'bentuk lampau, padahal “usually” nunjuk kebiasaan.');
  assert.strictEqual(ctx.grammarHideKey('รูปอดีตของมันคือ “could”', 'could', 'can'), 'รูปอดีตของมันคือ “…”');
  assert.strictEqual(ctx.grammarHideKey('', 'could', 'can'), '');
});

test('P2 kabel: nudge retry, diagnosis susun kata saat retry, tutor sebelum tell, petunjuk sebelum menjawab', () => {
  assert.match(app, /let cleanReason=grammarHideKey\(String\(rawReason\|\|''\)\.trim\(\),q\.options\?\.\[q\.answerIndex\],userChoice\)/);
  assert.match(app, /q\.__diagnosticClue=diagnoseTokenOrderMistake\(q,\{hideKey:true\}\)/);
  assert.match(app, /const preReveal=!ok&&scaffold!=='tell';/);
  assert.match(app, /preReveal\?grammarHideKey\(tutorWhyFails\(q,chosenText\)/);
  assert.match(app, /blankAnswer:correct,/);
  const up = read('features/grammar/fiezel-grammar-upgrade.js');
  assert.match(up, /text: hideKey\(exp\.avoid\)/);
  assert.match(up, /`💡 \$\{hideKey\(exp\.memory\)\}`/);
  assert.ok(!/exp\.distractors\[0\]\.reason/.test(up), 'tingkat 3 masih bisa jatuh ke alasan pilihan pertama (kadang alasan KUNCI)');
});

test('P3 terjemahan berurutan sah diterima; pembangkit urutan alternatif tidak membuat kalimat salah', () => {
  const accept = (full, answer) => [full, ...ctx.tokenOrderMovableAlternates(full)].some((x) => gradeNorm(x) === gradeNorm(answer));
  assert.ok(accept('Last night I watched a film with my family.', 'I watched a film with my family last night'));
  assert.ok(accept('Yesterday I found an old photo in a box. The photo shows my grandma.', 'I found an old photo in a box yesterday The photo shows my grandma'));
  assert.ok(accept('If you finish your homework tonight, we will watch a film together.', 'we will watch a film together if you finish your homework tonight'));
  assert.ok(accept('My dad watches the news every evening.', 'Every evening my dad watches the news'));
  assert.ok(accept('Despite the heavy rain, the outdoor concert went ahead as planned.', 'the outdoor concert went ahead as planned despite the heavy rain'));
  // Yang TIDAK boleh lahir: keterangan waktu yang sebenarnya pelengkap "than", subjek "Today",
  // kalimat tanya, dan klausa yang masih bercabang.
  assert.ok(!accept('The traffic today is worse than yesterday. We will be late.', 'yesterday the traffic today is worse than we will be late'));
  // Larik dari konteks vm beda realm: dibandingkan panjangnya, bukan deepStrictEqual.
  assert.strictEqual(ctx.tokenOrderMovableAlternates('Today is the first day of the school year.').length, 0);
  assert.strictEqual(ctx.tokenOrderMovableAlternates('Do you usually ride your bike to school every day?').length, 0);
  assert.strictEqual(ctx.tokenOrderMovableAlternates('If I won the lottery, I would travel the world, but I never even buy a ticket.').length, 0);
  let withAlt = 0;
  for (const q of tokenQs) {
    const alts = ctx.tokenOrderMovableAlternates(q.__full);
    if (alts.length) withAlt++;
    const bag = (s) => s.split(/\s+/).map(cleanWord).filter(Boolean).map((w) => w.toLowerCase()).sort().join(' ');
    for (const a of alts) assert.strictEqual(bag(a), bag(q.__full), q.__id + ': alternatif bukan permutasi kata yang sama: ' + a);
  }
  assert.ok(withAlt >= 50, 'cakupan alternatif turun: ' + withAlt);
  assert.match(app, /for\(const alt of tokenOrderMovableAlternates\(fullSentence\)\)if\(!alternates\.includes\(alt\)\)alternates\.push\(alt\)/);
});

test('P3 tuntunan langkah susun kata tidak lagi memaksa "subjek di awal, keterangan waktu di akhir"', () => {
  const id = read('features/i18n/copy-id-feat-a.js'), th = read('features/i18n/copy-th-feat-a.js');
  const line = (src, k) => (src.match(new RegExp("'" + k.replace(/\./g, '\\.') + "': '([^']*)'")) || [])[1] || '';
  assert.ok(!/akhir kalimat|awal kalimat/i.test(line(id, 'tutor-step.token-step-1') + line(id, 'tutor-step.token-step-3')), 'naskah id masih memaksa posisi');
  assert.ok(!/ท้ายประโยค|ข้างหน้าสุด/.test(line(th, 'tutor-step.token-step-1') + line(th, 'tutor-step.token-step-3')), 'naskah th masih memaksa posisi');
  assert.match(line(id, 'tutor-step.token-step-2'), /Kalimat tanya/);
  assert.match(line(th, 'tutor-step.token-step-2'), /[\u0E00-\u0E7F]/);
});

test('P4 diagnosis urutan tidak menempel aturan tense/HTML', () => {
  locale = 'id';
  const q = tokenQs.find((x) => x.__id === 'TA-001');
  assert.ok(q, 'TA-001 tidak lagi menjadi soal susun kata');
  const placed = q.tokens.slice();[placed[0], placed[1]] = [placed[1], placed[0]];
  const msg = ctx.diagnoseTokenOrderMistake(Object.assign({}, q, { __placedTokens: placed, __unplacedTokens: q.distractors.slice() }));
  assert.ok(!/<br>|<b>|RUMUS|RUTINITAS/.test(msg), msg);
  locale = 'th';
  const msgTh = ctx.diagnoseTokenOrderMistake(Object.assign({}, q, { __placedTokens: placed, __unplacedTokens: q.distractors.slice() }));
  assert.ok(!/<br>|<b>|Present continuous/.test(msgTh), msgTh);
  locale = 'id';
});

test('P5 susun kata di locale th tidak memakai terjemahan Indonesia', () => {
  assert.match(app, /const idTranslation=\(!localeTh&&self\.FiezelGrammarTranslations/);
});

test('P6 mode bandingkan: alasan nyata, bukan "cuma kunci yang cocok" (id + th)', () => {
  assert.match(app, /grammar\.mode-contrast-expl-kebalik',\{alasan:failure\}/);
  assert.match(app, /grammar\.mode-contrast-expl-sepadan',\{alasan:failure\}/);
  assert.match(app, /grammar\.mode-contrast-expl-keliru',\{alasan:failure\}/);
  for (const f of ['features/i18n/copy-id-app-a.js', 'features/i18n/copy-th-app-a.js']) {
    const src = read(f);
    for (const k of ['kebalik', 'sepadan', 'keliru']) {
      const m = src.match(new RegExp("'grammar\\.mode-contrast-expl-" + k + "': [`']([^`']*)[`']"));
      assert.ok(m, f + ': kunci ' + k + ' hilang');
      assert.match(m[1], /\{alasan\}/, f + ' ' + k + ': ' + m[1]);
      assert.ok(!/\{kunciDikutip\}/.test(m[1]), f + ' ' + k + ' masih menyebut kunci: ' + m[1]);
    }
  }
});

test('P7 soal percakapan cadangan membawa alasan per pilihan dan sourceId', () => {
  const fb = slice('  if(fallbackItem){\n    const meta=GRAMMAR_ITEMS.find', 'function weaveGrammarSessionVariety(');
  assert.match(fb, /sourceId:String\(fallbackItem\[8\]\|\|''\)/);
  assert.match(fb, /distractors:vgDistractors/);
  assert.match(fb, /grammarOptionReason\(String\(o\),false/);
});

test('P8 petunjuk tingkat 1 memakai langkah penalaran template (clue)', () => {
  assert.match(app, /const firstStep=String\(item\?\.\[16\]\?\.reasoningId\|\|''\)\.split/);
  assert.match(app, /\.\.\.\(clueText\?\{clue:clueText\}:\{\}\)/);
  // Petunjuk tingkat 1 hanya sebaik langkah pertama reasoningId: harus ada di SEMUA template, id dan th.
  // reasoningOperation Inggris selalu dibuka verba operasi Inggris ("identify time-frame marker").
  const english = /^(identify|select|apply|check|compare|eliminate|choose|find|notice|recall|determine|recognize|track|locate)\b/i;
  const first = (x) => String(x || '').split(/\s*(?:→|->|;)\s*/)[0].trim();
  const missing = T.filter((t) => !first(t.reasoningOperationId) || english.test(first(t.reasoningOperationId))).map((t) => t.id);
  assert.deepStrictEqual(missing, [], 'reasoningId kosong/berbahasa Inggris: ' + missing.slice(0, 5).join(', '));
  const thMissing = T.filter((t) => !/[\u0E00-\u0E7F]/.test(first(TH[t.id] && TH[t.id].reasoning))).map((t) => t.id);
  assert.deepStrictEqual(thMissing, [], thMissing.length + ' template tanpa langkah penalaran Thai');
});

test('D1 alasan bank yang diperbaiki (id + th + cloze) tidak lagi cacat', () => {
  const get = (id, opt) => T.find((t) => t.id === id).distractors.find((d) => d.option === opt).whyFailsId;
  assert.ok(!/admit/.test(get('RS-008', 'suggested to hand')), 'RS-008 masih merujuk “admit” yang tidak ada di soal');
  assert.ok(!/admit/.test(TH['RS-008'].distractors['suggested to hand'].whyFails), 'th RS-008 masih merujuk “admit”');
  assert.ok(!/nggak pernah bener/.test(get('A1-009', 'does')), 'A1-009 masih tautologis');
  assert.ok(!/ไม่เคยถูกต้องในภาษาอังกฤษ|ผิดไวยากรณ์ “have got” มีแบบแผน/.test(TH['A1-009'].distractors.does.whyFails), 'th A1-009 masih tautologis');
  assert.ok(!/sama salahnya kayak/.test(get('AR-004', 'an')), 'AR-004 masih merujuk alasan pilihan lain');
  assert.ok(!/^“nothing” itu satu kata/.test(get('QN-004', 'no thing')), 'QN-004 masih menggiring ke pengecoh “nothing”');
  assert.match(get('b4_017', 'gone'), /padahal/);
  assert.match(get('b5_002', 'was sending'), /padahal/);
  assert.match(get('b5_002', 'send'), /padahal/);
  const cloze = json('cloze-bank-v1.json').items, clozeTh = json('features/i18n/cloze-bank-th.json').items;
  for (const it of cloze) for (const d of it.distractors || []) {
    assert.ok(!/sama kayak “admit”|does got nggak pernah bener|“nothing” itu satu kata, dipenggal/.test(d.whyFailsId || ''), it.id + ': ' + d.whyFailsId);
    const th = clozeTh[it.id]?.distractors?.[d.text]?.whyFailsId || '';
    assert.ok(!/เช่นเดียวกับ “admit”|does got ไม่เคยถูกต้อง/.test(th), it.id + ' th: ' + th);
  }
});

test('D2 reading: templat generik tidak lagi mengklaim pengecoh "tidak ada di teks"', () => {
  const bank = json('reading-bank.json');
  const th = json('features/i18n/reading-bank-th.json');
  let n = 0;
  for (const p of Object.values(bank)) for (const q of p.qs || []) if (/^Pilihan .+ tidak ada di teks\./.test(q?.[3]?.whyOthersFail || '')) n++;
  let m = 0;
  for (const e of Object.values(th.items || {})) for (const q of e.qs || []) if (/ไม่ปรากฏในเนื้อเรื่อง/.test(q?.whyOthersFail || '')) m++;
  assert.strictEqual(n, 0, n + ' penjelasan id masih "tidak ada di teks"');
  assert.strictEqual(m, 0, m + ' penjelasan th masih "ไม่ปรากฏในเนื้อเรื่อง"');
  assert.ok(!/tidak ada di teks\. Yang tertulis/.test(read('tools/reading-a12-explain.mjs')), 'generator id masih menulis klaim lama');
  assert.ok(!/ตัวเลือกอื่นไม่ปรากฏในเนื้อเรื่อง/.test(read('tools/generate-th-reading.js')), 'generator th masih menulis klaim lama');
});

test('D3 cloze: "jebakan yang umum" tidak tercetak dengan titik ganda', () => {
  assert.match(app, /res\.matchedDistractor\.misconception\|\|FiezelI18n\.t\('quiz\.cloze-distractor-default'\)\)\.replace\(\/\[\.\\s\]\+\$\/,''\)/);
});

console.log('\nBrainCore pedagogy audit 2026-10-11: ' + (fail ? 'FAIL (' + fail + ')' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
if (fail) process.exit(1);
