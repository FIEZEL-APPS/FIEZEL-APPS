'use strict';

/**
 * FIEZEL — regression gate for the m025-149 content integrity incident.
 *
 * Every case below is a SHAPE that actually shipped to a student, reduced to the smallest
 * question that still carries the defect. The point is not that these exact strings never
 * return -- it is that the centralized gate rejects the shape, so the same class of damage
 * cannot reach a student through any builder that validates.
 *
 * The positive controls matter just as much: a gate that rejects legitimate content would
 * empty the lessons instead of fixing them, and "no bad questions" would be bought by
 * having no questions. Each control is content the app is SUPPOSED to render.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
let pass = 0, fail = 0;

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); pass++; }
  catch (e) { console.log(`FAIL ${name}\n      ${e.message}`); fail++; }
}
function assert(ok, message) { if (!ok) throw new Error(message); }

/* --- boot app.js the way a browser would ---------------------------------- */
const classList = () => { const v = new Set(); return { add: (...x) => x.forEach(i => v.add(i)), remove: (...x) => x.forEach(i => v.delete(i)), toggle(x, on) { on === undefined ? (v.has(x) ? v.delete(x) : v.add(x)) : (on ? v.add(x) : v.delete(x)); }, contains: x => v.has(x) }; };
const elements = {}, store = {};
const element = id => elements[id] ||= { id, innerHTML: '', textContent: '', className: '', dataset: {}, style: { setProperty() {} }, classList: classList(), setAttribute() {}, addEventListener() {}, append() {}, focus() {}, onclick: null, disabled: false };
const fileIndex = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    // '.audit-tmp' masuk skip-list per preseden 5f2b9ee: litter snapshot release-audit
    // (grammar-templates.json basi) kalah prioritas readdir dari berkas kanonik root.
    if (['node_modules', '.git', 'vendor', 'assets', 'docs', '.audit-tmp'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full); else if (!fileIndex.has(e.name)) fileIndex.set(e.name, full);
  }
})(root);

