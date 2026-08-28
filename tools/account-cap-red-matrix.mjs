/**
 * tools/account-cap-red-matrix.mjs — BUKTI MERAH untuk `ai-account-cap-gate-test.js`.
 *
 * Gerbang yang belum pernah dilihat MERAH bukan bukti apa pun: ia bisa hijau karena
 * assert-nya tidak menyentuh apa yang diklaimnya. Berkas ini merusak SATU titik pada
 * satu waktu, menjalankan gerbangnya, mencatat merah/hijau beserta assert mana yang
 * jatuh, lalu MEMULIHKAN berkasnya (juga saat dirinya sendiri gagal di tengah).
 *
 * Setiap mutasi di bawah adalah cacat yang benar-benar bisa terjadi lewat suntingan yang
 * kelihatan tidak berbahaya - termasuk cacat asli yang dilaporkan S1 (dep opsional) dan
 * cacat asli P3 (`accountBudget` lupa disuntikkan ke `ttsDeps`).
 *
 * Jalankan: `node tools/account-cap-red-matrix.mjs` (exit 0 = setiap mutasi MERAH).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const GATE = path.join(root, 'ai-account-cap-gate-test.js');
const REPORT = path.join(root, 'AI-ACCOUNT-CAP-RED-MATRIX.json');

const F = {
  wiring: 'workers/api/route-wiring.js',
  routeAi: 'workers/api/ai/route-ai.js',
  routeTts: 'workers/api/tts/route-tts.js',
  gate: 'workers/api/ai/model-call-gate.js',
  budget: 'workers/api/ai/ai-account-budget.js'
};

/**
 * @typedef {{name:string, why:string, file?:string, from?:string, to?:string,
 *            create?:string, content?:string}} Mutation
 */
/** @type {Mutation[]} */
const MUTATIONS = [
  {
    name: 'M1 aiDeps kehilangan accountBudget',
    why: 'perakit lupa menyuntikkan dep ke jalur AI (bentuk asli celah S1)',
    file: F.wiring,
    from: "const aiDeps = { enforceQuota: bridge, rollbackQuota: rollbackBridge, accountBudget };",
    to: "const aiDeps = { enforceQuota: bridge, rollbackQuota: rollbackBridge };"
  },
  {
    name: 'M2 ttsDeps kehilangan accountBudget',
    why: 'cacat ASLI P3: dep disuntik ke AI, lupa ke TTS - dan TTS memakai binding yang sama',
    file: F.wiring,
    from: "const ttsDeps = { enforceQuota: bridge, rollbackQuota: rollbackBridge, accountBudget };",
    to: "const ttsDeps = { enforceQuota: bridge, rollbackQuota: rollbackBridge };"
  },
  {
    name: 'M3 dep dibuat opsional kembali',
    why: 'kembali ke bentuk S1: pemanggil yang lupa dilayani tanpa galat',
    file: F.routeAi,
    from: "    if (!budgetFn) return budgetDenied(taskName, fallbackText, gate.phase, 'ai_budget_dep_missing', started, now);",
    to: "    if (!budgetFn) { reservation = ModelCallGate.makeReservation({ neurons: 1, cap: 1e9, usedBefore: 0, release: async function () { return true; } }); }"
  },
  {
    name: 'M4 route-tts memanggil binding langsung',
    why: 'chokepoint dilangkahi: satu baris `env.AI.run` di rute baru mengembalikan lubangnya',
    file: F.routeTts,
    from: "    var run = ModelCallGate.runReservedModel({\n      env: env, modelId: engineId, input: input, options: options, reservation: reservation\n    });",
    to: "    var run = env.AI.run(engineId, input, options);"
  },
  {
    name: 'M5 chokepoint menerima tanda terima apa pun',
    why: 'assertReservation dilemahkan jadi no-op',
    file: F.gate,
    from: "    assertReservation(a.reservation);",
    to: "    void a.reservation;"
  },
  {
    name: 'M6 reservasi TIDAK memesan apa pun (hanya menerbitkan tanda terima)',
    why: 'tersambung tapi tidak mengikat: tanda terima ada, D1 tidak pernah dinaikkan',
    file: F.wiring,
    from: "    const out = await reserveAccountNeurons({ db, env, neurons, now: a.now });",
    to: "    const out = { allowed: true, cap: 8000, usedBefore: 0 };"
  },
  {
    name: 'M7 plafon dibandingkan SESUDAH dibaca (WHERE kehilangan syarat plafon)',
    why: 'reservasi berhenti atomik: dua permintaan bersamaan bisa dua-duanya lolos',
    file: F.budget,
    from: "'WHERE day = ?1 AND neurons + ?2 <= ?4 RETURNING neurons'",
    to: "'WHERE day = ?1 RETURNING neurons'"
  },
  {
    name: 'M8 D1 hilang = fail-OPEN',
    why: 'tanpa binding D1 permintaan diizinkan, biaya berjalan tanpa penghitung',
    file: F.budget,
    from: "  if (!db || typeof db.prepare !== 'function') {\n    return { allowed: false, reason: BUDGET_REASONS.store, usedBefore: 0, cap: cap };",
    to: "  if (!db || typeof db.prepare !== 'function') {\n    return { allowed: true, reason: BUDGET_REASONS.store, usedBefore: 0, cap: cap };"
  },
  {
    name: 'M9 D1 galat = fail-OPEN',
    why: 'D1 batuk lalu plafon membuka sendiri - keadaan paling mahal dan paling senyap',
    file: F.budget,
    from: "    return { allowed: false, reason: BUDGET_REASONS.unreadable, usedBefore: 0, cap: cap };",
    to: "    return { allowed: true, reason: BUDGET_REASONS.unreadable, usedBefore: 0, cap: cap };"
  },
  {
    name: 'M10 reservasi tidak dilepas saat panggilan model gagal',
    why: 'plafon 8.000 habis oleh permintaan nol biaya, AI mati tanpa satu neuron terpakai',
    file: F.routeAi,
    from: "      if (providerThrew && ModelCallGate.releasableFailure(providerThrew)) {",
    to: "      if (false && providerThrew && ModelCallGate.releasableFailure(providerThrew)) {"
  },
  {
    name: 'M11 timeout ikut dilepas',
    why: 'model sudah bekerja, neuronnya sudah terbelanja: melepasnya = penghitung yang bohong',
    file: F.routeAi,
    from: "      if (providerThrew && ModelCallGate.releasableFailure(providerThrew)) {",
    to: "      if (providerThrew) {"
  },
  {
    name: 'M12 penolakan salah pasang memakai kalimat "jatah penuh"',
    why: 'pesan tidak jujur: menuduh jatah murid habis padahal server yang salah dipasang',
    file: F.routeAi,
    from: "      message: capReached ? POLITE.ai_account_budget : POLITE.ai_budget_missing,",
    to: "      message: POLITE.ai_account_budget,"
  },
  {
    name: 'M13 penolakan plafon menagih kuota murid',
    why: 'murid dihukum untuk urusan dompet owner',
    file: F.routeAi,
    from: "      quotaChecked: false,\n      quotaCharged: false,\n      usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }",
    to: "      quotaChecked: true,\n      quotaCharged: true,\n      usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }"
  },
  {
    name: 'M14 plafon dijadikan tak terbatas',
    why: 'angka plafonnya berhenti nyata',
    file: F.budget,
    from: "  return Math.min(Math.floor(raw), hard);",
    to: "  return Number.MAX_SAFE_INTEGER;"
  },
  {
    name: 'M15 rute model BARU lahir tanpa fixture',
    why: 'inti paket: penemuan harus PROGRAMATIK, jadi rute baru yang bisa memanggil model '
      + 'tidak boleh lolos hanya karena gerbang ini belum menyebut namanya',
    create: 'workers/api/ai/route-shadow.js',
    content: `/* mutasi merah sementara: rute model baru yang belum dijaga fixture apa pun */
'use strict';
var ModelCallGate = require('./model-call-gate.js');
function handleShadow(request, env) {
  return ModelCallGate.runReservedModel({ env: env, modelId: '@cf/meta/llama', input: {}, reservation: null });
}
function registerShadowRoutes(router) {
  router.post('/api/ai/shadow', handleShadow);
  return router;
}
module.exports = { registerShadowRoutes: registerShadowRoutes };
`
  }
];

