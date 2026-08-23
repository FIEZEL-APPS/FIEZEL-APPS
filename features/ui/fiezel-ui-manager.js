/* FIEZEL UI: A/B Testing + Skeleton/Empty-state utilities (tema tunggal: terang) */

class FiezelUIManager {
  constructor() {
    /* Kunci lama dari era mode gelap; dipertahankan hanya untuk dibersihkan di initTheme. */
    this.STORAGE_KEY_THEME = 'fiezel_theme_preference';
    this.STORAGE_KEY_VARIANT = 'fiezel_ab_variant';
    this.init();
  }

  /* ===== TEMA ===== */
  /* m025-134: mode gelap dihapus atas permintaan OWNER. Dasar cream adalah keputusan
     produk dan kini satu-satunya tampilan: tidak ada sakelar, tidak ada preferensi
     tersimpan, dan preferensi sistem tidak lagi punya suara. Atribut data-theme="light"
     tetap DINYATAKAN (bukan dihapus) supaya stylesheet atau ekstensi pihak ketiga yang
     masih mengenal konvensi itu membaca terang secara eksplisit. */
  initTheme() {
    document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.removeItem(this.STORAGE_KEY_THEME); } catch (e) {}
  }

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
