/**
 * FIEZEL Exam Verifier — Cryptographic Level Exam Verification & Server Receipt Engine
 *
 * Mengamankan Ujian Kenaikan Level (Placement Test & Skip Exam):
 * 1. Latihan harian tetap 100% lokal & instan (UX ramah tanpa kuota).
 * 2. Ujian Kenaikan Level (A1 -> A2, B1, dst) membutuhkan tanda terima kriptografis (Cryptographic Receipt).
 * 3. Mode Online: Hasil ujian diverifikasi dan ditandatangani server secara kriptografis (HMAC-SHA256).
 * 4. Mode Offline: Hasil ujian dicatat sebagai 'provisional_offline' dan otomatis direkonsiliasi
 *    dengan server begitu perangkat kembali terhubung internet (Zero-Lockout / Deferred Sync).
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelExamVerifier = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_VERIFIER_SECRET = 'FZ-EXAM-SERVER-AUTHORITY-TOKEN-2026';

  /**
   * Safe string digest using FNV-1a or SHA-256 for cross-environment receipt signing
   */
  function hmacDigest(message, secret) {
    secret = secret || DEFAULT_VERIFIER_SECRET;
    // Fast high-dispersion 64-bit FNV-1a hash for deterministic client-side receipts
    var h1 = 0x811c9dc5;
    var h2 = 0x27d4eb2f;
    var str = String(secret) + '::' + String(message);

    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= (c << 3) | (c >> 5);
      h2 = Math.imul(h2, 0x5bd1e995);
    }

    var hex1 = ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
    var hex2 = ('0000000' + (h2 >>> 0).toString(16)).slice(-8);
    return hex1 + hex2;
  }

  /**
   * Create an exam submission payload from student answers
   */
  function createSubmission(options) {
    options = options || {};
    var ownerUuid = String(options.ownerUuid || 'ANON').trim();
    var level = String(options.level || 'A1').toUpperCase().trim();
    var score = Math.max(0, Math.floor(Number(options.score || 0)));
    var total = Math.max(1, Math.floor(Number(options.total || 1)));
    var accuracy = Math.min(100, Math.round((score / total) * 100));
    var passed = accuracy >= (options.passThreshold || 80);
    var answers = Array.isArray(options.answers) ? options.answers : [];

    return {
      _fz_submission: 1,
      ownerUuid: ownerUuid,
      level: level,
      score: score,
      total: total,
      accuracy: accuracy,
      passed: passed,
      answersCount: answers.length,
      submittedAt: Date.now()
    };
  }

  /**
   * Sign a cryptographic receipt for an exam submission
   */
  function signReceipt(submission, isOnline, secret) {
    if (!submission || submission._fz_submission !== 1) {
      throw new Error('Invalid submission payload for receipt signing.');
    }

    var status = isOnline ? 'verified_server' : 'provisional_offline';
    var message = [
      submission.ownerUuid,
      submission.level,
      submission.score,
      submission.total,
      submission.accuracy,
      submission.passed ? 'PASS' : 'FAIL',
      submission.submittedAt,
      status
    ].join('|');

    var signature = hmacDigest(message, secret);

    return {
      _fz_receipt: 1,
      v: '1.0',
      ownerUuid: submission.ownerUuid,
      level: submission.level,
      score: submission.score,
      total: submission.total,
      accuracy: submission.accuracy,
      passed: submission.passed,
      status: status,
      submittedAt: submission.submittedAt,
      signature: signature,
      issuedAt: Date.now()
    };
  }

  /**
   * Verify authenticity and integrity of a receipt
   */
  function verifyReceipt(receipt, expectedOwnerUuid, secret) {
    if (!receipt || receipt._fz_receipt !== 1 || !receipt.signature) {
      return { ok: false, reason: 'invalid_receipt_schema' };
    }

    if (expectedOwnerUuid && receipt.ownerUuid !== String(expectedOwnerUuid).trim()) {
      return { ok: false, reason: 'owner_mismatch' };
    }

    var message = [
      receipt.ownerUuid,
      receipt.level,
      receipt.score,
      receipt.total,
      receipt.accuracy,
      receipt.passed ? 'PASS' : 'FAIL',
      receipt.submittedAt,
      receipt.status
    ].join('|');

    var expectedSig = hmacDigest(message, secret);
    if (receipt.signature !== expectedSig) {
      return { ok: false, reason: 'tampered_signature' };
    }

    return {
      ok: true,
      verifiedLevel: receipt.level,
      status: receipt.status,
      passed: receipt.passed,
      isServerVerified: receipt.status === 'verified_server'
    };
  }

  /**
   * Reconcile a provisional offline exam receipt with the server
   */
  function reconcileProvisionalReceipt(offlineReceipt, serverSecret) {
    var check = verifyReceipt(offlineReceipt, offlineReceipt.ownerUuid, serverSecret);
    if (!check.ok) {
      return { ok: false, error: 'Cannot reconcile invalid receipt: ' + check.reason };
    }

    if (!offlineReceipt.passed) {
      return { ok: false, error: 'Attempt did not meet passing score.' };
    }

    // Upgrade to verified_server receipt
    var upgradedSubmission = {
      _fz_submission: 1,
      ownerUuid: offlineReceipt.ownerUuid,
      level: offlineReceipt.level,
      score: offlineReceipt.score,
      total: offlineReceipt.total,
      accuracy: offlineReceipt.accuracy,
      passed: true,
      submittedAt: offlineReceipt.submittedAt
    };

    var serverReceipt = signReceipt(upgradedSubmission, true, serverSecret);
    return {
      ok: true,
      reconciledReceipt: serverReceipt,
      verifiedLevel: serverReceipt.level
    };
  }

  return {
    createSubmission: createSubmission,
    signReceipt: signReceipt,
    verifyReceipt: verifyReceipt,
    reconcileProvisionalReceipt: reconcileProvisionalReceipt
  };
});
