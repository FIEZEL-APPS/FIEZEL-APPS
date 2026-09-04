/* FIEZEL UI: A/B Testing + Skeleton/Empty-state utilities + pemilih tema (terang / malam / ikut perangkat) */

/* AI-02 F01: naskah murid tidak lagi literal di titik pakai - diambil dari FiezelI18n
   (copy-id-feat-b.js), dimuat lebih dulu lewat <script defer> di index.html. Guard typeof
   menjaga berkas ini tetap aman diurai di luar browser. */
const FZ_UI_T = (key) => (typeof FiezelI18n !== 'undefined' && FiezelI18n && FiezelI18n.t) ? FiezelI18n.t(key) : String(key);

class FiezelUIManager {
  constructor() {
    /* Pilihan tema murid: 'system' (bawaan, atribut dihapus), 'light', atau 'dark'. */
    this.STORAGE_KEY_THEME = 'fiezel_theme_preference';
    this.STORAGE_KEY_VARIANT = 'fiezel_ab_variant';
    this.init();
  }

  /* ===== TEMA =====
     RIWAYAT, karena keputusan di sini sudah dibalik dua kali dan orang berikutnya
     berhak tahu urutannya sebelum membaliknya untuk ketiga kali:

       m025-120  OWNER: "MODE GELAP ATAU TIDAK GELAP TIDAK BERFUNGSI DI APLIKASI,
                 INTINYA AKU TETAP MAU DASAR CREAM."
       m025-134  Mode gelap DIHAPUS seluruhnya. data-theme dipaku 'light', preferensi
                 sistem dicabut suaranya, dan pastel-field-contrast-test.js dipasang
                 untuk menjaga keadaan itu.
       m025-246  OWNER MEMBALIKNYA, dan kali ini dengan syarat teknis yang eksplisit:
                 "Tema Malam: pakai token --core* yang sudah ada, hormati
                 prefers-color-scheme."

     Yang membuat pembalikan ini BUKAN pengulangan kesalahan m025-120: keluhan waktu itu
     adalah mode gelap yang "tidak berfungsi" - separuh permukaan memaku warnanya sendiri
     (#fff, #f6f4ed) sementara teks memakai var(--text), jadi gelap berarti tinta terang
     di atas bidang putih, 1,08:1. Sejak m025-85 permukaan-permukaan itu sudah dipindah ke
     token, dan keluarga --core* (--core / --core-soft / --core-line / --on-core) sudah
     hidup dan sudah diuji sebagai panggung gelap splash dan toast. Jadi malam sekarang
     memakai keluarga yang SUDAH ADA, bukan palet gelap kedua yang dikarang di sini.

     TIGA KEADAAN, dan hanya tiga:
       'light' - murid memilih terang. data-theme="light" menang atas preferensi sistem.
       'dark'  - murid memilih malam. data-theme="dark" menang atas preferensi sistem.
       'system'- bawaan. ATRIBUT DIHAPUS supaya @media (prefers-color-scheme) yang
                 memutuskan, tanpa satu baris JavaScript pun ikut campur. */
  THEME_CHOICES() { return ['system', 'light', 'dark']; }

  /** Pilihan murid apa adanya ('system' bila belum pernah memilih atau nilainya rusak). */
  storedTheme() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_THEME);
      return this.THEME_CHOICES().indexOf(raw) === -1 ? 'system' : raw;
    } catch (e) { return 'system'; }
  }

  initTheme() {
    this.applyTheme(this.storedTheme(), { persist: false });
  }

  /**
   * Menerapkan pilihan tema ke <html>.
   * @param {'system'|'light'|'dark'} choice
   * @param {{persist?:boolean}} [options] persist:false dipakai initTheme - membaca lalu
   *        menulis balik nilai yang sama hanya menambah tulisan localStorage per boot.
   */
  applyTheme(choice, options) {
    const want = this.THEME_CHOICES().indexOf(choice) === -1 ? 'system' : choice;
    const root = document.documentElement;
    /* 'system' MENGHAPUS atribut. Menuliskan data-theme="system" akan membuat kedua
       selektor tema di style.css meleset (keduanya menyebut nilai konkret), dan hasilnya
       murid tersangkut di palet terang apa pun setelan perangkatnya - persis kegagalan
       diam-diam yang membuat mode gelap lama disebut "tidak berfungsi". */
    if (want === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', want);
    if (!options || options.persist !== false) {
      try {
        if (want === 'system') localStorage.removeItem(this.STORAGE_KEY_THEME);
        else localStorage.setItem(this.STORAGE_KEY_THEME, want);
      } catch (e) {}
    }
    return want;
  }

  /** Tema yang BENAR-BENAR tampil sekarang - pilihan murid diselesaikan ke terang/malam. */
  getCurrentTheme() {
    const choice = this.storedTheme();
    if (choice !== 'system') return choice;
    try {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch (e) { return 'light'; }
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
