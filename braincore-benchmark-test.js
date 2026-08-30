/**
 * FIEZEL gerbang — TOLOK UKUR BRAINCORE (Fase 2 / Phase G).
 *
 * APA YANG DIJAGA BERKAS INI, dan apa yang TIDAK.
 *
 * Ia menjaga bahwa braincore-benchmark.js benar-benar mengukur delapan hal yang dijanjikannya,
 * bahwa hasilnya DETERMINISTIK, dan bahwa setiap penyimpangan dari nilai yang direkam terlihat.
 * Ia TIDAK menjaga bahwa keputusan Braincore benar — nilai `expect` direkam dari mesin ini,
 * jadi ia bisa merekam perilaku yang salah dengan setia sekali. Perbedaan itu ditulis di sini,
 * di runner-nya, dan di dalam JSON-nya, karena ia adalah salah baca yang paling mungkin terjadi
 * terhadap seluruh Fase G.
 *
 * DAN INILAH YANG DITEMUKAN TOLOK UKUR INI PADA JALAN PERTAMANYA — alasan ia layak ada:
 * `Calibration.observe()` dipanggil pipeline dengan NAMA FIELD YANG SALAH sejak Fase C
 * ({correct, weight, prior} alih-alih {ok, kappa, priorDifficulty, ability}). Modulnya
 * memvalidasi masukan lalu mengembalikan state UTUH tanpa mencatat apa pun — degradasi yang
 * disengaja — jadi tidak ada yang dilempar, tidak ada penjaga yang menyala, dan kalibrasi item
 * diam-diam menjadi NO-OP sepanjang Fase C sampai F. Tidak satu pun gerbang sebelum ini
 * melihatnya, karena semuanya menguji apakah pipeline BERJALAN, bukan apakah setiap modul di
 * dalamnya benar-benar MENYIMPAN sesuatu.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const B = require('./braincore-benchmark.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const spec = B.loadSpec();
const run1 = B.runAll(spec);

/* ========================================================================================
 * §1 — KEDELAPAN PENGUKURAN BENAR-BENAR DIPEGANG
 * Tolok ukur yang menjanjikan delapan pengukuran lalu diam-diam melewatkan satu adalah tolok
 * ukur yang mengaku lebih luas daripada kenyataannya.
 * ===================================================================================== */
test('§1 setiap pengukuran wajib dipegang skenario atau dipegang runner — tidak ada yang kosong', () => {
  const byScenario = new Set();
  for (const sc of spec.scenarios) for (const m of sc.measures) byScenario.add(m);
  const byRunner = new Set(Object.keys(spec.measurementsHeldByRunner || {}));
  const kosong = B.MEASUREMENTS.filter((m) => !byScenario.has(m) && !byRunner.has(m));
  assert.deepStrictEqual(kosong, [], 'pengukuran yang dijanjikan tetapi tidak diukur: ' + kosong.join(', '));
});

test('§1 tidak ada skenario yang mengaku mengukur sesuatu di luar kosakata', () => {
  for (const sc of spec.scenarios) {
    for (const m of sc.measures) {
      assert.ok(B.MEASUREMENTS.indexOf(m) !== -1, sc.id + ': pengukuran asing "' + m + '"');
    }
  }
});

test('§1 setiap skenario menyatakan PERTANYAAN yang diajukannya', () => {
  for (const sc of spec.scenarios) {
    assert.ok(sc.asks && sc.asks.length > 20,
      sc.id + ': tanpa `asks`, sebuah skenario hanyalah angka yang tidak diketahui maksudnya');
  }
});

/* ========================================================================================
 * §2 — REGRESSION SAFETY: hasil sekarang cocok dengan yang direkam
 * ===================================================================================== */
test('§2 SELURUH skenario cocok dengan nilai yang direkam', () => {
  assert.deepStrictEqual(run1.mismatches.map((m) => m.id), [],
    'skenario yang menyimpang: ' + run1.mismatches.map((m) => m.id).join(', '));
});

test('§2 ekspektasi direkam pada versi Braincore yang sama dengan mesin sekarang', () => {
  assert.strictEqual(spec.braincoreVersion, Manifest.bundleVersion,
    'ekspektasi direkam pada ' + spec.braincoreVersion + ', mesin sekarang '
    + Manifest.bundleVersion + ' — bandingkan antar rilis dengan sadar, jangan diam-diam');
});

test('§2 tidak satu pun skenario menelan galat penjaga', () => {
  const berdosa = run1.scenarios.filter((s) => s.got.guardErrors > 0).map((s) => s.id);
  assert.deepStrictEqual(berdosa, [], 'skenario dengan galat tertangkap: ' + berdosa.join(', '));
});

