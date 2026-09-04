/**
 * FIEZEL gate — Listening Adaptive v3 (Braincore v3, modul B6).
 *
 * Kebijakan kesulitan adalah tempat paling mudah untuk merusak diagnosis tanpa ketahuan:
 * kalau dua tombol (kecepatan, panjang klip) berubah bersamaan dan hasil murid ikut
 * berubah, tidak ada yang tahu tombol mana yang bekerja. Karena itu gate ini tidak
 * memeriksa "apakah ada kebijakannya", melainkan APAKAH KEPUTUSANNYA BENAR pada kasus
 * yang bisa dinilai tanpa berdebat:
 *
 *   - akurasi tinggi tanpa replay harus menaikkan TEPAT SATU dimensi, tidak dua;
 *   - akurasi rendah harus menurunkan TEPAT SATU dimensi;
 *   - akurasi tinggi yang dibeli dengan banyak replay adalah beban tersembunyi —
 *     kenaikan harus DITAHAN, bukan dirayakan;
 *   - urutan dimensi kontrak (naik: rate -> clip -> replay turun; turun: kebalik)
 *     harus dihormati di SEMUA kombinasi, bukan hanya yang kebetulan terjangkau;
 *   - input kosong/korup harus jatuh ke default aman, bukan melempar exception;
 *   - dan masukan yang sama harus SELALU menghasilkan keputusan yang sama.
 */
const assert = require('assert');
const la = require('./features/brain/fiezel-listening-adaptive.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Riwayat buatan: n baris dengan replays dan correct DITENTUKAN — gate harus deterministik. */
function history(n, replays, correct) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ replays, correct });
  return rows;
}

/** Hitung berapa dimensi yang berbeda antara dua keputusan — inti klaim "satu langkah". */
function dimsChanged(a, b) {
  let changed = 0;
  if (a.rateBand !== b.rateBand) changed++;
  if (a.replayQuota !== b.replayQuota) changed++;
  if (a.clipLength !== b.clipLength) changed++;
  return changed;
}

// Baseline mastery menengah yang dipakai sebagai titik banding di banyak gate.
const BASE = { rateBand: 'natural', replayQuota: 2, clipLength: 'medium' };

// (a) Akurasi tinggi tanpa replay -> naik TEPAT SATU dimensi (rate dulu sesuai urutan).
test('akurasi tinggi tanpa replay menaikkan tepat SATU dimensi (rateBand dulu)', () => {
  const d = la.policy({ mastery: 50, replayHistory: history(6, 0, true), targetSuccess: 0.8 });
  assert.strictEqual(dimsChanged(BASE, d), 1, 'harus tepat satu dimensi yang berubah, bukan ' + dimsChanged(BASE, d));
  assert.strictEqual(d.rateBand, 'fast', 'dimensi pertama yang naik harus kecepatan');
  assert.strictEqual(d.replayQuota, 2);
  assert.strictEqual(d.clipLength, 'medium');
  assert.ok(d.rationale.includes('brain3_listening_step_up_rate'), 'rationale harus menyebut step_up_rate');
});

// (b) Akurasi rendah -> turun TEPAT SATU dimensi (replay quota naik dulu, urutan kebalik).
test('akurasi rendah menurunkan tepat SATU dimensi (replayQuota naik dulu)', () => {
  const d = la.policy({ mastery: 50, replayHistory: history(6, 0, false), targetSuccess: 0.8 });
  assert.strictEqual(dimsChanged(BASE, d), 1, 'harus tepat satu dimensi yang berubah');
  assert.strictEqual(d.replayQuota, 3, 'dimensi pertama yang melunak harus kuota replay');
  assert.strictEqual(d.rateBand, 'natural');
  assert.strictEqual(d.clipLength, 'medium');
  assert.ok(d.rationale.includes('brain3_listening_step_down_replay'));
});

// (c) Akurasi tinggi TAPI replay banyak -> beban tersembunyi, TAHAN (jangan naik, jangan turun).
test('akurasi tinggi + replay rata-rata >= 2 ditahan (beban tersembunyi)', () => {
  const d = la.policy({ mastery: 50, replayHistory: history(6, 3, true), targetSuccess: 0.8 });
  assert.strictEqual(dimsChanged(BASE, d), 0, 'tidak boleh ada dimensi yang berubah');
  assert.ok(d.rationale.includes('brain3_listening_hidden_load_replays'), 'rationale harus menyebut beban tersembunyi');
});

