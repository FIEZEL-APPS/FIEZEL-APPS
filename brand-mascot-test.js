/**
 * FIEZEL gate — maskot vektor dan splash pembuka.
 *
 * Redesign gampang rusak diam-diam: warna melenceng dari spesifikasi, animasi tetap berjalan
 * saat pengguna minta kurangi-gerak, atau splash tertinggal menutupi layar. Yang terakhir
 * paling berbahaya di produk ini, karena notifikasi wajib dan gerbangnya ada di bawah splash.
 */
const assert = require('assert');
const fs = require('fs');
const mascot = require('./features/brand/fiezel-mascot.js');
const splash = require('./features/brand/fiezel-splash.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const css = fs.readFileSync('./style.css', 'utf8');

test('warna maskot diambil dari spesifikasi, bukan dikira-kira', () => {
  // Nilai ini ada di FIEZEL_Complete_Design_Specification. Kalau merek berubah, ia harus
  // berubah di satu tempat dan gate ini yang menahannya tetap sinkron.
  assert.strictEqual(mascot.PALETTE.maroon, '#7a1e2e');
  assert.strictEqual(mascot.PALETTE.maroonDark, '#4a1119');
  assert.strictEqual(mascot.PALETTE.cream, '#fdf3e2');
  assert.strictEqual(mascot.PALETTE.gold, '#d9a441');
  assert.strictEqual(mascot.PALETTE.blush, '#f3e0e0');
});

test('ciri pengenal karakter benar-benar ada di vektornya', () => {
  const svg = mascot.svg({ pose: 'wave' });
  // Ini yang membuat karakternya dikenali; kalau salah satu hilang, yang tersisa hanya
  // "kucing merah" generik.
  assert.ok(/class="fzm-ear-left"/.test(svg), 'telinga terlipat');
  assert.ok(/class="fzm-ear-right"/.test(svg), 'telinga tegak');
  assert.ok(/class="fzm-tail"/.test(svg), 'ekor lebat');
  assert.ok(/class="fzm-star"/.test(svg), 'bintang emas');
  assert.ok(/class="fzm-bandana"/.test(svg), 'bandana');
  assert.ok(/>F<\/text>/.test(svg), 'liontin huruf F');
  assert.ok(/class="fzm-lids"/.test(svg), 'kelopak mata terpisah supaya bisa berkedip');
});

test('SVG bisa dipakai di banyak ukuran tanpa jadi kabur', () => {
  const svg = mascot.svg({ size: 48 });
  assert.ok(/viewBox="0 0 240 240"/.test(svg), 'viewBox tetap, itu inti vektor');
  assert.ok(/width="48" height="48"/.test(svg));
  assert.ok(!/<image|xlink:href|url\(http/.test(svg), 'tidak boleh menarik aset dari luar');
});

test('id gradien tidak bertabrakan saat dua maskot tampil bersamaan', () => {
  // Dua SVG dengan id sama akan saling mencuri gradien - salah satunya berubah warna.
  const a = mascot.svg({ pose: 'wave', idPrefix: 'a' });
  const b = mascot.svg({ pose: 'study', idPrefix: 'b' });
  assert.ok(a.indexOf('id="a-fur"') !== -1 && b.indexOf('id="b-fur"') !== -1);
  assert.strictEqual(a.indexOf('id="b-fur"'), -1);
});

test('pose asing jatuh ke idle, bukan menghasilkan kelas ngawur', () => {
  assert.strictEqual(mascot.normalizePose('ngawur'), 'idle');
  assert.strictEqual(mascot.normalizePose('CHEER'), 'cheer');
  assert.ok(/fiezel-mascot-idle/.test(mascot.svg({ pose: '<script>' })));
  assert.ok(!/<script>/.test(mascot.svg({ pose: '<script>' })), 'pose tidak boleh bocor ke markup');
});

test('judul yang disuntikkan pengguna tidak bisa menyuntik markup', () => {
  const svg = mascot.svg({ title: '"><script>alert(1)</script>' });
  assert.ok(!/<script>/.test(svg), 'markup asing harus lolos escape');
  assert.ok(/aria-label="/.test(svg));
});

test('maskot dekoratif tidak dibacakan dua kali oleh pembaca layar', () => {
  // Di splash, teksnya sudah menjelaskan segalanya; gambarnya tidak perlu ikut dibacakan.
  const decorative = mascot.svg({ decorative: true });
  assert.ok(/aria-hidden="true"/.test(decorative));
  assert.ok(!/<title>/.test(decorative));
  const meaningful = mascot.svg({ title: 'Maskot FIEZEL melambai' });
  assert.ok(/role="img"/.test(meaningful) && /<title>/.test(meaningful));
});

test('animasi berhenti saat perangkat meminta kurangi gerak', () => {
  // Blok global di style.css memangkas durasi semua animasi; gate ini memastikan animasi
  // maskot memang animasi CSS, sehingga ikut terpangkas - bukan SMIL yang lolos dari aturan itu.
  assert.ok(/@keyframes fzm-tail/.test(css) && /@keyframes fzm-wave/.test(css));
  assert.ok(/prefers-reduced-motion:reduce\)\s*\{\s*\*\{[^}]*animation-duration/.test(css.replace(/\s*\n\s*/g, '')),
    'blok global kurangi-gerak harus tetap ada');
  const svg = mascot.svg({ pose: 'wave' });
  assert.ok(!/<animate|<animateTransform/.test(svg), 'animasi SMIL tidak tunduk pada kurangi-gerak');
});

test('splash menampilkan isi yang diminta spesifikasi Step 0', () => {
  assert.strictEqual(splash.COPY.word, 'FIEZEL');
  assert.ok(/temanmu belajar di FIEZEL/.test(splash.COPY.bubble));
  assert.ok(splash.COPY.cta.length > 0);
  assert.ok(splash.VISIBLE_MS >= 2000 && splash.VISIBLE_MS <= 3000, 'spesifikasi meminta 2-3 detik');
});

function fakeEnv(over) {
  const store = new Map();
  const timers = [];
  const nodes = [];
  function el(tag) {
    return {
      tag, className: '', innerHTML: '', children: [], parentNode: null,
      listeners: {},
      classList: { add(v) { this.owner.className += ' ' + v; } },
      setAttribute() {}, appendChild(child) { child.parentNode = this; this.children.push(child); },
      removeChild(child) { this.children = this.children.filter(c => c !== child); child.parentNode = null; },
      addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
      querySelector() { return null; }
    };
  }
  const body = el('body');
  const env = Object.assign({
    document: {
      createElement(tag) {
        const node = el(tag);
        node.classList.owner = node;
        nodes.push(node);
        return node;
      },
      body
    },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    FiezelMascot: mascot,
    _timers: timers, _body: body, _store: store
  }, over || {});
  return env;
}

const NOW = Date.parse('2026-08-21T04:00:00Z');

test('splash tampil sekali, lalu tidak lagi di hari yang sama', () => {
  const env = fakeEnv();
  const first = splash.show(env, { now: NOW });
  assert.strictEqual(first.shown, true);
  assert.strictEqual(env._body.children.length, 1);
  first.close();
  const second = splash.show(env, { now: NOW + 3600000 });
  assert.strictEqual(second.shown, false);
  assert.strictEqual(second.reason, 'seen_today');
  // Hari berikutnya boleh menyapa lagi.
  assert.strictEqual(splash.show(env, { now: NOW + 26 * 3600000 }).shown, true);
});

test('splash selalu punya jalan keluar, tidak pernah tertinggal menutupi layar', () => {
  // Ini yang paling penting: gerbang notifikasi ada di bawahnya, dan notifikasi wajib.
  const env = fakeEnv();
  const shown = splash.show(env, { now: NOW });
  assert.strictEqual(shown.shown, true);
  assert.ok(env._timers.length >= 1, 'ada pewaktu yang menutupnya sendiri');
  const auto = env._timers[0];
  assert.ok(auto.ms >= 2000 && auto.ms <= 3000, `durasi tayang ${auto.ms} di luar 2-3 detik`);
  // Sentuhan juga menutup, tanpa menunggu pewaktu.
  const host = env._body.children[0];
  assert.ok((host.listeners.click || []).length >= 1, 'sentuhan di mana pun menutup splash');
});

test('menutup dua kali tidak menggandakan apa pun dan tidak melempar', () => {
  const env = fakeEnv();
  const shown = splash.show(env, { now: NOW });
  shown.close();
  shown.close();
  assert.ok(true);
});

test('tanpa modul maskot, splash tidak tampil dan tidak merusak apa pun', () => {
  const env = fakeEnv({ FiezelMascot: undefined });
  const result = splash.show(env, { now: NOW });
  assert.strictEqual(result.shown, false);
  assert.strictEqual(result.reason, 'mascot_unavailable');
  assert.strictEqual(env._body.children.length, 0);
});

test('penyimpanan yang menolak tidak menghalangi splash', () => {
  const env = fakeEnv({
    localStorage: { getItem() { throw new Error('ditolak'); }, setItem() { throw new Error('penuh'); } }
  });
  const result = splash.show(env, { now: NOW });
  assert.strictEqual(result.shown, true, 'gagal membaca preferensi bukan alasan menolak menyapa');
  result.close();
});

test('splash memakai satu tombol dengan ukuran sentuh yang layak', () => {
  assert.ok(/\.fiezel-splash-cta\{[^}]*min-height:44px/.test(css.replace(/\s*\n\s*/g, '')),
    'tombol splash harus memenuhi ukuran sentuh minimum');
});

console.log('');
if (failures) { console.error('FIEZEL brand mascot: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL brand mascot: PASS');