/* ========================================================================================
 * §3 — CONSISTENCY: dua jalan, sidik jari identik
 * Tanpa ini, setiap perbandingan antar rilis (Fase P) tidak bisa dipercaya: perbedaan bisa
 * datang dari rilisnya, atau dari jalan itu sendiri, dan tidak ada cara membedakannya.
 * ===================================================================================== */
test('§3 DETERMINISTIK: menjalankan seluruh tolok ukur dua kali memberi hasil identik', () => {
  const run2 = B.runAll(spec);
  assert.strictEqual(JSON.stringify(run1.scenarios.map((s) => s.got)),
                     JSON.stringify(run2.scenarios.map((s) => s.got)),
                     'tolok ukur tidak deterministik — tidak ada rilis yang bisa dibandingkan');
});

test('§3 tanpa jam dan tanpa acak di dalam runner', () => {
  const src = fs.readFileSync(path.join(__dirname, 'braincore-benchmark.js'), 'utf8');
  const badan = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const terlarang of ['Math.random', 'Date.now', 'new Date(']) {
    assert.ok(badan.indexOf(terlarang) === -1,
      'runner memakai ' + terlarang + ' — hasilnya tidak akan bisa diulang');
  }
});

/* ========================================================================================
 * §4 — SKENARIO MASIH MENJAWAB PERTANYAANNYA SENDIRI
 *
 * Ini bagian yang membedakan tolok ukur dari berkas emas. Berkas emas hanya bertanya "apakah
 * angkanya sama?"; kalau seseorang menjalankan --write-expectations sesudah sebuah regresi,
 * berkas emas akan hijau selamanya atas perilaku yang rusak.
 *
 * Assert di bawah menyatakan HUBUNGAN yang harus benar apa pun angkanya, dan hubungan itu
 * ditulis dari pertanyaan skenarionya, bukan dari keluarannya. Merekam ulang ekspektasi TIDAK
 * bisa memuaskan bagian ini.
 * ===================================================================================== */
const got = {};
for (const s of run1.scenarios) got[s.id] = s.got;

test('§4 mastery: benar menaikkan, salah menurunkan, dan satu jawaban tidak membuka gerbang', () => {
  assert.ok(got['mastery-01-naik-pada-benar-andal'].masteryL
          > got['mastery-02-turun-pada-salah-andal'].masteryL,
    'bukti benar tidak berakhir lebih tinggi daripada bukti salah');
  const satu = got['mastery-03-gerbang-tidak-terbuka-oleh-satu-jawaban'];
  assert.ok(satu.masteryL < 0.95 || satu.masteryN < 5,
    'satu jawaban benar membuka gerbang penguasaan — pagar L>=0.95 DAN n>=5 bocor');
});

test('§4 ingatan: jeda panjang memberi stabilitas lebih besar, kegagalan meruntuhkannya', () => {
  assert.ok(got['memory-01-jeda-panjang-lalu-benar'].stabilityDays
          > got['memory-02-jeda-pendek-lalu-benar'].stabilityDays,
    'efek spasi hilang: mengulang setelah jeda panjang tidak lagi lebih berharga');
  assert.ok(got['memory-03-lupa-lalu-salah'].stabilityDays
          < got['memory-01-jeda-panjang-lalu-benar'].stabilityDays,
    'kegagalan sesudah jeda panjang tidak meruntuhkan stabilitas');
});

test('§4 miskonsepsi: aktif lintas sesi, TIDAK aktif dalam satu sesi, dan pulih perlu bukti panjang', () => {
  assert.strictEqual(got['misconception-01-jadi-aktif-lintas-sesi'].activeMisconceptions, 1,
    'bukti yang cukup dan lintas sesi tidak menghasilkan miskonsepsi aktif');
  assert.strictEqual(got['misconception-02-satu-sesi-saja-belum-cukup'].activeMisconceptions, 0,
    'pagar MIN_SESSIONS bocor: satu sore yang buruk cukup untuk menuduh murid');
  assert.strictEqual(got['misconception-03-pulih-tetapi-hanya-sesudah-bukti-panjang'].activeMisconceptions, 0,
    'miskonsepsi tidak pernah bisa pulih — tuduhan yang tidak punya pintu keluar');
  assert.strictEqual(got['misconception-04-pemulihan-SENGAJA-lambat'].activeMisconceptions, 1,
    'pemulihan menjadi terlalu murah: beberapa jawaban benar langsung menghapus tuduhan');
});

