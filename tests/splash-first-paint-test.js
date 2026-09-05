/**
 * FIEZEL m025-84 — dua bug boot yang dilaporkan OWNER dalam satu napas:
 *
 *   "saat pertama masuk apps sebelum muncul splash ada jeda sekitar kurang lebih 3 detik dan
 *    muncul layar putih seluruh layar ... kemudian saat splashnya seharusnya muncul sfx
 *    sounds, anehnya sfx sounds muncul belakangan saat user menekan tombol apapun di menu"
 *
 * Keduanya berakar pada hal yang sama: splash dijalankan TERLALU LAMBAT di boot.
 *
 * 1. LAYAR PUTIH. showBrandSplash() dipanggil di ujung load() (app.js), setelah ~50 <script>
 *    dieksekusi - termasuk js.puter.com dari jaringan - dan setelah ~2,7 MB JSON konten
 *    diunduh serta diolah. Sampai detik itu yang tampil adalah body kosong berwarna
 *    var(--sky-bottom) = #fdf6f5. Perbaikannya memindahkan splash ke frame pertama: markup
 *    statis di index.html DI ATAS seluruh <script>, dengan CSS kritis di <head>.
 *
 * 2. SFX TERLAMBAT. Karena splash tampil tanpa sentuhan pengguna, AudioContext-nya lahir
 *    `suspended`, dan pada keadaan itu ctx.currentTime BEKU. Motif yang dijadwalkan di
 *    t0 = currentTime + 0.005 tidak dibuang oleh Web Audio - ia menunggu. Begitu tombol
 *    pertama di menu ditekan dan konteks di-resume, seluruh motif splash berbunyi di sana.
 *
 * Berkas ini menjaga keduanya sekaligus, dan yang nomor 2 diuji sebagai PERILAKU - dengan
 * AudioContext tiruan yang benar-benar meniru keadaan `suspended`, bukan sekadar mencocokkan
 * teks sumber. Tanpa itu, perbaikannya bisa hilang lagi tanpa satu pun tes memerah.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const splash = require('../features/brand/fiezel-splash.js');
const sfx = require('../features/audio/fiezel-ui-sfx.js');

let failures = 0;
// Runner berantai: satu tes di sini menunggu resume() yang asinkron, dan menjalankannya
// secara sinkron akan memeriksa keadaan sebelum motifnya sempat berbunyi.
let chain = Promise.resolve();
function test(name, fn) {
  chain = chain.then(() => Promise.resolve().then(fn).then(
    () => console.log('ok - ' + name),
    e => { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); }
  ));
}

const squeeze = s => String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');
// Titik koma terakhir sebelum '}' bukan perbedaan desain - hanya gaya penulisan.
const cssNorm = s => squeeze(s).replace(/;\}/g, '}');

/* ------------------------------------------------------------------ *
 * Perancah
 * ------------------------------------------------------------------ */

const NOW = Date.parse('2026-08-21T04:00:00Z');

function el(tag) {
  const node = {
    tag, className: '', innerHTML: '', children: [], parentNode: null, listeners: {}, attrs: {},
    classList: {
      add(v) { node.className = (node.className + ' ' + v).trim(); },
      remove(v) { node.className = node.className.split(/\s+/).filter(x => x && x !== v).join(' '); },
      contains(v) { return node.className.split(/\s+/).includes(v); }
    },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(node.attrs, k) ? node.attrs[k] : null; },
    appendChild(child) { child.parentNode = node; node.children.push(child); },
    removeChild(child) { node.children = node.children.filter(c => c !== child); child.parentNode = null; },
    addEventListener(type, fn) { (node.listeners[type] = node.listeners[type] || []).push(fn); },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  return node;
}

