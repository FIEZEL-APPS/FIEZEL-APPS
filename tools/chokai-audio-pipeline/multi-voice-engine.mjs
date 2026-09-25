/**
 * tools/chokai-audio-pipeline/multi-voice-engine.mjs
 * 
 * Engine sintesis multi-karakter dan penyambungan audio (stitching)
 * Menegakkan 3 persona vokal terpisah:
 * 1. INSTRUCTOR: Suara pria dewasa tegas dan berwibawa (Pengawas Ujian/Penyiar)
 * 2. MALE_STUDENT: Suara pemuda / mahasiswa laki-laki natural
 * 3. FEMALE_STUDENT: Suara mahasiswi / wanita muda ramah dan artikulatif
 * 
 * Mendukung arsitektur dual-engine:
 * - Engine 1: Gemini 2.5 Flash Preview TTS (Charon, Puck, Aoede) dengan multi-key pool rotation (16 keys).
 * - Engine 2: Edge Neural (ja-JP-KeitaNeural & ja-JP-NanamiNeural) dengan kalibrasi pitch & rate presisi.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const KEYS_FILE = path.join(ROOT, 'config', 'gemini-keys.json');
let geminiKeys = [];
try {
  geminiKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
} catch (_) {
  if (process.env.GEMINI_API_KEY) geminiKeys = [process.env.GEMINI_API_KEY];
}

export const VOICE_PROFILES = {
  INSTRUCTOR: {
    geminiVoice: 'Charon',
    edgeVoice: 'ja-JP-KeitaNeural',
    pitch: '-18Hz',
    rate: '-4%',
    role: 'Instruktor Ujian (Tegas & Dewasa)'
  },
  MALE_STUDENT: {
    geminiVoice: 'Puck',
    edgeVoice: 'ja-JP-KeitaNeural',
    pitch: '+4Hz',
    rate: '+3%',
    role: 'Mahasiswa Laki-laki (Pemuda Natural)'
  },
  FEMALE_STUDENT: {
    geminiVoice: 'Aoede',
    edgeVoice: 'ja-JP-NanamiNeural',
    pitch: '+3Hz',
    rate: '+1%',
    role: 'Mahasiswi Perempuan (Cerdas & Ramah)'
  }
};

let currentKeyIndex = 0;

/**
 * Mencoba sintesis menggunakan Gemini TTS
 */
async function tryGeminiTts(text, geminiVoice, outPath) {
  if (!geminiKeys || geminiKeys.length === 0) return false;

  for (let attempt = 0; attempt < Math.min(geminiKeys.length, 5); attempt++) {
    const key = geminiKeys[(currentKeyIndex + attempt) % geminiKeys.length];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: `Please read the following text aloud with natural native pronunciation: ${text}` }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: geminiVoice } } }
      }
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 429) {
        // Quota atau rate limit, lanjutkan ke key berikutnya
        continue;
      }

      if (!res.ok) continue;

      const json = await res.json();
      const b64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) continue;

      const pcmBuffer = Buffer.from(b64, 'base64');
      const tempPcm = outPath.replace(/\.mp3$/, '.pcm');
      fs.writeFileSync(tempPcm, pcmBuffer);

      // Convert PCM ke MP3 menggunakan ffmpeg (24kHz mono)
      const convCmd = `ffmpeg -f s16le -ar 24000 -ac 1 -i "${tempPcm}" -q:a 9 -acodec libmp3lame "${outPath}" -y`;
      execSync(convCmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 });
      try { fs.unlinkSync(tempPcm); } catch (_) {}

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 500) {
        currentKeyIndex = (currentKeyIndex + attempt) % geminiKeys.length;
        return true;
      }
    } catch (_) {
      // Coba key berikutnya
    }
  }
  return false;
}

/**
 * Sintesis satu kalimat ujaran dengan persona suara karakter
 * @param {string} text - Teks kalimat Jepang
 * @param {string} roleKey - Salah satu kunci VOICE_PROFILES
 * @param {string} outPath - Lokasi berkas audio MP3 tujuan
 */
