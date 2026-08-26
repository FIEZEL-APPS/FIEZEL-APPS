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
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const splash = require('./features/brand/fiezel-splash.js');
const sfx = require('./features/audio/fiezel-ui-sfx.js');

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

const MOTIF_NOTES = 3;
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
    createBuffer: (_c, len) => ({ getChannelData: () => new Float32Array(len) })
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
  assert.ok(/<html lang="id"[^>]*class="fz-booting"/.test(html), 'dokumen harus menandai dirinya sedang boot');
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
  // ...dan sebaliknya: koreografi logo tidak boleh cuma sebagian.
  ['fz-logo-stem', 'fz-logo-arm', 'fz-logo-bar', 'fz-logo-sheen', 'fz-splash-rise', 'fz-splash-halo']
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
  assert.ok(/load\(\)\.catch\(e=>\{dismissBootSplash\(\);/.test(appSource),
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

test('splash meneruskan umur tayangnya ke motif sebagai tenggat', () => {
  const seen = [];
  const env = fakeEnv({
    bootSplash: true,
    bootElapsedMs: 0,
    FiezelUiSfx: { playMotif: (_e, o) => { seen.push(o); return false; }, cancelPending: () => true }
  });
  splash.show(env, { now: NOW, force: true });
  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].windowMs, splash.VISIBLE_MS,
    'windowMs harus sama dengan sisa waktu tayang splash; itulah yang mengikat motif ke layarnya sendiri');
});

/* ------------------------------------------------------------------ *
 * 2. SFX yang muncul belakangan
 * ------------------------------------------------------------------ */

test('AKAR BUG: motif splash TIDAK PERNAH dijadwalkan ke konteks yang masih terkunci', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  const played = sfx.playMotif(env, { windowMs: 2600 });
  assert.strictEqual(played, false, 'motif tidak bisa berbunyi tanpa izin audio, dan harus jujur mengatakannya');
  assert.strictEqual(env._ctx, null,
    'konteks tidak boleh dibuat sama sekali sebelum dokumen pernah disentuh - konteks `suspended` itulah tempat bug ini tumbuh');
  assert.ok(sfx.pendingMotif(), 'motif harus disiagakan, dengan tenggat');
});

test('motif yang disiagakan berbunyi pada sentuhan pertama SELAMA splash masih tampil', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  sfx.playMotif(env, { windowMs: 2600 });
  assert.ok(env._bound('pointerdown') > 0, 'pembuka audio harus terpasang di fase capture dokumen');
  env._fire('pointerdown');
  return Promise.resolve().then(() => {
    assert.strictEqual(sfx.pendingMotif(), null, 'motif harus dilepas dari siaga begitu berbunyi');
    assert.ok(env._ctx && env._ctx._scheduled.length > 0, 'motif harus benar-benar dijadwalkan setelah audio terbuka');
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

test('audio yang sudah terbuka membunyikan motif SEKARANG, di layar splashnya sendiri', () => {
  sfx.__reset();
  const env = audioEnv('running');
  const played = sfx.playMotif(env, { windowMs: 2600 });
  assert.strictEqual(played, true);
  assert.strictEqual(sfx.pendingMotif(), null, 'tidak ada yang perlu disiagakan kalau bunyinya sudah keluar');
  assert.ok(env._ctx._scheduled.length >= MOTIF_NOTES, 'seluruh nada motif harus dijadwalkan');
});

test('audio yang sudah terbuka membunyikan SFX transisi seketika', () => {
  sfx.__reset();
  const env = audioEnv('running');
  assert.strictEqual(sfx.play('nav', env), true);
  assert.ok(env._ctx._scheduled.length > 0);
});

test('preferensi murid tetap berkuasa penuh di atas seluruh mekanisme siaga', () => {
  sfx.__reset();
  const env = audioEnv('suspended');
  env.__getFiezelState = () => ({ preferences: { feedbackSounds: false } });
  assert.strictEqual(sfx.playMotif(env, { windowMs: 2600 }), false);
  assert.strictEqual(sfx.pendingMotif(), null, 'suara yang dimatikan murid tidak boleh disiagakan diam-diam');
});

process.on('exit', () => {
  if (failures) {
    console.error('FIEZEL m025-84 splash first-paint + SFX: FAIL (' + failures + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL m025-84 splash first-paint + SFX: PASS');
  }
});
