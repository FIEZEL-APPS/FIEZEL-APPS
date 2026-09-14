/**
 * StealthPop Guard - Background Service Worker (Titan Shield)
 * Multi-layer popup terminator: Tab creation interception, WebNavigation interceptor, and badge counter.
 */

const tabBlockedCounts = new Map();
const suspectTabs = new Map(); // tabId -> { openerId, openerHost, createdTime }

// Common streaming/media sites that spawn click popups
const MEDIA_SITE_REGEX = /(nontondrama|lk21|layarkaca|d21|nonton|streaming|film|movie|anime|manga|komik|stream|download|shortlink|videonode)/i;

// Ad network signatures
const AD_PATTERN_REGEX = /(popcash|popads|propellerads|exoclick|adsterra|clickadu|juicyads|trafficfactory|syndication|doubleclick|adnxs|monetag|hilltopads|richpush|admaven|adcash|onclick|popunder|direct-link|stream-ad|bet365|1xbet|slot|casin|jackpot|token=|zoneid=|clickid=|subid=|\b(ad|banner|tracker|track|aff|affiliate|pixel)\b.*=)/i;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled', 'totalBlocked', 'whitelist'], (res) => {
    if (typeof res.enabled === 'undefined') chrome.storage.local.set({ enabled: true });
    if (typeof res.totalBlocked === 'undefined') chrome.storage.local.set({ totalBlocked: 0 });
    if (!Array.isArray(res.whitelist)) chrome.storage.local.set({ whitelist: [] });
  });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
});

function recordBlocked(sourceTabId, reason) {
  chrome.storage.local.get(['totalBlocked'], (data) => {
    chrome.storage.local.set({ totalBlocked: (data.totalBlocked || 0) + 1 });
  });

  if (sourceTabId) {
    const count = (tabBlockedCounts.get(sourceTabId) || 0) + 1;
    tabBlockedCounts.set(sourceTabId, count);
    chrome.action.setBadgeText({
      tabId: sourceTabId,
      text: count > 99 ? '99+' : String(count)
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: sourceTabId,
      color: '#10b981'
    });
  }

  console.log('[StealthPop Guard Background] Popup tab terminated:', reason);
}

// =========================================================================
// LAYER 1: webNavigation.onCreatedNavigationTarget
// Intercepts the EXACT moment a tab is spawned by a script or click target
// =========================================================================
chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
  const { enabled, whitelist } = await chrome.storage.local.get(['enabled', 'whitelist']);
  if (enabled === false) return;

  const targetTabId = details.tabId;
  const sourceTabId = details.sourceTabId;
  const targetUrl = details.url || '';

  try {
    const sourceTab = await chrome.tabs.get(sourceTabId);
    if (!sourceTab || !sourceTab.url) return;

    const sourceHost = new URL(sourceTab.url).hostname;
    const isWhitelisted = (whitelist || []).some(w => sourceHost.includes(w));
    if (isWhitelisted) return;

    const isFromMediaSite = MEDIA_SITE_REGEX.test(sourceHost);
    const isAdTarget = AD_PATTERN_REGEX.test(targetUrl);
    const isBlankTarget = (targetUrl === '' || targetUrl === 'about:blank');

    // Check if target is external
    let isExternal = false;
    if (targetUrl.startsWith('http')) {
      try {
        const destHost = new URL(targetUrl).hostname;
        isExternal = !destHost.includes(sourceHost.split('.').slice(-2).join('.'));
      } catch (e) {}
    }

    // If spawned from a streaming/media site to an ad, blank popunder, or external domain:
    if (isFromMediaSite && (isAdTarget || isBlankTarget || isExternal)) {
      chrome.tabs.remove(targetTabId, () => {
        if (!chrome.runtime.lastError) {
          recordBlocked(sourceTabId, `NavTarget: ${targetUrl || 'blank'}`);
          // Ensure original source tab retains focus so user isn't disturbed
          chrome.tabs.update(sourceTabId, { active: true }).catch(() => {});
        }
      });
      return;
    }

    // Register as suspect for Layer 3 (URL update inspection)
    suspectTabs.set(targetTabId, {
      openerId: sourceTabId,
      openerHost: sourceHost,
      createdTime: Date.now()
    });
  } catch (err) {}
});

// =========================================================================
// LAYER 2: tabs.onCreated
// Catches tabs created with openerTabId
// =========================================================================
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.openerTabId) return;

  const { enabled, whitelist } = await chrome.storage.local.get(['enabled', 'whitelist']);
  if (enabled === false) return;

  try {
    const openerTab = await chrome.tabs.get(tab.openerTabId);
    if (!openerTab || !openerTab.url) return;

    const openerHost = new URL(openerTab.url).hostname;
    const isWhitelisted = (whitelist || []).some(w => openerHost.includes(w));
    if (isWhitelisted) return;

    suspectTabs.set(tab.id, {
      openerId: tab.openerTabId,
      openerHost: openerHost,
      createdTime: Date.now()
    });
  } catch (err) {}
});

// =========================================================================
// LAYER 3: tabs.onUpdated
// When suspect tab resolves its final URL (e.g. redirected from about:blank)
// =========================================================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!suspectTabs.has(tabId)) return;
  const suspect = suspectTabs.get(tabId);

  // Expire after 10 seconds
  if (Date.now() - suspect.createdTime > 10000) {
    suspectTabs.delete(tabId);
    return;
  }

  const url = changeInfo.url || tab.url || '';
  if (!url || url === 'about:blank') return;

  const isMediaOpener = MEDIA_SITE_REGEX.test(suspect.openerHost);
  const isAd = AD_PATTERN_REGEX.test(url);

  let isExternal = false;
  if (url.startsWith('http')) {
    try {
      const destHost = new URL(url).hostname;
      isExternal = !destHost.includes(suspect.openerHost.split('.').slice(-2).join('.'));
    } catch (e) {}
  }

  if (isAd || (isMediaOpener && isExternal)) {
    chrome.tabs.remove(tabId, () => {
      if (!chrome.runtime.lastError) {
        recordBlocked(suspect.openerId, `TabUpdated: ${url.substring(0, 60)}`);
        chrome.tabs.update(suspect.openerId, { active: true }).catch(() => {});
      }
    });
    suspectTabs.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabBlockedCounts.delete(tabId);
  suspectTabs.delete(tabId);
});

// Listen for content script blocked event messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'POPUP_BLOCKED') {
    recordBlocked(sender.tab ? sender.tab.id : null, msg.reason);
    sendResponse({ status: 'ok' });
  }
});
