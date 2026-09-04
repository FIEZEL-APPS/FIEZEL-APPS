/* FIEZEL — SAKELAR PENYEDERHANAAN PENGALAMAN (m025-246)
 * =============================================================================
 * OWNER, 3 Sep 2026: "4 fase suasana menggandakan QA 4x dan membingungkan murid",
 * "Skills Lab sebagai tujuan terpisah", "Personal Journey + dashboard skill", "ujian
 * per skill", dan "gerbang paket suara 119 MB" DISEMBUNYIKAN — bukan dihapus.
 *
 * KENAPA BENDERA, BUKAN `git rm`. Lima permukaan di atas punya mesin yang sudah
 * terbukti benar dan dijaga puluhan gerbang tes (ujian per skill sendiri dijaga
 * speaking-exam-test.js, listening-exam-test.js, reading-exam-test.js). Menghapus
 * kodenya berarti membuang mesin yang benar demi keputusan tampilan yang bisa
 * dibalik minggu depan, DAN memerahkan gerbang yang tidak ada hubungannya dengan
 * keluhan owner. Yang dimatikan di sini adalah PINTUNYA: murid tidak pernah lagi
 * melihatnya, mesin di baliknya tetap hidup dan tetap diuji.
 *
 * ATURAN BACA. Satu-satunya pintu resmi adalah `self.FiezelUX.on('namaBendera')`.
 * Ia menjawab `false` untuk nama yang tidak dikenal — bukan `undefined` — supaya
 * salah ketik mematikan fitur (aman) alih-alih menyalakannya diam-diam.
 *
 * ATURAN TULIS. Berkas ini ikut precache service worker dan dilayani cache-first,
 * jadi mengubah nilainya TIDAK menjangkau PWA terpasang sampai SW_REV naik. Itu
 * disengaja: bendera ini keputusan produk per rilis, bukan kill switch insiden.
 * Untuk membalik satu bendera saat pengembangan, `localStorage` menyediakan
 * override per perangkat (lihat readOverrides di bawah) — jalur itu TIDAK pernah
 * bisa menyalakan sesuatu di perangkat murid tanpa mereka mengetiknya sendiri.
 */
