// m025-310 — GERBANG BELANJA AI SLOT 5: setiap rute yang memanggil model WAJIB lewat
// gerbang flag + kuota murid, dan gerbangnya diuji dengan SQL kuota yang sungguhan.
//
// KELAS BUG YANG DITUTUP, dan kenapa ia lolos DUA kali sebelum ini:
//
//   P3 (Agu 2026) memasang gerbang flag + jembatan kuota pada rute yang keluar dari
//   registerAiRoutes. S3 memasangnya pada rute TTS, ditemukan dengan menembak produksi
//   HIDUP sesudah P3 dianggap selesai. Keduanya memasang pagar pada PIPA, dan pagar pipa
//   hanya melindungi yang lewat pipa. route-legacy.js disebar mentah (`...LEGACY_ROUTES`)
//   di route-slots.js, jadi /api/ai/chat - jalur tutor yang BENAR-BENAR dipakai app.js -
//   tidak pernah lewat keduanya: tanpa kuota harian murid, dan tanpa tombol matikan AI.
//
// Karena itu gerbang ini tidak memeriksa "apakah dua rute itu dijaga" melainkan
// "apakah SETIAP rute yang memanggil model dijaga" - ditemukan dari isi berkas, bukan dari
// daftar yang ditulis tangan. Rute keenam yang kelak memanggil model akan memerahkan
// gerbang ini walau tidak ada yang ingat memperbaruinya.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. */
const fs = require('fs'), path = require('path');
const root = __fzRoot;

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok: !!ok, details: details === undefined ? '' : String(details) });
  if (!ok) failed = true;
};

const legacyPath = path.join(root, 'workers', 'api', 'route-legacy.js');
const legacy = fs.readFileSync(legacyPath, 'utf8');

/* ============ BAGIAN 1: STATIS — cakupan daftar terhadap KENYATAAN berkas ============ */

