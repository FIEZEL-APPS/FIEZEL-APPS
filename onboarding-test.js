/**
 * FIEZEL gate — onboarding lima langkah (FIEZEL_Complete_Design_Specification.pdf bagian 3).
 *
 * Lapisan yang menutupi seluruh layar adalah tempat paling mudah untuk mengurung pengguna,
 * dan di produk ini gerbang notifikasi berada tepat di bawahnya. Karena itu gate ini menahan
 * beberapa hal sekaligus: perkenalan harus selalu punya jalan keluar di SETIAP langkah dan
 * SETIAP sub-langkah (termasuk dua slide carousel), harus berhenti setelah selesai atau
 * dilewati, tidak boleh menjanjikan yang tidak dipegang produk (skor, jadwal manual), dan
 * setiap penyimpangan dari spesifikasi desain (goal ASLI bukan Travel/Work/Fun, level
 * self-report bukan hasil ukur, tes 150 soal bukan 4-5 soal, pengingat otomatis bukan
 * pemilih jam) harus terlihat jujur di salinan teks, bukan disembunyikan.
 */
const assert = require('assert');
const fs = require('fs');
const mascot = require('./features/brand/fiezel-mascot.js');
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
    FiezelMascot: mascot,
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
function advanceTo(run, targetStep) {
  let guard = 0;
  while (run.stepIndex() < targetStep) {
    if (guard++ > 30) throw new Error('macet sebelum mencapai langkah ' + targetStep);
    const step = run.stepIndex();
    if (step === 1 && run.slideIndex() < onboarding.CAROUSEL_SLIDES.length - 1) {
      run.element.querySelector('[data-ob-advance]').listeners.click[0]();
      continue;
    }
    if (step === 2) {
      run.element.querySelectorAll('[data-ob-goal]')[0].listeners.click[0]();
      run.element.querySelector('[data-ob-advance]').listeners.click[0]();
      continue;
    }
    if (step === 3) {
      // Langkah ini tidak punya tombol "Lanjut" polos - satu-satunya jalan maju tanpa
      // benar-benar mengerjakan 150 soal adalah "Lewati langkah ini", dan itu memang
      // disengaja (lihat header modul, poin 3).
      run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
      continue;
    }
    run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  }
}

test('lima langkah nyata (Step 1-5), bukan enam seperti sheet lama', () => {
  assert.ok(Array.isArray(onboarding.CAROUSEL_SLIDES) && onboarding.CAROUSEL_SLIDES.length === 2);
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

test('tes penempatan mengarah ke tes 150 soal yang sungguhan, angka tidak disamarkan', () => {
  // Spesifikasi menulis "Quick diagnostic quiz, 4-5 questions". Produk ini hanya punya tes
  // 150 soal; menyebutnya "singkat" tanpa angka sebenarnya adalah kebohongan kecil yang akan
  // ditagih murid pada soal ke-30.
  const html = onboarding.placementMarkup(fakeEnv());
  assert.ok(/150 soal/.test(html), 'jumlah soal sebenarnya harus disebut');
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
  // Ini alasan utama gate ini ada. Gerbang notifikasi berada di bawah lapisan ini, dan
  // notifikasi wajib; satu langkah tanpa jalan keluar berarti aplikasi tidak bisa dimasuki.
  const env = fakeEnv();
  for (let i = 0; i < onboarding.CAROUSEL_SLIDES.length; i++) {
    const html = onboarding.carouselMarkup(env, i);
    assert.ok(/data-ob-skip/.test(html), 'slide carousel ' + i + ' tidak punya tombol lewati global');
  }
  for (const html of [
    onboarding.goalMarkup(env, '', ''),
    onboarding.placementMarkup(env),
    onboarding.scheduleMarkup(env),
    onboarding.summaryMarkup(env, '', '', true)
  ]) {
    assert.ok(/data-ob-skip/.test(html), 'langkah tidak punya tombol lewati global: ' + html.slice(0, 60));
  }
});

test('melewati (global) di langkah mana pun langsung menutup dan tidak kembali menghadang', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(env._body.children.length, 1);
  run.element.querySelector('[data-ob-skip]').listeners.click[0]();
  assert.strictEqual(onboarding.completed(env), true, 'melewati harus dicatat selesai');
  const again = onboarding.show(env, { now: NOW + 60000 });
  assert.strictEqual(again.shown, false);
  assert.strictEqual(again.reason, 'completed');
});

test('carousel: dua slide bisa dijelajah maju-mundur sebelum lanjut ke langkah 2', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  assert.strictEqual(run.stepIndex(), 1);
  assert.strictEqual(run.slideIndex(), 0);
  run.element.querySelector('[data-ob-carousel-next]').listeners.click[0]();
  assert.strictEqual(run.slideIndex(), 1);
  run.element.querySelector('[data-ob-back]').listeners.click[0]();
  assert.strictEqual(run.slideIndex(), 0, 'tombol kembali harus mundur satu slide dulu, bukan langsung keluar onboarding');
  run.element.querySelector('[data-ob-carousel-next]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 2, 'setelah slide terakhir, Lanjut harus pindah ke langkah 2');
});

test('goal selection: tombol Lanjut nonaktif sebelum memilih tujuan (sesuai spesifikasi)', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  run.element.querySelector('[data-ob-carousel-next]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 2);
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
  advanceTo(run, 2);
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
  advanceTo(run, 2);
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 3);
  assert.deepStrictEqual(seen, []);
});

