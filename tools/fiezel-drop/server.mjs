import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5050;
const SAVE_DIR = path.join(os.homedir(), 'Downloads', 'Dari_iPhone');
const PUBLIC_DIR = path.join(__dirname, 'public');
const HELPER_EXE = path.join(__dirname, 'FiezelInputHelper.exe');

if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// --- GHOST SENTINEL (STEALTH ANTI-THEFT & REMOTE TELEMETRY) ---
const MUGSHOTS_DIR = path.join(SAVE_DIR, 'Mugshots');
if (!fs.existsSync(MUGSHOTS_DIR)) {
  fs.mkdirSync(MUGSHOTS_DIR, { recursive: true });
}
const RECORDINGS_DIR = path.join(SAVE_DIR, 'Rekaman_Layar');
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
const SCREENSHOTS_DIR = path.join(SAVE_DIR, 'Cuplikan_Layar');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
const ENVIRONMENT_DIR = path.join(SAVE_DIR, 'Lingkungan');
if (!fs.existsSync(ENVIRONMENT_DIR)) {
  fs.mkdirSync(ENVIRONMENT_DIR, { recursive: true });
}
const AUDIO_DIR = path.join(SAVE_DIR, 'Rekaman_Suara');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}
const SENTINEL_DATA_FILE = path.join(SAVE_DIR, 'sentinel_data.json');
const SENTINEL_TUNNEL_FILE = path.join(SAVE_DIR, 'sentinel_tunnel_url.txt');
const CLOUDFLARED_EXE = path.join(__dirname, 'cloudflared.exe');

let publicTunnelUrl = null;
let cloudflaredProcess = null;

let sentinelState = {
  latest: null,
  history: [],
  alerts: [],
  intercepts: [],
  devices: {},
  activeDeviceId: null,
  barkKey: '',
  lostMode: false
};

let latestScreenFrame = null;

try {
  if (fs.existsSync(SENTINEL_DATA_FILE)) {
    const raw = fs.readFileSync(SENTINEL_DATA_FILE, 'utf8');
    sentinelState = JSON.parse(raw);
    if (!Array.isArray(sentinelState.history)) sentinelState.history = [];
    if (!Array.isArray(sentinelState.alerts)) sentinelState.alerts = [];
    if (!Array.isArray(sentinelState.intercepts)) sentinelState.intercepts = [];
    if (!sentinelState.devices || typeof sentinelState.devices !== 'object') sentinelState.devices = {};
    if (typeof sentinelState.barkKey !== 'string') sentinelState.barkKey = '';
    sentinelState.lostMode = Boolean(sentinelState.lostMode);
  }
} catch (e) {
  console.error('[Sentinel] Gagal membaca data tersimpan:', e.message);
}

function saveSentinelData() {
  try {
    fs.writeFileSync(SENTINEL_DATA_FILE, JSON.stringify(sentinelState, null, 2), 'utf8');
  } catch (e) {
    console.error('[Sentinel] Gagal menyimpan data:', e.message);
  }
}

function addIntercept(item) {
  if (!item || (!item.value && !item.text)) return null;
  const val = String(item.value || item.text || '').trim();
  if (!val) return null;

  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    type: item.type || 'input',
    label: item.label || 'Data / Sandi Masuk',
    value: val,
    lat: item.lat || (sentinelState.latest ? sentinelState.latest.lat : null),
    lon: item.lon || (sentinelState.latest ? sentinelState.latest.lon : null),
    photo: item.photo || (sentinelState.latest ? sentinelState.latest.photo : null),
    timestamp: Date.now()
  };

  sentinelState.intercepts.unshift(entry);
  if (sentinelState.intercepts.length > 200) sentinelState.intercepts.pop();
  saveSentinelData();
  broadcast({ type: 'sentinel_intercept', intercept: entry });
  console.log(`[Sentinel Intercept] ⌨️ DATA BARU TEREKAM (${entry.label}): "${val.substring(0, 40)}"`);
  sendToHelper(`TEXT [DATA TEREKAM] ${entry.label.toUpperCase()}: ${val.substring(0, 30)}`);
  return entry;
}

// --- IP FORENSIK (OPERATOR & ASN LOOKUP) & KALKULASI GEODESI ---
const ipForensicsCache = new Map();

