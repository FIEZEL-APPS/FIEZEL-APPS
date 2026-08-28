/**
 * FIEZEL Learning Events — builder/sanitizer event telemetri belajar (Lane B).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Council audit (Opus/Sol) sepakat: satu-satunya bagian spec yang benar-benar belum
 * ada adalah lane telemetri klien. Server analytics (Lane A, route-events.js) sudah
 * hidup dan disiplin — enum tertutup, tanpa free text — tetapi TIDAK ada emitter di
 * klien, dan Lane A memang tidak boleh diperluas menjadi telemetri riset. Modul ini
 * adalah gerbang masuk TUNGGAL untuk Lane B: SEMUA event belajar wajib lahir dari
 * buildEvent(), sehingga kebijakan privasi ditegakkan oleh konstruksi, bukan oleh
 * kedisiplinan pemanggil.
 *
 * KEBIJAKAN PRIVASI YANG DITEGAKKAN OLEH KONSTRUKSI (bukan oleh konvensi)
 * -----------------------------------------------------------------------
 * 1. TANPA free text. Setiap field payload divalidasi terhadap enum TERTUTUP atau
 *    pola ID sempit. Field yang tidak ada di allowlist -> event DITOLAK (bukan
 *    dibuang diam-diam — pemanggil harus tahu payload-nya salah, meniru perilaku
 *    'foreign_field' di route-events.js).
 * 2. TANPA timestamp presisi. Waktu hanya boleh hadir sebagai `studyDay` (hari
 *    ke-berapa sejak mulai belajar, bilangan bulat) dan bucket kasar
 *    (responseTimeBucket/reviewGapBucket). Temuan Sol: timestamp presisi + itemId +
 *    kohort kecil = identitas. Nama field yang berbau waktu presisi ditolak keras.
 * 3. TANPA installId / ID stabil apa pun. Lane A sudah membuktikan unlinkability
 *    harian; Lane B tidak boleh diam-diam menghidupkan kembali identitas. Nama
 *    field berbau identitas ada di daftar terlarang dan ditolak di level kunci.
 * 4. Domain GRAMMAR SAJA dulu. Temuan council: konten reading/listening masih
 *    terkontaminasi (ratusan opsi tak terlokalisasi, evidence_mismatch) sehingga
 *    telemetrinya adalah input rusak. Enum domain sengaja beranggota satu.
 *
 * KENAPA eventId UUID DARI RNG YANG DI-INJECT
 * -------------------------------------------
 * eventId adalah kunci idempotensi: retry ambigu (timeout setelah server menerima)
 * mengirim ulang event dengan eventId SAMA, dan server melakukan dedup — temuan Sol:
 * tanpa ini, counter server tergandakan oleh retry. RNG di-inject supaya modul tetap
 * murni dan test Node bisa deterministik; default jatuh ke WebCrypto bila tersedia.
 * Math.random tanpa seed dilarang kontrak, jadi TIDAK ada fallback ke sana: tanpa
 * rng dan tanpa crypto, build DITOLAK (lebih baik kehilangan satu event telemetri
 * daripada eventId yang bisa tabrakan dan merusak dedup).
 *
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam internal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelLearningEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-learning-event-v1';

  /* ------------------------------------------------------------------ */
  /* Enum tertutup. Menambah nilai = perubahan schema yang harus direview */
  /* privasi — itulah kenapa semuanya di-freeze dan tidak bisa disuntik.  */
  /* ------------------------------------------------------------------ */

  // Grammar saja: satu-satunya domain dengan konten terpercaya (129 template
  // berbahasa Indonesia). Domain lain menyusul SETELAH QA konten selesai.
  var DOMAINS = Object.freeze(['grammar']);

  // 25 mode grammar — disalin dari kunci MODE_COST di fiezel-item-prior.js supaya
  // vocabulary telemetri identik dengan vocabulary brain (tidak ada mode "baru"
  // yang bisa menyelundupkan teks bebas).
  var MODES = Object.freeze([
    'recognize_rule', 'recognize_objective', 'recall_memory_cue', 'choose_avoidance',
    'locate_decision_cue', 'contrast_distractor_1', 'contrast_distractor_2',
    'contrast_distractor_3', 'classify_family', 'complete_sentence',
    'diagnose_distractor_1', 'apply_form', 'diagnose_distractor_2',
    'diagnose_distractor_3', 'mastery_check', 'repair_distractor_1',
    'repair_distractor_2', 'repair_distractor_3', 'label_misconception_1',
    'label_misconception_2', 'identify_misconception', 'label_misconception_3',
    'justify_correct', 'sequence_reasoning', 'teach_back'
  ]);

  // Bucket prediksi keberhasilan saat penyajian (dari successProbability brain).
  // Lebar 0.10 di tengah: cukup untuk kalibrasi, terlalu kasar untuk fingerprint.
  var PREDICTED_BUCKETS = Object.freeze(['<0.55', '0.55-0.65', '0.65-0.75', '0.75-0.85', '0.85-0.95', '>=0.95']);

  // Bucket waktu-respons. Batas 2s selaras ambang "guess" FiezelEvidenceCredibility
  // (jawaban <1.8-2s dicurigai tebakan) — bucket termuda membawa makna diagnostik.
  var RESPONSE_TIME_BUCKETS = Object.freeze(['<2s', '2-5s', '5-10s', '10-30s', '>=30s']);

  // Bucket jarak review (delayed recall). Batas 7-14d selaras half-life decay
  // ledger miskonsepsi (14 hari) dan contoh interval_bucket dari council.
  var GAP_BUCKETS = Object.freeze(['<1d', '1-3d', '3-7d', '7-14d', '14-30d', '>=30d']);

  // Bucket jumlah percobaan pada item yang sama dalam sesi.
  var ATTEMPT_BUCKETS = Object.freeze(['1', '2-3', '4+']);

  // Bucket keyakinan yang dilaporkan/diestimasi — tiga tingkat, bukan angka mentah.
  var CONFIDENCE_BUCKETS = Object.freeze(['low', 'medium', 'high']);

  // Bucket durasi sesi untuk session_summary. Kasar dengan sengaja: durasi presisi
  // + jam lokal bisa memfingerprint pola harian anak.
  var DURATION_BUCKETS = Object.freeze(['<5m', '5-15m', '15-30m', '>=30m']);

  // Level CEFR yang dipakai kurikulum grammar.
  var LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1']);

  /* ------------------------------------------------------------------ */
  /* Pola ID sempit — BUKAN free text.                                    */
  /* ------------------------------------------------------------------ */

  // lessonId/itemId: identifier konten (huruf/angka/._:-), maks 64 char. Spasi dan
  // tanda baca kalimat ditolak: kalimat tidak mungkin lolos pola ini, sehingga
  // "no free text" ditegakkan secara sintaktik, bukan hanya oleh niat baik.
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

  // Kode rationale/policy dari brain: snake_case pendek berprefix brain/brain3.
  // Kode adalah enum-terbuka-terkendali (vocabulary mesin), bukan kalimat manusia.
  var REASON_RE = /^brain3?_[a-z0-9_]{1,48}$/;

  // Versi bundle/konten: semver + hash opsional, tanpa spasi.
  var VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,79}$/;

  // Nama kunci yang DILARANG di mana pun dalam payload/ctx — lapisan pertahanan
  // kedua di bawah allowlist: kalaupun seseorang menambah field baru ke spec tanpa
  // review, nama-nama berbahaya ini tetap tertolak dengan alasan eksplisit.
  var FORBIDDEN_KEYS = Object.freeze([
    'timestamp', 'timestampms', 'ts', 'time', 'date', 'datetime', 'now', 'nowms',
    'epoch', 'clienttime', 'servertime',
    'installid', 'userid', 'user', 'owneruuid', 'owner', 'deviceid', 'sessionid',
    'studyid', 'visitortoken', 'token', 'name', 'studentname', 'email', 'phone', 'ip',
    'answer', 'answertext', 'text', 'freetext', 'prompt', 'transcript', 'note', 'comment'
  ]);

  /* ------------------------------------------------------------------ */
  /* Spesifikasi field per tipe event. Mulai dari DUA event (temuan Sol): */
  /* answer_outcome + session_summary. Bukan 17 — setiap event baru wajib */
  /* membuktikan nilai analisisnya dulu.                                  */
  /* ------------------------------------------------------------------ */

  var FIELD_SPECS = Object.freeze({
    answer_outcome: Object.freeze({
      domain: { kind: 'enum', values: DOMAINS, required: true },
      lessonId: { kind: 'id', required: true },
      itemId: { kind: 'id', required: true },
      mode: { kind: 'enum', values: MODES, required: true },
      correct: { kind: 'bool', required: true },
      responseTimeBucket: { kind: 'enum', values: RESPONSE_TIME_BUCKETS, required: true },
      predictedBucket: { kind: 'enum', values: PREDICTED_BUCKETS, required: false },
      attemptBucket: { kind: 'enum', values: ATTEMPT_BUCKETS, required: false },
      reviewGapBucket: { kind: 'enum', values: GAP_BUCKETS, required: false },
      hint: { kind: 'bool', required: false },
      confidenceBucket: { kind: 'enum', values: CONFIDENCE_BUCKETS, required: false },
      decisionReason: { kind: 'reason', required: false }
    }),
    session_summary: Object.freeze({
      domain: { kind: 'enum', values: DOMAINS, required: true },
      level: { kind: 'enum', values: LEVELS, required: true },
      planned: { kind: 'count', required: true },
      answered: { kind: 'count', required: true },
      completed: { kind: 'bool', required: true },
      durationBucket: { kind: 'enum', values: DURATION_BUCKETS, required: true },
      policy: { kind: 'reason', required: false }
    })
  });

  var EVENT_TYPES = Object.freeze(Object.keys(FIELD_SPECS));

  // Kunci ctx yang dikenal. `rng` tidak pernah disalin ke event — hanya dipakai.
  var CTX_KEYS = Object.freeze(['studyDay', 'brainBundle', 'contentVersion', 'rng']);

  /* ------------------------------------------------------------------ */
  /* Util kecil.                                                          */
  /* ------------------------------------------------------------------ */

  function isPlainObject(x) {
    return !!x && typeof x === 'object' && !Array.isArray(x);
  }

  function reject(reason, detail) {
    // Setiap penolakan membawa rationale brain3_ + confidence 1: penolakan di sini
    // adalah keputusan deterministik terhadap aturan schema, bukan tebakan.
    var out = { ok: false, reason: reason, rationale: 'brain3_lt_reject_' + reason, confidence: 1 };
    if (detail !== undefined) out.detail = detail;
    return out;
  }

  function findForbiddenKey(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (FORBIDDEN_KEYS.indexOf(keys[i].toLowerCase()) !== -1) return keys[i];
    }
    return null;
  }

  /**
   * UUIDv4 dari fungsi rng yang di-inject (rng() -> [0,1)), atau WebCrypto bila
   * tersedia. Return null bila tidak ada sumber acak sama sekali — pemanggil
   * (buildEvent) mengubah null menjadi penolakan eksplisit.
   */
  function makeUuid(rng) {
    var bytes = new Array(16);
    var i;
    if (typeof rng === 'function') {
      for (i = 0; i < 16; i++) {
        var v = Math.floor(rng() * 256);
        // rng jelek (NaN/di luar rentang) tidak boleh menghasilkan UUID setengah
        // valid yang tabrakan — lebih baik gagal terang-terangan.
        if (!(v >= 0 && v <= 255)) return null;
        bytes[i] = v;
      }
    } else {
      var c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
      if (c && typeof c.randomUUID === 'function') return c.randomUUID();
      if (c && typeof c.getRandomValues === 'function') {
        var buf = new Uint8Array(16);
        c.getRandomValues(buf);
        for (i = 0; i < 16; i++) bytes[i] = buf[i];
      } else {
        return null;
      }
    }
    // Bit versi (4) dan varian (10xx) sesuai RFC 4122.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = '';
    for (i = 0; i < 16; i++) hex += (bytes[i] + 0x100).toString(16).slice(1);
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' + hex.slice(20);
  }

  /* ------------------------------------------------------------------ */
  /* Helper bucket — supaya SEMUA pemanggil membucket dengan cara yang     */
  /* sama persis; nilai mentah tidak pernah perlu keluar dari app.js.      */
  /* ------------------------------------------------------------------ */

  function bucketResponseTime(ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return null;
    if (ms < 2000) return '<2s';
    if (ms < 5000) return '2-5s';
    if (ms < 10000) return '5-10s';
    if (ms < 30000) return '10-30s';
    return '>=30s';
  }

  function bucketGapDays(days) {
    if (typeof days !== 'number' || !isFinite(days) || days < 0) return null;
    if (days < 1) return '<1d';
    if (days < 3) return '1-3d';
    if (days < 7) return '3-7d';
    if (days < 14) return '7-14d';
    if (days < 30) return '14-30d';
    return '>=30d';
  }

  function bucketPrediction(p) {
    if (typeof p !== 'number' || !isFinite(p) || p < 0 || p > 1) return null;
    if (p < 0.55) return '<0.55';
    if (p < 0.65) return '0.55-0.65';
    if (p < 0.75) return '0.65-0.75';
    if (p < 0.85) return '0.75-0.85';
    if (p < 0.95) return '0.85-0.95';
    return '>=0.95';
  }

  function bucketAttempts(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 1) return null;
    if (n < 2) return '1';
    if (n < 4) return '2-3';
    return '4+';
  }

  function bucketDurationMinutes(min) {
    if (typeof min !== 'number' || !isFinite(min) || min < 0) return null;
    if (min < 5) return '<5m';
    if (min < 15) return '5-15m';
    if (min < 30) return '15-30m';
    return '>=30m';
  }

  /* ------------------------------------------------------------------ */
  /* Validator satu field terhadap spec-nya.                              */
  /* ------------------------------------------------------------------ */

  function validateField(kind, values, v) {
    switch (kind) {
      case 'enum':
        return typeof v === 'string' && values.indexOf(v) !== -1;
      case 'bool':
        return v === true || v === false;
      case 'id':
        return typeof v === 'string' && ID_RE.test(v);
      case 'reason':
        return typeof v === 'string' && REASON_RE.test(v);
      case 'count':
        // Hitungan sesi: bulat, non-negatif, plafon 500 — di atas itu pasti bug,
        // dan angka absurd bisa jadi kanal penyelundupan data.
        return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 0 && v <= 500;
      default:
        return false;
    }
  }

  /**
   * buildEvent(type, payload, ctx) -> {ok:true, event, rationale, confidence}
   *                                 | {ok:false, reason, rationale, confidence}
   *
   * ctx = { studyDay (wajib, bulat >=0), brainBundle?, contentVersion?, rng? }.
   * Event hasil selalu objek BARU yang dibekukan (freeze) — payload pemanggil tidak
   * pernah dirujuk langsung, supaya mutasi belakangan tidak bisa menyusupkan field.
   */
  function buildEvent(type, payload, ctx) {
    if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(FIELD_SPECS, type)) {
      return reject('unknown_type', type);
    }
    if (!isPlainObject(payload)) return reject('bad_payload');
    if (!isPlainObject(ctx)) return reject('bad_ctx');

    // Lapisan 1: nama kunci terlarang ditolak dengan pesan spesifik, di payload
    // maupun ctx — supaya "kenapa ditolak" langsung jelas saat review.
    var bad = findForbiddenKey(payload) || findForbiddenKey(ctx);
    if (bad) return reject('forbidden_field', bad);

    // Lapisan 2: ctx hanya boleh berisi kunci yang dikenal. ctx memang tidak
    // diserialisasi utuh, tapi menolak kunci asing mencegah pemanggil MENGIRA
    // datanya ikut terkirim padahal dibuang diam-diam.
    var ctxKeys = Object.keys(ctx);
    var i;
    for (i = 0; i < ctxKeys.length; i++) {
      if (CTX_KEYS.indexOf(ctxKeys[i]) === -1) return reject('unknown_ctx_field', ctxKeys[i]);
    }

    // studyDay: satu-satunya representasi waktu yang diizinkan pada event.
    var day = ctx.studyDay;
    if (typeof day !== 'number' || !isFinite(day) || Math.floor(day) !== day || day < 0 || day > 100000) {
      return reject('bad_study_day');
    }

    var spec = FIELD_SPECS[type];

    // Lapisan 3: allowlist ketat — field payload yang tidak ada di spec = tolak.
    var pKeys = Object.keys(payload);
    for (i = 0; i < pKeys.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(spec, pKeys[i])) {
        return reject('unknown_field', pKeys[i]);
      }
    }

    // Validasi nilai + salin HANYA field yang lolos ke objek baru.
    var clean = {};
    var specKeys = Object.keys(spec);
    for (i = 0; i < specKeys.length; i++) {
      var k = specKeys[i];
      var fs = spec[k];
      var has = Object.prototype.hasOwnProperty.call(payload, k) && payload[k] !== undefined;
      if (!has) {
        if (fs.required) return reject('missing_field', k);
        continue;
      }
      if (!validateField(fs.kind, fs.values, payload[k])) return reject('invalid_field', k);
      clean[k] = payload[k];
    }

    // Metadata versi opsional: perlu untuk atribusi "bundle mana yang menghasilkan
    // keputusan ini" (decision trace), dan aman karena rendah kardinalitas.
    var brainBundle = null;
    if (ctx.brainBundle !== undefined) {
      if (typeof ctx.brainBundle !== 'string' || !VERSION_RE.test(ctx.brainBundle)) return reject('bad_brain_bundle');
      brainBundle = ctx.brainBundle;
    }
    var contentVersion = null;
    if (ctx.contentVersion !== undefined) {
      if (typeof ctx.contentVersion !== 'string' || !VERSION_RE.test(ctx.contentVersion)) return reject('bad_content_version');
      contentVersion = ctx.contentVersion;
    }
    if (ctx.rng !== undefined && typeof ctx.rng !== 'function') return reject('bad_rng');

    var eventId = makeUuid(ctx.rng);
    if (!eventId) return reject('no_rng');

    var event = {
      schema: SCHEMA,
      eventId: eventId,
      eventType: type,
      studyDay: day,
      payload: Object.freeze(clean)
    };
    if (brainBundle) event.brainBundle = brainBundle;
    if (contentVersion) event.contentVersion = contentVersion;
    Object.freeze(event);

    return { ok: true, event: event, rationale: 'brain3_lt_event_built', confidence: 1 };
  }

  return {
    SCHEMA: SCHEMA,
    EVENT_TYPES: EVENT_TYPES,
    ENUMS: Object.freeze({
      DOMAINS: DOMAINS,
      MODES: MODES,
      PREDICTED_BUCKETS: PREDICTED_BUCKETS,
      RESPONSE_TIME_BUCKETS: RESPONSE_TIME_BUCKETS,
      GAP_BUCKETS: GAP_BUCKETS,
      ATTEMPT_BUCKETS: ATTEMPT_BUCKETS,
      CONFIDENCE_BUCKETS: CONFIDENCE_BUCKETS,
      DURATION_BUCKETS: DURATION_BUCKETS,
      LEVELS: LEVELS
    }),
    FORBIDDEN_KEYS: FORBIDDEN_KEYS,
    buildEvent: buildEvent,
    bucketResponseTime: bucketResponseTime,
    bucketGapDays: bucketGapDays,
    bucketPrediction: bucketPrediction,
    bucketAttempts: bucketAttempts,
    bucketDurationMinutes: bucketDurationMinutes
  };
});
