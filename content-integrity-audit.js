'use strict';

/**
 * FIEZEL — System-wide content integrity forensic auditor (m025-149).
 *
 * This is deliberately NOT a screenshot regression test. It inspects two layers:
 *
 *   STATIC  — every record in every content bank on disk (schema, fields, and the
 *             RELATIONSHIPS between fields, which is where this incident actually lived).
 *   RUNTIME — boots app.js in a VM and generates the questions a student would really
 *             see (every grammar lesson x every practice mode, every vocabulary card,
 *             every reading question, placement blueprints), then audits the rendered
 *             item. A record can be perfectly valid JSON and still assemble into a
 *             broken question, so the source alone proves nothing.
 *
 * Run:  node content-integrity-audit.js            (gate: exits 1 on CRITICAL)
 *       node content-integrity-audit.js --report   (also writes CONTENT-INTEGRITY-AUDIT.json)
 *       node content-integrity-audit.js --sample=N (cap runtime sampling, default all)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const WRITE_REPORT = process.argv.includes('--report');
const SAMPLE_ARG = process.argv.find(x => x.startsWith('--sample='));
const SAMPLE = SAMPLE_ARG ? Number(SAMPLE_ARG.split('=')[1]) : Infinity;

const findings = [];
const stats = Object.create(null);

function bump(key, by = 1) { stats[key] = (stats[key] || 0) + by; }

function finding(severity, module_, code, id, detail, evidence) {
  findings.push({ severity, module: module_, code, id: String(id || ''), detail: String(detail || ''), evidence: evidence === undefined ? '' : String(evidence).slice(0, 400) });
}
const critical = (...a) => finding('CRITICAL', ...a);
const major = (...a) => finding('MAJOR', ...a);
const minor = (...a) => finding('MINOR', ...a);

const readJson = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => norm(s).split(' ').filter(Boolean);

/* ---------------------------------------------------------------------------
 * Shared detectors. These encode the failure classes named in the incident
 * report, so every module is checked against the same definition of "broken".
 * ------------------------------------------------------------------------- */

// Authoring/internal scaffolding that must never be rendered to a student.
const INTERNAL_MARKERS = [
  [/\bCorrect:\s/, 'english authoring prefix "Correct:"'],
  [/This form matches the grammar and context/i, 'english hydration fallback'],
  [/does not satisfy the grammar rule tested here/i, 'english hydration fallback'],
  [/Evidence from the passage/i, 'english reading scaffold'],
  [/Reading focus:/i, 'english reading scaffold'],
  [/\bwhyFails\b|\bwhyCorrect\b|\bmisconceptionTargeted\b|\bpedagogicalObjective\b|\breasoningOperation\b|\bpatternId\b|\bcorrectIndex\b/, 'raw schema key leaked'],
  [/\[object Object\]/, 'object stringification leaked'],
  [/\bundefined\b|\bNaN\b/, 'undefined/NaN leaked'],
  [/^\s*null\s*$/i, 'null leaked'],
  [/\b[A-Z]{2,3}-\d{3}\b/, 'internal template id leaked'],
  [/\bmeaning_\d+|vocab_\d{5}|\br\d{4}\b/, 'internal record id leaked'],
];

// Indonesian is the language of instruction. English is the *target* language, so a
// short option like "is preparing" is correct content; a long English *sentence*
// offered as an answer to an Indonesian question is leaked internal prose.
const ID_MARKERS = /\b(yang|tidak|karena|dengan|untuk|adalah|pada|dari|itu|ini|bukan|akan|sudah|dapat|harus|kalimat|bentuk|kata|jawaban|pilihan|makna|waktu|subjek|agar|saat|lalu|hanya|juga|atau|dalam|oleh|apa|bisa|belum|masih|setiap|semua|tanpa|antara|sebagai|supaya|maksud|aturan|petunjuk|konteks|siswa|soal|benda|kerja|sifat|jumlah|tempat|orang|jadi|tetapi|sedangkan|padahal|ketika|sehingga|maupun|serta|boleh|perlu|memang|justru|bukannya|kalau|jika|dipakai|memakai|menjadi|menandai|menunjuk|menyatakan|menerangkan|membentuk|berarti|berbeda|berlangsung|terhitung|terjadi|keadaan|kejadian|kebiasaan|penanda|pengecoh|salah|benar|tepat|cocok|periksa|lihat|cari|pilih|ubah|tambahkan|hafalkan|jamak|tunggal|lampau|sekarang|depan|pengandaian|kepemilikan|penekanan|perbandingan|keterangan|penghubung|pertanyaan|penyangkalan|langsung|pasif|aktif)\b/gi;

// English function words. Grammar metalanguage is deliberately NOT here: an Indonesian
// explanation that cites "present continuous", "used to", or the pronoun series it is
// teaching is correct writing, and counting those as English would flag the whole
// Indonesian explanation corpus as corrupt.
const EN_MARKERS = /\b(the|of|and|that|this|with|for|because|when|which|not|learner|treats|implies|requires|signals|completed|ongoing|rather|than|from|about|there|their|before|after|while|since|between|without|into|over|under|through|during|against|among|already|still|also|only|just|even|both|either|neither|however|therefore|although|though|whether|unless|whereas|its|his|her|they|them|our|your|my|me|him|us|she|he|it|we|you|i)\b/gi;

// Terms an Indonesian grammar explanation is expected to quote verbatim.
const EN_METALANGUAGE = /\b(present|past|future|perfect|continuous|progressive|simple|tense|aspect|gerund|infinitive|participle|passive|active|modal|auxiliary|article|determiner|quantifier|preposition|conjunction|pronoun|possessive|subject|object|verb|noun|adjective|adverb|clause|phrase|singular|plural|countable|uncountable|comparative|superlative|inversion|relative|reported|conditional|am|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|can|could|shall|should|may|might|must|used|to|got|ing|ed|es|s|a|an|some|any|much|many|little|few|who|what|where|why|how|whom|whose)\b/gi;

const setOf = re => new Set(re.source.replace(/\\b|[()]/g, '').split('|'));
const ID_SET = setOf(ID_MARKERS), EN_SET = setOf(EN_MARKERS), META_SET = setOf(EN_METALANGUAGE);

/**
 * Which language is this string *framed* in?
 *
 * Counting raw English tokens does not work on this corpus, because a correct Indonesian
 * grammar explanation quotes English constantly ("Present continuous dibentuk dengan
 * am/is/are + kata kerja -ing"). Grammar metalanguage is therefore neutral: it counts for
 * neither side, and only the surrounding function words decide the frame.
 */
