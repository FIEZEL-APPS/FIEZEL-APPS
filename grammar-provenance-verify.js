'use strict';

/**
 * grammar-provenance-verify.js — Harness verifikasi kontrak provenance v2 (Subagent C).
 *
 * Sumber kebenaran: FIX-SPEC-PROVENANCE-V2.md, bagian "Harness verifikasi (Subagent C)".
 * Kontrak entry provenance: {sourceId, sourceLevel, origin:'own'|'peer'|'taxonomy'|'fallback'}.
 *
 * C1: boot app.js via vm mengikuti pola persis grammar-memory-scope-test.js.
 * C2: untuk tiap level A1..C2 set state.preferences.activeLevel + levelMode='manual',
 *     lalu panggil buildGrammarLessonQuestions(subskill,25) untuk TIAP lesson level itu.
 * C3: assert seluruh aturan kontrak (lihat CHECKS di bawah).
 * C4: dump kartu render per level ke /home/user/workspace/review/questions-<LEVEL>.json.
 * C5: harness ini TIDAK mengedit app.js maupun file audit. Saat dijalankan pada kode lama
 *     ia boleh FAIL pada aturan kontrak baru — itu bukti harness bekerja.
 *
 * Pemisahan tegas dua jenis kegagalan:
 *   - PELANGGARAN KONTRAK: aplikasi tidak memenuhi spec (exit 1).
 *   - ERROR HARNESS: bug pada harness ini sendiri / boot gagal (exit 2).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ------------------------------------------------------------------ */