test('ambang beban tersembunyi tepat di rata-rata 2 (bukan 2 lebih sedikit)', () => {
  // Rata-rata replay 1.5 (< 2) dengan akurasi sempurna: kenaikan TIDAK boleh ditahan.
  const mixed = [...history(3, 1, true), ...history(3, 2, true)];
  const d = la.policy({ mastery: 50, replayHistory: mixed, targetSuccess: 0.8 });
  assert.strictEqual(d.rateBand, 'fast', 'replay ringan tidak boleh memblokir kenaikan');
});

// (d) Urutan dimensi dihormati pada SEMUA kombinasi — diuji lewat helper murni yang diekspor,
// supaya kombinasi yang tidak terjangkau baseline mastery pun ikut terjaga.
test('urutan NAIK: rateBand dulu, lalu clipLength, terakhir replayQuota turun', () => {
  let s = la.stepUp({ rateBand: 'slow', replayQuota: 2, clipLength: 'short' });
  assert.deepStrictEqual([s.dims.rateBand, s.dims.clipLength, s.dims.replayQuota], ['natural', 'short', 2]);
  s = la.stepUp({ rateBand: 'fast', replayQuota: 2, clipLength: 'short' });
  assert.deepStrictEqual([s.dims.rateBand, s.dims.clipLength, s.dims.replayQuota], ['fast', 'medium', 2], 'rate mentok -> giliran klip');
  s = la.stepUp({ rateBand: 'fast', replayQuota: 2, clipLength: 'long' });
  assert.deepStrictEqual([s.dims.rateBand, s.dims.clipLength, s.dims.replayQuota], ['fast', 'long', 1], 'rate+klip mentok -> kuota replay turun');
  s = la.stepUp({ rateBand: 'fast', replayQuota: 0, clipLength: 'long' });
  assert.strictEqual(s.rationale, 'brain3_listening_ceiling', 'semua mentok -> ceiling, tidak ada yang berubah');
  assert.deepStrictEqual(s.dims, { rateBand: 'fast', replayQuota: 0, clipLength: 'long' });
});

test('urutan TURUN (kebalik): replayQuota dulu, lalu clipLength, terakhir rateBand', () => {
  let s = la.stepDown({ rateBand: 'natural', replayQuota: 2, clipLength: 'medium' });
  assert.deepStrictEqual([s.dims.replayQuota, s.dims.clipLength, s.dims.rateBand], [3, 'medium', 'natural']);
  s = la.stepDown({ rateBand: 'natural', replayQuota: 3, clipLength: 'medium' });
  assert.deepStrictEqual([s.dims.replayQuota, s.dims.clipLength, s.dims.rateBand], [3, 'short', 'natural'], 'replay penuh -> giliran klip');
  s = la.stepDown({ rateBand: 'natural', replayQuota: 3, clipLength: 'short' });
  assert.deepStrictEqual([s.dims.replayQuota, s.dims.clipLength, s.dims.rateBand], [3, 'short', 'slow'], 'replay+klip mentok -> kecepatan melambat');
  s = la.stepDown({ rateBand: 'slow', replayQuota: 3, clipLength: 'short' });
  assert.strictEqual(s.rationale, 'brain3_listening_floor', 'semua di lantai -> floor, tidak ada yang berubah');
});

test('urutan juga terlihat lewat policy: mastery tinggi yang sempurna mengorbankan replay', () => {
  // Baseline mastery tinggi = fast/1/long: rate dan klip sudah maksimal,
  // jadi satu-satunya kenaikan yang sah adalah kuota replay 1 -> 0.
  const d = la.policy({ mastery: 90, replayHistory: history(6, 0, true), targetSuccess: 0.8 });
  assert.strictEqual(d.rateBand, 'fast');
  assert.strictEqual(d.clipLength, 'long');
  assert.strictEqual(d.replayQuota, 0);
  assert.ok(d.rationale.includes('brain3_listening_step_up_replay'));
});

// (e) Input kosong/korup -> default aman {natural, 2, medium}, tanpa exception.
test('input kosong jatuh ke default natural / 2 replay / medium', () => {
  for (const input of [undefined, null, {}, { mastery: 'bukan angka' }, { replayHistory: 'korup' },
    { mastery: NaN, replayHistory: [null, 'x', 42], targetSuccess: 'y' }]) {
    const d = la.policy(input);
    assert.strictEqual(d.rateBand, 'natural');
    assert.strictEqual(d.replayQuota, 2);
    assert.strictEqual(d.clipLength, 'medium');
    assert.ok(Array.isArray(d.rationale) && d.rationale.length > 0, 'rationale wajib ada');
    assert.ok(d.rationale.every(code => code.indexOf('brain3_listening_') === 0), 'semua kode berprefix brain3_listening_');
  }
});

