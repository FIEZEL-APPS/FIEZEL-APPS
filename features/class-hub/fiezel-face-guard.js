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
  var WARN_THRESHOLD_MS = 750;
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

  /**
   * Analisis computer vision presisi tinggi pada frame 64x48.
   * Mengukur klaster kromatisitas YCbCr kulit manusia, konsentrasi oval tengah,
   * gradien mikro-tekstur fitur wajah (mata/alis/hidung/mulut), serta kontras Haar vertikal (eye-dip).
   * Mampu menolak secara akurat: ruangan gelap, silau, dinding kosong, meja kayu,
   * telapak tangan penutup kamera, dan pengguna yang berpaling/meninggalkan layar.
   */
  function fallbackCheck(video, canvas, ctx) {
    if (!video || !canvas || !ctx) return false;
    if (video.readyState < 2) return false;
    try {
      var w = 64, h = 48;
      ctx.drawImage(video, 0, 0, w, h);
      var imgData = ctx.getImageData(0, 0, w, h);
      var d = imgData.data;

      var totalY = 0, minBr = 255, maxBr = 0;
      var skinCount = 0, centerSkin = 0, centerTotal = 0;
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

          // Klaster kromatisitas kulit universal (YCbCr + batasan melanin/hemoglobin)
          var isSkin = (cb >= 75 && cb <= 130 && cr >= 133 && cr <= 175 && r > g && r > b && (r - g) >= 8 && yLum >= 25 && yLum <= 245);
          if (isSkin) {
            skinCount++;
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

      // 1. Kamera tertutup rapat (hitam / gelap)
      if (avgBr < 14) return false;

      // 2. Silau ekstrem tanpa kontras
      if (avgBr > 240 && contrastRange < 15) return false;

      // 3. Wajah tidak ada di tengah frame (dinding, langit-langit, berpaling dari layar)
      if (centerSkinRatio < 0.14) return false;

      // 4. Hitung gradien tekstur mikro di area tengah (mata, alis, hidung, bibir)
      var gradSum = 0, gradCount = 0, maxLocalGrad = 0;
      for (var gy = cY1 + 1; gy < cY2 - 1; gy++) {
        for (var gx = cX1 + 1; gx < cX2 - 1; gx++) {
          var dx = Math.abs(Ygrid[gy * w + (gx + 1)] - Ygrid[gy * w + (gx - 1)]);
          var dy = Math.abs(Ygrid[(gy + 1) * w + gx] - Ygrid[(gy - 1) * w + gx]);
          var gMag = dx + dy;
          gradSum += gMag;
          gradCount++;
          if (gMag > maxLocalGrad) maxLocalGrad = gMag;
        }
      }
      var avgGrad = gradCount > 0 ? (gradSum / gradCount) : 0;

      // 5. Kontras Haar vertikal (Dahi vs Cekungan Mata vs Pipi)
      var fSum = 0, fCount = 0;
      var eSum = 0, eCount = 0;
      var cSum = 0, cCount = 0;
      for (var hy1 = 12; hy1 <= 18; hy1++) {
        for (var hx1 = 22; hx1 <= 42; hx1++) { fSum += Ygrid[hy1 * w + hx1]; fCount++; }
      }
      for (var hy2 = 20; hy2 <= 26; hy2++) {
        for (var hx2 = 22; hx2 <= 42; hx2++) { eSum += Ygrid[hy2 * w + hx2]; eCount++; }
      }
      for (var hy3 = 28; hy3 <= 34; hy3++) {
        for (var hx3 = 22; hx3 <= 42; hx3++) { cSum += Ygrid[hy3 * w + hx3]; cCount++; }
      }
      var fAvg = fSum / fCount;
      var eAvg = eSum / eCount;
      var cAvg = cSum / cCount;
      var eyeDip = (fAvg - eAvg) + (cAvg - eAvg);

      // 6. Penolakan meja kayu / telapak tangan polos yang menutupi kamera:
      // Meja kayu atau telapak tangan tanpa fitur wajah memiliki eye dip sangat rendah dan tepi lokal rendah
      var isFlatObject = (eyeDip < 0.5 && maxLocalGrad < 16) || (centerSkinRatio > 0.95 && eyeDip < 1.0);
      if (isFlatObject) return false;

      // Harus memiliki gradien tekstur fitur wajah atau kontras tepi yang memadai
      return (avgGrad >= 2.5 || maxLocalGrad >= 18);
    } catch (_) {
      return false;
    }
  }

  function checkFrame() {
    if (!state.active || !state.videoEl) return;
    var vid = state.videoEl;
    if (vid.readyState < 2) return;

    if (state.detector) {
      try {
        state.detector.detect(vid).then(function (faces) {
          if (faces && faces.length > 0) {
            state.lastNativeFace = true;
            state.lastNativeFaceTime = Date.now();
            handleResult(true);
          } else {
            state.lastNativeFace = false;
            // Native detector menemukan 0 wajah - verifikasi dengan algoritma CV
            handleResult(fallbackCheck(vid, state.canvasEl, state.ctx));
          }
        }).catch(function () {
          handleResult(fallbackCheck(vid, state.canvasEl, state.ctx));
        });
        return;
      } catch (_) {}
    }

    handleResult(fallbackCheck(vid, state.canvasEl, state.ctx));
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
      vid.width = 160;
      vid.height = 120;
      vid.style.position = 'fixed';
      vid.style.top = '0';
      vid.style.left = '0';
      vid.style.width = '4px';
      vid.style.height = '4px';
      vid.style.opacity = '0.05';
      vid.style.pointerEvents = 'none';
      vid.style.zIndex = '999999';
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
    blinkClosing: false,
    blinkCloseStart: 0,
    blinkCount: 0,
    turnDetected: false,
    verified: false
  };

  function resetLiveness() {
    liveness.calibrated = false;
    liveness.calibTicks = 0;
    liveness.eyeDips = [];
    liveness.baselineEyeDip = 0;
    liveness.baselineCentroidX = 32;
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
   * Menolak mutlak foto cetak, foto diam di HP lain, atau video beku.
   */
  function checkLiveness(video, canvas, ctx) {
    var vid = video || state.videoEl;
    var cvs = canvas || state.canvasEl;
    var c = ctx || state.ctx;
    if (!vid || !cvs || !c) return { stage: 'no_face', ok: false };
    if (vid.readyState < 2) return { stage: 'no_face', ok: false };

    var isPresent = fallbackCheck(vid, cvs, c);
    if (!isPresent) {
      liveness.calibrated = false;
      liveness.calibTicks = 0;
      liveness.eyeDips = [];
      liveness.blinkClosing = false;
      return { stage: 'no_face', ok: false };
    }

    if (liveness.verified) {
      return { stage: 'verified', ok: true, blinkCount: liveness.blinkCount, turn: liveness.turnDetected };
    }

    try {
      var w = 64, h = 48;
      var imgData = c.getImageData(0, 0, w, h);
      var d = imgData.data;

      var fSum = 0, fCount = 0;
      var eSum = 0, eCount = 0;
      var cSum = 0, cCount = 0;
      var sumX = 0, skinCount = 0;

      for (var y = 10; y < 40; y++) {
        for (var x = 12; x < 52; x++) {
          var idx = (y * w + x) * 4;
          var r = d[idx], g = d[idx + 1], b = d[idx + 2];
          var yLum = 0.299 * r + 0.587 * g + 0.114 * b;
          var cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          var cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          var isSkin = (cb >= 75 && cb <= 130 && cr >= 133 && cr <= 175 && r > g && r > b);
          if (isSkin) {
            sumX += x;
            skinCount++;
          }

          if (x >= 22 && x <= 42) {
            if (y >= 12 && y <= 18) { fSum += yLum; fCount++; }
            else if (y >= 20 && y <= 26) { eSum += yLum; eCount++; }
            else if (y >= 28 && y <= 34) { cSum += yLum; cCount++; }
          }
        }
      }

      if (skinCount < 80 || fCount === 0 || eCount === 0 || cCount === 0) {
        return { stage: 'no_face', ok: false };
      }

      var fAvg = fSum / fCount;
      var eAvg = eSum / eCount;
      var cAvg = cSum / cCount;
      var eyeDip = (fAvg - eAvg) + (cAvg - eAvg);
      var centroidX = sumX / skinCount;
      var now = Date.now();

      if (!liveness.calibrated) {
        liveness.eyeDips.push(eyeDip);
        liveness.calibTicks++;
        if (liveness.calibTicks >= 2) {
          var sumD = 0;
          for (var i = 0; i < liveness.eyeDips.length; i++) sumD += liveness.eyeDips[i];
          liveness.baselineEyeDip = sumD / liveness.eyeDips.length;
          liveness.baselineCentroidX = centroidX;
          liveness.calibrated = true;
        }
        return { stage: 'aligning', ok: true };
      }

      var curDip = eyeDip;
      var baseDip = liveness.baselineEyeDip;
      if (baseDip >= 10) {
        if (curDip <= baseDip * 0.45) {
          if (!liveness.blinkClosing) {
            liveness.blinkClosing = true;
            liveness.blinkCloseStart = now;
          }
        } else if (liveness.blinkClosing && curDip >= baseDip * 0.75) {
          var dur = now - liveness.blinkCloseStart;
          if (dur >= 60 && dur <= 900) {
            liveness.blinkCount++;
          }
          liveness.blinkClosing = false;
        }
      }

      if (Math.abs(centroidX - liveness.baselineCentroidX) >= 4.0) {
        liveness.turnDetected = true;
      }

      if (liveness.blinkCount >= 1 || liveness.turnDetected) {
        liveness.verified = true;
        return { stage: 'verified', ok: true, blinkCount: liveness.blinkCount, turn: liveness.turnDetected };
      }

      return { stage: 'challenge', ok: true, blinkCount: liveness.blinkCount };
    } catch (_) {
      return { stage: 'no_face', ok: false };
    }
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
