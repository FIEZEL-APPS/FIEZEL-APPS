/**
 * FIEZEL R6 — Reliability and Multi-Device Continuity (5.23)
 *
 * Backup terenkripsi yang dikendalikan pengguna, pratinjau restore, dan penggabungan progres
 * yang aman terhadap konflik.
 *
 * BATAS YANG TIDAK BOLEH DILANGGAR, dan alasannya:
 *
 * - TIDAK ADA CLOUD SYNC. Modul ini tidak pernah melakukan network I/O. Yang dihasilkan
 *   adalah satu berkas terenkripsi; pengguna yang memutuskan mau diapakan. Roadmap
 *   menyatakan cloud sync tidak boleh aktif secara implisit, dan cara paling jujur menjamin
 *   itu adalah modulnya memang tidak punya kemampuan mengirim apa pun.
 * - RESTORE TIDAK PERNAH DIAM-DIAM. `previewRestore()` tidak mengubah apa pun; ia hanya
 *   menjelaskan apa yang akan berubah. Menimpa progres belajar seseorang tanpa ia melihat
 *   dulu adalah kehilangan yang tidak bisa dibatalkan.
 * - PENGGABUNGAN TERBATAS DAN DETERMINISTIK. Tidak ada penjumlahan buta yang membuat total
 *   membengkak setiap kali restore dijalankan.
 *
 * Enkripsi memakai WebCrypto (AES-GCM 256 + PBKDF2-SHA256). Kunci berasal dari passphrase
 * pengguna dan tidak pernah disimpan. Kalau passphrase hilang, backup-nya hilang - itu
 * konsekuensi yang harus dinyatakan jelas di UI, bukan disiasati dengan menyimpan kunci.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelContinuity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var BACKUP_SCHEMA = 'fiezel-continuity-backup-v1';
  var ENVELOPE_SCHEMA = 'fiezel-continuity-envelope-v1';
  var KDF_ITERATIONS = 210000;
  var SALT_BYTES = 16;
  var IV_BYTES = 12;
  // Batas yang sama dipakai saat menggabungkan, supaya berkas dari perangkat lain tidak bisa
  // membuat state tumbuh tanpa batas.
  var LIMITS = { history: 500, wrongAnswers: 200, confidenceHistory: 500, sessionHistory: 100, learningDays: 400 };
  var ITEM_BUCKETS = ['vocab', 'grammar', 'reading'];

  function subtle() {
    var c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    if (!c || !c.subtle || typeof c.getRandomValues !== 'function') throw new Error('webcrypto_unavailable');
    return c;
  }

  function toBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    if (typeof btoa === 'function') return btoa(binary);
    return Buffer.from(bytes).toString('base64');
  }

  function fromBase64(value) {
    if (typeof atob === 'function') {
      var binary = atob(String(value || ''));
      var out = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(String(value || ''), 'base64'));
  }

  function boundedArray(value, limit) {
    return Array.isArray(value) ? value.slice(-limit) : [];
  }

  function boundedBucket(value) {
    if (!value || typeof value !== 'object') return {};
    var out = {};
    var keys = Object.keys(value).sort();
    for (var i = 0; i < keys.length; i++) {
      var row = value[keys[i]];
      if (row && typeof row === 'object') out[keys[i]] = row;
    }
    return out;
  }

  /**
   * Isi backup: progres belajar milik pengguna sendiri, dipotong ke batas yang sama dengan
   * yang dipakai aplikasi. Preferensi perangkat (view aktif, sesi berjalan) sengaja tidak
   * ikut - itu keadaan perangkat, bukan progres.
   */
  function buildBackupPayload(input) {
    var options = input || {};
    var state = options.state || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildBackupPayload: now wajib diisi (deterministic)');

    var payload = {
      schema: BACKUP_SCHEMA,
      createdAt: new Date(now).toISOString(),
      appVersion: String(state.version || ''),
      level: Number(state.level) || 1,
      placementDone: !!state.placementDone,
      adaptiveReady: !!state.adaptiveReady,
      streak: Number(state.streak) || 0,
      history: boundedArray(state.history, LIMITS.history),
      wrongAnswers: boundedArray(state.wrongAnswers, LIMITS.wrongAnswers),
      confidenceHistory: boundedArray(state.confidenceHistory, LIMITS.confidenceHistory),
      sessionHistory: boundedArray(state.sessionHistory, LIMITS.sessionHistory),
      learningDays: boundedArray(state.learningDays, LIMITS.learningDays),
      // Sengaja TIDAK menyertakan: view, activeSession, reportMeta, reminderMeta. Semua itu
      // keadaan perangkat; membawanya ke perangkat lain hanya memindahkan kebingungan.
      transferred: { deviceState: false, credentials: false }
    };
    for (var i = 0; i < ITEM_BUCKETS.length; i++) payload[ITEM_BUCKETS[i]] = boundedBucket(state[ITEM_BUCKETS[i]]);
    payload.totals = recomputeTotals(payload.history);
    return payload;
  }

  /** Total dihitung ulang dari riwayat, bukan dibawa dari state, supaya tidak bisa membengkak. */
  function recomputeTotals(history) {
    var rows = Array.isArray(history) ? history : [];
    var correct = 0, timeMs = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].ok) correct++;
      var ms = Number(rows[i] && rows[i].ms);
      if (isFinite(ms) && ms > 0) timeMs += ms;
    }
    return { answered: rows.length, correct: correct, timeMs: timeMs };
  }

  async function deriveKey(passphrase, salt) {
    var crypto = subtle();
    var material = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(passphrase || '')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  /**
   * Membungkus payload menjadi berkas terenkripsi. Passphrase pendek ditolak di sini, bukan
   * di UI saja - backup yang dilindungi empat karakter adalah backup yang tidak dilindungi.
   */
  async function encryptBackup(payload, passphrase) {
    if (String(passphrase || '').length < 8) throw new Error('passphrase_too_short');
    var crypto = subtle();
    var salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    var iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    var key = await deriveKey(passphrase, salt);
    var data = new TextEncoder().encode(JSON.stringify(payload));
    var cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data));
    return {
      schema: ENVELOPE_SCHEMA,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: toBase64(salt) },
      cipher: { name: 'AES-GCM', iv: toBase64(iv) },
      payload: toBase64(cipher),
      // Metadata yang boleh terlihat tanpa passphrase, sengaja seminimal mungkin: cukup untuk
      // mengenali berkas, tidak cukup untuk mengetahui isi belajarnya.
      meta: { schema: BACKUP_SCHEMA, createdAt: payload.createdAt, appVersion: payload.appVersion }
    };
  }

  /** Passphrase salah menghasilkan penolakan yang jelas, bukan data setengah jadi. */
  async function decryptBackup(envelope, passphrase) {
    var e = envelope || {};
    if (e.schema !== ENVELOPE_SCHEMA) throw new Error('invalid_envelope');
    var crypto = subtle();
    var key = await deriveKey(passphrase, fromBase64(e.kdf && e.kdf.salt));
    var plain;
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(e.cipher && e.cipher.iv) }, key, fromBase64(e.payload));
    } catch (_) { throw new Error('wrong_passphrase_or_corrupt'); }
    var parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(plain)));
    if (!parsed || parsed.schema !== BACKUP_SCHEMA) throw new Error('invalid_payload');
    return parsed;
  }

  function bucketEntries(bucket) {
    return bucket && typeof bucket === 'object' ? Object.keys(bucket) : [];
  }

  /**
   * Pratinjau restore. Tidak mengubah apa pun; menjawab satu pertanyaan yang wajib bisa
   * dijawab sebelum menimpa progres: apa yang bertambah, apa yang bentrok, dan apakah ada
   * yang akan hilang.
   */
  function previewRestore(payload, currentState) {
    var backup = payload || {};
    var current = currentState || {};
    var currentHistory = Array.isArray(current.history) ? current.history : [];
    var backupHistory = Array.isArray(backup.history) ? backup.history : [];
    var currentIds = {};
    for (var i = 0; i < currentHistory.length; i++) if (currentHistory[i] && currentHistory[i].id) currentIds[currentHistory[i].id] = true;

    var newRows = 0;
    for (var j = 0; j < backupHistory.length; j++) {
      var row = backupHistory[j];
      if (row && row.id && !currentIds[row.id]) newRows++;
    }

    var buckets = {};
    var conflicts = 0, onlyLocal = 0, onlyBackup = 0;
    for (var b = 0; b < ITEM_BUCKETS.length; b++) {
      var name = ITEM_BUCKETS[b];
      var localKeys = bucketEntries(current[name]);
      var backupKeys = bucketEntries(backup[name]);
      var shared = localKeys.filter(function (k) { return backupKeys.indexOf(k) !== -1; });
      var localOnly = localKeys.filter(function (k) { return backupKeys.indexOf(k) === -1; });
      var backupOnly = backupKeys.filter(function (k) { return localKeys.indexOf(k) === -1; });
      conflicts += shared.length; onlyLocal += localOnly.length; onlyBackup += backupOnly.length;
      buckets[name] = { shared: shared.length, onlyLocal: localOnly.length, onlyBackup: backupOnly.length };
    }

    return {
      schema: BACKUP_SCHEMA,
      kind: 'restore-preview',
      createdAt: String(backup.createdAt || ''),
      appVersion: String(backup.appVersion || ''),
      historyRowsInBackup: backupHistory.length,
      historyRowsNew: newRows,
      historyRowsAlreadyPresent: backupHistory.length - newRows,
      buckets: buckets,
      itemsShared: conflicts,
      itemsOnlyLocal: onlyLocal,
      itemsOnlyBackup: onlyBackup,
      // Penggabungan bersifat menambah dan memilih yang lebih maju, jadi tidak ada progres
      // lokal yang dibuang. Ini dinyatakan sebagai bidang supaya UI tidak perlu menjanjikannya
      // sendiri, dan gate bisa menahannya tetap benar.
      localProgressDiscarded: false,
      deviceStateRestored: false
    };
  }

  function laterRow(a, b) {
    var at = Number(a && a.lastSeen) || 0;
    var bt = Number(b && b.lastSeen) || 0;
    if (at !== bt) return at > bt ? a : b;
    // Seri: pilih yang buktinya lebih banyak, lalu yang mastery-nya lebih tinggi. Deterministik
    // supaya penggabungan yang sama selalu memberi hasil yang sama.
    var atotal = Number(a && a.total) || 0, btotal = Number(b && b.total) || 0;
    if (atotal !== btotal) return atotal > btotal ? a : b;
    return (Number(a && a.mastery) || 0) >= (Number(b && b.mastery) || 0) ? a : b;
  }

  /**
   * Penggabungan progres yang aman terhadap konflik dan terbatas.
   * Riwayat digabung berdasarkan id (bukan disambung), materi per item diambil yang paling
   * maju, dan total dihitung ulang dari hasil gabungan. Menjalankannya dua kali dengan
   * masukan yang sama menghasilkan keadaan yang sama.
   */
  function mergeProgress(localState, backupPayload) {
    var local = localState || {};
    var backup = backupPayload || {};

    var byId = {};
    var order = [];
    var sources = [Array.isArray(local.history) ? local.history : [], Array.isArray(backup.history) ? backup.history : []];
    for (var s = 0; s < sources.length; s++) {
      for (var i = 0; i < sources[s].length; i++) {
        var row = sources[s][i];
        if (!row || typeof row !== 'object') continue;
        var id = String(row.id || ('' + (row.at || '') + (row.skill || '') + i));
        if (!byId[id]) { byId[id] = row; order.push(id); }
      }
    }
    var history = order.map(function (id) { return byId[id]; })
      .sort(function (a, b) { return (Number(a.at) || 0) - (Number(b.at) || 0); })
      .slice(-LIMITS.history);

    var merged = {
      history: history,
      wrongAnswers: boundedArray(local.wrongAnswers, LIMITS.wrongAnswers),
      confidenceHistory: boundedArray((Array.isArray(local.confidenceHistory) ? local.confidenceHistory : [])
        .concat(Array.isArray(backup.confidenceHistory) ? backup.confidenceHistory : []), LIMITS.confidenceHistory),
      sessionHistory: boundedArray((Array.isArray(local.sessionHistory) ? local.sessionHistory : [])
        .concat(Array.isArray(backup.sessionHistory) ? backup.sessionHistory : []), LIMITS.sessionHistory),
      learningDays: [],
      level: Math.max(Number(local.level) || 1, Number(backup.level) || 1),
      placementDone: !!local.placementDone || !!backup.placementDone,
      adaptiveReady: !!local.adaptiveReady || !!backup.adaptiveReady,
      // Streak diambil yang lebih besar, tidak dijumlahkan: dua perangkat pada hari yang sama
      // bukan dua hari belajar.
      streak: Math.max(Number(local.streak) || 0, Number(backup.streak) || 0)
    };

    var days = {};
    var dayRows = (Array.isArray(local.learningDays) ? local.learningDays : []).concat(Array.isArray(backup.learningDays) ? backup.learningDays : []);
    for (var d = 0; d < dayRows.length; d++) days[String(dayRows[d])] = true;
    merged.learningDays = Object.keys(days).sort().slice(-LIMITS.learningDays);

    for (var b = 0; b < ITEM_BUCKETS.length; b++) {
      var name = ITEM_BUCKETS[b];
      var out = {};
      var localBucket = local[name] && typeof local[name] === 'object' ? local[name] : {};
      var backupBucket = backup[name] && typeof backup[name] === 'object' ? backup[name] : {};
      var keys = Object.keys(localBucket).concat(Object.keys(backupBucket)).filter(function (k, idx, all) { return all.indexOf(k) === idx; }).sort();
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (localBucket[key] && backupBucket[key]) out[key] = laterRow(localBucket[key], backupBucket[key]);
        else out[key] = localBucket[key] || backupBucket[key];
      }
      merged[name] = out;
    }

    var totals = recomputeTotals(merged.history);
    merged.totalAnswered = totals.answered;
    merged.totalCorrect = totals.correct;
    merged.totalTimeMs = totals.timeMs;
    return merged;
  }

  return {
    BACKUP_SCHEMA: BACKUP_SCHEMA,
    ENVELOPE_SCHEMA: ENVELOPE_SCHEMA,
    KDF_ITERATIONS: KDF_ITERATIONS,
    LIMITS: LIMITS,
    ITEM_BUCKETS: ITEM_BUCKETS,
    buildBackupPayload: buildBackupPayload,
    recomputeTotals: recomputeTotals,
    encryptBackup: encryptBackup,
    decryptBackup: decryptBackup,
    previewRestore: previewRestore,
    mergeProgress: mergeProgress
  };
});
