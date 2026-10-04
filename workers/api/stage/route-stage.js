/**
 * workers/api/stage/route-stage.js — SLOT 13: Panggung Suara Live (signaling WebRTC).
 *
 * Rute yang dilayani:
 * - POST /api/stage/create -> Membuat ruang siaran baru
 * - POST /api/stage/join   -> Bergabung ke ruang siaran
 * - POST /api/stage/signal -> Mengirim sinyal SDP Offer/Answer/ICE
 * - GET  /api/stage/poll   -> Mengambil sinyal antrean (polling ringan)
 * - POST /api/stage/state  -> Sinkronisasi status game antar peer
 * - POST /api/stage/leave  -> Keluar dari ruang siaran
 *
 * ==========================================================================
 * KONTRAK YANG DIWARISI (pola SLOT 7 sosial)
 * ==========================================================================
 *  - Identitas SELALU dari `ctx.identity.sub` (cookie fz_id ber HMAC lewat
 *    mw-identity). TIDAK PERNAH dari body/query/header.
 *  - CORS memakai `ctx.corsHeaders` (allowlist eksplisit + Vary: Origin), BUKAN
 *    `Access-Control-Allow-Origin: *`: API berkredensial tidak boleh memantulkan
 *    origin apa pun.
 *  - Cap byte per path terdaftar di `schema.js` BYTE_LIMITS.
 *  - Gerbang flag FAIL-CLOSED lewat mesin `featureAllowedFrom` yang SAMA dengan
 *    AI/TTS/sosial: FEATURE_STAGE='on' + KV enabled.stage=true +
 *    flags.cfStageEnabled=true. Tiga sakelar AND; satu mati = tolak.
 *
 * ==========================================================================
 * URUTAN PENOLAKAN (401 sebelum 403, selaras wrapMetered)
 * ==========================================================================
 *   identitas (401) -> flag stage (403, fail-closed) -> validasi body (400) -> logika.
 *
 * ==========================================================================
 * PENYIMPANAN: IN MEMORY, TIDAK PERSISTEN
 * ==========================================================================
 *   Ruang siaran hanya hidup selama handshake P2P berlangsung (detik sampai
 *   menit). Tidak ada progres belajar yang disimpan di sini, jadi tidak ada
 *   langkah DB (503): `StageSignalingCore` adalah Map transien per isolat,
 *   persis pola paket sumbernya. Satu isolat Worker melayani kedua peer biasanya;
 *   bila tidak, ruang dibersihkan TTL 30 menit dan klien jatuh ke BroadcastChannel
 *   lokal tab.
 *
 * Catatan naskah: seluruh teks Indonesia di berkas ini sengaja TANPA tanda hubung.
 */

import { jsonResponse, jsonError, unauthenticated, ERR } from '../errors.js';
import { readJsonFromCtx } from '../mw-guard.js';
import { validateShape } from '../schema.js';
import { readServerFlags, featureAllowedFrom } from '../feature-gate.js';
import { stageSignalingCoreInstance } from './stage-signaling-core.js';

/**
 * Spesifikasi gerbang flag fitur panggung, dieksekusi `featureAllowedFrom()`
 * (feature-gate.js) dengan baris tabel ini, BUKAN mesin keputusan baru.
 */
export const STAGE_FEATURE_SPEC = Object.freeze({
  name: 'stage',
  varName: 'FEATURE_STAGE',
  killKey: 'stage',
  flagKey: 'cfStageEnabled',
  reasons: Object.freeze({
    featureVarOff: 'stage_feature_var_off',
    flagsUnreadable: 'stage_flags_unreadable',
    killSwitch: 'stage_kill_switch',
    flagOff: 'stage_flag_off'
  })
});

