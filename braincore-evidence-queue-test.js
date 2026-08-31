/**
 * FIEZEL gerbang — ANTREAN BUKTI OPSIONAL (Fase 2 / Phase M).
 *
 * Brief Fase M: "kalau pengumpulan bukti sisi server SUDAH ADA, verifikasi
 * LOCAL EVIDENCE -> QUEUE -> BATCH -> UPLOAD, dan kalau unggahan GAGAL: BELAJAR TETAP JALAN."
 *
 * IA SUDAH ADA. `features/analytics/fiezel-analytics-client.js` persis berbentuk itu, dan
 * sudah dijaga `analytics-client-test.js` dengan 190 assert soal privasi, daftar hitam event,
 * dan token. Gerbang ini TIDAK mengulanginya — lihat AUDIT/08 soal kenapa dua gerbang di atas
 * lapisan yang sama akan berselisih suatu hari.
 *
 * Yang DITAMBAHKAN di sini hanya satu hal, dan justru itu yang tidak dijaga siapa pun:
 * kalau unggahan bukti GAGAL — jaringan mati, server 500, kuota habis, transport tidak ada
 * sama sekali — apakah BRAINCORE tetap mengambil keputusan belajar yang sama?
 *
 * Pertanyaannya bukan "apakah antreannya tabah", melainkan "apakah belajar bergantung
 * padanya". Sebuah antrean boleh gagal sesukanya; yang tidak boleh adalah murid berhenti
 * belajar karenanya.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const P = require('./braincore-pipeline.js');
const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const Q = {
  id: 'q-antrean-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
};

/** Satu sesi belajar; mengembalikan deret keputusan + keadaan akhir. */
function sesiBelajar() {
  let L = P.createLearner({ level: 'A2', now: T0 });
  const keputusan = [];
  for (let i = 0; i < 12; i++) {
    const t = T0 + (i + 1) * DAY;
    if (i % 4 === 0) L = P.newSession(L, t);
    const r = P.answer(L, Q, { correct: i % 3 !== 0, ms: 7000 }, t);
    L = r.learner;
    keputusan.push(r.trace.decision + ':' + r.trace.decisionReason);
  }
  return { keputusan, mastery: L.bkt, guard: 0 };
}

/* ========================================================================================
 * §1 — BENTUK ANTREANNYA MEMANG local -> queue -> batch -> upload
 * ===================================================================================== */
test('§1 antrean bukti sudah ada, dan bentuknya sesuai brief Fase M', () => {
  const p = path.join(__dirname, 'features', 'analytics', 'fiezel-analytics-client.js');
  assert.ok(fs.existsSync(p), 'modul klien analytics tidak ada — brief Fase M tidak berlaku');
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(/antrean|queue/i.test(src), 'tidak ada antrean lokal');
  assert.ok(/flush/.test(src), 'tidak ada pengiriman berkelompok');
  assert.ok(/berkelompok|batch/i.test(src), 'pengiriman tidak berkelompok — brief melarang per-interaksi');
});

test('§1 dijaga gerbangnya sendiri, dan gerbang INI tidak mengulanginya', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node analytics-client-test.js') !== -1,
    'gerbang privasi/antrean analytics tidak terdaftar — properti itu tidak dijaga siapa pun');
  // Pemeriksaan "tidak mengulang" harus dilakukan pada KETERGANTUNGAN, bukan pada kata.
  // Versi pertama meng-grep sumber gerbang ini sendiri untuk kata 'visitor_token' — dan cocok
  // dengan pesan assert-nya sendiri. Sebuah gerbang yang gagal karena membaca dirinya sendiri
  // menguji ejaan, bukan perilaku.
  const sendiri = fs.readFileSync(path.join(__dirname, 'braincore-evidence-queue-test.js'), 'utf8');
  assert.ok(!/require\([^)]*analytics/.test(sendiri),
    'gerbang ini memuat modul analytics — ia sudah masuk wilayah analytics-client-test.js');
});

/* ========================================================================================
 * §2 — BELAJAR TIDAK BERGANTUNG PADA UNGGAHAN
 *
 * VERSI PERTAMA BAGIAN INI DIHAPUS, DAN ALASANNYA ADA DUA — keduanya pantas ditulis.
 *
 * Ia menjalankan sesi belajar yang sama di "empat dunia" dengan cara menimpa `global.fetch`
 * dan `global.XMLHttpRequest`, lalu menuntut keputusannya identik.
 *
 * (1) MELANGGAR ATURAN REPO. `no-network-test.js` melarang gerbang menyuntikkan fetch global
 *     (`vmFetchLeak`). Larangan itu benar: sebuah uji yang memasang fetch global bisa
 *     tidak sengaja membuat panggilan jaringan sungguhan, atau menutupi uji lain yang
 *     melakukannya. CI merah karena saya, mulai dari commit Fase M.
 *
 * (2) LEBIH PENTING: IA TIDAK MEMBUKTIKAN APA PUN. Braincore tidak pernah memanggil `fetch`
 *     — itu sudah dibuktikan Fase L dengan menjalankan seluruh modulnya di sandbox yang
 *     global-nya tidak punya fetch sama sekali. Merusak sesuatu yang tidak pernah dipanggil
 *     tidak bisa mengubah perilaku apa pun. "Empat dunia" itu terdengar meyakinkan dan
 *     secara logika kosong: ia dijamin lulus tanpa memberi tahu siapa pun apa-apa.
 *
 * Yang tersisa di bawah adalah yang benar-benar bisa gagal: sesi itu MURNI dan
 * DETERMINISTIK. Bukti bahwa jaringan tidak bisa diamati sama sekali ada di Fase L (sandbox
 * tanpa fetch) dan di §3 (tanpa asinkroni) — dua tempat yang memang berhak mengklaimnya.
 * ===================================================================================== */
