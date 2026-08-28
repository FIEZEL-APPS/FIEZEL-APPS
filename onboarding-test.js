/**
 * FIEZEL gate — onboarding enam langkah (Step 1 = nama murid, m025-117; Step 2-6 mengikuti
 * FIEZEL_Complete_Design_Specification.pdf bagian 3).
 *
 * Lapisan yang menutupi seluruh layar adalah tempat paling mudah untuk mengurung pengguna,
 * dan di produk ini tawaran notifikasi berada tepat di bawahnya. Karena itu gate ini menahan
 * beberapa hal sekaligus: perkenalan harus selalu punya jalan keluar di SETIAP langkah dan
 * SETIAP sub-langkah (termasuk dua slide carousel), harus berhenti setelah selesai atau
 * dilewati, tidak boleh menjanjikan yang tidak dipegang produk (skor, jadwal manual), dan
 * setiap penyimpangan dari spesifikasi desain (goal ASLI bukan Travel/Work/Fun, level
 * self-report bukan hasil ukur, tes 150 soal bukan 4-5 soal, pengingat otomatis bukan
 * pemilih jam) harus terlihat jujur di salinan teks, bukan disembunyikan.
 */
const assert = require('assert');
const fs = require('fs');
// AI-20 F06 (W1-TESTPLAN 2b): harness i18n KONDISIONAL — index.html memuat fiezel-i18n.js +
// copy-id-*.js SEBELUM modul fitur. Begitu fiezel-onboarding.js memakai FiezelI18n.t() untuk
// naskahnya, require di bawah butuh global FiezelI18n + copy terdaftar; tanpa ini modul
// meledak. existsSync = hijau dua arah (pra & pasca ekstraksi). Ke-≈35 asersi teks id di
// berkas ini TIDAK berubah — keluaran id wajib byte-identik (id-golden-snapshot-test.js).
(function bootI18nHarness() {
  const path = require('path');
  const i18nDir = path.join(__dirname, 'features', 'i18n');
  const runtime = path.join(i18nDir, 'fiezel-i18n.js');
  if (!fs.existsSync(runtime)) return;
  global.FiezelI18n = require(runtime);
  // Copy-map UMD-lite membaca (typeof self!=='undefined'?self:this).FiezelI18n; Node tidak
  // punya `self`, jadi sediakan sementara supaya registerCopy benar-benar berjalan.
  const hadSelf = Object.prototype.hasOwnProperty.call(global, 'self');
  const prevSelf = hadSelf ? global.self : undefined;
  global.self = global;
  try {
    for (const f of fs.readdirSync(i18nDir).filter(n => /^copy-id-.*\.js$/.test(n)).sort()) require(path.join(i18nDir, f));
  } finally {
    if (hadSelf) global.self = prevSelf; else delete global.self;
  }
}());
const splash = require('./features/brand/fiezel-splash.js');
const journey = require('./features/personal-journey/fiezel-personal-journey.js');
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
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(node.attrs, k); },
    appendChild(child) { child.parentNode = node; node.children.push(child); },
    removeChild(child) { node.children = node.children.filter(c => c !== child); child.parentNode = null; },
    addEventListener(type, fn) { (node.listeners[type] = node.listeners[type] || []).push(fn); },
    // Pencari sederhana atas markup yang sedang terpasang. Hasilnya DI-CACHE selama innerHTML
    // tidak berubah - tanpa itu modul memasang listener pada satu objek dan gate memeriksa
    // objek lain, sehingga tombol yang sebenarnya hidup terlihat mati.
    value: '',
    focus() { node.focused = true; },
    removeAttribute(k) { delete node.attrs[k]; },
    // m025-117: kolom nama membuat gate ini harus melihat <input>, bukan hanya <button>.
    // Tanpa itu langkah wajib pertama tidak bisa diuji sama sekali - dan langkah yang tidak
    // bisa diuji adalah langkah yang paling gampang berubah jadi jalan buntu.
    _html: null, _found: null,
    _scan() {
      if (node._html === node.innerHTML && node._found) return node._found;
      node._html = node.innerHTML;
      node._found = [];
      const re = /<(button|input)([^>]*?)\/?>/g;
      let m;
      while ((m = re.exec(node.innerHTML))) {
        const found = el(m[1]);
        const attrRe = /([a-z][a-z-]*)(?:="([^"]*)")?/g;
        let a;
        while ((a = attrRe.exec(m[2]))) found.attrs[a[1]] = a[2] === undefined ? '' : a[2];
        if (m[1] === 'input') found.value = found.attrs.value || '';
        node._found.push(found);
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
  const body = el('body');
  return Object.assign({
    document: { createElement: el, body },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    FiezelPersonalJourney: journey,
    _body: body, _store: store
  }, over || {});
}

const NOW = Date.parse('2026-08-21T04:00:00Z');

/**
 * Memajukan onboarding sampai tepat sebelum langkah target, lewat jalur normal setiap
 * langkah - bukan lewat "Lewati" global, supaya jalur ini berguna sebagai bukti bahwa
 * navigasi maju yang sesungguhnya (bukan cuma jalan pintas) memang berfungsi.
 */
/** Mengetik nama pada Step 1 lewat jalur yang sama dengan murid: kolom lalu tombol. */
function typeName(run, value) {
  const field = run.element.querySelector('[data-ob-name]');
  if (!field) throw new Error('kolom nama tidak ada di langkah nama');
  field.value = value;
  (field.listeners.input || []).forEach(fn => fn());
  return field;
}

