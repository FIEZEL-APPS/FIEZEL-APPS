/**
 * FIEZEL Local Development & Production Preview Server (Port 3000)
 * Zero-dependency Node.js HTTP server serving static PWA assets, JSON banks, and local API endpoints.
 * Includes Multi-Character Neural Voice TTS Pipeline (/api/tts/*)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const CACHE_DIR = path.join(ROOT, '.cache', 'neural-tts');

if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (_) {}
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// ============================================================================
// Multi-Character Neural Voice Personas & Routing
// ============================================================================
const PERSONA_VOICES = {
  coach_alex: {
    edgeVoice: 'en-US-GuyNeural',
    personaLabel: 'Coach Alex · Native American Coach (GuyNeural)',
    pitchHint: 'Suara coach pria Amerika natural & ekspresif (pitch +4Hz, rate +2%)',
    prosodyPitch: '+4Hz',
    prosodyRate: '+2%',
    role: 'Coach Alex',
    lang: 'en-US',
    geminiVoice: 'Puck'
  },
  coach_sarah: {
    edgeVoice: 'en-US-AriaNeural',
    personaLabel: 'Coach Sarah · Dynamic Female Coach (AriaNeural)',
    pitchHint: 'Suara coach wanita Amerika cerdas & natural (pitch +3Hz, rate +1%)',
    prosodyPitch: '+3Hz',
    prosodyRate: '+1%',
    role: 'Coach Sarah',
    lang: 'en-US',
    geminiVoice: 'Aoede'
  },
  instructor: {
    edgeVoice: 'id-ID-ArdiNeural',
    personaLabel: 'ArdiNeural · Bariton Instruktur Ujian',
    pitchHint: 'Suara pria dewasa tegas & berwibawa (pitch -6Hz, rate -4%)',
    prosodyPitch: '-6Hz',
    prosodyRate: '-4%',
    role: 'Instruktur Ujian',
    lang: 'id-ID',
    geminiVoice: 'Charon'
  },
  kaiwa_male: {
    edgeVoice: 'ja-JP-KeitaNeural',
    personaLabel: 'KeitaNeural · Mitra Kaiwa Jepang (Laki-laki)',
    pitchHint: 'Suara pemuda Jepang natural (pitch +4Hz, rate +3%)',
    prosodyPitch: '+4Hz',
    prosodyRate: '+3%',
    role: 'Mitra Kaiwa Jepang (Laki-laki)',
    lang: 'ja-JP',
    geminiVoice: 'Puck'
  },
  kaiwa_female: {
    edgeVoice: 'ja-JP-NanamiNeural',
    personaLabel: 'NanamiNeural · Mitra Kaiwa Jepang (Perempuan)',
    pitchHint: 'Suara mahasiswi Jepang cerdas & ramah (pitch +3Hz, rate +1%)',
    prosodyPitch: '+3Hz',
    prosodyRate: '+1%',
    role: 'Mitra Kaiwa Jepang (Perempuan)',
    lang: 'ja-JP',
    geminiVoice: 'Aoede'
  },
  vocab: {
    edgeVoice: 'en-US-AvaNeural',
    personaLabel: 'AvaNeural · Neural Lexicon (Pelafalan Kosakata)',
    pitchHint: 'Artikulasi kamus jernih (pitch +0Hz, rate -2%)',
    prosodyPitch: '+0Hz',
    prosodyRate: '-2%',
    role: 'Leksikon Kosakata',
    lang: 'en-US',
    geminiVoice: 'Kore'
  },
  male_student: {
    edgeVoice: 'en-US-GuyNeural',
    personaLabel: 'GuyNeural · Tenor Mahasiswa Laki-laki',
    pitchHint: 'Suara pemuda natural & ekspresif (pitch +4Hz, rate +2%)',
    prosodyPitch: '+4Hz',
    prosodyRate: '+2%',
    role: 'Coach Alex',
    lang: 'en-US',
    geminiVoice: 'Puck'
  },
  female_student: {
    edgeVoice: 'en-US-AriaNeural',
    personaLabel: 'AriaNeural · Soprano Mahasiswi Perempuan',
    pitchHint: 'Suara mahasiswi natural & cerdas (pitch +3Hz, rate +1%)',
    prosodyPitch: '+3Hz',
    prosodyRate: '+1%',
    role: 'Coach Sarah',
    lang: 'en-US',
    geminiVoice: 'Aoede'
  }
};

function resolvePersona(speaker, lang, text) {
  const normSpeaker = (speaker || '').toLowerCase().trim();
  const normLang = (lang || '').toLowerCase().trim();

  if (normSpeaker && PERSONA_VOICES[normSpeaker]) {
    return PERSONA_VOICES[normSpeaker];
  }

  if (normSpeaker) {
    for (const key of Object.keys(PERSONA_VOICES)) {
      const p = PERSONA_VOICES[key];
      if (p.edgeVoice.toLowerCase() === normSpeaker || p.edgeVoice.toLowerCase().endsWith(normSpeaker)) {
        return p;
      }
    }
  }

  if (normSpeaker.includes('alex') || normSpeaker.includes('guy')) return PERSONA_VOICES.coach_alex;
  if (normSpeaker.includes('sarah') || normSpeaker.includes('aria')) return PERSONA_VOICES.coach_sarah;
  if (normSpeaker.includes('ardi') || normSpeaker.includes('instructor') || normSpeaker.includes('instruktur') || normSpeaker.includes('ujian')) {
    return PERSONA_VOICES.instructor;
  }
  if (normSpeaker.includes('keita') || normSpeaker.includes('kaiwa_male') || (normSpeaker.includes('kaiwa') && normSpeaker.includes('laki'))) {
    return PERSONA_VOICES.kaiwa_male;
  }
  if (normSpeaker.includes('nanami') || normSpeaker.includes('kaiwa_female') || (normSpeaker.includes('kaiwa') && normSpeaker.includes('perempuan'))) {
    return PERSONA_VOICES.kaiwa_female;
  }
  if (normSpeaker.includes('vocab') || normSpeaker.includes('ava') || normSpeaker.includes('lexicon') || normSpeaker.includes('kamus')) {
    return PERSONA_VOICES.vocab;
  }

  if (normLang.startsWith('ja')) return PERSONA_VOICES.kaiwa_male;
  if (normLang.startsWith('id')) return PERSONA_VOICES.instructor;
  if (normLang.startsWith('en')) return PERSONA_VOICES.coach_alex;

  if (text && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) {
    return PERSONA_VOICES.kaiwa_male;
  }

  return PERSONA_VOICES.instructor;
}

// In-Memory & Disk Cache
const ttsAudioCache = new Map();
const inFlightRequests = new Map();
let synthesisMutex = Promise.resolve();

const fallbackClipsByVoice = new Map();
function indexDiskCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const item = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
        if (item && item.audioBase64 && item.voiceName) {
          if (!fallbackClipsByVoice.has(item.voiceName)) {
            fallbackClipsByVoice.set(item.voiceName, item);
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
}
indexDiskCache();

function getDiskCachePath(cacheKey) {
  const hash = crypto.createHash('sha256').update(cacheKey).digest('hex');
  return path.join(CACHE_DIR, `${hash}.json`);
}

function readDiskCache(cacheKey) {
  try {
    const filePath = getDiskCachePath(cacheKey);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

function writeDiskCache(cacheKey, data) {
  try {
    const filePath = getDiskCachePath(cacheKey);
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    if (data.voiceName && !fallbackClipsByVoice.has(data.voiceName)) {
      fallbackClipsByVoice.set(data.voiceName, data);
    }
  } catch (_) {}
}

// Library synthesis via msedge-tts (if available)
async function tryMsEdgeTts(text, persona) {
  try {
    const msedge = require('msedge-tts');
    if (!msedge || !msedge.MsEdgeTTS) return null;
    const tts = new msedge.MsEdgeTTS();
    try {
      await tts.setMetadata(persona.edgeVoice, msedge.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text.trim(), {
        pitch: persona.prosodyPitch,
        rate: persona.prosodyRate
      });
      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const mp3Buffer = Buffer.concat(chunks);
      if (mp3Buffer.length > 0) {
        return {
          audioBase64: mp3Buffer.toString('base64'),
          mimeType: 'audio/mpeg',
          voiceName: persona.edgeVoice.replace(/^[a-z]{2}-[A-Z]{2}-/, ''),
          personaLabel: persona.personaLabel,
          engine: 'edge-neural-24khz'
        };
      }
    } finally {
      try { tts.close(); } catch (_) {}
    }
  } catch (_) {}
  return null;
}

// Helper: Wrap raw 16-bit PCM buffer into standard WAV container (zero dependencies)
function pcmToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

// Gemini TTS with multi-key pool rotation
const KEYS_FILE = path.join(ROOT, 'config', 'gemini-keys.json');
let geminiKeys = [];
try {
  geminiKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
} catch (_) {
  const rawEnv = process.env.GEMINI_LIVE_KEYS || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  if (rawEnv) {
    geminiKeys = rawEnv.split(',').map((s) => s.trim()).filter((s) => s.length > 10);
  }
}
let currentKeyIndex = Math.floor(Math.random() * Math.max(1, geminiKeys.length));

async function tryGeminiTts(text, persona) {
  if (!geminiKeys || geminiKeys.length === 0) return null;
  const geminiVoice = persona.geminiVoice || 'Puck';
  for (let attempt = 0; attempt < Math.min(geminiKeys.length, 6); attempt++) {
    const key = geminiKeys[(currentKeyIndex + attempt) % geminiKeys.length];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text }] }],
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
      if (res.status === 429) continue;
      if (!res.ok) continue;
      const json = await res.json();
      const b64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) continue;

      const pcmBuffer = Buffer.from(b64, 'base64');
      const audioBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1, 16);
      const audioMime = 'audio/wav';

      currentKeyIndex = (currentKeyIndex + attempt) % geminiKeys.length;
      return {
        audioBase64: audioBuffer.toString('base64'),
        mimeType: audioMime,
        voiceName: persona.geminiVoice || persona.edgeVoice.replace(/^[a-z]{2}-[A-Z]{2}-/, ''),
        personaLabel: persona.personaLabel,
        engine: 'gemini-tts-24khz'
      };
    } catch (_) {}
  }
  return null;
}

// Resilient Disk Cache Fallback Audio
function getFallbackAudio(persona) {
  const shortVoice = persona.edgeVoice.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
  if (fallbackClipsByVoice.has(shortVoice)) {
    const cached = fallbackClipsByVoice.get(shortVoice);
    return {
      audioBase64: cached.audioBase64,
      mimeType: cached.mimeType || 'audio/mpeg',
      voiceName: shortVoice,
      personaLabel: persona.personaLabel,
      engine: 'disk-cache-voice-fallback',
      fallback: true
    };
  }
  for (const [, item] of fallbackClipsByVoice.entries()) {
    if (item && item.audioBase64) {
      return {
        audioBase64: item.audioBase64,
        mimeType: item.mimeType || 'audio/mpeg',
        voiceName: shortVoice,
        personaLabel: persona.personaLabel,
        engine: 'disk-cache-general-fallback',
        fallback: true
      };
    }
  }
  const SILENT_MP3_B64 = '//PAxAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAAZgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  return {
    audioBase64: SILENT_MP3_B64,
    mimeType: 'audio/mpeg',
    voiceName: shortVoice,
    personaLabel: persona.personaLabel,
    engine: 'synthesizer-failover-frame',
    fallback: true
  };
}

async function synthesizeNeuralLine(text, speaker, lang) {
  const persona = resolvePersona(speaker, lang, text);
  const cacheKey = `${persona.edgeVoice}::${text.trim()}`;

  // 1. Check in-memory cache
  const memCached = ttsAudioCache.get(cacheKey);
  if (memCached) {
    return memCached;
  }

  // 2. Check persistent disk cache
  const diskCached = readDiskCache(cacheKey);
  if (diskCached) {
    ttsAudioCache.set(cacheKey, diskCached);
    return diskCached;
  }

  // 3. Deduplicate concurrent requests
  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const synthPromise = (async () => {
    try {
      const runSynthesis = async () => {
        let res = await tryGeminiTts(text, persona);
        if (res) return res;

        res = await tryMsEdgeTts(text, persona);
        if (res) return res;

        return getFallbackAudio(persona);
      };

      const next = synthesisMutex.then(runSynthesis, runSynthesis);
      synthesisMutex = next.then(() => undefined, () => undefined);
      const result = await next;

      ttsAudioCache.set(cacheKey, result);
      writeDiskCache(cacheKey, result);
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, synthPromise);
  return synthPromise;
}

// ============================================================================
// Server Utilities & Request Handlers
// ============================================================================
function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version'
  });
  res.end(payload);
}

function parseJsonBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const LOCAL_COPILOT_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
const localKeyCooldowns = new Map();

async function invokeLocalGeminiSingle({ key, model, promptText, temperature, maxOutputTokens = 750, parentSignal }) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) return { ok: false, reason: 'aborted' };
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), 9500);
  try {
    const thinkingConfig = model === 'gemini-3-flash-preview'
      ? { thinkingBudget: 0 }
      : { thinkingLevel: 'MINIMAL' };
    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature,
            maxOutputTokens,
            thinkingConfig
          }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timer);
    if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    if (gRes.status === 429) {
      localKeyCooldowns.set(key, Date.now() + 65000);
      return { ok: false, reason: `HTTP 429 (${model})` };
    }
    if (!gRes.ok) {
      if (gRes.status !== 404) localKeyCooldowns.set(key, Date.now() + 15000);
      return { ok: false, reason: `HTTP ${gRes.status} (${model})` };
    }
    const gData = await gRes.json();
    const rawTxt = (gData.candidates?.[0]?.content?.parts?.[0]?.text || '')
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    if (!rawTxt) return { ok: false, reason: 'empty_candidate' };
    const parsedRaw = JSON.parse(rawTxt);
    localKeyCooldowns.delete(key);
    return {
      ok: true,
      parsed: Array.isArray(parsedRaw) ? parsedRaw[0] : parsedRaw,
      model
    };
  } catch (err) {
    clearTimeout(timer);
    if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    return { ok: false, reason: err?.message || 'fetch_error' };
  }
}

async function runLocalGeminiJsonWithHedge(promptText, temperature = 0.5, maxOutputTokens = 750) {
  if (!geminiKeys || geminiKeys.length === 0) return { ok: false, reason: 'no_keys' };
  const now = Date.now();
  const total = geminiKeys.length;
  const healthy = [];
  for (let i = 0; i < total; i++) {
    const k = geminiKeys[(currentKeyIndex + i) % total];
    if (now >= (localKeyCooldowns.get(k) || 0)) healthy.push(k);
  }
  const pool = healthy.length > 0 ? healthy : geminiKeys;
  currentKeyIndex = (currentKeyIndex + 1) % total;

  const raceAbort = new AbortController();
  const keyPrimary = pool[0];
  const keyHedge = pool[1 % pool.length];
  let hedgeTimer = null;

  const hedgeWinner = await new Promise(resolve => {
    let settled = false;
    let pending = 1;
    let hedgeStarted = false;

    const finishWinner = winner => {
      if (settled) return;
      settled = true;
      if (hedgeTimer) clearTimeout(hedgeTimer);
      raceAbort.abort();
      resolve(winner);
    };

    const startHedge = () => {
      if (settled || hedgeStarted) return;
      hedgeStarted = true;
      pending += 1;
      invokeLocalGeminiSingle({
        key: keyHedge,
        model: LOCAL_COPILOT_MODELS[1],
        promptText,
        temperature,
        maxOutputTokens,
        parentSignal: raceAbort.signal
      }).then(resB => {
        if (resB.ok) finishWinner(resB);
        else {
          pending -= 1;
          if (pending === 0 && !settled) {
            settled = true;
            resolve(null);
          }
        }
      });
    };

    // Hedge fires at 750ms if primary key #1 has not yet answered
    hedgeTimer = setTimeout(startHedge, 750);

    invokeLocalGeminiSingle({
      key: keyPrimary,
      model: LOCAL_COPILOT_MODELS[0],
      promptText,
      temperature,
      maxOutputTokens,
      parentSignal: raceAbort.signal
    }).then(resA => {
      if (resA.ok) finishWinner(resA);
      else {
        if (hedgeTimer) {
          clearTimeout(hedgeTimer);
          hedgeTimer = null;
        }
        startHedge();
        pending -= 1;
        if (pending === 0 && !settled) {
          settled = true;
          resolve(null);
        }
      }
    });
  });

  if (hedgeWinner && hedgeWinner.ok) return hedgeWinner;

  const keyFallback = pool[2 % pool.length];
  return invokeLocalGeminiSingle({
    key: keyFallback,
    model: LOCAL_COPILOT_MODELS[2],
    promptText,
    temperature,
    maxOutputTokens
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:3000'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // API Routes
  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'healthy', service: 'fiezel-pwa-server', timestamp: Date.now() });
  }
  if (pathname === '/api/version') {
    return sendJson(res, 200, { status: 'ok', build: 'local-dev', timestamp: Date.now() });
  }
  if (pathname === '/api/auth/session') {
    return sendJson(res, 200, { ok: true, signedIn: true, user: { role: 'murid', handle: 'penguji_lokal', email: 'penguji@localhost' } });
  }
  if (pathname === '/api/feedback' && req.method === 'POST') {
    await parseJsonBody(req);
    return sendJson(res, 200, { ok: true, receivedAt: Date.now() });
  }

  // Multi-Character Neural Voice Endpoints
  if (pathname === '/api/tts/personas' && (req.method === 'GET' || req.method === 'HEAD')) {
    return sendJson(res, 200, {
      engine: 'multi-character-neural-24khz',
      personas: PERSONA_VOICES,
      cachedClips: ttsAudioCache.size
    });
  }

  if (pathname === '/api/tts/line' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { text, speaker = 'instructor', lang } = body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return sendJson(res, 400, { error: 'Parameter text wajib diisi.' });
    }
    try {
      const audioResult = await synthesizeNeuralLine(text, speaker, lang);
      return sendJson(res, 200, audioResult);
    } catch (err) {
      return sendJson(res, 503, {
        error: err instanceof Error ? err.message : 'Gagal membuat suara neural.',
        fallback: true
      });
    }
  }

  if (pathname === '/api/tts/dialogue' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { lines } = body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return sendJson(res, 400, { error: 'Parameter lines wajib berupa array.' });
    }
    try {
      const results = [];
      for (const line of lines) {
        const audio = await synthesizeNeuralLine(line.text, line.speaker, line.lang);
        results.push({
          index: line.index,
          speaker: line.speaker,
          ...audio
        });
      }
      return sendJson(res, 200, {
        engine: 'multi-character-neural-24khz',
        clips: results
      });
    } catch (err) {
      return sendJson(res, 503, {
        error: err instanceof Error ? err.message : 'Gagal merender dialog neural.',
        fallback: true
      });
    }
  }

  if (pathname === '/api/voice/live-session' && req.method === 'POST') {
    if (!geminiKeys || geminiKeys.length === 0) {
      return sendJson(res, 503, { ok: false, fallback: true, error: 'no_keys_configured' });
    }
    const now = Date.now();
    for (let attempt = 0; attempt < geminiKeys.length; attempt++) {
      const idx = (currentKeyIndex + attempt) % geminiKeys.length;
      const key = geminiKeys[idx];
      try {
        const tokRes = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({
            uses: 1,
            expireTime: new Date(now + 30 * 60e3).toISOString(),
            newSessionExpireTime: new Date(now + 2 * 60e3).toISOString()
          })
        });
        const tokJson = await tokRes.json().catch(() => ({}));
        if (tokRes.ok && tokJson && typeof tokJson.name === 'string' && tokJson.name.startsWith('auth_tokens/')) {
          currentKeyIndex = (idx + 1) % geminiKeys.length;
          return sendJson(res, 200, {
            ok: true,
            token: tokJson.name,
            model: 'gemini-3.8-live',
            endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained',
            keyIndex: idx + 1,
            totalKeys: geminiKeys.length
          });
        }
      } catch (_) {}
    }
    return sendJson(res, 503, { ok: false, fallback: true, error: 'all_keys_busy' });
  }

  if (pathname === '/api/voice/report-drop' && req.method === 'POST') {
    await parseJsonBody(req);
    if (geminiKeys && geminiKeys.length > 0) {
      currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
    }
    return sendJson(res, 200, { ok: true, shifted: true });
  }

  if ((pathname === '/api/voice/copilot-assist' || pathname === '/api/voice-call/assist') && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const targetLang = body.targetLang === 'en' ? 'en' : 'ja';
    const locale = body.locale === 'th' ? 'th' : 'id';
    const learnerLangName = locale === 'th' ? 'Thai' : 'Indonesian';
    const cleanText = (v) => String(v || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\*[^*]{1,30}\*/g, '').replace(/\s+/g, ' ').trim();
    const aiText = cleanText(body.aiText || body.aiQuestionText || '').slice(0, 500);
    if (!aiText) {
      return sendJson(res, 400, { ok: false, error: 'invalid_request', message: 'aiText wajib diisi.' });
    }
    if (!geminiKeys || geminiKeys.length === 0) {
      return sendJson(res, 503, { ok: false, fallback: true, error: 'no_keys_configured' });
    }

    const lastUserText = cleanText(body.lastUserText || '').slice(0, 320);
    const scenarioTitle = cleanText(body.scenarioTitle || body.scenarioId || 'Free Talk').slice(0, 100);
    const rawHist = Array.isArray(body.history || body.conversationHistory) ? (body.history || body.conversationHistory) : [];
    const historyLines = rawHist
      .filter((h) => h && typeof h.text === 'string' && h.text.trim())
      .slice(-6)
      .map((h) => `- ${h.speaker === 'user' ? 'Learner' : 'Partner AI'}: "${cleanText(h.text).slice(0, 260)}"`);
    const excludeList = Array.isArray(body.excludeTexts)
      ? body.excludeTexts.map((t) => cleanText(t).slice(0, 160)).filter(Boolean).slice(0, 6)
      : [];
    const variationSeed = Number(body.variationSeed || 0);

    const langSpec =
      targetLang === 'ja'
        ? 'Japanese (natural spoken N5-N3, Kanji+Hiragana, NO emojis; "pronunciation" = word-spaced Hepburn Romaji)'
        : 'English (natural spoken A2-B1, NO emojis; "pronunciation" = easy phonetic guide)';

    // Optimized lean prompt for sub-2s generation with zero static templates
    const prompt = [
      `Live Two-Way Spoken Conversation Copilot (${scenarioTitle}). Language: ${langSpec}.`,
      `Persona & Pedagogy: Witty, lively, tough-love conversational mentor in FIEZEL (ecosystem created by Fitra Rustqi from Banda Aceh; powered by Braincore).`,
      historyLines.length ? `Recent context:\n${historyLines.join('\n')}` : '',
      lastUserText ? `Learner said previously: "${lastUserText}"` : '',
      `Partner AI JUST SPOKE: "${aiText}"`,
      excludeList.length ? `Provide 3 fresh angles (do not repeat: ${JSON.stringify(excludeList)}).` : '',
      `Generate 3 spontaneous spoken replies directly answering "${aiText}" (natural, conversational, punchy; NEVER static textbook templates):`,
      `- easy: 1 short natural sentence`,
      `- mission: contextual answer with concrete detail`,
      `- rescue: polite reply + a smart follow-up question back`,
      `Also translate "${aiText}" into ${learnerLangName} as "aiMeaning".`,
      `For each reply, provide natural first-person translation in ${learnerLangName} as "hint" (e.g. "Saya suka ramen pedas", NOT meta-labels).`,
      'Output JSON only: {"aiMeaning":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}]}'
    ].filter(Boolean).join('\n');

    const temp = variationSeed > 0 || excludeList.length > 0 ? 0.7 : 0.4;
    const gen = await runLocalGeminiJsonWithHedge(prompt, temp, 750);
    if (gen && gen.ok && gen.parsed) {
      const parsed = gen.parsed;
      const aiMeaning = cleanText(parsed?.aiMeaning || parsed?.aiMeaningId || parsed?.aiMeaningTh || '');
      const defaultBadges = [
        { tier: 'easy', badgeId: 'Singkat & Mudah', badgeTh: 'สั้นและง่าย' },
        { tier: 'mission', badgeId: 'Alami & Kontekstual', badgeTh: 'เป็นธรรมชาติ' },
        { tier: 'rescue', badgeId: 'Jawab + Tanya Balik', badgeTh: 'ตอบและถามกลับ' }
      ];
      const replies = (Array.isArray(parsed?.replies) ? parsed.replies : [])
        .map((it, i) => {
          const meta = defaultBadges[i] || defaultBadges[0];
          const text = cleanText(it?.text || '');
          if (!text) return null;
          const hint = cleanText(it?.hint || (locale === 'th' ? it?.hintTh : it?.hintId) || it?.translation || '');
          return {
            id: `ai_rt_${Date.now()}_${i}`,
            tier: it?.tier === 'easy' || it?.tier === 'mission' || it?.tier === 'rescue' ? it.tier : meta.tier,
            badgeId: cleanText(it?.badgeId || it?.labelId || meta.badgeId) || meta.badgeId,
            badgeTh: cleanText(it?.badgeTh || it?.labelTh || meta.badgeTh) || meta.badgeTh,
            text,
            pronunciation: cleanText(it?.pronunciation || it?.phonetic || ''),
            hintId: locale === 'th' ? cleanText(it?.hintId || hint) : hint,
            hintTh: locale === 'th' ? hint : cleanText(it?.hintTh || hint),
            hint,
            isRealtimeAi: true
          };
        })
        .filter(Boolean)
        .slice(0, 3);
      if (replies.length > 0) {
        return sendJson(res, 200, {
          ok: true,
          source: 'ai-realtime',
          model: gen.model,
          aiMeaning,
          aiMeaningId: locale === 'th' ? cleanText(parsed?.aiMeaningId || aiMeaning) : aiMeaning,
          aiMeaningTh: locale === 'th' ? aiMeaning : cleanText(parsed?.aiMeaningTh || aiMeaning),
          replies,
          suggestions: replies,
          serverTime: Date.now()
        });
      }
    }
    return sendJson(res, 503, { ok: false, fallback: true, error: 'copilot_unavailable' });
  }

  if (pathname === '/api/voice/partner-turn' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const targetLang = body.targetLang === 'en' ? 'en' : 'ja';
    const locale = body.locale === 'th' ? 'th' : 'id';
    const learnerLangName = locale === 'th' ? 'Thai' : 'Indonesian';
    const cleanText = (v) => String(v || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\*[^*]{1,30}\*/g, '').replace(/\s+/g, ' ').trim();
    const userText = cleanText(body.text || '').slice(0, 400);
    if (!userText) {
      return sendJson(res, 400, { ok: false, error: 'invalid_request', message: 'text wajib diisi.' });
    }
    if (!geminiKeys || geminiKeys.length === 0) {
      return sendJson(res, 503, { ok: false, fallback: true, error: 'no_keys_configured' });
    }

    const personaName = cleanText(body.personaName || (targetLang === 'ja' ? 'Nanami' : 'Alex')).slice(0, 40);
    const scenarioTitle = cleanText(body.scenarioTitle || 'Free Talk').slice(0, 100);
    const rawHist = Array.isArray(body.history) ? body.history : [];
    const historyLines = rawHist
      .filter((h) => h && typeof h.text === 'string' && h.text.trim())
      .slice(-6)
      .map((h) => `- ${h.speaker === 'user' ? 'Learner' : 'Partner AI'}: "${cleanText(h.text).slice(0, 260)}"`);

    const langSpec =
      targetLang === 'ja'
        ? 'Japanese (lively native Tokyo spoken Japanese N5-N3, Kanji+Hiragana, NO emojis; reply "pronunciation" = word-spaced Hepburn Romaji)'
        : 'English (lively native conversational spoken English A2-B1, NO emojis; reply "pronunciation" = easy phonetic guide)';

    const prompt = [
      `You are ${personaName} on a live call (${scenarioTitle}). Language: ${langSpec}.`,
      `[FIEZEL ECOSYSTEM]: Created by Fitra Rustqi (@fitrarustqi) from Banda Aceh, Indonesia; powered by Braincore Engine (BKT, IRT 3PL, OLM); mascot is Mochi the 3D Daifuku cat who loves onigiri. If asked about Fiezel or its creator, answer proudly, enthusiastically, and accurately with witty persona!`,
      `[MANDATORY SASSY PEDAGOGY: GURU KEJAM TAPI BAIK HATI / TOUGH LOVE & TSUNDERE]:`,
      `- STRICT RULE: You are BANNED from speaking like a polite corporate chatbot or boring textbook bot.`,
      `- EVERY TURN MUST START WITH A SASSY/PLAYFUL REACTION matching ${personaName}:`,
      `  * If Nanami (Sensei): Lead with tsundere/sassy quip (e.g. "あら？ちょっと硬すぎ！", "あはは！カチコチじゃん！", "えーっ！教科書丸出し！", "ふーん、やるじゃない！", "ちょっと待って、watashi wa 多すぎ！").`,
      `  * If Keita (Senpai): Lead with Tokyo slang teasing (e.g. "マジで！？ウケるんだけど！", "あはは！それ直訳すぎるって！", "ちょ、硬い硬い！リラックスして！", "おっ、いいじゃん！", "それな！").`,
      `  * If Alex (Coach): Lead with punchy American teasing (e.g. "Haha, whoa! Stiff as a board!", "Come on, don't overthink in your head!", "Boom, that's what I'm talking about!", "Haha, sounds like Google Translate 2010!").`,
      `  * If Sarah (Mentor): Lead with dry, razor-sharp critique (e.g. "A bit roundabout, don't you think?", "Direct and sharp—much better!", "Haha, why three sentences when one works?").`,
      `- Immediately after teasing or reacting, drop the ultra-natural spoken phrase they should say and ask a snappy follow-up question.`,
      `- When the learner speaks naturally, give proud praise ("Nah gitu dong!").`,
      historyLines.length ? `Context:\n${historyLines.join('\n')}` : '',
      `Learner JUST SPOKE: "${userText}"`,
      `1) "aiReply": Reply as ${personaName} in 1-2 short spoken sentences (max 18 words) starting with your mandatory sassy reaction to "${userText}" + follow-up question on the same topic (no emojis). Translate into ${learnerLangName} as "aiReplyTranslation".`,
      `2) "replies": 3 spontaneous spoken replies the learner can say NEXT to directly answer your new "aiReply" (easy=short, mission=with detail, rescue=answer+question back; NEVER static templates). Translate each into ${learnerLangName} as "hint".`,
      'JSON only: {"aiReply":"...","aiReplyTranslation":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}]}'
    ].filter(Boolean).join('\n');

    const gen = await runLocalGeminiJsonWithHedge(prompt, 0.5, 750);
    if (gen && gen.ok && gen.parsed) {
      const parsed = gen.parsed;
      const aiReply = cleanText(parsed?.aiReply || '');
      const aiReplyTranslation = cleanText(parsed?.aiReplyTranslation || parsed?.aiReplyTranslationId || parsed?.aiReplyTranslationTh || '');
      if (aiReply) {
        const defaultBadges = [
          { tier: 'easy', badgeId: 'Singkat & Mudah', badgeTh: 'สั้นและง่าย' },
          { tier: 'mission', badgeId: 'Alami & Kontekstual', badgeTh: 'เป็นธรรมชาติ' },
          { tier: 'rescue', badgeId: 'Jawab + Tanya Balik', badgeTh: 'ตอบและถามกลับ' }
        ];
        const replies = (Array.isArray(parsed?.replies) ? parsed.replies : [])
          .map((it, i) => {
            const meta = defaultBadges[i] || defaultBadges[0];
            const text = cleanText(it?.text || '');
            if (!text) return null;
            const hint = cleanText(it?.hint || (locale === 'th' ? it?.hintTh : it?.hintId) || it?.translation || '');
            return {
              id: `ai_rt_${Date.now()}_${i}`,
              tier: it?.tier === 'easy' || it?.tier === 'mission' || it?.tier === 'rescue' ? it.tier : meta.tier,
              badgeId: cleanText(it?.badgeId || it?.labelId || meta.badgeId) || meta.badgeId,
              badgeTh: cleanText(it?.badgeTh || it?.labelTh || meta.badgeTh) || meta.badgeTh,
              text,
              pronunciation: cleanText(it?.pronunciation || it?.phonetic || ''),
              hintId: locale === 'th' ? cleanText(it?.hintId || hint) : hint,
              hintTh: locale === 'th' ? hint : cleanText(it?.hintTh || hint),
              hint,
              isRealtimeAi: true
            };
          })
          .filter(Boolean)
          .slice(0, 3);
        return sendJson(res, 200, {
          ok: true,
          source: 'ai-realtime',
          model: gen.model,
          aiReply,
          aiReplyTranslation,
          aiReplyTranslationId: locale === 'th' ? cleanText(parsed?.aiReplyTranslationId || aiReplyTranslation) : aiReplyTranslation,
          aiReplyTranslationTh: locale === 'th' ? aiReplyTranslation : cleanText(parsed?.aiReplyTranslationTh || aiReplyTranslation),
          replies,
          serverTime: Date.now()
        });
      }
    }
    return sendJson(res, 503, { ok: false, fallback: true, error: 'partner_turn_unavailable' });
  }

  if (pathname === '/api/braincore/sync' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const items = Array.isArray(body.attempts)
      ? body.attempts
      : Array.isArray(body.entries)
        ? body.entries
        : [];
    const acceptedIds = items
      .map((item) => (item && typeof item.id === 'string' ? item.id : null))
      .filter(Boolean);
    return sendJson(res, 200, {
      ok: true,
      acceptedIds,
      syncedCount: acceptedIds.length,
      serverTime: Date.now()
    });
  }

  if (pathname.startsWith('/api/')) {
    const body = req.method === 'POST' ? await parseJsonBody(req) : {};
    return sendJson(res, 200, {
      ok: true,
      degraded: false,
      text: body?.question
        ? `Fokus pada subjek dan penanda waktu kalimat untuk menentukan pola tata bahasa yang paling tepat.`
        : 'Sinkronisasi Braincore berhasil.',
      serverTime: Date.now()
    });
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback404 = path.join(ROOT, '404.html');
      if (fs.existsSync(fallback404)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(fallback404).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'not_found', path: pathname }));
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[FIEZEL Server] Listening on http://0.0.0.0:${PORT} with Multi-Character Neural TTS pipeline`);
  });
}

module.exports = server;
