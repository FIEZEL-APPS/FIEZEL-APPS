/**
 * FIEZEL R5 — Adoption Receipt dan replay protection.
 *
 * Pipeline konten sudah punya gate, canary, promotion, attestation, dan origin. Yang belum
 * ada adalah catatan bahwa satu adopsi BENAR-BENAR sudah pernah terjadi, dan penolakan ketika
 * adopsi yang sama diajukan lagi.
 *
 * Kenapa itu penting: setiap gate di pipeline ini menilai satu permintaan secara terpisah.
 * Permintaan yang sah bulan lalu tetap terlihat sah bulan ini kalau tidak ada yang mengingat
 * bahwa permintaan itu sudah dipakai. Tanpa ingatan, satu payload adopsi lama bisa diputar
 * ulang untuk menulis kembali konten kanonik yang sudah bergerak maju.
 *
 * Receipt di sini menjawab tiga bentuk pengulangan:
 * - REPLAY PERSIS: receipt yang sama diajukan dua kali.
 * - REPLAY BASI: patch yang sama sudah diadopsi, lalu diajukan lagi untuk versi target lain.
 * - REPLAY DI LUAR URUTAN: receipt dibuat dari versi sumber yang bukan versi kanonik sekarang.
 *
 * Ledger-nya berantai (setiap entri membawa hash entri sebelumnya), jadi entri yang dihapus
 * atau disisipkan di tengah terdeteksi, bukan hanya entri yang diubah isinya.
 *
 * Semua fungsi murni: tidak menyentuh file kanonik, tidak mengubah konten saat runtime.
 */
'use strict';
const crypto = require('crypto');

const RECEIPT_SCHEMA = 'fiezel-content-adoption-receipt-v1';
const LEDGER_SCHEMA = 'fiezel-content-adoption-ledger-v1';
const RECEIPT_VERSION = 'adoption-receipt-v1';
// Ledger dibatasi supaya tidak tumbuh tanpa akhir, tetapi batasnya jauh di atas jumlah adopsi
// yang masuk akal untuk satu produk konten.
const LEDGER_LIMIT = 500;
const GENESIS_HASH = '0'.repeat(64);

const text = v => String(v ?? '').trim();
const sha = v => crypto.createHash('sha256').update(v).digest('hex');

/** JSON dengan kunci terurut, supaya hash tidak berubah hanya karena urutan properti. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
}

/** Bidang yang mengikat identitas satu adopsi. Perubahan salah satunya = adopsi lain. */
function receiptSubject(adoption) {
  const a = adoption || {};
  return {
    gateVersion: text(a.gateVersion),
    patchId: text(a.patchId).slice(0, 160),
    domain: text(a.domain),
    itemId: text(a.itemId).slice(0, 160),
    sourceVersion: text(a.sourceVersion),
    targetVersion: text(a.targetVersion),
    canonicalBefore: text(a.canonicalBefore),
    canonicalAfter: text(a.canonicalAfter)
  };
}

function receiptId(subject) {
  return sha(RECEIPT_VERSION + '\n' + canonicalJson(subject));
}

/**
 * Menerbitkan receipt untuk adopsi yang SUDAH lolos gate. Adopsi yang statusnya bukan
 * `adopt` tidak pernah menghasilkan receipt - receipt adalah bukti adopsi, bukan izin.
 */
function issueReceipt(input) {
  const options = input || {};
  const adoption = options.adoption || {};
  const now = Number(options.now);
  if (!isFinite(now)) throw new Error('issueReceipt: now wajib diisi (deterministic)');
  if (text(adoption.status) !== 'adopt') {
    return { ok: false, reason: 'adoption_not_adopted' };
  }
  const subject = receiptSubject(adoption);
  for (const key of ['patchId', 'domain', 'sourceVersion', 'targetVersion', 'canonicalBefore', 'canonicalAfter']) {
    if (!subject[key]) return { ok: false, reason: 'incomplete_subject:' + key };
  }
  if (subject.canonicalBefore === subject.canonicalAfter) {
    // Adopsi yang tidak mengubah apa pun tidak boleh mendapat bukti bahwa ia mengubah sesuatu.
    return { ok: false, reason: 'canonical_unchanged' };
  }
  return {
    ok: true,
    receipt: {
      schema: RECEIPT_SCHEMA,
      receiptVersion: RECEIPT_VERSION,
      receiptId: receiptId(subject),
      issuedAt: new Date(now).toISOString(),
      subject: subject,
      privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false }
    }
  };
}

/** Receipt yang isinya diubah setelah diterbitkan tidak lagi cocok dengan receiptId-nya. */
function verifyReceipt(receipt) {
  const r = receipt || {};
  if (r.schema !== RECEIPT_SCHEMA || r.receiptVersion !== RECEIPT_VERSION) return { ok: false, reason: 'invalid_contract' };
  if (!r.subject || typeof r.subject !== 'object') return { ok: false, reason: 'missing_subject' };
  if (receiptId(receiptSubject(Object.assign({}, r.subject))) !== text(r.receiptId)) return { ok: false, reason: 'receipt_tampered' };
  if (r.privacy?.rawAnswersIncluded === true || r.privacy?.rawHistoryIncluded === true) return { ok: false, reason: 'privacy_violation' };
  return { ok: true };
}

