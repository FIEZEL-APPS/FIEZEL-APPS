/**
 * FIEZEL gate — TUR BERSESI (menu / library / listening).
 *
 * Tur lama adalah satu daftar untuk seluruh aplikasi, dengan satu kunci "sudah lihat" di
 * localStorage. Baseline 27 Agustus 2026 (reports/tour-baseline.md) mengukur akibatnya: empat
 * langkah didefinisikan, DUA yang tampil, karena `.launcher-actions .primary` dan
 * `.coach-preview` sudah tidak dirender Home sejak redesign dan `resolveSteps` membuangnya
 * tanpa suara. Gate ini menahan tiga hal yang membuat kegagalan itu tidak bisa terulang diam-diam:
 *
 *   1. REGISTRI berisi tepat tiga tur, dan tur MENU berhenti di kartu penutup - tidak satu pun
 *      langkahnya menunjuk ke dalam fitur (library/listening/audiobook). Tur yang memindahkan
 *      layar sendiri berhenti menjadi penjelasan dan berubah menjadi remote control.
 *   2. SETIAP HURUF teksnya sama dengan reports/copy-tour-gems.md (§1, §2, §3, §5). Copy tur
 *      ditulis dengan batas kata dan aturan klaim jujur (butuh jaringan, gems tidak dijual);
 *      menyunting kalimatnya di kode adalah cara aturan itu bocor.
 *   3. BENDERA per-tur hidup di state (`state.toursSeen`), disanitasi, bermigrasi dari kunci
 *      lama, dan tombol "Ulangi kenalan cepat" mereset SEMUANYA lalu memaksa go('home') -
 *      kelemahan yang diukur rekon: replay dari view lain tidak pernah menampilkan tur.
 *
 * Pola pemeriksaannya sama dengan settings-cache-test.js: blok fungsi diekstrak dari app.js
 * sebagai sumber (sourceBlock), dan modul turnya sendiri dieksekusi lewat require + vm.
 */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const tour = require('./features/onboarding/fiezel-tour.js');
const app = fs.readFileSync('./app.js', 'utf8');
const tourSrc = fs.readFileSync('./features/onboarding/fiezel-tour.js', 'utf8');

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

/* =============================== COPY VERBATIM ===============================
 * Sumber: reports/copy-tour-gems.md. Disalin apa adanya, termasuk em dash dan
 * tanda baca; perbandingannya karakter demi karakter.
 */
const COPY = {
  menu: [
    ['Mulai dari Home',
      'Ini beranda kamu: progres harian, streak, dan saran latihan dari PAW. Semua perjalananmu berangkat dari sini.'],
    ['Vocab dan Grammar',
      'Tab Vocab buat nambah kosakata, tab Grammar buat materi tata bahasa \u2014 dua fondasi yang saling nguatin.'],
    ['Reading dan Peta',
      'Reading isinya bacaan berjenjang plus soalnya. Peta nunjukin jalur belajarmu dari A1 sampai C2 \u2014 biar arahmu jelas.'],
    ['Tanya FIEZEL?',
      'Tombol di kanan ini pintu ke PAW, pembimbing kamu. Bingung apa pun, tanya di sini (butuh jaringan).'],
    ['Chip level kamu',
      'Chip ini nunjukin level aktifmu. Ketuk buat pindah level \u2014 materi dan latihan langsung ngikutin pilihanmu.'],
    ['Tombol Pengaturan',
      'Ini pintu ke FIEZEL Control Room: suara, gerak, tampilan, sampai data belajarmu \u2014 semuanya kamu yang pegang.'],
    ['Tur menu selesai!',
      'Kamu udah kenal semua menunya. Tur lanjutan bakal muncul otomatis tiap kamu masuk fitur baru \u2014 santai aja.']
  ],
  library: [
    ['Ketuk buat mulai',
      'Tombol putar ini yang menghidupkan ceritanya. Ketuk sekali buat jalan, ketuk lagi buat jeda \u2014 kapan pun kamu mau.'],
    ['Subtitle ngikutin suara',
      'Teksnya jalan bareng audionya, kalimat demi kalimat. Sambil dengar sambil baca \u2014 telinga dan mata belajar bareng.'],
    ['Terjemahan Otomatis',
      'Nyalakan toggle ini, dan tiap kalimat subtitle langsung diterjemahkan ke bahasa Indonesia. Harganya 1 Gem Terjemahan per sesi, dan butuh jaringan, ya.'],
    ['Mau lebih pelan?',
      'Kecepatan suara bisa kamu atur di FIEZEL Control Room, lewat tombol Pengaturan. Setelannya nempel buat semua sesi berikutnya.']
  ],
  listening: [
    ['Dengar sekali, jawab',
      'Di sini audionya cuma diputar sekali \u2014 kayak percakapan sungguhan. Pasang telinga baik-baik, baru pilih jawabanmu.'],
    ['Meleset? Nggak apa-apa',
      'Sekali-dengar memang menantang, dan salah itu bagian dari latihan. PAW nemenin kamu di tiap soalnya.'],
    ['Terjemahan Indonesia',
      'Toggle ini nampilin terjemahan tiap soal, seharga 1 Gem Terjemahan per sesi. Gem-nya kamu dapat gratis dari streak jawaban benar.'],
    ['Atur kecepatan suara',
      'Terlalu cepat? Kecepatan suara bisa diatur di FIEZEL Control Room \u2014 buka lewat tombol Pengaturan kapan aja.']
  ]
};
const REPLAY_SUBTEXT = 'Menjalankan ulang tur menu dari awal. Tur fitur (Audiobook dan Listening) juga bakal muncul lagi pas kamu masuk fiturnya.';

