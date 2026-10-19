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

  /** Buang furigana [漢字](かんじ) → 漢字 dan tanda markdown; yang diucapkan hanya kalimatnya. */
  function cleanText(text) {
    return String(text == null ? '' : text)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~\x60#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Potong per kalimat; potongan pendek digabung ke kalimat berikutnya. */
  function splitSentences(text, course) {
    var t = cleanText(text);
    if (!t) return [];
    var re = course === 'ja'
      ? /[^。！？!?]+[。！？!?]*/g
      : /[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g;
    var parts = (t.match(re) || [t]).map(function (p) { return p.trim(); }).filter(Boolean);
    var out = [];
    var carry = '';
    for (var i = 0; i < parts.length; i++) {
      var piece = carry ? carry + (course === 'ja' ? '' : ' ') + parts[i] : parts[i];
      if (piece.length < MIN_CHUNK_CHARS && i < parts.length - 1) { carry = piece; continue; }
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

  function getEndpoint() {
    var custom = (root.FIEZEL_CF_CONFIG && root.FIEZEL_CF_CONFIG.ttsLineEndpoint) ||
                 root.__FIEZEL_TTS_LINE_ENDPOINT ||
                 (root.FIEZEL_SERVER_CONFIG && root.FIEZEL_SERVER_CONFIG.ttsEndpoint) ||
                 serverEndpoint;
    return custom || DEFAULT_ENDPOINT;
  }

  function resolveAbsoluteUrl(pathStr) {
    if (!pathStr) return '';
    if (/^https?:\/\//i.test(pathStr)) return pathStr;
    if (root.location && root.location.origin) {
      return root.location.origin + pathStr;
    }
    if (root.__FIEZEL_SERVER_BASE__) {
      return String(root.__FIEZEL_SERVER_BASE__).replace(/\/+$/, '') + pathStr;
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
    return serverStatus === 'available';
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
    var target = resolveAbsoluteUrl(url || getEndpoint());
    var probeUrl = target.replace(/\/line\/?$/, '/personas');
    var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = null;
    if (controller) {
      timer = setTimeout(function () {
        try { controller.abort(); } catch (_) {}
      }, 950);
    }

    return f(probeUrl, {
      method: 'GET',
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (res && (res.ok || res.status === 200 || res.status === 400 || res.status === 405)) {
        serverStatus = 'available';
        return true;
      }
      serverStatus = 'unavailable';
      lastProbeTime = Date.now();
      return false;
    }).catch(function () {
      if (timer) clearTimeout(timer);
      serverStatus = 'unavailable';
      lastProbeTime = Date.now();
      return false;
    });
  }

  /**
   * Panggil endpoint server /api/tts/line untuk sintesis satu ujaran.
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

    var targetUrl = resolveAbsoluteUrl(getEndpoint());
    var body = {
      text: sentence,
      speaker: persona,
      persona: persona,
      lang: course === 'ja' ? 'ja-JP' : 'en-US'
    };

    var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = null;
    if (controller) {
      timer = setTimeout(function () {
        try { controller.abort(); } catch (_) {}
      }, 9000);
    }

    var signal = cancelSignal || (controller ? controller.signal : undefined);

    return f(targetUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res || !res.ok) return null;
      return res.json().catch(function () { return null; });
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return null;
    });
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

      if (myToken !== token) {
        cleanup();
        resolve(false);
        return;
      }

      try {
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(function () {
            cleanup();
            resolve(false);
          });
        }
      } catch (_) {
        cleanup();
        resolve(false);
      }
    });
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
    var canTryServer = !isExplicitOff && !isCoolingDown && (
      Boolean(root.__FIEZEL_TEST_MOCK_TTS_LINE__) ||
      root.FIEZEL_SERVER_TTS_ENABLED === true ||
      root.__FIEZEL_TTS_LINE_AVAILABLE === true ||
      serverStatus === 'available'
    );

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
      var canTryServer = !isExplicitOff && (serverStatus !== 'unavailable') && (
        Boolean(root.__FIEZEL_TEST_MOCK_TTS_LINE__) ||
        root.FIEZEL_SERVER_TTS_ENABLED === true ||
        root.__FIEZEL_TTS_LINE_AVAILABLE === true ||
        serverStatus === 'available'
      );

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
    probeEndpoint: probeEndpoint,
    isServerAvailable: isServerAvailable,
    setServerAvailable: setServerAvailable,
    CANONICAL_PERSONAS: CANONICAL_PERSONAS
  };
}));
