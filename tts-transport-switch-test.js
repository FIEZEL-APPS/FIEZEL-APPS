#!/usr/bin/env node
/**
 * S6 gerbang SAKELAR TRANSPORT TTS — lapisan suara Cloudflare yang disisipkan ke tangga yang
 * sudah terbukti.
 *
 * KENAPA BERKAS INI ADA. Menambah lapisan jaringan ke tangga suara adalah cara termudah
 * merusak dua perbaikan yang baru selesai dibayar: kebisuan murid baru (m026-BUG2) dan
 * prefetch neural v5. Tujuh janji di bawah tidak bisa dijaga dengan mencocokkan kata kunci —
 * semuanya soal URUTAN, ISI BADAN PERMINTAAN, dan APA YANG TERJADI SESUDAH GAGAL. Jadi
 * gerbang ini MENJALANKAN sumber produksi di dalam vm dengan jaringan, Cache API, dan mesin
 * suara tiruan, lalu membaca jejaknya.
 *
 * Tujuh janji:
 *   (a) flag 'off' = NOL permintaan ke Cloudflare dan tangga hari ini utuh (aset → Puter →
 *       neural bila prepared → speechSynthesis);
 *   (b) flag 'on' = urutannya benar dan `POST /api/tts/render` berada TEPAT di antara aset R2
 *       dan Puter — bukan sebelum aset (yang sudah dibayar, gratis), bukan sesudah Puter;
 *   (c) klien tidak pernah mengirim kunci cache. Kuncinya dihitung ULANG di server
 *       (route-tts.js langkah 1); `audioKey` yang tidak cocok dijawab 400 `key_mismatch`;
 *   (d) `speed` tidak pernah masuk badan permintaan render. Kecepatan adalah `playbackRate`
 *       di pemutaran, bukan identitas suara — ini bug bayar-ulang cf-a5 yang sudah ditutup di
 *       `tts-key.js` dan tidak boleh dihidupkan lagi dari sisi klien;
 *   (e) cache hit diputar LANGSUNG dari URL objek R2, tidak lewat jembatan PHP origin;
 *   (f) 429 jatuh ke lapisan berikutnya (murid tetap mendengar sesuatu bila mungkin), naskahnya
 *       jujur, dan ia TIDAK mengunci item serta TIDAK menaikkan hitungan replay (m025-170);
 *   (g) prefetch memakai jalur CF tanpa pernah memanggil `prepare()`/`ensureReady()` — pagar
 *       unduhan model 152 MB tetap utuh.
 *
 * Sumber yang dipakai (dan yang TIDAK ada): brief S6 menunjuk `reports/cf-b4-ai-tts.md` §2 dan
 * `reports/cf-b8-ux-quota.md`; KEDUANYA tidak ada di cabang ini. Yang dipakai sebagai gantinya
 * adalah kontrak yang benar-benar bisa dibaca: `workers/api/tts/route-tts.js`,
 * `workers/api/tts/tts-key.js`, `workers/api/wrangler.toml` (AUDIO_PUBLIC_BASE),
 * `reports/exec-e5-ai-tts.md`, `reports/exec-e3-quota.md`, `reports/voice-v5-prefetch.md`.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const SAY_PATH = 'features/neural-voice/fiezel-voice-say.js';
const TRANSPORT_PATH = 'features/neural-voice/fiezel-cf-tts-transport.js';
const NOTICE_PATH = 'features/neural-voice/fiezel-cf-voice-notice.js';
const SAY = read(SAY_PATH);
const TRANSPORT = read(TRANSPORT_PATH);
const HTML = read('index.html');
const SW = read('sw.js');
const notice = require(path.join(root, NOTICE_PATH));

const CF_BASE = 'https://api.fiezel.my.id';
const AUDIO_BASE = 'https://audio.fiezel.my.id';
const R2_URL = AUDIO_BASE + '/a/2f6c9a11deadbeef.mp3';
// Jembatan PHP origin: JSON kecil boleh lewat sini, byte audio TIDAK BOLEH (wrangler.toml:
// cache-hit dijawab dengan URL publik, bukan dengan mem-proxy byte).
const BRIDGE_URL = 'https://fiezel.my.id/api/index.php?path=/api/tts/audio';

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${ok ? '' : ' :: ' + details}`);
};

/* ------------------------------------------------------------------ harness ------------- */

