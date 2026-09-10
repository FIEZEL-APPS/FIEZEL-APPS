/**
 * Gerbang uji STATIS wiring telemetri belajar di app.js (Gelombang 4, Lane B).
 *
 * Kenapa statis, bukan runtime: app.js adalah skrip browser 8000+ baris yang mem-boot DOM;
 * memuatnya utuh di Node berarti menguji shim, bukan wiring. Janji yang harus dibuktikan di
 * sini justru janji BENTUK KODE yang bisa dibaca langsung dari sumbernya:
 *   1. cabang mode 'off' (default rilis ini) keluar SEBELUM kerja apa pun — nol alokasi,
 *      nol storage, nol builder;
 *   2. tidak ada satu pun pemanggilan telemetri tanpa guard availability (pola
 *      coreBrainAvailable): modul absen = fungsi diam;
 *   3. TIDAK ADA installId / ID stabil / timestamp presisi di pembangun payload;
 *   4. emisi hanya OBSERVASI: nilai kembaliannya tidak dibaca, pemanggilnya terbungkus
 *      try/catch, dan tidak ada state belajar yang ditulis dari jalur telemetri.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');

let okCount = 0;
function ok(msg) { okCount++; console.log('ok - ' + msg); }

/** Ambil sumber satu deklarasi fungsi top-level dengan pencocokan kurung kurawal. */
function extractFunction(name) {
  const sig = 'function ' + name + '(';
  const start = SRC.indexOf(sig);
  assert.ok(start !== -1, 'fungsi ' + name + ' harus ada di app.js');
  const bodyStart = SRC.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < SRC.length; i++) {
    const c = SRC[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return SRC.slice(start, i + 1); }
  }
  throw new Error('kurung fungsi ' + name + ' tidak seimbang');
}

/* ------------------------------------------------------------------ */
/* 1. Cabang 'off' keluar duluan — sebelum kerja APA PUN.               */
/* ------------------------------------------------------------------ */
const emit = extractFunction('learningTelemetryEmitAnswer');

// Buang komentar supaya yang diaudit adalah KODE, bukan penjelasannya.
const emitCode = emit.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const offIdx = emitCode.indexOf("if(learningTelemetryMode()==='off')return;");
assert.ok(offIdx !== -1, "cabang keluar mode 'off' harus ada dan berbentuk early-return");

// Semua "kerja" (alokasi objek payload, builder, antrean, storage, waktu) WAJIB berada
// SETELAH cabang 'off'. Kalau salah satunya muncul lebih dulu, mode default membayar biaya.
for (const work of ['FiezelLearningEvents', 'FiezelLearningQueue', 'learningTelemetryQueue(',
  'buildEvent', 'indexedDB', 'localStorage', 'Date.now', 'payload', 'studyDay']) {
  const idx = emitCode.indexOf(work);
  assert.ok(idx === -1 || idx > offIdx,
    "'" + work + "' tidak boleh dieksekusi sebelum cabang keluar mode 'off' (idx " + idx + ' vs ' + offIdx + ')');
}
// Dan cabang 'off' adalah STATEMENT PERTAMA di badan fungsi (tidak ada ';' atau '=' kode lain
// sebelum dia selain kepala fungsi itu sendiri).
const beforeOff = emitCode.slice(emitCode.indexOf('{') + 1, offIdx);
assert.strictEqual(beforeOff.trim(), '', "tidak boleh ada statement apa pun sebelum cabang 'off'");
ok("emisi: cabang mode 'off' adalah statement pertama dan keluar sebelum kerja apa pun");

// Pembaca mode sendiri harus fail-ke-'off': nilai tak dikenal / modul absen = 'off'.
const modeFn = extractFunction('learningTelemetryMode');
assert.ok(modeFn.includes("self.FiezelTelemetryConfig?.CONFIG?.mode"), 'mode dibaca dari FiezelTelemetryConfig.CONFIG.mode');
assert.ok(modeFn.includes("catch{return 'off'}"), 'kegagalan membaca konfigurasi jatuh ke off');
assert.ok(modeFn.includes(":'off'"), "nilai di luar enum jatuh ke 'off'");
ok("mode: pembacaan konfigurasi selalu gagal ke arah 'off' (diam), tidak pernah ke arah kirim");

/* ------------------------------------------------------------------ */
/* 2. Tidak ada pemanggilan telemetri tanpa guard availability.         */
/* ------------------------------------------------------------------ */
assert.ok(emitCode.indexOf("if(!E||typeof E.buildEvent!=='function')return;") !== -1,
  'builder (FiezelLearningEvents.buildEvent) wajib dicek ketersediaannya sebelum dipakai');
