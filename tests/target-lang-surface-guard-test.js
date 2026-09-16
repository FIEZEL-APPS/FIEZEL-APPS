const __fzRoot = require('path').join(__dirname, '..');
/**
 * tests/target-lang-surface-guard-test.js — PENJAGA BAHASA TARGET DUDUK DI RUTE, BUKAN DI KARTU.
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * tests/japanese-surface-honesty-test.js sudah menjaga agar kartu dengar/bicara tidak
 * ditawarkan kepada murid Jepang — dan ia HIJAU sepanjang audit m025-314. Yang dijaganya
 * hanya DUA daftar: latihanCards() dan todayPlanBlocks(). Audit menemukan rute yang sama
 * dibuka dari tiga tempat yang tidak ikut dijaga:
 *
 *   skillHubModel()   -> go('listening'), go('speaking')   kartu skill hub di Beranda
 *   quickChips        -> go('skills')                      chip "Dengar" di Beranda
 *   go()/renderInner  -> ketiganya                         rute itu sendiri
 *
 * Chip "Dengar" berdiri TEPAT DI BAWAH chip yang mengantar murid ke Bahasa Jepang. Murid
 * menekan yang atas untuk pindah, lalu menekan yang bawah dan mendengar bahasa Inggris.
 *
 * Pelajarannya bukan "tambah satu penjaga lagi". Penjaga per-kartu SELALU berakhir begini:
 * permukaan berikutnya lahir tanpa penjaga, dan tidak ada satu tempat pun yang bisa dibaca
 * untuk tahu permukaan mana yang terkunci. Karena itu gerbang ini menguntit invarian yang
 * berbeda: RUTE-nya yang menolak, dan kartu hanyalah kesopanan di atas penolakan itu.
 *
 * ==========================================================================
 * KENAPA MEMANGGIL, BUKAN MEMINDAI
 * ==========================================================================
 * Gerbang yang memeriksa app.js dengan regex akan tetap hijau saat kartunya dipindah ke
 * fungsi lain, diganti nama, atau dirakit dari array — dan itu persis yang terjadi pada
 * penjaga sebelumnya. Gerbang ini MEMUAT app.js di vm lalu MEMANGGIL daftar kartunya
 * dengan targetLang='ja' dan targetLang='en', lalu membaca hasilnya. Kartu yang dipindah
 * ke mana pun tetap terbaca, karena yang dibaca adalah keluarannya.
 *
 * Sebagian kecil assert memang membaca sumber (naskah literal yang sudah dihapus, dan
 * prompt AI yang tidak punya jalan panggil tanpa jaringan). Keduanya ditandai terpisah.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __fzRoot;

const store = {}, els = {};
function el(id) {
  return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, click() {}, onclick: null });
}
const document = {
  baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, remove() {}, click() {} }),
  addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }
};
const localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k]
};

const NOW = Date.parse('2026-09-14T08:00:00Z');
/* Riwayat disemai NYATA supaya kartu "Lanjutkan terakhir" dan "AI Booster" punya bahan.
   Keduanya ditulis ulang di m025-314 untuk membaca bukti; menguji mereka dengan state
   kosong hanya akan menguji cabang "jangan dicat". */
function row(i, over) {
  return Object.assign({
    id: 'h' + i, type: 'grammar', skill: 'present_perfect', target: 'present_perfect',
    level: 'A1', ok: i % 3 === 0, ms: 6000, errorTag: 'present_perfect', at: NOW - i * 3600000
  }, over || {});
}
const history = [];
for (let i = 1; i <= 12; i++) history.push(row(i));
localStorage.setItem('fiezel-v4-state', JSON.stringify({
  version: '5.23.0', userName: 'Jahran', view: 'home', level: 1, placementDone: true, adaptiveReady: true,
  totalAnswered: 12, totalCorrect: 4, totalTimeMs: 72000, history, wrongAnswers: [],
  vocab: {}, grammar: {}, reading: {}, daily: { date: '', attempts: 0, count: 0, meaningful: false },
  streak: 3, confidenceHistory: [], learningDays: [], sessionHistory: [], activeSession: null,
  preferences: { activeLevel: 'A1', learnerLocale: 'id', targetLang: 'en' }
}));

const fetchMock = async (u) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = {
  console, document, localStorage, fetch: fetchMock, location: { href: 'http://localhost/' }, navigator: {},
  window: null, self: null, Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout, crypto: globalThis.crypto,
  TextEncoder, TextDecoder, Blob: function () {}, setInterval: () => ({ unref() {} }), clearInterval() {},
  Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }
};
context.window = context; context.self = context; context.window.scrollTo = () => {};
vm.createContext(context);

