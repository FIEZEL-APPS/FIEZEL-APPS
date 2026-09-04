/**
 * E5 — POST /api/tts/render + GET /api/tts/manifest (cf-b4 §2.2-2.4).
 * Ekspor `registerTtsRoutes(router)`; pemasangan sama seperti route-ai.js (lihat notes).
 *
 * URUTAN YANG MENJADI SELURUH ISI BERKAS INI — dan urutannya adalah kontrol biaya, bukan gaya:
 *
 *   1. hitung ULANG audioKey di server            (kunci dari klien tidak dipercaya)
 *   2. HEAD R2                → ADA  ⇒ balas URL  (NOL kuota, NOL neuron, NOL tulis)
 *   3. breaker                → OPEN ⇒ mode hemat (tanpa menyentuh provider)
 *   4. kuota                  → habis ⇒ 429       (SATU-SATUNYA titik kuota diperiksa)
 *   5. single-flight per kunci → dua permintaan serentak = satu produksi
 *   6. provider TTS → PUT idempoten ke R2 → catat event server-side
 *
 * Kenapa langkah 1 tidak boleh dihapus walau klien sudah mengirim kunci: kunci yang dipercaya
 * adalah kunci yang bisa dikarang. Satu klien nakal bisa mengirim kunci acak untuk teks yang
 * sudah ada di R2 dan memaksa produksi ulang berbayar berkali-kali, atau sebaliknya menuliskan
 * teks lain ke atas nama kunci milik kalimat sah. Kunci yang dihitung server dari input mustahil
 * dipakai untuk keduanya.
 *
 * Kenapa langkah 2 mendahului langkah 4 (`cf-b4 §2.4`, dinaikkan menjadi invarian sistem):
 * replay item listening adalah pedagogi (maxReplays 2), bukan biaya. Aset yang sudah dibayar
 * sekali tidak boleh memakan jatah harian murid setiap kali diputar.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelRouteTts = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TtsKey = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./tts-key.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelTtsKey;
  }());

  var Breaker = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('../breaker/breaker.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelBreaker;
  }());

  /**
   * A12/1 — nama parameter provider dan voice bawaan TIDAK lagi dieja di berkas ini. Keduanya
   * datang dari `tts-provider-params.js`, berkas yang SAMA yang dipakai `tools/prerender-tts.mjs`.
   * Sebelum A12, baris `env.AI.run(engineId, { text: text })` membuang `voiceId` yang sudah masuk
   * kunci cache: 100% render menjawab `source:"unavailable"`, `bytes:0`, dan kuota tidak bergerak.
   */
  var ProviderParams = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./tts-provider-params.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelTtsProviderParams;
  }());

  /**
   * S2 - SATU-SATUNYA PINTU KE MODEL, sama seperti `route-ai.js`. Berkas ini dulu
   * memanggil `env.AI.run(engineId, ...)` LANGSUNG dan TIDAK punya pagar neuron akun
   * sama sekali - padahal mesin TTS-nya (`@cf/deepgram/aura-1`, `@cf/myshell-ai/melotts`)
   * berjalan di binding Workers AI yang SAMA dan menghabiskan kolam 10.000 neuron/hari
   * yang sama. Jadi jalur ini adalah lubang yang lebih lebar daripada dep opsional di
   * `route-ai.js`: di sana plafonnya bisa lupa disambung, di sini ia tidak ada.
   */
  var ModelCallGate = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('../ai/model-call-gate.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelModelCallGate;
  }());

  /** Sama alasannya dengan route-ai.js: E5 dan paket kuota harus bisa di-merge dalam urutan apa pun. */
  function resolveEnforceQuota(deps) {
    var d = deps || {};
    if (typeof d.enforceQuota === 'function') return d.enforceQuota;
    var g = typeof globalThis !== 'undefined' ? globalThis : {};
    if (typeof g.FIEZEL_ENFORCE_QUOTA === 'function') return g.FIEZEL_ENFORCE_QUOTA;
    if (typeof require === 'function') {
      try {
        var spec = '../quota/route-' + 'quota.js';
        var mod = require(spec);
        if (mod && typeof mod.enforceQuota === 'function') return mod.enforceQuota;
      } catch (_) { /* belum ada di branch ini */ }
    }
    return null;
  }

  var ENGINES = Object.freeze({
    '@cf/deepgram/aura-1': Object.freeze({
      id: '@cf/deepgram/aura-1',
      engineVersion: 'cf-aura-1@v1',
      usdPer1kChars: 0.015,
      // Jatah gratis 10.000 neuron/hari ≈ 7.333 karakter/hari untuk SELURUH akun. Angka itu yang
      // membuat pra-render (tools/prerender-tts.mjs) wajib, bukan opsional.
      freeCharsPerDay: 7333,
      maxChars: 3000
    }),
    '@cf/myshell-ai/melotts': Object.freeze({
      id: '@cf/myshell-ai/melotts',
      engineVersion: 'cf-melotts@v1',
      usdPer1kChars: 0.0002,
      freeCharsPerDay: 500000,
      maxChars: 3000
    })
  });

  var DEFAULT_ENGINE = '@cf/deepgram/aura-1';
  var CHEAP_ENGINE = '@cf/myshell-ai/melotts';
  var TTS_TIMEOUT_MS = 25000; // selaras CALL_TIMEOUT_MS; 35 s dinilai terlalu longgar (cf-a10 §6)
  var MAX_BODY_BYTES = 12000;

  /**
   * AI-19 F05 (patch pendamping ai-tasks.js) + AI-17 F02 — enum TERTUTUP untuk locale TTS,
   * ditegakkan DI ROUTE sebelum nilai apa pun menyentuh TtsKey.build. `locale` ikut di-hash ke
   * kunci cache (tts-key.js, terkunci sha256 — JANGAN disentuh): string bebas dari klien berarti
   * setiap nilai baru = kunci baru = render berbayar baru, dan korpus yang sudah dibayar
   * (1.170 aset ElevenLabs + 604.962 karakter Deepgram) diam-diam yatim. Seluruh korpus dan
   * semua klien hari ini memakai 'en-US' (bahasa TARGET pembelajaran, bukan bahasa UI murid) —
   * locale UI dilarang masuk zona audio (audio-locale-guard-test.js).
   * Nilai kosong TIDAK diisi di sini: default 'en-US' tetap milik tts-key.js (canonicalLocale),
   * supaya tidak ada default kedua yang bisa menyimpang. Nilai di luar enum jatuh ke '' →
   * default yang sama — fail-open ke baseline, konsisten dengan ai-tasks.js.
   */
  var TTS_LOCALES = Object.freeze(['en-US']);

  function canonicalTtsLocale(raw) {
    var v = String(raw == null ? '' : raw).trim().slice(0, 10); // potong dulu, baru cek
    if (!v) return '';
    var parts = v.replace('_', '-').split('-');
    var lang = parts[0].toLowerCase();
    var norm = parts[1] ? lang + '-' + parts[1].toUpperCase() : lang;
    if (TTS_LOCALES.indexOf(norm) >= 0) return norm;
    if (TTS_LOCALES.indexOf(norm + '-US') >= 0) return norm + '-US'; // 'en' → 'en-US'
    return '';
  }

  /**
   * A8 · Naskah murid, satu kanon dengan `features/quota/quota-copy.js`: bahasa sehari-hari,
   * "nggak" bukan "tidak", tanpa nama mesin, tanpa menyalahkan murid. Dijaga
   * `quota-notice-a11y-test.js`.
   */
  var POLITE = Object.freeze({
    bad_json: 'Aku belum paham kirimanmu. Muat ulang halaman lalu coba lagi, ya.',
    invalid_input: 'Teks yang mau dibacakan belum lengkap.',
    key_mismatch: 'Aku belum paham kirimanmu. Muat ulang halaman lalu coba lagi, ya.',
    too_long: 'Kalimatnya kepanjangan untuk sekali dibacakan.',
    quota_exceeded: 'Jatah suara hari ini sudah habis, jadi kalimat ini belum bisa dibunyikan. Teksnya tetap bisa kamu baca, dan jatahnya kembali sesudah tengah malam.',
    // A8 TEMUAN BOHONG (§4 reports/add-a8-a11y.md): sebelum commit ini, penghitung jatah
    // yang MATI dilaporkan ke murid sebagai "jatah suara hari ini sudah habis".
    quota_unavailable: 'Aku belum bisa membaca sisa jatahmu, jadi jatahmu kemungkinan besar masih utuh. Suaranya belum bisa dibunyikan sekarang — teksnya tetap bisa kamu baca, dan kamu boleh coba lagi sebentar lagi, ya.',
    breaker_open: 'Layanan suara sedang istirahat sebentar, jadi kalimat ini belum berbunyi. Teksnya tetap bisa kamu baca. Ini bukan kesalahanmu.',
    unavailable: 'Audio belum tersedia untuk kalimat ini. Teksnya tetap bisa kamu baca.',
    // S2 - jatah neuron AKUN (bukan jatah murid) penuh. Yang WAJIB dikatakan kalimatnya:
    // jatah murid TIDAK dipotong sedikit pun, karena tidak ada satu byte audio yang
    // diproduksi.
    //
    // m025-232: dulu setiap kalimat di peta ini dibuka dengan "Suara dari perangkatmu
    // dulu". Lapisan speechSynthesis peramban sudah DIHAPUS, jadi kalimat itu menjanjikan
    // sesuatu yang tidak bisa terjadi - di bawah L3 tidak ada apa pun yang berbunyi.
    // Pembukaan itu dicabut dari KELIMA kalimat sekaligus, bukan satu per satu, supaya
    // tidak ada satu pun yang tertinggal menjanjikan suara hantu.
    //
    // Penggantinya menjawab pertanyaan murid yang sebenarnya - "lalu aku harus apa?" -
    // dengan hal yang MASIH benar: teksnya tetap bisa dibaca. Gerbang S3-a5 di
    // tts-provider-contract-test.js ikut dipindah ke janji baru itu.
    account_budget: 'Pembuatan suara sedang penuh untuk hari ini, bukan karena jatahmu. Jatahmu nggak berkurang, dan teksnya tetap bisa kamu baca.',
    // S2 - pagar neuron akun BELUM TERPASANG (dep tidak disuntikkan / tanda terima tidak
    // sah). Salah pasang, bukan jatah penuh, dan bukan salah murid.
    account_missing: 'Pembuatan suara belum bisa dipakai karena penyiapan di sisi kami belum lengkap. Jatahmu utuh, dan teksnya tetap bisa kamu baca.',
    // S3 - FLAG TTS MATI. Bukan jatah murid, bukan jatah akun, bukan kesalahan murid, dan
    // bukan soal waktu: pemilik aplikasi belum menyalakan suara premium. Kalimatnya tidak
    // boleh menjanjikan "coba lagi nanti", karena menunggu tidak mengubah apa pun.
    tts_disabled: 'Suara premium sedang kami matikan sementara, bukan karena jatahmu. Jatahmu utuh, dan teksnya tetap bisa kamu baca.',
    body_too_big: 'Kirimanmu kebesaran untuk sekali kirim.'
  });

  /** Single-flight per kunci, per isolate. */
  var inFlight = new Map();

  function json(payload, status, headers) {
    var h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (headers) Object.keys(headers).forEach(function (k) { h[k] = headers[k]; });
    return new Response(JSON.stringify(payload), { status: status || 200, headers: h });
  }

  function assetUrl(env, objectName) {
    var base = String((env && env.AUDIO_PUBLIC_BASE) || '').replace(/\/+$/, '');
    return base ? base + '/a/' + objectName : 'a/' + objectName;
  }

  /**
   * S3 - BAWAAN AMPLOP YANG JUJUR.
   *
   * `quotaChecked`, `quotaCharged`, `accountNeuronsReserved`, dan `accountNeuronsReleased`
   * ada DI BAWAAN, bukan ditambahkan per jalur. Alasannya cacat yang paket ini tutup:
   * jalur yang lupa mengeja field ini dulu menghilangkannya dari kontrak, dan klien
   * membaca `undefined` sebagai "tidak tahu". Bawaan `false` berarti jalur baru yang lupa
   * tetap JUJUR (tidak mengaku menagih, tidak mengaku memesan neuron) alih-alih diam.
   */
  function baseResponse(extra) {
    var out = {
      schema: 'fiezel-tts-response-v2',
      keySchema: TtsKey.SCHEMA,
      audioKey: '',
      objectName: '',
      url: '',
      source: 'unavailable',
      degraded: true,
      breaker: 'CLOSED',
      bytes: 0,
      chars: 0,
      quotaChecked: false,
      quotaCharged: false,
      accountNeuronsReserved: false,
      accountNeuronsReleased: false,
      protocol: '2.0'
    };
    if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  function pickEngine(body, deps) {
    var requested = String((body && body.engineId) || '') || DEFAULT_ENGINE;
    if (!ENGINES[requested]) requested = DEFAULT_ENGINE;
    var used = Number((deps && deps.charsUsedToday) || 0);
    // Begitu jatah gratis harian mesin utama terlampaui, tier murah mengambil alih SEBELUM murid
    // kehilangan suara. Turun mutu itu pilihan yang lebih baik daripada senyap.
    if (used >= ENGINES[requested].freeCharsPerDay && ENGINES[CHEAP_ENGINE]) return ENGINES[CHEAP_ENGINE];
    return ENGINES[requested];
  }

  async function headObject(env, objectName) {
    if (!env || !env.AUDIO) return null;
    try {
      if (typeof env.AUDIO.head === 'function') return await env.AUDIO.head(objectName);
      if (typeof env.AUDIO.get === 'function') {
        var obj = await env.AUDIO.get(objectName);
        return obj ? { size: obj.size || 0, etag: obj.etag || '' } : null;
      }
    } catch (_) { /* R2 yang mati diperlakukan sebagai "belum ada" */ }
    return null;
  }

  /**
   * S3 - BASE64 DIBONGKAR DI SINI, BUKAN DILEWATKAN APA ADANYA.
   *
   * CACAT YANG INI TUTUP (ditemukan paket S3 saat memeriksa apakah `bytes` mencerminkan
   * kenyataan): sebagian mesin menjawab `{audio:"<base64>"}`. Versi lama mengembalikan
   * STRING itu apa adanya, lalu:
   *   1. `byteSize()` melaporkan `length * 0.75` - PERKIRAAN, dan perkiraan yang salah
   *      (base64 berpadding memberi hasil beda dari byte sebenarnya);
   *   2. `env.AUDIO.put(objectName, "<base64>")` menyimpan TEKS base64 ke R2 dengan
   *      `content-type: audio/mpeg`. Objeknya bukan MP3, dan ukurannya = panjang teks.
   * Akibatnya `bytes` pada render (0,75x) dan `bytes` pada cache hit berikutnya
   * (`existing.size` = panjang teks base64) MELAPORKAN DUA ANGKA BERBEDA UNTUK ASET YANG
   * SAMA. Dua-duanya tidak bisa benar.
   *
   * Sesudah ini: base64 dibongkar menjadi byte NYATA sebelum diukur dan sebelum ditulis,
   * jadi `bytes` = `byteLength` yang benar-benar dikirim ke R2, dan cache hit atas objek
   * yang sama melaporkan angka yang sama.
   */
  function decodeBase64(text) {
    var raw = String(text || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    if (!raw) return null;
    try {
      if (typeof atob === 'function') {
        var bin = atob(raw);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
        return out;
      }
      if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        return new Uint8Array(Buffer.from(raw, 'base64'));
      }
    } catch (_) { /* bukan base64 yang sah */ }
    return null;
  }

  function toBytes(result) {
    if (!result) return null;
    if (result instanceof ArrayBuffer) return new Uint8Array(result);
    if (result && result.audio instanceof ArrayBuffer) return new Uint8Array(result.audio);
    if (result && typeof result.audio === 'string') return decodeBase64(result.audio);
    if (result && result.byteLength !== undefined) return result;
    return null;
  }

  function byteSize(payload) {
    if (!payload) return 0;
    if (typeof payload === 'string') return 0; // string tidak pernah dilaporkan sebagai audio (lihat decodeBase64)
    return payload.byteLength || payload.length || 0;
  }

  /* =================================================================== S3: KEJUJURAN JATAH */
  /**
   * S3 - CACAT 2, DAN INI SATU-SATUNYA TEMPAT `quotaCharged` LAHIR DI BERKAS INI.
   *
   * BUKTI CACATNYA (produksi hidup, 28 Agu 2026, dua permintaan berbeda):
   *   {"text":"hello","voiceId":"aura-asteria-en"}                  -> 200, source:"unavailable",
   *      bytes:0, degraded:true, quotaCharged:TRUE
   *   {"text":"the quick brown fox jumps over the lazy dog again"} -> 200, source:"unavailable",
   *      bytes:0, chars:49, quotaCharged:TRUE
   *   GET /api/quota SEBELUM dan SESUDAH keduanya: ttsChars.used = 0, remaining = 12000.
   * Amplopnya mengaku menagih; buku jatah tidak bergerak satu karakter pun.
   *
   * SEBABNYA: `quotaCharged: quotaChecked`. `quotaChecked` hanya berarti "gerbang kuota
   * DIJALANKAN", sedangkan reservasi yang dibuat gerbang itu DIBATALKAN sesudah handler
   * selesai oleh `route-wiring.js:settleQuota()` setiap kali amplopnya `source:'unavailable'`
   * atau `degraded:true`. Jadi dua field itu tidak pernah bersinonim, dan menyamakannya
   * membuat amplop mengaku menagih justru pada jalur yang PASTI dibatalkan.
   *
   * KENAPA PENTING, BUKAN KOSMETIK: klien memakai `quotaCharged` untuk memutakhirkan cermin
   * jatah lokal dan menampilkan sisa jatah ke murid. Amplop yang bohong membuat murid
   * melihat jatahnya terpotong padahal tidak, lalu berhenti memakai fitur yang masih boleh
   * dia pakai.
   *
   * ARAH PERBAIKANNYA: LAPORANNYA, bukan penagihannya. Render nol byte TIDAK BOLEH menagih
   * apa pun - mandat mengikat: kalau harus salah, salah ke arah murid.
   */
  function newQuotaLedger() {
    return { checked: false, rollbackRequested: false };
  }

  /** SATU-SATUNYA sumber nilai `quotaCharged`. Tidak ada jalur yang mengejanya sendiri. */
  function chargedFor(ledger) {
    return ledger.checked === true && ledger.rollbackRequested !== true;
  }

  /**
   * Minta pembatalan reservasi kuota, lalu CATAT permintaan itu supaya amplop tidak bisa
   * mengaku menagih sesudahnya.
   *
   * `rollbackRequested` disetel WALAU jembatan pembatal tidak ada. Itu sengaja: kalau kami
   * tidak yakin reservasinya bertahan, satu-satunya laporan yang aman bagi murid adalah
   * "tidak ditagih". Dan memang begitu kenyataannya di jalur nyata - `settleQuota()`
   * membatalkan setiap amplop yang `providerFailed()`, yaitu tepat jalur-jalur ini.
   */
  async function requestQuotaRollback(deps, ledger, info) {
    if (ledger.checked !== true) return false;
    ledger.rollbackRequested = true;
    var fn = deps && typeof deps.rollbackQuota === 'function' ? deps.rollbackQuota : null;
    if (!fn) return false;
    try {
      var out = await fn(info);
      if (out && typeof out.then === 'function') out = await out;
      return out !== false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Badan permintaan dibangun `ProviderParams.buildProviderInput()`, jadi `voiceId` yang dihash ke
   * kunci cache adalah `voiceId` yang benar-benar diterima provider — di bawah nama parameter yang
   * benar untuk mesin itu (`speaker` untuk keluarga aura). Menuliskannya inline di sini kembali =
   * mengembalikan cacat A12/1.
   */
  async function callEngine(env, engineId, text, voiceId, locale, timeoutMs, reservation) {
    var options = {};
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      options.signal = AbortSignal.timeout(timeoutMs);
    }
    var input = ProviderParams.buildProviderInput({
      engineId: engineId, text: text, voiceId: voiceId, locale: locale
    });
    // S2 - lewat chokepoint, dengan tanda terima reservasi neuron akun. Tanpa tanda
    // terima yang sah ini MELEMPAR dan mesin TTS tidak pernah disentuh.
    var run = ModelCallGate.runReservedModel({
      env: env, modelId: engineId, input: input, options: options, reservation: reservation
    });
    var timer;
    var guard = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        var err = new Error('provider_timeout');
        err.fiezelTimeout = true;
        reject(err);
      }, timeoutMs + 250);
    });
    try { return await Promise.race([run, guard]); } finally { clearTimeout(timer); }
  }

  function signalFromError(error) {
    var e = error || {};
    if (e.fiezelTimeout === true || e.name === 'TimeoutError' || e.name === 'AbortError') return { timeout: true };
    var status = Number(e.status || (e.response && e.response.status) || 0);
    if (status) return { status: status };
    return { networkError: true };
  }

  /**
   * S2 - detik sampai 00:00 UTC. Jatah neuron akun berganti menurut UTC (jam vendor),
   * BUKAN menurut reset jatah murid (Asia/Jakarta). Menjanjikan jam yang salah = janji
   * palsu ke murid, dan murid akan mencoba lagi terlalu awal lalu ditolak lagi.
   */
  function secondsToUtcMidnight(nowMs) {
    var ms = Number(nowMs) || 0;
    var d = new Date(ms);
    var next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
    return Math.max(1, Math.ceil((next - ms) / 1000));
  }

  /**
   * S2 - AMPLOP PENOLAKAN PAGAR NEURON AKUN untuk jalur TTS.
   *
   * 503, bukan 429: 429 adalah bahasa "jatah MURID", dan ini bukan jatah murid. Yang
   * tidak boleh berubah di cabang mana pun: `quotaCharged:false` - jatah suara murid
   * tidak dipotong sedikit pun, karena tidak ada satu byte audio yang diproduksi.
   *
   * m025-232: paragraf ini dulu ditutup dengan "murid tetap punya jalan keluar yang nyata:
   * suara perangkat (`speechSynthesis`)". Jalan keluar itu SUDAH TIDAK ADA - lapisan
   * peramban dihapus dari seluruh aplikasi dan di bawah L3 (neural di perangkat) tidak ada
   * lagi apa pun yang berbunyi. Justru karena itu `quotaCharged:false` makin tidak boleh
   * dilonggarkan: penolakan di sini sekarang berarti murid benar-benar tidak mendengar
   * kalimatnya, jadi yang tersisa untuknya harus utuh - jatahnya penuh, teks dan
   * subtitle-nya tetap terbaca, dan ia boleh mencoba lagi ketika layanan pulih.
   */
  function accountDenied(identity, objectName, chars, phase, reason, started, now, ledger) {
    var capReached = String(reason) === 'ai_account_cap';
    var transient = reason === 'ai_budget_unreadable' || reason === 'ai_budget_store_missing';
    var retryAfter = capReached ? secondsToUtcMidnight(started) : (transient ? 60 : 0);
    var extra = {
      audioKey: identity.audioKey, objectName: objectName, chars: chars,
      source: 'unavailable', degraded: true, breaker: phase,
      error: 'service_degraded',
      copyKey: capReached ? 'tts.accountBudget' : 'tts.unavailable',
      reason: String(reason || 'ai_account_cap'),
      message: capReached ? POLITE.account_budget : POLITE.account_missing,
      // S3 - `quotaChecked` DULU selalu dieja `false` di sini, padahal gerbang kuota murid
      // memang sudah dijalankan sebelum pagar akun (lihat urutan LANGKAH 4 -> 5b). Itu
      // bohong ke arah yang berlawanan dari CACAT 2: mengaku tidak memeriksa padahal
      // memeriksa. Sekarang ia melaporkan keadaan buku jatah yang sebenarnya, sementara
      // `quotaCharged` tetap false KARENA reservasinya dibatalkan - bukan karena dieja.
      quotaChecked: ledger ? ledger.checked === true : false,
      quotaCharged: ledger ? chargedFor(ledger) : false,
      accountNeuronsReserved: false,
      accountNeuronsReleased: false,
      ms: now() - started
    };
    if (retryAfter) extra.retryAfter = retryAfter;
    return json(baseResponse(extra), 503, retryAfter ? { 'retry-after': String(retryAfter) } : null);
  }

  /**
   * S3 - AMPLOP PENOLAKAN FLAG TTS. Bentuknya SENGAJA cerminan `RouteAi.aiDisabledResponse`:
   * 403 (bukan 429, bukan 503), `error`/`copyKey`/`reason`/`message`, `quotaChecked:false`,
   * `quotaCharged:false`, dan TANPA `retryAfter` sama sekali.
   *
   * KENAPA TANPA `retryAfter`: menunggu tidak mengubah apa pun. Flag hanya berubah kalau
   * pemilik aplikasi mengubahnya, jadi `retryAfter` apa pun adalah janji yang tidak bisa
   * ditepati - dan klien yang mempercayainya akan mencoba lagi selamanya.
   *
   * KENAPA 403: 429 adalah bahasa "jatah", dan ini bukan soal jatah murid. Amplop ini tidak
   * menagih apa pun, dan itu benar secara struktur: ia dikembalikan dari `route-wiring.js`
   * SEBELUM handler ini berjalan, jadi badan permintaan belum diparsing, gerbang kuota belum
   * dipanggil, neuron akun belum dipesan, dan `env.AI` belum disentuh.
   */
  function ttsDisabledResponse(args) {
    var a = args || {};
    var body = baseResponse({
      source: 'unavailable',
      degraded: true,
      bytes: 0,
      chars: 0,
      error: 'tts_disabled',
      copyKey: 'tts.disabled',
      reason: String(a.reason || 'tts_flag_off'),
      message: POLITE.tts_disabled,
      quotaChecked: false,
      quotaCharged: false
    });
    return json(body, 403, a.headers || null);
  }

  async function handleRender(args) {
    var a = args || {};
    var env = a.env || {};
    var deps = a.deps || {};
    var now = typeof deps.now === 'function' ? deps.now : function () { return Date.now(); };
    var started = now();
    // S3 - buku besar kejujuran jatah untuk permintaan INI. Satu objek, satu sumber.
    var ledger = newQuotaLedger();

    var raw;
    try { raw = await a.request.text(); } catch (_) {
      return json(baseResponse({ error: 'bad_json', message: POLITE.bad_json }), 400);
    }
    if ((raw || '').length > MAX_BODY_BYTES) {
      return json(baseResponse({ error: 'body_too_big', message: POLITE.body_too_big }), 413);
    }
    var body;
    try { body = JSON.parse(raw || '{}'); } catch (_) {
      return json(baseResponse({ error: 'bad_json', message: POLITE.bad_json }), 400);
    }

    var engine = pickEngine(body, deps);

    // LANGKAH 1 — kunci dihitung ULANG dari input. `speed` yang dikirim klien tidak pernah masuk
    // hitungan (tts-key.js): ia diterapkan di playbackRate pemutar.
    var identity;
    try {
      identity = TtsKey.build({
        text: body.text,
        // AI-19 F05/AI-17 F02: hanya nilai enum yang boleh masuk kunci; sisanya '' → default
        // 'en-US' milik tts-key.js. Lihat komentar TTS_LOCALES di atas.
        locale: canonicalTtsLocale(body.locale),
        // A12/1 — voice bawaan datang dari registry bersama, BUKAN dari string di berkas ini.
        // Nilainya wajib sama dengan yang dipakai pra-render (`aura-asteria-en`), sebab kunci
        // cache mem-hash `voiceId`: bawaan yang berbeda = seluruh korpus dianggap belum ada.
        voiceId: body.voiceId || ProviderParams.defaultVoiceIdFor(engine.id),
        engineId: engine.id,
        engineVersion: body.engineVersion || engine.engineVersion,
        contentType: body.contentType,
        settings: body.settings
      });
    } catch (error) {
      return json(baseResponse({ error: 'invalid_input', message: POLITE.invalid_input }), 400);
    }
    if (identity.canonicalText.length > engine.maxChars) {
      // Skrip panjang dipecah menjadi parts[] oleh pipeline pra-render, bukan dipaksakan di sini.
      return json(baseResponse({
        audioKey: identity.audioKey, error: 'too_long', message: POLITE.too_long
      }), 400);
    }
    if (body.audioKey && String(body.audioKey) !== identity.audioKey) {
      return json(baseResponse({
        audioKey: identity.audioKey, error: 'key_mismatch', message: POLITE.key_mismatch
      }), 400);
    }

    var objectName = TtsKey.objectName(identity);
    var chars = identity.canonicalText.length;

    // LANGKAH 2 — HEAD R2. Hit di sini TIDAK menyentuh kuota, dan itu yang membuat replay gratis.
    var existing = await headObject(env, objectName);
    if (existing) {
      if (typeof deps.recordUsage === 'function' && a.ctx && typeof a.ctx.waitUntil === 'function') {
        a.ctx.waitUntil(Promise.resolve(deps.recordUsage({
          kind: 'tts', event: 'cache_hit', audioKey: identity.audioKey, chars: chars, costUsd: 0
        })).catch(function () {}));
      }
      return json(baseResponse({
        audioKey: identity.audioKey, objectName: objectName, url: assetUrl(env, objectName),
        source: 'cache', degraded: false, bytes: Number(existing.size || 0), chars: chars,
        quotaCharged: false
      }), 200);
    }

    // LANGKAH 3 — SINGLE-FLIGHT, dan posisinya SENGAJA dipindah ke sebelum kuota.
    //
    // S3 - CACAT KETIGA, ditemukan paket ini: dulu penggabungan dilakukan SESUDAH LANGKAH 4
    // (kuota). Akibatnya permintaan yang digabungkan TETAP memesan lalu meng-commit jatah
    // murid untuk audio yang tidak pernah ia minta dibuat - N permintaan bersamaan atas
    // aset yang SAMA menagih N kali untuk satu render. Lebih buruk: amplopnya menyalin
    // `shared` apa adanya lalu menimpanya `source:'cache'`, sehingga (a) `quotaCharged`
    // milik pemimpin dipakai untuk permintaan yang tidak menagih apa pun, dan (b) pemimpin
    // yang GAGAL (`source:'unavailable'`) tersaji sebagai `source:'cache'` - yang membuat
    // `providerFailed()` di `route-wiring.js` menjawab false, jadi jatahnya benar-benar
    // DI-COMMIT untuk nol byte audio.
    //
    // Memindahkannya ke SINI membuat kejujurannya struktural: permintaan yang digabungkan
    // tidak pernah menyentuh gerbang kuota, jadi tidak ada yang bisa ditagih, dan
    // `ledger.checked` tetap false tanpa perlu dieja.
    if (inFlight.has(identity.audioKey)) {
      var shared = await inFlight.get(identity.audioKey);
      var leaderFailed = !shared || shared.failed === true || Number(shared.bytes || 0) <= 0;
      // Hasil pemimpin dilaporkan APA ADANYA soal berhasil/gagal. Yang TIDAK diwarisi:
      // seluruh field akuntansi - itu milik permintaan pemimpin, bukan permintaan ini.
      return json(baseResponse(leaderFailed ? {
        audioKey: identity.audioKey, objectName: objectName, chars: chars,
        source: 'unavailable', degraded: true, message: POLITE.unavailable, coalesced: true
      } : {
        audioKey: identity.audioKey, objectName: objectName, url: assetUrl(env, objectName),
        source: 'cache', degraded: false, bytes: Number(shared.bytes || 0), chars: chars,
        coalesced: true
      }), 200);
    }

    // LANGKAH 4 — breaker
    var target = 'tts:' + engine.id;
    var store = deps.breakerStore || null;
    var prev = store ? await store.load(target, started) : Breaker.initialState(started);
    var gate = Breaker.beforeRequest(prev, started);
    if (store) await store.save(target, gate.state, started, { changed: gate.changed });
    if (!gate.allow) {
      return json(baseResponse({
        audioKey: identity.audioKey, objectName: objectName,
        source: 'unavailable', degraded: true, breaker: gate.phase, chars: chars,
        message: POLITE.breaker_open, retryAfter: Math.max(1, Math.ceil(gate.retryAfterMs / 1000)),
        quotaCharged: false
      }), 200);
    }

    // LANGKAH 5 — kuota, satu-satunya titik pemeriksaan
    var enforceQuota = resolveEnforceQuota(deps);
    if (enforceQuota) {
      var quota;
      try {
        quota = await enforceQuota({
          env: env, ctx: a.ctx, request: a.request,
          kind: 'tts', chars: chars, engineId: engine.id, audioKey: identity.audioKey
        });
        ledger.checked = true;
      } catch (_) {
        quota = { allowed: false, reason: 'quota_unavailable', retryAfter: 60 };
        // Gerbang yang MELEMPAR tidak meninggalkan reservasi. `checked` tetap false supaya
        // amplop tidak mengaku memeriksa buku yang tidak pernah bergerak.
      }
      if (quota && quota.allowed === false) {
        // A8: alasan sebenarnya menentukan kode DAN kalimatnya. `quota_unavailable` =
        // catatan jatah yang mati, bukan jatah murid yang habis. `copyKey` disertakan
        // supaya klien memakai naskah `features/quota/quota-copy.js`.
        var quotaBroken = String((quota && quota.reason) || '') === 'quota_unavailable';
        // Jatah habis = TIDAK ADA reservasi yang dibuat oleh gerbang, jadi tidak ada yang
        // bisa ditagih. `checked` boleh true (pemeriksaannya nyata), `charged` wajib false.
        return json(baseResponse({
          audioKey: identity.audioKey, objectName: objectName, chars: chars,
          source: 'unavailable', degraded: true, breaker: gate.phase,
          error: quotaBroken ? 'quota_unavailable' : 'quota_exceeded',
          copyKey: quotaBroken ? 'quota.unavailable' : 'quota.tts.exhausted',
          message: quotaBroken ? POLITE.quota_unavailable : POLITE.quota_exceeded,
          retryAfter: Number(quota.retryAfter) || 3600,
          quotaChecked: ledger.checked === true, quotaCharged: false
        }), 429, { 'retry-after': String(Number(quota.retryAfter) || 3600) });
      }
    }

    // LANGKAH 6 — S2: PAGAR NEURON AKUN, WAJIB. Urutannya disengaja: SESUDAH
    // single-flight (permintaan yang digabungkan tidak memanggil mesin, jadi tidak boleh
    // memesan neuron lagi) dan SESUDAH kuota murid (murid yang jatahnya habis tidak boleh
    // ikut menghabiskan jatah akun). Biaya neuronnya diturunkan di tempat perakitan dari
    // `chars` + `freeCharsPerDay` mesin yang BENAR-BENAR dipakai, bukan dari konstanta
    // yang dieja di sini - supaya harga tidak bisa menyimpang dari mesinnya.
    //
    // S3 - setiap penolakan di blok ini MEMBATALKAN reservasi kuota murid lebih dulu
    // (`requestQuotaRollback`), lalu melaporkan hasilnya. Tanpa itu amplop akan mengaku
    // menagih (`checked` true) untuk render yang tidak pernah menghasilkan satu byte pun.
    var accountBudget = typeof deps.accountBudget === 'function' ? deps.accountBudget : null;
    if (!accountBudget) {
      await requestQuotaRollback(deps, ledger, { request: a.request, reason: 'tts_budget_dep_missing' });
      return accountDenied(identity, objectName, chars, gate.phase, 'ai_budget_dep_missing', started, now, ledger);
    }
    var reserved;
    try {
      reserved = await accountBudget({
        env: env, ctx: a.ctx, request: a.request, kind: 'tts',
        chars: chars, freeCharsPerDay: engine.freeCharsPerDay, engineId: engine.id, now: started
      });
    } catch (_) {
      reserved = { allowed: false, reason: 'ai_budget_unreadable' };
    }
    if (!reserved || reserved.allowed !== true) {
      await requestQuotaRollback(deps, ledger, { request: a.request, reason: 'tts_account_denied' });
      return accountDenied(identity, objectName, chars, gate.phase,
        String((reserved && reserved.reason) || 'ai_account_cap'), started, now, ledger);
    }
    if (!ModelCallGate.isReservation(reserved)) {
      await requestQuotaRollback(deps, ledger, { request: a.request, reason: 'tts_budget_receipt_invalid' });
      return accountDenied(identity, objectName, chars, gate.phase, 'ai_budget_receipt_invalid', started, now, ledger);
    }

    var work = (async function () {
      var bytes = null;
      var failureKind = '';
      var engineThrew = null;
      try {
        var result = await callEngine(
          env, engine.id, identity.canonicalText, identity.voiceId, identity.locale, TTS_TIMEOUT_MS,
          reserved
        );
        bytes = toBytes(result);
        if (!bytes || byteSize(bytes) < 512) failureKind = 'empty_body';
      } catch (error) {
        engineThrew = error;
        failureKind = Breaker.classify(signalFromError(error)) || 'unavailable';
      }

      if (failureKind) {
        // S2 - neuron dilepas HANYA kalau panggilan tidak pernah sampai ke mesin. Timeout
        // dan `empty_body` TIDAK dilepas: mesin sudah bekerja, neuronnya sudah terbelanja.
        var released = false;
        if (engineThrew && ModelCallGate.releasableFailure(engineThrew)) {
          released = await ModelCallGate.releaseReservation(reserved, failureKind);
        }
        var failed = Breaker.onFailure(gate.state, failureKind, now(), 0);
        if (store) await store.save(target, failed, now(), { changed: true, transition: true });
        // S3 - INI JALUR YANG BOHONG DI PRODUKSI. Nol byte audio, `source:'unavailable'`,
        // dan dulu `quotaCharged: quotaChecked` = true - padahal `settleQuota()` PASTI
        // membatalkan reservasinya karena `providerFailed()` melihat `source:'unavailable'`.
        // Sekarang pembatalannya DIMINTA di sini, dan `chargedFor()` melaporkan akibatnya.
        await requestQuotaRollback(deps, ledger, { request: a.request, reason: 'tts_' + failureKind });
        return {
          accountNeuronsReserved: true,
          accountNeuronsReleased: !!released,
          audioKey: identity.audioKey, objectName: objectName, chars: chars,
          source: 'unavailable', degraded: true, bytes: 0,
          breaker: Breaker.snapshot(failed, now()).breaker,
          message: POLITE.unavailable,
          quotaChecked: ledger.checked === true, quotaCharged: chargedFor(ledger), failed: true
        };
      }

      // LANGKAH 6 — PUT IDEMPOTEN. HEAD diulang tepat sebelum menulis: kalau pra-render atau
      // permintaan lain sudah menaruh objeknya, tulisan ini dilewati. Nama objek = hash seluruh
      // input, jadi dua tulisan yang lolos pun menulis byte ke nama yang sama (R2 strong
      // consistency per object) — duplikat mustahil secara struktural, bukan secara disiplin.
      var again = await headObject(env, objectName);
      if (!again && env.AUDIO && typeof env.AUDIO.put === 'function') {
        try {
          await env.AUDIO.put(objectName, bytes, {
            httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' },
            customMetadata: {
              keySchema: TtsKey.SCHEMA, engineId: engine.id,
              engineVersion: identity.engineVersion, voiceId: identity.voiceId,
              locale: identity.locale, chars: String(chars)
            }
          });
        } catch (_) {
          // Objek gagal ditulis: audionya tetap dikirim ke klien untuk sesi ini, tapi TIDAK
          // dicatat sebagai ready. Mencatatnya akan membuat manifest berjanji sesuatu yang 404.
          // S3 - audio NYATA dikirim ke murid untuk sesi ini, tapi `degraded:true` membuat
          // `providerFailed()` membatalkan reservasinya, jadi buku jatah tidak bergerak.
          // Karena itu amplopnya wajib bilang tidak menagih. Arah salahnya menguntungkan
          // murid (dia dapat audio gratis), dan itu memang arah yang diwajibkan mandat.
          await requestQuotaRollback(deps, ledger, { request: a.request, reason: 'tts_store_failed' });
          return {
            accountNeuronsReserved: true,
            audioKey: identity.audioKey, objectName: objectName, chars: chars,
            source: 'provider', degraded: true, breaker: 'CLOSED',
            bytes: byteSize(bytes), stored: false,
            quotaChecked: ledger.checked === true, quotaCharged: chargedFor(ledger)
          };
        }
      }

      var healthy = Breaker.onSuccess(gate.state, now());
      if (store) await store.save(target, healthy, now(), { changed: gate.phase !== 'CLOSED' });

      if (typeof deps.recordUsage === 'function' && a.ctx && typeof a.ctx.waitUntil === 'function') {
        a.ctx.waitUntil(Promise.resolve(deps.recordUsage({
          kind: 'tts', event: 'render', audioKey: identity.audioKey, engineId: engine.id,
          chars: chars, bytes: byteSize(bytes),
          costUsd: (chars / 1000) * engine.usdPer1kChars, ms: now() - started
        })).catch(function () {}));
      }

      // Satu-satunya jalur yang benar-benar menagih: audio nyata, tersimpan, tidak degraded,
      // jadi `settleQuota()` meng-commit reservasinya.
      return {
        accountNeuronsReserved: true,
        audioKey: identity.audioKey, objectName: objectName, url: assetUrl(env, objectName),
        source: 'provider', degraded: false, breaker: 'CLOSED',
        bytes: byteSize(bytes), chars: chars, stored: true,
        quotaChecked: ledger.checked === true, quotaCharged: chargedFor(ledger)
      };
    }());

    inFlight.set(identity.audioKey, work);
    var out;
    try { out = await work; } finally { inFlight.delete(identity.audioKey); }
    return json(baseResponse(out), 200);
  }

  /**
   * GET /api/tts/manifest — daftar kunci yang tersedia, ber-ETag.
   *
   * ETag dihitung dari isi daftar, bukan dari waktu: manifest yang tidak berubah harus dijawab
   * 304 supaya klien yang membukanya tiap perpindahan halaman tidak membangkitkan biaya Class B
   * (cf-a10 mencatat manifest `max-age=60` sebagai komponen R2 Class B pertama yang membengkak).
   */
  async function handleManifest(args) {
    var a = args || {};
    var env = a.env || {};
    var deps = a.deps || {};
    var url;
    try { url = new URL(a.request.url); } catch (_) { url = { searchParams: { get: function () { return null; } } }; }
    var domain = (url.searchParams && url.searchParams.get('domain')) || '';

    var keys = [];
    if (typeof deps.listKeys === 'function') {
      keys = (await deps.listKeys(domain)) || [];
    } else if (env.AUDIO && typeof env.AUDIO.list === 'function') {
      try {
        var listed = await env.AUDIO.list({ limit: 1000 });
        keys = ((listed && listed.objects) || []).map(function (o) {
          return { audioKey: String(o.key || '').replace(/\.mp3$/, ''), bytes: Number(o.size || 0) };
        }).filter(function (e) { return /^[0-9a-f]{64}$/.test(e.audioKey); });
      } catch (_) { keys = []; }
    }

    keys.sort(function (x, y) { return x.audioKey < y.audioKey ? -1 : x.audioKey > y.audioKey ? 1 : 0; });
    var payload = {
      schema: 'fiezel-tts-manifest-v2',
      keySchema: TtsKey.SCHEMA,
      domain: domain || 'all',
      count: keys.length,
      engineVersions: Object.keys(ENGINES).map(function (k) { return ENGINES[k].engineVersion; }),
      keys: keys
    };
    var etag = '"' + TtsKey.sha256(TtsKey.SCHEMA + '|' + payload.domain + '|' + keys.map(function (k) { return k.audioKey; }).join(',')) + '"';
    var inm = a.request.headers && typeof a.request.headers.get === 'function' ? a.request.headers.get('if-none-match') : null;
    var headers = {
      etag: etag,
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
      'content-type': 'application/json; charset=utf-8'
    };
    if (inm && inm === etag) return new Response(null, { status: 304, headers: headers });
    return new Response(JSON.stringify(payload), { status: 200, headers: headers });
  }

  function adapt(handler, deps) {
    return function (first, second, third) {
      if (first && first.req && first.env !== undefined) {
        return handler({
          request: first.req.raw || first.req,
          env: first.env,
          ctx: first.executionCtx || first.ctx || null,
          deps: deps
        });
      }
      return handler({ request: first, env: second || {}, ctx: third || null, deps: deps });
    };
  }

  function registerTtsRoutes(router, deps) {
    if (!router || typeof router.post !== 'function' || typeof router.get !== 'function') {
      throw new Error('router_required');
    }
    router.post('/api/tts/render', adapt(handleRender, deps || {}));
    router.get('/api/tts/manifest', adapt(handleManifest, deps || {}));
    return router;
  }

  return Object.freeze({
    ROUTES: Object.freeze({ render: '/api/tts/render', manifest: '/api/tts/manifest' }),
    ENGINES: ENGINES,
    DEFAULT_ENGINE: DEFAULT_ENGINE,
    PROVIDER_PARAMS: ProviderParams.PROVIDER_PARAMS,
    buildProviderInput: ProviderParams.buildProviderInput,
    defaultVoiceIdFor: ProviderParams.defaultVoiceIdFor,
    callEngine: callEngine,
    CHEAP_ENGINE: CHEAP_ENGINE,
    TTS_TIMEOUT_MS: TTS_TIMEOUT_MS,
    POLITE: POLITE,
    ttsDisabledResponse: ttsDisabledResponse,
    accountDenied: accountDenied,
    secondsToUtcMidnight: secondsToUtcMidnight,
    registerTtsRoutes: registerTtsRoutes,
    handleRender: handleRender,
    handleManifest: handleManifest,
    resolveEnforceQuota: resolveEnforceQuota
  });
}));
