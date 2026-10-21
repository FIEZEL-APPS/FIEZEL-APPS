/**
 * FIEZEL Voice Call Studio — Isolated Sub-Module & Web Component Bridge
 * Location: features/voice-studio/fiezel-voice-studio-embed.js
 *
 * Allows the main FIEZEL Vanilla PWA (https://fiezel.my.id/app/) to mount the
 * Voice Call Studio either as:
 * 1) <fiezel-voice-studio-frame></fiezel-voice-studio-frame> (isolated iframe pointing to call.html)
 * 2) Direct script loader for features/voice-studio/dist/voice-studio.js
 * 3) Modal / drawer launcher: window.FiezelVoiceStudioEmbed.openModal()
 *
 * Strictly preserves all existing Vanilla PWA localStorage ('fiezel-v4-state', 'fz_target_course')
 * and IndexedDB ('fiezel-learning-queue-v1', 'fiezel-braincore-evidence-v1') flows.
 */
(function (global) {
  'use strict';

  var CALL_PAGE_URL = 'call.html';

  function t(k, fb, params) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : typeof root !== 'undefined' ? root : global).FiezelI18n;
      s = I && I.t ? I.t(k, params) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) { return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m; });
    return s;
  }

  function resolveCallUrl(options) {
    var opts = options || {};
    var base = opts.callUrl || CALL_PAGE_URL;
    var params = [];
    try {
      var lang = opts.targetLang || localStorage.getItem('fz_target_course') || 'en';
      if (lang) params.push('lang=' + encodeURIComponent(lang));
      if (opts.scenarioId) params.push('scenario=' + encodeURIComponent(opts.scenarioId));
    } catch (_) {}
    if (params.length === 0) return base;
    return base + (base.indexOf('?') === -1 ? '?' : '&') + params.join('&');
  }

  function mountIframe(container, options) {
    if (!container) return null;
    var iframe = document.createElement('iframe');
    iframe.src = resolveCallUrl(options);
    iframe.title = 'FIEZEL AI Voice Call Studio';
    iframe.allow = 'microphone; autoplay; clipboard-write';
    iframe.style.width = '100%';
    iframe.style.height = (options && options.height) || '100%';
    iframe.style.minHeight = (options && options.minHeight) || '680px';
    iframe.style.border = '0';
    iframe.style.borderRadius = (options && options.borderRadius) || '24px';
    iframe.style.background = '#F8FAFC';
    container.innerHTML = '';
    container.appendChild(iframe);
    return iframe;
  }

  // Register <fiezel-voice-studio-frame> custom element for zero-conflict embedding
  if (typeof customElements !== 'undefined' && !customElements.get('fiezel-voice-studio-frame')) {
    class FiezelVoiceStudioFrameElement extends HTMLElement {
      connectedCallback() {
        var scenarioId = this.getAttribute('scenario') || '';
        var targetLang = this.getAttribute('lang') || '';
        var minHeight = this.getAttribute('min-height') || '680px';
        mountIframe(this, {
          scenarioId: scenarioId,
          targetLang: targetLang,
          minHeight: minHeight,
        });
      }
    }
    customElements.define('fiezel-voice-studio-frame', FiezelVoiceStudioFrameElement);
  }

  // Register <fiezel-voice-studio> fallback custom element for seamless declarative embedding
  if (typeof customElements !== 'undefined' && !customElements.get('fiezel-voice-studio')) {
    class FiezelVoiceStudioElementFallback extends HTMLElement {
      connectedCallback() {
        var scenarioId = this.getAttribute('scenario') || '';
        var targetLang = this.getAttribute('lang') || '';
        var minHeight = this.getAttribute('min-height') || '680px';
        mountIframe(this, {
          scenarioId: scenarioId,
          targetLang: targetLang,
          minHeight: minHeight,
        });
      }
    }
    customElements.define('fiezel-voice-studio', FiezelVoiceStudioElementFallback);
  }

  var currentModalEl = null;

  function closeModal() {
    if (currentModalEl && currentModalEl.parentNode) {
      currentModalEl.parentNode.removeChild(currentModalEl);
    }
    currentModalEl = null;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('fiezel-voice-studio-modal-open');
    }
  }

  function openModal(options) {
    if (typeof document === 'undefined') return null;
    closeModal();

    var opts = options || {};
    var overlay = document.createElement('div');
    overlay.className = 'fiezel-voice-studio-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'FIEZEL AI Voice Call Studio');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var card = document.createElement('div');
    card.style.cssText =
      'position:relative;width:100%;max-width:1120px;height:92vh;max-height:940px;background:#F8FAFC;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.1);';

    var header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #E2E8F0;background:#FFFFFF;';

    var brandWrap = document.createElement('div');
    brandWrap.style.cssText = 'display:flex;align-items:center;gap:10px;';

    var iconImg = document.createElement('img');
    iconImg.src = './assets/brand/paw-mochi-idle.svg';
    iconImg.alt = 'FIEZEL';
    iconImg.style.cssText = 'width:28px;height:28px;object-fit:contain;';
    iconImg.onerror = function () {
      this.style.display = 'none';
    };

    var title = document.createElement('div');
    title.style.cssText = 'font-weight:700;font-size:14px;color:#0F172A;letter-spacing:0.02em;';
    title.textContent = 'FIEZEL AI Voice Call Studio';

    brandWrap.appendChild(iconImg);
    brandWrap.appendChild(title);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', t('umum.tutup', 'Tutup Voice Studio'));
    closeBtn.style.cssText =
      'background:transparent;border:none;font-size:28px;line-height:1;cursor:pointer;color:#64748B;padding:4px 8px;border-radius:8px;transition:color 0.15s,background 0.15s;';
    closeBtn.onmouseenter = function () {
      closeBtn.style.color = '#0F172A';
      closeBtn.style.background = '#F1F5F9';
    };
    closeBtn.onmouseleave = function () {
      closeBtn.style.color = '#64748B';
      closeBtn.style.background = 'transparent';
    };
    closeBtn.onclick = closeModal;

    header.appendChild(brandWrap);
    header.appendChild(closeBtn);

    var iframeBox = document.createElement('div');
    iframeBox.style.cssText = 'flex:1;width:100%;height:100%;position:relative;background:#F8FAFC;';

    mountIframe(
      iframeBox,
      Object.assign({}, opts, {
        height: '100%',
        minHeight: '100%',
        borderRadius: '0 0 24px 24px',
      })
    );

    card.appendChild(header);
    card.appendChild(iframeBox);
    overlay.appendChild(card);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    var onKeyDown = function (e) {
      if (e.key === 'Escape') {
        closeModal();
        window.removeEventListener('keydown', onKeyDown);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);
    document.body.classList.add('fiezel-voice-studio-modal-open');
    currentModalEl = overlay;
    return overlay;
  }

  // Listen for non-destructive Braincore telemetry messages from the Voice Studio iframe
  if (typeof window !== 'undefined') {
    window.addEventListener('message', function (event) {
      var data = event && event.data;
      if (!data || data.type !== 'FIEZEL_VOICE_STUDIO_ATTEMPT') return;
      try {
        window.dispatchEvent(
          new CustomEvent('fiezel:voice-studio:attempt', { detail: data.payload })
        );
      } catch (_) {}
    });
  }

  global.FiezelVoiceStudioEmbed = {
    mountIframe: mountIframe,
    resolveCallUrl: resolveCallUrl,
    openModal: openModal,
    closeModal: closeModal,
  };
})(typeof window !== 'undefined' ? window : self);
