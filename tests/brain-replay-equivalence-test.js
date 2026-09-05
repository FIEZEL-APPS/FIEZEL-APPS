#!/usr/bin/env node
/**
 * GERBANG KESETARAAN PUTAR-ULANG (tests/brain-replay-equivalence-test.js)
 *
 * KENAPA GERBANG INI MEMIKUL SELURUH RANCANGAN SINKRON
 * ----------------------------------------------------
 * Model otak tidak bisa digabung dengan cara digabung. BKT adalah pembaruan Bayesian
 * berurutan, stabilitas FSRS bergantung jalur, dan ledger miskonsepsi adalah akumulasi
 * log-odds dengan peluruhan waktu. Dua perangkat yang belajar terpisah menghasilkan dua model
 * yang TIDAK punya operasi gabungan yang bermakna — merata-ratakan L dari dua BKT tidak
 * menghasilkan keyakinan siapa pun.
 *
 * Jalan keluarnya bersandar pada satu sifat yang sudah dikontrakkan Braincore v3: setiap modul
 * MURNI, dan waktu selalu argumen. Kalau benar demikian, seluruh model otak adalah fungsi
 * deterministik dari ALIRAN PERCOBAAN. Maka sinkronisasi tidak perlu menggabungkan model:
 * gabungkan alirannya (append-only, idempoten lewat attemptId), urutkan menurut waktu, lalu
 * PUTAR ULANG modul murninya. Hasilnya satu model yang benar, bukan kompromi dua model salah.
 *
 * Seluruh rancangan itu bertumpu pada satu klaim yang bisa salah: putar-ulang menghasilkan
 * keadaan yang SAMA PERSIS dengan pembaruan bertahap, dan urutan kedatangan antar-perangkat
 * tidak mengubah apa pun setelah diurutkan. Gerbang ini membuktikannya SEBELUM satu byte pun
 * dikirim ke mana pun. Kalau ia merah, rancangannya yang salah — bukan gerbangnya.
 *
 * YANG DI-ASSERT
 *   E1  putar-ulang dari kosong == pembaruan bertahap, untuk BKT, ledger, dan kalibrasi item;
 *   E2  urutan kedatangan perangkat tidak berpengaruh: (HP lalu laptop) == (laptop lalu HP)
 *       setelah aliran gabungan diurutkan menurut waktu;
 *   E3  determinisme: dua putar-ulang atas aliran yang sama byte-identik;
 *   E4  idempotensi bukti: menggabungkan aliran dengan dirinya sendiri (attemptId sama) tidak
 *       menggeser model sedikit pun;
 *   RED aliran yang diurutkan SALAH terbukti menghasilkan model berbeda — membuktikan gerbang
 *       ini benar-benar sensitif terhadap urutan, bukan hijau karena kebetulan.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BKT = require('../features/brain/fiezel-mastery-bkt.js');
const LEDGER = require('../features/brain/fiezel-misconception-ledger.js');
const CAL = require('../features/brain/fiezel-item-calibration.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/* PRNG berseed: aliran sintetis harus sama di setiap run, kalau tidak gerbang ini
   mengukur kebetulan. mulberry32, sama dengan yang dipakai modul brain lain. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HARI = 86400000;
const LESSONS = ['present_perfect', 'past_simple', 'conditionals'];
const KONSEP = ['tense_choice', 'aux_agreement'];

/** Aliran percobaan sintetis untuk satu "perangkat". */
function aliran(seed, mulaiMs, jumlah, perangkat) {
  const rnd = mulberry32(seed);
  const rows = [];
  for (let i = 0; i < jumlah; i++) {
    const lesson = LESSONS[Math.floor(rnd() * LESSONS.length)];
    rows.push({
      attemptId: perangkat + '-' + i,
      at: mulaiMs + Math.floor(rnd() * 40) * (HARI / 24),
      lesson: lesson,
      itemId: 'item-' + lesson + '-' + Math.floor(rnd() * 4),
      ok: rnd() > 0.42,
      kappa: 0.4 + Math.round(rnd() * 6) / 10,
      priorDifficulty: 1 + Math.round(rnd() * 40) / 10,
      ability: 2 + Math.round(rnd() * 30) / 10,
      concept: KONSEP[Math.floor(rnd() * KONSEP.length)],
      misconception: 'm' + Math.floor(rnd() * 3),
      sessionId: perangkat + '-s' + Math.floor(i / 7)
    });
  }
  return rows.sort(function (a, b) { return a.at - b.at || (a.attemptId < b.attemptId ? -1 : 1); });
}

/** Terapkan SATU percobaan ke ketiga model — jalur yang sama dipakai bertahap maupun replay. */
function terapkan(st, row) {
  return {
    bkt: BKT.update(st.bkt, { lesson: row.lesson, correct: row.ok, weight: row.kappa }, row.at),
    ledger: LEDGER.update(st.ledger, {
      concept: row.concept, family: 'grammar', misconception: row.misconception,
      correct: row.ok, timing: 'normal', sessionId: row.sessionId
    }, row.at),
    cal: CAL.observe(st.cal, {
      itemId: row.itemId, priorDifficulty: row.priorDifficulty,
      ability: row.ability, ok: row.ok, kappa: row.kappa
    }, row.at)
  };
}