/* ------------------------------------------------------------ T1: registri --- */

check('T1a FiezelTour mengekspor registri TOURS',
  !!tour.TOURS && typeof tour.TOURS === 'object', 'TOURS tidak diekspor');
check('T1b registri berisi tepat tiga tur: menu, library, listening',
  JSON.stringify(Object.keys(tour.TOURS || {})) === JSON.stringify(['menu', 'library', 'listening']),
  'kunci registri: ' + Object.keys(tour.TOURS || {}).join(', '));
check('T1c stepsFor() melayani ketiganya dan tidak melempar untuk nama asing',
  tour.stepsFor('menu').length === 7 && tour.stepsFor('library').length === 4 &&
  tour.stepsFor('listening').length === 4 && tour.stepsFor('tidak-ada').length === 0,
  'panjang: menu=' + tour.stepsFor('menu').length + ' library=' + tour.stepsFor('library').length +
  ' listening=' + tour.stepsFor('listening').length);
check('T1d STEPS lama menunjuk langkah menu yang SAMA, bukan salinan',
  tour.STEPS === tour.TOURS.menu.steps,
  'dua daftar terpisah adalah cara selector menjadi basi tanpa ada yang tahu');

for (const name of ['menu', 'library', 'listening']) {
  const steps = tour.stepsFor(name);
  const ids = new Set();
  let bad = '';
  for (const s of steps) {
    if (!s.target || !s.title || !s.body) bad = name + '/' + s.id + ': langkah tidak lengkap';
    if (ids.has(s.id)) bad = name + ': id ganda ' + s.id;
    ids.add(s.id);
  }
  check('T1e[' + name + '] setiap langkah punya id unik, target, judul, dan isi', !bad, bad);
}

/* ---------------------------------- T2: tur menu BERHENTI setelah menu ------ */

const menuSteps = tour.stepsFor('menu');
const last = menuSteps[menuSteps.length - 1];
check('T2a langkah terakhir tur menu adalah kartu penutup',
  last.id === 'penutup' && last.title === 'Tur menu selesai!',
  'langkah terakhir: ' + last.id + ' / ' + last.title);

// Selector fitur yang TIDAK BOLEH disentuh tur menu. Kalau salah satu muncul, tur menu sudah
// berubah menjadi jalan pintas ke fitur - persis yang dilarang.
const FEATURE_TOKENS = ['library', 'libraryPlay', 'libraryAsk', 'fsl-', 'speakingListeningRoot',
  'skill-hub', 'skill-card', 'library-sentence', 'fslTranslateToggle', 'library-grid'];
