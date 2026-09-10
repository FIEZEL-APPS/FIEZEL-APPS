/**
 * reports/g1-custom-domain-red-proof.mjs — BUKTI MERAH untuk butir (h) `tests/edge-guard-test.js`
 * dan butir (f) `tests/owner-edge-guard-test.js`.
 *
 * Gerbang yang tidak pernah bisa merah adalah gerbang yang bohong. Skrip ini
 * menyuntikkan satu mutasi pada satu waktu ke berkas SUNGGUHAN, menjalankan gerbang,
 * mencatat assert mana yang jatuh, lalu MEMULIHKAN berkas apa pun yang terjadi.
 *
 * Jalankan: node reports/g1-custom-domain-red-proof.mjs
 * Keluaran: reports/g1-custom-domain-red-proof.json + ringkasan matriks di stdout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const MW = path.join(ROOT, 'workers', 'api', 'mw-edge.js');
const HEALTH = path.join(ROOT, 'workers', 'api', 'route-health.js');
const OWNER = path.join(ROOT, 'workers', 'owner', 'index.js');
const REPORT = path.join(ROOT, 'EDGE-GUARD-REPORT.json');
const OWNER_REPORT = path.join(ROOT, 'OWNER-EDGE-GUARD-REPORT.json');

const MUTATIONS = [
  {
    id: 'M1-hostname-tepercaya-dimatikan',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: "  if (isTrustedEdgeHost(host)) return allow(ctx, 'custom-domain');",
    to: "  if (false && isTrustedEdgeHost(host)) return allow(ctx, 'custom-domain');",
    expect: ['(h1)', '(h2)', '(h5)']
  },
  {
    id: 'M2-default-allow-hostname-asing',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: '  // [3] DEFAULT-DENY: hostname asing',
    to: "  return allow(ctx, 'custom-domain'); // MUTASI: default-allow\n  // [3] DEFAULT-DENY: hostname asing",
    expect: ['(h4)']
  },
  {
    id: 'M3-workers-dev-diloloskan-tanpa-header',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: '  if (isWorkersDevHost(host)) {\n    const presented',
    to: "  if (isWorkersDevHost(host)) return allow(ctx, 'header'); // MUTASI\n  if (isWorkersDevHost(host)) {\n    const presented",
    expect: ['(h3)', '(h6)', '(a)', '(b)', '(e)']
  },
  {
    id: 'M4-health-dibebaskan-dari-gerbang',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: "export const EDGE_FREE_PATHS = Object.freeze(['/healthz']);",
    to: "export const EDGE_FREE_PATHS = Object.freeze(['/healthz', '/health']);",
    expect: ['(h6)', '(f)', '(d)', '(a)']
  },
  {
    id: 'M5-jalur-tidak-dilaporkan-di-health',
    gate: 'tests/edge-guard-test.js',
    file: HEALTH,
    from: '      edgeGuardPath: edgeGuardPath(ctx),',
    to: '',
    expect: ['(h1)', '(h5)', '(h9)', '(c)']
  },
  {
    id: 'M6-daftar-hostname-menyimpang-dari-wrangler',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: "export const TRUSTED_EDGE_HOSTS = Object.freeze(['api.fiezel.my.id']);",
    to: "export const TRUSTED_EDGE_HOSTS = Object.freeze(['api.fiezel.my.id', 'api2.fiezel.my.id']);",
    expect: ['(h7)']
  },
  {
    id: 'M7-pencocokan-hostname-jadi-substring',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: '  return TRUSTED_EDGE_HOSTS.includes(h);',
    to: '  return TRUSTED_EDGE_HOSTS.some((t) => h.includes(t));',
    expect: ['(h8)']
  },
  {
    id: 'M8-hostname-dibaca-dari-header-yang-bisa-dipalsukan',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: "  if (ctx && ctx.url && ctx.url.hostname) return normalizeHost(ctx.url.hostname);",
    to: "  const spoof = ctx && ctx.request && ctx.request.headers.get('x-forwarded-host');\n  if (spoof) return normalizeHost(spoof);\n  if (ctx && ctx.url && ctx.url.hostname) return normalizeHost(ctx.url.hostname);",
    expect: ['(h7)']
  },
  {
    id: 'M9-bentuk-galat-hostname-asing-dibedakan',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: '  // [3] DEFAULT-DENY: hostname asing',
    to: "  if (String(ctx.pathname).length >= 0) return jsonError(403, 'forbidden_host', { message: 'Hostname tidak dikenal.' }, { headers: Object.assign({ vary: 'Origin' }, ctx.corsHeaders || {}) }); // MUTASI\n  // [3] DEFAULT-DENY: hostname asing",
    expect: ['(h4)']
  },
  {
    id: 'M10-syarat-penghapusan-jalur-header-dihapus-dari-kode',
    gate: 'tests/edge-guard-test.js',
    file: MW,
    from: ' * KAPAN JALUR HEADER BOLEH DIHAPUS (DAN SIAPA YANG MEMUTUSKAN)',
    to: ' * (bab dihapus)',
    expect: ['(h9)']
  },
  {
    // DIBALIK 28 Agu 2026. Mutasi ini dulu menyuntikkan jalur hostname ke Worker OWNER dan
    // menuntut butir (f) merah, karena saat itu `owner.fiezel.my.id` MASIH difrontkan proxy PHP
    // dan jalur hostname di sana memang salah. Custom domain owner sekarang aktif, jadi owner
    // BERHAK punya jalur itu — dan mutasi lama menjadi pernyataan yang keliru. Yang masih perlu
    // dijaga dari sisi asimetri adalah arah sebaliknya: daftar hostname tepercaya kedua Worker
    // tidak boleh saling bocor. Bukti merah lengkap untuk jalur owner ada di
    // reports/d3-owner-guard-red-proof.mjs.
    id: 'M11-daftar-hostname-owner-bocor-ke-hostname-api',
    gate: 'tests/owner-edge-guard-test.js',
    file: OWNER,
    from: "const TRUSTED_EDGE_HOSTS = Object.freeze(['owner.fiezel.my.id']);",
    to: "const TRUSTED_EDGE_HOSTS = Object.freeze(['owner.fiezel.my.id', 'api.fiezel.my.id']);",
    expect: ['(g-a)', '(g-c)']
  }
];

function readReport(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function runGate(gate) {
  try {
    execFileSync('node', [gate], { cwd: ROOT, stdio: 'pipe' });
    return { exit: 0 };
  } catch (err) {
    return { exit: err.status === undefined ? -1 : err.status };
  }
}

const results = [];
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file, 'utf8');
  if (!original.includes(m.from)) {
    results.push({ id: m.id, ok: false, why: 'jangkar mutasi tidak ditemukan: ' + m.from.slice(0, 60) });
    continue;
  }
  fs.writeFileSync(m.file, original.replace(m.from, m.to));
  let run;
  let failed = [];
  try {
    run = runGate(m.gate);
    const rep = readReport(m.gate === 'tests/edge-guard-test.js' ? REPORT : OWNER_REPORT);
    failed = ((rep && rep.checks) || []).filter((c) => !c.ok).map((c) => c.message);
  } finally {
    fs.writeFileSync(m.file, original);
  }
  const hitGroups = m.expect.filter((tag) => failed.some((msg) => msg.startsWith(tag)));
  results.push({
    id: m.id,
    gate: m.gate,
    exit: run.exit,
    merah: run.exit !== 0,
    butirYangJatuh: Array.from(new Set(failed.map((msg) => (/^\((?:g-)?[a-z0-9*]+\)/.exec(msg) || ['(?)'])[0]))).sort(),
    contohAssertMerah: failed.slice(0, 3),
    butirDiharapkanJatuh: m.expect,
    butirDiharapkanYangBenarJatuh: hitGroups,
    ok: run.exit !== 0 && hitGroups.length > 0
  });
}

// Pemulihan wajib terbukti, bukan diasumsikan: kedua gerbang harus HIJAU lagi.
const pulih = {
  'tests/edge-guard-test.js': runGate('tests/edge-guard-test.js').exit,
  'tests/owner-edge-guard-test.js': runGate('tests/owner-edge-guard-test.js').exit
};

const out = {
  schema: 'fiezel-g1-custom-domain-red-proof-v1',
  generatedAt: new Date().toISOString(),
  mutations: results,
  pulihSesudahSemuaMutasi: pulih,
  pass: results.every((r) => r.ok) && pulih['tests/edge-guard-test.js'] === 0 && pulih['tests/owner-edge-guard-test.js'] === 0
};
fs.writeFileSync(path.join(ROOT, 'reports', 'g1-custom-domain-red-proof.json'), JSON.stringify(out, null, 2) + '\n');

for (const r of results) {
  console.log((r.ok ? 'MERAH-OK  ' : 'GAGAL     ') + r.id + '  exit=' + r.exit
    + '  butir jatuh: ' + (r.butirYangJatuh || []).join(' ') + (r.why ? '  ' + r.why : ''));
}
console.log('pulih: edge-guard=' + pulih['tests/edge-guard-test.js'] + ' owner-edge-guard=' + pulih['tests/owner-edge-guard-test.js']);
console.log(out.pass ? 'RED-PROOF PASS' : 'RED-PROOF GAGAL');
process.exit(out.pass ? 0 : 1);
