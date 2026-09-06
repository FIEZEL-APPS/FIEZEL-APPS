'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. */
/**
 * tests/question-allocator-test.js — GERBANG BANKOR SEBAGAI MESIN ALOKASI.
 *
 * Dua modul diuji bersama karena keduanya hanya bermakna bersama: ingatan soal
 * per murid (`fiezel-question-memory.js`) dan alokator yang membacanya
 * (`fiezel-question-allocator.js`).
 *
 * Yang dijaga, dan tiap butir adalah kegagalan yang benar-benar bisa terjadi:
 *
 *  1. SOAL MANUAL ADALAH PERINTAH. Set yang dipilih guru dikembalikan apa adanya —
 *     diuji dengan ingatan murid yang dirancang supaya alokator SANGAT ingin
 *     mengubahnya. Ini aturan produk, bukan detail teknis: guru yang memilih empat
 *     soal tertentu sedang mengajar sesuatu, dan sistem yang "memperbaiki"
 *     pilihan itu membatalkan keputusan pengajaran.
 *
 *  2. DUA MURID, DUA SET. Satu tugas guru harus melahirkan set berbeda untuk murid
 *     dengan riwayat berbeda — itu seluruh alasan fitur ini ada.
 *
 *  3. KEBARUAN KONSEP, BUKAN CUMA KEBARUAN ID. Dua puluh id berbeda yang menguji
 *     lima konsep sama adalah lima soal yang diulang empat kali, dan tidak ada
 *     pemeriksaan berbasis id yang bisa melihatnya.
 *
 *  4. KEKURANGAN TIDAK PERNAH DITAMBAL DIAM-DIAM. Kolam habis harus DILAPORKAN
 *     (`relaxed` / `repeated` / `short`), bukan ditutupi dengan pengulangan yang
 *     tampak seperti soal baru.
 *
 *  5. DETERMINISTIK. Seed sama -> set sama. Tanpa ini, kegagalan tidak bisa dikejar.
 */
const assert = require('assert');
const path = require('path');

const MEM = require(path.join(__fzRoot, 'features/brain/fiezel-question-memory.js'));
const ALLOC = require(path.join(__fzRoot, 'features/brain/fiezel-question-allocator.js'));

/* Modul alokator mencari FiezelQuestionMemory di global; di Node keduanya dimuat
   lewat require, jadi globalnya dipasang di sini — sama seperti di halaman. */
globalThis.FiezelQuestionMemory = MEM;

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const T0 = 1788600000000;
const DAY = 86400000;

/** Butir bank tiruan berbentuk sama dengan keluaran FiezelReviewBank. */
function item(id, marker, skill) {
  return { id: id, skill: skill || 'past_tense', marker: marker, prompt: 'x', options: ['a', 'b'], answer: 0 };
}
/** Kolam n butir, masing-masing konsep sendiri (kecuali diminta lain). */
function pool(n, opts) {
  const o = opts || {};
  const out = [];
  for (let i = 0; i < n; i++) {
    const marker = o.sharedConcepts ? 'k' + (i % o.sharedConcepts) : 'k' + i;
    out.push(item('q' + i, marker));
  }
  return out;
}
function jawab(memory, id, ok, at, extra) {
  return MEM.recordAttempt(memory, Object.assign({ item: id, ok: ok, at: at, skill: 'past_tense' }, extra || {}));
}

/* ------------------------------------------------------- 1. ingatan: keadaan */

test('ingatan: butir tanpa riwayat adalah unseen', () => {
  assert.strictEqual(MEM.stateOf(MEM.emptyMemory(), 'q1', T0), 'unseen');
});

test('ingatan: dua benar berturut-turut = mastered, dan tetap mastered saat masih segar', () => {
  let m = jawab(MEM.emptyMemory(), 'q1', true, T0);
  m = jawab(m, 'q1', true, T0 + DAY * 3);
  assert.strictEqual(MEM.stateOf(m, 'q1', T0 + DAY * 5), 'mastered');
});

