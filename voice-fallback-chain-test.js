#!/usr/bin/env node
/**
 * m026-BUG gerbang TANGGA SUARA — dan, sejak m025-232, penjaga PENGHAPUSAN TTS peramban.
 *
 * KENAPA BERKAS INI ADA. Bug-bug yang dijaga di sini punya bentuk yang sama, dan itulah yang
 * membuat mereka hidup berbulan-bulan: kodenya MENYEBUT satu lapisan, komentarnya menjanjikan
 * lapisan itu, tetapi yang benar-benar menyahut saat gagal adalah hal lain. Mencocokkan kata
 * kunci tidak akan pernah menangkap kelas bug itu — satu-satunya cara adalah MENJALANKAN jalur
 * gagalnya dan melihat siapa yang menyahut. Karena itu gerbang ini memuat blok sumber yang
 * asli ke dalam vm dan memaksa setiap lapisan gagal satu per satu.
 *
 * m025-232 — KEPUTUSAN OWNER, DIMINTA DUA KALI. L4 `speechSynthesis` DIHAPUS dari tangga.
 * Tangganya kini: C0 cache klien → L1 aset R2/ElevenLabs → C1 POST /api/tts/render → L2 Puter →
 * L3 mesin neural di perangkat (HANYA bila aset `prepared`) → L5 TEKS TANPA SUARA. Tidak ada
 * lapisan bersuara di bawah L3. Gerbang ini karena itu berbalik arah: yang dulu membuktikan
 * "cadangan peramban TERCAPAI" sekarang membuktikan "tangga berhenti di L3, dan di bawahnya
 * jawabannya `false` yang tenang plus teks yang tetap terbaca".
 *
 * PERANGKAP, BUKAN KEKOSONGAN. `speechSynthesis` dan `SpeechSynthesisUtterance` tetap dipasang
 * di sandbox justru supaya "tidak dipakai" bisa dibuktikan, bukan sekadar dimungkinkan. Kalau
 * lapisan itu kembali suatu hari — lewat tambalan kebisuan yang kelihatan masuk akal, seperti
 * pertama kali dulu — ia akan menemukan pintu yang terbuka dan gerbang inilah yang berteriak.
 *
 * Empat janji:
 *   (a) `fiezel-speaking-listening-addon.js` MENGEMBALIKAN replay di catch dan tidak
 *       mengunci item listening. Dua kegagalan TTS berturut-turut dulu berarti item itu
 *       mati permanen (CF-MIGRATION §Ringkasan, cf-b4 §5.2).
 *   (b) `fiezel-voice-say.js` BERAKHIR di L3. Saat aset neural belum `prepared` — kasus murid
 *       baru — say() menjawab `false` dengan tenang, pita subtitle DITUTUP, giliran dilaporkan
 *       sebagai diam di lapisan 5, dan tidak satu pun utterance peramban dinyalakan.
 *       `browserFallbackReady` dipaku false, breaker L4 tidak ada lagi.
 *   (c) `app.js` AudioService menjawab `null` untuk SETIAP kegagalan pintu suara — tanpa suara
 *       kedua — dan berbicara jujur SEKALI per sesi (cf-c1 K11). Stopwatch 9 detiknya menjawab
 *       PENDING, dan PENDING BUKAN kebisuan: ia lewat tanpa toast dan tanpa suara.
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

/**
 * Sumber TANPA komentar, dipakai oleh penjaga statis "lapisan ini tidak boleh kembali".
 *
 * Membedakan kode dari komentar bukan kerewelan: blok kepala `fiezel-voice-say.js` dan blok
 * `play()` di app.js memang MENYEBUT speechSynthesis - itu catatan penghapusannya, tulisan yang
 * paling berguna di kedua berkas itu. Gerbang yang mencocokkan kata mentah akan menghukum
 * dokumentasi yang benar dan mendorong orang berikutnya menghapus penjelasannya, lalu
 * penghapusan L4 kehilangan satu-satunya jejak alasannya.
 *
 * Pemindai ini melacak kutip (termasuk template dan escape), jadi 'https://...' tidak salah
 * dibaca sebagai komentar. Ia hanya MEMBUANG di dalam komentar - di luar itu setiap karakter
 * diteruskan apa adanya - sehingga kesalahan terburuknya adalah gerbang yang terlalu galak,
 * bukan gerbang yang lulus karena kodenya ikut termakan. Penjaga anti-vakum di bawah tetap
 * memastikan hasil potongannya masih berisi kode sungguhan.
 */