function fakeEnv(over) {
  const opts = over || {};
  const store = new Map();
  const body = el('body');
  const rootEl = el('html');
  rootEl.classList.add(splash.BOOTING_CLASS);
  let boot = null;
  if (opts.bootSplash) {
    boot = el('div');
    boot.attrs[splash.BOOT_ATTR] = '';
    boot.className = 'fiezel-splash fiezel-splash-dark';
    body.appendChild(boot);
  }
  const env = {
    document: {
      createElement: el,
      body,
      documentElement: rootEl,
      querySelector: sel => (sel === splash.BOOT_SELECTOR && boot && !boot.getAttribute('data-fiezel-boot-claimed') ? boot : null)
    },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    performance: { now: () => Number(opts.bootElapsedMs || 0) },
    __fiezelBootSplashAt: 0,
    setTimeout: () => 1,
    clearTimeout: () => {},
    matchMedia: () => ({ matches: false }),
    _body: body, _root: rootEl, _bootSplash: boot, _store: store
  };
  if (opts.FiezelUiSfx) env.FiezelUiSfx = opts.FiezelUiSfx;
  return env;
}

/** AudioContext tiruan yang meniru satu hal penting: currentTime BEKU saat suspended. */
function fakeAudio(state) {
  const scheduled = [];
  const ctx = {
    state: state || 'suspended',
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    _scheduled: scheduled,
    resume() { ctx.state = 'running'; return Promise.resolve(); },
    createGain: () => node(),
    createDelay: () => Object.assign(node(), { delayTime: param() }),
    createBiquadFilter: () => Object.assign(node(), { type: '', frequency: param(), Q: param() }),
    createBufferSource: () => Object.assign(node(), {
      buffer: null,
      start: t => scheduled.push({ kind: 'noise', at: t }),
      stop: () => {}
    }),
    createOscillator: () => Object.assign(node(), {
      type: '', frequency: param(),
      start: t => scheduled.push({ kind: 'osc', at: t }),
      stop: () => {}
    }),
    createBuffer: (_c, len) => ({ getChannelData: () => new Float32Array(len) }),
    // m029: sampel .ogg didekode, bukan disintesis - fake-nya cukup mengembalikan buffer kosong.
    decodeAudioData: (raw, yes) => { const buf = { duration: 0.4 }; if (yes) yes(buf); return Promise.resolve(buf); }
  };
  function param() {
    return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
  }
  function node() { return { gain: param(), connect() {}, disconnect() {} }; }
  return ctx;
}

function audioEnv(state) {
  const listeners = {};
  let ctx = null;
  const env = {
    AudioContext: function () { ctx = fakeAudio(state); return ctx; },
    // m029: fasad mengunduh .ogg lewat fetch sebelum mendekodenya.
    fetch: () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) }),
    navigator: { userActivation: { hasBeenActive: state === 'running' } },
    document: {
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      removeEventListener: (t, fn) => { listeners[t] = (listeners[t] || []).filter(x => x !== fn); }
    },
    matchMedia: () => ({ matches: false }),
    _fire: t => (listeners[t] || []).slice().forEach(fn => fn()),
    _bound: t => (listeners[t] || []).length,
    get _ctx() { return ctx; }
  };
  return env;
}


/* ------------------------------------------------------------------ *
 * 1. Layar putih
 * ------------------------------------------------------------------ */

test('splash ada di markup statis, BUKAN dibuat setelah boot selesai', () => {
  assert.ok(/<div id="fiezelBootSplash"[^>]*data-fiezel-boot-splash/.test(html),
    'index.html harus memuat splash frame-pertama dengan atribut adopsi');
});

test('splash berada di ATAS setiap <script> - inilah satu-satunya alasan ia tercat lebih dulu', () => {
  const splashAt = html.indexOf('id="fiezelBootSplash"');
  const firstScriptAt = html.indexOf('<script');
  assert.ok(splashAt > 0 && firstScriptAt > 0, 'markup splash dan <script> harus ada');
  assert.ok(splashAt < firstScriptAt,
    'splash harus diurai sebelum <script> pertama; di belakangnya ia menunggu js.puter.com dan ~2,7 MB JSON');
  assert.ok(splashAt < html.indexOf('id="globalSky"'),
    'splash harus menjadi elemen pertama <body> supaya tidak ada chrome aplikasi yang tercat lebih dulu');
});