test('KUNCI: yang dikuasai lama TIDAK dianggap dikuasai — ia due-for-review', () => {
  let m = jawab(MEM.emptyMemory(), 'q1', true, T0);
  m = jawab(m, 'q1', true, T0 + DAY);
  assert.strictEqual(MEM.stateOf(m, 'q1', T0 + DAY * 40), 'due-for-review',
    'dikuasai enam bulan lalu bukan dikuasai — ia belum diuji ulang');
});

test('KUNCI: butir yang baru saja tampil tidak boleh muncul lagi, walau ia lemah', () => {
  let m = jawab(MEM.emptyMemory(), 'q1', false, T0);
  m = jawab(m, 'q1', false, T0 + 1000);
  assert.strictEqual(MEM.stateOf(m, 'q1', T0 + 2000), 'recently-seen',
    'lemah sekalipun, mengulangnya lima menit kemudian adalah keluhan "soalnya itu-itu saja"');
  assert.strictEqual(MEM.priorityOf('recently-seen'), 0, 'prioritasnya NOL, bukan sekadar rendah');
});

test('ingatan: salah berulang jadi repeated-error dan prioritasnya TERTINGGI', () => {
  let m = MEM.emptyMemory();
  for (let i = 0; i < 4; i++) m = jawab(m, 'q1', false, T0 + i * DAY * 2);
  assert.strictEqual(MEM.stateOf(m, 'q1', T0 + DAY * 10), 'repeated-error');
  const p = MEM.priorityOf('repeated-error');
  for (const s of MEM.STATES) if (s !== 'repeated-error') assert.ok(p > MEM.priorityOf(s), 'lebih tinggi dari ' + s);
});

test('ingatan: konsep diturunkan dari marker, dan butir tanpa marker TIDAK dapat konsep palsu', () => {
  assert.strictEqual(MEM.conceptOf(item('a', 'yesterday')), 'past_tense|yesterday');
  assert.strictEqual(MEM.conceptOf({ id: 'a', skill: 'past_tense' }), null,
    'konsep palsu yang unik per butir membuat pembatas konsep tampak bekerja padahal tidak');
});

test('ingatan: putar ulang aliran yang sama menghasilkan ingatan yang sama', () => {
  const rows = [
    { item: 'q1', ok: true, at: T0 }, { item: 'q2', ok: false, at: T0 + 10 },
    { item: 'q1', ok: false, at: T0 + 20 }
  ];
  assert.deepStrictEqual(MEM.recordAll(MEM.emptyMemory(), rows), MEM.recordAll(MEM.emptyMemory(), rows));
});

/* --------------------------------------------------- 2. aturan yang keras */

test('KUNCI: soal MANUAL dikembalikan apa adanya — Bankor tidak menyentuhnya', () => {
  /* Fixture dirancang supaya SETIAP cara alokator bisa ikut campur akan terlihat:
       q0 = mastered (dan sudah TIDAK segar, jadi penyaring "buang yang dikuasai"
            benar-benar menggigitnya — bukan no-op),
       q1 = recently-seen (penyaring "jangan ulang yang baru lewat" menggigitnya),
       q2 = unseen — prioritas TERTINGGI di antara ketiganya, jadi pengurutan
            berdasarkan prioritas apa pun akan memindahkannya ke depan.
     Urutan yang diminta guru [q0, q1, q2] karena itu SENGAJA berlawanan dengan
     urutan yang akan dipilih alokator, dan deepStrictEqual di bawah menangkapnya. */
  let m = MEM.emptyMemory();
  m = jawab(m, 'q0', true, T0 - DAY * 9);
  m = jawab(m, 'q0', true, T0 - DAY * 5);      // mastered, tidak segar
  m = jawab(m, 'q1', true, T0 - 1000);          // recently-seen
  assert.strictEqual(MEM.stateOf(m, 'q0', T0), 'mastered', 'fixture: q0 memang mastered');
  assert.strictEqual(MEM.stateOf(m, 'q1', T0), 'recently-seen', 'fixture: q1 memang baru lewat');
  assert.strictEqual(MEM.stateOf(m, 'q2', T0), 'unseen', 'fixture: q2 memang belum pernah');
  const manual = [item('q0', 'a'), item('q1', 'b'), item('q2', 'c')];
  const hasil = ALLOC.resolve({ mode: 'manual', items: manual, memory: m, nowMs: T0, count: 20, pool: pool(50) });
  assert.strictEqual(hasil.mode, 'manual');
  assert.deepStrictEqual(hasil.items.map((x) => x.id), ['q0', 'q1', 'q2'], 'urutan dan isi identik');
  assert.strictEqual(hasil.allocation, null, 'nol keputusan alokasi tercatat');
});

