// A12 — GERBANG KONTRAK PROVIDER TTS.
//
// KENAPA GERBANG INI ADA. Cacat produksi yang ditemukan di staging, bukan di review:
// `workers/api/tts/route-tts.js` memanggil `env.AI.run(engineId, { text: text })` — HANYA `text` —
// sementara `tools/prerender-tts.mjs` memanggil model yang sama dengan `{ text, speaker }`.
// `voiceId` masuk kunci cache (`tts-key.js` mem-hash-nya) tetapi TIDAK PERNAH sampai ke provider.
// Hasil uji staging: 100% `POST /api/tts/render` menjawab `source:"unavailable"`, `bytes:0`, dan
// kuota tidak bergerak sama sekali. Bentuk kegagalan itu HIJAU di semua gerbang yang ada: tidak
// ada satu pun yang memeriksa APA yang dikirim ke provider.
//
// Yang dijamin di bawah, dan tidak satu pun bisa lulus dengan membaca dokumen:
//   (a) `voiceId` benar-benar berangkat ke `env.AI.run`, dengan NILAI YANG SAMA dengan yang masuk
//       kunci cache. Nilai berbeda = kunci berbohong tentang bunyi yang tersimpan.
//   (b) Parameter yang dikirim `route-tts.js` COCOK dengan yang dikirim `tools/prerender-tts.mjs`.
//       Perbandingannya PROGRAMATIK: kedua jalur benar-benar dijalankan (yang pra-render dengan
//       `fetch` global distub) lalu badan permintaannya dibandingkan objek-ke-objek. Daftar
//       parameter TIDAK dituliskan dua kali di gerbang ini — menuliskannya dua kali adalah bentuk
//       cacat yang sama, hanya berpindah berkas.
//   (c) Voice bawaan sama di kedua jalur DAN di klien (`fiezel-cf-tts-transport.js`). Bawaan yang
//       berbeda = seluruh korpus 604.962 karakter yang sudah dibayar dianggap belum ada, dan
//       biaya US$9,07 dibayar untuk kedua kalinya.
//   (d) Mesin yang tidak terdaftar MELEMPAR, tidak ditebak menjadi `{text}`.
//   (e) Cache hit R2 tetap NOL kuota dan NOL panggilan provider (invarian cf-b4 §2.4).
//
// ============================================================================================
// S3 — PERLUASAN: FLAG TTS DITEGAKKAN, DAN `quotaCharged` TIDAK BOLEH BOHONG.
// ============================================================================================
// Dua cacat lagi ditemukan dengan MENEMBAK PRODUKSI HIDUP sesudah deploy P3 (28 Agu 2026),
// dan keduanya hijau di seluruh gerbang yang ada sebelum bagian ini:
//
//   CACAT 1 — flag TTS tidak ditegakkan. Dengan `cfTtsEnabled:false` DAN `enabled.tts:false`
//   di KV `cfg:flags`, `POST https://api.fiezel.my.id/api/tts/render` tetap dijawab 200 dan
//   tetap MENJALANKAN jalur render (amplopnya memuat `accountNeuronsReleased`, jadi ia benar-
//   benar memesan lalu melepas neuron akun). Pada saat yang sama `POST /api/ai/task` dijawab
//   403 `ai_disabled` dalam 141 ms dengan nol token. Pagar dipasang di satu jalur berbayar
//   dan tidak di jalur berbayar lainnya.
//
//   CACAT 2 — amplop mengaku menagih jatah yang tidak pernah ditagih:
//     {"text":"hello","voiceId":"aura-asteria-en"} -> 200, source:"unavailable", bytes:0,
//        degraded:true, quotaCharged:TRUE
//     GET /api/quota sebelum & sesudah: ttsChars.used = 0, remaining = 12000 (tidak bergerak).
//
// Yang dijamin bagian S3, dan tidak satu pun bisa lulus dengan membaca kode:
//   (S3-a) flag TTS mati => PENOLAKAN, nol reservasi neuron, nol panggilan model;
//   (S3-b) `quotaCharged` SETIAP jalur cocok dengan apakah buku jatah BENAR-BENAR bergerak.
//          Pembandingnya bukan angka yang diketik dua kali, melainkan kolom `tts_chars_used`
//          di D1 palsu yang dibaca SEBELUM dan SESUDAH tiap permintaan, lewat Worker penuh
//          (jadi `settleQuota()` sungguhan yang memutuskan commit/rollback);
//   (S3-c) render nol byte tidak pernah menagih;
//   (S3-d) cache hit DAN permintaan yang digabungkan (single-flight) tetap nol jatah;
//   (S3-e) amplop penolakan flag TTS berbentuk SAMA dengan penolakan flag AI.
//
// Node murni, nol jaringan, nol berkas temporer. Stub Worker dari tools/cf-test-harness.js;
// Worker penuh dirakit oleh tools/cf-worker-boot.js.
'use strict';

const fs = require('fs');
const path = require('path');
const harness = require('./tools/cf-test-harness.js');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

const TtsKey = require(path.join(root, 'workers/api/tts/tts-key.js'));
const ProviderParams = require(path.join(root, 'workers/api/tts/tts-provider-params.js'));
const RouteTts = require(path.join(root, 'workers/api/tts/route-tts.js'));
const ModelCallGate = require(path.join(root, 'workers/api/ai/model-call-gate.js'));
const Breaker = require(path.join(root, 'workers/api/breaker/breaker.js'));
const boot = require(path.join(root, 'tools/cf-worker-boot.js'));