test('markup statis identik dengan FiezelSplash.markup(), bukan salinan yang bisa menyimpang', () => {
  const inner = /<div id="fiezelBootSplash"[^>]*>([\s\S]*?)<\/div>\s*<script>/.exec(html);
  assert.ok(inner, 'isi splash frame-pertama harus bisa dibaca');
  assert.strictEqual(squeeze(inner[1]), squeeze(splash.markup()),
    'markup statis dan FiezelSplash.markup() harus sama persis - kalau berbeda, splash akan berkedip saat diadopsi');
});

test('latar boot gelap, jadi frame sebelum CSS pun bukan putih', () => {
  // m025-134: <html> kini juga membawa data-theme="light", jadi yang diperiksa adalah
  // kelasnya - bukan seluruh tag persis - supaya atribut lain boleh menumpang di sana.
  // AI-20 F04 (lang-pin -> konstanta): 'id' hari ini satu-satunya locale murid. Default boot
  // statis di index.html TETAP lang="id" bahkan setelah lang dinamis Wave 2 (runtime menyetel
  // ulang atributnya lewat FiezelI18n.getBcp47() saat boot), jadi asersi ini tetap sah —
  // saat itu tambahkan asersi mekanisme dinamisnya, jangan hapus yang ini.
  const SUPPORTED_LOCALES = ['id'];
  const bootLang = (/<html lang="([a-zA-Z-]+)"[^>]*class="fz-booting"/.exec(html) || [])[1];
  assert.ok(bootLang && SUPPORTED_LOCALES.includes(bootLang),
    'dokumen harus menandai dirinya sedang boot dengan lang dari locale yang didukung (' + SUPPORTED_LOCALES.join(', ') + ')');
  const critical = /<style id="fiezelBootCritical">([\s\S]*?)<\/style>/.exec(html);
  assert.ok(critical, 'CSS kritis splash harus disisipkan di <head>');
  assert.ok(/html\.fz-booting,html\.fz-booting body\{background:#1B1418\}/.test(critical[1]),
    'html dan body harus gelap selama boot; tanpa ini #fdf6f5 tetap menyembul di frame pertama');
  assert.ok(html.indexOf('<style id="fiezelBootCritical">') < html.indexOf('href="./style.css"'),
    'CSS kritis harus mendahului style.css supaya style.css tetap yang berwenang atas desainnya');
});

test('CSS kritis adalah salinan APA ADANYA dari style.css, bukan desain kedua yang hidup sendiri', () => {
  const critical = /<style id="fiezelBootCritical">([\s\S]*?)<\/style>/.exec(html)[1];
  const compactCritical = squeeze(critical);
  const compactCss = cssNorm(css);
  // Setiap aturan splash yang disalin harus masih ada persis seperti itu di style.css.
  // Komentar dan aturan khusus-boot bukan salinan dari style.css, jadi tidak dibandingkan.
  const rules = critical.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(x => x.trim()).filter(Boolean)
    .filter(x => !x.startsWith('html.fz-booting') && !x.startsWith('#fiezelBootSplash'));
  assert.ok(rules.length >= 25, 'salinan kritis harus mencakup seluruh koreografi splash, bukan sepotong');
  const drifted = rules.filter(rule => !compactCss.includes(cssNorm(rule)));
  assert.deepStrictEqual(drifted, [],
    'aturan berikut sudah berbeda dari style.css - salin ulang blok kritisnya:\n      ' + drifted.join('\n      '));
  // ...dan sebaliknya: keyframe yang dipakai splash v4 tidak boleh cuma sebagian.
  // (v4/OA-6: gerak utama digambar JS; CSS hanya butuh transisi halaman + pudar kurangi-gerak.)
  ['fzm-page-in', 'fzm-page-out', 'fz-fade-in']
    .forEach(name => assert.ok(compactCritical.includes('@keyframes' + name),
      '@keyframes ' + name + ' harus ikut disalin; tanpa itu splash frame-pertama diam lalu tersentak saat style.css tiba'));
});

test('splash frame-pertama tidak menganimasikan dirinya masuk - ia memang sudah di sana', () => {
  const critical = /<style id="fiezelBootCritical">([\s\S]*?)<\/style>/.exec(html)[1];
  assert.ok(/#fiezelBootSplash:not\(\.is-leaving\)\{animation:none\}/.test(critical),
    'fzm-page-in harus dimatikan untuk splash boot, tapi HANYA saat tidak sedang keluar');
});

test('jaring pengaman: splash tidak bisa mengurung murid kalau boot gagal', () => {
  assert.ok(/window\.__fiezelBootSplash\s*=\s*\{[^}]*dismiss/.test(html),
    'index.html harus menyediakan jalan keluar mandiri untuk splash frame-pertama');
  assert.ok(/setTimeout\(function \(\) \{[\s\S]{0,200}?dismiss\(\);\s*\}, 15000\)/.test(html),
    'harus ada pewaktu jaring pengaman yang membuang splash bila tak pernah diadopsi');
  // Diperiksa pada RANTAI bootFiezel, bukan pada urutan byte "load().catch(" — m026 GEO-IP
  // membungkus load() di belakang maybeAutoDetectLocale(), jadi pola lama berhenti cocok
  // padahal jaminannya utuh: .catch tetap menangkap penolakan dari SELURUH rantai, termasuk
  // load(). Yang dijaga tetap sama persis: rantai boot memanggil load(), dan penangkap
  // galatnya membuang splash SEBELUM menulis pesan galat.
  const rantaiBoot = appSource.slice(appSource.indexOf('function bootFiezel('), appSource.indexOf('function bootFiezel(') + 900);
  assert.ok(/\bload\(\)/.test(rantaiBoot),
    'rantai bootFiezel harus benar-benar memanggil load()');
  assert.ok(/\.catch\(e=>\{dismissBootSplash\(\);/.test(rantaiBoot),
    'boot yang gagal harus membuang splash sebelum menulis pesan galat di baliknya');
  assert.ok(/if\(!splash\|\|typeof splash\.show!=='function'\)\{dismissBootSplash\(\);/.test(appSource),
    'modul splash yang hilang tidak boleh meninggalkan lapisan penuh layar');
});

test('splash yang diadopsi memakai SISA waktu, bukan 2,6 detik penuh di atas lamanya boot', () => {
  assert.ok(/window\.__fiezelBootSplashAt = startedAt;/.test(html), 'frame pertama harus mencatat stempel waktunya');
  // Diturunkan dari konstantanya, bukan angka tetap: durasi tayang naik pada m025-88 dan
  // angka tetap membuat tes ini menguji hal lain tanpa ada yang sadar.
  const bootLebihLamaDariSisa = splash.VISIBLE_MS - splash.MIN_TAIL_MS + 600;
  const env = fakeEnv({ bootSplash: true, bootElapsedMs: bootLebihLamaDariSisa });
  const shown = splash.show(env, { now: NOW, force: true, silent: true });
  assert.strictEqual(shown.shown, true);
  assert.strictEqual(shown.adopted, true, 'splash harus mengadopsi elemen frame-pertama, bukan membuat yang kedua');
  assert.strictEqual(env._body.children.length, 1, 'tidak boleh ada lapisan splash kedua yang ditambahkan ke body');
  assert.strictEqual(env._body.children[0], env._bootSplash, 'yang tampil harus elemen frame-pertama itu sendiri');
  assert.strictEqual(shown.element, env._bootSplash, 'splash yang dikembalikan harus elemen yang sama, bukan salinan baru');
  assert.strictEqual(shown.visibleMs, splash.MIN_TAIL_MS,
    'boot yang lambat harus menyisakan lantai MIN_TAIL_MS, bukan menambah durasi penuh di belakang boot');
});

test('boot cepat tetap mendapat sapaan penuh', () => {
  const env = fakeEnv({ bootSplash: true, bootElapsedMs: 300 });
  const shown = splash.show(env, { now: NOW, force: true, silent: true });
  assert.strictEqual(shown.visibleMs, splash.VISIBLE_MS - 300);
});

test('tanpa splash frame-pertama, perilaku lama dipertahankan utuh', () => {
  const env = fakeEnv({ bootSplash: false });
  const shown = splash.show(env, { now: NOW, force: true, silent: true });
  assert.strictEqual(shown.shown, true);
  assert.strictEqual(shown.adopted, false);
  assert.strictEqual(env._body.children.length, 1, 'splash harus dibuat dan dipasang seperti sebelum m025-84');
  assert.strictEqual(shown.visibleMs, splash.VISIBLE_MS);
});

test('sapaan yang dilewati tetap MEMBUANG splash frame-pertama', () => {
  const env = fakeEnv({ bootSplash: true, bootElapsedMs: 100 });
  env.localStorage.setItem(splash.STORAGE_KEY, splash.dayKey(NOW));
  const shown = splash.show(env, { now: NOW, silent: true });
  assert.strictEqual(shown.shown, false);
  assert.strictEqual(shown.reason, 'seen_today');
  assert.strictEqual(env._bootSplash.parentNode, null,
    'splash frame-pertama harus dilepas kalau modul memutuskan tidak menyapa - kalau tidak, ia menutupi layar selamanya');
  assert.strictEqual(env._root.className.includes(splash.BOOTING_CLASS), false,
    'latar gelap boot harus dilepas bersamanya');
});

test('menutup splash mengembalikan latar aplikasi dan membatalkan motif yang masih disiagakan', () => {
  const cancelled = [];
  const env = fakeEnv({
    bootSplash: true,
    bootElapsedMs: 100,
    FiezelUiSfx: { playMotif: () => false, cancelPending: () => { cancelled.push(1); return true; } }
  });
  const shown = splash.show(env, { now: NOW, force: true });
  shown.close();
  assert.strictEqual(env._root.className.includes(splash.BOOTING_CLASS), false,
    'fz-booting harus dilepas saat splash mulai menutup, bukan setelah animasi keluar');
  assert.deepStrictEqual(cancelled, [1],
    'motif yang belum berbunyi harus dibatalkan bersama splash - inilah pagar terakhir sebelum ia bocor ke menu');
});

test('splash membunyikan splash_intro lewat fasad, dengan nama dari tabel koreografi', () => {
  // v4: sapaan pembuka adalah sampel splash_intro.ogg yang diputar lewat FiezelUiSfx.play()
  // - bukan lagi motif osilator. Fasadnya sendiri yang memegang izin, preferensi, dan jatah.
  const seen = [];
  const env = fakeEnv({
    bootSplash: true,
    bootElapsedMs: 0,
    FiezelUiSfx: { play: name => { seen.push(name); return true; }, cancelPending: () => true }
  });
  splash.show(env, { now: NOW, force: true });
  assert.deepStrictEqual(seen, ['splash_intro'],
    'splash harus meminta tepat satu bunyi pembuka, dan namanya splash_intro');
});

test('adopsi terlambat TETAP meminta nada pembuka - tenggat kini milik fasad, bukan startOffset', () => {
  // Audit 2026-08-28: pagar lama (startOffset <= 120ms) membuat splash_intro TIDAK PERNAH
  // diminta di boot nyata (load() mengunduh ~2,7 MB dulu), bahkan di lingkungan yang
  // MENGIZINKAN autoplay seperti PWA terpasang. Kontrak baru: splash SELALU meminta tepat
  // satu kali per tayangan; fasadlah yang memutuskan bunyi-sekarang / siaga-dengan-tenggat
  // / buang - dan close() -> cancelChime() tetap pagar bunyi liarnya (m025-84).
  const seen = [];
  const env = fakeEnv({
    bootSplash: true,
    bootElapsedMs: 800,
    FiezelUiSfx: { play: name => { seen.push(name); return true; }, cancelPending: () => true }
  });
  splash.show(env, { now: NOW, force: true });
  assert.deepStrictEqual(seen, ['splash_intro'],
    'adopsi terlambat pun harus meminta nada pembuka TEPAT SATU KALI - dulu jalur ini senyap selamanya');
});

test('splash memakai playOnce() bila fasad memilikinya, dengan tenggat = sisa umur tayang', () => {
  const calls = [];
  const env = fakeEnv({
    bootSplash: true,
    bootElapsedMs: 400,
    FiezelUiSfx: {
      playOnce: (name, e, o) => { calls.push([name, o && o.windowMs]); return false; },
      play: () => { throw new Error('fasad ber-playOnce tidak boleh jatuh ke play() lama'); },
      prepare: () => true,
      cancelPending: () => true
    }
  });
  const shown = splash.show(env, { now: NOW, force: true });
  assert.strictEqual(calls.length, 1, 'tepat satu permintaan playOnce per tayangan');
  assert.strictEqual(calls[0][0], 'splash_intro');
  assert.strictEqual(calls[0][1], shown.visibleMs,
    'tenggat siaga harus = sisa umur tayang splash, supaya bunyi mati bersama splash-nya');
});

test('show() menyiapkan audio lebih dulu lewat prepare() - dekode berjalan paralel dengan DOM', () => {
  const prepared = [];
  const env = fakeEnv({
    bootSplash: true,
    bootElapsedMs: 0,
    FiezelUiSfx: {
      prepare: name => { prepared.push(name); return true; },
      play: () => true,
      cancelPending: () => true
    }
  });
  splash.show(env, { now: NOW, force: true });
  assert.deepStrictEqual(prepared, ['splash_intro'],
    'persiapan konteks + dekode harus diminta splash sedini mungkin');
});

/* ------------------------------------------------------------------ *
 * 2. SFX yang muncul belakangan
 * ------------------------------------------------------------------ */

test('AKAR BUG: sapaan splash TIDAK PERNAH dijadwalkan ke konteks yang masih terkunci', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  const played = sfx.playMotif(env, { windowMs: 2600 });
  assert.strictEqual(played, false, 'motif tidak bisa berbunyi tanpa izin audio, dan harus jujur mengatakannya');
  assert.strictEqual(env._ctx, null,
    'konteks tidak boleh dibuat sama sekali sebelum dokumen pernah disentuh - konteks `suspended` itulah tempat bug ini tumbuh');
  assert.ok(sfx.pendingMotif(), 'motif harus disiagakan, dengan tenggat');
});

test('sapaan yang disiagakan berbunyi pada sentuhan pertama SELAMA splash masih tampil', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  sfx.playMotif(env, { windowMs: 2600 });
  assert.ok(env._bound('pointerdown') > 0, 'pembuka audio harus terpasang di fase capture dokumen');
  env._fire('pointerdown');
  // resume() lalu fetch+decode sampel - keduanya asinkron; beri waktu satu-dua tick.
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.strictEqual(sfx.pendingMotif(), null, 'sapaan harus dilepas dari siaga begitu berbunyi');
    assert.ok(env._ctx && env._ctx._scheduled.length > 0, 'sapaan harus benar-benar dijadwalkan setelah audio terbuka');
  });
});