function freshLedger() {
  return { schema: LEDGER_SCHEMA, entries: [] };
}

function sanitizeLedger(raw) {
  if (!raw || raw.schema !== LEDGER_SCHEMA || !Array.isArray(raw.entries)) return freshLedger();
  return { schema: LEDGER_SCHEMA, entries: raw.entries.slice(-LEDGER_LIMIT) };
}

function entryHash(previousHash, receipt) {
  return sha(text(previousHash) + '\n' + canonicalJson({
    receiptId: text(receipt.receiptId), issuedAt: text(receipt.issuedAt), subject: receiptSubject(receipt.subject)
  }));
}

/**
 * Rantai ledger diperiksa dari awal: entri yang diubah, dihapus, atau disisipkan akan
 * memutus rantai pada titik itu, dan titiknya dilaporkan.
 */
function verifyLedger(rawLedger) {
  const ledger = sanitizeLedger(rawLedger);
  let previous = GENESIS_HASH;
  for (let i = 0; i < ledger.entries.length; i++) {
    const entry = ledger.entries[i];
    const verified = verifyReceipt(entry.receipt);
    if (!verified.ok) return { ok: false, reason: 'entry_receipt_invalid', index: i, detail: verified.reason };
    if (text(entry.previousHash) !== previous) return { ok: false, reason: 'chain_broken', index: i };
    if (text(entry.hash) !== entryHash(previous, entry.receipt)) return { ok: false, reason: 'entry_tampered', index: i };
    previous = entry.hash;
  }
  return { ok: true, head: previous, length: ledger.entries.length };
}

/**
 * Pemeriksaan replay. `currentVersion` adalah versi kanonik yang berlaku sekarang; receipt
 * yang dibuat dari versi lain berarti dunia sudah bergerak dan receipt itu tidak lagi berlaku.
 */
function checkReplay(receipt, rawLedger, currentVersion) {
  const verified = verifyReceipt(receipt);
  if (!verified.ok) return { ok: false, reason: verified.reason };
  const ledgerVerified = verifyLedger(rawLedger);
  if (!ledgerVerified.ok) return { ok: false, reason: 'ledger_' + ledgerVerified.reason, index: ledgerVerified.index };

  const ledger = sanitizeLedger(rawLedger);
  const subject = receiptSubject(receipt.subject);

  for (const entry of ledger.entries) {
    const past = receiptSubject(entry.receipt.subject);
    if (text(entry.receipt.receiptId) === text(receipt.receiptId)) {
      return { ok: false, reason: 'replay_exact', firstSeenAt: entry.receipt.issuedAt };
    }
    if (past.patchId === subject.patchId) {
      // Patch yang sama sudah pernah diadopsi. Mengadopsinya lagi ke versi target lain adalah
      // cara paling halus untuk menulis ulang konten yang sudah bergerak maju.
      return { ok: false, reason: 'replay_stale_patch', firstSeenAt: entry.receipt.issuedAt, adoptedTargetVersion: past.targetVersion };
    }
  }

  const expected = text(currentVersion);
  if (expected && subject.sourceVersion !== expected) {
    return { ok: false, reason: 'replay_out_of_order', expectedSourceVersion: expected, receiptSourceVersion: subject.sourceVersion };
  }

  const head = ledger.entries.length ? ledger.entries[ledger.entries.length - 1] : null;
  if (head && receiptSubject(head.receipt.subject).canonicalAfter !== subject.canonicalBefore) {
    // Adopsi harus menyambung ke keadaan kanonik terakhir, bukan ke cabang lain.
    return { ok: false, reason: 'canonical_not_contiguous', expectedBefore: receiptSubject(head.receipt.subject).canonicalAfter };
  }

  return { ok: true };
}

/**
 * Menambahkan receipt ke ledger. Idempotent terhadap receipt yang sudah ada: ledger
 * dikembalikan apa adanya, bukan digandakan.
 */
function appendToLedger(rawLedger, receipt, currentVersion) {
  const ledger = sanitizeLedger(rawLedger);
  const replay = checkReplay(receipt, ledger, currentVersion);
  if (!replay.ok) {
    if (replay.reason === 'replay_exact') return { ok: true, idempotent: true, ledger: ledger };
    return { ok: false, reason: replay.reason, ledger: ledger, detail: replay };
  }
  const previousHash = ledger.entries.length ? text(ledger.entries[ledger.entries.length - 1].hash) : GENESIS_HASH;
  const entry = { previousHash: previousHash, hash: entryHash(previousHash, receipt), receipt: receipt };
  return {
    ok: true,
    idempotent: false,
    ledger: { schema: LEDGER_SCHEMA, entries: ledger.entries.concat([entry]).slice(-LEDGER_LIMIT) }
  };
}

module.exports = {
  RECEIPT_SCHEMA, LEDGER_SCHEMA, RECEIPT_VERSION, LEDGER_LIMIT, GENESIS_HASH,
  canonicalJson, receiptSubject, receiptId,
  issueReceipt, verifyReceipt,
  freshLedger, sanitizeLedger, verifyLedger, checkReplay, appendToLedger
};
