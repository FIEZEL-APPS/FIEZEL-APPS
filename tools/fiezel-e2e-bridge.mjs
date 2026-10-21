#!/usr/bin/env node
// tools/fiezel-e2e-bridge.mjs — uji E2E BROWSER untuk jembatan `api.fiezel.my.id`.
//
// ==========================================================================================
// APA YANG DIBUKTIKAN DI SINI, DAN KENAPA `curl` TIDAK CUKUP
// ==========================================================================================
// `tests/cf-live-contract-test.js` sudah membuktikan Worker + jembatan PHP menjawab benar lewat
// HTTP nyata (33 assert). Yang TIDAK bisa dibuktikan alat baris perintah:
//
//   1. Apakah aplikasi FIEZEL yang sesungguhnya — index.html + app.js, dimuat browser dengan
//      urutan <script defer> apa adanya — benar-benar MENYENTUH jembatan itu, dan hanya
//      ketika flag-nya menyalakannya. `curl` menembak URL; ia tidak pernah menjalankan
//      `cfEndpointMode()`.
//   2. Apakah cookie `fz_id` (HttpOnly/Secure/SameSite=Lax/Domain=fiezel.my.id) benar-benar
//      TERSIMPAN di jar browser dan TERKIRIM ULANG pada permintaan berikutnya. `curl -c/-b`
//      membuktikan servernya mengirim atribut yang benar; ia tidak membuktikan Chromium
//      menerima cookie itu dan mau memasangnya lagi. SameSite=Lax lintas subdomain adalah
//      keputusan browser, bukan keputusan server: dokumen di `https://fiezel.my.id` dan API
//      di `https://api.fiezel.my.id` harus dinilai same-site (registrable domain sama, skema
//      sama — "schemeful same-site") supaya cookie ikut terkirim. Kalau salah satu syarat
//      itu patah, identitas murid patah, dan HANYA browser yang bisa mengatakannya.
//   3. Apakah ada KEBOCORAN saat semua flag mati: nol permintaan ke jembatan.
//   4. Apakah browser pernah menyentuh `*.workers.dev` langsung (harus NOL: aplikasi hanya
//      boleh berbicara dengan domainnya sendiri; alamat workers.dev memang dijawab 403,
//      tetapi permintaannya sendiri sudah membocorkan alamat asal dan menambah satu hop).
//
// ==========================================================================================
// KENAPA HALAMAN DISAJIKAN SEBAGAI `https://fiezel.my.id` (bukan 127.0.0.1)
// ==========================================================================================
// Tiga sifat produksi hilang kalau halaman diuji di `http://127.0.0.1:PORT`:
//   - `Origin: http://127.0.0.1:PORT` BUKAN anggota `ALLOWED_ORIGINS`, jadi jembatan menolak
//     (403) dan yang teruji tinggal penolakannya, bukan jalurnya;
//   - cookie `Secure` tidak akan dipasang dari konteks non-secure;
//   - `SameSite=Lax` + schemeful-same-site menolak cookie lintas skema/site, jadi bukti
//     terpenting paket kerja ini (nomor 2 di atas) jadi mustahil.
// Karena itu berkas ini menyalakan server HTTPS loopback dengan sertifikat self-signed dan
// menyuruh Chromium MEMETAKAN nama `fiezel.my.id:443` ke port loopback itu
// (`--host-resolver-rules=MAP fiezel.my.id:443 127.0.0.1:<port>`). `api.fiezel.my.id` TIDAK
// dipetakan: ia diresolusi DNS seperti biasa dan yang dijawab adalah jembatan sungguhan.
// Hasilnya: origin, skema, dan registrable domain persis seperti produksi — cookie
// `Domain=fiezel.my.id` bahkan menjadi cookie PIHAK PERTAMA seperti di ponsel murid.
// Sertifikat self-signed ditolak service worker (`sw.js` tidak terdaftar). Itu disengaja dan
// dicatat: gerbang ini menguji jalur jaringan, bukan lapisan cache PWA (yang dijaga
// `tests/pwa-cache-test.js` dan `tests/sw-corp-test.js`).
//
// ==========================================================================================
// FLAG DI-OVERRIDE TANPA MENYENTUH BERKAS REPO
// ==========================================================================================
// `core-config.js` menulis `self.FIEZEL_CF_CONFIG=Object.freeze({...})` — assignment biasa,
// jadi nilai yang ditaruh lebih awal akan DITIMPA. `addInitScript` di bawah memasang
// accessor: getter mengembalikan konfigurasi skenario, setter MENELAN tulisan dari
// `core-config.js`. Tidak satu byte pun berkas repo berubah, dan aplikasi yang berjalan
// adalah `app.js` apa adanya.
//
// ==========================================================================================
// MODE SKIP JUJUR
// ==========================================================================================
// Tanpa `FIEZEL_E2E_BRIDGE_BASE` berkas ini mencetak alasan lalu exit 0. SKIP BUKAN PASS
// (`status:'SKIP'`, `pass:null`). Sengaja tanpa nilai bawaan: satu URL bawaan akan membuat
// CI mana pun menembak produksi pada setiap push. Karena itu pula gerbang ini TIDAK
// didaftarkan di `.github/workflows/quality.yml`; yang didaftarkan adalah
// `tests/e2e-bridge-selftest.js` yang membuktikan gerbang ini bisa merah, seluruhnya di loopback.
//
// Kebenarannya sendiri dibuktikan `tests/e2e-bridge-selftest.js`: satu aplikasi+jembatan tiruan
// yang BENAR (gerbang harus hijau) dan 14 yang SALAH (gerbang harus merah pada id assert
// yang tepat).
//
// ENV:
//   FIEZEL_E2E_BRIDGE_BASE   (wajib)  base jembatan, mis. https://api.fiezel.my.id
//   FIEZEL_E2E_APP_DIR       akar yang disajikan (bawaan: akar repo)
//   FIEZEL_E2E_APP_HOST      nama host halaman (bawaan: fiezel.my.id)
//   FIEZEL_E2E_COOKIE_DOMAIN Domain cookie yang diharapkan (bawaan: fiezel.my.id)
//   FIEZEL_E2E_PROTOCOL      protokol yang diharapkan di /api/config (bawaan: 1.7)
//   FIEZEL_E2E_HOST_MAP      pemetaan host tambahan `host=127.0.0.1:port,...` (dipakai self-test)
//   FIEZEL_E2E_REPORT        tujuan laporan JSON (bawaan: <repo>/E2E-BRIDGE-REPORT.json)
//   FIEZEL_E2E_SHOT_DIR      folder screenshot (opsional)
//   FIEZEL_E2E_CONFIG_DELAY  ms penundaan buatan di atas jawaban /api/config yang NYATA
//                            (bawaan 3000) — dipakai membuktikan boot tidak diblokir
//   FIEZEL_E2E_BOOT_TIMEOUT  batas tunggu boot per skenario, ms (bawaan 30000)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

