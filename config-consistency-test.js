// config-consistency-test.js — gerbang KONSISTENSI KONFIGURASI: dokumen operasional vs kode,
// dan angka naskah vs angka yang BENAR-BENAR ditegakkan.
//
// DUA CACAT NYATA YANG DIJAGA BERKAS INI (keduanya terverifikasi di main, 28 Agu 2026):
//
//   CACAT 1 — KILL SWITCH GAGAL DENGAN TENANG. `docs/CF-MIGRATION-RUNBOOK.md` §4.5/§4.6/§4.7
//   dulu menyuruh owner menulis KV bentuk DATAR dengan nama karangan dan nilai string:
//     {"transport":"off","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}
//   `workers/api/route-config.js:53-54` hanya membaca `stored.flags` dan `stored.enabled`, dan
//   `mergeFlags` hanya menerima kunci yang SUDAH dikenal BERTIPE BOOLEAN. Perintah runbook itu
//   masuk KV tanpa satu pun galat lalu diabaikan sepenuhnya: owner yakin sudah mematikan
//   AI/TTS padahal biaya terus jalan. Gerbang ini menolak bentuk itu kembali ke dokumen.
//
//   CACAT 2 — DUA ANGKA UNTUK HAL YANG SAMA. `workers/api/wrangler.toml` mengirim
//   `limits.aiPerDay`/`limits.ttsCharsPerDay` ke murid (route-config.js:69-70,
//   route-user.js:53-55) dengan nilai 20 / 6.000, sementara yang ditegakkan adalah
//   `FREE_AI_DAILY_LIMIT: 25` / `FREE_TTS_DAILY_CHARS: 12000`
//   (`workers/api/quota/quota-config.js`). Naskah kuota berbohong ke murid. Arah perbaikan
//   yang dipilih: NASKAH mengikuti PENEGAKAN — `quota-config.js` satu sumber kebenaran dan
//   nilainya TIDAK diturunkan.
//
// EMPAT KEBENARAN YANG DI-ASSERT:
//   (a) setiap kunci flag yang disebut BLOK KODE runbook ada di `CLIENT_FLAG_DEFAULTS` atau
//       `KILL_SWITCH_DEFAULTS` (daftar dibaca dari schema.js, bukan diketik ulang di sini);
//   (b) tidak ada contoh KV di dokumen yang memakai bentuk DATAR tanpa `flags`/`enabled`;
//   (c) setiap nilai batas di `[vars]` wrangler yang dipakai naskah cocok dengan nilai
//       penegakan di `quota-config.js` — pasangannya dipetakan EKSPLISIT di bawah, dan
//       mengubah salah satu sisi sepihak membuat gerbang MERAH;
//   (d) nilai flag berupa BOOLEAN, bukan string `"off"`/`"on"`/`"shadow"`.
//
// Nol dependency, nol jaringan, nol berkas temporer. Node murni (fs + path). Keluar 0 hijau,
// 1 merah, dan menulis CONFIG-CONSISTENCY-REPORT.json seperti gerbang lain di repo ini.
'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

const RUNBOOK_REL = 'docs/CF-MIGRATION-RUNBOOK.md';
const runbook = read(RUNBOOK_REL);
const schema = read('workers/api/schema.js');
const wrangler = read('workers/api/wrangler.toml');
const quotaConfig = read('workers/api/quota/quota-config.js');
const workflow = read('.github/workflows/quality.yml');

check('Gerbang ini terdaftar di .github/workflows/quality.yml',
  workflow.includes('node config-consistency-test.js'), 'quality.yml');

/* =======================================================================================
 * 0. Daftar kunci sah DIBACA DARI SUMBER, tidak diketik ulang.
 *    Kalau daftar di schema.js berubah, gerbang ini ikut berubah — itu memang tujuannya.
 *    Kalau blok tidak bisa dibaca, gerbang MERAH (bukan hijau dengan daftar kosong, yang
 *    akan membuat semua assert (a) lolos secara palsu).
 * ===================================================================================== */
