/**
 * FIEZEL · RAPOR KKTP (R2, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Rekap KelasKu dulu menulis "Status (KKM 75)". Kurikulum Merdeka tidak memakai KKM lagi;
 * yang dipakai adalah Kriteria Ketercapaian Tujuan Pembelajaran (KKTP), dan rapor menuntut
 * DESKRIPSI capaian per murid — kalimat yang selama ini guru ketik satu per satu, 30 kali per
 * kelas, setiap akhir semester. Modul ini menyusunnya dari bukti yang sudah ada:
 *
 *   - Tujuan pembelajaran (TP) = keterampilan yang benar-benar dilatih kelas, dengan rumusan
 *     tujuan dari bank soal (`FiezelReviewBank.SKILLS[k].objective`).
 *   - KKTP diatur guru per kelas (`c.kktp`, bawaan 75%) — bukan konstanta di kode.
 *   - Tingkat ketercapaian per TP memakai interval yang lazim di Kurikulum Merdeka, digeser
 *     mengikuti KKTP: Perlu bimbingan · Mulai berkembang · Tercapai · Mahir.
 *   - TP dengan bukti < MIN_BUKTI jawaban TIDAK diberi tingkat. Ia ditulis "belum cukup data",
 *     karena deskripsi rapor adalah dokumen resmi dan tidak boleh lahir dari dua soal.
 *
 * Inti modul ini MURNI (tanpa DOM, tanpa jaringan). Guru tetap pemilik kalimat akhirnya:
 * deskripsi muncul di kotak yang bisa disunting sebelum disalin ke e-Rapor.
 * Bahasa Indonesia saja (keputusan owner 2026-10-05).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelRaporKKTP = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var KKTP_BAWAAN = 0.75;
  var MIN_BUKTI = 5;

  function t(k, fb, params) {
    var s;
    try { var I = root && root.FiezelI18n; s = I && I.t ? I.t(k, params) : undefined; } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) Object.keys(params).forEach(function (p) { s = String(s).split('{' + p + '}').join(String(params[p])); });
    return s;
  }
  function bank(env) { return (env && env.bank) || (root && root.FiezelReviewBank) || null; }

  /** KKTP kelas dalam pecahan 0..1, dibatasi 0,50–0,95. */
  function kktpOf(c) {
    var v = Number(c && c.kktp);
    if (!isFinite(v) || v <= 0) return KKTP_BAWAAN;
    if (v > 1) v = v / 100;
    return Math.max(0.5, Math.min(0.95, v));
  }
  function setKktp(c, persen) {
    var v = Number(persen);
    if (!c || !isFinite(v)) return kktpOf(c);
    c.kktp = Math.max(50, Math.min(95, Math.round(v))) / 100;
    return c.kktp;
  }

  /** Tingkat ketercapaian relatif terhadap KKTP. */
  function tingkat(acc, kktp) {
    if (acc == null) return 'kurang-data';
    var k = kktp == null ? KKTP_BAWAAN : kktp;
    if (acc < k - 0.15) return 'perlu-bimbingan';
    if (acc < k) return 'mulai-berkembang';
    if (acc < Math.min(0.97, k + 0.15)) return 'tercapai';
    return 'mahir';
  }
  var LABEL = {
    'kurang-data': ['sekolah.tingkat-kurang-data', 'Belum cukup data'],
    'perlu-bimbingan': ['sekolah.tingkat-perlu-bimbingan', 'Perlu bimbingan'],
    'mulai-berkembang': ['sekolah.tingkat-mulai-berkembang', 'Mulai berkembang'],
    'tercapai': ['sekolah.tingkat-tercapai', 'Tercapai'],
    'mahir': ['sekolah.tingkat-mahir', 'Mahir']
  };
  function labelTingkat(kode) { var l = LABEL[kode] || LABEL['kurang-data']; return t(l[0], l[1]); }

  /** Rumusan TP untuk sebuah keterampilan: tujuan dari bank, atau label keterampilan. */
  function rumusanTP(skill, env) {
    var B = bank(env), sk = B && B.SKILLS && B.SKILLS[skill];
    if (sk && sk.objective) return sk.objective;
    return String(skill || '').replace(/[_-]+/g, ' ');
  }
  function labelTP(skill, env) {
    var B = bank(env), sk = B && B.SKILLS && B.SKILLS[skill];
    return (sk && (sk.short || sk.label)) || String(skill || '').replace(/[_-]+/g, ' ');
  }

  /** TP kelas: keterampilan yang punya bukti pada minimal satu murid, urut stabil. */
  function daftarTP(c) {
    var seen = {}, out = [];
    (c && c.students || []).forEach(function (s) {
      (s.results || []).forEach(function (r) { if (r && r.skill && r.total > 0 && !seen[r.skill]) { seen[r.skill] = true; out.push(r.skill); } });
    });
    return out.sort();
  }

  /** Baris rapor satu murid: per TP {skill, acc, n, tingkat} + nilai akhir. */
  function raporMurid(c, s, env) {
    var kktp = kktpOf(c), per = {};
    (s.results || []).forEach(function (r) {
      if (!r || !r.skill) return;
      var p = per[r.skill] || (per[r.skill] = { c: 0, n: 0 });
      p.c += Number(r.correct) || 0; p.n += Number(r.total) || 0;
    });
    var rows = daftarTP(c).map(function (k) {
      var p = per[k] || { c: 0, n: 0 };
      var cukup = p.n >= MIN_BUKTI;
      var acc = p.n ? p.c / p.n : null;
      return { skill: k, label: labelTP(k, env), tp: rumusanTP(k, env), acc: cukup ? acc : null, n: p.n, tingkat: tingkat(cukup ? acc : null, kktp) };
    });
    var dinilai = rows.filter(function (r) { return r.acc != null; });
    var nilai = dinilai.length ? Math.round(dinilai.reduce(function (x, r) { return x + r.acc; }, 0) / dinilai.length * 100) : null;
    return { s: s, kktp: kktp, rows: rows, nilai: nilai, tuntas: nilai == null ? null : nilai >= Math.round(kktp * 100) };
  }

  function kecilkanAwal(str) { str = String(str || '').replace(/\.\s*$/, ''); return str.charAt(0).toLowerCase() + str.slice(1); }
  function gabung(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' ' + t('sekolah.dan', 'dan') + ' ' + list[list.length - 1];
  }

  /**
   * Dua kalimat ala e-Rapor Kurikulum Merdeka: capaian tertinggi dan capaian yang perlu
   * ditingkatkan. Masing-masing memakai paling banyak dua TP supaya kalimatnya tetap terbaca.
   */
  function deskripsi(rapor) {
    var nama = (rapor && rapor.s && rapor.s.name) || t('umum.murid', 'Murid');
    var dinilai = (rapor.rows || []).filter(function (r) { return r.acc != null; });
    if (!dinilai.length) return { tinggi: t('sekolah.deskripsi-kurang-data', '{nama} belum memiliki cukup bukti belajar untuk dideskripsikan.', { nama: nama }), rendah: '' };
    var urut = dinilai.slice().sort(function (a, b) { return b.acc - a.acc || (a.skill < b.skill ? -1 : 1); });
    var baik = urut.filter(function (r) { return r.tingkat === 'tercapai' || r.tingkat === 'mahir'; }).slice(0, 2);
    var kurang = urut.slice().reverse().filter(function (r) { return r.tingkat === 'perlu-bimbingan' || r.tingkat === 'mulai-berkembang'; }).slice(0, 2);
    var tinggi = baik.length
      ? t('sekolah.deskripsi-tinggi', 'Ananda {nama} menunjukkan penguasaan yang baik dalam {tp}.', { nama: nama, tp: gabung(baik.map(function (r) { return kecilkanAwal(r.tp); })) })
      : t('sekolah.deskripsi-tinggi-belum', 'Ananda {nama} sedang berproses dan belum mencapai kriteria pada tujuan pembelajaran yang diukur.', { nama: nama });
    var rendah = kurang.length
      ? t('sekolah.deskripsi-rendah', 'Ananda {nama} perlu bimbingan dalam {tp}.', { nama: nama, tp: gabung(kurang.map(function (r) { return kecilkanAwal(r.tp); })) })
      : t('sekolah.deskripsi-rendah-tidak-ada', 'Ananda {nama} telah mencapai kriteria pada seluruh tujuan pembelajaran yang diukur.', { nama: nama });
    return { tinggi: tinggi, rendah: rendah };
  }

  function raporKelas(c, env) {
    return (c && c.students || []).map(function (s) { var r = raporMurid(c, s, env); r.deskripsi = deskripsi(r); return r; });
  }

  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  /** CSV siap tempel ke e-Rapor: satu baris per murid. Deskripsi yang sudah disunting guru menang. */
  function csvRapor(c, edits, env) {
    var head = ['No', 'Nama', 'Nilai Akhir', 'Status KKTP ' + Math.round(kktpOf(c) * 100) + '%', 'Capaian Kompetensi (tertinggi)', 'Capaian Kompetensi (perlu ditingkatkan)'];
    var rows = raporKelas(c, env).map(function (r, i) {
      var e = (edits && edits[r.s.id]) || {};
      return [i + 1, r.s.name, r.nilai == null ? '' : r.nilai, r.tuntas == null ? t('sekolah.tingkat-kurang-data', 'Belum cukup data') : (r.tuntas ? t('sekolah.status-tercapai', 'Tercapai') : t('sekolah.status-belum-tercapai', 'Belum tercapai')), e.tinggi != null ? e.tinggi : r.deskripsi.tinggi, e.rendah != null ? e.rendah : r.deskripsi.rendah];
    });
    return [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\n');
  }

  return {
    KKTP_BAWAAN: KKTP_BAWAAN,
    MIN_BUKTI: MIN_BUKTI,
    kktpOf: kktpOf,
    setKktp: setKktp,
    tingkat: tingkat,
    labelTingkat: labelTingkat,
    daftarTP: daftarTP,
    raporMurid: raporMurid,
    deskripsi: deskripsi,
    raporKelas: raporKelas,
    csvRapor: csvRapor
  };
});
