/**
 * FIEZEL — buku besar bayangan Cloudflare (S2, `features/cf-shadow/`).
 *
 * MENGAPA MODUL INI ADA. Mode `shadow` di blok `CF-TRANSPORT-BEGIN/END` (app.js) sudah
 * mengirim salinan permintaan ke CF sementara jawaban murid tetap dari Puter, tetapi
 * perbandingannya hanya masuk `console.debug`. Baris konsol hilang begitu tab ditutup, dan
 * keputusan "endpoint mana yang dinyalakan lebih dulu" tidak bisa diambil dari sesuatu yang
 * hilang. Modul ini mengubah bayangan menjadi BUKTI TERKUMPUL di perangkat: agregat kecil
 * yang selamat dari reload dan bisa dibaca di panel diagnostik.
 *
 * ============================================================================
 * PRIVASI MUTLAK — DAFTAR LARANGAN (tidak boleh dilonggarkan tanpa keputusan OWNER)
 * ============================================================================
 * DILARANG menyimpan, menurunkan, atau mengirim:
 *   - isi prompt / pertanyaan / instruksi yang dikirim ke AI
 *   - isi jawaban AI (teks, terjemahan, rubrik, koreksi)
 *   - teks apa pun yang ditulis atau diucapkan murid (jawaban, esai, transkrip)
 *   - nama, panggilan, alamat email, nomor telepon
 *   - uuid / id murid / id sesi / token / cookie / header Authorization
 *   - alamat IP, koordinat, nama perangkat, User-Agent
 *   - URL lengkap (query string bisa membawa token dan id) — hanya NAMA ENDPOINT
 *   - potongan body permintaan atau body jawaban, sekecil apa pun
 *
 * Yang BOLEH disimpan hanya dua kelas nilai: ANGKA, dan NAMA ENDPOINT dari daftar tetap
 * tujuh nama di `ENDPOINT_ALLOWLIST` (+ 'unmapped'). Satu pengecualian sempit yang dijaga
 * ketat: NAMA KUNCI JSON tingkat atas yang bentuknya berbeda (butir 3) — itu skema, bukan
 * isi. Nama kunci pun disaring: hanya pengenal gaya JSON (`^[A-Za-z_][A-Za-z0-9_]{0,31}$`), sisanya
 * jadi '(kunci-tidak-baku)'. Jadi teks bebas tidak punya jalan masuk lewat nama kunci.
 *
 * PENEGAKANNYA MEMAKAI ALLOWLIST, BUKAN BLACKLIST. `sanitizeInput()` membangun objek BARU
 * dan hanya menyalin field yang namanya ada di `FIELD_ALLOWLIST`; field lain tidak dibaca,
 * tidak dicatat namanya (nama field pun bisa datang dari pemanggil), hanya DIHITUNG.
 * Blacklist selalu kalah: field baru bernama `promptText2` akan lolos dari daftar larangan,
 * tetapi tidak akan pernah lolos dari allowlist.
 *
 * BENTUK vs ISI (butir 3). `compareShapes()` membandingkan kunci JSON tingkat atas dan
 * `typeof` nilainya — bukan nilainya. Ia menerima objek yang SUDAH diurai dan tidak pernah
 * menyimpan satu pun nilai. `observe()` yang mengurai body melakukannya HANYA lewat
 * `response.clone()`; kalau `clone` tidak ada, perbandingan dilewati (`shapeMatch = null`,
 * dihitung sebagai 'unknown') — lebih baik kehilangan satu baris bukti daripada menghabiskan
 * body jawaban yang sedang dipakai murid.
 *
 * BATAS UKURAN (butir 1). Yang disimpan agregat, bukan riwayat: satu baris per endpoint,
 * maksimum delapan baris (tujuh nama + 'unmapped'), status di-bucket dengan maksimum
 * `MAX_STATUS_KEYS` kunci per baris dan sisanya masuk 'other', nama kunci beda maksimum
 * `MAX_DIFF_KEYS` per baris. Di atas semua itu ada pagar bita keras `MAX_BYTES` dengan
 * pemangkasan bertahap. Tidak ada satu pun array riwayat per permintaan di sini — jadi
 * ukurannya tidak bisa tumbuh mengikuti pemakaian murid.
 *
 * KONTRAK LAIN: modul ini tidak pernah membuka jaringan (nol `fetch`), tidak menyentuh
 * DOM, dan hanya menulis SATU kunci penyimpanan (`STORAGE_KEY`).
 */