const env = process.env;
const BASE_RAW = String(env.FIEZEL_E2E_BRIDGE_BASE || '').trim();
const APP_DIR = path.resolve(env.FIEZEL_E2E_APP_DIR || REPO);
const APP_HOST = String(env.FIEZEL_E2E_APP_HOST || 'fiezel.my.id').trim();
const COOKIE_DOMAIN = String(env.FIEZEL_E2E_COOKIE_DOMAIN || 'fiezel.my.id').trim();
const PROTOCOL = String(env.FIEZEL_E2E_PROTOCOL || '1.7').trim();
const REPORT_PATH = path.resolve(env.FIEZEL_E2E_REPORT || path.join(REPO, 'E2E-BRIDGE-REPORT.json'));
// Jalur SKIP TIDAK menulis laporan kecuali tujuannya dipilih eksplisit. Alasannya konkret:
// tests/no-network-test.js menjalankan berkas ini tanpa env untuk membuktikan SKIP-nya bersih, dan
// versi pertama menjatuhkan E2E-BRIDGE-REPORT.json ke akar repo setiap kali gerbang itu
// jalan - artefak yang mengotori working tree hanya karena ada uji lain yang memeriksanya.
const REPORT_EXPLICIT = !!env.FIEZEL_E2E_REPORT;
const SHOT_DIR = env.FIEZEL_E2E_SHOT_DIR ? path.resolve(env.FIEZEL_E2E_SHOT_DIR) : '';
// Penundaan buatan atas jawaban /api/config. Harus JAUH lebih besar dari waktu boot
// aplikasi nyata (terukur ~3,5 s di ponsel 390px), kalau tidak assert `config-non-blocking`
// jadi lomba antara boot lambat dan jawaban cepat, bukan uji pemblokiran.
// F6: bawaannya diturunkan 8000 -> 4500 ms. 8000 ms sama dengan anggaran klien untuk
// `/api/config` (core-config.js `timeoutMs`), jadi penundaan sebesar itu SELALU dibatalkan
// klien dan assert `config-protocol`/`config-flags-present`/`config-non-blocking` tidak
// pernah bisa hijau: yang diuji jadi "apakah klien menyerah", bukan "apakah boot ditahan".
// 4500 ms tetap ~1 s di atas waktu boot terukur (~3,5 s) plus NONBLOCK_MARGIN, jadi jawaban
// config masih pasti datang SESUDAH render, dan 4500 + latensi terburuk 2,0 s = 6,5 s masih
// di bawah anggaran 8000 ms. Assert-nya tidak dilunakkan; hanya penundaannya dibuat mungkin.
const CONFIG_DELAY = Number(env.FIEZEL_E2E_CONFIG_DELAY || 4500);
// Margin kejujuran: "render mendahului jawaban config" hanya dihitung bukti kalau
// selisihnya di luar jitter pengukuran.
const NONBLOCK_MARGIN = 100;
const BOOT_TIMEOUT = Number(env.FIEZEL_E2E_BOOT_TIMEOUT || 30000);
const CALL_TIMEOUT = 15000;
// Kestabilan hop: berapa panggilan beruntun, dan batas sabar per panggilan. 8 detik bukan
// angka manis - jawaban hangat jembatan ini 0,8-2,2 detik, jadi 8 detik sudah 4x lipat batas
// terburuk yang wajar. Apa pun di atas itu adalah gantung, bukan lambat.
// Ambang teks "aplikasi ter-render": teks STATIS yang tercat di index.html (splash + topbar)
// hanya ~75 karakter, jadi 200 memaksa isi yang benar-benar dibuat skrip. Diturunkan sedikit
// pun gerbang mulai menghitung markup statis sebagai boot.
const BOOT_MIN_TEXT = 200;
const HOP_CALLS = 3;
const HOP_TIMEOUT = 8000;

const checks = [];
const network = [];
let failed = false;
// Tiga status, bukan dua. `INCONCLUSIVE` ada karena satu assert di gerbang ini
// (presedensi flag server dua arah) hanya bisa diuji kalau KEADAAN SERVER memungkinkan:
// ia butuh sekurangnya satu flag server bernilai true DAN satu bernilai false dalam putaran
// yang sama. Kalau keadaan itu tidak ada, satu-satunya jawaban jujur adalah "tidak bisa
// disimpulkan" — dan itu BUKAN lulus. Karena itu `INCONCLUSIVE` ikut menjatuhkan `failed`:
// gerbang yang tidak bisa membuktikan sesuatu tidak boleh mengaku hijau.
const checkStatus = (id, name, status, details) => {
  checks.push({ id, name, status, details: String(details) });
  if (status !== 'PASS') failed = true;
};
const check = (id, name, ok, details) => checkStatus(id, name, ok ? 'PASS' : 'FAIL', details);

function writeReport(extra) {
  const report = {
    schema: 'fiezel-e2e-bridge-v1',
    ...extra,
    counts: {
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length,
      inconclusive: checks.filter(c => c.status === 'INCONCLUSIVE').length
    },
    checks,
    network
  };
  if (report.status !== 'SKIP' || REPORT_EXPLICIT) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

/* =========================================================================================
 * 0. SKIP jujur
 * ======================================================================================= */
if (!BASE_RAW) {
  const report = writeReport({
    status: 'SKIP',
    pass: null,
    reason: 'FIEZEL_E2E_BRIDGE_BASE tidak diset',
    belumTerbukti: [
      'aplikasi sungguhan menyentuh jembatan hanya ketika flag menyalakannya',
      'cookie fz_id tersimpan di jar browser dan terkirim ulang (SameSite=Lax lintas subdomain)',
      'nol permintaan ke jembatan saat semua flag mati',
      'nol permintaan langsung ke *.workers.dev dari browser'
    ]
  });
  console.log(JSON.stringify(report, null, 2));
  console.log('E2E jembatan: SKIP — FIEZEL_E2E_BRIDGE_BASE tidak diset, jadi TIDAK ADA yang ditembak.');
  console.log('SKIP bukan PASS: keempat hal di `belumTerbukti` masih BELUM terbukti oleh berkas ini.');
  console.log('Untuk menjalankan sungguhan: FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id node tools/fiezel-e2e-bridge.mjs');
  process.exit(0);
}

let BRIDGE;
try {
  BRIDGE = new URL(BASE_RAW);
  if (!/^https?:$/.test(BRIDGE.protocol)) throw new Error('skema bukan http/https');
} catch (error) {
  writeReport({ status: 'FAIL', pass: false, reason: `FIEZEL_E2E_BRIDGE_BASE tidak sah: ${error.message}` });
  console.error(`E2E jembatan: MERAH — base URL tidak sah (${BASE_RAW}). Env diset = niat menguji, jadi typo harus terlihat.`);
  process.exit(1);
}
const BRIDGE_ORIGIN = BRIDGE.origin;
const BRIDGE_HOST = BRIDGE.hostname;
const bridgeUrl = p => BRIDGE_ORIGIN + p;

/* =========================================================================================
 * 1. Dependensi: Playwright + Chromium + openssl
 * ======================================================================================= */
let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch (error) {
  writeReport({ status: 'FAIL', pass: false, reason: 'playwright tidak bisa diimpor: ' + String(error?.message || error) });
  console.error('E2E jembatan: MERAH — `playwright` tidak tersedia, jadi tidak ada browser sungguhan.');
  console.error('Ini BUKAN SKIP: env base sudah diset, artinya ada niat menguji. Pasang playwright + Chromium lalu ulangi.');
  process.exit(1);
}

function makeCert(dir) {
  const key = path.join(dir, 'e2e-key.pem');
  const cert = path.join(dir, 'e2e-cert.pem');
  const extraHosts = String(env.FIEZEL_E2E_HOST_MAP || '')
    .split(',').map(s => s.split('=')[0].trim()).filter(Boolean);
  const names = [...new Set([APP_HOST, ...extraHosts, 'localhost'])];
  const san = names.map(n => `DNS:${n}`).join(',') + ',IP:127.0.0.1';
  const run = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '2',
    '-subj', `/CN=${APP_HOST}`, '-addext', `subjectAltName=${san}`
  ], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error('openssl gagal membuat sertifikat: ' + String(run.stderr || '').slice(0, 300));
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

/* =========================================================================================
 * 2. Server statis loopback (HTTPS) untuk worktree
 * ======================================================================================= */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8'
};

