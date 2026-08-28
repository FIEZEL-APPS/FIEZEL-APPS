/**
 * S3 — BUKTI GERBANG TTS-JUJUR BISA MERAH.
 *
 * Gerbang yang belum pernah merah bukan gerbang; ia dekorasi. Skrip ini MENGEMBALIKAN setiap
 * cacat satu per satu (patch string di berkas sumber produksi), menjalankan gerbang yang
 * seharusnya menangkapnya, lalu MEMULIHKAN berkasnya apa pun yang terjadi.
 *
 * Dua cacat pertama adalah cacat SUNGGUHAN yang diukur di produksi hidup 28 Agu 2026:
 *   - `cfTtsEnabled:false` + `enabled.tts:false` -> POST /api/tts/render tetap 200 dan tetap
 *     melepas neuron akun (`accountNeuronsReleased` ada di amplop).
 *   - amplop `quotaCharged:true` pada `source:"unavailable"`, `bytes:0`, sementara
 *     GET /api/quota tidak bergerak (`ttsChars.used` tetap 0).
 *
 * Alat sekali jalan untuk laporan, BUKAN bagian rantai CI (tidak dipanggil quality.yml).
 *   node tools/tts-honest-red-matrix.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const R = (p) => path.join(ROOT, p);
const GATE = 'tts-provider-contract-test.js';
const WIRING = R('workers/api/route-wiring.js');
const TTS = R('workers/api/tts/route-tts.js');
const FLAGS = R('workers/api/feature-gate.js');
const HARNESS = R('tools/cf-test-harness.js');

const CASES = [
  {
    id: 'S1 pagar flag TTS dicabut dari route-wiring (cacat produksi asli: 200 + render jalan)',
    expect: ['S3-a1', 'S3-a2', 'S3-a6', 'S3-a7'],
    patches: [[WIRING,
      '        if (metered) {\n          const gate = await checkTtsEnabled(env);',
      '        if (false) {\n          const gate = await checkTtsEnabled(env);']]
  },
  {
    id: 'S1b flag yang tak terbaca dianggap izin (fail-OPEN alih-alih fail-closed)',
    expect: ['S3-a7', 'S3-e4'],
    patches: [[FLAGS,
      "  if (!snapshot || snapshot.ok !== true) {\n    return { allowed: false, reason: f.reasons.flagsUnreadable };\n  }",
      '  if (!snapshot || snapshot.ok !== true) {\n    return { allowed: true, reason: \'\' };\n  }']]
  },
  {
    id: 'S1c var FEATURE_TTS di wrangler.toml diabaikan (hanya KV yang mengikat)',
    expect: ['S3-a6'],
    patches: [[FLAGS,
      "  if (String((env && env[f.varName]) || '') !== 'on') {\n    return { allowed: false, reason: f.reasons.featureVarOff };\n  }",
      "  if (false) {\n    return { allowed: false, reason: f.reasons.featureVarOff };\n  }"]]
  },
  {
    id: 'S1d penolakan flag TTS menjanjikan retryAfter yang tidak bisa ditepati',
    expect: ['S3-a4'],
    patches: [[TTS,
      "      error: 'tts_disabled',",
      "      error: 'tts_disabled',\n      retryAfter: 300,"]]
  },
  {
    id: 'S1e naskah penolakan flag memakai bahasa jatah (murid disalahkan atas keputusan server)',
    expect: ['S3-a5'],
    patches: [[TTS,
      "    tts_disabled: 'Suara dari perangkatmu dulu",
      "    tts_disabled: 'Jatahmu habis untuk hari ini. Coba lagi besok. Suara dari perangkatmu dulu"]]
  },
  {
    id: 'S1f bentuk amplop penolakan TTS menyimpang dari penolakan AI (copyKey/error sendiri)',
    expect: ['S3-e3'],
    patches: [[TTS, "      copyKey: 'tts.disabled',", "      copyKey: 'tts.off',"]]
  },
  {
    id: 'S1g penolakan flag TTS tidak lagi 403 (klien tidak bisa membedakan dari kegagalan)',
    expect: ['S3-a1', 'S3-e2'],
    patches: [[TTS,
      '    return json(body, 403, a.headers || null);',
      '    return json(body, 503, a.headers || null);']]
  },
  {
    id: 'S2 CACAT PRODUKSI: jalur nol byte / provider gagal mengaku menagih',
    expect: ['S3-b1', 'S3-b4', 'S3-c1'],
    patches: [[TTS,
      "          quotaChecked: ledger.checked === true, quotaCharged: chargedFor(ledger), failed: true",
      '          quotaChecked: ledger.checked === true, quotaCharged: true, failed: true']]
  },
  {
    id: 'S2b pembatalan kuota tidak dicatat, jadi chargedFor() kembali bohong',
    expect: ['S3-b1', 'S3-c1'],
    patches: [[TTS,
      '  function chargedFor(ledger) {\n    return ledger.checked === true && ledger.rollbackRequested !== true;',
      '  function chargedFor(ledger) {\n    return ledger.checked === true;']]
  },
  {
    id: 'S2c jalur SUKSES mengaku tidak menagih (field jadi konstanta "false" yang tak berguna)',
    expect: ['S3-b1', 'S3-b2'],
    patches: [[TTS,
      '        bytes: byteSize(bytes), chars: chars, stored: true,\n        quotaChecked: ledger.checked === true, quotaCharged: chargedFor(ledger)',
      '        bytes: byteSize(bytes), chars: chars, stored: true,\n        quotaChecked: ledger.checked === true, quotaCharged: false']]
  },
  {
    id: 'S2d cache hit R2 mengaku menagih jatah',
    expect: ['S3-b1', 'S3-c1', 'S3-d1'],
    patches: [[TTS,
      "        source: 'cache', degraded: false, bytes: Number(existing.size || 0), chars: chars,\n        quotaCharged: false",
      "        source: 'cache', degraded: false, bytes: Number(existing.size || 0), chars: chars,\n        quotaCharged: true"]]
  },
  {
    id: 'S3 CACAT KETIGA: penggabungan permintaan dikembalikan ke SESUDAH gerbang kuota',
    expect: ['S3-d2', 'S3-d3', 'S3-d4'],
    patches: [[TTS,
      '    if (inFlight.has(identity.audioKey)) {',
      '    if (false && inFlight.has(identity.audioKey)) {']]
  },
  {
    id: 'S3b permintaan yang digabungkan mewarisi klaim penagihan pemimpin',
    expect: ['S3-d3'],
    patches: [[TTS,
      "        source: 'cache', degraded: false, bytes: Number(shared.bytes || 0), chars: chars,\n        coalesced: true",
      "        source: 'cache', degraded: false, bytes: Number(shared.bytes || 0), chars: chars,\n        coalesced: true, quotaChecked: true, quotaCharged: true"]]
  },
  {
    id: 'S4 accountNeuronsReleased dipatok true walau pelepasan tidak pernah terjadi',
    expect: ['S3-f2'],
    patches: [[TTS,
      '          accountNeuronsReleased: !!released,',
      '          accountNeuronsReleased: true,']]
  },
  {
    id: 'S5 bytes kembali ditaksir 0,75x panjang base64 (bukan byte audio sungguhan)',
    expect: ['S3-g1', 'S3-g2', 'S3-g3'],
    patches: [
      [TTS, "    if (result && typeof result.audio === 'string') return decodeBase64(result.audio);",
        '    if (result && typeof result.audio === \'string\') return result.audio;'],
      [TTS, "    if (typeof payload === 'string') return 0; // string tidak pernah dilaporkan sebagai audio (lihat decodeBase64)",
        "    if (typeof payload === 'string') return Math.floor(payload.length * 0.75);"]
    ]
  },
  {
    id: 'S5b base64 ditulis ke R2 sebagai teks (yang dilaporkan != yang disimpan)',
    expect: ['S3-g1', 'S3-g2'],
    patches: [[TTS,
      "    if (result && typeof result.audio === 'string') return decodeBase64(result.audio);",
      '    if (result && typeof result.audio === \'string\') return result.audio;']]
  },
  {
    id: 'S6 R2 palsu kembali mengukur body biner lewat String() (bucket palsu yang berbohong)',
    expect: ['S3-g2'],
    patches: [[HARNESS,
      '      store.set(key, normalize({ body, size: r2BodySize(body), httpMetadata: options && options.httpMetadata }));',
      "      store.set(key, normalize({ body, size: Buffer.byteLength(String(body || '')), httpMetadata: options && options.httpMetadata }));"]]
  }
];

function runGate() {
  try {
    execFileSync(process.execPath, [R(GATE)], { cwd: ROOT, stdio: 'pipe' });
    return { exit: 0, failed: [] };
  } catch (e) {
    let failed = [];
    try {
      const rep = JSON.parse(fs.readFileSync(R('TTS-PROVIDER-CONTRACT-REPORT.json'), 'utf8'));
      failed = rep.checks.filter((c) => c.status === 'FAIL').map((c) => String(c.name).split('.')[0]);
    } catch { /* laporan tidak terbaca */ }
    return { exit: e.status == null ? 1 : e.status, failed };
  }
}

