/**
 * FIEZEL gerbang — STUDI MURID SIMULASI (Fase 2 / Phase J).
 *
 * Gerbang ini menjaga METODENYA, bukan vonisnya. Vonis studi ini saat ini TIDAK menyenangkan —
 * Braincore terbukti lebih buruk daripada mesin dasar pada dua dari tiga metrik — dan gerbang
 * yang menuntut vonis tertentu akan memaksa siapa pun yang menjalankannya mengarang vonis itu.
 *
 * Yang dituntut: hasilnya bisa diulang, statistiknya dipinjam dari mesin yang sudah diaudit
 * bukan ditulis ulang, pasangannya benar-benar berpasangan, dan kosakata vonisnya dipatuhi —
 * khususnya bahwa `inconclusive` tidak pernah ditulis sebagai "lebih baik".
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const S = require('./braincore-study.js');
const Ext = require('./adaptivity-simulation-v3-extended.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const studi = S.jalankanStudi();
const VONIS = ['terbukti_lebih_baik', 'terbukti_lebih_buruk', 'terbukti_remeh',
               'inconclusive', 'insufficient'];

/* ========================================================================================
 * §1 — STATISTIKNYA DIPINJAM, BUKAN DITULIS ULANG
 * Dua mesin inferensi di satu repo akan suatu hari berselisih, dan yang kedua tidak akan
 * pernah diaudit sebaik yang pertama.
 * ===================================================================================== */
test('§1 CI berasal dari mesin v3-extended, bukan bootstrap tulisan tangan di sini', () => {
  const src = fs.readFileSync(path.join(__dirname, 'braincore-study.js'), 'utf8');
  assert.ok(/Ext\.ciBerpasangan/.test(src), 'studi tidak lagi memakai ciBerpasangan milik v3');
  assert.ok(!/function\s+\w*[Bb]ootstrap/.test(src),
    'studi mendefinisikan bootstrap-nya sendiri — mesin inferensi kedua di repo yang sama');
  assert.strictEqual(typeof Ext.ciBerpasangan, 'function', 'ciBerpasangan tidak tersedia');
});

test('§1 pesan arah memakai pesanArahFaktual, yang mengubur bug "TIDAK turun" untuk angka yang turun', () => {
  const src = fs.readFileSync(path.join(__dirname, 'braincore-study.js'), 'utf8');
  assert.ok(/Ext\.pesanArahFaktual/.test(src), 'pesan arah ditulis sendiri lagi');
  for (const c of studi.ci) {
    if (c.meanKandidat < c.meanBase) {
      assert.ok(!/TIDAK turun/.test(c.pesan),
        c.metric + ': angkanya turun tetapi pesannya berkata tidak turun');
    }
  }
});

/* ========================================================================================
 * §2 — PASANGANNYA BENAR-BENAR BERPASANGAN
 * Kalau lengan ke-i tidak berasal dari murid dan bukti yang sama, CI-nya omong kosong.
 * ===================================================================================== */
test('§2 kedua lengan sejajar: murid, seed, gaya, kesulitan sama pada indeks yang sama', () => {
  const a = studi.arm.baseline, b = studi.arm.braincore;
  assert.strictEqual(a.length, b.length, 'panjang kedua lengan berbeda');
  assert.ok(a.length >= 500, 'matriks terlalu kecil untuk disebut studi: ' + a.length);
  for (let i = 0; i < a.length; i++) {
    assert.strictEqual(a[i].profil + a[i].seed + a[i].gaya + a[i].refD,
                       b[i].profil + b[i].seed + b[i].gaya + b[i].refD,
                       'pasangan ke-' + i + ' berasal dari kondisi yang berbeda');
  }
});

test('§2 penyaring metrik benar-benar membuang baris yang di luar pitanya', () => {
  const reteach = studi.ci.find((c) => c.metric === 'reteachSia2');
  assert.ok(reteach.nPasangan > 0, 'reteachSia2 tidak punya satu pun pasangan');
  assert.ok(reteach.nPasangan < studi.arm.baseline.length,
    'penyaring pita "sudah bisa" tidak membuang apa pun — ia tidak menyaring');
});

/* ========================================================================================
 * §3 — KOSAKATA VONIS DIPATUHI
 * ===================================================================================== */
test('§3 setiap vonis berasal dari kosakata tertutup', () => {
  for (const c of studi.ci) {
    assert.ok(VONIS.indexOf(c.verdict) !== -1, c.metric + ': vonis asing "' + c.verdict + '"');
  }
});

