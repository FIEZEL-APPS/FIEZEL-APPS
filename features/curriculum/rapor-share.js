/* FIEZEL — Rapor kompetensi untuk orang tua (F7, m025-351).
   ==========================================================================
   Modul bersama kurikulum.html (guru) dan misi.html (murid): DUA halaman merender
   DOKUMEN YANG SAMA dari fungsi yang sama. "Versi murid dari dokumen yang sama"
   (audit F7) dijamin secara struktural — bukan dengan menyalin kode, melainkan
   dengan memakai modul ini di kedua sisi.

   Keputusan owner F7: format = Kartu Gambar PNG via Canvas + Cetak/PDF via
   window.print yang ramah HP; render = sisi KLIEN (hemat server, lokal-dulu).
   Tidak ada endpoint baru, tidak ada upload: gambar dibuat di perangkat dan
   langsung diunduh; cetak memakai dialog cetak peramban (Simpan sebagai PDF).

   Kejujuran yang dijaga modul ini (kontrak handoff):
   - Keadaan kosong tidak dikarang: tanpa rows, kartu berkata belum ada evidence;
     KPI yang datanya tidak ada tertulis '–', bukan 0.
   - Setiap naskah lahir dwibahasa: semua kalimat lewat t() dengan pasangan
     copy-id-kurikulum.js + copy-th-kurikulum.js. Halaman konsol/misi memang belum
     memuat lapisan i18n (lihat fz-api.js), jadi yang terlihat hari ini kalimat
     cadangan Indonesia — dan kunci Thai-nya sudah menunggu di copy-map. */