function readFrozenKeys(src, constName) {
  const at = src.indexOf(`export const ${constName} = Object.freeze({`);
  if (at < 0) return null;
  const open = src.indexOf('{', src.indexOf('Object.freeze(', at));
  const close = src.indexOf('});', open);
  if (open < 0 || close < 0) return null;
  const body = src.slice(open + 1, close);
  const keys = [];
  for (const line of body.split('\n')) {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(line);
    if (m) keys.push(m[1]);
  }
  return keys.length ? keys : null;
}

const clientFlagKeys = readFrozenKeys(schema, 'CLIENT_FLAG_DEFAULTS');
const killSwitchKeys = readFrozenKeys(schema, 'KILL_SWITCH_DEFAULTS');
check('CLIENT_FLAG_DEFAULTS terbaca dari workers/api/schema.js',
  Array.isArray(clientFlagKeys) && clientFlagKeys.length === 6,
  clientFlagKeys ? clientFlagKeys.join(',') : 'TIDAK TERBACA');
check('KILL_SWITCH_DEFAULTS terbaca dari workers/api/schema.js',
  Array.isArray(killSwitchKeys) && killSwitchKeys.length === 4,
  killSwitchKeys ? killSwitchKeys.join(',') : 'TIDAK TERBACA');

const FLAG_KEYS = new Set(clientFlagKeys || []);
const KILL_KEYS = new Set(killSwitchKeys || []);
const ALL_KNOWN = new Set([...FLAG_KEYS, ...KILL_KEYS]);

// Nama datar peninggalan runbook lama. Ini BUKAN sekadar "kunci tak dikenal": ia pernah nyata
// ada di dokumen dan pernah dijalankan owner, jadi ia disebut namanya supaya pesan gagalnya
// langsung memberi tahu apa yang salah.
const LEGACY_FLAT_NAMES = new Set(['transport', 'quotaUi', 'identity', 'coachUi', 'ttsUi']);

/* =======================================================================================
 * 1. Ambil SEMUA blok kode berpagar dari runbook. Yang dipindai adalah BLOK KODE, bukan
 *    prosa: prosa boleh (dan memang harus) menyebut nama lama untuk menjelaskan cacatnya,
 *    tetapi tidak boleh ada satu pun PERINTAH yang bisa disalin-tempel dengan bentuk salah.
 * ===================================================================================== */
function fencedBlocks(md) {
  const out = [];
  const lines = md.split('\n');
  let inBlock = false, buf = [], startLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      if (inBlock) { out.push({ line: startLine, text: buf.join('\n') }); inBlock = false; buf = []; }
      else { inBlock = true; startLine = i + 2; }
      continue;
    }
    if (inBlock) buf.push(lines[i]);
  }
  return out;
}

const blocks = fencedBlocks(runbook);
check('Blok kode runbook bisa dipindai', blocks.length > 10, `${blocks.length} blok kode`);

/* Setiap objek JSON yang muncul di blok kode, apa pun cara pengutipannya:
 *  - argumen `wrangler kv key put ... '{...}'` (kutip tunggal)
 *  - JSON polos di blok ```json
 * Pemindaian berbasis penyeimbangan kurung kurawal, jadi objek bersarang ikut terambil utuh. */
function jsonObjectsIn(text) {
  const found = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = j; break; } }
      else if (ch === '\n' && depth > 0) { /* JSON multi-baris diizinkan */ }
    }
    if (end < 0) continue;
    const raw = text.slice(i, end + 1);
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) found.push({ raw, parsed });
    i = end;
  }
  return found;
}

/* Sebuah objek dianggap "contoh KV cfg:flags" kalau ia berada di blok yang menulis/membaca
 * `cfg:flags`, ATAU kalau ia memuat salah satu nama kunci yang kita kenal / nama datar lama.
 * Dengan begitu contoh JSON yang tidak berhubungan (mis. respons /health) tidak ikut terjaring,
 * tetapi contoh KV yang salah bentuk TIDAK BISA lolos hanya karena tidak menyebut `cfg:flags`. */
