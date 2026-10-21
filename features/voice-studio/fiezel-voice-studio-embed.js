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
  };
})(typeof window !== 'undefined' ? window : self);
