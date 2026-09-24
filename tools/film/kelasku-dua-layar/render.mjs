#!/usr/bin/env node
// FIEZEL · Film "Satu Kelas, Dua Layar" — render penuh 1080×1920 @30 fps (2160 frame).
//
// Dirender per potongan 150 frame; tiap potongan diberi penanda .done, jadi render yang
// terputus bisa DILANJUTKAN cukup dengan menjalankan perintah yang sama lagi.
// Tiap frame: halaman three.js menggambar N sub-sampel (motion blur, anti-alias, DOF),
// tangkapan JPEG q100 dipipakan ke FFmpeg (mjpeg → x264 CRF 12, perantara berkualitas tinggi).
// Setelah semua potongan: disambung → out/film-tanpa-suara.mp4 → otomatis digabung dengan
// audio terbaik yang ada (finish.mjs).
//
// Variabel lingkungan (semua opsional):
//   FZ_GPU=1|0        pakai GPU (default: ya di Windows/Mac, tidak di Linux server)
//   FZ_HEADED=1       tampilkan jendela Chrome (bila GPU headless bermasalah di Windows)
//   CHROME_PATH=...   pakai Chrome tertentu (default: Chrome terpasang, channel "chrome")
//   FZ_SAMPLES=8      paksa jumlah sub-sampel per frame (default: per shot, 6–8)
//   FZ_QUALITY=2      pengali sub-sampel (2 = dua kali lebih halus, dua kali lebih lama)
//   FZ_DRAFT=1        pratinjau cepat: 1 sub-sampel (tanpa blur/DOF) — untuk cek timing
//   FZ_FROM / FZ_TO   rentang frame (mis. FZ_FROM=0 FZ_TO=299)
//   FZ_PORT=8931      port server lokal
//   FFMPEG=...        path ffmpeg bila tidak ada di PATH
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { launchOpts } from './chrome.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FF = process.env.FFMPEG || 'ffmpeg';
const FRAMES = 2160, CHUNK = 150;
const FROM = Number(process.env.FZ_FROM || 0), TO = Math.min(FRAMES - 1, Number(process.env.FZ_TO ?? FRAMES - 1));
const DRAFT = process.env.FZ_DRAFT === '1';
const CH = path.join(ROOT, 'out', DRAFT ? 'chunks-draft' : 'chunks'); fs.mkdirSync(CH, { recursive: true });
const port = Number(process.env.FZ_PORT || 8931);

if (spawnSync(FF, ['-version']).error) { console.error('FFmpeg tidak ditemukan. Pasang FFmpeg (lihat README) atau set FFMPEG=path.'); process.exit(1); }
const srv = await serve(port);
const browser = await chromium.launch(launchOpts());
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR halaman:', e.message));
await page.goto(`http://127.0.0.1:${port}/web/index.html`);
await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
const gpu = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; });
console.log('Renderer WebGL:', gpu);

const t0 = Date.now(); let done = 0, todo = 0;
for (let c = Math.floor(FROM / CHUNK); c * CHUNK <= TO; c++) todo += fs.existsSync(path.join(CH, `c${String(c).padStart(3, '0')}.done`)) ? 0 : 1;
if (!todo) console.log('Semua potongan pada rentang ini sudah selesai.');
for (let c = Math.floor(FROM / CHUNK); c * CHUNK <= TO; c++) {
  const full = `c${String(c).padStart(3, '0')}`;
  if (fs.existsSync(path.join(CH, full + '.done'))) continue;
  const a = Math.max(FROM, c * CHUNK), b = Math.min(TO, c * CHUNK + CHUNK - 1);
  const partial = a !== c * CHUNK || b !== Math.min(FRAMES - 1, c * CHUNK + CHUNK - 1);
  // Potongan sebagian (FZ_FROM/FZ_TO) disimpan terpisah dan TIDAK diberi .done.
  const name = partial ? `${full}-f${a}-${b}` : full, mark = path.join(CH, name + '.done'), mp4 = path.join(CH, name + '.mp4');
  const enc = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', DRAFT ? '20' : '12', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const tc = Date.now();
  for (let f = a; f <= b; f++) {
    let n;
    if (DRAFT) n = 1; else if (process.env.FZ_SAMPLES) n = Number(process.env.FZ_SAMPLES);
    else n = Math.max(1, Math.round((await page.evaluate((f) => window.samplesAt(f), f)) * Number(process.env.FZ_QUALITY || 1)));
    await page.evaluate(([f, n]) => window.renderFrame(f, n), [f, n]);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 100, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once('drain', r));
    const k = f - a + 1;
    if (k % 10 === 0 || f === b) { const per = (Date.now() - tc) / 1000 / k; process.stdout.write(`\r${name}  frame ${f}/${TO}  ${per.toFixed(2)} dtk/frame   `); }
  }
  enc.stdin.end(); await new Promise((r) => enc.on('close', r));
  if (!partial) fs.writeFileSync(mark, new Date().toISOString()); done++;
  const el = (Date.now() - t0) / 1000; const eta = el / done * (todo - done);
  console.log(`\n✓ ${name} selesai · sisa perkiraan ${Math.floor(eta / 60)} mnt ${Math.round(eta % 60)} dtk`);
}
await browser.close(); srv.close();

// sambung semua potongan bila lengkap
const all = []; for (let c = 0; c * CHUNK < FRAMES; c++) all.push(`c${String(c).padStart(3, '0')}`);
if (all.every((n) => fs.existsSync(path.join(CH, n + '.done')))) {
  const list = path.join(CH, 'list.txt'); fs.writeFileSync(list, all.map((n) => `file '${n}.mp4'`).join('\n'));
  const silent = path.join(ROOT, 'out', DRAFT ? 'film-draft-tanpa-suara.mp4' : 'film-tanpa-suara.mp4');
  spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent], { stdio: 'inherit' });
  console.log('Video tanpa suara →', path.relative(ROOT, silent));
  const audio = [path.join(ROOT, 'out', 'mix-final.wav'), path.join(ROOT, 'audio', 'mix-tanpa-vo.flac')].find((p) => fs.existsSync(p));
  const { finish } = await import('./finish.mjs');
  finish(silent, audio, path.join(ROOT, 'out', (DRAFT ? 'DRAFT-' : '') + (audio.includes('mix-final') ? 'FIEZEL-KelasKu-Satu-Kelas-Dua-Layar.mp4' : 'FIEZEL-KelasKu-Satu-Kelas-Dua-Layar-musik-saja.mp4')));
} else console.log('Sebagian potongan belum ada — jalankan perintah yang sama lagi untuk melanjutkan.');
