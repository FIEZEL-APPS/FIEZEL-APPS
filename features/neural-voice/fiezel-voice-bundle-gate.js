/**
 * m025-43 mandatory one-batch voice download — the third install prompt.
 *
 * OWNER's flow on a fresh PWA install is three prompts: notifications, Puter login, and
 * this one. m025-42 shipped it as an offer with a "later" button; OWNER's correction is
 * that FIEZEL teaches by speaking, so the voices are not optional and the sheet must stay
 * on screen until the download finishes.
 *
 * Design decisions that matter:
 *
 *   - Both engines in one pass. English is the mandatory engine and Indonesian is the
 *     tutor voice; asking twice is what left users with a half-installed Classroom.
 *   - Sequential, not raced: two large WASM bundles on a phone connection.
 *   - Only completion removes the sheet. There is no dismissal path, by design.
 *   - "Never again" is decided by the ENGINES, not by a flag alone. A stored flag that
 *     disagrees with an empty cache is exactly how a user ends up permanently unable to
 *     re-download; so the flag is only trusted when both engines still report prepared.
 *   - It self-starts and re-checks on a timer, because the app.js call site runs before
 *     later <script> tags exist and silently reached nothing.
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

  /** The gate is shown whenever a bundle is genuinely missing. */
  function shouldPrompt(status) {
    var s = status || {};
    // m025-43 OWNER: the download is now mandatory. There is no "later" and no session
    // dismissal - while a bundle is missing the sheet is shown, including while the
    // download itself runs, because closing it was how a half-installed app happened.
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

    function updateProgressUi() {
      var p = status().progress;
      var bar = doc.getElementById('voiceBundleBar');
      if (bar && bar.style) bar.style.width = p.percent + '%';
      var text = doc.getElementById('voiceBundleProgress');
      if (text) {
        text.textContent = downloading
          ? 'Mengunduh ' + p.completed + ' / ' + p.total + ' berkas (' + p.percent + '%). Biarkan layar ini terbuka sampai selesai.'
          : 'Semua suara neural siap dipakai offline.';
      }
      var pill = doc.getElementById('voiceBundlePill');
      if (pill) pill.textContent = 'Mengunduh suara ' + p.percent + '%';
    }

    // Only completion closes the sheet. Nothing else may call this.
    function closeSheet() {
      removeNode('voiceBundleSheet');
      removeNode('voiceBundlePill');
      if (doc.body && doc.body.classList) doc.body.classList.remove('voice-bundle-locked');
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
        // Audit UX Roadmap #3: nada suportif, tanpa kata "wajib" dan tanpa ancaman
        // "sebelum aplikasi bisa dipakai". Manfaatnya yang dijelaskan, bukan syaratnya.
        '<div class="voice-bundle-mark">FIEZEL NEURAL VOICE</div>' +
        '<h2>Siapkan suara FIEZEL</h2>' +
        '<p>Satu paket berisi suara Inggris dan Indonesia. FIEZEL mengajar lewat suara, jadi paket ini disiapkan sekali di awal — setelah itu semuanya jalan penuh tanpa internet.</p>' +
        '<div class="voice-bundle-track"><span id="voiceBundleBar" style="width:' + st.progress.percent + '%"></span></div>' +
        '<p id="voiceBundleProgress" class="voice-bundle-progress">Sekitar 210 MB sekali unduh. Jangan tutup aplikasi sampai selesai.</p>' +
        '<div class="voice-bundle-actions">' +
        '<button type="button" class="primary" id="voiceBundleStart">Unduh sekarang</button>' +
        '</div></div>';
      doc.body.appendChild(sheet);
      if (doc.body && doc.body.classList) doc.body.classList.add('voice-bundle-locked');
      var start = doc.getElementById('voiceBundleStart');
      if (start) start.addEventListener('click', function () { startDownload(); });
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
      var startButton = doc.getElementById('voiceBundleStart');
      if (startButton) { startButton.disabled = true; startButton.textContent = 'Mengunduh…'; }
      updateProgressUi();
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
      if (!shouldPrompt(status())) { closeSheet(); return false; }
      // Never stack on top of the notification gate: that gate is the first prompt and
      // this one is the third.
      //
      // m025-80 AUDIT (Bagian 1 + Roadmap #1): the same rule now covers the brand splash
      // and the onboarding flow. Both mount as full-screen overlays, and this sheet used
      // to open straight on top of them - so a new learner met a mandatory download
      // prompt while still being introduced to the app. Every gate waits for the
      // introduction to finish; only the order changed, not whether the gate runs.
      var gateOpen = false;
      try {
        var welcome = doc.getElementById('welcome');
        // Dulu baris ini juga menuntut kelas 'notification-locked' di <body>. Kelas itu
        // tidak pernah dipasang lagi sejak notifikasi berhenti menjadi syarat masuk, jadi
        // syarat gandanya akan selalu salah dan lembar unduhan ini muncul TEPAT di atas
        // undangan notifikasi - dua lapisan bertumpuk, persis yang aturan ini cegah.
        // Panel yang terlihat sudah cukup: mengunci atau tidak, ia sedang di layar.
        gateOpen = !!(welcome && !welcome.classList.contains('hidden'))
          || !!doc.querySelector('.fiezel-splash:not([hidden]), .fiezel-ob')
          || !!doc.body.classList.contains('auth-locked');
      } catch (_) {}
      if (gateOpen) return false;
      // Rebuilding an open sheet every tick would drop the button's handler mid-tap and
      // flicker the progress bar; only refresh what changes.
      if (doc.getElementById('voiceBundleSheet')) { updateProgressUi(); return true; }
      openSheet();
      return true;
    }

    // m025-43: OWNER saw no popup at all. The call site in app.js runs while app.js is
    // still parsing, so anything loaded after it was undefined at that moment. The gate
    // now drives itself and keeps checking, which no load order can defeat.
    function watch() {
      maybePrompt();
      if (typeof target.setInterval !== 'function') return;
      var timer = target.setInterval(function () {
        if (downloading) { updateProgressUi(); return; }
        maybePrompt();
      }, 3000);
      if (timer && timer.unref) timer.unref();
    }

    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', function () { target.setTimeout(watch, 800); });
    } else if (typeof target.setTimeout === 'function') {
      target.setTimeout(watch, 800);
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
