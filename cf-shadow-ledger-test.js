// cf-shadow-ledger-test.js — gerbang untuk TELEMETRI BAYANGAN (S2).
//
// Yang dijaga di sini adalah janji-janji yang, kalau runtuh, runtuhnya diam-diam: bukti
// bayangan yang membawa isi jawaban murid, ledger yang tumbuh tanpa batas di perangkat
// 32 GB, pembatas laju yang ternyata hanya mengurangi CATATAN dan bukan BEBAN, dan
// jawaban CF yang suatu hari bocor menjadi jawaban yang dilihat murid.
//
// Tujuh kebenaran, semuanya diuji dengan MENJALANKAN kode (vm), bukan mencocokkan teks:
//   (a) tidak ada field di luar allowlist yang bisa masuk ledger — prompt, teks murid, uuid,
//       email, IP, cookie disuntikkan dan dibuktikan tersaring, termasuk lewat nama endpoint
//       dan lewat nama kunci bentuk.
//   (b) perbandingan BENTUK mendeteksi kunci hilang dan tipe berbeda, tanpa menyimpan nilai.
//   (c) batas ukuran dan pemangkasan bekerja: agregat, bukan riwayat — 500 permintaan tidak
//       membuat ledger lebih besar daripada 50.
//   (d) pembatas laju bayangan bekerja pada BEBAN: yang ditolak tidak pernah menjadi fetch.
//       Termasuk berhenti total setelah N per sesi, offline, dan baterai lemah.
//   (e) jawaban CF tidak pernah dipakai sebagai jawaban murid, dan body jawaban Puter tidak
//       pernah dihabiskan (perbandingan bentuk hanya lewat clone) — juga tidak ditunda.
//   (f) ekspor teks tidak memuat PII.
//   (g) ledger tetap benar setelah reload: agregat yang sama, bukan riwayat, dan isi
//       penyimpanan yang sudah dirusak tangan disaring ulang saat dibaca.
//
// Nol dependency, nol jaringan, nol berkas temporer selain laporan. `fetch` di dalam vm
// adalah MOCK LOKAL (`fetchMock`, didefinisikan sebelum disuntikkan) — pola yang dikenali
// no-network-test.js. Penyimpanan adalah objek biasa di memori.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

/* =======================================================================================
 * Kegagalan harness harus BERBICARA, bukan meledak
 * =====================================================================================
 * Riwayat nyata (m032/F3): blok transport di app.js mulai meminta izin lapis kill switch,
 * harness ini tidak menyediakannya, mode jatuh ke 'off', tidak ada satu pun baris ledger
 * yang terbentuk — dan gerbang meledak sebagai
 *   `TypeError: Cannot read properties of undefined (reading 'match')`
 * di sebuah baris yang JAUH dari sebabnya. Assertnya sendiri sehat; yang rusak adalah
 * harness yang tidak berhasil merakit konteks lalu diam saja. Karena itu setiap titik
 * perakitan di bawah punya pesannya sendiri dan tetap menulis laporan.
 */
function tulisLaporan() {
  const report = {
    schema: 'fiezel-cf-shadow-ledger-v1',
    pass: !failed,
    counts: {
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length
    },
    checks
  };
  fs.writeFileSync(path.join(root, 'CF-SHADOW-LEDGER-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  for (const c of checks) console.log(`${c.status === 'PASS' ? 'ok  ' : 'FAIL'} ${c.name}${c.status === 'PASS' ? '' : ' — ' + c.details}`);
  console.log('');
  return report;
}

// Kegagalan perakitan: dicatat sebagai assert merah, dilaporkan dengan kalimat yang
// menyebut sebab DAN tempat memperbaikinya, lalu berhenti — bukan dibiarkan merambat
// menjadi TypeError beberapa ratus baris kemudian.
function gagalTotal(nama, pesan) {
  check(nama, false, pesan);
  const report = tulisLaporan();
  console.error(`FIEZEL cf-shadow-ledger gate: FAIL (perakitan harness) — ${pesan}`);
  console.error(`(${report.counts.fail} assert merah; ini kegagalan yang DIJELASKAN, bukan TypeError)`);
  process.exit(1);
}

/* Ekstraksi blok app.js: SENTINEL EKSPLISIT, bukan nomor baris dan bukan regex atas bentuk
 * kode di dalamnya. Bentuk isi blok boleh berubah sebebas apa pun (resolusi konflik,
 * penulisan ulang `renderAIResult`, blok baru disisipkan di atasnya) tanpa membuat gerbang
 * ini salah memotong; yang tidak boleh berubah hanyalah sepasang sentinelnya.
 * Fungsi ini MURNI: ia mengembalikan pesan galat, tidak melempar dan tidak keluar, supaya
 * pagarnya sendiri bisa diuji (lihat 'pagar ekstraksi' di bawah). */
function sliceBlock(source, name) {
  const begin = `/* ${name}-BEGIN`;
  const end = `/* ${name}-END */`;
  const src = String(source || '');
  const beginAt = src.indexOf(begin);
  const endAt = src.indexOf(end);
  if (beginAt < 0) return { name, code: '', beginAt, endAt, error: `sentinel "${begin}" tidak ditemukan di app.js — blok ${name} hilang atau sentinelnya diubah` };
  if (endAt < 0) return { name, code: '', beginAt, endAt, error: `sentinel "${end}" tidak ditemukan di app.js — blok ${name} tidak tertutup` };
  if (endAt <= beginAt) return { name, code: '', beginAt, endAt, error: `sentinel "${end}" mendahului "${begin}" di app.js (urutan blok ${name} rusak)` };
  const code = src.slice(beginAt, endAt);
  // "Ada" tidak cukup: blok yang isinya hanya sentinel dan komentar akan dijalankan tanpa
  // galat, memberi konteks HAMPA, dan membuat setiap assert perilaku di bawah lulus kosong
  // atau meledak sebagai TypeError. Jadi yang dihitung adalah KODE sesudah komentar kepala.
  const headerEnd = code.indexOf('*/');
  const body = (headerEnd >= 0 ? code.slice(headerEnd + 2) : code.slice(begin.length))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  if (body.trim().length === 0) {
    return { name, code: '', beginAt, endAt, error: `blok ${name} terpotong KOSONG di app.js: hanya sentinel/komentar, nol kode (begin=${beginAt} end=${endAt})` };
  }
  return { name, code, beginAt, endAt, error: '' };
}

// Pagar baris ledger. Juga MURNI: mengembalikan kalimat, bukan melempar.
function pesanBarisKosong(summary, label) {
  const rows = summary && Array.isArray(summary.rows) ? summary.rows : null;
  if (!rows) return `ringkasan ledger di ${label} tidak punya array \`rows\` (bentuk modul ledger berubah?)`;
  if (rows.length === 0) {
    return `ledger bayangan KOSONG di ${label}: nol baris terbentuk (observed=${summary.observed}). `
      + 'Rantai yang harus diperiksa, berurutan: (1) blok CF-TRANSPORT/CF-KILLSWITCH terpotong dari app.js, '
      + "(2) cfEndpointMode() mengembalikan 'shadow' dan bukan 'off' (izin FiezelCfKillSwitch!), "
      + '(3) fetch mock benar-benar terpanggil, (4) FiezelShadowLedger.observe() menulis. '
      + 'JANGAN melemahkan assert untuk membuat ini hijau.';
  }
  return '';
}

function barisPertama(summary, label) {
  const pesan = pesanBarisKosong(summary, label);
  if (pesan) gagalTotal(`Ledger bayangan menghasilkan baris di ${label}`, pesan);
  return summary.rows[0];
}

const LEDGER_FILE = 'features/cf-shadow/fiezel-shadow-ledger.js';
const ledgerSource = read(LEDGER_FILE);
const app = read('app.js');
const workflow = read('.github/workflows/quality.yml');

check('Gerbang ini terdaftar di quality.yml', workflow.includes('node cf-shadow-ledger-test.js'), 'quality.yml');

/* =======================================================================================
 * 0. Harness
 * ===================================================================================== */
// Penanda yang sengaja mencolok: kalau salah satu muncul di ledger, di ekspor, atau di
// penyimpanan, kebocorannya nyata dan bukan kebetulan kata umum.
const PII = {
  prompt: 'PROMPT-RAHASIA-XYZ',
  jawabanAi: 'JAWABAN-AI-RAHASIA-XYZ',
  teksMurid: 'TEKS-MURID-RAHASIA-XYZ',
  nama: 'NAMA-MURID-RAHASIA-XYZ',
  email: 'murid.rahasia.xyz@contoh.test',
  uuid: '11111111-2222-3333-4444-555555555555',
  ip: '203.0.113.77',
  cookie: 'sid=COOKIE-RAHASIA-XYZ'
};
const piiValues = Object.values(PII);
const bersih = (label, value, extra) => {
  const dump = typeof value === 'string' ? value : JSON.stringify(value === undefined ? null : value);
  const bocor = piiValues.filter(marker => dump.indexOf(marker) !== -1);
  check(label, bocor.length === 0, bocor.join(', ') || (extra || 'tidak ada penanda PII'));
};

function makeLedger(store) {
  const box = {
    console: { debug: () => {}, log: () => {}, warn: () => {}, error: () => {} },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    }
  };
  box.self = box;
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(ledgerSource, box, { filename: LEDGER_FILE });
  return box.FiezelShadowLedger;
}

const tick = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms));

