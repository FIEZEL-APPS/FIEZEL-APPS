(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelNeuralVoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeText(input, maxChars) {
    const text = String(input == null ? '' : input)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) throw new Error('TTS text is empty');
    if (text.length > maxChars) throw new Error('TTS text exceeds bounded input limit');
    return text;
  }

  function splitByHardChars(chunks, hardChars) {
    const limit = Number(hardChars) > 0 ? Math.floor(Number(hardChars)) : 0;
    if (!limit) return chunks;
    const bounded = [];
    for (const rawChunk of chunks) {
      const chunk = String(rawChunk || '').trim();
      if (!chunk) continue;
      if (chunk.length <= limit) {
        bounded.push(chunk);
        continue;
      }
      const words = chunk.split(/\s+/);
      let current = [];
      let currentLength = 0;
      function flush() {
        if (current.length) bounded.push(current.join(' '));
        current = [];
        currentLength = 0;
      }
      for (const word of words) {
        if (word.length > limit) {
          flush();
          for (let i = 0; i < word.length; i += limit) bounded.push(word.slice(i, i + limit));
          continue;
        }
        const added = current.length ? 1 + word.length : word.length;
        if (current.length && currentLength + added > limit) flush();
        current.push(word);
        currentLength += currentLength ? 1 + word.length : word.length;
      }
      flush();
    }
    return bounded;
  }

  function splitIntoChunks(text, targetWords, hardWords, hardChars) {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = [];
    let count = 0;

    function flush() {
      if (current.length) chunks.push(current.join(' ').replace(/\s+/g, ' ').trim());
      current = [];
      count = 0;
    }

    for (const rawSentence of sentences) {
      const sentence = rawSentence.trim();
      if (!sentence) continue;
      const words = sentence.split(/\s+/);
      if (words.length > hardWords) {
        flush();
        for (let i = 0; i < words.length; i += hardWords) {
          chunks.push(words.slice(i, i + hardWords).join(' '));
        }
        continue;
      }
      if (count > 0 && count + words.length > targetWords) flush();
      current.push(sentence);
      count += words.length;
      if (count >= hardWords) flush();
    }
    flush();
    return splitByHardChars(chunks, hardChars);
  }

  function canUseSpeechSynthesis(env) {
    return Boolean(env && env.speechSynthesis && env.SpeechSynthesisUtterance);
  }

  function createBrowserFallback(env) {
    const BROWSER_FALLBACK_TIMEOUT_MS=12000;
    return {
      async speak(text, options) {
        if (!canUseSpeechSynthesis(env)) throw new Error('Browser TTS unavailable');
        return new Promise((resolve, reject) => {
          let done = false;
          let started = false;
          const settle = (fn, value) => { if (done) return; done = true; fn(value); };
          const u = new env.SpeechSynthesisUtterance(text);
          u.lang = options && options.lang ? options.lang : 'en-US';
          u.rate = options && typeof options.rate === 'number' ? options.rate : 1;
          u.onstart = () => { started = true; };
          u.onend = () => settle(resolve, { provider: 'browser-speech-synthesis', started: true });
          u.onerror = (event) => settle(reject, new Error('browser_tts_' + String(event && event.error ? event.error : 'error')));
          setTimeout(() => settle(reject, new Error(started ? 'browser_tts_timeout' : 'browser_tts_not_started')), BROWSER_FALLBACK_TIMEOUT_MS);
          setTimeout(() => { if (done) return; try { env.speechSynthesis.speak(u); } catch (error) { settle(reject, error); } }, 60);
        });
      },
      stop() {
        if (canUseSpeechSynthesis(env)) env.speechSynthesis.cancel();
      }
    };
  }

  function createVoiceService(options) {
    options = options || {};
    const config = options.config || {};
    const adapter = options.adapter || null;
    const env = options.env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const playAudio = options.playAudio;
    const fallback = createBrowserFallback(env);
    const maxChars = config.limits && config.limits.maxInputChars || 3600;
    const targetWords = config.limits && config.limits.targetChunkWords || 140;
    const hardWords = config.limits && config.limits.hardChunkWords || 190;
    const appleStandalone = env && env.navigator && env.navigator.standalone === true;
    const appleHardChunkChars = appleStandalone ? Math.max(64, Math.min(128, Number(options.appleHardChunkChars) || 80)) : 0;
    const generationTimeoutMs = Number(options.generationTimeoutMs) > 0 ? Number(options.generationTimeoutMs) : 0;
    const eventLoopWatchdogMs = Number(options.eventLoopWatchdogMs) > 0 ? Number(options.eventLoopWatchdogMs) : 250;
    let generation = 0;
    let requestSequence = 0;
    let activeStop = null;
    let activeInference = null;
    let activeInferenceMeta = null;
    function diag(entry) {
      try {
        const key = 'fiezel-neural-voice-diagnostics-v1';
        const list = JSON.parse(env.localStorage && env.localStorage.getItem(key) || '[]');
        list.push({ t: Date.now(), v: String(env.FIEZEL_VERSION || '5.19.0'), ...entry });
        env.localStorage && env.localStorage.setItem(key, JSON.stringify(list.slice(-200)));
      } catch (_) {}
    }
    diag({ phase: 'single_flight_ready', patch: 'm026-single-flight-v1' });
    diag({ phase: 'chunk_policy_ready', policy: appleStandalone ? 'apple-standalone-inference-slice-v2' : 'default', hardChunkChars: appleHardChunkChars || null });

    function stop() {
      generation += 1;
      if (typeof activeStop === 'function') {
        try { activeStop(); } catch (_) {}
      }
      activeStop = null;
      fallback.stop();
    }

    async function speak(input, speakOptions) {
      speakOptions = speakOptions || {};
      const text = normalizeText(input, maxChars);
      const callGeneration = ++generation;
      const requestId = 'nv-' + Date.now().toString(36) + '-' + (++requestSequence).toString(36);
      const voice = speakOptions.voice || (config.voices && config.voices.fiezelPrimary) || 'af_heart';
      const chunks = splitIntoChunks(text, targetWords, hardWords, appleHardChunkChars);
      diag({ phase: 'chunk_plan', requestId, chunkCount: chunks.length, hardChunkChars: appleHardChunkChars || null, maxChunkChars: chunks.reduce((max, chunk) => Math.max(max, chunk.length), 0) });

      if (!adapter) {
        if (config.fallback && config.fallback.browserSpeechSynthesis) {
          const fallbackResult = await fallback.speak(text, { lang: speakOptions.lang || 'en-US', rate: speakOptions.speed || 1 });
          return { ...fallbackResult, provider: 'browser-speech-synthesis', voice, chunks: 1, outputs: [] };
        }
        throw new Error('Neural voice adapter unavailable');
      }

      async function generateChunk(chunkIndex) {
        const chunk = chunks[chunkIndex];
        if (callGeneration !== generation) throw new Error('TTS request superseded');
        const generateStartedAt = Date.now();
        if (activeInference) {
          diag({
            phase: 'generate_busy', requestId, chunkIndex, voice,
            activeRequestId: activeInferenceMeta && activeInferenceMeta.requestId || '',
            activeChunkIndex: activeInferenceMeta && activeInferenceMeta.chunkIndex,
            activeElapsedMs: activeInferenceMeta && activeInferenceMeta.startedAt ? Date.now() - activeInferenceMeta.startedAt : null
          });
          const error = new Error('neural_generation_busy');
          error.code = 'neural_generation_busy';
          throw error;
        }
        diag({ phase: 'generate_start', requestId, chunkIndex, voice, chars: chunk.length, timeoutMs: generationTimeoutMs || null });
        const watchdogScheduledAt = Date.now();
        setTimeout(() => {
          const callbackAt = Date.now();
          diag({
            phase: 'generate_event_loop_watchdog', requestId, chunkIndex,
            scheduledAt: watchdogScheduledAt,
            expectedDelayMs: eventLoopWatchdogMs,
            observedDelayMs: callbackAt - watchdogScheduledAt
          });
        }, eventLoopWatchdogMs);
        let timer = null;
        let didTimeOut = false;
        let audio;
        const generated = Promise.resolve().then(() => adapter.generate(chunk, { voice, speed: speakOptions.speed || 1 }));
        activeInference = generated;
        activeInferenceMeta = { requestId, chunkIndex, voice, startedAt: generateStartedAt };
        generated.then(
          value => {
            const samples = value && (value.audio || value.data);
            if (didTimeOut) {
              diag({ phase: 'generate_late_ready', requestId, chunkIndex, voice, elapsedMs: Date.now() - generateStartedAt, samples: samples && typeof samples.length === 'number' ? samples.length : null });
            }
            if (activeInference === generated) {
              activeInference = null;
              activeInferenceMeta = null;
            }
          },
          error => {
            if (didTimeOut) {
              diag({ phase: 'generate_late_error', requestId, chunkIndex, voice, elapsedMs: Date.now() - generateStartedAt, error: String(error && (error.message || error.name) || error) });
            }
            if (activeInference === generated) {
              activeInference = null;
              activeInferenceMeta = null;
            }
          }
        );
        if (generationTimeoutMs > 0) {
          const timedOut = Symbol('neural-generation-timeout');
          const result = await Promise.race([
            generated,
            new Promise(resolve => { timer = setTimeout(() => resolve(timedOut), generationTimeoutMs); })
          ]).finally(() => { if (timer) clearTimeout(timer); });
          if (result === timedOut) {
            didTimeOut = true;
            diag({ phase: 'generate_timeout', requestId, chunkIndex, voice, elapsedMs: Date.now() - generateStartedAt, timeoutMs: generationTimeoutMs });
            const error = new Error('neural_generation_timeout');
            error.code = 'neural_generation_timeout';
            throw error;
          }
          audio = result;
        } else {
          audio = await generated;
        }
        const samples = audio && (audio.audio || audio.data);
        const generateElapsedMs = Date.now() - generateStartedAt;
        if (generationTimeoutMs > 0 && generateElapsedMs > generationTimeoutMs) {
          diag({ phase: 'generate_completed_over_budget', requestId, chunkIndex, elapsedMs: generateElapsedMs, timeoutMs: generationTimeoutMs });
        }
        diag({ phase: 'generate_ready', requestId, chunkIndex, voice, elapsedMs: generateElapsedMs, samples: samples && typeof samples.length === 'number' ? samples.length : null });
        if (callGeneration !== generation) throw new Error('TTS request superseded');
        return audio;
      }

      const outputs = [];
      let prefetched = null;
      try {
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
          let audio;
          if (prefetched) {
            const outcome = await prefetched;
            prefetched = null;
            if (!outcome.ok) throw outcome.error;
            audio = outcome.value;
          } else {
            audio = await generateChunk(chunkIndex);
          }
          if (callGeneration !== generation) throw new Error('TTS request superseded');
          outputs.push(audio);
          if (typeof playAudio === 'function') {
            const playbackStartedAt = Date.now();
            diag({ phase: 'playback_start', requestId, chunkIndex, voice });
            const playback = await playAudio(audio, { signalGeneration: callGeneration });
            activeStop = playback && typeof playback.stop === 'function' ? playback.stop : null;
            if (chunkIndex + 1 < chunks.length) {
              prefetched = generateChunk(chunkIndex + 1).then(
                value => ({ ok: true, value }),
                error => ({ ok: false, error })
              );
            }
            if (playback && playback.done && typeof playback.done.then === 'function') await playback.done;
            diag({ phase: 'playback_done', requestId, chunkIndex, voice, elapsedMs: Date.now() - playbackStartedAt });
            activeStop = null;
            if (callGeneration !== generation) throw new Error('TTS request superseded');
          }
        }
        return { provider: adapter.kind || 'neural-local', voice, chunks: chunks.length, outputs, requestId };
      } catch (error) {
        diag({ phase: 'voice_service_error', requestId, voice, error: String(error && (error.message || error.name) || error) });
        if (callGeneration !== generation) throw error;
        if (speakOptions.allowFallback !== false && config.fallback && config.fallback.browserSpeechSynthesis) {
          const fallbackResult = await fallback.speak(text, { lang: speakOptions.lang || 'en-US', rate: speakOptions.speed || 1 });
          return { ...fallbackResult, provider: 'browser-speech-synthesis', voice, chunks: chunks.length, outputs, requestId };
        }
        throw error;
      }
    }

    return Object.freeze({ speak, stop, splitIntoChunks: (text) => splitIntoChunks(text, targetWords, hardWords, appleHardChunkChars) });
  }

  return Object.freeze({ normalizeText, splitIntoChunks, createVoiceService });
});