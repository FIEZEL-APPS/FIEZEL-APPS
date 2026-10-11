#!/usr/bin/env node
/**
 * tools/dev/probe-face-browser.mjs — PENJAGA WAJAH DI CHROMIUM SUNGGUHAN, KAMERA SINTETIS.
 *
 * Pasangan tools/dev/probe-face-robustness.mjs. Probe Node menyuntik piksel langsung ke
 * analyzeFrame; probe ini melewati jalur yang dipakai murid: getUserMedia → <video> →
 * drawImage(video) → getImageData → mesin, di Chromium headless dengan kamera palsu yang
 * memutar berkas Y4M hasil tools/face-synth.js (320x240, 15 fps).
 *
 * Yang diukur per video:
 *   - peringatan & episode yang dipicu FiezelFaceGuard.start() selama ±12 dtk;
 *   - interval tick sebenarnya, drawImage/getImageData per tick, dan lama tiap tick
 *     (performance.now di sekitar callback setInterval) — bukti tidak ada jank di UI thread.
 *
 * Pemakaian (dari akar repo): node tools/dev/probe-face-browser.mjs [--json out.json] [--engine berkas.js]
 * Butuh Playwright + Chromium (PLAYWRIGHT_BROWSERS_PATH). Keluar 1 bila ada harapan meleset.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const S = require(path.join(ROOT, 'tools/face-synth.js'));
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
// --engine <berkas>: sajikan mesin lain di jalur fiezel-face-guard.js (A/B dengan build lama).
const ENGINE = argv.includes('--engine') ? path.resolve(argv[argv.indexOf('--engine') + 1]) : null;

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}

/**
 * Tulis berkas Y4M 4:2:0 dari daftar adegan. Kamera palsu Chromium membaca Y4M sebagai
 * BT.601 rentang TERBATAS (Y 16–235) — versi pertama menulis rentang penuh dan adegan redup
 * terpotong jadi hitam (rata-rata bingkai 1,9 di peramban vs 20,8 di Node).
 */
function writeY4M(file, scenes, W = 320, H = 240) {
  const fd = fs.openSync(file, 'w');
  fs.writeSync(fd, `YUV4MPEG2 W${W} H${H} F15:1 Ip A1:1 C420\n`);
  for (const sc of scenes) {
    const img = S.render(sc, { w: W, h: H, ss: 2 });
    const Y = Buffer.alloc(W * H), U = Buffer.alloc((W / 2) * (H / 2)), V = Buffer.alloc((W / 2) * (H / 2));
    for (let i = 0; i < W * H; i++) {
      const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2];
      Y[i] = Math.max(16, Math.min(235, Math.round(16 + (0.299 * r + 0.587 * g + 0.114 * b) * 219 / 255)));
    }
    for (let y = 0; y < H / 2; y++) {
      for (let x = 0; x < W / 2; x++) {
        let su = 0, sv = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * W + (x * 2 + dx)) * 4;
          const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
          su += -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
          sv += 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
        }
        U[y * (W / 2) + x] = Math.max(16, Math.min(240, Math.round(128 + (su / 4 - 128) * 224 / 255)));
        V[y * (W / 2) + x] = Math.max(16, Math.min(240, Math.round(128 + (sv / 4 - 128) * 224 / 255)));
      }
    }
    fs.writeSync(fd, 'FRAME\n');
    fs.writeSync(fd, Y); fs.writeSync(fd, U); fs.writeSync(fd, V);
  }
  fs.closeSync(fd);
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>probe</title><body>
<script src="/features/class-hub/fiezel-face-guard.js"></script>
<script>
  // Instrumen: hitung readback kanvas & ukur lama tiap tick penjaga.
  window.__probe = { draws: 0, reads: 0, ticks: [], tickMs: 0, ev: [] };
  const P = CanvasRenderingContext2D.prototype;
  const d0 = P.drawImage, g0 = P.getImageData;
  P.drawImage = function () { window.__probe.draws++; return d0.apply(this, arguments); };
  P.getImageData = function () { window.__probe.reads++; return g0.apply(this, arguments); };
  const si = window.setInterval;
  window.setInterval = function (fn, ms) {
    window.__probe.tickMs = ms;
    return si(function () { const t0 = performance.now(); try { fn(); } finally { window.__probe.ticks.push(performance.now() - t0); } }, ms);
  };
  window.__start = async function () {
    const t0 = performance.now(), rel = () => Math.round(performance.now() - t0);
    return FiezelFaceGuard.start({
      onWarning: (w) => window.__probe.ev.push([w ? 'warnOn' : 'warnOff', rel()]),
      onAbsent: () => window.__probe.ev.push(['absent', rel()]),
      onAbsentEpisode: () => window.__probe.ev.push(['episode', rel()]),
      onPresent: (d) => window.__probe.ev.push(['present', rel(), d])
    });
  };