const trespass = menuSteps
  .map(s => ({ id: s.id, hit: FEATURE_TOKENS.filter(t => s.target.includes(t)) }))
  .filter(x => x.hit.length);
check('T2b tidak satu pun langkah menu menunjuk ke dalam fitur',
  trespass.length === 0,
  trespass.map(x => x.id + ' -> ' + x.hit.join('/')).join(', '));
check('T2c penutup menunjuk elemen netral (wordmark), bukan pintu fitur',
  last.target === '.topbar .brand-button', 'target penutup: ' + last.target);
check('T2d tur menu menjelaskan navigasi bawah per kelompok, bukan sekali sapu',
  menuSteps.filter(s => s.target.includes('.bottomnav')).length === 2,
  'langkah bernavigasi: ' + menuSteps.filter(s => s.target.includes('.bottomnav')).length);
check('T2e dua selector basi baseline sudah tidak dipakai satu tur pun',
  !JSON.stringify(tour.TOURS).includes('.launcher-actions .primary') &&
  !JSON.stringify(tour.TOURS).includes('.coach-preview'),
  'selector yang dibuang resolveSteps di baseline masih ada di registri');

/* ------------------------------------------- T3: copy verbatim (§1, §2, §3) -- */

for (const name of Object.keys(COPY)) {
  const steps = tour.stepsFor(name);
  check('T3[' + name + '] jumlah langkah sama dengan copy',
    steps.length === COPY[name].length,
    'kode=' + steps.length + ' copy=' + COPY[name].length);
  COPY[name].forEach(([title, body], i) => {
    const s = steps[i] || {};
    check('T3[' + name + '] langkah ' + (i + 1) + ' judul verbatim',
      s.title === title, 'kode: ' + JSON.stringify(s.title) + '\n    copy: ' + JSON.stringify(title));
    check('T3[' + name + '] langkah ' + (i + 1) + ' isi verbatim',
      s.body === body, 'kode: ' + JSON.stringify(s.body) + '\n    copy: ' + JSON.stringify(body));
  });
}

/* -------------------------------------------------- T4: state.toursSeen ----- */

check('T4a defaultState memuat toursSeen dengan tiga bendera',
  /toursSeen:\{menu:false,library:false,listening:false\}/.test(app),
  'toursSeen tidak ditemukan di defaultState app.js');

const sanBlock = sourceBlock('sanitizeToursSeen');
check('T4b sanitizeToursSeen() ada dan hanya mengenali tiga kunci',
  !!sanBlock && /menu:src\.menu===true/.test(sanBlock) && /library:src\.library===true/.test(sanBlock) &&
  /listening:src\.listening===true/.test(sanBlock),
  'blok sanitizeToursSeen: ' + (sanBlock ? 'ada tapi tidak seperti yang diharapkan' : 'tidak ada'));
check('T4c sanitizeState() menyalurkan toursSeen lewat sanitizer, bukan menyalin mentah',
  /toursSeen:sanitizeToursSeen\(raw\?\.toursSeen\)/.test(app),
  'sanitizeState tidak memanggil sanitizeToursSeen');
check('T4d kunci lama fiezel-tour-v1 bermigrasi menjadi menu:true',
  /legacyTourSeen\(\)/.test(sanBlock) && /fiezel-tour-v1/.test(sourceBlock('legacyTourSeen')),
  'migrasi kunci lama tidak terlihat');

// Sanitizer dijalankan sungguhan, bukan hanya dibaca. Ia harus murni: satu-satunya efek luar
// yang diizinkan adalah membaca localStorage kunci lama.
const sandbox = {
  self: { FiezelTour: { STORAGE_KEY: 'fiezel-tour-v1' } },
  localStorage: { getItem: () => null },
  console
};
vm.createContext(sandbox);
vm.runInContext(sourceBlock('legacyTourSeen') + '\n' + sanBlock + '\nvar __out={};', sandbox);
const run = expr => vm.runInContext(expr, sandbox);
check('T4e sanitizer mengubah state kosong menjadi tiga bendera false',
  JSON.stringify(run('sanitizeToursSeen(undefined)')) === '{"menu":false,"library":false,"listening":false}',
  JSON.stringify(run('sanitizeToursSeen(undefined)')));
