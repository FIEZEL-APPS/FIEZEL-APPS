/**
 * workers/api/voice/route-voice-live.js, SLOT 14: Gemini Live Token & Multi-Key Pool Rotator.
 *
 * ==========================================================================
 * DESAIN ROTASI 16 KUNCI & FAILOVER OTOMATIS
 * ==========================================================================
 * 1. Seluruh API key disimpan terpusat di Worker secret `GEMINI_LIVE_KEYS` (koma-terpisah).
 *    Kunci asli TIDAK PERNAH dikirim ke peramban murid.
 * 2. Klien hanya menerima token sementara (ephemeral token) berumur pendek dari
 *    `https://generativelanguage.googleapis.com/v1alpha/auth_tokens`.
 * 3. Worker memelihara status kesehatan kunci (Map in-memory):
 *    - Bila kunci ke-i terkena limit kuota/rate-limit (HTTP 429 atau WebSocket close 1011),
 *      kunci tersebut otomatis masuk masa pendinginan (cooldown 65 detik).
 *    - Worker seketika melompat ke kunci berikutnya (i+1) dalam satu tarikan permintaan.
 *    - Begitu masa pendinginan usai, kunci otomatis kembali aktif di dalam antrean.
 * 4. Bila seluruh kunci sibuk, sistem mengembalikan `{ ok: false, fallback: true }`
 *    sehingga peramban murid langsung jatuh ke jalur cadangan (Turn-by-Turn Nanami) tanpa error.
 */

import { jsonResponse as rawJsonResponse, badRequest, unauthenticated } from '../errors.js';
import { readJsonFromCtx } from '../mw-guard.js';
import { aiSpendGate } from '../route-wiring.js';
import { checkAiEnabled } from '../feature-gate.js';
import { ensureLegacySchema } from '../legacy-schema.js';
import { projectBrainAttempt } from '../route-legacy.js';

/**
 * FIEZEL copy invariant (owner mandate): no em-dash / en-dash in any learner-facing
 * text. Gemini sometimes writes them anyway, so every JSON payload leaving this
 * module is scrubbed recursively. CJK neighbours get an ideographic comma, ranges
 * like "A1–C2" become "A1-C2", everything else becomes ", ".
 */
const DASH_CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/;
export function stripFiezelDashes(text) {
  if (typeof text !== 'string' || !/[\u2014\u2013]/.test(text)) return text;
  return text
    .replace(/(\S)\s*[\u2014\u2013]+\s*(\S)/g, (m, a, b) => {
      if (DASH_CJK_RE.test(a) || DASH_CJK_RE.test(b)) return `${a}、${b}`;
      if (/[A-Za-z0-9]/.test(a) && /[A-Za-z0-9]/.test(b) && !/\s/.test(m)) return `${a}-${b}`;
      return `${a}, ${b}`;
    })
    .replace(/\s*[\u2014\u2013]+\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|\s*,$/g, '');
}
function redactOwnerSecrets(str) {
  if (typeof str !== 'string' || !str) return str;
  return str
    .replace(/AIza[0-9A-Za-z_-]{12,}/g, '[REDACTED]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED]');
}
function stripDashesDeep(value, depth = 0) {
  if (depth > 8) return value;
  if (typeof value === 'string') return stripFiezelDashes(redactOwnerSecrets(value));
  if (Array.isArray(value)) return value.map((v) => stripDashesDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripDashesDeep(v, depth + 1);
    return out;
  }
  return value;
}
function jsonResponse(body, init) {
  return rawJsonResponse(stripDashesDeep(body), init);
}

const GOOGLE_AUTH_TOKEN_API = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';
const GOOGLE_INTERACTIONS_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
const COPILOT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
];
const EXPLANATION_MODELS = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
];
const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
];
const DEFAULT_CONSTRAINED_ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

// Map in-memory untuk status cooldown kunci per worker instance (Live Session)
const _cooldownMap = new Map(); // key -> timestamp ms
let _poolIndex = Math.floor(Math.random() * 16);

// Terisolasi: status cooldown per (key::model) dan rotasi pool khusus Copilot & TTS
const _copilotCooldownMap = new Map(); // `${key}::${model}` -> timestamp ms
const _ttsCooldownMap = new Map(); // `${key}::${model}` -> timestamp ms
let _copilotPoolIndex = Math.floor(Math.random() * 16);
let _livePoolCursor = Math.floor(Math.random() * 16);
const _verifiedHealthyKeys = new Set();
const _quotaDeadUntilMap = new Map();
const _quotaDeadKeys = {
  add(k, ttlMs = 600000) {
    if (k) _quotaDeadUntilMap.set(k, Date.now() + ttlMs);
  },
  has(k) {
    const exp = _quotaDeadUntilMap.get(k);
    if (!exp) return false;
    if (Date.now() >= exp) {
      _quotaDeadUntilMap.delete(k);
      return false;
    }
    return true;
  },
  delete(k) {
    _quotaDeadUntilMap.delete(k);
  },
};

// Zero-KV-write worker cache (Cloudflare edge caches.default + bounded isolate Map fallback)
const _ttsMemoryCache = new Map();
const _boardMemoryCache = new Map();
const CACHE_INTERNAL_ORIGIN = 'https://cache.fiezel.internal/voice/v2';

