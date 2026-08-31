/**
 * FIEZEL gerbang — ANTREAN BUKTI OPSIONAL (Fase 2 / Phase M).
 *
 * Brief Fase M: "kalau pengumpulan bukti sisi server SUDAH ADA, verifikasi
 * LOCAL EVIDENCE -> QUEUE -> BATCH -> UPLOAD, dan kalau unggahan GAGAL: BELAJAR TETAP JALAN."
 *
 * IA SUDAH ADA. `features/analytics/fiezel-analytics-client.js` persis berbentuk itu, dan
 * sudah dijaga `analytics-client-test.js` dengan 190 assert soal privasi, daftar hitam event,
 * dan token. Gerbang ini TIDAK mengulanginya — lihat AUDIT/08 soal kenapa dua gerbang di atas
 * lapisan yang sama akan berselisih suatu hari.
 *
 * Yang DITAMBAHKAN di sini hanya satu hal, dan justru itu yang tidak dijaga siapa pun:
 * kalau unggahan bukti GAGAL — jaringan mati, server 500, kuota habis, transport tidak ada
 * sama sekali — apakah BRAINCORE tetap mengambil keputusan belajar yang sama?
 *
 * Pertanyaannya bukan "apakah antreannya tabah", melainkan "apakah belajar bergantung
 * padanya". Sebuah antrean boleh gagal sesukanya; yang tidak boleh adalah murid berhenti
 * belajar karenanya.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const P = require('./braincore-pipeline.js');
const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const Q = {
  id: 'q-antrean-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
};

/** Satu sesi belajar; mengembalikan deret keputusan + keadaan akhir. */
function sesiBelajar() {
  let L = P.createLearner({ level: 'A2', now: T0 });
  const keputusan = [];
  for (let i = 0; i < 12; i++) {
    const t = T0 + (i + 1) * DAY;
    if (i % 4 === 0) L = P.newSession(L, t);
    const r = P.answer(L, Q, { correct: i % 3 !== 0, ms: 7000 }, t);
    L = r.learner;
    keputusan.push(r.trace.decision + ':' + r.trace.decisionReason);
  }
  return { keputusan, mastery: L.bkt, guard: 0 };
}

/* ========================================================================================
 * §1 — BENTUK ANTREANNYA MEMANG local -> queue -> batch -> upload
 * ===================================================================================== */
test('§1 antrean bukti sudah ada, dan bentuknya sesuai brief Fase M', () => {
  const p = path.join(__dirname, 'features', 'analytics', 'fiezel-analytics-client.js');
  assert.ok(fs.existsSync(p), 'modul klien analytics tidak ada — brief Fase M tidak berlaku');
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(/antrean|queue/i.test(src), 'tidak ada antrean lokal');
  assert.ok(/flush/.test(src), 'tidak ada pengiriman berkelompok');
  assert.ok(/berkelompok|batch/i.test(src), 'pengiriman tidak berkelompok — brief melarang per-interaksi');
});

test('§1 dijaga gerbangnya sendiri, dan gerbang INI tidak mengulanginya', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node analytics-client-test.js') !== -1,
    'gerbang privasi/antrean analytics tidak terdaftar — properti itu tidak dijaga siapa pun');
  // Pemeriksaan "tidak mengulang" harus dilakukan pada KETERGANTUNGAN, bukan pada kata.
  // Versi pertama meng-grep sumber gerbang ini sendiri untuk kata 'visitor_token' — dan cocok
  // dengan pesan assert-nya sendiri. Sebuah gerbang yang gagal karena membaca dirinya sendiri
  // menguji ejaan, bukan perilaku.
  const sendiri = fs.readFileSync(path.join(__dirname, 'braincore-evidence-queue-test.js'), 'utf8');
  assert.ok(!/require\([^)]*analytics/.test(sendiri),
    'gerbang ini memuat modul analytics — ia sudah masuk wilayah analytics-client-test.js');
});

/* ========================================================================================
 * §2 — BELAJAR TIDAK BERGANTUNG PADA UNGGAHAN. Ini inti Fase M.
 *
 * Diuji dengan cara yang tidak bisa dielakkan: jalankan sesi belajar yang SAMA di empat dunia
 * berbeda — normal, jaringan mati, server 500, transport tidak ada sama sekali — dan tuntut
 * keputusannya IDENTIK. Bukan "tetap ada keputusan": identik. Kalau kegagalan unggah menggeser
 * satu keputusan saja, berarti belajar sudah membaca keadaan jaringan.
 * ===================================================================================== */
