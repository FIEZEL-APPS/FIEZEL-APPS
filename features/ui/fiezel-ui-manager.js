/* FIEZEL UI: A/B Testing + Skeleton/Empty-state utilities */

/* AI-02 F01: naskah murid tidak lagi literal di titik pakai - diambil dari FiezelI18n
   (copy-id-feat-b.js), dimuat lebih dulu lewat <script defer> di index.html. Guard typeof
   menjaga berkas ini tetap aman diurai di luar browser. */
const FZ_UI_T = (key) => (typeof FiezelI18n !== 'undefined' && FiezelI18n && FiezelI18n.t) ? FiezelI18n.t(key) : String(key);

class FiezelUIManager {
  constructor() {
    this.STORAGE_KEY_THEME = 'fiezel_theme_preference';
    this.STORAGE_KEY_VARIANT = 'fiezel_ab_variant';
    this.init();
  }

  /* ===== TEMA =====
     Mode gelap DIHAPUS seluruhnya atas permintaan OWNER: "HAPUS KAN SISTEM MODE GELAP".
     data-theme dipaku 'light', preferensi sistem dicabut suaranya,
     dan aplikasi terkunci ke tampilan dasar cream. */
  THEME_CHOICES() { return ['light']; }

  /** Pilihan murid dipaku ke 'light' (mode gelap dihapus). */
  storedTheme() { return 'light'; }

  initTheme() {
    this.applyTheme('light', { persist: false });
  }

  /**
   * Mengunci tema ke 'light'.
   * Menghapus kunci penyimpanan lama agar tidak ada yang tertinggal di mode gelap.
   */
  applyTheme(choice, options) {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    try {
      localStorage.removeItem(this.STORAGE_KEY_THEME);
    } catch (e) {}
    return 'light';
  }

  /** Selalu 'light' - aplikasi hanya memiliki satu tampilan dasar. */
  getCurrentTheme() {
    return 'light';
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

  /* T-031: event eksperimen UI pergi ke pipa A/B (`window.FiezelABAnalytics`), BUKAN ke
   * `window.FiezelAnalytics` — nama itu milik modul analytics privasi-maksimal, yang
   * allowlist field-nya tidak mengizinkan muatan eksperimen dan yang kontraknya tidak
   * boleh menerima teks bebas dari UI. Bentuknya diperiksa sebelum dipakai supaya nama
   * yang terisi objek asing tidak menjadi TypeError di jalur murid. */
  logABEvent(payload) {
    const ab = window.FiezelABAnalytics;
    if (ab && typeof ab.track === 'function') {
      ab.track(payload);
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
      title = FZ_UI_T('ui.empty-title'),
      description = FZ_UI_T('ui.empty-desc'),
      actionText = FZ_UI_T('ui.empty-action'),
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
    this.initTheme();
    this.initABTest();
    this.logInitialization();
  }


  logInitialization() {
    const variant = this.getABVariant();
    console.log(`[FIEZEL UI] AB Variant: ${variant}`);
  }
}

// Global instance
window.FiezelUI = new FiezelUIManager();

// Export untuk use di modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FiezelUI;
}