test('BUG YANG DILAPORKAN: motif yang lewat tenggat DIBUANG, bukan menunggu tombol di menu', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  // Jendela 1 ms lalu jeda nyata: ini persis keadaan "splash sudah lama tertutup" saat murid
  // akhirnya menekan tombol pertamanya di menu.
  sfx.playMotif(env, { windowMs: 1 });
  return new Promise(r => setTimeout(r, 12)).then(() => {
    env._fire('pointerdown');
    // resume() asinkron: keputusan buang/bunyi jatuh satu tick setelah sentuhan.
    return new Promise(r => setTimeout(r, 0));
  }).then(() => {
    assert.strictEqual(sfx.pendingMotif(), null, 'motif kedaluwarsa harus dibuang');
    assert.ok(!env._ctx || env._ctx._scheduled.length === 0,
      'tidak boleh ada satu pun nada motif yang dijadwalkan setelah splash tertutup - inilah bunyi liar yang dilaporkan OWNER');
  });
});

test('cancelPending() memutus siaga sepenuhnya', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  sfx.playMotif(env, { windowMs: 5000 });
  assert.ok(sfx.pendingMotif());
  sfx.cancelPending();
  env._fire('pointerdown');
  assert.strictEqual(sfx.pendingMotif(), null);
  assert.ok(!env._ctx || env._ctx._scheduled.length === 0, 'motif yang dibatalkan tidak boleh berbunyi belakangan');
});

