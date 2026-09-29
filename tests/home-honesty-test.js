#!/usr/bin/env node
/**
 * tests/home-honesty-test.js — GERBANG: HOME TIDAK MENGARANG ANGKA, DAN TOMBOL UTAMANYA TERLIHAT.
 *
 * Audit UI/UX Home 2026-09-27 (permintaan OWNER) menemukan, di layar yang dilihat setiap murid
 * setiap hari:
 *   - kartu "Keterangan Peningkatan" menulis "+15% akurasi", "meningkat konsisten", dan
 *     "{level} ➔ A2" — semuanya literal. Murid baru yang belum menjawab satu soal pun membaca
 *     bahwa akurasinya naik 15%; murid B1 membaca "B1 ➔ A2" (turun level);
 *   - runtun `streak || 1` (murid tanpa runtun ditulis 1 hari), "+50 XP"/"+30 XP" padahal
 *     FIEZEL tidak punya XP, dan jam "05:00" yang tidak berarti apa-apa;
 *   - sapaan "Hi Fitra!" untuk murid yang belum mengisi nama;
 *   - di layar >= 1100px kartu pertama bergeser 88px (sisa aturan sticky dua-kolom di
 *     fiezel-2.css) dan kartu kedua MENUTUPI tombol utamanya.
 *
 * YANG DIKUNCI
 *   H1  sumber todayHomeMarkup bebas dari angka/label rekaan yang ditemukan audit;
 *   H2  murid baru: kartu perkembangan jujur (akurasi "—", runtun 0, ajakan mengumpulkan data);
 *   H3  murid aktif: akurasi & perubahan dihitung dari riwayat 7 hari vs 7 hari sebelumnya;
 *   H4  level tujuan = level berikutnya (B1 -> B2), tidak ada "-> A2" mati;
 *   H5  sapaan memakai learnerName() (cadangan bahasa, bukan nama orang tertentu);
 *   H6  kartu tidak ber-role=button yang membungkus tombol lain (kontrol bersarang);
 *   H7  tidak ada aturan CSS yang memberi .today-home-cockpit > .today-card offset top
 *       (penyebab kartu 2 menutupi tombol utama di desktop);
 *   RED detektor H1 merah terhadap potongan kode lama.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __fzRoot;
const APP = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

let failures = 0, checks = 0;
function test(name, fn) { checks++; try { fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); } }

const at = APP.indexOf('function todayHomeMarkup()');
/* Komentar dibuang: blok penjelasan audit di todayHomeMarkup sengaja MENYEBUT angka rekaan lama. */
const body = APP.slice(at, APP.indexOf('\nfunction ', at + 10)).replace(/\/\*[\s\S]*?\*\//g, '');
/** Pola rekaan yang ditemukan audit. Dipakai juga oleh uji RED. */
function fabrications(src) {
  const found = [];
  if (/\+15%/.test(src)) found.push('+15%');
  if (/\+\d+\s*XP/.test(src)) found.push('XP');
  if (/➔ A2</.test(src)) found.push('level ➔ A2 mati');
  if (/streak\s*\|\|\s*1/.test(src)) found.push('streak || 1');
  if (/'Fitra'/.test(src)) found.push("'Fitra'");
  if (/>05:00</.test(src)) found.push('05:00');
  if (/meningkat konsisten/.test(src)) found.push('meningkat konsisten');
  return found;
}

test('H1 · todayHomeMarkup bebas dari angka/label rekaan', () => {
  assert.ok(at > 0, 'todayHomeMarkup() tidak ditemukan');
  assert.deepStrictEqual(fabrications(body), []);
});

test('RED · detektor H1 merah terhadap potongan kode lama', () => {
  const lama = "<span class=\"fz-time-val\" style=\"color:#059669\">+15%</span> ${todayLevel} ➔ A2</span> 🔥 ${streak || 1} +50 XP 'Fitra' <span class=\"fz-time-val\">05:00</span>";
  assert.strictEqual(fabrications(lama).length, 6);
});

test('H6 · kartu Home tidak membungkus tombol di dalam role=button', () => {
  const cards = body.match(/<div class="[^"]*fz-stadium-card[^"]*"[^>]*>/g) || [];
  assert.ok(cards.length >= 3, 'prasyarat: tiga kartu stadium ditemukan');
  for (const c of cards) assert.ok(!/role="button"/.test(c), 'kartu masih role=button: ' + c);
});

test('H7 · tidak ada aturan CSS yang menggeser kartu Home dengan top', () => {
  const offenders = [];
  for (const f of ['fiezel-2.css', 'style.css', 'features/ui/mobile-edge-fit.css', 'features/ui/fiezel-lux.css', 'features/learner-flow/home-polish.css']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const css = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]*today-home-cockpit\s*>\s*\.today-card[^{}]*)\{([^{}]*)\}/g)) {
      if (/(^|[;\s])top\s*:/.test(m[2]) || /sticky/.test(m[2])) offenders.push(f + ': ' + m[1].trim());
    }
  }
  assert.deepStrictEqual(offenders, [], 'offset top/sticky pada kartu Home membuat kartu 2 menutupi tombol utama di desktop');
});

