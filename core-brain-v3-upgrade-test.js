/**
 * FIEZEL gate — Core Brain v3 upgrade (Braincore v3, A1).
 *
 * Referensi temuan: /home/user/workspace/model-council-claude_opus_5_0.md (§2.2 arah koreksi
 * TARGET_SUCCESS, §2.6 T6 reviewPriority membuang materi terlupakan, §2.9 regresi dua blok)
 * dan /home/user/workspace/model-council-claude_fable_5.md (P2 FSRS-lite: gain bergantung
 * retrievability, lapse tidak reset total).
 *
 * Gate ini menguji EMPAT perbaikan matematis dan satu jaminan kompatibilitas:
 *
 *   1. EFEK SPACING. Review saat ingatan hampir lupa (R=0.5) harus menguatkan JAUH lebih
 *      besar daripada review prematur (R=0.95). Model lama memberi hadiah 1.9× yang sama
 *      untuk keduanya — itu membuat jadwal review dini "terlihat berhasil" padahal boros.
 *   2. ANTI-KERUNTUHAN. Satu lapse setelah delapan sukses tidak boleh menghapus riwayat
 *      penguatan (model lama runtuh >99% karena successes=streak).
 *   3. TIDAK ADA ABSORBING STATE. Materi yang sudah runtuh (r≈0.03) tidak boleh berskor 0
 *      di antrean review — skor 0 berarti materi yang ditinggalkan seminggu tidak akan
 *      pernah muncul lagi, selamanya.
 *   4. MOMENTUM JUJUR. Regresi pada dua blok selalu r²=1, jadi dua blok bukan bukti arah.
 *   5. KOMPAT MUNDUR TOTAL. Item lama tanpa field `stability` harus mendapat halfLife yang
 *      IDENTIK dengan v2 — migrasi berdampingan, bukan big bang.
 */
const assert = require('assert');
const fs = require('fs');
const brain = require('./features/brain/fiezel-core-brain.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-22T12:00:00Z');
const DAY = 86400000;

// ---- 1. updateMemory: efek spacing --------------------------------------------------------

test('gain di ambang lupa (R=0.5) lebih dari 3x gain review prematur (R=0.95)', () => {
  // Council fable P2, gate (1): inti keluarga DSR/FSRS. Review yang terlalu dini hampir
  // tidak menumbuhkan ingatan; review saat retrieval sudah sulit itulah yang menguatkan.
  const spaced = brain.updateMemory({ stability: 10, retrievability: 0.5, difficulty: 3, ok: true });
  const premature = brain.updateMemory({ stability: 10, retrievability: 0.95, difficulty: 3, ok: true });
  const gainSpaced = spaced.stability - 10;
  const gainPremature = premature.stability - 10;
  assert.ok(gainSpaced > 0 && gainPremature > 0, 'sukses selalu menumbuhkan stabilitas');
  assert.ok(gainSpaced > 3 * gainPremature,
    'gain R=0.5 (' + gainSpaced.toFixed(2) + ') harus > 3x gain R=0.95 (' + gainPremature.toFixed(2) + ')');
});

test('updateMemory monoton: sukses tidak menurunkan S, lapse tidak menaikkan S', () => {
  // Council fable P2, gate (4).
  for (const S of [0.5, 2, 10, 50, 200]) {
    for (const R of [0.1, 0.5, 0.9, 0.99]) {
      const up = brain.updateMemory({ stability: S, retrievability: R, difficulty: 3, ok: true });
      const down = brain.updateMemory({ stability: S, retrievability: R, difficulty: 3, ok: false });
      assert.ok(up.stability >= S, 'sukses S=' + S + ' R=' + R + ' menurunkan stabilitas');
      assert.ok(down.stability <= S, 'lapse S=' + S + ' R=' + R + ' menaikkan stabilitas');
    }
  }
});

test('materi sulit tumbuh lebih lambat dan runtuh lebih dalam daripada materi mudah', () => {
  const easyUp = brain.updateMemory({ stability: 10, retrievability: 0.6, difficulty: 1, ok: true });
  const hardUp = brain.updateMemory({ stability: 10, retrievability: 0.6, difficulty: 6, ok: true });
  assert.ok(easyUp.stability > hardUp.stability, 'gain materi mudah harus lebih besar');
  const easyDown = brain.updateMemory({ stability: 10, retrievability: 0.4, difficulty: 1, ok: false });
  const hardDown = brain.updateMemory({ stability: 10, retrievability: 0.4, difficulty: 6, ok: false });
  assert.ok(easyDown.stability >= hardDown.stability, 'materi sulit runtuh lebih dalam saat lapse');
});

