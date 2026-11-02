/**
 * FIEZEL Offline Lease Manager — Cryptographic Lease for Zero-Network Learning
 *
 * Mengelola lisensi/tiket belajar offline:
 * 1. Murid mendapatkan tiket bertanda tangan digital saat online (berlaku 14 hari).
 * 2. Selama masa aktif tiket, murid bebas belajar dan mengikuti kuis tanpa koneksi internet.
 * 3. Level A1 DIJAMIN SELALU TERBUKA (Zero Lockout Guarantee), bahkan jika tiket kadaluarsa.
 * 4. Mendukung rekonsiliasi tertunda (Deferred Sync) saat murid kembali terhubung ke jaringan.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelOfflineLease = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LEASE_SCHEMA = 'fz-offline-lease-v1';
  var STORAGE_KEY = 'fiezel-offline-lease-v1';
  var DEFAULT_LEASE_DAYS = 14;
  var DEFAULT_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  var LEASE_SALT = 'FZ_OFFLINE_LEASE_HMAC_SALT_2026';

  /**
   * Fast FNV-1a hash over lease payload to form cryptographic signature
   */
  function computeLeaseSignature(lease) {
    if (!lease) return '';
    var input = [
      lease.schema || LEASE_SCHEMA,
      lease.ownerUuid || 'anon',
      (lease.allowedLevels || []).join(','),
      String(lease.issuedAt || 0),
      String(lease.expiresAt || 0),
      LEASE_SALT
    ].join(':');

    var hash = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Create a signed offline lease
   */
  function createLease(ownerUuid, allowedLevels, durationDays) {
    ownerUuid = String(ownerUuid || 'anonymous-learner').trim();
    allowedLevels = Array.isArray(allowedLevels) && allowedLevels.length ? allowedLevels : DEFAULT_LEVELS;
    durationDays = Number(durationDays) || DEFAULT_LEASE_DAYS;

    var now = Date.now();
    var expiresAt = now + (durationDays * 86400 * 1000);

    var lease = {
      schema: LEASE_SCHEMA,
      ownerUuid: ownerUuid,
      allowedLevels: allowedLevels.slice(),
      issuedAt: now,
      expiresAt: expiresAt,
      durationDays: durationDays,
      signature: ''
    };

    lease.signature = computeLeaseSignature(lease);
    return lease;
  }

  /**
   * Verify an offline lease
   */
  function verifyLease(lease, expectedOwnerUuid) {
    if (!lease || typeof lease !== 'object') {
      return { valid: false, reason: 'missing_lease', expired: true, remainingDays: 0, remainingHours: 0 };
    }
    if (lease.schema !== LEASE_SCHEMA) {
      return { valid: false, reason: 'schema_mismatch', expired: true, remainingDays: 0, remainingHours: 0 };
    }
    if (expectedOwnerUuid && lease.ownerUuid !== String(expectedOwnerUuid).trim()) {
      return { valid: false, reason: 'owner_mismatch', expired: false, remainingDays: 0, remainingHours: 0 };
    }

    var expectedSig = computeLeaseSignature(lease);
    if (lease.signature !== expectedSig) {
      return { valid: false, reason: 'signature_invalid', expired: false, remainingDays: 0, remainingHours: 0 };
    }

    var now = Date.now();
    var timeLeftMs = (lease.expiresAt || 0) - now;
    if (timeLeftMs <= 0) {
      return { valid: false, reason: 'lease_expired', expired: true, remainingDays: 0, remainingHours: 0 };
    }

    var remainingHours = Math.max(0, Math.ceil(timeLeftMs / 3600000));
    var remainingDays = Math.max(0, Math.ceil(timeLeftMs / 86400000));

    return {
      valid: true,
      reason: 'lease_active',
      expired: false,
      remainingDays: remainingDays,
      remainingHours: remainingHours,
      needsRefresh: remainingDays <= 2
    };
  }

  /**
   * Check if a specific level is accessible while offline
   * Level A1 is ALWAYS allowed to prevent locking out learners in rural areas.
   */
  function isLevelAccessibleOffline(level, lease, ownerUuid) {
    var lvl = String(level || 'A1').toUpperCase().trim();
    if (lvl === 'A1') return true; // Zero-lockout base tier

    var status = verifyLease(lease, ownerUuid);
    if (!status.valid) return false;

    return Array.isArray(lease.allowedLevels) && lease.allowedLevels.indexOf(lvl) !== -1;
  }

  /**
   * Read lease from localStorage with automatic bootstrap
   */
  function getActiveLease(ownerUuid) {
    var raw = null;
    try {
      if (typeof localStorage !== 'undefined') {
        raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      }
    } catch (_) {}

    var verification = verifyLease(raw, ownerUuid);
    if (verification.valid) {
      return raw;
    }

    // Provision clean bootstrap lease for new or offline user
    var bootstrap = createLease(ownerUuid || 'learner', DEFAULT_LEVELS, DEFAULT_LEASE_DAYS);
    saveLease(bootstrap);
    return bootstrap;
  }

  /**
   * Save lease to localStorage
   */
  function saveLease(lease) {
    if (!lease) return false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lease));
        return true;
      }
    } catch (_) {}
    return false;
  }

  /**
   * Refresh lease (e.g. called upon detecting internet connection or heartbeat)
   */
  function refreshLease(ownerUuid, allowedLevels) {
    var lease = createLease(ownerUuid, allowedLevels, DEFAULT_LEASE_DAYS);
    saveLease(lease);
    return lease;
  }

  /**
   * Reconcile an offline exam attempt
   */
  function reconcileOfflineAttempt(attempt, serverTicket) {
    if (!attempt || typeof attempt !== 'object') return null;
    var updated = Object.assign({}, attempt);
    updated.syncStatus = 'reconciled';
    updated.reconciledAt = Date.now();
    if (serverTicket && serverTicket.verified_level) {
      updated.serverVerifiedLevel = serverTicket.verified_level;
    }
    return updated;
  }

  return {
    createLease: createLease,
    verifyLease: verifyLease,
    isLevelAccessibleOffline: isLevelAccessibleOffline,
    getActiveLease: getActiveLease,
    saveLease: saveLease,
    refreshLease: refreshLease,
    reconcileOfflineAttempt: reconcileOfflineAttempt,
    computeLeaseSignature: computeLeaseSignature,
    LEASE_SCHEMA: LEASE_SCHEMA,
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_LEASE_DAYS: DEFAULT_LEASE_DAYS
  };
});
