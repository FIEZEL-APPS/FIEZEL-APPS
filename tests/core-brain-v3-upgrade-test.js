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
const brain = require('../features/brain/fiezel-core-brain.js');

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

// =============================================================================================
// FASE 2 (B1) — momentum residual (council fable §2.4 / P5) + credibility & sd Glicko
// =============================================================================================

// ---- 8a. momentum residual: tren tidak lagi terkonfounding kebijakan adaptifnya sendiri ----

test('theta naik di bawah kebijakan penjepit akurasi 0.80 -> residual improving, akurasi mentah plateau', () => {
  // Council fable §2.4: Model B menyetel kesulitan agar akurasi teramati menempel 0.80,
  // jadi murid yang belajar pesat terlihat datar. Fixture: 8 blok, akurasi per blok
  // KONSTAN 0.8 (4 benar dari 5), tetapi `predicted` saat penyajian makin rendah karena
  // taksiran model tertinggal di belakang theta yang naik linier — residual (ok-predicted)
  // positif dan membesar sistematis.
  const rows = [];
  for (let b = 0; b < 8; b++) {
    for (let j = 0; j < 5; j++) {
      rows.push({
        at: NOW - (40 - (b * 5 + j)) * 3600000,
        ok: j !== 4, // tiap blok: 4 benar, 1 salah -> akurasi blok selalu 0.8
        predicted: 0.8 - 0.035 * b, // prediksi konstan per blok tapi makin di bawah realita
        type: 'grammar', difficulty: 3
      });
    }
  }
  const residual = brain.momentum(rows);
  assert.strictEqual(residual.basis, 'residual', 'semua baris punya predicted -> basis residual');
  assert.strictEqual(residual.state, 'improving',
    'residual positif sistematis harus terbaca improving, dapat ' + residual.state + ' slope=' + residual.slope);
  assert.ok(residual.slope >= 0.03, 'slope residual ' + residual.slope + ' harus >= ambang 0.03');
  // Baris yang sama TANPA predicted: tren akurasi mentah buta terhadap kemajuan ini.
  const stripped = rows.map(({ predicted, ...rest }) => rest);
  const raw = brain.momentum(stripped);
  assert.strictEqual(raw.basis, 'accuracy');
  assert.strictEqual(raw.state, 'plateau', 'akurasi mentah konstan 0.8 harus plateau, dapat ' + raw.state);
});

test('basis residual butuh >=60% baris ber-predicted; di bawah itu jatuh ke akurasi', () => {
  const make = (withPredicted) => {
    const rows = [];
    for (let i = 0; i < 40; i++) {
      const row = { at: NOW - (40 - i) * 3600000, ok: i % 5 !== 4 };
      if (i < withPredicted) row.predicted = 0.7;
      rows.push(row);
    }
    return rows;
  };
  assert.strictEqual(brain.momentum(make(24)).basis, 'residual', '24/40 = 60% tepat -> residual');
  assert.strictEqual(brain.momentum(make(23)).basis, 'accuracy', '23/40 < 60% -> perilaku lama');
  // predicted di luar 0..1 atau bukan angka tidak dihitung sebagai prediksi valid.
  const junk = make(0).map(r => ({ ...r, predicted: 'x' }));
  assert.strictEqual(brain.momentum(junk).basis, 'accuracy');
});

// ---- 8a-bis. ambang residual ASIMETRIS (tindak lanjut gate simulator B5) -------------------

// Pembentuk fixture: tiap baris membawa residual PERSIS m (m>=0: benar dengan predicted 1-m;
// m<0: salah dengan predicted -m), lima baris per blok -> mean blok = m. Dengan begitu slope
// dan r^2 deret residual bisa dikontrol angka per angka.
function rowsFromBlockMeans(means) {
  const rows = [];
  const n = means.length * 5;
  let idx = 0;
  for (const m of means) {
    for (let j = 0; j < 5; j++) {
      const at = NOW - (n - idx) * 3600000;
      idx++;
      if (m >= 0) rows.push({ at, ok: true, predicted: 1 - m });
      else rows.push({ at, ok: false, predicted: -m });
    }
  }
  return rows;
}