(function (root) {
  'use strict';

  function t(kunci, cadangan) {
    var s;
    try { var I = root.FiezelI18n; s = I && I.t ? I.t(kunci) : undefined; } catch (_) {}
    return (s === undefined || s === kunci) ? cadangan : s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function localeAktif() {
    try { var I = root.FiezelI18n; return (I && I.getLocale && I.getLocale() === 'th') ? 'th-TH' : 'id-ID'; }
    catch (_) { return 'id-ID'; }
  }

  function hariIni() {
    try { return new Date().toLocaleDateString(localeAktif(), { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (_) { return String(new Date().toISOString().slice(0, 10)); }
  }

  /* Narasi draf e-Rapor: logika yang SAMA yang dipakai teacher-console.js.
     Konsol memanggil builder ini supaya draf guru dan dokumen murid tidak
     pernah menyimpang diam-diam. */
  function narrative(namaSiswa, rows, misconceptions) {
    var sName = namaSiswa || t('kurikulum.rapor-anon', 'Murid');
    var mastered = (rows || []).filter(function (r) { return r.mastery_pct >= 70; });
    var developing = (rows || []).filter(function (r) { return r.mastery_pct < 70; });
    var parts = [];
    if (mastered.length) {
      var topM = mastered.slice(0, 2).map(function (m) { return m.tp_name || m.tp_code; }).join(' ' + t('kurikulum.rapor-dan', 'dan') + ' ');
      parts.push(t('kurikulum.rapor-mastered-pre', 'Ananda ') + sName + t('kurikulum.rapor-mastered-post', ' menunjukkan penguasaan yang sangat baik dalam ') + topM + '.');
    } else {
      parts.push(t('kurikulum.rapor-aktif-pre', 'Ananda ') + sName + t('kurikulum.rapor-aktif-post', ' telah aktif mengikuti seluruh proses pembelajaran materi ini.'));
    }
    if (developing.length) {
      var topD = developing.slice(0, 2).map(function (d) { return d.tp_name || d.tp_code; }).join(' ' + t('kurikulum.rapor-serta', 'serta') + ' ');
      parts.push(t('kurikulum.rapor-dev-text', 'Perlu bimbingan lebih lanjut dan latihan teratur dalam ') + topD + '.');
    } else {
      parts.push(t('kurikulum.rapor-pertahankan', 'Diharapkan dapat mempertahankan ritme belajar dan mengeksplorasi materi pengayaan lebih lanjut.'));
    }
    if (misconceptions && misconceptions.length) {
      parts.push(t('kurikulum.rapor-mis-pre', 'Catatan guru: perhatikan penguatan konsep pada ') + misconceptions[0].misconception_id + '.');
    }
    return parts.join(' ');
  }

  /* Normalisasi payload paspor (guru: /braincore/passport/:sid, murid:
     /learning/passport) menjadi dokumen rapor. Field yang tidak ada DIHILANGKAN
     dari dokumen — tidak diisi karangan. null hanya bila tidak ada payload. */
  function ringkas(masuk) {
    if (!masuk) return null;
    return {
      nama: masuk.nama || null,
      kelas: masuk.kelas || null,
      mapel: masuk.mapel || null,
      tanggal: masuk.tanggal || hariIni(),
      totals: masuk.totals || null,
      rows: masuk.rows || [],
      narasi: masuk.narasi || null
    };
  }

  function angka(v) { return (v === undefined || v === null || v === '') ? '–' : v; }

  function statusKata(pct) {
    return pct >= 70 ? t('kurikulum.rapor-kuat', 'Kuat')
      : pct >= 40 ? t('kurikulum.rapor-berkembang', 'Berkembang')
      : t('kurikulum.rapor-awal', 'Awal');
  }

  function metaBaris(d) {
    return [d.kelas, d.mapel, d.tanggal].filter(function (x) { return !!x; }).join(' · ');
  }

  /* ---------------- Kartu Gambar (Canvas → PNG) ---------------- */

  function bungkusTeks(ctx, teks, lebarMax) {
    var kata = String(teks || '').split(/\s+/), baris = [], jalan = '';
    for (var i = 0; i < kata.length; i++) {
      var coba = jalan ? jalan + ' ' + kata[i] : kata[i];
      if (ctx.measureText(coba).width > lebarMax && jalan) { baris.push(jalan); jalan = kata[i]; }
      else jalan = coba;
    }
    if (jalan) baris.push(jalan);
    return baris.length ? baris : [''];
  }

  function potongSatu(ctx, teks, lebarMax) {
    var s = String(teks || '');
    if (ctx.measureText(s).width <= lebarMax) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > lebarMax) s = s.slice(0, -1);
    return s + '…';
  }

  var W = 1080, PAD = 72;
  var WARNA = {
    kertas: '#ffffff', tinta: '#122019', redup: '#5f7268', garis: '#dde6e0',
    kepala: '#0d1411', aksen: '#c9f24e', kotak: '#f2f5f1',
    baik: '#1d7a4c', sedang: '#b97a1a', kurang: '#c04545'
  };

  function warnaPct(pct) { return pct >= 70 ? WARNA.baik : pct >= 40 ? WARNA.sedang : WARNA.kurang; }

  /* Menggambar kartu ke kanvas (kanvas diukur ulang mengikuti isi). Mengembalikan
     tinggi akhir supaya pemanggil yang menyimpan tahu gambarnya utuh. */
  function gambarKartu(canvas, d) {
    if (!canvas || !canvas.getContext || !d) return 0;
    var ctx = canvas.getContext('2d');
    var nama = d.nama || t('kurikulum.rapor-anon', 'Murid');
    var rows = d.rows || [];

    ctx.font = '32px Outfit, system-ui, sans-serif';
    var barisNarasi = d.narasi ? bungkusTeks(ctx, d.narasi, W - PAD * 2 - 72) : [];

    var H = 300 + 48 + 150 + 56 + rows.length * 150 + 56;
    H += d.narasi ? (48 + barisNarasi.length * 46 + 48) : 150;
    H += 130;
    canvas.width = W; canvas.height = H;

    var y = 0, x, i, r;
    ctx.fillStyle = WARNA.kertas; ctx.fillRect(0, 0, W, H);

    /* Kepala */
    ctx.fillStyle = WARNA.kepala; ctx.fillRect(0, 0, W, 300);
    ctx.fillStyle = WARNA.aksen; ctx.font = '600 30px Outfit, system-ui, sans-serif';
    ctx.fillText('FIEZEL · Learning Passport', PAD, 78);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 64px Outfit, Georgia, serif';
    ctx.fillText(potongSatu(ctx, t('kurikulum.rapor-doc-title', 'Rapor Kompetensi'), W - PAD * 2), PAD, 156);
    ctx.font = '600 50px Outfit, system-ui, sans-serif';
    ctx.fillText(potongSatu(ctx, nama, W - PAD * 2), PAD, 222);
    var meta = metaBaris(d);
    if (meta) { ctx.fillStyle = '#9db3a7'; ctx.font = '32px Outfit, system-ui, sans-serif'; ctx.fillText(potongSatu(ctx, meta, W - PAD * 2), PAD, 268); }
    y = 300 + 48;

    /* KPI */
    var labels = [
      t('kurikulum.rapor-kpi-komp', 'Kompetensi'), t('kurikulum.rapor-kpi-kuasai', 'Dikuasai'),
      t('kurikulum.rapor-kpi-tahan', 'Bertahan'), t('kurikulum.rapor-kpi-trans', 'Diterapkan')
    ];
    var vals = d.totals ? [d.totals.competencies, d.totals.mastered, d.totals.retained, d.totals.transferred] : [null, null, null, null];
    var bw = (W - PAD * 2 - 3 * 24) / 4;
    for (i = 0; i < 4; i++) {
      x = PAD + i * (bw + 24);
      ctx.fillStyle = WARNA.kotak;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, 150, 22); else ctx.rect(x, y, bw, 150);
      ctx.fill();
      ctx.fillStyle = WARNA.tinta; ctx.font = '700 58px Outfit, system-ui, sans-serif';
      ctx.fillText(String(angka(vals[i])), x + 28, y + 78);
      ctx.fillStyle = WARNA.redup; ctx.font = '28px Outfit, system-ui, sans-serif';
      ctx.fillText(potongSatu(ctx, labels[i], bw - 56), x + 28, y + 120);
    }
    y += 150 + 56;

    /* Baris per TP, atau keadaan kosong yang jujur */
    if (!rows.length) {
      ctx.fillStyle = WARNA.kotak;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(PAD, y, W - PAD * 2, 150 - 56, 22); else ctx.rect(PAD, y, W - PAD * 2, 150 - 56);
      ctx.fill();
      ctx.fillStyle = WARNA.redup; ctx.font = '32px Outfit, system-ui, sans-serif';
      var kosong = bungkusTeks(ctx, t('kurikulum.rapor-tanpa-bukti', 'Belum ada evidence tercatat — mulai satu misi dan paspor akan terisi.'), W - PAD * 2 - 72);
      for (i = 0; i < kosong.length && i < 2; i++) ctx.fillText(kosong[i], PAD + 36, y + 48 + i * 44);
      y += 150;
    }
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      var pct = (r.mastery_pct === undefined || r.mastery_pct === null) ? null : r.mastery_pct;
      ctx.fillStyle = WARNA.tinta; ctx.font = '700 34px Outfit, system-ui, sans-serif';
      ctx.fillText(potongSatu(ctx, r.tp_code || '-', 560), PAD, y + 40);
      ctx.font = '600 34px Outfit, system-ui, sans-serif';
      var kanan = (pct === null ? '–' : pct + '% · ' + statusKata(pct));
      ctx.fillText(kanan, W - PAD - ctx.measureText(kanan).width, y + 40);
      ctx.fillStyle = WARNA.garis; ctx.fillRect(PAD, y + 62, W - PAD * 2, 22);
      if (pct !== null) { ctx.fillStyle = warnaPct(pct); ctx.fillRect(PAD, y + 62, (W - PAD * 2) * Math.max(0, Math.min(100, pct)) / 100, 22); }
      ctx.fillStyle = WARNA.redup; ctx.font = '30px Outfit, system-ui, sans-serif';
      ctx.fillText(potongSatu(ctx, r.tp_name || '', W - PAD * 2), PAD, y + 128);
      y += 150;
    }
    y += 8;

    /* Narasi */
    if (d.narasi) {
      var boxH = 48 + barisNarasi.length * 46 + 48 - 20;
      ctx.fillStyle = WARNA.kotak;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(PAD, y, W - PAD * 2, boxH, 22); else ctx.rect(PAD, y, W - PAD * 2, boxH);
      ctx.fill();
      ctx.fillStyle = WARNA.tinta; ctx.font = '32px Outfit, system-ui, sans-serif';
      for (i = 0; i < barisNarasi.length; i++) ctx.fillText(barisNarasi[i], PAD + 36, y + 48 + i * 46);
      y += boxH + 48;
    }

    /* Kaki */
    ctx.fillStyle = WARNA.redup; ctx.font = '28px Outfit, system-ui, sans-serif';
    var kaki = t('kurikulum.rapor-kaki', 'Dokumen ini merangkum evidence belajar yang tercatat — bukan nilai karangan.') + ' · FIEZEL';
    var kakiBaris = bungkusTeks(ctx, kaki, W - PAD * 2);
    for (i = 0; i < kakiBaris.length; i++) {
      var lw = ctx.measureText(kakiBaris[i]).width;
      ctx.fillText(kakiBaris[i], PAD + (W - PAD * 2 - lw) / 2, y + 20 + i * 40);
    }
    return H;
  }

  function namaBerkas(nama) {
    var s = String(nama || 'murid').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'rapor-' + (s || 'murid') + '.png';
  }

  /* Mengunduh PNG lewat elemen <a> sementara. true bila gambar jadi. */
  function unduhPNG(d, namaEksplisit) {
    try {
      if (!d || !document.createElement) return false;
      var c = document.createElement('canvas');
      if (!gambarKartu(c, d)) return false;
      var a = document.createElement('a');
      a.download = namaEksplisit || namaBerkas(d.nama);
      a.href = c.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
      return true;
    } catch (_) { return false; }
  }

  /* ---------------- Dokumen cetak (window.print → PDF) ---------------- */

  function kartuHTML(d) {
    var nama = esc(d.nama || t('kurikulum.rapor-anon', 'Murid'));
    var meta = esc(metaBaris(d));
    var labels = [
      t('kurikulum.rapor-kpi-komp', 'Kompetensi'), t('kurikulum.rapor-kpi-kuasai', 'Dikuasai'),
      t('kurikulum.rapor-kpi-tahan', 'Bertahan'), t('kurikulum.rapor-kpi-trans', 'Diterapkan')
    ];
    var vals = d.totals ? [d.totals.competencies, d.totals.mastered, d.totals.retained, d.totals.transferred] : [null, null, null, null];
    var kpi = labels.map(function (lb, i) {
      return '<div style="flex:1;border:1px solid #dde6e0;border-radius:10px;padding:10px 12px">' +
        '<div style="font-size:22px;font-weight:700">' + esc(angka(vals[i])) + '</div>' +
        '<div style="font-size:12px;color:#5f7268">' + esc(lb) + '</div></div>';
    }).join('');
    var isi;
    if (!(d.rows || []).length) {
      isi = '<p style="color:#5f7268">' + esc(t('kurikulum.rapor-tanpa-bukti', 'Belum ada evidence tercatat — mulai satu misi dan paspor akan terisi.')) + '</p>';
    } else {
      isi = d.rows.map(function (r) {
        var pct = (r.mastery_pct === undefined || r.mastery_pct === null) ? null : r.mastery_pct;
        var w = pct === null ? 0 : Math.max(0, Math.min(100, pct));
        var wc = pct === null ? '#dde6e0' : pct >= 70 ? '#1d7a4c' : pct >= 40 ? '#b97a1a' : '#c04545';
        return '<div style="border-top:1px solid #dde6e0;padding:8px 0">' +
          '<div style="display:flex;justify-content:space-between;font-weight:700"><span>' + esc(r.tp_code || '-') + '</span>' +
          '<span>' + esc(pct === null ? '–' : pct + '% · ' + statusKata(pct)) + '</span></div>' +
          '<div style="background:#eef3f0;border-radius:6px;height:10px;margin:6px 0">' +
          '<div style="background:' + wc + ';height:10px;border-radius:6px;width:' + w + '%"></div></div>' +
          '<div style="font-size:13px;color:#5f7268">' + esc(r.tp_name || '') + '</div></div>';
      }).join('');
    }
    return '<div data-testid="rapor-doc" style="font-family:Outfit,system-ui,sans-serif;color:#122019;max-width:720px;margin:0 auto">' +
      '<p style="letter-spacing:2px;font-size:12px;color:#5f7268;margin:0">FIEZEL · Learning Passport</p>' +
      '<h1 style="margin:4px 0">' + esc(t('kurikulum.rapor-doc-title', 'Rapor Kompetensi')) + '</h1>' +
      '<h2 style="margin:0 0 4px">' + nama + '</h2>' +
      (meta ? '<p style="color:#5f7268;margin:0 0 12px">' + meta + '</p>' : '') +
      '<div style="display:flex;gap:10px;margin:12px 0">' + kpi + '</div>' + isi +
      (d.narasi ? '<div style="background:#f2f5f1;border-radius:10px;padding:12px 14px;margin-top:12px;font-size:14px;line-height:1.6">' + esc(d.narasi) + '</div>' : '') +
      '<p style="text-align:center;color:#5f7268;font-size:12px;margin-top:16px">' +
      esc(t('kurikulum.rapor-kaki', 'Dokumen ini merangkum evidence belajar yang tercatat — bukan nilai karangan.')) + ' · FIEZEL</p></div>';
  }

  /* Gaya cetak disuntik sekali dari sini supaya berlaku di KEDUA halaman tanpa
     bergantung pada berkas CSS mana pun: saat dialog cetak terbuka, seluruh isi
     <body> disembunyikan kecuali akar dokumen rapor. */
  var CSS_CETAK =
    '<style id="fiezel-rapor-print-css">@media screen{#rapor-print-root{display:none}}' +
    '@media print{body>*:not(#rapor-print-root){display:none!important}' +
    '#rapor-print-root{display:block!important;padding:8px}' +
    '.rapor-no-print{display:none!important}}</style>';

  function pastikanCssCetak() {
    try {
      if (document.getElementById && document.getElementById('fiezel-rapor-print-css')) return true;
      if (!document.head || !document.head.insertAdjacentHTML) return false;
      document.head.insertAdjacentHTML('beforeend', CSS_CETAK);
      return true;
    } catch (_) { return false; }
  }

  /* Mengisi akar cetak lalu membuka dialog cetak peramban (Simpan sebagai PDF).
     Mengembalikan true bila dialog berhasil dibuka. */
  function cetak(d) {
    try {
      if (!d || !document.body) return false;
      pastikanCssCetak();
      var akar = document.getElementById('rapor-print-root');
      if (!akar) {
        akar = document.createElement('div');
        akar.id = 'rapor-print-root';
        document.body.appendChild(akar);
      }
      akar.innerHTML = kartuHTML(d);
      (root.print || window.print).call(root);
      return true;
    } catch (_) { return false; }
  }

  root.FiezelRaporShare = {
    t: t, esc: esc, hariIni: hariIni, narrative: narrative, ringkas: ringkas,
    gambarKartu: gambarKartu, kartuHTML: kartuHTML,
    unduhPNG: unduhPNG, cetak: cetak, namaBerkas: namaBerkas
  };
})(window);
