/**
 * StealthPop Guard - Popup UI Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const powerToggle = document.getElementById('powerToggle');
  const statusLabel = document.getElementById('statusLabel');
  const stealthBadge = document.getElementById('stealthBadge');
  const stealthText = stealthBadge.querySelector('.stealth-text');
  const currentTabBlockedEl = document.getElementById('currentTabBlocked');
  const totalBlockedEl = document.getElementById('totalBlocked');
  const currentDomainEl = document.getElementById('currentDomain');
  const whitelistBtn = document.getElementById('whitelistBtn');
  const whitelistBtnText = document.getElementById('whitelistBtnText');
  const openTestPageBtn = document.getElementById('openTestPage');

  let currentHost = '';
  let activeTabId = null;

  // 1. Get current active tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      activeTabId = tab.id;
      const url = new URL(tab.url);
      currentHost = url.hostname;
      currentDomainEl.textContent = currentHost || 'Browser Internal';

      // Read badge text for current tab count
      const badgeText = await chrome.action.getBadgeText({ tabId: activeTabId });
      currentTabBlockedEl.textContent = badgeText || '0';
    } else {
      currentDomainEl.textContent = 'Tidak Tersedia';
    }
  } catch (err) {
    currentDomainEl.textContent = 'Lokal / Beranda';
  }

  // 2. Load storage data
  chrome.storage.local.get(['enabled', 'totalBlocked', 'whitelist'], (data) => {
    const isEnabled = data.enabled !== false;
    const total = data.totalBlocked || 0;
    const whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];

    powerToggle.checked = isEnabled;
    totalBlockedEl.textContent = total.toLocaleString();

    updateStatusUI(isEnabled);

    // Update whitelist button state
    if (currentHost && whitelist.includes(currentHost)) {
      whitelistBtn.classList.add('active');
      whitelistBtnText.textContent = 'Diizinkan (Klik untuk Lindungi)';
    } else {
      whitelistBtn.classList.remove('active');
      whitelistBtnText.textContent = 'Kecualikan Situs Ini';
    }
  });

  function updateStatusUI(enabled) {
    if (enabled) {
      statusLabel.textContent = 'Proteksi Aktif';
      statusLabel.style.color = '#f8fafc';
      stealthBadge.style.opacity = '1';
      stealthText.textContent = 'Tak Terdeteksi';
    } else {
      statusLabel.textContent = 'Proteksi Dinonaktifkan';
      statusLabel.style.color = '#94a3b8';
      stealthBadge.style.opacity = '0.4';
      stealthText.textContent = 'Nonaktif';
    }
  }

  // 3. Toggle switch handler
  powerToggle.addEventListener('change', () => {
    const enabled = powerToggle.checked;
    chrome.storage.local.set({ enabled: enabled }, () => {
      updateStatusUI(enabled);
      // Notify active tab to apply immediately
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { action: 'UPDATE_CONFIG', enabled: enabled }).catch(() => {});
      }
    });
  });

  // 4. Whitelist toggle handler
  whitelistBtn.addEventListener('click', () => {
    if (!currentHost) return;

    chrome.storage.local.get(['whitelist'], (data) => {
      let whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];
      const index = whitelist.indexOf(currentHost);

      if (index > -1) {
        // Remove from whitelist
        whitelist.splice(index, 1);
        whitelistBtn.classList.remove('active');
        whitelistBtnText.textContent = 'Kecualikan Situs Ini';
      } else {
        // Add to whitelist
        whitelist.push(currentHost);
        whitelistBtn.classList.add('active');
        whitelistBtnText.textContent = 'Diizinkan (Klik untuk Lindungi)';
      }

      chrome.storage.local.set({ whitelist: whitelist }, () => {
        // Refresh active tab so new setting takes effect
        if (activeTabId) {
          chrome.tabs.reload(activeTabId);
        }
      });
    });
  });

  // 5. Open test page
  openTestPageBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('test_popunder_adblock.html') });
  });
});
