/**
 * workers/api/route-auth.js — `POST /api/auth/anon` dan `POST /api/auth/claim`.
 *
 * `/api/auth/anon`  : menerbitkan identitas anonim (kelas A "visitor").
 * `/api/auth/claim` : mengikat identitas ke akun Puter yang sudah login, LEWAT
 *                     TIKET HMAC yang diterbitkan Worker Puter — bukan lewat
 *                     uuid yang dikirim klien.
 *
 * KENAPA TIKET, BUKAN uuid: kalau klien boleh mengirim `{uuid}`, maka siapa pun
 * bisa mengklaim `sub` (dan kuota, dan plan) orang lain hanya dengan menebak /
 * mengetahui uuid Puter orang itu. Ini persis kelas kerentanan yang bab 30
 * (`PROMT-BARU.txt:966-975`) minta ditutup dengan memvalidasi identitas di
 * backend. Worker Cloudflare TIDAK BISA memverifikasi login Puter sendiri, jadi
 * bukti harus datang dari pihak yang bisa: Worker Puter.
 *
 * STATUS SISI PUTER: BELUM ADA. Penerbit tiket harus ditambahkan ke Worker Puter
 * (`fiezel-core-worker.js`) oleh paket kerja terpisah — berkas itu TIDAK
 * disentuh di sini. Stub terdokumentasi + kontrak byte-per-byte ada di
 * `workers/api/STUB-PUTER-CLAIM-TICKET.md`. Sampai stub itu dipasang,
 * `/api/auth/claim` akan selalu menjawab 401 `claim_invalid` — dan itu perilaku
 * yang benar untuk fitur yang belum punya penerbit, bukan bug.
 */

import {
  PROTOCOL, SCHEMA_AUTH_ANON, SCHEMA_AUTH_CLAIM, validateShape,
  CLAIM_AUDIENCE, CLAIM_TICKET_MAX_AGE_S, CLAIM_REPLAY_TTL_S
} from './schema.js';
import { jsonResponse, jsonError, unauthenticated, ERR } from './errors.js';
import { hmacVerify, stringFromB64url } from './util-hmac.js';
import {
  issueAnonIdentity, attachIdentityCookie, ensureIdentityRow, readIdentityRow
} from './mw-identity.js';
import { readJsonFromCtx } from './mw-guard.js';
import { anonIssueGate, anonJitter } from './rate-anon.js';

/* ==========================================================================
 * POST /api/auth/anon
 * ======================================================================== */

export async function routeAuthAnon(ctx) {
  // m0261-d17 (audit D3 HIGH-2): SEMUA respons rute ini diberi jitter kecil
  // (lihat rate-anon.js) supaya waktu respons tidak menjadi oracle terbit /
  // stabil / tolak, dan supaya loop pemanen identitas kehilangan ritme.
  const response = await routeAuthAnonInner(ctx);
  await anonJitter(ctx.env);
  return response;
}

async function routeAuthAnonInner(ctx) {
  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;
  // Deny-by-default: `{userId}`, `{class}`, `{plan}` dari klien = 400, bukan
  // "diabaikan". Field yang diabaikan hari ini adalah field yang terbaca kode
  // baru besok.
  const shape = validateShape(body.value, SCHEMA_AUTH_ANON);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, opt);

  let issuedNow = false;
  if (ctx.identity.verified && ctx.identity.sub) {
    // Cookie sah: identitas STABIL. Tidak ada Set-Cookie baru, tidak ada sub
    // baru. Ini invarian yang diuji gerbang: memanggil /api/auth/anon dua kali
    // dengan cookie yang sama tidak boleh menggandakan identitas (dan kuota).
    const row = await readIdentityRow(ctx.env, ctx.identity.sub);
    if (!row) await ensureIdentityRow(ctx.env, ctx.identity.sub, ctx.now);
    if (row && row.revoked_at) {
      // "Lupakan perangkat ini" sudah dipakai: terbitkan identitas baru.
      // Penerbitan (bukan panggilan ber-cookie stabil) yang dibatasi laju —
      // audit D3 HIGH-2; detail tarif & kunci di rate-anon.js.
      const limited = await anonIssueGate(ctx);
      if (limited) return limited;
      await issueAnonIdentity(ctx);
      issuedNow = true;
    }
  } else {
    const limited = await anonIssueGate(ctx);
    if (limited) return limited;
    await issueAnonIdentity(ctx);
    issuedNow = true;
  }

  return jsonResponse(
    {
      userId: ctx.identity.sub, // UUID acak sisi server, opaque, bukan PII
      plan: 'free',
      class: 'visitor',
      issued: issuedNow,
      issuedAt: new Date(ctx.now).toISOString(),
      expiresAt: new Date(ctx.now + 15552000 * 1000).toISOString(),
      serverTime: new Date(ctx.now).toISOString(),
      protocol: PROTOCOL
    },
    opt
  );
}

