/**
 * FIEZEL — ekor boot: pendaftaran service worker.
 *
 * Berkas ini dimuat ber-`defer` sesudah app.js; urutannya dijaga tests/boot-order-test.js.
 * Dulu ia juga menyuntikkan baris "Mode gelap" ke Pengaturan dengan membungkus
 * window.openSettings. m025-134 menghapus mode gelap, jadi pembungkus itu ikut hilang
 * dan yang tersisa hanyalah pendaftaran service worker.
 *
 * Isinya tetap dibungkus IIFE: berkas lepas bisa termuat dua kali (mis. dipulihkan dari
 * cache lama), dan pengikatan `const` global yang sama dua kali adalah SyntaxError yang
 * mematikan boot.
 */
(function () {
  'use strict';

  var isLocal = typeof location !== 'undefined' && (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '0.0.0.0' ||
    location.hostname.startsWith('192.168.') ||
    location.hostname.startsWith('10.') ||
    location.hostname.endsWith('.local') ||
    location.port === '3000' ||
    location.port === '3005'
  );

  try {
    if (typeof window !== 'undefined' && window.location && window.location.search && /(?:[?&])(?:fz_upd|fz_healed|__fz_fresh)=/i.test(window.location.search) && window.history && typeof window.history.replaceState === 'function') {
      var cleanQsBoot = window.location.search.replace(/^\?/, '').split('&').filter(function (p) {
        return p && !/^(?:fz_upd|fz_healed|__fz_fresh)=/i.test(p);
      });
      var nextHrefBoot = window.location.pathname + (cleanQsBoot.length ? ('?' + cleanQsBoot.join('&')) : '') + (window.location.hash || '');
      window.history.replaceState(null, '', nextHrefBoot);
    }
  } catch (_) {}

  if ('serviceWorker' in navigator) {
    if (isLocal) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        for (var i = 0; i < regs.length; i++) {
          try { regs[i].unregister(); } catch (_) {}
        }
      }).catch(function () {});
      if (typeof caches !== 'undefined') {
        caches.keys().then(function (keys) {
          for (var i = 0; i < keys.length; i++) {
            try { caches.delete(keys[i]); } catch (_) {}
          }
        }).catch(function () {});
      }
    } else {
      var parseBuildNum = function (v) {
        var m = String(v == null ? '' : v).match(/(?:^|fiezel-shell-)m(\d+)-(\d+)/i);
        return m ? (parseInt(m[1], 10) * 100000 + parseInt(m[2], 10)) : null;
      };
      var pingControllerRev = function () {
        return new Promise(function (resolve) {
          try {
            var ctrl = navigator.serviceWorker && navigator.serviceWorker.controller;
            if (!ctrl || typeof MessageChannel === 'undefined') { resolve(''); return; }
            var ch = new MessageChannel();
            var done = false;
            var finish = function (v) { if (done) return; done = true; resolve(String(v || '')); };
            ch.port1.onmessage = function (e) { finish(e && e.data && e.data.swRev); };
            setTimeout(function () { finish(''); }, 900);
            ctrl.postMessage({ type: 'FIEZEL_HEALTH_PING' }, [ch.port2]);
          } catch (_) { resolve(''); }
        });
      };
      var sweepStaleShellCaches = function () {
        if (typeof caches === 'undefined' || typeof caches.keys !== 'function') return;
        var pageBuild = String(self.FIEZEL_PAGE_BUILD || '');
        var pageNum = parseBuildNum(pageBuild);
        var htmlMeta = (typeof document !== 'undefined' && document.querySelector) ? document.querySelector('meta[name="fz-build"]') : null;
        var htmlBuild = htmlMeta ? (htmlMeta.getAttribute('content') || '') : String(self.FIEZEL_HTML_BUILD || '');
        var htmlNum = parseBuildNum(htmlBuild);
        var effectiveBuild = (htmlNum !== null && (pageNum === null || htmlNum >= pageNum)) ? htmlBuild : pageBuild;
        var effectiveNum = parseBuildNum(effectiveBuild);
        // Pemulihan instan jika dokumen HTML dan JS/core-config berselisih versi (Frankenstein cache)
        if (htmlNum !== null && pageNum !== null && htmlNum !== pageNum) {
          try {
            var splitKey = 'fiezel-split-healed-' + htmlBuild;
            if (sessionStorage.getItem(splitKey) !== '1') {
              sessionStorage.setItem(splitKey, '1');
              if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
                caches.keys().then(function (cKeys) {
                  return Promise.all(cKeys.map(function (k) {
                    var n = parseBuildNum(k);
                    if (n !== null && n < htmlNum) return caches.delete(k);
                    return Promise.resolve();
                  }));
                }).catch(function () {});
              }
            }
          } catch (_) {}
        }
        try {
          if (effectiveBuild && typeof localStorage !== 'undefined' && localStorage.getItem('fz_boot_clean_build') !== effectiveBuild) {
            localStorage.setItem('fz_boot_clean_build', effectiveBuild);
            if (self.FiezelOfflineVault && typeof self.FiezelOfflineVault.purgeStaleBuilds === 'function') {
              self.FiezelOfflineVault.purgeStaleBuilds(effectiveBuild);
            }
            caches.keys().then(function (allNames) {
              allNames.forEach(function (nm) {
                if (nm.indexOf('fiezel-v') === 0) {
                  caches.open(nm).then(function (rc) {
                    return rc.keys().then(function (reqs) {
                      reqs.forEach(function (rq) {
                        var u = (rq && rq.url) ? rq.url : String(rq || '');
                        if (u.indexOf('/vendor/') === -1) {
                          try { rc.delete(rq); } catch (_) {}
                        }
                      });
                    });
                  }).catch(function () {});
                }
              });
            }).catch(function () {});
          }
        } catch (_) {}
        pingControllerRev().then(function (activeRev) {
          var activeNum = parseBuildNum(activeRev);
          var activeShellName = activeRev ? ('fiezel-shell-' + activeRev) : '';
          var keepMinNum = (activeNum !== null && effectiveNum !== null)
            ? Math.max(activeNum, effectiveNum)
            : (activeNum !== null ? activeNum : effectiveNum);
          caches.keys().then(function (names) {
            for (var i = 0; i < names.length; i++) {
              var name = names[i];
              if (name.indexOf('fiezel-shell-') === 0) {
                if (activeShellName && name === activeShellName) continue;
                var nNum = parseBuildNum(name);
                // Jangan pernah menghapus cangkang rilis baru (> keepMinNum) yang sedang di-precache worker waiting/installing
                if (nNum !== null && keepMinNum !== null && nNum >= keepMinNum && (!activeShellName || nNum > activeNum)) continue;
                if (nNum !== null && keepMinNum !== null && nNum < keepMinNum) {
                  try { caches.delete(name); } catch (_) {}
                }
              }
            }
            // Deteksi cangkang aktif yang tercemar aset HTTP disk cache lama di iOS WebKit:
            // periksa core-config.js DAN fiezel-diag-panel.js terhadap activeNum.
            if (activeShellName && activeNum !== null && typeof caches.open === 'function') {
              caches.open(activeShellName).then(function (c) {
                return Promise.all([
                  c.match('./core-config.js').then(function (r) { return r ? r.text() : ''; }).catch(function () { return ''; }),
                  c.match('./features/neural-voice/fiezel-diag-panel.js').then(function (r) { return r ? r.text() : ''; }).catch(function () { return ''; })
                ]);
              }).then(function (texts) {
                var cfgTxt = (texts && texts[0]) || '';
                var diagTxt = (texts && texts[1]) || '';
                var mCfg = cfgTxt.match(/FIEZEL_PAGE_BUILD\s*=\s*[\x22\x27](m\d+-\d+)[\x22\x27]/i);
                var mDiag = diagTxt.match(/DIAG_BUILD\s*=\s*[\x22\x27](m\d+-\d+)[\x22\x27]/i);
                var cfgNum = mCfg ? parseBuildNum(mCfg[1]) : null;
                var diagNum = mDiag ? parseBuildNum(mDiag[1]) : null;
                if ((cfgNum !== null && cfgNum < activeNum) || (diagNum !== null && diagNum < activeNum)) {
                  caches.delete(activeShellName).then(function () {
                    return pingControllerRev();
                  }).catch(function () {});
                }
              }).catch(function () {});
            }
          }).catch(function () {});
          // Pemulihan split-brain dua arah:
          // (A) activeNum > effectiveNum: controller SW sudah lebih baru daripada dokumen memori iOS PWA.
          // (B) activeNum < pageNum || activeNum < effectiveNum: dokumen sudah memuat penanda build baru sementara controller SW lama masih menempel.
          if (activeNum !== null && effectiveNum !== null && activeNum > effectiveNum) {
            try {
              var stage = self.FiezelStage;
              var inLesson = !!(stage && typeof stage.lessonMode === 'function' && stage.lessonMode() === true);
              var healedKey = 'fiezel-healed-rev';
              var alreadyHealed = sessionStorage.getItem(healedKey) === activeRev;
              if (!inLesson && !alreadyHealed) {
                sessionStorage.setItem(healedKey, activeRev);
                var bustUrl = window.location.pathname + '?fz_healed=' + Date.now() + window.location.hash;
                try {
                  window.location.replace(bustUrl);
                } catch (_) {
                  location.reload();
                }
              } else if (inLesson) {
                self.FiezelUpdatePrompt?.check?.(true);
              }
            } catch (_) {}
          } else if (activeNum !== null && effectiveNum !== null && (activeNum < effectiveNum || activeNum < pageNum)) {
            try {
              var stageB = self.FiezelStage;
              var inLessonB = !!(stageB && typeof stageB.lessonMode === 'function' && stageB.lessonMode() === true);
              var promKey = 'fiezel-promoted-for';
              if (!inLessonB && sessionStorage.getItem(promKey) !== effectiveBuild && navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration === 'function') {
                navigator.serviceWorker.getRegistration().then(function (reg) {
                  if (!reg) return;
                  var doPromote = function (w) {
                    if (!w || sessionStorage.getItem(promKey) === effectiveBuild) return;
                    sessionStorage.setItem(promKey, effectiveBuild);
                    var onCtrl = function () {
                      navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
                      var bustB = window.location.pathname + '?fz_healed=' + Date.now() + window.location.hash;
                      try { window.location.replace(bustB); } catch (_) { location.reload(); }
                    };
                    navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
                    try { w.postMessage({ type: 'FIEZEL_SKIP_WAITING' }); } catch (_) {}
                  };
                  if (reg.waiting) {
                    doPromote(reg.waiting);
                  } else if (typeof reg.update === 'function') {
                    reg.update().then(function () {
                      if (reg.waiting) doPromote(reg.waiting);
                    }).catch(function () {});
                  }
                }).catch(function () {});
              }
            } catch (_) {}
          }
        }).catch(function () {});
      };
      var isCurtainActive = function () {
        try {
          var stage = self.FiezelStage;
          var inLesson = !!(stage && typeof stage.lessonMode === 'function' && stage.lessonMode() === true);
          if (inLesson) return false;
          var splash = document.getElementById('fiezelBootSplash');
          if (!splash) return false;
          var style = window.getComputedStyle ? window.getComputedStyle(splash) : null;
          if (style && style.display === 'none') return false;
          if (splash.classList && splash.classList.contains('fz-fade-out')) return false;
          return true;
        } catch (_) {
          return false;
        }
      };
      var maybeAutoPromoteUnderCurtain = function (reg) {
        if (!reg || !reg.waiting) return false;
        var curtain = isCurtainActive();
        var hidden = (typeof document !== 'undefined' && document.visibilityState === 'hidden');
        if (!curtain && !hidden) return false;
        try {
          var stage = self.FiezelStage;
          var inLesson = !!(stage && typeof stage.lessonMode === 'function' && stage.lessonMode() === true);
          if (inLesson) return false;
          var promKey = 'fiezel-promoted-waiting';
          if (sessionStorage.getItem(promKey) === '1') return false;
          sessionStorage.setItem(promKey, '1');
          var onCtrl = function () {
            navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
            var bust = window.location.pathname + '?fz_cutover=' + Date.now() + window.location.hash;
            try { window.location.replace(bust); } catch (_) { location.reload(); }
          };
          navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
          try { reg.waiting.postMessage({ type: 'FIEZEL_SKIP_WAITING' }); } catch (_) {}
          return true;
        } catch (_) {
          return false;
        }
      };
      var checkSwUpdateNow = function () {
        sweepStaleShellCaches();
        try {
          if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration === 'function') {
            navigator.serviceWorker.getRegistration().then(function (reg) {
              if (reg && typeof reg.update === 'function') {
                reg.update().then(function () {
                  try {
                    if (!maybeAutoPromoteUnderCurtain(reg)) {
                      self.FiezelUpdatePrompt?.check?.(true);
                    }
                  } catch (_) {}
                }).catch(function () {});
              }
            }).catch(function () {});
          }
          self.FiezelUpdatePrompt?.check?.(true);
        } catch (_) {}
      };
      sweepStaleShellCaches();
      window.addEventListener('pageshow', function (ev) {
        if (ev && ev.persisted) checkSwUpdateNow();
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          checkSwUpdateNow();
        } else if (document.visibilityState === 'hidden') {
          try {
            if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration === 'function') {
              navigator.serviceWorker.getRegistration().then(function (reg) {
                if (reg && reg.waiting) maybeAutoPromoteUnderCurtain(reg);
              }).catch(function () {});
            }
          } catch (_) {}
        }
      });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (reg) {
        if (reg) {
          if (reg.waiting) {
            if (!maybeAutoPromoteUnderCurtain(reg)) {
              try { self.FiezelUpdatePrompt?.check?.(true); } catch (_) {}
            }
          } else {
            try { self.FiezelUpdatePrompt?.check?.(true); } catch (_) {}
          }
          reg.addEventListener('updatefound', function () {
            var worker = reg.installing;
            if (!worker) return;
            worker.addEventListener('statechange', function () {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                if (!maybeAutoPromoteUnderCurtain(reg)) {
                  try { self.FiezelUpdatePrompt?.check?.(true); } catch (_) {}
                }
              }
            });
          });
          setTimeout(function () {
            try {
              reg.update().then(function () {
                try {
                  if (!maybeAutoPromoteUnderCurtain(reg)) {
                    self.FiezelUpdatePrompt?.check?.(false);
                  }
                } catch (_) {}
              }).catch(function () {});
            } catch (_) {}
          }, 2000);
        }
      }).catch(function () {});
    }
  }
}());

