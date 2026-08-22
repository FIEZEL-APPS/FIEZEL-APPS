/**
 * FIEZEL gate — tur pengenalan (coach marks).
 *
 * OWNER m025-101: "anggaplah ada user baru, dan dia baru buka apps, dan ga ngerti cara pake".
 *
 * Lapisan penuh layar adalah tempat paling mudah untuk mengurung pengguna, dan produk ini
 * sudah pernah melakukannya: pada m025-88 tombol "Lewati" di perkenalan tidak menyerahkan
 * kendali kembali, dan murid ditinggal di cangkang kosong. Karena itu gate ini menahan jalan
 * keluarnya lebih keras daripada tampilannya - setiap cara berakhir, termasuk cara yang tidak
 * disengaja, harus benar-benar membongkar lapisannya.
 *
 * Dua invarian lain yang dijaga di sini lahir dari bug yang BENAR-BENAR terjadi saat modul ini
 * dibangun, bukan dari kekhawatiran:
 *
 *   - Menyimpan simpul DOM antar langkah membuat sorotan menunjuk sudut kiri atas layar,
 *     karena setApp() mengganti seluruh innerHTML #app pada setiap render dan simpul yang
 *     dipegang menjadi yatim.
 *   - scrollIntoView tidak bisa dipakai: style.css memasang html{scroll-behavior:smooth},
 *     jadi kotak target diukur sebelum gulirannya selesai.
 */
const assert = require('assert');
const fs = require('fs');
const tour = require('./features/onboarding/fiezel-tour.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function el(tag) {
  const node = {
    tag, className: '', innerHTML: '', parentNode: null, children: [], listeners: {}, attrs: {},
    style: {}, _box: { top: 10, left: 0, width: 100, height: 40 },
    classList: { add(v) { node.className += ' ' + v; } },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return node.attrs[k]; },
    appendChild(c) { c.parentNode = node; node.children.push(c); },
    removeChild(c) { node.children = node.children.filter(x => x !== c); c.parentNode = null; },
    addEventListener(t, fn) { (node.listeners[t] = node.listeners[t] || []).push(fn); },
    removeEventListener() {},
    getBoundingClientRect() { return node._box; },
    scrollIntoView() {},
    querySelector(sel) {
      const m = /^\[([a-z-]+)\]$/.exec(sel);
      if (!m) return null;
      if (!node._btns || node._html !== node.innerHTML) {
        node._html = node.innerHTML;
        node._btns = {};
        const re = /<button[^>]*?(data-tour-[a-z]+)[^>]*>([^<]*)</g;
        let x;
        while ((x = re.exec(node.innerHTML))) {
          const b = el('button');
          b.attrs[x[1]] = '';
          b._label = x[2];
          node._btns[x[1]] = b;
        }
        const h2 = /<h2>([^<]*)<\/h2>/.exec(node.innerHTML);
        node._title = h2 ? h2[1] : '';
      }
      return node._btns[m[1]] || null;
    },
    querySelectorAll() { return []; }
  };
  return node;
}

function fakeEnv(targets) {
  const body = el('body');
  const store = {};
  const found = targets || { '.launcher-actions .primary': el('button'), '.learning-launcher': el('div'), '.bottomnav': el('nav'), '.coach-preview': el('aside') };
  const env = {
    innerHeight: 800,
    scrollY: 0,
    scrollTo(opts) { env.scrollY = opts && typeof opts.top === 'number' ? opts.top : env.scrollY; },
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    addEventListener() {}, removeEventListener() {},
    document: {
      body,
      createElement: el,
      querySelector: sel => (Object.prototype.hasOwnProperty.call(found, sel) ? found[sel] : null),
      addEventListener() {}, removeEventListener() {}
    },
    _body: body, _store: store, _found: found
  };
  return env;
}

/* ---------------- jalan keluar: pelajaran m025-88 ---------------- */

test('"Lewati" benar-benar membongkar lapisannya dan menyerahkan kendali kembali', () => {
  const env = fakeEnv();
  const seen = [];
  const run = tour.show(env, { onFinish: d => seen.push(d.via) });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(env._body.children.length, 1, 'lapisan tur harus terpasang');
  run.element.querySelector('[data-tour-skip]').listeners.click[0]({});
  assert.strictEqual(env._body.children.length, 0, 'lapisan penuh layar tidak boleh tertinggal');
  assert.deepStrictEqual(seen, ['skip'], 'pemanggil harus diberi tahu, bukan ditinggal menebak');
});