function advanceTo(run, targetStep) {
  let guard = 0;
  while (run.stepIndex() < targetStep) {
    if (guard++ > 30) throw new Error('macet sebelum mencapai langkah ' + targetStep);
    const step = run.stepIndex();
    if (step === 1) {
      typeName(run, 'Ayu');
      run.element.querySelector('[data-ob-advance]').listeners.click[0]();
      continue;
    }
    if (step === 2 && run.slideIndex() < onboarding.CAROUSEL_SLIDES.length - 1) {
      run.element.querySelector('[data-ob-advance]').listeners.click[0]();
      continue;
    }
    if (step === 3) {
      run.element.querySelectorAll('[data-ob-goal]')[0].listeners.click[0]();
      run.element.querySelector('[data-ob-advance]').listeners.click[0]();
      continue;
    }
    if (step === 4) {
      // Langkah ini tidak punya tombol "Lanjut" polos - satu-satunya jalan maju tanpa
      // benar-benar mengerjakan 150 soal adalah "Lewati langkah ini", dan itu memang
      // disengaja (lihat header modul, poin 3).
      run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
      continue;
    }
    run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  }
}

test('enam langkah nyata (Step 1 nama + Step 2-6), carousel tetap dua slide', () => {
  assert.ok(Array.isArray(onboarding.CAROUSEL_SLIDES) && onboarding.CAROUSEL_SLIDES.length === 2);
  assert.strictEqual(onboarding.LAST_STEP, 6);
  assert.strictEqual(onboarding.NAME_STEP, 1);
});

test('goal selection memakai profil tujuan ASLI aplikasi, bukan Travel/Work/Fun spesifikasi', () => {
  // Spesifikasi meminta tiga kartu Travel/Work/Fun - kategori itu tidak berkaitan dengan
  // apa pun di produk. FiezelPersonalJourney sudah punya empat profil nyata dengan prasyarat
  // yang benar-benar dipakai R2-R4; itulah yang wajib tampil.
  const env = fakeEnv();
  const goals = onboarding.goalOptions(env);
  assert.deepStrictEqual(goals.map(g => g.id).sort(), journey.GOAL_IDS.slice().sort());
  for (const g of goals) assert.ok(g.description.length > 0, g.id + ': deskripsi kosong');
  const html = onboarding.goalMarkup(env, '', '');
  assert.ok(!/Travel|Work|Fun/.test(html), 'kategori Travel/Work/Fun dari spesifikasi tidak boleh muncul - tidak berkaitan dengan produk');
});

test('level self-report diberi label jelas sebagai perkiraan, bukan hasil ukur', () => {
  const env = fakeEnv();
  const html = onboarding.goalMarkup(env, 'school', 'B1');
  assert.ok(/perkiraan/i.test(html), 'harus ada kata "perkiraan" - ini bukan hasil tes');
  assert.ok(/bukan hasil tes/i.test(html), 'harus menyangkal eksplisit bahwa ini hasil pengukuran');
  assert.ok(!/level resmi|sudah diuji|hasil pengukuran resmi/i.test(html));
  for (const lv of onboarding.CEFR_LEVELS) assert.ok(new RegExp('>' + lv + '<').test(html), 'chip level hilang: ' + lv);
});

test('tes penempatan menyebut jumlah soal yang sungguhan, angka tidak disamarkan', () => {
  // Spesifikasi menulis "Quick diagnostic quiz, 4-5 questions". Produk ini punya tes 25 soal
  // (m025-114, sebelumnya 150); menyebutnya "singkat" tanpa angka sebenarnya adalah kebohongan
  // kecil yang akan ditagih murid di tengah jalan. Angkanya dibaca dari sumbernya supaya tes
  // ini tidak perlu ikut diedit setiap kali jumlah soalnya berubah.
  const targets = require('fs').readFileSync('./features/diagnostics/fiezel-diagnostic-targets.js', 'utf8');
  const declared = /totalQuestions:\s*(\d+)/.exec(targets);
  assert.ok(declared, 'jumlah soal resmi tidak terbaca dari diagnostic targets');
  const html = onboarding.placementMarkup(fakeEnv());
  assert.ok(new RegExp(declared[1] + ' soal').test(html), `jumlah soal sebenarnya (${declared[1]}) harus disebut`);
  assert.ok(!/4-5 (pertanyaan|soal)|4 sampai 5/.test(html), 'tidak boleh menjanjikan jumlah soal spesifikasi yang tidak nyata');
});

test('schedule setup TIDAK memasang pemilih hari/jam yang tidak tersambung ke apa pun', () => {
  // FIEZEL belum punya jadwal yang diatur pengguna: pengingat dipilih ALRS dari bukti
  // belajar. Pemilih hari/jam di sini akan menjadi tombol palsu - alasan yang sama sejak
  // m025-77. Pertanyaan spesifikasi "Kapan kamu ingin belajar?" dijawab jujur di teksnya.
  const html = onboarding.scheduleMarkup(fakeEnv());
  assert.ok(!/type="time"|<select|Mo<\/|Senin.*Selasa.*Rabu/i.test(html), 'jangan menawarkan jadwal manual yang tidak dipegang produk');
  assert.ok(/otomatis/.test(html), 'harus menjelaskan bahwa waktunya dipilih otomatis, bukan manual');
});

