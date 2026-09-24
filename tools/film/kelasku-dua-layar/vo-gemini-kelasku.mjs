#!/usr/bin/env node
// FIEZEL · Film "Satu Kelas, Dua Layar" — VO dengan Gemini TTS, lalu mix akhir.
//
// Satu berkas per baris VO (24 baris di audio/events.json → berasal dari VO di web/film.js).
// Tiap baris: dibuat oleh Gemini TTS → hening depan/belakang dipangkas → HPF 80 Hz →
// dinormalkan −16 LUFS → diletakkan TEPAT di detik `at`-nya. Bila lebih panjang dari
// jendelanya, dipercepat halus (maks 1,15×); bila masih kelebihan, baris berikutnya digeser
// sedikit (maks +0,35 dtk) — skrip memberi tahu setiap penyesuaian.
// Mix: latar (audio/stems/bed.flac) di-duck otomatis oleh VO (sidechain), lalu master
// −14 LUFS dengan true peak ≤ −1,5 dBTP. Nol digital 62,05–62,40 tetap nol.
//
// PAKAI
//   set GEMINI_API_KEY=...            (Windows cmd)   |  export GEMINI_API_KEY=...  (mac/linux)
//   node vo-gemini-kelasku.mjs                         buat semua baris + mix
//   node vo-gemini-kelasku.mjs --voice Charon          ganti suara (default: Gacrux)
//   node vo-gemini-kelasku.mjs --only 03,11            buat ulang baris tertentu saja
//   node vo-gemini-kelasku.mjs --mix-only              lewati TTS, hanya tempatkan & mix
//   node vo-gemini-kelasku.mjs --mock                  uji alur tanpa API (VO tiruan berbunyi nada)
//   node vo-gemini-kelasku.mjs --list                  tampilkan naskah & jendela waktu
// Opsi lain: --model gemini-3.8-flash-lite-tts  --delay 7 (detik antar-permintaan)
//            --video out/film-tanpa-suara.mp4  (default: otomatis bila berkas ada)
//
// Butuh: Node 18+ (fetch bawaan) dan FFmpeg di PATH (atau set FFMPEG=path\ke\ffmpeg.exe).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ARG = process.argv.slice(2);
const opt = (k, d) => { const i = ARG.indexOf('--' + k); return i >= 0 ? (ARG[i + 1] && !ARG[i + 1].startsWith('--') ? ARG[i + 1] : true) : d; };
const FF = process.env.FFMPEG || 'ffmpeg';
const VOICE = opt('voice', process.env.FZ_VOICE || 'Gacrux');
const MODEL = opt('model', process.env.FZ_TTS_MODEL || 'gemini-3.8-flash-tts');
// Bila model pilihan belum tersedia untuk API key ini, skrip mundur otomatis ke model berikutnya.
const FALLBACK = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
let activeModel = MODEL;
const DELAY = Number(opt('delay', 7)) * 1000;
const MOCK = !!opt('mock', false), MIX_ONLY = !!opt('mix-only', false), LIST = !!opt('list', false);
const ONLY = opt('only', null) ? String(opt('only')).split(',').map((s) => s.trim().padStart(2, '0')) : null;
const OUT = path.join(ROOT, 'out'), VOD = path.join(OUT, 'vo'), RAW = path.join(VOD, 'raw');
const EV = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'events.json'), 'utf8'));
const VO = EV.VO, T = EV.T;
const HARD_END = { '23': T.black - 0.12, '24': 71.45 };   // 23 wajib selesai sebelum hening implosi
const SR = 48000;

if (LIST) { for (const v of VO) console.log(`${v.id}  @${v.at.toFixed(2)}s  maks ${v.max.toFixed(2)}s  ${v.text}${v.say ? `   [ucap: ${v.say}]` : ''}`); process.exit(0); }
fs.mkdirSync(RAW, { recursive: true });

