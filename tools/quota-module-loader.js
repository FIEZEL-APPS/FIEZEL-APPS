/**
 * FIEZEL · tools/quota-module-loader.js
 *
 * Pemuat modul ESM `workers/api/quota/*.js` ke dalam satu konteks `vm` TANPA dependency,
 * supaya gerbang kuota bisa mengeksekusi kode Worker APA ADANYA di Node polos.
 *
 * MENGAPA vm dan bukan `import()`:
 *   1. Aturan kuota tidak boleh diuji lewat tiruan aturannya (pola `tests/gems-test.js`).
 *   2. Sandbox-nya SENGAJA kosong: tanpa `Date`, tanpa `fetch`, tanpa `localStorage`,
 *      tanpa `document`, tanpa `crypto`, tanpa `process`. Kalau suatu hari ada yang
 *      menyelipkan waktu tersembunyi atau jaringan ke dalam aturan kuota, gerbang gagal
 *      SAAT MEMUAT — bukan nanti di perangkat murid.
 *   3. `import()` akan menyeret Node global apa adanya dan menghapus jaminan di atas.
 *
 * Transformasi yang dilakukan (sengaja minimal, bukan transpiler):
 *   - baris `import … from '…';` dibuang (modul dirangkai berurutan, bukan diresolusi)
 *   - `export const|function|async function|default` → deklarasi biasa
 *   - `const` TINGKAT ATAS → `var`, supaya gerbang bisa menyuntik ganda (stub) untuk
 *     fungsi penyimpanan tanpa menyentuh berkas produksi
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const QUOTA_DIR = path.join(__dirname, '..', 'workers', 'api', 'quota');

/** Urutan rangkai = urutan ketergantungan nyata antar modul. */
const MODULE_ORDER = ['quota-config.js', 'quota-core.js', 'quota-store-d1.js', 'route-quota.js'];

function readModule(name) {
  return fs.readFileSync(path.join(QUOTA_DIR, name), 'utf8');
}

/** Menghapus komentar `//` dan blok, supaya pemeriksaan statis tidak tertipu narasi. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

function toScript(source) {
  return source
    .replace(/^import\s[\s\S]*?from\s+'[^']+';[ \t]*$/gm, '')
    .replace(/^export\s+default\s+/gm, 'var __default__ = ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^const\s+/gm, 'var ');
}

/**
 * Memuat sebagian/seluruh modul kuota ke satu konteks vm kosong.
 * @param {string[]} names berkas yang dirangkai (default: semuanya)
 * @returns {{context:object, run:Function, sources:object, joined:string}}
 */
function loadQuotaModules(names) {
  const list = Array.isArray(names) && names.length ? names : MODULE_ORDER;
  const sources = {};
  const parts = [];
  for (const name of list) {
    const raw = readModule(name);
    sources[name] = raw;
    parts.push('/* ==== ' + name + ' ==== */\n' + toScript(raw));
  }
  const joined = parts.join('\n');

  const sandbox = {};
  const context = vm.createContext(sandbox);
  // Cabut setiap pintu efek samping dari konteks SEBELUM modul dieksekusi.
  vm.runInContext(
    'delete this.Date; delete this.fetch; delete this.WebSocket; delete this.XMLHttpRequest;' +
      'this.document = undefined; this.localStorage = undefined; this.navigator = undefined;' +
      'this.crypto = undefined; this.process = undefined; this.require = undefined;',
    context
  );
  vm.runInContext(joined, context, { timeout: 5000, filename: 'quota-modules.js' });

  return {
    context,
    sources,
    joined,
    run: (expr) => vm.runInContext(expr, context, { timeout: 5000 }),
    get: (name) => vm.runInContext(name, context, { timeout: 5000 }),
    set: (name, value) => {
      context[name] = value;
    }
  };
}

module.exports = { loadQuotaModules, readModule, stripComments, toScript, QUOTA_DIR, MODULE_ORDER };
