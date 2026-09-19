#!/usr/bin/env node
/**
 * FIEZEL — Gemini TTS Audio Batch Generator ke Cloudflare R2
 *
 * Mengenerate materi listening yang belum bersuara menggunakan Gemini TTS API
 * (dengan voice pilihan: Aoede / Puck / Kore / Fenrir), mengonversi PCM audio
 * ke WAV yang kompatibel dengan browser & R2, mengunggah ke Cloudflare R2,
 * dan mendaftarkannya ke audio/manifest.json dengan audioKey deterministik.
 *
 * Pemakaian:
 *   node tools/audio-gemini-generate.mjs --content=listening --limit=50
 *   node tools/audio-gemini-generate.mjs --content=listening --limit=50 --apply
 *   node tools/audio-gemini-generate.mjs --content=listening --verify-only
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AudioKey = require(path.join(ROOT, 'features/audio-assets/fiezel-audio-key.js'));

const MANIFEST_PATH = path.join(ROOT, 'audio/manifest.json');
const R2_API = 'https://api.cloudflare.com/client/v4/accounts';
const MAX_RETRIES = 5;

/**
 * Gemini Voice Profiles:
 * Aoede: Suara wanita yang breezy, energik, bersemangat dan ceria.
 * Puck: Suara upbeat, youthful, ramah dan santai.
 */
const DEFAULT_GEMINI_VOICE = 'Aoede';
const GEMINI_MODEL = 'gemini-3.6-flash';

function r2Url(env, key) {
  return `${R2_API}/${env.accountId}/r2/buckets/${env.bucket}/objects/${encodeURIComponent(key)}`;
}

async function r2Put(env, key, body, contentType) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await fetch(r2Url(env, key), {
        method: 'PUT',
        headers: { authorization: `Bearer ${env.token}`, 'content-type': contentType },
        body
      });
    } catch (error) {
      if (attempt === 3) return `r2_network_${error?.message || 'error'}`;
      await new Promise((r) => setTimeout(r, attempt * 3000));
      continue;
    }
    if (response.ok) return '';
    if (response.status !== 429 && response.status < 500) return `r2_put_${response.status}`;
    if (attempt === 3) return `r2_put_${response.status}`;
    await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  return 'r2_put_exhausted';
}

async function r2Fetch(env, key) {
  let response;
  try {
    response = await fetch(r2Url(env, key), { headers: { authorization: `Bearer ${env.token}` } });
  } catch (error) {
    return { error: `r2_network_${error?.message || 'error'}` };
  }
  if (response.status === 404) return { absent: true };
  if (!response.ok) return { error: `r2_get_${response.status}` };
  return { bytes: Buffer.from(await response.arrayBuffer()) };
}

async function r2Verify(env, key, expectedBytes) {
  let last = 'unknown';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await r2Fetch(env, key);
    if (result.bytes) {
      if (result.bytes.length !== expectedBytes) { last = 'r2_size_mismatch'; }
      else if (validateAudio(result.bytes)) { last = 'r2_corrupt'; }
      else return '';
    } else {
      last = result.error || 'r2_absent';
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

/**
 * Validasi header audio (MPEG frame sync / ID3 / RIFF WAV)
 */
function validateAudio(bytes) {
  if (!bytes || bytes.length < 512) return 'too_small';
  const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // "RIFF"
  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const isMp3Frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (!isWav && !isId3 && !isMp3Frame) return 'not_supported_audio';
  return '';
}

/**
 * Menambahkan header WAV (PCM 16-bit, 24kHz, Mono) ke raw audio bytes dari Gemini
 */
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function manifestEntry(identity, objectKey, bytes, sourceRef) {
  return {
    url: `a/${objectKey}`,
    contentType: identity.contentType,
    locale: identity.locale,
    voiceId: identity.voiceId,
    modelId: identity.modelId,
    bytes: bytes.length,
    checksum: crypto.createHash('sha256').update(bytes).digest('hex'),
    sourceRef,
    createdAt: new Date().toISOString(),
    status: 'ready'
  };
}

function parseArgs(argv) {
  const out = { content: 'listening', limit: 0, apply: false, verifyOnly: false, voice: DEFAULT_GEMINI_VOICE };
  for (const arg of argv.slice(2)) {
    const [rawKey, rawValue] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg, ''];
    if (rawKey === 'apply') out.apply = true;
    else if (rawKey === 'verify-only') out.verifyOnly = true;
    else if (rawKey === 'content') out.content = String(rawValue || '').trim();
    else if (rawKey === 'limit') out.limit = Number(rawValue) || 0;
    else if (rawKey === 'voice') out.voice = String(rawValue || '').trim();
  }
  return out;
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

const REGISTRY = {
  listening() {
    const bank = readJson('features/speaking-listening/listening-bank-v1.json');
    const order = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
    return (bank?.items || [])
      .filter((item) => item?.script)
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const la = order[a.item.level] ?? 99;
        const lb = order[b.item.level] ?? 99;
        return la === lb ? a.index - b.index : la - lb;
      })
      .map(({ item }) => ({
        text: item.script,
        contentType: 'listening',
        locale: item.voiceLang || 'en-US',
        sourceRef: item.id
      }));
  }
};

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest tidak ditemukan di ${MANIFEST_PATH}`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(manifest) {
  manifest.version = (Number(manifest.version) || 0) + 1;
  manifest.generatedAt = new Date().toISOString();
  const temp = `${MANIFEST_PATH}.tmp.${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(temp, MANIFEST_PATH);
}

