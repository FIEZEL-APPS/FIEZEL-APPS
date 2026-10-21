/* probe-face-audit-m025-560.mjs — uji fiezel-face-guard.js di Chromium sungguhan dengan kamera
 * palsu (--use-fake-device-for-media-stream). Yang dibuktikan di sini TIDAK bisa dibuktikan di
 * Node: stream kamera hidup tidak pernah dinilai "beku", track yang dimatikan dinilai "tidak
 * hadir" lalu disambung ulang, start() ganda berbagi satu stream, dan stop() mematikan track.
 *
 * Pakai (dari akar repo): node tools/dev/probe-face-audit-m025-560.mjs
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const ROOT = process.cwd();
const PAGE = '<!doctype html><meta charset="utf-8"><body><script src="/features/class-hub/fiezel-face-guard.js"></script></body>';
const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (p === '/' ) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGE); }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'application/javascript' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(8156, r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await browser.newContext();
await ctx.grantPermissions(['camera'], { origin: 'http://localhost:8156' });
const page = await ctx.newPage();
await page.goto('http://localhost:8156/');
const out = await page.evaluate(async () => {
  const FG = window.FiezelFaceGuard, r = {}, ev = { absent: 0, stream: 0, lost: 0 };
  const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
  const opts = { onAbsent() { ev.absent++; }, onStream() { ev.stream++; }, onCameraLost() { ev.lost++; } };
  const p1 = FG.start(opts), p2 = FG.start(opts);
  r.sharedPromise = p1 === p2;
  r.start = (await p1).ok;
  await sleep(1500);
  // Tanda tangan bingkai dihitung persis seperti modul (192 titik dari 64x48) pada stream nyata.
  const v = document.querySelector('video'), c = document.createElement('canvas'); c.width = 64; c.height = 48;
  const g = c.getContext('2d', { willReadFrequently: true }), tr = { sig: null, t: 0, since: 0 };
  let frozen = false;
  for (let t = 0; t < 16; t++) {
    g.drawImage(v, 0, 0, 64, 48); const d = g.getImageData(0, 0, 64, 48).data, sig = new Float32Array(192);
    for (let sy = 0; sy < 12; sy++) for (let sx = 0; sx < 16; sx++) { const i = ((sy * 4) * 64 + sx * 4) * 4; sig[sy * 16 + sx] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; }
    frozen = FG.freezeStep(tr, sig, performance.now()) || frozen;
    await sleep(250);
  }
  r.liveStreamFrozen = frozen;
  const oldTrack = FG.getStream().getVideoTracks()[0];
  oldTrack.stop();                                   // kamera terputus di tengah ujian
  await sleep(3500);
  // maybeReacquire hanya berjalan pada jalur track 'ended' — stream baru = jalur itu terpakai.
  r.reacquired = ev.stream > 0 && FG.getStream().getVideoTracks()[0] !== oldTrack && FG.getStream().getVideoTracks()[0].readyState === 'live';
  const live = FG.getStream();
  FG.stop();
  r.tracksStoppedOnStop = live.getTracks().every((t) => t.readyState === 'ended');
  r.videoRemoved = !document.querySelector('video');
  // stop() saat izin masih ditunggu lalu start lagi: tidak ada stream yatim.
  const p3 = FG.start({}); FG.stop(); const p4 = FG.start({});
  const r3 = await p3, r4 = await p4;
  r.abortedStaleStart = r3.ok === false && r3.reason === 'aborted';
  r.freshStartOk = r4.ok === true;
  FG.stop();
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close(); server.close();
const ok = out.sharedPromise && out.start && out.liveStreamFrozen === false && out.reacquired && out.tracksStoppedOnStop && out.videoRemoved && out.abortedStaleStart && out.freshStartOk;
console.log(ok ? 'PROBE PASS' : 'PROBE FAIL');
process.exit(ok ? 0 : 1);
