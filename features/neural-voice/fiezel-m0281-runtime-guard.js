/* M028.1 emergency hotfix: shared preparation + Classroom safety rollback. */
(function(root){
  'use strict';
  if(!root || root.__fiezelM0281RuntimeGuard) return;
  var stableRuntime = root.FiezelVoiceRuntime;
  if(!stableRuntime || typeof stableRuntime.speak !== 'function') return;
  root.__fiezelM0281BaseVoiceRuntime = stableRuntime;

  function runtimeStatus(){
    try { return stableRuntime.status && stableRuntime.status() || {}; } catch (_) { return {}; }
  }

  var indo = root.FiezelIndonesianVoice;
  if(indo && typeof indo.status === 'function') {
    var originalIndo = indo;
    function indoStatus(){
      var own = {};
      try { own = originalIndo.status() || {}; } catch (_) {}
      var base = runtimeStatus();
      var sharedPrepared = own.prepared === true || base.prepared === true || base.assetsCached === true;
      return Object.freeze(Object.assign({}, own, {
        prepared: sharedPrepared,
        ready: own.ready === true,
        sharedBundlePrepared: sharedPrepared,
        preparationOwner: 'FiezelVoiceRuntime'
      }));
    }
    function indoPrepare(options){
      var base = runtimeStatus();
      if(base.prepared === true || base.assetsCached === true) return Promise.resolve(indoStatus());
      if(typeof stableRuntime.prepare !== 'function') return Promise.reject(new Error('neural_runtime_prepare_missing'));
      return Promise.resolve(stableRuntime.prepare(options || {})).then(function(){ return indoStatus(); });
    }
    root.FiezelIndonesianVoice = Object.freeze(Object.assign({}, originalIndo, {
      status: indoStatus,
      prepare: indoPrepare,
      __m0281SharedPreparation: true
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
    schema: 'fiezel-m0281-runtime-guard-v1',
    sharedPreparation: true,
    classroomSpeech: 'stable-english-neural-worker',
    secondWorkerOnPrepare: false
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);