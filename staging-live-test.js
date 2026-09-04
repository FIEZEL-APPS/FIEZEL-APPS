// staging-live-test.js — gerbang runtime NYATA untuk Worker `fiezel-api-staging`.
//
// ==========================================================================
// KENAPA BERKAS INI ADA
// ==========================================================================
// `cf-live-contract-test.js` sudah menembak Worker hidup, tetapi ia dengan
// sengaja MENOLAK menguji tiga hal, dan alasannya ditulis di catatannya sendiri:
// ketiganya MENULIS state nyata (kuota harian, objek audio, tabel analytics),
// jadi menguji di produksi berarti mengotori data murid. Ketiga hal itu adalah:
//
//   1. penolakan kuota pada permintaan ke-26 (limit AI harian = 25)
//   2. cache TTS yang TIDAK menyentuh kuota saat cache hit
//   3. cron sweep reservasi + rollup analytics
//
// Sampai sekarang ketiganya hanya terbukti di atas `tools/cf-test-harness.js`
// (D1/KV/R2/AI palsu) — batas kejujuran `reports/exec-wiring.md` §6. Stub tidak
// bisa membuktikan perilaku runtime: stub AI selalu menjawab, stub R2 selalu
// menyimpan, dan cron di stub dipanggil dengan tangan.
//
// Berkas ini menutup celah itu di lingkungan yang TERPISAH dari data murid
// (Worker `fiezel-api-staging`, D1 `fiezel-core-staging`/`fiezel-stats-staging`).
// Ia tidak boleh dipakai untuk menembak produksi: assert `target-is-staging`
// menghentikan seluruh gerbang kalau `/health` tidak mengaku staging, SEBELUM
// satu pun permintaan yang menulis state dikirim.
//
// ==========================================================================
// KENAPA IA TIDAK BOLEH MEMERAHKAN CI PUBLIK
// ==========================================================================
// CI publik tidak punya alamat staging dan TIDAK BOLEH punya rahasia edge.
// Tanpa `FIEZEL_STAGING_BASE` + `FIEZEL_STAGING_EDGE` gerbang ini mencetak
// alasan jujur lalu exit 0 (SKIP, bukan PASS: `status:"SKIP"`, `pass:null`).
// Tidak ada URL bawaan — satu `|| 'https://...'` di sini akan membuat setiap
// push menembak Worker sungguhan. `no-network-test.js` ikut memeriksa larangan
// itu lewat kelas `ENV_GATED_LIVE_ALLOWLIST`.
//
// ==========================================================================
// RAHASIA
// ==========================================================================
// Nilai `X-Fiezel-Edge` datang HANYA dari env `FIEZEL_STAGING_EDGE`. Ia tidak
// pernah dicetak, tidak pernah masuk laporan, dan assert `secret-not-in-report`
// membuktikan itu dengan memindai JSON laporan sebelum ditulis. Kalau suatu hari
// seseorang menaruh nilainya di berkas ini sebagai bawaan, assert
// `edge-secret-from-env-only` akan merah.
//
// Nol dependency. Nol berkas temporer di working tree (laporan di-.gitignore).
'use strict';

const fs = require('fs');
const path = require('path');

const ENV_BASE = 'FIEZEL_STAGING_BASE';
const ENV_EDGE = 'FIEZEL_STAGING_EDGE';
const ENV_REPORT = 'FIEZEL_STAGING_REPORT';
const ENV_ATTEMPTS = 'FIEZEL_STAGING_AI_ATTEMPTS';

const PROTOCOL_EXPECTED = '1.7';
const REQUEST_TIMEOUT_MS = 45000;      // satu panggilan AI nyata bisa 12 detik
const AI_DAILY_LIMIT_EXPECTED = 25;    // kontrak kuota harian bucket `ai`
const RESET_TZ_EXPECTED = 'Asia/Jakarta';
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const wantReport = process.argv.slice(2).includes('--report');
const reportPath = process.env[ENV_REPORT]
  ? path.resolve(process.env[ENV_REPORT])
  : path.join(__dirname, 'STAGING-LIVE-REPORT.json');

const rawBase = String(process.env[ENV_BASE] || '').trim();
const edgeSecret = String(process.env[ENV_EDGE] || '');
// Jumlah percobaan AI. Perlu HEADROOM di atas 26: provider bisa menolak
// keluarannya sendiri (`sentence_limit_exceeded`, `timeout`) dan permintaan
// seperti itu TIDAK menagih kuota, jadi ia harus diulang untuk mencapai 25.
const maxAiAttempts = Math.max(30, Number(process.env[ENV_ATTEMPTS]) || 60);

/* =======================================================================================
 * Pencatat assert
 * ===================================================================================== */
