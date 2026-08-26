/**
 * FIEZEL E4 gerbang — analytics privasi-maksimal.
 *
 * Gerbang ini ada karena jaminan privasi tidak runtuh oleh modul yang ceroboh;
 * ia runtuh karena SATU field baru ditambahkan di satu tempat dan tidak ada
 * yang memeriksa gabungannya lagi. Jadi berkas ini tidak percaya pada niat
 * baik: ia MEMBACA DDL dan MEMBACA kode, lalu menuntut lima hal.
 *
 *  1. `normalizeEvent()` membuang field asing — tidak satu pun lolos.
 *  2. Tidak ada field nama/email/uuid/IP/teks jawaban di SELURUH skema
 *     (dipindai dari DDL SQL maupun dari allowlist di kode).
 *  3. `visitor_token` tidak bisa dibalik ke identitas pemasangan.
 *  4. Pepper lama benar-benar dihapus (rotasi dua kali → pepper pertama hilang).
 *  5. NOL tabel per-orang: tidak ada kolom `user_id`/`install_id` di tabel
 *     analytics mana pun, dan tidak ada kueri yang menyebut tabel kuota.
 *
 * Otoritas kontrak: `EXEC-BRIEF-CF.md` bagian KONTRAK ANALYTICS PRIVASI-MAKSIMAL.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const DIR = path.join(root, 'workers', 'api', 'analytics');
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: ok ? undefined : String(detail ?? '') });
  if (!ok) failed = true;
}

function read(rel) {
  return fs.readFileSync(path.join(DIR, rel), 'utf8');
}

/** Buang komentar supaya yang dipindai adalah KODE/SKEMA, bukan penjelasan. */
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
function stripSqlComments(src) {
  return src.replace(/--[^\n]*/g, ' ');
}

/**
 * Token terlarang. Dicari sebagai substring pada teks yang sudah dibuang
 * komentarnya, huruf kecil. Daftar ini adalah bab 29 diterjemahkan ke regex.
 */
const FORBIDDEN_TOKENS = [
  'email', 'uuid', 'user_agent', 'useragent', 'learnername', 'learner_name',
  'username', 'user_name', 'display_name', 'full_name',
  'answer_text', 'answertext', 'question_text', 'questiontext', 'selected_answer',
  'correct_answer', 'transcript', 'prompt_text', 'response_text', 'ai_response',
  'latitude', 'longitude', 'geo_city', 'geo_country', 'ip_address', 'ipaddress',
  'remote_addr', 'raw_ip', 'client_ip', 'user_id', 'userid'
];

/** Kolom yang menandai tabel per-orang. Kalau salah satu muncul di DDL: merah. */
const PER_PERSON_COLUMNS = ['user_id', 'install_id', 'installid', 'account_id', 'learner_id', 'device_id', 'session_id'];

