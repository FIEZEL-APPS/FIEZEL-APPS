#!/usr/bin/env node
/**
 * rate-anon-red-matrix.mjs — bukti bahwa setiap assert di `rate-anon-test.js`
 * BISA MERAH. Gerbang yang tidak pernah terbukti merah tidak membuktikan apa pun.
 *
 * Cara kerja: untuk setiap mutasi, berkas asli dicadangkan, dirusak satu titik,
 * gerbang dijalankan, daftar assert yang merah dicatat, lalu berkas DIPULIHKAN.
 * Skrip ini alat, BUKAN gerbang CI (ia menulis lalu memulihkan berkas kerja).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const P = (rel) => path.join(ROOT, rel);
const RATE = P('workers/api/rate-anon.js');
const AUTH = P('workers/api/route-auth.js');
const REPORT = P('reports/work-s1-auth-anon.md');
const YML = P('.github/workflows/quality.yml');

const MUTATIONS = [
  { id: 'M1 cabang tarif selalu jembatan', file: RATE, expect: ['(a2)', '(a4)'],
    apply: (s) => s.replace('  return limitNumber(env.ANON_ISSUE_LIMIT_PER_HOUR, ANON_ISSUE_LIMIT_DEFAULT);',
      '  return limitNumber(env.ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR, ANON_ISSUE_LIMIT_BRIDGE_DEFAULT);') },
  { id: 'M2 cabang dipilih dari header klien', file: RATE, expect: ['(a3)'],
    apply: (s) => s.replace('export function anonIssuePathOf(ctx) {',
      "export function anonIssuePathOf(ctx) {\n  if (ctx && ctx.request && ctx.request.headers.get('x-fiezel-edge')) return BRIDGE_EDGE_PATH;") },
  { id: 'M3 amplop 429 membocorkan hitungan', file: RATE, expect: ['(b2)'],
    apply: (s) => s.replace('if (issued >= limit) return rejectIssue(ctx); // penolakan: nol tulis',
      'if (issued >= limit) return jsonError(429, ERR.RATE_LIMITED, { retryAfter: RETRY_AFTER_S, issued }, { headers: { ...((ctx && ctx.corsHeaders) || {}), \'retry-after\': String(RETRY_AFTER_S) } });') },
  { id: 'M4 retryAfter dihitung dari sisa jendela', file: RATE, expect: ['(b3)', '(b5)'],
    apply: (s) => s.replace('function rejectIssue(ctx) {\n  return jsonError(429, ERR.RATE_LIMITED, { retryAfter: RETRY_AFTER_S }, {',
      'function rejectIssue(ctx) {\n  const RETRY_AFTER_S = Math.ceil((BUCKET_MS - (ctx.now % BUCKET_MS)) / 1000);\n  return jsonError(429, ERR.RATE_LIMITED, { retryAfter: RETRY_AFTER_S }, {') },
  { id: 'M5 jitter dipindah ke satu cabang saja', file: AUTH, expect: ['(c4)'],
    apply: (s) => s.replace('  await anonJitter(ctx.env);', '  if (response.status === 200) await anonJitter(ctx.env);') },
  { id: 'M6 batas degradasi = batas normal (fail-open bernama lain)', file: RATE, expect: ['(d1)', '(d2)', '(d3)'],
    apply: (s) => s.replace('  return Math.max(1, Math.min(normal, degraded));', '  return Math.max(normal, degraded);') },
  { id: 'M7 ember kembali per JAM penuh', file: RATE, expect: ['(e1)', '(e2)'],
    apply: (s) => s.replace('export const BUCKET_MS = 600000;', 'export const BUCKET_MS = 3600000;') },
  { id: 'M8 IP mentah dipakai sebagai kunci ember', file: RATE, expect: ['(f1)', '(f4)', '(f5)'],
    apply: (s) => s.replace("  return truncate128(await hmacHex(rateSaltOf(env), Math.floor(nowMs / DAY_MS) + '|' + ip));", '  return ip;') },
  { id: 'M9 celah lapisan-2 tidak tertulis di laporan', file: REPORT, expect: ['(g6)'],
    apply: (s) => s.replace(/deps\.accountBudget/g, 'pagar akun') },
  { id: 'M10 gerbang dicabut dari CI', file: YML, expect: ['(h)'],
    apply: (s) => s.replace('          node rate-anon-test.js\n', '') }
];

function runGate() {
  try {
    const out = execFileSync('node', ['rate-anon-test.js'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { exit: 0, out };
  } catch (e) {
    return { exit: e.status === undefined ? 1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const green = runGate();
if (green.exit !== 0) { console.error('BASELINE TIDAK HIJAU:\n' + green.out); process.exit(1); }
console.log('BASELINE HIJAU: ' + green.out.trim());

const rows = [];
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file, 'utf8');
  const mutated = m.apply(original);
  if (mutated === original) { rows.push({ id: m.id, status: 'MUTASI TIDAK MENGENA (pola tidak ditemukan)', reds: [] }); continue; }
  fs.writeFileSync(m.file, mutated);
  const r = runGate();
  fs.writeFileSync(m.file, original);
  const reds = (r.out.match(/^FAIL: .*$/gm) || []).map((l) => l.replace('FAIL: ', ''));
  const tags = [...new Set(reds.map((l) => (l.match(/\(([a-h]\d?)\)/) || [null, '?'])[1]).map((t) => '(' + t + ')'))];
  const hit = m.expect.every((tag) => tags.includes(tag));
  rows.push({ id: m.id, status: r.exit !== 0 && hit ? 'MERAH sesuai harapan' : (r.exit !== 0 ? 'MERAH, tetapi tag beda' : 'TETAP HIJAU (assert tidak menjaga apa pun)'), expect: m.expect, tags, count: reds.length });
  const post = runGate();
  if (post.exit !== 0) { console.error('PEMULIHAN GAGAL sesudah ' + m.id); process.exit(1); }
}

console.log('\n| Mutasi | Harapan | Tag merah | Jumlah assert merah | Hasil |');
console.log('| --- | --- | --- | --- | --- |');
for (const r of rows) {
  console.log('| ' + r.id + ' | ' + (r.expect || []).join(' ') + ' | ' + (r.tags || []).join(' ') + ' | ' + (r.count || 0) + ' | ' + r.status + ' |');
}
const bad = rows.filter((r) => !/MERAH sesuai harapan/.test(r.status));
console.log('\n' + (rows.length - bad.length) + '/' + rows.length + ' mutasi terbukti merah lalu pulih.');
process.exit(bad.length ? 1 : 0);