test('SETIAP langkah dan SETIAP slide carousel punya jalan keluar - tidak ada yang mengurung', () => {
  // Ini alasan utama gate ini ada: satu langkah perkenalan tanpa jalan keluar berarti
  // aplikasi tidak bisa dimasuki. Notifikasi sendiri sudah berhenti menjadi syarat masuk
  // (OWNER membalik m025-34), jadi perkenalan inilah satu-satunya lapisan yang tersisa
  // yang benar-benar bisa mengurung - dan justru karena itu ia harus diperiksa.
  const env = fakeEnv();
  for (let i = 0; i < onboarding.CAROUSEL_SLIDES.length; i++) {
    const html = onboarding.carouselMarkup(env, i);
    assert.ok(/data-ob-skip/.test(html), 'slide carousel ' + i + ' tidak punya tombol lewati global');
  }
  for (const html of [
    onboarding.goalMarkup(env, '', ''),
    onboarding.placementMarkup(env),
    onboarding.scheduleMarkup(env),
    onboarding.summaryMarkup(env, 'Ayu', '', '', true)
  ]) {
    assert.ok(/data-ob-skip/.test(html), 'langkah tidak punya tombol lewati global: ' + html.slice(0, 60));
  }
});

test('melewati (global) di langkah mana pun langsung menutup dan tidak kembali menghadang', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(env._body.children.length, 1);
  // Step 1 (nama) sengaja TIDAK punya "Lewati" - m025-117. Jalan keluarnya adalah menjawab.
  advanceTo(run, 2);
  run.element.querySelector('[data-ob-skip]').listeners.click[0]();
  assert.strictEqual(onboarding.completed(env), true, 'melewati harus dicatat selesai');
  const again = onboarding.show(env, { now: NOW + 60000 });
  assert.strictEqual(again.shown, false);
  assert.strictEqual(again.reason, 'completed');
});

// Gate untuk dua jalan keluar yang MENUTUP lapisan tapi tidak pernah menyerahkan kendali
// kembali. Keduanya lolos dari gate lama karena gate itu hanya memeriksa bahwa perkenalan
// berhenti menghadang - bukan bahwa aplikasinya benar-benar dilanjutkan. Di aplikasi,
// satu-satunya render() pada jalur boot ada di balik callback ini, jadi jalan keluar yang
// diam meninggalkan murid di cangkang kosong sampai ia memuat ulang sendiri.
test('melewati (global) menyerahkan kendali kembali, bukan sekadar menutup lapisan', () => {
  const env = fakeEnv();
  const calls = [];
  const run = onboarding.show(env, { now: NOW, force: true,
    onFinish: d => calls.push(['finish', d && d.via]),
    onPlacement: () => calls.push(['placement']) });
  advanceTo(run, 2);
  run.element.querySelector('[data-ob-skip]').listeners.click[0]();
  assert.deepStrictEqual(calls, [['finish', 'skip']],
    'tombol Lewati harus memanggil onFinish tepat sekali - tanpa itu alur pembukaan berhenti diam-diam');
});

test('"Lewati" di langkah terakhir mengakhiri perkenalan, bukan mengecat ulang layar yang sama', () => {
  const env = fakeEnv();
  const calls = [];
  const run = onboarding.show(env, { now: NOW, force: true, onFinish: d => calls.push(d && d.via) });
  advanceTo(run, onboarding.LAST_STEP);
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  assert.deepStrictEqual(calls, ['skip'],
    'di langkah terakhir tidak ada langkah berikutnya: goStep(LAST_STEP+1) dijepit kembali dan tombolnya mati');
  assert.strictEqual(onboarding.completed(env), true);
});

test('tes penempatan memberi tahu onPlacement tepat sekali, bukan dua kali', () => {
  const env = fakeEnv();
  const calls = [];
  const run = onboarding.show(env, { now: NOW, force: true,
    onPlacement: () => calls.push('placement'), onFinish: () => calls.push('finish') });
  advanceTo(run, 4);
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.deepStrictEqual(calls, ['placement'],
    'jalur tes penempatan tidak boleh ikut memanggil onFinish - itu menjalankan dua lanjutan sekaligus');
});