test('SFX transisi juga tidak diantre ke konteks terkunci', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  const played = sfx.play('nav', env);
  assert.strictEqual(played, false);
  const scheduledNow = env._ctx ? env._ctx._scheduled.length : 0;
  assert.strictEqual(scheduledNow, 0,
    'menjadwalkan ke konteks suspended berarti menitipkan bunyi ke sentuhan berikutnya - persis pola bug ini');
});

test('audio yang sudah terbuka membunyikan sapaan SEKARANG, di layar splashnya sendiri', () => {
  sfx.__reset();
  const env = audioEnv('running');
  const played = sfx.playMotif(env, { windowMs: 2600 });
  assert.strictEqual(played, true);
  assert.strictEqual(sfx.pendingMotif(), null, 'tidak ada yang perlu disiagakan kalau bunyinya sudah keluar');
  // Sampel diambil dan didekode secara asinkron sebelum sumbernya di-start.
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.ok(env._ctx._scheduled.length >= 1, 'sampel sapaan harus benar-benar dijadwalkan');
  });
});

test('audio yang sudah terbuka membunyikan SFX transisi seketika', () => {
  sfx.__reset();
  const env = audioEnv('running');
  assert.strictEqual(sfx.play('nav', env), true);
  // Pemutaran pertama menunggu unduhan+dekode sampelnya (asinkron, dalam tenggat).
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.ok(env._ctx._scheduled.length > 0);
  });
});

