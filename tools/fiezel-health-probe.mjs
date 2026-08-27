#!/usr/bin/env node
/**
 * tools/fiezel-health-probe.mjs — PEMANTAUAN arsitektur jembatan edge FIEZEL.
 *
 * Node murni (>=18), NOL dependency, boleh dijalankan berulang kali (idempoten,
 * tidak menulis apa pun kecuali diminta lewat `--out=`).
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Sejak `api.fiezel.my.id` menjadi proxy PHP di origin ArenHost yang meneruskan
 * ke Worker `fiezel-api` (lihat `deploy/edge/README.md`), ada beberapa titik gagal
 * yang TIDAK terlihat dari luar — halaman depan bisa hijau sementara murid tidak
 * bisa memakai apa pun:
 *
 *   (a) jembatan PHP di origin (satu proses PHP di hosting bersama);
 *   (b) Worker `fiezel-api` di Cloudflare;
 *   (c) penjaga edge `X-Fiezel-Edge` — kalau secret proxy dan secret Worker tidak
 *       sinkron, SEMUA murid dapat 403. Kalau penjaganya justru MATI, alamat
 *       `*.workers.dev` terbuka lebar (deploy/edge/README.md §3);
 *   (d) sertifikat wildcard Let's Encrypt yang harus diperbarui;
 *   (e) batas plan gratis (CPU 10 ms/request, KV 1.000 tulis/hari, Workers AI
 *       10.000 neuron/hari — docs/CF-MIGRATION-RUNBOOK.md Bagian 5).
 *
 * Probe ini memeriksa (a)-(d) dari luar TANPA satu pun rahasia. Untuk (e) ia
 * TIDAK berpura-pura: angka kuota hanya ada di API/dashboard Cloudflare yang
 * butuh token akun, dan memuat token ke skrip pemantauan berarti menaruh kunci
 * akun di tempat yang dijalankan cron. Jadi (e) dilaporkan sebagai INFO berisi
 * ambang + tempat melihatnya, bukan sebagai angka palsu.
 *
 * ==========================================================================
 * ATURAN RAHASIA (dijaga `health-probe-test.js`)
 * ==========================================================================
 * - Tidak ada secret, token, atau header edge di berkas ini, dan ia TIDAK membaca
 *   env secret apa pun.
 * - `/health` butuh header `X-Fiezel-Edge`. Probe ini TIDAK mengirimnya: ia
 *   memeriksa `/health` LEWAT jembatan `api.fiezel.my.id`, yang menyisipkan header
 *   itu di origin. Itulah cara memeriksa payload `/health` tanpa memegang secret.
 * - `/healthz` ada justru supaya monitor eksternal tidak pernah perlu header
 *   (deploy/edge/README.md §4 (e)).
 * - Satu-satunya alamat internal Cloudflare yang disebut adalah
 *   `fiezel-api.fitrajft.workers.dev`, dan HANYA untuk membuktikan ia menjawab 403.
 *
 * ==========================================================================
 * CARA PAKAI
 * ==========================================================================
 *   node tools/fiezel-health-probe.mjs                 # produksi: ringkasan + JSON
 *   node tools/fiezel-health-probe.mjs --json          # hanya JSON (untuk cron/alat)
 *   node tools/fiezel-health-probe.mjs --out=x.json    # simpan JSON ke berkas
 *   node tools/fiezel-health-probe.mjs --selftest      # 11 skenario, NOL jaringan luar
 *   node tools/fiezel-health-probe.mjs --selftest --scenario=sehat
 *
 * Exit code: 0 = tidak ada KRITIS (boleh ada PERINGATAN). 1 = ada KRITIS.
 * Runbook per gejala: `tools/fiezel-health-probe.md`.
 */

'use strict';

import dnsPromises from 'node:dns/promises';
import tls from 'node:tls';
import fs from 'node:fs';

/* =======================================================================================
 * Konfigurasi: alamat publik + acuan latensi TERUKUR
 * ===================================================================================== */

const TARGETS = {
  bridge: 'https://api.fiezel.my.id',
  workersDev: 'https://fiezel-api.fitrajft.workers.dev',
  site: 'https://fiezel.my.id'
};

const PROTOCOL = '1.7';
const CERT_HOST = 'api.fiezel.my.id';
const MAIL_DOMAIN = 'fiezel.my.id';
const CERT_WARN_DAYS = 21;
const TIMEOUT_MS = 20000;

