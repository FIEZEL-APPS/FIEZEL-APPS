/* FIEZEL A/B Testing & Analytics Framework
 *
 * NAMA GLOBAL: `window.FiezelABAnalytics` — DAN HANYA ITU.
 *
 * T-031: berkas ini dulu memasang dirinya sebagai `window.FiezelAnalytics`, nama yang
 * dimiliki modul analytics privasi-maksimal (`features/analytics/fiezel-analytics-client.js`).
 * Karena berkas ini dimuat `<script defer>` dari index.html, nama itu SELALU sudah terisi
 * sebelum pemuat analytics di app.js berjalan di idle; pemuat itu mempercayai nama yang
 * sudah ada, menerima objek A/B ini, gagal cek bentuk, dan modul analytics ASLI tidak
 * pernah diunduh. Akibatnya: analytics murid mati total dan SENYAP (nol permintaan ke
 * /api/usage, nol galat konsol). Arah sebaliknya sama berbahaya: kalau modul analytics
 * yang menang balapan, muatan eksperimen UI di sini akan masuk ke pipa yang diatur
 * kontrak privasi-maksimal.
 *
 * Dua pipa ini TIDAK BOLEH berbagi nama. Yang menjaganya: `global-name-collision-test.js`
 * (memindai SUMBER seluruh repo secara programatik) dan `analytics-client-test.js`.
 *
 * DATA MURID: kunci penyimpanan `fiezel_ab_events` TIDAK berganti nama walau global-nya
 * berganti. Event A/B yang sudah ada di perangkat murid tetap terbaca dan tetap ikut
 * di-flush; tidak ada satu baris pun yang dibuang diam-diam.
 */

class FiezelABAnalytics {
  constructor() {
    /* JANGAN ganti nama kunci ini tanpa migrasi: ia sudah berisi event di perangkat murid. */
    this.EVENTS_LOG = 'fiezel_ab_events';
    this.MAX_EVENTS = 500;
    this.variant = window.FiezelUI?.getABVariant() || 'control';
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.metrics = {
      viewTransitions: 0,
      skeletonShown: 0,
      emptyStateShown: 0,
      interactionTime: {},
      screenTimes: {}
    };
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /* Track page/view transitions */
  trackViewTransition(fromView, toView) {
    this.metrics.viewTransitions++;
    this.logEvent('view_transition', {
      from: fromView,
      to: toView,
      variant: this.variant
    });
  }

  /* Track skeleton loading states */
  trackSkeletonShown(feature, duration = 0) {
    this.metrics.skeletonShown++;
    this.logEvent('skeleton_shown', {
      feature,
      duration_ms: duration,
      variant: this.variant
    });
  }

  /* Track empty states */
  trackEmptyStateShown(feature, reason = 'no_data') {
    this.metrics.emptyStateShown++;
    this.logEvent('empty_state_shown', {
      feature,
      reason,
      variant: this.variant
    });
  }


  /* Track screen time */
  trackScreenTime(screenName, durationMs) {
    if (!this.metrics.screenTimes[screenName]) {
      this.metrics.screenTimes[screenName] = 0;
    }
    this.metrics.screenTimes[screenName] += durationMs;

    this.logEvent('screen_time', {
      screen: screenName,
      duration_ms: durationMs,
      variant: this.variant
    });
  }

  /* Track user interactions */
  trackInteraction(action, target, metadata = {}) {
    if (!this.metrics.interactionTime[action]) {
      this.metrics.interactionTime[action] = 0;
    }
    this.metrics.interactionTime[action]++;

    this.logEvent('interaction', {
      action,
      target,
      variant: this.variant,
      ...metadata
    });
  }

  /* Jalan masuk untuk pemanggil UI (`fiezel-ui-manager.js#logABEvent`), yang mengirim satu
   * objek payload berisi `event`. Sebelum T-031 pemanggil itu memanggil `.track()` pada
   * global yang direbut berkas ini — padahal kelas ini TIDAK PERNAH punya `track()`, jadi
   * jalur itu akan melempar TypeError begitu benar-benar dipakai. Metode ini menutup lubang
   * itu di sisi pemilik nama, bukan di sisi pemanggil. */
  track(payload = {}) {
    const { event, ...rest } = payload || {};
    return this.logEvent(String(event || 'ab_event'), rest);
  }

  /* Generic event logging */
  logEvent(eventName, data = {}) {
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      variant: this.variant,
      ...data
    };

    this.appendEvent(event);
    this.maybeFlushEvents();
  }

  appendEvent(event) {
    try {
      let events = JSON.parse(localStorage.getItem(this.EVENTS_LOG) || '[]');
      events.push(event);

      if (events.length > this.MAX_EVENTS) {
        events = events.slice(-this.MAX_EVENTS);
      }

      localStorage.setItem(this.EVENTS_LOG, JSON.stringify(events));
    } catch (e) {
      console.error('[AB Analytics] Failed to log event:', e);
    }
  }

  /* Periodically send analytics to server */
  maybeFlushEvents() {
    // Only flush every 100 events or on page unload
    const events = this.getStoredEvents();
    if (events.length >= 100) {
      this.flushEvents();
    }
  }

  async flushEvents(endpoint = '/api/analytics') {
    const events = this.getStoredEvents();
    if (!events.length) return;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          variant: this.variant,
          events,
          metrics: this.getMetricsSummary()
        })
      });

      if (response.ok) {
        localStorage.removeItem(this.EVENTS_LOG);
      }
    } catch (e) {
      console.debug('[AB Analytics] Flush failed (will retry later):', e.message);
    }
  }

  getStoredEvents() {
    try {
      return JSON.parse(localStorage.getItem(this.EVENTS_LOG) || '[]');
    } catch {
      return [];
    }
  }

  getMetricsSummary() {
    const sessionDuration = new Date() - this.sessionStart;
    return {
      sessionId: this.sessionId,
      variant: this.variant,
      sessionDuration_ms: sessionDuration,
      viewTransitions: this.metrics.viewTransitions,
      skeletonShown: this.metrics.skeletonShown,
      emptyStateShown: this.metrics.emptyStateShown,
      screenTimes: this.metrics.screenTimes,
      interactionCounts: this.metrics.interactionTime
    };
  }

  /* Generate comparison report */
  generateSessionReport() {
    return {
      sessionId: this.sessionId,
      variant: this.variant,
      startTime: this.sessionStart.toISOString(),
      duration: new Date() - this.sessionStart,
      metrics: this.getMetricsSummary(),
      events: this.getStoredEvents()
    };
  }

  /* Export for reporting */
  exportReport() {
    const report = this.generateSessionReport();
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiezel_ab_report_${this.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Instance global — nama sendiri, tidak ambigu, tidak berbagi dengan modul analytics.
window.FiezelABAnalytics = new FiezelABAnalytics();

// Flush events on page unload
window.addEventListener('beforeunload', () => {
  window.FiezelABAnalytics?.flushEvents();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FiezelABAnalytics;
}