function languageProfile(text) {
  // Quoted spans are cited examples, not the frame. An Indonesian memory cue reads
  // 'Perintah menjadi "told someone TO do it"' -- the English lives inside the quotes and
  // the Indonesian outside them, and only the outside decides what language the option is.
  const framed = String(text == null ? '' : text).replace(/[“"'‘][^”"'’]*[”"'’]/g, ' ');
  let id = 0, en = 0;
  for (const w of words(framed)) {
    if (META_SET.has(w)) continue;
    if (ID_SET.has(w)) id++;
    else if (EN_SET.has(w)) en++;
  }
  // Instructional Indonesian always carries at least one Indonesian function word, even
  // when it quotes English heavily ("Proud OF, bukan proud about, for, atau with"). Prose
  // with none of them and several English function words is English. Everything else --
  // a bare list of example phrases, a single term -- is neutral and accuses nobody.
  const frame = id >= 1 ? 'id' : (en >= 2 ? 'en' : 'neutral');
  return { id, en, frame, isProse: words(text).length >= 6, englishDominant: frame === 'en' };
}

// Indonesian *content* words, used only to catch a translation splice inside an otherwise
// English sentence ("A museum that she visits with her sekolah class"). These are separate
// from the function words above because a splice leaves the English frame intact.
const ID_CONTENT = new Set(('sekolah rumah payung toko pintu gerbang dapur meja permainan menunggu hujan dimainkan nasi makanan pelajaran respons berbasis bukti biografi pribadi perjalanan iklan produk bacaan konkret guru murid teman kelas kegiatan kehidupan keluarga kerja belajar membaca menulis mendengar berbicara melihat membuat').split(' '));

/** Auditable student-facing surface of a rendered question. */
function auditRenderedQuestion(module_, q, ctx = {}) {
  const id = q.id || ctx.id || '(anonymous)';
  const opts = Array.isArray(q.options) ? q.options : null;
  bump(`${module_}.questionsInspected`);

  if (!q.question || !String(q.question).trim()) { critical(module_, 'EMPTY_STEM', id, 'question stem is empty'); return; }
  if (!opts || opts.length < 2) { critical(module_, 'MISSING_OPTIONS', id, `only ${opts ? opts.length : 0} options`); return; }

  // --- answer relationship -------------------------------------------------
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= opts.length) {
    critical(module_, 'ANSWER_INDEX_OUT_OF_RANGE', id, `answerIndex=${q.answerIndex} for ${opts.length} options`);
  } else if (ctx.expectedAnswer !== undefined && ctx.expectedAnswer !== null) {
    if (norm(opts[q.answerIndex]) !== norm(ctx.expectedAnswer)) {
      critical(module_, 'ANSWER_RELATIONSHIP_BROKEN', id,
        'options[answerIndex] is not the declared correct answer', `declared="${ctx.expectedAnswer}" rendered="${opts[q.answerIndex]}"`);
    }
  }

  // --- option hygiene ------------------------------------------------------
  const normed = opts.map(norm);
  if (normed.some(x => !x)) critical(module_, 'EMPTY_OPTION', id, 'an option renders as empty text', JSON.stringify(opts));
  if (new Set(normed).size !== normed.length) {
    critical(module_, 'DUPLICATE_OPTIONS', id, 'two options are the same answer', JSON.stringify(opts));
  } else {
    // Semantic duplicates: two options that make the SAME claim in different words, which
    // leaves the item with no single defensible answer.
    //
    // Deliberately excluded: morphological minimal pairs ("...the chef prepare..." vs
    // "...the chef prepares..."). Those differ by one inflection on a shared stem and are
    // exactly what a grammar drill is supposed to contrast -- flagging them would mean
    // flagging the pedagogy rather than the corruption.
    for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) {
      const a = words(opts[i]), b = words(opts[j]);
      if (!a.length || !b.length || a.length < 4) continue;
      const shared = a.filter(w => b.includes(w)).length;
      if (shared / Math.max(a.length, b.length) < 0.9) continue;
      // A sentence-completion drill renders every option as the same stem with a different
      // filler, so two options share a long prefix and a long suffix and differ only where
      // the blank was. That is the exercise, not a duplicate.
      let pre = 0; while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
      let suf = 0; while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
      // Both options carry the same sentence and differ only where the blank was, which is
      // the whole design of a completion drill: the differing region IS the answer.
      if (pre >= 4 || suf >= 4 || (pre + suf) / Math.max(a.length, b.length) >= 0.6) continue;
      // Word-order drills ("where did I live" vs "where I did live") are the same words in
      // a different order on purpose -- that IS the question in question-formation and
      // inversion lessons.
      if (a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ')) continue;
      major(module_, 'SEMANTIC_DUPLICATE_OPTIONS', id, 'two options are near-identical, so the item has no single defensible answer', `"${opts[i]}" vs "${opts[j]}"`);
    }
  }

  // --- internal leakage ----------------------------------------------------
  for (const surface of [q.question, ...opts]) {
    for (const [re, why] of INTERNAL_MARKERS) {
      if (re.test(String(surface))) {
        critical(module_, 'INTERNAL_LEAK', id, `student-facing text exposes ${why}`, surface);
        break;
      }
    }
  }

  // --- language consistency ------------------------------------------------
  //
  // English is the *target* language, so an option set written entirely in English is
  // correct content, not corruption -- a sentence-completion drill has to offer English
  // sentences. What breaks an item is a SPLIT set: when some options are English prose and
  // others are Indonesian prose, the language itself marks the answer and the student can
  // score without reading either.
  const proseOpts = opts.map(o => ({ o, p: languageProfile(o) })).filter(x => x.p.isProse);
  const english = proseOpts.filter(x => x.p.frame === 'en');
  const indonesian = proseOpts.filter(x => x.p.frame === 'id');
  // A 1-vs-1 split across only two prose options is not a giveaway -- there is no majority
  // to stand out from. The failure needs at least three prose options to be a real signal.
  if (english.length && indonesian.length && english.length + indonesian.length >= 3) {
    const minority = english.length <= indonesian.length ? english : indonesian;
    critical(module_, 'LANGUAGE_MIX', id,
      `option set splits ${english.length} English / ${indonesian.length} Indonesian, so language alone identifies the ${minority.length === 1 ? 'answer' : 'candidates'}`,
      minority[0].o);
  }
  // Mixed *within* a single option ("biografi pribadi of Maya"). The frame must be English
  // for this to be a splice; an Indonesian rule that quotes English grammar terms
  // ("dibentuk dengan am/is/are + kata kerja -ing") is correct writing, not damage.
  for (const o of opts) {
    const p = languageProfile(o);
    if (p.frame !== 'en') continue;
    const spliced = words(o).filter(w => ID_CONTENT.has(w));
    if (spliced.length) {
      critical(module_, 'INTRA_OPTION_LANGUAGE_MIX', id,
        `Indonesian words (${[...new Set(spliced)].join(', ')}) are spliced into an English sentence frame`, o);
    }
  }

  // --- explanation relationship -------------------------------------------
  if (q.explain) {
    if (module_ === 'grammar' && Array.isArray(q.explain.distractors) && q.explain.distractors.length !== opts.length) {
      critical(module_, 'DISTRACTOR_EXPLANATION_MISMATCH', id, `${q.explain.distractors.length} per-option explanations for ${opts.length} options`);
    }
    if (Array.isArray(q.explain.distractors)) {
      for (const d of q.explain.distractors) {
        if (!opts.some(o => norm(o) === norm(d.option))) {
          critical(module_, 'EXPLANATION_ORPHANED', id, 'a per-option explanation refers to an option that is not on screen', d.option);
        }
      }
    }
    if (module_ === 'reading' && q.explain.evidence && ctx.passageText) {
      if (!String(ctx.passageText).toLowerCase().includes(String(q.explain.evidence).toLowerCase().slice(0, 40))) {
        critical(module_, 'EVIDENCE_NOT_IN_PASSAGE', id, 'cited evidence does not appear in the passage it claims to quote', q.explain.evidence);
      }
    }
  }
}