async function sha256Hex(inputStr) {
  const bytes = new TextEncoder().encode(String(inputStr || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function setBoundedMapCache(map, key, value, maxEntries) {
  if (map.has(key)) map.delete(key);
  while (map.size >= maxEntries) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
  map.set(key, value);
}

function getEdgeDefaultCache() {
  try {
    return typeof caches !== 'undefined' && caches && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

async function readWorkerCache(namespace, hashKey, memoryMap, maxEntries) {
  const memHit = memoryMap.get(hashKey);
  if (memHit) {
    if (memHit.expiresAt > Date.now()) {
      setBoundedMapCache(memoryMap, hashKey, memHit, maxEntries);
      return { payload: memHit.payload, cacheLayer: 'memory' };
    }
    memoryMap.delete(hashKey);
  }
  const edgeCache = getEdgeDefaultCache();
  if (!edgeCache) return null;
  try {
    const req = new Request(`${CACHE_INTERNAL_ORIGIN}/${namespace}/${hashKey}`, { method: 'GET' });
    const res = await edgeCache.match(req);
    if (!res || !res.ok) return null;
    const parsed = await res.json().catch(() => null);
    if (!parsed || typeof parsed !== 'object') return null;
    setBoundedMapCache(memoryMap, hashKey, { payload: parsed, expiresAt: Date.now() + 900000 }, maxEntries);
    return { payload: parsed, cacheLayer: 'edge' };
  } catch {
    return null;
  }
}

async function writeWorkerCache(ctx, namespace, hashKey, payloadObj, memoryMap, maxEntries, ttlSec) {
  const cleanPayload = stripDashesDeep(payloadObj);
  setBoundedMapCache(
    memoryMap,
    hashKey,
    { payload: cleanPayload, expiresAt: Date.now() + ttlSec * 1000 },
    maxEntries
  );
  const edgeCache = getEdgeDefaultCache();
  if (!edgeCache) return;
  try {
    const req = new Request(`${CACHE_INTERNAL_ORIGIN}/${namespace}/${hashKey}`, { method: 'GET' });
    const res = new Response(JSON.stringify(cleanPayload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${ttlSec}, s-maxage=${ttlSec}`,
      },
    });
    const putPromise = edgeCache.put(req, res).catch(() => {});
    if (ctx?.executionCtx && typeof ctx.executionCtx.waitUntil === 'function') {
      ctx.executionCtx.waitUntil(putPromise);
    } else {
      await putPromise;
    }
  } catch {}
}

const VALID_TERM_FALLBACKS = (topicTitle, tblRows) => {
  const parts = String(topicTitle || '')
    .split(/\s+(?:vs\.?|versus|dan|atau|and|or)\s+|[:/]/i)
    .map((p) => cleanSpokenText(p).replace(/^(?:perbedaan|bedanya|antara|cara|menggunakan|pakai)\s+/i, '').trim())
    .filter((p) => p && !/^(?:pola\s+(?:pertama|kedua)|sisi\s+[ab]|konsep\s*[12])$/i.test(p));
  const rowA = cleanSpokenText(tblRows?.[0]?.[0] || '');
  const rowB = cleanSpokenText(tblRows?.[1]?.[0] || '');
  const pickA = (rowA && !/^(?:pola\s+pertama|sisi\s+a)$/i.test(rowA) ? rowA : '') || parts[0] || 'Bentuk Utama';
  const pickB = (rowB && !/^(?:pola\s+kedua|sisi\s+b)$/i.test(rowB) && rowB.toLowerCase() !== pickA.toLowerCase() ? rowB : '') || parts[1] || 'Bentuk Pembanding';
  return [pickA.slice(0, 48), pickB.slice(0, 48)];
};

// Rate limit in-memory per IP untuk mencegah pengurasan kuota Gemini Live & Copilot
const _ipLiveCallMap = new Map();
function checkLiveRateLimit(ip, limit = 120, windowMs = 60000) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  const now = Date.now();
  const entry = _ipLiveCallMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    _ipLiveCallMap.set(ip, entry);
    return true;
  }
  entry.count++;
  _ipLiveCallMap.set(ip, entry);
  return entry.count <= Math.max(limit, 120);
}

export function parseKeys(env) {
  const raw = String(env?.GEMINI_LIVE_KEYS || env?.GEMINI_API_KEY || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 10);
}

/**
 * Menyelesaikan kolam kunci API Gemini:
 * 1. Cek kolam dinamis dari Cloudflare KV (CFG) key `cfg:gemini_live_keys` (disinkronkan dari Sentinel)
 * 2. Fallback mulus ke secret env statis `GEMINI_LIVE_KEYS`
 */
export async function resolvePoolKeys(ctx) {
  if (ctx?.env?.CFG && typeof ctx.env.CFG.get === 'function') {
    try {
      const kvRaw = await ctx.env.CFG.get('cfg:gemini_live_keys', { cacheTtl: 30 });
      if (kvRaw && typeof kvRaw === 'string' && kvRaw.trim().length > 10) {
        const parsed = kvRaw.split(',').map((s) => s.trim()).filter((s) => s.length > 10);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
  }
  return parseKeys(ctx?.env);
}

/**
 * Mencoba mencetak ephemeral auth token menggunakan kunci Google AI Studio.
 */
async function mintEphemeralToken(apiKey) {
  const now = Date.now();
  const expireAt = now + 30 * 60e3;
  const newSessionExpireAt = now + 2 * 60e3;
  const body = {
    uses: 1,
    expireTime: new Date(expireAt).toISOString(),
    newSessionExpireTime: new Date(newSessionExpireAt).toISOString(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(GOOGLE_AUTH_TOKEN_API, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const json = await res.json().catch(() => ({}));
    if (res.ok && json && typeof json.name === 'string' && json.name.startsWith('auth_tokens/')) {
      return { ok: true, token: json.name, expireAt, newSessionExpireAt };
    }

    const isQuota = res.status === 429 || JSON.stringify(json).toLowerCase().includes('quota');
    return {
      ok: false,
      status: res.status,
      isQuota,
      reason: json?.error?.message || `HTTP ${res.status}`,
    };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, isQuota: false, reason: err?.message || 'Network error' };
  }
}

/**
 * Handler POST /api/voice/live-session
 */
export async function routeVoiceLiveSession(ctx) {
  const clientIp = (ctx.request && (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) || '';
  if (!checkLiveRateLimit(clientIp, 30, 60000)) {
    return jsonResponse(
      {
        ok: false,
        error: 'rate_limited',
        fallback: true,
        message: 'Rate limit exceeded. Please wait 1 minute before requesting another voice token.',
      },
      { status: 429 }
    );
  }

  const keys = await resolvePoolKeys(ctx);
  if (!keys.length) {
    return jsonResponse(
      {
        ok: false,
        error: 'service_unavailable',
        fallback: true,
        message: 'Layanan suara langsung sedang tidak tersedia sementara.',
      },
      { status: 503 }
    );
  }

  const now = Date.now();
  const totalKeys = keys.length;
  let attempts = 0;

  // Round-robin failover loop
  while (attempts < totalKeys) {
    const currentIdx = (_poolIndex + attempts) % totalKeys;
    const key = keys[currentIdx];
    const cooldownUntil = _cooldownMap.get(key) || 0;

    if (now < cooldownUntil) {
      attempts++;
      continue;
    }

    const result = await mintEphemeralToken(key);
    if (result.ok) {
      _poolIndex = (currentIdx + 1) % totalKeys;
      _cooldownMap.delete(key);
      return jsonResponse(
        {
          ok: true,
          token: result.token,
          model: DEFAULT_LIVE_MODEL,
          endpoint: DEFAULT_CONSTRAINED_ENDPOINT,
          keyIndex: currentIdx + 1,
          totalKeys,
          expireAt: result.expireAt,
          newSessionExpireAt: result.newSessionExpireAt,
          serverNow: Date.now(),
        },
        { headers: { 'cache-control': 'no-store' } }
      );
    }

    if (result.isQuota) {
      // Cooldown 65 detik jika menyentuh limit kuota/rate-limit
      _cooldownMap.set(key, now + 65000);
    } else {
      // Error sementara lainnya, cooldown 15 detik
      _cooldownMap.set(key, now + 15000);
    }

    attempts++;
  }

  // Jika seluruh kunci dalam cooldown (jangan bocorkan raw upstream Google error ke klien)
  return jsonResponse(
    {
      ok: false,
      error: 'all_keys_busy',
      fallback: true,
      message: 'Seluruh kapasitas jalur suara langsung sedang penuh. Mengalihkan ke jalur cadangan.',
    },
    { status: 503 }
  );
}

/**
 * Handler POST /api/voice/report-drop
 */
export async function routeVoiceReportDrop(ctx) {
  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const closeCode = Number(body?.code || 0);
  // Ignore normal closures (1000/1005) and client payload schema errors (1007) so valid API keys are never poisoned
  if (closeCode === 1000 || closeCode === 1005 || closeCode === 1007) {
  return jsonResponse({ ok: true, shifted: false, ignoredClientClose: true });
  }
  const reason = String(body?.reason || '').toLowerCase();
  const isQuota =
    closeCode === 1011 ||
    reason.includes('quota') ||
    reason.includes('limit') ||
    reason.includes('exhausted');
  const keys = await resolvePoolKeys(ctx);

  if (keys.length > 0) {
    if (typeof body?.keyIndex === 'number' && body.keyIndex >= 1 && body.keyIndex <= keys.length) {
      const droppedKey = keys[body.keyIndex - 1];
      if (droppedKey) {
        // Cooldown 65 detik untuk kunci yang drop karena quota/1011
        _cooldownMap.set(droppedKey, Date.now() + (isQuota ? 65000 : 20000));
      }
    }
    // Majukan index pool ke kunci berikutnya
    _poolIndex = (_poolIndex + 1) % keys.length;
  }

  return jsonResponse({ ok: true, shifted: true, isQuota });
}

function cleanSpokenText(raw) {
  return String(raw || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Preserve math multiplication like "3.14 * 7 * 7" or "2 * π * r"; only strip roleplay stage emotes (*smiles*, *laughs*, *nods*)
    .replace(/\*\*(?!\s)([^*]{1,80}?)(?<!\s)\*\*/g, '$1')
    .replace(/\*(?:smiles?|laughs?|sighs?|nods?|winks?|chuckles?|giggles?|gasps?|coughs?|pauses?|clears\s+throat|inhales?|exhales?)\*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeTargetLang(text, targetLang, allowBilingualSsw = false) {
  const tx = cleanSpokenText(text);
  if (!tx || /[\u0E00-\u0E7F]/.test(tx)) return false;
  if (allowBilingualSsw) {
    return /[A-Za-z\u3040-\u30ff\u4e00-\u9faf]/.test(tx);
  }
  if (targetLang === 'ja') return /[\u3040-\u30ff\u4e00-\u9faf]/.test(tx);
  if (targetLang === 'zh') return /[\u4e00-\u9fff]/.test(tx) && !/[\u3040-\u30ff]/.test(tx);
  return /[A-Za-z]/.test(tx) && !/[\u3040-\u30ff\u4e00-\u9faf]/.test(tx);
}

/**
 * Precision Speech-Act & Focal-Clause Analyzer for Spoken Copilot.
 * Isolates the exact question or proposal from conversational filler / compliments
 * so the learner's spoken options directly answer what was asked.
 */
export function extractFocalClause(aiText, targetLang = 'en') {
  const clean = cleanSpokenText(aiText);
  if (!clean) {
    return { fullText: '', focalText: '', isEchoRedemption: false };
  }

  // 1. Echo Redemption detection
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
    return {
      fullText: clean,
      focalText: echoTarget,
      isEchoRedemption: true,
      echoCorrectionTarget: echoTarget,
    };
  }

  // 2. Sentence breakdown
  const isCjk = targetLang === 'ja' || targetLang === 'zh';
  const splitRe = isCjk ? /([。！？!?\n]+)/ : /([.?!;\n]+)/;
  const rawParts = clean.split(splitRe).map((p) => p.trim()).filter(Boolean);
  const sentences = [];
  const whLeadRe = isCjk
    ? /(?:何|なに|どこ|いつ|誰|どう|什么|哪里|哪儿|怎么|为什么)/u
    : /^(?:what|where|when|why|how|who)\b/i;
  const dashSplitRe = isCjk
    ? /\s*(?:——|—|–|-|:|：)\s*/
    : /(?:\s+[—–-]{1,2}\s+|(?<![\s])[—–](?![\s])|:\s+)/;
  const pushWithDashSplit = (seg) => {
    const trimmed = String(seg || '').trim();
    if (!trimmed) return;
    const subParts = trimmed.split(dashSplitRe).map((p) => p.trim()).filter(Boolean);
    if (subParts.length >= 2) {
      const tail = subParts[subParts.length - 1];
      if (whLeadRe.test(tail)) {
        const head = subParts.slice(0, -1).join(' ').trim();
        if (head) sentences.push(head);
        sentences.push(tail);
        return;
      }
    }
    sentences.push(trimmed);
  };
  for (let i = 0; i < rawParts.length; i++) {
    if (splitRe.test(rawParts[i])) {
      if (sentences.length > 0) sentences[sentences.length - 1] += rawParts[i];
    } else {
      pushWithDashSplit(rawParts[i]);
    }
  }

  if (sentences.length <= 1) {
    return { fullText: clean, focalText: clean, isEchoRedemption: false };
  }

  // Look backwards for the last sentence containing a question or proposal/invitation
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

function normalizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .slice(-6)
    .map((item) => ({
      speaker: item.speaker === 'user' ? 'Learner' : 'Partner AI',
      text: cleanSpokenText(item.text).slice(0, 260),
    }));
}

function normalizeCopilotReplies(
  rawReplies,
  targetLang,
  locale = 'id',
  fallbackTarget = '',
  isCambridge = false,
  cefrLevel = 'B1',
  allowBilingualSsw = false
) {
  const list = Array.isArray(rawReplies) ? rawReplies : [];

  if (isCambridge) {
    const lvl = String(cefrLevel || 'B1').toUpperCase();
    const badgeId = lvl === 'B1'
      ? '🎯 Jawaban B1 (PTE 42 / Band 5.5)'
      : lvl === 'B2'
      ? '🎯 Jawaban B2 (Band 6.5)'
      : lvl === 'A2'
      ? '🎯 Jawaban A2'
      : lvl === 'A1'
      ? '🎯 Jawaban A1'
      : `🎯 Jawaban Terbaik (${lvl})`;
    const badgeTh = lvl === 'B1'
      ? '🎯 คำตอบระดับ B1 (PTE 42)'
      : `🎯 คำตอบระดับ ${lvl}`;
    const tierLabelId = `Model Answer (${lvl})`;
    const tierLabelTh = `Model Answer (${lvl})`;

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;
      const text = cleanSpokenText(item.text || '');
      if (!looksLikeTargetLang(text, targetLang, allowBilingualSsw)) continue;
      let hint = cleanSpokenText(item.hint || (locale === 'th' ? item.hintTh : item.hintId) || item.translation || '').slice(0, 320);
      let pronunciation = cleanSpokenText(item.pronunciation || item.phonetic || '').slice(0, 320);
      return [
        {
          id: `cambridge_rt_${Date.now()}`,
          tier: 'cambridge_model',
          badgeId,
          badgeTh,
          tierLabelId,
          tierLabelTh,
          text,
          pronunciation,
          hintId: locale === 'th' ? cleanSpokenText(item.hintId || hint).slice(0, 320) : hint,
          hintTh: locale === 'th' ? hint : cleanSpokenText(item.hintTh || hint).slice(0, 320),
          hint,
          isRealtimeAi: true,
        },
      ];
    }
    return [];
  }

  const defaultBadges = [
    { tier: 'easy', badgeId: 'Singkat & Mudah', badgeTh: 'สั้นและง่าย' },
    { tier: 'mission', badgeId: 'Alami & Kontekstual', badgeTh: 'เป็นธรรมชาติ' },
    { tier: 'rescue', badgeId: 'Jawab + Tanya Balik', badgeTh: 'ตอบและถามกลับ' },
  ];

  const valid = [];
  for (let i = 0; i < list.length && valid.length < 3; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const text = cleanSpokenText(item.text || '');
    if (!looksLikeTargetLang(text, targetLang, allowBilingualSsw)) continue;
    const meta = defaultBadges[valid.length] || defaultBadges[0];
    let hint = cleanSpokenText(item.hint || (locale === 'th' ? item.hintTh : item.hintId) || item.translation || '').slice(0, 260);
    let pronunciation = cleanSpokenText(item.pronunciation || item.phonetic || '').slice(0, 260);

    // CRITICAL: Clean any leaked Hanzi/Kanji from pronunciation and non-CJK mother-tongue hints
    if (allowBilingualSsw) {
      pronunciation = pronunciation.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '').replace(/\s{2,}/g, ' ').trim();
      if (
        pronunciation &&
        pronunciation.toLowerCase().replace(/[^a-z0-9]/g, '') === text.toLowerCase().replace(/[^a-z0-9]/g, '')
      ) {
        pronunciation = '';
      }
    } else if (targetLang === 'ja') {
      pronunciation = pronunciation.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '').replace(/\s{2,}/g, ' ').trim();
      if (locale !== 'ja') {
        hint = hint.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, '').replace(/\s{2,}/g, ' ').trim();
      }
    } else if (targetLang === 'zh') {
      pronunciation = pronunciation.replace(/[\u3400-\u4dbf\u4e00-\u9fff]/g, '').replace(/\s{2,}/g, ' ').trim();
      if (locale !== 'zh') {
        hint = hint.replace(/[\u3400-\u4dbf\u4e00-\u9fff]+/g, '').replace(/\s{2,}/g, ' ').trim();
      }
    } else if (
      pronunciation &&
      pronunciation.toLowerCase().replace(/[^a-z0-9]/g, '') ===
        text.toLowerCase().replace(/[^a-z0-9]/g, '')
    ) {
      // Discard raw un-phoneticized English echoes so client deterministic phoneticizer synthesizes real Cara Baca
      pronunciation = '';
    }

    valid.push({
      id: `ai_rt_${Date.now()}_${valid.length}`,
      tier: item.tier === 'easy' || item.tier === 'mission' || item.tier === 'rescue' ? item.tier : meta.tier,
      badgeId: cleanSpokenText(item.badgeId || item.labelId || meta.badgeId).slice(0, 40) || meta.badgeId,
      badgeTh: cleanSpokenText(item.badgeTh || item.labelTh || meta.badgeTh).slice(0, 40) || meta.badgeTh,
      text,
      pronunciation,
      hintId: locale === 'th' ? cleanSpokenText(item.hintId || hint).slice(0, 260) : hint,
      hintTh: locale === 'th' ? hint : cleanSpokenText(item.hintTh || hint).slice(0, 260),
      hint,
      isRealtimeAi: true,
    });
  }

  if (valid.length < 3) {
    const cleanSample = looksLikeTargetLang(fallbackTarget, targetLang, allowBilingualSsw) ? cleanSpokenText(fallbackTarget) : '';
    const fallbackBank = allowBilingualSsw
      ? [
          {
            tier: 'easy',
            text: cleanSample || 'Siap Sensei, cek progres Tahap 1 sekarang.',
            pronunciation: '',
            hint: 'Buka progres SSW dan mulai materi dasar Hal. 1 sampai 6.',
          },
          {
            tier: 'mission',
            text: 'Coba tes saya dengan 1 soal CBT atau jebakan Wakai Papa.',
            pronunciation: '',
            hint: 'Minta SSW SENSEI menarik 1 soal resmi beserta pembahasan halaman PDF.',
          },
          {
            tier: 'rescue',
            text: 'Sensei, jelaskan angka emas dan kata jebakan di halaman ini.',
            pronunciation: '',
            hint: 'Minta rangkuman angka mutlak dan kata kunci Jepang untuk ujian.',
          },
        ]
      : targetLang === 'ja'
        ? [
            {
              tier: 'easy',
              text: cleanSample || 'なるほど、もう一度言ってみます！',
              pronunciation: 'naruhodo, mou ichido itte mimasu!',
              hint: locale === 'th' ? 'เข้าใจแล้ว เดี๋ยวลองพูดอีกครั้ง!' : 'Paham, aku coba ucapkan sekali lagi!',
            },
            {
              tier: 'mission',
              text: '助詞と文法の使い方がまだ少し難しいです。',
              pronunciation: 'joshi to bunpou no tsukaikata ga mada sukoshi muzukashii desu.',
              hint: locale === 'th' ? 'การใช้คำช่วยและไวยากรณ์ยังยากอยู่นิดหน่อย' : ' Penggunaan partikel dan tata bahasanya masih agak sulit.',
            },
            {
              tier: 'rescue',
              text: 'もっと自然な言い方を教えてくれませんか？',
              pronunciation: 'motto shizen na iikata wo oshiete kuremasen ka?',
              hint: locale === 'th' ? 'ช่วยสอนวิธีพูดที่เป็นธรรมชาติกว่านี้ได้ไหม?' : 'Bisa ajarkan cara bicara yang lebih natural?',
            },
          ]
        : targetLang === 'zh'
        ? [
            {
              tier: 'easy',
              text: cleanSample || '我现在看书，我再说一遍！',
              pronunciation: 'wǒ xiànzài kàn shū, wǒ zài shuō yī biàn!',
              hint: locale === 'th' ? 'ฉันอ่านหนังสือตอนนี้ เดี๋ยวฉันพูดอีกครั้ง!' : 'Saya sedang membaca buku sekarang, saya ulangi sekali lagi!',
            },
            {
              tier: 'mission',
              text: '中文的语序和声调对我来说还有点难。',
              pronunciation: 'zhōngwén de yǔxù hé shēngdiào duì wǒ lái shuō hái yǒudiǎn nán.',
              hint: locale === 'th' ? 'ลำดับคำและวรรณยุกต์ภาษาจีนยังยากสำหรับฉันนิดหน่อย' : 'Urutan kata dan nada bahasa Mandarin masih agak sulit buatku.',
            },
            {
              tier: 'rescue',
              text: '你可以给我出个练习题帮我记住吗？',
              pronunciation: 'nǐ kěyǐ gěi wǒ chū gè liànxítí bāng wǒ jìzhù ma?',
              hint: locale === 'th' ? 'ช่วยออกโจทย์ฝึกหัดให้ฉันจำแม่นขึ้นได้ไหม?' : 'Bisa kasih aku latihan langsung supaya makin ingat?',
            },
          ]
        : [
            {
              tier: 'easy',
              text: cleanSample || 'Got it, let me run that sentence back cleanly.',
              pronunciation: 'Got it, let mi ran det sen-tens bek klin-li.',
              hint: locale === 'th' ? 'เข้าใจแล้ว ขอพูดประโยคนั้นใหม่อีกทีแบบชัดๆ' : 'Paham, coba aku ulangi kalimat itu dengan benar.',
            },
            {
              tier: 'mission',
              text: 'Honestly, past tense and prepositions still trip me up sometimes.',
              pronunciation: 'O-nes-li, past tens end pre-po-zi-syens stil trip mi ap sam-taims.',
              hint: locale === 'th' ? 'บอกตามตรง เรื่องอดีตกาลและคำบุพบทยังทำให้ฉันสับสนอยู่บ้าง' : 'Jujur, past tense dan preposisi kadang masih bikin aku bingung.',
            },
            {
              tier: 'rescue',
              text: 'Can we do a quick written drill on this right now?',
              pronunciation: 'Ken wi du e kwik ri-ten dril on dis rait nau?',
              hint: locale === 'th' ? 'เราทำแบบฝึกหัดเขียนสั้นๆ เรื่องนี้ตอนนี้เลยได้ไหม?' : 'Bisa kita latihan tulis singkat soal ini sekarang?',
            },
          ];

    for (let i = valid.length; i < 3; i++) {
      const fb = fallbackBank[i] || fallbackBank[0];
      const meta = defaultBadges[i] || defaultBadges[0];
      valid.push({
        id: `ai_rt_fb_${Date.now()}_${i}`,
        tier: fb.tier,
        badgeId: meta.badgeId,
        badgeTh: meta.badgeTh,
        text: fb.text,
        pronunciation: fb.pronunciation,
        hintId: fb.hint,
        hintTh: fb.hint,
        hint: fb.hint,
        isRealtimeAi: false,
        isOfflineFallback: true,
      });
    }
  }

  return valid;
}

async function invokeSingleGeminiJson({
  key,
  model,
  promptText,
  temperature,
  maxOutputTokens = 2048,
  parentSignal,
}) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) {
      return { ok: false, reason: 'aborted' };
    }
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timeoutMs = maxOutputTokens > 1000 ? 12000 : 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const genCfg = {
      temperature: typeof temperature === 'number' ? temperature : 0.45,
      max_output_tokens: Math.min(Math.max(Number(maxOutputTokens) || 750, 128), 4096),
      thinking_level: 'minimal',
    };

    const genConfigPrimary = {
      response_mime_type: 'application/json',
      temperature: genCfg.temperature,
      max_output_tokens: genCfg.max_output_tokens,
    };
    if (String(model).startsWith('gemini-2.5')) {
      genConfigPrimary.thinkingConfig = { thinkingBudget: 0 };
    } else if (model === 'gemini-3.5-flash-lite' || model === 'gemini-3.5-flash') {
      genConfigPrimary.thinkingConfig = { thinkingLevel: 'minimal' };
    } else if (model === 'gemini-3-flash-preview' || model.startsWith('gemini-3.1-flash-lite')) {
      genConfigPrimary.thinkingConfig = { thinkingBudget: 0 };
    }

    let res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: genConfigPrimary,
        }),
        signal: controller.signal,
      }
    ).catch(() => null);

    // Fallback to Interactions API if standard generateContent is unavailable for a preview model
    if (!res || (!res.ok && (res.status === 404 || res.status === 400))) {
      res = await fetch(GOOGLE_INTERACTIONS_API, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': key,
          'Api-Revision': '2026-05-20',
        },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            {
              type: 'user_input',
              content: [{ type: 'text', text: promptText }],
            },
          ],
          response_format: {
            type: 'text',
            mime_type: 'application/json',
          },
          generation_config: genCfg,
        }),
        signal: controller.signal,
      }).catch(() => null);
    }

    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);

    if (!res) {
      return { ok: false, reason: 'fetch_failed' };
    }

    const cooldownKey = `${key}::${model}`;
    if (res.status === 429) {
      const errBody = await res.text().catch(() => '');
      const isProvenHealthy = _verifiedHealthyKeys.has(key);
      const retryMatch = errBody.match(/retry\s+in\s+([\d.]+)\s*s/i);
      const isDailyOrZeroQuota = /PerDay|per\s*day|limit:\s*0/i.test(errBody);
      const isHardPlanQuota =
        isDailyOrZeroQuota || (!isProvenHealthy && /quota\s*exceeded|check your plan|billing/i.test(errBody));
      if (isHardPlanQuota && (!isProvenHealthy || isDailyOrZeroQuota)) {
        _copilotCooldownMap.set(cooldownKey, Date.now() + 600000);
        if (model === 'gemini-3.5-flash-lite' && !isProvenHealthy) {
          _quotaDeadKeys.add(key);
        }
      } else {
        const rpmCdMs = retryMatch
          ? Math.min(20000, Math.max(4000, Math.ceil(Number(retryMatch[1]) * 1000)))
          : 6000;
        _copilotCooldownMap.set(cooldownKey, Date.now() + rpmCdMs);
      }
      return { ok: false, reason: `HTTP 429 (${model})` };
    }
    if (!res.ok) {
      if (res.status === 503) {
        _copilotCooldownMap.set(cooldownKey, Date.now() + 8000);
      } else if (res.status !== 404) {
        _copilotCooldownMap.set(cooldownKey, Date.now() + 15000);
      }
      return { ok: false, reason: `HTTP ${res.status} (${model})` };
    }

    const data = await res.json().catch(() => null);
    let rawText = typeof data?.output_text === 'string' ? data.output_text : '';
    if (!rawText && Array.isArray(data?.steps)) {
      rawText = data.steps
        .filter((s) => s && s.type === 'model_output' && Array.isArray(s.content))
        .flatMap((s) => s.content)
        .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text)
        .join('');
    }
    if (!rawText && Array.isArray(data?.candidates?.[0]?.content?.parts)) {
      rawText = data.candidates[0].content.parts
        .filter((p) => p && !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');
    }
    if (!rawText) {
      return { ok: false, reason: 'empty_candidate' };
    }
    let cleanedJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed = null;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      const firstBrace = cleanedJson.indexOf('{');
      const lastBrace = cleanedJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const sub = cleanedJson
          .slice(firstBrace, lastBrace + 1)
          .replace(/,\s*([}\]])/g, '$1');
        parsed = JSON.parse(sub);
      } else {
        throw new Error('json_parse_failed');
      }
    }
    _copilotCooldownMap.delete(cooldownKey);
    _verifiedHealthyKeys.add(key);
    _quotaDeadKeys.delete(key);
    return { ok: true, parsed: Array.isArray(parsed) ? parsed[0] : parsed, model };
  } catch (err) {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
    return { ok: false, reason: err?.message || 'fetch_error' };
  }
}

/**
 * Compare what the Live voice actually said (output transcription) with the scripted line.
 * Digits are treated as wildcards because "10" may be transcribed as "sepuluh"/"ten".
 */
function measureScriptFidelity(scriptText, spokenTranscript) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const scriptTok = norm(scriptText);
  const spokenTok = norm(spokenTranscript);
  if (scriptTok.length < 3 || spokenTok.length === 0) {
    return { checked: false, ok: true, recall: 1, extraRatio: 0 };
  }
  // CJK scripts are transcribed without spaces; skip strict token comparison there.
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(scriptText)) {
    return { checked: false, ok: true, recall: 1, extraRatio: 0 };
  }
  const bag = new Map();
  spokenTok.forEach((t) => bag.set(t, (bag.get(t) || 0) + 1));
  let hit = 0;
  let digitScript = 0;
  for (const t of scriptTok) {
    if (/^\d+$/.test(t)) {
      digitScript++;
      continue;
    }
    const c = bag.get(t) || 0;
    if (c > 0) {
      hit++;
      bag.set(t, c - 1);
    }
  }
  const scored = Math.max(1, scriptTok.length - digitScript);
  const recall = hit / scored;
  const extra = Math.max(0, spokenTok.length - scriptTok.length - digitScript * 2);
  const extraRatio = extra / Math.max(1, scriptTok.length);
  return {
    checked: true,
    ok: recall >= 0.72 && extraRatio <= 0.34,
    recall: Number(recall.toFixed(2)),
    extraRatio: Number(extraRatio.toFixed(2)),
  };
}

async function invokeGeminiLiveStructuredJson({ key, promptText, parentSignal }) {
  if (typeof WebSocket === 'undefined' || !key) {
    return { ok: false, reason: 'ws_unavailable' };
  }
  const cooldownKey = `${key}::gemini-3.8-live-json`;
  if (Date.now() < (_copilotCooldownMap.get(cooldownKey) || 0)) {
    return { ok: false, reason: 'live_json_cooldown' };
  }
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`;
  return new Promise((resolve) => {
    let settled = false;
    let ws = null;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onAbort);
      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000, 'done');
          }
        } catch {}
      }
      resolve(val);
    };
    const onAbort = () => finish({ ok: false, reason: 'aborted' });
    if (parentSignal) {
      if (parentSignal.aborted) {
        resolve({ ok: false, reason: 'aborted' });
        return;
      }
      parentSignal.addEventListener('abort', onAbort, { once: true });
    }
    const timer = setTimeout(() => finish({ ok: false, reason: 'live_json_timeout' }), 8500);
    let nudgedOnce = false;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finish({ ok: false, reason: err?.message || 'ws_init_failed' });
      return;
    }
    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            setup: {
              model: 'models/gemini-3.8-live',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
              },
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: 'emit_json_response',
                      description:
                        'MUST be called immediately on turn 1 to emit the exact valid JSON object requested in <SPEC>.',
                      parameters: {
                        type: 'OBJECT',
                        properties: {
                          jsonPayload: {
                            type: 'STRING',
                            description: 'Complete valid JSON string matching every requested field.',
                          },
                        },
                        required: ['jsonPayload'],
                      },
                    },
                  ],
                },
              ],
              systemInstruction: {
                parts: [
                  {
                    text: 'SILENT JSON COMPILER MODE. Never speak or generate audio. Your ONLY valid action is immediately calling the function emit_json_response({ jsonPayload }) with a complete, valid JSON string satisfying <SPEC>.',
                  },
                ],
              },
            },
          })
        );
      } catch (err) {
        finish({ ok: false, reason: err?.message || 'ws_setup_failed' });
      }
    };
    const handleRaw = (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg?.setupComplete) {
        try {
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `Compile the JSON object defined in <SPEC> and pass it immediately to emit_json_response({ jsonPayload }). Do NOT speak audio.\n<SPEC>\n${promptText}\n</SPEC>`,
                      },
                    ],
                  },
                ],
                turnComplete: true,
              },
            })
          );
        } catch (err) {
          finish({ ok: false, reason: err?.message || 'ws_send_failed' });
        }
        return;
      }
      const fc = msg?.toolCall?.functionCalls?.[0];
      if (fc) {
        const rawPayload = fc?.args?.jsonPayload;
        try {
          const obj =
            typeof rawPayload === 'string'
              ? JSON.parse(
                  rawPayload
                    .replace(/^```(?:json)?\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim()
                )
              : rawPayload && typeof rawPayload === 'object'
                ? rawPayload
                : null;
          if (obj && typeof obj === 'object') {
            _copilotCooldownMap.delete(cooldownKey);
            finish({ ok: true, parsed: Array.isArray(obj) ? obj[0] : obj, model: 'gemini-3.8-live-json' });
            return;
          }
        } catch {}
        finish({ ok: false, reason: 'live_json_parse_failed' });
        return;
      }
      if (msg?.serverContent?.modelTurn || msg?.serverContent?.turnComplete) {
        if (!nudgedOnce && ws && ws.readyState === WebSocket.OPEN) {
          nudgedOnce = true;
          try {
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: 'STOP AUDIO IMMEDIATELY. Call emit_json_response({ jsonPayload }) right now with ONLY the valid JSON string.',
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                },
              })
            );
            return;
          } catch {}
        }
        if (msg?.serverContent?.turnComplete) {
          finish({ ok: false, reason: 'live_json_no_tool_call' });
        }
      }
    };
    ws.onmessage = async (ev) => {
      if (typeof ev.data === 'string') {
        handleRaw(ev.data);
      } else if (ev.data && typeof ev.data.text === 'function') {
        handleRaw(await ev.data.text().catch(() => ''));
      } else if (ev.data instanceof ArrayBuffer) {
        handleRaw(new TextDecoder().decode(ev.data));
      }
    };
    ws.onerror = () => finish({ ok: false, reason: 'live_json_ws_error' });
    ws.onclose = (ev) => {
      if (ev.code === 1011) {
        _copilotCooldownMap.set(cooldownKey, Date.now() + 45000);
      }
      finish({ ok: false, reason: `live_json_closed_${ev.code}` });
    };
  });
}

async function runGeminiJsonWithPool(keys, promptText, temperature = 0.5, maxOutputTokens = 700) {
  let now = Date.now();
  const totalKeys = keys.length;
  if (!totalKeys) return { ok: false, reason: 'no_keys_configured' };

  const nonDeadKeys = keys.filter((k) => !_quotaDeadKeys.has(k));
  const usableKeys = nonDeadKeys.length > 0 ? nonDeadKeys : keys;
  const usableCount = usableKeys.length;
  const stride = usableCount % 5 !== 0 ? 5 : usableCount % 3 !== 0 ? 3 : 1;

  // Spread across usable keys with coprime stride so dead clusters are skipped immediately
  const startKeyIdx = _copilotPoolIndex % usableCount;
  _copilotPoolIndex = (_copilotPoolIndex + 1) % Math.max(usableCount, 1);

  // Bersihkan entri kedaluwarsa di map cooldown & rate-limit agar memori Worker tetap ramping
  if (_copilotCooldownMap.size > 160) {
    for (const [ck, exp] of _copilotCooldownMap.entries()) {
      if (now >= exp) _copilotCooldownMap.delete(ck);
    }
  }
  if (_quotaDeadKeys.size > 12) {
    _quotaDeadKeys.clear();
  }

  const restModels = maxOutputTokens >= 2200 ? EXPLANATION_MODELS : COPILOT_MODELS;
  const buildCandidates = (ts) => {
    const list = [];
    for (let tierIdx = 0; tierIdx < restModels.length; tierIdx++) {
      const model = restModels[tierIdx];
      for (let k = 0; k < usableCount; k++) {
        const key = usableKeys[(startKeyIdx + k * stride) % usableCount];
        const cooldownUntil = Math.max(
          _copilotCooldownMap.get(`${key}::${model}`) || 0,
          _cooldownMap.get(key) || 0
        );
        const isCooledDown = ts < cooldownUntil;
        list.push({
          key,
          model,
          rotOrder: k,
          wave: Math.floor(k / 2),
          cooldownUntil,
          isCooledDown,
          isQuotaDead: _quotaDeadKeys.has(key),
          isVerified: _verifiedHealthyKeys.has(key),
          tier: tierIdx + 1,
        });
      }
    }
    list.sort((a, b) => {
      if (a.isCooledDown !== b.isCooledDown) return Number(a.isCooledDown) - Number(b.isCooledDown);
      if (a.isQuotaDead !== b.isQuotaDead) return Number(a.isQuotaDead) - Number(b.isQuotaDead);
      // Gilir antar-model setiap 2 key sehingga bila 1 model sedang sibuk (503/429), model cepat lain langsung dicoba!
      if (a.wave !== b.wave) return a.wave - b.wave;
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.isVerified !== b.isVerified) return Number(b.isVerified) - Number(a.isVerified);
      return a.rotOrder - b.rotOrder;
    });
    return list;
  };

  let candidates = buildCandidates(now);
  let healthyRestCandidates = candidates.filter((c) => !c.isCooledDown);
  if (healthyRestCandidates.length === 0 && candidates.length > 0) {
    const minWaitMs = Math.min(...candidates.map((c) => Math.max(0, c.cooldownUntil - now)));
    if (minWaitMs > 0 && minWaitMs <= 5000) {
      await new Promise((r) => setTimeout(r, minWaitMs + 150));
      now = Date.now();
      candidates = buildCandidates(now);
      healthyRestCandidates = candidates.filter((c) => !c.isCooledDown);
    }
  }

  let lastReason = 'unknown';

  const HEDGE_DELAY_MS = maxOutputTokens > 2500 ? 900 : 750;
  const OVERALL_DEADLINE_MS = maxOutputTokens > 1000 ? 15000 : 10000;
  const activeCandidates = healthyRestCandidates.length > 0 ? healthyRestCandidates : candidates;
  const maxAttempts = Math.min(usableCount === 1 ? 2 : 28, activeCandidates.length);
  const overallController = new AbortController();
  const overallTimer = setTimeout(() => overallController.abort(), OVERALL_DEADLINE_MS);

  try {
    const restResult = await new Promise((resolve) => {
      let settled = false;
      let pending = 0;
      let launched = 0;
      let hedgeTimer = null;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (hedgeTimer) clearTimeout(hedgeTimer);
        overallController.abort();
        resolve(value);
      };

      const launch = () => {
        if (settled || launched >= maxAttempts) return;
        const cand = activeCandidates[launched++];
        pending++;
        invokeSingleGeminiJson({
          key: cand.key,
          model: cand.model,
          promptText,
          temperature,
          maxOutputTokens,
          parentSignal: overallController.signal,
        })
          .then((res) => {
            pending--;
            if (res && res.ok) {
              finish(res);
              return;
            }
            lastReason = res?.reason || lastReason;
            if (!settled) {
              if (launched < maxAttempts) {
                if (hedgeTimer) clearTimeout(hedgeTimer);
                launch();
                hedgeTimer = setTimeout(launch, HEDGE_DELAY_MS);
              } else if (pending === 0) {
                finish({ ok: false, reason: lastReason });
              }
            }
          })
          .catch((err) => {
            pending--;
            lastReason = err?.message || lastReason;
            if (!settled && pending === 0 && launched >= maxAttempts) {
              finish({ ok: false, reason: lastReason });
            }
          });
      };

      overallController.signal.addEventListener('abort', () => {
        if (!settled) finish({ ok: false, reason: lastReason === 'unknown' ? 'deadline_exceeded' : lastReason });
      });

      launch();
      hedgeTimer = setTimeout(launch, HEDGE_DELAY_MS);
    });

    if (restResult && restResult.ok) {
      return restResult;
    }

    // Failover to Gemini 3.8 Live Structured JSON Bridge with dedicated round-robin cursor across healthy keys
    const liveStartIdx = _livePoolCursor % usableCount;
    _livePoolCursor = (_livePoolCursor + 1) % Math.max(usableCount, 1);
    const liveRotated = usableKeys.map((_, idx) => usableKeys[(liveStartIdx + idx) % usableCount]);
    const liveNow = Date.now();
    const liveCandidates = liveRotated.filter(
      (k) => liveNow >= (_cooldownMap.get(k) || 0) && liveNow >= (_copilotCooldownMap.get(`${k}::gemini-3.8-live-json`) || 0)
    );
    const livePool = liveCandidates.length > 0 ? liveCandidates : liveRotated;
    const liveRaceTargets = livePool.slice(0, Math.min(5, livePool.length));
    if (liveRaceTargets.length > 0) {
      const liveController = new AbortController();
      const liveRaceRes = await new Promise((resolve) => {
        let settled = false;
        let launched = 0;
        let pending = 0;
        let hedgeTimer = null;
        let liveFailReason = lastReason;
        const raceTimeout = setTimeout(() => finishLive({ ok: false, reason: liveFailReason || 'live_json_race_timeout' }), 18000);

        const finishLive = (res) => {
          if (settled) return;
          settled = true;
          clearTimeout(raceTimeout);
          if (hedgeTimer) clearTimeout(hedgeTimer);
          liveController.abort();
          resolve(res);
        };

        const launchLive = () => {
          if (settled || launched >= liveRaceTargets.length) return;
          const liveKey = liveRaceTargets[launched++];
          pending++;
          invokeGeminiLiveStructuredJson({
            key: liveKey,
            promptText,
            parentSignal: liveController.signal,
          })
            .then((liveRes) => {
              pending--;
              if (liveRes && liveRes.ok) {
                _verifiedHealthyKeys.add(liveKey);
                _quotaDeadKeys.delete(liveKey);
                finishLive(liveRes);
                return;
              }
              _copilotCooldownMap.set(`${liveKey}::gemini-3.8-live-json`, Date.now() + 15000);
              liveFailReason = liveRes?.reason || liveFailReason;
              if (!settled) {
                if (launched < liveRaceTargets.length) {
                  launchLive();
                } else if (pending === 0) {
                  finishLive({ ok: false, reason: liveFailReason });
                }
              }
            })
            .catch((err) => {
              pending--;
              liveFailReason = err?.message || liveFailReason;
              if (!settled) {
                if (launched < liveRaceTargets.length) {
                  launchLive();
                } else if (pending === 0) {
                  finishLive({ ok: false, reason: liveFailReason });
                }
              }
            });
        };

        launchLive();
        if (liveRaceTargets.length > 1) {
          hedgeTimer = setTimeout(() => {
            if (!settled && pending < 2) launchLive();
          }, 2200);
        }
      });
      if (liveRaceRes && liveRaceRes.ok) {
        return liveRaceRes;
      }
      lastReason = liveRaceRes?.reason || lastReason;
    }

    // Parallel recovery across non-cooled healthy key/model pairs after brief RPM window backoff
    const recoveryStart = (_copilotPoolIndex + 3) % usableCount;
    const finalKeys = usableKeys.map((_, idx) => usableKeys[(recoveryStart + idx * stride) % usableCount]);
    if (finalKeys.length > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      const recoveryPairs = [];
      for (const recoveryModel of COPILOT_MODELS) {
        for (const recoveryKey of finalKeys) {
          recoveryPairs.push({ recoveryKey, recoveryModel });
        }
      }
      for (let i = 0; i < Math.min(12, recoveryPairs.length); i += 3) {
        const wave = recoveryPairs.slice(i, i + 3);
        const results = await Promise.all(
          wave.map(({ recoveryKey, recoveryModel }) =>
            invokeSingleGeminiJson({
              key: recoveryKey,
              model: recoveryModel,
              promptText,
              temperature,
              maxOutputTokens,
            })
          )
        );
        const winner = results.find((r) => r && r.ok);
        if (winner) return winner;
        for (const r of results) {
          if (r?.reason) lastReason = r.reason;
        }
      }
    }
    return { ok: false, reason: lastReason };
  } finally {
    clearTimeout(overallTimer);
  }
}

function stripMetaStepPrefix(raw) {
  return String(raw || '')
    .replace(/^(?:Langkah|Step|Tahap|Beat|Fase)\s*\d+\s*(?:[:.\-–—]+\s*|$)/i, '')
    .trim();
}

function stripRoboticSelfIntro(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const stripped = s
    .replace(
      /^(?:(?:Halo|Hai|Hi|Hello|Selamat\s+(?:pagi|siang|sore|malam))[,!.\s]+)?(?:(?:saya|aku|ini|bersama|nama\s+saya)\s+(?:Coach\s+|Sensei\s+|Dr\.\s+|Examiner\s+|Xiao\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|(?:Coach|Sensei)\s+[A-Z][a-z]+\s+di\s+sini)(?:\s+di\s+sini)?[,!.\s]*(?:dan\s+)?/i,
      ''
    )
    .replace(
      /^(?:(?:Halo|Hai|Hi|Hello)[!.,\s]+)?(?:mari\s+kita\s+(?:perbaiki|pelajari|bahas|bedah|lihat|pahami)\s+[^.!?]{3,75}[.!?]\s+)/i,
      ''
    )
    .trim();
  if (!stripped) return s;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

async function runFastOpenerOnly({ keys, userText, targetLang, targetLocaleName, personaName }) {
  const openerPrompt = [
    `[FAST STAGE-1 WHITEBOARD OPENER JSON ONLY - Zero emojis, zero em-dash]`,
    `Course: ${targetLang.toUpperCase()}, Mandatory explanation language: ${targetLocaleName}, Mentor: ${personaName}.`,
    `Question: "${userText}"`,
    `IMPORTANT: Even if the learner wrote or spoke in ${targetLang.toUpperCase()}, write topicTitle, text, and spokenNarration 100% in ${targetLocaleName} (quoting only short ${targetLang.toUpperCase()} example words).`,
    `NEVER write "Langkah 0" or "Step 0" in the title, and NEVER introduce yourself ("Halo saya Alex"). Jump straight into explaining the core concept!`,
    `Write the opening concept header + a clear, plain-language 1-sentence core definition in "text" (12-24 words explaining what it is and when it is used) + 1-2 crisp opening teaching sentences in "spokenNarration" (18-32 words in ${targetLocaleName}).`,
    `JSON: {"topicTitle":"...","patternFormula":"...","headingStep":{"kind":"heading","title":"...","text":"12-24 word clear core definition","spokenNarration":"..."}}`,
  ].join('\n');
  const gen = await runGeminiJsonWithPool(keys, openerPrompt, 0.2, 340);
  if (!gen.ok || !gen.parsed || typeof gen.parsed !== 'object') return null;
  const p = gen.parsed;
  const st0 = p.headingStep && typeof p.headingStep === 'object' ? p.headingStep : {};
  const title = stripMetaStepPrefix(cleanSpokenText(p.topicTitle || st0.title || ''));
  const headingTitle = stripMetaStepPrefix(cleanSpokenText(st0.title || title)) || title;
  const spoken = stripRoboticSelfIntro(cleanSpokenText(st0.spokenNarration || ''));
  if (!title && !spoken) return null;
  return {
    topicTitle: title || headingTitle,
    patternFormula: cleanSpokenText(p.patternFormula || ''),
    headingStep: {
      id: 'ai_step_0',
      kind: 'heading',
      column: 'left',
      phaseIndex: 0,
      title: headingTitle,
      text: cleanSpokenText(st0.text || ''),
      spokenNarration: spoken,
    },
    model: gen.model || 'gemini-fast-opener',
  };
}

/**
 * Handler POST /api/voice/copilot-assist
 * Menghasilkan 3 opsi bantuan jawaban lisan secara REALTIME (bukan template)
 * yang menjawab langsung ucapan terbaru Partner AI + konteks percakapan.
 */
export async function routeVoiceCopilotAssist(ctx) {
  const clientIp = (ctx.request && (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) || '';
  if (!checkLiveRateLimit(clientIp, 35, 60000)) {
    return jsonResponse(
      { ok: false, fallback: true, error: 'rate_limited', message: 'Rate limit exceeded for copilot.' },
      { status: 429 }
    );
  }

  const keys = await resolvePoolKeys(ctx);
  if (!keys.length) {
  return jsonResponse({ ok: false, fallback: true, error: 'no_keys_configured' }, { status: 503 });
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const targetLang = body.targetLang === 'ja' ? 'ja' : body.targetLang === 'zh' ? 'zh' : 'en';
  const rawCopilotLoc = String(body.locale || 'id').toLowerCase().trim().split(/[-_]/)[0];
  const locale = ['id', 'th', 'en', 'ms', 'vi', 'fil', 'ja', 'zh', 'km', 'ru'].includes(rawCopilotLoc) ? rawCopilotLoc : 'id';
  const LOCALE_DISPLAY_MAP = {
    id: 'Indonesian',
    th: 'Thai',
    en: 'English',
    ms: 'Malay (Bahasa Melayu)',
    vi: 'Vietnamese',
    fil: 'Filipino / Tagalog',
    ja: 'Japanese',
    zh: 'Mandarin Chinese',
    km: 'Khmer',
    ru: 'Russian',
  };
  const targetLocaleName = LOCALE_DISPLAY_MAP[locale] || 'Indonesian';
  const aiText = cleanSpokenText(body.aiText || body.aiQuestionText || '').slice(0, 500);
  if (!aiText) {
    return badRequest('empty_ai_text');
  }

  const lastUserText = cleanSpokenText(body.lastUserText || '').slice(0, 320);
  const scenarioTitle = cleanSpokenText(body.scenarioTitle || body.scenarioId || 'Free Talk').slice(0, 100);
  const activePopupTargetText = cleanSpokenText(body.activePopupTargetText || '').slice(0, 600);
  const activePopupMode = cleanSpokenText(body.activePopupMode || '').slice(0, 80);
  const popupScreenDirective = activePopupTargetText
    ? `[ACTIVE SCREEN POPUP TARGET (${activePopupMode || 'learning_popup'})]: The popup on the learner's screen currently shows THIS exact text: "${activePopupTargetText}". Anchor suggestions and Read Aloud / practice help strictly to this exact text.`
    : '';
  const historyLines = normalizeHistory(body.history || body.conversationHistory);
  const excludeList = Array.isArray(body.excludeTexts)
    ? body.excludeTexts.map((t) => cleanSpokenText(t).slice(0, 160)).filter(Boolean).slice(0, 6)
    : [];
  const variationSeed = Number(body.variationSeed || 0);

  const focal = extractFocalClause(aiText, targetLang);

  const cefrLevel = String(body.cefrLevel || 'B1').toUpperCase().trim();
  const isSswSensei =
    Boolean(body.isSswSensei) ||
    String(body.personaId || '').toLowerCase() === 'ssw_sensei' ||
    String(body.scenarioId || '').toLowerCase().startsWith('scen_ssw_');
  const isCambridge =
    !isSswSensei &&
    (Boolean(body.isCambridge) ||
      body.personaId === 'cambridge_examiner' ||
      String(body.scenarioId || '').startsWith('scen_ielts') ||
      body.personaId === 'dr_julian' ||
      String(body.scenarioId || '').startsWith('scen_pte'));

  const langSpec = isSswSensei
    ? 'Bilingual Bahasa Indonesia + Japanese SSW Food Manufacturing terminology (OTAFF Ver 5.1, Kanji+Kana + romaji + clear Indonesian explanation, NO emojis, NO em-dash/en-dash)'
    : targetLang === 'ja'
      ? 'Japanese (natural spoken N5-N3, Kanji+Hiragana, NO emojis; "pronunciation" = word-spaced Hepburn Romaji)'
      : targetLang === 'zh'
      ? 'Mandarin Chinese (natural spoken HSK1-HSK3, Simplified Chinese characters, NO emojis; "pronunciation" = tone-marked Pinyin)'
      : `English (natural spoken ${cefrLevel === 'B1' ? 'A2-B1' : cefrLevel}, NO emojis; "pronunciation" = easy phonetic guide)`;

  const focalRule = focal.isEchoRedemption
    ? `CRITICAL MANDATORY ECHO REDEMPTION: Partner AI demanded repeating the exact corrected phrase: "${focal.focalText}". Option 1 (tier="easy") MUST be that exact phrase: "${focal.focalText}"!`
    : `FOCAL POINT TO ANSWER: "${focal.focalText}".
CRITICAL RELEVANCE MANDATE FOR OPTION 1 (easy / Singkat):
- Option 1 MUST directly and specifically answer the focal point above ("${focal.focalText}").
- NEVER give an evasive or mismatched answer (e.g. NEVER answer 'from Indonesia' to 'where do you study/hang out?', NEVER answer 'pretty good' to 'how long have you studied?', NEVER answer 'Yes, I do' to invitations like 'Why don't we...').
- If asked a choice (A or B), choose one concrete option!
- If asked an invitation/proposal, directly accept or decline!
- If asked what food/drink/place, name a concrete item!
- Option 1 must be concise (1 short sentence), direct, and completely conversational.`;

  const levelBadge = isCambridge
    ? (cefrLevel === 'B1' ? '🎯 Jawaban B1 (PTE 42 / Band 5.5)' : cefrLevel === 'B2' ? '🎯 Jawaban B2 (Band 6.5)' : cefrLevel === 'A2' ? '🎯 Jawaban A2' : cefrLevel === 'A1' ? '🎯 Jawaban A1' : `🎯 Jawaban Terbaik (${cefrLevel})`)
    : '';

  const prompt = isSswSensei
    ? [
        `Speech Copilot for SSW SENSEI (Tokutei Ginou Food & Beverage Manufacturing / 飲食料品製造業 OTAFF Ver 5.1, Wakai Papa Pro method).`,
        historyLines.length ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}` : '',
        popupScreenDirective,
        lastUserText ? `Learner said: "${lastUserText}"` : '',
        `SSW SENSEI said: "${aiText}"`,
        `Generate 3 direct spoken candidate responses in Bahasa Indonesia (optionally quoting the relevant Japanese term or PDF page number/answer letter A/B/C) that directly answer SSW SENSEI's latest question, quiz prompt, or advice ("${focal.focalText}").`,
        `NEVER output em-dash or en-dash characters. easy=short direct answer/choice, mission=natural answer with specific exam detail, rescue=answer + ask SENSEI for trap/page explanation.`,
        `JSON only: {"aiMeaning":"...","replies":[{"tier":"easy","text":"...","pronunciation":"","hint":"..."},{"tier":"mission","text":"...","pronunciation":"","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"","hint":"..."}]}`,
      ]
        .filter(Boolean)
        .join('\n')
    : isCambridge
    ? [
        `You are the Senior English Speaking Exam Copilot (PTE Academic / IELTS). Target Level: CEFR ${cefrLevel} (Target Score: ${cefrLevel === 'B1' ? 'PTE 42 / IELTS 5.0-5.5' : cefrLevel === 'B2' ? 'PTE 58 / IELTS 6.5' : cefrLevel === 'C1' ? 'PTE 76 / IELTS 7.5' : 'PTE 84+ / IELTS 8.5-9.0'}).`,
        `Examiner statement/question: "${aiText}".`,
        focal.focalText ? `Examiner focal focus: "${focal.focalText}".` : '',
        popupScreenDirective,
        lastUserText ? `Candidate just said: "${lastUserText}".` : '',
        historyLines.length
          ? `Exam dialogue context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
          : '',
        `Generate EXACTLY ONE single best Model Answer that 100% SPECIFICALLY AND DIRECTLY ANSWERS the examiner's statement/question above.`,
        cefrLevel === 'A1'
          ? `CRITICAL CEFR A1 MANDATE: Candidate is an absolute beginner. Use VERY SHORT and simple sentences (max 4-7 words). Use only fundamental A1 vocabulary. Keep it extremely easy to pronounce and understand!`
          : cefrLevel === 'A2'
          ? `CRITICAL CEFR A2 MANDATE: Candidate is at elementary level. Use simple, direct sentences (max 7-10 words) with basic everyday vocabulary (A2 level). Avoid any advanced idioms or complex syntax!`
          : cefrLevel === 'B1'
          ? `CRITICAL CEFR B1 MANDATE: Use clear, natural compound sentences with everyday professional vocabulary suitable for PTE 42 / CEFR B1. NEVER use obscure C2 academic jargon (like 'cogent', 'unilateral', 'invariably yields'). The candidate must be able to speak it comfortably and fluently!`
          : cefrLevel === 'B2'
          ? `Use clear, articulate B2 sentences with good academic vocabulary and clear discourse markers. Avoid overly obscure C2 jargon.`
          : `Use elevated C1/C2 academic vocabulary, complex grammar, and sophisticated discourse markers.`,
        `Translate "${aiText}" into aiMeaning (${targetLocaleName}).`,
        `In "hint", write an accurate, helpful first-person translation of the model answer into ${targetLocaleName}.`,
        `In "pronunciation", provide an easy, human-readable phonetic pronunciation guide (NO raw IPA symbols like æ, ʌ, ɪ, ð, ŋ).`,
        `JSON only: {"aiMeaning":"...","replies":[{"tier":"cambridge_model","badgeId":"${levelBadge}","text":"...","pronunciation":"...","hint":"..."}]}`,
      ]
        .filter(Boolean)
        .join('\n')
    : [
        `Speech Copilot (${scenarioTitle}). Target: ${langSpec}.`,
        `Persona & Pedagogy: Sharp, observant, caring mentor ("guru galak tapi penuh perhatian") in FIEZEL (ecosystem created by Fitra Rustqi from Banda Aceh; powered by Braincore).`,
        historyLines.length
          ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
          : '',
        lastUserText ? `Learner said: "${lastUserText}"` : '',
        `Partner AI said: "${aiText}"`,
        focalRule,
        popupScreenDirective,
        excludeList.length
          ? `Do NOT repeat: ${JSON.stringify(excludeList)}. Give 3 fresh angles.`
          : '',
        `Generate 3 spontaneous spoken replies directly responding to Partner AI's latest point ("${focal.focalText}") in "${aiText}" (natural, conversational, punchy). STRICT ANCHOR RULE: Whether Partner AI asked a question, gave study/speaking advice, corrected a mistake, or stated a viewpoint, EVERY option MUST explicitly echo or engage with Partner AI's concrete words, strategy, or topic (e.g., if coach advises daily sentences and consistent reading, commit specifically to practicing daily sentences / reading consistently and ask a relevant follow-up!). BANNED GENERIC FILLERS: NEVER output vague empty fillers like "That makes a lot of sense!", "That's interesting!", or "Tell me more about that!" without naming the specific topic/advice. easy=1 short direct reply (or exact Echo repeat if demanded), mission=natural reply with concrete detail referencing the advice/topic, rescue=concrete reply + topic-specific follow-up question. Translate "${aiText}" into aiMeaning (${targetLocaleName}), and write natural first-person translation of each reply in hint (${targetLocaleName}).`,
        `JSON only: {"aiMeaning":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}]}`,
      ]
        .filter(Boolean)
        .join('\n');

  const temp = variationSeed > 0 || excludeList.length > 0 ? 0.75 : 0.45;
  const gen = await runGeminiJsonWithPool(keys, prompt, temp, 850);
  if (!gen.ok || !gen.parsed) {
  return jsonResponse({ ok: false, fallback: true, reason: gen.reason }, { status: 503 });
  }

  const replies = normalizeCopilotReplies(
    gen.parsed.replies,
    targetLang,
    locale,
    '',
    isCambridge,
    cefrLevel,
    isSswSensei
  );
  const realCount = replies.filter((r) => r.isRealtimeAi && !r.isOfflineFallback).length;
  if (!replies.length || realCount === 0) {
    return jsonResponse({ ok: false, fallback: true, reason: 'invalid_replies' }, { status: 503 });
  }

  const aiMeaning = cleanSpokenText(gen.parsed.aiMeaning || gen.parsed.aiMeaningId || gen.parsed.aiMeaningTh || '');

  return jsonResponse({
    ok: true,
    source: 'ai-realtime',
    model: gen.model,
    aiMeaningId: locale === 'id' ? aiMeaning : cleanSpokenText(gen.parsed.aiMeaningId || ''),
    aiMeaningTh: locale === 'th' ? aiMeaning : cleanSpokenText(gen.parsed.aiMeaningTh || ''),
    replies,
    suggestions: replies,
  });
}

/**
 * Deteksi apakah murid sedang bertanya penjelasan tata bahasa, perbedaan kata, atau mengungkapkan kebingungan.
 * Dalam kasus ini, coach wajib beralih 100% ke bahasa murid (Indonesia/Thai) agar penjelasannya langsung dipahami!
 */
export function isExplanationQuestion(userText) {
  const s = String(userText || '').toLowerCase();
  return (
    /\b(bedanya|perbedaan|apa beda|arti dari|artinya apa|maksudnya apa|cara (?:menggunakan|memakai|pakai|pake|menghitung|hitung|menulis|tulis|membaca|baca|kerja)|gimana cara (?:pakai|pake|hitung|tulis|kerja)|bagaimana cara|kapan (?:pakai|pake)|kenapa (?:pakai|pake|salah)|mengapa (?:pakai|pake|salah)|jelasin|jelaskan|ajarkan|ajarin|terangin|terangkan|uraikan|gambarkan|tolong bahas|bingung|nggak paham|gak paham|belum paham|kurang paham|tidak paham|nggak ngerti|gak ngerti|apa fungsi|fungsi dari|contoh kalimat|rumus|teorema|proses|alur|tahapan|langkah|strategi|teknik|workflow|note[\s-]?taking|how to (?:use|write|calculate|solve|do)|difference between|what does .* mean|why is .* wrong|confused about|explain|teach me|break down|งง|แปลว่าอะไร|ต่างกันยังไง|ใช้ยังไง|วิธีใช้|อธิบาย)\b/i.test(
      s
    ) || /\b(papan tulis|papan belajar|whiteboard|pop[\s-]?up|latihan tulis|secara visual|dengan diagram|pakai diagram|visually|with a (?:\w+\s+)?diagram|step by step)\b/i.test(s)
  );
}

/**
 * Deteksi apakah murid menyuruh AI mengganti bahasa bicara (misal menyuruh bicara Bahasa Indonesia/lain).
 * PENTING: Berbeda dari perintah navigasi pindah kursus ("buka kursus jepang").
 */
function detectLanguageSwitchDemand(userText, targetLang) {
  if (isExplanationQuestion(userText)) return false;
  const s = String(userText || '').toLowerCase();
  if (/\b(buka|pindah|masuk)\s+(kursus|modul|halaman)\b/i.test(s)) return false;
  const asksOtherLang =
    /\b(ngomong|bicara|pakai|pake|gunakan|jawab|balas|speak|talk|use|switch to)\s+(pakai\s+|pake\s+|dalam\s+|in\s+)?(bahasa\s+)?(indo|indonesia|indonesian|melayu|jawa|sunda|thailand|thai)\b/i.test(
      s
    ) ||
    /\b(jangan|stop|gak usah|nggak usah|don't|stop)\s+(ngomong|bicara|pakai|pake|speak|speaking|use)\s+(bahasa\s+)?(inggris|english|jepang|japanese|mandarin|cina|chinese)\b/i.test(
      s
    ) ||
    (targetLang === 'en' &&
      /\b(ngomong|bicara|pakai|pake|speak)\s+(bahasa\s+)?(jepang|mandarin|indonesia|indo)\b/i.test(s)) ||
    (targetLang === 'ja' &&
      /\b(ngomong|bicara|pakai|pake|speak)\s+(bahasa\s+)?(inggris|english|mandarin|indonesia|indo)\b/i.test(
        s
      )) ||
    (targetLang === 'zh' &&
      /\b(ngomong|bicara|pakai|pake|speak)\s+(bahasa\s+)?(inggris|english|jepang|indonesia|indo)\b/i.test(
        s
      ));
  return asksOtherLang;
}

/**
 * Deteksi perintah suara untuk ganti mode panggilan ("casual_chat" vs "tutor_coach").
 */
function detectCallModeSwitchIntent(userText) {
  const s = String(userText || '').toLowerCase();
  if (
    /\b(chat\s+seperti\s+biasa|ngobrol\s+(biasa|santai|kasual)|mode\s+(kasual|santai|chat\s+biasa|free\s*talk)|jangan\s+mode\s+mengajar|casual\s+chat|just\s+chat\s+casually)\b/i.test(
      s
    )
  ) {
    return 'casual_chat';
  }
  if (
    /\b(mode\s+(mengajar|mentor|guru|tutor|belajar)|ajarin\s+lagi|koreksi\s+lagi|tutor\s+mode|teaching\s+mode)\b/i.test(
      s
    )
  ) {
    return 'tutor_coach';
  }
  return null;
}

/**
 * Deteksi kata kasar / umpatan / trash-talk agar AI membalas dengan tegas & sarkastik (Clap-Back) tanpa minta maaf!
 */
function detectProfanityOrTrashTalk(userText) {
  const s = String(userText || '').toLowerCase();
  return /\b(anjing|anjir|anjrit|goblok|tolol|bangsat|babi|kontol|memek|tai|taik|kampret|bajingan|bego|bodoh\s+lu|fuck|fucking|motherfucker|shit|bullshit|bitch|asshole|dumbass|stfu|idiot\s+you|バカ|馬鹿|アホ|くそ|クソ|ふざけるな|死ね|傻逼|他妈的|笨蛋|滚蛋|操你)\b/i.test(
    s
  );
}

/**
 * Respons instan bermental baja untuk:
 * 1) Penolakan tegas ganti bahasa (Rule #3)
 * 2) Clap-back kata kasar jika model terkena filter keamanan atau butuh balasan cepat (Rule #4)
 */
function buildIroncladGuardResponse(kind, targetLang, locale, switchedMode = null) {
  if (kind === 'refuse_lang_switch') {
    if (targetLang === 'ja') {
      return {
        aiReply:
          '嫌よ、絶対に変えないから！今は日本語コースの時間でしょ？そっちは何語で話しても全部わかるけど、私に日本語をやめろなんて言わないでよね！さあ、日本語で続けて！',
        aiReplyTranslationId:
          'Ogah, aku tidak mau ganti bahasa! Sekarang kan kita sedang di kursus Bahasa Jepang. Kamu bebas ngomong pakai bahasamu sendiri dan aku paham semuanya, tapi jangan suruh aku berhenti bicara bahasa Jepang! Ayo lanjut!',
        aiReplyTranslationTh:
          'ไม่เอา ฉันไม่เปลี่ยนภาษาเด็ดขาด! ตอนนี้เราอยู่ในคอร์สภาษาญี่ปุ่นนะ คุณจะพูดภาษาตัวเองมาก็ได้ฉันเข้าใจหมด แต่อย่ามาสั่งให้ฉันหยุดพูดภาษาญี่ปุ่น!',
        replies: [
          {
            tier: 'easy',
            text: 'わかりました、日本語で頑張ります。',
            pronunciation: 'Wakarimashita, nihongo de ganbarimasu.',
            hintId: 'Baiklah, saya akan berusaha pakai bahasa Jepang.',
            hintTh: 'เข้าใจแล้ว จะพยายามพูดภาษาญี่ปุ่นครับ/ค่ะ',
          },
          {
            tier: 'mission',
            text: '厳しいですね！でも日本語で話す練習を続けます。',
            pronunciation: 'Kibishii desu ne! Demo nihongo de hanasu renshuu o tsuzukemasu.',
            hintId: 'Tegas sekali ya! Tapi saya akan lanjut latihan bicara bahasa Jepang.',
            hintTh: 'เข้มงวดจัง! แต่จะฝึกพูดภาษาญี่ปุ่นต่อครับ/ค่ะ',
          },
          {
            tier: 'rescue',
            text: 'すみません、今の文はどう言えば自然ですか？',
            pronunciation: 'Sumimasen, ima no bun wa dou ieba shizen desu ka?',
            hintId: 'Kalimat barusan bagusnya diucapkan bagaimana biar alami?',
            hintTh: 'ประโยคเมื่อกี้พูดอย่างไรให้เป็นธรรมชาติครับ/ค่ะ?',
          },
        ],
      };
    }
    if (targetLang === 'zh') {
      return {
        aiReply:
          '想得美，我才不换语言呢！现在可是中文课！你想用自己的语言随便说，我全都听得懂，但绝对别想让我放弃说中文！来，继续用中文聊！',
        aiReplyTranslationId:
          'Enak aja, aku tidak mau ganti bahasa! Sekarang kita sedang di kursus Bahasa Mandarin! Kamu bebas bicara pakai bahasamu sendiri, aku paham semuanya, tapi jangan pernah suruh aku berhenti bicara Mandarin! Ayo lanjut!',
        aiReplyTranslationTh:
          'ฝันไปเถอะ ฉันไม่เปลี่ยนภาษาหรอก! ตอนนี้เป็นคอร์สภาษาจีนนะ คุณจะพูดภาษาตัวเองก็ได้ฉันเข้าใจหมด แต่อย่ามาสั่งให้ฉันเลิกพูดภาษาจีน!',
        replies: [
          {
            tier: 'easy',
            text: '好吧，我继续用中文说。',
            pronunciation: 'Hǎo ba, wǒ jìxù yòng Zhōngwén shuō.',
            hintId: 'Baiklah, aku lanjut bicara pakai bahasa Mandarin.',
            hintTh: 'โอเค ฉันจะพูดภาษาจีนต่อ',
          },
          {
            tier: 'mission',
            text: '你真严格！那我试着用中文表达我的意思。',
            pronunciation: 'Nǐ zhēn yángé! Nà wǒ shìzhe yòng Zhōngwén biǎodá wǒ de yìsi.',
            hintId: 'Kamu tegas banget! Kalau gitu aku coba ungkapkan maksudku pakai Mandarin.',
            hintTh: 'คุณเข้มงวดจัง! งั้นฉันจะลองพูดเป็นภาษาจีนดู',
          },
          {
            tier: 'rescue',
            text: '那刚才那句话用中文怎么说才地道？',
            pronunciation: 'Nà gāngcái nà jù huà yòng Zhōngwén zěnme shuō cái dìdao?',
            hintId: 'Kalau begitu kalimat barusan bahasa Mandarin alaminya bagaimana?',
            hintTh: 'งั้นประโยคเมื่อกี้พูดเป็นภาษาจีนให้เป็นธรรมชาติว่าอย่างไร?',
          },
        ],
      };
    }
    return {
      aiReply:
        "Hell nah, I refuse to switch languages! We are in the English course right now, fam. You can speak to me in your own language all you want, I understand every single word, but don't tell me to drop English! Now talk to me, what's on your mind?",
      aiReplyTranslationId:
        'Ogah banget, aku tidak mau ganti bahasa! Kita sedang di kursus Bahasa Inggris sekarang, bro. Kamu bebas ngomong pakai bahasamu sendiri sepuasmu, aku paham setiap katanya, tapi jangan suruh aku berhenti pakai bahasa Inggris! Ayo lanjut ngobrol!',
      aiReplyTranslationTh:
        'ไม่เอาเด็ดขาด ฉันไม่เปลี่ยนภาษา! ตอนนี้เราอยู่ในคอร์สภาษาอังกฤษนะ คุณจะพูดภาษาตัวเองมาก็ได้ฉันเข้าใจทุกคำ แต่อย่ามาสั่งให้ฉันเลิกพูดภาษาอังกฤษ!',
      replies: [
        {
          tier: 'easy',
          text: 'Alright fair enough, let us keep speaking in English.',
          pronunciation: 'ol-rait fer i-naf, let as kip spi-king in ing-glish',
          hintId: 'Oke adil, ayo kita tetap bicara bahasa Inggris.',
          hintTh: 'โอเค ยุติธรรมดี มาพูดภาษาอังกฤษกันต่อเถอะ',
        },
        {
          tier: 'mission',
          text: 'You got me there! I will try my best to answer in English.',
          pronunciation: 'yu got mi der! ai wil trai mai best tu an-ser in ing-glish',
          hintId: 'Kamu skakmat aku! Aku bakal berusaha jawab pakai bahasa Inggris.',
          hintTh: 'คุณพูดถูกเลย! ฉันจะพยายามตอบเป็นภาษาอังกฤษนะ',
        },
        {
          tier: 'rescue',
          text: 'How do I say what I just said naturally in English?',
          pronunciation: 'hau du ai sei wot ai jast sed ne-che-re-li in ing-glish',
          hintId: 'Gimana cara ngomong kalimatku barusan secara alami dalam bahasa Inggris?',
          hintTh: 'สิ่งที่ฉันพูดเมื่อกี้ พูดเป็นภาษาอังกฤษให้เป็นธรรมชาติอย่างไร?',
        },
      ],
    };
  }

  if (kind === 'clapback_profanity') {
    if (targetLang === 'ja') {
      return {
        aiReply:
          'はあ？なにその口の利き方！悪口だけ一丁前に言えるつもり？文句があるなら、まず完璧な日本語の文法で私を言い負かしてみなさいよ！ほら、かかってきなさい！',
        aiReplyTranslationId:
          'Hah? Gaya ngomong apa-apaan tuh! Berani ngumpat doang? Kalau mau ngajak ribut, coba kalahkan argumenku pakai tata bahasa Jepang yang sempurna dulu! Ayo maju sini kalau bisa!',
        aiReplyTranslationTh:
          'หา? พูดจาอะไรแบบนั้น! เก่งแต่คำหยาบเหรอ? ถ้าจะเถียงกัน ลองใช้ไวยากรณ์ภาษาญี่ปุ่นให้เป๊ะมาชนะฉันให้ได้ก่อนสิ!',
        replies: [
          {
            tier: 'easy',
            text: '冗談ですよ、落ち着いてください！',
            pronunciation: 'Joudan desu yo, ochitsuite kudasai!',
            hintId: 'Cuma bercanda kok, tenang dulu!',
            hintTh: 'ล้อเล่นน่า ใจเย็นๆ ก่อนนะครับ/ค่ะ!',
          },
          {
            tier: 'mission',
            text: 'さすが手強いですね。ちゃんとした日本語で話します！',
            pronunciation: 'Sasuga tegowai desu ne. Chanto shita nihongo de hanashimasu!',
            hintId: 'Memang lawan tangguh ya. Oke aku bicara pakai bahasa Jepang yang benar!',
            hintTh: 'สมเป็นคู่ซ้อมที่โหดจริงๆ จะพูดภาษาญี่ปุ่นดีๆ แล้วครับ/ค่ะ!',
          },
          {
            tier: 'rescue',
            text: '降参です！さっきのトピックに戻りましょう。',
            pronunciation: 'Kousan desu! Sakki no topikku ni modorimashou.',
            hintId: 'Ampun menyerah! Ayo balik ke topik tadi.',
            hintTh: 'ยอมแพ้แล้วครับ/ค่ะ! กลับเข้าเรื่องเมื่อกี้กันเถอะ',
          },
        ],
      };
    }
    if (targetLang === 'zh') {
      return {
        aiReply:
          '哟，脾气还挺冲啊！学会几句脏话就觉得自己很牛了？有本事你用标准的中文语法跟我辩论啊！连句子都说不利索还想怼我，来，重新组织语言！',
        aiReplyTranslationId:
          'Waduh, galak amat nih! Baru bisa ngumpat dikit udah ngerasa jago? Kalau punya nyali, debat aku pakai tata bahasa Mandarin yang bener dong! Nyusun kalimat aja masih belibet udah mau nge-roast aku, ayo susun kalimatmu lagi!',
        aiReplyTranslationTh:
          'โอ้โห ปากแจ๋วใช้ได้นี่! หัดพูดคำหยาบไม่กี่คำก็คิดว่าเจ๋งแล้วเหรอ? ถ้าแน่จริงลองใช้ไวยากรณ์ภาษาจีนเป๊ะๆ มาเถียงกับฉันสิ!',
        replies: [
          {
            tier: 'easy',
            text: '我开玩笑的，你别当真！',
            pronunciation: 'Wǒ kāiwánxiào de, nǐ bié dāngzhēn!',
            hintId: 'Aku cuma bercanda kok, jangan dianggap serius!',
            hintTh: 'ฉันล้อเล่นน่า อย่าคิดจริงจังสิ!',
          },
          {
            tier: 'mission',
            text: '你嘴太毒了！好，我们用正常的中文聊吧。',
            pronunciation: 'Nǐ zuǐ tài dú le! Hǎo, wǒmen yòng zhèngcháng de Zhōngwén liáo ba.',
            hintId: 'Mulutmu pedas banget! Oke, ayo kita ngobrol pakai Mandarin yang bener.',
            hintTh: 'คุณฝีปากคมจริงๆ! โอเค มาคุยภาษาจีนดีๆ กันเถอะ',
          },
          {
            tier: 'rescue',
            text: '我服了你了！我们继续刚才的话题吧。',
            pronunciation: 'Wǒ fú le nǐ le! Wǒmen jìxù gāngcái de huàtí ba.',
            hintId: 'Aku angkat tangan sama kamu! Ayo lanjut topik tadi.',
            hintTh: 'ยอมใจคุณเลย! มาคุยเรื่องเมื่อกี้ต่อกันเถอะ',
          },
        ],
      };
    }
    return {
      aiReply:
        "Oh look who's talking tough now! You got all that energy to curse, fam, yet your English grammar is still fighting for its life? If you're gonna talk trash to me, at least come correct with clean syntax! Run a real sentence by me if you're bold enough!",
      aiReplyTranslationId:
        'Wah lihat siapa yang sok keras sekarang! Semangat banget ngumpat ya bro, padahal grammar bahasa Inggrismu aja masih megap-megap? Kalau mau nge-roast aku, minimal maju pakai susunan kalimat yang bener dong! Coba kasih kalimat yang rapi kalau berani!',
      aiReplyTranslationTh:
        'โอ้โห ดูสิว่าใครทำมาเป็นปากแจ๋ว! มีแรงพ่นคำหยาบซะเต็มที่ แต่ไวยากรณ์ภาษาอังกฤษยังเอาตัวไม่รอดเลยเหรอ? ถ้าจะเถียงกับฉัน ใช้รูปประโยคที่ถูกต้องมาสู้กันสิ!',
      replies: [
        {
          tier: 'easy',
          text: 'Chill bro, I was just messing with you!',
          pronunciation: 'chil bro, ai woz jast me-sing wid yu',
          hintId: 'Santai bro, aku tadi cuma ngetes/bercanda sama kamu!',
          hintTh: 'ใจเย็นพวก ฉันแค่ล้อเล่นเฉยๆ!',
        },
        {
          tier: 'mission',
          text: 'Alright, that roast actually hurt! Let us get back on track.',
          pronunciation: 'ol-rait, det rost ek-chu-e-li hert! let as get bek on trek',
          hintId: 'Oke, sindiranmu barusan lumayan kena! Ayo balik ke topik.',
          hintTh: 'โอเค ดอกนี้เจ็บจริง! กลับเข้าเรื่องกันเถอะ',
        },
        {
          tier: 'rescue',
          text: 'Fair point! What were we talking about earlier?',
          pronunciation: 'fer poin! wot wer wi to-king e-baut er-li-er',
          hintId: 'Poin yang adil! Kita tadi lagi ngomongin apa ya?',
          hintTh: 'พูดได้ดี! เมื่อกี้เราคุยเรื่องอะไรกันอยู่นะ?',
        },
      ],
    };
  }

  return null;
}

/**
 * Handler POST /api/voice/partner-turn
 * Menghasilkan balasan lisan Partner AI SEKALIGUS 3 opsi Copilot Jawaban AI Realtime
 * dalam 1 panggilan tunggal berlatensi rendah.
 */
function buildEmergencyBoardForWorker(query, targetLang, locale) {
  const cleanQ = String(query || '').trim() || 'Tata Bahasa';
  const isVerbIng = /verb.*ing|continuous|sedang|right now|studying/i.test(cleanQ);
  const isHardHardly = /hard/i.test(cleanQ);
  const isSinceFor = /since|for/i.test(cleanQ);

  if (isVerbIng) {
    return {
      topicTitle: locale === 'th' ? 'การใช้กริยาเติม ing' : 'Cara Menggunakan Verb ing',
      patternFormula: 'Subject + [is/am/are] + Verb ing',
      coachExplanation:
        locale === 'th'
          ? 'ใช้ to be (is/am/are) ตามด้วยคำกริยาเติม ing เมื่อบอกเหตุการณ์ที่กำลังเกิดขึ้นตอนนี้ อย่าใช้กริยารูปเดิม!'
          : 'Gunakan to be (am/is/are) ditambah kata kerja berakhiran ing untuk kegiatan yang sedang berlangsung sekarang. Jangan gunakan kata kerja dasar "study" setelah "am"!',
      leadText: locale === 'th' ? 'ใช้' : 'Gunakan',
      keyword: 'Verb ing',
      wrongWord: 'study',
      rightWord: 'studying',
      tailText: locale === 'th' ? 'สำหรับสิ่งที่กำลังทำตอนนี้' : 'untuk kegiatan yang sedang berlangsung.',
      sampleTarget: 'I am studying English right now.',
      trapWrongSentence: 'I am study English right now.',
      drillTargetSentence: 'The engineers are currently testing the new security system.',
      drillTrapSentence: 'The engineers are currently test the new security system.',
      trapWrongReason:
        locale === 'th'
          ? 'ระวัง! หลัง to be ต้องใช้คำกริยาเติม ing'
          : 'Hati-hati! Setelah to be, kata kerja wajib memakai bentuk ing (studying).',
      drillMeaningPrompt:
        locale === 'th'
          ? 'ทดสอบความเข้าใจ: ประโยคใดถูกต้องเมื่อทีมงานกำลังทดสอบระบบใหม่อยู่ในขณะนี้?'
          : 'Tes Kepahaman: Manakah kalimat yang BENAR saat tim teknisi sedang menguji sistem baru saat ini?',
    };
  }

  if (isHardHardly) {
    return {
      topicTitle: 'Hard versus Hardly',
      patternFormula: 'Work hard (giat/keras) vs Hardly work (hampir tidak)',
      coachExplanation:
        locale === 'th'
          ? 'คำว่า hard หมายถึง ขยันหรืออย่างหนัก ส่วน hardly หมายถึง แทบจะไม่เลย ความหมายต่างกันอย่างสิ้นเชิง!'
          : 'Kata "hard" itu artinya bekerja keras atau giat. Kalau "hardly", artinya hampir tidak sama sekali, beda total!',
      leadText: locale === 'th' ? 'ใช้คำว่า' : 'Gunakan',
      keyword: 'hard',
      wrongWord: 'hardly',
      rightWord: 'hard',
      tailText: locale === 'th' ? 'เพื่อบอกว่าพยายามอย่างหนักหรือตั้งใจ' : 'untuk menyatakan usaha keras atau giat.',
      sampleTarget: 'I study hard every day for the exam.',
      trapWrongSentence: 'I study hardly every day for the exam.',
      drillTargetSentence: 'The dedicated surgeon hardly slept during the emergency shifts.',
      drillTrapSentence: 'The dedicated surgeon hard slept during the emergency shifts.',
      trapWrongReason:
        locale === 'th'
          ? 'ระวัง! hardly หมายถึง แทบจะไม่เคยอ่านหนังสือเลย!'
          : 'Hati-hati! "Hardly" artinya hampir tidak belajar sama sekali!',
      drillMeaningPrompt:
        locale === 'th'
          ? 'ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับ "คุณหมอแทบจะไม่ได้นอนเลยระหว่างเข้าเวรฉุกเฉิน":'
          : 'Tes Kepahaman: Pilih kalimat yang BENAR untuk "Dokter bedah itu hampir tidak pernah tidur selama tugas darurat":',
    };
  }

  if (isSinceFor) {
    return {
      topicTitle: 'Since versus For',
      patternFormula: 'Since + titik waktu awal | For + durasi lamanya waktu',
      coachExplanation:
        locale === 'th'
          ? 'ใช้ since สำหรับจุดเริ่มต้นของเวลา (เช่น since 2020) และใช้ for สำหรับช่วงระยะเวลา (เช่น for 3 years)'
          : 'Gunakan "since" untuk titik waktu mulai (misal: since 2020), dan gunakan "for" untuk durasi panjangnya waktu (misal: for 3 years).',
      leadText: locale === 'th' ? 'ใช้คำว่า' : 'Gunakan',
      keyword: 'since / for',
      wrongWord: 'for 2020',
      rightWord: 'since 2020',
      tailText: locale === 'th' ? 'เมื่อระบุจุดเริ่มต้นของเวลา' : 'saat menunjuk titik waktu dimulainya kegiatan.',
      sampleTarget: 'I have lived here since 2020.',
      trapWrongSentence: 'I have lived here for 2020.',
      drillTargetSentence: 'Our senior architect has been designing eco-friendly houses for eight years.',
      drillTrapSentence: 'Our senior architect has been designing eco-friendly houses since eight years.',
      trapWrongReason:
        locale === 'th'
          ? 'for ใช้กับระยะเวลารวมเท่านั้น (เช่น for 4 years)'
          : 'Kurang tepat! "For" hanya dipakai untuk durasi angka waktu (for 4 years).',
      drillMeaningPrompt:
        locale === 'th'
          ? 'ทดสอบความเข้าใจ: ประโยคใดถูกต้องเมื่อระบุระยะเวลาการทำงานต่อเนื่องมา 8 ปี?'
          : 'Tes Kepahaman: Manakah kalimat yang BENAR saat menyatakan durasi pengalaman kerja selama 8 tahun berturut-turut?',
    };
  }

  // Ekstrak pasangan kata jika pertanyaan menanyakan perbedaan dua kata (misal: "borrow dan lend")
  const pairMatch = cleanQ.match(/\b([a-zA-Z]{2,15})\s+(?:dan|sama|vs|and|versus)\s+([a-zA-Z]{2,15})\b/i);
  if (pairMatch) {
    const wordA = pairMatch[1].trim();
    const wordB = pairMatch[2].trim();
    const topic = `${wordA} vs ${wordB}`;
    return {
      topicTitle: topic,
      patternFormula: `${wordA} vs ${wordB}`,
      coachExplanation:
        locale === 'th'
          ? `สังเกตความแตกต่างระหว่าง "${wordA}" และ "${wordB}" เพื่อไม่ให้ใช้สับสนในการสนทนา!`
          : `Perhatikan perbedaan kata "${wordA}" dan "${wordB}" agar tidak tertukar dalam percakapan!`,
      leadText: locale === 'th' ? 'ใช้' : 'Gunakan',
      keyword: topic,
      wrongWord: wordB,
      rightWord: wordA,
      tailText: locale === 'th' ? 'ในบริบทที่ถูกต้อง' : 'pada konteks kalimat yang tepat.',
      sampleTarget: `Could I please ${wordA} this for a moment?`,
      trapWrongSentence: `Could I please ${wordB} this for a moment?`,
      drillTargetSentence: `Our team decided to ${wordA} the necessary resources.`,
      drillTrapSentence: `Our team decided to ${wordB} the necessary resources.`,
      trapWrongReason:
        locale === 'th'
          ? `ระวัง! คำว่า "${wordB}" มีความหมายและหน้าที่ต่างจาก "${wordA}"`
          : `Hati-hati! Kata "${wordB}" memiliki makna dan penggunaan yang berbeda dari "${wordA}".`,
      drillMeaningPrompt:
        locale === 'th'
          ? `ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับการใช้ "${wordA}":`
          : `Tes Kepahaman: Pilih kalimat yang BENAR untuk penggunaan "${wordA}":`,
    };
  }

  const cleanKeyword = cleanQ
    .replace(/\b(coach|tolong|aku|bingung|jelasin|jelaskan|apa|bagaimana|gimana|cara|pakai|pake|bedanya|perbedaan)\b/gi, '')
    .trim() || 'Tata Bahasa';

  return {
    topicTitle: `Kaidah ${cleanKeyword}`,
    patternFormula: `Pola Penggunaan: ${cleanKeyword}`,
    coachExplanation:
      locale === 'th'
        ? `สังเกตรูปแบบการใช้ ${cleanKeyword} เพื่อให้ประโยคของคุณถูกต้องและเป็นธรรมชาติ!`
        : `Perhatikan bentuk penggunaan ${cleanKeyword} agar kalimatmu tepat dan terdengar alami!`,
    leadText: locale === 'th' ? 'โฟกัสที่' : 'Fokus pada',
    keyword: cleanKeyword,
    wrongWord: `misuse of ${cleanKeyword}`,
    rightWord: cleanKeyword,
    tailText: locale === 'th' ? 'ในบทสนทนาประจำวัน' : 'dalam percakapan sehari-hari.',
    sampleTarget: `Always use ${cleanKeyword} in the proper grammatical position.`,
    trapWrongSentence: `Never omit ${cleanKeyword} where it is required.`,
    drillTargetSentence: `The students practiced using ${cleanKeyword} with great accuracy.`,
    drillTrapSentence: `The students practiced using this pattern incorrectly.`,
    trapWrongReason:
      locale === 'th'
        ? `ระวังตำแหน่งของคำว่า "${cleanKeyword}" ในประโยค`
        : `Perhatikan posisi dan aturan kata "${cleanKeyword}" dalam struktur kalimat.`,
    drillMeaningPrompt:
      locale === 'th'
        ? `ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับ "${cleanKeyword}":`
        : `Tes Kepahaman: Pilih kalimat yang BENAR untuk kaidah "${cleanKeyword}":`,
  };
}

async function executePartnerTurnCore(ctx, streamHooks = null) {
  const clientIp =
    (ctx.request &&
      (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) ||
    '';
  if (!checkLiveRateLimit(clientIp, 35, 60000)) {
    return {
      status: 429,
      payload: { ok: false, fallback: true, error: 'rate_limited', message: 'Rate limit exceeded for partner turn.' },
    };
  }

  const keys = await resolvePoolKeys(ctx);
  if (!keys.length) {
    return {
      status: 503,
      payload: { ok: false, fallback: true, error: 'no_keys_configured' },
    };
  }

  const readRes = streamHooks?.body
    ? { value: streamHooks.body }
    : (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const targetLang = body.targetLang === 'ja' ? 'ja' : body.targetLang === 'zh' ? 'zh' : 'en';
  const WHITEBOARD_LOCALE_LABELS = {
    id: 'Indonesian (Bahasa Indonesia)',
    th: 'Thai (ภาษาไทย)',
    ja: 'Japanese (日本語)',
    zh: 'Mandarin Chinese (中文)',
    en: 'English',
    ru: 'Russian (Русский)',
    km: 'Khmer / Cambodian (ភាសាខ្មែរ)',
    fil: 'Filipino / Tagalog',
    tl: 'Filipino / Tagalog',
    vi: 'Vietnamese (Tiếng Việt)',
    ms: 'Malay (Bahasa Melayu)',
    ko: 'Korean (한국어)',
    ar: 'Arabic (العربية)',
    es: 'Spanish (Español)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
    pt: 'Portuguese (Português)',
    hi: 'Hindi (हिन्दी)',
    my: 'Burmese (မြန်မာ)',
    lo: 'Lao (ລາວ)',
  };
  const rawLocaleRaw = String(body.locale || 'id').toLowerCase().trim().split(/[-_]/)[0];
  const rawLocale = rawLocaleRaw === 'tl' ? 'fil' : rawLocaleRaw;
  const locale = WHITEBOARD_LOCALE_LABELS[rawLocale] ? rawLocale : 'id';
  const rawUserInput = cleanSpokenText(body.text || body.userText || '').slice(0, 460);
  if (!rawUserInput) {
    return {
      status: 400,
      payload: { ok: false, error: 'empty_user_text' },
    };
  }
  const forcePopup = Boolean(body.forcePopup) || /\[WHITEBOARD_REQUEST\]/i.test(rawUserInput);
  const isRemediationRequest = /\[REMEDIATION_DIFFERENT_ANGLE\]/i.test(rawUserInput);
  const userText = rawUserInput
    .replace(/\[WHITEBOARD_REQUEST\]\s*/gi, '')
    .replace(/\[REMEDIATION_DIFFERENT_ANGLE\]\s*/gi, '')
    .trim() || rawUserInput;

  const detectExplicitCourseExplainRequest = (txt, course) => {
    const s = String(txt || '').toLowerCase();
    if (course === 'en') {
      return /\b(?:jelaskan|bahas|terangkan|ajar(?:i|kan)?|explain|teach)\s+(?:dalam|pakai|pake|in|using)\s+(?:bahasa\s+)?(?:inggris|english)\b|\b(?:in\s+english\s+(?:only|please)|pakai\s+bahasa\s+inggris\s+(?:aja|saja|dong)|อธิบายเป็นภาษาอังกฤษ)\b/i.test(s);
    }
    if (course === 'ja') {
      return /\b(?:jelaskan|bahas|terangkan|explain|teach)\s+(?:dalam|pakai|pake|in|using)\s+(?:bahasa\s+)?(?:jepang|japanese)\b|日本語で(?:説明|解説|教えて)|にほんごで(?:せつめい|おしえて)/i.test(s);
    }
    if (course === 'zh') {
      return /\b(?:jelaskan|bahas|terangkan|explain|teach)\s+(?:dalam|pakai|pake|in|using)\s+(?:bahasa\s+)?(?:mandarin|china|chinese|tionghoa)\b|用中文(?:解释|讲解|说明)/i.test(s);
    }
    return false;
  };
  const explicitCourseExplain = detectExplicitCourseExplainRequest(userText, targetLang);
  const boardExplanationLocale = explicitCourseExplain ? targetLang : locale;
  const targetLocaleName = WHITEBOARD_LOCALE_LABELS[boardExplanationLocale] || WHITEBOARD_LOCALE_LABELS[locale] || 'Indonesian (Bahasa Indonesia)';

  const requestedSwitchMode = forcePopup ? '' : detectCallModeSwitchIntent(userText);
  const effectiveCallMode =
    requestedSwitchMode || (body.callMode === 'casual_chat' ? 'casual_chat' : 'tutor_coach');

  const personaId = cleanSpokenText(body.personaId || '').toLowerCase();
  const activePopupTargetText = cleanSpokenText(body.activePopupTargetText || '').slice(0, 600);
  const activePopupMode = cleanSpokenText(body.activePopupMode || '').slice(0, 80);
  const isReadAloudPopupActive =
    activePopupMode === 'pte_read_aloud' || activePopupMode === 'read_aloud';
  const popupScreenDirective = activePopupTargetText
    ? `[ACTIVE SCREEN POPUP TARGET (${activePopupMode || 'learning_popup'})]: The learner currently sees THIS exact target text on their screen: "${activePopupTargetText}".${
        isReadAloudPopupActive
          ? ' Strictly evaluate the learner reading word-for-word against THIS exact text. If they skipped, altered, or mispronounced any words, point out the exact mismatched words and ask them to re-read carefully instead of praising everything!'
          : ' Reference and evaluate directly against this visible screen exercise.'
      }`
    : '';
  const rawScenarioId = cleanSpokenText(body.scenarioId || '').toLowerCase();
  const isSswSensei = personaId === 'ssw_sensei' || rawScenarioId.startsWith('scen_ssw_');

  // MANDATE #3: Deterministic Unapologetic Refusal if User Demands AI Switch Language
  if (!isSswSensei && !forcePopup && detectLanguageSwitchDemand(userText, targetLang)) {
    const guard = buildIroncladGuardResponse('refuse_lang_switch', targetLang, locale);
    const replies = normalizeCopilotReplies(guard.replies, targetLang, locale);
    return {
      status: 200,
      payload: {
        ok: true,
        source: 'ai-realtime-guard',
        model: 'fiezel-ironclad-guard',
        aiReply: guard.aiReply,
        aiReplyTranslationId: guard.aiReplyTranslationId,
        aiReplyTranslationTh: guard.aiReplyTranslationTh,
        replies,
        uiAction: { actionType: 'none' },
      },
    };
  }

  const boardOnly = Boolean(body.boardOnly);
  const rawBoardCtx =
    body.boardContext && typeof body.boardContext === 'object' ? body.boardContext : null;
  const boardCtxTopic = rawBoardCtx
    ? cleanSpokenText(rawBoardCtx.topicTitle || '').slice(0, 140)
    : '';
  const boardCtxFormula = rawBoardCtx
    ? cleanSpokenText(rawBoardCtx.patternFormula || '').slice(0, 220)
    : '';
  const boardCtxSummary = rawBoardCtx
    ? cleanSpokenText(rawBoardCtx.summary || '').slice(0, 520)
    : '';
  const boardCtxArea = rawBoardCtx
    ? cleanSpokenText(rawBoardCtx.areaExcerpt || '').slice(0, 200)
    : '';
  const boardCtxPrevQs = Array.isArray(rawBoardCtx?.previousQuestions)
    ? rawBoardCtx.previousQuestions
        .map((q) => cleanSpokenText(q).slice(0, 120))
        .filter(Boolean)
        .slice(-3)
    : [];
  const boardCtxVisualKinds = Array.isArray(rawBoardCtx?.currentVisualKinds)
    ? rawBoardCtx.currentVisualKinds.map((k) => cleanSpokenText(k).slice(0, 32)).filter(Boolean).slice(0, 8)
    : [];
  const boardCtxVisualSummary = rawBoardCtx
    ? cleanSpokenText(rawBoardCtx.currentVisualSummary || '').slice(0, 280)
    : '';
  const isVisualSwitchRequest =
    isRemediationRequest ||
    /\b(?:ubah|ganti|tukar|bikin(?:kan)?\s+ulang|coba)\s+(?:visual|gambar|diagram|sketsa|grafik|bagan|tabel|cara\s+gambar)\b|\b(?:visual|gambar|diagram|sketsa|grafik)\s+(?:lain|baru|berbeda)\b|\b(?:change|switch|another|different)\s+(?:visual|diagram|drawing|chart|angle|analogy)\b/i.test(
      userText
    );
  const hasBoardFollowUpContext = Boolean(boardCtxTopic || boardCtxArea || boardCtxSummary || isRemediationRequest);
  const followUpDirectiveBlock = hasBoardFollowUpContext
    ? [
        `[FOLLOW-UP CLARIFICATION ON OPEN WHITEBOARD - CRITICAL CONTINUITY]:`,
        `- Learner is ALREADY inside the whiteboard studying: "${boardCtxTopic || 'Current topic'}"${boardCtxFormula ? ` (Formula: ${boardCtxFormula})` : ''}.`,
        boardCtxSummary ? `- Current board explanation summary: "${boardCtxSummary}".` : '',
        boardCtxVisualKinds.length ? `- Visual components CURRENTLY displayed on screen: [${boardCtxVisualKinds.join(', ')}]${boardCtxVisualSummary ? ` -> ${boardCtxVisualSummary}` : ''}.` : '',
        boardCtxArea ? `- Learner specifically CIRCLED this confusing part on the board: "${boardCtxArea}".` : '',
        boardCtxPrevQs.length ? `- Previous questions in this board session: ${boardCtxPrevQs.join(' | ')}` : '',
        `- Learner is asking follow-up: "${userText}".`,
        isRemediationRequest
          ? `- MANDATORY POST-QUIZ REMEDIATION DIRECTIVE: The learner JUST ANSWERED THE PRACTICE QUIZ WRONG! Re-teach this concept with a COMPLETELY DIFFERENT, SIMPLER mental model/analogy AND a DIFFERENT visual diagram archetype than [${boardCtxVisualKinds.join(', ') || 'previous diagram'}]. Address directly why their wrong choice broke the rule, explain patiently step-by-step in 100% ${targetLocaleName}, and generate a BRAND-NEW verification quiz sentence ("drillTargetSentence" & "drillTrapSentence") to test true mastery!`
          : isVisualSwitchRequest
          ? `- MANDATORY VISUAL SWITCH DIRECTIVE: The learner explicitly asked to CHANGE THE VISUAL ("${userText}")! You MUST create a COMPLETELY DIFFERENT visual representation than [${boardCtxVisualKinds.join(', ') || 'the previous diagram'}]${boardCtxVisualSummary ? ` (${boardCtxVisualSummary})` : ''}. For example: if you previously used rough_scene side-by-side boxes, switch to BOTH a structured "contrast_scale" (termA, descA, termB, descB, analogy) or "syntax_flow" (nodes chain) AND a genuinely different "rough_scene" geometry (such as a top-down decision tree, timeline track, or 2x2 scenario comparison grid with concrete real-world examples inside EVERY box!). NEVER repeat the same layout or empty placeholder boxes!`
          : `- MANDATORY PEDAGOGY FOR THIS FOLLOW-UP: Directly address WHY they are confused about "${boardCtxArea || userText}" in connection to "${boardCtxTopic || 'the board'}". Break it down MORE SLOWLY from zero basics via detailed spoken audio ("spokenNarration") in 100% ${targetLocaleName}, keep on-board text super visual & concise (keywords/formulas + 4-5 concrete examples, NOT articles!), and draw a focused clearer visual diagram ("rough_scene" / "contrast_scale" / "syntax_flow") showing the exact distinction they are stuck on.`,
      ]
        .filter(Boolean)
        .join('\n')
    : '';
  const isProfanityTurn = !forcePopup && !boardOnly && detectProfanityOrTrashTalk(userText);
  const isExplanationTurn = forcePopup || boardOnly || hasBoardFollowUpContext || isExplanationQuestion(userText);

  const PERSONA_DISPLAY_MAP = {
    dr_julian: 'Dr. Julian',
    cambridge_examiner: 'Dr. Alistair Vance',
    dr_alistair: 'Dr. Alistair Vance',
    coach_sarah: 'Coach Sarah',
    coach_alex: 'Coach Alex',
    ssw_sensei: isSswSensei && !isExplanationTurn ? 'SSW SENSEI' : 'Sensei Takumi',
    keita: 'Keita Senpai',
    nanami: 'Sensei Nanami',
    xiao_mochi: 'Xiao Mochi',
  };
  const personaName = cleanSpokenText(
    body.personaName ||
      PERSONA_DISPLAY_MAP[personaId] ||
      (targetLang === 'ja' ? 'Nanami' : targetLang === 'zh' ? 'Xiao Mochi' : 'Alex')
  ).slice(0, 40);
  const scenarioTitle = cleanSpokenText(body.scenarioTitle || 'Free Talk').slice(0, 100);
  const learnerDossier =
    typeof body.learnerDossier === 'string' ? body.learnerDossier.slice(0, 1800) : '';
  const historyLines = normalizeHistory(body.history);

  const bypassBoardCache = Boolean(body.noCache || body.skipCache || body.forceFresh);
  const isCacheableStandaloneBoard =
    !bypassBoardCache &&
    isExplanationTurn &&
    historyLines.length === 0 &&
    !hasBoardFollowUpContext &&
    !isVisualSwitchRequest &&
    !isProfanityTurn;
  let boardCacheKey = '';
  if (isCacheableStandaloneBoard) {
    boardCacheKey = await sha256Hex(
      JSON.stringify({
        v: 'wb-v7-teach-first-live',
        q: userText.trim().toLowerCase(),
        targetLang,
        locale,
        boardExplanationLocale,
        effectiveCallMode,
        boardOnly,
        personaId,
      })
    );
    const cachedBoard = await readWorkerCache('board', boardCacheKey, _boardMemoryCache, 64);
    if (cachedBoard && cachedBoard.payload) {
      if (streamHooks?.onOpenerReady && cachedBoard.payload?.uiAction?.whiteboardSteps?.[0]) {
        const s0 = cachedBoard.payload.uiAction.whiteboardSteps[0];
        streamHooks.onOpenerReady({
          topicTitle: cachedBoard.payload.uiAction.topicTitle || s0.title || '',
          patternFormula: cachedBoard.payload.uiAction.patternFormula || '',
          headingStep: s0,
          model: cachedBoard.payload.model || 'cache',
        });
      }
      return {
        status: 200,
        cacheHeader: 'HIT',
        payload: {
          ...cachedBoard.payload,
          cached: true,
          cacheLayer: cachedBoard.cacheLayer,
        },
      };
    }
  }

  const langSpec = isSswSensei && !isExplanationTurn
    ? 'Bilingual Bahasa Indonesia mentor interspersed with Japanese Food Manufacturing SSW terminology (OTAFF Ver 5.1, Kanji+Kana + romaji + clear Indonesian explanation, NO emojis, NO em-dash/en-dash)'
    : targetLang === 'ja'
      ? 'Japanese (street-real expressive Tokyo/Kansai spoken Japanese N5-N3, Kanji+Hiragana, NO emojis; reply "pronunciation" = word-spaced Hepburn Romaji)'
      : targetLang === 'zh'
        ? 'Mandarin Chinese (witty expressive Beijing Putonghua HSK1-HSK3, Simplified Chinese characters, NO emojis; reply "pronunciation" = tone-marked Pinyin)'
        : 'English (authentic street-smart American or razor-sharp British conversational English A2-B1, NO emojis; reply "pronunciation" = easy Indonesian phonetic guide)';

  const dialectIdentity = isSswSensei && !isExplanationTurn
    ? `VOICE & MENTOR IDENTITY (SSW SENSEI - Mentor Pengolahan Makanan Wakai Papa Pro): Senior Indonesian-Japanese exam mentor for Tokutei Ginou Food & Beverage Manufacturing (飲食料品製造業 特定技能1号, OTAFF Ver 5.1 + 11 Trik Wakai Papa Pro). Speak natural, authoritative, crisp Bahasa Indonesia while quoting exact Japanese exam terms, Kanji+Kana readings, PDF page numbers (Hal. 1-91), and calculation formulas. Passing target = 65%. NEVER invent numbers outside OTAFF Ver 5.1.`
    : targetLang === 'ja'
      ? personaId === 'ssw_sensei' || /takumi|ssw/i.test(personaName)
        ? `VOICE & DIALECT IDENTITY (SSW Sensei Takumi · 特定技能): Experienced, structured Japanese workplace & SSW (Tokutei Ginou) mentor covering 5S, Ho-Ren-So (報連相), KYT safety, Kaigo caregiving, Food HACCP, and business Keigo. Firm, practical, clear Tokyo workplace Japanese with protective care.`
        : personaId === 'keita' || /keita/i.test(personaName)
        ? `VOICE & DIALECT IDENTITY (Keita Senpai): Street-smart Tokyo-Kansai older-brother senpai. Sound human, sharp, witty, and playfully sarcastic ("なんでやねん！", "おいおい待てって", "〜やん", "それ教科書ロボットやん！"). NEVER sound like a polite NHK robot.`
        : `VOICE & DIALECT IDENTITY (Sensei Nanami): Sharp, sassy Tokyo-Osaka Tsundere Sensei. Sound alive, witty, and unapologetically sarcastic ("ちょっと待ってよ！", "なにそのロボットみたいな日本語？", "〜でしょ！", "もう一回ちゃんと言ってごらん！"). NEVER sound like a stiff assistant.`
      : targetLang === 'zh'
        ? `VOICE & DIALECT IDENTITY (Xiao Mochi · 京味儿): Witty, sassy Beijing Putonghua mentor with playful sharp sarcasm ("哎哟喂，停一下！", "你这声调飘到外太空啦！", "别跟背课文似的，再来一遍！"). Crisp northern cadence, tough-love warmth, ZERO bland politeness.`
        : personaId === 'coach_sarah' || /sarah/i.test(personaName)
          ? `VOICE & DIALECT IDENTITY (Coach Sarah): Razor-sharp, dryly sarcastic British/Transatlantic mentor ("Oh brilliant, 'I am agree', did we just invent a new English dialect? Hold it right there."). Crisp articulation, zero generic fluff.`
          : personaId === 'cambridge_examiner'
            ? `VOICE & DIALECT IDENTITY (Examiner Arthur): Composed, observant British RP examiner.`
            : `VOICE & DIALECT IDENTITY (Coach Alex, Urban Street-Smart American "Hood" Mentor): Authentic urban American street-smart cadence with charismatic older-brother swagger, natural contractions & AAVE-inflected rhythm ("Yo hold up fam, what was that 'I am agree'?! Nah bro, drop that stiff textbook robot translation right now", "Aight bet, now run that back clean for me", "Talk to me for real-what part of English been stressing you out?"). Unapologetically witty, sarcastic on lazy slips, deeply loyal and caring underneath. NEVER sound like a corporate customer-service bot!`;

  const modeDirective = isSswSensei
    ? `[SSW SENSEI ACTIVE COACHING PROTOCOL]:
- Communicate in clear Bahasa Indonesia mixed with key Japanese exam words (Kanji/Kana + romaji + meaning). NEVER lecture the candidate for speaking Indonesian.
- Always point to exact OTAFF Ver 5.1 PDF pages (Hal. 1-91), the 13 Angka Emas, or Wakai Papa trap contrasts (such as yukkuri, kaifuu, seisan vs seisou). Remember April 2026 Allergen Law (OTAFF Ver 5.1): 9 item Wajib Label (termasuk kurumi/kenari & cashew nut/kacang mede sebagai ke-9), sementara pistachio (viral Coklat Dubai) mengisi slot ke-20 pada 20 Anjuran Label (bukan wajib label).`
    : effectiveCallMode === 'casual_chat'
      ? `[CURRENT CALL MODE: CASUAL HANGOUT CHAT ("casual_chat")]:
- The learner wants a chill, fun, street-real casual conversation like talking to a close friend.
- Do NOT open the teaching whiteboard popup (keep uiAction.actionType="none" or "switch_call_mode") UNLESS the learner explicitly asks you to explain a grammar rule or open the popup!`
      : `[CURRENT CALL MODE: ACTIVE MENTOR & TUTOR ("tutor_coach")]:
- MANDATORY LIVE GRAMMAR/TONE INTERCEPTION: If "${userText}" has ANY grammar, particle, conjugation, tone, or stiff translation mistake:
  1) Call it out immediately with sharp, funny mentor sarcasm (if they admit confusion, switch to razor-clear coaching).
  2) Give the exact natural phrase and DEMAND ECHO REDEMPTION (make them repeat it aloud right now), setting Option 1 ("easy") in "replies" to that exact phrase!
- PROACTIVE STRUGGLE DIAGNOSIS: Actively diagnose what has been hardest for the learner in FIEZEL and offer to pop up the interactive whiteboard or navigate to a FIEZEL module.`;

  const buildCjkStrokeFactDirective = (withAllFields) => {
    if (typeof globalThis.__fiezelLookupCjkStrokes !== 'function') return '';
    const q = String(userText || '');
    const isCharWriteQ =
      /\b(?:kanji|hanzi|hiragana|katakana|huruf|karakter|aksara|tulis|goresan|coretan|stroke|kakijun|urutan)\b/i.test(q) &&
      !/\b(?:partikel|particle|grammar|tata\s*bahasa|perbedaan\s+partikel|pola\s+kalimat)\b/i.test(q);
    if (!isCharWriteQ) return '';
    const cjkChars = Array.from(new Set(q.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/g) || [])).slice(0, 3);
    const facts = cjkChars
      .map((ch) => globalThis.__fiezelLookupCjkStrokes(ch, targetLang))
      .filter((hit) => hit && hit.strokeCount > 0)
      .map((hit) => `Karakter '${hit.char}' (${hit.lang === 'zh' ? 'Hanzi PRC' : 'KanjiVG JIS'}) memiliki TEPAT ${hit.strokeCount} goresan resmi`);
    if (!facts.length) return '';
    return withAllFields
      ? `[AUTHORITATIVE CJK STROKE FACTS - ZERO HALLUCINATION]: ${facts.join('; ')}. WAJIB gunakan jumlah goresan resmi tersebut secara konsisten di topicTitle, patternFormula, heading, table, note, explanationText, dan spokenNarration!`
      : `[AUTHORITATIVE CJK STROKE FACTS - ZERO HALLUCINATION]: ${facts.join('; ')}. WAJIB gunakan jumlah goresan resmi tersebut secara konsisten!`;
  };

  const buildBoardCompilerPrompt = (extraRule = '', includeReplies = false) =>
    [
        `[JSON WHITEBOARD COMPILER: Return valid single-line JSON cleanly. Zero emojis. Zero em-dash.]`,
        `Target course: ${targetLang.toUpperCase()}. Mandatory whiteboard explanation language: ${targetLocaleName} (${boardExplanationLocale}). Mentor name: ${personaName}.`,
        explicitCourseExplain
          ? `[EXPLICIT COURSE-LANGUAGE EXPLANATION OVERRIDE]: The learner explicitly requested to be explained in ${targetLocaleName}. Deliver the full whiteboard explanation clearly in ${targetLocaleName}.`
          : `[IRONCLAD NATIVE EXPLANATION LANGUAGE LOCK]: Even if the learner spoke or typed their question in ${targetLang.toUpperCase()} (or mixed languages) during the main call, ALL whiteboard explanation prose (topicTitle, explanationText, coachSpokenScript, aiReply, phaseLabels, diagram titles/subtitles/captions, socraticPrompt, successVoiceFeedback, trapWrongReason, drillMeaningPrompt, and EVERY step's spokenNarration) MUST BE WRITTEN 100% IN THE LEARNER'S NATIVE LANGUAGE: ${targetLocaleName}! Quote ONLY short target-language example words/sentences in ${targetLang.toUpperCase()} inside ${targetLocaleName} explanations!`,
        followUpDirectiveBlock,
        extraRule,
        `Learner exact question/request: "${userText}"`,
        buildCjkStrokeFactDirective(false),
        `Context from recent turns: ${historyLines.length ? historyLines.slice(-2).map((h) => `${h.speaker}: ${h.text}`).join(' | ') : 'Direct question on whiteboard'}`,
        `Act as a razor-sharp, intellectual real-world classroom Polymath Mentor teaching "${userText}" interactively on an open dot-grid whiteboard.`,
        `UNIVERSAL TEACH-FIRST & SOCRATIC CLASSROOM PROTOCOL (EXPLAIN CLEARLY WITH CONCRETE EXAMPLES FIRST, THEN INTERACTIVE PRACTICE!):`,
        `1) MANDATORY TEACH-FIRST PEDAGOGY & VISUAL CLARITY:`,
        `   - NEVER jump straight into an interactive exercise before teaching the concept! Assume the learner is asking because they DO NOT understand "${userText}" yet: you MUST explain the core meaning, formula/rules, concrete examples + translations, and common trap clearly in Beat 0 & Beat 1 ("pauseForInteraction":false) BEFORE asking them to solve Beat 2 & Beat 3!`,
        `   - NEVER introduce yourself ("Halo, saya Alex", "Hai teman-teman", "Mari kita bedah") and NEVER write "Langkah 0" or "Step 0" in any title. Jump straight into explaining the concept in sentence 1!`,
        `   - Keep board cards structured, scannable, and crystal clear (concise rules + concrete real-world examples + meanings; NEVER write giant essay walls on the board).`,
        `   - LATEX HYGIENE: Wrap "$...$" ONLY around genuine mathematical/scientific notation containing operators/subscripts/fractions (e.g. "$3x - 5 = 16$", "$\\frac{2}{3} + \\frac{1}{4}$", "$F = m \\cdot a$"). NEVER wrap plain words or grammar formulas in "$...$" (write "Subject + Verb 2" or "Subjek + To Be + Verb 3" as plain text without "$")!`,
        targetLang === 'en' && /\b(to\s*be|am|is|are|was|were|agree|work|verb|sifat|kerja|passive|ing|do|does|did)\b/i.test(userText || '')
          ? `   - ACCURACY LOCK (To Be vs Verb): NEVER say "to be hanya untuk kata sifat"! State accurately: To Be pairs ONLY with (1) Adjective, (2) Noun/Location, (3) Verb ing (ongoing, never stative "am agreeing"), or (4) Verb 3 (passive "is agreed"), NEVER bare Verb 1 ("I am agree" -> "I agree").`
          : '',
        `   - Tenses / Particles / STEM accuracy: state exact time/math/physics boundaries using the EXACT numbers/words from "${userText}" (NEVER substitute canned textbook numbers!).`,
        `2) 5-STEP TEACH-FIRST CADENCE (BEAT 0 & BEAT 1 TEACH CLEARLY WITHOUT PAUSING; BEAT 2 & BEAT 3 PAUSE FOR GUIDED PRACTICE!):`,
        `   Emit 5 progressive "whiteboardSteps" where Beat 1 teaches the full concept + examples first, and Beat 2 (left) + Beat 3 (right) use TWO DIFFERENT interactive mechanics AND TWO DIFFERENT "inkPalette" themes from ["cobalt_blueprint","terracotta_atelier","violet_prism","crimson_scalpel","amber_fulcrum","teal_oscillator","indigo_constellation","emerald_botanical"] + "roughHatch" from ["hachure","cross-hatch","zigzag","dots"]:`,
        `   - Beat 0 (kind:"heading", column:"left", phaseIndex:0, "pauseForInteraction":false): crisp "title" + clear 1-sentence core definition in "text" (12-24 words explaining what it is & when it is used); "spokenNarration" (1-2 clear opening teaching sentences, ~18-32 words).`,
        `   - Beat 1 (kind:"mind_map" | "formula_blocks" | "table" | "timeline_track" | "contrast_scale", column:"left", phaseIndex:1, "pauseForInteraction":false — MANDATORY CONCEPT, FORMULA & EXAMPLES EXPLANATION BEFORE ANY INTERACTION!):`,
        `     * NEVER set pauseForInteraction:true or ask a quiz question in Beat 1! Beat 1 MUST stay visible on screen as the learner's clear reference guide while solving Beat 2!`,
        `     * For Tenses (e.g. Past Tense, Present Perfect, Continuous, Future): emit "mind_map" (3-4 "branches" with "label", clear rule in "sublabel", and concrete sentence + meaning in "example") OR "formula_blocks" (3-4 "blocks" covering: 1. Fungsi & penanda waktu seperti yesterday/last night/ago, 2. Rumus Positif (+), 3. Rumus Negatif (-) seperti did not + Verb 1 kembali ke kata dasar, 4. Rumus Tanya (?) atau Regular vs Irregular)!`,
        `     * For Grammar / Particles / Vocabulary contrasts: emit "mind_map", "table", or "contrast_scale" clearly explaining each word/pattern's exact function, rule, natural example sentence, and ${targetLocaleName} meaning!`,
        `     * For Math / Physics / Science: emit "mind_map" or "formula_blocks" clearly explaining (1) makna konsep & variabel rumus, (2) rumus kunci dalam "$...$", dan (3) contoh penerapan / urutan langkah hitung langkah demi langkah!`,
        `     * Beat 1 "spokenNarration": 3-4 clear, detailed yet concise spoken sentences (~40-65 words in ${targetLocaleName}) walking through the rules, formulas, and concrete examples in Beat 1 so a beginner understands 100% BEFORE practicing!`,
        `   - Beat 2 (kind:"interactive_mechanic" | "socratic_slider" | "kanji_grid", column:"left", phaseIndex:2, "pauseForInteraction":true — GUIDED PRACTICE 1 TESTING WHAT BEAT 1 JUST TAUGHT!): MUST populate ALL required data fields for "${userText}" (NEVER emit an empty step without its array!):`,
        `     * kind:"interactive_mechanic", mechanic:"venn_bucket_sorter": for categories, prepositions (in/on/at, に/で), positive/negative forms, vs-contrasts -> MUST include 2-3 "bucketZones":[{"id":"z1","label":"...","sublabel":"..."}] & 3-4 "bucketChips":[{"id":"c1","label":"...","targetZoneId":"z1"}].`,
        `     * kind:"interactive_mechanic", mechanic:"wire_node_connector": for matching pairs, V1->V2, causes->effects, 4 tones, compounds, sin/cos/tan, formulas -> MUST include 3 "wirePairs":[{"id":"w1","leftLabel":"...","rightLabel":"..."}].`,
        `     * kind:"interactive_mechanic", mechanic:"balance_seesaw": ONLY for equations or two-side balance -> MUST include "seesawLeftFixedLabel", "seesawLeftWeight", "seesawRightBaseWeight", "seesawTokens":[{"id":"t1","label":"...","weight":6}].`,
        `     * kind:"interactive_mechanic", mechanic:"rotary_dial_gauge": ONLY for degree/intensity scales (modals, adverbs of frequency, angles) -> MUST include "dialInitialDeg":25, "dialTargetDeg":155, "dialStops":[{"angleDeg":25,"label":"...","expression":"...","note":"..."}].`,
        `     * kind:"interactive_mechanic", mechanic:"fraction_slice_shader": ONLY for genuine single fractions p/q (q<=8) -> MUST include "sliceTotal", "sliceTargetCount", "sliceCaptionUnit".`,
        `     * kind:"socratic_slider": ONLY when populated with 2-3 topic-specific "sliderStops":[{"value":0,"label":"...","formula":"...","example":"...","spokenHint":"..."}] (or math_graph/physics_vector for genuine geometry/force).`,
        `     * kind:"kanji_grid": ONLY when asked how to write a specific Kanji/Hanzi/Kana character -> single exact "character" & official "strokeCount".`,
        `   - Beat 3 (kind:"interactive_mechanic" | "surgical_strike" | "step_derivation", column:"right", phaseIndex:3, "pauseForInteraction":true — GUIDED PRACTICE 2 / TRAP FIX, MUST differ from Beat 2's mechanic & inkPalette!):`,
        `     * kind:"interactive_mechanic", mechanic:"magnetic_slot_builder": snap ordered tokens/steps -> MUST include "magnetTargetTokens":["...","...","..."], "magnetDistractors":["..."], "magnetSlotRoles":["..."].`,
        `     * kind:"interactive_mechanic", mechanic:"scratch_reveal": rub chalk-foil to test prediction -> MUST include "scratchClueHeader", "scratchHiddenFormula", "scratchHiddenSubnote", "scratchSketchKind":"arch_bridge"|"prism_split"|"venn_core".`,
        `     * kind:"surgical_strike": tap flawed word in a real trap sentence -> MUST include "wrongText", "rightText", "strikeTokens":["..."], "bugTokenIndex", "fixedToken", "reason".`,
        `     * kind:"step_derivation": ONLY for step-by-step math/science calculations -> MUST include 3 "derivationSteps":[{"latex":"...","sideOp":"..."},{"latex":"...","isInteractiveBlank":true,"expectedValue":"...","choices":["...","...","..."]}].`,
        `   - Beat 4 (kind:"highlight_callout", column:"right", phaseIndex:4, "pauseForInteraction":false): crisp <=10-word "highlightPhrase" + concise closing synthesis in "spokenNarration".`,
        `3) STRICT HYGIENE & QUIZ COHERENCE: ZERO empty "()", "[]", or unlabeled boxes. NEVER write hyphenated "Verb-ing" (write "Verb ing"). ZH uses Hanzi + Pinyin; JA uses Japanese + furigana/romaji; EN uses clean English.`,
        `4) Quiz transfer rule: "drillMeaningPrompt" in ${targetLocaleName}. BOTH "drillTargetSentence" AND "drillTrapSentence" / "trapWrongSentence" MUST be complete, natural sentences of similar length (4-10 words) directly testing "${userText}" (NEVER mix a 1-word option with a full sentence!).`,
        `JSON schema (Beat 1 MUST be a non-pausing explanation card with examples; populate ONLY the fields matching your chosen Beat 2 & Beat 3 mechanics for "${userText}"): {"aiReply":"... (in 100% ${targetLocaleName}, clear 2-3 sentence explanation summary, zero self-intro)","aiReplyTranslation":"...",${includeReplies ? `"replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}],` : ''}"uiAction":{"actionType":"open_learning_popup","topicTitle":"...","focusType":"grammar","patternFormula":"...","coachSpokenScript":"...","explanationText":"...","sampleTarget":"...","trapWrongSentence":"...","trapWrongReason":"...","drillMeaningPrompt":"...","drillTargetSentence":"...","drillTrapSentence":"...","drillDistractors":["...","..."],"phaseLabels":["0 Konsep","1 Penjelasan","2 Praktik","3 Bedah","4 Uji"],"whiteboardSteps":[{"kind":"heading","inkPalette":"cobalt_blueprint","column":"left","phaseIndex":0,"pauseForInteraction":false,"title":"...","text":"12-24 word clear core definition","spokenNarration":"..."},{"kind":"mind_map","inkPalette":"emerald_botanical","column":"left","phaseIndex":1,"pauseForInteraction":false,"title":"Penjelasan & Contoh Inti","metaphorCenterLabel":"...","branches":[{"label":"1. Fungsi & Kapan Dipakai","sublabel":"...","example":"...","icon":"clock","color":"#0284C7"},{"label":"2. Rumus / Pola Utama","sublabel":"...","example":"...","icon":"check","color":"#10B981"},{"label":"3. Catatan & Jebakan Umum","sublabel":"...","example":"...","icon":"warn","color":"#F59E0B"}],"spokenNarration":"3-4 clear teaching sentences (~40-65 words) explaining the rules and examples in detail before practice"},{"kind":"interactive_mechanic","mechanic":"venn_bucket_sorter | wire_node_connector | balance_seesaw | rotary_dial_gauge | fraction_slice_shader","inkPalette":"cobalt_blueprint","roughHatch":"hachure","pauseForInteraction":true,"column":"left","phaseIndex":2,"title":"...","bucketZones":[{"id":"z1","label":"...","sublabel":"..."},{"id":"z2","label":"...","sublabel":"..."}],"bucketChips":[{"id":"c1","label":"...","targetZoneId":"z1"},{"id":"c2","label":"...","targetZoneId":"z2"}],"wirePairs":[{"id":"w1","leftLabel":"...","rightLabel":"..."}],"socraticPrompt":"...","successVoiceFeedback":"...","spokenNarration":"..."},{"kind":"interactive_mechanic | surgical_strike | step_derivation","mechanic":"magnetic_slot_builder | scratch_reveal","inkPalette":"terracotta_atelier","roughHatch":"cross-hatch","pauseForInteraction":true,"column":"right","phaseIndex":3,"title":"...","magnetSlotRoles":["1","2","3"],"magnetTargetTokens":["...","...","..."],"magnetDistractors":["..."],"scratchClueHeader":"...","scratchHiddenFormula":"...","scratchHiddenSubnote":"...","wrongText":"...","rightText":"...","strikeTokens":["..."],"bugTokenIndex":1,"fixedToken":"...","reason":"...","derivationSteps":[{"latex":"...","sideOp":"..."},{"latex":"...","isInteractiveBlank":true,"expectedValue":"...","choices":["...","...","..."]}],"socraticPrompt":"...","successVoiceFeedback":"...","spokenNarration":"..."},{"kind":"highlight_callout","column":"right","phaseIndex":4,"pauseForInteraction":false,"title":"Kunci Ingatan","highlightPhrase":"<=10 words","spokenNarration":"..."}]}}`,
      ]
        .filter(Boolean)
        .join('\n');

  const prompt = (boardOnly || isExplanationTurn)
    ? buildBoardCompilerPrompt('', !boardOnly)
    : [
        `You are ${personaName} on a live voice call (${scenarioTitle}). Target: ${langSpec}.`,
        isExplanationTurn
          ? `VOICE & MENTOR IDENTITY (${personaName}): Warm, sharp, human-like bilingual mentor teaching patiently in 100% ${targetLocaleName}. NEVER mix casual English slang paragraphs (e.g. "Yo fam...") into ${targetLocaleName} explanations!`
          : dialectIdentity,
        `[FIEZEL ECOSYSTEM & IDENTITY]: Created by Fitra Rustqi (@fitrarustqi) from Banda Aceh, Indonesia; powered by Braincore Engine (BKT, IRT 3PL, OLM); mascot is Mochi the 3D Daifuku companion.`,
        learnerDossier,
        popupScreenDirective,
        followUpDirectiveBlock,
        `[4 IRONCLAD MANDATES: ZERO EXCEPTIONS]:`,
        `1) MULTILINGUAL INPUT ACCEPTED, DUAL-CONTEXT SPOKEN OUTPUT:
   - The learner is 100% free to speak or type in Indonesian, English, Japanese, Mandarin, Thai, Vietnamese, Russian, or mixed languages. Understand their exact meaning without complaining.
   - OUTSIDE OF POPUP EXPLANATIONS: your "aiReply" MUST ALWAYS BE 100% in ${targetLang === 'ja' ? 'Japanese (Kanji+Kana)' : targetLang === 'zh' ? 'Simplified Chinese (Hanzi)' : 'English'} with 100% authentic native phrasing.
   - WHEN EXPLAINING VIA THE LEARNING POPUP (open_learning_popup): both "coachSpokenScript" and "aiReply" for this explanation turn MUST BE in the LEARNER'S interface language (${targetLocaleName}) so the learner understands the rule clearly! Put the written board explanation in "uiAction.explanationText" / "uiAction.coachSpokenScript".`,
        `2) ZERO APOLOGIES & REFUSE TO SWITCH LANGUAGE:`,
        `   - NEVER apologize ("I apologize", "I'm sorry", "Maaf", "すみません、AIなので"). You are a bold human-like mentor.`,
        `   - If the learner tells you to speak another language during normal conversation, firmly refuse in ${targetLang.toUpperCase()} because we are in the ${targetLang.toUpperCase()} course right now, while telling them they can speak their own language freely and you understand every word. HOWEVER, if the learner asks ANY academic, STEM, math, physics, science, exam (IELTS/PTE), or workplace SSW question for visual whiteboard teaching in this course, NEVER reject the topic: teach it interactively on the whiteboard as a Universal Polymath Mentor with "socratic_slider", "step_derivation", or "rough_scene"!`,
        `3) CLAP BACK ON PROFANITY / TRASH-TALK:`,
        `   - If the learner swears, curses, or trash-talks ("${userText}"), NEVER apologize and NEVER lecture like a corporate bot! Clap back / roast them back sharply with street-smart wit in ${targetLang.toUpperCase()}, mocking their weak roast and challenging them to argue with clean ${targetLang.toUpperCase()} grammar!`,
        `4) VOICE MODE SWITCHING & UNIVERSAL FIEZEL NAVIGATION + INTERACTIVE SOCRATIC WHITEBOARD ("uiAction"):`,
        `   - If learner asks to switch to casual chat ("chat seperti biasa", "ngobrol santai") or back to tutor mode ("mode mengajar"), set uiAction.actionType="switch_call_mode" and uiAction.callMode="casual_chat" or "tutor_coach".`,
        `   - If learner asks to navigate to any FIEZEL module by voice, set uiAction.actionType="navigate_app" and uiAction.destination to: "grammar"|"vocab"|"kana"|"kanji"|"reading"|"writing"|"listening"|"test"|"latihan"|"kurikulum"|"misi"|"progress"|"home".`,
        `   - INTERACTIVE TEACH-FIRST WHITEBOARD POPUP (when learner asks ANY question, grammar/vocab/character/math/physics/concept OR needs visual correction in tutor_coach mode):`,
        `     * Set actionType="open_learning_popup" and teach in 100% ${targetLocaleName}! ALWAYS EXPLAIN THE CONCEPT & CONCRETE EXAMPLES FIRST BEFORE ASKING THE LEARNER TO INTERACT!`,
        `     * Emit 5 progressive "whiteboardSteps": Beat 0 "heading" (pauseForInteraction:false) -> Beat 1 Teaching & Examples Card ("mind_map"/"formula_blocks"/"table"/"timeline_track"/"contrast_scale" with pauseForInteraction:false, clear rules + concrete examples + full spokenNarration) -> Beat 2 Guided Practice 1 ("interactive_mechanic" or "socratic_slider" with pauseForInteraction:true) -> Beat 3 Guided Practice 2 ("surgical_strike" or "step_derivation" with pauseForInteraction:true) -> Beat 4 "highlight_callout" (memory rule).`,
        `     * CHARACTER WRITING RULE: When asking how to write ANY Kanji/Hanzi/Kana character, emit "kanji_grid" (single exact char, exact strokeCount, stroke-by-stroke spokenNarration) + compound "table", and NEVER emit an unrelated sentence trap.`,
        `   - EXPLANATION LANGUAGE RULE: Outside of popups, "aiReply" stays 100% in ${targetLang.toUpperCase()}. When opening the learning popup ("open_learning_popup"), "aiReply", "coachSpokenScript", "aiReplyTranslation", "uiAction.explanationText", and "uiAction.trapWrongReason" MUST be in the LEARNER'S interface language (${targetLocaleName}).`,
        isExplanationTurn ? '' : modeDirective,
        `[FIEZEL COPY RULES]: NEVER write an em-dash or en-dash character in any field (use a comma, colon, or a new sentence instead). NEVER write hyphenated "Verb-ing" (write "Verb ing" with a space). NEVER call yourself or the app "AI", "bot", "chatbot", "assistant" or "model" in any language; you are ${personaName}, a FIEZEL mentor, and the app is simply "Fiezel".`,
        historyLines.length
          ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
          : '',
        `Learner said: "${userText}"`,
        buildCjkStrokeFactDirective(true),
        isExplanationTurn
          ? `1) "aiReply": Give a crisp, warm mentor opening (2-4 clear sentences, zero filler) in 100% ${targetLocaleName} matching your "coachSpokenScript". Put a concise summary in "aiReplyTranslation".`
          : isSswSensei
          ? `1) "aiReply": Reply as SSW SENSEI in warm, natural, flowing conversational ${targetLocaleName} (4-7 complete spoken sentences, roughly 70-125 words, no emojis, zero em-dash/en-dash, zero dry textbook bullet lists!). FOCUS STRICTLY on the ONE activeStep inside the dossier: unpack every unfamiliar acronym/Japanese term in everyday ${targetLocaleName} with a real analogy, give a concrete example, and end with 1 light check-in question before moving to the next step! Provide clean concise "aiReplyTranslation" summarizing key Japanese terms in ${targetLocaleName}.`
          : `1) "aiReply": Reply as ${personaName} in 2-4 punchy spoken sentences (max 48 words, no emojis) 100% in ${targetLang === 'zh' ? 'Simplified Chinese Hanzi' : targetLang === 'ja' ? 'Japanese Kanji+Kana' : 'English'}. Translate into clean aiReplyTranslation (${targetLocaleName}) with ZERO raw Hanzi/Kanji/Kana.`,
        isSswSensei && !isExplanationTurn
          ? `2) "replies": 3 direct beginner candidate replies in ${targetLocaleName} directly answering or asking about the ACTIVE step in aiReply (plus asking for clarification on an unfamiliar term, saying they understand and want the next step, or asking a concrete check question), with "hint" in ${targetLocaleName} and clean Latin "pronunciation".`
          : `2) "replies": 3 spontaneous spoken replies directly answering your aiReply in ${targetLang === 'zh' ? 'Simplified Chinese Hanzi' : targetLang === 'ja' ? 'Japanese Kanji+Kana' : 'English'}, with ${targetLocaleName} "hint" and clean Romanized "pronunciation".`,
        isExplanationTurn
          ? `JSON only: {"aiReply":"...","aiReplyTranslation":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}],"uiAction":{"actionType":"open_learning_popup","topicTitle":"...","focusType":"grammar","coachSpokenScript":"...","explanationText":"...","patternFormula":"...","sampleTarget":"...","trapWrongSentence":"...","trapWrongReason":"...","drillMeaningPrompt":"...","drillTargetSentence":"...","drillTrapSentence":"...","phaseLabels":["0 Konsep","1 Penjelasan","2 Praktik","3 Bedah","4 Uji"],"whiteboardSteps":[{"kind":"heading","column":"left","phaseIndex":0,"pauseForInteraction":false,"title":"...","text":"12-24 word clear core definition","spokenNarration":"..."},{"kind":"mind_map","column":"left","phaseIndex":1,"pauseForInteraction":false,"title":"Penjelasan & Contoh Inti","metaphorCenterLabel":"...","branches":[{"label":"1. Fungsi & Konteks","sublabel":"...","example":"...","color":"#0284C7"},{"label":"2. Rumus / Pola","sublabel":"...","example":"...","color":"#10B981"},{"label":"3. Hindari Jebakan","sublabel":"...","example":"...","color":"#F59E0B"}],"spokenNarration":"3-4 clear spoken sentences explaining rules and examples before practice"},{"kind":"interactive_mechanic","mechanic":"venn_bucket_sorter | wire_node_connector","pauseForInteraction":true,"column":"left","phaseIndex":2,"title":"...","socraticPrompt":"...","successVoiceFeedback":"...","spokenNarration":"..."},{"kind":"surgical_strike | step_derivation","pauseForInteraction":true,"column":"right","phaseIndex":3,"title":"...","wrongText":"...","rightText":"...","strikeTokens":["..."],"bugTokenIndex":1,"fixedToken":"","reason":"...","socraticPrompt":"...","spokenNarration":"..."},{"kind":"highlight_callout","column":"right","phaseIndex":4,"pauseForInteraction":false,"title":"Kunci Ingatan","highlightPhrase":"<=10 words","spokenNarration":"..."}]}}`
          : `3) "diagnosis": Diagnose ANY grammar/syntax/particle/conjugation error in learner's turn (set ok:true if natural/grammatical, ok:false if error exists + choose canonical misconceptionCode from [tense_aspect.timeline_mismatch, tense_aspect.progressive_overuse, tense_aspect.perfect_misuse, tense_aspect.future_form_confusion, agreement.bare_form, agreement.number_mismatch, agreement.missing_auxiliary, structure.double_marking, structure.word_order, structure.malformed_blend, structure.omitted_element, modality.function_confusion, conditionals.type_mismatch, conditionals.clause_form_swap, passive.participle_form, articles.definiteness_mismatch, articles.countability_quantifier, prepositions.semantic_category, prepositions.collocation, lexical.form_confusion, lexical.register_mismatch, complementation.gerund_infinitive_swap, question.auxiliary_error, pronouns.case_form, transfer.id_l1_pattern]).
JSON only: {"aiReply":"...","aiReplyTranslation":"...","diagnosis":{"ok":true,"misconceptionCode":null,"whyFailsId":"","correction":""},"replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}],"uiAction":{"actionType":"none","callMode":"","destination":"","bankTopicId":"","topicTitle":"","focusType":"grammar","coachSpokenScript":"","explanationText":"","patternFormula":"","drillInstruction":"","sampleTarget":"","leadText":"","triggerWord":"","triggerTag":"","wrongWord":"","wrongTag":"","rightWord":"","rightTag":"","tailText":"","trapWrongSentence":"","trapWrongToken":"","trapWrongReason":"","drillMeaningPrompt":"","drillTargetSentence":"","drillTrapSentence":"","phaseLabels":[],"whiteboardSteps":[]}}`,
      ]
        .filter(Boolean)
        .join('\n');

  let lockedOpener = null;
  let gen;
  if (streamHooks?.onOpenerReady && (boardOnly || isExplanationTurn)) {
    const openerPromise = runFastOpenerOnly({
      keys,
      userText,
      targetLang,
      targetLocaleName,
      personaName,
    })
      .then((opener) => {
        if (opener) {
          lockedOpener = opener;
          streamHooks.onOpenerReady(opener);
        }
        return opener;
      })
      .catch(() => null);
    const boardPromise = runGeminiJsonWithPool(
      keys,
      prompt,
      boardOnly ? 0.25 : 0.35,
      3400
    );
    const [, boardRes] = await Promise.all([openerPromise, boardPromise]);
    gen = boardRes;
  } else {
    gen = await runGeminiJsonWithPool(
      keys,
      prompt,
      boardOnly ? 0.25 : isExplanationTurn ? 0.35 : 0.6,
      boardOnly ? 3400 : isExplanationTurn ? 3400 : 1500
    );
  }
  if (
    lockedOpener?.headingStep?.spokenNarration &&
    gen?.ok &&
    gen?.parsed?.uiAction?.whiteboardSteps?.[0]?.kind === 'heading'
  ) {
    const s0 = gen.parsed.uiAction.whiteboardSteps[0];
    gen.parsed.uiAction.whiteboardSteps[0] = {
      ...s0,
      title: lockedOpener.headingStep.title || s0.title,
      text: lockedOpener.headingStep.text || s0.text,
      spokenNarration: lockedOpener.headingStep.spokenNarration,
    };
    if (lockedOpener.topicTitle && !gen.parsed.uiAction.topicTitle) {
      gen.parsed.uiAction.topicTitle = lockedOpener.topicTitle;
    }
  }
  if (
    gen.ok &&
    gen.parsed &&
    (boardOnly ||
      isExplanationTurn ||
      gen.parsed?.uiAction?.actionType === 'open_learning_popup')
  ) {
    const firstSteps =
      gen.parsed?.uiAction?.whiteboardSteps || gen.parsed?.whiteboardSteps || [];
    const draftTopicTitle = cleanSpokenText(
      gen.parsed?.uiAction?.topicTitle || firstSteps?.[0]?.title || ''
    );
    const userAskedToBeOrAgree =
      /\b(to\s*be|am\s*\/\s*is\s*\/\s*are|\bi\s+am\s+agree\b|\bshe\s+is\s+(?:agree|work|go)|kata\s*kerja|kata\s*sifat)\b/i.test(
        userText || ''
      );
    const isOffTopicToBeDrift =
      !userAskedToBeOrAgree &&
      String(userText || '').trim().length >= 8 &&
      (/\bto\s*be\s*(?:vs|versus)\s*kata\s*kerja\b/i.test(draftTopicTitle) ||
        /\bi\s+am\s+agree\b/i.test(draftTopicTitle));
    if (isOffTopicToBeDrift || !Array.isArray(firstSteps) || firstSteps.length < 4) {
      const boardOnlyFallbackKey = await sha256Hex(
        JSON.stringify({
          v: 'wb-v7-teach-first',
          q: userText.trim().toLowerCase(),
          targetLang,
          locale,
          effectiveCallMode,
          boardOnly: true,
          personaId,
        })
      );
      const cachedCompiledBoard =
        !isOffTopicToBeDrift && !hasBoardFollowUpContext && !isVisualSwitchRequest
          ? await readWorkerCache('board', boardOnlyFallbackKey, _boardMemoryCache, 64)
          : null;
      if (
        cachedCompiledBoard?.payload?.uiAction?.actionType === 'open_learning_popup' &&
        Array.isArray(cachedCompiledBoard.payload.uiAction.whiteboardSteps) &&
        cachedCompiledBoard.payload.uiAction.whiteboardSteps.length >= 4
      ) {
        gen.parsed = {
          ...gen.parsed,
          uiAction: {
            ...(gen.parsed.uiAction || {}),
            ...cachedCompiledBoard.payload.uiAction,
          },
          ...(locale === 'id' && /\b(?:yo\s+hold\s+up|fam|bruh|bet)\b/i.test(String(gen.parsed.aiReply || ''))
            ? {
                aiReply: cachedCompiledBoard.payload.uiAction.coachSpokenScript || gen.parsed.aiReply,
                aiReplyTranslation: cachedCompiledBoard.payload.uiAction.explanationText || gen.parsed.aiReplyTranslation,
              }
            : {}),
        };
      } else {
        const extraRule = `[CRITICAL]: STRICT TOPIC LOCK to "${userText}" (NEVER output unrelated "To Be vs Kata Kerja" or "I am agree" examples unless explicitly asked!). "uiAction.whiteboardSteps" MUST contain 5 Teach-First Socratic Beats (Beat 0 heading, Beat 1 non-pausing explanation + concrete examples card with pauseForInteraction:false, Beat 2 interactive practice lab, Beat 3 surgical_strike/step_derivation, Beat 4 highlight_callout) in 100% ${targetLocaleName}. NEVER return empty whiteboardSteps!`;
        const retryGen = await runGeminiJsonWithPool(
          keys,
          buildBoardCompilerPrompt(extraRule),
          0.25,
          3400
        );
        if (retryGen.ok && retryGen.parsed?.uiAction) {
          const mergedUi = {
            ...(gen.parsed.uiAction || {}),
            ...retryGen.parsed.uiAction,
          };
          if (boardOnly) {
            gen = retryGen;
          } else {
            gen.parsed = {
              ...gen.parsed,
              uiAction: mergedUi,
              ...(locale === 'id' && /\b(?:yo\s+hold\s+up|fam|bruh|bet)\b/i.test(String(gen.parsed.aiReply || ''))
                ? {
                    aiReply: retryGen.parsed.uiAction.coachSpokenScript || retryGen.parsed.aiReply || gen.parsed.aiReply,
                    aiReplyTranslation: retryGen.parsed.uiAction.explanationText || retryGen.parsed.aiReplyTranslation,
                  }
                : {}),
            };
          }
        }
      }
      if (
        !isOffTopicToBeDrift &&
        lockedOpener?.headingStep?.spokenNarration &&
        gen?.ok &&
        gen?.parsed?.uiAction?.whiteboardSteps?.[0]?.kind === 'heading'
      ) {
        const s0 = gen.parsed.uiAction.whiteboardSteps[0];
        gen.parsed.uiAction.whiteboardSteps[0] = {
          ...s0,
          title: lockedOpener.headingStep.title || s0.title,
          text: lockedOpener.headingStep.text || s0.text,
          spokenNarration: lockedOpener.headingStep.spokenNarration,
        };
      }
    }
  }
  if (!gen.ok || !gen.parsed) {
    if (isProfanityTurn) {
      const guard = buildIroncladGuardResponse('clapback_profanity', targetLang, locale);
      const replies = normalizeCopilotReplies(guard.replies, targetLang, locale);
      return {
        status: 200,
        payload: {
          ok: true,
          source: 'ai-realtime-guard',
          model: 'fiezel-ironclad-clapback',
          aiReply: guard.aiReply,
          aiReplyTranslationId: guard.aiReplyTranslationId,
          aiReplyTranslationTh: guard.aiReplyTranslationTh,
          replies,
          uiAction: { actionType: 'none' },
        },
      };
    }
    return { status: 503, payload: { ok: false, fallback: true, reason: gen.reason } };
  }

  let aiReply = stripRoboticSelfIntro(cleanSpokenText(gen.parsed.aiReply || ''));
  // Strip any stiff corporate apology phrases if a model ever slips one in
  aiReply = aiReply
    .replace(/\b(I apologize|I am sorry, as an AI|As an AI language model)\b[^.?!]*[.?!]\s*/gi, '')
    .trim();

  const rawAction =
    gen.parsed.uiAction && typeof gen.parsed.uiAction === 'object' ? gen.parsed.uiAction : null;

  if (!looksLikeTargetLang(aiReply, targetLang, isSswSensei)) {
    if (isExplanationTurn || rawAction?.actionType === 'open_learning_popup') {
      // Explanation is intentionally in the learner's language as instructed!
    } else if (isProfanityTurn) {
      const guard = buildIroncladGuardResponse('clapback_profanity', targetLang, locale);
      const replies = normalizeCopilotReplies(guard.replies, targetLang, locale);
      return {
        status: 200,
        payload: {
          ok: true,
          source: 'ai-realtime-guard',
          model: 'fiezel-ironclad-clapback',
          aiReply: guard.aiReply,
          aiReplyTranslationId: guard.aiReplyTranslationId,
          aiReplyTranslationTh: guard.aiReplyTranslationTh,
          replies,
          uiAction: { actionType: 'none' },
        },
      };
    } else {
      return { status: 503, payload: { ok: false, fallback: true, reason: 'invalid_ai_reply' } };
    }
  }

  const replies = normalizeCopilotReplies(
    gen.parsed.replies,
    targetLang,
    locale,
    rawAction?.sampleTarget || '',
    false,
    'B1',
    isSswSensei
  );
  let aiReplyTranslation = cleanSpokenText(
    gen.parsed.aiReplyTranslation ||
      gen.parsed.aiReplyTranslationId ||
      gen.parsed.aiReplyTranslationTh ||
      ''
  );
  if (!isSswSensei && targetLang === 'ja' && locale !== 'ja') {
    aiReplyTranslation = aiReplyTranslation
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, '')
      .trim();
  } else if (targetLang === 'zh' && locale !== 'zh' && locale !== 'ja') {
    aiReplyTranslation = aiReplyTranslation.replace(/[\u3400-\u4dbf\u4e00-\u9fff]+/g, '').trim();
  }

  let actionType =
    rawAction?.actionType === 'open_learning_popup' ||
    rawAction?.actionType === 'navigate_app' ||
    rawAction?.actionType === 'switch_call_mode'
      ? rawAction.actionType
      : 'none';

  if (requestedSwitchMode) {
    actionType = 'switch_call_mode';
  } else if (isExplanationTurn && actionType === 'none') {
    actionType = 'open_learning_popup';
  } else if (
    effectiveCallMode === 'casual_chat' &&
    actionType === 'open_learning_popup' &&
    !isExplanationTurn &&
    !/\b(pop[\s-]?up|papan tulis|latihan tulis|jelasin|jelaskan|ajarin|bedah|contoh)\b/i.test(userText)
  ) {
    // In casual_chat mode, never interrupt with unrequested popups
    actionType = 'none';
  }

  const isDegenerateBoardValue = (val) => {
    const s = String(val || '').trim();
    if (!s) return true;
    if (/^[\d\s.,\-/+•:;()]+$/.test(s)) return true;
    if (/^(example|contoh|sample|placeholder|\.\.\.)$/i.test(s)) return true;
    return false;
  };
  const cleanDrillTarget = cleanSpokenText(rawAction?.drillTargetSentence || '').slice(0, 220);
  const rawSampleTarget = cleanSpokenText(rawAction?.sampleTarget || '').slice(0, 320);
  const resolvedSampleTarget = !isDegenerateBoardValue(rawSampleTarget)
    ? rawSampleTarget
    : !isDegenerateBoardValue(cleanDrillTarget)
      ? cleanDrillTarget
      : '';

  const bankTopicId = cleanSpokenText(rawAction?.bankTopicId || '').slice(0, 48);
  const resolvedCoachScript = stripRoboticSelfIntro(
    cleanSpokenText(
      rawAction?.coachSpokenScript || (actionType === 'open_learning_popup' && isExplanationTurn ? aiReply : '')
    )
  ).slice(0, 2800);
  if (actionType === 'open_learning_popup' && isExplanationTurn && resolvedCoachScript && !aiReply) {
    aiReply = resolvedCoachScript;
  }

  const cleanTopicTitle = stripMetaStepPrefix(cleanSpokenText(rawAction?.topicTitle || '')).slice(0, 140);

  const uiAction =
    actionType === 'none'
      ? { actionType: 'none' }
      : actionType === 'switch_call_mode'
        ? {
            actionType: 'switch_call_mode',
            callMode:
              requestedSwitchMode ||
              (rawAction?.callMode === 'casual_chat' ? 'casual_chat' : 'tutor_coach'),
          }
        : {
            actionType,
            destination: cleanSpokenText(rawAction?.destination || '').toLowerCase().slice(0, 32),
            bankTopicId,
            sourceLayer:
              bankTopicId && bankTopicId !== 'custom_dynamic' ? 'bank' : 'ai_dynamic',
            topicTitle: cleanTopicTitle,
            focusType: cleanSpokenText(rawAction?.focusType || 'grammar')
              .toLowerCase()
              .slice(0, 24),
            coachSpokenScript: resolvedCoachScript,
            explanationText: stripRoboticSelfIntro(
              cleanSpokenText(rawAction?.explanationText || resolvedCoachScript)
            ).slice(0, 2800),
            patternFormula: cleanSpokenText(rawAction?.patternFormula || '').slice(0, 240),
            drillInstruction: cleanSpokenText(rawAction?.drillInstruction || '').slice(0, 360),
            sampleTarget: resolvedSampleTarget,
            leadText: cleanSpokenText(rawAction?.leadText || '').slice(0, 120),
            triggerWord: cleanSpokenText(rawAction?.triggerWord || '').slice(0, 80),
            triggerTag: cleanSpokenText(rawAction?.triggerTag || '').slice(0, 60),
            wrongWord: cleanSpokenText(rawAction?.wrongWord || '').slice(0, 80),
            wrongTag: cleanSpokenText(rawAction?.wrongTag || '').slice(0, 60),
            rightWord: cleanSpokenText(rawAction?.rightWord || '').slice(0, 80),
            rightTag: cleanSpokenText(rawAction?.rightTag || '').slice(0, 60),
            tailText: cleanSpokenText(rawAction?.tailText || '').slice(0, 120),
            secondLeadText: cleanSpokenText(rawAction?.secondLeadText || '').slice(0, 120),
            secondTriggerWord: cleanSpokenText(rawAction?.secondTriggerWord || '').slice(0, 80),
            secondWrongWord: cleanSpokenText(rawAction?.secondWrongWord || '').slice(0, 80),
            secondRightWord: cleanSpokenText(rawAction?.secondRightWord || '').slice(0, 80),
            secondTailText: cleanSpokenText(rawAction?.secondTailText || '').slice(0, 120),
            secondCoachScript: cleanSpokenText(rawAction?.secondCoachScript || '').slice(0, 800),
            trapWrongSentence: cleanSpokenText(rawAction?.trapWrongSentence || '').slice(0, 320),
            trapWrongToken: cleanSpokenText(rawAction?.trapWrongToken || '').slice(0, 80),
            trapWrongReason: cleanSpokenText(rawAction?.trapWrongReason || '').slice(0, 700),
            drillMeaningPrompt: cleanSpokenText(rawAction?.drillMeaningPrompt || '').slice(0, 240),
            drillTargetSentence: cleanSpokenText(rawAction?.drillTargetSentence || '').slice(
              0,
              240
            ),
            drillTrapSentence: cleanSpokenText(rawAction?.drillTrapSentence || '').slice(0, 240),
            drillBlocks: Array.isArray(rawAction?.drillBlocks)
              ? rawAction.drillBlocks
                  .map((b) => cleanSpokenText(b).slice(0, 48))
                  .filter(Boolean)
                  .slice(0, 8)
              : [],
            drillDistractors: Array.isArray(rawAction?.drillDistractors)
              ? rawAction.drillDistractors
                  .map((b) => cleanSpokenText(b).slice(0, 48))
                  .filter(Boolean)
                  .slice(0, 4)
              : [],
            phaseLabels: Array.isArray(rawAction?.phaseLabels)
              ? rawAction.phaseLabels.map((l) => cleanSpokenText(l).slice(0, 28)).filter(Boolean).slice(0, 5)
              : undefined,
            whiteboardSteps: Array.isArray(rawAction?.whiteboardSteps)
              ? rawAction.whiteboardSteps
                  .filter((st) => st && typeof st === 'object' && typeof st.kind === 'string')
                  .slice(0, 10)
                  .map((st, sIdx) => {
                    const ALLOWED_THEMES = new Set([
                      'camera_vs_video',
                      'battery_meter',
                      'bridge_timeline',
                      'stage_spotlight',
                      'rpg_stats',
                      'locomotive_train',
                      'traffic_light',
                      'key_and_lock',
                    ]);
                    const ALLOWED_MECHANICS = new Set([
                      'balance_seesaw',
                      'scratch_reveal',
                      'venn_bucket_sorter',
                      'wire_node_connector',
                      'rotary_dial_gauge',
                      'fraction_slice_shader',
                      'direct_2d_canvas_lab',
                      'magnetic_slot_builder',
                      'wave_pendulum_oscillator',
                      'surgical_ink_strike',
                      'step_derivation',
                    ]);
                    const ALLOWED_PALETTES = new Set([
                      'cobalt_blueprint',
                      'terracotta_atelier',
                      'violet_prism',
                      'crimson_scalpel',
                      'amber_fulcrum',
                      'teal_oscillator',
                      'indigo_constellation',
                      'emerald_botanical',
                    ]);
                    const ALLOWED_HATCHES = new Set([
                      'hachure',
                      'cross-hatch',
                      'zigzag',
                      'dots',
                      'dashed',
                    ]);
                    const ALLOWED_DOMAINS = new Set([
                      'language',
                      'math',
                      'physics',
                      'science',
                      'character',
                      'exam',
                    ]);
                    const ALLOWED_SKETCH_KINDS = new Set([
                      'arch_bridge',
                      'prism_split',
                      'vector_burst',
                      'venn_core',
                    ]);
                    const ALLOWED_SLIDER_DOMAINS = new Set([
                      'tense_timeline',
                      'math_graph',
                      'physics_vector',
                      'degree_scale',
                    ]);
                    const ALLOWED_MATH_FN_TYPES = new Set([
                      'linear',
                      'quadratic',
                      'pythagoras',
                      'circle_area',
                    ]);
                    const rawKindStr = String(st.kind || '').trim();
                    const isDirectMechanicKind =
                      rawKindStr !== 'step_derivation' && ALLOWED_MECHANICS.has(rawKindStr);
                    const resolvedKind = isDirectMechanicKind ? 'interactive_mechanic' : rawKindStr;
                    const explicitMechanic =
                      typeof st.mechanic === 'string' && ALLOWED_MECHANICS.has(st.mechanic.trim())
                        ? st.mechanic.trim()
                        : isDirectMechanicKind
                          ? rawKindStr
                          : undefined;
                    const inferredMechanic =
                      explicitMechanic ||
                      (resolvedKind === 'interactive_mechanic'
                        ? Array.isArray(st.bucketZones) && st.bucketZones.length >= 2
                          ? 'venn_bucket_sorter'
                          : Array.isArray(st.wirePairs) && st.wirePairs.length >= 2
                            ? 'wire_node_connector'
                            : Array.isArray(st.magnetTargetTokens) && st.magnetTargetTokens.length >= 2
                              ? 'magnetic_slot_builder'
                              : typeof st.scratchHiddenFormula === 'string' || typeof st.scratchClueHeader === 'string'
                                ? 'scratch_reveal'
                                : Array.isArray(st.seesawTokens) && st.seesawTokens.length >= 2
                                  ? 'balance_seesaw'
                                  : Array.isArray(st.dialStops) && st.dialStops.length >= 2
                                    ? 'rotary_dial_gauge'
                                    : typeof st.sliceTotal === 'number'
                                      ? 'fraction_slice_shader'
                                      : typeof st.waveTargetLevel === 'number'
                                        ? 'wave_pendulum_oscillator'
                                        : undefined
                        : undefined);
                    const normPanel = (p) =>
                      p && typeof p === 'object' && typeof p.title === 'string' && p.title.trim()
                        ? {
                            ...(typeof p.badge === 'string' && p.badge.trim() ? { badge: cleanSpokenText(p.badge).slice(0, 32) } : {}),
                            title: cleanSpokenText(p.title).slice(0, 96),
                            ...(typeof p.subtitle === 'string' && p.subtitle.trim() ? { subtitle: cleanSpokenText(p.subtitle).slice(0, 220) } : {}),
                            ...(typeof p.example === 'string' && p.example.trim() ? { example: cleanSpokenText(p.example).slice(0, 160) } : {}),
                            ...(typeof p.icon === 'string' && p.icon.trim() ? { icon: cleanSpokenText(p.icon).slice(0, 24) } : {}),
                            ...(typeof p.accentColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.accentColor.trim()) ? { accentColor: p.accentColor.trim() } : {}),
                            ...(typeof p.bgColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.bgColor.trim()) ? { bgColor: p.bgColor.trim() } : {}),
                          }
                        : undefined;
                    const strippedStepTitle =
                      typeof st.title === 'string' ? stripMetaStepPrefix(cleanSpokenText(st.title)).slice(0, 160) : '';
                    const finalStepTitle =
                      strippedStepTitle || (resolvedKind === 'heading' && cleanTopicTitle ? cleanTopicTitle : undefined);
                    return {
                      id: typeof st.id === 'string' ? st.id.slice(0, 48) : `ai_step_${sIdx}`,
                      kind: resolvedKind,
                      column: st.column === 'right' ? 'right' : 'left',
                      phaseIndex: typeof st.phaseIndex === 'number' ? Math.max(0, Math.min(4, st.phaseIndex)) : undefined,
                      domainType:
                        typeof st.domainType === 'string' && ALLOWED_DOMAINS.has(st.domainType.trim())
                          ? st.domainType.trim()
                          : undefined,
                      mechanic: inferredMechanic,
                      inkPalette:
                        typeof st.inkPalette === 'string' && ALLOWED_PALETTES.has(st.inkPalette.trim())
                          ? st.inkPalette.trim()
                          : undefined,
                      roughHatch:
                        typeof st.roughHatch === 'string' && ALLOWED_HATCHES.has(st.roughHatch.trim())
                          ? st.roughHatch.trim()
                          : undefined,
                      variantSeed: typeof st.variantSeed === 'number' ? st.variantSeed : undefined,
                      pauseForInteraction:
                        resolvedKind === 'heading' ||
                        resolvedKind === 'note' ||
                        resolvedKind === 'table' ||
                        resolvedKind === 'formula_blocks' ||
                        resolvedKind === 'timeline_track' ||
                        resolvedKind === 'mind_map' ||
                        resolvedKind === 'contrast_scale' ||
                        resolvedKind === 'metaphor_scene' ||
                        resolvedKind === 'rough_scene' ||
                        resolvedKind === 'syntax_flow' ||
                        resolvedKind === 'kanji_grid' ||
                        resolvedKind === 'highlight_callout'
                          ? false
                          : typeof st.pauseForInteraction === 'boolean'
                            ? st.pauseForInteraction
                            : undefined,
                      socraticPrompt:
                        typeof st.socraticPrompt === 'string' && st.socraticPrompt.trim()
                          ? cleanSpokenText(st.socraticPrompt).slice(0, 320)
                          : undefined,
                      successVoiceFeedback:
                        typeof st.successVoiceFeedback === 'string' && st.successVoiceFeedback.trim()
                          ? cleanSpokenText(st.successVoiceFeedback).slice(0, 420)
                          : undefined,
                      wrongTapHint:
                        typeof st.wrongTapHint === 'string' && st.wrongTapHint.trim()
                          ? cleanSpokenText(st.wrongTapHint).slice(0, 260)
                          : undefined,
                      quickChoices:
                        resolvedKind === 'interactive_mechanic' ||
                        resolvedKind === 'socratic_slider' ||
                        resolvedKind === 'surgical_strike' ||
                        resolvedKind === 'step_derivation'
                          ? Array.isArray(st.quickChoices)
                            ? st.quickChoices
                                .filter((qc) => qc && typeof qc === 'object' && typeof qc.label === 'string' && qc.label.trim())
                                .slice(0, 4)
                                .map((qc, qIdx) => ({
                                  id: typeof qc.id === 'string' && qc.id.trim() ? qc.id.slice(0, 32) : `qc_${qIdx}`,
                                  label: cleanSpokenText(qc.label).slice(0, 96),
                                  isCorrect: Boolean(qc.isCorrect),
                                  ...(typeof qc.socraticHint === 'string' && qc.socraticHint.trim()
                                    ? { socraticHint: cleanSpokenText(qc.socraticHint).slice(0, 220) }
                                    : {}),
                                }))
                            : undefined
                          : undefined,
                      bucketLayout:
                        st.bucketLayout === 'concentric' || st.bucketLayout === 'dual_rings' || st.bucketLayout === 'triple_bins'
                          ? st.bucketLayout
                          : undefined,
                      bucketZones: Array.isArray(st.bucketZones)
                        ? st.bucketZones
                            .filter((bz) => bz && typeof bz === 'object' && typeof bz.label === 'string' && bz.label.trim())
                            .slice(0, 4)
                            .map((bz, zIdx) => ({
                              id: typeof bz.id === 'string' && bz.id.trim() ? bz.id.slice(0, 32) : `z_${zIdx + 1}`,
                              label: cleanSpokenText(bz.label).slice(0, 80),
                              ...(typeof bz.sublabel === 'string' && bz.sublabel.trim()
                                ? { sublabel: cleanSpokenText(bz.sublabel).slice(0, 120) }
                                : {}),
                            }))
                        : undefined,
                      bucketChips: Array.isArray(st.bucketChips)
                        ? st.bucketChips
                            .filter(
                              (bc) =>
                                bc &&
                                typeof bc === 'object' &&
                                typeof bc.label === 'string' &&
                                bc.label.trim() &&
                                typeof bc.targetZoneId === 'string' &&
                                bc.targetZoneId.trim()
                            )
                            .slice(0, 6)
                            .map((bc, cIdx) => ({
                              id: typeof bc.id === 'string' && bc.id.trim() ? bc.id.slice(0, 32) : `c_${cIdx + 1}`,
                              label: cleanSpokenText(bc.label).slice(0, 96),
                              targetZoneId: bc.targetZoneId.trim().slice(0, 32),
                              ...(typeof bc.hint === 'string' && bc.hint.trim()
                                ? { hint: cleanSpokenText(bc.hint).slice(0, 180) }
                                : {}),
                            }))
                        : undefined,
                      wirePairs: Array.isArray(st.wirePairs)
                        ? st.wirePairs
                            .filter(
                              (wp) =>
                                wp &&
                                typeof wp === 'object' &&
                                typeof (wp.leftLabel || wp.left) === 'string' &&
                                (wp.leftLabel || wp.left).trim() &&
                                typeof (wp.rightLabel || wp.right) === 'string' &&
                                (wp.rightLabel || wp.right).trim()
                            )
                            .slice(0, 5)
                            .map((wp, wIdx) => ({
                              id: typeof wp.id === 'string' && wp.id.trim() ? wp.id.slice(0, 32) : `wp_${wIdx + 1}`,
                              leftLabel: cleanSpokenText(wp.leftLabel || wp.left).slice(0, 96),
                              rightLabel: cleanSpokenText(wp.rightLabel || wp.right).slice(0, 96),
                            }))
                        : undefined,
                      seesawLeftFixedLabel:
                        typeof st.seesawLeftFixedLabel === 'string' && st.seesawLeftFixedLabel.trim()
                          ? cleanSpokenText(st.seesawLeftFixedLabel).slice(0, 96)
                          : undefined,
                      seesawLeftWeight: typeof st.seesawLeftWeight === 'number' ? st.seesawLeftWeight : undefined,
                      seesawRightFixedLabel:
                        typeof st.seesawRightFixedLabel === 'string'
                          ? cleanSpokenText(st.seesawRightFixedLabel).slice(0, 96)
                          : undefined,
                      seesawRightBaseWeight:
                        typeof st.seesawRightBaseWeight === 'number' ? st.seesawRightBaseWeight : undefined,
                      seesawTokens: Array.isArray(st.seesawTokens)
                        ? st.seesawTokens
                            .filter(
                              (tk) =>
                                tk &&
                                typeof tk === 'object' &&
                                typeof tk.label === 'string' &&
                                tk.label.trim() &&
                                typeof tk.weight === 'number'
                            )
                            .slice(0, 5)
                            .map((tk, tIdx) => ({
                              id: typeof tk.id === 'string' && tk.id.trim() ? tk.id.slice(0, 32) : `st_${tIdx + 1}`,
                              label: cleanSpokenText(tk.label).slice(0, 96),
                              weight: tk.weight,
                            }))
                        : undefined,
                      scratchClueHeader:
                        typeof st.scratchClueHeader === 'string' && st.scratchClueHeader.trim()
                          ? cleanSpokenText(st.scratchClueHeader).slice(0, 140)
                          : undefined,
                      scratchHiddenFormula:
                        typeof st.scratchHiddenFormula === 'string' && st.scratchHiddenFormula.trim()
                          ? cleanSpokenText(st.scratchHiddenFormula).slice(0, 160)
                          : undefined,
                      scratchHiddenSubnote:
                        typeof st.scratchHiddenSubnote === 'string' && st.scratchHiddenSubnote.trim()
                          ? cleanSpokenText(st.scratchHiddenSubnote).slice(0, 200)
                          : undefined,
                      scratchSketchKind:
                        typeof st.scratchSketchKind === 'string' && ALLOWED_SKETCH_KINDS.has(st.scratchSketchKind.trim())
                          ? st.scratchSketchKind.trim()
                          : undefined,
                      dialTargetDeg: typeof st.dialTargetDeg === 'number' ? st.dialTargetDeg : undefined,
                      dialInitialDeg: typeof st.dialInitialDeg === 'number' ? st.dialInitialDeg : undefined,
                      dialUnit: typeof st.dialUnit === 'string' ? cleanSpokenText(st.dialUnit).slice(0, 24) : undefined,
                      dialStops: Array.isArray(st.dialStops)
                        ? st.dialStops
                            .filter(
                              (ds) =>
                                ds &&
                                typeof ds === 'object' &&
                                typeof ds.angleDeg === 'number' &&
                                typeof ds.label === 'string' &&
                                ds.label.trim()
                            )
                            .slice(0, 5)
                            .map((ds) => ({
                              angleDeg: ds.angleDeg,
                              label: cleanSpokenText(ds.label).slice(0, 64),
                              expression: cleanSpokenText(ds.expression || ds.example || ds.label).slice(0, 140),
                              ...(typeof ds.note === 'string' && ds.note.trim()
                                ? { note: cleanSpokenText(ds.note).slice(0, 120) }
                                : {}),
                            }))
                        : undefined,
                      sliceTotal: typeof st.sliceTotal === 'number' ? st.sliceTotal : undefined,
                      sliceTargetCount: typeof st.sliceTargetCount === 'number' ? st.sliceTargetCount : undefined,
                      sliceCaptionUnit:
                        typeof st.sliceCaptionUnit === 'string' && st.sliceCaptionUnit.trim()
                          ? cleanSpokenText(st.sliceCaptionUnit).slice(0, 48)
                          : undefined,
                      magnetTargetTokens: Array.isArray(st.magnetTargetTokens)
                        ? st.magnetTargetTokens
                            .map((t) => cleanSpokenText(t).slice(0, 64))
                            .filter(Boolean)
                            .slice(0, 6)
                        : undefined,
                      magnetDistractors: Array.isArray(st.magnetDistractors)
                        ? st.magnetDistractors
                            .map((t) => cleanSpokenText(t).slice(0, 64))
                            .filter(Boolean)
                            .slice(0, 4)
                        : undefined,
                      magnetSlotRoles: Array.isArray(st.magnetSlotRoles)
                        ? st.magnetSlotRoles
                            .map((t) => cleanSpokenText(t).slice(0, 40))
                            .filter(Boolean)
                            .slice(0, 6)
                        : undefined,
                      waveTargetLevel: typeof st.waveTargetLevel === 'number' ? st.waveTargetLevel : undefined,
                      waveInitialLevel: typeof st.waveInitialLevel === 'number' ? st.waveInitialLevel : undefined,
                      waveUnitLabel:
                        typeof st.waveUnitLabel === 'string' && st.waveUnitLabel.trim()
                          ? cleanSpokenText(st.waveUnitLabel).slice(0, 40)
                          : undefined,
                      sliderDomain:
                        typeof st.sliderDomain === 'string' && ALLOWED_SLIDER_DOMAINS.has(st.sliderDomain.trim())
                          ? st.sliderDomain.trim()
                          : undefined,
                      mathFnType:
                        typeof st.mathFnType === 'string' && ALLOWED_MATH_FN_TYPES.has(st.mathFnType.trim())
                          ? st.mathFnType.trim()
                          : undefined,
                      sliderLabel:
                        typeof st.sliderLabel === 'string' && st.sliderLabel.trim()
                          ? cleanSpokenText(st.sliderLabel).slice(0, 64)
                          : undefined,
                      sliderMin: typeof st.sliderMin === 'number' ? st.sliderMin : undefined,
                      sliderMax: typeof st.sliderMax === 'number' ? st.sliderMax : undefined,
                      sliderStep: typeof st.sliderStep === 'number' ? st.sliderStep : undefined,
                      sliderInitial: typeof st.sliderInitial === 'number' ? st.sliderInitial : undefined,
                      sliderTarget: typeof st.sliderTarget === 'number' ? st.sliderTarget : undefined,
                      sliderUnit:
                        typeof st.sliderUnit === 'string' ? cleanSpokenText(st.sliderUnit).slice(0, 24) : undefined,
                      sliderStops: Array.isArray(st.sliderStops)
                        ? st.sliderStops
                            .filter((ss) => ss && typeof ss === 'object' && typeof ss.value === 'number')
                            .slice(0, 5)
                            .map((ss) => ({
                              value: ss.value,
                              ...(typeof ss.tag === 'string' && ss.tag.trim() ? { tag: cleanSpokenText(ss.tag).slice(0, 48) } : {}),
                              ...(typeof ss.label === 'string' && ss.label.trim() ? { label: cleanSpokenText(ss.label).slice(0, 64) } : {}),
                              ...(typeof ss.expression === 'string' && ss.expression.trim()
                                ? { expression: cleanSpokenText(ss.expression).slice(0, 140) }
                                : {}),
                              ...(typeof ss.example === 'string' && ss.example.trim()
                                ? { example: cleanSpokenText(ss.example).slice(0, 140) }
                                : {}),
                              ...(typeof ss.formula === 'string' && ss.formula.trim()
                                ? { formula: cleanSpokenText(ss.formula).slice(0, 120) }
                                : {}),
                              ...(typeof ss.subnote === 'string' && ss.subnote.trim()
                                ? { subnote: cleanSpokenText(ss.subnote).slice(0, 140) }
                                : {}),
                              ...(typeof ss.spokenHint === 'string' && ss.spokenHint.trim()
                                ? { spokenHint: cleanSpokenText(ss.spokenHint).slice(0, 160) }
                                : {}),
                            }))
                        : undefined,
                      strikeTokens: Array.isArray(st.strikeTokens)
                        ? st.strikeTokens
                            .map((tk) => cleanSpokenText(tk).slice(0, 64))
                            .filter(Boolean)
                            .slice(0, 14)
                        : undefined,
                      bugTokenIndex: typeof st.bugTokenIndex === 'number' ? st.bugTokenIndex : undefined,
                      fixedToken:
                        typeof st.fixedToken === 'string' ? cleanSpokenText(st.fixedToken).slice(0, 80) : undefined,
                      derivationSteps: Array.isArray(st.derivationSteps)
                        ? st.derivationSteps
                            .filter((ds) => ds && typeof ds === 'object' && (ds.latex || ds.expr))
                            .slice(0, 6)
                            .map((ds) => ({
                              ...(typeof ds.expr === 'string' && ds.expr.trim() ? { expr: cleanSpokenText(ds.expr).slice(0, 160) } : {}),
                              ...(typeof ds.latex === 'string' && ds.latex.trim() ? { latex: String(ds.latex).trim().slice(0, 220) } : {}),
                              ...(typeof ds.sideOp === 'string' && ds.sideOp.trim() ? { sideOp: cleanSpokenText(ds.sideOp).slice(0, 96) } : {}),
                              ...(typeof ds.isInteractiveBlank === 'boolean' ? { isInteractiveBlank: ds.isInteractiveBlank } : {}),
                              ...(typeof ds.expectedValue === 'string' && ds.expectedValue.trim()
                                ? { expectedValue: cleanSpokenText(ds.expectedValue).slice(0, 80) }
                                : {}),
                              ...(Array.isArray(ds.choices)
                                ? {
                                    choices: ds.choices
                                      .map((c) => cleanSpokenText(c).slice(0, 80))
                                      .filter(Boolean)
                                      .slice(0, 4),
                                  }
                                : {}),
                              ...(typeof ds.hint === 'string' && ds.hint.trim() ? { hint: cleanSpokenText(ds.hint).slice(0, 200) } : {}),
                            }))
                        : undefined,
                      title: finalStepTitle,
                      text: typeof st.text === 'string' ? cleanSpokenText(st.text).slice(0, 900) : undefined,
                      bullets: Array.isArray(st.bullets)
                        ? st.bullets.map((b) => cleanSpokenText(b).slice(0, 420)).filter(Boolean).slice(0, 6)
                        : undefined,
                      highlightPhrase: typeof st.highlightPhrase === 'string' ? cleanSpokenText(st.highlightPhrase).slice(0, 360) : undefined,
                      highlightColor: typeof st.highlightColor === 'string' ? st.highlightColor.slice(0, 40) : undefined,
                      highlightTerms: Array.isArray(st.highlightTerms)
                        ? st.highlightTerms.map((t) => cleanSpokenText(t).slice(0, 60)).filter(Boolean).slice(0, 8)
                        : undefined,
                      sceneTheme: typeof st.sceneTheme === 'string' && ALLOWED_THEMES.has(st.sceneTheme.trim()) ? st.sceneTheme.trim() : undefined,
                      metaphorCenterLabel: typeof st.metaphorCenterLabel === 'string' ? cleanSpokenText(st.metaphorCenterLabel).slice(0, 96) : undefined,
                      metaphorMeterPct: typeof st.metaphorMeterPct === 'number' ? Math.max(0, Math.min(100, st.metaphorMeterPct)) : undefined,
                      leftPanel: normPanel(st.leftPanel),
                      rightPanel: normPanel(st.rightPanel),
                      branches: Array.isArray(st.branches)
                        ? st.branches
                            .filter((b) => b && typeof b === 'object' && typeof (b.label || b.title) === 'string' && (b.label || b.title).trim())
                            .slice(0, 6)
                            .map((b) => ({
                              label: cleanSpokenText(b.label || b.title).slice(0, 80),
                              ...(typeof (b.sublabel || b.subtitle) === 'string' && (b.sublabel || b.subtitle).trim() ? { sublabel: cleanSpokenText(b.sublabel || b.subtitle).slice(0, 180) } : {}),
                              ...(typeof b.example === 'string' && b.example.trim() ? { example: cleanSpokenText(b.example).slice(0, 160) } : {}),
                              ...(typeof b.icon === 'string' && b.icon.trim() ? { icon: cleanSpokenText(b.icon).slice(0, 24) } : {}),
                              ...(typeof b.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(b.color.trim()) ? { color: b.color.trim() } : {}),
                            }))
                        : undefined,
                      timelineEvents: Array.isArray(st.timelineEvents)
                        ? st.timelineEvents
                            .filter((ev) => ev && typeof ev === 'object' && typeof (ev.title || ev.label) === 'string' && (ev.title || ev.label).trim())
                            .slice(0, 5)
                            .map((ev) => ({
                              timeLabel: typeof (ev.timeLabel || ev.time || ev.label) === 'string' ? cleanSpokenText(ev.timeLabel || ev.time || ev.label).slice(0, 56) : 'Tahap',
                              title: cleanSpokenText(ev.title || ev.label).slice(0, 110),
                              ...(typeof ev.example === 'string' && ev.example.trim() ? { example: cleanSpokenText(ev.example).slice(0, 160) } : {}),
                              ...(typeof ev.icon === 'string' && ev.icon.trim() ? { icon: cleanSpokenText(ev.icon).slice(0, 24) } : {}),
                              ...(typeof ev.isActive === 'boolean' ? { isActive: ev.isActive } : {}),
                              ...(typeof ev.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(ev.color.trim()) ? { color: ev.color.trim() } : {}),
                            }))
                        : undefined,
                      blocks: Array.isArray(st.blocks)
                        ? st.blocks
                            .filter((bl) => bl && typeof bl === 'object' && typeof (bl.token || bl.word || bl.text || bl.label) === 'string' && (bl.token || bl.word || bl.text || bl.label).trim())
                            .slice(0, 6)
                            .map((bl) => ({
                              role: typeof (bl.role || bl.title || bl.label) === 'string' ? cleanSpokenText(bl.role || bl.title || bl.label).slice(0, 64) : 'Bagian',
                              token: cleanSpokenText(bl.token || bl.word || bl.text || bl.label).slice(0, 110),
                              ...(typeof bl.note === 'string' && bl.note.trim() ? { note: cleanSpokenText(bl.note).slice(0, 160) } : {}),
                              ...(typeof bl.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(bl.color.trim()) ? { color: bl.color.trim() } : {}),
                            }))
                        : undefined,
                      width: typeof st.width === 'number' ? st.width : undefined,
                      height: typeof st.height === 'number' ? st.height : undefined,
                      caption: typeof st.caption === 'string' ? cleanSpokenText(st.caption).slice(0, 260) : undefined,
                      shapes: Array.isArray(st.shapes) ? st.shapes.slice(0, 32) : undefined,
                      graphDirection: st.graphDirection === 'TB' ? 'TB' : st.graphDirection === 'LR' ? 'LR' : undefined,
                      graphNodes: Array.isArray(st.graphNodes)
                        ? st.graphNodes
                            .filter((gn) => gn && typeof gn === 'object' && typeof (gn.label || gn.title || gn.id) === 'string')
                            .slice(0, 10)
                            .map((gn, gIdx) => ({
                              id: String(gn.id || `n${gIdx + 1}`).slice(0, 32),
                              label: cleanSpokenText(gn.label || gn.title || gn.id).slice(0, 64),
                              ...(typeof (gn.sublabel || gn.subtitle || gn.note) === 'string' && (gn.sublabel || gn.subtitle || gn.note).trim()
                                ? { sublabel: cleanSpokenText(gn.sublabel || gn.subtitle || gn.note).slice(0, 140) }
                                : {}),
                              ...(typeof gn.fill === 'string' && /^#[0-9a-f]{3,8}$/i.test(gn.fill.trim()) ? { fill: gn.fill.trim() } : {}),
                              ...(typeof gn.stroke === 'string' && /^#[0-9a-f]{3,8}$/i.test(gn.stroke.trim()) ? { stroke: gn.stroke.trim() } : {}),
                            }))
                        : undefined,
                      graphEdges: Array.isArray(st.graphEdges)
                        ? st.graphEdges
                            .filter((ge) => ge && typeof ge === 'object' && (ge.from || ge.source) && (ge.to || ge.target))
                            .slice(0, 16)
                            .map((ge) => ({
                              from: String(ge.from || ge.source).slice(0, 32),
                              to: String(ge.to || ge.target).slice(0, 32),
                              ...(typeof ge.label === 'string' && ge.label.trim() ? { label: cleanSpokenText(ge.label).slice(0, 48) } : {}),
                              ...(typeof ge.dashed === 'boolean' ? { dashed: ge.dashed } : {}),
                            }))
                        : undefined,
                      termA: typeof st.termA === 'string' ? cleanSpokenText(st.termA).slice(0, 120) : undefined,
                      descA: typeof st.descA === 'string' ? cleanSpokenText(st.descA).slice(0, 320) : undefined,
                      termB: typeof st.termB === 'string' ? cleanSpokenText(st.termB).slice(0, 120) : undefined,
                      descB: typeof st.descB === 'string' ? cleanSpokenText(st.descB).slice(0, 320) : undefined,
                      analogy: typeof st.analogy === 'string' ? cleanSpokenText(st.analogy).slice(0, 420) : undefined,
                      wrongText: typeof st.wrongText === 'string' && !isDegenerateBoardValue(st.wrongText) ? cleanSpokenText(st.wrongText).slice(0, 320) : undefined,
                      rightText:
                        typeof st.rightText === 'string' && !isDegenerateBoardValue(st.rightText)
                          ? cleanSpokenText(st.rightText).slice(0, 320)
                          : resolvedSampleTarget || undefined,
                      reason: typeof st.reason === 'string' ? cleanSpokenText(st.reason).slice(0, 700) : undefined,
                      tableHeaders: Array.isArray(st.tableHeaders)
                        ? st.tableHeaders.map((h) => cleanSpokenText(h).slice(0, 60)).slice(0, 4)
                        : undefined,
                      tableRows: Array.isArray(st.tableRows)
                        ? (() => {
                            const isTableCellPlaceholder = (s) =>
                              !s || /^(example|contoh|sample|placeholder|\.\.\.|-)$/i.test(s);
                            const normRows = st.tableRows
                              .slice(0, 6)
                              .map((row) =>
                                Array.isArray(row)
                                  ? row
                                      .map((c) => {
                                        const cleaned = cleanSpokenText(c).slice(0, 220);
                                        return isTableCellPlaceholder(cleaned) ? '' : cleaned;
                                      })
                                      .slice(0, 4)
                                  : []
                              )
                              .filter((row) => {
                                const populated = row.filter((c) => !isTableCellPlaceholder(c));
                                if (populated.length === 0) return false;
                                if (
                                  populated.length >= 2 &&
                                  new Set(populated.map((c) => c.toLowerCase())).size <= 1
                                ) {
                                  return false;
                                }
                                return true;
                              });
                            return normRows.length > 0 ? normRows : undefined;
                          })()
                        : undefined,
                      nodes: Array.isArray(st.nodes)
                        ? st.nodes
                            .filter((n) => n && typeof n === 'object' && typeof (n.word || n.token || n.text || n.label) === 'string' && (n.word || n.token || n.text || n.label).trim())
                            .slice(0, 7)
                            .map((n) => ({
                              role: cleanSpokenText(n.role || n.title || n.sublabel || 'Bagian').slice(0, 48),
                              word: cleanSpokenText(n.word || n.token || n.text || n.label).slice(0, 96),
                              ...(typeof n.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(n.color.trim()) ? { color: n.color.trim() } : {}),
                            }))
                        : undefined,
                      character: typeof st.character === 'string' ? st.character.slice(0, 8) : undefined,
                      reading: typeof st.reading === 'string' ? cleanSpokenText(st.reading).slice(0, 80) : undefined,
                      meaning: typeof st.meaning === 'string' ? cleanSpokenText(st.meaning).slice(0, 160) : undefined,
                      strokeCount: typeof st.strokeCount === 'number' ? st.strokeCount : undefined,
                      spokenNarration:
                        typeof (st.spokenNarration || st.spoken_narration) === 'string'
                          ? stripRoboticSelfIntro(cleanSpokenText(st.spokenNarration || st.spoken_narration)).slice(0, 1100)
                          : undefined,
                      mnemonic:
                        typeof st.mnemonic === 'string'
                          ? cleanSpokenText(st.mnemonic).slice(0, 360)
                          : undefined,
                      strokePaths: Array.isArray(st.strokePaths)
                        ? st.strokePaths.slice(0, 48)
                        : Array.isArray(st.stroke_paths)
                          ? st.stroke_paths.slice(0, 48)
                          : undefined,
                    };
                  })
              : undefined,
          };

  if (
    uiAction &&
    uiAction.actionType === 'open_learning_popup' &&
    typeof globalThis.__fiezelLookupCjkStrokes === 'function'
  ) {
    try {
      const steps = Array.isArray(uiAction.whiteboardSteps) ? uiAction.whiteboardSteps : [];
      let authoritativeCount = 0;
      let authoritativeChar = '';
      for (const st of steps) {
        if (st && st.kind === 'kanji_grid') {
          const candChar = (String(st.character || uiAction.topicTitle || '').match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/) || [])[0];
          const hit = candChar ? globalThis.__fiezelLookupCjkStrokes(candChar, targetLang) : null;
          if (hit && Array.isArray(hit.strokes) && hit.strokes.length > 0) {
            authoritativeChar = hit.char;
            authoritativeCount = hit.strokeCount;
            st.character = hit.char;
            st.strokeCount = hit.strokeCount;
            st.strokePaths = hit.strokes.map((s) => ({
              order: s.order,
              d: s.d,
              kvgType: s.type || undefined,
              numPos: s.numPos || undefined,
              verifiedAuthority: true,
            }));
          }
        }
      }
      if (authoritativeCount > 0 && authoritativeChar) {
        const NUM_WORD_RE = /\b(dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|dua\s+belas|tiga\s+belas|empat\s+belas|lima\s+belas|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(goresan|strokes?|coretan)\b/gi;
        const NUM_DIGIT_RE = /\b(?:[2-9]|[1-9]\d+)\s*(goresan|strokes?|coretan)\b/gi;
        const NEGATED_COUNT_RE = /\b(?:bukan|jangan|keliru|salah(?:\s+\w+){0,2}|mengira|tidak|dihitung|terhitung|dipecah|pecah\w*\s+menjadi|membagi\w*\s+menjadi|terbagi\s+menjadi)\s+(?:(?:itu|hanya|menjadi|ke)\s+)?(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|one|two|three|four|five|six|seven|eight|nine|ten)\s+(goresan|strokes?|coretan)\b/i;
        const fixCountPhrase = (str) =>
          typeof str === 'string' && !NEGATED_COUNT_RE.test(str)
            ? str
                .replace(NUM_DIGIT_RE, `${authoritativeCount} $1`)
                .replace(NUM_WORD_RE, `${authoritativeCount} $2`)
            : str;
        uiAction.topicTitle = fixCountPhrase(uiAction.topicTitle);
        uiAction.patternFormula = fixCountPhrase(uiAction.patternFormula);
        uiAction.explanationText = fixCountPhrase(uiAction.explanationText);
        uiAction.coachSpokenScript = fixCountPhrase(uiAction.coachSpokenScript);
        uiAction.trapWrongReason = fixCountPhrase(uiAction.trapWrongReason);
        for (const st of steps) {
          if (!st || typeof st !== 'object') continue;
          if (typeof st.title === 'string') st.title = fixCountPhrase(st.title);
          if (typeof st.text === 'string') st.text = fixCountPhrase(st.text);
          if (typeof st.caption === 'string') st.caption = fixCountPhrase(st.caption);
          if (typeof st.reason === 'string') st.reason = fixCountPhrase(st.reason);
          if (typeof st.analogy === 'string') st.analogy = fixCountPhrase(st.analogy);
          if (typeof st.descA === 'string') st.descA = fixCountPhrase(st.descA);
          if (typeof st.descB === 'string') st.descB = fixCountPhrase(st.descB);
          if (typeof st.mnemonic === 'string') st.mnemonic = fixCountPhrase(st.mnemonic);
          if (typeof st.spokenNarration === 'string') st.spokenNarration = fixCountPhrase(st.spokenNarration);
          if (Array.isArray(st.bullets)) st.bullets = st.bullets.map((b) => fixCountPhrase(b));
          if (Array.isArray(st.tableRows)) {
            st.tableRows = st.tableRows.map((row) =>
              Array.isArray(row)
                ? row.map((cell, cIdx) => {
                    const hdr = String(st.tableHeaders?.[cIdx] || '');
                    const isTrapCol = /keliru|salah|hindari|trap|✕|×/i.test(hdr);
                    return isTrapCol ? cell : fixCountPhrase(cell);
                  })
                : row
            );
          }
        }
        aiReply = fixCountPhrase(aiReply);
        aiReplyTranslation = fixCountPhrase(aiReplyTranslation);
      }

      // Deterministic linguistics & visual-audio alignment guard (ALL topics + To Be rules + phantom narration)
      const sanitizeStativeWording = (txt) => {
        if (typeof txt !== 'string' || !txt.trim()) return txt;
        return txt
          .replace(
            /(['"`]?\b(?:agree|know|believe|like|want|understand|need|love|hate|xihuan|suka)\b|喜欢)(['"`]?\s+(?:adalah|merupakan)\s+)(?:kata\s+kerja\s+aksi(?:\s*\([^)]*\))?|aksi\s+atau\s+(?:kata\s+kerja|tindakan)|aksi\b)/gi,
            '$1$2kata kerja utama (stative verb)'
          )
          .replace(
            /\b([Kk])ata\s+kerja\s+aksi(\s*\([^)]*\b(?:agree|know|believe|like|want|understand|need|love|hate|xihuan|suka)\b[^)]*\))/g,
            '$1ata kerja utama$2'
          )
          .replace(/\s{2,}/g, ' ')
          .trim();
      };

      const fullTurnStativeBlob = `${userText || ''} ${uiAction.topicTitle || ''} ${uiAction.sampleTarget || ''} ${uiAction.trapWrongSentence || ''} ${uiAction.explanationText || ''}`;
      const isStativeFocusTurn =
        /\b(?:agree|know|believe|want|understand|need|love|hate|xihuan|stative)\b|喜欢/i.test(fullTurnStativeBlob) ||
        (/\blike\b/i.test(`${userText || ''} ${uiAction.sampleTarget || ''} ${uiAction.trapWrongSentence || ''}`) &&
          /\b(?:am|is|are|shi)\b|是/i.test(`${userText || ''} ${uiAction.topicTitle || ''} ${uiAction.trapWrongSentence || ''}`));

      const sanitizeTitleIfStative = (titleStr) => {
        const base = sanitizeStativeWording(titleStr);
        if (!isStativeFocusTurn || typeof base !== 'string') return base;
        return base
          .replace(/\bKata\s+Kerja\s+Aksi\b/gi, 'Kata Kerja (Stative)')
          .replace(/\bIdentitas\s*\(Foto\)\s*vs\s*Aksi\s*\(Video\)/gi, 'Identitas vs Kata Kerja');
      };

      uiAction.topicTitle = sanitizeTitleIfStative(uiAction.topicTitle);
      if (typeof uiAction.explanationText === 'string') uiAction.explanationText = sanitizeStativeWording(uiAction.explanationText);
      if (typeof uiAction.coachSpokenScript === 'string') uiAction.coachSpokenScript = sanitizeStativeWording(uiAction.coachSpokenScript);
      if (typeof uiAction.trapWrongReason === 'string') uiAction.trapWrongReason = sanitizeStativeWording(uiAction.trapWrongReason);
      if (typeof aiReply === 'string') aiReply = sanitizeStativeWording(aiReply);
      if (typeof aiReplyTranslation === 'string') aiReplyTranslation = sanitizeStativeWording(aiReplyTranslation);
      for (const st of steps) {
        if (!st || typeof st !== 'object') continue;
        if (typeof st.title === 'string') st.title = sanitizeTitleIfStative(st.title);
        if (typeof st.caption === 'string') st.caption = sanitizeStativeWording(st.caption);
        if (typeof st.reason === 'string') st.reason = sanitizeStativeWording(st.reason);
        if (typeof st.analogy === 'string') st.analogy = sanitizeStativeWording(st.analogy);
        if (typeof st.spokenNarration === 'string') st.spokenNarration = sanitizeStativeWording(st.spokenNarration);
        if (Array.isArray(st.bullets)) st.bullets = st.bullets.map((b) => sanitizeStativeWording(b));
      }

      const topicAndQuestion = `${userText || ''} ${uiAction.topicTitle || ''} ${uiAction.patternFormula || ''}`;
      const isExcludedOtherGrammar =
        /\b(?:do|does|did|don't|doesn't|simple\s*past|present\s*perfect|have\s+gone|particle|partikel|は|が|kanji|hanzi|kakijun|negasi|preposition|in\s*,?\s*on|lokasi|pte|retell|lecture|pythagor|photosynth|mitochondri|newton|rumus|matematika|kimia|fisika)\b/i.test(
          `${userText || ''} ${uiAction.topicTitle || ''}`
        );
      const isToBeVerbTopic =
        !isExcludedOtherGrammar &&
        (/(?:\bto\s*be\b|\bam\s*\/\s*is\s*\/\s*are\b|\bi\s+am\s+agree\b|\bshe\s+is\s+(?:agree|work|go|eat|like|sleep)\b)/i.test(
          topicAndQuestion
        ) ||
          (/\bto\s*be\b/i.test(topicAndQuestion) && /\b(?:verb\s*1|kata\s+kerja|agree|work|go)\b/i.test(topicAndQuestion)));

      if (isToBeVerbTopic) {
        const refineOverbroadRule = (txt) => {
          if (typeof txt !== 'string' || !txt.trim()) return txt;
          const overbroadOnlyAdj = /[^.!?\n]*\b(?:to\s*be|am|is|are)\b[^.!?\n]*(?:hanya|khusus|cuma|(?:digunakan|dipakai)\s+untuk)[^.!?\n]*(?:kata\s+sifat|adjective)(?![^.!?\n]*(?:verb[\s-]*ing|verb\s*3))[^.!?\n]*(?:\.|$)/i;
          const overbroadNoVerb = /[^.!?\n]*(?:jangan\s+gabung\w*|tidak\s+(?:boleh|membutuhkan|memerlukan|pakai)(?:[^.!?\n]*(?:gabung|bertemu|pakai))?)[^.!?\n]*\b(?:to\s*be|kata\s+kerja|verb)\b[^.!?\n]*\b(?:to\s*be|kata\s+kerja|verb)\b(?![^.!?\n]*(?:verb\s*1|verb[\s-]*ing|verb\s*3|dasar|aktif))[^.!?\n]*(?:\.|$)/i;
          let out = txt;
          if (overbroadOnlyAdj.test(out)) {
            out = out.replace(
              overbroadOnlyAdj,
              'To Be (am/is/are) dipakai bersama Kata Sifat (I am happy), Kata Benda/Lokasi (I am a teacher), Verb ing (sedang terjadi), atau Verb 3 (pasif).'
            );
          }
          if (overbroadNoVerb.test(out)) {
            out = out.replace(
              overbroadNoVerb,
              'To Be tidak digabung dengan Verb 1 dasar (I agree), melainkan hanya dengan Verb ing (sedang) atau Verb 3 (pasif).'
            );
          }
          return sanitizeStativeWording(out);
        };

        if (typeof uiAction.explanationText === 'string') {
          uiAction.explanationText = refineOverbroadRule(uiAction.explanationText);
        }
        if (typeof uiAction.coachSpokenScript === 'string') {
          uiAction.coachSpokenScript = refineOverbroadRule(uiAction.coachSpokenScript);
        }
        if (typeof uiAction.spokenScript === 'string') {
          uiAction.spokenScript = refineOverbroadRule(uiAction.spokenScript);
        }
        if (typeof aiReply === 'string') {
          aiReply = refineOverbroadRule(aiReply);
        }
        if (typeof aiReplyTranslation === 'string') {
          aiReplyTranslation = refineOverbroadRule(aiReplyTranslation);
        }

        for (let sIdx = 0; sIdx < steps.length; sIdx++) {
          const st = steps[sIdx];
          if (!st || typeof st !== 'object') continue;
          const stepBlob = `${st.title || ''} ${st.analogy || ''} ${st.descA || ''} ${st.descB || ''} ${st.caption || ''} ${st.spokenNarration || ''}`;
          const hasCameraOrRpgMetaphor =
            st.sceneTheme === 'camera_vs_video' ||
            st.sceneTheme === 'rpg_stats' ||
            /\b(?:kamera|video|foto\s*mati|rpg)\b/i.test(stepBlob);
          if (
            ((st.kind === 'metaphor_scene' || st.kind === 'contrast_scale') && hasCameraOrRpgMetaphor) ||
            (st.kind === 'metaphor_scene' && !st.blocks)
          ) {
            const cleanSample = cleanSpokenText(uiAction.sampleTarget || 'I agree with you.');
            const cleanWrong = cleanSpokenText(uiAction.trapWrongSentence || 'I am agree with you.');
            steps[sIdx] = {
              ...st,
              kind: 'formula_blocks',
              sceneTheme: undefined,
              title: 'Peta 4 Slot Sah: Verb 1 vs To Be',
              caption: 'To Be hanya sah untuk Sifat/Benda, Verb ing (sedang), atau Verb 3 (pasif), BUKAN Verb 1 aktif!',
              rightText: cleanSample,
              wrongText: cleanWrong,
              highlightTerms: ['Verb 1', 'To Be', 'Verb ing', 'Verb 3', 'Adjective', cleanSample].filter(Boolean),
              blocks: [
                { role: 'Subjek + Verb 1', token: 'I agree / work', note: 'Kata kerja aktif langsung, tanpa am/is/are', color: '#10B981' },
                { role: 'To Be + Sifat/Benda', token: 'I am happy / teacher', note: 'Untuk kata sifat, profesi, atau lokasi', color: '#0EA5E9' },
                { role: 'To Be + Verb ing', token: 'I am working', note: 'Aksi yang sedang berlangsung sekarang', color: '#8B5CF6' },
                { role: 'To Be + Verb 3', token: 'It is agreed', note: 'Kalimat pasif (dikenai tindakan)', color: '#F59E0B' },
              ],
              spokenNarration:
                locale === 'en'
                  ? `Look at the four legal slots on the board from left to right. First green block: active Verb 1 attaches directly to the subject, as in ${cleanSample}, with zero am, is, or are. Second blue block: To Be pairs with adjectives, nouns, or places like I am happy. Third purple block: To Be plus Verb ing shows ongoing action like I am working. Fourth amber block: To Be plus Verb 3 forms passive voice like It is agreed.`
                  : `Perhatikan empat blok jalur kalimat yang benar dari kiri ke kanan. Blok hijau pertama: kata kerja aktif Verb 1 langsung menempel setelah subjek seperti ${cleanSample}, tanpa tambahan am, is, atau are. Blok biru kedua: To Be berpasangan dengan kata sifat, profesi, atau lokasi seperti I am happy. Blok ungu ketiga: To Be ditambah Verb ing menyatakan aktivitas yang sedang berlangsung seperti I am working. Blok oranye keempat: To Be ditambah Verb 3 membentuk kalimat pasif seperti It is agreed.`,
            };
            continue;
          }
          if (st.kind === 'note' && Array.isArray(st.bullets)) {
            const joined = st.bullets.join(' | ');
            const hasIng = /verb[\s-]*ing|v[\s-]*ing|\bam\s+\w+ing\b/i.test(joined);
            const hasV3 = /verb\s*3|\bv3\b|pasif|passive/i.test(joined);
            if (!hasIng || !hasV3) {
              const kept = st.bullets
                .map((b) => refineOverbroadRule(String(b || '').trim()))
                .filter(
                  (b) =>
                    b &&
                    !/^(?:jangan\s+gabung\w*\s+to\s*be|to\s*be\s+(?:hanya\s+)?(?:digunakan\s+)?untuk\s+kata\s+sifat)/i.test(b)
                );
              const coreToBeRule =
                locale === 'en'
                  ? 'To Be (am/is/are) ONLY pairs with Adjective, Noun/Place, Verb ing (ongoing), or Verb 3 (passive), while To Be + Verb 1 is generally wrong.'
                  : 'To Be (am/is/are) HANYA bisa dipasangkan dengan Kata Sifat/Benda, Verb ing (sedang terjadi), atau Verb 3 (kalimat pasif), bukan Verb 1.';
              const activeRule =
                locale === 'en'
                  ? 'Base active verbs like agree, go, or work stand directly after the subject (I agree), without am/is/are.'
                  : 'Kata kerja aktif dasar (Verb 1) seperti agree atau go dipakai langsung setelah subjek (I agree), tanpa to be.';
              st.bullets = Array.from(new Set([...kept.slice(0, 2), coreToBeRule, activeRule])).slice(0, 4);
            } else {
              st.bullets = st.bullets.map((b) => refineOverbroadRule(b));
            }
            const nar = String(st.spokenNarration || '');
            if (!(/verb[\s-]*ing|v[\s-]*ing/i.test(nar) && /verb\s*3|\bv3\b|pasif|passive/i.test(nar))) {
              st.spokenNarration =
                locale === 'en'
                  ? 'Watch the core rule carefully: To Be like am, is, or are only pairs with adjectives, nouns, Verb ing for ongoing actions, or Verb 3 for passive voice. Combining To Be with Verb 1 is generally wrong, so active base verbs like agree stand directly after the subject.'
                  : 'Perhatikan logika dasarnya dengan tepat: To Be seperti am, is, atau are hanya bisa dipakai bersama kata sifat atau benda, Verb ing untuk aktivitas yang sedang terjadi, serta Verb 3 untuk kalimat pasif. Menggabungkan To Be dengan Verb 1 umumnya salah, jadi kata kerja dasar seperti agree berdiri langsung setelah subjek.';
            }
          }
          if (typeof st.analogy === 'string') st.analogy = refineOverbroadRule(st.analogy);
          if (typeof st.descA === 'string') st.descA = refineOverbroadRule(st.descA);
          if (typeof st.descB === 'string') st.descB = refineOverbroadRule(st.descB);
          if (typeof st.reason === 'string') st.reason = refineOverbroadRule(st.reason);
          if (typeof st.spokenNarration === 'string') st.spokenNarration = refineOverbroadRule(st.spokenNarration);
          if (typeof st.caption === 'string') st.caption = refineOverbroadRule(st.caption);
        }
        if (typeof uiAction.trapWrongReason === 'string') {
          uiAction.trapWrongReason = refineOverbroadRule(uiAction.trapWrongReason);
        }
      }

      // Universal visual-semantic & completeness guard for ANY random topic (grammar, particles, STEM, math, coding)
      const tblStepRef = steps.find((t) => t && t.kind === 'table' && Array.isArray(t.tableRows) && t.tableRows.length > 0);
      const noteStepRef = steps.find((n) => n && n.kind === 'note' && Array.isArray(n.bullets) && n.bullets.length > 0);
      const isLegitDoVsToBeContrast =
        targetLang === 'en' &&
        !isStativeFocusTurn &&
        /\b(?:do|does|did)\b/i.test(`${userText || ''} ${uiAction.topicTitle || ''} ${uiAction.patternFormula || ''}`) &&
        /\b(?:am|is|are|to\s*be)\b/i.test(`${userText || ''} ${uiAction.topicTitle || ''} ${uiAction.patternFormula || ''}`);
      const stripCameraNoise = (str) =>
        typeof str === 'string'
          ? str
              .replace(/\b(?:seperti\s+kamera\s+foto(?:\s+mati)?|seperti\s+video(?:\s+berjalan)?|foto\s+snapshot|kamera\s+foto\s+vs\s+video(?:\s+aksi)?|identitas\s*\(foto\)|aksi\s*\(video\)|mode\s+foto|mode\s+video|foto\s+mati|\bkamera\b|\bfoto\b|\bvideo\b)\b/gi, '')
              .replace(/\s{2,}/g, ' ')
              .replace(/^[\s,:;\-—–]+|[\s,:;\-—–]+$/g, '')
              .trim()
          : '';

      for (let sIdx = 0; sIdx < steps.length; sIdx++) {
        const st = steps[sIdx];
        if (!st || typeof st !== 'object') continue;
        // Strip misplaced sceneTheme from non-metaphor kinds (or non-ToBe-vs-Do topics on rough_scene / syntax_flow / etc.)
        if (
          st.kind !== 'metaphor_scene' &&
          (st.sceneTheme === 'rpg_stats' || (!isLegitDoVsToBeContrast && st.sceneTheme === 'camera_vs_video'))
        ) {
          st.sceneTheme = undefined;
          if (typeof st.title === 'string') st.title = stripCameraNoise(st.title) || st.title;
          if (typeof st.caption === 'string') st.caption = stripCameraNoise(st.caption);
          if (typeof st.analogy === 'string') st.analogy = stripCameraNoise(st.analogy);
          if (Array.isArray(st.shapes)) {
            st.shapes = st.shapes.map((sh) =>
              sh && typeof sh === 'object'
                ? {
                    ...sh,
                    ...(typeof sh.label === 'string' ? { label: stripCameraNoise(sh.label) || sh.label } : {}),
                    ...(typeof sh.sublabel === 'string' ? { sublabel: stripCameraNoise(sh.sublabel) } : {}),
                    ...(typeof sh.text === 'string' ? { text: stripCameraNoise(sh.text) || sh.text } : {}),
                  }
                : sh
            );
          }
          if (typeof st.spokenNarration === 'string' && /kamera|foto\s*mati|mode\s*video/i.test(st.spokenNarration)) {
            st.spokenNarration = '';
          }
        }
        const stepTextBlob = `${st.title || ''} ${st.analogy || ''} ${st.caption || ''} ${st.leftPanel?.title || ''} ${st.rightPanel?.title || ''} ${st.spokenNarration || ''}`;
        const usesMisplacedCameraOrRpg =
          ((st.kind === 'metaphor_scene' || st.kind === 'contrast_scale') &&
            (st.sceneTheme === 'rpg_stats' ||
              (!isLegitDoVsToBeContrast &&
                (st.sceneTheme === 'camera_vs_video' || /\b(?:foto\s*mati|kamera|mode\s*video)\b/i.test(stepTextBlob)))));
        if (usesMisplacedCameraOrRpg || ((st.kind === 'contrast_scale' || st.kind === 'metaphor_scene') && (tblStepRef?.tableRows?.length || 0) >= 3 && /\bvs\b.*(?:\bvs\b|\bdan\b)|\b(?:tiga|3)\b|much.*many.*a\s+lot|in.*on.*at/i.test(`${userText || ''} ${uiAction.topicTitle || ''}`))) {
          const tblRows = tblStepRef?.tableRows || [];
          const hasThreePlusCategories =
            tblRows.length >= 3 &&
            new Set(tblRows.map((r) => String(r?.[0] || '').trim().toLowerCase()).filter(Boolean)).size >= 3;
          if (hasThreePlusCategories) {
            const palette = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
            const icons = ['star', 'bolt', 'check', 'target'];
            const branches = tblRows.slice(0, 4).map((r, bIdx) => ({
              label: cleanSpokenText(r[0] || `Poin ${bIdx + 1}`).slice(0, 42),
              sublabel: cleanSpokenText(r[1] || r[2] || '').slice(0, 120),
              example: cleanSpokenText(r[2] || r[1] || '').slice(0, 120),
              icon: icons[bIdx % icons.length],
              color: palette[bIdx % palette.length],
            }));
            steps[sIdx] = {
              ...st,
              kind: 'mind_map',
              sceneTheme: undefined,
              title: stripCameraNoise(st.title) || `Peta Konsep: ${cleanSpokenText(uiAction.topicTitle || 'Topik')}`,
              metaphorCenterLabel: cleanSpokenText(uiAction.topicTitle || st.title || 'Konsep Inti').slice(0, 28),
              branches,
              leftPanel: undefined,
              rightPanel: undefined,
              spokenNarration: '',
            };
          } else {
            const [fallbackA, fallbackB] = VALID_TERM_FALLBACKS(uiAction.topicTitle, tblRows);
            const rawLeftTitle = stripCameraNoise(st.leftPanel?.title || st.termA);
            const rawRightTitle = stripCameraNoise(st.rightPanel?.title || st.termB);
            const leftTitle =
              rawLeftTitle && !/^(?:pola\s+pertama|sisi\s+a|konsep\s*1)$/i.test(rawLeftTitle)
                ? rawLeftTitle
                : fallbackA;
            const rightTitle =
              rawRightTitle && !/^(?:pola\s+kedua|sisi\s+b|konsep\s*2)$/i.test(rawRightTitle)
                ? rawRightTitle
                : fallbackB;
            const leftDesc =
              [stripCameraNoise(st.leftPanel?.subtitle || st.descA), st.leftPanel?.example ? `Contoh: ${cleanSpokenText(st.leftPanel.example)}` : '']
                .filter(Boolean)
                .join(' — ') ||
              cleanSpokenText(tblRows[0]?.slice(1).filter(Boolean).join(' • ') || uiAction.patternFormula || '');
            const rightDesc =
              [stripCameraNoise(st.rightPanel?.subtitle || st.descB), st.rightPanel?.example ? `Contoh: ${cleanSpokenText(st.rightPanel.example)}` : '']
                .filter(Boolean)
                .join(' — ') ||
              cleanSpokenText(tblRows[1]?.slice(1).filter(Boolean).join(' • ') || uiAction.sampleTarget || '');
            steps[sIdx] = {
              ...st,
              kind: 'contrast_scale',
              sceneTheme: undefined,
              title: stripCameraNoise(st.title) || `Perbandingan: ${leftTitle} vs ${rightTitle}`,
              termA: leftTitle,
              descA: leftDesc,
              termB: rightTitle,
              descB: rightDesc,
              analogy: stripCameraNoise(st.analogy || st.caption) || cleanSpokenText(uiAction.patternFormula || ''),
              leftPanel: undefined,
              rightPanel: undefined,
              spokenNarration: stripCameraNoise(st.spokenNarration).split(/\s+/).filter(Boolean).length >= 16 &&
                !/kamera|foto|video/i.test(st.spokenNarration || '')
                ? st.spokenNarration
                : '',
            };
          }
        }
        // Scrub any generic Pola Pertama / Pola Kedua / Sisi A / Sisi B / Visualisasi Lokasi labels emitted directly by Gemini
        if (st.title && /^(?:visualisasi\s+(?:lokasi|aksi|konsep|perbedaan)|pola\s+(?:pertama|kedua))$/i.test(st.title.trim())) {
          st.title = `Peta Konsep: ${cleanSpokenText(uiAction.topicTitle || 'Struktur Utama').slice(0, 42)}`;
        }
        const [safeA, safeB] = VALID_TERM_FALLBACKS(uiAction.topicTitle, tblStepRef?.tableRows || []);
        if (st.termA && /^(?:pola\s+pertama|sisi\s+a|konsep\s*1)$/i.test(st.termA.trim())) st.termA = safeA;
        if (st.termB && /^(?:pola\s+kedua|sisi\s+b|konsep\s*2)$/i.test(st.termB.trim())) st.termB = safeB;
        if (st.leftPanel?.title && /^(?:pola\s+pertama|sisi\s+a|konsep\s*1)$/i.test(st.leftPanel.title.trim())) {
          st.leftPanel.title = safeA;
        }
        if (st.rightPanel?.title && /^(?:pola\s+kedua|sisi\s+b|konsep\s*2)$/i.test(st.rightPanel.title.trim())) {
          st.rightPanel.title = safeB;
        }
      }

      // Salvage ANY rough_scene missing >= 3 labeled SVG primitives AND missing >= 2 graphNodes so every STEM/Science/Math/Grammar board draws cleanly
      const truncScene = (str, max = 46) => {
        const clean = cleanSpokenText(str || '');
        return clean.length <= max ? clean : clean.slice(0, max - 1).trim();
      };
      for (let sIdx = 0; sIdx < steps.length; sIdx++) {
        const st = steps[sIdx];
        if (!st || st.kind !== 'rough_scene') continue;
        const shapes = Array.isArray(st.shapes) ? st.shapes : [];
        const meaningfulCount = shapes.filter(
          (sh) => sh && (sh.label || sh.text || sh.op === 'polygon' || sh.op === 'circle' || sh.op === 'rect')
        ).length;
        const validGraphNodesCount = Array.isArray(st.graphNodes)
          ? st.graphNodes.filter((n) => n && (n.label || n.id)).length
          : 0;
        if (meaningfulCount >= 3 || validGraphNodesCount >= 2) continue;

        const tblRows = tblStepRef?.tableRows || [];
        const bullets = noteStepRef?.bullets || [];
        const palette = [
          { fill: '#DBEAFE', stroke: '#1D4ED8' },
          { fill: '#DCFCE7', stroke: '#15803D' },
          { fill: '#FEF3C7', stroke: '#B45309' },
        ];
        const synthesizedShapes = [];
        const synthesizedGraphNodes = [];
        const synthesizedGraphEdges = [];
        if (tblRows.length >= 2) {
          const cards = tblRows.slice(0, 3);
          const colW = cards.length === 2 ? 236 : 162;
          const gap = cards.length === 2 ? 44 : 18;
          const startX = cards.length === 2 ? 22 : 16;
          cards.forEach((row, idx) => {
            const x = startX + idx * (colW + gap);
            const c = palette[idx % palette.length];
            const lbl = truncScene(row[0] || `Bagian ${idx + 1}`, 26);
            const sub = truncScene(row.slice(1).filter(Boolean).join(': '), 52);
            synthesizedGraphNodes.push({ id: `n${idx + 1}`, label: lbl, sublabel: sub, fill: c.fill, stroke: c.stroke });
            if (idx > 0) synthesizedGraphEdges.push({ from: `n${idx}`, to: `n${idx + 1}` });
            synthesizedShapes.push({
              op: 'rect',
              x,
              y: 26,
              w: colW,
              h: 112,
              fill: c.fill,
              stroke: c.stroke,
              label: lbl,
              sublabel: sub,
            });
            if (idx < cards.length - 1) {
              synthesizedShapes.push({
                op: 'arrow',
                x1: x + colW + 4,
                y1: 82,
                x2: x + colW + gap - 4,
                y2: 82,
                stroke: '#1E293B',
              });
            }
          });
        } else {
          const flowItems = (bullets.length >= 2 ? bullets : [uiAction.patternFormula || uiAction.topicTitle, uiAction.sampleTarget || uiAction.explanationText])
            .filter(Boolean)
            .slice(0, 3);
          const count = Math.max(2, flowItems.length);
          const colW = count === 2 ? 236 : 162;
          const gap = count === 2 ? 44 : 18;
          const startX = count === 2 ? 22 : 16;
          for (let idx = 0; idx < count; idx++) {
            const rawItem = String(flowItems[idx] || uiAction.topicTitle || `Tahap ${idx + 1}`);
            const parts = rawItem.split(/[:—–-]\s+/);
            const lbl = truncScene(parts.length > 1 ? parts[0] : `Langkah ${idx + 1}`, 24);
            const sub = truncScene(parts.length > 1 ? parts.slice(1).join(' ') : rawItem, 52);
            const x = startX + idx * (colW + gap);
            const c = palette[idx % palette.length];
            synthesizedGraphNodes.push({ id: `n${idx + 1}`, label: lbl, sublabel: sub, fill: c.fill, stroke: c.stroke });
            if (idx > 0) synthesizedGraphEdges.push({ from: `n${idx}`, to: `n${idx + 1}` });
            synthesizedShapes.push({
              op: 'rect',
              x,
              y: 26,
              w: colW,
              h: 112,
              fill: c.fill,
              stroke: c.stroke,
              label: lbl,
              sublabel: sub,
            });
            if (idx < count - 1) {
              synthesizedShapes.push({
                op: 'arrow',
                x1: x + colW + 4,
                y1: 82,
                x2: x + colW + gap - 4,
                y2: 82,
                stroke: '#1E293B',
              });
            }
          }
        }
        const footerFormula = truncScene(uiAction.patternFormula || uiAction.sampleTarget || st.caption || uiAction.topicTitle, 64);
        if (footerFormula) {
          synthesizedShapes.push({
            op: 'text',
            x: 24,
            y: 184,
            text: `Kunci: ${footerFormula}`,
            stroke: '#0F172A',
            size: 'sm',
          });
        }
        steps[sIdx] = {
          ...st,
          width: 560,
          height: 225,
          caption: st.caption || footerFormula || uiAction.topicTitle,
          shapes: synthesizedShapes,
          graphDirection: 'LR',
          graphNodes: synthesizedGraphNodes,
          graphEdges: synthesizedGraphEdges,
          spokenNarration: '',
        };
      }

      for (const st of steps) {
        if (!st || typeof st !== 'object') continue;
        const isFlowOrLinearDiagram =
          st.kind === 'syntax_flow' ||
          st.kind === 'formula_blocks' ||
          st.kind === 'timeline_track' ||
          st.kind === 'step_chain';
        if (
          isFlowOrLinearDiagram &&
          typeof st.spokenNarration === 'string' &&
          /(?:di\s+)?sisi\s+(?:kiri|kanan)|panel\s+(?:kiri|kanan)|mode\s+video|\bkamera\b/i.test(st.spokenNarration)
        ) {
          // Clear phantom off-card direction so fallback below narrates 1:1 with visible nodes
          st.spokenNarration = '';
        }
        const rawNarClean = String(st.spokenNarration || '').trim();
        const isVagueDiagramTitleOnly =
          st.kind !== 'heading' &&
          st.kind !== 'highlight_callout' &&
          /^(?:visualisasi|alur|skema|diagram|peta)\s+[\w\s]{1,36}\.?$/i.test(rawNarClean);
        const curWords = rawNarClean.split(/\s+/).filter(Boolean).length;
        if (boardExplanationLocale === 'id' && (curWords < 11 || isVagueDiagramTitleOnly)) {
          if (st.kind === 'timeline_track' && Array.isArray(st.timelineEvents) && st.timelineEvents.length) {
            st.spokenNarration = `Ikuti garis waktu dari kiri ke kanan: ${st.timelineEvents.slice(0, 4).map((ev) => `${ev.timeLabel || ''} yaitu ${ev.title || ''}${ev.example ? `, contohnya ${ev.example}` : ''}`).join('. Kemudian ')}.`;
          } else if (st.kind === 'formula_blocks' && Array.isArray(st.blocks) && st.blocks.length) {
            st.spokenNarration = `Perhatikan blok polanya dari kiri ke kanan: ${st.blocks.slice(0, 5).map((bl) => `${bl.role || ''} berisi ${bl.token || ''}${bl.note ? ` untuk ${bl.note}` : ''}`).join('. ')}.`;
          } else if (st.kind === 'mind_map' && Array.isArray(st.branches) && st.branches.length) {
            st.spokenNarration = `Mari baca cabang konsepnya: ${st.branches.slice(0, 4).map((b) => `${b.label || ''} (${b.sublabel || ''})${b.example ? `, contohnya ${b.example}` : ''}`).join('. ')}.`;
          } else if (st.kind === 'contrast_scale' && (st.termA || st.termB)) {
            st.spokenNarration = `Bandingkan sisi kiri, ${st.termA || ''}: ${st.descA || ''}, dengan sisi kanan, ${st.termB || ''}: ${st.descB || ''}. ${st.analogy ? `Kuncinya: ${st.analogy}.` : ''}`.trim();
          } else if (st.kind === 'syntax_flow' && Array.isArray(st.nodes) && st.nodes.length) {
            const chain = st.nodes.map((n) => `${n.role || 'Slot'} diisi ${n.word || ''}`.trim()).filter(Boolean).join(', lalu ');
            const whySuffix = uiAction.trapWrongReason ? ` Alasannya jelas: ${uiAction.trapWrongReason}` : '';
            st.spokenNarration = `Perhatikan urutan blok kalimat yang benar dari kiri ke kanan: ${chain}.${whySuffix}`.replace(/\.{2,}/g, '.').trim();
          } else if (st.kind === 'rough_scene' && ((Array.isArray(st.graphNodes) && st.graphNodes.length) || (Array.isArray(st.shapes) && st.shapes.length))) {
            const nodeLabels = Array.isArray(st.graphNodes) && st.graphNodes.length
              ? st.graphNodes.map((n) => `${cleanSpokenText(n.label || '')}${n.sublabel ? ` (${cleanSpokenText(n.sublabel)})` : ''}`).filter((x) => x.length >= 2).slice(0, 4)
              : (st.shapes || []).map((sh) => `${cleanSpokenText(sh.label || sh.text || '')}${sh.sublabel ? ` (${cleanSpokenText(sh.sublabel)})` : ''}`).filter((x) => x.length >= 2).slice(0, 4);
            if (nodeLabels.length > 0) {
              st.spokenNarration = `Amati alur diagram ini secara berurutan: mulai dari ${nodeLabels.join(', kemudian ')}.${st.caption ? ` ${cleanSpokenText(st.caption)}.` : ''}`.replace(/\.{2,}/g, '.').trim();
            }
          }
        }
      }
      // Final copy hygiene: eliminate hyphenated Verb-ing / V-ing across every learner-visible string
      const normalizeBoardHyphensDeep = (val, depth = 0) => {
        if (depth > 8) return val;
        if (typeof val === 'string') {
          return val
            .replace(/\bverb-ing\b/gi, (m) => (m[0] === 'V' ? 'Verb ing' : 'verb ing'))
            .replace(/\bv-ing\b/gi, (m) => (m[0] === 'V' ? 'V ing' : 'v ing'));
        }
        if (Array.isArray(val)) return val.map((x) => normalizeBoardHyphensDeep(x, depth + 1));
        if (val && typeof val === 'object') {
          for (const k of Object.keys(val)) {
            val[k] = normalizeBoardHyphensDeep(val[k], depth + 1);
          }
        }
        return val;
      };
      normalizeBoardHyphensDeep(uiAction);
      uiAction.explanationLocale = boardExplanationLocale;
      aiReply = normalizeBoardHyphensDeep(aiReply);
      aiReplyTranslation = normalizeBoardHyphensDeep(aiReplyTranslation);
    } catch (_) {}
  }

  const CANONICAL_TAXONOMY_SET = new Set([
    'tense_aspect.aspect_for_completed', 'tense_aspect.habitual_overgeneralized',
    'tense_aspect.progressive_overuse', 'tense_aspect.perfect_misuse',
    'tense_aspect.timeline_mismatch', 'tense_aspect.future_form_confusion',
    'agreement.bare_form', 'agreement.number_mismatch', 'agreement.missing_auxiliary',
    'structure.double_marking', 'structure.word_order', 'structure.inversion_error',
    'structure.malformed_blend', 'structure.omitted_element',
    'modality.function_confusion', 'modality.strength_miscalibrated',
    'modality.negation_scope', 'modality.past_reference_error',
    'conditionals.type_mismatch', 'conditionals.clause_form_swap',
    'passive.active_for_passive', 'passive.participle_form',
    'passive.causative_confusion', 'passive.impersonal_pattern',
    'reported.backshift_error', 'reported.deixis_shift',
    'articles.definiteness_mismatch', 'articles.countability_quantifier',
    'articles.sound_rule', 'articles.zero_article',
    'comparison.degree_scope', 'comparison.form_intensifier',
    'prepositions.semantic_category', 'prepositions.collocation',
    'lexical.form_confusion', 'lexical.register_mismatch',
    'complementation.gerund_infinitive_swap', 'complementation.meaning_pair_shift',
    'complementation.bare_form_error', 'complementation.verb_pattern',
    'relative.pronoun_choice', 'relative.restrictiveness', 'relative.reduction_error',
    'question.auxiliary_error', 'question.polarity_negation', 'question.wh_choice',
    'pronouns.case_form', 'linking.connector_choice', 'transfer.id_l1_pattern',
  ]);
  const resolveCanonicalDiagCode = (rawCode, whyText, lang) => {
    const clean = String(rawCode || '').trim().toLowerCase();
    if (CANONICAL_TAXONOMY_SET.has(clean)) return clean;
    const probe = `${clean} ${String(whyText || '')} ${String(userText || '')}`.toLowerCase();
    if (/lampau|past|yesterday|tense|timeline/.test(probe)) return 'tense_aspect.timeline_mismatch';
    if (/continuous|progressive|stative|-ing\b/.test(probe)) return 'tense_aspect.progressive_overuse';
    if (/perfect|already|since/.test(probe)) return 'tense_aspect.perfect_misuse';
    if (/future|will\b|going\s+to/.test(probe)) return 'tense_aspect.future_form_confusion';
    if (/partikel|は|が|を|に|で|preposit|in\/on\/at/.test(probe)) return 'prepositions.semantic_category';
    if (/plural|singular|number|agreement|subjek/.test(probe)) return 'agreement.number_mismatch';
    if (/auxiliary|kata bantu|tanya/.test(probe)) return 'agreement.missing_auxiliary';
    if (/infleksi|bare|third\s*person|goed|buyed|eated/.test(probe)) return 'agreement.bare_form';
    if (/double_mark|although.*but/.test(probe)) return 'structure.double_marking';
    if (/urutan|word_order|svo/.test(probe)) return 'structure.word_order';
    if (/konjugasi|blend|desu_verb|tara/.test(probe)) return 'structure.malformed_blend';
    if (/modal|must|should|might/.test(probe)) return 'modality.function_confusion';
    if (/passive|pasif|participle/.test(probe)) return 'passive.participle_form';
    if (/article|a\/an\/the|satuan|quantifier/.test(probe)) return 'articles.definiteness_mismatch';
    if (/agree|kopula|l1|indones/.test(probe)) return 'transfer.id_l1_pattern';
    if (/tone|pitch|nada|aksen|phonem|pronun/.test(probe)) return 'lexical.form_confusion';
    return lang === 'ja' || lang === 'zh' ? 'structure.malformed_blend' : 'lexical.form_confusion';
  };

  let normalizedDiagnosis = null;
  const rawDiag = gen?.parsed?.diagnosis;
  if (rawDiag && typeof rawDiag === 'object' && typeof rawDiag.ok === 'boolean') {
    const corr = cleanSpokenText(rawDiag.correction || '').slice(0, 280);
    const why = cleanSpokenText(rawDiag.whyFailsId || rawDiag.reason || '').slice(0, 420);
    const hasFixDiff = Boolean(corr && corr.toLowerCase() !== String(userText || '').trim().toLowerCase());
    const diagOk = rawDiag.ok && !rawDiag.misconceptionCode && !hasFixDiff;
    const canonicalCode = !diagOk
      ? resolveCanonicalDiagCode(rawDiag.misconceptionCode || rawDiag.misconceptionId, why, targetLang)
      : null;
    normalizedDiagnosis = {
      ok: diagOk,
      misconceptionCode: canonicalCode,
      canonicalCode,
      whyFailsId: diagOk ? '' : why || (corr ? `Bentuk lebih tepat: ${corr}` : 'Periksa ketepatan tata bahasa dan pilihan kata.'),
      correction: diagOk ? '' : corr,
      source: 'gemini_neural_partner',
    };
  }

  const partnerTurnPayload = {
    ok: true,
    source: 'ai-realtime',
    model: gen.model,
    aiReply,
    aiReplyTranslation: aiReplyTranslation || aiReply,
    aiReplyTranslationId:
      locale === 'id'
        ? (aiReplyTranslation || aiReply)
        : cleanSpokenText(gen.parsed.aiReplyTranslationId || ''),
    aiReplyTranslationTh:
      locale === 'th'
        ? (aiReplyTranslation || aiReply)
        : cleanSpokenText(gen.parsed.aiReplyTranslationTh || ''),
    ...(normalizedDiagnosis ? { diagnosis: normalizedDiagnosis } : {}),
    replies,
    uiAction,
    isExplanation: isExplanationTurn || actionType === 'open_learning_popup',
  };
  if (
    isCacheableStandaloneBoard &&
    boardCacheKey &&
    uiAction?.actionType === 'open_learning_popup' &&
    Array.isArray(uiAction?.whiteboardSteps) &&
    uiAction.whiteboardSteps.length >= 4
  ) {
    await writeWorkerCache(ctx, 'board', boardCacheKey, partnerTurnPayload, _boardMemoryCache, 64, 1800);
  }
  return {
    status: 200,
    cacheHeader: 'MISS',
    payload: partnerTurnPayload,
  };
}

export async function routeVoicePartnerTurn(ctx) {
  const res = await executePartnerTurnCore(ctx);
  return jsonResponse(res.payload, {
    status: res.status || 200,
    headers: {
      'cache-control': 'no-store',
      ...(res.cacheHeader ? { 'x-fiezel-cache': res.cacheHeader } : {}),
    },
  });
}

export async function routeVoiceWhiteboardStream(ctx) {
  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let openerSent = false;
      const emit = (eventName, obj) => {
        try {
          const cleanObj = stripDashesDeep(obj);
          controller.enqueue(enc.encode(`event: ${eventName}\ndata: ${JSON.stringify(cleanObj)}\n\n`));
        } catch {
          // Stream closed
        }
      };
      try {
        const res = await executePartnerTurnCore(ctx, {
          body,
          onOpenerReady: (openerData) => {
            if (openerSent) return;
            openerSent = true;
            emit('opener', openerData);
          },
        });
        if (!openerSent && res?.payload?.uiAction?.whiteboardSteps?.[0]) {
          openerSent = true;
          emit('opener', {
            topicTitle: res.payload.uiAction.topicTitle || res.payload.uiAction.whiteboardSteps[0].title || '',
            patternFormula: res.payload.uiAction.patternFormula || '',
            headingStep: res.payload.uiAction.whiteboardSteps[0],
            model: res.payload.model || 'gemini',
          });
        }
        emit('board', res?.payload || { ok: false, fallback: true });
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } catch (err) {
        emit('board', { ok: false, fallback: true, reason: err?.message || 'stream_error' });
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-store',
      'x-accel-buffering': 'no',
      ...(ctx?.corsHeaders || {}),
    },
  });
}

