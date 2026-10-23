/**
 * FIEZEL Brain Sync Protocol — kontrak murni untuk sinkronisasi learner lintas-device.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Braincore tetap local-first. Network, auth, IndexedDB, Cloudflare Worker, Durable Object,
 * dan persistence adalah tanggung jawab host. Modul ini hanya menentukan bentuk bukti yang
 * aman untuk diseberangkan dan aturan konflik yang tidak boleh berubah antar host.
 *
 * Invariansi keras:
 * - identitas learner TIDAK pernah datang dari payload. Server harus menurunkannya dari sesi;
 * - attemptId berbeda makna dari questionId: satu soal boleh dijawab berkali-kali;
 * - retry event yang sama idempoten, tetapi dua event berbeda pada deviceSeq yang sama = konflik;
 * - revision basi tidak pernah diselesaikan dengan last-write-wins;
 * - modul murni: tanpa DOM, network, storage, jam tersembunyi, atau RNG tersembunyi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBrainSyncProtocol = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var EVENT_SCHEMA = 'fiezel-brain-sync-attempt-v1';
  var BATCH_SCHEMA = 'fiezel-brain-sync-batch-v1';
  var CHECKPOINT_SCHEMA = 'fiezel-brain-sync-checkpoint-v1';
  var PROTOCOL_VERSION = '1.0';

  var UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/;
  var REV_RE = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,79}$/;
  var HASH_RE = /^[0-9a-f]{64}$/i;
  var LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  var DOMAINS = Object.freeze(['grammar', 'vocab', 'reading', 'listening', 'speaking', 'writing']);

  var EVENT_KEYS = Object.freeze([
    'schema', 'eventId', 'attemptId', 'deviceId', 'deviceSeq', 'baseRevision',
    'questionId', 'contentRevision', 'domain', 'level', 'skill', 'practiceMode',
    'correct', 'kappa', 'predicted', 'responseMs', 'occurredAt', 'brainBundle'
  ]);
  var BATCH_KEYS = Object.freeze(['schema', 'protocol', 'deviceId', 'baseRevision', 'events']);
  var CHECKPOINT_KEYS = Object.freeze([
    'schema', 'revision', 'serverSeq', 'stateHash', 'createdAt', 'brainBundle'
  ]);

  function reject(reason, detail) {
    var out = {
      ok: false,
      reason: reason,
      rationale: 'brain_sync_reject_' + reason,
      confidence: 1
    };
    if (detail !== undefined) out.detail = detail;
    return out;
  }

  function accept(value, extra) {
    var out = { ok: true, value: value, rationale: 'brain_sync_accept', confidence: 1 };
    if (extra && typeof extra === 'object') {
      for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    }
    return out;
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function ownForeignKey(obj, allowed) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) if (allowed.indexOf(keys[i]) === -1) return keys[i];
    return '';
  }

  function safeInt(value, lo, hi) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= lo && value <= hi;
  }

  function unit(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 1;
  }

  function optionalId(value) {
    if (value === undefined || value === null || value === '') return '';
    return typeof value === 'string' && ID_RE.test(value) ? value : null;
  }

  function optionalRev(value) {
    if (value === undefined || value === null || value === '') return '';
    return typeof value === 'string' && REV_RE.test(value) ? value : null;
  }

  function normalizeEvent(raw) {
    if (!isPlainObject(raw)) return reject('event_not_object');
    var foreign = ownForeignKey(raw, EVENT_KEYS);
    if (foreign) return reject('foreign_field', foreign);
    if (raw.schema !== EVENT_SCHEMA) return reject('event_schema');
    if (typeof raw.eventId !== 'string' || !UUID_V4_RE.test(raw.eventId)) return reject('event_id');
    if (typeof raw.attemptId !== 'string' || !UUID_V4_RE.test(raw.attemptId)) return reject('attempt_id');
    if (typeof raw.deviceId !== 'string' || !UUID_V4_RE.test(raw.deviceId)) return reject('device_id');
    if (!safeInt(raw.deviceSeq, 1, Number.MAX_SAFE_INTEGER)) return reject('device_seq');
    if (!safeInt(raw.baseRevision, 0, Number.MAX_SAFE_INTEGER)) return reject('base_revision');
    if (typeof raw.questionId !== 'string' || !ID_RE.test(raw.questionId)) return reject('question_id');
    if (typeof raw.contentRevision !== 'string' || !REV_RE.test(raw.contentRevision)) return reject('content_revision');
    if (typeof raw.domain !== 'string' || DOMAINS.indexOf(raw.domain) === -1) return reject('domain');
    if (typeof raw.correct !== 'boolean') return reject('correct');
    if (!safeInt(raw.occurredAt, 0, Number.MAX_SAFE_INTEGER)) return reject('occurred_at');

    var level = optionalId(raw.level);
    if (level === null || (level && LEVELS.indexOf(level) === -1)) return reject('level');
    var skill = optionalId(raw.skill);
    if (skill === null) return reject('skill');
    var practiceMode = optionalId(raw.practiceMode);
    if (practiceMode === null) return reject('practice_mode');
    var brainBundle = optionalRev(raw.brainBundle);
    if (brainBundle === null) return reject('brain_bundle');
    if (raw.kappa !== undefined && !unit(raw.kappa)) return reject('kappa');
    if (raw.predicted !== undefined && !unit(raw.predicted)) return reject('predicted');
    if (raw.responseMs !== undefined && !safeInt(raw.responseMs, 0, 3600000)) return reject('response_ms');

    var event = {
      schema: EVENT_SCHEMA,
      eventId: raw.eventId,
      attemptId: raw.attemptId,
      deviceId: raw.deviceId,
      deviceSeq: raw.deviceSeq,
      baseRevision: raw.baseRevision,
      questionId: raw.questionId,
      contentRevision: raw.contentRevision,
      domain: raw.domain,
      correct: raw.correct,
      occurredAt: raw.occurredAt
    };
    if (level) event.level = level;
    if (skill) event.skill = skill;
    if (practiceMode) event.practiceMode = practiceMode;
    if (raw.kappa !== undefined) event.kappa = raw.kappa;
    if (raw.predicted !== undefined) event.predicted = raw.predicted;
    if (raw.responseMs !== undefined) event.responseMs = raw.responseMs;
    if (brainBundle) event.brainBundle = brainBundle;
    return accept(event);
  }

  function buildAttemptEvent(input) {
    var raw = {};
    var source = isPlainObject(input) ? input : {};
    for (var i = 0; i < EVENT_KEYS.length; i++) {
      var key = EVENT_KEYS[i];
      if (key === 'schema') raw.schema = EVENT_SCHEMA;
      else if (Object.prototype.hasOwnProperty.call(source, key)) raw[key] = source[key];
    }
    var foreign = ownForeignKey(source, EVENT_KEYS.filter(function (k) { return k !== 'schema'; }));
    if (foreign) return reject('foreign_field', foreign);
    return normalizeEvent(raw);
  }

  function eventSignature(event) {
    return JSON.stringify(event);
  }

  function dedupeEvents(rows) {
    if (!Array.isArray(rows)) return reject('events_not_array');
    if (rows.length > 500) return reject('events_too_many');
    var byEvent = Object.create(null);
    var bySeq = Object.create(null);
    var out = [];
    var duplicates = 0;

    for (var i = 0; i < rows.length; i++) {
      var normalized = normalizeEvent(rows[i]);
      if (!normalized.ok) return reject(normalized.reason, { index: i, detail: normalized.detail });
      var event = normalized.value;
      var sig = eventSignature(event);
      var existingEvent = byEvent[event.eventId];
      if (existingEvent !== undefined) {
        if (existingEvent !== sig) return reject('event_id_conflict', event.eventId);
        duplicates++;
        continue;
      }
      var seqKey = event.deviceId + '|' + event.deviceSeq;
      var existingSeq = bySeq[seqKey];
      if (existingSeq !== undefined) {
        if (existingSeq !== sig) return reject('device_seq_conflict', seqKey);
        duplicates++;
        continue;
      }
      byEvent[event.eventId] = sig;
      bySeq[seqKey] = sig;
      out.push(event);
    }

    out.sort(function (a, b) {
      if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
      if (a.deviceSeq !== b.deviceSeq) return a.deviceSeq - b.deviceSeq;
      return a.eventId < b.eventId ? -1 : (a.eventId > b.eventId ? 1 : 0);
    });
    return accept(out, { duplicates: duplicates });
  }

  function normalizeBatch(raw) {
    if (!isPlainObject(raw)) return reject('batch_not_object');
    var foreign = ownForeignKey(raw, BATCH_KEYS);
    if (foreign) return reject('foreign_field', foreign);
    if (raw.schema !== BATCH_SCHEMA) return reject('batch_schema');
    if (raw.protocol !== PROTOCOL_VERSION) return reject('protocol_version');
    if (typeof raw.deviceId !== 'string' || !UUID_V4_RE.test(raw.deviceId)) return reject('device_id');
    if (!safeInt(raw.baseRevision, 0, Number.MAX_SAFE_INTEGER)) return reject('base_revision');

    var deduped = dedupeEvents(raw.events);
    if (!deduped.ok) return deduped;
    for (var i = 0; i < deduped.value.length; i++) {
      var event = deduped.value[i];
      if (event.deviceId !== raw.deviceId) return reject('batch_device_mismatch', event.eventId);
      if (event.baseRevision !== raw.baseRevision) return reject('batch_revision_mismatch', event.eventId);
    }
    return accept({
      schema: BATCH_SCHEMA,
      protocol: PROTOCOL_VERSION,
      deviceId: raw.deviceId,
      baseRevision: raw.baseRevision,
      events: deduped.value
    }, { duplicates: deduped.duplicates });
  }

  function planRevision(input) {
    if (!isPlainObject(input)) return reject('revision_input');
    if (!safeInt(input.baseRevision, 0, Number.MAX_SAFE_INTEGER)) return reject('base_revision');
    if (!safeInt(input.canonicalRevision, 0, Number.MAX_SAFE_INTEGER)) return reject('canonical_revision');
    if (input.baseRevision === input.canonicalRevision) {
      return accept({ action: 'APPLY', baseRevision: input.baseRevision, canonicalRevision: input.canonicalRevision }, {
        rationale: 'brain_sync_revision_apply'
      });
    }
    if (input.baseRevision < input.canonicalRevision) {
      return accept({ action: 'REBASE_REQUIRED', baseRevision: input.baseRevision, canonicalRevision: input.canonicalRevision }, {
        rationale: 'brain_sync_revision_rebase_required'
      });
    }
    return accept({ action: 'INVALID_FUTURE_BASE', baseRevision: input.baseRevision, canonicalRevision: input.canonicalRevision }, {
      rationale: 'brain_sync_revision_future_base'
    });
  }

  function normalizeCheckpoint(raw) {
    if (!isPlainObject(raw)) return reject('checkpoint_not_object');
    var foreign = ownForeignKey(raw, CHECKPOINT_KEYS);
    if (foreign) return reject('foreign_field', foreign);
    if (raw.schema !== CHECKPOINT_SCHEMA) return reject('checkpoint_schema');
    if (!safeInt(raw.revision, 0, Number.MAX_SAFE_INTEGER)) return reject('checkpoint_revision');
    if (!safeInt(raw.serverSeq, 0, Number.MAX_SAFE_INTEGER)) return reject('server_seq');
    if (typeof raw.stateHash !== 'string' || !HASH_RE.test(raw.stateHash)) return reject('state_hash');
    if (!safeInt(raw.createdAt, 0, Number.MAX_SAFE_INTEGER)) return reject('checkpoint_created_at');
    var brainBundle = optionalRev(raw.brainBundle);
    if (brainBundle === null) return reject('brain_bundle');
    var value = {
      schema: CHECKPOINT_SCHEMA,
      revision: raw.revision,
      serverSeq: raw.serverSeq,
      stateHash: raw.stateHash.toLowerCase(),
      createdAt: raw.createdAt
    };
    if (brainBundle) value.brainBundle = brainBundle;
    return accept(value);
  }

  return Object.freeze({
    EVENT_SCHEMA: EVENT_SCHEMA,
    BATCH_SCHEMA: BATCH_SCHEMA,
    CHECKPOINT_SCHEMA: CHECKPOINT_SCHEMA,
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    DOMAINS: DOMAINS,
    LEVELS: LEVELS,
    buildAttemptEvent: buildAttemptEvent,
    normalizeEvent: normalizeEvent,
    dedupeEvents: dedupeEvents,
    normalizeBatch: normalizeBatch,
    planRevision: planRevision,
    normalizeCheckpoint: normalizeCheckpoint
  });
});
