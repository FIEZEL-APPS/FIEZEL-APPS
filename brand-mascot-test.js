/**
 * FIEZEL gate — maskot Percik dan splash pembuka.
 *
 * Redesign gampang rusak diam-diam: warna melenceng dari spesifikasi, animasi tetap berjalan
 * saat pengguna minta kurangi-gerak, atau splash tertinggal menutupi layar. Yang terakhir
 * paling berbahaya di produk ini, karena notifikasi wajib dan gerbangnya ada di bawah splash.
 *
 * m025-78: enam pose dan ikon aplikasi diganti dari kiriman produksi baru (D:\png), empat
 * pose (hero/belajar/mark/mengintip) tetap memakai potongan sheet PDF lama karena belum ada
 * penggantinya. Gate ini menahan supaya perbedaan kualitas itu tidak diam-diam disembunyikan
 * dan supaya token warna/font baru benar-benar dipakai, bukan hanya ditulis di komentar.
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
const brandCss = css.slice(css.indexOf('FIEZEL brand: Percik'));

test('palet mengikuti FIEZEL_Complete_Design_Specification.pdf bagian 2 persis', () => {
  assert.strictEqual(mascot.PALETTE.bg, '#efe3d3', 'Primary BG');
  assert.strictEqual(mascot.PALETTE.paper, '#fdf3e2', 'Card/Paper');
  assert.strictEqual(mascot.PALETTE.ink, '#2c1b1c', 'Text Primary');
  assert.strictEqual(mascot.PALETTE.primary, '#7a1e2e', 'Accent/Primary');
  assert.strictEqual(mascot.PALETTE.gold, '#d9a441', 'Gold/Highlight');
  assert.strictEqual(mascot.PALETTE.soft, '#f3e0e0', 'Soft Accent');
  assert.strictEqual(mascot.PALETTE.deep, '#4a1119');
});

test('maskot memakai KARYA ASLI, bukan gambar ulang', () => {
  // Versi m025-75 menuliskan ulang karakter ini sebagai jalur SVG buatan sendiri dan ditolak
  // OWNER. Gate ini menahan agar jalan itu tidak diambil lagi: yang boleh tampil hanyalah
  // berkas gambar.
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
    assert.ok(size > 3000, `aset ${file} hanya ${size} byte - kemungkinan besar rusak atau kosong`);
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

test('enam pose kiriman produksi baru terdaftar dengan berkas barunya', () => {
  const upgraded = ['semangat', 'coding', 'istirahat', 'jadwal', 'pencapaian', 'menulis'];
  for (const pose of upgraded) {
    assert.ok(mascot.POSES[pose], 'pose hilang dari registry: ' + pose);
    assert.ok(mascot.POSES[pose].width >= 600, pose + ' harus dari sumber baru (lebar >=600), bukan potongan sheet lama');
  }
  // Ikon aplikasi harus berupa berkas 512x512 baru, bukan potongan sheet lama 64x64.
  assert.strictEqual(mascot.POSES.icon.file, 'fiezel-icon-512.png');
  assert.strictEqual(mascot.POSES.icon.width, 512);
});

test('empat pose tanpa pengganti tetap terdaftar, tidak diam-diam dihapus', () => {
  // Belum ada kiriman baru untuk pose ini. Menghapusnya diam-diam akan mematahkan splash
  // (hero, mark) dan carousel (belajar, mengintip) tanpa peringatan.
  for (const pose of ['hero', 'belajar', 'mark', 'mengintip']) {
    assert.ok(mascot.POSES[pose], 'pose seharusnya masih ada: ' + pose);
  }
});

test('aset ikut dibawa ke shell offline', () => {
  // Maskot yang hilang saat offline membuat splash tampil kosong justru pada saat aplikasi
  // paling perlu terlihat utuh.
  const sw = fs.readFileSync('./sw.js', 'utf8');
  for (const file of mascot.files()) {
    assert.ok(sw.indexOf(file) !== -1, 'belum masuk daftar cache: ' + file);
  }
});

test('font Fredoka dan Plus Jakarta Sans dimuat lokal, ikut ke shell offline', () => {
  // PWA ini offline-first; bergantung pada fonts.googleapis.com saat runtime berarti
  // splash/onboarding kosong huruf begitu jaringan mati. Karena itu di-self-host.
  assert.ok(/@font-face\{font-family:'FZFredoka'/.test(css.replace(/\s+/g, '')), 'Fredoka belum di-@font-face');
  assert.ok(/@font-face\{font-family:'FZPlusJakartaSans'/.test(css.replace(/\s+/g, '')), 'Plus Jakarta Sans belum di-@font-face');
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(css), 'tidak boleh bergantung pada Google Fonts CDN saat runtime');
  const sw = fs.readFileSync('./sw.js', 'utf8');
  const fonts = fs.readdirSync('./assets/fonts').filter(f => f.endsWith('.woff2'));
  assert.ok(fonts.length >= 7, 'berkas font kurang dari yang diharapkan: ' + fonts.length);
  for (const f of fonts) assert.ok(sw.includes('./assets/fonts/' + f), 'font belum di-cache: ' + f);
});

test('rasio asli dipertahankan, sesuai aturan produksi', () => {
  // Aturan produksi melarang merentangkan karakter ini. Tingginya karena itu selalu
  // dihitung, tidak pernah diminta terpisah.
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
  assert.ok(/alt="Percik sedang membaca"/.test(meaningful), meaningful);
});

test('animasi tetap CSS supaya tunduk pada kurangi-gerak', () => {
  assert.ok(/@keyframes fzm-float/.test(css) && /@keyframes fzm-hop/.test(css));
  const flat = css.replace(/\s+/g, ' ');
  assert.ok(flat.indexOf('prefers-reduced-motion:reduce){ *{') !== -1 || /prefers-reduced-motion: ?reduce\)\s*\{\s*\*/.test(flat),
    'blok global kurangi-gerak harus tetap ada');
  // Aturan produksi melarang mewarnai ulang dan merentangkan; animasi hanya boleh
  // menggeser, memiringkan sedikit, dan menskala seragam.
  assert.ok(!/filter:|hue-rotate|scaleX\(|scaleY\(/.test(brandCss), 'maskot tidak boleh diwarnai ulang atau direntangkan');
  // Override lokal supaya kurangi-gerak juga menghentikan kedip-setara (bintang berkelip).
  assert.ok(/\.fiezel-splash-still \.fiezel-mascot,\.fiezel-ob-still \.fiezel-mascot/.test(brandCss.replace(/\s+/g, ' ')),
    'override kurangi-gerak lokal untuk maskot harus ada');
});

