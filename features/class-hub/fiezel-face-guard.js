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

  var SAMPLE_INTERVAL_MS = 1500;
  var WARN_THRESHOLD_MS = 5000;
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
   * Mengukur variasi kontras dan rentang warna kulit pada frame 64x48.
   */
  function fallbackCheck(video, canvas, ctx) {
    if (!video || !canvas || !ctx || video.readyState < 2) return true;
    try {
      ctx.drawImage(video, 0, 0, 64, 48);
      var imgData = ctx.getImageData(0, 0, 64, 48);
      var d = imgData.data;
      var totalBright = 0, skinHits = 0, count = d.length / 4;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        var br = (r + g + b) / 3;
        totalBright += br;
        // Deteksi rentang spektrum warna kulit universal (YCbCr sederhana)
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 10) {
          skinHits++;
        }
      }
      var avgBr = totalBright / count;
      // Jika kamera tertutup total atau sangat gelap (< 8) atau tanpa pola (skinHits < 2%)
      if (avgBr < 8 || (skinHits / count < 0.02 && avgBr < 20)) {
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
          handleResult(faces && faces.length > 0);
        }).catch(function () {
          // Fallback bila inferensi gagal
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
        if (typeof opts.onPresent === 'function') opts.onPresent(duration);
      }
    } else {
      if (!state.absentSince) {
        state.absentSince = now;
      }
      var elapsed = now - state.absentSince;
      if (elapsed >= WARN_THRESHOLD_MS && !state.warned) {
        state.warned = true;
        if (typeof opts.onWarning === 'function') opts.onWarning(true, elapsed);
      }
      if (elapsed >= ABSENT_THRESHOLD_MS) {
        if (typeof opts.onAbsentEpisode === 'function') opts.onAbsentEpisode(elapsed);
      }
    }
  }

  function start(opts) {
    if (state.active) return Promise.resolve({ ok: true, active: true });
    state.options = opts || {};
    state.absentSince = 0;
    state.warned = false;

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

    return navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
      state.stream = mediaStream;
      state.active = true;

      var vid = document.createElement('video');
      vid.setAttribute('playsinline', '');
      vid.setAttribute('autoplay', '');
      vid.muted = true;
      vid.style.position = 'fixed';
      vid.style.top = '-9999px';
      vid.style.left = '-9999px';
      vid.style.width = '1px';
      vid.style.height = '1px';
      vid.style.opacity = '0';
      vid.style.pointerEvents = 'none';
      vid.srcObject = mediaStream;

      vid.onloadedmetadata = function () {
        try { vid.play(); } catch (_) {}
      };
      document.body.appendChild(vid);
      state.videoEl = vid;

      var cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 48;
      state.canvasEl = cvs;
      state.ctx = cvs.getContext('2d', { willReadFrequently: true });

      state.timer = setInterval(checkFrame, SAMPLE_INTERVAL_MS);
      return { ok: true, active: true };
    }).catch(function (err) {
      state.active = false;
      return { ok: false, reason: (err && err.name) || 'permission_denied' };
    });
  }

  function stop() {
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
    state.options = null;
  }

  function isActive() { return !!state.active; }
  function isWarning() { return !!state.warned; }

  return {
    isSupported: isSupported,
    start: start,
    stop: stop,
    isActive: isActive,
    isWarning: isWarning,
    SAMPLE_INTERVAL_MS: SAMPLE_INTERVAL_MS,
    WARN_THRESHOLD_MS: WARN_THRESHOLD_MS,
    ABSENT_THRESHOLD_MS: ABSENT_THRESHOLD_MS
  };
});