test('menyelesaikan langkah terakhir menutup dan mencatat, tepat sekali', () => {
  const env = fakeEnv();
  const seen = [];
  const run = tour.show(env, { onFinish: d => seen.push(d.via) });
  for (let i = 0; i < tour.STEPS.length; i++) run.element.querySelector('[data-tour-next]').listeners.click[0]({});
  assert.deepStrictEqual(seen, ['finish']);
  assert.strictEqual(env._body.children.length, 0);
  assert.strictEqual(tour.completed(env), true);
});

test('sekali saja - tur yang sudah selesai tidak menawarkan diri lagi', () => {
  const env = fakeEnv();
  tour.show(env, {}).element.querySelector('[data-tour-skip]').listeners.click[0]({});
  const again = tour.show(env, {});
  assert.strictEqual(again.shown, false);
  assert.strictEqual(again.reason, 'completed');
});

test('bisa diputar ulang setelah direset - perkenalan m025-88 tidak bisa, dan itu keliru', () => {
  const env = fakeEnv();
  tour.show(env, {}).close();
  assert.strictEqual(tour.completed(env), true);
  assert.strictEqual(tour.reset(env), true);
  assert.strictEqual(tour.completed(env), false);
  assert.strictEqual(tour.show(env, {}).shown, true);
});

/* ---------------- target: tidak pernah menunjuk yang tidak ada ---------------- */

test('target yang tidak ada dibuang sebelum tur dimulai', () => {
  const env = fakeEnv({ '.bottomnav': el('nav') });
  const run = tour.show(env, {});
  assert.strictEqual(run.shown, true);
  assert.strictEqual(run.steps, 1, 'hanya langkah yang targetnya benar-benar ada yang tersisa');
});

test('target berukuran nol tidak bisa disorot, jadi ikut dibuang', () => {
  const nol = el('div');
  nol._box = { top: 0, left: 0, width: 0, height: 0 };
  const env = fakeEnv({ '.learning-launcher': nol, '.bottomnav': el('nav') });
  assert.strictEqual(tour.show(env, {}).steps, 1);
});

test('tidak ada satu pun target berarti tur tidak tampil, dan tidak mencoba lagi', () => {
  const env = fakeEnv({});
  const run = tour.show(env, {});
  assert.strictEqual(run.shown, false);
  assert.strictEqual(run.reason, 'no_target');
  assert.strictEqual(tour.completed(env), true,
    'tanpa ini tur akan mencoba lagi setiap kali Home dirender ulang');
});

/* ---------------- dua bug yang benar-benar terjadi saat modul ini dibangun ---------------- */

test('AKAR BUG: target di-query ULANG tiap langkah, bukan disimpan sebagai simpul', () => {
  const src = fs.readFileSync('./features/onboarding/fiezel-tour.js', 'utf8');
  assert.ok(/out\.push\(steps\[i\]\);/.test(src),
    'resolveSteps harus menyimpan langkahnya, bukan simpul DOM-nya');
  assert.ok(!/node:\s*node\s*\}/.test(src), 'simpul tidak boleh ikut disimpan antar langkah');
  const paint = src.slice(src.indexOf('function paint()'), src.indexOf('function next()'));
  assert.ok(/doc\.querySelector\(current\.target\)/.test(paint),
    'setApp() mengganti seluruh innerHTML #app, jadi simpul yang dipegang jadi yatim dan sorotannya menunjuk sudut kiri atas');
});

