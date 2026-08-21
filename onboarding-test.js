/**
 * FIEZEL gate — onboarding enam langkah.
 *
 * Lapisan yang menutupi seluruh layar adalah tempat paling mudah untuk mengurung pengguna,
 * dan di produk ini gerbang notifikasi berada tepat di bawahnya. Karena itu gate ini menahan
 * tiga hal sekaligus: perkenalan harus selalu punya jalan keluar di SETIAP langkah, harus
 * berhenti setelah selesai atau dilewati, dan tidak boleh menjanjikan yang tidak dipegang
 * produk - khususnya prediksi skor dan tes yang disebut singkat padahal 150 soal.
 */
const assert = require('assert');
const fs = require('fs');
const mascot = require('./features/brand/fiezel-mascot.js');
const splash = require('./features/brand/fiezel-splash.js');
const onboarding = require('./features/onboarding/fiezel-onboarding.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const css = fs.readFileSync('./style.css', 'utf8');
const app = fs.readFileSync('./app.js', 'utf8');

function el(tag) {
  const node = {
    tag, className: '', innerHTML: '', children: [], parentNode: null, listeners: {}, attrs: {},
    classList: { add(v) { node.className += ' ' + v; } },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return node.attrs[k]; },
    appendChild(child) { child.parentNode = node; node.children.push(child); },
    removeChild(child) { node.children = node.children.filter(c => c !== child); child.parentNode = null; },
    addEventListener(type, fn) { (node.listeners[type] = node.listeners[type] || []).push(fn); },
    // Pencari sederhana atas markup yang sedang terpasang. Hasilnya DI-CACHE selama innerHTML
    // tidak berubah - tanpa itu modul memasang listener pada satu objek dan gate memeriksa
    // objek lain, sehingga tombol yang sebenarnya hidup terlihat mati.
    _html: null, _found: null,
    _scan() {
      if (node._html === node.innerHTML && node._found) return node._found;
      node._html = node.innerHTML;
      node._found = [];
      const re = /<button([^>]*)>/g;
      let m;
      while ((m = re.exec(node.innerHTML))) {
        const button = el('button');
        const attrRe = /([a-z][a-z-]*)(?:="([^"]*)")?/g;
        let a;
        while ((a = attrRe.exec(m[1]))) button.attrs[a[1]] = a[2] === undefined ? '' : a[2];
        node._found.push(button);
      }
      return node._found;
    },
    querySelector(sel) { return node.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel) {
      const attr = /^\[([a-z-]+)(?:="([^"]*)")?\]$/.exec(sel);
      if (!attr) return [];
      const [, name, value] = attr;
      return node._scan().filter(b => Object.prototype.hasOwnProperty.call(b.attrs, name)
        && (value === undefined || b.attrs[name] === value));
    }
  };
  return node;
}