test('setiap keluaran updateMemory membawa rationale berprefix brain3_', () => {
  // Kontrak Braincore v3, aturan 4.
  const up = brain.updateMemory({ stability: 5, retrievability: 0.7, difficulty: 3, ok: true });
  const down = brain.updateMemory({ stability: 5, retrievability: 0.7, difficulty: 3, ok: false });
  assert.ok(/^brain3_/.test(up.rationale), 'rationale sukses: ' + up.rationale);
  assert.ok(/^brain3_/.test(down.rationale), 'rationale lapse: ' + down.rationale);
  // Masukan rusak tidak boleh melempar — modul murni menerima angka dan mengembalikan angka.
  for (const bad of [null, undefined, {}, { stability: 'x', retrievability: 'y', ok: true }]) {
    const out = brain.updateMemory(bad);
    assert.ok(isFinite(out.stability) && out.stability > 0, 'masukan rusak harus terdegradasi aman');
  }
});

// ---- 2. updateMemory: anti-keruntuhan ------------------------------------------------------

test('8 sukses + 1 lapse mempertahankan stabilitas di lantai >=10% S, bukan runtuh >99%', () => {
  // Council opus §2.5 / fable §2.3 poin 2: model lama menjatuhkan item 8-sukses dari
  // h≈268 hari ke 0.9 hari (keruntuhan >99%) karena lapse mereset streak DAN mengalikan
  // 0.55. FSRS-lite meruntuhkan SEBAGIAN dengan lantai 10% S — satu hari buruk tidak
  // menghapus berbulan-bulan penguatan.
  let S = 1.6;
  for (let i = 0; i < 8; i++) {
    S = brain.updateMemory({ stability: S, retrievability: 0.9, difficulty: 3, ok: true }).stability;
  }
  assert.ok(S > 30, 'delapan sukses harus membangun stabilitas berarti (dapat ' + S + ' hari)');
  const lapsed = brain.updateMemory({ stability: S, retrievability: 0.4, difficulty: 3, ok: false }).stability;
  assert.ok(lapsed >= 0.1 * S - 1e-9,
    'lapse menjatuhkan S dari ' + S + ' ke ' + lapsed + ' — di bawah lantai 10%');
  assert.ok(lapsed < S, 'lapse tetap harus menurunkan stabilitas');
  // Pembanding eksplisit terhadap keruntuhan v2: v2 menyisakan <1% S; v3 menyisakan >=10%.
  assert.ok(lapsed / S >= 0.1 - 1e-9 && lapsed / S > 0.01, 'rasio sisa: ' + (lapsed / S).toFixed(4));
});

// ---- 3. reviewPriority: faktor penyelamatan ------------------------------------------------

test('item runtuh (r≈0.03) tidak lagi berskor 0 dan masuk 3 teratas antrean', () => {
  // Council opus §2.6 (T6): jendela Gauss murni memberi skor 0.000 pada r=0.031 — di bawah
  // item yang baru dilihat kemarin dan masih 98% teringat. Makin lama ditinggalkan makin
  // kecil skornya: absorbing state. Faktor penyelamatan (1 + 1.5·(1-r)) membuat ekor bawah
  // tetap terurut benar: yang runtuh lebih dangkal diprioritaskan di atas yang runtuh lebih
  // dalam, dan tidak ada yang mati ke nol.
  const ranked = brain.reviewPriority([
    { id: 'masih-segar', halfLifeDays: 30, lastSeenAt: NOW - 1 * DAY },      // r ≈ 0.977
    { id: 'ambang-lupa', halfLifeDays: 2, lastSeenAt: NOW - 2 * DAY },       // r = 0.500
    { id: 'runtuh', halfLifeDays: 2, lastSeenAt: NOW - 10 * DAY },           // r ≈ 0.031
    { id: 'runtuh-dalam', halfLifeDays: 2, lastSeenAt: NOW - 20 * DAY },     // r ≈ 0.001
    { id: 'runtuh-total', halfLifeDays: 2, lastSeenAt: NOW - 40 * DAY }      // r ≈ 0.000001
  ], { now: NOW });
  const at = id => ranked.findIndex(row => row.id === id);
  const of = id => ranked[at(id)];
  assert.ok(Math.abs(of('runtuh').retrievability - 0.031) < 0.002, 'prasyarat tes: r memang ≈0.03');
  assert.ok(of('runtuh').score > 0, 'materi runtuh tidak boleh berskor 0 — skor 0 berarti hilang selamanya');
  assert.ok(at('runtuh') < 3, 'r≈0.03 harus masuk 3 teratas, dapat posisi ' + (at('runtuh') + 1));
  assert.ok(at('runtuh') < at('runtuh-dalam') || of('runtuh').score > of('runtuh-dalam').score,
    'ekor bawah harus tetap terurut: runtuh dangkal di atas runtuh dalam');
  assert.strictEqual(ranked[0].id, 'ambang-lupa', 'puncak efisiensi di ambang lupa tetap nomor satu');
});

