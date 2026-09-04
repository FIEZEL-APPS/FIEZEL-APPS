#!/usr/bin/env node
/**
 * FIEZEL Content Chain Report — menjalankan rantai konten atas kandidat SUNGGUHAN,
 * dan melaporkan di mana ia berdiri.
 *
 * KENAPA ALAT INI ADA
 * -------------------
 * `fiezel-content-chain.js` bisa menghitung posisi kandidat, tetapi ia modul MURNI: ia hanya
 * menerima laporan yang sudah jadi. Sampai ada yang benar-benar memberinya laporan dari data
 * kanonik nyata, ia hidup dari fixture — dan `gateStatus:'UNVERIFIED_LOCAL_GATES_REQUIRED'`
 * yang dikembalikan worker tetap tidak pernah bergerak dalam praktik. Alat ini yang
 * menggerakkannya: ia menjalankan gerbang lokal deterministik atas bank soal asli, lalu
 * menyusun laporan-laporan itu menjadi satu jawaban.
 *
 * BATAS YANG TIDAK BISA DILANGGAR ALAT INI
 * ---------------------------------------
 * Ia HANYA MEMBACA. Tidak ada satu pun jalur di sini yang menulis ke grammar-templates.json,
 * vocabulary-master.json, atau reading-bank.json — dan itu diperiksa, bukan dijanjikan:
 * validateCandidate() menghitung sha256 ketiga berkas sebelum dan sesudah, dan gerbang
 * content-chain-report-test.js menghitungnya sekali lagi dari luar.
 *
 * Yang paling jauh bisa dilaporkannya adalah `owner_decision`: semua yang bisa dibuktikan
 * mesin sudah terbukti, sisanya tanda tangan manusia. Tidak ada bendera, argumen, atau
 * berkas masukan yang mengubah itu.
 *
 * PEMAKAIAN
 *   node tools/content-chain-report.mjs --proof
 *   node tools/content-chain-report.mjs --candidate <file.json>
 *       [--canary-config <f>] [--canary-evidence <f>] [--verdict <f>] [--receipt-ledger <f>]
 *       [--json]
 *
 * Keluar 0 bila rantainya bisa dinilai (termasuk saat tertahan — tertahan adalah jawaban,
 * bukan galat), 1 hanya bila masukannya sendiri tidak bisa dibaca.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const gate = require(path.join(ROOT, 'content-patch-gate.js'));
const chain = require(path.join(ROOT, 'features/brain/fiezel-content-chain.js'));

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : null;
}
function has(name) { return process.argv.includes('--' + name); }

/** Berkas opsional. Absen -> null, dan null di rantai berarti TERTAHAN, bukan lulus. */
function readJson(file) {
  if (!file) return null;
  try { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
  catch (e) { throw new Error('tidak bisa membaca ' + file + ': ' + e.message); }
}

export function buildReport(options = {}) {
  const input = gate.loadCanonical(ROOT);
  const candidate = options.candidate || gate.proofCandidate(input);

  // Gerbang lokal deterministik atas data kanonik NYATA. Inilah langkah yang memindahkan
  // gateStatus dari UNVERIFIED_LOCAL_GATES_REQUIRED — dan satu-satunya tempat ia bisa
  // dijalankan, karena worker tidak punya berkas kanonik.
  const localGate = gate.validateCandidate(candidate, input);

  const assessment = chain.assess({
    candidate,
    localGate,
    canaryConfig: options.canaryConfig || null,
    canaryEvidence: options.canaryEvidence || null,
    verdict: options.verdict || null,
    receiptLedger: options.receiptLedger || null
  }, options.nowMs ?? Date.now());

  return {
    schema: 'fiezel-content-chain-report-v1',
    sourceVersion: input.version,
    patchId: candidate.patchId,
    domain: candidate.domain,
    target: candidate.target?.itemId ?? null,
    localGate: {
      ok: localGate.ok,
      gateVersion: localGate.gateVersion,
      errors: localGate.errors,
      canonicalImmutable: localGate.canonicalImmutable,
      baselineQa: localGate.baselineQa,
      patchedQa: localGate.patchedQa
    },
    /* Status yang MENGGANTIKAN nilai gantung dari worker. Ia hanya berpindah saat gerbang
       lokal benar-benar dijalankan dan hijau — tidak ada jalur lain yang menyetelnya. */
    gateStatus: localGate.ok ? 'LOCAL_GATES_PASSED' : 'LOCAL_GATES_FAILED',
    chain: assessment
  };
}

function render(r) {
  const c = r.chain;
  const lines = [
    'FIEZEL content chain — ' + r.patchId,
    '  sumber      : ' + r.domain + '/' + r.target + ' @ ' + r.sourceVersion,
    '  gerbang lokal: ' + (r.localGate.ok ? 'LULUS' : 'GAGAL') +
      ' (' + r.localGate.gateVersion + ', kanonik utuh: ' + r.localGate.canonicalImmutable + ')',
    '  gateStatus  : ' + r.gateStatus,
    '  tahap       : ' + c.stage,
    '  penghalang  : ' + (c.blockers.length ? c.blockers.join(', ') : '—'),
    '  keputusan OWNER diperlukan: ' + c.ownerDecisionRequired
  ];
  if (r.localGate.errors?.length) lines.push('  galat gerbang: ' + r.localGate.errors.join('; '));
  if (r.localGate.baselineQa && r.localGate.patchedQa) {
    lines.push('  QA          : blocker ' + r.localGate.baselineQa.blockers + '->' + r.localGate.patchedQa.blockers +
      ', review ' + r.localGate.baselineQa.review + '->' + r.localGate.patchedQa.review);
  }
  lines.push(c.ready
    ? '  => Setiap tautan yang bisa dibuktikan mesin sudah terbukti. Yang tersisa tanda tangan OWNER.'
    : '  => Tertahan di "' + c.stage + '". Tertahan adalah jawaban, bukan kegagalan.');
  return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const file = arg('candidate');
    const report = buildReport({
      candidate: file ? readJson(file) : (has('proof') ? null : (() => {
        const dflt = path.join(ROOT, 'CONTENT-PATCH-CANDIDATE.json');
        if (fs.existsSync(dflt)) return readJson(dflt);
        throw new Error('kandidat diperlukan: --proof atau --candidate <file>');
      })()),
      canaryConfig: readJson(arg('canary-config')),
      canaryEvidence: readJson(arg('canary-evidence')),
      verdict: readJson(arg('verdict')),
      receiptLedger: readJson(arg('receipt-ledger'))
    });
    console.log(has('json') ? JSON.stringify(report, null, 2) : render(report));
    process.exitCode = 0;
  } catch (e) {
    console.error('content-chain-report: ' + e.message);
    process.exitCode = 1;
  }
}