function fakeEnv(over) {
  const store = new Map();
  const timers = [];
  const body = el('body');
  return Object.assign({
    document: { createElement: el, body },
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
}

const NOW = Date.parse('2026-08-21T04:00:00Z');

test('enam langkah, urut, dengan salinan teks dari sheet handoff', () => {
  assert.strictEqual(onboarding.STEPS.length, 6);
  onboarding.STEPS.forEach((step, i) => assert.strictEqual(step.index, i + 1, 'langkah ' + i + ' tidak urut'));
  assert.strictEqual(onboarding.STEPS[0].title, 'Selamat datang di FIEZEL!');
  assert.strictEqual(onboarding.STEPS[1].title, 'Belajar jadi lebih seru');
  assert.strictEqual(onboarding.STEPS[2].title, 'Pilih tujuan belajarmu');
  assert.strictEqual(onboarding.STEPS[3].title, 'Tes penempatan singkat');
  assert.strictEqual(onboarding.STEPS[4].title, 'Atur jadwal & pengingat');
  assert.strictEqual(onboarding.STEPS[5].title, 'Semua siap!');
});

test('setiap langkah memakai pose maskot yang benar-benar terdaftar', () => {
  for (const step of onboarding.STEPS) {
    assert.ok(Object.prototype.hasOwnProperty.call(mascot.POSES, step.pose),
      'pose tidak terdaftar: ' + step.pose);
    assert.strictEqual(mascot.normalizePose(step.pose), step.pose,
      step.pose + ' jatuh ke pose lain - tautan gambar akan salah');
  }
});

test('aset pose onboarding ada, tidak kosong, dan ukurannya cocok dengan berkasnya', () => {
  for (const pose of ['mengintip', 'menulis', 'jadwal', 'siap', 'belajar']) {
    const art = mascot.POSES[pose];
    const path = './assets/brand/' + art.file;
    assert.ok(fs.existsSync(path), 'aset hilang: ' + art.file);
    const buf = fs.readFileSync(path);
    assert.ok(buf.length > 4000, art.file + ' hanya ' + buf.length + ' byte');
    assert.strictEqual(buf.toString('ascii', 12, 16), 'IHDR', pose + ': bukan PNG yang sah');
    assert.strictEqual(buf.readUInt32BE(16), art.width, pose + ': lebar tidak cocok');
    assert.strictEqual(buf.readUInt32BE(20), art.height, pose + ': tinggi tidak cocok');
  }
});

test('modul dan aset onboarding ikut ke shell offline', () => {
  const sw = fs.readFileSync('./sw.js', 'utf8');
  assert.ok(sw.includes('./features/onboarding/fiezel-onboarding.js'), 'modul belum di-cache');
  for (const pose of ['mengintip', 'menulis', 'jadwal', 'siap']) {
    assert.ok(sw.includes('./assets/brand/' + mascot.POSES[pose].file), 'aset belum di-cache: ' + pose);
  }
  const index = fs.readFileSync('./index.html', 'utf8');
  assert.ok(index.includes('features/onboarding/fiezel-onboarding.js'), 'modul belum dimuat halaman');
});

test('SETIAP langkah punya jalan keluar - tidak ada satu pun yang mengurung', () => {
  // Ini alasan utama gate ini ada. Gerbang notifikasi berada di bawah lapisan ini, dan
  // notifikasi wajib; satu langkah tanpa jalan keluar berarti aplikasi tidak bisa dimasuki.
  const env = fakeEnv();
  for (let i = 0; i < onboarding.STEPS.length; i++) {
    const html = onboarding.stepMarkup(env, i);
    assert.ok(/data-ob-skip/.test(html), 'langkah ' + (i + 1) + ' tidak punya tombol lewati');
    assert.ok(/data-ob-advance|data-ob-primary|data-ob-track/.test(html), 'langkah ' + (i + 1) + ' tidak punya tombol maju');
  }
});

test('melewati di langkah mana pun langsung menutup dan tidak kembali menghadang', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(env._body.children.length, 1);
  run.element.querySelector('[data-ob-skip]');
  run.close();
  assert.strictEqual(onboarding.completed(env), true, 'melewati harus dicatat selesai');
  const again = onboarding.show(env, { now: NOW + 60000 });
  assert.strictEqual(again.shown, false);
  assert.strictEqual(again.reason, 'completed');
});

test('memilih IELTS dan TOEFL menghasilkan nilai yang berbeda, bukan tombol kembar', () => {
  // Dua tombol yang menulis hal yang persis sama adalah pilihan palsu. Profil prasyaratnya
  // memang satu (`exam_foundation`), jadi yang wajib berbeda adalah tracknya.
  assert.strictEqual(onboarding.TRACKS.ielts.goal, onboarding.TRACKS.toefl.goal);
  assert.notStrictEqual(onboarding.TRACKS.ielts.id, onboarding.TRACKS.toefl.id);
  assert.notStrictEqual(onboarding.TRACKS.ielts.label, onboarding.TRACKS.toefl.label);
  assert.strictEqual(onboarding.normalizeTrack('IELTS').id, 'ielts');
  assert.strictEqual(onboarding.normalizeTrack('ngawur'), null);

  const seen = [];
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true, onGoal: v => seen.push(v) });
  // Maju ke langkah 3, lalu tekan tombol TOEFL yang benar-benar dipancarkan modul.
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  const toefl = run.element.querySelectorAll('[data-ob-track="toefl"]')[0];
  assert.ok(toefl, 'tombol TOEFL tidak ada di langkah 3');
  toefl.listeners.click[0]();
  assert.deepStrictEqual(seen, [{ track: 'toefl', label: 'TOEFL', goal: 'exam_foundation' }]);
});