check('T4f nilai selundupan dan kunci asing dibuang',
  JSON.stringify(run('sanitizeToursSeen({menu:"ya",listening:1,gems:true})')) === '{"menu":false,"library":false,"listening":false}',
  JSON.stringify(run('sanitizeToursSeen({menu:"ya",listening:1,gems:true})')));
check('T4g bendera true dipertahankan apa adanya',
  JSON.stringify(run('sanitizeToursSeen({menu:true,library:true,listening:false})')) === '{"menu":true,"library":true,"listening":false}',
  JSON.stringify(run('sanitizeToursSeen({menu:true,library:true,listening:false})')));
sandbox.localStorage = { getItem: () => 'finish' };
check('T4h murid yang sudah pernah menuntaskan tur lama tidak dituntun ulang',
  run('sanitizeToursSeen({}).menu') === true, 'migrasi kunci lama tidak berlaku');
check('T4i state yang sudah berpendapat menang atas kunci lama',
  run('sanitizeToursSeen({menu:false}).menu') === false,
  'kunci localStorage lama tidak boleh menimpa keputusan state');

/* ------------------------------------------- T5: pemicu sekali-per-bendera -- */

const featureBlock = sourceBlock('maybeStartFeatureTour');
check('T5a maybeStartFeatureTour() ada', !!featureBlock, 'pemicu tur fitur belum ditulis');
check('T5b pemicu fitur menghormati benderanya sendiri',
  /tourSeen\(name\)/.test(featureBlock), 'tidak ada pemeriksaan bendera per-tur');
check('T5c pemicu fitur memakai force:true (keputusan pindah ke state, bukan kunci lama)',
  /force:true/.test(featureBlock), 'force:true tidak dipakai — kunci lama akan memblokir tur fitur');
check('T5d bendera dicatat untuk hasil tampil MAUPUN no_target',
  /no_target/.test(featureBlock) && /markTourSeen\(name\)/.test(featureBlock),
  'tanpa ini tur akan mencoba lagi selamanya di layar yang tidak punya targetnya');
check('T5e ada retry terbatas untuk layar yang datang belakangan',
  /tourFeatureAttempts\[name\]\+\+>=\d+/.test(featureBlock),
  'library mem-fetch JSON dan addon menunggu runtime suara; tanpa retry tur tersegel no_target');
check('T5f menu tidak bisa dipicu lewat jalur fitur',
  /name==='menu'\)return false/.test(featureBlock), 'jalur fitur harus menolak nama menu');

check('T5g hook pembaca buku memberi tahu host, bukan menyentuh state',
  /notifyFeatureTour\('library'\)/.test(fs.readFileSync('./features/library/fiezel-library-ui.js', 'utf8')),
  'openBook() tidak memanggil notifyFeatureTour');
check('T5h hook sesi listening membungkus renderListening dari host, addon tidak diubah',
  /controller\.renderListening=\(\.\.\.args\)=>/.test(app) && /notifyFeatureTour\('listening'\)/.test(app),
  'renderListening tidak dibungkus di app.js');
check('T5i notifyFeatureTour diekspor ke window supaya modul fitur bisa memanggilnya',
  /window\.notifyFeatureTour=notifyFeatureTour/.test(app), 'pintu hook tidak diekspor');

const menuTriggerBlock = sourceBlock('maybeStartTour');
check('T5j tur menu memakai langkah registri dan bendera menu',
  /tourDef\('menu'\)/.test(menuTriggerBlock) && /tourSeen\('menu'\)/.test(menuTriggerBlock) &&
  /markTourSeen\('menu'\)/.test(menuTriggerBlock),
  'pemicu menu belum tersambung ke registri/bendera');
check('T5k jadwal boot dan guard layar bersih dipertahankan',
  /maybeStartTour,900/.test(app) && /homeScreenIsClear\(\)/.test(menuTriggerBlock),
  'urutan boot tur tidak boleh berubah');