test('preferensi murid tetap berkuasa penuh di atas seluruh mekanisme siaga', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  env.__getFiezelState = () => ({ preferences: { feedbackSounds: false } });
  assert.strictEqual(sfx.playMotif(env, { windowMs: 2600 }), false);
  assert.strictEqual(sfx.pendingMotif(), null, 'suara yang dimatikan murid tidak boleh disiagakan diam-diam');
});

/* ------------------------------------------------------------------ *
 * 3. Zero-gesture-first (audit splash-SFX 2026-08-28)
 * ------------------------------------------------------------------ */

// Lingkungan yang BENAR-BENAR memblokir autoplay: resume() tidak mengubah state
// sampai gestur asli terjadi (fake audioEnv standar meniru izin yang langsung
// turun - itu justru kasus PWA terpasang).
function blockedAudioEnv() {
  const env = audioEnv('suspended');
  env._userTouched = false;
  const makeCtx = env.AudioContext;
  env.AudioContext = function () {
    const ctx = new makeCtx();
    ctx.resume = () => { if (env._userTouched) ctx.state = 'running'; return Promise.resolve(); };
    return ctx;
  };
  return env;
}

test('ZERO-GESTURE: playOnce membunyikan splash_intro SEKARANG bila konteks lahir running (PWA terpasang)', () => {
  sfx.__reset();
  const env = audioEnv('running');
  const ok = sfx.playOnce('splash_intro', env, { windowMs: 3560 });
  assert.strictEqual(ok, true, 'lingkungan yang mengizinkan autoplay harus berbunyi TANPA gestur');
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.ok(env._ctx._scheduled.length >= 1, 'sampel harus benar-benar dijadwalkan tanpa satu pun gestur');
  });
});

