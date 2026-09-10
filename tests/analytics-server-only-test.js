const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * FIEZEL E4 gerbang — event server-only ditolak bila datang dari klien.
 *
 * Kenapa gerbang ini ada sendiri: sepuluh event analytics berkaitan langsung
 * dengan UANG (biaya AI/TTS) dan KEAMANAN (kuota, pemutus arus). Kalau salah
 * satu bisa dikirim dari browser, maka:
 *   - `user_created` bisa mengarang ribuan "pengguna baru" dengan satu skrip,
 *   - `ai_failure` bisa disembunyikan sehingga owner tidak tahu layanan rusak,
 *   - `tts_success{chars_rendered:0}` bisa menyembunyikan tagihan sesungguhnya,
 *   - `quota_exhausted` bisa dipalsukan untuk mengaburkan penyalahgunaan.
 * Angka yang bisa dipalsukan bukan angka; ia hiasan. Jadi penolakannya diuji,
 * bukan diasumsikan.
 *
 * Yang diuji:
 *   1. Sepuluh event server-only ditolak `400 server_only` di /api/usage/events.
 *   2. Event yang sama DITERIMA bila diterbitkan Worker (origin: 'server').
 *   3. Delapan event klien diterima normal.
 *   4. Daftar server-only benar-benar mencakup SEMUA jalur AI/TTS/kuota/breaker
 *      + user_created (dipindai dari EVENT_SPEC, bukan dari daftar manual).
 *   5. Batas byte, batas jumlah event, rate limit, dan penolakan field asing
 *      bekerja lewat handler HTTP sungguhan.
 *   6. /api/usage/retention hanya menerima cohort_day + day_index.
 */
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: ok ? undefined : String(detail ?? '') });
  if (!ok) failed = true;
}

const SCHEMA = 'fiezel-analytics-v1';
const HARI = '2026-08-26';
const NOW = Date.parse('2026-08-26T10:00:00Z');
const TOKEN = 'a1b2c3d4'.repeat(4);

/** Contoh field sah per event, supaya penolakan yang terjadi PASTI soal origin. */
const CONTOH = {
  app_open: { visitor_token: TOKEN, has_identity: true, platform: 'android', app_version: '5.23.0' },
  day_active: { visitor_token: TOKEN, attempts_bucket: '5-9', platform: 'android' },
  session_started: { mode: 'adaptive', level: 'B1' },
  session_ended: { mode: 'adaptive', level: 'B1', completed: true, answered: 12, duration_bucket: '2-10m' },
  lesson_started: { domain: 'grammar', level: 'B1' },
  lesson_completed: { domain: 'grammar', level: 'B1' },
  /* m025-246: dua event funnel masuk (OWNER: "Instrumentasi funnel ... launch->soal
     pertama, ... skip rate"). Contoh di bawah harus LOLOS validasi Worker - itulah yang
     membuktikan enum di kedua sisi sepakat; nilai yang tidak ada di enum akan membuat
     event yang dikirim klien ditolak 400 di server, dan kegagalan itu hanya terlihat
     sebagai "angkanya nol", bukan sebagai galat. */
  first_question: { elapsed_bucket: '30-60s', cold: true },
  question_skipped: { domain: 'listening', level: 'B1', reason: 'audio_failed' },
  question_answered: { domain: 'grammar', level: 'B1', ok: true },
  retention_ping: { cohort_day: '2026-08-01', day_index: 7 },
  user_created: { kind: 'anon_learner', platform: 'android' },
  ai_request: { task: 'explain', model: 'granite-micro', prompt_tokens_est: 100 },
  ai_success: { task: 'explain', model: 'granite-micro', out_tokens: 200, latency_bucket: '1-3s' },
  ai_failure: { task: 'explain', code: 'timeout', latency_bucket: '10s+' },
  tts_request: { engine: 'melotts', chars_bucket: '200-1k' },
  tts_success: { engine: 'melotts', cache: 'miss', chars_rendered: 500, latency_bucket: '1-3s' },
  tts_failure: { engine: 'melotts', code: '5xx' },
  quota_exhausted: { kind: 'ai' },
  circuit_opened: { module: 'ai', reason: 'timeout', failures: 5 },
  circuit_recovered: { module: 'ai', open_duration_bucket: '2-10m' }
};