/* =========================================================================
 * STATIC LAYER
 * ======================================================================= */

function auditGrammarSource() {
  const g = readJson('grammar-templates.json');
  const T = Array.isArray(g.templates) ? g.templates : [];
  bump('grammar.recordsInspected', T.length);
  const ids = new Map(), stems = new Map();

  for (const t of T) {
    const id = t.id || '(no id)';
    for (const f of ['id', 'family', 'subskill', 'cefr', 'stem', 'options', 'correctIndex', 'explanation']) {
      if (t[f] === undefined || t[f] === null || t[f] === '') critical('grammar', 'MISSING_FIELD', id, `required field "${f}" missing`);
    }
    if (ids.has(norm(t.id))) critical('grammar', 'DUPLICATE_ID', id, `id reused (also ${ids.get(norm(t.id))})`);
    ids.set(norm(t.id), id);

    if (stems.has(norm(t.stem))) major('grammar', 'DUPLICATE_STEM', id, `identical stem to ${stems.get(norm(t.stem))}`, t.stem);
    stems.set(norm(t.stem), id);

    const opts = Array.isArray(t.options) ? t.options : [];
    if (opts.length < 3) critical('grammar', 'TOO_FEW_OPTIONS', id, `${opts.length} options`);
    if (!Number.isInteger(t.correctIndex) || t.correctIndex < 0 || t.correctIndex >= opts.length) {
      critical('grammar', 'ANSWER_INDEX_OUT_OF_RANGE', id, `correctIndex=${t.correctIndex} for ${opts.length} options`);
    }
    const n = opts.map(norm);
    if (new Set(n).size !== n.length) critical('grammar', 'DUPLICATE_OPTIONS', id, 'duplicate options in source', JSON.stringify(opts));

    // Relationship: every declared distractor must be an option that actually exists,
    // and must never be the correct answer.
    const ds = Array.isArray(t.distractors) ? t.distractors : [];
    for (const d of ds) {
      if (!opts.some(o => norm(o) === norm(d.option))) {
        critical('grammar', 'DISTRACTOR_ORPHANED', id, 'distractor annotation targets an option that does not exist', d.option);
      }
      if (Number.isInteger(t.correctIndex) && norm(d.option) === norm(opts[t.correctIndex])) {
        critical('grammar', 'DISTRACTOR_IS_CORRECT_ANSWER', id, 'the correct answer is annotated as a wrong answer', d.option);
      }
    }
    if (ds.length !== opts.length - 1) {
      major('grammar', 'DISTRACTOR_COVERAGE', id, `${ds.length} distractor annotations for ${opts.length - 1} wrong options`);
    }
    // The label_misconception practice modes offer these labels AS the answer options, so
    // two distractors sharing one label make the item unanswerable. A translation that
    // collapses two distinct English misconceptions into one Indonesian phrase does exactly
    // that, and the source file still looks perfectly well-formed.
    for (const field of ['misconception', 'misconceptionId']) {
      const labels = ds.map(d => norm(d[field])).filter(Boolean);
      if (new Set(labels).size !== labels.length) {
        critical('grammar', 'DUPLICATE_MISCONCEPTION_LABEL', id,
          `two distractors share one ${field}, so the misconception-labelling modes have two identical options`, labels.join(' | '));
      }
    }

    // Indonesian coverage of every student-facing explanation surface.
    const e = t.explanation || {};
    for (const [en, idField] of [['whyCorrect', 'whyCorrectId'], ['rule', 'ruleId'], ['whyOthersFail', 'whyOthersFailId'], ['howToAvoid', 'howToAvoidId'], ['memoryCue', 'memoryCueId']]) {
      if (e[en] && !e[idField]) major('grammar', 'MISSING_INDONESIAN', id, `explanation.${en} has no Indonesian counterpart (${idField})`, e[en]);
    }
    for (const d of ds) {
      if (d.whyFails && !d.whyFailsId) major('grammar', 'MISSING_INDONESIAN', id, `distractor "${d.option}" has no whyFailsId`, d.whyFails);
      if (d.misconception && !d.misconceptionId) major('grammar', 'MISSING_INDONESIAN', id, `distractor "${d.option}" has no misconceptionId`, d.misconception);
    }
    if (t.cefr && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(t.cefr)) {
      critical('grammar', 'INVALID_CEFR', id, `cefr="${t.cefr}"`);
    }
  }
  if (Number.isInteger(g.count) && g.count !== T.length) {
    major('grammar', 'METADATA_DRIFT', 'grammar-templates.json', `declared count=${g.count} but ${T.length} templates present`);
  }
  return T;
}

