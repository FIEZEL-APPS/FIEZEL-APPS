#!/usr/bin/env node
/**
 * m026-BUG gerbang TANGGA SUARA — tiga bug produksi yang membuat murid DIAM.
 *
 * KENAPA BERKAS INI ADA. Ketiga bug yang dijaga di sini punya bentuk yang sama, dan itulah
 * yang membuat mereka hidup berbulan-bulan: kodenya MENYEBUT cadangan, komentarnya
 * menjanjikan cadangan, tetapi cadangannya tidak pernah tercapai. Mencocokkan kata kunci
 * tidak akan pernah menangkap kelas bug itu — satu-satunya cara adalah MENJALANKAN jalur
 * gagalnya dan melihat siapa yang menyahut. Karena itu gerbang ini memuat blok sumber yang
 * asli ke dalam vm dan memaksa setiap lapisan gagal satu per satu.
 *
 * Empat janji:
 *   (a) `fiezel-speaking-listening-addon.js` MENGEMBALIKAN replay di catch dan tidak
 *       mengunci item listening. Dua kegagalan TTS berturut-turut dulu berarti item itu
 *       mati permanen (CF-MIGRATION §Ringkasan, cf-b4 §5.2).
 *   (b) `fiezel-voice-say.js` punya cabang speechSynthesis yang TERCAPAI ketika
 *       prepared=false — kasus murid baru, yang aset neuralnya belum diunduh (cf-c1 K10).
 *   (c) `app.js` AudioService menjatuhkan diri ke cadangan karena say() GAGAL, bukan karena
 *       modulnya absen; dan bila semua gagal ia berbicara jujur SEKALI (cf-c1 K11).
 *   (d) tidak ada kelonggaran pada penjaga unduhan 152 MB. Memperbaiki kebisuan dengan
 *       menyalakan mesin neural di tengah pelajaran adalah obat yang lebih buruk dari
 *       penyakitnya (cf-a5 §4).
 *
 * Sumber: reports/CF-MIGRATION-REPORT.md §Ringkasan, reports/cf-c1-konsistensi.md K10/K11,
 * reports/cf-b4-ai-tts.md §5, reports/cf-a12-ux-fallback.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const ADDON_PATH = path.join(root, 'features', 'speaking-listening', 'fiezel-speaking-listening-addon.js');
const ADDON = fs.readFileSync(ADDON_PATH, 'utf8');
const SAY_PATH = 'features/neural-voice/fiezel-voice-say.js';
const SAY = read(SAY_PATH);
const APP = read('app.js');

/* Hotfix CI pasca-#242 (AI-20 F06 kategori 2a UNION): kalimat murid boleh pindah ke copy-map
   dengan nilai byte-identik; korpus gabungan = sumber + features/i18n/copy-id-*.js. */
