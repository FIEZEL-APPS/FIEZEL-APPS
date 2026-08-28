/**
 * m025-95 satu pintu untuk "bicara Inggris, bersubtitle Indonesia".
 *
 * KEPUTUSAN OWNER. Suara Indonesia dihapus dari FIEZEL. Semua yang dulu bersuara
 * Indonesia - tutor Classroom, tombol tanya di Library, materi pelajaran - kini bicara
 * Inggris dengan terjemahan Indonesia berjalan di bawahnya.
 *
 * Modul ini ada supaya keputusan itu punya SATU tempat. Enam pemanggil dulu masing-
 * masing menyusun sendiri urutan "cek mesin, pilih suara, jatuhkan ke cadangan", dan
 * perbedaan kecil di antara mereka adalah asal beberapa laporan bug lama - satu layar
 * bersuara, layar lain diam, tanpa alasan yang terlihat. Menyalin urutan itu ke enam
 * tempat lagi hanya akan mengulang riwayat yang sama.
 *
 * DUA SUMBER TEKS SUBTITLE, dan membedakannya penting untuk jatah AI:
 *
 *   - Dialog tutor sudah berpasangan {en, id} di fiezel-tutor-dialog.js. Teks Indonesia
 *     sudah ada, jadi dipakai langsung dan TIDAK menghabiskan jatah terjemahan.
 *   - Bacaan dan skrip listening tidak punya pasangan Indonesia sama sekali; field id
 *     di reading-bank.json adalah nomor identitas, bukan terjemahan. Untuk itu barulah
 *     penerjemah dipanggil.
 *
 * TANGGA SUARA, satu urutan dan hanya satu (m026-BUG2, cf-c1 K10):
 *
 *   L1 aset R2/ElevenLabs .......... say() -> assets().resolve/playUrl
 *   L2 mesin Puter ................. speakWithEngine()
 *   L3 mesin neural di perangkat ... speakWithLocal(), HANYA bila aset sudah prepared
 *   L4 speechSynthesis peramban .... speakWithBrowser()   <- lapisan terakhir yang bersuara
 *   L5 teks tanpa suara ............ resolve(false), pemanggil menampilkan teksnya
 *
 * S6 — LAPISAN CLOUDFLARE, DUA SISIPAN DAN TIDAK LEBIH. Saat
 * `FIEZEL_CF_CONFIG.endpoints.tts === 'on'` (dan `enabled:true` + `base` terisi), tangga di
 * atas menjadi:
 *
 *   C0 cache Cache API klien ....... cfCachedFirst()      <- alamat R2 yang pernah berhasil
 *   L1 aset R2/ElevenLabs .......... speakFromAssets()     (tidak diubah)
 *   C1 POST /api/tts/render ........ speakWithCloudflare() <- sisipan kedua
 *   L2 -> L3 -> L4 -> L5 ........... tidak diubah, satu baris pun
 *
 * SAAT FLAG BUKAN 'on', `cfEnabled()` menjawab false dan tangga ini SAMA PERSIS dengan hari
 * ini: `afterAssets()` memanggil `speakWithEngine()` langsung, tidak ada satu pun permintaan
 * jaringan tambahan, tidak ada Cache API yang dibuka. Itu properti yang dijaga gerbang
 * `tts-transport-switch-test.js` butir (a), dan alasannya sederhana: tangga ini baru selesai
 * diperbaiki dua kali (kebisuan murid baru m026-BUG2, prefetch neural v5) dan tidak boleh
 * berubah perilaku demi jalur yang belum pernah hidup di perangkat murid.
 *
 * SELURUH pengetahuan tentang Cloudflare — alamat, badan permintaan, allowlist, cache klien,
 * memo kuota, penolakan URL jembatan — tinggal di `fiezel-cf-tts-transport.js`. Berkas ini
 * hanya tahu URUTAN. Itu sengaja: urutan tangga adalah satu-satunya hal yang pernah salah
 * berulang kali di sini.
 *
 * Sampai perbaikan ini L4 tidak pernah tercapai justru pada kasus yang paling penting:
 * murid BARU, yang aset neuralnya belum diunduh, mendapat senyap total karena L3
 * mengembalikan false alih-alih meneruskan ke bawah. Penjaga unduhan 152 MB di L3 tidak
 * disentuh - lihat localEngine() dan speakWithBrowser().
 *
 * PREFETCH MENGIKUTI TANGGA YANG SAMA (v5). prefetch() menghangatkan kalimat BERIKUTNYA
 * lewat L1 -> L2 -> L3, tanpa L4 dan tanpa subtitle. Ia tidak boleh memicu unduhan model:
 * lihat blok komentar di atas prefetch() untuk pagar 152 MB, batas konkurensi, dan
 * deduplikasi teks kanonik.
 *
 * URUTANNYA DISENGAJA. Subtitle diminta lebih dulu, tetapi TIDAK ditunggu: suara mulai
 * berbunyi saat itu juga, dan barisnya menyusul begitu datang. Menunggu terjemahan
 * sebelum berbunyi akan menambah jeda sebelum setiap kalimat, dan membuat kegagalan
 * jaringan terdengar sebagai aplikasi yang menggantung - padahal subtitle hanyalah
 * pelengkap.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelVoiceSay = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-voice-say-v1';
  var band = null;
  // m026-BUG2: breaker L4. Ia MENDINGIN, tidak melatch seumur sesi - lihat speakWithBrowser().
  var BROWSER_BREAKER_MS = 10000;
  var BROWSER_COOLDOWN_MS = 60000;
  var browserBreakerUntil = 0;
  function browserBreakerIsOpen() { return browserBreakerUntil > Date.now(); }

  /**
   * m025-150 aset ElevenLabs mendahului mesin apa pun.
   *
   * Mandat V2 pasal 1: memutar audio normalnya berarti mengambil berkas yang sudah disetujui,
   * dan produksi suara baru adalah kekecualian yang terjadi di luar aplikasi. Karena itu
   * resolver ditanya lebih dulu, selalu. Mesin runtime di bawahnya baru terpakai untuk kalimat
   * yang memang belum punya aset - dan tak satu pun dari mesin itu memanggil ElevenLabs,
   * sehingga urutan ini tidak bisa membocorkan kredit betapapun seringnya tombol ditekan.
   */
  function assets() {
    var mod = root.FiezelAudioResolver;
    return mod && typeof mod.resolve === 'function' ? mod : null;
  }

  function engine() { return root.FiezelPuterVoice || null; }
  function translator() { return root.FiezelSubtitleTranslate || null; }

  /**
   * S6 — pintu Cloudflare. Dua pemeriksaan, dan keduanya wajib:
   *
   *   1. modulnya ADA (`fiezel-cf-tts-transport.js` sudah dimuat, bukan gagal 404);
   *   2. flagnya 'on' (`isOn()`, yang juga menuntut `enabled:true` + `base` terisi).
   *
   * Kalau salah satu tidak terpenuhi, jawabannya null dan tangga berjalan seperti hari ini.
   * Modul yang absen HARUS berarti aman, bukan berarti galat: berkas ini dimuat malas lewat
   * `FiezelLazy`, dan satu berkas yang gagal diunduh di jaringan buruk tidak boleh
   * mendiamkan murid yang jalur L1/L2/L4-nya sehat.
   */
  function cfTransport() {
    var mod = root.FiezelCfTtsTransport;
    if (!mod || typeof mod.render !== 'function' || typeof mod.isOn !== 'function') return null;
    try { return mod.isOn() ? mod : null; } catch (_) { return null; }
  }

  function cfEnabled() { return !!cfTransport(); }

  /** Permintaan render TANPA `speed`. Lihat catatan aturan 2 di fiezel-cf-tts-transport.js. */
  function cfRequest(english, opts) {
    return {
      text: english,
      locale: opts.locale || 'en-US',
      contentType: opts.contentType || 'sentence'
    };
  }

  /**
   * Pemberitahuan kuota/degradasi. Ia hanya BERBICARA; ia tidak pernah mengunci item dan
   * tidak pernah menyentuh hitungan replay (bug m025-170). Modul naskah absen berarti tidak
   * ada pemberitahuan — bukan pengecualian yang menjatuhkan kalimat yang sedang berbunyi.
   */
  function notify(copyKey, detail) {
    if (!copyKey) return null;
    var mod = root.FiezelCfVoiceNotice;
    if (!mod || typeof mod.emit !== 'function') return null;
    try { return mod.emit(copyKey, detail || {}); } catch (_) { return null; }
  }

  /**
   * m025-121 mesin cadangan di perangkat.
   *
   * Ia hanya ada di jalur GAGAL, dan itu keseluruhan rancangannya. Jatah Puter habis
   * terlihat dari sini persis seperti kegagalan render lain: speak() menolak. Tidak ada
   * pemeriksaan sisa jatah, tidak ada penghitung, tidak ada tebakan tentang kata apa yang
   * dipakai Puter dalam pesan galatnya - semua itu akan menjadi tebakan yang diam-diam
   * salah pada hari Puter mengubah naskahnya.
   *
   * Yang dijaga ketat justru satu hal lain: cadangan ini TIDAK PERNAH menyalakan mesin
   * yang asetnya belum lengkap. status().ready sudah menjawab itu, dan tanpa pemeriksaan
   * itu satu kalimat yang gagal akan memicu inisialisasi 152 MB di tengah pelajaran.
   */
  function localEngine() {
    var rt = root.FiezelVoiceRuntime;
    if (!rt || typeof rt.speak !== 'function' || typeof rt.status !== 'function') return null;
    try {
      var st = rt.status();
      if (!st || !(st.prepared || st.ready)) return null;
    } catch (_) { return null; }
    return rt;
  }

  function subtitles() {
    if (band) return band;
    var mod = root.FiezelSubtitle;
    if (!mod || typeof mod.create !== 'function') return null;
    band = mod.create();
    return band;
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  /**
   * Menyiapkan baris Indonesia lalu menyerahkannya ke pita subtitle.
   *
   * Selalu selesai dengan tenang: kalau tidak ada terjemahan, tidak ada baris, dan
   * kalimat Inggrisnya tetap berbunyi seperti biasa.
   */
  function prepareSubtitle(english, indonesian) {
    var band_ = subtitles();
    if (!band_) return Promise.resolve('');

    var ready = text(indonesian);
    if (ready) { band_.begin(ready); return Promise.resolve(ready); }

    var t = translator();
    if (!t || typeof t.translate !== 'function') return Promise.resolve('');

    return t.translate(english).then(function (value) {
      var line = text(value);
      if (line) band_.begin(line);
      return line;
    }).catch(function () { return ''; });
  }

  /* ========================================================================================
     FASE 11 (17 R-2a) — kabel siaran ke jembatan bicara maskot. Fasad hanya MELAPOR lewat
     CustomEvent 'fiezel-speech' di document; ia tidak menunggu pendengar, tidak pernah
     melempar, dan TIDAK mengubah tangga suara satu keputusan pun (G8: sistem suara tidak
     pernah diganti). detail = { phase:'start'|'progress'|'end'|'interrupt'|'silent',
     layer:0..5, currentTime?, duration? }; layer 0 = level fasad (resolusi janji/stop),
     bukan lapisan audio tertentu. Jembatan: features/neural-voice/fiezel-speech-bridge.js.
     ======================================================================================== */
  function emitSpeech(phase, layer, extra) {
    try {
      var d = { phase: phase, layer: layer };
      if (extra) { for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) d[k] = extra[k]; } }
      (root.document || root).dispatchEvent(new CustomEvent('fiezel-speech', { detail: d }));
    } catch (_) { /* jembatan absen/gagal bukan urusan tangga suara */ }
  }
  /* Resolusi janji say() adalah otoritas "giliran bicara selesai" (14 §1.4): true → end,
     false → silent (L5 teks-tanpa-suara: mulut TIDAK PERNAH dianimasikan). Nilai janji
     diteruskan apa adanya — pengamat murni, bukan percabangan tangga. */
  function reportTurn(spoke) { emitSpeech(spoke === true ? 'end' : 'silent', spoke === true ? 0 : 5); return spoke; }

  /**
   * @param {string|object} input teks Inggris, atau {en, id} bila terjemahannya
   *        sudah tersedia seperti pada dialog tutor
   * @param {object} [options] diteruskan ke mesin suara (speed, voice). Options khusus:
   *        - suppressSubtitles: true untuk listening exam (skrip tidak boleh terlihat)
   * @returns {Promise<boolean>} true bila kalimatnya selesai diucapkan
   */
  function say(input, options) {
    var opts = options || {};
    var english = text(typeof input === 'string' ? input : (input && input.en));
    var indonesian = text(input && typeof input === 'object' ? input.id : '');

    if (!english) return Promise.resolve(false);

    var band_ = subtitles();

    // Subtitle diminta lebih dulu tetapi tidak ditunggu; lihat catatan kepala berkas.
    // m025-147: suppressSubtitles menonaktifkan subtitle untuk listening exam, supaya
    // students tidak bisa baca jawaban sambil mendengar.
    if (!opts.suppressSubtitles) {
      prepareSubtitle(english, indonesian);
    }

    // Saat flag 'off' baris ini adalah SATU-SATUNYA percabangan tambahan di seluruh jalur
    // bicara, dan ia langsung masuk ke L1 seperti hari ini.
    if (!cfEnabled()) return speakFromAssets(english, opts, band_).then(reportTurn, function (e) { reportTurn(false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang
    return cfCachedFirst(english, opts, band_).then(reportTurn, function (e) { reportTurn(false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang
  }

  /**
   * C0 — lapisan paling atas saat flag 'on'. Ia hanya membaca Cache API di perangkat: nol
   * permintaan jaringan, nol kuota, nol byte lewat origin. Isinya bukan audio, melainkan
   * ALAMAT R2 yang pernah berhasil diputar untuk kalimat ini; byte-nya sendiri sudah dipegang
   * cache resolver, jadi memutarnya tetap lewat `playUrl()` yang sama dengan L1.
   *
   * Gagal di sini SELALU berarti "lanjut ke L1", bukan "diam": cache adalah percepatan, dan
   * percepatan yang bisa mendiamkan murid bukan percepatan.
   */
  function cfCachedFirst(english, opts, band_) {
    var cf = cfTransport();
    var store = assets();
    if (!cf || !store || typeof store.playUrl !== 'function' || typeof cf.cachedUrl !== 'function') {
      return speakFromAssets(english, opts, band_);
    }
    var req = cfRequest(english, opts);
    return Promise.resolve(cf.cachedUrl(req)).then(function (url) {
      if (!url) return speakFromAssets(english, opts, band_);
      return playFromUrl(store, url, opts, band_).then(function (played) {
        if (played) return true;
        return speakFromAssets(english, opts, band_);
      });
    }, function () {
      return speakFromAssets(english, opts, band_);
    });
  }

  /**
   * Memutar URL objek R2 LANGSUNG dari `audio.fiezel.my.id`, bukan lewat jembatan PHP origin.
   * `speed` diterapkan di sini sebagai `playbackRate` — itulah sebabnya ia tidak perlu, dan
   * tidak boleh, menjadi bagian identitas suara di badan permintaan render.
   */
  function playFromUrl(store, url, opts, band_) {
    try {
      return Promise.resolve(store.playUrl(url, {
        speed: opts.speed,
        onProgress: function (currentTime, duration) {
          if (band_) band_.update(currentTime, duration);
          emitSpeech('progress', 1, { currentTime: currentTime, duration: duration }); // FASE 11: jam audio C0/C1/L1
        }
      })).then(function (played) {
        if (played) { if (band_) band_.end(); return true; }
        return false;
      }, function () { return false; });
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  /**
   * L1 — badan say() sebelum S6, tanpa perubahan perilaku. Satu-satunya bedanya: sasaran
   * jatuhnya kini `afterAssets()`, yang saat flag 'off' identik dengan `speakWithEngine()`.
   */
  function speakFromAssets(english, opts, band_) {
    var store = assets();
    if (!store) return afterAssets(english, opts, band_);

    return store.resolve({
      text: english,
      locale: opts.locale || 'en-US',
      contentType: opts.contentType || 'sentence'
    }).then(function (found) {
      if (!found || found.state !== 'READY') return afterAssets(english, opts, band_);
      return store.playUrl(found.url, {
        speed: opts.speed,
        onProgress: function (currentTime, duration) {
          if (band_) band_.update(currentTime, duration);
          emitSpeech('progress', 1, { currentTime: currentTime, duration: duration }); // FASE 11: jam audio L1
        }
      }).then(function (played) {
        // Berkas ada di manifest tetapi gagal diputar - jaringan putus, atau autoplay
        // ditolak. Mesin runtime masih boleh mencoba: yang dijaga mandat adalah kredit,
        // dan mesin itu tidak memakainya.
        if (played) { if (band_) band_.end(); return true; }
        return afterAssets(english, opts, band_);
      });
    }).catch(function () {
      return afterAssets(english, opts, band_);
    });
  }

  /**
   * TITIK SISIP. Saat flag 'off' fungsi ini hanya meneruskan ke L2, jadi tangga hari ini utuh
   * baris demi baris. Saat 'on' ia menyisipkan C1 di antara L1 dan L2 — posisi yang disengaja:
   * sesudah aset yang sudah dibayar (gratis), sebelum Puter (kredit pihak ketiga).
   */
  function afterAssets(english, opts, band_) {
    if (!cfEnabled()) return speakWithEngine(english, opts, band_);
    return speakWithCloudflare(english, opts, band_);
  }

  /**
   * C1 — `POST /api/tts/render`. Klien mengirim teks + parameter yang di-allowlist saja;
   * kunci cache dihitung ULANG di server dan klien tidak pernah mengirimnya (badan permintaan
   * dibangun di `fiezel-cf-tts-transport.js:renderBody`).
   *
   * TIGA HASIL, dan semuanya berujung pada murid mendengar sesuatu bila mungkin:
   *   - ok + URL → diputar langsung dari R2, lalu alamatnya diingat untuk C0;
   *   - 429 kuota habis → TURUN ke L2/L3/L4 dan naskah kuota ditampilkan, dengan varian jujur
   *     bila ternyata tidak ada lapisan yang bersuara. Tidak mengunci, tidak menghitung replay;
   *   - degradasi/galat/timeout → turun seperti kegagalan render lain.
   */
  function speakWithCloudflare(english, opts, band_) {
    var cf = cfTransport();
    var store = assets();
    if (!cf) return speakWithEngine(english, opts, band_);
    var req = cfRequest(english, opts);

    return Promise.resolve(cf.render(req)).then(function (res) {
      var out = res || {};
      if (out.ok && out.url && store && typeof store.playUrl === 'function') {
        return playFromUrl(store, out.url, opts, band_).then(function (played) {
          if (played) {
            // Diingat SESUDAH berhasil berbunyi. Mengingat URL yang belum pernah bisa diputar
            // berarti menanam kegagalan yang sama di lapisan teratas untuk selamanya.
            try { Promise.resolve(cf.remember(req, out.url)).catch(function () {}); } catch (_) {}
            return true;
          }
          return descend(out, english, opts, band_);
        });
      }
      return descend(out, english, opts, band_);
    }, function () {
      return speakWithEngine(english, opts, band_);
    });
  }

  /**
   * Turun satu lapisan, lalu bicara jujur tentang apa yang terjadi.
   *
   * Naskahnya dipilih SESUDAH tahu hasilnya, bukan sebelum: hanya di titik ini kita tahu
   * apakah murid akhirnya mendengar sesuatu (`spoken:true`, naskah "pakai suara perangkat
   * dulu") atau tidak sama sekali (`spoken:false`, naskah jujur yang menyebut audionya tidak
   * ada dan teksnya tetap bisa dibaca). Memutuskan naskah lebih awal adalah cara termudah
   * menampilkan "pakai suara perangkat" pada murid yang sedang tidak mendengar apa pun.
   */
  function descend(res, english, opts, band_) {
    var out = res || {};
    var copyKey = out.status === 429 ? (out.copyKey || 'quota.tts.exhausted') : (out.copyKey || '');
    return speakWithEngine(english, opts, band_).then(function (spoke) {
      notify(copyKey, {
        spoken: spoke === true,
        resetAt: out.resetAt,
        retryAfter: out.retryAfter,
        layer: spoke === true ? 'fallback' : ''
      });
      return spoke;
    }, function () {
      notify(copyKey, { spoken: false, resetAt: out.resetAt, retryAfter: out.retryAfter });
      return false;
    });
  }

  /**
   * Jalur mesin runtime, persis seperti sebelum m025-150. Ia kini hanya terpakai untuk
   * kalimat yang belum punya aset ElevenLabs.
   */
  function speakWithEngine(english, opts, band_) {
    var voice = engine();
    // m026-BUG2: mesin Puter absen bukan alasan untuk diam. Dulu di sini jalur berakhir
    // dengan false, padahal masih ada dua lapisan di bawahnya.
    if (!voice || typeof voice.speak !== 'function') return speakWithLocal(english, opts, band_);

    // m026-02: memo kredit habis. Keberatan di kepala fungsi localEngine() tetap berlaku -
    // yang dibaca di sini BUKAN naskah pesan galat, melainkan keputusan terstruktur yang
    // sudah diambil mesin Puter sendiri (status 402 / code insufficient_funds). Selama memo
    // itu menyala, mesin Puter TIDAK dipanggil lagi di sesi ini: itulah yang mencegah SDK
    // memunculkan dialog upgrade-nya untuk kalimat kedua, ketiga, dan seterusnya.
    var credit = null;
    try { credit = typeof voice.creditStatus === 'function' ? voice.creditStatus() : null; } catch (_) { credit = null; }
    if (credit && credit.outOfCredit) return speakWithLocal(english, opts, band_);

    return voice.speak(english, {
      speed: opts.speed,
      voice: opts.voice,
      onProgress: function (currentTime, duration) {
        if (band_) band_.update(currentTime, duration);
        emitSpeech('progress', 2, { currentTime: currentTime, duration: duration }); // FASE 11: jam audio L2
      }
    }).then(function (done) {
      // m026-BUG2b. Mesin Puter tidak selalu MELEMPAR ketika ia gagal - pada kehabisan waktu
      // ia RESOLVE false. Dulu baris ini hanya menerjemahkan false menjadi false dan jalur
      // berakhir di situ: dua lapisan di bawahnya tidak pernah dicoba, dan murid mendapat
      // senyap total sesudah menunggu belasan detik. Kegagalan yang resolve harus turun ke
      // jalur yang sama dengan kegagalan yang melempar.
      if (done === false) return speakWithLocal(english, opts, band_);
      if (band_) band_.end();
      return true;
    }).catch(function (error) {
      // Puter gagal - termasuk 'puter_out_of_credit' pada kalimat PERTAMA yang kandas.
      // Jalur turunnya sama seperti kegagalan render lain; yang membedakan hanya memo di
      // mesin Puter, yang membuat kalimat berikutnya tidak lewat sini lagi.
      return speakWithLocal(english, opts, band_);
    });
  }

  /**
   * Mesin perangkat - satu-satunya saat ia terdengar. Kalau ia juga tidak ada atau ikut
   * gagal, hasilnya sama seperti sebelum m025-121: false, dan pemanggil menampilkan
   * subtitle tanpa suara. Tidak ada modal, tidak ada dialog, tidak ada tuntutan upgrade.
   */
  function speakWithLocal(english, opts, band_) {
    var local = localEngine();
    // m026-BUG2. Penjaga 152 MB TIDAK dilonggarkan: localEngine() tetap mengembalikan null
    // selama aset belum prepared, jadi mesin neural tetap tidak bisa dinyalakan dari jalur
    // gagal. Yang berubah hanya apa yang terjadi SESUDAH null - dulu jalurnya berhenti di
    // sini dengan false, dan itulah kenapa murid baru mendapat SENYAP TOTAL (cf-c1 K10).
    if (!local) return speakWithBrowser(english, opts, band_);
    emitSpeech('start', 3, { duration: english.length / (14.5 * (Number(opts.speed) > 0 ? Number(opts.speed) : 1)) }); // FASE 11: L3 tanpa onProgress — durasi taksiran 14 §1.3
    return local.speak(english, {
      speed: opts.speed,
      voice: opts.voice
    }).then(function (done) {
      if (done === false) return speakWithBrowser(english, opts, band_);
      if (band_) band_.end();
      return true;
    }).catch(function () {
      return speakWithBrowser(english, opts, band_);
    });
  }

  /**
   * L4 - suara bawaan peramban. Lapisan TERAKHIR yang masih bersuara.
   *
   * Ia berdiri sendiri di sini, tidak lewat FiezelVoiceRuntime, justru supaya penjaga
   * unduhan tidak perlu dilonggarkan sedikit pun: berkas ini tidak menyentuh satu pun
   * aset neural, tidak memanggil prepare(), dan tidak bisa memicu unduhan 152 MB
   * betapapun sering ia dipakai. Kalau nanti browserSpeak dipisah menjadi modul sendiri
   * (cf-b4 §5.1 butir 1), modul itu dipakai lebih dulu lewat FiezelBrowserSpeak.
   *
   * BREAKER. cf-b4 §5.4 meminta breaker 10 s untuk kegagalan khas iOS, di mana speak()
   * diterima tanpa pernah berbunyi. Yang diukur di sini adalah 10 s SEBELUM onstart, bukan
   * 10 s sampai selesai: satu paragraf bacaan memang wajar berbunyi lebih dari 10 s, dan
   * memutusnya di tengah akan mengubah pagar keselamatan menjadi bug baru.
   */
  function speakWithBrowser(english, opts, band_) {
    var closeBand = function () { if (band_) { try { band_.end(); } catch (_) {} } };
    // Breaker yang melatch seumur sesi akan mendiamkan murid untuk selamanya setelah SATU
    // kemacetan - dan kemacetan itu sering hanya soal daftar voice yang belum selesai dimuat
    // atau iOS yang menunggu gesture. Karena itu ia mendingin: klik berikutnya sesudah
    // BROWSER_COOLDOWN_MS benar-benar mencoba lagi, bukan langsung menjawab false.
    if (browserBreakerIsOpen()) { closeBand(); return Promise.resolve(false); }

    var mod = root.FiezelBrowserSpeak;
    if (mod && typeof mod.speak === 'function') {
      return mod.speak(english, { lang: opts.locale || 'en-US', locale: opts.locale || 'en-US', speed: opts.speed, voice: opts.voice })
        .then(function (done) { closeBand(); return done !== false; })
        .catch(function () { browserBreakerUntil = Date.now() + BROWSER_COOLDOWN_MS; closeBand(); return false; });
    }

    var synth = root.speechSynthesis;
    var Utterance = root.SpeechSynthesisUtterance;
    if (!synth || typeof Utterance !== 'function') { closeBand(); return Promise.resolve(false); }

    return new Promise(function (resolve) {
      var settled = false, started = false, timer = null;
      var settle = function (ok) {
        if (settled) return;
        settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        if (!ok && !started) browserBreakerUntil = Date.now() + BROWSER_COOLDOWN_MS;
        closeBand();
        resolve(ok);
      };
      var utterance;
      try { utterance = new Utterance(String(english || '')); } catch (_) { return settle(false); }
      utterance.lang = opts.locale || 'en-US';
      var rate = Number(opts.speed);
      utterance.rate = rate > 0 ? rate : 1;
      if (opts.voice && typeof opts.voice === 'object') { try { utterance.voice = opts.voice; } catch (_) {} }
      utterance.onstart = function () { started = true; if (timer) { clearTimeout(timer); timer = null; } emitSpeech('start', 4); }; // FASE 11: L4 bicara HANYA sejak onstart (14 §1.3)
      utterance.onend = function () { settle(true); };
      utterance.onerror = function () { settle(false); };
      timer = setTimeout(function () { settle(false); }, BROWSER_BREAKER_MS);
      try { synth.cancel(); } catch (_) {}
      try { synth.speak(utterance); } catch (_) { settle(false); }
    });
  }

  // =========================================================================================
  // PREFETCH — v5. Sampai perbaikan ini prefetch berhenti di L2 dan mesin neural di
  // perangkat TIDAK PERNAH ikut dihangatkan (reports/voice-v1-audit.md §4). Akibatnya
  // terukur: kalimat berikutnya baru mulai digenerasi sesudah audio kalimat sekarang habis,
  // dan jeda terdengar rata-rata 4.422 ms. Dengan prefetch yang benar-benar sampai ke mesin
  // neural, audit yang sama mengukur 777 ms (skenario A2).
  //
  // TIGA PAGAR YANG TIDAK BOLEH RUNTUH DI SINI:
  //
  //   1. PENJAGA 152 MB. Prefetch neural HANYA lewat localEngine(), yang mengembalikan null
  //      selama status().prepared/ready belum benar. Prefetch TIDAK BOLEH memanggil
  //      prepare(), ensureReady(), prewarm(), atau apa pun yang bisa memulai unduhan model
  //      152 MB. Pekerjaan spekulatif tidak berhak menghabiskan kuota data murid tanpa
  //      persetujuannya - dan murid tidak pernah menekan apa pun untuk memicu prefetch.
  //      Kalau mesin belum prepared, jawabannya false DENGAN TENANG, titik.
  //   2. TIDAK MENGHAMBAT DAN TIDAK PERNAH MELEMPAR. Pemanggil boleh mengabaikan hasilnya;
  //      janji yang dikembalikan tidak pernah reject, dan kegagalan apa pun sepenuhnya
  //      senyap terhadap murid (tidak ada toast, tidak ada subtitle, tidak ada breaker).
  //   3. TIDAK MENULIS APA PUN. Prefetch tidak menyentuh pita subtitle (jadi penerjemah
  //      tidak dipanggil dan jatah AI tidak terpakai), tidak menyentuh pemutar, dan tidak
  //      pernah menyalakan L4 speechSynthesis - suara peramban tidak punya cache, jadi
  //      menghangatkannya berarti membunyikannya lebih awal. Kredit ElevenLabs juga aman:
  //      L1 hanya mengambil berkas yang SUDAH ada di manifest, dan tak satu pun mesin di
  //      bawahnya memanggil ElevenLabs.
  //
  // URUTAN LAPISANNYA SAMA DENGAN say(): aset R2 -> Puter -> neural lokal. Menembak neural
  // langsung akan menghangatkan mesin yang tidak akan dipakai untuk kalimat yang sudah punya
  // aset, dan itu membakar CPU ponsel murah untuk hasil yang dibuang.

  // Ponsel kelas bawah tersedak bila dua-tiga generasi neural jalan bersamaan, dan mesin
  // neural sendiri single-flight (fiezel-neural-voice.js:286-290): prefetch keempat hanya
  // akan mengantre dan menua. Satu di depan sudah cukup untuk menutup jeda pada RTF ~0,9;
  // dua memberi sedikit ruang bila lapisan L1 yang lambat.
  var PREFETCH_MAX_INFLIGHT = 2;
  var prefetchInflight = 0;
  // key kanonik -> janji yang sedang berjalan. Pemanggil yang meminta teks yang sama dua
  // kali (Library warmNext dipanggil ulang setelah replay, quiz yang digambar dua kali)
  // menerima janji yang SAMA, bukan generasi kedua.
  var prefetchPending = Object.create(null);

  /**
   * Kunci teks kanonik. Beda spasi, beda huruf besar-kecil, dan tanda kutip melengkung
   * bukan kalimat yang berbeda bagi mesin suara, jadi ia tidak boleh menjadi prefetch
   * kedua. Locale/contentType/voice/speed ikut karena hasil render-nya memang berbeda.
   */
  function prefetchKey(english, opts) {
    var canonical = String(english)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    var voice = opts.voice && typeof opts.voice === 'object' ? (opts.voice.name || 'obj') : (opts.voice || '');
    return [
      canonical,
      opts.locale || 'en-US',
      opts.contentType || 'sentence',
      String(voice),
      String(opts.speed || '')
    ].join('\u0001');
  }

  /**
   * L3 hangat - satu-satunya cabang yang menyentuh mesin neural, dan ia lewat pintu yang
   * sama dengan speakWithLocal(): localEngine().
   *
   * PENJAGA 152 MB. Perhatikan yang TIDAK ada di sini: tidak ada rt.prepare(), tidak ada
   * ensureReady(), tidak ada prewarm(), tidak ada refreshPreparedFlag(). localEngine()
   * membaca status() dan menjawab null selama aset belum prepared/ready, dan null di sini
   * berarti Promise.resolve(false) - BUKAN unduhan 152 MB di latar belakang. Siapa pun yang
   * kelak ingin "memperbaiki" prefetch yang selalu false pada murid baru: itu bukan bug,
   * itulah pagarnya. Murid baru mendapat suara dari L1/L2/L4, bukan dari unduhan diam-diam.
   */
  function prefetchWithLocal(english, opts) {
    var local = localEngine();
    if (!local || typeof local.prefetch !== 'function') return Promise.resolve(false);
    try {
      return Promise.resolve(local.prefetch(english, {
        speed: opts.speed,
        voice: opts.voice,
        lang: opts.lang,
        intent: opts.intent
      })).then(function (ok) { return ok !== false && ok != null; }, function () { return false; });
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  /**
   * S6 — C1 hangat. Prefetch memakai jalur CF yang SAMA dengan say(), sehingga kalimat
   * berikutnya sudah ada di R2 (dan alamatnya sudah ada di C0) sebelum tombolnya ditekan.
   *
   * PAGAR 152 MB TETAP UTUH: tidak ada `prepare()`, `ensureReady()`, atau `prewarm()` di
   * cabang ini, sama seperti `prefetchWithLocal()`. Jalur CF adalah panggilan HTTP, bukan
   * inisialisasi mesin di perangkat, jadi ia tidak bisa memicu unduhan model.
   *
   * KEJUJURAN TENTANG BIAYA, dan ini batas nyata yang tidak ditutupi: `POST /api/tts/render`
   * untuk kalimat yang BELUM ada di R2 memang bisa memakai kuota untuk kalimat yang mungkin
   * tidak pernah didengar murid. Yang meredam bukan tebakan, melainkan tiga hal yang bisa
   * diperiksa: (1) C0 dibaca lebih dulu, jadi kalimat yang sudah hangat tidak mengirim apa
   * pun; (2) cache hit di server TIDAK menyentuh kuota sama sekali (route-tts.js langkah 2
   * menjawab sebelum langkah 4), sehingga korpus yang sudah dipra-render gratis; (3) memo 429
   * di transport mematikan seluruh jalur CF sesudah penolakan pertama, termasuk untuk prefetch.
   * Kalau kelak biaya spekulatif ini terukur terlalu mahal, yang dimatikan adalah cabang INI —
   * bukan `render()`, dan bukan tangga bicaranya.
   */
  function prefetchWithCloudflare(english, opts) {
    var cf = cfTransport();
    if (!cf) return prefetchWithEngine(english, opts);
    var req = cfRequest(english, opts);
    var cached = typeof cf.cachedUrl === 'function' ? Promise.resolve(cf.cachedUrl(req)) : Promise.resolve('');
    return cached.then(function (url) {
      // Sudah hangat: nol permintaan, nol kuota.
      if (url) return true;
      return Promise.resolve(cf.render(req)).then(function (res) {
        var out = res || {};
        if (out.ok && out.url) {
          return Promise.resolve(cf.remember(req, out.url)).then(function () { return true; }, function () { return true; });
        }
        // 429/degradasi/galat: hangatkan lapisan di bawahnya, DIAM-DIAM. Prefetch tidak
        // pernah memunculkan pemberitahuan — murid tidak menekan apa pun untuk memicunya,
        // jadi ia juga tidak berhak mendapat toast karenanya.
        return prefetchWithEngine(english, opts);
      }, function () {
        return prefetchWithEngine(english, opts);
      });
    }, function () {
      return prefetchWithEngine(english, opts);
    });
  }

  /** Titik sisip prefetch. Saat flag 'off' ia identik dengan prefetchWithEngine(). */
  function prefetchAfterAssets(english, opts) {
    if (!cfEnabled()) return prefetchWithEngine(english, opts);
    return prefetchWithCloudflare(english, opts);
  }

  /** L2 hangat, dengan memo kredit yang sama seperti speakWithEngine(). */
  function prefetchWithEngine(english, opts) {
    var voice = engine();
    if (!voice || typeof voice.prefetch !== 'function') return prefetchWithLocal(english, opts);
    var credit = null;
    try { credit = typeof voice.creditStatus === 'function' ? voice.creditStatus() : null; } catch (_) { credit = null; }
    // Memo kredit habis: jangan panggil Puter lagi di sesi ini, apalagi untuk pekerjaan
    // spekulatif yang tidak diminta murid.
    if (credit && credit.outOfCredit) return prefetchWithLocal(english, opts);
    try {
      return Promise.resolve(voice.prefetch(english, opts)).then(function (ok) {
        if (ok) return true;
        return prefetchWithLocal(english, opts);
      }, function () {
        return prefetchWithLocal(english, opts);
      });
    } catch (_) {
      return prefetchWithLocal(english, opts);
    }
  }

  /**
   * Menyiapkan kalimat berikutnya lebih awal. Diam bila mesin tidak mendukungnya.
   *
   * @returns {Promise<boolean>} tidak pernah reject. false berarti "tidak ada yang bisa
   *          dihangatkan", dan itu keadaan yang sah - bukan galat yang perlu dilaporkan.
   */
  function prefetch(input, options) {
    var english = text(typeof input === 'string' ? input : (input && input.en));
    if (!english) return Promise.resolve(false);
    var opts = options || {};
    var key = prefetchKey(english, opts);

    // Deduplikasi: teks yang sama yang masih dihangatkan tidak dihangatkan dua kali.
    if (prefetchPending[key]) return prefetchPending[key];
    // Batas konkurensi. Menjawab false lebih baik daripada mengantre: kalimat yang
    // ditolak di sini akan tetap digenerasi oleh say()-nya sendiri, dan ponsel murah
    // tidak dipaksa menjalankan tiga generasi sekaligus.
    if (prefetchInflight >= PREFETCH_MAX_INFLIGHT) return Promise.resolve(false);

    var store = assets();
    var run;
    try {
      var ahead = store
        ? Promise.resolve(store.prefetch({ text: english, locale: opts.locale || 'en-US', contentType: opts.contentType || 'sentence' }))
        : Promise.resolve(false);
      run = ahead.then(function (cached) {
        if (cached) return true;
        return prefetchAfterAssets(english, opts);
      }, function () {
        // Resolver gagal (manifest/jaringan) bukan alasan melewatkan lapisan di bawahnya:
        // justru kalimat inilah yang paling butuh mesin di perangkat.
        return prefetchAfterAssets(english, opts);
      });
    } catch (_) {
      run = Promise.resolve(false);
    }

    prefetchInflight++;
    prefetchPending[key] = run = run.then(function (ok) { return ok === true; }, function () { return false; })
      .then(function (ok) {
        prefetchInflight--;
        delete prefetchPending[key];
        return ok;
      });
    return run;
  }

  function stop() {
    emitSpeech('interrupt', 0); // FASE 11: stop() = interupsi giliran — mulut snap tutup (14 §1.4)
    var store = assets();
    if (store && typeof store.stop === 'function') { try { store.stop(); } catch (_) {} }
    var voice = engine();
    if (voice && typeof voice.stop === 'function') { try { voice.stop(); } catch (_) {} }
    // L4 punya pemutar sendiri; tanpa baris ini "Keluar" meninggalkan kalimat yang masih
    // berbunyi di layar berikutnya.
    if (root.speechSynthesis && typeof root.speechSynthesis.cancel === 'function') { try { root.speechSynthesis.cancel(); } catch (_) {} }
    if (band) { try { band.end(); } catch (_) {} }
    return true;
  }

  function status() {
    var voice = engine();
    var store = assets();
    return Object.freeze({
      schema: SCHEMA,
      assetsReady: !!(store && store.status && store.status().manifest && store.status().manifest.loaded),
      assetCount: store && store.status && store.status().manifest ? store.status().manifest.assetCount : 0,
      voiceReady: !!(voice && voice.status && voice.status().ready),
      localFallbackReady: !!localEngine(),
      browserFallbackReady: !!(root.speechSynthesis && typeof root.SpeechSynthesisUtterance === 'function') && !browserBreakerIsOpen(),
      browserBreakerOpen: browserBreakerIsOpen(),
      browserBreakerCooldownMs: BROWSER_COOLDOWN_MS,
      subtitleReady: !!subtitles(),
      translatorReady: !!translator(),
      // S6 — dilaporkan supaya panel Diagnostics bisa menjawab "jalur mana yang dipakai"
      // tanpa menebak dari perilaku. false berarti tangga hari ini, apa adanya.
      cfVoiceEnabled: cfEnabled(),
      cfVoiceMode: (function () {
        var mod = root.FiezelCfTtsTransport;
        try { return mod && typeof mod.mode === 'function' ? mod.mode() : 'off'; } catch (_) { return 'off'; }
      }())
    });
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    say: say,
    prefetch: prefetch,
    stop: stop,
    status: status
  });
}));
