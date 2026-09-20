/**
 * FIEZEL · features/monetization/fiezel-entitlement.js — MESIN HAK AKSES (free / pro / sekolah).
 *
 * MENGAPA MODUL INI ADA
 * ---------------------
 * Sampai commit ini FIEZEL tidak punya satu pun tempat yang bisa menjawab pertanyaan
 * "murid ini boleh apa?". Batas jatah suara memang sudah dijaga (`workers/api/quota/`),
 * tetapi itu jatah BIAYA MESIN (TTS/AI), bukan hak akses produk. Akibatnya seluruh isi
 * B1–C2 — bagian yang paling mahal dibuat — terbuka gratis untuk siapa pun, dan tidak ada
 * satu baris kode pun yang tahu arti kata "Pro".
 *
 * Modul ini adalah jawaban tunggal itu. Ia MURNI: tidak membaca localStorage, tidak
 * memanggil jaringan, tidak membaca jam sendiri. Semua fakta masuk lewat argumen dan
 * semua keputusan keluar sebagai data. Alasannya bukan estetika melainkan pengujian:
 * aturan uang adalah aturan yang paling mahal kalau salah, jadi ia harus bisa diuji
 * sampai ke sudut tergelapnya tanpa menyalakan peramban.
 *
 * IA MENGEMBALIKAN copyKey, BUKAN KALIMAT
 * ---------------------------------------
 * Sama seperti kontrak yang sudah berlaku di `workers/api/quota/route-quota.js:19-21`
 * ("Server mengirim FAKTA + copyKey, bukan kalimat"). Naskahnya tinggal di pasangan
 * `features/i18n/copy-id-monetization.js` + `copy-th-monetization.js`. Modul ini tidak
 * boleh memuat satu pun kalimat yang dibaca murid — murid Thai membaca layar yang sama.
 *
 * TIGA RENCANA, DAN URUTAN KEKUATANNYA
 * ------------------------------------
 *   sekolah > pro > free
 * Urutan ini bukan selera. Murid yang sekolahnya sudah membayar lisensi TIDAK BOLEH
 * diminta membayar lagi, bahkan kalau langganan pribadinya kebetulan sudah lewat masa.
 * Sebaliknya murid Pro yang pindah sekolah tidak kehilangan apa pun. Maka resolve()
 * memeriksa sekolah lebih dulu dan berhenti di kemenangan pertama.
 *
 * LUBANG YANG SENGAJA TIDAK DITUTUP DI SINI (dan kenapa)
 * -----------------------------------------------------
 * `joinClassWithCode()` di app.js:13890 menerima kode kelas HANYA dengan memeriksa
 * bentuknya (`/^[A-Z0-9][A-Z0-9-]{2,11}$/`) lalu menyimpannya ke perangkat. Tidak ada
 * server yang pernah ditanya. Kalau modul ini memberi akses penuh atas dasar kode yang
 * tersimpan itu, maka mengetik "8A-ENG" — atau menebak "AAA" — membuka seluruh isi
 * berbayar untuk siapa pun, dan gerbang ini jadi hiasan.
 *
 * Maka kontraknya tegas: KODE KELAS YANG BELUM DIVERIFIKASI TIDAK PERNAH MEMBUKA APA PUN.
 * resolve() menuntut `school.verifiedAt` — penanda bahwa ADA jawaban server yang
 * membenarkan keanggotaan itu. Kode yang ada tanpa verifikasi menghasilkan rencana `free`
 * dengan `schoolPending: true`, supaya layar bisa berkata jujur "kelasmu sedang diperiksa"
 * alih-alih diam-diam menolak. Menyediakan `verifiedAt` adalah tugas pemanggil, dan
 * sampai rute itu ada, tidak ada satu murid pun yang salah dibukakan pintu.
 *
 * JAM PERANGKAT ADALAH MILIK MURID, BUKAN MILIK KITA
 * --------------------------------------------------
 * Aplikasi ini local-first: `now` datang dari jam perangkat yang bisa diputar murid.
 * Dua arah putaran punya akibat berbeda, dan hanya satu yang merugikan:
 *   - maju  : masa Pro-nya sendiri habis lebih cepat. Merugikan dirinya, biarkan.
 *   - mundur: hari berganti ulang, jatah 3 sesi terisi lagi, dan masa Pro yang sudah
 *             lewat hidup kembali. Ini yang harus dibayar.
 * Penangkalnya sederhana dan tidak butuh server: buku hari (`dayLedger`) menyimpan
 * hari TERTINGGI yang pernah terlihat. Hari yang lebih tua dari itu dibaca sebagai hari
 * tertinggi tadi — memundurkan jam tidak menambah satu sesi pun. Ini bukan kriptografi
 * dan tidak berpura-pura begitu; ia hanya membuat kecurangan termurah berhenti bekerja.
 *
 * MASA TENGGANG YANG TIDAK SIMETRIS (keputusan produk, ditulis supaya tidak hilang)
 * -------------------------------------------------------------------------------
 *   PRO_GRACE_MS    = 0        langganan pribadi diperpanjang sendiri dalam hitungan
 *                              detik. Tenggang di sini hanyalah pendapatan yang bocor.
 *   SCHOOL_GRACE_MS = 14 hari  lisensi sekolah dibayar bendahara, lewat invoice, menurut
 *                              kalender semester. Mengunci 30 murid di tengah tugas karena
 *                              transfer telat tiga hari menghancurkan kepercayaan yang
 *                              harganya jauh di atas 14 hari akses. Tenggang ini MURAH.
 *
 * Referensi harga (§5 spesifikasi produk): Pro Rp 29.000/bulan · Rp 199.000/tahun;
 * lisensi sekolah Rp 500.000 per kelas per semester.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelEntitlement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-entitlement-v1';

  var PLANS = { FREE: 'free', PRO: 'pro', SCHOOL: 'school' };

  var DAY_MS = 24 * 60 * 60 * 1000;
  var PRO_GRACE_MS = 0;
  var SCHOOL_GRACE_MS = 14 * DAY_MS;

  /* Harga disimpan sebagai BILANGAN BULAT rupiah, bukan string berformat. Pemformatan
     "Rp 29.000" adalah urusan naskah (copy-map) karena pemisah ribuan berbeda antar
     locale; menyimpan angka di sini menjaga satu sumber kebenaran untuk aritmetika
     (mis. hemat tahunan) dan membuat gerbang bisa menghitung ulang klaimnya. */
  var PRICING = {
    currency: 'IDR',
    pro: { monthly: 29000, yearly: 199000 },
    school: { perClassPerSemester: 500000 }
  };

  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  var FREE_LEVELS = ['A1', 'A2'];

  /* null = tanpa batas. Sengaja bukan Infinity: nilai ini ikut masuk state yang
     di-JSON-kan, dan Infinity berubah jadi null diam-diam saat serialisasi — lebih baik
     null sejak awal daripada dua representasi untuk satu arti. */
  var LIMITS = {
    free: { dailyAdaptiveSessions: 3, levels: FREE_LEVELS.slice(), neuralVoice: false, examSim: false, certificate: false },
    pro: { dailyAdaptiveSessions: null, levels: LEVELS.slice(), neuralVoice: true, examSim: true, certificate: true },
    school: { dailyAdaptiveSessions: null, levels: LEVELS.slice(), neuralVoice: true, examSim: true, certificate: true }
  };

  /* Fitur berpagar, di luar level dan sesi. Nilai = rencana minimum yang membukanya. */
  var FEATURES = {
    neuralVoice: 'neuralVoice',
    examSim: 'examSim',
    certificate: 'certificate'
  };

  /**
   * Jenis sesi yang TIDAK PERNAH dihitung terhadap jatah harian, dan kenapa masing-masing:
   *   exam, placement — mengunci murid di tengah ujian penentu level adalah kerusakan
   *     pedagogis yang tidak sebanding dengan pendapatan mana pun. Ujian itu justru cara
   *     murid membuktikan dirinya layak naik.
   *   assignment, classroom — tugas dari guru adalah milik sekolah. Kalau jatah konsumen
   *     bisa menghalangi PR, satu kelas berhenti bekerja dan sekolah berhenti membayar.
   *     Ini pagar yang melindungi jalur B2B dari jalur B2C.
   *   review — mengulang yang sudah dijawab tidak menambah biaya konten dan menjaga
   *     retensi; memagarinya berarti menghukum kebiasaan yang paling ingin kita tumbuhkan.
   */
  var UNMETERED_SESSION_TYPES = ['exam', 'placement', 'assignment', 'classroom', 'review'];

  function isPlan(value) {
    return value === PLANS.FREE || value === PLANS.PRO || value === PLANS.SCHOOL;
  }

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function limitsFor(plan) {
    return LIMITS[isPlan(plan) ? plan : PLANS.FREE];
  }

  // ====================================================================================
  // A. BUKU HARI — penangkal jam mundur
  // ====================================================================================

  /**
   * Buku hari: { day, used, maxDay }.
   *   day    kunci hari yang sedang dihitung ('YYYY-MM-DD', dari studyDayKey() aplikasi)
   *   used   sesi terukur yang sudah terpakai pada hari itu
   *   maxDay kunci hari TERTINGGI yang pernah tercatat perangkat ini
   *
   * Kunci hari berformat YYYY-MM-DD sehingga perbandingan string = perbandingan waktu;
   * tidak perlu mengurai tanggal dan tidak ada zona waktu kedua yang bisa berselisih
   * dengan jam belajar aplikasi.
   */
  function sanitizeLedger(ledger) {
    var raw = ledger && typeof ledger === 'object' ? ledger : {};
    var day = String(raw.day || '');
    var maxDay = String(raw.maxDay || '');
    if (maxDay < day) maxDay = day;
    return { day: day, used: Math.max(0, Math.floor(num(raw.used))), maxDay: maxDay };
  }

  /**
   * Pindahkan buku hari ke `dayKey`. Mengembalikan buku BARU (tidak menyunting argumen).
   *
   * Tiga kemungkinan, dan hanya satu yang mereset hitungan:
   *   dayKey > maxDay  hari benar-benar baru → hitungan nol, maxDay ikut naik.
   *   dayKey == day    hari yang sama → hitungan dipertahankan.
   *   dayKey < maxDay  jam diputar mundur → diperlakukan sebagai maxDay, hitungan
   *                    DIPERTAHANKAN. Inilah satu-satunya baris yang membuat memundurkan
   *                    jam tidak menghasilkan jatah gratis.
   */
  function advanceDay(ledger, dayKey) {
    var book = sanitizeLedger(ledger);
    var key = String(dayKey || '');
    if (!key) return book;
    if (key > book.maxDay) return { day: key, used: 0, maxDay: key };
    if (key === book.day) return book;
    /* key <= maxDay tetapi bukan hari yang sedang dihitung: jam mundur (atau hari yang
       sudah lewat dibuka lagi). Kunci ke maxDay, pertahankan pemakaiannya. */
    return { day: book.maxDay, used: book.used, maxDay: book.maxDay };
  }

  /** Catat satu sesi terukur pada buku hari. Murni; kembalikan buku baru. */
  function recordSession(ledger, dayKey) {
    var book = advanceDay(ledger, dayKey);
    return { day: book.day, used: book.used + 1, maxDay: book.maxDay };
  }

  /** Apakah sesi ini dihitung terhadap jatah harian? Lihat UNMETERED_SESSION_TYPES. */
  function countsAsAdaptive(session) {
    var type = String((session && (session.type || session.kind)) || 'practice').toLowerCase();
    return UNMETERED_SESSION_TYPES.indexOf(type) < 0;
  }

  /**
   * Hitung sesi terukur pada satu hari dari riwayat.
   * `dayKeyOf(entry)` disuplai pemanggil supaya modul ini tidak pernah ikut menebak zona
   * waktu belajar — satu-satunya yang berhak menjawab itu studyDayKey() di app.js.
   */
  function countAdaptiveOn(sessions, dayKey, dayKeyOf) {
    var list = Array.isArray(sessions) ? sessions : [];
    var key = String(dayKey || '');
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var entry = list[i];
      if (!entry || !countsAsAdaptive(entry)) continue;
      var entryKey = '';
      try { entryKey = String(dayKeyOf ? dayKeyOf(entry) : (entry.day || '')); } catch (_) { entryKey = ''; }
      if (entryKey && entryKey === key) n++;
    }
    return n;
  }

  // ====================================================================================
  // B. RESOLUSI RENCANA
  // ====================================================================================

  /**
   * Tentukan rencana aktif dari fakta yang disuplai pemanggil.
   *
   * input = {
   *   now        ms epoch (wajib bermakna; 0/undefined dibaca sebagai 0 → semua masa lewat)
   *   pro        { until } langganan pribadi; until = ms epoch akhir masa
   *   school     { classCode, verifiedAt, licenseUntil, teacherId } lisensi sekolah;
   *              verifiedAt WAJIB ADA — tanpa itu tidak pernah membuka apa pun
   *   classCode  kode kelas lokal yang belum diverifikasi (untuk menjelaskan 'pending')
   * }
   *
   * keluaran = { plan, source, until, graceUntil, inGrace, schoolPending, reasons }
   *   reasons  daftar kode (bukan kalimat) yang menjelaskan KENAPA rencananya begitu.
   *            Ini yang dibaca panel Diagnostics dan gerbang — bukan hasil tebakan UI.
   */
  function resolve(input) {
    var arg = input && typeof input === 'object' ? input : {};
    var now = num(arg.now);
    var reasons = [];

    var school = arg.school && typeof arg.school === 'object' ? arg.school : null;
    var pro = arg.pro && typeof arg.pro === 'object' ? arg.pro : null;

    var localCode = String(arg.classCode || (school && school.classCode) || '');
    var schoolVerified = !!(school && num(school.verifiedAt) > 0);
    var schoolPending = !!localCode && !schoolVerified;

    // --- 1. Sekolah menang lebih dulu (lihat header: murid sekolah tidak membayar dua kali)
    if (school) {
      if (!schoolVerified) {
        reasons.push('school_unverified');
      } else {
        var schoolUntil = num(school.licenseUntil);
        var schoolGrace = schoolUntil + SCHOOL_GRACE_MS;
        if (schoolUntil > 0 && now <= schoolUntil) {
          reasons.push('school_license_active');
          return plan(PLANS.SCHOOL, 'school_license', schoolUntil, schoolGrace, false, schoolPending, reasons);
        }
        if (schoolUntil > 0 && now <= schoolGrace) {
          /* Lisensi lewat masa tetapi masih di dalam tenggang bendahara. Murid tetap
             belajar; yang berubah hanya `inGrace`, supaya layar guru/sekolah bisa
             menagih tanpa satu pun murid merasakan pintu tertutup. */
          reasons.push('school_license_grace');
          return plan(PLANS.SCHOOL, 'school_license', schoolUntil, schoolGrace, true, schoolPending, reasons);
        }
        reasons.push(schoolUntil > 0 ? 'school_license_expired' : 'school_license_missing_until');
      }
    }

    // --- 2. Langganan pribadi
    if (pro) {
      var proUntil = num(pro.until);
      var proGrace = proUntil + PRO_GRACE_MS;
      if (proUntil > 0 && now <= proGrace) {
        reasons.push(now <= proUntil ? 'pro_active' : 'pro_grace');
        return plan(PLANS.PRO, 'pro_subscription', proUntil, proGrace, now > proUntil, schoolPending, reasons);
      }
      reasons.push(proUntil > 0 ? 'pro_expired' : 'pro_missing_until');
    }

    // --- 3. Gratis
    if (schoolPending) reasons.push('school_pending_verification');
    if (!reasons.length) reasons.push('no_entitlement_record');
    return plan(PLANS.FREE, 'default', 0, 0, false, schoolPending, reasons);
  }

  function plan(name, source, until, graceUntil, inGrace, schoolPending, reasons) {
    return {
      schema: SCHEMA,
      plan: name,
      source: source,
      until: until || 0,
      graceUntil: graceUntil || 0,
      inGrace: !!inGrace,
      schoolPending: !!schoolPending,
      limits: limitsFor(name),
      reasons: reasons.slice()
    };
  }

  // ====================================================================================
  // C. GERBANG
  // ====================================================================================

  /**
   * Boleh memulai satu sesi lagi hari ini?
   *
   * input = { plan, ledger, dayKey, session }
   * keluaran = { allowed, metered, limit, used, remaining, copyKey, reason }
   *
   * `metered:false` berarti sesi ini memang tidak pernah dihitung (ujian, tugas guru,
   * ulangan) — bukan berarti jatahnya habis atau tersisa.
   */
  function sessionGate(input) {
    var arg = input && typeof input === 'object' ? input : {};
    var name = isPlan(arg.plan) ? arg.plan : PLANS.FREE;
    var limit = limitsFor(name).dailyAdaptiveSessions;
    var book = advanceDay(arg.ledger, arg.dayKey);

    if (!countsAsAdaptive(arg.session)) {
      return {
        allowed: true, metered: false, limit: limit, used: book.used,
        remaining: limit === null ? null : Math.max(0, limit - book.used),
        copyKey: '', reason: 'session_unmetered'
      };
    }
    if (limit === null) {
      return {
        allowed: true, metered: true, limit: null, used: book.used,
        remaining: null, copyKey: '', reason: name === PLANS.SCHOOL ? 'school_unlimited' : 'pro_unlimited'
      };
    }
    var remaining = Math.max(0, limit - book.used);
    if (remaining > 0) {
      return {
        allowed: true, metered: true, limit: limit, used: book.used, remaining: remaining,
        /* Peringatan hanya pada sesi TERAKHIR. Mengingatkan lebih awal membuat setiap
           sesi terasa seperti hitungan mundur — itu menjual dengan cara menakuti. */
        copyKey: remaining === 1 ? 'akses.sesi.terakhir' : '',
        reason: 'within_daily_limit'
      };
    }
    return {
      allowed: false, metered: true, limit: limit, used: book.used, remaining: 0,
      copyKey: 'akses.sesi.habis', reason: 'daily_limit_reached'
    };
  }

  /**
   * Boleh belajar di level ini?
   *
   * CATATAN PENTING soal dua gerbang: aplikasi sudah punya gerbang PEDAGOGIS
   * (`isLevelLocked`/`levelEntryDecision` di app.js — "buktikan dulu lewat ujian").
   * Gerbang di sini KOMERSIAL ("B1 ke atas ada di Pro"). Keduanya harus lulus, tetapi
   * keduanya TIDAK BOLEH bicara dengan kalimat yang sama: murid yang sudah lulus ujian B1
   * tetapi belum berlangganan harus membaca "buka dengan Pro", bukan "ikuti ujian dulu" —
   * dan sebaliknya. Karena itu fungsi ini tidak tahu apa-apa tentang levelTrust, dan
   * pemanggilnya wajib menanyakan keduanya secara terpisah.
   */
  function levelGate(level, input) {
    var arg = input && typeof input === 'object' ? input : {};
    var name = isPlan(arg.plan) ? arg.plan : PLANS.FREE;
    var target = String(level || '').toUpperCase();
    if (LEVELS.indexOf(target) < 0) {
      return { allowed: false, level: target, requiredPlan: PLANS.PRO, copyKey: '', reason: 'unknown_level' };
    }
    if (limitsFor(name).levels.indexOf(target) >= 0) {
      return { allowed: true, level: target, requiredPlan: name, copyKey: '', reason: 'level_in_plan' };
    }
    return {
      allowed: false, level: target, requiredPlan: PLANS.PRO,
      copyKey: 'akses.level.terkunci', reason: 'level_requires_pro'
    };
  }

  /** Boleh memakai suara neural lokal? Gratis tetap bersuara — lewat suara sintetis bawaan. */
  function voiceGate(input) {
    var arg = input && typeof input === 'object' ? input : {};
    var name = isPlan(arg.plan) ? arg.plan : PLANS.FREE;
    if (limitsFor(name).neuralVoice) {
      return { allowed: true, neural: true, requiredPlan: name, copyKey: '', reason: 'neural_in_plan' };
    }
    return {
      allowed: false, neural: false, requiredPlan: PLANS.PRO,
      copyKey: 'akses.suara.terkunci', reason: 'neural_requires_pro'
    };
  }

  /** Gerbang fitur bernama (examSim, certificate, neuralVoice). */
  function featureGate(featureId, input) {
    var arg = input && typeof input === 'object' ? input : {};
    var name = isPlan(arg.plan) ? arg.plan : PLANS.FREE;
    var id = String(featureId || '');
    if (!Object.prototype.hasOwnProperty.call(FEATURES, id)) {
      return { allowed: false, feature: id, requiredPlan: PLANS.PRO, copyKey: '', reason: 'unknown_feature' };
    }
    if (limitsFor(name)[id]) {
      return { allowed: true, feature: id, requiredPlan: name, copyKey: '', reason: 'feature_in_plan' };
    }
    return {
      allowed: false, feature: id, requiredPlan: PLANS.PRO,
      copyKey: 'akses.fitur.' + id + '.terkunci', reason: 'feature_requires_pro'
    };
  }

  // ====================================================================================
  // D. RINGKASAN UNTUK LAYAR
  // ====================================================================================

  /**
   * Satu panggilan yang menjawab seluruh pertanyaan satu layar, supaya UI tidak perlu
   * merangkai empat gerbang sendiri (dan tidak bisa lupa salah satunya).
   */
  function snapshot(input) {
    var arg = input && typeof input === 'object' ? input : {};
    var resolved = resolve(arg);
    var gate = sessionGate({ plan: resolved.plan, ledger: arg.ledger, dayKey: arg.dayKey, session: arg.session });
    var levels = {};
    for (var i = 0; i < LEVELS.length; i++) {
      levels[LEVELS[i]] = levelGate(LEVELS[i], { plan: resolved.plan }).allowed;
    }
    return {
      schema: SCHEMA,
      plan: resolved.plan,
      source: resolved.source,
      until: resolved.until,
      inGrace: resolved.inGrace,
      schoolPending: resolved.schoolPending,
      reasons: resolved.reasons,
      session: gate,
      levels: levels,
      neuralVoice: voiceGate({ plan: resolved.plan }).allowed,
      examSim: featureGate('examSim', { plan: resolved.plan }).allowed,
      certificate: featureGate('certificate', { plan: resolved.plan }).allowed
    };
  }

  /** Hemat tahunan dalam persen bulat — dipakai naskah penawaran; dihitung, bukan diketik. */
  function yearlySavingPercent() {
    var twelveMonths = PRICING.pro.monthly * 12;
    return Math.round((twelveMonths - PRICING.pro.yearly) / twelveMonths * 100);
  }

  return {
    SCHEMA: SCHEMA,
    PLANS: PLANS,
    LIMITS: LIMITS,
    LEVELS: LEVELS.slice(),
    FREE_LEVELS: FREE_LEVELS.slice(),
    FEATURES: FEATURES,
    PRICING: PRICING,
    PRO_GRACE_MS: PRO_GRACE_MS,
    SCHOOL_GRACE_MS: SCHOOL_GRACE_MS,
    UNMETERED_SESSION_TYPES: UNMETERED_SESSION_TYPES.slice(),
    sanitizeLedger: sanitizeLedger,
    advanceDay: advanceDay,
    recordSession: recordSession,
    countsAsAdaptive: countsAsAdaptive,
    countAdaptiveOn: countAdaptiveOn,
    resolve: resolve,
    sessionGate: sessionGate,
    levelGate: levelGate,
    voiceGate: voiceGate,
    featureGate: featureGate,
    snapshot: snapshot,
    yearlySavingPercent: yearlySavingPercent
  };
});
