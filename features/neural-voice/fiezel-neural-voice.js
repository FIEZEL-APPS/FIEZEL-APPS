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

  function splitIntoChunks(text, targetWords, hardWords) {
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
    return chunks;
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
          const finish = () => { if (done) return; done = true; resolve({ provider: 'browser-speech-synthesis' }); };
          const u = new env.SpeechSynthesisUtterance(text);
          u.lang = options && options.lang ? options.lang : 'en-US';
          u.rate = options && typeof options.rate === 'number' ? options.rate : 1;
          u.onend = finish;
          u.onerror = () => finish();
          setTimeout(finish, BROWSER_FALLBACK_TIMEOUT_MS);
          setTimeout(() => { if (done) return; try { env.speechSynthesis.speak(u); } catch (error) { reject(error); } }, 60);
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
    let generation = 0;
    let activeStop = null;

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
      const voice = speakOptions.voice || (config.voices && config.voices.fiezelPrimary) || 'af_heart';
      const chunks = splitIntoChunks(text, targetWords, hardWords);

      if (!adapter) {
        if (config.fallback && config.fallback.browserSpeechSynthesis) {
          return fallback.speak(text, { lang: speakOptions.lang || 'en-US', rate: speakOptions.speed || 1 });
        }
        throw new Error('Neural voice adapter unavailable');
      }

      const outputs = [];
      try {
        for (const chunk of chunks) {
          if (callGeneration !== generation) throw new Error('TTS request superseded');
          const audio = await adapter.generate(chunk, { voice, speed: speakOptions.speed || 1 });
          if (callGeneration !== generation) throw new Error('TTS request superseded');
          outputs.push(audio);
          if (typeof playAudio === 'function') {
            const playback = await playAudio(audio, { signalGeneration: callGeneration });
            activeStop = playback && typeof playback.stop === 'function' ? playback.stop : null;
            if (playback && playback.done && typeof playback.done.then === 'function') await playback.done;
            activeStop = null;
            if (callGeneration !== generation) throw new Error('TTS request superseded');
          }
        }
        return { provider: adapter.kind || 'neural-local', voice, chunks: chunks.length, outputs };
      } catch (error) {
        if (callGeneration !== generation) throw error;
        if (speakOptions.allowFallback !== false && config.fallback && config.fallback.browserSpeechSynthesis) {
          return fallback.speak(text, { lang: speakOptions.lang || 'en-US', rate: speakOptions.speed || 1 });
        }
        throw error;
      }
    }

    return Object.freeze({ speak, stop, splitIntoChunks: (text) => splitIntoChunks(text, targetWords, hardWords) });
  }

  return Object.freeze({ normalizeText, splitIntoChunks, createVoiceService });
});