function looksLikeKvFlagsExample(block, obj) {
  if (/cfg:flags/.test(block.text)) return true;
  const keys = Object.keys(obj.parsed);
  if (keys.includes('flags') || keys.includes('enabled')) return true;
  return keys.some(k => ALL_KNOWN.has(k) || LEGACY_FLAT_NAMES.has(k));
}

const kvExamples = [];
for (const block of blocks) {
  for (const obj of jsonObjectsIn(block.text)) {
    if (looksLikeKvFlagsExample(block, obj)) kvExamples.push({ line: block.line, ...obj });
  }
}
check('Runbook memuat contoh KV cfg:flags yang bisa diperiksa gerbang',
  kvExamples.length >= 3, `${kvExamples.length} contoh ditemukan`);

/* ---------------------------------------------------------------------------------------
 * (b) TIDAK ADA bentuk DATAR. Setiap contoh KV wajib punya `flags` dan/atau `enabled`
 *     di tingkat atas, dan TIDAK BOLEH punya kunci tingkat atas lain.
 * ------------------------------------------------------------------------------------- */
const flatOffenders = [];
for (const ex of kvExamples) {
  const top = Object.keys(ex.parsed);
  const hasContainer = top.includes('flags') || top.includes('enabled');
  const stray = top.filter(k => k !== 'flags' && k !== 'enabled');
  if (!hasContainer || stray.length) {
    flatOffenders.push(`baris ~${ex.line}: kunci tingkat atas [${top.join(',')}]`);
  }
}
check('(b) NOL contoh KV bentuk datar — setiap contoh bersarang di `flags`/`enabled`',
  flatOffenders.length === 0,
  flatOffenders.length ? flatOffenders.join(' | ') : `${kvExamples.length} contoh, semua bersarang`);

/* ---------------------------------------------------------------------------------------
 * (a) Setiap kunci flag di blok kode ADA di CLIENT_FLAG_DEFAULTS / KILL_SWITCH_DEFAULTS.
 * (d) Nilainya BOOLEAN, bukan string "off"/"on"/"shadow"/"true".
 * ------------------------------------------------------------------------------------- */
const unknownKeys = [];
const nonBooleanValues = [];
for (const ex of kvExamples) {
  const scan = (container, allowed, label) => {
    const bag = ex.parsed[container];
    if (bag === undefined) return;
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
      unknownKeys.push(`baris ~${ex.line}: \`${container}\` bukan objek`);
      return;
    }
    for (const [key, value] of Object.entries(bag)) {
      if (!allowed.has(key)) unknownKeys.push(`baris ~${ex.line}: ${container}.${key} tidak ada di ${label}`);
      if (typeof value !== 'boolean') {
        nonBooleanValues.push(`baris ~${ex.line}: ${container}.${key} = ${JSON.stringify(value)} (${typeof value})`);
      }
    }
  };
  scan('flags', FLAG_KEYS, 'CLIENT_FLAG_DEFAULTS');
  scan('enabled', KILL_KEYS, 'KILL_SWITCH_DEFAULTS');
}

