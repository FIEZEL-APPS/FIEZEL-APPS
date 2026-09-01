/**
 * Logika murni attach-live-bindings.mjs, dipisah dari I/O (child_process/fs) supaya
 * diuji langsung oleh `attach-live-bindings-test.js` dengan data akun tiruan —
 * termasuk kasus staging yang harus TIDAK PERNAH cocok dengan nama produksi.
 *
 * Tidak melakukan fetch/exec/baca-tulis apa pun. `attach-live-bindings.mjs` adalah
 * satu-satunya pemanggil nyata (CLI): ia mengambil d1List/kvList dari wrangler lalu
 * memanggil `computeAttachedToml` di sini.
 */

export class AttachError extends Error {}

function d1IdByExactName(d1List, name) {
  const hit = d1List.find((db) => db.name === name);
  return hit ? hit.uuid : null;
}

/**
 * @param {string} toml - isi wrangler.toml (template, dengan placeholder)
 * @param {Array<{name:string, uuid:string}>} d1List - hasil `wrangler d1 list --json`
 * @param {Array<{title:string, id:string}>} kvList - hasil `wrangler kv namespace list`
 * @returns {{ toml: string, applied: string[] }}
 * @throws {AttachError} kalau binding wajib absen, CFG ambigu, atau placeholder tersisa
 */
export function computeAttachedToml(toml, d1List, kvList) {
  const applied = [];

  const cfgAll = kvList.filter((ns) => /(^|[-_])CFG([-_]|$)/i.test(ns.title || ''));
  // Anti-staging, sama seperti D1 di atas: "fiezel-CFG-staging" tidak boleh pernah
  // tersubstitusi ke binding produksi hanya karena ia satu-satunya kandidat kalau
  // yang produksi kebetulan belum dibuat/terlihat.
  const cfgCandidates = cfgAll.filter((ns) => !/staging/i.test(ns.title || ''));
  if (cfgCandidates.length !== 1) {
    throw new AttachError(
      `namespace KV untuk CFG tidak jelas (ditemukan ${cfgCandidates.length} kandidat produksi ` +
      `dari total ${cfgAll.length}: ${cfgAll.map((c) => c.title).join(', ') || '(tidak ada)'})`
    );
  }
  const cfgId = cfgCandidates[0].id;

  function substitute(placeholder, value, label) {
    if (!toml.includes(placeholder)) throw new AttachError(`placeholder untuk ${label} tidak ditemukan di wrangler.toml`);
    toml = toml.split(placeholder).join(value);
    applied.push(`${label.padEnd(12)} -> ${value}`);
  }

  function dropOptionalBlock(bindingName, databaseNamePlaceholderFragment, label) {
    const re = new RegExp(
      `\\[\\[d1_databases\\]\\]\\s*\\nbinding\\s*=\\s*"${bindingName}"[\\s\\S]*?<isi setelah: ${databaseNamePlaceholderFragment}>"\\s*\\n`
    );
    if (!re.test(toml)) throw new AttachError(`blok ${bindingName} tidak ditemukan untuk dilepas`);
    toml = toml.replace(re, `# (blok ${bindingName} dilepas oleh attach-live-bindings.mjs: database belum ada di akun)\n`);
    applied.push(`${label.padEnd(12)} -> blok dilepas (database belum ada di akun; lane tetap mati/fail-closed)`);
  }

  for (const [binding, dbName, label] of [
    ['CORE_DB', 'fiezel-core', 'CORE_DB'],
    ['STATS_DB', 'fiezel-stats', 'STATS_DB'],
  ]) {
    const id = d1IdByExactName(d1List, dbName);
    if (!id) throw new AttachError(`database wajib '${dbName}' (binding ${binding}) tidak ditemukan di akun`);
    substitute(`<isi setelah: wrangler d1 create ${dbName}>`, id, label);
  }
  substitute('<isi setelah: wrangler kv namespace create CFG>', cfgId, 'CFG');

  for (const [binding, dbName, label] of [
    ['LEARNING_DB', 'fiezel-learning', 'LEARNING_DB'],
    ['EVIDENCE_DB', 'fiezel-evidence', 'EVIDENCE_DB'],
  ]) {
    const id = d1IdByExactName(d1List, dbName);
    if (id) {
      substitute(`<isi setelah: wrangler d1 create ${dbName}>`, id, label);
    } else {
      dropOptionalBlock(binding, `wrangler d1 create ${dbName}`, label);
    }
  }

  if (toml.includes('<isi setelah')) throw new AttachError('masih ada placeholder <isi setelah...> yang tidak tertangani');

  return { toml, applied };
}