test('login Puter yang menggantung tidak boleh mengurung: ada tenggat', () => {
  const app = fs.readFileSync('./app.js', 'utf8');
  assert.ok(/const PUTER_SIGNIN_TIMEOUT_MS=\d+;/.test(app),
    "keadaan 'pending' mematikan tombolnya, jadi janji yang tidak pernah selesai berarti gerbang tanpa jalan keluar");
  assert.ok(/Promise\.race\(\[[\s\S]{0,200}puter\.auth\.signIn\(\)/.test(app));
  assert.ok(/catch\(error\)\{if\(puterSignedIn\(\)\)\{(?:await\s+)?completeAuthGate\(\)/.test(app),
    'tenggat harus ditangkap seperti kegagalan lain supaya tombolnya hidup kembali');
});

test('carousel: dua slide bisa dijelajah maju-mundur sebelum lanjut ke pemilihan tujuan', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  advanceTo(run, 2);
  assert.strictEqual(run.stepIndex(), 2);
  assert.strictEqual(run.slideIndex(), 0);
  run.element.querySelector('[data-ob-carousel-next]').listeners.click[0]();
  assert.strictEqual(run.slideIndex(), 1);
  run.element.querySelector('[data-ob-back]').listeners.click[0]();
  assert.strictEqual(run.slideIndex(), 0, 'tombol kembali harus mundur satu slide dulu, bukan langsung keluar onboarding');
  run.element.querySelector('[data-ob-carousel-next]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 3, 'setelah slide terakhir, Lanjut harus pindah ke pemilihan tujuan');
});

test('goal selection: tombol Lanjut nonaktif sebelum memilih tujuan (sesuai spesifikasi)', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  advanceTo(run, 2);
  run.element.querySelector('[data-ob-carousel-next]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 3);
  const advanceBtn = run.element.querySelector('[data-ob-advance]');
  assert.ok(advanceBtn.hasAttribute('disabled'), 'Lanjut harus nonaktif sebelum tujuan dipilih');
  const goalBtn = run.element.querySelectorAll('[data-ob-goal]')[0];
  goalBtn.listeners.click[0]();
  const enabled = run.element.querySelector('[data-ob-advance]');
  assert.ok(!enabled.hasAttribute('disabled'), 'Lanjut harus aktif setelah tujuan dipilih');
});

test('goal selection: memilih tujuan memanggil onGoal dengan id ASLI, bukan label tampilan', () => {
  const env = fakeEnv();
  const seen = [];
  const run = onboarding.show(env, { now: NOW, force: true, onGoal: v => seen.push(v) });
  advanceTo(run, 3);
  const itBtn = run.element.querySelectorAll('[data-ob-goal]').filter(b => b.getAttribute('data-ob-goal') === 'it')[0];
  itBtn.listeners.click[0]();
  const levelBtn = run.element.querySelectorAll('[data-ob-level="B1"]')[0];
  levelBtn.listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.deepStrictEqual(seen, [{ goal: 'it', level: 'B1' }]);
});

test('goal selection: "Lewati langkah ini" memajukan tanpa memanggil onGoal', () => {
  // Beda dari tombol lewati global (mengakhiri semuanya): ini hanya melompati SATU langkah,
  // supaya murid yang belum siap memilih tujuan tetap sampai ke langkah 3-5.
  const env = fakeEnv();
  const seen = [];
  const run = onboarding.show(env, { now: NOW, force: true, onGoal: v => seen.push(v) });
  advanceTo(run, 3);
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 4);
  assert.deepStrictEqual(seen, []);
});

test('tes penempatan tidak dijalankan di balik lapisan yang masih terpasang', () => {
  // Kuis mengambil alih seluruh layar. Kalau perkenalan masih tergantung di atasnya, murid
  // mengerjakan 150 soal di balik kaca.
  const env = fakeEnv();
  const order = [];
  const run = onboarding.show(env, { now: NOW, force: true, onPlacement: () => order.push('placement') });
  advanceTo(run, 4);
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.deepStrictEqual(order, ['placement']);
  assert.strictEqual(onboarding.completed(env), true, 'perkenalan harus sudah selesai sebelum kuis mulai');
});

test('tes penempatan: "Lewati langkah ini" tetap sampai ke langkah jadwal dan ringkasan', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  advanceTo(run, 4);
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 5);
});

test('langkah terakhir menyelesaikan dan memanggil onFinish satu kali saja', () => {
  const env = fakeEnv();
  let finished = 0;
  const run = onboarding.show(env, { now: NOW, force: true, onFinish: () => { finished++; } });
  advanceTo(run, onboarding.LAST_STEP);
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.strictEqual(finished, 1);
  assert.strictEqual(onboarding.completed(env), true);
});

test('summary: pilihan yang sungguhan tercatat ditampilkan kembali, bukan data bohongan', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  advanceTo(run, 3);
  run.element.querySelectorAll('[data-ob-goal="scholarship"]')[0].listeners.click[0]();
  run.element.querySelectorAll('[data-ob-level="C1"]')[0].listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), onboarding.LAST_STEP);
  assert.ok(/Beasiswa/.test(run.element.innerHTML));
  assert.ok(/C1/.test(run.element.innerHTML));
  assert.ok(/Ayu/.test(run.element.innerHTML), 'nama yang diberikan murid harus ikut terbaca di ringkasan');
});

test('confetti ringkas dan tunduk pada kurangi-gerak', () => {
  const env = fakeEnv();
  const withMotion = onboarding.summaryMarkup(env, 'Ayu', 'school', 'A2', false);
  assert.ok(/fiezel-confetti/.test(withMotion));
  const reduced = onboarding.summaryMarkup(env, 'Ayu', 'school', 'A2', true);
  assert.ok(!/fiezel-confetti/.test(reduced), 'kurangi-gerak harus mematikan confetti, bukan hanya memperlambatnya');
});

// m028-maskot: maskot kembali, TAPI kegagalannya harus tetap jinak. Tanpa komponen maskot
// perkenalan wajib tetap tampil dan tetap punya wajah (ikon paw cadangan) - bukan lubang
// kosong seperti <i data-lucide> yang menunggu pustaka.
test('perkenalan tampil walau komponen maskot tidak ada', () => {
  const env = fakeEnv({ FiezelPaw: undefined, customElements: undefined });
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(env._body.children.length, 1);
  const html = env._body.children[0].innerHTML;
  assert.ok(/data-ob-mascot/.test(html), 'setiap langkah harus punya maskot');
  assert.ok(/fiezel-ob-paw-fallback/.test(html),
    'tanpa komponen, yang tampil harus ikon paw cadangan - bukan wadah kosong');
});

