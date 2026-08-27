/**
 * FIEZEL Open Learner Model (OLM) v1 — cermin belajar untuk MURID, bukan panel developer.
 *
 * Desain: council C9 (claude_opus_5_0) + P6 (claude_fable_5), kontrak BRAINCORE-V3-CONTRACTS.md.
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
 * 3. SEMUA ENTRI BISA DIBANTAH. Murid berhak menekan "menurutku ini salah"; setiap entri
 *    membawa canDispute:true. AKSI sanggahan (menaikkan varians, memicu pengukuran ulang)
 *    adalah milik aplikasi, BUKAN modul ini — di sini hanya sinyal bahwa tombolnya sah tampil.
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
  var DAY_MS = 86400000;

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
        var entry = { lesson: id, family: null, canDispute: true };
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
            entry.rationale = 'brain3_olm_mastery_insufficient';
            insufficient++;
          } else {
            var iv = intervalFor(clamp(v.L, 0, 1), n);
            entry.status = 'ok';
            entry.mean = iv.mean; entry.low = iv.low; entry.high = iv.high;
            entry.label = 'dari model BKT';
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
          entry.rationale = 'brain3_olm_mastery_raw';
        } else {
          entry.status = TEXT_INSUFFICIENT;
          entry.mean = null; entry.low = null; entry.high = null;
          entry.source = 'none';
          entry.evidenceCount = 0;
          entry.label = TEXT_INSUFFICIENT;
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
  function misconceptionText(m) {
    var wrong = m && m.misconception ? String(m.misconception) : null;
    var right = m && m.canonical ? String(m.canonical) : null;
    var concept = m && m.concept ? String(m.concept) : 'konsep ini';
    if (wrong && right) {
      return 'Pada ' + concept + ', jawaban berulang kali memakai bentuk \u00ab' + wrong +
        '\u00bb padahal bentuk baku \u00ab' + right + '\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.';
    }
    if (wrong) {
      return 'Pada ' + concept + ', pola jawaban berulang kali mengarah ke \u00ab' + wrong +
        '\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.';
    }
    return 'Pada ' + concept + ', ada pola jawaban yang berulang dan perlu diuji ulang.';
  }

  function resolvedText(m) {
    var concept = m && m.concept ? String(m.concept) : 'konsep ini';
    // Pujian ke tindakan (jawaban yang konsisten benar), bukan ke orang.
    return 'Pola keliru pada ' + concept + ' sudah tidak muncul lagi \u2014 jawaban terakhir konsisten memakai bentuk baku.';
  }

  function misconceptionSection(ledger, nowMs) {
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
        text: misconceptionText(m),
        canDispute: true,
        rationale: 'brain3_olm_misconception_active'
      };
    });
    var resolved = (Array.isArray(summary.resolved) ? summary.resolved : []).map(function (m) {
      return {
        concept: m && m.concept ? m.concept : null,
        misconception: m && m.misconception ? m.misconception : null,
        text: resolvedText(m),
        canDispute: true,
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
      scored.push({
        id: it.id || it.lesson || it.concept || null,
        retrievability: {
          mean: round3(clamp(r, 0, 1)),
          low: round3(clamp(r - half, 0, 1)),
          high: round3(clamp(r + half, 0, 1))
        },
        elapsedDays: round3(elapsedDays),
        atRisk: r < AT_RISK_RETRIEVABILITY,
        canDispute: true,
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
  function calibrationSection(calibration) {
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
      message = 'Kamu memprediksi benar ' + predP + '% tapi aktual ' + actP +
        '%. Sebelum menjawab, coba sebutkan dulu alasan jawabanmu \u2014 kalau alasannya belum bisa ' +
        'diucapkan, turunkan taksiran keyakinannya.';
      rationale = 'brain3_olm_calibration_overconfidence';
    } else if (bias < -CALIBRATION_BIAS_THRESHOLD) {
      tone = 'underconfidence';
      // Pujian ke tindakan (jawaban yang akurat), bukan ke orang.
      message = 'Kamu memprediksi benar ' + predP + '% tapi aktual ' + actP +
        '%. Jawaban-jawabanmu lebih akurat daripada taksiranmu \u2014 saat polanya sudah dikenali, ' +
        'berani naikkan taksiran keyakinannya.';
      rationale = 'brain3_olm_calibration_underconfidence';
    } else {
      tone = 'netral';
      message = 'Taksiran keyakinan (' + predP + '%) dan hasil aktual (' + actP +
        '%) sudah sejalan. Pertahankan kebiasaan menaksir sebelum menjawab \u2014 kebiasaan itu yang ' +
        'membuat kalibrasinya tetap tajam.';
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
      rationale: rationale
    };
  }

  /**
   * summarize({bkt, ledger, memory, calibration}, nowMs)
   * -> struktur tampilan murni untuk murid. TIDAK mengambil keputusan sesi apa pun.
   * Semua input boleh null/hilang; bagian yang datanya kurang keluar sebagai
   * 'belum cukup data', tidak pernah melempar error — cermin yang pecah lebih buruk
   * daripada cermin yang jujur bilang buram.
   */
  function summarize(state, nowMs) {
    var s = (state && typeof state === 'object') ? state : {};
    return {
      schema: SCHEMA,
      generatedAt: isNum(nowMs) ? nowMs : null,
      disputeHint: DISPUTE_HINT,
      mastery: masterySection(s.bkt),
      misconceptions: misconceptionSection(s.ledger, nowMs),
      review: reviewSection(s.memory, nowMs),
      calibration: calibrationSection(s.calibration),
      rationale: 'brain3_olm_summary'
    };
  }

  return {
    SCHEMA: SCHEMA,
    MIN_MASTERY_EVIDENCE: MIN_MASTERY_EVIDENCE,
    MIN_CALIBRATION_PAIRS: MIN_CALIBRATION_PAIRS,
    CALIBRATION_BIAS_THRESHOLD: CALIBRATION_BIAS_THRESHOLD,
    AT_RISK_RETRIEVABILITY: AT_RISK_RETRIEVABILITY,
    summarize: summarize
  };
});