test('tes penempatan tidak dijalankan di balik lapisan yang masih terpasang', () => {
  // Kuis mengambil alih seluruh layar. Kalau perkenalan masih tergantung di atasnya, murid
  // mengerjakan 150 soal di balik kaca.
  const env = fakeEnv();
  const order = [];
  const run = onboarding.show(env, { now: NOW, force: true, onPlacement: () => order.push('placement') });
  advanceTo(run, 3);
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.deepStrictEqual(order, ['placement']);
  assert.strictEqual(onboarding.completed(env), true, 'perkenalan harus sudah selesai sebelum kuis mulai');
});

test('tes penempatan: "Lewati langkah ini" tetap sampai ke langkah 4 dan 5', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  advanceTo(run, 3);
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 4);
});

test('langkah terakhir menyelesaikan dan memanggil onFinish satu kali saja', () => {
  const env = fakeEnv();
  let finished = 0;
  const run = onboarding.show(env, { now: NOW, force: true, onFinish: () => { finished++; } });
  advanceTo(run, 5);
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.strictEqual(finished, 1);
  assert.strictEqual(onboarding.completed(env), true);
});

test('summary: pilihan yang sungguhan tercatat ditampilkan kembali, bukan data bohongan', () => {
  const env = fakeEnv();
  const run = onboarding.show(env, { now: NOW, force: true });
  advanceTo(run, 2);
  run.element.querySelectorAll('[data-ob-goal="scholarship"]')[0].listeners.click[0]();
  run.element.querySelectorAll('[data-ob-level="C1"]')[0].listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  run.element.querySelector('[data-ob-advance]').listeners.click[0]();
  assert.strictEqual(run.stepIndex(), 5);
  assert.ok(/Beasiswa/.test(run.element.innerHTML));
  assert.ok(/C1/.test(run.element.innerHTML));
});

test('confetti ringkas dan tunduk pada kurangi-gerak', () => {
  const env = fakeEnv();
  const withMotion = onboarding.summaryMarkup(env, 'school', 'A2', false);
  assert.ok(/fiezel-confetti/.test(withMotion));
  const reduced = onboarding.summaryMarkup(env, 'school', 'A2', true);
  assert.ok(!/fiezel-confetti/.test(reduced), 'kurangi-gerak harus mematikan confetti, bukan hanya memperlambatnya');
});

test('tanpa modul maskot, perkenalan tidak tampil dan tidak merusak apa pun', () => {
  const env = fakeEnv({ FiezelMascot: undefined });
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, false);
  assert.strictEqual(run.reason, 'mascot_unavailable');
  assert.strictEqual(env._body.children.length, 0);
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
  assert.ok(/onClose:\(\)=>showOnboarding/.test(app.replace(/\s/g, '')), 'onboarding harus menyambung dari penutupan splash');
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

test('gerbang notifikasi dipindah ke ujung alur, bukan dihapus - notifikasi tetap wajib', () => {
  // OWNER: "ubah notification gate di akhir flow". Notifikasi tetap wajib di produk ini;
  // yang berubah hanya URUTANNYA. Murid baru (perkenalan belum selesai) melihat
  // splash+onboarding dulu; murid lama tetap diperiksa gerbangnya di awal boot, sama
  // seperti sebelumnya.
  const flat = app.replace(/\s/g, '');
  assert.ok(/functionstartWelcomeExperience\(\)\{/.test(flat), 'titik masuk boot harus tetap ada');
  assert.ok(/onboardingDone=self\.FiezelOnboarding\?\.completed\?\.\(self\)!==false/.test(flat),
    'harus memeriksa apakah perkenalan sudah selesai untuk memutuskan urutan');
  assert.ok(/if\(!onboardingDone\)returnshowBrandSplash\(\)/.test(flat),
    'murid baru harus melihat splash dulu, sebelum gerbang notifikasi');
  assert.ok(/returnstartNotificationGate\(\)/.test(flat), 'murid lama tetap langsung ke gerbang, seperti sebelumnya');
  // Gerbang itu sendiri (isi startNotificationGate) tidak boleh berubah perilakunya -
  // notifikasi tetap wajib dengan cara yang persis sama, hanya dipindah posisinya.
  assert.ok(/functionstartNotificationGate\(\)\{/.test(flat), 'logika gerbang asli harus tetap ada, hanya berganti nama');
  assert.ok(/lockAppForNotifications\(permission\)/.test(flat), 'penguncian aplikasi tanpa izin tetap terjadi');
});

test('gaya onboarding memenuhi ukuran sentuh dan tidak mewarnai ulang maskot', () => {
  const flat = css.replace(/\s*\n\s*/g, '');
  assert.ok(/\.fiezel-btn\{[^}]*min-height:44px/.test(flat), 'tombol dasar harus 44px');
  const brand = css.slice(css.indexOf('FIEZEL brand: Percik'));
  assert.ok(!/filter:|hue-rotate|scaleX\(|scaleY\(/.test(brand), 'maskot tidak boleh diwarnai ulang atau direntangkan');
});

test('gate maskot dan onboarding sudah terdaftar di CI', () => {
  const workflow = fs.readFileSync('./.github/workflows/quality.yml', 'utf8');
  assert.ok(/node brand-mascot-test\.js/.test(workflow));
  assert.ok(/node onboarding-test\.js/.test(workflow));
});

console.log('');
if (failures) { console.error('FIEZEL onboarding: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL onboarding: PASS');