test('IZIN TERLAMBAT: resume() yang berhasil tanpa gestur tetap membunyikan bunyi yang disiagakan', () => {
  // audioEnv('suspended') standar meniru peramban yang MENGABULKAN resume() tanpa
  // gestur (izin autoplay turun terlambat). playOnce harus menangkap izin itu.
  sfx.__reset();
  const env = audioEnv('suspended');
  const ok = sfx.playOnce('splash_intro', env, { windowMs: 3560 });
  assert.strictEqual(ok, false, 'jawaban sinkronnya jujur: belum berbunyi saat itu juga');
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.strictEqual(sfx.pendingMotif(), null, 'izin yang turun harus melepas siaga');
    assert.ok(env._ctx._scheduled.length >= 1, 'bunyinya harus keluar TANPA gestur begitu izin turun');
  });
});

test('AUTOPLAY_BLOCKED: playOnce menyiagakan splash_intro, lalu berbunyi pada gestur asli pertama', () => {
  sfx.__reset();
  const env = blockedAudioEnv();
  const ok = sfx.playOnce('splash_intro', env, { windowMs: 3560 });
  assert.strictEqual(ok, false);
  const armed = sfx.pendingMotif();
  assert.ok(armed && armed.key === 'splash_intro',
    'yang disiagakan harus splash_intro ITU SENDIRI - slot lama terpatri ke paw_greet, itulah bugnya');
  assert.strictEqual(env._ctx._scheduled.length, 0,
    'm025-84: tidak ada nada dijadwalkan ke konteks terkunci');
  env._userTouched = true; // gestur asli: peramban baru mengabulkan resume()
  env._fire('pointerdown');
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.strictEqual(sfx.pendingMotif(), null, 'siaga harus dilepas begitu berbunyi');
    assert.ok(env._ctx._scheduled.length >= 1, 'gestur pertama harus membunyikan splash_intro itu sendiri');
  });
});

