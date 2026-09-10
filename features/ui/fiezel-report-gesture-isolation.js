/**
 * FIEZEL — isolasi gestur untuk Creator Report.
 *
 * Isi berkas ini SEBELUMNYA adalah blok <script> inline di index.html, tepat di bawah
 * <script src="./app.js">. Ia dipindah ke berkas sendiri karena app.js kini dimuat dengan
 * `defer`, dan blok inline TIDAK ikut ditunda: ia akan dijalankan SEBELUM app.js sempat
 * dieksekusi, lalu `const baseFlushReportQueue = flushReportQueue;` melempar ReferenceError
 * di baris pertama boot. Sebagai berkas ber-`defer` ia kembali berjalan sesudah app.js,
 * persis seperti sebelumnya - lihat tests/boot-order-test.js yang menjaga aturan itu.
 *
 * Perilakunya sendiri tidak diubah sama sekali.
 */
/* FIEZEL_REPORT_GESTURE_ISOLATION_START */
(() => {
  const baseFlushReportQueue = flushReportQueue;
  const baseSendCreatorReport = sendCreatorReport;
  const baseMaybeSendAccessReport = maybeSendAccessReport;

  function creatorReportAuthReadyForAutomatic() {
    try {
      return typeof puter !== 'undefined' && !!puter?.authToken && puter?.auth?.isSignedIn?.() === true;
    } catch {
      return false;
    }
  }

  function deferAutomaticReport(task) {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          Promise.resolve(task()).then(resolve, () => resolve(false));
        } catch {
          resolve(false);
        }
      }, 0);
    });
  }

  flushReportQueue = function({ allowInteractiveAuth = false } = {}) {
    if (allowInteractiveAuth) return baseFlushReportQueue();
    if (!creatorReportAuthReadyForAutomatic()) return Promise.resolve(false);
    return deferAutomaticReport(() => baseFlushReportQueue());
  };

  sendCreatorReport = async function(reason = 'manual', force = false, { allowInteractiveAuth = (reason === 'manual' || reason === 'consent_enabled') } = {}) {
    if (allowInteractiveAuth) return baseSendCreatorReport(reason, force);
    if (!creatorReportAuthReadyForAutomatic()) {
      if (!state.preferences?.reportConsent || !validReportEndpoint(state.preferences?.reportEndpoint)) return false;
      if (!force && state.totalAnswered <= Number(state.reportMeta?.lastSentAnswered || 0)) return false;
      queueCreatorReport(buildCreatorReport(reason));
      return false;
    }
    return deferAutomaticReport(() => baseSendCreatorReport(reason, force));
  };

  maybeSendAccessReport = function({ allowInteractiveAuth = false } = {}) {
    if (allowInteractiveAuth) return baseMaybeSendAccessReport();
    if (!creatorReportAuthReadyForAutomatic()) return Promise.resolve(false);
    return deferAutomaticReport(() => baseMaybeSendAccessReport());
  };

  globalThis.creatorReportAuthReadyForAutomatic = creatorReportAuthReadyForAutomatic;
})();
/* FIEZEL_REPORT_GESTURE_ISOLATION_END */