const matrix = [];
for (const c of CASES) {
  const backups = new Map();
  let applied = true;
  try {
    for (const [file, from, to] of c.patches) {
      const src = fs.readFileSync(file, 'utf8');
      if (!backups.has(file)) backups.set(file, src);
      if (!src.includes(from)) {
        applied = false;
        matrix.push({ cacat: c.id, exit: 'PATCH_TIDAK_COCOK', merah: false, jangkar: from.slice(0, 70) });
        break;
      }
      fs.writeFileSync(file, src.replace(from, to));
    }
    if (!applied) continue;
    const res = runGate();
    const hit = c.expect.filter((id) => res.failed.includes(id));
    matrix.push({
      cacat: c.id, exit: res.exit, merah: res.exit !== 0,
      assertDiharapkanMerah: c.expect, assertYangMerah: res.failed,
      assertSasaranTertangkap: hit.length > 0 ? hit : 'TIDAK ADA — LUBANG GERBANG'
    });
  } finally {
    for (const [file, src] of backups) fs.writeFileSync(file, src);
  }
}

const after = runGate();
const out = {
  schema: 'fiezel-s3-tts-honest-red-matrix-v1',
  gerbang: GATE,
  jumlahMutasi: matrix.length,
  semuaMerah: matrix.every((m) => m.merah === true),
  semuaSasaranTertangkap: matrix.every((m) => Array.isArray(m.assertSasaranTertangkap) && m.assertSasaranTertangkap.length > 0),
  pulihHijau: after.exit === 0,
  matrix,
  sesudahPemulihan: after
};
fs.writeFileSync(R('S3-TTS-HONEST-RED-MATRIX.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
if (!out.semuaMerah || !out.pulihHijau || !out.semuaSasaranTertangkap) process.exitCode = 1;