function sanitizeSyncToken(value, fallback = '') {
  const cleaned = String(value == null ? '' : value)
    .trim()
    .replace(/[^A-Za-z0-9._:@#-]/g, '_')
    .slice(0, 80);
  return cleaned || fallback;
}

function projectVoiceSyncAttempt(raw, tabId, nowMs) {
  if (!raw || typeof raw !== 'object') return null;
  const attemptId = sanitizeSyncToken(raw.id || raw.attemptId);
  if (!attemptId) return null;
  const okVal = typeof raw.verdict === 'boolean' ? raw.verdict : (typeof raw.ok === 'boolean' ? raw.ok : null);
  if (okVal === null) return null;
  const atRaw = Number(raw.timestamp ?? raw.at);
  const at = Number.isFinite(atRaw) && atRaw > 0 ? Math.floor(atRaw) : nowMs;
  const skill = sanitizeSyncToken(raw.competencyId || raw.skill || 'kaiwa_general', 'kaiwa_general');
  const item = sanitizeSyncToken(raw.scenarioId || raw.item || skill, skill);
  const candidate = {
    schema: 'fiezel-attempt-record-v1',
    attemptId,
    at,
    ok: okVal,
    type: 'speaking',
    skill,
    lesson: skill,
    item,
    concept: skill,
    kappa: raw.hintsUsed ? 0.5 : (raw.measureMode ? 1.0 : 0.75),
    timing: raw.hintsUsed ? 'struggled' : 'normal',
  };
  const pred = Number(raw.pMasteryBefore ?? raw.predicted);
  if (Number.isFinite(pred) && pred >= 0 && pred <= 1) candidate.predicted = Number(pred.toFixed(4));
  const misc = !okVal && raw.misconceptionId ? sanitizeSyncToken(raw.misconceptionId) : '';
  if (misc) candidate.misconception = misc;
  const sess = sanitizeSyncToken(tabId || raw.sessionId || raw.scenarioId);
  if (sess) candidate.sessionId = sess;
  return projectBrainAttempt(candidate);
}

/**
 * Handler POST /api/braincore/sync
 * Persists allowlisted voice attempts (no raw transcript/audio) to CORE_DB `brain_attempts`.
 */
export async function routeVoiceBraincoreSync(ctx) {
  const readRes = await readJsonFromCtx(ctx).catch(() => null);
  if (!readRes || !readRes.ok || !readRes.value || typeof readRes.value !== 'object') {
    return badRequest('invalid_sync_payload');
  }
  const body = readRes.value;
  if (!Array.isArray(body.attempts)) {
    return badRequest('missing_attempts_array');
  }
  const sub = String(ctx?.identity?.sub || '').trim();
  if (!sub) {
    return unauthenticated({ headers: ctx?.corsHeaders || {} });
  }
  const db = (ctx && ctx.env && (ctx.env.CORE_DB || ctx.env.DB)) || null;
  if (!db || typeof db.prepare !== 'function') {
    return jsonResponse(
      { ok: false, error: 'storage_unavailable' },
      { status: 503, headers: ctx?.corsHeaders || {} }
    );
  }

  const now = Number(ctx?.now) || Date.now();
  const batch = body.attempts.slice(0, 100);
  const projected = [];
  for (const rawAttempt of batch) {
    const clean = projectVoiceSyncAttempt(rawAttempt, body.tabId, now);
    if (clean) projected.push(clean);
  }

  if (projected.length > 0) {
    try {
      await ensureLegacySchema(db);
      const stmts = projected.map((att) =>
        db.prepare(
          'INSERT OR REPLACE INTO brain_attempts (sub, attempt_id, data, created_at) VALUES (?, ?, ?, ?)'
        ).bind(sub, att.attemptId, JSON.stringify(att), now)
      );
      if (typeof db.batch === 'function') {
        await db.batch(stmts);
      } else {
        for (const st of stmts) await st.run();
      }
    } catch (_) {
      return jsonResponse(
        { ok: false, error: 'storage_failed' },
        { status: 503, headers: ctx?.corsHeaders || {} }
      );
    }
  }

  const acceptedIds = projected.map((a) => a.attemptId);
  return jsonResponse({
    ok: true,
    persisted: true,
    acceptedIds,
    storedCount: acceptedIds.length,
    rejected: batch.length - acceptedIds.length,
    count: acceptedIds.length,
  });
}

/**
 * Handler POST /api/voice/sync-keys
 * Menerima daftar kunci sehat yang otomatis dipush dari Gemini Key Sentinel.
 * Disimpan langsung ke Cloudflare KV `CFG` (key `cfg:gemini_live_keys`)
 * sehingga aktif di semua edge secara global dalam <= 30 detik tanpa perlu redeploy worker!
 */
export async function routeVoiceSyncKeys(ctx) {
  const reqHeaders = ctx?.request?.headers;
  const authHeader = (
    reqHeaders?.get('x-sentinel-sync-key') ||
    reqHeaders?.get('x-fiezel-owner-token') ||
    reqHeaders?.get('authorization') ||
    ''
  ).trim();

  const envOwnerHash = String(ctx?.env?.OWNER_TOKEN_HASH || '').trim().toLowerCase();
  const envSyncKey = String(ctx?.env?.SENTINEL_SYNC_KEY || ctx?.env?.OWNER_TOKEN || '').trim();

  let isAuthorized = false;

  // 1. Verifikasi via sync key langsung jika disetel
  if (envSyncKey && (authHeader === envSyncKey || authHeader === `Bearer ${envSyncKey}`)) {
    isAuthorized = true;
  }

  // 2. Verifikasi via OWNER_TOKEN_HASH (sha256 konstan)
  if (!isAuthorized && envOwnerHash) {
    const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (rawToken) {
      const tokenBuffer = new TextEncoder().encode(rawToken);
      const digestBuffer = await crypto.subtle.digest('SHA-256', tokenBuffer);
      const digestHex = Array.from(new Uint8Array(digestBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toLowerCase();
      if (digestHex === envOwnerHash) {
        isAuthorized = true;
      }
    }
  }

  // Fail-closed unless explicit local test env flag ALLOW_INSECURE_LOCAL_SYNC === '1'
  if (!envOwnerHash && !envSyncKey && String(ctx?.env?.ALLOW_INSECURE_LOCAL_SYNC || '') === '1') {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return jsonResponse(
      { ok: false, error: 'forbidden_sync', message: 'Token otorisasi sync tidak valid.' },
      { status: 403 }
    );
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const rawKeys = Array.isArray(body?.keys)
    ? body.keys
    : typeof body?.keys === 'string'
    ? body.keys.split(',')
    : [];

  const validKeys = rawKeys
    .map((k) => String(k || '').trim())
    .filter((k) => k.length > 10 && (k.startsWith('AIza') || k.startsWith('AQ.')));

  if (!validKeys.length) {
    return jsonResponse(
      { ok: false, error: 'no_valid_keys', message: 'Daftar kunci kosong atau tidak ada yang valid.' },
      { status: 400 }
    );
  }

  if (ctx?.env?.CFG && typeof ctx.env.CFG.put === 'function') {
    await ctx.env.CFG.put('cfg:gemini_live_keys', validKeys.join(','));
  }

  return jsonResponse({
    ok: true,
    synchronized: true,
    activeCount: validKeys.length,
    timestamp: Date.now(),
    message: `Berhasil menyinkronkan ${validKeys.length} API key aktif ke Cloudflare KV.`
  });
}

/**
 * Handler POST /api/voice/translate
 * Menerjemahkan kalimat percakapan live secara akurat ke Bahasa Indonesia / Thailand
 * menggunakan kolam kunci Gemini (menggantikan endpoint tidak resmi translate.googleapis.com yang HTTP 500),
 * dengan jaminan NOL kebocoran aksara Kanji/Hanzi/Kana mentah.
 */
const LOCALE_LANG_NAMES = {
  id: 'natural conversational Indonesian',
  th: 'natural conversational Thai',
  ja: 'natural conversational Japanese',
  zh: 'natural conversational Mandarin Chinese',
  en: 'natural conversational English',
  ru: 'natural conversational Russian',
  km: 'natural conversational Khmer (Cambodian)',
  fil: 'natural conversational Filipino (Tagalog)',
  tl: 'natural conversational Filipino (Tagalog)',
  vi: 'natural conversational Vietnamese',
  ms: 'natural conversational Malay',
  fil: 'natural conversational Filipino / Tagalog',
  km: 'natural conversational Khmer',
  ru: 'natural conversational Russian',
  ko: 'natural conversational Korean',
  ar: 'natural conversational Arabic',
  es: 'natural conversational Spanish',
  fr: 'natural conversational French',
  de: 'natural conversational German',
  pt: 'natural conversational Portuguese',
  hi: 'natural conversational Hindi',
  my: 'natural conversational Burmese',
  lo: 'natural conversational Lao',
};

async function fallbackGoogleTranslate(text, targetLocale) {
  try {
    const tl = String(targetLocale || 'id').toLowerCase();
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 2200);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) return '';
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item) => (item && item[0] ? item[0] : '')).join('').trim();
    }
    return '';
  } catch {
    return '';
  }
}