function startAppServer(tls) {
  const server = https.createServer(tls, (request, response) => {
    let pathname = '/';
    try { pathname = decodeURIComponent(new URL(request.url, 'https://local').pathname); } catch { /* biarkan */ }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(APP_DIR, relative);
    if (target !== APP_DIR && !target.startsWith(APP_DIR + path.sep)) {
      response.writeHead(403); return response.end('Forbidden');
    }
    fs.readFile(target, (error, content) => {
      if (error) { response.writeHead(404, { 'Content-Type': 'text/plain' }); return response.end('Not found'); }
      response.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/* =========================================================================================
 * 3. Probe boot: kapan aplikasi benar-benar TERLIHAT oleh murid
 * ======================================================================================= */
// Dipasang lewat addInitScript, jadi ia hidup sebelum satu pun <script> aplikasi berjalan.
//
// KENAPA BUKAN "#app berisi teks" DAN BUKAN "body berisi teks":
//   - `#app` TIDAK PERNAH terisi pada boot pertama murid baru: yang tampil adalah lapisan
//     onboarding ("Halo! Aku Fiezel. Nama kamu siapa?"), bukan isi `#app`. Probe versi
//     pertama memakai `#app` dan karena itu melaporkan "tidak pernah boot" untuk aplikasi
//     yang jelas-jelas ter-render di screenshot. Itu bug probe, dan diperbaiki di sini.
//   - `document.body.innerText` sudah berisi ~75 karakter pada 269 ms TANPA satu pun skrip
//     aplikasi berjalan, karena splash frame-pertama dan topbar adalah markup statis di
//     index.html. Memakainya berarti gerbang mengaku "boot" bahkan kalau app.js gagal dimuat,
//     dan assert "boot tidak diblokir jawaban /api/config" jadi bohong: splash statis tetap
//     tercat walau boot memang diblokir.
// Karena itu kesiapan diukur dari MUTASI DOM: satu elemen yang DITAMBAHKAN skrip (di luar
// subtree splash statis) dan membawa >= minText karakter teks. Itu bukti JS benar-benar
// berjalan sampai mencat isi, bukan bukti HTML statis terkirim.
const BOOT_PROBE = ({ cfg, minText }) => {
  let value = cfg;
  Object.defineProperty(window, 'FIEZEL_CF_CONFIG', {
    configurable: true,
    get: () => value,
    set: () => { /* tulisan dari core-config.js sengaja ditelan: override skenario menang */ }
  });
  window.__FIEZEL_E2E_BOOT = { startEpoch: Date.now(), readyEpoch: 0, textLen: 0, minText, addedNodes: 0, staticNodes: 0, dclEpoch: 0 };
  const inStaticSplash = node => {
    let el = node;
    while (el) {
      if (el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-fiezel-boot-splash')) return true;
      el = el.parentNode;
    }
    return false;
  };
  // Yang DITOLAK, dan kenapa:
  //   - BODY/HTML: ditambahkan PARSER, bukan skrip. Percobaan pertama tidak menolaknya dan
  //     langsung "siap" pada 79 ms dengan 5495 karakter - itu isi statis index.html plus teks
  //     di dalam <script> inline, bukan satu byte pun hasil render aplikasi.
  //   - SCRIPT/STYLE/TEMPLATE/NOSCRIPT/LINK: `textContent` mereka bukan teks yang dilihat
  //     murid. Karena itu ukurannya `innerText` (yang menuntut tata letak dan mengabaikan
  //     simpul non-render), bukan `textContent`.
  //   - node yang tidak tercat (`getClientRects()` kosong): ada di DOM tapi tidak di layar.
  const SKIP_TAGS = { HTML: 1, BODY: 1, HEAD: 1, SCRIPT: 1, STYLE: 1, TEMPLATE: 1, NOSCRIPT: 1, LINK: 1, META: 1 };
  // ATURAN TERAKHIR, dan yang paling menentukan: simpul yang sudah ada saat DOMContentLoaded
  // adalah MARKUP STATIS, bukan bukti aplikasi hidup. Tanpa aturan ini probe bisa ditipu oleh
  // index.html yang isinya panjang tetapi nol render JS - dan itu bukan dugaan: kontrol negatif
  // di tests/e2e-bridge-selftest.js ("isi HANYA markup statis") membuat gerbang HIJAU, dan skenario
  // "aplikasi MENAHAN boot sampai /api/config datang" pun lolos karena alasan yang sama.
  // Aplikasi FIEZEL sungguhan me-render ~3,5 s sesudah DOMContentLoaded, jadi aturan ini tidak
  // memotong apa pun yang nyata.
  let dclSeen = false;
  const consider = node => {
    const boot = window.__FIEZEL_E2E_BOOT;
    if (boot.readyEpoch || !node || node.nodeType !== 1) return;
    if (!dclSeen) { boot.staticNodes += 1; return; }
    if (SKIP_TAGS[node.tagName] || inStaticSplash(node)) return;
    boot.addedNodes += 1;
    if (!node.isConnected) return;
    let painted = false;
    try { painted = node.getClientRects().length > 0; } catch (e) { painted = false; }
    if (!painted) return;
    const text = String(node.innerText || '').replace(/\s+/g, ' ').trim();
    if (text.length > boot.textLen) boot.textLen = text.length;
    if (text.length >= boot.minText) boot.readyEpoch = Date.now();
  };
  const pending = [];
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      consider(node);
      if (dclSeen && node.nodeType === 1 && pending.length < 400) pending.push(node);
    }
  });
  // Simpul bisa disisipkan lebih dulu dan baru tercat satu frame kemudian (atau baru terisi
  // teks sesudahnya). Karena itu simpul yang sudah lewat ditimbang ULANG secara berkala,
  // bukan sekali saat disisipkan.
  const sweep = setInterval(() => {
    const boot = window.__FIEZEL_E2E_BOOT;
    if (boot.readyEpoch) { clearInterval(sweep); return; }
    for (const node of pending) consider(node);
  }, 100);
  const attach = () => { try { observer.observe(document.documentElement || document, { childList: true, subtree: true }); } catch (e) { /* dokumen belum ada */ } };
  attach();
  document.addEventListener('readystatechange', attach);
  const markDcl = () => {
    if (dclSeen) return;
    dclSeen = true;
    window.__FIEZEL_E2E_BOOT.dclEpoch = Date.now();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markDcl, { once: true });
  else markDcl();
  setTimeout(() => { try { observer.disconnect(); clearInterval(sweep); } catch (e) { /* sudah lepas */ } }, 60000);
  // Jalur pemanggil tunggal untuk gerbang: SELALU lewat fungsi transport aplikasi sendiri,
  // dengan batas waktu di dalam halaman (jalur Puter bisa menggantung selamanya kalau SDK
  // pihak ketiganya tidak pernah datang — dan menggantung bukan alasan untuk gerbang bisu).
  window.__FIEZEL_E2E_CALL = async (path, options, ms) => {
    const started = Date.now();
    const call = (async () => {
      if (typeof window.coreWorkerExec !== 'function') return { error: 'coreWorkerExec tidak ada di window' };
      try {
        const response = await window.coreWorkerExec(path, options || {});
        let body = '';
        try { body = String(await response.text()).slice(0, 400); } catch { body = ''; }
        return { ok: !!response.ok, status: Number(response.status || 0), body };
      } catch (error) { return { error: String(error && error.message || error) }; }
    })();
    const guard = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), ms || 15000));
    const result = await Promise.race([call, guard]);
    return { ...result, ms: Date.now() - started };
  };
};

/* =========================================================================================
 * 4. Skenario
 * ======================================================================================= */
