#!/usr/bin/env node
/**
 * Gerbang untuk braincore-demo.js — demonstrasi pembeli (Fase 2 / Phase Q).
 *
 * KENAPA DEMONSTRASI PERLU GERBANG SENDIRI. Demonstrasi adalah berkas yang paling mudah
 * berbohong di seluruh repo ini: ia mencetak kalimat meyakinkan di sebelah angka, dan tidak
 * ada yang memeriksa bahwa kalimatnya masih menggambarkan angkanya. Kalau Braincore berubah
 * besok dan berhenti menaikkan tingkat murid yang lancar, demonstrasi tanpa gerbang akan tetap
 * mencetak "the fluent learner is moved up" dengan tabel yang menunjukkan hal sebaliknya, dan
 * yang membacanya adalah calon pembeli.
 *
 * Karena itu yang diuji di sini BUKAN "demonstrasinya jalan". Yang diuji:
 *   1. seluruh klaimnya masih benar pada mesin hari ini;
 *   2. klaim itu BISA gagal — dibuktikan dengan mematikan kontrasnya lalu memastikan
 *      klaimnya berubah merah (demonstrasi yang tidak bisa gagal adalah brosur);
 *   3. angkanya datang dari mesin yang sama dengan yang diukur seluruh audit, bukan dari
 *      jalur khusus demonstrasi — diperiksa dengan menjalankan ulang satu lengan lewat
 *      braincore-pipeline.js langsung dan membandingkan hasilnya;
 *   4. keluarannya deterministik: dua jalan wajib identik, karena demonstrasi yang bergoyang
 *      tidak bisa dipakai membandingkan dua rilis;
 *   5. keempat pertanyaan pembeli benar-benar tersentuh — diperiksa dari PERILAKU yang
 *      muncul (naik tingkat, mengajar ulang, jadwal ingatan bergeser, bukti didiskon),
 *      bukan dari kata-kata di judulnya. Judul bisa ditulis ulang; perilaku tidak.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Demo = require('./braincore-demo.js');
const Pipeline = require('./braincore-pipeline.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

let n = 0;
const ok = (cond, msg) => { n++; assert.ok(cond, msg); };
const eq = (a, b, msg) => { n++; assert.deepStrictEqual(a, b, msg); };

// ---- 1. Seluruh klaim masih benar ---------------------------------------------------------
const res = Demo.runAll();

eq(res.failed, [], 'ada klaim demonstrasi yang tidak lagi benar:\n'
  + res.failed.map((f) => '  ' + f.scenario + ': ' + f.claim + '\n      ' + f.evidence).join('\n'));
ok(res.scenarios.length === 4, 'demonstrasi wajib menjawab keempat pertanyaan pembeli, ada '
  + res.scenarios.length);
eq(res.scenarios.map((s) => s.id), ['Q1', 'Q2', 'Q3', 'Q4'], 'himpunan skenario berubah');
ok(res.braincoreVersion === Manifest.bundleVersion,
  'demonstrasi melaporkan Braincore ' + res.braincoreVersion + ', manifest ' + Manifest.bundleVersion);

const totalKlaim = res.scenarios.reduce((t, s) => t + s.claims.length, 0);
ok(totalKlaim >= 12, 'klaim terlalu sedikit untuk empat skenario: ' + totalKlaim);

// Setiap skenario: minimal dua lengan (tanpa kontras, tidak ada yang dibuktikan) dan minimal
// tiga klaim. Satu lengan hanya menunjukkan mesinnya mengeluarkan sesuatu; pertanyaan pembeli
// adalah "apakah ia memutuskan BERBEDA karena yang diamatinya", dan itu butuh pembanding.
for (const s of res.scenarios) {
  ok(Object.keys(s.arms).length >= 2, s.id + ': demonstrasi satu lengan tidak membuktikan kontras');
  ok(s.claims.length >= 3, s.id + ': klaim terlalu sedikit (' + s.claims.length + ')');
  ok(s.guardErrors === 0, s.id + ': ada galat modul yang tertelan diam-diam (' + s.guardErrors + ')');
  for (const armId of Object.keys(s.arms)) {
    const arm = s.arms[armId];
    ok(String(arm.differsBy || '').length > 0, s.id + '/' + armId + ': lengan tanpa keterangan pembeda');
    ok(arm.turns.length > 0, s.id + '/' + armId + ': lengan tanpa satu pun jawaban');
  }
}

// Teks klaim wajib unik — klaim yang sama ditulis dua kali menaikkan hitungan tanpa menambah bukti.
const semuaTeks = res.scenarios.flatMap((s) => s.claims.map((c) => c.text));
eq(semuaTeks.length, new Set(semuaTeks).size, 'ada teks klaim yang terduplikasi');

// ---- 2. Klaimnya BISA gagal ---------------------------------------------------------------
//
// Ini uji yang paling penting di berkas ini. Tiga mutasi, masing-masing mematikan SATU kontras,
// dan masing-masing WAJIB membuat klaim yang bersangkutan merah. Kalau sebuah mutasi lewat
// dengan mulus, klaim itu tidak pernah memeriksa apa pun.
//
// Mutasinya dilakukan pada SALINAN skenario, bukan pada modulnya, dan setiap mutasi diperiksa
// benar-benar mendarat sebelum hasilnya dipercaya — pelajaran dari uji mutasi Fase M yang
// diam-diam tidak memutasi apa pun karena tanda tangannya ditebak salah.
function jalankanDenganLengan(scId, armId, eventsBaru) {
  const sc = Demo.SCENARIOS.find((x) => x.id === scId);
  assert.ok(sc, 'skenario ' + scId + ' tidak ada — mutasi tidak mendarat');
  const arms = {};
  for (const arm of sc.arms) {
    const dipakai = arm.id === armId ? Object.assign({}, arm, { events: eventsBaru }) : arm;
    if (arm.id === armId) {
      assert.notDeepStrictEqual(dipakai.events, arm.events,
        scId + '/' + armId + ': mutasi tidak mengubah apa pun');
    }
    arms[arm.id] = Demo.runArm(dipakai);
  }
  return sc.claims(arms);
}

// MUTASI 1 (Q1). Jadikan lengan "laboured" persis sama dengan lengan "fluent". Kalau klaim
// "yang lamban TIDAK dinaikkan" tetap hijau padahal kedua lengan identik, klaim itu tidak
// pernah membandingkan apa pun.
{
  const fluent = Demo.SCENARIOS.find((s) => s.id === 'Q1').arms.find((a) => a.id === 'A').events;
  const klaim = jalankanDenganLengan('Q1', 'B', fluent.map((e) => Object.assign({}, e)));
  const gagal = klaim.filter((c) => !c.ok);
  ok(gagal.length >= 1, 'MUTASI 1 lolos: dua lengan identik, tetapi klaim kontras Q1 tetap hijau');
  ok(gagal.some((c) => /NOT moved up/.test(c.text)),
    'MUTASI 1: yang gagal bukan klaim kontrasnya — ' + gagal.map((c) => c.text).join(' | '));
}

// MUTASI 2 (Q2). Beri lengan "tersebar" miskonsepsi yang SAMA berulang pada konsep yang sama —
// yaitu jadikan ia lengan A. Klaim "murid yang tersebar TIDAK dituduh" wajib merah.
{
  const berulang = Demo.SCENARIOS.find((s) => s.id === 'Q2').arms.find((a) => a.id === 'A').events;
  const klaim = jalankanDenganLengan('Q2', 'B', berulang.map((e) => Object.assign({}, e)));
  const gagal = klaim.filter((c) => !c.ok);
  ok(gagal.length >= 1, 'MUTASI 2 lolos: lengan tersebar diganti pola berulang, klaim tetap hijau');
  ok(gagal.some((c) => /NOT accused/.test(c.text)),
    'MUTASI 2: yang gagal bukan klaim non-tuduhan — ' + gagal.map((c) => c.text).join(' | '));
}

// MUTASI 3 (Q4). Jadikan lengan "tebakan" menjawab pada kecepatan yang wajar. Kalau klaim
// "bukti tebakan bernilai lebih kecil" tetap hijau, ia tidak membaca kappa sama sekali.
{
  const wajar = Demo.SCENARIOS.find((s) => s.id === 'Q4').arms.find((a) => a.id === 'B').events
    .map((e) => Object.assign({}, e, { ms: 12000 }));
  const klaim = jalankanDenganLengan('Q4', 'B', wajar);
  const gagal = klaim.filter((c) => !c.ok);
  ok(gagal.length >= 1, 'MUTASI 3 lolos: tebakan diganti jawaban wajar, klaim kredibilitas tetap hijau');
  ok(gagal.some((c) => /worth LESS as evidence/.test(c.text)),
    'MUTASI 3: yang gagal bukan klaim kredibilitas — ' + gagal.map((c) => c.text).join(' | '));
}

// MUTASI 4. runAll() wajib MENGUMPULKAN kegagalan, bukan cuma menghitungnya. Diperiksa dengan
// menukar satu skenario dengan versi yang klaimnya pasti salah, lalu memastikan ia muncul di
// `failed` — kalau tidak, `process.exit(1)` di demonstrasi tidak akan pernah terpicu.
{
  const asli = Demo.SCENARIOS[0].claims;
  Demo.SCENARIOS[0].claims = () => [{ text: 'klaim yang sengaja salah', ok: false, evidence: 'mutasi gerbang' }];
  let hasilMutan;
  try { hasilMutan = Demo.runAll(); } finally { Demo.SCENARIOS[0].claims = asli; }
  ok(hasilMutan.failed.some((f) => f.claim === 'klaim yang sengaja salah'),
    'MUTASI 4 lolos: klaim yang salah tidak masuk ke daftar failed — demonstrasi tidak akan keluar dengan kode 1');
  eq(Demo.runAll().failed, [], 'pemulihan mutasi 4 gagal: skenario asli tidak kembali');
}

// ---- 3. Angkanya datang dari mesin yang sama -----------------------------------------------
//
// Demonstrasi berjalan lewat braincore-runtime.js (pintu depan yang akan dipakai pembeli).
// Di sini satu lengan dijalankan ulang lewat braincore-pipeline.js LANGSUNG — jalur yang
// diukur seluruh Fase C-J — dan hasilnya wajib sama persis. Kalau suatu hari runtime menumbuhkan
// jalur khusus demonstrasi yang lebih ramah, selisihnya muncul di sini.
{
  const arm = Demo.SCENARIOS.find((s) => s.id === 'Q1').arms.find((a) => a.id === 'A');
  let learner = Pipeline.createLearner({ level: 'A2', now: Demo.T0 });
  let lastSession = -1;
  const langsung = [];
  for (const ev of arm.events) {
    const now = Demo.T0 + Math.round(Number(ev.day || 0) * Demo.DAY);
    const session = Number(ev.session || 0);
    if (session !== lastSession) { learner = Pipeline.newSession(learner, now); lastSession = session; }
    const q = { id: 'g-past-simple-1', concept: 'past-simple', lesson: 'past-simple',
                level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40 };
    const r = Pipeline.answer(learner, q, { correct: ev.correct === true, ms: Number(ev.ms) || 0 }, now);
    learner = r.learner;
    langsung.push({ move: r.trace.decisionRaw, reason: r.trace.decisionReason,
                    L: Math.round(r.trace.masteryAfter.L * 1000) / 1000, kappa: r.trace.evidence.kappa });
  }
  const lewatDemo = res.scenarios[0].arms.A.turns
    .map((t) => ({ move: t.move, reason: t.reason, L: t.masteryL, kappa: t.kappa }));
  eq(lewatDemo, langsung,
    'demonstrasi dan pipeline memberi hasil BERBEDA untuk masukan yang sama — '
    + 'salah satunya bukan jalur produksi');
}

// ---- 4. Deterministik ----------------------------------------------------------------------
//
// Dua jalan, masukan identik, keluaran wajib identik. Klaim `claims` adalah fungsi, jadi
// dibandingkan bentuk hasilnya saja — bukan referensi fungsinya.
{
  const bersihkan = (r) => JSON.stringify(r, (k, v) => (typeof v === 'function' ? '[fn]' : v));
  eq(bersihkan(Demo.runAll()), bersihkan(Demo.runAll()),
    'demonstrasi tidak deterministik — dua jalan berbeda hasilnya');
}
// Dan tidak ada sumber non-determinisme di sumbernya. Ini pemeriksaan teks, jadi ia hanya
// pelengkap uji perilaku di atas: yang membuktikan determinisme adalah dua jalan yang identik.
//
// PEMBUANG KOMENTAR DITULIS UTUH, BUKAN DUA REGEX. Versi pertama memakai bentuk yang dipakai
// gerbang-gerbang lain di repo ini — buang blok /* */, lalu buang baris yang SELURUHNYA
// komentar — dan langsung merah pada komentar EKOR yang berbunyi "tidak ada Date.now() di
// berkas ini". Kalimat yang menyatakan ketiadaan jam terbaca sebagai pemakaian jam.
//
// Godaannya adalah menulis ulang komentar di berkas yang diuji supaya gerbangnya diam. Itu
// menyetel sumber agar cocok dengan pemeriksa yang rusak, dan cacatnya tetap ada: pemeriksa
// yang salah baca akan salah baca lagi besok, kali ini mungkin dengan MELEWATKAN pemakaian
// jam yang sungguhan di ekor sebuah baris. Jadi yang diperbaiki pemeriksanya.
//
// Pemindai di bawah melacak keadaan (kode / string / komentar baris / komentar blok), jadi ia
// membaca ekor baris dengan benar. BATASNYA, ditulis supaya tidak dikira lebih pintar daripada
// aslinya: ia tidak mengenali literal regex, jadi regex yang memuat tanda kutip atau '//' bisa
// mengacaukannya. braincore-demo.js tidak memuat yang seperti itu, dan assert di bawah menjaga
// asumsi itu tetap benar.
function buangKomentar(src) {
  let out = '', i = 0, state = 'code', quote = '';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '*') { state = 'block'; i += 2; continue; }
      if (c === '/' && d === '/') { state = 'line'; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { state = 'str'; quote = c; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (state === 'block') { if (c === '*' && d === '/') { state = 'code'; i += 2; } else i++; continue; }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += '\n'; } i++; continue; }
    if (c === '\\') { out += c + (d || ''); i += 2; continue; }
    out += c; i++;
    if (c === quote) { state = 'code'; quote = ''; }
  }
  return out;
}
{
  const mentah = fs.readFileSync(path.join(__dirname, 'braincore-demo.js'), 'utf8');

  // Pemindai dibuktikan bekerja sebelum hasilnya dipercaya — pada contoh yang PERSIS bentuk
  // kasus yang meruntuhkan versi pertama, plus satu kasus sebaliknya supaya ia tidak sekadar
  // membuang segalanya.
  eq(buangKomentar('const T = 1; // tidak ada Date.now() di sini\n').trim(), 'const T = 1;',
    'pemindai komentar tidak membuang komentar ekor');
  eq(buangKomentar('const s = "// bukan komentar";').trim(), 'const s = "// bukan komentar";',
    'pemindai komentar salah membuang isi string');
  ok(buangKomentar('a();\n/* blok\n Date.now() */\nb();').indexOf('Date.now') === -1,
    'pemindai komentar tidak membuang komentar blok');
  ok(buangKomentar('x = Date.now();').indexOf('Date.now') !== -1,
    'pemindai komentar membuang KODE — pemeriksaan di bawahnya jadi tidak berarti');

  // Batas pemindai: braincore-demo.js tidak boleh menumbuhkan literal regex yang memuat
  // tanda kutip atau '//', karena di situlah pemindai berhenti bisa dipercaya.
  ok(!/\/[^\n/*][^\n]*(?:["'`]|\/\/)[^\n]*\//.test(mentah.replace(/^\s*\/\/.*$/gm, '')),
    'braincore-demo.js memuat literal regex dengan kutip atau // — pemindai komentar tidak bisa dipercaya lagi');

  const src = buangKomentar(mentah);
  ok(!/Math\.random|Date\.now|new Date\(/.test(src),
    'braincore-demo.js memakai jam atau acak — demonstrasi wajib bisa diulang persis');
}

// ---- 5. Keempat pertanyaan pembeli tersentuh, diperiksa dari PERILAKU -----------------------
//
// SENGAJA bukan dari judul. Judul bisa diubah tanpa mengubah apa pun yang dijalankan; perilaku
// tidak bisa. Yang diperiksa: naik tingkat pernah terjadi, mengajar ulang pernah terjadi,
// jadwal ingatan pernah bergeser jauh, dan bukti pernah didiskon di bawah 1.
{
  const semuaTurn = res.scenarios.flatMap((s) => Object.keys(s.arms).flatMap((k) => s.arms[k].turns));

  ok(semuaTurn.some((t) => t.move === 'stretch'),
    'tidak ada satu pun keputusan menaikkan tingkat — pertanyaan pembeli 1 tidak terjawab');
  ok(semuaTurn.some((t) => t.decision === 'reteach'),
    'tidak ada satu pun keputusan mengajar ulang — pertanyaan pembeli 2 tidak terjawab');
  ok(semuaTurn.some((t) => t.activeMisconceptions >= 1),
    'tidak ada miskonsepsi yang pernah menjadi aktif — pertanyaan pembeli 2 tidak terjawab penuh');

  const stab = semuaTurn.map((t) => t.stabilityDays).filter((v) => typeof v === 'number');
  ok(Math.max(...stab) / Math.max(1e-6, Math.min(...stab)) > 100,
    'jadwal ingatan nyaris tidak bergerak di seluruh demonstrasi — pertanyaan pembeli 3 tidak terjawab');

  ok(semuaTurn.some((t) => t.kappa !== null && t.kappa < 1),
    'bukti tidak pernah didiskon — pertanyaan pembeli 4 tidak terjawab');
  ok(semuaTurn.some((t) => t.kappa === 0),
    'bukti tidak pernah dibuang seluruhnya — pertanyaan pembeli 4 tidak terjawab penuh');
}

// ---- 6. Dokumen jual tidak boleh basi -------------------------------------------------------
//
// SALE/BRAINCORE_DEMONSTRATION.md memuat transkrip yang akan DIBACA PEMBELI. Kalau mesinnya
// berubah dan dokumennya tidak, pembeli membaca angka yang tidak lagi benar — dan tidak ada
// satu pun gerbang lain di repo ini yang bisa melihatnya, karena dokumennya cuma teks.
//
// Karena itu blok transkrip di dokumen wajib SAMA PERSIS dengan jalan hari ini. Pintunya satu:
// `node braincore-demo.js --write-doc`. Prosa di sekelilingnya tetap ditulis tangan dan tidak
// disentuh — yang dijaga hanya angkanya, karena hanya angka yang bisa basi tanpa terlihat.
{
  const diDisk = Demo.docBlockOnDisk();
  ok(diDisk !== null, 'SALE/BRAINCORE_DEMONSTRATION.md hilang atau kehilangan penanda transkrip');
  const seharusnya = Demo.docBlock(res);
  if (diDisk !== seharusnya) {
    // Tunjukkan baris pertama yang berbeda — selisih 200 baris tanpa penunjuk tidak menolong.
    const a = String(diDisk).split('\n'), b = seharusnya.split('\n');
    let i = 0;
    while (i < Math.max(a.length, b.length) && a[i] === b[i]) i++;
    assert.fail('SALE/BRAINCORE_DEMONSTRATION.md sudah BASI terhadap mesin hari ini.\n'
      + '  beda pertama di baris ' + (i + 1) + ':\n'
      + '    dokumen : ' + JSON.stringify(a[i]) + '\n'
      + '    mesin   : ' + JSON.stringify(b[i]) + '\n'
      + '  perbaiki dengan: node braincore-demo.js --write-doc');
  }
  n++;
}

// ---- 7. Terdaftar di CI --------------------------------------------------------------------
{
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  ok(yml.indexOf('node braincore-demo-test.js') !== -1, 'gerbang ini tidak terdaftar di quality.yml');
}

console.log('braincore-demo-test: ' + n + ' assert PASS');
console.log('  ' + totalKlaim + ' klaim demonstrasi diverifikasi pada Braincore ' + res.braincoreVersion
  + '; 4 mutasi membuktikan klaim itu bisa gagal.');