// Acuan latensi. HANYA angka yang benar-benar sudah diukur dipakai sebagai ambang;
// sisanya `null` dan dilaporkan apa adanya. Ambang PERINGATAN = 2x acuan hangat.
// Sumber: deploy/edge/README.md §5 — hop PHP tambahan pada `/health` terukur
// 2.214 ms saat dingin, lalu ~1.051–1.163 ms saat hangat.
const BASELINE = {
  warmMs: 1163,
  coldMs: 2214,
  source: 'deploy/edge/README.md §5 (hop jembatan PHP, terukur)'
};
const LATENCY_FACTOR = 2;

// Batas plan gratis — dilaporkan sebagai INFO, bukan diukur (butuh token akun).
// Sumber: docs/CF-MIGRATION-RUNBOOK.md Bagian 5 (tabel keputusan).
const FREE_PLAN_LIMITS = [
  { id: 'cpu', batas: 'CPU 10 ms / request', ambangTindak: 'p99 CPU > 8 ms atau ada satu pun error 1102', lihat: 'Workers & Pages -> fiezel-api -> Metrics (CPU Time p99) + Logs' },
  { id: 'kv', batas: 'KV 1.000 tulis/hari (Free)', ambangTindak: '> 700 tulis/hari = curigai bug menulis KV per-request', lihat: 'Workers KV -> namespace CFG -> Metrics' },
  { id: 'neuron', batas: 'Workers AI 10.000 neuron/hari (kolam SELURUH akun)', ambangTindak: '> 8.000 neuron/hari (GLOBAL_NEURON_CAP = 8000)', lihat: 'AI -> Workers AI -> Neurons used (today)' }
];

/* =======================================================================================
 * Argumen
 * ===================================================================================== */

const argv = process.argv.slice(2);
const flag = name => argv.includes('--' + name);
const value = name => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
};

const MODE_SELFTEST = flag('selftest');
const JSON_ONLY = flag('json');
const OUT_PATH = value('out');
const SCENARIO_NAME = value('scenario');

/* =======================================================================================
 * Status & pengumpul
 * ===================================================================================== */

const OK = 'OK';
const WARN = 'PERINGATAN';
const CRIT = 'KRITIS';
const INFO = 'INFO';

const LABEL = {
  [OK]: 'OK        ',
  [WARN]: 'PERINGATAN',
  [CRIT]: 'KRITIS    ',
  [INFO]: 'INFO      '
};

/* =======================================================================================
 * Lapis I/O — satu-satunya tempat jaringan disentuh.
 * Mode selftest mengganti seluruh lapis ini dengan lapis loopback + fixture,
 * dan memasang penjaga yang MENOLAK host non-loopback (bukan sekadar berjanji).
 * ===================================================================================== */

function isLoopback(urlText) {
  try {
    const host = new URL(urlText).hostname.replace(/^\[|\]$/g, '');
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '0.0.0.0';
  } catch { return false; }
}

