/**
 * reports/d3-owner-guard-red-proof.mjs — BUKTI MERAH untuk butir (g-a)…(g-g)
 * `owner-edge-guard-test.js` (gerbang jalur hostname kanonik dashboard owner).
 *
 * Gerbang yang tidak pernah bisa merah adalah gerbang yang bohong. Skrip ini
 * menyuntikkan SATU mutasi pada satu waktu ke berkas SUNGGUHAN (`workers/owner/index.js`,
 * `workers/owner/wrangler.toml`, `workers/owner/DEPLOY.md`), menjalankan gerbang,
 * mencatat butir mana yang jatuh, lalu MEMULIHKAN berkas apa pun yang terjadi (finally).
 *
 * Jalankan: node reports/d3-owner-guard-red-proof.mjs
 * Keluaran: reports/d3-owner-guard-red-proof.json + matriks di stdout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OWNER = path.join(ROOT, 'workers', 'owner', 'index.js');
const TOML = path.join(ROOT, 'workers', 'owner', 'wrangler.toml');
const DEPLOY = path.join(ROOT, 'workers', 'owner', 'DEPLOY.md');
const GATE = 'owner-edge-guard-test.js';
const REPORT = path.join(ROOT, 'OWNER-EDGE-GUARD-REPORT.json');

const MUTATIONS = [
  {
    id: 'M1-jalur-hostname-dimatikan',
    why: 'kalau jalur hostname hilang, owner.fiezel.my.id kembali 403 di semua rute (bug aslinya)',
    file: OWNER,
    from: "  if (isTrustedEdgeHost(host)) return { allowed: true, edgePath: 'custom-domain' };",
    to: "  if (false && isTrustedEdgeHost(host)) return { allowed: true, edgePath: 'custom-domain' };",
    expect: ['(g-a)'],
  },
  {
    id: 'M2-workers-dev-diloloskan-tanpa-header',
    why: 'pintu kedua yang TIDAK dilewati Cloudflare Access',
    file: OWNER,
    from: '  if (isWorkersDevHost(host)) {',
    to: "  if (isWorkersDevHost(host)) return { allowed: true, edgePath: 'header' }; // MUTASI\n  if (isWorkersDevHost(host)) {",
    expect: ['(g-b)', '(a)', '(b)'],
  },
  {
    id: 'M3-workers-dev-masuk-daftar-tepercaya',
    why: 'daftar tepercaya menyimpang dari route custom_domain di wrangler.toml',
    file: OWNER,
    from: "const TRUSTED_EDGE_HOSTS = Object.freeze(['owner.fiezel.my.id']);",
    to: "const TRUSTED_EDGE_HOSTS = Object.freeze(['owner.fiezel.my.id', 'fiezel-owner.fitrajft.workers.dev']);",
    expect: ['(g-a)', '(g-b)'],
  },
  {
    id: 'M4-pencocokan-hostname-jadi-akhiran',
    why: 'owner.fiezel.my.id.penyerang.com akan lolos kalau pencocokan bukan PERSIS',
    file: OWNER,
    from: '  return TRUSTED_EDGE_HOSTS.includes(h);',
    to: '  return TRUSTED_EDGE_HOSTS.some((t) => h.includes(t));',
    expect: ['(g-c)'],
  },
  {
    id: 'M5-default-allow-hostname-asing',
    why: 'hostname karangan apa pun menjadi pintu ke dashboard',
    file: OWNER,
    from: "  // [3] DEFAULT-DENY untuk hostname asing.\n  return { allowed: false, edgePath: 'denied' };",
    to: "  // MUTASI: default-allow\n  return { allowed: true, edgePath: 'custom-domain' };",
    expect: ['(g-c)', '(a)'],
  },
  {
    id: 'M6-hostname-dibaca-dari-header-yang-bisa-dipalsukan',
    why: 'sinyal hostname menjadi masukan klien sepenuhnya (X-Forwarded-Host)',
    file: OWNER,
    from: '  try {\n    return normalizeHost(new URL(request.url).hostname);',
    to: "  try {\n    const spoof = request.headers && request.headers.get && request.headers.get('x-forwarded-host');\n    if (spoof) return normalizeHost(spoof);\n    return normalizeHost(new URL(request.url).hostname);",
    expect: ['(g-a)'],
  },
  {
    id: 'M7-hostname-dibaca-dari-header-host-mentah',
    why: 'header Host mentah tidak dinormalkan dan bisa dikirim ganda',
    file: OWNER,
    from: '    return normalizeHost(new URL(request.url).hostname);',
    to: "    return normalizeHost((request.headers && request.headers.get && request.headers.get('host')) || '');",
    expect: ['(g-a)'],
  },
  {
    id: 'M8-header-edge-menaikkan-hak-di-hostname-kanonik',
    why: 'header palsu tidak boleh mengubah apa pun di hostname kanonik',
    file: OWNER,
    from: '  const session = await ownerSession(request, env, now);\n  if (!session) return deny();',
    to: "  const session = await ownerSession(request, env, now)\n    || (request.headers.get('x-fiezel-edge') ? { sub: 'owner' } : null);   // MUTASI\n  if (!session) return deny();",
    expect: ['(g-d)', '(b)'],
  },
  {
    id: 'M9-pembuka-darurat-menerima-TRUE',
    why: "janji \"string persis 'true'\" tidak ditegakkan; nilai tersalin membuka *.workers.dev",
    file: OWNER,
    from: "  const norm = typeof raw === 'string' ? raw.trim() : '';",
    to: "  const norm = typeof raw === 'string' ? raw.trim().toLowerCase() : '';",
    expect: ['(g-e)'],
  },
  {
    id: 'M10-pembuka-darurat-jadi-truthy',
    why: 'salah ketik apa pun akan membuka gerbang',
    file: OWNER,
    from: "  return norm === 'true';\n}",
    to: '  return !!raw;\n}',
    expect: ['(g-e)'],
  },
  {
    id: 'M11-fail-closed-Secret-owner-dilemahkan',
    why: 'tanpa OWNER_SESSION_KEY, sesi tidak bisa diverifikasi; rute tidak boleh terbuka',
    file: OWNER,
    from: '  return !!(env && env.OWNER_TOKEN_HASH && env.OWNER_SESSION_KEY);',
    to: '  return !!(env && (env.OWNER_TOKEN_HASH || env.OWNER_SESSION_KEY));',
    expect: ['(g-f)'],
  },
  {
    id: 'M12-binding-fiezel-core-diselundupkan',
    why: 'INSIDEN privasi: identity/session/quota_daily per-orang menjadi terjangkau Worker owner',
    file: TOML,
    from: '[[analytics_engine_datasets]]',
    to: '[[d1_databases]]\nbinding = "CORE"\ndatabase_name = "fiezel-core"\ndatabase_id = "7bc356dc-8aff-41e1-b682-ae2039c58c55"\n\n[[analytics_engine_datasets]]',
    expect: ['(g-g)'],
  },
  {
    id: 'M13-binding-KV-diselundupkan',
    why: 'jenis binding lain juga harus nol, bukan hanya D1 core',
    file: TOML,
    from: '[observability]',
    to: '[[kv_namespaces]]\nbinding = "SESSIONS"\nid = "00000000000000000000000000000000"\n\n[observability]',
    expect: ['(g-g)'],
  },
  {
    id: 'M14-workers-dev-dinyalakan-lagi',
    why: 'alamat workers.dev hidup = pintu yang tidak dilewati Cloudflare Access',
    file: TOML,
    from: 'workers_dev = false',
    to: 'workers_dev = true',
    expect: ['(g-g)'],
  },
  {
    id: 'M15-route-custom-domain-menyimpang',
    why: 'kode dan wrangler.toml harus menyebut hostname yang SAMA',
    file: TOML,
    from: 'pattern = "owner.fiezel.my.id"',
    to: 'pattern = "owner2.fiezel.my.id"',
    expect: ['(g-a)'],
  },
  {
    id: 'M16-DEPLOY.md-tidak-lagi-menyebut-insiden',
    why: 'invarian privasi tanpa alasan tertulis akan dilanggar "sebentar saja"',
    file: DEPLOY,
    from: 'itu bukan fitur, itu insiden',
    to: 'itu bisa ditambahkan bila perlu',
    expect: ['(g-g)'],
  },
  {
    id: 'M17-DEPLOY.md-menyuruh-membuka-gerbang',
    why: 'dokumen yang menyuruh ALLOW_NO_EDGE_SECRET mengembalikan lubangnya lewat prosedur',
    file: DEPLOY,
    from: 'wrangler deploy\n#    JANGAN:',
    to: 'wrangler deploy --var ALLOW_NO_EDGE_SECRET:true\n#    JANGAN:',
    expect: ['(g-e)'],
  },
  {
    id: 'M18-alasan-jalur-cadangan-dihapus',
    why: 'jalur cadangan tanpa alasan tertulis akan dihapus orang berikutnya, atau dibiarkan tanpa tahu kenapa',
    file: OWNER,
    from: '//   (i)  cache DNS lama',
    to: '//   (i)  (alasan dihapus)',
    expect: ['(g-*)'],
  },
  {
    id: 'M19-risiko-sisa-disembunyikan',
    why: 'jalur hostname hanya sah bersama workers_dev=false + Access; itu wajib tertulis',
    file: OWNER,
    from: '// RISIKO SISA, DITULIS SUPAYA TIDAK HILANG:',
    to: '// (bab dihapus):',
    expect: ['(g-*)'],
  },
  {
    id: 'M20-jalur-tidak-dilaporkan',
    why: 'tanpa edgeGuardPath, "lolos karena hostname" tidak bisa dibedakan dari "lolos karena header"',
    file: OWNER,
    from: "  return EDGE_PATHS.includes(decision.edgePath) ? decision.edgePath : 'unknown';",
    to: "  return 'custom-domain';",
    expect: ['(g-b)'],
  },
];

function runGate() {
  try {
    execFileSync('node', [GATE], { cwd: ROOT, stdio: 'pipe' });
    return 0;
  } catch (err) {
    return err.status === undefined ? -1 : err.status;
  }
}

function readReport() {
  try {
    return JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  } catch (_) {
    return null;
  }
}

const results = [];
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file, 'utf8');
  if (!original.includes(m.from)) {
    results.push({ id: m.id, ok: false, why: 'jangkar mutasi tidak ditemukan: ' + m.from.slice(0, 70) });
    continue;
  }
  let exit = -1;
  let failed = [];
  try {
    fs.writeFileSync(m.file, original.replace(m.from, m.to));
    exit = runGate();
    const rep = readReport();
    failed = ((rep && rep.checks) || []).filter((c) => !c.ok).map((c) => c.message);
  } finally {
    fs.writeFileSync(m.file, original);
  }
  const groups = Array.from(new Set(failed.map((msg) => (/^\((?:g-)?[a-z*0-9]+\)/.exec(msg) || ['(?)'])[0]))).sort();
  const hit = m.expect.filter((tag) => failed.some((msg) => msg.startsWith(tag)));
  results.push({
    id: m.id,
    kenapaIniLubang: m.why,
    berkas: path.relative(ROOT, m.file),
    exit,
    merah: exit !== 0,
    butirYangJatuh: groups,
    butirDiharapkanJatuh: m.expect,
    butirDiharapkanYangBenarJatuh: hit,
    contohAssertMerah: failed.slice(0, 3),
    ok: exit !== 0 && hit.length > 0,
  });
}

// Pemulihan wajib TERBUKTI, bukan diasumsikan.
const pulih = runGate();

const out = {
  schema: 'fiezel-d3-owner-guard-red-proof-v1',
  generatedAt: new Date().toISOString(),
  gate: GATE,
  mutations: results,
  pulihSesudahSemuaMutasi: pulih,
  pass: results.every((r) => r.ok) && pulih === 0,
};
fs.writeFileSync(path.join(ROOT, 'reports', 'd3-owner-guard-red-proof.json'), JSON.stringify(out, null, 2) + '\n');

for (const r of results) {
  console.log((r.ok ? 'MERAH-OK  ' : 'GAGAL     ') + r.id.padEnd(46) + ' exit=' + r.exit
    + '  butir jatuh: ' + (r.butirYangJatuh || []).join(' ') + (r.why ? '  ' + r.why : ''));
}
console.log('pulih (gerbang hijau lagi): exit=' + pulih);
console.log(out.pass ? 'RED-PROOF PASS' : 'RED-PROOF GAGAL');
process.exit(out.pass ? 0 : 1);