/* =======================================================================================
 * (a) ALLOWLIST — bukan blacklist
 * ===================================================================================== */
const storeA = {};
const A = makeLedger(storeA);

check('(a) modul mengekspor allowlist field yang eksplisit (bukan daftar larangan)',
  Array.isArray(A.FIELD_ALLOWLIST) && A.FIELD_ALLOWLIST.length === 7
  && ['endpoint', 'puterStatus', 'cfStatus', 'puterMs', 'cfMs', 'shapeMatch', 'diffKeys']
    .every(f => A.FIELD_ALLOWLIST.includes(f)),
  JSON.stringify(A.FIELD_ALLOWLIST));

// Suntikan penuh: setiap kelas data terlarang sekaligus, plus field bernama mirip-allowlist
// (`endpointUrl`, `puterStatusText`) yang justru menjebak implementasi berbasis blacklist.
const suntikan = {
  endpoint: 'ai',
  puterStatus: 200,
  cfStatus: 200,
  puterMs: 120,
  cfMs: 95,
  shapeMatch: true,
  diffKeys: ['ok'],
  prompt: PII.prompt,
  promptText2: PII.prompt,
  answer: PII.jawabanAi,
  aiResponse: { text: PII.jawabanAi },
  studentText: PII.teksMurid,
  transcript: PII.teksMurid,
  userName: PII.nama,
  email: PII.email,
  uuid: PII.uuid,
  sessionId: PII.uuid,
  ip: PII.ip,
  cookie: PII.cookie,
  headers: { Authorization: 'Bearer ' + PII.cookie, Cookie: PII.cookie },
  endpointUrl: 'https://api.example.test/api/ai/chat?uid=' + PII.uuid,
  puterStatusText: PII.jawabanAi,
  body: JSON.stringify({ prompt: PII.prompt })
};
const clean = A.sanitizeInput(suntikan);
check('(a) hasil penyaringan hanya berisi field allowlist (+ hitungan tolakan)',
  Object.keys(clean).sort().join(',') === 'cfMs,cfStatus,diffKeys,dropped,endpoint,puterMs,puterStatus,shapeMatch',
  Object.keys(clean).sort().join(','));
check('(a) field di luar allowlist DIHITUNG, bukan disimpan (16 field ditolak)',
  clean.dropped === 16, String(clean.dropped));
bersih('(a) hasil penyaringan tidak memuat satu pun penanda PII', clean);

A.record(suntikan);
bersih('(a) isi penyimpanan setelah record tidak memuat satu pun penanda PII', storeA[A.STORAGE_KEY]);
bersih('(a) agregat yang dibaca kembali juga bersih', A.read());
check('(a) hitungan field tertolak ikut tercatat sebagai ANGKA (bukti penyaring bekerja, bukan diam)',
  A.summary().droppedFields === 16, String(A.summary().droppedFields));

// Nama endpoint: satu-satunya string bebas yang masuk, jadi ia disaring ke daftar tetap.
A.record({ endpoint: '/api/ai/chat?uid=' + PII.uuid, puterStatus: 200, cfStatus: 200 });
A.record({ endpoint: PII.nama, puterStatus: 200, cfStatus: 200 });
A.record({ endpoint: 'tts', puterStatus: 200, cfStatus: 200 });
const namaBaris = Object.keys(A.read().rows).sort().join(',');
check('(a) nama endpoint di luar daftar tetap runtuh jadi "unmapped" (path/uuid/nama mustahil masuk)',
  namaBaris === 'ai,tts,unmapped', namaBaris);
bersih('(a) penyimpanan tetap bersih setelah endpoint ber-uuid dan ber-nama disuntikkan', storeA[A.STORAGE_KEY]);

