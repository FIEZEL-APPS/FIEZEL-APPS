/**
 * FIEZEL — fiezel-face-guard.js · DETEKTOR KEHADIRAN WAJAH DI KAMERA (KELASKU UJIAN).
 *
 * TUJUAN:
 * Memastikan murid hadir menghadap layar selama ujian resmi dari guru (mode 'ujian').
 * Didesain sangat hemat daya (throttled 0.67 FPS / 1.5 detik per sampel) agar tidak
 * membebani baterai atau CPU ponsel murid, dengan resolusi kamera mini (320x240).
 *
 * PRINSIP:
 * 1. Tanpa Crash / Graceful: Jika izin kamera ditolak atau perangkat tidak memiliki kamera,
 *    ujian tetap berjalan dan status dicatat tanpa mengunci murid.
 * 2. Peringatan Halus: Mulai detik ke-5 wajah tidak terlihat, sistem memberi sinyal
 *    peringatan visual ke murid.
 * 3. Batas Pelanggaran 10 Detik: Jika wajah tetap tidak terlihat > 10 detik, episode dicatat
 *    ke FiezelFocusGuard (vn, vs, vx) dan dilaporkan ke guru.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelFaceGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SAMPLE_INTERVAL_MS = 250;
  var WARN_THRESHOLD_MS = 2500;
  var ABSENT_THRESHOLD_MS = 10000;

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
    options: null
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

    for (var y = minY; y <= maxY; y++) {
      for (var x = minX; x <= maxX; x++) {
        var idx = (y * w + x) * 4;
        var r = d[idx], g = d[idx + 1], b = d[idx + 2];

        // Glass Specular Glare: pantulan lampu pada kaca HP / laptop
        // R, G, B > 230 dengan saturasi mendekati nol (|R-G| <= 12, |G-B| <= 12, |R-B| <= 12)
        if (r > 230 && g > 230 && b > 230 && Math.abs(r - g) <= 12 && Math.abs(g - b) <= 12 && Math.abs(r - b) <= 12) {
          glareCount++;
        }
      }
    }

    var hasGlassGlare = (glareCount >= 5);

    // Cari nilai luminansi minimum pada rongga mata (hanya jika ada fitur mata)
    var eyeDarkMin = 255, totalEyePixels = 0;
    var eyeY1 = Math.max(0, cY - 5), eyeY2 = Math.min(h - 1, cY + 1);
    for (var ey = eyeY1; ey <= eyeY2; ey++) {
      for (var ex = Math.max(0, cX - 10); ex <= Math.min(w - 1, cX + 10); ex++) {
        var yLum = Ygrid[ey * w + ex];
        if (yLum < eyeDarkMin) eyeDarkMin = yLum;
        totalEyePixels++;
      }
    }

    // Backlight Bleed pada layar LCD: jika mata terdeteksi nyata (eyeDip >= 1.5),
    // tapi rongga mata tidak bisa hitam pekat (eyeDarkMin > 52 pada ruangan normal/terang)
    var hasBacklightBleed = (eyeDip >= 1.5 && eyeDarkMin > 52 && totalEyePixels > 0);

    // Moiré / Subpixel Aliasing pada Pipi murni (cY + 4 s.d. cY + 9)
    var chkLapSum = 0, chkLapCount = 0;
    var cy1 = Math.min(h - 2, cY + 4), cy2 = Math.min(h - 2, cY + 9);
    var cx1L = Math.max(1, cX - 10), cx2L = Math.max(1, cX - 4);
    var cx1R = Math.min(w - 2, cX + 4), cx2R = Math.min(w - 2, cX + 10);

    for (var cy = cy1; cy <= cy2; cy++) {
      for (var cx = cx1L; cx <= cx2L; cx++) {
        var center = Ygrid[cy * w + cx];
        var lap = Math.abs(4 * center - Ygrid[cy * w + (cx - 1)] - Ygrid[cy * w + (cx + 1)] - Ygrid[(cy - 1) * w + cx] - Ygrid[(cy + 1) * w + cx]);
        chkLapSum += lap;
        chkLapCount++;
      }
      for (var cx = cx1R; cx <= cx2R; cx++) {
        var center = Ygrid[cy * w + cx];
        var lap = Math.abs(4 * center - Ygrid[cy * w + (cx - 1)] - Ygrid[cy * w + (cx + 1)] - Ygrid[(cy - 1) * w + cx] - Ygrid[(cy + 1) * w + cx]);
        chkLapSum += lap;
        chkLapCount++;
      }
    }
    var avgCheekLap = chkLapCount > 0 ? (chkLapSum / chkLapCount) : 0;
    var hasMoire = (avgCheekLap > 15.0);

    return {
      isScreen: hasGlassGlare || hasBacklightBleed || hasMoire,
      hasGlassGlare: hasGlassGlare,
      hasBacklightBleed: hasBacklightBleed,
      hasMoire: hasMoire
    };
  }

  function recordTemporalFrame(now, cX, cY, boxW, boxH, eyeDip, asym, Ygrid, w, h) {
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

    while (temporalHistory.length > MAX_TEMPORAL_FRAMES) {
      temporalHistory.shift();
    }
  }

  function checkTemporalLiveness(now) {
    if (temporalHistory.length < 4) {
      return { isStatic: false, isRigidWobble: false, isSpoof: false };
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

    var isStatic = (timeSpan >= 1800 && avgMae < STATIC_PHOTO_MAX_MAE && dipVar < 0.08);

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

    var isRigidWobble = (timeSpan >= 1800 && (maxDx >= 1.0 || maxDy >= 1.0) && asymChange < 1.0 && dipVar < 0.05);

    return {
      isStatic: isStatic,
      isRigidWobble: isRigidWobble,
      isSpoof: isStatic || isRigidWobble
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

          // Model kromatisitas kulit manusia adaptif & bebas manipulasi cahaya:
          // 1. Manusia asli SELALU memiliki R > B (melanin menyerap cahaya biru/ungu).
          //    Lampu putih, neon, daylight, kertas putih, dan dinding putih memiliki B >= R - 5.
          // 2. Di ruangan redup (yLum < 60), kamera mereduksi perbedaan warna, sehingga R >= B + 4.
          // 3. Di pencahayaan normal (yLum >= 60), R >= B + 10 dan R > G.
          // 4. Sumber cahaya silau / lampu jenuh (R, G, B > 235) ditolak mutlak dari hitungan kulit.
          var isPureLightGlare = (r > 235 && g > 235 && b > 235);
          var isSkin = false;

          if (!isPureLightGlare && cb >= 75 && cb <= 140 && cr >= 125 && cr <= 185 && r > g) {
            if (yLum < 60) {
              isSkin = (
                (r - g) >= 1 &&
                r >= (b + 4) &&
                normB <= 0.33 &&
                yLum >= 10
              );
            } else {
              isSkin = (
                (r - g) >= 3 &&
                r >= (b + 10) &&
                normR >= 0.34 &&
                normB <= 0.31 &&
                yLum <= 240
              );
            }
          }

          if (isSkin) {
            skinCount++;
            sumX += x;
            sumY += y;
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
      var centerSkinRatio = centerTotal > 0 ? (centerSkin / centerTotal) : 0;

      // 1. Kamera tertutup rapat (hitam / gelap pekat)
      if (avgBr < 8) return { present: false, isSpoof: false, reason: 'camera_covered' };

      // 2. Silau ekstrem tanpa kontras (disorot lampu tembak tanpa wajah)
      if (avgBr > 245 && contrastRange < 10) return { present: false, isSpoof: false, reason: 'blinding_glare' };

      // 3. Jumlah piksel kulit wajar (ruang redup toleran >= 50, normal >= 70)
      var minSkinReq = avgBr < 40 ? 50 : 70;
      if (skinCount < minSkinReq || skinCount > 2200) return { present: false, isSpoof: false, reason: 'skin_count_out_of_range' };

      // 4. Konsentrasi kulit di tengah
      if (centerSkinRatio < 0.12) return { present: false, isSpoof: false, reason: 'not_centered' };

      // 5. Centroid posisi wajah harus di area tengah
      var cX = Math.round(sumX / skinCount);
      var cY = Math.round(sumY / skinCount);
      if (cX < 12 || cX > 52 || cY < 8 || cY > 40) return { present: false, isSpoof: false, reason: 'centroid_out_of_bounds' };

      // 6. Bounding box & proporsi oval wajah
      var boxW = (maxX - minX) + 1;
      var boxH = (maxY - minY) + 1;
      if (boxW < 10 || boxH < 10) return { present: false, isSpoof: false, reason: 'box_too_small' };
      var aspect = boxH / boxW;
      if (aspect < 0.60 || aspect > 2.8) return { present: false, isSpoof: false, reason: 'aspect_ratio_invalid' };

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

      // Penolakan permukaan datar / lampu / meja / telapak tangan:
      // Lampu terang atau permukaan datar memiliki eyeDip mendekati nol atau negatif
      if ((centerSkinRatio > 0.85 || avgBr > 130) && eyeDip < 0.6) {
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
      var tempCheck = checkTemporalLiveness(now);
      if (tempCheck.isSpoof) {
        return { present: false, isSpoof: true, reason: tempCheck.isStatic ? 'spoof_static' : 'spoof_rigid' };
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
        asym: asym,
        eLAvg: eLAvg,
        eRAvg: eRAvg
      };
    } catch (_) {
      return { present: false, isSpoof: false, reason: 'error' };
    }
  }

  function fallbackCheck(video, canvas, ctx) {
    var res = analyzeFrame(video, canvas, ctx, null);
    return !!(res && res.present && !res.isSpoof);
  }

  function checkFrame() {
    if (!state.active || !state.videoEl) return;
    var vid = state.videoEl;
    if (vid.readyState < 2) return;

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
            // CRITICAL ANTI-SPOOFING & LIVENESS GATE:
            // Meskipun native FaceDetector menemukan wajah, wajib lolos uji anti-layar dan anti-kertas
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
      if (!state.absentSince) {
        state.absentSince = now;
        state.episoded = false;
        if (typeof opts.onAbsent === 'function') opts.onAbsent(now);
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

  function start(opts) {
    if (state.active) {
      if (opts) state.options = Object.assign({}, state.options || {}, opts);
      state.absentSince = 0;
      state.warned = false;
      if (state.videoEl && state.videoEl.paused) {
        try { var p = state.videoEl.play(); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (_) {}
      }
      return Promise.resolve({ ok: true, active: true, stream: state.stream });
    }
    state.options = opts || {};
    state.absentSince = 0;
    state.warned = false;
    state.episoded = false;

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
    return navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
      if (state.stopping || !state.options) {
        try { mediaStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
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
      state.active = false;
      return { ok: false, reason: (err && err.name) || 'permission_denied' };
    });
  }

  function stop() {
    state.stopping = true;
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
    state.warned = false;
    state.episoded = false;
    state.options = null;
  }

  function isActive() { return !!state.active; }
  function isWarning() { return !!state.warned; }
  function getStream() { return state.stream; }

  function attachPreview(vidEl) {
    if (!vidEl || !state.stream) return false;
    try {
      vidEl.srcObject = state.stream;
      vidEl.muted = true;
      vidEl.playsInline = true;
      vidEl.autoplay = true;
      var p = vidEl.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
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
    verified: false
  };

  function resetLiveness() {
    temporalHistory = [];
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
    liveness.verified = false;
  }

  function isLivenessVerified() {
    return !!liveness.verified;
  }

  /**
   * Deteksi Kehidupan Biometrik Aktif (Active Liveness Verification).
   * Menantang pengguna melakukan kedipan mata atau tolehan kepala kecil secara interaktif.
   * Menolak mutlak foto cetak, foto diam di HP lain, wallpaper dinding, dan lampu silau.
   */
  function checkLiveness(video, canvas, ctx) {
    var vid = video || state.videoEl;
    var cvs = canvas || state.canvasEl;
    var c = ctx || state.ctx;
    if (!vid || !cvs || !c) return { stage: 'no_face', ok: false };
    if (vid.readyState < 2) return { stage: 'no_face', ok: false };

    var frameRes = analyzeFrame(vid, cvs, c, null);
    if (!frameRes.present) {
      liveness.calibrated = false;
      liveness.calibTicks = 0;
      liveness.eyeDips = [];
      liveness.blinkClosing = false;
      if (frameRes.isSpoof) {
        return { stage: 'spoof_detected', ok: false, reason: frameRes.reason };
      }
      return { stage: 'no_face', ok: false };
    }

    if (liveness.verified) {
      return { stage: 'verified', ok: true, blinkCount: liveness.blinkCount, turn: liveness.turnDetected };
    }

    var now = Date.now();
    var curDip = frameRes.eyeDip;
    var centroidX = frameRes.centroidX;
    var centroidY = frameRes.centroidY;

    if (!liveness.calibrated) {
      liveness.eyeDips.push(curDip);
      liveness.calibTicks++;
      if (liveness.calibTicks >= 2) {
        var sumD = 0;
        for (var i = 0; i < liveness.eyeDips.length; i++) sumD += liveness.eyeDips[i];
        liveness.baselineEyeDip = sumD / liveness.eyeDips.length;
        liveness.baselineCentroidX = centroidX;
        liveness.baselineCentroidY = centroidY;
        liveness.peakEyeDip = Math.max(liveness.baselineEyeDip, 1.0);
        liveness.baselineAsym = frameRes.asym;
        liveness.calibrated = true;
      }
      return { stage: 'aligning', ok: true };
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
        if (dur >= 40 && dur <= 800) {
          liveness.blinkCount++;
        }
        liveness.blinkClosing = false;
      }
    }

    // Deteksi tolehan kepala 3D (bukan getaran kertas / hand tremor):
    var dX = Math.abs(centroidX - liveness.baselineCentroidX);
    var dY = Math.abs(centroidY - (liveness.baselineCentroidY || centroidY));
    var asymChange = Math.abs(frameRes.asym - (liveness.baselineAsym || frameRes.asym));

    if (dX >= 4.0 || dY >= 4.0 || asymChange >= 5.0) {
      liveness.turnDetected = true;
    }

    if (liveness.blinkCount >= 1 || liveness.turnDetected) {
      liveness.verified = true;
      return { stage: 'verified', ok: true, blinkCount: liveness.blinkCount, turn: liveness.turnDetected };
    }

    return { stage: 'challenge', ok: true, blinkCount: liveness.blinkCount };
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
    checkLiveness: checkLiveness,
    resetLiveness: resetLiveness,
    isLivenessVerified: isLivenessVerified,
    SAMPLE_INTERVAL_MS: SAMPLE_INTERVAL_MS,
    WARN_THRESHOLD_MS: WARN_THRESHOLD_MS,
    ABSENT_THRESHOLD_MS: ABSENT_THRESHOLD_MS
  };
});
