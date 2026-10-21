/**
 * FIEZEL gate — Step Tutor (Braincore v3, A13; council C10).
 *
 * Step-based tutoring hanya bernilai kalau tiga hal terbukti pada DATA NYATA, bukan pada
 * contoh karangan: (1) rantai reasoningOperation benar-benar terpecah menjadi langkah
 * bertanya yang bisa dirender; (2) frasa yang tidak dikenal tidak pernah mematikan sesi —
 * fallback harus jelek tapi hidup, bukan indah tapi crash; (3) klaim cakupan "step-based"
 * harus diaudit terhadap grammar-templates.json yang sebenarnya, karena angka cakupan
 * itulah yang menentukan apakah fitur ini layak diwire ke app atau cuma hiasan.
 *
 * FAKTA DATA (diverifikasi saat gate ini ditulis, 139 template):
 *   77 template ber-2 operasi, 19 ber-3, 1 ber-4, 42 ber-1 -> 97/139 (~69,8%) menghasilkan
 *   dekomposisi multi-langkah. Ambang gate 50% berdiri NYAMAN di bawah angka nyata itu,
 *   sehingga gate gagal hanya kalau konten atau parser benar-benar memburuk.
 */
const assert = require('assert');
const tutor = require('../features/brain/fiezel-step-tutor.js');
const bank = require('../grammar-templates.json');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

// (a) Rantai 2 operasi -> tepat 2 langkah + finalAsk yang mengembalikan ke soal asli.
test('template 2 operasi menghasilkan 2 langkah dan finalAsk', () => {
  const tpl = {
    id: 'TA-001',
    reasoningOperation: 'identify time-frame marker -> select aspect',
    stem: 'Look! The chef ___ a new dish right now.'
  };
  const steps = tutor.stepsFor(tpl);
  assert.strictEqual(steps.length, 2, 'harus tepat 2 langkah, dapat ' + steps.length);
  assert.ok(steps[0].ask.includes('time-frame marker'), 'langkah 1 harus menyebut objek operasinya');
  assert.strictEqual(steps[0].rationale, 'brain3_step_identify');
  assert.strictEqual(steps[1].rationale, 'brain3_step_select');
  assert.strictEqual(steps[0].expect, 'time-frame marker');
  const d = tutor.decompose('Look! The chef ___ a new dish right now.', tpl);
  assert.strictEqual(d.steps.length, 2);
  assert.ok(typeof d.finalAsk === 'string' && d.finalAsk.endsWith('?'), 'finalAsk harus kalimat tanya');
  assert.ok(d.finalAsk.includes('The chef'), 'finalAsk harus memuat soal aslinya');
  assert.strictEqual(d.rationale, 'brain3_step_tutor_decomposed');
});

// (b) Verba tak dikenal -> fallback generik 'Langkah N: <frasa>?', TIDAK melempar.
test('frasa tak dikenal jatuh ke fallback tanpa melempar', () => {
  const tpl = { reasoningOperation: 'zigzag the flux capacitor -> select tense' };
  const steps = tutor.stepsFor(tpl); // tidak boleh throw
  assert.strictEqual(steps.length, 2);
  assert.strictEqual(steps[0].rationale, 'brain3_step_fallback');
  assert.strictEqual(steps[0].ask, 'Langkah 1: zigzag the flux capacitor?');
  assert.strictEqual(steps[1].rationale, 'brain3_step_select');
});

// (c) Cakupan atas grammar-templates.json NYATA — dilaporkan dan >= ambang 50%.
//     Angka nyata saat gate ditulis: 97/139 = 69,8% (ambang sengaja di bawahnya, lihat
//     header). Kalau konten berubah dan angka turun di bawah 50%, itu regresi konten
//     yang memang harus menghentikan rilis fitur ini.
test('coverage grammar-templates.json nyata >= 50% dan dilaporkan', () => {
  const cov = tutor.coverage(bank.templates);
  console.log('    coverage nyata: ' + cov.withSteps + '/' + cov.total +
    ' template multi-langkah (' + (cov.share * 100).toFixed(1) + '%)');
  assert.strictEqual(cov.total, bank.templates.length);
  assert.ok(cov.withSteps > 0, 'harus ada template multi-langkah');
  assert.ok(cov.share >= 0.5, 'share ' + cov.share.toFixed(3) + ' di bawah ambang 0.5');
  // Bentuk objek utuh juga diterima (kenyamanan pemanggil di app).
  const cov2 = tutor.coverage(bank);
  assert.deepStrictEqual(cov2, cov);
});

