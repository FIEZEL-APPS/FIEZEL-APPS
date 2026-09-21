'use strict';
/**
 * tests/kelasku-kurikulum-dashboard-test.js
 * SISTEM KURIKULUM & KOMPETENSI HIDUP DI DALAM DASBOR KELASKU (m025-357).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Instruksi owner: cabut panel "Kurikulum & Kompetensi" dari dasbor Ruang Guru, lalu
 * integrasikan SISTEMNYA ke halaman dasbor KelasKu — dan tidak boleh ada yang kurang,
 * semua sistem harus hidup dan saling terhubung.
 *
 * Dua kegagalan berbeda mengintai perpindahan semacam ini, dan keduanya terlihat hijau
 * kalau hanya diperiksa dengan grep:
 *
 *   1. PINTU YATIM. Butir nav dicabut, panelnya ikut hilang, dan tidak ada tab yang
 *      menggantikannya — sistem yang sudah dibayar jadi tidak bisa dibuka siapa pun.
 *      Ini persis temuan X2 audit 20 September 2026, yang baru saja ditutup.
 *
 *   2. PINTU KE RUANGAN KOSONG. Tab dipasang tanpa syarat, lalu guru menekannya saat
 *      backend kurikulum mati dan menemukan panel kosong (bug m025-296, tercatat di
 *      fiezel-ux-flags.js).
 *
 * Ada kegagalan ketiga yang khas perubahan INI, dan ia yang paling mahal: MESIN YANG
 * TERPASANG TANPA TOMBOL. Sebelum m025-357, features/teacher/fiezel-teacher-shell.js
 * sudah punya runSeedEnglish/runSeedMapel/runSeedSoal LENGKAP dengan penanganan aksi
 * `seed-english`/`seed-mapel`/`seed-soal` di pengirim aksinya — dan nol tombol di
 * seluruh Ruang Guru yang mengirimkan aksi itu. Enam puluh baris mesin penyemai duduk
 * mati, sementara kalimat `guru.kurikulum-sumber-lokal` menyuruh guru "Tekan kartu
 * penyemai" yang tidak ada di layar itu. Gerbang ini menuntut ketiga penyemai punya
 * TOMBOL dan PENANGAN sekaligus — pola yang sama dengan
 * tests/curriculum-seed-reachable-test.js untuk konsol penuh.
 *
 * Bagian besar gerbang ini DIJALANKAN, bukan dibaca: hub benar-benar dipasang dengan
 * env tiruan, tabnya benar-benar diketuk, dan yang diperiksa adalah HTML yang keluar.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const SHELL = baca('features/teacher/fiezel-teacher-shell.js');
const HUB = baca('features/class-hub/fiezel-class-hub.js');

/* ------------------------------------------------------- A. panel dicabut dari dasbor */

test('A1 butir nav "Kurikulum & Kompetensi" tidak ada lagi di sidebar maupun nav ponsel', () => {
  assert.ok(!/tg-nav-curriculum/.test(SHELL), 'butir nav sidebar kembali terpasang');
  assert.ok(!/data-view="curriculum"/.test(SHELL), 'masih ada tombol menuju view `curriculum`');
  assert.ok(!/nav-kurikulum-singkat/.test(SHELL), 'butir kurikulum masih terpasang di nav ponsel');
});

test('A2 view `curriculum` dicabut dari peta views, dan gerbang render tidak lagi menyebutnya', () => {
  const m = SHELL.match(/var views = \{[^}]*\}/);
  assert.ok(m, 'peta views tidak ditemukan');
  assert.ok(!/curriculum:/.test(m[0]),
    'peta views masih memetakan `curriculum` — dua pintu ke sistem yang sama akan menyimpang');
  assert.ok(!/st\.view === 'curriculum' \|\|/.test(SHELL),
    "gerbang render masih meloloskan st.view === 'curriculum'");
});