const OFF = { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off' };
const scenarioLog = [];

// Nama keenam skenario, urut. Dipakai dua kali: menghitung berapa yang HARUS jalan, dan
// menolak nilai FIEZEL_E2E_ONLY yang salah tulis (typo yang membuat gerbang menguji nol
// skenario adalah gerbang yang hijau karena diam).
const ALL_SCENARIOS = ['A-semua-off', 'A2-enabled-false', 'B-config-on', 'C0-pra-auth', 'C-auth-on', 'D-hop-stabil'];
// FIEZEL_E2E_ONLY membatasi skenario yang dijalankan. Gunanya BUKAN untuk jalan hidup
// (di sana selalu keenamnya): `tests/e2e-bridge-selftest.js` menjalankan gerbang ini puluhan kali
// terhadap aplikasi+jembatan tiruan, dan tiap kasus salah hanya butuh satu-dua skenario.
// Tanpa ini satu matriks self-test memakan belasan menit dan tak akan pernah dijalankan.
const ONLY = String(env.FIEZEL_E2E_ONLY || '').split(',').map(x => x.trim()).filter(Boolean);
const badOnly = ONLY.filter(o => !ALL_SCENARIOS.some(n => n.startsWith(o)));
if (badOnly.length) {
  writeReport({ status: 'FAIL', pass: false, reason: 'FIEZEL_E2E_ONLY memuat nama skenario tak dikenal: ' + badOnly.join(',') });
  console.error('E2E jembatan: MERAH — FIEZEL_E2E_ONLY tak dikenal (' + badOnly.join(',') + '). Nama yang sah: ' + ALL_SCENARIOS.join(', '));
  process.exit(1);
}
const wanted = name => !ONLY.length || ONLY.some(o => name.startsWith(o));
const EXPECTED_SCENARIOS = ALL_SCENARIOS.filter(wanted).length;

// SATU BROWSER PER SKENARIO, bukan satu browser untuk semuanya. Alasannya bukan kerapian:
// kumpulan soket Chromium dibagi antar BrowserContext, dan jembatan ini TERBUKTI menggantung
// permintaan ke-3 dan seterusnya pada satu koneksi (lihat assert `bridge-hop-stable` dan
// reports/add-a5-e2e.md). Kalau soketnya diwarisi, kegagalan skenario belakangan tidak bisa
// dibedakan dari warisan skenario sebelumnya, dan gerbang yang tidak bisa menunjuk penyebab
// tidak berguna.
async function withScenario({ name, cfg, delayConfig = false, cookies = null }, body) {
  if (!wanted(name)) return;
  const browser = await launchBrowser();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  if (cookies && cookies.length) await context.addCookies(cookies);
  let configFulfilledAt = 0;
  const requests = [];
  const responses = [];
  const byRequest = new Map();
  const noteHeaders = async request => {
    const entry = byRequest.get(request);
    if (!entry) return;
    try {
      const headers = await request.allHeaders();
      entry.cookieHeader = String(headers.cookie || '');
      entry.headersRead = true;
    } catch { /* permintaan dibatalkan sebelum header kabel terbentuk */ }
  };
  context.on('requestfinished', noteHeaders);
  context.on('requestfailed', noteHeaders);
  context.on('request', request => {
    let host = '';
    try { host = new URL(request.url()).hostname; } catch { /* biarkan */ }
    const entry = { scenario: name, at: Date.now(), method: request.method(), url: request.url(), host, resourceType: request.resourceType(), cookieHeader: '', headersRead: false };
    requests.push(entry);
    byRequest.set(request, entry);
    // Laporan hanya memuat permintaan KELUAR dari domain sendiri (aset lokal berjumlah
    // ratusan dan tidak menjelaskan apa pun); jumlah totalnya tetap dilaporkan per skenario.
    if (host !== APP_HOST) network.push(entry);
    // Header yang BENAR-BENAR dikirim di kabel (allHeaders menunggu header nyata dan
    // menyertakan `Cookie` yang dipasang jar browser). Diisi asinkron: satu-satunya cara
    // melihat cookie HttpOnly dari sisi uji tanpa membacanya lewat JavaScript halaman
    // (mustahil, dan memang harus mustahil).
    request.allHeaders().then(headers => { if (!entry.headersRead) entry.cookieHeader = String(headers.cookie || ''); }).catch(() => { /* permintaan dibatalkan */ });
  });
  context.on('response', async response => {
    const url = response.url();
    if (!url.startsWith(BRIDGE_ORIGIN)) return;
    // Cap waktu jawaban config diambil dari peristiwa response, bukan dari handler route:
    // yang penting bagi assert `config-non-blocking` adalah kapan HALAMAN menerimanya.
    if (!configFulfilledAt && url.startsWith(BRIDGE_ORIGIN + '/api/config')) {
      // Cap waktu diambil dari TIMING BROWSER (startTime + responseStart), bukan dari
      // Date.now() saat peristiwa ini tiba di Node. Versi pertama memakai Date.now(): CDP
      // mengantar peristiwa beberapa milidetik terlambat, jadi "jawaban config" tercatat
      // LEBIH LAMBAT dari kenyataan dan aplikasi yang jelas-jelas MENAHAN boot sampai config
      // datang tetap dinilai lulus. Ketahuan lewat kontrol negatif di tests/e2e-bridge-selftest.js.
      let arrival = 0;
      try {
        const timing = response.request().timing();
        if (timing && timing.startTime > 0 && timing.responseStart >= 0) arrival = timing.startTime + timing.responseStart;
      } catch { arrival = 0; }
      configFulfilledAt = arrival || Date.now();
    }
    // Entri didaftarkan LEBIH DULU, badan diisi belakangan. Urutan sebaliknya (menunggu
    // response.text() sebelum push) membuat jawaban yang badannya tidak bisa/tidak selesai
    // dibaca - yang persis terjadi pada jawaban yang lewat page.route - hilang sama sekali
    // dari daftar, dan gerbang lalu bilang "aplikasi tidak pernah menerima jawaban" untuk
    // jawaban yang jelas diterima aplikasi. Ketahuan lewat tests/e2e-bridge-selftest.js.
    const entry = { at: Date.now(), url, status: response.status(), body: '' };
    responses.push(entry);
    try { entry.body = String(await response.text()).slice(0, 600); } catch { /* boleh kosong */ }
  });

  const page = await context.newPage();
  await page.addInitScript(BOOT_PROBE, { cfg, minText: BOOT_MIN_TEXT });
  if (delayConfig && CONFIG_DELAY > 0) {
    // Penundaan BUATAN di DEPAN permintaan NYATA: permintaannya ditahan dulu, lalu
    // diteruskan apa adanya ke jembatan sungguhan (`route.continue()`), jadi jawaban yang
    // dilihat halaman tetap jawaban jembatan - hanya datangnya sengaja terlambat. Itu satu-
    // satunya cara jujur membuktikan "boot tidak diblokir" tanpa menyentuh jembatan.
    //
    // Versi pertama memakai `route.fetch()` lalu `route.fulfill()`. Itu SALAH untuk uji
    // lokal: `route.fetch()` berjalan lewat APIRequestContext, yang menolak sertifikat
    // self-signed jembatan tiruan, jadi permintaannya di-abort dan gerbang melaporkan
    // "aplikasi tidak pernah menerima jawaban /api/config" - cacat harness yang menyamar
    // jadi cacat produk. Ketahuannya di tests/e2e-bridge-selftest.js: skenario BENAR ikut merah.
    await page.route(url => url.href.startsWith(BRIDGE_ORIGIN) && url.pathname.startsWith('/api/config'), async route => {
      await new Promise(resolve => setTimeout(resolve, CONFIG_DELAY));
      try { await route.continue(); } catch { /* halaman mungkin sudah tutup */ }
    });
  }

  const navStart = Date.now();
  let navError = '';
  try {
    await page.goto(`https://${APP_HOST}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT });
  } catch (error) { navError = String(error?.message || error).slice(0, 200); }

  // Tunggu boot TERLIHAT (bukan tunggu jaringan sunyi: aplikasi ini memang punya jalur
  // pihak ketiga yang bisa lama, dan yang penting bagi murid adalah kapan layar berisi).
  let boot = { readyEpoch: 0, textLen: 0, addedNodes: 0 };
  const deadline = Date.now() + BOOT_TIMEOUT;
  while (Date.now() < deadline) {
    try { boot = await page.evaluate(() => window.__FIEZEL_E2E_BOOT || { readyEpoch: 0, textLen: 0, addedNodes: 0 }); } catch { /* konteks sibuk */ }
    if (boot.readyEpoch) break;
    await page.waitForTimeout(100);
  }
  const bootMs = boot.readyEpoch ? boot.readyEpoch - navStart : 0;

  const api = {
    page, context, requests, responses, boot, bootMs, navStart, navError,
    configFulfilledAt: () => configFulfilledAt,
    bridgeRequests: (pathPrefix = '') => requests.filter(r => r.url.startsWith(BRIDGE_ORIGIN + pathPrefix)),
    call: async (p, options, ms = CALL_TIMEOUT) => {
      const before = requests.length;
      const result = await page.evaluate(([path, opts, timeout]) => window.__FIEZEL_E2E_CALL(path, opts, timeout), [p, options || {}, ms]);
      const fresh = requests.slice(before);
      // Tunggu header KABEL terbaca (requestfinished/requestfailed): `Cookie` hanya ada di
      // allHeaders(), dan itu baru pasti setelah permintaannya selesai atau gagal.
      const headerDeadline = Date.now() + 3000;
      while (Date.now() < headerDeadline && fresh.some(r => r.url.startsWith(BRIDGE_ORIGIN) && !r.headersRead)) {
        await page.waitForTimeout(100);
      }
      const cookieSent = fresh.filter(r => r.url.startsWith(BRIDGE_ORIGIN)).map(r => r.cookieHeader).filter(Boolean).pop() || '';
      return { ...result, newRequests: fresh, cookieSent };
    },
    shot: async label => {
      if (!SHOT_DIR) return '';
      fs.mkdirSync(SHOT_DIR, { recursive: true });
      const file = path.join(SHOT_DIR, `e2e-bridge-${label}.png`);
      try { await page.screenshot({ path: file }); } catch { return ''; }
      return file;
    }
  };

  let outcome = {};
  try { outcome = (await body(api)) || {}; } finally {
    // Jar cookie skenario ini disimpan supaya skenario berikutnya bisa MENYEMAINYA di
    // browser baru (skenario D menguji transport, bukan pembuatan identitas ulang).
    try { lastJar = await context.cookies(); } catch { /* konteks sudah tutup */ }
    scenarioLog.push({
      skenario: name,
      cfg,
      bootMs,
      bootTextLen: boot.textLen,
      bootAddedNodes: boot.addedNodes,
      navError,
      permintaanJembatan: requests.filter(r => r.url.startsWith(BRIDGE_ORIGIN)).map(r => `${r.method} ${r.url.slice(BRIDGE_ORIGIN.length) || '/'}`),
      totalPermintaan: requests.length,
      ...outcome
    });
    try { await context.close(); } catch { /* biarkan */ }
    try { await browser.close(); } catch { /* biarkan */ }
  }
}

/* =========================================================================================
 * 5. Jalankan
 * ======================================================================================= */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiezel-e2e-'));
let tls = null;
try {
  tls = makeCert(tmpDir);
} catch (error) {
  writeReport({ status: 'FAIL', pass: false, reason: String(error?.message || error) });
  console.error('E2E jembatan: MERAH — ' + String(error?.message || error));
  process.exit(1);
}

const { server, port } = await startAppServer(tls);
const hostRules = [`MAP ${APP_HOST}:443 127.0.0.1:${port}`];
for (const pair of String(env.FIEZEL_E2E_HOST_MAP || '').split(',').map(s => s.trim()).filter(Boolean)) {
  const [host, target] = pair.split('=');
  if (host && target) hostRules.push(`MAP ${host.trim()}:443 ${target.trim()}`);
}

let browserVersion = '';
let lastJar = [];
const startedAt = Date.now();

async function launchBrowser() {
  const b = await chromium.launch({
    // F6: `--disable-quic` WAJIB, dan ini bukan menyembunyikan kegagalan. Jawaban asal
    // mengiklankan `alt-svc: h3=":443"; ma=2592000`, jadi Chromium memindahkan permintaan
    // KEDUA dan seterusnya ke HTTP/3 - sementara UDP/443 dari lingkungan uji ini adalah
    // lubang hitam. Eksperimen terkontrol (tools/f6-hop-isolate.mjs, 2 vs 2 pengulangan):
    // tanpa flag ini tiga hop `/api/quota` TIDAK PERNAH dijawab (>24 s), dengan flag ini
    // ketiganya 200 dalam 0,9-1,7 s. Kontrolnya bukan hanya jembatan kita: host lain yang
    // h3-nya sehat pun menggantung 39 s dari sandbox ini sebelum jatuh balik ke h2.
    // Jadi tanpa flag ini `bridge-hop-stable` mengukur UDP lingkungan uji, bukan kestabilan
    // hop jembatan - dan itu assert yang bohong ke dua arah.
    args: [`--host-resolver-rules=${hostRules.join(',')}`, '--no-sandbox', '--disable-dev-shm-usage', '--disable-quic']
  });
  if (!browserVersion) {
    browserVersion = b.version();
    check('browser-real', 'Chromium sungguhan berjalan (anti-vakum: bukan hasil simulasi)',
      /\d+\./.test(browserVersion), 'chromium ' + browserVersion);
  }
  return b;
}

try {
  /* --- A. Semua flag OFF: tidak boleh ada satu pun permintaan ke jembatan --------------- */
  await withScenario({
    name: 'A-semua-off',
    cfg: { enabled: true, base: BRIDGE_ORIGIN, endpoints: { ...OFF } }
  }, async api => {
    const shot = await api.shot('a-semua-off');
    check('off-app-boots', 'Skenario OFF: aplikasi benar-benar ter-render oleh JS (anti-vakum untuk "nol permintaan")',
      api.boot.readyEpoch > 0, `bootMs=${api.bootMs} teksElemenTerbesar=${api.boot.textLen} char nodeDitambah=${api.boot.addedNodes}${api.navError ? ' navError=' + api.navError : ''}`);
    check('off-no-bridge-request', 'Skenario OFF: NOL permintaan ke jembatan (tidak ada kebocoran saat mati)',
      api.bridgeRequests().length === 0, api.bridgeRequests().map(r => r.method + ' ' + r.url).join(' | ') || '0 permintaan');
    return { screenshot: shot };
  });

  /* --- A'. enabled:false MENGALAHKAN semua endpoint 'on' -------------------------------- */
  await withScenario({
    name: 'A2-enabled-false',
    cfg: { enabled: false, base: BRIDGE_ORIGIN, endpoints: { health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on', tts: 'on', usage: 'on' } }
  }, async api => {
    const shot = await api.shot('a2-enabled-false');
    const call = await api.call('/api/quota', {}, 4000);
    check('disabled-app-boots', 'Rollback: aplikasi tetap ter-render dengan enabled:false',
      api.boot.readyEpoch > 0, `bootMs=${api.bootMs} teksElemenTerbesar=${api.boot.textLen} char nodeDitambah=${api.boot.addedNodes}`);
    check('disabled-no-bridge-request', 'Rollback satu nilai: enabled:false ⇒ NOL permintaan jembatan walau semua endpoint "on"',
      api.bridgeRequests().length === 0, api.bridgeRequests().map(r => r.method + ' ' + r.url).join(' | ') || '0 permintaan');
    return { screenshot: shot, panggilanQuota: call.timeout ? 'timeout (jalur non-CF)' : JSON.stringify(call).slice(0, 200) };
  });

  /* --- B. config 'on': sekali per boot, tidak memblokir, flag server MENANG ------------- */
  // Statis SEMUA 'on' dengan sengaja: itu batas ATAS yang paling agresif yang bisa dipasang
  // klien. Dengan begitu setiap keputusan "tidak jadi memanggil" pada putaran ini HANYA bisa
  // datang dari flag server, bukan dari konfigurasi klien.
  await withScenario({
    name: 'B-config-on',
    cfg: { enabled: true, base: BRIDGE_ORIGIN, endpoints: { health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on', tts: 'on', usage: 'on' } },
    delayConfig: true
  }, async api => {
    const shot = await api.shot('b-config-on');
    const configRequests = api.bridgeRequests('/api/config');
    check('config-called-once', 'config "on": aplikasi memanggil /api/config TEPAT sekali per boot',
      configRequests.length === 1, `${configRequests.length} permintaan: ` + (configRequests.map(r => r.method + ' ' + r.url).join(' | ') || '(tidak ada)'));

    // Tunggu badan jawaban config benar-benar terbaca (entri didaftarkan sebelum badannya
    // selesai dibaca, lihat listener response di atas).
    const bodyDeadline = Date.now() + 5000;
    while (Date.now() < bodyDeadline) {
      const found = api.responses.find(r => r.url.startsWith(BRIDGE_ORIGIN + '/api/config'));
      if (found && found.body) break;
      await api.page.waitForTimeout(100);
    }
    const configResponse = api.responses.find(r => r.url.startsWith(BRIDGE_ORIGIN + '/api/config'));
    let payload = null;
    try { payload = configResponse ? JSON.parse(configResponse.body) : null; } catch { payload = null; }
    check('config-protocol', `config "on": jawaban /api/config membawa protocol ${PROTOCOL}`,
      !!payload && String(payload.protocol || '') === PROTOCOL,
      payload ? 'protocol=' + String(payload.protocol || '(kosong)') : 'aplikasi tidak pernah menerima jawaban /api/config');
    const flags = payload && typeof payload.flags === 'object' && payload.flags ? payload.flags : null;
    check('config-flags-present', 'config "on": jawaban membawa objek flags TIDAK kosong (anti-vakum untuk uji kemenangan flag)',
      !!flags && Object.keys(flags).length > 0, flags ? Object.keys(flags).join(',') : '(tidak ada flags)');

    const fulfilled = api.configFulfilledAt();
    check('config-non-blocking', `config "on": boot TIDAK diblokir (isi ter-render ≥${NONBLOCK_MARGIN} ms sebelum jawaban /api/config yang ditunda ${CONFIG_DELAY} ms tiba)`,
      api.boot.readyEpoch > 0 && fulfilled > 0 && (fulfilled - api.boot.readyEpoch) > NONBLOCK_MARGIN,
      `bootReady=${api.boot.readyEpoch ? new Date(api.boot.readyEpoch).toISOString() : '(tidak pernah)'} configTiba=${fulfilled ? new Date(fulfilled).toISOString() : '(tidak pernah)'} selisih=${fulfilled && api.boot.readyEpoch ? Math.round(fulfilled - api.boot.readyEpoch) : 0} ms margin=${NONBLOCK_MARGIN} ms`);

    /* ===================================================================================
     * PRESEDENSI FLAG SERVER, DUA ARAH — pengganti assert `server-flag-wins` yang lama
     * =================================================================================
     * VERSI LAMA menuntut jembatan menjawab `flags` SEMUANYA false, lalu membuktikan satu
     * hal saja: statis 'on' + server false ⇒ nol permintaan. Dua cacat serius:
     *
     *   1. Ia menuntut KEADAAN KV yang bertentangan dengan keadaan yang dibutuhkan 12 assert
     *      lain di putaran yang sama (`cfg:flags` tahap rollout R2–R3 memang berisi
     *      cfApiEnabled/cfIdentityEnabled/cfQuotaEnabled = true). Satu putaran tidak bisa
     *      menuntut dua keadaan KV sekaligus, jadi assert itu terkunci merah selamanya
     *      bukan karena produk salah.
     *   2. Premisnya bisa dipenuhi oleh KEDIAMAN: `serverSaysOff = !flags || ...` berarti
     *      `flags` null (jawaban /api/config tidak pernah tiba) DIHITUNG memenuhi premis,
     *      dan nol permintaan karena aplikasi mati DIHITUNG lulus. Hijaunya yang lama
     *      memang HIJAU BOHONG (lihat reports/fix-f6-client-timeout.md).
     *
     * VERSI INI memakai kenyataan yang lebih kuat: flag server TIDAK seragam. Pada keadaan
     * KV hari ini `cfQuotaEnabled`/`cfIdentityEnabled` = true sementara
     * `cfAiEnabled`/`cfTtsEnabled`/`cfAnalyticsEnabled` = false. Dengan statis SEMUA 'on',
     * satu putaran bisa membuktikan presedensi ke DUA arah sekaligus:
     *
     *   - endpoint yang flag servernya TRUE  ⇒ WAJIB ada permintaan ke jembatan;
     *   - endpoint yang flag servernya FALSE ⇒ WAJIB NOL permintaan ke jembatan.
     *
     * Itu bukti yang lebih keras, karena aplikasi yang DIAM (nol permintaan untuk semua)
     * langsung merah di arah pertama, dan aplikasi yang mengabaikan flag server langsung
     * merah di arah kedua. Tidak ada satu pun keadaan di mana "tidak terjadi apa-apa"
     * terbaca sebagai lulus.
     *
     * Dan kalau keadaan KV kebetulan SERAGAM (semua true atau semua false), presedensi dua
     * arah memang TIDAK bisa diuji pada putaran itu. Jawabannya `INCONCLUSIVE`, bukan lulus.
     *
     * Peta flag di bawah adalah salinan `CF_SERVER_FLAG_FOR`/`CF_SERVER_KILL_FOR` di app.js:
     * gerbang menghitung sendiri apa yang SEHARUSNYA hidup dari jawaban server, lalu
     * membandingkannya dengan apa yang benar-benar terjadi di kabel.
     */
    // Jawaban /api/config ditunggu DULU. Tanpa penantian ini yang teruji hanyalah lomba
    // (panggilan bisa jatuh sebelum flag server sempat tiba), dan gerbang yang menguji lomba
    // akan berkedip merah-hijau tanpa ada yang berubah.
    const configDeadline = Date.now() + CONFIG_DELAY + 10000;
    while (Date.now() < configDeadline && !api.responses.some(r => r.url.startsWith(BRIDGE_ORIGIN + '/api/config'))) {
      await api.page.waitForTimeout(100);
    }
    await api.page.waitForTimeout(300); // jeda kecil: halaman perlu satu putaran untuk menyimpan flag

    const SERVER_FLAG_FOR = { auth: 'cfIdentityEnabled', quota: 'cfQuotaEnabled', ai: 'cfAiEnabled', tts: 'cfTtsEnabled', usage: 'cfAnalyticsEnabled' };
    const SERVER_KILL_FOR = { ai: ['ai', 'coach'], tts: ['tts'], usage: ['analytics'] };
    const PROBE = {
      auth: { path: '/api/auth/anon', options: { method: 'POST' }, prefix: '/api/auth' },
      quota: { path: '/api/quota', options: {}, prefix: '/api/quota' },
      ai: { path: '/api/ai/task', options: { method: 'POST' }, prefix: '/api/ai' },
      tts: { path: '/api/tts', options: { method: 'POST' }, prefix: '/api/tts' },
      usage: { path: '/api/usage', options: {}, prefix: '/api/usage' }
    };
    const kill = payload && typeof payload.enabled === 'object' && payload.enabled ? payload.enabled : null;
    // Salinan aturan app.js: sakelar induk, lalu flag bernama, lalu lapis `enabled` yang
    // hanya bisa mematikan. `!== true` (bukan `=== false`) disengaja: flag absen = mati.
    const serverAllows = key => {
      if (!flags) return false;
      if (flags.cfApiEnabled !== true) return false;
      if (flags[SERVER_FLAG_FOR[key]] !== true) return false;
      for (const feature of (SERVER_KILL_FOR[key] || [])) if (kill && kill[feature] === false) return false;
      return true;
    };
    const endpointKeys = Object.keys(SERVER_FLAG_FOR);
    const harusSampai = flags ? endpointKeys.filter(serverAllows) : [];
    const harusNol = flags ? endpointKeys.filter(k => !serverAllows(k)) : [];
    const flagDump = flags ? endpointKeys.map(k => `${k}:${SERVER_FLAG_FOR[k]}=${flags[SERVER_FLAG_FOR[k]] === true}`).join(' ') : '(tidak ada flags)';
    const partisi = `induk cfApiEnabled=${flags ? flags.cfApiEnabled === true : '(n/a)'} | ${flagDump} | harusSampai=[${harusSampai.join(',')}] harusNol=[${harusNol.join(',')}]`;

    const IDS = ['server-flag-partition', 'server-flag-wins-off', 'server-flag-wins-on'];
    const NAMES = {
      'server-flag-partition': 'Premis presedensi dua arah tersedia: jawaban /api/config SUNGGUHAN tiba dan flag server TIDAK seragam (≥1 true DAN ≥1 false)',
      'server-flag-wins-off': 'Kill switch server MENANG: endpoint yang flag servernya false ⇒ NOL permintaan ke jembatan, walau statis klien "on"',
      'server-flag-wins-on': 'Bukan diam-diam mati: endpoint yang flag servernya true ⇒ permintaan BENAR-BENAR sampai ke jembatan, dengan statis klien "on" yang sama'
    };
    let presedensi = [];
    if (!flags || Object.keys(flags).length === 0) {
      // SYARAT 1: kegagalan "aplikasi diam" TIDAK BOLEH lagi terbaca sebagai lulus. Tanpa
      // flag yang sungguhan tiba, ketiga assert ini MERAH — bukan INCONCLUSIVE, karena
      // "jawaban config tidak pernah diterima aplikasi" adalah cacat, bukan keadaan KV.
      for (const id of IDS) {
        check(id, NAMES[id], false,
          'flag server TIDAK diterima aplikasi (flags null/kosong) — premis tidak terbukti, jadi MERAH, bukan lulus. ' + partisi);
      }
    } else if (harusSampai.length === 0 || harusNol.length === 0) {
      // SYARAT 3: seluruh flag bernilai sama ⇒ presedensi dua arah tidak bisa diuji putaran
      // ini. Dilaporkan eksplisit dan TIDAK dihitung lulus (checkStatus menjatuhkan `failed`).
      for (const id of IDS) {
        checkStatus(id, NAMES[id], 'INCONCLUSIVE',
          `flag server SERAGAM, presedensi dua arah tidak bisa diuji pada keadaan KV ini. ${partisi}`);
      }
    } else {
      // Arah "harus nol" dijalankan LEBIH DULU: kalau aplikasi bocor, kebocorannya terlihat
      // sebelum panggilan sah menambah permintaan ke jembatan pada koneksi yang sama.
      for (const key of [...harusNol, ...harusSampai]) {
        const probe = PROBE[key];
        const wajibSampai = harusSampai.includes(key);
        const before = api.bridgeRequests(probe.prefix).length;
        // Endpoint yang harus MATI jatuh ke jalur non-CF (Puter) yang bisa menggantung; batas
        // pendek cukup, karena yang diukur adalah ADA/TIDAK ADA permintaan ke jembatan.
        const call = await api.call(probe.path, probe.options, wajibSampai ? 8000 : 4000);
        const after = api.bridgeRequests(probe.prefix).length;
        presedensi.push({
          endpoint: key,
          flagServer: SERVER_FLAG_FOR[key],
          nilaiFlag: flags[SERVER_FLAG_FOR[key]] === true,
          statisKlien: 'on',
          harus: wajibSampai ? 'sampai ke jembatan' : 'nol permintaan',
          permintaanBaru: after - before,
          statusHttp: call.status || 0,
          timeout: !!call.timeout,
          ms: call.ms
        });
      }
      const bocor = presedensi.filter(p => p.harus === 'nol permintaan' && p.permintaanBaru > 0);
      const bisu = presedensi.filter(p => p.harus === 'sampai ke jembatan' && p.permintaanBaru < 1);
      const rekap = presedensi.map(p => `${p.endpoint}(${p.flagServer}=${p.nilaiFlag}) ${p.harus} → ${p.permintaanBaru} permintaan${p.timeout ? ' TIMEOUT' : ' status ' + p.statusHttp}`).join(' | ');
      check('server-flag-partition', NAMES['server-flag-partition'], true, partisi);
      check('server-flag-wins-off', NAMES['server-flag-wins-off'], bocor.length === 0,
        (bocor.length ? 'BOCOR: ' + bocor.map(p => p.endpoint).join(',') + ' — ' : '') + rekap);
      check('server-flag-wins-on', NAMES['server-flag-wins-on'], bisu.length === 0,
        (bisu.length ? 'TIDAK SAMPAI: ' + bisu.map(p => p.endpoint).join(',') + ' — ' : '') + rekap);
    }
    return { screenshot: shot, configPayload: payload, presedensiFlagServer: presedensi, partisiFlag: partisi };
  });

  /* --- C0. Anti-vakum, konteks SENDIRI: tanpa cookie, /api/quota harus 401 -------------- */
  // Dipisah dari skenario C dengan sengaja: satu konteks = satu koneksi, dan permintaan ke-3
  // pada satu koneksi ke jembatan ini menggantung (assert `bridge-hop-stable`). Kalau 401
  // pra-auth ikut di konteks C, ia memakan satu slot dan bukti cookie jadi tidak terbaca
  // gara-gara cacat transport, bukan gara-gara cookie.
  await withScenario({
    name: 'C0-pra-auth',
    cfg: { enabled: true, base: BRIDGE_ORIGIN, endpoints: { ...OFF, quota: 'on' } }
  }, async api => {
    const preAuth = await api.call('/api/quota', {}, CALL_TIMEOUT);
    check('quota-401-before-auth', 'Anti-vakum: tanpa cookie, /api/quota dijawab 401 (jadi 200 sesudahnya memang karena cookie)',
      preAuth.status === 401, JSON.stringify(preAuth).slice(0, 200));
    return { panggilanQuota: JSON.stringify(preAuth).slice(0, 200) };
  });

  /* --- C. auth 'on': cookie fz_id nyata di jar browser dan terkirim ulang --------------- */
  await withScenario({
    name: 'C-auth-on',
    cfg: { enabled: true, base: BRIDGE_ORIGIN, endpoints: { ...OFF, auth: 'on', quota: 'on' } }
  }, async api => {
    const shot = await api.shot('c-auth-on');
    const anon = await api.call('/api/auth/anon', { method: 'POST' }, CALL_TIMEOUT);
    check('anon-200', 'POST /api/auth/anon lewat transport aplikasi dijawab 200',
      anon.status === 200 && anon.ok === true, JSON.stringify(anon).slice(0, 200));

    const cookies = await api.context.cookies();
    const fz = cookies.find(c => c.name === 'fz_id');
    check('cookie-present', 'Cookie fz_id BENAR-BENAR tersimpan di konteks browser (bukan hanya dikirim server)',
      !!fz, cookies.map(c => `${c.name}@${c.domain}`).join(', ') || '(jar kosong)');
    check('cookie-httponly', 'Cookie fz_id HttpOnly di jar browser', !!fz && fz.httpOnly === true, fz ? 'httpOnly=' + fz.httpOnly : '(tidak ada cookie)');
    check('cookie-secure', 'Cookie fz_id Secure di jar browser', !!fz && fz.secure === true, fz ? 'secure=' + fz.secure : '(tidak ada cookie)');
    check('cookie-samesite-lax', 'Cookie fz_id SameSite=Lax di jar browser', !!fz && String(fz.sameSite) === 'Lax', fz ? 'sameSite=' + fz.sameSite : '(tidak ada cookie)');
    const domainOk = !!fz && (fz.domain === COOKIE_DOMAIN || fz.domain === '.' + COOKIE_DOMAIN);
    check('cookie-domain', `Cookie fz_id ber-Domain ${COOKIE_DOMAIN} (bukan host-only: kalau host-only, identitas murid patah antar subdomain)`,
      domainOk, fz ? 'domain=' + fz.domain : '(tidak ada cookie)');

    // INI yang tidak bisa dibuktikan curl: browser sendiri yang memutuskan memasang cookie
    // SameSite=Lax pada permintaan lintas subdomain berikutnya.
    const replay = await api.call('/api/quota', {}, CALL_TIMEOUT);
    check('cookie-replayed', 'Browser MEMASANG kembali cookie fz_id pada permintaan berikutnya (SameSite=Lax lintas subdomain, dinilai browser)',
      /(^|;\s*)fz_id=/.test(replay.cookieSent || ''), replay.cookieSent ? 'Cookie: ' + String(replay.cookieSent).slice(0, 90) : '(header Cookie kosong pada permintaan /api/quota)');
    check('quota-200-after-auth', 'Dengan cookie itu, /api/quota dijawab 200 oleh jembatan',
      replay.status === 200 && replay.ok === true, JSON.stringify({ ...replay, newRequests: undefined }).slice(0, 240));
    return {
      screenshot: shot,
      cookieJar: cookies.map(c => ({ name: c.name, domain: c.domain, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite })),
      latensi: { anonMs: anon.ms, replayMs: replay.ms }
    };
  });

  /* --- D. Kestabilan hop: tiga panggilan beruntun dari SATU halaman -------------------- */
  // Kenapa assert ini ada: seorang murid tidak berhenti setelah satu panggilan. Kalau
  // panggilan ke-3 di satu sesi menggantung, aplikasinya patah di tangan murid walaupun
  // `curl` bilang jembatannya sehat. Cookie disemai dari jar skenario C supaya yang diuji
  // murni transportnya, bukan pembuatan identitas ulang.
  const seed = lastJar.filter(c => c.name === 'fz_id');
  await withScenario({
    name: 'D-hop-stabil',
    cfg: { enabled: true, base: BRIDGE_ORIGIN, endpoints: { ...OFF, quota: 'on' } },
    cookies: seed
  }, async api => {
    const attempts = [];
    for (let i = 1; i <= HOP_CALLS; i += 1) {
      const call = await api.call('/api/quota', {}, HOP_TIMEOUT);
      attempts.push({ ke: i, status: call.status || 0, ms: call.ms, timeout: !!call.timeout, error: call.error || '' });
    }
    const semuaSehat = seed.length > 0 && attempts.every(a => a.status === 200 && a.ms < HOP_TIMEOUT);
    check('bridge-hop-stable', `Kestabilan hop: ${HOP_CALLS} panggilan /api/quota beruntun dari satu halaman semuanya dijawab 200 di bawah ${HOP_TIMEOUT} ms`,
      semuaSehat, (seed.length ? '' : 'cookie dari skenario C tidak tersedia; ') + attempts.map(a => `#${a.ke} ${a.timeout ? 'TIMEOUT' : (a.error || a.status)} ${a.ms}ms`).join(' | '));
    return { hop: attempts, cookieDisemai: seed.length };
  });
} catch (error) {
  check('runner-selesai', 'Runner E2E selesai tanpa galat tak tertangani', false, String(error?.stack || error).slice(0, 500));
} finally {
  await new Promise(resolve => server.close(resolve));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* temp */ }
}