const context = {
  console: { log() {}, warn() {}, error() {}, info() {} },
  document: { baseURI: 'http://localhost/', body: { classList: classList() }, visibilityState: 'visible', getElementById: element, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ className: '', textContent: '', disabled: false, onclick: null, classList: classList(), append() {}, addEventListener() {} }), addEventListener() {} },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] },
  Notification: Object.assign(function () { this.close = () => {}; }, { permission: 'granted', requestPermission: async () => 'granted' }),
  fetch: async url => { const f = fileIndex.get(String(url).split('/').pop()); return f ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) } : { ok: false, status: 404, json: async () => { throw new Error('404'); } }; },
  window: null, self: null, navigator: { vibrate: () => true }, Date, Intl, Math, URL, Error, Promise, JSON,
  setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {},
  SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} },
  AudioContext: class { constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; } createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } createOscillator() { return { type: 'sine', frequency: { value: 0, setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; } resume() {} suspend() {} close() {} },
};
context.window = context; context.self = context;
context.FIEZEL_VERSION = JSON.parse(fs.readFileSync(path.join(root, 'VERSION.json'), 'utf8')).version;
context.window.scrollTo = () => {}; context.window.requestAnimationFrame = fn => fn();
vm.createContext(context);
/* Harness i18n (pola W1-TESTPLAN 2b, hotfix CI pasca-#242): muat runtime i18n + copy-id sebelum kode app dievaluasi. existsSync = hijau dua arah. */
const __i18nRt=path.join(root,'features','i18n','fiezel-i18n.js');
if(fs.existsSync(__i18nRt)){vm.runInContext(fs.readFileSync(__i18nRt,'utf8'),context,{filename:'fiezel-i18n.js'});
for(const __n of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){
vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',__n),'utf8'),context,{filename:__n});}}

vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context, { filename: 'app.js' });

const validate = context.__fiezelAudit.validateQuestion;

// app.js loads its banks asynchronously; the runtime assertions below need those banks,
// so the suite runs on the next macrotask rather than during module evaluation.
setTimeout(function run() {

/** A structurally perfect grammar question; each case below breaks exactly one thing. */
function baseGrammar(overrides = {}) {
  const options = overrides.options || ['is preparing', 'prepares', 'has prepared', 'prepare'];
  return {
    id: 'grammar-TEST-1', type: 'grammar', level: 'A2', skill: 'present_simple_vs_continuous',
    lessonSkill: 'present_simple_vs_continuous', sourceId: 'TA-001', practiceMode: 'apply_form',
    question: 'Look! The chef ___ a new dish for tonight’s menu.',
    options, answerIndex: 0, difficulty: 2,
    explain: {
      why: 'Kata “Look!” menunjuk kegiatan yang sedang berlangsung.',
      rule: 'Present continuous dibentuk dengan am/is/are + kata kerja -ing.',
      avoid: 'Mulai dari makna kalimat sebelum memilih bentuk.',
      memory: 'Ada “Look!”, berarti lihat bentuk -ing-nya.',
      distractor: 'Setiap pilihan salah membawa miskonsepsi yang berbeda.',
      distractors: options.map(o => ({ option: o, reason: `Alasan untuk “${o}”.` })),
    },
    ...overrides,
  };
}
const rejects = (q, hint) => {
  const r = validate(q);
  assert(!r.ok, `gate accepted a question it must reject (${hint})`);
  return r.reason;
};

/* --- the shapes that shipped ---------------------------------------------- */

test('rejects the English authoring prefix leaking into an option', () => {
  // Hydration wrote `Correct: <whyCorrect>` into the per-option reason, and the
  // justify_correct mode rendered that reason AS an answer option.
  const q = baseGrammar({ options: ['Correct: This form matches the grammar and context.', 'Alasan kedua yang cukup panjang untuk dihitung.', 'Alasan ketiga yang juga cukup panjang di sini.', 'Alasan keempat yang panjangnya memadai juga.'] });
  rejects(q, 'Correct: prefix');
});

test('rejects raw English authoring prose offered as the answer under an Indonesian stem', () => {
  // diagnose_distractor rendered the English whyFails as the CORRECT option, with the
  // Indonesian explanation sitting among the distractors.
  const q = baseGrammar({
    question: 'Seorang siswa memilih “prepares”. Alasan mana yang paling tepat menjelaskan mengapa pilihan itu gagal?',
    options: [
      "The stem's 'Look!' signals an action visibly unfolding now, not a routine.",
      'Kata “Look!” menunjuk pada kegiatan yang sedang terlihat berlangsung.',
      'Present perfect berarti pekerjaannya sudah rampung, padahal masih berlangsung.',
      'Subjek orang ketiga tunggal menuntut akhiran -s atau kata bantu.',
    ],
  });
  const reason = rejects(q, 'English prose among Indonesian options');
  assert(/belahan bahasa/.test(reason), `expected a language-split rejection, got "${reason}"`);
});

test('rejects an Indonesian word spliced into an English sentence frame', () => {
  // The translation pass rewrote words inside English options in place.
  const q = baseGrammar({
    question: 'Berdasarkan rekaman, apa yang dibicarakan pembicara?',
    options: [
      'A museum that she visits with her sekolah class every single week',
      'A quiet library that opens early on weekday mornings for students',
      'A crowded market that sells fresh vegetables and fruit every morning',
      'A small garden that the neighbours look after together each season',
    ],
  });
  const reason = rejects(q, 'spliced Indonesian word');
  assert(/sisipan/.test(reason), `expected a splice rejection, got "${reason}"`);
});

test('rejects an explanation that points at an option not on screen', () => {
  const q = baseGrammar();
  q.explain.distractors = [...q.explain.distractors.slice(0, 3), { option: 'was preparing', reason: 'Pilihan yang tidak ada di layar.' }];
  rejects(q, 'orphaned per-option explanation');
});

test('rejects reading evidence that is not in the passage it quotes', () => {
  const q = {
    id: 'reading-TEST-1', type: 'reading', level: 'A1', skill: 'reading_detail', target: 'r0001', difficulty: 1,
    passage: { id: 'r0001', title: 'Urban Gardening', text: 'Maya led a small study of urban gardening at a neighbourhood repair studio.' },
    question: 'Berdasarkan “Urban Gardening”, detail mana yang benar-benar disebutkan?',
    options: ['Maya led a small study', 'Rafi opened a bakery', 'Alya joined a debate', 'Karim mapped a river'],
    answerIndex: 0,
    explain: { evidence: 'The council approved a budget for three new stadiums downtown.', why: 'x', rule: 'y', avoid: 'z', memory: 'm', distractor: 'd' },
  };
  const reason = rejects(q, 'evidence absent from passage');
  assert(/bukti tidak ada/.test(reason), `expected an evidence rejection, got "${reason}"`);
});

test('rejects a question carrying another lesson’s identity', () => {
  rejects(baseGrammar({ skill: 'articles_a_an_the' }), 'lesson identity mismatch');
});

test('rejects duplicated and empty options', () => {
  rejects(baseGrammar({ options: ['is preparing', 'is preparing', 'has prepared', 'prepare'] }), 'duplicate options');
  rejects(baseGrammar({ options: ['is preparing', '', 'has prepared', 'prepare'] }), 'empty option');
});

test('rejects an out-of-range answer index', () => {
  rejects(baseGrammar({ answerIndex: 7 }), 'answerIndex past the end');
  rejects(baseGrammar({ answerIndex: -1 }), 'negative answerIndex');
});

test('rejects a runtime value that leaked into an option', () => {
  rejects(baseGrammar({ options: ['is preparing', 'undefined', 'has prepared', 'prepare'] }), 'undefined leaked');
  rejects(baseGrammar({ options: ['is preparing', '[object Object]', 'has prepared', 'prepare'] }), 'object leaked');
});

/* --- positive controls: content the app must still render ----------------- */

test('accepts a normal fill-in-the-blank item', () => {
  const r = validate(baseGrammar());
  assert(r.ok, `gate rejected a valid item: ${r.reason}`);
});

test('accepts an all-English sentence-completion item under an Indonesian stem', () => {
  // English is the TARGET language: a completion drill has to offer English sentences,
  // and an all-English option set is correct content, not a language split.
  const q = baseGrammar({
    question: 'Pilih versi lengkap yang benar menurut pola present continuous:',
    options: [
      'Look! The chef is preparing a new dish for tonight’s menu.',
      'Look! The chef prepares a new dish for tonight’s menu.',
      'Look! The chef has prepared a new dish for tonight’s menu.',
      'Look! The chef prepare a new dish for tonight’s menu.',
    ],
  });
  const r = validate(q);
  assert(r.ok, `gate rejected a valid completion drill: ${r.reason}`);
});

test('accepts Indonesian explanations that quote English grammar terms', () => {
  const q = baseGrammar({
    question: 'Aturan mana yang secara khusus menjelaskan jawaban pada contoh ini?',
    options: [
      'Present continuous dibentuk dengan am/is/are + kata kerja -ing, dipakai untuk tindakan yang sedang terjadi.',
      'Perintah menjadi “told someone TO do it”, bukan “told that they did it”.',
      'Proud OF, bukan proud about, for, atau with; preposisinya melekat pada kata sifatnya.',
      'Bagian yang disambung “and” atau “or” dalam satu rangkaian harus berbentuk sama.',
    ],
  });
  const r = validate(q);
  assert(r.ok, `gate rejected valid Indonesian explanations: ${r.reason}`);
});

/* --- the repaired banks must stay repaired -------------------------------- */

test('every grammar lesson still fills all 25 practice modes through the gate', () => {
  const templates = JSON.parse(fs.readFileSync(path.join(root, 'grammar-templates.json'), 'utf8')).templates;
  const state = context.__getFiezelState();
  const previous = { activeLevel: state.preferences.activeLevel || '', levelMode: state.preferences.levelMode || 'placement' };
  const short = [];
  for (const t of templates) {
    state.preferences = { ...state.preferences, activeLevel: t.cefr, levelMode: 'manual' };
    const questions = context.buildGrammarLessonQuestions(t.subskill, 25);
    if (questions.length !== 25) short.push(`${t.id}/${t.subskill}=${questions.length}`);
  }
  state.preferences = { ...state.preferences, ...previous };
  assert(!short.length, `lessons underfilled after gating: ${short.slice(0, 5).join(', ')}`);
});

test('the reading bank declares one answer, not two that disagree', () => {
  const reading = JSON.parse(fs.readFileSync(path.join(root, 'reading-bank.json'), 'utf8'));
  const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const broken = [];
  for (const passage of reading) for (const [i, q] of (passage.qs || []).entries()) {
    const meta = (q[3] && typeof q[3] === 'object') ? q[3] : {};
    if (meta.answer && Number.isInteger(q[2]) && norm(meta.answer) !== norm(q[1]?.[q[2]])) broken.push(`${passage.id}#${i}`);
  }
  assert(!broken.length, `${broken.length} reading questions disagree with their own answer text (${broken.slice(0, 3).join(', ')})`);
});

test('no listening item mixes Indonesian words into an English option', () => {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'features', 'speaking-listening', 'listening-bank-v1.json'), 'utf8'));
  const splice = /\b(sekolah|rumah|payung|toko|pintu|gerbang|dapur|meja|permainan|menunggu|hujan|dimainkan|nasi|makanan|pelajaran|guru|teman)\b/i;
  const en = /\b(the|a|an|of|and|that|with|for|in|on|at|from|her|his|she|he|they|it)\b/gi;
  const broken = [];
  for (const item of bank.items || []) {
    for (const [label, text] of [['question', item.question], ...(item.options || []).map((o, j) => [`options[${j}]`, o])]) {
      const s = String(text || '');
      if ((s.match(en) || []).length >= 2 && splice.test(s)) broken.push(`${item.id} ${label}`);
    }
  }
  assert(!broken.length, `${broken.length} listening fields still carry translation splices (${broken.slice(0, 3).join(', ')})`);
});