test('A3 view lama yang TERSIMPAN dimigrasikan, bukan dibiarkan mendarat di layar acak', () => {
  /* st.view ikut ke localStorage. Tanpa migrasi, guru yang menutup aplikasi di layar
     Kurikulum membukanya lagi di Ringkasan tanpa satu pun petunjuk ke mana perginya. */
  const i = SHELL.indexOf("if (st.view === 'curriculum') {");
  assert.ok(i > 0, 'migrasi st.view lama tidak ditemukan di mount()');
  const blok = SHELL.slice(i, i + 420);
  assert.ok(/st\.view = 'hub'/.test(blok), 'migrasi tidak membawa guru ke hub KelasKu');
  assert.ok(/_teacherUi\(\)\.tab = 'kurikulum'/.test(blok),
    'migrasi tidak membuka tab Kurikulum — guru mendarat di hub tetapi bukan di panel yang ia tinggalkan');
  assert.ok(/st\.view = 'briefing'/.test(blok),
    'tidak ada jalan mundur saat penjaga padam; guru akan mendarat di hub tanpa tab yang dituju');
});

/* ------------------------------------------------ B. mesin penyemai punya tombolnya */

test('B1 ketiga penyemai punya TOMBOL dan PENANGAN sekaligus', () => {
  /* Kartunya diparameterkan (satu bentuk, tiga bank), jadi yang dicari bukan literal
     `data-tg="seed-english"` melainkan TIGA hal yang bersama-sama menghasilkannya —
     pola yang sama dengan tests/curriculum-seed-reachable-test.js untuk konsol penuh:
     tabel SEMAI_KARTU yang mendeklarasikan aksinya, penggambar yang memancarkan
     atributnya, dan pengirim aksi yang menanganinya. Menuntut bentuk literalnya akan
     memaksa tiga salinan kartu — persis yang dihindari. */
  assert.ok(/data-tg="'\s*\+\s*d\.aksi\s*\+\s*'"/.test(SHELL),
    'kartuSemai() tidak memancarkan atribut data-tg, jadi tombolnya tidak pernah sampai ke ' +
    'pengirim aksi — tombol mati yang terlihat seperti pintu.');
  assert.ok(/data-testid="tg-'\s*\+\s*d\.aksi\s*\+\s*'-btn"/.test(SHELL),
    'tombol semai kehilangan data-testid, jadi tidak bisa dipegang uji peramban.');
  ['seed-english', 'seed-mapel', 'seed-soal'].forEach((aksi) => {
    assert.ok(new RegExp("aksi: '" + aksi + "'").test(SHELL),
      'tabel SEMAI_KARTU tidak lagi mendeklarasikan aksi `' + aksi + '`. Mesin penyemainya ' +
      'kembali menjadi kemampuan tanpa pintu — persis keadaan yang m025-357 ada untuk menutup.');
    assert.ok(new RegExp("case '" + aksi + "':").test(SHELL),
      'aksi `' + aksi + '` tidak ditangani pengirim aksi — tombolnya akan diam saat ditekan');
  });
  ['runSeedEnglish()', 'runSeedMapel()', 'runSeedSoal()'].forEach((fn) => {
    assert.ok(SHELL.includes(fn + ';'), 'penangan tidak memanggil ' + fn);
  });
  /* Kartunya benar-benar dirender untuk ketiga jenis — tabel yang berisi tiga baris
     tetapi hanya dua yang digambar adalah kegagalan yang tak terlihat dari regex mana pun. */
  assert.ok(/SEMAI_KARTU\.map\(kartuSemai\)/.test(SHELL),
    'panel tidak merender seluruh SEMAI_KARTU — ada bank yang punya baris tabel tetapi tidak punya kartu');
});

