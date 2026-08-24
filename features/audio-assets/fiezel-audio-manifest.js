/**
 * m025-150 indeks resmi aset audio.
 *
 * MANDAT V2 pasal 9. Aplikasi TIDAK BOLEH menebak nama berkas MP3 lalu mencoba memutarnya.
 * Nama berkas memang bisa dihitung dari audioKey, tetapi keberadaan berkas bukan hal yang
 * bisa disimpulkan dari namanya: berkas bisa terunggah sebagian, tertinggal dari batch yang
 * gagal di tengah, atau tercatat tanpa binernya. Karena itu satu-satunya jawaban "aset ini
 * boleh diputar" datang dari manifest, dan hanya untuk entri yang berstatus ready.
 *
 * Manifest diambil sekali per sesi. Permintaan yang datang bersamaan sebelum unduhan pertama
 * selesai TIDAK memicu unduhan kedua - mereka menunggu janji yang sama. Ini versi kecil dari
 * aturan deduplikasi yang sama yang menjaga generator batch, dan alasannya juga sama: dua
 * pengambilan paralel atas satu sumber selalu berarti salah satunya sia-sia.
 *
 * Kegagalan memuat manifest TIDAK dianggap "tidak ada aset selamanya". Ia dicatat, dan
 * percobaan berikutnya boleh mengulang. Menyimpan kegagalan jaringan sebagai kesimpulan
 * permanen akan membuat satu gangguan sesaat mematikan suara untuk sisa sesi.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelAudioManifest = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-audio-manifest-v1';
  var DEFAULT_URL = './audio/manifest.json';

  var state = {
    url: DEFAULT_URL,
    index: null,
    version: 0,
    voiceProfile: null,
    pending: null,
    error: '',
    attempts: 0
  };

  function isReadyEntry(entry) {
    return !!(entry && entry.status === 'ready' && entry.url);
  }

  /**
   * Menerima dokumen manifest apa adanya dan menyaringnya menjadi indeks yang aman dipakai.
   * Entri tanpa url atau berstatus selain ready dibuang di sini, sekali, supaya tidak ada
   * pemanggil di hilir yang perlu mengingat pemeriksaan itu lagi.
   */
  function adopt(doc) {
    var source = doc && typeof doc === 'object' ? doc : {};
    if (source.schema && source.schema !== SCHEMA) {
      throw new Error('audio_manifest_schema_mismatch');
    }
    var assets = source.assets && typeof source.assets === 'object' ? source.assets : {};
    var index = {};
    var keys = Object.keys(assets);
    for (var i = 0; i < keys.length; i++) {
      var entry = assets[keys[i]];
      if (!isReadyEntry(entry)) continue;
      index[keys[i]] = Object.freeze({
        audioKey: keys[i],
        url: String(entry.url),
        contentType: String(entry.contentType || 'sentence'),
        locale: String(entry.locale || 'en-US'),
        voiceId: String(entry.voiceId || ''),
        modelId: String(entry.modelId || ''),
        bytes: Number(entry.bytes || 0),
        durationMs: Number(entry.durationMs || 0),
        checksum: String(entry.checksum || ''),
        sourceRef: String(entry.sourceRef || ''),
        createdAt: String(entry.createdAt || ''),
        status: 'ready'
      });
    }
    state.index = index;
    state.version = Number(source.version || 0);
    state.voiceProfile = source.voiceProfile && typeof source.voiceProfile === 'object'
      ? Object.freeze({
          voiceId: String(source.voiceProfile.voiceId || ''),
          modelId: String(source.voiceProfile.modelId || ''),
          settings: Object.freeze(Object.assign({}, source.voiceProfile.settings || {}))
        })
      : null;
    state.error = '';
    return index;
  }

  function fetchDoc(url) {
    var f = root.fetch;
    if (typeof f !== 'function') return Promise.reject(new Error('fetch_unavailable'));
    // Versi manifest ikut di query supaya service worker lama tidak menahan indeks usang;
    // berkas MP3-nya sendiri kekal dan tidak butuh perlakuan ini. Lihat pasal 10.
    return f(url, { cache: 'no-cache' }).then(function (res) {
      if (!res || !res.ok) throw new Error('audio_manifest_http_' + (res ? res.status : 'error'));
      return res.json();
    });
  }

  /** Memuat manifest sekali; pemanggil bersamaan berbagi satu janji. */
  function load(options) {
    var opts = options || {};
    if (opts.url) state.url = opts.url;
    if (state.index && !opts.force) return Promise.resolve(state.index);
    if (state.pending) return state.pending;

    state.attempts++;
    state.pending = fetchDoc(state.url).then(function (doc) {
      state.pending = null;
      return adopt(doc);
    }).catch(function (error) {
      state.pending = null;
      state.error = String(error && error.message ? error.message : error);
      // Indeks sengaja DIBIARKAN null, bukan diisi objek kosong: null berarti "belum
      // diketahui" dan boleh dicoba lagi, sedangkan objek kosong akan terbaca sebagai
      // "sudah dipastikan tidak ada aset apa pun" oleh setiap pemanggil setelahnya.
      throw error;
    });
    return state.pending;
  }

  /** Pencarian sinkron atas indeks yang sudah termuat. null bila belum dimuat atau absen. */
  function lookup(audioKey) {
    if (!state.index || !audioKey) return null;
    return state.index[audioKey] || null;
  }

  function resolve(audioKey) {
    return load().then(function () { return lookup(audioKey); }).catch(function () { return null; });
  }

  /** Dipakai pengujian dan generator batch yang sudah memegang dokumennya sendiri. */
  function adoptDocument(doc) { return adopt(doc); }

  function status() {
    return Object.freeze({
      schema: SCHEMA,
      loaded: !!state.index,
      version: state.version,
      assetCount: state.index ? Object.keys(state.index).length : 0,
      voiceProfile: state.voiceProfile,
      error: state.error,
      attempts: state.attempts,
      url: state.url
    });
  }

  function reset() {
    state.index = null; state.pending = null; state.error = '';
    state.version = 0; state.voiceProfile = null; state.attempts = 0;
    state.url = DEFAULT_URL;
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    DEFAULT_URL: DEFAULT_URL,
    load: load,
    lookup: lookup,
    resolve: resolve,
    adoptDocument: adoptDocument,
    status: status,
    reset: reset
  });
}));