/* ------------------------------------------------- T6: replay dari Settings -- */

const replayBlock = sourceBlock('replayTour');
check('T6a replayTour() mereset SEMUA bendera tur',
  /state\.toursSeen=\{menu:false,library:false,listening:false\}/.test(replayBlock),
  'replay hanya mereset sebagian bendera: ' + replayBlock.slice(0, 200));
check('T6b replay menyimpan state-nya',
  /save\(\)/.test(replayBlock), 'reset yang tidak disimpan hilang pada muat berikutnya');
check('T6c replay memaksa go(\'home\') sebelum memulai',
  /if\(state\.view!=='home'\)go\('home'\)/.test(replayBlock),
  'kelemahan rekon: replay dari view lain hanya menghabiskan kuota retry tanpa menampilkan tur');
check('T6d replay juga mereset kuota retry (menu dan fitur)',
  /tourAttempts=0/.test(replayBlock) && /tourFeatureAttempts\.library=0/.test(replayBlock) &&
  /tourFeatureAttempts\.listening=0/.test(replayBlock),
  'kuota retry yang sudah habis membuat replay diam');
check('T6e kunci localStorage lama ikut dilupakan',
  /FiezelTour\?\.reset\?\.\(self\)/.test(replayBlock), 'reset kunci lama hilang');
// W2-INT (teknik union W2-TEST, pola onboarding-test:692): naskah tombol replay kini sah
// dalam DUA bentuk — literal inline di app.js ATAU kunci copy-map FiezelI18n.t('...') yang
// nilainya terdaftar BYTE-IDENTIK dengan copy §5 di features/i18n/copy-id-*.js (W2-APP-D
// memindahkan literalnya ke copy-id-app-d.js; verbatim §5 tetap ditegakkan pada nilainya).
const tourCopySources = fs.readdirSync('./features/i18n')
  .filter((f) => /^copy-id-.*\.js$/.test(f))
  .map((f) => fs.readFileSync('./features/i18n/' + f, 'utf8')).join('\n');
function viaCopyVerbatim(literal, tKeyRe) {
  const key = app.match(tKeyRe);
  if (!key) return false;
  const esc = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp("'" + key[1].replace(/\./g, '\\.') + "'\\s*:\\s*'" + esc + "'").test(tourCopySources);
}
check('T6f tombol Pengaturan memakai subteks copy §5 verbatim',
  (app.includes(REPLAY_SUBTEXT) ||
    viaCopyVerbatim(REPLAY_SUBTEXT, /replayTour\(\)[^`]*?<small>\$\{FiezelI18n\.t\('([a-z0-9.-]+)'\)\}<\/small>/)) &&
  (app.includes('<b>Ulangi kenalan cepat</b>') ||
    viaCopyVerbatim('Ulangi kenalan cepat', /<b>\$\{FiezelI18n\.t\('(settings\.redo-kenalan-cepat)'\)\}<\/b>/)),
  'subteks tombol replay tidak sama dengan copy §5');

/* --------------------------------------------------------- T7: pemasangan --- */

check('T7a registri ikut ter-precache lewat modul turnya',
  fs.readFileSync('./sw.js', 'utf8').includes("'./features/onboarding/fiezel-tour.js'"),
  'tur harus ikut precache, kalau tidak ia hilang saat offline');
check('T7b gate ini terdaftar di CI',
  /node tours-test\.js/.test(fs.readFileSync('./.github/workflows/quality.yml', 'utf8')),
  'gate yang tidak dijalankan CI tidak menjaga apa pun');
check('T7c toggle Gem Terjemahan dipakai sebagai ID KONTRAK, bukan disalin isinya',
  tourSrc.includes('#fslTranslateToggle') && !/fzGems|gemBalance|gem-chip/.test(tourSrc),
  'tur hanya boleh menunjuk id kontrak bersama, tidak menyentuh UI gems');

process.on('exit', () => {
  if (failures) {
    console.error('FIEZEL tur bersesi: FAIL (' + failures + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL tur bersesi: PASS');
  }
});
