/**
 * workers/api/mw-identity.js — lapisan identitas (middleware [1] dan [2] cf-b1 §4).
 *
 * Kontrak yang ditegakkan berkas ini:
 *  1. Identitas SELALU turun dari cookie bertanda HMAC, NEVER dari body.
 *     `body.userId`, `body.class`, `body.plan` diabaikan total (bab 30:962).
 *  2. Payload cookie hanya `{v,kid,sub,iat}`. Tidak ada `class`/`plan`/`quota`
 *     di dalamnya: kalau entitlement ikut ditandatangani, setiap perubahan plan
 *     butuh penerbitan ulang dan cookie lama menjadi klaim entitlement basi.
 *  3. Cookie rusak / tanda tangan salah / `kid` tak dikenal = diperlakukan
 *     SEPERTI TIDAK ADA. Tidak ada pesan galat yang membedakannya (anti-oracle).
 *  4. `sub` tidak pernah masuk URL/query — hanya cookie, header, atau body.
 *
 * PLAN GRATIS: verifikasi cookie = 0 tulis, 0 baca D1, 0 baca KV. Penerbitan
 * identitas baru = 1 INSERT D1. Pembaruan `last_seen_day` maksimum 1× per sub
 * per hari, dan hanya pada rute yang memang sudah membaca baris identitas
 * (`/api/user/me`), supaya jalur panas tidak menambah tulis D1.
 */

import {
  hmacSign, hmacVerify, b64urlFromString, stringFromB64url,
  secretForKid, CURRENT_KID
} from './util-hmac.js';
import { COOKIE, COOKIE_PAYLOAD_KEYS, studyDayWib } from './schema.js';

/** Parser cookie minimal; tidak memakai regex rakus supaya murah di CPU. */
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    out[key] = part.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Rakit header Set-Cookie identitas.
 * `Domain` diambil dari vars supaya cookie terkirim ke fiezel.my.id DAN
 * api.fiezel.my.id (same-site). Kalau `COOKIE_DOMAIN` kosong, cookie menjadi
 * host-only — itu benar untuk pengujian lokal, salah untuk produksi, dan
 * README menyebutkannya sebagai bagian checklist deploy.
 */
export function buildCookie(name, value, maxAgeSeconds, env) {
  const bits = [
    `${name}=${value}`,
    'HttpOnly',
    'Secure',
    `SameSite=${COOKIE.SAME_SITE}`,
    `Path=${COOKIE.PATH}`,
    `Max-Age=${maxAgeSeconds}`
  ];
  if (env && env.COOKIE_DOMAIN) bits.push(`Domain=${env.COOKIE_DOMAIN}`);
  return bits.join('; ');
}

export function clearCookie(name, env) {
  return buildCookie(name, '', 0, env);
}

/** Terbitkan nilai cookie identitas bertanda untuk `sub`. */
export async function signIdentity(env, sub, nowMs) {
  const secret = secretForKid(env, CURRENT_KID);
  if (!secret) throw new Error('SESSION_HMAC_KEY_CURRENT_missing');
  const payload = { v: 1, kid: CURRENT_KID, sub, iat: Math.floor(nowMs / 1000) };
  const encoded = b64urlFromString(JSON.stringify(payload));
  const sig = await hmacSign(secret, encoded);
  return { value: `${encoded}.${sig}`, payload };
}

/**
 * Verifikasi cookie identitas.
 * @returns {{ok:true,payload:object}|{ok:false}}
 */
export async function verifyIdentity(env, raw) {
  if (typeof raw !== 'string' || raw.length < 8 || raw.length > 512) return { ok: false };
  const dot = raw.indexOf('.');
  if (dot < 1 || dot === raw.length - 1) return { ok: false };
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let payload;
  try {
    payload = JSON.parse(stringFromB64url(encoded));
  } catch {
    return { ok: false };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false };
  // Bentuk payload dikunci: kunci asing = cookie dari versi/asal yang tidak kita
  // terbitkan, dan menerimanya berarti menerima klaim yang tidak pernah didesain.
  const keys = Object.keys(payload);
  if (keys.length !== COOKIE_PAYLOAD_KEYS.length) return { ok: false };
  for (const key of keys) if (!COOKIE_PAYLOAD_KEYS.includes(key)) return { ok: false };
  if (payload.v !== 1) return { ok: false };
  if (typeof payload.sub !== 'string' || !/^[0-9a-f-]{36}$/.test(payload.sub)) return { ok: false };
  if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)) return { ok: false };
  const secret = secretForKid(env, payload.kid);
  if (!secret) return { ok: false }; // kid tak dikenal: JANGAN fallback ke current
  const ok = await hmacVerify(secret, encoded, sig);
  return ok ? { ok: true, payload } : { ok: false };
}

