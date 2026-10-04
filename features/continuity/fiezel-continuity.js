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
  var LIMITS = { history: 500, wrongAnswers: 200, confidenceHistory: 500, sessionHistory: 100, learningDays: 400, policyHistory: 30, policyOutcomes: 60 };
  // m025-141 (B-07): HANYA tiga preferensi ini yang ikut berpindah perangkat. Ketiganya
  // menjawab "murid ini sedang belajar di level apa" - kehilangan itu saat restore berarti
  // murid kembali ke hasil placement atau ke bawaan, dan pilihannya sendiri terhapus diam-diam.
  // Sisanya (haptics, suara, endpoint laporan, zona waktu) milik perangkat dan tetap tinggal.
  var LEARNING_PREFERENCES = ['activeLevel', 'levelMode', 'selfAssessedLevel'];
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

  function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
  function pickLearningPreferences(value) {
    var src = plainObject(value) || {}, out = {};
    for (var i = 0; i < LEARNING_PREFERENCES.length; i++) {
      var key = LEARNING_PREFERENCES[i];
      if (typeof src[key] === 'string' && src[key]) out[key] = src[key];
    }
    return out;
  }
  function boundedPolicyMeta(value) {
    var src = plainObject(value); if (!src) return null;
    return { lastPolicy: src.lastPolicy || null, lastSource: String(src.lastSource || ''), lastAt: Number(src.lastAt) || 0,
      history: boundedArray(src.history, LIMITS.policyHistory) };
  }
  function boundedOutcomeMeta(value) {
    var src = plainObject(value); if (!src) return null;
    // Antrean kiriman TIDAK ikut: ia milik perangkat asal dan akan dikirim ulang dari sana.
    return { last: src.last || null, history: boundedArray(src.history, LIMITS.policyOutcomes), queue: [] };
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
      // m025-141: preferensi BELAJAR dan buku besar adaptif ikut. Tanpa keduanya, restore
      // memulihkan jawaban murid tetapi membuang alasan di baliknya: level yang ia pilih,
      // kebijakan yang pernah dijalankan, dan hasil yang sudah dinilai.
      preferences: pickLearningPreferences(state.preferences),
      adaptivePolicyMeta: boundedPolicyMeta(state.adaptivePolicyMeta),
      policyOutcomeMeta: boundedOutcomeMeta(state.policyOutcomeMeta),
      contentCanaryMeta: plainObject(state.contentCanaryMeta),
      // Sengaja TIDAK menyertakan: view, activeSession, reportMeta, reminderMeta, dan seluruh
      // preferensi perangkat. Semua itu keadaan perangkat; membawanya ke perangkat lain hanya
      // memindahkan kebingungan - dan reportMeta membawa endpoint milik pemiliknya.
      transferred: { deviceState: false, credentials: false, learningPreferences: true, adaptiveLedger: true }
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
  function mergeWrongAnswers(localRows, backupRows) {
    var seen = {}, out = [];
    var sources = [Array.isArray(backupRows) ? backupRows : [], Array.isArray(localRows) ? localRows : []];
    for (var s = 0; s < sources.length; s++) {
      for (var i = 0; i < sources[s].length; i++) {
        var row = sources[s][i];
        if (!row || typeof row !== 'object') continue;
        var id = String(row.at || '') + '|' + String(row.question || '') + '|' + String(row.target || '');
        if (seen[id]) continue;
        seen[id] = true; out.push(row);
      }
    }
    return out.sort(function (a, b) { return (Number(a.at) || 0) - (Number(b.at) || 0); });
  }
  function mergeLearningPreferences(localPrefs, backupPrefs) {
    var local = plainObject(localPrefs) || {}, incoming = pickLearningPreferences(backupPrefs), out = {};
    for (var key in local) if (Object.prototype.hasOwnProperty.call(local, key)) out[key] = local[key];
    for (var i = 0; i < LEARNING_PREFERENCES.length; i++) {
      var name = LEARNING_PREFERENCES[i];
      if (!out[name] && incoming[name]) out[name] = incoming[name];
    }
    return out;
  }
  function mergeRowsByKey(a, b, limit, keyOf) {
    var seen = {}, out = [];
    var rows = (Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []);
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || typeof row !== 'object') continue;
      var id = keyOf(row, i);
      if (seen[id]) continue;
      seen[id] = true; out.push(row);
    }
    return boundedArray(out.sort(function (x, y) { return (Number(x.at || Date.parse(x.at || '')) || 0) - (Number(y.at || Date.parse(y.at || '')) || 0); }), limit);
  }
  function mergePolicyMeta(localMeta, backupMeta) {
    var local = plainObject(localMeta), backup = plainObject(backupMeta);
    if (!local && !backup) return null;
    var base = local || backup;
    return { lastPolicy: base.lastPolicy || null, lastSource: String(base.lastSource || ''), lastAt: Number(base.lastAt) || 0,
      history: mergeRowsByKey(local && local.history, backup && backup.history, LIMITS.policyHistory,
        function (row, i) { return String(row.policyId || '') + '|' + String(row.at || i); }) };
  }
  function mergeOutcomeMeta(localMeta, backupMeta) {
    var local = plainObject(localMeta), backup = plainObject(backupMeta);
    if (!local && !backup) return null;
    var base = local || backup;
    // Antrean tetap milik perangkat ini; yang digabung hanya riwayat hasil yang sudah dinilai.
    return { last: base.last || null, queue: Array.isArray(local && local.queue) ? local.queue : [],
      history: mergeRowsByKey(local && local.history, backup && backup.history, LIMITS.policyOutcomes,
        function (row, i) { return String(row.outcomeId || row.sessionId || '') + '|' + String(row.at || i); }) };
  }
  function mergeProgress(localState, backupPayload) {
    var local = localState || {};
    var backup = backupPayload || {};

    // S3: KUNCI DEDUP ADALAH IDENTITAS PERCOBAAN, BUKAN IDENTITAS SOAL.
    //
    // Versi sebelumnya memakai `row.id`, dan `row.id` adalah id SOAL. Artinya menjawab soal
    // yang sama dua kali menghasilkan dua baris ber-kunci sama, dan yang kedua dibuang diam-
    // diam. Latihan berulang adalah inti spaced repetition, jadi yang paling mungkin hilang
    // justru bukti yang paling bernilai — dan itu sudah berlaku pada restore backup, jauh
    // sebelum sync antar-perangkat ada.
    //
    // Baris baru membawa `attemptId` yang unik per percobaan. Baris LAMA tidak punya, jadi
    // cadangannya adalah sidik isi (waktu + soal + skill + hasil + durasi): dua baris dengan
    // kelimanya identik memang percobaan yang sama yang datang lewat dua jalan. Indeks array
    // TIDAK ikut — versi lama menyertakannya, sehingga baris lama tanpa id tidak pernah
    // dedup antar-sumber karena posisinya berbeda di tiap sisi.
    var byId = {};
    var order = [];
    var sources = [Array.isArray(local.history) ? local.history : [], Array.isArray(backup.history) ? backup.history : []];
    for (var s = 0; s < sources.length; s++) {
      for (var i = 0; i < sources[s].length; i++) {
        var row = sources[s][i];
        if (!row || typeof row !== 'object') continue;
        var id = row.attemptId
          ? 'a:' + String(row.attemptId)
          : 'c:' + [row.at, row.id, row.skill, row.ok, row.ms].map(function (v) { return String(v == null ? '' : v); }).join('|');
        if (!byId[id]) { byId[id] = row; order.push(id); }
      }
    }
    var history = order.map(function (id) { return byId[id]; })
      .sort(function (a, b) { return (Number(a.at) || 0) - (Number(b.at) || 0); })
      .slice(-LIMITS.history);

    var merged = {
      history: history,
      // m025-141: sebelumnya HANYA wrongAnswers lokal yang dipakai, jadi daftar salah dari
      // perangkat lama hilang tanpa jejak saat restore - padahal itu bahan utama review.
      wrongAnswers: boundedArray(mergeWrongAnswers(local.wrongAnswers, backup.wrongAnswers), LIMITS.wrongAnswers),
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
      streak: Math.max(Number(local.streak) || 0, Number(backup.streak) || 0),
      // Preferensi perangkat TETAP milik perangkat ini. Yang menyatu hanya tiga field belajar,
      // dan pilihan yang sudah dibuat di perangkat ini menang - restore tidak boleh diam-diam
      // memindahkan murid ke level lain saat ia sedang belajar.
      preferences: mergeLearningPreferences(local.preferences, backup.preferences),
      adaptivePolicyMeta: mergePolicyMeta(local.adaptivePolicyMeta, backup.adaptivePolicyMeta),
      policyOutcomeMeta: mergeOutcomeMeta(local.policyOutcomeMeta, backup.policyOutcomeMeta),
      contentCanaryMeta: plainObject(local.contentCanaryMeta) || plainObject(backup.contentCanaryMeta) || null
    };
    if (!merged.contentCanaryMeta) delete merged.contentCanaryMeta;
    if (!merged.adaptivePolicyMeta) delete merged.adaptivePolicyMeta;
    if (!merged.policyOutcomeMeta) delete merged.policyOutcomeMeta;

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

  /* ---- Audit F1 2026-10-04: DUA TAB, SATU BLOB STATE ------------------------------------
   *
   * Seluruh progres (riwayat, mastery, jadwal, gem) tersimpan sebagai satu blob per akun, dan
   * setiap tab menulis ulang blob itu dari memorinya sendiri. Tab yang dibuka lebih dulu lalu
   * menyimpan satu perubahan kecil menghapus SELURUH kemajuan tab lain (probe audit O6: riwayat
   * 5 -> 0, gem 2 -> 0). Di HP ini terjadi saat PWA terpasang dan tab browser sama-sama terbuka.
   *
   * Obatnya penggabungan TIGA ARAH, bukan "siapa terakhir menang":
   *   base   = state yang tersimpan saat tab INI terakhir membaca/menulis,
   *   mine   = state di memori tab ini,
   *   theirs = state yang baru saja ditulis tab lain.
   * Bidang yang hanya diubah satu pihak diambil dari pihak itu. Bidang yang diubah keduanya
   * digabung sesuai maknanya: riwayat per attemptId, catatan berwaktu per isi, penghitung
   * dijumlahkan dari base (mine + theirs - base), buku gem per entri, item materi per item
   * (bukti terbaru menang, laterRow), sisanya tab ini menang. Murni, tanpa I/O, deterministik.
   */
  var TAB_LOCAL_FIELDS = { view: 1, activeSession: 1, inflightAttempt: 1, pendingInterruptNotice: 1, coachCache: 1 };
  var COUNTER_FIELDS = { totalAnswered: 1, totalCorrect: 1, totalTimeMs: 1 };
  var CONCURRENT_HISTORY_LIMIT = 1000;
  function sameValue(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function mergeCounter(b, m, t) {
    var bb = Number(b) || 0, mm = Number(m) || 0, tt = Number(t) || 0;
    return Math.max(mm, tt, mm + tt - bb);
  }
  function rowKey(row) {
    if (!row || typeof row !== 'object') return 'v:' + JSON.stringify(row);
    if (row.attemptId) return 'a:' + String(row.attemptId);
    if (row.id && (row.at || row.startedAt)) return 'i:' + String(row.id) + '|' + String(row.at || row.startedAt);
    return 'j:' + JSON.stringify(row);
  }
  function rowTime(row) {
    if (!row || typeof row !== 'object') return NaN;
    var at = row.at != null ? row.at : row.startedAt;
    var n = Number(at);
    return isFinite(n) && n > 0 ? n : Date.parse(String(at || ''));
  }
  /** Tab ini tetap utuh; baris yang HANYA ditambahkan tab lain (tidak ada di base) menyusul. */
  function mergeAppended(b, m, t, limit) {
    var mine = Array.isArray(m) ? m : [], theirs = Array.isArray(t) ? t : [], base = Array.isArray(b) ? b : [];
    var known = {}, i;
    for (i = 0; i < base.length; i++) known[rowKey(base[i])] = true;
    for (i = 0; i < mine.length; i++) known[rowKey(mine[i])] = true;
    var out = mine.slice();
    var added = false;
    for (i = 0; i < theirs.length; i++) {
      var k = rowKey(theirs[i]);
      if (known[k]) continue;
      known[k] = true; out.push(theirs[i]); added = true;
    }
    if (added && out.every(function (r) { return isFinite(rowTime(r)); })) {
      out = out.map(function (r, idx) { return { r: r, idx: idx }; })
        .sort(function (x, y) { return (rowTime(x.r) - rowTime(y.r)) || (x.idx - y.idx); })
        .map(function (x) { return x.r; });
    }
    return limit ? out.slice(-limit) : out;
  }
  function mergeGemsConcurrent(b, m, t) {
    if (!isPlainObject(m) || !isPlainObject(t)) return m || t;
    var base = isPlainObject(b) ? b : {};
    var earned = mergeCounter(base.earnedTotal, m.earnedTotal, t.earnedTotal);
    var spent = mergeCounter(base.spentTotal, m.spentTotal, t.spentTotal);
    if (spent > earned) spent = earned;
    var ledger = mergeAppended(base.ledger, m.ledger, t.ledger, 0);
    var out = {};
    for (var key in m) if (Object.prototype.hasOwnProperty.call(m, key)) out[key] = m[key];
    out.earnedTotal = earned; out.spentTotal = spent; out.balance = earned - spent; out.ledger = ledger;
    return out;
  }
  function mergeDailyConcurrent(b, m, t) {
    if (!isPlainObject(m) || !isPlainObject(t)) return m || t;
    if (String(m.date || '') !== String(t.date || '')) return String(m.date || '') > String(t.date || '') ? m : t;
    var base = isPlainObject(b) && String(b.date || '') === String(m.date || '') ? b : { count: 0, attempts: 0 };
    var out = {};
    for (var key in m) if (Object.prototype.hasOwnProperty.call(m, key)) out[key] = m[key];
    out.count = mergeCounter(base.count, m.count, t.count);
    out.attempts = mergeCounter(base.attempts, m.attempts, t.attempts);
    out.meaningful = !!(m.meaningful || t.meaningful);
    return out;
  }
  function mergeBucketConcurrent(b, m, t) {
    var base = isPlainObject(b) ? b : {}, mine = isPlainObject(m) ? m : {}, theirs = isPlainObject(t) ? t : {};
    var out = {}, keys = Object.keys(mine).concat(Object.keys(theirs).filter(function (k) { return !Object.prototype.hasOwnProperty.call(mine, k); }));
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], mv = mine[k], tv = theirs[k], bv = base[k];
      if (mv === undefined) { if (bv === undefined) out[k] = tv; continue; }
      if (tv === undefined) { out[k] = mv; continue; }
      if (sameValue(mv, bv)) out[k] = tv;
      else if (sameValue(tv, bv)) out[k] = mv;
      else out[k] = laterRow(mv, tv);
    }
    return out;
  }
  function mergeValueConcurrent(b, m, t) {
    if (m === undefined) return b === undefined ? t : undefined;
    if (t === undefined) return m;
    if (sameValue(m, b)) return t;
    if (sameValue(t, b)) return m;
    if (isPlainObject(m) && isPlainObject(t)) {
      var base = isPlainObject(b) ? b : {}, out = {};
      var keys = Object.keys(m).concat(Object.keys(t).filter(function (k) { return !Object.prototype.hasOwnProperty.call(m, k); }));
      for (var i = 0; i < keys.length; i++) {
        var v = mergeValueConcurrent(base[keys[i]], m[keys[i]], t[keys[i]]);
        if (v !== undefined) out[keys[i]] = v;
      }
      return out;
    }
    if (Array.isArray(m) && Array.isArray(t)) return mergeAppended(b, m, t, 0);
    return m;
  }
  function mergeConcurrentState(baseState, mineState, theirsState) {
    var base = isPlainObject(baseState) ? baseState : {}, mine = isPlainObject(mineState) ? mineState : {}, theirs = isPlainObject(theirsState) ? theirsState : {};
    var out = {};
    var keys = Object.keys(mine).concat(Object.keys(theirs).filter(function (k) { return !Object.prototype.hasOwnProperty.call(mine, k); }));
    for (var i = 0; i < keys.length; i++) {
      var f = keys[i], b = base[f], m = mine[f], t = theirs[f], v;
      if (TAB_LOCAL_FIELDS[f]) v = m;
      else if (f === 'stateRevision') v = Math.max(Number(m) || 0, Number(t) || 0);
      else if (sameValue(m, b) && t !== undefined) v = t;
      else if (sameValue(t, b) || t === undefined) v = m;
      else if (COUNTER_FIELDS[f]) v = mergeCounter(b, m, t);
      else if (f === 'history') v = mergeAppended(b, m, t, CONCURRENT_HISTORY_LIMIT);
      else if (f === 'gems') v = mergeGemsConcurrent(b, m, t);
      else if (f === 'daily') v = mergeDailyConcurrent(b, m, t);
      else if (f === 'streak') v = Math.max(Number(m) || 0, Number(t) || 0);
      else if (ITEM_BUCKETS.indexOf(f) !== -1) v = mergeBucketConcurrent(b, m, t);
      else v = mergeValueConcurrent(b, m, t);
      if (v !== undefined) out[f] = v;
    }
    return out;
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
    mergeProgress: mergeProgress,
    mergeConcurrentState: mergeConcurrentState
  };
});