/**
 * m025-132 kelahiran wordmark topbar.
 *
 * BUG m025-131, dan bentuknya patut dicatat: animasinya berjalan sempurna, hanya saja
 * tidak ada seorang pun yang bisa melihatnya. Ia dipicu 60 ms setelah DOM siap dan
 * selesai pada ~1.160 ms, sementara splash boot menutupi seluruh layar selama 3.400 ms.
 * Jadi ledakan itu memang terjadi - di balik tirai.
 *
 * Ini kelas kesalahan yang tidak akan pernah ditangkap tes statis dan tidak akan pernah
 * dilaporkan sebagai galat: tidak ada yang gagal. Yang salah cuma WAKTUNYA, dan waktu
 * hanya terlihat oleh mata di perangkat sungguhan.
 *
 * Pemicunya kini kepergian splash itu sendiri, bukan jam. Kalau splash-nya memang tidak
 * pernah muncul (sudah disapa hari ini), pengamatnya menyerah setelah tenggat dan tetap
 * menjalankan kelahirannya - lebih baik terlambat daripada tidak pernah.
 */
(function () {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return;

  var fired = false;
  function birth() {
    if (fired) return;
    fired = true;
    var mark = doc.getElementById('fzTopMark');
    if (!mark) return;
    mark.classList.add('is-mark-born');
    setTimeout(function () { mark.classList.remove('is-mark-born'); }, 1100);
  }

  /** Splash sudah pergi bila kelas boot dilepas DAN elemennya tidak lagi di halaman. */
  function curtainGone() {
    if (doc.documentElement && doc.documentElement.classList.contains('fz-booting')) return false;
    var splash = doc.getElementById('fiezelBootSplash');
    return !splash || splash.classList.contains('is-leaving');
  }

  function readyForBirth() {
    if (!curtainGone()) return false;
    // Topbar disembunyikan sampai fz-app-open aktif (fiezel-tactile-clay.css §16).
    // Menjalankan animasi kelahiran sebelum fz-app-open berarti animasi terbuang di balik visibility:hidden.
    return !!(doc.documentElement && doc.documentElement.classList.contains('fz-app-open'));
  }

  function watch() {
    if (readyForBirth()) { setTimeout(birth, 120); return; }
    var stop = null;
    try {
      var obs = new MutationObserver(function () {
        if (!readyForBirth()) return;
        obs.disconnect();
        if (stop) clearTimeout(stop);
        // Jeda pendek supaya kelahiran mulai SESUDAH splash benar-benar memudar, bukan
        // bertumpuk dengan animasi perginya.
        setTimeout(birth, 200);
      });
      obs.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });
      obs.observe(doc.body || doc.documentElement, { childList: true, subtree: false });
      // Tenggat. Kalau splash-nya tidak pernah ada, tidak ada mutasi yang akan datang.
      stop = setTimeout(function () { try { obs.disconnect(); } catch (_) {} birth(); }, 5000);
    } catch (_) { setTimeout(birth, 3600); }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watch, { once: true });
  else watch();
}());
