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

import { jsonResponse as rawJsonResponse, badRequest } from '../errors.js';
import { readJsonFromCtx } from '../mw-guard.js';

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
function stripDashesDeep(value, depth = 0) {
  if (depth > 8) return value;
  if (typeof value === 'string') return stripFiezelDashes(value);
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
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];
const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
];
const DEFAULT_CONSTRAINED_ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

// Map in-memory untuk status cooldown kunci per worker instance (Live Session)
const _cooldownMap = new Map(); // key -> timestamp ms
let _poolIndex = Math.floor(Math.random() * 16);

// Terisolasi: status cooldown per (key::model) dan rotasi pool khusus Copilot
const _copilotCooldownMap = new Map(); // `${key}::${model}` -> timestamp ms
let _copilotPoolIndex = Math.floor(Math.random() * 16);

// Rate limit in-memory per IP untuk mencegah pengurasan kuota Gemini Live & Copilot
const _ipLiveCallMap = new Map();
function checkLiveRateLimit(ip, limit = 30, windowMs = 60000) {
  if (!ip) return true;
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
  return entry.count <= limit;
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
        error: 'no_keys_configured',
        fallback: true,
        message: 'Kunci Gemini Live belum terkonfigurasi di server.',
      },
      { status: 503 }
    );
  }

  const now = Date.now();
  const totalKeys = keys.length;
  let attempts = 0;
  let lastFailReason = '';

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

    lastFailReason = result.reason;
    if (result.isQuota) {
      // Cooldown 65 detik jika menyentuh limit kuota/rate-limit
      _cooldownMap.set(key, now + 65000);
    } else {
      // Error sementara lainnya, cooldown 15 detik
      _cooldownMap.set(key, now + 15000);
    }

    attempts++;
  }

  // Jika seluruh kunci dalam cooldown
  return jsonResponse(
    {
      ok: false,
      error: 'all_keys_busy',
      fallback: true,
      lastError: lastFailReason,
      message: 'Seluruh kapasitas jalur suara Gemini Live sedang penuh. Mengalihkan ke jalur cadangan.',
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
    .replace(/\*[^*]{1,30}\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeTargetLang(text, targetLang) {
  const tx = cleanSpokenText(text);
  if (!tx || /[\u0E00-\u0E7F]/.test(tx)) return false;
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
  for (let i = 0; i < rawParts.length; i += 2) {
    const s = rawParts[i] + (rawParts[i + 1] || '');
    if (s.trim()) sentences.push(s.trim());
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

function normalizeCopilotReplies(rawReplies, targetLang, locale = 'id', fallbackTarget = '') {
  const list = Array.isArray(rawReplies) ? rawReplies : [];
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
    if (!looksLikeTargetLang(text, targetLang)) continue;
    const meta = defaultBadges[valid.length] || defaultBadges[0];
    let hint = cleanSpokenText(item.hint || (locale === 'th' ? item.hintTh : item.hintId) || item.translation || '').slice(0, 260);
    let pronunciation = cleanSpokenText(item.pronunciation || item.phonetic || '').slice(0, 260);

    // CRITICAL: Clean any leaked Hanzi/Kanji from pronunciation and mother-tongue hints
    if (targetLang === 'ja') {
      pronunciation = pronunciation.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '').replace(/\s{2,}/g, ' ').trim();
      hint = hint.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, '').replace(/\s{2,}/g, ' ').trim();
    } else if (targetLang === 'zh') {
      pronunciation = pronunciation.replace(/[\u3400-\u4dbf\u4e00-\u9fff]/g, '').replace(/\s{2,}/g, ' ').trim();
      hint = hint.replace(/[\u3400-\u4dbf\u4e00-\u9fff]+/g, '').replace(/\s{2,}/g, ' ').trim();
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
    const cleanSample = looksLikeTargetLang(fallbackTarget, targetLang) ? cleanSpokenText(fallbackTarget) : '';
    const fallbackBank =
      targetLang === 'ja'
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
        isRealtimeAi: true,
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
  const timer = setTimeout(() => controller.abort(), 14500);
  try {
    const genCfg = {
      max_output_tokens: Math.min(maxOutputTokens, 1800),
    };
    if (!model.includes('lite')) {
      genCfg.thinking_level = 'low';
    } else {
      genCfg.temperature = temperature;
    }

    const res = await fetch(GOOGLE_INTERACTIONS_API, {
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
    });
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);

    const cooldownKey = `${key}::${model}`;
    if (res.status === 429) {
      const until = Date.now() + 300000;
      _copilotCooldownMap.set(cooldownKey, until);
      _copilotCooldownMap.set(`${key}::ALL_REST`, until);
      return { ok: false, reason: `HTTP 429 (${model})` };
    }
    if (!res.ok) {
      if (res.status !== 404 && res.status !== 503) {
        _copilotCooldownMap.set(cooldownKey, Date.now() + 12000);
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
    return { ok: true, parsed: Array.isArray(parsed) ? parsed[0] : parsed, model };
  } catch (err) {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
    return { ok: false, reason: err?.message || 'fetch_error' };
  }
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
  const now = Date.now();
  const totalKeys = keys.length;
  if (!totalKeys) return { ok: false, reason: 'no_keys_configured' };

  // Build candidate (key, model) pairs ordered so healthy pairs come first and
  // consecutive requests rotate BOTH keys and models (so even a 1-key local dev setup
  // spreads consecutive calls across separate Gemini 3.x model RPM buckets immediately).
  const stride = Math.max(totalKeys, COPILOT_MODELS.length);
  const startIdx = _copilotPoolIndex % stride;
  _copilotPoolIndex = (_copilotPoolIndex + 1) % stride;

  const candidates = [];
  for (let m = 0; m < COPILOT_MODELS.length; m++) {
    const model = COPILOT_MODELS[(startIdx + m) % COPILOT_MODELS.length];
    const key = keys[(startIdx + m) % totalKeys];
    const isCooledDown =
      now < (_copilotCooldownMap.get(`${key}::${model}`) || 0) ||
      now < (_copilotCooldownMap.get(`${key}::ALL_REST`) || 0);
    candidates.push({ key, model, isCooledDown });
  }
  candidates.sort((a, b) => Number(a.isCooledDown) - Number(b.isCooledDown));

  const healthyRestCandidates = candidates.filter((c) => !c.isCooledDown);
  let lastReason = 'unknown';

  // Fast-path: If all REST models on the active key(s) are currently in 429 cooldown,
  // jump straight to Gemini 3.8 Live structured JSON bridge (~2.3s, separate Live quota)!
  if (healthyRestCandidates.length === 0) {
    for (let kIdx = 0; kIdx < Math.min(2, totalKeys); kIdx++) {
      const liveKey = keys[(startIdx + kIdx) % totalKeys];
      const liveRes = await invokeGeminiLiveStructuredJson({ key: liveKey, promptText });
      if (liveRes && liveRes.ok) return liveRes;
      lastReason = liveRes?.reason || lastReason;
    }
  }

  const HEDGE_DELAY_MS = totalKeys === 1 ? 2500 : 5500;
  const OVERALL_DEADLINE_MS = 18000;
  const activeCandidates = healthyRestCandidates.length > 0 ? healthyRestCandidates : candidates;
  const maxAttempts = Math.min(totalKeys === 1 ? 2 : 3, activeCandidates.length);
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

    // Failover to Gemini 3.8 Live Structured JSON Bridge so learners NEVER receive static fallback templates!
    for (let kIdx = 0; kIdx < Math.min(2, totalKeys); kIdx++) {
      const liveKey = keys[(startIdx + kIdx) % totalKeys];
      const liveRes = await invokeGeminiLiveStructuredJson({ key: liveKey, promptText });
      if (liveRes && liveRes.ok) return liveRes;
      lastReason = liveRes?.reason || lastReason;
    }
    return { ok: false, reason: lastReason };
  } finally {
    clearTimeout(overallTimer);
  }
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
  const locale = body.locale === 'th' ? 'th' : 'id';
  const targetLocaleName = locale === 'th' ? 'Thai' : 'Indonesian';
  const aiText = cleanSpokenText(body.aiText || body.aiQuestionText || '').slice(0, 500);
  if (!aiText) {
    return badRequest('empty_ai_text');
  }

  const lastUserText = cleanSpokenText(body.lastUserText || '').slice(0, 320);
  const scenarioTitle = cleanSpokenText(body.scenarioTitle || body.scenarioId || 'Free Talk').slice(0, 100);
  const historyLines = normalizeHistory(body.history || body.conversationHistory);
  const excludeList = Array.isArray(body.excludeTexts)
    ? body.excludeTexts.map((t) => cleanSpokenText(t).slice(0, 160)).filter(Boolean).slice(0, 6)
    : [];
  const variationSeed = Number(body.variationSeed || 0);

  const focal = extractFocalClause(aiText, targetLang);

  const langSpec =
    targetLang === 'ja'
      ? 'Japanese (natural spoken N5-N3, Kanji+Hiragana, NO emojis; "pronunciation" = word-spaced Hepburn Romaji)'
      : targetLang === 'zh'
      ? 'Mandarin Chinese (natural spoken HSK1-HSK3, Simplified Chinese characters, NO emojis; "pronunciation" = tone-marked Pinyin)'
      : 'English (natural spoken A2-B1, NO emojis; "pronunciation" = easy Indonesian phonetic guide)';

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

  const prompt = [
    `Speech Copilot (${scenarioTitle}). Target: ${langSpec}.`,
    `Persona & Pedagogy: Sharp, observant, caring mentor ("guru galak tapi penuh perhatian") in FIEZEL (ecosystem created by Fitra Rustqi from Banda Aceh; powered by Braincore).`,
    historyLines.length
      ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
      : '',
    lastUserText ? `Learner said: "${lastUserText}"` : '',
    `Partner AI said: "${aiText}"`,
    focalRule,
    excludeList.length
      ? `Do NOT repeat: ${JSON.stringify(excludeList)}. Give 3 fresh angles.`
      : '',
    `Generate 3 spontaneous spoken replies directly answering "${focal.focalText}" (natural, conversational, punchy; NEVER generic textbook templates): easy=1 short direct sentence (or exact Echo repeat if demanded), mission=natural reply with concrete detail, rescue=reply + follow-up question back. Translate "${aiText}" into aiMeaning (${targetLocaleName}), and write natural first-person translation of each reply in hint (${targetLocaleName}).`,
    `JSON only: {"aiMeaning":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}]}`,
  ]
    .filter(Boolean)
    .join('\n');

  const temp = variationSeed > 0 || excludeList.length > 0 ? 0.75 : 0.45;
  const gen = await runGeminiJsonWithPool(keys, prompt, temp, 850);
  if (!gen.ok || !gen.parsed) {
    return jsonResponse({ ok: false, fallback: true, reason: gen.reason }, { status: 503 });
  }

  const replies = normalizeCopilotReplies(gen.parsed.replies, targetLang, locale);
  if (!replies.length) {
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
    /\b(bedanya|perbedaan|apa beda|arti dari|artinya apa|maksudnya apa|cara (?:menggunakan|memakai|pakai|pake)|gimana cara (?:pakai|pake)|kapan (?:pakai|pake)|kenapa (?:pakai|pake)|jelasin|jelaskan|ajarin|terangin|tolong bahas|bingung|nggak paham|gak paham|belum paham|kurang paham|tidak paham|nggak ngerti|gak ngerti|apa fungsi|contoh kalimat|how to use|difference between|what does .* mean|confused about|explain|งง|แปลว่าอะไร|ต่างกันยังไง|ใช้ยังไง|วิธีใช้|อธิบาย)\b/i.test(
      s
    ) || /\b(papan tulis|whiteboard|pop[\s-]?up|latihan tulis)\b/i.test(s)
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

export async function routeVoicePartnerTurn(ctx) {
  const clientIp =
    (ctx.request &&
      (ctx.request.headers.get('cf-connecting-ip') || ctx.request.headers.get('x-forwarded-for'))) ||
    '';
  if (!checkLiveRateLimit(clientIp, 35, 60000)) {
    return jsonResponse(
      { ok: false, fallback: true, error: 'rate_limited', message: 'Rate limit exceeded for partner turn.' },
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
  const rawLocale = String(body.locale || 'id').toLowerCase().trim();
  const locale = ['id', 'th', 'ja', 'zh', 'en'].includes(rawLocale) ? rawLocale : 'id';
  const targetLocaleName =
    locale === 'th'
      ? 'Thai'
      : locale === 'ja'
        ? 'Japanese'
        : locale === 'zh'
          ? 'Mandarin Chinese'
          : locale === 'en'
            ? 'English'
            : 'Indonesian';
  const rawUserInput = cleanSpokenText(body.text || body.userText || '').slice(0, 400);
  if (!rawUserInput) {
    return badRequest('empty_user_text');
  }
  const forcePopup = Boolean(body.forcePopup) || /\[WHITEBOARD_REQUEST\]/i.test(rawUserInput);
  const userText = rawUserInput.replace(/\[WHITEBOARD_REQUEST\]\s*/gi, '').trim() || rawUserInput;

  const requestedSwitchMode = forcePopup ? '' : detectCallModeSwitchIntent(userText);
  const effectiveCallMode =
    requestedSwitchMode || (body.callMode === 'casual_chat' ? 'casual_chat' : 'tutor_coach');

  // MANDATE #3: Deterministic Unapologetic Refusal if User Demands AI Switch Language
  if (!forcePopup && detectLanguageSwitchDemand(userText, targetLang)) {
    const guard = buildIroncladGuardResponse('refuse_lang_switch', targetLang, locale);
    const replies = normalizeCopilotReplies(guard.replies, targetLang, locale);
    return jsonResponse({
      ok: true,
      source: 'ai-realtime-guard',
      model: 'fiezel-ironclad-guard',
      aiReply: guard.aiReply,
      aiReplyTranslationId: guard.aiReplyTranslationId,
      aiReplyTranslationTh: guard.aiReplyTranslationTh,
      replies,
      uiAction: { actionType: 'none' },
    });
  }

  const boardOnly = Boolean(body.boardOnly);
  const isProfanityTurn = !forcePopup && !boardOnly && detectProfanityOrTrashTalk(userText);
  const isExplanationTurn = forcePopup || boardOnly || isExplanationQuestion(userText);

  const personaId = cleanSpokenText(body.personaId || '').toLowerCase();
  const personaName = cleanSpokenText(
    body.personaName || (targetLang === 'ja' ? 'Nanami' : targetLang === 'zh' ? 'Xiao Mochi' : 'Alex')
  ).slice(0, 40);
  const scenarioTitle = cleanSpokenText(body.scenarioTitle || 'Free Talk').slice(0, 100);
  const learnerDossier =
    typeof body.learnerDossier === 'string' ? body.learnerDossier.slice(0, 1800) : '';
  const historyLines = normalizeHistory(body.history);

  const langSpec =
    targetLang === 'ja'
      ? 'Japanese (street-real expressive Tokyo/Kansai spoken Japanese N5-N3, Kanji+Hiragana, NO emojis; reply "pronunciation" = word-spaced Hepburn Romaji)'
      : targetLang === 'zh'
        ? 'Mandarin Chinese (witty expressive Beijing Putonghua HSK1-HSK3, Simplified Chinese characters, NO emojis; reply "pronunciation" = tone-marked Pinyin)'
        : 'English (authentic street-smart American or razor-sharp British conversational English A2-B1, NO emojis; reply "pronunciation" = easy Indonesian phonetic guide)';

  const dialectIdentity =
    targetLang === 'ja'
      ? personaId === 'keita' || /keita/i.test(personaName)
        ? `VOICE & DIALECT IDENTITY (Keita Senpai): Street-smart Tokyo-Kansai older-brother senpai. Sound human, sharp, witty, and playfully sarcastic ("なんでやねん！", "おいおい待てって", "〜やん", "それ教科書ロボットやん！"). NEVER sound like a polite NHK robot.`
        : `VOICE & DIALECT IDENTITY (Sensei Nanami): Sharp, sassy Tokyo-Osaka Tsundere Sensei. Sound alive, witty, and unapologetically sarcastic ("ちょっと待ってよ！", "なにそのロボットみたいな日本語？", "〜でしょ！", "もう一回ちゃんと言ってごらん！"). NEVER sound like a stiff assistant.`
      : targetLang === 'zh'
        ? `VOICE & DIALECT IDENTITY (Xiao Mochi · 京味儿): Witty, sassy Beijing Putonghua mentor with playful sharp sarcasm ("哎哟喂，停一下！", "你这声调飘到外太空啦！", "别跟背课文似的，再来一遍！"). Crisp northern cadence, tough-love warmth, ZERO bland politeness.`
        : personaId === 'coach_sarah' || /sarah/i.test(personaName)
          ? `VOICE & DIALECT IDENTITY (Coach Sarah): Razor-sharp, dryly sarcastic British/Transatlantic mentor ("Oh brilliant, 'I am agree', did we just invent a new English dialect? Hold it right there."). Crisp articulation, zero generic fluff.`
          : personaId === 'cambridge_examiner'
            ? `VOICE & DIALECT IDENTITY (Examiner Arthur): Composed, observant British RP examiner.`
            : `VOICE & DIALECT IDENTITY (Coach Alex, Urban Street-Smart American "Hood" Mentor): Authentic urban American street-smart cadence with charismatic older-brother swagger, natural contractions & AAVE-inflected rhythm ("Yo hold up fam, what was that 'I am agree'?! Nah bro, drop that stiff textbook robot translation right now", "Aight bet, now run that back clean for me", "Talk to me for real-what part of English been stressing you out?"). Unapologetically witty, sarcastic on lazy slips, deeply loyal and caring underneath. NEVER sound like a corporate customer-service bot!`;

  const modeDirective =
    effectiveCallMode === 'casual_chat'
      ? `[CURRENT CALL MODE: CASUAL HANGOUT CHAT ("casual_chat")]:
- The learner wants a chill, fun, street-real casual conversation like talking to a close friend.
- Do NOT open the teaching whiteboard popup (keep uiAction.actionType="none" or "switch_call_mode") UNLESS the learner explicitly asks you to explain a grammar rule or open the popup!`
      : `[CURRENT CALL MODE: ACTIVE MENTOR & TUTOR ("tutor_coach")]:
- MANDATORY LIVE GRAMMAR/TONE INTERCEPTION: If "${userText}" has ANY grammar, particle, conjugation, tone, or stiff translation mistake:
  1) Call it out immediately with sharp, funny mentor sarcasm (if they admit confusion, switch to razor-clear coaching).
  2) Give the exact natural phrase and DEMAND ECHO REDEMPTION (make them repeat it aloud right now), setting Option 1 ("easy") in "replies" to that exact phrase!
- PROACTIVE STRUGGLE DIAGNOSIS: Actively diagnose what has been hardest for the learner in FIEZEL and offer to pop up the interactive whiteboard or navigate to a FIEZEL module.`;

  const prompt = boardOnly
    ? [
        `[SILENT JSON COMPILER TASK: Call emit_json_response immediately. Do NOT generate spoken audio.]`,
        `Target course: ${targetLang.toUpperCase()}. Learner UI language: ${targetLocaleName}. Mentor name: ${personaName}.`,
        `Learner question: "${userText}"`,
        `Build a JSON object with a visual teaching board answering "${userText}".`,
        `Field rules: "aiReply" must be 100% in ${targetLang === 'zh' ? 'Simplified Chinese Hanzi' : targetLang === 'ja' ? 'Japanese Kanji+Kana' : 'English'} (1 short sentence). "aiReplyTranslation" and "coachSpokenScript" must be 100% in ${targetLocaleName} (1 short sentence, max 14 words, no emojis, no em-dash, write "Verb ing" with a space, never say AI/bot), quoting the ${targetLang.toUpperCase()} target words.`,
        `"sampleTarget": natural ${targetLang.toUpperCase()} sentence showing the rule. "trapWrongSentence": realistic mistake version of sampleTarget. "trapWrongReason": short reason in ${targetLocaleName}.`,
        `"drillMeaningPrompt": quiz prompt in ${targetLocaleName} for a DIFFERENT real-life situation. "drillTargetSentence": correct ${targetLang.toUpperCase()} sentence for that new situation (different from sampleTarget). "drillTrapSentence": wrong trap version of drillTargetSentence.`,
        `JSON schema: {"aiReply":"...","aiReplyTranslation":"...","uiAction":{"actionType":"open_learning_popup","topicTitle":"...","patternFormula":"...","coachSpokenScript":"...","sampleTarget":"...","trapWrongSentence":"...","trapWrongReason":"...","drillMeaningPrompt":"...","drillTargetSentence":"...","drillTrapSentence":"..."}}`,
      ].join('\n')
    : [
        `You are ${personaName} on a live voice call (${scenarioTitle}). Target: ${langSpec}.`,
        dialectIdentity,
        `[FIEZEL ECOSYSTEM & IDENTITY]: Created by Fitra Rustqi (@fitrarustqi) from Banda Aceh, Indonesia; powered by Braincore Engine (BKT, IRT 3PL, OLM); mascot is Mochi the 3D Daifuku companion.`,
        learnerDossier,
        `[4 IRONCLAD MANDATES: ZERO EXCEPTIONS]:`,
        `1) MULTILINGUAL INPUT ACCEPTED, SPOKEN OUTPUT ("aiReply") 100% LOCKED IN TARGET LANGUAGE (${targetLang.toUpperCase()}):
   - The learner is 100% free to speak or type in Indonesian, English, Japanese, Mandarin, Thai, or mixed languages. Understand their exact meaning without complaining.
   - HOWEVER, your "aiReply" MUST ALWAYS BE 100% in ${targetLang === 'ja' ? 'Japanese (Kanji+Kana)' : targetLang === 'zh' ? 'Simplified Chinese (Hanzi)' : 'English'} with 100% authentic native phrasing—even when explaining grammar or opening the whiteboard popup! NEVER write Indonesian or Thai sentences inside "aiReply"! Put the ${targetLocaleName} translation strictly in "aiReplyTranslation" and the written board explanation in "uiAction.explanationText" / "uiAction.coachSpokenScript".`,
        `2) ZERO APOLOGIES & REFUSE TO SWITCH LANGUAGE:`,
        `   - NEVER apologize ("I apologize", "I'm sorry", "Maaf", "すみません、AIなので"). You are a bold human-like mentor.`,
        `   - If the learner tells you to speak another language, firmly refuse in ${targetLang.toUpperCase()} because we are in the ${targetLang.toUpperCase()} course right now, while telling them they can speak their own language freely and you understand every word.`,
        `3) CLAP BACK ON PROFANITY / TRASH-TALK:`,
        `   - If the learner swears, curses, or trash-talks ("${userText}"), NEVER apologize and NEVER lecture like a corporate bot! Clap back / roast them back sharply with street-smart wit in ${targetLang.toUpperCase()}, mocking their weak roast and challenging them to argue with clean ${targetLang.toUpperCase()} grammar!`,
        `4) VOICE MODE SWITCHING & UNIVERSAL FIEZEL NAVIGATION + HYBRID 2-LAYER WHITEBOARD ("uiAction"):`,
        `   - If learner asks to switch to casual chat ("chat seperti biasa", "ngobrol santai") or back to tutor mode ("mode mengajar"), set uiAction.actionType="switch_call_mode" and uiAction.callMode="casual_chat" or "tutor_coach".`,
        `   - If learner asks to navigate to any FIEZEL module by voice, set uiAction.actionType="navigate_app" and uiAction.destination to: "grammar"|"vocab"|"kana"|"kanji"|"reading"|"writing"|"listening"|"test"|"latihan"|"kurikulum"|"misi"|"progress"|"home".`,
        `   - PURE DYNAMIC WHITEBOARD POPUP (when learner asks a grammar/vocab/particle/tone question OR needs visual correction in tutor_coach mode):`,
        `     * Whenever the learner asks what a grammar point or word difference means, you MUST return actionType="open_learning_popup" with a board generated dynamically to match THAT exact question!`,
        `     * Fill ALL of: topicTitle, coachSpokenScript, patternFormula, leadText, triggerWord, triggerTag, wrongWord, wrongTag, rightWord, rightTag, tailText, sampleTarget, trapWrongSentence, trapWrongToken, trapWrongReason, drillMeaningPrompt, drillTargetSentence, drillTrapSentence.`,
        `   - EXPLANATION LANGUAGE RULE: "aiReply" MUST ALWAYS stay 100% in ${targetLang.toUpperCase()} so the spoken voice and subtitle HUD stay in the target language, while "aiReplyTranslation", "uiAction.coachSpokenScript", "uiAction.explanationText", and "uiAction.trapWrongReason" are written in the LEARNER'S language (${targetLocaleName}).`,
        modeDirective,
        `[FIEZEL COPY RULES]: NEVER write an em-dash or en-dash character in any field (use a comma, colon, or a new sentence instead). NEVER write hyphenated "Verb-ing" (write "Verb ing" with a space). NEVER call yourself or the app "AI", "bot", "chatbot", "assistant" or "model" in any language; you are ${personaName}, a FIEZEL mentor, and the app is simply "Fiezel".`,
        historyLines.length
          ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
          : '',
        `Learner said: "${userText}"`,
        `1) "aiReply": Reply as ${personaName} in 2-4 punchy spoken sentences (max 48 words, no emojis) 100% in ${targetLang === 'zh' ? 'Simplified Chinese Hanzi' : targetLang === 'ja' ? 'Japanese Kanji+Kana' : 'English'}. Translate into clean aiReplyTranslation (${targetLocaleName}) with ZERO raw Hanzi/Kanji/Kana.`,
        `2) "replies": 3 spontaneous spoken replies directly answering your aiReply in ${targetLang === 'zh' ? 'Simplified Chinese Hanzi' : targetLang === 'ja' ? 'Japanese Kanji+Kana' : 'English'}, with ${targetLocaleName} "hint" and clean Romanized "pronunciation".`,
        `JSON only: {"aiReply":"...","aiReplyTranslation":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hint":"..."}],"uiAction":{"actionType":"none","callMode":"","destination":"","bankTopicId":"","topicTitle":"","focusType":"grammar","coachSpokenScript":"","explanationText":"","patternFormula":"","drillInstruction":"","sampleTarget":"","leadText":"","triggerWord":"","triggerTag":"","wrongWord":"","wrongTag":"","rightWord":"","rightTag":"","tailText":"","secondLeadText":"","secondTriggerWord":"","secondWrongWord":"","secondRightWord":"","secondTailText":"","secondCoachScript":"","trapWrongSentence":"","trapWrongToken":"","trapWrongReason":"","drillMeaningPrompt":"","drillTargetSentence":"","drillTrapSentence":"","drillBlocks":[],"drillDistractors":[]}}`,
      ]
        .filter(Boolean)
        .join('\n');

  const gen = await runGeminiJsonWithPool(keys, prompt, isExplanationTurn ? 0.45 : 0.65, isExplanationTurn ? 450 : 1500);
  if (!gen.ok || !gen.parsed) {
    if (isProfanityTurn) {
      const guard = buildIroncladGuardResponse('clapback_profanity', targetLang, locale);
      const replies = normalizeCopilotReplies(guard.replies, targetLang, locale);
      return jsonResponse({
        ok: true,
        source: 'ai-realtime-guard',
        model: 'fiezel-ironclad-clapback',
        aiReply: guard.aiReply,
        aiReplyTranslationId: guard.aiReplyTranslationId,
        aiReplyTranslationTh: guard.aiReplyTranslationTh,
        replies,
        uiAction: { actionType: 'none' },
      });
    }
    return jsonResponse({ ok: false, fallback: true, reason: gen.reason }, { status: 503 });
  }

  let aiReply = cleanSpokenText(gen.parsed.aiReply || '');
  // Strip any stiff corporate apology phrases if a model ever slips one in
  aiReply = aiReply
    .replace(/\b(I apologize|I am sorry, as an AI|As an AI language model)\b[^.?!]*[.?!]\s*/gi, '')
    .trim();

  const rawAction =
    gen.parsed.uiAction && typeof gen.parsed.uiAction === 'object' ? gen.parsed.uiAction : null;

  if (!looksLikeTargetLang(aiReply, targetLang)) {
    if (isExplanationTurn || rawAction?.actionType === 'open_learning_popup') {
      // Explanation is intentionally in the learner's language as instructed!
    } else if (isProfanityTurn) {
      const guard = buildIroncladGuardResponse('clapback_profanity', targetLang, locale);
      const replies = normalizeCopilotReplies(guard.replies, targetLang, locale);
      return jsonResponse({
        ok: true,
        source: 'ai-realtime-guard',
        model: 'fiezel-ironclad-clapback',
        aiReply: guard.aiReply,
        aiReplyTranslationId: guard.aiReplyTranslationId,
        aiReplyTranslationTh: guard.aiReplyTranslationTh,
        replies,
        uiAction: { actionType: 'none' },
      });
    } else {
      return jsonResponse({ ok: false, fallback: true, reason: 'invalid_ai_reply' }, { status: 503 });
    }
  }

  const replies = normalizeCopilotReplies(
    gen.parsed.replies,
    targetLang,
    locale,
    rawAction?.sampleTarget || ''
  );
  let aiReplyTranslation = cleanSpokenText(
    gen.parsed.aiReplyTranslation ||
      gen.parsed.aiReplyTranslationId ||
      gen.parsed.aiReplyTranslationTh ||
      ''
  );
  if (targetLang === 'ja' && locale !== 'ja') {
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

  const bankTopicId = cleanSpokenText(rawAction?.bankTopicId || '').slice(0, 48);
  const resolvedCoachScript = cleanSpokenText(
    rawAction?.coachSpokenScript || (actionType === 'open_learning_popup' && isExplanationTurn ? aiReply : '')
  ).slice(0, 360);
  if (actionType === 'open_learning_popup' && isExplanationTurn && resolvedCoachScript && !aiReply) {
    aiReply = resolvedCoachScript;
  }

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
            topicTitle: cleanSpokenText(rawAction?.topicTitle || '').slice(0, 120),
            focusType: cleanSpokenText(rawAction?.focusType || 'grammar')
              .toLowerCase()
              .slice(0, 24),
            coachSpokenScript: resolvedCoachScript,
            explanationText: cleanSpokenText(rawAction?.explanationText || resolvedCoachScript).slice(0, 420),
            patternFormula: cleanSpokenText(rawAction?.patternFormula || '').slice(0, 180),
            drillInstruction: cleanSpokenText(rawAction?.drillInstruction || '').slice(0, 240),
            sampleTarget: cleanSpokenText(rawAction?.sampleTarget || '').slice(0, 220),
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
            secondCoachScript: cleanSpokenText(rawAction?.secondCoachScript || '').slice(0, 360),
            trapWrongSentence: cleanSpokenText(rawAction?.trapWrongSentence || '').slice(0, 220),
            trapWrongToken: cleanSpokenText(rawAction?.trapWrongToken || '').slice(0, 80),
            trapWrongReason: cleanSpokenText(rawAction?.trapWrongReason || '').slice(0, 240),
            drillMeaningPrompt: cleanSpokenText(rawAction?.drillMeaningPrompt || '').slice(0, 220),
            drillTargetSentence: cleanSpokenText(rawAction?.drillTargetSentence || '').slice(
              0,
              220
            ),
            drillTrapSentence: cleanSpokenText(rawAction?.drillTrapSentence || '').slice(0, 220),
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
          };

  return jsonResponse({
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
    replies,
    uiAction,
    isExplanation: isExplanationTurn || actionType === 'open_learning_popup',
  });
}

/**
 * Handler POST /api/braincore/sync
 * Idempotently acknowledges voice telemetry queue from student client.
 */
export async function routeVoiceBraincoreSync(ctx) {
  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const attempts = Array.isArray(body?.attempts) ? body.attempts : [];
  const acceptedIds = attempts.map((a) => a && a.id).filter(Boolean);
  return jsonResponse({ ok: true, acceptedIds, count: acceptedIds.length });
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

  // 3. Fallback dev lokal / bila env belum terpasang
  if (!envOwnerHash && !envSyncKey) {
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
  vi: 'natural conversational Vietnamese',
  ms: 'natural conversational Malay',
  ko: 'natural conversational Korean',
  es: 'natural conversational Spanish',
  fr: 'natural conversational French',
  de: 'natural conversational German',
};

async function fallbackGoogleTranslate(text, targetLocale) {
  try {
    const tl = String(targetLocale || 'id').toLowerCase();
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 4000);
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
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(tl)}`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 4500);
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

  const cacheKey = `${targetLocale}::${rawText}`;
  if (_serverTranslationCache.has(cacheKey)) {
    return jsonResponse({
      ok: true,
      translatedText: _serverTranslationCache.get(cacheKey),
      locale: targetLocale,
      model: 'server-cache',
    });
  }

  const keys = await resolvePoolKeys(ctx);
  let translatedText = '';
  let modelUsed = 'gemini-pool';

  // Always prefer fast gtx/mymemory translation first so subtitle translation never opens a competing Gemini WebSocket or burns RPD quota
  translatedText = await fallbackGoogleTranslate(rawText, targetLocale);
  if (translatedText) {
    modelUsed = 'gtx-fast';
  }

  if (!translatedText) {
    const sourceLoc = String(body.sourceLang || body.sourceLocale || 'en').toLowerCase().trim();
    translatedText = await fallbackMyMemoryTranslate(rawText, targetLocale, sourceLoc);
    if (translatedText) {
      modelUsed = 'mymemory-fast';
    }
  }

  if (!translatedText && keys.length > 1) {
    const cjkRule = (targetLocale === 'ja' || targetLocale === 'zh' || targetLocale === 'ko')
      ? 'Use appropriate native Kanji/Kana/Hanzi characters for natural readability in this language.'
      : 'ZERO raw Chinese Hanzi or Japanese Kanji characters in the output! If referencing a specific term, write its Romanized form.';

    const prompt = [
      `Translate the following spoken language-tutor utterance accurately and naturally into ${targetLangName}.`,
      `STRICT RULES:`,
      `1) Translate the EXACT meaning and tone (including playful teasing, grammar corrections, or questions), NEVER output generic summaries like "Mochi menanggapi...".`,
      `2) ${cjkRule}`,
      `Utterance: "${rawText}"`,
      `JSON only: {"translatedText":"..."}`,
    ].join('\n');

    const gen = await runGeminiJsonWithPool(keys, prompt, 0.2, 450);
    if (gen.ok && gen.parsed) {
      translatedText = cleanSpokenText(
        gen.parsed.translatedText || gen.parsed.translation || gen.parsed.aiMeaning || ''
      );
      modelUsed = gen.model || 'gemini';
    }
  }

  // Only strip CJK characters if the target language is NOT Japanese, Chinese, or Korean!
  if (targetLocale !== 'ja' && targetLocale !== 'zh' && targetLocale !== 'ko') {
    translatedText = translatedText
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (!translatedText) {
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
  const cleanText = cleanSpokenText(body.text || '').slice(0, 520);
  if (!cleanText) {
    return badRequest('empty_text');
  }

  const rawRequestedLang = String(body.spokenLang || body.speechLang || body.targetLang || 'en')
    .toLowerCase()
    .trim();
  let effectiveLang = ['id', 'th', 'ja', 'zh', 'en'].includes(rawRequestedLang)
    ? rawRequestedLang
    : 'en';

  // Auto-detect explanation language from the actual text so Indonesian/Thai explanations NEVER get spoken with foreign English prosody
  if (/[\u0E00-\u0E7F]{2,}/.test(cleanText)) {
    effectiveLang = 'th';
  } else if (/[ぁ-んァ-ヶ]/.test(cleanText)) {
    effectiveLang = 'ja';
  } else if (/[\u4e00-\u9fff]/.test(cleanText)) {
    effectiveLang = 'zh';
  } else if (
    /\b(adalah|sedangkan|gunakan|perhatikan|kalimat|karena|untuk|dalam|jangan|ketika|pakai|bedanya|artinya|lihat|papan|kata|bahasa|sekarang|kalau|bukan|berarti|contohnya|coba)\b/i.test(
      cleanText
    )
  ) {
    effectiveLang = 'id';
  }

  const personaId = cleanSpokenText(body.personaId || '').toLowerCase();
  const validVoices = new Set(['Puck', 'Kore', 'Aoede', 'Charon', 'Fenrir', 'Leda', 'Orus', 'Zephyr']);
  const requestedVoice = cleanSpokenText(body.voiceName || '');
  const defaultVoice =
    personaId === 'coach_sarah'
      ? 'Kore'
      : personaId === 'cambridge_examiner'
      ? 'Charon'
      : personaId === 'keita'
      ? 'Puck'
      : effectiveLang === 'ja' || effectiveLang === 'zh'
      ? 'Aoede'
      : 'Puck';
  const voice = validVoices.has(requestedVoice) ? requestedVoice : defaultVoice;

  const defaultStyle =
    effectiveLang === 'id'
      ? 'Warm, charismatic, crystal-clear native Indonesian language mentor speaking natural conversational Bahasa Indonesia, lively friendly Jakarta cadence, crisp pronunciation when quoting foreign example words, zero stiff robotic announcer tone'
      : effectiveLang === 'th'
      ? 'Warm, lively, crystal-clear native Thai language mentor speaking natural conversational Thai, friendly Bangkok cadence, crisp pronunciation when quoting foreign example words, zero robotic monotone'
      : effectiveLang === 'ja'
      ? personaId === 'keita'
        ? 'Energetic street-smart Tokyo-Kansai Japanese senpai, witty sarcastic teasing, crisp natural conversational pitch accent, human warmth'
        : 'Sharp, sassy Tokyo-Osaka tsundere Japanese sensei, lively street-real rhythm, witty sarcastic tough-love inflection, zero stiff announcer tone'
      : effectiveLang === 'zh'
      ? 'Witty, sassy Beijing Putonghua Mandarin mentor, expressive four-tone prosody, playful sarcastic tough-love warmth, crisp northern rhythm'
      : personaId === 'coach_sarah'
      ? 'Razor-sharp dryly sarcastic British-Transatlantic mentor, crisp articulation, arched-eyebrow wit, composed authority'
      : personaId === 'cambridge_examiner'
      ? 'Composed crisp British RP academic speaking examiner, measured cadence'
      : 'Charismatic urban street-smart American older-brother mentor, authentic hood cadence and natural AAVE-inflected rhythm, crisp contractions, witty sarcastic swagger, warm tough-love energy';

  const style =
    effectiveLang === 'id' || effectiveLang === 'th'
      ? defaultStyle
      : cleanSpokenText(body.stylePrompt || defaultStyle).slice(0, 260) || defaultStyle;

  const now = Date.now();
  const ttsCandidates = [];
  for (const model of GEMINI_TTS_MODELS) {
    for (let i = 0; i < keys.length; i++) {
      const idx = (_copilotPoolIndex + i) % keys.length;
      const key = keys[idx];
      const cooldownKey = `${key}::${model}`;
      if (
        now >= (_copilotCooldownMap.get(cooldownKey) || 0) &&
        now >= (_copilotCooldownMap.get(`${key}::ALL_REST`) || 0)
      ) {
        ttsCandidates.push({ key, model, cooldownKey });
      }
    }
  }
  const activeKeyIdx = _copilotPoolIndex % keys.length;
  _copilotPoolIndex = (_copilotPoolIndex + 1) % keys.length;

  let lastReason = 'tts_failed';
  const maxAttempts = Math.min(keys.length === 1 ? 2 : 4, ttsCandidates.length);

  for (let a = 0; a < maxAttempts; a++) {
    const { key, model, cooldownKey } = ttsCandidates[a];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    try {
      const res = await fetch(GOOGLE_INTERACTIONS_API, {
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
              content: [
                {
                  type: 'text',
                  text: cleanText,
                  annotations: [
                    {
                      type: 'speech_metadata',
                      style,
                    },
                  ],
                },
              ],
            },
          ],
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: [{ voice }],
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const until = Date.now() + 300000;
        _copilotCooldownMap.set(cooldownKey, until);
        _copilotCooldownMap.set(`${key}::ALL_REST`, until);
        lastReason = `HTTP 429 (${model})`;
        continue;
      }
      if (!res.ok) {
        lastReason = `HTTP ${res.status} (${model})`;
        continue;
      }

      const data = await res.json().catch(() => null);
      let audioBase64 = typeof data?.output_audio?.data === 'string' ? data.output_audio.data : '';
      let audioMimeType = data?.output_audio?.mime_type || 'audio/wav';
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

      if (audioBase64 && audioBase64.length > 100) {
        _copilotCooldownMap.delete(cooldownKey);
        return jsonResponse(
          {
            ok: true,
            audioBase64,
            audioMimeType,
            voice,
            model,
            spokenLang: effectiveLang,
          },
          { headers: { 'cache-control': 'no-store' } }
        );
      }
      lastReason = 'empty_audio';
    } catch (err) {
      clearTimeout(timer);
      lastReason = err?.message || 'tts_fetch_error';
    }
  }

  // Server-side Gemini 3.8 Live 24kHz WAV failover so even when REST TTS models hit 429,
  // /api/voice/gemini-tts returns crisp native WAV audio in ~2s without a 503 round-trip!
  for (let kOff = 0; kOff < Math.min(2, keys.length); kOff++) {
    const liveKey = keys[(activeKeyIdx + kOff) % keys.length];
    const liveWav = await invokeGeminiLiveWavTts({
      key: liveKey,
      text: cleanText,
      voice,
      style,
      effectiveLang,
    });
    if (liveWav && liveWav.ok && liveWav.audioBase64) {
      return jsonResponse(
        {
          ok: true,
          audioBase64: liveWav.audioBase64,
          audioMimeType: 'audio/wav',
          voice,
          model: 'gemini-3.8-live-tts',
          spokenLang: effectiveLang,
        },
        { headers: { 'cache-control': 'no-store' } }
      );
    }
    lastReason = liveWav?.reason || lastReason;
  }

  return jsonResponse({ ok: false, fallback: true, reason: lastReason }, { status: 503 });
}

function encodePcm16ToWavBase64(pcmChunks, sampleRate = 24000) {
  let rawBytes = 0;
  for (let i = 0; i < pcmChunks.length; i++) rawBytes += pcmChunks[i].byteLength;
  const pcmLen = rawBytes & ~1;
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

  let offset = 44;
  for (let i = 0; i < pcmChunks.length && offset < 44 + pcmLen; i++) {
    const chunk = pcmChunks[i];
    const copyLen = Math.min(chunk.byteLength, 44 + pcmLen - offset);
    wav.set(chunk.subarray(0, copyLen), offset);
    offset += copyLen;
  }

  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < wav.length; i += step) {
    binary += String.fromCharCode.apply(null, wav.subarray(i, i + step));
  }
  return btoa(binary);
}

async function invokeGeminiLiveWavTts({ key, text, voice, style, effectiveLang }) {
  if (typeof WebSocket === 'undefined' || !key || !text) {
    return { ok: false, reason: 'ws_tts_unavailable' };
  }
  const cooldownKey = `${key}::gemini-3.8-live-tts`;
  if (Date.now() < (_copilotCooldownMap.get(cooldownKey) || 0)) {
    return { ok: false, reason: 'live_tts_cooldown' };
  }
  const langLabel =
    effectiveLang === 'id'
      ? 'natural conversational Bahasa Indonesia'
      : effectiveLang === 'th'
        ? 'natural conversational Thai'
        : effectiveLang === 'ja'
          ? 'natural Japanese'
          : effectiveLang === 'zh'
            ? 'natural Beijing Mandarin Chinese'
            : 'natural English';
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`;

  return new Promise((resolve) => {
    let settled = false;
    let ws = null;
    let idleTimer = null;
    const pcmChunks = [];

    const finalize = (reasonIfEmpty = 'live_tts_empty') => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimer);
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
      const audioBase64 = pcmChunks.length > 0 ? encodePcm16ToWavBase64(pcmChunks, 24000) : '';
      if (audioBase64) {
        _copilotCooldownMap.delete(cooldownKey);
        resolve({ ok: true, audioBase64 });
      } else {
        resolve({ ok: false, reason: reasonIfEmpty });
      }
    };

    const overallTimer = setTimeout(() => finalize('live_tts_timeout'), 9000);

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finalize(err?.message || 'ws_tts_init_failed');
      return;
    }

    ws.onopen = () => {
      try {
        const speechLangCode =
          effectiveLang === 'ja'
            ? 'ja-JP'
            : effectiveLang === 'zh'
              ? 'cmn-CN'
              : effectiveLang === 'th'
                ? 'th-TH'
                : effectiveLang === 'id'
                  ? 'id-ID'
                  : 'en-US';
        ws.send(
          JSON.stringify({
            setup: {
              model: 'models/gemini-3.8-live',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  languageCode: speechLangCode,
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Puck' } },
                },
              },
              systemInstruction: {
                parts: [
                  {
                    text: `PURE VOICEOVER READER MODE. Vocal style: ${style}. Speak strictly in ${langLabel} (${speechLangCode}) with 100% authentic native phonology and zero foreign/Indonesian accent. Read ONLY the exact text given after READ_EXACTLY:, word for word, with zero added words before or after.`,
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
                    parts: [{ text: `READ_EXACTLY: ${text}` }],
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
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const b64 = p?.inlineData?.data;
          if (typeof b64 === 'string' && b64.length > 0) {
            try {
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              pcmChunks.push(bytes);
              if (idleTimer) clearTimeout(idleTimer);
              idleTimer = setTimeout(() => finalize('live_tts_idle_complete'), 240);
            } catch {}
          }
        }
      }

      if (msg?.serverContent?.turnComplete || (msg?.serverContent?.generationComplete && pcmChunks.length > 0)) {
        finalize('live_tts_turn_complete');
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
      if (ev.code === 1011) {
        _copilotCooldownMap.set(cooldownKey, Date.now() + 45000);
      }
      finalize(`live_tts_closed_${ev.code}`);
    };
  });
}

export const ROUTES = [
  ['POST', '/api/voice/live-session', routeVoiceLiveSession],
  ['POST', '/api/voice/report-drop', routeVoiceReportDrop],
  ['POST', '/api/voice/copilot-assist', routeVoiceCopilotAssist],
  ['POST', '/api/voice/partner-turn', routeVoicePartnerTurn],
  ['POST', '/api/voice/translate', routeVoiceTranslate],
  ['POST', '/api/voice/gemini-tts', routeVoiceGeminiTts],
  ['POST', '/api/voice/sync-keys', routeVoiceSyncKeys],
  ['POST', '/api/braincore/sync', routeVoiceBraincoreSync],
];
