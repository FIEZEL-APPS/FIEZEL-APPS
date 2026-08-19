/* M028.2 emergency hotfix: Apple continuity policy + deterministic speech serialization. */
(function(root){
  'use strict';
  if(!root || root.__fiezelM0281PrebootstrapHotfix) return;
  var neural = root.FiezelNeuralVoice;
  if(!neural || typeof neural.createVoiceService !== 'function') return;
  var originalCreate = neural.createVoiceService;
  var APPLE_HARD_CHUNK_CHARS = 128;

  function normalizedLine(value){ return String(value == null ? '' : value).replace(/\s+/g,' ').trim(); }

  function seamProsody(base){
    if(!base) return base;
    var copy = Object.assign({}, base);
    copy.punctuate = function(text){ return normalizedLine(text); };
    copy.gapAfter = function(text, lang){
      var line = normalizedLine(text);
      if(!line) return 0;
      if(!/[.!?…,;:]$/.test(line)) return 0;
      if(typeof base.gapAfter === 'function') return Math.max(0, Number(base.gapAfter(line, lang)) || 0);
      return /[.!?…]$/.test(line) ? 300 : 140;
    };
    return Object.freeze(copy);
  }

  function serializeService(inner){
    if(!inner || typeof inner.speak !== 'function') return inner;
    var chain = Promise.resolve();
    var stopEpoch = 0;
    var pending = 0;

    function cancelled(){
      var error = new Error('TTS request superseded');
      error.code = 'tts_request_superseded';
      return error;
    }

    function speak(text, options){
      var epoch = stopEpoch;
      pending += 1;
      var run = chain.then(function(){
        if(epoch !== stopEpoch) throw cancelled();
        return inner.speak(text, options);
      });
      chain = run.then(function(value){ pending = Math.max(0, pending - 1); return value; }, function(error){ pending = Math.max(0, pending - 1); throw error; });
      chain = chain.catch(function(){});
      return run;
    }

    function stop(){
      stopEpoch += 1;
      try { return inner.stop && inner.stop(); } catch (_) {}
    }

    function prefetch(text, options){
      if(pending > 0 || typeof inner.prefetch !== 'function') return Promise.resolve(false);
      try { return Promise.resolve(inner.prefetch(text, options)); } catch (_) { return Promise.resolve(false); }
    }

    return Object.freeze(Object.assign({}, inner, { speak: speak, stop: stop, prefetch: prefetch }));
  }

  function createVoiceService(options){
    var input = options || {};
    var patched = Object.assign({}, input);
    var appleStandalone = !!(patched.env && patched.env.navigator && patched.env.navigator.standalone === true);
    if(appleStandalone && patched.streamSentences === true){
      // m028-50 physical evidence: sentence-at-a-time generation is near realtime and
      // short chunks can exhaust the audible lead. Until true incremental PCM exists,
      // keep multiple sentences/clauses in one bounded render on Apple standalone.
      patched.streamSentences = false;
      patched.appleHardChunkChars = APPLE_HARD_CHUNK_CHARS;
    }
    var baseProsody = patched.prosody || (patched.env && patched.env.FiezelProsody) || root.FiezelProsody || null;
    if(baseProsody) patched.prosody = seamProsody(baseProsody);
    return serializeService(originalCreate.call(neural, patched));
  }

  root.FiezelNeuralVoice = Object.freeze(Object.assign({}, neural, { createVoiceService: createVoiceService }));
  root.__fiezelM0281PrebootstrapHotfix = Object.freeze({
    schema: 'fiezel-m0282-prebootstrap-integrity-v1',
    appleHardChunkChars: APPLE_HARD_CHUNK_CHARS,
    appleStreamSentences: false,
    internalSeamGapMs: 0,
    speechArbitration: 'serialized'
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);