const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// E5 — gerbang circuit breaker (workers/api/breaker/breaker.js).
//
// Breaker yang salah lebih buruk daripada tidak ada breaker. Dua kegagalan yang diuji di sini
// adalah kegagalan yang tidak terlihat di produksi sampai tagihannya tiba:
//   1. "OPEN" yang tetap meneruskan permintaan — mesin yang sudah 429 dihujani lagi, penalti
//      rate-limit memanjang, dan setiap percobaan tetap berbayar.
//   2. HALF-OPEN yang membuka pintu untuk SEMUA permintaan yang menunggu. Saat 200 murid
//      menekan putar bersamaan, backoff 15 menit dibalas 200 panggilan serentak ke mesin yang
//      baru pulih, yang langsung 429 lagi. Itu bukan pemulihan, itu serangan berpola.
// Karena itu satu probe per 10 detik diuji sebagai angka, bukan sebagai niat.
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

const B = require(path.join(root, 'workers/api/breaker/breaker.js'));
const C = B.CONFIG;
const T0 = 1_800_000_000_000;

// Membawa state melalui n kegagalan berurutan pada waktu tertentu.
const fail = (state, n, at, kind) => {
  let s = state;
  for (let i = 0; i < n; i += 1) s = B.onFailure(s, kind || 'server_error', at + i, null);
  return s;
};
const trip = (at) => fail(B.initialState(at), C.failureThreshold, at);

// --- 1. KLASIFIKASI PEMICU -------------------------------------------------------------
{
  check('429 diklasifikasikan sebagai rate_limit', B.classify({ status: 429 }) === 'rate_limit', B.classify({ status: 429 }));
  check('5xx diklasifikasikan sebagai server_error',
    [500, 502, 503, 504].every((status) => B.classify({ status }) === 'server_error'), 'semua 5xx');
  check('Timeout diklasifikasikan sebagai timeout', B.classify({ timeout: true }) === 'timeout',
    B.classify({ timeout: true }));
  check('Galat jaringan diklasifikasikan sebagai unavailable',
    B.classify({ networkError: true }) === 'unavailable', B.classify({ networkError: true }));
  check('402 / kuota provider habis diklasifikasikan sebagai quota_exhaustion',
    B.classify({ status: 402 }) === 'quota_exhaustion' &&
    B.classify({ quotaExhausted: true }) === 'quota_exhaustion', 'tidak ada gunanya retry');
  check('Body kosong dihitung kegagalan (mesin balas 200 tapi tanpa audio)',
    B.classify({ status: 200, emptyBody: true }) === 'empty_body', B.classify({ status: 200, emptyBody: true }));

  // 4xx murid (400/401/404) BUKAN kegagalan mesin. Menghitungnya berarti seorang murid dengan
  // permintaan cacat bisa memutus layanan untuk semua orang.
  check('400/401/404 TIDAK memicu breaker',
    [400, 401, 403, 404, 422].every((status) => B.classify({ status }) === null), 'galat klien bukan galat mesin');
  check('200 sehat tidak memicu apa pun', B.classify({ status: 200 }) === null, 'null');
  check('Daftar jenis kegagalan tertutup dan memuat kuota provider',
    B.FAILURE_KINDS.includes('quota_exhaustion') && B.FAILURE_KINDS.every((k) => B.isFailureKind(k)),
    B.FAILURE_KINDS.join(','));
}

// --- 2. CLOSED -------------------------------------------------------------------------
{
  const fresh = B.initialState(T0);
  const gate = B.beforeRequest(fresh, T0);
  check('State awal CLOSED dan meneruskan', fresh.state === 'CLOSED' && gate.allow === true, fresh.state);
  check('CLOSED tidak menandai probe', gate.probe === false, String(gate.probe));

  const below = fail(fresh, C.failureThreshold - 1, T0);
  check('Kegagalan di bawah ambang tetap CLOSED',
    below.state === 'CLOSED' && B.beforeRequest(below, T0 + 1).allow === true,
    `${below.failures.length}/${C.failureThreshold}`);

  // Ambang dihitung per JENDELA 60 s, bukan per rentetan. Satu sukses di tengah rentetan tidak
  // menghapus jejak: mesin yang gagal 4 dari 5 kali memang sedang rusak, dan me-reset hitungan
  // pada setiap sukses membuat breaker tidak pernah membuka pada kegagalan berselang.
  const cleaned = B.onSuccess(below, T0 + 5);
  check('Satu sukses tidak menghapus jendela kegagalan (ambang per jendela, bukan per rentetan)',
    cleaned.failures.length === C.failureThreshold - 1 && cleaned.state === 'CLOSED',
    `${cleaned.failures.length} kegagalan masih dalam jendela`);
  check('Sukses me-reset hitungan 429 berturut-turut', cleaned.consecutive429 === 0, String(cleaned.consecutive429));

  // Jendela luncur: 4 gagal pada jam 9 + 1 gagal pada jam 15 bukan mesin yang rusak.
  const stale = fail(fresh, C.failureThreshold - 1, T0);
  const later = B.onFailure(stale, 'server_error', T0 + C.failureWindowMs + 1000, null);
  check('Kegagalan di luar jendela kadaluarsa, tidak menumpuk',
    later.state === 'CLOSED' && later.failures.length === 1, `${later.failures.length} dalam jendela`);
}

