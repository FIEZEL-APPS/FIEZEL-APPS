/**
 * m025-42 zoom lock.
 *
 * OWNER: the layout must stay at exactly one scale, whatever the fingers do.
 *
 * `user-scalable=no` in the viewport tag is necessary but NOT sufficient: iOS Safari has
 * ignored it since iOS 10, which is precisely the platform this app ships on. So the
 * gestures are refused at the event level as well:
 *
 *   - `gesturestart` / `gesturechange` / `gestureend` are the WebKit pinch events.
 *   - a `touchmove` carrying more than one touch point is a pinch in progress.
 *   - two taps inside DOUBLE_TAP_MS at the same spot is the double-tap zoom.
 *   - ctrl + wheel is the desktop pinch-zoom that a trackpad emits.
 *
 * Every listener is passive:false, because a passive listener cannot preventDefault and
 * would leave the gesture running. Single-finger touches are never touched, or scrolling
 * and every button in the app would die with the zoom.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelZoomLock = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DOUBLE_TAP_MS = 320;
  // A second tap further away than this is two separate taps, not a double tap.
  var DOUBLE_TAP_SLOP_PX = 40;

  function createGuard(now) {
    var clock = typeof now === 'function' ? now : function () { return Date.now(); };
    var lastTapAt = 0;
    var lastX = 0;
    var lastY = 0;

    /** True when this touchend completes a double tap and must be cancelled. */
    function isDoubleTap(x, y) {
      var at = clock();
      var near = Math.abs(x - lastX) <= DOUBLE_TAP_SLOP_PX && Math.abs(y - lastY) <= DOUBLE_TAP_SLOP_PX;
      var quick = at - lastTapAt <= DOUBLE_TAP_MS;
      lastTapAt = at;
      lastX = x;
      lastY = y;
      if (quick && near) {
        // Consume it: a third tap must start a fresh pair, or a triple tap would be
        // treated as another double tap and the user could never tap twice in a row.
        lastTapAt = 0;
        return true;
      }
      return false;
    }

    /** True when a touch event carries a pinch (more than one finger down). */
    function isPinch(touchCount) { return Number(touchCount) > 1; }

    return {
      isDoubleTap: isDoubleTap,
      isPinch: isPinch,
      DOUBLE_TAP_MS: DOUBLE_TAP_MS,
      DOUBLE_TAP_SLOP_PX: DOUBLE_TAP_SLOP_PX
    };
  }

  function install(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target || !target.document || typeof target.document.addEventListener !== 'function') return false;
    if (target.__fiezelZoomLockInstalled) return true;
    target.__fiezelZoomLockInstalled = true;

    var doc = target.document;
    var guard = createGuard(target.Date && target.Date.now ? function () { return target.Date.now(); } : null);
    var stop = function (event) { if (event && typeof event.preventDefault === 'function') event.preventDefault(); };

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (name) {
      doc.addEventListener(name, stop, { passive: false });
    });

    doc.addEventListener('touchmove', function (event) {
      if (guard.isPinch(event && event.touches && event.touches.length)) stop(event);
    }, { passive: false });

    doc.addEventListener('touchstart', function (event) {
      if (guard.isPinch(event && event.touches && event.touches.length)) stop(event);
    }, { passive: false });

    doc.addEventListener('touchend', function (event) {
      var touch = (event && event.changedTouches && event.changedTouches[0]) || null;
      if (guard.isDoubleTap(touch ? touch.clientX : 0, touch ? touch.clientY : 0)) stop(event);
    }, { passive: false });

    // Trackpad and ctrl+wheel zoom on desktop.
    doc.addEventListener('wheel', function (event) {
      if (event && event.ctrlKey) stop(event);
    }, { passive: false });

    // Cmd/Ctrl +, -, 0 keyboard zoom.
    doc.addEventListener('keydown', function (event) {
      if (!event || !(event.ctrlKey || event.metaKey)) return;
      if (['+', '=', '-', '_', '0'].indexOf(String(event.key)) !== -1) stop(event);
    }, { passive: false });

    return true;
  }

  var api = Object.freeze({
    schema: 'fiezel-zoom-lock-v1',
    DOUBLE_TAP_MS: DOUBLE_TAP_MS,
    DOUBLE_TAP_SLOP_PX: DOUBLE_TAP_SLOP_PX,
    createGuard: createGuard,
    install: install
  });

  if (typeof globalThis !== 'undefined' && globalThis.document) {
    try { install(globalThis); } catch (_) {}
  }
  return api;
}));
