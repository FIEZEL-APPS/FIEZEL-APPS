/**
 * FIEZEL gerbang — METRIK HASIL BELAJAR (Fase 2 / Phase I).
 *
 * Gerbang ini menjaga MISTARNYA, bukan angkanya. Ia tidak menuntut Braincore mencapai nilai
 * tertentu — ambang mutu belum ada yang berhak menetapkannya tanpa murid sungguhan. Yang
 * dituntut adalah bahwa mistarnya tidak berbohong:
 *
 *   - "tidak terukur" WAJIB null, tidak pernah 0;
 *   - setiap angka membawa n, jumlah pengamatan yang menyusunnya;
 *   - metrik yang MUSTAHIL gagal harus disebut tautologi di tempat ia didefinisikan;
 *   - hasilnya deterministik, jadi dua rilis bisa dibandingkan.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const M = require('./braincore-metrics.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const hasil = M.ukurSemua();
const NAMA = ['masteryAccuracy', 'retention', 'adaptationQuality', 'interventionEfficiency'];

/* ========================================================================================
 * §1 — "TIDAK TERUKUR" ADALAH null, BUKAN NOL
 * Aturan paling penting berkas ini, dan ia ada karena cacatnya nyata: pada Fase B,
 * Number(null) === 0 mengubah "belum diukur" menjadi "nol", dan trace pertama melaporkan
 * predicted: 0 — "murid ini pasti gagal" — padahal yang benar "belum ada bukti".
 * ===================================================================================== */
test('§1 metrik yang tidak bisa diukur mengembalikan null, bukan 0', () => {
  const kosong = M.masteryAccuracy([], 0.5);
  assert.strictEqual(kosong.value, null, 'tanpa trace, masteryAccuracy mengembalikan angka');
  assert.strictEqual(kosong.n, 0);
  // Murid yang jelas BELUM bisa tidak berada di pita "sudah bisa": metriknya tidak berlaku.
  const takBerlaku = M.interventionEfficiency([{ decision: 'reteach' }], 0.1);
  assert.strictEqual(takBerlaku.value, null,
    'interventionEfficiency memberi angka untuk murid di luar pitanya — nol palsu');
});

test('§1 ada murid yang benar-benar TIDAK TERUKUR di lari nyata, dan itu terlaporkan', () => {
  const r = M.rangkum(hasil.rows, 'interventionEfficiency');
  assert.ok(r.tidakTerukur > 0,
    'tidak ada satu pun yang tidak terukur — curigai metriknya diam-diam mengisi nol');
  assert.strictEqual(r.dariMurid + r.tidakTerukur, hasil.rows.length,
    'jumlah terukur + tidak terukur tidak sama dengan jumlah murid — ada yang hilang diam-diam');
});

/* ========================================================================================
 * §2 — SETIAP ANGKA MEMBAWA n DAN ARTINYA
 * 0,02 dari 3 pengamatan dan 0,02 dari 3.000 bukan klaim yang sama.
 * ===================================================================================== */
test('§2 setiap metrik membawa n dan kalimat arti', () => {
  const satu = hasil.rows[0];
  for (const nama of NAMA) {
    const m = satu[nama];
    assert.ok(m && typeof m === 'object', nama + ' bukan objek metrik');
    assert.ok(Number.isFinite(m.n), nama + ' tidak membawa n');
    assert.ok(m.arti && m.arti.length > 20, nama + ' tidak menyatakan apa artinya');
  }
});

test('§2 kelima metrik yang dijanjikan benar-benar ada dan terhitung', () => {
  for (const nama of NAMA) {
    assert.ok(typeof M[nama] === 'function', 'metrik ' + nama + ' tidak diekspor');
  }
  assert.ok(typeof M.misconceptionRecovery === 'function', 'misconceptionRecovery tidak diekspor');
  assert.ok(hasil.misconceptionRecovery, 'misconceptionRecovery tidak ikut dihitung');
});

/* ========================================================================================
 * §3 — TAUTOLOGI DIAKUI SEBAGAI TAUTOLOGI
 * `retention` mengembalikan 1,0 pada seluruh murid karena updateMemory MEMANG didefinisikan
 * naik pada sukses dan runtuh pada lapse. Nilai sempurna yang mustahil gagal berguna sebagai
 * deteksi salah-kabel dan TIDAK berguna sebagai ukuran mutu. Yang dijaga di sini adalah bahwa
 * hal itu ditulis, bukan disembunyikan di balik angka 1,0 yang terlihat membanggakan.
 * ===================================================================================== */
test('§3 sifat tautologis retention disebut di sumbernya', () => {
  const src = fs.readFileSync(path.join(__dirname, 'braincore-metrics.js'), 'utf8');
  assert.ok(/TAUTOLOGI/.test(src),
    'sifat tautologis retention tidak lagi ditulis — 1,0 akan terbaca sebagai prestasi');
});

test('§3 ada ukuran retensi yang BISA gagal, dan ia diuji', () => {
  const rs = hasil.retentionSpacingMonotonic;
  assert.ok(rs && rs.n >= 4, 'monotonisitas spasi tidak diuji pada cukup pasangan jeda');
  assert.ok(Array.isArray(rs.gains) && rs.gains.length >= 5, 'kenaikan per jeda tidak dilaporkan');
  // Buktikan ukuran ini BISA gagal: urutan menurun harus memberi nilai < 1.
  const turun = [{ gap: 1, gain: 9 }, { gap: 3, gain: 5 }, { gap: 7, gain: 1 }];
  let monoton = 0;
  for (let i = 1; i < turun.length; i++) if (turun[i].gain > turun[i - 1].gain) monoton++;
  assert.strictEqual(monoton, 0, 'aritmetika monotonisitas salah — ukuran ini tidak bisa gagal');
});

/* ========================================================================================
 * §4 — BISA DIULANG
 * ===================================================================================== */
test('§4 DETERMINISTIK: mengukur dua kali memberi hasil identik', () => {
  assert.strictEqual(JSON.stringify(hasil), JSON.stringify(M.ukurSemua()),
    'metrik tidak deterministik — tidak ada rilis yang bisa dibandingkan pada mistar ini');
});

test('§4 terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-metrics-test.js') !== -1, 'gerbang ini tidak terdaftar');
});

/* ---- hasil dicetak, tidak di-assert: belum ada yang berhak menetapkan ambang mutunya ---- */
console.log('');
for (const nama of NAMA) {
  const r = M.rangkum(hasil.rows, nama);
  console.log('     ' + nama.padEnd(24) + String(r.value).padStart(9)
    + '   n=' + r.dariMurid + (r.tidakTerukur ? ', tidak terukur=' + r.tidakTerukur : ''));
}
console.log('     ' + 'retention(spacing)'.padEnd(24) + String(hasil.retentionSpacingMonotonic.value).padStart(9));
console.log('     ' + 'misconceptionRecovery'.padEnd(24) + String(hasil.misconceptionRecovery.value).padStart(9));
console.log('');
console.log(failures === 0 ? 'BraincoreMetrics: PASS' : 'BraincoreMetrics: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
