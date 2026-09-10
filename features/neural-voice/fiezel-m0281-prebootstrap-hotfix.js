/* M028.2 emergency hotfix: Apple continuity, PCM-edge integrity, speech serialization. */
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
      // Speculative audiobook warm-up must be allowed while the current sentence is
      // playing. The wrapped core service already serializes adapter.generate calls, so
      // blocking here starves the one-entry warm cache and forces every sentence change
      // to wait for a fresh render after playback ends.
      if(typeof inner.prefetch !== 'function') return Promise.resolve(false);
      try { return Promise.resolve(inner.prefetch(text, options)); } catch (_) { return Promise.resolve(false); }
    }

    return Object.freeze(Object.assign({}, inner, { speak: speak, stop: stop, prefetch: prefetch }));
  }

  function createVoiceService(options){
    var input = options || {};
    var patched = Object.assign({}, input);
    var appleStandalone = !!(patched.env && patched.env.navigator && patched.env.navigator.standalone === true);
    if(appleStandalone && patched.streamSentences === true){
      // m025-50 physical evidence: sentence-at-a-time generation is near realtime and
      // short chunks can exhaust audible lead. Until true incremental PCM exists, keep
      // multiple sentences/clauses in one bounded render on Apple standalone.
      patched.streamSentences = false;
      patched.appleHardChunkChars = APPLE_HARD_CHUNK_CHARS;
    }
    var baseProsody = patched.prosody || (patched.env && patched.env.FiezelProsody) || root.FiezelProsody || null;
    if(baseProsody) patched.prosody = seamProsody(baseProsody);
    return serializeService(originalCreate.call(neural, patched));
  }

  function installAppleAudioEdgeGuard(){
    var playerApi = root.FiezelWebAudioPlayer;
    if(!playerApi || typeof playerApi.createPlayer !== 'function' || playerApi.__m0282AudioEdgePatched) return false;
    var originalCreatePlayer = playerApi.createPlayer;

    function wrapWorkletCtor(NativeCtor){
      if(typeof NativeCtor !== 'function') return NativeCtor;
      return new Proxy(NativeCtor, {
        construct: function(target, args){
          var node = Reflect.construct(target, args, target);
          var port = node && node.port;
          if(port && typeof port.postMessage === 'function' && !port.__fiezelM0282EdgeWrapped){
            var originalPost = port.postMessage.bind(port);
            try { port.__fiezelM0282EdgeWrapped = true; } catch (_) {}
            port.postMessage = function(message, transfer){
              var next = message;
              if(message && message.type === 'enqueue'){
                next = Object.assign({}, message, {
                  fadeInFrames: 0,
                  fadeOutFrames: 0,
                  edgePolicy: 'model-native'
                });
              }
              // Explicit clear/cancel keeps its original bounded fadeOutFrames.
              if(arguments.length > 1) return originalPost(next, transfer);
              return originalPost(next);
            };
          }
          return node;
        }
      });
    }

    function createPlayer(env, options){
      var target = env || root;
      var appleStandalone = !!(target && target.navigator && target.navigator.standalone === true);
      var NativeCtor = target && target.AudioWorkletNode;
      if(!appleStandalone || typeof NativeCtor !== 'function'){
        return originalCreatePlayer.call(playerApi, target, options);
      }
      var WrappedCtor = wrapWorkletCtor(NativeCtor);
      var playerEnv = new Proxy(target, {
        get: function(obj, key){
          if(key === 'AudioWorkletNode') return WrappedCtor;
          return obj[key];
        },
        set: function(obj, key, value){ obj[key] = value; return true; }
      });
      return originalCreatePlayer.call(playerApi, playerEnv, options);
    }

    root.FiezelWebAudioPlayer = Object.freeze(Object.assign({}, playerApi, {
      createPlayer: createPlayer,
      __m0282AudioEdgePatched: true
    }));
    return true;
  }

  root.FiezelNeuralVoice = Object.freeze(Object.assign({}, neural, { createVoiceService: createVoiceService }));
  var edgeInstalled = installAppleAudioEdgeGuard();
  root.__fiezelM0281PrebootstrapHotfix = Object.freeze({
    schema: 'fiezel-m0282-prebootstrap-integrity-v2',
    appleHardChunkChars: APPLE_HARD_CHUNK_CHARS,
    appleStreamSentences: false,
    appleAudioEdgeGuard: edgeInstalled,
    ordinaryFadeInFrames: 0,
    ordinaryFadeOutFrames: 0,
    cancellationFade: 'preserved',
    internalSeamGapMs: 0,
    speechArbitration: 'serialized'
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);