test('tes penempatan tidak dijalankan di balik lapisan yang masih terpasang', () => {
  // Kuis mengambil alih seluruh layar. Kalau perkenalan masih tergantung di atasnya, murid
  // mengerjakan 150 soal di balik kaca.
  const env = fakeEnv();
  const order = [];
  const run = onboarding.show(env, { now: NOW, force: true, onPlacement: () => order.push('placement') });
  for (let i = 0; i < 3; i++) run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 3, 'harus berada di langkah 4');
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.deepStrictEqual(order, ['placement']);
  assert.strictEqual(onboarding.completed(env), true, 'perkenalan harus sudah selesai sebelum kuis mulai');
});

test('langkah 5 dan 6 tetap bisa dicapai tanpa mengerjakan tes penempatan', () => {
  // Kalau satu-satunya jalan maju dari langkah 4 adalah mengerjakan 150 soal, dua langkah
  // terakhir tidak pernah terlihat oleh murid yang ingin menundanya.
  const env = fakeEnv();
  let finished = 0;
  const run = onboarding.show(env, { now: NOW, force: true, onFinish: () => { finished++; } });
  for (let i = 0; i < 5; i++) {
    const next = run.element.querySelector('[data-ob-advance]');
    assert.ok(next, 'langkah ' + (run.stepIndex() + 1) + ' tidak punya jalan maju tanpa aksi');
    next.listeners.click[0]();
  }
  assert.strictEqual(run.stepIndex(), 5, 'harus sampai langkah 6');
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.strictEqual(finished, 1);
  assert.strictEqual(onboarding.completed(env), true);
});

test('tanpa modul maskot, perkenalan tidak tampil dan tidak merusak apa pun', () => {
  const env = fakeEnv({ FiezelMascot: undefined });
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, false);
  assert.strictEqual(run.reason, 'mascot_unavailable');
  assert.strictEqual(env._body.children.length, 0);
});

test('penyimpanan yang menolak tidak mengurung dan tidak menghalangi', () => {
  const env = fakeEnv({
    localStorage: { getItem() { throw new Error('ditolak'); }, setItem() { throw new Error('penuh'); } }
  });
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, true, 'gagal membaca preferensi bukan alasan menolak menyapa');
  run.close();
});

test('tidak ada janji prediksi skor di salinan teks mana pun', () => {
  // Roadmap R4 melarangnya, dan layar tujuan belajar adalah tempat paling menggoda untuk
  // menjanjikannya.
  const all = onboarding.STEPS.map(s => [s.title, s.body, s.note || ''].join(' ')).join(' ');
  // Yang dilarang adalah JANJI skor. Catatan jujur "FIEZEL tidak memprediksi skor" justru
  // wajib ada, jadi pola di bawah sengaja menyasar bentuk janjinya, bukan kata "skor".
  assert.ok(!/skor kamu|skor anda|dijamin|jaminan skor|band \d|skor \d/i.test(all), all);
  const goalStep = onboarding.STEPS[2];
  assert.ok(/tidak memprediksi skor/i.test(goalStep.note || ''), 'batas itu harus terlihat murid, bukan hanya di kode');
});

