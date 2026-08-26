/*
 * FIEZEL Gem Terjemahan — inti ekonomi (murni, tanpa DOM & tanpa jaringan).
 *
 * Desain lengkap: reports/recon-listening-gems.md Bagian B. Teks: reports/copy-tour-gems.md §4.
 *
 * MENGAPA MODUL SENDIRI. Tiga alasan, semuanya soal kejujuran yang bisa diuji:
 *
 *   1. Uang belajar tidak boleh dihitung di dalam penangan klik. Aturan hadiah dan
 *      pembelanjaan di sini adalah fungsi murni: masukan -> keluaran, tanpa efek samping,
 *      tanpa localStorage, tanpa Date.now() tersembunyi. gems-test.js memanggilnya
 *      langsung, jadi kontrak owner ("5 benar beruntun = +2, maksimal 2 hadiah/sesi")
 *      diverifikasi pada logika yang benar-benar dipakai aplikasi, bukan pada tiruannya.
 *   2. Satu berkas dipakai dua pemanggil: app.js (pemegang state kanonik, di browser) dan
 *      addon speaking-listening (pemegang sesi). Menyalin aturannya dua kali berarti dua
 *      kebenaran yang perlahan berbeda.
 *   3. Gem TIDAK PERNAH DIJUAL. Karena itu tidak ada satu pun fungsi di sini yang
 *      menambah saldo tanpa alasan belajar: gemsEarn() menuntut `reason`, dan satu-satunya
 *      reason yang dipakai runtime hari ini adalah 'listening_streak_5'.
 *
 * INVARIAN YANG DIJAGA: balance === earnedTotal - spentTotal, dan balance >= 0.
 * Keadaan rusak (schema asing, angka negatif, earnedTotal < spentTotal) tidak dilempar
 * ke atas melainkan direkonsiliasi oleh sanitizeGems() — data belajar murid tidak boleh
 * hilang hanya karena satu angka busuk.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelGems = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-gems-v1';
  var LEDGER_LIMIT = 60;

  // Kontrak owner, dikunci. Kalau owner mau gem terasa lebih berharga, kenop yang jujur
  // adalah maxAwardsPerSession — bukan harga toggle (rekon §"Risiko" butir 3).
  var GEMS_RULES = Object.freeze({
    streakTarget: 5,
    perAward: 2,
    maxAwardsPerSession: 2,
    translationCost: 1
  });

  /* ---- teks (verbatim reports/copy-tour-gems.md §4) --------------------- */

  var GEMS_COPY = Object.freeze({
    name: 'Gem Terjemahan',
    toastStreak: 'Streak 5! +2 Gem Terjemahan buat kamu — simpan atau langsung pakai, bebas.',
    toggleLabel: 'Terjemahan Indonesia',
    emptyTitle: 'Gem kamu lagi kosong',
    emptyBody: 'Tenang, ini bukan tembok bayar — Gem Terjemahan memang nggak dijual, dan nggak akan pernah. Cara dapatnya cuma satu: belajar. Kumpulin streak jawaban benar, dan gem-nya ngalir sendiri. PAW yakin nggak butuh lama, kok.',
    settingsTitle: 'Gem Terjemahan',
    settingsBody: 'Gem Terjemahan adalah mata uang belajarmu: kamu dapat gratis tiap streak jawaban benar, dan dipakai buat membuka terjemahan otomatis di Audiobook dan Listening (1 gem per sesi, butuh jaringan). Gem nggak dijual dan nggak bisa dibeli — satu-satunya jalan mendapatkannya ya belajar.',
    // Kejujuran jaringan (recon-audiobook.md §b): terjemahan = AI online lewat Worker,
    // jatah 40 permintaan/jam, gagal senyap. Kalau tidak tampil, gem tidak boleh hangus.
    unavailable: 'Terjemahan belum bisa diambil — butuh jaringan dan jatah AI masih terbatas. Gem kamu nggak terpakai.',
    autoNote: 'terjemahan otomatis'
  });

  /**
   * Teks toast perayaan. Bentuknya verbatim copy-tour-gems.md §4(b); angkanya mengikuti
   * runtun dan hadiah yang BENAR-BENAR terjadi. Catatan implementasi copy itu sendiri
   * berkata: kalau logika memakai angka lain, sesuaikan angkanya, bukan nadanya. Karena
   * itu hadiah kedua (runtun 10) memakai kalimat yang sama dengan angka 10, bukan 5.
   */
  function toastFor(streak, amount) {
    var s = toCount(streak), n = toCount(amount);
    if (s === GEMS_RULES.streakTarget && n === GEMS_RULES.perAward) return GEMS_COPY.toastStreak;
    return 'Streak ' + s + '! +' + n + ' Gem Terjemahan buat kamu — simpan atau langsung pakai, bebas.';
  }

  function priceHint(balance) {
    return '1 gem per sesi · saldo kamu: ' + toCount(balance) + ' gem';
  }
  function chipLabel(balance) {
    return toCount(balance) + ' gem';
  }
  function chipAria(balance) {
    return 'Gem Terjemahan kamu: ' + toCount(balance) + '. Didapat gratis dari streak jawaban benar, dipakai buat terjemahan otomatis.';
  }

  /**
   * Label progres di chip. Naif-nya "Runtun {streak}/5" - dan itu mencetak "Runtun 6/5"
   * begitu murid menjawab benar keenam kali, yang terbaca seperti cacat dan, lebih buruk,
   * seperti ada hadiah tertunda yang tidak pernah datang.
   *
   * Yang ditampilkan karena itu adalah progres menuju hadiah BERIKUTNYA, bukan panjang
   * runtun mentah: sisa bagi terhadap target. Dan ketika jatah hadiah sesi ini sudah penuh,
   * penyebutnya dilepas sama sekali - menjanjikan "/5" saat tidak ada lagi yang bisa
   * didapat adalah bohong kecil yang paling mudah dihindari.
   */
  function streakLabel(streak, awardsThisSession, rules) {
    var r = rules && typeof rules === 'object' ? rules : GEMS_RULES;
    var target = Math.max(1, Math.floor(Number(r.streakTarget)) || GEMS_RULES.streakTarget);
    var maxAwards = Math.max(0, Math.floor(Number(r.maxAwardsPerSession)) || GEMS_RULES.maxAwardsPerSession);
    var s = Math.max(0, Math.floor(Number(streak)) || 0);
    var a = Math.max(0, Math.floor(Number(awardsThisSession)) || 0);
    if (a >= maxAwards) return 'Runtun ' + s;
    return 'Runtun ' + (s % target) + '/' + target;
  }

  /* ---- utilitas -------------------------------------------------------- */

  function toCount(value) {
    var n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function freshGems() {
    return { schema: SCHEMA, balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] };
  }

  function sanitizeEntry(row) {
    if (!row || typeof row !== 'object') return null;
    var delta = Math.trunc(Number(row.delta));
    if (!Number.isFinite(delta) || delta === 0) return null;
    var at = Math.floor(Number(row.at));
    return {
      at: Number.isFinite(at) && at > 0 ? at : 0,
      delta: delta,
      reason: String(row.reason == null ? '' : row.reason).slice(0, 40),
      sessionId: String(row.sessionId == null ? '' : row.sessionId).slice(0, 60),
      level: String(row.level == null ? '' : row.level).slice(0, 8)
    };
  }

  /**
   * Sanitasi saat muat. Schema salah => keadaan bersih. Schema benar tapi angkanya tidak
   * konsisten => direkonsiliasi DARI LEDGER, karena ledger adalah catatan kejadian dan
   * angka ringkasan hanyalah turunannya.
   */
  function sanitizeGems(raw) {
    var fresh = freshGems();
    if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA) return fresh;
    var ledger = (Array.isArray(raw.ledger) ? raw.ledger : [])
      .map(sanitizeEntry).filter(Boolean).slice(-LEDGER_LIMIT);
    var earned = toCount(raw.earnedTotal);
    var spent = toCount(raw.spentTotal);
    var balance = toCount(raw.balance);
    var consistent = balance === earned - spent && earned >= spent;
    if (!consistent) {
      // Ledger dipotong 60, jadi rekonsiliasi memakai angka seumur hidup bila masuk akal
      // dan jatuh ke ledger hanya kalau angka itu sendiri mustahil.
      if (earned >= spent) {
        balance = earned - spent;
      } else {
        earned = 0; spent = 0;
        for (var i = 0; i < ledger.length; i++) {
          if (ledger[i].delta > 0) earned += ledger[i].delta; else spent += -ledger[i].delta;
        }
        if (earned < spent) spent = earned;
        balance = earned - spent;
      }
    }
    return { schema: SCHEMA, balance: balance, earnedTotal: earned, spentTotal: spent, ledger: ledger };
  }

  /* ---- aturan hadiah --------------------------------------------------- */

  /**
   * gemsAward(streak, awardsThisSession) -> jumlah gem.
   * Murni. Dipanggil setiap item listening selesai dinilai.
   *
   * Pagar maxAwardsPerSession diperiksa LEBIH DULU: streak 15 pada sesi yang sudah
   * memberi 2 hadiah menghasilkan 0, bukan hadiah ketiga. Itu kontrak anti-farming owner.
   */
  function gemsAward(streak, awardsThisSession, rules) {
    var r = rules || GEMS_RULES;
    var s = toCount(streak);
    var a = toCount(awardsThisSession);
    if (a >= r.maxAwardsPerSession) return 0;
    if (s > 0 && s % r.streakTarget === 0) return r.perAward;
    return 0;
  }

  /** Kredit murni. Tidak memutasi masukan. amount<=0 => tidak terjadi apa pun. */
  function gemsEarn(gems, amount, reason, at, sessionId, level) {
    var base = sanitizeGems(gems);
    var n = toCount(amount);
    if (!n) return base;
    var entry = sanitizeEntry({
      at: at, delta: n, reason: reason || 'listening_streak_5', sessionId: sessionId, level: level
    });
    return {
      schema: SCHEMA,
      balance: base.balance + n,
      earnedTotal: base.earnedTotal + n,
      spentTotal: base.spentTotal,
      ledger: base.ledger.concat(entry ? [entry] : []).slice(-LEDGER_LIMIT)
    };
  }

  /**
   * Debit murni. Saldo kurang => {ok:false} dan objek masukan TIDAK tersentuh.
   * Inilah "gem habis bukan paywall": penolakan bersih, tanpa efek samping, tanpa
   * jalur pembelian mana pun.
   */
  function gemsSpend(gems, cost, reason, at, sessionId) {
    var c = Math.max(1, Math.floor(Number(cost)) || 1);
    var base = sanitizeGems(gems);
    if (base.balance < c) return { ok: false, gems: gems };
    var entry = sanitizeEntry({
      at: at, delta: -c, reason: reason || 'translation_session', sessionId: sessionId
    });
    return {
      ok: true,
      gems: {
        schema: SCHEMA,
        balance: base.balance - c,
        earnedTotal: base.earnedTotal,
        spentTotal: base.spentTotal + c,
        ledger: base.ledger.concat(entry ? [entry] : []).slice(-LEDGER_LIMIT)
      }
    };
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    LEDGER_LIMIT: LEDGER_LIMIT,
    GEMS_RULES: GEMS_RULES,
    GEMS_COPY: GEMS_COPY,
    freshGems: freshGems,
    sanitizeGems: sanitizeGems,
    gemsAward: gemsAward,
    gemsEarn: gemsEarn,
    gemsSpend: gemsSpend,
    toastFor: toastFor,
    priceHint: priceHint,
    chipLabel: chipLabel,
    chipAria: chipAria,
    streakLabel: streakLabel
  });
}));
