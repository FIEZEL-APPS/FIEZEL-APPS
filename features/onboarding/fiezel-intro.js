/**
 * FIEZEL · features/onboarding/fiezel-intro.js — INTRO BARU (m025-300)
 *
 * Lapisan di DEPAN perkenalan lama (fiezel-onboarding.js), tanpa mengubah kontraknya:
 *   Pilih bahasa → 3 slide blok warna (Nusa) → layar Masuk/Daftar → perkenalan lama
 *   (nama/peran → tujuan/level → penempatan) berjalan persis seperti sebelumnya.
 *
 * Cara pasangnya: membungkus FiezelOnboarding.show(). Bila intro sudah selesai (atau
 * perkenalan lama sudah selesai / mode nameOnly), langsung diteruskan ke show() asli.
 * Locale disimpan lewat record yang sama (fiezel-onboarding-v1.locale) supaya show() asli
 * TIDAK menanyakan bahasa dua kali. Akun: FiezelAccount (handle + sandi) & FiezelGoogle
 * dipakai apa adanya — tidak ada endpoint baru.
 */
(function (root) {
  'use strict';
  if (!root || !root.document) return;
  var OB = root.FiezelOnboarding;
  if (!OB || typeof OB.show !== 'function') return;

  var KEY = 'fiezel-intro-v1';
  var OB_KEY = 'fiezel-onboarding-v1';
  var ART = './assets/characters/scenes/intro/';
  var SLIDES = [
    { bg: '#FFD972', ink: '#241A11', img: 'slide-learn.png', title: 'intro.slide1-title', sub: 'intro.slide1-sub' },
    { bg: '#A9E4D7', ink: '#123A33', img: 'slide-listen.png', title: 'intro.slide2-title', sub: 'intro.slide2-sub' },
    { bg: '#FFC8D3', ink: '#3B1520', img: 'slide-level.png', title: 'intro.slide3-title', sub: 'intro.slide3-sub' }
  ];

  function T(key, params) { var i = root.FiezelI18n; return i && typeof i.t === 'function' ? i.t(key, params) : key; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function readJson(k) { try { var v = JSON.parse(root.localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; } }
  function writeJson(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  function introDone() { return readJson(KEY).done === true; }
  function savedLocale() { var l = readJson(OB_KEY).locale; return l === 'id' || l === 'th' ? l : ''; }
  function markLocale(loc) { var r = readJson(OB_KEY); r.locale = loc; writeJson(OB_KEY, r); }
  function reduceMotion() { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } }
  function toast(msg) { try { if (typeof root.showToast === 'function') root.showToast(msg); } catch (_) {} }
  function signedIn() { try { var A = root.FiezelAccount; return !!(A && A.getAccount && A.getAccount()); } catch (_) { return false; } }

  /* ------------------------------------------------------------------ ikon inline */
  var ICON = {
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0 0 13.4 13.4"/><path d="M6.6 6.7C3.9 8.4 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.3-.9"/><path d="M9.9 4.3A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.6 3.5"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    check: '<path d="m5 12 5 5L20 7"/>'
  };
  function icon(name, cls) {
    return '<svg class="fzi-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
  }
  function logo() { return '<span class="fzi-logo" aria-label="FIEZEL">FIEZEL<i>.</i></span>'; }
  function badge() {
    var text = esc(T('intro.badge'));
    return '<div class="fzi-badge" data-testid="intro-badge" aria-hidden="true">'
      + '<svg viewBox="0 0 100 100"><defs><path id="fzi-circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs>'
      + '<text><textPath href="#fzi-circ">' + text + '</textPath></text></svg>'
      + '<img src="./assets/characters/nusa/png@1x/head-happy.png" alt="" decoding="async"></div>';
  }

  /* ------------------------------------------------------------------ markup */
  function langMarkup(busy) {
    function choice(loc, flag, title, sub) {
      return '<button type="button" class="fzi-lang-card" data-fzi-locale="' + loc + '" data-testid="intro-lang-' + loc + '"'
        + (busy === loc ? ' aria-busy="true" disabled' : '') + '>'
        + '<span class="fzi-flag" aria-hidden="true">' + flag + '</span>'
        + '<span class="fzi-lang-copy"><b>' + title + '</b><small>' + sub + '</small></span>'
        + icon('arrow', 'fzi-lang-arrow') + '</button>';
    }
    return '<section class="fzi-screen fzi-lang" data-fzi-screen="language" data-testid="intro-language">'
      + '<header class="fzi-top">' + logo() + '</header>'
      + '<div class="fzi-lang-body">'
      + '<div class="fzi-lang-art"><img src="./assets/characters/nusa/png/head-curious.png" alt="" decoding="async"></div>'
      + '<div class="fzi-lang-sheet">'
      + '<span class="fzi-kicker">Language · Bahasa · <span lang="th">ภาษา</span></span>'
      + '<h1 class="fzi-h1">Choose your language</h1>'
      + '<p class="fzi-sub">Pilih bahasa untuk melanjutkan · <span lang="th">เลือกภาษาเพื่อดำเนินการต่อ</span></p>'
      + '<div class="fzi-lang-grid">'
      + choice('id', '🇮🇩', 'Bahasa Indonesia', 'Indonesia')
      + choice('th', '🇹🇭', '<span lang="th">ภาษาไทย</span>', '<span lang="th">ไทย</span>')
      + '</div>'
      + (busy === 'th' ? '<p class="fzi-note" role="status">Menyiapkan Bahasa Thai · <span lang="th">กำลังเตรียมภาษาไทย…</span></p>' : '')
      + '</div></div>' + '<footer class="fzi-foot fzi-foot-lang">' + badge() + '</footer></section>';
  }

  function slideMarkup(i) {
    var s = SLIDES[i], last = i === SLIDES.length - 1, dots = '';
    for (var d = 0; d < SLIDES.length; d++) {
      dots += '<button type="button" class="fzi-dot' + (d === i ? ' is-on' : '') + '" data-fzi-goto="' + d + '" data-testid="intro-dot-' + d + '" aria-label="' + (d + 1) + '"></button>';
    }
    return '<section class="fzi-screen fzi-slide" data-fzi-screen="slide" data-fzi-index="' + i + '" data-testid="intro-slide-' + i
      + '" style="--fzi-bg:' + s.bg + ';--fzi-ink:' + s.ink + '">'
      + '<header class="fzi-top">' + logo()
      + '<button type="button" class="fzi-skip" data-fzi-skip data-testid="intro-skip">' + esc(T('intro.skip')) + '</button></header>'
      + '<div class="fzi-slide-body">'
      + '<div class="fzi-art"><img src="' + ART + s.img + '" alt="" decoding="async" draggable="false" data-testid="intro-slide-art"></div>'
      + '<div class="fzi-copy"><h1 class="fzi-h1" data-testid="intro-slide-title">' + esc(T(s.title)) + '</h1>'
      + '<p class="fzi-sub" data-testid="intro-slide-sub">' + esc(T(s.sub)) + '</p></div></div>'
      + '<footer class="fzi-foot">' + badge()
      + '<div class="fzi-dots" data-testid="intro-dots">' + dots + '</div>'
      + '<button type="button" class="fzi-next' + (last ? ' is-start' : '') + '" data-fzi-next data-testid="intro-next" aria-label="' + esc(T(last ? 'intro.start' : 'intro.next')) + '">'
      + (last ? '<span>' + esc(T('intro.start')) + '</span>' : '') + icon('arrow') + '</button>'
      + '</footer></section>';
  }

  function field(o) {
    return '<label class="fzi-field"><span>' + esc(o.label) + '</span><div class="fzi-input">' + icon(o.icon)
      + '<input id="' + o.id + '" type="' + o.type + '" placeholder="' + esc(o.ph) + '" autocomplete="' + o.auto + '" autocapitalize="none" spellcheck="false" data-testid="' + o.testid + '"'
      + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + '>'
      + (o.toggle ? '<button type="button" class="fzi-eye" data-fzi-eye="' + o.id + '" aria-label="' + esc(T('intro.auth-show-pw')) + '" data-testid="' + o.testid + '-toggle">' + icon('eye') + '</button>' : '')
      + '</div></label>';
  }

  function authMarkup(tab, error, busy) {
    var login = tab !== 'register';
    var hasAccount = !!(root.FiezelAccount && typeof root.FiezelAccount.login === 'function');
    var G = root.FiezelGoogle, hasGoogle = !!(G && typeof G.available === 'function' && G.available());
    var form = '';
    if (hasAccount) {
      form += '<div class="fzi-tabs" role="tablist">'
        + '<button type="button" role="tab" class="fzi-tab' + (login ? ' is-on' : '') + '" data-fzi-tab="login" data-testid="intro-auth-tab-login" aria-selected="' + login + '">' + esc(T('intro.auth-tab-login')) + '</button>'
        + '<button type="button" role="tab" class="fzi-tab' + (!login ? ' is-on' : '') + '" data-fzi-tab="register" data-testid="intro-auth-tab-register" aria-selected="' + !login + '">' + esc(T('intro.auth-tab-register')) + '</button></div>'
        + '<form class="fzi-form" data-fzi-form novalidate>'
        + field({ id: 'fziHandle', label: T('intro.auth-handle'), icon: 'user', type: 'text', ph: T('intro.auth-handle-ph'), auto: 'username', testid: 'intro-auth-handle', maxlength: 50 })
        + field({ id: 'fziPassword', label: T('intro.auth-password'), icon: 'lock', type: 'password', ph: T('intro.auth-password-ph'), auto: login ? 'current-password' : 'new-password', testid: 'intro-auth-password', toggle: true })
        + (login ? '' : field({ id: 'fziConfirm', label: T('intro.auth-confirm'), icon: 'lock', type: 'password', ph: T('intro.auth-confirm-ph'), auto: 'new-password', testid: 'intro-auth-confirm', toggle: true }))
        + '<p class="fzi-error" role="alert" data-testid="intro-auth-error"' + (error ? '' : ' hidden') + '>' + esc(error || '') + '</p>'
        + '<button type="submit" class="fzi-primary" data-testid="intro-auth-submit"' + (busy ? ' disabled aria-busy="true"' : '') + '>'
        + esc(busy ? T('intro.auth-busy') : T(login ? 'intro.auth-login-btn' : 'intro.auth-register-btn')) + '</button>'
        + '</form>';
    }
    if (hasGoogle) {
      form += '<div class="fzi-or"><span>' + esc(T('intro.auth-or')) + '</span></div>'
        + '<div class="fzi-google" data-fzi-google data-testid="intro-auth-google"></div>'
        + '<p class="fzi-note" data-fzi-google-status role="status"></p>';
    }
    form += '<button type="button" class="fzi-ghost" data-fzi-skip-auth data-testid="intro-auth-skip">' + esc(T('intro.auth-skip')) + '</button>'
      + '<p class="fzi-help">' + esc(T('intro.auth-skip-help')) + '</p>';
    if (hasAccount) {
      form += '<p class="fzi-switch">' + esc(T(login ? 'intro.auth-no-account' : 'intro.auth-have-account')) + ' '
        + '<button type="button" data-fzi-tab="' + (login ? 'register' : 'login') + '" data-testid="intro-auth-switch">' + esc(T(login ? 'intro.auth-signup-link' : 'intro.auth-login-link')) + '</button></p>';
    }
    return '<section class="fzi-screen fzi-auth" data-fzi-screen="auth" data-testid="intro-auth">'
      + '<aside class="fzi-panel" data-testid="intro-auth-panel">' + logo()
      + '<span class="fzi-deco fzi-deco-lines" aria-hidden="true"><i></i><i></i></span>'
      + '<span class="fzi-deco fzi-deco-card" aria-hidden="true"><b></b><b></b><b></b></span>'
      + '<img class="fzi-panel-art" src="' + ART + 'login-wave.png" alt="" decoding="async" draggable="false" data-testid="intro-auth-mascot">'
      + '<p class="fzi-quote">' + esc(T('intro.auth-quote')) + '</p></aside>'
      + '<div class="fzi-auth-main">'
      + '<button type="button" class="fzi-close" data-fzi-skip-auth aria-label="' + esc(T('intro.auth-close')) + '" data-testid="intro-auth-close">' + icon('x') + '</button>'
      + '<div class="fzi-auth-card">'
      + '<h1 class="fzi-h1 fzi-auth-title" data-testid="intro-auth-title">' + esc(T(login ? 'intro.auth-login-title' : 'intro.auth-register-title')) + '</h1>'
      + '<p class="fzi-sub">' + esc(T(login ? 'intro.auth-login-sub' : 'intro.auth-register-sub')) + '</p>'
      + form + '</div></div></section>';
  }

  /* ------------------------------------------------------------------ alur */
  function showIntro(env, opts, next) {
    var doc = root.document;
    var host = doc.createElement('div');
    host.className = 'fiezel-ob fz-intro' + (reduceMotion() ? ' fiezel-ob-still' : '');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'FIEZEL');
    host.setAttribute('data-testid', 'intro-root');
    var askLocale = typeof opts.onLocale === 'function' && !savedLocale();
    var screen = askLocale ? 'language' : 'slide';
    var index = 0, tab = 'login', error = '', busy = false, localeBusy = '', closed = false;
    var dragX = null;

    function paint(dir) {
      var html = screen === 'language' ? langMarkup(localeBusy)
        : screen === 'slide' ? slideMarkup(index) : authMarkup(tab, error, busy);
      host.innerHTML = html;
      var el = host.firstElementChild;
      if (el && dir) el.classList.add(dir > 0 ? 'is-in-right' : 'is-in-left');
      host.style.setProperty('--fzi-page-bg', screen === 'slide' ? SLIDES[index].bg : screen === 'auth' ? '#FFFFFF' : '#FFF4E3');
      if (screen === 'auth') mountGoogle();
      var focus = host.querySelector('[data-fzi-next],[data-fzi-locale],#fziHandle');
      if (focus && screen !== 'auth') { try { focus.focus({ preventScroll: true }); } catch (_) {} }
    }

    function finish() {
      if (closed) return; closed = true;
      writeJson(KEY, { done: true, at: Date.now() });
      host.classList.add('is-leaving');
      root.setTimeout(function () {
        try { host.remove(); } catch (_) {}
        try { next(); } catch (_) {}
      }, reduceMotion() ? 0 : 280);
    }

    function pickLocale(loc) {
      if (localeBusy) return;
      var chosen = loc;
      try { var r = opts.onLocale({ locale: loc }); if (r === 'id' || r === 'th') chosen = r; } catch (_) {}
      markLocale(chosen);
      var I = root.FiezelI18n;
      if (chosen === 'th' && I && typeof I.whenAvailable === 'function' && !(I.hasCopy && I.hasCopy('th', 'intro.slide1-title'))) {
        localeBusy = 'th'; paint();
        var settled = false;
        function go() { if (settled) return; settled = true; localeBusy = ''; screen = 'slide'; index = 0; paint(1); }
        I.whenAvailable('th', 'intro.slide1-title').then(go);
        root.setTimeout(go, 4000);
        return;
      }
      screen = 'slide'; index = 0; paint(1);
    }

    function toAuth() {
      if (signedIn()) return finish();
      screen = 'auth'; error = ''; busy = false; paint(1);
    }

    function goSlide(n) {
      if (n >= SLIDES.length) return toAuth();
      if (n < 0) return;
      var dir = n > index ? 1 : -1; index = n; paint(dir);
    }

    async function mountGoogle() {
      var slot = host.querySelector('[data-fzi-google]');
      var status = host.querySelector('[data-fzi-google-status]');
      var G = root.FiezelGoogle;
      if (!slot || !G || typeof G.renderButton !== 'function') return;
      var res = await G.renderButton(slot, function (r) {
        if (r && r.ok) { toast(T('google.toast-berhasil')); return finish(); }
        if (status) status.textContent = (r && r.message) || T('google.gagal');
      });
      if (status && !(res && res.ok)) status.textContent = (res && res.message) || T('google.gagal-muat');
    }

    async function submit() {
      if (busy) return;
      var A = root.FiezelAccount; if (!A) return finish();
      var handle = (host.querySelector('#fziHandle') || {}).value || '';
      var password = (host.querySelector('#fziPassword') || {}).value || '';
      var confirm = host.querySelector('#fziConfirm');
      busy = true; error = ''; paint();
      var res;
      try {
        res = tab === 'register'
          ? await A.register({ handle: handle, password: password, confirmPassword: confirm ? confirm.value : undefined })
          : await A.login({ handle: handle, password: password });
      } catch (_) { res = null; }
      busy = false;
      if (res && res.ok) {
        var h = (res.account && res.account.handle) || handle;
        toast(T(tab === 'register' ? 'intro.auth-toast-register' : 'intro.auth-toast-login', { handle: h }));
        return finish();
      }
      error = (res && res.message) || T(tab === 'register' ? 'intro.auth-fail-register' : 'intro.auth-fail-login');
      paint();
      var again = host.querySelector('#fziHandle'); if (again) { again.value = handle; }
      var pw = host.querySelector('#fziPassword'); if (pw) pw.value = password;
    }

    host.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-fzi-locale],[data-fzi-next],[data-fzi-skip],[data-fzi-goto],[data-fzi-tab],[data-fzi-eye],[data-fzi-skip-auth]') : null;
      if (!t) return;
      if (t.hasAttribute('data-fzi-locale')) return pickLocale(t.getAttribute('data-fzi-locale'));
      if (t.hasAttribute('data-fzi-next')) return goSlide(index + 1);
      if (t.hasAttribute('data-fzi-skip')) return toAuth();
      if (t.hasAttribute('data-fzi-goto')) return goSlide(Number(t.getAttribute('data-fzi-goto')));
      if (t.hasAttribute('data-fzi-tab')) { tab = t.getAttribute('data-fzi-tab'); error = ''; paint(); return; }
      if (t.hasAttribute('data-fzi-skip-auth')) return finish();
      if (t.hasAttribute('data-fzi-eye')) {
        var inp = host.querySelector('#' + t.getAttribute('data-fzi-eye'));
        if (!inp) return;
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        t.innerHTML = icon(show ? 'eyeOff' : 'eye');
        t.setAttribute('aria-label', T(show ? 'intro.auth-hide-pw' : 'intro.auth-show-pw'));
      }
    });
    host.addEventListener('submit', function (e) { if (e.target.hasAttribute('data-fzi-form')) { e.preventDefault(); submit(); } });
    host.addEventListener('keydown', function (e) {
      if (screen !== 'slide') return;
      if (e.key === 'ArrowRight') goSlide(index + 1);
      else if (e.key === 'ArrowLeft') goSlide(index - 1);
    });
    host.addEventListener('pointerdown', function (e) { if (screen === 'slide' && e.isPrimary) dragX = e.clientX; });
    host.addEventListener('pointerup', function (e) {
      if (dragX == null || screen !== 'slide') return;
      var dx = e.clientX - dragX; dragX = null;
      if (dx < -60) goSlide(index + 1); else if (dx > 60) goSlide(index - 1);
    });
    host.addEventListener('pointercancel', function () { dragX = null; });

    paint();
    (doc.body || doc.documentElement).appendChild(host);
    return { shown: true, reason: 'intro' };
  }

  var original = OB.show;
  OB.show = function (env, options) {
    var opts = options || {};
    if (opts.nameOnly === true || introDone() || readJson(OB_KEY).done === true) return original.call(OB, env, options);
    return showIntro(env, opts, function () { return original.call(OB, env, options); });
  };
  root.FiezelIntro = Object.freeze({
    reset: function () { try { root.localStorage.removeItem(KEY); } catch (_) {} },
    done: introDone,
    SLIDES: SLIDES
  });
}(typeof self !== 'undefined' ? self : this));