function ff(args, input) {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { input, maxBuffer: 1 << 28 });
  if (r.error) { console.error(`\nFFmpeg tidak ditemukan (${FF}). Pasang FFmpeg lalu ulangi — lihat README.`); process.exit(1); }
  if (r.status !== 0) { console.error(String(r.stderr)); throw new Error('ffmpeg gagal: ' + args.join(' ')); }
  return r;
}
function wavInfo(file) {
  const b = fs.readFileSync(file); let o = 12, ch = 1, sr = 48000, bits = 16, dataLen = 0;
  while (o < b.length - 8) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); } if (id === 'data') { dataLen = len; break; } o += 8 + len + (len % 2); }
  return { ch, sr, bits, dur: dataLen / (sr * ch * bits / 8) };
}
function pcmToWav(pcm, sr = 24000) {
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h.toString(16); };

// ---------------------------------------------------------------------------------------------
// 1 · TTS
async function tts(v) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) { console.error('\nGEMINI_API_KEY belum di-set. Lihat README (bagian VO).'); process.exit(1); }
  const say = v.say || v.text;
  const direction = `Warm, confident narrator of a premium Indonesian education brand film. Natural everyday Bahasa Indonesia (not formal, not an ad voice), clear diction, unhurried. This line: ${v.style}.`;
  const queue = [activeModel, ...FALLBACK.filter((m) => m !== activeModel && FALLBACK.indexOf(m) > FALLBACK.indexOf(activeModel))];
  for (const model of queue) {
    // Gemini 3.8 TTS: teks yang diucapkan saja di `text`, arahan di `speech_metadata.style`.
    // Model lama (3.1 / 2.5): arahan ditulis sebagai kalimat di depan teks.
    const is38 = /3\.8/.test(model);
    const part = is38 ? { text: say, speech_metadata: { style: direction } } : { text: `${direction} Read exactly this line and nothing else:\n\n${say}` };
    const body = { contents: [{ parts: [part] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } };
    const url = `${process.env.FZ_TTS_BASE || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
      if (r.ok) {
        const j = await r.json(); const p = j?.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
        if (!p) throw new Error('Respons tanpa audio: ' + JSON.stringify(j).slice(0, 300));
        const bytes = Buffer.from(p.inlineData.data, 'base64');
        if (model !== activeModel) { console.log(`   (memakai model ${model})`); activeModel = model; }
        // 3.8 mengembalikan WAV (RIFF) utuh; model lama mengembalikan PCM 16-bit mentah.
        if (bytes.slice(0, 4).toString('ascii') === 'RIFF') return bytes;
        const rate = Number((/rate=(\d+)/.exec(p.inlineData.mimeType || '') || [])[1] || 24000);
        return pcmToWav(bytes, rate);
      }
      const txt = await r.text();
      if (r.status === 429 || r.status >= 500) { const wait = 20000 * (attempt + 1); console.log(`   ${r.status} — menunggu ${wait / 1000} dtk lalu coba lagi…`); await sleep(wait); continue; }
      if (r.status === 400 || r.status === 403 || r.status === 404) { console.log(`   ${model} tidak bisa dipakai (${r.status}: ${txt.slice(0, 160).replace(/\s+/g, ' ')}) — mencoba model berikutnya…`); break; }
      throw new Error(`Gemini TTS ${r.status}: ${txt.slice(0, 400)}`);
    }
  }
  throw new Error('Gemini TTS gagal di semua model (kuota atau akses). Coba lagi nanti dengan --only untuk baris yang belum ada.');
}
// VO tiruan untuk menguji alur tanpa API: "suku kata" nada dengan jeda di tanda baca.
function mockWav(v) {
  const syl = (v.say || v.text).toLowerCase().match(/[aiueo]+/g)?.length || 6; const sr = 24000;
  const dur = syl * 0.165 + ((v.text.match(/[.,?]/g) || []).length) * 0.18 + 0.3; const n = Math.round(dur * sr); const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) { const t = i / sr; const s = Math.floor((t - 0.15) / 0.165); const env = t < 0.15 || t > dur - 0.15 ? 0 : Math.sin(Math.PI * (((t - 0.15) / 0.165) % 1)) ** 0.6; const f = 190 + 25 * Math.sin(s * 1.7); pcm.writeInt16LE(Math.round(9000 * env * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t))), i * 2); }
  return pcmToWav(pcm, sr);
}

// ---------------------------------------------------------------------------------------------
// 2 · proses per baris: pangkas hening, HPF, −16 LUFS, 48 kHz mono
function processLine(src, dst, tempo = 1) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse';
  const tmp = dst.replace(/\.wav$/, '.tmp.wav');
  ff(['-i', src, '-af', `${trim},highpass=f=80,acompressor=threshold=-20dB:ratio=2:attack=8:release=120:makeup=1${tempo !== 1 ? `,atempo=${tempo.toFixed(4)}` : ''},aresample=${SR}`, '-ac', '1', '-c:a', 'pcm_s24le', tmp]);
  const m = measure(tmp); const g = -16 - m.I;
  ff(['-i', tmp, '-af', `volume=${g.toFixed(2)}dB`, '-c:a', 'pcm_s24le', dst]); fs.unlinkSync(tmp);
  return wavInfo(dst).dur;
}
function measure(file) {
  const r = spawnSync(FF, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const s = String(r.stderr); const tail = s.slice(s.lastIndexOf('Summary:'));
  const I = parseFloat((/I:\s+(-?[\d.]+) LUFS/.exec(tail) || [])[1]); const TP = parseFloat((/Peak:\s+(-?[\d.]+) dBFS/.exec(tail) || [])[1]);
  return { I: isFinite(I) ? I : -70, TP: isFinite(TP) ? TP : -70 };
}

// ---------------------------------------------------------------------------------------------
async function main() {
  console.log(`FIEZEL · VO "Satu Kelas, Dua Layar" — ${MOCK ? 'MODE TIRUAN (tanpa API)' : `Gemini ${MODEL}, suara ${VOICE} (cadangan otomatis: ${FALLBACK.filter((m) => m !== MODEL).join(', ')})`}\n`);
  const manPath = path.join(VOD, 'manifest.json'); const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
  if (!MIX_ONLY) {
    let first = true;
    for (const v of VO) {
      const raw = path.join(RAW, `${v.id}.wav`); const sig = hash([MOCK, VOICE, MODEL, v.say || v.text, v.style].join('|'));
      const want = ONLY ? ONLY.includes(v.id) : !(fs.existsSync(raw) && man[v.id] === sig);
      if (!want) { console.log(`${v.id}  ${fs.existsSync(raw) ? '(sudah ada)' : '(dilewati — belum dibuat)'} ${v.text}`); continue; }
      if (!MOCK && !first) await sleep(DELAY); first = false;
      process.stdout.write(`${v.id}  membuat… ${v.text}\n`);
      fs.writeFileSync(raw, MOCK ? mockWav(v) : await tts(v)); man[v.id] = sig; fs.writeFileSync(manPath, JSON.stringify(man, null, 1));
    }
  }
  // 3 · tempatkan
  console.log('\nMenempatkan baris:');
  const timing = []; let prevEnd = 0, pushNext = 0;
  for (let k = 0; k < VO.length; k++) {
    const v = VO[k]; const raw = path.join(RAW, `${v.id}.wav`);
    if (!fs.existsSync(raw)) { console.log(`${v.id}  HILANG — jalankan tanpa --mix-only dulu`); continue; }
    const out = path.join(VOD, `${v.id}.wav`);
    let start = Math.max(v.at + pushNext, prevEnd + 0.08); pushNext = 0;
    const nextAt = k + 1 < VO.length ? VO[k + 1].at : 71.45;
    let limit = Math.min(HARD_END[v.id] ?? Infinity, nextAt - 0.15) - start;
    if (v.id === '23') limit = HARD_END['23'] - start;
    let dur = processLine(raw, out, 1), tempo = 1, note = '';
    if (dur > limit + 0.03) { tempo = Math.min(1.15, dur / limit); dur = processLine(raw, out, tempo); note = `dipercepat ${tempo.toFixed(2)}×`; }
    if (dur > limit + 0.03) {
      const over = dur - limit;
      if (HARD_END[v.id] || over > 0.35) note += ` · MELEBIHI jendela ${over.toFixed(2)} dtk — pertimbangkan --voice lain atau pendekkan kalimat`;
      else { pushNext = over; note += ` · baris berikutnya digeser +${over.toFixed(2)} dtk`; }
    }
    prevEnd = start + dur;
    timing.push({ id: v.id, text: v.text, start: +start.toFixed(3), end: +(start + dur).toFixed(3), dur: +dur.toFixed(3), tempo: +tempo.toFixed(3) });
    console.log(`${v.id}  ${start.toFixed(2)}–${(start + dur).toFixed(2)} dtk  (${dur.toFixed(2)} dtk${note ? ' · ' + note : ''})`);
  }
  fs.writeFileSync(path.join(VOD, 'timing.json'), JSON.stringify(timing, null, 1));

  // 4 · mix: VO bus + latar yang di-duck oleh VO, lalu master
  const bed = path.join(ROOT, 'audio', 'stems', 'bed.flac');
  const ins = ['-i', bed]; const parts = [];
  timing.forEach((tm, i) => { ins.push('-i', path.join(VOD, `${tm.id}.wav`)); const ms = Math.round(tm.start * 1000); parts.push(`[${i + 1}:a]aformat=sample_rates=${SR}:channel_layouts=mono,adelay=${ms}|${ms},apad=whole_dur=72[v${i}]`); });
  const voMix = timing.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${timing.length}:normalize=0:duration=longest,atrim=0:72,pan=stereo|c0=c0|c1=c0[vo]`;
  const graph = [...parts, voMix, '[vo]asplit=3[vo1][vo2][vo3]', '[0:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:72[bed]',
    '[bed][vo1]sidechaincompress=threshold=0.045:ratio=3.2:attack=25:release=420:knee=3:makeup=1[duck]',
    '[duck][vo2]amix=inputs=2:normalize=0:duration=first:weights=1 1.12[mix]'].join(';');
  const pre = path.join(OUT, 'mix-pra.wav'); const voOnly = path.join(OUT, 'vo-only.wav');
  ff([...ins, '-filter_complex', graph + ';[vo3]anull[vout]', '-map', '[mix]', '-c:a', 'pcm_f32le', '-ar', String(SR), pre, '-map', '[vout]', '-c:a', 'pcm_s24le', '-ar', String(SR), voOnly]);
  const m = measure(pre); let g = -14 - m.I; if (m.TP + g > -1.5) { const g2 = -1.5 - m.TP; console.log(`\n(catatan) puncak membatasi gain: ${g.toFixed(2)} → ${g2.toFixed(2)} dB`); g = g2; }
  const fin = path.join(OUT, 'mix-final.wav');
  ff(['-i', pre, '-af', `volume=${g.toFixed(3)}dB`, '-c:a', 'pcm_s24le', fin]); fs.unlinkSync(pre);
  const mf = measure(fin);
  console.log(`\nmix-final.wav  ${mf.I.toFixed(2)} LUFS · true peak ${mf.TP.toFixed(2)} dBTP · ${timing.length} baris VO`);

  // 5 · gabung ke video bila ada
  const vid = typeof opt('video', null) === 'string' ? opt('video') : path.join(OUT, 'film-tanpa-suara.mp4');
  if (fs.existsSync(vid)) {
    const dst = path.join(OUT, 'FIEZEL-KelasKu-Satu-Kelas-Dua-Layar.mp4');
    const { finish } = await import('./finish.mjs'); finish(vid, fin, dst);
  } else console.log(`\nVideo belum ada (${path.relative(ROOT, vid)}). Setelah render selesai, jalankan: node finish.mjs`);
}
main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
