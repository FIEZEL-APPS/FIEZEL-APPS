/**
 * FIEZEL audio lane gate — langkah denoising sebagai mode diagnostik.
 *
 * Kenapa ini ada, dan kenapa baru sekarang. Lima rilis dihabiskan untuk menebak, lalu empat
 * uji perangkat berturut-turut mencoret tersangka satu per satu:
 *
 *   m025-66  RAW vs CONDITIONED       conditioning bukan penyebabnya (impuls 0, 18/19 no-op)
 *   m025-68  PLAIN BUFFER vs Normal   worklet, fade, dan penjadwalan seam bukan penyebabnya
 *   telemetri                          tidak ada resampling, tidak ada trim, satu potongan
 *   m025-70  NADA UJI                 "mulus sekali" - keluaran perangkat SEHAT
 *
 * Yang tersisa hanya PCM dari model. Modelnya int8 seluruhnya, vocoder-nya int8, dan
 * denoising-nya hanya 4 langkah. Menaikkan langkah adalah tuas termurah: tanpa aset baru,
 * tanpa mengubah kontrak, dan bisa dibatalkan seketika.
 *
 * Gate ini menjaga agar tuas itu tetap DIAGNOSTIK - default produksi tidak boleh ikut
 * berubah diam-diam, dan pilihannya tidak boleh hidup selamanya.
 */
const assert = require('assert');
const fs = require('fs');
const player = require('./features/neural-voice/fiezel-web-audio-player.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function storeEnv() {
  const store = new Map();
  return {
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    _store: store
  };
}

test('tanpa pilihan apa pun, tidak ada override sama sekali', () => {
  // Nol berarti "pakai default produksi", bukan "nol langkah".
  assert.strictEqual(player.denoiseSteps(storeEnv()), 0);
  assert.strictEqual(player.denoiseSteps({}), 0);
  assert.strictEqual(player.denoiseSteps(null), 0);
});

test('hanya nilai yang masuk akal yang diterima', () => {
  const env = storeEnv();
  assert.deepStrictEqual(player.DENOISE_STEPS_ALLOWED.slice(), [4, 8, 16]);
  for (const steps of [4, 8, 16]) {
    assert.strictEqual(player.setDenoiseSteps(steps, env), steps);
    assert.strictEqual(player.denoiseSteps(env), steps);
  }
  // Angka liar tidak boleh sampai ke mesin: 0 melumpuhkan, 200 menggantung perangkat.
  for (const bad of [0, 1, 3, 5, 32, 200, -8, 'delapan', null, NaN]) {
    assert.strictEqual(player.setDenoiseSteps(bad, env), 0, `${bad} seharusnya ditolak`);
    assert.strictEqual(player.denoiseSteps(env), 0, `${bad} seharusnya membersihkan pilihan`);
    player.setDenoiseSteps(8, env);
  }
});

test('pilihan diagnostik tidak hidup selamanya', () => {
  const env = storeEnv();
  const at = Date.now();
  player.setDenoiseSteps(16, env, at);
  assert.strictEqual(player.denoiseSteps(env, at + 60000), 16, 'masih berlaku selama pengujian');
  assert.strictEqual(player.denoiseSteps(env, at + 25 * 60 * 60 * 1000), 0,
    'lewat 24 jam kembali ke default produksi');
});

test('storage rusak atau tidak ada tidak menjatuhkan apa pun', () => {
  const env = storeEnv();
  env._store.set(player.DENOISE_STEPS_KEY, 'bukan json');
  assert.strictEqual(player.denoiseSteps(env), 0);
  assert.strictEqual(player.setDenoiseSteps(8, {}), 0, 'tanpa storage tidak melempar');
});

test('default produksi tetap 4 dan hanya digeser oleh override', () => {
  const env = storeEnv();
  assert.strictEqual(player.DENOISE_STEPS_DEFAULT, 4);
  assert.strictEqual(player.effectiveDenoiseSteps(env), 4, 'tanpa pilihan, tetap 4 seperti produksi hari ini');
  player.setDenoiseSteps(16, env);
  assert.strictEqual(player.effectiveDenoiseSteps(env), 16);
  player.setDenoiseSteps(0, env);
  assert.strictEqual(player.effectiveDenoiseSteps(env), 4, 'kembali ke default setelah dibersihkan');
});

test('kedua bahasa selalu meminta jumlah langkah yang sama', () => {
  // Satu model melayani Inggris dan Indonesia. Selisih langkah di antara keduanya langsung
  // terdengar sebagai dua suara yang berbeda, jadi override tidak boleh menyentuh satu pintu
  // masuk saja - kesalahan yang persis terjadi saat slice ini pertama ditulis.
  const engine = fs.readFileSync('./features/neural-voice/fiezel-supertonic-voice.js', 'utf8');
  const boot = fs.readFileSync('./features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');
  for (const [name, source] of [['supertonic', engine], ['bootstrap', boot]]) {
    assert.ok(/effectiveDenoiseSteps\(/.test(source), `${name} harus memakai helper bersama`);
    assert.ok(/catch\s*\(_\)\s*\{\s*return 4\s*\}?/.test(source.replace(/;/g, '')),
      `${name} harus jatuh ke default 4 bila pembacaan gagal`);
  }
});

test('panel menyediakan pilihannya dan menyebut konsekuensinya', () => {
  const panel = fs.readFileSync('./features/neural-voice/fiezel-diag-panel.js', 'utf8');
  for (const label of ['LANGKAH: 4 (default)', 'LANGKAH: 8', 'LANGKAH: 16']) {
    assert.ok(panel.indexOf(label) !== -1, `tombol ${label} hilang`);
  }
  // Langkah lebih tinggi berarti generate lebih lama - dan jeda itu yang paling OWNER rasakan.
  assert.ok(/lebih halus tetapi lebih lama dibuat/.test(panel),
    'konsekuensi waktu harus tertulis, bukan dibiarkan mengejutkan');
  assert.ok(/Tutup FIEZEL sepenuhnya lalu buka lagi/.test(panel));
  assert.ok(/denoiseSteps: safe\(/.test(panel), 'dump Diagnostics membawa langkah yang aktif');
});

console.log('');
if (failures) { console.error('FIEZEL denoise steps: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL denoise steps: PASS');
