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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
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

  // Jika permintaan TTS khusus berbahasa Indonesia (misalnya narasi papan tulis), utamakan suara neural id-ID agar pelafalan Indonesia bersih & tidak gagal!
  if (normLang.startsWith('id')) {
    const isFemale = /sarah|nanami|mochi|ava|aria|gadis|female|perempuan/.test(normSpeaker);
    return isFemale
      ? {
          edgeVoice: 'id-ID-GadisNeural',
          personaLabel: 'GadisNeural · Mentor Bahasa Indonesia',
          pitchHint: 'Suara mentor wanita natural & ramah',
          prosodyPitch: '+2Hz',
          prosodyRate: '-2%',
          role: 'Mentor Bahasa Indonesia',
          lang: 'id-ID',
          geminiVoice: 'Aoede'
        }
      : PERSONA_VOICES.instructor;
  }

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

function isPoisonedFallbackAudioItem(item) {
  if (!item || typeof item !== 'object') return true;
  if (item.fallback === true) return true;
  const eng = String(item.engine || '');
  if (/failover|disk-cache-.*-fallback/i.test(eng)) return true;
  const b64 = String(item.audioBase64 || '').trim();
  if (!b64) return true;
  try {
    if (Buffer.from(b64, 'base64').length <= 256) return true;
  } catch (_) {
    return true;
  }
  return false;
}

