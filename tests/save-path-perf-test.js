#!/usr/bin/env node
/**
 * tests/save-path-perf-test.js — jalur save() diukur, bukan dijanjikan.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Audit D4 menemukan dua pemborosan di jalur simpan dan memperbaikinya:
 *   #1 `new Intl.DateTimeFormat` dibangun ulang untuk SETIAP baris riwayat;
 *   #2 satu jawaban memicu `save()` tiga kali, tiap kali stringify state ±716 KB.
 *
 * Perbaikannya nyata, tetapi sampai commit ini TIDAK ADA gerbang yang menjaganya.
 * Yang menjaganya cuma tiga blok komentar. Komentar tidak menghentikan siapa pun
 * yang menambahkan `new Intl.DateTimeFormat(...)` ke dalam loop tahun depan, dan
 * regresi performa adalah jenis regresi yang paling sunyi: tidak ada yang merah,
 * aplikasinya cuma pelan — dan pelan di HP murid berarti sesi yang ditinggalkan.
 *
 * Bukti bahwa penjagaan itu memang perlu: perbaikan D4 #1 sendiri BELUM SELESAI
 * sampai commit ini. `studyDayKey` memang memo hasilnya, tetapi kunci memonya
 * dibangun dari `studyTimeZone()` -> `validTimeZone()`, dan versi lama membangun
 * satu `Intl.DateTimeFormat` pada SETIAP panggilan — termasuk pada memo hit. Jadi
 * 1.000 baris riwayat tetap membayar 1.000 konstruksi formatter, persis biaya yang
 * dikira sudah hilang. Terukur: 96 ms -> 0,08 ms per 1.000 baris.
 *
 * ==========================================================================
 * CARA GERBANG INI MENGUKUR
 * ==========================================================================
 * Ia TIDAK mencari string di app.js. Pemeriksaan berbasis grep akan lulus untuk
 * kode yang ditulis ulang dengan nama lain, dan gagal untuk kode yang benar tetapi
 * diformat lain — dua-duanya salah.
 *
 * Sebagai gantinya app.js dijalankan sungguhan di dalam `vm` dengan dua alat ukur
 * yang menghitung PEMAKAIAN nyata:
 *   - `Intl.DateTimeFormat` dibungkus penghitung konstruksi;
 *   - `localStorage.setItem` dibungkus penghitung penulisan.
 * Lalu riwayat diisi dan `save()` dipanggil berkali-kali seperti satu jawaban
 * sungguhan, dan angkanya di-assert terhadap ambang. Kode boleh ditulis ulang
 * sesuka hati selama angkanya tetap.
 *
 * AMBANGNYA LONGGAR DENGAN SENGAJA. Yang dijaga adalah KELAS cacatnya (biaya
 * per-baris dan penulisan per-panggilan), bukan angka pastinya — gerbang yang
 * memaku angka pasti akan merah karena perubahan yang sah dan akan dilonggarkan
 * orang sampai tidak berarti.
 *
 * Nol dependency, nol jaringan.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const i18nDir = path.join(root, 'features', 'i18n');

let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
};

console.log('save-path-perf-test');

// ---------------------------------------------------------------------------------------
// Harness: pola tests/regression-test.js, ditambah dua alat ukur.
// ---------------------------------------------------------------------------------------
const elements = {};
const mkEl = id => ({
  id, innerHTML: '', textContent: '', onclick: null, disabled: false,
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  style: { setProperty() {} }, dataset: {},
  addEventListener() {}, setAttribute() {}, removeAttribute() {},
  querySelector() { return null; }, querySelectorAll() { return []; },
  append() {}, appendChild() {}, remove() {}, focus() {}
});
const element = id => (elements[id] ||= mkEl(id));

const document = {
  baseURI: 'http://localhost/',
  getElementById: element,
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement: () => mkEl(''),
  addEventListener() {},
  body: mkEl('body'),
  documentElement: mkEl('html')
};

const store = {};
let setItemCount = 0;
const localStorage = {
  getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { setItemCount++; store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

// Penghitung konstruksi Intl.DateTimeFormat. Subclass, bukan Proxy: app.js memanggil
// `Intl.DateTimeFormat()` TANPA `new` di detectedTimeZone(), dan bentuk itu harus tetap sah.
let dtfCount = 0;
const RealDTF = Intl.DateTimeFormat;
function CountingDTF(...args) {
  dtfCount++;
  return new RealDTF(...args);
}
CountingDTF.prototype = RealDTF.prototype;
CountingDTF.supportedLocalesOf = RealDTF.supportedLocalesOf.bind(RealDTF);
const CountingIntl = Object.create(Intl);
CountingIntl.DateTimeFormat = CountingDTF;

const fetchStub = async url => {
  const raw = String(url);
  const rel = (raw.includes('://') ? raw.slice(raw.indexOf('://') + 3).replace(/^[^/]*/, '') : raw)
    .replace(/^\.?\//, '').split('?')[0];
  const file = path.join(root, rel);
  if (!rel || !fs.existsSync(file)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
};

const ctx = {
  console: { log() {}, warn() {}, error() {}, info() {} },
  document, localStorage, fetch: fetchStub,
  location: { href: 'http://localhost/' },
  navigator: { onLine: true },
  Date, Math, URL, Intl: CountingIntl, JSON, Object, Array, Number, String, Promise,
  setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {},
  queueMicrotask,
  window: {}, self: null,
  Notification: Object.assign(function () {}, { permission: 'denied', requestPermission: async () => 'denied' }),
  SpeechSynthesisUtterance: function () {},
  speechSynthesis: { cancel() {}, speak() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} })
};
ctx.window = ctx; ctx.self = ctx; ctx.window.scrollTo = () => {};
vm.createContext(ctx);