// Nama kunci bentuk: pengecualian sempit yang diizinkan (skema, bukan isi) — dan pengecualian
// itu sendiri dipagari, supaya teks bebas tidak bisa menyelundup lewat nama kunci.
A.record({ endpoint: 'ai', diffKeys: [PII.teksMurid + ' ' + PII.prompt, 'ok', PII.email], shapeMatch: false });
const kunciAi = Object.keys(A.read().rows.ai.diffKeys).sort().join(',');
check('(a) nama kunci yang bukan pengenal pendek diganti penanda netral',
  kunciAi.includes('ok') && kunciAi.includes('(kunci-tidak-baku)') && !kunciAi.includes('RAHASIA'), kunciAi);
bersih('(a) penyimpanan tetap bersih setelah nama kunci berisi teks murid', storeA[A.STORAGE_KEY]);

// Daftar larangan harus TERTULIS, karena orang berikutnya membaca komentar sebelum membaca kode.
const larangan = ['prompt', 'jawaban AI', 'murid', 'email', 'uuid', 'cookie', 'IP', 'allowlist'];
const hilang = larangan.filter(kata => ledgerSource.indexOf(kata) === -1);
check('(a) daftar larangan privasi tertulis sebagai komentar di modul', hilang.length === 0, hilang.join(', ') || '0');
check('(a) modul ledger tidak pernah membuka jaringan sendiri',
  !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(ledgerSource), 'cari fetch/XHR/beacon di modul');

/* =======================================================================================
 * (b) BENTUK, bukan isi
 * ===================================================================================== */
const storeB = {};
const B = makeLedger(storeB);

const kunciHilang = B.compareShapes(
  { ok: true, protocol: '1.7', data: { a: 1 }, quota: 5 },
  { ok: true, protocol: '1.7', data: { a: 1 } });
check('(b) kunci yang HILANG di CF terdeteksi dan namanya dicatat',
  kunciHilang.match === false && kunciHilang.diffKeys.join(',') === 'quota', JSON.stringify(kunciHilang));

const tipeBeda = B.compareShapes({ ok: true, quota: 5 }, { ok: 'true', quota: 5 });
check('(b) TIPE nilai yang berbeda terdeteksi walau kuncinya sama',
  tipeBeda.match === false && tipeBeda.diffKeys.join(',') === 'ok', JSON.stringify(tipeBeda));

const nullVsObj = B.compareShapes({ data: null }, { data: {} });
check('(b) null dibedakan dari object (beda yang berarti saat membaca jawaban API)',
  nullVsObj.match === false && nullVsObj.diffKeys.join(',') === 'data', JSON.stringify(nullVsObj));

const arrVsObj = B.compareShapes({ items: [] }, { items: {} });
check('(b) array dibedakan dari object', arrVsObj.match === false, JSON.stringify(arrVsObj));

const isiBeda = B.compareShapes(
  { ok: true, text: PII.jawabanAi, n: 1 },
  { ok: true, text: 'JAWABAN-CF-BERBEDA', n: 2 });
check('(b) NILAI yang berbeda dengan bentuk sama dinilai COCOK (yang dibandingkan bentuk, bukan isi)',
  isiBeda.match === true && isiBeda.diffKeys.length === 0, JSON.stringify(isiBeda));
bersih('(b) hasil perbandingan tidak membawa satu pun nilai', isiBeda);

const shape = B.shapeOf({ ok: true, text: PII.jawabanAi, n: 3, data: null, items: [1, 2] });
check('(b) shapeOf hanya memetakan kunci -> tipe',
  JSON.stringify(shape) === JSON.stringify({ data: 'null', items: 'array', n: 'number', ok: 'boolean', text: 'string' }),
  JSON.stringify(shape));
bersih('(b) shapeOf tidak menyalin nilai', shape);

B.record({ endpoint: 'ai', shapeMatch: isiBeda.match, diffKeys: isiBeda.diffKeys, puterStatus: 200, cfStatus: 200 });
B.record({ endpoint: 'ai', shapeMatch: kunciHilang.match, diffKeys: kunciHilang.diffKeys, puterStatus: 200, cfStatus: 500 });
B.record({ endpoint: 'ai', shapeMatch: null, puterStatus: 200, cfStatus: 0 });
const barisB = B.summary().rows.find(r => r.endpoint === 'ai');
check('(b) agregat memisahkan cocok / beda / tidak diketahui',
  barisB.n === 3 && barisB.match === 1 && barisB.diff === 1 && barisB.unknown === 1, JSON.stringify(barisB));
check('(b) kunci yang berbeda tersimpan dengan hitungannya (itu yang berguna saat memutuskan)',
  barisB.diffKeys.quota === 1, JSON.stringify(barisB.diffKeys));
check('(b) kegagalan CF terhitung, kegagalan Puter juga (status 0 = permintaan tidak sampai)',
  barisB.cfFail === 2 && barisB.puterFail === 0, `cfFail=${barisB.cfFail} puterFail=${barisB.puterFail}`);
bersih('(b) penyimpanan setelah tiga catatan bentuk tetap bersih', storeB[B.STORAGE_KEY]);

/* =======================================================================================
 * (c) BATAS UKURAN dan PEMANGKASAN — agregat, bukan riwayat
 * ===================================================================================== */
const storeC = {};
const C = makeLedger(storeC);
const eps = ['health', 'config', 'auth', 'quota', 'ai', 'tts', 'usage'];

for (let i = 0; i < 50; i++) {
  C.record({ endpoint: eps[i % eps.length], puterStatus: 200 + (i % 40), cfStatus: 400 + (i % 40), puterMs: 100 + i, cfMs: 80 + i, shapeMatch: i % 2 === 0, diffKeys: ['k' + i, 'ok'] });
}
const bytes50 = storeC[C.STORAGE_KEY].length;
for (let i = 50; i < 500; i++) {
  C.record({ endpoint: eps[i % eps.length], puterStatus: 200 + (i % 40), cfStatus: 400 + (i % 40), puterMs: 100 + i, cfMs: 80 + i, shapeMatch: i % 2 === 0, diffKeys: ['k' + i, 'ok'] });
}
const bytes500 = storeC[C.STORAGE_KEY].length;
for (let i = 500; i < 5000; i++) {
  C.record({ endpoint: eps[i % eps.length], puterStatus: 200 + (i % 40), cfStatus: 400 + (i % 40), puterMs: 100 + i, cfMs: 80 + i, shapeMatch: i % 2 === 0, diffKeys: ['k' + i, 'ok'] });
}
const bytes5000 = storeC[C.STORAGE_KEY].length;
// Riwayat mentah akan tumbuh ~100x antara 50 dan 5000 permintaan. Yang tumbuh di sini hanya
// JUMLAH DIGIT angka-angkanya, jadi selisihnya puluhan bita, bukan puluhan kilobita.
check('(c) 5000 permintaan hampir tidak lebih besar daripada 500 (agregat, bukan riwayat mentah)',
  bytes5000 <= bytes500 + 256 && bytes500 <= bytes50 * 1.4,
  `50=${bytes50}B, 500=${bytes500}B, 5000=${bytes5000}B`);
