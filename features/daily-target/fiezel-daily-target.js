/**
 * m025-42 mandatory daily target.
 *
 * OWNER: once the learner has notifications on, has completed the test, and therefore has
 * a FIEZEL-assessed daily target, opening the app must drop them straight into that
 * target. No navigation, no home screen, until the target is done.
 *
 * What this layer can and cannot enforce - stated here because the difference matters:
 *
 *   CAN: block every in-app destination, block the in-app back gesture (history), keep
 *        the lock across reloads and across returning from the background, and re-arm the
 *        instant a session is abandoned.
 *   CANNOT: stop the iOS home-screen swipe or the app switcher. No web API on any browser
 *        can intercept those, and a PWA has no entitlement that changes it. What the app
 *        can do is make sure leaving buys nothing: the lock is re-evaluated on every
 *        return, so the target is still there.
 *
 * The target itself is derived from the learner's own evidence, never a fixed number:
 * the adaptive session size FIEZEL would choose, plus the reviews that are actually due.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelDailyTarget = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-daily-target-v1';
  // Floor and ceiling on a day's work. Below the floor the target is not worth locking
  // for; above the ceiling it stops being a daily habit and becomes a punishment.
  var MIN_TARGET = 8;
  var MAX_TARGET = 20;
  var MAX_REVIEW_SHARE = 8;

  /**
   * The day's target, derived from evidence.
   * @param {{sessionSize?:number, dueReviews?:number, adaptiveReady?:boolean}} snapshot
   */
  function targetFor(snapshot) {
    var s = snapshot || {};
    var session = Number(s.sessionSize) > 0 ? Math.round(Number(s.sessionSize)) : 12;
    var reviews = Math.min(MAX_REVIEW_SHARE, Math.max(0, Math.round(Number(s.dueReviews) || 0)));
    return Math.min(MAX_TARGET, Math.max(MIN_TARGET, session + reviews));
  }

  /**
   * Whether the app must be locked, and what to show.
   * Locking requires ALL of OWNER's three conditions, so a learner who has not been
   * assessed yet, or who never enabled notifications, is never trapped.
   */
  function evaluate(snapshot) {
    var s = snapshot || {};
    var total = targetFor(s);
    var done = Math.max(0, Math.round(Number(s.todayAttempts) || 0));
    var qualifies = !!s.notificationsGranted && !!s.placementDone;
    var met = done >= total;
    return Object.freeze({
      schema: SCHEMA,
      qualifies: qualifies,
      total: total,
      done: Math.min(done, total),
      remaining: Math.max(0, total - done),
      met: met,
      // A locked app is the exception, so every condition is spelled out rather than
      // collapsed into one boolean nobody can debug later.
      locked: qualifies && !met
    });
  }

  function install(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target || !target.document || target.__fiezelDailyTargetInstalled) return false;
    target.__fiezelDailyTargetInstalled = true;

    var doc = target.document;
    var armed = false;
    var working = false;
    var timer = null;

    function notificationsGranted() {
      try { return target.Notification && target.Notification.permission === 'granted'; }
      catch (_) { return false; }
    }

    function snapshot() {
      var state = null;
      try { state = target.__getFiezelState ? target.__getFiezelState() : null; } catch (_) {}
      if (!state) return { notificationsGranted: false, placementDone: false };
      var due = 0;
      try { due = typeof target.__fiezelDueReviews === 'function' ? Number(target.__fiezelDueReviews()) || 0 : 0; } catch (_) {}
      var session = 0;
      try {
        var policy = typeof target.buildAdaptivePolicy === 'function' ? target.buildAdaptivePolicy() : null;
        session = Number(policy && policy.sessionSize) || 0;
      } catch (_) {}
      var today = '';
      try { today = typeof target.studyDayKey === 'function' ? target.studyDayKey() : ''; } catch (_) {}
      var daily = state.daily || {};
      return {
        notificationsGranted: notificationsGranted(),
        placementDone: !!state.placementDone,
        adaptiveReady: !!state.adaptiveReady,
        // A stale day counter must read as zero, or yesterday's work would satisfy today.
        todayAttempts: (!today || daily.date === today) ? Number(daily.attempts) || 0 : 0,
        dueReviews: due,
        sessionSize: session
      };
    }

    function status() { return evaluate(snapshot()); }

    function panelMarkup(st) {
      var percent = st.total ? Math.min(100, Math.round((st.done / st.total) * 100)) : 0;
      return '<div class="daily-lock-panel">' +
        '<div class="daily-lock-mark">TARGET HARIAN FIEZEL · WAJIB</div>' +
        '<h2>Target hari ini belum selesai</h2>' +
        '<p>FIEZEL menilai kamu perlu <b>' + st.total + ' soal</b> hari ini. Sisa <b>' + st.remaining + '</b> lagi. Aplikasi terbuka penuh setelah target beres.</p>' +
        '<div class="daily-lock-track"><span style="width:' + percent + '%"></span></div>' +
        '<p class="daily-lock-count">' + st.done + ' / ' + st.total + ' soal</p>' +
        '<button type="button" class="primary wide" id="dailyLockStart">Kerjakan sekarang</button>' +
        '<p class="daily-lock-note">Keluar dari aplikasi tidak menghapus target. Saat kembali, target ini masih menunggu.</p>' +
        '</div>';
    }

    function open() {
      var st = status();
      var existing = doc.getElementById('dailyLock');
      if (existing) existing.innerHTML = panelMarkup(st);
      else {
        var node = doc.createElement('div');
        node.id = 'dailyLock';
        node.className = 'daily-lock';
        node.setAttribute('role', 'dialog');
        node.setAttribute('aria-modal', 'true');
        node.setAttribute('aria-label', 'Target harian FIEZEL');
        node.innerHTML = panelMarkup(st);
        doc.body.appendChild(node);
      }
      if (doc.body && doc.body.classList) doc.body.classList.add('daily-locked');
      var start = doc.getElementById('dailyLockStart');
      if (start) start.addEventListener('click', beginWork);
      try { if (target.lucide && target.lucide.createIcons) target.lucide.createIcons(); } catch (_) {}
    }

    function close() {
      var node = doc.getElementById('dailyLock');
      if (node && node.remove) node.remove();
      if (doc.body && doc.body.classList) doc.body.classList.remove('daily-locked');
    }

    /** The learner is inside the target session: the sheet hides, the lock stays armed. */
    function beginWork() {
      working = true;
      close();
      try {
        var state = target.__getFiezelState ? target.__getFiezelState() : null;
        if (state && state.adaptiveReady && typeof target.startAdaptive === 'function') target.startAdaptive();
        else if (typeof target.go === 'function') target.go('test');
      } catch (_) {}
    }

    function refresh() {
      var st = status();
      if (!st.locked) {
        if (armed) {
          armed = false;
          working = false;
          close();
          try { if (typeof target.showToast === 'function') target.showToast('Target harian selesai. Aplikasi terbuka penuh.'); } catch (_) {}
        }
        return st;
      }
      armed = true;
      // The mandatory voice download owns the screen until it finishes; stacking a second
      // blocking sheet on top of it would trap the learner behind two locks.
      if (doc.getElementById('voiceBundleSheet')) return st;
      // While the learner is actually answering, the sheet must not cover the question.
      // It returns the moment they stop, which is what makes the lock hold.
      if (!working) open();
      else {
        var node = doc.getElementById('dailyLock');
        if (node) node.innerHTML = panelMarkup(st);
      }
      return st;
    }

    /** Leaving the practice screen re-raises the sheet immediately. */
    function guardNavigation() {
      var baseGo = target.go;
      if (typeof baseGo !== 'function' || baseGo.__dailyTargetGuarded) return;
      var guarded = function (view) {
        if (armed && !status().met && view !== 'test') {
          working = false;
          try { if (typeof target.showToast === 'function') target.showToast('Selesaikan target harian dulu.'); } catch (_) {}
          open();
          return false;
        }
        return baseGo(view);
      };
      guarded.__dailyTargetGuarded = true;
      target.go = guarded;
    }

    function guardHistory() {
      if (typeof target.addEventListener !== 'function' || !target.history || typeof target.history.pushState !== 'function') return;
      try { target.history.pushState({ fiezelDailyLock: true }, ''); } catch (_) {}
      target.addEventListener('popstate', function () {
        if (!armed || status().met) return;
        // Swallow the in-app back gesture by restoring the entry we just consumed.
        try { target.history.pushState({ fiezelDailyLock: true }, ''); } catch (_) {}
        working = false;
        open();
      });
    }

    function start() {
      guardNavigation();
      guardHistory();
      refresh();
      if (timer && typeof target.clearInterval === 'function') target.clearInterval(timer);
      if (typeof target.setInterval === 'function') {
        // The learner's answer count changes inside app.js, which has no event to
        // subscribe to; a slow poll is the honest way to stay in sync without patching
        // every call site.
        timer = target.setInterval(refresh, 4000);
        if (timer && timer.unref) timer.unref();
      }
      if (typeof doc.addEventListener === 'function') {
        doc.addEventListener('visibilitychange', function () {
          if (doc.visibilityState === 'visible') { working = false; refresh(); }
        });
      }
      return status();
    }

    // m025-43: OWNER saw no target popup at all. app.js called start() from
    // unlockAppAfterNotification, which runs while app.js is still parsing - this file is
    // a later <script>, so the global did not exist yet and the optional call silently did
    // nothing. The lock now arms itself; app.js calling start() again is harmless.
    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', function () { target.setTimeout(start, 1200); });
    } else if (typeof target.setTimeout === 'function') {
      target.setTimeout(start, 1200);
    }

    target.FiezelDailyTarget = Object.freeze({
      schema: SCHEMA,
      evaluate: evaluate,
      targetFor: targetFor,
      status: status,
      start: start,
      refresh: refresh,
      open: open,
      close: close,
      isArmed: function () { return armed; }
    });
    return true;
  }

  var api = Object.freeze({
    schema: SCHEMA,
    MIN_TARGET: MIN_TARGET,
    MAX_TARGET: MAX_TARGET,
    targetFor: targetFor,
    evaluate: evaluate,
    install: install
  });

  if (typeof globalThis !== 'undefined' && globalThis.document) {
    try { install(globalThis); } catch (_) {}
  }
  return api;
}));