test('AKAR BUG: guliran dihitung sendiri, scrollIntoView tidak dipakai', () => {
  const src = fs.readFileSync('./features/onboarding/fiezel-tour.js', 'utf8');
  const paint = src.slice(src.indexOf('function paint()'), src.indexOf('function next()'));
  assert.ok(!/node\.scrollIntoView\(/.test(paint),
    'html{scroll-behavior:smooth} membuat scrollIntoView menganimasikan guliran, dan kotak target diukur sebelum animasinya selesai');
  assert.ok(/behavior: 'instant'/.test(paint), 'guliran tur tidak boleh dianimasikan');
  assert.ok(paint.indexOf('scrollTo') < paint.indexOf('box = { top: r.top'),
    'gulir DULU, ukur SESUDAHNYA - urutan terbalik adalah bug yang sama dengan bentuk berbeda');
});

test('guliran benar-benar terjadi ketika target di luar layar', () => {
  const jauh = el('div');
  jauh._box = { top: 2400, left: 0, width: 340, height: 600 };
  const env = fakeEnv({ '.learning-launcher': jauh });
  tour.show(env, {});
  assert.ok(env.scrollY > 0, 'target di y=2400 dengan layar 800 wajib dibawa ke pandangan');
});

/* ---------------- isi ---------------- */

test('setiap langkah menunjuk selector nyata dan punya penjelasan', () => {
  const ids = new Set();
  for (const s of tour.STEPS) {
    assert.ok(s.target && s.target.length > 1, 'langkah tanpa target tidak menunjuk apa pun');
    assert.ok(s.title && s.body, s.id + ': langkah tanpa penjelasan tidak mengajari apa-apa');
    assert.ok(!ids.has(s.id), 'id langkah ganda: ' + s.id);
    ids.add(s.id);
  }
  assert.ok(tour.STEPS.length >= 3 && tour.STEPS.length <= 6,
    'tur yang terlalu panjang berhenti dibaca; terlalu pendek tidak mengajari apa pun');
});

test('selector setiap langkah benar-benar ada di aplikasi', () => {
  const css = fs.readFileSync('./style.css', 'utf8');
  const html = fs.readFileSync('./index.html', 'utf8');
  const app = fs.readFileSync('./app.js', 'utf8');
  for (const s of tour.STEPS) {
    const cls = s.target.split(' ').pop().replace('.', '');
    assert.ok(css.includes('.' + cls) || html.includes(cls) || app.includes(cls),
      'selector tur menunjuk kelas yang tidak ada di mana pun: ' + s.target);
  }
});

test('teks tur tidak bisa menyuntik markup', () => {
  const env = fakeEnv();
  const run = tour.show(env, { steps: [{ id: 'x', target: '.bottomnav', title: '<img src=x>', body: '<script>alert(1)</script>' }] });
  assert.ok(!/<img|<script>/.test(run.element.innerHTML));
  assert.ok(/&lt;img|&lt;script&gt;/.test(run.element.innerHTML));
});

test('kurangi-gerak mematikan animasinya, bukan turnya', () => {
  const env = fakeEnv();
  env.matchMedia = () => ({ matches: true });
  const run = tour.show(env, {});
  assert.strictEqual(run.shown, true, 'kurangi-gerak bukan alasan menyembunyikan petunjuk');
  assert.ok(/fz-tour-still/.test(run.element.className));
});

/* ---------------- pemasangan ---------------- */

test('tur terpasang di aplikasi, ter-precache, dan bisa diulang dari Pengaturan', () => {
  const html = fs.readFileSync('./index.html', 'utf8');
  const sw = fs.readFileSync('./sw.js', 'utf8');
  const app = fs.readFileSync('./app.js', 'utf8');
  assert.ok(html.includes('./features/onboarding/fiezel-tour.js'), 'modul tur belum dimuat');
  assert.ok(sw.includes("'./features/onboarding/fiezel-tour.js'"), 'tur harus ikut precache, kalau tidak ia hilang saat offline');
  assert.ok(/function maybeStartTour\(\)/.test(app) && /maybeStartTour,900/.test(app),
    'tur harus dijadwalkan dari boot');
  assert.ok(/function homeScreenIsClear\(\)/.test(app),
    'tur hanya boleh jalan ketika layar Home benar-benar bersih dari lapisan lain');
  assert.ok(/function replayTour\(\)/.test(app) && /onclick="replayTour\(\)"/.test(app),
    'harus ada jalan memutar ulang tur dari Pengaturan');
});

test('gate tur sudah terdaftar di CI', () => {
  const wf = fs.readFileSync('./.github/workflows/quality.yml', 'utf8');
  assert.ok(/node tour-test\.js/.test(wf), 'gate yang tidak dijalankan CI tidak menjaga apa pun');
});

process.on('exit', () => {
  if (failures) {
    console.error('FIEZEL tur pengenalan: FAIL (' + failures + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL tur pengenalan: PASS');
  }
});
