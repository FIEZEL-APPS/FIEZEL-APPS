#!/usr/bin/env node
/**
 * FIEZEL Braincore Benchmark v1 — pengukur berulang untuk JALUR KEPUTUSAN PER-JAWABAN
 * (Fase 2 / Phase G).
 *
 * APA YANG DIUKUR, DAN APA YANG SUDAH ADA PEMILIKNYA.
 * Repo ini SUDAH punya pembanding kebijakan yang serius: adaptivity-simulation-v3.js (berseed,
 * murid laten, bootstrap CI, terdaftar di CI). Ia mengukur lapisan PEMILIHAN SOAL, dan ia hanya
 * memakai TIGA dari 21 modul Braincore — core-brain, item-calibration, stat-gate.
 *
 * Tolok ukur ini SENGAJA tidak menyentuh lapisan itu. Ia mengukur delapan belas modul sisanya:
 * jalur keputusan per-jawaban — bukti -> kredibilitas -> mastery -> ingatan -> miskonsepsi ->
 * kesulitan -> tindakan — lewat braincore-pipeline.js. Membangun tolok ukur kedua di atas
 * lapisan yang sama akan melahirkan dua himpunan angka yang suatu hari berselisih, dan tidak
 * ada yang tahu mana yang benar. Lihat AUDIT/08.
 *
 * ================================================================================
 * BACA INI SEBELUM MENGUTIP ANGKA MANA PUN DARI SINI.
 *
 * Nilai `expect` di braincore-benchmark-v1.json DIREKAM DARI MESIN INI, bukan diturunkan dari
 * teori belajar dan bukan divalidasi terhadap murid nyata. Karena itu tolok ukur ini
 * membuktikan STABILITAS dan KETERBANDINGAN — "rilis ini memutuskan persis seperti rilis
 * kemarin", dan "dua rilis bisa dibandingkan pada skenario yang sama" — dan ia TIDAK
 * membuktikan KEBENARAN. Ia tidak bisa memberi tahu siapa pun bahwa mengulang materi setelah
 * dua kali salah adalah keputusan pedagogis yang tepat.
 *
 * Membaca "12/12 skenario cocok" sebagai "Braincore benar" adalah salah baca yang paling
 * mungkin terjadi terhadap berkas ini, jadi kalimat itu ditulis di sini, di laporannya, dan
 * di dalam JSON-nya.
 * ================================================================================
 *
 * DETERMINISTIK. Tanpa jam, tanpa acak: setiap waktu disuntikkan dari skenario. Dua jalan
 * dengan masukan identik WAJIB menghasilkan sidik jari identik — syarat mutlak sebelum dua
 * rilis Braincore boleh dibandingkan (Fase P).
 *
 * PEMAKAIAN
 *   node braincore-benchmark.js                    jalankan + bandingkan (keluar 1 bila beda)
 *   node braincore-benchmark.js --json             cetak hasil mentah
 *   node braincore-benchmark.js --write-expectations   rekam ulang (TINDAKAN SADAR)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const P = require('./braincore-pipeline.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

const SPEC_PATH = path.join(__dirname, 'benchmarks', 'braincore-benchmark-v1.json');
const DAY = 86_400_000;

/** Delapan hal yang WAJIB diukur (brief Fase G). Gerbangnya meng-assert tiap satunya dipegang
 *  sedikitnya satu skenario — tolok ukur yang melewatkan satu pengukuran diam-diam adalah
 *  tolok ukur yang mengaku lebih luas daripada kenyataannya. */
const MEASUREMENTS = Object.freeze([
  'mastery_response',
  'memory_response',
  'misconception_persistence',
  'difficulty_adaptation',
  'evidence_credibility',
  'next_action_selection',
  'consistency',
  'regression_safety'
]);