assert.ok(emitCode.indexOf("if(!self.FiezelLearningQueue||typeof self.FiezelLearningQueue.makeQueue!=='function')return;") !== -1,
  'modul antrean (FiezelLearningQueue.makeQueue) wajib dicek ketersediaannya');
assert.ok(emitCode.indexOf('const queue=learningTelemetryQueue()') !== -1 &&
  emitCode.indexOf('if(!queue)return;') !== -1,
  'antrean bisa null (IndexedDB absen) dan wajib dicek sebelum put');
// Guard buildEvent/put berada SEBELUM pemakaiannya.
assert.ok(emitCode.indexOf("if(!E||typeof E.buildEvent!=='function')return;") < emitCode.indexOf('E.buildEvent('),
  'guard builder mendahului pemanggilan builder');
assert.ok(emitCode.indexOf('if(!queue)return;') < emitCode.indexOf('queue.put('),
  'guard antrean mendahului queue.put');
// Kerja nyata terbungkus try/catch: telemetri gagal = senyap.
assert.ok(/try\{[\s\S]*queue\.put\([\s\S]*\}catch\{\}/.test(emitCode),
  'seluruh kerja emisi terbungkus try{...}catch{} yang menelan kegagalan');
ok('emisi: builder, modul antrean, dan instance antrean semuanya di-guard sebelum dipakai');

// Pabrik antrean juga guarded — dan hanya lewat adaptor idbLike, bukan localStorage.
const queueFn = extractFunction('learningTelemetryQueue');
assert.ok(queueFn.includes("if(!Q||typeof Q.makeQueue!=='function')return null;"), 'pabrik antrean mengecek modul');
assert.ok(queueFn.includes("typeof indexedDB==='undefined'"), 'pabrik antrean mengecek IndexedDB');
assert.ok(queueFn.includes('learningTelemetryIdb()'), 'antrean dibangun di atas adaptor idbLike');
assert.ok(!queueFn.includes('localStorage'), 'antrean TIDAK memakai localStorage (kuota state murid)');
ok('antrean: makeQueue hanya dibangun bila modul + IndexedDB tersedia, di atas adaptor idbLike');

// Adaptor idbLike memenuhi kontrak createMemoryIdb: getAll/put/delete/clear.
const idbFn = extractFunction('learningTelemetryIdb');
for (const m of ['getAll:', 'put:', "'delete':", 'clear:']) {
  assert.ok(idbFn.includes(m), 'adaptor idbLike wajib punya ' + m.replace(':', ''));
}
assert.ok(idbFn.includes('indexedDB') || SRC.includes("indexedDB.open(LEARNING_TELEMETRY_DB"),
  'adaptor memakai indexedDB browser yang nyata');
// Database antrean adalah nama BARU — state murid lama tidak disentuh.
assert.ok(SRC.includes("LEARNING_TELEMETRY_DB='fiezel-learning-queue-v1'"), 'nama DB antrean adalah kunci baru');
assert.ok(!emit.includes('fiezel-sl-v1-state'), "emisi tidak menyentuh 'fiezel-sl-v1-state'");
ok('adaptor idbLike: getAll/put/delete/clear di atas indexedDB nyata, DB baru, state lama utuh');

// Titik commit: pemanggilan di record() dibungkus try/catch sendiri.
assert.ok(SRC.includes('try{learningTelemetryEmitAnswer(q,ok,h)}catch{}'),
  'call site di record() terbungkus try/catch dan nilai kembaliannya tidak dibaca');
// Dan berada DI DALAM cabang grammar record() (setelah bukti kalibrasi, sebelum cabang cloze).
const recIdx = SRC.indexOf('try{learningTelemetryEmitAnswer(q,ok,h)}catch{}');
const grammarIdx = SRC.lastIndexOf("if(q.type==='grammar'){", recIdx);
const clozeIdx = SRC.indexOf("if(q.type==='cloze'){", grammarIdx);
assert.ok(grammarIdx !== -1 && recIdx > grammarIdx && (clozeIdx === -1 || recIdx < clozeIdx),
  'emisi dipanggil dari cabang grammar record() — titik commit jawaban kanonik');
ok('titik commit: emisi digantung di cabang grammar record(), guarded try/catch, observasi murni');

// Panel manifest: guarded pola bktShadowMarkup dan dirangkai ke area diagnostik brain.
const manifestFn = extractFunction('brainManifestMarkup');
assert.ok(manifestFn.includes("if(!M||typeof M.describe!=='function')return '';"),
  'panel manifest punya availability check sendiri');
assert.ok(/try\{[\s\S]*\}catch\{return ''\}/.test(manifestFn), 'panel manifest gagal menjadi string kosong');
assert.ok(manifestFn.includes('bundleVersion'), 'panel menampilkan bundleVersion');
assert.ok(manifestFn.includes('authorityMap'), 'panel meringkas authorityMap');
assert.ok(SRC.includes('bktShadowMarkup()+brainManifestMarkup()'),
  'panel manifest dirangkai tepat di area diagnostik BKT bayangan yang sudah ada');
ok('panel: manifest (bundleVersion + ringkasan authorityMap) guarded dan menempel di diagnostik brain');

/* ------------------------------------------------------------------ */
/* 3. TIDAK ADA installId / ID stabil / timestamp presisi di payload.   */
/* ------------------------------------------------------------------ */
const emitLower = emitCode.toLowerCase();
for (const banned of ['installid', 'userid', 'deviceid', 'owneruuid', 'visitortoken',
  'sessionid', 'studentname', 'randomuuid', 'navigator.', 'fingerprint']) {
  assert.ok(emitLower.indexOf(banned) === -1,
    "pembangun payload tidak boleh menyentuh '" + banned + "'");
}
// Waktu presisi tidak pernah masuk payload: Date.now() hanya untuk studyDay relatif dan
// argumen nowMs antrean (addedDay lokal, tidak ikut terkirim).
assert.ok(!/payload[\s\S]{0,400}Date\.now/.test(emitCode.slice(emitCode.indexOf('const payload'))) ||
  emitCode.indexOf('const nowMs=Date.now()') < emitCode.indexOf('const payload'),
  'Date.now tidak dipakai di dalam objek payload');
assert.ok(!/payload\s*[.[]\s*['"]?(timestamp|ts|time|at)\b/i.test(emitCode),
  'payload tidak punya field waktu presisi');
// studyDay: relatif terhadap jangkar lokal, bukan hari epoch absolut.
const dayFn = extractFunction('learningTelemetryStudyDay');
assert.ok(dayFn.includes('today-day0'), 'studyDay adalah selisih relatif, bukan hari epoch mentah');
assert.ok(dayFn.includes("'fiezel-lt-day0-v1'") || SRC.includes("LEARNING_TELEMETRY_DAY0_KEY='fiezel-lt-day0-v1'"),
  'jangkar hari-0 hidup di kunci localStorage BARU');
// Field payload eksplisit dan tertutup: hanya enum/bucket/ID konten.
for (const field of ["domain:'grammar'", 'lessonId:', 'itemId:', 'mode:', 'correct:', 'responseTimeBucket:']) {
  assert.ok(emitCode.includes(field), 'payload memuat field yang diizinkan: ' + field);
}
ok('privasi: nol installId/ID stabil/timestamp presisi di pembangun payload; studyDay relatif');

/* ------------------------------------------------------------------ */
/* 4. Emisi tidak mengubah perilaku belajar (observasi saja).           */
/* ------------------------------------------------------------------ */
// Fungsi emisi tidak menulis state belajar mana pun dan tidak memanggil save().
assert.ok(!/state\.[a-zA-Z]+\s*=/.test(emitCode), 'emisi tidak menulis state belajar');
assert.ok(!/\bsave\(\)/.test(emitCode), 'emisi tidak memanggil save()');
// Nilai kembalinya undefined-only (return kosong): tidak ada yang bisa dibaca pemanggil.
assert.ok(!/return\s+[^;\s}]/.test(emitCode.replace(/=>[^;{]*/g, '')), 'semua return di emisi adalah return kosong');
// Payload builder tidak memanggil fungsi keputusan brain (tutorPick/decideMove/scheduleNext).
for (const decision of ['tutorPick(', 'decideMove(', 'scheduleNext(', 'selectNext(']) {
  assert.ok(emitCode.indexOf(decision) === -1, 'emisi tidak menyentuh jalur keputusan: ' + decision);
}
ok('observasi murni: emisi tidak menulis state, tidak save(), tidak menyentuh jalur keputusan');

// node --check sudah gate terpisah, tetapi pastikan sumber yang diuji memang mengandung
// blok Gelombang 4 (bukan app.js versi lama yang kebetulan lolos semua indexOf===-1).
assert.ok(SRC.includes('Gelombang 4 (Lane B)'), 'blok wiring Gelombang 4 hadir di app.js');
ok('sumber: blok wiring Gelombang 4 benar-benar ada di app.js yang diaudit');

console.log('\n' + okCount + ' asersi statis lulus.');
console.log('AppTelemetryWiring: PASS');
