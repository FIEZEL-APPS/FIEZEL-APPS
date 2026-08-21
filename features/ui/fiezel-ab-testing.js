/* FIEZEL A/B Testing & Analytics Framework */

class FiezelABAnalytics {
  constructor() {
    this.EVENTS_LOG = 'fiezel_ab_events';
    this.MAX_EVENTS = 500;
    this.variant = window.FiezelUI?.getABVariant() || 'control';
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.metrics = {
      viewTransitions: 0,
      skeletonShown: 0,
      emptyStateShown: 0,
      darkModeToggle: 0,
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

  /* Track dark mode usage */
  trackDarkModeToggle(toTheme) {
    this.metrics.darkModeToggle++;
    this.logEvent('dark_mode_toggled', {
      to_theme: toTheme,
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
      darkModeToggle: this.metrics.darkModeToggle,
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

// Global instance
window.FiezelAnalytics = new FiezelABAnalytics();

// Flush events on page unload
window.addEventListener('beforeunload', () => {
  window.FiezelAnalytics?.flushEvents();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FiezelAnalytics;
}
