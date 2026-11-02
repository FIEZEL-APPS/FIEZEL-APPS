/**
 * FIEZEL — fiezel-anti-tamper.js · ANTI-COPY, DEVTOOLS SHIELD & DOMAIN ORIGIN LOCK
 *
 * ============================================================================
 * KENAPA MODUL INI ADA
 * ============================================================================
 * Melindungi antarmuka pembelajaran, bank soal, dan kode aplikasi FIEZEL dari:
 * 1. PENCURIAN SOAL LANGSUNG DARI LAYAR (Scraping & Copy-Paste):
 *    - Menonaktifkan `user-select` pada kartu kuis, stem pertanyaan, dan token susun kata.
 *    - Memblokir menu klik kanan (`contextmenu`) pada seluruh permukaan kuis.
 *    - Mencegat event `copy` pada area kuis dan menggantinya dengan pemberitahuan hak cipta.
 *    - Form input murid (<input>, <textarea>) TETAP 100% normal dan bisa diketik/diedit.
 *
 * 2. PINTASAN INSPEKSI & SUMBER KODE (DevTools & Save Page):
 *    - Memblokir F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, dan Ctrl+S.
 *    - Otomatis dinonaktifkan di lingkungan pengujian lokal (localhost, 127.0.0.1, headless probe,
 *      dan runner CI GitHub Actions) agar tidak mengganggu otomasi pengujian atau debugging pengembang.
 *
 * 3. PEMBAJAKAN HOSTING (Domain Origin Boundary):
 *    - Menjamin skrip FIEZEL hanya berjalan pada domain resmi (fiezel.my.id, fiezel-apps.github.io),
 *      lingkungan pengembangan lokal, atau Webview resmi Android (Capacitor/file://).
 *    - Jika ada pihak yang menyalin berkas HTML/JS ke domain liar, aplikasi otomatis mengunci diri.
 */

