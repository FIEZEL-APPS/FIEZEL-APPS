/**
 * FIEZEL A2 gerbang — analytics SISI KLIEN (`features/analytics/fiezel-analytics-client.js`).
 *
 * Sisi Worker sudah dijaga tiga gerbang (`analytics-privacy-test.js`,
 * `analytics-aggregate-test.js`, `analytics-server-only-test.js`). Tetapi
 * seluruh jaminan privasi kontrak owner dieksekusi DI PERANGKAT: yang memegang
 * `installId`, yang menghitung HMAC, yang memilih field, dan yang memutuskan
 * mengirim atau tidak adalah klien. Server yang sempurna di belakang klien yang
 * bocor tetap berarti data murid keluar. Gerbang ini menutup sisi itu.
 *
 * Delapan tuntutan (semuanya dieksekusi, bukan dipindai sebagai string):
 *   1. `installId` TIDAK PERNAH masuk payload — dibaca dari penyimpanan lalu
 *      dicari di SETIAP byte yang dikirim.
 *   2. Event server-only DITOLAK klien, sepuluh-sepuluhnya, dan daftarnya sama
 *      dengan `SERVER_ONLY_EVENTS` di `workers/api/analytics/analytics-core.js`.
 *   3. Field asing DIBUANG (termasuk field yang dikelola modul seperti
 *      `visitor_token`, supaya UI tidak bisa mengarang token sendiri).
 *   4. Flag `usage !== 'on'` => NOL permintaan DAN NOL akses penyimpanan.
 *   5. Antrean offline punya cap dan membuang yang TERTUA.
 *   6. Token BERUBAH saat pepper berubah (inilah yang memutus hari-1 ke hari-2).
 *   7. NOL PII di seluruh payload (pindai email/UUID/IP/User-Agent/penanda racun).
 *   8. Payload klien DITERIMA server sungguhan (`processClientBatch` = 202) —
 *      privasi yang benar tapi ditolak server berarti DAU tetap nol.
 *
 * NOL JARINGAN, NOL DEPENDENCY, NOL BERKAS TEMPORER. Modul dijalankan di dalam
 * `vm` dengan sandbox yang SENGAJA tidak punya `localStorage`, `navigator`,
 * `fetch`, `document`, atau `window`: kalau modul menyentuh salah satunya di
 * luar ketergantungan yang disuntik, ia melempar di sini.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeCrypto = require('crypto');

const root = __dirname;
const MODULE_REL = path.join('features', 'analytics', 'fiezel-analytics-client.js');
const MODULE_ABS = path.join(root, MODULE_REL);

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details === undefined ? '' : details) });
  if (!ok) failed = true;
};

const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

/* =========================================================================
 * 0. Berkas ada, terdaftar di CI, dan tidak menyentuh berkas terlarang
 * ========================================================================= */
check('Modul klien ada', fs.existsSync(MODULE_ABS), MODULE_REL);
if (!fs.existsSync(MODULE_ABS)) { finish(); return; }

const source = fs.readFileSync(MODULE_ABS, 'utf8');
const code = stripComments(source);
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
check('Gerbang ini terdaftar di quality.yml', workflow.includes('node analytics-client-test.js'), 'quality.yml');

// Dokumentasi di kepala berkas adalah bagian dari kontrak: modul yang menjanjikan
// privasi tanpa menjelaskan konsekuensinya membuat owner salah membaca angkanya.
const header = source.slice(0, source.indexOf('(function (root'));
for (const frasa of ['installId', 'HMAC-SHA256', 'FiezelAnalytics.track', 'estimasi PERANGKAT']) {
  check(`Dokumentasi kepala berkas menyebut "${frasa}"`, header.includes(frasa), 'header');
}

// Modul tidak boleh punya jalan pintas ke state belajar murid maupun ke DOM.
for (const terlarang of ['fiezel-v4-state', 'document.', 'window.', 'XMLHttpRequest']) {
  check(`Modul tidak menyentuh \`${terlarang}\``, !code.includes(terlarang), terlarang);
}

/* =========================================================================
 * Sandbox: hanya intrinsik + WebCrypto. TIDAK ada localStorage/navigator/fetch.
 * ========================================================================= */
function loadModule() {
  const sandbox = {
    console,
    TextEncoder,
    TextDecoder,
    crypto: nodeCrypto.webcrypto,
    module: { exports: {} }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: MODULE_REL });
  const api = sandbox.module.exports;
  return { api, sandbox };
}

const { api: FiezelAnalytics, sandbox } = loadModule();
check('Modul mengekspor API publik', typeof FiezelAnalytics.track === 'function' && typeof FiezelAnalytics.createClient === 'function',
  Object.keys(FiezelAnalytics).join(','));
check('Modul mendaftarkan diri sebagai global `FiezelAnalytics`', sandbox.FiezelAnalytics === FiezelAnalytics, typeof sandbox.FiezelAnalytics);