// --- 3. CLOSED → OPEN ------------------------------------------------------------------
{
  const open = trip(T0);
  check('Ambang kegagalan tercapai ⇒ OPEN', open.state === 'OPEN', open.state);
  const gate = B.beforeRequest(open, T0 + 1000);
  check('OPEN MENOLAK permintaan (bukan sekadar mencatat)', gate.allow === false, String(gate.allow));
  check('OPEN memberi retryAfterMs yang bisa dipakai klien',
    gate.retryAfterMs > 0 && gate.retryAfterMs <= C.backoffMs[0], String(gate.retryAfterMs));
  check('OPEN menyebut alasan yang bisa dipetakan ke pesan sopan',
    typeof gate.reason === 'string' && gate.reason.length > 0, gate.reason);

  // 429 berturut-turut membuka lebih cepat: mesin sudah menyuruh berhenti, tidak perlu menunggu
  // lima kali untuk mempercayainya.
  const fast = fail(B.initialState(T0), C.consecutive429, T0, 'rate_limit');
  check('429 berturut-turut membuka lebih cepat dari ambang umum',
    fast.state === 'OPEN' && C.consecutive429 < C.failureThreshold,
    `${C.consecutive429} < ${C.failureThreshold}`);

  // Retry-After dari mesin dihormati bila lebih panjang dari backoff kita: melawan angka yang
  // diberikan penyedia adalah cara memperpanjang penalti.
  const respected = B.onFailure(fail(B.initialState(T0), C.failureThreshold - 1, T0), 'rate_limit', T0, 3_600_000);
  check('Retry-After mesin dihormati bila lebih panjang dari backoff sendiri',
    B.beforeRequest(respected, T0 + 1).retryAfterMs > C.backoffMs[0],
    String(B.beforeRequest(respected, T0 + 1).retryAfterMs));
}

// --- 4. BACKOFF 60 → 120 → 300 → 900 s -------------------------------------------------
{
  check('Tangga backoff tepat 60/120/300/900 detik',
    JSON.stringify(C.backoffMs) === JSON.stringify([60000, 120000, 300000, 900000]),
    C.backoffMs.map((ms) => ms / 1000).join('→') + 's');
  check('backoffFor menaik lalu menempel di 900 s (diindeks jumlah pembukaan sebelumnya)',
    B.backoffFor(0) === 60000 && B.backoffFor(1) === 120000 && B.backoffFor(2) === 300000 &&
    B.backoffFor(3) === 900000 && B.backoffFor(99) === 900000, 'plafon 900 s');

  // Backoff harus naik antar-pembukaan berturut-turut, bukan reset tiap kali OPEN.
  let s = trip(T0);
  const seen = [];
  for (let round = 0; round < 4; round += 1) {
    const openedUntil = s.openedUntil;
    seen.push(openedUntil - s.openedAt);
    const at = openedUntil + 1;
    s = B.beforeRequest(s, at).state;              // masuk HALF-OPEN
    s = B.onFailure(s, 'server_error', at, null);  // probe gagal ⇒ OPEN lagi
  }
  check('Pembukaan berulang menaikkan backoff, tidak me-reset-nya',
    JSON.stringify(seen) === JSON.stringify([60000, 120000, 300000, 900000]),
    seen.map((ms) => ms / 1000).join('→') + 's');

  // Setelah cukup lama sehat, tangga turun kembali — kalau tidak, satu hari buruk membuat
  // breaker selamanya menghukum 15 menit.
  const opened = trip(T0);
  const reopenAt = opened.openedUntil + 1;
  let recovered = B.beforeRequest(opened, reopenAt).state;
  for (let i = 0; i < C.halfOpenSuccessesToClose; i += 1) {
    recovered = B.onSuccess(recovered, reopenAt + i * C.halfOpenProbeIntervalMs);
  }
  const stillPenalised = B.onSuccess(recovered, reopenAt + 60000);
  const healthy = B.onSuccess(recovered, reopenAt + C.cleanCloseResetMs + 60000);
  check('Sehat sebentar TIDAK me-reset tangga (provider gagal-sembuh-gagal tidak dapat 60 s terus)',
    stillPenalised.openings > 0, String(stillPenalised.openings));
  check('Periode CLOSED bersih panjang me-reset tangga backoff',
    healthy.openings === 0, String(healthy.openings));
}