test('tidak ada teks anotasi sheet yang ikut terbawa ke aset', () => {
  // Potongan awal (m025-76) sempat membawa keterangan seperti "Belajar" dan judul baris
  // "ACTIVITIES / POSES" ke dalam gambar. Ukuran aset yang rapat adalah buktinya - potongan
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

test('splash memberi tahu saat ia selesai, sehingga langkah berikutnya menyambung tanpa tebakan', () => {
  const env = fakeEnv();
  let closed = 0;
  const shown = splash.show(env, { now: NOW, onClose: () => { closed++; } });
  shown.close();
  assert.strictEqual(closed, 1);
  shown.close();
  assert.strictEqual(closed, 1, 'menutup dua kali tidak boleh memanggil dua kali');
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

test('splash memakai tombol dengan ukuran sentuh yang layak', () => {
  const flat = css.replace(/\s*\n\s*/g, '');
  assert.ok(/\.fiezel-btn\{[^}]*min-height:44px/.test(flat), 'tombol dasar harus memenuhi ukuran sentuh minimum');
  assert.ok(/data-splash-cta/.test(fs.readFileSync('./features/brand/fiezel-splash.js', 'utf8')));
});

test('lapisan splash/onboarding penuh layar, bukan kartu kecil terapung', () => {
  // OWNER menandai versi sebelumnya "tidak penuh layar, terlalu kecil". Perbaikannya:
  // .fiezel-splash/.fiezel-ob menutupi seluruh viewport (position:fixed;inset:0), dan
  // kontennya adalah bottom sheet selebar penuh, bukan kartu terpusat dengan margin besar.
  const flat = css.replace(/\s+/g, ' ');
  assert.ok(/\.fiezel-splash,\.fiezel-ob\{[^}]*position:fixed;inset:0/.test(flat.replace(/\s/g, '')),
    'splash dan onboarding harus menutupi seluruh viewport');
  assert.ok(/\.fiezel-sheet\{[^}]*width:100%/.test(flat.replace(/\s/g, '')),
    'lembar konten harus selebar penuh, bukan kartu kecil di tengah');
  assert.ok(!/width:min\(22rem/.test(css), 'kartu kecil terpusat versi lama tidak boleh kembali');
});

console.log('');
if (failures) { console.error('FIEZEL brand mascot: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL brand mascot: PASS');