test('KUNCI: satu tugas, dua murid berbeda riwayat, dua set berbeda', () => {
  const P = pool(40);
  let andi = MEM.emptyMemory(), siti = MEM.emptyMemory();
  /* Andi sudah menguasai 20 butir pertama; Siti menguasai 20 butir terakhir. */
  for (let i = 0; i < 20; i++) {
    andi = jawab(andi, 'q' + i, true, T0 - DAY * 10);
    andi = jawab(andi, 'q' + i, true, T0 - DAY * 5);
    siti = jawab(siti, 'q' + (i + 20), true, T0 - DAY * 10);
    siti = jawab(siti, 'q' + (i + 20), true, T0 - DAY * 5);
  }
  const a = ALLOC.allocate({ pool: P, memory: andi, count: 10, nowMs: T0, seed: 'andi' });
  const s = ALLOC.allocate({ pool: P, memory: siti, count: 10, nowMs: T0, seed: 'siti' });
  assert.strictEqual(a.count, 10); assert.strictEqual(s.count, 10);
  const sama = a.items.filter((x) => s.items.some((y) => y.id === x.id)).length;
  assert.ok(sama <= 2, 'dua murid mendapat set yang berbeda (tumpang tindih ' + sama + '/10)');
  /* Dan yang dikuasai dihindari, bukan sekadar diacak. */
  assert.ok(!a.picks.some((p) => Number(p.id.slice(1)) < 20),
    'Andi tidak menerima butir yang sudah ia kuasai');
});

test('KUNCI: kebaruan KONSEP dijaga, bukan cuma kebaruan id', () => {
  /* 40 butir, hanya 4 konsep. Tanpa pembatas konsep, murid menerima 12 id berbeda
     yang menguji 4 hal saja — bug yang tidak terlihat oleh pemeriksaan id. */
  const P = pool(40, { sharedConcepts: 4 });
  const r = ALLOC.allocate({ pool: P, memory: MEM.emptyMemory(), count: 12, nowMs: T0, seed: 'x', conceptCap: 2 });
  const perKonsep = {};
  r.picks.forEach((p) => { perKonsep[p.concept] = (perKonsep[p.concept] || 0) + 1; });
  const maks = Math.max(...Object.values(perKonsep));
  assert.ok(maks <= 2 || r.relaxed, 'pembatas konsep ditegakkan, atau pelonggarannya DILAPORKAN');
  assert.strictEqual(r.relaxed, true, 'kolam 4 konsep tidak bisa memberi 12 butir tanpa dilonggarkan');
});

test('KUNCI: kekurangan DILAPORKAN, tidak ditambal diam-diam', () => {
  const P = pool(3);
  const r = ALLOC.allocate({ pool: P, memory: MEM.emptyMemory(), count: 10, nowMs: T0, seed: 'x' });
  assert.strictEqual(r.count, 3, 'hanya 3 yang ada');
  assert.strictEqual(r.short, true, 'kekurangannya diakui');
  assert.strictEqual(r.requested, 10, 'jumlah yang diminta tetap tercatat');
});

test('KUNCI: butir yang baru dikerjakan hanya dipakai kalau benar-benar tidak ada lagi — dan ditandai', () => {
  const P = pool(4);
  let m = MEM.emptyMemory();
  for (let i = 0; i < 4; i++) m = jawab(m, 'q' + i, true, T0 - 1000); // semua baru saja
  const r = ALLOC.allocate({ pool: P, memory: m, count: 4, nowMs: T0, seed: 'x' });
  assert.strictEqual(r.count, 4, 'jumlahnya tetap dipenuhi');
  assert.strictEqual(r.repeated, true, 'tetapi murid TIDAK dibohongi bahwa ini soal baru');
});