const KOSONG = { bkt: null, ledger: null, cal: null };
function putarUlang(rows) { return rows.reduce(terapkan, KOSONG); }
const cap = (v) => JSON.stringify(v);

/** Union berdasarkan attemptId lalu urut waktu — persis aturan merge S3. */
function gabung(a, b) {
  const byId = new Map();
  for (const row of a.concat(b)) if (!byId.has(row.attemptId)) byId.set(row.attemptId, row);
  return [...byId.values()].sort(function (x, y) { return x.at - y.at || (x.attemptId < y.attemptId ? -1 : 1); });
}

const HP = aliran(42, 1700000000000, 60, 'hp');
const LAPTOP = aliran(1337, 1700000000000 + 3 * HARI, 45, 'lt');

test('E1 · putar-ulang dari kosong == pembaruan bertahap (BKT, ledger, kalibrasi)', () => {
  // "Bertahap" = keadaan dibawa maju satu percobaan demi satu, seperti aplikasi berjalan.
  let bertahap = KOSONG;
  for (const row of HP) bertahap = terapkan(bertahap, row);
  const replay = putarUlang(HP);
  assert.strictEqual(cap(replay.bkt), cap(bertahap.bkt), 'BKT hasil putar-ulang berbeda dari bertahap');
  assert.strictEqual(cap(replay.ledger), cap(bertahap.ledger), 'ledger hasil putar-ulang berbeda dari bertahap');
  assert.strictEqual(cap(replay.cal), cap(bertahap.cal), 'kalibrasi hasil putar-ulang berbeda dari bertahap');
});

test('E2 · urutan kedatangan perangkat tidak berpengaruh setelah diurutkan waktu', () => {
  // Inti sinkron: tidak peduli perangkat mana yang menyetor duluan.
  const a = putarUlang(gabung(HP, LAPTOP));
  const b = putarUlang(gabung(LAPTOP, HP));
  assert.strictEqual(cap(a.bkt), cap(b.bkt), 'BKT bergantung pada perangkat mana yang menyetor duluan');
  assert.strictEqual(cap(a.ledger), cap(b.ledger), 'ledger bergantung pada urutan kedatangan');
  assert.strictEqual(cap(a.cal), cap(b.cal), 'kalibrasi bergantung pada urutan kedatangan');
});

test('E3 · determinisme: dua putar-ulang atas aliran yang sama byte-identik', () => {
  const gabungan = gabung(HP, LAPTOP);
  assert.strictEqual(cap(putarUlang(gabungan)), cap(putarUlang(gabungan)),
    'putar-ulang tidak deterministik — ada sumber acak atau jam tersembunyi di jalur ini');
});

test('E4 · idempoten: menggabungkan aliran dengan dirinya sendiri tidak menggeser model', () => {
  // attemptId yang sama datang dua kali (retry pengiriman) tidak boleh dihitung dua kali.
  const sekali = putarUlang(gabung(HP, LAPTOP));
  const dua = putarUlang(gabung(gabung(HP, LAPTOP), HP));
  assert.strictEqual(cap(sekali.bkt), cap(dua.bkt), 'percobaan terkirim ulang menggeser BKT');
  assert.strictEqual(cap(sekali.ledger), cap(dua.ledger), 'percobaan terkirim ulang menggeser ledger');
  assert.strictEqual(cap(sekali.cal), cap(dua.cal), 'percobaan terkirim ulang menggeser kalibrasi');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · gerbang ini benar-benar sensitif terhadap urutan dan terhadap bukti hilang', () => {
  const gabungan = gabung(HP, LAPTOP);
  const benar = cap(putarUlang(gabungan).bkt);

  // Urutan dibalik: kalau ini TETAP sama, gerbang E2 hijau tanpa membuktikan apa pun.
  const terbalik = cap(putarUlang(gabungan.slice().reverse()).bkt);
  assert.notStrictEqual(terbalik, benar,
    'membalik urutan tidak mengubah model — gerbang ini tidak sensitif, jadi E2 tidak berarti');

  // Satu percobaan dibuang: model harus bergerak, kalau tidak "bukti hilang" tak terdeteksi.
  const kurang = cap(putarUlang(gabungan.slice(0, gabungan.length - 1)).bkt);
  assert.notStrictEqual(kurang, benar,
    'membuang satu percobaan tidak mengubah model — kehilangan bukti tidak akan pernah terlihat');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node tests/brain-replay-equivalence-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL brain replay equivalence: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL brain replay equivalence: PASS (' + checks + ' uji · ' + (HP.length + LAPTOP.length) + ' percobaan dua perangkat)');