test('taksiran yang menyusul murid membaik TIDAK berlabel declining (slope -0.03..-0.05 -> plateau)', () => {
  // Temuan simulator B5 (B5-adaptivity-simulation-v3-phase2-findings.md): pada murid yang
  // theta-nya naik, taksiran kemampuan menyusul lalu sedikit melampaui kinerja nyata —
  // residual bergerak dari positif ke sedikit negatif dengan kemiringan landai. Ambang
  // simetris ±0.03 mencap ini 'declining' (false decline 0.051->0.091 di simulator);
  // ambang asimetris menyebutnya plateau: menahan kesulitan, bukan menurunkannya.
  const catchup = [0.10, 0.0686, 0.0371, 0.0057, -0.0257, -0.0571, -0.0886, -0.12];
  const read = brain.momentum(rowsFromBlockMeans(catchup));
  assert.strictEqual(read.basis, 'residual');
  assert.ok(read.slope <= -0.03 && read.slope > -0.06,
    'prasyarat tes: slope di pita bekas-declining (dapat ' + read.slope + ')');
  assert.strictEqual(read.state, 'plateau',
    'taksiran menyusul harus plateau, dapat ' + read.state + ' (slope ' + read.slope + ', r2 ' + read.r2 + ')');
});

test('slope curam tapi berderau (r2 < 0.4) juga bukan declining — kemiringan harus nyata', () => {
  const noisy = [0.42, -0.3, 0.36, -0.42, 0.06, -0.36, 0.18, -0.48];
  const read = brain.momentum(rowsFromBlockMeans(noisy));
  assert.strictEqual(read.basis, 'residual');
  assert.ok(read.slope <= -0.06, 'prasyarat tes: slope memang curam (dapat ' + read.slope + ')');
  assert.ok(read.r2 < 0.4, 'prasyarat tes: r2 memang rendah (dapat ' + read.r2 + ')');
  assert.strictEqual(read.state, 'plateau', 'derau blok bukan bukti kemunduran, dapat ' + read.state);
});

test('murid yang benar-benar memburuk tetap declining, dan improving tetap cukup +0.03', () => {
  // Asimetri tidak boleh membutakan arah turun yang sungguhan: residual yang melorot curam
  // (slope -0.06) dan konsisten (r2 = 1) tetap declining.
  const decline = [0.14, 0.08, 0.02, -0.04, -0.10, -0.16, -0.22, -0.28];
  const worse = brain.momentum(rowsFromBlockMeans(decline));
  assert.strictEqual(worse.state, 'declining',
    'kemunduran nyata harus tetap terbaca: ' + worse.state + ' (slope ' + worse.slope + ', r2 ' + worse.r2 + ')');
  assert.ok(worse.slope <= -0.06 && worse.r2 >= 0.4, 'prasyarat tes: memenuhi kedua syarat declining');
  // Arah naik tidak berubah ambangnya — cerminan fixture yang sama.
  const improve = brain.momentum(rowsFromBlockMeans(decline.slice().reverse()));
  assert.strictEqual(improve.state, 'improving', 'improving tetap slope >= +0.03');
  // residualStreak: bahan histeresis pemanggil — blok beruntun terakhir yang setanda.
  assert.strictEqual(worse.residualStreak, -5, '5 blok terakhir di bawah prediksi -> -5');
  assert.strictEqual(improve.residualStreak, 3, 'deret terbalik: 3 blok terakhir di atas prediksi -> +3');
  // Field ini HANYA milik basis residual — basis accuracy tetap bentuk lama.
  const plain = decline.map((m, i) => ({ at: NOW - (8 - i) * 3600000 * 5, ok: i < 4 }));
  assert.ok(!('residualStreak' in brain.momentum(plain.concat(plain).concat(plain))),
    'basis accuracy tidak boleh membawa residualStreak');
});

// ---- 8b. credibility: bukti berkualitas rendah menggeser kemampuan lebih sedikit ----------

test('200 baris credibility 0.3 menggeser ability < separuh dibanding credibility 1.0', () => {
  // Kontrak Fase 2: credibility mengalikan bobot langkah (recency*credibility). Fixture:
  // 200 jawaban benar harian pada soal di atas kemampuan — sinyal "naik" yang identik,
  // hanya kredibilitasnya yang berbeda (mis. semua berlabel tebakan kappa=0.3).
  const make = (credibility) => {
    const rows = [];
    for (let i = 0; i < 200; i++) {
      rows.push({ at: NOW - (200 - i) * DAY, ok: true, difficulty: 4, credibility });
    }
    return rows;
  };
  const prior = 1.5;
  const full = brain.estimateAbility(make(1), { now: NOW, prior });
  const weak = brain.estimateAbility(make(0.3), { now: NOW, prior });
  const shiftFull = full.ability - prior;
  const shiftWeak = weak.ability - prior;
  assert.ok(shiftFull > 0.5, 'prasyarat tes: bukti penuh harus menggeser berarti (dapat ' + shiftFull + ')');
  assert.ok(shiftWeak > 0, 'bukti lemah tetap menggeser searah, hanya lebih sedikit');
  assert.ok(shiftWeak < 0.5 * shiftFull,
    'geser credibility 0.3 (' + shiftWeak.toFixed(3) + ') harus < separuh geser credibility 1.0 (' + shiftFull.toFixed(3) + ')');
  // Default 1: baris TANPA field credibility identik dengan credibility eksplisit 1.0.
  const bare = brain.estimateAbility(make(1).map(({ credibility, ...rest }) => rest), { now: NOW, prior });
  assert.deepStrictEqual(bare, full, 'tanpa field credibility harus identik dengan credibility 1');
});