/* --- Global: browser tidak boleh pernah menyentuh *.workers.dev ------------------------- */
const workersDev = network.filter(r => /(^|\.)workers\.dev$/.test(r.host));
check('no-workers-dev', 'NOL permintaan langsung ke *.workers.dev dari browser (aplikasi hanya menyentuh domainnya sendiri + jembatan)',
  workersDev.length === 0, workersDev.map(r => r.method + ' ' + r.url).join(' | ') || '0 permintaan');
check('scenarios-complete', `Semua skenario yang diminta dijalankan (${EXPECTED_SCENARIOS} dari ${ALL_SCENARIOS.length}; gerbang tidak boleh hijau karena berhenti di tengah)`,
  scenarioLog.length === EXPECTED_SCENARIOS, scenarioLog.map(s => s.skenario).join(', ') || '(tidak ada)');

// Tiga hasil, dan urutannya penting: satu assert MERAH selalu mengalahkan INCONCLUSIVE
// (cacat lebih penting daripada premis yang tidak tersedia), dan INCONCLUSIVE selalu
// mengalahkan PASS. `pass` tetap false pada INCONCLUSIVE: gerbang ini tidak pernah
// mengubah "tidak bisa disimpulkan" menjadi lulus.
const hardFail = checks.some(c => c.status === 'FAIL');
const inconclusive = checks.some(c => c.status === 'INCONCLUSIVE');
const overallStatus = hardFail ? 'FAIL' : (inconclusive ? 'INCONCLUSIVE' : 'PASS');
const report = writeReport({
  status: overallStatus,
  pass: overallStatus === 'PASS',
  inconclusiveIds: checks.filter(c => c.status === 'INCONCLUSIVE').map(c => c.id),
  bridge: BRIDGE_ORIGIN,
  appHost: APP_HOST,
  appDir: APP_DIR,
  cookieDomainDiharapkan: COOKIE_DOMAIN,
  protokolDiharapkan: PROTOCOL,
  browser: browserVersion,
  durasiMs: Date.now() - startedAt,
  hostResolverRules: hostRules,
  skenarioDiminta: ONLY.length ? ONLY : 'semua',
  skenario: scenarioLog,
  hostDisentuh: [...new Set(network.map(r => r.host))].sort()
});
const total = report.counts.pass + report.counts.fail + report.counts.inconclusive;
console.log(JSON.stringify(report, null, 2));
if (overallStatus === 'FAIL') {
  console.log(`E2E jembatan: MERAH (${report.counts.fail} dari ${total} assert) terhadap ${BRIDGE_ORIGIN}`);
} else if (overallStatus === 'INCONCLUSIVE') {
  console.log(`E2E jembatan: INCONCLUSIVE (${report.counts.inconclusive} dari ${total} assert tidak bisa disimpulkan: ${report.inconclusiveIds.join(', ')}) terhadap ${BRIDGE_ORIGIN}`);
  console.log('INCONCLUSIVE BUKAN HIJAU: premis assert itu tidak tersedia pada keadaan server saat diuji, jadi tidak ada yang terbukti.');
} else {
  console.log(`E2E jembatan: HIJAU (${report.counts.pass} assert) terhadap ${BRIDGE_ORIGIN}`);
}
if (failed) process.exitCode = 1;