test('faktor penyelamatan tidak menggeser urutan antrean sehat (kompat gate v2)', () => {
  // Perubahan skor tidak boleh mengubah keputusan pada kasus yang gate lama sudah nilai
  // benar: ambang-lupa tetap di atas yang masih segar, dan yang paling runtuh tetap paling
  // bawah di antara ketiganya.
  const ranked = brain.reviewPriority([
    { id: 'masih-segar', successes: 5, lapses: 0, difficulty: 2, lastSeenAt: NOW - DAY },
    { id: 'ambang-lupa', successes: 2, lapses: 0, difficulty: 3, lastSeenAt: NOW - 3 * DAY },
    { id: 'sudah-hilang', successes: 0, lapses: 3, difficulty: 6, lastSeenAt: NOW - 60 * DAY }
  ], { now: NOW });
  assert.strictEqual(ranked[0].id, 'ambang-lupa');
  assert.strictEqual(ranked[2].id, 'sudah-hilang');
});

// ---- 4. momentum: minimal tiga blok --------------------------------------------------------

test('momentum dua blok mengaku unknown — regresi dua titik selalu r²=1', () => {
  // Council opus §2.9: pada n=10 (dua blok) garis melalui dua titik apa pun cocok sempurna,
  // sehingga confidence 0.33 yang lama sepenuhnya palsu untuk sinyal yang tidak informatif.
  const twoBlocks = [];
  for (let i = 0; i < 10; i++) twoBlocks.push({ at: NOW - (10 - i) * 3600000, ok: i >= 5 });
  const read = brain.momentum(twoBlocks);
  assert.strictEqual(read.state, 'unknown', 'dua blok bukan bukti arah');
  assert.strictEqual(read.confidence, 0);
  assert.strictEqual(read.blocks, 2);

  // Tiga blok dengan arah yang jelas SUDAH boleh berbicara — syaratnya tidak dinaikkan
  // lebih dari yang dibutuhkan.
  const threeBlocks = [];
  for (let i = 0; i < 15; i++) threeBlocks.push({ at: NOW - (15 - i) * 3600000, ok: i >= 5 });
  assert.strictEqual(brain.momentum(threeBlocks).state, 'improving');
});

// ---- 5. halfLife: kompat mundur total ------------------------------------------------------

test('item dengan field stability memakai nilainya langsung, dijepit 0.2..365 hari', () => {
  assert.strictEqual(brain.halfLife({ stability: 50, successes: 0, lapses: 3, difficulty: 6 }), 50,
    'stability yang ada harus menang atas formula streak');
  assert.strictEqual(brain.halfLife({ stability: 9000 }), 365, 'langit-langit 365 hari');
  assert.strictEqual(brain.halfLife({ stability: 0.01 }), 0.2, 'lantai 0.2 hari');
});

