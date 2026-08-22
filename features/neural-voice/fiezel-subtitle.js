/**
 * m025-92 subtitle Indonesia berjalan di bawah suara Inggris.
 *
 * KEPUTUSAN OWNER. Suara Indonesia dihapus seluruhnya dari FIEZEL. Sebagai gantinya,
 * setiap kali suara Inggris berbunyi, terjemahan Indonesianya berjalan di bawahnya.
 * Jadi ini bukan hiasan: inilah satu-satunya jalur pemahaman bahasa ibu yang tersisa,
 * sehingga gagalnya harus selalu tenang - kalimat Inggrisnya tetap terdengar, dan
 * yang hilang paling banyak hanyalah barisnya.
 *
 * MASALAH PENJADWALAN. Puter mengembalikan satu berkas audio tanpa penanda waktu per
 * kalimat, jadi tidak ada yang memberi tahu kapan kalimat kedua dimulai. Ada dua cara
 * mendapatkannya, dan yang lebih menggoda justru salah:
 *
 *   - Merender per kalimat supaya batasnya pasti. Ditolak: OWNER menguji konfigurasi
 *     itu di probe dan hanya menilai bagus yang satu panggilan utuh. Mengembalikannya
 *     demi subtitle berarti menukar kualitas suara demi ketepatan baris.
 *   - Membagi durasi menurut panjang karakter. Inilah yang dipakai. Perkiraan, tetapi
 *     kesalahannya kecil dan tidak menumpuk, karena setiap batas dihitung dari durasi
 *     total dan bukan dari batas sebelumnya.
 *
 * Penggeraknya adalah currentTime audio yang sedang berbunyi, bukan setInterval. Timer
 * terpisah akan hanyut terhadap audio, dan hanyutnya terlihat jelas sebagai subtitle
 * yang makin lama makin meleset dari suaranya.
 *
 * Pembagian kalimatnya memakai FiezelProsody, yang sudah dipakai aplikasi untuk hal
 * yang sama. Menyalin ulang aturannya berarti dua sumber kebenaran yang akan berbeda
 * diam-diam - penyakit berlapis yang justru sedang dibuang di milestone ini.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelSubtitle = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-subtitle-v1';
  var HOST_ID = 'fiezelSubtitle';

  /**
   * Memecah teks jadi kalimat. Memakai FiezelProsody bila ada; kalau tidak, satu
   * pemecah minimal supaya subtitle tetap muncul di lingkungan tanpa modul itu.
   */
  function sentencesOf(text, lang) {
    var value = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!value) return [];
    var P = root.FiezelProsody;
    if (P && typeof P.phrases === 'function') {
      try {
        var out = P.phrases(value, 200);
        if (out && out.length) return out;
      } catch (_) {}
    }
    return value.split(/(?<=[.!?…])\s+/).filter(Boolean);
  }

  /**
   * Isyarat waktu untuk tiap baris, dibagi menurut panjang karakter.
   *
   * Setiap batas dihitung dari durasi total, bukan ditumpuk dari batas sebelumnya,
   * supaya galat pembulatan tidak beranak. Baris kosong tidak pernah dihasilkan:
   * baris yang tidak punya durasi tidak akan pernah tampil dan hanya membuat urutan
   * indeksnya bergeser terhadap teks aslinya.
   *
   * @returns {Array<{text:string, from:number, to:number}>}
   */
  function cuesFor(lines, durationSec) {
    var list = (lines || []).map(function (l) { return String(l == null ? '' : l).trim(); })
                            .filter(Boolean);
    var total = Number(durationSec);
    if (!list.length) return [];
    if (!(total > 0)) {
      // Durasi belum diketahui: satu isyarat yang mencakup segalanya lebih baik
      // daripada tidak ada subtitle sama sekali.
      return [{ text: list.join(' '), from: 0, to: Infinity }];
    }

    var lengths = list.map(function (l) { return l.length; });
    var sum = lengths.reduce(function (a, b) { return a + b; }, 0) || 1;

    var acc = 0;
    return list.map(function (line, i) {
      var from = (acc / sum) * total;
      acc += lengths[i];
      var to = (acc / sum) * total;
      return { text: line, from: from, to: (i === list.length - 1 ? total : to) };
    });
  }

  /** Isyarat yang sedang berlaku pada detik tertentu, atau -1. */
  function cueIndexAt(cues, timeSec) {
    var t = Number(timeSec) || 0;
    for (var i = 0; i < (cues || []).length; i++) {
      if (t >= cues[i].from && t < cues[i].to) return i;
    }
    // Sesudah isyarat terakhir habis, baris terakhir dipertahankan alih-alih
    // dikosongkan: berkedip hilang tepat di akhir kalimat terbaca sebagai kerusakan.
    return (cues && cues.length) ? cues.length - 1 : -1;
  }

  /* ---- lapisan tampilan ------------------------------------------------ */

  function ensureHost(doc) {
    var d = doc || root.document;
    if (!d) return null;
    var host = d.getElementById(HOST_ID);
    if (host) return host;
    host = d.createElement('div');
    host.id = HOST_ID;
    host.className = 'fiezel-subtitle';
    host.setAttribute('role', 'status');
    // Pembacaan ulang tiap baris oleh pembaca layar akan menimpa materi pelajaran
    // yang sedang dibunyikan, jadi barisnya diumumkan dengan sopan, bukan memotong.
    host.setAttribute('aria-live', 'polite');
    host.hidden = true;
    d.body.appendChild(host);
    return host;
  }

  function create(options) {
    var opts = options || {};
    var doc = opts.document || root.document;
    var host = opts.host || ensureHost(doc);
    var cues = [];
    var shownIndex = -1;

    function clear() {
      cues = [];
      shownIndex = -1;
      if (host) { host.textContent = ''; host.hidden = true; }
    }

    function show(text) {
      if (!host) return;
      host.textContent = String(text == null ? '' : text);
      host.hidden = !host.textContent;
    }

    return {
      /**
       * @param {string} indonesianText terjemahan Indonesia dari yang sedang diucapkan
       */
      begin: function (indonesianText) {
        cues = [];
        shownIndex = -1;
        var lines = sentencesOf(indonesianText, 'id');
        if (!lines.length) { clear(); return 0; }
        // Durasi belum diketahui sampai audio termuat; cuesFor menangani itu, dan
        // isyaratnya dihitung ulang begitu durasi yang sebenarnya datang.
        cues = cuesFor(lines, 0);
        show(cues.length ? cues[0].text : '');
        shownIndex = cues.length ? 0 : -1;
        return lines.length;
      },

      /** Disambungkan ke onProgress mesin suara. */
      update: function (currentTimeSec, durationSec) {
        if (!cues.length) return -1;
        if (durationSec > 0 && (cues.length === 1 ? cues[0].to === Infinity : cues[cues.length - 1].to !== durationSec)) {
          cues = cuesFor(cues.map(function (c) { return c.text; }), durationSec);
        }
        var idx = cueIndexAt(cues, currentTimeSec);
        if (idx !== shownIndex && idx >= 0) {
          shownIndex = idx;
          show(cues[idx].text);
        }
        return idx;
      },

      end: clear,
      clear: clear,
      cues: function () { return cues.slice(); }
    };
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    HOST_ID: HOST_ID,
    sentencesOf: sentencesOf,
    cuesFor: cuesFor,
    cueIndexAt: cueIndexAt,
    create: create
  });
}));
