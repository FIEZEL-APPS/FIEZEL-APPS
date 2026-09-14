const __fzRoot = require('path').join(__dirname, '..');
/**
 * tests/target-lang-progress-isolation-test.js — PROGRES TIAP BAHASA BENAR-BENAR BERDIRI SENDIRI.
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA, DAN KENAPA IA MENJALANKAN — BUKAN MEMBACA
 * ==========================================================================
 * tests/target-language-axis-test.js sudah menguji features/brain/fiezel-target-language.js
 * dan HIJAU 10/10 sejak modul itu lahir. Tetapi ia menguji MODULNYA: normalize(), key(),
 * baseOf(), langOf(). Selama berbulan-bulan app.js tidak pernah memanggil satu pun dari
 * fungsi itu untuk membentuk kunci penyimpanan, dan tidak ada gerbang yang merah karenanya.
 *
 * Itulah kelas cacat yang ditutup di sini: modul yang benar, diuji dengan benar, dan tidak
 * dipakai. Sebuah gerbang yang memeriksa MODUL tidak bisa melihatnya; hanya gerbang yang
 * MENJALANKAN jalur simpan/muat sungguhan yang bisa.
 *
 * Jadi gerbang ini memuat app.js di vm dengan localStorage tiruan, lalu benar-benar:
 *   menjawab soal di kursus Inggris -> berganti ke Jepang -> menjawab di sana ->
 *   kembali ke Inggris -> dan memeriksa kedua sisi lewat jalur baca yang dipakai aplikasi.
 *
 * DUA JANJI YANG DIJAGA, dan keduanya diambil dari kalimat yang dibaca murid di pemilih
 * bahasa (`bahasa.penjelasan`): "Progres tiap bahasa berdiri sendiri. Berganti tidak
 * menghapus apa pun."
 *
 *   1. BERDIRI SENDIRI - belajar di satu bahasa tidak menggeser progres bahasa lain.
 *   2. TIDAK MENGHAPUS  - kembali ke bahasa pertama memulihkan progresnya utuh.
 *
 * DAN SATU JANJI KETIGA yang tidak tertulis di layar tetapi lebih mahal kalau dilanggar:
 *   3. KUNCI INGGRIS TIDAK BERGESER SEBITA PUN. Setiap murid yang sudah ada memakai kursus
 *      Inggris. Kalau kuncinya bergeser, progres mereka tidak terhapus - ia hanya tidak lagi
 *      dicari di tempat ia disimpan. Tidak ada error, tidak ada gejala, dan kerusakannya
 *      baru terlihat dari keluhan murid.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __fzRoot;

let pass = 0;
const failures = [];
function test(name, fn) { try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); } }

/** Satu aplikasi baru dengan localStorage bersih. Dikembalikan bersama pintu-pintu ujinya. */
function bootApp(seedRaw) {
  const store = {};
  if (seedRaw) store['fiezel-v4-state'] = JSON.stringify(seedRaw);
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, click() {}, onclick: null });
  const document = {
    baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
    createElement: () => ({ classList: { add() {}, remove() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, remove() {}, click() {} }),
    addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }
  };
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }
  };
  const context = {
    console, document, localStorage, fetch: async () => ({ ok: false, json: async () => null }),
    location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null,
    Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout, crypto: globalThis.crypto,
    TextEncoder, TextDecoder, Blob: function () {}, setInterval: () => ({ unref() {} }), clearInterval() {},
    Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} },
    queueMicrotask: (fn) => fn()   /* save() dikoales lewat microtask; dijalankan langsung supaya urutannya terbaca */
  };
  context.window = context; context.self = context; context.window.scrollTo = () => {};
  vm.createContext(context);
  for (const file of [
    'features/i18n/fiezel-i18n.js',
    ...fs.readdirSync(path.join(root, 'features/i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort().map((n) => 'features/i18n/' + n),
    'features/brain/fiezel-target-language.js',
    'features/speaking-listening/speaking-listening-config.js',
    /* gems-core WAJIB dimuat: tanpanya sanitizeGemsState() selalu jatuh ke defaultGems()
       dan saldo gems terbaca 0 di KEDUA bahasa — assert "gems tidak ikut dipisah" akan
       menguji lubang harness, bukan perilaku produk. */
    'features/speaking-listening/gems-core.js',
    'features/skills-evidence/fiezel-skills-evidence.js',
    'features/academic-readiness/fiezel-academic-readiness.js',
    'features/personal-journey/fiezel-personal-journey.js',
    'features/continuity/fiezel-continuity.js',
    'app.js'
  ]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  const A = context.__fiezelAudit;
  return {
    ctx: context, store, A,
    st: () => A.liveState(),
    /* Satu "jawaban benar" yang menyentuh ketiga permukaan progres yang paling dilihat murid. */
    jawab(skill, level) {
      const s = A.liveState();
      s.grammar[skill] = { total: 4, correct: 4, mastery: 100, lastSeen: 1, nextReview: 2, stability: 1, lapses: 0 };
      s.history.push({ attemptId: 'a-' + skill, id: skill, type: 'grammar', level, skill, target: skill, ok: true, ms: 1000, at: 1 });
      s.totalAnswered = (Number(s.totalAnswered) || 0) + 1;
      s.totalCorrect = (Number(s.totalCorrect) || 0) + 1;
      s.preferences.activeLevel = level;
      A.saveFlushWrite();
    },
    ganti(lang) { context.switchTargetLangStorage(lang); }
  };
}

const KUNCI_DASAR = 'fiezel-v4-state';

/* ────────────────────────────────────────────────────────────────────────────
   1. JANJI KETIGA DULU — kunci Inggris tidak boleh bergeser sebita pun.
   ──────────────────────────────────────────────────────────────────────────── */

test('kursus Inggris menulis ke kunci dasar, dan TIDAK melahirkan kunci kedua', () => {
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  const kunci = Object.keys(app.store).filter((k) => k.indexOf('fiezel-v4-state') === 0);
  assert.deepStrictEqual(kunci, [KUNCI_DASAR],
    'kursus Inggris melahirkan kunci selain kunci dasar: ' + kunci.join(', ') +
    ' — setiap murid yang sudah ada mencari progresnya di kunci dasar');
  const blob = JSON.parse(app.store[KUNCI_DASAR]);
  assert.strictEqual(blob.grammar.present_perfect.mastery, 100, 'penguasaan Inggris tidak sampai ke kunci dasar');
  assert.strictEqual(blob.preferences.activeLevel, 'B1', 'level Inggris tidak sampai ke kunci dasar');
});

test('blob Inggris tetap satu blob UTUH — bidang progres tidak dicabut darinya', () => {
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  const blob = JSON.parse(app.store[KUNCI_DASAR]);
  [...app.A.PROGRESS_STATE_FIELDS, 'userName', 'preferences', 'streak', 'gems'].forEach((f) => {
    assert.ok(Object.prototype.hasOwnProperty.call(blob, f),
      'bidang ' + f + ' hilang dari blob Inggris — bentuknya wajib identik dengan sebelum sumbu bahasa lahir');
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   2. BERDIRI SENDIRI
   ──────────────────────────────────────────────────────────────────────────── */

test('belajar di Jepang TIDAK menyentuh satu bita pun progres Inggris', () => {
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  const inggrisSebelum = app.store[KUNCI_DASAR];
  const progresInggrisSebelum = JSON.stringify(app.A.pickProgress(JSON.parse(inggrisSebelum)));

  app.ganti('ja');
  app.jawab('i_adjective_before_noun_no_na', 'A1');

  const progresInggrisSesudah = JSON.stringify(app.A.pickProgress(JSON.parse(app.store[KUNCI_DASAR])));
  assert.strictEqual(progresInggrisSesudah, progresInggrisSebelum,
    'progres Inggris di kunci dasar BERUBAH saat murid belajar Jepang — kedua kursus masih berbagi bukti');
});

test('murid yang baru membuka kursus Jepang mulai dari NOL, bukan mewarisi Inggris', () => {
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  app.ganti('ja');
  const s = app.st();
  assert.strictEqual(Object.keys(s.grammar).length, 0,
    'penguasaan Inggris ikut terbawa ke kursus Jepang — murid melihat bukti yang tidak pernah ia berikan di sini');
  assert.strictEqual(s.history.length, 0, 'riwayat Inggris ikut terbawa ke kursus Jepang');
  assert.strictEqual(Number(s.totalAnswered) || 0, 0, 'hitungan jawaban Inggris ikut terbawa');
  assert.notStrictEqual(s.preferences.activeLevel, 'B1',
    'level B1 dari kursus Inggris ikut ke kursus Jepang — bank Jepang hanya A1/A2, jadi murid mendarat di layar kosong (temuan B2)');
});

test('side-state otak (BKT dkk) ikut bersumbu bahasa', () => {
  const app = bootApp();
  const kunciEn = app.A.sideStateKey('fiezel-mastery-bkt-v1');
  app.ganti('ja');
  const kunciJa = app.A.sideStateKey('fiezel-mastery-bkt-v1');
  assert.strictEqual(kunciEn, 'fiezel-mastery-bkt-v1',
    'kunci BKT Inggris bergeser — murid Inggris kehilangan jejak penguasaannya');
  assert.notStrictEqual(kunciJa, kunciEn,
    'kunci BKT Jepang sama dengan Inggris — butir cloze Inggris akan lolos ke sesi Jepang lewat clozeSkillReady() (temuan B3)');
});

/* ────────────────────────────────────────────────────────────────────────────
   3. TIDAK MENGHAPUS
   ──────────────────────────────────────────────────────────────────────────── */

test('kembali ke Inggris memulihkan progresnya UTUH', () => {
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  app.ganti('ja');
  app.jawab('i_adjective_before_noun_no_na', 'A1');
  app.ganti('en');
  const s = app.st();
  assert.strictEqual(s.grammar.present_perfect && s.grammar.present_perfect.mastery, 100,
    'penguasaan Inggris hilang setelah pulang dari kursus Jepang — persis yang dijanjikan TIDAK terjadi');
  assert.strictEqual(s.preferences.activeLevel, 'B1', 'level Inggris tidak pulih');
  assert.ok(s.history.some((h) => h.skill === 'present_perfect'), 'riwayat Inggris tidak pulih');
  assert.ok(!s.history.some((h) => h.skill === 'i_adjective_before_noun_no_na'),
    'riwayat Jepang bocor ke kursus Inggris');
});

test('progres yang BELUM sempat disimpan ikut terselamatkan saat sumbu digeser', () => {
  /* Jebakan urutan, dan inilah satu-satunya assert yang menangkapnya.
     switchTargetLangStorage() menyimpan progres bahasa LAMA lebih dulu, baru menggeser
     sumbu. Kalau dua langkah itu dibalik, jawaban terakhir murid - yang masih hidup di
     memori dan belum menyentuh localStorage - akan tertulis ke kunci bahasa BARU, lalu
     hilang dari bahasa lamanya. Assert lain tidak melihatnya karena semuanya menyimpan
     lebih dulu lewat jawab(); di sini state sengaja diubah TANPA save. */
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  const s = app.st();
  s.grammar.past_simple = { total: 2, correct: 2, mastery: 90, lastSeen: 1, nextReview: 2, stability: 1, lapses: 0 };
  s.totalAnswered = (Number(s.totalAnswered) || 0) + 1;   // TANPA saveFlushWrite()

  app.ganti('ja');
  app.ganti('en');

  const pulang = app.st();
  assert.ok(pulang.grammar.past_simple,
    'jawaban terakhir yang belum sempat disimpan HILANG saat murid berganti kursus — ' +
    'sumbu digeser sebelum progres bahasa lama diamankan');
  assert.strictEqual(pulang.grammar.past_simple.mastery, 90, 'penguasaan yang belum tersimpan pulih dengan nilai keliru');
});

test('progres Jepang juga bertahan saat ditinggal dan ditengok lagi', () => {
  const app = bootApp();
  app.ganti('ja');
  app.jawab('i_adjective_before_noun_no_na', 'A1');
  app.ganti('en');
  app.ganti('ja');
  const s = app.st();
  assert.strictEqual(s.grammar.i_adjective_before_noun_no_na && s.grammar.i_adjective_before_noun_no_na.mastery, 100,
    'progres Jepang hilang setelah mampir ke Inggris');
});

/* ────────────────────────────────────────────────────────────────────────────
   4. YANG TIDAK BOLEH IKUT BERPINDAH — identitas, preferensi, hadiah, runtun
   ──────────────────────────────────────────────────────────────────────────── */

test('nama, bahasa layar, runtun, dan gems TIDAK ikut dipisah per bahasa', () => {
  const app = bootApp();
  const s0 = app.st();
  s0.userName = 'Jahran';
  s0.streak = 7;
  s0.preferences.learnerLocale = 'th';
  s0.preferences.haptics = false;
  /* Saldo DAN totalnya disetel bersama: sanitizeGems() menolak saldo yang tidak didukung
     riwayat perolehan (anti-utak-atik), jadi menyetel balance saja akan menguji pagar itu,
     bukan sumbu bahasa. */
  if (s0.gems && typeof s0.gems === 'object') { s0.gems.balance = 42; s0.gems.earnedTotal = 42; }
  app.A.saveFlushWrite();

  app.ganti('ja');
  const s1 = app.st();
  assert.strictEqual(s1.userName, 'Jahran', 'nama murid hilang saat berganti kursus');
  assert.strictEqual(s1.streak, 7, 'runtun belajar hilang saat berganti kursus — satu hari belajar tetap satu hari belajar');
  assert.strictEqual(s1.preferences.learnerLocale, 'th', 'bahasa LAYAR ikut berganti saat bahasa YANG DIPELAJARI berganti');
  assert.strictEqual(s1.preferences.haptics, false, 'preferensi perangkat hilang saat berganti kursus');
  if (s1.gems && typeof s1.gems === 'object') assert.strictEqual(s1.gems.balance, 42, 'gems hilang saat berganti kursus');
});

test('targetLang sendiri tetap di blob global — tanpa itu bahasanya tak bisa dibaca saat boot', () => {
  const app = bootApp();
  app.ganti('ja');
  const dasar = JSON.parse(app.store[KUNCI_DASAR]);
  assert.strictEqual(dasar.preferences.targetLang, 'ja',
    'targetLang tidak tersimpan di blob global — aplikasi tidak akan tahu kursus mana yang harus dibuka saat boot berikutnya');
});

test('boot ulang membaca kembali kursus yang aktif, bukan kembali ke Inggris diam-diam', () => {
  const app = bootApp();
  app.jawab('present_perfect', 'B1');
  app.ganti('ja');
  app.jawab('i_adjective_before_noun_no_na', 'A1');
  /* Aplikasi kedua, localStorage yang sama persis - meniru murid menutup lalu membuka lagi. */
  const lagi = bootApp(JSON.parse(app.store[KUNCI_DASAR]));
  Object.keys(app.store).forEach((k) => { lagi.store[k] = app.store[k]; });
  const s = lagi.A.loadState();
  assert.strictEqual(s.preferences.targetLang, 'ja', 'boot ulang kehilangan kursus yang sedang dibuka');
  assert.ok(s.grammar.i_adjective_before_noun_no_na, 'boot ulang tidak menemukan progres Jepang');
  assert.ok(!s.grammar.present_perfect, 'boot ulang mencampur progres Inggris ke kursus Jepang');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('target-lang-progress-isolation-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('target-lang-progress-isolation-test GAGAL: ' + failures.length + ' assert merah');
  console.log('target-lang-progress-isolation-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('target-lang-progress-isolation-test: ' + pass + '/' + total + ' assert PASS');
