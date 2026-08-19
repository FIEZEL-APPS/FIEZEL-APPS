/* M028.2 emergency guard: shared preparation truth + Classroom safety rollback. */
(function(root){
  'use strict';
  if(!root || root.__fiezelM0281RuntimeGuard) return;
  var stableRuntime = root.FiezelVoiceRuntime;
  if(!stableRuntime || typeof stableRuntime.speak !== 'function') return;
  root.__fiezelM0281BaseVoiceRuntime = stableRuntime;

  function runtimeStatus(){
    try { return stableRuntime.status && stableRuntime.status() || {}; } catch (_) { return {}; }
  }

  function announceIndonesianVerification(status){
    try {
      if(typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function'){
        root.dispatchEvent(new root.CustomEvent('fiezel-indonesian-voice-verification', { detail: status }));
      }
    } catch (_) {}
  }

  var indo = root.FiezelIndonesianVoice;
  if(indo && typeof indo.status === 'function') {
    var originalIndo = indo;
    function indoStatus(){
      var own = {};
      try { own = originalIndo.status() || {}; } catch (_) {}
      var base = runtimeStatus();
      var sharedPrepared = own.prepared === true || base.prepared === true || base.assetsCached === true;
      var sharedRuntimeReady = base.ready === true || base.audibleVerified === true;
      var generationReady = own.ready === true;
      var verificationComplete = sharedPrepared && sharedRuntimeReady;
      return Object.freeze(Object.assign({}, own, {
        prepared: sharedPrepared,
        ready: generationReady,
        sharedBundlePrepared: sharedPrepared,
        sharedRuntimeReady: sharedRuntimeReady,
        verificationComplete: verificationComplete,
        verificationState: verificationComplete ? 'shared-base-verified' : (sharedPrepared ? 'shared-base-cold' : 'not-prepared'),
        generationDeferred: sharedPrepared && !generationReady,
        preparationOwner: 'FiezelVoiceRuntime'
      }));
    }
    function indoPrepare(options){
      var before = runtimeStatus();
      var prepared = before.prepared === true || before.assetsCached === true;
      var ready = before.ready === true || before.audibleVerified === true;
      if(prepared && ready){
        var settled = indoStatus();
        announceIndonesianVerification(settled);
        return Promise.resolve(settled);
      }
      var activation = null;
      if(prepared && typeof stableRuntime.ensureReady === 'function') activation = stableRuntime.ensureReady();
      else if(typeof stableRuntime.prepare === 'function') activation = stableRuntime.prepare(options || {});
      else activation = Promise.reject(new Error('neural_runtime_prepare_missing'));
      return Promise.resolve(activation).then(function(){
        var settled = indoStatus();
        announceIndonesianVerification(settled);
        return settled;
      });
    }
    root.FiezelIndonesianVoice = Object.freeze(Object.assign({}, originalIndo, {
      status: indoStatus,
      prepare: indoPrepare,
      __m0281SharedPreparation: true,
      __m0282VerificationContract: true
    }));
  }

  function classroomActive(){
    try {
      var app = root.document && root.document.getElementById('app');
      return !!(app && app.querySelector && app.querySelector('.classroom-v3'));
    } catch (_) { return false; }
  }

  function installClassroomGuard(){
    var current = root.FiezelVoiceRuntime;
    if(!current || current.__m0281ClassroomGuard) return;
    function speak(text, options){
      if(!classroomActive()) return current.speak(text, options);
      var opts = Object.assign({}, options || {}, { lang: 'en-US', allowFallback: false });
      return stableRuntime.speak(text, opts);
    }
    function stop(){
      if(classroomActive()) {
        try { return stableRuntime.stop && stableRuntime.stop(); } catch (_) { return; }
      }
      try { return current.stop && current.stop(); } catch (_) {}
    }
    root.FiezelVoiceRuntime = Object.freeze(Object.assign({}, current, {
      speak: speak,
      stop: stop,
      __m0281ClassroomGuard: true
    }));
  }

  if(typeof root.setTimeout === 'function') root.setTimeout(installClassroomGuard, 0);
  else installClassroomGuard();

  root.__fiezelM0281RuntimeGuard = Object.freeze({
    schema: 'fiezel-m0282-runtime-guard-v2',
    sharedPreparation: true,
    indonesianVerification: 'shared-base-terminal-generation-deferred',
    classroomSpeech: 'stable-english-neural-worker',
    secondWorkerOnPrepare: false
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);