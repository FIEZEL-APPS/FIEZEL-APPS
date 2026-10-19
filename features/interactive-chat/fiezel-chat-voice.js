/**
 * FIEZEL · features/interactive-chat/fiezel-chat-voice.js
 * Satu pintu suara untuk Ngobrol AI dan Panggilan (voice call).
 *
 * KEPUTUSAN OWNER & KANON PWA:
 * 1. Suara Fiezel memakai pipeline Neural Voice resmi dan TIDAK PERNAH memakai TTS bawaan peramban.
 *    Kanon m025-232/m025-246: "tts browser harus mati total." Modul ini tidak pernah menyentuh
 *    API suara peramban; tests/audio-locale-guard-test.js ikut menjaga direktori ini.
 * 2. TANGGA PRIORITAS SUARA:
 *    - Jalur Utama: Server / Local Neural Voice endpoint (/api/tts/line) bila tersedia (Edge Neural
 *      multi-persona: guy, aria, keita, nanami).
 *    - Jalur Fallback:
 *        en -> FiezelVoiceSay.say() (Aset R2 -> Cloudflare TTS -> Puter -> neural lokal di perangkat)
 *              FiezelPuterVoice.speak(en-US)
 *        ja -> FiezelPuterVoice.speak(ja-JP) ('generative' -> 'neural')
 *    - Bila semua lapisan gagal -> DIAM (resolve false, L5 fail-quiet). Teks balasan tetap tampil
 *      di layar; itu L5 yang sama dengan fitur lain, bukan galat.
 * 3. LATENSI PERCAKAPAN TELEPON:
 *    Balasan dipotong per kalimat: kalimat PERTAMA dirender dan diputar sendirian (render pendek =
 *    suara pertama lebih cepat), sementara kalimat berikutnya dihangatkan lewat prefetch() selagi
 *    kalimat sekarang berbunyi. Potongan yang terlalu pendek (<14 karakter) digabung ke kalimat
 *    sesudahnya supaya ucapan tidak tersendat.
 * 4. BARGE-IN:
 *    stop() menaikkan token, menghentikan elemen audio aktif, membatalkan permintaan jaringan yang
 *    sedang berjalan, dan membungkam setiap lapisan cadangan. Loop kalimat memeriksa token sebelum
 *    setiap kalimat, jadi interupsi murid memutus sisa balasan seketika.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelChatVoice = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Ambang batas potongan pendek (6 karakter):
  // Kalimat pembuka pendek ("Hello!", "Hi there!", "Got it!", "こんにちは！") berdiri sendiri
  // dan diucapkan seketika (<250ms). Interjeksi mikro (<6 karakter: "Oh!", "いいね！") tetap digabung
  // ke kalimat berikutnya agar ucapan tidak tersendat.
  var MIN_CHUNK_CHARS = 6;
  var token = 0;
  // Mesin Puter untuk ja-JP yang terbukti menjawab di sesi ini ('generative' / 'neural').
  var jaEngine = '';

  var DEFAULT_ENDPOINT = '/api/tts/line';
  var serverEndpoint = DEFAULT_ENDPOINT;
  // Status koneksi endpoint neural: 'unknown' | 'available' | 'unavailable'
  var serverStatus = 'unknown';
  var lastProbeTime = 0;
  var PROBE_COOLDOWN_MS = 15000;

  var activeAudio = null;
  var activeSource = null;
  var activeAbortController = null;

  // Cache in-memory hasil prefetch dari server neural voice
  // Key: (persona)::(sentence) -> Promise<object|null>
  var prefetchCache = new Map();
  var PREFETCH_CACHE_MAX = 40;

  var CANONICAL_PERSONAS = Object.freeze({
    // English personas
    guy: 'guy',
    aria: 'aria',
    alex: 'guy',
    'coach alex': 'guy',
    coach_alex: 'guy',
    sarah: 'aria',
    male_student: 'guy',
    female_student: 'aria',
    male_en: 'guy',
    female_en: 'aria',

    // Japanese personas
    keita: 'keita',
    nanami: 'nanami',
    instructor: 'keita',
    sensei: 'nanami',
    'fiezel-sensei': 'nanami',
    fiezel_sensei: 'nanami',
    male_ja: 'keita',
    female_ja: 'nanami'
  });

  var defaultPersonas = {
    en: 'guy',
    ja: 'nanami'
  };

  function voiceSay() { return root.FiezelVoiceSay || null; }
  function puter() { return root.FiezelPuterVoice || null; }

  /** Buang furigana [漢字](かんじ) → 漢字 dan tanda markdown; haluskan tanda baca berlebih untuk audio alami. */
  function cleanText(text, course) {
    var s = String(text == null ? '' : text)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~\x60#>]/g, '');
    if (course !== 'ja') {
      // Haluskan elipsis/titik ganda (... / … / ‥) menjadi koma jeda mikro agar TTS tidak membeku 1.2 detik
      s = s.replace(/\.{2,}|…|‥/g, ', ');
    }
    return s
      // Haluskan tanda baca seru/tanya berulang (?! / !? / !! / ??) menjadi tanda tunggal
      .replace(/([?!])\1+/g, '$1')
      .replace(/\?!|!\?/g, '?')
      // Rampingkan koma berulang atau koma ganda
      .replace(/,{2,}/g, ', ')
      // Rampingkan spasi di sekitar tanda baca agar tidak menimbulkan jeda hening audio ganda
      .replace(/\s*([,;:])\s*/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var EN_ABBREV_RE = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|U\.S|U\.K|a\.m|p\.m|e\.g|i\.e)\./gi;
  var EN_DECIMAL_RE = /(\d)\.(\d)/g;
  var DOT_MARK = '\u0001';

  /** Potong per kalimat; potongan pendek digabung ke kalimat berikutnya. Titik desimal/singkatan dilindungi. */
  function splitSentences(text, course) {
    var t = cleanText(text, course);
    if (!t) return [];
    var parts;
    if (course === 'ja') {
      parts = t.match(/[^。！？!?…‥]+[。！？!?…‥]*/g) || [t];
    } else {
      var guarded = t
        .replace(EN_ABBREV_RE, function (m) { return m.slice(0, -1) + DOT_MARK; })
        .replace(EN_DECIMAL_RE, '$1' + DOT_MARK + '$2');
      parts = (guarded.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) || [guarded]).map(function (p) {
        return p.split(DOT_MARK).join('.');
      });
    }
    parts = parts.map(function (p) { return p.trim(); }).filter(Boolean);
    var out = [];
    var carry = '';
    var minLen = course === 'ja' ? 6 : MIN_CHUNK_CHARS;
    for (var i = 0; i < parts.length; i++) {
      var piece = carry ? carry + (course === 'ja' ? '' : ' ') + parts[i] : parts[i];
      if (piece.length < minLen && i < parts.length - 1) { carry = piece; continue; }
      out.push(piece);
      carry = '';
    }
    if (carry) out.push(carry);
    return out;
  }

  function resolvePersona(course, requestedPersona) {
    if (requestedPersona) {
      var req = String(requestedPersona).trim().toLowerCase();
      if (CANONICAL_PERSONAS[req]) return CANONICAL_PERSONAS[req];
      return req;
    }
    var c = course === 'ja' ? 'ja' : 'en';
    return defaultPersonas[c] || (c === 'ja' ? 'nanami' : 'guy');
  }

  function setPersona(persona) {
    if (!persona) return;
    var p = String(persona).trim().toLowerCase();
    var canonical = CANONICAL_PERSONAS[p] || p;
    if (canonical === 'keita' || canonical === 'nanami') {
      defaultPersonas.ja = canonical;
    } else {
      defaultPersonas.en = canonical;
    }
  }

  function setDefaultPersona(course, persona) {
    var c = course === 'ja' ? 'ja' : 'en';
    if (!persona) return;
    var p = String(persona).trim().toLowerCase();
    defaultPersonas[c] = CANONICAL_PERSONAS[p] || p;
  }

  function setEndpoint(url) {
    if (url) {
      serverEndpoint = String(url).trim();
      serverStatus = 'unknown';
    }
  }

  function getCandidateEndpoints() {
    var list = [];
    if (root.FIEZEL_TTS_CONFIG && root.FIEZEL_TTS_CONFIG.endpoint) {
      list.push(root.FIEZEL_TTS_CONFIG.endpoint);
    }
    if (root.__FIEZEL_TTS_LINE_ENDPOINT) {
      list.push(root.__FIEZEL_TTS_LINE_ENDPOINT);
    }
    if (serverEndpoint && serverEndpoint !== DEFAULT_ENDPOINT) {
      list.push(serverEndpoint);
    }

    var isLocal = false;
    if (root.location) {
      var h = root.location.hostname;
      var port = root.location.port;
      if (h === 'localhost' || h === '127.0.0.1' || port === '3000' || (root.location.protocol === 'http:' && !h.includes('.'))) {
        isLocal = true;
      }
    }

    if (isLocal) {
      if (root.location && root.location.origin && root.location.origin !== 'null' && root.location.protocol !== 'file:') {
        list.push(root.location.origin + '/api/tts/line');
      }
      list.push('http://127.0.0.1:3000/api/tts/line');
    }

    if (root.FIEZEL_TTS_CONFIG && root.FIEZEL_TTS_CONFIG.endpoint) {
      list.push(root.FIEZEL_TTS_CONFIG.endpoint);
    }
    if (root.__FIEZEL_TTS_LINE_ENDPOINT) {
      list.push(root.__FIEZEL_TTS_LINE_ENDPOINT);
    }
    if (serverEndpoint && serverEndpoint !== DEFAULT_ENDPOINT) {
      list.push(serverEndpoint);
    }

    if (root.location && root.location.origin && root.location.origin !== 'null' && root.location.protocol !== 'file:') {
      if (root.FIEZEL_CURRICULUM_CONFIG && root.FIEZEL_CURRICULUM_CONFIG.curriculumApiUrl) {
        var base = String(root.FIEZEL_CURRICULUM_CONFIG.curriculumApiUrl).replace(/\/+$/, '');
        list.push(base + '/api/tts/line');
      } else if (!isLocal) {
        list.push('https://fiezel-apps.onrender.com/api/tts/line');
      }

      if (root.location.pathname) {
        var baseDir = root.location.pathname.replace(/\/[^/]*$/, '');
        if (baseDir && baseDir !== '/') {
          list.push(root.location.origin + baseDir + '/api/tts/line/index.php');
          list.push(root.location.origin + baseDir + '/api/tts/line');
        }
      }
      list.push(root.location.origin + '/api/tts/line/index.php');
      list.push(root.location.origin + '/api/tts/line');
    } else {
      list.push('/api/tts/line');
    }

    var seen = {};
    var unique = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item && !seen[item]) {
        seen[item] = true;
        unique.push(item);
      }
    }
    return unique;
  }

  function getEndpoint() {
    var candidates = getCandidateEndpoints();
    return candidates[0] || DEFAULT_ENDPOINT;
  }

  function resolveAbsoluteUrl(pathStr) {
    if (!pathStr) return '';
    if (/^https?:\/\//i.test(pathStr)) return pathStr;
    if (root.__FIEZEL_SERVER_BASE__) {
      return String(root.__FIEZEL_SERVER_BASE__).replace(/\/+$/, '') + pathStr;
    }
    if (root.location) {
      var proto = root.location.protocol;
      var origin = root.location.origin;
      if (proto === 'file:' || origin === 'null' || !origin) {
        return 'http://127.0.0.1:3000' + pathStr;
      }
      if (root.location.port === '3000' || root.location.hostname === 'localhost' || root.location.hostname === '127.0.0.1') {
        return 'http://127.0.0.1:3000' + pathStr;
      }
      return origin + pathStr;
    }
    return 'http://127.0.0.1:3000' + pathStr;
  }

  function isServerConfigured() {
    if (root.FIEZEL_SERVER_TTS_ENABLED === false) return false;
    if (root.FIEZEL_SERVER_TTS_ENABLED === true || root.__FIEZEL_TTS_LINE_AVAILABLE === true) return true;
    return null;
  }

  function isServerAvailable() {
    var cfg = isServerConfigured();
    if (cfg !== null) return cfg;
    return serverStatus !== 'unavailable';
  }

  function setServerAvailable(val) {
    serverStatus = val ? 'available' : 'unavailable';
    lastProbeTime = Date.now();
  }

  function probeEndpoint(url) {
    var explicit = isServerConfigured();
    if (explicit !== null) {
      serverStatus = explicit ? 'available' : 'unavailable';
      return Promise.resolve(explicit);
    }
    var f = root.fetch;
    if (typeof f !== 'function') {
      serverStatus = 'unavailable';
      return Promise.resolve(false);
    }
    var candidates = url ? [url] : getCandidateEndpoints();
    var idx = 0;

    function tryNext() {
      if (idx >= candidates.length) {
        serverStatus = 'unavailable';
        lastProbeTime = Date.now();
        return Promise.resolve(false);
      }
      var target = resolveAbsoluteUrl(candidates[idx++]);
      var probeUrl = target.replace(/\/line(\/index\.php)?\/?$/, '/personas$1');
      var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      var timer = null;
      if (controller) {
        timer = setTimeout(function () {
          try { controller.abort(); } catch (_) {}
        }, 3000);
      }

      return f(probeUrl, {
        method: 'GET',
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        if (res && (res.ok || res.status === 200 || res.status === 400 || res.status === 405)) {
          serverStatus = 'available';
          serverEndpoint = target;
          return true;
        }
        return tryNext();
      }).catch(function () {
        if (timer) clearTimeout(timer);
        return tryNext();
      });
    }

    return tryNext();
  }

  /**
   * Panggil endpoint server /api/tts/line untuk sintesis satu ujaran.
   * Mendukung failover otomatis antar candidate endpoint (local server, Render cloud, same-origin).
   * Mengembalikan Promise<{ audioBase64: string, mimeType?: string, url?: string } | null>.
   */
  function fetchServerLine(sentence, persona, course, cancelSignal) {
    var cacheKey = persona + '::' + sentence;
    if (prefetchCache.has(cacheKey)) {
      var cachedPromise = prefetchCache.get(cacheKey);
      prefetchCache.delete(cacheKey);
      return Promise.resolve(cachedPromise);
    }

    // Mock handler untuk pengujian lokal / node unit test
    if (root.__FIEZEL_TEST_MOCK_TTS_LINE__ && typeof root.__FIEZEL_TEST_MOCK_TTS_LINE__ === 'function') {
      return Promise.resolve(root.__FIEZEL_TEST_MOCK_TTS_LINE__(sentence, persona, course));
    }

    var f = root.fetch;
    if (typeof f !== 'function') return Promise.resolve(null);

    var body = {
      text: sentence,
      speaker: persona,
      persona: persona,
      lang: course === 'ja' ? 'ja-JP' : 'en-US'
    };

    var candidates = getCandidateEndpoints();
    // Prioritaskan endpoint yang terakhir berhasil jika ada
    if (serverEndpoint && candidates.indexOf(serverEndpoint) > 0) {
      candidates.splice(candidates.indexOf(serverEndpoint), 1);
      candidates.unshift(serverEndpoint);
    }

    var cIdx = 0;

    function tryFetchCandidate() {
      if (cIdx >= candidates.length) return Promise.resolve(null);
      var currentTarget = resolveAbsoluteUrl(candidates[cIdx++]);

      var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      var timer = null;
      var onCancel = null;
      if (controller) {
        timer = setTimeout(function () {
          try { controller.abort(); } catch (_) {}
        }, 3500);
        if (cancelSignal) {
          if (cancelSignal.aborted) {
            try { controller.abort(); } catch (_) {}
          } else if (typeof cancelSignal.addEventListener === 'function') {
            onCancel = function () {
              try { controller.abort(); } catch (_) {}
            };
            cancelSignal.addEventListener('abort', onCancel, { once: true });
          }
        }
      }
      var signal = controller ? controller.signal : cancelSignal;

      return f(currentTarget, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: signal
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        if (cancelSignal && onCancel && typeof cancelSignal.removeEventListener === 'function') {
          cancelSignal.removeEventListener('abort', onCancel);
        }
        if (!res || !res.ok) {
          // Coba candidate endpoint berikutnya
          return tryFetchCandidate();
        }
        return res.json().then(function (data) {
          if (data && (data.audioBase64 || data.url)) {
            // Ingat endpoint yang sukses
            serverEndpoint = currentTarget;
            serverStatus = 'available';
            return data;
          }
          return tryFetchCandidate();
        }).catch(function () {
          return tryFetchCandidate();
        });
      }).catch(function (err) {
        if (timer) clearTimeout(timer);
        if (cancelSignal && onCancel && typeof cancelSignal.removeEventListener === 'function') {
          cancelSignal.removeEventListener('abort', onCancel);
        }
        var isAbort = (err && (err.name === 'AbortError' || err.message === 'aborted')) ||
                      (controller && controller.signal && controller.signal.aborted) ||
                      (cancelSignal && cancelSignal.aborted);
        if (isAbort) return null;
        return tryFetchCandidate();
      });
    }

    return tryFetchCandidate();
  }

  /**
   * Putar audio hasil sintesis server tanpa menyentuh speechSynthesis.
   */
  function playAudioResult(resultObj, myToken) {
    if (!resultObj || myToken !== token) return Promise.resolve(false);

    if (root.__FIEZEL_TEST_AUDIO_PLAYER__ && typeof root.__FIEZEL_TEST_AUDIO_PLAYER__.play === 'function') {
      return Promise.resolve(root.__FIEZEL_TEST_AUDIO_PLAYER__.play(resultObj, myToken));
    }

    var base64 = resultObj.audioBase64;
    var mimeType = resultObj.mimeType || 'audio/mpeg';

    if (!base64 && resultObj.url) {
      var store = root.FiezelAudioResolver;
      if (store && typeof store.playUrl === 'function') {
        return Promise.resolve(store.playUrl(resultObj.url, { speed: 1 })).then(function (ok) {
          return myToken === token && !!ok;
        }, function () { return false; });
      }
    }

    if (!base64) return Promise.resolve(false);

    return new Promise(function (resolve) {
      if (myToken !== token) { resolve(false); return; }
      var AudioCtor = root.Audio;
      if (!AudioCtor) {
        // Lingkungan tanpa driver audio (misal Node.js test harness murni)
        resolve(true);
        return;
      }

      var blob = null;
      var objUrl = null;
      try {
        if (typeof root.atob === 'function' && typeof root.Blob === 'function') {
          var bin = root.atob(base64);
          var len = bin.length;
          var arr = new Uint8Array(len);
          for (var j = 0; j < len; j++) arr[j] = bin.charCodeAt(j);
          blob = new root.Blob([arr], { type: mimeType });
          if (root.URL && typeof root.URL.createObjectURL === 'function') {
            objUrl = root.URL.createObjectURL(blob);
          }
        }
      } catch (_) {}

      var src = objUrl || ('data:' + mimeType + ';base64,' + base64);
      var audio = null;
      try {
        audio = new AudioCtor(src);
      } catch (_) {
        if (objUrl && root.URL && typeof root.URL.revokeObjectURL === 'function') {
          try { root.URL.revokeObjectURL(objUrl); } catch (_) {}
        }
        resolve(false);
        return;
      }

      activeAudio = audio;
      var settled = false;

      function cleanup() {
        if (settled) return;
        settled = true;
        if (activeAudio === audio) activeAudio = null;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        if (objUrl && objUrl.indexOf('blob:') === 0 && root.URL && typeof root.URL.revokeObjectURL === 'function') {
          try { root.URL.revokeObjectURL(objUrl); } catch (_) {}
        }
      }

      audio.onended = function () {
        cleanup();
        resolve(myToken === token);
      };

      // Potong ekor hening container MP3 (~220ms) agar transisi antar-kalimat tidak menimbulkan jeda kosong
      audio.ontimeupdate = function () {
        if (audio.duration && audio.duration > 1.0 && audio.currentTime >= audio.duration - 0.22) {
          audio.ontimeupdate = null;
          cleanup();
          resolve(myToken === token);
        }
      };

      audio.onpause = function () {
        if (myToken !== token) {
          cleanup();
          resolve(false);
        }
      };

      audio.onerror = function () {
        cleanup();
        resolve(false);
      };

      function playViaWebAudio() {
        if (!arr || !arr.length) {
          cleanup();
          resolve(false);
          return;
        }
        try {
          var AudioCtx = root.AudioContext || root.webkitAudioContext;
          if (!AudioCtx) {
            cleanup();
            resolve(false);
            return;
          }
          if (!root.__fiezelSharedAudioContext || root.__fiezelSharedAudioContext.state === 'closed') {
            root.__fiezelSharedAudioContext = new AudioCtx();
          }
          var ctx = root.__fiezelSharedAudioContext;
          var resumeP = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
          resumeP.then(function () {
            var copyBuf = arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
            return ctx.decodeAudioData(copyBuf);
          }).then(function (audioBuf) {
            if (myToken !== token) {
              cleanup();
              resolve(false);
              return;
            }
            var src = ctx.createBufferSource();
            src.buffer = audioBuf;
            src.connect(ctx.destination);
            activeSource = src;
            // WebAudio zero-gap scheduling: selesaikan sebelum ekor hening container
            var playDuration = Math.max(0.1, audioBuf.duration - 0.20);
            var endTimer = setTimeout(function () {
              if (activeSource === src) activeSource = null;
              cleanup();
              resolve(myToken === token);
            }, playDuration * 1000);
            src.onended = function () {
              if (endTimer) clearTimeout(endTimer);
              if (activeSource === src) activeSource = null;
              cleanup();
              resolve(myToken === token);
            };
            src.start(0);
          }).catch(function () {
            cleanup();
            resolve(false);
          });
        } catch (_) {
          cleanup();
          resolve(false);
        }
      }

      try {
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(function () {
            // Autoplay rejection: jatuh ke WebAudio decoder
            playViaWebAudio();
          });
        }
      } catch (_) {
        playViaWebAudio();
      }
    });
  }

  function unlockAudio() {
    try {
      var AudioCtx = root.AudioContext || root.webkitAudioContext;
      if (!AudioCtx) return;
      if (!root.__fiezelSharedAudioContext || root.__fiezelSharedAudioContext.state === 'closed') {
        root.__fiezelSharedAudioContext = new AudioCtx();
      }
      var ctx = root.__fiezelSharedAudioContext;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }
    } catch (_) {}
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  }

  function speakJaFallback(sentence, myToken, persona) {
    var p = puter();
    if (!p || typeof p.speak !== 'function') return Promise.resolve(false);
    if (myToken && myToken !== token) return Promise.resolve(false);
    var engines = jaEngine ? [jaEngine] : ['generative', 'neural'];
    var voice = (persona === 'nanami' || /nanami/i.test(persona)) ? 'ja-JP-NanamiNeural' : 'ja-JP-KeitaNeural';
    function attempt(i) {
      if (myToken && myToken !== token) return Promise.resolve(false);
      if (i >= engines.length) return Promise.resolve(false);
      return Promise.resolve(p.speak(sentence, { lang: 'ja-JP', engine: engines[i], voice: voice })).then(function (ok) {
        if (myToken && myToken !== token) return false;
        if (ok) jaEngine = engines[i];
        return !!ok;
      }, function () {
        if (myToken && myToken !== token) return false;
        return attempt(i + 1);
      });
    }
    return attempt(0);
  }

  function speakEnFallback(sentence, myToken, persona) {
    if (myToken && myToken !== token) return Promise.resolve(false);
    var voice = (persona === 'aria' || persona === 'sarah' || /aria|sarah/i.test(persona)) ? 'en-US-AriaNeural' : 'en-US-GuyNeural';
    var vs = voiceSay();
    if (vs && typeof vs.say === 'function') {
      return Promise.resolve(vs.say(sentence, { suppressSubtitles: true, voice: voice })).then(function (ok) {
        if (myToken && myToken !== token) return false;
        return !!ok;
      }, function () { return false; });
    }
    var p = puter();
    if (p && typeof p.speak === 'function') {
      return Promise.resolve(p.speak(sentence, { lang: 'en-US', voice: voice })).then(function (ok) {
        if (myToken && myToken !== token) return false;
        return !!ok;
      }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  /**
   * Ucapkan satu kalimat dengan prioritas:
   * 1. Neural Voice Server Line (/api/tts/line) bila tersedia atau belum dipastikan gagal.
   * 2. Fallback: FiezelVoiceSay (en) / FiezelPuterVoice (ja).
   * 3. Jika semua gagal: DIAM (L5).
   */
  function speakSentence(sentence, course, options) {
    var c = course === 'ja' ? 'ja' : 'en';
    var opts = options || {};
    var persona = resolvePersona(c, opts.persona || opts.voice);
    var myToken = token;

    var isExplicitOff = root.FIEZEL_SERVER_TTS_ENABLED === false;
    var isCoolingDown = (serverStatus === 'unavailable') && (Date.now() - lastProbeTime < PROBE_COOLDOWN_MS);
    var canTryServer = !isExplicitOff && !isCoolingDown;

    if (canTryServer) {
      activeAbortController = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      var cancelSignal = activeAbortController ? activeAbortController.signal : undefined;

      return fetchServerLine(sentence, persona, c, cancelSignal).then(function (result) {
        if (myToken !== token) return false;
        if (result && (result.audioBase64 || result.url)) {
          serverStatus = 'available';
          return playAudioResult(result, myToken);
        }
        if (serverStatus !== 'available') {
          serverStatus = 'unavailable';
          lastProbeTime = Date.now();
        }
        return false;
      }).then(function (ok) {
        if (myToken !== token) return false;
        if (ok) return true;
        return c === 'ja' ? speakJaFallback(sentence, myToken, persona) : speakEnFallback(sentence, myToken, persona);
      }).catch(function () {
        if (myToken !== token) return false;
        if (serverStatus !== 'available') {
          serverStatus = 'unavailable';
          lastProbeTime = Date.now();
        }
        return c === 'ja' ? speakJaFallback(sentence, myToken, persona) : speakEnFallback(sentence, myToken, persona);
      });
    }

    return c === 'ja' ? speakJaFallback(sentence, myToken, persona) : speakEnFallback(sentence, myToken, persona);
  }

  /**
   * Menghangatkan kalimat berikutnya di belakang layar.
   * Tidak pernah reject dan tidak pernah berbunyi.
   */
  function prefetch(sentence, course, options) {
    try {
      var opts = options || {};
      var c = course === 'ja' ? 'ja' : 'en';
      var clean = cleanText(sentence);
      if (!clean) return Promise.resolve(false);

      var persona = resolvePersona(c, opts.persona);
      var cacheKey = persona + '::' + clean;

      var isExplicitOff = root.FIEZEL_SERVER_TTS_ENABLED === false;
      var canTryServer = !isExplicitOff && (serverStatus !== 'unavailable');

      if (canTryServer && !prefetchCache.has(cacheKey)) {
        var p = fetchServerLine(clean, persona, c).catch(function () { return null; });
        if (prefetchCache.size >= PREFETCH_CACHE_MAX) {
          var firstKey = prefetchCache.keys().next().value;
          prefetchCache.delete(firstKey);
        }
        prefetchCache.set(cacheKey, p);
      }

      if (c === 'ja') {
        var pVoice = puter();
        if (pVoice && typeof pVoice.prefetch === 'function') {
          return Promise.resolve(pVoice.prefetch(clean, { lang: 'ja-JP', engine: jaEngine || 'generative' })).catch(function () { return false; });
        }
        return Promise.resolve(false);
      }
      var vs = voiceSay();
      if (vs && typeof vs.prefetch === 'function') {
        return Promise.resolve(vs.prefetch(clean, {})).catch(function () { return false; });
      }
    } catch (_) {}
    return Promise.resolve(false);
  }

  function isAvailable(course) {
    if (isServerAvailable()) return true;
    if (course === 'ja') return !!(puter() && typeof puter().speak === 'function');
    return !!((voiceSay() && typeof voiceSay().say === 'function') || (puter() && typeof puter().speak === 'function'));
  }

  /**
   * Ucapkan satu balasan penuh.
   * @param {string} text
   * @param {'en'|'ja'} course
   * @param {{onSentenceStart?:function(number,string), onEnd?:function(boolean), persona?:string, endpoint?:string}} [hooks]
   * @returns {Promise<boolean>} true bila minimal satu kalimat berbunyi dan giliran tidak diputus
   */
  function speak(text, course, hooks) {
    stop();
    var mine = ++token;
    var h = hooks || {};
    var c = course === 'ja' ? 'ja' : 'en';

    try {
      var lazy = root.FiezelLazy || root.FiezelLazyLoader || null;
      if (lazy && typeof lazy.load === 'function' && typeof lazy.loaded === 'function' && !lazy.loaded('voice')) {
        lazy.load('voice');
      }
    } catch (_) {}

    var sentences = splitSentences(text, c);
    var spokeAny = false;

    function finish(ok) {
      if (typeof h.onEnd === 'function') { try { h.onEnd(ok); } catch (_) {} }
      return ok;
    }
    if (!sentences.length || !isAvailable(c)) return Promise.resolve(finish(false));

    function step(i) {
      if (mine !== token) return Promise.resolve(false);
      if (i >= sentences.length) return Promise.resolve(spokeAny);
      if (typeof h.onSentenceStart === 'function') { try { h.onSentenceStart(i, sentences[i]); } catch (_) {} }
      // Prioritaskan pengiriman audio kalimat saat ini ke jaringan seketika (<250ms)
      var run = speakSentence(sentences[i], c, h);
      // Kalimat berikutnya dihangatkan (prefetch) di latar belakang selagi kalimat sekarang berbunyi
      if (i + 1 < sentences.length) {
        Promise.resolve().then(function () {
          if (mine === token) prefetch(sentences[i + 1], c, h);
        });
      }
      return run.then(function (ok) {
        if (mine !== token) return false;
        if (!ok) return spokeAny; // lapisan habis: sisa balasan tetap terbaca di layar (L5)
        spokeAny = true;
        return step(i + 1);
      });
    }
    return step(0).then(function (ok) { return finish(mine === token && ok); });
  }

  /** Barge-in / ganti giliran / unmount: putus loop kalimat dan bungkam semua lapisan seketika. */
  function stop() {
    token++;
    if (activeSource) {
      try { activeSource.stop(0); } catch (_) {}
      activeSource = null;
    }
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.muted = true;
        activeAudio.volume = 0;
        activeAudio.currentTime = 0;
        activeAudio.src = '';
      } catch (_) {}
      activeAudio = null;
    }
    if (activeSource) {
      try { activeSource.stop(0); } catch (_) {}
      activeSource = null;
    }
    if (activeAbortController) {
      try { activeAbortController.abort(); } catch (_) {}
      activeAbortController = null;
    }
    // Bungkam seluruh elemen HTML5 <audio> aktif di dokumen seketika tanpa kebocoran suara
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      try {
        var audios = document.querySelectorAll('audio');
        for (var a = 0; a < audios.length; a++) {
          try {
            audios[a].pause();
            audios[a].muted = true;
            audios[a].volume = 0;
            audios[a].currentTime = 0;
          } catch (_) {}
        }
      } catch (_) {}
    }
    var vs = voiceSay();
    if (vs && typeof vs.stop === 'function') { try { vs.stop(); } catch (_) {} }
    var p = puter();
    if (p && typeof p.stop === 'function') { try { p.stop(); } catch (_) {} }
    if (root && root.FiezelAudioAssets && typeof root.FiezelAudioAssets.stop === 'function') {
      try { root.FiezelAudioAssets.stop(); } catch (_) {}
    }
    if (root && root.FiezelNeuralVoice && typeof root.FiezelNeuralVoice.stop === 'function') {
      try { root.FiezelNeuralVoice.stop(); } catch (_) {}
    }
    if (root && root.FiezelWebAudioPlayer && typeof root.FiezelWebAudioPlayer.stop === 'function') {
      try { root.FiezelWebAudioPlayer.stop(); } catch (_) {}
    }
    if (root && root.FiezelVoiceRuntime && typeof root.FiezelVoiceRuntime.stop === 'function') {
      try { root.FiezelVoiceRuntime.stop(); } catch (_) {}
    }
    return true;
  }

  return {
    speak: speak,
    stop: stop,
    prefetch: prefetch,
    isAvailable: isAvailable,
    splitSentences: splitSentences,
    cleanText: cleanText,
    resolvePersona: resolvePersona,
    setPersona: setPersona,
    setDefaultPersona: setDefaultPersona,
    getEndpoint: getEndpoint,
    setEndpoint: setEndpoint,
    getCandidateEndpoints: getCandidateEndpoints,
    unlockAudio: unlockAudio,
    probeEndpoint: probeEndpoint,
    isServerAvailable: isServerAvailable,
    setServerAvailable: setServerAvailable,
    CANONICAL_PERSONAS: CANONICAL_PERSONAS
  };
}));