check('(c) ukuran penyimpanan di bawah pagar keras', bytes500 <= C.LIMITS.maxBytes,
  `${bytes500}B / ${C.LIMITS.maxBytes}B`);
check('(c) jumlah baris tidak bisa melewati jumlah endpoint yang mungkin',
  Object.keys(C.read().rows).length <= C.LIMITS.maxRows, String(Object.keys(C.read().rows).length));
const barisC = C.read().rows.ai;
check('(c) ember status per baris dibatasi dan sisanya DILIPAT ke "other" (bukan dibuang)',
  Object.keys(barisC.statusPuter).length <= C.LIMITS.maxStatusKeys + 1 && barisC.statusPuter.other > 0,
  JSON.stringify(barisC.statusPuter));
const emberJumlah = Object.values(barisC.statusPuter).reduce((a, b) => a + b, 0);
check('(c) hitungan di dalam ember status tetap menjumlah ke jumlah baris (tabel tidak berbohong)',
  emberJumlah === barisC.n, `ember=${emberJumlah} n=${barisC.n}`);
check('(c) nama kunci beda per baris dibatasi (+ satu ember "other")',
  Object.keys(barisC.diffKeys).length <= C.LIMITS.maxDiffKeys + 1, String(Object.keys(barisC.diffKeys).length));
check('(c) hitungan total tetap benar walau kuncinya dipangkas (5000 permintaan tercatat)',
  C.read().observed === 5000, String(C.read().observed));
const jumlahBaris = Object.values(C.read().rows).reduce((sum, r) => sum + r.n, 0);
check('(c) jumlah per-baris menjumlah ke total (tidak ada catatan yang hilang diam-diam)',
  jumlahBaris === 5000, String(jumlahBaris));
