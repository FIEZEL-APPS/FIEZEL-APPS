/* m025-37 OWNER correction: Tutor v3 speaks Indonesian neural, English stays target content. */
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
    var spoken = tutorText(text);
    if (!spoken) return { provider: 'indonesian-neural-local', skipped: true };
    var indo = root.FiezelIndonesianVoice;
    var indoReady = false;
    try { indoReady = !!(indo && typeof indo.speak === 'function' && indo.status && indo.status().prepared); } catch (_) { indoReady = false; }
    if (indoReady) {
      try {
        return await indo.speak(spoken, {
          speed: typeof opts.speed === 'number' ? opts.speed : 1,
          lang: 'id-ID',
          allowFallback: false
        });
      } catch (error) {
        // Fall through to the mandatory engine rather than leaving Classroom mute.
        try { root.console && root.console.warn && root.console.warn('indonesian tutor voice failed, using base engine', error); } catch (_) {}
      }
    }
    // m025-39: the Indonesian bundle is an OPTIONAL 94MB download. Requiring it here made
    // Classroom speech fail outright for anyone who had not fetched it, which is what
    // OWNER hit as "reload Classroom selalu gagal". English neural is mandatory and
    // always present, so it is the correct floor. Browser TTS is never used.
    if (!baseRuntime || typeof baseRuntime.speak !== 'function') throw new Error('neural_runtime_missing');
    return baseRuntime.speak(spoken, Object.assign({}, opts, { allowFallback: false }));
  }

  function classroomStop(){
    if (classroomActive()) {
      try { root.FiezelIndonesianVoice && root.FiezelIndonesianVoice.stop && root.FiezelIndonesianVoice.stop(); } catch (_) {}
    }
    try { if (baseRuntime && typeof baseRuntime.stop === 'function') return baseRuntime.stop(); } catch (_) {}
  }

  // m025-40: this was a Proxy over baseRuntime. FiezelVoiceRuntime is Object.freeze'd, so
  // every property is non-writable and non-configurable, and a Proxy `get` trap MUST then
  // return the target's own value. Returning a replacement for `speak` violated that
  // invariant, so EVERY speak call threw a TypeError: English voice, Classroom audio and
  // Listening all died at once. Diagnostic 39 recorded nine fatal
  // UNHANDLED_PROMISE_REJECTION entries carrying exactly that message.
  //
  // A frozen object cannot be proxied with substituted members, so copy its surface into
  // a new object and override there. No invariant to violate.
  if (baseRuntime) {
    try {
      // Same idiom every other neural patch layer uses (ios-cache-fix,
      // cache-integrity-repair, audibility-fix): spread the current runtime and freeze
      // the override. Consistent, and immune to the frozen-target invariant.
      root.FiezelVoiceRuntime = Object.freeze(Object.assign({}, baseRuntime, {
        speak: classroomSpeak,
        stop: classroomStop,
        __tutorIndonesianPatched: true
      }));
    } catch (_) {}
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

  // Writes must be idempotent. This callback runs from a MutationObserver watching #app
  // with subtree:true, so an unconditional textContent assignment re-enters the observer
  // and the pair loops without end. That loop is what made every session render slow.
  function setTextIfChanged(node, value){
    if (!node) return false;
    if (String(node.textContent || '') === value) return false;
    node.textContent = value;
    return true;
  }

  var observer = null;
  var scheduled = false;

  function correctVisibleContract(){
    if (!classroomActive()) return;
    // Detach while writing, so our own edits cannot feed back into the observer even if
    // a future edit here becomes non-idempotent.
    var wasObserving = !!observer;
    if (wasObserving) { try { observer.disconnect(); } catch (_) {} }
    try {
      setTextIfChanged(root.document.querySelector('.tutor-bundle p'),
        'Classroom memakai suara tutor neural Indonesia. English tetap menjadi materi target, contoh, prompt, dan latihan.');
      root.document.querySelectorAll('.tutor-caption span').forEach(function(label){
        setTextIfChanged(label, 'PENJELASAN TUTOR · INDONESIA');
      });
      var state = root.document.getElementById('tutorVoiceState');
      if (state && /ready/i.test(state.textContent || '')) {
        setTextIfChanged(state, 'Tutor neural Indonesia siap. Tanyakan kapan pun ada yang belum jelas.');
      }
    } catch (_) {}
    if (wasObserving) observe();
  }

  // Coalesce bursts: a single render replaces the whole subtree and emits many records,
  // and running the pass per record was pure waste.
  function scheduleCorrection(){
    if (scheduled) return;
    scheduled = true;
    var run = function(){ scheduled = false; correctVisibleContract(); };
    if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  function observe(){
    var app = root.document.getElementById('app');
    if (!app || !root.MutationObserver) return;
    if (!observer) observer = new root.MutationObserver(scheduleCorrection);
    try { observer.observe(app, { childList: true, subtree: true }); } catch (_) {}
  }

  observe();
  correctVisibleContract();
})(typeof globalThis !== 'undefined' ? globalThis : window);
