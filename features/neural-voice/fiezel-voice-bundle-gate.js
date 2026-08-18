/**
 * m025-42 one-batch voice download gate — the third install popup.
 *
 * OWNER's flow on a fresh PWA install is three prompts: notifications, Puter login, and
 * now this one. It asks once, downloads BOTH neural bundles in a single batch, and then
 * never appears again.
 *
 * Design decisions that matter:
 *
 *   - Both engines in one pass. English is the mandatory engine and Indonesian is the
 *     tutor voice; asking twice is what left users with a half-installed Classroom.
 *   - The download continues in the background. The sheet can be dismissed to a progress
 *     pill, and the promise keeps running - it is fetch + CacheStorage, so nothing about
 *     it needs the sheet to stay open. The gate never blocks the app.
 *   - "Never again" is decided by the ENGINES, not by a flag alone. A stored flag that
 *     disagrees with an empty cache is exactly how a user ends up permanently unable to
 *     re-download; so the flag is only trusted when both engines still report prepared.
 *
 * Pure logic lives in shouldPrompt/progressOf so it is testable in Node without a DOM.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelVoiceBundleGate = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-voice-bundle-gate-v1';
  var STORAGE_KEY = 'fiezel-voice-bundle-v1';

  /**
   * The gate is shown only when a bundle is genuinely missing.
   * `dismissed` suppresses it for the session only: a user who says "later" is not asked
   * again until the next launch, but the offer is never lost permanently.
   */
  function shouldPrompt(status) {
    var s = status || {};
    if (s.downloading) return false;
    if (s.dismissed) return false;
    return !(s.englishPrepared && s.indonesianPrepared);
  }

  /** Completed/total across both bundles, as one number the user can read. */
  function progressOf(parts) {
    var list = Array.isArray(parts) ? parts : [];
    var completed = 0;
    var total = 0;
    list.forEach(function (part) {
      completed += Math.max(0, Number(part && part.completed) || 0);
      total += Math.max(0, Number(part && part.total) || 0);
    });
    var percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    return { completed: completed, total: total, percent: percent };
  }

  function install(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target || !target.document || target.__fiezelVoiceBundleGateInstalled) return false;
    target.__fiezelVoiceBundleGateInstalled = true;

    var doc = target.document;
    var dismissed = false;
    var downloading = false;
    var activeRun = null;
    var parts = { english: { completed: 0, total: 0 }, indonesian: { completed: 0, total: 0 } };

    function readFlag() {
      try {
        var raw = JSON.parse(target.localStorage.getItem(STORAGE_KEY) || 'null');
        return !!(raw && raw.schema === SCHEMA && raw.completed === true);
      } catch (_) { return false; }
    }
    function writeFlag(done) {
      try {
        target.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          schema: SCHEMA, completed: done === true, at: Date.now()
        }));
      } catch (_) {}
    }

    function englishPrepared() {
      try {
        var st = target.FiezelVoiceRuntime && target.FiezelVoiceRuntime.status
          ? target.FiezelVoiceRuntime.status() : null;
        return !!(st && st.prepared);
      } catch (_) { return false; }
    }
    function indonesianPrepared() {
      try {
        var st = target.FiezelIndonesianVoice && target.FiezelIndonesianVoice.status
          ? target.FiezelIndonesianVoice.status() : null;
        return !!(st && st.prepared);
      } catch (_) { return false; }
    }

    function status() {
      var english = englishPrepared();
      var indonesian = indonesianPrepared();
      return Object.freeze({
        schema: SCHEMA,
        englishPrepared: english,
        indonesianPrepared: indonesian,
        // A stored "done" that the engines contradict is stale, and must not silence the
        // offer - that is how a user gets stuck with no voice and no way to fetch it.
        completed: english && indonesian && readFlag(),
        downloading: downloading,
        dismissed: dismissed,
        progress: progressOf([parts.english, parts.indonesian])
      });
    }

    // ---- UI ---------------------------------------------------------------------

    function el(tag, className, html) {
      var node = doc.createElement(tag);
      if (className) node.className = className;
      if (html != null) node.innerHTML = html;
      return node;
    }

    function removeNode(id) {
      var existing = doc.getElementById(id);
      if (existing && existing.remove) existing.remove();
    }

    function renderPill() {
      removeNode('voiceBundlePill');
      if (!downloading) return;
      var pill = el('div', 'voice-bundle-pill', '');
      pill.id = 'voiceBundlePill';
      pill.setAttribute('role', 'status');
      pill.textContent = 'Mengunduh suara ' + status().progress.percent + '%';
      doc.body.appendChild(pill);
    }

    function updateProgressUi() {
      var p = status().progress;
      var bar = doc.getElementById('voiceBundleBar');
      if (bar && bar.style) bar.style.width = p.percent + '%';
      var text = doc.getElementById('voiceBundleProgress');
      if (text) {
        text.textContent = downloading
          ? 'Mengunduh ' + p.completed + ' / ' + p.total + ' berkas (' + p.percent + '%). Boleh ditutup, unduhan lanjut di latar belakang.'
          : 'Semua suara neural siap dipakai offline.';
      }
      var pill = doc.getElementById('voiceBundlePill');
      if (pill) pill.textContent = 'Mengunduh suara ' + p.percent + '%';
    }

    function closeSheet() {
      removeNode('voiceBundleSheet');
      renderPill();
    }

    function openSheet() {
      removeNode('voiceBundleSheet');
      var st = status();
      var sheet = el('div', 'voice-bundle-sheet');
      sheet.id = 'voiceBundleSheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'false');
      sheet.setAttribute('aria-label', 'Unduh suara neural FIEZEL');
      sheet.innerHTML =
        '<div class="voice-bundle-panel">' +
        '<div class="voice-bundle-mark">FIEZEL NEURAL VOICE · SEKALI UNDUH</div>' +
        '<h2>Unduh semua suara sekarang</h2>' +
        '<p>Satu batch untuk suara Inggris dan Indonesia. Setelah selesai, FIEZEL bicara penuh tanpa internet dan popup ini tidak muncul lagi.</p>' +
        '<div class="voice-bundle-track"><span id="voiceBundleBar" style="width:' + st.progress.percent + '%"></span></div>' +
        '<p id="voiceBundleProgress" class="voice-bundle-progress">Sekitar 210 MB sekali unduh. Unduhan tetap berjalan walau popup ditutup.</p>' +
        '<div class="voice-bundle-actions">' +
        '<button type="button" id="voiceBundleLater">Nanti saja</button>' +
        '<button type="button" class="primary" id="voiceBundleStart">Unduh semua suara</button>' +
        '</div></div>';
      doc.body.appendChild(sheet);
      var start = doc.getElementById('voiceBundleStart');
      if (start) start.addEventListener('click', function () { startDownload(); });
      var later = doc.getElementById('voiceBundleLater');
      if (later) later.addEventListener('click', function () { dismissed = true; closeSheet(); });
      updateProgressUi();
      try { if (target.lucide && target.lucide.createIcons) target.lucide.createIcons(); } catch (_) {}
    }

    // ---- download ---------------------------------------------------------------

    function prepareEnglish() {
      var runtime = target.FiezelVoiceRuntime;
      if (!runtime || typeof runtime.prepare !== 'function') return Promise.reject(new Error('english_runtime_missing'));
      if (englishPrepared()) return Promise.resolve(true);
      return runtime.prepare({
        onProgress: function (p) {
          parts.english = { completed: Number(p && p.completed) || 0, total: Number(p && p.total) || 0 };
          updateProgressUi();
        }
      });
    }

    function prepareIndonesian() {
      var indo = target.FiezelIndonesianVoice;
      if (!indo || typeof indo.prepare !== 'function') return Promise.reject(new Error('indonesian_runtime_missing'));
      if (indonesianPrepared()) return Promise.resolve(true);
      return indo.prepare({
        onProgress: function (p) {
          parts.indonesian = { completed: Number(p && p.completed) || 0, total: Number(p && p.total) || 0 };
          updateProgressUi();
        }
      });
    }

    /**
     * Sequential, not parallel: both bundles are large and the WASM runtimes initialise
     * after their own assets land. Racing them on a phone connection is how a download
     * ends up half-written in the cache.
     */
    function startDownload() {
      if (activeRun) return activeRun;
      downloading = true;
      dismissed = true;
      var startButton = doc.getElementById('voiceBundleStart');
      if (startButton) { startButton.disabled = true; startButton.textContent = 'Mengunduh…'; }
      updateProgressUi();
      renderPill();
      activeRun = prepareEnglish()
        .then(function () { return prepareIndonesian(); })
        .then(function () {
          downloading = false;
          activeRun = null;
          writeFlag(englishPrepared() && indonesianPrepared());
          updateProgressUi();
          removeNode('voiceBundlePill');
          closeSheet();
          try { if (typeof target.showToast === 'function') target.showToast('Semua suara neural siap dipakai offline.'); } catch (_) {}
          return true;
        })
        .catch(function (error) {
          downloading = false;
          activeRun = null;
          writeFlag(false);
          removeNode('voiceBundlePill');
          var text = doc.getElementById('voiceBundleProgress');
          if (text) text.textContent = 'Unduhan berhenti: ' + String((error && error.message) || error) + '. Bisa dicoba lagi.';
          var button = doc.getElementById('voiceBundleStart');
          if (button) { button.disabled = false; button.textContent = 'Coba lagi'; }
          throw error;
        });
      // The caller may ignore this promise; the rejection is already handled above.
      activeRun.catch(function () {});
      return activeRun;
    }

    function maybePrompt() {
      if (!shouldPrompt(status())) return false;
      openSheet();
      return true;
    }

    target.FiezelVoiceBundleGate = Object.freeze({
      schema: SCHEMA,
      storageKey: STORAGE_KEY,
      status: status,
      shouldPrompt: shouldPrompt,
      progressOf: progressOf,
      maybePrompt: maybePrompt,
      open: openSheet,
      start: startDownload
    });
    return true;
  }

  var api = Object.freeze({
    schema: SCHEMA,
    storageKey: STORAGE_KEY,
    shouldPrompt: shouldPrompt,
    progressOf: progressOf,
    install: install
  });

  if (typeof globalThis !== 'undefined' && globalThis.document) {
    try { install(globalThis); } catch (_) {}
  }
  return api;
}));
