'use strict';
/**
 * tools/face-synth.js — KAMERA SINTETIS UNTUK MENGUJI features/class-hub/fiezel-face-guard.js.
 *
 * KENAPA ADA
 * ----------
 * Gerbang wajah sebelum m025-565 diuji dengan "wajah" berupa persegi kulit seragam + satu
 * pita gelap. Bentuk itu lolos semua ambang, tetapi tidak menyerupai apa pun yang dilihat
 * kamera depan ponsel murid: tidak ada rambut yang memotong dahi, tidak ada leher yang
 * memanjangkan kotak kulit, tidak ada kerudung, tidak ada kacamata yang memantulkan layar,
 * tidak ada kepala yang menunduk membaca. Ambang yang hanya pernah melihat persegi tidak
 * bisa dipercaya untuk wajah.
 *
 * Renderer ini menembakkan sinar ortografis ke ELLIPSOID KEPALA yang diputar (yaw/pitch/roll),
 * menaruh fitur wajah pada koordinat anatomi lokal kepala (alis, rongga mata, iris, hidung,
 * mulut — proporsi sepertiga wajah klasik), menyorotnya dengan cahaya Lambert, lalu menambah
 * rambut (pendek/poni/panjang), kerudung, kacamata dengan pantulan layar, leher, seragam,
 * latar ruangan, cahaya jendela di belakang (backlight + bloom), ruangan redup (derau sensor
 * luma + kroma), dan benda bukan-wajah (kardus, dinding krem, meja kayu, gorden, telapak
 * tangan, buku, foto cetak, layar HP). Hasilnya diambil-sampel-super lalu dirata-rata ke
 * grid yang diminta — 64x48 untuk mesin, 320x240 untuk berkas Y4M kamera palsu Chromium.
 *
 * BATAS JUJUR: ini model, bukan kamera. Ia jauh lebih dekat ke wajah sungguhan daripada
 * persegi, tetapi ambang yang lulus di sini tetap butuh uji lapangan di kelas.
 *
 * Koordinat adegan memakai grid kanonik 64x48 apa pun resolusi keluarannya, jadi satu
 * adegan menghasilkan bingkai yang konsisten di 64x48 maupun 320x240.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelFaceSynth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var CW = 64, CH = 48;

  // Warna kulit (sRGB, cahaya netral) — rentang murid Indonesia & Thai.
  var SKIN = {
    terang: [232, 190, 165],
    langsat: [215, 165, 130],
    sawo: [190, 135, 100],
    gelap: [150, 100, 72],
    'sangat-gelap': [105, 70, 50]
  };
  var HAIR = [32, 26, 24];

  function mulberry32(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussian(rnd) {
    var u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // Derau nilai deterministik (tekstur kayu, kardus, gorden) — bebas resolusi.
  function hash2(ix, iy, seed) {
    var h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    var a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y, seed) { return 0.55 * vnoise(x, y, seed) + 0.3 * vnoise(x * 2.1, y * 2.1, seed + 7) + 0.15 * vnoise(x * 4.3, y * 4.3, seed + 13); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  /** R = Rz(roll) · Rx(pitch) · Ry(yaw); pitch positif = menunduk, yaw positif = menoleh ke kanan layar. */
  function rotation(yawDeg, pitchDeg, rollDeg) {
    var y = (yawDeg || 0) * Math.PI / 180, p = (pitchDeg || 0) * Math.PI / 180, r = (rollDeg || 0) * Math.PI / 180;
    var cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p), cr = Math.cos(r), sr = Math.sin(r);
    var Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
    var Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
    var Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]];
    function mm(A, B) {
      var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
      return C;
    }
    return mm(Rz, mm(Rx, Ry));
  }
  function mv(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
  function mtv(M, v) { return [M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2], M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2], M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]]; }

  // Ellipsoid kepala (satuan = setengah lebar wajah) & volume rambut di atas/belakangnya.
  var HEAD = [1.0, 1.32, 1.1];
  var HAIR_SHELL = [1.1, 1.46, 1.2], HAIR_OFF = [0, 0.13, -0.1];

  function hitEllipsoid(R, X, Y, axes, off) {
    var o = mtv(R, [X, Y, 10]), d = mtv(R, [0, 0, -1]);
    if (off) { o = [o[0] - off[0], o[1] - off[1], o[2] - off[2]]; }
    var A2 = axes[0] * axes[0], B2 = axes[1] * axes[1], C2 = axes[2] * axes[2];
    var a = d[0] * d[0] / A2 + d[1] * d[1] / B2 + d[2] * d[2] / C2;
    var b = 2 * (o[0] * d[0] / A2 + o[1] * d[1] / B2 + o[2] * d[2] / C2);
    var c = o[0] * o[0] / A2 + o[1] * o[1] / B2 + o[2] * o[2] / C2 - 1;
    var disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    var t = (-b - Math.sqrt(disc)) / (2 * a);
    var p = [o[0] + t * d[0], o[1] + t * d[1], o[2] + t * d[2]];
    var nl = norm3([p[0] / A2, p[1] / B2, p[2] / C2]);
    return { p: p, n: mv(R, nl) };
  }

  function lambert(n, light) {
    var L = light.dirN;
    return light.amb + light.dif * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  }

  function clothShade(base, X, Y, seed) {
    var fold = 0.88 + 0.12 * Math.sin(X * 3.1 + 2 * vnoise(X * 1.5, Y * 1.5, seed));
    return mul(base, fold);
  }

  /** Warna permukaan kepala pada titik lokal p = (hx, hy, hz), normal kamera n. */
  function headSurface(f, hit, light) {
    var hx = hit.p[0], hy = hit.p[1], hz = hit.p[2];
    var skin = f.skinRGB, hairC = f.hairColor || HAIR;
    var I = lambert(hit.n, light);
    if (f.hijab) {
      var open = hz > 0.12 && hy < 0.46 && hy > -1.2 && Math.abs(hx) < 0.80 - 0.15 * Math.max(0, -hy - 0.55);
      if (!open) return mul(clothShade(f.hijab, hx, hy, 5), I);
    } else if (f.hair) {
      var hairline = f.hair === 'poni' ? 0.17 - 0.06 * hx * hx : 0.72 - 0.45 * hx * hx;
      var isHair = hz < -0.05 || hy > hairline || (Math.abs(hx) > 0.9 && hy > 0.15) ||
        (f.hair === 'panjang' && Math.abs(hx) > 0.76 && hy > -1.0 && hz < 0.6);
      if (isHair) return mul(hairC, 0.75 + 0.6 * I);
    }
    var col = skin.slice();
    var shade = 1;
    var socketDepth = 0.30 + 0.18 * Math.max(0, light.dirN[1]);
    var ex = 0.42, ey = -0.04;
    for (var s = -1; s <= 1; s += 2) {
      var dx = hx - s * ex, dy = hy - ey;
      var ds = (dx / 0.27) * (dx / 0.27) + (dy / 0.18) * (dy / 0.18);
      if (ds < 1) shade *= 1 - socketDepth * (1 - ds);
      var bx = dx / 0.25;
      if (Math.abs(bx) < 1) {
        var browY = 0.15 + 0.035 * (1 - bx * bx);
        if (Math.abs(hy - browY) < 0.045) col = mix(col, hairC, 0.8);
      }
      // Celah mata: iris ≈ 44% lebarnya (12 mm dari ~30 mm), sklera di dalam bayangan rongga,
      // garis bulu mata atas gelap. Versi pertama memakai sklera putih penuh yang LEBIH terang
      // dari kulit — mata sintetis jadi nyaris netral, tidak seperti mata di kamera 64x48.
      var de = (dx / 0.17) * (dx / 0.17) + (dy / 0.06) * (dy / 0.06);
      if (de < 1) {
        if (f.eyes === 'tutup') {
          shade *= 0.85;
          if (Math.abs(dy) < 0.02) col = mix(col, hairC, 0.75);
        } else if (dy > 0.032) {
          col = mix(col, hairC, 0.8);
        } else if (Math.abs(dx) < 0.075) {
          col = [48, 36, 30];
        } else {
          col = [182, 176, 170];
        }
      }
      // Kacamata: bingkai, jembatan, dan pantulan layar di lensa.
      if (f.glasses) {
        var rl = (dx / 0.27) * (dx / 0.27) + (dy / 0.19) * (dy / 0.19);
        if (rl >= 0.74 && rl < 1) { col = f.glasses.frame || [28, 28, 30]; shade = 1; }
        // Pantulan layar ponsel di lensa: persegi terang menutupi sebagian besar lensa.
        else if (rl < 0.74 && f.glasses.glare > 0 && dx * s > -0.17 && dx * s < 0.19 && dy > -0.1 && dy < 0.13) {
          col = mix(col, [242, 246, 255], f.glasses.glare);
          if (f.glasses.glare > 0.5) shade = 1 / Math.max(0.3, I);
        }
      }
    }
    if (f.glasses && Math.abs(hx) < 0.16 && Math.abs(hy - 0.02) < 0.03) { col = f.glasses.frame || [28, 28, 30]; shade = 1; }
    // Hidung: bayangan sisi & bawah hidung, lubang hidung.
    if (Math.abs(hx) < 0.13 && hy < -0.08 && hy > -0.55 && hx * light.dirN[0] < 0) shade *= 0.9;
    if (Math.abs(hx) < 0.19 && hy <= -0.55 && hy > -0.66) shade *= 0.74;
    for (var n2 = -1; n2 <= 1; n2 += 2) {
      var nx = (hx - n2 * 0.075) / 0.05, ny = (hy + 0.58) / 0.028;
      if (nx * nx + ny * ny < 1) shade *= 0.5;
    }
    // Mulut.
    var mx = hx / 0.24, my = (hy + 0.86) / 0.06;
    if (mx * mx + my * my < 1) {
      col = [col[0] * 0.86, col[1] * 0.58, col[2] * 0.6];
      if (Math.abs(hy + 0.86) < 0.014) shade *= 0.55;
    }
    // Bawah dagu menghadap ke bawah — gelap oleh cahaya atas.
    return mul(col, I * shade);
  }

  // Latar ruangan pada koordinat kanonik (x 0..64, y 0..48).
  function background(sc, x, y) {
    var bg = sc.bg || 'kamar';
    if (typeof bg === 'function') return bg(x, y);
    if (Array.isArray(bg)) return bg;
    var seed = 31;
    if (bg === 'kamar') {
      var c = mix([158, 162, 172], [128, 132, 142], y / 48);
      if (x > 52 && x < 54) c = [92, 80, 70];
      if (x > 4 && x < 15 && y > 6 && y < 18) c = [70, 110, 140]; // poster
      return mul(c, 0.97 + 0.06 * fbm(x * 0.2, y * 0.2, seed));
    }
    if (bg === 'kamar-krem') {
      var k = mix([212, 192, 160], [186, 166, 136], y / 48);
      if (x > 50 && x < 53) k = [120, 92, 66];
      return mul(k, 0.97 + 0.06 * fbm(x * 0.2, y * 0.2, seed));
    }
    if (bg === 'jendela') {
      // Jendela terang di belakang murid; dinding di sekitarnya kurang cahaya.
      if (x > 6 && x < 58 && y < 32) {
        if (Math.abs(x - 32) < 0.8 || Math.abs(y - 15) < 0.7) return [70, 72, 76];
        return [252, 253, 255];
      }
      return [104, 104, 110];
    }
    if (bg === 'gelap') return mul([30, 27, 25], 0.9 + 0.2 * fbm(x * 0.15, y * 0.15, seed));
    return [128, 128, 128];
  }

  function bodyLayer(f, X, Y) {
    // Leher (tegak, tidak ikut berputar), lalu bahu/seragam.
    var shoulderY = -1.95 - 0.12 * X * X;
    if (Y < shoulderY && Math.abs(X) < 3.2) return { kind: 'shirt' };
    if (Y < -0.85 && Y > shoulderY - 0.2 && Math.abs(X) < 0.52) return { kind: 'neck' };
    return null;
  }

  /** Warna satu titik kanonik untuk adegan berwajah (tanpa pasca-proses). */
  function faceScenePoint(sc, f, x, y, light) {
    var X = (x - f.cx) / f.scale, Y = -(y - f.cy) / f.scale;
    var hit = hitEllipsoid(f._R, X, Y, HEAD, null);
    if (hit) return headSurface(f, hit, light);
    if (f.hijab) {
      // Kerudung terjuntai: elips di sekitar kepala + juntaian melebar ke bahu.
      var ex = X / 1.42, ey = (Y + 0.08) / 1.62;
      var drapeHalf = Y < -0.9 ? Math.min(2.6, 1.25 + (-0.9 - Y) * 0.9) : 0;
      if (ex * ex + ey * ey < 1 || (Y < -0.9 && Math.abs(X) < drapeHalf)) {
        var ny = Math.max(-1, Math.min(1, -Y / 2));
        return mul(clothShade(f.hijab, X, Y, 9), light.amb + light.dif * (0.55 + 0.25 * ny));
      }
    } else if (f.hair) {
      if (hitEllipsoid(f._R, X, Y, HAIR_SHELL, HAIR_OFF)) return mul(f.hairColor || HAIR, 0.75 + 0.5 * light.amb);
      if (f.hair === 'panjang' && Y < 0.6 && Y > -2.4 && Math.abs(X) < 1.25 + Math.max(0, -Y) * 0.15) return mul(f.hairColor || HAIR, 0.8);
    }
    var b = bodyLayer(f, X, Y);
    if (b) {
      if (b.kind === 'neck') return mul(f.skinRGB, (light.amb + light.dif * 0.35) * 0.95);
      return mul(clothShade(f.shirt || [222, 226, 232], X, Y, 3), light.amb + light.dif * 0.7);
    }
    return null;
  }

  // ---------------------------------------------------------------- benda bukan-wajah
  function objectPoint(o, x, y, sc) {
    var k = o.kind, seed = o.seed || 11;
    if (k === 'kardus') {
      var base = o.color || [184, 140, 96];
      var corr = 1 + 0.035 * Math.sin(x * 1.9) + 0.05 * (fbm(x * 0.25, y * 0.25, seed) - 0.5);
      var grad = 1.08 - 0.22 * (y / 48) + (o.lit ? 0.18 * (1 - y / 30) : 0);
      var c = mul(base, corr * grad);
      if (o.tape && Math.abs(y - 24) < 2.2) c = mul(c, 1.1);
      if (o.print && x > 20 && x < 44 && y > 30 && y < 38 && Math.sin(x * 2.4) > 0.2) c = [60, 45, 35];
      return c;
    }
    if (k === 'dinding') {
      var w = o.color || [214, 188, 152];
      var g = 1.04 - 0.14 * Math.hypot(x - 20, y - 10) / 48;
      return mul(w, g * (0.985 + 0.03 * fbm(x * 0.3, y * 0.3, seed)));
    }
    if (k === 'meja-kayu') {
      var wood = o.color || [168, 112, 66];
      var ring = Math.sin(x * 0.55 + 4 * fbm(x * 0.05, y * 0.12, seed) + y * 0.04);
      var knot = Math.hypot(x - 40, (y - 20) * 1.6) < 3.5 ? 0.62 : 1;
      return mul(wood, (0.88 + 0.12 * ring) * knot * (0.95 + 0.1 * fbm(x * 0.4, y * 2, seed + 3)));
    }
    if (k === 'gorden') {
      var cur = o.color || [205, 158, 108];
      var fold = 0.72 + 0.28 * Math.sin(x * 0.62 + 0.4 * Math.sin(y * 0.1));
      return mul(cur, fold * (0.97 + 0.06 * fbm(x * 0.3, y * 0.3, seed)));
    }
    if (k === 'telapak-dekat') {
      // Telapak menempel di lensa: buram, cahaya tembus daging (kemerahan), tengah lebih terang.
      var palm = o.color || [196, 118, 92];
      var r = Math.hypot((x - 30) / 40, (y - 26) / 30);
      var gap = Math.abs(x - 22) < 1.2 && y < 18 ? 0.7 : 1;
      return mul(palm, Math.max(0.35, 1.1 - 0.6 * r) * gap);
    }
    if (k === 'langit-langit') {
      var ceil = [214, 216, 220];
      if (Math.hypot(x - 34, y - 20) < 5) return [255, 255, 250];
      return mul(ceil, 0.9 + 0.1 * (1 - y / 48));
    }
    if (k === 'buku-terbuka') {
      var paper = o.color || [232, 222, 196];
      if (Math.abs(x - 32) < 1.2) return mul(paper, 0.6);
      var line = (Math.floor(y / 2.6) % 2 === 0) && ((x > 4 && x < 29) || (x > 35 && x < 61)) && vnoise(x * 0.7, Math.floor(y / 2.6), seed) > 0.25;
      return line ? mul(paper, 0.45) : paper;
    }
    return [128, 128, 128];
  }

  function occluderPoint(oc, x, y) {
    if (oc.kind === 'tangan') {
      // Telapak (elips) + empat jari menunjuk ke atas.
      var cx = oc.cx, cy = oc.cy, r = oc.r || 14;
      var px = (x - cx) / (r * 0.85), py = (y - cy) / r;
      var inPalm = px * px + py * py < 1;
      var inFinger = false;
      for (var i = 0; i < 4; i++) {
        var fx = cx - r * 0.6 + i * r * 0.4, top = cy - r * (1.9 - Math.abs(i - 1.5) * 0.18);
        if (Math.abs(x - fx) < r * 0.17 && y > top && y < cy) inFinger = true;
      }
      if (!inPalm && !inFinger) return null;
      var c = oc.color || [200, 140, 108];
      var shade = 0.8 + 0.25 * (1 - Math.min(1, Math.hypot(px, py)));
      return mul(c, shade);
    }
    if (oc.kind === 'buku') {
      if (x < oc.x0 || x > oc.x1 || y < oc.y0 || y > oc.y1) return null;
      var cover = oc.color || [52, 78, 140];
      if (y > oc.y0 + 4 && y < oc.y0 + 7 && x > oc.x0 + 6 && x < oc.x1 - 6) return [235, 230, 215];
      if (x < oc.x0 + 2) return mul(cover, 0.7);
      return cover;
    }
    return null;
  }

  // ---------------------------------------------------------------- komposisi
  function prepare(sc) {
    var light = sc.light || {};
    var ldir = light.dir || [0.2, 0.55, 0.8];
    var L = { dirN: norm3(ldir), amb: light.amb != null ? light.amb : 0.45, dif: light.dif != null ? light.dif : 0.62 };
    var f = sc.face ? Object.assign({ cx: 32, cy: 21, scale: 10, yaw: 0, pitch: 0, roll: 0, skin: 'sawo', hair: 'pendek', eyes: 'buka' }, sc.face) : null;
    if (f) {
      f._R = rotation(f.yaw, f.pitch, f.roll);
      f.skinRGB = Array.isArray(f.skin) ? f.skin : (SKIN[f.skin] || SKIN.sawo);
    }
    return { L: L, f: f };
  }

  function scenePoint(sc, prep, x, y) {
    var c = null;
    if (sc.photo) {
      var ph = sc.photo;
      var m = ph.margin != null ? ph.margin : 2;
      if (x >= ph.x0 - m && x <= ph.x1 + m && y >= ph.y0 - m && y <= ph.y1 + m) {
        if (x < ph.x0 || x > ph.x1 || y < ph.y0 || y > ph.y1) {
          c = ph.kind === 'layar' ? [16, 16, 18] : [232, 230, 222];
        } else {
          var u = (x - ph.x0) / (ph.x1 - ph.x0) * CW, v = (y - ph.y0) / (ph.y1 - ph.y0) * CH;
          var inner = (prep.f && faceScenePoint(sc, prep.f, u, v, prep.L)) || background({ bg: ph.bg || 'kamar' }, u, v);
          if (ph.kind === 'layar') {
            inner = [inner[0] * 0.92, inner[1] * 0.97, Math.min(255, inner[2] * 1.08 + 8)];
            inner = mul(inner, 1 + 0.05 * Math.sin((x + y) * 9));
            if (Math.abs((x - ph.x0) - (y - ph.y0) * 0.8 - 6) < 1.4) inner = mix(inner, [250, 250, 252], 0.85);
          } else {
            inner = [30 + inner[0] * 0.76, 30 + inner[1] * 0.76, 30 + inner[2] * 0.76];
          }
          c = inner;
        }
      }
      if (!c) c = background(sc, x, y);
    } else if (sc.object) {
      c = objectPoint(sc.object, x, y, sc);
    } else {
      if (prep.f) c = faceScenePoint(sc, prep.f, x, y, prep.L);
      if (!c) c = mul(background(sc, x, y), sc.bgGain != null ? sc.bgGain : 1);
    }
    if (sc.occluders) {
      for (var i = 0; i < sc.occluders.length; i++) {
        var oc = occluderPoint(sc.occluders[i], x, y);
        if (oc) c = oc;
      }
    }
    return c;
  }

  /**
   * Render adegan ke RGBA. opts: { w, h, ss } — default 64x48, sampel-super 4x4.
   * Pasca-proses: eksposur, white balance, bloom (silau jendela merembes ke tepi wajah),
   * blur gerak horizontal, derau sensor luma + kroma (deterministik per seed).
   */
  function render(sc, opts) {
    opts = opts || {};
    var W = opts.w || CW, H = opts.h || CH, SS = opts.ss || (W > 100 ? 2 : 4);
    var prep = prepare(sc);
    var buf = new Float32Array(W * H * 3);
    for (var py = 0; py < H; py++) {
      for (var px = 0; px < W; px++) {
        var r = 0, g = 0, b = 0;
        for (var sy = 0; sy < SS; sy++) {
          for (var sx = 0; sx < SS; sx++) {
            var x = (px + (sx + 0.5) / SS) * CW / W, y = (py + (sy + 0.5) / SS) * CH / H;
            var c = scenePoint(sc, prep, x, y);
            r += c[0]; g += c[1]; b += c[2];
          }
        }
        var k = (py * W + px) * 3, n = SS * SS;
        buf[k] = r / n; buf[k + 1] = g / n; buf[k + 2] = b / n;
      }
    }
    var exp = sc.exposure != null ? sc.exposure : 1, wb = sc.wb || [1, 1, 1];
    for (var i = 0; i < W * H; i++) {
      buf[i * 3] *= exp * wb[0]; buf[i * 3 + 1] *= exp * wb[1]; buf[i * 3 + 2] *= exp * wb[2];
    }
    if (sc.bloom) {
      var rad = Math.max(1, Math.round(2.5 * W / CW));
      var hi = new Float32Array(W * H);
      for (var j = 0; j < W * H; j++) {
        var Y = 0.299 * buf[j * 3] + 0.587 * buf[j * 3 + 1] + 0.114 * buf[j * 3 + 2];
        hi[j] = Math.max(0, Y - 200);
      }
      var bl = new Float32Array(W * H);
      for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
        var s = 0, cnt = 0;
        for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) {
          var X2 = xx + dx, Y2 = yy + dy;
          if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue;
          s += hi[Y2 * W + X2]; cnt++;
        }
        bl[yy * W + xx] = s / cnt;
      }
      for (var q = 0; q < W * H; q++) {
        var add = sc.bloom * bl[q] * 2.2;
        buf[q * 3] += add; buf[q * 3 + 1] += add; buf[q * 3 + 2] += add;
      }
    }
    if (sc.blur) {
      var kb = Math.max(1, Math.round(sc.blur * W / CW));
      var tmp = new Float32Array(buf);
      for (var by = 0; by < H; by++) for (var bx = 0; bx < W; bx++) {
        var acc = [0, 0, 0], m2 = 0;
        for (var t = -kb; t <= kb; t++) {
          var xx2 = Math.min(W - 1, Math.max(0, bx + t)), o = (by * W + xx2) * 3;
          acc[0] += tmp[o]; acc[1] += tmp[o + 1]; acc[2] += tmp[o + 2]; m2++;
        }
        var o2 = (by * W + bx) * 3;
        buf[o2] = acc[0] / m2; buf[o2 + 1] = acc[1] / m2; buf[o2 + 2] = acc[2] / m2;
      }
    }
    var noise = sc.noise || { luma: 1.5, chroma: 1 };
    var rnd = mulberry32((sc.seed || 1) * 2654435761);
    var out = new Uint8ClampedArray(W * H * 4);
    for (var p = 0; p < W * H; p++) {
      var nl = (noise.luma || 0) * gaussian(rnd);
      out[p * 4] = buf[p * 3] + nl + (noise.chroma || 0) * gaussian(rnd);
      out[p * 4 + 1] = buf[p * 3 + 1] + nl + (noise.chroma || 0) * gaussian(rnd);
      out[p * 4 + 2] = buf[p * 3 + 2] + nl + (noise.chroma || 0) * gaussian(rnd);
      out[p * 4 + 3] = 255;
    }
    return { w: W, h: H, data: out };
  }

  /** Bingkai siap pakai untuk analyzeFrame/checkLiveness (video/kanvas/ctx tiruan). */
  function mockFrame(sc) {
    var img = render(sc);
    return {
      video: { readyState: 2 },
      cvs: { width: CW, height: CH },
      ctx: { drawImage: function () {}, getImageData: function () { return { data: img.data }; } },
      data: img.data
    };
  }

  /** Salin adegan dengan perubahan bertingkat pada face/light. */
  function variant(sc, patch) {
    var out = Object.assign({}, sc, patch || {});
    if (sc.face && patch && patch.face) out.face = Object.assign({}, sc.face, patch.face);
    if (sc.light && patch && patch.light) out.light = Object.assign({}, sc.light, patch.light);
    return out;
  }

  /** Teks PGM (abu-abu) kecil untuk diperiksa manusia — 64x48 diperbesar. */
  function toPPM(img, scale) {
    scale = scale || 4;
    var W = img.w * scale, H = img.h * scale;
    var header = 'P6\n' + W + ' ' + H + '\n255\n';
    var body = new Uint8Array(W * H * 3);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var s = ((Math.floor(y / scale) * img.w) + Math.floor(x / scale)) * 4, d = (y * W + x) * 3;
      body[d] = img.data[s]; body[d + 1] = img.data[s + 1]; body[d + 2] = img.data[s + 2];
    }
    return { header: header, body: body };
  }

  return {
    CW: CW, CH: CH, SKIN: SKIN, HAIR: HAIR,
    render: render, mockFrame: mockFrame, variant: variant, toPPM: toPPM,
    mulberry32: mulberry32, gaussian: gaussian
  };
});
