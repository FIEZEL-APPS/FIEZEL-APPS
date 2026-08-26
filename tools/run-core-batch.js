// Pembantu verifikasi lokal (BUKAN gerbang): menjalankan sebagian daftar `Core validation`
// dari .github/workflows/quality.yml apa adanya, satu per satu, lalu melaporkan exit code
// setiap perintah. Dipakai untuk membagi ~105 gerbang menjadi beberapa batch agar tidak
// menabrak batas waktu satu sesi. Tidak didaftarkan di CI — CI menjalankan blok aslinya.
//
// Pakai: node tools/run-core-batch.js <mulai> <akhir>   (indeks berbasis 0, akhir eksklusif)
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
const block = workflow.split('- name: Core validation')[1] || '';
const commands = block.split('\n')
  .map(line => line.trim())
  .filter(line => /^node\s/.test(line));

const from = Number(process.argv[2] || 0);
const to = Number(process.argv[3] || commands.length);
const slice = commands.slice(from, to);
console.log(`total=${commands.length} batch=${from}..${to} (${slice.length} perintah)`);

const results = [];
for (const [index, command] of slice.entries()) {
  const args = command.split(/\s+/).slice(1);
  const started = Date.now();
  const run = cp.spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const seconds = Math.round((Date.now() - started) / 1000);
  const status = run.status === 0 ? 'PASS' : 'FAIL';
  results.push({ command, status, exit: run.status, seconds });
  console.log(`[${from + index}] ${status} exit=${run.status} ${seconds}s  ${command}`);
  if (run.status !== 0) {
    const tail = (String(run.stdout || '') + String(run.stderr || '')).trim().split('\n').slice(-12).join('\n');
    console.log('--- ekor keluaran ---\n' + tail + '\n---------------------');
  }
}
const failed = results.filter(r => r.status === 'FAIL');
console.log(`\nBATCH ${from}..${to}: ${results.length - failed.length} PASS, ${failed.length} FAIL`);
if (failed.length) console.log(failed.map(f => f.command).join('\n'));
fs.writeFileSync(path.join(root, `.core-batch-${from}-${to}.json`), JSON.stringify(results, null, 2) + '\n');