test('SATU TAYANGAN = SATU BUNYI: playOnce kedua dalam jendela hidup diabaikan', () => {
  sfx.__reset();
  const env = audioEnv('running');
  assert.strictEqual(sfx.playOnce('splash_intro', env, { windowMs: 3560 }), true);
  assert.strictEqual(sfx.playOnce('splash_intro', env, { windowMs: 3560 }), false,
    'permintaan kedua tidak boleh menggandakan bunyi - autoplay + ketukan bukan dua bunyi');
});

test('prepare() mendekode sampel pada konteks suspended TANPA menjadwalkan nada (izin \u2260 persiapan)', () => {
  sfx.__reset();
  const env = blockedAudioEnv();
  assert.strictEqual(sfx.prepare('splash_intro', env), true);
  assert.ok(env._ctx,
    'konteks harus dibuat dini - di PWA terpasang ia lahir running, itulah jalur zero-gesture');
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.strictEqual(env._ctx._scheduled.length, 0, 'prepare tidak boleh membunyikan apa pun');
    assert.ok(sfx.diagnostics(env).sampelSiap >= 1, 'sampelnya harus sudah didekode selagi menunggu izin');
  });
});

test('percobaan yang GAGAL tidak membakar jatah: gestur berikutnya masih berhak membunyikannya', () => {
  sfx.__reset();
  const env = blockedAudioEnv();
  sfx.playOnce('splash_intro', env, { windowMs: 3560 });
  // Dulu trigger() mencatat cooldown 3 dtk DI MUKA: percobaan terblokir membuat
  // ulang-main pada gestur < 3 dtk kemudian ditolak rationAllows. Kini jatah
  // dicatat setelah start() sungguhan.
  env._userTouched = true;
  env._fire('pointerdown');
  return new Promise(r => setTimeout(r, 25)).then(() => {
    assert.ok(env._ctx._scheduled.length >= 1,
      'gestur 0-3 dtk setelah percobaan terblokir harus tetap membunyikan nada pembuka');
  });
});

test('preferensi murid berkuasa juga atas playOnce/prepare', () => {
  sfx.__reset();
  const env = blockedAudioEnv();
  env.__getFiezelState = () => ({ preferences: { feedbackSounds: false } });
  assert.strictEqual(sfx.prepare('splash_intro', env), false);
  assert.strictEqual(sfx.playOnce('splash_intro', env, { windowMs: 3560 }), false);
  assert.strictEqual(sfx.pendingMotif(), null, 'suara yang dimatikan murid tidak boleh disiagakan');
  assert.strictEqual(env._ctx, null, 'suara yang dimatikan murid tidak boleh membuat konteks diam-diam');
});

process.on('exit', () => {
  if (failures) {
    console.error('FIEZEL m025-84 splash first-paint + SFX: FAIL (' + failures + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL m025-84 splash first-paint + SFX: PASS');
  }
});
