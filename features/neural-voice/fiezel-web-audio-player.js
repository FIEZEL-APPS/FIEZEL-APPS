(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelWebAudioPlayer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // m025-45: a bare source.stop() in the middle of a waveform is a step discontinuity,
  // and a step discontinuity is a click. Every superseded line used to end on one -
  // the device diagnostic shows a 5.6s chunk cut at 631ms and another at 2787ms, each
  // one an audible pop. An 18ms ramp removes the click without eating speech; 6ms on
  // the way in removes the matching onset click.
  const FADE_OUT_S = 0.018;
  const FADE_IN_S = 0.006;
  const FADE_OUT_MS = Math.ceil(FADE_OUT_S * 1000) + 8;

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

  // Samples above unity clip inside WebAudio, and clipping is heard as crackle. The
  // engine's output is normally inside range, so this only ever acts as a guard: it
  // scales the whole buffer, it never compresses or changes the shape.
  function guardClipping(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const v = samples[i] < 0 ? -samples[i] : samples[i];
      if (v > peak) peak = v;
    }
    if (!(peak > 1)) return samples;
    const scale = 0.98 / peak;
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) out[i] = samples[i] * scale;
    return out;
  }

  function createPlayer(env) {
    env = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const AudioContextCtor = env.AudioContext || env.webkitAudioContext;
    let source = null;
    let sourceGain = null;
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

    function makeGain(ctx) {
      if (!ctx || typeof ctx.createGain !== 'function') return null;
      try { return ctx.createGain(); } catch (_) { return null; }
    }

    // Ramps when the context supports scheduling, assigns when it does not, so a
    // stub context (tests, exotic WebViews) still plays instead of throwing.
    function rampGain(node, ctx, from, to, seconds) {
      if (!node || !node.gain) return false;
      const param = node.gain;
      const now = ctx && typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
      try {
        if (typeof param.setValueAtTime === 'function' && typeof param.linearRampToValueAtTime === 'function') {
          if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
          param.setValueAtTime(from, now);
          param.linearRampToValueAtTime(to, now + seconds);
          return true;
        }
      } catch (_) {}
      try { param.value = to; } catch (_) {}
      return false;
    }

    // Fade the node out, then stop it once the ramp has run. Stopping immediately is
    // what produced the click; stopping late enough for the ramp to finish is what
    // removes it. The stop is still guarded because a source may already have ended.
    function fadeAndStop(node, gain, ctx) {
      if (!node) return;
      const ramped = rampGain(gain, ctx, gain && gain.gain && typeof gain.gain.value === 'number' ? gain.gain.value : 1, 0, FADE_OUT_S);
      if (!ramped) { try { node.stop(); } catch (_) {} return; }
      setTimeout(() => { try { node.stop(); } catch (_) {} }, FADE_OUT_MS);
    }

    async function play(rawAudio) {
      if (!AudioContextCtor) throw new Error('Web Audio API unavailable');
      let samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      samples = guardClipping(samples);
      const sampleRate = pickSampleRate(rawAudio);
      const current = await resumeContext();
      if (!current) throw new Error('Web Audio API unavailable');
      if (source) fadeAndStop(source, sourceGain, current);

      const buffer = current.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const localSource = current.createBufferSource();
      const localGain = makeGain(current);
      source = localSource;
      sourceGain = localGain;
      localSource.buffer = buffer;
      if (localGain) {
        localSource.connect(localGain);
        localGain.connect(current.destination);
        rampGain(localGain, current, 0, 1, FADE_IN_S);
      } else {
        localSource.connect(current.destination);
      }
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const finish = () => {
        if (source === localSource) { source = null; sourceGain = null; }
        resolveDone();
      };
      localSource.onended = finish;
      try { localSource.start(); }
      catch (error) { if (source === localSource) { source = null; sourceGain = null; } throw error; }
      setTimeout(finish, Math.max(1000, Math.round((samples.length / sampleRate) * 1000) + 2500));
      return {
        done,
        stop() { fadeAndStop(localSource, localGain, current); }
      };
    }

    function stop() {
      if (source) {
        fadeAndStop(source, sourceGain, env.__fiezelWebAudioContext);
        source = null;
        sourceGain = null;
      }
    }
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

  return Object.freeze({ createPlayer, pickSamples, pickSampleRate, guardClipping });
});