const ID_COPY_CORPUS=(()=>{try{const d=path.join(root,'features','i18n');if(!fs.existsSync(d))return '';return fs.readdirSync(d).filter(n=>/^copy-id-.*\.js$/.test(n)).sort().map(n=>fs.readFileSync(path.join(d,n),'utf8')).join('\n');}catch(e){return ''}})();
const SW = read('sw.js');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${ok ? '' : ' :: ' + details}`);
};

/**
 * Blok sumber sebuah fungsi puncak, pola yang sama dengan grammar-unlock-test.js: potong
 * dari deklarasinya sampai deklarasi fungsi puncak berikutnya. Dipakai untuk menjalankan
 * kode PRODUKSI yang asli, bukan salinannya.
 */
function sourceBlock(name, source) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

// ===========================================================================================
// (a) ADDON LISTENING — replay dikembalikan, item tidak dikunci
// ===========================================================================================
//
// Dijalankan, bukan dibaca. DOM tiruan di bawah hanya perlu melakukan tiga hal: menyimpan
// innerHTML, memberi node per selector, dan menyalakan handler klik.

function fakeNode(selector, owner) {
  let markup = '';
  const node = {
    selector,
    // Hanya [data-work] yang lahir disabled — itu kunci jawaban listening di produksi.
    disabled: selector === '[data-work]',
    textContent: '',
    handlers: {},
    dataset: {},
    hidden: false,
    className: '',
    get innerHTML() { return markup; },
    // Menulis innerHTML MENGHANCURKAN anak-anaknya beserta pendengarnya - itu perilaku DOM
    // yang harus ditiru, karena tanpa itu satu tombol yang dirender berulang kali akan
    // terlihat memiliki empat pendengar klik dan gerbang ini akan lulus untuk alasan salah.
    set innerHTML(value) { markup = String(value); if (owner) owner.dropDetached(); },
    /* classList lengkap. Kode produksi memakai stage.classList.add('is-playing') di
       fiezel-speaking-listening-addon.js; stub tanpa classList membuat gerbang ini MELEDAK
       dengan TypeError alih-alih menguji tangga suara — kegagalan harness yang menyamar
       jadi kegagalan produk. Metodenya nyata (menyimpan kelas), bukan no-op, supaya
       assert tentang kelas tetap mungkin ditulis nanti. */
    classList: (function () {
      const set = new Set();
      return {
        add(...names) { names.forEach((n) => set.add(String(n))); },
        remove(...names) { names.forEach((n) => set.delete(String(n))); },
        toggle(name, force) { const n = String(name); const on = force === undefined ? !set.has(n) : !!force; if (on) set.add(n); else set.delete(n); return on; },
        contains(name) { return set.has(String(name)); },
        get length() { return set.size; }
      };
    })(),
    addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); },
    click() { (this.handlers.click || []).forEach((fn) => fn({ currentTarget: this })); },
    setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    append() {}, remove() {}
  };
  // DOMTokenList tiruan yang MENYIMPAN token. Addon menandai panggung dengan
  // `.is-playing` selama pemutaran (baris 627/663) dan pilihan dengan `.is-picked`;
  // tanpa classList di sini gerbang mati sebagai TypeError, dan dengan no-op ia akan
  // menjawab salah - kelas yang ditambahkan harus bisa dibaca kembali.
  const tokens = new Set();
  node.classList = {
    add(...names) { names.filter(Boolean).forEach((n) => tokens.add(n)); node.className = [...tokens].join(' '); },
    remove(...names) { names.forEach((n) => tokens.delete(n)); node.className = [...tokens].join(' '); },
    contains(name) { return tokens.has(name); },
    toggle(name, force) { const on = force === undefined ? !tokens.has(name) : !!force; if (on) tokens.add(name); else tokens.delete(name); node.className = [...tokens].join(' '); return on; }
  };
  return node;
}

function fakeRoot() {
  let markup = '';
  const nodes = new Map();
  const host = {
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = String(value); nodes.clear(); },
    // Node yang selektornya tidak lagi muncul di markup sesi adalah node yang baru saja
    // ditimpa oleh penulisan innerHTML sebuah anak; ia harus dilupakan.
    dropDetached() {
      for (const selector of [...nodes.keys()]) {
        const attribute = selector.replace(/^\[|\]$/g, '');
        if (!markup.includes(attribute)) nodes.delete(selector);
      }
    },
    node(selector) { if (!nodes.has(selector)) nodes.set(selector, fakeNode(selector, host)); return nodes.get(selector); },
    querySelector(selector) { return host.node(selector); },
    querySelectorAll() { return []; }
  };
  return host;
}

const addon = require(ADDON_PATH);
const item = Object.freeze({
  id: 'listen_sc_test_0001',
  level: 'A2',
  mode: 'gist',
  question: 'Apa inti percakapan itu?',
  script: 'RAHASIA-SKRIP-YANG-TIDAK-BOLEH-TERLIHAT',
  options: ['satu', 'dua', 'tiga', 'empat'],
  answerIndex: 1,
  voice: 'af_bella',
  maxReplays: 2
});

function failingController(reason) {
  const calls = { play: 0, stop: 0 };
  const tts = {
    play() { calls.play++; return Promise.reject(new Error(reason || 'voice_playback_failed')); },
    stop() { calls.stop++; }
  };
  const controller = new addon.__test.Controller({ tts, config: { storageKey: 'fiezel-sl-gate-nostore' } });
  controller.store.save = () => controller.store.state; // jangan menulis ke storage nyata
  controller.root = fakeRoot();
  controller.domain = 'listening';
  controller.items = [item, { ...item, id: 'listen_sc_test_0002' }];
  controller.index = 0;
  return { controller, tts, calls };
}

(function addonPathBehaviour() {
  const { controller, calls } = failingController();
  controller.renderSession();
  const play = controller.root.querySelector('[data-play]');
  const work = controller.root.querySelector('[data-work]');

  check('addon: pemutar dan kunci jawaban terpasang seperti di produksi',
    typeof play.handlers.click?.[0] === 'function' && work.disabled === true,
    `play handler=${!!play.handlers.click} work.disabled=${work.disabled}`);

  return (async () => {
    const limit = Number(item.maxReplays);
    for (let attempt = 1; attempt <= limit + 2; attempt++) {
      play.click();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
    }

    check('addon: replay dikembalikan di catch — item TIDAK terkunci setelah kegagalan berulang',
      controller.replays === 0 && controller.replays < limit,
      `replays=${controller.replays} setelah ${limit + 2} kegagalan (limit ${limit})`);
    check('addon: tombol Dengarkan masih bisa ditekan, dan benar-benar mencoba lagi',
      play.disabled === false && calls.play === limit + 2,
      `play.disabled=${play.disabled} percobaan=${calls.play}`);
    check('addon: jawaban tetap terkunci karena audionya memang belum berbunyi',
      work.disabled === true,
      'membuka pilihan tanpa audio mengubah listening menjadi soal tebak-tebakan');

    const feedback = controller.root.querySelector('[data-feedback]');
    check('addon: keadaan no_audio dicatat sebagai keadaan sah',
      controller.noAudio === true && Array.isArray(controller.noAudioItems) && controller.noAudioItems.includes(item.id),
      `noAudio=${controller.noAudio} noAudioItems=${JSON.stringify(controller.noAudioItems)}`);
    check('addon: item no_audio TIDAK dinilai dan tidak masuk evidence',
      (controller.store.state.events || []).length === 0 && controller.store.evidence().domains.listening.attempts === 0,
      `events=${(controller.store.state.events || []).length}`);
    check('addon: skrip tetap tertutup — bug suara tidak diperbaiki dengan membocorkan naskah',
      !feedback.innerHTML.includes(item.script) && !String(controller.root.innerHTML).includes(item.script),
      'naskah listening bocor ke layar');
    check('addon: pesannya jujur, ber-POV kamu, dan mengizinkan mencoba lagi',
      /bermasalah/i.test(feedback.innerHTML) && /\bkamu\b/.test(feedback.innerHTML) &&
        /tidak dinilai/i.test(feedback.innerHTML) && /tidak dikunci/i.test(feedback.innerHTML),
      feedback.innerHTML.slice(0, 160));
    check('addon: ada satu tombol lanjut yang tetap bisa dipakai',
      feedback.innerHTML.includes('data-skip-no-audio'),
      'murid tanpa suara harus punya jalan keluar selain keluar dari sesi');

    const before = controller.index;
    controller.root.querySelector('[data-skip-no-audio]').click();
    check('addon: lanjut ke item lain maju tanpa menilai apa pun',
      controller.index === before + 1 && (controller.store.state.events || []).length === 0,
      `index ${before} -> ${controller.index}`);

    // Jalur sukses tidak boleh ikut berubah: audio yang berbunyi tetap membuka jawaban.
    const okController = new addon.__test.Controller({
      tts: { play: () => Promise.resolve({ provider: 'puter-txt2speech' }), stop() {} },
      config: { storageKey: 'fiezel-sl-gate-nostore' }
    });
    okController.store.save = () => okController.store.state;
    okController.root = fakeRoot();
    okController.domain = 'listening';
    okController.items = [item];
    okController.index = 0;
    okController.renderSession();
    okController.root.querySelector('[data-play]').click();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    check('addon: audio yang BERBUNYI tetap menghitung replay dan membuka jawaban',
      okController.replays === 1 && okController.root.querySelector('[data-work]').disabled === false,
      `replays=${okController.replays} work.disabled=${okController.root.querySelector('[data-work]').disabled}`);

    // KEGAGALAN SENYAP. FiezelVoiceSay tidak melempar ketika tangganya habis - ia MENJAWAB
    // false, dan host membungkusnya sebagai promise yang resolve. Kalau addon menghitung itu
    // sebagai sukses, murid diminta menjawab soal dengar yang tidak pernah berbunyi. Bukti
    // peramban 390 px menangkap tepat kasus ini.
    const silentController = new addon.__test.Controller({
      tts: { play: () => Promise.resolve(false), stop() {} },
      config: { storageKey: 'fiezel-sl-gate-nostore' }
    });
    silentController.store.save = () => silentController.store.state;
    silentController.root = fakeRoot();
    silentController.domain = 'listening';
    silentController.items = [item];
    silentController.index = 0;
    silentController.renderSession();
    silentController.root.querySelector('[data-play]').click();
    for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setImmediate(resolve));
    check('addon: say() yang menjawab false dihitung GAGAL, bukan sukses senyap',
      silentController.noAudio === true && silentController.replays === 0 &&
        silentController.root.querySelector('[data-work]').disabled === true,
      `noAudio=${silentController.noAudio} replays=${silentController.replays} work.disabled=${silentController.root.querySelector('[data-work]').disabled}`);
    check('addon: jalur ujian juga menolak suara senyap (false) sebagai audio yang berbunyi',
      /const played=await this\.tts\.play\(set\.script/.test(ADDON) && /if\(played===false\|\|played==null\)throw/.test(ADDON),
      'renderListeningExam() masih membuka soal saat say() menjawab false');

    check('addon: jalur ujian yang sudah benar tidak diubah',
      /this\.replays--/.test(ADDON) && (/Soal tetap terkunci/.test(ADDON) || ID_COPY_CORPUS.includes('Soal tetap terkunci')),
      'renderListeningExam() adalah acuan perbaikan ini; ia harus tetap utuh');
    const timeout = /const\s+TTS_TIMEOUT_MS\s*=\s*(\d+)/.exec(ADDON);
    check('addon: ambang tunggu audio adalah konstanta bernama, bukan angka di dalam handler',
      Boolean(timeout) && Number(timeout[1]) <= 25000 && !/reject\(new Error\('tts_timeout'\)\),\s*35000\)/.test(ADDON),
      `TTS_TIMEOUT_MS=${timeout ? timeout[1] : 'missing'}`);
  })();
})();

// ===========================================================================================
// (b) VOICE SAY — L4 speechSynthesis tercapai justru ketika prepared=false
// ===========================================================================================

function sayHarness(options) {
  const opts = options || {};
  const calls = { puter: 0, runtime: 0, prepare: 0, ensureReady: 0, synth: 0, spoken: [] };
  const timers = new Set();
  const sandbox = {
    console,
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); timers.add(t); return t; },
    clearTimeout: (t) => { timers.delete(t); return clearTimeout(t); },
    FiezelPuterVoice: opts.noPuter ? undefined : {
      // Dua bentuk kegagalan Puter yang sama-sama nyata: MELEMPAR (jaringan mati) dan
      // RESOLVE false (kehabisan waktu di dalam SDK-nya). Keduanya wajib turun ke lapisan
      // bawah; yang kedua sempat berhenti diam-diam di jalur lama.
      speak() { calls.puter++; return opts.puterResolvesFalse ? Promise.resolve(false) : Promise.reject(new Error('puter_offline')); },
      stop() {},
      creditStatus() { return { outOfCredit: false }; }
    },
    FiezelVoiceRuntime: opts.noRuntime ? undefined : {
      status() { return { prepared: !!opts.prepared, ready: !!opts.prepared }; },
      speak(text) { calls.runtime++; calls.spoken.push('runtime:' + text); return opts.localSucceeds ? Promise.resolve(true) : Promise.reject(new Error('neural_failed')); },
      prepare() { calls.prepare++; return Promise.reject(new Error('prepare_must_never_be_called_from_a_failure_path')); },
      ensureReady() { calls.ensureReady++; return Promise.reject(new Error('ensureReady_must_never_be_called_here')); },
      stop() {}
    }
  };
  if (!opts.noSpeechSynthesis) {
    sandbox.speechSynthesis = {
      speak(utterance) {
        calls.synth++;
        calls.spoken.push('speechSynthesis:' + utterance.text);
        if (opts.synthNeverStarts) return; // kegagalan khas iOS: diterima, tidak pernah berbunyi
        setTimeout(() => { utterance.onstart && utterance.onstart(); utterance.onend && utterance.onend(); }, 0);
      },
      cancel() {}
    };
    sandbox.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; this.rate = 1; };
  }
  vm.createContext(sandbox);
  vm.runInContext(SAY, sandbox, { timeout: 5000, filename: SAY_PATH });
  return { api: sandbox.FiezelVoiceSay, calls, sandbox, done: () => timers.forEach(clearTimeout) };
}

(async function voiceSayLadder() {
  // Murid BARU: aset neural belum diunduh (prepared=false), Puter gagal (luring).
  const fresh = sayHarness({ prepared: false });
  const spoke = await fresh.api.say('Good morning.', { locale: 'en-US', speed: 1 });
  check('voice-say: prepared=false tetap berbunyi lewat speechSynthesis (murid baru tidak lagi senyap)',
    spoke === true && fresh.calls.synth === 1,
    `say()=${spoke} speechSynthesis.speak=${fresh.calls.synth}`);
  check('voice-say: mesin neural TIDAK disentuh saat asetnya belum siap',
    fresh.calls.runtime === 0 && fresh.calls.prepare === 0 && fresh.calls.ensureReady === 0,
    `runtime.speak=${fresh.calls.runtime} prepare=${fresh.calls.prepare} ensureReady=${fresh.calls.ensureReady}`);
  check('voice-say: urutannya tetap Puter dulu, cadangan peramban sesudahnya',
    fresh.calls.puter === 1 && fresh.calls.spoken[0].startsWith('speechSynthesis:'),
    `puter.speak=${fresh.calls.puter} jejak=${JSON.stringify(fresh.calls.spoken)}`);
  check('voice-say: status() melaporkan lapisan peramban, jadi kebisuan bisa didiagnosis',
    fresh.api.status().browserFallbackReady === true,
    JSON.stringify(fresh.api.status()));
  fresh.done();

  // Aset SUDAH siap: L3 dicoba lebih dulu, dan L4 tetap ada di bawahnya.
  // Puter yang RESOLVE false (bukan melempar) juga harus turun, bukan diam.
  const softFail = sayHarness({ prepared: false, puterResolvesFalse: true });
  const softSpoke = await softFail.api.say('Good morning.', { locale: 'en-US', speed: 1 });
  check('voice-say: Puter yang menjawab false (bukan melempar) tetap turun ke lapisan bawah',
    softSpoke === true && softFail.calls.synth === 1,
    `say()=${softSpoke} speechSynthesis.speak=${softFail.calls.synth}`);
  softFail.done();

  const prepared = sayHarness({ prepared: true });
  const spoke2 = await prepared.api.say('Good evening.', {});
  check('voice-say: aset siap → mesin neural dicoba dulu, lalu turun ke peramban bila ia gagal',
    prepared.calls.runtime === 1 && prepared.calls.synth === 1 && spoke2 === true,
    `runtime.speak=${prepared.calls.runtime} speechSynthesis.speak=${prepared.calls.synth}`);
  prepared.done();

  const preparedOk = sayHarness({ prepared: true, localSucceeds: true });
  await preparedOk.api.say('Neural wins.', {});
  check('voice-say: mesin neural yang BERHASIL tidak diikuti suara peramban dua kali',
    preparedOk.calls.runtime === 1 && preparedOk.calls.synth === 0,
    `runtime.speak=${preparedOk.calls.runtime} speechSynthesis.speak=${preparedOk.calls.synth}`);
  preparedOk.done();

  // Tanpa runtime sama sekali (modul bootstrap belum termuat) L4 masih harus tercapai.
  const noRuntime = sayHarness({ noRuntime: true, noPuter: true });
  const spoke3 = await noRuntime.api.say('No engine at all.', {});
  check('voice-say: tanpa mesin apa pun, peramban masih menjadi lapisan terakhir yang bersuara',
    spoke3 === true && noRuntime.calls.synth === 1,
    `say()=${spoke3} speechSynthesis.speak=${noRuntime.calls.synth}`);
  noRuntime.done();

  // L5: benar-benar tidak ada suara di perangkat → false, tenang, tanpa dialog.
  const silent = sayHarness({ prepared: false, noSpeechSynthesis: true });
  const spoke4 = await silent.api.say('Nothing can speak.', {});
  check('voice-say: perangkat tanpa suara sama sekali menjawab false, bukan melempar',
    spoke4 === false,
    `say()=${spoke4}`);
  silent.done();

  // Breaker 10 s untuk speak() yang diterima tanpa pernah berbunyi (khas iOS).
  const stuck = sayHarness({ prepared: false, synthNeverStarts: true });
  const breakerMs = Number((/BROWSER_BREAKER_MS\s*=\s*(\d+)/.exec(SAY) || [])[1]);
  check('voice-say: cabang peramban punya breaker sendiri, dan ambangnya bisa dibaca',
    Number.isFinite(breakerMs) && breakerMs > 0 && breakerMs <= 10000,
    `BROWSER_BREAKER_MS=${breakerMs}`);
  check('voice-say: breaker MENDINGIN, tidak melatch seumur sesi (satu macet tidak mendiamkan murid selamanya)',
    /BROWSER_COOLDOWN_MS/.test(SAY) && /browserBreakerUntil = Date\.now\(\) \+ BROWSER_COOLDOWN_MS/.test(SAY) &&
      !/browserBreakerOpen = true/.test(SAY),
    'breaker L4 harus punya masa dingin, bukan bendera permanen');

  check('voice-say: breaker hanya mengukur waktu SEBELUM onstart, bukan panjang kalimatnya',
    /utterance\.onstart\s*=\s*function\s*\(\)\s*\{\s*started\s*=\s*true;\s*if\s*\(timer\)/.test(SAY),
    'memutus setelah 10 s berbunyi akan memotong paragraf bacaan yang wajar');
  stuck.done();
})().catch((error) => { check('voice-say: harness berjalan tanpa galat', false, error.stack || String(error)); });

// ===========================================================================================
// (c) APP.JS — setiap kegagalan pintu suara menjawab null, dan PENDING BUKAN kebisuan
// ===========================================================================================

const audioBlock = sourceBlock('AudioService', APP);
check('app.js: AudioService bisa diambil sebagai blok sumber utuh',
  Boolean(audioBlock) && audioBlock.includes('const audio=AudioService()'),
  audioBlock ? `${audioBlock.length} char` : 'AudioService tidak ditemukan');
check('app.js: cadangan TIDAK lagi bersyarat "modul FiezelVoiceSay absen"',
  !/if\(self\.FiezelVoiceSay\?\.say\)return self\.FiezelVoiceSay\.say\(/.test(APP),
  'cabang lama itu mati secara struktural karena sw.js mem-precache modulnya (cf-c1 K11)');
/* m025-231, kebalikan dari gerbang di atasnya. Dulu yang dijaga adalah "cadangannya benar-benar
   DIPANGGIL"; sekarang yang dijaga adalah tidak ada cadangan bersuara sama sekali di dalam
   AudioService. Komentar sejarah di play() memang masih menyebut speechSynthesis - itulah
   sebabnya yang diperiksa KODE-nya, bukan berkasnya. */
check('app.js: AudioService tidak menyimpan satu pun sebutan suara peramban di KODE-nya',
  !/speechSynthesis|SpeechSynthesisUtterance|browserPlay|browserSupported/.test(codeOnly(audioBlock)),
  'browserPlay()/browserSupported dihapus bersama L4; menyisakannya berarti lapisan itu bisa hidup lagi');

function audioHarness(options) {
  const opts = options || {};
  const calls = { say: 0, synth: 0, synthCancel: 0, toast: [], utterances: [], cancelPrefetch: 0, prefetch: 0, timers: [] };
  const sandbox = {
    console,
    selectedNeuralRate: () => 1,
    showToast: (message) => { calls.toast.push(String(message)); },
    /* Stopwatch 9 detik milik play() DIPENDEKKAN, bukan dimatikan. Yang diuji adalah ARTI
       kemenangannya, dan menunggu sembilan detik sungguhan di dalam gerbang tidak menambah
       satu pun kebenaran. Angka yang DIMINTA tetap dicatat, supaya "9 detik" tidak diam-diam
       berubah menjadi nol dan membuat gerbang PENDING di bawah lulus untuk alasan salah.
       Timer adalah makrotask, jadi say() yang menjawab lewat rantai mikrotask tetap menang
       lebih dulu - urutan yang sama persis dengan di peramban. */
    setTimeout: (fn, ms) => { calls.timers.push(ms); return setTimeout(fn, 0); },
    clearTimeout: (t) => clearTimeout(t),
    // V6: AudioService sekarang membatalkan/mengajukan prefetch lewat dua pintu di app.js
    // (cancelVoicePrefetch/prefetchNextVoice). Keduanya di luar blok sumber yang dijalankan
    // gerbang ini, jadi mereka distub di sini - sama seperti selectedNeuralRate dan
    // showToast di atas. Yang diuji berkas ini tetap TANGGA CADANGAN, bukan prefetch;
    // prefetch punya gerbangnya sendiri (voice-callsite-prefetch-test.js). Jumlah
    // panggilannya dicatat supaya stub ini tidak bisa menyembunyikan pemanggilan liar.
    cancelVoicePrefetch: () => { calls.cancelPrefetch++; },
    prefetchNextVoice: () => { calls.prefetch++; }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  /* PERANGKAP L4, sama seperti di sayHarness. Bendera `noBrowser` dihapus: pintunya sekarang
     SELALU terbuka, supaya setiap `synth === 0` di bawah berarti "tidak dipakai" dan bukan
     "tidak mungkin dipakai". Peranti murid pun punya speechSynthesis - menghapus stubnya akan
     menguji dunia yang tidak ada. */
  sandbox.speechSynthesis = {
    speak(utterance) { calls.synth++; calls.utterances.push(utterance); },
    cancel() { calls.synthCancel++; }
  };
  sandbox.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; this.rate = 1; };
  if (!opts.noModule) {
    sandbox.FiezelVoiceSay = {
      say(text) {
        calls.say++;
        if (opts.sayRejects) return Promise.reject(new Error('voice_playback_failed'));
        if (opts.sayThrows) throw new Error('voice_door_exploded');
        // Paragraf bacaan yang MASIH berbunyi ketika stopwatch 9 detik habis - bentuk persis
        // dari bug dua-suara m025-231.
        if (opts.sayHangs) return new Promise(() => {});
        return Promise.resolve(opts.sayResult === undefined ? false : opts.sayResult);
      },
      stop() {}
    };
  }
  vm.createContext(sandbox);
  // `const audio=AudioService()` adalah pengikatan leksikal, jadi ia tidak muncul sebagai
  // properti global sandbox. Satu baris tambahan menyerahkannya - blok produksinya sendiri
  // tidak diubah sebaris pun.
  vm.runInContext(`${audioBlock}\n;globalThis.__gateAudio=audio;`, sandbox, { timeout: 5000, filename: 'app.js#AudioService' });
  return { audio: sandbox.__gateAudio, calls, sandbox };
}

(async function appFallback() {
  const falsey = audioHarness({ sayResult: false });
  const result = await falsey.audio.play('Reading passage.', {});
  check('app.js: say() yang mengembalikan false menjawab null — TANPA suara peramban di belakangnya',
    falsey.calls.say === 1 && falsey.calls.synth === 0 && result === null,
    `say=${falsey.calls.say} speak=${falsey.calls.synth} hasil=${JSON.stringify(result)}`);
  check('app.js: tidak satu pun SpeechSynthesisUtterance dibangun — cadangannya tidak dicoba, bukan gagal',
    falsey.calls.utterances.length === 0,
    `utterance=${falsey.calls.utterances.length}`);
  /* INVERSI m025-231. Gerbang ini dulu berbunyi "satu kegagalan yang TERTOLONG cadangan tidak
     mengganggu murid dengan pesan": diam adalah hal yang benar karena murid tetap mendengar
     sesuatu. Sekarang tidak ada yang menolong, jadi diam berarti membohongi murid yang sedang
     menunggu suara. Toast-nya WAJIB muncul - sekali, apa adanya. */
  check('app.js: kegagalan yang tidak lagi punya cadangan DIKATAKAN kepada murid, sekali',
    falsey.calls.toast.length === 1 && /bermasalah/i.test(falsey.calls.toast[0]) && /\bkamu\b/.test(falsey.calls.toast[0]),
    JSON.stringify(falsey.calls.toast));

  const rejected = audioHarness({ sayRejects: true });
  const rejectedResult = await rejected.audio.play('Vocabulary example.', {});
  check('app.js: say() yang MENOLAK menjawab null dengan tenang, bukan galat dan bukan suara kedua',
    rejectedResult === null && rejected.calls.synth === 0,
    `hasil=${JSON.stringify(rejectedResult)} speak=${rejected.calls.synth}`);

  const thrown = audioHarness({ sayThrows: true });
  const thrownResult = await thrown.audio.play('Grammar example.', {});
  check('app.js: say() yang melempar seketika pun tidak menyalakan suara peramban',
    thrownResult === null && thrown.calls.synth === 0,
    `hasil=${JSON.stringify(thrownResult)} speak=${thrown.calls.synth}`);

  /* AKAR m025-231, dan satu-satunya gerbang di berkas ini yang menguji SEBABNYA, bukan
     akibatnya. Satu paragraf bacaan WAJAR berbunyi lebih dari 9 detik, jadi stopwatch di
     play() menang secara rutin SELAGI audionya masih berjalan. Dulu ia resolve `false` -
     nilai yang sama persis dengan "pintu suara bisu" - dan cadangan peramban lalu berbunyi
     DI ATAS audio yang sedang jalan. Itulah dua suara yang dilaporkan OWNER. Sekarang ia
     resolve sentinel PENDING, dan PENDING berarti "belum menjawab": null, tanpa toast,
     tanpa suara kedua. */
  const pending = audioHarness({ sayHangs: true });
  const pendingResult = await pending.audio.play('A reading paragraph that outlives nine seconds.', {});
  check('app.js: stopwatch 9 detik BUKAN kebisuan — null, tanpa toast dan tanpa suara kedua',
    pendingResult === null && pending.calls.toast.length === 0 && pending.calls.synth === 0,
    `hasil=${JSON.stringify(pendingResult)} toast=${JSON.stringify(pending.calls.toast)} speak=${pending.calls.synth}`);
  check('app.js: ambang stopwatch itu tetap 9 detik, bukan diam-diam menjadi nol',
    pending.calls.timers.indexOf(9000) !== -1,
    `timer=${JSON.stringify(pending.calls.timers)}`);

  const ok = audioHarness({ sayResult: true });
  const okResult = await ok.audio.play('Neural is fine.', {});
  check('app.js: pintu bersama yang BERHASIL tidak diikuti suara peramban (tidak dobel)',
    ok.calls.synth === 0 && Boolean(okResult),
    `speak=${ok.calls.synth} hasil=${JSON.stringify(okResult)}`);
  check('app.js: keberhasilan tidak pernah memunculkan pesan kebisuan',
    ok.calls.toast.length === 0,
    JSON.stringify(ok.calls.toast));

  // "Semua gagal" kini adalah keadaan BAWAAN harness. Bendera `noBrowser` dihapus karena tidak
  // ada lagi lapisan peramban untuk dimatikan - kegagalan pintu suara SUDAH berarti kebisuan.
  const mute = audioHarness({ sayResult: false });
  const first = await mute.audio.play('Nothing works.', {});
  await mute.audio.play('Nothing works twice.', {});
  await mute.audio.play('Nothing works three times.', {});
  check('app.js: bila SEMUA gagal, murid diberi tahu apa adanya — dan hanya SEKALI',
    mute.calls.toast.length === 1 && /bermasalah/i.test(mute.calls.toast[0]) && /\bkamu\b/.test(mute.calls.toast[0]),
    `toast=${JSON.stringify(mute.calls.toast)}`);
  check('app.js: kegagalan total menjawab dengan null, bukan melempar ke pemanggil',
    first === null,
    `hasil=${JSON.stringify(first)}`);
  check('app.js: tiga kegagalan berturut-turut tetap NOL utterance peramban',
    mute.calls.synth === 0 && mute.calls.utterances.length === 0,
    `speak=${mute.calls.synth} utterance=${mute.calls.utterances.length}`);

  /* Dua pintu samping yang dulu dipakai L4, ditutup dan dijaga terbalik. stop() dulu
     memanggil speechSynthesis.cancel() (antrean GLOBAL peramban), dan isSupported() dulu
     menjawab true hanya karena peranti punya speechSynthesis - jawaban yang membuat pemanggil
     mengira ada suara padahal pintu suaranya belum termuat sama sekali. */
  mute.audio.stop();
  check('app.js: stop() tidak lagi menyentuh antrean speechSynthesis global peramban',
    mute.calls.synthCancel === 0 && mute.calls.cancelPrefetch >= 1,
    `cancel=${mute.calls.synthCancel} cancelPrefetch=${mute.calls.cancelPrefetch}`);
  const noModule = audioHarness({ noModule: true });
  check('app.js: isSupported() tidak lagi mengaku didukung hanya karena peramban punya speechSynthesis',
    noModule.audio.isSupported() === false && mute.audio.isSupported() === true,
    `tanpaModul=${noModule.audio.isSupported()} denganModul=${mute.audio.isSupported()}`);

  check('app.js: pemanggil listening membaca hasil pemutaran sebelum berkata "putar ulang"',
    /const played=await audio\.play\(q\.script/.test(APP) && (/played\?'Putar ulang bila perlu\.'/.test(APP) || (/played\?FiezelI18n\.t\('quiz\.putar-ulang-bila-perlu'\)/.test(APP) && ID_COPY_CORPUS.includes('Putar ulang bila perlu.'))),
    'catatan "Putar ulang bila perlu" untuk rekaman yang tidak berbunyi adalah pesan yang bohong');
})().catch((error) => { check('app.js: harness berjalan tanpa galat', false, error.stack || String(error)); });

// ===========================================================================================
// (d) PENJAGA 152 MB — tidak ada satu pun kelonggaran
// ===========================================================================================

check('penjaga: localEngine() tetap menolak mesin neural yang asetnya belum lengkap',
  /st\.prepared \|\| st\.ready/.test(SAY),
  'tanpa pemeriksaan ini satu kalimat gagal memicu inisialisasi 152 MB di tengah pelajaran');

/* Pengganti gerbang lama "cabang peramban tidak menyentuh aset neural": cabang itu sudah
   tidak ada. Yang berdiri di DASAR tangga sekarang adalah speakWithLocal(), dan justru di
   sanalah godaan 152 MB paling besar - "murid diam, nyalakan saja mesinnya" adalah obat yang
   lebih buruk daripada penyakitnya. */
const localBlock = (/function speakWithLocal\([\s\S]*?\r?\n  \}\r?\n/.exec(SAY) || [''])[0];
check('penjaga: dasar tangga (L3 lalu L5) tidak pernah memicu unduhan model dari jalur gagal',
  Boolean(localBlock) && !/prepare\(|ensureReady\(|warmAssets/.test(localBlock),
  localBlock ? 'speakWithLocal() hanya memakai mesin yang SUDAH prepared' : 'speakWithLocal() tidak ditemukan');

const forbiddenPrecache = ['vendor/supertonic', 'vendor/kokoro', '.onnx', 'model.int8', 'text_encoder'];
const swAssets = (/const ASSETS=(\[[^;]+\]);/s.exec(SW) || [])[1] || '';
let precache = [];
try { precache = vm.runInNewContext(swAssets); } catch (_) { precache = []; }
const leaked = precache.filter((asset) => forbiddenPrecache.some((needle) => String(asset).includes(needle)));
check('penjaga: kata kunci precache neural tetap DILARANG di daftar ASSETS service worker',
  precache.length > 0 && leaked.length === 0,
  leaked.length ? leaked.join(', ') : `${precache.length} aset shell, nol aset neural`);
check('penjaga: aset neural tetap punya jalur cache sendiri di service worker',
  /isNeuralAsset/.test(SW) && SW.includes('!isNeuralAsset(e.request)'),
  'pemisahan cache inilah yang membuat 152 MB tidak pernah ikut terpasang saat install');

for (const [label, source] of [['app.js', APP], ['addon listening', ADDON]]) {
  const live = source.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
  check(`penjaga: ${label} tidak memicu unduhan model dari jalur suara gagal`,
    !/FiezelVoiceRuntime\s*\.\s*prepare\s*\(/.test(live) && !/FiezelVoiceRuntime\s*\?\.\s*prepare\s*\(/.test(live),
    'kebisuan tidak boleh diobati dengan mengunduh 152 MB di tengah pelajaran');
}

process.on('exit', () => {
  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'voice-fallback-chain',
    sources: ['reports/CF-MIGRATION-REPORT.md#ringkasan', 'reports/cf-c1-konsistensi.md#K10', 'reports/cf-c1-konsistensi.md#K11', 'reports/cf-b4-ai-tts.md#5'],
    counts: {
      pass: checks.filter((entry) => entry.status === 'PASS').length,
      fail: checks.filter((entry) => entry.status === 'FAIL').length
    },
    checks
  };
  fs.writeFileSync(path.join(root, 'VOICE-FALLBACK-CHAIN-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log('');
  console.log(`FIEZEL tangga suara: ${report.status} (${report.counts.pass} pass, ${report.counts.fail} fail)`);
  if (failed) process.exitCode = 1;
});
