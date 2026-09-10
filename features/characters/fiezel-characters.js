/* FIEZEL Character Universe — runtime (Nusa + Mira).
   Dokumen: docs/FIEZEL-CHARACTER-UNIVERSE.md, docs/FIEZEL-CHARACTER-CONTEXT-MAP.md.
   Lapisan KULIT di atas <fiezel-mascot>: API FiezelPaw (react/setState) tetap satu pintu,
   hanya wajah yang berganti dari rig SVG lama ke ilustrasi Nusa. Tanpa berkas ini rig lama
   tampil apa adanya - tidak ada yang patah. */
(function () {
  'use strict';
  if (typeof self === 'undefined') return;
  var BASE = './assets/characters/';
  var BODY = { w: 4, h: 3 };

  var NUSA_HEAD = {
    idle: 'head-happy', greeting: 'head-happy', curious: 'head-curious', thinking: 'head-thinking',
    listening: 'head-curious', encouraging: 'head-oops', celebrating: 'head-happy', confused: 'head-oops',
    hinting: 'head-thinking', completion: 'head-happy', proud: 'head-happy', sleepy: 'head-thinking',
    sad: 'head-oops', love: 'head-happy', speaking: 'head-happy', 'welcome-back': 'head-happy',
    'lesson-start': 'head-curious', 'level-up': 'head-happy', milestone: 'head-happy'
  };
  var NUSA_FULL = {
    idle: 'full-neutral', greeting: 'full-wave', curious: 'full-neutral', thinking: 'full-thinking',
    listening: 'full-neutral', encouraging: 'full-oops', celebrating: 'full-celebrate', confused: 'full-oops',
    hinting: 'full-thinking', completion: 'full-celebrate', proud: 'full-celebrate', sleepy: 'full-sleep',
    sad: 'full-oops', love: 'full-celebrate', speaking: 'full-wave', 'welcome-back': 'full-wave',
    'lesson-start': 'full-neutral', 'level-up': 'full-celebrate', milestone: 'full-celebrate'
  };
  var MOTION = {
    greeting: 'wave', 'welcome-back': 'wave', speaking: 'wave', celebrating: 'jump', completion: 'jump',
    'level-up': 'jump', milestone: 'jump', proud: 'jump', love: 'jump', encouraging: 'nod', confused: 'shake',
    sad: 'shake', thinking: 'tilt', hinting: 'tilt', curious: 'tilt', 'lesson-start': 'tilt', sleepy: 'breathe',
    idle: 'float', listening: 'float'
  };
  var HEAD_CTX = /coach|strip|quiz-mascot|ring-row|map-note|ob-paw|fz-coach/;

  function src(character, pose, fmt) {
    return BASE + character + '/' + (fmt || 'webp') + '/' + pose + '.' + (fmt || 'webp');
  }
  function picture(character, pose, opts) {
    opts = opts || {};
    var cls = 'fz-char fz-char-' + character + (opts.cls ? ' ' + opts.cls : '');
    var alt = opts.alt == null ? '' : String(opts.alt).replace(/"/g, '&quot;');
    return '<picture class="' + cls + '"' + (opts.testid ? ' data-testid="' + opts.testid + '"' : '') + '>'
      + '<source type="image/webp" srcset="' + src(character, pose) + '">'
      + '<img src="' + src(character, pose, 'png') + '" alt="' + alt + '" loading="' + (opts.eager ? 'eager' : 'lazy') + '" decoding="async"' + (alt ? '' : ' aria-hidden="true"') + '>'
      + '</picture>';
  }
  function scene(name, opts) {
    opts = opts || {};
    var alt = opts.alt == null ? '' : String(opts.alt).replace(/"/g, '&quot;');
    return '<picture class="fz-scene fz-scene-' + name + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.testid ? ' data-testid="' + opts.testid + '"' : '') + '>'
      + '<source type="image/webp" srcset="' + BASE + 'scenes/webp/' + name + '.webp">'
      + '<img src="' + BASE + 'scenes/jpg/' + name + '.jpg" alt="' + alt + '" loading="lazy" decoding="async"' + (alt ? '' : ' aria-hidden="true"') + '>'
      + '</picture>';
  }

  function isHeadContext(el) {
    if (el.dataset.fzVariant) return el.dataset.fzVariant === 'head';
    var node = el, depth = 0;
    while (node && depth < 4) {
      if (HEAD_CTX.test(node.className || '')) return true;
      node = node.parentElement; depth++;
    }
    return false;
  }
  function reduced() {
    try {
      return document.body.classList.contains('reduce-motion') ||
        (matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  function skinInit(el) {
    if (el._fzSkin) return;
    var head = isHeadContext(el);
    var img = document.createElement('img');
    img.className = 'fz-nusa-skin';
    img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.decoding = 'async';
    el.classList.add('fz-skinned', head ? 'fz-skin-head' : 'fz-skin-full');
    el.appendChild(img);
    el._fzSkin = { img: img, head: head, pose: '' };
    skinState(el, el.state || 'idle');
  }
  function skinState(el, state) {
    var s = el._fzSkin; if (!s) return;
    var pose = (s.head ? NUSA_HEAD : NUSA_FULL)[state] || (s.head ? 'head-happy' : 'full-neutral');
    if (pose !== s.pose) { s.pose = pose; s.img.src = src('nusa', pose); }
    var m = reduced() ? '' : (MOTION[state] || '');
    el.className = el.className.replace(/\bfz-m-[a-z]+\b/g, '').replace(/\s{2,}/g, ' ').trim();
    if (m) el.classList.add('fz-m-' + m);
    el.dataset.fzPose = pose;
  }

  function installSkin() {
    var C = (self.customElements && customElements.get('fiezel-mascot'));
    if (!C || C.prototype._fzSkinInstalled) return false;
    var P = C.prototype;
    /* Callback siklus hidup dibekukan saat define() - menambal connectedCallback tidak
       berpengaruh. setState dipanggil dari connectedCallback, jadi ia menjadi pintu init. */
    var oSet = P.setState;
    P.setState = function (name, opts) {
      var ok = oSet.call(this, name, opts);
      if (this._init && !this._fzSkin) skinInit(this);
      else if (ok) skinState(this, name);
      return ok;
    };
    P._fzSkinInstalled = true;
    document.querySelectorAll('fiezel-mascot').forEach(function (el) { if (el._init) { skinInit(el); skinState(el, el.state); } });
    document.documentElement.classList.add('fz-universe');
    return true;
  }

  var API = {
    version: 1,
    src: src, picture: picture, scene: scene,
    nusa: function (pose, opts) { return picture('nusa', pose, opts); },
    mira: function (pose, opts) { return picture('mira', pose, opts); },
    team: function (pose, opts) { return picture('team', pose, opts); },
    headFor: function (state) { return NUSA_HEAD[state] || 'head-happy'; },
    fullFor: function (state) { return NUSA_FULL[state] || 'full-neutral'; },
    poses: { nusa: Object.keys(NUSA_FULL).map(function (k) { return NUSA_FULL[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }),
             mira: ['full-neutral', 'full-wave', 'full-explain', 'full-cheer', 'full-thinking', 'head-happy', 'head-explain', 'head-proud', 'head-thinking'],
             team: ['shoulder-wave', 'highfive', 'teaching', 'hat-peek', 'walking'] },
    scenes: ['hero-landing', 'onboarding', 'celebration', 'empty-offline'],
    installSkin: installSkin,
    preload: function (list) {
      (list || ['head-happy', 'head-curious', 'head-thinking', 'head-oops', 'full-neutral']).forEach(function (p) {
        var i = new Image(); i.src = src('nusa', p);
      });
    }
  };
  self.FiezelCharacters = API;
  if (!installSkin() && self.customElements && customElements.whenDefined) {
    customElements.whenDefined('fiezel-mascot').then(installSkin).catch(function () {});
  }
})();