function round(v, n) {
  if (v === null || v === undefined || !isFinite(v)) return null;
  const f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

/**
 * Jalankan satu skenario dan kembalikan SIDIK JARInya.
 *
 * Sidik jari sengaja memuat DERET keputusan dan alasan, bukan hanya keadaan akhir: dua rilis
 * bisa tiba di mastery yang sama lewat jalan yang sangat berbeda, dan jalan itulah yang
 * menarik. Keadaan akhir saja akan menyembunyikannya.
 */
function runScenario(sc) {
  const t0 = Number(sc.startMs) || 1_700_000_000_000;
  let learner = P.createLearner({ level: String(sc.level || 'A2'), now: t0 });
  const rows = [];
  let lastSession = -1;

  for (const ev of (sc.events || [])) {
    const now = t0 + Math.round(Number(ev.day || 0) * DAY);
    const session = Number(ev.session || 0);
    // Sesi baru meniru app.js: TutorBrain.createSession() sekali per kuis. Ledger miskonsepsi
    // menuntut MIN_SESSIONS >= 2, jadi tanpa ini pagar itu mustahil dilewati.
    if (session !== lastSession) { learner = P.newSession(learner, now); lastSession = session; }

    const q = Object.assign({}, sc.question, ev.question || {});
    const a = {
      correct: ev.correct === true,
      ms: Number(ev.ms) || 0,
      ...(ev.langLoad ? { langLoad: ev.langLoad } : {}),
      ...(ev.integrity ? { integrity: ev.integrity } : {}),
      ...(Number(ev.replayCount) > 0 ? { replayCount: Number(ev.replayCount) } : {}),
      ...(ev.chosenMisconception ? { chosenMisconception: ev.chosenMisconception } : {}),
      ...(ev.remaining !== undefined ? { remaining: Number(ev.remaining) } : {})
    };
    const r = P.answer(learner, q, a, now);
    learner = r.learner;
    rows.push(r);
  }

  if (!rows.length) throw new Error(sc.id + ': skenario tanpa satu pun kejadian');
  const last = rows[rows.length - 1].trace;
  const reasonUnion = new Set();
  for (const r of rows) for (const c of r.trace.reasonCodes) reasonUnion.add(c);

  return {
    masteryL: round(last.masteryAfter && last.masteryAfter.L, 3),
    masteryN: last.masteryAfter ? last.masteryAfter.n : null,
    stabilityDays: round(last.memoryAfter && last.memoryAfter.stabilityDays, 3),
    retrievability: round(last.memoryAfter && last.memoryAfter.retrievability, 3),
    activeMisconceptions: last.misconceptionState ? last.misconceptionState.activeCount : null,
    topMisconception: last.misconceptionState ? last.misconceptionState.topCode : null,
    difficulty: last.difficultyState
      ? { prior: last.difficultyState.prior, effective: last.difficultyState.effective, target: last.difficultyState.target }
      : null,
    decisions: rows.map((r) => r.trace.decision),
    decisionRaw: rows.map((r) => r.trace.decisionRaw),
    decisionReasons: rows.map((r) => r.trace.decisionReason),
    kappas: rows.map((r) => r.trace.evidence.kappa),
    reasonCodes: [...reasonUnion].sort(),
    // Penjaga yang tidak boleh senyap: setiap galat yang tertangkap ikut terekam, jadi
    // degradasi diam-diam muncul sebagai PERUBAHAN sidik jari, bukan sebagai angka yang
    // kebetulan masih terlihat masuk akal.
    guardErrors: rows.reduce((n, r) => n + r.guardErrors.length, 0)
  };
}

function loadSpec() {
  if (!fs.existsSync(SPEC_PATH)) {
    throw new Error('benchmarks/braincore-benchmark-v1.json belum ada. '
      + 'Jalankan sekali dengan --write-expectations (tindakan sadar).');
  }
  return JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
}

/** Jalankan seluruh tolok ukur. Mengembalikan hasil + selisih terhadap `expect` yang tersimpan. */
function runAll(spec) {
  const out = { braincoreVersion: Manifest.bundleVersion, scenarios: [], mismatches: [] };
  for (const sc of spec.scenarios) {
    const got = runScenario(sc);
    const want = sc.expect || null;
    const same = want ? JSON.stringify(got) === JSON.stringify(want) : null;
    out.scenarios.push({ id: sc.id, measures: sc.measures, asks: sc.asks, got, matched: same });
    if (same === false) out.mismatches.push({ id: sc.id, want, got });
  }
  return out;
}

module.exports = { MEASUREMENTS, runScenario, runAll, loadSpec, SPEC_PATH };

// =========================================================================================
if (require.main === module) {
  const spec = loadSpec();
  const write = process.argv.includes('--write-expectations');

  if (write) {
    for (const sc of spec.scenarios) sc.expect = runScenario(sc);
    spec.braincoreVersion = Manifest.bundleVersion;
    fs.writeFileSync(SPEC_PATH, JSON.stringify(spec, null, 2) + '\n');
    console.log('EKSPEKTASI DITULIS ULANG → ' + SPEC_PATH);
    console.log('  braincoreVersion : ' + spec.braincoreVersion);
    console.log('  skenario         : ' + spec.scenarios.length);
    console.log('');
    console.log('  PERINGATAN. Menulis ulang ekspektasi MEMBERKATI perilaku mesin saat ini,');
    console.log('  apa pun perilaku itu. Kalau sebuah regresi yang menyebabkan selisihnya, ');
    console.log('  perintah ini baru saja mengubur regresi itu. Lakukan hanya setelah setiap');
    console.log('  selisih dibaca satu per satu dan dipahami sebagai perubahan yang disengaja.');
    process.exit(0);
  }

  const res = runAll(spec);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    for (const s of res.scenarios) {
      console.log((s.matched === false ? 'BEDA ' : 'cocok') + ' - ' + s.id
        + '  [' + s.measures.join(', ') + ']');
    }
  }
  if (spec.braincoreVersion !== Manifest.bundleVersion) {
    console.error('\nPERHATIAN: ekspektasi direkam pada Braincore ' + spec.braincoreVersion
      + ', mesin sekarang ' + Manifest.bundleVersion + '. Selisih apa pun di bawah bisa berarti'
      + ' perubahan rilis, bukan regresi.');
  }
  if (res.mismatches.length) {
    console.error('\nBraincore benchmark: BEDA pada ' + res.mismatches.length + ' skenario.');
    for (const m of res.mismatches) {
      console.error('\n--- ' + m.id);
      for (const k of Object.keys(m.got)) {
        const a = JSON.stringify(m.want[k]), b = JSON.stringify(m.got[k]);
        if (a !== b) console.error('    ' + k + ':\n      direkam: ' + a + '\n      sekarang: ' + b);
      }
    }
    console.error('\nIni BUKAN otomatis sebuah kegagalan: ekspektasi merekam perilaku, bukan');
    console.error('kebenaran. Bacalah tiap selisih, putuskan apakah ia disengaja, baru');
    console.error('jalankan --write-expectations bila memang begitu.');
    process.exit(1);
  }
  console.log('\nBraincore benchmark: SELURUH ' + res.scenarios.length + ' skenario cocok'
    + ' (Braincore ' + res.braincoreVersion + ').');
  console.log('Artinya STABIL dan BISA DIBANDINGKAN — bukan berarti keputusannya BENAR.');
}
