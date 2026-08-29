/**
 * FIEZEL SRL Coach v1 — micro-loop regulasi belajar offline (Braincore v3, modul C4).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * FIEZEL sudah mengumpulkan penilaian keyakinan murid lewat setConfidence(), tetapi angka
 * itu berhenti sebagai catatan — tidak pernah dipulangkan kepada murid sebagai umpan balik
 * kalibrasi. Padahal selisih antara keyakinan dan hasil nyata (judgment of learning vs
 * outcome) adalah ukuran metakognitif yang bisa DILATIH, dan meta-analisis scaffolding SRL
 * menemukan efek g = 0.44-0.69 dengan biaya implementasi kecil (opus C9). Micro-loop yang
 * dipakai mengikuti gpt_5_6_sol §7.8: (1) sebelum sesi murid memilih tujuan, (2) di tengah
 * sesi murid menaksir keyakinan pada SATU item, (3) di akhir sesi taksiran dibandingkan
 * dengan hasil dan dipulangkan sebagai pesan kalibrasi yang menyebut KONTEN dan ANGKA.
 *
 * TIGA DISIPLIN YANG DIJAGA (keduanya dari konsensus council)
 * -----------------------------------------------------------
 * 1. JARANG, BUKAN CEREWET. Prompt keyakinan maksimal SATU kali per sesi, hanya pada item
 *    ke-2..4 (cukup awal untuk dipelajari ulang, tidak di item pertama yang masih pemanasan).
 *    Prompt generik yang muncul terus-menerus justru menurunkan efeknya — scaffold SRL yang
 *    bekerja adalah yang spesifik-konten dan hemat.
 * 2. TIDAK MENAMBAH BEBAN SAAT MURID SEDANG GAGAL. Saat afek terbaca frustrasi, prompt
 *    keyakinan TIDAK PERNAH muncul: meminta murid menaksir peluang benar tepat ketika ia
 *    beruntun salah adalah menambah muatan kognitif pada momen terburuknya.
 * 3. FADING. Prompt harus pergi ketika tidak lagi membantu: tiga sesi berturut-turut dengan
 *    kalibrasi baik (|bias| < 0.1) berarti murid sudah bisa menaksir sendiri — prompt
 *    berhenti selama lima sesi (rationale brain3_srl_faded). Bila kalibrasi memburuk lagi,
 *    prompt bangun lagi. Scaffold yang tidak pernah dilepas bukan scaffold, melainkan kruk.
 *
 * BAHASA PESAN (aturan keras)
 * ---------------------------
 * Pesan TIDAK PERNAH memuji sifat orangnya dan TIDAK PERNAH menempelkan label sifat pada
 * murid. Yang dinilai selalu TINDAKAN yang bisa diulang atau diubah: "taksiranmu cocok
 * dengan hasil — pertahankan cara menaksirnya", bukan pujian atas dirinya. Klaim selalu
 * lokal dan berbukti angka ("kamu yakin 95% di conditionals tapi benar 60%"), tidak pernah
 * generik ("belajarmu bagus!") — pesan generik tidak mengajarkan apa-apa.
 *
 * KEMURNIAN & KETAHANAN
 * ---------------------
 * Murni: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random, tanpa Date.now() —
 * waktu selalu argumen (nowMs). Semua fungsi mengembalikan objek BARU yang dibekukan
 * (Object.freeze); argumen tidak pernah disentuh. State korup (null, string, schema asing,
 * field bertipe salah) tidak pernah melempar — diganti state kosong, karena localStorage
 * di perangkat murid bisa rusak dan sesi belajar tidak boleh ikut mati karenanya.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSrlCoach = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-srl-coach-v1';

  // Parameter kebijakan — konstanta bernama supaya gate menguji angkanya, bukan menebak.
  var SCALE = [0.25, 0.5, 0.75, 0.95]; // skala taksiran keyakinan (kontrak FINAL)
  var PREDICT_MIN_INDEX = 2;           // prompt hanya boleh di item ke-2..4:
  var PREDICT_MAX_INDEX = 4;           //   item #1 masih pemanasan, item akhir sudah lelah
  var BIAS_GOOD = 0.1;                 // |bias| < 0.1 = kalibrasi baik untuk sesi itu
  var GOOD_STREAK_TO_FADE = 3;         // tiga sesi baik berturut-turut -> scaffold dilepas
  var FADE_SESSIONS = 5;               // lamanya prompt tidur setelah dilepas
  var MAX_HISTORY = 40;                // riwayat kalibrasi per sesi yang disimpan di state

  // ---- dasar -------------------------------------------------------------------------

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function intIn(value, min, max) {
    var n = Math.round(num(value, min));
    return Math.max(min, Math.min(max, n));
  }
  function str(value) { return value == null ? '' : String(value).trim(); }
  function round(value, digits) {
    var f = Math.pow(10, digits === undefined ? 4 : digits);
    return Math.round(num(value) * f) / f;
  }
  function pct(value) { return Math.round(num(value) * 100) + '%'; }
  function freeze(obj) {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(function (k) { freeze(obj[k]); });
      Object.freeze(obj);
    }
    return obj;
  }

  /** Nama konten teknis ('past_simple_vs_present_perfect') dijadikan frasa yang bisa
   *  diucapkan. Pesan kalibrasi wajib menyebut KONTEN — nama yang tidak terbaca sama
   *  buruknya dengan tidak menyebut nama. */
  function humanize(name) {
    return str(name).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // ---- validasi state (tahan korupsi) --------------------------------------------------

  function emptyState() {
    return {
      schema: SCHEMA,
      sessionsCompleted: 0, // berapa sesi sudah direfleksikan (juga penggeser jendela prompt)
      goodStreak: 0,        // sesi kalibrasi-baik berturut-turut (bahan pemicu fading)
      fadedRemaining: 0,    // >0 berarti prompt sedang tidur sebanyak ini sesi lagi
      history: []           // riwayat kalibrasi per sesi: {at, n, bias, accuracy, good, faded}
    };
  }

  /** Satu entri riwayat yang rusak dibuang diam-diam; ia catatan, bukan penggerak keputusan,
   *  dan satu entri korup tidak boleh mematikan seluruh coach. */
  function sanitizeHistoryEntry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return {
      at: num(raw.at, 0),
      n: intIn(raw.n, 0, 999),
      bias: round(num(raw.bias, 0), 4),
      accuracy: round(Math.max(0, Math.min(1, num(raw.accuracy, 0))), 4),
      good: raw.good === true,
      faded: raw.faded === true
    };
  }

  /** State apa pun yang bukan objek ber-schema benar diganti state kosong. Angka inti
   *  di-clamp ke rentang masuk akal supaya nilai liar (mis. fadedRemaining 9e9 dari
   *  storage korup) tidak membuat prompt tidur selamanya. */
  function sanitizeState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== SCHEMA) {
      return emptyState();
    }
    var history = [];
    if (Array.isArray(raw.history)) {
      for (var i = 0; i < raw.history.length && history.length < MAX_HISTORY; i++) {
        var entry = sanitizeHistoryEntry(raw.history[i]);
        if (entry) history.push(entry);
      }
    }
    return {
      schema: SCHEMA,
      sessionsCompleted: intIn(raw.sessionsCompleted, 0, 1000000),
      goodStreak: intIn(raw.goodStreak, 0, GOOD_STREAK_TO_FADE),
      fadedRemaining: intIn(raw.fadedRemaining, 0, FADE_SESSIONS),
      history: history
    };
  }

  // ---- (1) tujuan sesi -----------------------------------------------------------------

  /**
   * sessionPlan(state, {suggestedFocus, sessionSize}, nowMs) -> {goalPrompt, rationale}
   *
   * Murid MEMILIH tujuan, bukan diberi tujuan: penetapan tujuan oleh diri sendiri adalah
   * fase pertama micro-loop SRL (§7.8), dan pilihan yang dimiliki sendiri lebih mungkin
   * dikejar. Tiga pilihan tetap:
   *   1. fokus ke titik rawan BERNAMA (dari suggestedFocus — spesifik-konten, bukan
   *      "perbaiki kesalahanmu" yang generik),
   *   2. review materi yang mendekati jadwal lupa,
   *   3. bebas (murid terkalibrasi baik layak diberi otonomi — opus C9).
   */
  var NASKAH_ID = Object.freeze({
    'brain-srl.focus-named': 'Perkuat ' + '{focus}' + ' — di situ jawabanmu paling sering meleset belakangan ini',
    'brain-srl.focus-generic': 'Perkuat bagian yang jawabannya paling sering meleset belakangan ini',
    'brain-srl.goal-ask': 'Mau ke mana sesi ini' + '{size}' + '?',
    'brain-srl.goal-size': ' (' + '{n}' + ' soal)',
    'brain-srl.option-review': 'Ulang materi yang mendekati jadwal lupa, supaya tidak perlu dipelajari dari nol lagi',
    'brain-srl.option-free': 'Bebas — campuran materi, kamu yang pegang kemudi',
    'brain-srl.predict-ask': 'Seberapa yakin jawabanmu akan benar?',
    'brain-srl.group-fallback': 'materi sesi ini',
    'brain-srl.calib-over': 'Kamu yakin ' + '{conf}' + ' di ' + '{name}' + ' tapi benar ' + '{acc}' + '. Taksiranmu lebih tinggi dari hasilnya — sebelum memilih jawaban, sebutkan dulu ' + 'aturannya dalam satu kalimat; kalau kalimat itu tidak keluar, turunkan taksiranmu.',
    'brain-srl.calib-under': 'Kamu menaksir ' + '{conf}' + ' di ' + '{name}' + ' padahal benar ' + '{acc}' + '. Jawabanmu lebih tepat dari taksiranmu — saat pola soalnya sudah pernah kamu ' + 'kerjakan dengan benar, berani pasang taksiran yang lebih tinggi.',
    'brain-srl.calib-good': 'Taksiranmu di ' + '{name}' + ' (' + '{conf}' + ') cocok dengan hasilnya (' + '{acc}' + '). Cara menaksir seperti ini layak dipertahankan — lanjutkan menaksir sebelum melihat kunci.',
    'brain-srl.reflect-no-data': 'Sesi ini tidak ada taksiran keyakinan yang bisa dibandingkan dengan hasil.',
    'brain-srl.faded-note': ' Tiga sesi berturut-turut taksiranmu akurat, jadi pertanyaan ' + 'keyakinan akan berhenti muncul selama ' + '{n}' + ' sesi ke depan.'
  });

  /* Injeksi naskah OPSIONAL (W2-FEAT-A, desain W1-FEAT-A): NASKAH_ID di bawah adalah
   * baseline byte-identik dengan naskah beku gerbang emas. Pemanggil boleh menitipkan
   * tabel pengganti per-kunci (mis. terjemahan th yang dirakit app dari copy-map i18n).
   * Fallback per-kunci: kunci yang tidak ada di tabel titipan jatuh ke NASKAH_ID —
   * modul ini TIDAK menyentuh lapisan i18n, kemurnian brain dipertahankan (AI-08 F01). */
  function lineFor(T, key) {
    return (T && typeof T[key] === 'string') ? T[key] : NASKAH_ID[key];
  }
  function fill(text, params) {
    return String(text).replace(/\{(\w+)\}/g, function (m, name) {
      return params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m;
    });
  }

  function sessionPlan(state, opts, nowMs) {
    var st = sanitizeState(state);
    var o = opts && typeof opts === 'object' ? opts : {};
    var T = (o.naskah && typeof o.naskah === 'object') ? o.naskah : null;
    var focusRaw = Array.isArray(o.suggestedFocus) ? o.suggestedFocus[0] : o.suggestedFocus;
    var focus = humanize(focusRaw);
    var size = intIn(o.sessionSize, 0, 200);

    // Naskah spesifik-konten: bila ada titik rawan bernama, sebut namanya. Kalimatnya
    // menunjuk POLA JAWABAN ("paling sering meleset"), bukan sifat orangnya.
    var focusLabel = focus
      ? fill(lineFor(T, 'brain-srl.focus-named'), { focus: focus })
      : lineFor(T, 'brain-srl.focus-generic');

    var goalPrompt = {
      ask: fill(lineFor(T, 'brain-srl.goal-ask'), { size: size > 0 ? fill(lineFor(T, 'brain-srl.goal-size'), { n: size }) : '' }),
      options: [
        { id: 'focus_weak', label: focusLabel, target: focus || null },
        {
          id: 'review_due',
          label: lineFor(T, 'brain-srl.option-review'),
          target: null
        },
        { id: 'free', label: lineFor(T, 'brain-srl.option-free'), target: null }
      ]
    };

    return freeze({
      goalPrompt: goalPrompt,
      rationale: 'brain3_srl_goal_choice',
      at: num(nowMs, 0)
    });
  }

  // ---- (2) prompt taksiran keyakinan -----------------------------------------------------

  /**
   * predictPrompt(state, {itemIndex, sessionSize, affect}) -> null | {ask, scale, rationale}
   *
   * MAKSIMAL SATU per sesi: null di semua itemIndex kecuali satu indeks sasaran yang
   * deterministik dari state (2 + sessionsCompleted mod 3, di-clamp ke jendela 2..4 dan ke
   * panjang sesi). Indeks digilir antar sesi supaya murid tidak menghafal "pertanyaan
   * keyakinan selalu di soal ketiga" lalu menjawabnya otomatis tanpa menaksir sungguhan.
   *
   * null bila:
   *   - affect === 'frustrated' (menambah beban tepat saat murid gagal adalah kesalahan),
   *   - sedang faded (kalibrasi sudah baik tiga sesi — scaffold dilepas),
   *   - sesi terlalu pendek untuk jendela 2..4.
   */
  function predictPrompt(state, opts) {
    var st = sanitizeState(state);
    var o = opts && typeof opts === 'object' ? opts : {};
    var itemIndex = intIn(o.itemIndex, 0, 100000);
    var size = intIn(o.sessionSize, 0, 100000);
    var T = (o.naskah && typeof o.naskah === 'object') ? o.naskah : null;

    if (str(o.affect) === 'frustrated') return null;   // jangan tambah muatan saat gagal
    if (st.fadedRemaining > 0) return null;            // scaffold sedang dilepas (faded)
    if (size < PREDICT_MIN_INDEX) return null;         // tidak ada jendela yang sah

    var windowMax = Math.min(PREDICT_MAX_INDEX, size);
    var targetIndex = PREDICT_MIN_INDEX +
      (st.sessionsCompleted % (windowMax - PREDICT_MIN_INDEX + 1));
    if (itemIndex !== targetIndex) return null;        // hanya SATU indeks per sesi

    return freeze({
      ask: lineFor(T, 'brain-srl.predict-ask'),
      scale: SCALE.slice(),
      rationale: 'brain3_srl_predict_once'
    });
  }

  // ---- (3) refleksi & kalibrasi -----------------------------------------------------------

  /** Baris prediksi sah: confidence angka 0..1 dan correct bisa dibaca sebagai boolean.
   *  Baris korup dibuang diam-diam — refleksi di atas data cacat lebih buruk daripada
   *  refleksi yang mengaku tidak punya data. */
  function sanitizePredictions(raw) {
    var rows = [];
    if (!Array.isArray(raw)) return rows;
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      if (!r || typeof r !== 'object' || Array.isArray(r)) continue;
      var c = Number(r.confidence);
      if (!isFinite(c) || c < 0 || c > 1) continue;
      rows.push({ confidence: c, correct: r.correct === true || r.correct === 1, concept: humanize(r.concept) });
    }
    return rows;
  }

  /** Kelompokkan per konsep lalu pilih kelompok dengan |bias| terbesar: pesan kalibrasi
   *  wajib menunjuk konten BERNAMA, dan kelompok paling meleset adalah yang paling layak
   *  disebut. Baris tanpa nama konsep tetap dihitung sebagai kelompok 'materi sesi ini'. */
  function worstGroup(rows, T) {
    var groups = {};
    for (var i = 0; i < rows.length; i++) {
      var key = rows[i].concept || lineFor(T, 'brain-srl.group-fallback');
      if (!groups[key]) groups[key] = { concept: key, n: 0, conf: 0, hit: 0 };
      groups[key].n++;
      groups[key].conf += rows[i].confidence;
      groups[key].hit += rows[i].correct ? 1 : 0;
    }
    var worst = null;
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      g.meanConf = g.conf / g.n;
      g.accuracy = g.hit / g.n;
      g.bias = g.meanConf - g.accuracy;
      if (!worst || Math.abs(g.bias) > Math.abs(worst.bias)) worst = g;
    });
    return worst;
  }

  /** Pesan kalibrasi: selalu konten bernama + dua angka + satu tindakan berikutnya.
   *  Tidak pernah menilai orangnya — hanya taksiran dan cara memperbaikinya. */
  function calibrationMessage(group, bias, T) {
    var name = group.concept;
    var confTxt = pct(group.meanConf);
    var accTxt = pct(group.accuracy);
    if (bias >= BIAS_GOOD) {
      // Terlalu yakin: kuadran paling berbahaya (opus C9) — taksiran tinggi menutup
      // kebutuhan belajar. Tindakannya: uji alasan sebelum memilih jawaban.
      return fill(lineFor(T, 'brain-srl.calib-over'), { conf: confTxt, name: name, acc: accTxt });
    }
    if (bias <= -BIAS_GOOD) {
      // Kurang yakin: buktinya lebih baik dari taksirannya — eksplisitkan bukti keberhasilan.
      return fill(lineFor(T, 'brain-srl.calib-under'), { conf: confTxt, name: name, acc: accTxt });
    }
    // Terkalibrasi: yang dipuji CARA MENAKSIR (tindakan yang bisa diulang), bukan orangnya.
    return fill(lineFor(T, 'brain-srl.calib-good'), { conf: confTxt, name: name, acc: accTxt });
  }

  /**
   * reflect(state, {predictions:[{confidence, correct, concept?}], sessionAccuracy}, nowMs)
   *   -> {message, state, rationale, bias, good}
   *
   * Membandingkan taksiran vs hasil, memulangkan pesan kalibrasi spesifik-konten, menyimpan
   * riwayat kalibrasi sesi ini di state, dan menggerakkan mesin FADING:
   *   - |bias| < 0.1 -> sesi baik; tiga sesi baik berturut-turut -> prompt tidur 5 sesi
   *     (rationale brain3_srl_faded);
   *   - kalibrasi memburuk (ada data dan |bias| >= 0.1) -> streak nol DAN tidur dibatalkan:
   *     scaffold bangun lagi karena murid ternyata masih membutuhkannya;
   *   - sesi tanpa data taksiran (faded/frustrasi) tidak menggerakkan streak ke mana pun —
   *     ketiadaan bukti bukan bukti kalibrasi baik ataupun buruk.
   */
  function reflect(state, result, nowMs, naskah) {
    var st = sanitizeState(state);
    var T = (naskah && typeof naskah === 'object') ? naskah : null;
    var o = result && typeof result === 'object' ? result : {};
    var rows = sanitizePredictions(o.predictions);
    var at = num(nowMs, 0);

    // Sesi berjalan satu langkah: bila sedang tidur, sisa tidurnya berkurang satu.
    var faded = st.fadedRemaining > 0 ? st.fadedRemaining - 1 : 0;
    var goodStreak = st.goodStreak;

    var message, rationale, bias = 0, good = false;

    if (rows.length === 0) {
      message = lineFor(T, 'brain-srl.reflect-no-data');
      rationale = 'brain3_srl_reflect_no_data';
    } else {
      var sumBias = 0;
      for (var i = 0; i < rows.length; i++) sumBias += rows[i].confidence - (rows[i].correct ? 1 : 0);
      bias = sumBias / rows.length;
      good = Math.abs(bias) < BIAS_GOOD;
      var group = worstGroup(rows, T);
      message = calibrationMessage(group, group.bias, T);

      if (good) {
        goodStreak = Math.min(GOOD_STREAK_TO_FADE, goodStreak + 1);
        rationale = 'brain3_srl_reflect_calibrated';
        if (goodStreak >= GOOD_STREAK_TO_FADE && faded === 0) {
          // Tiga sesi berturut-turut taksiran akurat: scaffold sudah tidak membantu,
          // lepaskan. Streak kembali nol supaya sesudah bangun perlu bukti baru lagi.
          faded = FADE_SESSIONS;
          goodStreak = 0;
          rationale = 'brain3_srl_faded';
          message += fill(lineFor(T, 'brain-srl.faded-note'), { n: FADE_SESSIONS });
        }
      } else {
        // Kalibrasi memburuk: streak gugur dan tidur dibatalkan — scaffold bangun lagi.
        goodStreak = 0;
        faded = 0;
        rationale = bias > 0 ? 'brain3_srl_reflect_overconfident' : 'brain3_srl_reflect_underconfident';
      }
    }

    var entry = {
      at: at,
      n: rows.length,
      bias: round(bias, 4),
      accuracy: rows.length
        ? round(rows.reduce(function (acc, r) { return acc + (r.correct ? 1 : 0); }, 0) / rows.length, 4)
        : round(Math.max(0, Math.min(1, num(o.sessionAccuracy, 0))), 4),
      good: good,
      faded: faded > 0
    };
    var history = st.history.concat([entry]);
    if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);

    var next = {
      schema: SCHEMA,
      sessionsCompleted: st.sessionsCompleted + 1,
      goodStreak: goodStreak,
      fadedRemaining: faded,
      history: history
    };

    return freeze({
      message: message,
      state: next,
      rationale: rationale,
      bias: round(bias, 4),
      good: good
    });
  }

  return {
    SCHEMA: SCHEMA,
    SCALE: SCALE,
    PREDICT_MIN_INDEX: PREDICT_MIN_INDEX,
    PREDICT_MAX_INDEX: PREDICT_MAX_INDEX,
    BIAS_GOOD: BIAS_GOOD,
    GOOD_STREAK_TO_FADE: GOOD_STREAK_TO_FADE,
    FADE_SESSIONS: FADE_SESSIONS,
    sessionPlan: sessionPlan,
    predictPrompt: predictPrompt,
    reflect: reflect
  };
});
