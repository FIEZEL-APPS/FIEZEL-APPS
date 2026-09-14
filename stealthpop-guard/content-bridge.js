/**
 * StealthPop Guard - Content Bridge (ISOLATED World)
 * Bridges communication between MAIN world (stealth-core) and Extension background/storage.
 */
(function() {
  'use strict';

  const hostname = window.location.hostname;

  // Sync initial state from chrome.storage
  chrome.storage.local.get(['enabled', 'whitelist', 'totalBlocked'], function(data) {
    const isGlobalEnabled = data.enabled !== false;
    const whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];
    const isWhitelisted = whitelist.some(site => hostname.includes(site));

    const effectiveEnabled = isGlobalEnabled && !isWhitelisted;

    // Send status to stealth-core in MAIN world
    window.postMessage({
      type: 'STEALTHPOP_CONFIG_SYNC',
      enabled: effectiveEnabled
    }, '*');
  });

  // Listen for blocked events from stealth-core.js
  window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'STEALTHPOP_BLOCKED_EVENT') return;

    // Update badge and storage counters
    chrome.runtime.sendMessage({
      action: 'POPUP_BLOCKED',
      reason: event.data.reason,
      url: window.location.href,
      hostname: hostname
    });
  });

  // Listen for runtime commands (e.g. from popup toggle)
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'UPDATE_CONFIG') {
      window.postMessage({
        type: 'STEALTHPOP_CONFIG_SYNC',
        enabled: msg.enabled
      }, '*');
      sendResponse({ status: 'ok' });
    }
  });

})();