test('B2 status bank dibaca SEBELUM tombolnya ditawarkan', () => {
  /* Tombol "Semai sekarang" di atas bank yang sudah penuh membuat guru menyemai ulang
     tanpa perlu; tombol "Semai ulang" di atas bank kosong membuatnya mengira sudah
     beres. Kartu karena itu membaca status dulu, dan gagal-baca TIDAK jatuh ke
     "belum tersemai" — dua kalimat itu berbeda artinya. */
  assert.ok(/function loadSeedStatus\(/.test(SHELL), 'loadSeedStatus() tidak ada');
  const i = SHELL.indexOf('function kartuSemai(d)');
  assert.ok(i > 0, 'kartuSemai() tidak ada');
  const blok = SHELL.slice(i, i + 1800);
  assert.ok(/semai-memeriksa/.test(blok), 'kartu tidak punya keadaan "sedang memeriksa"');
  assert.ok(/semai-status-gagal/.test(blok), 'gagal-baca status tidak dibedakan dari belum-tersemai');
  assert.ok(/semai-belum/.test(blok) && /semai-sudah/.test(blok), 'kartu tidak membedakan sudah/belum tersemai');
  assert.ok(/seedBusy === d\.jenis/.test(blok),
    'keadaan sibuk tidak per-kartu — menekan satu penyemai akan mematikan tombol dua kartu lainnya');
});

test('B3 penyemaian yang sukses MEMAKSA baca ulang status dan kedalaman bank', () => {
  ['runSeedEnglish', 'runSeedMapel', 'runSeedSoal'].forEach((fn) => {
    const i = SHELL.indexOf('function ' + fn + '(');
    assert.ok(i > 0, fn + ' tidak ada');
    const blok = SHELL.slice(i, i + 1400);
    assert.ok(/loadSeedStatus\(true\)/.test(blok),
      fn + ' tidak membaca ulang status sesudah sukses — kartu akan tetap memajang angka sebelum penyemaian');
    assert.ok(/loadBankDepth\(ui\.curriculumSubject, true\)/.test(blok),
      fn + ' tidak membaca ulang kedalaman bank sesudah sukses');
  });
});

/* -------------------------------------------- C. kompetensi punya angka, dan jujur */

test('C1 kedalaman bank dicocokkan lewat ID SIMPUL, bukan lewat kode kompetensi', () => {
  /* Kode kompetensi dipakai bersama lintas mapel dan tingkat; mencocokkan lewat kode
     akan menempelkan soal mapel lain ke kompetensi ini. Aturan yang sama dengan kontrak
     §1 di docs/handoffs/KELASKU-KURIKULUM-KOMPETENSI-HANDOFF.md. */
  const i = SHELL.indexOf('function bankPill(node)');
  assert.ok(i > 0, 'bankPill() tidak ada');
  const blok = SHELL.slice(i, i + 700);
  assert.ok(/depth\[node\.id\]/.test(blok), 'kedalaman bank dibaca lewat sesuatu selain node.id');
  assert.ok(!/depth\[node\.code\]/.test(blok), 'kedalaman bank dibaca lewat node.code — soal mapel lain akan ikut terhitung');
});

test('C2 hitungan yang TERPOTONG batas halaman dinyatakan, bukan disembunyikan', () => {
  assert.ok(/BANK_DEPTH_LIMIT/.test(SHELL), 'batas halaman tidak punya nama');
  assert.ok(/bankDepthCapped = list\.length >= BANK_DEPTH_LIMIT/.test(SHELL),
    'panel tidak pernah tahu hitungannya terpotong');
  assert.ok(/kurikulum-bank-terpotong/.test(SHELL),
    'tidak ada penanda saat hitungan per kompetensi terpotong — guru akan menyimpulkan kompetensi kosong padahal hanya tidak terbawa');
});

test('C3 kedalaman bank tidak pernah tergambar untuk mapel yang salah', () => {
  assert.ok(/depthCocok = !!depth && ui\.bankDepthSubject === sId/.test(SHELL),
    'panel menggambar kedalaman bank tanpa memeriksa mapelnya cocok — angka mapel sebelumnya akan menempel di mapel baru');
  assert.ok(/loadBankDepth\(sel\.value, true\)/.test(SHELL),
    'ganti mapel tidak memuat ulang kedalaman bank');
});

test('C4 cakupan per kelas TIDAK dikarang ke dalam panel ini', () => {
  /* /coverage menuntut class_id milik backend kurikulum, sementara kelas di dasbor ini
     adalah kelas KelasKu lokal. Tidak ada pemetaan jujur di antara keduanya (lihat
     "Yang BELUM selesai dari X4" di handoff), dan mengarangnya berarti mengirim bukti
     palsu ke layar yang dipakai guru memutuskan siapa yang perlu remedial. */
  const i = SHELL.indexOf('function kurikulumPanel()');
  const j = SHELL.indexOf('function settings()');
  assert.ok(i > 0 && j > i, 'kurikulumPanel() tidak ditemukan');
  const panel = SHELL.slice(i, j);
  assert.ok(!/\/coverage/.test(panel) && !/tp-detail/.test(panel),
    'panel memanggil endpoint ber-class_id backend kurikulum. Kelas di dasbor ini bukan kelas backend itu; ' +
    'angka yang keluar akan terlihat meyakinkan dan salah.');
  assert.ok(/tg-curriculum-console-door/.test(panel),
    'panel tidak menautkan konsol penuh — cakupan per kelas jadi tidak punya pintu sama sekali');
});

/* ------------------------------------------------- D. DIJALANKAN: tab di dasbor hub */

function pasangHub(kurikulum, adaKelas) {
  const store = {};
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
  globalThis.document = { body: { classList: { add() {}, remove() {} } }, getElementById: () => null };
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  /* Modul hub menyimpan tUi di memori antar pemasangan, jadi tiap kasus uji memuat
     ulang modulnya — kalau tidak, tab dari kasus sebelumnya bocor ke kasus berikutnya. */
  delete require.cache[require.resolve('../features/class-hub/fiezel-class-hub.js')];
  delete require.cache[require.resolve('../features/teacher/fiezel-teacher-store.js')];
  require('../features/learner-flow/fiezel-review-bank.js');
  require('../features/teacher/fiezel-teacher-store.js');
  require('../features/class-hub/fiezel-class-hub.js');
  const Hub = globalThis.FiezelClassHub, TS = globalThis.FiezelTeacherStore;
  const st = TS.defaults();
  let c = null;
  if (adaKelas) {
    c = TS.newClass('Kelas 8A', 'A2'); c.code = 'FZ-AB2C3D';
    c.students.push(TS.newStudent('Ani'));
    st.classes.push(c); st.activeClassId = c.id;
  }
  const el = { innerHTML: '', _h: {}, addEventListener(t, fn) { (el._h[t] = el._h[t] || []).push(fn); }, querySelector: () => null, fire(t, target) { (el._h[t] || []).forEach((fn) => fn({ target, preventDefault() {} })); } };
  const env = { st: () => st, cls: () => c, persist() {}, toast() {}, rerender() { Hub.mountTeacher(el, env); } };
  if (kurikulum) env.kurikulum = kurikulum;
  Hub.mountTeacher(el, env);
  const btn = (attrs) => { const b = { getAttribute: (k) => (k in attrs ? attrs[k] : null) }; b.closest = (sel) => (sel === '[data-ch]' ? b : null); return b; };
  return { el, env, Hub, btn };
}

test('D1 tanpa env.kurikulum, tab Kurikulum TIDAK dipasang', () => {
  const { el } = pasangHub(null, true);
  assert.ok(el.innerHTML.includes('tclass-tab-kelas'), 'hub guru tidak tergambar sama sekali');
  assert.ok(!el.innerHTML.includes('tclass-tab-kurikulum'),
    'tab Kurikulum muncul walau shell tidak meneruskan sistemnya — ia akan membuka panel kosong');
});

test('D2 penjaga padam (siap() false) juga menutup tabnya', () => {
  const { el } = pasangHub({ siap: () => false, panel: () => '<b>panel</b>', buka() {} }, true);
  assert.ok(!el.innerHTML.includes('tclass-tab-kurikulum'),
    'tab Kurikulum dipasang walau alamat backend kosong — pintu ke ruangan kosong');
});

test('D3 penjaga menyala: tab ada, diketuk memanggil buka() SEKALI, panelnya tergambar', () => {
  let bukaN = 0;
  const { el, btn } = pasangHub({
    siap: () => true,
    panel: () => '<div data-testid="tg-curriculum-panel">ISI PANEL</div>',
    buka() { bukaN++; }
  }, true);
  assert.ok(el.innerHTML.includes('tclass-tab-kurikulum'), 'tab Kurikulum tidak dipasang');
  assert.ok(!el.innerHTML.includes('ISI PANEL'), 'panel tergambar sebelum tabnya diketuk');
  el.fire('click', btn({ 'data-ch': 'ttab', 'data-tab': 'kurikulum' }));
  assert.strictEqual(bukaN, 1, 'buka() dipanggil ' + bukaN + '× pada satu ketukan (harus tepat 1)');
  assert.ok(el.innerHTML.includes('ISI PANEL'), 'panel tidak tergambar sesudah tabnya diketuk');
  assert.ok(/aria-selected="true"[^>]*data-tab="kurikulum"|data-tab="kurikulum"[^>]*aria-selected="true"/.test(el.innerHTML) ||
    el.innerHTML.includes('id="chg-panel-kurikulum"'),
    'tab aktif tidak tertandai untuk pembaca layar');
});

test('D4 panel TIDAK memuat ulang pada cat ulang biasa', () => {
  /* rerender() dipanggil dari setiap sinkron latar yang selesai. Kalau pemuatan dipicu
     dari perender, backend kurikulum ditembaki sepanjang guru membuka tab itu. */
  let bukaN = 0;
  const { el, env, btn } = pasangHub({ siap: () => true, panel: () => '<b>ISI</b>', buka() { bukaN++; } }, true);
  el.fire('click', btn({ 'data-ch': 'ttab', 'data-tab': 'kurikulum' }));
  assert.strictEqual(bukaN, 1);
  env.rerender(); env.rerender(); env.rerender();
  assert.strictEqual(bukaN, 1, 'cat ulang ikut memicu pemuatan — ' + bukaN + '× untuk satu ketukan');
  assert.ok(el.innerHTML.includes('ISI'), 'panel hilang sesudah cat ulang');
});

test('D5 tab Kurikulum bekerja TANPA kelas aktif', () => {
  /* Menyemai bank, membaca kompetensi, dan menghitung kedalaman bank tidak menyentuh
     satu pun kelas. Mengunci pekerjaan persiapan di balik "Buat kelas dulu" akan
     memaksa guru membuat kelas yang belum tentu ia butuhkan hari itu. */
  const { el, btn } = pasangHub({ siap: () => true, panel: () => '<b>ISI PANEL</b>', buka() {} }, false);
  el.fire('click', btn({ 'data-ch': 'ttab', 'data-tab': 'kurikulum' }));
  assert.ok(el.innerHTML.includes('ISI PANEL'),
    'tanpa kelas aktif, tab Kurikulum jatuh ke "Buat kelas dulu" padahal tidak butuh kelas');
  assert.ok(!el.innerHTML.includes('kelas.buat-kelas-dulu'), 'naskah mentah bocor ke layar');
});

test('D6 panel kosong / melempar berakhir sebagai kalimat jujur, bukan layar buntu', () => {
  const kosong = pasangHub({ siap: () => true, panel: () => '', buka() {} }, true);
  kosong.el.fire('click', kosong.btn({ 'data-ch': 'ttab', 'data-tab': 'kurikulum' }));
  assert.ok(kosong.el.innerHTML.includes('tclass-kurikulum-mati'),
    'panel kosong tidak mengatakan apa-apa — guru menatap ruang putih');

  const lempar = pasangHub({ siap: () => true, panel() { throw new Error('boom'); }, buka() {} }, true);
  let aman = true;
  try {
    lempar.el.fire('click', lempar.btn({ 'data-ch': 'ttab', 'data-tab': 'kurikulum' }));
  } catch (_) { aman = false; }
  assert.ok(aman, 'panel yang melempar menjatuhkan seluruh hub KelasKu');
  assert.ok(lempar.el.innerHTML.includes('tclass-kurikulum-mati'),
    'panel yang melempar tidak berakhir sebagai kalimat jujur');
});

test('D7 penjaga yang padam di tengah sesi tidak meninggalkan tab tergantung', () => {
  let hidup = true;
  const { el, env, btn } = pasangHub({ siap: () => hidup, panel: () => '<b>ISI</b>', buka() {} }, true);
  el.fire('click', btn({ 'data-ch': 'ttab', 'data-tab': 'kurikulum' }));
  assert.ok(el.innerHTML.includes('ISI'));
  hidup = false;
  env.rerender();
  assert.ok(!el.innerHTML.includes('tclass-tab-kurikulum'), 'tab tetap terpasang sesudah penjaganya padam');
  assert.ok(el.innerHTML.includes('tclass-student-') || el.innerHTML.includes('tclass-tab-kelas'),
    'hub tidak kembali ke tab yang sah — guru terjebak di panel yang sudah tidak ada');
});

/* ------------------------------------------------------------------- E. naskah & CSS */

test('E1 naskah panel lahir dwibahasa (id + th, placeholder sama persis)', () => {
  const id = baca('features/i18n/copy-id-feat-d.js');
  const th = baca('features/i18n/copy-th-feat-d.js');
  const KUNCI = ['guru.kurikulum-panel-judul', 'guru.kurikulum-panel-sub', 'guru.semai-kicker',
    'guru.semai-english-judul', 'guru.semai-mapel-judul', 'guru.semai-soal-judul',
    'guru.semai-memeriksa', 'guru.semai-status-gagal', 'guru.semai-sudah', 'guru.semai-soal-sudah',
    'guru.semai-belum', 'guru.semai-tombol', 'guru.semai-ulang', 'guru.semai-jalan',
    'guru.kurikulum-kompetensi-bank', 'guru.kurikulum-kompetensi-kosong',
    'guru.kurikulum-bank-terpotong', 'guru.kurikulum-gagal', 'guru.kurikulum-pohon-kosong',
    'kelas.kurikulum-mati', 'kelas.kembali-kelas-saya'];
  KUNCI.forEach((k) => {
    assert.ok(id.includes("'" + k + "'"), k + ' belum terdaftar di copy-id-feat-d.js');
    assert.ok(th.includes("'" + k + "'"), k + ' belum terdaftar di copy-th-feat-d.js');
  });
});

test('E2 t() di teacher shell benar-benar mengisi {placeholder}', () => {
  /* Sebelum m025-357 tanda tangannya t(k, fb) tanpa params, sementara panel ini memakai
     kalimat berlubang. Jalur cadangan akan mencetak '{tp} tujuan pembelajaran' apa adanya. */
  const m = SHELL.match(/function t\(k, fb, params\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 't() di teacher shell tidak menerima params');
  const t = new Function('return (' + m[0] + ')')();
  assert.strictEqual(t('kunci.tidak.ada', 'Sudah tersemai: {tp} TP, {komp} kompetensi.', { tp: 7, komp: 14 }),
    'Sudah tersemai: 7 TP, 14 kompetensi.');
  assert.strictEqual(t('kunci.tidak.ada', 'tanpa lubang'), 'tanpa lubang');
});

test('E3 kelas yang dipancarkan panel punya gaya — bukan bawaan peramban', () => {
  /* Empat belas kelas ini sudah dipancarkan sejak m025-294 dan tidak satu pun pernah
     punya aturan CSS. Selama panelnya tersembunyi di balik butir nav kedelapan,
     kerusakannya jarang terlihat; sejak ia jadi tab dasbor, ia harus terbaca seperti
     bagian dasbor yang lain. */
  const css = baca('features/teacher/teacher-shell.css');
  ['.tg-comp-head', '.tg-comp-code', '.tg-comp-desc', '.tg-comp-actions', '.tg-bloom-badge',
   '.tg-tp-head', '.tg-tp-children', '.tg-curriculum-card-head', '.tg-curriculum-card-body',
   '.tg-curriculum-actions', '.tg-label-inline', '.tg-select', '.tg-seed-badge', '.tg-center',
   '.tg-seed-grid', '.tg-seed-card', '.tg-seed-status', '.tg-bank-pill', '.tg-kur-head'].forEach((k) => {
    assert.ok(css.includes(k + '{') || css.includes(k + ' {') || css.includes(k + ','),
      'kelas ' + k + ' dipancarkan panel tetapi tidak punya aturan di teacher-shell.css');
  });
  assert.ok(/@media\(max-width:720px\)[\s\S]{0,400}\.tg-comp-row\{flex-direction:column/.test(css),
    'baris kompetensi tidak menumpuk di ponsel — judul panjang akan meremas dua tombol aksinya');
});

test('E4 gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('kelasku-kurikulum-dashboard-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('kelasku-kurikulum-dashboard-test GAGAL: ' + failures.length + ' assert merah');
  console.log('kelasku-kurikulum-dashboard-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('kelasku-kurikulum-dashboard-test: ' + pass + '/' + total + ' assert PASS');
