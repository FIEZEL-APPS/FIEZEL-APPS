// ==UserScript==
// @name         StealthPop Guard - Anti Pop-Up Siluman
// @namespace    https://github.com/stealthpop-guard
// @version      1.0.1
// @description  Blokir pop-up iklan & jebakan klik saat browsing tanpa terdeteksi oleh sistem anti-adblock dan aman untuk pemutar video (Lk21 dll)
// @author       Antigravity
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  if (window.location.pathname.includes('/cdn-cgi/') || 
      window.location.hostname.includes('challenges.cloudflare.com')) {
    return;
  }

  if (window.__STEALTH_POP_GUARD_ACTIVE__) return;
  window.__STEALTH_POP_GUARD_ACTIVE__ = true;

  function createFakeWindow(url) {
    const fakeWin = {
      closed: false,
      name: '',
      opener: window,
      parent: window,
      top: window,
      frames: [],
      length: 0,
      close: function() { this.closed = true; },
      focus: function() {},
      blur: function() {},
      postMessage: function() {},
      location: {
        href: url || '',
        assign: function() {},
        replace: function() {},
        reload: function() {}
      },
      document: {
        open: function() { return this; },
        close: function() {},
        write: function() {},
        writeln: function() {}
      }
    };
    fakeWin.window = fakeWin;
    fakeWin.self = fakeWin;
    return fakeWin;
  }

  const AD_URL_REGEX = /(popcash|popads|propellerads|exoclick|adsterra|clickadu|juicyads|trafficfactory|syndication|doubleclick|adnxs|monetag|hilltopads|richpush|admaven|adcash|onclick|popunder|direct-link|stream-ad|bet365|1xbet|slot|casin|jackpot|token=|zoneid=|clickid=|subid=|\b(ad|banner|tracker|track|aff|affiliate|pixel)\b.*=)/i;

  let lastUserClickTime = 0;
  function recordInteraction(e) {
    if (e && e.isTrusted) {
      lastUserClickTime = Date.now();
    }
  }
  window.addEventListener('click', recordInteraction, true);
  window.addEventListener('keydown', recordInteraction, true);

  function isPlayerElement(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'video' || tag === 'audio' || tag === 'iframe' || tag === 'canvas' ||
        tag === 'svg' || tag === 'path' || tag === 'button' || tag === 'input' ||
        tag === 'select' || tag === 'option' || tag === 'textarea' || tag === 'img') {
      return true;
    }
    if (el.querySelector && el.querySelector('video, audio, iframe, svg, canvas, button, img')) {
      return true;
    }
    const idClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
    if (/(player|video|jw|vjs|play|control|poster|stream|media|embed|cinema|fullscreen|loader|option|action|eps|episode|btn|button)/.test(idClass)) {
      return true;
    }
    if (el.closest && el.closest('.main-player, .player-area, .player-wrapper, #main-player, #adContainer, [class*="player"], [id*="player"]')) {
      return true;
    }
    return false;
  }

  const rawWindowOpen = window.open;
  function shouldBlock(url, target) {
    const urlString = String(url || '');
    const timeSinceClick = Date.now() - lastUserClickTime;

    if (AD_URL_REGEX.test(urlString)) return true;
    if (timeSinceClick > 1500) return true;
    if ((!url || url === '' || url === 'about:blank') && (!target || target === '_blank')) return true;

    try {
      if (url && typeof url === 'string' && url.startsWith('http')) {
        const destHost = new URL(url).hostname;
        const currentHost = window.location.hostname;
        if (destHost !== currentHost && !destHost.includes(currentHost.split('.').slice(-2).join('.'))) {
          if (!/(google\.com|facebook\.com|twitter\.com|telegram\.org|whatsapp\.com)/i.test(destHost)) {
            return true;
          }
        }
      }
    } catch (e) {}

    return false;
  }

  const proxyWindowOpen = new Proxy(rawWindowOpen, {
    apply(target, thisArg, args) {
      if (shouldBlock(args[0], args[1])) {
        return createFakeWindow(args[0]);
      }
      try {
        return Reflect.apply(target, thisArg, args);
      } catch (err) {
        return createFakeWindow(args[0]);
      }
    }
  });
  window.open = proxyWindowOpen;

  const rawAnchorClick = HTMLAnchorElement.prototype.click;
  const proxyAnchorClick = new Proxy(rawAnchorClick, {
    apply(target, thisArg, args) {
      const href = thisArg.href || '';
      const anchorTarget = (thisArg.target || '').toLowerCase();
      const timeSinceClick = Date.now() - lastUserClickTime;

      if (AD_URL_REGEX.test(href) || (anchorTarget === '_blank' && timeSinceClick > 1500) || (!thisArg.isConnected && anchorTarget === '_blank')) {
        return;
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
  HTMLAnchorElement.prototype.click = proxyAnchorClick;

  const originalToString = Function.prototype.toString;
  const proxyToString = new Proxy(originalToString, {
    apply(target, thisArg, args) {
      if (thisArg === proxyWindowOpen) return 'function open() { [native code] }';
      if (thisArg === proxyAnchorClick) return 'function click() { [native code] }';
      return Reflect.apply(target, thisArg, args);
    }
  });
  try { Function.prototype.toString = proxyToString; } catch (e) {}

  window.addEventListener('click', function(e) {
    const target = e.target;
    if (!target || isPlayerElement(target)) return;

    const anchor = target.closest ? target.closest('a') : null;
    if (anchor && anchor.href && AD_URL_REGEX.test(anchor.href)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  try {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.google_ad_client = true;
  } catch (e) {}
})();