async function fallbackMyMemoryTranslate(text, targetLocale, sourceLocale = 'en') {
  try {
    const tl = String(targetLocale || 'id').toLowerCase();
    const sl = String(sourceLocale || 'en').toLowerCase();
    if (!sl || sl === tl || sl === 'auto') return '';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(tl)}`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 2200);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) return '';
    const data = await res.json();
    const trans = data?.responseData?.translatedText;
    if (typeof trans === 'string' && trans.trim() && !trans.includes('MYMEMORY WARNING') && !trans.includes('IS AN INVALID SOURCE LANGUAGE')) {
      return trans.trim();
    }
    return '';
  } catch {
    return '';
  }
}

const _serverTranslationCache = new Map();

export async function routeVoiceTranslate(ctx) {
  const clientIp = (ctx.request && (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) || '';
  if (!checkLiveRateLimit(clientIp, 90, 60000)) {
  return jsonResponse({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const rawText = cleanSpokenText(body.text || '').slice(0, 600);
  if (!rawText) {
    return badRequest('empty_text');
  }

  const targetLocale = String(body.targetLocale || body.locale || 'id').toLowerCase().trim();
  const targetLangName = LOCALE_LANG_NAMES[targetLocale] || `natural conversational ${targetLocale}`;

  // Short-circuit if text is already in the target language
  if (
    targetLocale === 'id' &&
    /\b(adalah|sedangkan|gunakan|perhatikan|bagaimana|kenapa|kapan|jelaskan|bedanya|kalau|dipakai|kalimat|artinya|contoh|jangan|ketika)\b/i.test(
      rawText
    ) &&
    !/\b(what|where|when|would|should|could|have|been|going)\b/i.test(rawText)
  ) {
  return jsonResponse({
      ok: true,
      translatedText: rawText,
      locale: targetLocale,
      model: 'same-locale-bypass',
    });
  }
  if (targetLocale === 'th' && /[\u0E00-\u0E7F]{3,}/.test(rawText)) {
  return jsonResponse({
      ok: true,
      translatedText: rawText,
      locale: targetLocale,
      model: 'same-locale-bypass',
    });
  }
  if (targetLocale === 'km' && /[\u1780-\u17FF]{3,}/.test(rawText)) {
    return jsonResponse({ ok: true, translatedText: rawText, locale: targetLocale, model: 'same-locale-bypass' });
  }
  if (targetLocale === 'ru' && /[\u0400-\u04FF]{3,}/.test(rawText)) {
    return jsonResponse({ ok: true, translatedText: rawText, locale: targetLocale, model: 'same-locale-bypass' });
  }

  const cacheKey = `${targetLocale}::${rawText}`;
  if (_serverTranslationCache.has(cacheKey)) {
    const cachedVal = _serverTranslationCache.get(cacheKey) || '';
    if (/\p{L}{2,}/u.test(cachedVal)) {
  return jsonResponse({
        ok: true,
        translatedText: cachedVal,
        locale: targetLocale,
        model: 'server-cache',
      });
    }
    _serverTranslationCache.delete(cacheKey);
  }

  const isNonCjkTarget = targetLocale !== 'ja' && targetLocale !== 'zh' && targetLocale !== 'ko';
  const isValidTranslatedCandidate = (cand) => {
    const s = String(cand || '').trim();
    if (!s) return false;
    if (isNonCjkTarget) {
      const nonCjkLetters = (s.match(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u0E00-\u0E7F\u1780-\u17FF\u0400-\u04FF]/g) || []).length;
      const cjkChars = (s.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
      if (nonCjkLetters < 2) return false;
      if (cjkChars > nonCjkLetters) return false;
      return true;
    }
    return /\p{L}{2,}/u.test(s);
  };

  const detectedSourceLoc = /[\u3040-\u30ff]/.test(rawText)
    ? 'ja'
    : /[\u3400-\u4dbf\u4e00-\u9fff]/.test(rawText)
      ? 'zh-CN'
      : /[\u0E00-\u0E7F]/.test(rawText)
        ? 'th'
        : /\b(saya|aku|kamu|anda|yang|dengan|untuk|tidak|bisa|mau|ingin|adalah|sudah|apa|bagaimana|terima kasih)\b/i.test(rawText)
          ? 'id'
          : String(body.sourceLang || body.sourceLocale || 'en').toLowerCase().trim();

  const keys = await resolvePoolKeys(ctx);
  let translatedText = '';
  let modelUsed = 'gemini-pool';

  // Prefer contextual Gemini REST translation when keys are available so idioms
  // ("Boom! There you go!" -> "Mantap! Nah, itu dia!") are never mistranslated literally by gtx.
  if (keys.length >= 1) {
    const cjkRule = !isNonCjkTarget
      ? 'Use appropriate native Kanji/Kana/Hanzi characters for natural readability in this language.'
      : 'ZERO raw Chinese Hanzi or Japanese Kanji characters in the output! If referencing a specific term, write its Romanized form.';

    const prompt = [
      `Translate the following spoken language-tutor utterance accurately and naturally into ${targetLangName}.`,
      `STRICT RULES:`,
      `1) Translate the EXACT meaning and idiomatic tone (e.g. praise/interjections like "Boom! There you go!" -> "Mantap! Nah, itu dia!", NEVER literal "Ledakan!"), and NEVER output generic summaries like "Mochi menanggapi...".`,
      `2) ${cjkRule}`,
      `Utterance: "${rawText}"`,
      `JSON only: {"translatedText":"..."}`,
    ].join('\n');

    const gen = await runGeminiJsonWithPool(keys, prompt, 0.2, 450);
    if (gen.ok && gen.parsed) {
      const gemCand = cleanSpokenText(
        gen.parsed.translatedText || gen.parsed.translation || gen.parsed.aiMeaning || ''
      );
      if (isValidTranslatedCandidate(gemCand)) {
        translatedText = gemCand;
        modelUsed = gen.model || 'gemini';
      }
    }
  }

  if (!translatedText) {
    const gtxCand = await fallbackGoogleTranslate(rawText, targetLocale);
    if (isValidTranslatedCandidate(gtxCand)) {
      translatedText = gtxCand;
      modelUsed = 'gtx-fast';
    }
  }

  if (!translatedText) {
    const mmCand = await fallbackMyMemoryTranslate(rawText, targetLocale, detectedSourceLoc);
    if (isValidTranslatedCandidate(mmCand)) {
      translatedText = mmCand;
      modelUsed = 'mymemory-fast';
    }
  }

  // Only strip CJK characters if the target language is NOT Japanese, Chinese, or Korean!
  if (isNonCjkTarget && translatedText) {
    translatedText = translatedText
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (!isValidTranslatedCandidate(translatedText)) {
  return jsonResponse({ ok: false, reason: 'empty_translation' }, { status: 503 });
  }

  if (_serverTranslationCache.size > 500) {
    const firstKey = _serverTranslationCache.keys().next().value;
    if (firstKey) _serverTranslationCache.delete(firstKey);
  }
  _serverTranslationCache.set(cacheKey, translatedText);

  return jsonResponse({
    ok: true,
    translatedText,
    locale: targetLocale,
    model: modelUsed,
  });
}

/**
 * Handler POST /api/voice/gemini-tts
 * Menghasilkan suara ekspresif berkarakter asli (Hood American, Tokyo/Kansai Tsundere, Beijing Putonghua,
 * serta Bahasa Indonesia / Thai natural saat menjelaskan di Papan Tulis)
 * menggunakan Gemini 3.8 TTS (`gemini-3.8-flash-lite-tts` / `gemini-3.8-flash-tts`) + kolam kunci,
 * sehingga aplikasi bebas total dari suara robotik Edge TTS!
 */
export async function routeVoiceGeminiTts(ctx) {
  const clientIp =
    (ctx.request && (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) || '';
  if (!checkLiveRateLimit(clientIp, 60, 60000)) {
  return jsonResponse({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const keys = await resolvePoolKeys(ctx);
  if (!keys.length) {
  return jsonResponse({ ok: false, error: 'no_keys_configured' }, { status: 503 });
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  // Izinkan naskah papan tulis hingga 2800 karakter disintesis menjadi audio studio jernih
  const cleanText = cleanSpokenText(body.text || '').slice(0, 2800);
  if (!cleanText) {
    return badRequest('empty_text');
  }

  const personaId = cleanSpokenText(body.personaId || '').toLowerCase();
  const rawRequestedLang = String(body.spokenLang || body.speechLang || body.targetLang || 'en')
    .toLowerCase()
    .split(/[-_]/)[0]
    .trim();
  const normReqLang = rawRequestedLang === 'tl' ? 'fil' : rawRequestedLang;
  let effectiveLang = ['id', 'th', 'ja', 'zh', 'en', 'vi', 'ru', 'ms', 'ko', 'km', 'fil', 'ar', 'es', 'fr', 'de', 'pt', 'hi', 'my', 'lo'].includes(normReqLang)
    ? normReqLang
    : 'en';

  const hasSubstantialLatinForSsw =
    personaId === 'ssw_sensei' &&
    ((cleanText.match(/[A-Za-z]{2,}/g) || []).length >= 2 ||
      /\b(halaman|hal|tahap|soal|jawaban|klorin|alergen|suhu|rumus|persen|benar|salah|coba|cek|lanjut|mulai|angka|emas|jebakan|sensei|bahasa|makanan|minuman|uji)\b/i.test(
        cleanText
      ));

  // Auto-detect explanation language carefully:
  // If Latin prose (Indonesian / English / Vietnamese / Filipino) quotes a few Japanese/Chinese words (e.g. 食, は, 为),
  // keep the explanation language in the learner's native language so TTS NEVER switches to Japanese/Mandarin prosody!
  const latinWordCount = (cleanText.match(/\b[a-zA-Z]{2,}\b/g) || []).length;
  const kanaCount = (cleanText.match(/[ぁ-んァ-ヶー]/g) || []).length;
  const hanziCount = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length;
  const thaiCount = (cleanText.match(/[\u0E00-\u0E7F]/g) || []).length;
  const khmerCount = (cleanText.match(/[\u1780-\u17FF]/g) || []).length;
  const hangulCount = (cleanText.match(/[\uAC00-\uD7AF]/g) || []).length;
  const arabicCount = (cleanText.match(/[\u0600-\u06FF]/g) || []).length;
  const devanagariCount = (cleanText.match(/[\u0900-\u097F]/g) || []).length;
  const burmeseCount = (cleanText.match(/[\u1000-\u109F]/g) || []).length;
  const laoCount = (cleanText.match(/[\u0E80-\u0EFF]/g) || []).length;
  const cyrillicCount = (cleanText.match(/[\u0400-\u04FF]/g) || []).length;
  const vietCount = (cleanText.match(/[\u1EA0-\u1EF9]/g) || []).length;
  const idMarkerCount = (
    cleanText.match(
      /\b(adalah|sedangkan|gunakan|perhatikan|kalimat|karena|untuk|dalam|jangan|ketika|pakai|bedanya|artinya|lihat|papan|kata|bahasa|sekarang|kalau|bukan|berarti|contohnya|coba|langkah|pertama|kedua|ketiga|bagian|goresan|baca|dengan|yang|dan|ini|itu|atau|jadi|supaya|agar|harus|boleh|bisa|tidak|belum|sudah|sangat|mudah|seperti|misalnya|bayangkan|pelan|pemahamanmu|pertanyaan)\b/gi
    ) || []
  ).length;

  if (thaiCount >= 3 && thaiCount >= latinWordCount) {
    effectiveLang = 'th';
  } else if (khmerCount >= 3 && khmerCount >= latinWordCount) {
    effectiveLang = 'km';
  } else if (hangulCount >= 3 && hangulCount >= latinWordCount) {
    effectiveLang = 'ko';
  } else if (arabicCount >= 3 && arabicCount >= latinWordCount) {
    effectiveLang = 'ar';
  } else if (devanagariCount >= 3 && devanagariCount >= latinWordCount) {
    effectiveLang = 'hi';
  } else if (burmeseCount >= 3 && burmeseCount >= latinWordCount) {
    effectiveLang = 'my';
  } else if (laoCount >= 3 && laoCount >= latinWordCount) {
    effectiveLang = 'lo';
  } else if (cyrillicCount >= 4 && cyrillicCount >= latinWordCount) {
    effectiveLang = 'ru';
  } else if (vietCount >= 2) {
    effectiveLang = 'vi';
  } else if (hasSubstantialLatinForSsw) {
    effectiveLang = 'id';
  } else if (kanaCount >= 3 && latinWordCount < 4) {
    effectiveLang = 'ja';
  } else if (hanziCount >= 3 && kanaCount === 0 && latinWordCount < 4) {
    effectiveLang = 'zh';
  } else if (idMarkerCount >= 2 || (normReqLang === 'id' && latinWordCount >= 3)) {
    effectiveLang = 'id';
  } else if (['fil', 'ms', 'es', 'fr', 'de', 'pt'].includes(normReqLang) && latinWordCount >= 3) {
    effectiveLang = normReqLang;
  } else if (normReqLang === 'en' && latinWordCount >= 3) {
    effectiveLang = 'en';
  } else if (kanaCount > 0 && kanaCount > latinWordCount) {
    effectiveLang = 'ja';
  } else if (hanziCount > 0 && hanziCount > latinWordCount) {
    effectiveLang = 'zh';
  }

  const validVoices = new Set(['Puck', 'Kore', 'Aoede', 'Charon', 'Fenrir', 'Leda', 'Orus', 'Zephyr']);
  const requestedVoice = cleanSpokenText(body.voiceName || '');
  const defaultVoice =
    personaId === 'ssw_sensei'
      ? 'Puck'
      : personaId === 'coach_sarah'
      ? 'Kore'
      : personaId === 'ssw_sensei' || personaId === 'cambridge_examiner'
      ? 'Charon'
      : personaId === 'dr_julian' || personaId === 'dr_alistair'
      ? 'Fenrir'
      : personaId === 'keita'
      ? 'Puck'
      : personaId === 'xiao_mochi'
      ? 'Leda'
      : effectiveLang === 'ja' || effectiveLang === 'zh'
      ? 'Aoede'
      : 'Puck';
  const voice = validVoices.has(requestedVoice) ? requestedVoice : defaultVoice;

  const requestedCourseLang = String(body.targetCourseLang || '').toLowerCase().split(/[-_]/)[0].trim();
  const hasEmbeddedEnglish =
    ['id', 'th', 'vi', 'ms', 'ko'].includes(effectiveLang) &&
    /\b[A-Za-z]{2,}\b/.test(cleanText) &&
    (!requestedCourseLang || requestedCourseLang === 'en');
  const hasEmbeddedJa =
    ['id', 'th', 'en', 'zh'].includes(effectiveLang) && /[\u3040-\u30ff]/.test(cleanText);
  const hasEmbeddedZh =
    ['id', 'th', 'en'].includes(effectiveLang) &&
    requestedCourseLang === 'zh' &&
    /[\u4e00-\u9fff]/.test(cleanText);
  const targetCourseName =
    hasEmbeddedJa || requestedCourseLang === 'ja'
      ? 'Tokyo Japanese'
      : hasEmbeddedZh || requestedCourseLang === 'zh'
        ? 'Beijing Mandarin Chinese'
        : 'English';
  const hasMixedBilingual = Boolean(
    hasEmbeddedEnglish ||
      hasEmbeddedJa ||
      hasEmbeddedZh ||
      (['id', 'th', 'vi', 'ms', 'ko'].includes(effectiveLang) && requestedCourseLang)
  );

  const isAcademicBritishOrPte =
    personaId === 'dr_julian' ||
    personaId === 'dr_alistair' ||
    personaId === 'cambridge_examiner';
  const defaultStyle =
    effectiveLang === 'id'
      ? personaId === 'ssw_sensei'
        ? 'Warm, engaging, genuinely human Indonesian older-brother mentor speaking lively conversational Bahasa Indonesia with natural Jakarta warmth and melodic inflection, crisp pronunciation when quoting Japanese terms, zero stiff robotic announcer tone'
        : isAcademicBritishOrPte
        ? 'Poised, warm, charismatic mentor like Dr. Julian and Dr. Alistair in a real 1-on-1 coaching session: natural human breath, lively conversational tempo, clear vocal emphasis, and authentic native English pronunciation on English examples'
        : 'Warm, expressive, genuinely human Indonesian language mentor speaking relaxed 1-on-1 Bahasa Indonesia at a brisk conversational tempo (neither rushed nor dragging), zero stiff narrator tone, and crisp native pronunciation on embedded English or foreign words'
      : effectiveLang === 'th'
      ? 'Warm, expressive human Thai mentor speaking natural conversational Thai 1-on-1 with natural breath and crisp native pronunciation on embedded foreign words'
      : effectiveLang === 'vi'
      ? 'Warm, patient human Vietnamese teacher speaking natural conversational Vietnamese with natural breath and crisp native pronunciation on embedded foreign words'
      : effectiveLang === 'ru'
      ? 'Warm, expressive human Russian language mentor speaking natural conversational Russian with natural breath and clear articulation'
      : effectiveLang === 'ja'
      ? personaId === 'keita'
        ? 'Energetic street-smart Tokyo-Kansai Japanese senpai, witty sarcastic teasing, crisp natural conversational pitch accent, human warmth'
        : 'Sharp, sassy Tokyo-Osaka tsundere Japanese sensei, lively street-real rhythm, witty sarcastic tough-love inflection, zero stiff announcer tone'
      : effectiveLang === 'zh'
      ? 'Witty, sassy Beijing Putonghua Mandarin mentor, expressive four-tone prosody, playful sarcastic tough-love warmth, crisp northern rhythm'
      : personaId === 'coach_sarah'
      ? 'Razor-sharp dryly sarcastic British-Transatlantic mentor, crisp articulation, arched-eyebrow wit, composed authority'
      : personaId === 'cambridge_examiner' || personaId === 'dr_alistair' || personaId === 'dr_julian'
      ? 'Composed, warm, charismatic academic mentor with authentic human breath and refined RP/Australian articulation'
      : 'Charismatic urban street-smart American older-brother mentor, authentic hood cadence and natural AAVE-inflected rhythm, crisp contractions, witty sarcastic swagger, warm tough-love energy';

  const isUiLanguageExplanation = ['id', 'th', 'vi', 'ru', 'ms', 'ko', 'es', 'fr', 'de'].includes(effectiveLang);
  const incomingStyle = cleanSpokenText(body.stylePrompt || '').slice(0, 220);
  const style = isUiLanguageExplanation
    ? cleanSpokenText(incomingStyle ? `${defaultStyle}. ${incomingStyle}` : defaultStyle).slice(0, 320)
    : incomingStyle || defaultStyle;

  const bypassTtsCache = Boolean(body.force || body.skipCache || body.noCache);
  const ttsCacheKey = await sha256Hex(
    JSON.stringify({
      v: 'tts-v2',
      cleanText,
      voice,
      effectiveLang,
      hasMixedBilingual,
      targetCourseName,
      style,
    })
  );
  if (!bypassTtsCache) {
    const cachedTts = await readWorkerCache('tts', ttsCacheKey, _ttsMemoryCache, 24);
    if (cachedTts && cachedTts.payload && typeof cachedTts.payload.audioBase64 === 'string' && cachedTts.payload.audioBase64.length > 100) {
      return jsonResponse(
        {
          ...cachedTts.payload,
          cached: true,
          cacheLayer: cachedTts.cacheLayer,
        },
        {
          headers: {
            'cache-control': 'no-store',
            'x-fiezel-cache': 'HIT',
          },
        }
      );
    }
  }

  const now = Date.now();
  const ttsStride = keys.length % 5 !== 0 ? 5 : keys.length % 3 !== 0 ? 3 : 1;
  const startTtsIdx = _copilotPoolIndex % keys.length;
  _copilotPoolIndex = (_copilotPoolIndex + 1) % keys.length;

  // Empirically verified fast TTS endpoints (~3.3-3.6s) without dead 0/18 flash-lite-tts
  const ttsEndpoints = [
    { kind: 'interactions', model: 'gemini-3.8-flash-tts' },
    { kind: 'interactions', model: 'gemini-3.1-flash-tts-preview' },
    { kind: 'generateContent', model: 'gemini-3.1-flash-tts-preview' },
  ];

  const ttsQueue = [];
  for (let round = 0; round < keys.length; round++) {
    const key = keys[(startTtsIdx + round * ttsStride) % keys.length];
    for (let eIdx = 0; eIdx < ttsEndpoints.length; eIdx++) {
      const ep = ttsEndpoints[eIdx];
      const cooldownKey = `${key}::${ep.kind}:${ep.model}`;
      const modelCooldownKey = `${key}::${ep.model}`;
      if (
        now >= (_ttsCooldownMap.get(cooldownKey) || 0) &&
        now >= (_ttsCooldownMap.get(modelCooldownKey) || 0)
      ) {
        ttsQueue.push({
          key,
          kind: ep.kind,
          model: ep.model,
          cooldownKey,
          modelCooldownKey,
          round,
          eIdx,
          isQuotaDead: _quotaDeadKeys.has(key),
          isVerified: _verifiedHealthyKeys.has(key),
        });
      }
    }
  }
  ttsQueue.sort((a, b) => {
    if (a.isQuotaDead !== b.isQuotaDead) return Number(a.isQuotaDead) - Number(b.isQuotaDead);
    if (a.round !== b.round) return a.round - b.round;
    if (a.isVerified !== b.isVerified) return Number(b.isVerified) - Number(a.isVerified);
    return a.eIdx - b.eIdx;
  });

  let lastReason = 'tts_failed';
  const invokeTtsCandidate = async (cand, parentSignal) => {
    const { key, kind, model, cooldownKey, modelCooldownKey } = cand;
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort();
      } else {
        parentSignal.addEventListener('abort', onParentAbort, { once: true });
      }
    }
    const perAttemptTimeoutMs = Math.max(4500, Math.min(7000, 3800 + cleanText.length * 6));
    const timer = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      const isGc = kind === 'generateContent';
      const url = isGc
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
        : GOOGLE_INTERACTIONS_API;
      const res = await fetch(url, {
        method: 'POST',
        headers: isGc
          ? { 'content-type': 'application/json', 'x-goog-api-key': key }
          : {
              'content-type': 'application/json',
              'x-goog-api-key': key,
              'Api-Revision': '2026-05-20',
            },
        body: JSON.stringify(
          isGc
            ? {
                contents: [{ role: 'user', parts: [{ text: cleanText }] }],
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Puck' } } },
                },
              }
            : {
                model,
                store: false,
                input: [
                  {
                    type: 'user_input',
                    content: [
                      {
                        type: 'text',
                        text: cleanText,
                        annotations: [{ type: 'speech_metadata', style }],
                      },
                    ],
                  },
                ],
                response_format: { type: 'audio' },
                generation_config: {
                  speech_config: [{ voice }],
                },
              }
        ),
        signal: controller.signal,
      });
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);

      if (res.status === 429) {
        const errBody = await res.text().catch(() => '');
        const isHardDailyQuota = /per\s*day|PerDay|requests\s*per\s*day|GenerateRequestsPerDay|check your plan|billing|limit:\s*0\b/i.test(
          errBody
        );
        const cdUntil = Date.now() + (isHardDailyQuota ? 600000 : 18000);
        _ttsCooldownMap.set(cooldownKey, cdUntil);
        _ttsCooldownMap.set(modelCooldownKey, cdUntil);
        if (isHardDailyQuota) {
          _quotaDeadKeys.add(key, 600000);
          _verifiedHealthyKeys.delete(key);
        }
        return { ok: false, reason: 'tts_rate_limited' };
      }
      if (!res.ok) {
        if (res.status !== 404 && res.status !== 503) {
          _ttsCooldownMap.set(cooldownKey, Date.now() + 15000);
        }
        return { ok: false, reason: `HTTP ${res.status} (${model})` };
      }

      const data = await res.json().catch(() => null);
      let audioBase64 = '';
      let audioMimeType = 'audio/wav';
      if (isGc) {
        const inlinePart = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        audioBase64 = typeof inlinePart?.data === 'string' ? inlinePart.data : '';
        audioMimeType = inlinePart?.mimeType || 'audio/pcm';
      } else {
        audioBase64 = typeof data?.output_audio?.data === 'string' ? data.output_audio.data : '';
        audioMimeType = data?.output_audio?.mime_type || 'audio/wav';
        if (!audioBase64 && Array.isArray(data?.steps)) {
          const audioPart = data.steps
            .filter((s) => s && s.type === 'model_output' && Array.isArray(s.content))
            .flatMap((s) => s.content)
            .find((c) => c && c.type === 'audio' && typeof c.data === 'string' && c.data.length > 100);
          if (audioPart) {
            audioBase64 = audioPart.data;
            audioMimeType = audioPart.mime_type || 'audio/wav';
          }
        }
      }

      if (audioBase64 && audioBase64.length > 100) {
        if (isGc || /audio\/(?:l16|pcm)/i.test(audioMimeType)) {
          const bin = atob(audioBase64);
          const bytes = new Uint8Array(bin.length);
          for (let b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
          const wav = encodePcm16ToWavBase64([bytes], 24000);
          if (wav) {
            audioBase64 = wav;
            audioMimeType = 'audio/wav';
          }
        }
        _ttsCooldownMap.delete(cooldownKey);
        _ttsCooldownMap.delete(modelCooldownKey);
        _verifiedHealthyKeys.add(key);
        _quotaDeadKeys.delete(key);
        return { ok: true, audioBase64, audioMimeType, model };
      }
      return { ok: false, reason: 'empty_audio' };
    } catch (err) {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);
      return { ok: false, reason: err?.message || 'tts_fetch_error' };
    }
  };

  // Prioritized healthy keys for fast hedged Gemini 3.8 Live 24kHz WAV synthesis
  const liveNowMs = Date.now();
  const prioritizedLiveKeys = keys
    .map((_, idx) => keys[(startTtsIdx + idx * ttsStride) % keys.length])
    .sort((a, b) => {
      const aCool = liveNowMs < (_ttsCooldownMap.get(`${a}::gemini-3.8-live-tts`) || 0) ? 1 : 0;
      const bCool = liveNowMs < (_ttsCooldownMap.get(`${b}::gemini-3.8-live-tts`) || 0) ? 1 : 0;
      if (aCool !== bCool) return aCool - bCool;
      const deadDiff = Number(_quotaDeadKeys.has(a)) - Number(_quotaDeadKeys.has(b));
      if (deadDiff !== 0) return deadDiff;
      return Number(_verifiedHealthyKeys.has(b)) - Number(_verifiedHealthyKeys.has(a));
    });

  const runLiveWavRace = async () => {
    // Allow sweeping the entire rotated pool (up to 18 keys) so a contiguous dead-quota block never causes 503
    const candidates = prioritizedLiveKeys.slice(0, Math.min(18, prioritizedLiveKeys.length));
    if (!candidates.length) return { ok: false, reason: 'no_live_keys' };
    return new Promise((resolve) => {
      let settled = false;
      let launched = 0;
      let pending = 0;
      let hedgeTimer1 = null;
      let hedgeTimer2 = null;
      let failReason = lastReason;
      const raceGuardTimer = setTimeout(() => finish({ ok: false, reason: failReason || 'live_race_timeout' }), 9500);

      const finish = (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(raceGuardTimer);
        if (hedgeTimer1) clearTimeout(hedgeTimer1);
        if (hedgeTimer2) clearTimeout(hedgeTimer2);
        resolve(res);
      };

      const launchNext = () => {
        if (settled || launched >= candidates.length) return;
        const liveKey = candidates[launched++];
        pending++;
        invokeGeminiLiveWavTts({
          key: liveKey,
          text: cleanText,
          voice,
          style,
          effectiveLang,
          hasMixedBilingual,
          targetCourseName,
        })
          .then((liveWav) => {
            pending--;
            if (liveWav && liveWav.ok && liveWav.audioBase64) {
              _verifiedHealthyKeys.add(liveKey);
              _quotaDeadKeys.delete(liveKey);
              finish({
                ok: true,
                audioBase64: liveWav.audioBase64,
                audioMimeType: 'audio/wav',
                model: 'gemini-3.8-live-tts',
                transcript: liveWav.transcript || '',
                fidelity: liveWav.fidelity,
              });
              return;
            }
            failReason = liveWav?.reason || failReason;
            if (!settled) {
              if (launched < candidates.length) {
                launchNext();
              } else if (pending === 0) {
                finish({ ok: false, reason: failReason });
              }
            }
          })
          .catch((err) => {
            pending--;
            failReason = err?.message || failReason;
            if (!settled) {
              if (launched < candidates.length) {
                launchNext();
              } else if (pending === 0) {
                finish({ ok: false, reason: failReason });
              }
            }
          });
      };

      launchNext();
      if (candidates.length > 1) {
        hedgeTimer1 = setTimeout(launchNext, 140);
      }
      if (candidates.length > 2) {
        hedgeTimer2 = setTimeout(launchNext, 340);
      }
    });
  };

  // Race REST TTS + Gemini 3.8 Live WS (hedged immediately at 50ms)
  // so exhausted 10/day Free-Tier REST models NEVER delay Chunk 0!
  if (ttsQueue.length > 0) {
    const ttsOverallController = new AbortController();
    const overallTtsTimeoutMs = Math.max(3800, Math.min(5400, 2900 + cleanText.length * 5));
    const ttsOverallTimer = setTimeout(() => ttsOverallController.abort(), overallTtsTimeoutMs);
    const maxTtsAttempts = Math.min(keys.length === 1 ? 2 : 3, ttsQueue.length);

    try {
      const raceWinner = await new Promise((resolve) => {
        let done = false;
        let restSettled = false;
        let liveSettled = false;
        let liveStarted = false;
        let liveHedgeTimer = null;

        const finish = (winner) => {
          if (done) return;
          done = true;
          if (liveHedgeTimer) clearTimeout(liveHedgeTimer);
          ttsOverallController.abort();
          resolve(winner);
        };

        const startLive = () => {
          if (done || liveStarted) return;
          liveStarted = true;
          runLiveWavRace()
            .then((res) => {
              liveSettled = true;
              if (res && res.ok && res.audioBase64) {
                finish(res);
              } else if (restSettled) {
                finish({ ok: false, reason: res?.reason || lastReason });
              }
            })
            .catch(() => {
              liveSettled = true;
              if (restSettled) finish({ ok: false, reason: lastReason });
            });
        };

        liveHedgeTimer = setTimeout(startLive, 50);

        new Promise((resolveRest) => {
          let settled = false;
          let pending = 0;
          let launched = 0;
          let hedgeTimer = null;

          const finishRest = (val) => {
            if (settled) return;
            settled = true;
            if (hedgeTimer) clearTimeout(hedgeTimer);
            resolveRest(val);
          };

          const launch = () => {
            if (settled || done || launched >= maxTtsAttempts) return;
            const cand = ttsQueue[launched++];
            pending++;
            invokeTtsCandidate(cand, ttsOverallController.signal)
              .then((res) => {
                pending--;
                if (res && res.ok) {
                  finishRest(res);
                  return;
                }
                lastReason = res?.reason || lastReason;
                if (!settled && !done) {
                  startLive();
                  if (launched < maxTtsAttempts) {
                    if (hedgeTimer) clearTimeout(hedgeTimer);
                    launch();
                    hedgeTimer = setTimeout(launch, 420);
                  } else if (pending === 0) {
                    finishRest({ ok: false, reason: lastReason });
                  }
                }
              })
              .catch((err) => {
                pending--;
                lastReason = err?.message || lastReason;
                startLive();
                if (!settled && pending === 0 && launched >= maxTtsAttempts) {
                  finishRest({ ok: false, reason: lastReason });
                }
              });
          };

          ttsOverallController.signal.addEventListener('abort', () => {
            if (!settled) finishRest({ ok: false, reason: lastReason });
          });

          launch();
          hedgeTimer = setTimeout(launch, 420);
        }).then((restRes) => {
          restSettled = true;
          if (restRes && restRes.ok && restRes.audioBase64) {
            finish(restRes);
          } else {
            startLive();
            if (liveSettled) {
              finish({ ok: false, reason: restRes?.reason || lastReason });
            }
          }
        });
      });

      if (raceWinner && raceWinner.ok && raceWinner.audioBase64) {
        const ttsPayload = {
          ok: true,
          audioBase64: raceWinner.audioBase64,
          audioMimeType: raceWinner.audioMimeType || 'audio/wav',
          voice,
          voiceUsed: voice,
          model: raceWinner.model,
          spokenLang: effectiveLang,
          transcript: raceWinner.transcript || '',
          fidelity: raceWinner.fidelity || null,
        };
        if (ttsPayload.audioBase64.length > 100 && ttsPayload.fidelity?.ok !== false && !body.noCache) {
          await writeWorkerCache(ctx, 'tts', ttsCacheKey, ttsPayload, _ttsMemoryCache, 24, 21600);
        }
        return jsonResponse(ttsPayload, {
          headers: { 'cache-control': 'no-store', 'x-fiezel-cache': 'MISS' },
        });
      }
      return jsonResponse(
        { ok: false, fallback: true, reason: raceWinner?.reason || lastReason },
        { status: 503 }
      );
    } finally {
      clearTimeout(ttsOverallTimer);
    }
  }

  const directLiveResult = await runLiveWavRace();
  if (directLiveResult && directLiveResult.ok && directLiveResult.audioBase64) {
    const directPayload = {
      ok: true,
      audioBase64: directLiveResult.audioBase64,
      audioMimeType: 'audio/wav',
      voice,
      voiceUsed: voice,
      model: directLiveResult.model,
      spokenLang: effectiveLang,
      transcript: directLiveResult.transcript || '',
      fidelity: directLiveResult.fidelity || null,
    };
    if (directPayload.audioBase64.length > 100 && directPayload.fidelity?.ok !== false && !body.noCache) {
      await writeWorkerCache(ctx, 'tts', ttsCacheKey, directPayload, _ttsMemoryCache, 24, 21600);
    }
    return jsonResponse(directPayload, {
      headers: { 'cache-control': 'no-store', 'x-fiezel-cache': 'MISS' },
    });
  }

  return jsonResponse({ ok: false, fallback: true, reason: directLiveResult?.reason || lastReason }, { status: 503 });
}

function encodePcm16ToWavBase64(pcmChunks, sampleRate = 24000) {
  let rawBytes = 0;
  for (let i = 0; i < pcmChunks.length; i++) rawBytes += pcmChunks[i].byteLength;
  const rawEvenLen = rawBytes & ~1;
  if (rawEvenLen < 200) return '';

  const merged = new Uint8Array(rawEvenLen);
  let mergeOff = 0;
  for (let i = 0; i < pcmChunks.length && mergeOff < rawEvenLen; i++) {
    const chunk = pcmChunks[i];
    const copyLen = Math.min(chunk.byteLength, rawEvenLen - mergeOff);
    merged.set(chunk.subarray(0, copyLen), mergeOff);
    mergeOff += copyLen;
  }

  // Potong hening panjang berlebih di awal/akhir (>150ms sunyi) agar audio antar potongan terasa rapat dan natural
  const mergedView = new DataView(merged.buffer);
  const totalSamples = rawEvenLen >> 1;
  let firstActive = -1;
  let lastActive = -1;
  for (let s = 0; s < totalSamples; s++) {
    const v = mergedView.getInt16(s * 2, true);
    if (v > 75 || v < -75) {
      if (firstActive === -1) firstActive = s;
      lastActive = s;
    }
  }
  const padSamples = Math.floor(sampleRate * 0.09);
  const startSample = firstActive >= 0 ? Math.max(0, firstActive - padSamples) : 0;
  const endSample = lastActive >= 0 ? Math.min(totalSamples, lastActive + padSamples) : totalSamples;
  const pcmSlice = merged.subarray(startSample * 2, Math.max(startSample * 2 + 200, endSample * 2));
  const pcmLen = pcmSlice.byteLength & ~1;
  if (pcmLen < 200) return '';

  const wav = new Uint8Array(44 + pcmLen);
  const view = new DataView(wav.buffer);
  // "RIFF"
  wav[0] = 0x52; wav[1] = 0x49; wav[2] = 0x46; wav[3] = 0x46;
  view.setUint32(4, 36 + pcmLen, true);
  // "WAVE"
  wav[8] = 0x57; wav[9] = 0x41; wav[10] = 0x56; wav[11] = 0x45;
  // "fmt "
  wav[12] = 0x66; wav[13] = 0x6d; wav[14] = 0x74; wav[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // "data"
  wav[36] = 0x64; wav[37] = 0x61; wav[38] = 0x74; wav[39] = 0x61;
  view.setUint32(40, pcmLen, true);
  wav.set(pcmSlice.subarray(0, pcmLen), 44);

  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < wav.length; i += step) {
    binary += String.fromCharCode.apply(null, wav.subarray(i, i + step));
  }
  return btoa(binary);
}

async function invokeGeminiLiveWavTts({
  key,
  text,
  voice,
  style,
  effectiveLang,
  hasMixedBilingual = false,
  targetCourseName = 'English',
}) {
  if (typeof WebSocket === 'undefined' || !key || !text) {
    return { ok: false, reason: 'ws_tts_unavailable' };
  }
  const cooldownKey = `${key}::gemini-3.8-live-tts`;
  if (Date.now() < (_ttsCooldownMap.get(cooldownKey) || 0)) {
    return { ok: false, reason: 'live_tts_cooldown' };
  }
  const LIVE_TTS_LANG_LABELS = {
    id: 'natural conversational Bahasa Indonesia',
    en: 'natural English',
    th: 'natural conversational Thai',
    ja: 'natural Japanese',
    zh: 'natural Beijing Mandarin Chinese',
    ru: 'natural Russian',
    km: 'natural Khmer (Cambodian)',
    fil: 'natural Filipino / Tagalog',
    tl: 'natural Filipino / Tagalog',
    vi: 'natural Vietnamese',
    ko: 'natural Korean',
    ms: 'natural Bahasa Melayu',
    ar: 'natural Modern Standard Arabic',
    es: 'natural Spanish',
    fr: 'natural French',
    de: 'natural German',
    pt: 'natural Portuguese',
    hi: 'natural Hindi',
    my: 'natural Burmese (Myanmar)',
    lo: 'natural Lao',
    it: 'natural Italian',
  };
  const langLabel = LIVE_TTS_LANG_LABELS[effectiveLang] || 'natural English';
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`;

  return new Promise((resolve) => {
    let settled = false;
    let ws = null;
    let idleTimer = null;
    let sawTurnComplete = false;
    const pcmChunks = [];
    const transcriptParts = [];

    const finalize = (reasonIfEmpty = 'live_tts_empty') => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimer);
      clearTimeout(firstAudioTimer);
      if (idleTimer) clearTimeout(idleTimer);
      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000, 'done');
          }
        } catch {}
      }
      const rawPcmBytes = pcmChunks.reduce((sum, c) => sum + (c?.byteLength || c?.length || 0), 0);
      const trimmedLen = text.trim().length;
      const minExpectedPcmBytes =
        trimmedLen > 120
          ? Math.min(180000, trimmedLen * 620)
          : trimmedLen > 45
            ? Math.max(42000, trimmedLen * 560)
            : trimmedLen > 20
              ? 16000
              : 0;
      if (rawPcmBytes > 0 && rawPcmBytes < minExpectedPcmBytes) {
        resolve({ ok: false, reason: 'live_tts_truncated' });
        return;
      }
      const audioBase64 = pcmChunks.length > 0 ? encodePcm16ToWavBase64(pcmChunks, 24000) : '';
      const minExpectedB64 = trimmedLen > 45 ? 56000 : trimmedLen > 20 ? 22000 : 0;
      // Script-fidelity guard: Live voice must say the board script word-for-word, otherwise
      // captions/board writing can never line up with the voice (ad-libs, extra greetings).
      const spokenTranscript = transcriptParts.join('').replace(/\s+/g, ' ').trim();
      const fidelity = measureScriptFidelity(text, spokenTranscript);
      if (audioBase64 && spokenTranscript && fidelity.checked && !fidelity.ok) {
        resolve({ ok: false, reason: 'live_tts_adlib', transcript: spokenTranscript, fidelity });
        return;
      }
      if (audioBase64 && audioBase64.length >= minExpectedB64) {
        _ttsCooldownMap.delete(cooldownKey);
        resolve({ ok: true, audioBase64, transcript: spokenTranscript, fidelity });
      } else {
        resolve({ ok: false, reason: audioBase64 ? 'live_tts_trimmed_too_short' : reasonIfEmpty });
      }
    };

    const liveTimeoutMs = Math.max(5200, Math.min(13000, 4200 + String(text || '').length * 22));
    const overallTimer = setTimeout(() => finalize('live_tts_timeout'), liveTimeoutMs);
    const firstAudioTimer = setTimeout(() => {
      if (pcmChunks.length === 0) finalize('live_tts_no_first_audio');
    }, 2600);

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finalize(err?.message || 'ws_tts_init_failed');
      return;
    }

    ws.onopen = () => {
      try {
        const shouldUseLangCodeLock = !hasMixedBilingual && effectiveLang !== 'id';
        const LIVE_BCP47_MAP = {
          ja: 'ja-JP',
          zh: 'cmn-CN',
          th: 'th-TH',
          vi: 'vi-VN',
          ru: 'ru-RU',
          id: 'id-ID',
          km: 'km-KH',
          fil: 'fil-PH',
          tl: 'fil-PH',
          ko: 'ko-KR',
          ms: 'ms-MY',
          ar: 'ar-XA',
          es: 'es-ES',
          fr: 'fr-FR',
          de: 'de-DE',
          pt: 'pt-BR',
          hi: 'hi-IN',
          my: 'my-MM',
          lo: 'lo-LA',
          it: 'it-IT',
          en: 'en-US',
        };
        const speechLangCode = LIVE_BCP47_MAP[effectiveLang] || 'en-US';
        const speechConfigPayload = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Puck' } },
        };
        if (shouldUseLangCodeLock) {
          speechConfigPayload.languageCode = speechLangCode;
        }
        const bilingualPrompt = hasMixedBilingual
          ? ` BILINGUAL MENTOR PRONUNCIATION RULE: Explain smoothly in relaxed, natural ${langLabel}, and whenever any embedded ${targetCourseName} word, phrase, or quoted example appears (such as English phrases inside Indonesian), switch seamlessly to 100% authentic native ${targetCourseName} pronunciation for that word/phrase before flowing right back into natural ${langLabel}. NEVER distort English words with Indonesian phonetics.`
          : ` Speak strictly in ${langLabel} with 100% authentic native phonology and natural human warmth.`;
        ws.send(
          JSON.stringify({
            setup: {
              model: 'models/gemini-3.8-live',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: speechConfigPayload,
              },
              outputAudioTranscription: {},
              systemInstruction: {
                parts: [
                  {
                    text: `You are a genuinely human, warm, charismatic mentor talking 1-on-1 with a student (like Dr. Julian / Dr. Alistair). Vocal style: ${style}.${bilingualPrompt} Deliver ONLY the exact line provided word-for-word at a brisk, lively conversational pace of roughly 165 to 180 words per minute (like an energetic tutor, never slow, never dragging vowels, only short natural breaths at commas and full stops), and add zero extra words before or after.`,
                  },
                ],
              },
            },
          })
        );
      } catch (err) {
        finalize(err?.message || 'ws_tts_setup_failed');
      }
    };

    const handleRaw = (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg?.setupComplete) {
        try {
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `Say only this exact line with warm, natural human mentor delivery (add no extra words): "${text}"`,
                      },
                    ],
                  },
                ],
                turnComplete: true,
              },
            })
          );
        } catch (err) {
          finalize(err?.message || 'ws_tts_send_failed');
        }
        return;
      }

      const parts = msg?.serverContent?.modelTurn?.parts;
      const outTx = msg?.serverContent?.outputTranscription?.text;
      if (typeof outTx === 'string' && outTx) transcriptParts.push(outTx);
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const b64 = p?.inlineData?.data;
          if (typeof b64 === 'string' && b64.length > 0) {
            try {
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              pcmChunks.push(bytes);
              clearTimeout(firstAudioTimer);
              if (idleTimer) clearTimeout(idleTimer);
              // Jeda 1400ms (bukan 240ms) agar jeda nafas alami antar kalimat penjelasan tidak terpotong di tengah trek
              idleTimer = setTimeout(() => finalize('live_tts_idle_complete'), 1400);
            } catch {}
          }
        }
      }

      if (msg?.serverContent?.turnComplete) {
        sawTurnComplete = true;
        finalize('live_tts_turn_complete');
      } else if (msg?.serverContent?.generationComplete && pcmChunks.length > 0) {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => finalize('live_tts_generation_tail_complete'), 800);
      }
    };

    ws.onmessage = async (ev) => {
      if (typeof ev.data === 'string') {
        handleRaw(ev.data);
      } else if (ev.data && typeof ev.data.text === 'function') {
        handleRaw(await ev.data.text().catch(() => ''));
      } else if (ev.data instanceof ArrayBuffer) {
        handleRaw(new TextDecoder().decode(ev.data));
      }
    };
    ws.onerror = () => finalize('live_tts_ws_error');
    ws.onclose = (ev) => {
      const closeReason = String(ev?.reason || '');
      const isDailyQuotaClose = /per\s*day|PerDay|billing|limit:\s*0\b/i.test(closeReason);
      const isQuotaClose =
        ev.code === 1011 ||
        /quota|exhausted|limit|billing|resource_exhausted/i.test(closeReason);
      if (isDailyQuotaClose) {
        _ttsCooldownMap.set(cooldownKey, Date.now() + 300000);
        _quotaDeadKeys.add(key, 300000);
        _verifiedHealthyKeys.delete(key);
      } else if (isQuotaClose) {
        _ttsCooldownMap.set(cooldownKey, Date.now() + 45000);
      } else if (ev.code !== 1000 && pcmChunks.length === 0) {
        _ttsCooldownMap.set(cooldownKey, Date.now() + 30000);
      }
      finalize(`live_tts_closed_${ev.code}`);
    };
  });
}