// Inti spesifikasi m028-maskot: pose maskot MENJELASKAN langkahnya. Kalau peta ini bergeser
// jadi acak atau seragam, maskotnya kembali jadi hiasan dan tes ini yang jatuh lebih dulu.
test('setiap langkah membawa pose maskot yang kontekstual, bukan acak', () => {
  const env = fakeEnv();
  // Niat boleh memakai nama state pustaka master yang bertanda hubung (lesson-start,
  // welcome-back) - regexnya mengikuti (Fase 6 desain-ulang PAW).
  const intent = (html) => (String(html).match(/data-ob-mascot-intent="([a-z-]+)"/) || [])[1];
  assert.strictEqual(intent(onboarding.nameMarkup(env, '')), 'greeting', 'langkah nama harus menyapa');
  assert.strictEqual(intent(onboarding.carouselMarkup(env, 0)), 'lesson-start',
    'slide pembuka memakai niat pembuka sesi; sebelum rig baru mendarat ia luruh ke curious lewat MASCOT_CHAIN');
  assert.strictEqual(intent(onboarding.carouselMarkup(env, 1)), 'listening',
    'slide suara neural harus memakai pose mendengarkan');
  assert.strictEqual(intent(onboarding.goalMarkup(env, '', '')), 'curious');
  assert.strictEqual(intent(onboarding.goalMarkup(env, 'school', '')), 'observing',
    'setelah tujuan dipilih, maskot mengamati pilihan level');
  assert.strictEqual(intent(onboarding.placementMarkup(env)), 'encouraging');
  // Langkah pengingat: calm - "at ease", bukan bosan (spesifikasi 11 §2.2 langkah 5);
  // sebelum rig Direction C mendarat, MASCOT_CHAIN meluruhkannya ke sleepy.
  assert.strictEqual(intent(onboarding.scheduleMarkup(env)), 'calm');
  assert.strictEqual(intent(onboarding.summaryMarkup(env, 'Ayu', 'school', 'A2', false)), 'celebrating');
  // Kurangi-gerak: pose yang tenang dipakai SEJAK cat pertama, bukan lompatan yang lalu
  // dibekukan setengah jalan oleh CSS.
  assert.strictEqual(intent(onboarding.summaryMarkup(env, 'Ayu', 'school', 'A2', true)), 'proud');
  // Panjang peta slide harus mengikuti jumlah slide yang benar-benar ada.
  assert.strictEqual(onboarding.MASCOT_SLIDES.length, onboarding.CAROUSEL_SLIDES.length,
    'setiap slide carousel harus punya pose, tidak ada yang jatuh ke pose bawaan diam-diam');
});

// 'observing' tidak ada di komponen maskot. Yang dijaga: perkenalan MEMINTA pose itu apa
// adanya, lalu memilih pengganti dari state yang komponen benar-benar punya - tidak pernah
// mengirim nama asing ke setState() (yang akan ditolak dan meninggalkan maskot di idle).
test('pose yang tidak dimiliki komponen jatuh ke pose nyata, bukan ke nama asing', () => {
  const known = ['idle', 'greeting', 'curious', 'listening', 'thinking', 'encouraging', 'sleepy', 'celebrating', 'proud'];
  const env = fakeEnv({
    customElements: { get: (n) => (n === 'fiezel-mascot' ? { states: known } : null), define() {} }
  });
  assert.strictEqual(onboarding.resolveMascotState(env, 'observing'), 'thinking');
  assert.strictEqual(onboarding.resolveMascotState(env, 'greeting'), 'greeting');
  assert.strictEqual(onboarding.resolveMascotState(env, 'entah-apa'), 'idle');
  Object.keys(onboarding.MASCOT_CHAIN).forEach((wanted) => {
    assert.ok(known.indexOf(onboarding.resolveMascotState(env, wanted)) >= 0,
      'pose terpilih untuk ' + wanted + ' harus ada di komponen');
  });
});

// Lambang kecil di perkenalan tidak boleh kembali bergantung pada lucide.min.js yang dimuat
// `defer`: itu persis perlombaan yang membuat ikon lahir kosong.
test('tidak ada satu pun ikon perkenalan yang menunggu pustaka luar', () => {
  const env = fakeEnv();
  const screens = [
    onboarding.nameMarkup(env, ''), onboarding.carouselMarkup(env, 0), onboarding.carouselMarkup(env, 1),
    onboarding.goalMarkup(env, 'school', 'A2'), onboarding.placementMarkup(env),
    onboarding.scheduleMarkup(env), onboarding.summaryMarkup(env, 'Ayu', 'school', 'A2', false)
  ];
  screens.forEach((html, i) => {
    assert.ok(!/data-lucide/.test(html), 'layar ' + i + ' masih memakai <i data-lucide>');
  });
  // Kode, bukan komentar: alasan penghapusannya memang ditulis di komentar berkas itu.
  const src = fs.readFileSync('./features/onboarding/fiezel-onboarding.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/createIcons|\.lucide/.test(src),
    'percobaan-ulang createIcons() harus hilang bersama ikon yang dulu membutuhkannya');
});

test('tanpa modul perjalanan belajar, kartu tujuan kosong tapi tidak melempar', () => {
  const env = fakeEnv({ FiezelPersonalJourney: undefined });
  const run = onboarding.show(env, { now: NOW, force: true });
  assert.strictEqual(run.shown, true);
  advanceTo(run, 2);
  assert.strictEqual(run.element.querySelectorAll('[data-ob-goal]').length, 0);
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
  const env = fakeEnv();
  const all = [
    onboarding.carouselMarkup(env, 0), onboarding.carouselMarkup(env, 1),
    onboarding.goalMarkup(env, 'school', 'B1'), onboarding.placementMarkup(env),
    onboarding.scheduleMarkup(env), onboarding.summaryMarkup(env, 'school', 'B1', true)
  ].join(' ');
  assert.ok(!/skor kamu|skor anda|dijamin|jaminan skor|band \d|skor \d/i.test(all), all);
});

