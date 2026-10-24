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
    '.jlpt-mobile-card',
    '.fz-vissol-mascot-wrap'
  ];

  function isPracticeHost(host) {
    if (!host) return false;
    // Universally replace all old SVG PAW mascots across all surfaces:
    // practice sessions, onboarding, coach bubbles, lesson stages, and home.
    return true;
  }

  /* ONE live Mochi for the whole app (m025-567).
     Every <fiezel-mascot> used to get its own WebGL renderer, 60 fps loop and body-wide
     MutationObserver, and every quiz question re-render (setApp) threw that renderer away
     and built a new one: new GL context, new geometry, new skin texture, shader compile -
     the lag students felt on each "Lanjut" tap on phones. Now a single instance is moved
     between hosts: the newest rendered host wins, the others keep the 2D rig, and with no
     host left the instance is parked (paused) and freed after PARK_TTL_MS. */
  var PARK_TTL_MS = 45000;
  var pool = { mochi: null, viewport: null, host: null, ro: null, parkTimer: null, failed: false };
  var seenSeq = 0;

  function createViewport() {
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
    viewport.style.cursor = 'grab';
    viewport.style.touchAction = 'none';
    viewport.style.userSelect = 'none';
    viewport.style.webkitUserSelect = 'none';
    viewport.style.zIndex = '2';
    return viewport;
  }

  function measureHost(host) {
    var w = host.offsetWidth > 20 ? host.offsetWidth : (host.getBoundingClientRect ? host.getBoundingClientRect().width : 380);
    var h = host.offsetHeight > 20 ? host.offsetHeight : (host.getBoundingClientRect ? host.getBoundingClientRect().height : 360);
    if (w <= 20) w = 380;
    if (h <= 20) h = 360;
    return { w: Math.round(w), h: Math.round(h) };
  }

  function detectSession(host) {
    try {
      if (!host) return 'quiz';
      if (host.closest('.writing-stage') ||
          host.closest('.writing-shell') ||
          host.classList.contains('writing-mascot') ||
          (typeof global.__getFiezelState === 'function' && global.__getFiezelState()?.view === 'writing')) {
        return 'writing';
      }
      if (host.closest('.reading-stage') ||
          host.closest('.reading-shell') ||
          host.closest('.quiz-shell.is-reading') ||
          (typeof global.__getFiezelState === 'function' && global.__getFiezelState()?.view === 'reading')) {
        return 'reading';
      }
      if (host.closest('.jlpt-mascot-slot') ||
          host.closest('.fsl-mascot-slot') ||
          host.closest('#listeningPanelModal') ||
          host.closest('.fsl-player') ||
          (typeof global.__getFiezelState === 'function' && global.__getFiezelState()?.view === 'listening')) {
        return 'listening';
      }
      if (host.closest('.fz-vissol-mascot-wrap') ||
          host.classList.contains('fz-vissol-mascot-wrap') ||
          host.closest('.tactile-welcome-bar')) {
        return 'home';
      }
    } catch (_) {}
    return 'quiz';
  }

  function applySessionAccessories(m, host) {
    if (!m || typeof m.setAccessory !== 'function') return;
    var session = detectSession(host);
    if (session === 'home') {
      m.setAccessory('headset');
      m.setAura('gold');
      m.setMood('happy');
    } else if (session === 'listening') {
      m.setAccessory('headset');
      m.setAura('blue');
    } else if (session === 'reading') {
      m.setAccessory('glasses');
      m.setAura(null);
    } else if (session === 'writing') {
      m.setAccessory('pencil');
      m.setAura(null);
    } else {
      m.setAccessory(null);
      m.setAura(null);
    }
  }

  /**
   * 4-Stage Interactive Mascot Sound & Choreography Cycle
   * 1. paw_greet:     Chirp vibrato (38 Hz, F4->A4). Signature sound. Mood: wink, gesture: wave, aura: gold, hop: 0.32, earWiggle: 1.3
   * 2. paw_appear:    Trill roll (24 Hz, ~C5). Perky & curious. Mood: dots, gesture: cheer, aura: blue, hop: 0.24, earWiggle: 1.8
   * 3. paw_encourage: Purr (26 Hz AM, F2 87Hz). Warm soothing comfort. Mood: hearts, gesture: pout/snuggle, aura: pink, hop: 0.14, earWiggle: 0.7
   * 4. paw_celebrate: Meow (F4->C5 + shimmer). High joy celebration. Mood: happy, gesture: cheer, aura: green, hop: 0.48, earWiggle: 1.6, fx: 'orbit'
   */
  var TOUCH_VOICE_STEPS = [
    {
      sfx: 'paw_greet',
      mood: 'wink',
      gesture: 'wave',
      aura: 'gold',
      hop: 0.32,
      earWiggle: 1.3,
      talkDuration: 0.88,
      holdSec: 3.5,
      fx: null,
      title: 'Chirp Greet'
    },
    {
      sfx: 'paw_appear',
      mood: 'dots',
      gesture: 'cheer',
      aura: 'blue',
      hop: 0.24,
      earWiggle: 1.8,
      talkDuration: 0.68,
      holdSec: 3.2,
      fx: null,
      title: 'Trill Pop'
    },
    {
      sfx: 'paw_encourage',
      mood: 'hearts',
      gesture: 'pout',
      aura: 'pink',
      hop: 0.14,
      earWiggle: 0.7,
      talkDuration: 1.48,
      holdSec: 3.8,
      fx: null,
      title: 'Purr Cuddle'
    },
    {
      sfx: 'paw_celebrate',
      mood: 'happy',
      gesture: 'cheer',
      aura: 'green',
      hop: 0.48,
      earWiggle: 1.6,
      talkDuration: 1.78,
      holdSec: 4.2,
      fx: 'orbit',
      title: 'Meow Celebrate'
    }
  ];
  var touchStepIndex = 0;
  var _touchFxTimer = null;

  function interactTouch(m, overrideIndex) {
    var mochi = m || pool.mochi;
    if (!mochi) return null;

    var idx = (typeof overrideIndex === 'number' && overrideIndex >= 0)
      ? (overrideIndex % TOUCH_VOICE_STEPS.length)
      : touchStepIndex;

    var step = TOUCH_VOICE_STEPS[idx];
    if (typeof overrideIndex !== 'number') {
      touchStepIndex = (touchStepIndex + 1) % TOUCH_VOICE_STEPS.length;
    }

    try {
      if (typeof mochi.setMood === 'function') mochi.setMood(step.mood);
      if (typeof mochi.holdMood === 'function') mochi.holdMood(step.holdSec);
      if (typeof mochi.setAura === 'function') mochi.setAura(step.aura);
      if (typeof mochi.setTalking === 'function') mochi.setTalking(true, step.talkDuration);
      if (typeof mochi.triggerHop === 'function') mochi.triggerHop(step.hop);
      if (typeof mochi.triggerHandGesture === 'function') mochi.triggerHandGesture(step.gesture, step.holdSec);
      if (typeof mochi.triggerEarWiggle === 'function') mochi.triggerEarWiggle(step.earWiggle);
      if (typeof mochi.setFx === 'function') {
        clearTimeout(_touchFxTimer);
        mochi.setFx(step.fx);
        if (step.fx) {
          _touchFxTimer = setTimeout(function () {
            if (mochi.fx === step.fx) mochi.setFx(null);
          }, Math.round(step.talkDuration * 1000) + 400);
        }
      }
      if (typeof global.uiSfx === 'function') {
        global.uiSfx(step.sfx, { force: true });
      }
    } catch (_) {}
    return step;
  }

  function createPoolInstance(size) {
    var viewport = createViewport();
    var mochi = new global.FiezelMochi(viewport, {
      mood: 'dots',
      badge: null,       // Badges purple GONE on idle! Only appears when thinking
      aura: null,
      showHands: true,
      showEars: true,
      showTail: false,
      width: size.w,
      height: size.h
    });

    // Wire up tactile tap & click feedback
    mochi.onTap = function () {
      interactTouch(mochi);
    };

    viewport.addEventListener('click', function (e) {
      e.stopPropagation();
      interactTouch(mochi);
    });

    // Responsive ResizeObserver, re-pointed at whichever host holds the viewport
    var ro = null;
    if (typeof global.ResizeObserver !== 'undefined') {
      ro = new global.ResizeObserver(function (entries) {
        for (var r = 0; r < entries.length; r++) {
          var cr = entries[r].contentRect;
          if (entries[r].target === pool.host && cr.width > 0 && cr.height > 0 && pool.mochi) {
            pool.mochi.updateSize(cr.width, cr.height);
          }
        }
      });
    }

    pool.mochi = mochi;
    pool.viewport = viewport;
    pool.ro = ro;
  }

  function hookHost(host) {
    if (host.__mochiHooked) return;
    host.__mochiHooked = true;

    // Hook element react method
    var origReact = typeof host.react === 'function' ? host.react.bind(host) : null;
    host.react = function (evt, detail) {
      var ret = true;
      var isCustom3dEvent = (evt === 'question-shown' || evt === 'listening-start' || evt === 'listening-stop' || evt === 'hover-answer' || evt === 'hover-leave' || evt === 'answer-picked' || evt === 'idle');
      // A host that shows the 2D rig again (Mochi moved to a newer host) gets every event.
      if (origReact && (!isCustom3dEvent || !host.__mochiInstance)) {
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
              m.setBadge(null);
              m.setAura(null);
              m.setFx(null);
              m.retractHands();
              applySessionAccessories(m, host);
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
              m.setBadge(null);
              m.setAura(null);
              m.setFx(null);
              m.retractHands();
              applySessionAccessories(m, host);
            }
          }, 2100);
          break;
        case 'listening-start':
          m.setMood('dots');
          m.setBadge(null);
          m.setAccessory('headset');
          m.setAura('blue');
          if (typeof m.setTalking === 'function') m.setTalking(true);
          m.triggerHandGesture('wave', 1.2);
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          break;
        case 'listening-stop':
          m.setMood('dots');
          m.setBadge(null);
          if (typeof m.setTalking === 'function') m.setTalking(false);
          m.retractHands();
          applySessionAccessories(m, host);
          break;
        case 'speaking':
        case 'talk':
          if (typeof m.setTalking === 'function') m.setTalking(true, (detail && detail.duration) ? detail.duration : 0);
          break;
        case 'speaking-stop':
          if (typeof m.setTalking === 'function') m.setTalking(false);
          break;
        case 'think':
        case 'thinking':
        case 'evaluating':
        case 'analyzing':
        case 'loading':
          if (typeof m.setThinking === 'function') m.setThinking(true);
          else { m.setBadge('chat_purple'); m.setAura('purple'); }
          break;
        case 'think-end':
        case 'thinking-end':
        case 'think-stop':
          if (typeof m.setThinking === 'function') m.setThinking(false);
          else { m.setBadge(null); m.setAura(null); }
          applySessionAccessories(m, host);
          break;
        case 'question-shown':
          host.__mochiHoldUntil = 0;
          m.setMood('dots');
          m.setBadge(null); // Purple badge GONE on question shown!
          m.setAura(null);
          m.retractHands();
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          applySessionAccessories(m, host);
          break;
        case 'idle':
          host.__mochiHoldUntil = 0;
          m.setMood('dots');
          m.setBadge(null); // Purple badge GONE on idle!
          m.setAura(null);
          m.setFx(null);
          m.retractHands();
          applySessionAccessories(m, host);
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
          m.setBadge(null);
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
              m.setBadge(null);
              m.setAura(null);
              m.setFx(null);
              m.retractHands();
              applySessionAccessories(m, host);
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
          m.setBadge(null);
          m.triggerHop(0.25);
          m.triggerHandGesture('wave', 1.4);
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          applySessionAccessories(m, host);
          break;
        case 'curious':
        case 'encouraging':
          host.__mochiHoldUntil = 0;
          m.setMood('dots');
          m.setBadge(null);
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          applySessionAccessories(m, host);
          break;
        case 'wake':
          m.setMood('dots');
          m.setBadge(null);
          m.triggerHop(0.22);
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          applySessionAccessories(m, host);
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
        case 'thinking':
          if (typeof m.setThinking === 'function') m.setThinking(true);
          else { m.setBadge('chat_purple'); m.setAura('purple'); }
          break;
        case 'listening':
          m.setMood('dots');
          m.setBadge(null);
          m.setAccessory('headset');
          m.setAura('blue');
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          break;
        case 'reading':
          m.setMood('dots');
          m.setBadge(null);
          m.setAccessory('glasses');
          m.setAura(null);
          break;
        case 'writing':
          m.setMood('dots');
          m.setBadge(null);
          m.setAccessory('pencil');
          m.setAura(null);
          break;
        case 'curious':
        case 'encouraging':
          m.setMood('dots');
          m.setBadge(null);
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          applySessionAccessories(m, host);
          break;
        case 'lesson-start':
        case 'session-start':
        case 'greeting':
        case 'welcome-back':
        case 'onboard':
          m.setMood('dots');
          m.setBadge(null);
          m.triggerHop(0.25);
          m.triggerHandGesture('wave', 1.4);
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
          applySessionAccessories(m, host);
          break;
        case 'sleepy':
          m.setMood('sleepy');
          m.setBadge(null);
          m.setAura(null);
          break;
        case 'idle':
          m.setMood('dots');
          m.setBadge(null);
          m.setFx(null);
          m.retractHands();
          if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(0.9);
          applySessionAccessories(m, host);
          break;
      }
      return ret;
    };

  }

  function releaseHost(host) {
    if (!host) return;
    host.__mochiInstance = null;
    host.__mochiAttached = false;
    host.__mochiHoldUntil = 0;
    try { host.classList.remove('mochi-active'); } catch (_) {}
    var svg = host.querySelector ? host.querySelector('.fz-svg') : null;
    if (svg) {
      svg.style.opacity = '';
      svg.style.display = '';
    }
    var fallbackImg = host.querySelector ? host.querySelector('.fz-vissol-mascot-img') : null;
    if (fallbackImg) {
      fallbackImg.style.opacity = '';
      fallbackImg.style.display = '';
    }
    if (pool.ro) {
      try { pool.ro.unobserve(host); } catch (_) {}
    }
    if (pool.viewport && pool.viewport.parentNode === host) host.removeChild(pool.viewport);
    if (pool.host === host) pool.host = null;
  }

  function mountOn(host) {
    if (pool.host === host && host.__mochiInstance) return;

    // Ensure host has relative positioning so viewport covers it
    host.style.position = 'relative';
    host.style.display = 'block';
    if (host.closest('.fsl-mascot-slot') || host.closest('.jlpt-mascot-slot') || host.classList.contains('jlpt-mascot')) {
      host.style.width = '100%';
      host.style.height = '100%';
    }
    var size = measureHost(host);

    if (!pool.mochi) {
      try {
        createPoolInstance(size);
      } catch (err) {
        // No WebGL here: every host keeps its 2D rig, and we stop retrying on each scan.
        console.warn('[FiezelMochiCompanion] Failed to initialize 3D Mochi:', err);
        pool.failed = true;
        return;
      }
    }

    if (pool.host && pool.host !== host) releaseHost(pool.host);
    if (pool.parkTimer) {
      clearTimeout(pool.parkTimer);
      pool.parkTimer = null;
    }

    var m = pool.mochi;
    host.__mochiAttached = true;
    host.__mochiInstance = m;
    host.__mochiHoldUntil = 0;
    host.classList.add('mochi-active');
    hookHost(host);

    // Hide the 2D SVG or fallback image visually while preserving it in the DOM for a11y & tests
    var svg = host.querySelector('.fz-svg');
    if (svg) {
      svg.style.opacity = '0';
      svg.style.display = 'none';
    }
    var fallbackImg = host.querySelector('.fz-vissol-mascot-img');
    if (fallbackImg) {
      fallbackImg.style.opacity = '0';
      fallbackImg.style.display = 'none';
    }

    host.appendChild(pool.viewport);
    pool.host = host;
    if (pool.ro) pool.ro.observe(host);
    m.updateSize(size.w, size.h);

    // Same entrance a freshly built Mochi used to make on a new host
    try {
      if (m.mood !== 'dots') m.setMood('dots');
      m.setBadge(null); // Purple badge GONE on mount/idle!
      m.setFx(null);
      m.retractHands();
      m.resume();
      if (typeof m.triggerEarWiggle === 'function') m.triggerEarWiggle(1.3);
      applySessionAccessories(m, host);
    } catch (_) {}

    // Re-calibrate size after CSS modal/card pop animations settle (280ms)
    setTimeout(function () {
      try {
        if (pool.host === host && pool.mochi) {
          var r = host.getBoundingClientRect();
          if (r.width > 20 && r.height > 20) {
            pool.mochi.updateSize(Math.round(r.width), Math.round(r.height));
          }
        }
      } catch (_) {}
    }, 280);
  }

  function destroyPool() {
    if (pool.parkTimer) {
      clearTimeout(pool.parkTimer);
      pool.parkTimer = null;
    }
    if (pool.host) releaseHost(pool.host);
    if (pool.ro) {
      try { pool.ro.disconnect(); } catch (_) {}
    }
    if (pool.mochi) {
      try { pool.mochi.destroy(); } catch (_) {}
    }
    pool.mochi = null;
    pool.viewport = null;
    pool.ro = null;
  }

  function park() {
    if (pool.host) releaseHost(pool.host);
    if (!pool.mochi) return;
    pool.mochi.pause();
    if (!pool.parkTimer) pool.parkTimer = setTimeout(destroyPool, PARK_TTL_MS);
  }

  // Judge the slot, not the host: CSS keeps some hosts (.writing-mascot, .path-mascot)
  // display:none until they hold the viewport, so the host alone would never qualify.
  function isRendered(el) {
    return (el.parentElement || el).getClientRects().length > 0;
  }

  // Is host `a` a better home for Mochi than host `b`? Rendered beats display:none, then
  // the most recently discovered host, then the larger one. Ties keep the current host.
  function outranks(a, b) {
    var ra = isRendered(a), rb = isRendered(b);
    if (ra !== rb) return ra;
    // Practice sessions & quiz stages strictly take precedence over the home card
    var aIsHome = a.classList.contains('fz-vissol-mascot-wrap') || !!a.closest('.tactile-welcome-bar');
    var bIsHome = b.classList.contains('fz-vissol-mascot-wrap') || !!b.closest('.tactile-welcome-bar');
    if (aIsHome !== bIsHome) return !aIsHome;
    if (a.__mochiSeen !== b.__mochiSeen) return a.__mochiSeen > b.__mochiSeen;
    return a.offsetWidth * a.offsetHeight > b.offsetWidth * b.offsetHeight;
  }

  function pickHost() {
    var mascots = global.document.querySelectorAll('fiezel-mascot, .fz-vissol-mascot-wrap');
    var stamp = 0;
    var best = (pool.host && pool.host.isConnected) ? pool.host : null;
    for (var i = 0; i < mascots.length; i++) {
      var el = mascots[i];
      if (!el.__mochiSeen) {
        // Hosts that appear in the same scan share a stamp; size breaks the tie.
        if (!stamp) stamp = ++seenSeq;
        el.__mochiSeen = stamp;
      }
      if (el === best || !isPracticeHost(el)) continue;
      if (!best || outranks(el, best)) best = el;
    }
    return best;
  }

  function scanAndAttach() {
    try {
      if (!motionAllowed()) {
        if (pool.mochi) destroyPool();
        return;
      }
      if (!global.FiezelMochi) {
        ensureMochiModule();
        return;
      }
      if (pool.failed) return;
      var best = pickHost();
      if (best) mountOn(best);
      else park();
    } catch (_) {}
  }

  function attachMochi(host) {
    if (!host || !motionAllowed() || !isPracticeHost(host)) return;
    // An explicit attach outranks every host discovered so far.
    host.__mochiSeen = ++seenSeq;
    if (!global.FiezelMochi) {
      ensureMochiModule();
      return;
    }
    if (pool.failed) return;
    try { mountOn(host); } catch (_) {}
  }

  // Load FiezelMochi module if not yet loaded
  var moduleLoading = false;
  function ensureMochiModule() {
    if (global.FiezelMochi) {
      scanAndAttach();
      return;
    }
    if (moduleLoading) return;
    moduleLoading = true;
    var base = '';
    try {
      base = new URL('.', window.location.href).href;
    } catch (_) {
      base = './';
    }
    var candidatePaths = [
      './mochi-mascot/fiezel-mochi.js',
      base + 'mochi-mascot/fiezel-mochi.js',
      new URL('mochi-mascot/fiezel-mochi.js', window.location.href).href,
      '/app/mochi-mascot/fiezel-mochi.js'
    ];
    function tryNext(idx) {
      if (idx >= candidatePaths.length) {
        moduleLoading = false;
        return;
      }
      import(candidatePaths[idx]).then(function (mod) {
        if (mod && mod.FiezelMochi) global.FiezelMochi = mod.FiezelMochi;
        moduleLoading = false;
        scanAndAttach();
      }).catch(function () {
        tryNext(idx + 1);
      });
    }
    tryNext(0);
  }

  // Only a new <fiezel-mascot> or the loss of the current host can change who holds Mochi.
  function needsRescan(mutations) {
    if (pool.host && !pool.host.isConnected) return true;
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      if (!added) continue;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (n.nodeType !== 1) continue;
        if (n.localName === 'fiezel-mascot' ||
            (n.firstElementChild && n.querySelector('fiezel-mascot')) ||
            (n.classList && n.classList.contains('fz-vissol-mascot-wrap')) ||
            (n.firstElementChild && n.querySelector('.fz-vissol-mascot-wrap'))) return true;
      }
    }
    return false;
  }

  function isSplashActive() {
    if (global.__fiezelBootSplashDismissed) return false;
    var sp = global.document.getElementById('fiezelBootSplash') ||
             global.document.querySelector('[data-fiezel-boot-splash]:not([data-fiezel-boot-claimed="disposed"])');
    return !!(sp && sp.parentNode && !sp.classList.contains('is-leaving'));
  }

  function init() {
    function start() {
      ensureMochiModule();

      // One body-wide MutationObserver hands Mochi to new quiz stages and practice panels.
      // It runs before paint, so a re-rendered question never flashes the 2D rig first.
      try {
        var mo = new MutationObserver(function (mutations) {
          if (needsRescan(mutations)) scanAndAttach();
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

    if (isSplashActive()) {
      var started = false;
      var checkTimer = null;
      var fallbackTimer = null;
      function onceStart() {
        if (started) return;
        started = true;
        if (checkTimer) clearInterval(checkTimer);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        start();
      }
      checkTimer = setInterval(function () {
        if (!isSplashActive()) onceStart();
      }, 100);
      try {
        global.addEventListener('fiezel:splash-dismissed', onceStart, { once: true });
      } catch (_) {}
      fallbackTimer = setTimeout(function () {
        if (!isSplashActive()) {
          onceStart();
        } else {
          var safety = setInterval(function () {
            if (!isSplashActive()) {
              clearInterval(safety);
              onceStart();
            }
          }, 200);
        }
      }, 5000);
    } else {
      start();
    }
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Real-time Audio / Speech Watcher: Drives Mochi mouth animation during voice playback
  if (typeof global.setInterval !== 'undefined') {
    global.setInterval(function () {
      try {
        if (!pool.mochi || !pool.host) return;
        var isSpeaking = false;
        if (typeof global.voiceIsSpeaking === 'function') isSpeaking = global.voiceIsSpeaking();
        else if (global.FiezelSpeechBridge && global.FiezelSpeechBridge.speaking && global.FiezelSpeechBridge.speaking()) isSpeaking = true;
        else if (global.FiezelPuterVoice && global.FiezelPuterVoice.status && global.FiezelPuterVoice.status().speaking) isSpeaking = true;

        if (pool._lastSpeaking !== isSpeaking) {
          pool._lastSpeaking = isSpeaking;
          if (typeof pool.mochi.setTalking === 'function') {
            pool.mochi.setTalking(isSpeaking);
          }
        }
      } catch (_) {}
    }, 100);
  }

  global.FiezelMochiCompanion = {
    scan: scanAndAttach,
    attach: attachMochi,
    getInstance: function () { return pool.mochi; },
    setAccessory: function (acc) { if (pool.mochi && typeof pool.mochi.setAccessory === 'function') pool.mochi.setAccessory(acc); },
    setThinking: function (th) { if (pool.mochi && typeof pool.mochi.setThinking === 'function') pool.mochi.setThinking(th); },
    setTalking: function (tk, dur) { if (pool.mochi && typeof pool.mochi.setTalking === 'function') pool.mochi.setTalking(tk, dur); },
    interact: function (idx) { return interactTouch(pool.mochi, idx); },
    getVoiceSequence: function () { return TOUCH_VOICE_STEPS; },
    getCurrentStepIndex: function () { return touchStepIndex; }
  };

})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null));
