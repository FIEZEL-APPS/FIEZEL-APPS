/**
 * FIEZEL · KELAS TANPA HP (R1, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Sejak 2025–2026 HP murid dibatasi di sekolah (Jawa Barat, DKI, surat edaran Kemendikdasmen).
 * Sebelum modul ini, satu-satunya cara memakai FIEZEL di jam pelajaran adalah HP murid. Modul
 * ini memberi guru dua jalan yang tidak butuh HP murid sama sekali:
 *
 *   1. LEMBAR SOAL CETAK — tugas yang sama menjadi kertas A4: dua varian (A dan B, urutan soal
 *      dan pilihan diacak berbeda supaya teman sebangku tidak bisa menyalin), lalu satu halaman
 *      kunci jawaban. Hasilnya dimasukkan guru lewat `recordPaperScores`, jadi rekap kelas,
 *      remedial, dan rapor tetap terisi.
 *   2. PEMANASAN PROYEKTOR — lima soal yang paling banyak salah dikerjakan kelas (dari bukti
 *      per soal `done[sid].w` yang sudah dikirim murid), ditampilkan satu per satu di layar
 *      tanpa nama murid. Bila belum ada data kesalahan, diambil dari keterampilan terlemah kelas.
 *
 * BATAS
 * -----
 * - Inti (resolveItems, buildVariants, warmupItems, recordPaperScores, worksheetHtml) MURNI
 *   terhadap DOM dan jaringan, supaya tests/kelas-tanpa-hp-test.js bisa memanggilnya di Node.
 * - Setiap teks soal masuk ke HTML lewat esc(). Lembar dicetak di jendela baru; soal tulisan
 *   guru adalah input bebas, jadi tidak boleh ada jalan masuk markup.
 * - Teks antarmuka hanya bahasa Indonesia (keputusan owner 2026-10-05); kuncinya di
 *   features/i18n/copy-id-sekolah.js, dan utang th-nya tercatat di tests/th-coverage-test.js.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelKelasTanpaHP = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function t(k, fb, params) {
    var s;
    try { var I = root && root.FiezelI18n; s = I && I.t ? I.t(k, params) : undefined; } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) Object.keys(params).forEach(function (p) { s = String(s).split('{' + p + '}').join(String(params[p])); });
    return s;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function bank(env) { return (env && env.bank) || (root && root.FiezelReviewBank) || null; }

  /** PRNG kecil berbiji — urutan varian harus sama setiap kali lembar dicetak ulang. */
  function rng(seed) {
    var s = (Number(seed) || 1) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shuffled(list, seed) {
    var arr = list.slice(), r = rng(seed);
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
    return arr;
  }
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  /** Soal sebuah tugas dalam urutan aslinya: soal tulisan guru dulu dicari di a.items, lalu bank. */
  function resolveItems(a, env) {
    if (!a) return [];
    var B = bank(env), custom = {}, out = [];
    (Array.isArray(a.items) ? a.items : []).forEach(function (q) { if (q && q.id) custom[q.id] = q; });
    var ids = Array.isArray(a.itemIds) && a.itemIds.length ? a.itemIds : Object.keys(custom);
    ids.forEach(function (id) {
      var q = custom[id] || (B && typeof B.byId === 'function' ? B.byId(id) : null);
      if (q && q.prompt && Array.isArray(q.options) && q.options.length >= 2) out.push(q);
    });
    return out;
  }

  function answerIndex(q) {
    var a = q.answer;
    if (typeof a === 'number' && a >= 0 && a < q.options.length) return a;
    var i = q.options.indexOf(a);
    return i >= 0 ? i : 0;
  }

  /** Satu soal untuk kertas: pilihan bisa diacak, kunci ikut berpindah. */
  function paperItem(q, n, optSeed) {
    var idx = q.options.map(function (_, i) { return i; });
    var order = optSeed ? shuffled(idx, optSeed) : idx;
    var ans = answerIndex(q);
    return {
      n: n, id: q.id, skill: q.skill || '',
      context: q.context || '', contextKind: q.contextKind || '',
      prompt: q.prompt,
      options: order.map(function (i) { return q.options[i]; }),
      key: order.indexOf(ans),
      source: q
    };
  }

  /**
   * Varian A = urutan asli. Varian B = urutan soal DAN urutan pilihan diacak berbiji dari id
   * tugas, jadi lembar yang dicetak ulang besok identik dengan yang dicetak hari ini.
   */
  function buildVariants(a, items) {
    var seed = hashString((a && a.id) || 'tugas');
    var A = items.map(function (q, i) { return paperItem(q, i + 1, 0); });
    var B = shuffled(items, seed).map(function (q, i) { return paperItem(q, i + 1, seed + i + 1); });
    return { A: A, B: B };
  }

  function questionHtml(p, env) {
    var B = bank(env), pic = '';
    try { if (B && typeof B.pictureHtml === 'function') pic = B.pictureHtml(p.source, 'ktp-pic') || ''; } catch (_) { pic = ''; }
    return '<li class="ktp-q">' +
      (p.context ? '<div class="ktp-ctx">' + esc(p.context) + '</div>' : '') + pic +
      '<p class="ktp-prompt">' + esc(p.prompt) + '</p>' +
      '<ol class="ktp-opts">' + p.options.map(function (o, i) { return '<li><b>' + LETTERS[i] + '.</b> ' + esc(o) + '</li>'; }).join('') + '</ol></li>';
  }

  /** Dokumen HTML lengkap siap cetak (A4): varian A, varian B, lalu halaman kunci. */
  function worksheetHtml(c, a, env) {
    var items = resolveItems(a, env), v = buildVariants(a, items);
    var guru = (env && env.teacherName) || (a && a.teacher) || '';
    var css = '@page{size:A4;margin:16mm}body{font:12.5pt/1.45 Georgia,serif;color:#111;margin:0}' +
      '.ktp-page{page-break-after:always;padding:0 2mm}.ktp-page:last-child{page-break-after:auto}' +
      'h1{font-size:15pt;margin:0 0 2mm}.ktp-meta{font-size:10.5pt;color:#333;margin:0 0 3mm}' +
      '.ktp-id{display:grid;grid-template-columns:2fr 1fr 1fr;gap:4mm;border:1px solid #333;padding:3mm;margin:0 0 4mm;font-size:11pt}' +
      '.ktp-id span{border-bottom:1px dotted #333;display:block;min-height:6mm}' +
      'ol.ktp-list{padding-left:7mm;margin:0}.ktp-q{margin:0 0 4mm;break-inside:avoid}.ktp-prompt{margin:0 0 1mm}' +
      '.ktp-ctx{border-left:3px solid #999;padding-left:3mm;margin:0 0 1.5mm;font-size:11.5pt;white-space:pre-wrap}' +
      'ol.ktp-opts{list-style:none;padding-left:2mm;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}' +
      '.ktp-pic svg{width:34mm;height:auto}table{border-collapse:collapse;width:100%;font-size:11pt}' +
      'th,td{border:1px solid #444;padding:1.5mm 2mm;text-align:center}.ktp-foot{font-size:9.5pt;color:#555;margin-top:4mm}';
    function sheet(label, list) {
      return '<section class="ktp-page"><h1>' + esc(a.title || t('sekolah.lembar-judul-bawaan', 'Lembar soal')) + ' — ' + esc(t('sekolah.lembar-varian', 'Varian {v}', { v: label })) + '</h1>' +
        '<p class="ktp-meta">' + esc((c && c.name) || '') + (guru ? ' · ' + esc(guru) : '') + (a.deadline ? ' · ' + esc(t('sekolah.lembar-tenggat', 'Tenggat {d}', { d: a.deadline })) : '') + ' · ' + esc(t('sekolah.lembar-jumlah', '{n} soal', { n: list.length })) + '</p>' +
        '<div class="ktp-id"><label>' + esc(t('sekolah.lembar-nama', 'Nama')) + '<span></span></label><label>' + esc(t('sekolah.lembar-absen', 'No. absen')) + '<span></span></label><label>' + esc(t('sekolah.lembar-benar', 'Jumlah benar')) + '<span></span></label></div>' +
        '<p class="ktp-meta">' + esc(t('sekolah.lembar-petunjuk', 'Lingkari huruf jawaban yang paling tepat.')) + '</p>' +
        '<ol class="ktp-list">' + list.map(function (p) { return questionHtml(p, env); }).join('') + '</ol>' +
        '<p class="ktp-foot">' + esc(t('sekolah.lembar-kaki', 'Dicetak dari FIEZEL KelasKu. Masukkan jumlah benar di KelasKu → Tugas → Nilai kertas.')) + '</p></section>';
    }
    function keyTable(label, list) {
      return '<h2>' + esc(t('sekolah.kunci-varian', 'Kunci varian {v}', { v: label })) + '</h2><table><tr>' +
        list.map(function (p) { return '<th>' + p.n + '</th>'; }).join('') + '</tr><tr>' +
        list.map(function (p) { return '<td>' + LETTERS[p.key] + '</td>'; }).join('') + '</tr></table>';
    }
    var body = items.length
      ? sheet('A', v.A) + sheet('B', v.B) +
        '<section class="ktp-page"><h1>' + esc(t('sekolah.kunci-judul', 'Kunci jawaban — untuk guru')) + '</h1><p class="ktp-meta">' + esc(a.title || '') + '</p>' + keyTable('A', v.A) + keyTable('B', v.B) + '</section>'
      : '<p>' + esc(t('sekolah.lembar-kosong', 'Tugas ini belum punya soal yang bisa dicetak.')) + '</p>';
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esc(a.title || 'Lembar soal') + '</title><style>' + css + '</style></head><body>' + body + '</body></html>';
  }

  /**
   * Nilai dari kertas: { sid: jumlahBenar }. Murid yang sudah mengerjakan lewat aplikasi TIDAK
   * ditimpa — bukti per soal dari aplikasi lebih kaya daripada satu angka dari kertas.
   * Mengembalikan jumlah murid yang tercatat.
   */
  function recordPaperScores(c, a, scores, now) {
    if (!c || !a || !scores) return 0;
    var total = resolveItems(a).length || (Array.isArray(a.itemIds) ? a.itemIds.length : 0);
    if (!total) return 0;
    var at = Number(now) || Date.now(), n = 0;
    a.done = a.done || {};
    (c.students || []).forEach(function (s) {
      if (!Object.prototype.hasOwnProperty.call(scores, s.id)) return;
      var raw = scores[s.id];
      if (raw === '' || raw == null) return;
      var benar = Math.round(Number(raw));
      if (!isFinite(benar) || benar < 0 || benar > total) return;
      if (a.done[s.id] && a.done[s.id].src !== 'kertas') return;
      a.done[s.id] = { at: at, acc: benar / total, c: benar, t: total, src: 'kertas' };
      if (a.progress) delete a.progress[s.id];
      n++;
    });
    return n;
  }

  /**
   * Lima soal untuk pemanasan: soal yang paling sering salah di tugas-tugas kelas ini (dari
   * done[sid].w), urut dari yang paling banyak murid salah. Kalau belum ada bukti kesalahan,
   * jatuh ke soal bank dari keterampilan terlemah (`weakSkill`).
   */
  function warmupItems(c, opts, env) {
    var o = opts || {}, max = Math.max(1, Math.min(10, Number(o.count) || 5)), B = bank(env);
    var counts = {}, byId = {};
    (c && c.assignments || []).forEach(function (a) {
      if (a.archivedAt) return;
      var items = resolveItems(a, env);
      items.forEach(function (q) { byId[q.id] = q; });
      Object.keys(a.done || {}).forEach(function (sid) {
        var w = a.done[sid] && a.done[sid].w;
        if (!Array.isArray(w)) return;
        var seen = {};
        w.forEach(function (x) {
          var id = x && (x.i || x.id);
          if (!id || seen[id] || !byId[id]) return;
          seen[id] = true;
          counts[id] = (counts[id] || 0) + 1;
        });
      });
    });
    var ranked = Object.keys(counts).sort(function (x, y) { return counts[y] - counts[x] || (x < y ? -1 : 1); })
      .slice(0, max).map(function (id) { return { item: byId[id], wrong: counts[id], from: 'kesalahan' }; });
    if (ranked.length < max && o.weakSkill && B && typeof B.pickFresh === 'function') {
      var have = {};
      ranked.forEach(function (r) { have[r.item.id] = true; });
      try {
        B.pickFresh(o.weakSkill, max * 2, { seed: Number(o.seed) || 11 }).forEach(function (q) {
          if (ranked.length < max && q && !have[q.id] && q.prompt && Array.isArray(q.options)) { ranked.push({ item: q, wrong: 0, from: 'terlemah' }); have[q.id] = true; }
        });
      } catch (_) {}
    }
    return ranked;
  }

  /** Satu layar pemanasan untuk proyektor (tanpa nama murid). */
  function warmupSlideHtml(list, idx, reveal, env) {
    if (!list || !list.length) {
      return '<div class="ktp-warm is-empty" data-testid="ktp-warm-empty"><p>' + esc(t('sekolah.pemanasan-kosong', 'Belum ada soal untuk pemanasan. Kirim satu tugas dulu, atau pilih keterampilan di Analitik.')) + '</p></div>';
    }
    var i = Math.max(0, Math.min(list.length - 1, Number(idx) || 0)), r = list[i], q = r.item, ans = answerIndex(q);
    var B = bank(env), pic = '';
    try { if (B && typeof B.pictureHtml === 'function') pic = B.pictureHtml(q, 'ktp-warm-pic') || ''; } catch (_) {}
    var why = '';
    if (reveal && q.note) why = '<p class="ktp-warm-why" data-testid="ktp-warm-why">' + esc(q.note) + '</p>';
    return '<div class="ktp-warm" data-testid="ktp-warm" data-idx="' + i + '">' +
      '<p class="ktp-warm-kicker">' + esc(t('sekolah.pemanasan-nomor', 'Pemanasan · soal {i} dari {n}', { i: i + 1, n: list.length })) +
      (r.wrong ? ' · ' + esc(t('sekolah.pemanasan-salah', '{n} teman keliru di soal ini', { n: r.wrong })) : '') + '</p>' +
      (q.context ? '<div class="ktp-warm-ctx">' + esc(q.context) + '</div>' : '') + pic +
      '<h2 class="ktp-warm-prompt">' + esc(q.prompt) + '</h2>' +
      '<ol class="ktp-warm-opts">' + q.options.map(function (o, k) {
        return '<li class="' + (reveal && k === ans ? 'is-key' : '') + '"' + (reveal && k === ans ? ' data-testid="ktp-warm-key"' : '') + '><b>' + LETTERS[k] + '</b> ' + esc(o) + '</li>';
      }).join('') + '</ol>' + why + '</div>';
  }

  /** Buka lembar di jendela baru dan panggil dialog cetak; tanpa jendela, unduh sebagai HTML. */
  function openPrint(html, filename) {
    var w = null;
    try { w = root.open('', '_blank'); } catch (_) { w = null; }
    if (w && w.document) {
      w.document.open(); w.document.write(html); w.document.close();
      try { w.focus(); setTimeout(function () { try { w.print(); } catch (_) {} }, 300); } catch (_) {}
      return true;
    }
    try {
      var blob = new Blob([html], { type: 'text/html' }), url = URL.createObjectURL(blob), aEl = root.document.createElement('a');
      aEl.href = url; aEl.download = (filename || 'lembar-soal') + '.html'; root.document.body.appendChild(aEl); aEl.click(); aEl.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (_) { return false; }
  }

  return {
    resolveItems: resolveItems,
    buildVariants: buildVariants,
    worksheetHtml: worksheetHtml,
    recordPaperScores: recordPaperScores,
    warmupItems: warmupItems,
    warmupSlideHtml: warmupSlideHtml,
    openPrint: openPrint,
    _esc: esc
  };
});
