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

test('palet mengikuti handoff resmi', () => {
  assert.strictEqual(mascot.PALETTE.primary, '#7a1e2e');
  assert.strictEqual(mascot.PALETTE.deep, '#4a1119');
  assert.strictEqual(mascot.PALETTE.cream, '#fdf3e8');
  assert.strictEqual(mascot.PALETTE.gold, '#d9a441');
});

test('maskot memakai KARYA ASLI, bukan gambar ulang', () => {
  // Versi m025-75 menuliskan ulang karakter ini sebagai jalur SVG buatan sendiri dan ditolak
  // OWNER. Gate ini menahan agar jalan itu tidak diambil lagi: yang boleh tampil hanyalah
  // berkas gambar dari sheet handoff.
  const html = mascot.markup({ pose: 'hero' });
  assert.ok(/^<img /.test(html), 'maskot harus berupa gambar aset, bukan markup gambar tangan');
  assert.ok(!/<path|<svg|<circle|<ellipse/.test(html), 'tidak boleh ada jalur SVG buatan sendiri');
  assert.ok(/src="\.\/assets\/brand\/fiezel-hero\.png"/.test(html));
});

test('setiap aset yang didaftarkan benar-benar ada dan bukan berkas kosong', () => {
  for (const file of mascot.files()) {
    const path = './' + file.replace(/^\.\//, '');
    assert.ok(fs.existsSync(path), 'aset hilang: ' + file);
    const size = fs.statSync(path).size;
    assert.ok(size > 4000, `aset ${file} hanya ${size} byte - kemungkinan besar rusak atau kosong`);
  }
});

test('ukuran yang didaftarkan cocok dengan dimensi berkas sebenarnya', () => {
  // Rasio dipakai untuk memesan ruang sebelum gambar termuat. Kalau angkanya melenceng dari
  // berkasnya, layar akan tersentak saat gambar masuk.
  for (const [pose, art] of Object.entries(mascot.POSES)) {
    const buf = fs.readFileSync('./assets/brand/' + art.file);
    assert.strictEqual(buf.toString('ascii', 12, 16), 'IHDR', pose + ': bukan PNG yang sah');
    assert.strictEqual(buf.readUInt32BE(16), art.width, pose + ': lebar tidak cocok');
    assert.strictEqual(buf.readUInt32BE(20), art.height, pose + ': tinggi tidak cocok');
  }
});

test('aset ikut dibawa ke shell offline', () => {
  // Maskot yang hilang saat offline membuat splash tampil kosong justru pada saat aplikasi
  // paling perlu terlihat utuh.
  const sw = fs.readFileSync('./sw.js', 'utf8');
  for (const file of mascot.files()) {
    assert.ok(sw.indexOf(file.replace('./', './')) !== -1, 'belum masuk daftar cache: ' + file);
  }
});

test('rasio asli dipertahankan, sesuai aturan produksi handoff', () => {
  // Handoff melarang merentangkan karakter ini. Tingginya karena itu selalu dihitung, tidak
  // pernah diminta terpisah.
  const html = mascot.markup({ pose: 'hero', width: 120 });
  const w = Number(/width="(\d+)"/.exec(html)[1]);
  const h = Number(/height="(\d+)"/.exec(html)[1]);
  const art = mascot.POSES.hero;
  assert.strictEqual(w, 120);
  assert.strictEqual(h, Math.round(120 * (art.height / art.width)));
  assert.ok(Math.abs((w / h) - (art.width / art.height)) < 0.01, 'rasio berubah - karakter terentang');
});

test('pose asing jatuh ke hero, bukan menghasilkan tautan rusak', () => {
  assert.strictEqual(mascot.normalizePose('ngawur'), 'hero');
  assert.strictEqual(mascot.normalizePose('CODING'), 'coding');
  const html = mascot.markup({ pose: '../../etc/passwd' });
  assert.ok(/fiezel-hero\.png/.test(html), 'jalur asing tidak boleh sampai ke src');
});

test('teks alternatif yang disuntikkan tidak bisa menyuntik markup', () => {
  const html = mascot.markup({ alt: '"><script>alert(1)</script>' });
  assert.ok(!/<script>/.test(html));
});

test('maskot dekoratif tidak dibacakan dua kali oleh pembaca layar', () => {
  const decorative = mascot.markup({ decorative: true });
  assert.ok(/aria-hidden="true"/.test(decorative) && /alt=""/.test(decorative));
  const meaningful = mascot.markup({ pose: 'belajar' });
  assert.ok(/alt="Maskot FIEZEL sedang membaca"/.test(meaningful), meaningful);
});

test('animasi tetap CSS supaya tunduk pada kurangi-gerak', () => {
  assert.ok(/@keyframes fzm-float/.test(css) && /@keyframes fzm-hop/.test(css));
  const flat = css.replace(/\s+/g, ' ');
  assert.ok(flat.indexOf('prefers-reduced-motion:reduce){ *{') !== -1 || /prefers-reduced-motion: ?reduce\)\s*\{\s*\*/.test(flat),
    'blok global kurangi-gerak harus tetap ada');
  // Handoff melarang mewarnai ulang dan merentangkan; animasi hanya boleh menggeser,
  // memiringkan sedikit, dan menskala seragam.
  const brand = css.slice(css.indexOf('FIEZEL brand: maskot resmi'));
  assert.ok(!/filter:|hue-rotate|scaleX\(|scaleY\(/.test(brand), 'maskot tidak boleh diwarnai ulang atau direntangkan');
});

test('tidak ada teks anotasi sheet yang ikut terbawa ke aset', () => {
  // Potongan awal sempat membawa keterangan seperti "Belajar" dan judul baris
  // "ACTIVITIES / POSES" ke dalam gambar. OWNER menolaknya, dan memang benar: itu catatan
  // untuk desainer, bukan bagian karakter. Ukuran aset yang rapat adalah buktinya - potongan
  // yang masih memuat keterangan selalu jauh lebih tinggi daripada karakternya.
  for (const [pose, art] of Object.entries(mascot.POSES)) {
    if (pose === 'hero' || pose === 'mark' || pose === 'icon') continue;
    const ratio = art.height / art.width;
    assert.ok(ratio < 1.6, `${pose} terlalu jangkung (${art.width}x${art.height}) - kemungkinan masih membawa teks keterangan`);
  }
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
