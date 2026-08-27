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
 * Sampai perbaikan ini L4 tidak pernah tercapai justru pada kasus yang paling penting:
 * murid BARU, yang aset neuralnya belum diunduh, mendapat senyap total karena L3
 * mengembalikan false alih-alih meneruskan ke bawah. Penjaga unduhan 152 MB di L3 tidak
 * disentuh - lihat localEngine() dan speakWithBrowser().
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

    var store = assets();
    if (!store) return speakWithEngine(english, opts, band_);

    return store.resolve({
      text: english,
      locale: opts.locale || 'en-US',
      contentType: opts.contentType || 'sentence'
    }).then(function (found) {
      if (!found || found.state !== 'READY') return speakWithEngine(english, opts, band_);
      return store.playUrl(found.url, {
        speed: opts.speed,
        onProgress: function (currentTime, duration) {
          if (band_) band_.update(currentTime, duration);
        }
      }).then(function (played) {
        // Berkas ada di manifest tetapi gagal diputar - jaringan putus, atau autoplay
        // ditolak. Mesin runtime masih boleh mencoba: yang dijaga mandat adalah kredit,
        // dan mesin itu tidak memakainya.
        if (played) { if (band_) band_.end(); return true; }
        return speakWithEngine(english, opts, band_);
      });
    }).catch(function () {
      return speakWithEngine(english, opts, band_);
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
      utterance.onstart = function () { started = true; if (timer) { clearTimeout(timer); timer = null; } };
      utterance.onend = function () { settle(true); };
      utterance.onerror = function () { settle(false); };
      timer = setTimeout(function () { settle(false); }, BROWSER_BREAKER_MS);
      try { synth.cancel(); } catch (_) {}
      try { synth.speak(utterance); } catch (_) { settle(false); }
    });
  }

  /** Menyiapkan kalimat berikutnya lebih awal. Diam bila mesin tidak mendukungnya. */
  function prefetch(input, options) {
    var english = text(typeof input === 'string' ? input : (input && input.en));
    if (!english) return Promise.resolve(false);
    var opts = options || {};

    var store = assets();
    var ahead = store
      ? store.prefetch({ text: english, locale: opts.locale || 'en-US', contentType: opts.contentType || 'sentence' })
      : Promise.resolve(false);

    return ahead.then(function (cached) {
      if (cached) return true;
      var voice = engine();
      if (!voice || typeof voice.prefetch !== 'function') return false;
      return voice.prefetch(english, opts);
    }).catch(function () { return false; });
  }

  function stop() {
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
      translatorReady: !!translator()
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