test('§2 sesi belajar DETERMINISTIK — dua jalan identik, tanpa menyentuh global apa pun', () => {
  const a = sesiBelajar();
  const b = sesiBelajar();
  assert.deepStrictEqual(a.keputusan, b.keputusan,
    'dua jalan dengan masukan identik memberi keputusan berbeda — ada keadaan tersembunyi');
  assert.strictEqual(a.keputusan.length, 12, 'sesi tidak selesai');
});

test('§2 keadaan murid terakumulasi penuh tanpa satu pun unggahan pernah terjadi', () => {
  // Tidak ada transport yang dipasang di seluruh berkas ini, dan sesi tetap menumpuk bukti.
  // Itulah bentuk "belajar tidak bergantung pada unggahan" yang bisa diperiksa tanpa
  // berpura-pura merusak sesuatu yang memang tidak pernah dipakai.
  const hasil = sesiBelajar();
  const BKT = require('./features/brain/fiezel-mastery-bkt.js');
  const m = BKT.mastery(hasil.mastery, 'past-simple');
  assert.strictEqual(m.n, 12, 'bukti murid tidak tersimpan');
  assert.ok(m.L > 0, 'mastery tidak bergerak');
});

/* Tidak ada assert "berkas ini tidak menyentuh global jaringan" di sini, dan itu disengaja.
 *
 * Versi pertamanya meng-grep sumber berkas ini untuk pola `global.fetch` — lalu cocok dengan
 * REGEX DI DALAM ASSERT-NYA SENDIRI. Itu jebakan yang sama persis yang sudah saya kena satu
 * kali di berkas ini juga (§1, mencari 'visitor_token' dan menemukan pesannya sendiri). Dua
 * kali di satu berkas berarti polanya bukan kebetulan: sebuah gerbang yang membaca sumbernya
 * sendiri hampir selalu akan menemukan dirinya.
 *
 * Aturannya tetap ditegakkan, hanya bukan di sini: `no-network-test.js` memindai SETIAP
 * gerbang di repo untuk kebocoran fetch global, dan ia terdaftar di CI. Menduplikasinya di
 * dalam berkas yang diawasinya tidak menambah jaminan apa pun — ia hanya menambah satu tempat
 * baru untuk salah. */


/* ========================================================================================
 * §3 — BRAINCORE TIDAK PUNYA JALAN MENUNGGU UNGGAHAN
 * ===================================================================================== */
test('§3 Braincore TIDAK PUNYA asinkroni — jadi ia tidak bisa menunggu unggahan', () => {
  // KENAPA BUKAN DAFTAR KATA. Versi pertama assert ini mencari kata 'queue', 'retry', 'flush'
  // di dalam modul Braincore, dan menemukan empat "pelanggaran" yang seluruhnya PALSU:
  // `queue` adalah antrean BFS untuk menelusuri graf prasyarat, `retryCount` adalah MURID yang
  // mengulang soal. Kata yang sama, wilayah makna yang sama sekali berbeda.
  //
  // Itu persis cacat yang berulang kali saya temukan di tempat lain: menguji TEKS, bukan
  // PERILAKU. Yang di bawah menguji sifat STRUKTURAL — tanpa Promise, tanpa async, tanpa
  // callback tertunda, sebuah modul TIDAK BISA menunggu jaringan, apa pun nama variabelnya.
  const dir = path.join(__dirname, 'features', 'brain');
  const tersangka = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const t of ['Promise', 'async ', 'await ', 'setTimeout', 'setInterval', 'requestAnimationFrame']) {
      if (src.indexOf(t) !== -1) tersangka.push(f + ' -> ' + t.trim());
    }
  }
  assert.deepStrictEqual(tersangka, [],
    'modul Braincore memperoleh asinkroni — sekarang ia BISA menunggu jaringan: ' + tersangka.join(', '));
});

test('§3 pipeline tidak async — ia tidak BISA menunggu jaringan', () => {
  // Sifat struktural, dan itu yang membuatnya kuat: `answer()` sinkron, jadi tidak ada tempat
  // untuk `await unggah()` diselipkan tanpa mengubah tanda tangan setiap pemanggilnya.
  const src = fs.readFileSync(path.join(__dirname, 'braincore-pipeline.js'), 'utf8');
  assert.ok(!/async\s+function\s+answer/.test(src), 'answer() menjadi async — ia bisa menunggu jaringan sekarang');
  assert.ok(!/\bawait\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'pipeline memakai await');
});

test('§3 terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-evidence-queue-test.js') !== -1, 'gerbang ini tidak terdaftar');
});

console.log(failures === 0 ? 'BraincoreEvidenceQueue: PASS' : 'BraincoreEvidenceQueue: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
