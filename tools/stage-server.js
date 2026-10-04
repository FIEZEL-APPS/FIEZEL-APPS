/**
 * tools/stage-server.js
 * Server Lokal Mandiri untuk Signaling WebRTC & Penyajian Panggung Suara Live.
 *
 * Nol dependensi eksternal (Node.js murni http/fs/path/os).
 * Menjalankan server HTTP pada port 8787 untuk:
 * 1. Endpoint Signaling WebRTC (/api/stage/*)
 * 2. Static File Server untuk file preview, css, js, json, audio
 *
 * Jalankan:
 *   node tools/stage-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Muat mesin inti signaling
const corePath = path.join(__dirname, '../workers/api/stage/stage-signaling-core.js');
const { StageSignalingCore } = require(corePath);
const signaling = new StageSignalingCore();

const PORT = process.env.PORT || 8787;
const REPO_ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // --- API Signaling Routes ---
  if (pathname === '/api/stage/create' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const result = signaling.createRoom({
      hostName: body.hostName || 'Host',
      title: body.title || 'Sarang Suara Live'
    });
    return sendJson(res, result);
  }

  if (pathname === '/api/stage/join' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId) return sendJson(res, { ok: false, error: 'missing_room_id' }, 400);
    const result = signaling.joinRoom({
      roomId: body.roomId,
      peerName: body.peerName || 'Teman',
      role: body.role || 'speaker'
    });
    return sendJson(res, result, result.ok ? 200 : 404);
  }

  if (pathname === '/api/stage/signal' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId || !body.fromPeerId || !body.toPeerId || !body.signal) {
      return sendJson(res, { ok: false, error: 'invalid_signal_payload' }, 400);
    }
    const result = signaling.sendSignal({
      roomId: body.roomId,
      fromPeerId: body.fromPeerId,
      toPeerId: body.toPeerId,
      signal: body.signal
    });
    return sendJson(res, result, result.ok ? 200 : 400);
  }

  if (pathname === '/api/stage/poll' && req.method === 'GET') {
    const roomId = reqUrl.searchParams.get('roomId');
    const peerId = reqUrl.searchParams.get('peerId');
    if (!roomId || !peerId) return sendJson(res, { ok: false, error: 'missing_params' }, 400);
    const result = signaling.pollSignals({ roomId, peerId });
    return sendJson(res, result);
  }

  if (pathname === '/api/stage/state' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId || !body.fromPeerId || !body.stateUpdate) {
      return sendJson(res, { ok: false, error: 'missing_state_payload' }, 400);
    }
    const result = signaling.syncGameState({
      roomId: body.roomId,
      fromPeerId: body.fromPeerId,
      stateUpdate: body.stateUpdate
    });
    return sendJson(res, result);
  }

  if (pathname === '/api/stage/leave' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId || !body.peerId) {
      return sendJson(res, { ok: false, error: 'missing_params' }, 400);
    }
    const result = signaling.leaveRoom({
      roomId: body.roomId,
      peerId: body.peerId
    });
    return sendJson(res, result);
  }

  if (pathname === '/api/stage/hand/raise' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId || !body.peerId) {
      return sendJson(res, { ok: false, error: 'missing_params' }, 400);
    }
    const result = signaling.raiseHand({
      roomId: body.roomId,
      peerId: body.peerId,
      peerName: body.peerName || 'Penonton'
    });
    return sendJson(res, result, result.ok ? 200 : 400);
  }

  if (pathname === '/api/stage/hand/decide' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId || !body.hostPeerId || !body.targetPeerId || !body.decision) {
      return sendJson(res, { ok: false, error: 'missing_params' }, 400);
    }
    const result = signaling.decideHand({
      roomId: body.roomId,
      hostPeerId: body.hostPeerId,
      targetPeerId: body.targetPeerId,
      decision: body.decision
    });
    return sendJson(res, result, result.ok ? 200 : 400);
  }

  if (pathname === '/api/stage/speaker/demote' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.roomId || !body.hostPeerId || !body.targetPeerId) {
      return sendJson(res, { ok: false, error: 'missing_params' }, 400);
    }
    const result = signaling.demoteSpeaker({
      roomId: body.roomId,
      hostPeerId: body.hostPeerId,
      targetPeerId: body.targetPeerId
    });
    return sendJson(res, result, result.ok ? 200 : 400);
  }

  if (pathname === '/api/stage/invite' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.toHandle || !body.roomId) {
      return sendJson(res, { ok: false, error: 'missing_params' }, 400);
    }
    const result = signaling.sendStageInvite({
      fromHandle: body.fromHandle || 'anon',
      fromName: body.fromName || 'Teman',
      toHandle: body.toHandle,
      roomId: body.roomId,
      title: body.title || 'Sarang Suara Live'
    });
    return sendJson(res, result, result.ok ? 200 : 400);
  }

  if (pathname === '/api/stage/invites' && req.method === 'GET') {
    const handle = reqUrl.searchParams.get('handle');
    if (!handle) return sendJson(res, { ok: false, error: 'missing_handle' }, 400);
    const result = signaling.getStageInvites(handle);
    return sendJson(res, result);
  }

  if (pathname === '/api/stage/active' && req.method === 'GET') {
    const result = signaling.getActiveStages();
    return sendJson(res, result);
  }

  // --- Static File Handler ---
  let filePath = path.join(REPO_ROOT, pathname);
  if (pathname === '/' || pathname === '') {
    filePath = path.join(REPO_ROOT, 'mockups', 'preview-panggung-suara.html');
  }

  // Sanitasi path traversal
  if (!filePath.startsWith(REPO_ROOT)) {
    res.writeHead(403);
    return res.end('Akses ditolak');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Berkas tidak ditemukan: ' + pathname);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('============================================================');
  console.log(`🎙️  SERVER PANGGUNG SUARA LIVE FIEZEL AKTIF`);
  console.log('============================================================');
  console.log(`  Lokal PC   : http://localhost:${PORT}/mockups/preview-panggung-suara.html`);
  console.log(`  Buka di HP : http://${localIp}:${PORT}/mockups/preview-panggung-suara.html`);
  console.log(`  API Base   : http://localhost:${PORT}/api/stage`);
  console.log('============================================================');
});
