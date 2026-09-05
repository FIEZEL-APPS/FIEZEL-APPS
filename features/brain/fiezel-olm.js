/**
 * FIEZEL Open Learner Model (OLM) v1 — cermin belajar untuk MURID, bukan panel developer.
 *
 * Desain: council C9 (claude_opus_5_0) + P6 (claude_fable_5), kontrak docs/BRAINCORE-V3-CONTRACTS.md.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * `coreBrainPanelMarkup` di app.js adalah panel diagnostik untuk pengembang. Yang belum ada
 * adalah open learner model: model murid yang DIBUKA kepada murid sendiri, karena melihat
 * peta penguasaan diri terbukti memancing refleksi metakognitif (Bull & Kay, SMILI). Untuk
 * murid dewasa yang belajar sendiri seperti pengguna FIEZEL, OLM adalah pengganti guru
 * manusia sebagai cermin.
 *
 * EMPAT PRINSIP KEJUJURAN YANG DIJAGA DI SINI
 * -------------------------------------------
 * 1. TIDAK ADA ANGKA TANPA KETIDAKPASTIAN. Angka tunggal ("penguasaan 73%") menyembunyikan
 *    seberapa yakin model itu sendiri — dan menyembunyikan ketidakpastian adalah kebohongan.
 *    Setiap penguasaan keluar sebagai mean + interval (low..high), supaya UI bisa menggambar
 *    BAR DENGAN LEBAR, bukan titik.
 * 2. KLAIM DI BAWAH AMBANG BUKTI TIDAK BOLEH TERDENGAR SEPERTI PERNYATAAN. Bukti tipis keluar
 *    sebagai status 'belum cukup data' dengan mean/interval null — bukan angka yang seolah tahu.
 * 3. SEMUA ENTRI BISA DIBANTAH — DAN SANGGAHAN PUNYA KONSEKUENSI. Murid berhak menekan
 *    "menurutku ini salah"; setiap entri membawa canDispute + claimId stabil. Sejak v3
 *    (negotiated learner model, council C9 opus): sanggahan BUKAN sekadar tombol keluhan.
 *    Sanggahan menaikkan varians klaim itu dan memicu pengukuran ulang, karena murid yang
 *    membantah adalah sumber informasi tentang KESALAHAN MODEL — justifikasinya bukan cuma
 *    pedagogis tapi akurasi model (Bull, negotiated learner modelling). negotiate() di sini
 *    menerjemahkan sanggahan menjadi INSTRUKSI untuk app (remeasure / discount_evidence);
 *    eksekusi probe & diskon tetap milik aplikasi.
 * 4. PRESENTASI MURNI. Modul ini tidak mengambil keputusan sesi apa pun, tidak menulis state,
 *    tidak menyentuh DOM/jaringan/waktu global. Ia menerima data dan mengembalikan struktur
 *    tampilan. Risiko regresi terhadap kebijakan sesi: nol, karena tidak ada jalurnya.
 *
 * NASKAH BERBAHASA INDONESIA, DAN DUA ATURAN NADA:
 * - Miskonsepsi TIDAK PERNAH menyebut orangnya ("kamu salah paham") — selalu perilakunya
 *   ("jawaban sering memakai bentuk X padahal bentuk baku Y"). Yang salah adalah pola, bukan
 *   pribadi; itu yang membuat murid berani melihat daftarnya.
 * - Pujian diarahkan ke TINDAKAN ("taksiran dan hasil sudah sejalan — pertahankan kebiasaan
 *   menaksir"), bukan ke orang ("kamu pintar"), karena pujian pada pribadi mendorong fixed
 *   mindset sedangkan pujian pada tindakan mendorong pengulangan tindakan itu.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelOLM = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-olm-v1';
  // Skema state negosiasi (catatan sanggahan). Terpisah dari SCHEMA presentasi karena
  // ini satu-satunya bagian OLM yang PERSISTEN: summarize tetap tanpa-state, tapi daftar
  // sanggahan harus hidup lintas sesi supaya "sedang diukur ulang" tidak hilang saat reload.
  var NEGOTIATION_SCHEMA = 'fiezel-olm-negotiation-v1';
  var DAY_MS = 86400000;

  // Sanggahan dianggap MASIH BERJALAN selama 7 hari. Kenapa dibatasi: kalau app gagal
  // menjalankan probe (murid tidak kembali, modul absen), klaim tidak boleh terkunci
  // "sedang diukur ulang" selamanya — setelah 7 hari sanggahan kedaluwarsa dan klaim
  // kembali bisa dibantah. Dalam jendela itu, sanggahan ganda pada klaim yang sama
  // ditolak (noop) supaya murid tidak bisa spam remeasure.
  var DISPUTE_PENDING_DAYS = 7;
  var DISPUTE_PENDING_MS = DISPUTE_PENDING_DAYS * DAY_MS;

  // Jumlah probe pengukuran ulang per sanggahan. 3 mengikuti disiplin ambang bukti
  // MIN_MASTERY_EVIDENCE: klaim baru boleh direvisi oleh minimal jumlah bukti yang sama
  // dengan yang dibutuhkan untuk membuatnya.
  var DISPUTE_PROBE_COUNT = 3;

  // Label yang dipakai summarize untuk klaim yang sanggahannya masih berjalan.
  var TEXT_REMEASURING = 'sedang diukur ulang';

  // Ambang bukti: di bawah ini sebuah klaim penguasaan belum boleh berbentuk angka.
  // 3 mengikuti disiplin Core Brain v2 ("model yang percaya diri di atas tiga jawaban
  // lebih berbahaya daripada tidak ada model sama sekali").
  var MIN_MASTERY_EVIDENCE = 3;

  // Kalibrasi butuh minimal 20 pasangan (confidence, benar/salah) sebelum boleh menuduh
  // overconfidence/underconfidence — di bawah itu bias hanyalah noise sampling.
  var MIN_CALIBRATION_PAIRS = 20;
  var CALIBRATION_BIAS_THRESHOLD = 0.15;

  // Retrievability di bawah ini kami sebut "berisiko lupa": peluang ingat sudah mendekati
  // lempar koin, jadi menundanya lagi berarti belajar ulang dari nol, bukan review.
  var AT_RISK_RETRIEVABILITY = 0.6;

  // Teks tombol sanggahan — satu sumber kebenaran supaya UI tidak mengarang variannya sendiri.
  var DISPUTE_HINT = Object.freeze({
    label: 'menurutku ini salah',
    // Kunci copy-map ADDITIVE (W2-FEAT-A): presenter boleh melokalkan label lewat kunci
    // ini; nilai 'label' yang diases tes tidak berubah (AI-02 F01).
    labelKey: 'brain-olm.dispute-label',
    // Aksi sanggahan (naikkan varians, ukur ulang) milik aplikasi; modul ini presentasi murni.
    ownedBy: 'app'
  });

  var TEXT_INSUFFICIENT = 'belum cukup data';

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function round3(x) { return Math.round(x * 1000) / 1000; }

  /**
   * Interval ketidakpastian untuk probabilitas p dengan n bukti.
   * Pendekatan Wald dengan lantai varians: sqrt(p(1-p)/n) menuju nol saat p mendekati 0/1,
   * padahal keyakinan ekstrem dari sedikit bukti justru paling patut diragukan — maka
   * varians diberi lantai 0.05 dan lebar diberi lantai 0.04 supaya bar tidak pernah
   * menyusut menjadi titik yang berlagak pasti.
   */
  function intervalFor(p, n) {
    var eff = Math.max(1, n);
    var half = 1.96 * Math.sqrt(Math.max(p * (1 - p), 0.05) / eff);
    half = clamp(half, 0.04, 0.5);
    return {
      mean: round3(p),
      low: round3(clamp(p - half, 0, 1)),
      high: round3(clamp(p + half, 0, 1))
    };
  }

  /* ================================================================
   * 1) PETA PENGUASAAN per keluarga/lesson — mean + lebar interval.
   *
   * Sumber data dua tingkat:
   * - BKT (FiezelMasteryBKT state / peta {L, n}): sumber utama, interval menyempit
   *   seiring bukti bertambah.
   * - Fallback mastery mentah (angka tunggal 0..1 tanpa hitungan bukti): tetap
   *   ditampilkan tetapi DIBERI LABEL 'estimasi kasar' dengan interval lebar tetap,
   *   karena kami tidak tahu berapa bukti di baliknya — jujur lebih penting dari rapi.
   * ================================================================ */
  function masterySection(bkt) {
    var entries = [];
    var insufficient = 0;
    // Terima dua bentuk: state BKT {lessons:{id:{L,n,family?}}} atau peta datar
    // {id:{L,n}} / {id:angka}. Toleran karena modul A10 mungkin belum ter-load.
    var lessons = null;
    if (bkt && typeof bkt === 'object') {
      lessons = (bkt.lessons && typeof bkt.lessons === 'object') ? bkt.lessons : bkt;
    }
    if (lessons) {
      Object.keys(lessons).forEach(function (id) {
        var v = lessons[id];
        // claimId stabil: identitas klaim untuk negotiate(). Stabil karena hanya turunan
        // dari id lesson — dua kali summarize pada data sama menghasilkan claimId sama.
        var entry = { lesson: id, family: null, canDispute: true, claimId: 'mastery:' + id };
        if (v && typeof v === 'object' && isNum(v.L)) {
          // Sumber BKT: punya hitungan bukti n, interval menyempit dengan bukti.
          var n = isNum(v.n) ? v.n : 0;
          entry.family = typeof v.family === 'string' ? v.family : null;
          entry.source = 'bkt';
          entry.evidenceCount = n;
          if (n < MIN_MASTERY_EVIDENCE) {
            // Klaim di bawah ambang bukti keluar sebagai 'belum cukup data', BUKAN angka.
            entry.status = TEXT_INSUFFICIENT;
            entry.mean = null; entry.low = null; entry.high = null;
            entry.label = TEXT_INSUFFICIENT;
            entry.labelKey = 'brain-olm.insufficient'; // ADDITIVE untuk presenter (W2-FEAT-A)
            entry.rationale = 'brain3_olm_mastery_insufficient';
            insufficient++;
          } else {
            var iv = intervalFor(clamp(v.L, 0, 1), n);
            entry.status = 'ok';
            entry.mean = iv.mean; entry.low = iv.low; entry.high = iv.high;
            entry.label = 'dari model BKT';
            entry.labelKey = 'brain-olm.from-bkt'; // ADDITIVE untuk presenter (W2-FEAT-A)
            entry.rationale = 'brain3_olm_mastery_bkt';
          }
        } else if (isNum(v)) {
          // Fallback mastery mentah: tidak tahu jumlah bukti -> interval lebar tetap
          // dan label eksplisit 'estimasi kasar' supaya murid tahu bar ini kabur.
          var p = clamp(v, 0, 1);
          entry.source = 'raw';
          entry.evidenceCount = null;
          entry.status = 'ok';
          entry.mean = round3(p);
          entry.low = round3(clamp(p - 0.25, 0, 1));
          entry.high = round3(clamp(p + 0.25, 0, 1));
          entry.label = 'estimasi kasar';
          entry.labelKey = 'brain-olm.rough-estimate'; // ADDITIVE untuk presenter (W2-FEAT-A)
          entry.rationale = 'brain3_olm_mastery_raw';
        } else {
          entry.status = TEXT_INSUFFICIENT;
          entry.mean = null; entry.low = null; entry.high = null;
          entry.source = 'none';
          entry.evidenceCount = 0;
          entry.label = TEXT_INSUFFICIENT;
          entry.labelKey = 'brain-olm.insufficient'; // ADDITIVE untuk presenter (W2-FEAT-A)
          entry.rationale = 'brain3_olm_mastery_insufficient';
          insufficient++;
        }
        entries.push(entry);
      });
    }
    return {
      entries: entries,
      insufficientCount: insufficient,
      status: entries.length ? 'ok' : TEXT_INSUFFICIENT
    };
  }

  /* ================================================================
   * 2) MISKONSEPSI aktif & teratasi dari ledger.
   *
   * Naskah SELALU tentang perilaku ("jawaban sering memakai ...") dan TIDAK PERNAH
   * tentang orangnya. Menerima ledger yang sudah diringkas ({active, resolved}) atau
   * ledger mentah bila modul FiezelMisconceptionLedger tersedia sebagai global.
   * ================================================================ */
  var NASKAH_ID = Object.freeze({
    'brain-olm.insufficient': 'belum cukup data',
    'brain-olm.remeasuring': 'sedang diukur ulang',
    'brain-olm.from-bkt': 'dari model BKT',
    'brain-olm.rough-estimate': 'estimasi kasar',
    'brain-olm.dispute-label': 'menurutku ini salah',
    'brain-olm.concept-fallback': 'konsep ini',
    'brain-olm.miscon-pair': 'Pada ' + '{concept}' + ', jawaban berulang kali memakai bentuk \u00ab' + '{wrong}' + '\u00bb padahal bentuk baku \u00ab' + '{right}' + '\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.',
    'brain-olm.miscon-wrong-only': 'Pada ' + '{concept}' + ', pola jawaban berulang kali mengarah ke \u00ab' + '{wrong}' + '\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.',
    'brain-olm.miscon-generic': 'Pada ' + '{concept}' + ', ada pola jawaban yang berulang dan perlu diuji ulang.',
    'brain-olm.resolved': 'Pola keliru pada ' + '{concept}' + ' sudah tidak muncul lagi \u2014 jawaban terakhir konsisten memakai bentuk baku.',
    'brain-olm.calib-over': 'Kamu memprediksi benar ' + '{pred}' + '% tapi aktual ' + '{actual}' + '%. Sebelum menjawab, coba sebutkan dulu alasan jawabanmu \u2014 kalau alasannya belum bisa ' + 'diucapkan, turunkan taksiran keyakinannya.',
    'brain-olm.calib-under': 'Kamu memprediksi benar ' + '{pred}' + '% tapi aktual ' + '{actual}' + '%. Jawaban-jawabanmu lebih akurat daripada taksiranmu \u2014 saat polanya sudah dikenali, ' + 'berani naikkan taksiran keyakinannya.',
    'brain-olm.calib-neutral': 'Taksiran keyakinan (' + '{pred}' + '%) dan hasil aktual (' + '{actual}' + '%) sudah sejalan. Pertahankan kebiasaan menaksir sebelum menjawab \u2014 kebiasaan itu yang ' + 'membuat kalibrasinya tetap tajam.'
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

  function misconceptionText(m, T) {
    var wrong = m && m.misconception ? String(m.misconception) : null;
    var right = m && m.canonical ? String(m.canonical) : null;
    var concept = m && m.concept ? String(m.concept) : lineFor(T, 'brain-olm.concept-fallback');
    if (wrong && right) {
      return fill(lineFor(T, 'brain-olm.miscon-pair'), { concept: concept, wrong: wrong, right: right });
    }
    if (wrong) {
      return fill(lineFor(T, 'brain-olm.miscon-wrong-only'), { concept: concept, wrong: wrong });
    }
    return fill(lineFor(T, 'brain-olm.miscon-generic'), { concept: concept });
  }

  function resolvedText(m, T) {
    var concept = m && m.concept ? String(m.concept) : lineFor(T, 'brain-olm.concept-fallback');
    // Pujian ke tindakan (jawaban yang konsisten benar), bukan ke orang.
    return fill(lineFor(T, 'brain-olm.resolved'), { concept: concept });
  }

  function misconceptionSection(ledger, nowMs, T) {
    var summary = null;
    if (ledger && typeof ledger === 'object') {
      if (Array.isArray(ledger.active) || Array.isArray(ledger.resolved)) {
        // Sudah berbentuk ringkasan {active, resolved} — pakai langsung.
        summary = ledger;
      } else {
        // Ledger mentah: hanya bisa dibaca lewat modul pemiliknya (A4). Kalau modul itu
        // tersedia sebagai global, pinjam summarize-nya; kalau tidak, jujur bilang
        // belum cukup data — jangan menebak-nebak skema milik modul lain.
        var g = (typeof globalThis !== 'undefined') ? globalThis : null;
        var mod = g && g.FiezelMisconceptionLedger;
        if (mod && typeof mod.summarize === 'function') {
          try { summary = mod.summarize(ledger, nowMs); } catch (e) { summary = null; }
        }
      }
    }
    if (!summary) {
      return { active: [], resolved: [], total: 0, status: TEXT_INSUFFICIENT };
    }
    var active = (Array.isArray(summary.active) ? summary.active : []).map(function (m) {
      return {
        concept: m && m.concept ? m.concept : null,
        misconception: m && m.misconception ? m.misconception : null,
        canonical: m && m.canonical ? m.canonical : null,
        // belief dilaporkan dengan bukti pendampingnya, bukan angka telanjang.
        belief: (m && isNum(m.belief)) ? round3(m.belief) : null,
        evidenceCount: (m && isNum(m.evidenceCount)) ? m.evidenceCount : null,
        text: misconceptionText(m, T),
        canDispute: true,
        claimId: misconceptionClaimId(m),
        rationale: 'brain3_olm_misconception_active'
      };
    });
    var resolved = (Array.isArray(summary.resolved) ? summary.resolved : []).map(function (m) {
      return {
        concept: m && m.concept ? m.concept : null,
        misconception: m && m.misconception ? m.misconception : null,
        text: resolvedText(m, T),
        canDispute: true,
        claimId: misconceptionClaimId(m),
        rationale: 'brain3_olm_misconception_resolved'
      };
    });
    return {
      active: active,
      resolved: resolved,
      total: isNum(summary.total) ? summary.total : (active.length + resolved.length),
      status: (active.length + resolved.length) ? 'ok' : TEXT_INSUFFICIENT
    };
  }

  /* ================================================================
   * 3) JADWAL REVIEW ringkas dari state memori.
   *
   * Menerima daftar item {id|lesson|concept, stability (hari), lastReviewMs|reviewedAt,
   * reps?}. Retrievability dihitung dengan paruh-waktu: R = 2^(-t/stability). Ditampilkan
   * hanya 3 item paling genting + jumlah total yang berisiko, karena daftar panjang tidak
   * dibaca siapa pun — ringkas lebih jujur daripada lengkap.
   * ================================================================ */
  function reviewSection(memory, nowMs) {
    var items = null;
    if (Array.isArray(memory)) items = memory;
    else if (memory && Array.isArray(memory.items)) items = memory.items;
    if (!items || !items.length) {
      return { top: [], atRiskCount: 0, status: TEXT_INSUFFICIENT };
    }
    var scored = [];
    items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      var stability = isNum(it.stability) && it.stability > 0 ? it.stability : null;
      var last = isNum(it.lastReviewMs) ? it.lastReviewMs
        : isNum(it.reviewedAt) ? it.reviewedAt
        : isNum(it.lastReviewedMs) ? it.lastReviewedMs : null;
      if (stability === null || last === null || !isNum(nowMs)) return; // bukti tak lengkap -> lewati, jangan tebak
      var elapsedDays = Math.max(0, (nowMs - last) / DAY_MS);
      var r = Math.pow(2, -elapsedDays / stability);
      // Lebar pita retrievability: makin sedikit repetisi, makin kabur ingatan kita
      // tentang ingatannya sendiri — pita minimal 0.05 supaya tidak pernah jadi titik.
      var reps = isNum(it.reps) ? it.reps : 0;
      var half = clamp(0.5 / Math.sqrt(reps + 2), 0.05, 0.35);
      var itemId = it.id || it.lesson || it.concept || null;
      scored.push({
        id: itemId,
        // Klaim tanpa nama tidak bisa dibantah: negotiate butuh identitas target untuk
        // mendiskon bukti yang tepat. Maka claimId hanya ada bila item punya id.
        claimId: itemId ? 'memory:' + itemId : null,
        canDispute: !!itemId,
        retrievability: {
          mean: round3(clamp(r, 0, 1)),
          low: round3(clamp(r - half, 0, 1)),
          high: round3(clamp(r + half, 0, 1))
        },
        elapsedDays: round3(elapsedDays),
        atRisk: r < AT_RISK_RETRIEVABILITY,
        rationale: 'brain3_olm_review_item'
      });
    });
    if (!scored.length) {
      return { top: [], atRiskCount: 0, status: TEXT_INSUFFICIENT };
    }
    // Paling genting = retrievability terendah (paling dekat ke lupa total).
    scored.sort(function (a, b) { return a.retrievability.mean - b.retrievability.mean; });
    var atRisk = scored.filter(function (s) { return s.atRisk; }).length;
    return {
      top: scored.slice(0, 3),
      atRiskCount: atRisk,
      status: 'ok'
    };
  }

  /* ================================================================
   * 4) COACHING KALIBRASI dari pasangan {confidence 0..1, correct bool}.
   *
   * Brier B = mean((c-y)^2) mengukur ketepatan taksiran; bias = mean(c) - mean(y)
   * mengukur ARAHNYA. Overconfidence (bias > 0.15) hanya boleh dituduhkan dengan
   * >= 20 pasangan, karena menuduh dari sampel kecil sama buruknya dengan
   * overconfidence itu sendiri.
   * ================================================================ */
  function calibrationSection(calibration, T) {
    var pairs = [];
    if (Array.isArray(calibration)) {
      calibration.forEach(function (p) {
        if (!p || typeof p !== 'object') return;
        var c = p.confidence;
        if (!isNum(c) || c < 0 || c > 1) return;
        var y = (p.correct === true || p.correct === 1) ? 1
          : (p.correct === false || p.correct === 0) ? 0 : null;
        if (y === null) return;
        pairs.push({ c: c, y: y });
      });
    }
    if (pairs.length < MIN_CALIBRATION_PAIRS) {
      // Di bawah ambang: TANPA pesan, tanpa angka yang berlagak tahu. Cukup status.
      return {
        status: 'insufficient_data',
        pairs: pairs.length,
        canDispute: true,
        claimId: 'calibration:overall',
        rationale: 'brain3_olm_calibration_insufficient'
      };
    }
    var n = pairs.length;
    var sumB = 0, sumC = 0, sumY = 0;
    pairs.forEach(function (p) {
      sumB += (p.c - p.y) * (p.c - p.y);
      sumC += p.c;
      sumY += p.y;
    });
    var brier = sumB / n;
    var meanC = sumC / n;
    var meanY = sumY / n;
    var bias = meanC - meanY;
    var predP = Math.round(meanC * 100);
    var actP = Math.round(meanY * 100);
    var tone, message, rationale;
    if (bias > CALIBRATION_BIAS_THRESHOLD) {
      tone = 'overconfidence';
      // Spesifik dengan angka aktual murid — bukan nasihat generik.
      message = fill(lineFor(T, 'brain-olm.calib-over'), { pred: predP, actual: actP });
      rationale = 'brain3_olm_calibration_overconfidence';
    } else if (bias < -CALIBRATION_BIAS_THRESHOLD) {
      tone = 'underconfidence';
      // Pujian ke tindakan (jawaban yang akurat), bukan ke orang.
      message = fill(lineFor(T, 'brain-olm.calib-under'), { pred: predP, actual: actP });
      rationale = 'brain3_olm_calibration_underconfidence';
    } else {
      tone = 'netral';
      message = fill(lineFor(T, 'brain-olm.calib-neutral'), { pred: predP, actual: actP });
      rationale = 'brain3_olm_calibration_neutral';
    }
    return {
      status: 'ok',
      pairs: n, // jumlah bukti selalu menyertai angka agregat di bawah ini
      brier: round3(brier),
      bias: round3(bias),
      meanConfidence: round3(meanC),
      meanAccuracy: round3(meanY),
      tone: tone,
      message: message,
      canDispute: true,
      claimId: 'calibration:overall',
      rationale: rationale
    };
  }

  /* ================================================================
   * 5) NEGOSIASI MODEL — negotiated learner model (council C9 opus).
   *
   * KENAPA SANGGAHAN MURID MENGUBAH MODEL, bukan cuma UI: murid yang menekan
   * "menurutku ini salah" sedang memberikan BUKTI bahwa model dan realitas berbeda —
   * salah satu dari keduanya keliru. Cara jujur menyelesaikannya bukan berdebat,
   * melainkan MENGUKUR ULANG: naikkan ketidakpastian klaim itu, lalu kumpulkan bukti
   * segar (3 probe) yang memutuskan siapa yang benar. Kalau murid benar, model
   * terkoreksi; kalau model benar, murid melihat buktinya sendiri. Dua-duanya menang.
   *
   * Modul ini MURNI: negotiate tidak menjalankan probe dan tidak mendiskon bukti —
   * ia mengembalikan INSTRUKSI untuk app (kontrak wiring C5) plus state baru yang
   * mencatat sanggahan. State selalu immutable-copy dan serializable (JSON polos).
   * ================================================================ */

  function misconceptionClaimId(m) {
    // Format 'misconception:<concept>::<label>' — '::' dipilih sebagai pemisah karena
    // ':' tunggal sudah dipakai di dalam id konsep (mis. 'grammar:skill').
    var concept = (m && m.concept) ? String(m.concept) : 'konsep';
    var label = (m && m.misconception) ? String(m.misconception) : 'pola';
    return 'misconception:' + concept + '::' + label;
  }

  /**
   * Bersihkan state negosiasi menjadi bentuk kanonik. Tahan korup: apa pun bentuk
   * masukannya (null, string, disputes bukan array, entri tanpa claimId/at), keluarannya
   * selalu {schema, disputes:[{claimId, at}]} yang valid. Entri korup DIBUANG, bukan
   * ditebak — sanggahan tanpa identitas atau tanpa waktu tidak bisa dieksekusi jujur.
   */
  function sanitizeNegotiation(state) {
    var out = { schema: NEGOTIATION_SCHEMA, disputes: [] };
    if (state && typeof state === 'object' && Array.isArray(state.disputes)) {
      state.disputes.forEach(function (d) {
        if (d && typeof d === 'object' &&
            typeof d.claimId === 'string' && d.claimId.length &&
            isNum(d.at)) {
          out.disputes.push({ claimId: d.claimId, at: d.at });
        }
      });
    }
    return out;
  }

  /** Sanggahan masih berjalan bila usianya < 7 hari. */
  function disputePending(d, nowMs) {
    return isNum(nowMs) && nowMs >= d.at && (nowMs - d.at) < DISPUTE_PENDING_MS;
  }

  /** Peta claimId -> true untuk semua sanggahan yang masih berjalan. */
  function pendingMap(state, nowMs) {
    var map = {};
    sanitizeNegotiation(state).disputes.forEach(function (d) {
      if (disputePending(d, nowMs)) map[d.claimId] = true;
    });
    return map;
  }

  /**
   * Terjemahkan claimId menjadi instruksi untuk app. Jenis klaim menentukan obatnya:
   * - mastery/miskonsepsi -> REMEASURE: klaim ini lahir dari inferensi (BKT/ledger),
   *   jadi jalan koreksinya adalah bukti segar — 3 probe pada skill itu.
   * - memori -> DISCOUNT_EVIDENCE: klaim retrievability lahir dari riwayat review,
   *   dan kalau murid bilang "aku masih ingat ini", yang patut diragukan adalah bobot
   *   bukti lama — bukan mengukur ulang seluruh skill.
   * - selain itu (termasuk kalibrasi agregat) -> noop: tidak ada aksi model tunggal
   *   yang jujur untuk klaim agregat, jadi jangan berpura-pura ada.
   */
  function instructionFor(claimId) {
    if (claimId.indexOf('mastery:') === 0) {
      var skill = claimId.slice('mastery:'.length);
      if (skill) {
        return { type: 'remeasure', targetSkill: skill, probeCount: DISPUTE_PROBE_COUNT, rationale: 'brain3_olm_dispute_remeasure' };
      }
    } else if (claimId.indexOf('misconception:') === 0) {
      // targetSkill = konsepnya (bagian sebelum '::') — probe menguji konsep, bukan labelnya.
      var concept = claimId.slice('misconception:'.length).split('::')[0];
      if (concept) {
        return { type: 'remeasure', targetSkill: concept, probeCount: DISPUTE_PROBE_COUNT, rationale: 'brain3_olm_dispute_remeasure' };
      }
    } else if (claimId.indexOf('memory:') === 0) {
      var target = claimId.slice('memory:'.length);
      if (target) {
        return { type: 'discount_evidence', target: target, rationale: 'brain3_olm_dispute_discount' };
      }
    }
    return { type: 'noop', rationale: 'brain3_olm_dispute_unknown_claim' };
  }

  /**
   * negotiate(state, {claimId, action:'dispute'}, nowMs) -> {state, instruction}
   *
   * Murni & immutable: state masukan TIDAK PERNAH dimutasi; keluaran selalu salinan
   * kanonik baru. Sanggahan ganda pada klaim yang sama dalam 7 hari -> noop 'pending'
   * (pengukuran ulang yang pertama masih berjalan; menumpuknya tidak menambah informasi).
   * Sanggahan kedaluwarsa (>7 hari tanpa resolve) boleh dibantah lagi — catatannya
   * diperbarui, instruksi diterbitkan ulang.
   */
  function negotiate(state, request, nowMs) {
    var clean = sanitizeNegotiation(state);
    var claimId = (request && typeof request.claimId === 'string' && request.claimId.length) ? request.claimId : null;
    var action = request ? request.action : null;
    if (!claimId || action !== 'dispute' || !isNum(nowMs)) {
      // Permintaan cacat: jangan menebak niat murid — kembalikan state apa adanya.
      return { state: clean, instruction: { type: 'noop', rationale: 'brain3_olm_dispute_invalid' } };
    }
    var instruction = instructionFor(claimId);
    if (instruction.type === 'noop') {
      return { state: clean, instruction: instruction };
    }
    var existing = null;
    for (var i = 0; i < clean.disputes.length; i++) {
      if (clean.disputes[i].claimId === claimId) { existing = clean.disputes[i]; break; }
    }
    if (existing && disputePending(existing, nowMs)) {
      // Pengukuran ulang pertama masih berjalan — sanggahan kedua tidak menambah bukti.
      return { state: clean, instruction: { type: 'noop', rationale: 'brain3_olm_dispute_pending' } };
    }
    var disputes = clean.disputes
      .filter(function (d) { return d.claimId !== claimId; })
      .concat([{ claimId: claimId, at: nowMs }]);
    return {
      state: { schema: NEGOTIATION_SCHEMA, disputes: disputes },
      instruction: instruction
    };
  }

  /**
   * resolveDispute(state, claimId, nowMs) -> state'
   * Dipanggil app SETELAH probe pengukuran ulang selesai (atau bukti selesai didiskon):
   * catatan sanggahan dihapus sehingga klaim kembali tampil normal dan bisa dibantah
   * lagi bila murid masih tidak setuju dengan hasil barunya. Murni & tahan korup.
   */
  function resolveDispute(state, claimId, nowMs) {
    var clean = sanitizeNegotiation(state);
    if (typeof claimId !== 'string' || !claimId.length) return clean;
    return {
      schema: NEGOTIATION_SCHEMA,
      disputes: clean.disputes.filter(function (d) { return d.claimId !== claimId; })
    };
  }

  /**
   * Tandai entri yang sanggahannya masih berjalan. Kenapa canDispute:false selama
   * pending: klaim yang sedang diukur ulang belum punya jawaban baru — membantahnya
   * lagi hanya menumpuk antrean probe tanpa informasi baru.
   */
  function markDisputed(entry, pending) {
    if (entry && entry.claimId && pending[entry.claimId]) {
      entry.disputed = true;
      entry.canDispute = false;
      entry.label = TEXT_REMEASURING;
      entry.labelKey = 'brain-olm.remeasuring'; // ADDITIVE untuk presenter (W2-FEAT-A)
    }
    return entry;
  }

  /**
   * summarize({bkt, ledger, memory, calibration}, nowMs)
   * -> struktur tampilan murni untuk murid. TIDAK mengambil keputusan sesi apa pun.
   * Semua input boleh null/hilang; bagian yang datanya kurang keluar sebagai
   * 'belum cukup data', tidak pernah melempar error — cermin yang pecah lebih buruk
   * daripada cermin yang jujur bilang buram.
   */
  function summarize(state, nowMs, naskah) {
    var s = (state && typeof state === 'object') ? state : {};
    var T = (naskah && typeof naskah === 'object') ? naskah : null;
    var out = {
      schema: SCHEMA,
      generatedAt: isNum(nowMs) ? nowMs : null,
      disputeHint: DISPUTE_HINT,
      mastery: masterySection(s.bkt),
      misconceptions: misconceptionSection(s.ledger, nowMs, T),
      review: reviewSection(s.memory, nowMs),
      calibration: calibrationSection(s.calibration, T),
      rationale: 'brain3_olm_summary'
    };
    // Field OPSIONAL baru (API lama tidak berubah): bila app menitipkan state negosiasi
    // di s.negotiation, klaim yang sanggahannya masih berjalan ditandai 'sedang diukur
    // ulang' dan tombol bantahnya disembunyikan (canDispute:false) sampai resolveDispute.
    if (s.negotiation) {
      var pending = pendingMap(s.negotiation, nowMs);
      out.mastery.entries.forEach(function (e) { markDisputed(e, pending); });
      out.misconceptions.active.forEach(function (e) { markDisputed(e, pending); });
      out.misconceptions.resolved.forEach(function (e) { markDisputed(e, pending); });
      out.review.top.forEach(function (e) { markDisputed(e, pending); });
      markDisputed(out.calibration, pending);
    }
    return out;
  }

  return {
    SCHEMA: SCHEMA,
    NEGOTIATION_SCHEMA: NEGOTIATION_SCHEMA,
    MIN_MASTERY_EVIDENCE: MIN_MASTERY_EVIDENCE,
    MIN_CALIBRATION_PAIRS: MIN_CALIBRATION_PAIRS,
    CALIBRATION_BIAS_THRESHOLD: CALIBRATION_BIAS_THRESHOLD,
    AT_RISK_RETRIEVABILITY: AT_RISK_RETRIEVABILITY,
    DISPUTE_PENDING_DAYS: DISPUTE_PENDING_DAYS,
    DISPUTE_PROBE_COUNT: DISPUTE_PROBE_COUNT,
    summarize: summarize,
    negotiate: negotiate,
    resolveDispute: resolveDispute
  };
});