(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAntiTamper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var doc = typeof root !== 'undefined' && root.document ? root.document : null;

  function isLocalHost(h, p) {
    if (!h) return false;
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.indexOf('192.168.') === 0 || h.indexOf('10.') === 0 || h.slice(-6) === '.local') return true;
    if (p === '3000' || p === '3005' || p === '4173' || p === '5173' || p === '8080') return true;
    return false;
  }

  function isLocalOrTest() {
    try {
      if (typeof root === 'undefined' || !root.location) return true; // Node / test env
      if (typeof root.isLocalTestServer === 'function' && root.isLocalTestServer()) return true;

      var h = (root.location.hostname || '').toLowerCase();
      var p = String(root.location.port || '');
      var isLocal = isLocalHost(h, p);

      // Celah navigator.webdriver ditutup di domain produksi:
      // navigator.webdriver HANYA diizinkan membypass proteksi bila berada di host lokal / dev runner!
      // Pada domain produksi (fiezel.my.id, dsb), webdriver adalah bot scraper otomatis, BUKAN pengembang lokal.
      if (isLocal) {
        if (typeof navigator !== 'undefined' && navigator.webdriver) return true;
        return true;
      }
    } catch (_) {}
    return false;
  }

  function isAllowedDomain() {
    try {
      if (typeof root === 'undefined' || !root.location) return true; // Node / test env
      var proto = (root.location.protocol || '').toLowerCase();
      if (proto === 'capacitor:' || proto === 'file:' || proto === 'ionic:') return true;
      if (root.Capacitor || root._isAndroidApp || root.isNativeApp) return true;
      if (isLocalOrTest()) return true;

      var h = (root.location.hostname || '').toLowerCase();
      if (h === 'fiezel.my.id' || h === 'www.fiezel.my.id' || h === 'fiezel-apps.github.io') return true;
      if (h.slice(-13) === '.fiezel.my.id') return true;
    } catch (_) {
      return true;
    }
    return false;
  }

  function verifyDomainIntegrity() {
    if (!doc || !doc.body) return true;
    if (!isAllowedDomain()) {
      try {
        doc.body.innerHTML = [
          '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FDFAF3;color:#0F172A;font-family:sans-serif;padding:24px;text-align:center;">',
          '  <div style="max-width:440px;background:#fff;border:2px solid #0F172A;border-radius:24px;padding:32px;box-shadow:0 8px 0 #0F172A;">',
          '    <div style="font-size:48px;margin-bottom:16px;">🛡️</div>',
          '    <h2 style="font-size:20px;font-weight:800;margin:0 0 12px 0;">Unauthorized Domain Access</h2>',
          '    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px 0;">FIEZEL is protected intellectual property and only accessible via official <b>fiezel.my.id</b> or Google Play Store.</p>',
          '    <a href="https://fiezel.my.id/app/" style="display:inline-block;background:#2563EB;color:#fff;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none;">Visit Official App</a>',
          '  </div>',
          '</div>'
        ].join('\n');
      } catch (_) {}
      return false;
    }
    return true;
  }

  function installAntiCopy() {
    if (!doc) return;

    // 1. Injeksi aturan CSS anti-seleksi untuk kartu soal & kuis
    try {
      if (!doc.getElementById('fz-anti-tamper-styles')) {
        var style = doc.createElement('style');
        style.id = 'fz-anti-tamper-styles';
        style.textContent = [
          '.quiz-shell, .quiz-stage, .quiz-bubble, #quizStem, .passage-reading, .card-reading, .token-rail, .card-sentence, [data-fz-protected] {',
          '  -webkit-user-select: none !important;',
          '  -moz-user-select: none !important;',
          '  -ms-user-select: none !important;',
          '  user-select: none !important;',
          '  -webkit-touch-callout: none !important;',
          '  -webkit-user-drag: none !important;',
          '}',
          'input, textarea, [contenteditable="true"] {',
          '  -webkit-user-select: text !important;',
          '  -moz-user-select: text !important;',
          '  -ms-user-select: text !important;',
          '  user-select: text !important;',
          '}'
        ].join('\n');
        (doc.head || doc.documentElement).appendChild(style);
      }
    } catch (_) {}

    // 2. Blokir klik kanan (context menu) pada area kuis dan kartu materi
    doc.addEventListener('contextmenu', function (e) {
      if (!e || !e.target) return;
      var tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        return; // Izinkan klik kanan di dalam kotak isian teks
      }
      if (e.target.closest && e.target.closest('.quiz-shell, .card, #app, .dialog')) {
        e.preventDefault();
      }
    }, { capture: true, passive: false });

    // 3. Cegat penyalinan (copy) pada konten pembelajaran kuis dan bubuhkan stempel forensik
    doc.addEventListener('copy', function (e) {
      if (!e || !e.target) return;
      var target = e.target;
      if (target.closest && target.closest('.quiz-shell, #quizStem, .passage-reading')) {
        e.preventDefault();
        if (e.clipboardData) {
          var sig = (root && root.FiezelWatermark && typeof root.FiezelWatermark.getLearnerSignature === 'function')
            ? root.FiezelWatermark.getLearnerSignature()
            : 'verified';
          e.clipboardData.setData('text/plain', 'Protected Intellectual Property — FIEZEL (fiezel.my.id) [' + sig + ']');
        }
      }
    }, { capture: true, passive: false });
  }

  function installShortcutShield() {
    if (!root || !root.addEventListener) return;
    if (isLocalOrTest()) return; // Tetap izinkan pintasan inspect saat pengujian / development

    root.addEventListener('keydown', function (e) {
      if (!e) return;
      var key = e.key || '';
      var code = e.keyCode || 0;
      var ctrlOrMeta = e.ctrlKey || e.metaKey;
      var shift = e.shiftKey;

      // F12
      if (key === 'F12' || code === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (DevTools Inspect)
      // Ctrl+Shift+J / Cmd+Option+J (Console)
      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      if (ctrlOrMeta && shift && (key === 'I' || key === 'i' || key === 'J' || key === 'j' || key === 'C' || key === 'c' || code === 73 || code === 74 || code === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+Option+U (View Source)
      if (ctrlOrMeta && (key === 'U' || key === 'u' || code === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S / Cmd+S (Save Page HTML)
      if (ctrlOrMeta && (key === 'S' || key === 's' || code === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { capture: true, passive: false });
  }

  function init() {
    if (!verifyDomainIntegrity()) return;
    installAntiCopy();
    installShortcutShield();
  }

  // Jalankan inisialisasi otomatis jika di peramban
  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    init: init,
    isLocalHost: isLocalHost,
    isLocalOrTest: isLocalOrTest,
    isAllowedDomain: isAllowedDomain,
    verifyDomainIntegrity: verifyDomainIntegrity,
    installAntiCopy: installAntiCopy,
    installShortcutShield: installShortcutShield
  };
});