export async function synthesizeTurn(text, roleKey, outPath) {
  const profile = VOICE_PROFILES[roleKey] || VOICE_PROFILES.INSTRUCTOR;
  const cleanText = text.replace(/["\r\n]+/g, ' ').trim();
  if (!cleanText) return false;

  // 1. Coba Gemini TTS terlebih dahulu
  const geminiOk = await tryGeminiTts(cleanText, profile.geminiVoice, outPath);
  if (geminiOk) {
    return true;
  }

  // 2. Fallback ke Edge Neural (Zero-Quota, Terkalibrasi Pitch & Rate)
  const cmd = `edge-tts --voice ${profile.edgeVoice} --pitch=${profile.pitch} --rate=${profile.rate} --text "${cleanText.replace(/"/g, '\\"')}" --write-media "${outPath}"`;
  try {
    execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 });
    return fs.existsSync(outPath) && fs.statSync(outPath).size > 500;
  } catch (err) {
    console.error(`[Synthesis Error] Role ${roleKey}:`, err.message);
    return false;
  }
}

/**
 * Menghasilkan file audio hening (silence buffer) berdurasi tertentu via ffmpeg
 * @param {number} seconds - Durasi hening dalam detik
 * @param {string} outPath - Lokasi file hening tujuan
 */
export function generateSilence(seconds, outPath) {
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100) return true;
  const cmd = `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t ${seconds} -q:a 9 -acodec libmp3lame "${outPath}" -y`;
  try {
    execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 });
    return true;
  } catch (err) {
    console.error('[Silence Gen Error]:', err.message);
    return false;
  }
}

/**
 * Menyambungkan seluruh segmen ujaran dengan jeda nafas terukur menjadi satu file master MP3
 * @param {Array<{ filePath: string, type: 'intro'|'dialogue'|'question' }>} segments
 * @param {string} finalMp3Path
 * @param {string} tempDir
 */
export function stitchSegments(segments, finalMp3Path, tempDir) {
  const silence500 = path.join(tempDir, 'silence_500ms.mp3');
  const silence400 = path.join(tempDir, 'silence_400ms.mp3');
  const silence800 = path.join(tempDir, 'silence_800ms.mp3');
  const silence1500 = path.join(tempDir, 'silence_1500ms.mp3');

  generateSilence(0.5, silence500);
  generateSilence(0.4, silence400);
  generateSilence(0.8, silence800);
  generateSilence(1.5, silence1500);

  // Buat daftar berkas untuk ffmpeg concat demuxer
  const concatList = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    concatList.push(`file '${seg.filePath.replace(/\\/g, '/')}'`);

    const nextSeg = segments[i + 1];
    if (!nextSeg) {
      // Akhir seluruh soal: Thinking pocket 1.5 detik
      concatList.push(`file '${silence1500.replace(/\\/g, '/')}'`);
    } else if (seg.type === 'intro') {
      // Setelah intro: jeda 500ms sebelum dialog dimulai
      concatList.push(`file '${silence500.replace(/\\/g, '/')}'`);
    } else if (nextSeg.type === 'question') {
      // Sebelum pertanyaan dibacakan instruktor: jeda 800ms
      concatList.push(`file '${silence800.replace(/\\/g, '/')}'`);
    } else {
      // Antar giliran bicara karakter dialog: jeda 400ms
      concatList.push(`file '${silence400.replace(/\\/g, '/')}'`);
    }
  }

  const listFile = path.join(tempDir, `concat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  fs.writeFileSync(listFile, concatList.join('\n'), 'utf8');

  // Concat dan re-encode ke format standar 64kbps 24kHz mono
  const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${listFile}" -ar 24000 -ac 1 -b:a 64k "${finalMp3Path}" -y`;
  try {
    execSync(ffmpegCmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 45000 });
    try { fs.unlinkSync(listFile); } catch (_) {}
    return fs.existsSync(finalMp3Path) && fs.statSync(finalMp3Path).size > 2000;
  } catch (err) {
    console.error('[Stitch Error]:', err.message);
    try { fs.unlinkSync(listFile); } catch (_) {}
    return false;
  }
}