test('teks yang disuntikkan tidak bisa menyuntik markup', () => {
  const html = onboarding.goalMarkup(fakeEnv(), '"><script>alert(1)</script>', '');
  assert.ok(!/<script>alert/.test(html));
});

test('maskot dalam onboarding dekoratif, tidak dibacakan dua kali oleh pembaca layar', () => {
  const html = onboarding.placementMarkup(fakeEnv());
  assert.ok(/aria-hidden="true"/.test(html));
});

test('aplikasi menyambungkan splash -> onboarding -> gerbang notifikasi -> tes penempatan asli, level self-report terpisah dari state.level', () => {
  // m025-80: splash tidak lagi memaku langkah berikutnya di dalam dirinya. Pemanggil yang
  // menentukan lewat callback afterSplash, dan boot menyambungkannya ke showOnboarding lalu
  // gerbang notifikasi - jadi yang diperiksa sekarang rantai itu, bukan literal onClose.
  const flatApp = app.replace(/\s/g, '');
  assert.ok(/onClose:\(\)=>done\(Date\.now\(\)\)/.test(flatApp), 'splash harus memanggil balik pemanggilnya saat menutup');
  assert.ok(/showOnboarding\(at\)\?\.shown===true/.test(flatApp), 'boot harus menyambung penutupan splash ke onboarding');
  assert.ok(/onPlacement:\(\)=>afterOnboardingExit\('placement'\)/.test(app.replace(/\s/g, '')),
    'tombol tes harus melalui afterOnboardingExit, bukan langsung startPlacement - gerbang notifikasi harus tetap diperiksa dulu');
  assert.ok(/onFinish:\(\)=>afterOnboardingExit\('home'\)/.test(app.replace(/\s/g, '')),
    'langkah terakhir juga harus melalui afterOnboardingExit, bukan langsung go(\'home\')');
  // afterOnboardingExit sendiri harus benar-benar memanggil startPlacement/go('home') SETELAH
  // gerbang notifikasi lolos - bukan melewatinya diam-diam.
  assert.ok(/pendingAfterGate==='placement'\)\{pendingAfterGate=null;startPlacement\(\)\}/.test(app.replace(/\s/g, '')),
    'tes penempatan yang tertunda harus benar-benar dijalankan setelah gerbang notifikasi lolos');
  assert.ok(/selfAssessedLevel/.test(app), 'perkiraan level murid harus benar-benar tersimpan');
  assert.ok(!/state\.level\s*=.*selfAssessedLevel|selfAssessedLevel.*state\.level\s*=/.test(app),
    'perkiraan self-report tidak boleh menimpa state.level - itu milik tes penempatan asli');
});