const i18nRuntime = path.join(i18nDir, 'fiezel-i18n.js');
if (fs.existsSync(i18nRuntime)) {
  vm.runInContext(fs.readFileSync(i18nRuntime, 'utf8'), ctx, { filename: 'fiezel-i18n.js' });
  for (const f of fs.readdirSync(i18nDir).filter(n => /^copy-id-.*\.js$/.test(n)).sort()) {
    vm.runInContext(fs.readFileSync(path.join(i18nDir, f), 'utf8'), ctx, { filename: f });
  }
}
vm.runInContext(app, ctx, { filename: 'app.js' });

setTimeout(() => {
  try {
    const state = ctx.__getFiezelState();
    check('app.js boot dan state terbaca di harness', !!state && typeof ctx.save === 'function',
      'save() atau __getFiezelState tidak terekspos');
    if (!state || typeof ctx.save !== 'function') { finish(); return; }

    // -----------------------------------------------------------------------------------
    // Riwayat diisi sampai CAP produksinya. Stempel waktunya sengaja UNIK per baris:
    // memo studyDayKey berkunci stempel waktu, jadi baris kembar akan menyembunyikan
    // justru biaya yang sedang diukur.
    // -----------------------------------------------------------------------------------
    const ROWS = 1000;
    const base = Date.UTC(2026, 0, 1, 3, 0, 0);
    state.history = [];
    for (let i = 0; i < ROWS; i++) {
      state.history.push({ at: base + i * 3600000, correct: i % 3 !== 0, skill: 'present_simple', level: 'A1' });
    }

    // Satu save() pemanasan: memo per-stempel-waktu memang BOLEH terisi sekali. Yang diuji
    // adalah biaya save() BERIKUTNYA — itulah yang dibayar berulang kali dalam satu sesi.
    ctx.save();
    const dtfAfterWarm = dtfCount;
    const setItemAfterWarm = setItemCount;

    ctx.save(); ctx.save(); ctx.save();
    const dtfPerThreeSaves = dtfCount - dtfAfterWarm;

    // Ambang: 3 x save() pada 1.000 baris. Tanpa cache formatter + memo zona waktu, angka
    // ini ~3.000 (satu konstruksi per baris per save). Ambang 60 memberi ruang lapang untuk
    // formatter UI yang sah sambil tetap menangkap kelas cacat per-baris.
    check('3x save() pada ' + ROWS + ' baris riwayat tidak membangun formatter per baris',
      dtfPerThreeSaves <= 60,
      dtfPerThreeSaves + ' konstruksi Intl.DateTimeFormat (ambang 60; pola lama ~' + (ROWS * 3) + ')');

    // -----------------------------------------------------------------------------------
    // Penulisan localStorage: beberapa save() dalam SATU task harus dikoales menjadi satu.
    // Pemeriksaan dilakukan sesudah microtask sempat jalan.
    // -----------------------------------------------------------------------------------
    queueMicrotask(() => {
      const writes = setItemCount - setItemAfterWarm;
      check('3x save() dalam satu task = satu penulisan localStorage, bukan tiga',
        writes <= 1,
        writes + ' penulisan (pola lama: 3 per jawaban)');

      // Data TIDAK boleh hilang gara-gara koalesensi: state terakhir wajib benar-benar tertulis.
      let persisted = null;
      for (const k of Object.keys(store)) {
        try {
          const v = JSON.parse(store[k]);
          if (v && Array.isArray(v.history)) { persisted = v; break; }
        } catch (_) { /* bukan state */ }
      }
      check('koalesensi tetap MENULIS state terkini (bukan menelan simpanan)',
        !!persisted && persisted.history.length === ROWS,
        persisted ? 'baris tersimpan: ' + persisted.history.length : 'tidak ada state di localStorage');

      finish();
    });
  } catch (e) {
    check('harness berjalan tanpa melempar', false, e && e.stack ? e.stack.split('\n')[0] : String(e));
    finish();
  }
}, 400);

function finish() {
  console.log(failed === 0
    ? '\nFIEZEL jalur save(): PASS'
    : `\nFIEZEL jalur save(): FAIL (${failed} pemeriksaan merah)`);
  process.exit(failed === 0 ? 0 : 1);
}
