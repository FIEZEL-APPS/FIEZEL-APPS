#!/usr/bin/env node
'use strict';
/**
 * GERBANG KECEPATAN NOTIFIKASI TUGAS GURU KE MURID (tests/assignment-poll-speed-test.js)
 *
 * Memastikan perbaikan kelambatan notifikasi tugas guru ke murid:
 * 1. Lantai rem klien MIN_GAP_MS (5000ms) sejajar lantai server (5000ms).
 * 2. Detak polling klien NOTIF_POLL_MS (6000ms) responsif dan <= 1.5 * teacher sync.
 * 3. Boot delay startNotifPolling <= 2000ms (bukan 6500ms).
 * 4. Fallback learnerName() tangguh, tidak pernah "" (string kosong) yang membatalkan poll.
 * 5. mountStudent() di fiezel-class-hub.js memicu polling proaktif seketika saat murid membuka KelasKu.
 * 6. go('classroom') memicu polling seketika saat navigasi.
 * 7. BroadcastChannel dan listener storage terpasang untuk instant wakeup.
 * 8. Dashboard guru (features/teacher/* dan teacher-shell.css) tetap 100% utuh tanpa sentuhan.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const appSrc = read('app.js');
const inboxSrc = read('features/notify/fiezel-inbox.js');
const hubSrc = read('features/class-hub/fiezel-class-hub.js');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('1. MIN_GAP_MS di fiezel-inbox.js adalah 5000 (sejajar lantai server 5s)', () => {
  const m = inboxSrc.match(/var MIN_GAP_MS = (\d+);/);
  assert.ok(m, 'MIN_GAP_MS terdefinisi');
  const gap = Number(m[1]);
  assert.strictEqual(gap, 5000, 'MIN_GAP_MS harus 5000ms');
});

test('2. NOTIF_POLL_MS di app.js adalah 6000 (responsif & lolos lantai server)', () => {
  const m = appSrc.match(/const NOTIF_POLL_MS=(\d+);/);
  assert.ok(m, 'NOTIF_POLL_MS terdefinisi');
  const poll = Number(m[1]);
  assert.strictEqual(poll, 6000, 'NOTIF_POLL_MS harus 6000ms');
});

test('3. Boot delay startNotifPolling <= 2000ms (bukan 6500ms)', () => {
  const m = appSrc.match(/const poll=setTimeout\(\(\)=>\{socialNotifyPoll\(true\);try\{startNotifPolling\(\)\}catch\(_\)\{\}\},(\d+)\);/);
  assert.ok(m, 'setTimeout startNotifPolling ditemukan');
  const delay = Number(m[1]);
  assert.ok(delay <= 2000, 'delay harus <= 2000ms, ditemukan: ' + delay);
});

test('4. learnerName() di fiezel-inbox.js tangguh dan tidak pernah ""', () => {
  assert.ok(inboxSrc.includes("return first || 'Murid';"), 'fallback ke Murid jika kosong');
  assert.ok(inboxSrc.includes("/^(sobat|murid|teman)(\\s+.*)?$/i"), 'menangani variasi Sobat FIEZEL dsb');
});

test('5. mountStudent() memanggil FiezelInbox.poll(true)', () => {
  assert.ok(hubSrc.includes('root.FiezelInbox.poll(true)'), 'mountStudent memanggil FiezelInbox.poll(true)');
});

test('6. go("classroom") di app.js memanggil inboxPoll(true)', () => {
  assert.ok(appSrc.includes("if(v==='classroom'||v==='home'){try{inboxPoll(v==='classroom')}catch(_){}}"), 'go() memicu inboxPoll saat ke classroom atau home');
});

test('7. BroadcastChannel dan listener storage terpasang di fiezel-inbox.js', () => {
  assert.ok(inboxSrc.includes("new BroadcastChannel('fiezel-assignment-sync')"), 'BroadcastChannel terpasang');
  assert.ok(inboxSrc.includes("root.addEventListener('storage'"), 'storage listener terpasang');
});

test('8. Dashboard guru (features/teacher/* & teacher-shell.css) tidak dimodifikasi', () => {
  // Cek git status atau git diff khusus direktori guru
  const cp = require('child_process');
  const status = cp.execSync('git status --porcelain features/teacher/ teacher-shell.css', { cwd: __fzRoot, encoding: 'utf8' }).trim();
  assert.strictEqual(status, '', 'Tidak boleh ada modifikasi di features/teacher/ atau teacher-shell.css: ' + status);
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log('ok - ' + name);
    } catch (e) {
      fail++;
      console.log('FAIL - ' + name + '\n  ' + (e && e.stack || e));
    }
  }
  console.log(fail ? `\n${fail} gagal` : '\n8/8 PASS · Gerbang Kecepatan Notifikasi Tugas Murid Sempurna');
  process.exit(fail ? 1 : 0);
})();
