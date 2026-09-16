/**
 * workers/sentinel/index.mjs — GHOST SENTINEL v2 Cloud Backend
 *
 * Menggantikan ketergantungan pada server lokal (PC selalu menyala).
 * Tracker di HP langsung lapor ke Worker ini — owner bisa cek dari HP mana pun.
 *
 * ============================================================
 * MODEL KEAMANAN
 * ============================================================
 * - deviceId     : UUID acak (tertanam di URL tracker — aman dibagikan via QR)
 * - ownerToken   : 32-byte hex acak (HANYA diketahui owner — tidak pernah di URL tracker)
 * - Tracker      : hanya bisa POST beacon — tidak bisa membaca data
 * - Dashboard    : harus menyertakan ownerToken untuk baca/perintah
 * - Foto         : base64 thumbnail (max 80 kB setelah kompresi) — disimpan di KV bersama beacon
 *
 * ============================================================
 * RUTE
 * ============================================================
 * POST /api/register              → daftarkan perangkat baru → {deviceId, ownerToken, trackerUrl}
 * POST /api/beacon/{deviceId}     → terima data GPS/foto dari tracker (tanpa auth)
 * GET  /api/data/{deviceId}       → ambil semua data (header X-Owner-Token wajib)
 * POST /api/command/{deviceId}    → kirim perintah ke tracker (X-Owner-Token wajib)
 * GET  /api/cmd/{deviceId}        → ambil antrian perintah (dipanggil tracker, tanpa auth)
 * DELETE /api/device/{deviceId}   → hapus semua data (X-Owner-Token wajib)
 *
 * KV schema:
 *   dev:{deviceId}     → { ownerHash, name, createdAt }
 *   bkn:{deviceId}     → JSON array beacon (maks 200 entry)
 *   cmd:{deviceId}     → JSON array perintah pending
 */

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://fiezel.my.id',
  'https://sentinel.fiezel.my.id',
  'http://localhost:5050',
  'http://127.0.0.1:5050',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Token, X-Device-Id',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

function err(msg, status = 400, origin = '') {
  return json({ ok: false, error: msg }, status, origin);
}

