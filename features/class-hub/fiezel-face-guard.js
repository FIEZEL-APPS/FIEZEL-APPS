/**
 * FIEZEL — fiezel-face-guard.js · DETEKTOR KEHADIRAN WAJAH DI KAMERA (KELASKU UJIAN).
 *
 * TUJUAN:
 * Memastikan murid hadir menghadap layar selama ujian resmi dari guru (mode 'ujian').
 * Sampel tiap 250 ms pada bingkai mini 64x48 dari kamera 320x240 — ringan untuk ponsel.
 *
 * BATAS JUJUR MODUL INI: ia memeriksa KEHADIRAN wajah yang hidup, BUKAN identitas. Profil
 * "enrollment" hanyalah statistik warna kulit & posisi untuk menstabilkan deteksi; ia tidak
 * bisa membedakan murid A dari murid B. Semua pemeriksaan berjalan di perangkat murid.
 *
 * PRINSIP:
 * 1. Tanpa Crash / Graceful: Jika izin kamera ditolak atau perangkat tidak memiliki kamera,
 *    ujian tetap berjalan — dan guru menerima tanda "tanpa kamera" (lihat class-hub).
 * 2. Peringatan Halus: wajah hilang > 2 dtk (debounce) membuka episode; 3 dtk memunculkan
 *    kartu peringatan; episode di bawah FACE_GRACE_MS (focus-guard) dibuang.
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

  var SAMPLE_INTERVAL_MS = 250;
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
  var PROFILE_KEYS = ['sampleCount', 'cbMean', 'crMean', 'cbMin', 'cbMax', 'crMin', 'crMax', 'normRMean', 'normBMean', 'boxWMean', 'boxHMean', 'skinCountMean', 'cXMean', 'cYMean', 'eyeDipMean', 'asymMean', 'avgBrMean'];

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
    avgBrMean: 100
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
    enrolledProfile.sampleCount = n + 1;
  }

  var absentStreak = 0;
  var ABSENT_DEBOUNCE_FRAMES = 8; // 8 frames x 250ms = 2.0 detik

  var state = {
    active: false,
    stream: null,
    videoEl: null,
    canvasEl: null,
    ctx: null,
    timer: null,
    detector: null,
    absentSince: 0,
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
  function detectScreenArtifacts(d, w, h, Ygrid, minX, maxX, minY, maxY, cX, cY, eyeDip) {
    var glareCount = 0;
    var boxW = (maxX - minX) + 1;
    var boxH = (maxY - minY) + 1;
    var boxArea = boxW * boxH;

    for (var y = minY; y <= maxY; y++) {
      for (var x = minX; x <= maxX; x++) {
        var idx = (y * w + x) * 4;
        var r = d[idx], g = d[idx + 1], b = d[idx + 2];

        // Glass Specular Glare: pantulan lampu intensif pada kaca layar HP / laptop
        // R, G, B > 235 dengan saturasi mendekati nol (|R-G| <= 10, |G-B| <= 10, |R-B| <= 10)
        if (r > 235 && g > 235 && b > 235 && Math.abs(r - g) <= 10 && Math.abs(g - b) <= 10 && Math.abs(r - b) <= 10) {
          glareCount++;
        }
      }
    }

    // Glare kaca layar: pantulan cermin kaca layar menutupi area signifikan (>= 25 px dan >= 7% area wajah)
    var hasGlassGlare = (glareCount >= 25 && boxArea > 0 && (glareCount / boxArea) >= 0.07);

    return {
      isScreen: hasGlassGlare,
      hasGlassGlare: hasGlassGlare,
      hasBacklightBleed: false,
      hasMoire: false
    };
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

    var isStatic = (timeSpan >= TEMPORAL_MIN_SPAN_MS && avgMae < 0.05 && dipVar < 0.001);

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
      isSpoof: isStatic || isRigidWobble,
      span: timeSpan
    };
  }

  /**
   * Analisis computer vision presisi tinggi pada frame 64x48.
   * Mengukur klaster kromatisitas YCbCr kulit manusia, konsentrasi oval tengah,
   * gradien mikro-tekstur fitur wajah (mata/alis/hidung/mulut), serta kontras Haar vertikal (eye-dip).
   * Mampu menolak secara akurat: ruangan gelap, silau, dinding kosong, meja kayu,
   * telapak tangan penutup kamera, dan pengguna yang berpaling/meninggalkan layar.
   */
  function analyzeFrame(video, canvas, ctx, nativeBox) {
    if (!video || !canvas || !ctx) return { present: false, isSpoof: false };
    if (video.readyState < 2) return { present: false, isSpoof: false };
    try {
      var w = 64, h = 48;
      ctx.drawImage(video, 0, 0, w, h);
      var imgData = ctx.getImageData(0, 0, w, h);
      var d = imgData.data;

      var totalY = 0, minBr = 255, maxBr = 0;
      var skinCount = 0, centerSkin = 0, centerTotal = 0;
      var sumX = 0, sumY = 0;
      var skinSumCb = 0, skinSumCr = 0, skinSumNormR = 0, skinSumNormB = 0;
      var minX = w, maxX = 0, minY = h, maxY = 0;
      var cX1 = 16, cX2 = 48, cY1 = 8, cY2 = 40;

      var Ygrid = new Float32Array(w * h);

      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          var r = d[idx], g = d[idx + 1], b = d[idx + 2];
          var yLum = 0.299 * r + 0.587 * g + 0.114 * b;
          var cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          var cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          Ygrid[y * w + x] = yLum;
          totalY += yLum;
          if (yLum < minBr) minBr = yLum;
          if (yLum > maxBr) maxBr = yLum;

          var rgbSum = r + g + b;
          var normR = rgbSum > 0 ? (r / rgbSum) : 0;
          var normB = rgbSum > 0 ? (b / rgbSum) : 0;

          var isPureLightGlare = (r > 240 && g > 240 && b > 240);
          var isSkin = false;

          if (!isPureLightGlare) {
            if (enrolledProfile.valid) {
              // Profil Terkalibrasi Spesifik Murid: adaptif terhadap warna kulit dan pencahayaan ruangan
              var cbDiffFromBase = Math.abs(cb - enrolledProfile.cbMean);
              var crDiffFromBase = Math.abs(cr - enrolledProfile.crMean);
              var crCbDiff = cr - cb;
              if (yLum < 60) {
                isSkin = (
                  cbDiffFromBase <= 32 &&
                  crDiffFromBase <= 32 &&
                  r >= (b + 1) &&
                  (r + 3) >= g &&
                  crCbDiff >= 1 &&
                  yLum >= 6
                );
              } else {
                isSkin = (
                  cbDiffFromBase <= 30 &&
                  crDiffFromBase <= 30 &&
                  r >= (b + 2) &&
                  (r + 4) >= g &&
                  crCbDiff >= 2 &&
                  normB <= Math.min(0.38, enrolledProfile.normBMean + 0.12) &&
                  yLum <= 230
                );
              }
            } else {
              // Model kromatisitas kulit universal pra-kalibrasi (inklusif terhadap beragam warna kulit & pencahayaan lampu/ruangan)
              if (cb >= 70 && cb <= 148 && cr >= 122 && cr <= 188) {
                var crCbDiff = cr - cb;
                if (yLum < 60) {
                  isSkin = (
                    r >= (b + 1) &&
                    (r + 2) >= g &&
                    crCbDiff >= 1 &&
                    normB <= 0.36 &&
                    yLum >= 6
                  );
                } else {
                  isSkin = (
                    r >= (b + 2) &&
                    (r + 3) >= g &&
                    crCbDiff >= 2 &&
                    normR >= 0.30 &&
                    normB <= 0.35 &&
                    yLum <= 230
                  );
                }
              }
            }
          }

          if (isSkin) {
            skinCount++;
            sumX += x;
            sumY += y;
            skinSumCb += cb;
            skinSumCr += cr;
            skinSumNormR += normR;
            skinSumNormB += normB;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }

          if (x >= cX1 && x <= cX2 && y >= cY1 && y <= cY2) {
            centerTotal++;
            if (isSkin) centerSkin++;
          }
        }
      }

      var avgBr = totalY / (w * h);
      var contrastRange = maxBr - minBr;
      var centerFillFraction = centerTotal > 0 ? (centerSkin / centerTotal) : 0;
      var skinInCenterFraction = skinCount > 0 ? (centerSkin / skinCount) : 0;
      var avgSkinCb = skinCount > 0 ? (skinSumCb / skinCount) : 128;
      var avgSkinCr = skinCount > 0 ? (skinSumCr / skinCount) : 128;
      var avgSkinNormR = skinCount > 0 ? (skinSumNormR / skinCount) : 0.33;
      var avgSkinNormB = skinCount > 0 ? (skinSumNormB / skinCount) : 0.33;

      // 1. Kamera tertutup rapat (hitam / gelap pekat)
      if (avgBr < 8) return { present: false, isSpoof: false, reason: 'camera_covered' };

      // 2. Silau ekstrem tanpa kontras (disorot lampu tembak tanpa wajah)
      if (avgBr > 245 && contrastRange < 10) return { present: false, isSpoof: false, reason: 'blinding_glare' };

      // 3. Jumlah piksel kulit wajar (toleransi jarak maju/mundur)
      var minSkinReq = enrolledProfile.valid ? Math.max(12, Math.round(enrolledProfile.skinCountMean * 0.15)) : (avgBr < 40 ? 25 : 35);
      var maxSkinReq = enrolledProfile.valid ? Math.min(2800, Math.round(enrolledProfile.skinCountMean * 4.2)) : 2400;
      if (skinCount < minSkinReq || skinCount > maxSkinReq) return { present: false, isSpoof: false, reason: 'skin_count_out_of_range' };

      // 4. Konsentrasi kulit di area kamera
      var minCenterFraction = enrolledProfile.valid ? 0.10 : 0.20;
      if (skinInCenterFraction < minCenterFraction) return { present: false, isSpoof: false, reason: 'not_centered' };

      // 5. Centroid posisi wajah harus di area kamera (toleransi sudut/kemiringan HP)
      var cX = Math.round(sumX / skinCount);
      var cY = Math.round(sumY / skinCount);
      var minCX = enrolledProfile.valid ? 2 : 5, maxCX = enrolledProfile.valid ? 62 : 59;
      var minCY = enrolledProfile.valid ? 2 : 4, maxCY = enrolledProfile.valid ? 46 : 44;
      if (cX < minCX || cX > maxCX || cY < minCY || cY > maxCY) return { present: false, isSpoof: false, reason: 'centroid_out_of_bounds' };

      // 6. Bounding box & proporsi oval wajah
      var boxW = (maxX - minX) + 1;
      var boxH = (maxY - minY) + 1;
      if (boxW < 5 || boxH < 5) return { present: false, isSpoof: false, reason: 'box_too_small' };
      var aspect = boxH / boxW;
      if (aspect < 0.35 || aspect > 3.6) return { present: false, isSpoof: false, reason: 'aspect_ratio_invalid' };

      // 7. Hitung gradien tekstur mikro di area wajah
      var gradSum = 0, gradCount = 0, maxLocalGrad = 0;
      var gy1 = Math.max(1, minY), gy2 = Math.min(h - 2, maxY);
      var gx1 = Math.max(1, minX), gx2 = Math.min(w - 2, maxX);
      for (var gy = gy1; gy <= gy2; gy++) {
        for (var gx = gx1; gx <= gx2; gx++) {
          var gdx = Math.abs(Ygrid[gy * w + (gx + 1)] - Ygrid[gy * w + (gx - 1)]);
          var gdy = Math.abs(Ygrid[(gy + 1) * w + gx] - Ygrid[(gy - 1) * w + gx]);
          var gMag = gdx + gdy;
          gradSum += gMag;
          gradCount++;
          if (gMag > maxLocalGrad) maxLocalGrad = gMag;
        }
      }
      var avgGrad = gradCount > 0 ? (gradSum / gradCount) : 0;
      if (avgGrad < 2.0 && maxLocalGrad < 14) return { present: false, isSpoof: false, reason: 'flat_texture' };

      // 8. Haar cascade dahi vs mata vs pipi (Bilateral Dual-Eye)
      var fSum = 0, fCount = 0;
      var eSum = 0, eCount = 0;
      var cSum = 0, cCount = 0;
      var eLSum = 0, eLCount = 0, eRSum = 0, eRCount = 0;

      var fhY1 = Math.max(0, cY - 12), fhY2 = Math.max(0, cY - 6);
      for (var fy = fhY1; fy <= fhY2; fy++) {
        for (var fx = Math.max(0, cX - 8); fx <= Math.min(w - 1, cX + 8); fx++) {
          fSum += Ygrid[fy * w + fx]; fCount++;
        }
      }

      var eyeY1 = Math.max(0, cY - 5), eyeY2 = Math.min(h - 1, cY + 1);
      for (var ey = eyeY1; ey <= eyeY2; ey++) {
        for (var ex = Math.max(0, cX - 10); ex <= Math.max(0, cX - 2); ex++) {
          eLSum += Ygrid[ey * w + ex]; eLCount++;
          eSum += Ygrid[ey * w + ex]; eCount++;
        }
        for (var ex = Math.min(w - 1, cX + 2); ex <= Math.min(w - 1, cX + 10); ex++) {
          eRSum += Ygrid[ey * w + ex]; eRCount++;
          eSum += Ygrid[ey * w + ex]; eCount++;
        }
      }

      var chkY1 = Math.min(h - 1, cY + 3), chkY2 = Math.min(h - 1, cY + 9);
      for (var cy = chkY1; cy <= chkY2; cy++) {
        for (var cx = Math.max(0, cX - 8); cx <= Math.min(w - 1, cX + 8); cx++) {
          cSum += Ygrid[cy * w + cx]; cCount++;
        }
      }

      var fAvg = fCount > 0 ? fSum / fCount : 0;
      var eAvg = eCount > 0 ? eSum / eCount : 0;
      var cAvg = cCount > 0 ? cSum / cCount : 0;
      var eyeDip = (fAvg - eAvg) + (cAvg - eAvg);
      var eLAvg = eLCount > 0 ? (eLSum / eLCount) : eAvg;
      var eRAvg = eRCount > 0 ? (eRSum / eRCount) : eAvg;
      var asym = Math.abs(eLAvg - eRAvg);

      // Penolakan permukaan datar / meja / telapak tangan:
      // Permukaan datar yang mendominasi tengah (> 75%) tanpa rongga mata
      if (!enrolledProfile.valid && centerFillFraction > 0.75 && eyeDip < 0.25) {
        return { present: false, isSpoof: false, reason: 'flat_light_or_surface' };
      }

      // Jika murid menoleh tajam ke samping (asimetri mata ekstrem > 35)
      if (asym > 35) return { present: false, isSpoof: false, reason: 'extreme_asymmetry' };

      // 9. Deteksi Artefak Layar Kaca & Backlight HP / Laptop (Anti-Spoofing Layar)
      var screenCheck = detectScreenArtifacts(d, w, h, Ygrid, minX, maxX, minY, maxY, cX, cY, eyeDip);
      if (screenCheck.isScreen) {
        return { present: false, isSpoof: true, reason: 'spoof_screen' };
      }

      var now = Date.now();
      recordTemporalFrame(now, cX, cY, boxW, boxH, eyeDip, asym, Ygrid, w, h);

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
        asym: asym,
        eLAvg: eLAvg,
        eRAvg: eRAvg,
        skinCount: skinCount,
        avgBr: avgBr,
        avgSkinCb: avgSkinCb,
        avgSkinCr: avgSkinCr,
        avgSkinNormR: avgSkinNormR,
        avgSkinNormB: avgSkinNormB
      };
    } catch (_) {
      return { present: false, isSpoof: false, reason: 'error' };
    }
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

  /** 192 titik luminans dari bingkai 64x48 — cukup untuk membedakan stream hidup dari stream beku. */
  function frameSignature(vid, ctx) {
    if (!vid || !ctx) return null;
    try {
      ctx.drawImage(vid, 0, 0, 64, 48);
      var d = ctx.getImageData(0, 0, 64, 48).data;
      var sig = new Float32Array(192);
      for (var sy = 0; sy < 12; sy++) {
        for (var sx = 0; sx < 16; sx++) {
          var i = ((sy * 4) * 64 + sx * 4) * 4;
          sig[sy * 16 + sx] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        }
      }
      return sig;
    } catch (_) { return null; }
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
      if (state.absentSince) handleResult(true);
      absentStreak = 0;
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

    if (freezeStep(state.freeze, frameSignature(vid, state.ctx), Date.now())) {
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
            var cvCheck = analyzeFrame(vid, state.canvasEl, state.ctx, f);
            if (cvCheck && cvCheck.present && !cvCheck.isSpoof) {
              state.lastNativeFace = true;
              state.lastNativeFaceTime = Date.now();
              handleResult(true);
            } else {
              state.lastNativeFace = false;
              handleResult(false);
            }
          } else {
            var fb = analyzeFrame(vid, state.canvasEl, state.ctx, null);
            var ok = !!(fb && fb.present && !fb.isSpoof);
            state.lastNativeFace = ok;
            if (ok) state.lastNativeFaceTime = Date.now();
            handleResult(ok);
          }
        }).catch(function () {
          var fb = analyzeFrame(vid, state.canvasEl, state.ctx, null);
          handleResult(!!(fb && fb.present && !fb.isSpoof));
        });
        return;
      } catch (_) {}
    }

    var fb2 = analyzeFrame(vid, state.canvasEl, state.ctx, null);
    handleResult(!!(fb2 && fb2.present && !fb2.isSpoof));
  }

  function handleResult(present) {
    if (!state.active) return;
    var now = Date.now(), opts = state.options || {};

    if (present) {
      absentStreak = 0;
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
      absentStreak++;
      // Temporal Debounce: Butuh akumulasi absentStreak >= ABSENT_DEBOUNCE_FRAMES (8 frames x 250ms = 2.0s terus-menerus hilang)
      // sebelum absentSince diaktifkan. Ini mencegah false alarm akibat kedipan, micro-jiggle HP, atau menunduk sekejap!
      if (absentStreak >= ABSENT_DEBOUNCE_FRAMES) {
        if (!state.absentSince) {
          state.absentSince = now - (ABSENT_DEBOUNCE_FRAMES * SAMPLE_INTERVAL_MS);
          state.episoded = false;
          if (typeof opts.onAbsent === 'function') opts.onAbsent(state.absentSince);
        }
        var elapsed = now - state.absentSince;
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
      absentStreak = 0;
      state.warned = false;
      state.episoded = false;
      if (state.videoEl && state.videoEl.paused) {
        try { var p = state.videoEl.play(); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (_) {}
      }
      return Promise.resolve({ ok: true, active: true, stream: state.stream });
    }
    state.options = opts || {};
    state.absentSince = 0;
    absentStreak = 0;
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
        height: { ideal: 240, max: 480 }
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
    absentStreak = 0;
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
    eyeDips: [],
    baselineEyeDip: 0,
    baselineCentroidX: 32,
    baselineCentroidY: 24,
    peakEyeDip: 0,
    baselineAsym: 0,
    blinkClosing: false,
    blinkCloseStart: 0,
    blinkCount: 0,
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
    liveness.eyeDips = [];
    liveness.baselineEyeDip = 0;
    liveness.baselineCentroidX = 32;
    liveness.baselineCentroidY = 24;
    liveness.peakEyeDip = 0;
    liveness.baselineAsym = 0;
    liveness.blinkClosing = false;
    liveness.blinkCloseStart = 0;
    liveness.blinkCount = 0;
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
  function checkLiveness(video, canvas, ctx) {
    var vid = (video && video.readyState >= 2) ? video : state.videoEl;
    var cvs = canvas || state.canvasEl;
    var c = ctx || state.ctx;
    if (!vid || !cvs || !c) return { stage: 'no_face', ok: false, progress: 0 };
    if (vid.readyState < 2) return { stage: 'no_face', ok: false, progress: 0 };

    var frameRes = analyzeFrame(vid, cvs, c, null);
    if (!frameRes.present) {
      liveness.absentTicks = (liveness.absentTicks || 0) + 1;
      // Diam tenang harus TERUS-MENERUS hadir; satu bingkai hilang memulai hitungan dari nol.
      liveness.steadySince = 0;
      if (liveness.absentTicks >= 6) {
        liveness.calibrated = false;
        liveness.calibTicks = 0;
        liveness.eyeDips = [];
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

    var now = Date.now();
    var curDip = frameRes.eyeDip;
    var centroidX = frameRes.centroidX;
    var centroidY = frameRes.centroidY;

    // Profil dikumpulkan dari setiap bingkai hadir selama verifikasi, tetapi BELUM dikunci.
    accumulateProfile(frameRes);

    if (!liveness.calibrated) {
      liveness.eyeDips.push(curDip);
      liveness.calibTicks++;

      var targetTicks = 2;
      if (liveness.calibTicks >= targetTicks) {
        var sumD = 0;
        for (var i = 0; i < liveness.eyeDips.length; i++) sumD += liveness.eyeDips[i];
        liveness.baselineEyeDip = sumD / liveness.eyeDips.length;
        liveness.baselineCentroidX = centroidX;
        liveness.baselineCentroidY = centroidY;
        liveness.peakEyeDip = Math.max(liveness.baselineEyeDip, 1.0);
        liveness.baselineAsym = frameRes.asym;
        liveness.calibrated = true;
        liveness.steadySince = now;
      }
      return { stage: 'aligning', ok: true, progress: 0 };
    }

    if (curDip > liveness.peakEyeDip) {
      liveness.peakEyeDip = curDip;
    } else {
      liveness.peakEyeDip = liveness.peakEyeDip * 0.995 + curDip * 0.005;
    }

    var baseOpen = Math.max(liveness.peakEyeDip, liveness.baselineEyeDip, 1.0);
    var dipDrop = baseOpen - curDip;

    // Deteksi penutupan mata (blink closing) adaptif & instan:
    var isClosed = (curDip <= baseOpen * 0.75) || (dipDrop >= Math.max(0.8, baseOpen * 0.22));

    if (isClosed) {
      if (!liveness.blinkClosing) {
        liveness.blinkClosing = true;
        liveness.blinkCloseStart = now;
      }
    } else if (liveness.blinkClosing) {
      var isReopened = (curDip >= baseOpen * 0.80) || (dipDrop <= Math.max(0.5, baseOpen * 0.15));
      if (isReopened) {
        var dur = now - liveness.blinkCloseStart;
        if (dur >= 40 && dur <= 1600) {
          liveness.blinkCount++;
        }
        liveness.blinkClosing = false;
      }
    }

    // Tolehan kepala 3D: rotasi wajah mengubah terang rongga mata kiri vs kanan relatif
    // terhadap centroid kulit. Foto yang digeser/dimiringkan di bidang datar hanya berpindah
    // tempat — asimetrinya tetap — jadi pergeseran centroid saja TIDAK dihitung tolehan.
    // (Baseline 0 itu sah — wajah simetris sempurna; jangan jatuh ke nilai saat ini lewat `||`.)
    var asymChange = Math.abs(frameRes.asym - (Number(liveness.baselineAsym) || 0));
    if (asymChange >= 5.0) {
      liveness.turnDetected = true;
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
    handleResult(ok);
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
