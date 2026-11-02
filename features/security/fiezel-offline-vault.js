/**
 * FIEZEL Offline Vault — Client-Side Encrypted Bank Cache (AES-256-GCM)
 *
 * Mengamankan bank soal dan materi FIEZEL di sisi perangkat murid:
 * 1. Saat online/instal pertama: Bank soal diunduh dan disimpan terenkripsi ke IndexedDB.
 * 2. Saat offline di daerah tanpa sinyal: JavaScript mendekripsi materi langsung ke RAM memori
 *    sesaat sebelum ditampilkan di layar. Tidak ada teks JSON telanjang yang disimpan di disk.
 * 3. Kompatibel ganda: Mendukung Web Crypto API di peramban dan node:crypto saat unit test.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelOfflineVault = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DB_NAME = 'fiezel-vault-v1';
  var STORE_NAME = 'encrypted_banks';
  var DB_VERSION = 1;

  var VAULT_SALT = 'FIEZEL_CORE_VAULT_AES256_SALT_V1';
  var VAULT_SEED = 'FZ-BRAIN-MASTER-2026-FITRA-SECURITY-SHIELD';

  // Dynamic Ephemeral Session Key (RAM only, zero disk persistence)
  var _dynamicSessionKey = null;
  var _dynamicSessionKeyExpiresAt = 0;

  // Memory fallback storage for non-IndexedDB or test environments
  var _memoryStore = {};

  /**
   * Dynamic Key Management
   */
  function setDynamicSessionKey(keyOrSeed, durationMs) {
    if (!keyOrSeed) return false;
    _dynamicSessionKey = keyOrSeed;
    _dynamicSessionKeyExpiresAt = durationMs ? Date.now() + durationMs : Date.now() + (24 * 60 * 60 * 1000);
    return true;
  }

  function getDynamicSessionKey() {
    if (_dynamicSessionKey && Date.now() < _dynamicSessionKeyExpiresAt) {
      return _dynamicSessionKey;
    }
    _dynamicSessionKey = null;
    return null;
  }

  function clearDynamicSessionKey() {
    _dynamicSessionKey = null;
    _dynamicSessionKeyExpiresAt = 0;
  }

  function getDeviceBoundSalt(ownerUuid) {
    if (!ownerUuid || typeof ownerUuid !== 'string') return VAULT_SALT;
    var sanitized = ownerUuid.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    return VAULT_SALT + ':' + (sanitized.slice(0, 16) || 'DEV0');
  }

  /**
   * Helper: Base64 encoding and decoding cross-environment
   */
  function toBase64(bytes) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    var binary = '';
    var len = bytes.byteLength;
    var u8 = new Uint8Array(bytes);
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(u8[i]);
    }
    return btoa(binary);
  }

  function fromBase64(b64) {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(b64, 'base64'));
    }
    var binary = atob(b64);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Derive AES-256-GCM Key (Node & Browser compatible)
   */
  async function getCryptoKey(seed, salt) {
    var dynamicKey = getDynamicSessionKey();
    if (dynamicKey && !seed) {
      seed = dynamicKey;
    }
    seed = seed || VAULT_SEED;
    salt = salt || VAULT_SALT;

    // Node.js environment
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        var cryptoNode = await import('node:crypto');
        return cryptoNode.pbkdf2Sync(seed, salt, 10000, 32, 'sha256');
      } catch (_) {}
    }

    // Web Crypto API in browser
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      var enc = new TextEncoder();
      var keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(seed),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    throw new Error('Web Crypto API or node:crypto not available in this environment.');
  }

  /**
   * Encrypt arbitrary object into a Vault Envelope
   */
  async function encryptData(data, customKey) {
    var plaintext = typeof data === 'string' ? data : JSON.stringify(data);

    // Node.js path
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      var cryptoNode = await import('node:crypto');
      var keyNode = customKey || cryptoNode.pbkdf2Sync(VAULT_SEED, VAULT_SALT, 10000, 32, 'sha256');
      var ivNode = cryptoNode.randomBytes(12);
      var cipher = cryptoNode.createCipheriv('aes-256-gcm', keyNode, ivNode);
      var enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      var tag = cipher.getAuthTag();
      var combined = Buffer.concat([enc, tag]);

      return {
        _fz_vault: 1,
        _sig: 'FZV1',
        v: '1.0',
        ts: Date.now(),
        iv: ivNode.toString('base64'),
        data: combined.toString('base64')
      };
    }

    // Browser Web Crypto path
    var keyBrowser = customKey || await getCryptoKey();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encBrowser = new TextEncoder();
    var ciphertextWithTag = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      keyBrowser,
      encBrowser.encode(plaintext)
    );

    return {
      _fz_vault: 1,
      _sig: 'FZV1',
      v: '1.0',
      ts: Date.now(),
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(ciphertextWithTag))
    };
  }

  /**
   * Decrypt a Vault Envelope back to JavaScript object
   */
  async function decryptData(envelope, customKey) {
    if (!envelope || envelope._fz_vault !== 1 || !envelope.iv || !envelope.data) {
      throw new Error('Invalid or unencrypted vault envelope format.');
    }

    // Node.js path
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      var cryptoNode = await import('node:crypto');
      var keyNode = customKey || cryptoNode.pbkdf2Sync(VAULT_SEED, VAULT_SALT, 10000, 32, 'sha256');
      var ivNode = Buffer.from(envelope.iv, 'base64');
      var combined = Buffer.from(envelope.data, 'base64');
      if (combined.length < 16) throw new Error('Corrupted encrypted data (too short).');

      var tag = combined.subarray(combined.length - 16);
      var ciphertext = combined.subarray(0, combined.length - 16);

      var decipher = cryptoNode.createDecipheriv('aes-256-gcm', keyNode, ivNode);
      decipher.setAuthTag(tag);
      var decBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      var decStr = decBuf.toString('utf8');
      try {
        return JSON.parse(decStr);
      } catch (_) {
        return decStr;
      }
    }

    // Browser Web Crypto path
    var keyBrowser = customKey || await getCryptoKey();
    var iv = fromBase64(envelope.iv);
    var combinedBrowser = fromBase64(envelope.data);
    var decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      keyBrowser,
      combinedBrowser
    );
    var decText = new TextDecoder().decode(decryptedBuf);
    try {
      return JSON.parse(decText);
    } catch (_) {
      return decText;
    }
  }

  /**
   * IndexedDB Helper: Open database and object store
   */
  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        return resolve(null); // fallback to memory store
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'bankKey' });
        }
      };
      req.onsuccess = function (e) {
        resolve(e.target.result);
      };
      req.onerror = function () {
        resolve(null); // fail-soft to memory store
      };
    });
  }

  /**
   * Read active PWA build marker (empty in headless Node unit tests)
   */
  function currentPageBuild() {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.FIEZEL_PAGE_BUILD) {
        return String(globalThis.FIEZEL_PAGE_BUILD).trim();
      }
      if (typeof self !== 'undefined' && self.FIEZEL_PAGE_BUILD) {
        return String(self.FIEZEL_PAGE_BUILD).trim();
      }
    } catch (_) {}
    return '';
  }

  /**
   * Save plain bank data encrypted into local IndexedDB
   */
  async function saveBank(bankKey, plainData) {
    if (!bankKey || !plainData) return false;
    try {
      var envelope = await encryptData(plainData);
      var record = {
        bankKey: String(bankKey).trim(),
        envelope: envelope,
        build: currentPageBuild(),
        savedAt: Date.now()
      };

      var db = await openDatabase();
      if (!db) {
        _memoryStore[bankKey] = record;
        return true;
      }

      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          var store = tx.objectStore(STORE_NAME);
          store.put(record);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () {
            _memoryStore[bankKey] = record;
            resolve(true);
          };
        } catch (_) {
          _memoryStore[bankKey] = record;
          resolve(true);
        }
      });
    } catch (err) {
      console.warn('[FiezelOfflineVault] Failed to save encrypted bank:', err.message);
      return false;
    }
  }

  /**
   * Get and decrypt bank directly into memory RAM
   */
  async function getBank(bankKey) {
    if (!bankKey) return null;
    bankKey = String(bankKey).trim();

    try {
      var record = null;
      var db = await openDatabase();
      if (!db) {
        record = _memoryStore[bankKey] || null;
      } else {
        record = await new Promise(function (resolve) {
          try {
            var tx = db.transaction(STORE_NAME, 'readonly');
            var store = tx.objectStore(STORE_NAME);
            var req = store.get(bankKey);
            req.onsuccess = function (e) {
              resolve(e.target.result || _memoryStore[bankKey] || null);
            };
            req.onerror = function () {
              resolve(_memoryStore[bankKey] || null);
            };
          } catch (_) {
            resolve(_memoryStore[bankKey] || null);
          }
        });
      }

      if (!record || !record.envelope) return null;
      var activeBuild = currentPageBuild();
      if (activeBuild && String(record.build || '') !== activeBuild) {
        delete _memoryStore[bankKey];
        if (db) {
          try {
            var delTx = db.transaction(STORE_NAME, 'readwrite');
            delTx.objectStore(STORE_NAME).delete(bankKey);
          } catch (_) {}
        }
        return null;
      }
      return await decryptData(record.envelope);
    } catch (err) {
      console.warn('[FiezelOfflineVault] Failed to decrypt bank from vault:', err.message);
      return null;
    }
  }

  /**
   * Check if an object is an encrypted vault envelope
   */
  function isEncryptedPayload(obj) {
    return !!(obj && typeof obj === 'object' && obj._fz_vault === 1 && obj._sig === 'FZV1' && obj.iv && obj.data);
  }

  /**
   * Transparently decrypt payload if it is an envelope, otherwise return as-is
   */
  async function decryptIfEncrypted(data) {
    if (isEncryptedPayload(data)) {
      return await decryptData(data);
    }
    return data;
  }

  /**
   * Purge only records whose stamped build differs from keepBuild (or currentPageBuild()),
   * preserving records freshly saved during the current build's boot load().
   */
  async function purgeStaleBuilds(keepBuild) {
    var targetBuild = String(keepBuild || currentPageBuild() || '').trim();
    if (!targetBuild) return clearVault();
    Object.keys(_memoryStore).forEach(function (k) {
      var rec = _memoryStore[k];
      if (!rec || String(rec.build || '') !== targetBuild) {
        delete _memoryStore[k];
      }
    });
    var db = await openDatabase();
    if (!db) return true;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.openCursor();
        req.onsuccess = function (e) {
          var cursor = e && e.target ? e.target.result : null;
          if (!cursor) return;
          var val = cursor.value;
          if (!val || String(val.build || '') !== targetBuild) {
            try { cursor.delete(); } catch (_) {}
          }
          cursor.continue();
        };
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (_) {
        resolve(false);
      }
    });
  }

  /**
   * Clear all encrypted records (for testing or account reset)
   */
  async function clearVault() {
    _memoryStore = {};
    var db = await openDatabase();
    if (!db) return true;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (_) {
        resolve(false);
      }
    });
  }

  return {
    encryptData: encryptData,
    decryptData: decryptData,
    saveBank: saveBank,
    getBank: getBank,
    isEncryptedPayload: isEncryptedPayload,
    decryptIfEncrypted: decryptIfEncrypted,
    purgeStaleBuilds: purgeStaleBuilds,
    clearVault: clearVault,
    setDynamicSessionKey: setDynamicSessionKey,
    getDynamicSessionKey: getDynamicSessionKey,
    clearDynamicSessionKey: clearDynamicSessionKey,
    getDeviceBoundSalt: getDeviceBoundSalt,
    VAULT_SALT: VAULT_SALT,
    VAULT_SEED: VAULT_SEED
  };
});
