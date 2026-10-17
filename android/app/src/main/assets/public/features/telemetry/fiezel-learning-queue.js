/**
 * FIEZEL Learning Queue — antrean event telemetri di atas storage yang di-inject.
 *
 * KENAPA IndexedDB, BUKAN localStorage (temuan Opus + Sol, mengikat)
 * ------------------------------------------------------------------
 * localStorage sinkron dan berbagi kuota ~5 MB origin yang SUDAH memikul 40+ kunci
 * `fiezel-*-v1` berisi state belajar murid. Antrean yang membesar selama sesi
 * offline panjang bisa menggusur atau menggagalkan tulis state brain itu sendiri —
 * telemetri TIDAK BOLEH bisa merusak pembelajaran. IndexedDB asinkron, kuotanya
 * terpisah jauh lebih besar, dan desain aksesnya sudah dirancang di
 * analysis/idb-migration-design.md (pola atomik per-record, tanpa menahan
 * transaksi lintas-await).
 *
 * KENAPA STORAGE DI-INJECT (idbLike), BUKAN indexedDB LANGSUNG
 * ------------------------------------------------------------
 * Kontrak Braincore: modul murni, tanpa storage. Maka modul ini hanya tahu sebuah
 * antarmuka kecil `idbLike` (getAll/put/delete/clear) yang SEMUANYA mengembalikan
 * Promise. Di browser, adaptor tipis di atas IndexedDB memenuhi antarmuka itu
 * (wiring milik sesi lain); di Node, `createMemoryIdb()` di bawah memenuhi
 * antarmuka yang sama sehingga seluruh perilaku antrean bisa diuji tanpa browser.
 *
 * KENAPA ANTREAN TANPA CACHE MEMORI (selalu baca dari idbLike)
 * ------------------------------------------------------------
 * Supaya "reload" bukan kasus istimewa: instance antrean baru di atas storage yang
 * sama otomatis melihat event lama. Cache memori adalah sumber bug duplikasi
 * klasik (cache bilang terkirim, disk bilang belum). Dengan plafon 2000 event,
 * O(n) per operasi tetap murah — kesederhanaan yang bisa diaudit menang atas
 * optimasi yang belum dibutuhkan.
 *
 * BATAS KERAS + DROP-OLDEST
 * -------------------------
 * Default 2000 event / 2 MB / 45 hari (angka dari rekomendasi Sol). Saat penuh,
 * yang DIBUANG adalah event TERTUA: event terbaru membawa konteks brain terkini
 * dan paling berharga untuk analisis; dan antrean yang bisa tumbuh tanpa batas
 * adalah antrean yang suatu hari menggusur state murid.
 *
 * PERSIST-SEBELUM-UPLOAD, ACK-SEBELUM-HAPUS
 * -----------------------------------------
 * Event ditulis ke storage SEBELUM upaya jaringan apa pun; penghapusan HANYA lewat
 * ack(ids) setelah server mengonfirmasi, atau purge() total saat opt-out. Retry
 * ambigu (timeout setelah server menerima) dengan demikian mengirim ulang eventId
 * yang sama — dedup terjadi di server, bukan lewat tebak-tebakan klien.
 *
 * CATATAN PRIVASI `addedDay`
 * --------------------------
 * Record antrean menyimpan `addedDay` (hari epoch UTC, granularitas HARI) hanya
 * untuk menegakkan retensi 45 hari. Field ini milik antrean lokal dan TIDAK ikut
 * terkirim — transport hanya membaca `record.event`. Event-nya sendiri tetap tanpa
 * timestamp, sesuai kontrak fiezel-learning-events.js.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelLearningQueue = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-learning-queue-v1';

  var LIMITS = Object.freeze({
    MAX_EVENTS: 2000,          // plafon jumlah — di atas ini drop-oldest.
    MAX_BYTES: 2 * 1024 * 1024, // plafon ukuran total (aproksimasi byte UTF-8 JSON).
    MAX_AGE_DAYS: 45           // retensi lokal; lebih tua dari ini dianggap basi.
  });

  var DAY_MS = 86400000;

  /**
   * Panjang byte UTF-8 tanpa Buffer/TextEncoder — modul harus jalan identik di
   * Node dan browser tua, dan aproksimasi per-codepoint sudah tepat untuk JSON.
   */
  function utf8Len(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; } // surrogate pair
      else n += 3;
    }
    return n;
  }

  function isPlainObject(x) {
    return !!x && typeof x === 'object' && !Array.isArray(x);
  }

  function fail(reason) {
    return { ok: false, reason: reason, rationale: 'brain3_lt_queue_' + reason, confidence: 1 };
  }

  /**
   * createMemoryIdb() — implementasi idbLike in-memory untuk test Node.
   *
   * Kenapa disertakan di modul produksi: antarmuka idbLike adalah KONTRAK, dan
   * fake ini adalah definisi eksekusi dari kontrak itu — adaptor IndexedDB asli
   * wajib lulus test yang sama dengan fake ini. Instance yang sama dipakai lintas
   * pembuatan queue untuk mensimulasikan reload (storage bertahan, queue tidak).
   */
  function createMemoryIdb() {
    var store = new Map(); // eventId -> record
    return {
      kind: 'memory',
      getAll: function () {
        var out = [];
        store.forEach(function (rec) { out.push(rec); });
        return Promise.resolve(out);
      },
      put: function (record) {
        store.set(record.eventId, record);
        return Promise.resolve();
      },
      'delete': function (eventId) {
        var had = store.has(eventId);
        store['delete'](eventId);
        return Promise.resolve(had);
      },
      clear: function () {
        store.clear();
        return Promise.resolve();
      }
    };
  }

  /**
   * makeQueue({idb, limits}) -> {put, peekBatch, ack, purge, stats}
   * Semua method async dan TIDAK PERNAH melempar: telemetri gagal harus senyap,
   * karena jalur belajar murid tidak boleh terganggu oleh urusan pelaporan.
   */
  function makeQueue(opts) {
    if (!isPlainObject(opts) || !isPlainObject(opts.idb)) {
      throw new Error('makeQueue: opts.idb (idbLike) wajib di-inject');
    }
    var idb = opts.idb;
    var lim = {
      MAX_EVENTS: (opts.limits && opts.limits.MAX_EVENTS > 0) ? opts.limits.MAX_EVENTS : LIMITS.MAX_EVENTS,
      MAX_BYTES: (opts.limits && opts.limits.MAX_BYTES > 0) ? opts.limits.MAX_BYTES : LIMITS.MAX_BYTES,
      MAX_AGE_DAYS: (opts.limits && opts.limits.MAX_AGE_DAYS > 0) ? opts.limits.MAX_AGE_DAYS : LIMITS.MAX_AGE_DAYS
    };

    function sortBySeq(records) {
      // seq monoton menentukan "tertua"; addedDay saja terlalu kasar (banyak event
      // sehari) dan urutan getAll() tidak dijamin implementasi idbLike.
      records.sort(function (a, b) { return a.seq - b.seq; });
      return records;
    }

    /**
     * Buang record kedaluwarsa (> MAX_AGE_DAYS). Dipanggil dari put/peekBatch —
     * antrean tanpa jam internal hanya bisa menegakkan retensi saat diberi nowMs.
     */
    function dropExpired(records, nowMs) {
      var today = Math.floor(nowMs / DAY_MS);
      var keep = [];
      var deletions = [];
      for (var i = 0; i < records.length; i++) {
        if (today - records[i].addedDay > lim.MAX_AGE_DAYS) {
          deletions.push(idb['delete'](records[i].eventId));
        } else {
          keep.push(records[i]);
        }
      }
      return Promise.all(deletions).then(function () { return keep; });
    }

    /**
     * put(event, nowMs): PERSIST DULU, baru tegakkan batas. Urutan ini disengaja:
     * kalau proses mati di antara keduanya, akibat terburuk adalah antrean sedikit
     * melebihi plafon sampai operasi berikutnya — bukan event yang hilang padahal
     * pemanggil mengira sudah tersimpan.
     */
    function put(event, nowMs) {
      if (!isPlainObject(event) || typeof event.eventId !== 'string' || !event.eventId) {
        return Promise.resolve(fail('bad_event'));
      }
      if (typeof nowMs !== 'number' || !isFinite(nowMs)) {
        return Promise.resolve(fail('bad_now'));
      }
      var bytes;
      try {
        bytes = utf8Len(JSON.stringify(event));
      } catch (e) {
        return Promise.resolve(fail('unserializable'));
      }
      // Event tunggal yang lebih besar dari plafon total tidak akan pernah bisa
      // terkirim ataupun tersimpan wajar — tolak di pintu.
      if (bytes > lim.MAX_BYTES) return Promise.resolve(fail('event_too_large'));

      return idb.getAll()
        .then(function (records) {
          sortBySeq(records);
          var nextSeq = records.length ? records[records.length - 1].seq + 1 : 1;
          var rec = {
            eventId: event.eventId,
            seq: nextSeq,
            addedDay: Math.floor(nowMs / DAY_MS),
            bytes: bytes,
            event: event
          };
          return idb.put(rec).then(function () { return dropExpired(records.concat([rec]), nowMs); });
        })
        .then(function (records) {
          // Tegakkan plafon jumlah + byte dengan drop-oldest.
          sortBySeq(records);
          var total = 0;
          var i;
          for (i = 0; i < records.length; i++) total += records[i].bytes;
          var droppedIds = [];
          var deletions = [];
          i = 0;
          while ((records.length - droppedIds.length > lim.MAX_EVENTS || total > lim.MAX_BYTES) && i < records.length) {
            droppedIds.push(records[i].eventId);
            deletions.push(idb['delete'](records[i].eventId));
            total -= records[i].bytes;
            i++;
          }
          return Promise.all(deletions).then(function () {
            return {
              ok: true,
              stored: true,
              droppedIds: droppedIds,
              rationale: droppedIds.length ? 'brain3_lt_queue_stored_drop_oldest' : 'brain3_lt_queue_stored',
              confidence: 1
            };
          });
        })
        .catch(function () {
          // Storage rusak/penuh: senyap. Kehilangan telemetri < mengganggu belajar.
          return fail('storage_failed');
        });
    }

    /**
     * peekBatch(maxCount, nowMs): baca TANPA menghapus — penghapusan hanya lewat
     * ack. Inilah inti jaminan "retry ambigu tidak menggandakan": event yang belum
     * di-ack akan terbaca lagi dengan eventId yang sama persis.
     */
    function peekBatch(maxCount, nowMs) {
      var n = (typeof maxCount === 'number' && maxCount > 0) ? Math.floor(maxCount) : 20;
      var now = (typeof nowMs === 'number' && isFinite(nowMs)) ? nowMs : 0;
      return idb.getAll()
        .then(function (records) { return now > 0 ? dropExpired(records, now) : records; })
        .then(function (records) {
          sortBySeq(records);
          var out = [];
          for (var i = 0; i < records.length && out.length < n; i++) {
            out.push({ eventId: records[i].eventId, event: records[i].event });
          }
          return out;
        })
        .catch(function () { return []; });
    }

    /** ack(ids): hapus HANYA yang dikonfirmasi server. */
    function ack(eventIds) {
      var ids = Array.isArray(eventIds) ? eventIds : [];
      var deletions = [];
      for (var i = 0; i < ids.length; i++) {
        if (typeof ids[i] === 'string' && ids[i]) deletions.push(idb['delete'](ids[i]));
      }
      return Promise.all(deletions)
        .then(function (flags) {
          var removed = 0;
          for (var j = 0; j < flags.length; j++) if (flags[j]) removed++;
          return { ok: true, removed: removed, rationale: 'brain3_lt_queue_acked', confidence: 1 };
        })
        .catch(function () { return fail('storage_failed'); });
    }

    /**
     * purge(): kosongkan SEMUA — jalur opt-out. Harus total dan tanpa syarat:
     * saat murid/wali menarik persetujuan, tidak boleh ada event tersisa yang
     * "menunggu upload".
     */
    function purge() {
      return idb.clear()
        .then(function () { return { ok: true, rationale: 'brain3_lt_queue_purged', confidence: 1 }; })
        .catch(function () { return fail('storage_failed'); });
    }

    /** stats(nowMs?): jumlah + byte, untuk diagnostik lokal. */
    function stats(nowMs) {
      return idb.getAll()
        .then(function (records) {
          return (typeof nowMs === 'number' && isFinite(nowMs)) ? dropExpired(records, nowMs) : records;
        })
        .then(function (records) {
          var bytes = 0;
          for (var i = 0; i < records.length; i++) bytes += records[i].bytes;
          return { count: records.length, bytes: bytes };
        })
        .catch(function () { return { count: 0, bytes: 0 }; });
    }

    return { put: put, peekBatch: peekBatch, ack: ack, purge: purge, stats: stats, limits: Object.freeze(lim) };
  }

  return {
    SCHEMA: SCHEMA,
    LIMITS: LIMITS,
    makeQueue: makeQueue,
    createMemoryIdb: createMemoryIdb
  };
});