for (const file of [
  'features/i18n/fiezel-i18n.js',
  ...fs.readdirSync(path.join(root, 'features/i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort().map((n) => 'features/i18n/' + n),
  'features/brain/fiezel-target-language.js',
  'features/speaking-listening/speaking-listening-config.js',
  'features/skills-evidence/fiezel-skills-evidence.js',
  'features/academic-readiness/fiezel-academic-readiness.js',
  'features/personal-journey/fiezel-personal-journey.js',
  'features/continuity/fiezel-continuity.js',
  'app.js'
]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });

const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
/* Komentar dibuang sebelum dua assert [SUMBER] di bawah. Komentar di app.js MENGUTIP naskah
   yang baru saja dihapus (itu gunanya catatan perubahan), jadi memeriksa teks mentah akan
   merah karena penjelasannya sendiri — gerbang yang menghukum dokumentasi. */
const srcTanpaKomentar = (function () {
  let out = '', i = 0, blok = false, baris = false;
  while (i < src.length) {
    if (blok) { if (src[i] === '*' && src[i + 1] === '/') { blok = false; i += 2; continue; } out += src[i] === '\n' ? '\n' : ' '; i++; continue; }
    if (baris) { if (src[i] === '\n') { baris = false; out += '\n'; } else out += ' '; i++; continue; }
    if (src[i] === '/' && src[i + 1] === '*') { blok = true; i += 2; continue; }
    if (src[i] === '/' && src[i + 1] === '/' && src[i - 1] !== ':') { baris = true; i += 2; continue; }
    out += src[i]; i++;
  }
  return out;
}());
let pass = 0;
const failures = [];
function test(name, fn) { try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); } }

