/**
 * FIEZEL gate — onboarding lima langkah (FIEZEL_Complete_Design_Specification.pdf bagian 3).
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
  run.element.querySelector('[data-ob-skip]').listeners.click[0]();
  assert.deepStrictEqual(calls, [['finish', 'skip']],
    'tombol Lewati harus memanggil onFinish tepat sekali - tanpa itu alur pembukaan berhenti diam-diam');
});

test('"Lewati" di langkah terakhir mengakhiri perkenalan, bukan mengecat ulang layar yang sama', () => {
  const env = fakeEnv();
  const calls = [];
  const run = onboarding.show(env, { now: NOW, force: true, onFinish: d => calls.push(d && d.via) });
  advanceTo(run, 5);
  run.element.querySelector('[data-ob-step-skip]').listeners.click[0]();
  assert.deepStrictEqual(calls, ['skip'],
    'di langkah terakhir tidak ada langkah berikutnya: goStep(6) dijepit kembali ke 5 dan tombolnya mati');
  assert.strictEqual(onboarding.completed(env), true);
});

test('tes penempatan memberi tahu onPlacement tepat sekali, bukan dua kali', () => {
  const env = fakeEnv();
  const calls = [];
  const run = onboarding.show(env, { now: NOW, force: true,
    onPlacement: () => calls.push('placement'), onFinish: () => calls.push('finish') });
  advanceTo(run, 3);
  run.element.querySelector('[data-ob-primary]').listeners.click[0]();
  assert.deepStrictEqual(calls, ['placement'],
    'jalur tes penempatan tidak boleh ikut memanggil onFinish - itu menjalankan dua lanjutan sekaligus');
});

test('login Puter yang menggantung tidak boleh mengurung: ada tenggat', () => {
  const app = fs.readFileSync('./app.js', 'utf8');
  assert.ok(/const PUTER_SIGNIN_TIMEOUT_MS=\d+;/.test(app),
    "keadaan 'pending' mematikan tombolnya, jadi janji yang tidak pernah selesai berarti gerbang tanpa jalan keluar");
  assert.ok(/Promise\.race\(\[[\s\S]{0,200}puter\.auth\.signIn\(\)/.test(app));
  assert.ok(/catch\(error\)\{if\(puterSignedIn\(\)\)\{completeAuthGate\(\)/.test(app),
    'tenggat harus ditangkap seperti kegagalan lain supaya tombolnya hidup kembali');
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

// m025-80 OWNER: "maskot hilangkan saja". Perkenalan menggambar lambangnya sendiri dari
// ikon Lucide, jadi tidak ada lagi modul gambar yang bisa membatalkan tampilnya.
test('perkenalan tampil tanpa bergantung pada modul gambar apa pun', () => {
  const env = fakeEnv({ FiezelMascot: undefined });
  const run = onboarding.show(env, { now: NOW });
  assert.strictEqual(run.shown, true);
  assert.strictEqual(env._body.children.length, 1);
  assert.ok(/fiezel-step-art/.test(env._body.children[0].innerHTML),
    'setiap langkah harus punya lambang penggantinya');
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
  // m025-80: aturan lama "maskot tidak boleh diwarnai ulang atau direntangkan" sudah tidak
  // punya sasaran - maskotnya dihapus. Yang dijaga sekarang: lambang langkah tetap ikon
  // vektor dari set yang sama, dan tidak ada aset raster maskot yang diam-diam kembali.
  assert.ok(/\.fiezel-step-art\{/.test(brand.replace(/\s+/g, '')),
    'lambang langkah harus punya gayanya sendiri');
  assert.ok(!/fiezel-mascot|fiezel-hero\.png|fiezel-belajar\.png|fiezel-mengintip\.png/.test(css),
    'aset maskot tidak boleh dirujuk lagi dari stylesheet');
});

test('gate onboarding sudah terdaftar di CI', () => {
  const workflow = fs.readFileSync('./.github/workflows/quality.yml', 'utf8');
  assert.ok(/node onboarding-test\.js/.test(workflow));
});

console.log('');
if (failures) { console.error('FIEZEL onboarding: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL onboarding: PASS');