// Pemindaian kedua, tidak bergantung pada JSON yang bisa diparse: pola `"nama":` di blok kode.
// Ini menangkap contoh yang rusak sintaksnya (JSON.parse gagal → tidak masuk kvExamples) dan
// potongan seperti `'{"transport":"off", ...}'` yang sengaja ditulis tidak utuh.
const KEY_TOKEN = /"([A-Za-z_$][\w$]*)"\s*:/g;
const CONTAINER_KEYS = new Set(['flags', 'enabled']);
// Kunci JSON yang sah muncul di blok kode runbook di luar konteks flag (respons /health,
// /api/config, contoh payload). Didaftar EKSPLISIT supaya penambahan baru harus disadari.
const NON_FLAG_JSON_KEYS = new Set([
  'protocol', 'limits', 'aiPerDay', 'ttsCharsPerDay', 'ttlSeconds', 'serverTime', 'ok',
  'status', 'service', 'version', 'error', 'reason', 'disabled', 'skipped', 'now', 'userId',
  'class', 'plan', 'entitlements', 'issued', 'quota', 'used', 'remaining', 'resetAt',
  'endpoints', 'base', 'health', 'config', 'auth', 'usage', 'success', 'result', 'errors',
  'messages', 'value', 'key', 'name', 'id', 'type', 'binding', 'title', 'count'
]);
const strayFlagTokens = [];
// Cakupan pemindaian kedua: HANYA blok yang berbicara tentang flag/konfigurasi (`cfg:flags`
// atau `/api/config`). Blok lain di runbook memuat JSON milik domain lain (mis. `edgeGuard`
// di Bagian 2A) dan menariknya ke sini hanya akan melatih orang mengabaikan gerbang.
const flagBlocks = blocks.filter(b => /cfg:flags|\/api\/config|CLIENT_FLAG_DEFAULTS|KILL_SWITCH_DEFAULTS/.test(b.text));
check('Blok kode yang berbicara tentang flag/konfigurasi teridentifikasi',
  flagBlocks.length >= 4, `${flagBlocks.length} blok`);
for (const block of flagBlocks) {
  let m;
  KEY_TOKEN.lastIndex = 0;
  while ((m = KEY_TOKEN.exec(block.text))) {
    const key = m[1];
    if (CONTAINER_KEYS.has(key) || ALL_KNOWN.has(key) || NON_FLAG_JSON_KEYS.has(key)) continue;
    strayFlagTokens.push(`baris ~${block.line}: "${key}" bukan kunci flag yang dikenal`);
  }
}

check('(a) Setiap kunci flag di blok kode runbook ada di CLIENT_FLAG_DEFAULTS/KILL_SWITCH_DEFAULTS',
  unknownKeys.length === 0 && strayFlagTokens.length === 0,
  [...unknownKeys, ...strayFlagTokens].join(' | ') || 'semua kunci dikenal');

check('(d) Nilai flag di contoh runbook BOOLEAN, bukan string "off"/"on"/"shadow"',
  nonBooleanValues.length === 0,
  nonBooleanValues.length ? nonBooleanValues.join(' | ') : 'semua boolean');

// Larangan eksplisit atas nama datar lama sebagai KUNCI JSON di blok kode. Prosa masih boleh
// (dan wajib) menjelaskannya; yang dilarang adalah perintah yang bisa disalin-tempel.
const legacyAsKey = [];
for (const block of blocks) {
  for (const legacy of LEGACY_FLAT_NAMES) {
    if (new RegExp(`"${legacy}"\\s*:`).test(block.text)) {
      legacyAsKey.push(`baris ~${block.line}: "${legacy}":`);
    }
  }
}
check('Nama datar lama (transport/quotaUi/identity/...) TIDAK dipakai sebagai kunci JSON di blok kode',
  legacyAsKey.length === 0, legacyAsKey.join(' | ') || 'tidak ada');

// Runbook harus tetap MENJELASKAN cacatnya (penanda temuan lapangan), bukan diam-diam
// menggantinya: pembaca yang menyimpan perintah lama perlu tahu kenapa harus menggantinya.
check('Runbook menandai perbaikan ini dengan penanda temuan lapangan',
  /🔄 TEMUAN LAPANGAN 28 Agu 2026/.test(runbook),
  'penanda "🔄 TEMUAN LAPANGAN 28 Agu 2026"');
check('Runbook §4.5 menjelaskan bahwa perintah lama gagal DIAM-DIAM (bukan sekadar diganti)',
  /route-config\.js:53-54/.test(runbook) && /mergeFlags/.test(runbook),
  'menyebut route-config.js:53-54 + mergeFlags');
check('Runbook memuat perintah verifikasi curl untuk /api/config',
  /curl -s https:\/\/api\.fiezel\.my\.id\/api\/config/.test(runbook), 'curl /api/config');
