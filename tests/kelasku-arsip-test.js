#!/usr/bin/env node
'use strict';
/**
 * GERBANG SIKLUS HIDUP TUGAS MURID (tests/kelasku-arsip-test.js) — m025-364.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Audit KelasKu 24 September 2026 (owner: "soal yang sudah diterbitkan dan diselesaikan
 * murid menumpuk seperti sampah, tidak bisa diarsipkan atau dihapus"). Di HP 390 px
 * dengan 6 tugas aktif dan 24 selesai, halaman Tugas setinggi 8.089 px — sepuluh layar.
 * Tiga cacat bertumpuk di baliknya:
 *
 *   K1 — Semua tugas selesai dirender penuh di bawah tugas aktif, tanpa arsip; riwayat
 *        dipotong `slice(-30)` sehingga kiriman ke-31 menghapus yang tertua DIAM-DIAM.
 *   K3 — Tugas lewat tenggat mengambang di paling atas selamanya, tanpa tempat sendiri.
 *   T2 — Tab ke-4 terpotong di luar layar; Papan Kelas hampir selalu berisi satu nama.
 *
 * Yang dijaga di sini: setiap tugas punya tepat satu tempat (Kerjakan / Terlewat / Selesai /
 * Arsip), perpindahannya otomatis dan bisa dibalik murid, riwayat tidak dipotong diam-diam,
 * dan tugas yang DITARIK guru tidak bisa dihidupkan lagi oleh murid.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const HARI = 86400000;
const iso = (offsetHari) => { const d = new Date(Date.now() + offsetHari * HARI); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const store = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
globalThis.document = { body: { classList: { add() {}, remove() {} } }, getElementById: () => null };
globalThis.fetch = () => Promise.reject(new Error('offline'));
require('../features/class-hub/fiezel-braincore-review.js');
require('../features/learner-flow/fiezel-review-bank.js');
require('../features/brain/fiezel-item-prior.js');
require('../features/teacher/fiezel-teacher-store.js');
require('../features/learner-flow/fiezel-learner-flow.js');

const TS = globalThis.FiezelTeacherStore;
const ARCH_KEY = 'fiezel-class-archive-v1';
const mkEl = () => { const el = { innerHTML: '', _h: {}, addEventListener(t, fn) { (el._h[t] = el._h[t] || []).push(fn); }, querySelector: () => null, contains: () => false, fire(t, target) { (el._h[t] || []).forEach((fn) => fn({ target, preventDefault() {} })); } }; return el; };
const btn = (attrs) => { const b = { getAttribute: (k) => (k in attrs ? attrs[k] : null), value: attrs.value }; b.closest = (sel) => (sel === '[data-ch]' ? b : null); return b; };
const tugas = (id, deadline, extra) => Object.assign({ id, title: 'Tugas ' + id, skills: ['past_tense'], itemIds: ['q1', 'q2'], minutes: 5, from: '7B', teacher: 'Bu Sari', cls: 'FZ-7B2026', mode: 'latihan', deadline }, extra || {});
const kiriman = (id, hariLalu, extra) => Object.assign({ id, title: 'Selesai ' + id, from: '7B', teacher: 'Pak Dimas', cls: 'FZ-7B2026', skills: ['past_tense'], mode: 'latihan', deadline: null, at: Date.now() - hariLalu * HARI, c: 8, t: 10, results: [{ itemId: 'q1', correct: true, chosen: 1 }], itemIds: ['q1'] }, extra || {});

/** Muat ulang modul hub dengan isi localStorage baru — ui() hub disimpan di memori modul. */
function segar(isi) {
  Object.keys(store).forEach((k) => delete store[k]);
  store['fiezel-onboarding-v1'] = JSON.stringify({ name: 'Ani', classCode: 'FZ-7B2026' });
  Object.assign(store, isi || {});
  delete require.cache[require.resolve('../features/class-hub/fiezel-class-hub.js')];
  require('../features/class-hub/fiezel-class-hub.js');
  const Hub = globalThis.FiezelClassHub;
  const el = mkEl(), env = { toasts: [], toast(m) { env.toasts.push(m); }, go() {}, openTutor() {}, afterRender() {} };
  Hub.mountStudent(el, env);
  return { Hub, el, env, klik: (a) => el.fire('click', btn(a)) };
}
const pending = () => JSON.parse(store[TS.ASSIGN_KEY] || '[]');
const arsipData = () => JSON.parse(store[ARCH_KEY] || '{}');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

