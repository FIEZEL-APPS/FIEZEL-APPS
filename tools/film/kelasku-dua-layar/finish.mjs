#!/usr/bin/env node
// FIEZEL · Film "Satu Kelas, Dua Layar" — gabung video + audio menjadi MP4 akhir.
//   node finish.mjs                          video out/film-tanpa-suara.mp4 + audio terbaik yang ada
//   node finish.mjs <video> <audio> <keluar>
// Audio yang dipilih otomatis: out/mix-final.wav (dengan VO) → audio/mix-tanpa-vo.flac (musik saja).
// Keluaran: H.264 High 4.2, CRF 17, yuv420p, BT.709, AAC 320 kbps 48 kHz, faststart, 72,0 dtk.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FF = process.env.FFMPEG || 'ffmpeg';
export function finish(video, audio, dst) {
  console.log(`\nMenggabungkan:\n  video ${path.relative(ROOT, video)}\n  audio ${path.relative(ROOT, audio)}`);
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', '72', '-movflags', '+faststart', dst], { stdio: 'inherit' });
  if (r.error) { console.error('FFmpeg tidak ditemukan. Lihat README.'); process.exit(1); }
  if (r.status !== 0) process.exit(r.status);
  console.log(`\nSELESAI → ${path.relative(ROOT, dst)}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , v, a, o] = process.argv;
  const video = v || path.join(ROOT, 'out', 'film-tanpa-suara.mp4');
  const audio = a || [path.join(ROOT, 'out', 'mix-final.wav'), path.join(ROOT, 'audio', 'mix-tanpa-vo.flac')].find((p) => fs.existsSync(p));
  if (!fs.existsSync(video)) { console.error('Video belum ada: ' + video + ' — jalankan dulu: node render.mjs'); process.exit(1); }
  const dst = o || path.join(ROOT, 'out', audio.includes('mix-final') ? 'FIEZEL-KelasKu-Satu-Kelas-Dua-Layar.mp4' : 'FIEZEL-KelasKu-Satu-Kelas-Dua-Layar-musik-saja.mp4');
  finish(video, audio, dst);
}