// --- 5. OPEN → HALF-OPEN ---------------------------------------------------------------
{
  const open = trip(T0);
  const tooEarly = B.beforeRequest(open, open.openedUntil - 1000);
  check('Sebelum backoff selesai tetap OPEN dan ditolak',
    tooEarly.allow === false && tooEarly.phase === 'OPEN', tooEarly.phase);

  const at = open.openedUntil + 1;
  const first = B.beforeRequest(open, at);
  check('Backoff selesai ⇒ HALF-OPEN dan probe pertama diizinkan',
    first.phase === 'HALF_OPEN' && first.allow === true && first.probe === true, first.phase);

  // Inilah pengujian yang paling penting: permintaan kedua dalam jendela probe HARUS ditolak.
  const second = B.beforeRequest(first.state, at + 1);
  check('Permintaan kedua dalam jendela probe DITOLAK (1 probe, bukan gerbang terbuka)',
    second.allow === false && second.phase === 'HALF_OPEN', `${second.phase} allow=${second.allow}`);

  let allowed = 0;
  let s = first.state;
  for (let i = 0; i < 200; i += 1) {
    const g = B.beforeRequest(s, at + 2 + i * 10);
    s = g.state;
    if (g.allow) allowed += 1;
  }
  check('200 permintaan serentak dalam 2 detik ⇒ nol probe tambahan',
    allowed === 0, allowed + ' probe tambahan');
  check('Konkurensi probe dipaku 1', C.halfOpenProbeConcurrency === 1, String(C.halfOpenProbeConcurrency));

  // Probe pertama melapor sukses (belum cukup untuk menutup: ambang 2), lalu probe kedua
  // diizinkan hanya setelah jendela 10 detik lewat.
  const reported = B.onSuccess(first.state, at + 500);
  const tooSoon = B.beforeRequest(reported, at + C.halfOpenProbeIntervalMs - 1);
  const nextProbe = B.beforeRequest(reported, at + C.halfOpenProbeIntervalMs + 1);
  check('Probe kedua ditolak sebelum 10 detik (cooldown, bukan probe in-flight)',
    tooSoon.allow === false && tooSoon.reason === 'probe_cooldown', tooSoon.reason);
  check('Probe berikutnya diizinkan tepat setelah 10 detik',
    C.halfOpenProbeIntervalMs === 10000 && nextProbe.allow === true && nextProbe.probe === true,
    `${C.halfOpenProbeIntervalMs} ms`);

  // Probe yang tidak pernah melaporkan hasil TIDAK boleh mengunci breaker selamanya.
  const stuck = B.beforeRequest(first.state, at + C.staleProbeMs - 1);
  const released = B.beforeRequest(first.state, at + C.staleProbeMs + 1);
  check('Probe in-flight menahan probe lain sampai batas basi',
    stuck.allow === false && stuck.reason === 'probe_in_flight', stuck.reason);
  check('Probe basi dilepas setelah batas (breaker pulih sendiri, bukan macet selamanya)',
    released.allow === true && released.probe === true && C.staleProbeMs > 25000,
    `${C.staleProbeMs} ms > TTS_TIMEOUT_MS 25000 ms`);
}

