/**
 * A12 — SATU-SATUNYA tempat nama parameter provider TTS dieja.
 *
 * KENAPA BERKAS INI ADA (cacat produksi A12/1, diverifikasi di staging):
 * `route-tts.js` memanggil `env.AI.run(engineId, { text: text })` — hanya `text`. Sementara
 * `tools/prerender-tts.mjs` memanggil model yang sama dengan `{ text, speaker }`. Akibatnya
 * `voiceId` MASUK KUNCI CACHE (`tts-key.js` mem-hash-nya) tetapi TIDAK PERNAH sampai ke provider.
 * Dua konsekuensi yang keduanya terjadi:
 *   1. setiap `POST /api/tts/render` menjawab `source:"unavailable"`, `bytes:0` — 100% gagal;
 *   2. begitu itu diperbaiki dengan nilai bawaan yang BERBEDA dari pra-render, seluruh 604.962
 *      karakter yang sudah dibayar dianggap belum ada dan dibayar untuk kedua kalinya.
 *
 * Karena itu nama parameter dan voice bawaan tidak boleh hidup di dua berkas. Keduanya hidup di
 * SINI, dan `route-tts.js` maupun `tools/prerender-tts.mjs` sama-sama membangun badan permintaan
 * lewat `buildProviderInput()`. Gerbang `tts-provider-contract-test.js` membandingkan hasil kedua
 * jalur secara programatik — bukan dengan dua daftar hardcode yang bisa menyimpang diam-diam.
 *
 * DASAR NAMA PARAMETER (bukan tebakan; sumbernya ada di repo ini):
 *
 *   `@cf/deepgram/aura-1`, `@cf/deepgram/aura-2-en` → `{ text, speaker }`
 *      Bukti langsung: `tools/prerender-tts.mjs:596` memanggil endpoint REST
 *      `/ai/run/<model>` dengan `JSON.stringify({ text, speaker })`, dan itulah jalur yang
 *      BENAR-BENAR memproduksi 273 aset yang hari ini ada di R2 (kalibrasi ukuran cf-a10 §1,
 *      probe 84 karakter di `MODELS[...].probe`). Nilai `speaker` yang dipakai jalur itu adalah
 *      `model.voiceId` = `aura-asteria-en` (aura-1) / `aura-2-thalia-en` (aura-2-en). Klien pun
 *      memakai bawaan yang sama (`features/neural-voice/fiezel-cf-tts-transport.js:69`), dan
 *      catatan S6 (`reports/roll-s6-tts.md:117-119`) menyebut kesamaan nilai itu sebagai
 *      ketergantungan operasional. Jadi `speaker`/`aura-asteria-en` adalah kombinasi yang sudah
 *      terbukti menghasilkan byte, bukan yang paling masuk akal.
 *
 *   `@cf/myshell-ai/melotts` → `{ prompt, lang }`, TANPA parameter suara.
 *      Model ini DITOLAK untuk pra-render (`REJECTED_MODELS`: 3 dari 4 kalimat gagal HTTP 500 dan
 *      keluarannya WAV-base64, bukan MP3), sehingga TIDAK ADA satu pun aset di R2 yang berasal
 *      darinya dan tidak ada bukti byte di repo ini untuk nama parameternya. Ia tetap terdaftar
 *      karena `route-tts.js` memakainya sebagai tier murah begitu jatah gratis aura habis.
 *      `voiceSupported:false` dieja sebagai DATA, bukan komentar, dengan konsekuensinya ditulis
 *      terang: `voiceId` tetap ikut dihash ke kunci cache (identitas aset), tetapi tidak bisa
 *      dikirim ke model yang tidak punya pemilihan suara. Ini keterbatasan yang dilaporkan, bukan
 *      yang disembunyikan — lihat reports/add-a12-tts-fix.md §"belum terbukti tanpa staging".
 *
 * ATURAN PERUBAHAN: mengubah `defaultVoiceId` mana pun = menerbitkan ulang seluruh korpus dengan
 * biaya penuh. Ia hanya boleh berubah bersamaan dengan `engineVersion` dan rencana pra-render.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelTtsProviderParams = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Voice bawaan korpus. Dipaku sebagai konstanta bernama supaya salah ketiknya terlihat. */
  var CORPUS_DEFAULT_VOICE_ID = 'aura-asteria-en';

  var PROVIDER_PARAMS = Object.freeze({
    '@cf/deepgram/aura-1': Object.freeze({
      engineId: '@cf/deepgram/aura-1',
      textParam: 'text',
      voiceParam: 'speaker',
      localeParam: '',
      voiceSupported: true,
      defaultVoiceId: CORPUS_DEFAULT_VOICE_ID,
      evidence: 'tools/prerender-tts.mjs:596 ({text,speaker}) — jalur yang memproduksi aset R2 hari ini'
    }),
    '@cf/deepgram/aura-2-en': Object.freeze({
      engineId: '@cf/deepgram/aura-2-en',
      textParam: 'text',
      voiceParam: 'speaker',
      localeParam: '',
      voiceSupported: true,
      defaultVoiceId: 'aura-2-thalia-en',
      evidence: 'keluarga API yang sama dengan aura-1; dipakai TERARAH untuk RISKY_PHRASES'
    }),
    '@cf/myshell-ai/melotts': Object.freeze({
      engineId: '@cf/myshell-ai/melotts',
      textParam: 'prompt',
      voiceParam: '',
      localeParam: 'lang',
      voiceSupported: false,
      // Bawaan tetap voice korpus supaya KUNCI cache tidak bergeser saat tier murah mengambil
      // alih; nilainya tidak pernah dikirim ke model ini (voiceSupported:false).
      defaultVoiceId: CORPUS_DEFAULT_VOICE_ID,
      evidence: 'DITOLAK di REJECTED_MODELS (500 3/4 + WAV-base64); nol aset R2 ⇒ nol bukti byte di repo'
    })
  });

  function paramsFor(engineId) {
    var key = String(engineId || '');
    var found = PROVIDER_PARAMS[key];
    // Mesin tak dikenal MELEMPAR. Menebak `{text}` untuk mesin baru adalah tepat cacat yang
    // berkas ini ada untuk menutup: ia menghasilkan 200-kosong, bukan galat yang terlihat.
    if (!found) throw new Error('tts_provider_params_unknown: ' + key);
    return found;
  }

  function defaultVoiceIdFor(engineId) {
    return paramsFor(engineId).defaultVoiceId;
  }

  /** `en-US` → `en`. Hanya dipakai mesin yang punya `localeParam`. */
  function langOf(locale) {
    var s = String(locale == null ? '' : locale).trim();
    if (!s) return 'en';
    return s.replace('_', '-').split('-')[0].toLowerCase();
  }

  /**
   * Badan permintaan provider. SATU fungsi untuk runtime (`route-tts.js`) dan pra-render
   * (`tools/prerender-tts.mjs`), sehingga "cocok" bisa dibuktikan dengan membandingkan
   * keluarannya, bukan dengan membaca dua berkas.
   *
   * @param {{engineId:string, text:string, voiceId?:string, locale?:string}} args
   */
  function buildProviderInput(args) {
    var a = args || {};
    var params = paramsFor(a.engineId);
    var text = String(a.text == null ? '' : a.text);
    if (!text) throw new Error('tts_provider_text_required');
    var voiceId = String(a.voiceId == null || a.voiceId === '' ? params.defaultVoiceId : a.voiceId).trim();
    if (!voiceId) throw new Error('tts_provider_voice_required');

    var input = {};
    input[params.textParam] = text;
    if (params.voiceSupported && params.voiceParam) input[params.voiceParam] = voiceId;
    if (params.localeParam) input[params.localeParam] = langOf(a.locale);
    return input;
  }

  return Object.freeze({
    CORPUS_DEFAULT_VOICE_ID: CORPUS_DEFAULT_VOICE_ID,
    PROVIDER_PARAMS: PROVIDER_PARAMS,
    paramsFor: paramsFor,
    defaultVoiceIdFor: defaultVoiceIdFor,
    langOf: langOf,
    buildProviderInput: buildProviderInput
  });
}));
