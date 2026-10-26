/**
 * workers/api/voice/route-voice-live.js — SLOT 14: Gemini Live Token & Multi-Key Pool Rotator.
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

import { jsonResponse, badRequest } from '../errors.js';
import { readJsonFromCtx } from '../mw-guard.js';

const GOOGLE_AUTH_TOKEN_API = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';
const GOOGLE_GEN_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
const COPILOT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-lite-latest'];
const DEFAULT_CONSTRAINED_ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

// Map in-memory untuk status cooldown kunci per worker instance
const _cooldownMap = new Map(); // key -> timestamp ms
let _poolIndex = Math.floor(Math.random() * 16);

function parseKeys(env) {
  const raw = String(env?.GEMINI_LIVE_KEYS || env?.GEMINI_API_KEY || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 10);
}

/**
 * Mencoba mencetak ephemeral auth token menggunakan kunci Google AI Studio.
 */
async function mintEphemeralToken(apiKey) {
  const now = Date.now();
  const body = {
    uses: 1,
    expireTime: new Date(now + 30 * 60e3).toISOString(),
    newSessionExpireTime: new Date(now + 2 * 60e3).toISOString(),
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
      return { ok: true, token: json.name };
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
  const keys = parseKeys(ctx.env);
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
      return jsonResponse({
        ok: true,
        token: result.token,
        model: DEFAULT_LIVE_MODEL,
        endpoint: DEFAULT_CONSTRAINED_ENDPOINT,
        keyIndex: currentIdx + 1,
        totalKeys,
      });
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
  const reason = String(body?.reason || '').toLowerCase();
  const isQuota =
    body?.code === 1011 ||
    reason.includes('quota') ||
    reason.includes('limit') ||
    reason.includes('exhausted');
  const keys = parseKeys(ctx.env);

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
  return /[A-Za-z]/.test(tx) && !/[\u3040-\u30ff\u4e00-\u9faf]/.test(tx);
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

function normalizeCopilotReplies(rawReplies, targetLang) {
  if (!Array.isArray(rawReplies)) return [];
  const defaultBadges = [
    { tier: 'easy', badgeId: 'Singkat & Mudah', badgeTh: 'สั้นและง่าย' },
    { tier: 'mission', badgeId: 'Alami & Kontekstual', badgeTh: 'เป็นธรรมชาติ' },
    { tier: 'rescue', badgeId: 'Jawab + Tanya Balik', badgeTh: 'ตอบและถามกลับ' },
  ];

  const valid = [];
  for (let i = 0; i < rawReplies.length && valid.length < 3; i++) {
    const item = rawReplies[i];
    if (!item || typeof item !== 'object') continue;
    const text = cleanSpokenText(item.text || '');
    if (!looksLikeTargetLang(text, targetLang)) continue;
    const meta = defaultBadges[valid.length] || defaultBadges[0];
    valid.push({
      id: `ai_rt_${Date.now()}_${valid.length}`,
      tier: item.tier === 'easy' || item.tier === 'mission' || item.tier === 'rescue' ? item.tier : meta.tier,
      badgeId: cleanSpokenText(item.badgeId || item.labelId || meta.badgeId).slice(0, 40) || meta.badgeId,
      badgeTh: cleanSpokenText(item.badgeTh || item.labelTh || meta.badgeTh).slice(0, 40) || meta.badgeTh,
      text,
      pronunciation: cleanSpokenText(item.pronunciation || item.phonetic || '').slice(0, 260),
      hintId: cleanSpokenText(item.hintId || item.translationId || item.meaningId || '').slice(0, 260),
      hintTh: cleanSpokenText(item.hintTh || item.translationTh || item.meaningTh || '').slice(0, 260),
      isRealtimeAi: true,
    });
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
  const timer = setTimeout(() => controller.abort(), 9500);
  try {
    const res = await fetch(
      `${GOOGLE_GEN_API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature,
            maxOutputTokens,
            thinkingConfig: { thinkingLevel: 'MINIMAL' },
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);

    if (res.status === 429) {
      _cooldownMap.set(key, Date.now() + 65000);
      return { ok: false, reason: `HTTP 429 (${model})` };
    }
    if (!res.ok) {
      if (res.status !== 404) {
        _cooldownMap.set(key, Date.now() + 15000);
      }
      return { ok: false, reason: `HTTP ${res.status} (${model})` };
    }

    const data = await res.json().catch(() => null);
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) {
      return { ok: false, reason: 'empty_candidate' };
    }
    const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanedJson);
    _cooldownMap.delete(key);
    return { ok: true, parsed: Array.isArray(parsed) ? parsed[0] : parsed, model };
  } catch (err) {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
    return { ok: false, reason: err?.message || 'fetch_error' };
  }
}

async function runGeminiJsonWithPool(keys, promptText, temperature = 0.5, maxOutputTokens = 700) {
  const now = Date.now();
  const totalKeys = keys.length;
  const healthyKeys = [];
  for (let i = 0; i < totalKeys; i++) {
    const idx = (_poolIndex + i) % totalKeys;
    const k = keys[idx];
    if (now >= (_cooldownMap.get(k) || 0)) {
      healthyKeys.push(k);
    }
  }
  const activePool = healthyKeys.length > 0 ? healthyKeys : keys;
  _poolIndex = (_poolIndex + 1) % totalKeys;

  const raceAbort = new AbortController();
  let lastReason = 'unknown';

  // Hedged Dual-Key Execution:
  // Primary fires immediately on gemini-3.1-flash-lite (~1.4s-2.3s).
  // If primary takes >1900ms or fails early, hedged backup fires on key #2 with gemini-flash-lite-latest.
  const keyPrimary = activePool[0];
  const keyHedge = activePool[1 % activePool.length];
  let hedgeTimer = null;

  const hedgeResult = await new Promise((resolve) => {
    let settled = false;
    let pending = 1;
    let hedgeStarted = false;

    const finishSuccess = (winner) => {
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
      invokeSingleGeminiJson({
        key: keyHedge,
        model: COPILOT_MODELS[1],
        promptText,
        temperature,
        maxOutputTokens,
        parentSignal: raceAbort.signal,
      }).then((resB) => {
        if (resB.ok) {
          finishSuccess(resB);
        } else {
          lastReason = resB.reason || lastReason;
          pending -= 1;
          if (pending === 0 && !settled) {
            settled = true;
            resolve(null);
          }
        }
      });
    };

    hedgeTimer = setTimeout(startHedge, 1900);

    invokeSingleGeminiJson({
      key: keyPrimary,
      model: COPILOT_MODELS[0],
      promptText,
      temperature,
      maxOutputTokens,
      parentSignal: raceAbort.signal,
    }).then((resA) => {
      if (resA.ok) {
        finishSuccess(resA);
      } else {
        lastReason = resA.reason || lastReason;
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

  if (hedgeResult && hedgeResult.ok) {
    return hedgeResult;
  }

  // Final safety fallback on key #3
  const keyFallback = activePool[2 % activePool.length];
  const finalRes = await invokeSingleGeminiJson({
    key: keyFallback,
    model: COPILOT_MODELS[2],
    promptText,
    temperature,
    maxOutputTokens,
  });
  if (finalRes.ok) {
    return finalRes;
  }
  return { ok: false, reason: finalRes.reason || lastReason };
}

/**
 * Handler POST /api/voice/copilot-assist
 * Menghasilkan 3 opsi bantuan jawaban lisan secara REALTIME (bukan template)
 * yang menjawab langsung ucapan terbaru Partner AI + konteks percakapan.
 */
export async function routeVoiceCopilotAssist(ctx) {
  const keys = parseKeys(ctx.env);
  if (!keys.length) {
    return jsonResponse({ ok: false, fallback: true, error: 'no_keys_configured' }, { status: 503 });
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const targetLang = body.targetLang === 'ja' ? 'ja' : 'en';
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

  const langSpec =
    targetLang === 'ja'
      ? 'Japanese (natural spoken N5-N3, Kanji+Hiragana, NO emojis; "pronunciation" = word-spaced Hepburn Romaji)'
      : 'English (natural spoken A2-B1, NO emojis; "pronunciation" = easy Indonesian phonetic guide)';

  const prompt = [
    `Live Two-Way Call Copilot (${scenarioTitle}). Language: ${langSpec}`,
    historyLines.length
      ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
      : '',
    lastUserText ? `Learner previously said: "${lastUserText}"` : '',
    `Partner AI JUST SAID: "${aiText}"`,
    excludeList.length
      ? `Do NOT repeat these previous options: ${JSON.stringify(excludeList)}. Give 3 fresh angles.`
      : '',
    `Generate 3 natural spoken replies that directly answer "${aiText}" (NEVER unrelated textbook templates): easy=1 short easy sentence, mission=natural reply with specific detail, rescue=reply + friendly follow-up question back. Translate "${aiText}" literally into aiMeaningId (Indonesian) & aiMeaningTh (Thai), and write the direct literal first-person translation of each reply in hintId & hintTh (never a meta-description like "Menjawab...").`,
    `JSON only: {"aiMeaningId":"...","aiMeaningTh":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."},{"tier":"mission","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."}]}`,
  ]
    .filter(Boolean)
    .join('\n');

  const temp = variationSeed > 0 || excludeList.length > 0 ? 0.75 : 0.45;
  const gen = await runGeminiJsonWithPool(keys, prompt, temp, 2048);
  if (!gen.ok || !gen.parsed) {
    return jsonResponse({ ok: false, fallback: true, reason: gen.reason }, { status: 503 });
  }

  const replies = normalizeCopilotReplies(gen.parsed.replies, targetLang);
  if (!replies.length) {
    return jsonResponse({ ok: false, fallback: true, reason: 'invalid_replies' }, { status: 503 });
  }

  return jsonResponse({
    ok: true,
    source: 'ai-realtime',
    model: gen.model,
    aiMeaningId: cleanSpokenText(gen.parsed.aiMeaningId || ''),
    aiMeaningTh: cleanSpokenText(gen.parsed.aiMeaningTh || ''),
    replies,
    suggestions: replies,
  });
}

/**
 * Handler POST /api/voice/partner-turn
 * Menghasilkan balasan lisan Partner AI SEKALIGUS 3 opsi Copilot Jawaban AI Realtime
 * dalam 1 panggilan tunggal berlatensi rendah.
 */
export async function routeVoicePartnerTurn(ctx) {
  const keys = parseKeys(ctx.env);
  if (!keys.length) {
    return jsonResponse({ ok: false, fallback: true, error: 'no_keys_configured' }, { status: 503 });
  }

  const readRes = (await readJsonFromCtx(ctx).catch(() => null)) || {};
  const body = readRes?.value || {};
  const targetLang = body.targetLang === 'ja' ? 'ja' : 'en';
  const userText = cleanSpokenText(body.text || '').slice(0, 400);
  if (!userText) {
    return badRequest('empty_user_text');
  }

  const personaName = cleanSpokenText(body.personaName || (targetLang === 'ja' ? 'Nanami' : 'Alex')).slice(0, 40);
  const scenarioTitle = cleanSpokenText(body.scenarioTitle || 'Free Talk').slice(0, 100);
  const historyLines = normalizeHistory(body.history);

  const langSpec =
    targetLang === 'ja'
      ? 'Japanese (warm natural N5-N3, Kanji+Hiragana, NO emojis; reply "pronunciation" = word-spaced Hepburn Romaji)'
      : 'English (warm natural spoken A2-B1, NO emojis; reply "pronunciation" = easy Indonesian phonetic guide)';

  const prompt = [
    `You are ${personaName} on a live call (${scenarioTitle}). Language: ${langSpec}`,
    historyLines.length
      ? `Context:\n${historyLines.map((h) => `- ${h.speaker}: "${h.text}"`).join('\n')}`
      : '',
    `Learner JUST SAID: "${userText}"`,
    `1) "aiReply": Reply naturally as ${personaName} in 1-2 short spoken sentences (max 20 words) reacting directly to "${userText}" + a follow-up question on the same topic (no emojis). Translate into aiReplyTranslationId (Indonesian) & aiReplyTranslationTh (Thai).`,
    `2) "replies": 3 natural spoken replies the learner can say NEXT to directly answer your new "aiReply" (easy=short, mission=with detail, rescue=answer+question back; NEVER unrelated templates).`,
    `JSON only: {"aiReply":"...","aiReplyTranslationId":"...","aiReplyTranslationTh":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."},{"tier":"mission","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."},{"tier":"rescue","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."}]}`,
  ]
    .filter(Boolean)
    .join('\n');

  const gen = await runGeminiJsonWithPool(keys, prompt, 0.55, 2048);
  if (!gen.ok || !gen.parsed) {
    return jsonResponse({ ok: false, fallback: true, reason: gen.reason }, { status: 503 });
  }

  const aiReply = cleanSpokenText(gen.parsed.aiReply || '');
  if (!looksLikeTargetLang(aiReply, targetLang)) {
    return jsonResponse({ ok: false, fallback: true, reason: 'invalid_ai_reply' }, { status: 503 });
  }

  const replies = normalizeCopilotReplies(gen.parsed.replies, targetLang);

  return jsonResponse({
    ok: true,
    source: 'ai-realtime',
    model: gen.model,
    aiReply,
    aiReplyTranslationId: cleanSpokenText(gen.parsed.aiReplyTranslationId || ''),
    aiReplyTranslationTh: cleanSpokenText(gen.parsed.aiReplyTranslationTh || ''),
    replies,
  });
}

export const ROUTES = [
  ['POST', '/api/voice/live-session', routeVoiceLiveSession],
  ['POST', '/api/voice/report-drop', routeVoiceReportDrop],
  ['POST', '/api/voice/copilot-assist', routeVoiceCopilotAssist],
  ['POST', '/api/voice/partner-turn', routeVoicePartnerTurn],
];
