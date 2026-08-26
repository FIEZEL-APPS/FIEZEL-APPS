/* FIEZEL website — motion + musik latar (m028-05).
   Aturan: hanya transform/opacity, hormati prefers-reduced-motion, tanpa autoplay.
   Dipakai landing (/) dan /install/ supaya bahasa visualnya satu. */
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

  /* ---------- 3. musik latar: TIDAK autoplay, loop, volume .35, ingat pilihan ---------- */
  var btn = document.getElementById('music-toggle');
  if (btn) {
    var KEY = 'fiezel.web.music';
    var audio = null;
    var playing = false;

    function ensure() {
      if (audio) return audio;
      audio = new Audio(btn.getAttribute('data-src'));
      audio.loop = true;
      audio.volume = 0.35;
      audio.preload = 'none';
      audio.setAttribute('aria-hidden', 'true');
      window.__fzAudio = audio; /* pengait QA otomatis */
      audio.addEventListener('pause', function () { paint(false); });
      audio.addEventListener('play', function () { paint(true); });
      return audio;
    }
    function paint(on) {
      playing = on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Hentikan musik latar' : 'Putar musik latar');
      btn.setAttribute('title', on ? 'Hentikan musik latar' : 'Putar musik latar');
    }
    function start() {
      var a = ensure();
      var p = a.play();
      if (p && p.then) p.then(function () { paint(true); }).catch(function () { paint(false); });
      else paint(true);
    }
    btn.addEventListener('click', function () {
      if (playing) {
        if (audio) audio.pause();
        paint(false);
        try { localStorage.setItem(KEY, 'off'); } catch (e) {}
      } else {
        start();
        try { localStorage.setItem(KEY, 'on'); } catch (e) {}
      }
    });
    paint(false);
    /* Preferensi "on" hanya dipulihkan setelah interaksi pertama pengguna —
       kebijakan browser melarang autoplay tanpa gestur. */
    var pref = null;
    try { pref = localStorage.getItem(KEY); } catch (e2) {}
    if (pref === 'on') {
      var resume = function () {
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
        if (!playing) start();
      };
      document.addEventListener('pointerdown', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    }
  }
})();