function codeOnly(source) {
  const text = String(source == null ? '' : source);
  let out = '';
  let inBlock = false;
  let inLine = false;
  let quote = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; i += 1; } continue; }
    if (inLine) { if (ch === '\n') { inLine = false; out += ch; } continue; }
    if (quote) {
      out += ch;
      if (ch === '\\') { out += next === undefined ? '' : next; i += 1; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '*') { inBlock = true; i += 1; continue; }
    if (ch === '/' && next === '/') { inLine = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; }
    out += ch;
  }
  return out;
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
// (b) VOICE SAY — tangga BERHENTI di L3; di bawahnya diam yang jujur (L4 dihapus, m025-232)
// ===========================================================================================

/**
 * Sandbox berisi PERANGKAP, bukan kekosongan.
 *
 * `speechSynthesis` dan `SpeechSynthesisUtterance` sengaja TETAP dipasang di sini walau
 * lapisannya sudah dihapus dari produksi. Hanya dengan pintu yang terbuka lebar, "tangga tidak
 * memakainya" bisa DIBUKTIKAN: kalau stubnya dibuang, setiap `synth === 0` di bawah akan lulus
 * karena kesempatannya tidak ada, bukan karena keputusan OWNER dihormati - dan lapisan yang
 * diam-diam kembali suatu hari tidak akan menabrak apa pun. Peranti murid pun punya
 * speechSynthesis; menghapus stubnya berarti menguji dunia yang tidak ada.
 */
function sayHarness(options) {
  const opts = options || {};
  const calls = {
    puter: 0, runtime: 0, prepare: 0, ensureReady: 0,
    synth: 0, synthCancel: 0, utterances: 0,
    bandBegin: 0, bandEnd: 0, spoken: [], speech: []
  };
  const timers = new Set();
  const sandbox = {
    console,
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); timers.add(t); return t; },
    clearTimeout: (t) => { timers.delete(t); return clearTimeout(t); },
    /* Pita subtitle yang MENCATAT. Janji L5 bukan cuma "false", melainkan "false dengan teks
       yang tetap terbaca dan pita giliran yang DITUTUP" - dulu penutupan itu tugas closeBand()
       milik L4, dan menghapus L4 tanpa memindahkannya akan meninggalkan baris terjemahan
       menggantung di layar untuk giliran yang sudah selesai. Tanpa stub ini, janji itu tidak
       bisa dibuktikan sama sekali. */
    FiezelSubtitle: {
      create() { return { begin() { calls.bandBegin++; }, end() { calls.bandEnd++; } }; }
    },
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
  /* Siaran 'fiezel-speech' adalah satu-satunya cara membaca DARI LUAR bahwa giliran ini
     berakhir diam di lapisan 5. Tanpa dua stub ini emitSpeech() gagal di dalam try-nya sendiri
     dan gerbang hanya bisa melihat boolean-nya. */
  sandbox.CustomEvent = function (type, init) { this.type = String(type); this.detail = init && init.detail; };
  sandbox.document = {
    dispatchEvent(event) {
      const detail = (event && event.detail) || {};
      calls.speech.push(String(detail.phase) + ':' + String(detail.layer));
      return true;
    }
  };
  // PERANGKAP L4 - lihat blok komentar di atas. Setiap sentuhan dicatat; tidak satu pun boleh.
  sandbox.speechSynthesis = {
    speak(utterance) { calls.synth++; calls.spoken.push('speechSynthesis:' + (utterance && utterance.text)); },
    cancel() { calls.synthCancel++; }
  };
  sandbox.SpeechSynthesisUtterance = function (text) { calls.utterances++; this.text = text; this.lang = ''; this.rate = 1; };
  vm.createContext(sandbox);
  vm.runInContext(SAY, sandbox, { timeout: 5000, filename: SAY_PATH });
  return { api: sandbox.FiezelVoiceSay, calls, sandbox, done: () => timers.forEach(clearTimeout) };
}