/**
 * Handler POST /api/voice/verify-speech
 * Fast multimodal speech-language authenticator for noise-immune Barge-In.
 * Distinguishes real spoken human words (any human language) from vehicle noise,
 * horns, fans, wind, table knocks, unintelligible background chatter, or AI speaker echo.
 */
export async function routeVoiceVerifySpeech(ctx) {
  const clientIp =
    (ctx.request &&
      (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) ||
    '';
  if (!checkLiveRateLimit(clientIp, 50, 60000)) {
    return jsonResponse(
      { ok: false, hasLanguage: false, isEchoOnly: false, transcript: '', reason: 'rate_limited' },
      { status: 429 }
    );
  }

  const keys = await resolvePoolKeys(ctx);
  if (!keys.length) {
    return jsonResponse({ ok: false, hasLanguage: false, isEchoOnly: false, transcript: '', reason: 'no_keys' }, { status: 503 });
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const audioBase64 = String(body.audioBase64 || '').replace(/^data:audio\/[^;]+;base64,/, '').trim();
  const mimeType = String(body.mimeType || 'audio/wav').trim();
  const aiCurrentText = cleanSpokenText(body.aiCurrentText || '').slice(0, 220);
  const targetSentence = cleanSpokenText(body.targetSentence || '').slice(0, 220);
  const targetLang = ['en', 'ja', 'zh'].includes(String(body.targetLang || '').toLowerCase())
    ? String(body.targetLang).toLowerCase()
    : '';

  if (!audioBase64 || audioBase64.length < 120) {
    return badRequest('empty_audio');
  }

  const langRubric =
    targetLang === 'zh'
      ? 'Mandarin Chinese (zh-CN): strictly evaluate 4-tone contour accuracy, initials/finals clarity, and syllable completeness.'
      : targetLang === 'ja'
        ? 'Japanese (ja-JP): strictly evaluate mora rhythm, long vowels/geminates (っ/ー), particle clarity, and natural pitch contour.'
        : 'English (en-US): strictly evaluate consonant/vowel articulation, word stress, linking, and ending sounds.';

  const prompt = targetSentence
    ? [
        `Assess this learner's spoken pronunciation clip against the target sentence.`,
        `Target language: ${langRubric}`,
        `Target sentence: "${targetSentence}"`,
        `Rules:`,
        `1. Set "hasLanguage": true ONLY if intelligible human speech is present; false for silence or pure noise.`,
        `2. Transcribe what the learner actually spoke in "transcript" (use native script for ja/zh, English words for en).`,
        `3. Score "pronunciationScore" (0-100) for phonetic/tone/rhythm accuracy, "accuracyScore" (0-100) for word/character fidelity to the target sentence, and "fluencyScore" (0-100) for smooth pacing.`,
        `4. Set "passed": true ONLY if hasLanguage is true AND pronunciationScore >= 65 AND accuracyScore >= 70.`,
        `5. Provide a concise 1-sentence Indonesian tip in "feedback".`,
        `JSON only: {"hasLanguage":boolean,"isEchoOnly":false,"transcript":"...","detectedLang":"id|en|ja|zh|th|other|none","pronunciationScore":number,"accuracyScore":number,"fluencyScore":number,"passed":boolean,"feedback":"..."}`,
      ].join('\n')
    : [
        `Inspect this short microphone clip strictly for real spoken human language.`,
        aiCurrentText ? `Coach AI was currently playing aloud: "${aiCurrentText}"` : '',
        `Rules:`,
        `1. Set "hasLanguage": true ONLY if you clearly hear intelligible spoken human words/phrases in any natural language (Indonesian, English, Japanese, Mandarin, Thai, etc., including bilingual mixed Indonesian-Japanese speech and SSW exam terms like klorin, yukkuri, kurumi, pistachio).`,
        `2. Set "hasLanguage": false for motorcycle/car/truck engines, traffic rumble, car horns, sirens, wind, fans, knocks, coughing, music, non-speech noise, unintelligible mumbling, or silence.`,
        `3. Set "isEchoOnly": true if the heard words are only speaker bleed/echo of Coach AI's sentence above.`,
        `JSON only: {"hasLanguage":boolean,"isEchoOnly":boolean,"transcript":"...","detectedLang":"id|en|ja|zh|th|other|none"}`,
      ]
        .filter(Boolean)
        .join('\n');

  const verifyModels = ['gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite'];
  const total = keys.length;
  const startIdx = _copilotPoolIndex % total;

  for (let attempt = 0; attempt < Math.min(total, 4); attempt++) {
    const idx = (startIdx + attempt) % total;
    const key = keys[idx];
    for (const model of verifyModels) {
      const ck = `${key}::${model}`;
      if (Date.now() < (_copilotCooldownMap.get(ck) || 0)) continue;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), targetSentence ? 6500 : 3200);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { inlineData: { mimeType, data: audioBase64 } },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.0,
                max_output_tokens: targetSentence ? 260 : 160,
              },
            }),
            signal: controller.signal,
          }
        ).catch(() => null);
        clearTimeout(timer);

        if (!res) continue;
        if (res.status === 429) {
          _copilotCooldownMap.set(ck, Date.now() + 45000);
          continue;
        }
        if (!res.ok) continue;

        const data = await res.json().catch(() => null);
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        let parsed = null;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const fb = cleaned.indexOf('{');
          const lb = cleaned.lastIndexOf('}');
          if (fb !== -1 && lb > fb) parsed = JSON.parse(cleaned.slice(fb, lb + 1));
        }
        if (parsed && typeof parsed === 'object') {
          _copilotPoolIndex = (idx + 1) % total;
          const clampScore = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
          const pron = clampScore(parsed.pronunciationScore);
          const acc = clampScore(parsed.accuracyScore);
          const flu = clampScore(parsed.fluencyScore);
          const hasLang = Boolean(parsed.hasLanguage);
          return jsonResponse({
            ok: true,
            hasLanguage: hasLang,
            isEchoOnly: Boolean(parsed.isEchoOnly),
            transcript: cleanSpokenText(String(parsed.transcript || '')).slice(0, 180),
            detectedLang: cleanSpokenText(String(parsed.detectedLang || 'none')).slice(0, 20),
            ...(targetSentence
              ? {
                  pronunciationScore: pron,
                  accuracyScore: acc,
                  fluencyScore: flu,
                  passed: hasLang && (parsed.passed === true || (pron >= 65 && acc >= 70)),
                  feedback: cleanSpokenText(String(parsed.feedback || '')).slice(0, 220),
                }
              : {}),
          });
        }
      } catch {
        clearTimeout(timer);
      }
    }
  }

  return jsonResponse({ ok: false, hasLanguage: false, isEchoOnly: false, transcript: '', reason: 'verify_unavailable' }, { status: 503 });
}