// ── CRYPTO HELPER ─────────────────────────────────────────────────────────────
async function hashToken(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function genToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function genDeviceId() {
  // Format: XXXX-XXXX-XXXX (readable, URL-safe)
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

// ── BEACON HELPERS ─────────────────────────────────────────────────────────────
const MAX_BEACONS = 200;
const MAX_PHOTO_B64 = 120_000;  // ~90 kB base64 → cukup untuk thumbnail 480×640 JPEG 60%

async function readBeacons(kv, deviceId) {
  const raw = await kv.get(`bkn:${deviceId}`);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function pushBeacon(kv, deviceId, beacon) {
  const list = await readBeacons(kv, deviceId);
  list.unshift(beacon);
  if (list.length > MAX_BEACONS) list.length = MAX_BEACONS;
  await kv.put(`bkn:${deviceId}`, JSON.stringify(list), { expirationTtl: 60 * 86400 }); // 60 hari
}

async function readCmds(kv, deviceId) {
  const raw = await kv.get(`cmd:${deviceId}`);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function pushCmd(kv, deviceId, cmd) {
  const list = await readCmds(kv, deviceId);
  list.push({ ...cmd, ts: Date.now() });
  if (list.length > 10) list.length = 10;
  await kv.put(`cmd:${deviceId}`, JSON.stringify(list));
}

async function clearCmds(kv, deviceId) {
  await kv.put(`cmd:${deviceId}`, '[]');
}

// ── RATE LIMITER (sederhana, per IP, in-memory per isolate) ───────────────────
const RL = new Map();   // ip → { count, reset }
const RL_MAX = 60;      // 60 req / menit per IP
const RL_WINDOW = 60_000;

function rateCheck(ip) {
  const now = Date.now();
  let entry = RL.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 1, reset: now + RL_WINDOW };
    RL.set(ip, entry);
    return true;
  }
  entry.count++;
  return entry.count <= RL_MAX;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!rateCheck(ip)) {
      return err('Rate limit exceeded. Coba lagi dalam 1 menit.', 429, origin);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── POST /api/register ───────────────────────────────────────────────────
    if (path === '/api/register' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { body = {}; }

      const name = String(body.name || 'Perangkat Saya').slice(0, 60);
      const deviceId = genDeviceId();
      const ownerToken = genToken(32);
      const ownerHash = await hashToken(ownerToken);

      await env.SENTINEL_KV.put(`dev:${deviceId}`, JSON.stringify({
        ownerHash,
        name,
        createdAt: Date.now(),
      }), { expirationTtl: 365 * 86400 }); // 1 tahun

      const siteUrl = `https://fiezel.my.id/sentinel`;

      return json({
        ok: true,
        deviceId,
        ownerToken,
        trackerUrl: `${siteUrl}/track.html?d=${deviceId}`,
        dashboardUrl: `${siteUrl}/app.html`,
        instructions: [
          '1. Simpan ownerToken di tempat yang aman — tidak bisa dipulihkan jika hilang.',
          '2. Buka trackerUrl di HP yang ingin dilindungi, lalu tambahkan ke Home Screen.',
          '3. Buka dashboardUrl dari browser mana pun untuk memantau perangkat.',
        ],
      }, 201, origin);
    }

    // ── POST /api/beacon/{deviceId} ──────────────────────────────────────────
    const beaconMatch = path.match(/^\/api\/beacon\/([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/);
    if (beaconMatch && request.method === 'POST') {
      const deviceId = beaconMatch[1];
      const dev = await env.SENTINEL_KV.get(`dev:${deviceId}`);
      if (!dev) return err('Perangkat tidak ditemukan.', 404, origin);

      let body;
      try { body = await request.json(); } catch { return err('Body tidak valid.', 400, origin); }

      // Validasi & sanitasi foto
      let photo = null;
      if (body.photo && typeof body.photo === 'string') {
        const trimmed = body.photo.substring(0, MAX_PHOTO_B64 + 100);
        if (trimmed.startsWith('data:image/')) {
          photo = trimmed.substring(0, MAX_PHOTO_B64);
        }
      }

      const beacon = {
        ts: Date.now(),
        lat: typeof body.lat === 'number' ? body.lat : null,
        lon: typeof body.lon === 'number' ? body.lon : null,
        accuracy: typeof body.accuracy === 'number' ? Math.round(body.accuracy) : null,
        battery: typeof body.battery === 'number' ? body.battery : null,
        charging: body.charging === true,
        network: body.network ? String(body.network).slice(0, 30) : null,
        userAgent: request.headers.get('User-Agent') || null,
        ip: ip === 'unknown' ? null : ip,
        photo,
        environment: body.environment ? String(body.environment).substring(0, MAX_PHOTO_B64) : null,
        selfie: body.selfie ? String(body.selfie).substring(0, MAX_PHOTO_B64) : null,
        alert: body.alert === true,
        alertReason: body.alertReason ? String(body.alertReason).slice(0, 80) : null,
      };

      await pushBeacon(env.SENTINEL_KV, deviceId, beacon);

      // Ambil perintah pending untuk dikembalikan ke tracker
      const cmds = await readCmds(env.SENTINEL_KV, deviceId);
      if (cmds.length > 0) await clearCmds(env.SENTINEL_KV, deviceId);

      return json({ ok: true, commands: cmds }, 200, origin);
    }

    // ── GET /api/cmd/{deviceId} — dipolling tracker ──────────────────────────
    const cmdPollMatch = path.match(/^\/api\/cmd\/([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/);
    if (cmdPollMatch && request.method === 'GET') {
      const deviceId = cmdPollMatch[1];
      const dev = await env.SENTINEL_KV.get(`dev:${deviceId}`);
      if (!dev) return err('Perangkat tidak ditemukan.', 404, origin);

      const cmds = await readCmds(env.SENTINEL_KV, deviceId);
      if (cmds.length > 0) await clearCmds(env.SENTINEL_KV, deviceId);

      return json({ ok: true, commands: cmds }, 200, origin);
    }

    // ── AUTH HELPER untuk rute owner ─────────────────────────────────────────
    async function verifyOwner(deviceId) {
      const raw = await env.SENTINEL_KV.get(`dev:${deviceId}`);
      if (!raw) return null;
      const dev = JSON.parse(raw);
      const provided = request.headers.get('X-Owner-Token') || url.searchParams.get('token') || '';
      if (!provided) return null;
      const providedHash = await hashToken(provided);
      if (providedHash !== dev.ownerHash) return null;
      return dev;
    }

    // ── GET /api/data/{deviceId} ─────────────────────────────────────────────
    const dataMatch = path.match(/^\/api\/data\/([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/);
    if (dataMatch && request.method === 'GET') {
      const deviceId = dataMatch[1];
      const dev = await verifyOwner(deviceId);
      if (!dev) return err('Tidak terautentikasi.', 401, origin);

      const beacons = await readBeacons(env.SENTINEL_KV, deviceId);

      return json({
        ok: true,
        device: { name: dev.name, createdAt: dev.createdAt, deviceId },
        beacons,
        totalBeacons: beacons.length,
        lastSeen: beacons.length > 0 ? beacons[0].ts : null,
      }, 200, origin);
    }

    // ── POST /api/command/{deviceId} ─────────────────────────────────────────
    const cmdMatch = path.match(/^\/api\/command\/([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/);
    if (cmdMatch && request.method === 'POST') {
      const deviceId = cmdMatch[1];
      const dev = await verifyOwner(deviceId);
      if (!dev) return err('Tidak terautentikasi.', 401, origin);

      let body;
      try { body = await request.json(); } catch { return err('Body tidak valid.', 400, origin); }

      const VALID_CMDS = ['chime', 'photo', 'selfie', 'environment', 'alarm', 'lock_msg'];
      if (!VALID_CMDS.includes(body.type)) {
        return err(`Perintah tidak dikenal. Gunakan: ${VALID_CMDS.join(', ')}`, 400, origin);
      }

      const cmd = { type: body.type };
      if (body.type === 'lock_msg' && body.message) {
        cmd.message = String(body.message).slice(0, 200);
      }

      await pushCmd(env.SENTINEL_KV, deviceId, cmd);
      return json({ ok: true, queued: cmd }, 200, origin);
    }

    // ── DELETE /api/device/{deviceId} ────────────────────────────────────────
    const delMatch = path.match(/^\/api\/device\/([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/);
    if (delMatch && request.method === 'DELETE') {
      const deviceId = delMatch[1];
      const dev = await verifyOwner(deviceId);
      if (!dev) return err('Tidak terautentikasi.', 401, origin);

      await env.SENTINEL_KV.delete(`dev:${deviceId}`);
      await env.SENTINEL_KV.delete(`bkn:${deviceId}`);
      await env.SENTINEL_KV.delete(`cmd:${deviceId}`);

      return json({ ok: true, message: 'Semua data perangkat dihapus.' }, 200, origin);
    }

    // ── GET /health ───────────────────────────────────────────────────────────
    if (path === '/health' || path === '/api/health') {
      return json({ ok: true, service: 'ghost-sentinel-v2', ts: Date.now() }, 200, origin);
    }

    return err('Rute tidak ditemukan.', 404, origin);
  },
};