test('jumlah soal penempatan yang sebenarnya disebutkan, bukan disamarkan', () => {
  // Sheet menulis "singkat". Tes penempatan FIEZEL berisi 150 soal. Judul boleh mengikuti
  // desain, tetapi angkanya wajib ada di layar.
  const step = onboarding.STEPS[3];
  assert.ok(/150 soal/.test(step.note || ''), 'jumlah soal sebenarnya harus disebut: ' + step.note);
  assert.ok(/[Bb]uildPlacement|count:150/.test(app) || /count:150/.test(app.replace(/\s/g, '')),
    'aplikasi masih memakai penempatan 150 soal - kalau berubah, salinan teks ini ikut berubah');
});

test('langkah pengingat tidak memasang pemilih jam yang tidak tersambung', () => {
  // FIEZEL belum punya jadwal yang diatur pengguna: pengingat dipilih ALRS dari bukti.
  // Pemilih jam di sini akan menjadi tombol palsu.
  const html = onboarding.stepMarkup(fakeEnv(), 4);
  assert.ok(!/type="time"|<select/.test(html), 'jangan menawarkan jadwal yang tidak dipegang produk');
  assert.ok(/Pengingat sudah aktif/.test(onboarding.STEPS[4].note || ''));
});

test('teks yang disuntikkan tidak bisa menyuntik markup', () => {
  const html = onboarding.stepMarkup(fakeEnv(), 0);
  assert.ok(!/<script>/.test(html));
  assert.ok(/aria-hidden="true"/.test(html), 'maskot dekoratif tidak dibacakan pembaca layar');
});

test('splash memberi tahu saat ia selesai, sehingga perkenalan menyambung tanpa tebakan', () => {
  // Tanpa ini pemanggil harus memasang pewaktu kedua, dan tebakan itu meleset setiap kali
  // splash ditutup lebih awal oleh sentuhan.
  const env = fakeEnv();
  let closed = 0;
  const shown = splash.show(env, { now: NOW, onClose: () => { closed++; } });
  assert.strictEqual(shown.shown, true);
  shown.close();
  assert.strictEqual(closed, 1);
  shown.close();
  assert.strictEqual(closed, 1, 'menutup dua kali tidak boleh memanggil dua kali');
});

test('aplikasi menyambungkan perkenalan setelah splash, bukan sebelum gerbang notifikasi', () => {
  assert.ok(/showBrandSplash\(\)/.test(app), 'splash masih dipanggil setelah gerbang lolos');
  assert.ok(/onClose:\(\)=>showOnboarding/.test(app.replace(/\s/g, '')), 'perkenalan harus menyambung ke penutupan splash');
  assert.ok(/onPlacement:\(\)=>startPlacement\(\)/.test(app.replace(/\s/g, '')), 'tombol tes harus memanggil penempatan yang asli');
  assert.ok(/examTrack/.test(app), 'pilihan IELTS/TOEFL harus benar-benar tersimpan');
});

test('gaya onboarding memenuhi ukuran sentuh dan tidak mewarnai ulang maskot', () => {
  const flat = css.replace(/\s*\n\s*/g, '');
  assert.ok(/\.fiezel-ob-cta\{[^}]*min-height:44px/.test(flat), 'tombol utama harus 44px');
  assert.ok(/\.fiezel-ob-track\{[^}]*min-height:44px/.test(flat), 'tombol tujuan harus 44px');
  assert.ok(/\.fiezel-ob-skip\{[^}]*min-height:44px/.test(flat), 'tombol lewati harus bisa disentuh juga');
  const brand = css.slice(css.indexOf('FIEZEL brand: maskot resmi'));
  assert.ok(!/filter:|hue-rotate|scaleX\(|scaleY\(/.test(brand), 'maskot tidak boleh diwarnai ulang atau direntangkan');
  assert.ok(/@keyframes fzm-peek/.test(css), 'pose mengintip punya gerakannya sendiri');
});

console.log('');
if (failures) { console.error('FIEZEL onboarding: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL onboarding: PASS');