const fallbackClipsByVoice = new Map();
function indexDiskCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const item = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
        if (!isPoisonedFallbackAudioItem(item) && item.voiceName) {
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
      const parsed = JSON.parse(raw);
      if (isPoisonedFallbackAudioItem(parsed)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
        return null;
      }
      return parsed;
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

// Gemini TTS & Live API multi-key pool rotation (deduplicated across config + env)
const KEYS_FILE = path.join(ROOT, 'config', 'gemini-keys.json');
const FALLBACK_KEYS_FILE = path.resolve(ROOT, '..', 'fiezel-apps', 'config', 'gemini-keys.json');
function collectAllGeminiKeys() {
  const seen = new Set();
  const addFromList = (list) => {
    for (const item of list) {
      const k = String(item || '').trim();
      if (k.length > 10 && !seen.has(k)) seen.add(k);
    }
  };
  for (const fp of [KEYS_FILE, FALLBACK_KEYS_FILE]) {
    try {
      if (fs.existsSync(fp)) {
        const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (Array.isArray(parsed)) addFromList(parsed);
      }
    } catch (_) {}
  }
  for (const envName of ['GEMINI_LIVE_KEYS', 'GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
    const rawEnv = process.env[envName];
    if (rawEnv) addFromList(String(rawEnv).split(','));
  }
  return Array.from(seen);
}
let geminiKeys = collectAllGeminiKeys();
console.log(`[FIEZEL Server] Gemini key pool loaded: ${geminiKeys.length} unique keys`);
let currentKeyIndex = Math.floor(Math.random() * Math.max(1, geminiKeys.length));

const { pathToFileURL } = require('url');
let _voiceWorkerModPromise = null;
function loadVoiceWorkerModule() {
  if (!_voiceWorkerModPromise) {
    const modUrl = pathToFileURL(path.join(ROOT, 'workers', 'api', 'voice', 'route-voice-live.js')).href;
    _voiceWorkerModPromise = import(modUrl);
  }
  return _voiceWorkerModPromise;
}

function parseRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 1048576) {
        req.destroy();
        resolve(Buffer.alloc(0));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

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

      if (result && !result.fallback) {
        ttsAudioCache.set(cacheKey, result);
        writeDiskCache(cacheKey, result);
      }
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

const LOCAL_COPILOT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];
const localKeyCooldowns = new Map();

function extractFocalClause(aiText, targetLang = 'en') {
  const clean = String(aiText || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\*[^*]{1,30}\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return { fullText: '', focalText: '', isEchoRedemption: false };

  const echoMatchEn = clean.match(
    /(?:repeat|say (?:it|this)?(?:\s+back)?(?:\s+to me)?(?:\s+cleanly|\s+out loud)?|say after me|repeat after me)[:\s]+["'“‘『「]([^"'”’』」]+)["'”’』」]/i
  );
  const echoMatchJa =
    clean.match(/(?:[「『"“])([^」』"”]+)[」』"”](?:と(?:言って(?:みて|ごらん)?|リピートして|読ん(?:でみて)?))/u) ||
    clean.match(/(?:(?:もう一度|もう一回|リピートして|言ってみて|言ってごらん)[:：\s]*(?:[「『"“])([^」』"”]+)[」』"”])/u);
  const echoMatchZh =
    clean.match(/(?:[“"「『])([^”"」』]+)[”"」』](?:跟我读|重复一遍|读一遍)/u) ||
    clean.match(/(?:(?:跟我读|再说一遍|重复一遍|读一遍)[:：\s]*(?:[“"「『])([^”"」』]+)[”"」』])/u);
  const echoTarget = (echoMatchEn?.[1] || echoMatchJa?.[1] || echoMatchZh?.[1])?.trim();
  if (echoTarget) {
    return { fullText: clean, focalText: echoTarget, isEchoRedemption: true };
  }

  const isCjk = targetLang === 'ja' || targetLang === 'zh';
  const splitRe = isCjk ? /([。！？!?\n]+)/ : /([.?!;\n]+)/;
  const rawParts = clean.split(splitRe).map((p) => p.trim()).filter(Boolean);
  const sentences = [];
  for (let i = 0; i < rawParts.length; i += 2) {
    const s = rawParts[i] + (rawParts[i + 1] || '');
    if (s.trim()) sentences.push(s.trim());
  }

  if (sentences.length <= 1) {
    return { fullText: clean, focalText: clean, isEchoRedemption: false };
  }

  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    if (
      /[?？]/.test(s) ||
      /\b(why don't|shall we|let's|what about|how about|would you like|do you want|can we)\b/i.test(s) ||
      /(?:ませんか|ない[？?]|ましょう|どうですか|いかがですか)/u.test(s) ||
      /(?:要不要|好吗|怎么样|吧[？?]?)/u.test(s)
    ) {
      return { fullText: clean, focalText: s, isEchoRedemption: false };
    }
  }

  return { fullText: clean, focalText: sentences[sentences.length - 1] || clean, isEchoRedemption: false };
}

async function invokeLocalGeminiSingle({ key, model, promptText, temperature, maxOutputTokens = 750, parentSignal }) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) return { ok: false, reason: 'aborted' };
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), 9500);
  try {
    const thinkingConfig = model.startsWith('gemini-3')
      ? { thinkingLevel: 'MINIMAL' }
      : { thinkingBudget: 0 };
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

function loadCjkMasterBank() {
  if (global.__fiezelCjkMaster) return global.__fiezelCjkMaster;
  const masterPath = path.join(ROOT, 'data', 'cjk-strokes-master.json');
  const pubPath = path.join(ROOT, 'features', 'voice-studio', 'public', 'assets', 'kanji-vg-strokes.json');
  const bank = { ja: {}, zh: {} };
  try {
    if (fs.existsSync(masterPath)) {
      const parsed = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        if (parsed.ja && typeof parsed.ja === 'object') bank.ja = parsed.ja;
        if (parsed.zh && typeof parsed.zh === 'object') bank.zh = parsed.zh;
      }
    } else if (fs.existsSync(pubPath)) {
      bank.ja = JSON.parse(fs.readFileSync(pubPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[FIEZEL Server] Failed loading CJK master bank:', e?.message || e);
  }
  global.__fiezelCjkMaster = bank;
  return bank;
}

function normalizeMasterEntry(ch, lang, rawArr, sourceName) {
  if (!Array.isArray(rawArr) || rawArr.length === 0) return null;
  const strokes = rawArr
    .map((item, idx) => {
      if (typeof item === 'string') {
        return { order: idx + 1, d: item, type: '', numPos: null, verifiedAuthority: true };
      }
      if (Array.isArray(item) && typeof item[0] === 'string') {
        const hasPos = typeof item[2] === 'number' && typeof item[3] === 'number';
        return {
          order: idx + 1,
          d: item[0],
          type: typeof item[1] === 'string' ? item[1] : '',
          numPos: hasPos ? [item[2], item[3]] : null,
          verifiedAuthority: true,
        };
      }
      return null;
    })
    .filter(Boolean);
  if (strokes.length === 0) return null;
  return {
    ok: true,
    char: ch,
    lang,
    strokeCount: strokes.length,
    strokes,
    paths: strokes.map((s) => s.d),
    rawEntries: rawArr,
    source: sourceName,
  };
}

function lookupAuthoritativeCjkStrokes(ch, lang = 'ja') {
  const cleanChar = (String(ch || '').trim().match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/) || [])[0];
  if (!cleanChar) return null;
  const bank = loadCjkMasterBank();
  const normLang = String(lang || 'ja').toLowerCase().startsWith('zh') ? 'zh' : 'ja';
  if (normLang === 'zh') {
    if (Array.isArray(bank.zh?.[cleanChar]) && bank.zh[cleanChar].length > 0) {
      return normalizeMasterEntry(cleanChar, 'zh', bank.zh[cleanChar], 'local-makemeahanzi-bank');
    }
    if (Array.isArray(bank.ja?.[cleanChar]) && bank.ja[cleanChar].length > 0) {
      return normalizeMasterEntry(cleanChar, 'zh', bank.ja[cleanChar], 'local-kanjivg-fallback');
    }
  } else {
    if (Array.isArray(bank.ja?.[cleanChar]) && bank.ja[cleanChar].length > 0) {
      return normalizeMasterEntry(cleanChar, 'ja', bank.ja[cleanChar], 'local-kanjivg-bank');
    }
    if (Array.isArray(bank.zh?.[cleanChar]) && bank.zh[cleanChar].length > 0) {
      return normalizeMasterEntry(cleanChar, 'ja', bank.zh[cleanChar], 'local-makemeahanzi-fallback');
    }
  }
  return null;
}

globalThis.__fiezelLookupCjkStrokes = lookupAuthoritativeCjkStrokes;
loadCjkMasterBank();

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
    return sendJson(res, 200, {
      status: 'healthy',
      service: 'fiezel-pwa-server',
      geminiKeysCount: geminiKeys.length,
      whiteboardRealtime: true,
      timestamp: Date.now()
    });
  }
  if (pathname === '/api/version') {
    return sendJson(res, 200, { status: 'ok', build: 'local-dev', timestamp: Date.now() });
  }
  if (pathname === '/api/auth/session') {
    return sendJson(res, 200, { ok: true, signedIn: true, user: { role: 'murid', handle: 'penguji_lokal', email: 'penguji@localhost' } });
  }
  if (pathname === '/api/auth/anon' && req.method === 'POST') {
    return sendJson(res, 200, {
      ok: true,
      userId: 'local-visitor',
      plan: 'free',
      class: 'visitor',
      issued: false,
      serverTime: new Date().toISOString()
    });
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

  // Delegate all Voice Live / Whiteboard / Partner-Turn / Copilot / Gemini-TTS / Translate routes
  // directly to workers/api/voice/route-voice-live.js with the full local multi-key Gemini pool.
  const workerPathname = pathname === '/api/voice-call/assist' ? '/api/voice/copilot-assist' : pathname;
  if (req.method === 'POST' && workerPathname.startsWith('/api/voice/')) {
    try {
      const voiceMod = await loadVoiceWorkerModule();
      const directHandlerMap = {
        '/api/voice/live-session': voiceMod.routeVoiceLiveSession,
        '/api/voice/report-drop': voiceMod.routeVoiceReportDrop,
        '/api/voice/copilot-assist': voiceMod.routeVoiceCopilotAssist,
        '/api/voice/partner-turn': voiceMod.routeVoicePartnerTurn,
        '/api/voice/whiteboard-stream': voiceMod.routeVoiceWhiteboardStream,
        '/api/voice/translate': voiceMod.routeVoiceTranslate,
        '/api/voice/gemini-tts': voiceMod.routeVoiceGeminiTts,
        '/api/voice/verify-speech': voiceMod.routeVoiceVerifySpeech,
        '/api/voice/sync-keys': voiceMod.routeVoiceSyncKeys
      };
      const handlerFn = directHandlerMap[workerPathname];
      if (typeof handlerFn === 'function') {
        const rawBodyBuf = await parseRawBody(req);
        const bodyText = rawBodyBuf.toString('utf8');
        if (workerPathname === '/api/voice/sync-keys') {
          try {
            const parsedSync = bodyText ? JSON.parse(bodyText) : {};
            const rawKeys = Array.isArray(parsedSync?.keys)
              ? parsedSync.keys
              : typeof parsedSync?.keys === 'string'
                ? parsedSync.keys.split(',')
                : [];
            const valid = rawKeys
              .map((k) => String(k || '').trim())
              .filter((k) => k.length > 10 && (k.startsWith('AIza') || k.startsWith('AQ.')));
            if (valid.length > 0) {
              geminiKeys = Array.from(new Set(valid));
              try {
                fs.mkdirSync(path.dirname(KEYS_FILE), { recursive: true });
                fs.writeFileSync(KEYS_FILE, JSON.stringify(geminiKeys, null, 2), 'utf8');
              } catch (_) {}
            }
          } catch (_) {}
        }

        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
        }
        if (!headers.has('x-forwarded-for')) {
          headers.set('x-forwarded-for', String(req.socket?.remoteAddress || '127.0.0.1'));
        }
        const host = req.headers.host || `127.0.0.1:${PORT}`;
        const webReq = new Request(`http://${host}${workerPathname}${parsedUrl.search || ''}`, {
          method: req.method,
          headers,
          body: rawBodyBuf.length ? rawBodyBuf : '{}'
        });
        const keyCsv = geminiKeys.join(',');
        const workerRes = await handlerFn({
          request: webReq,
          identity: { verified: true, sub: 'local-dev-user' },
          env: {
            GEMINI_LIVE_KEYS: keyCsv,
            GEMINI_API_KEY: keyCsv,
            ALLOWED_ORIGINS: '*'
          },
          bodyText,
          byteLimit: 1048576,
          corsHeaders: { 'access-control-allow-origin': '*' }
        });

        const contentType = workerRes.headers.get('content-type') || 'application/json; charset=utf-8';
        if (contentType.includes('text/event-stream') && workerRes.body) {
          res.writeHead(workerRes.status || 200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
          });
          if (typeof res.flushHeaders === 'function') res.flushHeaders();
          const reader = workerRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value && value.byteLength) res.write(Buffer.from(value));
          }
          return res.end();
        }

        const outHeaders = {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
          ...(workerRes.headers.get('x-fiezel-cache') ? { 'X-Fiezel-Cache': workerRes.headers.get('x-fiezel-cache') } : {}),
        };
        const outBuf = Buffer.from(await workerRes.arrayBuffer());
        res.writeHead(workerRes.status || 200, outHeaders);
        return res.end(outBuf);
      }
    } catch (err) {
      return sendJson(res, 502, {
        ok: false,
        fallback: true,
        error: 'local_voice_worker_error',
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }

  if (req.method === 'GET' && pathname === '/api/kanji/strokes') {
    const rawChar = (parsedUrl.searchParams.get('char') || '').trim();
    const langParam = (parsedUrl.searchParams.get('lang') || 'ja').trim();
    const ch = (rawChar.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/) || [])[0];
    if (!ch) {
      return sendJson(res, 400, { ok: false, error: 'missing_cjk_char' });
    }
    try {
      const localHit = lookupAuthoritativeCjkStrokes(ch, langParam);
      if (localHit) {
        return sendJson(res, 200, localHit);
      }
      const hex = ch.codePointAt(0).toString(16).padStart(5, '0');
      const urls = [
        `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`,
        `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`
      ];
      for (const u of urls) {
        try {
          const kvRes = await fetch(u, { signal: AbortSignal.timeout(5500) });
          if (!kvRes.ok) continue;
          const svg = await kvRes.text();
          const pathEnd = svg.indexOf('StrokeNumbers');
          const strokeXml = pathEnd > 0 ? svg.slice(0, pathEnd) : svg;
          const numXml = pathEnd > 0 ? svg.slice(pathEnd) : '';
          const rawNumbers = {};
          const nRe = /<text[^>]*transform="matrix\(\s*1\s+0\s+0\s+1\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)"[^>]*>\s*(\d+)\s*<\/text>/g;
          let nm;
          while ((nm = nRe.exec(numXml)) !== null) {
            const idx = Number(nm[3]) - 1;
            if (idx >= 0) {
              rawNumbers[idx] = [
                Math.round((Number(nm[1]) + 2.2) * 10) / 10,
                Math.round((Number(nm[2]) - 3.0) * 10) / 10
              ];
            }
          }
          const entries = [];
          const re = /<path\b([^>]+)\/?>/g;
          let m;
          let sIdx = 0;
          while ((m = re.exec(strokeXml)) !== null) {
            const dMatch = m[1].match(/\bd="([^"]+)"/);
            if (!dMatch) continue;
            const tMatch = m[1].match(/kvg:type="([^"]+)"/);
            const dStr = dMatch[1].replace(/\s+/g, ' ').trim();
            const tStr = tMatch ? tMatch[1].trim() : '';
            const nPos = rawNumbers[sIdx];
            entries.push(nPos ? [dStr, tStr, nPos[0], nPos[1]] : [dStr, tStr]);
            sIdx++;
          }
          if (entries.length > 0) {
            loadCjkMasterBank().ja[ch] = entries;
            return sendJson(res, 200, normalizeMasterEntry(ch, 'ja', entries, 'remote-kanjivg'));
          }
        } catch (_) {}
      }
      return sendJson(res, 404, { ok: false, char: ch, error: 'kanjivg_not_found', paths: [], strokes: [] });
    } catch (err) {
      return sendJson(res, 500, { ok: false, char: ch, error: err instanceof Error ? err.message : String(err), paths: [], strokes: [] });
    }
  }

  if (pathname === '/api/braincore/sync' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const items = Array.isArray(body.attempts)
      ? body.attempts
      : Array.isArray(body.entries)
        ? body.entries
        : [];
    const devStore = globalThis.__fiezelDevBrainAttempts || (globalThis.__fiezelDevBrainAttempts = new Map());
    const acceptedIds = [];
    for (const item of items.slice(0, 100)) {
      const rawId = item && (item.id || item.attemptId);
      if (typeof rawId !== 'string' || !rawId.trim()) continue;
      const attemptId = rawId.trim().slice(0, 80);
      devStore.set(attemptId, {
        attemptId,
        at: Number(item.timestamp ?? item.at) || Date.now(),
        ok: typeof item.verdict === 'boolean' ? item.verdict : Boolean(item.ok),
        type: 'speaking',
        skill: String(item.competencyId || item.skill || 'kaiwa_general').slice(0, 80),
        misconception: item.misconceptionId ? String(item.misconceptionId).slice(0, 80) : undefined
      });
      acceptedIds.push(attemptId);
    }
    return sendJson(res, 200, {
      ok: true,
      persisted: true,
      acceptedIds,
      syncedCount: acceptedIds.length,
      storedCount: acceptedIds.length,
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
