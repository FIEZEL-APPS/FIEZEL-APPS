/**
 * FIEZEL · ANALISIS BUTIR SOAL (R5, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * BrainCore sudah punya kalibrasi lintas murid tingkat aplikasi (FiezelItemPool, langkah 2),
 * tetapi (1) hanya untuk soal grammar aplikasi utama, dan (2) guru tidak pernah melihatnya.
 * Sementara itu guru diwajibkan menganalisis butir soal ulangannya — tingkat kesukaran, daya
 * beda, dan fungsi pengecoh — biasanya manual di Excel/ANATES. Semua bahannya sudah ada di
 * KelasKu: setiap murid yang mengerjakan lewat aplikasi mengirim soal mana yang salah dan
 * pilihan yang dipilih (`done[sid].w`). Modul ini menghitungnya per tugas.
 *
 * Rumus (standar analisis butir klasik yang dipakai guru Indonesia):
 *   - Tingkat kesukaran  p = benar / menjawab.  > 0,70 mudah · 0,30–0,70 sedang · < 0,30 sukar
 *   - Daya beda          D = p(kelompok atas 27%) − p(kelompok bawah 27%)
 *                        ≥ 0,40 sangat baik · 0,30–0,39 baik · 0,20–0,29 cukup · < 0,20 perlu
 *                        diperbaiki · negatif = kemungkinan kunci salah
 *   - Pengecoh berfungsi bila dipilih ≥ 5% murid yang menjawab.
 *
 * KEJUJURAN
 *   - Hasil dari KERTAS (src:'kertas') hanya punya jumlah benar, tanpa rincian per soal — tidak
 *     dihitung di sini (dicatat sebagai jumlah murid yang dilewati).
 *   - Daya beda butuh ≥ MIN_DAYA_BEDA murid; di bawahnya ditulis "belum cukup murid".
 *
 * Inti MURNI (tanpa DOM, tanpa jaringan). Bahasa Indonesia saja (keputusan owner 2026-10-05).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAnalisisButir = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var MIN_DAYA_BEDA = 10;
  var PENGECOH_MIN = 0.05;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function t(k, fb, params) {
    var s;
    try { var I = root && root.FiezelI18n; s = I && I.t ? I.t(k, params) : undefined; } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) Object.keys(params).forEach(function (p) { s = String(s).split('{' + p + '}').join(String(params[p])); });
    return s;
  }
  function items(a, env) {
    var K = (env && env.kelas) || (root && root.FiezelKelasTanpaHP);
    return K && typeof K.resolveItems === 'function' ? K.resolveItems(a, env) : [];
  }

  function kesukaran(p) { return p == null ? 'kurang-data' : p > 0.7 ? 'mudah' : p >= 0.3 ? 'sedang' : 'sukar'; }
  function dayaBeda(d) {
    if (d == null) return 'kurang-data';
    if (d < 0) return 'terbalik';
    if (d >= 0.4) return 'sangat-baik';
    if (d >= 0.3) return 'baik';
    if (d >= 0.2) return 'cukup';
    return 'perbaiki';
  }
  function rekomendasi(r) {
    /* Tanpa daya beda (murid < MIN_DAYA_BEDA) tidak ada dasar untuk menyatakan soal layak:
       tingkat kesukaran saja tidak membedakan soal yang baik dari soal yang kuncinya keliru. */
    if (r.p == null || r.dayaBeda === 'kurang-data') return 'kurang-data';
    if (r.dayaBeda === 'terbalik') return 'periksa-kunci';
    if (r.dayaBeda === 'perbaiki' || (r.kesukaran !== 'sedang' && r.dayaBeda === 'cukup')) return 'perbaiki';
    if (r.pengecohMati > 0 && r.n >= MIN_DAYA_BEDA) return 'ganti-pengecoh';
    return 'pakai';
  }
  var LABEL = {
    'mudah': ['sekolah.butir-mudah', 'Mudah'], 'sedang': ['sekolah.butir-sedang', 'Sedang'], 'sukar': ['sekolah.butir-sukar', 'Sukar'],
    'sangat-baik': ['sekolah.butir-db-sangat-baik', 'Sangat baik'], 'baik': ['sekolah.butir-db-baik', 'Baik'], 'cukup': ['sekolah.butir-db-cukup', 'Cukup'],
    'perbaiki': ['sekolah.butir-perbaiki', 'Perlu diperbaiki'], 'terbalik': ['sekolah.butir-terbalik', 'Terbalik — periksa kunci'],
    'kurang-data': ['sekolah.butir-kurang-data', 'Belum cukup murid'],
    'pakai': ['sekolah.butir-pakai', 'Layak dipakai lagi'], 'periksa-kunci': ['sekolah.butir-periksa-kunci', 'Periksa kunci jawaban'],
    'ganti-pengecoh': ['sekolah.butir-ganti-pengecoh', 'Ganti pengecoh yang tidak dipilih']
  };
  function label(kode) { var l = LABEL[kode] || LABEL['kurang-data']; return t(l[0], l[1]); }

  /**
   * Analisis satu tugas. Mengembalikan { n, dilewati, rows: [...] }.
   * Murid dihitung bila hasilnya dari aplikasi (punya w[] atau t > 0 tanpa src kertas).
   */
  function analisis(c, a, env) {
    var list = items(a, env), done = (a && a.done) || {}, peserta = [], kertas = 0, tanpaRincian = 0;
    Object.keys(done).forEach(function (sid) {
      var d = done[sid];
      if (!d) return;
      if (d.src === 'kertas') { kertas++; return; }
      /* Laporan murid hanya membawa `w` (soal yang salah) bila ADA yang salah — murid yang benar
         semua datang tanpa `w`. Mereka bukan "tanpa rincian": rinciannya justru lengkap, kosong.
         (Temuan role play guru 2026-10-05: murid bernilai sempurna terbuang dari analisis dan
         disebut "nilai kertas".) */
      var w = Array.isArray(d.w) ? d.w : (Number(d.t) > 0 && Number(d.c) === Number(d.t) ? [] : null);
      if (!w) { tanpaRincian++; return; }
      var salah = {};
      w.forEach(function (x) { var id = x && (x.i || x.id); if (id) salah[id] = (x.o == null ? -1 : Number(x.o)); });
      var benar = list.filter(function (q) { return !Object.prototype.hasOwnProperty.call(salah, q.id); }).length;
      peserta.push({ sid: sid, salah: salah, skor: typeof d.c === 'number' ? d.c : benar });
    });
    var n = peserta.length;
    var urut = peserta.slice().sort(function (x, y) { return y.skor - x.skor || (x.sid < y.sid ? -1 : 1); });
    var g = n >= MIN_DAYA_BEDA ? Math.max(1, Math.round(n * 0.27)) : 0;
    var atas = urut.slice(0, g), bawah = g ? urut.slice(n - g) : [];
    function pBenar(grup, id) {
      if (!grup.length) return null;
      return grup.filter(function (s) { return !Object.prototype.hasOwnProperty.call(s.salah, id); }).length / grup.length;
    }
    var rows = list.map(function (q, i) {
      var p = n ? pBenar(peserta, q.id) : null;
      var d = g ? pBenar(atas, q.id) - pBenar(bawah, q.id) : null;
      var ans = typeof q.answer === 'number' ? q.answer : q.options.indexOf(q.answer);
      var pilih = q.options.map(function () { return 0; });
      peserta.forEach(function (s) {
        if (Object.prototype.hasOwnProperty.call(s.salah, q.id)) { var o = s.salah[q.id]; if (o >= 0 && o < pilih.length) pilih[o]++; }
        else if (ans >= 0) pilih[ans]++;
      });
      var pengecoh = q.options.map(function (_, k) {
        return { huruf: LETTERS[k], kunci: k === ans, dipilih: pilih[k], porsi: n ? pilih[k] / n : 0, berfungsi: k === ans ? null : (n ? pilih[k] / n >= PENGECOH_MIN : null) };
      });
      var row = {
        no: i + 1, id: q.id, prompt: q.prompt, n: n,
        p: p == null ? null : Math.round(p * 100) / 100,
        d: d == null ? null : Math.round(d * 100) / 100,
        kesukaran: kesukaran(p), dayaBeda: dayaBeda(d),
        pengecoh: pengecoh,
        pengecohMati: pengecoh.filter(function (x) { return x.berfungsi === false; }).length
      };
      row.rekomendasi = rekomendasi(row);
      return row;
    });
    return { n: n, dilewati: kertas + tanpaRincian, kertas: kertas, tanpaRincian: tanpaRincian, kelompok: g, rows: rows };
  }

  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  function csv(hasil) {
    var head = ['No', 'Soal', 'Menjawab', 'Tingkat kesukaran (p)', 'Kategori', 'Daya beda (D)', 'Kategori daya beda', 'Pengecoh tidak berfungsi', 'Rekomendasi'];
    var rows = (hasil.rows || []).map(function (r) {
      return [r.no, r.prompt, r.n, r.p == null ? '' : r.p, label(r.kesukaran), r.d == null ? '' : r.d, label(r.dayaBeda),
        r.pengecoh.filter(function (x) { return x.berfungsi === false; }).map(function (x) { return x.huruf; }).join(' '), label(r.rekomendasi)];
    });
    return [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\n');
  }

  return { MIN_DAYA_BEDA: MIN_DAYA_BEDA, PENGECOH_MIN: PENGECOH_MIN, kesukaran: kesukaran, dayaBeda: dayaBeda, analisis: analisis, label: label, csv: csv };
});
