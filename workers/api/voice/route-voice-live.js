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

import { jsonResponse, jsonError, ERR } from '../errors.js';
import { readJsonFromCtx } from '../mw-guard.js';

const GOOGLE_AUTH_TOKEN_API = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';
const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
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

export const ROUTES = [
  ['POST', '/api/voice/live-session', routeVoiceLiveSession],
  ['POST', '/api/voice/report-drop', routeVoiceReportDrop],
];
