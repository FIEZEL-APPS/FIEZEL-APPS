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

  var SAMPLE_INTERVAL_MS = 1000;
  var WARN_THRESHOLD_MS = 2000;
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
   * Analisis piksel fallback saat browser belum memiliki FaceDetector bawaan.
   * Mengukur variasi kontras, kecerahan, dan rentang spektrum warna kulit pada frame 64x48.
   */
  function fallbackCheck(video, canvas, ctx) {
    if (!video || !canvas || !ctx) return true;
    if (video.readyState < 2) return true;
    try {
      var w = 64, h = 48;
      ctx.drawImage(video, 0, 0, w, h);
      var imgData = ctx.getImageData(0, 0, w, h);
      var d = imgData.data;
      var totalBright = 0, totalSkin = 0, centerSkin = 0;
      var minBr = 255, maxBr = 0;
      var count = w * h;
      var centerCount = 0;

      // Area tengah kamera depan (persegi 50% di mana wajah murid berada saat menghadap layar)
      var cX1 = 16, cX2 = 48, cY1 = 10, cY2 = 38;

      for (var y = 0; y < h; y++) {
        var isCenterY = (y >= cY1 && y <= cY2);
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          var r = d[idx], g = d[idx + 1], b = d[idx + 2];
          var br = (r + g + b) / 3;
          totalBright += br;
          if (br < minBr) minBr = br;
          if (br > maxBr) maxBr = br;

          var isCenter = isCenterY && (x >= cX1 && x <= cX2);
          if (isCenter) centerCount++;

          // Deteksi spektrum warna kulit universal (melanin & hemoglobin menyerap hijau & biru)
          var isSkin = false;
          if (r > 38 && g > 25 && b > 15 && r > g && r > b) {
            var diffRG = r - g;
            var diffRB = r - b;
            var maxC = Math.max(r, Math.max(g, b));
            var minC = Math.min(r, Math.min(g, b));
            if (diffRG >= 5 && diffRB >= 8 && (maxC - minC) >= 10) {
              isSkin = true;
            }
          }

          if (isSkin) {
            totalSkin++;
            if (isCenter) centerSkin++;
          }
        }
      }

      var avgBr = totalBright / count;
      var contrastRange = maxBr - minBr;
      var skinRatio = totalSkin / count;
      var centerSkinRatio = centerCount > 0 ? (centerSkin / centerCount) : skinRatio;

      // 1. Kamera tertutup rapat (jari, meja, kantong, lakban) -> sangat gelap
      if (avgBr < 14) {
        return false;
      }

      // 2. Kamera tersorot lampu langsung / silau ekstrem tanpa kontras wajah
      if (avgBr > 240 && contrastRange < 15) {
        return false;
      }

      // 3. Kamera ditutup jempol tembus cahaya (flat merah pekat tanpa kontras fitur wajah)
      if (contrastRange < 12 && skinRatio > 0.5) {
        return false;
      }

      // 4. Kamera menghadap langit-langit / dinding kosong / meja / laptop (tanpa kulit di tengah atau frame)
      if (skinRatio < 0.025 && centerSkinRatio < 0.03) {
        return false;
      }

      return true;
    } catch (_) {
      return true; // Asumsikan hadir bila kanvas gagal
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
            handleResult(true);
          } else {
            // Verifikasi ganda dengan fallback agar tidak keliru memvonis saat minim cahaya
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
      vid.style.left = '0';
      vid.style.bottom = '0';
      vid.style.width = '160px';
      vid.style.height = '120px';
      vid.style.opacity = '0.001';
      vid.style.pointerEvents = 'none';
      vid.style.zIndex = '-9999';
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

  function verifyPresence() {
    if (!state.active || !state.videoEl || state.videoEl.readyState < 2) return false;
    return fallbackCheck(state.videoEl, state.canvasEl, state.ctx);
  }

  function checkNow() {
    if (!state.active) return false;
    checkFrame();
    return !state.absentSince;
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
    SAMPLE_INTERVAL_MS: SAMPLE_INTERVAL_MS,
    WARN_THRESHOLD_MS: WARN_THRESHOLD_MS,
    ABSENT_THRESHOLD_MS: ABSENT_THRESHOLD_MS
  };
});
