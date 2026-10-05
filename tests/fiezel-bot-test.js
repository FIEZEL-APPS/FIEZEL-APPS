#!/usr/bin/env node
/**
 * GERBANG INTEGRITAS FIEZEL BOT v2.1 (tests/fiezel-bot-test.js)
 * ------------------------------------------------------------
 * Memverifikasi integritas sistem Fiezel Bot v2.1. Gerbang ini diperkeras
 * setelah audit keamanan 2026-10-05: kini ia TIDAK LAGI sekadar "memastikan
 * string ada", melainkan menegakkan pertahanan keamanan yang sesungguhnya.
 *
 * T1. Skrip CLI valid sintaksis.
 * T2. Self-test internal lulus (12 sub-test, termasuk patch-jail).
 * T3. Workflow mematuhi standar A9 + tidak memiliki jalur push anonim.
 * T4. Tidak mengganggu gerbang timeout workflow keseluruhan.
 * T5. Komponen kunci engine v2 hadir.
 * T6. [KEAMANAN] Trigger `issue_comment` DIHAPUS (tak ada push anonim).
 * T7. [KEAMANAN] Setiap ekspresi `${{ }}` di dalam `run:` sudah dipindah ke env.
 * T8. [KEAMANAN] PR dari fork ditolak & gate aktor MASTER ada di job heal.
 * T9. [KEAMANAN] Laporan heal memakai interpolasi yang benar (tidak literal ${log...}).
 * T10.[KEAMANAN] Push hanya berkas yang dipatch (bukan `git add -A`).
 * T11.[INTEGRITAS] Patch-jail menolak path berbahaya (uji langsung ke engine).
 * T12.[INTEGRITAS] Mesin menolak heal pada branch terproteksi.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;

function sh(cmd, args = [], allowFail = false) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT });
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${args.join(' ')} gagal (${r.status}): ${(r.stderr || r.stdout || '').slice(0, 500)}`);
  return { status: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

const wfPath = path.join(ROOT, '.github/workflows/fiezel-bot.yml');
const wfContent = fs.readFileSync(wfPath, 'utf8');
const engineSrc = fs.readFileSync(path.join(ROOT, 'tools/fiezel-bot.mjs'), 'utf8');

console.log('[T1] Validasi sintaksis tools/fiezel-bot.mjs...');
sh('node', ['--check', 'tools/fiezel-bot.mjs']);
console.log('  ok');
pass++;

console.log('[T2] Menjalankan self-test tools/fiezel-bot.mjs...');
{
  const r = sh('node', ['tools/fiezel-bot.mjs', 'self-test'], true);
  assert(r.out.includes('Self-Test: PASS'), 'Self-test harus mencetak PASS');
  assert(/PASS \(21\/21 tests\)/.test(r.out), 'Self-test harus lulus 21/21');
  console.log('  ok (21/21)');
}
pass++;

console.log('[T3] Memeriksa kepatuhan workflow fiezel-bot.yml...');
assert(fs.existsSync(wfPath), 'Berkas workflow fiezel-bot.yml wajib ada');
assert(!wfContent.includes('pull_request_target'), 'A9: DILARANG pull_request_target');
assert(!wfContent.includes('permissions: write-all'), 'A9: DILARANG write-all');
assert(/timeout-minutes:\s*\d+/.test(wfContent), 'Harus memiliki timeout-minutes');
console.log('  ok');
pass++;

console.log('[T4] Menjalankan gerbang batas waktu workflow...');
sh('node', ['tests/workflow-timeout-gate-test.js']);
console.log('  ok');
pass++;

console.log('[T5] Memeriksa komponen kunci v2 di engine...');
{
  const requiredComponents = [
    'runDeterministicScan', 'classifyFiles', 'computeRiskScore', 'CI_FAILURE_SIGNATURES',
    'SECRET_PATTERNS', 'SUBSYSTEMS', 'composeReviewMarkdown', 'FIEZEL_SYSTEM_PROMPT',
    'resolveSafeRepoPath', 'readHexaSync', 'HEXA_SYNC_MARKERS', 'writePatchList', 'fenceUntrusted',
  ];
  for (const comp of requiredComponents) {
    assert(engineSrc.includes(comp), `Komponen kunci v2 "${comp}" tidak ditemukan di engine`);
  }
  assert(engineSrc.includes('patch jail') || engineSrc.includes('PATCH JAIL'), 'HARUS ada penanda patch jail');
}
console.log('  ok');
pass++;

console.log('[T6] [KEAMANAN] Memastikan trigger issue_comment dihapus...');
assert(!/^\s*issue_comment\s*:/m.test(wfContent), 'KEAMANAN: trigger issue_comment HARUS dihapus (jalur push anonim)');
assert(wfContent.includes('workflow_dispatch'), 'workflow_dispatch wajib ada untuk perintah manual MASTER');
console.log('  ok');
pass++;

console.log('[T7] [KEAMANAN] Mengaudit script-injection pada blok run:...');
{
  // Ekstrak hanya blok `run: |` dan pastikan tidak ada `${{ }}` di dalamnya.
  const lines = wfContent.split(/\r?\n/);
  let inRun = false, runIndent = 0, violations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)run:\s*[|>]\s*$/);
    if (m) { inRun = true; runIndent = m[1].length; continue; }
    if (inRun) {
      const indent = line.search(/\S/);
      if (line.trim() !== '' && indent <= runIndent) { inRun = false; }
      else if (/\$\{\{/.test(line)) { violations.push(`baris ${i + 1}: ${line.trim()}`); }
    }
  }
  assert(violations.length === 0, `KEAMANAN: ekspresi \${{ }} ditemukan di dalam blok run: (script injection)\n${violations.join('\n')}`);
}
console.log('  ok');
pass++;

console.log('[T8] [KEAMANAN] Memastikan tolak-fork & gate aktor MASTER...');
{
  assert(wfContent.includes('head_repo.full_name == github.repository') || wfContent.includes('head_repository.full_name == github.repository'),
    'KEAMANAN: PR/run dari fork HARUS ditolak');
  assert(wfContent.includes('author_association'), 'KEAMANAN: review wajib memeriksa author_association');
  assert(/FIEZEL-APPS/.test(wfContent), 'KEAMANAN: gate aktor MASTER (FIEZEL-APPS) wajib ada');
  const actorGateCount = (wfContent.match(/FIEZEL-APPS/g) || []).length;
  assert(actorGateCount >= 4, `KEAMANAN: gate aktor MASTER harus muncul di kedua job (ditemukan ${actorGateCount})`);
}
console.log('  ok');
pass++;

console.log('[T9] [KEAMANAN] Memastikan laporan heal tidak memuat literal ${log...}...');
assert(!wfContent.includes('\\${log'), 'BUG: laporan heal memuat literal ${log...} yang di-escape (tidak menampilkan log)');
assert(wfContent.includes('${snippet}'), 'Laporan heal harus memakai interpolasi ${snippet} yang benar');
console.log('  ok');
pass++;

console.log('[T10] [KEAMANAN] Memastikan push tidak memakai `git add -A`...');
{
  // Abaikan baris komentar YAML (mis. dokumentasi hardening) agar hanya
  // perintah yang benar-benar dieksekusi yang diperiksa.
  const effective = wfContent.split(/\r?\n/).filter(l => !/^\s*#/.test(l)).join('\n');
  assert(!/git\s+add\s+-A\b/.test(effective), 'KEAMANAN/BUG: `git add -A` dilarang; push harus terbatas pada berkas yang dipatch');
  assert(effective.includes('git add --'), 'Push harus memakai `git add -- <files>` dari daftar patch');
}
console.log('  ok');
pass++;

console.log('[T11] [INTEGRITAS] Menguji patch-jail langsung (T9 self-test engine)...');
{
  const r = sh('node', ['tools/fiezel-bot.mjs', 'self-test'], true);
  assert(/T9: Patch jail/.test(r.out), 'Patch jail self-test harus hadir');
  assert(/T11: Patch jail menolak \.git\/config/.test(r.out), 'Patch jail harus menolak .git/config saat apply');
}
console.log('  ok');
pass++;

console.log('[T12] [INTEGRITAS] Memastikan heal menolak branch terproteksi...');
{
  assert(engineSrc.includes('protected-branch'), 'Engine harus menolak heal pada branch terproteksi');
  assert(/main\|master/.test(wfContent), 'Workflow harus menolak push ke main/master');
}
console.log('  ok');
pass++;

console.log('[T13] [BUG] Memastikan perintah fix/bump menulis daftar patch (bukan dibuang)...');
{
  const mainSrc = engineSrc.slice(engineSrc.indexOf('async function main()'));
  for (const mode of ['fix', 'bump', 'heal']) {
    const start = mainSrc.indexOf(`case '${mode}'`);
    assert(start !== -1, `case '${mode}' wajib ada di main()`);
    const next = mainSrc.indexOf('case ', start + 5);
    const body = mainSrc.slice(start, next === -1 ? undefined : next);
    assert(body.includes('writePatchList'), `Perintah '${mode}' wajib menulis daftar patch; tanpanya step push workflow membuang hasilnya`);
  }
}
console.log('  ok');
pass++;

console.log('[T14] [BUG] Memastikan review & heal tidak berbagi grup concurrency...');
{
  assert(!/^concurrency\s*:/m.test(wfContent), 'Concurrency tingkat workflow dilarang: heal yang antre bisa membatalkan review (check wajib)');
  assert(/concurrency:\s*\n\s*group: fiezel-bot-review-/.test(wfContent), 'Job review wajib punya grup concurrency sendiri');
  assert(/concurrency:\s*\n\s*group: fiezel-bot-heal-/.test(wfContent), 'Job heal wajib punya grup concurrency sendiri');
  const concCount = (wfContent.match(/^ {4}concurrency:/gm) || []).length;
  assert(concCount === 2, `Tepat satu kunci concurrency per job (ditemukan ${concCount}); kunci ganda membuat YAML ambigu`);
}
console.log('  ok');
pass++;

console.log('[T15] [KUALITAS] Review AI: konteks berkas utuh + temuan terverifikasi + komentar inline...');
{
  for (const comp of ['buildFileContext', 'verifyFindings', 'parseDiffFiles', 'writeInlineFindings']) {
    assert(engineSrc.includes(`function ${comp}`), `Engine wajib punya ${comp}`);
  }
  const reviewBody = engineSrc.slice(engineSrc.indexOf('async function runReview'), engineSrc.indexOf('function composeAiSection'));
  assert(reviewBody.includes('buildFileContext(') && reviewBody.includes('verifyFindings('), 'runReview wajib membaca berkas utuh dan memverifikasi temuan');
  assert(/json:\s*true/.test(reviewBody), 'Review AI wajib meminta keluaran JSON terstruktur');
  assert(wfContent.includes('FIEZEL_INLINE_OUT'), 'Workflow wajib meneruskan FIEZEL_INLINE_OUT ke engine');
  assert(wfContent.includes('pulls.createReview') && wfContent.includes('listReviewComments'), 'Workflow wajib memposting review inline dan mencegah duplikat');
}
console.log('  ok');
pass++;

console.log('[T16] [KUALITAS] Rantai model diatur lewat variabel, bukan ditulis mati...');
{
  for (const v of ['FIEZEL_BOT_GEMINI_REVIEW_MODELS', 'FIEZEL_BOT_GEMINI_FAST_MODELS', 'FIEZEL_BOT_GROQ_MODELS']) {
    assert(wfContent.includes(`\${{ vars.${v} }}`), `Workflow wajib meneruskan vars.${v}`);
    assert(engineSrc.includes(`'${v}'`), `Engine wajib membaca ${v}`);
  }
  assert(/tier:\s*'review'/.test(engineSrc) && /tier:\s*'fast'/.test(engineSrc), 'Engine wajib memakai tier review (kuat) dan fast');
}
console.log('  ok');
pass++;

console.log('[T17] [OTOMASI] Review berjalan juga pada PR draft...');
{
  const reviewJob = wfContent.slice(wfContent.indexOf('auto-pr-review:'), wfContent.indexOf('auto-ci-heal:'));
  assert(!/pull_request\.draft/.test(reviewJob), 'Job review tidak boleh melewati PR draft (PR agen selalu dibuka sebagai draft)');
}
console.log('  ok');
pass++;

console.log('[T18] [GERBANG] Check wajib review gagal pada pelanggaran invarian deterministik...');
{
  const reviewJob = wfContent.slice(wfContent.indexOf('auto-pr-review:'), wfContent.indexOf('auto-ci-heal:'));
  assert(reviewJob.includes('FIEZEL_VERDICT_OUT'), 'Job review wajib meneruskan FIEZEL_VERDICT_OUT ke engine');
  assert(/CHANGES REQUESTED[\s\S]{0,300}exit 1/.test(reviewJob), 'Job review wajib exit 1 bila verdict CHANGES REQUESTED');
  assert(engineSrc.includes('function writeVerdict') && /writeVerdict\(risk\.verdict\)/.test(engineSrc), 'Engine wajib menulis verdict deterministik');
}
console.log('  ok');
pass++;

console.log('[T19] [KUALITAS] Kode pemanggil dikirim ke AI & ketepatan diukur harian...');
{
  const reviewBody = engineSrc.slice(engineSrc.indexOf('async function runReview'), engineSrc.indexOf('function writeVerdict'));
  assert(reviewBody.includes('buildCallerContext(') && reviewBody.includes('extraFiles'), 'runReview wajib mengirim kode pemanggil dan mengizinkan temuan di berkas pemanggil');
  const mPath = path.join(ROOT, '.github/workflows/fiezel-bot-metrics.yml');
  assert(fs.existsSync(mPath), 'Workflow fiezel-bot-metrics.yml wajib ada');
  const m = fs.readFileSync(mPath, 'utf8');
  assert(/schedule:/.test(m) && /workflow_dispatch:/.test(m), 'Metrik wajib terjadwal dan bisa dipicu manual');
  assert(/timeout-minutes:\s*\d+/.test(m), 'Metrik wajib punya timeout-minutes');
  assert(!/secrets\./.test(m) && !/contents:\s*write/.test(m), 'Metrik tidak boleh memegang secrets atau izin tulis kode');
  assert(m.includes('fiezel-bot.mjs metrics'), 'Metrik wajib menjalankan perintah metrics engine');
}
console.log('  ok');
pass++;

console.log(`\n✅ SEMUA PENGUJIAN FIEZEL BOT v2.1 LULUS (${pass}/${pass} PASS).`);
