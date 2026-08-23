/* FIEZEL Dark Mode + A/B Testing + UI Utilities */

class FiezelUIManager {
  constructor() {
    this.STORAGE_KEY_THEME = 'fiezel_theme_preference';
    this.STORAGE_KEY_VARIANT = 'fiezel_ab_variant';
    this.init();
  }

  /* ===== DARK MODE ===== */
  /* m025-120: dasar cream adalah keputusan produk, bukan preferensi perangkat.
     Sebelumnya baris ini memakai `stored || getSystemPreference()`, sehingga ponsel yang
     disetel gelap memaksa aplikasi gelap pada kunjungan pertama - padahal OWNER meminta
     dasar cream. Preferensi sistem kini hanya menjadi info, bukan penentu; yang menentukan
     hanyalah pilihan yang pernah disimpan murid sendiri. */
  initDarkMode() {
    const stored = localStorage.getItem(this.STORAGE_KEY_THEME);
    this.applyTheme(stored === 'dark' ? 'dark' : 'light');
  }

  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(this.STORAGE_KEY_THEME, 'dark');
    } else {
      /* m025-120 BUG: dulu baris ini menghapus atributnya. Aturan gelap di style.css
         berbunyi `@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) }`,
         jadi TIDAK ADA atribut tetap cocok dengan aturan gelap - memilih terang di ponsel
         bermode gelap tidak mengubah apa pun. Terang harus dinyatakan, bukan dibiarkan. */
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem(this.STORAGE_KEY_THEME, 'light');
    }
  }

  toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    return next;
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  /* ===== A/B TESTING ===== */
  initABTest() {
    let variant = localStorage.getItem(this.STORAGE_KEY_VARIANT);
    if (!variant) {
      variant = Math.random() < 0.5 ? 'control' : 'variant-v1';
      localStorage.setItem(this.STORAGE_KEY_VARIANT, variant);
    }
    return variant;
  }

  getABVariant() {
    return localStorage.getItem(this.STORAGE_KEY_VARIANT) || 'control';
  }

  trackABEvent(eventName, data = {}) {
    const variant = this.getABVariant();
    const payload = {
      event: eventName,
      variant,
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
      ...data
    };
    this.logABEvent(payload);
  }

  logABEvent(payload) {
    if (window.FiezelAnalytics) {
      window.FiezelAnalytics.track(payload);
    } else {
      console.debug('[AB Test Event]', payload);
    }
  }

  /* ===== SKELETON UTILITIES ===== */
  createSkeletonCard(rows = 3, options = {}) {
    const { cardClass = '', height = '16px', spacing = '12px' } = options;
    const skeletons = Array(rows)
      .fill(null)
      .map((_, i) => {
        const isTitle = i === 0;
        const h = isTitle ? '24px' : height;
        return `<div class="skeleton ${isTitle ? 'skeleton-title' : 'skeleton-text'}" style="height: ${h}; margin-bottom: ${i < rows - 1 ? spacing : '0'};"></div>`;
      })
      .join('');

    return `<div class="skeleton-card ${cardClass}">${skeletons}</div>`;
  }

  createSkeletonGrid(cols = 2, rows = 4, options = {}) {
    const { cardClass = '' } = options;
    const cells = Array(cols * rows)
      .fill(null)
      .map(() => this.createSkeletonCard(2, { cardClass, height: '12px' }))
      .join('');

    return `<div class="skeleton-grid" style="grid-template-columns: repeat(${cols}, 1fr);">${cells}</div>`;
  }

  createEmptyState(options = {}) {
    const {
      icon = '📚',
      title = 'Belum ada konten',
      description = 'Mulai belajar untuk melihat progres',
      actionText = 'Mulai',
      actionHandler = null,
      minimal = false
    } = options;

    const stateClass = minimal ? 'empty-state-minimal' : 'empty-state';
    const action = actionHandler
      ? `<button class="primary" onclick="${actionHandler}()">${actionText}</button>`
      : '';

    return `
      <div class="${stateClass}">
        <div class="empty-state-icon">${icon}</div>
        <h2>${title}</h2>
        <p>${description}</p>
        ${action}
      </div>
    `;
  }

  /* ===== LOADING STATE ===== */
  setLoadingState(element, isLoading = true) {
    if (isLoading) {
      element.classList.add('loading-state');
      element.setAttribute('data-loading', 'true');
    } else {
      element.classList.remove('loading-state');
      element.setAttribute('data-loading', 'false');
    }
  }

  /* ===== INITIALIZATION ===== */
  init() {
    this.initDarkMode();
    this.initABTest();
    this.setupThemeToggleListener();
    this.logInitialization();
  }

  /* m025-120: perubahan mode sistem tidak lagi menimpa tema aplikasi. Penjaga lama hanya
     menyala bila belum ada preferensi tersimpan, padahal applyTheme selalu menulis satu
     pada init - jadi yang tersisa hanyalah risiko dasar cream berbalik gelap di belakang
     murid. Metodenya dipertahankan sebagai titik pasang bila kelak ada tombol "ikuti
     sistem" yang eksplisit. */
  setupThemeToggleListener() {}

  logInitialization() {
    const theme = this.getCurrentTheme();
    const variant = this.getABVariant();
    console.log(`[FIEZEL UI] Theme: ${theme}, AB Variant: ${variant}`);
  }
}

// Global instance
window.FiezelUI = new FiezelUIManager();

// Export untuk use di modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FiezelUI;
}
