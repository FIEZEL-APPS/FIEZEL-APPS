/**
 * E5 — POST /api/ai/task (cf-b4 §1.1). Ekspor `registerAiRoutes(router)`.
 *
 * PEMASANGAN (instruksi lengkap ada di reports/exec-e5-ai-tts.md):
 *   // workers/api/index.js — BUKAN berkas ini; jangan disunting oleh paket kerja E5
 *   const { registerAiRoutes } = require('./ai/route-ai.js');
 *   const { registerTtsRoutes } = require('./tts/route-tts.js');
 *   registerAiRoutes(app);   // app = Hono() atau router manual dengan .post(path, handler)
 *   registerTtsRoutes(app);
 *
 * Tiga hal yang berkas ini jaga dan tidak boleh dilunakkan:
 *
 * 1. KLIEN TIDAK PERNAH MENGIRIM PROMPT. Field `prompt`/`system`/`messages`/`model`/`temperature`
 *    adalah 400, bukan field yang diabaikan. Mengabaikannya diam-diam membuat penyerang tidak
 *    tahu bahwa ia gagal, dan membuat kita tidak tahu bahwa ia mencoba.
 *
 * 2. GALAT PROVIDER TIDAK PERNAH DITERUSKAN. Pesan galat Workers AI bisa memuat nama model,
 *    nama akun, ID permintaan, dan kalimat Inggris teknis. Tiga-tiganya salah untuk murid SMP
 *    (`renderAIError` `app.js:5272` hari ini mencetak galat mentah), dan yang pertama adalah
 *    kebocoran informasi. Semua kegagalan keluar sebagai 200 + `degraded:true` + teks fallback
 *    deterministik, atau 429 + `retryAfter` untuk kuota. TIDAK ADA 5xx ke klien: bab 15 melarang
 *    kegagalan AI menghentikan murid mengerjakan soal.
 *
 * 3. TIMEOUT ADA DI SERVER. Hari ini timeout hanya di klien (`app.js:5130` 30 s, `:3880` 25 s),
 *    yang berarti Worker tetap menunggu — dan tetap membayar — sesudah klien menyerah.
 *
 * 4. JAWABAN KOSONG ADALAH KEGAGALAN, BUKAN SUKSES. Workers AI mengembalikan DUA bentuk
 *    jawaban: `result.response` (llama-*) dan `result.choices[0].message.content` (granite,
 *    gemma, sea-lion). Membaca satu bentuk saja menghasilkan string kosong SECARA SENYAP —
 *    murid melihat kotak jawaban kosong, bukan galat, dan tokennya tetap dibayar. Karena itu
 *    pembacaan dipusatkan di `AiTasks.readModelText()` dan hasil kosong SELALU jatuh ke
 *    fallback deterministik dengan sebab yang dicatat (`empty_output`).
 *
 * 5. ISI REASONING TIDAK PERNAH SAMPAI KE MURID. `@cf/google/gemma-4-26b-a4b-it` menghabiskan
 *    seluruh anggaran token di `message.reasoning_content` dan mengembalikan `content` kosong
 *    dengan `finish_reason:"length"`. Itu kegagalan model dengan nama sendiri
 *    (`reasoning_overflow`), bukan bahan jawaban: menampilkan monolog internal model kepada
 *    murid SMP adalah kebocoran sekaligus kekacauan pedagogis.
 *
 * 6. MUTU KELUARAN ADALAH KONTRAK. Sesudah jawaban diterima ia masih harus lulus
 *    `AiTasks.checkOutputContract()`: batas kalimat yang diminta, kanon kata FIEZEL ("nggak",
 *    bukan "tidak"), dan tidak kosong. Yang gagal TIDAK ditampilkan — ia diganti fallback
 *    deterministik dan sebabnya dicatat. Bukti bahwa ini perlu: llama-3.1-8b tetap
 *    mengeluarkan 7-8 kalimat meski promptnya menulis maksimal 6.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelRouteAi = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var AiTasks = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./ai-tasks.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelAiTasks;
  }());

  var Breaker = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('../breaker/breaker.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelBreaker;
  }());

  /**
   * S2 - SATU-SATUNYA PINTU KE MODEL. Berkas ini TIDAK LAGI mengeja `env.AI.run`:
   * panggilan model harus lewat `ModelCallGate.runReservedModel()`, yang menolak
   * dipanggil tanpa tanda terima reservasi neuron akun. Jadi "lupa memesan" bukan lagi
   * keadaan yang bisa lolos senyap - ia melempar sebelum satu byte sampai ke provider.
   */
  var ModelCallGate = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./model-call-gate.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelModelCallGate;
  }());

  /**
   * KUOTA DIMUAT OPSIONAL, dan itu bukan kemalasan — ia syarat agar paket kerja E5 dan paket
   * kuota bisa di-merge dalam urutan apa pun tanpa satu pun dari keduanya rusak. Tiga jalur,
   * berurutan:
   *   (a) `deps.enforceQuota` disuntik pemanggil (jalur yang dipakai gerbang uji);
   *   (b) `globalThis.FIEZEL_ENFORCE_QUOTA` dipasang index.js;
   *   (c) `require`/`import` ../quota/route-quota.js — specifier DIRAKIT saat runtime supaya
   *       bundler tidak gagal build ketika berkas itu belum ada di branch ini.
   * Kalau ketiganya kosong: `enforceQuota` menjadi izin-lolos yang DICATAT (`quotaChecked:false`),
   * bukan penolakan senyap. Menolak semua permintaan karena modul kuota belum di-merge akan
   * mematikan fitur; melewatkannya tanpa jejak akan menyembunyikan biaya. Jejaknya wajib.
   */
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
      } catch (_) { /* modul kuota belum ada di branch ini; lanjut dengan jejak */ }
    }
    return null;
  }

  /**
   * A8 · Naskah murid. Kanonnya sama dengan `features/quota/quota-copy.js`: bahasa
   * sehari-hari, "nggak" bukan "tidak", tanpa nama mesin, dan tanpa menyalahkan murid.
   * Kalimat di sini sengaja tetap tinggal di rute (bukan dipindah ke klien) karena ia
   * dipakai untuk keadaan yang klien belum tentu bisa menyimpulkan sendiri — tetapi
   * nadanya wajib satu suara dengan naskah klien, dan itu dijaga
   * `quota-notice-a11y-test.js`.
   */
  var POLITE = Object.freeze({
    schema_mismatch: 'Aku belum paham kirimanmu. Muat ulang halaman lalu coba lagi, ya.',
    unknown_task: 'Bantuan yang kamu minta belum tersedia.',
    client_prompt_forbidden: 'Aku belum paham kirimanmu. Muat ulang halaman lalu coba lagi, ya.',
    input_required: 'Isi dulu bagian yang diminta, ya.',
    invalid_input: 'Ada bagian yang belum sesuai. Periksa lagi isinya, ya.',
    too_long: 'Tulisanmu kepanjangan untuk sekali kirim. Coba potong sebagian dulu.',
    quota_exceeded: 'Jatah tanya-jawab hari ini sudah habis. Penjelasan dari materi tetap muncul, dan jatahnya kembali sesudah tengah malam.',
    // A8 TEMUAN BOHONG (§4 reports/add-a8-a11y.md). Sebelum commit ini, keadaan
    // "penghitung jatahnya sendiri yang rusak" (`reason:'quota_unavailable'`) dikirim ke
    // murid dengan kalimat `quota_exceeded` — murid yang belum memakai apa pun dituduh
    // sudah menghabiskan jatahnya, lengkap dengan saran "coba lagi besok" padahal
    // retryAfter-nya 60 detik. Keadaannya sekarang punya kalimatnya sendiri.
    quota_unavailable: 'Aku belum bisa membaca sisa jatahmu, jadi jatahmu kemungkinan besar masih utuh. Jawaban dari materi tetap muncul — coba lagi sebentar lagi, ya.',
    breaker_open: 'Bantuan AI sedang istirahat sebentar. FIEZEL tetap menjawab dari materi, dan itu nggak pakai jatah.',
    degraded: 'Jawaban ini aku susun dari materi, bukan dari AI. Isinya tetap boleh kamu pakai.',
    body_too_big: 'Kirimanmu kebesaran untuk sekali kirim. Coba potong sebagian dulu.',
    bad_json: 'Aku belum paham kirimanmu. Muat ulang halaman lalu coba lagi, ya.',
    // P3 - dua keadaan BARU, dan keduanya bukan salah murid, jadi kalimatnya nggak
    // boleh terdengar seperti tuduhan atau seperti jatah yang habis.
    // `ai_disabled`: pemilik aplikasi memang belum menyalakan bantuan AI. Nggak ada
    // yang bisa murid lakukan, jadi jangan menyuruhnya menunggu atau mencoba lagi.
    ai_disabled: 'Bantuan AI belum dinyalakan di aplikasi ini. Penjelasan dari materi tetap muncul, dan jatahmu utuh.',
    // `ai_account_budget`: jatah AI SEAPLIKASI hari ini sudah penuh, bukan jatah murid
    // ini. Karena itu kalimatnya menegaskan jatah pribadinya nggak berkurang.
    ai_account_budget: 'Bantuan AI sedang penuh untuk hari ini, bukan karena jatahmu. Jawaban dari materi tetap muncul, dan jatahmu nggak berkurang.',
    // S2 - keadaan BARU: pagar neuron akun TIDAK TERPASANG (dep tidak disuntikkan
    // perakit, atau tanda terimanya tidak sah). Ini salah PEMASANGAN, bukan jatah yang
    // penuh dan bukan salah murid, jadi kalimatnya nggak boleh meniru dua-duanya:
    // "penuh" akan menyuruh murid menunggu tengah malam untuk sesuatu yang menunggu
    // tidak memperbaiki, dan "jatahmu habis" adalah tuduhan yang salah.
    ai_budget_missing: 'Bantuan AI belum bisa dipakai karena setelannya belum lengkap di pihak kami. Ini bukan salah kamu, jatahmu utuh, dan penjelasan dari materi tetap muncul.'
  });

  var MAX_BODY_BYTES = 16000; // di atas payload terbesar (context_coach 8.000 B) dengan margin

  /**
   * A12/2 — `quotaCharged` WAJIB ADA DI SETIAP AMPLOP, penolakan maupun sukses.
   *
   * `route-tts.js` sudah menyertakannya di lima tempat; berkas ini tidak menyertakannya sama
   * sekali. Akibatnya klien tidak bisa membedakan penolakan yang MENAGIH dari yang tidak, dan
   * `quotaCharged` adalah satu-satunya cara jujur menampilkan sisa kuota tanpa polling
   * `/api/quota` setiap kali (kontrak yang sama yang dijanjikan `route-quota.js`).
   *
   * ARTINYA HARUS PERSIS: `quotaCharged:true` berarti satu unit jatah murid benar-benar
   * berkurang. Ia BUKAN sinonim `quotaChecked` (yang hanya berarti "gerbang kuota dijalankan").
   *
   * Kenapa nilainya bisa dijamin: `workers/api/route-wiring.js:settleQuota()` menyelesaikan
   * reservasi dengan melihat AMPLOP jawaban — `providerFailed(body)` true (`source` =
   * `deterministic-fallback`/`unavailable`, atau `degraded:true`) ⇒ `rollback`, selain itu
   * `commit`. Jadi predikat di bawah dieja mengikuti predikat itu, bukan menebaknya. Kalau salah
   * satu berubah tanpa yang lain, `ai-response-shape-test.js` merah.
   *
   * `deps.rollbackQuota` opsional: pemanggil yang TIDAK lewat wiring (uji, worker lain) bisa
   * menyuntikkan pembatal eksplisit. Kalau tidak ada, rollback tetap terjadi lewat amplop.
   *
   * P3 - NILAI BALIKNYA SEKARANG LAPORAN, BUKAN BASA-BASI.
   * Versi lama mengembalikan `true` HANYA KARENA ada fungsi yang bisa dipanggil, tanpa
   * pernah melihat hasilnya. Akibat terukur di produksi: amplop melaporkan
   * `quotaRolledBack:false` di jalur nyata (karena `deps.rollbackQuota` memang tidak
   * pernah disuntikkan wiring) sementara reservasinya SUNGGUH dibatalkan lewat
   * `settleQuota()`. Laporan yang tidak cocok dengan kenyataan lebih buruk daripada
   * tidak ada laporan: ia membuat sisa kuota di klien salah, dan membuat audit percaya
   * murid kehilangan jatah yang sebenarnya kembali.
   * Aturan sekarang: `false` HANYA kalau pembatal memang mengatakan tidak ada yang
   * dibatalkan (`return false`), atau tidak ada pembatal sama sekali. Pembatal lama yang
   * tidak mengembalikan apa pun tetap dianggap membatalkan - itu perilaku lamanya, dan
   * mengubahnya menjadi "false" akan menciptakan kebohongan ke arah yang berlawanan.
   * Fungsi ini menjadi async karena pembatal nyata (bridge wiring) menyentuh D1.
   */
  async function releaseQuota(deps, info) {
    var d = deps || {};
    var fn = typeof d.rollbackQuota === 'function' ? d.rollbackQuota : null;
    if (!fn) {
      var g = typeof globalThis !== 'undefined' ? globalThis : {};
      if (typeof g.FIEZEL_ROLLBACK_QUOTA === 'function') fn = g.FIEZEL_ROLLBACK_QUOTA;
    }
    if (!fn) return false;
    try {
      var out = fn(info);
      if (out && typeof out.then === 'function') out = await out;
      return out !== false;
    } catch (_) {
      // Pembatal yang meledak tidak boleh menggagalkan jawaban murid - tetapi ia juga
      // tidak boleh dilaporkan sebagai rollback yang berhasil.
      return false;
    }
  }

  /**
   * P3 - AMPLOP PENOLAKAN FLAG, DIRAKIT DI SINI SUPAYA BENTUKNYA SATU.
   *
   * Dipakai `route-wiring.js` yang menggerbang rute AI SEBELUM badan permintaan dibaca.
   * Ia tinggal di berkas ini, bukan di wiring, karena `baseResponse()` dan `RESPONSE_SCHEMA`
   * tinggal di sini: amplop kedua yang dirakit tangan di tempat lain adalah cara paling
   * pasti membuat kontrak jawaban bercabang.
   *
   * KENAPA 403, BUKAN 429 - DAN INI PERBEDAAN YANG SENGAJA:
   *   - 429 (penolakan KUOTA) berarti "nanti bisa": jatahnya habis, ada `retryAfter`, dan
   *     ia soal MURID INI. Klien wajar menampilkan hitungan mundur.
   *   - 403 (penolakan FLAG) berarti "tidak untukmu, dan bukan soal waktu": pemilik
   *     aplikasi belum menyalakan AI. Tidak ada `retryAfter` karena tidak ada saat yang
   *     bisa dijanjikan, dan mencoba lagi tidak akan mengubah apa pun. Klien yang
   *     menampilkan hitungan mundur di sini akan berbohong ke murid.
   * `quotaCharged:false` WAJIB: penolakan ini terjadi sebelum satu byte badan permintaan
   * dibaca, jadi tidak ada reservasi, tidak ada tagihan, dan jatah murid utuh.
   */
  function aiDisabledResponse(args) {
    var a = args || {};
    var body = baseResponse(a.task || '', {
      text: '',
      source: 'unavailable',
      degraded: true,
      error: 'ai_disabled',
      copyKey: 'ai.disabled',
      reason: String(a.reason || 'ai_flag_off'),
      message: POLITE.ai_disabled,
      quotaChecked: false,
      quotaCharged: false,
      usage: { inputTokens: 0, outputTokens: 0, ms: 0 }
    });
    return json(body, 403, a.headers || null);
  }

  function json(payload, status, headers) {
    var h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (headers) Object.keys(headers).forEach(function (k) { h[k] = headers[k]; });
    return new Response(JSON.stringify(payload), { status: status || 200, headers: h });
  }

  /** Detik sampai 00:00 UTC berikutnya - jam berganti jatah neuron akun. */
  function secondsToUtcMidnight(nowMs) {
    var ms = Number(nowMs) || 0;
    var day = 86400000;
    var remaining = day - (((ms % day) + day) % day);
    return Math.max(1, Math.ceil(remaining / 1000));
  }

  function firstErrorCode(errors) {
    var e = (errors && errors[0]) || 'invalid_input';
    var head = String(e).split(':')[0];
    if (POLITE[head]) return head;
    if (head === 'missing' || head === 'enum' || head === 'type' || head === 'unknown_field' ||
        head === 'privacy' || head === 'item') return 'invalid_input';
    if (head === 'too_big' || head === 'too_many' || head === 'payload_too_big' ||
        head === 'input_tokens_exceeded') return 'too_long';
    return 'invalid_input';
  }

  function baseResponse(task, extra) {
    var out = {
      schema: AiTasks.RESPONSE_SCHEMA,
      task: task || '',
      text: '',
      source: 'deterministic-fallback',
      degraded: true,
      breaker: 'CLOSED',
      // A12/2 — bawaan amplop, bukan tambahan per jalur: sebuah jalur baru yang lupa mengejanya
      // tetap jujur (tidak menagih) alih-alih menghilangkan field-nya dari kontrak.
      quotaCharged: false,
      usage: { inputTokens: 0, outputTokens: 0, ms: 0 },
      protocol: '2.0'
    };
    if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  /**
   * Pembacaan bentuk jawaban tinggal SATU tempat: `AiTasks.readModelText()`. Versi lama fungsi ini
   * membaca `result.response` lebih dulu lalu `choices[0].message.content`, tetapi ia membuang
   * `reasoning_content` dan `finish_reason` — sehingga model yang membakar seluruh anggaran token
   * di reasoning tampak seperti "model diam", bukan seperti kegagalan yang perlu dicatat namanya.
   * Wrapper ini dipertahankan untuk pemanggil lama dan tetap mengembalikan string.
   */
  function readProviderText(result) {
    return AiTasks.readModelText(result).text;
  }

  /**
   * Memanggil provider dengan timeout NYATA. `AbortSignal.timeout` dipakai bila ada; kalau
   * tidak, `Promise.race` menjadi jaring terakhir supaya batas waktu tetap berlaku di runtime
   * lama. Yang tidak boleh terjadi: menunggu tanpa batas, karena itu tagihan yang tak terlihat.
   */
  async function callProvider(env, modelId, payload, timeoutMs, reservation) {
    var options = {};
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      options.signal = AbortSignal.timeout(timeoutMs);
    }
    // S2 - lewat chokepoint, dengan tanda terima. Tanpa tanda terima yang sah ini
    // MELEMPAR `model_call_unreserved` dan provider tidak pernah disentuh.
    var run = ModelCallGate.runReservedModel({
      env: env, modelId: modelId, input: payload, options: options, reservation: reservation
    });
    var timer;
    var guard = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        var err = new Error('provider_timeout');
        err.fiezelTimeout = true;
        reject(err);
      }, timeoutMs + 250);
    });
    try {
      return await Promise.race([run, guard]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Peta galat mentah → sinyal breaker. Tidak menebak dari naskah pesan bila ada status. */
  function signalFromError(error) {
    var e = error || {};
    if (e.fiezelTimeout === true || e.name === 'TimeoutError' || e.name === 'AbortError') return { timeout: true };
    var status = Number(e.status || (e.response && e.response.status) || 0);
    if (status) return { status: status };
    return { networkError: true };
  }

  /**
   * S2 - AMPLOP PENOLAKAN PAGAR NEURON AKUN, SATU BENTUK UNTUK SEMUA SEBABNYA.
   *
   * Dua kelas sebab, dan mereka SENGAJA tidak memakai kalimat yang sama:
   *
   *  (a) `ai_account_cap` - jatah neuron akun hari ini memang penuh. Ini SOAL WAKTU:
   *      `retryAfter` menunjuk 00:00 UTC, jam ketika jatah vendor benar-benar berganti.
   *      Kalimatnya menegaskan jatah PRIBADI murid tidak berkurang.
   *  (b) sebab PERAKITAN/PENYIMPANAN - dep tidak disuntikkan (`ai_budget_dep_missing`),
   *      tanda terima tidak sah (`ai_budget_receipt_invalid`), ctx hilang, binding D1
   *      absen, atau D1 tidak terbaca. Ini BUKAN jatah yang penuh, jadi meniru kalimat
   *      (a) akan berbohong dua kali: menuduh jatah habis, dan menyuruh murid menunggu
   *      tengah malam untuk sesuatu yang menunggu tidak memperbaiki.
   *      - `unreadable`/`store_missing` masih mungkin pulih sendiri (D1 batuk) -> saran
   *        coba lagi 60 detik;
   *      - `dep_missing`/`receipt_invalid`/`context_missing` adalah cacat pemasangan ->
   *        TANPA `retryAfter`, karena tidak ada saat yang bisa dijanjikan.
   *
   * YANG SAMA DI SEMUA CABANG, dan ini bagian yang tidak boleh dilunakkan:
   * `quotaChecked:false` DAN `quotaCharged:false`. Jatah murid tidak diperiksa, tidak
   * dipesan, tidak dipotong - pagar ini berjalan SEBELUM kuota murid justru supaya
   * penolakannya tidak pernah menghukum murid atas urusan dompet owner. Murid tetap
   * menerima teks materi (`fallbackText`), jadi harga fail-closed di sini adalah
   * "jawaban dari materi", bukan layar kosong.
   */
  function budgetDenied(taskName, fallbackText, breakerPhase, reason, started, now) {
    var capReached = String(reason) === 'ai_account_cap';
    var transient = reason === 'ai_budget_unreadable' || reason === 'ai_budget_store_missing';
    var extra = {
      text: fallbackText,
      source: 'deterministic-fallback',
      degraded: true,
      breaker: breakerPhase,
      error: 'service_degraded',
      // `ai.accountBudget` HANYA untuk jatah yang benar-benar penuh. Naskah klien untuk
      // kunci itu berbicara tentang jatah harian; memakainya untuk cacat pemasangan
      // berarti klien menampilkan sebab yang salah walau `message` di sini benar.
      copyKey: capReached ? 'ai.accountBudget' : 'ai.disabled',
      reason: String(reason || 'ai_account_cap'),
      message: capReached ? POLITE.ai_account_budget : POLITE.ai_budget_missing,
      quotaChecked: false,
      quotaCharged: false,
      usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }
    };
    var headers = null;
    if (capReached) {
      extra.retryAfter = secondsToUtcMidnight(started);
      headers = { 'retry-after': String(secondsToUtcMidnight(started)) };
    } else if (transient) {
      extra.retryAfter = 60;
      headers = { 'retry-after': '60' };
    }
    return json(baseResponse(taskName, extra), 503, headers);
  }

  /**
   * Handler inti — bebas dari bentuk router supaya bisa diuji tanpa framework.
   * @param {{request:Request, env:object, ctx:object, deps:object}} args
   */
  async function handleAiTask(args) {
    var a = args || {};
    var env = a.env || {};
    var deps = a.deps || {};
    var now = typeof deps.now === 'function' ? deps.now : function () { return Date.now(); };
    var started = now();

    var raw;
    try {
      raw = await a.request.text();
    } catch (_) {
      // Kuota belum disentuh sama sekali di titik ini.
      return json(baseResponse('', { error: 'bad_request', message: POLITE.bad_json, quotaCharged: false }), 400);
    }
    if (AiTasks.byteLength(raw || '') > MAX_BODY_BYTES) {
      return json(baseResponse('', { error: 'body_too_big', message: POLITE.body_too_big, quotaCharged: false }), 413);
    }
    var body;
    try { body = JSON.parse(raw || '{}'); } catch (_) {
      return json(baseResponse('', { error: 'bad_json', message: POLITE.bad_json, quotaCharged: false }), 400);
    }

    var verdict = AiTasks.validate(body);
    if (!verdict.ok) {
      var code = firstErrorCode(verdict.errors);
      // Daftar galat rinci TIDAK dikirim ke klien; ia hanya untuk log server-side. Yang dikirim
      // satu kode + satu kalimat sopan.
      return json(baseResponse(verdict.task || '', {
        error: code, message: POLITE[code], degraded: true, quotaCharged: false
      }), 400);
    }

    var spec = verdict.spec;
    var taskName = verdict.task;
    var fallbackText = AiTasks.fallbackFor(taskName, verdict.input);

    // --- BREAKER SEBELUM KUOTA. Provider yang sudah terbukti mati tidak boleh memakan satu pun
    // jatah murid: OPEN artinya jawabannya sudah diketahui tanpa memanggil apa pun.
    var breakerTarget = 'ai:' + AiTasks.pickModel(taskName, { breaker: 'CLOSED' }).id;
    var store = deps.breakerStore || null;
    var breakerState = store ? await store.load(breakerTarget, started) : Breaker.initialState(started);
    var gate = Breaker.beforeRequest(breakerState, started);
    if (store) await store.save(breakerTarget, gate.state, started, { changed: gate.changed });

    if (!gate.allow) {
      return json(baseResponse(taskName, {
        text: fallbackText,
        source: 'deterministic-fallback',
        degraded: true,
        breaker: gate.phase,
        message: POLITE.breaker_open,
        retryAfter: Math.max(1, Math.ceil(gate.retryAfterMs / 1000)),
        // Breaker OPEN mendahului kuota dengan sengaja: provider yang terbukti mati tidak
        // memakan satu pun jatah, jadi nilai ini strukturnya SELALU false.
        quotaCharged: false,
        usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }
      }), 200);
    }

    // --- PAGAR NEURON TINGKAT AKUN. Sesudah breaker, SEBELUM kuota murid.
    //
    // Urutannya bukan selera. Kuota murid menjawab "apakah MURID ini masih punya jatah";
    // pagar ini menjawab "apakah AKUN masih punya jatah", dan yang ditagih Cloudflare
    // adalah yang kedua. Kalau pagar akun diletakkan SESUDAH kuota murid, permintaan yang
    // akhirnya ditolak karena jatah akun penuh sudah lebih dulu memakan jatah murid -
    // murid dihukum untuk sesuatu yang bukan urusannya. Karena itu ia lebih dulu, dan
    // karena itu penolakannya `quotaCharged:false` DAN `quotaChecked:false`.
    //
    // Yang dipesan adalah biaya MODEL UTAMA task (`spec.model`), bukan model hasil
    // `pickModel()`, karena `pickModel()` justru butuh hasil pemesanan ini
    // (`neuronsUsedToday`). Arah salahnya sengaja: kalau nanti model yang dipakai lebih
    // murah, kami sudah memesan LEBIH BANYAK dari yang terpakai. Untuk dompet, memesan
    // kelebihan aman; memesan kekurangan tidak.
    // S2 - DEP INI WAJIB, TIDAK LAGI OPSIONAL. Versi P3 memasang pagar hanya kalau
    // `typeof deps.accountBudget === 'function'`; pemanggil yang lupa menyuntikkannya
    // melewati plafon TANPA GALAT (celah yang dilaporkan S1 §6). Sekarang absennya dep
    // adalah PENOLAKAN, dengan alasannya sendiri (`ai_budget_dep_missing`) supaya salah
    // pasang tidak bisa dibaca sebagai "jatah akun penuh".
    var accountUsedBefore = 0;
    var reservation = null;
    var budgetFn = typeof deps.accountBudget === 'function' ? deps.accountBudget : null;
    if (!budgetFn) return budgetDenied(taskName, fallbackText, gate.phase, 'ai_budget_dep_missing', started, now);
    var budget;
    try {
      budget = await budgetFn({
        env: env, ctx: a.ctx, request: a.request,
        task: taskName,
        neurons: Number((spec.model && spec.model.neuronsPerRequest) || 0) || 1,
        now: started
      });
    } catch (_) {
      // Modul anggaran yang meledak = anggaran yang tidak terukur. FAIL-CLOSED.
      budget = { allowed: false, reason: 'ai_budget_unreadable', usedBefore: 0 };
    }
    if (!budget || budget.allowed !== true) {
      return budgetDenied(taskName, fallbackText, gate.phase,
        String((budget && budget.reason) || 'ai_account_cap'), started, now);
    }
    // Izin tanpa TANDA TERIMA yang sah = perakit yang mengembalikan objek permisif
    // karangan. Itu ditolak juga: satu-satunya bukti reservasi yang diterima adalah
    // tanda terima dari `ModelCallGate.makeReservation()`.
    if (!ModelCallGate.isReservation(budget)) {
      return budgetDenied(taskName, fallbackText, gate.phase, 'ai_budget_receipt_invalid', started, now);
    }
    reservation = budget;
    accountUsedBefore = Number(budget.usedBefore) || 0;

    // --- KUOTA. Satu-satunya titik pemeriksaan, dan hanya untuk permintaan yang benar-benar
    // akan memanggil provider.
    var enforceQuota = resolveEnforceQuota(deps);
    var quotaChecked = false;
    if (enforceQuota) {
      var quota;
      try {
        quota = await enforceQuota({
          env: env, ctx: a.ctx, request: a.request,
          kind: 'ai', task: taskName,
          estimatedInputTokens: AiTasks.estimateTokens(JSON.stringify(verdict.input)),
          maxOutputTokens: spec.maxOutputTokens,
          rateLimit: spec.rateLimit
        });
        quotaChecked = true;
      } catch (_) {
        // Modul kuota yang meledak tidak boleh menjadi 500 bagi murid; ia menjadi mode hemat.
        quota = { allowed: false, reason: 'quota_unavailable', retryAfter: 60 };
        quotaChecked = true;
      }
      if (quota && quota.allowed === false) {
        // A8: kode DAN kalimatnya mengikuti ALASAN sebenarnya. `quota_unavailable` berarti
        // catatan jatahnya yang mati, bukan jatah murid yang habis; keduanya nggak boleh
        // memakai satu kalimat yang sama. `copyKey` disertakan supaya klien bisa memakai
        // naskah `features/quota/quota-copy.js` alih-alih kalimat kiriman ini.
        var unavailable = String((quota && quota.reason) || '') === 'quota_unavailable';
        return json(baseResponse(taskName, {
          text: fallbackText,
          source: 'deterministic-fallback',
          degraded: true,
          breaker: gate.phase,
          error: unavailable ? 'quota_unavailable' : 'quota_exceeded',
          copyKey: unavailable ? 'quota.unavailable' : 'quota.ai.exhausted',
          message: unavailable ? POLITE.quota_unavailable : POLITE.quota_exceeded,
          retryAfter: Number(quota.retryAfter) || 3600,
          quotaChecked: true,
          // Penolakan kuota TIDAK menagih: `reserve` gagal, tidak ada reservasi yang dibuat.
          // Inilah perbedaan yang klien tidak bisa lihat sebelum A12.
          quotaCharged: false,
          usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }
        }), 429, { 'retry-after': String(Number(quota.retryAfter) || 3600) });
      }
    }

    // --- PROVIDER
    // P3 - `neuronsUsedToday` AKHIRNYA TERISI. Sebelum ini dep-nya tidak pernah
    // disuntikkan siapa pun, jadi nilainya selalu 0 dan `NEURONS.softLimit` (8.000) tidak
    // pernah bisa memicu degradasi model - satu-satunya pengaman biaya yang otomatis di
    // dalam `pickModel()` mati sejak hari pertama. Sumbernya sekarang bacaan NYATA dari
    // pagar akun di atas; `deps.neuronsUsedToday` tetap dihormati sebagai jalur suntikan
    // uji, dan yang dipakai adalah yang LEBIH BESAR (lebih hemat).
    var model = AiTasks.pickModel(taskName, {
      breaker: gate.phase,
      neuronsUsedToday: Math.max(Number(deps.neuronsUsedToday || 0), accountUsedBefore)
    });
    // P3 - payload dirakit `AiTasks.buildPayload()`, BUKAN di sini. Baris lama
    // (`response_format = {type:'json_object'}` tanpa skema, dikirim tanpa memeriksa apakah
    // model yang dipakai mendukung JSON Mode) adalah sebab terukur dua dari tiga task yang
    // mengembalikan keluaran kosong berbayar. Alasan lengkapnya di `ai-tasks.js`.
    var built = AiTasks.buildPayload(taskName, {
      input: verdict.input, locale: verdict.locale, model: model
    });
    var prompt = built.prompt;
    var payload = built.payload;

    var text = '';
    var failureKind = '';   // kosakata breaker (daftar tertutup FAILURE_KINDS)
    var failureReason = ''; // kosakata KAMI: sebab spesifik yang dicatat dan boleh dikirim klien
    var qualityRejected = false;
    var clamped = false;     // P3: jawaban dipotong di batas kalimat sebelum dikirim
    var clampedFrom = 0;     // jumlah kalimat SEBELUM dipotong (untuk audit prompt)
    var providerThrew = null; // galat mentah, dipakai untuk memutuskan pelepasan reservasi
    try {
      var result = await callProvider(env, model.id, payload, spec.timeoutMs, reservation);
      // DUA BENTUK JAWABAN dibaca sekaligus; `reasoning` hanya untuk klasifikasi sebab dan
      // TIDAK pernah menjadi kandidat teks jawaban.
      var read = AiTasks.readModelText(result);
      text = String(read.text || '').trim();
      var modelFailure = AiTasks.classifyModelFailure(read);
      if (modelFailure) {
        // `reasoning_overflow` maupun `empty_output` sama-sama badan kosong bagi breaker —
        // `empty_body` adalah satu-satunya anggota FAILURE_KINDS yang menggambarkannya, dan
        // breaker.js sengaja tidak disentuh dari paket kerja ini. Sebab spesifiknya tetap
        // terekam terpisah di `failureReason`, jadi owner bisa membedakan model yang mati
        // dari model yang membakar anggarannya di reasoning.
        failureKind = 'empty_body';
        failureReason = modelFailure;
        text = '';
      } else {
        // KONTRAK MUTU: batas kalimat, kanon kata, tidak kosong. Provider SEHAT di sini — yang
        // gagal adalah jawabannya — jadi ini TIDAK menghitung kegagalan breaker: membuka breaker
        // karena satu jawaban terlalu panjang akan mematikan AI untuk semua murid tanpa sebab
        // transport. Yang terjadi: jawaban dibuang, fallback deterministik dipakai, sebab dicatat.
        var verdictOut = AiTasks.checkOutputContract(taskName, text);
        if (!verdictOut.ok && verdictOut.reason === 'sentence_limit_exceeded' &&
            AiTasks.isClampable(taskName)) {
          // P3 - PELANGGARAN BATAS KALIMAT: DIPOTONG, BUKAN DIBUANG, BUKAN DILONGGARKAN.
          //
          // Terukur hidup: `tutor_turn` ditolak `sentence_limit_exceeded` SETIAP kali, jadi
          // murid tidak pernah menerima jawaban AI padahal neuronnya sudah dibelanjakan.
          // Tiga pilihan, dan dua di antaranya salah:
          //   - melonggarkan batas: membuang alasan batas itu ada (murid nggak boleh
          //     dibanjiri teks). DITOLAK;
          //   - membuang seluruh jawaban: batas ditegakkan pada tempat yang tidak dilihat
          //     murid, dan murid tidak menerima apa pun. Itu keadaan sekarang;
          //   - memotong di batas kalimat: batas ditegakkan PADA YANG DILIHAT MURID.
          // Hanya berlaku kalau `sentence_limit_exceeded` adalah SATU-SATUNYA pelanggaran,
          // dan hasil potongan DIPERIKSA ULANG dengan pemeriksa yang sama - potongan yang
          // malah melanggar hal lain tetap ditolak.
          var clamp = AiTasks.clampSentences(text, spec.maxSentences);
          var reCheck = clamp.clamped ? AiTasks.checkOutputContract(taskName, clamp.text) : null;
          if (reCheck && reCheck.ok) {
            text = clamp.text;
            clamped = true;
            clampedFrom = clamp.sentencesBefore;
          } else {
            qualityRejected = true;
            failureReason = verdictOut.reason;
            text = '';
          }
        } else if (!verdictOut.ok) {
          qualityRejected = true;
          failureReason = verdictOut.reason;
          text = '';
        }
      }
    } catch (error) {
      providerThrew = error;
      failureKind = Breaker.classify(signalFromError(error)) || 'unavailable';
      failureReason = failureKind;
    }

    var inTokens = AiTasks.estimateTokens(prompt);
    var outTokens = AiTasks.estimateTokens(text);

    if (typeof deps.recordFailure === 'function' && (failureKind || qualityRejected)) {
      // Dicatat server-side, tidak menggagalkan jawaban. Inilah satu-satunya jejak yang
      // membedakan "AI mati" dari "AI menjawab tetapi jawabannya ditolak".
      try {
        deps.recordFailure({
          kind: 'ai', task: taskName, model: model.id,
          reason: failureReason, breakerCounted: !!failureKind, ms: now() - started
        });
      } catch (_) { /* telemetri gagal bukan alasan menggagalkan jawaban */ }
    }

    if (qualityRejected) {
      // A12/3 — jawaban yang tidak layak tampil (termasuk `"{}"`, kosong, whitespace, JSON
      // kosong) TIDAK menagih. Reservasi dibatalkan, bukan di-commit: murid tidak boleh
      // kehilangan jatah untuk jawaban yang tidak berisi apa pun.
      var rolledBackQ = quotaChecked && await releaseQuota(deps, {
        kind: 'ai', task: taskName, reason: failureReason, request: a.request, env: env, ctx: a.ctx
      });
      // Provider dinyatakan sehat (jawabannya datang, hanya tidak layak tampil).
      var healthyQ = Breaker.onSuccess(gate.state, now());
      if (store) await store.save(breakerTarget, healthyQ, now(), { changed: gate.phase !== 'CLOSED' });
      return json(baseResponse(taskName, {
        text: fallbackText,
        source: 'deterministic-fallback',
        degraded: true,
        breaker: Breaker.snapshot(healthyQ, now()).breaker,
        message: POLITE.degraded,
        reason: failureReason,
        quotaChecked: quotaChecked,
        quotaCharged: false,
        quotaRolledBack: !!rolledBackQ,
        usage: { inputTokens: inTokens, outputTokens: 0, ms: now() - started }
      }), 200);
    }

    if (failureKind) {
      // S2 - NEURON AKUN DILEPAS kalau panggilannya tidak pernah sampai ke model
      // (binding hilang, provider menolak, galat jaringan). TIDAK dilepas untuk timeout
      // maupun jawaban kosong: di kedua keadaan itu model sudah bekerja dan neuronnya
      // sudah terbelanja. Keputusan mana yang boleh dilepas tinggal di SATU tempat
      // (`model-call-gate.js#releasableFailure`), bukan diulang di sini.
      var neuronsReleased = false;
      if (providerThrew && ModelCallGate.releasableFailure(providerThrew)) {
        neuronsReleased = await ModelCallGate.releaseReservation(reservation, failureReason || failureKind);
      }
      // Provider gagal/timeout/senyap: reservasi dibatalkan (`quota-core.js` §"Kegagalan
      // provider = rollback(), BUKAN 429").
      var rolledBackF = quotaChecked && await releaseQuota(deps, {
        kind: 'ai', task: taskName, reason: failureReason || failureKind,
        request: a.request, env: env, ctx: a.ctx
      });
      var failed = Breaker.onFailure(gate.state, failureKind, now(), 0);
      if (store) await store.save(breakerTarget, failed, now(), { changed: true, transition: true });
      var snap = Breaker.snapshot(failed, now());
      var body429 = baseResponse(taskName, {
        text: fallbackText,
        source: 'deterministic-fallback',
        degraded: true,
        breaker: snap.breaker,
        message: POLITE.degraded,
        reason: failureReason,
        retryAfter: snap.retryAfter,
        quotaChecked: quotaChecked,
        quotaCharged: false,
        quotaRolledBack: !!rolledBackF,
        // S2 - dilaporkan, bukan diklaim: `true` HANYA kalau pelepasan benar-benar
        // dijalankan dan tidak melempar.
        accountNeuronsReleased: !!neuronsReleased,
        usage: { inputTokens: inTokens, outputTokens: 0, ms: now() - started }
      });
      // Tetap 200: murid mendapat jawaban, hanya jawabannya bukan dari AI.
      return json(body429, 200);
    }

    var healthy = Breaker.onSuccess(gate.state, now());
    if (store) await store.save(breakerTarget, healthy, now(), { changed: gate.phase !== 'CLOSED' });

    if (typeof deps.recordUsage === 'function' && a.ctx && typeof a.ctx.waitUntil === 'function') {
      // Dicatat server-side, lewat waitUntil, supaya tidak menambah latensi dan tidak bisa
      // dipalsukan klien (KONTRAK ANALYTICS di EXEC-BRIEF-CF.md).
      a.ctx.waitUntil(Promise.resolve(deps.recordUsage({
        kind: 'ai', task: taskName, model: model.id,
        inputTokens: inTokens, outputTokens: outTokens,
        neurons: model.neuronsPerRequest,
        costUsd: AiTasks.estimateCostUsd(taskName, inTokens, outTokens),
        ms: now() - started
      })).catch(function () { /* telemetri gagal bukan alasan menggagalkan jawaban */ }));
    }

    var okBody = baseResponse(taskName, {
      text: text,
      source: 'provider',
      degraded: false,
      breaker: Breaker.snapshot(healthy, now()).breaker,
      quotaChecked: quotaChecked,
      // SATU-SATUNYA jalur yang menagih: jawaban provider yang lolos kontrak mutu dan benar-benar
      // dikirim ke murid. `false` di sini ketika gerbang kuota belum terpasang (`quotaChecked`
      // false) — jejaknya tetap terlihat, tidak disamarkan menjadi "tertagih".
      quotaCharged: quotaChecked === true,
      usage: { inputTokens: inTokens, outputTokens: outTokens, ms: now() - started }
    });
    if (clamped) {
      // Jawaban NYATA dari provider dan MENAGIH - model bekerja, jawabannya dipakai, hanya
      // ekornya dipotong. Ditandai supaya potongan yang sering terjadi terlihat di telemetri
      // sebagai utang perbaikan prompt, bukan tersembunyi sebagai jawaban sempurna.
      okBody.clamped = true;
      okBody.reason = 'sentence_limit_clamped';
      okBody.sentencesBefore = clampedFrom;
    }
    return json(okBody, 200);
  }

  /** Adapter: menerima Hono (`c.req.raw`, `c.env`) maupun router manual `(request, env, ctx)`. */
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

  function registerAiRoutes(router, deps) {
    if (!router || typeof router.post !== 'function') throw new Error('router_required');
    router.post('/api/ai/task', adapt(handleAiTask, deps || {}));
    return router;
  }

  return Object.freeze({
    ROUTE: '/api/ai/task',
    POLITE: POLITE,
    MAX_BODY_BYTES: MAX_BODY_BYTES,
    registerAiRoutes: registerAiRoutes,
    handleAiTask: handleAiTask,
    resolveEnforceQuota: resolveEnforceQuota,
    releaseQuota: releaseQuota,
    aiDisabledResponse: aiDisabledResponse,
    budgetDenied: budgetDenied,
    secondsToUtcMidnight: secondsToUtcMidnight,
    readProviderText: readProviderText,
    signalFromError: signalFromError
  });
}));