test('K3 — tugas terbagi ke Kerjakan dan Terlewat; lewat 30 hari pindah sendiri ke Arsip', () => {
  const { el, klik } = segar({
    [TS.ASSIGN_KEY]: JSON.stringify([tugas('besok', iso(1)), tugas('tanpa', null), tugas('lewat3', iso(-3)), tugas('lewat40', iso(-40))])
  });
  const h = el.innerHTML;
  assert.ok(/data-testid="class-seg-kerjakan"[^>]*>[^<]*<span class="ch-segbar-n">2</.test(h), 'Kerjakan menghitung 2 tugas');
  assert.ok(/data-testid="class-seg-terlewat"[^>]*>[^<]*<span class="ch-segbar-n">1</.test(h), 'Terlewat menghitung 1 tugas (yang 40 hari sudah diarsip)');
  assert.ok(h.includes('class-assign-besok') && h.includes('class-assign-tanpa'), 'yang belum lewat tampil di Kerjakan');
  assert.ok(!h.includes('class-assign-lewat3'), 'tugas terlewat TIDAK lagi mengambang di atas daftar Kerjakan');
  assert.deepStrictEqual(pending().map((a) => a.id).sort(), ['besok', 'lewat3', 'tanpa'], 'yang lewat 40 hari keluar dari antrean');
  const m = arsipData().missed;
  assert.ok(m.length === 1 && m[0].id === 'lewat40' && m[0].oleh === 'otomatis', 'dan masuk Arsip sebagai terlewat otomatis');
  klik({ 'data-ch': 'seg', 'data-seg': 'terlewat' });
  assert.ok(el.innerHTML.includes('class-assign-lewat3'), 'tab Terlewat memuat tugas lewat 3 hari');
  assert.ok(el.innerHTML.includes('class-archive-lewat3'), 'tugas terlewat bisa diarsipkan murid');
  assert.ok(!/Selesai \(terlambat\)|is-late-done/.test(el.innerHTML), 'tidak ada cap terlambat permanen');
});

test('Murid mengarsipkan tugas terlewat, lalu memulihkannya — dan penyapu tidak mengambilnya lagi', () => {
  const { el, klik, env } = segar({ [TS.ASSIGN_KEY]: JSON.stringify([tugas('lama', iso(-45)), tugas('lewat5', iso(-5))]) });
  assert.deepStrictEqual(pending().map((a) => a.id), ['lewat5']);
  klik({ 'data-ch': 'seg', 'data-seg': 'terlewat' });
  klik({ 'data-ch': 'arsip-terlewat', 'data-id': 'lewat5' });
  assert.strictEqual(pending().length, 0, 'diarsipkan = keluar dari antrean');
  assert.ok(env.toasts.length === 1, 'murid diberi tahu ke mana tugasnya pergi');
  klik({ 'data-ch': 'buka-arsip' });
  assert.ok(el.innerHTML.includes('class-missed-lama') && el.innerHTML.includes('class-missed-lewat5'), 'keduanya ada di Arsip');
  klik({ 'data-ch': 'pulihkan', 'data-id': 'lama' });
  assert.ok(pending().some((a) => a.id === 'lama'), 'tugas yang dipulihkan kembali ke antrean');
  klik({ 'data-ch': 'tutup-arsip' });
  assert.ok(pending().some((a) => a.id === 'lama'), 'penyapu otomatis tidak mengarsipkan lagi tugas yang sengaja dipulihkan');
});

