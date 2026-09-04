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
 *  6. COLD START (A5): pepper ADA pada permintaan PERTAMA di basis data KOSONG,
 *     dua permintaan bersamaan menghasilkan SATU pepper yang sama, inisialisasi
 *     bukan rotasi, rotasi harian tetap tepat waktu sesudahnya, pepper tidak
 *     pernah muncul di log/amplop galat, dan `dau_dedup` bertambah tepat satu
 *     per perangkat unik per hari.
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

  /* =====================================================================
   * 8. COLD START PEPPER (A5)
   * ---------------------------------------------------------------------
   * Kasus yang tidak pernah diuji siapa pun: basis data analytics BARU.
   * Sebelum perbaikan A5, pepper hanya dibuat rollup harian, jadi
   * `GET /api/usage/pepper` menjawab 503 sampai cron 00:05 WIB pertama lewat.
   * Klien butuh pepper untuk menurunkan `visitor_token`; tanpa token,
   * `dau_dedup` kosong dan DAU hari pertama SELALU nol. Bagian ini menuntut
   * enam hal, dan setiap assert di sini sudah dibuktikan bisa MERAH lewat
   * mutasi terarah (`_a5_redproof.sh`).
   * ===================================================================== */
  const routes = await import('./workers/api/analytics/route-events.js');
  const rollup = await import('./workers/api/analytics/rollup.js');

  /**
   * Tiruan D1 seminimal mungkin, TAPI dengan dua sifat yang menentukan:
   *  - `initPepper` menghormati `ON CONFLICT(id) DO NOTHING`: baris pepper hanya
   *    bisa lahir sekali. Kalau kode berubah jadi cek-lalu-tulis (`writePepper`),
   *    tiruan ini akan MENCATAT tulis kedua yang mengubah baris.
   *  - `stats.pepperRowWrites` hanya naik saat baris pepper benar-benar BERUBAH,
   *    bukan saat pernyataan dijalankan. Inilah pembeda "idempoten" dari
   *    "kebetulan hasilnya sama".
   * `raceOn` menahan DUA pembacaan pepper pertama sampai keduanya tiba, supaya
   * balapan yang di produksi butuh dua isolate bisa dipaksa terjadi di sini.
   */
  function makeDb(SQL, opts = {}) {
    const t = { metrics: new Map(), usage: new Map(), retention: new Map(), dau: new Set(), pepper: null };
    const stats = { pepperRowWrites: 0, initAttempts: 0, unconditionalPepperWrites: 0 };
    let arrivals = 0;
    let release = null;
    const barrier = new Promise(r => { release = r; });

    async function gateReads(sql) {
      if (!opts.raceOn || sql !== SQL.readPepper || arrivals >= 2) return;
      arrivals += 1;
      if (arrivals >= 2) release();
      await barrier;
    }

    function setPepper(row) {
      const before = t.pepper ? JSON.stringify(t.pepper) : '';
      t.pepper = row;
      if (JSON.stringify(row) !== before) stats.pepperRowWrites += 1;
    }

    function exec(sql, params) {
      switch (sql) {
        case SQL.upsertMetric: {
          const k = `${params[0]}|${params[1]}`;
          t.metrics.set(k, (t.metrics.get(k) || 0) + params[2]);
          return { results: [] };
        }
        case SQL.setMetric:
          t.metrics.set(`${params[0]}|${params[1]}`, params[2]);
          return { results: [] };
        case SQL.setMetricMax: {
          const k = `${params[0]}|${params[1]}`;
          t.metrics.set(k, Math.max(t.metrics.get(k) ?? -Infinity, params[2]));
          return { results: [] };
        }
        case SQL.upsertUsage: {
          const k = `${params[0]}|${params[1]}`;
          t.usage.set(k, (t.usage.get(k) || 0) + params[2]);
          return { results: [] };
        }
        case SQL.upsertRetention: {
          const k = `${params[0]}|${params[1]}`;
          t.retention.set(k, (t.retention.get(k) || 0) + params[2]);
          return { results: [] };
        }
        case SQL.insertDauToken:
          t.dau.add(`${params[0]}|${params[1]}`); // INSERT OR IGNORE = himpunan
          return { results: [] };
        case SQL.countDauTokens:
          return { results: [{ n: [...t.dau].filter(k => k.startsWith(`${params[0]}|`)).length }] };
        case SQL.countUsageRows:
          return { results: [{ n: [...t.usage.keys()].filter(k => k.startsWith(`${params[0]}|`)).length }] };
        case SQL.purgeDauDay:
          for (const k of [...t.dau]) if (k.startsWith(`${params[0]}|`)) t.dau.delete(k);
          return { results: [] };
        case SQL.purgeDauOlderThan:
          for (const k of [...t.dau]) if (k.split('|')[0] <= params[0]) t.dau.delete(k);
          return { results: [] };
        case SQL.readMetricRange: {
          const out = [];
          for (const [k, v] of t.metrics) {
            const [day, metric] = k.split('|');
            if (metric === params[0] && day >= params[1] && day <= params[2]) out.push({ day, value: v });
          }
          out.sort((a, b) => (a.day < b.day ? -1 : 1));
          return { results: out };
        }
        case SQL.purgeUsageOlderThan:
          for (const k of [...t.usage.keys()]) if (k.split('|')[0] < params[0]) t.usage.delete(k);
          return { results: [] };
        case SQL.purgeRetentionOlderThan:
          for (const k of [...t.retention.keys()]) if (k.split('|')[0] < params[0]) t.retention.delete(k);
          return { results: [] };
        case SQL.readPepper:
          return { results: t.pepper ? [{ ...t.pepper }] : [] };
        case SQL.initPepper:
          // ON CONFLICT(id) DO NOTHING: baris yang sudah ada TIDAK disentuh.
          stats.initAttempts += 1;
          if (t.pepper) return { results: [] };
          setPepper({ rotated_at: params[0], current: params[1], previous: null });
          return { results: [] };
        case SQL.writePepper:
          // Tulis tanpa syarat (dipakai rollup saat rotasi). Kalau jalur
          // permintaan memakai ini, penghitung di bawah membuka kedoknya.
          stats.unconditionalPepperWrites += 1;
          setPepper({ rotated_at: params[0], current: params[1], previous: params[2] });
          return { results: [] };
        default:
          throw new Error(`SQL tak dikenal oleh tiruan D1:\n${sql}`);
      }
    }

    return {
      tables: t,
      stats,
      prepare(sql) {
        const mk = params => ({
          async run() { await gateReads(sql); return exec(sql, params); },
          async all() { await gateReads(sql); return exec(sql, params); },
          async first() { await gateReads(sql); return exec(sql, params).results[0] || null; }
        });
        return Object.assign({ bind: (...params) => mk(params) }, mk([]));
      },
      async batch(stmts) { for (const s of stmts) await s.run(); }
    };
  }

  const HARI_MS = 24 * 60 * 60 * 1000;
  const pepperReq = () => new Request('https://api.fiezel.my.id/api/usage/pepper', {
    method: 'GET',
    headers: { 'cf-connecting-ip': `198.51.100.${Math.floor(Math.random() * 200) + 1}` }
  });
  const envOn = db => ({ ANALYTICS_ENABLED: 'on', ANALYTICS_DB: db });

  /* --- (a) pepper ADA pada permintaan pertama di basis data KOSONG --------- */
  const tInit = Date.parse('2026-08-26T03:00:00Z'); // 10:00 WIB, jauh dari cron
  const dbCold = makeDb(store.SQL);
  check('(a) basis data benar-benar kosong sebelum permintaan pertama',
    dbCold.tables.pepper === null, JSON.stringify(dbCold.tables.pepper));

  const res1 = await routes.handlePepper(pepperReq(), envOn(dbCold), null, tInit);
  const body1 = await res1.clone().json();
  check('(a) permintaan pepper PERTAMA di basis data kosong menjawab 200 (bukan 503)',
    res1.status === 200, `${res1.status} ${JSON.stringify(body1)}`);
  check('(a) permintaan pertama benar-benar menyajikan pepper yang bisa dipakai klien',
    typeof body1.pepper === 'string' && /^[0-9a-f]{64}$/.test(body1.pepper),
    String(body1.pepper && body1.pepper.length));
  const pepperHari1 = typeof body1.pepper === 'string' ? body1.pepper : '';
  // `safe` dipakai untuk semua turunan di bawah: kalau (a) sudah merah, sisa
  // bagian ini harus IKUT merah dengan nama assert-nya sendiri, bukan meledak
  // dan meninggalkan laporan lama (yang membuat mutasi terlihat hijau).
  const safe = async fn => { try { return await fn(); } catch { return null; } };
  check('(a) pepper hari-1 bisa menurunkan visitor_token yang sah',
    core.VISITOR_TOKEN_PATTERN.test(String(await safe(() => core.visitorToken(pepperHari1, installA)))));

  /* --- (b) dua permintaan bersamaan => SATU pepper yang sama -------------- */
  const dbRace = makeDb(store.SQL, { raceOn: true });
  const [rA, rB] = await Promise.all([
    routes.handlePepper(pepperReq(), envOn(dbRace), null, tInit),
    routes.handlePepper(pepperReq(), envOn(dbRace), null, tInit)
  ]);
  const [bA, bB] = [await rA.json(), await rB.json()];
  check('(b) dua permintaan bersamaan keduanya berhasil', rA.status === 200 && rB.status === 200,
    `${rA.status}/${rB.status}`);
  check('(b) dua permintaan bersamaan menyajikan SATU pepper yang SAMA',
    typeof bA.pepper === 'string' && bA.pepper === bB.pepper,
    `${String(bA.pepper).slice(0, 6)}… vs ${String(bB.pepper).slice(0, 6)}…`);
  check('(b) pepper yang disajikan = pepper yang benar-benar tersimpan (bukan calon lokal)',
    !!dbRace.tables.pepper && bA.pepper === dbRace.tables.pepper.current && bB.pepper === dbRace.tables.pepper.current,
    'setidaknya satu penyaji tidak membaca ulang');
  check('(b) baris pepper hanya BERUBAH sekali walau dua penulis mencoba bersamaan',
    dbRace.stats.pepperRowWrites === 1 && dbRace.stats.initAttempts === 2,
    JSON.stringify(dbRace.stats));
  check('(b) jalur permintaan tidak pernah memakai tulis tanpa syarat (writePepper)',
    dbRace.stats.unconditionalPepperWrites === 0, String(dbRace.stats.unconditionalPepperWrites));
  const initSql = String(store.SQL.initPepper || '').toLowerCase();
  check('(b) inisialisasi memakai penulisan idempoten yang DIJAMIN D1 (ON CONFLICT DO NOTHING)',
    /insert into pepper_state/.test(initSql) && /on conflict\s*\(\s*id\s*\)\s*do nothing/.test(initSql),
    initSql);
  const storeSrc = stripJsComments(read('analytics-store-d1.js'));
  const ensureBody = (storeSrc.match(/export async function ensurePepperState[\s\S]*?\n}/) || [''])[0];
  check('(b) ensurePepperState tidak memanggil writePepper (cek-lalu-tulis yang balapan)',
    ensureBody.length > 0 && !/writePepper/.test(ensureBody), ensureBody.slice(0, 160));
  check('(b) ensurePepperState MEMBACA ULANG sesudah menulis',
    (ensureBody.match(/readPepperState\s*\(/g) || []).length >= 2, ensureBody.slice(0, 200));

  /* --- (c) inisialisasi BUKAN rotasi -------------------------------------- */
  const stateInit = dbCold.tables.pepper || { rotated_at: -1, current: null, previous: 'TIDAK ADA BARIS' };
  check('(c) inisialisasi tidak mengarang `previous` (belum ada pendahulu)',
    stateInit.previous === null, String(stateInit.previous));
  // Dua lapis, karena satu lapis saja bisa menutupi mutasi: fungsi murninya
  // TIDAK boleh mengarang `previous`, DAN pernyataan SQL-nya menulis NULL apa
  // pun yang dikirim pemanggil.
  check('(c) initialPepperState() murni: `previous` null dan `rotated_at` = awal jendela',
    (() => {
      const s = core.initialPepperState(tInit, 'z'.repeat(64));
      return s.previous === null && s.rotated_at === core.pepperWindowStart(tInit) && s.current === 'z'.repeat(64);
    })(), JSON.stringify(core.initialPepperState(tInit, 'z'.repeat(64)).previous));
  check('(c) SQL inisialisasi menulis `previous` sebagai NULL literal (bukan parameter)',
    /values\s*\(\s*1\s*,\s*\?1\s*,\s*\?2\s*,\s*null\s*\)/i.test(String(store.SQL.initPepper)),
    String(store.SQL.initPepper));
  // Batas jendela ditulis sebagai KONSTANTA LITERAL, bukan diambil dari
  // implementasi. Kalau jangkar jendela digeser (mis. jadi tengah malam UTC),
  // assert di bawah dan seluruh bagian (d) WAJIB merah — bukan ikut bergeser.
  const windowStart = Date.parse('2026-08-25T17:05:00Z'); // cron `5 17 * * *` terakhir
  check('(c) `rotated_at` inisialisasi = awal jendela cron, BUKAN `now`',
    stateInit.rotated_at === windowStart && stateInit.rotated_at < tInit,
    `${stateInit.rotated_at} vs window ${windowStart} vs now ${tInit}`);
  check('(c) pepperWindowStart() memang batas cron 17:05 UTC (00:05 WIB) terakhir',
    core.pepperWindowStart(tInit) === windowStart, new Date(core.pepperWindowStart(tInit)).toISOString());
  // Rollup di TENGAH jendela yang sama tidak boleh merotasi: rotasi tengah hari
  // membuat satu perangkat menghitung dua token pada `day` yang sama.
  const midRollup = await rollup.runDailyRollup(dbCold, { now: tInit + 6 * 3600000, day: '2026-08-26' });
  check('(c) rollup di tengah jendela TIDAK merotasi pepper hasil inisialisasi',
    midRollup.pepperRotated === false, JSON.stringify(midRollup.pepperRotated));
  check('(c) rollup tengah jendela tidak mengubah `rotated_at` maupun `current`',
    dbCold.tables.pepper.rotated_at === windowStart && dbCold.tables.pepper.current === pepperHari1,
    JSON.stringify({ rotated_at: dbCold.tables.pepper.rotated_at, sama: dbCold.tables.pepper.current === pepperHari1 }));
  check('(c) permintaan pepper berikutnya tidak menambah tulis (inisialisasi sekali saja)',
    (await (await routes.handlePepper(pepperReq(), envOn(dbCold), null, tInit + 3600000)).json()).pepper === pepperHari1 &&
      dbCold.stats.pepperRowWrites === 1,
    JSON.stringify(dbCold.stats));

  /* --- (d) rotasi harian tetap tepat waktu sesudah inisialisasi malas ----- */
  const cron1 = Date.parse('2026-08-26T17:05:00Z'); // jalan cron berikutnya
  check('(d) umur pepper hasil inisialisasi tepat 24 jam pada cron BERIKUTNYA',
    core.rotatePepperDue(cron1, stateInit.rotated_at) === true &&
      core.rotatePepperDue(cron1 - 60000, stateInit.rotated_at) === false,
    `${cron1 - stateInit.rotated_at}`);
  const roll1 = await rollup.runDailyRollup(dbCold, { now: cron1, day: '2026-08-26' });
  const stateHari2 = dbCold.tables.pepper || {};
  check('(d) cron berikutnya MEROTASI pepper (tidak ada hari yang terlewat)',
    roll1.pepperRotated === true, JSON.stringify(roll1.pepperRotated));
  check('(d) sesudah rotasi, pepper hari-1 pindah ke `previous` dan `current` berganti',
    !!pepperHari1 && stateHari2.previous === pepperHari1 && stateHari2.current !== pepperHari1,
    'rotasi tidak mengganti current');
  check('(d) `rotated_at` maju tepat ke batas cron',
    stateHari2.rotated_at === cron1, `${stateHari2.rotated_at} vs ${cron1}`);
  const tokenHari1 = await safe(() => core.visitorToken(pepperHari1, installA));
  const tokenHari2 = await safe(() => core.visitorToken(stateHari2.current, installA));
  check('(d) token hari-1 TIDAK bisa disambungkan ke token hari-2 (perangkat sama, token beda)',
    !!tokenHari1 && !!tokenHari2 && tokenHari1 !== tokenHari2, 'token bertahan lintas rotasi');
  const roll2 = await rollup.runDailyRollup(dbCold, { now: cron1 + HARI_MS, day: '2026-08-27' });
  check('(d) rotasi berikutnya juga terjadi tepat waktu (irama harian pulih penuh)',
    roll2.pepperRotated === true, JSON.stringify(roll2.pepperRotated));
  check('(d) pepper hari-1 HILANG PERMANEN dua putaran kemudian',
    !JSON.stringify(dbCold.tables.pepper).includes(pepperHari1), 'pepper hari-1 masih ada di state');

  /* --- (e) pepper tidak pernah muncul di log / amplop galat --------------- */
  // Pindai SUMBER, bukan hanya jalankan: satu `console.log(state)` yang tidak
  // pernah dieksekusi di jalur uji tetap membocorkan rahasia di produksi.
  const logHits = [];
  const envelopeHits = [];
  const responseFieldHits = [];
  for (const rel of modules) {
    const src = stripJsComments(read(rel));
    for (const m of src.matchAll(/console\.[a-z]+\s*\(([\s\S]{0,200}?)\)\s*;/g)) {
      if (/pepper|\.current\b/i.test(m[1])) logHits.push(`${rel}: ${m[0].slice(0, 80)}`);
    }
    for (const m of src.matchAll(/\{[^{}]*\berror\s*:[^{}]*\}/g)) {
      if (/pepper/i.test(m[0])) envelopeHits.push(`${rel}: ${m[0].slice(0, 80)}`);
    }
    // `pepper:` sebagai KUNCI objek (tanpa spasi sebelum titik dua), supaya
    // ternary `? pepper : newPepper()` tidak ikut terhitung.
    for (const m of src.matchAll(/(^|[^\w.])pepper:/gm)) responseFieldHits.push(`${rel}:${m.index}`);
  }
  check('(e) tidak ada satu pun panggilan console yang menyebut pepper/state.current',
    logHits.length === 0, logHits.join(' | '));
  check('(e) tidak ada amplop galat yang memuat field pepper',
    envelopeHits.length === 0, envelopeHits.join(' | '));
  const pepperHandler = (stripJsComments(read('route-events.js')).match(/export async function handlePepper[\s\S]*?\n}/) || [''])[0];
  check('(e) field `pepper:` hanya muncul SEKALI di seluruh kode analytics, di handlePepper',
    responseFieldHits.length === 1 && /pepper\s*:\s*state\.current/.test(pepperHandler),
    responseFieldHits.join(','));

  // Bukti runtime: sadap console selama seluruh jalur (inisialisasi, sukses,
  // galat, rate-limit, rollup+rotasi) dan tuntut pepper tidak pernah tercetak.
  const sadap = [];
  const aslinya = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug', 'trace']) {
    aslinya[k] = console[k];
    console[k] = (...args) => { sadap.push(args.map(a => { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); } }).join(' ')); };
  }
  let amplopGalat = [];
  try {
    const dbLog = makeDb(store.SQL);
    const r200 = await routes.handlePepper(pepperReq(), envOn(dbLog), null, tInit);
    const p = (await r200.json()).pepper || '\u0000tidak-ada-pepper';
    // amplop galat dari SEMUA jalur yang bisa gagal sesudah pepper ada
    amplopGalat.push(await (await routes.handlePepper(pepperReq(), { ANALYTICS_ENABLED: 'on' }, null, tInit)).text());
    amplopGalat.push(await (await routes.handlePepper(pepperReq(), { ANALYTICS_ENABLED: 'off' }, null, tInit)).text());
    amplopGalat.push(await (await routes.handleEvents(
      new Request('https://api.fiezel.my.id/api/usage/events', { method: 'POST', headers: { 'cf-connecting-ip': '198.51.100.7' }, body: '{"schema":"salah"}' }),
      envOn(dbLog), null, tInit)).text());
    await rollup.runDailyRollup(dbLog, { now: tInit + HARI_MS, day: '2026-08-26' });
    const bocorLog = sadap.filter(line => line.includes(p));
    const bocorAmplop = amplopGalat.filter(text => text.includes(p));
    check('(e) pepper tidak pernah tercetak ke log di jalur mana pun (bukti runtime)',
      bocorLog.length === 0, bocorLog.join(' | ').slice(0, 200));
    check('(e) pepper tidak pernah muncul di amplop galat (503/404/400)',
      bocorAmplop.length === 0, amplopGalat.join(' | ').slice(0, 200));
  } finally {
    for (const k of Object.keys(aslinya)) console[k] = aslinya[k];
  }

  /* --- (f) dau_dedup: tepat satu baris per perangkat unik per hari -------- */
  const HARI_DAU = '2026-08-26';
  const tokA = 'a1'.repeat(16);
  const tokB = 'b2'.repeat(16);
  const ev = (name, token, extra = {}) => {
    const r = core.normalizeEvent(Object.assign({ name, day: HARI_DAU, visitor_token: token }, extra), { origin: 'client' });
    if (!r.ok) throw new Error(`event uji tidak sah: ${name} ${r.reason}`);
    return r.event;
  };

  const dbDau = makeDb(store.SQL);
  await store.applyAggregate(dbDau, core.aggregate([ev('app_open', tokA, { platform: 'android' })]));
  check('(f) satu perangkat yang HANYA mengirim app_open tetap terhitung DAU',
    (await store.countDauTokens(dbDau, HARI_DAU)) === 1, String(await store.countDauTokens(dbDau, HARI_DAU)));

  await store.applyAggregate(dbDau, core.aggregate([
    ev('app_open', tokA, { platform: 'android' }),
    ev('day_active', tokA, { attempts_bucket: '10-29' }),
    ev('app_open', tokA, { platform: 'android' })
  ]));
  check('(f) perangkat yang SAMA tidak bertambah dua kali (app_open + day_active + kirim ulang)',
    (await store.countDauTokens(dbDau, HARI_DAU)) === 1, String(await store.countDauTokens(dbDau, HARI_DAU)));

  await store.applyAggregate(dbDau, core.aggregate([ev('day_active', tokB, { attempts_bucket: '5-9' })]));
  check('(f) perangkat UNIK kedua menambah tepat satu',
    (await store.countDauTokens(dbDau, HARI_DAU)) === 2, String(await store.countDauTokens(dbDau, HARI_DAU)));

  const aggDua = core.aggregate([ev('app_open', tokA), ev('day_active', tokA)]);
  check('(f) aggregate() sendiri sudah men-dedup (day, token) sebelum menyentuh D1',
    aggDua.dau.length === 1, JSON.stringify(aggDua.dau));
  check('(f) angka keterlibatan tidak hilang: `day_active_reports` tetap terpisah dari DAU',
    (aggDua.metrics[HARI_DAU] || {}).day_active_reports === 1 && (aggDua.metrics[HARI_DAU] || {}).app_open === 1,
    JSON.stringify(aggDua.metrics[HARI_DAU]));

  const rollDau = await rollup.runDailyRollup(dbDau, { now: Date.parse('2026-08-27T17:05:00Z'), day: HARI_DAU });
  check('(f) rollup menulis DAU = jumlah perangkat unik, lalu token dihapus',
    rollDau.dau === 2 && dbDau.tables.dau.size === 0 && dbDau.tables.metrics.get(`${HARI_DAU}|dau`) === 2,
    JSON.stringify({ dau: rollDau.dau, sisaToken: dbDau.tables.dau.size }));

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