function auditReadingSource() {
  const R = readJson('reading-bank.json');
  bump('reading.recordsInspected', R.length);
  const ids = new Map(), passages = new Map();
  let qCount = 0;

  for (const r of R) {
    const id = r.id || '(no id)';
    for (const f of ['id', 'level', 'title', 'text', 'qs']) {
      if (r[f] === undefined || r[f] === null || r[f] === '') critical('reading', 'MISSING_FIELD', id, `required field "${f}" missing`);
    }
    if (ids.has(norm(r.id))) critical('reading', 'DUPLICATE_ID', id, `passage id reused (also ${ids.get(norm(r.id))})`);
    ids.set(norm(r.id), id);

    const key = norm(r.text);
    if (passages.has(key)) critical('reading', 'DUPLICATE_PASSAGE', id, `passage text is identical to ${passages.get(key)}`);
    passages.set(key, id);

    for (const [i, q] of (r.qs || []).entries()) {
      qCount++;
      const qid = `${id}#${i}`;
      const stem = q[0], opts = Array.isArray(q[1]) ? q[1] : [], ci = q[2], meta = (q[3] && typeof q[3] === 'object') ? q[3] : {};
      if (!stem) critical('reading', 'EMPTY_STEM', qid, 'question stem missing');
      if (opts.length < 3) critical('reading', 'TOO_FEW_OPTIONS', qid, `${opts.length} options`);
      if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length) {
        critical('reading', 'ANSWER_INDEX_OUT_OF_RANGE', qid, `correctIndex=${ci} for ${opts.length} options`);
        continue;
      }
      // THE relationship that broke this incident: the bank declares an answer string
      // AND an answer index, and the runtime trusts the string. When they disagree the
      // renderer silently overwrites a real option.
      if (meta.answer && norm(meta.answer) !== norm(opts[ci])) {
        critical('reading', 'ANSWER_RELATIONSHIP_BROKEN', qid,
          'meta.answer does not match options[correctIndex]; the renderer will overwrite a real option',
          `meta.answer="${meta.answer}" options[${ci}]="${opts[ci]}"`);
      }
      if (meta.evidence && !String(r.text || '').includes(String(meta.evidence).slice(0, 40))) {
        critical('reading', 'EVIDENCE_NOT_IN_PASSAGE', qid, 'declared evidence is not present in this passage', meta.evidence);
      }
      const n = opts.map(norm);
      if (new Set(n).size !== n.length) critical('reading', 'DUPLICATE_OPTIONS', qid, 'duplicate options', JSON.stringify(opts));
      for (const o of opts) {
        const p = languageProfile(o);
        if (p.isProse && p.id >= 1 && p.en >= 2) {
          critical('reading', 'INTRA_OPTION_LANGUAGE_MIX', qid, 'option mixes Indonesian and English mid-sentence', o);
        }
      }
    }
  }
  bump('reading.questionsInSource', qCount);
  return R;
}

// Irregular forms an example sentence may legitimately use instead of the headword.
const IRREGULAR = {
  break: ['broke', 'broken'], choose: ['chose', 'chosen'], dig: ['dug'], buy: ['bought'], catch: ['caught'],
  bring: ['brought'], build: ['built'], come: ['came'], do: ['did', 'done'], drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'], eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], feel: ['felt'], find: ['found'],
  fly: ['flew', 'flown'], forget: ['forgot', 'forgotten'], get: ['got', 'gotten'], give: ['gave', 'given'],
  go: ['went', 'gone'], grow: ['grew', 'grown'], have: ['had'], hear: ['heard'], hold: ['held'], keep: ['kept'],
  know: ['knew', 'known'], leave: ['left'], lose: ['lost'], make: ['made'], meet: ['met'], pay: ['paid'],
  read: ['read'], ride: ['rode', 'ridden'], run: ['ran'], say: ['said'], see: ['saw', 'seen'], sell: ['sold'],
  send: ['sent'], sing: ['sang', 'sung'], sit: ['sat'], sleep: ['slept'], speak: ['spoke', 'spoken'],
  spend: ['spent'], stand: ['stood'], swim: ['swam', 'swum'], take: ['took', 'taken'], teach: ['taught'],
  tell: ['told'], think: ['thought'], throw: ['threw', 'thrown'], understand: ['understood'],
  wear: ['wore', 'worn'], win: ['won'], write: ['wrote', 'written'], be: ['is', 'are', 'was', 'were', 'been'],
  begin: ['began', 'begun'], bite: ['bit', 'bitten'], blow: ['blew', 'blown'], cost: ['cost'], cut: ['cut'],
  draw: ['drew', 'drawn'], feed: ['fed'], fight: ['fought'], hit: ['hit'], hurt: ['hurt'], lead: ['led'],
  lend: ['lent'], let: ['let'], lie: ['lay', 'lain'], light: ['lit'], mean: ['meant'], put: ['put'],
  rise: ['rose', 'risen'], seek: ['sought'], shake: ['shook', 'shaken'], shoot: ['shot'], show: ['showed', 'shown'],
  shut: ['shut'], steal: ['stole', 'stolen'], stick: ['stuck'], strike: ['struck'], sweep: ['swept'],
  wake: ['woke', 'woken'], wind: ['wound'], bend: ['bent'], send: ['sent'], spell: ['spelt'], burn: ['burnt'],
  learn: ['learnt'], dream: ['dreamt'], kneel: ['knelt'], creep: ['crept'], weep: ['wept'], flee: ['fled'],
};

function auditVocabularySource() {
  const V = readJson('vocabulary-master.json');
  bump('vocabulary.recordsInspected', V.length);
  const ids = new Map(), wordLevel = new Map();
  // Kept in step with indonesianPartOfSpeech() in app.js: a value missing there renders to
  // the student as the raw English tag.
  const POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'determiner', 'interjection', 'phrase', 'modal', 'article', 'numeral', 'auxiliary', 'exclamation', 'ordinal', 'number', 'prefix', 'suffix'];

  for (const v of V) {
    const id = v.id || v.word || '(no id)';
    if (ids.has(norm(v.id))) critical('vocabulary', 'DUPLICATE_ID', id, `id reused (also ${ids.get(norm(v.id))})`);
    ids.set(norm(v.id), id);

    if (v.status !== 'complete') { bump('vocabulary.notComplete'); continue; } // only shipped records gate
    for (const f of ['word', 'level', 'meaning']) {
      if (!v[f] && !(f === 'meaning' && v.meanings?.[0]?.meaning)) critical('vocabulary', 'MISSING_FIELD', id, `required field "${f}" missing on a shipped record`);
    }
    const key = `${norm(v.word)}|${v.level}|${norm(v.partOfSpeech)}`;
    if (wordLevel.has(key)) major('vocabulary', 'DUPLICATE_WORD', id, `"${v.word}" (${v.partOfSpeech}, ${v.level}) duplicates ${wordLevel.get(key)}`);
    wordLevel.set(key, id);

    if (v.partOfSpeech && !POS.includes(String(v.partOfSpeech).toLowerCase())) {
      major('vocabulary', 'INVALID_POS', id, `partOfSpeech="${v.partOfSpeech}" is outside the rendered label set, so it renders raw to the student`);
    }
    // Relationship: the example must actually contain the word it illustrates.
    const example = v.example || v.examples?.[0]?.en || '';
    if (example) {
      // An example is allowed to inflect the headword -- "break" is illustrated by "broke",
      // "automatic" by "automatically", "brush" by "hairbrush". Only an example that shows
      // no form of the word at all is a real defect, because the vocabulary "context"
      // question asks what the word means IN THAT SENTENCE.
      const haystack = ' ' + example.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
      const tokens = haystack.trim().split(' ');
      // Headwords may be multi-word ("all right") or list variants ("ax/axe").
      const variants = String(v.word).toLowerCase().split('/').map(x => x.replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
      const related = variants.some(phrase => {
        if (haystack.includes(' ' + phrase + ' ')) return true;
        const head = phrase.split(' ')[0] || '';
        if (head.length < 3) return false;
        return tokens.some(w =>
          w === head ||
          w.includes(head) ||                                        // hairbrush <- brush
          head.includes(w) ||
          w.startsWith(head) ||                                      // automatically <- automatic
          w.startsWith(head.replace(/e$/, '')) ||                    // chose <- choose is not this, but hoped <- hope is
          w.startsWith(head.replace(/y$/, 'i')) ||                   // cried <- cry
          (IRREGULAR[head] || []).includes(w));
      });
      if (!related) major('vocabulary', 'EXAMPLE_UNRELATED', id, `example sentence shows no form of "${v.word}"`, example);
    }
    const meaning = v.meaning || v.meanings?.[0]?.meaning || '';
    if (meaning && languageProfile(meaning).englishDominant && words(meaning).length >= 6) {
      major('vocabulary', 'MEANING_NOT_INDONESIAN', id, 'Indonesian meaning field holds English prose', meaning);
    }
    if (v.phonetic && !/^\/.*\/$/.test(String(v.phonetic).trim())) {
      minor('vocabulary', 'MALFORMED_IPA', id, `phonetic="${v.phonetic}" is not delimited as IPA`);
    }
    if (v.level && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(v.level)) {
      critical('vocabulary', 'INVALID_CEFR', id, `level="${v.level}"`);
    }
  }
  return V;
}

