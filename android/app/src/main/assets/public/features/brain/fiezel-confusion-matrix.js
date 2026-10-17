/**
 * FIEZEL Confusion Matrix — matriks kebingungan antar-lesson (Braincore v3, A7).
 *
 * ASAL TEMUAN (council model-council-claude_opus_5_0.md, C2 lapis 3)
 * ------------------------------------------------------------------
 * app.js sudah lama mencatat `optionSources` pada setiap soal grammar (app.js:4387):
 * untuk tiap opsi jawaban ia tahu dari template/skill/level MANA opsi itu dipinjam.
 * Tetapi data itu tidak pernah dibaca oleh siapa pun. Padahal di situlah sinyal
 * diagnostik yang paling murah dan paling kurikuler: kalau murid yang sedang belajar
 * lesson X berulang kali MEMILIH opsi yang aturannya berasal dari lesson Y, itu bukan
 * "salah biasa" — itu pernyataan bahwa murid MENGGANTI aturan X dengan aturan Y.
 * Baris matriks yang massanya terkonsentrasi di satu kolom adalah kalimat kurikuler,
 * bukan statistik.
 *
 * KENAPA HANYA SAAT SALAH, DAN KENAPA HANYA OPSI PINJAMAN
 * -------------------------------------------------------
 * Jawaban benar tidak mengatakan apa-apa tentang kebingungan: murid yang benar tidak
 * sedang menukar aturan. Opsi salah yang berasal dari lesson yang SAMA juga bukan
 * kebingungan antar-lesson — itu urusan ledger miskonsepsi (A4). Sinyal yang kita
 * kumpulkan di sini sengaja sempit: murid MEMILIH opsi yang SALAH dan opsi itu
 * PINJAMAN dari lesson lain. Sempit berarti bersih; matriks yang mencampur semua
 * jenis salah hanya akan menunjuk ke mana-mana.
 *
 * KENAPA ASIMETRIS
 * ----------------
 * C[X][Y] (murid di lesson X memilih aturan Y) BUKAN cermin dari C[Y][X]. Murid yang
 * memakai simple past ketika diminta present perfect sering TIDAK melakukan
 * kebalikannya — arah substitusi adalah bagian dari diagnosisnya. Karena itu kedua
 * sel disimpan terpisah dan tidak pernah dijumlahkan.
 *
 * KENAPA ADA DECAY (half-life 60 hari)
 * ------------------------------------
 * Kebingungan yang tercatat Maret dan sudah tidak terulang sejak itu tidak boleh
 * mengalahkan kebingungan yang terjadi minggu ini. Tanpa decay, murid yang sudah
 * sembuh tetap "sakit" di matriks selamanya. 60 hari dipilih jauh lebih lambat dari
 * half-life ledger miskonsepsi (14 hari) karena matriks ini memberi makan keputusan
 * KURIKULER (graf prasyarat), bukan keputusan sesi — ia boleh punya ingatan panjang,
 * asal tidak abadi.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, waktu selalu argumen
 * (nowMs), tanpa Date.now(). `record` tidak memutasi matriks masukan — ia
 * mengembalikan matriks baru, supaya pemanggil bisa membandingkan sebelum/sesudah
 * dan supaya state korup dari localStorage tidak menular ke logika.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelConfusionMatrix = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-confusion-matrix-v1';
  var DAY_MS = 86400000;
  // Half-life decay ringan: sel kehilangan setengah bobotnya tiap 60 hari tanpa bukti baru.
  var HALF_LIFE_DAYS = 60;

  function str(x) { return typeof x === 'string' ? x.trim() : (x == null ? '' : String(x).trim()); }
  function finite(x) { return typeof x === 'number' && isFinite(x); }

  /**
   * Kunci yang aman untuk tabel: nama lesson datang dari data konten, dan objek biasa
   * punya kunci warisan ('__proto__', 'constructor') yang bisa meracuni tabel atau
   * membaca prototype. Semua tabel di modul ini memakai Object.create(null), dan kunci
   * kosong dibuang di sini.
   */
  function safeKey(x) {
    var k = str(x);
    if (!k || k === '__proto__' || k === 'constructor' || k === 'prototype') return '';
    return k;
  }

  /** Hitungan sel harus angka positif terbatas; segala bentuk korupsi jatuh ke 0 (= tidak ada bukti). */
  function safeCount(x) {
    var n = Number(x);
    if (!isFinite(n) || n <= 0) return 0;
    return n;
  }

  /**
   * Salin satu tabel dua-lapis {baris: {kolom: hitungan}} sambil membuang segala yang
   * korup. Ini benteng utama terhadap state rusak: matriks datang dari localStorage
   * lewat app.js, dan JSON yang diedit tangan / terpotong / disusupi kunci aneh tidak
   * boleh membuat modul melempar atau menghitung ngawur.
   */
  function sanitizeTable(raw) {
    var out = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    var rows = Object.keys(raw);
    for (var i = 0; i < rows.length; i++) {
      var rowKey = safeKey(rows[i]);
      var rowRaw = raw[rows[i]];
      if (!rowKey || !rowRaw || typeof rowRaw !== 'object' || Array.isArray(rowRaw)) continue;
      var cols = Object.keys(rowRaw);
      var row = null;
      for (var j = 0; j < cols.length; j++) {
        var colKey = safeKey(cols[j]);
        var count = safeCount(rowRaw[cols[j]]);
        if (!colKey || count <= 0) continue;
        if (!row) row = Object.create(null);
        row[colKey] = count;
      }
      if (row) out[rowKey] = row;
    }
    return out;
  }

  /**
   * Normalisasi seluruh matriks. null/korup -> matriks kosong yang sah. Fungsi ini
   * dipanggil di gerbang SETIAP API publik supaya tidak ada satu jalur pun yang
   * mengasumsikan bentuk state.
   */
  function sanitize(matrix) {
    var src = (matrix && typeof matrix === 'object' && !Array.isArray(matrix)) ? matrix : {};
    return {
      schema: SCHEMA,
      updatedAt: finite(src.updatedAt) && src.updatedAt >= 0 ? src.updatedAt : 0,
      lessons: sanitizeTable(src.lessons),
      families: sanitizeTable(src.families),
      totalEvents: safeCount(src.totalEvents)
    };
  }

  /**
   * Faktor peluruhan untuk selang waktu tertentu. Selang negatif (jam perangkat mundur,
   * data dari masa depan) TIDAK boleh menggelembungkan hitungan — ia dijepit ke 1
   * (tanpa decay), karena "tidak tahu berapa lama" lebih jujur daripada mengarang.
   */
  function decayFactor(elapsedMs) {
    if (!finite(elapsedMs) || elapsedMs <= 0) return 1;
    return Math.pow(0.5, elapsedMs / (HALF_LIFE_DAYS * DAY_MS));
  }

  /** Terapkan decay ke seluruh tabel; sel yang meluruh di bawah ambang debu dibuang agar state tidak tumbuh abadi. */
  function decayTable(table, factor) {
    if (factor >= 1) return table;
    var rows = Object.keys(table);
    for (var i = 0; i < rows.length; i++) {
      var row = table[rows[i]];
      var cols = Object.keys(row);
      var alive = 0;
      for (var j = 0; j < cols.length; j++) {
        var v = row[cols[j]] * factor;
        if (v < 0.05) { delete row[cols[j]]; continue; }
        row[cols[j]] = v;
        alive++;
      }
      if (!alive) delete table[rows[i]];
    }
    return table;
  }

  /**
   * Catat satu bukti pilihan murid.
   *
   * evidence: {activeLesson, activeFamily, sourceLesson, sourceFamily, picked, correct}
   *   - activeLesson : lesson yang SEDANG dikerjakan murid (conceptId soal)
   *   - sourceLesson : lesson asal opsi yang dipilih (dari optionSources app.js:4387)
   *   - picked       : murid benar-benar memilih opsi ini
   *   - correct      : opsi yang dipilih adalah kunci
   *
   * Hanya menambah sel bila murid MEMILIH opsi yang SALAH dan opsi itu berasal dari
   * lesson LAIN. Semua kasus lain mengembalikan matriks (tersanitasi) tanpa tambahan —
   * termasuk jawaban benar, opsi milik lesson sendiri, dan bukti tanpa identitas lesson.
   * Selalu mengembalikan matriks BARU; masukan tidak diubah.
   */
  function record(matrix, evidence, nowMs) {
    var next = sanitize(matrix);
    var now = finite(nowMs) ? nowMs : next.updatedAt;
    var ev = (evidence && typeof evidence === 'object') ? evidence : {};

    var activeLesson = safeKey(ev.activeLesson);
    var sourceLesson = safeKey(ev.sourceLesson);
    var qualifies = ev.picked === true && ev.correct === false &&
      activeLesson && sourceLesson && activeLesson !== sourceLesson;
    if (!qualifies) return next;

    // Decay diterapkan MALAS: hanya saat ada bukti baru, dengan selang sejak bukti
    // terakhir. Matriks yang tidak disentuh tidak perlu diluruhkan diam-diam — pembaca
    // (topConfusions) membaca hitungan apa adanya, dan pola ini menjaga record tetap
    // satu-satunya tempat state berubah.
    var factor = decayFactor(now - next.updatedAt);
    decayTable(next.lessons, factor);
    decayTable(next.families, factor);

    if (!next.lessons[activeLesson]) next.lessons[activeLesson] = Object.create(null);
    next.lessons[activeLesson][sourceLesson] = (next.lessons[activeLesson][sourceLesson] || 0) + 1;

    // Agregat keluarga: lebih kasar tetapi lebih cepat mengumpul. Lesson baru butuh
    // berminggu-minggu untuk mencapai ambang bukti; keluarganya sudah bisa bicara lebih
    // dulu. Dicatat hanya bila kedua keluarga dikenal dan memang berbeda.
    var activeFamily = safeKey(ev.activeFamily);
    var sourceFamily = safeKey(ev.sourceFamily);
    if (activeFamily && sourceFamily && activeFamily !== sourceFamily) {
      if (!next.families[activeFamily]) next.families[activeFamily] = Object.create(null);
      next.families[activeFamily][sourceFamily] = (next.families[activeFamily][sourceFamily] || 0) + 1;
    }

    next.totalEvents += 1;
    next.updatedAt = Math.max(next.updatedAt, now);
    return next;
  }

  /**
   * Kebingungan terkuat, terurut. Hanya sel dengan hitungan >= min (default 3) yang
   * dilaporkan — satu-dua salah pinjaman adalah kebisingan, bukan pola, dan matriks
   * yang berteriak di atas bukti tipis lebih berbahaya daripada yang diam.
   *
   * Keluaran: [{from, to, count, share, rationale}]
   *   - from  : lesson yang sedang dikerjakan (baris)
   *   - to    : lesson yang aturannya dipakai murid (kolom)
   *   - share : porsi sel ini terhadap seluruh kebingungan pada baris `from`;
   *             share tinggi = substitusi TERARAH ke satu lesson, bukan salah acak.
   */
  function topConfusions(matrix, opts) {
    var m = sanitize(matrix);
    var min = (opts && finite(Number(opts.min)) && Number(opts.min) > 0) ? Number(opts.min) : 3;
    var out = [];
    var rows = Object.keys(m.lessons);
    for (var i = 0; i < rows.length; i++) {
      var row = m.lessons[rows[i]];
      var cols = Object.keys(row);
      var rowTotal = 0;
      for (var j = 0; j < cols.length; j++) rowTotal += row[cols[j]];
      if (rowTotal <= 0) continue;
      for (var k = 0; k < cols.length; k++) {
        var count = row[cols[k]];
        if (count < min) continue;
        out.push({
          from: rows[i],
          to: cols[k],
          count: Math.round(count * 100) / 100,
          share: Math.round((count / rowTotal) * 1000) / 1000,
          rationale: 'brain3_lesson_confusion'
        });
      }
    }
    // Urut: hitungan terbesar dulu; seri dipecah oleh share (lebih terarah = lebih
    // penting), lalu alfabetis supaya deterministik.
    out.sort(function (a, b) {
      return (b.count - a.count) || (b.share - a.share) ||
        (a.from < b.from ? -1 : a.from > b.from ? 1 : 0) ||
        (a.to < b.to ? -1 : a.to > b.to ? 1 : 0);
    });
    return out;
  }

  /**
   * Normalisasi graf prasyarat dari bentuk yang sama dengan yang dipakai
   * FiezelCoreBrain.setCurriculumGraph: array baris atau {lessons:[...]}, tiap baris
   * {lessonId|skill|id, prerequisites:[...]}. Hasil: {lessonId: Set-lite prasyarat}.
   */
  function normalizeGraph(graphRows) {
    var list = Array.isArray(graphRows) ? graphRows
      : (graphRows && typeof graphRows === 'object' && Array.isArray(graphRows.lessons)) ? graphRows.lessons : [];
    var graph = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (!row || typeof row !== 'object') continue;
      var id = safeKey(row.lessonId || row.skill || row.subskill || row.id);
      if (!id) continue;
      var parents = Object.create(null);
      var declared = Array.isArray(row.prerequisites) ? row.prerequisites : [];
      for (var p = 0; p < declared.length; p++) {
        var parent = safeKey(declared[p]);
        if (parent && parent !== id) parents[parent] = true;
      }
      graph[id] = parents;
    }
    return graph;
  }

  /** Apakah `ancestor` ada di rantai prasyarat `node` (langsung atau turun-temurun)? Siklus dipagari `seen`. */
  function inPrerequisiteChain(graph, node, ancestor) {
    var queue = [node];
    var seen = Object.create(null);
    var guard = 0;
    while (queue.length && guard++ < 512) {
      var current = queue.shift();
      var parents = graph[current];
      if (!parents) continue;
      var keys = Object.keys(parents);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] === ancestor) return true;
        if (!seen[keys[i]]) { seen[keys[i]] = true; queue.push(keys[i]); }
      }
    }
    return false;
  }

  /**
   * Kandidat sisi prasyarat yang HILANG dari graf kurikulum.
   *
   * Logikanya mengikuti council: kebingungan C[X][Y] yang kuat berarti aturan Y
   * menyusup saat murid mengerjakan X — bukti empiris bahwa Y semestinya dikuasai
   * (dan diajarkan) SEBELUM X. Kalau graf sudah menghubungkan keduanya (Y prasyarat X,
   * langsung maupun lewat rantai, atau sebaliknya — hubungan yang arahnya terbalik
   * tetap berarti graf SADAR keduanya bertalian), tidak ada yang perlu dilaporkan.
   * Kalau tidak ada hubungan sama sekali, itu bukti graf mungkin salah, dan pasangan
   * ini dilaporkan sebagai kandidat — KANDIDAT, bukan keputusan: yang berhak mengubah
   * kurikulum adalah manusia yang membaca laporan ini, bukan matriks.
   *
   * Keluaran: [{from, to, count, share, inGraph:false, rationale, confidence}]
   *   from = lesson yang bingung (X), to = lesson sumber aturan (Y);
   *   usulan sisinya: "Y menjadi prasyarat X".
   */
  function suggestPrerequisiteEdges(matrix, graphRows, opts) {
    var min = (opts && finite(Number(opts.min)) && Number(opts.min) > 0) ? Number(opts.min) : 3;
    var minShare = (opts && finite(Number(opts.minShare))) ? Math.max(0, Math.min(1, Number(opts.minShare))) : 0.3;
    var graph = normalizeGraph(graphRows);
    var strong = topConfusions(matrix, { min: min });
    var out = [];
    for (var i = 0; i < strong.length; i++) {
      var c = strong[i];
      // share rendah = salahnya menyebar ke banyak lesson; itu murid yang belum paham
      // X sama sekali, bukan bukti hubungan X-Y. Hanya substitusi terarah yang layak
      // menggugat graf.
      if (c.share < minShare) continue;
      var related = inPrerequisiteChain(graph, c.from, c.to) || inPrerequisiteChain(graph, c.to, c.from);
      if (related) continue;
      out.push({
        from: c.from,
        to: c.to,
        count: c.count,
        share: c.share,
        inGraph: false,
        rationale: 'brain3_prereq_gap_candidate',
        // Keyakinan tumbuh dengan bukti tetapi tidak pernah 1: matriks tidak bisa
        // membedakan "prasyarat yang hilang" dari "dua lesson yang memang mirip
        // permukaannya" — itu keputusan kurikuler manusia.
        confidence: Math.round(Math.min(0.9, (1 - 1 / (1 + c.count / 3)) * c.share + 0.25) * 100) / 100
      });
    }
    return out;
  }

  return {
    SCHEMA: SCHEMA,
    HALF_LIFE_DAYS: HALF_LIFE_DAYS,
    record: record,
    topConfusions: topConfusions,
    suggestPrerequisiteEdges: suggestPrerequisiteEdges,
    // Diekspor untuk gate: decay harus bisa diuji sebagai angka, bukan lewat menunggu.
    decayFactor: decayFactor,
    sanitize: sanitize
  };
});