(function (root) {
  'use strict';

  /* MATI = permukaan disembunyikan dari murid. Setiap baris menyebut keluhan yang
     mematikannya, supaya siapa pun yang ingin menyalakannya lagi tahu apa yang ia
     kembalikan. */
  var HIDDEN = {
    /* "4 FASE SUASANA DAY/DAWN/DUSK/NIGHT ... MENGGANDAKAN QA 4X, MEMBINGUNGKAN
       MURID". Yang mati: kelas `scene-dawn|day|dusk|night` di <body>, kelas
       `phase-*` di #globalSky, dan palet langit yang bergerak sepanjang hari.
       Yang HIDUP: jam celestial itu sendiri (murid memakainya untuk tahu jam),
       hanya saja panggungnya satu, bukan empat. */
    scenePhases: false,

    /* "Ujian per skill — muncul setelah N sesi atau dari placement." Yang mati:
       pintu masuk ujian per skill di UI. Bank soalnya (speaking-exam-v1.json,
       listening-exam-v1.json, reading-exam-v1.json) dan mesin penilaiannya tetap
       utuh dan tetap diuji — hanya tidak lagi dipanggil dari layar murid. */
    skillExams: false,

    /* "Skills Lab sebagai tujuan terpisah — Listening/Speaking dilebur ke sesi
       harian." Yang mati: Skills Lab sebagai TUJUAN (kartu hub sendiri, tab
       sendiri). Yang hidup: addon-nya, dipanggil dari dalam Latihan sebagai
       "Latihan bicara & dengar". */
    skillsLabDestination: false,

    /* "Personal Journey + dashboard skill — satu tab 'Progres'." Yang mati: kartu
       Rencana/Journey dan tab Kesiapan yang berdiri sendiri. buildPersonalJourney()
       tetap dipanggil oleh perencana sesi — ia sumber isi kartu Hari ini. */
    personalJourneyTab: false,

    /* "Gerbang paket suara 119 MB — pindah ke Pengaturan + prompt kontekstual saat
       latihan pertama."

       YANG MATI: GERBANGNYA — layar yang menahan murid sampai ia mengunduh. Itu saja.

       YANG TIDAK DISENTUH, atas koreksi OWNER 4 Sep 2026 ("unduhan suaranya biarkan
       diunduh secara diam-diam di background, jangan kamu sentuh"): unduhan LATAR
       m025-236, yang menyala di boot pertama untuk semua murid tanpa bertanya. Sempat
       diubah jadi opt-in di gelombang ini, lalu dikembalikan.

       Akibatnya bendera ini TIDAK mengendalikan unduhannya — armOfflineVoiceAutoload()
       berjalan tanpa melihatnya sama sekali. Ia tetap didaftarkan (bukan dihapus) supaya
       gerbang unduhan yang dulu ada punya sakelarnya sendiri kalau suatu hari kembali,
       dan supaya keputusan ini punya tempat tertulis alih-alih jadi cerita lisan. */
    voicePackGate: false,

    /* "Peran tutor (minimal): kode kelas + progres murid read-only (Fase 4,
       KONDISIONAL)." Kondisional = belum dinyalakan. Lapisannya sudah ada di
       features/tutor-action-center; benderanya menunggu Fase 4. */
    tutorRole: false
  };

  /* HIDUP = permukaan baru yang diminta owner di bagian TAMBAH/PERBAIKI. Bendera
     tetap dipasang (bukan `if (true)` telanjang) supaya satu rilis yang bermasalah
     bisa dikembalikan ke perilaku lama tanpa revert kode. */
  var SHOWN = {
    /* "Home 'Hari ini': satu kartu, satu CTA 'Mulai 10 menit'." */
    todayHome: true,
    /* "Navigasi: maks 4 tab — Hari ini · Latihan · Progres · Pengaturan." */
    fourTabNav: true,
    /* "perkenalan <=3 layar" + "Splash (cold saja)". */
    leanIntro: true,
    /* "placement-lite 8-12 soal" yang mengisi model murid. */
    placementLite: true,
    /* "Ringkasan akhir sesi: apa yang naik, apa yang jatuh tempo besok". */
    sessionSummary: true,
    /* "Instrumentasi funnel (opt-in, agregat, tanpa PII)". Bendera ini hanya
       membuka KEMUNGKINAN mengirim; persetujuan murid tetap syarat terpisah dan
       diperiksa di features/telemetry/fiezel-funnel.js. */
    funnelTelemetry: true
  };

  var DEFAULTS = {};
  var name;
  for (name in HIDDEN) if (Object.prototype.hasOwnProperty.call(HIDDEN, name)) DEFAULTS[name] = HIDDEN[name];
  for (name in SHOWN) if (Object.prototype.hasOwnProperty.call(SHOWN, name)) DEFAULTS[name] = SHOWN[name];

  var OVERRIDE_KEY = 'fiezel-ux-flags-override-v1';

  /* Override per perangkat, untuk QA dan owner — bukan untuk murid. Dibaca SEKALI
     saat berkas dimuat dan disalin ke memori: membaca localStorage pada setiap
     pertanyaan bendera berarti satu operasi sinkron di dalam loop render, dan
     bendera ini ditanya puluhan kali per cat.

     Kunci yang tidak dikenal DIBUANG, dan nilai yang bukan boolean DIBUANG - satu
     nilai sampah di localStorage tidak boleh bisa membuat `on()` menjawab string. */
  function readOverrides(env) {
    var out = {};
    try {
      var raw = env && env.localStorage && env.localStorage.getItem(OVERRIDE_KEY);
      if (!raw) return out;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return out;
      for (var key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) continue;
        if (typeof parsed[key] !== 'boolean') continue;
        out[key] = parsed[key];
      }
    } catch (_) { /* localStorage bisa melempar di mode privat - itu bukan alasan boot gagal */ }
    return out;
  }

  var overrides = readOverrides(root);

  var resolved = {};
  for (name in DEFAULTS) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, name)) continue;
    resolved[name] = Object.prototype.hasOwnProperty.call(overrides, name) ? overrides[name] : DEFAULTS[name];
  }

  /**
   * Satu-satunya pintu baca. Nama tak dikenal -> false (gagal ke arah aman).
   * @param {string} flag
   * @returns {boolean}
   */
  function on(flag) {
    return resolved[flag] === true;
  }

  /** Kebalikan `on`, ditulis supaya pemanggil tidak perlu `!` di tengah template. */
  function off(flag) {
    return resolved[flag] !== true;
  }

  /** Salinan datar untuk panel diagnostik. Salinan, bukan rujukan - panel tidak boleh bisa menulis. */
  function snapshot() {
    var out = {};
    for (var key in resolved) if (Object.prototype.hasOwnProperty.call(resolved, key)) out[key] = resolved[key];
    return out;
  }

  /** Daftar nama bendera yang sah, untuk gerbang tes dan panel QA. */
  function names() {
    var out = [];
    for (var key in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) out.push(key);
    return out.sort();
  }

  var api = {
    on: on,
    off: off,
    snapshot: snapshot,
    names: names,
    DEFAULTS: Object.freeze(DEFAULTS),
    OVERRIDE_KEY: OVERRIDE_KEY
  };

  root.FiezelUX = api;
  /* Bentuk data mentah untuk pembaca yang tidak mau lewat fungsi (mis. gerbang
     release-audit yang membaca berkas ini sebagai teks). */
  root.FIEZEL_UX_FLAGS = Object.freeze(snapshot());

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