// (d) SEMUA naskah ask di data nyata: diakhiri '?' dan berkerangka Indonesia.
//     Kerangka Indonesia diverifikasi lewat penanda yang pasti ada di setiap frame:
//     awalan 'Langkah N:' plus (untuk frame kamus) kata Indonesia khas frame-nya.
test('semua ask di data nyata diakhiri tanda tanya dan berbahasa Indonesia', () => {
  const idWords = /(kenali|petunjuk|terapkan|timbang|singkirkan|periksa|paling cocok|kalimat ini)/;
  let checked = 0, fromDict = 0;
  for (const tpl of bank.templates) {
    const d = tutor.decompose(tpl.stem, tpl);
    for (const s of d.steps) {
      assert.ok(s.ask.endsWith('?'), tpl.id + ': ask tidak diakhiri "?" -> ' + s.ask);
      assert.ok(/^Langkah \d+: /.test(s.ask), tpl.id + ': ask tanpa awalan Langkah -> ' + s.ask);
      assert.ok(typeof s.expect === 'string' && s.expect.length > 0, tpl.id + ': expect kosong');
      assert.ok(/^brain3_step_/.test(s.rationale), tpl.id + ': rationale tanpa prefix brain3_');
      if (s.rationale !== 'brain3_step_fallback') {
        assert.ok(idWords.test(s.ask), tpl.id + ': frame kamus tanpa kata Indonesia -> ' + s.ask);
        fromDict++;
      }
      checked++;
    }
    assert.ok(d.finalAsk.endsWith('?'), tpl.id + ': finalAsk tidak diakhiri "?"');
    assert.ok(d.steps.length <= tutor.MAX_STEPS, tpl.id + ': langkah melebihi MAX_STEPS');
  }
  console.log('    naskah diperiksa: ' + checked + ' langkah, ' + fromDict + ' dari kamus operasi');
  assert.ok(checked >= bank.templates.length, 'tiap template minimal 1 langkah terperiksa');
  // Kamus harus menangani mayoritas besar frasa nyata — kalau tidak, kamusnya fiktif.
  assert.ok(fromDict / checked >= 0.8, 'kamus hanya menangani ' + (100 * fromDict / checked).toFixed(1) + '% frasa');
});

// (e) Input null/rusak aman: tidak melempar, keluaran tetap berbentuk.
test('input null dan rusak aman', () => {
  assert.deepStrictEqual(tutor.stepsFor(null), []);
  assert.deepStrictEqual(tutor.stepsFor(undefined), []);
  assert.deepStrictEqual(tutor.stepsFor({}), []);
  assert.deepStrictEqual(tutor.stepsFor({ reasoningOperation: '   ' }), []);
  assert.deepStrictEqual(tutor.stepsFor({ reasoningOperation: 42 }), []);
  assert.deepStrictEqual(tutor.coverage(null), { total: 0, withSteps: 0, share: 0 });
  assert.deepStrictEqual(tutor.coverage('bukan array'), { total: 0, withSteps: 0, share: 0 });
  const d = tutor.decompose(null, null);
  assert.deepStrictEqual(d.steps, []);
  assert.ok(typeof d.finalAsk === 'string' && d.finalAsk.endsWith('?'), 'finalAsk null-case harus kalimat tanya');
  assert.strictEqual(d.rationale, 'brain3_step_tutor_passthrough');
});

// Rantai > 3 operasi (ada 1 di data nyata: b4_011) dipadatkan ke 3 dengan
// mempertahankan operasi TERAKHIR — titik keputusan yang menentukan jawaban.
test('rantai 4 operasi dipadatkan ke 3 dan mempertahankan operasi terakhir', () => {
  const tpl = bank.templates.find(t => t.id === 'b4_011');
  assert.ok(tpl, 'template b4_011 harus ada');
  const steps = tutor.stepsFor(tpl);
  assert.strictEqual(steps.length, 3);
  // Operasi terakhir b4_011: 'backshift when the past reporting context requires it'.
  // Verba 'backshift' dipetakan kamus ke kategori apply dan dilepas dari objek — jadi
  // yang harus bertahan di langkah 3 adalah OBJEK operasi terakhir itu, bukan verbanya.
  assert.ok(/past reporting context/i.test(steps[2].expect),
    'operasi terakhir (backshift ... past reporting context) harus dipertahankan, dapat: ' + steps[2].expect);
  assert.strictEqual(steps[2].rationale, 'brain3_step_apply');
});

if (failures) { console.error(failures + ' kegagalan'); process.exit(1); }
console.log('Step Tutor: PASS');