function readFile(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function writeFile(rel, text) { fs.writeFileSync(path.join(root, rel), text); }

function runGate() {
  try {
    execFileSync(process.execPath, [GATE], { cwd: root, stdio: 'pipe' });
    return { exit: 0, failedChecks: [] };
  } catch (e) {
    let failedChecks = [];
    try {
      const out = JSON.parse(String(e.stdout || '').slice(String(e.stdout || '').indexOf('{')));
      failedChecks = (out.checks || []).filter((c) => c.status === 'FAIL').map((c) => c.name);
    } catch (_) { failedChecks = ['<laporan tidak terbaca>']; }
    return { exit: e.status === undefined ? 1 : e.status, failedChecks };
  }
}

const baseline = runGate();
if (baseline.exit !== 0) {
  console.error('BASELINE MERAH — perbaiki gerbangnya dulu:\n' + baseline.failedChecks.join('\n'));
  process.exit(1);
}

const rows = [];
for (const m of MUTATIONS) {
  let restore = null;
  try {
    if (m.create) {
      writeFile(m.create, m.content);
      restore = () => fs.unlinkSync(path.join(root, m.create));
    } else {
      const before = readFile(m.file);
      if (!before.includes(m.from)) throw new Error('pola mutasi tidak ditemukan di ' + m.file);
      writeFile(m.file, before.replace(m.from, m.to));
      restore = () => writeFile(m.file, before);
    }
    const result = runGate();
    rows.push({
      mutation: m.name,
      why: m.why,
      target: m.file || m.create,
      gate: result.exit === 0 ? 'HIJAU (LUBANG GERBANG)' : 'MERAH',
      exit: result.exit,
      failedChecks: result.failedChecks
    });
  } catch (error) {
    rows.push({ mutation: m.name, why: m.why, target: m.file || m.create, gate: 'GALAT', error: String(error.message) });
  } finally {
    if (restore) restore();
  }
}

const after = runGate();
const holes = rows.filter((r) => r.gate !== 'MERAH');
const report = {
  schema: 'fiezel-account-cap-red-matrix-v1',
  pass: holes.length === 0 && after.exit === 0,
  baselineGreen: baseline.exit === 0,
  restoredGreen: after.exit === 0,
  counts: { mutations: rows.length, red: rows.filter((r) => r.gate === 'MERAH').length, holes: holes.length },
  rows
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
