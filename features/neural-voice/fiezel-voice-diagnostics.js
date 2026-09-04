/**
 * m025-48 diagnostics sink — the neural trace, moved off the audio thread's critical path.
 *
 * Every neural-voice module writes its trace with the same idiom:
 *
 *     JSON.parse(localStorage.getItem(KEY))  ->  push  ->  JSON.stringify  ->  setItem
 *
 * That is a synchronous read-modify-write of a ~25 KB array, and `localStorage` on iOS is
 * backed by a synchronous SQLite write. One utterance emits between 12 and 20 of them
 * (chunk_plan, generate_start, the event-loop watchdog, generate_ready, playback_start,
 * playback_done, plus the adapter's own enter/invoke/ready trio and the bootstrap's
 * speak_* pair). Measured on the diagnostics captured for m025-45 the burst lands while a
 * buffer is already rendering — the next chunk is generated DURING the current chunk's
 * playback by design — so the main thread stalls exactly when WebAudio needs it to be
 * free. A stalled main thread starves the render quantum, and a starved render quantum is
 * heard as the crackle OWNER reported.
 *
 * The trace itself is worth keeping: it is the only evidence channel this project has on
 * a physical device. So it is not thinned, it is rescheduled.
 *
 *   - the list is held in memory, so a record costs an array push instead of a parse;
 *   - while audio is scheduled (`begin()`/`end()` bracket every buffer the player owns)
 *     records only accumulate; the single write happens once the last buffer is done;
 *   - a flush re-reads the stored array first and appends onto it, so the modules that
 *     still write directly (the audibility patch, the diagnostics panel) are never
 *     clobbered by an in-memory snapshot that has gone stale.
 *
 * Retention, key and entry shape are unchanged, which is what keeps the panel, the
 * retention regression and the device-probe evidence reading exactly as before.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelVoiceDiagnostics = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var KEY = 'fiezel-neural-voice-diagnostics-v1';
  var LIMIT = 200;
  // A window that never closes would silently stop persisting the trace, so a stuck
  // begin() is released by time as well as by end().
  var MAX_CRITICAL_MS = 30000;

  var pending = [];
  var critical = 0;
  var criticalSince = 0;
  var lastEnv = null;

  function storageOf(env) {
    var target = env || lastEnv;
    if (!target) return null;
    try { return target.localStorage || null; } catch (_) { return null; }
  }

  function readStored(storage) {
    try {
      var raw = storage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }

  /** True when audio is on the wire and the main thread must stay out of storage. */
  function held() {
    if (critical <= 0) return false;
    if (criticalSince && Date.now() - criticalSince > MAX_CRITICAL_MS) {
      critical = 0;
      criticalSince = 0;
      return false;
    }
    return true;
  }

  /** Writes everything buffered so far. Safe to call at any time, including twice. */
  function flush(env) {
    if (!pending.length) return false;
    var storage = storageOf(env);
    if (!storage) { pending.length = 0; return false; }
    var batch = pending.splice(0, pending.length);
    try {
      var list = readStored(storage).concat(batch);
      storage.setItem(KEY, JSON.stringify(list.slice(-LIMIT)));
      return true;
    } catch (_) { return false; }
  }

  /**
   * Records one entry. Outside a critical window this persists immediately, so nothing
   * about the existing evidence timing changes; inside one it is buffered until the
   * audio the window covers has finished.
   */
  function record(entry, env) {
    if (env) lastEnv = env;
    if (!entry || typeof entry !== 'object') return false;
    pending.push(entry);
    if (pending.length > LIMIT) pending.splice(0, pending.length - LIMIT);
    if (held()) return false;
    return flush(env);
  }

  /** Opens an audio-critical window. Nested calls are counted, not overwritten. */
  function begin() {
    critical += 1;
    if (critical === 1) criticalSince = Date.now();
    return critical;
  }

  /** Closes one window; the last one out writes the buffered trace. */
  function end(env) {
    if (critical > 0) critical -= 1;
    if (critical === 0) {
      criticalSince = 0;
      flush(env);
    }
    return critical;
  }

  function state() {
    return { key: KEY, limit: LIMIT, pending: pending.length, critical: critical };
  }

  /** Test seam: drops buffered state without touching what is already stored. */
  function reset() {
    pending.length = 0;
    critical = 0;
    criticalSince = 0;
    lastEnv = null;
  }

  return Object.freeze({
    KEY: KEY,
    LIMIT: LIMIT,
    MAX_CRITICAL_MS: MAX_CRITICAL_MS,
    record: record,
    begin: begin,
    end: end,
    flush: flush,
    state: state,
    reset: reset
  });
}));
