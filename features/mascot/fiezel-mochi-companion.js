/* ============================================================================
   features/mascot/fiezel-mochi-companion.js — 3D Mochi Mascot PWA Integration

   Integrates the authentic 3D Volumetric Jelly Mochi Mascot (Three.js) directly
   into PWA Fiezel practice sessions (Grammar, Listening/Chokai, Vocab, Reading,
   Writing, and Quiz Stages).

   Preserves existing SVG rig in the DOM for accessibility and static test suites
   while rendering the live 3D viscoelastic Mochi companion with:
   - Dynamic Expressions:
     * 'dots': 3D sparkling cat eyes + sweet kitten mouth + glossy violet typing badge
     * 'happy': arched happy eyes (⌒ ⌒) + open mouth + stars fx burst + joyful hop
     * 'pout': adorable toddler pout (manyun) on wrong answers with puffed round
       cheeks, pursed protruding lips, glossy puppy eyes, furrowed drama brows,
       and authentic strawberry cheek blush contour!
   - Option C marshmallow paws with pink toe beans & palm pads reacting dynamically:
     wave on hover, cheer on correct, sulk on wrong.
   - Audio listening indicator badge for chokai & listening practice.
   ============================================================================ */
(function (global) {
  'use strict';
  if (!global || !global.document) return;

  function prefersReducedMotion() {
    try {
      return (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
        (global.document.body && global.document.body.classList.contains('reduce-motion'));
    } catch (_) { return false; }
  }

  function motionAllowed() {
    if (prefersReducedMotion()) return false;
    try {
      var st = typeof global.__getFiezelState === 'function' ? global.__getFiezelState() : null;
      if (st && st.preferences && st.preferences.motion === false) return false;
    } catch (_) { }
    return true;
  }

  /* Target practice containers where 3D Mochi companion sits */
  var PRACTICE_CONTAINER_SELECTORS = [
    '.quiz-stage',
    '.fz-paw-slot',
    '.quiz-shell',
    '.fsl-player',
    '.fsl-mascot-slot',
    '.fsl-mascot-strip',
    '.writing-stage',
    '.lesson-stage-paw',
    '.lesson-mascot',
    '.result-stage',
    '.coach-strip-face',
    '.quiz-mascot',
    '.jlpt-mascot-slot',
    '.jlpt-mobile-card'
  ];

  function isPracticeHost(host) {
    if (!host || !host.closest) return false;
    for (var i = 0; i < PRACTICE_CONTAINER_SELECTORS.length; i++) {
      if (host.closest(PRACTICE_CONTAINER_SELECTORS[i])) return true;
    }
    // Also attach if host has specific classes
    if (host.classList.contains('fz-paw-panel') ||
        host.classList.contains('fsl-mascot') ||
        host.classList.contains('jlpt-mascot') ||
        host.classList.contains('writing-mascot') ||
        host.classList.contains('lesson-mascot')) {
      return true;
    }
    return false;
  }

  function attachMochi(host) {
    if (!host || host.__mochiAttached) return;
    if (!motionAllowed()) return;
    if (!global.FiezelMochi) return;
    if (!isPracticeHost(host)) return;

    host.__mochiAttached = true;

    // Detect if this is a listening practice or question
    var isListening = !!(host.closest('.fsl-player') ||
                         host.closest('.quiz-listen-hero') ||
                         host.closest('.jlpt-mobile-card') ||
                         host.closest('.jlpt-mascot-slot') ||
                         global.document.getElementById('quizListen'));

    // Create 3D viewport mount element
    var viewport = global.document.createElement('div');
    viewport.className = 'fz-mochi-viewport';
    viewport.setAttribute('aria-hidden', 'true');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.width = '100%';
    viewport.style.height = '100%';
    viewport.style.display = 'flex';
    viewport.style.alignItems = 'center';
    viewport.style.justifyContent = 'center';
    viewport.style.overflow = 'visible';
    viewport.style.pointerEvents = 'auto';
    viewport.style.cursor = 'pointer';
    viewport.style.zIndex = '2';

    // Ensure host has relative positioning so viewport covers it
    host.style.position = 'relative';
    host.style.display = 'block';
    if (host.closest('.fsl-mascot-slot') || host.closest('.jlpt-mascot-slot') || host.classList.contains('jlpt-mascot')) {
      host.style.width = '100%';
      host.style.height = '100%';
    }

    // Instantiate 3D Mochi mascot
    var initialMood = 'dots';
    var initialBadge = 'chat_purple';
    var initialAura = 'purple';

    var rect = host.getBoundingClientRect();
    var w = rect.width > 20 ? rect.width : (host.offsetWidth > 20 ? host.offsetWidth : 380);
    var h = rect.height > 20 ? rect.height : (host.offsetHeight > 20 ? host.offsetHeight : 360);

    try {
      var mochi = new global.FiezelMochi(viewport, {
        mood: initialMood,
        badge: initialBadge,
        aura: initialAura,
        showHands: true,
        showEars: true,
        showTail: false,
        width: Math.round(w),
        height: Math.round(h)
      });

      host.__mochiInstance = mochi;

      // Trigger initial welcoming ear wiggle on entry
      try {
        if (typeof mochi.triggerEarWiggle === 'function') mochi.triggerEarWiggle(1.3);
      } catch (_) {}

      // Hide the 2D SVG visually while preserving it in the DOM for a11y & tests
      var svg = host.querySelector('.fz-svg');
      if (svg) svg.style.opacity = '0';

      host.appendChild(viewport);

      // Re-calibrate size after CSS modal/card pop animations settle (280ms)
      setTimeout(function () {
        try {
          if (host && host.__mochiInstance) {
            var r = host.getBoundingClientRect();
            if (r.width > 20 && r.height > 20) {
              host.__mochiInstance.updateSize(Math.round(r.width), Math.round(r.height));
            }
          }
        } catch (_) {}
      }, 280);

      // Interactive tactile tap/click feedback
      viewport.addEventListener('click', function (e) {
        e.stopPropagation();
        try {
          mochi.triggerHop(0.28);
          mochi.triggerHandGesture('wave', 1.2);
          if (typeof mochi.triggerEarWiggle === 'function') mochi.triggerEarWiggle(1.3);
        } catch (_) {}
      });

      // Hook element react method
      var origReact = typeof host.react === 'function' ? host.react.bind(host) : null;
      host.react = function (evt, detail) {
        var ret = true;
        var isCustom3dEvent = (evt === 'question-shown' || evt === 'listening-start' || evt === 'listening-stop' || evt === 'hover-answer' || evt === 'hover-leave' || evt === 'answer-picked' || evt === 'idle');
        if (origReact && !isCustom3dEvent) {
          try { ret = origReact(evt, detail); } catch (_) {}
        }
        if (!host.__mochiInstance) return ret;
        var m = host.__mochiInstance;

        switch (evt) {
          case 'correct':
            host.__mochiHoldUntil = Date.now() + 2200;
            m.setMood('happy');
            m.setAura('green');
            m.setFx('stars');
            m.triggerHop(0.38);
            m.triggerHandGesture('cheer', 1.8);
            setTimeout(function () {
              if (Date.now() >= (host.__mochiHoldUntil || 0) && host.__mochiInstance) {
                m.setMood('dots');
                m.setBadge('chat_purple');
                m.setAura('purple');
                m.setFx(null);
                m.retractHands();
              }
            }, 2300);
            break;
          case 'wrong':
            // Toddler pout (manyun) on wrong answers!
            host.__mochiHoldUntil = Date.now() + 2000;
            m.setMood('pout');
            m.setAura('pink');
            m.setFx(null);
            m.triggerHandGesture('sulk', 2.0);
            setTimeout(function () {
              if (Date.now() >= (host.__mochiHoldUntil || 0) && host.__mochiInstance) {
                m.setMood('dots');
                m.setBadge('chat_purple');
                m.setAura('purple');
                m.setFx(null);
                m.retractHands();
              }
            }, 2100);
            break;
          case 'listening-start':
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            m.triggerHandGesture('wave', 1.2);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'listening-stop':
            m.setMood('dots');
            m.setBadge('chat_purple'); // Keep indicator badge active
            m.setAura('purple');
            m.retractHands();
            break;
          case 'question-shown':
            host.__mochiHoldUntil = 0;
            m.setMood('dots');
            m.setBadge('chat_purple'); // Always show indicator badge
            m.setAura('purple');
            m.retractHands();
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'idle':
            host.__mochiHoldUntil = 0;
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            m.setFx(null);
            m.retractHands();
            break;
          case 'hover-answer':
            m.triggerHandGesture('wave', 1.5);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(0.8);
            break;
          case 'hover-leave':
            m.retractHands();
            break;
          case 'answer-picked':
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.0);
            break;
          case 'reward':
          case 'milestone':
          case 'level-up':
          case 'completion':
          case 'lesson-complete':
            host.__mochiHoldUntil = Date.now() + 2500;
            m.setMood('happy');
            m.setAura('amber');
            m.setFx('stars');
            m.triggerHop(0.35);
            m.triggerHandGesture('cheer', 1.8);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.6);
            setTimeout(function () {
              if (Date.now() >= (host.__mochiHoldUntil || 0) && host.__mochiInstance) {
                m.setMood('dots');
                m.setBadge('chat_purple');
                m.setAura('purple');
                m.setFx(null);
                m.retractHands();
              }
            }, 2600);
            break;
          case 'lesson-start':
          case 'session-start':
          case 'greeting':
          case 'welcome-back':
          case 'onboard':
            host.__mochiHoldUntil = 0;
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            m.triggerHop(0.25);
            m.triggerHandGesture('wave', 1.4);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'curious':
          case 'encouraging':
            host.__mochiHoldUntil = 0;
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'wake':
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            m.triggerHop(0.22);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
        }
        return ret;
      };

      // Hook element setState method
      var origSetState = typeof host.setState === 'function' ? host.setState.bind(host) : null;
      host.setState = function (name, opts) {
        var ret = true;
        if (origSetState) {
          try { ret = origSetState(name, opts); } catch (_) {}
        }
        if (!host.__mochiInstance) return ret;
        var m = host.__mochiInstance;

        // If hold timer is active, do not let low-priority states stomp active mood
        if (Date.now() < (host.__mochiHoldUntil || 0) &&
            (name === 'idle' || name === 'encouraging' || name === 'curious')) {
          return ret;
        }

        switch (name) {
          case 'celebrating':
          case 'proud':
          case 'love':
            m.setMood('happy');
            m.setAura('green');
            m.setFx('stars');
            m.triggerHop(0.35);
            m.triggerHandGesture('cheer', 1.8);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'sad':
          case 'confused':
            m.setMood('pout');
            m.setAura('pink');
            m.setFx(null);
            m.triggerHandGesture('sulk', 2.0);
            break;
          case 'listening':
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'curious':
          case 'encouraging':
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'lesson-start':
          case 'session-start':
          case 'greeting':
          case 'welcome-back':
          case 'onboard':
            m.setMood('dots');
            m.setBadge('chat_purple');
            m.setAura('purple');
            m.triggerHop(0.25);
            m.triggerHandGesture('wave', 1.4);
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
            break;
          case 'sleepy':
            m.setMood('sleepy');
            m.setBadge(null);
            m.setAura(null);
            break;
          case 'idle':
            m.setMood('dots');
            m.setBadge('chat_purple'); // ALWAYS KEEP INDICATOR BADGE VISIBLE ON IDLE/DIAM!
            m.setAura('purple');
            m.setFx(null);
            m.retractHands();
            if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(0.9);
            break;
        }
        return ret;
      };

      // Monitor detachment to clean up WebGL resources
      var checkRemoval = function () {
        if (!global.document.contains(host)) {
          if (host.__mochiInstance) {
            host.__mochiInstance.destroy();
            host.__mochiInstance = null;
          }
          host.__mochiAttached = false;
        }
      };

      var removeObserver = new MutationObserver(checkRemoval);
      removeObserver.observe(global.document.body || global.document.documentElement, {
        childList: true,
        subtree: true
      });

      // Responsive ResizeObserver
      if (typeof global.ResizeObserver !== 'undefined') {
        var ro = new global.ResizeObserver(function (entries) {
          for (var r = 0; r < entries.length; r++) {
            var cr = entries[r].contentRect;
            if (cr.width > 0 && cr.height > 0 && host.__mochiInstance) {
              host.__mochiInstance.updateSize(cr.width, cr.height);
            }
          }
        });
        ro.observe(host);
      }

    } catch (err) {
      console.warn('[FiezelMochiCompanion] Failed to initialize 3D Mochi:', err);
      // Fallback: restore 2D SVG visibility
      var origSvg = host.querySelector('.fz-svg');
      if (origSvg) origSvg.style.opacity = '1';
      host.__mochiAttached = false;
    }
  }

  function scanAndAttach() {
    try {
      var mascots = global.document.querySelectorAll('fiezel-mascot');
      for (var i = 0; i < mascots.length; i++) {
        attachMochi(mascots[i]);
      }
    } catch (_) {}
  }

  // Load FiezelMochi module if not yet loaded
  function ensureMochiModule() {
    if (global.FiezelMochi) {
      scanAndAttach();
      return;
    }
    var candidatePaths = [
      './mochi-mascot/fiezel-mochi.js',
      '/mochi-mascot/fiezel-mochi.js',
      '../../mochi-mascot/fiezel-mochi.js'
    ];
    function tryNext(idx) {
      if (idx >= candidatePaths.length) return;
      import(candidatePaths[idx]).then(function (mod) {
        if (mod && mod.FiezelMochi) global.FiezelMochi = mod.FiezelMochi;
        scanAndAttach();
      }).catch(function () {
        tryNext(idx + 1);
      });
    }
    tryNext(0);
  }

  function init() {
    ensureMochiModule();

    // DOM MutationObserver for dynamically inserted quiz stages and practice panels
    try {
      var mo = new MutationObserver(function (mutations) {
        var hasAdded = false;
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
            hasAdded = true;
            break;
          }
        }
        if (hasAdded) scanAndAttach();
      });
      mo.observe(global.document.body || global.document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (_) {}

    // Global custom element defined hook
    if (global.customElements && typeof global.customElements.whenDefined === 'function') {
      global.customElements.whenDefined('fiezel-mascot').then(scanAndAttach).catch(function () {});
    }
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  global.FiezelMochiCompanion = {
    scan: scanAndAttach,
    attach: attachMochi
  };

})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null));