const ROOM_ID_PATTERN = /^FZ-[2-9A-HJ-NP-Z]{4}$/;
const ROLES = Object.freeze(['speaker', 'audience']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function corsOpt(ctx) {
  return { headers: ctx.corsHeaders };
}

/**
 * Gerbang berlapis untuk SEMUA rute panggung. Mengembalikan `{deny:Response}`
 * ATAU `{opt}` siap pakai. Urutan 401 -> 403 dijelaskan di kepala berkas.
 */
async function stageGate(ctx) {
  const opt = corsOpt(ctx);
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return { deny: unauthenticated(opt) };
  }
  const snapshot = await readServerFlags(ctx.env);
  const verdict = featureAllowedFrom(ctx.env, snapshot, STAGE_FEATURE_SPEC);
  if (!verdict.allowed) {
    // Satu bentuk 403 untuk semua sebab flag; sebab spesifik hanya untuk log.
    return { deny: jsonError(403, ERR.STAGE_DISABLED, {}, opt) };
  }
  return { opt };
}

/* ========================================================== skema ================== */

const SCHEMA_CREATE = {
  allow: {
    hostName: { type: 'string', max: 24 },
    hostHandle: { type: 'string', max: 24 },
    title: { type: 'string', max: 40 }
  }
};

const SCHEMA_JOIN = {
  allow: {
    roomId: { type: 'string', max: 8, required: true },
    peerName: { type: 'string', max: 24 },
    role: { type: 'string', max: 16 }
  }
};

const SCHEMA_LEAVE = {
  allow: {
    roomId: { type: 'string', max: 8, required: true },
    peerId: { type: 'string', max: 64, required: true }
  }
};

const SCHEMA_HAND_RAISE = {
  allow: {
    roomId: { type: 'string', max: 8, required: true },
    peerId: { type: 'string', max: 64, required: true },
    peerName: { type: 'string', max: 24 }
  }
};

const SCHEMA_HAND_DECIDE = {
  allow: {
    roomId: { type: 'string', max: 8, required: true },
    hostPeerId: { type: 'string', max: 64, required: true },
    targetPeerId: { type: 'string', max: 64, required: true },
    action: { type: 'string', max: 16, required: true }
  }
};

const SCHEMA_SPEAKER_DEMOTE = {
  allow: {
    roomId: { type: 'string', max: 8, required: true },
    hostPeerId: { type: 'string', max: 64, required: true },
    targetPeerId: { type: 'string', max: 64, required: true }
  }
};

const SCHEMA_STAGE_INVITE = {
  allow: {
    toHandle: { type: 'string', max: 24, required: true },
    fromHandle: { type: 'string', max: 24 },
    fromName: { type: 'string', max: 24 },
    roomId: { type: 'string', max: 8, required: true },
    title: { type: 'string', max: 40 }
  }
};

/** Objek bersarang divalidasi manual: `validateShape` hanya mengenal tipe primitif. */
function signalProblem(body) {
  if (!isPlainObject(body)) return 'body';
  if (typeof body.roomId !== 'string' || !body.roomId) return 'roomId';
  if (typeof body.fromPeerId !== 'string' || !body.fromPeerId) return 'fromPeerId';
  if (typeof body.toPeerId !== 'string' || !body.toPeerId) return 'toPeerId';
  if (!isPlainObject(body.signal)) return 'signal';
  return null;
}

function stateProblem(body) {
  if (!isPlainObject(body)) return 'body';
  if (typeof body.roomId !== 'string' || !body.roomId) return 'roomId';
  if (typeof body.fromPeerId !== 'string' || !body.fromPeerId) return 'fromPeerId';
  if (!isPlainObject(body.stateUpdate)) return 'stateUpdate';
  return null;
}

/* ========================================================== handler ================ */

async function routeCreate(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_CREATE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.createRoom({
    hostName: shape.value.hostName || 'Host',
    hostHandle: shape.value.hostHandle || '',
    title: shape.value.title || 'Sarang Suara Live'
  });
  return jsonResponse(res, gate.opt);
}

async function routeJoin(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_JOIN);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const roomId = String(shape.value.roomId).toUpperCase();
  if (!ROOM_ID_PATTERN.test(roomId)) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const role = shape.value.role === undefined ? 'speaker' : String(shape.value.role);
  if (ROLES.indexOf(role) < 0) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.joinRoom({
    roomId,
    peerName: shape.value.peerName || 'Teman',
    role
  });
  return jsonResponse(res, { ...gate.opt, status: res.ok ? 200 : 404 });
}

