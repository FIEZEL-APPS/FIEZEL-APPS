#!/usr/bin/env node
/**
 * FIEZEL Braincore — buyer demonstration (Fase 2 / Phase Q).
 *
 * WHAT THIS IS. Four questions a buyer actually asks, each answered by RUNNING Braincore and
 * printing what it did. Every number below is produced by braincore-runtime.js -> the standalone
 * front door -> braincore-pipeline.js -> the 23 real modules in features/brain/. Nothing is
 * mocked, transcribed from an earlier run, or written by hand. There is no UI here and no
 * screenshot: a screenshot proves that someone can draw, not that an engine can decide.
 *
 * HOW IT IS BUILT, AND WHY THAT SHAPE. Every scenario is a PAIR (or triple) of arms that differ
 * in exactly ONE observable, run against the same engine from the same empty starting state. A
 * single arm can only show that Braincore produced an output; the buyer's question is narrower
 * and harder — "did it decide DIFFERENTLY BECAUSE of what it observed?" — and only a contrast
 * can answer that. Where two arms end at the same mastery number but a different decision, that
 * is the point being made, not a coincidence.
 *
 * THIS DEMONSTRATION CAN FAIL. Each scenario carries explicit CLAIMS, checked against the run
 * while it happens; a false claim exits non-zero and CI goes red. The claims are RELATIONS
 * ("A raises the level and B does not", "guess-speed evidence counts for less than considered
 * evidence"), never recorded constants, so they keep meaning something if the numbers move for
 * a good reason. A demonstration that cannot fail is a brochure.
 *
 * WHAT IT DOES NOT SHOW, stated here so nobody has to infer it. These are synthetic learners.
 * The scenarios prove that Braincore OBSERVES, UPDATES and DECIDES DIFFERENTLY — they do not
 * prove any of those decisions is pedagogically right, and no data in this repository can prove
 * that. Only real learners can, and the readiness for that is Phase K, not this file.
 *
 * DETERMINISTIC. No clock, no randomness: every timestamp is injected. Two runs of this file
 * on one Braincore release produce byte-identical output.
 *
 * USAGE
 *   node braincore-demo.js            run + print the transcript (exit 1 if a claim fails)
 *   node braincore-demo.js --json     machine-readable result
 *   node braincore-demo.js --quiet    claims only, no transcript
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Runtime = require('./braincore-runtime.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;   // epoch tetap; tidak ada Date.now() di berkas ini

/** Soal dasar yang dipakai sebagian besar skenario — bentuknya sama dengan bank soal app.js. */
const Q_PAST_SIMPLE = Object.freeze({
  id: 'g-past-simple-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
});