function auditJsonBank(file, module_, extract, idOf) {
  let bank;
  try { bank = readJson(file); } catch (e) { major(module_, 'BANK_UNREADABLE', file, e.message); return []; }
  const items = extract(bank) || [];
  bump(`${module_}.recordsInspected`, items.length);
  const ids = new Map();
  for (const it of items) {
    const id = idOf(it);
    if (ids.has(norm(id))) critical(module_, 'DUPLICATE_ID', id, `id reused (also ${ids.get(norm(id))})`);
    ids.set(norm(id), id);
    const opts = Array.isArray(it.options) ? it.options : Array.isArray(it.choices) ? it.choices : null;
    if (opts) {
      const ci = Number.isInteger(it.correctIndex) ? it.correctIndex : Number.isInteger(it.answerIndex) ? it.answerIndex : null;
      if (ci === null) { major(module_, 'MISSING_FIELD', id, 'options present but no correct-answer index'); }
      else if (ci < 0 || ci >= opts.length) critical(module_, 'ANSWER_INDEX_OUT_OF_RANGE', id, `index=${ci} for ${opts.length} options`);
      const n = opts.map(norm);
      if (new Set(n).size !== n.length) critical(module_, 'DUPLICATE_OPTIONS', id, 'duplicate options', JSON.stringify(opts));
      if (n.some(x => !x)) critical(module_, 'EMPTY_OPTION', id, 'empty option');
      if (it.answer !== undefined && it.answer !== null && ci !== null && opts[ci] !== undefined && norm(it.answer) !== norm(opts[ci])) {
        critical(module_, 'ANSWER_RELATIONSHIP_BROKEN', id, 'declared answer text disagrees with the indexed option', `answer="${it.answer}" indexed="${opts[ci]}"`);
      }
    }
  }
  return items;
}

/* =========================================================================
 * RUNTIME LAYER — boot app.js the way a browser would.
 * ======================================================================= */

