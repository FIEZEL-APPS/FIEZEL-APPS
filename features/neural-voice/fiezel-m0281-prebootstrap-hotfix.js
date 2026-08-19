/* M028.1 emergency hotfix: seam policy + deterministic speech serialization. */
(function(root){
  'use strict';
  if(!root || root.__fiezelM0281PrebootstrapHotfix) return;
  var neural = root.FiezelNeuralVoice;
  if(!neural || typeof neural.createVoiceService !== 'function') return;
  var originalCreate = neural.createVoiceService;
  var APPLE_HARD_CHUNK_CHARS = 80;

  function normalizedLine(value){ return String(value == null ? '' : value).replace(/\s+/g,' ').trim(); }

  function seamProsody(base){
    if(!base) return base;
    var copy = Object.assign({}, base);
    // createVoiceService uses punctuate() only to classify the seam before the next
    // rendered chunk. Artificial hard slices must stay unpunctuated here; otherwise an
    // internal 32/80-char cut is promoted to a full sentence and receives a 420ms stop.
    copy.punctuate = function(text){ return normalizedLine(text); };
    copy.gapAfter = function(text, lang){
      var line = normalizedLine(text);
      if(!line) return 0;
      // No explicit punctuation at the source boundary => this is an internal seam.
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
      // Keep the internal queue alive after either outcome while returning the real result.
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
    if(appleStandalone && patched.streamSentences === true && !Object.prototype.hasOwnProperty.call(patched, 'appleHardChunkChars')) {
      patched.appleHardChunkChars = APPLE_HARD_CHUNK_CHARS;
    }
    var baseProsody = patched.prosody || (patched.env && patched.env.FiezelProsody) || root.FiezelProsody || null;
    if(baseProsody) patched.prosody = seamProsody(baseProsody);
    return serializeService(originalCreate.call(neural, patched));
  }

  root.FiezelNeuralVoice = Object.freeze(Object.assign({}, neural, { createVoiceService: createVoiceService }));
  root.__fiezelM0281PrebootstrapHotfix = Object.freeze({
    schema: 'fiezel-m0281-prebootstrap-hotfix-v1',
    appleHardChunkChars: APPLE_HARD_CHUNK_CHARS,
    internalSeamGapMs: 0,
    speechArbitration: 'serialized'
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);