// ------------------------------------------------------------------ app.js sungguhan
const store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {} }); }
const document = { baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {} }), addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } } };
const localStorage = { getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
localStorage.setItem('fiezel-v4-state', JSON.stringify({ version: '5.19.0', userName: '', view: 'home', level: 3, placementDone: true, totalAnswered: 0, totalCorrect: 0, totalTimeMs: 0, history: [], wrongAnswers: [], vocab: {}, grammar: {}, reading: {}, daily: { date: '', count: 0, attempts: 0 }, streak: 0, adaptiveReady: true, confidenceHistory: [], learningDays: [], sessionHistory: [], adaptivePolicyMeta: { history: [] }, policyOutcomeMeta: { history: [], queue: [] } }));
const fetch = async (u) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = { console, document, localStorage, fetch, location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null, Date, Intl, Math, URL, Error, Promise, setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} } };
context.window = context; context.self = context; context.FIEZEL_VERSION = '5.19.0';
context.FIEZEL_CORE_CONFIG = { workerUrl: '', protocolVersion: '1.7', aiGateway: 'core-only', remotePushRequired: true };
context.window.scrollTo = () => {};
vm.createContext(context);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
run('features/i18n/fiezel-i18n.js');
for (const n of fs.readdirSync(path.join(root, 'features', 'i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort()) run('features/i18n/' + n);
run('app.js');

setTimeout(() => {
  const A = context.__fiezelAudit, live = () => A.liveState(), t = (k, p) => context.FiezelI18n.t(k, p);

  test('H2 · murid baru: kartu perkembangan jujur — tanpa persen, runtun 0, ajakan mengumpulkan data', () => {
    const html = A.todayHomeMarkup();
    assert.ok(html.includes(t('home.kartu3-akurasi-kosong')), 'akurasi kosong tidak tampil');
    assert.ok(html.includes(t('home.kartu3-isi-kurang', { min: A.HOME_WEEK_MIN })), 'ajakan mengumpulkan data tidak tampil');
    assert.ok(html.includes(t('home.kartu3-runtun', { n: 0 })), 'runtun 0 tidak ditulis apa adanya');
    /* Hanya kartu perkembangan: cincin 'Ritme Harian (0/10 soal) 0%' di bawahnya adalah angka SUNGGUHAN. */
    const dark = html.slice(html.indexOf('fz-card-dark'), html.indexOf(t('home.kartu3-cta')));
    assert.ok(dark.length > 50, 'prasyarat: kartu perkembangan ditemukan');
    const pct = dark.replace(/<[^>]*>/g, ' ').match(/\S*\d+\s*%\S*/g);
    assert.ok(!pct, 'kartu perkembangan menampilkan persen untuk murid tanpa jawaban: ' + JSON.stringify(pct));
  });

  test('H3 · murid aktif: akurasi dan perubahan dihitung dari riwayat 7 hari vs 7 hari sebelumnya', () => {
    const now = Date.now(), D = 86400000;
    const h = [];
    for (let i = 0; i < 20; i++) h.push({ id: 'c' + i, type: 'grammar', ok: i < 16, at: now - 2 * D - i * 60000 });       // minggu ini 80%
    for (let i = 0; i < 20; i++) h.push({ id: 'p' + i, type: 'grammar', ok: i < 12, at: now - 9 * D - i * 60000 });       // minggu lalu 60%
    live().history = h;
    const w = A.homeWeekStats(now);
    assert.strictEqual(w.accuracy, 80); assert.strictEqual(w.delta, 20);
    const html = A.todayHomeMarkup();
    assert.ok(html.includes(t('home.kartu3-akurasi', { n: 80 })), 'akurasi minggu ini tidak tampil');
    assert.ok(html.includes(t('home.kartu3-isi-naik', { delta: 20 })), 'kalimat naik tidak sesuai data');
    live().history = h.map((x, i) => i < 20 ? { ...x, ok: i < 8 } : x);                                                     // minggu ini 40%
    assert.ok(A.todayHomeMarkup().includes(t('home.kartu3-isi-turun', { delta: 20 })), 'penurunan disembunyikan');
    live().history = [];
  });

  test('H4 · level tujuan adalah level berikutnya, bukan A2 mati', () => {
    const html = A.todayHomeMarkup();
    assert.ok(!/(B1|B2|C1) ➔ A2/.test(html), 'panah level turun masih tampil');
    assert.ok(/[ABC][12] ➔ [ABC][12]/.test(html) || /C2</.test(html), 'label level tujuan tidak ditemukan');
  });

  test('H5 · sapaan memakai learnerName(): murid tanpa nama disapa dengan sapaan netral', () => {
    live().userName = '';
    const html = A.todayHomeMarkup();
    assert.ok(!html.includes('Fitra'), 'nama orang tertentu dipakai sebagai cadangan');
    assert.ok(html.includes(t('home.sapa', { nama: t('common.sapaan-netral') })), 'sapaan netral tidak dipakai');
  });

  test('gate ini terdaftar di CI', () => {
    const wf = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
    assert.ok(wf.includes('node tests/home-honesty-test.js'), 'gate yang tidak berjalan di CI bukan gate');
  });

  console.log('');
  if (failures) { console.error('FIEZEL home honesty: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
  console.log('FIEZEL home honesty: PASS (' + checks + ' uji · Home menghitung, tidak mengarang)');
}, 350);