/** `state` adalah binding modul app.js, jadi ia tidak muncul sebagai properti global di vm. */
function st() { return context.__fiezelAudit.liveState(); }
/** Setel bahasa target lalu kembalikan API audit. Semua assert lewat pintu ini. */
function pakaiBahasa(kode) {
  st().preferences = Object.assign({}, st().preferences, { targetLang: kode });
  assert.strictEqual(context.activeTargetLang(), kode, 'bahasa target tidak berpindah ke ' + kode);
  return context.__fiezelAudit;
}
/** Rute yang ditulis sebuah markup, dibaca dari onclick="go('…')". */
function rutePada(markup) {
  const out = [];
  const re = /go\(&#39;([a-z]+)&#39;\)|go\('([a-z]+)'\)/g;
  let m;
  while ((m = re.exec(String(markup || '')))) out.push(m[1] || m[2]);
  return out;
}

const TERKUNCI_JA = ['skills', 'listening', 'speaking'];

/* ────────────────────────────────────────────────────────────────────────────
   1. PENJAGA ITU SENDIRI
   ──────────────────────────────────────────────────────────────────────────── */

test('targetLangSurfaceBlocked() ada dan menjawab per bahasa, bukan per kartu', () => {
  assert.strictEqual(typeof context.targetLangSurfaceBlocked, 'function',
    'targetLangSurfaceBlocked belum dipapar — penjaga tanpa nama tidak bisa dipakai bersama');
  pakaiBahasa('ja');
  TERKUNCI_JA.forEach((v) => assert.strictEqual(context.targetLangSurfaceBlocked(v), true,
    'permukaan ' + v + ' TIDAK terkunci di kursus Jepang, padahal suaranya masih en-US'));
  ['vocab', 'grammar', 'reading', 'writing', 'library', 'home'].forEach((v) =>
    assert.strictEqual(context.targetLangSurfaceBlocked(v), false,
      'permukaan ' + v + ' ikut terkunci — banknya sudah ada, menyembunyikannya menghilangkan fitur'));
  pakaiBahasa('en');
  TERKUNCI_JA.concat(['vocab', 'grammar']).forEach((v) =>
    assert.strictEqual(context.targetLangSurfaceBlocked(v), false,
      'kursus Inggris ikut kehilangan ' + v + ' — bahasa bawaan tidak boleh membayar apa pun'));
});

test('go() MENOLAK rute terkunci, dan tetap membuka yang tidak terkunci', () => {
  pakaiBahasa('ja');
  TERKUNCI_JA.forEach((v) => {
    st().view = 'home';
    assert.strictEqual(context.go(v), false, "go('" + v + "') diterima di kursus Jepang");
    assert.strictEqual(st().view, 'home',
      "go('" + v + "') menolak tetapi state.view TETAP berpindah — penolakannya hanya di layar");
  });
  assert.strictEqual(context.go('vocab'), true, "go('vocab') ikut ditolak — penjaganya terlalu lebar");
  pakaiBahasa('en');
  TERKUNCI_JA.forEach((v) => {
    assert.strictEqual(context.go(v), true, "go('" + v + "') ditolak di kursus Inggris");
  });
  context.go('home');
});

test('layar tersimpan dari sebelum berganti kursus ikut dijepit saat dicat', () => {
  /* state.view disimpan dan dipulihkan saat boot. Murid yang keluar dari aplikasi di layar
     Skills Lab lalu berganti ke Jepang akan MEMULAI di layar itu tanpa pernah memanggil
     go(), jadi penolakan di go() saja tidak cukup. */
  pakaiBahasa('ja');
  st().view = 'skills';
  context.render();
  assert.ok(!TERKUNCI_JA.includes(st().view),
    'renderInner() mencat ' + st().view + ' untuk murid Jepang — pemulihan layar melewati penjaga');
});

/* ────────────────────────────────────────────────────────────────────────────
   2. SETIAP DAFTAR KARTU SEJALAN DENGAN RUTENYA
   ──────────────────────────────────────────────────────────────────────────── */

test('tidak ada satu pun kartu yang menawarkan rute yang akan ditolak go()', () => {
  pakaiBahasa('ja');
  const A = context.__fiezelAudit;
  const permukaan = {
    'latihanCards()': A.latihanCards(),
    'skillHubMarkup()': A.skillHubMarkup(),
    'continueLearningCard()': A.continueLearningCard(),
    'aiBoosterCard()': A.aiBoosterCard()
  };
  Object.entries(permukaan).forEach(([nama, markup]) => {
    const buruk = rutePada(markup).filter((v) => context.targetLangSurfaceBlocked(v));
    assert.deepStrictEqual(buruk, [],
      nama + ' menggambar pintu ke ' + buruk.join(', ') + ' yang go() sendiri akan tolak — ' +
      'murid Jepang menekannya dan mendapat penolakan, bukan latihan');
  });
});

test('kursus Inggris TIDAK kehilangan satu kartu pun', () => {
  const ja = pakaiBahasa('ja').latihanCards();
  const en = pakaiBahasa('en').latihanCards();
  assert.ok(rutePada(en).includes('skills'),
    'kartu bicara & dengar hilang dari kursus Inggris — penjaganya bocor ke bahasa bawaan');
  assert.ok(!rutePada(ja).includes('skills'), 'kartu bicara & dengar masih ditawarkan ke murid Jepang');
  const hubEn = pakaiBahasa('en').skillHubModel().map((s) => s.view);
  assert.ok(hubEn.includes('listening') && hubEn.includes('speaking'),
    'skill hub Inggris kehilangan Listening/Speaking');
  const hubJa = pakaiBahasa('ja').skillHubModel().map((s) => s.view);
  assert.ok(!hubJa.includes('listening') && !hubJa.includes('speaking'),
    'skill hub masih menawarkan Listening/Speaking kepada murid Jepang');
});

/* ────────────────────────────────────────────────────────────────────────────
   3. KARTU YANG DULU MENGARANG ISINYA
   ──────────────────────────────────────────────────────────────────────────── */

test('kartu "Lanjutkan terakhir" membaca riwayat, dan diam saat riwayatnya kosong', () => {
  const A = pakaiBahasa('en');
  const adaRiwayat = A.continueLearningCard();
  assert.ok(adaRiwayat, 'kartu tidak dicat padahal riwayatnya ada');
  assert.ok(!/Present Simple vs Continuous/.test(adaRiwayat),
    'kartu masih mencetak judul materi yang dipaku — ia mengaku melanjutkan sesuatu yang tidak pernah dikerjakan murid');
  const simpan = st().history;
  st().history = [];
  assert.strictEqual(A.continueLearningCard(), '',
    'kartu "lanjutkan" tetap dicat tanpa riwayat — tidak ada yang bisa dilanjutkan, jadi kartunya berbohong');
  st().history = simpan;
});

test('kartu "AI Booster" menghitung akurasinya, dan diam saat buktinya kurang', () => {
  const A = pakaiBahasa('en');
  const markup = A.aiBoosterCard();
  assert.ok(!/58%/.test(markup),
    'angka akurasi 58% yang dipaku masih tercetak — itu angka yang diketik, bukan diukur');
  assert.ok(!/Irregular Verbs \(Past Tense\)/.test(markup),
    'judul materi yang dipaku masih tercetak');
  if (markup) {
    const m = markup.match(/(\d+)%/);
    assert.ok(m, 'kartu dicat tanpa satu angka akurasi pun');
    const nyata = Math.round(st().history.filter((h) => h.ok).length / st().history.length * 100);
    assert.strictEqual(Number(m[1]), nyata,
      'akurasi yang dicetak (' + m[1] + '%) tidak sama dengan akurasi riwayat (' + nyata + '%)');
  }
  const simpan = st().history;
  st().history = [row(1, { ok: false }), row(2, { ok: false })]; // < AI_BOOSTER_MIN_PERCOBAAN
  assert.strictEqual(A.aiBoosterCard(), '',
    'kartu dicat dengan 2 percobaan — angka dari dua jawaban bukan diagnosis, ia kebisingan');
  st().history = simpan;
});

/* ────────────────────────────────────────────────────────────────────────────
   4. SUARA
   ──────────────────────────────────────────────────────────────────────────── */

test('tombol dengar flashcard hilang di kursus yang suaranya belum ada', () => {
  assert.strictEqual(typeof context.targetLangVoiceBlocked, 'function', 'targetLangVoiceBlocked belum dipapar');
  pakaiBahasa('ja');
  assert.strictEqual(context.targetLangVoiceBlocked(), true,
    'kursus Jepang dianggap sudah punya suara, padahal tumpukan suaranya masih dipaku en-US');
  pakaiBahasa('en');
  assert.strictEqual(context.targetLangVoiceBlocked(), false, 'kursus Inggris kehilangan suaranya sendiri');
  /* [SUMBER] Pengikatnya ikut dijaga: kalau tombolnya hilang tetapi pengikatnya masih
     memanggil $('speakWord').onclick, baris itu melempar dan MEMATIKAN $('aiWord') yang
     masih ada — tombol yang tersisa ikut mati bersama tombol yang sengaja dibuang. */
  assert.ok(!/\$\('speakWord'\)\.onclick/.test(srcTanpaKomentar),
    "pengikat masih memakai $('speakWord').onclick tanpa penjaga — tombol AI ikut mati di kursus tanpa suara");
});

/* ────────────────────────────────────────────────────────────────────────────
   5. PROMPT AI MENYEBUT KURSUS YANG SEDANG AKTIF   [SUMBER]
   ──────────────────────────────────────────────────────────────────────────── */

test('courseLanguageLabel() mengikuti bahasa target DAN bahasa layar', () => {
  assert.strictEqual(typeof context.courseLanguageLabel, 'function', 'courseLanguageLabel belum dipapar');
  pakaiBahasa('en');
  assert.strictEqual(context.courseLanguageLabel(), context.FiezelI18n.t('bahasa.en'),
    'nama kursus Inggris tidak diambil dari copy-map pemilih bahasa');
  pakaiBahasa('ja');
  assert.strictEqual(context.courseLanguageLabel(), context.FiezelI18n.t('bahasa.ja'),
    'nama kursus Jepang tidak diambil dari copy-map pemilih bahasa');
});

test('tidak ada prompt AI yang masih memaku kursusnya ke Bahasa Inggris', () => {
  /* Prompt dirakit di dalam fungsi async yang butuh jaringan, jadi ia dibaca dari sumber.
     Yang dilarang adalah LITERAL nama kursus di dalam backtick prompt; sebutan di komentar
     dan cadangan courseLanguageLabel() sendiri tetap boleh. */
  const bersih = srcTanpaKomentar;
  const dilarang = [
    'tutor Bahasa Inggris', 'pembimbing belajar Bahasa Inggris', 'penilai menulis Bahasa Inggris',
    'tutor kosakata Bahasa Inggris', 'contoh kalimat Inggris',
    'ติวเตอร์ภาษาอังกฤษ', // ติวเตอร์ภาษาอังกฤษ
    'ครูสอนภาษาอังกฤษ'  // ครูสอนภาษาอังกฤษ
  ];
  const sisa = dilarang.filter((frasa) => bersih.indexOf(frasa) >= 0);
  assert.deepStrictEqual(sisa, [],
    'prompt AI masih memaku kursusnya ke Bahasa Inggris: ' + sisa.join(' | ') +
    ' — murid Jepang mendapat tutor yang mengaku mengajar bahasa lain, dan askAI bahkan menolak ' +
    'pertanyaan "di luar topik Bahasa Inggris"');
  assert.ok((bersih.match(/courseLanguageLabel\(\)/g) || []).length >= 8,
    'terlalu sedikit pemanggilan courseLanguageLabel() — sebagian prompt masih tidak menyebut kursusnya');
});

/* ────────────────────────────────────────────────────────────────────────────
   6. NASKAH YANG SUDAH DIPINDAH KE COPY-MAP   [SUMBER]
   ──────────────────────────────────────────────────────────────────────────── */

test('naskah kartu Beranda & Latihan tidak lagi ditulis sebagai literal di app.js', () => {
  const dilarang = [
    "label:'Vocabulary'", "label:'Grammar'", "label:'Reading'", "label:'Writing'",
    "label:'Listening'", "label:'Speaking'",
    'Listening · Speaking · Reading · Writing',
    '<h1>Writing</h1>', '<b>Ritme Harian</b>', 'Latihan Singkat 3 Menit',
    'Lanjutkan Terakhir · Level', 'Selesaikan materi untuk memperkuat bukti kemahiran',
    'Akurasi 58%', '<span>Kata PAW</span>', 'aria-label="Maskot PAW"',
    '<small>Coming Soon</small>'
  ];
  const sisa = dilarang.filter((frasa) => srcTanpaKomentar.indexOf(frasa) >= 0);
  assert.deepStrictEqual(sisa, [],
    'naskah murid masih ditulis langsung di app.js: ' + sisa.join(' | ') +
    ' — yang berbahasa Inggris sampai ke murid id maupun th, yang berbahasa Indonesia sampai ke murid th');
});

test('setiap kunci baru gelombang ini punya padanan th', () => {
  const toko = { id: {}, th: {} };
  /* DIMUAT DI VM DENGAN FiezelI18n SEBAGAI GLOBAL SUNGGUHAN, bukan lewat `new Function('self',…)`.
     Sebagian copy-id-* menjaga dirinya dengan `typeof FiezelI18n === 'undefined'` — identifier
     TELANJANG — jadi harness yang hanya menyuntik `self` membuat berkas itu keluar diam-diam dan
     kuncinya tidak pernah terhitung. Itu bukan hipotesis: copy-id-redesign.js berperilaku persis
     begitu, dan karenanya kunci gelombang ini tidak terlihat oleh pemindai yang memakai pola itu. */
  const ctxCopy = { console };
  ctxCopy.self = ctxCopy; ctxCopy.window = ctxCopy; ctxCopy.globalThis = ctxCopy;
  ctxCopy.FiezelI18n = { registerCopy: (l, m) => { if (toko[l]) Object.assign(toko[l], m); } };
  vm.createContext(ctxCopy);
  for (const f of fs.readdirSync(path.join(root, 'features/i18n')).filter((f) => /^copy-(id|th)-.*\.js$/.test(f)).sort()) {
    vm.runInContext(fs.readFileSync(path.join(root, 'features/i18n', f), 'utf8'), ctxCopy, { filename: f });
  }
  const baru = [
    'skill.vocab', 'skill.grammar', 'skill.reading', 'skill.writing', 'skill.listening', 'skill.speaking',
    'home.sapaan-runtun-aktif', 'home.paw-avatar-aria', 'home.paw-bubble-title', 'home.ritme-harian',
    'home.ritme-harian-hitung', 'home.latihan-singkat', 'home.chip-vocab-sub', 'home.chip-grammar-sub',
    'home.chip-dengar', 'home.chip-dengar-sub', 'home.classroom-eyebrow', 'home.classroom-card',
    'latihan.lanjut-eyebrow', 'latihan.lanjut-sub', 'latihan.booster-tag', 'latihan.booster-sub',
    'latihan.booster-cta', 'flash.suara-belum-ada', 'bahasa.permukaan-terkunci'
  ];
  const tanpaId = baru.filter((k) => !toko.id[k]);
  assert.deepStrictEqual(tanpaId, [], 'kunci belum terdaftar di copy-id: ' + tanpaId.join(', '));
  const tanpaTh = baru.filter((k) => !toko.th[k]);
  assert.deepStrictEqual(tanpaTh, [], 'kunci tanpa padanan th: ' + tanpaTh.join(', '));
  /* Placeholder WAJIB sama persis: {akurasi} yang hilang di th membuat kalimatnya kehilangan
     angkanya, dan itu tidak terlihat sampai ada murid Thai yang membacanya. */
  const beda = baru.filter((k) => {
    const p = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
    return p(toko.id[k]) !== p(toko.th[k]);
  });
  assert.deepStrictEqual(beda, [], 'placeholder id/th tidak sama pada: ' + beda.join(', '));
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('target-lang-surface-guard-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('target-lang-surface-guard-test GAGAL: ' + failures.length + ' assert merah');
  console.log('target-lang-surface-guard-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('target-lang-surface-guard-test: ' + pass + '/' + total + ' assert PASS');