function round(v, n) {
  if (v === null || v === undefined || !isFinite(v)) return null;
  const f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

/**
 * Jalankan satu lengan lewat RUNTIME, bukan lewat pipeline langsung.
 *
 * Pilihan yang disengaja: braincore-runtime.js adalah pintu yang akan dipakai pembeli kalau ia
 * menanam Braincore di aplikasinya sendiri. Mendemonstrasikan lewat pintu itu berarti yang
 * ditunjukkan adalah barang yang dijual, bukan jalur internal yang kebetulan lebih rapi.
 */
function runArm(arm) {
  const rt = Runtime.create({ level: arm.level || 'A2', now: T0 });
  const turns = [];
  let lastSession = -1;

  for (const ev of arm.events) {
    const now = T0 + Math.round(Number(ev.day || 0) * DAY);
    const session = Number(ev.session || 0);
    // Sesi baru = TutorBrain.createSession() sekali per kuis, persis app.js. Ledger miskonsepsi
    // menuntut MIN_SESSIONS >= 2, jadi tanpa ini pagar itu mustahil dilewati dan skenario 2
    // akan "membuktikan" hal yang tidak benar.
    if (session !== lastSession) { rt.newSession(now); lastSession = session; }

    const q = Object.assign({}, arm.question || Q_PAST_SIMPLE, ev.question || {});
    const evidence = {
      correct: ev.correct === true,
      ms: Number(ev.ms) || 0,
      ...(ev.integrity ? { integrity: ev.integrity } : {}),
      ...(ev.langLoad ? { langLoad: ev.langLoad } : {}),
      ...(ev.chosenMisconception ? { chosenMisconception: ev.chosenMisconception } : {}),
      ...(ev.remaining !== undefined ? { remaining: Number(ev.remaining) } : {})
    };

    const r = rt.answer(q, evidence, now);
    const t = r.trace;
    turns.push({
      day: Number(ev.day || 0),
      session,
      concept: String(q.concept || ''),
      correct: evidence.correct,
      ms: evidence.ms,
      kappa: t.evidence.kappa,
      predicted: round(t.evidence.predicted, 3),
      masteryL: round(t.masteryAfter && t.masteryAfter.L, 3),
      masteryN: t.masteryAfter ? t.masteryAfter.n : null,
      stabilityDays: round(t.memoryAfter && t.memoryAfter.stabilityDays, 3),
      retrievabilityAtReview: round(t.memoryBefore && t.memoryBefore.retrievability, 3),
      activeMisconceptions: t.misconceptionState ? t.misconceptionState.activeCount : 0,
      topMisconception: t.misconceptionState ? t.misconceptionState.topCode : '',
      difficulty: round(t.difficultyState && t.difficultyState.effective, 3),
      decision: t.decision,
      move: t.decisionRaw,
      reason: t.decisionReason,
      reasonCodes: t.reasonCodes.slice(),
      guardErrors: r.guardErrors.slice()
    });
  }

  const last = turns[turns.length - 1];
  return {
    id: arm.id, label: arm.label, differsBy: arm.differsBy, turns, last,
    guardErrors: turns.reduce((n, t) => n + t.guardErrors.length, 0)
  };
}

const SCENARIOS = [
  // ---------------------------------------------------------------------------------------
  {
    id: 'Q1',
    title: 'The learner is doing well. Does Braincore raise the challenge?',
    buyerQuestion:
      'Two learners answer the SAME seven questions and get ALL seven right. One recalls the '
      + 'answers fluently; the other gets there, but has to work for it every time. Does Braincore '
      + 'treat them the same?',
    arms: [
      { id: 'A', label: 'Fluent recall', differsBy: 'last three answers arrive in 5.0 s',
        events: [1, 2, 3, 4].map((d) => ({ day: d, correct: true, ms: 12000, session: 0 }))
          .concat([5, 6, 7].map((d) => ({ day: d, correct: true, ms: 5000, session: 0 }))) },
      { id: 'B', label: 'Correct, but laboured', differsBy: 'last three answers still take 12.0 s',
        events: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ day: d, correct: true, ms: 12000, session: 0 })) }
    ],
    claims(a) {
      const A = a.A.last, B = a.B.last;
      return [
        { text: 'The fluent learner is moved UP a level (move "stretch", reason "too_easy")',
          ok: A.move === 'stretch' && A.reason === 'too_easy',
          evidence: 'arm A ends on move=' + A.move + ' reason=' + A.reason },
        { text: 'The laboured learner is NOT moved up — the same seven correct answers do not earn it',
          ok: B.move !== 'stretch',
          evidence: 'arm B ends on move=' + B.move + ' reason=' + B.reason },
        { text: 'Both learners reach the SAME mastery number — so the different decision came from '
              + 'HOW the answers arrived, not from the score',
          ok: A.masteryL === B.masteryL && A.masteryN === B.masteryN,
          evidence: 'A mastery=' + A.masteryL + ' n=' + A.masteryN + ' | B mastery=' + B.masteryL + ' n=' + B.masteryN }
      ];
    }
  },

  // ---------------------------------------------------------------------------------------
  {
    id: 'Q2',
    title: 'The learner keeps struggling. Does Braincore detect it and change the path?',
    buyerQuestion:
      'Two learners each get FOUR questions wrong across two sessions. One is wrong the same way '
      + 'every time — the same underlying misunderstanding. The other is wrong on four different '
      + 'things, with correct answers in between. Does Braincore tell those two apart?',
    arms: [
      { id: 'A', label: 'Wrong the same way, four times, across two sessions',
        differsBy: 'one repeated misconception (m_ed_ending) on one concept',
        events: [
          { day: 1, correct: false, ms: 7000, session: 0, chosenMisconception: 'm_ed_ending' },
          { day: 2, correct: false, ms: 7000, session: 0, chosenMisconception: 'm_ed_ending' },
          { day: 3, correct: false, ms: 7000, session: 1, chosenMisconception: 'm_ed_ending' },
          { day: 4, correct: false, ms: 7000, session: 1, chosenMisconception: 'm_ed_ending' }
        ] },
      { id: 'B', label: 'Four scattered mistakes, different things each time',
        differsBy: 'four different concepts, four different misconceptions, correct answers between',
        events: [
          { day: 1, correct: false, ms: 7000, session: 0, chosenMisconception: 'm_ed_ending',
            question: { id: 'g-1', concept: 'past-simple', lesson: 'past-simple' } },
          { day: 1, correct: true, ms: 7000, session: 0,
            question: { id: 'g-1', concept: 'past-simple', lesson: 'past-simple' } },
          { day: 2, correct: false, ms: 7000, session: 0, chosenMisconception: 'm_article_a_an',
            question: { id: 'g-2', concept: 'articles', lesson: 'articles' } },
          { day: 2, correct: true, ms: 7000, session: 0,
            question: { id: 'g-2', concept: 'articles', lesson: 'articles' } },
          { day: 3, correct: false, ms: 7000, session: 1, chosenMisconception: 'm_plural_s',
            question: { id: 'g-3', concept: 'plurals', lesson: 'plurals' } },
          { day: 3, correct: true, ms: 7000, session: 1,
            question: { id: 'g-3', concept: 'plurals', lesson: 'plurals' } },
          { day: 4, correct: false, ms: 7000, session: 1, chosenMisconception: 'm_prep_in_on',
            question: { id: 'g-4', concept: 'prepositions', lesson: 'prepositions' } },
          { day: 4, correct: true, ms: 7000, session: 1,
            question: { id: 'g-4', concept: 'prepositions', lesson: 'prepositions' } }
        ] }
    ],
    claims(a) {
      const A = a.A, B = a.B;
      const aReteach = A.turns.filter((t) => t.reason === 'persistent_misconception');
      const bReteach = B.turns.filter((t) => t.reason === 'persistent_misconception');
      return [
        { text: 'The repeated misunderstanding is NAMED, not just counted as "four wrong answers"',
          ok: A.last.activeMisconceptions >= 1 && A.last.topMisconception === 'm_ed_ending',
          evidence: 'arm A active=' + A.last.activeMisconceptions + ' top="' + A.last.topMisconception + '"' },
        { text: 'The path changes: Braincore stops testing and re-teaches, citing the misconception',
          ok: aReteach.length >= 1 && aReteach[0].decision === 'reteach',
          evidence: 'arm A re-teaches on ' + aReteach.length + ' of ' + A.turns.length + ' turns, reason="persistent_misconception"' },
        { text: 'The scattered learner is NOT accused — same number of wrong answers, no pattern claimed',
          ok: B.last.activeMisconceptions === 0 && bReteach.length === 0,
          evidence: 'arm B active=' + B.last.activeMisconceptions + ', persistent_misconception turns=' + bReteach.length },
        { text: 'The accusation needs TWO sessions, not one bad afternoon — it is withheld on the first',
          ok: A.turns[0].activeMisconceptions === 0 && A.turns[1].activeMisconceptions === 0,
          evidence: 'arm A session 0 ends with active=' + A.turns[1].activeMisconceptions
                  + '; it only becomes active in session 1' }
      ];
    }
  },

  // ---------------------------------------------------------------------------------------
  {
    id: 'Q3',
    title: 'The learner goes away and forgets. Does the review schedule change?',
    buyerQuestion:
      'A learner gets something right, disappears, and comes back. Does Braincore schedule the '
      + 'next review differently depending on how long they were away — and on whether they still '
      + 'remembered when they came back?',
    arms: [
      { id: 'A', label: 'Away 30 days, still remembered', differsBy: '30-day gap, answer correct',
        events: [{ day: 1, correct: true, ms: 7000, session: 0 },
                 { day: 31, correct: true, ms: 7000, session: 1 }] },
      { id: 'B', label: 'Away 1 day, remembered', differsBy: '1-day gap, answer correct',
        events: [{ day: 1, correct: true, ms: 7000, session: 0 },
                 { day: 2, correct: true, ms: 7000, session: 1 }] },
      { id: 'C', label: 'Away 30 days, had forgotten', differsBy: '30-day gap, answer wrong',
        events: [{ day: 1, correct: true, ms: 7000, session: 0 },
                 { day: 31, correct: false, ms: 7000, session: 1 }] }
    ],
    claims(a) {
      const A = a.A.last, B = a.B.last, C = a.C.last;
      return [
        { text: 'Recalling something after a LONG gap buys a much longer next interval than '
              + 'recalling it after a short one (the spacing effect, not a fixed +1 day)',
          ok: A.stabilityDays > B.stabilityDays * 2,
          evidence: '30-day gap -> ' + A.stabilityDays + ' days of stability; 1-day gap -> ' + B.stabilityDays },
        { text: 'Braincore knew the memory had decayed BEFORE the answer arrived — it expects '
              + 'recall after one day and expects none after thirty',
          ok: A.retrievabilityAtReview !== null && B.retrievabilityAtReview !== null
              && A.retrievabilityAtReview < B.retrievabilityAtReview,
          evidence: 'expected recall at the moment of review: after 1 day = ' + B.retrievabilityAtReview
                  + ', after 30 days = ' + A.retrievabilityAtReview + ' (1.0 = certain recall)' },
        { text: 'Forgetting COLLAPSES the interval — it is not merely "a bit shorter"',
          ok: C.stabilityDays < A.stabilityDays / 10,
          evidence: 'remembered -> ' + A.stabilityDays + ' days; forgotten -> ' + C.stabilityDays + ' days' },
        { text: 'Same 30-day gap, opposite outcomes: the schedule follows the EVIDENCE, not the calendar',
          ok: A.stabilityDays !== C.stabilityDays && a.A.turns[1].day === a.C.turns[1].day,
          evidence: 'both returned on day ' + a.A.turns[1].day + '; stability ' + A.stabilityDays
                  + ' vs ' + C.stabilityDays }
      ];
    }
  },

  // ---------------------------------------------------------------------------------------
  {
    id: 'Q4',
    title: 'The evidence is unreliable. Does Braincore lower its confidence?',
    buyerQuestion:
      'Three learners all answer CORRECTLY. One thinks about it. One is clicking too fast to have '
      + 'read the question. One answered an item the content pipeline has flagged as broken. Are '
      + 'all three "correct" worth the same to Braincore?',
    arms: [
      { id: 'A', label: 'Considered answers', differsBy: '12.0 s then 5.0 s per answer, nothing flagged',
        events: [1, 2, 3, 4].map((d) => ({ day: d, correct: true, ms: 12000, session: 0 }))
          .concat([5, 6, 7].map((d) => ({ day: d, correct: true, ms: 5000, session: 0 }))) },
      { id: 'B', label: 'Guess-speed answers', differsBy: '0.9 s per answer — below the reading floor',
        events: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ day: d, correct: true, ms: 900, session: 0 })) },
      { id: 'C', label: 'Answer on a broken item', differsBy: 'integrity = evidence_mismatch',
        events: [{ day: 1, correct: true, ms: 7000, session: 0, integrity: 'evidence_mismatch' }] }
    ],
    claims(a) {
      const A = a.A, B = a.B, C = a.C;
      return [
        { text: 'Guess-speed correct answers are worth LESS as evidence than considered ones',
          ok: B.last.kappa < A.last.kappa,
          evidence: 'evidence weight: considered=' + A.last.kappa + ', guess-speed=' + B.last.kappa },
        { text: 'Because the evidence is worth less, the confidence it buys is lower — seven '
              + 'correct answers do NOT produce the same mastery',
          ok: B.last.masteryL < A.last.masteryL,
          evidence: 'mastery after 7 correct: considered=' + A.last.masteryL + ', guess-speed=' + B.last.masteryL },
        { text: 'And the guesser is NOT promoted: Braincore names the reason rather than rewarding the streak',
          ok: B.last.move !== 'stretch' && B.last.reason === 'streak_but_guessing',
          evidence: 'arm B ends on move=' + B.last.move + ' reason="' + B.last.reason
                  + '"; arm A ends on move=' + A.last.move },
        { text: 'Evidence from an item flagged as broken is DISCARDED, not merely discounted',
          ok: C.last.kappa === 0,
          evidence: 'evidence weight on the flagged item = ' + C.last.kappa + ' (0 = counts for nothing)' }
      ];
    }
  }
];