check('(c) tidak ada array riwayat per permintaan di dalam penyimpanan',
  !/\[\s*\{/.test(storeC[C.STORAGE_KEY]), 'ada array objek di penyimpanan = riwayat mentah');

// Pemangkasan backstop: penyimpanan yang sudah gendut (mis. dari versi lebih longgar, atau
// diedit tangan) harus dipangkas saat dibaca-tulis lagi, bukan diterima apa adanya.
const gendut = { schema: C.SCHEMA, updatedAt: 1, observed: 9, dropped: 0, pruned: 0, rows: {} };
for (const ep of eps.concat(['unmapped'])) {
  const row = { endpoint: ep, n: 5, shapeMatch: 1, shapeDiff: 1, shapeUnknown: 3, puterFail: 0, cfFail: 0, puterMsSum: 5, cfMsSum: 5, deltaMsSum: 0, statusPuter: {}, statusCf: {}, diffKeys: {} };
  for (let i = 0; i < 300; i++) row.diffKeys['kunci_panjang_sekali_' + i] = i;
  for (let i = 0; i < 300; i++) row.statusPuter[200 + i] = i;
  gendut.rows[ep] = row;
}
const storeD = {};
storeD[C.STORAGE_KEY] = JSON.stringify(gendut);
const D = makeLedger(storeD);
check('(c) penyimpanan gendut memang gendut sebelum diperbaiki (gerbang ini tidak lulus kosong)',
  storeD[C.STORAGE_KEY].length > C.LIMITS.maxBytes * 3, `${storeD[C.STORAGE_KEY].length}B`);
D.record({ endpoint: 'ai', puterStatus: 200, cfStatus: 200 });
check('(c) sesudah satu catatan berikutnya, penyimpanan sudah kembali di bawah pagar',
  storeD[C.STORAGE_KEY].length <= C.LIMITS.maxBytes, `${storeD[C.STORAGE_KEY].length}B / ${C.LIMITS.maxBytes}B`);
check('(c) bukti yang masih muat tetap terbaca sesudah dipangkas ke batas kunci',
  D.summary().rows.length > 0 && D.summary().rows.every(r => typeof r.n === 'number'),
  JSON.stringify(D.summary().rows.map(r => r.endpoint)));

// Pagar bita adalah lapis KEDUA, di belakang batas per-kunci. Supaya ia tidak jadi hiasan yang
// tak pernah dijalankan, di sini dibuat keadaan yang LOLOS semua batas per-kunci tetapi tetap
// melewati MAX_BYTES: delapan baris penuh dengan nama kunci sepanjang batas.
const nyaris = { schema: C.SCHEMA, updatedAt: 1, observed: 80, dropped: 0, pruned: 0, rows: {} };
for (const ep of eps.concat(['unmapped'])) {
  const row = { endpoint: ep, n: 10, shapeMatch: 3, shapeDiff: 4, shapeUnknown: 3, puterFail: 1, cfFail: 2, puterMsSum: 1234567, cfMsSum: 2345678, deltaMsSum: -111111, statusPuter: {}, statusCf: {}, diffKeys: {} };
  for (let i = 0; i < C.LIMITS.maxDiffKeys; i++) row.diffKeys['kunci_bentuk_yang_panjang_n' + (10 + i)] = 123456;
  for (let i = 0; i < C.LIMITS.maxStatusKeys; i++) row.statusPuter[200 + i] = 123456;
  for (let i = 0; i < C.LIMITS.maxStatusKeys; i++) row.statusCf[500 - i] = 123456;
  nyaris.rows[ep] = row;
}
const storeE = {};
storeE[C.STORAGE_KEY] = JSON.stringify(nyaris);
const Efit = makeLedger(storeE);
check('(c) keadaan uji ini memang LOLOS batas per-kunci tetapi melewati pagar bita',
  JSON.stringify(Efit.read()).length > C.LIMITS.maxBytes
  && Object.values(Efit.read().rows).every(r => Object.keys(r.diffKeys).length <= C.LIMITS.maxDiffKeys),
  `${JSON.stringify(Efit.read()).length}B > ${C.LIMITS.maxBytes}B`);
Efit.record({ endpoint: 'ai', puterStatus: 200, cfStatus: 200 });
check('(c) pagar bita memangkas sampai muat', storeE[C.STORAGE_KEY].length <= C.LIMITS.maxBytes,
  `${storeE[C.STORAGE_KEY].length}B / ${C.LIMITS.maxBytes}B`);
check('(c) pemangkasan diakui, bukan dilakukan diam-diam', Efit.summary().pruned > 0, String(Efit.summary().pruned));
check('(c) yang dibuang lebih dulu adalah nama kunci, bukan hitungan permintaan',
  Efit.summary().rows.length >= 1 && Efit.summary().rows.reduce((sum, r) => sum + r.n, 0) >= 80,
  JSON.stringify(Efit.summary().rows.map(r => `${r.endpoint}:${r.n}`)));

/* =======================================================================================
 * Harness transport: blok CF-TRANSPORT app.js + ledger di dalam satu konteks
 * ===================================================================================== */
// Dua blok, bukan satu: sejak m031 `cfEndpointMode()` di blok transport meminta izin lapis
// SERVER lewat `self.FiezelCfKillSwitch.allows(key)` dan gagal ke arah MATI kalau jawabannya
// bukan `true`. Harness ini karena itu menjalankan blok kill switch YANG ASLI dari app.js
// juga — bukan stub — supaya "bayangan mencatat" dibuktikan lewat rantai izin yang sama
// dengan produksi. Perilaku kill switch itu sendiri diuji cf-config-killswitch-test.js.
const killSlice = sliceBlock(app, 'CF-KILLSWITCH');
const transportSlice = sliceBlock(app, 'CF-TRANSPORT');
if (killSlice.error) gagalTotal('Blok kill switch bisa dipotong lewat sentinel CF-KILLSWITCH-BEGIN/END', killSlice.error);
if (transportSlice.error) gagalTotal('Blok transport bisa dipotong lewat sentinel CF-TRANSPORT-BEGIN/END', transportSlice.error);
check('Blok transport bisa dipotong lewat sentinel CF-TRANSPORT-BEGIN/END', true,
  `begin=${transportSlice.beginAt} end=${transportSlice.endAt} panjang=${transportSlice.code.length}`);
check('Blok kill switch bisa dipotong lewat sentinel CF-KILLSWITCH-BEGIN/END', true,
  `begin=${killSlice.beginAt} end=${killSlice.endAt} panjang=${killSlice.code.length}`);
check('Blok kill switch berada SEBELUM blok transport (izin harus ada saat transport dipakai)',
  killSlice.endAt < transportSlice.beginAt, `kill=${killSlice.beginAt}..${killSlice.endAt} transport=${transportSlice.beginAt}`);
const killBlock = killSlice.code;
const block = transportSlice.code;

// PAGAR EKSTRAKSI, diuji dan bukan diasumsikan: kalau app.js suatu hari kehilangan sentinel
// (blok dipindah, dihapus, atau namanya diubah saat resolusi konflik), gerbang ini harus
// berhenti dengan KALIMAT yang menyebut sentinelnya — bukan lolos dengan blok kosong dan
// bukan meledak sebagai TypeError di assert (e).
const appTanpaSentinel = app.split('/* CF-TRANSPORT-BEGIN').join('/* BLOK-DIPINDAH');
const gagalBegin = sliceBlock(appTanpaSentinel, 'CF-TRANSPORT');
const gagalKosong = sliceBlock('/* CF-TRANSPORT-BEGIN\n/* CF-TRANSPORT-END */', 'CF-TRANSPORT');
const gagalKomentar = sliceBlock('/* CF-TRANSPORT-BEGIN kepala */\n// hanya komentar\n/* CF-TRANSPORT-END */', 'CF-TRANSPORT');
const gagalUrutan = sliceBlock('/* CF-TRANSPORT-END */\nkode\n/* CF-TRANSPORT-BEGIN x', 'CF-TRANSPORT');
check('pagar ekstraksi: sentinel BEGIN hilang -> pesan jelas yang menyebut sentinelnya (bukan blok kosong yang lolos)',
  gagalBegin.code === '' && /CF-TRANSPORT-BEGIN/.test(gagalBegin.error) && !/undefined|Cannot read/.test(gagalBegin.error),
  gagalBegin.error);
check('pagar ekstraksi: blok yang terpotong KOSONG ditolak, tidak dijalankan sebagai konteks hampa',
  gagalKosong.code === '' && /KOSONG/.test(gagalKosong.error), gagalKosong.error);
check('pagar ekstraksi: blok yang hanya berisi komentar juga dihitung KOSONG (nol kode = nol bukti)',
  gagalKomentar.code === '' && /nol kode/.test(gagalKomentar.error), gagalKomentar.error);
check('pagar ekstraksi: sentinel END yang mendahului BEGIN dikenali sebagai urutan rusak',
  gagalUrutan.code === '' && /mendahului/.test(gagalUrutan.error), gagalUrutan.error);
check('pagar ekstraksi: app.js hari ini LOLOS pagar yang sama (pagarnya bukan hiasan)',
  transportSlice.error === '' && killSlice.error === '' && /async function coreWorkerExec\(/.test(block),
  `transport=${block.length}B kill=${killBlock.length}B`);
// Dan pagar baris ledger: ledger kosong harus berbunyi sebagai kalimat, bukan `rows[0]`
// yang undefined lalu TypeError. Diuji lewat fungsi murninya supaya gerbang tidak perlu mati.
const pesanKosong = pesanBarisKosong({ observed: 0, rows: [] }, '(uji-pagar)');
check('pagar ledger: nol baris menghasilkan pesan yang menyebut rantai yang harus diperiksa',
  /KOSONG/.test(pesanKosong) && /cfEndpointMode/.test(pesanKosong) && /fetch mock/.test(pesanKosong)
  && pesanBarisKosong({ observed: 1, rows: [{ endpoint: 'ai' }] }, '(uji-pagar)') === '',
  pesanKosong.slice(0, 80));

const CF_BASE_SYNTHETIC = 'https://api.fiezel.my.id';
const ALL_SHADOW = { health: 'shadow', config: 'shadow', auth: 'shadow', quota: 'shadow', ai: 'shadow', tts: 'shadow', usage: 'shadow' };

// MOCK LOKAL. Seluruh jawabannya dibuat di sini; ia tidak pernah meneruskan ke fetch global.
function makeTransport(options) {
  const opts = options || {};
  const store = {};
  const log = { cf: [], puter: [], debug: [], puterBodyReads: 0, cfBodyReads: 0, cloneReads: 0, idle: 0 };
  const bodyPuter = { ok: true, protocol: '1.7', text: PII.jawabanAi, prompt: PII.prompt, user: PII.nama };
  const bodyCf = Object.assign({}, opts.cfBody || { ok: true, protocol: '1.7', text: 'JAWABAN-CF', prompt: 'PROMPT-CF', user: 'USER-CF' });
  function makeResponse(kind, body) {
    const self_ = {
      ok: true,
      status: opts.status || 200,
      __from: kind,
      json: async () => { if (kind === 'puter') log.puterBodyReads++; else log.cfBodyReads++; return body; },
      clone: () => ({ json: async () => { log.cloneReads++; return body; } })
    };
    return self_;
  }
  const puterResponse = makeResponse('puter', bodyPuter);
  const cfResponse = makeResponse('cloudflare', bodyCf);
  const fetchMock = (url, init) => {
    log.cf.push({ url: String(url), options: init || {} });
    if (!opts.cfDelayMs) return Promise.resolve(cfResponse);
    return new Promise(resolve => setTimeout(() => resolve(cfResponse), opts.cfDelayMs));
  };
  const puter = {
    workers: {
      exec: (url, init) => { log.puter.push({ url: String(url), options: init }); return Promise.resolve(puterResponse); }
    }
  };
  const sandbox = {
    console: { debug: (...a) => log.debug.push(a.map(String).join(' ')), log: () => {}, warn: () => {}, error: () => {} },
    fetch: fetchMock,
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    CORE_WORKER_URL: 'https://fiezel-core.puter.work',
    awaitPuter: async () => puter
  };
  // Izin lapis SERVER, tanpa satu pun permintaan jaringan: cermin `sessionStorage` yang masih
  // segar dibaca blok kill switch saat blok itu dijalankan (`cfConfigBootOnce` -> mirror),
  // jadi statusnya langsung 'ok' dan `GET /api/config` tidak pernah ditembak. Isinya adalah
  // bentuk jawaban Worker apa adanya: protokol 1.7 + enam flag yang dikenal.
  const mirror = {
    v: 1, at: Date.now(), ttl: 60000,
    data: {
      protocol: '1.7',
      flags: {
        cfApiEnabled: true, cfAiEnabled: true, cfTtsEnabled: true,
        cfQuotaEnabled: true, cfAnalyticsEnabled: true, cfIdentityEnabled: true
      },
      enabled: { ai: true, tts: true, coach: true, analytics: true },
      ttlSeconds: 60
    }
  };
  const sessionData = {};
  if (opts.serverAllows !== false) sessionData['fiezel-cf-flags-mirror-v1'] = JSON.stringify(mirror);
  sandbox.sessionStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(sessionData, k) ? sessionData[k] : null),
    setItem: (k, v) => { sessionData[k] = String(v); },
    removeItem: k => { delete sessionData[k]; }
  };
  // DIREKAM, tidak dijalankan: kalau cermin di atas suatu hari ditolak, kill switch akan
  // menjadwalkan pengambil di sini. Angkanya di-assert = 0 di bawah, supaya "harness diam-diam
  // berjalan tanpa izin server" mustahil lolos.
  sandbox.requestIdleCallback = () => { log.idle++; return log.idle; };
  if (opts.navigator !== undefined) sandbox.navigator = opts.navigator;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.puter = puter;
  const cfg = Object.assign({ enabled: true, base: CF_BASE_SYNTHETIC, endpoints: Object.assign({}, ALL_SHADOW) }, opts.config || {});
  sandbox.FIEZEL_CF_CONFIG = cfg;
  vm.createContext(sandbox);
  if (opts.withLedger !== false) vm.runInContext(ledgerSource, sandbox, { filename: LEDGER_FILE });
  // Kedua blok dijalankan sebagai SATU skrip, urutan app.js: kill switch dulu (ia yang
  // memasang `self.FiezelCfKillSwitch`), transport sesudahnya.
  vm.runInContext(killBlock + '\n' + block
    + '\n;globalThis.__cf={coreWorkerExec,cfEndpointMode,cfShadowPolicy,cfMergedMode,cfServerAllows};',
    sandbox, { filename: 'app.js#cf-killswitch+cf-transport' });
  return { api: sandbox.__cf, log, store, puterResponse, cfResponse, ledger: sandbox.FiezelShadowLedger, sandbox, sessionData };
}

(async () => {
  /* ===================================================================================
   * (d) PEMBATAS LAJU — pada beban, bukan pada catatan
   * ================================================================================= */
  const T = makeTransport({ config: { shadow: { minGapMs: 120, maxPerSession: 3 } } });
  // Perakitan dulu, perilaku kemudian. Kalau mode ternyata 'off', seluruh (d) dan (e) akan
  // "lulus kosong" atau meledak jauh di bawah — persis kegagalan senyap yang F3 perbaiki.
  check('mode bayangan BENAR-BENAR aktif di harness (izin statis DAN izin kill switch server lolos)',
    T.api.cfEndpointMode('/api/ai/chat') === 'shadow' && T.api.cfServerAllows('ai') === true,
    `mode=${T.api.cfEndpointMode('/api/ai/chat')} serverAllows=${T.api.cfServerAllows('ai')}`);
  check('izin server datang dari cermin sessionStorage, bukan dari permintaan jaringan',
    T.log.idle === 0 && T.log.cf.length === 0, `idle=${T.log.idle} fetch=${T.log.cf.length}`);
  // Dan pagar arah lain: tanpa izin server, bayangan MATI — gerbang ini tidak boleh hijau
  // karena harness memaksa jalur CF hidup tanpa pengawas.
  const tanpaIzin = makeTransport({ serverAllows: false });
  await tanpaIzin.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' });
  await tick(20);
  check('tanpa izin lapis server, bayangan mati total dan murid tetap dilayani Puter',
    tanpaIzin.api.cfEndpointMode('/api/ai/chat') === 'off' && tanpaIzin.log.cf.length === 0
    && tanpaIzin.log.puter.length === 1 && tanpaIzin.ledger.summary().rows.length === 0,
    `mode=${tanpaIzin.api.cfEndpointMode('/api/ai/chat')} fetch=${tanpaIzin.log.cf.length} baris=${tanpaIzin.ledger.summary().rows.length}`);
  check('(d) batas dibaca dari FIEZEL_CF_CONFIG.shadow dan bukan angka mati',
    T.api.cfShadowPolicy().minGapMs === 120 && T.api.cfShadowPolicy().maxPerSession === 3,
    JSON.stringify(T.api.cfShadowPolicy()));

  const answers = [];
  for (let i = 0; i < 5; i++) answers.push(await T.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' }));
  await tick(30);
  check('(d) lima panggilan berdekatan -> TEPAT satu permintaan bayangan (yang ditolak tidak pernah jadi fetch)',
    T.log.cf.length === 1, `fetch=${T.log.cf.length}`);
  check('(d) kelima jawaban murid tetap dilayani Puter semuanya (pembatas tidak menyentuh murid)',
    T.log.puter.length === 5 && answers.every(a => a === T.puterResponse), `puter=${T.log.puter.length}`);
  check('(d) penolakan tercatat sebagai alasan di konsol diagnostik, bukan hilang tanpa jejak',
    T.log.debug.filter(l => l.includes('rate')).length === 4, T.log.debug.join(' | '));

  await tick(140);
  await T.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' });
  await tick(20);
  check('(d) sesudah jeda minimum terlewati, satu bayangan lagi boleh terkirim',
    T.log.cf.length === 2, `fetch=${T.log.cf.length}`);
  await tick(140);
  await T.api.coreWorkerExec('/api/tts/say', { method: 'POST', body: '{}' });
  await tick(140);
  await T.api.coreWorkerExec('/api/quota/state', { method: 'POST', body: '{}' });
  await tick(140);
  await T.api.coreWorkerExec('/api/quota/state', { method: 'POST', body: '{}' });
  await tick(20);
  check('(d) berhenti TOTAL setelah N per sesi, walau jeda sudah cukup',
    T.log.cf.length === 3 && T.api.cfShadowPolicy().sent === 3, `fetch=${T.log.cf.length}`);
  check('(d) sesudah batas sesi, alasannya "session-cap" (bukan diam-diam berhenti)',
    T.log.debug.some(l => l.includes('session-cap')), T.log.debug.slice(-3).join(' | '));

  const dflt = makeTransport({});
  check('(d) tanpa FIEZEL_CF_CONFIG.shadow, nilai bawaan konservatif berlaku (1 per 3 detik, 40 per sesi)',
    dflt.api.cfShadowPolicy().minGapMs === 3000 && dflt.api.cfShadowPolicy().maxPerSession === 40,
    JSON.stringify(dflt.api.cfShadowPolicy()));
  const gila = makeTransport({ config: { shadow: { minGapMs: 1, maxPerSession: 9999999 } } });
  check('(d) nilai flag yang gila dikurung ke rentang aman, bukan dipatuhi',
    gila.api.cfShadowPolicy().minGapMs === 50 && gila.api.cfShadowPolicy().maxPerSession === 10000,
    JSON.stringify(gila.api.cfShadowPolicy()));

  const offline = makeTransport({ navigator: { onLine: false } });
  const offlineAnswer = await offline.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  await tick(20);
  check('(d) perangkat offline -> NOL permintaan bayangan, jawaban murid tetap jalan',
    offline.log.cf.length === 0 && offlineAnswer === offline.puterResponse && offline.log.puter.length === 1,
    `fetch=${offline.log.cf.length} puter=${offline.log.puter.length}`);

  const lemah = makeTransport({
    navigator: { onLine: true, getBattery: () => Promise.resolve({ charging: false, level: 0.11 }) }
  });
  await tick(10); // Battery API menjawab lewat Promise; keadaan terakhir yang diketahui yang dipakai
  await lemah.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  await tick(20);
  check('(d) baterai lemah dan tidak sedang mengisi -> bayangan mati sendiri',
    lemah.log.cf.length === 0 && lemah.log.debug.some(l => l.includes('battery-low')),
    `fetch=${lemah.log.cf.length} ${lemah.log.debug.join(' | ')}`);

  const mengisi = makeTransport({
    navigator: { onLine: true, getBattery: () => Promise.resolve({ charging: true, level: 0.05 }) }
  });
  await tick(10);
  await mengisi.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  await tick(20);
  check('(d) baterai rendah TAPI sedang mengisi tetap boleh (anti-vakum: pagarnya bukan "selalu mati")',
    mengisi.log.cf.length === 1, `fetch=${mengisi.log.cf.length}`);

  const tanpaApi = makeTransport({ navigator: { onLine: true } });
  await tanpaApi.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  await tick(20);
  check('(d) perangkat tanpa Battery API (iOS) tidak diblokir oleh syarat yang tidak bisa dijawab',
    tanpaApi.log.cf.length === 1, `fetch=${tanpaApi.log.cf.length}`);

  /* ===================================================================================
   * (e) JAWABAN CF TIDAK PERNAH JADI JAWABAN MURID — dan tidak pernah menunda
   * ================================================================================= */
  const E = makeTransport({ cfDelayMs: 120 });
  const started = Date.now();
  const eAnswer = await E.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' });
  const elapsed = Date.now() - started;
  check('(e) jawaban yang dikembalikan adalah objek respons PUTER, bukan CF',
    eAnswer === E.puterResponse && eAnswer !== E.cfResponse, String(eAnswer && eAnswer.__from));
  check('(e) jawaban Puter TIDAK ditunda menunggu bayangan (CF sengaja dibuat lambat 120ms)',
    elapsed < 60, `${elapsed}ms`);
  check('(e) body jawaban Puter belum tersentuh saat dikembalikan ke pemanggil',
    E.log.puterBodyReads === 0, String(E.log.puterBodyReads));
  await tick(200);
  check('(e) sesudah bayangan selesai, body ASLI jawaban Puter tetap tidak pernah dihabiskan',
    E.log.puterBodyReads === 0 && E.log.cfBodyReads === 0, `puter=${E.log.puterBodyReads} cf=${E.log.cfBodyReads}`);
  check('(e) perbandingan bentuk memang berjalan, dan HANYA lewat clone()',
    E.log.cloneReads === 2, `clone=${E.log.cloneReads}`);
  const eLedger = E.ledger.summary();
  const eRow = barisPertama(eLedger, '(e) bayangan nyata lewat blok transport app.js');
  check('(e) bukti bayangan benar-benar terkumpul (bukan gerbang yang lulus kosong)',
    eLedger.observed === 1 && eLedger.rows.length === 1 && eRow.endpoint === 'ai',
    JSON.stringify(eLedger.rows));
  check('(e) bentuk jawaban Puter vs CF dinilai COCOK padahal isinya beda jauh',
    eRow.match === 1 && eRow.diff === 0, JSON.stringify(eRow));
  bersih('(e) isi penyimpanan sesudah bayangan nyata tidak memuat isi jawaban', E.store[E.ledger.STORAGE_KEY]);
  check('(e) latensi kedua sisi tercatat sebagai angka',
    Number.isFinite(eRow.puterAvgMs) && eRow.cfAvgMs >= 100,
    `puter=${eRow.puterAvgMs}ms cf=${eRow.cfAvgMs}ms`);

  // Bentuk yang BERBEDA harus terdeteksi lewat jalur nyata, bukan hanya lewat unit compareShapes.
  const F = makeTransport({ cfBody: { ok: true, protocol: 1.7, text: 'JAWABAN-CF' } });
  await F.api.coreWorkerExec('/api/ai/chat', { method: 'POST', body: '{}' });
  await tick(40);
  const fRow = barisPertama(F.ledger.summary(), '(e) bentuk CF yang berbeda');
  check('(e) bentuk berbeda pada jalur nyata terdeteksi, dan kunci yang beda dinamai',
    fRow.diff === 1 && Object.keys(fRow.diffKeys).sort().join(',') === 'prompt,protocol,user',
    JSON.stringify(fRow.diffKeys));
  bersih('(e) walau bentuk berbeda, tidak ada satu pun nilai yang tersimpan', F.store[F.ledger.STORAGE_KEY]);

  // Respons tanpa clone(): perbandingan DILEWATI, bukan dipaksakan dengan menghabiskan body.
  const G = makeTransport({});
  const noClone = { ok: true, status: 200, json: async () => { G.log.cfBodyReads++; return {}; } };
  const shapeSkipped = await G.ledger.observe({ endpoint: 'ai', puterStatus: 200, cfStatus: 200, puterMs: 10, cfMs: 12, puterResponse: noClone, cfResponse: noClone });
  check('(e) respons tanpa clone() -> bentuk dicatat "tidak diketahui", body tidak dibaca',
    shapeSkipped.rows.ai.shapeUnknown === 1 && G.log.cfBodyReads === 0,
    `unknown=${shapeSkipped.rows.ai.shapeUnknown} reads=${G.log.cfBodyReads}`);

  /* ===================================================================================
   * (f) EKSPOR tanpa PII
   * ================================================================================= */
  const teks = A.exportText();
  bersih('(f) ekspor teks tidak memuat satu pun penanda PII', teks);
  check('(f) ekspor memuat tabel per endpoint yang bisa dibaca manusia',
    teks.includes('endpoint') && teks.includes('cocok') && teks.includes('ai') && teks.includes('puterMs'),
    teks.split('\n')[4] || '(kosong)');
  check('(f) ekspor menyatakan jaminan privasinya sendiri di badan teksnya',
    /TANPA PII/.test(teks) && /uuid/.test(teks) && /cookie/.test(teks), teks.split('\n')[2] || '(kosong)');
  check('(f) ekspor membawa hitungan field yang ditolak allowlist (angka, bukan namanya)',
    /field ditolak allowlist: \d+/.test(teks), teks.split('\n')[1] || '(kosong)');
  const teksE = E.ledger.exportText();
  bersih('(f) ekspor sesudah bayangan nyata (jawaban AI asli lewat) tetap bersih', teksE);
  const kosong = makeLedger({}).exportText();
  check('(f) ekspor pada ledger kosong tetap kalimat yang bisa dibaca, bukan tabel kosong yang membingungkan',
    kosong.includes('belum ada permintaan bayangan'), kosong.split('\n').slice(-1)[0]);

  /* ===================================================================================
   * (g) RELOAD — agregat, bukan riwayat
   * ================================================================================= */
  const sebelum = JSON.stringify(C.summary());
  const R = makeLedger(storeC);                 // konteks BARU, penyimpanan yang sama = reload
  const sesudah = JSON.stringify(R.summary());
  check('(g) sesudah reload, ringkasan identik (agregat selamat, bukan dihitung ulang dari riwayat)',
    sebelum === sesudah, `${sebelum.length}B vs ${sesudah.length}B`);
  R.record({ endpoint: 'ai', puterStatus: 200, cfStatus: 200, puterMs: 10, cfMs: 10, shapeMatch: true });
  check('(g) catatan sesudah reload MENAMBAH agregat lama, bukan memulai dari nol',
    R.read().observed === 5001, String(R.read().observed));

  // Isi penyimpanan tidak dipercaya: ia bisa diedit tangan (panel diagnostik, DevTools, backup).
  const storeRusak = {};
  storeRusak[A.STORAGE_KEY] = JSON.stringify({
    schema: A.SCHEMA, updatedAt: 'kemarin', observed: -5, dropped: 'banyak', pruned: null,
    rows: {
      ai: { endpoint: 'ai', n: 'tiga', shapeMatch: 2, prompt: PII.prompt, transcript: PII.teksMurid, statusPuter: { 200: 2, [PII.uuid]: 9 }, diffKeys: { ok: 1, [PII.teksMurid]: 3 } },
      '/api/ai/chat?u=1': { n: 99 },
      [PII.email]: { n: 99 }
    }
  });
  const S = makeLedger(storeRusak);
  const pulih = S.read();
  bersih('(g) penyimpanan yang dirusak tangan disaring ulang saat dibaca', pulih);
  check('(g) baris ber-nama asing tidak diterima saat reload',
    Object.keys(pulih.rows).join(',') === 'ai', Object.keys(pulih.rows).join(','));
  check('(g) angka rusak jatuh ke nol, bukan NaN yang menular ke seluruh tabel',
    pulih.rows.ai.n === 0 && pulih.observed === 0 && pulih.dropped === 0,
    JSON.stringify({ n: pulih.rows.ai.n, observed: pulih.observed }));
  check('(g) field asing di dalam baris tersimpan tidak ikut hidup kembali',
    !('prompt' in pulih.rows.ai) && !('transcript' in pulih.rows.ai), Object.keys(pulih.rows.ai).join(','));
  S.record({ endpoint: 'ai', puterStatus: 200, cfStatus: 200 });
  bersih('(g) sesudah ditulis ulang, penyimpanan bersih dari PII yang tadinya ada di sana', storeRusak[A.STORAGE_KEY]);
  const skemaLain = {};
  skemaLain[A.STORAGE_KEY] = JSON.stringify({ schema: 'ledger-versi-lain', rows: { ai: { n: 7 } } });
  check('(g) skema yang tidak dikenali dibuang, bukan ditafsirkan',
    makeLedger(skemaLain).read().observed === 0 && Object.keys(makeLedger(skemaLain).read().rows).length === 0,
    JSON.stringify(makeLedger(skemaLain).read()));
  check('(g) isi penyimpanan yang bukan JSON tidak membuat modul meledak',
    (() => { const bad = {}; bad[A.STORAGE_KEY] = '{bukan json'; return makeLedger(bad).read().observed === 0; })(), 'JSON rusak');

  /* ================================================================================= */
  const report = tulisLaporan();
  if (failed) {
    console.log(`FIEZEL cf-shadow-ledger gate: FAIL (${report.counts.fail} assert merah)`);
    process.exitCode = 1;
  } else {
    console.log(`FIEZEL cf-shadow-ledger gate: PASS (${report.counts.pass} assert)`);
  }
})().catch(error => {
  // Jaring terakhir. Yang bisa diramalkan sudah dijelaskan oleh `gagalTotal`; sisanya tetap
  // dilaporkan sebagai assert merah supaya laporan JSON tidak pernah kosong saat merah.
  check('Harness berjalan sampai akhir tanpa melempar', false,
    `${error && error.name}: ${error && error.message}`);
  tulisLaporan();
  console.error(`FIEZEL cf-shadow-ledger gate: FAIL (harness melempar) — ${error && error.message}`);
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