function makeRealIo() {
  return {
    kind: 'produksi',
    nonLoopbackAllowed: true,
    attempts: [],
    async httpGet(url) {
      const started = process.hrtime.bigint();
      this.attempts.push(url);
      try {
        const res = await fetch(url, {
          redirect: 'manual',
          headers: { 'user-agent': 'fiezel-health-probe/1 (+tools/fiezel-health-probe.md)' },
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        const text = await res.text();
        return { ok: true, status: res.status, body: text, ms: msSince(started) };
      } catch (err) {
        return { ok: false, status: 0, body: '', ms: msSince(started), error: String(err && err.message || err) };
      }
    },
    async certInfo(host) {
      const started = process.hrtime.bigint();
      return new Promise(resolve => {
        const socket = tls.connect({ host, port: 443, servername: host, timeout: TIMEOUT_MS }, () => {
          const cert = socket.getPeerCertificate(false) || {};
          socket.end();
          resolve({
            ok: true,
            ms: msSince(started),
            validTo: cert.valid_to || null,
            validFrom: cert.valid_from || null,
            issuer: (cert.issuer && (cert.issuer.O || cert.issuer.CN)) || null,
            subject: (cert.subject && cert.subject.CN) || null
          });
        });
        socket.setTimeout(TIMEOUT_MS, () => { socket.destroy(); resolve({ ok: false, ms: msSince(started), error: 'timeout handshake TLS' }); });
        socket.on('error', err => resolve({ ok: false, ms: msSince(started), error: String(err && err.message || err) }));
      });
    },
    async mail(domain) {
      const started = process.hrtime.bigint();
      const out = { ok: true, ms: 0, mx: [], txt: [], errors: [] };
      try { out.mx = await dnsPromises.resolveMx(domain); } catch (err) { out.errors.push('MX: ' + (err && err.code || err)); }
      try { out.txt = (await dnsPromises.resolveTxt(domain)).map(parts => parts.join('')); } catch (err) { out.errors.push('TXT: ' + (err && err.code || err)); }
      out.ms = msSince(started);
      return out;
    }
  };
}

const msSince = started => Number(process.hrtime.bigint() - started) / 1e6;

/* =======================================================================================
 * Pemeriksaan
 * ===================================================================================== */

function parseJsonBody(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function latencyVerdict(ms, baselineMs) {
  if (baselineMs === null || !Number.isFinite(ms)) return { warn: false, ambangMs: null };
  const ambangMs = baselineMs * LATENCY_FACTOR;
  return { warn: ms > ambangMs, ambangMs };
}

/**
 * Satu pemeriksaan = { id, judul, status, pesan, target, ms, acuanMs, ambangMs, detail }
 * Aturan derajat:
 *   KRITIS      = situs/API mati, penjaga edge mati, protokol tidak cocok, MX hilang,
 *                 sertifikat kedaluwarsa/handshake gagal.
 *   PERINGATAN  = latensi di atas 2x acuan, sertifikat < 21 hari, SPF hilang,
 *                 status workers.dev tak terduga selain 200.
 */
async function runChecks(io, targets) {
  const checks = [];
  const push = c => { checks.push(c); return c; };

  // ---- 1 & 2. Situs murid ------------------------------------------------------------
  for (const [id, judul, url] of [
    ['situs_utama', 'Situs utama (halaman depan)', targets.site + '/'],
    ['situs_aplikasi', 'Aplikasi murid /app/', targets.site + '/app/']
  ]) {
    const res = await io.httpGet(url);
    const lat = latencyVerdict(res.ms, null);
    if (!res.ok) push({ id, judul, status: CRIT, pesan: 'tidak bisa dihubungi: ' + res.error, target: url, ms: res.ms, acuanMs: null, ambangMs: null });
    else if (res.status !== 200) push({ id, judul, status: CRIT, pesan: 'HTTP ' + res.status + ' (harus 200) — situs murid mati', target: url, ms: res.ms, acuanMs: null, ambangMs: null });
    else push({ id, judul, status: lat.warn ? WARN : OK, pesan: 'HTTP 200', target: url, ms: res.ms, acuanMs: null, ambangMs: lat.ambangMs });
  }

  // ---- 3. /health lewat jembatan (header disisipkan origin, BUKAN oleh probe) --------
  {
    const url = targets.bridge + '/health';
    const res = await io.httpGet(url);
    const lat = latencyVerdict(res.ms, BASELINE.warmMs);
    const body = parseJsonBody(res.body);
    const detail = body ? { protocol: body.protocol ?? null, edgeGuard: body.edgeGuard ?? null, plan: body.plan ?? null, service: body.service ?? null } : null;
    let status = OK;
    const pesan = [];
    if (!res.ok) { status = CRIT; pesan.push('tidak bisa dihubungi: ' + res.error); }
    else if (res.status !== 200) { status = CRIT; pesan.push('HTTP ' + res.status + ' (harus 200) — API murid mati'); }
    else if (!body) { status = CRIT; pesan.push('jawaban bukan JSON — jembatan PHP mengembalikan sesuatu yang lain'); }
    else {
      if (body.protocol !== PROTOCOL) { status = CRIT; pesan.push('protocol="' + body.protocol + '" (harus "' + PROTOCOL + '")'); }
      if (body.edgeGuard !== 'on') { status = CRIT; pesan.push('edgeGuard="' + body.edgeGuard + '" (harus "on") — penjaga edge MATI, alamat workers.dev terbuka'); }
      if (status === OK) pesan.push('HTTP 200, protocol="' + PROTOCOL + '", edgeGuard="on"');
    }
    if (status === OK && lat.warn) { status = WARN; pesan.push('latensi ' + res.ms.toFixed(0) + ' ms > 2x acuan hangat ' + BASELINE.warmMs + ' ms'); }
    push({ id: 'jembatan_health', judul: '/health lewat jembatan api.fiezel.my.id', status, pesan: pesan.join('; '), target: url, ms: res.ms, acuanMs: BASELINE.warmMs, ambangMs: lat.ambangMs, detail });
  }

  // ---- 4. /healthz (jalur bebas-header untuk monitor eksternal) ----------------------
  {
    const url = targets.bridge + '/healthz';
    const res = await io.httpGet(url);
    const lat = latencyVerdict(res.ms, BASELINE.warmMs);
    const body = parseJsonBody(res.body);
    let status = OK;
    const pesan = [];
    if (!res.ok) { status = CRIT; pesan.push('tidak bisa dihubungi: ' + res.error); }
    else if (res.status !== 200) { status = CRIT; pesan.push('HTTP ' + res.status + ' (harus 200)'); }
    else if (!body || body.ok !== true) { status = CRIT; pesan.push('jawaban tidak {"ok":true,...}'); }
    else if (body.protocol !== PROTOCOL) { status = CRIT; pesan.push('protocol="' + body.protocol + '" (harus "' + PROTOCOL + '")'); }
    else pesan.push('HTTP 200, ok:true, protocol="' + PROTOCOL + '"');
    // Kebocoran ke arah sebaliknya: /healthz TIDAK boleh mengumumkan capabilities.
    if (status === OK && body && ('capabilities' in body)) { status = CRIT; pesan.push('/healthz membocorkan capabilities — peta permukaan serang'); }
    if (status === OK && lat.warn) { status = WARN; pesan.push('latensi ' + res.ms.toFixed(0) + ' ms > 2x acuan hangat ' + BASELINE.warmMs + ' ms'); }
    push({ id: 'jembatan_healthz', judul: '/healthz (jalur monitor tanpa header)', status, pesan: pesan.join('; '), target: url, ms: res.ms, acuanMs: BASELINE.warmMs, ambangMs: lat.ambangMs, detail: body ? { keys: Object.keys(body) } : null });
  }

  // ---- 5. Penjaga edge dari luar: workers.dev HARUS 403 -----------------------------
  // ARAHNYA MUDAH TERBALIK, jadi ditulis eksplisit: 403 = SEHAT. 200 = KRITIS.
  {
    const url = targets.workersDev + '/health';
    const res = await io.httpGet(url);
    let status;
    let pesan;
    if (!res.ok) { status = WARN; pesan = 'tidak bisa dihubungi: ' + res.error + ' (tidak membuktikan penjaga hidup maupun mati)'; }
    else if (res.status === 200) { status = CRIT; pesan = 'HTTP 200 — PENJAGA EDGE MATI. Alamat workers.dev terbuka: siapa pun bisa POST /api/auth/anon, menulis D1, dan menguras kuota gratis'; }
    else if (res.status === 403) { status = OK; pesan = 'HTTP 403 (penjaga edge hidup — inilah jawaban yang benar)'; }
    else { status = WARN; pesan = 'HTTP ' + res.status + ' (harus 403; bukan 200 jadi belum tentu celah, tapi tidak sesuai kontrak)'; }
    push({ id: 'penjaga_workers_dev', judul: 'Akses langsung workers.dev harus 403', status, pesan, target: url, ms: res.ms, acuanMs: null, ambangMs: null, detail: { statusDiharapkan: 403, statusKritis: 200 } });
  }

  // ---- 6. Sertifikat TLS -------------------------------------------------------------
  {
    const info = await io.certInfo(CERT_HOST);
    let status;
    let pesan;
    let sisaHari = null;
    if (!info.ok) { status = CRIT; pesan = 'handshake TLS gagal: ' + info.error; }
    else if (!info.validTo) { status = CRIT; pesan = 'sertifikat tanpa tanggal kedaluwarsa yang bisa dibaca'; }
    else {
      const expiry = new Date(info.validTo).getTime();
      sisaHari = Math.floor((expiry - Date.now()) / 86400000);
      if (!Number.isFinite(sisaHari)) { status = CRIT; pesan = 'tanggal kedaluwarsa tidak bisa diurai: ' + info.validTo; }
      else if (sisaHari <= 0) { status = CRIT; pesan = 'sertifikat KEDALUWARSA (' + info.validTo + ')'; }
      else if (sisaHari < CERT_WARN_DAYS) { status = WARN; pesan = 'sisa ' + sisaHari + ' hari (< ' + CERT_WARN_DAYS + ') — pembaruan belum terjadi'; }
      else { status = OK; pesan = 'sisa ' + sisaHari + ' hari (kedaluwarsa ' + info.validTo + ')'; }
    }
    push({ id: 'sertifikat_api', judul: 'Sertifikat ' + CERT_HOST, status, pesan, target: 'tls://' + CERT_HOST + ':443', ms: info.ms, acuanMs: null, ambangMs: null, detail: { sisaHari, validTo: info.validTo || null, issuer: info.issuer || null, subject: info.subject || null, ambangPeringatanHari: CERT_WARN_DAYS } });
  }

  // ---- 7 & 8. MX + SPF ---------------------------------------------------------------
  {
    const mail = await io.mail(MAIL_DOMAIN);
    const mx = Array.isArray(mail.mx) ? mail.mx : [];
    const spf = (Array.isArray(mail.txt) ? mail.txt : []).filter(t => /^v=spf1\b/i.test(t.trim()));
    push({
      id: 'dns_mx',
      judul: 'MX ' + MAIL_DOMAIN,
      status: mx.length ? OK : CRIT,
      pesan: mx.length
        ? mx.length + ' record: ' + mx.map(r => r.exchange + '(' + r.priority + ')').join(', ')
        : 'TIDAK ADA record MX — email domain mati, semua surat masuk memantul' + (mail.errors.length ? ' [' + mail.errors.join('; ') + ']' : ''),
      target: 'dns:MX/' + MAIL_DOMAIN, ms: mail.ms, acuanMs: null, ambangMs: null, detail: { jumlah: mx.length }
    });
    push({
      id: 'dns_spf',
      judul: 'SPF ' + MAIL_DOMAIN,
      status: spf.length === 1 ? OK : WARN,
      pesan: spf.length === 1
        ? spf[0]
        : (spf.length === 0
          ? 'TIDAK ADA TXT v=spf1 — email keluar akan masuk spam / ditolak'
          : spf.length + ' record SPF sekaligus (harus tepat 1; lebih dari satu = SPF permerror)'),
      target: 'dns:TXT/' + MAIL_DOMAIN, ms: mail.ms, acuanMs: null, ambangMs: null, detail: { jumlahSpf: spf.length }
    });
  }

  // ---- INFO. Batas plan gratis: tidak diukur, dan itu dinyatakan ---------------------
  push({
    id: 'batas_plan_gratis',
    judul: 'Batas plan gratis (CPU/KV/neuron)',
    status: INFO,
    pesan: 'TIDAK diukur probe ini — angkanya hanya ada di dashboard/API Cloudflare yang butuh token akun, dan probe ini sengaja tidak memuat rahasia. Periksa manual: ' + FREE_PLAN_LIMITS.map(l => l.id + ' (' + l.ambangTindak + ')').join(' | '),
    target: 'dashboard Cloudflare',
    ms: 0, acuanMs: null, ambangMs: null,
    detail: { limits: FREE_PLAN_LIMITS, sumber: 'docs/CF-MIGRATION-RUNBOOK.md Bagian 5' }
  });

  return checks;
}

/* =======================================================================================
 * Laporan
 * ===================================================================================== */

const TINDAKAN = {
  situs_utama: 'Periksa origin ArenHost (cPanel: apakah akun kena batas proses/disk). Runbook: tools/fiezel-health-probe.md §Situs mati.',
  situs_aplikasi: 'Sama seperti situs utama; kalau halaman depan 200 tapi /app/ tidak, curigai berkas app yang hilang saat unggah terakhir.',
  jembatan_health: 'Kalau HTTP != 200: origin PHP atau Worker mati. Kalau edgeGuard != "on": secret Worker hilang/tidak sinkron -> pasang ulang PROXY DULU, Worker belakangan (deploy/edge/README.md §4). Kalau protocol beda: klien dan Worker beda versi.',
  jembatan_healthz: 'Route bebas-header ini yang dipakai monitor eksternal. Kalau mati sementara /health hidup, curigai allowlist path di ~/public_html/api/index.php.',
  penjaga_workers_dev: '200 = CELAH TERBUKA. Pasang ulang secret bersama edge — PROXY DULU, Worker belakangan (jangan dibalik: urutan terbalik = 403 untuk semua murid). Nama secret, perintahnya, dan curl verifikasinya ada di deploy/edge/README.md §3-§4.',
  sertifikat_api: 'Perbarui AutoSSL/Let\'s Encrypt di cPanel (Security -> SSL/TLS Status -> Run AutoSSL). < 21 hari = pembaruan otomatis sudah gagal sekali.',
  dns_mx: 'Pulihkan record MX di panel DNS reseller (ArenHost/PT Digital Registra). Tanpa MX, email domain memantul total.',
  dns_spf: 'Pulihkan satu record TXT v=spf1 (tepat satu; lebih dari satu = permerror).',
  batas_plan_gratis: 'Buka dashboard: CPU Time p99, KV writes/hari, Neurons used today. Ambang di docs/CF-MIGRATION-RUNBOOK.md Bagian 5.'
};

function buildReport(checks, meta) {
  const counts = { OK: 0, PERINGATAN: 0, KRITIS: 0, INFO: 0 };
  for (const c of checks) counts[c.status] += 1;
  const kritis = checks.filter(c => c.status === CRIT);
  return {
    schema: 'fiezel-health-probe-v1',
    mode: meta.mode,
    scenario: meta.scenario || null,
    waktu: new Date().toISOString(),
    pass: kritis.length === 0,
    exitCode: kritis.length === 0 ? 0 : 1,
    acuanLatensi: BASELINE,
    faktorAmbangLatensi: LATENCY_FACTOR,
    counts,
    kritis: kritis.map(c => c.id),
    peringatan: checks.filter(c => c.status === WARN).map(c => c.id),
    jaringan: meta.jaringan,
    checks: checks.map(c => Object.assign({}, c, { tindakan: c.status === OK || c.status === INFO ? null : (TINDAKAN[c.id] || null) }))
  };
}

function humanSummary(report) {
  const lines = [];
  lines.push('FIEZEL health probe — ' + report.waktu + ' (mode: ' + report.mode + (report.scenario ? '/' + report.scenario : '') + ')');
  lines.push('Acuan latensi: hangat ' + BASELINE.warmMs + ' ms, dingin ' + BASELINE.coldMs + ' ms — ' + BASELINE.source
    + '. PERINGATAN bila > ' + LATENCY_FACTOR + 'x hangat (' + BASELINE.warmMs * LATENCY_FACTOR + ' ms).');
  lines.push('');
  for (const c of report.checks) {
    const ms = Number.isFinite(c.ms) ? c.ms.toFixed(0).padStart(5) + ' ms' : '    - ms';
    lines.push('[' + LABEL[c.status] + '] ' + ms + '  ' + c.judul);
    lines.push('              ' + c.pesan);
    if (c.tindakan) lines.push('              TINDAKAN: ' + c.tindakan);
  }
  lines.push('');
  lines.push('Ringkas: KRITIS ' + report.counts.KRITIS + ' | PERINGATAN ' + report.counts.PERINGATAN
    + ' | OK ' + report.counts.OK + ' | INFO ' + report.counts.INFO);
  lines.push(report.pass
    ? 'HASIL: TIDAK ADA KEGAGALAN KRITIS (exit 0)' + (report.counts.PERINGATAN ? ' — ada ' + report.counts.PERINGATAN + ' peringatan yang harus ditindak sebelum jadi kritis' : '')
    : 'HASIL: ADA ' + report.counts.KRITIS + ' KEGAGALAN KRITIS (exit 1): ' + report.kritis.join(', '));
  return lines.join('\n');
}

function emit(report) {
  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(humanSummary(report) + '\n\n');
    process.stdout.write('----- JSON -----\n' + JSON.stringify(report, null, 2) + '\n');
  }
  if (OUT_PATH) fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2) + '\n');
}

