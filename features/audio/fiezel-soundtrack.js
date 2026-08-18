/**
 * m025-43 real generative soundtrack.
 *
 * OWNER: "backsound-nya hanya beep beep doang, tidak ada musik yang benar benar
 * terputar." Correct - the old loop was three oscillators fired every 5.8 seconds with no
 * rhythm, no bass and no voicing. That is a chord ping, not music.
 *
 * This is an actual arrangement, generated in Web Audio because the app must stay offline
 * and ship no licensed audio files:
 *
 *   harmony    a four-bar lo-fi progression (Am7 - Fmaj7 - Cmaj7 - G6), voiced as a pad of
 *              detuned saw/triangle pairs through a slow filter sweep.
 *   bass       root note per bar, sine with a short attack, one octave below the pad.
 *   melody     an arpeggio plucked on eighth notes from the current chord, fed to a
 *              tempo-synced delay so it echoes instead of ending abruptly.
 *   percussion soft filtered-noise hats on eighths, a muted kick on beats 1 and 3.
 *   space      a generated impulse response drives a convolver, so everything shares one
 *              room instead of sounding like separate beeps.
 *
 * All scheduling is lookahead-based (schedule 0.6s of music every 0.25s). setInterval
 * alone cannot keep musical time; the audio clock has to place every note.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelSoundtrack = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-soundtrack-v1';
  var BPM = 72;
  var BEAT = 60 / BPM;
  var BAR = BEAT * 4;
  var LOOKAHEAD_MS = 250;
  var SCHEDULE_AHEAD_S = 0.6;

  // Frequencies in Hz. Voicings are kept close together so the pad never turns muddy.
  var PROGRESSION = [
    { name: 'Am7', bass: 110.00, pad: [220.00, 261.63, 329.63, 392.00], arp: [440.00, 523.25, 659.25, 523.25] },
    { name: 'Fmaj7', bass: 87.31, pad: [174.61, 261.63, 329.63, 415.30], arp: [349.23, 440.00, 523.25, 659.25] },
    { name: 'Cmaj7', bass: 130.81, pad: [196.00, 261.63, 329.63, 392.00], arp: [523.25, 659.25, 783.99, 659.25] },
    { name: 'G6', bass: 98.00, pad: [196.00, 246.94, 293.66, 392.00], arp: [392.00, 493.88, 587.33, 493.88] }
  ];

  /** Eighth-note pattern for one bar: 1 = hat, 2 = hat + kick. */
  var DRUM_PATTERN = [2, 1, 1, 1, 2, 1, 1, 1];

  function chordAt(barIndex) { return PROGRESSION[barIndex % PROGRESSION.length]; }

  /**
   * The note plan for one bar, as data. Pure, so the arrangement can be asserted in a
   * test without an audio device.
   */
  function barPlan(barIndex, startTime) {
    var chord = chordAt(barIndex);
    var notes = [];
    notes.push({ voice: 'bass', freq: chord.bass, at: startTime, duration: BAR * 0.92 });
    chord.pad.forEach(function (freq) {
      notes.push({ voice: 'pad', freq: freq, at: startTime, duration: BAR * 0.98 });
    });
    for (var step = 0; step < 8; step++) {
      var at = startTime + step * (BEAT / 2);
      // The arpeggio rests on the second and sixth eighth, so the bar breathes instead of
      // running as a constant stream of plucks.
      if (step % 4 !== 1) {
        notes.push({ voice: 'arp', freq: chord.arp[step % chord.arp.length], at: at, duration: BEAT * 0.45 });
      }
      var drum = DRUM_PATTERN[step];
      if (drum) notes.push({ voice: 'hat', freq: 0, at: at, duration: 0.05 });
      if (drum === 2) notes.push({ voice: 'kick', freq: 55, at: at, duration: 0.28 });
    }
    return { bar: barIndex, chord: chord.name, startTime: startTime, notes: notes };
  }

  function create(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var ctx = null;
    var master = null;
    var busses = null;
    var timer = null;
    var nextBarAt = 0;
    var barIndex = 0;

    function impulse(seconds, decay) {
      var rate = ctx.sampleRate;
      var length = Math.max(1, Math.floor(rate * seconds));
      var buffer = ctx.createBuffer(2, length, rate);
      for (var channel = 0; channel < 2; channel++) {
        var data = buffer.getChannelData(channel);
        for (var i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }
      return buffer;
    }

    function build() {
      var Ctx = target.AudioContext || target.webkitAudioContext;
      if (!Ctx) return false;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.0001;

      var compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      master.connect(compressor);
      compressor.connect(ctx.destination);

      var reverb = ctx.createConvolver();
      reverb.buffer = impulse(2.4, 2.6);
      var wet = ctx.createGain();
      wet.gain.value = 0.32;
      reverb.connect(wet);
      wet.connect(master);

      var delay = ctx.createDelay(1.5);
      delay.delayTime.value = BEAT * 0.75;
      var feedback = ctx.createGain();
      feedback.gain.value = 0.34;
      var delayMix = ctx.createGain();
      delayMix.gain.value = 0.3;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(delayMix);
      delayMix.connect(master);
      delayMix.connect(reverb);

      function bus(level, toReverb, toDelay) {
        var gain = ctx.createGain();
        gain.gain.value = level;
        gain.connect(master);
        if (toReverb) gain.connect(reverb);
        if (toDelay) gain.connect(delay);
        return gain;
      }

      busses = {
        pad: bus(0.16, true, false),
        bass: bus(0.30, false, false),
        arp: bus(0.14, true, true),
        hat: bus(0.05, true, false),
        kick: bus(0.34, false, false)
      };
      return true;
    }

    function playPad(note) {
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, note.at);
      // The slow sweep is what makes a pad sound alive rather than held.
      filter.frequency.linearRampToValueAtTime(1500, note.at + note.duration * 0.6);
      filter.frequency.linearRampToValueAtTime(650, note.at + note.duration);
      filter.Q.value = 0.7;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, note.at);
      gain.gain.exponentialRampToValueAtTime(0.5, note.at + 0.9);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.at + note.duration);
      [0, -6, 6].forEach(function (detune, i) {
        var osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.value = note.freq;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(note.at);
        osc.stop(note.at + note.duration + 0.1);
      });
      filter.connect(gain);
      gain.connect(busses.pad);
    }

    function playBass(note) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, note.at);
      gain.gain.exponentialRampToValueAtTime(0.9, note.at + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.at + note.duration);
      osc.connect(gain);
      gain.connect(busses.bass);
      osc.start(note.at);
      osc.stop(note.at + note.duration + 0.05);
    }

    function playArp(note) {
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, note.at);
      filter.frequency.exponentialRampToValueAtTime(900, note.at + note.duration);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, note.at);
      gain.gain.exponentialRampToValueAtTime(0.7, note.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.at + note.duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(busses.arp);
      osc.start(note.at);
      osc.stop(note.at + note.duration + 0.05);
    }

    function noiseBuffer(seconds) {
      var length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    function playHat(note) {
      var source = ctx.createBufferSource();
      source.buffer = noiseBuffer(0.08);
      var filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, note.at);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.at + 0.06);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(busses.hat);
      source.start(note.at);
      source.stop(note.at + 0.1);
    }

    function playKick(note) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, note.at);
      osc.frequency.exponentialRampToValueAtTime(42, note.at + 0.16);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, note.at);
      gain.gain.exponentialRampToValueAtTime(0.9, note.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.at + note.duration);
      osc.connect(gain);
      gain.connect(busses.kick);
      osc.start(note.at);
      osc.stop(note.at + note.duration + 0.05);
    }

    var PLAYERS = { pad: playPad, bass: playBass, arp: playArp, hat: playHat, kick: playKick };

    function scheduleBar() {
      var plan = barPlan(barIndex, nextBarAt);
      plan.notes.forEach(function (note) {
        var play = PLAYERS[note.voice];
        if (play) { try { play(note); } catch (_) {} }
      });
      barIndex++;
      nextBarAt += BAR;
    }

    function tick() {
      if (!ctx) return;
      while (nextBarAt < ctx.currentTime + SCHEDULE_AHEAD_S) scheduleBar();
    }

    function start() {
      try {
        if (!ctx && !build()) return false;
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        if (timer) return true;
        nextBarAt = ctx.currentTime + 0.15;
        // Fade in, because a pad that starts at full level reads as a glitch.
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 2.5);
        tick();
        timer = target.setInterval(tick, LOOKAHEAD_MS);
        if (timer && timer.unref) timer.unref();
        return true;
      } catch (_) { return false; }
    }

    function stop() {
      if (timer && target.clearInterval) target.clearInterval(timer);
      timer = null;
      if (!ctx || !master) return false;
      try {
        var now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      } catch (_) {}
      return true;
    }

    function resume() { try { if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume(); } catch (_) {} }

    function playing() { return !!timer; }

    return Object.freeze({
      schema: SCHEMA,
      start: start,
      stop: stop,
      resume: resume,
      playing: playing,
      context: function () { return ctx; }
    });
  }

  return Object.freeze({
    schema: SCHEMA,
    BPM: BPM,
    BEAT: BEAT,
    BAR: BAR,
    PROGRESSION: PROGRESSION,
    DRUM_PATTERN: DRUM_PATTERN,
    chordAt: chordAt,
    barPlan: barPlan,
    create: create
  });
}));
