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

// Gemini TTS with multi-key pool rotation
const KEYS_FILE = path.join(ROOT, 'config', 'gemini-keys.json');
let geminiKeys = [];
try {
  geminiKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
} catch (_) {
  if (process.env.GEMINI_API_KEY) geminiKeys = [process.env.GEMINI_API_KEY];
}
let currentKeyIndex = 0;

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
      const tempId = crypto.randomUUID();
      const tempPcm = path.join(CACHE_DIR, `temp_${tempId}.pcm`);
      const tempMp3 = path.join(CACHE_DIR, `temp_${tempId}.mp3`);
      fs.writeFileSync(tempPcm, pcmBuffer);

      const cp = require('child_process');
      const cmd = `ffmpeg -f s16le -ar 24000 -ac 1 -i "${tempPcm}" -q:a 9 -acodec libmp3lame "${tempMp3}" -y`;
      cp.execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 });
      try { fs.unlinkSync(tempPcm); } catch (_) {}

      if (fs.existsSync(tempMp3)) {
        const mp3Buffer = fs.readFileSync(tempMp3);
        try { fs.unlinkSync(tempMp3); } catch (_) {}
        currentKeyIndex = (currentKeyIndex + attempt) % geminiKeys.length;
        return {
          audioBase64: mp3Buffer.toString('base64'),
          mimeType: 'audio/mpeg',
          voiceName: persona.edgeVoice.replace(/^[a-z]{2}-[A-Z]{2}-/, ''),
          personaLabel: persona.personaLabel,
          engine: 'gemini-tts-24khz'
        };
      }
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
        let res = await tryMsEdgeTts(text, persona);
        if (res) return res;

        res = await tryGeminiTts(text, persona);
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

  if (pathname === '/api/voice-call/assist' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const targetLang = body.targetLang === 'en' ? 'en' : 'ja';
    const turnCount = Number(body.turnCount || 0);
    const suggestions =
      targetLang === 'ja'
        ? [
            {
              id: `assist_ja_${turnCount}_1`,
              levelLabel: 'Mudah & Sopan',
              text: 'はい、ホットコーヒーを一つお願いします。',
              phonetic: 'Hai, hotto kōhī o hitotsu onegaishimasu.',
              translationId: 'Ya, tolong satu kopi panas.',
              translationTh: 'ครับ/ค่ะ ขอชาหรือกาแฟร้อนหนึ่งแก้วครับ/ค่ะ',
              tipId: 'Gunakan を (o) + お願いします (onegaishimasu) untuk memesan dengan sopan.',
              tipTh: 'ใช้ を + お願いします เพื่อสั่งอย่างสุภาพ'
            },
            {
              id: `assist_ja_${turnCount}_2`,
              levelLabel: 'Natural & Lengkap',
              text: '店内で飲みます。チーズケーキも一つください。',
              phonetic: 'Tennai de nomimasu. Chīzukēki mo hitotsu kudasai.',
              translationId: 'Minum di sini. Tolong sekalian satu cheesecake.',
              translationTh: 'ดื่มที่ร้านครับ/ค่ะ ขอชีสเค้กอีกหนึ่งชิ้นด้วยครับ/ค่ะ',
              tipId: 'Gunakan で (de) untuk lokasi aktivitas dan も (mo) untuk tambahan pesanan.',
              tipTh: 'ใช้ で สำหรับสถานที่ทำกิจกรรม และ も สำหรับสั่งเพิ่ม'
            },
            {
              id: `assist_ja_${turnCount}_3`,
              levelLabel: 'Tanya Balik Natural',
              text: 'おすすめのメニューは何ですか？カードで払えますか？',
              phonetic: 'Osusume no menyū wa nan desu ka? Kādo de haraemasu ka?',
              translationId: 'Menu rekomendasinya apa? Apakah bisa bayar pakai kartu?',
              translationTh: 'เมนูแนะนำคืออะไรครับ/ค่ะ? จ่ายด้วยบัตรได้ไหม?',
              tipId: 'Gunakan は何ですか untuk bertanya rekomendasi dengan sopan.',
              tipTh: 'ใช้ は何ですか เพื่อถามเมนูแนะนำอย่างสุภาพ'
            }
          ]
        : [
            {
              id: `assist_en_${turnCount}_1`,
              levelLabel: 'Polite & Clear',
              text: 'Last weekend I went to a cozy cafe and met my old friends.',
              phonetic: 'laast week-end ai went tu a koh-zee ka-fey and met mai old frendz',
              translationId: 'Akhir pekan lalu saya pergi ke kafe yang nyaman dan bertemu teman lama.',
              translationTh: 'สุดสัปดาห์ที่แล้วฉันไปคาเฟ่สบายๆ และพบเพื่อนเก่า',
              tipId: 'Gunakan Past Simple tidak beraturan: went (bukan goed) dan met.',
              tipTh: 'ใช้ Past Simple กริยาไม่ปกติ: went และ met'
            },
            {
              id: `assist_en_${turnCount}_2`,
              levelLabel: 'Natural Detail',
              text: 'We drank iced lattes and talked about our upcoming project for two hours.',
              phonetic: 'wee drangk aist laa-teyz and tawkt a-bawt aw-er up-kuh-ming pro-jekt',
              translationId: 'Kami minum es latte dan mengobrol tentang proyek mendatang selama dua jam.',
              translationTh: 'เราดื่มลาเต้เย็นและคุยเรื่องโปรเจกต์ที่กำลังจะมาถึงสองชั่วโมง',
              tipId: 'Pastikan kedua kata kerja yang dihubungkan "and" sama-sama memakai bentuk lampau.',
              tipTh: 'ตรวจสอบให้แน่ใจว่ากริยาทั้งสองตัวที่เชื่อมด้วย and เป็นรูปอดีต'
            },
            {
              id: `assist_en_${turnCount}_3`,
              levelLabel: 'Engage Partner',
              text: 'It was really refreshing! How about you, what did you do last weekend?',
              phonetic: 'it woz ree-lee ri-fresh-ing! haw a-bawt yoo, wot did yoo doo laast week-end?',
              translationId: 'Sangat menyegarkan! Bagaimana denganmu, apa yang kamu lakukan akhir pekan lalu?',
              translationTh: 'สดชื่นมากเลย! แล้วคุณล่ะ สุดสัปดาห์ที่แล้วทำอะไรบ้าง?',
              tipId: 'Tutup cerita dengan pertanyaan balik agar percakapan dua arah tetap hidup.',
              tipTh: 'ปิดท้ายเรื่องเล่าด้วยคำถามกลับเพื่อให้บทสนทนาไหลลื่น'
            }
          ];
    return sendJson(res, 200, {
      ok: true,
      suggestions,
      serverTime: Date.now()
    });
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
      'Cache-Control': ext === '.json' || ext === '.js' ? 'no-cache' : 'public, max-age=300'
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
