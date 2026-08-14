(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelWebAudioPlayer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function pickSamples(rawAudio) {
    if (!rawAudio) return null;
    if (rawAudio.audio instanceof Float32Array) return rawAudio.audio;
    if (rawAudio.data instanceof Float32Array) return rawAudio.data;
    if (rawAudio.audio && ArrayBuffer.isView(rawAudio.audio)) return Float32Array.from(rawAudio.audio);
    if (rawAudio.data && ArrayBuffer.isView(rawAudio.data)) return Float32Array.from(rawAudio.data);
    return null;
  }

  function pickSampleRate(rawAudio) {
    const n = Number(rawAudio && (rawAudio.sampling_rate || rawAudio.sample_rate || rawAudio.sampleRate));
    return Number.isFinite(n) && n >= 8000 && n <= 192000 ? n : 24000;
  }

  function createPlayer(env) {
    env = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const AudioContextCtor = env.AudioContext || env.webkitAudioContext;
    let context = null;
    let source = null;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function play(rawAudio) {
      if (!AudioContextCtor) throw new Error('Web Audio API unavailable');
      const samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      const sampleRate = pickSampleRate(rawAudio);
      if (!context) context = new AudioContextCtor();
      if (context.state === 'suspended' && typeof context.resume === 'function') {
        try { await Promise.race([context.resume(), delay(2000)]); } catch (_) {}
      }
      if (source) { try { source.stop(); } catch (_) {} }

      const buffer = context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const localSource = context.createBufferSource();
      source = localSource;
      localSource.buffer = buffer;
      localSource.connect(context.destination);
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const finish = () => { if (source === localSource) source = null; resolveDone(); };
      localSource.onended = finish;
      setTimeout(finish, Math.max(1000, Math.round((samples.length / sampleRate) * 1000) + 2500));
      try { localSource.start(); } catch (_) {}
      return {
        done,
        stop() { try { localSource.stop(); } catch (_) {} }
      };
    }

    function stop() { if (source) { try { source.stop(); } catch (_) {} source = null; } }
    function warm() {
      if (!AudioContextCtor) return false;
      try {
        if (!context) context = new AudioContextCtor();
        if (context.state === 'suspended' && typeof context.resume === 'function') { try { context.resume().catch(() => {}); } catch (_) {} }
        return true;
      } catch (_) { return false; }
    }
    return Object.freeze({ play, stop, warm });
  }

  return Object.freeze({ createPlayer, pickSamples, pickSampleRate });
});
