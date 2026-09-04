/**
 * A12 — BUKTI GERBANG BISA MERAH.
 *
 * Gerbang yang belum pernah merah bukan gerbang; ia dekorasi. Skrip ini mengembalikan setiap cacat
 * SATU per satu (patch string di berkas sumber), menjalankan gerbang yang seharusnya menangkapnya,
 * lalu MEMULIHKAN berkasnya apa pun yang terjadi. Keluarannya matriks: cacat -> gerbang -> exit.
 *
 * Ini alat sekali jalan untuk laporan, BUKAN bagian rantai CI. Ia tidak dipanggil quality.yml.
 *   node tools/a12-red-proof.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const R = (p) => path.join(ROOT, p);

const CASES = [
  {
    id: 'D1 voiceId tidak diteruskan ke provider (cacat staging asli)',
    patches: [[R('workers/api/tts/tts-provider-params.js'),
      'if (params.voiceSupported && params.voiceParam) input[params.voiceParam] = voiceId;',
      '/* cacat dikembalikan sementara */']],
    gates: ['tts-provider-contract-test.js']
  },
  {
    id: 'D1b voice bawaan runtime beda dari korpus pra-render',
    patches: [[R('workers/api/tts/tts-provider-params.js'),
      "var CORPUS_DEFAULT_VOICE_ID = 'aura-asteria-en';",
      "var CORPUS_DEFAULT_VOICE_ID = 'aura-2-thalia-en';"]],
    gates: ['tts-provider-contract-test.js']
  },
  {
    id: 'D1c nama parameter route-tts menyimpang dari pra-render',
    patches: [
      [R('workers/api/tts/tts-provider-params.js'), "voiceParam: 'speaker'", "voiceParam: 'voice'"],
      [R('tools/prerender-tts.mjs'),
        'const input = ProviderParams.buildProviderInput({',
        'const input = { text: text, speaker: env.speaker || model.voiceId }; ProviderParams.buildProviderInput({']
    ],
    gates: ['tts-provider-contract-test.js']
  },
  {
    id: 'D1d mesin tak dikenal ditebak menjadi {text} alih-alih melempar',
    patches: [[R('workers/api/tts/tts-provider-params.js'),
      "if (!found) throw new Error('tts_provider_params_unknown: ' + key);",
      "if (!found) return { engineId: key, textParam: 'text', voiceParam: '', localeParam: '', voiceSupported: false, defaultVoiceId: CORPUS_DEFAULT_VOICE_ID, evidence: 'ditebak' };"]],
    gates: ['tts-provider-contract-test.js']
  },
  {
    id: 'D1e cache hit mengaku menagih kuota',
    patches: [[R('workers/api/tts/route-tts.js'),
      "source: 'cache', degraded: false, bytes: Number(existing.size || 0), chars: chars,\n        quotaCharged: false",
      "source: 'cache', degraded: false, bytes: Number(existing.size || 0), chars: chars,\n        quotaCharged: true"]],
    gates: ['tts-provider-contract-test.js']
  },
  {
    id: 'D2 quotaCharged hilang dari jalur penolakan kuota 429',
    patches: [
      [R('workers/api/ai/route-ai.js'), '      quotaCharged: false,\n      usage: { inputTokens: 0, outputTokens: 0, ms: 0 },', '      usage: { inputTokens: 0, outputTokens: 0, ms: 0 },'],
      [R('workers/api/ai/route-ai.js'), '          quotaCharged: false,\n          usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }\n        }), 429', '          usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }\n        }), 429']
    ],
    gates: ['ai-response-shape-test.js']
  },
  {
    id: 'D2b jalur sukses mengaku TIDAK menagih (field jadi konstanta tak berguna)',
    patches: [[R('workers/api/ai/route-ai.js'), 'quotaCharged: quotaChecked === true,', 'quotaCharged: false,']],
    gates: ['ai-response-shape-test.js']
  },
  {
    id: 'D3 keluaran kosong dideteksi dengan .trim() saja (lolos "{}" dari jsonMode)',
    patches: [[R('workers/api/ai/ai-tasks.js'),
      '  function isEmptyOutput(text) {',
      '  function isEmptyOutput(text) {\n    return !String(text == null ? "" : text).trim();']],
    gates: ['ai-response-shape-test.js']
  },
  {
    id: 'D3b keluaran kosong ditolak tapi kuota TIDAK dikembalikan',
    // Keluaran kosong diklasifikasikan sebagai KEGAGALAN MODEL, jadi ia keluar lewat cabang
    // `failureKind`, bukan `qualityRejected`. Kedua cabang dipatch supaya matriks tidak
    // "hijau karena salah sasaran".
    patches: [
      [R('workers/api/ai/route-ai.js'), 'var rolledBackQ = quotaChecked && await releaseQuota(deps, {', 'var rolledBackQ = false && await releaseQuota(deps, {'],
      [R('workers/api/ai/route-ai.js'), 'var rolledBackF = quotaChecked && await releaseQuota(deps, {', 'var rolledBackF = false && await releaseQuota(deps, {']
    ],
    gates: ['ai-response-shape-test.js']
  }
];

const matrix = [];
for (const c of CASES) {
  const backups = new Map();
  let applied = true;
  try {
    for (const [file, from, to] of c.patches) {
      const src = fs.readFileSync(file, 'utf8');
      if (!backups.has(file)) backups.set(file, src);
      if (!src.includes(from)) { applied = false; matrix.push({ cacat: c.id, gerbang: '-', exit: 'PATCH_TIDAK_COCOK', merah: false, jangkar: from.slice(0, 60) }); break; }
      fs.writeFileSync(file, src.replace(from, to));
    }
    if (!applied) continue;
    for (const gate of c.gates) {
      let code = 0;
      try { execFileSync(process.execPath, [R(gate)], { cwd: ROOT, stdio: 'pipe' }); }
      catch (e) { code = e.status == null ? 1 : e.status; }
      matrix.push({ cacat: c.id, gerbang: gate, exit: code, merah: code !== 0 });
    }
  } finally {
    for (const [file, src] of backups) fs.writeFileSync(file, src);
  }
}

// Sesudah semua pemulihan: gerbangnya harus hijau lagi. Tanpa baris ini, skrip yang gagal
// memulihkan berkas akan meninggalkan repo rusak dan tetap terlihat sukses.
const after = [];
for (const gate of ['tts-provider-contract-test.js', 'ai-response-shape-test.js']) {
  let code = 0;
  try { execFileSync(process.execPath, [R(gate)], { cwd: ROOT, stdio: 'pipe' }); } catch (e) { code = e.status == null ? 1 : e.status; }
  after.push({ gerbang: gate, exit: code });
}

const out = {
  schema: 'fiezel-a12-red-proof-v1',
  semuaMerah: matrix.every((m) => m.merah === true),
  pulihHijau: after.every((a) => a.exit === 0),
  matrix,
  sesudahPemulihan: after
};
fs.writeFileSync(R('A12-RED-PROOF.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
if (!out.semuaMerah || !out.pulihHijau) process.exitCode = 1;