/* =======================================================================================
 * SELFTEST — nol jaringan luar, server HTTP loopback + fixture TLS/DNS
 * ===================================================================================== */

const SEHAT = {
  siteRoot: { status: 200, body: '<!DOCTYPE html><title>FIEZEL</title>' },
  siteApp: { status: 200, body: '<!DOCTYPE html><title>FIEZEL app</title>' },
  health: { status: 200, json: { status: 'ok', service: 'fiezel-api', protocol: PROTOCOL, plan: 'free-tier', edgeGuard: 'on', capabilities: ['alrs'] } },
  healthz: { status: 200, json: { ok: true, protocol: PROTOCOL } },
  workersDev: { status: 403, json: { error: 'forbidden_edge' } },
  cert: { hariSisa: 89, issuer: "Let's Encrypt" },
  mx: [{ exchange: 'fiezel.my.id', priority: 0 }],
  txt: ['v=spf1 +a +mx ~all']
};

const clone = obj => JSON.parse(JSON.stringify(obj));
const fixture = patch => Object.assign(clone(SEHAT), patch);

// Setiap skenario menyatakan apa yang HARUS terjadi. Kalau probe menyimpulkan lain,
// selftest merah — inilah yang mencegah arah `403 vs 200` terbalik tanpa ada yang tahu.
const SCENARIOS = [
  { name: 'sehat', fx: fixture({}), exit: 0, kritis: [], peringatan: [] },
  { name: 'workers_dev_terbuka', fx: fixture({ workersDev: { status: 200, json: { status: 'ok', protocol: PROTOCOL } } }), exit: 1, kritis: ['penjaga_workers_dev'], peringatan: [] },
  { name: 'workers_dev_404', fx: fixture({ workersDev: { status: 404, json: { error: 'not_found' } } }), exit: 0, kritis: [], peringatan: ['penjaga_workers_dev'] },
  { name: 'penjaga_off', fx: fixture({ health: { status: 200, json: { status: 'ok', protocol: PROTOCOL, edgeGuard: 'off' } } }), exit: 1, kritis: ['jembatan_health'], peringatan: [] },
  { name: 'protokol_tidak_cocok', fx: fixture({ health: { status: 200, json: { status: 'ok', protocol: '1.6', edgeGuard: 'on' } } }), exit: 1, kritis: ['jembatan_health'], peringatan: [] },
  { name: 'api_mati', fx: fixture({ health: { status: 502, body: 'Bad Gateway' }, healthz: { status: 502, body: 'Bad Gateway' } }), exit: 1, kritis: ['jembatan_health', 'jembatan_healthz'], peringatan: [] },
  { name: 'situs_mati', fx: fixture({ siteRoot: { status: 503, body: 'maintenance' }, siteApp: { status: 503, body: 'maintenance' } }), exit: 1, kritis: ['situs_utama', 'situs_aplikasi'], peringatan: [] },
  { name: 'healthz_membocorkan', fx: fixture({ healthz: { status: 200, json: { ok: true, protocol: PROTOCOL, capabilities: ['alrs'] } } }), exit: 1, kritis: ['jembatan_healthz'], peringatan: [] },
  { name: 'latensi_tinggi', fx: fixture({ health: { status: 200, json: SEHAT.health.json, delayMs: BASELINE.warmMs * LATENCY_FACTOR + 250 } }), exit: 0, kritis: [], peringatan: ['jembatan_health'] },
  { name: 'sertifikat_mendekat', fx: fixture({ cert: { hariSisa: 9, issuer: "Let's Encrypt" } }), exit: 0, kritis: [], peringatan: ['sertifikat_api'] },
  { name: 'sertifikat_kedaluwarsa', fx: fixture({ cert: { hariSisa: -2, issuer: "Let's Encrypt" } }), exit: 1, kritis: ['sertifikat_api'], peringatan: [] },
  { name: 'mx_hilang', fx: fixture({ mx: [] }), exit: 1, kritis: ['dns_mx'], peringatan: [] },
  { name: 'spf_hilang', fx: fixture({ txt: ['google-site-verification=abc'] }), exit: 0, kritis: [], peringatan: ['dns_spf'] }
];