/* ==========================================================================
 * POST /api/auth/claim — verifikasi tiket klaim Puter
 * ======================================================================== */

/**
 * Bentuk tiket (kontrak dengan sisi Puter, cf-b2 §6.2):
 *
 *   ticket  = b64url(JSON payload) + '.' + b64url(HMAC-SHA256(payload, CLAIM_SECRET))
 *   payload = { v:1, aud:'fiezel-api', ref:<hex HMAC(uuidPuter, PEPPER)>,
 *               jti:<string acak>, iat:<epoch s>, exp:<iat+120> }
 *
 * Yang diperiksa, semuanya WAJIB:
 *   1. dua bagian, base64url, JSON objek, kunci persis seperti di atas;
 *   2. tanda tangan sah terhadap PUTER_CLAIM_SECRET_CURRENT atau _PREVIOUS
 *      (dua secret aktif = rotasi tanpa memutus klaim yang sedang berjalan);
 *   3. `aud === 'fiezel-api'` — tiket untuk audiens lain tidak berlaku di sini;
 *   4. `exp > now` DAN `exp - iat <= 120` — tiket berumur panjang yang
 *      ditandatangani benar tetap ditolak, supaya satu tiket bocor tidak
 *      menjadi kunci permanen;
 *   5. `iat` tidak di masa depan lebih dari 60 s (toleransi jam);
 *   6. anti-replay: `jti` disimpan di KV dengan TTL 300 s; `jti` yang sudah
 *      terpakai ditolak.
 *
 * Yang TIDAK PERNAH terjadi: uuid Puter mentah tidak pernah masuk Worker ini,
 * tidak masuk D1, tidak masuk log, dan `ref` tidak pernah dipantulkan ke klien.
 */