function jalankanDiDunia(rusak) {
  const asli = { fetch: global.fetch, XMLHttpRequest: global.XMLHttpRequest, navigator: global.navigator };
  try {
    if (rusak === 'jaringan_mati') {
      global.fetch = () => Promise.reject(new Error('offline'));
    } else if (rusak === 'server_500') {
      global.fetch = () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
    } else if (rusak === 'tanpa_transport') {
      delete global.fetch; delete global.XMLHttpRequest;
    }
    return sesiBelajar();
  } finally {
    if (asli.fetch === undefined) delete global.fetch; else global.fetch = asli.fetch;
    if (asli.XMLHttpRequest === undefined) delete global.XMLHttpRequest; else global.XMLHttpRequest = asli.XMLHttpRequest;
    if (asli.navigator === undefined) delete global.navigator; else global.navigator = asli.navigator;
  }
}

test('§2 keputusan belajar IDENTIK saat jaringan mati, server 500, dan tanpa transport', () => {
  const normal = jalankanDiDunia('normal');
  for (const rusak of ['jaringan_mati', 'server_500', 'tanpa_transport']) {
    const hasil = jalankanDiDunia(rusak);
    assert.deepStrictEqual(hasil.keputusan, normal.keputusan,
      'keputusan belajar BERUBAH di dunia "' + rusak + '" — belajar sudah membaca keadaan jaringan');
  }
  assert.ok(normal.keputusan.length === 12, 'sesi tidak selesai');
});

test('§2 keadaan murid tetap terakumulasi walau unggahan mustahil', () => {
  const hasil = jalankanDiDunia('tanpa_transport');
  const BKT = require('./features/brain/fiezel-mastery-bkt.js');
  const m = BKT.mastery(hasil.mastery, 'past-simple');
  assert.strictEqual(m.n, 12, 'bukti murid tidak tersimpan tanpa transport — belajar ikut mati');
  assert.ok(m.L > 0, 'mastery tidak bergerak tanpa transport');
});

/* ========================================================================================
 * §3 — BRAINCORE TIDAK PUNYA JALAN MENUNGGU UNGGAHAN
 * ===================================================================================== */
test('§3 Braincore TIDAK PUNYA asinkroni — jadi ia tidak bisa menunggu unggahan', () => {
  // KENAPA BUKAN DAFTAR KATA. Versi pertama assert ini mencari kata 'queue', 'retry', 'flush'
  // di dalam modul Braincore, dan menemukan empat "pelanggaran" yang seluruhnya PALSU:
  // `queue` adalah antrean BFS untuk menelusuri graf prasyarat, `retryCount` adalah MURID yang
  // mengulang soal. Kata yang sama, wilayah makna yang sama sekali berbeda.
  //
  // Itu persis cacat yang berulang kali saya temukan di tempat lain: menguji TEKS, bukan
  // PERILAKU. Yang di bawah menguji sifat STRUKTURAL — tanpa Promise, tanpa async, tanpa
  // callback tertunda, sebuah modul TIDAK BISA menunggu jaringan, apa pun nama variabelnya.
  const dir = path.join(__dirname, 'features', 'brain');
  const tersangka = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const t of ['Promise', 'async ', 'await ', 'setTimeout', 'setInterval', 'requestAnimationFrame']) {
      if (src.indexOf(t) !== -1) tersangka.push(f + ' -> ' + t.trim());
    }
  }
  assert.deepStrictEqual(tersangka, [],
    'modul Braincore memperoleh asinkroni — sekarang ia BISA menunggu jaringan: ' + tersangka.join(', '));
});

test('§3 pipeline tidak async — ia tidak BISA menunggu jaringan', () => {
  // Sifat struktural, dan itu yang membuatnya kuat: `answer()` sinkron, jadi tidak ada tempat
  // untuk `await unggah()` diselipkan tanpa mengubah tanda tangan setiap pemanggilnya.
  const src = fs.readFileSync(path.join(__dirname, 'braincore-pipeline.js'), 'utf8');
  assert.ok(!/async\s+function\s+answer/.test(src), 'answer() menjadi async — ia bisa menunggu jaringan sekarang');
  assert.ok(!/\bawait\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'pipeline memakai await');
});

test('§3 terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-evidence-queue-test.js') !== -1, 'gerbang ini tidak terdaftar');
});

console.log(failures === 0 ? 'BraincoreEvidenceQueue: PASS' : 'BraincoreEvidenceQueue: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