test('alokator: yang belum pernah dilihat didahulukan atas yang sudah dikuasai', () => {
  const P = pool(10);
  let m = MEM.emptyMemory();
  for (let i = 0; i < 5; i++) { m = jawab(m, 'q' + i, true, T0 - DAY * 9); m = jawab(m, 'q' + i, true, T0 - DAY * 8); }
  const r = ALLOC.allocate({ pool: P, memory: m, count: 5, nowMs: T0, seed: 'x' });
  assert.ok(r.picks.every((p) => p.state === 'unseen'), 'lima butir unseen dipilih lebih dulu');
});

test('alokator: yang sering salah didahulukan atas yang belum pernah dilihat', () => {
  const P = pool(10);
  let m = MEM.emptyMemory();
  for (let i = 0; i < 4; i++) m = jawab(m, 'q0', false, T0 - DAY * (9 - i));
  const r = ALLOC.allocate({ pool: P, memory: m, count: 3, nowMs: T0, seed: 'x' });
  assert.strictEqual(r.picks[0].id, 'q0', 'butir dengan pola salah berulang diambil pertama');
  assert.strictEqual(r.picks[0].state, 'repeated-error');
});

test('alokator: seed sama -> set sama; seed beda -> urutan beda', () => {
  const P = pool(30);
  const a1 = ALLOC.allocate({ pool: P, memory: MEM.emptyMemory(), count: 8, nowMs: T0, seed: 'murid-1' });
  const a2 = ALLOC.allocate({ pool: P, memory: MEM.emptyMemory(), count: 8, nowMs: T0, seed: 'murid-1' });
  const b = ALLOC.allocate({ pool: P, memory: MEM.emptyMemory(), count: 8, nowMs: T0, seed: 'murid-2' });
  assert.deepStrictEqual(a1.items.map((x) => x.id), a2.items.map((x) => x.id), 'deterministik');
  assert.notDeepStrictEqual(a1.items.map((x) => x.id), b.items.map((x) => x.id), 'murid berbeda, urutan berbeda');
});

test('alokator: mode constrained tidak pernah keluar dari kolam yang disaring guru', () => {
  const dibolehkan = pool(6);
  const r = ALLOC.resolve({
    mode: 'constrained', pool: dibolehkan, memory: MEM.emptyMemory(),
    count: 6, nowMs: T0, seed: 'x'
  });
  const sah = new Set(dibolehkan.map((x) => x.id));
  assert.ok(r.items.every((x) => sah.has(x.id)), 'setiap butir berasal dari kolam batasan guru');
});

test('alokator: butir tanpa id dibuang, bukan diloloskan', () => {
  const r = ALLOC.allocate({
    pool: [{ marker: 'a', skill: 'past_tense' }, item('q1', 'b')],
    memory: MEM.emptyMemory(), count: 2, nowMs: T0, seed: 'x'
  });
  assert.strictEqual(r.count, 1, 'butir tanpa id tidak bisa diingat, jadi ia akan tampil selamanya');
});

test('modul murni: nol jam dan nol acak di kedua berkas', () => {
  const fs = require('fs');
  for (const f of ['fiezel-question-memory.js', 'fiezel-question-allocator.js']) {
    const src = fs.readFileSync(path.join(__fzRoot, 'features/brain', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
    assert.ok(!/Date\s*\.\s*now/.test(src), f + ': nol Date.now di kode');
    assert.ok(!/Math\s*\.\s*random/.test(src), f + ': nol Math.random di kode');
  }
});

(async () => {
  let pass = 0; let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS ' + name); pass++; }
    catch (e) { console.error('FAIL ' + name + ' — ' + e.message); fail++; }
  }
  console.log('\nquestion-allocator: ' + pass + '/' + (pass + fail) + ' lulus');
  process.exit(fail ? 1 : 0);
})();
