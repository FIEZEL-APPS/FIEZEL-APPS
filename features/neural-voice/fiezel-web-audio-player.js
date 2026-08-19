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
  const NATURAL_END_FADE_S = 0.008;
  const FADE_OUT_MS = Math.ceil(FADE_OUT_S * 1000) + 8;

  // m025-48. The engine renders at 44.1 kHz (vendor/supertonic-3/tts.json: ae.sample_rate).
  // Asking the context for that rate means the common case plays the PCM the model
  // produced, sample for sample, with no rate conversion between the vocoder and the
  // speaker. When the device cannot open a context at that rate the constructor throws
  // and we fall back, so this is a preference, never a requirement.
  const PREFERRED_SAMPLE_RATE = 44100;
  // 'playback' asks for the largest render buffer the platform is willing to give.
  // Speech here is always pre-rendered - there is no live input to keep in sync with -
  // so the ~200ms of extra output latency buys the one thing that matters: a buffer deep
  // enough that a main-thread hiccup no longer starves the audio callback. A starved
  // callback is a dropout, and a dropout is the crackle in OWNER's report.
  const LATENCY_HINT = 'playback';

  // Conditioning thresholds. Each one is deliberately conservative: audio that is already
  // clean must come back untouched, so nothing here can dull a good render.
  const PEAK_CEILING = 0.97;         // WebAudio clips at 1.0; this keeps true-peak headroom
  const DC_LIMIT = 0.003;            // below this an offset is inaudible and not worth a copy
  const DC_BLOCKS = 8;               // a real offset holds across the whole line, a waveform does not
  const IMPULSE_MIN_JUMP = 0.25;     // a spike smaller than this is ordinary waveform
  const IMPULSE_RATIO = 6;           // how far above its own neighbourhood a sample must stand
  const IMPULSE_WINDOW = 20;         // samples either side that define "its own neighbourhood"
  const SILENCE_FLOOR = 0.0025;      // model-emitted lead-in/tail-out is below this
  const TRIM_KEEP_S = 0.012;         // leave a little air so a trim never clips a plosive

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

  // Samples above unity clip inside WebAudio, and clipping is heard as crackle. NaN or
  // Infinity is worse: a malformed worker sample can poison the AudioBuffer even though
  // a peak scan never sees it. Finite in-range audio is returned by identity; only a
  // damaged/out-of-range buffer is copied and conditioned.
  function guardClipping(samples) {
    let peak = 0;
    let hasNonFinite = false;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Number(samples[i]);
      if (!Number.isFinite(sample)) { hasNonFinite = true; continue; }
      const v = sample < 0 ? -sample : sample;
      if (v > peak) peak = v;
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

  /**
   * m025-48 conditioning, the three defects an int8 vocoder actually ships.
   *
   * guardClipping above only ever reacted to a peak strictly above 1.0. That covers a
   * blown buffer and nothing else, and the crackle OWNER can still hear is not a blown
   * buffer - it is smaller and structural:
   *
   *   1. DC offset. A quantised decoder tail rarely sits on zero. A constant offset costs
   *      headroom, and every start and stop of an offset waveform is a step, which is the
   *      click the fades were added to hide rather than remove.
   *   2. Isolated impulses. int8 weights occasionally produce a single sample that is
   *      nowhere near its neighbours. One sample is a full-band transient - the textbook
   *      definition of a click - and it survives every fade because it is nowhere near
   *      an edge. It is detected here by the only property that separates it from real
   *      speech: its two neighbours agree with each other and disagree with it.
   *   3. No headroom. A render peaking at 0.999 has no room for the reconstruction
   *      overshoot that any later resampling stage introduces, so it clips downstream of
   *      us where nothing can guard it.
   *
   * Audio with none of these is returned by identity, so a clean render is never copied,
   * never rescaled and never dulled.
   */
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
      const magnitude = value < 0 ? -value : value;
      if (magnitude > peak) peak = magnitude;
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
    // Repaired from the original neighbours, so two impulses close together cannot chain
    // into a smoothed run of real audio.
    impulses.forEach((index) => { out[index] = (out[index - 1] + out[index + 1]) / 2; });
    let repairedPeak = 0;
    for (let i = 0; i < length; i += 1) {
      const magnitude = out[i] < 0 ? -out[i] : out[i];
      if (magnitude > repairedPeak) repairedPeak = magnitude;
    }
    if (repairedPeak > PEAK_CEILING) {
      // A single linear scale, so the waveform is attenuated and never reshaped: a
      // dynamics processor here would change the voice, which is not what we are fixing.
      const scale = PEAK_CEILING / repairedPeak;
      for (let i = 0; i < length; i += 1) out[i] *= scale;
    }
    return out;
  }

  /**
   * Distinguishes an offset from an average.
   *
   * The mean of any short window of speech is non-zero simply because the window does not
   * contain a whole number of cycles - a 220 Hz tone measured over 2048 samples averages
   * to about 0.008 while sitting perfectly on zero. Subtracting that is not a repair, and
   * treating it as one would copy and shift every buffer that passes through here. A real
   * DC offset is the one that holds its sign and size across the whole line, so that is
   * what is tested.
   */
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

  /**
   * How far a sample sits from the straight line between its neighbours. Zero for a ramp,
   * proportional to the signal for a smooth waveform, enormous for a single bad sample.
   */
  function deviation(samples, i) {
    const value = samples[i] - (samples[i - 1] + samples[i + 1]) / 2;
    return value < 0 ? -value : value;
  }

  /**
   * Finds the samples that are artefacts rather than audio.
   *
   * "Far from its neighbours" alone is not enough to tell the two apart: at 6 kHz a
   * full-amplitude waveform turns around in seven samples, so the sample at its own peak
   * is legitimately far from the line between the two beside it. What separates a click is
   * that it stands far above ITS OWN neighbourhood - the surrounding samples are behaving
   * while it is not - and that it is the peak of that disturbance rather than one of the
   * two samples the disturbance drags with it.
   */
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
        // i and the two samples the spike drags with it say nothing about the neighbourhood.
        if (k >= i - 1 && k <= i + 1) continue;
        sum += deviation(samples, k);
        count += 1;
      }
      if (!count) continue;
      if (magnitude > IMPULSE_RATIO * (sum / count)) found.push(i);
    }
    return found;
  }

  /**
   * Drops the silence the model puts either side of a render.
   *
   * Only used when one utterance is played as a sequence of separately rendered
   * sentences. Each render carries its own lead-in and tail-out, so butting two of them
   * together produces a double pause: the model's tail, then the model's head, then
   * whatever gap the sentence actually calls for. Trimming both edges puts that timing
   * back under prosody's control, which is what makes the rhythm sound spoken rather
   * than assembled.
   */
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
    let source = null;
    let sourceGain = null;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Everything currently scheduled, in the order it will be heard. A queued line is
    // audio the learner has not heard yet, so stop() has to reach it too.
    let queued = [];

    function sink() {
      const module = env.FiezelVoiceDiagnostics;
      return module && typeof module.begin === 'function' ? module : null;
    }

    // Satu AudioContext per env, bukan per pemanggilan createPlayer().
    // warmWebAudio() di audibility-fix memanggil createPlayer(root) BARU pada
    // setiap speak() dan browserSpeakImmediate(); warmAudioGesture() dan
    // initialize() di bootstrap juga. Sebelum ini tiap player memegang context
    // lokalnya sendiri, jadi satu sesi bicara bisa membuat beberapa AudioContext.
    // WebKit membatasi jumlah AudioContext hidup per halaman -- begitu batas
    // tercapai konstruktornya melempar dan seluruh jalur audio mati, termasuk
    // fallback browser. Menyimpannya di env membuat semua pemanggil berbagi satu.
    function constructContext() {
      // Options first, bare constructor last: an engine that rejects either the rate or
      // the latency hint must still end up with a working context rather than no audio.
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

    // Ramps when the context supports scheduling, assigns when it does not, so a
    // stub context (tests, exotic WebViews) still plays instead of throwing.
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

    // Natural completion used to rely on the model ending exactly on zero. Most lines do,
    // but one non-zero tail sample is enough to click when AudioBufferSourceNode falls to
    // digital silence. Schedule a tiny end ramp as insurance; supersession cancels it and
    // installs the longer explicit-stop fade below.
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

    // Fade the node out, then stop it once the ramp has run. Stopping immediately is
    // what produced the click; stopping late enough for the ramp to finish is what
    // removes it. The stop is still guarded because a source may already have ended.
    function fadeAndStop(node, gain, ctx) {
      if (!node) return;
      const ramped = rampGain(gain, ctx, gain && gain.gain && typeof gain.gain.value === 'number' ? gain.gain.value : 1, 0, FADE_OUT_S);
      if (!ramped) { try { node.stop(); } catch (_) {} return; }
      setTimeout(() => { try { node.stop(); } catch (_) {} }, FADE_OUT_MS);
    }

    /** Fades out and forgets every line that is playing or waiting its turn. */
    function stopAll(ctx) {
      const pending = queued.slice();
      queued = [];
      pending.forEach((entry) => {
        if (entry.settled) return;
        entry.settled = true;
        fadeAndStop(entry.node, entry.gain, ctx);
        entry.release();
        entry.resolve();
      });
      source = null;
      sourceGain = null;
    }

    /** Context time at which everything already queued finishes. */
    function scheduledUntil(ctx) {
      let until = 0;
      queued.forEach((entry) => { if (!entry.settled && entry.endsAt > until) until = entry.endsAt; });
      return Math.max(until, contextTime(ctx));
    }

    /**
     * @param {object} rawAudio  PCM from the engine.
     * @param {object} [options]
     *   options.continuous  join this line onto whatever is still scheduled instead of
     *                       superseding it, so a multi-sentence utterance is one
     *                       uninterrupted stream rather than a series of restarts;
     *   options.gapMs       the silence to leave before it, which is how prosody sets
     *                       the length of a breath between sentences;
     *   options.trim        drop the model's own lead-in/tail-out first, so that gap is
     *                       the only pause the listener hears.
     */
    async function play(rawAudio, options) {
      const opts = options || {};
      if (!AudioContextCtor) throw new Error('Web Audio API unavailable');
      let samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      const sampleRate = pickSampleRate(rawAudio);
      if (opts.trim) samples = trimSilence(samples, sampleRate);
      samples = conditionSamples(samples);
      if (!samples.length) throw new Error('Unsupported Kokoro audio payload');
      const current = await resumeContext();
      if (!current) throw new Error('Web Audio API unavailable');

      const now = contextTime(current);
      const continuous = opts.continuous === true;
      const gapSeconds = Math.max(0, Number(opts.gapMs) || 0) / 1000;
      // A continuous line starts exactly where the previous one ends, so the seam is a
      // scheduled boundary rather than a round trip through onended -> generate -> start.
      // That round trip is what makes an assembled utterance stutter between sentences.
      const startAt = continuous ? scheduledUntil(current) + gapSeconds : now;
      if (!continuous) stopAll(current);

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
        node: localSource,
        gain: localGain,
        endsAt: startAt + durationSeconds,
        settled: false,
        release,
        resolve: () => resolveDone()
      };
      const finish = () => {
        if (entry.settled) return;
        entry.settled = true;
        queued = queued.filter((item) => item !== entry);
        if (source === localSource) { source = null; sourceGain = null; }
        release();
        resolveDone();
      };
      localSource.onended = finish;
      queued.push(entry);
      // The trace is held from here until this line is done: every diagnostic written
      // while a buffer is on the wire would otherwise be a synchronous storage write on
      // the thread that has to keep the audio callback fed.
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
        stop() {
          if (entry.settled) return;
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
      if (queued.length) { stopAll(ctx); return; }
      if (source) {
        fadeAndStop(source, sourceGain, ctx);
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

  return Object.freeze({
    createPlayer,
    pickSamples,
    pickSampleRate,
    guardClipping,
    conditionSamples,
    trimSilence,
    PREFERRED_SAMPLE_RATE,
    LATENCY_HINT,
    PEAK_CEILING,
    SILENCE_FLOOR
  });
});