test('notifikasi di ujung alur: DIUNDANG, TIDAK DIPAKSA - dan tidak dihapus', () => {
  // Judul tes ini dulu berbunyi "notifikasi tetap wajib". OWNER MEMBALIK keputusan itu
  // (m025-34): gerbang wajib adalah dark-pattern. Yang dijaga sekarang: tawarannya masih
  // ada dan masih di UJUNG perkenalan - hanya saja ia tidak lagi menahan apa pun, dan
  // aplikasi dibuka sebelum tawaran itu muncul, bukan sesudah izin diberikan.
  const flat = app.replace(/\s/g, '');
  assert.ok(/functionstartWelcomeExperience\(\)\{/.test(flat), 'titik masuk boot harus tetap ada');
  assert.ok(/onboardingDone=self\.FiezelOnboarding\?\.completed\?\.\(self\)!==false/.test(flat),
    'harus memeriksa apakah perkenalan sudah selesai untuk memutuskan urutan');
  // m025-80 OWNER: sebelumnya HANYA murid baru yang melihat splash; murid lama ditabrak
  // gerbang notifikasi di detik pertama boot - persis pola yang ditandai audit UX sebagai
  // penyebab kesan "app abal-abal". Sekarang splash adalah layar pertama untuk SEMUA murid,
  // dan gerbangnya menyusul lewat callback di ujung sapaan itu.
  assert.ok(/returnshowBrandSplash\(Date\.now\(\),at=>\{/.test(flat),
    'splash harus jadi layar pertama untuk semua murid, bukan hanya murid baru');
  assert.ok(/if\(!onboardingDone&&showOnboarding\(at\)\?\.shown===true\)returnnull/.test(flat),
    'perkenalan hanya menahan gerbang kalau ia benar-benar tampil');
  assert.ok(/returnstartNotificationInvitation\(\)/.test(flat),
    'tawaran notifikasi tetap dijalankan di ujung sapaan, bukan dihapus');
  assert.ok(/functionstartNotificationInvitation\(\)\{/.test(flat),
    'titik masuk di ujung perkenalan harus tetap ada, dengan nama yang jujur');
  // Inilah pembalikannya, dijaga sebagai pernyataan yang bisa gagal:
  // 1. tidak ada lagi fungsi pengunci, dan tidak ada lagi yang memasang kelas kuncinya;
  assert.ok(!/functionlockAppForNotifications/.test(flat),
    'fungsi pengunci harus hilang, bukan sekadar tidak dipanggil');
  assert.ok(!/classList\?\.add\?\.\('notification-locked'\)/.test(flat),
    'tidak ada jalur yang boleh memasang kembali kunci notifikasi di <body>');
  assert.ok(!/functionnotificationsRequired\(\)/.test(flat),
    'gagasan "notifikasi wajib" harus hilang dari kode, bukan dinetralkan diam-diam');
  // 2. aplikasi dibuka LEBIH DULU, lalu tawarannya muncul di atasnya - bukan sebaliknya;
  assert.ok(/functionstartNotificationInvitation\(\)\{returnopenApp\(\)\}/.test(flat),
    'ujung perkenalan harus membuka aplikasi, bukan menahannya sampai izin diberikan');
  // 3. dan menolak adalah jawaban yang sah dengan jalan masuk kembali lewat Pengaturan.
  assert.ok(/functiondeclineStudyNotifications\(\)\{/.test(flat), 'harus ada jalur menolak yang eksplisit');
  assert.ok(/settingReminders/.test(app), 'Pengaturan harus punya jalan masuk kembali untuk pengingat');
});

test('gaya onboarding memenuhi ukuran sentuh dan tidak mewarnai ulang maskot', () => {
  const flat = css.replace(/\s*\n\s*/g, '');
  assert.ok(/\.fiezel-btn\{[^}]*min-height:44px/.test(flat), 'tombol dasar harus 44px');
  const brand = css.slice(css.indexOf('FIEZEL brand: Percik'));
  // m028-maskot: maskot kembali sebagai KOMPONEN, jadi aturannya kembali juga - ukurannya
  // boleh diatur, warnanya tidak. Aset raster maskot tetap dilarang: satu sumber bentuk.
  const flatBrand = brand.replace(/\s+/g, '');
  assert.ok(/\.fiezel-ob-mascot\{/.test(flatBrand), 'maskot perkenalan harus punya gayanya sendiri');
  assert.ok(!/fiezel-hero\.png|fiezel-belajar\.png|fiezel-mengintip\.png/.test(css),
    'aset raster maskot tidak boleh dirujuk dari stylesheet');
  assert.ok(!/\.fiezel-ob-mascot[^{]*\{[^}]*(fill:|background-image:)/.test(flatBrand),
    'maskot tidak boleh diwarnai ulang dari stylesheet perkenalan');
  assert.ok(/\.fiezel-ob-mascot\{[^}]*aspect-ratio:320\/300/.test(flatBrand),
    'maskot harus menjaga rasio aslinya, bukan direntangkan');
  // Kurangi-gerak: pose tetap tampil, geraknya berhenti.
  assert.ok(/prefers-reduced-motion:reduce\)\{\.fiezel-ob-mascot/.test(flatBrand)
    || /\.fiezel-ob-still\.fiezel-ob-mascot/.test(flatBrand),
    'harus ada aturan yang mematikan gerak maskot di bawah kurangi-gerak');
});

// ---- m025-117: nama murid (Step 1, WAJIB) --------------------------------------------
//
// OWNER: "sekarang Jahran adalah single user, ubah agar appsnya menyesuaikan dengan nama
// user, misalnya saat masuk tanya dulu nama mereka di onboarding (WAJIB)".
//
// Yang dijaga di sini bukan hanya "ada kolom nama", melainkan dua hal yang gampang berbalik
// jadi bug yang lebih parah daripada bug awalnya: langkah WAJIB yang tidak punya jalan
// keluar sama sekali (murid terkurung sebelum masuk aplikasi), dan langkah wajib yang
// ternyata bisa dilewati (aplikasi kembali memakai nama bawaan yang dipaku di kode).

test('Step 1 menanyakan nama, dan itu langkah pertama yang dilihat murid', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  assert.strictEqual(run.stepIndex(), onboarding.NAME_STEP);
  assert.ok(/data-ob-name/.test(run.element.innerHTML), 'kolom nama harus ada di langkah pertama');
  assert.ok(/nama/i.test(run.element.innerHTML));
});

test('nama WAJIB: tanpa nama tidak ada jalan maju, dan tidak ada "Lewati" untuk mengakalinya', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  assert.strictEqual(run.element.querySelector('[data-ob-skip]'), null,
    'satu-satunya langkah tanpa Lewati - kalau ada, aplikasi kembali punya nama bawaan yang dipaku di kode');
  assert.strictEqual(run.element.querySelector('[data-ob-step-skip]'), null);
  assert.ok(run.element.querySelector('[data-ob-advance]').hasAttribute('disabled'));
  // Spasi saja bukan nama.
  typeName(run, '   ');
  assert.ok(run.element.querySelector('[data-ob-advance]').hasAttribute('disabled'),
    'spasi kosong tidak boleh membuka langkah wajib');
  assert.strictEqual(run.stepIndex(), onboarding.NAME_STEP);
});

test('nama WAJIB tetapi TIDAK mengurung: satu huruf sudah membuka jalannya', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  typeName(run, 'A');
  assert.ok(!run.element.querySelector('[data-ob-advance]').hasAttribute('disabled'),
    'jalan keluar langkah wajib harus satu ketukan, bukan syarat panjang tertentu');
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 2);
});

test('nama diserahkan ke aplikasi SEKETIKA, bukan ditahan sampai ujung perkenalan', () => {
  // Murid yang menutup aplikasi di tengah perkenalan tetap harus punya namanya saat kembali,
  // dan Home tidak boleh sempat tercat dengan sapaan netral setelah pertanyaannya dijawab.
  const env = fakeEnv();
  const seen = [];
  const run = onboarding.show(env, { now: NOW, force: true, onName: v => seen.push(v.name) });
  typeName(run, '  Ayu   Lestari ');
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.deepStrictEqual(seen, ['Ayu Lestari'], 'nama dinormalkan sebelum diserahkan, spasi ganda dibuang');
  assert.strictEqual(run.stepIndex(), 2);
});

test('nama tersimpan dan tidak ditanyakan lagi pada perkenalan berikutnya', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  typeName(run, 'Ayu');
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  run.element.querySelector('[data-ob-skip]').listeners.click[0]();
  assert.strictEqual(onboarding.storedName(env), 'Ayu');
  assert.strictEqual(onboarding.needsName(env), false);
});

test('murid lama yang belum pernah ditanya namanya mendapat SATU langkah, bukan seluruh perkenalan', () => {
  // Perkenalan sudah selesai sebelum rilis ini, jadi tidak ada nama sama sekali. Memaksa
  // mereka mengulang lima langkah lain untuk satu pertanyaan adalah hukuman, bukan perbaikan.
  const env = fakeEnv();
  env._store.set(onboarding.STORAGE_KEY, JSON.stringify({ done: true, at: NOW, via: 'finish' }));
  assert.strictEqual(onboarding.completed(env), true);
  assert.strictEqual(onboarding.needsName(env), true);
  assert.strictEqual(onboarding.show(env, { now: NOW }).shown, false, 'perkenalan penuh tetap tidak menghadang');

  const names = [];
  const finished = [];
  const run = onboarding.show(env, { now: NOW, nameOnly: true, onName: v => names.push(v.name), onFinish: () => finished.push(1) });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(run.stepIndex(), onboarding.NAME_STEP);
  typeName(run, 'Bima');
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.deepStrictEqual(names, ['Bima']);
  assert.deepStrictEqual(finished, [1], 'langkah nama tunggal harus menyerahkan kendali kembali seperti jalan keluar lain');
  assert.strictEqual(onboarding.storedName(env), 'Bima');
  assert.strictEqual(onboarding.show(env, { now: NOW, nameOnly: true }).shown, false, 'sekali dijawab, tidak menghadang lagi');
});

test('nama tidak bisa menyuntik markup dan tidak bisa tumbuh tanpa batas', () => {
  // Kurung sudut dibuang (nama juga masuk ke title dokumen dan notifikasi, bukan hanya ke
  // markup yang di-escape), dan sisanya dipotong pada batas panjang - keduanya sekaligus.
  assert.ok(!/[<>]/.test(onboarding.normalizeName('<img src=x onerror=alert(1)>')));
  assert.ok(!/[<>]/.test(onboarding.nameMarkup(fakeEnv(), '<b>x</b>').replace(/<[^>]*>/g, '')));
  assert.strictEqual(onboarding.normalizeName('A'.repeat(200)).length, onboarding.NAME_MAX);
  // Nama orang tidak boleh dirusak: aksen, kutip, dan tanda hubung dibiarkan apa adanya.
  assert.strictEqual(onboarding.normalizeName("O'Neil-Ré"), "O'Neil-Ré");
});

test('aplikasi tidak lagi memaku nama siapa pun sebagai nilai bawaan', () => {
  assert.ok(/const DEFAULT_USER_NAME='';/.test(app),
    'nama bawaan yang berisi nama orang berarti murid lain disapa dengan nama orang itu');
  // W2-APP-D (teknik union W2-TEST): sapaan cadangan kini sah dalam DUA bentuk —
  // literal inline ATAU kunci copy-map FiezelI18n.t('...') yang nilainya terdaftar
  // non-kosong di features/i18n/copy-id-*.js (m025-117 tetap terjaga: bukan nama orang,
  // melainkan sapaan netral yang datang dari lapisan naskah, bukan hardcode nama).
  const fallbackInline = /const FALLBACK_LEARNER_NAME='[^']+';/.test(app);
  const fallbackKey = app.match(/const FALLBACK_LEARNER_NAME=FiezelI18n\.t\('([a-z0-9.-]+)'\);/);
  let fallbackViaCopy = false;
  if (fallbackKey) {
    const copySources = fs.readdirSync('./features/i18n')
      .filter((f) => /^copy-id-.*\.js$/.test(f))
      .map((f) => fs.readFileSync('./features/i18n/' + f, 'utf8')).join('\n');
    fallbackViaCopy = new RegExp("'" + fallbackKey[1].replace(/\./g, '\\.') + "'\\s*:\\s*'[^']+'").test(copySources);
  }
  assert.ok(fallbackInline || fallbackViaCopy, 'sapaan cadangan harus netral, bukan nama orang');
  assert.ok(/function setLearnerName\(value\)/.test(app), 'satu pintu masuk nama ke dalam state');
  assert.ok(/onName:\(\{name\}\)=>/.test(app), 'app.js harus menyambungkan langkah nama ke state');
  assert.ok(/function askLearnerNameIfMissing/.test(app), 'murid lama tetap harus ditanya sekali');
  assert.ok(/if\(askLearnerNameIfMissing\(at\)\)return null;/.test(app), 'pertanyaan itu harus berada di jalur boot');
});

test('gate onboarding sudah terdaftar di CI', () => {
  const workflow = fs.readFileSync('./.github/workflows/quality.yml', 'utf8');
  assert.ok(/node onboarding-test\.js/.test(workflow));
});

console.log('');
if (failures) { console.error('FIEZEL onboarding: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL onboarding: PASS');
