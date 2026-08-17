/* m025-36 OWNER correction: Tutor v3 speaks Indonesian neural, English stays target content. */
(function(root){
  'use strict';
  if(!root || !root.document || root.__fiezelTutorIndonesianVoiceFix) return;
  root.__fiezelTutorIndonesianVoiceFix = true;

  var baseRuntime = root.FiezelVoiceRuntime;
  var baseBundle = root.FiezelLearningBundle;

  function classroomActive(){
    try {
      var app = root.document.getElementById('app');
      return !!(app && app.querySelector('.classroom-v3'));
    } catch (_) { return false; }
  }

  function tutorText(fallback){
    try {
      var node = root.document.getElementById('tutorSubtitle');
      var text = node && String(node.textContent || '').trim();
      return text || String(fallback || '').trim();
    } catch (_) { return String(fallback || '').trim(); }
  }

  async function classroomSpeak(text, options){
    var opts = options || {};
    if (!classroomActive()) {
      if (!baseRuntime || typeof baseRuntime.speak !== 'function') throw new Error('neural_runtime_missing');
      return baseRuntime.speak(text, opts);
    }
    var indo = root.FiezelIndonesianVoice;
    if (!indo || typeof indo.speak !== 'function') throw new Error('indonesian_bundle_module_missing');
    var spoken = tutorText(text);
    if (!spoken) return { provider: 'indonesian-neural-local', skipped: true };
    return indo.speak(spoken, {
      speed: typeof opts.speed === 'number' ? opts.speed : 1,
      lang: 'id-ID',
      allowFallback: false
    });
  }

  function classroomStop(){
    if (classroomActive()) {
      try { root.FiezelIndonesianVoice && root.FiezelIndonesianVoice.stop && root.FiezelIndonesianVoice.stop(); } catch (_) {}
    }
    try { if (baseRuntime && typeof baseRuntime.stop === 'function') return baseRuntime.stop(); } catch (_) {}
  }

  if (baseRuntime) {
    try {
      root.FiezelVoiceRuntime = new Proxy(baseRuntime, {
        get: function(target, prop, receiver){
          if (prop === 'speak') return classroomSpeak;
          if (prop === 'stop') return classroomStop;
          return Reflect.get(target, prop, receiver);
        }
      });
    } catch (_) {
      // Fail closed: do not introduce browser TTS or change the original runtime.
    }
  }

  function bundleStatus(){
    var original = {};
    try { original = baseBundle && typeof baseBundle.status === 'function' ? baseBundle.status() : {}; } catch (_) {}
    var id = {};
    try { id = root.FiezelIndonesianVoice && root.FiezelIndonesianVoice.status ? root.FiezelIndonesianVoice.status() : {}; } catch (_) {}
    return Object.freeze(Object.assign({}, original, {
      schema: 'fiezel-learning-bundle-v1',
      classroom: true,
      classroomSpeech: 'id-ID neural tutor',
      targetLanguage: 'en-US',
      classroomTranscript: 'id-ID authored tutor line',
      indonesianVoicePrepared: !!id.prepared,
      indonesianVoiceReady: !!id.ready,
      indonesianModel: id.model || original.indonesianModel || '',
      error: id.error || original.error || ''
    }));
  }

  if (baseBundle) {
    root.FiezelLearningBundle = Object.freeze({
      schema: 'fiezel-learning-bundle-v1',
      status: bundleStatus,
      prepare: function(options){
        if (typeof baseBundle.prepare === 'function') return baseBundle.prepare(options);
        if (root.FiezelIndonesianVoice && root.FiezelIndonesianVoice.prepare) return root.FiezelIndonesianVoice.prepare(options || {});
        return Promise.reject(new Error('indonesian_bundle_module_missing'));
      }
    });
  }

  function correctVisibleContract(){
    if (!classroomActive()) return;
    try {
      var bundleCopy = root.document.querySelector('.tutor-bundle p');
      if (bundleCopy) bundleCopy.textContent = 'Classroom memakai suara tutor neural Indonesia. English tetap menjadi materi target, contoh, prompt, dan latihan.';
      root.document.querySelectorAll('.tutor-caption span').forEach(function(label){
        label.textContent = 'PENJELASAN TUTOR · INDONESIA';
      });
      var state = root.document.getElementById('tutorVoiceState');
      if (state && /ready/i.test(state.textContent || '')) state.textContent = 'Tutor neural Indonesia siap. Tanyakan kapan pun ada yang belum jelas.';
    } catch (_) {}
  }

  var app = root.document.getElementById('app');
  if (app && root.MutationObserver) {
    new MutationObserver(correctVisibleContract).observe(app, { childList: true, subtree: true });
  }
  correctVisibleContract();
})(typeof globalThis !== 'undefined' ? globalThis : window);
