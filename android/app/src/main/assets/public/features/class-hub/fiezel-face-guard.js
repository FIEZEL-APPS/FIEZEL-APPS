/**
 * FIEZEL — fiezel-face-guard.js · DETEKTOR KEHADIRAN WAJAH DI KAMERA (KELASKU UJIAN).
 *
 * TUJUAN:
 * Memastikan murid hadir menghadap layar selama ujian resmi dari guru (mode 'ujian').
 * Sampel tiap 500 ms (2 FPS, satu readback kanvas) pada bingkai mini 64x48 dari kamera
 * 320x240 @ ±15 fps — ringan untuk baterai ponsel murid.
 *
 * BATAS JUJUR MODUL INI: ia memeriksa KEHADIRAN wajah yang hidup, BUKAN identitas. Profil
 * "enrollment" hanyalah statistik warna kulit & posisi untuk menstabilkan deteksi; ia tidak
 * bisa membedakan murid A dari murid B. Semua pemeriksaan berjalan di perangkat murid.
 *
 * PRINSIP:
 * 1. Tanpa Crash / Graceful: Jika izin kamera ditolak atau perangkat tidak memiliki kamera,
 *    ujian tetap berjalan — dan guru menerima tanda "tanpa kamera" (lihat class-hub).
 * 2. Peringatan Halus: wajah hilang > 2 dtk (debounce jam dinding) membuka episode; 3 dtk
 *    memunculkan kartu peringatan; episode di bawah FACE_GRACE_MS (focus-guard) dibuang.
 *    Satu-dua bingkai gagal tidak memicu apa pun; satu kilasan "hadir" di tengah kehilangan
 *    harus dikonfirmasi bingkai kedua sebelum jamnya direset.
 * 3. Liveness pra-ujian: kedip, toleh kepala 3D, atau diam tenang >= 3 dtk YANG MASIH
 *    menunjukkan dinamika hidup. Profil baru dikunci SETELAH liveness lulus — sebelum itu
 *    pemeriksaan anti-foto tetap menyala.
 * 4. Kamera beku / terputus (track ended/muted, bingkai identik) = wajah tidak terlihat.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelFaceGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 2 sampel/dtk selama ujian (m025-565; dulu 4/dtk dengan DUA readback kanvas per tick).
  // Peringatan butuh >= 3 dtk hilang, jadi 500 ms masih memberi 6 sampel per jendela itu.
  var SAMPLE_INTERVAL_MS = 500;
  var WARN_THRESHOLD_MS = 3000;
  var ABSENT_THRESHOLD_MS = 4500;
  // Jalur "diam tenang": hadir terus-menerus selama ini (jam dinding, bukan hitungan tick —
  // tick preflight 60 ms dulu membuat "3 detik" sebenarnya 1,3 detik).
  var STEADY_HOLD_MS = 3000;
  // Jendela temporal minimum sebelum vonis statis/hidup boleh dipercaya.
  var TEMPORAL_MIN_SPAN_MS = 2000;
  // Kamera nyata selalu membawa derau sensor; bingkai yang IDENTIK selama ini = stream beku.
  var FROZEN_MS = 3000;
  var FROZEN_DIFF_SUM = 1.0;
  // Kamera terputus di tengah ujian: coba sambung ulang tiap 5 dtk; gagal 3x = lapor hilang.
  var REACQUIRE_GAP_MS = 5000;
  var REACQUIRE_FAILS_LOST = 3;
  var PROFILE_KEYS = ['sampleCount', 'cbMean', 'crMean', 'cbMin', 'cbMax', 'crMin', 'crMax', 'normRMean', 'normBMean', 'boxWMean', 'boxHMean', 'skinCountMean', 'cXMean', 'cYMean', 'eyeDipMean', 'asymMean', 'avgBrMean', 'dipNMean'];

  var enrolledProfile = {
    valid: false,
    sampleCount: 0,
    cbMean: 0,
    crMean: 0,
    cbMin: 70,
    cbMax: 145,
    crMin: 125,
    crMax: 185,
    normRMean: 0.40,
    normBMean: 0.25,
    boxWMean: 30,
    boxHMean: 36,
    skinCountMean: 350,
    cXMean: 32,
    cYMean: 24,
    eyeDipMean: 1.2,
    asymMean: 2.0,
    avgBrMean: 100,
    // Kontras pita mata ternormalisasi saat verifikasi (m025-565). 0 = belum diketahui
    // (profil lama yang dipulihkan) → ambang ujian memakai batas atas yang aman.
    dipNMean: 0
  };

  function resetEnrolledProfile() {
    enrolledProfile.valid = false;
    enrolledProfile.sampleCount = 0;
    enrolledProfile.cbMean = 0;
    enrolledProfile.crMean = 0;
    enrolledProfile.cbMin = 70;
    enrolledProfile.cbMax = 145;
    enrolledProfile.crMin = 125;
    enrolledProfile.crMax = 185;
    enrolledProfile.normRMean = 0.40;
    enrolledProfile.normBMean = 0.25;
    enrolledProfile.boxWMean = 30;
    enrolledProfile.boxHMean = 36;
    enrolledProfile.skinCountMean = 350;
    enrolledProfile.cXMean = 32;
    enrolledProfile.cYMean = 24;
    enrolledProfile.eyeDipMean = 1.2;
    enrolledProfile.asymMean = 2.0;
    enrolledProfile.avgBrMean = 100;
    enrolledProfile.dipNMean = 0;
  }

  /**
   * Pulihkan profil dari state ujian yang disimpan (memuat ulang halaman di tengah ujian).
   * Hanya kunci numerik yang dikenal dan bernilai hingga; bentuk lain diabaikan.
   */
  function applyProfile(p) {
    if (!p || typeof p !== 'object') return false;
    for (var i = 0; i < PROFILE_KEYS.length; i++) {
      var k = PROFILE_KEYS[i], v = Number(p[k]);
      if (p[k] !== undefined && isFinite(v)) enrolledProfile[k] = v;
    }
    if (p.valid === true && enrolledProfile.sampleCount > 0 && enrolledProfile.cbMean > 0 && enrolledProfile.crMean > 0) {
      enrolledProfile.valid = true;
    }
    return enrolledProfile.valid;
  }

  function lockEnrollment() {
    if (enrolledProfile.sampleCount <= 0) return;
    enrolledProfile.valid = true;
    enrolledProfile.cbMin = Math.max(60, enrolledProfile.cbMean - 25);
    enrolledProfile.cbMax = Math.min(155, enrolledProfile.cbMean + 25);
    enrolledProfile.crMin = Math.max(115, enrolledProfile.crMean - 25);
    enrolledProfile.crMax = Math.min(195, enrolledProfile.crMean + 25);
  }

  function accumulateProfile(frameRes) {
    if (!frameRes.avgSkinCb || !frameRes.avgSkinCr) return;
    var n = enrolledProfile.sampleCount;
    function mix(cur, v) { return n === 0 ? v : (cur * n + v) / (n + 1); }
    enrolledProfile.cbMean = mix(enrolledProfile.cbMean, frameRes.avgSkinCb);
    enrolledProfile.crMean = mix(enrolledProfile.crMean, frameRes.avgSkinCr);
    enrolledProfile.normRMean = mix(enrolledProfile.normRMean, frameRes.avgSkinNormR || 0.40);
    enrolledProfile.normBMean = mix(enrolledProfile.normBMean, frameRes.avgSkinNormB || 0.25);
    enrolledProfile.boxWMean = mix(enrolledProfile.boxWMean, frameRes.boxW);
    enrolledProfile.boxHMean = mix(enrolledProfile.boxHMean, frameRes.boxH);
    enrolledProfile.skinCountMean = mix(enrolledProfile.skinCountMean, frameRes.skinCount);
    enrolledProfile.cXMean = mix(enrolledProfile.cXMean, frameRes.cX);
    enrolledProfile.cYMean = mix(enrolledProfile.cYMean, frameRes.cY);
    enrolledProfile.eyeDipMean = mix(enrolledProfile.eyeDipMean, frameRes.eyeDip);
    enrolledProfile.asymMean = mix(enrolledProfile.asymMean, frameRes.asym);
    enrolledProfile.avgBrMean = mix(enrolledProfile.avgBrMean, frameRes.avgBr);
    enrolledProfile.dipNMean = mix(enrolledProfile.dipNMean, frameRes.dipN || 0);
    enrolledProfile.sampleCount = n + 1;
  }

  // Debounce temporal berbasis JAM, bukan hitungan bingkai (dulu 8 bingkai x 250 ms — dan
  // tick yang diperlambat peramban membuat "2 dtk" jadi 8 dtk). Wajah dianggap hilang hanya
  // bila tidak ada kehadiran TERKONFIRMASI sejak bingkai gagal pertama:
  // - onAbsent setelah ABSENT_DEBOUNCE_MS, peringatan setelah WARN_THRESHOLD_MS, episode
  //   setelah ABSENT_THRESHOLD_MS — semuanya dihitung dari bingkai gagal PERTAMA;
  // - satu bingkai "hadir" di tengah kehilangan harus dikonfirmasi bingkai hadir kedua dalam
  //   CONFIRM_PRESENT_MS. Satu kilasan lolos (kardus yang sesaat mirip wajah) tidak lagi
  //   memutar balik jam; satu-dua bingkai gagal (lag, blur) tidak pernah memicu apa pun.
  var ABSENT_DEBOUNCE_MS = 2000;
  var CONFIRM_PRESENT_MS = 1500;

  var state = {
    active: false,
    stream: null,
    videoEl: null,
    canvasEl: null,
    ctx: null,
    timer: null,
    detector: null,
    absentSince: 0,
    firstMissAt: 0,
    lastHitAt: 0,
    warned: false,
    lastNativeFace: false,
    lastNativeFaceTime: 0,
    options: null,
    gen: 0,
    constraints: null,
    freeze: { sig: null, t: 0, since: 0 },
    reacquiring: false,
    lastReacquireAt: 0,
    reacquireFails: 0,
    cameraLost: false
  };

  function isSupported() {
    try {
      return !!(typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    } catch (_) {
      return false;
    }
  }

  function createDetector() {
    try {
      if (typeof root !== 'undefined' && typeof root.FaceDetector === 'function') {
        return new root.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
      }
      if (typeof window !== 'undefined' && typeof window.FaceDetector === 'function') {
        return new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
      }
    } catch (_) {}
    return null;
  }

  // Buffer temporal untuk evaluasi kelangsungan hidup (anti-wallpaper, anti-kertas diam, anti-layar)
  var temporalHistory = [];
  var MAX_TEMPORAL_FRAMES = 8;
  var STATIC_PHOTO_MAX_MAE = 0.85;

  /**
   * Deteksi Artefak Layar Digital & Glare Kaca (Anti-Phone Screen & Anti-Laptop).
   */
  function detectScreenArtifacts(d, w, minY, maxY, rMin, rMax) {
    // Hanya di dalam SILUET wajah (rentang kulit per baris), bukan kotak persegi: sudut kotak
    // di luar oval wajah berisi latar — jendela terang di belakang murid (backlight) dulu
    // terhitung "silau kaca layar" dan murid dituduh memakai foto di layar HP.
    var glareCount = 0, area = 0;
    for (var y = minY; y <= maxY; y++) {
      if (rMax[y] < rMin[y]) continue;
      for (var x = rMin[y]; x <= rMax[y]; x++) {
        var idx = (y * w + x) * 4;
        var r = d[idx], g = d[idx + 1], b = d[idx + 2];
        area++;
        // Glass Specular Glare: pantulan lampu intensif pada kaca layar HP / laptop
        // R, G, B > 235 dengan saturasi mendekati nol (|R-G| <= 10, |G-B| <= 10, |R-B| <= 10)
        if (r > 235 && g > 235 && b > 235 && Math.abs(r - g) <= 10 && Math.abs(g - b) <= 10 && Math.abs(r - b) <= 10) {
          glareCount++;
        }
      }
    }
    // Glare kaca layar: pantulan cermin kaca layar menutupi area signifikan (>= 25 px dan >= 7% area wajah)
    var hasGlassGlare = (glareCount >= 25 && area > 0 && (glareCount / area) >= 0.07);
    return { isScreen: hasGlassGlare, hasGlassGlare: hasGlassGlare, hasBacklightBleed: false, hasMoire: false };
  }

  function recordTemporalFrame(now, cX, cY, boxW, boxH, eyeDip, asym, Ygrid, w, h) {
    if (temporalHistory.length > 0) {
      var last = temporalHistory[temporalHistory.length - 1];
      if (now - last.t < 100) return; // hindari buffer flooding pada pemindaian cepat
    }
    var sig = new Float32Array(192);
    var stepX = w / 16;
    var stepY = h / 12;
    for (var sy = 0; sy < 12; sy++) {
      for (var sx = 0; sx < 16; sx++) {
        var px = Math.min(w - 1, Math.floor(sx * stepX));
        var py = Math.min(h - 1, Math.floor(sy * stepY));
        sig[sy * 16 + sx] = Ygrid[py * w + px];
      }
    }

    temporalHistory.push({
      t: now,
      cX: cX,
      cY: cY,
      boxW: boxW,
      boxH: boxH,
      eyeDip: eyeDip,
      asym: asym,
      sig: sig
    });

    while (temporalHistory.length > 24 || (temporalHistory.length > 1 && (now - temporalHistory[0].t) > 4000)) {
      temporalHistory.shift();
    }
  }

  function checkTemporalLiveness(now) {
    if (temporalHistory.length < 4) {
      return { isStatic: false, isRigidWobble: false, isSpoof: false, span: 0 };
    }

    var oldest = temporalHistory[0];
    var newest = temporalHistory[temporalHistory.length - 1];
    var timeSpan = newest.t - oldest.t;

    var totalMae = 0;
    var comparisons = 0;
    var dipSum = 0;
    for (var i = 1; i < temporalHistory.length; i++) {
      var prevSig = temporalHistory[i - 1].sig;
      var curSig = temporalHistory[i].sig;
      var fMae = 0;
      for (var k = 0; k < 192; k++) {
        fMae += Math.abs(curSig[k] - prevSig[k]);
      }
      fMae /= 192;
      totalMae += fMae;
      comparisons++;
      dipSum += temporalHistory[i].eyeDip;
    }
    var avgMae = comparisons > 0 ? (totalMae / comparisons) : 3.0;

    var avgDip = dipSum / (temporalHistory.length - 1);
    var dipVar = 0;
    for (var i = 1; i < temporalHistory.length; i++) {
      var diff = temporalHistory[i].eyeDip - avgDip;
      dipVar += diff * diff;
    }
    dipVar /= (temporalHistory.length - 1);

    var isStatic = (timeSpan >= TEMPORAL_MIN_SPAN_MS && avgMae < 0.28 && dipVar < 0.035);

    var asymChange = 0;
    var maxDx = 0, maxDy = 0;
    for (var i = 1; i < temporalHistory.length; i++) {
      var dAsym = Math.abs(temporalHistory[i].asym - temporalHistory[i - 1].asym);
      if (dAsym > asymChange) asymChange = dAsym;
      var dx = Math.abs(temporalHistory[i].cX - temporalHistory[i - 1].cX);
      var dy = Math.abs(temporalHistory[i].cY - temporalHistory[i - 1].cY);
      if (dx > maxDx) maxDx = dx;
      if (dy > maxDy) maxDy = dy;
    }

    var isRigidWobble = (timeSpan >= TEMPORAL_MIN_SPAN_MS && (maxDx >= 1.0 || maxDy >= 1.0) && asymChange < 0.8 && dipVar < 0.02);

    return {
      isStatic: isStatic,
      isRigidWobble: isRigidWobble,
      isSpoof: isStatic,
      span: timeSpan
    };
  }

  /* ==========================================================================
   * ANALISIS BINGKAI 64x48 (m025-565)
   * --------------------------------------------------------------------------
   * Probe tools/dev/probe-face-robustness.mjs (kamera sintetis 3D, tools/face-synth.js)
   * membuktikan mesin m025-563 menolak 35 dari 37 wajah sungguhan — termasuk wajah frontal
   * biasa — karena tiga cacat lokalisasi, bukan karena ambang yang kurang longgar:
   *
   * 1. RAMBUT HITAM DIHITUNG KULIT. Cabang "kulit redup" (yLum < 60) menerima piksel hangat
   *    gelap apa pun, dan rambut hitam (≈ 42,35,32) memang hangat. Kotak kulit membengkak
   *    sampai ubun-ubun, jendela dahi jatuh di rambut, eyeDip negatif → ditolak.
   *    Kini kulit dinormalisasi terhadap terang & saturasi-relatif klaster kulit di bingkai
   *    itu sendiri: rambut tetap gelap & pucat relatif terhadap kulit di cahaya apa pun.
   * 2. KOTAK = SEMUA PIKSEL KULIT DI BINGKAI. Kusen pintu / lemari kayu di tepi, leher yang
   *    terlihat, dan seragam cokelat ikut melebarkan/memanjangkan kotak. Kini kotak = komponen
   *    terhubung kulit yang paling besar & paling tengah, dipotong di dagu (lebar baris
   *    menyempit ke leher).
   * 3. JENDELA HAAR PROPORSI TETAP. Poni, kerudung, dan kepala menunduk menggeser letak mata
   *    di dalam kotak, sehingga jendela "dahi" jatuh di mata dan jendela "mata" jatuh di
   *    hidung. Kini pita mata DICARI: lembah lokal (dahi → alis/mata → pipi) di dua kolom
   *    mata, dibandingkan dengan baris kulit tercerah di bawahnya. Kontrasnya dinormalisasi
   *    terhadap terang kulit (dipN), jadi wajah redup dan wajah backlight dinilai sama.
   *
   * Permukaan bukan-wajah (kardus, dinding, meja) tidak punya pita gelap yang diapit kulit
   * terang; telapak tangan punya "pita" di sela jari tetapi tanpa struktur wajah bawah;
   * buku/kardus yang didekatkan lebih lebar dari 70% bingkai. Silau layar dihitung di dalam
   * siluet wajah saja (dulu jendela terang di belakang murid = "foto di layar HP").
   * ========================================================================== */
  var FW = 64, FH = 48, FN = FW * FH;
  // Model kulit universal bebas-cahaya: sudut rona (hue) & saturasi relatif di bidang CbCr.
  var SKIN_HUE_MIN = 100, SKIN_HUE_MAX = 158, SKIN_SAT_MIN = 0.05, SKIN_SAT_MAX = 0.75;
  // Kontras pita mata minimum (dipN = (pipi − pita mata) / terang kulit).
  var DIP_MIN_UNIVERSAL = 0.05;
  var DIP_MIN_ENROLLED_FLOOR = 0.03;
  var DIP_MIN_ENROLLED_CEIL = 0.05;
  // Pita mata di bawah ini baru dipercaya bila ada struktur wajah bawah (MOUTH_MIN_N).
  var STRONG_BAND_N = 0.25, MOUTH_MIN_N = 0.15;
  // Rasio tinggi/lebar kotak terhadap profil di atas ini = wajah tampak samping.
  var TURNED_ASPECT_RATIO = 1.4;
  // Buffer dipakai ulang tiap bingkai — tanpa alokasi per tick (GC ponsel murah).
  var bufY = new Float32Array(FN), bufSat = new Float32Array(FN), bufCb = new Float32Array(FN), bufCr = new Float32Array(FN);
  var bufCand = new Uint8Array(FN), bufMask = new Uint8Array(FN), bufLabel = new Int32Array(FN), bufQueue = new Int32Array(FN);
  var histY = new Uint32Array(64), histS = new Uint32Array(80);
  var rowMin = new Int32Array(FH), rowMax = new Int32Array(FH), rowCnt = new Int32Array(FH), rowSm = new Float32Array(FH), rowRaw = new Float32Array(FH);
  var rowSkin = new Float32Array(FH), rowCen = new Float32Array(FH);

  function histPick(hist, total, p) {
    var target = total * p, acc = 0;
    for (var i = 0; i < hist.length; i++) { acc += hist[i]; if (acc >= target) return i + 0.5; }
    return hist.length - 0.5;
  }

  /** Satu readback kanvas per tick. */
  function grabPixels(video, ctx) {
    ctx.drawImage(video, 0, 0, FW, FH);
    return ctx.getImageData(0, 0, FW, FH).data;
  }

  /** 192 titik luminans (grid 16x12) dari data yang sudah diambil — tanpa readback kedua. */
  function signatureOf(d) {
    var sig = new Float32Array(192);
    for (var sy = 0; sy < 12; sy++) {
      for (var sx = 0; sx < 16; sx++) {
        var i = ((sy * 4) * FW + sx * 4) * 4;
        sig[sy * 16 + sx] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      }
    }
    return sig;
  }

  function analyzeFrame(video, canvas, ctx, nativeBox) {
    if (!video || !canvas || !ctx) return { present: false, isSpoof: false };
    if (video.readyState < 2) return { present: false, isSpoof: false };
    try {
      return analyzePixels(grabPixels(video, ctx));
    } catch (_) {
      return { present: false, isSpoof: false, reason: 'error' };
    }
  }

  function analyzePixels(d) {
    var w = FW, h = FH, i, x, y;
    if (!d || d.length < FN * 4) return { present: false, isSpoof: false, reason: 'error' };

    // --- 1. Luminans, krominans, kandidat kulit (rona & saturasi relatif, bebas eksposur).
    var totalY = 0, minBr = 255, maxBr = 0;
    for (i = 0; i < FN; i++) {
      var o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2];
      var yl = 0.299 * r + 0.587 * g + 0.114 * b;
      var cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      var cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      bufY[i] = yl; bufCb[i] = cb; bufCr[i] = cr;
      totalY += yl;
      if (yl < minBr) minBr = yl;
      if (yl > maxBr) maxBr = yl;
      var cbn = cb - 128, crn = cr - 128;
      var sat = yl > 1 ? Math.sqrt(cbn * cbn + crn * crn) / yl : 0;
      bufSat[i] = sat;
      var cand = 0;
      if (!(r > 240 && g > 240 && b > 240) && yl >= 8 && yl <= 238 && r >= b && crn > 0 && sat >= SKIN_SAT_MIN && sat <= SKIN_SAT_MAX) {
        var hue = Math.atan2(crn, cbn) * 57.29578;
        if (hue >= SKIN_HUE_MIN && hue <= SKIN_HUE_MAX) cand = 1;
      }
      bufCand[i] = cand;
    }
    var avgBr = totalY / FN;
    var contrastRange = maxBr - minBr;

    // Kamera tertutup rapat (hitam / gelap pekat) & silau ekstrem tanpa kontras.
    if (avgBr < 8) return { present: false, isSpoof: false, reason: 'camera_covered' };
    if (avgBr > 245 && contrastRange < 10) return { present: false, isSpoof: false, reason: 'blinding_glare' };

    // --- 2. Klaster kulit bingkai ini. Rambut panjang, dinding krem, atau dinding putih di
    //        bawah lampu kuning ikut lolos uji rona — tetapi saturasi relatifnya jauh di bawah
    //        kulit. Bila kandidat terbelah dua klaster saturasi (Otsu), klaster atas = kulit.
    //        Terang acuan (Ys) & saturasi acuan (Ss) diambil dari klaster itu.
    histS.fill(0);
    var nC = 0, k;
    for (y = 2; y < h - 2; y++) {
      for (x = 6; x < w - 6; x++) {
        i = y * w + x;
        if (bufCand[i]) { histS[Math.min(79, Math.floor(bufSat[i] * 100))]++; nC++; }
      }
    }
    if (nC < 12) return { present: false, isSpoof: false, reason: 'skin_count_out_of_range', avgBr: avgBr };
    var sumAll = 0, sq = 0;
    for (k = 0; k < 80; k++) sumAll += k * histS[k];
    var meanAll = sumAll / nC;
    for (k = 0; k < 80; k++) sq += histS[k] * (k - meanAll) * (k - meanAll);
    var varAll = sq / nC, w0 = 0, s0 = 0, bestB = 0, bestT = -1, bm0 = 0, bm1 = 0, bn1 = 0;
    for (k = 0; k < 79; k++) {
      w0 += histS[k]; s0 += k * histS[k];
      var w1n = nC - w0;
      if (!w0) continue;
      if (!w1n) break;
      var m0 = s0 / w0, m1 = (sumAll - s0) / w1n;
      var bvar = (w0 / nC) * (w1n / nC) * (m0 - m1) * (m0 - m1);
      if (bvar > bestB) { bestB = bvar; bestT = k; bm0 = m0; bm1 = m1; bn1 = w1n; }
    }
    var satCut = 0;
    if (bestT >= 0 && varAll > 0 && bestB / varAll >= 0.75 && bm1 >= 1.5 * Math.max(1, bm0) && bn1 >= 15) satCut = (bestT + 1) / 100;
    var Ys = 0, Ss = 0, best = 0, bestArea = 0, bMinX = 0, bMaxX = 0, bMinY = 0, bMaxY = 0;
    segment(satCut);
    // Di bingkai redup derau kroma bisa membuat Otsu memotong kulit wajah sendiri jadi
    // serpihan. Pemisahan hanya dipertahankan bila masih menyisakan gumpalan yang layak.
    if (satCut > 0 && bestArea < 40) segment(0);

    function segment(cut) {
      histY.fill(0);
      var nY0 = 0;
      for (y = 2; y < h - 2; y++) {
        for (x = 6; x < w - 6; x++) {
          i = y * w + x;
          if (bufCand[i] && bufSat[i] >= cut) { histY[Math.min(63, bufY[i] >> 2)]++; nY0++; }
        }
      }
      // Jangkar terang di persentil-85: di ruangan redup berlampu kuning, derau latar gelap yang
      // hangat bisa 80% kandidat — persentil-60 dulu jatuh di latar (Ys 18, wajah Y 90).
      var ys0 = histPick(histY, nY0, 0.85) * 4;
      histS.fill(0);
      histY.fill(0);
      var nS = 0, nY = 0;
      for (y = 2; y < h - 2; y++) {
        for (x = 6; x < w - 6; x++) {
          i = y * w + x;
          if (!bufCand[i] || bufSat[i] < cut) continue;
          if (bufY[i] >= 0.6 * ys0) { histS[Math.min(79, Math.floor(bufSat[i] * 100))]++; nS++; }
          if (bufY[i] >= 0.5 * ys0) { histY[Math.min(63, bufY[i] >> 2)]++; nY++; }
        }
      }
      Ss = nS >= 6 ? histPick(histS, nS, 0.5) / 100 : 0.15;
      Ys = nY > 0 ? histPick(histY, nY, 0.5) * 4 : ys0;

      // --- 3. Masker kulit final: rambut hitam, kayu gelap, bayangan pucat dibuang relatif Ys/Ss.
      var yHi = Math.min(238, 1.8 * Ys + 25), yLo = 0.3 * Ys, yMid = 0.5 * Ys;
      var sLo = Math.max(cut, (Ys >= 60 ? 0.5 : 0.3) * Ss), sMid = 0.75 * Ss;
      for (i = 0; i < FN; i++) {
        var yv = bufY[i], sv = bufSat[i];
        bufMask[i] = (bufCand[i] && yv <= yHi && yv >= yLo && sv >= sLo && (yv >= yMid || sv >= sMid)) ? 1 : 0;
        bufLabel[i] = 0;
      }

      // --- 4. Komponen terhubung: pilih gumpalan kulit terbesar yang paling dekat ke tengah.
      var bestScore = 0, label = 0;
      best = 0; bestArea = 0;
      for (i = 0; i < FN; i++) {
        if (!bufMask[i] || bufLabel[i]) continue;
        label++;
        var head = 0, tail = 0, area = 0, sx = 0, sy = 0, mnx = w, mxx = 0, mny = h, mxy = 0;
        bufQueue[tail++] = i; bufLabel[i] = label;
        while (head < tail) {
          var p = bufQueue[head++], px = p % w, py = (p - px) / w;
          area++; sx += px; sy += py;
          if (px < mnx) mnx = px; if (px > mxx) mxx = px; if (py < mny) mny = py; if (py > mxy) mxy = py;
          if (px > 0 && bufMask[p - 1] && !bufLabel[p - 1]) { bufLabel[p - 1] = label; bufQueue[tail++] = p - 1; }
          if (px < w - 1 && bufMask[p + 1] && !bufLabel[p + 1]) { bufLabel[p + 1] = label; bufQueue[tail++] = p + 1; }
          if (py > 0 && bufMask[p - w] && !bufLabel[p - w]) { bufLabel[p - w] = label; bufQueue[tail++] = p - w; }
          if (py < h - 1 && bufMask[p + w] && !bufLabel[p + w]) { bufLabel[p + w] = label; bufQueue[tail++] = p + w; }
        }
        var dist = Math.sqrt(Math.pow(sx / area - 32, 2) + Math.pow(sy / area - 24, 2));
        var score = area * (1 - 0.5 * Math.min(1, dist / 40));
        if (score > bestScore) { bestScore = score; best = label; bestArea = area; bMinX = mnx; bMaxX = mxx; bMinY = mny; bMaxY = mxy; }
      }
    }
    if (!best || bestArea < 6) return { present: false, isSpoof: false, reason: 'skin_count_out_of_range', avgBr: avgBr };

    // --- 5. Kotak wajah: dari ubun-kulit (dahi/garis rambut/tepi kerudung) sampai dagu.
    for (y = bMinY; y <= bMaxY; y++) { rowMin[y] = w; rowMax[y] = -1; rowCnt[y] = 0; }
    for (y = bMinY; y <= bMaxY; y++) {
      for (x = bMinX; x <= bMaxX; x++) {
        if (bufLabel[y * w + x] === best) {
          rowCnt[y]++;
          if (x < rowMin[y]) rowMin[y] = x;
          if (x > rowMax[y]) rowMax[y] = x;
        }
      }
    }
    var top = bMinY, faceBottom = bMaxY, maxW = 0, maxWRow = bMinY;
    for (y = bMinY; y <= bMaxY; y++) {
      var rw = rowCnt[y] ? rowMax[y] - rowMin[y] + 1 : 0;
      if (rw > maxW) { maxW = rw; maxWRow = y; }
      // Dagu → leher: lebar baris turun di bawah 62% lebar wajah dua baris berturut-turut.
      if (y > maxWRow && rw <= 0.62 * maxW && y + 1 <= bMaxY) {
        var rw2 = rowCnt[y + 1] ? rowMax[y + 1] - rowMin[y + 1] + 1 : 0;
        if (rw2 <= 0.62 * maxW) { faceBottom = y - 1; break; }
      }
    }
    faceBottom = Math.max(top, Math.min(faceBottom, top + Math.round(1.6 * maxW)));
    var minX = w, maxX = -1, minY = top, maxY = faceBottom;
    var skinCount = 0, sumX = 0, sumY = 0, centerSkin = 0;
    var skinSumCb = 0, skinSumCr = 0, skinSumNormR = 0, skinSumNormB = 0;
    for (y = top; y <= faceBottom; y++) {
      for (x = bMinX; x <= bMaxX; x++) {
        i = y * w + x;
        if (bufLabel[i] !== best) continue;
        skinCount++; sumX += x; sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (x >= 16 && x <= 48 && y >= 8 && y <= 40) centerSkin++;
        skinSumCb += bufCb[i]; skinSumCr += bufCr[i];
        var o2 = i * 4, s3 = d[o2] + d[o2 + 1] + d[o2 + 2];
        if (s3 > 0) { skinSumNormR += d[o2] / s3; skinSumNormB += d[o2 + 2] / s3; }
      }
    }
    if (!skinCount) return { present: false, isSpoof: false, reason: 'skin_count_out_of_range', avgBr: avgBr };
    var skinInCenterFraction = centerSkin / skinCount;
    var avgSkinCb = skinSumCb / skinCount, avgSkinCr = skinSumCr / skinCount;
    var avgSkinNormR = skinSumNormR / skinCount, avgSkinNormB = skinSumNormB / skinCount;
    var cX = Math.round(sumX / skinCount), cY = Math.round(sumY / skinCount);
    var boxW = (maxX - minX) + 1, boxH = (maxY - minY) + 1;
    var geo = { avgBr: avgBr, skinBr: Ys, skinCount: skinCount, cX: cX, cY: cY, boxW: boxW, boxH: boxH };
    function reject(reason, extra) {
      var out = { present: false, isSpoof: false, reason: reason };
      for (var k in geo) out[k] = geo[k];
      if (extra) for (var k2 in extra) out[k2] = extra[k2];
      return out;
    }

    // --- 6. Jumlah piksel kulit wajar (toleransi jarak maju/mundur).
    var minSkinReq = enrolledProfile.valid ? Math.max(12, Math.round(enrolledProfile.skinCountMean * 0.15)) : (avgBr < 40 ? 25 : 35);
    var maxSkinReq = enrolledProfile.valid ? Math.min(2800, Math.round(enrolledProfile.skinCountMean * 4.2)) : 2400;
    if (skinCount < minSkinReq || skinCount > maxSkinReq) return reject('skin_count_out_of_range');

    // --- 7. Konsentrasi & posisi wajah di area kamera (toleransi sudut/kemiringan HP).
    var minCenterFraction = enrolledProfile.valid ? 0.10 : 0.25;
    if (skinInCenterFraction < minCenterFraction) return reject('not_centered');
    var minCX = enrolledProfile.valid ? 2 : 6, maxCX = enrolledProfile.valid ? 62 : 58;
    var minCY = enrolledProfile.valid ? 2 : 4, maxCY = enrolledProfile.valid ? 46 : 44;
    if (cX < minCX || cX > maxCX || cY < minCY || cY > maxCY) return reject('centroid_out_of_bounds');

    // --- 8. Proporsi kotak.
    if (boxW < 5 || boxH < 5) return reject('box_too_small');
    var aspect = boxH / boxW;
    if (aspect < 0.35 || aspect > 3.6) return reject('aspect_ratio_invalid');

    // --- 9. Tekstur mikro (gradien) di area wajah — permukaan rata tanpa tepi ditolak.
    var gradSum = 0, gradCount = 0, maxLocalGrad = 0;
    var gy1 = Math.max(1, minY), gy2 = Math.min(h - 2, maxY);
    var gx1 = Math.max(1, minX), gx2 = Math.min(w - 2, maxX);
    for (var gy = gy1; gy <= gy2; gy++) {
      for (var gx = gx1; gx <= gx2; gx++) {
        var gMag = Math.abs(bufY[gy * w + gx + 1] - bufY[gy * w + gx - 1]) + Math.abs(bufY[(gy + 1) * w + gx] - bufY[(gy - 1) * w + gx]);
        gradSum += gMag; gradCount++;
        if (gMag > maxLocalGrad) maxLocalGrad = gMag;
      }
    }
    var avgGrad = gradCount > 0 ? (gradSum / gradCount) : 0;
    if (avgGrad < 2.0 && maxLocalGrad < 14) return reject('flat_texture');

    // --- 10. Pita mata: lembah gelap (alis + rongga mata) di kolom mata, diapit baris lebih
    //         terang. Profil baris dihitung HANYA di dua jendela mata — tulang hidung di
    //         tengah tidak ikut mengencerkan kontrasnya.
    var lx1 = minX + Math.round(boxW * 0.10), lx2 = minX + Math.round(boxW * 0.42);
    var rx1 = maxX - Math.round(boxW * 0.42), rx2 = maxX - Math.round(boxW * 0.10);
    if (rx1 <= lx2) rx1 = lx2 + 1;
    var cx1 = minX + Math.round(boxW * 0.3), cx2 = maxX - Math.round(boxW * 0.3);
    for (y = minY; y <= maxY; y++) {
      var es = 0, en = 0, sk = 0, cs = 0, cn = 0;
      for (x = lx1; x <= lx2; x++) { es += bufY[y * w + x]; en++; if (bufLabel[y * w + x] === best) sk++; }
      for (x = rx1; x <= rx2; x++) { es += bufY[y * w + x]; en++; if (bufLabel[y * w + x] === best) sk++; }
      for (x = cx1; x <= cx2; x++) { cs += bufY[y * w + x]; cn++; }
      rowRaw[y] = en ? es / en : 0;
      rowSkin[y] = en ? sk / en : 0;
      rowCen[y] = cn ? cs / cn : 0;
    }
    for (y = minY; y <= maxY; y++) {
      rowSm[y] = (rowRaw[Math.max(minY, y - 1)] + 2 * rowRaw[y] + rowRaw[Math.min(maxY, y + 1)]) / 4;
    }
    var span = Math.max(2, Math.round(boxW * 0.25));
    var searchEnd = Math.min(maxY - 2, minY + Math.round(boxW * 0.72));
    // Acuan terang hanya dari baris yang memang KULIT (pipi, dahi) — garis judul putih di
    // sampul buku atau kardus berlabel tidak boleh menjadi "pipi".
    function peakBelow(yy) { var m = -Infinity; for (var k = yy + 1; k <= Math.min(maxY, yy + span); k++) if (rowSkin[k] >= 0.5 && rowSm[k] > m) m = rowSm[k]; return m; }
    function peakAbove(yy) { var m = -Infinity; for (var k = Math.max(minY, yy - span); k < yy; k++) if (rowSkin[k] >= 0.5 && rowSm[k] > m) m = rowSm[k]; return m; }
    // Minimum lokal interior (dahi → mata → pipi). Baris paling atas sengaja dilewati: di sana
    // garis rambut / tepi kerudung selalu gelap, dan dulu tepi itulah yang terbaca sebagai "mata".
    var eyeRow = -1, bestDip = -Infinity, atTop = false;
    for (y = minY + 1; y <= searchEnd; y++) {
      if (rowSm[y] > rowSm[y - 1] || rowSm[y] > rowSm[y + 1]) continue;
      if (peakAbove(y) <= rowSm[y]) continue;
      var dB = peakBelow(y) - rowSm[y];
      if (dB > bestDip) { bestDip = dB; eyeRow = y; }
    }
    // Poni / kerudung rendah: alis & mata menempel di tepi atas kulit, tidak ada dahi di atasnya.
    var topDip = peakBelow(minY) - rowSm[minY];
    if (eyeRow < 0 || (bestDip < 0.5 * topDip && bestDip / Math.max(20, Ys) < DIP_MIN_UNIVERSAL)) {
      if (topDip > bestDip) { eyeRow = minY; bestDip = topDip; atTop = true; }
    }
    var dipN = 0, eyeDip = 0, bandY = 0, belowY = 0, aboveY = null, mouthDipN = null;
    var eLAvg = 0, eRAvg = 0, asym = 0;
    if (eyeRow >= 0) {
      bandY = rowSm[eyeRow];
      belowY = peakBelow(eyeRow);
      if (!atTop) aboveY = peakAbove(eyeRow);
      dipN = (belowY - bandY) / Math.max(20, Ys);
      eyeDip = (belowY - bandY) + (aboveY !== null ? Math.max(0, aboveY - bandY) : 0);
      // Struktur wajah bawah: di kolom tengah, di bawah pita mata, ada baris yang jauh lebih
      // gelap dari batang hidung (bayangan bawah hidung, bibir, bawah dagu). Telapak tangan
      // justru paling terang di tengahnya (lekuk ≈ 0 atau negatif). Lembah mulut lokal saja
      // terlalu halus di 64x48 (±0,07) — diukur, ditolak sebagai penentu.
      var mStart = eyeRow + Math.max(2, Math.round(boxW * 0.25)), mEnd = Math.min(maxY, eyeRow + Math.round(boxW * 0.9));
      var mMin = Infinity, mRow = -1;
      for (y = mStart; y <= mEnd; y++) if (rowCen[y] < mMin) { mMin = rowCen[y]; mRow = y; }
      if (mRow > eyeRow + 1) {
        var nosePeak = -Infinity;
        for (y = eyeRow + 1; y < mRow; y++) if (rowCen[y] > nosePeak) nosePeak = rowCen[y];
        mouthDipN = (nosePeak - mMin) / Math.max(20, Ys);
      }
      var ls = 0, ln = 0, rs2 = 0, rn = 0;
      for (y = Math.max(minY, eyeRow - 1); y <= Math.min(maxY, eyeRow + 1); y++) {
        for (x = lx1; x <= lx2; x++) { ls += bufY[y * w + x]; ln++; }
        for (x = rx1; x <= rx2; x++) { rs2 += bufY[y * w + x]; rn++; }
      }
      eLAvg = ln ? ls / ln : bandY;
      eRAvg = rn ? rs2 / rn : bandY;
      asym = Math.abs(eLAvg - eRAvg);
    }
    geo.eyeDip = eyeDip; geo.dipN = dipN; geo.asym = asym; geo.mouthDipN = mouthDipN; geo.eyeRowRel = eyeRow >= 0 ? (eyeRow - minY) / boxW : -1;

    // DISKRIMINATOR WAJAH VS BUKAN WAJAH: kardus, dinding, meja kayu, gorden, telapak tangan,
    // dan buku tidak punya pita gelap yang diapit kulit lebih terang di bawahnya.
    var minDipReq = DIP_MIN_UNIVERSAL;
    if (enrolledProfile.valid) {
      minDipReq = enrolledProfile.dipNMean > 0
        ? Math.max(DIP_MIN_ENROLLED_FLOOR, Math.min(DIP_MIN_ENROLLED_CEIL, enrolledProfile.dipNMean * 0.25))
        : DIP_MIN_ENROLLED_CEIL;
    }
    if (eyeRow < 0 || dipN < minDipReq) return reject('no_facial_features');
    // Pita yang lemah wajib ditemani struktur wajah bawah. Telapak tangan yang menutupi wajah
    // punya "pita" di sela jari, tetapi telapaknya rata (lekuk ≈ 0, paling tinggi 0,124 di
    // probe); wajah sungguhan yang membutuhkannya ≥ 0,197 di semua pose/cahaya probe.
    if (dipN < STRONG_BAND_N && mouthDipN !== null && mouthDipN < MOUTH_MIN_N) return reject('no_facial_features');

    // Benda selebar bingkai (buku/kardus/tangan yang didekatkan) — wajah murid tidak pernah
    // memenuhi > 70% lebar bingkai pada jarak membaca.
    if (boxW > FW * 0.7) return reject('box_too_large');
    // Validasi ukuran terhadap profil murid (menolak permukaan latar yang terlalu masif).
    if (enrolledProfile.valid && enrolledProfile.boxWMean > 0 && boxW > enrolledProfile.boxWMean * 2.6) {
      return reject('box_too_large');
    }
    // Menoleh jauh (wajah tampak samping): lebar kulit menyusut, tingginya tidak. Hanya untuk
    // profil yang dibuat mesin ini (dipNMean > 0) — kotak profil lama berisi rambut.
    if (enrolledProfile.valid && enrolledProfile.dipNMean > 0 && enrolledProfile.boxWMean > 0 && enrolledProfile.boxHMean > 0) {
      var aspectRef = enrolledProfile.boxHMean / enrolledProfile.boxWMean;
      if (aspect > aspectRef * TURNED_ASPECT_RATIO) return reject('face_turned_away');
    }

    // --- 11. Deteksi artefak layar kaca & backlight HP / laptop (anti-spoofing layar).
    var screenCheck = detectScreenArtifacts(d, w, minY, maxY, rowMin, rowMax);
    if (screenCheck.isScreen) {
      return { present: false, isSpoof: true, reason: 'spoof_screen' };
    }

    var now = Date.now();
    recordTemporalFrame(now, cX, cY, boxW, boxH, eyeDip, asym, bufY, w, h);
    // Murid yang sudah terkalibrasi (enrolledProfile.valid) sedang membaca soal dengan tenang di ruang ujian.
    // Bebaskan dari tuduhan foto kertas (spoof_static) hanya karena duduk tenang membaca selama 2 detik.
    if (!enrolledProfile.valid) {
      var tempCheck = checkTemporalLiveness(now);
      if (tempCheck.isSpoof) {
        return { present: false, isSpoof: true, reason: tempCheck.isStatic ? 'spoof_static' : 'spoof_rigid' };
      }
    }

    return {
      present: true,
      isSpoof: false,
      cX: cX,
      cY: cY,
      centroidX: sumX / skinCount,
      centroidY: sumY / skinCount,
      boxW: boxW,
      boxH: boxH,
      eyeDip: eyeDip,
      dipN: dipN,
      mouthDipN: mouthDipN,
      eyeRowRel: (eyeRow - minY) / boxW,
      asym: asym,
      eLAvg: eLAvg,
      eRAvg: eRAvg,
      skinCount: skinCount,
      skinBr: Ys,
      avgBr: avgBr,
      avgSkinCb: avgSkinCb,
      avgSkinCr: avgSkinCr,
      avgSkinNormR: avgSkinNormR,
      avgSkinNormB: avgSkinNormB
    };
  }

  function fallbackCheck(video, canvas, ctx) {
    var res = analyzeFrame(video, canvas, ctx, null);
    return !!(res && res.present && !res.isSpoof);
  }

  function freshFreeze() { return { sig: null, t: 0, since: 0 }; }

  function stopTracks(ms) {
    try { if (ms) ms.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
  }

  /** 'ok' | 'ended' | 'muted'. Stream tanpa API track (peramban lama/mock) dinilai 'ok'. */
  function cameraHealth() {
    var tr = null;
    try { tr = state.stream && typeof state.stream.getVideoTracks === 'function' ? state.stream.getVideoTracks()[0] : null; } catch (_) {}
    if (!tr) return 'ok';
    if (tr.readyState === 'ended') return 'ended';
    if (tr.muted) return 'muted';
    return 'ok';
  }

  /**
   * Satu langkah pelacak beku. Mengembalikan true bila bingkai sudah identik (derau sensor
   * nol) selama >= FROZEN_MS. Kamera hidup — bahkan yang menatap murid yang diam total —
   * tidak pernah menghasilkan 192 titik yang sama persis berdetik-detik; stream yang
   * berhenti (track dibisukan OS, kamera direbut aplikasi lain, kamera virtual gambar diam)
   * menghasilkannya.
   */
  function freezeStep(tracker, sig, now) {
    if (!tracker || !sig) return false;
    if (tracker.sig && tracker.sig.length === sig.length) {
      var diff = 0;
      for (var k = 0; k < sig.length; k++) diff += Math.abs(sig[k] - tracker.sig[k]);
      if (diff < FROZEN_DIFF_SUM) { if (!tracker.since) tracker.since = tracker.t; }
      else tracker.since = 0;
    }
    tracker.sig = sig;
    tracker.t = now;
    return !!tracker.since && (now - tracker.since) >= FROZEN_MS;
  }

  function maybeReacquire() {
    var now = Date.now();
    if (state.reacquiring || now - state.lastReacquireAt < REACQUIRE_GAP_MS || !isSupported()) return;
    state.reacquiring = true;
    state.lastReacquireAt = now;
    var gen = state.gen;
    var p;
    try { p = navigator.mediaDevices.getUserMedia(state.constraints); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(function (ms) {
      state.reacquiring = false;
      if (gen !== state.gen || !state.active) { stopTracks(ms); return; }
      var old = state.stream;
      state.stream = ms;
      stopTracks(old);
      if (state.videoEl) {
        try {
          state.videoEl.srcObject = ms;
          var pp = state.videoEl.play();
          if (pp && typeof pp.catch === 'function') pp.catch(function () {});
        } catch (_) {}
      }
      state.reacquireFails = 0;
      state.cameraLost = false;
      state.freeze = freshFreeze();
      var opts = state.options || {};
      if (typeof opts.onStream === 'function') { try { opts.onStream(ms); } catch (_) {} }
    }).catch(function () {
      state.reacquiring = false;
      if (gen !== state.gen || !state.active) return;
      state.reacquireFails++;
      if (state.reacquireFails >= REACQUIRE_FAILS_LOST && !state.cameraLost) {
        state.cameraLost = true;
        var opts = state.options || {};
        if (typeof opts.onCameraLost === 'function') { try { opts.onCameraLost(); } catch (_) {} }
      }
    });
  }

  function checkFrame() {
    if (!state.active || !state.videoEl) return;
    // Halaman tersembunyi sudah dicatat focus-guard sebagai "keluar layar". Menghitungnya juga
    // sebagai "wajah tak terlihat" melipatgandakan satu kepergian di layar guru.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      state.freeze = freshFreeze();
      // Episode wajah yang sedang berjalan ditutup di titik layar ditinggalkan; sisanya milik
      // focus-guard. Tanpa ini 60 dtk di aplikasi lain terhitung dua kali.
      if (state.absentSince) handleResult(true, true);
      state.firstMissAt = 0;
      return;
    }
    var vid = state.videoEl;
    var health = cameraHealth();
    if (health !== 'ok') {
      state.lastNativeFace = false;
      handleResult(false);
      if (health === 'ended') maybeReacquire();
      return;
    }
    if (vid.readyState < 2) return;

    // SATU readback kanvas per tick: pelacak beku & analisis wajah memakai data yang sama
    // (dulu frameSignature + analyzeFrame = dua drawImage/getImageData tiap 250 ms).
    var data = null;
    try { data = grabPixels(vid, state.ctx); } catch (_) {}
    if (freezeStep(state.freeze, data ? signatureOf(data) : null, Date.now())) {
      state.lastNativeFace = false;
      handleResult(false);
      return;
    }

    if (vid.paused) {
      try {
        var p = vid.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (_) {}
    }

    function cvPresent() {
      var res = data ? analyzePixels(data) : null;
      return !!(res && res.present && !res.isSpoof);
    }

    if (state.detector) {
      try {
        state.detector.detect(vid).then(function (faces) {
          if (faces && faces.length > 0) {
            var f = faces[0].boundingBox || {};
            var vW = vid.videoWidth || 320;
            var midX = (f.x || 0) + (f.width || 0) / 2;
            var isCentered = !f.width || (midX >= vW * 0.15 && midX <= vW * 0.85);
            if (!isCentered) {
              state.lastNativeFace = false;
              handleResult(false);
              return;
            }
            // Jika profil murid sudah terkalibrasi (enrolledProfile.valid), percayai native hardware ML detector
            if (enrolledProfile.valid) {
              state.lastNativeFace = true;
              state.lastNativeFaceTime = Date.now();
              handleResult(true);
              return;
            }
            // CRITICAL ANTI-SPOOFING & LIVENESS GATE (pra-enrollment):
            // Sebelum terkalibrasi, wajib lolos uji anti-layar dan anti-kertas
            var okCv = cvPresent();
            state.lastNativeFace = okCv;
            if (okCv) state.lastNativeFaceTime = Date.now();
            handleResult(okCv);
          } else {
            var ok = cvPresent();
            state.lastNativeFace = ok;
            if (ok) state.lastNativeFaceTime = Date.now();
            handleResult(ok);
          }
        }).catch(function () {
          handleResult(cvPresent());
        });
        return;
      } catch (_) {}
    }

    handleResult(cvPresent());
  }

  /**
   * present: hasil satu sampel. confirmed: kehadiran yang tidak perlu menunggu sampel kedua
   * (periksa ulang manual oleh murid, atau penutupan episode saat halaman disembunyikan).
   */
  function handleResult(present, confirmed) {
    if (!state.active) return;
    var now = Date.now(), opts = state.options || {};

    if (present) {
      var hitOk = confirmed || !state.firstMissAt || (state.lastHitAt && now - state.lastHitAt <= CONFIRM_PRESENT_MS);
      state.lastHitAt = now;
      if (!hitOk) return;
      state.firstMissAt = 0;
      if (state.warned) {
        state.warned = false;
        if (typeof opts.onWarning === 'function') opts.onWarning(false);
      }
      if (state.absentSince) {
        var duration = now - state.absentSince;
        state.absentSince = 0;
        state.episoded = false;
        if (typeof opts.onPresent === 'function') opts.onPresent(duration);
      }
    } else {
      if (!state.firstMissAt) state.firstMissAt = now;
      var elapsed = now - state.firstMissAt;
      if (elapsed >= ABSENT_DEBOUNCE_MS) {
        if (!state.absentSince) {
          state.absentSince = state.firstMissAt;
          state.episoded = false;
          if (typeof opts.onAbsent === 'function') opts.onAbsent(state.absentSince);
        }
        if (elapsed >= WARN_THRESHOLD_MS && !state.warned) {
          state.warned = true;
          if (typeof opts.onWarning === 'function') opts.onWarning(true, elapsed);
        }
        if (elapsed >= ABSENT_THRESHOLD_MS && !state.episoded) {
          state.episoded = true;
          if (typeof opts.onAbsentEpisode === 'function') opts.onAbsentEpisode(elapsed);
        }
      }
    }
  }

  function start(opts) {
    if (state.active || state.pending) {
      if (opts) state.options = Object.assign({}, state.options || {}, opts);
      if (opts && opts.profile && !enrolledProfile.valid && applyProfile(opts.profile)) liveness.verified = true;
      // Panggilan kedua saat getUserMedia masih menunggu: bagikan janji yang sama, jangan
      // membuka stream kedua (stream pertama bocor dan lampu kamera tidak pernah padam).
      if (state.pending) return state.pending;
      state.absentSince = 0;
      state.firstMissAt = 0;
    state.lastHitAt = 0;
      state.warned = false;
      state.episoded = false;
      if (state.videoEl && state.videoEl.paused) {
        try { var p = state.videoEl.play(); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (_) {}
      }
      return Promise.resolve({ ok: true, active: true, stream: state.stream });
    }
    state.options = opts || {};
    state.absentSince = 0;
    state.firstMissAt = 0;
    state.lastHitAt = 0;
    state.warned = false;
    state.episoded = false;
    temporalHistory = [];
    resetLiveness();
    // Ujian yang dimuat ulang: profil hasil verifikasi pra-ujian dipulihkan, supaya murid yang
    // sudah lulus liveness tidak kembali diperiksa dengan model universal yang paranoid.
    if (opts && opts.profile && applyProfile(opts.profile)) liveness.verified = true;
    state.freeze = freshFreeze();
    state.reacquiring = false;
    state.lastReacquireAt = 0;
    state.reacquireFails = 0;
    state.cameraLost = false;

    if (!isSupported()) {
      return Promise.resolve({ ok: false, reason: 'unsupported' });
    }

    state.detector = createDetector();

    var constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 320, max: 640 },
        height: { ideal: 240, max: 480 },
        // Penjaga hanya mengambil 2 sampel/dtk; sensor 30 fps menguras baterai tanpa guna.
        // Hanya 'ideal' (bukan max/exact) supaya kamera yang tidak mendukungnya tidak menolak.
        frameRate: { ideal: 15 }
      },
      audio: false
    };

    state.stopping = false;
    state.constraints = constraints;
    var gen = ++state.gen;
    state.pending = navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
      if (gen === state.gen) state.pending = null;
      // gen berubah = stop() (atau start baru sesudah stop) terjadi selama izin ditunggu.
      if (gen !== state.gen || state.stopping || !state.options) {
        stopTracks(mediaStream);
        return { ok: false, reason: 'aborted' };
      }
      state.stream = mediaStream;
      state.active = true;

      var vid = document.createElement('video');
      vid.setAttribute('playsinline', '');
      vid.setAttribute('webkit-playsinline', '');
      vid.setAttribute('autoplay', '');
      vid.playsInline = true;
      vid.webkitPlaysInline = true;
      vid.muted = true;
      vid.autoplay = true;
      vid.width = 320;
      vid.height = 240;
      vid.style.position = 'fixed';
      vid.style.bottom = '4px';
      vid.style.right = '4px';
      vid.style.width = '24px';
      vid.style.height = '24px';
      vid.style.opacity = '0.005';
      vid.style.pointerEvents = 'none';
      vid.style.zIndex = '99999';
      vid.srcObject = mediaStream;

      function triggerPlay() {
        try {
          var p = vid.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (_) {}
      }
      vid.onloadedmetadata = triggerPlay;
      vid.onloadeddata = triggerPlay;
      vid.oncanplay = triggerPlay;
      document.body.appendChild(vid);
      state.videoEl = vid;
      triggerPlay();

      var cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 48;
      state.canvasEl = cvs;
      state.ctx = cvs.getContext('2d', { willReadFrequently: true });

      state.timer = setInterval(checkFrame, SAMPLE_INTERVAL_MS);
      return { ok: true, active: true, stream: mediaStream };
    }).catch(function (err) {
      if (gen === state.gen) { state.pending = null; state.active = false; }
      return { ok: false, reason: (err && err.name) || 'permission_denied' };
    });
    return state.pending;
  }

  function stop() {
    state.stopping = true;
    state.gen++;
    state.pending = null;
    state.reacquiring = false;
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    if (state.stream) {
      try {
        state.stream.getTracks().forEach(function (t) { t.stop(); });
      } catch (_) {}
      state.stream = null;
    }
    if (state.videoEl) {
      try {
        if (state.videoEl.parentNode) state.videoEl.parentNode.removeChild(state.videoEl);
      } catch (_) {}
      state.videoEl = null;
    }
    state.canvasEl = null;
    state.ctx = null;
    state.active = false;
    state.absentSince = 0;
    state.firstMissAt = 0;
    state.lastHitAt = 0;
    state.warned = false;
    state.episoded = false;
    state.options = null;
    temporalHistory = [];
    resetLiveness();
  }

  function isActive() { return !!state.active; }
  function isWarning() { return !!state.warned; }
  function getStream() { return state.stream; }

  function attachPreview(vidEl) {
    if (!vidEl || !state.stream) return false;
    try {
      if (vidEl.srcObject !== state.stream) {
        vidEl.srcObject = state.stream;
      }
      vidEl.muted = true;
      vidEl.playsInline = true;
      vidEl.autoplay = true;
      if (vidEl.paused) {
        var p = vidEl.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  var liveness = {
    calibrated: false,
    calibTicks: 0,
    calib: [],
    base: null,
    openRef: 0,
    blinkClosing: false,
    blinkCloseStart: 0,
    blinkCount: 0,
    turnRun: 0,
    turnDetected: false,
    steadySince: 0,
    absentTicks: 0,
    verified: false
  };

  function resetLiveness() {
    temporalHistory = [];
    resetEnrolledProfile();
    liveness.calibrated = false;
    liveness.calibTicks = 0;
    liveness.calib = [];
    liveness.base = null;
    liveness.openRef = 0;
    liveness.blinkClosing = false;
    liveness.blinkCloseStart = 0;
    liveness.blinkCount = 0;
    liveness.turnRun = 0;
    liveness.turnDetected = false;
    liveness.steadySince = 0;
    liveness.absentTicks = 0;
    liveness.verified = false;
  }

  function isLivenessVerified() {
    return !!liveness.verified;
  }

  /**
   * Deteksi Kehidupan Biometrik Aktif (Active Liveness Verification).
   * Lulus lewat SALAH SATU: kedipan mata, tolehan kepala 3D, atau diam tenang >= STEADY_HOLD_MS
   * yang jendela temporalnya (>= 2 dtk) masih menunjukkan dinamika hidup.
   *
   * Dua celah yang ditutup di sini (dibuktikan di tests/exam-focus-guard-test.js):
   * - Profil dulu dikunci (enrolledProfile.valid) sesudah 2 tick kalibrasi, dan profil yang
   *   terkunci MEMATIKAN pemeriksaan spoof_static di analyzeFrame. Lalu 22 tick "diam tenang"
   *   (~1,3 dtk pada tick preflight 60 ms) meluluskan foto cetak. Kini profil baru dikunci
   *   SESUDAH liveness lulus, dan diam tenang diukur dengan jam dinding serta wajib lolos uji
   *   temporal (tidak statis, tidak bergoyang kaku seperti kertas di tangan).
   * - "Tolehan" dulu cukup berupa pergeseran centroid >= 4 px — persis yang terjadi saat foto
   *   digeser. Kini tolehan wajib membawa isyarat 3D: perubahan asimetri kedua mata.
   */
  /**
   * Bingkai ini dibaca dari tempat yang sama dengan baseline kalibrasi? Pada wajah kecil
   * (foto cetak, wajah jauh) derau kadang memindahkan pita mata ke baris lain atau mengubah
   * lebar kotak — dulu lompatan itu terbaca sebagai "kedip" atau "toleh" dan foto lolos
   * dalam 240 ms (probe m025-565). Kedip & toleh kini hanya dihitung dari bingkai stabil.
   */
  function sameLocalization(r, base, ignoreEyeRow) {
    if (!base || !r || !(r.boxW > 0)) return false;
    if (Math.abs(r.boxW / base.boxW - 1) > 0.2) return false;
    if (Math.abs(r.cX - base.cX) > 3 || Math.abs(r.cY - base.cY) > 3) return false;
    // Mata terpejam: pita matanya lenyap, jadi barisnya tidak bermakna — cukup gumpalannya.
    if (ignoreEyeRow) return true;
    return typeof r.eyeRowRel !== 'number' || r.eyeRowRel < 0 || Math.abs(r.eyeRowRel - base.eyeRowRel) <= 0.12;
  }

  /**
   * Deteksi Kehidupan Biometrik Aktif (Active Liveness Verification).
   * Lulus lewat SALAH SATU: kedipan mata, tolehan kepala 3D, atau diam tenang >= STEADY_HOLD_MS
   * yang jendela temporalnya (>= 2 dtk) masih menunjukkan dinamika hidup.
   *
   * Dua celah yang ditutup di m025-560 (dibuktikan di tests/exam-focus-guard-test.js):
   * - Profil baru dikunci SESUDAH liveness lulus; diam tenang diukur jam dinding dan wajib
   *   lolos uji temporal (tidak statis, tidak bergoyang kaku seperti kertas di tangan).
   * - "Tolehan" wajib membawa isyarat 3D (perubahan asimetri kedua mata), bukan translasi.
   * m025-565: kedip & toleh dinormalisasi terhadap terang kulit dan hanya dihitung dari
   * bingkai yang lokalisasinya stabil (sameLocalization).
   *
   * BATAS JUJUR (diukur, tools/dev/probe-face-robustness.mjs): di bingkai 64x48 kedipan nyaris
   * tak terlihat (iris ±1,5 px) dan foto cetak berderau tidak bisa dibedakan dari wajah yang
   * diam — jalur diam tenang tetap bisa diluluskan foto yang ditahan >= 3 dtk.
   */
  function checkLiveness(video, canvas, ctx) {
    var vid = video || state.videoEl;
    var cvs = canvas || state.canvasEl;
    var c = ctx || state.ctx;
    if (!vid || !cvs || !c) return { stage: 'no_face', ok: false, progress: 0 };
    if (vid.readyState < 2) return { stage: 'no_face', ok: false, progress: 0 };

    var frameRes = analyzeFrame(vid, cvs, c, null);
    var now = Date.now();
    var base = liveness.base;
    // Mata terpejam pada wajah yang tetap di tempatnya: pita mata lenyap sesaat, tetapi
    // gumpalan kulitnya sama — itu kedipan, bukan wajah yang hilang.
    var closedFrame = !frameRes.present && frameRes.reason === 'no_facial_features' && liveness.calibrated && !liveness.verified && sameLocalization(frameRes, base, true);
    if (!frameRes.present && !closedFrame) {
      liveness.absentTicks = (liveness.absentTicks || 0) + 1;
      // Diam tenang harus TERUS-MENERUS hadir; satu bingkai hilang memulai hitungan dari nol.
      liveness.steadySince = 0;
      liveness.turnRun = 0;
      if (liveness.absentTicks >= 6) {
        liveness.calibrated = false;
        liveness.calibTicks = 0;
        liveness.calib = [];
        liveness.base = null;
        liveness.blinkClosing = false;
      }
      if (frameRes.isSpoof) {
        return { stage: 'spoof_detected', ok: false, reason: frameRes.reason, progress: 0 };
      }
      return { stage: 'no_face', ok: false, progress: 0 };
    }
    liveness.absentTicks = 0;

    if (liveness.verified) {
      return { stage: 'verified', ok: true, blinkCount: liveness.blinkCount, turn: liveness.turnDetected, progress: 100 };
    }

    var Ys = Math.max(20, frameRes.skinBr || 0);
    var dipN = typeof frameRes.dipN === 'number' ? frameRes.dipN : 0;
    var asymN = (frameRes.asym || 0) / Ys;

    // Profil dikumpulkan dari setiap bingkai hadir selama verifikasi, tetapi BELUM dikunci.
    if (frameRes.present) accumulateProfile(frameRes);

    if (!liveness.calibrated) {
      if (!frameRes.present) return { stage: 'aligning', ok: true, progress: 0 };
      liveness.calib.push({ boxW: frameRes.boxW, cX: frameRes.cX, cY: frameRes.cY, eyeRowRel: frameRes.eyeRowRel, dipN: dipN, asymN: asymN });
      liveness.calibTicks++;
      if (liveness.calibTicks >= 2) {
        var k0 = liveness.calib[liveness.calib.length - 2], k1 = liveness.calib[liveness.calib.length - 1];
        liveness.base = {
          boxW: (k0.boxW + k1.boxW) / 2, cX: k1.cX, cY: k1.cY,
          eyeRowRel: (k0.eyeRowRel + k1.eyeRowRel) / 2,
          dipN: (k0.dipN + k1.dipN) / 2, asymN: (k0.asymN + k1.asymN) / 2
        };
        liveness.openRef = liveness.base.dipN;
        liveness.calibrated = true;
        liveness.steadySince = now;
      }
      return { stage: 'aligning', ok: true, progress: 0 };
    }
    base = liveness.base;
    var stable = closedFrame || sameLocalization(frameRes, base);

    if (stable) {
      // Kedip: kontras pita mata turun ke <= 60% acuan mata terbuka (dan minimal 0,03 terang
      // kulit — di atas derau sensor), lalu kembali >= 80% dalam 80–1600 ms.
      var isClosed = closedFrame || (dipN <= liveness.openRef * 0.6 && (liveness.openRef - dipN) >= 0.03);
      if (isClosed) {
        if (!liveness.blinkClosing) {
          liveness.blinkClosing = true;
          liveness.blinkCloseStart = now;
        }
      } else {
        if (liveness.blinkClosing && dipN >= liveness.openRef * 0.8) {
          var dur = now - liveness.blinkCloseStart;
          if (dur >= 80 && dur <= 1600) liveness.blinkCount++;
          liveness.blinkClosing = false;
        }
        if (!liveness.blinkClosing) liveness.openRef = liveness.openRef * 0.9 + dipN * 0.1;
      }
      // Tolehan 3D: asimetri terang kedua mata berubah (cahaya jatuh berbeda ke mata dekat &
      // jauh). Foto yang digeser/dimiringkan membawa asimetrinya sendiri — tidak berubah.
      // Perubahan besar (>= 0,15) cukup sekali; perubahan sedang (>= 0,08) wajib 3 bingkai.
      var asymChange = closedFrame ? 0 : Math.abs(asymN - base.asymN);
      liveness.turnRun = asymChange >= 0.08 ? liveness.turnRun + 1 : 0;
      if (asymChange >= 0.15 || liveness.turnRun >= 3) liveness.turnDetected = true;
    } else {
      liveness.turnRun = 0;
    }

    if (!liveness.steadySince) liveness.steadySince = now;
    var steadyMs = now - liveness.steadySince;
    var steadyOk = false;
    if (steadyMs >= STEADY_HOLD_MS) {
      var tc = checkTemporalLiveness(now);
      steadyOk = tc.span >= TEMPORAL_MIN_SPAN_MS && !tc.isStatic && !tc.isRigidWobble;
    }

    if (liveness.blinkCount >= 1 || liveness.turnDetected || steadyOk) {
      liveness.verified = true;
      lockEnrollment();
      return { stage: 'verified', ok: true, blinkCount: liveness.blinkCount, turn: liveness.turnDetected, steady: steadyOk, progress: 100 };
    }

    // Progres jalur diam tenang dibatasi 95%: bar penuh hanya untuk verifikasi yang benar-benar lulus.
    var pct = Math.min(95, Math.round((steadyMs / STEADY_HOLD_MS) * 95));
    return { stage: 'challenge', ok: true, blinkCount: liveness.blinkCount, steadyMs: steadyMs, progress: pct };
  }

  function verifyPresence() {
    if (!state.active || !state.videoEl || state.videoEl.readyState < 2) return false;
    return fallbackCheck(state.videoEl, state.canvasEl, state.ctx);
  }

  function checkNow() {
    if (!state.active || !state.videoEl || state.videoEl.readyState < 2) return false;
    if (state.lastNativeFace && (Date.now() - state.lastNativeFaceTime < 1000)) return true;
    var ok = fallbackCheck(state.videoEl, state.canvasEl, state.ctx);
    // Periksa ulang yang diminta murid sendiri: kehadirannya langsung terkonfirmasi.
    handleResult(ok, ok);
    return ok;
  }

  return {
    isSupported: isSupported,
    start: start,
    stop: stop,
    isActive: isActive,
    isWarning: isWarning,
    getStream: getStream,
    attachPreview: attachPreview,
    verifyPresence: verifyPresence,
    checkNow: checkNow,
    fallbackCheck: fallbackCheck,
    analyzeFrame: analyzeFrame,
    checkLiveness: checkLiveness,
    resetLiveness: resetLiveness,
    isLivenessVerified: isLivenessVerified,
    getEnrolledProfile: function () { return Object.assign({}, enrolledProfile); },
    setEnrolledProfile: applyProfile,
    isEnrolled: function () { return !!enrolledProfile.valid; },
    resetEnrolledProfile: resetEnrolledProfile,
    freezeStep: freezeStep,
    SAMPLE_INTERVAL_MS: SAMPLE_INTERVAL_MS,
    WARN_THRESHOLD_MS: WARN_THRESHOLD_MS,
    ABSENT_THRESHOLD_MS: ABSENT_THRESHOLD_MS,
    STEADY_HOLD_MS: STEADY_HOLD_MS,
    FROZEN_MS: FROZEN_MS
  };
});
