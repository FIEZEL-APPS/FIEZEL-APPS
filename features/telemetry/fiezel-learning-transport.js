/**
 * FIEZEL Learning Transport — pembentuk batch + pengirim dengan backoff seeded.
 *
 * KENAPA BATAS BATCH 20 EVENT / 8 KB
 * -----------------------------------
 * Angka ini BUKAN pilihan modul ini: ia menyalin LIMITS di
 * workers/api/analytics/route-events.js (MAX_EVENTS=20, MAX_BODY_BYTES=8*1024).
 * Server menolak keras batch yang lebih besar (413/'too_large'), jadi satu-satunya
 * desain yang tidak menyia-nyiakan kuota retry adalah klien yang tidak pernah
 * membentuk batch ilegal sejak awal. Endpoint learning (Lane B) dirancang memakai
 * batas yang sama supaya middleware pembatas byte bisa dipakai ulang.
 *
 * KENAPA KEGAGALAN TIDAK PERNAH DILEMPAR KE PEMANGGIL
 * ----------------------------------------------------
 * Transport dipanggil dari jalur commit jawaban murid. Sekali saja throw bocor ke
 * sana, telemetri — fitur pelengkap — merusak fitur inti. Maka flush() menangkap
 * SEMUA kegagalan (jaringan mati, fetch tidak ada, server 5xx, JSON aneh) dan
 * mengubahnya menjadi nilai kembali deskriptif; event yang belum di-ack tetap di
 * antrean dan otomatis terkirim ulang nanti (fail silent, antre ulang).
 *
 * KENAPA BACKOFF EKSPONENSIAL + JITTER SEEDED (mulberry32)
 * ---------------------------------------------------------
 * Eksponensial: server yang sakit butuh waktu pulih, dan retry rapat memperparah.
 * Jitter: ratusan klien yang gagal bersamaan (deploy, listrik padam) tidak boleh
 * kembali serempak di detik yang sama (thundering herd). SEEDED, bukan
 * Math.random(): kontrak Braincore melarang keacakan tak-berseed karena perilaku
 * yang tidak bisa direproduksi adalah perilaku yang tidak bisa diuji — dengan seed
 * yang sama, jadwal retry di test selalu identik.
 *
 * KENAPA Retry-After MENANG ATAS BACKOFF
 * ---------------------------------------
 * Retry-After adalah server memberi tahu kapan ia siap — informasi, bukan tebakan.
 * Backoff hanyalah tebakan terdidik saat server diam. Informasi selalu mengalahkan
 * tebakan.
 *
 * Modul MURNI: fetch di-inject, waktu argumen, tanpa DOM/storage/jam internal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelLearningTransport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-learning-transport-v1';
  var BATCH_SCHEMA = 'fiezel-learning-event-v1';

  // Selaras persis dengan LIMITS route-events.js — lihat komentar kepala berkas.
  var LIMITS = Object.freeze({
    MAX_EVENTS_PER_BATCH: 20,
    MAX_BODY_BYTES: 8 * 1024
  });

  var BACKOFF = Object.freeze({
    BASE_MS: 1000,             // langkah pertama 1 detik — cukup untuk blip jaringan.
    FACTOR: 2,                 // eksponensial klasik.
    MAX_MS: 15 * 60 * 1000,    // plafon 15 menit — lebih lama tidak menambah manfaat.
    MAX_ATTEMPT: 10            // di atas ini delay sudah pasti kena plafon.
  });

  /** Panjang byte UTF-8 (identik dengan fiezel-learning-queue.js — lihat alasannya di sana). */
  function utf8Len(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  /**
   * PRNG mulberry32 — pola yang sama dengan fiezel-tutor-brain.js: deterministik
   * untuk seed yang sama, sehingga jadwal retry bisa diuji bit-per-bit.
   */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * backoffDelayMs(attempt, {seed}) -> ms.
   * delay = min(BASE * FACTOR^attempt, MAX) * (0.5 + 0.5*jitter): jitter separuh
   * penuh (equal jitter) — cukup menyebar kawanan retry tanpa pernah membuat
   * delay lebih PENDEK dari separuh jadwal eksponensialnya.
   */
  function backoffDelayMs(attempt, opts) {
    var a = (typeof attempt === 'number' && isFinite(attempt) && attempt >= 0) ? Math.min(Math.floor(attempt), BACKOFF.MAX_ATTEMPT) : 0;
    var seed = (opts && typeof opts.seed === 'number') ? opts.seed : 1;
    var base = (opts && opts.baseMs > 0) ? opts.baseMs : BACKOFF.BASE_MS;
    var maxMs = (opts && opts.maxMs > 0) ? opts.maxMs : BACKOFF.MAX_MS;
    var raw = Math.min(base * Math.pow(BACKOFF.FACTOR, a), maxMs);
    // Seed digabung dengan attempt supaya tiap langkah retry punya jitter sendiri
    // namun tetap deterministik untuk pasangan (seed, attempt) yang sama.
    var jitter = mulberry32((seed >>> 0) ^ (a + 1) * 0x9E3779B9)();
    return Math.round(raw * (0.5 + 0.5 * jitter));
  }

  /**
   * retryAfterMs(response) -> ms | null. Membaca header Retry-After (format detik;
   * format HTTP-date sengaja tidak didukung — butuh jam dinding, dan modul murni
   * tidak punya jam). Menerima response-like fetch asli maupun objek polos test.
   */
  function retryAfterMs(response) {
    if (!response) return null;
    var v = null;
    if (response.headers && typeof response.headers.get === 'function') {
      v = response.headers.get('retry-after');
    } else if (response.retryAfter !== undefined) {
      v = response.retryAfter;
    }
    if (v === null || v === undefined || v === '') return null;
    var sec = Number(v);
    if (!isFinite(sec) || sec < 0) return null;
    // Plafon sama dengan backoff: server yang minta ditunggu berjam-jam tetap
    // kita hormati maksimal 15 menit — antrean lokal punya retensi terbatas.
    return Math.min(Math.round(sec * 1000), BACKOFF.MAX_MS);
  }

  /**
   * makeBatches(entries) -> {batches:[{eventIds, body, bytes}], oversizedIds:[...]}.
   *
   * entries = keluaran queue.peekBatch: [{eventId, event}]. Urutan dipertahankan
   * (tertua dulu) supaya server melihat kronologi studyDay yang wajar. Event
   * tunggal yang sendirian pun melampaui 8 KB tidak akan PERNAH bisa terkirim —
   * dilaporkan di oversizedIds agar pemanggil bisa meng-ack-nya sebagai buangan
   * (membiarkannya di antrean hanya menyumbat kepala antrean selamanya).
   */
  function makeBatches(entries) {
    var list = Array.isArray(entries) ? entries : [];
    var batches = [];
    var oversizedIds = [];
    // Amplop tetap: {"schema":"...","events":[]} — dihitung sekali supaya batas
    // byte dihitung terhadap BODY UTUH yang server ukur, bukan events saja.
    var envelope = utf8Len(JSON.stringify({ schema: BATCH_SCHEMA, events: [] }));
    var cur = [];
    var curIds = [];
    var curBytes = envelope;

    function closeCurrent() {
      if (cur.length === 0) return;
      var body = JSON.stringify({ schema: BATCH_SCHEMA, events: cur });
      batches.push({ eventIds: curIds, body: body, bytes: utf8Len(body) });
      cur = [];
      curIds = [];
      curBytes = envelope;
    }

    for (var i = 0; i < list.length; i++) {
      var entry = list[i];
      if (!entry || typeof entry.eventId !== 'string' || !entry.event) continue;
      var evJson;
      try {
        evJson = JSON.stringify(entry.event);
      } catch (e) {
        oversizedIds.push(entry.eventId); // tak terserialisasi = tak terkirim selamanya.
        continue;
      }
      var evBytes = utf8Len(evJson) + 1; // +1 koma pemisah di array JSON.
      if (envelope + evBytes > LIMITS.MAX_BODY_BYTES) {
        oversizedIds.push(entry.eventId);
        continue;
      }
      if (cur.length >= LIMITS.MAX_EVENTS_PER_BATCH || curBytes + evBytes > LIMITS.MAX_BODY_BYTES) {
        closeCurrent();
      }
      cur.push(entry.event);
      curIds.push(entry.eventId);
      curBytes += evBytes;
    }
    closeCurrent();
    return { batches: batches, oversizedIds: oversizedIds };
  }

  /**
   * flush(queue, opts) -> Promise<result>. TIDAK PERNAH reject.
   *
   * opts = {
   *   fetchFn  : function(url, init) -> Promise<responseLike>  (WAJIB, di-inject)
   *   url      : endpoint POST (default '/api/learning/events')
   *   nowMs    : jam dinding pemanggil (untuk retensi antrean)
   *   seed     : seed jitter backoff (WAJIB deterministik di test)
   *   attempt  : hitungan kegagalan beruntun sebelumnya (untuk eksponensial)
   *   maxBatches: plafon batch per flush (default 3 — flush kecil dan sering
   *               lebih ramah baterai/radio daripada satu flush raksasa)
   * }
   *
   * Alur per batch: kirim -> 2xx? ack HANYA id batch itu -> lanjut. Non-2xx atau
   * error jaringan -> BERHENTI (server sedang tidak mau; memukul terus sia-sia),
   * kembalikan nextRetryInMs dari Retry-After atau backoff. Event tanpa ack tetap
   * di antrean — itulah "antre ulang" tanpa perlu menulis ulang apa pun.
   */
  function flush(queue, opts) {
    var o = opts || {};
    var result = {
      ok: false,
      sentBatches: 0,
      ackedCount: 0,
      oversizedDropped: 0,
      nextRetryInMs: null,
      rationale: 'brain3_lt_transport_idle',
      confidence: 1
    };
    if (!queue || typeof queue.peekBatch !== 'function' || typeof queue.ack !== 'function') {
      result.rationale = 'brain3_lt_transport_no_queue';
      return Promise.resolve(result);
    }
    if (typeof o.fetchFn !== 'function') {
      // Offline permanen / lingkungan tanpa fetch: bukan error — event menunggu.
      result.rationale = 'brain3_lt_transport_no_fetch';
      return Promise.resolve(result);
    }
    var url = typeof o.url === 'string' && o.url ? o.url : '/api/learning/events';
    var nowMs = typeof o.nowMs === 'number' ? o.nowMs : 0;
    var seed = typeof o.seed === 'number' ? o.seed : 1;
    var attempt = typeof o.attempt === 'number' ? o.attempt : 0;
    var maxBatches = (typeof o.maxBatches === 'number' && o.maxBatches > 0) ? Math.floor(o.maxBatches) : 3;

    return queue.peekBatch(LIMITS.MAX_EVENTS_PER_BATCH * maxBatches, nowMs)
      .then(function (entries) {
        if (!entries || entries.length === 0) {
          result.ok = true;
          result.rationale = 'brain3_lt_transport_empty';
          return result;
        }
        var made = makeBatches(entries);

        // Event yang mustahil terkirim di-ack sebagai buangan sadar — lihat
        // alasan di makeBatches. Ini keputusan drop, bukan kehilangan senyap:
        // tercatat di oversizedDropped.
        var preAck = made.oversizedIds.length
          ? queue.ack(made.oversizedIds).then(function () { result.oversizedDropped = made.oversizedIds.length; })
          : Promise.resolve();

        return preAck.then(function () {
          var i = 0;
          function step() {
            if (i >= made.batches.length || i >= maxBatches) {
              result.ok = true;
              result.rationale = result.sentBatches > 0 ? 'brain3_lt_transport_flushed' : 'brain3_lt_transport_empty';
              return result;
            }
            var batch = made.batches[i];
            i++;
            return Promise.resolve()
              .then(function () {
                return o.fetchFn(url, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: batch.body
                });
              })
              .then(function (res) {
                if (res && res.status >= 200 && res.status < 300) {
                  // HANYA setelah 2xx eksplisit id batch ini dihapus. Timeout /
                  // respons ambigu jatuh ke cabang catch -> tanpa ack -> event
                  // dikirim ulang dengan eventId sama (dedup di server).
                  return queue.ack(batch.eventIds).then(function (ackRes) {
                    result.sentBatches++;
                    result.ackedCount += (ackRes && ackRes.removed) || batch.eventIds.length;
                    return step();
                  });
                }
                // Server menolak/sakit: berhenti, hormati Retry-After bila ada.
                var ra = retryAfterMs(res);
                result.nextRetryInMs = ra !== null ? ra : backoffDelayMs(attempt, { seed: seed });
                result.rationale = ra !== null ? 'brain3_lt_transport_retry_after' : 'brain3_lt_transport_backoff';
                result.ok = false;
                return result;
              })
              .catch(function () {
                // Jaringan mati / fetch melempar: senyap, antre ulang, coba nanti.
                result.nextRetryInMs = backoffDelayMs(attempt, { seed: seed });
                result.rationale = 'brain3_lt_transport_offline_requeue';
                result.ok = false;
                return result;
              });
          }
          return step();
        });
      })
      .catch(function () {
        // Bahkan antrean yang rusak tidak boleh melempar keluar dari flush.
        result.rationale = 'brain3_lt_transport_queue_failed';
        return result;
      });
  }

  return {
    SCHEMA: SCHEMA,
    BATCH_SCHEMA: BATCH_SCHEMA,
    LIMITS: LIMITS,
    BACKOFF: BACKOFF,
    mulberry32: mulberry32,
    backoffDelayMs: backoffDelayMs,
    retryAfterMs: retryAfterMs,
    makeBatches: makeBatches,
    flush: flush
  };
});
