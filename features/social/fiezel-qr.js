/**
 * FIEZEL — features/social/fiezel-qr.js · generator Kode QR SVG murni (SLOT 7 sosial).
 *
 * KENAPA MENULIS SENDIRI, bukan memakai pustaka pihak ketiga:
 *   Brief fitur pertemanan meminta Kode QR profil yang bisa langsung dipindai kamera
 *   ponsel teman, dengan "generator Kode QR SVG ringan murni (tanpa pustaka pihak ketiga
 *   yang berat)". Repo ini memang menyimpan qrcode.min.js (19 KB) untuk halaman drop dan
 *   sentinel, tetapi menyeretnya ke shell murid berarti menambah ~20 KB pada setiap unduhan
 *   hanya untuk satu modal. Berkas ini mengimplementasikan standar ISO/IEC 18004 sendiri:
 *   mode byte, level koreksi galat L/M/Q/H, dan versi 1 sampai 10 (cukup untuk URL undangan
 *   pertemanan yang paling panjang). Keluarannya SATU string SVG, tanpa DOM, tanpa jaringan.
 *
 * KEBENARAN, BUKAN TEBAKAN:
 *   Uji kontrak (tests/friend-qr-contract-test.js) membandingkan matriks modul di sini,
 *   modul demi modul, dengan matriks yang dihasilkan qrcode.min.js pihak ketiga yang sudah
 *   terbukti benar di repo ini. Jadi "murni" tidak berarti "tidak terverifikasi".
 *
 * Modul mandiri: tidak menyentuh state app.js, tidak melempar ke pemanggil (semua pemanggil
 * di app.js membacanya di belakang try/catch), aman di Node tanpa DOM.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- aritmetika GF(256)
  // Polinomial primitif 0x11D (x^8 + x^4 + x^3 + x^2 + 1), standar QR.
  var EXP = new Array(256), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (var j = 255; j < 256; j++) EXP[j] = EXP[j - 255];
  })();
  function gexp(n) { while (n < 0) n += 255; while (n >= 255) n -= 255; return EXP[n]; }
  function glog(n) { if (n < 1) throw new Error('FiezelQr glog(' + n + ')'); return LOG[n]; }
  function polyMul(a, b) {
    var r = new Array(a.length + b.length - 1);
    for (var i = 0; i < r.length; i++) r[i] = 0;
    for (var p = 0; p < a.length; p++) for (var q = 0; q < b.length; q++) r[p + q] ^= gexp(glog(a[p]) + glog(b[q]));
    return r;
  }
  function generatorPoly(degree) {
    var g = [1];
    for (var i = 0; i < degree; i++) g = polyMul(g, [1, gexp(i)]);
    return g;
  }
  /** Sisa pembagian (kode Reed-Solomon) untuk satu blok data. */
  function ecBytes(data, ecLen) {
    var gen = generatorPoly(ecLen);
    var buf = data.slice();
    for (var z = 0; z < ecLen; z++) buf.push(0);
    for (var i = 0; i < data.length; i++) {
      var coef = buf[i];
      if (coef === 0) continue;
      var lc = glog(coef);
      for (var j = 0; j < gen.length; j++) buf[i + j] ^= gexp(glog(gen[j]) + lc);
    }
    return buf.slice(data.length);
  }

  // ---------------------------------------------------------------- tabel standar
  /* Blok RS untuk versi 1..10 (urutan field: jumlah blok, total codeword, data codeword).
     Sumber: ISO/IEC 18004 Tabel 9 (tabel yang sama dipakai pustaka QR mana pun). */
  var RS_BLOCKS = [
    { L: [1, 26, 19], M: [1, 26, 16], Q: [1, 26, 13], H: [1, 26, 9] },
    { L: [1, 44, 34], M: [1, 44, 28], Q: [1, 44, 22], H: [1, 44, 16] },
    { L: [1, 70, 55], M: [1, 70, 44], Q: [2, 35, 17], H: [2, 35, 13] },
    { L: [1, 100, 80], M: [2, 50, 32], Q: [2, 50, 24], H: [4, 25, 9] },
    { L: [1, 134, 108], M: [2, 67, 43], Q: [2, 33, 15, 2, 34, 16], H: [2, 33, 11, 2, 34, 12] },
    { L: [2, 86, 68], M: [4, 43, 27], Q: [4, 43, 19], H: [4, 43, 15] },
    { L: [2, 98, 78], M: [4, 49, 31], Q: [2, 32, 14, 4, 33, 15], H: [4, 39, 13, 1, 40, 14] },
    { L: [2, 121, 97], M: [2, 60, 38, 2, 61, 39], Q: [4, 40, 18, 2, 41, 19], H: [4, 40, 14, 2, 41, 15] },
    { L: [2, 146, 116], M: [3, 58, 36, 2, 59, 37], Q: [4, 36, 16, 4, 37, 17], H: [4, 36, 12, 4, 37, 13] },
    { L: [2, 86, 68, 2, 87, 69], M: [4, 69, 43, 1, 70, 44], Q: [6, 43, 19, 2, 44, 20], H: [6, 43, 15, 2, 44, 16] }
  ];
  /* Titik tengah pola penyelaras per versi (ISO/IEC 18004 Annex E). */
  var ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  /* Bit level koreksi galat di medan format (nilai standar, bukan urutan L<M<Q<H). */
  var EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };
  var LEVELS = ['L', 'M', 'Q', 'H'];

  function blocksFor(version, level) {
    var spec = RS_BLOCKS[version - 1][level];
    var out = [];
    for (var i = 0; i < spec.length; i += 3) {
      var cnt = spec[i], total = spec[i + 1], data = spec[i + 2];
      for (var k = 0; k < cnt; k++) out.push({ total: total, data: data });
    }
    return out;
  }
  function dataCapacityBytes(version, level) {
    var b = blocksFor(version, level), s = 0;
    for (var i = 0; i < b.length; i++) s += b[i].data;
    return s;
  }
  function pickVersion(byteLen, level) {
    for (var v = 1; v <= RS_BLOCKS.length; v++) {
      var cc = v < 10 ? 8 : 16;             // indikator jumlah karakter mode byte
      var need = 4 + cc + byteLen * 8;      // 4 bit mode + indikator + data
      if (need <= dataCapacityBytes(v, level) * 8) return v;
    }
    throw new Error('FiezelQr: data melebihi versi 10');
  }

  // ---------------------------------------------------------------- UTF-8 & bit buffer
  function utf8(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function BitBuf() { this.bits = []; }
  BitBuf.prototype.bit = function (v) { this.bits.push(v ? 1 : 0); };
  BitBuf.prototype.put = function (val, len) { for (var i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1); };
  BitBuf.prototype.len = function () { return this.bits.length; };

  /** byte[] UTF-8 -> codeword[] QR siap petakan (data terinterleaving + EC per blok). */
  function makeCodewords(version, level, bytes) {
    var cc = version < 10 ? 8 : 16;
    var bb = new BitBuf();
    bb.put(4, 4);                      // mode byte = 0100
    bb.put(bytes.length, cc);
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);

    var blocks = blocksFor(version, level), totalData = 0;
    for (i = 0; i < blocks.length; i++) totalData += blocks[i].data;
    var cap = totalData * 8;
    var rem = cap - bb.len();
    if (rem >= 4) bb.put(0, 4); else for (i = 0; i < rem; i++) bb.bit(0);
    while (bb.len() % 8 !== 0) bb.bit(0);
    var pads = [0xEC, 0x11], pi = 0;
    while (bb.len() < cap) { bb.put(pads[pi], 8); pi ^= 1; }

    var all = [];
    for (i = 0; i < bb.len(); i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bb.bits[i + j];
      all.push(b);
    }

    var dataBlocks = [], ecBlocks = [], off = 0;
    for (i = 0; i < blocks.length; i++) {
      var dc = blocks[i].data, ec = blocks[i].total - dc;
      var d = all.slice(off, off + dc); off += dc;
      dataBlocks.push(d);
      ecBlocks.push(ecBytes(d, ec));
    }
    var out = [], k;
    var maxData = 0;
    for (i = 0; i < dataBlocks.length; i++) maxData = Math.max(maxData, dataBlocks[i].length);
    for (i = 0; i < maxData; i++) for (k = 0; k < dataBlocks.length; k++) if (i < dataBlocks[k].length) out.push(dataBlocks[k][i]);
    var maxEc = 0;
    for (i = 0; i < ecBlocks.length; i++) maxEc = Math.max(maxEc, ecBlocks[i].length);
    for (i = 0; i < maxEc; i++) for (k = 0; k < ecBlocks.length; k++) if (i < ecBlocks[k].length) out.push(ecBlocks[k][i]);
    return out;
  }

  // ---------------------------------------------------------------- BCH medan format & versi
  function bchDigit(v) { var n = 0; while (v !== 0) { n++; v >>>= 1; } return n; }
  function bchTypeInfo(data) {
    var d = data << 10;
    while (bchDigit(d) - bchDigit(0x537) >= 0) d ^= 0x537 << (bchDigit(d) - bchDigit(0x537));
    return ((data << 10) | d) ^ 0x5412;
  }
  function bchTypeNumber(data) {
    var d = data << 12;
    while (bchDigit(d) - bchDigit(0x1F25) >= 0) d ^= 0x1F25 << (bchDigit(d) - bchDigit(0x1F25));
    return (data << 12) | d;
  }

  // ---------------------------------------------------------------- mask
  function maskAt(pattern, i, j) {
    switch (pattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return ((i * j) % 2 + (i * j) % 3) === 0;
      case 6: return (((i * j) % 2 + (i * j) % 3) % 2) === 0;
      case 7: return (((i * j) % 3 + (i + j) % 2) % 2) === 0;
      default: throw new Error('FiezelQr mask ' + pattern);
    }
  }

  // ---------------------------------------------------------------- rangkai matriks
  function setupTypeInfo(m, test, ecBits, mask) {
    var n = m.length;
    var data = (ecBits << 3) | mask;
    var bits = bchTypeInfo(data), i;
    for (i = 0; i < 15; i++) {
      var v1 = (!test && ((bits >> i) & 1) === 1) ? 1 : 0;
      if (i < 6) m[i][8] = v1;
      else if (i < 8) m[i + 1][8] = v1;
      else m[n - 15 + i][8] = v1;
    }
    for (i = 0; i < 15; i++) {
      var v2 = (!test && ((bits >> i) & 1) === 1) ? 1 : 0;
      if (i < 8) m[8][n - i - 1] = v2;
      else if (i < 9) m[8][15 - i - 1 + 1] = v2;
      else m[8][15 - i - 1] = v2;
    }
    m[n - 8][8] = test ? 0 : 1;   // modul gelap tetap, standar
  }
  function setupTypeNumber(m, test, version) {
    var n = m.length, bits = bchTypeNumber(version), i;
    for (i = 0; i < 18; i++) {
      var v1 = (!test && ((bits >> i) & 1) === 1) ? 1 : 0;
      m[Math.floor(i / 3)][i % 3 + n - 8 - 3] = v1;
    }
    for (i = 0; i < 18; i++) {
      var v2 = (!test && ((bits >> i) & 1) === 1) ? 1 : 0;
      m[i % 3 + n - 8 - 3][Math.floor(i / 3)] = v2;
    }
  }
  function mapData(m, data, mask) {
    var n = m.length, inc = -1, row = n - 1, bitIndex = 7, byteIndex = 0;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (var c = 0; c < 2; c++) {
          if (m[row][col - c] === null) {
            var dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            if (maskAt(mask, row, col - c)) dark = !dark;
            m[row][col - c] = dark ? 1 : 0;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || row >= n) { row -= inc; inc = -inc; break; }
      }
    }
  }
  function makeMatrix(version, level, codewords, test, mask) {
    var n = version * 4 + 17, m = [], i, j, r, c;
    for (i = 0; i < n; i++) { m.push(new Array(n)); for (j = 0; j < n; j++) m[i][j] = null; }

    function probe(row, col) {
      for (r = -1; r <= 7; r++) for (c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        var val = ((r >= 0 && r <= 6) && (c === 0 || c === 6)) ||
                  ((c >= 0 && c <= 6) && (r === 0 || r === 6)) ||
                  (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m[rr][cc] = val ? 1 : 0;
      }
    }
    probe(0, 0); probe(n - 7, 0); probe(0, n - 7);

    var pos = ALIGN[version - 1];
    for (i = 0; i < pos.length; i++) for (j = 0; j < pos.length; j++) {
      var pr = pos[i], pc = pos[j];
      if (m[pr][pc] !== null) continue;
      for (r = -2; r <= 2; r++) for (c = -2; c <= 2; c++) {
        m[pr + r][pc + c] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) ? 1 : 0;
      }
    }
    for (i = 8; i < n - 8; i++) {
      if (m[i][6] === null) m[i][6] = (i % 2 === 0) ? 1 : 0;
      if (m[6][i] === null) m[6][i] = (i % 2 === 0) ? 1 : 0;
    }
    setupTypeInfo(m, test, EC_BITS[level], mask);
    if (version >= 7) setupTypeNumber(m, test, version);
    mapData(m, codewords, mask);
    return m;
  }

  // ---------------------------------------------------------------- skor penalti (pemilihan mask)
  function lostPoint(m) {
    var n = m.length, c = 0, i, j, dr, dc;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      var isDark = m[i][j] === 1, cnt = 0;
      for (dr = -1; dr <= 1; dr++) {
        if (i + dr < 0 || i + dr >= n) continue;
        for (dc = -1; dc <= 1; dc++) {
          if (j + dc < 0 || j + dc >= n) continue;
          if (dr === 0 && dc === 0) continue;
          if ((m[i + dr][j + dc] === 1) === isDark) cnt++;
        }
      }
      if (cnt > 5) c += 3 + cnt - 5;
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++) {
      var s = m[i][j] + m[i + 1][j] + m[i][j + 1] + m[i + 1][j + 1];
      if (s === 0 || s === 4) c += 3;
    }
    for (i = 0; i < n; i++) for (j = 0; j < n - 6; j++) {
      if (m[i][j] === 1 && m[i][j + 1] === 0 && m[i][j + 2] === 1 && m[i][j + 3] === 1 && m[i][j + 4] === 1 && m[i][j + 5] === 0 && m[i][j + 6] === 1) c += 40;
    }
    for (j = 0; j < n; j++) for (i = 0; i < n - 6; i++) {
      if (m[i][j] === 1 && m[i + 1][j] === 0 && m[i + 2][j] === 1 && m[i + 3][j] === 1 && m[i + 4][j] === 1 && m[i + 5][j] === 0 && m[i + 6][j] === 1) c += 40;
    }
    var dark = 0;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (m[i][j] === 1) dark++;
    /* Aturan 4: menjauhi rasio gelap/terang 50 persen. Nilai fraksional dipertahankan
       (tanpa pembulatan ke bawah) supaya skor penalti persis sama dengan acuan yang
       dibandingkan uji kontrak; pemilihan mask tidak mengubah keabsahan kode. */
    c += 10 * Math.abs(100 * dark / n / n - 50) / 5;
    return c;
  }

  // ---------------------------------------------------------------- API publik
  function normalizeLevel(level) {
    var L = String(level || 'M').toUpperCase();
    return LEVELS.indexOf(L) >= 0 ? L : 'M';
  }
  /**
   * Matriks modul QR untuk `text`.
   * @returns {{version:number,size:number,mask:number,level:string,modules:number[][]}}
   */
  function matrix(text, opts) {
    opts = opts || {};
    var level = normalizeLevel(opts.level);
    var bytes = utf8(String(text == null ? '' : text));
    var version = Number(opts.version) || pickVersion(bytes.length, level);
    if (version < 1 || version > RS_BLOCKS.length) throw new Error('FiezelQr versi di luar jangkauan: ' + version);
    var cw = makeCodewords(version, level, bytes);
    var best = 0, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var sc = lostPoint(makeMatrix(version, level, cw, true, mask));
      if (mask === 0 || sc < bestScore) { bestScore = sc; best = mask; }
    }
    return { version: version, size: version * 4 + 17, mask: best, level: level, modules: makeMatrix(version, level, cw, false, best) };
  }
  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /**
   * String SVG siap tempel ke innerHTML. Punya zona hening 4 modul (wajib untuk pemindaian).
   * `shape-rendering="crispEdges"` menjaga modul tetap tajam di layar maupun saat diunduh.
   */
  function svg(text, opts) {
    opts = opts || {};
    var q = matrix(text, opts);
    var quiet = opts.quiet == null ? 4 : Math.max(0, Number(opts.quiet) || 0);
    var n = q.size, total = n + quiet * 2;
    var d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (q.modules[r][c] === 1) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    }
    var px = Number(opts.px) || 320;
    var dark = opts.dark || '#111111', light = opts.light || '#ffffff';
    var label = opts.label == null ? 'QR' : String(opts.label);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges" role="img" aria-label="' + escAttr(label) + '">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>' +
      '<path d="' + d + '" fill="' + dark + '"/></svg>';
  }
  /** data: URL SVG (untuk unduh / <img src>). */
  function dataUrl(text, opts) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(text, opts));
  }

  root.FiezelQr = Object.freeze({
    LEVELS: LEVELS,
    matrix: matrix,
    svg: svg,
    dataUrl: dataUrl,
    utf8: utf8
  });
})(typeof self !== 'undefined' ? self : this);