function bootApp() {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const store = {}, elements = {};
  const classList = () => { const v = new Set(); return { add: (...x) => x.forEach(i => v.add(i)), remove: (...x) => x.forEach(i => v.delete(i)), toggle(x, on) { on === undefined ? (v.has(x) ? v.delete(x) : v.add(x)) : (on ? v.add(x) : v.delete(x)); }, contains: x => v.has(x) }; };
  const element = id => elements[id] ||= { id, innerHTML: '', textContent: '', className: '', dataset: {}, style: { setProperty() {} }, classList: classList(), setAttribute() {}, addEventListener() {}, append() {}, focus() {}, onclick: null, disabled: false };
  const document = { baseURI: 'http://localhost/', body: { classList: classList() }, visibilityState: 'visible', getElementById: element, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ className: '', textContent: '', disabled: false, onclick: null, classList: classList(), append() {}, addEventListener() {} }), addEventListener() {} };
  const localStorage = { getItem: k => store[k] || null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };
  const Notification = function () { this.close = () => {}; }; Notification.permission = 'granted'; Notification.requestPermission = async () => 'granted';

  // Resolve fetches by basename anywhere in the repo, mirroring how the PWA ships flat.
  const index = new Map();
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'vendor', 'assets', 'docs', '.audit-tmp'].includes(e.name)) continue; // .audit-tmp: release-audit.py sets TMPDIR=ROOT/.audit-tmp; leftover adoption/rehearsal snapshots there shadow the canonical root data files in this basename index (precedent: level-grammar-contract-test.js)
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full); else if (!index.has(e.name)) index.set(e.name, full);
    }
  })(root);
  const fetchStub = async url => {
    const file = String(url).split('/').pop();
    const full = index.get(file);
    if (!full) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(full, 'utf8')) };
  };
  class FakeAudioContext { constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; } createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } createOscillator() { return { type: 'sine', frequency: { value: 0, setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; } resume() {} suspend() {} close() {} }

  const context = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    Notification, document, localStorage, fetch: fetchStub, window: null, self: null,
    navigator: { vibrate: () => true }, Date, Intl, Math, URL, Error, Promise, JSON,
    setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {},
    SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} },
    AudioContext: FakeAudioContext,
  };
  context.window = context; context.self = context;
  context.FIEZEL_VERSION = readJson('VERSION.json').version;
  context.window.scrollTo = () => {}; context.window.requestAnimationFrame = fn => fn();
  vm.createContext(context);/* Harness i18n (pola W1-TESTPLAN 2b, hotfix CI pasca-#242 lanjutan: tiga harness terlewat bac8b8d): app.js kini memanggil FiezelI18n.t saat evaluasi, jadi runtime i18n + copy-id dimuat dulu. existsSync = hijau dua arah. */const __i18n=path.join(root,'features','i18n','fiezel-i18n.js');if(fs.existsSync(__i18n)){vm.runInContext(fs.readFileSync(__i18n,'utf8'),context,{filename:'fiezel-i18n.js'});for(const __n of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',__n),'utf8'),context,{filename:__n});}}
  vm.runInContext(app, context, { filename: 'app.js' });
  return context;
}

function auditGrammarRuntime(ctx, templates) {
  // Index every internal metadata string back to the template that owns it, so an option
  // borrowed from a different lesson is provable rather than a hunch.
  const owner = new Map();
  const claim = (text, t) => { const k = norm(text); if (k && k.length > 12 && !owner.has(k)) owner.set(k, { id: t.id, family: t.family, cefr: t.cefr, subskill: t.subskill }); };
  // m025-155: mode teach_back dan mastery_check merangkai DUA field jadi satu opsi
  // (objective+rule, howToAvoid+memoryCue). Peta pemilik dulu hanya mengklaim field
  // satuan, sehingga opsi rangkaian tidak pernah bisa dilacak ke template pemiliknya.
  // Sekarang teks GABUNGANNYA (plus varian *Id) ikut diklaim.
  const claimPair = (a, b, t) => { if (a && b) claim(`${a} ${b}`, t); };
  for (const t of templates) {
    for (const f of ['pedagogicalObjective', 'misconceptionTargeted', 'reasoningOperation', 'pedagogicalObjectiveId', 'misconceptionTargetedId', 'reasoningOperationId']) claim(t[f], t);
    const e = t.explanation || {};
    for (const f of ['whyCorrect', 'rule', 'whyOthersFail', 'howToAvoid', 'memoryCue', 'whyCorrectId', 'ruleId', 'whyOthersFailId', 'howToAvoidId', 'memoryCueId']) claim(e[f], t);
    claimPair(t.pedagogicalObjective, e.rule, t); claimPair(t.pedagogicalObjectiveId, e.ruleId, t);
    claimPair(e.howToAvoid, e.memoryCue, t); claimPair(e.howToAvoidId, e.memoryCueId, t);
    for (const d of t.distractors || []) { claim(d.whyFails, t); claim(d.whyFailsId, t); claim(d.misconception, t); claim(d.misconceptionId, t); }
  }
  const byId = new Map(templates.map(t => [t.id, t]));
  // m025-155: nilai GRAMMAR_FAMILY_LABELS adalah taksonomi global, bukan konten milik satu
  // lesson dan bukan pinjaman antar lesson. Label ini tidak boleh dituduh "pinjaman tak
  // berjejak" -- yang salah justru kalau kartu menstempelnya origin 'own'.
  let taxonomyLabels = new Set();
  try { taxonomyLabels = new Set(Object.values(vm.runInContext('GRAMMAR_FAMILY_LABELS', ctx) || {}).map(norm).filter(Boolean)); } catch (e) { /* runtime lama tanpa label global -- check taksonomi otomatis kosong */ }

  const state = ctx.__getFiezelState();
  const prevLevel = state.preferences.activeLevel || '', prevMode = state.preferences.levelMode || 'placement';
  let n = 0;
  for (const t of templates) {
    if (n >= SAMPLE) break;
    state.preferences = { ...state.preferences, activeLevel: t.cefr, levelMode: 'manual' };
    // Semua teks metadata milik template ini sendiri, untuk memisahkan "kebetulan sama"
    // dari "benar-benar dipinjam".
    const ownText = new Set();
    // V20 (wave-2, desain multi-templat per lesson): questions kini datang dari SEMUA templat
    // se-lesson, jadi "teks milik sendiri" = union metadata seluruh sibling satu subskill.
    for (const sib of templates) {
      if (sib.subskill !== t.subskill) continue;
      const e = sib.explanation || {};
      for (const v of [sib.pedagogicalObjective, sib.misconceptionTargeted, sib.reasoningOperation, sib.pedagogicalObjectiveId, sib.misconceptionTargetedId, sib.reasoningOperationId,
        e.whyCorrect, e.rule, e.whyOthersFail, e.howToAvoid, e.memoryCue, e.whyCorrectId, e.ruleId, e.whyOthersFailId, e.howToAvoidId, e.memoryCueId]) if (v) ownText.add(norm(v));
      for (const d of sib.distractors || []) for (const v of [d.whyFails, d.whyFailsId, d.misconception, d.misconceptionId]) if (v) ownText.add(norm(v));
      // m025-155: teks gabungan milik lesson sendiri (teach_back/mastery_check) juga sah.
      for (const [a, b] of [[sib.pedagogicalObjective, e.rule], [sib.pedagogicalObjectiveId, e.ruleId], [e.howToAvoid, e.memoryCue], [e.howToAvoidId, e.memoryCueId]]) if (a && b) ownText.add(norm(`${a} ${b}`));
    }
    let questions = [];
    try { questions = ctx.buildGrammarLessonQuestions(t.subskill, 25) || []; }
    catch (e) { critical('grammar', 'GENERATOR_THREW', t.id, `buildGrammarLessonQuestions crashed for "${t.subskill}"`, e.message); continue; }
    if (questions.length < 25) {
      critical('grammar', 'LESSON_UNDERFILLED', t.id, `lesson "${t.subskill}" produced ${questions.length}/25 valid questions`);
    }
    for (const q of questions) {
      n++;
      auditRenderedQuestion('grammar', q, { expectedAnswer: undefined });
      // Cross-topic contamination.
      //
      // A rule-identification item has to draw its distractors from somewhere, and drawing
      // them from a SIBLING lesson in the same grammar family is the intended design: the
      // student must discriminate between neighbouring rules rather than spot the only
      // on-topic option. What is corruption is borrowing across families -- an A2 tense
      // lesson offering a C1 linking-device rule, which is answerable without knowing
      // either rule.
      for (const o of q.options || []) {
        const src = owner.get(norm(o));
        if (!src || src.id === q.sourceId) continue;
        // V20: teks yang memang ada di metadata lesson ini sendiri bukan pinjaman — owner map
        // first-wins salah-atribusi saat templat baru memuat teks identik dgn templat lama
        // (prinsip yang sama dgn escape ownText di cek provenance di bawah).
        if (ownText.has(norm(o))) continue;
        if (src.family === t.family) continue;
        // A family with fewer than four members cannot supply three sibling distractors, so
        // borrowing from another family at the SAME CEFR band is the least-bad fallback and
        // is recorded as a quality debt. Borrowing across family AND level is the real
        // failure: a C2 rule offered inside an A1 lesson is answerable without any grammar.
        const sameBand = src.cefr === t.cefr;
        const report = sameBand ? major : critical;
        report('grammar', sameBand ? 'CROSS_FAMILY_FALLBACK' : 'CROSS_TOPIC_CONTAMINATION', q.sourceId || t.id,
          `lesson "${t.subskill}" (${t.family}/${t.cefr}) offers an answer option authored for ${src.id} (${src.family}/${src.cefr})`, o);
      }
      // Mode teach_back dan mastery_check merangkai DUA field jadi satu pilihan. Kedua
      // bagian itu harus datang dari template YANG SAMA. Ketika diambil lewat dua undian
      // terpisah, murid membaca dua lesson yang tidak berhubungan dilem jadi satu kalimat:
      // "Memilih in, on, atau at untuk menyatakan letak. Pakai a sebelum bunyi konsonan..."
      if (q.practiceMode === 'teach_back' || q.practiceMode === 'mastery_check') {
        const pair = q.practiceMode === 'teach_back' ? ['pedagogicalObjectiveId', 'ruleId'] : ['howToAvoidId', 'memoryCueId'];
        const coherent = new Set();
        for (const peer of templates) {
          const e = peer.explanation || {};
          const a = pair[0] === 'pedagogicalObjectiveId' ? peer.pedagogicalObjectiveId : e[pair[0]];
          const b = e[pair[1]];
          if (a && b) coherent.add(norm(`${a} ${b}`));
        }
        for (const o of q.options || []) {
          if (words(o).length < 8) continue;
          if (!coherent.has(norm(o))) {
            critical('grammar', 'COMPOSED_OPTION_INCOHERENT', q.sourceId || t.id,
              `${q.practiceMode} option is not one lesson's own pair — two unrelated lessons glued into one sentence`, o);
          }
        }
      }
      // Provenance pilihan: mode "pilih pernyataan yang tepat" meminjam pengecohnya dari
      // template lain. Pinjaman itu harus meninggalkan jejak, DAN harus dijelaskan sebagai
      // pinjaman. Tanpa jejaknya, peta miskonsepsi kartu tidak pernah cocok dan diagnosis
      // Tutor Brain buta; tanpa penjelasan yang benar, sebuah kalimat aturan didiagnosis
      // seolah-olah bentuk kata kerja yang keliru.
      const answerText = q.options?.[q.answerIndex];
      for (const d of q.explain?.distractors || []) {
        if (d.option === answerText) continue;
        // m025-155: label keluarga grammar (GRAMMAR_FAMILY_LABELS) diperlakukan sebagai
        // taksonomi. Ia bukan pinjaman tak berjejak; pelanggarannya justru kalau kartu
        // menstempelnya milik lesson (origin 'own' / own:true), atau mendiagnosisnya
        // seolah-olah bentuk kata kerja yang keliru.
        if (taxonomyLabels.has(norm(d.option))) {
          const prov = Array.isArray(q.optionSources) ? q.optionSources.find(x => x && x.option === d.option) : null;
          if (!prov || prov.own === true || prov.origin === 'own' || (prov.origin !== undefined && prov.origin !== 'taxonomy')) {
            critical('grammar', 'TAXONOMY_STAMPED_AS_OWN', q.sourceId || t.id,
              "a global grammar-family label is stamped as the lesson's own content instead of origin 'taxonomy'", d.option);
          }
          if (/belum cocok dengan waktu, fungsi, atau susunan/.test(String(d.reason))) {
            critical('grammar', 'EXPLANATION_WRONG_KIND', q.sourceId || t.id,
              'a taxonomy family label is diagnosed as if it were a wrong verb form', d.reason);
          }
          continue;
        }
        // "Teksnya juga dimiliki template lain" BUKAN bukti pinjaman: dua lesson boleh
        // menargetkan miskonsepsi yang sama, dan label Indonesianya memang sama. Yang
        // menentukan hanyalah apakah kartu itu sendiri menandainya sebagai pinjaman, atau
        // teksnya sama sekali tidak ada di metadata template ini.
        if (ownText.has(norm(d.option))) continue;
        const borrowed = owner.get(norm(d.option));
        if (borrowed && borrowed.id !== q.sourceId) {
          const prov = Array.isArray(q.optionSources) ? q.optionSources.find(x => x && x.option === d.option) : null;
          // m025-155: entry optionSources kini objek kontrak {sourceId, sourceLevel, origin}.
          // Pinjaman sah = origin 'peer' dengan sourceId non-kosong milik template lain;
          // sourceLevel wajib menyalin cefr template asal supaya pinjaman lintas level
          // dalam keluarga tidak lagi tanpa label.
          const isPeer = prov && prov.origin === 'peer' && prov.sourceId && prov.sourceId !== q.sourceId;
          if (!isPeer || prov.own === true) {
            critical('grammar', 'OPTION_PROVENANCE_LOST', q.sourceId || t.id,
              `an option borrowed from ${borrowed.id} carries no peer provenance {sourceId, sourceLevel, origin:'peer'}, so a wrong pick cannot be traced to the lesson actually confused`, d.option);
          } else if (String(prov.sourceLevel || '') !== String((byId.get(prov.sourceId) || {}).cefr || '')) {
            critical('grammar', 'PEER_LEVEL_UNLABELLED', q.sourceId || t.id,
              `peer option from ${prov.sourceId} carries sourceLevel="${prov.sourceLevel || ''}" but the source template is ${(byId.get(prov.sourceId) || {}).cefr || '?'}`, d.option);
          }
          if (/belum cocok dengan waktu, fungsi, atau susunan/.test(String(d.reason))) {
            critical('grammar', 'EXPLANATION_WRONG_KIND', q.sourceId || t.id,
              'a borrowed rule statement is diagnosed as if it were a wrong verb form', d.reason);
          }
        }
      }
      if (q.sourceId && q.sourceId !== t.id && !templates.some(p => p.subskill === t.subskill && String(p.id) === String(q.sourceId))) {
        critical('grammar', 'CONCEPT_IDENTITY_LOST', t.id, `question claims sourceId=${q.sourceId} inside lesson ${t.subskill}`);
      }
    }
  }
  state.preferences = { ...state.preferences, activeLevel: prevLevel, levelMode: prevMode };
}

function auditReadingRuntime(ctx, R) {
  let n = 0;
  for (const r of R) {
    if (n >= SAMPLE) break;
    for (const [i, q] of (r.qs || []).entries()) {
      n++;
      let rendered;
      try { rendered = ctx.__fiezelAudit.makeReadingQuestion(r, q, i); }
      catch (e) { critical('reading', 'GENERATOR_THREW', `${r.id}#${i}`, 'makeReadingQuestion crashed', e.message); continue; }
      const meta = (q[3] && typeof q[3] === 'object') ? q[3] : {};
      const expected = meta.answer || q[1]?.[q[2]];
      auditRenderedQuestion('reading', rendered, { expectedAnswer: expected, passageText: r.text, id: `${r.id}#${i}` });
      // Every rendered option must be traceable to this passage's own question, or it is
      // a distractor harvested from an unrelated passage.
      const own = new Set((q[1] || []).map(norm));
      if (expected) own.add(norm(expected));
      for (const o of rendered.options || []) {
        if (!own.has(norm(o))) {
          critical('reading', 'CROSS_PASSAGE_CONTAMINATION', `${r.id}#${i}`, 'a rendered option belongs to a different passage', o);
        }
      }
      if (rendered.passage?.id !== r.id) critical('reading', 'PASSAGE_BINDING_BROKEN', `${r.id}#${i}`, `question bound to passage ${rendered.passage?.id}`);
    }
  }
}

function auditVocabularyRuntime(ctx) {
  const V = ctx.__getFiezelData ? null : null;
  let n = 0;
  const bank = ctx.eval ? null : null;
  // Pull the hydrated, shipped vocabulary the runtime actually uses.
  const shipped = vm.runInContext('V', ctx);
  bump('vocabulary.shippedRecords', shipped.length);
  for (const v of shipped) {
    if (n >= SAMPLE) break;
    for (const type of ['meaning', 'context', 'partOfSpeech', 'synonym']) {
      n++;
      let q;
      try { q = ctx.__fiezelAudit.makeVocabQuestion(v, type); }
      catch (e) { critical('vocabulary', 'GENERATOR_THREW', v.id, `makeVocabQuestion crashed for type=${type}`, e.message); continue; }
      auditRenderedQuestion('vocabulary', q, { id: `${v.id}:${type}` });
      if (q.answerIndex < 0) critical('vocabulary', 'ANSWER_NOT_PRESENT', `${v.id}:${type}`, 'the correct answer is not among the rendered options');
    }
  }
}

async function auditPlacementRuntime(ctx) {
  let placement;
  try { placement = await ctx.__fiezelAudit.buildPlacement(); }
  catch (e) { critical('placement', 'GENERATOR_THREW', 'buildPlacement', 'buildPlacement crashed', e.message); return; }
  const items = Array.isArray(placement) ? placement : (placement?.questions || []);
  bump('placement.blueprintSize', items.length);
  if (!items.length) { critical('placement', 'EMPTY_BLUEPRINT', 'placement', 'placement produced no questions'); return; }

  const seen = new Map();
  const byLevel = Object.create(null);
  for (const [i, q] of items.entries()) {
    auditRenderedQuestion('placement', q, { id: q.id || `placement#${i}` });
    byLevel[q.level] = (byLevel[q.level] || 0) + 1;
    const sig = norm(q.question) + '||' + (q.options || []).map(norm).sort().join('|');
    if (seen.has(sig)) critical('placement', 'DUPLICATE_QUESTION', q.id || `#${i}`, `repeats question #${seen.get(sig)} inside one test`);
    seen.set(sig, i);
  }
  stats['placement.cefrDistribution'] = JSON.stringify(byLevel);
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  for (const l of levels) if (!byLevel[l]) major('placement', 'CEFR_GAP', 'placement', `no ${l} item in the blueprint, so that band can never be measured`);
}

/* =========================================================================
 * MAIN
 * ======================================================================= */

(async function main() {
  const templates = auditGrammarSource();
  const R = auditReadingSource();
  auditVocabularySource();

  auditJsonBank('reading-exam-v1.json', 'reading-exam', b => (b.passages || []).flatMap(p => (p.questions || []).map(q => ({ ...q, __p: p.id }))), q => q.id || q.__p);
  auditJsonBank('features/speaking-listening/listening-exam-v1.json', 'listening-exam', b => (b.sets || []).flatMap(s => (s.questions || []).map(q => ({ ...q, __s: s.id }))), q => q.id || q.__s);
  auditJsonBank('features/speaking-listening/listening-bank-v1.json', 'listening', b => b.items || [], x => x.id);
  auditJsonBank('features/speaking-listening/speaking-bank-v1.json', 'speaking', b => b.items || [], x => x.id);
  auditJsonBank('features/speaking-listening/speaking-exam-v1.json', 'speaking-exam', b => b.items || [], x => x.id);
  auditJsonBank('writing-prompts-v1.json', 'writing', b => b.prompts || [], x => x.id);
  auditJsonBank('features/classroom/classroom-lessons-v1.json', 'classroom', b => b.lessons || [], x => x.id);
  auditJsonBank('features/library/library-books-v1.json', 'library', b => b.books || [], x => x.id);

  let ctx = null;
  try { ctx = bootApp(); } catch (e) { critical('runtime', 'BOOT_FAILED', 'app.js', 'app.js could not boot in the audit VM', e.message); }
  if (ctx) {
    await new Promise(r => setTimeout(r, 50)); // let load() settle
    try { auditGrammarRuntime(ctx, templates); } catch (e) { critical('grammar', 'AUDIT_THREW', 'runtime', 'grammar runtime audit crashed', e.stack); }
    try { auditReadingRuntime(ctx, vm.runInContext('R', ctx)); } catch (e) { critical('reading', 'AUDIT_THREW', 'runtime', 'reading runtime audit crashed', e.stack); }
    try { auditVocabularyRuntime(ctx); } catch (e) { critical('vocabulary', 'AUDIT_THREW', 'runtime', 'vocabulary runtime audit crashed', e.stack); }
    try { await auditPlacementRuntime(ctx); } catch (e) { critical('placement', 'AUDIT_THREW', 'runtime', 'placement runtime audit crashed', e.stack); }
  }

  // ---- report -------------------------------------------------------------
  const bySeverity = findings.reduce((a, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {});
  const byCode = {};
  for (const f of findings) { const k = `${f.module}/${f.code}`; byCode[k] = (byCode[k] || 0) + 1; }

  console.log('='.repeat(72));
  console.log('FIEZEL SYSTEM-WIDE CONTENT INTEGRITY AUDIT');
  console.log('='.repeat(72));
  console.log('\nInspection volume:');
  for (const k of Object.keys(stats).sort()) console.log(`  ${k.padEnd(38)} ${stats[k]}`);
  console.log('\nFindings by severity:');
  for (const s of ['CRITICAL', 'MAJOR', 'MINOR']) console.log(`  ${s.padEnd(38)} ${bySeverity[s] || 0}`);
  console.log('\nFindings by class:');
  for (const k of Object.keys(byCode).sort((a, b) => byCode[b] - byCode[a])) console.log(`  ${k.padEnd(52)} ${byCode[k]}`);

  const shown = new Set();
  console.log('\nRepresentative evidence (first occurrence per class):');
  for (const f of findings) {
    const k = `${f.module}/${f.code}`;
    if (shown.has(k)) continue;
    shown.add(k);
    console.log(`  [${f.severity}] ${k} @ ${f.id}\n      ${f.detail}${f.evidence ? `\n      evidence: ${f.evidence}` : ''}`);
  }

  if (WRITE_REPORT) {
    fs.writeFileSync(path.join(root, 'CONTENT-INTEGRITY-AUDIT.json'), JSON.stringify({
      schema: 'fiezel-content-integrity-audit-v1',
      generatedFrom: 'content-integrity-audit.js',
      version: readJson('VERSION.json').version,
      inspection: stats, bySeverity, byCode,
      findings: findings.slice(0, 4000),
      truncated: findings.length > 4000 ? findings.length - 4000 : 0,
    }, null, 2) + '\n');
    console.log('\nWrote CONTENT-INTEGRITY-AUDIT.json');
  }

  const criticals = bySeverity.CRITICAL || 0;
  console.log(`\n${criticals ? 'FAIL' : 'PASS'} — ${criticals} critical integrity failures.`);
  process.exit(criticals ? 1 : 0);
})();