// --- 6. HALF-OPEN → CLOSED / OPEN ------------------------------------------------------
{
  const opened6 = trip(T0);
  const at = opened6.openedUntil + 1;
  const half = B.beforeRequest(opened6, at).state;

  // Satu sukses tidak cukup: mesin yang sedang naik-turun akan membanting pintu bolak-balik.
  const one = B.onSuccess(half, at + 1);
  check('Satu probe sukses belum menutup breaker bila ambang >1',
    C.halfOpenSuccessesToClose <= 1 ? one.state === 'CLOSED' : one.state === 'HALF_OPEN',
    `${one.state} setelah 1 sukses (butuh ${C.halfOpenSuccessesToClose})`);

  let closed = half;
  for (let i = 0; i < C.halfOpenSuccessesToClose; i += 1) {
    closed = B.onSuccess(closed, at + 1 + i * C.halfOpenProbeIntervalMs);
  }
  check('Probe sukses sesuai ambang ⇒ CLOSED dan lalu lintas normal kembali',
    closed.state === 'CLOSED' && B.beforeRequest(closed, at + 60000).allow === true, closed.state);
  check('Menutup membersihkan sisa kegagalan',
    closed.failures.length === 0 && closed.probesInFlight === 0 && closed.halfOpenSuccesses === 0,
    `failures=${closed.failures.length} probesInFlight=${closed.probesInFlight}`);

  const reopened = B.onFailure(half, 'server_error', at + 1, null);
  check('Satu probe gagal ⇒ OPEN lagi seketika (tanpa menghabiskan ambang)',
    reopened.state === 'OPEN' && B.beforeRequest(reopened, at + 2).allow === false, reopened.state);
  check('Membuka ulang memakai backoff tangga berikutnya (120 s), bukan 60 s lagi',
    (reopened.openedUntil - reopened.openedAt) === C.backoffMs[1],
    String((reopened.openedUntil - reopened.openedAt) / 1000) + 's');
}

// --- 7. KEMURNIAN + SNAPSHOT + PENYIMPAN ----------------------------------------------
{
  const src = fs.readFileSync(path.join(root, 'workers/api/breaker/breaker.js'), 'utf8');
  const logic = src.split('// PENYIMPAN')[0]
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/.*$/gm, '');
  check('Logika state machine tidak membaca jam sendiri (waktu selalu disuntik)',
    !/Date\.now\(\)|new Date\(\)/.test(logic), 'waktu sebagai argumen now');
  check('Logika state machine tidak menyentuh jaringan', !/fetch\(/.test(logic), 'fungsi murni');
  check('Tidak ada acak (state yang tidak bisa direproduksi tidak bisa diaudit)',
    !/Math\.random\(/.test(src), 'deterministik');

  const before = trip(T0);
  const frozen = JSON.stringify(before);
  B.beforeRequest(before, T0 + 999999);
  B.onFailure(before, 'timeout', T0 + 5, null);
  B.onSuccess(before, T0 + 5);
  check('State masukan tidak dimutasi (fungsi murni, aman untuk dicoba ulang)',
    JSON.stringify(before) === frozen, 'tidak dimutasi');

  const snap = B.snapshot(trip(T0), T0 + 1000);
  check('Snapshot memberi label fase + retryAfter detik untuk header',
    snap.breaker === 'OPEN' && Number.isFinite(snap.retryAfter) && snap.retryAfter > 0,
    `${snap.breaker} retryAfter=${snap.retryAfter}s`);
  check('Snapshot tidak membocorkan pesan mesin ke klien',
    !JSON.stringify(snap).toLowerCase().includes('error:'), JSON.stringify(snap));

  // Penyimpan: KV punya konsistensi akhir sampai 60 detik, jadi cermin KV dibatasi TTL pendek
  // dan D1 tetap sumber kebenaran.
  const store = B.createStore({ kv: null, d1: null });
  check('createStore bekerja tanpa binding (fail-open, bukan crash)',
    store && typeof store.load === 'function' && typeof store.save === 'function', 'ada');
  check('TTL cermin KV ≤60 s (konsistensi akhir KV diakui, bukan diabaikan)',
    C.mirrorTtlSeconds <= 60, String(C.mirrorTtlSeconds) + 's');

  (async () => {
    const memory = new Map();
    const kv = {
      get: async (k) => (memory.has(k) ? memory.get(k) : null),
      put: async (k, v) => { memory.set(k, v); }
    };
    const s2 = B.createStore({ kv });
    const tripped = trip(T0);
    await s2.save('tts', tripped, T0);
    const back = await s2.load('tts', T0 + 5);
    check('State bertahan lewat KV: OPEN tetap OPEN setelah isolate berganti',
      back.state === 'OPEN' && back.openings === tripped.openings, back.state);
    const missing = await s2.load('belum-ada', T0);
    check('Kunci belum ada ⇒ CLOSED, bukan galat', missing.state === 'CLOSED', missing.state);
    memory.set('breaker:rusak', '{bukan json');
    const broken = await s2.load('rusak', T0);
    check('State rusak di KV ⇒ CLOSED (fail-open, murid tetap bisa belajar)',
      broken.state === 'CLOSED', broken.state);

    const report = {
      status: failed ? 'NOT READY' : 'PASS',
      gate: 'breaker-test',
      counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
      checks
    };
    console.log(JSON.stringify(report, null, 2));
    if (failed) process.exitCode = 1;
  })().catch((error) => { console.error(error); process.exitCode = 1; });
}