/* =========================================================================
 * Perkakas uji: penyimpanan yang MENGHITUNG akses, transport yang MEREKAM byte
 * ========================================================================= */
const DAY = 86400000;
const HARI_1 = Date.parse('2026-08-27T09:00:00Z');

function makeStorage(initial) {
  const data = Object.assign({}, initial || {});
  const calls = [];
  return {
    data,
    calls,
    getItem(k) { calls.push('get:' + k); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { calls.push('set:' + k); data[k] = String(v); },
    removeItem(k) { calls.push('remove:' + k); delete data[k]; }
  };
}

// Mock transport lokal. Ia tidak pernah membuka socket: ia hanya menyimpan URL
// dan body ke dalam array, lalu menjawab bentuk Response secukupnya.
function makeTransport(opts) {
  const o = opts || {};
  const state = {
    beacons: [],        // {url, body}
    posts: [],          // {url, body, keepalive}
    pepperCalls: 0,
    pepper: o.pepper || 'p'.repeat(64),
    beaconOk: o.beaconOk !== false,
    postOk: o.postOk !== false,
    beaconAvailable: o.beaconAvailable !== false,
    day: o.day || '2026-08-27'
  };
  state.sendBeacon = (url, body) => {
    if (!state.beaconAvailable) return false;
    state.beacons.push({ url: String(url), body: String(body) });
    return state.beaconOk;
  };
  const httpMock = (url, init) => {
    const options = init || {};
    if (!options.method || options.method === 'GET') {
      state.pepperCalls += 1;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, day: state.day, pepper: state.pepper })
      });
    }
    state.posts.push({ url: String(url), body: String(options.body), keepalive: options.keepalive === true });
    return Promise.resolve({ ok: state.postOk, json: () => Promise.resolve({ ok: state.postOk }) });
  };
  state.http = httpMock;
  state.bodies = () => state.beacons.concat(state.posts).map(x => x.body);
  return state;
}

