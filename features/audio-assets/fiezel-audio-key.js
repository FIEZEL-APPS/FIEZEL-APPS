/**
 * m025-150 identitas tetap untuk satu aset audio.
 *
 * MANDAT V2 pasal 4. Satu kalimat yang sama harus selalu jatuh ke kunci yang sama, di
 * browser maupun di runner GitHub Actions, hari ini maupun setahun lagi. Kalau kedua sisi
 * menghitung kunci yang berbeda walau sedikit, batch generator akan mengira aset belum ada
 * dan membakar kredit ElevenLabs untuk sesuatu yang sudah tersimpan - persis kebocoran yang
 * mandat ini larang.
 *
 * Karena itu hash-nya ditulis sendiri di sini, bukan lewat crypto.subtle. subtle bersifat
 * asinkron, absen di konteks non-secure, dan berbeda pintu masuknya antara Node dan browser;
 * tiga alasan itu masing-masing pernah cukup untuk membuat satu sisi diam-diam memakai jalur
 * cadangan. SHA-256 sinkron di bawah ini berperilaku identik di mana pun ia dijalankan.
 *
 * NORMALISASI TIDAK BOLEH MENGUBAH BUNYI. Spasi ganda, spasi tak terlihat, dan bentuk Unicode
 * yang berbeda dirapikan karena tidak terdengar. Huruf besar, tanda tanya, dan tanda seru
 * DIPERTAHANKAN: ketiganya mengubah intonasi yang dihasilkan ElevenLabs, jadi menyamakannya
 * akan menyatukan dua aset yang memang seharusnya berbeda.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelAudioKey = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-audio-key-v1';

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  /** Mengubah string menjadi byte UTF-8; teksnya mengandung IPA dan tanda kutip tipografis. */
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var lo = str.charCodeAt(i + 1);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
        i++;
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return out;
  }

  function sha256(str) {
    var bytes = utf8Bytes(str);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    // Panjang pesan ditulis 64-bit big-endian. Teks FIEZEL tidak akan mendekati 2^32 bit,
    // jadi 32 bit tinggi selalu nol - ditulis eksplisit supaya blok akhirnya tetap sah.
    bytes.push(0, 0, 0, 0);
    bytes.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    var t;

    for (var off = 0; off < bytes.length; off += 64) {
      for (t = 0; t < 16; t++) {
        w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) |
               (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (hh + S1 + ch + K[t] + w[t]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }

    var hex = '';
    for (var i = 0; i < 8; i++) hex += ('00000000' + (h[i] >>> 0).toString(16)).slice(-8);
    return hex;
  }

  /**
   * Merapikan teks tanpa menyentuh apa pun yang terdengar. Lihat catatan kepala berkas.
   */
  function canonicalText(value) {
    var s = String(value == null ? '' : value);
    if (typeof s.normalize === 'function') s = s.normalize('NFC');
    // Zero-width space, ZWNJ, ZWJ, dan BOM. Semuanya tak terlihat saat konten disalin dari
    // sumber lain, dan semuanya bisa memecah satu aset menjadi dua.
    s = s.replace(/[\u200b\u200c\u200d\ufeff]/g, '');
    s = s.replace(/[\u00a0\u2007\u202f]/g, ' ');
    s = s.replace(/[\r\n\t]+/g, ' ');
    s = s.replace(/\s{2,}/g, ' ');
    return s.trim();
  }

  function canonicalLocale(value) {
    var s = String(value == null ? '' : value).trim();
    if (!s) return 'en-US';
    var parts = s.replace('_', '-').split('-');
    var lang = parts[0].toLowerCase();
    var region = parts[1] ? parts[1].toUpperCase() : '';
    return region ? lang + '-' + region : lang;
  }

  /**
   * Hanya setelan yang benar-benar mengubah bunyi yang masuk ke kunci. Angka dibulatkan ke
   * dua desimal supaya 0.5 dan 0.5000001 - yang tidak terdengar berbeda - tidak melahirkan
   * aset kedua.
   */
  function canonicalSettings(settings) {
    var src = settings && typeof settings === 'object' ? settings : {};
    var names = Object.keys(src).sort();
    var out = {};
    for (var i = 0; i < names.length; i++) {
      var v = src[names[i]];
      if (v == null) continue;
      out[names[i]] = typeof v === 'number' ? Math.round(v * 100) / 100 : String(v);
    }
    return out;
  }

  /**
   * @param {object} identity {text, locale, voiceId, modelId, contentType, settings}
   * @returns {object} identitas kanonik beserta audioKey-nya
   */
  function build(identity) {
    var id = identity || {};
    var canon = {
      schema: SCHEMA,
      text: canonicalText(id.text),
      locale: canonicalLocale(id.locale),
      voiceId: String(id.voiceId == null ? '' : id.voiceId).trim(),
      modelId: String(id.modelId == null ? '' : id.modelId).trim(),
      contentType: String(id.contentType == null ? 'sentence' : id.contentType).trim().toLowerCase(),
      settings: canonicalSettings(id.settings)
    };
    if (!canon.text) throw new Error('audio_key_empty_text');
    if (!canon.voiceId) throw new Error('audio_key_missing_voice');
    if (!canon.modelId) throw new Error('audio_key_missing_model');

    // Urutan field dieja tangan, bukan JSON.stringify atas objek apa adanya: urutan kunci
    // objek JS mudah bergeser saat berkas ini disunting, dan pergeseran itu akan mengubah
    // setiap kunci yang pernah dihitung tanpa satu pun kesalahan yang terlihat.
    //
    // contentType SENGAJA TIDAK IKUT. Ia label penataan, bukan sesuatu yang terdengar:
    // "book" yang diucapkan sebagai kata dan sebagai bagian kalimat berbunyi sama persis,
    // jadi keduanya memang satu aset - dan menyatukannya justru menghemat kredit.
    // Memasukkannya ke hash mewajibkan setiap pemanggil menebak label yang sama persis
    // dengan yang dipakai generator, dan tombol pengucapan flashcard membuktikan betapa
    // mudah tebakan itu meleset: ia mengirim 'sentence' untuk sebuah kata, lalu menemukan
    // ABSENT padahal MP3-nya sudah dibayar dan tersimpan. Label itu tetap dicatat sebagai
    // metadata manifest, tempat ia berguna tanpa bisa memecah satu aset menjadi dua.
    var material = [
      canon.schema, canon.locale, canon.voiceId, canon.modelId,
      JSON.stringify(canon.settings), canon.text
    ].join('\u001f');

    return Object.freeze({
      schema: SCHEMA,
      audioKey: sha256(material),
      canonicalText: canon.text,
      locale: canon.locale,
      voiceId: canon.voiceId,
      modelId: canon.modelId,
      contentType: canon.contentType,
      settings: canon.settings
    });
  }

  /**
   * Nama objek untuk satu kunci, datar: <audioKey>.mp3.
   *
   * Sebelumnya fungsi ini menyusun jalur bertingkat menurut tipe, locale, dan suara. Itu
   * masuk akal untuk direktori di dalam repositori, tetapi salah untuk object storage - dan
   * lebih buruk lagi, ia tidak lagi cocok dengan apa yang benar-benar disimpan pipeline.
   * Worker hanya menerima nama 64-heksa telanjang, jadi setiap pemanggil fungsi versi lama
   * akan dijawab 400 tanpa petunjuk apa pun tentang sebabnya.
   *
   * Semua pembeda itu toh sudah masuk ke dalam hash-nya. Menuliskannya lagi di jalur berkas
   * hanya membuat dua sumber kebenaran yang bisa berselisih.
   */
  function assetPath(identity) {
    var built = identity && identity.audioKey ? identity : build(identity);
    return built.audioKey + '.mp3';
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    sha256: sha256,
    canonicalText: canonicalText,
    canonicalLocale: canonicalLocale,
    build: build,
    assetPath: assetPath
  });
}));