</script>`;

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = req.url.split('?')[0];
      if (u === '/__probe.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGE); }
      if (ENGINE && u === '/features/class-hub/fiezel-face-guard.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(fs.readFileSync(ENGINE)); }
      const f = path.join(ROOT, u.replace(/^\//, ''));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

async function runVideo(pw, url, name, y4m, expect, ms = 12000) {
  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`, '--autoplay-policy=no-user-gesture-required']
  });
  try {
    const ctx = await browser.newContext({ permissions: ['camera'] });
    const page = await ctx.newPage();
    await page.goto(url + '/__probe.html');
    const res = await page.evaluate(() => window.__start());
    if (!res || !res.ok) throw new Error('start gagal: ' + JSON.stringify(res));
    await page.waitForTimeout(ms);
    const p = await page.evaluate(() => { FiezelFaceGuard.stop(); return JSON.parse(JSON.stringify(window.__probe)); });
    // Contoh bingkai yang dilihat mesin (jalur drawImage peramban) + alasan tolaknya — sesudah
    // penghitung disalin, supaya readback probe sendiri tidak ikut terhitung.
    const samples = await page.evaluate(async () => {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = s; await v.play();
      const c = document.createElement('canvas');
      c.width = 64; c.height = 48;
      const cx = c.getContext('2d', { willReadFrequently: true });
      const out = [];
      for (let i = 0; i < 8; i++) {
        const r = FiezelFaceGuard.analyzeFrame(v, c, cx, null);
        out.push({ present: r.present, reason: r.reason || '', dipN: r.dipN, mouth: r.mouthDipN, box: [r.boxW, r.boxH], Ys: r.skinBr, px: i === 0 ? Array.from(cx.getImageData(0, 0, 64, 48).data) : null });
        await new Promise((res) => setTimeout(res, 130));
      }
      return out;
    });
    const ticks = p.ticks.length;
    const sorted = p.ticks.slice().sort((a, b) => a - b);
    const warnOn = p.ev.filter((e) => e[0] === 'warnOn').map((e) => e[1]);
    const out = {
      name, tickMs: p.tickMs, ticks,
      readsPerTick: +(p.reads / Math.max(1, ticks)).toFixed(2),
      tickP50ms: +sorted[Math.floor(ticks * 0.5)].toFixed(2), tickMaxMs: +sorted[ticks - 1].toFixed(2),
      warnOn, episodes: p.ev.filter((e) => e[0] === 'episode').map((e) => e[1])
    };
    const ok = expect === 'tenang' ? warnOn.length === 0 : (warnOn.length > 0 && warnOn[0] <= 4500);
    out.verdict = ok ? 'OK' : 'GAGAL';
    out.samples = samples.map((s) => ({ present: s.present, reason: s.reason, dipN: s.dipN == null ? null : +s.dipN.toFixed(3), mouth: s.mouth == null ? null : +s.mouth.toFixed(3), box: s.box, Ys: s.Ys }));
    if (process.env.FZ_PROBE_DUMP) fs.writeFileSync(path.join(process.env.FZ_PROBE_DUMP, name.replace(/[^a-z0-9]+/gi, '-') + '.json'), JSON.stringify(samples[0].px));
    console.log(name.padEnd(36) + `tick ${out.tickMs}ms x${ticks}`.padEnd(16) + `readback/tick ${out.readsPerTick}`.padEnd(18) + `p50 ${out.tickP50ms}ms max ${out.tickMaxMs}ms`.padEnd(24) + (warnOn.length ? `peringatan @${warnOn.join(',')}ms` : '0 peringatan').padEnd(26) + out.verdict);
    return out;
  } finally {
    await browser.close();
  }
}

const pw = loadPlaywright();
if (!pw) { console.error('Playwright tidak ditemukan'); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fz-face-'));
const face = [];
for (let i = 0; i < 30; i++) {
  const ph = i / 30 * 2 * Math.PI;
  face.push({ bg: 'kamar', seed: i + 1, face: { skin: 'sawo', cx: 32 + 0.4 * Math.sin(ph), cy: 21 + 0.3 * Math.cos(ph), pitch: 18 + 4 * Math.sin(ph), yaw: 8 * Math.sin(ph * 0.5) } });
}
// Eksposur 0,6: kamera ber-auto-exposure menaikkan gain di ruangan redup — 0,4 + kerudung hitam
// menghasilkan bingkai rata-rata < 8 (hitam pekat), yang memang benar ditolak 'camera_covered'.
const hijabDim = face.map((sc) => Object.assign({}, sc, { bg: 'gelap', exposure: 0.6, wb: [1.1, 1, 0.8], noise: { luma: 3, chroma: 2 }, face: Object.assign({}, sc.face, { hijab: [40, 44, 60], hair: null }) }));
const backlit = face.map((sc) => Object.assign({}, sc, { bg: 'jendela', light: { amb: 0.22, dif: 0.26 }, bloom: 0.5 }));
const card = [0, 1].map((i) => ({ bg: 'kamar', seed: i + 1, occluders: [{ kind: 'buku', x0: 8, y0: 2, x1: 56, y1: 46, color: [184, 140, 96] }] }));
const empty = [0, 1].map((i) => ({ bg: 'kamar', seed: i + 1 }));
const videos = [
  ['wajah membaca (nunduk 14–22°, toleh ±8°)', face, 'tenang'],
  ['kerudung + ruangan redup', hijabDim, 'tenang'],
  ['backlight jendela', backlit, 'tenang'],
  ['kardus menutupi kamera', card, 'peringatan'],
  ['kursi kosong', empty, 'peringatan']
];
const { srv, url } = await serve();
const results = [];
let fail = 0;
console.log('=== PENJAGA WAJAH DI CHROMIUM (kamera palsu Y4M 320x240 @15 fps) ===');
try {
  for (const [name, scenes, exp] of videos) {
    const file = path.join(tmp, name.replace(/[^a-z0-9]+/gi, '-') + '.y4m');
    writeY4M(file, scenes);
    const r = await runVideo(pw, url, name, file, exp);
    if (r.verdict !== 'OK') fail++;
    results.push(r);
  }
} finally {
  srv.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (JSON_OUT) fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify(results, null, 2) + '\n');
console.log(fail ? `\n${fail} video meleset` : '\nSemua video sesuai harapan');
process.exit(fail ? 1 : 0);