test('semantik lama estimateAbility utuh: field v2 identik angka per angka + sd terjepit', () => {
  // Snapshot dihitung dari kode SEBELUM upgrade Fase 2 (fixture 24 jawaban per jam,
  // pola 5-benar-3-salah, difficulty 3, prior 3). Kalau salah satu bergeser, semantik
  // confidence/ability lama sudah berubah — dan itu dilarang kontrak.
  const rows = [];
  for (let i = 0; i < 24; i++) rows.push({ at: NOW - (24 - i) * 3600000, ok: i % 8 < 5, difficulty: 3 });
  const out = brain.estimateAbility(rows, { now: NOW, prior: 3 });
  assert.strictEqual(out.ability, 3.018);
  assert.strictEqual(out.evidence, 24);
  assert.strictEqual(out.effectiveEvidence, 23.59);
  assert.strictEqual(out.confidence, 0.983);
  assert.strictEqual(out.level, 'B1');
  // Keluaran baru: sd dalam jepitan kontrak, sdConfidence = 1 - sd/1.2.
  assert.ok(out.sd >= 0.15 && out.sd <= 1.2, 'sd ' + out.sd + ' di luar 0.15..1.2');
  assert.strictEqual(out.sdConfidence, Math.round((1 - out.sd / 1.2) * 1000) / 1000);
  // Tanpa bukti sama sekali: ketidakpastian penuh, bukan keyakinan palsu.
  const cold = brain.estimateAbility([], { now: NOW });
  assert.strictEqual(cold.sd, 1.2);
  assert.strictEqual(cold.sdConfidence, 0);
});

// ---- 8c. sd gaya Glicko: senggang melebarkan, bukti on-target menyempitkan ----------------

test('sd naik >=25% setelah 30 hari senggang, lalu turun lagi dengan bukti on-target', () => {
  // 80 jawaban per jam pada soal setingkat kemampuan (informasi Fisher maksimal) menekan
  // sd jauh di bawah sd0. Lalu murid menghilang 30 hari: sd' = sqrt(sd^2 + 0.03^2*30).
  const on = [];
  for (let i = 0; i < 80; i++) on.push({ at: NOW - (80 - i) * 3600000, ok: i % 8 < 5, difficulty: 3 });
  const fresh = brain.estimateAbility(on, { now: NOW, prior: 3 });
  const idle = brain.estimateAbility(on, { now: NOW + 30 * DAY, prior: 3 });
  assert.ok(fresh.sd < 0.25, 'prasyarat tes: bukti padat on-target harus menekan sd (dapat ' + fresh.sd + ')');
  assert.ok(idle.sd >= 1.25 * fresh.sd,
    '30 hari senggang: sd ' + fresh.sd + ' -> ' + idle.sd + ', kenaikan < 25%');
  assert.ok(idle.sdConfidence < fresh.sdConfidence, 'sdConfidence harus ikut turun saat senggang');
  // Bukti on-target SETELAH senggang menyempitkan kembali — dua arah, seperti Glicko.
  const back = on.concat(Array.from({ length: 12 }, (_, i) =>
    ({ at: NOW + 30 * DAY + i * 3600000, ok: i % 8 < 5, difficulty: 3 })));
  const recovered = brain.estimateAbility(back, { now: NOW + 30 * DAY + 12 * 3600000, prior: 3 });
  assert.ok(recovered.sd < idle.sd,
    'bukti baru harus menurunkan sd: ' + idle.sd + ' -> ' + recovered.sd);
});