(async () => {
  /* =====================================================================
   * 0. Berkas wajib ada
   * ===================================================================== */
  const required = ['analytics-core.js', 'route-events.js', 'analytics-store-d1.js', 'analytics-tables.js', 'rollup.js', 'PRIVACY.md', path.join('migrations', '0002_analytics.sql')];
  for (const rel of required) {
    check(`Berkas wajib ada: ${rel}`, fs.existsSync(path.join(DIR, rel)), 'tidak ditemukan');
  }
  if (failed) { finish(); return; }

  const core = await import('./workers/api/analytics/analytics-core.js');
  const store = await import('./workers/api/analytics/analytics-store-d1.js');
  const tables = await import('./workers/api/analytics/analytics-tables.js');

  const ddlRaw = read(path.join('migrations', '0002_analytics.sql'));
  const ddl = stripSqlComments(ddlRaw).toLowerCase();

  /* =====================================================================
   * 1. normalizeEvent MEMBUANG field asing
   * ===================================================================== */
  const RACUN = {
    userName: 'Jahran',
    learnerName: 'Jahran',
    email: 'jahran@example.com',
    uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
    installId: '0f8fad5b-d9cb-469f-a165-70867728950e',
    user_id: 'u_123',
    ip: '203.0.113.9',
    ipAddress: '203.0.113.9',
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    questionText: 'KALIMAT-SOAL-RAHASIA-XYZ',
    selectedAnswer: 'JAWABAN-DIPILIH-RAHASIA-XYZ',
    correctAnswer: 'JAWABAN-BENAR-RAHASIA-XYZ',
    transcript: 'TRANSKRIP-SUARA-RAHASIA-XYZ',
    promptText: 'isi prompt yang tidak boleh keluar',
    aiResponse: 'isi respons AI yang tidak boleh keluar',
    latitude: -6.2,
    longitude: 106.8,
    itemId: 'gram_b1_014',
    sessionId: 's-abadi-lintas-hari',
    at: 1756000000000
  };

  const kotor = Object.assign({ name: 'question_answered', day: '2026-08-27', domain: 'grammar', level: 'B1', ok: true }, RACUN);
  const hasil = core.normalizeEvent(kotor, { origin: 'client' });
  check('normalizeEvent menerima event yang dikenal', hasil.ok === true, hasil.reason);
  const lolos = hasil.ok ? Object.keys(hasil.event) : [];
  check('normalizeEvent hanya meneruskan field yang diizinkan',
    JSON.stringify(lolos.slice().sort()) === JSON.stringify(['day', 'domain', 'level', 'name', 'ok']),
    lolos.join(','));

  const racunKeys = Object.keys(RACUN).filter(k => k !== 'at');
  const tidakDibuang = racunKeys.filter(k => !hasil.dropped.includes(k));
  check('normalizeEvent melaporkan SEMUA field asing sebagai dibuang', tidakDibuang.length === 0, tidakDibuang.join(','));

  const serialized = JSON.stringify(hasil.event || {});
  const bocor = ['RAHASIA-XYZ', 'Jahran', 'jahran@example.com', '203.0.113.9', 'Mozilla', '0f8fad5b', 'gram_b1_014', '106.8']
    .filter(marker => serialized.includes(marker));
  check('Tidak ada penanda rahasia yang muncul di event ternormalisasi', bocor.length === 0, bocor.join(','));

  check('normalizeEvent membuang timestamp presisi ms (`at` tidak diteruskan)',
    !Object.prototype.hasOwnProperty.call(hasil.event || {}, 'at'), 'field `at` masih ada');

  check('normalizeEvent menolak nama event tak dikenal',
    core.normalizeEvent({ name: 'kirim_semua_riwayat', day: '2026-08-27' }).reason === 'unknown_event');

  // Nilai di luar enum harus dibuang, bukan disimpan apa adanya.
  const enumJahat = core.normalizeEvent({ name: 'lesson_started', day: '2026-08-27', domain: 'Jahran belajar di rumah', level: 'B1' });
  check('Nilai string di luar enum dibuang (tidak ada teks bebas yang lolos)',
    enumJahat.ok && !('domain' in enumJahat.event) && enumJahat.invalid.includes('domain'),
    JSON.stringify(enumJahat));

  // Semua field di allowlist harus bertipe tertutup: tidak ada tipe teks bebas.
  const tipeBebas = [];
  for (const [evName, spec] of Object.entries(core.EVENT_SPEC)) {
    for (const [field, t] of Object.entries(spec.fields)) {
      if (!['bool', 'int', 'enum', 'day', 'token', 'version'].includes(t.kind)) tipeBebas.push(`${evName}.${field}:${t.kind}`);
    }
  }
  check('Tidak ada field bertipe teks bebas di seluruh EVENT_SPEC', tipeBebas.length === 0, tipeBebas.join(','));

  /* =====================================================================
   * 2. Skema bersih: pindai DDL + allowlist kode
   * ===================================================================== */
  const ddlHits = FORBIDDEN_TOKENS.filter(tok => ddl.includes(tok));
  check('DDL analytics bebas field nama/email/uuid/IP/teks jawaban', ddlHits.length === 0, ddlHits.join(','));

  const specFieldNames = new Set();
  for (const spec of Object.values(core.EVENT_SPEC)) for (const f of Object.keys(spec.fields)) specFieldNames.add(f.toLowerCase());
  const specHits = [...specFieldNames].filter(f => FORBIDDEN_TOKENS.some(tok => f.includes(tok)));
  check('Allowlist field event bebas nama/email/uuid/IP/teks jawaban', specHits.length === 0, specHits.join(','));

  // Pindai kode (tanpa komentar). `installId` hanya boleh muncul di
  // analytics-core.js, sebagai argumen visitorToken() — dan tidak pernah keluar.
  const modules = ['analytics-core.js', 'route-events.js', 'analytics-store-d1.js', 'analytics-tables.js', 'rollup.js'];
  const codeHits = [];
  const installHits = [];
  for (const rel of modules) {
    const code = stripJsComments(read(rel)).toLowerCase();
    for (const tok of FORBIDDEN_TOKENS) if (code.includes(tok)) codeHits.push(`${rel}:${tok}`);
    if (rel !== 'analytics-core.js' && /installid/.test(code)) installHits.push(rel);
  }
  check('Kode analytics bebas token terlarang bab 29', codeHits.length === 0, codeHits.join(','));
  check('`installId` hanya ada di analytics-core.js (argumen visitorToken)', installHits.length === 0, installHits.join(','));

  const coreCode = stripJsComments(read('analytics-core.js'));
  check('visitorToken tidak pernah mengembalikan/menyimpan argumen mentahnya',
    !/return\s+installId/.test(coreCode) && !/installId\s*=/.test(coreCode.replace(/\(pepper,\s*installId\)/g, '')),
    'installId dipakai di luar perhitungan HMAC');

  /* =====================================================================
   * 3. Token tidak bisa dibalik
   * ===================================================================== */
  const installA = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const installB = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
  const pepper1 = 'a'.repeat(64);
  const pepper2 = 'b'.repeat(64);

  const tA1 = await core.visitorToken(pepper1, installA);
  const tA1b = await core.visitorToken(pepper1, installA);
  const tB1 = await core.visitorToken(pepper1, installB);
  const tA2 = await core.visitorToken(pepper2, installA);

  check('Token berbentuk 128 bit hex (32 karakter)', core.VISITOR_TOKEN_PATTERN.test(tA1), tA1);
  check('Token deterministik dalam satu hari (dedup DAU bisa jalan)', tA1 === tA1b, `${tA1} vs ${tA1b}`);
  check('Perangkat berbeda menghasilkan token berbeda', tA1 !== tB1, 'tabrakan token');
  check('Pepper berganti => token berganti (hari-1 tak bisa disambung ke hari-2)', tA1 !== tA2, 'token bertahan lintas pepper');
  check('Token tidak memuat potongan identitas pemasangan',
    !tA1.includes(installA.slice(0, 8)) && !tA1.includes(installA.replace(/-/g, '').slice(0, 8)), tA1);

  // Pembalikan hanya mungkin kalau installId bisa dienumerasi. Buktikan bahwa
  // menebak dari ruang kandidat kecil pun tidak menemukan sumbernya.
  const kandidat = [installB, 'kandidat-tebakan-satu', 'kandidat-tebakan-dua', installA.toUpperCase(), installA.slice(0, -1)];
  const cocok = [];
  for (const k of kandidat) if ((await core.visitorToken(pepper1, k)) === tA1) cocok.push(k);
  check('Token tidak bisa dibalik dengan tebakan varian dekat', cocok.length === 0, cocok.join(','));

  let tolakPendek = false;
  try { await core.visitorToken('pendek', installA); } catch { tolakPendek = true; }
  check('visitorToken menolak pepper lemah (<32 karakter)', tolakPendek);

  /* =====================================================================
   * 4. Pepper lama DIHAPUS
   * ===================================================================== */
  const HARI = 24 * 60 * 60 * 1000;
  const t0 = Date.parse('2026-08-25T17:05:00Z');
  let state = core.rotatePepper(null, t0, 'p1'.padEnd(64, '1'));
  const p1 = state.current;
  check('Rotasi pertama tidak menyimpan previous palsu', state.previous === null, String(state.previous));

  check('rotatePepperDue: belum 24 jam => tidak rotasi', core.rotatePepperDue(t0 + HARI - 1000, t0) === false);
  check('rotatePepperDue: sudah 24 jam => rotasi', core.rotatePepperDue(t0 + HARI, t0) === true);
  check('rotatePepperDue: state kosong => rotasi', core.rotatePepperDue(t0, 0) === true);
  check('rotatePepperDue: jam mundur => rotasi (state rusak diamankan)', core.rotatePepperDue(t0, t0 + HARI) === true);

  state = core.rotatePepper(state, t0 + HARI, 'p2'.padEnd(64, '2'));
  const p2 = state.current;
  check('Rotasi kedua menyimpan pepper sebelumnya sebagai jendela toleransi', state.previous === p1);

  state = core.rotatePepper(state, t0 + 2 * HARI, 'p3'.padEnd(64, '3'));
  const isiState = JSON.stringify(state);
  check('Pepper dua putaran lalu HILANG dari state (p1 tidak ada lagi)', !isiState.includes(p1), isiState);
  check('State pepper hanya memuat current + satu previous',
    state.current !== p1 && state.previous === p2 && Object.keys(state).sort().join(',') === 'current,previous,rotated_at',
    isiState);

  const ddlPepperCols = (ddl.match(/create table if not exists pepper_state\s*\(([\s\S]*?)\);/) || [])[1] || '';
  check('pepper_state tidak punya kolom arsip/riwayat pepper',
    !/history|archive|pepper_log|previous2|older/.test(ddlPepperCols), ddlPepperCols.trim().slice(0, 200));

  /* =====================================================================
   * 5. NOL tabel per-orang
   * ===================================================================== */
  const ddlTables = [...ddl.matchAll(/create table if not exists\s+([a-z0-9_]+)/g)].map(m => m[1]);
  check('DDL hanya membuat tabel yang terdaftar di analytics-tables.js',
    JSON.stringify(ddlTables.slice().sort()) === JSON.stringify([...tables.ANALYTICS_TABLES].sort()),
    `${ddlTables.join(',')} vs ${tables.ANALYTICS_TABLES.join(',')}`);

  check('Jumlah tabel analytics tepat lima (agregat + dedup + pepper)', ddlTables.length === 5, String(ddlTables.length));

  const perPersonHits = [];
  for (const m of ddl.matchAll(/create table if not exists\s+([a-z0-9_]+)\s*\(([\s\S]*?)\)\s*(?:without rowid)?\s*;/g)) {
    const [, table, body] = m;
    for (const col of PER_PERSON_COLUMNS) {
      if (new RegExp(`(^|[\\s(,])${col}\\b`).test(body)) perPersonHits.push(`${table}.${col}`);
    }
  }
  check('Tidak ada kolom per-orang (user_id/install_id/...) di tabel analytics mana pun',
    perPersonHits.length === 0, perPersonHits.join(','));

  // Tabel yang cf-b5 ajukan dan brief eksekusi LARANG.
  const tabelDilarang = ['identity', 'daily_active', 'cost_daily', 'retention_cohort', 'sessions', 'users'];
  const munculDilarang = tabelDilarang.filter(t => ddlTables.includes(t));
  check('Tabel per-orang usulan cf-b5 tidak dibuat (brief eksekusi menang)', munculDilarang.length === 0, munculDilarang.join(','));

  // Tidak ada kueri analytics yang menyentuh tabel kuota/identitas.
  const sqlHits = [];
  for (const [name, sql] of Object.entries(store.SQL)) {
    try { store.assertNoQuotaJoin(sql); } catch (e) { sqlHits.push(`${name}: ${e.message}`); }
  }
  check('Tidak ada kueri analytics yang menyebut tabel kuota/identitas', sqlHits.length === 0, sqlHits.join(' | '));

  let joinTertangkap = false;
  try { store.assertNoQuotaJoin('SELECT * FROM metrics_daily JOIN quota USING (user_id)'); } catch { joinTertangkap = true; }
  check('assertNoQuotaJoin benar-benar menangkap JOIN ke tabel kuota', joinTertangkap);

  const ddlHasWarning = /dilarang di-join/i.test(ddlRaw) && /nol tabel per-orang/i.test(ddlRaw);
  check('DDL memuat komentar tegas soal larangan JOIN dengan tabel kuota', ddlHasWarning);

  const storeHasWarning = /dilarang di-join/i.test(read('analytics-store-d1.js'));
  check('analytics-store-d1.js memuat larangan JOIN yang sama', storeHasWarning);

  /* =====================================================================
   * 6. Purge token harian benar-benar ada
   * ===================================================================== */
  const rollupSrc = read('rollup.js');
  check('rollup.js memanggil purge dau_dedup', /purgeDauDedup\s*\(/.test(rollupSrc));
  check('rollup.js menghitung DAU sebelum purge',
    rollupSrc.indexOf('countDauTokens') < rollupSrc.indexOf('await purgeDauDedup'),
    'urutan salah: purge sebelum hitung = DAU nol');
  check('store menyediakan DELETE untuk dau_dedup', /delete from dau_dedup/i.test(store.SQL.purgeDauDay));

  /* =====================================================================
   * 7. PRIVACY.md jujur soal estimasi perangkat
   * ===================================================================== */
  const priv = read('PRIVACY.md');
  const wajibAda = [
    [/estimasi perangkat/i, 'kalimat "estimasi perangkat"'],
    [/dua perangkat terhitung dua kali|dua kali/i, 'multi-perangkat dobel'],
    [/hapus.{0,30}browser|menghapus data browser/i, 'hapus data = perangkat baru'],
    [/tidak dikumpulkan/i, 'daftar yang TIDAK dikumpulkan'],
    [/retensi|umur simpan/i, 'retensi data'],
    [/installId/, 'penjelasan installId tidak dikirim'],
    [/wau_lower|rentang/i, 'kejujuran WAU/MAU sebagai rentang']
  ];
  for (const [re, label] of wajibAda) check(`PRIVACY.md memuat ${label}`, re.test(priv));

  finish();

  function finish() {
    const report = {
      status: failed ? 'NOT READY' : 'PASS',
      gate: 'analytics-privacy',
      contract: 'EXEC-BRIEF-CF.md :: KONTRAK ANALYTICS PRIVASI-MAKSIMAL',
      counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
      checks
    };
    fs.writeFileSync(path.join(root, 'ANALYTICS-PRIVACY-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (failed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