test('every grammar template ships its Indonesian counterpart', () => {
  const templates = JSON.parse(fs.readFileSync(path.join(root, 'grammar-templates.json'), 'utf8')).templates;
  const missing = [];
  for (const t of templates) {
    const e = t.explanation || {};
    for (const [en, id] of [['whyCorrect', 'whyCorrectId'], ['rule', 'ruleId'], ['whyOthersFail', 'whyOthersFailId'], ['howToAvoid', 'howToAvoidId'], ['memoryCue', 'memoryCueId']]) {
      if (e[en] && !e[id]) missing.push(`${t.id}.explanation.${id}`);
    }
    for (const f of ['pedagogicalObjective', 'misconceptionTargeted', 'reasoningOperation']) if (t[f] && !t[`${f}Id`]) missing.push(`${t.id}.${f}Id`);
    /* Dikencangkan (Braincore v3 P0): syaratnya BUKAN LAGI "kalau ada versi Inggris,
       harus ada versi Indonesia" melainkan "setiap pengecoh WAJIB punya keduanya".
       Bentuk lama punya lubang yang diam: pengecoh yang lahir tanpa `whyFails`
       sama sekali lolos hijau, padahal itu justru kasus terburuknya — murid yang
       memilihnya tidak diberi penjelasan apa pun, dalam bahasa apa pun. Hari ini
       cakupannya sudah 747/747, jadi mengencangkan ini tidak menuntut satu baris
       konten baru; ia hanya menutup pintu supaya tidak bisa turun lagi. */
    for (const d of t.distractors || []) {
      if (!String(d.whyFailsId || '').trim()) missing.push(`${t.id}[${d.option}].whyFailsId`);
      if (!String(d.misconceptionId || '').trim()) missing.push(`${t.id}[${d.option}].misconceptionId`);
    }
  }
  assert(!missing.length, `${missing.length} student-facing fields have no Indonesian (${missing.slice(0, 4).join(', ')})`);
});