async function getIpForensics(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      isp: 'Jaringan Lokal / Wi-Fi Privat',
      org: 'Local Gateway',
      as: 'Localhost',
      city: 'Lokal',
      region: 'Lokal',
      country: 'Indonesia'
    };
  }
  if (ipForensicsCache.has(ip)) return ipForensicsCache.get(ip);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org,as,query`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const info = {
          isp: data.isp || 'Provider Publik',
          org: data.org || data.isp || '',
          as: data.as || '',
          city: data.city || '',
          region: data.regionName || '',
          country: data.country || 'Indonesia'
        };
        ipForensicsCache.set(ip, info);
        return info;
      }
    }
  } catch (e) {
    console.warn('[IP Forensics] Gagal lookup:', e.message);
  }
  return null;
}

// Hitung Jarak Geodesi (Haversine Formula dalam Meter)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- MANAJEMEN PENYIMPANAN & PEMBERSIHAN OTOMATIS (AUTO-CLEANUP QUOTA) ---
const STORAGE_CONFIG = {
  MAX_TOTAL_MB: 500,             // Kuota total folder Dari_iPhone (500 MB)
  CLEANUP_THRESHOLD_RATIO: 0.85, // Jika ruang terpakai >= 85% (425 MB), lakukan pembersihan agresif
  MAX_MUGSHOTS: 80,              // Maksimal 80 foto selfie wajah pencuri terbaru
  MAX_ENVIRONMENT: 80,            // Maksimal 80 foto lingkungan sekitar terbaru
  MAX_SCREENSHOTS: 80,           // Maksimal 80 cuplikan layar terbaru
  MAX_RECORDINGS: 25,            // Maksimal 25 file rekaman video layar terbaru
  MAX_JSON_HISTORY: 100,         // Maksimal 100 titik jejak GPS di riwayat
  MAX_JSON_INTERCEPTS: 100,      // Maksimal 100 data/PIN di riwayat intersepsi
  MAX_JSON_ALERTS: 50            // Maksimal 50 alert di log
};

function getFolderStats(dirPath) {
  if (!fs.existsSync(dirPath)) return { files: [], totalBytes: 0, count: 0 };
  try {
    const filenames = fs.readdirSync(dirPath);
    const files = [];
    let totalBytes = 0;
    for (const name of filenames) {
      const full = path.join(dirPath, name);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          totalBytes += stat.size;
          files.push({ name, full, size: stat.size, mtime: stat.mtimeMs });
        }
      } catch {}
    }
    files.sort((a, b) => a.mtime - b.mtime);
    return { files, totalBytes, count: files.length };
  } catch {
    return { files: [], totalBytes: 0, count: 0 };
  }
}

function getStorageSummary() {
  const mug = getFolderStats(MUGSHOTS_DIR);
  const env = getFolderStats(ENVIRONMENT_DIR);
  const scr = getFolderStats(SCREENSHOTS_DIR);
  const rec = getFolderStats(RECORDINGS_DIR);
  const aud = getFolderStats(AUDIO_DIR);
  const totalBytes = mug.totalBytes + env.totalBytes + scr.totalBytes + rec.totalBytes + aud.totalBytes;
  const maxBytes = STORAGE_CONFIG.MAX_TOTAL_MB * 1024 * 1024;
  return {
    usedMb: Number((totalBytes / (1024 * 1024)).toFixed(1)),
    maxMb: STORAGE_CONFIG.MAX_TOTAL_MB,
    percentUsed: Math.min(100, Math.round((totalBytes / maxBytes) * 100)),
    counts: {
      mugshots: mug.count,
      environment: env.count,
      screenshots: scr.count,
      recordings: rec.count,
      audio: aud.count
    }
  };
}

function autoCleanStorage(options = {}) {
  const force = Boolean(options.force);
  const mugshots = getFolderStats(MUGSHOTS_DIR);
  const environment = getFolderStats(ENVIRONMENT_DIR);
  const screenshots = getFolderStats(SCREENSHOTS_DIR);
  const recordings = getFolderStats(RECORDINGS_DIR);
  const audio = getFolderStats(AUDIO_DIR);

  const totalUsedBytes = mugshots.totalBytes + environment.totalBytes + screenshots.totalBytes + recordings.totalBytes + audio.totalBytes;
  const maxBytes = STORAGE_CONFIG.MAX_TOTAL_MB * 1024 * 1024;
  const thresholdBytes = maxBytes * STORAGE_CONFIG.CLEANUP_THRESHOLD_RATIO;
  const isNearMax = totalUsedBytes >= thresholdBytes;

  let deletedCount = 0;
  let freedBytes = 0;
  const deletedFiles = new Set();

  const removeOldestFiles = (statsObj, maxAllowed) => {
    while (statsObj.files.length > maxAllowed) {
      const oldest = statsObj.files.shift();
      try {
        fs.unlinkSync(oldest.full);
        deletedCount++;
        freedBytes += oldest.size;
        deletedFiles.add(oldest.name);
      } catch (e) {
        console.error('[Cleanup Error]', e.message);
      }
    }
  };

  // 1. Bersihkan file yang melebihi batas kuantitas per kategori (FIFO)
  if (screenshots.count > STORAGE_CONFIG.MAX_SCREENSHOTS) {
    removeOldestFiles(screenshots, STORAGE_CONFIG.MAX_SCREENSHOTS);
  }
  if (mugshots.count > STORAGE_CONFIG.MAX_MUGSHOTS) {
    removeOldestFiles(mugshots, STORAGE_CONFIG.MAX_MUGSHOTS);
  }
  if (environment.count > STORAGE_CONFIG.MAX_ENVIRONMENT) {
    removeOldestFiles(environment, STORAGE_CONFIG.MAX_ENVIRONMENT);
  }
  if (recordings.count > STORAGE_CONFIG.MAX_RECORDINGS) {
    removeOldestFiles(recordings, STORAGE_CONFIG.MAX_RECORDINGS);
  }

  // 2. Jika total ukuran mendekati batas maksimal (>85%) atau pembersihan dipaksa:
  let currentTotal = (getFolderStats(MUGSHOTS_DIR).totalBytes + 
                      getFolderStats(ENVIRONMENT_DIR).totalBytes + 
                      getFolderStats(SCREENSHOTS_DIR).totalBytes + 
                      getFolderStats(RECORDINGS_DIR).totalBytes);

  if (isNearMax || force || currentTotal > thresholdBytes) {
    const remainingRecordings = getFolderStats(RECORDINGS_DIR).files;
    const remainingScreenshots = getFolderStats(SCREENSHOTS_DIR).files;
    const remainingMugshots = getFolderStats(MUGSHOTS_DIR).files;
    const remainingEnvironment = getFolderStats(ENVIRONMENT_DIR).files;

    while (remainingRecordings.length > 5 && currentTotal > (maxBytes * 0.7)) {
      const f = remainingRecordings.shift();
      try {
        fs.unlinkSync(f.full);
        deletedCount++;
        freedBytes += f.size;
        currentTotal -= f.size;
        deletedFiles.add(f.name);
      } catch {}
    }

    while (remainingScreenshots.length > 20 && currentTotal > (maxBytes * 0.7)) {
      const f = remainingScreenshots.shift();
      try {
        fs.unlinkSync(f.full);
        deletedCount++;
        freedBytes += f.size;
        currentTotal -= f.size;
        deletedFiles.add(f.name);
      } catch {}
    }

    while (remainingMugshots.length > 20 && currentTotal > (maxBytes * 0.7)) {
      const f = remainingMugshots.shift();
      try {
        fs.unlinkSync(f.full);
        deletedCount++;
        freedBytes += f.size;
        currentTotal -= f.size;
        deletedFiles.add(f.name);
      } catch {}
    }

    while (remainingEnvironment.length > 20 && currentTotal > (maxBytes * 0.7)) {
      const f = remainingEnvironment.shift();
      try {
        fs.unlinkSync(f.full);
        deletedCount++;
        freedBytes += f.size;
        currentTotal -= f.size;
        deletedFiles.add(f.name);
      } catch {}
    }
  }

  // 3. Pangkas data JSON (history, intercepts, alerts)
  let jsonDirty = false;
  if (Array.isArray(sentinelState.history) && sentinelState.history.length > STORAGE_CONFIG.MAX_JSON_HISTORY) {
    sentinelState.history = sentinelState.history.slice(0, STORAGE_CONFIG.MAX_JSON_HISTORY);
    jsonDirty = true;
  }
  if (Array.isArray(sentinelState.intercepts) && sentinelState.intercepts.length > STORAGE_CONFIG.MAX_JSON_INTERCEPTS) {
    sentinelState.intercepts = sentinelState.intercepts.slice(0, STORAGE_CONFIG.MAX_JSON_INTERCEPTS);
    jsonDirty = true;
  }
  if (Array.isArray(sentinelState.alerts) && sentinelState.alerts.length > STORAGE_CONFIG.MAX_JSON_ALERTS) {
    sentinelState.alerts = sentinelState.alerts.slice(0, STORAGE_CONFIG.MAX_JSON_ALERTS);
    jsonDirty = true;
  }

  if (deletedFiles.size > 0) {
    const cleanPhotoRef = (item) => {
      if (item && item.photo) {
        for (const df of deletedFiles) {
          if (item.photo.includes(df)) {
            delete item.photo;
            jsonDirty = true;
            break;
          }
        }
      }
    };
    if (sentinelState.latest) cleanPhotoRef(sentinelState.latest);
    if (Array.isArray(sentinelState.history)) sentinelState.history.forEach(cleanPhotoRef);
    if (Array.isArray(sentinelState.intercepts)) sentinelState.intercepts.forEach(cleanPhotoRef);
  }

  if (jsonDirty) {
    saveSentinelData();
  }

  if (deletedCount > 0) {
    console.log(`[Auto-Cleanup] 🧹 Pembersihan otomatis: ${deletedCount} file lama dihapus, ${(freedBytes / (1024*1024)).toFixed(2)} MB dibebaskan.`);
  }

  const finalSummary = getStorageSummary();
  return {
    ok: true,
    deletedCount,
    freedMb: Number((freedBytes / (1024 * 1024)).toFixed(2)),
    ...finalSummary
  };
}

// Jalankan pembersihan otomatis berkala setiap 10 menit
setInterval(() => {
  try {
    autoCleanStorage();
  } catch (e) {
    console.error('[Sentinel] Auto-cleanup error:', e.message);
  }
}, 10 * 60 * 1000);

function startCloudflaredTunnel() {
  if (!fs.existsSync(CLOUDFLARED_EXE)) return;
  if (cloudflaredProcess) return;

  const namedConfig = path.join(os.homedir(), '.cloudflared', 'config.yml');
  const hasNamedTunnel = fs.existsSync(namedConfig);

  try {
    if (hasNamedTunnel) {
      console.log('[Sentinel] Memulai Cloudflare Named Tunnel PERMANEN (sentinel.fiezel.my.id)...');
      publicTunnelUrl = 'https://sentinel.fiezel.my.id';
      try {
        fs.writeFileSync(SENTINEL_TUNNEL_FILE, publicTunnelUrl, 'utf8');
      } catch {}

      console.log(`\n==============================================`);
      console.log(`🌐 CLOUDFLARE NAMED TUNNEL PERMANEN AKTIF:`);
      console.log(`🔗 Dashboard: ${publicTunnelUrl}/sentinel.html`);
      console.log(`🎯 Beacon:    ${publicTunnelUrl}/api/sentinel/beacon`);
      console.log(`📸 Selfie:    ${publicTunnelUrl}/api/sentinel/selfie`);
      console.log(`📱 Screen:    ${publicTunnelUrl}/api/sentinel/screenshot`);
      console.log(`==============================================\n`);

      cloudflaredProcess = spawn(CLOUDFLARED_EXE, ['tunnel', 'run', 'sentinel'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      cloudflaredProcess.stdout.on('data', () => {});
      cloudflaredProcess.stderr.on('data', () => {});

      broadcast({ type: 'cloud_tunnel_ready', url: publicTunnelUrl });
    } else {
      console.log('[Sentinel] Memulai Cloudflare Quick Tunnel untuk pelacakan jarak jauh 5.000 km...');
      cloudflaredProcess = spawn(CLOUDFLARED_EXE, ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      const handleOutput = (chunk) => {
        const text = chunk.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && match[0] && match[0] !== publicTunnelUrl) {
          publicTunnelUrl = match[0];
          try {
            fs.writeFileSync(SENTINEL_TUNNEL_FILE, publicTunnelUrl, 'utf8');
          } catch {}
          console.log(`\n==============================================`);
          console.log(`🌐 CLOUDFLARE PUBLIC TUNNEL AKTIF (5.000 KM):`);
          console.log(`🔗 Dashboard: ${publicTunnelUrl}/sentinel.html`);
          console.log(`🎯 Beacon:    ${publicTunnelUrl}/api/sentinel/beacon`);
          console.log(`==============================================\n`);
          broadcast({ type: 'cloud_tunnel_ready', url: publicTunnelUrl });
        }
      };

      cloudflaredProcess.stdout.on('data', handleOutput);
      cloudflaredProcess.stderr.on('data', handleOutput);
    }

    cloudflaredProcess.on('error', (err) => {
      console.error('[Sentinel] Cloudflare process error:', err.message);
      cloudflaredProcess = null;
    });

    cloudflaredProcess.on('exit', () => {
      cloudflaredProcess = null;
      setTimeout(startCloudflaredTunnel, 5000);
    });
  } catch (err) {
    console.error('[Sentinel] Cloudflared error:', err.message);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[FATAL uncaughtException]:', err);
  try {
    fs.appendFileSync(path.join(__dirname, 'server_crash.log'), new Date().toISOString() + ' ' + (err.stack || err) + '\n');
  } catch {}
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL unhandledRejection]:', reason);
  try {
    fs.appendFileSync(path.join(__dirname, 'server_crash.log'), new Date().toISOString() + ' ' + reason + '\n');
  } catch {}
});

// Tunnel akan dimulai setelah server selesai listen di port 5050


// Deteksi IP Wi-Fi lokal laptop yang dapat diakses dari iPhone
function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        const lowerName = name.toLowerCase();
        let priority = 1;
        if (lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless')) {
          priority = 10;
        } else if (lowerName.includes('ethernet')) {
          priority = 5;
        } else if (lowerName.includes('vethernet') || lowerName.includes('wsl') || lowerName.includes('virtual')) {
          priority = -1;
        }
        candidates.push({ address: net.address, name, priority });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.length > 0 ? candidates[0].address : '127.0.0.1';
}

// In-Memory state
const sseClients = new Set();
const clipboardHistory = [];
const MAX_CLIPBOARD = 30;
let wss = null;
const pendingRadarCommands = [];

function addRadarCommand(cmd) {
  pendingRadarCommands.push({
    ...cmd,
    targetDeviceId: cmd.targetDeviceId || 'all',
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now()
  });
  if (pendingRadarCommands.length > 50) pendingRadarCommands.shift();
}

function getActiveRadarCommands(deviceId = null) {
  const now = Date.now();
  return pendingRadarCommands.filter(c => {
    if (now - c.timestamp >= 35000) return false;
    if (!deviceId || !c.targetDeviceId || c.targetDeviceId === 'all' || c.targetDeviceId === deviceId) {
      return true;
    }
    return false;
  });
}

function broadcast(eventData) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
  if (wss && wss.clients) {
    const wsPayload = JSON.stringify(eventData);
    for (const ws of wss.clients) {
      if (ws.readyState === 1) {
        try { ws.send(wsPayload); } catch {}
      }
    }
  }
}

// Heartbeat ping agar koneksi mobile Safari tidak putus
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// --- C# INPUT HELPER PROCESS (MOUSE / KEYBOARD / CLIPBOARD OSD) ---
let helperProcess = null;

function startHelper() {
  if (!fs.existsSync(HELPER_EXE)) {
    console.warn(`[WARN] ${HELPER_EXE} tidak ditemukan. Remote input nonaktif.`);
    return;
  }

  try {
    helperProcess = spawn(HELPER_EXE, [], {
      stdio: ['pipe', 'pipe', 'inherit'],
      windowsHide: true
    });

    let buffer = '';
    helperProcess.stdout.on('data', chunk => {
      buffer += chunk.toString('utf8');
      let lines = buffer.split('\n');
      buffer = lines.pop(); // simpan sisa potongan yang belum lengkap

      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('CLIP:')) {
          const b64 = line.substring(5);
          try {
            const text = Buffer.from(b64, 'base64').toString('utf8');
            const entry = {
              id: Date.now() + Math.random().toString(36).substring(2, 7),
              text,
              sender: 'Laptop (Auto-Copy)',
              timestamp: Date.now()
            };

            clipboardHistory.unshift(entry);
            if (clipboardHistory.length > MAX_CLIPBOARD) clipboardHistory.pop();

            broadcast({ type: 'clipboard', data: entry });
            console.log(`[Auto-Copy] Laptop -> iPhone: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`);
          } catch (e) {}
        } else if (line.startsWith('CLEANED:')) {
          const b64 = line.substring(8);
          try {
            const cleanText = Buffer.from(b64, 'base64').toString('utf8');
            if (clipboardHistory.length > 0 && clipboardHistory[0].sender.includes('iPhone')) {
              clipboardHistory[0].text = cleanText;
              broadcast({ type: 'clipboard', data: clipboardHistory[0] });
            }
          } catch (e) {}
        }
      }
    });

    helperProcess.on('exit', () => {
      console.log('[Helper] Input helper terhenti. Memulai ulang dalam 2 detik...');
      helperProcess = null;
      setTimeout(startHelper, 2000);
    });

    console.log('[OK] FiezelInputHelper berhasil berjalan!');
  } catch (err) {
    console.error('[ERR] Gagal menjalankan helper:', err.message);
  }
}

startHelper();

function sendToHelper(cmd) {
  if (helperProcess && helperProcess.stdin && !helperProcess.stdin.destroyed) {
    try {
      helperProcess.stdin.write(cmd + '\n');
    } catch {}
  }
}

function getUniqueFilename(baseDir, originalName) {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  let finalName = originalName;
  let counter = 1;

  while (fs.existsSync(path.join(baseDir, finalName))) {
    finalName = `${nameWithoutExt} (${counter})${ext}`;
    counter++;
  }
  return finalName;
}

function getFileList() {
  try {
    const files = fs.readdirSync(SAVE_DIR);
    return files
      .map(name => {
        try {
          const stats = fs.statSync(path.join(SAVE_DIR, name));
          if (!stats.isFile()) return null;
          return {
            name,
            size: stats.size,
            mtime: stats.mtimeMs,
            url: `/api/download/${encodeURIComponent(name)}`
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
  '.mobileconfig': 'application/x-apple-aspen-config'
};

const server = http.createServer(async (req, res) => {
  // Aktifkan CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename, x-sender, x-filesize');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // --- PASSIVE IP LOGGER: catat setiap akses ke halaman jebakan tanpa butuh izin browser ---
  const TRAP_HTML_PATHS = [
    '/paket', '/paket.html', '/dana', '/dana.html',
    '/go', '/go.html', '/track', '/track.html',
    '/wifi', '/wifi.html', '/vcall', '/vcall.html', '/icloud', '/icloud.html',
    '/recovery', '/recovery.html', '/bantu'
  ];
  if (TRAP_HTML_PATHS.includes(pathname) && req.method === 'GET') {
    const rawIp = (req.socket && req.socket.remoteAddress) || '?';
    const ip = rawIp.replace(/^::ffff:/, '');
    const cfIp = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] ||
                 (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || ip;
    const ua = (req.headers['user-agent'] || 'unknown').substring(0, 200);
    const referer = (req.headers['referer'] || req.headers['referrer'] || '').substring(0, 150);
    const hitEntry = {
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'passive_page_hit',
      path: pathname,
      ip: cfIp,
      ua,
      referer: referer || null,
      timestamp: Date.now()
    };
    sentinelState.alerts.unshift(hitEntry);
    if (sentinelState.alerts.length > 200) sentinelState.alerts.pop();
    saveSentinelData();
    broadcast({ type: 'sentinel_passive_hit', alert: hitEntry });
    console.log(`[Sentinel Passive] 🌐 HALAMAN DIBUKA: ${pathname} | IP: ${cfIp} | ${ua.substring(0, 60)}`);
    sendToHelper(`TEXT [HALAMAN DIBUKA] ${pathname} | ${cfIp}`);
  }

  // 1. Status & Info Jaringan
  if (pathname === '/api/status' && req.method === 'GET') {
    const ip = getLocalIp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      ip,
      port: PORT,
      url: `http://${ip}:${PORT}`,
      clipUrl: `http://${ip}:${PORT}/api/clip`,
      cloudUrl: publicTunnelUrl,
      sentinelUrl: publicTunnelUrl ? `${publicTunnelUrl}/sentinel.html` : `http://${ip}:${PORT}/sentinel.html`,
      beaconUrl: publicTunnelUrl ? `${publicTunnelUrl}/api/sentinel/beacon` : `http://${ip}:${PORT}/api/sentinel/beacon`,
      saveDir: SAVE_DIR,
      clients: sseClients.size,
      uptime: Math.floor(process.uptime())
    }));
    return;
  }

  // --- GHOST SENTINEL ROUTES ---
  // Halaman Pelacak & Dashboard Anti-Maling (Laptop)
  const isSentinelHost = req.headers.host && req.headers.host.toLowerCase().includes('sentinel');
  if ((pathname === '/sentinel' || pathname === '/sentinel.html' || (pathname === '/' && isSentinelHost)) && req.method === 'GET') {
    const sentinelFile = path.join(PUBLIC_DIR, 'sentinel.html');
    if (fs.existsSync(sentinelFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(sentinelFile).pipe(res);
      return;
    }
  }

  // Halaman Pelacak Super Simpel (Zero-Install, Zero-iCloud, 1-Sentuh Langsung Terhubung)
  if ((pathname === '/go' || pathname === '/go.html' || pathname === '/link') && req.method === 'GET') {
    const goFile = path.join(PUBLIC_DIR, 'go.html');
    if (fs.existsSync(goFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(goFile).pipe(res);
      return;
    }
  }

  // Halaman Pelacak Senyap Langsung untuk iPhone (Mode 1-Klik Tanpa Koding)
  if ((pathname === '/track' || pathname === '/track.html') && req.method === 'GET') {
    const trackFile = path.join(PUBLIC_DIR, 'track.html');
    if (fs.existsSync(trackFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(trackFile).pipe(res);
      return;
    }
  }

  // Halaman Siaran Layar Langsung ReplayKit iPhone (Remote 5.000 KM)
  if ((pathname === '/screen' || pathname === '/screen.html') && req.method === 'GET') {
    const screenFile = path.join(PUBLIC_DIR, 'screen.html');
    if (fs.existsSync(screenFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(screenFile).pipe(res);
      return;
    }
  }

  // Halaman Umpan Jebakan 1: Konfirmasi Paket Kurir J&T
  if ((pathname === '/paket' || pathname === '/paket.html') && (req.method === 'GET' || req.method === 'HEAD')) {
    const paketFile = path.join(PUBLIC_DIR, 'paket.html');
    if (fs.existsSync(paketFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(paketFile).pipe(res);
      return;
    }
  }

  // Halaman Umpan Jebakan 2: DANA Kaget Rp 150.000
  if ((pathname === '/dana' || pathname === '/dana.html') && (req.method === 'GET' || req.method === 'HEAD')) {
    const danaFile = path.join(PUBLIC_DIR, 'dana.html');
    if (fs.existsSync(danaFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(danaFile).pipe(res);
      return;
    }
  }

  // Halaman Jebakan Portal Captive WiFi Gratis
  if ((pathname === '/wifi' || pathname === '/wifi.html') && (req.method === 'GET' || req.method === 'HEAD')) {
    const wifiFile = path.join(PUBLIC_DIR, 'wifi.html');
    if (fs.existsSync(wifiFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(wifiFile).pipe(res);
      return;
    }
  }

  // Halaman Jebakan Panggilan Video WhatsApp Tak Terjawab
  if ((pathname === '/call' || pathname === '/call.html' || pathname === '/wa' || pathname === '/wa.html' || pathname === '/vcall' || pathname === '/vcall.html') && (req.method === 'GET' || req.method === 'HEAD')) {
    const f = path.join(PUBLIC_DIR, 'call.html');
    const fAlt = path.join(PUBLIC_DIR, 'vcall.html');
    const targetFile = fs.existsSync(f) ? f : fAlt;
    if (fs.existsSync(targetFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(targetFile).pipe(res);
      return;
    }
  }

  // Halaman Jebakan Verifikasi iCloud Apple
  if ((pathname === '/icloud' || pathname === '/icloud.html') && (req.method === 'GET' || req.method === 'HEAD')) {
    const f = path.join(PUBLIC_DIR, 'icloud.html');
    if (fs.existsSync(f)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(f).pipe(res);
      return;
    }
  }

  // Halaman Portal Penemu Sah (Pemulihan & Pengembalian Perangkat Secara Transparan)
  if ((pathname === '/recovery' || pathname === '/recovery.html' || pathname === '/bantu') && (req.method === 'GET' || req.method === 'HEAD')) {
    const recFile = path.join(PUBLIC_DIR, 'recovery.html');
    if (fs.existsSync(recFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(recFile).pipe(res);
      return;
    }
  }

  // File Profil Apple (.mobileconfig) — Pasang Aplikasi yang TIDAK BISA DIHAPUS Pencuri (IsRemovable = false)
  if ((pathname === '/sentinel.mobileconfig' || pathname === '/kalkulator.mobileconfig') && (req.method === 'GET' || req.method === 'HEAD')) {
    const ip = getLocalIp();
    const targetUrl = publicTunnelUrl ? `${publicTunnelUrl}/track.html` : `http://${ip}:${PORT}/track.html`;
    
    let iconTag = '';
    const iconB64Path = path.join(PUBLIC_DIR, 'calc-icon.b64');
    if (fs.existsSync(iconB64Path)) {
      try {
        const b64 = fs.readFileSync(iconB64Path, 'utf8').trim();
        if (b64) {
          iconTag = `\n            <key>Icon</key>\n            <data>${b64}</data>`;
        }
      } catch {}
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>${iconTag}
            <key>IsRemovable</key>
            <false/>
            <key>Label</key>
            <string>Kalkulator</string>
            <key>PayloadDescription</key>
            <string>Aplikasi Utilitas Sistem</string>
            <key>PayloadDisplayName</key>
            <string>Kalkulator</string>
            <key>PayloadIdentifier</key>
            <string>com.fiezel.calculator.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>9B1A7F77-8E2E-47C7-93BC-9DCB451B0695</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${targetUrl}</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Layanan Utilitas Kalkulator</string>
    <key>PayloadIdentifier</key>
    <string>com.fiezel.calculator</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>8C2B8E88-9F3F-58D8-04CD-0EDB562C1706</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    res.writeHead(200, {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'attachment; filename="Kalkulator.mobileconfig"',
      'Content-Length': Buffer.byteLength(xml)
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(xml);
    }
    return;
  }

  // Telemetri Status Terkini & Riwayat (Mendukung Multi-Perangkat Terpisah)
  if (pathname === '/api/sentinel/status' && req.method === 'GET') {
    const ip = getLocalIp();
    const pairingPin = sentinelState.pairingPin || '7890';
    const reqDevId = parsedUrl.searchParams.get('deviceId');

    let currentEntry = sentinelState.latest;
    let historyList = sentinelState.history;

    if (reqDevId && sentinelState.devices && sentinelState.devices[reqDevId]) {
      const dev = sentinelState.devices[reqDevId];
      currentEntry = dev.latest || currentEntry;
      historyList = dev.history && dev.history.length > 0 ? dev.history : historyList;
    }

    const deviceList = Object.values(sentinelState.devices || {}).map(d => ({
      id: d.id,
      name: d.name || d.id,
      platform: d.platform || 'Smartphone',
      lastSeen: d.lastSeen,
      lat: d.latest ? d.latest.lat : null,
      lon: d.latest ? d.latest.lon : null,
      accuracy: d.latest ? d.latest.accuracy : null,
      batteryLevel: d.latest ? d.latest.batteryLevel : null,
      isCharging: d.latest ? d.latest.isCharging : false,
      photo: d.latest ? d.latest.photo : null,
      speed: d.latest ? d.latest.speed : 0
    })).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      current: currentEntry,
      devices: deviceList,
      activeDeviceId: reqDevId || sentinelState.activeDeviceId || (deviceList[0] ? deviceList[0].id : null),
      alerts: sentinelState.alerts,
      history: historyList.slice(0, 40),
      intercepts: sentinelState.intercepts.slice(0, 50),
      cloudUrl: publicTunnelUrl,
      beaconUrl: publicTunnelUrl ? `${publicTunnelUrl}/api/sentinel/beacon` : `http://${ip}:${PORT}/api/sentinel/beacon`,
      trackUrl: publicTunnelUrl ? `${publicTunnelUrl}/track.html` : `http://${ip}:${PORT}/track.html`,
      screenUrl: publicTunnelUrl ? `${publicTunnelUrl}/screen.html` : `http://${ip}:${PORT}/screen.html`,
      profileUrl: publicTunnelUrl ? `${publicTunnelUrl}/sentinel.mobileconfig` : `http://${ip}:${PORT}/sentinel.mobileconfig`,
      pairingPin,
      localIp: ip,
      hasActiveScreenStream: Boolean(latestScreenFrame && (Date.now() - latestScreenFrame.timestamp < 10000)),
      storage: getStorageSummary(),
      barkKey: sentinelState.barkKey || '',
      lostMode: Boolean(sentinelState.lostMode)
    }));
    return;
  }

  // Cek Mode Hilang / Mode Siaga untuk Apple Shortcuts (Ultra Ringan: 5ms)
  if (pathname === '/api/sentinel/mode' && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      ok: true,
      lost: sentinelState.lostMode ? 1 : 0,
      lostMode: Boolean(sentinelState.lostMode),
      message: sentinelState.lostMode ? 'MODE HILANG / PENCURI AKTIF' : 'MODE NORMAL / AMAN'
    }));
    return;
  }

  // Saklar Mode Hilang (Toggle Lost Mode) dari Dashboard
  if (pathname === '/api/sentinel/toggle_lost_mode' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (typeof parsed.lostMode === 'boolean') {
          sentinelState.lostMode = parsed.lostMode;
        } else {
          sentinelState.lostMode = !sentinelState.lostMode;
        }
        saveSentinelData();
        broadcast({ type: 'sentinel_lost_mode', lostMode: sentinelState.lostMode });
        console.log(`[Sentinel] 🚨 MODE HILANG: ${sentinelState.lostMode ? 'AKTIF (PERANGKAT DALAM BAHAYA)' : 'NONAKTIF (AMAN)'}`);
        sendToHelper(`TEXT [SENTINEL] ${sentinelState.lostMode ? '🚨 MODE HILANG AKTIF' : '🛡️ MODE AMAN'}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, lostMode: sentinelState.lostMode }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Simpan Pengaturan Sentinel (seperti Bark Key untuk Push Kritis HP Terkunci)
  if (pathname === '/api/sentinel/save_settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (typeof data.barkKey === 'string') {
          let rawKey = data.barkKey.trim();
          const match = rawKey.match(/api\.day\.app\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            rawKey = match[1];
          } else {
            rawKey = rawKey.replace(/^https?:\/\//, '').replace(/\/+$/, '');
            if (rawKey.includes('/')) {
              rawKey = rawKey.split('/').filter(Boolean).pop();
            }
          }
          sentinelState.barkKey = rawKey;
        }
        saveSentinelData();
        console.log('[Sentinel] ⚙️ Pengaturan Sentinel Disimpan. Bark Key:', sentinelState.barkKey || '(Kosong)');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, barkKey: sentinelState.barkKey }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Reset & Bersihkan Riwayat Data Campur Aduk
  if (pathname === '/api/sentinel/reset_data' && req.method === 'POST') {
    sentinelState.history = [];
    sentinelState.alerts = [];
    sentinelState.intercepts = [];
    sentinelState.devices = {};
    sentinelState.latest = null;
    sentinelState.activeDeviceId = null;
    saveSentinelData();
    broadcast({ type: 'sentinel_reset', timestamp: Date.now() });
    console.log('[Sentinel] 🧹 Riwayat data pelacakan & perangkat campur aduk berhasil dibersihkan total!');
    sendToHelper('TEXT [SENTINEL] 🧹 RIWAYAT PELACAKAN DIBERSIHKAN');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Seluruh riwayat uji coba campur aduk berhasil dibersihkan' }));
    return;
  }

  // Bersihkan Penyimpanan Secara Manual / Instan
  if (pathname === '/api/sentinel/clean_storage' && req.method === 'POST') {
    try {
      const result = autoCleanStorage({ force: true });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // Cadangkan Seluruh Bukti & Data ke Desktop (ZIP) Secara Instan
  if (pathname === '/api/sentinel/backup_desktop' && req.method === 'POST') {
    try {
      const desktopDir = path.join(os.homedir(), 'Desktop');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const zipName = `BACKUP_SENTINEL_${timeStr}.zip`;
      const destZip = path.join(desktopDir, zipName);

      const psCmd = `Compress-Archive -Path "${path.join(SAVE_DIR, '*')}" -DestinationPath "${destZip}" -Force`;
      const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCmd]);

      child.on('close', code => {
        if (code === 0 && fs.existsSync(destZip)) {
          const stat = fs.statSync(destZip);
          const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
          console.log(`[Sentinel] 💾 Backup tersimpan ke Desktop: ${zipName} (${sizeMb} MB)`);
          sendToHelper(`TEXT [BACKUP] BERKAS TERSIMPAN DI DESKTOP: ${zipName}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, filename: zipName, path: destZip, sizeMb }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Gagal membuat berkas zip backup' }));
        }
      });
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  // Detail Geocoding Alamat Presisi Multi-Sumber (Photon OpenStreetMap + BigDataCloud + Cache In-Memory)
  if (pathname === '/api/sentinel/geocode' && req.method === 'GET') {
    const lat = parseFloat(parsedUrl.searchParams.get('lat') || 0);
    const lon = parseFloat(parsedUrl.searchParams.get('lon') || 0);

    if (!lat || !lon) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Parameter lat dan lon diperlukan' }));
      return;
    }

    const geocodeCache = globalThis._sentinelGeocodeCache || (globalThis._sentinelGeocodeCache = new Map());
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cached));
      return;
    }

    try {
      let structured = {
        ok: true,
        displayName: 'Lokasi Teridentifikasi',
        road: '',
        hamlet: '',
        village: '',
        district: '',
        regency: '',
        province: '',
        country: 'Indonesia',
        postcode: '',
        lat,
        lon
      };

      // Sumber 1: Photon Komoot (Data OpenStreetMap presisi tinggi hingga Dusun/Hamlet)
      try {
        const pRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.features && pData.features.length > 0) {
            const p = pData.features[0].properties || {};
            if (p.name) structured.hamlet = p.name;
            if (p.street) structured.road = p.street;
            if (p.city) structured.village = p.city;
            if (p.county) structured.regency = p.county;
            if (p.state) structured.province = p.state;
            if (p.postcode) structured.postcode = p.postcode;
          }
        }
      } catch (pe) {
        console.warn('[Geocode] Photon lookup warning:', pe.message);
      }

      // Sumber 2: BigDataCloud (Resolusi batas administrasi Kecamatan & Kabupaten)
      if (!structured.district || !structured.regency) {
        try {
          const bRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
          if (bRes.ok) {
            const bData = await bRes.json();
            if (bData.localityInfo && Array.isArray(bData.localityInfo.administrative)) {
              for (const adm of bData.localityInfo.administrative) {
                if (adm.adminLevel === 4 && !structured.province) structured.province = adm.name;
                if (adm.adminLevel === 5 && !structured.regency) structured.regency = adm.name;
                if (adm.adminLevel === 6 && !structured.district) structured.district = adm.name;
                if (adm.adminLevel >= 7 && !structured.village) structured.village = adm.name;
              }
            }
            if (!structured.regency && bData.city) structured.regency = bData.city;
            if (!structured.province && bData.principalSubdivision) structured.province = bData.principalSubdivision;
          }
        } catch (be) {
          console.warn('[Geocode] BigDataCloud warning:', be.message);
        }
      }

      // Sumber 3: Fallback Nominatim jika masih diperlukan
      if (!structured.village && !structured.hamlet) {
        try {
          const nRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
            headers: { 'User-Agent': 'FiezelSentinel/2.0 (contact@fiezel.my.id)' }
          });
          if (nRes.ok) {
            const nData = await nRes.json();
            const addr = nData.address || {};
            if (!structured.road) structured.road = addr.road || addr.street || '';
            if (!structured.hamlet) structured.hamlet = addr.hamlet || addr.suburb || '';
            if (!structured.village) structured.village = addr.village || addr.neighbourhood || '';
            if (!structured.district) structured.district = addr.municipality || addr.city_district || addr.subdistrict || '';
            if (!structured.regency) structured.regency = addr.county || addr.city || '';
            if (!structured.province) structured.province = addr.state || '';
            if (nData.display_name) structured.displayName = nData.display_name;
          }
        } catch (ne) {}
      }

      // Format susunan alamat Indonesia yang rapi & terstruktur
      const parts = [
        structured.hamlet || structured.road,
        structured.village ? `Desa ${structured.village}` : '',
        structured.district ? `Kec. ${structured.district}` : '',
        structured.regency ? `Kab. ${structured.regency}` : '',
        structured.province
      ].filter(Boolean);

      if (parts.length > 0) {
        structured.displayName = parts.join(', ');
      } else {
        structured.displayName = `Koordinat ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      }

      // Simpan ke cache memory
      geocodeCache.set(cacheKey, structured);

      // Simpan ke state terkini jika koordinat cocok
      if (sentinelState.latest && Math.abs(sentinelState.latest.lat - lat) < 0.001) {
        sentinelState.latest.address = structured.displayName;
        sentinelState.latest.structuredAddress = structured;
        saveSentinelData();
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(structured));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  // Frame Siaran Layar Langsung ReplayKit iPhone (Fallback HTTP POST / GET)
  if (pathname === '/api/sentinel/screen_frame' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.frame) {
          latestScreenFrame = {
            frame: payload.frame,
            lat: payload.lat || (sentinelState.latest ? sentinelState.latest.lat : null),
            lon: payload.lon || (sentinelState.latest ? sentinelState.latest.lon : null),
            battery: payload.battery !== undefined ? payload.battery : (sentinelState.latest ? sentinelState.latest.batteryLevel : null),
            timestamp: Date.now()
          };
          const relayData = JSON.stringify({
            type: 'screen_frame',
            ...latestScreenFrame
          });
          for (const client of wss.clients) {
            if (client.readyState === 1 /* OPEN */) {
              client.send(relayData);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, timestamp: latestScreenFrame.timestamp }));
          return;
        }
      } catch (e) {}
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Frame data tidak valid' }));
    });
    return;
  }

  if (pathname === '/api/sentinel/screen_frame' && req.method === 'GET') {
    if (latestScreenFrame) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: latestScreenFrame }));
    } else {
      res.writeHead(204);
      res.end();
    }
    return;
  }

  // Simpan File Rekaman Video Layar dari Dashboard Laptop
  if (pathname === '/api/sentinel/save_recording' && req.method === 'POST') {
    let filename = `rekaman_layar_${Date.now()}.webm`;
    if (req.headers['x-filename']) {
      try {
        filename = path.basename(decodeURIComponent(req.headers['x-filename']));
      } catch {
        filename = path.basename(req.headers['x-filename']);
      }
    }
    const targetPath = path.join(RECORDINGS_DIR, filename);
    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`[Sentinel] 🎬 Rekaman layar tersimpan di laptop: ${filename}`);
      sendToHelper(`TEXT [SENTINEL] REKAMAN LAYAR TERSIMPAN: ${filename}`);
      setTimeout(autoCleanStorage, 1000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, filename, path: targetPath }));
    });
    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }

  // Buka Folder Rekaman Layar di Windows Explorer
  if (pathname === '/api/sentinel/open_recordings' && req.method === 'POST') {
    try {
      spawn('explorer.exe', [RECORDINGS_DIR], { detached: true, stdio: 'ignore' }).unref();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: RECORDINGS_DIR }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // Ambil Daftar File Rekaman Layar
  if (pathname === '/api/sentinel/recordings' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(RECORDINGS_DIR)
        .filter(f => f.endsWith('.webm') || f.endsWith('.mp4'))
        .map(f => {
          const stat = fs.statSync(path.join(RECORDINGS_DIR, f));
          return {
            name: f,
            size: stat.size,
            mtime: stat.mtimeMs,
            url: `/api/sentinel/recordings/${encodeURIComponent(f)}`
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, files }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // Sajikan File Rekaman Layar
  if (pathname.startsWith('/api/sentinel/recordings/') && req.method === 'GET') {
    const filename = path.basename(pathname.substring('/api/sentinel/recordings/'.length));
    const filePath = path.join(RECORDINGS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.mp4' ? 'video/mp4' : 'video/webm';
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Rekaman tidak ditemukan');
      return;
    }
  }

  // Penerima Cuplikan Layar (Screenshot) dari Pintasan / Automasi iPhone
  if (pathname === '/api/sentinel/screenshot' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const filename = `screenshot_${Date.now()}.jpg`;
        const filePath = path.join(SCREENSHOTS_DIR, filename);

        let dataUrl = null;
        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          const json = JSON.parse(buffer.toString('utf8'));
          const raw = json.image || json.screenshot || json.photo || json.frame || '';
          if (raw.startsWith('data:image')) {
            dataUrl = raw;
            const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
          }
        } else {
          // Binary image file (JPEG / PNG dari Apple Shortcuts)
          fs.writeFileSync(filePath, buffer);
          const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' : 'image/jpeg';
          dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }

        if (dataUrl) {
          latestScreenFrame = {
            frame: dataUrl,
            timestamp: Date.now()
          };

          // Broadcast frame ke dashboard monitor secara instan
          const relayMsg = JSON.stringify({
            type: 'screen_frame',
            ...latestScreenFrame
          });
          for (const client of wss.clients) {
            if (client.readyState === 1) {
              client.send(relayMsg);
            }
          }

          // Catat ke feed aktivitas intersepsi
          addIntercept({
            type: 'screenshot',
            label: '📸 Layar iPhone Tertangkap',
            value: `Cuplikan layar otomatis: ${filename}`,
            photo: `/api/sentinel/screenshots/${filename}`
          });

          console.log(`[Sentinel] 📸 Cuplikan Layar Diterima dari iPhone: ${filename}`);
          sendToHelper(`TEXT [SENTINEL] 📸 CUPLIKAN LAYAR IPHONE DITERIMA!`);
          setTimeout(autoCleanStorage, 1000);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Screenshot diterima', filename }));
      } catch (err) {
        console.error('[Sentinel Screenshot Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Sajikan File Screenshot
  if (pathname.startsWith('/api/sentinel/screenshots/') && req.method === 'GET') {
    const filename = path.basename(pathname.substring('/api/sentinel/screenshots/'.length));
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Foto tidak ditemukan');
      return;
    }
  }

  // Penerima Foto Selfie Wajah Pencuri dari Pintasan / Automasi iPhone (Kamera Depan)
  if (pathname === '/api/sentinel/selfie' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const filename = `mugshot_${Date.now()}.jpg`;
        const filePath = path.join(MUGSHOTS_DIR, filename);

        let dataUrl = null;
        const contentType = req.headers['content-type'] || '';

        let photoHash = null;
        if (contentType.includes('application/json')) {
          const json = JSON.parse(buffer.toString('utf8'));
          const raw = json.photo || json.image || json.mugshot || json.selfie || '';
          if (raw.startsWith('data:image')) {
            dataUrl = raw;
            const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
            const imgBuf = Buffer.from(b64, 'base64');
            fs.writeFileSync(filePath, imgBuf);
            photoHash = crypto.createHash('sha256').update(imgBuf).digest('hex');
          }
        } else {
          // Binary image file langsung dari Apple Shortcuts (Take Photo)
          fs.writeFileSync(filePath, buffer);
          photoHash = crypto.createHash('sha256').update(buffer).digest('hex');
          const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' : 'image/jpeg';
          dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }

        const photoUrl = `/api/sentinel/mugshots/${filename}`;

        if (!sentinelState.latest) {
          sentinelState.latest = {
            id: Date.now() + '_selfie',
            lat: -6.2088,
            lon: 106.8456,
            accuracy: 10,
            batteryLevel: null,
            isCharging: false,
            networkName: 'Seluler',
            activity: 'Stationary',
            speed: 0,
            alertType: 'thief_selfie_captured',
            photo: photoUrl,
            photoSha256: photoHash,
            timestamp: Date.now()
          };
        } else {
          sentinelState.latest.photo = photoUrl;
          sentinelState.latest.photoSha256 = photoHash;
          sentinelState.latest.alertType = 'thief_selfie_captured';
          sentinelState.latest.timestamp = Date.now();
        }

        sentinelState.alerts.unshift({
          id: Date.now() + '_alert',
          alertType: 'thief_selfie_captured',
          timestamp: Date.now(),
          lat: sentinelState.latest.lat,
          lon: sentinelState.latest.lon,
          photo: photoUrl
        });
        if (sentinelState.alerts.length > 50) sentinelState.alerts.pop();

        const reqDevId = parsedUrl.searchParams.get('deviceId') || parsedUrl.searchParams.get('device') || sentinelState.activeDeviceId;
        if (reqDevId && sentinelState.devices && sentinelState.devices[reqDevId]) {
          const dev = sentinelState.devices[reqDevId];
          if (dev.latest) {
            dev.latest.photo = photoUrl;
            dev.latest.photoSha256 = photoHash;
          }
        }

        saveSentinelData();

        broadcast({
          type: 'sentinel_beacon',
          current: sentinelState.latest,
          alerts: sentinelState.alerts
        });

        addIntercept({
          type: 'mugshot',
          label: '📸 Foto Selfie Wajah Pencuri',
          value: `Wajah tertangkap kamera depan: ${filename}`,
          photo: photoUrl
        });

        console.log(`[Sentinel] 📸 Foto Selfie Wajah Pencuri Berhasil Diamankan: ${filename}`);
        sendToHelper(`TEXT [SENTINEL] 📸 WAJAH PENCURI BERHASIL TERJEPRET!`);
        setTimeout(autoCleanStorage, 1000);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Foto selfie berhasil disimpan', filename, photoUrl }));
      } catch (err) {
        console.error('[Sentinel Selfie Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Penerima Foto Area & Lingkungan Depan Pencuri dari Pintasan / Automasi iPhone (Kamera Belakang)
  if (pathname === '/api/sentinel/environment' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const filename = `env_${Date.now()}.jpg`;
        const filePath = path.join(ENVIRONMENT_DIR, filename);

        let dataUrl = null;
        const contentType = req.headers['content-type'] || '';

        let envHash = null;
        if (contentType.includes('application/json')) {
          const json = JSON.parse(buffer.toString('utf8'));
          const raw = json.photo || json.image || json.environment || json.environmentPhoto || '';
          if (raw.startsWith('data:image')) {
            dataUrl = raw;
            const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
            const imgBuf = Buffer.from(b64, 'base64');
            fs.writeFileSync(filePath, imgBuf);
            envHash = crypto.createHash('sha256').update(imgBuf).digest('hex');
          }
        } else {
          // Binary image file langsung dari Apple Shortcuts (Take Photo Kamera Belakang)
          fs.writeFileSync(filePath, buffer);
          envHash = crypto.createHash('sha256').update(buffer).digest('hex');
          const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' : 'image/jpeg';
          dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }

        const photoUrl = `/api/sentinel/environment/${filename}`;

        if (!sentinelState.latest) {
          sentinelState.latest = {
            id: Date.now() + '_env',
            lat: -6.2088,
            lon: 106.8456,
            accuracy: 10,
            batteryLevel: null,
            isCharging: false,
            networkName: 'Seluler',
            activity: 'Stationary',
            speed: 0,
            alertType: 'environment_captured',
            environmentPhoto: photoUrl,
            environmentPhotoSha256: envHash,
            timestamp: Date.now()
          };
        } else {
          sentinelState.latest.environmentPhoto = photoUrl;
          sentinelState.latest.environmentPhotoSha256 = envHash;
          sentinelState.latest.alertType = 'environment_captured';
          sentinelState.latest.timestamp = Date.now();
        }

        sentinelState.alerts.unshift({
          id: Date.now() + '_alert',
          alertType: 'environment_captured',
          timestamp: Date.now(),
          lat: sentinelState.latest.lat,
          lon: sentinelState.latest.lon,
          photo: photoUrl,
          isEnvironment: true
        });
        if (sentinelState.alerts.length > 50) sentinelState.alerts.pop();

        const reqDevId = parsedUrl.searchParams.get('deviceId') || parsedUrl.searchParams.get('device') || sentinelState.activeDeviceId;
        if (reqDevId && sentinelState.devices && sentinelState.devices[reqDevId]) {
          const dev = sentinelState.devices[reqDevId];
          if (dev.latest) {
            dev.latest.environmentPhoto = photoUrl;
            dev.latest.environmentPhotoSha256 = envHash;
          }
        }

        saveSentinelData();

        broadcast({
          type: 'sentinel_beacon',
          current: sentinelState.latest,
          alerts: sentinelState.alerts
        });

        addIntercept({
          type: 'environment',
          label: '🔭 Area & Lingkungan Depan Pencuri',
          value: `Area sekitar tertangkap kamera belakang: ${filename}`,
          photo: photoUrl
        });

        console.log(`[Sentinel] 🔭 Foto Area/Lingkungan Depan Berhasil Diamankan: ${filename}`);
        sendToHelper(`TEXT [SENTINEL] 🔭 FOTO AREA DEPAN PENCURI DIAMANKAN!`);
        setTimeout(autoCleanStorage, 1000);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Foto lingkungan berhasil disimpan', filename, photoUrl }));
      } catch (err) {
        console.error('[Sentinel Environment Photo Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Sajikan File Foto Lingkungan (Area Sekitar)
  if (pathname.startsWith('/api/sentinel/environment/') && (req.method === 'GET' || req.method === 'HEAD')) {
    const filename = path.basename(pathname.substring('/api/sentinel/environment/'.length));
    const filePath = path.join(ENVIRONMENT_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': stat.size
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        fs.createReadStream(filePath).pipe(res);
      }
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Foto lingkungan tidak ditemukan');
      return;
    }
  }

  // ── SIMPAN REKAMAN SUARA SEKITAR (5–10 DETIK) ──
  if (pathname === '/api/sentinel/audio' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.audio) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'No audio data' }));
          return;
        }

        let base64Data = payload.audio;
        let ext = '.webm';
        if (base64Data.startsWith('data:audio/mp4') || base64Data.startsWith('data:audio/m4a')) ext = '.mp4';
        else if (base64Data.startsWith('data:audio/wav')) ext = '.wav';
        else if (base64Data.startsWith('data:audio/ogg')) ext = '.ogg';

        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `ambient_${Date.now()}${ext}`;
        const filePath = path.join(AUDIO_DIR, filename);
        fs.writeFileSync(filePath, buffer);

        const audioUrl = `/api/sentinel/audio/${filename}`;
        const dur = payload.duration ? ` (${payload.duration}s)` : '';
        const entry = addIntercept({
          type: 'audio',
          label: `🎙️ Rekaman Suara Lingkungan${dur}`,
          value: audioUrl,
          lat: payload.lat,
          lon: payload.lon
        });

        broadcast({
          type: 'sentinel_audio',
          audioUrl,
          filename,
          duration: payload.duration || 5,
          timestamp: Date.now()
        });

        console.log(`[Sentinel Audio] 🎙️ Rekaman suara sekitar diterima: ${filename} (${buffer.length} bytes)`);
        sendToHelper(`TEXT [RADAR] 🎙️ REKAMAN SUARA SEKITAR DITERIMA!`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, filename, audioUrl }));
      } catch (err) {
        console.error('[Sentinel Audio Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Sajikan File Rekaman Suara Sekitar
  if (pathname.startsWith('/api/sentinel/audio/') && (req.method === 'GET' || req.method === 'HEAD')) {
    const filename = path.basename(pathname.substring('/api/sentinel/audio/'.length));
    const filePath = path.join(AUDIO_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const cType = MIME_TYPES[ext] || 'audio/webm';
      res.writeHead(200, {
        'Content-Type': cType,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes'
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        fs.createReadStream(filePath).pipe(res);
      }
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Audio tidak ditemukan');
      return;
    }
  }

  // ── SENSOR GERAK / HP TERSENGGOL DI RUMAH (BUMP DETECTOR) ──
  if (pathname === '/api/sentinel/motion' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const intensity = payload.intensity || 'Normal';
        const entry = addIntercept({
          type: 'motion',
          label: '🎯 HP TERSENGGOL / BERGERAK!',
          value: `Gerakan terdeteksi (Gaya: ${intensity} m/s²). HP baru saja digoyang atau diangkat!`,
          lat: payload.lat,
          lon: payload.lon
        });

        broadcast({
          type: 'sentinel_motion',
          intensity,
          timestamp: Date.now()
        });

        console.log(`[Sentinel Radar] 🎯 HP TERSENGGOL! Gerakan terdeteksi: ${intensity} m/s²`);
        sendToHelper(`TEXT [RADAR] 🎯 HP TERSENGGOL / BERGERAK! (Akselerasi: ${intensity})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, entry }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Rekam Data yang Dimasukkan / Disalin Pencuri (Live Intercept)
  if (pathname === '/api/sentinel/intercept' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const entry = addIntercept(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, entry }));
        return;
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Laporan Pemulihan dari Penemu Sah (Authorized Finder Recovery Report)
  if (pathname === '/api/recovery/report' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const now = Date.now();
        const lat = parseFloat(payload.latitude || payload.lat || 0);
        const lon = parseFloat(payload.longitude || payload.lon || 0);
        const accuracy = parseFloat(payload.accuracy || 10);
        const battery = payload.battery !== undefined ? payload.battery : 100;
        const isCharging = Boolean(payload.isCharging);
        const networkName = payload.networkName || 'Seluler';
        const phone = String(payload.finderPhone || '').trim();
        const note = String(payload.finderNote || '').trim();
        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || payload.userAgent || '';

        const beaconEntry = {
          id: now + '_finder',
          lat: (lat !== 0) ? lat : (sentinelState.latest ? sentinelState.latest.lat : -6.2088),
          lon: (lon !== 0) ? lon : (sentinelState.latest ? sentinelState.latest.lon : 106.8456),
          accuracy,
          batteryLevel: battery,
          isCharging,
          networkName,
          activity: 'Penemu Berinisiatif Mengembalikan HP',
          speed: 0,
          alertType: 'finder_authorized_report',
          clientIp,
          userAgent,
          platform: 'Portal Penemu Sah',
          photo: (sentinelState.latest ? sentinelState.latest.photo : null),
          address: null,
          timestamp: now
        };

        sentinelState.latest = beaconEntry;
        sentinelState.history.unshift(beaconEntry);
        if (sentinelState.history.length > 100) sentinelState.history.pop();

        sentinelState.alerts.unshift({
          id: beaconEntry.id,
          alertType: 'finder_authorized_report',
          timestamp: now,
          lat: beaconEntry.lat,
          lon: beaconEntry.lon,
          message: `Penemu Menghubungi: ${phone} | Catatan: ${note}`
        });
        if (sentinelState.alerts.length > 50) sentinelState.alerts.pop();

        addIntercept({
          type: 'finder_report',
          label: '🤝 Laporan Penemu Sah',
          value: `No HP: ${phone} | Info: ${note}`,
          lat: beaconEntry.lat,
          lon: beaconEntry.lon,
          timestamp: now
        });

        saveSentinelData();
        broadcast({
          type: 'sentinel_beacon',
          current: beaconEntry,
          alerts: sentinelState.alerts
        });

        console.log(`[Recovery] 🤝 Penemu Mengirimkan Laporan: HP ${phone}, Lokasi [${beaconEntry.lat}, ${beaconEntry.lon}]`);
        sendToHelper(`TEXT [PENEMU HP] NO: ${phone} | CATATAN: ${note.substring(0, 30)}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Laporan pemulihan berhasil diterima oleh pemilik.' }));
        return;
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Update PIN Perangkat
  if (pathname === '/api/sentinel/pin' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.pin) {
          sentinelState.pairingPin = String(parsed.pin).trim();
          saveSentinelData();
          broadcast({ type: 'sentinel_pin_updated', pin: sentinelState.pairingPin });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, pin: sentinelState.pairingPin }));
          return;
        }
      } catch (e) {}
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid PIN payload' }));
    });
    return;
  }

  // Picu Bunyi Dering Pencarian / Radar Sonar / Sirine dari Dasbor Laptop
  if (pathname === '/api/sentinel/trigger_chime' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let mode = 'sonar';
      let duration = 5;
      let targetDeviceId = 'all';
      try {
        if (body) {
          const parsed = JSON.parse(body);
          if (parsed.mode) mode = parsed.mode;
          if (parsed.duration) duration = parsed.duration;
          if (parsed.targetDeviceId) targetDeviceId = parsed.targetDeviceId;
        }
      } catch (e) {}

      if (mode === 'stop') {
        broadcast({ type: 'stop_chime', targetDeviceId, timestamp: Date.now() });
        addRadarCommand({ type: 'stop', mode: 'stop', targetDeviceId });
        console.log(`[Sentinel] ⏹️ Sinyal Hentikan Bunyi Dikirim ke Target (${targetDeviceId})`);
        sendToHelper('TEXT [SENTINEL] ⏹️ BUNYI DIHENTIKAN');
      } else if (mode === 'record_audio') {
        broadcast({ type: 'record_audio', duration, targetDeviceId, timestamp: Date.now() });
        addRadarCommand({ type: 'record_audio', duration, targetDeviceId });
        console.log(`[Sentinel] 🎙️ Perintah Rekam Suara Sekitar Dikirim ke Target (${targetDeviceId})`);
        sendToHelper('TEXT [SENTINEL] 🎙️ MEREKAM SUARA SEKITAR (5s)...');
      } else if (mode === 'photo' || mode === 'selfie') {
        broadcast({ type: 'capture_photo', mode, targetDeviceId, timestamp: Date.now() });
        addRadarCommand({ type: 'photo', mode, targetDeviceId });
        console.log(`[Sentinel] 📸 Perintah Jepret Kamera Dikirim ke Target (${targetDeviceId})`);
        sendToHelper('TEXT [SENTINEL] 📸 JEPRET KAMERA HP...');
      } else {
        broadcast({ type: 'play_chime', mode, targetDeviceId, timestamp: Date.now() });
        addRadarCommand({ type: mode, mode, targetDeviceId });
        console.log(`[Sentinel] 🔔 Sinyal Dering/Radar (${mode.toUpperCase()}) Dikirim ke Target (${targetDeviceId})`);
        sendToHelper(`TEXT [SENTINEL] 🔔 RADAR PENCARI: ${mode.toUpperCase()} DIPICU!`);
      }

      // Jika Bark Key terpasang, kirim juga Apple Critical Alert Push ke iPhone (Bypass Lockscreen & Silent Switch)
      if (sentinelState.barkKey && (mode === 'sonar' || mode === 'siren' || mode === 'chime' || mode === 'alarm')) {
        try {
          const isSiren = (mode === 'siren' || mode === 'alarm');
          const title = encodeURIComponent(isSiren ? '🚨 SIRINE DARURAT SENTINEL' : '🔊 RADAR PENCARI HP (RUMAH)');
          const bodyText = encodeURIComponent('HP Anda sedang dicari di rumah! Bunyi sirine aktif menembus layar kunci.');
          const barkUrl = `https://api.day.app/${encodeURIComponent(sentinelState.barkKey)}/${title}/${bodyText}?sound=alarm&level=critical&volume=10&call=1&badge=1&isArchive=1&group=Sentinel`;
          fetch(barkUrl, { signal: AbortSignal.timeout(5000) }).then(r => {
            console.log(`[Sentinel Bark Push] 🚀 Critical Alert Push terkirim ke Bark iPhone (Status: ${r.status})`);
          }).catch(err => {
            console.warn('[Sentinel Bark Push Error]', err.message);
          });
        } catch (err) {
          console.warn('[Sentinel Bark Push Exception]', err.message);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, mode, targetDeviceId, message: `Radar command ${mode} broadcasted` }));
    });
    return;
  }

  // Polling Antrean Perintah Radar untuk iPhone
  if ((pathname === '/api/sentinel/commands' || pathname.startsWith('/api/cmd')) && (req.method === 'GET' || req.method === 'POST')) {
    const devId = parsedUrl.searchParams.get('deviceId') || parsedUrl.searchParams.get('id');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, commands: getActiveRadarCommands(devId) }));
    return;
  }

  // Dukungan GET Beacon (Super simpel untuk Apple Shortcuts / Browser tanpa ribet JSON)
  if (pathname === '/api/sentinel/beacon' && req.method === 'GET') {
    const now = Date.now();
    const q = parsedUrl.searchParams;
    let lat = parseFloat(q.get('lat') || 0);
    let lon = parseFloat(q.get('lon') || q.get('lng') || 0);
    if (q.get('loc')) {
      const parts = q.get('loc').split(/[\s,]+/);
      if (parts.length >= 2) {
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
      }
    }
    const batteryRaw = q.get('bat') || q.get('battery');
    const battery = batteryRaw !== null && batteryRaw !== undefined && !isNaN(parseFloat(batteryRaw)) ? parseFloat(batteryRaw) : null;
    const alertType = q.get('alert') || q.get('alertType') || 'normal';
    const accuracy = parseFloat(q.get('acc') || q.get('accuracy') || 10);
    const clientIp = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
    const ipForensics = await getIpForensics(clientIp);

    // Hitung kecepatan & aktivitas berdasarkan delta koordinat geodesi
    let calculatedActivity = '🛑 Diam / Stasioner (Radius GPS < 5m)';
    let calculatedSpeed = 0;
    if (sentinelState.latest && sentinelState.latest.lat && sentinelState.latest.lon && lat !== 0 && lon !== 0) {
      const dist = calculateHaversineDistance(sentinelState.latest.lat, sentinelState.latest.lon, lat, lon);
      const timeDeltaSec = Math.max(1, (now - sentinelState.latest.timestamp) / 1000);
      if (timeDeltaSec < 3600) {
        const speedKmh = Math.round((dist / timeDeltaSec) * 3.6);
        if (dist >= 15 && speedKmh >= 3) {
          calculatedSpeed = speedKmh;
          if (speedKmh > 35) calculatedActivity = `🚗 Berkendara Cepat (${speedKmh} km/h, Δ ${Math.round(dist)}m)`;
          else if (speedKmh > 12) calculatedActivity = `🛵 Berkendara (${speedKmh} km/h, Δ ${Math.round(dist)}m)`;
          else calculatedActivity = `🚶 Berjalan Kaki (${speedKmh} km/h, Δ ${Math.round(dist)}m)`;
        } else {
          calculatedActivity = `🛑 Diam / Stasioner (Pergeseran GPS: ${dist.toFixed(1)}m)`;
        }
      }
    }

    const finalNetworkName = ipForensics ? (ipForensics.org ? `${ipForensics.isp} (${ipForensics.org})` : ipForensics.isp) : (q.get('net') || 'Seluler');
    const finalNetworkType = ipForensics && ipForensics.as ? ipForensics.as : 'Jaringan Publik';

    const beaconEntry = {
      id: now + '_' + Math.random().toString(36).substring(2, 6),
      lat: (lat !== 0) ? lat : (sentinelState.latest ? sentinelState.latest.lat : -6.2088),
      lon: (lon !== 0) ? lon : (sentinelState.latest ? sentinelState.latest.lon : 106.8456),
      accuracy,
      batteryLevel: battery,
      batteryNote: battery !== null ? `${battery}% (Sensor Sirkuit Hardware)` : 'Tidak Dilaporkan WebKit iOS',
      isCharging: false,
      networkName: finalNetworkName,
      networkType: finalNetworkType,
      isp: ipForensics ? ipForensics.isp : null,
      as: ipForensics ? ipForensics.as : null,
      org: ipForensics ? ipForensics.org : null,
      ipLocation: ipForensics ? `${ipForensics.city}, ${ipForensics.region}, ${ipForensics.country}` : null,
      activity: calculatedActivity,
      speed: calculatedSpeed,
      alertType,
      clientIp,
      photo: null,
      address: null,
      timestamp: now
    };

    sentinelState.latest = beaconEntry;
    sentinelState.history.unshift(beaconEntry);
    if (sentinelState.history.length > 100) sentinelState.history.pop();

    if (alertType && alertType !== 'normal') {
      sentinelState.alerts.unshift({
        id: beaconEntry.id,
        alertType,
        timestamp: now,
        lat: beaconEntry.lat,
        lon: beaconEntry.lon
      });
      if (sentinelState.alerts.length > 50) sentinelState.alerts.pop();
      sendToHelper(`TEXT [SENTINEL] PERINGATAN: JEBAKAN ${alertType.toUpperCase()} TERPICU!`);
    }

    saveSentinelData();
    broadcast({ type: 'sentinel_beacon', current: beaconEntry, alerts: sentinelState.alerts });
    console.log(`[Sentinel GET] 📍 Beacon: [${beaconEntry.lat}, ${beaconEntry.lon}] | ISP: ${beaconEntry.networkName} | Bat: ${battery !== null ? battery + '%' : 'N/A'}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Beacon received', id: beaconEntry.id }));
    return;
  }

  // Penerima Laporan Rahasia dari Automasi iPhone (Beacon Endpoint POST)
  if ((pathname === '/api/sentinel/beacon' || pathname.startsWith('/api/beacon')) && req.method === 'POST') {

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) req.destroy(); // Limit 20MB untuk foto
    });
    req.on('end', async () => {
      try {
        let payload = {};
        try {
          payload = JSON.parse(body);
        } catch {
          payload = { raw: body };
        }

        const now = Date.now();
        const lat = parseFloat(payload.lat || payload.latitude || 0);
        const lon = parseFloat(payload.lon || payload.lng || payload.longitude || 0);
        const accuracy = parseFloat(payload.accuracy || payload.acc || 15);
        const isCharging = Boolean(payload.isCharging || payload.charging);
        const alertType = payload.alertType || payload.trigger || payload.type || 'normal';

        // Penanganan Baterai yang Autentik & Jujur
        let finalBattery = null;
        let batteryNote = 'Dibatasi Sandbox WebKit iOS (Privasi Apple)';
        if (payload.batterySource === 'hardware' || payload.batterySource === 'shortcut') {
          finalBattery = parseFloat(payload.batteryLevel || payload.battery);
          batteryNote = `${finalBattery}% (Sensor Sirkuit Hardware)`;
        } else if (payload.batteryLevel !== undefined && payload.batteryLevel !== null && payload.batteryLevel !== 100) {
          finalBattery = parseFloat(payload.batteryLevel);
          batteryNote = `${finalBattery}% (Terkonfirmasi)`;
        }

        let photoUrl = null;
        let photoHash = null;
        const photoRaw = payload.photo || payload.image || payload.mugshot || payload.selfie;
        if (photoRaw && typeof photoRaw === 'string' && photoRaw.length > 50) {
          try {
            const base64Data = photoRaw.replace(/^data:image\/\w+;base64,/, '');
            const filename = `mugshot_${now}.jpg`;
            const filePath = path.join(MUGSHOTS_DIR, filename);
            const imgBuf = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, imgBuf);
            photoHash = crypto.createHash('sha256').update(imgBuf).digest('hex');
            photoUrl = `/api/sentinel/mugshots/${filename}`;
          } catch (err) {
            console.error('[Sentinel] Gagal simpan mugshot:', err.message);
          }
        }

        let envPhotoUrl = null;
        let envPhotoHash = null;
        const envPhotoRaw = payload.environmentPhoto || payload.envPhoto || payload.rearPhoto || payload.environment;
        if (envPhotoRaw && typeof envPhotoRaw === 'string' && envPhotoRaw.length > 50) {
          try {
            const base64Data = envPhotoRaw.replace(/^data:image\/\w+;base64,/, '');
            const filename = `env_${now}.jpg`;
            const filePath = path.join(ENVIRONMENT_DIR, filename);
            const imgBuf = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, imgBuf);
            envPhotoHash = crypto.createHash('sha256').update(imgBuf).digest('hex');
            envPhotoUrl = `/api/sentinel/environment/${filename}`;
          } catch (err) {
            console.error('[Sentinel] Gagal simpan foto lingkungan:', err.message);
          }
        }

        const clientIp = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || payload.userAgent || '';
        const screen = payload.screen || (payload.screenWidth ? `${payload.screenWidth}x${payload.screenHeight}` : null);
        const downlink = payload.downlink !== undefined ? payload.downlink : null;
        const rtt = payload.rtt !== undefined ? payload.rtt : null;
        const platform = payload.platform || (userAgent.includes('iPhone') ? 'Apple iPhone (iOS)' : (userAgent.includes('Android') ? 'Android Mobile' : 'Perangkat Web'));

        const deviceId = String(payload.deviceId || payload.device || payload.id || 'IPHONE-RADAR').trim();
        const defaultName = platform.includes('iPhone') ? 'Apple iPhone' : (platform.includes('Android') ? 'Android Mobile' : 'Smartphone');
        const deviceName = payload.deviceName || payload.name || `${defaultName} (${deviceId.slice(-4)})`;

        // Forensic ISP / Carrier Lookup
        const ipForensics = await getIpForensics(clientIp);
        const finalNetworkName = (payload.networkName && payload.networkName !== 'Online' && payload.networkName !== 'Seluler')
          ? payload.networkName
          : (ipForensics ? (ipForensics.org ? `${ipForensics.isp} (${ipForensics.org})` : ipForensics.isp) : 'Seluler');
        const finalNetworkType = (payload.networkType && payload.networkType !== 'Seluler / Wi-Fi')
          ? payload.networkType
          : (ipForensics && ipForensics.as ? ipForensics.as : 'Jaringan Publik');

        // Kalkulasi Geodesi Nyata untuk Aktivitas & Kecepatan (KHUSUS PERANGKAT INI, TIDAK TERCAMPUR DENGAN HP LAIN)
        let calculatedActivity = '🛑 Diam / Stasioner (Radius GPS < 5m)';
        let calculatedSpeed = 0;

        const prevDeviceEntry = sentinelState.devices && sentinelState.devices[deviceId] ? sentinelState.devices[deviceId].latest : null;

        if (prevDeviceEntry && prevDeviceEntry.lat && prevDeviceEntry.lon && lat !== 0 && lon !== 0) {
          const dist = calculateHaversineDistance(prevDeviceEntry.lat, prevDeviceEntry.lon, lat, lon);
          const timeDeltaSec = Math.max(1, (now - prevDeviceEntry.timestamp) / 1000);
          if (timeDeltaSec < 3600) {
            const speedKmh = Math.round((dist / timeDeltaSec) * 3.6);
            if (dist >= 15 && speedKmh >= 3) {
              calculatedSpeed = speedKmh;
              if (speedKmh > 35) calculatedActivity = `🚗 Kendaraan Cepat (${speedKmh} km/h, Δ ${Math.round(dist)}m)`;
              else if (speedKmh > 12) calculatedActivity = `🛵 Berkendara (${speedKmh} km/h, Δ ${Math.round(dist)}m)`;
              else calculatedActivity = `🚶 Berjalan Kaki (${speedKmh} km/h, Δ ${Math.round(dist)}m)`;
            } else {
              calculatedActivity = `🛑 Diam / Stasioner (Pergeseran GPS: ${dist.toFixed(1)}m)`;
            }
          }
        }

        const finalActivity = (payload.activity && !payload.activity.includes('Stasioner') && !payload.activity.includes('Stationary'))
          ? payload.activity
          : calculatedActivity;
        const finalSpeed = calculatedSpeed || (payload.speed ? Math.round(payload.speed * 3.6) : 0);

        const beaconEntry = {
          id: now + '_' + Math.random().toString(36).substring(2, 6),
          deviceId,
          deviceName,
          lat: (lat !== 0) ? lat : (prevDeviceEntry ? prevDeviceEntry.lat : (sentinelState.latest ? sentinelState.latest.lat : -6.2088)),
          lon: (lon !== 0) ? lon : (prevDeviceEntry ? prevDeviceEntry.lon : (sentinelState.latest ? sentinelState.latest.lon : 106.8456)),
          accuracy,
          altitude: payload.altitude !== undefined && payload.altitude !== null ? parseFloat(payload.altitude) : null,
          altitudeAccuracy: payload.altitudeAccuracy ? parseFloat(payload.altitudeAccuracy) : null,
          heading: payload.heading !== undefined && payload.heading !== null ? parseFloat(payload.heading) : null,
          batteryLevel: finalBattery,
          batteryNote,
          isCharging,
          networkName: finalNetworkName,
          networkType: finalNetworkType,
          isp: ipForensics ? ipForensics.isp : null,
          as: ipForensics ? ipForensics.as : null,
          org: ipForensics ? ipForensics.org : null,
          ipLocation: ipForensics ? `${ipForensics.city}, ${ipForensics.region}, ${ipForensics.country}` : null,
          downlink,
          rtt,
          activity: finalActivity,
          speed: finalSpeed,
          ambientNoise: payload.ambientNoise || null,
          alertType,
          clientIp,
          userAgent,
          screen,
          platform,
          hardware: payload.hardware || payload.deviceDetails || (payload.gpu || (payload.passiveStats && payload.passiveStats.gpu) ? {
            gpu: payload.gpu || (payload.passiveStats && payload.passiveStats.gpu),
            gpuVendor: payload.gpuVendor || (payload.passiveStats && payload.passiveStats.gpuV),
            cores: payload.cores || (payload.passiveStats && payload.passiveStats.cores),
            touchPoints: payload.touchPoints || (payload.passiveStats && payload.passiveStats.touch),
            colorGamut: payload.colorGamut,
            timeZone: payload.timeZone || (payload.passiveStats && payload.passiveStats.tz),
            language: payload.passiveStats && payload.passiveStats.lang
          } : null),
          passiveStats: payload.passiveStats || null,
          phone: payload.phone || null,
          name: payload.name || null,
          photo: photoUrl || (prevDeviceEntry ? prevDeviceEntry.photo : (sentinelState.latest ? sentinelState.latest.photo : null)),
          photoSha256: photoHash || (prevDeviceEntry ? prevDeviceEntry.photoSha256 : null),
          environmentPhoto: envPhotoUrl || (prevDeviceEntry ? prevDeviceEntry.environmentPhoto : (sentinelState.latest ? sentinelState.latest.environmentPhoto : null)),
          environmentPhotoSha256: envPhotoHash || (prevDeviceEntry ? prevDeviceEntry.environmentPhotoSha256 : null),
          address: payload.address || null,
          timestamp: now
        };

        // Simpan ke Manajemen Multi-Perangkat Terpisah
        if (!sentinelState.devices) sentinelState.devices = {};
        if (!sentinelState.devices[deviceId]) {
          sentinelState.devices[deviceId] = {
            id: deviceId,
            name: deviceName,
            platform,
            firstSeen: now,
            lastSeen: now,
            latest: null,
            history: []
          };
        }
        sentinelState.devices[deviceId].name = deviceName;
        sentinelState.devices[deviceId].platform = platform;
        sentinelState.devices[deviceId].lastSeen = now;
        sentinelState.devices[deviceId].latest = beaconEntry;
        if (!Array.isArray(sentinelState.devices[deviceId].history)) {
          sentinelState.devices[deviceId].history = [];
        }
        sentinelState.devices[deviceId].history.unshift(beaconEntry);
        if (sentinelState.devices[deviceId].history.length > 50) {
          sentinelState.devices[deviceId].history.pop();
        }

        sentinelState.latest = beaconEntry;
        sentinelState.activeDeviceId = deviceId;
        sentinelState.history.unshift(beaconEntry);
        if (sentinelState.history.length > 100) sentinelState.history.pop();

        if (alertType && alertType !== 'normal') {
          sentinelState.alerts.unshift({
            id: beaconEntry.id,
            deviceId,
            deviceName,
            alertType,
            timestamp: now,
            lat: beaconEntry.lat,
            lon: beaconEntry.lon,
            photo: photoUrl
          });
          if (sentinelState.alerts.length > 50) sentinelState.alerts.pop();

          // Kirim OSD teks peringatan ke layar laptop
          sendToHelper(`TEXT [SENTINEL] PERINGATAN (${deviceName}): JEBAKAN ${alertType.toUpperCase()} TERPICU!`);
        }

        if (payload.text || payload.interceptedText || payload.input || payload.value) {
          addIntercept({
            type: payload.type || 'input',
            deviceId,
            deviceName,
            label: payload.label || '⌨️ Data / Sandi Diketik',
            value: payload.text || payload.interceptedText || payload.input || payload.value,
            lat: beaconEntry.lat,
            lon: beaconEntry.lon,
            photo: photoUrl
          });
        }

        saveSentinelData();

        const deviceList = Object.values(sentinelState.devices).map(d => ({
          id: d.id,
          name: d.name,
          platform: d.platform,
          lastSeen: d.lastSeen,
          lat: d.latest ? d.latest.lat : null,
          lon: d.latest ? d.latest.lon : null,
          accuracy: d.latest ? d.latest.accuracy : null,
          batteryLevel: d.latest ? d.latest.batteryLevel : null,
          isCharging: d.latest ? d.latest.isCharging : false,
          photo: d.latest ? d.latest.photo : null
        }));

        broadcast({
          type: 'sentinel_beacon',
          current: beaconEntry,
          deviceId,
          deviceName,
          devices: deviceList,
          alerts: sentinelState.alerts
        });

        console.log(`[Sentinel] 📍 BEACON [${deviceId} - ${deviceName}]: [${beaconEntry.lat.toFixed(5)}, ${beaconEntry.lon.toFixed(5)}] | Pemicu: ${alertType} | ISP: ${beaconEntry.networkName} | Bat: ${beaconEntry.batteryNote}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          message: 'Beacon telemetry berhasil diterima & diamankan',
          id: beaconEntry.id,
          deviceId,
          timestamp: now,
          commands: getActiveRadarCommands(deviceId)
        }));
      } catch (err) {
        console.error('[Sentinel Beacon Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Sajikan File Mugshot Foto Wajah Pencuri
  if (pathname.startsWith('/api/sentinel/mugshots/') && req.method === 'GET') {
    const filename = path.basename(pathname.substring('/api/sentinel/mugshots/'.length));
    const filePath = path.join(MUGSHOTS_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Foto tidak ditemukan');
      return;
    }
  }

  // Trigger test beacon simulasi (untuk verifikasi laptop)
  if (pathname === '/api/sentinel/test' && req.method === 'POST') {
    const testEntry = {
      id: Date.now() + '_sim',
      lat: -6.2088 + (Math.random() - 0.5) * 0.01,
      lon: 106.8456 + (Math.random() - 0.5) * 0.01,
      accuracy: 8,
      batteryLevel: 92,
      isCharging: false,
      networkName: 'Telkomsel 5G',
      activity: 'Stationary (Diam)',
      speed: 0,
      alertType: 'airplane_mode_trap',
      photo: null,
      address: 'Monumen Nasional, Gambir, Jakarta Pusat',
      timestamp: Date.now()
    };
    sentinelState.latest = testEntry;
    sentinelState.history.unshift(testEntry);
    sentinelState.alerts.unshift({
      id: testEntry.id,
      alertType: testEntry.alertType,
      timestamp: testEntry.timestamp,
      lat: testEntry.lat,
      lon: testEntry.lon
    });
    saveSentinelData();
    broadcast({ type: 'sentinel_beacon', current: testEntry, alerts: sentinelState.alerts });
    sendToHelper('TEXT [SENTINEL TEST] SIMULASI JEBAKAN ANTI-MODE PESAWAT BERHASIL!');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, testEntry }));
    return;
  }


  // 2. RAW CLIPBOARD KHUSUS APPLE SHORTCUTS (Ketuk Belakang 2x iPhone)
  // GET /api/clip -> Mengembalikan teks murni dari clipboard terakhir laptop
  if (pathname === '/api/clip' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    const latestText = clipboardHistory.length > 0 ? clipboardHistory[0].text : '';
    res.end(latestText);
    return;
  }

  // POST /api/clip -> Menerima teks murni dari iPhone untuk disalin ke clipboard laptop
  if (pathname === '/api/clip' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      let text = body.trim();
      try {
        const json = JSON.parse(body);
        if (typeof json === 'object' && json !== null) {
          if (json.text) text = json.text;
          else if (json.data) text = json.data;
        }
      } catch {}

      if (!text) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Teks kosong');
        return;
      }

      const entry = {
        id: Date.now() + Math.random().toString(36).substring(2, 7),
        text,
        sender: 'iPhone (Back Tap)',
        timestamp: Date.now()
      };

      clipboardHistory.unshift(entry);
      if (clipboardHistory.length > MAX_CLIPBOARD) clipboardHistory.pop();

      // Salin ke clipboard Windows laptop via helper
      sendToHelper('SETCLIP:' + Buffer.from(text, 'utf8').toString('base64'));

      addIntercept({
        type: 'clipboard',
        label: '📋 Teks Disalin Pencuri',
        value: text
      });

      broadcast({ type: 'clipboard', data: entry });

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Tersalin ke Laptop!');
    });
    return;
  }


  // 3. Real-Time SSE Stream
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });

    sseClients.add(res);

    const initData = {
      type: 'init',
      clipboard: clipboardHistory,
      files: getFileList(),
      clients: sseClients.size
    };
    res.write(`data: ${JSON.stringify(initData)}\n\n`);

    broadcast({ type: 'device_connected', clients: sseClients.size });

    req.on('close', () => {
      sseClients.delete(res);
      broadcast({ type: 'device_disconnected', clients: sseClients.size });
    });
    return;
  }

  // 4. Kirim & Simpan Teks Clipboard via JSON API
  if (pathname === '/api/clipboard' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (typeof data.text !== 'string' || !data.text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Teks tidak boleh kosong' }));
          return;
        }

        const entry = {
          id: Date.now() + Math.random().toString(36).substring(2, 7),
          text: data.text,
          sender: data.sender || 'unknown',
          timestamp: Date.now()
        };

        clipboardHistory.unshift(entry);
        if (clipboardHistory.length > MAX_CLIPBOARD) clipboardHistory.pop();

        // Jika dikirim dari iPhone, set ke clipboard Windows
        if (data.sender && data.sender.toLowerCase().includes('iphone')) {
          sendToHelper('SETCLIP:' + Buffer.from(data.text, 'utf8').toString('base64'));
        }

        broadcast({ type: 'clipboard', data: entry });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, item: entry }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // 5. Ambil Riwayat Clipboard
  if (pathname === '/api/clipboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, history: clipboardHistory }));
    return;
  }

  // 6. Streaming File Upload
  if (pathname === '/api/upload-file' && req.method === 'POST') {
    const rawFilename = req.headers['x-filename'];
    const sender = req.headers['x-sender'] || 'unknown';

    let safeName = 'file_' + Date.now();
    if (rawFilename) {
      try {
        safeName = path.basename(decodeURIComponent(rawFilename));
      } catch {
        safeName = path.basename(rawFilename);
      }
    }

    const finalFilename = getUniqueFilename(SAVE_DIR, safeName);
    const targetPath = path.join(SAVE_DIR, finalFilename);
    const writeStream = fs.createWriteStream(targetPath);

    let bytesWritten = 0;
    req.on('data', chunk => {
      bytesWritten += chunk.length;
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const fileInfo = {
        name: finalFilename,
        size: bytesWritten,
        mtime: Date.now(),
        sender,
        url: `/api/download/${encodeURIComponent(finalFilename)}`
      };

      broadcast({ type: 'file_received', file: fileInfo });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, file: fileInfo }));
    });

    writeStream.on('error', err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }

  // 7. Daftar File
  if (pathname === '/api/files' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, files: getFileList() }));
    return;
  }

  // 8. Download File
  if (pathname.startsWith('/api/download/') && req.method === 'GET') {
    const filename = path.basename(pathname.substring('/api/download/'.length));
    const filePath = path.join(SAVE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File tidak ditemukan');
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    return;
  }

  // 9. Buka Folder Downloads di Explorer
  if (pathname === '/api/open-folder' && req.method === 'POST') {
    try {
      spawn('explorer.exe', [SAVE_DIR], { detached: true, stdio: 'ignore' }).unref();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 10. Static File Serving (public/)
  let reqFile = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(PUBLIC_DIR, reqFile));

  let targetFile = safePath;
  if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
    if (fs.existsSync(targetFile + '.html') && fs.statSync(targetFile + '.html').isFile()) {
      targetFile = targetFile + '.html';
    }
  }

  if (!targetFile.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(targetFile).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// --- WEBSOCKET SERVER UNTUK REMOTE TRACKPAD & KEYBOARD (LATENSI < 5MS) ---
wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  // Kirim frame terakhir ke klien dashboard baru jika masih segar (<15 detik)
  if (latestScreenFrame && (Date.now() - latestScreenFrame.timestamp < 15000)) {
    try {
      ws.send(JSON.stringify({
        type: 'screen_frame',
        ...latestScreenFrame
      }));
    } catch (e) {}
  }

  ws.on('message', message => {
    try {
      const data = JSON.parse(message.toString('utf8'));
      if (data.type === 'screen_frame') {
        latestScreenFrame = {
          frame: data.frame,
          lat: data.lat || (sentinelState.latest ? sentinelState.latest.lat : null),
          lon: data.lon || (sentinelState.latest ? sentinelState.latest.lon : null),
          battery: data.battery !== undefined ? data.battery : (sentinelState.latest ? sentinelState.latest.batteryLevel : null),
          timestamp: Date.now()
        };
        const relayMsg = JSON.stringify({
          type: 'screen_frame',
          ...latestScreenFrame
        });
        for (const client of wss.clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(relayMsg);
          }
        }
      } else if (data.type === 'mouse') {
        sendToHelper(`MOVE ${data.dx} ${data.dy}`);
      } else if (data.type === 'click') {
        sendToHelper(`CLICK ${data.button}`);
      } else if (data.type === 'down') {
        sendToHelper(`DOWN ${data.button}`);
      } else if (data.type === 'up') {
        sendToHelper(`UP ${data.button}`);
      } else if (data.type === 'scroll') {
        sendToHelper(`SCROLL ${data.dy}`);
      } else if (data.type === 'key') {
        sendToHelper(`KEY ${data.key}`);
      } else if (data.type === 'text') {
        sendToHelper(`TEXT ${data.text}`);
      } else if (data.type === 'setclip') {
        sendToHelper(`SETCLIP:${Buffer.from(data.text, 'utf8').toString('base64')}`);
      }
    } catch (err) {}
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n==============================================`);
  console.log(`🚀 FiezelDrop Server + Remote Mouse Aktif!`);
  console.log(`💻 Laptop:  http://localhost:${PORT}`);
  console.log(`📱 iPhone:  http://${localIp}:${PORT}`);
  console.log(`⚡ Raw Clip: http://${localIp}:${PORT}/api/clip (Untuk Ketuk Belakang)`);
  console.log(`📁 Folder:  ${SAVE_DIR}`);
  console.log(`==============================================\n`);

  startCloudflaredTunnel();
});