async function startFixtureServer(fx) {
  const http = await import('node:http');
  const routes = {
    '/x/site/': fx.siteRoot,
    '/x/site/app/': fx.siteApp,
    '/x/bridge/health': fx.health,
    '/x/bridge/healthz': fx.healthz,
    '/x/wd/health': fx.workersDev
  };
  const server = http.createServer(async (req, res) => {
    const spec = routes[req.url];
    if (!spec) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('fixture tidak terdaftar: ' + req.url); return; }
    if (spec.delayMs) await new Promise(r => setTimeout(r, spec.delayMs));
    const payload = spec.json ? JSON.stringify(spec.json) : String(spec.body ?? '');
    res.writeHead(spec.status, { 'content-type': spec.json ? 'application/json' : 'text/html' });
    res.end(payload);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

function makeFixtureIo(fx, port) {
  const real = makeRealIo();
  return {
    kind: 'selftest',
    nonLoopbackAllowed: false,
    attempts: [],
    pelanggaran: [],
    async httpGet(url) {
      this.attempts.push(url);
      // PENJAGA: dalam selftest, host non-loopback DITOLAK di sini — tidak ada paket
      // yang keluar mesin, dan pelanggarannya tercatat alih-alih dipercaya tidak terjadi.
      if (!isLoopback(url)) {
        this.pelanggaran.push(url);
        return { ok: false, status: 0, body: '', ms: 0, error: 'selftest menolak host non-loopback: ' + url };
      }
      return real.httpGet(url);
    },
    async certInfo(host) {
      this.attempts.push('tls://' + host);
      if (fx.cert === null) return { ok: false, ms: 1, error: 'handshake ditolak (fixture)' };
      const validTo = new Date(Date.now() + fx.cert.hariSisa * 86400000 + 3600000);
      return { ok: true, ms: 2, validTo: validTo.toUTCString(), validFrom: new Date(Date.now() - 86400000).toUTCString(), issuer: fx.cert.issuer, subject: host };
    },
    async mail() {
      this.attempts.push('dns://fixture');
      return { ok: true, ms: 1, mx: fx.mx, txt: fx.txt, errors: [] };
    },
    targets: {
      site: 'http://127.0.0.1:' + port + '/x/site',
      bridge: 'http://127.0.0.1:' + port + '/x/bridge',
      workersDev: 'http://127.0.0.1:' + port + '/x/wd'
    }
  };
}

async function runScenario(scn) {
  const { server, port } = await startFixtureServer(scn.fx);
  const io = makeFixtureIo(scn.fx, port);
  try {
    const checks = await runChecks(io, io.targets);
    const report = buildReport(checks, {
      mode: 'selftest',
      scenario: scn.name,
      jaringan: { kind: io.kind, nonLoopbackAttempts: io.pelanggaran.length, nonLoopback: io.pelanggaran, targets: io.attempts }
    });
    return report;
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function compareScenario(scn, report) {
  const problems = [];
  const sorted = a => [...a].sort().join(',');
  if (report.exitCode !== scn.exit) problems.push('exitCode=' + report.exitCode + ' (harus ' + scn.exit + ')');
  if (sorted(report.kritis) !== sorted(scn.kritis)) problems.push('kritis=[' + report.kritis + '] (harus [' + scn.kritis + '])');
  if (sorted(report.peringatan) !== sorted(scn.peringatan)) problems.push('peringatan=[' + report.peringatan + '] (harus [' + scn.peringatan + '])');
  if (report.jaringan.nonLoopbackAttempts !== 0) problems.push('menembak host non-loopback: ' + report.jaringan.nonLoopback.join(', '));
  return problems;
}

async function main() {
  if (MODE_SELFTEST && SCENARIO_NAME) {
    // Satu skenario, semantik NYATA (exit code = derajat terburuk). Dipakai gerbang
    // `health-probe-test.js` untuk membuktikan exit code, bukan hanya isi laporan.
    const scn = SCENARIOS.find(s => s.name === SCENARIO_NAME);
    if (!scn) { process.stderr.write('skenario tidak dikenal: ' + SCENARIO_NAME + '\nada: ' + SCENARIOS.map(s => s.name).join(', ') + '\n'); process.exit(2); }
    const report = await runScenario(scn);
    emit(report);
    process.exit(report.exitCode);
  }

  if (MODE_SELFTEST) {
    const hasil = [];
    let gagal = 0;
    for (const scn of SCENARIOS) {
      const report = await runScenario(scn);
      const problems = compareScenario(scn, report);
      if (problems.length) gagal += 1;
      hasil.push({ skenario: scn.name, status: problems.length ? 'FAIL' : 'PASS', diharapkan: { exit: scn.exit, kritis: scn.kritis, peringatan: scn.peringatan }, didapat: { exit: report.exitCode, kritis: report.kritis, peringatan: report.peringatan }, masalah: problems, nonLoopbackAttempts: report.jaringan.nonLoopbackAttempts });
    }
    const out = {
      schema: 'fiezel-health-probe-selftest-v1',
      pass: gagal === 0,
      total: hasil.length,
      gagal,
      nonLoopbackAttempts: hasil.reduce((n, h) => n + h.nonLoopbackAttempts, 0),
      hasil
    };
    if (JSON_ONLY) process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    else {
      for (const h of hasil) process.stdout.write('[' + (h.status === 'PASS' ? 'OK        ' : 'GAGAL     ') + '] ' + h.skenario + (h.masalah.length ? ' — ' + h.masalah.join('; ') : '') + '\n');
      process.stdout.write('\nselftest probe: ' + (gagal === 0 ? 'PASS' : 'FAIL') + ' (' + (hasil.length - gagal) + '/' + hasil.length + ' skenario, ' + out.nonLoopbackAttempts + ' percobaan non-loopback)\n');
      process.stdout.write('----- JSON -----\n' + JSON.stringify(out, null, 2) + '\n');
    }
    if (OUT_PATH) fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
    process.exit(gagal === 0 ? 0 : 1);
  }

  const io = makeRealIo();
  const checks = await runChecks(io, TARGETS);
  const report = buildReport(checks, { mode: 'produksi', jaringan: { kind: io.kind, nonLoopbackAttempts: null, nonLoopback: [], targets: io.attempts } });
  emit(report);
  process.exit(report.exitCode);
}

main().catch(err => {
  process.stderr.write('probe gagal total: ' + (err && err.stack || err) + '\n');
  process.exit(1);
});