/**
 * Pastikan baris identitas ada di D1. `ON CONFLICT DO NOTHING` supaya dua
 * request paralel dari cookie yang sama tidak pernah menghasilkan galat unik.
 * Kelas awal SELALU 'visitor' — promosi kelas adalah keputusan server di
 * lapisan lain, tidak pernah permintaan klien.
 */
export async function ensureIdentityRow(env, sub, nowMs) {
  if (!env.CORE_DB) return; // mode degradasi: identitas tetap sah secara kripto
  await env.CORE_DB
    .prepare(
      'INSERT INTO identity (sub, created_at, last_seen_day, class, plan, kid) ' +
      "VALUES (?1, ?2, ?3, 'visitor', 'free', ?4) ON CONFLICT(sub) DO NOTHING"
    )
    .bind(sub, nowMs, studyDayWib(nowMs), CURRENT_KID)
    .run();
}

export async function readIdentityRow(env, sub) {
  if (!env.CORE_DB) return null;
  return env.CORE_DB
    .prepare(
      'SELECT sub, created_at, last_seen_day, class, plan, revoked_at ' +
      'FROM identity WHERE sub = ?1'
    )
    .bind(sub)
    .first();
}

/** Maksimum 1 tulis per sub per hari (PLAN GRATIS: hemat tulis D1). */
export async function touchLastSeen(env, sub, nowMs, currentDay) {
  const day = studyDayWib(nowMs);
  if (!env.CORE_DB || currentDay === day) return day;
  await env.CORE_DB
    .prepare('UPDATE identity SET last_seen_day = ?2 WHERE sub = ?1 AND last_seen_day <> ?2')
    .bind(sub, day)
    .run();
  return day;
}

/**
 * Middleware identitas. Tidak pernah menolak request: identitas yang tidak sah
 * diganti identitas baru, dan keputusan "boleh atau tidak" diambil rute
 * (`requireIdentity`). Ini yang membuat `/health` dan `/api/config` tetap bisa
 * dijawab tanpa cookie.
 *
 * @param {{request:Request, env:object, now:number, cookies:string[]}} ctx
 */
export async function identityMiddleware(ctx) {
  const jar = parseCookies(ctx.request.headers.get('cookie'));
  const raw = jar[COOKIE.IDENTITY];
  const verified = await verifyIdentity(ctx.env, raw);
  if (verified.ok) {
    ctx.identity = { sub: verified.payload.sub, kid: verified.payload.kid, issued: false, verified: true };
    return null;
  }
  ctx.identity = { sub: null, kid: null, issued: false, verified: false };
  ctx.identityCookiePresent = typeof raw === 'string' && raw.length > 0;
  return null;
}

/**
 * Terbitkan identitas anonim baru dan pasang cookie pada respons.
 * Dipakai `POST /api/auth/anon` dan `POST /api/auth/claim`. TIDAK dipanggil
 * otomatis pada setiap request: penerbitan identitas berarti 1 tulis D1, dan
 * request `/health` dari crawler tidak boleh membuat baris identitas.
 */
export async function issueAnonIdentity(ctx) {
  // `crypto.randomUUID()` — acak sisi SERVER. Tidak diturunkan dari IP, UA,
  // bahasa, atau apa pun yang berbau fingerprint (butuh consent; lihat cf-b2 §1.2).
  const sub = crypto.randomUUID();
  const signed = await signIdentity(ctx.env, sub, ctx.now);
  await ensureIdentityRow(ctx.env, sub, ctx.now);
  ctx.identity = { sub, kid: signed.payload.kid, issued: true, verified: true };
  ctx.cookies.push(buildCookie(COOKIE.IDENTITY, signed.value, COOKIE.MAX_AGE, ctx.env));
  return ctx.identity;
}

/** Pasang ulang cookie untuk `sub` yang SUDAH ada (dipakai jalur klaim). */
export async function attachIdentityCookie(ctx, sub) {
  const signed = await signIdentity(ctx.env, sub, ctx.now);
  ctx.identity = { sub, kid: signed.payload.kid, issued: false, verified: true };
  ctx.cookies.push(buildCookie(COOKIE.IDENTITY, signed.value, COOKIE.MAX_AGE, ctx.env));
  return ctx.identity;
}
