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
    let source = null;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Satu AudioContext per env, bukan per pemanggilan createPlayer().
    // warmWebAudio() di audibility-fix memanggil createPlayer(root) BARU pada
    // setiap speak() dan browserSpeakImmediate(); warmAudioGesture() dan
    // initialize() di bootstrap juga. Sebelum ini tiap player memegang context
    // lokalnya sendiri, jadi satu sesi bicara bisa membuat beberapa AudioContext.
    // WebKit membatasi jumlah AudioContext hidup per halaman -- begitu batas
    // tercapai konstruktornya melempar dan seluruh jalur audio mati, termasuk
    // fallback browser. Menyimpannya di env membuat semua pemanggil berbagi satu.
    function ensureContext() {
      if (!AudioContextCtor) return null;
      if (!env.__fiezelWebAudioContext) env.__fiezelWebAudioContext = new AudioContextCtor();
      return env.__fiezelWebAudioContext;
    }

    async function resumeContext() {
      const current = ensureContext();
      if (current && current.state === 'suspended' && typeof current.resume === 'function') {
        try { await Promise.race([current.resume(), delay(2500)]); } catch (_) {}
      }
      return current;
    }

    async function play(rawAudio) {
      if (!AudioContextCtor) throw new Error('Web Audio API unavailable');
      const samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      const sampleRate = pickSampleRate(rawAudio);
      const current = await resumeContext();
      if (!current) throw new Error('Web Audio API unavailable');
      if (source) { try { source.stop(); } catch (_) {} }

      const buffer = current.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const localSource = current.createBufferSource();
      source = localSource;
      localSource.buffer = buffer;
      localSource.connect(current.destination);
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const finish = () => { if (source === localSource) source = null; resolveDone(); };
      localSource.onended = finish;
      try { localSource.start(); }
      catch (error) { if (source === localSource) source = null; throw error; }
      setTimeout(finish, Math.max(1000, Math.round((samples.length / sampleRate) * 1000) + 2500));
      return {
        done,
        stop() { try { localSource.stop(); } catch (_) {} }
      };
    }

    function stop() { if (source) { try { source.stop(); } catch (_) {} source = null; } }
    // T-023 lifecycle: release the shared AudioContext so a hidden/backgrounded
    // tab does not keep the neural-voice audio graph alive (WebKit caps live
    // contexts; close() allows re-init on next speak()).
    function close() {
      stop();
      const current = env.__fiezelWebAudioContext;
      if (current) {
        try { if (typeof current.close === 'function') current.close(); } catch (_) {}
        env.__fiezelWebAudioContext = null;
      }
    }
    function warm() {
      if (!AudioContextCtor) return false;
      try {
        const current = ensureContext();
        if (current && current.state === 'suspended' && typeof current.resume === 'function') { try { current.resume().catch(() => {}); } catch (_) {} }
        return true;
      } catch (_) { return false; }
    }
    return Object.freeze({ play, stop, warm, close });
  }

  return Object.freeze({ createPlayer, pickSamples, pickSampleRate });
});