const AURA1 = '@cf/deepgram/aura-1';
const MELOTTS = '@cf/myshell-ai/melotts';
const TEXT = 'The library opens at eight in the morning.';
const LOCALE = 'en-US';

/** Byte audio palsu >= 512 supaya jalur SUKSES yang diuji, bukan jalur `empty_body`. */
function fakeAudio(seedText) {
  return { audio: Buffer.alloc(4096, 'audio-' + String(seedText).slice(0, 16)).toString('base64') };
}

/**
 * Satu render lewat handler SUNGGUHAN. Mengembalikan badan jawaban + seluruh panggilan AI,
 * sehingga "apa yang dikirim ke provider" bisa di-assert sebagai data, bukan sebagai harapan.
 */
async function render(body, options = {}) {
  const built = harness.makeEnv({
    r2: { objects: options.objects || new Map(), writable: options.r2Writable !== false },
    ai: options.ai || { answers: { [AURA1]: (input) => fakeAudio(input.text), [MELOTTS]: (input) => fakeAudio(input.prompt) } },
    vars: { AUDIO_PUBLIC_BASE: 'https://audio.fiezel.my.id' }
  });
  const quotaCalls = [];
  // S3 - BUKU JATAH PALSU YANG BENAR-BENAR BERGERAK, dan penghitung neuron palsu.
  // `used` hanya berubah kalau penyelesaian memutuskan COMMIT, dan keputusan itu diambil
  // oleh `quotaSettlementFailed()` yang DIIMPOR dari `route-wiring.js` - aturan yang sama
  // yang dipakai produksi. Tanpa itu gerbang ini hanya membandingkan angka yang diketik dua
  // kali, dan cacat yang sedang ditutup justru lolos.
  const ledger = { used: 0, calls: 0, pending: 0, rollbackRequested: false };
  const neurons = { reserved: 0, released: 0 };
  const deps = Object.assign({
    enforceQuota: async (args) => {
      quotaCalls.push(args);
      ledger.calls += 1;
      ledger.pending = Number(args.chars) || 0;
      return { allowed: true };
    },
    rollbackQuota: () => {
      if (!ledger.pending) return false;      // tanpa reservasi, jembatan jujur bilang false
      ledger.rollbackRequested = true;
      return true;
    },
    // S2 - pagar neuron akun WAJIB; tanpa dep ini setiap render dijawab 503 dan seluruh
    // gerbang A12 di atas menguji jalur yang salah (itulah yang terjadi sesudah paket S2:
    // gerbang ini MERAH dan tidak pernah dijalankan ulang oleh paket itu).
    accountBudget: async () => {
      neurons.reserved += 1;
      return ModelCallGate.makeReservation({
        neurons: 1, cap: 8000, usedBefore: 0, day: '2026-08-27',
        release: async () => { neurons.released += 1; return true; }
      });
    }
  }, options.deps || {});
  const request = new Request('https://api.fiezel.my.id/api/tts/render', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }
  });
  const response = await RouteTts.handleRender({ request, env: built.env, ctx: built.ctx, deps });
  const parsed = await response.json();
  if (ledger.pending && SETTLE) {
    const failed = SETTLE(response, parsed, ledger.rollbackRequested);
    if (!failed) ledger.used += ledger.pending;
  }
  return {
    status: response.status, body: parsed, ai: built.ai, quotaCalls, r2: built.r2,
    ledger, neurons, deps, env: built.env, ctx: built.ctx
  };
}

/** Diisi di awal main dari `route-wiring.js` (ESM). Satu aturan penyelesaian, bukan dua. */
let SETTLE = null;