/**
 * Sintesis audio melalui Google Gemini Multimodal Audio API
 */
async function synthesizeGemini(text, voiceName, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Read the following English text aloud clearly, naturally, and with vibrant energy, suitable for language learners:\n\n${text}`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName
          }
        }
      }
    }
  };

  let lastError = 'unknown';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      lastError = `network_${err?.message || 'error'}`;
      await new Promise((r) => setTimeout(r, attempt * 1500));
      continue;
    }

    if (response.status === 429 || response.status === 503) {
      let detail = '';
      try { detail = await response.text(); } catch (_) {}
      console.warn(`[Gemini HTTP ${response.status}] Percobaan ${attempt}/${MAX_RETRIES}, menunggu 6 detik...`);
      await new Promise((r) => setTimeout(r, 6000));
      continue;
    }

    if (!response.ok) {
      let detail = '';
      try { detail = (await response.text()).slice(0, 300); } catch (_) {}
      if (response.status === 400 || response.status === 403) {
        return { fatal: `Gemini API Key bermasalah / ditolak (HTTP ${response.status}: ${detail})` };
      }
      lastError = `http_${response.status}: ${detail}`;
      await new Promise((r) => setTimeout(r, attempt * 2000));
      continue;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p) => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'));

    if (!audioPart || !audioPart.inlineData?.data) {
      lastError = 'no_audio_part_in_response';
      await new Promise((r) => setTimeout(r, attempt * 1500));
      continue;
    }

    const rawBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
    // Jika Gemini mengembalikan raw PCM (audio/L16), tambahkan header WAV agar playable
    let finalAudioBuffer = rawBuffer;
    if (audioPart.inlineData.mimeType.includes('L16') || audioPart.inlineData.mimeType.includes('pcm')) {
      finalAudioBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
    }

    const invalid = validateAudio(finalAudioBuffer);
    if (invalid) {
      lastError = `invalid_audio: ${invalid}`;
      continue;
    }

    return { bytes: finalAudioBuffer };
  }

  return { error: lastError };
}

async function main() {
  const args = parseArgs(process.argv);
  const build = REGISTRY[args.content];
  if (!build) {
    console.error(`Konten ${args.content} tidak dikenal.`);
    process.exit(2);
  }

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('GEMINI_API_KEY belum diset di environment / secrets.');
    process.exit(2);
  }

  const manifest = loadManifest();
  const voiceId = args.voice;
  const modelId = `gemini-tts-${GEMINI_MODEL}`;
  const settings = { stability: 0.5, similarityBoost: 0.75, speed: 1 };

  console.log(`=== FIEZEL GEMINI TTS BATCH GENERATOR ===`);
  console.log(`Voice Name   : ${voiceId}`);
  console.log(`Model ID     : ${modelId}`);
  console.log(`Content      : ${args.content}`);

  // Daftarkan profil suara ke list voiceProfiles di manifest jika belum ada
  const currentProfile = { voiceId, modelId, settings };
  const existingProfiles = manifest.voiceProfiles || [manifest.voiceProfile].filter(Boolean);
  const isProfileKnown = existingProfiles.some((p) => p?.voiceId === voiceId && p?.modelId === modelId);
  
  const profilesToCheck = isProfileKnown ? existingProfiles : [currentProfile, ...existingProfiles];

  const planned = new Map();
  let alreadyReady = 0;

  for (const item of build()) {
    let voiced = false;
    for (const profile of profilesToCheck) {
      let key;
      try {
        key = AudioKey.build({ ...item, voiceId: profile.voiceId, modelId: profile.modelId, settings: profile.settings }).audioKey;
      } catch (_) { continue; }
      const known = manifest.assets[key];
      if (known?.status === 'ready' && known.url) {
        voiced = true;
        break;
      }
    }

    if (voiced) {
      alreadyReady++;
      continue;
    }

    const identity = AudioKey.build({ ...item, voiceId, modelId, settings });
    if (!planned.has(identity.audioKey)) {
      planned.set(identity.audioKey, { identity, sourceRef: item.sourceRef || '' });
    }
  }

  let queue = [...planned.values()];
  if (args.limit > 0) queue = queue.slice(0, args.limit);

  console.log(`Sudah siap    : ${alreadyReady}`);
  console.log(`Belum ada     : ${planned.size}`);
  console.log(`Akan diproses : ${queue.length} item`);

  if (args.verifyOnly) {
    console.log('\n[VERIFY] Menguji Gemini API Key...');
    const testResult = await synthesizeGemini('Hello, welcome to Fiezel!', voiceId, apiKey);
    if (testResult.bytes) {
      console.log(`[VERIFY SUCCESS] Gemini API Key aktif! Sampel audio berhasil digenerate (${testResult.bytes.length} bytes).`);
      process.exit(0);
    } else {
      console.error(`[VERIFY FAILED] Gagal menguji Gemini: ${testResult.fatal || testResult.error}`);
      process.exit(1);
    }
  }

  if (!args.apply) {
    console.log('\n[DRY-RUN] Berjalan tanpa mengubah R2/manifest. Gunakan --apply untuk memproduksi audio.');
    return;
  }

  const storage = {
    token: String(process.env.CLOUDFLARE_API_TOKEN || '').trim(),
    accountId: String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim(),
    bucket: String(process.env.R2_BUCKET || 'fiezel-audio').trim()
  };

  if (!storage.token || !storage.accountId) {
    console.error('Kredensial Cloudflare (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID) tidak ada. Proses dibatalkan.');
    process.exit(2);
  }

  let generated = 0;
  let failed = 0;

  // Pastikan profile terdaftar di manifest
  if (!isProfileKnown) {
    manifest.voiceProfiles = [currentProfile, ...(manifest.voiceProfiles || [])];
  }

  for (let i = 0; i < queue.length; i++) {
    const job = queue[i];
    const { identity, sourceRef } = job;
    const objectKey = `${identity.audioKey}.mp3`; // Ekstensi .mp3 seragam di R2

    // Cek apakah sudah ada di R2 lebih dulu
    const existing = await r2Fetch(storage, objectKey);
    if (existing.bytes && !validateAudio(existing.bytes)) {
      manifest.assets[identity.audioKey] = manifestEntry(identity, objectKey, existing.bytes, sourceRef);
      generated++;
      console.log(`[RECOVERED] (${i + 1}/${queue.length}) ${identity.audioKey.slice(0, 8)} dipulihkan dari R2.`);
      continue;
    }

    console.log(`[GENERATING] (${i + 1}/${queue.length}) Level ${job.identity.contentType}: "${identity.canonicalText.slice(0, 40)}..."`);
    const result = await synthesizeGemini(identity.canonicalText, voiceId, apiKey);

    if (result.fatal) {
      console.error(`[FATAL ERROR] ${result.fatal}`);
      break;
    }

    if (!result.bytes) {
      failed++;
      console.error(`[FAILED] Gagal generate ${identity.audioKey.slice(0, 8)}: ${result.error}`);
      continue;
    }

    const putError = await r2Put(storage, objectKey, result.bytes, 'audio/mpeg');
    if (putError) {
      failed++;
      console.error(`[UPLOAD FAILED] Gagal unggah ${identity.audioKey.slice(0, 8)}: ${putError}`);
      continue;
    }

    const verifyError = await r2Verify(storage, objectKey, result.bytes.length);
    if (verifyError) {
      failed++;
      console.error(`[VERIFY FAILED] Gagal verifikasi ${identity.audioKey.slice(0, 8)}: ${verifyError}`);
      continue;
    }

    manifest.assets[identity.audioKey] = manifestEntry(identity, objectKey, result.bytes, sourceRef);
    generated++;

    // Jeda kecil agar aman dari rate limits
    await new Promise((r) => setTimeout(r, 1200));

    // Simpan progres manifest setiap 20 item agar aman jika terhenti
    if (generated % 20 === 0) {
      saveManifest(manifest);
      console.log(`--> Progress tersimpan: ${generated} item selesai.`);
    }
  }

  saveManifest(manifest);

  // Cermin manifest ke R2
  const mirrorError = await r2Put(storage, 'manifest.json', fs.readFileSync(MANIFEST_PATH), 'application/json');
  if (mirrorError) console.error(`Cermin manifest ke R2 gagal (${mirrorError}); manifest di Git tetap sah.`);

  console.log(`\n=== SELESAI: ${generated} audio berhasil diproduksi & disimpan ke R2, ${failed} gagal, Manifest v${manifest.version} ===`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