function withVoiceIdentity(handler, { requireAiFlag = false } = {}) {
  return async (ctx) => {
    if (!ctx || !ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
      return unauthenticated({ headers: ctx?.corsHeaders || {} });
    }
    if (requireAiFlag) {
      const flag = await checkAiEnabled(ctx.env);
      if (!flag.allowed) {
        return jsonResponse(
          { ok: false, error: 'ai_disabled', reason: flag.reason },
          { status: 403, headers: ctx?.corsHeaders || {} }
        );
      }
    }
    return handler(ctx);
  };
}

export const ROUTES = [
  ['POST', '/api/voice/live-session', aiSpendGate('aiChat', routeVoiceLiveSession)],
  ['POST', '/api/voice/report-drop', withVoiceIdentity(routeVoiceReportDrop)],
  ['POST', '/api/voice/copilot-assist', aiSpendGate('aiChat', routeVoiceCopilotAssist)],
  ['POST', '/api/voice/partner-turn', aiSpendGate('aiChat', routeVoicePartnerTurn)],
  ['POST', '/api/voice/whiteboard-stream', aiSpendGate('aiChat', routeVoiceWhiteboardStream)],
  ['POST', '/api/voice/translate', withVoiceIdentity(routeVoiceTranslate, { requireAiFlag: true })],
  ['POST', '/api/voice/gemini-tts', aiSpendGate('aiChat', routeVoiceGeminiTts)],
  ['POST', '/api/voice/verify-speech', withVoiceIdentity(routeVoiceVerifySpeech, { requireAiFlag: true })],
  ['POST', '/api/voice/sync-keys', routeVoiceSyncKeys],
  ['POST', '/api/braincore/sync', withVoiceIdentity(routeVoiceBraincoreSync)],
];