check('Runbook memuat contoh MENYALAKAN satu endpoint dan contoh MEMATIKAN darurat',
  /menyalakan SATU endpoint saja/i.test(runbook) && /MATIKAN SEMUA JALUR CF/.test(runbook),
  'kedua contoh ada di §4.6 dan §4.7');

/* =======================================================================================
 * 2. (c) ANGKA NASKAH == ANGKA PENEGAKAN.
 *    Pasangan dipetakan EKSPLISIT. Tidak ada pencocokan otomatis "nama mirip": satu-satunya
 *    cara menambah pasangan adalah menuliskannya di sini, sehingga siapa pun yang menambah
 *    var batas baru dipaksa memutuskan angka penegakannya.
 * ===================================================================================== */
const LIMIT_PAIRS = [
  {
    varName: 'AI_LIMIT_PER_DAY',
    enforcedName: 'FREE_AI_DAILY_LIMIT',
    why: 'limits.aiPerDay dikirim ke murid (route-config.js:69, route-user.js:53) dan dipakai naskah kuota; penegakannya quota-config.js'
  },
  {
    varName: 'TTS_CHARS_PER_DAY',
    enforcedName: 'FREE_TTS_DAILY_CHARS',
    why: 'limits.ttsCharsPerDay dikirim ke murid (route-config.js:70, route-user.js:55); penegakannya quota-config.js'
  }
];

// Var batas di [vars] yang SENGAJA tidak punya pasangan penegakan. Setiap entri wajib
// membawa alasan tertulis — daftar ini ada supaya pengecualian tidak pernah SENYAP.
const UNPAIRED_LIMIT_VARS = [
  {
    varName: 'AI_LIMIT_PER_HOUR',
    reason: 'tidak ada batas AI per-JAM di quota-config.js untuk dipasangkan; yang ditegakkan hanya FREE_AI_RATE_PER_MINUTE=8 (=480/jam) dan harian 25, dan 25/hari mengikat jauh lebih dulu daripada 40/jam. Var ini TETAP dikirim ke klien sebagai limits.aiPerHour (route-user.js:54), jadi naskah tanpa penegakan — dibiarkan apa adanya, tidak didiamkan.'
  },
  {
    varName: 'GLOBAL_NEURON_CAP',
    reason: 'plafon jatah AKUN Cloudflare (bukan per murid); pasangannya ACCOUNT_DAILY_NEURON_BUDGET=10000 SENGAJA lebih besar — 8.000 disetel DI BAWAH plafon sebagai margin, jadi "cocok" justru salah.'
  },
  {
    varName: 'MAX_USERS',
    reason: 'batas kapasitas pemasangan (cermin fiezel-core-worker.js:5), bukan kuota per-pengguna; tidak ada padanan di quota-config.js.'
  }
];

function tomlVarNumber(name) {
  // Hanya baris deklarasi nyata, bukan komentar (`#` di awal baris) — komentar §4.5-style
  // yang menyebut nilai lama tidak boleh mengubah hasil gerbang.
  const re = new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, 'm');
  const m = re.exec(wrangler);
  if (!m) return { ok: false, reason: 'var tidak ditemukan di wrangler.toml' };
  const raw = m[1];
  if (!/^\d+$/.test(raw)) return { ok: false, reason: `nilai "${raw}" bukan bilangan bulat` };
  return { ok: true, value: Number(raw), raw };
}

function quotaNumber(name) {
  const re = new RegExp(`^\\s*${name}\\s*:\\s*(\\d+)\\s*,`, 'm');
  const m = re.exec(quotaConfig);
  if (!m) return { ok: false, reason: 'konstanta tidak ditemukan di quota-config.js' };
  return { ok: true, value: Number(m[1]) };
}

