/* FIEZEL website — motion + maskot + musik latar (m028-06).
   Aturan: gerak hanya transform/opacity, hormati prefers-reduced-motion.
   Dipakai landing (/) dan /install/ supaya bahasa visualnya satu.
   Musik HANYA hidup di halaman yang memasang <html data-music="..."> (landing);
   /install/ dibiarkan tenang. Tidak ada satu pun elemen UI musik. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = !!(mq && mq.matches);

  /* ---------- 1. reveal on-scroll: fade + rise, stagger per grup ---------- */
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
  } else {
    document.documentElement.classList.add('anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (var j = 0; j < items.length; j++) {
      var el = items[j];
      if (!el.style.getPropertyValue('--i')) {
        var sibs = el.parentNode ? el.parentNode.querySelectorAll(':scope > .reveal') : [];
        var idx = 0;
        for (var k = 0; k < sibs.length; k++) if (sibs[k] === el) { idx = k; break; }
        el.style.setProperty('--i', Math.min(idx, 6));
      }
      io.observe(el);
    }

    /* ---------- 2. parallax lembut pada elemen dekor (transform only) ---------- */
    var pxEls = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (pxEls.length) {
      var ticking = false;
      var run = function () {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        for (var n = 0; n < pxEls.length; n++) {
          var d = parseFloat(pxEls[n].getAttribute('data-parallax')) || 0.06;
          pxEls[n].style.transform = 'translate3d(0,' + (y * d).toFixed(2) + 'px,0)';
        }
        ticking = false;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(run); }
      }, { passive: true });
      run();
    }
  }

  /* ---------- 3. maskot PAW interaktif (komponen features/mascot/fiezel-mascot.js) ----------
     Saat masuk: MELAMBAI (state "greeting"). Lalu bersiklus ekspresi tiap ~6 detik:
     curious -> love -> encouraging -> idle (breathing) -> ulangi.
     Reduced-motion: pose greeting statis, tanpa siklus. */
  var paw = document.querySelector('fiezel-mascot');
  if (paw && window.customElements && customElements.whenDefined) {
    customElements.whenDefined('fiezel-mascot').then(function () {
      if (typeof paw.setState !== 'function') return;
      var CYCLE = ['curious', 'love', 'encouraging', 'idle'];
      var step = 0;
      window.__fzPawState = function () { return paw.state; }; /* pengait QA */
      if (reduce) { paw.setState('greeting', { hold: 0 }); return; }
      paw.setState('greeting', { hold: 2600, then: 'idle' });
      setInterval(function () {
        var next = CYCLE[step % CYCLE.length];
        step++;
        paw.setState(next, next === 'idle' ? { hold: 0 } : { hold: 2600, then: 'idle' });
      }, 6000);
    }).catch(function () {});
  }

  /* ---------- 4. musik latar: OTOMATIS, loop, volume .35, TANPA UI ----------
     Jujur terhadap kebijakan browser: play() dicoba saat load (kadang diizinkan bila
     engagement situs tinggi). Kalau ditolak, musik dimulai pada gestur PERTAMA apa pun
     (pointerdown / keydown / touchstart / scroll) — tanpa tombol, tanpa banner. */
  var msrc = document.documentElement.getAttribute('data-music');
  if (msrc) {
    var audio = new Audio(msrc);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'auto';
    audio.setAttribute('aria-hidden', 'true');
    window.__fzAudio = audio; /* pengait QA otomatis */

    var EVT = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    var armed = false;

    function detach() {
      if (!armed) return;
      armed = false;
      for (var e = 0; e < EVT.length; e++) document.removeEventListener(EVT[e], onGesture, true);
    }
    function attach() {
      if (armed) return;
      armed = true;
      for (var e = 0; e < EVT.length; e++) {
        document.addEventListener(EVT[e], onGesture, { capture: true, passive: true });
      }
    }
    function tryPlay() {
      if (!audio.paused) { detach(); return; }
      var p = audio.play();
      if (p && p.then) p.then(detach).catch(attach);
      else detach();
    }
    function onGesture() { tryPlay(); }

    tryPlay();          /* percobaan autoplay langsung */
    attach();           /* jaring gestur pertama kalau ditolak */

    /* tab kembali fokus: lanjutkan kalau memang sudah pernah jalan */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      if (audio.paused && audio.currentTime > 0) audio.play().catch(function () {});
    });
  }
})();
