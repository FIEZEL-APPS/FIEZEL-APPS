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
 *                                    <- lapisan TERAKHIR yang bersuara
 *   L5 teks tanpa suara ............ resolve(false), pemanggil menampilkan teksnya
 *
 * L4 speechSynthesis peramban DIHAPUS (m025-232, keputusan OWNER). Ia dulu duduk di antara
 * L3 dan L5, dan itulah sumber "dua suara sekaligus" yang dilaporkan pada tes kemampuan:
 * pemutar L1/L2/L3 punya jam sendiri, sedangkan `speechSynthesis` punya antrean GLOBAL milik
 * peramban yang TIDAK ikut berhenti saat pemutar kita berhenti. Begitu satu lapisan atas
 * dinilai "gagal" padahal audionya sudah/masih berjalan, utterance peramban ikut berbunyi di
 * atasnya. Suara bawaan perangkat juga bukan suara FIEZEL: aksen, kecepatan, dan nama voice
 * berbeda-beda per perangkat, jadi ia melanggar janji "satu suara" produk ini.
 *
 * Yang menggantikannya adalah L5 apa adanya: DIAM, teks tetap terbaca. Tidak ada lapisan
 * suara baru yang boleh disisipkan di bawah L3 - lihat speakWithLocal().
 *
 * S6 — LAPISAN CLOUDFLARE, DUA SISIPAN DAN TIDAK LEBIH. Saat
 * `FIEZEL_CF_CONFIG.endpoints.tts === 'on'` (dan `enabled:true` + `base` terisi), tangga di
 * atas menjadi:
 *
 *   C0 cache Cache API klien ....... cfCachedFirst()      <- alamat R2 yang pernah berhasil
 *   L1 aset R2/ElevenLabs .......... speakFromAssets()     (tidak diubah)
 *   C1 POST /api/tts/render ........ speakWithCloudflare() <- sisipan kedua
 *   L2 -> L3 -> L5 ................. tidak diubah, satu baris pun
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
 * Penjaga unduhan 152 MB di L3 tidak disentuh - lihat localEngine() dan speakWithLocal().
 *
 * PREFETCH MENGIKUTI TANGGA YANG SAMA (v5). prefetch() menghangatkan kalimat BERIKUTNYA
 * lewat L1 -> L2 -> L3, tanpa subtitle. Ia tidak boleh memicu unduhan model:
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
  var turnGeneration = 0; // NV-08: satu ownership token untuk subtitle + event visual async.

  function nextTurnGeneration() {
    turnGeneration += 1;
    return turnGeneration;
  }

  function turnOptions(options, generation) {
    var out = {};
    var source = options || {};
    for (var k in source) {
      if (Object.prototype.hasOwnProperty.call(source, k)) out[k] = source[k];
    }
    out._turnGeneration = generation;
    return out;
  }

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
   * mendiamkan murid yang jalur L1/L2/L3-nya sehat.
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
  function prepareSubtitle(english, indonesian, generation) {
    var band_ = subtitles();
    if (!band_) return Promise.resolve('');

    var ready = text(indonesian);
    if (ready) {
      if (generation === turnGeneration) band_.begin(ready);
      return Promise.resolve(ready);
    }

    var t = translator();
    if (!t || typeof t.translate !== 'function') return Promise.resolve('');

    return t.translate(english).then(function (value) {
      var line = text(value);
      if (line && generation === turnGeneration) band_.begin(line);
      return line;
    }).catch(function () { return ''; });
  }

  /* ========================================================================================
     FASE 11 (17 R-2a) — kabel siaran ke jembatan bicara maskot. Fasad hanya MELAPOR lewat
     CustomEvent 'fiezel-speech' di document; ia tidak menunggu pendengar, tidak pernah
     melempar, dan TIDAK mengubah tangga suara satu keputusan pun (G8: sistem suara tidak
     pernah diganti). detail = { phase:'start'|'progress'|'end'|'interrupt'|'silent',
     layer:0..5, currentTime?, duration?, generation? }; layer 0 = level fasad (resolusi janji/stop),
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
  function reportTurn(generation, spoke) {
    if (generation === turnGeneration) {
      emitSpeech(spoke === true ? 'end' : 'silent', spoke === true ? 0 : 5, { generation: generation });
    }
    return spoke;
  }

  /**
   * @param {string|object} input teks Inggris, atau {en, id} bila terjemahannya
   *        sudah tersedia seperti pada dialog tutor
   * @param {object} [options] diteruskan ke mesin suara (speed, voice). Options khusus:
   *        - suppressSubtitles: true untuk listening exam (skrip tidak boleh terlihat)
   * @returns {Promise<boolean>} true bila kalimatnya selesai diucapkan
   */
  function say(input, options) {
    var english = text(typeof input === 'string' ? input : (input && input.en));
    var indonesian = text(input && typeof input === 'object' ? input.id : '');

    if (!english) return Promise.resolve(false);

    var generation = nextTurnGeneration();
    /* m025-232 — PREEMPTION. Menaikkan generation hanya membuat giliran lama INERT: subtitle
     * dan event-nya berhenti dihiraukan, tetapi audionya TETAP BERBUNYI. Yang benar-benar
     * membungkam adalah stop() milik tiap lapisan, dan sampai sekarang itu tugas PEMANGGIL.
     *
     * app.js AudioService.play() memang memanggil this.stop() lebih dulu, tetapi ia bukan
     * satu-satunya pintu: adaptor Skills Lab (app.js, tts.play) memanggil say() LANGSUNG,
     * dan itu justru jalur yang dipakai sesi listening - tempat OWNER melaporkan suara
     * bertabrakan. Pemanggil yang lupa stop() dulu tertolong tanpa sengaja oleh L4, yang
     * memanggil synth.cancel() di jalur bicaranya; antrean global peramban itu ikut
     * membatalkan sisa lapisan lain. Lapisan itu sudah dihapus, jadi tolong-menolong tidak
     * disengaja itu ikut hilang.
     *
     * Karena itu say() kini mendahului dirinya sendiri: satu giliran bicara, satu suara,
     * apa pun yang dilakukan pemanggil. Ini TIDAK memancarkan 'interrupt' - giliran baru
     * mengirim 'start'-nya sendiri beberapa baris lagi, dan memancarkan interupsi di sini
     * akan membuat mulut maskot berkedip tutup-buka di setiap kalimat. */
    silenceLayers();
    var opts = turnOptions(options, generation);
    var band_ = subtitles();

    // Subtitle diminta lebih dulu tetapi tidak ditunggu; lihat catatan kepala berkas.
    // m025-147: suppressSubtitles menonaktifkan subtitle untuk listening exam, supaya
    // students tidak bisa baca jawaban sambil mendengar.
    if (!opts.suppressSubtitles) {
      prepareSubtitle(english, indonesian, generation);
    }

    // Saat flag 'off' baris ini adalah SATU-SATUNYA percabangan tambahan di seluruh jalur
    // bicara, dan ia langsung masuk ke L1 seperti hari ini.
    if (!cfEnabled()) return speakFromAssets(english, opts, band_).then(function (spoke) { return reportTurn(generation, spoke); }, function (e) { reportTurn(generation, false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang
    return cfCachedFirst(english, opts, band_).then(function (spoke) { return reportTurn(generation, spoke); }, function (e) { reportTurn(generation, false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang
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
          if (band_ && opts._turnGeneration === turnGeneration) band_.update(currentTime, duration);
          emitSpeech('progress', 1, { currentTime: currentTime, duration: duration, generation: opts._turnGeneration }); // FASE 11: jam audio C0/C1/L1
        }
      })).then(function (played) {
        if (played) { if (band_ && opts._turnGeneration === turnGeneration) band_.end(); return true; }
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
          if (band_ && opts._turnGeneration === turnGeneration) band_.update(currentTime, duration);
          emitSpeech('progress', 1, { currentTime: currentTime, duration: duration, generation: opts._turnGeneration }); // FASE 11: jam audio L1
        }
      }).then(function (played) {
        // Berkas ada di manifest tetapi gagal diputar - jaringan putus, atau autoplay
        // ditolak. Mesin runtime masih boleh mencoba: yang dijaga mandat adalah kredit,
        // dan mesin itu tidak memakainya.
        if (played) { if (band_ && opts._turnGeneration === turnGeneration) band_.end(); return true; }
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
   *   - 429 kuota habis → TURUN ke L2/L3 dan naskah kuota ditampilkan, dengan varian jujur
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
   * apakah murid akhirnya mendengar sesuatu (`spoken:true`, naskah "pakai suara cadanganku
   * dulu") atau tidak sama sekali (`spoken:false`, naskah jujur yang menyebut audionya tidak
   * ada dan teksnya tetap bisa dibaca). Memutuskan naskah lebih awal adalah cara termudah
   * menampilkan "pakai suara cadanganku" pada murid yang sedang tidak mendengar apa pun.
   *
   * m025-232: sejak L4 dihapus, `spoken:true` hanya bisa berarti L2 (mesin awan) atau L3
   * (neural di perangkat) - tidak pernah lagi suara bawaan sistem.
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
        if (band_ && opts._turnGeneration === turnGeneration) band_.update(currentTime, duration);
        emitSpeech('progress', 2, { currentTime: currentTime, duration: duration, generation: opts._turnGeneration }); // FASE 11: jam audio L2
      }
    }).then(function (done) {
      // m026-BUG2b. Mesin Puter tidak selalu MELEMPAR ketika ia gagal - pada kehabisan waktu
      // ia RESOLVE false. Dulu baris ini hanya menerjemahkan false menjadi false dan jalur
      // berakhir di situ: dua lapisan di bawahnya tidak pernah dicoba, dan murid mendapat
      // senyap total sesudah menunggu belasan detik. Kegagalan yang resolve harus turun ke
      // jalur yang sama dengan kegagalan yang melempar.
      if (done === false) return speakWithLocal(english, opts, band_);
      if (band_ && opts._turnGeneration === turnGeneration) band_.end();
      return true;
    }).catch(function (error) {
      // Puter gagal - termasuk 'puter_out_of_credit' pada kalimat PERTAMA yang kandas.
      // Jalur turunnya sama seperti kegagalan render lain; yang membedakan hanya memo di
      // mesin Puter, yang membuat kalimat berikutnya tidak lewat sini lagi.
      return speakWithLocal(english, opts, band_);
    });
  }

  /**
   * L3 - mesin neural di perangkat. Lapisan TERAKHIR yang bersuara sejak L4 dihapus.
   *
   * Kalau ia tidak ada atau ikut gagal, jawabannya false: pemanggil menampilkan teks tanpa
   * suara (L5). Itu memang lebih sunyi daripada sebelumnya, dan itu disengaja - lihat blok
   * L4 di kepala berkas. Menambahkan lapisan bersuara apa pun di bawah sini mengembalikan
   * persis tabrakan suara yang baru saja dihapus, karena setiap pemutar tambahan membawa
   * jam dan antreannya sendiri yang tidak ikut berhenti saat stop() dipanggil.
   */
  function speakWithLocal(english, opts, band_) {
    // L5: satu-satunya jalan keluar tanpa suara. Pita subtitle DITUTUP di sini - dulu itu
    // tugas closeBand() milik L4, dan menghapusnya begitu saja akan meninggalkan baris
    // terjemahan menggantung di layar untuk giliran yang sudah selesai.
    var silent = function () {
      if (band_ && opts._turnGeneration === turnGeneration) { try { band_.end(); } catch (_) {} }
      return Promise.resolve(false);
    };
    var local = localEngine();
    // Penjaga 152 MB TIDAK dilonggarkan: localEngine() tetap mengembalikan null selama aset
    // belum prepared, jadi mesin neural tetap tidak bisa dinyalakan dari jalur gagal.
    if (!local) return silent();
    emitSpeech('start', 3, { duration: english.length / (14.5 * (Number(opts.speed) > 0 ? Number(opts.speed) : 1)), generation: opts._turnGeneration }); // FASE 11: L3 tanpa onProgress — durasi taksiran 14 §1.3
    return local.speak(english, {
      speed: opts.speed,
      voice: opts.voice
    }).then(function (done) {
      if (done === false) return silent();
      if (band_ && opts._turnGeneration === turnGeneration) band_.end();
      return true;
    }).catch(silent);
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
  //      Kredit ElevenLabs juga aman: L1 hanya mengambil berkas yang SUDAH ada di manifest,
  //      dan tak satu pun mesin di bawahnya memanggil ElevenLabs.
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
   * itulah pagarnya. Murid baru mendapat suara dari L1/L2, bukan dari unduhan diam-diam.
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

  /**
   * Bungkam SEMUA pemutar, tanpa menyentuh generation dan tanpa memancarkan event.
   *
   * Dipisah dari stop() karena say() juga membutuhkannya - lihat catatan preemption di say().
   * Ia sengaja TIDAK menutup pita subtitle: say() memanggilnya tepat sebelum menyiapkan pita
   * untuk giliran BARU, dan menutup pita di sini akan menghapus baris yang belum sempat
   * tampil. stop() tetap menutup pitanya sendiri sesudah memanggil helper ini.
   *
   * Setiap lapisan punya token sendiri (Puter token/current, callGeneration mesin neural,
   * pipelineGeneration pemutar), dan stop() masing-masing lapisanlah yang membumikannya.
   * Runtime yang absen cukup diabaikan; memanggil stop() tidak pernah menyiapkan model dan
   * tidak menyentuh status()/prepare(), jadi pagar unduhan 152 MB tidak tersentuh.
   */
  function silenceLayers() {
    var store = assets();
    if (store && typeof store.stop === 'function') { try { store.stop(); } catch (_) {} }
    var voice = engine();
    if (voice && typeof voice.stop === 'function') { try { voice.stop(); } catch (_) {} }
    // NV-09: shared façade harus menghentikan L3 juga.
    var local = root.FiezelVoiceRuntime;
    if (local && typeof local.stop === 'function') { try { local.stop(); } catch (_) {} }
  }

  function stop() {
    var generation = nextTurnGeneration(); // NV-08: semua completion/subtitle turn lama menjadi inert.
    emitSpeech('interrupt', 0, { generation: generation }); // FASE 11: stop() = interupsi giliran — mulut snap tutup (14 §1.4)
    silenceLayers();
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
      // m025-232: L4 dihapus. Kuncinya DIPERTAHANKAN dan dipaku false supaya panel
      // Diagnostics lama dan gerbang yang membacanya tidak perlu menebak - "tidak ada
      // cadangan peramban" adalah jawaban yang jujur, bukan field yang hilang.
      browserFallbackReady: false,
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