test('baris korup di tengah riwayat dibuang, bukan meledak', () => {
  const rows = [null, 'x', { replays: -5, correct: true }, { replays: 'q', correct: true },
    { replays: 0, correct: true }, { replays: 0, correct: true }, { replays: 0, correct: true }, { replays: 0, correct: true }];
  const d = la.policy({ mastery: 50, replayHistory: rows, targetSuccess: 0.8 });
  // 6 baris valid tersisa, semua benar tanpa beban replay berarti -> naik satu dimensi.
  assert.strictEqual(d.rateBand, 'fast');
});

test('bukti tipis (< 3 baris) menahan baseline meski hasilnya sempurna', () => {
  const d = la.policy({ mastery: 50, replayHistory: history(2, 0, true), targetSuccess: 0.8 });
  assert.strictEqual(dimsChanged(BASE, d), 0, 'dua jawaban belum layak menggeser kesulitan');
  assert.ok(d.rationale.includes('brain3_listening_insufficient_evidence'));
});

test('dalam pita target (±0.1) kesulitan ditahan', () => {
  // 5 benar dari 6 = 0.833; target 0.8 -> dalam pita, tahan.
  const rows = [...history(5, 0, true), ...history(1, 0, false)];
  const d = la.policy({ mastery: 50, replayHistory: rows, targetSuccess: 0.8 });
  assert.strictEqual(dimsChanged(BASE, d), 0);
  assert.ok(d.rationale.includes('brain3_listening_hold_in_band'));
});

test('jendela bukti dibatasi 6 terakhir — sejarah lama tidak ikut memutuskan', () => {
  // 20 kegagalan lama diikuti 6 keberhasilan bersih: keputusan harus membaca 6 terakhir.
  const rows = [...history(20, 0, false), ...history(6, 0, true)];
  const d = la.policy({ mastery: 50, replayHistory: rows, targetSuccess: 0.8 });
  assert.strictEqual(d.rateBand, 'fast', 'hanya jendela terakhir yang boleh bicara');
});

// (f) Determinisme: masukan yang sama -> keputusan yang sama, berapa kali pun dipanggil.
test('deterministik: masukan sama menghasilkan keputusan identik', () => {
  const input = { mastery: 62, replayHistory: [...history(4, 1, true), ...history(2, 0, false)], targetSuccess: 0.8 };
  const a = la.policy(input);
  const b = la.policy(JSON.parse(JSON.stringify(input)));
  assert.deepStrictEqual(a, b);
  // policy juga tidak boleh memutasi masukan pemanggil (murni sungguhan, bukan pura-pura).
  assert.strictEqual(input.replayHistory.length, 6);
  assert.strictEqual(input.mastery, 62);
});

// explain() menerjemahkan setiap kode ke kalimat Indonesia — layar "kenapa" tidak mengarang.
test('explain menerjemahkan kode dan keputusan utuh ke kalimat Indonesia', () => {
  const text = la.explain('brain3_listening_hidden_load_replays');
  assert.ok(typeof text === 'string' && text.length > 20);
  assert.ok(/replay/i.test(text), 'penjelasan beban tersembunyi harus menyebut replay');
  const d = la.policy({ mastery: 50, replayHistory: history(6, 0, true) });
  const full = la.explain(d);
  assert.ok(typeof full === 'string' && full.length > 20, 'keputusan utuh juga bisa dijelaskan');
  const unknown = la.explain('brain3_listening_kode_tak_dikenal');
  assert.ok(typeof unknown === 'string' && unknown.length > 0, 'kode asing tetap dapat kalimat, bukan undefined');
});

// Bentuk keluaran sesuai kontrak FINAL — nilai selalu dari domain yang sah.
test('keluaran selalu dari domain kontrak (rateBand/replayQuota/clipLength sah)', () => {
  const inputs = [
    { mastery: 0, replayHistory: history(6, 0, false) },
    { mastery: 100, replayHistory: history(6, 0, true) },
    { mastery: 999, replayHistory: history(6, 5, true) },
    { mastery: -50, replayHistory: history(6, 0, true) }
  ];
  for (const input of inputs) {
    const d = la.policy(input);
    assert.ok(la.RATE_BANDS.includes(d.rateBand));
    assert.ok(la.CLIP_LENGTHS.includes(d.clipLength));
    assert.ok(Number.isInteger(d.replayQuota) && d.replayQuota >= 0 && d.replayQuota <= 3);
  }
});

if (failures > 0) {
  console.error('ListeningAdaptive: FAIL (' + failures + ' gagal)');
  process.exit(1);
}
console.log('ListeningAdaptive: PASS');