(async function voiceSayLadder() {
  // Murid BARU: aset neural belum diunduh (prepared=false), Puter gagal (luring). Kasus INI
  // dulu satu-satunya alasan L4 dipertahankan; sekarang jawabannya jujur - diam, teks terbaca.
  const fresh = sayHarness({ prepared: false });
  const spoke = await fresh.api.say('Good morning.', { locale: 'en-US', speed: 1 });
  check('voice-say: prepared=false berakhir di L5 — false yang tenang, BUKAN suara peramban',
    spoke === false && fresh.calls.synth === 0 && fresh.calls.utterances === 0,
    `say()=${spoke} speechSynthesis.speak=${fresh.calls.synth} utterance=${fresh.calls.utterances}`);
  check('voice-say: mesin neural TIDAK disentuh saat asetnya belum siap',
    fresh.calls.runtime === 0 && fresh.calls.prepare === 0 && fresh.calls.ensureReady === 0,
    `runtime.speak=${fresh.calls.runtime} prepare=${fresh.calls.prepare} ensureReady=${fresh.calls.ensureReady}`);
  check('voice-say: urutannya tetap Puter dulu, dan SESUDAH Puter tidak ada lagi yang bersuara',
    fresh.calls.puter === 1 && fresh.calls.spoken.length === 0,
    `puter.speak=${fresh.calls.puter} jejak=${JSON.stringify(fresh.calls.spoken)}`);
  check('voice-say: L5 menutup pita subtitle dan melaporkan diam di lapisan 5 (teks tidak menggantung)',
    fresh.calls.bandEnd >= 1 && fresh.calls.speech[fresh.calls.speech.length - 1] === 'silent:5',
    `band.end=${fresh.calls.bandEnd} siaran=${JSON.stringify(fresh.calls.speech)}`);
  const freshStatus = fresh.api.status();
  check('voice-say: status() memaku browserFallbackReady=false MESKI peramban punya speechSynthesis',
    'browserFallbackReady' in freshStatus && freshStatus.browserFallbackReady === false
      && !('browserBreakerOpen' in freshStatus) && !('browserBreakerCooldownMs' in freshStatus),
    JSON.stringify(freshStatus));
  fresh.done();

  // Puter yang RESOLVE false (bukan melempar) harus tetap TURUN. Yang menerimanya sekarang
  // adalah L3 dan hanya L3 - karena itu harness ini prepared:true, supaya turunnya terlihat.
  const softFail = sayHarness({ prepared: true, puterResolvesFalse: true });
  const softSpoke = await softFail.api.say('Good morning.', { locale: 'en-US', speed: 1 });
  check('voice-say: Puter yang menjawab false (bukan melempar) tetap turun — ke L3, lalu berhenti di sana',
    softSpoke === false && softFail.calls.puter === 1 && softFail.calls.runtime === 1 && softFail.calls.synth === 0,
    `say()=${softSpoke} puter=${softFail.calls.puter} runtime=${softFail.calls.runtime} synth=${softFail.calls.synth}`);
  softFail.done();

  const prepared = sayHarness({ prepared: true });
  const spoke2 = await prepared.api.say('Good evening.', {});
  check('voice-say: aset siap → L3 dicoba; L3 yang GAGAL berakhir diam, bukan suara kedua',
    prepared.calls.runtime === 1 && prepared.calls.synth === 0 && spoke2 === false,
    `runtime.speak=${prepared.calls.runtime} speechSynthesis.speak=${prepared.calls.synth} say()=${spoke2}`);
  prepared.done();

  const preparedOk = sayHarness({ prepared: true, localSucceeds: true });
  const spokeOk = await preparedOk.api.say('Neural wins.', {});
  check('voice-say: mesin neural yang BERHASIL tidak diikuti suara kedua — satu kalimat, satu suara',
    spokeOk === true && preparedOk.calls.runtime === 1 && preparedOk.calls.synth === 0 && preparedOk.calls.spoken.length === 1,
    `runtime.speak=${preparedOk.calls.runtime} speechSynthesis.speak=${preparedOk.calls.synth} jejak=${JSON.stringify(preparedOk.calls.spoken)}`);
  preparedOk.done();

  // Tanpa mesin apa pun (modul bootstrap belum termuat), jawabannya harus TENANG. Melempar di
  // sini akan mengubah kebisuan menjadi galat tak tertangkap di pemanggil, dan layar murid ikut
  // mati bersamanya - kegagalan yang jauh lebih besar daripada satu kalimat yang tidak berbunyi.
  const noEngine = sayHarness({ noRuntime: true, noPuter: true });
  let threw = '';
  const spoke3 = await noEngine.api.say('No engine at all.', {}).catch((error) => { threw = String(error && error.message); return 'MELEMPAR'; });
  check('voice-say: tanpa mesin apa pun, say() menjawab false dengan TENANG (tidak melempar)',
    spoke3 === false && threw === '' && noEngine.calls.synth === 0,
    `say()=${spoke3} lempar=${threw} speechSynthesis.speak=${noEngine.calls.synth}`);
  noEngine.done();

  // L5 sebagai keadaan BAWAAN. Opsi harness `noSpeechSynthesis` sudah tidak punya arti dan
  // karena itu dihapus: tidak ada lagi lapisan peramban untuk dimatikan, jadi "perangkat tanpa
  // suara sama sekali" adalah harness biasa tanpa satu pun bendera.
  const silent = sayHarness({ prepared: false });
  const spoke4 = await silent.api.say('Nothing can speak.', {});
  check('voice-say: perangkat tanpa suara sama sekali menjawab false, bukan melempar',
    spoke4 === false,
    `say()=${spoke4}`);
  silent.done();

  /* PENGGANTI tiga gerbang breaker L4 (BROWSER_BREAKER_MS, BROWSER_COOLDOWN_MS, dan bentuk
     `utterance.onstart`). Yang dijaga sekarang bukan lagi CARA lapisan itu menyerah, melainkan
     bahwa ia TIDAK ADA - dan inilah gerbang paling berharga di berkas ini, karena OWNER sudah
     meminta penghapusan yang sama DUA KALI.
     Sebutan di dalam komentar justru DIIZINKAN: catatan yang menjelaskan kenapa lapisan itu
     pergi adalah dokumentasi yang benar, dan gerbang yang menghukumnya hanya akan mendorong
     orang berikutnya menghapus penjelasannya. Karena itu yang dibaca adalah KODE-nya. */
  const SAY_CODE = codeOnly(SAY);
  check('voice-say: pemotong komentar menyisakan KODE yang utuh (anti-vakum untuk dua penjaga di bawah)',
    SAY_CODE.includes('function speakWithLocal') && SAY_CODE.includes('FiezelVoiceSay')
      && SAY_CODE.includes('localEngine') && SAY_CODE.length > SAY.length * 0.4,
    `${SAY_CODE.length} char kode dari ${SAY.length} char berkas`);
  check('voice-say: NOL sebutan speechSynthesis/SpeechSynthesisUtterance/speakWithBrowser di KODE',
    !/speechSynthesis|SpeechSynthesisUtterance|speakWithBrowser|FiezelBrowserSpeak/.test(SAY_CODE),
    'L4 dihapus m025-232: komentar boleh menyebutnya, kode tidak boleh memanggilnya lagi');
  check('voice-say: tidak ada sisa BENTUK pemanggilan L4 (new Utterance, breaker peramban)',
    !/new\s+(?:root\.)?SpeechSynthesisUtterance/.test(SAY_CODE)
      && !/BROWSER_BREAKER_MS|BROWSER_COOLDOWN_MS|browserBreaker/.test(SAY_CODE),
    'breaker hanya masuk akal untuk lapisan yang ada; sisanya berarti lapisannya sudah kembali');

  // Pasangan RUNTIME dari dua penjaga statis di atas: pintunya terbuka, dan tangga tetap tidak
  // melewatinya - termasuk stop(), yang dulu memanggil speechSynthesis.cancel() milik antrean
  // GLOBAL peramban. Antrean itulah yang membuat "dua suara" dulu tidak bisa dihentikan.
  const trap = sayHarness({ prepared: false });
  await trap.api.say('Trap sentence.', { locale: 'en-US' });
  trap.api.stop();
  check('voice-say: PERANGKAP — peramban PUNYA speechSynthesis, dan tangga tidak menyentuhnya sekali pun',
    trap.calls.synth === 0 && trap.calls.utterances === 0 && trap.calls.synthCancel === 0,
    `speak=${trap.calls.synth} utterance=${trap.calls.utterances} cancel=${trap.calls.synthCancel}`);
  trap.done();
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
/* m025-232, kebalikan dari gerbang di atasnya. Dulu yang dijaga adalah "cadangannya benar-benar
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
        // dari bug dua-suara m025-232.
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
  /* INVERSI m025-232. Gerbang ini dulu berbunyi "satu kegagalan yang TERTOLONG cadangan tidak
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

  /* AKAR m025-232, dan satu-satunya gerbang di berkas ini yang menguji SEBABNYA, bukan
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