test('K1 — Selesai hanya 14 hari terakhir; sisanya di Arsip yang bisa dicari', () => {
  const subs = [kiriman('baru', 1), kiriman('minggulalu', 9), kiriman('tua', 20, { title: 'Ekosistem hutan' }), kiriman('tua2', 60)];
  const { Hub, el, klik } = segar({ [TS.ASSIGN_KEY]: '[]', 'fiezel-class-submissions-v1': JSON.stringify(subs) });
  klik({ 'data-ch': 'seg', 'data-seg': 'selesai' });
  let h = el.innerHTML;
  assert.ok(h.includes('class-section-done'), 'tab Selesai terbuka');
  assert.ok(h.includes('class-done-baru'), 'kiriman kemarin tampil');
  assert.ok(!h.includes('class-done-tua') && !h.includes('class-done-tua2'), 'kiriman > 14 hari tidak menumpuk di Selesai');
  assert.ok(/2 tugas tersimpan/.test(h), 'tautan Arsip menyebut jumlahnya');
  klik({ 'data-ch': 'arsip-selesai', 'data-id': 'baru' });
  assert.ok(!el.innerHTML.includes('class-done-baru'), 'murid bisa mengarsipkan kiriman kapan saja');
  klik({ 'data-ch': 'buka-arsip' });
  h = el.innerHTML;
  assert.ok(h.includes('data-testid="class-archive"') && h.includes('class-done-tua') && h.includes('class-done-baru'), 'Arsip memuat yang lama dan yang diarsipkan');
  assert.ok(h.includes('class-archive-search'), 'Arsip bisa dicari');
  el.fire('input', { name: 'arsip-q', value: 'ekosistem' });
  assert.ok(el.innerHTML.includes('class-done-tua') && !el.innerHTML.includes('class-done-tua2'), 'pencarian menyaring judul');
  el.fire('input', { name: 'arsip-q', value: '' });
  klik({ 'data-ch': 'pulihkan', 'data-id': 'tua2' });
  klik({ 'data-ch': 'tutup-arsip' });
  klik({ 'data-ch': 'seg', 'data-seg': 'selesai' });
  assert.ok(el.innerHTML.includes('class-done-tua2'), 'kiriman yang dipulihkan kembali ke Selesai walau umurnya 60 hari');
  assert.strictEqual(JSON.parse(store[Hub.SUB_KEY]).length, 4, 'mengarsipkan TIDAK menghapus satu kiriman pun');
});

test('K1 — riwayat tidak lagi dipotong ke 30: yang tua diringkas, bukan dibuang', async () => {
  const HUB = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(!/writeJson\(SUB_KEY, list\.slice\(-30\)\)/.test(HUB), 'slice(-30) diam-diam kembali ke finishRunner');
  const subs = [];
  for (let i = 0; i < 75; i++) subs.push(kiriman('s' + i, 100 - i));
  const { Hub, el, klik } = segar({ [TS.ASSIGN_KEY]: JSON.stringify([tugas('baru', iso(3), { itemIds: [] })]), 'fiezel-class-submissions-v1': JSON.stringify(subs) });
  /* Tugas tanpa soal langsung selesai: jalur finishRunner yang sesungguhnya yang diuji. */
  klik({ 'data-ch': 'open', 'data-id': 'baru' });
  await new Promise((r) => setTimeout(r, 10)); // runner kosong menutup diri lewat setTimeout(finishRunner, 0)
  const out = JSON.parse(store[Hub.SUB_KEY]);
  assert.strictEqual(out.length, 76, 'tidak satu kiriman pun hilang (dulu tinggal 30)');
  assert.ok(out[0].ringkas && !out[0].results, 'kiriman tertua diringkas: tanpa butir jawaban');
  assert.ok(out[0].title && out[0].c === 8 && out[0].t === 10 && out[0].at, 'ringkasan tetap membawa judul, skor, dan tanggal');
  assert.ok(!out[out.length - 1].ringkas, 'kiriman terbaru tetap lengkap');
  assert.strictEqual(out.filter((s) => !s.ringkas).length, 60, 'enam puluh kiriman terbaru menyimpan pembahasannya');
  Hub._studentUi().runner = null;
  klik({ 'data-ch': 'review', 'data-id': 's0' });
  assert.ok(el.innerHTML.includes('class-review-summary-only'), 'pembahasan kiriman ringkas menjelaskan kenapa butirnya tidak ada, bukan mogok');
});