const pairRows = [];
for (const pair of LIMIT_PAIRS) {
  const script = tomlVarNumber(pair.varName);
  const enforced = quotaNumber(pair.enforcedName);
  const ok = script.ok && enforced.ok && script.value === enforced.value;
  pairRows.push({
    naskah: `${pair.varName}=${script.ok ? script.value : script.reason}`,
    penegakan: `${pair.enforcedName}=${enforced.ok ? enforced.value : enforced.reason}`,
    cocok: ok
  });
  check(`(c) ${pair.varName} (naskah) == ${pair.enforcedName} (penegakan)`, ok,
    `naskah=${script.ok ? script.value : script.reason} penegakan=${enforced.ok ? enforced.value : enforced.reason} — ${pair.why}`);
}

// Penegakan TIDAK BOLEH diturunkan untuk "merapikan" dokumen: kalau seseorang menyelaraskan
// dengan cara memangkas jatah murid, gerbang (c) di atas akan tetap hijau — jadi lantai
// nilainya di-assert terpisah. Angka ini berasal dari cf-a10 §6 dan sudah dipakai murid.
const FLOOR = { FREE_AI_DAILY_LIMIT: 25, FREE_TTS_DAILY_CHARS: 12000 };
for (const [name, floor] of Object.entries(FLOOR)) {
  const got = quotaNumber(name);
  check(`Penegakan ${name} tidak DITURUNKAN (>= ${floor}, cf-a10 §6)`,
    got.ok && got.value >= floor, got.ok ? String(got.value) : got.reason);
}

// Setiap var yang namanya berbau batas kuota wajib berada di salah satu daftar: dipetakan,
// atau dikecualikan DENGAN ALASAN. Tidak ada jalan tengah yang senyap.
const LIMITISH = /^([A-Z0-9_]*(LIMIT|CHARS_PER|CAP|MAX)[A-Z0-9_]*)\s*=\s*"/gm;
const mapped = new Set(LIMIT_PAIRS.map(p => p.varName));
const excused = new Map(UNPAIRED_LIMIT_VARS.map(u => [u.varName, u.reason]));
const undecided = [];
let lm;
while ((lm = LIMITISH.exec(wrangler))) {
  const name = lm[1];
  if (mapped.has(name) || excused.has(name)) continue;
  undecided.push(name);
}
check('Setiap var batas di [vars] dipetakan ke penegakan ATAU dikecualikan dengan alasan tertulis',
  undecided.length === 0,
  undecided.length ? `belum diputuskan: ${undecided.join(', ')}` : `${mapped.size} dipetakan, ${excused.size} dikecualikan beralasan`);

for (const u of UNPAIRED_LIMIT_VARS) {
  check(`Pengecualian ${u.varName} membawa alasan (bukan didiamkan)`, u.reason.length > 60, u.reason.slice(0, 90) + '…');
}

// wrangler.toml wajib menjelaskan arah penyelarasan di tempat angkanya hidup: pembaca berikutnya
// membaca berkas ini, bukan laporan.
check('wrangler.toml menjelaskan arah penyelarasan (naskah mengikuti penegakan)',
  /quota-config\.js/.test(wrangler) && /config-consistency-test\.js/.test(wrangler),
  'komentar menunjuk quota-config.js + gerbang ini');

/* =======================================================================================
 * 3. Laporan
 * ===================================================================================== */
const report = {
  gate: 'config-consistency-test.js',
  generatedAt: new Date().toISOString(),
  runbook: RUNBOOK_REL,
  clientFlagKeys,
  killSwitchKeys,
  kvExamplesChecked: kvExamples.length,
  limitPairs: pairRows,
  unpairedLimitVars: UNPAIRED_LIMIT_VARS,
  checks,
  result: failed ? 'FAIL' : 'PASS'
};
fs.writeFileSync(path.join(root, 'CONFIG-CONSISTENCY-REPORT.json'), JSON.stringify(report, null, 2) + '\n');

for (const c of checks) console.log(`${c.status === 'PASS' ? '✅' : '❌'} ${c.name} — ${c.details}`);
console.log(`\n${failed ? 'GAGAL' : 'LULUS'}: ${checks.filter(c => c.status === 'PASS').length}/${checks.length} pemeriksaan hijau`);
process.exit(failed ? 1 : 0);