(async () => {
  // Satu aturan penyelesaian jatah, DIIMPOR dari produksi (bukan disalin ke gerbang).
  SETTLE = (await boot.importApiModule('route-wiring.js')).quotaSettlementFailed;
  check('S3-0. aturan penyelesaian jatah diimpor dari route-wiring.js, dan berperilaku sesuai',
    typeof SETTLE === 'function' && SETTLE(null, null, false) === true
    && SETTLE({}, { source: 'unavailable' }, false) === true
    && SETTLE({}, { source: 'provider', degraded: false }, false) === false
    && SETTLE({}, { source: 'provider', degraded: false }, true) === true,
    typeof SETTLE);

  /* ================================================================ (a) voiceId berangkat */
  const run = await render({ text: TEXT, locale: LOCALE, contentType: 'sentence' });
  const aiCalls = run.ai.calls.filter((c) => c.model === AURA1);
  const sent = aiCalls.length ? aiCalls[0].input : null;

  check('render memanggil provider tepat sekali', aiCalls.length === 1, 'panggilan=' + aiCalls.length);
  check('render BERHASIL (bukan source:"unavailable" seperti staging)',
    run.status === 200 && run.body.source === 'provider' && run.body.degraded === false && run.body.bytes > 0,
    `${run.body.source} degraded=${run.body.degraded} bytes=${run.body.bytes}`);

  const voiceParam = ProviderParams.paramsFor(AURA1).voiceParam;
  check('badan permintaan provider MEMUAT parameter suara (cacat A12/1: dulu hanya {text})',
    !!sent && Object.prototype.hasOwnProperty.call(sent, voiceParam),
    JSON.stringify(sent));

  // Kunci cache dihitung ULANG di sini dengan voiceId yang benar-benar dikirim ke provider.
  // Kalau keduanya sama, kunci tidak mungkin berbohong tentang bunyi yang tersimpan.
  const voiceSent = sent ? sent[voiceParam] : '';
  const keyFromSentVoice = TtsKey.build({
    text: TEXT, locale: LOCALE, voiceId: voiceSent, engineId: AURA1,
    engineVersion: RouteTts.ENGINES[AURA1].engineVersion, contentType: 'sentence'
  }).audioKey;
  check('voiceId yang dikirim provider IDENTIK dengan voiceId di kunci cache',
    !!voiceSent && keyFromSentVoice === run.body.audioKey,
    `voice=${voiceSent} key(provider)=${keyFromSentVoice.slice(0, 12)} key(respons)=${String(run.body.audioKey).slice(0, 12)}`);
  check('objek R2 ditulis dengan nama = kunci yang sama',
    run.r2.calls.put.length === 1 && run.r2.calls.put[0] === run.body.audioKey + '.mp3',
    run.r2.calls.put.join(','));

  /* ============================================ (b) route-tts vs prerender, programatik */
  // Jalur pra-render dijalankan SUNGGUHAN dengan `fetch` global distub. Badan yang ditangkap di
  // sini adalah badan yang benar-benar akan berangkat ke Cloudflare pada jalan berbayar.
  const prerender = await import('./tools/prerender-tts.mjs');
  const captured = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    captured.push({ url: String(url), body: JSON.parse(String(init.body)) });
    return {
      ok: true, status: 200,
      async arrayBuffer() { return Buffer.alloc(4096, 'pra-render').buffer; },
      headers: { get: () => '4096' }
    };
  };
  let prerenderBody = null;
  try {
    await prerender.workersAiTts({ accountId: 'akun-uji', token: 'token-uji', speaker: '' }, TEXT, AURA1);
    prerenderBody = captured.length ? captured[0].body : null;
  } finally {
    globalThis.fetch = realFetch;
  }

  const sameKeys = !!sent && !!prerenderBody &&
    JSON.stringify(Object.keys(sent).sort()) === JSON.stringify(Object.keys(prerenderBody).sort());
  check('NAMA parameter identik antara route-tts.js dan tools/prerender-tts.mjs (dibandingkan runtime)',
    sameKeys, `route=${JSON.stringify(Object.keys(sent || {}).sort())} prerender=${JSON.stringify(Object.keys(prerenderBody || {}).sort())}`);
  check('NILAI parameter identik untuk teks yang sama (kunci cache jadi setara di kedua jalur)',
    !!sent && !!prerenderBody && JSON.stringify(sent) === JSON.stringify(prerenderBody),
    `route=${JSON.stringify(sent)} prerender=${JSON.stringify(prerenderBody)}`);
  check('pra-render memakai endpoint /ai/run model yang sama',
    captured.length === 1 && captured[0].url.endsWith('/ai/run/' + AURA1), captured.map((c) => c.url).join(','));

  // Satu registry, bukan dua daftar: kedua modul harus menunjuk OBJEK yang sama.
  check('kedua jalur memakai registry parameter yang sama (satu berkas, bukan dua salinan)',
    RouteTts.PROVIDER_PARAMS === ProviderParams.PROVIDER_PARAMS &&
    prerender.ProviderParams.PROVIDER_PARAMS === ProviderParams.PROVIDER_PARAMS,
    'identitas objek registry');

  /* ====================================================================== (c) voice bawaan */
  const defaultVoice = ProviderParams.defaultVoiceIdFor(AURA1);
  const prerenderVoice = prerender.MODELS[AURA1].voiceId;
  const engineVoice = prerender.ENGINE.voiceId;
  const clientSource = fs.readFileSync(path.join(root, 'features/neural-voice/fiezel-cf-tts-transport.js'), 'utf8');
  const clientVoice = (/var DEFAULT_VOICE_ID = '([^']+)'/.exec(clientSource) || [])[1];
  check('voice bawaan sama di registry, MODELS pra-render, ENGINE pra-render, dan klien',
    defaultVoice === 'aura-asteria-en' && prerenderVoice === defaultVoice &&
    engineVoice === defaultVoice && clientVoice === defaultVoice,
    `registry=${defaultVoice} MODELS=${prerenderVoice} ENGINE=${engineVoice} klien=${clientVoice}`);

  // Permintaan TANPA voiceId harus menghasilkan kunci yang SAMA dengan aset pra-render.
  const prerenderKey = TtsKey.build({
    text: TEXT, locale: prerender.ENGINE.locale, voiceId: prerender.ENGINE.voiceId,
    engineId: prerender.ENGINE.id, engineVersion: prerender.ENGINE.engineVersion,
    settings: prerender.ENGINE.settings
  }).audioKey;
  // Ini uji yang sesungguhnya untuk (c): permintaan runtime TANPA voiceId, dengan setelan korpus,
  // harus mendarat di NAMA OBJEK yang sama dengan aset yang sudah dibayar. Kalau tidak, 604.962
  // karakter dianggap belum ada dan tagihan US$9,07 berjalan untuk kedua kalinya.
  const asCorpus = await render({
    text: TEXT, locale: prerender.ENGINE.locale, settings: prerender.ENGINE.settings,
    engineId: prerender.ENGINE.id, engineVersion: prerender.ENGINE.engineVersion
  });
  check('permintaan tanpa voiceId memakai bawaan korpus, jadi kuncinya = kunci aset pra-render',
    asCorpus.body.audioKey === prerenderKey,
    `runtime=${String(asCorpus.body.audioKey).slice(0, 12)} prerender=${prerenderKey.slice(0, 12)}`);
  check('handler mengisi voiceId bawaan sendiri (permintaan tanpa voiceId TIDAK 400 invalid_input)',
    run.status === 200 && !run.body.error, `${run.status} ${run.body.error || '-'}`);

  /* ============================================== (d) mesin tak dikenal + melotts sebagai data */
  let threw = '';
  try { ProviderParams.buildProviderInput({ engineId: '@cf/model/belum-ada', text: 'x' }); }
  catch (e) { threw = e.message; }
  check('mesin tak terdaftar MELEMPAR (tidak ditebak menjadi {text} yang menghasilkan 200-kosong)',
    /tts_provider_params_unknown/.test(threw), threw);

  const melo = ProviderParams.paramsFor(MELOTTS);
  check('melotts: keterbatasan suaranya DATA, bukan komentar (voiceSupported:false + evidence)',
    melo.voiceSupported === false && melo.textParam === 'prompt' && melo.voiceParam === '' &&
    typeof melo.evidence === 'string' && melo.evidence.length > 20,
    JSON.stringify(melo));

  // Tier murah mengambil alih begitu jatah gratis aura habis; badannya harus memakai nama
  // parameter MILIK melotts, bukan nama milik aura.
  const cheap = await render({ text: TEXT, locale: LOCALE }, { deps: { charsUsedToday: 999999 } });
  const cheapCall = cheap.ai.calls.filter((c) => c.model === MELOTTS)[0];
  check('substitusi tier murah memakai parameter melotts ({prompt,lang}), bukan {text,speaker}',
    !!cheapCall && cheapCall.input.prompt === TEXT && cheapCall.input.lang === 'en' &&
    !('text' in cheapCall.input) && !('speaker' in cheapCall.input),
    JSON.stringify(cheapCall && cheapCall.input));
  check('render tier murah tetap berhasil (turun mutu lebih baik daripada senyap)',
    cheap.body.source === 'provider' && cheap.body.bytes > 0,
    `${cheap.body.source} ${cheap.body.bytes}`);

  /* ================================================================== (e) cache hit = nol */
  const key = run.body.audioKey;
  const preloaded = new Map([[key + '.mp3', { body: 'x'.repeat(4096), size: 4096 }]]);
  const hit = await render({ text: TEXT, locale: LOCALE, contentType: 'sentence' }, { objects: preloaded });
  check('cache hit: source "cache", quotaCharged false',
    hit.body.source === 'cache' && hit.body.quotaCharged === false && hit.body.degraded === false,
    `${hit.body.source} quotaCharged=${hit.body.quotaCharged}`);
  check('cache hit TIDAK memanggil gerbang kuota sama sekali (nol jatah untuk replay)',
    hit.quotaCalls.length === 0, 'panggilan kuota=' + hit.quotaCalls.length);
  check('cache hit TIDAK memanggil provider dan TIDAK menulis R2',
    hit.ai.calls.length === 0 && hit.r2.calls.put.length === 0,
    `ai=${hit.ai.calls.length} put=${hit.r2.calls.put.length}`);
  check('render pertama (miss) MEMANGGIL gerbang kuota — jadi "nol lawan nol" tidak bisa lolos',
    run.quotaCalls.length === 1 && run.quotaCalls[0].chars === TEXT.length,
    `panggilan=${run.quotaCalls.length} chars=${run.quotaCalls[0] && run.quotaCalls[0].chars}`);
  check('setiap amplop TTS memuat quotaCharged bertipe boolean',
    typeof run.body.quotaCharged === 'boolean' && typeof hit.body.quotaCharged === 'boolean' &&
    typeof cheap.body.quotaCharged === 'boolean',
    `${typeof run.body.quotaCharged}/${typeof hit.body.quotaCharged}/${typeof cheap.body.quotaCharged}`);

  /* ==================================================================================== */
  /* S3-a — FLAG TTS MATI: PENOLAKAN, NOL NEURON, NOL MODEL. Lewat Worker PENUH, karena   */
  /*        pagarnya hidup di `route-wiring.js` dan tidak bisa dilihat dari handler.       */
  /* ==================================================================================== */
  const workerMod = await boot.loadWorker();
  const RouteAiMod = await boot.importApiModule('ai/route-ai.js');
  const FeatureGate = await boot.importApiModule('feature-gate.js');

  const RENDER_BODY = {
    text: TEXT, locale: LOCALE, voiceId: 'aura-asteria-en',
    engineId: AURA1, engineVersion: RouteTts.ENGINES[AURA1].engineVersion
  };

  /** Kolom jatah TTS SUNGGUHAN di D1 palsu. Inilah "buku jatah" di seluruh bagian S3. */
  function ttsUsed(booted) {
    const rows = booted.core._rows('quota_daily') || [];
    return rows.reduce((sum, r) => sum + Number(r.tts_chars_used || 0), 0);
  }
  function neuronRows(booted) {
    return (booted.core._rows('ai_account_day') || []).reduce((s, r) => s + Number(r.neurons || 0), 0);
  }

  /** Satu render lewat Worker penuh + buku jatah sebelum/sesudah. */
  async function liveRender(options = {}) {
    const booted = boot.bootWorker(workerMod, options);
    await boot.prepareDb(booted);
    const cookie = await booted.issueIdentity();
    if (typeof options.seed === 'function') await options.seed(booted, cookie);
    const before = ttsUsed(booted);
    const res = await booted.call('POST', '/api/tts/render', { cookie, body: options.body || RENDER_BODY });
    const after = ttsUsed(booted);
    return {
      booted, res, before, after, moved: after - before,
      aiCalls: booted.ai.calls.length, neurons: neuronRows(booted)
    };
  }

  const FLAGS_OFF = JSON.stringify({
    flags: { cfAiEnabled: true, cfTtsEnabled: false },
    enabled: { ai: true, tts: false }
  });

  const flagOff = await liveRender({ kvEntries: { 'cfg:flags': FLAGS_OFF } });
  check('S3-a1. flag TTS mati => DITOLAK 403 tts_disabled (produksi menjawab 200 + render jalan)',
    flagOff.res.status === 403 && flagOff.res.json && flagOff.res.json.error === 'tts_disabled'
    && flagOff.res.json.reason === FeatureGate.TTS_GATE_REASONS.killSwitch,
    flagOff.res.status + ' ' + JSON.stringify(flagOff.res.json && { e: flagOff.res.json.error, r: flagOff.res.json.reason }));
  check('S3-a2. NOL panggilan model dan NOL neuron akun terpesan pada penolakan flag',
    flagOff.aiCalls === 0 && flagOff.neurons === 0,
    'ai=' + flagOff.aiCalls + ' neurons=' + flagOff.neurons);
  check('S3-a3. penolakan flag tidak menyentuh buku jatah murid sama sekali',
    flagOff.moved === 0 && flagOff.res.json.quotaCharged === false && flagOff.res.json.quotaChecked === false,
    'bergerak=' + flagOff.moved + ' charged=' + flagOff.res.json.quotaCharged);
  check('S3-a4. penolakan flag TIDAK menjanjikan retryAfter (menunggu tidak mengubah flag)',
    !('retryAfter' in flagOff.res.json) && !flagOff.res.headers.get('retry-after'),
    JSON.stringify(flagOff.res.json.retryAfter) + ' hdr=' + flagOff.res.headers.get('retry-after'));
  // m025-232: gerbang ini dulu menuntut kata 'perangkat' - stand-in untuk "naskahnya
  // menawarkan sesuatu yang masih bekerja", yang saat itu berarti suara bawaan perangkat.
  // Lapisan itu dihapus, jadi menuntut katanya berarti menuntut janji palsu. Invariannya
  // TIDAK dilonggarkan, hanya dipindah ke hal yang masih benar: teksnya tetap terbaca.
  check('S3-a5. naskahnya JUJUR: bukan bahasa jatah, dan menawarkan jalan yang masih ada',
    flagOff.res.json.message === RouteTts.POLITE.tts_disabled
    && !/jatahmu (habis|penuh)/i.test(flagOff.res.json.message)
    && /teksnya tetap bisa kamu baca/i.test(flagOff.res.json.message)
    && !/perangkat/i.test(flagOff.res.json.message),
    JSON.stringify(flagOff.res.json.message));

  // FEATURE_TTS var mati, dan KV yang TIDAK TERBACA: dua-duanya harus fail-CLOSED.
  const varOff = await liveRender({ vars: { FEATURE_TTS: 'off' } });
  const kvBlank = await liveRender({ kvEntries: null });
  check('S3-a6. FEATURE_TTS != on => ditolak, nol model (var wrangler DITEGAKKAN, bukan dilaporkan)',
    varOff.res.status === 403 && varOff.aiCalls === 0
    && varOff.res.json.reason === FeatureGate.TTS_GATE_REASONS.featureVarOff,
    varOff.res.status + ' ' + (varOff.res.json && varOff.res.json.reason));
  check('S3-a7. flag TIDAK TERBACA => FAIL-CLOSED (flag yang tak terbaca bukan izin)',
    kvBlank.res.status === 403 && kvBlank.aiCalls === 0 && kvBlank.moved === 0,
    kvBlank.res.status + ' ' + (kvBlank.res.json && kvBlank.res.json.reason));

  // Manifest SENGAJA tidak digerbangi: nol biaya. Menutupnya hanya membuat klien tidak bisa
  // tahu suara apa yang ADA saat flag mati, tanpa menghemat sepeser pun.
  const manifestWhileOff = await (async () => {
    const booted = boot.bootWorker(workerMod, { kvEntries: { 'cfg:flags': FLAGS_OFF } });
    await boot.prepareDb(booted);
    return booted.call('GET', '/api/tts/manifest');
  })();
  check('S3-a8. GET /api/tts/manifest tetap 200 saat flag mati (katalog nol biaya, nol model)',
    manifestWhileOff.status === 200, String(manifestWhileOff.status));

  /* ==================================================================================== */
  /* S3-e — BENTUK AMPLOP PENOLAKAN FLAG TTS = BENTUK PENOLAKAN FLAG AI.                   */
  /* ==================================================================================== */
  const aiDenied = await (async () => {
    const booted = boot.bootWorker(workerMod, {
      kvEntries: { 'cfg:flags': JSON.stringify({ flags: { cfAiEnabled: false }, enabled: { ai: false, tts: true } }) }
    });
    await boot.prepareDb(booted);
    const cookie = await booted.issueIdentity();
    return booted.call('POST', '/api/ai/task', {
      cookie,
      body: { schema: 'fiezel-ai-task-v2', task: 'tutor_turn', input: { question: 'Apa beda "in" dan "on"?', surface: 'ask', level: 'A2' } }
    });
  })();
  const SHAPE = ['error', 'copyKey', 'reason', 'message', 'quotaChecked', 'quotaCharged', 'source', 'degraded'];
  const shapeMissing = SHAPE.filter((k) => !(k in (flagOff.res.json || {})) || !(k in (aiDenied.json || {})));
  check('S3-e1. penolakan flag AI dan TTS memuat SET FIELD yang sama',
    shapeMissing.length === 0, 'hilang=' + JSON.stringify(shapeMissing));
  check('S3-e2. keduanya 403, degraded, source unavailable, quotaChecked/Charged false',
    aiDenied.status === 403 && flagOff.res.status === 403
    && flagOff.res.json.source === 'unavailable' && aiDenied.json.source === 'unavailable'
    && flagOff.res.json.degraded === true && aiDenied.json.degraded === true
    && flagOff.res.json.quotaCharged === false && aiDenied.json.quotaCharged === false,
    'tts=' + flagOff.res.status + ' ai=' + aiDenied.status);
  check('S3-e3. keduanya memakai pola copyKey "<fitur>.disabled" dan error "<fitur>_disabled"',
    flagOff.res.json.copyKey === 'tts.disabled' && flagOff.res.json.error === 'tts_disabled'
    && aiDenied.json.copyKey === 'ai.disabled' && aiDenied.json.error === 'ai_disabled',
    flagOff.res.json.copyKey + ' / ' + aiDenied.json.copyKey);
  check('S3-e4. keduanya lahir dari SATU mesin keputusan (PAID_FEATURES), bukan dua salinan',
    FeatureGate.ttsAllowedFrom({ FEATURE_TTS: 'on' }, { ok: true, flags: { cfTtsEnabled: true }, enabled: { tts: true } }).allowed === true
    && FeatureGate.ttsAllowedFrom({ FEATURE_TTS: 'on' }, { ok: false, flags: {}, enabled: {} }).allowed === false
    && FeatureGate.aiAllowedFrom({ FEATURE_AI: 'on' }, { ok: true, flags: { cfAiEnabled: true }, enabled: { ai: true } }).allowed === true
    && Object.keys(FeatureGate.PAID_FEATURES).sort().join(',') === 'ai,tts',
    Object.keys(FeatureGate.PAID_FEATURES || {}).join(','));
  void RouteAiMod;

  /* ==================================================================================== */
  /* S3-b/c — `quotaCharged` LAWAN BUKU JATAH SUNGGUHAN, SETIAP JALUR. Pembandingnya      */
  /*          kolom `tts_chars_used` di D1, dibaca sebelum & sesudah tiap permintaan.      */
  /* ==================================================================================== */
  const CHARS = TEXT.length;
  const paths = [];

  // 1. SUKSES: audio nyata, tersimpan.
  paths.push(['sukses (audio nyata, tersimpan)', await liveRender({}), { expectAudio: true }]);

  // 2. CACHE HIT: objek sudah ada di R2.
  const successKey = paths[0][1].res.json.audioKey;
  paths.push(['cache hit R2', await liveRender({
    objects: new Map([[successKey + '.mp3', { body: 'x'.repeat(4096), size: 4096 }]])
  }), { expectAudio: true }]);

  // 3. PROVIDER MELEMPAR.
  paths.push(['provider melempar 5xx', await liveRender({
    onRun: async () => { const e = new Error('provider menolak'); e.status = 500; throw e; }
  }), { expectAudio: false }]);

  // 4. NOL BYTE / source:"unavailable" — INI amplop yang bohong di produksi.
  paths.push(['provider mengembalikan nol byte', await liveRender({
    onRun: async () => ({ audio: '' })
  }), { expectAudio: false }]);

  // 5. TIMEOUT: mesin sudah bekerja (neuron TIDAK dilepas), tetapi murid tidak menerima
  //    satu byte audio pun, jadi jatahnya tetap tidak boleh ditagih.
  paths.push(['timeout provider', await liveRender({
    onRun: async () => { const e = new Error('provider_timeout'); e.fiezelTimeout = true; throw e; }
  }), { expectAudio: false }]);

  // 6. R2 GAGAL MENULIS: audio nyata sampai ke murid, tetapi tidak dicatat ready.
  paths.push(['R2 gagal menulis stored:false', await liveRender({ r2Writable: false }), { expectAudio: true }]);

  // 7. JATAH MURID HABIS. Bukan lewat env var (plafon TTS datang dari `quota-config.js`,
  //    bukan dari `TTS_CHARS_PER_DAY` - dicoba dan ternyata var itu TIDAK mengikat jalur
  //    reserve), melainkan dengan mendorong buku jatah murid ini ke plafon: satu render
  //    sungguhan membuat barisnya, lalu barisnya diisi sampai penuh.
  paths.push(['jatah murid habis', await liveRender({
    seed: async (booted, cookie) => {
      await booted.call('POST', '/api/tts/render', {
        cookie, body: Object.assign({}, RENDER_BODY, { text: 'Seed row for the quota book.' })
      });
      await booted.core.prepare('UPDATE quota_daily SET tts_chars_used = 999999').run();
    }
  }), { expectAudio: false }]);

  // 8. PLAFON NEURON AKUN HABIS.
  paths.push(['plafon neuron akun habis', await liveRender({ neuronCap: '1' }), { expectAudio: false }]);

  // 9. PENOLAKAN FLAG.
  paths.push(['penolakan flag TTS', flagOff, { expectAudio: false }]);

  const ledgerRows = [];
  let ledgerLies = 0;
  let chargedWithoutAudio = 0;
  for (const [name, out, meta] of paths) {
    const rowBody = out.res.json || {};
    const claimed = rowBody.quotaCharged === true;
    const moved = out.moved > 0;
    const audio = Number(rowBody.bytes || 0) > 0;
    if (claimed !== moved) ledgerLies += 1;
    if (claimed && !audio) chargedWithoutAudio += 1;
    ledgerRows.push({
      path: name, status: out.res.status, source: rowBody.source, bytes: Number(rowBody.bytes || 0),
      quotaCharged: rowBody.quotaCharged, bookMoved: out.moved, audio, expectedAudio: meta.expectAudio
    });
  }

  check('S3-b1. quotaCharged SETIAP jalur cocok dengan gerakan `tts_chars_used` di D1',
    ledgerLies === 0, JSON.stringify(ledgerRows));
  check('S3-c1. tidak ada jalur yang menagih tanpa menghasilkan audio (nol byte = nol tagihan)',
    chargedWithoutAudio === 0, JSON.stringify(ledgerRows.filter((r) => r.quotaCharged && !r.audio)));
  check('S3-b2. jalur SUKSES benar-benar menagih (jadi "nol lawan nol" tidak bisa lolos)',
    paths[0][1].moved === CHARS && paths[0][1].res.json.quotaCharged === true,
    'bergerak=' + paths[0][1].moved + ' chars=' + CHARS);
  check('S3-b3. matriks ini menguji jalur yang benar-benar berbeda (>=3 bentuk source)',
    new Set(ledgerRows.map((r) => r.source)).size >= 3,
    JSON.stringify(ledgerRows.map((r) => r.source)));
  check('S3-b4. jalur nol byte melaporkan bytes:0 DAN quotaCharged:false (di sinilah produksi bohong)',
    ledgerRows.filter((r) => /nol byte|melempar|timeout/.test(r.path)).length === 3
    && ledgerRows.filter((r) => /nol byte|melempar|timeout/.test(r.path))
      .every((r) => r.bytes === 0 && r.quotaCharged === false),
    JSON.stringify(ledgerRows.filter((r) => /nol byte|melempar|timeout/.test(r.path))));
  check('S3-b5. audio ada/tidak ada sesuai yang dirancang tiap jalur (matriksnya tidak bergeser diam-diam)',
    ledgerRows.every((r) => r.audio === r.expectedAudio),
    JSON.stringify(ledgerRows.map((r) => ({ p: r.path, a: r.audio, e: r.expectedAudio }))));

  // 10. BREAKER TERBUKA. Jalur ini tidak bisa dipaksa lewat Worker penuh tanpa menyentuh
  //     penyimpan breaker sungguhan, jadi diuji di tingkat handler dengan penyimpan palsu
  //     yang SELALU OPEN - buku jatah palsu di `render()` ikut dibandingkan.
  const breakerOpen = await render({ text: TEXT, locale: LOCALE, contentType: 'sentence' }, {
    deps: {
      breakerStore: {
        load: async (target, now) => Object.assign(Breaker.initialState(now), {
          state: 'OPEN', openings: 1, openedAt: Number(now), openedUntil: Number(now) + 60000
        }),
        save: async () => true
      }
    }
  });
  check('S3-b6. breaker TERBUKA: nol jatah tertagih, nol byte, nol panggilan provider',
    breakerOpen.body.quotaCharged === false && breakerOpen.ledger.used === 0
    && Number(breakerOpen.body.bytes || 0) === 0 && breakerOpen.ledger.calls === 0
    && breakerOpen.body.source === 'unavailable',
    JSON.stringify({ charged: breakerOpen.body.quotaCharged, used: breakerOpen.ledger.used, bytes: breakerOpen.body.bytes, kuota: breakerOpen.ledger.calls }));
  check('S3-b7. breaker terbuka BOLEH menjanjikan retryAfter (menunggu memang membukanya)',
    Number(breakerOpen.body.retryAfter || 0) > 0 && breakerOpen.body.breaker === 'OPEN',
    'retryAfter=' + breakerOpen.body.retryAfter + ' phase=' + breakerOpen.body.breaker);

  /* ==================================================================================== */
  /* S3-d — CACHE HIT DAN PERMINTAAN YANG DIGABUNGKAN: NOL JATAH.                          */
  /* ==================================================================================== */
  check('S3-d1. cache hit lewat Worker penuh: nol gerakan buku jatah, nol model',
    paths[1][1].moved === 0 && paths[1][1].res.json.quotaCharged === false
    && paths[1][1].res.json.source === 'cache' && paths[1][1].aiCalls === 0,
    'bergerak=' + paths[1][1].moved + ' ai=' + paths[1][1].aiCalls);

  // Single-flight: dua permintaan bersamaan atas kunci yang SAMA; yang kedua digabungkan.
  // Sebelum S3 penggabungan terjadi SESUDAH gerbang kuota, jadi permintaan kedua MENAGIH
  // untuk audio yang tidak pernah ia minta dibuat.
  const slowEnv = harness.makeEnv({
    r2: { objects: new Map(), writable: true },
    ai: { answers: { [AURA1]: async (input) => { await new Promise((r) => setTimeout(r, 30)); return fakeAudio(input.text); } } },
    vars: { AUDIO_PUBLIC_BASE: 'https://audio.fiezel.my.id' }
  });
  const coalesceQuota = [];
  const coalesceNeurons = { reserved: 0 };
  const coalesceDeps = {
    enforceQuota: async (args) => { coalesceQuota.push(args); return { allowed: true }; },
    rollbackQuota: () => true,
    accountBudget: async () => {
      coalesceNeurons.reserved += 1;
      return ModelCallGate.makeReservation({
        neurons: 1, cap: 8000, usedBefore: 0, day: '2026-08-27', release: async () => true
      });
    }
  };
  const makeReq = () => new Request('https://api.fiezel.my.id/api/tts/render', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: TEXT, locale: LOCALE, contentType: 'sentence' })
  });
  const [lead, joined] = await Promise.all([
    RouteTts.handleRender({ request: makeReq(), env: slowEnv.env, ctx: slowEnv.ctx, deps: coalesceDeps }),
    (async () => {
      await new Promise((r) => setTimeout(r, 8));
      return RouteTts.handleRender({ request: makeReq(), env: slowEnv.env, ctx: slowEnv.ctx, deps: coalesceDeps });
    })()
  ]);
  const leadBody = await lead.json();
  const joinedBody = await joined.json();
  check('S3-d2. permintaan yang DIGABUNGKAN tidak memanggil gerbang kuota sama sekali',
    coalesceQuota.length === 1 && joinedBody.coalesced === true,
    'panggilan kuota=' + coalesceQuota.length + ' coalesced=' + joinedBody.coalesced);
  check('S3-d3. yang digabungkan melaporkan quotaCharged:false (tidak mewarisi milik pemimpin)',
    joinedBody.quotaCharged === false && joinedBody.quotaChecked === false && leadBody.quotaCharged === true,
    'joined=' + joinedBody.quotaCharged + ' lead=' + leadBody.quotaCharged);
  check('S3-d4. yang digabungkan TIDAK memesan neuron akun kedua',
    coalesceNeurons.reserved === 1, 'reservasi neuron=' + coalesceNeurons.reserved);
  check('S3-d5. keduanya menunjuk aset yang sama, dan yang digabungkan tidak mengaku memesan neuron',
    joinedBody.audioKey === leadBody.audioKey && joinedBody.accountNeuronsReserved === false,
    (joinedBody.audioKey === leadBody.audioKey ? 'kunci sama' : 'KUNCI BEDA') + ' reserved=' + joinedBody.accountNeuronsReserved);

  /* ==================================================================================== */
  /* S3-f/g — `accountNeuronsReleased` dan `bytes` juga harus mencerminkan kenyataan.       */
  /* ==================================================================================== */
  const throwing = await render({ text: TEXT, locale: LOCALE, contentType: 'sentence' }, {
    ai: { answers: { [AURA1]: () => { const e = new Error('gagal'); e.status = 500; throw e; } } }
  });
  check('S3-f1. accountNeuronsReleased:true HANYA kalau release palsu benar-benar dipanggil',
    throwing.body.accountNeuronsReleased === true && throwing.neurons.released === 1,
    'amplop=' + throwing.body.accountNeuronsReleased + ' release nyata=' + throwing.neurons.released);
  const timedOut = await render({ text: TEXT, locale: LOCALE, contentType: 'sentence' }, {
    ai: { answers: { [AURA1]: () => { const e = new Error('provider_timeout'); e.fiezelTimeout = true; throw e; } } }
  });
  check('S3-f2. TIMEOUT: amplop mengaku TIDAK melepas, dan memang tidak melepas (mesin sudah bekerja)',
    timedOut.body.accountNeuronsReleased === false && timedOut.neurons.released === 0,
    'amplop=' + timedOut.body.accountNeuronsReleased + ' release nyata=' + timedOut.neurons.released);
  check('S3-f3. amplop pasca-reservasi mengaku memesan neuron, dan itu benar',
    throwing.body.accountNeuronsReserved === true && throwing.neurons.reserved === 1
    && run.body.accountNeuronsReserved === true && run.neurons.reserved === 1,
    JSON.stringify({ gagal: throwing.body.accountNeuronsReserved, sukses: run.body.accountNeuronsReserved }));
  check('S3-f4. amplop PRA-reservasi (cache hit) tidak mengaku memesan/melepas neuron apa pun',
    hit.body.accountNeuronsReserved === false && hit.body.accountNeuronsReleased === false
    && hit.neurons.reserved === 0,
    JSON.stringify({ r: hit.body.accountNeuronsReserved, l: hit.body.accountNeuronsReleased }));

  // `bytes` = byte NYATA. Sebelum S3 nilainya ditaksir `length * 0.75` DAN teks base64-nya
  // yang ditulis ke R2, jadi cache hit atas objek yang sama melaporkan angka berbeda.
  check('S3-g1. bytes = byte audio SUNGGUHAN sesudah base64 dibongkar (bukan taksiran 0,75x)',
    run.body.bytes === 4096, 'dilaporkan=' + run.body.bytes + ' seharusnya=4096');
  const storedObject = run.r2.objects.get(run.body.audioKey + '.mp3');
  const storedSize = storedObject
    ? Number(storedObject.size || (storedObject.body && storedObject.body.length) || 0) : 0;
  check('S3-g2. yang DITULIS ke R2 berukuran sama dengan yang DILAPORKAN (bukan teks base64)',
    storedSize === run.body.bytes, 'r2=' + storedSize + ' amplop=' + run.body.bytes);
  const replay = await render({ text: TEXT, locale: LOCALE, contentType: 'sentence' }, { objects: run.r2.objects });
  check('S3-g3. cache hit atas aset yang sama melaporkan bytes yang SAMA dengan rendernya',
    replay.body.source === 'cache' && replay.body.bytes === run.body.bytes,
    'render=' + run.body.bytes + ' cache=' + replay.body.bytes);

  /* ==================================================================== laporan =========== */
  const report = {
    schema: 'fiezel-tts-provider-contract-v1',
    pass: !failed,
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    providerInputRoute: sent,
    providerInputPrerender: prerenderBody,
    defaultVoiceId: defaultVoice,
    quotaLedgerMatrix: ledgerRows,
    checks
  };
  fs.writeFileSync(path.join(root, 'TTS-PROVIDER-CONTRACT-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch((error) => {
  console.error('GERBANG MELEDAK:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