test('§3 ringkasan TIDAK pernah menyebut hasil inconclusive sebagai lebih baik', () => {
  const md = S.tulisRingkasan(studi);
  for (const c of studi.ci) {
    if (c.verdict !== 'inconclusive') continue;
    const baris = md.split('\n').filter((l) => l.indexOf(c.metric) !== -1);
    for (const l of baris) {
      assert.ok(!/lebih baik|better than|unggul/i.test(l.replace(/terbukti_lebih_baik/g, '')),
        'metrik inconclusive "' + c.metric + '" ditulis seolah lebih baik: ' + l);
    }
  }
  assert.ok(/embraces zero/.test(md), 'ringkasan tidak menjelaskan arti inconclusive');
});

test('§3 ringkasan membawa batas terpenting: murid latennya TIDAK bergerak', () => {
  const md = S.tulisRingkasan(studi);
  assert.ok(/static/.test(md) && /upper bound for Braincore/.test(md),
    'batas studi hilang dari ringkasan — angkanya akan dikutip lebih luas daripada haknya');
});

/* ========================================================================================
 * §4 — BISA DIULANG, DAN BERKASNYA ADA
 * ===================================================================================== */
test('§4 REPRODUSIBEL: menjalankan studi dua kali memberi vonis identik', () => {
  const dua = S.jalankanStudi();
  assert.strictEqual(JSON.stringify(studi.ci.map((c) => [c.metric, c.meanDiff, c.ciLo, c.ciHi, c.verdict])),
                     JSON.stringify(dua.ci.map((c) => [c.metric, c.meanDiff, c.ciLo, c.ciHi, c.verdict])),
                     'studi tidak reprodusibel — tidak ada temuan di atasnya yang bisa diaudit');
});

test('§4 keempat berkas keluaran ada dan sejalan dengan versi Braincore sekarang', () => {
  for (const f of ['results.json', 'baseline-results.json', 'braincore-results.json', 'summary.md']) {
    const p = path.join(S.OUT_DIR, f);
    assert.ok(fs.existsSync(p), 'simulations/' + f + ' tidak ada — jalankan --write');
  }
  const res = JSON.parse(fs.readFileSync(path.join(S.OUT_DIR, 'results.json'), 'utf8'));
  assert.strictEqual(res.braincoreVersion, studi.braincoreVersion,
    'berkas hasil direkam pada versi Braincore lain — jalankan ulang --write');
  assert.strictEqual(JSON.stringify(res.ci.map((c) => [c.metric, c.verdict])),
                     JSON.stringify(studi.ci.map((c) => [c.metric, c.verdict])),
                     'vonis di berkas berbeda dari vonis sekarang — berkasnya basi');
});

test('§4 berkas keluaran tidak melanggar `git diff --check` (spasi/baris kosong di akhir)', () => {
  // TEMUAN NYATA, bukan kerapian. Versi pertama tulisRingkasan() menutup dengan baris kosong,
  // jadi summary.md berakhir dengan '\n\n'. `git diff --check` menandainya, dan sh() di
  // tools/fiezel-guardians.mjs MELEMPAR ketika git keluar bukan-nol — sehingga A9 Security
  // Sentinel DAN A10 Regression Watcher sama-sama jatuh dengan stack trace, bukan dengan pesan
  // yang menyebut penyebabnya. Satu baris kosong menjatuhkan dua penjaga.
  for (const f of ['results.json', 'baseline-results.json', 'braincore-results.json', 'summary.md']) {
    const teks = fs.readFileSync(path.join(S.OUT_DIR, f), 'utf8');
    assert.ok(teks.endsWith('\n'), f + ' tidak berakhir dengan baris baru');
    assert.ok(!teks.endsWith('\n\n'), f + ' berakhir dengan baris KOSONG — A9 dan A10 akan jatuh');
    const baris = teks.split('\n');
    for (let i = 0; i < baris.length; i++) {
      assert.ok(!/[ \t]+$/.test(baris[i]), f + ':' + (i + 1) + ' berakhir dengan spasi tergantung');
    }
  }
});

/* ---- vonis dicetak, tidak di-assert ---- */
console.log('');
console.log('     ' + studi.konfigurasi.jalanBerpasangan + ' jalan berpasangan, '
  + studi.konfigurasi.interaksiSimulasi + ' interaksi simulasi');
for (const c of studi.ci) console.log('     ' + c.metric.padEnd(16) + c.verdict);
console.log('');
console.log(failures === 0 ? 'BraincoreStudy: PASS' : 'BraincoreStudy: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