test('Misi pilihan sendiri tidak menyamar sebagai tugas guru', () => {
  const { el, klik } = segar({ [TS.ASSIGN_KEY]: '[]', 'fiezel-class-submissions-v1': JSON.stringify([kiriman('misi_u7', 1, { teacher: '', from: 'Misi Kurikulum', isMission: true, title: 'Procedure Text' })]) });
  klik({ 'data-ch': 'seg', 'data-seg': 'selesai' });
  const baris = el.innerHTML.slice(el.innerHTML.indexOf('class-done-misi_u7'));
  assert.ok(/Misi pilihanmu/.test(baris.slice(0, 1200)), 'misi diberi label pilihan murid');
  assert.ok(!/Dari <b>guru<\/b>/.test(el.innerHTML), 'bukan lagi "Dari guru"');
});

test('Tugas yang DITARIK guru tidak bisa dipulihkan murid', () => {
  const { el, klik } = segar({
    [TS.ASSIGN_KEY]: '[]',
    [ARCH_KEY]: JSON.stringify({ v: 1, ids: {}, missed: [Object.assign(tugas('batal', iso(2)), { arsipAt: Date.now(), oleh: 'guru' })] })
  });
  klik({ 'data-ch': 'seg', 'data-seg': 'selesai' });
  klik({ 'data-ch': 'buka-arsip' });
  assert.ok(el.innerHTML.includes('class-missed-batal') && /Ditarik guru/.test(el.innerHTML), 'tercatat sebagai ditarik guru');
  assert.ok(!el.innerHTML.includes('class-restore-batal'), 'tidak ada tombol pulihkan');
  klik({ 'data-ch': 'pulihkan', 'data-id': 'batal' });
  assert.strictEqual(pending().length, 0, 'aksi pulihkan yang dipaksakan pun ditolak');
});

test('T2 — tiga tab muat di 390 px; Papan Kelas pindah ke tab Kelas', () => {
  const { el } = segar({ [TS.ASSIGN_KEY]: '[]', 'fiezel-class-hub-v1': JSON.stringify({ tab: 'papan' }) });
  assert.ok(!el.innerHTML.includes('class-tab-papan'), 'tab Papan tidak lagi berdiri sendiri');
  assert.ok(el.innerHTML.includes('class-tab-tugas') && el.innerHTML.includes('class-tab-progres') && el.innerHTML.includes('class-tab-kelas'));
  assert.ok(el.innerHTML.includes('class-my-class'), 'ingatan tab "papan" lama mendarat di tab Kelas');
});

test('Naskah siklus lahir dua bahasa, dan ikon barunya ada di subset lucide', () => {
  const HUB = read('features/class-hub/fiezel-class-hub.js');
  const pakai = [...new Set([...HUB.matchAll(/t\('(kelas\.siklus\.[a-z-]+)'/g)].map((m) => m[1]))];
  const store2 = { id: {}, th: {} };
  const root = { FiezelI18n: { registerCopy: (l, m) => Object.assign(store2[l], m) } };
  for (const f of ['copy-id-classjoin.js', 'copy-th-classjoin.js']) new Function('self', read('features/i18n/' + f))(root);
  assert.ok(pakai.length >= 30, 'kunci siklus terbaca: ' + pakai.length);
  pakai.forEach((k) => {
    assert.ok(store2.id[k], 'kunci id hilang: ' + k);
    assert.ok(/[฀-๿]/.test(store2.th[k] || ''), 'kunci th hilang / bukan aksara Thai: ' + k);
    assert.deepStrictEqual((store2.id[k].match(/\{\w+\}/g) || []).sort(), (store2.th[k].match(/\{\w+\}/g) || []).sort(), 'placeholder beda: ' + k);
  });
  const lucide = read('lucide.min.js');
  ['archive', 'search'].forEach((n) => assert.ok(lucide.includes('"' + n + '":[['), 'ikon ' + n + ' hilang dari subset'));
  assert.ok(!/icon\(s\.icon\)|icon\(sObj\.icon\)/.test(HUB), 'ikon mapel dinamis kembali — 12 dari 17 namanya tidak ada di subset');
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); } catch (e) { fail++; console.log('FAIL - ' + name + '\n  ' + (e && e.stack || e)); }
  }
  console.log(fail ? `\nFIEZEL siklus tugas murid: ${fail} gagal` : '\nFIEZEL siklus tugas murid: PASS');
  process.exit(fail ? 1 : 0);
})();
