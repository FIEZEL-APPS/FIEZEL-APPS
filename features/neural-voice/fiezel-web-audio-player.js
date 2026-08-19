(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelWebAudioPlayer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FADE_OUT_S = 0.018;
  const FADE_IN_S = 0.006;
  const NATURAL_END_FADE_S = 0.008;
  const FADE_OUT_MS = Math.ceil(FADE_OUT_S * 1000) + 8;
  const PREFERRED_SAMPLE_RATE = 44100;
  const LATENCY_HINT = 'playback';
  const PCM_DIAGNOSTIC_PARAM = 'fiezelPcmMode';
  const PCM_DIAGNOSTIC_MODES = Object.freeze(['raw', 'conditioned']);
  const PCM_WORKLET_MODULE_URL = './features/neural-voice/fiezel-pcm-renderer-worklet.js';

  const PEAK_CEILING = 0.97;
  const DC_LIMIT = 0.003;
  const DC_BLOCKS = 8;
  const IMPULSE_MIN_JUMP = 0.25;
  const IMPULSE_RATIO = 6;
  const IMPULSE_WINDOW = 20;
  const SILENCE_FLOOR = 0.0025;
  const TRIM_KEEP_S = 0.012;

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

  function pcmDiagnosticMode(env, settings) {
    const explicit = settings && String(settings.pcmDiagnosticMode || '').toLowerCase();
    if (PCM_DIAGNOSTIC_MODES.includes(explicit)) return explicit;
    try {
      const search = env && env.location && typeof env.location.search === 'string' ? env.location.search : '';
      if (!search) return '';
      const Params = env.URLSearchParams || (typeof URLSearchParams !== 'undefined' ? URLSearchParams : null);
      if (!Params) return '';
      const value = String(new Params(search).get(PCM_DIAGNOSTIC_PARAM) || '').toLowerCase();
      return PCM_DIAGNOSTIC_MODES.includes(value) ? value : '';
    } catch (_) { return ''; }
  }

  function analyzeSamples(samples) {
    if (!samples || !samples.length) {
      return Object.freeze({ samples: 0, finite: 0, nonFinite: 0, clipped: 0, peak: 0, rms: 0, mean: 0, impulses: 0 });
    }
    let finite = 0;
    let nonFinite = 0;
    let clipped = 0;
    let peak = 0;
    let sum = 0;
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const value = Number(samples[i]);
      if (!Number.isFinite(value)) { nonFinite += 1; continue; }
      finite += 1;
      sum += value;
      sumSquares += value * value;
      const magnitude = Math.abs(value);
      if (magnitude > peak) peak = magnitude;
      if (magnitude > 1) clipped += 1;
    }
    const mean = finite ? sum / finite : 0;
    const rms = finite ? Math.sqrt(sumSquares / finite) : 0;
    return Object.freeze({
      samples: samples.length,
      finite,
      nonFinite,
      clipped,
      peak,
      rms,
      mean,
      impulses: nonFinite ? null : findImpulses(samples).length
    });
  }

  function guardClipping(samples) {
    let peak = 0;
    let hasNonFinite = false;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Number(samples[i]);
      if (!Number.isFinite(sample)) { hasNonFinite = true; continue; }
      peak = Math.max(peak, Math.abs(sample));
    }
    if (!hasNonFinite && !(peak > 1)) return samples;
    const scale = peak > 1 ? 0.98 / peak : 1;
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Number(samples[i]);
      out[i] = Number.isFinite(sample) ? sample * scale : 0;
    }
    return out;
  }

  function conditionSamples(samples) {
    if (!samples || !samples.length) return samples;
    const length = samples.length;
    let sum = 0;
    let peak = 0;
    let hasNonFinite = false;
    for (let i = 0; i < length; i += 1) {
      const value = Number(samples[i]);
      if (!Number.isFinite(value)) { hasNonFinite = true; continue; }
      sum += value;
      peak = Math.max(peak, Math.abs(value));
    }
    const offset = hasNonFinite ? 0 : sum / length;
    const impulses = hasNonFinite ? [] : findImpulses(samples);
    const needsOffset = !hasNonFinite && Math.abs(offset) > DC_LIMIT && isSustainedOffset(samples, offset);
    const needsHeadroom = peak > PEAK_CEILING;
    if (!hasNonFinite && !needsOffset && !needsHeadroom && !impulses.length) return samples;

    const out = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const value = Number(samples[i]);
      out[i] = Number.isFinite(value) ? value - (needsOffset ? offset : 0) : 0;
    }
    impulses.forEach((index) => { out[index] = (out[index - 1] + out[index + 1]) / 2; });
    let repairedPeak = 0;
    for (let i = 0; i < length; i += 1) repairedPeak = Math.max(repairedPeak, Math.abs(out[i]));
    if (repairedPeak > PEAK_CEILING) {
      const scale = PEAK_CEILING / repairedPeak;
      for (let i = 0; i < length; i += 1) out[i] *= scale;
    }
    return out;
  }

  function isSustainedOffset(samples, offset) {
    const size = Math.floor(samples.length / DC_BLOCKS);
    if (size < 8) return false;
    const sign = offset < 0 ? -1 : 1;
    for (let block = 0; block < DC_BLOCKS; block += 1) {
      let sum = 0;
      const start = block * size;
      for (let i = start; i < start + size; i += 1) sum += samples[i];
      const mean = sum / size;
      if (mean * sign <= DC_LIMIT) return false;
    }
    return true;
  }

  function deviation(samples, i) {
    return Math.abs(samples[i] - (samples[i - 1] + samples[i + 1]) / 2);
  }

  function findImpulses(samples) {
    const found = [];
    const last = samples.length - 2;
    for (let i = 1; i <= last; i += 1) {
      const magnitude = deviation(samples, i);
      if (magnitude < IMPULSE_MIN_JUMP) continue;
      if (i > 1 && deviation(samples, i - 1) > magnitude) continue;
      if (i < last && deviation(samples, i + 1) > magnitude) continue;
      const from = Math.max(1, i - IMPULSE_WINDOW);
      const to = Math.min(last, i + IMPULSE_WINDOW);
      let sum = 0;
      let count = 0;
      for (let k = from; k <= to; k += 1) {
        if (k >= i - 1 && k <= i + 1) continue;
        sum += deviation(samples, k);
        count += 1;
      }
      if (count && magnitude > IMPULSE_RATIO * (sum / count)) found.push(i);
    }
    return found;
  }

  function trimSilence(samples, sampleRate) {
    if (!samples || !samples.length) return samples;
    const rate = Number(sampleRate) > 0 ? Number(sampleRate) : PREFERRED_SAMPLE_RATE;
    const keep = Math.max(1, Math.round(rate * TRIM_KEEP_S));
    let start = 0;
    let end = samples.length - 1;
    while (start < end && Math.abs(samples[start]) < SILENCE_FLOOR) start += 1;
    while (end > start && Math.abs(samples[end]) < SILENCE_FLOOR) end -= 1;
    start = Math.max(0, start - keep);
    end = Math.min(samples.length - 1, end + keep);
    if (start === 0 && end === samples.length - 1) return samples;
    if (end <= start) return samples;
    return samples.subarray(start, end + 1);
  }

  function createPlayer(env, playerOptions) {
    env = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const settings = playerOptions || {};
    const preferredRate = Number(settings.sampleRate) > 0 ? Number(settings.sampleRate) : PREFERRED_SAMPLE_RATE;
    const AudioContextCtor = env.AudioContext || env.webkitAudioContext;
    const diagnosticMode = pcmDiagnosticMode(env, settings);
    const appleStandalone = Boolean(env && env.navigator && env.navigator.standalone === true);
    const WorkletNodeCtor = env.AudioWorkletNode || (typeof AudioWorkletNode !== 'undefined' ? AudioWorkletNode : null);
    let source = null;
    let sourceGain = null;
    let queued = [];
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function playbackEpoch() {
      return Math.max(0, Math.floor(Number(env.__fiezelPcmPlaybackEpoch) || 0));
    }

    function reservePlaybackEpoch(continuous) {
      let epoch = playbackEpoch();
      if (!continuous || !epoch) epoch += 1;
      env.__fiezelPcmPlaybackEpoch = epoch;
      return epoch;
    }

    function advancePlaybackEpoch() {
      const epoch = playbackEpoch() + 1;
      env.__fiezelPcmPlaybackEpoch = epoch;
      return epoch;
    }

    function sink() {
      const module = env.FiezelVoiceDiagnostics;
      return module && typeof module.begin === 'function' ? module : null;
    }

    function recordDiagnostic(entry) {
      const trace = env.FiezelVoiceDiagnostics;
      if (!trace || typeof trace.record !== 'function') return false;
      try {
        return trace.record(Object.assign({
          t: Date.now(),
          v: String(env.FIEZEL_VERSION || '5.19.0'),
          phase: 'pcm_ab_playback',
          diagnosticMode
        }, entry || {}), env);
      } catch (_) { return false; }
    }

    function constructContext() {
      try { return new AudioContextCtor({ latencyHint: LATENCY_HINT, sampleRate: preferredRate }); } catch (_) {}
      try { return new AudioContextCtor({ latencyHint: LATENCY_HINT }); } catch (_) {}
      return new AudioContextCtor();
    }

    function ensureContext() {
      if (!AudioContextCtor) return null;
      if (!env.__fiezelWebAudioContext) env.__fiezelWebAudioContext = constructContext();
      return env.__fiezelWebAudioContext;
    }

    async function resumeContext() {
      const current = ensureContext();
      if (current && current.state === 'suspended' && typeof current.resume === 'function') {
        try { await Promise.race([current.resume(), delay(2500)]); } catch (_) {}
      }
      return current;
    }

    function contextTime(ctx) {
      return ctx && typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
    }

    function makeGain(ctx) {
      if (!ctx || typeof ctx.createGain !== 'function') return null;
      try { return ctx.createGain(); } catch (_) { return null; }
    }

    function rampGain(node, ctx, from, to, seconds, at) {
      if (!node || !node.gain) return false;
      const param = node.gain;
      const now = typeof at === 'number' ? at : contextTime(ctx);
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

    function scheduleNaturalEndFade(node, ctx, durationSeconds, startAt) {
      if (!node || !node.gain || !(durationSeconds > FADE_IN_S + NATURAL_END_FADE_S)) return false;
      const param = node.gain;
      const begin = typeof startAt === 'number' ? startAt : contextTime(ctx);
      const endAt = begin + durationSeconds;
      const fadeAt = endAt - NATURAL_END_FADE_S;
      try {
        if (typeof param.setValueAtTime === 'function' && typeof param.linearRampToValueAtTime === 'function') {
          param.setValueAtTime(1, fadeAt);
          param.linearRampToValueAtTime(0, endAt);
          return true;
        }
      } catch (_) {}
      return false;
    }

    function fadeAndStop(node, gain, ctx) {
      if (!node) return;
      const value = gain && gain.gain && typeof gain.gain.value === 'number' ? gain.gain.value : 1;
      const ramped = rampGain(gain, ctx, value, 0, FADE_OUT_S);
      if (!ramped) { try { node.stop(); } catch (_) {} return; }
      setTimeout(() => { try { node.stop(); } catch (_) {} }, FADE_OUT_MS);
    }

    function finishLegacyEntry(entry) {
      if (!entry || entry.settled) return;
      entry.settled = true;
      queued = queued.filter((item) => item !== entry);
      if (source === entry.node) { source = null; sourceGain = null; }
      entry.release();
      entry.resolve();
    }

    function failWorkletRuntime(runtime, reason) {
      if (!runtime || runtime.failed) return;
      runtime.failed = true;
      const pending = Array.from(runtime.pending.values());
      runtime.pending.clear();
      pending.forEach((entry) => {
        try { entry.finish(true); } catch (_) {}
      });
      try { if (runtime.node && typeof runtime.node.disconnect === 'function') runtime.node.disconnect(); } catch (_) {}
      if (env.__fiezelPcmWorkletRuntime === runtime) env.__fiezelPcmWorkletRuntime = null;
      env.__fiezelPcmWorkletFailedContext = runtime.context;
      if (diagnosticMode) recordDiagnostic({ playbackPath: 'legacy', workletFallback: String(reason || 'processor_error') });
    }

    async function preparePcmWorklet(ctx) {
      if (!appleStandalone || !ctx || !ctx.audioWorklet || typeof ctx.audioWorklet.addModule !== 'function' || !WorkletNodeCtor) return null;
      if (env.__fiezelPcmWorkletFailedContext === ctx) return null;
      const existing = env.__fiezelPcmWorkletRuntime;
      if (existing && existing.context === ctx && existing.node && !existing.failed) return existing;
      const preparing = env.__fiezelPcmWorkletPreparing;
      if (preparing && preparing.context === ctx && preparing.promise) return preparing.promise;

      let promise;
      promise = (async () => {
        await ctx.audioWorklet.addModule(PCM_WORKLET_MODULE_URL);
        const node = new WorkletNodeCtor(ctx, 'fiezel-pcm-renderer', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1
        });
        const runtime = { context: ctx, node, pending: new Map(), failed: false };
        node.port.onmessage = (event) => {
          const message = event && event.data || {};
          const id = String(message.id || '');
          const entry = runtime.pending.get(id);
          if (!entry) return;
          if (message.type === 'done') entry.finish(message.cancelled === true);
          else if (message.type === 'error') entry.finish(true);
        };
        try { node.onprocessorerror = () => failWorkletRuntime(runtime, 'processor_error'); } catch (_) {}
        node.connect(ctx.destination);
        env.__fiezelPcmWorkletRuntime = runtime;
        return runtime;
      })().catch(() => {
        env.__fiezelPcmWorkletFailedContext = ctx;
        return null;
      }).finally(() => {
        const active = env.__fiezelPcmWorkletPreparing;
        if (active && active.promise === promise) env.__fiezelPcmWorkletPreparing = null;
      });
      env.__fiezelPcmWorkletPreparing = { context: ctx, promise };
      return promise;
    }

    function stopAll(ctx, epoch) {
      const pending = queued.slice();
      const workletRuntimes = new Set();
      queued = [];
      pending.forEach((entry) => {
        if (entry.settled) return;
        if (entry.kind === 'worklet') {
          workletRuntimes.add(entry.runtime);
          entry.finish(true);
          return;
        }
        entry.settled = true;
        fadeAndStop(entry.node, entry.gain, ctx);
        entry.release();
        entry.resolve();
      });
      workletRuntimes.forEach((runtime) => {
        try {
          runtime.node.port.postMessage({
            type: 'clear',
            epoch: Math.max(playbackEpoch(), Math.floor(Number(epoch) || 0)),
            fadeOutFrames: Math.max(1, Math.round(FADE_OUT_S * Number(ctx && ctx.sampleRate || PREFERRED_SAMPLE_RATE)))
          });
        } catch (_) {}
      });
      source = null;
      sourceGain = null;
    }

    function scheduledUntil(ctx) {
      let until = 0;
      queued.forEach((entry) => { if (!entry.settled && entry.endsAt > until) until = entry.endsAt; });
      return Math.max(until, contextTime(ctx));
    }

    function playViaWorklet(current, runtime, samples, sampleRate, startAt, gapSeconds, epoch) {
      const sequence = (Number(env.__fiezelPcmWorkletSequence) || 0) + 1;
      env.__fiezelPcmWorkletSequence = sequence;
      const id = 'm028-pcm-' + sequence.toString(36);
      const durationSeconds = samples.length / sampleRate;
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const trace = sink();
      let holding = false;
      let timer = null;
      const release = () => {
        if (!holding) return;
        holding = false;
        try { if (trace) trace.end(env); } catch (_) {}
      };
      const entry = {
        kind: 'worklet',
        id,
        epoch,
        runtime,
        node: runtime.node,
        gain: null,
        endsAt: startAt + durationSeconds,
        settled: false,
        release,
        resolve: () => resolveDone()
      };
      const finish = (cancelled) => {
        if (entry.settled) return;
        entry.settled = true;
        if (timer) clearTimeout(timer);
        queued = queued.filter((item) => item !== entry);
        runtime.pending.delete(id);
        release();
        resolveDone({ cancelled: cancelled === true });
      };
      entry.finish = finish;
      runtime.pending.set(id, entry);
      queued.push(entry);
      try { if (trace) { trace.begin(); holding = true; } } catch (_) {}

      const transferable = new Float32Array(samples);
      try {
        runtime.node.port.postMessage({
          type: 'enqueue',
          id,
          epoch,
          sampleRate,
          samples: transferable,
          gapFrames: Math.max(0, Math.round(gapSeconds * sampleRate)),
          fadeInFrames: Math.max(1, Math.round(FADE_IN_S * sampleRate)),
          fadeOutFrames: Math.max(1, Math.round(NATURAL_END_FADE_S * sampleRate))
        }, [transferable.buffer]);
      } catch (error) {
        finish(true);
        failWorkletRuntime(runtime, 'post_message_failed');
        throw error;
      }
      const waitMs = Math.max(1000, Math.round((startAt - contextTime(current) + durationSeconds) * 1000) + 2500);
      timer = setTimeout(() => finish(false), waitMs);
      return {
        done,
        startsAt: startAt,
        endsAt: entry.endsAt,
        diagnosticMode,
        stop() {
          if (entry.settled) return;
          const stopEpoch = advancePlaybackEpoch();
          try {
            runtime.node.port.postMessage({
              type: 'clear',
              epoch: stopEpoch,
              fadeOutFrames: Math.max(1, Math.round(FADE_OUT_S * sampleRate))
            });
          } catch (_) {}
          finish(true);
        }
      };
    }

    async function play(rawAudio, options) {
      const opts = options || {};
      if (!AudioContextCtor) throw new Error('Web Audio API unavailable');
      const continuous = opts.continuous === true;
      const epoch = reservePlaybackEpoch(continuous);
      let samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      const sampleRate = pickSampleRate(rawAudio);
      if (opts.trim) samples = trimSilence(samples, sampleRate);
      const rawStats = diagnosticMode ? analyzeSamples(samples) : null;
      if (diagnosticMode !== 'raw') samples = conditionSamples(samples);
      const renderedStats = diagnosticMode ? analyzeSamples(samples) : null;
      if (!samples.length) throw new Error('Unsupported Kokoro audio payload');
      const current = await resumeContext();
      if (!current) throw new Error('Web Audio API unavailable');

      const contextRate = Number(current.sampleRate) || null;
      if (diagnosticMode) {
        recordDiagnostic({
          sourceSampleRate: sampleRate,
          contextSampleRate: contextRate,
          resamplingExpected: contextRate > 0 && contextRate !== sampleRate,
          trimmed: opts.trim === true,
          raw: rawStats,
          rendered: renderedStats
        });
      }

      let pcmWorklet = null;
      if (appleStandalone && contextRate === sampleRate) {
        pcmWorklet = await preparePcmWorklet(current);
      } else if (appleStandalone && diagnosticMode) {
        recordDiagnostic({
          playbackPath: 'legacy',
          workletFallback: contextRate && contextRate !== sampleRate ? 'sample_rate_mismatch' : 'worklet_unavailable',
          sourceSampleRate: sampleRate,
          contextSampleRate: contextRate
        });
      }

      const now = contextTime(current);
      const gapSeconds = Math.max(0, Number(opts.gapMs) || 0) / 1000;
      const startAt = continuous ? scheduledUntil(current) + gapSeconds : now;
      if (!continuous) stopAll(current, epoch);

      if (pcmWorklet) {
        if (epoch < playbackEpoch()) {
          throw new Error('TTS playback superseded');
        }
        if (diagnosticMode) recordDiagnostic({ playbackPath: 'audio-worklet', sourceSampleRate: sampleRate, contextSampleRate: contextRate });
        return playViaWorklet(current, pcmWorklet, samples, sampleRate, startAt, continuous ? gapSeconds : 0, epoch);
      }

      if (epoch < playbackEpoch()) throw new Error('TTS playback superseded');
      const buffer = current.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const localSource = current.createBufferSource();
      const localGain = makeGain(current);
      const durationSeconds = samples.length / sampleRate;
      source = localSource;
      sourceGain = localGain;
      localSource.buffer = buffer;
      if (localGain) {
        localSource.connect(localGain);
        localGain.connect(current.destination);
        rampGain(localGain, current, 0, 1, FADE_IN_S, continuous ? startAt : undefined);
        scheduleNaturalEndFade(localGain, current, durationSeconds, continuous ? startAt : undefined);
      } else {
        localSource.connect(current.destination);
      }

      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const trace = sink();
      let holding = false;
      const release = () => {
        if (!holding) return;
        holding = false;
        try { if (trace) trace.end(env); } catch (_) {}
      };
      const entry = {
        kind: 'legacy',
        epoch,
        node: localSource,
        gain: localGain,
        endsAt: startAt + durationSeconds,
        settled: false,
        release,
        resolve: () => resolveDone()
      };
      const finish = () => finishLegacyEntry(entry);
      localSource.onended = finish;
      queued.push(entry);
      try { if (trace) { trace.begin(); holding = true; } } catch (_) {}
      try {
        if (continuous && startAt > now) localSource.start(startAt);
        else localSource.start();
      } catch (error) {
        finish();
        throw error;
      }
      const waitMs = Math.max(1000, Math.round((startAt - now + durationSeconds) * 1000) + 2500);
      setTimeout(finish, waitMs);
      return {
        done,
        startsAt: startAt,
        endsAt: entry.endsAt,
        diagnosticMode,
        stop() {
          if (entry.settled) return;
          advancePlaybackEpoch();
          entry.settled = true;
          queued = queued.filter((item) => item !== entry);
          if (source === localSource) { source = null; sourceGain = null; }
          fadeAndStop(localSource, localGain, current);
          release();
          resolveDone();
        }
      };
    }

    function stop() {
      const ctx = env.__fiezelWebAudioContext;
      const epoch = advancePlaybackEpoch();
      if (queued.length) { stopAll(ctx, epoch); return; }
      if (source) {
        fadeAndStop(source, sourceGain, ctx);
        source = null;
        sourceGain = null;
      }
      const runtime = env.__fiezelPcmWorkletRuntime;
      if (runtime && runtime.node && runtime.node.port) {
        try {
          runtime.node.port.postMessage({
            type: 'clear',
            epoch,
            fadeOutFrames: Math.max(1, Math.round(FADE_OUT_S * Number(ctx && ctx.sampleRate || PREFERRED_SAMPLE_RATE)))
          });
        } catch (_) {}
      }
    }

    function close() {
      stop();
      const current = env.__fiezelWebAudioContext;
      const runtime = env.__fiezelPcmWorkletRuntime;
      if (runtime && (!current || runtime.context === current)) {
        try { if (runtime.node && typeof runtime.node.disconnect === 'function') runtime.node.disconnect(); } catch (_) {}
        env.__fiezelPcmWorkletRuntime = null;
        env.__fiezelPcmWorkletPreparing = null;
        env.__fiezelPcmWorkletFailedContext = null;
      }
      if (current) {
        try { if (typeof current.close === 'function') current.close(); } catch (_) {}
        env.__fiezelWebAudioContext = null;
      }
    }

    function warm() {
      if (!AudioContextCtor) return false;
      try {
        const current = ensureContext();
        if (current && current.state === 'suspended' && typeof current.resume === 'function') {
          try { current.resume().catch(() => {}); } catch (_) {}
        }
        if (appleStandalone) {
          try { preparePcmWorklet(current).catch(() => {}); } catch (_) {}
        }
        return true;
      } catch (_) { return false; }
    }

    return Object.freeze({ play, stop, warm, close });
  }

  return Object.freeze({
    createPlayer,
    pickSamples,
    pickSampleRate,
    pcmDiagnosticMode,
    analyzeSamples,
    guardClipping,
    conditionSamples,
    trimSilence,
    PCM_DIAGNOSTIC_PARAM,
    PCM_DIAGNOSTIC_MODES,
    PREFERRED_SAMPLE_RATE,
    LATENCY_HINT,
    PEAK_CEILING,
    SILENCE_FLOOR
  });
});
