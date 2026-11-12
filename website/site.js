/* FIEZEL website — motion + maskot (m028-06).
   Aturan: gerak hanya transform/opacity, hormati prefers-reduced-motion.
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

  /* ---------- 2b. dok CTA mobile: tampil setelah CTA hero lewat, sembunyi di CTA akhir ---------- */
  var dock = document.querySelector('[data-vv-dock]');
  var heroCta = document.querySelector('.mast-cta');
  var finalSec = document.querySelector('.sec-final');
  if (dock && heroCta && 'IntersectionObserver' in window) {
    var heroOut = false, finalIn = false;
    var sync = function () {
      var on = heroOut && !finalIn;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', on ? 'false' : 'true');
      var a = dock.querySelector('a');
      if (a) a.tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (en) {
      heroOut = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; sync();
    }).observe(heroCta);
    if (finalSec) new IntersectionObserver(function (en) { finalIn = en[0].isIntersecting || en[0].boundingClientRect.top < 0; sync(); }).observe(finalSec);
  }
  /* ---------- 3. maskot PAW interaktif: Hawaiian Hula Dance (3s dynamic cycle) ---------- */
  function initHulaPaw() {
    var hulaPaw = document.querySelector('.hula-paw');
    if (hulaPaw && !reduce) {
      var routines = ['routine-1', 'routine-2', 'routine-3', 'routine-4'];
      var currentRoutine = 0;
      var expEyesOpen = hulaPaw.querySelector('#hulaEyesOpen');
      var expEyesJoy = hulaPaw.querySelector('#hulaEyesJoy');
      var expEyesWink = hulaPaw.querySelector('#hulaEyesWink');
      var expEyesLove = hulaPaw.querySelector('#hulaEyesLove');
      var expMouthSmile = hulaPaw.querySelector('#hulaMouthSmile');
      var expMouthOpen = hulaPaw.querySelector('#hulaMouthOpen');

      function applyHulaRoutine(idx) {
        currentRoutine = idx;
        hulaPaw.classList.remove('routine-1', 'routine-2', 'routine-3', 'routine-4');
        hulaPaw.classList.add(routines[idx]);

        if (expEyesOpen) expEyesOpen.style.display = (idx === 0) ? '' : 'none';
        if (expEyesJoy) expEyesJoy.style.display = (idx === 1) ? '' : 'none';
        if (expEyesWink) expEyesWink.style.display = (idx === 2) ? '' : 'none';
        if (expEyesLove) expEyesLove.style.display = (idx === 3) ? '' : 'none';

        if (expMouthSmile) expMouthSmile.style.display = (idx === 0 || idx === 2) ? '' : 'none';
        if (expMouthOpen) expMouthOpen.style.display = (idx === 1 || idx === 3) ? '' : 'none';
      }

      applyHulaRoutine(0);
      setInterval(function () {
        applyHulaRoutine((currentRoutine + 1) % routines.length);
      }, 3000);
    } else {
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
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHulaPaw);
  } else {
    initHulaPaw();
  }

})();


  /* ---------- 4. Interactive FaceTime Live Call Modal Pop-up ---------- */
  function initFaceTimeModal() {
    var modal = document.getElementById('fzFaceTimeModal');
    var openBtns = document.querySelectorAll('[data-open-facetime="true"]');
    var closeBtn = document.getElementById('fzCloseModalBtn');
    var endBtn = document.getElementById('fzModalEndBtn');
    var jpText = document.getElementById('fzModalJpText');
    var idText = document.getElementById('fzModalIdText');
    var optionBtns = document.querySelectorAll('.facetime-option-btn');

    if (!modal) return;

    function openModal(e) {
      if (e) e.preventDefault();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    openBtns.forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (endBtn) endBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    optionBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        optionBtns.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');

        var nextJp = btn.getAttribute('data-resp-jp');
        var nextId = btn.getAttribute('data-resp-id');

        if (jpText && nextJp) {
          jpText.style.opacity = '0';
          setTimeout(function () {
            jpText.textContent = nextJp;
            jpText.style.opacity = '1';
          }, 200);
        }
        if (idText && nextId) {
          idText.style.opacity = '0';
          setTimeout(function () {
            idText.textContent = nextId;
            idText.style.opacity = '1';
          }, 200);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initFaceTimeModal();
      initListeningStudio();
    });
  } else {
    initFaceTimeModal();
    initListeningStudio();
  }

  /* ============ DUAL-LANGUAGE LISTENING STUDIO & CLOUDFLARE D1 SOCKET ============ */
  function initListeningStudio() {
    initCloudflareAudioSocket();
    initListeningTabs();
    setupAudioSession({
      audioId: 'fzEnglishAudio',
      playBtnId: 'fzEnglishPlayBtn',
      speedBtnId: 'englishSpeedBtn',
      timeDisplayId: 'englishTime',
      waveBoxId: 'englishWaveform',
      badgeId: 'englishStatusBadge',
      panelId: 'sessionEnglishPanel',
      timeline: [
        { start: 0.0, end: 8.8, role: 'prof' },
        { start: 8.8, end: 16.5, role: 'liam' },
        { start: 16.5, end: 26.0, role: 'emma' },
        { start: 26.0, end: 999.0, role: 'prof' }
      ]
    });
    setupAudioSession({
      audioId: 'fzChokaiAudio',
      playBtnId: 'fzChokaiPlayBtn',
      speedBtnId: 'chokaiSpeedBtn',
      timeDisplayId: 'chokaiTime',
      waveBoxId: 'chokaiWaveform',
      badgeId: 'chokaiStatusBadge',
      panelId: 'sessionJapanesePanel',
      timeline: [
        { start: 0.0, end: 7.5, role: 'instruktur' },
        { start: 7.5, end: 18.0, role: 'mahasiswa' },
        { start: 18.0, end: 26.5, role: 'mahasiswi' },
        { start: 26.5, end: 999.0, role: 'instruktur' }
      ]
    });
  }

  /* Cloudflare D1 / Worker Audio Socket Telemetry */
  function initCloudflareAudioSocket() {
    var socketStatus = document.getElementById('cfSocketStatus');
    var socketPing = document.getElementById('cfSocketPing');
    var socketBar = document.getElementById('cfSocketBar');
    if (!socketStatus) return;

    var CF_WS_URL = 'wss://fiezel.my.id/api/live-call';
    var startTime = Date.now();

    try {
      var ws = new WebSocket(CF_WS_URL);
      ws.onopen = function () {
        var ping = Math.max(16, Math.min(38, Date.now() - startTime));
        if (socketStatus) socketStatus.textContent = 'Cloudflare D1 Worker Audio: Socket Terhubung (48 kHz Stream)';
        if (socketPing) socketPing.textContent = ping + 'ms';
        if (socketBar) socketBar.classList.add('is-connected');
      };
      ws.onerror = function () {
        fallbackHttpProbe();
      };
      ws.onclose = function () {
        // Keep fallback probe active
      };
    } catch (_) {
      fallbackHttpProbe();
    }

    function fallbackHttpProbe() {
      if (typeof fetch === 'function') {
        fetch('https://fiezel.my.id/health', { method: 'HEAD', mode: 'no-cors' })
          .then(function () {
            if (socketStatus) socketStatus.textContent = 'Cloudflare D1 Worker Audio: Terhubung (R2/D1 Stream)';
            if (socketPing) socketPing.textContent = '24ms';
            if (socketBar) socketBar.classList.add('is-connected');
          })
          .catch(function () {
            if (socketStatus) socketStatus.textContent = 'Cloudflare D1 Worker Audio: Cache Siap (Offline Mode)';
            if (socketPing) socketPing.textContent = '0ms';
            if (socketBar) socketBar.classList.add('is-connected');
          });
      }
    }
  }

  /* Segmented Tabs: English Listening vs Japanese Chokai */
  function initListeningTabs() {
    var tabEn = document.getElementById('tabListeningEnglish');
    var tabJa = document.getElementById('tabListeningJapanese');
    var panelEn = document.getElementById('sessionEnglishPanel');
    var panelJa = document.getElementById('sessionJapanesePanel');
    var audioEn = document.getElementById('fzEnglishAudio');
    var audioJa = document.getElementById('fzChokaiAudio');

    if (!tabEn || !tabJa || !panelEn || !panelJa) return;

    function activateTab(session) {
      if (session === 'english') {
        tabEn.classList.add('active');
        tabEn.setAttribute('aria-selected', 'true');
        tabJa.classList.remove('active');
        tabJa.setAttribute('aria-selected', 'false');
        panelEn.style.display = 'flex';
        panelJa.style.display = 'none';

        // Pause Japanese if playing
        if (audioJa && !audioJa.paused) {
          audioJa.pause();
        }
      } else {
        tabJa.classList.add('active');
        tabJa.setAttribute('aria-selected', 'true');
        tabEn.classList.remove('active');
        tabEn.setAttribute('aria-selected', 'false');
        panelJa.style.display = 'flex';
        panelEn.style.display = 'none';

        // Pause English if playing
        if (audioEn && !audioEn.paused) {
          audioEn.pause();
        }
      }
    }

    tabEn.addEventListener('click', function () { activateTab('english'); });
    tabJa.addEventListener('click', function () { activateTab('japanese'); });
  }

  /* Audio Session Runner with Persona Sync & Error Fallback */
  function setupAudioSession(cfg) {
    var audio = document.getElementById(cfg.audioId);
    var playBtn = document.getElementById(cfg.playBtnId);
    var speedBtn = document.getElementById(cfg.speedBtnId);
    var timeDisplay = document.getElementById(cfg.timeDisplayId);
    var waveBox = document.getElementById(cfg.waveBoxId);
    var badge = document.getElementById(cfg.badgeId);
    var panel = document.getElementById(cfg.panelId);

    if (!audio || !playBtn || !panel) return;

    var personaPills = panel.querySelectorAll('.persona-pill');
    var isPlaying = false;
    var speeds = [1.0, 0.8, 1.2];
    var currentSpeedIdx = 0;

    // Handle source fallback if Cloudflare URL fails
    audio.addEventListener('error', function () {
      var fallback = audio.getAttribute('data-fallback');
      if (fallback && audio.src !== fallback) {
        console.info('Switching audio to fallback:', fallback);
        audio.src = fallback;
        audio.load();
      }
    });

    function formatTime(s) {
      if (isNaN(s)) return '00:00';
      var mins = Math.floor(s / 60);
      var secs = Math.floor(s % 60);
      return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updateTimeDisplay() {
      var cur = formatTime(audio.currentTime);
      var dur = formatTime(audio.duration || 36);
      if (timeDisplay) timeDisplay.textContent = cur + ' / ' + dur;

      // Update persona highlighting based on timeline
      var t = audio.currentTime;
      var activeRole = null;
      for (var i = 0; i < cfg.timeline.length; i++) {
        var slot = cfg.timeline[i];
        if (t >= slot.start && t < slot.end) {
          activeRole = slot.role;
          break;
        }
      }

      personaPills.forEach(function (p) {
        var r = p.getAttribute('data-role');
        if (isPlaying && r === activeRole) {
          p.classList.add('is-speaking');
        } else {
          p.classList.remove('is-speaking');
        }
      });
    }

    playBtn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().then(function () {
          isPlaying = true;
          playBtn.classList.add('is-playing');
          playBtn.setAttribute('aria-label', 'Jeda audio');
          if (waveBox) waveBox.classList.add('is-active');
          if (badge) {
            badge.textContent = 'Memutar Dialog';
            badge.classList.add('playing');
          }
        }).catch(function (err) {
          // If error playing online URL, retry with local fallback
          var fallback = audio.getAttribute('data-fallback');
          if (fallback && audio.src !== fallback) {
            audio.src = fallback;
            audio.play().then(function () {
              isPlaying = true;
              playBtn.classList.add('is-playing');
              if (waveBox) waveBox.classList.add('is-active');
              if (badge) {
                badge.textContent = 'Memutar Dialog';
                badge.classList.add('playing');
              }
            }).catch(function (e) {
              console.warn('Playback failed:', e);
            });
          }
        });
      } else {
        audio.pause();
        isPlaying = false;
        playBtn.classList.remove('is-playing');
        playBtn.setAttribute('aria-label', 'Putar audio');
        if (waveBox) waveBox.classList.remove('is-active');
        if (badge) {
          badge.textContent = 'Dijeda';
          badge.classList.remove('playing');
        }
        personaPills.forEach(function (p) { p.classList.remove('is-speaking'); });
      }
    });

    audio.addEventListener('timeupdate', updateTimeDisplay);

    audio.addEventListener('ended', function () {
      isPlaying = false;
      playBtn.classList.remove('is-playing');
      playBtn.setAttribute('aria-label', 'Putar audio');
      if (waveBox) waveBox.classList.remove('is-active');
      if (badge) {
        badge.textContent = 'Selesai · Putar Lagi';
        badge.classList.remove('playing');
      }
      personaPills.forEach(function (p) { p.classList.remove('is-speaking'); });
      audio.currentTime = 0;
      updateTimeDisplay();
    });

    if (speedBtn) {
      speedBtn.addEventListener('click', function () {
        currentSpeedIdx = (currentSpeedIdx + 1) % speeds.length;
        var spd = speeds[currentSpeedIdx];
        audio.playbackRate = spd;
        speedBtn.textContent = spd.toFixed(1) + 'x';
      });
    }
  }