test('item TANPA stability mendapat halfLife yang identik dengan v2 — angka per angka', () => {
  // Snapshot regresi (council fable P2, gate 3): nilai-nilai di bawah dihitung dari formula
  // v2 (1.6 · 1.9^successes · 0.55^lapses · 0.9^(difficulty-1), clamp 0.2..365) SEBELUM
  // upgrade ini. Kalau salah satunya bergeser, migrasi berdampingan sudah bocor.
  const expected = [
    [{ successes: 0, lapses: 0, difficulty: 3 }, 1.296],
    [{ successes: 4, lapses: 0, difficulty: 3 }, 16.89],
    [{ successes: 4, lapses: 2, difficulty: 3 }, 5.109],
    [{ successes: 3, lapses: 0, difficulty: 6 }, 6.48],
    [{ successes: 3, lapses: 0, difficulty: 1 }, 10.974],
    [{ successes: 0, lapses: 3, difficulty: 6 }, 0.2],
    [{}, 1.296]
  ];
  for (const [item, value] of expected) {
    assert.strictEqual(brain.halfLife(item), value,
      'halfLife(' + JSON.stringify(item) + ') bergeser dari nilai v2 ' + value);
  }
  // stability yang BUKAN angka positif juga harus jatuh ke formula lama, bukan melempar.
  for (const bad of [0, -3, 'x', null, NaN]) {
    assert.strictEqual(brain.halfLife({ stability: bad, successes: 4, lapses: 0, difficulty: 3 }), 16.89,
      'stability=' + bad + ' harus terdegradasi ke formula v2');
  }
});

// ---- 6. tanpa Date.now(): waktu selalu argumen ---------------------------------------------

test('modul tidak lagi memanggil Date.now() — waktu selalu argumen', () => {
  // Kontrak Braincore v3, aturan 1. Fallback jam dinding membuat dua pemanggilan dengan
  // masukan identik menghasilkan angka berbeda — gate yang lolos hari ini gagal besok.
  const source = fs.readFileSync('./features/brain/fiezel-core-brain.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!source.includes('Date.now'), 'masih ada Date.now() di jalur kode');
});

test('tanpa `now`, hasil tetap deterministik: usia relatif ke bukti terbaru', () => {
  const attempts = [];
  for (let i = 0; i < 12; i++) {
    attempts.push({ at: NOW - (12 - i) * DAY / 4, ok: i % 2 === 0, type: 'grammar', difficulty: 3 });
  }
  const memory = [{ id: 'x', halfLifeDays: 4, lastSeenAt: NOW - 3 * DAY }];
  const a = brain.analyze({ attempts, memory });
  const b = brain.analyze({ attempts, memory });
  assert.deepStrictEqual(a, b, 'dua pemanggilan identik harus menghasilkan potret identik');
  // Degradasi amannya terbaca: "sekarang" = stempel waktu terbaru di data, bukan jam dinding.
  assert.strictEqual(a.generatedAt, new Date(NOW - DAY / 4).toISOString());
  // Dan saat `now` eksplisit diberikan (jalur app.js), ia yang dipakai.
  assert.strictEqual(brain.analyze({ now: NOW, attempts, memory }).generatedAt, new Date(NOW).toISOString());
  // estimateAbility dan reviewPriority tanpa `now` juga tidak melempar dan deterministik.
  assert.deepStrictEqual(brain.estimateAbility(attempts), brain.estimateAbility(attempts));
  assert.deepStrictEqual(brain.reviewPriority(memory), brain.reviewPriority(memory));
});

// ---- 7. dokumentasi TARGET_SUCCESS ---------------------------------------------------------

test('TARGET_SUCCESS 0.80 didokumentasikan sebagai prior desirable-difficulty, bukan koreksi tebakan', () => {
  // Council opus §2.2: alasan lama ("0.85 teramati setara 0.80 pengetahuan") arah tandanya
  // terbalik — teramati 0.80 justru berarti pengetahuan 0.733, dan target pengetahuan 0.85
  // butuh teramati 0.8875. Nilai konstantanya TIDAK berubah; yang wajib berubah adalah
  // klaim di komentarnya.
  assert.strictEqual(brain.TARGET_SUCCESS, 0.8, 'konstanta tidak berubah — hanya alasannya');
  const source = fs.readFileSync('./features/brain/fiezel-core-brain.js', 'utf8');
  assert.ok(source.includes('0.733'), 'komentar harus menyebut ekuivalen pengetahuan 0.733 dari teramati 0.80');
  assert.ok(source.includes('0.8875'), 'komentar harus menyebut teramati 0.8875 untuk target pengetahuan 0.85');
  assert.ok(/desirable\s+difficulty/i.test(source), 'komentar harus menyatakan 0.80 sebagai prior desirable difficulty');
});

console.log('');
if (failures) { console.error('FIEZEL Core Brain v3 upgrade: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Core Brain v3 upgrade: PASS');