/* C1. Boot app.js — salinan setia pola grammar-memory-scope-test.js  */
/* ------------------------------------------------------------------ */
const root = __dirname;
const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
const elements = {};
const element = id => elements[id] ||= { id, innerHTML:'', textContent:'', className:'', dataset:{}, style:{setProperty(){}}, classList:classList(), setAttribute(){}, addEventListener(){}, append(){}, focus(){}, onclick:null, disabled:false };
const store = {};
const fileIndex = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    if (['node_modules','.git','vendor','assets','docs','.audit-tmp'].includes(e.name)) continue; /* .audit-tmp: sisa mkdtemp release-audit.py (TMPDIR=ROOT/.audit-tmp) berisi snapshot grammar-templates.json basi — tanpa pengecualian ini, indeks basename memuat snapshot itu alih-alih file kanonik root (preseden: level-grammar-contract-test.js) */
    const full = path.join(dir,e.name);
    if (e.isDirectory()) walk(full); else if (!fileIndex.has(e.name)) fileIndex.set(e.name,full);
  }
})(root);
const context = {
  console:{log(){},warn(){},error(){},info(){}},
  document:{baseURI:'http://localhost/',body:{classList:classList()},visibilityState:'visible',getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>element('generated'),addEventListener(){}},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  fetch:async url=>{const f=fileIndex.get(String(url).split('/').pop());return f?{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(f,'utf8'))}:{ok:false,status:404,json:async()=>{throw new Error('404')}}},
  Notification:Object.assign(function(){},{permission:'granted',requestPermission:async()=> 'granted'}),
  window:null,self:null,navigator:{vibrate:()=>true},Date,Intl,Math,URL,Error,Promise,JSON,
  setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval(){},
  SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},
  AudioContext:class{constructor(){this.currentTime=0;this.state='running';this.destination={}}createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}createOscillator(){return{type:'sine',frequency:{value:0,setValueAtTime(){}},connect(){},start(){},stop(){}}}resume(){}suspend(){}close(){}},
};
context.window=context;context.self=context;
context.FIEZEL_VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
context.window.scrollTo=()=>{};context.window.requestAnimationFrame=fn=>fn();
vm.createContext(context);/* Harness i18n (pola W1-TESTPLAN 2b, hotfix CI pasca-#242 lanjutan: tiga harness terlewat bac8b8d): app.js kini memanggil FiezelI18n.t saat evaluasi, jadi runtime i18n + copy-id dimuat dulu. existsSync = hijau dua arah. */const __i18n=path.join(root,'features','i18n','fiezel-i18n.js');if(fs.existsSync(__i18n)){vm.runInContext(fs.readFileSync(__i18n,'utf8'),context,{filename:'fiezel-i18n.js'});for(const __n of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',__n),'utf8'),context,{filename:__n});}}
try {
  /* m025-186 merge-fix: kontrak index.html FIEZEL_I18N_BEGIN — fiezel-i18n.js lalu SEMUA
   copy-id-*.js dimuat SEBELUM app.js; tanpa ini app.js:16 (FiezelI18n.t) melempar. */
for (const f of ['features/i18n/fiezel-i18n.js'].concat(fs.readdirSync(path.join(root,'features/i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort().map(n=>'features/i18n/'+n))) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context, { filename: f });
}
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});
} catch (e) {
  console.error(`ERROR HARNESS (boot): app.js gagal dievaluasi di vm: ${e.message}`);
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* Konstanta kontrak                                                   */
/* ------------------------------------------------------------------ */
const LEVELS = ['A1','A2','B1','B2','C1','C2'];
const ORIGINS = new Set(['own','peer','taxonomy','fallback']);
const SENTINEL = { taxonomy:'taxonomy:family', fallback:'fallback:generic' };
// Kalimat fallback verb-form dari grammarOptionReason() — dilarang muncul sebagai reason
// distraktor pada mode meta (v2-v8, v12-v14, v21-v24).
const FALLBACK_VERB_FORM = 'belum cocok dengan waktu, fungsi, atau susunan';
const BANNED_REASON_MODES = new Set([
  'justify_correct','recognize_rule','recognize_objective','sequence_reasoning',      // v2-v5
  'identify_misconception','recall_memory_cue','choose_avoidance',                    // v6-v8
  'diagnose_distractor_1','diagnose_distractor_2','diagnose_distractor_3',            // v9-v11 (m025-155: opsi kalimat)
  'label_misconception_1','label_misconception_2','label_misconception_3',            // v12-v14
  'contrast_distractor_1','contrast_distractor_2','contrast_distractor_3',            // v18-v20 (m025-155: opsi kalimat)
  'classify_family','locate_decision_cue','teach_back','mastery_check',               // v21-v24
]);
// Kategori yang TIDAK tergantung patch Subagent A (harus sudah lulus di kode lama):
const PATCH_INDEPENDENT = new Set(['generator_crash','card_count','mode_coverage','question_identity']);

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();

const templates = JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8')).templates;
const templateById = new Map(templates.map(t => [String(t.id), t]));
// #250 (skip-content wave2) memperkenalkan TEMPLATE VARIAN: beberapa template berbagi satu
// subskill (mis. PR-101 varian dari PR-001) dan runtime sah menyajikan varian mana pun untuk
// lesson tersebut. "Identitas lesson" karena itu = KELOMPOK subskill, bukan satu id template.
const groupIdsBySubskill = new Map();
for (const t of templates) {
  const k = String(t.subskill);
  if (!groupIdsBySubskill.has(k)) groupIdsBySubskill.set(k, new Set());
  groupIdsBySubskill.get(k).add(String(t.id));
}
const inLessonGroup = (t, sid) => (groupIdsBySubskill.get(String(t.subskill)) || new Set()).has(String(sid));

const REVIEW_DIR = path.join(path.dirname(root), 'review');

/* ------------------------------------------------------------------ */
/* Akumulator hasil                                                    */
/* ------------------------------------------------------------------ */
const MAX_SAMPLES = 25; // contoh pesan tersimpan per kategori per level; hitungan tetap penuh
const results = {};      // level -> {lessons, cards, violations:{cat:{count,samples[]}}}
const harnessErrors = [];

function levelBucket(level) {
  return results[level] ||= { lessons:0, cards:0, violations:Object.create(null) };
}
function violate(level, category, message) {
  const v = levelBucket(level).violations;
  const slot = v[category] ||= { count:0, samples:[] };
  slot.count++;
  if (slot.samples.length < MAX_SAMPLES) slot.samples.push(message);
}
function harnessError(where, err) {
  harnessErrors.push(`${where}: ${err && err.stack ? err.stack.split('\n').slice(0,3).join(' | ') : String(err)}`);
}

/* ------------------------------------------------------------------ */
/* C3. Aturan kontrak per lesson                                       */
/* ------------------------------------------------------------------ */
function sortedOptionSig(q) { return (q.options || []).map(norm).sort().join('|'); }

function checkEntryContract(level, t, q, i) {
  const where = `${t.id}/${q.practiceMode}[opsi ${i}]`;
  const entry = Array.isArray(q.optionSources) ? q.optionSources[i] : undefined;
  if (!entry || typeof entry !== 'object') {
    violate(level, 'provenance_entry', `${where}: entry optionSources hilang/bukan objek`);
    return null;
  }
  if (String(entry.option ?? '') !== String(q.options[i] ?? ''))
    violate(level, 'provenance_entry', `${where}: entry.option tidak cocok dengan teks opsi di indeks yang sama`);
  const origin = entry.origin;
  if (!ORIGINS.has(origin)) {
    violate(level, 'provenance_origin', `${where}: origin "${origin}" bukan salah satu dari own|peer|taxonomy|fallback`);
    return null; // aturan turunan butuh origin yang sah
  }
  const sid = String(entry.sourceId ?? '');
  const slevel = entry.sourceLevel;
  if ((entry.own === true) !== (origin === 'own'))
    violate(level, 'provenance_origin', `${where}: own===${entry.own} tetapi origin="${origin}" (own===true HANYA untuk origin 'own')`);
  if (origin === 'own') {
    if (!inLessonGroup(t, sid))
      violate(level, 'provenance_entry', `${where}: origin own tetapi sourceId="${sid}" di luar kelompok subskill lesson "${t.id}" (wajib id template se-subskill)`);
  } else if (origin === 'peer') {
    if (!sid) violate(level, 'provenance_entry', `${where}: origin peer dengan sourceId kosong`);
    else if (inLessonGroup(t, sid)) violate(level, 'provenance_entry', `${where}: origin peer tetapi sourceId menunjuk kelompok lesson ini sendiri`);
    else if (!templateById.has(sid)) violate(level, 'provenance_entry', `${where}: origin peer, sourceId "${sid}" tidak resolve ke template nyata`);
    else if (String(slevel ?? '') !== String(templateById.get(sid).cefr))
      violate(level, 'provenance_entry', `${where}: sourceLevel "${slevel}" != cefr template asal "${templateById.get(sid).cefr}" (${sid})`);
  } else { // taxonomy | fallback
    if (sid !== SENTINEL[origin])
      violate(level, 'provenance_entry', `${where}: origin ${origin} tetapi sourceId="${sid}", seharusnya sentinel "${SENTINEL[origin]}"`);
    if (String(slevel ?? '') !== '')
      violate(level, 'provenance_entry', `${where}: origin ${origin} wajib sourceLevel kosong, dapat "${slevel}"`);
    if (entry.own === true)
      violate(level, 'provenance_entry', `${where}: origin ${origin} tidak boleh distempel own:true`);
  }
  return entry;
}

function checkLesson(level, t, qs) {
  const bucket = levelBucket(level);
  bucket.lessons++;
  bucket.cards += qs.length;

  // 25/25 kartu (patch-independent)
  if (qs.length !== 25)
    violate(level, 'card_count', `${t.id}/${t.subskill}: ${qs.length}/25 kartu`);

  // 25 practiceMode distinct (patch-independent)
  const modes = new Set(qs.map(q => String(q.practiceMode || '')));
  if (modes.size !== 25)
    violate(level, 'mode_coverage', `${t.id}/${t.subskill}: hanya ${modes.size} practiceMode distinct dari ${qs.length} kartu`);

  for (const q of qs) {
    const where = `${t.id}/${q.practiceMode}`;

    // Identitas question (patch-independent: sudah harus benar di kode lama)
    if (!inLessonGroup(t, q.sourceId))
      violate(level, 'question_identity', `${where}: question.sourceId="${q.sourceId}" di luar kelompok subskill "${t.id}"`);
    if (!inLessonGroup(t, q.conceptId))
      violate(level, 'question_identity', `${where}: question.conceptId="${q.conceptId}" di luar kelompok subskill "${t.id}"`);
    if (String(q.lessonSkill ?? '') !== String(t.subskill))
      violate(level, 'question_identity', `${where}: question.lessonSkill="${q.lessonSkill}" != "${t.subskill}"`);

    // optionSources: satu entry kontrak per opsi
    const sources = Array.isArray(q.optionSources) ? q.optionSources : [];
    if (sources.length !== (q.options || []).length)
      violate(level, 'provenance_entry', `${where}: ${sources.length} entry optionSources untuk ${(q.options||[]).length} opsi`);
    const entryByIndex = (q.options || []).map((_, i) => checkEntryContract(level, t, q, i));

    // Konsistensi explain.distractors[].sourceId/own dengan origin entry
    const dists = Array.isArray(q.explain?.distractors) ? q.explain.distractors : [];
    if (dists.length !== (q.options || []).length)
      violate(level, 'distractor_consistency', `${where}: ${dists.length} explain.distractors untuk ${(q.options||[]).length} opsi`);
    dists.forEach((d, i) => {
      const entry = entryByIndex[i];
      if (!entry || !ORIGINS.has(entry.origin)) return; // sudah dilaporkan di atas
      if (String(d?.option ?? '') !== String(q.options[i] ?? '')) {
        violate(level, 'distractor_consistency', `${where}[opsi ${i}]: distractors[].option tidak sejajar dengan options[]`);
        return;
      }
      // origin 'own' = id template mana pun se-subskill (varian #250 sah menyajikan grupnya)
      if (entry.origin === 'own') {
        if (!inLessonGroup(t, d?.sourceId))
          violate(level, 'distractor_consistency', `${where}[opsi ${i}]: distractors[].sourceId="${d?.sourceId}" di luar kelompok subskill "${t.id}" (origin own)`);
      } else {
        const expected = entry.origin === 'peer' ? String(entry.sourceId ?? '') : SENTINEL[entry.origin];
        if (String(d?.sourceId ?? '') !== expected)
          violate(level, 'distractor_consistency', `${where}[opsi ${i}]: distractors[].sourceId="${d?.sourceId}" != "${expected}" (origin ${entry.origin})`);
      }
      if (entry.origin !== 'own' && d?.own === true)
        violate(level, 'distractor_consistency', `${where}[opsi ${i}]: distractors[].own true untuk origin ${entry.origin}`);
    });

    // Larangan reason fallback verb-form pada mode meta (v2-v8, v12-v14, v21-v24)
    if (BANNED_REASON_MODES.has(String(q.practiceMode))) {
      dists.forEach((d, i) => {
        if (i === q.answerIndex) return; // hanya distraktor
        if (norm(d?.reason).includes(norm(FALLBACK_VERB_FORM)))
          violate(level, 'fallback_verb_reason', `${where}[opsi ${i}]: reason distraktor memakai kalimat fallback verb-form: "${String(d?.reason).slice(0,90)}…"`);
      });
    }
  }

  // v5 (sequence_reasoning) vs v22 (locate_decision_cue): set opsi tidak boleh identik
  const q5 = qs.find(q => q.practiceMode === 'sequence_reasoning');
  const q22 = qs.find(q => q.practiceMode === 'locate_decision_cue');
  if (q5 && q22 && sortedOptionSig(q5) === sortedOptionSig(q22))
    violate(level, 'v5_v22_identical', `${t.id}/${t.subskill}: set opsi sequence_reasoning identik dengan locate_decision_cue`);

  // v21 (classify_family): kunci origin 'own', semua opsi salah origin 'taxonomy'
  const q21 = qs.find(q => q.practiceMode === 'classify_family');
  if (q21) {
    const sources = Array.isArray(q21.optionSources) ? q21.optionSources : [];
    (q21.options || []).forEach((opt, i) => {
      const entry = sources[i];
      const origin = entry && entry.origin;
      if (i === q21.answerIndex) {
        if (origin !== 'own')
          violate(level, 'v21_taxonomy', `${t.id}/classify_family[opsi ${i}]: kunci ber-origin "${origin}", wajib 'own'`);
      } else if (origin !== 'taxonomy') {
        violate(level, 'v21_taxonomy', `${t.id}/classify_family[opsi ${i}]: label keluarga lain ber-origin "${origin}", wajib 'taxonomy'`);
      }
    });
  }
}

/* ------------------------------------------------------------------ */
/* C4. Bentuk dump kartu untuk review                                  */
/* ------------------------------------------------------------------ */
function dumpCard(t, q) {
  const sources = Array.isArray(q.optionSources) ? q.optionSources : [];
  const dists = Array.isArray(q.explain?.distractors) ? q.explain.distractors : [];
  return {
    lesson: t.id,
    subskill: t.subskill,
    practiceMode: q.practiceMode,
    question: q.question,
    options: q.options,
    answerIndex: q.answerIndex,
    explain: {
      why: q.explain?.why ?? '',
      distractors: dists.map((d, i) => ({
        option: d?.option ?? '',
        reason: d?.reason ?? '',
        sourceId: d?.sourceId ?? '',
        origin: sources[i] && typeof sources[i] === 'object' ? (sources[i].origin ?? null) : null,
      })),
    },
    optionSources: sources,
  };
}

/* ------------------------------------------------------------------ */
/* C2. Loop level A1..C2 atas seluruh lesson                           */
/* ------------------------------------------------------------------ */
function run() {
  const getState = context.__getFiezelState;
  const build = context.buildGrammarLessonQuestions;
  if (typeof getState !== 'function' || typeof build !== 'function') {
    harnessError('boot', new Error('__getFiezelState/buildGrammarLessonQuestions tidak tersedia di context — app.js belum selesai load atau ekspor berubah'));
    return finish();
  }
  const state = getState();
  const grammarCount = typeof context.__getFiezelData === 'function' ? context.__getFiezelData().grammar : -1;
  if (!grammarCount) {
    harnessError('boot', new Error('data grammar kosong setelah load — stub fetch/urutan boot harness bermasalah'));
    return finish();
  }
  fs.mkdirSync(REVIEW_DIR, { recursive:true });
  const previous = { activeLevel: state.preferences.activeLevel || '', levelMode: state.preferences.levelMode || 'placement' };

  for (const level of LEVELS) {
    const lessons = templates.filter(t => t.cefr === level);
    const cards = [];
    levelBucket(level);
    for (const t of lessons) {
      state.preferences = { ...state.preferences, activeLevel: t.cefr, levelMode: 'manual' };
      let qs = [];
      try {
        qs = build(t.subskill, 25) || [];
      } catch (e) {
        // Generator melempar = cacat aplikasi, bukan bug harness.
        violate(level, 'generator_crash', `${t.id}/${t.subskill}: buildGrammarLessonQuestions melempar: ${e.message}`);
        levelBucket(level).lessons++;
        continue;
      }
      try {
        checkLesson(level, t, qs);
      } catch (e) {
        harnessError(`checkLesson ${t.id}`, e);
      }
      try {
        for (const q of qs) cards.push(dumpCard(t, q));
      } catch (e) {
        harnessError(`dumpCard ${t.id}`, e);
      }
    }
    try {
      fs.writeFileSync(path.join(REVIEW_DIR, `questions-${level}.json`), JSON.stringify(cards, null, 1));
    } catch (e) {
      harnessError(`dump questions-${level}.json`, e);
    }
  }
  state.preferences = { ...state.preferences, ...previous };
  finish();
}

/* ------------------------------------------------------------------ */
/* Ringkasan + exit code                                               */
/* ------------------------------------------------------------------ */
function finish() {
  let totalViolations = 0;
  console.log('=== grammar-provenance-verify: ringkasan per level ===');
  for (const level of LEVELS) {
    const r = results[level] || { lessons:0, cards:0, violations:{} };
    const cats = Object.keys(r.violations).sort();
    const levelTotal = cats.reduce((n, c) => n + r.violations[c].count, 0);
    totalViolations += levelTotal;
    console.log(`\n[${level}] lesson: ${r.lessons} | kartu: ${r.cards} | pelanggaran: ${levelTotal}`);
    for (const c of cats) {
      const tag = PATCH_INDEPENDENT.has(c) ? 'WAJIB-LULUS-SEKARANG' : 'KONTRAK-BARU';
      console.log(`  - ${c} (${tag}): ${r.violations[c].count}`);
      for (const s of r.violations[c].samples.slice(0, 3)) console.log(`      · ${s}`);
    }
    if (!cats.length) console.log('  - bersih');
  }

  const patchIndependentTotal = LEVELS.reduce((n, level) => {
    const v = (results[level] || { violations:{} }).violations;
    return n + Object.keys(v).filter(c => PATCH_INDEPENDENT.has(c)).reduce((m, c) => m + v[c].count, 0);
  }, 0);

  console.log('\n=== status ===');
  console.log(`Pelanggaran kontrak total: ${totalViolations} (aturan patch-independent: ${patchIndependentTotal})`);
  console.log(`Dump review: ${REVIEW_DIR}/questions-<LEVEL>.json`);

  if (harnessErrors.length) {
    console.error(`\nERROR HARNESS (${harnessErrors.length}) — ini bug harness/boot, BUKAN pelanggaran kontrak:`);
    for (const e of harnessErrors.slice(0, 10)) console.error(`  ! ${e}`);
    process.exit(2);
  }
  if (totalViolations) {
    console.error('\nFAIL grammar-provenance-verify: ada pelanggaran kontrak (lihat rincian di atas).');
    process.exit(1);
  }
  console.log('\nPASS grammar-provenance-verify: seluruh kontrak provenance terpenuhi di 6 level.');
  process.exit(0);
}

// Ikut pola grammar-memory-scope-test.js: beri jalan bagi rantai load async app.js selesai
// dulu, lalu jalankan. Kalau data belum siap, coba ulang beberapa kali sebelum menyerah.
let bootTries = 0;
(function waitAndRun() {
  setTimeout(() => {
    const ready = typeof context.buildGrammarLessonQuestions === 'function'
      && typeof context.__getFiezelData === 'function'
      && context.__getFiezelData().grammar > 0;
    if (ready) {
      try { run(); } catch (e) { harnessError('run', e); finish(); }
    } else if (++bootTries < 50) {
      waitAndRun();
    } else {
      harnessError('boot', new Error('data grammar tidak pernah siap setelah 50 percobaan tunggu'));
      finish();
    }
  }, bootTries ? 100 : 0);
})();