// Rute yang badan handlernya memanggil runLegacyModel(, ditemukan dengan memindai berkas.
const spendingRoutes = [];
{
  let current = null;
  for (const line of legacy.split('\n')) {
    const m = line.match(/^\s*\['(?:POST|GET|PUT|DELETE)',\s*'(\/api\/[^']+)'/);
    if (m) current = m[1];
    if (/runLegacyModel\(ctx/.test(line) && current) {
      if (!spendingRoutes.includes(current)) spendingRoutes.push(current);
    }
  }
}
check('ada rute yang memanggil model untuk diperiksa', spendingRoutes.length > 0,
  'tidak satu pun runLegacyModel( ditemukan di dalam rute; gerbang ini perlu disesuaikan, jangan dibiarkan hijau');

// AI_SPEND_ROUTES dibaca dari SUMBER (bukan dari modul) supaya bagian statis ini tetap
// berjalan walau modulnya gagal dimuat.
const tableAt = legacy.indexOf('export const AI_SPEND_ROUTES');
check('AI_SPEND_ROUTES ada', tableAt !== -1);
const tableSrc = tableAt === -1 ? '' : legacy.slice(tableAt, legacy.indexOf('});', tableAt));
const listed = Array.from(tableSrc.matchAll(/'(\/api\/[^']+)'\s*:/g), (m) => m[1]);

for (const r of spendingRoutes) {
  check('rute pembelanja model terdaftar di AI_SPEND_ROUTES: ' + r, listed.includes(r),
    'rute ini memanggil runLegacyModel tetapi TIDAK digerbangi: tanpa kuota murid dan tanpa tombol matikan AI');
}
for (const r of listed) {
  check('rute terdaftar memang memanggil model: ' + r, spendingRoutes.includes(r),
    'terdaftar tetapi tidak memanggil model; daftar yang memuat rute mati membuat cakupannya tidak bisa dipercaya');
}

// Pemasangannya: ROUTES yang diekspor WAJIB hasil pembungkusan, dan RAW_ROUTES tidak boleh
// bisa dipakai langsung dari luar - kalau bisa, ada jalan memasang SLOT 5 tanpa gerbangnya.
check('ROUTES yang diekspor dibungkus aiSpendGate', /export const ROUTES = RAW_ROUTES\.map\(/.test(legacy) && /aiSpendGate\(/.test(legacy),
  'ROUTES tidak dibungkus; daftar AI_SPEND_ROUTES jadi hiasan');
check('RAW_ROUTES TIDAK diekspor', !/export\s+const\s+RAW_ROUTES/.test(legacy),
  'RAW_ROUTES diekspor: ada jalan memasang rute tanpa gerbang belanja');

// Pembatas laju in-memory tidak boleh kembali: ia hidup di memori satu isolate (hitungannya
// nol lagi setiap isolate baru) dan angkanya 40/jam = 960/hari, 38x plafon 25/hari yang
// dipilih owner. Menyimpan keduanya = dua mekanisme untuk satu maksud.
// Diperiksa pada KODE, bukan pada komentar: berkas itu MENJELASKAN kenapa pembatas lama
// dihapus, jadi menguji teks mentah akan memerah karena penjelasannya sendiri.
const legacyCode = legacy.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
check('pembatas laju in-memory tidak kembali', !/allowAiRequest|aiRateLimiter/.test(legacyCode),
  'pembatas laju per-isolate kembali; ia tidak membatasi apa pun dan menyamarkan kuota yang sungguhan');

// Plafon neuron AKUN harus TETAP di chokepoint: ia menjaga tagihan owner, gerbang rute
// menjaga pembagian antar murid. Keduanya harus berlaku sendiri-sendiri.
check('plafon neuron akun tetap di runLegacyModel', /reserveAccountNeurons\(/.test(legacy) && /fiezelBudgetDenied/.test(legacy),
  'plafon neuron akun hilang dari chokepoint');

const wiring = fs.readFileSync(path.join(root, 'workers', 'api', 'route-wiring.js'), 'utf8');
check('aiSpendGate memakai enforceQuota yang SAMA, bukan salinan',
  /export function aiSpendGate/.test(wiring) && /enforceQuota\(bucket, 1\)\(quotaCtxFor\(ctx\)/.test(wiring),
  'gerbang rute tidak memakai enforceQuota; dua mekanisme kuota adalah cara celah ketiga lahir');
check('aiSpendGate fail-closed saat store kuota hilang', /if \(!quotaDb\(ctx\.env\)\)/.test(wiring.slice(wiring.indexOf('export function aiSpendGate'))),
  'tanpa store kuota gerbang ini melanjutkan belanja');

/* ============ BAGIAN 2: PERILAKU — SQL kuota SUNGGUHAN dari migrasi repo ============ */

function makeD1(migrationFiles) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  for (const f of migrationFiles) {
    // Komentar '--' dipotong sampai akhir baris: komentar sebaris yang memuat ';'
    // akan memotong CREATE TABLE di tengah kalau dibiarkan.
    const clean = fs.readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    for (const stmt of clean.split(';')) {
      const t = stmt.trim();
      if (!t) continue;
      try { db.exec(t); } catch (e) { throw new Error('migrasi gagal [' + path.basename(f) + ']: ' + e.message); }
    }
  }
  const norm = (v) => (v === undefined ? null : v);
  return {
    _raw: db,
    prepare(sql) {
      let params = [];
      const api = {
        bind(...a) { params = a.map(norm); return api; },
        async run() { return { success: true, meta: db.prepare(sql).run(...params) }; },
        async all() { return { results: db.prepare(sql).all(...params) }; },
        async first() { return db.prepare(sql).all(...params)[0] || null; }
      };
      return api;
    },
    async batch(list) { return Promise.all(list.map((s) => s.run())); }
  };
}

const MIGRATIONS = ['0001_quota.sql', '0005_ai_account_budget.sql']
  .map((f) => path.join(root, 'workers', 'api', 'migrations', f));

(async () => {
  let mod = null;
  try {
    mod = await import(require('url').pathToFileURL(legacyPath).href);
  } catch (e) {
    check('modul route-legacy.js bisa dimuat', false, e.message);
  }

  if (mod && typeof require('node:sqlite').DatabaseSync === 'function') {
    const handlerFor = (p) => {
      const row = mod.ROUTES.find(([, rp]) => rp === p);
      return row ? row[2] : null;
    };
    let aiCalls = 0;
    const makeEnv = (db, { flag = true, quotaStore = true } = {}) => ({
      FEATURE_AI: 'on',
      // KV dibaca dengan {type:'json'} -> harus OBJEK. String di sini membuat
      // readServerFlags menjawab kv_key_absent dan seluruh uji ini lulus karena
      // alasan yang salah (gerbangnya menolak semua).
      CFG: { get: async () => ({ flags: { cfAiEnabled: flag }, enabled: { ai: flag } }) },
      AI: { run: async () => { aiCalls++; return { response: 'JAWAB MODEL' }; } },
      // quotaDb() membaca CORE_DB || DB, jadi keduanya harus kosong untuk menguji
      // keadaan "store kuota tidak ada".
      CORE_DB: quotaStore ? db : null,
      DB: quotaStore ? db : null
    });
    const ctxFor = (env, body, { verified = true } = {}) => ({
      env,
      identity: verified ? { verified: true, sub: 'murid-uji-1' } : {},
      corsHeaders: {},
      now: Date.UTC(2026, 8, 13, 5, 0, 0),
      bodyText: JSON.stringify(body),
      request: new Request('https://uji.invalid/api/ai/chat', { method: 'POST' }),
      executionCtx: {}
    });
    const hit = async (p, ctx) => {
      const res = await handlerFor(p)(ctx);
      let body = {};
      try { body = await res.clone().json(); } catch { /* bukan JSON */ }
      return { status: res.status, body };
    };
    const quotaRow = (db) => db._raw.prepare('SELECT * FROM quota_daily').all()[0] || null;

    // (a) tanpa identitas -> 401 SEBELUM flag: keadaan otentikasi tidak boleh terbaca
    //     dari selisih 401/403.
    {
      const db = makeD1(MIGRATIONS); aiCalls = 0;
      const r = await hit('/api/ai/chat', ctxFor(makeEnv(db), { prompt: 'hai' }, { verified: false }));
      check('tanpa login -> 401', r.status === 401, 'status=' + r.status);
      check('tanpa login: model tidak disentuh', aiCalls === 0, 'panggilan=' + aiCalls);
    }

    // (b) flag AI mati -> 403 dan model TIDAK disentuh. Inilah "matikan AI" yang dulu
    //     tidak berlaku di jalur ini.
    {
      const db = makeD1(MIGRATIONS); aiCalls = 0;
      const r = await hit('/api/ai/chat', ctxFor(makeEnv(db, { flag: false }), { prompt: 'hai' }));
      check('flag AI mati -> 403', r.status === 403, 'status=' + r.status);
      check('flag AI mati: model tidak disentuh', aiCalls === 0, 'panggilan=' + aiCalls);
      check('flag AI mati: amplop ai_disabled', r.body && r.body.error === 'ai_disabled', JSON.stringify(r.body && r.body.error));
      check('flag AI mati: tidak menagih kuota murid', !quotaRow(db) || Number(quotaRow(db).ai_used) === 0,
        'kuota ditagih padahal permintaannya ditolak');
    }

    // (c) jalur normal: murid tetap dilayani, dan kuotanya naik tepat satu.
    {
      const db = makeD1(MIGRATIONS); aiCalls = 0;
      const r = await hit('/api/ai/chat', ctxFor(makeEnv(db), { prompt: 'hai' }));
      const row = quotaRow(db);
      check('jalur normal -> 200', r.status === 200, 'status=' + r.status);
      check('jalur normal: model dipanggil', aiCalls === 1, 'panggilan=' + aiCalls);
      check('jalur normal: jawaban model sampai ke murid', r.body && r.body.text === 'JAWAB MODEL', JSON.stringify(r.body && r.body.text));
      check('jalur normal: kuota ai naik jadi 1', row && Number(row.ai_used) === 1, JSON.stringify(row && row.ai_used));
      check('jalur normal: tidak ada reservasi menggantung (held=0)', row && Number(row.ai_held) === 0, 'held=' + (row && row.ai_held));
    }

    // (d) plafon harian murid benar-benar MENGIKAT, dan penolakannya tidak membelanjakan
    //     neuron. Angkanya dibaca dari quota-config.js, bukan ditulis ulang di sini.
    {
      const cfg = fs.readFileSync(path.join(root, 'workers', 'api', 'quota', 'quota-config.js'), 'utf8');
      const limAi = Number((cfg.match(/FREE_AI_DAILY_LIMIT:\s*(\d+)/) || [])[1]);
      check('batas harian ai terbaca dari quota-config.js', Number.isFinite(limAi) && limAi > 0, 'limAi=' + limAi);
      const db = makeD1(MIGRATIONS);
      const env = makeEnv(db);
      aiCalls = 0;
      for (let i = 0; i < limAi; i++) await hit('/api/ai/chat', ctxFor(env, { prompt: 'q' + i }));
      const dipakai = aiCalls;
      aiCalls = 0;
      const r = await hit('/api/ai/chat', ctxFor(env, { prompt: 'melewati batas' }));
      const row = quotaRow(db);
      check(limAi + ' permintaan pertama dilayani', dipakai === limAi, 'panggilan=' + dipakai);
      check('permintaan ke-' + (limAi + 1) + ' -> 429', r.status === 429, 'status=' + r.status);
      check('jatah habis: model TIDAK disentuh', aiCalls === 0, 'panggilan=' + aiCalls);
      check('jatah habis: amplop quota_exhausted', r.body && r.body.error === 'quota_exhausted', JSON.stringify(r.body && r.body.error));
      check('jatah habis: pemakaian berhenti tepat di batas', row && Number(row.ai_used) === limAi, 'used=' + (row && row.ai_used));
    }

    // (e) terjemahan memakai SUB-kuota: ia menaikkan aiTranslate DAN ai, jadi subtitle
    //     tidak bisa menghabiskan jatah penjelasan tutor.
    {
      const cfg = fs.readFileSync(path.join(root, 'workers', 'api', 'quota', 'quota-config.js'), 'utf8');
      const limTr = Number((cfg.match(/FREE_AI_TRANSLATE_DAILY:\s*(\d+)/) || [])[1]);
      check('batas harian terjemahan terbaca dari quota-config.js', Number.isFinite(limTr) && limTr > 0, 'limTr=' + limTr);
      const db = makeD1(MIGRATIONS);
      const env = makeEnv(db);
      aiCalls = 0;
      for (let i = 0; i < limTr; i++) await hit('/api/ai/translate', ctxFor(env, { text: 'hello ' + i, targetLocale: 'id' }));
      const dipakai = aiCalls;
      const r = await hit('/api/ai/translate', ctxFor(env, { text: 'melewati batas' }));
      const row = quotaRow(db);
      check(limTr + ' terjemahan pertama dilayani', dipakai === limTr, 'panggilan=' + dipakai);
      check('terjemahan ke-' + (limTr + 1) + ' -> 429', r.status === 429, 'status=' + r.status);
      check('terjemahan menaikkan ai JUGA (sub-kuota, bukan jatah tambahan)',
        row && Number(row.ai_used) === limTr, 'ai_used=' + (row && row.ai_used));
      check('aiTranslate berhenti di batasnya', row && Number(row.ai_translate_used) === limTr,
        'translate_used=' + (row && row.ai_translate_used));
    }

    // (f) tanpa store kuota -> 503 fail-CLOSED. Tidak bisa menghitung jatah berarti tidak
    //     boleh belanja; fail-open di sini mengubah kegagalan D1 menjadi tagihan.
    {
      const db = makeD1(MIGRATIONS); aiCalls = 0;
      const r = await hit('/api/ai/chat', ctxFor(makeEnv(db, { quotaStore: false }), { prompt: 'hai' }));
      check('tanpa store kuota -> 503 (fail-closed)', r.status === 503, 'status=' + r.status);
      check('tanpa store kuota: model tidak disentuh', aiCalls === 0, 'panggilan=' + aiCalls);
    }

    // (g) rute owner (bucket null): flag TETAP berlaku - neuronnya dari kolam yang sama -
    //     tetapi jatah MURID tidak ditagih.
    {
      const db = makeD1(MIGRATIONS); aiCalls = 0;
      const ownerRoute = listed.find((p) => tableSrc.includes("'" + p + "': null"));
      check('ada rute owner tanpa bucket untuk diperiksa', !!ownerRoute, 'tidak ada entri null di AI_SPEND_ROUTES');
      if (ownerRoute) {
        const rOff = await hit(ownerRoute, ctxFor(makeEnv(db, { flag: false }), { item: {} }));
        check('rute owner: flag mati tetap 403 (kolam neuron yang sama)', rOff.status === 403, 'status=' + rOff.status);
        check('rute owner: tidak menagih jatah murid', !quotaRow(db) || Number(quotaRow(db).ai_used) === 0,
          'ai_used=' + (quotaRow(db) && quotaRow(db).ai_used));

        // Rute owner TIDAK boleh dituntut identitas MURID oleh gerbang ini: otentikasinya
        // `isOwner()` (Authorization: Bearer + OWNER_TOKEN_HASH), bukan cookie sesi murid.
        // Kalau gerbang menjawab 401 lebih dulu, alat owner yang sah - yang memang tidak
        // punya sesi murid - berhenti bekerja, dan gerbangnya memutus alat tanpa
        // melindungi apa pun. Yang harus terjadi: permintaan MENCAPAI handler, lalu
        // handler-nya sendiri yang menolak 403 'forbidden' karena token owner tidak ada.
        const db2 = makeD1(MIGRATIONS);
        const rNoId = await hit(ownerRoute, ctxFor(makeEnv(db2), { item: {} }, { verified: false }));
        check('rute owner: gerbang TIDAK menuntut identitas murid (bukan 401)', rNoId.status !== 401,
          'gerbang menjawab 401; alat owner tanpa sesi murid akan patah');
        check('rute owner: penolakannya datang dari isOwner (403 forbidden)',
          rNoId.status === 403 && rNoId.body && rNoId.body.error === 'forbidden',
          'status=' + rNoId.status + ' error=' + JSON.stringify(rNoId.body && rNoId.body.error));

        // Kebalikannya untuk rute BERBUCKET: di sana identitas WAJIB, karena jatah murid
        // ditagih dan menagih subjek yang salah lebih buruk daripada menolak.
        const db3 = makeD1(MIGRATIONS);
        const rBucket = await hit('/api/ai/chat', ctxFor(makeEnv(db3), { prompt: 'hai' }, { verified: false }));
        check('rute berbucket: identitas TETAP wajib (401)', rBucket.status === 401, 'status=' + rBucket.status);
      }
    }
  } else if (mod) {
    // node:sqlite absen berarti bagian perilaku tidak terukur. Itu harus TERLIHAT,
    // bukan lulus diam-diam.
    check('node:sqlite tersedia untuk menguji SQL kuota sungguhan', false,
      'UTANG 2026-09-13: bagian perilaku gerbang ini tidak berjalan di runtime ini (butuh Node 22+ node:sqlite). Bagian statis tetap berjalan.');
  }

  for (const c of checks) if (!c.ok) console.error('  - ' + c.name + (c.details ? ' :: ' + c.details : ''));
  const lulus = checks.filter((c) => c.ok).length;
  if (failed) { console.error('FIEZEL gerbang belanja AI slot 5: FAIL (' + lulus + '/' + checks.length + ')'); process.exit(1); }
  console.log('FIEZEL gerbang belanja AI slot 5: PASS (' + lulus + '/' + checks.length + ')');
})();