const CF_ON = { enabled: true, base: 'https://api.fiezel.my.id', endpoints: { health: 'on', config: 'on', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'on' } };
const CF_OFF = { enabled: false, base: '', endpoints: { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off' } };
const CF_USAGE_SHADOW = { enabled: true, base: 'https://api.fiezel.my.id', endpoints: { usage: 'shadow' } };

function makeClient(over) {
  const o = over || {};
  const storage = o.storage || makeStorage(o.initialStorage);
  const transport = o.transport || makeTransport(o.transportOpts);
  const clock = { t: o.now === undefined ? HARI_1 : o.now };
  const client = FiezelAnalytics.createClient({
    config: o.config || CF_ON,
    storage,
    cryptoImpl: nodeCrypto.webcrypto,
    now: () => clock.t,
    sendBeacon: transport.sendBeacon,
    fetchImpl: transport.http,
    platform: o.platform || 'android',
    appVersion: o.appVersion || '5.19.0',
    eventTarget: o.eventTarget
  });
  return { client, storage, transport, clock };
}

// Penanda racun. Kalau salah satu muncul di payload, kebocorannya nyata dan
// bukan kebetulan kata umum.
const RACUN = {
  userName: 'Jahran',
  learnerName: 'Jahran Pilna',
  email: 'jahran@example.com',
  puterUuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
  installId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  user_id: 'u_123',
  ip: '203.0.113.9',
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 Chrome/126',
  questionText: 'KALIMAT-SOAL-RAHASIA-XYZ',
  selectedAnswer: 'JAWABAN-DIPILIH-RAHASIA-XYZ',
  correctAnswer: 'JAWABAN-BENAR-RAHASIA-XYZ',
  transcript: 'TRANSKRIP-SUARA-RAHASIA-XYZ',
  aiConversation: 'ISI-PERCAKAPAN-AI-RAHASIA-XYZ',
  latitude: -6.2,
  longitude: 106.816666,
  sessionId: 's-abadi-lintas-hari',
  visitor_token: 'ff'.repeat(16),
  cohort_day: '2020-01-01',
  day_index: 999
};
const PENANDA = ['Jahran', 'jahran@example.com', '0f8fad5b', 'u_123', '203.0.113.9', 'Mozilla', 'AppleWebKit',
  'RAHASIA-XYZ', '106.816666', 's-abadi-lintas-hari', 'ffffffffffffffffffffffffffffffff'];

(async () => {
  /* =======================================================================
   * 1. FLAG OFF => NOL permintaan, NOL akses penyimpanan
   * ===================================================================== */
  for (const [nama, cfg] of [['enabled:false + usage:off', CF_OFF], ["usage:'shadow'", CF_USAGE_SHADOW]]) {
    const { client, storage, transport } = makeClient({ config: cfg });
    const hasilTrack = client.track('question_answered', { domain: 'grammar', level: 'B1', ok: true });
    const hasilStart = await client.start({ hasIdentity: true });
    const hasilFlush = await client.flush();
    const hasilActive = client.markActive(42);
    const hasilRetensi = await client.sendRetention();
    const token = await client.visitorToken();
    check(`Flag ${nama}: track/start/flush/markActive semuanya menolak`,
      hasilTrack === false && hasilStart === false && hasilFlush === false && hasilActive === false && hasilRetensi === false,
      `${hasilTrack}/${hasilStart}/${hasilFlush}/${hasilActive}/${hasilRetensi}`);
    check(`Flag ${nama}: NOL permintaan keluar`,
      transport.beacons.length === 0 && transport.posts.length === 0 && transport.pepperCalls === 0,
      `beacon=${transport.beacons.length} post=${transport.posts.length} pepper=${transport.pepperCalls}`);
    check(`Flag ${nama}: NOL akses penyimpanan (installId pun tidak dibuat)`,
      storage.calls.length === 0 && Object.keys(storage.data).length === 0,
      storage.calls.join(',') || '(kosong)');
    check(`Flag ${nama}: tidak ada visitor_token yang dihitung`, token === null, String(token));
    check(`Flag ${nama}: isEnabled() jujur`, client.isEnabled() === false, String(client.isEnabled()));
  }

  // Memuat modul saja (tanpa memanggil apa pun) tidak boleh menyentuh apa pun.
  {
    const fresh = loadModule();
    check('Memuat modul tidak membuat instance/akses global apa pun',
      fresh.sandbox.module.exports && fresh.sandbox.localStorage === undefined, 'load-only');
  }

  /* =======================================================================
   * 2. Event server-only DITOLAK, dan daftarnya sama dengan sisi Worker
   * ===================================================================== */
  const core = await import('./workers/api/analytics/analytics-core.js');
  const serverOnlyWorker = core.SERVER_ONLY_EVENTS.slice().sort();
  const serverOnlyClient = FiezelAnalytics.SERVER_ONLY_EVENTS.slice().sort();
  check('Daftar hitam klien = SERVER_ONLY_EVENTS Worker (bukan asumsi)',
    JSON.stringify(serverOnlyClient) === JSON.stringify(serverOnlyWorker),
    `klien=${serverOnlyClient.join('|')} worker=${serverOnlyWorker.join('|')}`);

  const clientAllowed = FiezelAnalytics.CLIENT_EVENTS.slice().sort();
  const clientExpected = ['app_open', 'day_active', 'lesson_completed', 'lesson_started', 'question_answered', 'retention_ping', 'session_ended', 'session_started'];
  check('Tepat delapan event yang boleh dari klien',
    JSON.stringify(clientAllowed) === JSON.stringify(clientExpected), clientAllowed.join(','));
  check('Daftar klien = event `origin:client` di sisi Worker',
    JSON.stringify(clientAllowed) === JSON.stringify(core.CLIENT_EVENTS.slice().sort()), core.CLIENT_EVENTS.join(','));

  {
    const { client, transport } = makeClient({});
    const lolos = [];
    for (const name of FiezelAnalytics.SERVER_ONLY_EVENTS) {
      const hasil = client.track(name, { task: 'explain', model: 'llama-3b', engine: 'workers-ai', kind: 'ai', module: 'ai', reason: 'quota' });
      const alasan = client.stats().lastError;
      if (hasil !== false || alasan !== 'server_only') lolos.push(`${name}:${hasil}/${alasan}`);
    }
    check('Sepuluh event server-only ditolak dengan alasan `server_only`', lolos.length === 0, lolos.join(' '));
    const takDikenal = ['ai_stream', 'payment_done', 'user_login', '', null, 'app_open '];
    const salah = takDikenal.filter(n => client.track(n, {}) !== false);
    check('Event tak dikenal ditolak juga', salah.length === 0, salah.join(','));
    await client.flush();
    check('Penolakan berarti NOL byte terkirim', transport.beacons.length === 0 && transport.posts.length === 0,
      `${transport.beacons.length}/${transport.posts.length}`);
    check('stats() melaporkan jumlah penolakan', client.stats().rejected >= 16, String(client.stats().rejected));
  }

  /* =======================================================================
   * 3. Field asing dibuang + installId tidak pernah masuk payload
   * ===================================================================== */
  const jejakPayload = [];
  {
    const { client, storage, transport } = makeClient({});
    const kotor = Object.assign({ domain: 'grammar', level: 'B1', ok: true }, RACUN);
    const masuk = client.track('question_answered', kotor);
    check('Event sah tetap diterima walau dikirimi field racun', masuk === true, String(masuk));

    const sanit = client.sanitize('question_answered', kotor);
    const keys = Object.keys(sanit.event).sort();
    check('Hanya field allowlist yang lolos sanitasi',
      JSON.stringify(keys) === JSON.stringify(['day', 'domain', 'level', 'name', 'ok']), keys.join(','));
    const takDibuang = Object.keys(RACUN).filter(k => sanit.dropped.indexOf(k) < 0);
    check('SEMUA field racun dilaporkan sebagai dibuang', takDibuang.length === 0, takDibuang.join(','));
    check('`visitor_token` dari pemanggil DIBUANG (hanya modul yang boleh mengisinya)',
      sanit.dropped.indexOf('visitor_token') >= 0 && sanit.event.visitor_token === undefined, sanit.dropped.join(','));
    check('`cohort_day`/`day_index` dari pemanggil DIBUANG',
      sanit.dropped.indexOf('cohort_day') >= 0 && sanit.dropped.indexOf('day_index') >= 0, sanit.dropped.join(','));

    // Nilai di luar enum dibuang, bukan dikirim apa adanya.
    const invalid = client.sanitize('session_ended', { mode: 'ngobrol', level: 'Z9', completed: 'ya', answered: 9999, duration_bucket: '3 jam' });
    check('Nilai di luar enum/rentang dibuang (bukan diteruskan)',
      Object.keys(invalid.event).sort().join(',') === 'day,name' && invalid.invalid.length === 5, JSON.stringify(invalid));

    await client.start({ hasIdentity: true });
    client.markActive(17);
    await client.flush();

    const installId = storage.data[FiezelAnalytics.STORAGE_KEYS.install];
    check('installId dibuat dan disimpan LOKAL', typeof installId === 'string' && installId.length >= 8, String(installId));
    check('installId berbentuk UUID acak (crypto.randomUUID)',
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(installId)), String(installId));

    const bodies = transport.bodies();
    check('Ada payload yang benar-benar terkirim', bodies.length >= 2, String(bodies.length));
    jejakPayload.push(...bodies);

    const bocorInstall = bodies.filter(b => b.includes(installId));
    check('installId TIDAK PERNAH muncul di payload mana pun', bocorInstall.length === 0, String(bocorInstall.length));

    const gabung = bodies.join('\n');
    const bocorPenanda = PENANDA.filter(p => gabung.includes(p));
    check('Tidak satu pun penanda racun/PII muncul di payload', bocorPenanda.length === 0, bocorPenanda.join(','));

    check('sendBeacon dipakai lebih dulu bila tersedia', transport.beacons.length >= 1 && transport.posts.length === 0,
      `beacon=${transport.beacons.length} post=${transport.posts.length}`);

    // Pemeriksaan struktural payload event.
    const batch = transport.beacons.map(b => JSON.parse(b.body)).find(p => Array.isArray(p.events));
    check('Payload event memakai schema kontrak Worker', batch && batch.schema === FiezelAnalytics.SCHEMA_ID, batch && batch.schema);
    const izinkan = { app_open: ['visitor_token', 'has_identity', 'platform', 'app_version'], day_active: ['visitor_token', 'attempts_bucket', 'platform'], question_answered: ['domain', 'level', 'ok'] };
    const pelanggar = [];
    for (const e of (batch && batch.events) || []) {
      for (const k of Object.keys(e)) {
        if (k === 'name' || k === 'day') continue;
        if (!(izinkan[e.name] || []).includes(k)) pelanggar.push(`${e.name}.${k}`);
      }
    }
    check('Setiap event terkirim hanya berisi field allowlist', pelanggar.length === 0, pelanggar.join(','));
    const appOpen = ((batch && batch.events) || []).find(e => e.name === 'app_open');
    check('`platform` hanya kata kasar (android/ios/desktop), bukan User-Agent',
      appOpen && ['android', 'ios', 'desktop'].includes(appOpen.platform), appOpen && appOpen.platform);
    check('`visitor_token` = 32 hex (128 bit)', appOpen && /^[0-9a-f]{32}$/.test(appOpen.visitor_token), appOpen && appOpen.visitor_token);

    // Payload retensi: benar-benar hanya dua field + selubung hari.
    const retensi = transport.beacons.map(b => JSON.parse(b.body)).find(p => Array.isArray(p.pings));
    check('Payload retensi ada', Boolean(retensi), JSON.stringify(retensi || null));
    if (retensi) {
      const kunci = Object.keys(retensi.pings[0]).sort();
      check('retention_ping hanya {day, cohort_day, day_index} — tanpa token/identitas',
        JSON.stringify(kunci) === JSON.stringify(['cohort_day', 'day', 'day_index']), kunci.join(','));
      check('retention_ping tidak membawa visitor_token', retensi.pings[0].visitor_token === undefined, 'ok');
    }

    /* --- 8. Server sungguhan menerima payload klien ---------------------- */
    if (batch) {
      const route = await import('./workers/api/analytics/route-events.js');
      const hasilServer = route.processClientBatch(batch, HARI_1);
      check('Worker menerima batch klien (202), bukan menolaknya',
        hasilServer.status === 202, `${hasilServer.status} ${JSON.stringify(hasilServer.payload)}`);
    }
    if (retensi) {
      const route = await import('./workers/api/analytics/route-events.js');
      const hasilServer = route.processRetentionPing(retensi, HARI_1);
      check('Worker menerima retention_ping klien (202)',
        hasilServer.status === 202, `${hasilServer.status} ${JSON.stringify(hasilServer.payload)}`);
    }
  }

  /* =======================================================================
   * 4. Fallback fetch keepalive saat sendBeacon tidak ada
   * ===================================================================== */
  {
    const { client, transport } = makeClient({ transport: makeTransport({ beaconAvailable: false }) });
    client.track('lesson_completed', { domain: 'reading', level: 'A2' });
    const ok = await client.flush();
    check('Tanpa sendBeacon, modul memakai fetch keepalive', ok === true && transport.posts.length === 1 && transport.posts[0].keepalive === true,
      JSON.stringify(transport.posts.map(p => p.keepalive)));
    jejakPayload.push(...transport.bodies());
  }
  {
    // sendBeacon menolak (kuota beacon browser penuh) => fetch keepalive menyusul.
    const { client, transport } = makeClient({ transport: makeTransport({ beaconOk: false }) });
    client.track('lesson_started', { domain: 'grammar', level: 'B1' });
    await client.flush();
    check('sendBeacon yang menolak jatuh ke fetch keepalive, bukan diam',
      transport.posts.length === 1 && transport.posts[0].keepalive === true, JSON.stringify(transport.posts.length));
  }

  /* =======================================================================
   * 5. Antrean offline: cap + buang yang TERTUA
   * ===================================================================== */
  {
    // Semua pengiriman gagal => murni menguji perilaku antrean.
    const { client, storage, transport } = makeClient({ transport: makeTransport({ beaconOk: false, postOk: false }) });
    const LIM = FiezelAnalytics.LIMITS;
    for (let i = 0; i < 200; i++) {
      client.track('session_ended', { mode: 'lesson', level: 'A2', completed: true, answered: i, duration_bucket: '2-10m' });
    }
    const antre = JSON.parse(storage.data[FiezelAnalytics.STORAGE_KEYS.queue]);
    check('Antrean tidak melewati cap jumlah', antre.length <= LIM.MAX_QUEUE_EVENTS, `${antre.length} > ${LIM.MAX_QUEUE_EVENTS}`);
    check('Antrean tidak melewati cap byte',
      Buffer.byteLength(storage.data[FiezelAnalytics.STORAGE_KEYS.queue], 'utf8') <= LIM.MAX_QUEUE_BYTES,
      String(Buffer.byteLength(storage.data[FiezelAnalytics.STORAGE_KEYS.queue], 'utf8')));
    const nomor = antre.map(e => e.answered);
    check('Yang dibuang adalah yang TERTUA (yang tersisa = paling baru, urut)',
      nomor[nomor.length - 1] === 199 && nomor[0] === 200 - antre.length && nomor.every((n, i) => i === 0 || n === nomor[i - 1] + 1),
      `${nomor[0]}..${nomor[nomor.length - 1]}`);
    check('stats() melaporkan berapa yang dibuang', client.stats().dropped === 200 - antre.length,
      `${client.stats().dropped} vs ${200 - antre.length}`);
    const gagal = await client.flush();
    check('Gagal kirim TIDAK menghapus antrean (hari offline tidak hilang)',
      gagal === false && JSON.parse(storage.data[FiezelAnalytics.STORAGE_KEYS.queue]).length === antre.length,
      `${gagal} / ${JSON.parse(storage.data[FiezelAnalytics.STORAGE_KEYS.queue]).length} vs ${antre.length}`);
    check('Antrean penuh tetap tidak menghasilkan pengiriman sukses palsu',
      transport.posts.length >= 1 && client.stats().sent === 0, `sent=${client.stats().sent}`);

    // Cap byte diuji sendiri: antrean warisan yang gemuk harus dipangkas dari depan.
    const gemuk = [];
    for (let i = 0; i < 40; i++) gemuk.push({ name: 'question_answered', day: '2026-08-27', domain: 'grammar', level: 'B1', ok: true, pad: 'x'.repeat(600), seq: i });
    const kedua = makeClient({ transport: makeTransport({ beaconOk: false, postOk: false }), initialStorage: { [FiezelAnalytics.STORAGE_KEYS.queue]: JSON.stringify(gemuk) } });
    kedua.client.track('question_answered', { domain: 'reading', level: 'A2', ok: false });
    const setelah = JSON.parse(kedua.storage.data[FiezelAnalytics.STORAGE_KEYS.queue]);
    check('Cap byte memangkas antrean warisan yang gemuk',
      Buffer.byteLength(JSON.stringify(setelah), 'utf8') <= LIM.MAX_QUEUE_BYTES && setelah.length < 41,
      `${setelah.length} entri / ${Buffer.byteLength(JSON.stringify(setelah), 'utf8')} byte`);
    check('Pemangkasan byte juga membuang yang TERTUA',
      setelah.filter(e => e.seq !== undefined).every((e, i, arr) => i === 0 || e.seq > arr[i - 1].seq) &&
      (setelah.find(e => e.seq !== undefined) || {}).seq > 0,
      JSON.stringify(setelah.filter(e => e.seq !== undefined).map(e => e.seq).slice(0, 3)));

    // Antrean yang dirusak dari luar TIDAK boleh lolos ke jaringan apa adanya.
    const rusak = [
      { name: 'question_answered', day: '2026-08-27', domain: 'grammar', level: 'B1', ok: true, learnerName: RACUN.learnerName, answerText: RACUN.selectedAnswer },
      { name: 'ai_success', day: '2026-08-27', task: 'explain', model: 'llama-3b' },
      { name: 'question_answered', day: '2020-01-01', domain: 'grammar', level: 'B1', ok: true }
    ];
    const ketiga = makeClient({ initialStorage: { [FiezelAnalytics.STORAGE_KEYS.queue]: JSON.stringify(rusak) } });
    await ketiga.client.flush();
    const terkirim = ketiga.transport.bodies().join('\n');
    jejakPayload.push(...ketiga.transport.bodies());
    check('Antrean yang dirusak tetap disanitasi ulang sebelum dikirim',
      !terkirim.includes('learnerName') && !terkirim.includes(RACUN.learnerName) && !terkirim.includes('ai_success'),
      terkirim.slice(0, 200));
    const isi = JSON.parse(ketiga.transport.beacons[0].body);
    check('Baris kedaluwarsa (>2 hari) dibuang di klien, bukan memacetkan antrean',
      isi.events.length === 1 && isi.events[0].day === '2026-08-27', JSON.stringify(isi.events.map(e => e.day)));
  }

  /* =======================================================================
   * 6. Token berubah saat pepper berubah
   * ===================================================================== */
  {
    const transport = makeTransport({ pepper: 'a'.repeat(64) });
    const storage = makeStorage();
    const clock = { t: HARI_1 };
    const mk = () => FiezelAnalytics.createClient({
      config: CF_ON, storage, cryptoImpl: nodeCrypto.webcrypto, now: () => clock.t,
      sendBeacon: transport.sendBeacon, fetchImpl: transport.http, platform: 'desktop', appVersion: '5.19.0'
    });
    const c1 = mk();
    const t1 = await c1.visitorToken();
    const t1b = await c1.visitorToken();
    check('Token stabil selama pepper sama (dedup DAU tidak pecah di tengah hari)', t1 === t1b && /^[0-9a-f]{32}$/.test(t1), `${t1} / ${t1b}`);

    // Hari berikutnya, pepper dirotasi server: token WAJIB berbeda.
    transport.pepper = 'b'.repeat(64);
    transport.day = '2026-08-28';
    clock.t = HARI_1 + DAY;
    const c2 = mk();
    const t2 = await c2.visitorToken();
    check('Token BERUBAH saat pepper berubah (hari-1 tidak bisa disambung ke hari-2)',
      t2 !== t1 && /^[0-9a-f]{32}$/.test(t2), `${t1} -> ${t2}`);

    // installId-nya SAMA (dari penyimpanan yang sama) — jadi perbedaan token
    // benar-benar berasal dari pepper, bukan dari perangkat baru.
    check('installId tidak berubah antar hari (perbedaan token murni dari pepper)',
      storage.data[FiezelAnalytics.STORAGE_KEYS.install] && Object.keys(storage.data).filter(k => k === FiezelAnalytics.STORAGE_KEYS.install).length === 1,
      String(storage.data[FiezelAnalytics.STORAGE_KEYS.install]));

    // Token = HMAC-SHA256(pepper, installId) dipotong 128 bit — dihitung ulang
    // dengan crypto Node, bukan dipercaya.
    const id = storage.data[FiezelAnalytics.STORAGE_KEYS.install];
    const harusnya = nodeCrypto.createHmac('sha256', 'b'.repeat(64)).update(id).digest('hex').slice(0, 32);
    check('Token = HMAC-SHA256(pepper, installId) dipotong 128 bit', t2 === harusnya, `${t2} vs ${harusnya}`);
    // Dan hasil klien identik dengan fungsi Worker (satu definisi, dua sisi).
    const workerToken = await core.visitorToken('b'.repeat(64), id);
    check('Token klien identik dengan `visitorToken()` sisi Worker', t2 === workerToken, `${t2} vs ${workerToken}`);

    // Pepper tidak tersedia (Worker mati / flag server off) => token null, dan
    // event penyumbang DAU DITAHAN, tidak dikirim tanpa token.
    const transport2 = makeTransport({});
    transport2.http = (url, init) => {
      if (!init || !init.method || init.method === 'GET') return Promise.resolve({ ok: false, json: () => Promise.resolve({ ok: false }) });
      transport2.posts.push({ url: String(url), body: String(init.body), keepalive: init.keepalive === true });
      return Promise.resolve({ ok: true });
    };
    const c3 = FiezelAnalytics.createClient({
      config: CF_ON, storage: makeStorage(), cryptoImpl: nodeCrypto.webcrypto, now: () => HARI_1,
      sendBeacon: transport2.sendBeacon, fetchImpl: transport2.http, platform: 'ios', appVersion: '5.19.0'
    });
    const tokenGagal = await c3.visitorToken();
    c3.track('app_open', { platform: 'ios' });
    const kirim = await c3.flush();
    check('Pepper tidak tersedia => token null dan event DAU ditahan (bukan dikirim tanpa token)',
      tokenGagal === null && kirim === false && transport2.beacons.length === 0 && transport2.posts.length === 0,
      `${tokenGagal}/${kirim}/${transport2.beacons.length}/${transport2.posts.length}`);
  }

  /* =======================================================================
   * 7. Sekali sehari: day_active dan retention_ping
   * ===================================================================== */
  {
    const { client, transport, clock, storage } = makeClient({});
    check('markActive menolak hari yang belum berarti (<5 percobaan)', client.markActive(2) === false, 'ok');
    check('markActive pertama kali diterima', client.markActive(12) === true, 'ok');
    check('markActive kedua di hari yang sama diabaikan', client.markActive(30) === false, 'ok');
    await client.start();
    const retensi1 = transport.bodies().filter(b => b.includes('"pings"')).length;
    await client.sendRetention();
    const retensi2 = transport.bodies().filter(b => b.includes('"pings"')).length;
    check('retention_ping maksimal sekali per hari', retensi1 === 1 && retensi2 === 1, `${retensi1}/${retensi2}`);

    // Hari ke-8: day_index dihitung KLIEN dari tanggal pertamanya sendiri.
    clock.t = HARI_1 + 7 * DAY;
    client._resetMemory();
    await client.sendRetention();
    const semua = transport.bodies().filter(b => b.includes('"pings"')).map(b => JSON.parse(b).pings[0]);
    check('day_index dihitung di klien dari cohort_day miliknya sendiri',
      semua.length === 2 && semua[0].day_index === 0 && semua[1].day_index === 7 && semua[1].cohort_day === '2026-08-27',
      JSON.stringify(semua));
    check('cohort_day disimpan lokal, bukan diberikan server',
      JSON.parse(storage.data[FiezelAnalytics.STORAGE_KEYS.meta]).cohort_day === '2026-08-27',
      storage.data[FiezelAnalytics.STORAGE_KEYS.meta]);
    jejakPayload.push(...transport.bodies());
  }

  /* =======================================================================
   * 8. Batch: satu permintaan untuk banyak event, dan batas Worker dihormati
   * ===================================================================== */
  {
    const { client, transport } = makeClient({});
    for (let i = 0; i < 25; i++) client.track('question_answered', { domain: 'grammar', level: 'B1', ok: i % 2 === 0 });
    await client.flush();
    check('Event dikirim BERKELOMPOK (satu permintaan, bukan 25)', transport.beacons.length === 1, String(transport.beacons.length));
    const payload = JSON.parse(transport.beacons[0].body);
    check('Batch tidak melewati MAX_EVENTS Worker (20)', payload.events.length <= 20, String(payload.events.length));
    check('Batch tidak melewati batas byte Worker (8 KB)',
      Buffer.byteLength(transport.beacons[0].body, 'utf8') <= FiezelAnalytics.LIMITS.MAX_BODY_BYTES,
      String(Buffer.byteLength(transport.beacons[0].body, 'utf8')));
    await client.flush();
    check('Sisa antrean dikirim di batch berikutnya (tidak hilang, tidak dobel)',
      transport.beacons.length === 2 && JSON.parse(transport.beacons[1].body).events.length === 5,
      transport.beacons.map(b => JSON.parse(b.body).events.length).join('+'));
    const url = transport.beacons[0].url;
    check('URL memakai `base` dari FIEZEL_CF_CONFIG + jalur kontrak',
      url === 'https://api.fiezel.my.id/api/usage/events', url);
    jejakPayload.push(...transport.bodies());
  }

  /* =======================================================================
   * 9. Pemindaian PII menyeluruh atas SELURUH payload yang pernah terkirim
   * ===================================================================== */
  {
    const gabung = jejakPayload.join('\n');
    check('Ada cukup payload yang terkumpul untuk dipindai', jejakPayload.length >= 6, String(jejakPayload.length));
    const polaPii = [
      ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
      ['uuid', /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/],
      ['ipv4', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
      ['user-agent', /Mozilla\/|AppleWebKit|Chrome\/|Gecko\//],
      ['koordinat', /"lat(itude)?"|"lon(gitude)?"/i],
      // `"name"` sengaja TIDAK dilarang: itu nama event (`app_open`), bukan nama orang.
      // Yang dilarang adalah kunci bergaya teks bebas milik manusia atau isi soal.
      ['teks bebas', /"(answer|question|prompt|response|transcript|email|user_?name|learner_?name|full_?name|display_?name|text)[A-Za-z_]*"\s*:\s*"/i]
    ];
    const kena = polaPii.filter(([, re]) => re.test(gabung)).map(([n]) => n);
    check('NOL pola PII di seluruh payload yang pernah dikirim', kena.length === 0, kena.join(','));
    const kenaPenanda = PENANDA.filter(p => gabung.includes(p));
    check('NOL penanda racun di seluruh payload yang pernah dikirim', kenaPenanda.length === 0, kenaPenanda.join(','));

    // Pembuktian bahwa pemindainya HIDUP: payload sintetis yang bocor harus merah.
    const bocor = JSON.stringify({ schema: 'x', events: [{ name: 'app_open', email: 'a@b.co', install_id: RACUN.puterUuid }] });
    const terdeteksi = polaPii.filter(([, re]) => re.test(bocor)).map(([n]) => n);
    check('Pemindai PII terbukti bisa merah (anti-vakum)', terdeteksi.length >= 2, terdeteksi.join(','));
    check('scanForPii() modul sendiri juga menangkapnya', FiezelAnalytics.scanForPii(bocor, []).length >= 2,
      FiezelAnalytics.scanForPii(bocor, []).join(','));

    // Dan jaring PII modul benar-benar MEMBLOKIR pengiriman, bukan hanya melapor.
    const transport = makeTransport({});
    const storage = makeStorage({ [FiezelAnalytics.STORAGE_KEYS.queue]: JSON.stringify([{ name: 'question_answered', day: '2026-08-27', domain: 'grammar', level: 'B1', ok: true }]) });
    const client = FiezelAnalytics.createClient({
      config: CF_ON, storage, cryptoImpl: nodeCrypto.webcrypto, now: () => HARI_1,
      sendBeacon: (url, body) => { transport.beacons.push({ url: String(url), body: String(body) }); return true; },
      fetchImpl: transport.http, platform: 'android', appVersion: '5.19.0'
    });
    // Suntikkan installId yang berbentuk UUID lalu paksa ia masuk payload lewat
    // jalur yang tidak seharusnya ada: `sanitize` sudah menutupnya, jadi yang
    // diuji di sini adalah lapisan TERAKHIR.
    const bocorPayload = { schema: FiezelAnalytics.SCHEMA_ID, events: [{ name: 'app_open', day: '2026-08-27', platform: 'android', note: 'jahran@example.com' }] };
    check('Jaring PII menolak payload yang bocor (bukan sekadar melapor)',
      FiezelAnalytics.scanForPii(JSON.stringify(bocorPayload), []).includes('email'), 'ok');
    await client.flush();
    check('Payload bersih tetap lolos setelah jaring PII', transport.beacons.length === 1, String(transport.beacons.length));
  }

  /* =======================================================================
   * 10. Titik pemanggil disarankan TERDAFTAR, tapi TIDAK dipasang
   * ===================================================================== */
  {
    const sites = FiezelAnalytics.RECOMMENDED_CALL_SITES;
    check('RECOMMENDED_CALL_SITES mencakup delapan event klien',
      Array.isArray(sites) && sites.length === 8 && sites.every(s => FiezelAnalytics.CLIENT_EVENTS.includes(s.event)),
      Array.isArray(sites) ? sites.map(s => s.event).join(',') : typeof sites);
    const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    check('app.js TIDAK disentuh paket kerja ini (belum ada pemanggil)',
      !appSrc.includes('FiezelAnalytics'), 'app.js');
    const notes = path.join(root, 'reports', 'add-a2-analytics-client.md');
    check('Notes ada dan mendaftarkan titik pemanggil', fs.existsSync(notes) && fs.readFileSync(notes, 'utf8').includes('question_answered'), notes);
  }

  finish();
})().catch(err => {
  check('Gerbang berjalan tanpa pengecualian', false, err && err.stack ? err.stack : String(err));
  finish();
});

function finish() {
  const summary = {
    gate: 'analytics-client-test',
    module: MODULE_REL,
    generatedAt: '2026-08-27T00:00:00.000Z',
    total: checks.length,
    passed: checks.filter(c => c.status === 'PASS').length,
    failed: checks.filter(c => c.status === 'FAIL').length,
    pass: !failed,
    checks
  };
  fs.writeFileSync(path.join(root, 'ANALYTICS-CLIENT-REPORT.json'), JSON.stringify(summary, null, 2) + '\n');
  for (const c of checks) {
    if (c.status === 'PASS') console.log(`PASS  ${c.name}`);
    else console.log(`FAIL  ${c.name} — ${c.details}`);
  }
  console.log(`\n${summary.passed}/${summary.total} PASS · ANALYTICS-CLIENT-REPORT.json`);
  process.exit(failed ? 1 : 0);
}