(function (root) {
  'use strict';

  var SCHEMA = 'fiezel-cf-shadow-ledger-v1';
  var STORAGE_KEY = 'fiezel-cf-shadow-ledger-v1';

  // Satu-satunya nama endpoint yang boleh tersimpan. Sengaja SAMA dengan tujuh nama flag di
  // core-config.js/FIEZEL_CF_CONFIG.endpoints, dan sengaja BUKAN path: path membawa id, uuid,
  // dan query string. Path yang tidak terpetakan runtuh menjadi satu nama netral.
  var ENDPOINT_ALLOWLIST = ['health', 'config', 'auth', 'quota', 'ai', 'tts', 'usage'];
  var UNMAPPED = 'unmapped';

  // Allowlist FIELD masukan. Apa pun di luar daftar ini tidak pernah dibaca.
  // `puterResponse`/`cfResponse` sengaja TIDAK ada di sini: keduanya hanya argumen transien
  // untuk `observe()` dan tidak pernah melewati `sanitizeInput()`.
  var FIELD_ALLOWLIST = ['endpoint', 'puterStatus', 'cfStatus', 'puterMs', 'cfMs', 'shapeMatch', 'diffKeys'];

  var MAX_STATUS_KEYS = 8;      // kunci status berbeda per endpoint, sisanya -> 'other'
  var MAX_DIFF_KEYS = 12;       // nama kunci beda per endpoint, sisanya -> 'other'
  var MAX_MS = 120000;          // latensi di atas ini dianggap 120s (pagar terhadap angka gila)
  var MAX_STATUS = 599;
  var MAX_BYTES = 6000;         // pagar ukuran keras untuk seluruh isi penyimpanan
  // Sengaja SEMPIT: gaya pengenal JSON yang wajar (camelCase/snake_case), harus dimulai huruf
  // atau garis bawah, tanpa tanda hubung/spasi/@/titik. Kunci API nyata muat di sini; kalimat,
  // nama orang, email, dan uuid TIDAK — jadi teks bebas tidak bisa menyelundup lewat nama kunci.
  var KEY_SHAPE = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;
  var ODD_KEY = '(kunci-tidak-baku)';

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function intIn(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) return 0;
    n = Math.round(n);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function safeEndpoint(value) {
    var name = typeof value === 'string' ? value : '';
    return ENDPOINT_ALLOWLIST.indexOf(name) === -1 ? UNMAPPED : name;
  }

  function safeKeyName(value) {
    var name = typeof value === 'string' ? value : '';
    return KEY_SHAPE.test(name) ? name : ODD_KEY;
  }

  /**
   * Penyaring allowlist. Mengembalikan objek BARU: hanya field ber-nama allowlist, sudah
   * dipaksa menjadi angka/boolean/nama-dari-daftar. `dropped` adalah JUMLAH field yang
   * ditolak — namanya tidak ikut dicatat, karena nama field pun datang dari pemanggil.
   */
  function sanitizeInput(input) {
    var src = isObj(input) ? input : {};
    var dropped = 0;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (FIELD_ALLOWLIST.indexOf(k) === -1) dropped++;
    }
    var diff = [];
    if (Array.isArray(src.diffKeys)) {
      for (var i = 0; i < src.diffKeys.length && diff.length < MAX_DIFF_KEYS; i++) {
        var name = safeKeyName(src.diffKeys[i]);
        if (diff.indexOf(name) === -1) diff.push(name);
      }
    }
    return {
      endpoint: safeEndpoint(src.endpoint),
      puterStatus: intIn(src.puterStatus, 0, MAX_STATUS),
      cfStatus: intIn(src.cfStatus, 0, MAX_STATUS),
      puterMs: intIn(src.puterMs, 0, MAX_MS),
      cfMs: intIn(src.cfMs, 0, MAX_MS),
      shapeMatch: src.shapeMatch === true ? true : src.shapeMatch === false ? false : null,
      diffKeys: diff,
      dropped: dropped
    };
  }

  /**
   * Peta kunci -> tipe untuk SATU tingkat teratas. Nilai tidak pernah disalin ke mana pun.
   * `null` dibedakan dari 'object' karena itu beda yang berarti saat membaca jawaban API.
   */
  function shapeOf(value) {
    var out = {};
    if (!isObj(value)) return null;
    var keys = Object.keys(value).sort();
    for (var i = 0; i < keys.length; i++) {
      var v = value[keys[i]];
      out[keys[i]] = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    }
    return out;
  }

  /**
   * Perbandingan BENTUK. Hasilnya: cocok atau tidak, dan kunci MANA yang berbeda — itu yang
   * berguna saat memutuskan endpoint mana aman dinyalakan. Nilai tidak pernah dibandingkan
   * dan tidak pernah dibawa keluar.
   */
  function compareShapes(puterBody, cfBody) {
    var a = shapeOf(puterBody);
    var b = shapeOf(cfBody);
    if (!a || !b) return { match: null, diffKeys: [] };
    var seen = {};
    var keys = Object.keys(a).concat(Object.keys(b));
    var diff = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (seen[k]) continue;
      seen[k] = true;
      var inA = Object.prototype.hasOwnProperty.call(a, k);
      var inB = Object.prototype.hasOwnProperty.call(b, k);
      if (!inA || !inB || a[k] !== b[k]) diff.push(k);
    }
    diff.sort();
    return { match: diff.length === 0, diffKeys: diff };
  }

  function emptyRow(endpoint) {
    return {
      endpoint: endpoint,
      n: 0,
      shapeMatch: 0,
      shapeDiff: 0,
      shapeUnknown: 0,
      puterFail: 0,
      cfFail: 0,
      puterMsSum: 0,
      cfMsSum: 0,
      deltaMsSum: 0,
      statusPuter: {},
      statusCf: {},
      diffKeys: {}
    };
  }

  function bumpCapped(map, key, cap) {
    if (!Object.prototype.hasOwnProperty.call(map, key) && Object.keys(map).length >= cap) {
      map.other = (map.other || 0) + 1;
      return;
    }
    map[key] = (map[key] || 0) + 1;
  }

  /** Validasi ulang isi penyimpanan. Yang tersimpan tidak dipercaya: ia bisa diedit tangan. */
  function sanitizeRow(raw, endpoint) {
    var row = emptyRow(endpoint);
    if (!isObj(raw)) return row;
    var numeric = ['n', 'shapeMatch', 'shapeDiff', 'shapeUnknown', 'puterFail', 'cfFail', 'puterMsSum', 'cfMsSum'];
    for (var i = 0; i < numeric.length; i++) row[numeric[i]] = intIn(raw[numeric[i]], 0, Number.MAX_SAFE_INTEGER);
    row.deltaMsSum = intIn(raw.deltaMsSum, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    var maps = [['statusPuter', MAX_STATUS_KEYS], ['statusCf', MAX_STATUS_KEYS], ['diffKeys', MAX_DIFF_KEYS]];
    for (var m = 0; m < maps.length; m++) {
      var name = maps[m][0], cap = maps[m][1], src = isObj(raw[name]) ? raw[name] : {};
      var keys = Object.keys(src);
      var target = row[name];
      for (var k = 0; k < keys.length; k++) {
        var count = intIn(src[keys[k]], 0, Number.MAX_SAFE_INTEGER);
        var key;
        if (keys[k] === 'other') key = 'other';
        else if (name === 'diffKeys') key = safeKeyName(keys[k]);
        else key = String(intIn(keys[k], 0, MAX_STATUS));
        // Kelebihan kunci DILIPAT ke 'other', tidak dibuang: hitungan total harus tetap
        // menjumlah, kalau tidak tabel di panel akan berbohong tentang berapa yang tercatat.
        if (key !== 'other' && !Object.prototype.hasOwnProperty.call(target, key)
            && Object.keys(target).length >= cap) key = 'other';
        target[key] = (target[key] || 0) + count;
      }
    }
    return row;
  }

  function emptyLedger() {
    return { schema: SCHEMA, updatedAt: 0, observed: 0, dropped: 0, pruned: 0, rows: {} };
  }

  function sanitizeLedger(raw) {
    var out = emptyLedger();
    if (!isObj(raw) || raw.schema !== SCHEMA) return out;
    out.updatedAt = intIn(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER);
    out.observed = intIn(raw.observed, 0, Number.MAX_SAFE_INTEGER);
    out.dropped = intIn(raw.dropped, 0, Number.MAX_SAFE_INTEGER);
    out.pruned = intIn(raw.pruned, 0, Number.MAX_SAFE_INTEGER);
    var rows = isObj(raw.rows) ? raw.rows : {};
    var names = ENDPOINT_ALLOWLIST.concat([UNMAPPED]);
    for (var i = 0; i < names.length; i++) {
      if (Object.prototype.hasOwnProperty.call(rows, names[i])) {
        out.rows[names[i]] = sanitizeRow(rows[names[i]], names[i]);
      }
    }
    return out;
  }

  function storage() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }

  function load() {
    var store = storage();
    if (!store) return emptyLedger();
    var raw = null;
    try { raw = store.getItem(STORAGE_KEY); } catch (_) { return emptyLedger(); }
    if (!raw) return emptyLedger();
    try { return sanitizeLedger(JSON.parse(String(raw))); } catch (_) { return emptyLedger(); }
  }

  /**
   * Pemangkasan bertahap sampai muat di MAX_BYTES. Urutan sengaja: yang paling murah
   * dibuang lebih dulu (nama kunci beda), lalu ember status, lalu baris paling sedikit
   * datanya. `pruned` naik supaya panel bisa mengaku bahwa ada yang dipangkas.
   */
  function fit(ledger) {
    function bytes() { return JSON.stringify(ledger).length; }
    if (bytes() <= MAX_BYTES) return ledger;
    var names = Object.keys(ledger.rows);
    var i;
    for (i = 0; i < names.length && bytes() > MAX_BYTES; i++) {
      var row = ledger.rows[names[i]];
      var keys = Object.keys(row.diffKeys);
      if (keys.length > 3) {
        keys.sort(function (a, b) { return row.diffKeys[b] - row.diffKeys[a]; });
        var kept = {};
        for (var k = 0; k < 3; k++) kept[keys[k]] = row.diffKeys[keys[k]];
        row.diffKeys = kept;
        ledger.pruned++;
      }
    }
    names = Object.keys(ledger.rows);
    for (i = 0; i < names.length && bytes() > MAX_BYTES; i++) {
      ledger.rows[names[i]].diffKeys = {};
      ledger.pruned++;
    }
    while (bytes() > MAX_BYTES) {
      names = Object.keys(ledger.rows);
      if (!names.length) break;
      names.sort(function (a, b) { return ledger.rows[a].n - ledger.rows[b].n; });
      delete ledger.rows[names[0]];
      ledger.pruned++;
    }
    return ledger;
  }

  function persist(ledger) {
    var store = storage();
    if (!store || typeof store.setItem !== 'function') return ledger;
    try { store.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch (_) { /* penyimpanan penuh: bukti hilang, murid tidak terganggu */ }
    return ledger;
  }

  function now() {
    try { return Date.now(); } catch (_) { return 0; }
  }

  /**
   * Satu baris bukti. Masukan disaring lebih dulu; nilai apa pun di luar allowlist tidak
   * pernah menyentuh agregat.
   */
  function record(input) {
    var clean = sanitizeInput(input);
    var ledger = load();
    var row = ledger.rows[clean.endpoint] || emptyRow(clean.endpoint);
    row.n++;
    if (clean.shapeMatch === true) row.shapeMatch++;
    else if (clean.shapeMatch === false) row.shapeDiff++;
    else row.shapeUnknown++;
    if (clean.puterStatus === 0 || clean.puterStatus >= 400) row.puterFail++;
    if (clean.cfStatus === 0 || clean.cfStatus >= 400) row.cfFail++;
    row.puterMsSum += clean.puterMs;
    row.cfMsSum += clean.cfMs;
    row.deltaMsSum += clean.cfMs - clean.puterMs;
    bumpCapped(row.statusPuter, String(clean.puterStatus), MAX_STATUS_KEYS);
    bumpCapped(row.statusCf, String(clean.cfStatus), MAX_STATUS_KEYS);
    for (var i = 0; i < clean.diffKeys.length; i++) bumpCapped(row.diffKeys, clean.diffKeys[i], MAX_DIFF_KEYS);
    ledger.rows[clean.endpoint] = row;
    ledger.observed++;
    ledger.dropped += clean.dropped;
    ledger.updatedAt = now();
    return persist(fit(ledger));
  }

  /**
   * Jalur yang dipakai blok transport. Dua respons masuk sebagai argumen TRANSIEN: keduanya
   * hanya dipakai untuk membandingkan BENTUK, dan hanya lewat `clone()` supaya body yang
   * sedang dipakai murid tidak pernah dihabiskan. Kalau `clone` tidak ada, perbandingan
   * dilewati alih-alih dipaksakan.
   */
  function observe(event) {
    var src = isObj(event) ? event : {};
    var base = {
      endpoint: src.endpoint,
      puterStatus: src.puterStatus,
      cfStatus: src.cfStatus,
      puterMs: src.puterMs,
      cfMs: src.cfMs
    };
    var pair = [src.puterResponse, src.cfResponse];
    for (var i = 0; i < pair.length; i++) {
      if (!pair[i] || typeof pair[i].clone !== 'function') {
        record(base);
        return Promise.resolve(load());
      }
    }
    var bodies;
    try {
      bodies = Promise.all(pair.map(function (res) {
        return Promise.resolve()
          .then(function () { return res.clone().json(); })
          .catch(function () { return null; });
      }));
    } catch (_) {
      record(base);
      return Promise.resolve(load());
    }
    return bodies.then(function (parsed) {
      var shape = compareShapes(parsed[0], parsed[1]);
      base.shapeMatch = shape.match;
      base.diffKeys = shape.diffKeys;
      // Body yang sudah diurai tidak disimpan di mana pun: hanya `shape.match` (boolean) dan
      // `shape.diffKeys` (nama kunci) yang diteruskan, dan keduanya lewat allowlist lagi.
      parsed[0] = null; parsed[1] = null;
      record(base);
      return load();
    }).catch(function () {
      record(base);
      return load();
    });
  }

  function avg(sum, n) { return n > 0 ? Math.round(sum / n) : 0; }

  /** Baris siap-tampil untuk panel diagnostik. Angka dan nama endpoint saja. */
  function summary() {
    var ledger = load();
    var names = ENDPOINT_ALLOWLIST.concat([UNMAPPED]).filter(function (name) {
      return Object.prototype.hasOwnProperty.call(ledger.rows, name);
    });
    var rows = names.map(function (name) {
      var r = ledger.rows[name];
      return {
        endpoint: name,
        n: r.n,
        match: r.shapeMatch,
        diff: r.shapeDiff,
        unknown: r.shapeUnknown,
        puterFail: r.puterFail,
        cfFail: r.cfFail,
        puterAvgMs: avg(r.puterMsSum, r.n),
        cfAvgMs: avg(r.cfMsSum, r.n),
        deltaAvgMs: avg(r.deltaMsSum, r.n),
        statusPuter: r.statusPuter,
        statusCf: r.statusCf,
        diffKeys: r.diffKeys
      };
    });
    return {
      schema: SCHEMA,
      observed: ledger.observed,
      droppedFields: ledger.dropped,
      pruned: ledger.pruned,
      updatedAt: ledger.updatedAt,
      bytes: JSON.stringify(ledger).length,
      maxBytes: MAX_BYTES,
      rows: rows
    };
  }

  function pad(value, width) {
    var s = String(value);
    while (s.length < width) s += ' ';
    return s;
  }

  function mapText(map) {
    var keys = Object.keys(map).sort();
    if (!keys.length) return '-';
    return keys.map(function (k) { return k + ':' + map[k]; }).join(' ');
  }

  /**
   * Ekspor teks untuk di-copy dari panel diagnostik (butir 6). Tidak ada PII karena tidak
   * ada PII di agregatnya — jaminan butir 2 sudah ditegakkan di pintu masuk, bukan di sini.
   */
  function exportText() {
    var s = summary();
    var lines = [];
    lines.push('FIEZEL cf-shadow ledger — ' + s.schema);
    lines.push('bayangan tercatat: ' + s.observed + ' · field ditolak allowlist: ' + s.droppedFields +
      ' · pemangkasan: ' + s.pruned + ' · ukuran: ' + s.bytes + '/' + s.maxBytes + 'B');
    lines.push('TANPA PII: hanya angka dan nama endpoint. Tanpa prompt, jawaban, teks murid, nama, email, uuid, IP, cookie.');
    lines.push('');
    lines.push(pad('endpoint', 10) + pad('n', 6) + pad('cocok', 7) + pad('beda', 6) + pad('?', 5) +
      pad('gagalP', 8) + pad('gagalCF', 9) + pad('puterMs', 9) + pad('cfMs', 8) + 'selisih');
    if (!s.rows.length) lines.push('(belum ada permintaan bayangan tercatat)');
    for (var i = 0; i < s.rows.length; i++) {
      var r = s.rows[i];
      lines.push(pad(r.endpoint, 10) + pad(r.n, 6) + pad(r.match, 7) + pad(r.diff, 6) + pad(r.unknown, 5) +
        pad(r.puterFail, 8) + pad(r.cfFail, 9) + pad(r.puterAvgMs, 9) + pad(r.cfAvgMs, 8) +
        (r.deltaAvgMs > 0 ? '+' : '') + r.deltaAvgMs + 'ms');
    }
    lines.push('');
    for (var j = 0; j < s.rows.length; j++) {
      var row = s.rows[j];
      lines.push(row.endpoint + ' · status puter[' + mapText(row.statusPuter) + '] cf[' + mapText(row.statusCf) +
        '] kunci-bentuk-beda[' + mapText(row.diffKeys) + ']');
    }
    return lines.join('\n');
  }

  function reset() {
    var store = storage();
    if (store && typeof store.removeItem === 'function') {
      try { store.removeItem(STORAGE_KEY); } catch (_) { /* tidak ada yang bisa dilakukan */ }
    }
    return emptyLedger();
  }

  var api = {
    SCHEMA: SCHEMA,
    STORAGE_KEY: STORAGE_KEY,
    ENDPOINT_ALLOWLIST: ENDPOINT_ALLOWLIST.slice(),
    FIELD_ALLOWLIST: FIELD_ALLOWLIST.slice(),
    LIMITS: { maxBytes: MAX_BYTES, maxStatusKeys: MAX_STATUS_KEYS, maxDiffKeys: MAX_DIFF_KEYS, maxRows: ENDPOINT_ALLOWLIST.length + 1 },
    sanitizeInput: sanitizeInput,
    shapeOf: shapeOf,
    compareShapes: compareShapes,
    record: record,
    observe: observe,
    read: load,
    summary: summary,
    exportText: exportText,
    reset: reset
  };

  root.FiezelShadowLedger = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