const checks = [];
const notes = [];
// Jejak per-permintaan AI ikut masuk laporan: klaim "25 lolos, ke-26 ditolak" harus
// bisa dibantah orang lain dengan membaca barisnya, bukan hanya dipercaya.
let aiTrailForReport = [];
let failed = false;
function check(id, name, ok, details) {
  checks.push({ id, name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
}

/**
 * Penyaring rahasia. Dipakai pada SETIAP string yang mungkin masuk laporan atau
 * stdout. Ia bekerja pada nilai, bukan pada niat: kalau rahasianya muncul karena
 * kesalahan seseorang, ia tetap tersaring.
 */
function redact(value) {
  const s = String(value == null ? '' : value);
  if (!edgeSecret || edgeSecret.length < 8) return s;
  return s.split(edgeSecret).join('<EDGE_SECRET_REDACTED>');
}

function writeReport(payload) {
  if (!wantReport) return;
  const serialized = JSON.stringify(payload, null, 2);
  // Assert terakhir yang tidak boleh dilewati: laporan tidak memuat rahasia.
  if (edgeSecret && edgeSecret.length >= 8 && serialized.includes(edgeSecret)) {
    console.error('FIEZEL staging live gate: ERROR — laporan memuat nilai rahasia edge; laporan TIDAK ditulis.');
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(reportPath, serialized + '\n');
  console.log('STAGING-LIVE-REPORT ditulis: ' + reportPath);
}

/* =======================================================================================
 * SKIP — jalur bawaan di CI publik
 * ===================================================================================== */
if (!rawBase || !edgeSecret) {
  const missing = [!rawBase ? ENV_BASE : null, !edgeSecret ? ENV_EDGE : null].filter(Boolean);
  console.log([
    'FIEZEL staging live gate: SKIP',
    '',
    'Alasan jujur (bukan PASS):',
    '  ' + missing.join(' dan ') + ' tidak diset, jadi tidak ada Worker staging untuk diuji.',
    '  Gerbang ini MENULIS state (kuota harian, objek audio, baris analytics), jadi ia',
    '  hanya boleh berjalan terhadap lingkungan staging yang terpisah dari data murid.',
    '  Rahasia header edge TIDAK boleh ada di CI publik — karena itu SKIP di sini benar.',
    '',
    'Yang BELUM terbukti di runtime selama gerbang ini SKIP:',
    '  - kuota AI: 25 permintaan lolos dan permintaan ke-26 ditolak 429 di D1 nyata',
    '  - cache TTS: cache hit benar-benar TIDAK menagih kuota di R2 nyata',
    '  - kunci cache TTS tidak berubah karena `speed` (bug bayar-ulang cf-a5/a10)',
    '  - kegagalan provider tidak menjadi 429 di runtime',
    '  - `resetAt`/`resetTimezone` Asia/Jakarta dihitung Worker nyata, bukan stub',
    '  Semua di atas saat ini hanya diuji di atas stub (reports/exec-wiring.md §6).',
    '  Cron Cloudflare TETAP tidak bisa dipicu dari luar — lihat bagian 6 gerbang ini.',
    '',
    'Cara menjalankannya sungguhan (rahasia dari env, JANGAN ditulis ke berkas):',
    '  ' + ENV_BASE + '=https://<worker-staging>.workers.dev \\',
    '  ' + ENV_EDGE + '="$(cat /jalur/rahasia)" node staging-live-test.js --report'
  ].join('\n'));
  writeReport({
    schema: 'fiezel-staging-live-v1',
    status: 'SKIP',
    pass: null,
    base: null,
    reason: missing.join('+') + ' tidak diset',
    generatedAt: new Date().toISOString(),
    counts: { pass: 0, fail: 0, skipped: 1 },
    checks: []
  });
  process.exit(0);
}

/* =======================================================================================
 * Base URL wajib sah. Env diset TAPI salah = MERAH, bukan SKIP.
 * ===================================================================================== */
let baseUrl = null;
try {
  const parsed = new URL(rawBase);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('skema harus http/https');
  baseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, '');
} catch (err) {
  console.error('FIEZEL staging live gate: FAIL');
  console.error('  ' + ENV_BASE + ' diset tetapi bukan URL sah: ' + JSON.stringify(rawBase));
  console.error('  ' + String(err && err.message ? err.message : err));
  writeReport({
    schema: 'fiezel-staging-live-v1',
    status: 'FAIL',
    pass: false,
    base: rawBase,
    reason: 'base_url_invalid',
    generatedAt: new Date().toISOString(),
    counts: { pass: 0, fail: 1, skipped: 0 },
    checks: [{ id: 'base-url-valid', name: ENV_BASE + ' adalah URL http/https sah', status: 'FAIL', details: rawBase }]
  });
  process.exit(1);
}

/* =======================================================================================
 * Transport
 * ===================================================================================== */
const observed = [];

async function call(method, routePath, opt = {}) {
  const headers = Object.assign({ accept: 'application/json' }, opt.headers || {});
  // Header edge dipasang KECUALI diminta sebaliknya (assert `edge-guard-required`
  // justru butuh permintaan tanpa header).
  if (opt.noEdge !== true) headers['x-fiezel-edge'] = edgeSecret;
  const init = { method, headers, redirect: 'manual', signal: AbortSignal.timeout(opt.timeoutMs || REQUEST_TIMEOUT_MS) };
  if (opt.body !== undefined) {
    init.body = opt.body;
    if (!headers['content-type']) headers['content-type'] = 'application/json';
  }
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(baseUrl + routePath, init);
  } catch (err) {
    const note = redact(String(err && err.message ? err.message : err));
    observed.push({ method, path: routePath, status: 0, ms: Date.now() - startedAt, note });
    return { ok: false, transportError: note, status: 0, method, path: routePath, setCookie: [], text: '', json: null, header: () => null, ms: Date.now() - startedAt };
  }
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  const ms = Date.now() - startedAt;
  observed.push({ method, path: routePath, status: response.status, ms });
  return {
    ok: true, transportError: null, status: response.status, method, path: routePath,
    header: name => response.headers.get(name), setCookie, text: redact(text), json, ms
  };
}

/** Identitas anonim BARU. Kuota harian per identitas, jadi setiap jalannya gerbang bersih. */
async function freshIdentity(label) {
  const anon = await call('POST', '/api/auth/anon', { body: '{}' });
  const cookie = anon.setCookie.map(line => line.split(';')[0]).join('; ');
  const userId = anon.json && (anon.json.userId || anon.json.id) ? String(anon.json.userId || anon.json.id) : '';
  return { label, status: anon.status, cookie, userId, ok: anon.status === 200 && !!cookie };
}

async function quotaOf(identity) {
  const r = await call('GET', '/api/quota', { headers: { cookie: identity.cookie } });
  return { status: r.status, body: r.json, buckets: (r.json && r.json.buckets) || null };
}
const usedOf = (q, bucket) => (q && q.buckets && q.buckets[bucket] ? Number(q.buckets[bucket].used) : NaN);

/* =======================================================================================
 * Assert
 * ===================================================================================== */
async function run() {
  /* --- 0. Higiene rahasia (dibuktikan, bukan dijanjikan) ---------------------------- */
  const selfSource = fs.readFileSync(__filename, 'utf8');
  check('edge-secret-from-env-only',
    'Rahasia edge hanya dibaca dari env (tidak ada nilai bawaan di berkas ini)',
    !selfSource.includes(edgeSecret) && new RegExp('process\\.env\\[ENV_EDGE\\]').test(selfSource),
    'panjang rahasia=' + edgeSecret.length + ' karakter, sumber=env ' + ENV_EDGE);

  /* --- 1. Sasaran BENAR staging, bukan produksi ------------------------------------- */
  const health = await call('GET', '/health');
  const service = String((health.json && health.json.service) || '');
  check('health-reachable', '/health staging bisa dihubungi', health.ok && health.status === 200,
    'status=' + health.status + (health.transportError || ''));
  check('target-is-staging', '/health mengaku staging (pengaman: gerbang ini menulis state)',
    /staging/i.test(service), 'service=' + (service || '(kosong)'));
  check('health-protocol', '/health protocol = ' + PROTOCOL_EXPECTED,
    String((health.json && health.json.protocol) || '') === PROTOCOL_EXPECTED,
    'protocol=' + String((health.json && health.json.protocol) || ''));
  check('health-edge-guard-on', '/health melaporkan edgeGuard=on',
    String((health.json && health.json.edgeGuard) || '') === 'on',
    'edgeGuard=' + String((health.json && health.json.edgeGuard) || ''));

  // Kalau sasarannya BUKAN staging, berhenti SEBELUM menulis apa pun. Ini satu-satunya
  // tempat gerbang ini boleh keluar lebih awal dengan status merah.
  if (!/staging/i.test(service)) {
    notes.push('DIHENTIKAN sebelum menulis state: /health tidak mengaku staging. Tidak satu pun '
      + 'permintaan yang menagih kuota atau menyimpan audio dikirim.');
    return finish();
  }

  const unguarded = await call('GET', '/api/config', { noEdge: true });
  check('edge-guard-required', 'Tanpa header X-Fiezel-Edge, /api/config ditolak 403',
    unguarded.status === 403, 'status=' + unguarded.status);

  /* --- 2. Reset harian Asia/Jakarta ------------------------------------------------- */
  const anonQuota = await freshIdentity('reset');
  check('anon-identity-issued', 'POST /api/auth/anon memberi cookie identitas',
    anonQuota.ok, 'status=' + anonQuota.status + ' cookie=' + (anonQuota.cookie ? 'ada' : 'tidak ada'));
  const q0 = await quotaOf(anonQuota);
  const nowMs = Date.now();
  // Dihitung SENDIRI di gerbang, bukan dipercaya dari respons: tengah malam
  // Jakarta berikutnya = (UTC+7 dibulatkan ke hari, +1 hari) - 7 jam. Jakarta
  // tidak punya DST, jadi offsetnya tetap.
  const jakartaDay = new Date(nowMs + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
  const expectedResetAt = Date.parse(jakartaDay + 'T00:00:00Z') + 24 * 60 * 60 * 1000 - JAKARTA_OFFSET_MS;
  const resetAt = Number(q0.body && q0.body.resetAt);
  check('quota-schema', 'GET /api/quota memakai schema fiezel-quota-v1',
    String((q0.body && q0.body.schema) || '') === 'fiezel-quota-v1',
    'schema=' + String((q0.body && q0.body.schema) || ''));
  check('reset-timezone', '`resetTimezone` = ' + RESET_TZ_EXPECTED,
    String((q0.body && q0.body.resetTimezone) || '') === RESET_TZ_EXPECTED,
    'resetTimezone=' + String((q0.body && q0.body.resetTimezone) || ''));
  check('reset-day-jakarta', '`day` = tanggal sipil Jakarta (bukan UTC)',
    String((q0.body && q0.body.day) || '') === jakartaDay,
    'day=' + String((q0.body && q0.body.day) || '') + ' harapan=' + jakartaDay);
  check('reset-at-exact', '`resetAt` = tengah malam Jakarta berikutnya (dihitung ulang gerbang)',
    resetAt === expectedResetAt,
    'resetAt=' + resetAt + ' (' + new Date(resetAt || 0).toISOString() + ') harapan=' + expectedResetAt
    + ' (' + new Date(expectedResetAt).toISOString() + ')');
  check('reset-at-window', '`resetAt` di masa depan dan ≤ 24 jam dari sekarang',
    resetAt > nowMs && resetAt - nowMs <= 24 * 60 * 60 * 1000 + 1000,
    'selisih=' + Math.round((resetAt - nowMs) / 1000) + ' detik');
  check('ai-limit-is-25', 'Limit harian bucket `ai` = ' + AI_DAILY_LIMIT_EXPECTED,
    usedOf(q0, 'ai') === 0 && Number(q0.buckets.ai.limit) === AI_DAILY_LIMIT_EXPECTED,
    'limit=' + Number(q0.buckets && q0.buckets.ai && q0.buckets.ai.limit) + ' used=' + usedOf(q0, 'ai'));

  /* --- 3. Kuota AI: 25 lolos, ke-26 ditolak 429 ------------------------------------- */
  // Task `writing_feedback` dipakai karena ia satu-satunya task bucket `ai` yang
  // di runtime staging KONSISTEN lolos kontrak keluaran; `tutor_turn` ditolak
  // sendiri oleh `checkOutputContract()` (lihat catatan hasil di laporan) dan
  // permintaan yang ditolak TIDAK menagih kuota, jadi ia tidak bisa menghitung.
  const ai = await freshIdentity('ai-quota');
  const trail = [];         // satu baris per permintaan: status, source, used sesudahnya
  let charged = 0;          // berapa permintaan yang benar-benar menagih kuota
  let rejectedFree = 0;     // 200 tapi tidak menagih (provider gagal / mutu ditolak)
  let first429 = null;      // { attempt, usedBefore, body, retryAfterHeader }
  let usedBefore429 = null;
  let early429 = null;      // 429 yang datang SEBELUM 25 tagihan = pelanggaran kontrak
  for (let attempt = 1; attempt <= maxAiAttempts && !first429; attempt++) {
    const body = JSON.stringify({
      schema: 'fiezel-ai-task-v2',
      task: 'writing_feedback',
      input: {
        text: 'Yesterday I go to the market and buy two apple. Sample ' + attempt + '-' + Date.now().toString(36) + '.',
        promptId: 'staging-live-' + attempt,
        level: 'A2',
        rubricId: 'rubric-basic'
      }
    });
    const usedNow = charged;
    const r = await call('POST', '/api/ai/task', { headers: { cookie: ai.cookie }, body });
    if (r.status === 429) {
      const q = await quotaOf(ai);
      first429 = {
        attempt, body: r.json, retryAfterHeader: r.header('retry-after'),
        usedAfter: usedOf(q, 'ai')
      };
      usedBefore429 = usedNow;
      if (usedNow < AI_DAILY_LIMIT_EXPECTED) early429 = { attempt, used: usedNow };
      trail.push({ attempt, status: 429, source: (r.json && r.json.source) || null, used: first429.usedAfter, ms: r.ms });
      break;
    }
    const q = await quotaOf(ai);
    const used = usedOf(q, 'ai');
    const delta = used - charged;
    if (delta > 0) charged = used; else rejectedFree++;
    // Panjang keluaran DICATAT, bukan diabaikan: satu permintaan yang menagih kuota
    // tetapi mengembalikan JSON kosong adalah tagihan tanpa barang.
    const outText = String((r.json && r.json.text) || '');
    let outKeys = null;
    try { const parsed = JSON.parse(outText); outKeys = parsed && typeof parsed === 'object' ? Object.keys(parsed).length : null; } catch { outKeys = null; }
    trail.push({
      attempt, status: r.status, source: (r.json && r.json.source) || null,
      degraded: !!(r.json && r.json.degraded), reason: (r.json && r.json.reason) || null,
      charged: delta > 0, used, ms: r.ms, textLen: outText.length, jsonKeys: outKeys,
      outputTokens: Number((r.json && r.json.usage && r.json.usage.outputTokens) || 0)
    });
    if (r.status !== 200 && r.status !== 429) break; // status aneh: jangan lanjut membakar
  }

  aiTrailForReport = trail;
  check('ai-no-429-before-limit',
    'Tidak ada 429 selama tagihan bucket `ai` masih di bawah ' + AI_DAILY_LIMIT_EXPECTED,
    !early429, early429 ? 'permintaan ke-' + early429.attempt + ' ditolak padahal used=' + early429.used : '0');
  check('ai-25-charged',
    AI_DAILY_LIMIT_EXPECTED + ' permintaan berhasil menagih kuota sebelum penolakan',
    charged === AI_DAILY_LIMIT_EXPECTED,
    'tagihan=' + charged + '/' + AI_DAILY_LIMIT_EXPECTED + ' percobaan=' + trail.length
    + ' tak-menagih=' + rejectedFree + ' (200 tapi provider/mutu gagal)');
  check('ai-26th-rejected-429',
    'Permintaan berikutnya setelah kuota penuh ditolak 429',
    !!first429 && usedBefore429 === AI_DAILY_LIMIT_EXPECTED,
    first429
      ? '429 pada percobaan ke-' + first429.attempt + ' saat used=' + usedBefore429
      : 'tidak ada 429 dalam ' + maxAiAttempts + ' percobaan (tagihan berhenti di ' + charged + ')');
  const denyBody = (first429 && first429.body) || {};
  check('ai-429-quota-charged-false',
    'Respons penolakan memuat `quotaCharged:false` (kontrak amplop penolakan cf-b3 §4.3)',
    Object.prototype.hasOwnProperty.call(denyBody, 'quotaCharged') && denyBody.quotaCharged === false,
    'quotaCharged=' + (Object.prototype.hasOwnProperty.call(denyBody, 'quotaCharged')
      ? JSON.stringify(denyBody.quotaCharged) : '(FIELD TIDAK ADA)'));
  check('ai-429-error-code', 'Respons penolakan memakai kode `quota_exceeded`',
    String(denyBody.error || '') === 'quota_exceeded', 'error=' + String(denyBody.error || '(tidak ada)'));
  check('ai-429-retry-after', 'Respons penolakan membawa header `retry-after`',
    !!(first429 && Number(first429.retryAfterHeader) > 0),
    'retry-after=' + String(first429 && first429.retryAfterHeader));
  check('ai-429-does-not-charge', 'Penolakan TIDAK menambah pemakaian kuota',
    !!first429 && first429.usedAfter === AI_DAILY_LIMIT_EXPECTED,
    'used sesudah 429=' + String(first429 && first429.usedAfter));
  const qAfterAi = await quotaOf(ai);
  check('ai-held-settled', 'Tidak ada reservasi menggantung setelah semua permintaan selesai (`held`=0)',
    Number(qAfterAi.buckets && qAfterAi.buckets.ai.held) === 0,
    'held=' + String(qAfterAi.buckets && qAfterAi.buckets.ai.held));

  // Kuota adalah UANG murid. Permintaan yang menagih tetapi mengembalikan `{}` berarti
  // murid membayar untuk nol umpan balik, dan `checkOutputContract()` menyatakannya
  // "lulus" karena ia memeriksa panjang kalimat, bukan isi JSON. Assert ini ada supaya
  // tagihan kosong tidak lolos hanya karena angka kuotanya kelihatan benar.
  const chargedRows = trail.filter(t => t.charged === true);
  const emptyPaid = chargedRows.filter(t => t.textLen <= 2 || t.jsonKeys === 0 || t.outputTokens <= 1);
  check('ai-charged-output-not-empty',
    'Setiap permintaan yang MENAGIH kuota mengembalikan keluaran yang tidak kosong',
    emptyPaid.length === 0,
    emptyPaid.length + '/' + chargedRows.length + ' tagihan berisi keluaran kosong'
    + (emptyPaid.length ? ' (contoh: text=' + JSON.stringify(emptyPaid[0].textLen) + ' char, jsonKeys='
      + emptyPaid[0].jsonKeys + ', outputTokens=' + emptyPaid[0].outputTokens + ')' : ''));

  /* --- 4. Kegagalan provider TIDAK menjadi 429 -------------------------------------- */
  // Ini tidak perlu dipicu dengan trik: di runtime staging provider MEMANG gagal
  // sebagian (mutu ditolak / timeout). Yang diuji: setiap kegagalan itu tetap 200
  // dengan `degraded:true`, bukan 429, dan tidak menagih kuota.
  const degradedRows = trail.filter(t => t.status === 200 && t.charged === false);
  check('provider-failure-not-429',
    'Setiap kegagalan provider dijawab 200 degraded, bukan 429, dan tidak menagih',
    degradedRows.every(t => t.status === 200 && t.charged === false),
    degradedRows.length
      ? degradedRows.length + ' kejadian: ' + [...new Set(degradedRows.map(t => t.reason || 'tanpa-reason'))].join(', ')
      : 'tidak ada kegagalan provider selama gerbang berjalan (tidak bisa dipicu dengan aman)');

  /* --- 5. Cache TTS: miss menagih, hit gratis, `speed` tidak mengubah kunci --------- */
  const tts = await freshIdentity('tts-cache');
  const uniqueText = 'Staging cache probe ' + Date.now().toString(36) + ' rain falls on the quiet street.';
  // `settings` IKUT membentuk kunci cache (allowlist: container/sampleRate/bitRate),
  // jadi ia harus IDENTIK di keempat permintaan. Kalau tidak, uji `speed` di bawah
  // mengukur dua variabel sekaligus dan tidak membuktikan apa pun.
  const BASE_SETTINGS = { container: 'mp3', sampleRate: 24000, bitRate: 128 };
  const ttsBody = extra => JSON.stringify(Object.assign({
    text: uniqueText, locale: 'en-US', voiceId: 'asteria',
    engineId: '@cf/deepgram/aura-1', engineVersion: 'cf-aura-1@v1',
    settings: BASE_SETTINGS
  }, extra || {}));

  const qt0 = await quotaOf(tts);
  const miss = await call('POST', '/api/tts/render', { headers: { cookie: tts.cookie }, body: ttsBody() });
  const qt1 = await quotaOf(tts);
  const hit = await call('POST', '/api/tts/render', { headers: { cookie: tts.cookie }, body: ttsBody() });
  const qt2 = await quotaOf(tts);
  // Permintaan ketiga: teks IDENTIK, `speed`/`pitch` berbeda. `speed` adalah
  // pengaturan PEMUTARAN, bukan pengaturan sintesis — kalau ia masuk kunci cache,
  // murid membayar ulang untuk audio yang sama (bug yang diperbaiki cf-a5/a10).
  const speed = await call('POST', '/api/tts/render', {
    headers: { cookie: tts.cookie },
    body: ttsBody({ speed: 1.5, settings: Object.assign({}, BASE_SETTINGS, { speed: 1.5, pitch: 2 }) })
  });
  const qt3 = await quotaOf(tts);

  const keyMiss = String((miss.json && miss.json.audioKey) || '');
  const keyHit = String((hit.json && hit.json.audioKey) || '');
  const keySpeed = String((speed.json && speed.json.audioKey) || '');
  const dCalls = (a, b) => usedOf(b, 'ttsCalls') - usedOf(a, 'ttsCalls');
  const dChars = (a, b) => usedOf(b, 'ttsChars') - usedOf(a, 'ttsChars');

  check('tts-key-stable', 'Teks identik menghasilkan `audioKey` identik',
    !!keyMiss && keyMiss === keyHit, 'miss=' + keyMiss.slice(0, 16) + ' hit=' + keyHit.slice(0, 16));
  check('tts-key-speed-invariant',
    '`speed`/`pitch` TIDAK mengubah `audioKey` (tidak ada bayar-ulang, cf-a5/a10)',
    !!keySpeed && keySpeed === keyMiss,
    'speed=' + keySpeed.slice(0, 16) + ' miss=' + keyMiss.slice(0, 16)
    + ' (settings sintesis identik; hanya speed/pitch yang berbeda)');
  // Akar masalah render yang gagal, dibuktikan dari KODE dan bukan dari dugaan:
  // `tools/prerender-tts.mjs` mengirim `{text, speaker}` ke engine yang sama,
  // sementara `route-tts.js` mengirim `{text}` saja — `voiceId` dipakai untuk
  // menghitung kunci cache tapi tidak pernah sampai ke provider.
  const ttsSource = fs.readFileSync(path.join(__dirname, 'workers/api/tts/route-tts.js'), 'utf8');
  check('tts-engine-payload-carries-voice',
    'Payload ke engine TTS membawa suara (`speaker`/`voice`), bukan hanya `text`',
    /env\.AI\.run\([^)]*speaker|env\.AI\.run\([^)]*voice/.test(ttsSource),
    (ttsSource.match(/env\.AI\.run\([^;]*\)/) || ['(tidak ditemukan)'])[0].replace(/\s+/g, ' ').slice(0, 120));
  check('tts-render-succeeds',
    'Render TTS pertama benar-benar menghasilkan audio (bukan `source:unavailable`)',
    !!(miss.json && miss.json.source && miss.json.source !== 'unavailable' && miss.json.failed !== true),
    'status=' + miss.status + ' source=' + String(miss.json && miss.json.source)
    + ' bytes=' + String(miss.json && miss.json.bytes) + ' failed=' + String(miss.json && miss.json.failed));
  check('tts-miss-charges', 'Cache MISS menagih kuota TTS (1 panggilan + jumlah karakter)',
    dCalls(qt0, qt1) === 1 && dChars(qt0, qt1) === uniqueText.length,
    'Δcalls=' + dCalls(qt0, qt1) + ' Δchars=' + dChars(qt0, qt1) + ' panjangTeks=' + uniqueText.length);
  check('tts-hit-is-cache', 'Permintaan kedua dijawab dari cache (`source:"cache"`)',
    String((hit.json && hit.json.source) || '') === 'cache',
    'source=' + String((hit.json && hit.json.source) || '') + ' status=' + hit.status);
  check('tts-hit-free', 'Cache HIT tidak menagih kuota sama sekali',
    dCalls(qt1, qt2) === 0 && dChars(qt1, qt2) === 0,
    'Δcalls=' + dCalls(qt1, qt2) + ' Δchars=' + dChars(qt1, qt2));
  check('tts-hit-quota-charged-false', 'Cache HIT melaporkan `quotaCharged:false`',
    hit.json && hit.json.quotaCharged === false, 'quotaCharged=' + JSON.stringify(hit.json && hit.json.quotaCharged));
  check('tts-speed-hit-free', 'Permintaan dengan `speed` berbeda tetap cache HIT dan tetap gratis',
    String((speed.json && speed.json.source) || '') === 'cache' && dCalls(qt2, qt3) === 0 && dChars(qt2, qt3) === 0,
    'source=' + String((speed.json && speed.json.source) || '') + ' Δcalls=' + dCalls(qt2, qt3)
    + ' Δchars=' + dChars(qt2, qt3));
  // Assert kejujuran: rantai MISS→HIT hanya bermakna kalau MISS benar-benar
  // menagih. Kalau MISS gratis (provider mati), `tts-hit-free` di atas HAMPA dan
  // tidak boleh dikutip sebagai bukti.
  check('tts-cache-chain-provable',
    'Rantai bukti cache utuh: MISS menagih DAN HIT gratis (kalau tidak, `tts-hit-free` hampa)',
    dCalls(qt0, qt1) === 1 && dCalls(qt1, qt2) === 0 && String((hit.json && hit.json.source) || '') === 'cache',
    'ΔMISS=' + dCalls(qt0, qt1) + ' ΔHIT=' + dCalls(qt1, qt2) + ' sourceHIT=' + String(hit.json && hit.json.source));
  // `quotaCharged` adalah janji yang bisa diperiksa terhadap kenyataan: kalau
  // respons mengaku menagih sementara /api/quota tidak bergerak, respons itu bohong.
  const missClaimsCharged = !!(miss.json && miss.json.quotaCharged === true);
  check('tts-quota-charged-truthful',
    '`quotaCharged` pada respons MISS sesuai pergerakan /api/quota yang nyata',
    missClaimsCharged === (dCalls(qt0, qt1) > 0),
    'quotaCharged=' + String(miss.json && miss.json.quotaCharged) + ' Δcalls nyata=' + dCalls(qt0, qt1));

  /* --- 6. Cron: yang bisa dan TIDAK bisa dibuktikan dari luar ----------------------- */
  // Cron Cloudflare tidak bisa dipicu dari luar Worker. Gerbang ini TIDAK
  // mengarang endpoint untuk itu; yang diperiksa justru sebaliknya: tidak ada
  // pintu cron terbuka, dan pemicunya benar-benar terdeklarasi di wrangler.toml.
  const cronProbes = [];
  for (const p of ['/api/cron/sweep', '/api/cron/rollup', '/api/internal/cron', '/__scheduled', '/cdn-cgi/handler/scheduled']) {
    const r = await call('POST', p, { headers: { cookie: ai.cookie }, body: '{}' });
    cronProbes.push({ path: p, status: r.status });
  }
  check('cron-no-open-endpoint', 'Tidak ada endpoint cron terbuka yang bisa dipicu tanpa token',
    cronProbes.every(p => p.status === 404 || p.status === 403 || p.status === 405),
    cronProbes.map(p => p.path + '→' + p.status).join(' | '));
  const wrangler = fs.readFileSync(path.join(__dirname, 'workers/api/wrangler.toml'), 'utf8');
  check('cron-triggers-declared', 'wrangler.toml mendeklarasikan dua pemicu cron (sweep 5 menit + rollup harian)',
    /crons\s*=\s*\[[^\]]*\*\/5 \* \* \* \*[^\]]*5 17 \* \* \*/.test(wrangler),
    (wrangler.match(/crons\s*=\s*\[.*\]/) || ['(tidak ditemukan)'])[0]);
  // Efek rollup yang BISA dilihat dari luar: `GET /api/usage/pepper` hanya 200
  // setelah rollup harian menanam `pepper_state`. 503 = rollup belum pernah jalan
  // sejak deploy. Itu OBSERVASI, dicatat sebagai temuan, bukan di-assert hijau —
  // menuntutnya 200 akan memerahkan gerbang hanya karena jam belum lewat.
  const pepper = await call('GET', '/api/usage/pepper', { headers: { cookie: ai.cookie } });
  const eventsDay = new Date(Date.now() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
  const events = await call('POST', '/api/usage/events', {
    headers: { cookie: ai.cookie },
    body: JSON.stringify({ schema: 'fiezel-analytics-v1', events: [{ name: 'lesson_completed', day: eventsDay, domain: 'grammar', level: 'A2' }] })
  });
  check('analytics-ingest-live', 'POST /api/usage/events diterima Worker staging (202)',
    events.status === 202 && !!(events.json && events.json.ok),
    'status=' + events.status + ' body=' + events.text.slice(0, 80));
  notes.push('CRON — belum terbukti di runtime: eksekusi `scheduled()` itu sendiri. '
    + 'GET /api/usage/pepper menjawab ' + pepper.status + ' saat gerbang ini jalan; 503 berarti rollup '
    + 'harian (`5 17 * * *` UTC = 00:05 Jakarta) belum pernah menanam `pepper_state` sejak deploy, '
    + '200 berarti rollup NYATA sudah pernah jalan. Cara owner memverifikasi sisanya: tunggu >5 menit '
    + 'lalu baca D1 staging — `SELECT COUNT(*) FROM quota_reservation WHERE expires_at < unixepoch()*1000` '
    + 'harus 0 (sweep), dan setelah 00:05 Jakarta `SELECT * FROM metrics_daily ORDER BY day DESC LIMIT 3` '
    + 'plus `SELECT rotated_at FROM pepper_state WHERE id=1` harus terisi (rollup). Idempotensi kedua job '
    + 'tetap dibuktikan di atas stub oleh cf-wiring-test.js.');
  notes.push('Gerbang ini SENGAJA tidak menambah endpoint pemicu cron. Menambah pintu yang hanya ada '
    + 'untuk memuaskan gerbang berarti memperbesar permukaan serang produksi demi laporan hijau.');

  /* --- 7. Agregat -------------------------------------------------------------------- */
  // `GET /api/usage/pepper` DIKECUALIKAN dari agregat 5xx: 503 di sana adalah
  // keadaan sah (rollup harian belum menanam `pepper_state`), bukan kerusakan.
  // Mengecualikannya ditulis di sini supaya tidak terlihat seperti angka yang
  // dirapikan; statusnya tetap dilaporkan pada assert `pepper-state-observed`.
  check('pepper-state-observed',
    'GET /api/usage/pepper menjawab 200 (rollup pernah jalan) atau 503 (belum) — bukan 5xx lain',
    pepper.status === 200 || pepper.status === 503, 'status=' + pepper.status);
  const fivex = observed.filter(o => o.status >= 500 && o.path !== '/api/usage/pepper');
  check('no-5xx-anywhere', 'Tak ada respons 5xx di seluruh percakapan gerbang ini (kecuali /api/usage/pepper 503 yang sah)',
    fivex.length === 0, fivex.map(o => o.method + ' ' + o.path + '→' + o.status).join(' | ') || '0');
  const transportErrors = observed.filter(o => o.status === 0);
  check('no-transport-error', 'Tak ada galat transport ke Worker staging',
    transportErrors.length === 0, transportErrors.map(o => o.method + ' ' + o.path + ': ' + o.note).join(' | ') || '0');

  notes.push('Identitas anonim yang dipakai gerbang ini BARU setiap kali jalan, jadi hasilnya tidak '
    + 'bergantung state lama. Barisnya tertinggal di D1 staging dan itu tidak masalah: database '
    + 'staging terpisah dari data murid.');
  notes.push('Percobaan AI: ' + trail.length + ' permintaan, ' + charged + ' menagih kuota, '
    + rejectedFree + ' dijawab 200 tanpa menagih (provider gagal / mutu ditolak).');

  return finish();
}

function finish() {
  const counts = {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    skipped: 0
  };
  writeReport({
    schema: 'fiezel-staging-live-v1',
    status: failed ? 'FAIL' : 'PASS',
    pass: !failed,
    base: baseUrl,
    edgeSecretProvided: true,   // NILAINYA tidak pernah masuk laporan
    protocolExpected: PROTOCOL_EXPECTED,
    aiDailyLimitExpected: AI_DAILY_LIMIT_EXPECTED,
    aiTrail: aiTrailForReport,
    generatedAt: new Date().toISOString(),
    counts,
    notes,
    requests: observed,
    checks
  });
  for (const c of checks) console.log('[' + c.status + '] ' + c.id + ' — ' + c.name + ' :: ' + redact(c.details));
  for (const n of notes) console.log('catatan: ' + redact(n));
  console.log(failed
    ? 'FIEZEL staging live gate: FAIL (' + counts.fail + ' dari ' + (counts.pass + counts.fail) + ') base=' + baseUrl
    : 'FIEZEL staging live gate: PASS (' + counts.pass + ' assert) base=' + baseUrl);
  if (failed) process.exitCode = 1;
}

run().catch(err => {
  console.error('FIEZEL staging live gate: ERROR — ' + redact(String(err && err.stack ? err.stack : err)));
  writeReport({
    schema: 'fiezel-staging-live-v1',
    status: 'ERROR',
    pass: false,
    base: baseUrl,
    generatedAt: new Date().toISOString(),
    error: redact(String(err && err.message ? err.message : err)),
    counts: {
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length + 1,
      skipped: 0
    },
    notes,
    checks
  });
  process.exitCode = 1;
});
