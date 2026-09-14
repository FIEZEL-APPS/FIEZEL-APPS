/**
 * StealthPop Guard - Core Engine (MAIN World)
 * Injected at document_start in the MAIN world.
 *
 * Implements:
 * 1. Deep window.open & Window.prototype.open hook (blocks popups & popunders).
 * 2. Click-trap neutralizer for fake <a target="_blank"> ad anchors (like #adsLink).
 * 3. Strict whitelist for player controls, ensuring video starts playing smoothly.
 * 4. Transparent native proxy spoofing (undetected by anti-adblockers).
 * 5. Bypasses Cloudflare challenge frames.
 */
(function() {
  'use strict';

  // 1. Skip Cloudflare challenge frames so human verification passes smoothly
  if (window.location.pathname.includes('/cdn-cgi/') || 
      window.location.hostname.includes('challenges.cloudflare.com')) {
    return;
  }

  // Prevent multiple executions
  if (window.__STEALTH_POP_GUARD_ACTIVE__) return;
  window.__STEALTH_POP_GUARD_ACTIVE__ = true;

  let sessionBlockedCount = 0;
  let isEnabled = true;

  // Listen for config sync from content-bridge
  window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'STEALTHPOP_CONFIG_SYNC') return;
    if (typeof event.data.enabled === 'boolean') {
      isEnabled = event.data.enabled;
    }
  });

  function notifyBlocked(reason) {
    sessionBlockedCount++;
    window.postMessage({
      type: 'STEALTHPOP_BLOCKED_EVENT',
      reason: reason,
      totalBlocked: sessionBlockedCount,
      url: window.location.href
    }, '*');

    console.debug('%c[StealthPop Guard]%c Pop-up iklan dicegat: ' + reason, 'color:#10b981;font-weight:bold;', 'color:inherit;');
  }

  // =========================================================================
  // 2. FAKE DUMMY WINDOW (Deceives scripts expecting a Window return)
  // =========================================================================
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
      print: function() {},
      stop: function() {},
      location: {
        href: url || '',
        search: '',
        pathname: '',
        origin: '',
        assign: function() {},
        replace: function() {},
        reload: function() {}
      },
      document: {
        open: function() { return this; },
        close: function() {},
        write: function() {},
        writeln: function() {},
        location: { href: url || '' }
      }
    };
    fakeWin.window = fakeWin;
    fakeWin.self = fakeWin;
    return fakeWin;
  }

  // =========================================================================
  // 3. AD & MEDIA SIGNATURES
  // =========================================================================
  const AD_URL_REGEX = /(popcash|popads|propellerads|exoclick|adsterra|clickadu|juicyads|trafficfactory|syndication|doubleclick|adnxs|monetag|hilltopads|richpush|admaven|adcash|onclick|popunder|direct-link|stream-ad|bet365|1xbet|slot|casin|jackpot|token=|zoneid=|clickid=|subid=|\b(ad|banner|tracker|track|aff|affiliate|pixel)\b.*=)/i;
  const MEDIA_HOST_REGEX = /(nontondrama|lk21|layarkaca|d21|nonton|streaming|film|movie|anime|manga|komik|stream|download|videonode)/i;

  let lastUserClickTime = 0;
  function recordInteraction(e) {
    if (e && e.isTrusted) {
      lastUserClickTime = Date.now();
    }
  }
  window.addEventListener('click', recordInteraction, true);
  window.addEventListener('keydown', recordInteraction, true);
  window.addEventListener('touchend', recordInteraction, true);

  // =========================================================================
  // 4. PLAYER ELEMENT IDENTIFIER
  // =========================================================================
  function isPlayerElement(el) {
    if (!el) return false;

    // Media & control tags
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'video' || tag === 'audio' || tag === 'iframe' || tag === 'canvas' ||
        tag === 'svg' || tag === 'path' || tag === 'button' || tag === 'input' ||
        tag === 'select' || tag === 'option' || tag === 'textarea' || tag === 'img') {
      return true;
    }

    if (el.querySelector && el.querySelector('video, audio, iframe, svg, canvas, button')) {
      return true;
    }

    const idClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
    if (/(player|video|jw|vjs|play|control|poster|stream|media|embed|cinema|fullscreen|loader|option|action|eps|episode)/.test(idClass)) {
      return true;
    }

    if (el.closest && el.closest('.main-player, .player-area, .player-wrapper, #main-player, [class*="player"], [id*="player"]')) {
      return true;
    }

    return false;
  }

  // =========================================================================
  // 5. DEEP `window.open` & `Window.prototype.open` PROXY HOOK
  // =========================================================================
  const rawWindowOpen = window.open;

  function shouldBlockPopup(url, target, features) {
    if (!isEnabled) return false;

    const urlString = String(url || '');
    const currentHost = window.location.hostname;
    const isMediaHost = MEDIA_HOST_REGEX.test(currentHost);

    // 1. Matches ad URL patterns -> ALWAYS BLOCK
    if (AD_URL_REGEX.test(urlString)) {
      return true;
    }

    // 2. Unsolicited / background popunder (no user click within 1.2 seconds)
    const timeSinceClick = Date.now() - lastUserClickTime;
    if (timeSinceClick > 1200) {
      return true;
    }

    // 3. Opening about:blank or empty in new tab -> standard ad carrier
    const isBlankUrl = (!url || url === '' || url === 'about:blank');
    const isNewTab = (!target || target === '_blank');
    if (isBlankUrl && isNewTab) {
      return true;
    }

    // 4. On streaming/media sites: Any new tab (_blank) that opens an external domain
    if (isMediaHost && isNewTab) {
      // Allow legitimate mini-popup player with explicit width/height (like LK21's /windowPopup)
      if (features && features.includes('width') && urlString.includes('windowPopup')) {
        return false;
      }
      // Otherwise, any new tab opened from streaming player is an ad popunder!
      return true;
    }

    return false;
  }

  const proxyWindowOpen = new Proxy(rawWindowOpen, {
    apply(target, thisArg, args) {
      const url = args[0];
      const winTarget = args[1];
      const features = args[2];

      if (shouldBlockPopup(url, winTarget, features)) {
        notifyBlocked('window.open intercepted: ' + (url ? String(url).substring(0, 50) : 'popunder'));
        return createFakeWindow(url);
      }

      try {
        return Reflect.apply(target, thisArg, args);
      } catch (err) {
        return createFakeWindow(url);
      }
    }
  });

  // Hook both instances
  window.open = proxyWindowOpen;
  try {
    Window.prototype.open = proxyWindowOpen;
  } catch (e) {}

  // =========================================================================
  // 6. PROGRAMMATIC `<a target="_blank">` CLICK INTERCEPTION
  // =========================================================================
  const rawAnchorClick = HTMLAnchorElement.prototype.click;
  const proxyAnchorClick = new Proxy(rawAnchorClick, {
    apply(target, thisArg, args) {
      if (!isEnabled) {
        return Reflect.apply(target, thisArg, args);
      }

      const href = thisArg.href || '';
      const anchorTarget = (thisArg.target || '').toLowerCase();
      const timeSinceClick = Date.now() - lastUserClickTime;

      if (AD_URL_REGEX.test(href) || (anchorTarget === '_blank' && timeSinceClick > 1200) || (!thisArg.isConnected && anchorTarget === '_blank')) {
        notifyBlocked('Programmatic a.click() blocked');
        return;
      }

      return Reflect.apply(target, thisArg, args);
    }
  });

  HTMLAnchorElement.prototype.click = proxyAnchorClick;

  // =========================================================================
  // 7. NATIVE CODE SPOOFING (Proxy on Function.prototype.toString)
  // =========================================================================
  const originalToString = Function.prototype.toString;
  const proxyToString = new Proxy(originalToString, {
    apply(target, thisArg, args) {
      if (thisArg === proxyWindowOpen) return 'function open() { [native code] }';
      if (thisArg === proxyAnchorClick) return 'function click() { [native code] }';
      return Reflect.apply(target, thisArg, args);
    }
  });

  try {
    Function.prototype.toString = proxyToString;
  } catch (e) {}

  // =========================================================================
  // 8. SURGICAL CLICK INTERCEPTOR
  // Disarms fake ad links (like #adsLink) while preserving ALL video player controls
  // =========================================================================
  window.addEventListener('click', function(e) {
    if (!isEnabled) return;

    const target = e.target;
    if (!target) return;

    // Check if click hit a fake ad anchor (e.g. #adsLink or an anchor with href="#" and target="_blank")
    const anchor = target.closest ? target.closest('a') : null;
    if (anchor) {
      const hrefAttr = anchor.getAttribute('href') || '';
      const anchorTarget = anchor.getAttribute('target') || '';
      const isAdsLinkId = (anchor.id === 'adsLink' || anchor.id === 'ad-link' || anchor.className.includes('ad-link'));

      // If anchor has target="_blank" and has fake href (# or empty) or matches ad regex:
      if (isAdsLinkId || (anchorTarget === '_blank' && (hrefAttr === '#' || hrefAttr === '' || AD_URL_REGEX.test(anchor.href)))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        notifyBlocked('Fake ad link blocked (' + (anchor.id || 'target=_blank') + ')');

        // If this fake link was covering the player or a play button underneath, trigger the real play action!
        anchor.style.setProperty('display', 'none', 'important');
        anchor.style.setProperty('pointer-events', 'none', 'important');

        const underEl = document.elementFromPoint(e.clientX, e.clientY);
        if (underEl && underEl !== anchor && underEl !== document.body) {
          setTimeout(() => underEl.click(), 10);
        }
        return;
      }
    }

    // Check for fixed transparent fullscreen ad overlays
    try {
      const style = window.getComputedStyle(target);
      if (style.position === 'fixed' && !isPlayerElement(target)) {
        const zIndex = parseInt(style.zIndex, 10);
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const isFullscreen = (target.offsetWidth >= winW * 0.85) && (target.offsetHeight >= winH * 0.85);
        const isTransparent = parseFloat(style.opacity) < 0.05 || style.backgroundColor === 'rgba(0, 0, 0, 0)';

        if (isFullscreen && isTransparent && zIndex >= 500 && (!target.innerText || target.innerText.trim().length === 0)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          target.style.setProperty('display', 'none', 'important');
          target.style.setProperty('pointer-events', 'none', 'important');
          notifyBlocked('Fullscreen Ad Overlay disarmed');

          const beneath = document.elementFromPoint(e.clientX, e.clientY);
          if (beneath && beneath !== target && !isPlayerElement(beneath)) {
            setTimeout(() => beneath.click(), 10);
          }
        }
      }
    } catch (err) {}
  }, true);

  // =========================================================================
  // 9. ANTI-ADBLOCK BAIT DECOYS
  // =========================================================================
  try {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.adblock = false;
    window.google_ad_client = true;
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }
  } catch (e) {}

})();