/**
 * Satu konteks vm berisi SUMBER PRODUKSI yang asli: transport CF lalu pintu bicara. Yang
 * ditiru hanya dunia luar (jaringan, Cache API, mesin suara), bukan kode yang sedang diuji.
 *
 * @param {object} [options]
 *   flag              'on' | 'off' (bawaan 'off')
 *   assetReady        true bila manifest R2 punya berkas untuk kalimat ini (L1 menang)
 *   assetPlays        false bila berkas ada tetapi gagal diputar
 *   renderStatus      status HTTP yang dijawab /api/tts/render (bawaan 200)
 *   renderPayload     badan respons render (bawaan cache hit dengan URL R2)
 *   renderThrows      true untuk kegagalan jaringan
 *   warmClientCache   true untuk mengisi cache klien lebih dulu (C0 hit)
 *   prepared          status mesin neural di perangkat
 *   noResolver        true bila modul resolver belum termuat
 */
function harness(options) {
  const opts = options || {};
  const trace = [];
  const calls = {
    fetches: [], bodies: [], cacheOpens: [], played: [],
    puter: 0, runtime: 0, prepare: 0, ensureReady: 0, synth: 0, notices: []
  };
  const timers = new Set();

  function FakeRequest(url) { this.url = String(url); this.method = 'GET'; }
  function FakeResponse(body) {
    this.body = String(body);
    this.json = () => { try { return Promise.resolve(JSON.parse(this.body)); } catch (e) { return Promise.reject(e); } };
  }

  const stores = new Map();
  const caches = {
    open(name) {
      calls.cacheOpens.push(name);
      trace.push('cache-open:' + name);
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return Promise.resolve({
        match(request) { return Promise.resolve(store.get(String(request && request.url ? request.url : request)) || undefined); },
        put(request, response) { store.set(String(request && request.url ? request.url : request), response); return Promise.resolve(); }
      });
    }
  };

  const sandbox = {
    console,
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); timers.add(t); return t; },
    clearTimeout: (t) => { timers.delete(t); return clearTimeout(t); },
    location: { host: 'fiezel.my.id', origin: 'https://fiezel.my.id' },
    Request: FakeRequest,
    Response: FakeResponse,
    caches,
    FIEZEL_CF_CONFIG: {
      enabled: true,
      base: CF_BASE,
      audioBase: AUDIO_BASE,
      endpoints: { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: opts.flag === 'on' ? 'on' : 'off', usage: 'off' }
    },
    fetch(url, init) {
      calls.fetches.push(String(url));
      trace.push('fetch:' + String(url));
      let body = null;
      try { body = JSON.parse((init && init.body) || 'null'); } catch (_) { body = '<unparseable>'; }
      calls.bodies.push(body);
      if (opts.renderThrows) return Promise.reject(new Error('network_down'));
      const status = opts.renderStatus == null ? 200 : opts.renderStatus;
      const payload = opts.renderPayload || {
        schema: 'fiezel-tts-response-v2', audioKey: 'a'.repeat(64), url: R2_URL,
        source: 'cache', degraded: false, quotaCharged: false
      };
      return Promise.resolve({ status, json: () => Promise.resolve(payload) });
    },
    FiezelAudioResolver: opts.noResolver ? undefined : {
      resolve() {
        trace.push('resolver.resolve');
        return Promise.resolve(opts.assetReady ? { state: 'READY', url: AUDIO_BASE + '/a/manifest-hit.mp3' } : { state: 'MISS' });
      },
      playUrl(url) {
        trace.push('playUrl:' + url);
        calls.played.push(String(url));
        return Promise.resolve(opts.assetPlays === false ? false : true);
      },
      prefetch() { trace.push('resolver.prefetch'); return Promise.resolve(!!opts.assetReady); },
      stop() {},
      status() { return { manifest: { loaded: true, assetCount: 1170 } }; }
    },
    FiezelPuterVoice: {
      speak() { calls.puter++; trace.push('puter.speak'); return Promise.reject(new Error('puter_offline')); },
      prefetch() { calls.puter++; trace.push('puter.prefetch'); return Promise.resolve(false); },
      stop() {},
      creditStatus() { return { outOfCredit: false }; }
    },
    FiezelVoiceRuntime: {
      status() { return { prepared: !!opts.prepared, ready: !!opts.prepared }; },
      speak() { calls.runtime++; trace.push('runtime.speak'); return Promise.reject(new Error('neural_failed')); },
      prefetch() { calls.runtime++; trace.push('runtime.prefetch'); return Promise.resolve(false); },
      // Dipanggilnya SATU KALI saja sudah cukup untuk menggagalkan gerbang: itu artinya jalur
      // spekulatif bisa memulai unduhan model 152 MB tanpa persetujuan murid.
      prepare() { calls.prepare++; return Promise.reject(new Error('prepare_must_never_be_called')); },
      ensureReady() { calls.ensureReady++; return Promise.reject(new Error('ensureReady_must_never_be_called')); },
      stop() {}
    },
    speechSynthesis: {
      speak(utterance) {
        calls.synth++;
        trace.push('speechSynthesis.speak');
        setTimeout(() => { utterance.onstart && utterance.onstart(); utterance.onend && utterance.onend(); }, 0);
      },
      cancel() {}
    },
    SpeechSynthesisUtterance: function (text) { this.text = text; this.lang = ''; this.rate = 1; },
    FiezelCfVoiceNotice: {
      emit(copyKey, detail) {
        const built = notice.build(copyKey, detail || {});
        calls.notices.push(built);
        trace.push('notice:' + built.resolvedKey + (built.spoken ? ':spoken' : ':silent'));
        return built;
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(TRANSPORT, sandbox, { timeout: 5000, filename: TRANSPORT_PATH });
  vm.runInContext(SAY, sandbox, { timeout: 5000, filename: SAY_PATH });

  const api = sandbox.FiezelVoiceSay;
  const transport = sandbox.FiezelCfTtsTransport;
  const warm = opts.warmClientCache
    ? transport.remember({ text: 'Good morning.', locale: 'en-US', contentType: 'sentence' }, R2_URL)
      .then(() => { calls.cacheOpens.length = 0; trace.length = 0; })
    : Promise.resolve();

  return {
    api, transport, trace, calls, sandbox, ready: warm,
    cfFetches: () => calls.fetches.filter((u) => u.indexOf(CF_BASE) === 0),
    done: () => timers.forEach(clearTimeout)
  };
}

const idx = (trace, needle) => trace.findIndex((entry) => entry.indexOf(needle) === 0);

/* ------------------------------------------------------------------ (a) flag off -------- */

(async function gate() {
  // Aset ada: L1 menang, dan tidak ada satu pun sentuhan ke Cloudflare.
  const offHit = harness({ flag: 'off', assetReady: true });
  const offHitSpoke = await offHit.api.say('Good morning.', { locale: 'en-US', speed: 1.25 });
  check('(a) flag off: aset R2 tetap menang dan NOL permintaan ke Cloudflare',
    offHitSpoke === true && offHit.cfFetches().length === 0 && offHit.calls.cacheOpens.length === 0,
    `say()=${offHitSpoke} fetchCF=${offHit.cfFetches().length} cacheOpen=${JSON.stringify(offHit.calls.cacheOpens)}`);
  check('(a) flag off: status() melaporkan jalur CF mati, jadi mode bisa didiagnosis',
    offHit.api.status().cfVoiceEnabled === false && offHit.api.status().cfVoiceMode === 'off',
    JSON.stringify({ enabled: offHit.api.status().cfVoiceEnabled, mode: offHit.api.status().cfVoiceMode }));
  offHit.done();

  // Aset TIDAK ada, Puter gagal, mesin neural belum prepared: tangga hari ini harus berakhir
  // di speechSynthesis, urutannya persis seperti sebelum S6.
  const offMiss = harness({ flag: 'off', prepared: false });
  const offMissSpoke = await offMiss.api.say('Good morning.', { locale: 'en-US' });
  check('(a) flag off: tangga hari ini utuh — aset → Puter → speechSynthesis, tanpa sisipan',
    offMissSpoke === true && offMiss.cfFetches().length === 0
    && idx(offMiss.trace, 'resolver.resolve') === 0
    && idx(offMiss.trace, 'puter.speak') === 1
    && idx(offMiss.trace, 'speechSynthesis.speak') === 2
    && offMiss.calls.prepare === 0 && offMiss.calls.ensureReady === 0,
    JSON.stringify(offMiss.trace));
  check('(a) flag off: prefetch juga tidak menyentuh Cloudflare',
    (await offMiss.api.prefetch('Next sentence.', { locale: 'en-US' }), offMiss.cfFetches().length === 0),
    `fetchCF=${JSON.stringify(offMiss.cfFetches())}`);
  offMiss.done();

  /* ---------------------------------------------------------------- (b) urutan ----------- */

  const on = harness({ flag: 'on', prepared: false, renderStatus: 500, renderPayload: { error: 'provider_error' } });
  const onSpoke = await on.api.say('Good morning.', { locale: 'en-US' });
  const iCache = idx(on.trace, 'cache-open');
  const iAsset = idx(on.trace, 'resolver.resolve');
  const iRender = idx(on.trace, 'fetch:');
  const iPuter = idx(on.trace, 'puter.speak');
  const iSynth = idx(on.trace, 'speechSynthesis.speak');
  check('(b) flag on: urutan tangga = cache klien → aset R2 → /api/tts/render → Puter → speechSynthesis',
    onSpoke === true && iCache === 0 && iAsset > iCache && iRender > iAsset && iPuter > iRender && iSynth > iPuter,
    JSON.stringify(on.trace));
  check('(b) flag on: sisipan tepat di /api/tts/render pada basis CF, satu permintaan saja',
    on.cfFetches().length === 1 && on.cfFetches()[0] === CF_BASE + '/api/tts/render',
    JSON.stringify(on.cfFetches()));
  check('(b) flag on: aset R2 yang SUDAH ada tidak pernah memanggil render (yang gratis tetap gratis)',
    await (async () => {
      const h = harness({ flag: 'on', assetReady: true });
      const spoke = await h.api.say('Good morning.', { locale: 'en-US' });
      const clean = spoke === true && h.cfFetches().length === 0;
      h.done();
      return clean;
    })(),
    'render hanya untuk kalimat yang belum punya aset');
  on.done();

  /* ---------------------------------------------------------------- (c) (d) badan -------- */

  const body = harness({ flag: 'on', prepared: false, renderStatus: 500, renderPayload: {} });
  // Sengaja disodorkan barang selundupan: kunci cache DAN parameter pemutaran.
  await body.api.say('Good morning.', {
    locale: 'en-US', speed: 1.25, rate: 0.86, pitch: 2, volume: 0.5,
    audioKey: 'f'.repeat(64), cacheKey: 'nope', objectName: 'nope.mp3',
    settings: { bitRate: 64, container: 'mp3', speed: 1.25, playbackRate: 2 }
  });
  const sent = body.calls.bodies[0] || {};
  const sentKeys = Object.keys(sent).sort();
  const forbidden = ['audioKey', 'key', 'cacheKey', 'objectName', 'hash'];
  check('(c) klien tidak pernah mengirim kunci cache — server menghitungnya ulang sendiri',
    forbidden.every((field) => !(field in sent)),
    `badan=${JSON.stringify(sent)}`);
  check('(c) badan permintaan tertutup pada allowlist (field asing tidak menumpang)',
    sentKeys.every((k) => ['text', 'locale', 'contentType', 'voiceId', 'settings'].indexOf(k) !== -1),
    `kunci=${JSON.stringify(sentKeys)}`);
  const flat = JSON.stringify(sent);
  check('(d) speed/rate/playbackRate/pitch/volume TIDAK PERNAH masuk badan render (anti bayar-ulang cf-a5)',
    ['speed', 'rate', 'playbackRate', 'pitch', 'volume', 'gain'].every((field) => flat.indexOf('"' + field + '"') === -1),
    flat);
  check('(d) speed tetap diterapkan di PEMUTARAN, bukan di sintesis',
    /playUrl\([\s\S]{0,200}speed:\s*opts\.speed/.test(SAY),
    'playUrl() menerima speed sebagai playbackRate');
  body.done();

  /* ---------------------------------------------------------------- (e) cache hit --------- */

  const hit = harness({ flag: 'on', renderPayload: { url: R2_URL, source: 'cache', degraded: false, quotaCharged: false } });
  const hitSpoke = await hit.api.say('Good morning.', { locale: 'en-US', speed: 1.25 });
  check('(e) cache hit diputar LANGSUNG dari URL objek R2, bukan lewat jembatan PHP',
    hitSpoke === true && hit.calls.played.indexOf(R2_URL) !== -1
    && hit.calls.played.every((u) => u.indexOf(AUDIO_BASE) === 0 && u.indexOf('.php') === -1 && u.indexOf('/api/') === -1)
    && hit.calls.puter === 0,
    JSON.stringify(hit.calls.played));
  hit.done();

  const bridge = harness({ flag: 'on', prepared: false, renderPayload: { url: BRIDGE_URL, source: 'cache' } });
  const bridgeSpoke = await bridge.api.say('Good morning.', { locale: 'en-US' });
  check('(e) URL jembatan/origin DITOLAK, dan tangga turun alih-alih memutarnya',
    bridge.calls.played.every((u) => u.indexOf('.php') === -1 && u.indexOf('/api/') === -1)
    && bridgeSpoke === true && bridge.calls.puter === 1,
    `diputar=${JSON.stringify(bridge.calls.played)} say()=${bridgeSpoke}`);
  bridge.done();

  // C0: alamat yang sudah diingat berarti nol permintaan render sama sekali.
  const warm = harness({ flag: 'on', warmClientCache: true });
  await warm.ready;
  const warmSpoke = await warm.api.say('Good morning.', { locale: 'en-US', speed: 0.75 });
  check('(e) cache klien (C0) benar-benar gratis: nol permintaan render, audio dari URL R2',
    warmSpoke === true && warm.cfFetches().length === 0 && warm.calls.played[0] === R2_URL,
    `fetchCF=${warm.cfFetches().length} diputar=${JSON.stringify(warm.calls.played)}`);
  warm.done();

  /* ---------------------------------------------------------------- (f) kuota 429 --------- */

  const quota = harness({
    flag: 'on', prepared: false, renderStatus: 429,
    renderPayload: { error: 'quota_exceeded', copyKey: 'quota.tts.exhausted', retryAfter: 3600, resetAt: Date.now() + 3600000 }
  });
  const quotaSpoke = await quota.api.say('Good morning.', { locale: 'en-US' });
  check('(f) 429 jatuh ke lapisan berikutnya — murid TETAP mendengar sesuatu',
    quotaSpoke === true && quota.calls.puter === 1 && quota.calls.synth === 1,
    `say()=${quotaSpoke} puter=${quota.calls.puter} synth=${quota.calls.synth} jejak=${JSON.stringify(quota.trace)}`);
  const shown = quota.calls.notices[0] || {};
  check('(f) 429 memunculkan naskah kuota, dan naskahnya TIDAK mengunci item / tidak menghitung replay',
    shown.resolvedKey === 'quota.tts.exhausted' && shown.locksItem === false
    && shown.countsReplay === false && shown.severity === 'advisory' && shown.spoken === true,
    JSON.stringify(shown));
  const second = await quota.api.say('Another sentence.', { locale: 'en-US' });
  check('(f) sesudah 429, jalur CF tidak dipanggil lagi di sesi ini (satu permintaan, bukan per kalimat)',
    second === true && quota.cfFetches().length === 1 && quota.transport.status().outOfQuota === true,
    `fetchCF=${quota.cfFetches().length} outOfQuota=${quota.transport.status().outOfQuota}`);
  quota.done();

  // Varian JUJUR: tidak ada satu pun lapisan yang bersuara.
  const mute = harness({ flag: 'on', prepared: false, renderStatus: 429, renderPayload: { copyKey: 'quota.tts.exhausted', resetAt: Date.now() } });
  delete mute.sandbox.speechSynthesis;
  delete mute.sandbox.SpeechSynthesisUtterance;
  const muteSpoke = await mute.api.say('Good morning.', { locale: 'en-US' });
  const honest = mute.calls.notices[0] || {};
  check('(f) tanpa suara sama sekali: naskahnya JUJUR (bukan "pakai suara perangkat") dan tetap tidak mengunci',
    muteSpoke === false && honest.spoken === false && honest.locksItem === false
    && /belum bisa dibunyikan|belum punya suara cadangan/.test(String(honest.body))
    && String(honest.body) !== String(notice.build('quota.tts.exhausted', { spoken: true }).body),
    JSON.stringify(honest));
  mute.done();

  /* ---------------------------------------------------------------- (g) prefetch ---------- */

  const pre = harness({ flag: 'on', prepared: false, renderPayload: { url: R2_URL, source: 'cache' } });
  const preOk = await pre.api.prefetch('Next sentence.', { locale: 'en-US', speed: 1.25 });
  check('(g) prefetch ikut memakai jalur CF saat flag on',
    preOk === true && pre.cfFetches().length === 1 && pre.cfFetches()[0] === CF_BASE + '/api/tts/render',
    `prefetch()=${preOk} fetchCF=${JSON.stringify(pre.cfFetches())}`);
  check('(g) prefetch TIDAK memanggil prepare()/ensureReady() — pagar 152 MB utuh',
    pre.calls.prepare === 0 && pre.calls.ensureReady === 0,
    `prepare=${pre.calls.prepare} ensureReady=${pre.calls.ensureReady}`);
  check('(g) prefetch tidak membunyikan apa pun (tanpa pemutaran, tanpa speechSynthesis, tanpa toast)',
    pre.calls.played.length === 0 && pre.calls.synth === 0 && pre.calls.notices.length === 0,
    `diputar=${JSON.stringify(pre.calls.played)} synth=${pre.calls.synth} notice=${pre.calls.notices.length}`);
  const preBody = pre.calls.bodies[0] || {};
  check('(g) prefetch memakai badan permintaan yang sama bersihnya (tanpa kunci, tanpa speed)',
    !('audioKey' in preBody) && JSON.stringify(preBody).indexOf('"speed"') === -1,
    JSON.stringify(preBody));
  pre.done();

  const preWarm = harness({ flag: 'on', warmClientCache: true });
  await preWarm.ready;
  const preWarmOk = await preWarm.api.prefetch('Good morning.', { locale: 'en-US' });
  check('(g) prefetch untuk kalimat yang sudah hangat di C0 tidak mengirim apa pun',
    preWarmOk === true && preWarm.cfFetches().length === 0,
    `prefetch()=${preWarmOk} fetchCF=${preWarm.cfFetches().length}`);
  preWarm.done();

  const prePrepared = harness({ flag: 'on', prepared: true, renderStatus: 500, renderPayload: {} });
  await prePrepared.api.prefetch('Next sentence.', { locale: 'en-US' });
  check('(g) prefetch dengan mesin neural SUDAH prepared tetap tidak menyentuh prepare()/ensureReady()',
    prePrepared.calls.prepare === 0 && prePrepared.calls.ensureReady === 0,
    `prepare=${prePrepared.calls.prepare} ensureReady=${prePrepared.calls.ensureReady}`);
  prePrepared.done();

  /* ---------------------------------------------------------------- penjaga statis -------- */

  check('penjaga: transport CF melarang seluruh keluarga field pemutaran, bukan hanya speed',
    /FORBIDDEN_FIELDS[\s\S]{0,200}playbackRate[\s\S]{0,120}gain/.test(TRANSPORT),
    'daftarnya cermin PLAYBACK_ONLY di tts-key.js');
  check('penjaga: pintu bicara tidak pernah menyusun sendiri badan permintaan CF',
    !/(^|[^A-Za-z_.$])fetch\s*\(/.test(SAY),
    'seluruh pengetahuan jaringan tinggal di fiezel-cf-tts-transport.js');
  check('penjaga: modul baru ikut dimuat malas di grup voice DAN ikut di-precache service worker',
    HTML.includes('src="./features/neural-voice/fiezel-cf-tts-transport.js"')
    && HTML.includes('src="./features/neural-voice/fiezel-cf-voice-notice.js"')
    && SW.includes("'./features/neural-voice/fiezel-cf-tts-transport.js'")
    && SW.includes("'./features/neural-voice/fiezel-cf-voice-notice.js'"),
    'tanpa precache, peluncuran luring akan kehilangan modul suara');
  check('penjaga: transport dimuat SEBELUM pintu bicara',
    HTML.indexOf('fiezel-cf-tts-transport.js') < HTML.indexOf('fiezel-voice-say.js')
    && HTML.indexOf('fiezel-cf-voice-notice.js') < HTML.indexOf('fiezel-voice-say.js'),
    'urutan pemuatan grup voice');
  check('penjaga: naskah punya varian jujur untuk SETIAP keadaan (spoken dan silent berbeda)',
    notice.COPY_KEYS.every((key) => {
      const a = notice.build(key, { spoken: true });
      const b = notice.build(key, { spoken: false });
      return a.body && b.body && a.body !== b.body && a.locksItem === false && b.locksItem === false;
    }),
    notice.COPY_KEYS.join(', '));
  // Berkas yang kontraknya baru selesai diperbaiki: player, prosody, dan mesin neural. S6
  // tidak boleh MEMANGGIL apa pun di dalamnya - penyebutan di komentar tidak dihitung, yang
  // dihitung adalah pemakaian globalnya di kode.
  check('penjaga: lapisan CF tidak memanggil player/prosody/mesin neural sama sekali',
    ['FiezelWebAudioPlayer', 'FiezelProsody', 'FiezelNeuralVoice']
      .every((global) => TRANSPORT.indexOf(global) === -1 && read(NOTICE_PATH).indexOf(global) === -1),
    'kontrak ketiga berkas itu tetap di luar jangkauan lapisan transport');
  // Diperiksa terhadap HEAD, bukan terhadap cabang jauh: gerbang harus tetap bisa dijalankan
  // di klon dangkal (CI) tanpa origin/main. Bila git tidak tersedia, penjaga ini TIDAK
  // berpura-pura lulus dengan alasan yang salah - ia lulus dengan alasan yang disebutkan.
  let dirtyLocked = '';
  let gitAvailable = true;
  try {
    dirtyLocked = require('child_process').execSync(
      'git diff --name-only HEAD -- features/neural-voice/fiezel-web-audio-player.js features/neural-voice/fiezel-prosody.js features/neural-voice/fiezel-neural-voice.js',
      { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (_) { gitAvailable = false; }
  check('penjaga: berkas player/prosody/mesin neural tidak berubah di pohon kerja ini',
    dirtyLocked === '',
    gitAvailable ? dirtyLocked : 'git tidak tersedia; pemeriksaan pohon kerja dilewati');

  process.on('exit', () => {
    const report = {
      status: failed ? 'NOT READY' : 'PASS',
      gate: 'tts-transport-switch',
      sources: [
        'workers/api/tts/route-tts.js', 'workers/api/tts/tts-key.js', 'workers/api/wrangler.toml',
        'reports/exec-e5-ai-tts.md', 'reports/exec-e3-quota.md', 'reports/voice-v5-prefetch.md',
        'reports/roll-s6-tts.md'
      ],
      // Kejujuran sumber: dua berkas yang diminta brief TIDAK ADA di cabang ini.
      missingSources: ['reports/cf-b4-ai-tts.md', 'reports/cf-b8-ux-quota.md'],
      counts: {
        pass: checks.filter((entry) => entry.status === 'PASS').length,
        fail: checks.filter((entry) => entry.status === 'FAIL').length
      },
      checks
    };
    fs.writeFileSync(path.join(root, 'TTS-TRANSPORT-SWITCH-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log('');
    console.log(`FIEZEL sakelar transport TTS: ${report.status} (${report.counts.pass} pass, ${report.counts.fail} fail)`);
    if (failed) process.exitCode = 1;
  });
}()).catch((error) => {
  check('gerbang selesai tanpa pengecualian', false, error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