test('24 jawaban off-target (P>0.95) -> sdConfidence lebih rendah daripada 24 on-target', () => {
  // Inti informasi Fisher 3PL: benar di soal yang hampir pasti benar tidak membedakan
  // apa-apa. 24 jawaban gampang tidak boleh memberi keyakinan rentang yang sama dengan
  // 24 jawaban setingkat kemampuan — padahal confidence lama menghitung keduanya sama.
  assert.ok(brain.successProbability(3, 1) > 0.95, 'prasyarat tes: soal difficulty 1 bagi ability 3 memang P>0.95');
  const onTarget = [];
  const offTarget = [];
  for (let i = 0; i < 24; i++) {
    onTarget.push({ at: NOW - (24 - i) * 3600000, ok: i % 8 < 5, difficulty: 3 });
    offTarget.push({ at: NOW - (24 - i) * 3600000, ok: true, difficulty: 1 });
  }
  const near = brain.estimateAbility(onTarget, { now: NOW, prior: 3 });
  const easy = brain.estimateAbility(offTarget, { now: NOW, prior: 3 });
  assert.ok(easy.sdConfidence < near.sdConfidence,
    'off-target sdConfidence ' + easy.sdConfidence + ' harus < on-target ' + near.sdConfidence);
  assert.ok(easy.sd > near.sd, 'sd off-target ' + easy.sd + ' harus > sd on-target ' + near.sd);
});

// ---- 8d. kompat mundur: tanpa predicted, keluaran momentum identik versi sebelum Fase 2 ----

test('tanpa predicted, momentum identik angka per angka dengan versi sebelum Fase 2', () => {
  // Snapshot dihitung dengan kode pra-Fase-2 pada fixture deterministik di bawah. Semua
  // field lama harus sama persis; satu-satunya tambahan adalah basis:"accuracy".
  const fx = (pattern, opts) => brain.momentum(
    pattern.map((ok, i) => ({ at: NOW - (pattern.length - i) * 3600000, ok: !!ok, type: 'grammar', difficulty: 3 })),
    opts);
  const p1 = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1];
  const p2 = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1];
  const p3 = [0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1];
  const expected = [
    [fx(p1), { state: 'plateau', slope: 0.0286, r2: 0.4286, blocks: 8, attempts: 40, latest: 0.8, confidence: 0.629, basis: 'accuracy' }],
    [fx(p2), { state: 'unknown', slope: 0, r2: 0, blocks: 2, attempts: 12, confidence: 0, basis: 'accuracy' }],
    [fx(p3), { state: 'improving', slope: 0.14, r2: 0.8909, blocks: 4, attempts: 23, latest: 0.8, confidence: 0.619, basis: 'accuracy' }],
    [fx(p1, { block: 7 }), { state: 'improving', slope: 0.0429, r2: 0.75, blocks: 5, attempts: 40, latest: 0.857, confidence: 0.698, basis: 'accuracy' }]
  ];
  for (const [actual, want] of expected) {
    assert.deepStrictEqual(actual, want, 'momentum tanpa predicted bergeser: ' + JSON.stringify(actual));
  }
});

// ---- 8e. analyze meneruskan predicted/credibility apa adanya --------------------------------

test('analyze meneruskan predicted ke momentum dan credibility ke estimateAbility', () => {
  const rows = [];
  for (let b = 0; b < 8; b++) {
    for (let j = 0; j < 5; j++) {
      rows.push({
        at: NOW - (40 - (b * 5 + j)) * 3600000,
        ok: j !== 4,
        predicted: 0.8 - 0.035 * b,
        credibility: 0.7,
        type: 'grammar', difficulty: 3
      });
    }
  }
  const out = brain.analyze({ now: NOW, attempts: rows });
  assert.strictEqual(out.momentum.basis, 'residual', 'analyze harus meneruskan predicted ke momentum');
  assert.strictEqual(out.momentum.state, 'improving');
  assert.strictEqual(out.domains.grammar.momentum.basis, 'residual', 'momentum per domain ikut residual');
  assert.ok(isFinite(out.ability.sd) && out.ability.sd >= 0.15 && out.ability.sd <= 1.2, 'ability.sd hadir dan terjepit');
  assert.ok(isFinite(out.ability.sdConfidence), 'ability.sdConfidence hadir');
  // Credibility benar-benar sampai: baris sama dengan credibility 1 menggeser lebih jauh.
  const strong = brain.analyze({ now: NOW, attempts: rows.map(r => ({ ...r, credibility: 1 })) });
  const prior = 1.5;
  assert.ok(Math.abs(out.ability.ability - prior) < Math.abs(strong.ability.ability - prior),
    'credibility 0.7 harus menggeser ability lebih sedikit daripada credibility 1');
});

console.log('');
if (failures) { console.error('FIEZEL Core Brain v3 upgrade: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Core Brain v3 upgrade: PASS');