// =========================================================================================

function runAll() {
  const out = { braincoreVersion: Manifest.bundleVersion, scenarios: [], failed: [] };
  for (const sc of SCENARIOS) {
    const arms = {};
    for (const arm of sc.arms) arms[arm.id] = runArm(arm);
    const claims = sc.claims(arms);
    const guardErrors = Object.values(arms).reduce((n, a) => n + a.guardErrors, 0);
    for (const c of claims) if (!c.ok) out.failed.push({ scenario: sc.id, claim: c.text, evidence: c.evidence });
    // Penjaga yang tidak boleh senyap: kalau satu langkah pipeline melempar, demonstrasi ini
    // masih akan mencetak angka yang kelihatan masuk akal. Jadi galat yang tertangkap dihitung
    // dan menggagalkan demonstrasi, bukan cuma dicatat di pojok.
    if (guardErrors > 0) out.failed.push({ scenario: sc.id, claim: 'no silent module failure',
      evidence: guardErrors + ' guard error(s) were swallowed during the run' });
    out.scenarios.push({ id: sc.id, title: sc.title, buyerQuestion: sc.buyerQuestion, arms, claims, guardErrors });
  }
  return out;
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

function printTranscript(res) {
  console.log(renderTranscript(res));
}

/**
 * Render transkrip ke STRING, bukan langsung ke layar.
 *
 * Satu perender untuk dua muara — terminal dan SALE/BRAINCORE_DEMONSTRATION.md — supaya
 * dokumen jual TIDAK BISA menyimpang dari apa yang mesin ini benar-benar cetak. Dokumen jual
 * yang memuat angka basi adalah cara paling mahal untuk kehilangan kepercayaan pembeli, dan
 * satu-satunya cara mencegahnya adalah membuat angkanya mustahil ditulis tangan.
 */
function renderTranscript(res) {
  const L = [];
  const console = { log: (...a) => L.push(a.join(' ')) };   // eslint-disable-line no-shadow
  console.log('');
  console.log('FIEZEL BRAINCORE — DEMONSTRATION');
  console.log('Braincore ' + res.braincoreVersion + ' · every number below was produced by running the engine');
  console.log('='.repeat(94));

  for (const sc of res.scenarios) {
    console.log('');
    console.log(sc.id + '. ' + sc.title);
    console.log('-'.repeat(94));
    console.log(wrap(sc.buyerQuestion, 94));

    for (const armId of Object.keys(sc.arms)) {
      const arm = sc.arms[armId];
      console.log('');
      console.log('  ARM ' + arm.id + ' — ' + arm.label);
      console.log('  differs only by: ' + arm.differsBy);
      console.log('  ' + pad('day', 5) + pad('answer', 9) + padL('ms', 7) + padL('weight', 8)
        + padL('mastery', 9) + padL('review in', 11) + '  ' + pad('decision', 11) + 'reason');
      console.log('  ' + '-'.repeat(90));
      for (const t of arm.turns) {
        console.log('  ' + pad(t.day, 5)
          + pad(t.correct ? 'correct' : 'WRONG', 9)
          + padL(t.ms, 7)
          + padL(t.kappa === null ? '-' : t.kappa, 8)
          + padL(t.masteryL === null ? '-' : t.masteryL, 9)
          + padL(t.stabilityDays === null ? '-' : t.stabilityDays + ' d', 11)
          + '  ' + pad(t.move || t.decision, 11) + t.reason);
      }
    }

    console.log('');
    console.log('  WHAT THIS SHOWS');
    for (const c of sc.claims) {
      console.log('   ' + (c.ok ? '[holds]    ' : '[FAILED]   ') + wrap(c.text, 88, 15).trim());
      console.log('              evidence: ' + c.evidence);
    }
  }
  return L.join('\n');
}

function wrap(text, width, indent) {
  const pre = ' '.repeat(indent || 0);
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line.length + 1 + w.length) > width) { lines.push(line); line = ''; }
    line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines.map((l) => pre + l).join('\n');
}