test('§4 kesulitan: kalibrasi menggeser DUA ARAH, dan bukti tipis tidak menggeser apa pun', () => {
  const sulit = got['difficulty-03-kalibrasi-menaikkan-item-yang-ternyata-sulit'].difficulty;
  const mudah = got['difficulty-04-kalibrasi-menurunkan-item-yang-ternyata-mudah'].difficulty;
  const tipis = got['difficulty-05-bukti-tipis-tidak-menggeser-apa-pun'].difficulty;
  assert.ok(sulit.effective > sulit.prior,
    'item yang konsisten gagal tidak menjadi lebih sulit — kalibrasi mati lagi (lihat catatan di kepala berkas)');
  assert.ok(mudah.effective < mudah.prior,
    'item yang konsisten benar tidak menjadi lebih mudah — kalibrasi hanya bergerak satu arah');
  assert.strictEqual(tipis.effective, tipis.prior,
    'bukti di bawah MIN_N_APPLY sudah menggeser kesulitan — pagar bukti tipis bocor');
  assert.ok(got['difficulty-01-mode-mengubah-prior'].difficulty.prior
          > got['mastery-03-gerbang-tidak-terbuka-oleh-satu-jawaban'].difficulty.prior,
    'mode yang lebih menuntut tidak lagi memberi prior lebih tinggi');
});

test('§4 kredibilitas: tebakan didiskon, integritas cacat DIBUANG, dan diskonnya sampai ke mastery', () => {
  const tebak = got['credibility-01-tebakan-cepat-didiskon'];
  const andal = got['credibility-02-jawaban-andal-penuh'];
  const cacat = got['credibility-04-integritas-membuang-bukti'];
  assert.ok(tebak.kappas[0] < andal.kappas[0], 'tebakan cepat tidak lagi didiskon');
  assert.ok(tebak.masteryL < andal.masteryL,
    'diskon kredibilitas tidak sampai ke mastery — ia hanya hiasan di trace');
  assert.strictEqual(cacat.kappas[0], 0,
    'bukti dari item cacat tidak DIBUANG, hanya dikurangi — nol dan hampir-nol bukan hal yang sama');
});

test('§4 tindakan: rentetan salah mengajar ulang, dan tebakan beruntun TIDAK menaikkan tingkat', () => {
  const salah = got['action-01-rentetan-salah-menjauh-dari-lanjut'].decisionRaw;
  assert.ok(salah.indexOf('reteach') !== -1, 'rentetan salah tidak pernah sampai ke reteach');
  const lelah = got['action-02-melambat-dan-meleset-menyudahi-sesi'].decisionRaw;
  assert.ok(lelah.indexOf('breathe') !== -1, 'melambat dan meleset bersamaan tidak menyudahi sesi');
  const ingat = got['action-03-cepat-mengingat-menaikkan-tingkat'].decisionRaw;
  assert.ok(ingat.indexOf('stretch') !== -1, 'cepat karena mengingat tidak lagi menaikkan tingkat');
  const tebak = got['action-05-tebakan-beruntun-TIDAK-menaikkan-tingkat'].decisionRaw;
  assert.strictEqual(tebak.indexOf('stretch'), -1,
    'tebakan beruntun MENAIKKAN tingkat — mesin menghadiahi kebiasaan menebak');
});

/* ========================================================================================
 * §5 — KEJUJURAN BERKASNYA SENDIRI
 * ===================================================================================== */
test('§5 JSON membawa peringatan bahwa ia merekam perilaku, bukan kebenaran', () => {
  const teks = (spec.readThisFirst || []).join(' ');
  assert.ok(/TIDAK membuktikan KEBENARAN/.test(teks),
    'peringatan salah-baca hilang dari JSON — angka tanpa peringatan akan dikutip sebagai bukti mutu');
  assert.ok(String(spec.notMeasuredHere || '').indexOf('adaptivity-simulation-v3') !== -1,
    'JSON tidak lagi menyebut lapisan yang BUKAN miliknya — dua tolok ukur yang diam soal batas akan berselisih');
});

test('§5 terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-benchmark-test.js') !== -1,
    'gerbang ini tidak terdaftar — tolok ukur yang tidak dijalankan CI adalah tolok ukur yang membusuk');
});

console.log('     ' + spec.scenarios.length + ' skenario, ' + B.MEASUREMENTS.length
  + ' pengukuran, Braincore ' + run1.braincoreVersion);
console.log(failures === 0 ? 'BraincoreBenchmark: PASS' : 'BraincoreBenchmark: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
