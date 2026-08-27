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
// Node murni, nol jaringan, nol berkas temporer. Stub Worker dari tools/cf-test-harness.js.
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
    r2: { objects: options.objects || new Map(), writable: true },
    ai: { answers: { [AURA1]: (input) => fakeAudio(input.text), [MELOTTS]: (input) => fakeAudio(input.prompt) } },
    vars: { AUDIO_PUBLIC_BASE: 'https://audio.fiezel.my.id' }
  });
  const quotaCalls = [];
  const deps = Object.assign({
    enforceQuota: async (args) => { quotaCalls.push(args); return { allowed: true }; }
  }, options.deps || {});
  const request = new Request('https://api.fiezel.my.id/api/tts/render', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }
  });
  const response = await RouteTts.handleRender({ request, env: built.env, ctx: built.ctx, deps });
  return { status: response.status, body: await response.json(), ai: built.ai, quotaCalls, r2: built.r2 };
}

(async () => {
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

  /* ==================================================================== laporan =========== */
  const report = {
    schema: 'fiezel-tts-provider-contract-v1',
    pass: !failed,
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    providerInputRoute: sent,
    providerInputPrerender: prerenderBody,
    defaultVoiceId: defaultVoice,
    checks
  };
  fs.writeFileSync(path.join(root, 'TTS-PROVIDER-CONTRACT-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch((error) => {
  console.error('GERBANG MELEDAK:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