/* Bank cloze diturunkan MEKANIS dari grammar-templates.json (tools/build-cloze-bank.js),
   dan sampai Braincore v3 konversinya menjatuhkan `whyFailsId` di jalan: 626 pengecoh
   cloze tidak punya satu kalimat pun untuk murid yang salah, padahal sumbernya lengkap.
   Gerbang ini menjaga jalur konversinya, bukan hanya sumbernya — cakupan yang hilang di
   tengah pipa sama tidak terlihatnya dengan cakupan yang tidak pernah ada. */
test('every cloze distractor and item carries its Indonesian explanation', () => {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'cloze-bank-v1.json'), 'utf8'));
  const missing = [];
  for (const it of bank.items || []) {
    const e = it.explain;
    if (!e || typeof e !== 'object' || !String(e.why || '').trim() || !String(e.rule || '').trim()) {
      missing.push(`${it.id}.explain`);
    }
    for (const d of it.distractors || []) {
      if (!String(d.whyFailsId || '').trim()) missing.push(`${it.id}[${d.text}].whyFailsId`);
    }
  }
  assert(!missing.length, `${missing.length} cloze fields have no Indonesian (${missing.slice(0, 4).join(', ')})`);
});

test('no two distractors in a template share one misconception label', () => {
  const templates = JSON.parse(fs.readFileSync(path.join(root, 'grammar-templates.json'), 'utf8')).templates;
  const collisions = [];
  for (const t of templates) for (const field of ['misconception', 'misconceptionId']) {
    const labels = (t.distractors || []).map(d => String(d[field] || '').trim().toLowerCase()).filter(Boolean);
    if (new Set(labels).size !== labels.length) collisions.push(`${t.id}.${field}`);
  }
  assert(!collisions.length, `misconception labels collide, making the labelling modes unanswerable: ${collisions.join(', ')}`);
});

console.log(`\nFIEZEL content integrity gate: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
}, 400);