let ipCounter = 0;
function makeRequest(body, opts = {}) {
  // Tiap permintaan default memakai IP berbeda supaya rem tidak mengganggu uji lain.
  const ip = opts.ip || `198.51.100.${(ipCounter++ % 250) + 1}`;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Map([['cf-connecting-ip', ip], ['content-type', 'application/json']]);
  if (opts.contentLength !== false) headers.set('content-length', String(Buffer.byteLength(text)));
  return {
    method: opts.method || 'POST',
    url: opts.url || 'https://api.fiezel.my.id/api/usage/events',
    headers: { get: k => (headers.has(k.toLowerCase()) ? headers.get(k.toLowerCase()) : null) },
    async text() { return text; }
  };
}

const ENV_ON = { ANALYTICS_ENABLED: 'on', RATE_SALT: 'salt-uji' };

(async () => {
  const core = await import('../workers/api/analytics/analytics-core.js');
  const route = await import('../workers/api/analytics/route-events.js');

  /* =====================================================================
   * 1. Daftar server-only mencakup semua jalur yang bisa dipalsukan
   * ===================================================================== */
  const serverOnly = [...core.SERVER_ONLY_EVENTS].sort();
  const seharusnya = Object.keys(core.EVENT_SPEC)
    .filter(n => /^(ai_|tts_)/.test(n) || n === 'quota_exhausted' || n.startsWith('circuit_') || n === 'user_created')
    .sort();
  check('SERVER_ONLY_EVENTS mencakup semua jalur AI/TTS/kuota/breaker + user_created',
    JSON.stringify(serverOnly) === JSON.stringify(seharusnya), `${serverOnly.join(',')} vs ${seharusnya.join(',')}`);

  const specMismatch = Object.entries(core.EVENT_SPEC)
    .filter(([n, s]) => (s.origin === 'server') !== core.SERVER_ONLY_EVENTS.includes(n))
    .map(([n]) => n);
  check('Penandaan origin di EVENT_SPEC konsisten dengan SERVER_ONLY_EVENTS', specMismatch.length === 0, specMismatch.join(','));

  /* m025-246: 18 jadi 20 — first_question dan question_skipped. Angkanya sengaja tetap
     dipaku, bukan diturunkan dari KNOWN_EVENTS: gunanya justru memaksa setiap event baru
     di permukaan telemetri melewati review manusia. Event yang bertambah diam-diam adalah
     persis hal yang tidak boleh lolos tanpa ada yang membacanya. */
  check('Semua 20 event terdaftar (15 nama bab 19 + app_open + day_active + retention_ping + 2 funnel m025-246)',
    core.KNOWN_EVENTS.length === 20, `${core.KNOWN_EVENTS.length}: ${core.KNOWN_EVENTS.join(',')}`);

  const bab19 = ['user_created', 'session_started', 'session_ended', 'lesson_started', 'lesson_completed',
    'question_answered', 'ai_request', 'ai_success', 'ai_failure', 'tts_request', 'tts_success',
    'tts_failure', 'quota_exhausted', 'circuit_opened', 'circuit_recovered'];
  const hilang = bab19.filter(n => !core.KNOWN_EVENTS.includes(n));
  check('Lima belas event bab 19 semuanya ada', hilang.length === 0, hilang.join(','));

  const contohHilang = core.KNOWN_EVENTS.filter(n => !CONTOH[n]);
  check('Gerbang ini menguji setiap event yang terdaftar (tak ada yang terlewat)', contohHilang.length === 0, contohHilang.join(','));

  const kodeSrc = fs.readFileSync(path.join(root, 'workers', 'api', 'analytics', 'analytics-core.js'), 'utf8');
  check('Kode menandai blok server-only secara eksplisit untuk pembaca berikutnya',
    /MULAI BLOK SERVER-ONLY/.test(kodeSrc) && /SELESAI BLOK SERVER-ONLY/.test(kodeSrc));

  /* =====================================================================
   * 2. Penolakan di lapisan murni (processClientBatch)
   * ===================================================================== */
  for (const name of core.SERVER_ONLY_EVENTS) {
    const body = { schema: SCHEMA, events: [Object.assign({ name, day: HARI }, CONTOH[name])] };
    const res = route.processClientBatch(body, NOW);
    check(`Klien DITOLAK saat mengirim ${name}`,
      res.status === 400 && res.payload.error === 'server_only' && res.payload.event === name,
      JSON.stringify(res));
  }

  for (const name of core.SERVER_ONLY_EVENTS) {
    const res = core.normalizeEvent(Object.assign({ name, day: HARI }, CONTOH[name]), { origin: 'server' });
    check(`Worker BOLEH menerbitkan ${name}`, res.ok === true, JSON.stringify(res));
  }

  for (const name of core.SERVER_ONLY_EVENTS) {
    const res = core.normalizeEvent(Object.assign({ name, day: HARI }, CONTOH[name]), { origin: 'client' });
    check(`normalizeEvent menolak ${name} dari klien di lapisan inti`, res.ok === false && res.reason === 'server_only', JSON.stringify(res));
  }

  /* =====================================================================
   * 3. Event klien diterima normal
   * ===================================================================== */
  for (const name of core.CLIENT_EVENTS) {
    const body = { schema: SCHEMA, events: [Object.assign({ name, day: HARI }, CONTOH[name])] };
    const res = route.processClientBatch(body, NOW);
    check(`Event klien ${name} diterima`, res.status === 202 && res.payload.accepted === 1, JSON.stringify(res));
  }

  // Satu event server-only di tengah batch sah harus menolak SELURUH batch.
  const campur = {
    schema: SCHEMA,
    events: [
      Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered),
      Object.assign({ name: 'tts_success', day: HARI }, CONTOH.tts_success),
      Object.assign({ name: 'lesson_completed', day: HARI }, CONTOH.lesson_completed)
    ]
  };
  const resCampur = route.processClientBatch(campur, NOW);
  check('Satu event server-only menolak seluruh batch (tidak ada yang lolos sebagian)',
    resCampur.status === 400 && resCampur.payload.error === 'server_only' && resCampur.payload.index === 1 && !resCampur.agg,
    JSON.stringify(resCampur));

  /* =====================================================================
   * 4. Handler HTTP sungguhan
   * ===================================================================== */
  const parse = async res => ({ status: res.status, body: JSON.parse(await res.text()) });

  const r1 = await parse(await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [Object.assign({ name: 'user_created', day: HARI }, CONTOH.user_created)]
  }), ENV_ON, null, NOW));
  check('POST /api/usage/events menolak user_created dari klien dengan 400 server_only',
    r1.status === 400 && r1.body.error === 'server_only', JSON.stringify(r1));

  const r2 = await parse(await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered)]
  }), ENV_ON, null, NOW));
  check('POST /api/usage/events menerima event klien dengan 202', r2.status === 202 && r2.body.accepted === 1, JSON.stringify(r2));

  const r3 = await parse(await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [{ name: 'question_answered', day: HARI, domain: 'grammar', level: 'B1', ok: true, learnerName: 'Jahran' }]
  }), ENV_ON, null, NOW));
  check('Field asing membuat batch ditolak 400 foreign_field',
    r3.status === 400 && r3.body.error === 'foreign_field' && r3.body.fields.includes('learnerName'), JSON.stringify(r3));

  const r4 = await parse(await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [{ name: 'kirim_riwayat_lengkap', day: HARI }]
  }), ENV_ON, null, NOW));
  check('Event tak dikenal ditolak 400 unknown_event', r4.status === 400 && r4.body.error === 'unknown_event', JSON.stringify(r4));

  const banyak = { schema: SCHEMA, events: [] };
  for (let i = 0; i < route.LIMITS.MAX_EVENTS + 1; i++) banyak.events.push(Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered));
  const r5 = await parse(await route.handleEvents(makeRequest(banyak), ENV_ON, null, NOW));
  check(`Batch > ${route.LIMITS.MAX_EVENTS} event ditolak 413`, r5.status === 413 && r5.body.error === 'too_many_events', JSON.stringify(r5));

  const besar = { schema: SCHEMA, events: [Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered)], pad: 'x'.repeat(9000) };
  const r6 = await parse(await route.handleEvents(makeRequest(besar), ENV_ON, null, NOW));
  check('Body > 8 KB ditolak 413 tanpa di-parse', r6.status === 413 && r6.body.error === 'too_large', JSON.stringify(r6));

  // content-length bohong: pengukuran byte sesungguhnya harus tetap menangkap.
  const r6b = await parse(await route.handleEvents(makeRequest(besar, { contentLength: false }), ENV_ON, null, NOW));
  check('Body besar tanpa content-length tetap ditolak 413', r6b.status === 413, JSON.stringify(r6b));

  const r7 = await parse(await route.handleEvents(makeRequest('{bukan json'), ENV_ON, null, NOW));
  check('Body bukan JSON ditolak 400 bad_json', r7.status === 400 && r7.body.error === 'bad_json', JSON.stringify(r7));

  const r8 = await parse(await route.handleEvents(makeRequest({
    schema: 'v-lain', events: [Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered)]
  }), ENV_ON, null, NOW));
  check('Skema salah ditolak 400 bad_schema', r8.status === 400 && r8.body.error === 'bad_schema', JSON.stringify(r8));

  const r9 = await parse(await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [Object.assign({ name: 'question_answered', day: '2026-01-01' }, CONTOH.question_answered)]
  }), ENV_ON, null, NOW));
  check('Hari di luar toleransi ±2 hari ditolak 400 day_out_of_range',
    r9.status === 400 && r9.body.error === 'day_out_of_range', JSON.stringify(r9));

  // Flag mati: fitur baru wajib aman saat OFF (aturan produksi brief).
  const r10 = await parse(await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered)]
  }), { ANALYTICS_ENABLED: 'off' }, null, NOW));
  check('Flag OFF: endpoint diam (202, tidak menulis apa pun)', r10.status === 202 && r10.body.disabled === true, JSON.stringify(r10));

  /* =====================================================================
   * 5. Rate limit
   * ===================================================================== */
  const IP_REM = '203.0.113.77';
  let kena429 = false;
  for (let i = 0; i < route.LIMITS.RATE_PER_WINDOW + 3; i++) {
    const res = await route.handleEvents(makeRequest({
      schema: SCHEMA, events: [Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered)]
    }, { ip: IP_REM }), ENV_ON, null, NOW);
    if (res.status === 429) { kena429 = true; break; }
  }
  check(`Rate limit menahan setelah ${route.LIMITS.RATE_PER_WINDOW} batch/jam per klien`, kena429);

  const setelahJendela = await route.handleEvents(makeRequest({
    schema: SCHEMA, events: [Object.assign({ name: 'question_answered', day: HARI }, CONTOH.question_answered)]
  }, { ip: IP_REM }), ENV_ON, null, NOW + route.LIMITS.RATE_WINDOW_MS + 1000);
  check('Jendela rate limit terbuka lagi setelah satu jam', setelahJendela.status === 202, String(setelahJendela.status));

  /* =====================================================================
   * 6. /api/usage/retention hanya cohort_day + day_index
   * ===================================================================== */
  const ret1 = await parse(await route.handleRetention(makeRequest({ schema: SCHEMA, cohort_day: '2026-08-01', day_index: 7 }), ENV_ON, null, NOW));
  check('POST /api/usage/retention menerima cohort_day + day_index', ret1.status === 202 && ret1.body.accepted === 1, JSON.stringify(ret1));

  const ret2 = await parse(await route.handleRetention(makeRequest({ schema: SCHEMA, cohort_day: '2026-08-01', day_index: 7, visitor_token: TOKEN }), ENV_ON, null, NOW));
  check('Retention menolak field tambahan apa pun (termasuk token)',
    ret2.status === 400 && ret2.body.error === 'foreign_field' && ret2.body.fields.includes('visitor_token'), JSON.stringify(ret2));

  const ret3 = await parse(await route.handleRetention(makeRequest({ schema: SCHEMA, cohort_day: '2027-01-01', day_index: 1 }), ENV_ON, null, NOW));
  check('Retention menolak cohort_day di masa depan', ret3.status === 400 && ret3.body.error === 'cohort_in_future', JSON.stringify(ret3));

  const ret4 = await parse(await route.handleRetention(makeRequest({ schema: SCHEMA, cohort_day: '2026-08-01', day_index: 9999 }), ENV_ON, null, NOW));
  check('Retention menolak day_index di luar 0..400', ret4.status === 400, JSON.stringify(ret4));

  const ret5 = route.processRetentionPing({ schema: SCHEMA, cohort_day: '2026-08-01', day_index: 1 }, NOW);
  const retSerial = JSON.stringify(ret5.agg);
  check('Agregat retensi tidak memuat token maupun identitas apa pun',
    ret5.status === 202 && !retSerial.includes(TOKEN) && ret5.agg.dau.length === 0, retSerial);

  /* =====================================================================
   * 7. Pendaftaran rute (kontrak pemasangan)
   * ===================================================================== */
  const daftar = [];
  const routerPalsu = { post: (p) => daftar.push(`POST ${p}`), get: (p) => daftar.push(`GET ${p}`) };
  route.registerAnalyticsRoutes(routerPalsu);
  check('registerAnalyticsRoutes mendaftarkan POST /api/usage/events', daftar.includes('POST /api/usage/events'), daftar.join(','));
  check('registerAnalyticsRoutes mendaftarkan POST /api/usage/retention', daftar.includes('POST /api/usage/retention'), daftar.join(','));
  check('registerAnalyticsRoutes mendaftarkan GET /api/usage/pepper', daftar.includes('GET /api/usage/pepper'), daftar.join(','));

  const daftarOn = [];
  route.registerAnalyticsRoutes({ on: (m, p) => daftarOn.push(`${m} ${p}`) });
  check('registerAnalyticsRoutes juga mendukung router bergaya on(method, path)', daftarOn.length === 3, daftarOn.join(','));

  let tolakRouterAneh = false;
  try { route.registerAnalyticsRoutes({}); } catch { tolakRouterAneh = true; }
  check('registerAnalyticsRoutes gagal jelas bila bentuk router tidak dikenali', tolakRouterAneh);

  // Sebelum merge, assert ini berbunyi "index.js TIDAK diedit oleh paket kerja ini".
  // Sesudah delapan paket di-merge, pemasangan MEMANG sudah terjadi, jadi yang
  // dijaga sekarang adalah bentuk pemasangannya: SATU titik (`route-wiring.js`),
  // dan `index.js` tetap tidak tahu-menahu soal modul analytics.
  const indexPath = path.join(root, 'workers', 'api', 'index.js');
  const wiringPath = path.join(root, 'workers', 'api', 'route-wiring.js');
  const indexSrc = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const wiringSrc = fs.existsSync(wiringPath) ? fs.readFileSync(wiringPath, 'utf8') : '';
  check('Rute analytics dipasang tepat di satu titik (route-wiring.js), bukan di index.js',
    /registerAnalyticsRoutes/.test(wiringSrc) && !/registerAnalyticsRoutes/.test(indexSrc),
    'pemasangan terpusat di route-wiring.js');

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'analytics-server-only',
    serverOnlyEvents: core.SERVER_ONLY_EVENTS,
    clientEvents: core.CLIENT_EVENTS,
    counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
    checks
  };
  fs.writeFileSync(path.join(root, 'ANALYTICS-SERVER-ONLY-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