export async function verifyClaimTicket(env, ticket, nowMs) {
  if (typeof ticket !== 'string' || ticket.length < 16 || ticket.length > 1024) {
    return { ok: false, reason: 'malformed' };
  }
  const dot = ticket.indexOf('.');
  if (dot < 1 || dot === ticket.length - 1) return { ok: false, reason: 'malformed' };
  const encoded = ticket.slice(0, dot);
  const sig = ticket.slice(dot + 1);
  let payload;
  try {
    payload = JSON.parse(stringFromB64url(encoded));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'malformed' };
  }
  const allow = ['v', 'aud', 'ref', 'jti', 'iat', 'exp'];
  const keys = Object.keys(payload);
  if (keys.length !== allow.length || keys.some((k) => !allow.includes(k))) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.v !== 1) return { ok: false, reason: 'version' };
  if (payload.aud !== CLAIM_AUDIENCE) return { ok: false, reason: 'aud' };
  if (typeof payload.ref !== 'string' || !/^[0-9a-f]{32,64}$/.test(payload.ref)) {
    return { ok: false, reason: 'ref' };
  }
  if (typeof payload.jti !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(payload.jti)) {
    return { ok: false, reason: 'jti' };
  }
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'time' };
  }
  const nowS = Math.floor(nowMs / 1000);
  if (payload.exp <= nowS) return { ok: false, reason: 'expired' };
  if (payload.exp - payload.iat > CLAIM_TICKET_MAX_AGE_S) return { ok: false, reason: 'ttl_too_long' };
  if (payload.iat > nowS + 60) return { ok: false, reason: 'iat_future' };

  const secrets = [env.PUTER_CLAIM_SECRET_CURRENT, env.PUTER_CLAIM_SECRET_PREVIOUS].filter(Boolean);
  if (!secrets.length) return { ok: false, reason: 'no_secret' };
  let signatureOk = false;
  for (const secret of secrets) {
    /* eslint-disable no-await-in-loop */
    if (await hmacVerify(secret, encoded, sig)) { signatureOk = true; break; }
  }
  if (!signatureOk) return { ok: false, reason: 'signature' };

  // Anti-replay. KV cukup di sini walau eventually consistent: jendela tiket
  // hanya 120 s dan biaya replay dalam jendela itu adalah "identitas yang sama
  // diikat dua kali", bukan kebocoran. Kalau nanti terbukti butuh atomisitas
  // lebih ketat, Durable Object adalah upgrade BERBAYAR dan itu harus
  // dilaporkan ke owner lebih dulu (keputusan owner: PLAN GRATIS).
  if (env.CFG) {
    const seenKey = `claim:jti:${payload.jti}`;
    const seen = await env.CFG.get(seenKey);
    if (seen) return { ok: false, reason: 'replay' };
    await env.CFG.put(seenKey, '1', { expirationTtl: CLAIM_REPLAY_TTL_S });
  }
  return { ok: true, ref: payload.ref };
}

export async function routeAuthClaim(ctx) {
  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_AUTH_CLAIM);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, opt);

  const verdict = await verifyClaimTicket(ctx.env, body.value.ticket, ctx.now);
  if (!verdict.ok) {
    // Satu bentuk galat untuk SEMUA sebab (malformed / kedaluwarsa / aud salah /
    // replay / secret belum dipasang). Membedakannya memberi penyerang oracle
    // untuk menyetel tiket sampai lolos.
    return jsonError(401, ERR.CLAIM_INVALID, {}, opt);
  }

  // Identitas pemanggil: kalau belum ada, terbitkan lebih dulu supaya pengikatan
  // selalu punya subjek.
  if (!ctx.identity.verified || !ctx.identity.sub) await issueAnonIdentity(ctx);
  let sub = ctx.identity.sub;
  let adopted = false;

  if (ctx.env.CORE_DB) {
    const existing = await ctx.env.CORE_DB
      .prepare('SELECT sub FROM identity WHERE legacy_ref_hmac = ?1')
      .bind(verdict.ref)
      .first();
    if (existing && existing.sub && existing.sub !== sub) {
      // `ref` sudah terikat: kembalikan `sub` YANG SUDAH ADA, jangan buat baris
      // baru. Ini yang membuat murid yang membuka perangkat kedua memakai
      // identitas (dan kuota) yang sama, bukan menggandakan jatah.
      sub = existing.sub;
      await attachIdentityCookie(ctx, sub);
      adopted = true;
    } else if (!existing) {
      await ctx.env.CORE_DB
        .prepare(
          "UPDATE identity SET legacy_ref_hmac = ?2, class = 'auth', account_id = ?3 " +
          'WHERE sub = ?1 AND legacy_ref_hmac IS NULL'
        )
        .bind(sub, verdict.ref, `p:${verdict.ref}`)
        .run();
    }
  }

  return jsonResponse(
    {
      userId: sub,
      linked: true,
      adopted,          // true = memakai identitas lama yang sudah terikat ref
      class: 'auth',
      plan: 'free',
      serverTime: new Date(ctx.now).toISOString(),
      protocol: PROTOCOL
      // CATAT: `ref` TIDAK dipantulkan. Ia pengenal turunan akun Puter dan tidak
      // punya alasan untuk ada di respons yang bisa dibaca JS halaman.
    },
    opt
  );
}

/** Handler untuk metode yang salah pada rute auth. */
export const routeAuthUnauthenticated = (ctx) => unauthenticated({ headers: ctx.corsHeaders });
