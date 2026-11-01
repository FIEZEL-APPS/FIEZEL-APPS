/**
 * FIEZEL Vault Runtime — In-Memory Decryption & Client Security Shield
 *
 * Modul runtime PWA sisi klien untuk membuka sandi materi terenkripsi di memori (RAM)
 * secara instan (~5ms) tanpa menulis file mentah ke disk.
 *
 * Menjamin:
 * 1. PWA tetap berjalan offline dan super cepat.
 * 2. Siapa pun yang men-download berkas JSON langsung dari luar hanya mendapat biner teracak.
 * 3. Jika berkas belum dienkripsi (misal saat mode pengujian lokal), fungsi `unpack`
 *    tetap bekerja transparan tanpa galat (100% backward compatible).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelVault = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VAULT_SALT = 'FIEZEL_CORE_VAULT_AES256_SALT_V1';
  var VAULT_SEED = 'FZ-BRAIN-MASTER-2026-FITRA-SECURITY-SHIELD';

  var _cachedKeyPromise = null;

  /**
   * Mengubah base64 string menjadi Uint8Array
   */
  function base64ToUint8Array(base64) {
    var binaryString = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Menurunkan kunci AES-256 menggunakan Web Crypto API
   */
  function getDecryptionKey() {
    if (_cachedKeyPromise) return _cachedKeyPromise;

    var cryptoObj = typeof crypto !== 'undefined' ? crypto : (typeof require === 'function' ? require('crypto').webcrypto : null);
    if (!cryptoObj || !cryptoObj.subtle) {
      return Promise.reject(new Error('Web Crypto API unavailable in this environment.'));
    }

    var enc = new TextEncoder();
    _cachedKeyPromise = cryptoObj.subtle.importKey(
      'raw',
      enc.encode(VAULT_SEED),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    ).then(function (baseKey) {
      return cryptoObj.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(VAULT_SALT),
          iterations: 10000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
    });

    return _cachedKeyPromise;
  }

  /**
   * Cek apakah payload berupa amplop terenkripsi FIEZEL Vault
   */
  function isVault(data) {
    return Boolean(
      data &&
      typeof data === 'object' &&
      data._fz_vault === 1 &&
      data._sig === 'FZV1' &&
      typeof data.iv === 'string' &&
      typeof data.data === 'string'
    );
  }

  /**
   * Membuka amplop data terenkripsi di memori RAM
   * @param {Object|string} data - Payload data (baik plain maupun vault)
   * @returns {Promise<Object>} Data asli dalam format objek JS
   */
  function unpack(data) {
    if (!data) return Promise.resolve(data);

    // Jika data adalah string JSON yang belum di-parse
    var parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (_) {
        return Promise.resolve(data);
      }
    }

    // Jika BUKAN amplop vault, kembalikan langsung apa adanya (backward compatible)
    if (!isVault(parsed)) {
      return Promise.resolve(parsed);
    }

    var cryptoObj = typeof crypto !== 'undefined' ? crypto : (typeof require === 'function' ? require('crypto').webcrypto : null);
    if (!cryptoObj || !cryptoObj.subtle) {
      return Promise.reject(new Error('Web Crypto API required to unpack FIEZEL Vault content.'));
    }

    return getDecryptionKey().then(function (aesKey) {
      var ivBytes = base64ToUint8Array(parsed.iv);
      var dataBytes = base64ToUint8Array(parsed.data);

      return cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        aesKey,
        dataBytes
      );
    }).then(function (decryptedBuf) {
      var decryptedText = new TextDecoder().decode(decryptedBuf);
      try {
        return JSON.parse(decryptedText);
      } catch (_) {
        return decryptedText;
      }
    });
  }

  /**
   * Proteksi UI Klien (Anti-Inspect & Anti-Scraping Shortcuts)
   */
  function protectUI() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    try {
      // 0. Domain-Lock: Mencegah penjiplakan di domain atau server pihak lain
      var host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
      var isAllowedHost =
        host === 'fiezel.my.id' ||
        host === 'www.fiezel.my.id' ||
        host === 'api.fiezel.my.id' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '' ||
        Boolean(window.isNativeApp || window.Capacitor);

      if (!isAllowedHost) {
        document.documentElement.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;color:#FF3045;"><h1>Unauthorized Domain</h1><p>FIEZEL Braincore Engine and curriculum are proprietary and protected by copyright law.</p></div>';
        try {
          delete window.FiezelCoreBrain;
          delete window.FiezelMasteryBkt;
          delete window.FiezelItemCalibration;
        } catch (_) {}
        throw new Error('Fiezel Anti-Cloning Shield: Unauthorized domain.');
      }

      // 1. Nonaktifkan menu klik kanan konteks
      document.addEventListener('contextmenu', function (e) {
        var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
        }
      }, { passive: false });

      // 2. Cegah pintasan umum melihat sumber halaman
      document.addEventListener('keydown', function (e) {
        if (e.key === 'F12' || e.keyCode === 123) {
          e.preventDefault();
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
          e.preventDefault();
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
          e.preventDefault();
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
          e.preventDefault();
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
          e.preventDefault();
          return false;
        }
      }, { passive: false });

      // 3. Watermark in console
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          '%c🛡️ FIEZEL Anti-Theft Guard Active%c\nAll learning curriculum, Braincore algorithms, and data banks are cryptographically protected.',
          'color: #00E5FF; font-weight: bold; font-size: 14px;',
          'color: #888; font-size: 11px;'
        );
      }
    } catch (_) {}
  }

  // Interseptor otomatis Response.prototype.json (Transparent Zero-Disruption)
  if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
    var _origJson = Response.prototype.json;
    Response.prototype.json = function () {
      return _origJson.apply(this, arguments).then(function (data) {
        if (isVault(data)) {
          return unpack(data);
        }
        return data;
      });
    };
  }

  // Otomatis aktifkan proteksi UI di browser
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', protectUI);
    } else {
      protectUI();
    }
  }

  return {
    isVault: isVault,
    unpack: unpack,
    protectUI: protectUI
  };
});
