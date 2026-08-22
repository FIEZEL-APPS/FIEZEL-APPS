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

  function engine() { return root.FiezelPuterVoice || null; }
  function translator() { return root.FiezelSubtitleTranslate || null; }

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
   * @param {object} [options] diteruskan ke mesin suara (speed, voice)
   * @returns {Promise<boolean>} true bila kalimatnya selesai diucapkan
   */
  function say(input, options) {
    var opts = options || {};
    var english = text(typeof input === 'string' ? input : (input && input.en));
    var indonesian = text(input && typeof input === 'object' ? input.id : '');

    if (!english) return Promise.resolve(false);

    var voice = engine();
    if (!voice || typeof voice.speak !== 'function') return Promise.resolve(false);

    var band_ = subtitles();

    // Subtitle diminta lebih dulu tetapi tidak ditunggu; lihat catatan kepala berkas.
    prepareSubtitle(english, indonesian);

    return voice.speak(english, {
      speed: opts.speed,
      voice: opts.voice,
      onProgress: function (currentTime, duration) {
        if (band_) band_.update(currentTime, duration);
      }
    }).then(function (done) {
      if (band_) band_.end();
      return done !== false;
    }).catch(function () {
      if (band_) band_.end();
      return false;
    });
  }

  function stop() {
    var voice = engine();
    if (voice && typeof voice.stop === 'function') { try { voice.stop(); } catch (_) {} }
    if (band) { try { band.end(); } catch (_) {} }
    return true;
  }

  function status() {
    var voice = engine();
    return Object.freeze({
      schema: SCHEMA,
      voiceReady: !!(voice && voice.status && voice.status().ready),
      subtitleReady: !!subtitles(),
      translatorReady: !!translator()
    });
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    say: say,
    stop: stop,
    status: status
  });
}));