/* Dokumen jual dibangkitkan dari perender yang sama, lewat SATU pintu.
 *
 * Penandanya tetap di berkas .md supaya prosa untuk pembeli tetap ditulis tangan dan tetap
 * hidup di kontrol versi; yang dibangkitkan hanya transkripnya. Gerbangnya
 * (braincore-demo-test.js) meng-assert isi di antara penanda SAMA PERSIS dengan jalan hari
 * ini — jadi dokumen jual yang basi merah di CI, bukan diam-diam beredar ke pembeli. */
const DOC_PATH = path.join(__dirname, 'SALE', 'BRAINCORE_DEMONSTRATION.md');
const DOC_BEGIN = '<!-- BEGIN GENERATED TRANSCRIPT — node braincore-demo.js --write-doc -->';
const DOC_END = '<!-- END GENERATED TRANSCRIPT -->';

/** Blok transkrip yang SEHARUSNYA ada di dokumen, apa adanya dari jalan sekarang. */
function docBlock(res) {
  return DOC_BEGIN + '\n\n```text\n' + renderTranscript(res).replace(/^\n/, '') + '\n```\n\n' + DOC_END;
}

/** Ambil blok yang SEKARANG ada di dokumen. null bila penandanya tidak lengkap. */
function docBlockOnDisk() {
  if (!fs.existsSync(DOC_PATH)) return null;
  const teks = fs.readFileSync(DOC_PATH, 'utf8');
  const a = teks.indexOf(DOC_BEGIN);
  const b = teks.indexOf(DOC_END);
  if (a === -1 || b === -1 || b < a) return null;
  return teks.slice(a, b + DOC_END.length);
}

