/**
 * FIEZEL Braincore Evidence v1 — bukti MINIMUM untuk MENILAI MESIN (Fase 2 / Phase K).
 *
 * ====================================================================================
 * KENAPA SKEMA BARU, PADAHAL `fiezel-learner-evidence-v1` SUDAH ADA.
 *
 * Skema itu ada di app.js dan sudah punya gerbangnya sendiri. Ia MENJELASKAN MURID:
 * keterampilan yang terukur, risiko lupa, jendela belajar, kalibrasi kepercayaan diri —
 * agregat 30 hari, untuk kebutuhan murid itu sendiri.
 *
 * Yang dibutuhkan Fase K adalah kebalikan arahnya: bukti untuk MENILAI MESIN. Pertanyaannya
 * bukan "bagaimana kabar murid ini", melainkan "apakah keputusan yang diambil mesin itu
 * MEMBANTU". Satu field memisahkan keduanya dan tidak ada di skema lama:
 *
 *     postInterventionOutcome — sesudah mesin memutuskan hint/reteach, apa yang terjadi?
 *
 * Tanpa field itu, semua bukti dunia hanya bisa memberi tahu kita bahwa murid kesulitan.
 * Dengan field itu, ia bisa memberi tahu apakah SENTUHAN MESIN mengubah sesuatu. Itulah
 * satu-satunya hal yang tidak bisa dijawab satu pun murid sintetis di Fase C sampai J.
 *
 * Karena itu keduanya HIDUP BERDAMPINGAN, dan tidak ada yang menggantikan yang lain.
 * ====================================================================================
 *
 * PRINSIP: BUKTI MINIMUM. Setiap field harus menjawab "keputusan evaluasi apa yang MUSTAHIL
 * diambil tanpa ini?" Yang tidak lolos pertanyaan itu tidak masuk — bukan karena hemat, tetapi
 * karena setiap field yang dikumpulkan tanpa keperluan adalah utang privasi yang dibayar murid.
 *
 * APA YANG SENGAJA TIDAK ADA, dan alasannya:
 *   - tanpa STEMPEL WAKTU. Urutan dibawa `attemptNumber`. Waktu berketelitian milidetik
 *     mengubah kumpulan catatan menjadi sidik jari sesi yang bisa dipautkan lintas berkas.
 *   - tanpa teks jawaban, tanpa teks soal. `questionId` menunjuk ITEM, bukan orang.
 *   - tanpa identitas apa pun. Daftar FORBIDDEN_KEYS ditegakkan dengan MELEMPAR, bukan
 *     dibersihkan diam-diam: pembersihan senyap membuat kebocoran terlihat seperti keberhasilan.
 *   - waktu jawab hanya sebagai EMBER (guess/fast/normal/slow), bukan angka. Milidetik mentah
 *     lebih presisi daripada yang dibutuhkan evaluasi mana pun dan cukup untuk mengenali orang.
 *
 * MURNI. Tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam, tanpa acak. Modul ini
 * MEMBENTUK catatan; ia tidak pernah mengirimnya ke mana pun. Tidak ada satu baris pun di sini
 * yang tahu bagaimana caranya bicara dengan server, dan itu disengaja (lihat Fase M).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  if (root) root.FiezelBraincoreEvidence = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-braincore-evidence-v1';

  /** Kunci yang tidak boleh ada di kedalaman mana pun. Sama dengan Decision Trace, karena
   *  batas privasinya memang satu dan sama. */
  var FORBIDDEN_KEYS = Object.freeze([
    'userId', 'user_id', 'uuid', 'ownerUuid', 'installId', 'install_id', 'deviceId',
    'device_id', 'email', 'name', 'userName', 'learnerName', 'ip', 'ipAddress',
    'token', 'sessionToken', 'cookie', 'answerText', 'typedAnswer', 'rawAnswer', 'script',
    // Tambahan khusus skema ini: waktu adalah pemaut. Ordinal boleh, jam tidak.
    'at', 'timestamp', 'startedAt', 'sessionId'
  ]);

  /** Tindakan mesin yang layak dinilai. Kosakata tertutup; nilai asing ditolak. */
  var INTERVENTIONS = Object.freeze(['none', 'hint', 'reteach', 'review', 'advance', 'stop']);

  /** Ember waktu jawab. Batasnya mengikuti FiezelTutorBrain.classifyTiming supaya bukti yang
   *  dikumpulkan bisa dibandingkan dengan keputusan yang diambil saat itu. */
  var TIME_BUCKETS = Object.freeze(['guess', 'retrieved', 'reasoned', 'struggled', 'unknown']);

  var OUTCOMES = Object.freeze(['correct', 'incorrect', 'unknown']);

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  function assertNotTelemetry(obj, path) {
    if (!obj || typeof obj !== 'object') return;
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (FORBIDDEN_KEYS.indexOf(k) !== -1) {
        throw new Error(SCHEMA + ': field identitas/pemaut terlarang "' + k + '" di '
          + (path || '<root>') + '. Bukti evaluasi tidak boleh bisa menunjuk seorang murid.');
      }
      if (obj[k] && typeof obj[k] === 'object') assertNotTelemetry(obj[k], (path ? path + '.' : '') + k);
    }
  }

  function pickEnum(value, allowed, field) {
    var t = str(value).trim();
    if (!t) return allowed[allowed.length - 1];         // 'unknown' selalu terakhir
    if (allowed.indexOf(t) === -1) {
      throw new Error(SCHEMA + ': ' + field + ' "' + t + '" di luar kosakata tertutup');
    }
    return t;
  }

  /** Id item/konsep: slug pendek. Bukan teks bebas — teks bebas adalah tempat nama menyelinap. */
  function slug(v, field, wajib) {
    var t = str(v).trim();
    if (!t) {
      if (wajib) throw new Error(SCHEMA + ': ' + field + ' wajib diisi');
      return null;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(t)) {
      throw new Error(SCHEMA + ': ' + field + ' "' + t + '" bukan id pendek yang sah');
    }
    return t;
  }

  function ordinal(v, field) {
    var n = Number(v);
    if (!isFinite(n) || n < 1 || Math.floor(n) !== n) {
      throw new Error(SCHEMA + ': ' + field + ' harus bilangan bulat >= 1, bukan ' + str(v));
    }
    return n;
  }

  /**
   * Satu catatan bukti.
   *
   * @param {object} input
   * @param {string} input.conceptId            konsep yang diuji
   * @param {string} input.questionId           item (menunjuk SOAL, bukan orang)
   * @param {string} input.outcome              correct | incorrect | unknown
   * @param {number} input.attemptNumber        percobaan ke-berapa pada konsep ini (>= 1)
   * @param {number} input.difficulty           kesulitan efektif saat disajikan
   * @param {string} input.intervention          apa yang mesin putuskan SESUDAH jawaban ini
   * @param {string} input.postInterventionOutcome  hasil percobaan BERIKUTNYA pada konsep yang sama
   * @param {string} input.misconceptionCode    kode miskonsepsi, bila ADA buktinya
   * @param {string} input.responseTimeBucket   ember, bukan milidetik
   * @param {string} input.braincoreVersion     tanpa ini, bukti lintas rilis tidak bisa dipisahkan
   */
  function build(input) {
    var src = input && typeof input === 'object' ? input : {};
    assertNotTelemetry(src);

    var rec = {
      schema: SCHEMA,
      braincoreVersion: slug(src.braincoreVersion, 'braincoreVersion', false),
      conceptId: slug(src.conceptId, 'conceptId', true),
      questionId: slug(src.questionId, 'questionId', false),
      attemptNumber: ordinal(src.attemptNumber, 'attemptNumber'),
      difficulty: isFinite(Number(src.difficulty)) ? Math.round(Number(src.difficulty) * 100) / 100 : null,
      responseTimeBucket: pickEnum(src.responseTimeBucket, TIME_BUCKETS, 'responseTimeBucket'),
      outcome: pickEnum(src.outcome, OUTCOMES, 'outcome'),
      intervention: pickEnum(src.intervention, INTERVENTIONS, 'intervention'),
      // INI field yang membuat seluruh skema ini berguna. null berarti BELUM DIKETAHUI —
      // murid belum kembali ke konsep ini — dan itu BUKAN 'incorrect'. Menyamakan
      // "belum terjawab" dengan "gagal" akan membuat setiap intervensi terlihat sia-sia.
      postInterventionOutcome: src.postInterventionOutcome === null
        || src.postInterventionOutcome === undefined || src.postInterventionOutcome === ''
        ? null : pickEnum(src.postInterventionOutcome, OUTCOMES, 'postInterventionOutcome'),
      // Hanya diisi bila memang ADA bukti miskonsepsi. Kunci 'unclassified:*' yang dikarang
      // diagnosis saat soal tidak membawa peta miskonsepsi DITOLAK di sini — lihat AUDIT/10 §4.
      misconceptionCode: null
    };

    var mis = str(src.misconceptionCode).trim();
    if (mis) {
      if (/^unclassified:/.test(mis)) {
        throw new Error(SCHEMA + ': misconceptionCode "' + mis + '" adalah kunci sintetis, bukan '
          + 'bukti miskonsepsi. Mengumpulkannya akan mengubah "salah dua kali" menjadi '
          + '"miskonsepsi" di dalam data (AUDIT/10 §4).');
      }
      rec.misconceptionCode = slug(mis, 'misconceptionCode', false);
    }

    return Object.freeze(rec);
  }

  /**
   * Bentuk catatan bukti dari DUA trace berurutan pada konsep yang sama.
   *
   * Inilah alasan skema ini evaluatif, bukan deskriptif: sebuah catatan hanya bermakna sebagai
   * PASANGAN (keputusan -> apa yang terjadi sesudahnya). Satu trace sendirian tidak pernah bisa
   * menjawab "apakah intervensinya membantu".
   *
   * `next` boleh null: artinya murid belum kembali ke konsep ini, dan hasilnya BELUM DIKETAHUI.
   */
  function fromTraces(trace, next, opts) {
    if (!trace || typeof trace !== 'object') throw new Error(SCHEMA + ': trace wajib');
    var o = opts || {};
    if (next && str(next.conceptId) !== str(trace.conceptId)) {
      throw new Error(SCHEMA + ': trace berikutnya menguji konsep lain ('
        + str(next.conceptId) + ' != ' + str(trace.conceptId) + '); pasangannya tidak sah');
    }
    var ev = trace.evidence || {};
    return build({
      braincoreVersion: trace.braincoreVersion,
      conceptId: trace.conceptId,
      questionId: o.questionId,
      attemptNumber: ordinal(o.attemptNumber, 'attemptNumber'),
      difficulty: trace.difficultyState ? trace.difficultyState.effective : null,
      responseTimeBucket: ev.timing || 'unknown',
      outcome: ev.correct === true ? 'correct' : ev.correct === false ? 'incorrect' : 'unknown',
      intervention: mapIntervention(trace.decision),
      postInterventionOutcome: !next ? null
        : (next.evidence.correct === true ? 'correct'
          : next.evidence.correct === false ? 'incorrect' : 'unknown'),
      misconceptionCode: trace.misconceptionState ? trace.misconceptionState.topCode : null
    });
  }

  /** Keputusan trace -> kosakata intervensi. 'continue' bukan intervensi: tidak melakukan apa-apa
   *  adalah keadaan dasar, dan menghitungnya sebagai tindakan akan membuat setiap sesi terlihat
   *  penuh intervensi. */
  function mapIntervention(decision) {
    var d = str(decision).toLowerCase();
    if (d === 'hint' || d === 'reteach' || d === 'review' || d === 'advance' || d === 'stop') return d;
    return 'none';
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    FORBIDDEN_KEYS: FORBIDDEN_KEYS,
    INTERVENTIONS: INTERVENTIONS,
    TIME_BUCKETS: TIME_BUCKETS,
    OUTCOMES: OUTCOMES,
    build: build,
    fromTraces: fromTraces,
    mapIntervention: mapIntervention
  });
});