async function routeSignal(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  if (signalProblem(body.value)) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.sendSignal({
    roomId: body.value.roomId,
    fromPeerId: body.value.fromPeerId,
    toPeerId: body.value.toPeerId,
    signal: body.value.signal
  });
  return jsonResponse(res, { ...gate.opt, status: res.ok ? 200 : 400 });
}

async function routePoll(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const roomId = ctx.url && ctx.url.searchParams ? ctx.url.searchParams.get('roomId') : null;
  const peerId = ctx.url && ctx.url.searchParams ? ctx.url.searchParams.get('peerId') : null;
  if (!roomId || !peerId) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.pollSignals({ roomId, peerId });
  return jsonResponse(res, gate.opt);
}

async function routeState(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  if (stateProblem(body.value)) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.updateState({
    roomId: body.value.roomId,
    fromPeerId: body.value.fromPeerId,
    stateUpdate: body.value.stateUpdate
  });
  return jsonResponse(res, gate.opt);
}

async function routeLeave(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_LEAVE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  stageSignalingCoreInstance.leaveRoom({
    roomId: shape.value.roomId,
    peerId: shape.value.peerId
  });
  return jsonResponse({ ok: true }, gate.opt);
}

async function routeHandRaise(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_HAND_RAISE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.raiseHand({
    roomId: shape.value.roomId,
    peerId: shape.value.peerId,
    peerName: shape.value.peerName
  });
  return jsonResponse(res, { ...gate.opt, status: res.ok ? 200 : 400 });
}

async function routeHandDecide(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_HAND_DECIDE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.decideHand({
    roomId: shape.value.roomId,
    hostPeerId: shape.value.hostPeerId,
    targetPeerId: shape.value.targetPeerId,
    action: shape.value.action
  });
  return jsonResponse(res, { ...gate.opt, status: res.ok ? 200 : 400 });
}

async function routeSpeakerDemote(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_SPEAKER_DEMOTE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.demoteSpeaker({
    roomId: shape.value.roomId,
    hostPeerId: shape.value.hostPeerId,
    targetPeerId: shape.value.targetPeerId
  });
  return jsonResponse(res, { ...gate.opt, status: res.ok ? 200 : 400 });
}

async function routeStageInvite(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_STAGE_INVITE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const res = stageSignalingCoreInstance.sendStageInvite({
    toHandle: shape.value.toHandle,
    fromHandle: shape.value.fromHandle,
    fromName: shape.value.fromName,
    roomId: shape.value.roomId,
    title: shape.value.title
  });
  return jsonResponse(res, { ...gate.opt, status: res.ok ? 200 : 400 });
}

async function routeStageInvites(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;
  const handle = ctx.url && ctx.url.searchParams ? ctx.url.searchParams.get('handle') : null;

  const res = stageSignalingCoreInstance.getStageInvites({ handle });
  return jsonResponse(res, gate.opt);
}

async function routeStageActive(ctx) {
  const gate = await stageGate(ctx);
  if (gate.deny) return gate.deny;

  const res = stageSignalingCoreInstance.getActiveStages();
  return jsonResponse(res, gate.opt);
}

/* ========================================================== pendaftaran rute ====== */

export const ROUTES = [
  ['POST', '/api/stage/create', routeCreate],
  ['POST', '/api/stage/join', routeJoin],
  ['POST', '/api/stage/signal', routeSignal],
  ['GET', '/api/stage/poll', routePoll],
  ['POST', '/api/stage/state', routeState],
  ['POST', '/api/stage/leave', routeLeave],
  ['POST', '/api/stage/hand/raise', routeHandRaise],
  ['POST', '/api/stage/hand/decide', routeHandDecide],
  ['POST', '/api/stage/speaker/demote', routeSpeakerDemote],
  ['POST', '/api/stage/invite', routeStageInvite],
  ['GET', '/api/stage/invites', routeStageInvites],
  ['GET', '/api/stage/active', routeStageActive]
];