function writeDoc(res) {
  const teks = fs.readFileSync(DOC_PATH, 'utf8');
  const a = teks.indexOf(DOC_BEGIN);
  const b = teks.indexOf(DOC_END);
  if (a === -1 || b === -1 || b < a) {
    throw new Error('SALE/BRAINCORE_DEMONSTRATION.md kehilangan penanda transkrip');
  }
  fs.writeFileSync(DOC_PATH, teks.slice(0, a) + docBlock(res) + teks.slice(b + DOC_END.length));
}

module.exports = { SCENARIOS, runArm, runAll, renderTranscript, docBlock, docBlockOnDisk, T0, DAY, DOC_PATH };

if (require.main === module) {
  const res = runAll();
  if (process.argv.includes('--write-doc')) {
    writeDoc(res);
    console.log('SALE/BRAINCORE_DEMONSTRATION.md: transkrip diperbarui dari jalan hari ini'
      + ' (Braincore ' + res.braincoreVersion + ').');
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2));
  } else if (!process.argv.includes('--quiet')) {
    printTranscript(res);
  }

  const total = res.scenarios.reduce((n, s) => n + s.claims.length, 0);
  console.log('');
  console.log('='.repeat(94));
  if (res.failed.length) {
    console.error('DEMONSTRATION FAILED: ' + res.failed.length + ' of ' + total + ' claims no longer hold.');
    for (const f of res.failed) console.error('  ' + f.scenario + ': ' + f.claim + '\n      ' + f.evidence);
    console.error('');
    console.error('A claim here is a RELATION, not a recorded number, so this is not a snapshot');
    console.error('drifting — it means Braincore stopped doing something this demonstration says');
    console.error('it does. Fix the engine, or withdraw the claim. Do not relax the assertion.');
    process.exit(1);
  }
  console.log('All ' + total + ' claims hold, on Braincore ' + res.braincoreVersion + '.');
  console.log('');
  console.log('READ THIS BEFORE QUOTING ANY OF IT. These are synthetic learners. What is proven');
  console.log('above is that Braincore OBSERVES the learner, UPDATES its internal state, and');
  console.log('DECIDES DIFFERENTLY because of what it observed. It is NOT proven that any of');
  console.log('those decisions teaches better than another approach — no data in this repository');
  console.log('can show that, and only real learners could.');
}
