// FIEZEL — Worker dashboard owner (`fiezel-owner`). E6.
//
// ============================================================================================
// MENGAPA HTML DIRENDER WORKER, BUKAN BERKAS DI REPO
// ============================================================================================
// Kalau dashboard ini berupa `owner.html` di repo PWA, tiga hal buruk terjadi sekaligus:
//   1. sw.js melakukan PRECACHE atas daftar ASSETS-nya. Berkas owner akan ikut diunduh ke
//      perangkat MURID — markup dan nama endpoint owner jadi bacaan publik. Itu melanggar
//      bab 20 ("jangan kirim data owner ke browser lalu sembunyikan dengan CSS") pada tingkat
//      yang lebih dasar lagi: bahkan strukturnya tidak boleh sampai ke sana.
//   2. Invarian rilis SW_REV = DIAG_BUILD = FIEZEL_PAGE_BUILD harus dinaikkan setiap kali satu
//      label dashboard berubah. Dashboard owner adalah alat internal; ia tidak boleh menyeret
//      rilis aplikasi murid. Dan invarian itu hanya boleh dinaikkan MASTER, bukan subagent.
//   3. Perubahan dashboard jadi terikat siklus deploy PWA (main auto-deploy tiap 5 menit),
//      padahal ia hanya perlu `wrangler deploy` Worker ini.
// Karena itu: nol byte owner di bundle PWA, nol dampak pada invarian build, dan gate yang sama
// melindungi HTML maupun JSON. Putusan ini mengikuti cf-b5-analytics.md §5.1.
//
// ============================================================================================
// KEJUJURAN ANGKA (KONTRAK ANALYTICS PRIVASI-MAKSIMAL = otoritas)
// ============================================================================================
// Dashboard ini hanya boleh membaca AGREGAT, dan WAJIB menampilkan bahwa angkanya adalah
// ESTIMASI PERANGKAT, bukan orang: satu orang dua perangkat = dua hitungan; hapus data browser
// = perangkat baru. Label itu bukan catatan kaki opsional — ia dirender di setiap panel
// pengguna dan diassert gerbang test. Owner harus tahu ini, jangan dipoles.

import { QUERIES, UNMEASURABLE, SERIES_METRICS } from './queries.js';

/* ============================ Konstanta yang boleh dilihat ================================= */

// Rate card biaya — SUMBER: reports/cf-a10-cost-model.json + reports/cf-a10-cost.md.
// KOREKSI D2: versi sebelumnya menjanjikan "tarif yang tersimpan bersama baris biaya hari itu".
// Tabel `cost_daily` yang menyimpannya TIDAK ADA dan TIDAK BOLEH ada (analytics-privacy-test.js
// mengunci database analytics pada lima tabel). Jadi tarif SELALU dibaca dari kartu di bawah,
// dan konsekuensinya dicetak apa adanya di panel biaya: mengubah tarif di sini mengubah angka
// bulan lalu juga, sehingga angka biaya adalah ESTIMASI SEKARANG, bukan jejak audit.
const RATE_CARD = {
  ttsUsdPer1MChars: {
    'workers-ai aura-1': 15.0,
    'workers-ai aura-2-en': 30.0,
    'workers-ai melotts': 0.2,
    'elevenlabs flash': 90.91,
  },
  charsPerAudioMin: 1005,          // dikalibrasi dari 273 aset R2 nyata (cf-a10-cost.md §kalibrasi)
  llmUsdPer1MIn: 0.045,            // @cf/meta/llama-3.1-8b-instruct-fp8-fast
  llmUsdPer1MOut: 0.384,
  workersPaidUsdPerMonth: 5.0,     // hanya berlaku bila owner pindah ke Workers Paid
  freeAiCreditUsdPerMonth: 3.3,    // kredit Workers AI yang sudah termasuk
};

const PERIODS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const SESSION_COOKIE = 'fz_owner';
const SESSION_TTL_MS = 30 * 60 * 1000;   // sesi owner berumur PENDEK: 30 menit, diperbarui tiap akses
const RETENTION_MIN_COHORT = 30;         // di bawah ini persentase tidak dicetak (derau, bukan sinyal)

/* ============================ "Belum ada pengukuran" ≠ "nol terukur" ====================== */
// KENAPA INI BUKAN KOSMETIK (bab 28: dilarang mengambil keputusan di atas asumsi).
// Owner memakai halaman ini untuk memutuskan KUOTA. "0 perangkat aktif" dan "belum ada
// pengukuran" adalah dua pernyataan yang sangat berbeda:
//   · nol terukur      = rollup berjalan, harinya ada, hasilnya benar-benar nol.
//   · belum ada data   = tidak ada satu pun baris hari di tabel agregat. Bisa karena pemancar
//                        analytics di klien belum ada / `cfAnalyticsEnabled` masih false /
//                        rollup belum pernah jalan. Angka apa pun di sini adalah dugaan.
//   · tidak tersedia   = pembacaan D1 GAGAL (tabel atau kolom tidak cocok dengan skema).
//                        Ini kerusakan konfigurasi, dan ia TIDAK BOLEH menyamar sebagai nol.
// SQL memakai COALESCE(SUM(...), 0), jadi rentang tanpa satu baris pun mengembalikan 0 —
// karena itu keadaan diputuskan dari `days_counted`/`days_total`, BUKAN dari nilai metriknya.
const STATE_MEASURED = 'measured';
const STATE_NO_DATA = 'no-data';
const STATE_NO_DATA_IN_PERIOD = 'no-data-in-period';
const STATE_UNAVAILABLE = 'unavailable';

const NO_DATA_TEXT = 'belum ada pengukuran';
const MEASURED_ZERO_TEXT = 'nol terukur';
const UNAVAILABLE_TEXT = 'pengukuran tidak tersedia';

const NO_DATA_BANNER = 'BELUM ADA PENGUKURAN. Tidak ada satu pun hari yang terrollup di tabel '
  + 'agregat. Ini BUKAN nol pengguna: pemancar analytics di klien belum terpasang dan '
  + 'cfAnalyticsEnabled masih false, jadi tidak ada satu event pun yang pernah tiba. Jangan '
  + 'mengambil keputusan kuota, biaya, atau kapasitas dari halaman ini sampai angka pertama muncul.';
const NO_DATA_PERIOD_BANNER = 'BELUM ADA PENGUKURAN PADA PERIODE INI. Tabel agregat memuat hari '
  + 'lain, tetapi nol hari di rentang yang dipilih. Angka nol di bawah adalah akibat rentang, '
  + 'bukan hasil pengukuran.';
const UNAVAILABLE_BANNER = 'PENGUKURAN TIDAK TERSEDIA. Pembacaan D1 gagal, jadi halaman ini tidak '
  + 'tahu angkanya. Kegagalan baca TIDAK PERNAH digambar sebagai nol. Periksa binding ANALYTICS '
  + 'dan skema tabel agregat (workers/owner/DEPLOY.md §Blokir).';

// Field yang boleh keluar dari D1 menuju HTML/JSON. Apa pun di luar daftar ini DIBUANG sebelum
// dirender — jadi kalaupun suatu hari ada kolom identitas per-murid menyelinap ke tabel agregat,
// dashboard tetap tidak bisa menampilkannya. Kontrak privasi ditegakkan di sisi PEMBACA juga,
// bukan hanya dengan berharap penulisnya sopan.
// Daftarnya PENDEK karena skemanya bentuk PANJANG: yang keluar dari D1 hanyalah pasangan
// (hari, nama-metrik, nilai) plus hitungan agregat — bukan puluhan kolom lebar.
const ALLOWED_ROW_FIELDS = Object.freeze(new Set([
  // metrics_daily bentuk panjang + hasil agregasinya
  'day', 'metric', 'value', 'total', 'days',
  // PERIOD_DAYS / COLLECTION_START / BROKEN_DAYS / METRIC_PEAK
  'days_counted', 'day_from', 'day_to', 'days_broken', 'days_total', 'day_first_collected',
  'peak', 'avg',
  // usage_daily
  'bucket', 'count',
  // retention_daily
  'cohort_day', 'day_index',
]));

// Inventaris rute. Semua rute di daftar ini WAJIB lewat ownerGate(). Rute yang tidak dikenal
// juga 403 (default deny), sehingga menambah rute tanpa gate tidak mungkin lolos diam-diam.
const OWNER_ROUTES = [
  '/', '/api/summary', '/api/series', '/api/retention', '/api/cost', '/logout',
  // Ekspor CSV. Ber-gate sama persis dengan rute lain: satu inventaris, satu lapis sesi —
  // rute unduhan yang "cuma CSV" tetap membawa angka yang sama dan tidak boleh punya
  // pintu sendiri.
  '/api/export/summary.csv', '/api/export/series.csv',
  '/api/export/retention.csv', '/api/export/evidence.csv',
];
// Hanya halaman masuk yang publik. Ia tidak pernah memuat satu angka metrik pun.
const PUBLIC_ROUTES = ['/login'];

/* ============================ Utilitas perbandingan & kripto ============================== */

// Perbandingan waktu-konstan. Dipakai untuk SEMUA pembandingan nilai rahasia
// (digest token owner dan tanda tangan cookie sesi). Tidak ada operator kesetaraan langsung
// yang pernah diterapkan pada nilai rahasia di berkas ini — itu diassert gerbang test.
function ctEq(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a == null ? '' : a));
  const y = enc.encode(String(b == null ? '' : b));
  // Panjang berbeda tetap dijalankan sampai habis atas panjang tetap agar tidak bocor lewat waktu.
  const len = Math.max(x.length, y.length, 1);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(key)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(String(message)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ============================ Sesi owner (stateless, umur pendek) ========================= */
// Sesi ditandatangani HMAC, jadi nol tulis KV/D1 (free-tier-safe) dan tidak ada daftar sesi
// yang bisa dibocorkan. Konsekuensi jujur: revocation sebelum kedaluwarsa hanya bisa dilakukan
// dengan memutar OWNER_SESSION_KEY. Umur 30 menit dipilih supaya jendela itu kecil.

function cookieValue(request, wanted) {
  const raw = (request.headers && request.headers.get && request.headers.get('cookie')) || '';
  for (const part of String(raw).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === wanted) return part.slice(idx + 1).trim();
  }
  return null;
}

async function issueSession(env, nowMs) {
  const payload = JSON.stringify({ sub: 'owner', iat: nowMs, exp: nowMs + SESSION_TTL_MS });
  const body = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sig = await hmacHex(env.OWNER_SESSION_KEY, body);
  return body + '.' + sig;
}

async function verifySession(env, value, nowMs) {
  if (!value || !env.OWNER_SESSION_KEY) return null;
  const dot = String(value).lastIndexOf('.');
  if (dot <= 0) return null;
  const body = String(value).slice(0, dot);
  const presented = String(value).slice(dot + 1);
  const expected = await hmacHex(env.OWNER_SESSION_KEY, body);
  // Tanda tangan dibandingkan waktu-konstan; tanpa ini, panjang prefiks yang cocok bisa terukur.
  if (!ctEq(presented, expected)) return null;
  let claims = null;
  try {
    claims = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
  if (!claims || claims.sub !== 'owner') return null;
  if (!Number.isFinite(claims.exp) || claims.exp <= nowMs) return null;   // kedaluwarsa → ditolak
  return claims;
}

function sessionCookieHeader(value, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

/* ============================ Gate owner ================================================== */
// Pola yang ditiru: fiezel-core-worker.js:184-186 (identitas diputuskan SERVER, nol masukan
// klien, 403 SEBELUM data dibentuk). Yang diganti hanya SUMBER identitas owner: kini Secret,
// bukan "kebetulan pemilik Worker" (cf-a7-security.md rekomendasi baris 154).
//
// Yang TIDAK PERNAH mempengaruhi keputusan: query `?admin=true`, header apa pun, isi body.

function configured(env) {
  return !!(env && env.OWNER_TOKEN_HASH && env.OWNER_SESSION_KEY);
}

async function ownerSession(request, env, nowMs) {
  if (!configured(env)) return null;                      // fail-closed: tanpa Secret, tidak ada owner
  return verifySession(env, cookieValue(request, SESSION_COOKIE), nowMs);
}

// Respons penolakan seragam. Tidak memuat satu pun angka metrik — tidak ada data yang dibentuk
// sebelum gate lulus, jadi tidak ada apa pun untuk dibocorkan.
function deny() {
  return new Response(JSON.stringify({ error: 'forbidden' }), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/* ============================ Penjaga tepi (hostname kanonik ATAU X-Fiezel-Edge) ========= */
//
// ==========================================================================================
// 🔄 TEMUAN LAPANGAN 28 Agu 2026 — CUSTOM DOMAIN OWNER SUDAH AKTIF (BAGIAN INI BARU)
// ==========================================================================================
// Keadaan yang diasumsikan bab di bawah SUDAH BERUBAH, dan gejalanya diukur langsung:
// `https://owner.fiezel.my.id/` menjawab **403 `{"error":"forbidden"}`** pada tiga percobaan
// (~75 ms). Sebabnya bukan sesi owner dan bukan Secret yang kurang:
//   - Worker `fiezel-owner` sudah dideploy (etag 9ad135402f65).
//   - `owner.fiezel.my.id` sudah AKTIF sebagai **custom domain** Worker ini
//     (id aa153ad81fbc2aee3855441900cc7bc9696f3d0c, cert 767db56f-…, enabled true) —
//     persis seperti yang sudah lama tertulis di `wrangler.toml`
//     (`routes = [{ pattern = "owner.fiezel.my.id", custom_domain = true }]`).
//   - Ketiga Secret (`OWNER_TOKEN_HASH`, `OWNER_SESSION_KEY`, `EDGE_SHARED_SECRET`) terpasang.
// Artinya permintaan owner tiba **LANGSUNG dari peramban**, dan proxy PHP owner TIDAK berada di
// jalur permintaan. Tidak ada yang menyuntikkan `X-Fiezel-Edge`, jadi penjaga versi sebelumnya
// menolak SEMUA permintaan — termasuk halaman masuk. Penjaga itu menilai keadaan yang sudah
// tidak berlaku (kelas bug yang sama dengan dua bug lain yang ditambal hari yang sama).
//
// YANG **TIDAK** DIPAKAI SEBAGAI TAMBALAN: `ALLOW_NO_EDGE_SECRET="true"`. Bab di bawah sudah
// memperingatkannya sendiri — pembuka itu membuka gerbang untuk SEMUA hostname, termasuk
// `*.workers.dev`, tempat Cloudflare Access (yang dipasang PER HOSTNAME) tidak berlaku. Itu
// menukar 403 dengan lubang: halaman masuk owner bisa ditembak langsung, dan rem login
// per-isolate bisa diputar dengan meminta isolate baru.
//
// YANG DIPAKAI: **JALUR SAH KEDUA — hostname kanonik**, ditiru dari `workers/api/mw-edge.js`
// (di sana konsepnya `edgeGuardPath` bernilai `custom-domain`), berdampingan dengan jalur
// header dan dengan DEFAULT-DENY untuk hostname lain. Lihat bab "SINYAL HOSTNAME" di bawah.
//
// ==========================================================================================
// SINYAL HOSTNAME: KENAPA `new URL(request.url).hostname` DAN BUKAN `headers.get('host')`
// ==========================================================================================
// Syaratnya keras: hostname yang dipercaya WAJIB berasal dari sesuatu yang tidak bisa disetel
// peramban penyerang. Ini hasil pemeriksaannya, apa adanya:
//
// 1. `request.headers.get('host')` adalah nilai header MENTAH dari klien. Di Workers ia memang
//    berasal dari sumber yang sama dengan `request.url`, tetapi ia TIDAK dinormalkan: ia boleh
//    membawa port (`owner.fiezel.my.id:8443`), titik akhir (`owner.fiezel.my.id.`), huruf besar,
//    bentuk punycode/unicode yang berbeda, dan bila header dikirim GANDA `Headers.get()`
//    menggabungkan nilainya dengan `', '`. Sebuah gerbang otorisasi tidak boleh menanggung
//    beban menalar semua bentuk itu. Karena itu ia DITOLAK sebagai sumber di sini.
// 2. `new URL(request.url).hostname` adalah hostname yang sudah DIRAKIT DAN DINORMALKAN runtime,
//    dan — ini intinya — ia adalah nilai yang SAMA yang dipakai lapisan perutean Cloudflare
//    untuk memutuskan bahwa Worker ini yang dijalankan. Custom Domain mencocokkan hostname
//    secara PERSIS, tanpa wildcard, dan seluruh path-nya menuju Worker ini
//    (developers.cloudflare.com/workers/configuration/routing/custom-domains/). Jadi permintaan
//    tidak mungkin tiba di sini dengan hostname `owner.fiezel.my.id` tanpa Cloudflare sendiri
//    yang mencocokkannya ke rute milik akun ini. Yang dipercaya bukan "header yang sopan",
//    melainkan KEPUTUSAN PERUTEAN yang tidak dipegang klien.
// 3. Yang JUGA menutup jalur pemalsuan dari arah Worker lain: `Host` adalah forbidden header di
//    Fetch API, sehingga Worker mana pun (di akun mana pun) TIDAK BISA menyetel `Host` pada
//    subrequest — begitu pula Transform Rules menolak operasi `set` pada `Host`. Jadi tidak ada
//    cara mengirim `Host: owner.fiezel.my.id` ke alamat `*.workers.dev` lewat Cloudflare.
// 4. YANG TIDAK DIPERCAYA sama sekali, dan tidak pernah dibaca penjaga ini: `X-Forwarded-Host`,
//    `X-Host`, `Origin`, `Referer`. Semuanya murni masukan klien.
//
// RISIKO SISA, DITULIS SUPAYA TIDAK HILANG: kalau suatu hari sebuah lapisan di depan Worker
// meneruskan `Host` pilihan klien (mis. jembatan PHP yang diubah supaya meneruskan Host, atau
// `workers_dev` dinyalakan lagi lalu Host/SNI tidak lagi dipaksa cocok), maka `url.hostname`
// ikut berpindah dan pemeriksaan akhiran `.workers.dev` TIDAK akan menyala. Karena itu jalur
// hostname ini SAH hanya bersama tiga hal di luar kode: `workers_dev = false`, Preview URL
// mati, dan Cloudflare Access di depan `owner.fiezel.my.id`. Ketiganya pekerjaan owner dan
// tertulis di `DEPLOY.md`; kode tidak bisa memaksakannya, jadi kode tidak berpura-pura bisa.
//
// ==========================================================================================
// KEADAAN LAMA (tetap ditulis: jalur header masih dipertahankan sebagai CADANGAN)
// ==========================================================================================
// Sebelum zona `fiezel.my.id` aktif, dashboard dijangkau lewat pola yang sudah terbukti untuk
// `api.fiezel.my.id`: subdomain cPanel di origin ArenHost + proxy PHP
// (`deploy/edge/owner-index.php`) yang meneruskan ke `fiezel-owner.fitrajft.workers.dev`.
//
// Jalur itu TIDAK dihapus, dan ini alasannya (bukan kemalasan):
//   (i)  cache DNS lama + kemungkinan owner mengembalikan jembatan bila custom domain bermasalah;
//   (ii) `deploy/edge/owner-index.php` dan .htaccess-nya masih ada di repo dan masih dijaga
//        gerbang ini — menghapus jalurnya di kode akan membuat artefak itu mati diam-diam;
//   (iii) sabuk dan bretel: header sah TIDAK cukup di hostname yang tidak dikenal, sehingga
//        hostname yang tersalah-pasang di masa depan tidak menjadi pintu kedua.
// Selama alamat `*.workers.dev` hidup, ia adalah pintu yang TIDAK dilewati Cloudflare Access.
// Karena itu jalur header hanya berlaku DI SANA, dan hanya dengan secret yang benar.
//
// KENAPA DISALIN, BUKAN DIIMPOR. Penjaga yang sama sudah ada di `workers/api/mw-edge.js`. Impor
// tidak mungkin: `workers/api` dan `workers/owner` adalah DUA Worker dengan graf modul, bundling,
// dan deploy sendiri — tidak ada modul bersama di antara keduanya. Ini pola yang sama, dan alasan
// yang sama, seperti `ctEq()` yang disalin ke arah sebaliknya (mw-edge.js menyalinnya dari berkas
// ini). Kalau salah satu berubah, yang lain harus ikut; gerbang yang menjaganya:
// `edge-guard-test.js` (sisi api) dan `owner-edge-guard-test.js` (sisi owner).

const EDGE_HEADER = 'x-fiezel-edge';

// SATU SUMBER KEBENARAN hostname yang boleh lolos TANPA header jembatan: hostname yang benar-benar
// terikat ke Worker ini sebagai CUSTOM DOMAIN. Harus identik dengan
// `routes = [{ pattern = ..., custom_domain = true }]` di `workers/owner/wrangler.toml` —
// `owner-edge-guard-test.js` butir (g-a) memaksa keduanya sama, supaya daftar ini tidak bisa
// tumbuh diam-diam menjadi hostname yang tidak pernah berdiri di Cloudflare.
// Huruf kecil semua; pembanding menormalkan masukan.
const TRUSTED_EDGE_HOSTS = Object.freeze(['owner.fiezel.my.id']);

// Akhiran alamat asal Worker. Ia BUKAN jalur owner: Cloudflare Access dipasang per hostname dan
// tidak berlaku di sini, jadi hostname ini tidak boleh pernah lolos tanpa secret jembatan.
const WORKERS_DEV_SUFFIX = '.workers.dev';

// Normalisasi hostname: huruf kecil, tanpa spasi, tanpa titik akhir.
function normalizeHost(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/\.$/, '');
}

// Hostname permintaan, DARI `request.url` (dirakit + dinormalkan runtime, dan nilai yang sama
// yang dipakai perutean Cloudflare memilih Worker ini). SENGAJA BUKAN dari `headers.get('host')`
// maupun `X-Forwarded-Host` — alasannya panjang dan ada di bab "SINYAL HOSTNAME" di atas.
// URL yang tidak bisa diurai mengembalikan string kosong, dan string kosong tidak pernah
// tepercaya (gagal ke arah aman).
function requestHostname(request) {
  try {
    return normalizeHost(new URL(request.url).hostname);
  } catch (_) {
    return '';
  }
}

// Alamat asal Worker (`*.workers.dev`, termasuk Preview URL `<versi>-fiezel-owner.<sub>.workers.dev`
// yang berakhiran sama). Dicek dengan AKHIRAN, bukan substring: `workers.dev.penyerang.com`
// tidak boleh ikut terhitung.
function isWorkersDevHost(host) {
  const h = normalizeHost(host);
  return h === 'workers.dev' || h.endsWith(WORKERS_DEV_SUFFIX);
}

// Hostname kanonik tepercaya. `*.workers.dev` tidak pernah masuk, apa pun isi daftar di atas.
// Pencocokan PERSIS (bukan substring/akhiran): `owner.fiezel.my.id.penyerang.com` bukan owner.
function isTrustedEdgeHost(host) {
  const h = normalizeHost(host);
  if (!h || isWorkersDevHost(h)) return false;
  return TRUSTED_EDGE_HOSTS.includes(h);
}

// Nilai jalur yang mungkin. Satu sumber kebenaran untuk penjaga DAN gerbang test. Meniru
// `EDGE_PATHS` di `workers/api/mw-edge.js`; `'denied'` ada di sini (dan tidak ada di sisi api)
// karena owner tidak punya `/health` untuk melaporkan jalurnya, jadi satu-satunya pembaca nilai
// ini adalah gerbang test — dan gerbang harus bisa membedakan "lolos lewat apa" dari "ditolak".
const EDGE_PATHS = Object.freeze(['custom-domain', 'header', 'off', 'free-path', 'denied']);

// Owner TIDAK punya path bebas header. `workers/api` membebaskan `/healthz` karena monitor
// eksternal harus bisa melihat API murid hidup tanpa mengirim rahasia. Dashboard owner tidak
// punya kebutuhan itu: kalau ia mati, yang terdampak satu orang, dan orang itu bisa melihatnya
// dengan membuka halamannya. Daftar kosong = nol permukaan terbuka di `workers.dev`.
const EDGE_FREE_PATHS = Object.freeze([]);

// Secret yang terpasang, sudah dirapikan. String kosong/spasi dianggap TIDAK terpasang — kalau
// tidak, `wrangler secret put` yang salah tempel akan mengunci dashboard di balik nilai yang
// tidak diketahui siapa pun.
function edgeSecret(env) {
  const raw = env ? env.EDGE_SHARED_SECRET : null;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

// Dua nilai saja, dan keduanya jujur:
//   'on'  = penjaga MENEGAKKAN: setiap permintaan harus tiba di hostname kanonik ATAU membawa
//           header jembatan yang benar.
//   'off' = tidak ada penegakan sama sekali; HANYA mungkin bila secret belum dipasang DAN
//           ALLOW_NO_EDGE_SECRET === 'true' dipasang secara eksplisit.
// Nilai ini TIDAK pernah dikirim ke klien mana pun (dashboard owner tidak punya `/health`), jadi
// ia bukan oracle publik. Ia hanya untuk gerbang dan untuk log.
//
// KOREKSI 28 Agu 2026: rumusnya dulu `edgeSecret(env) ? 'on' : 'off'`, yang sejak jalur hostname
// ada menjadi BOHONG — tanpa secret pun penegakan hostname tetap jalan dan hostname asing tetap
// ditolak. Rumus di bawah disamakan dengan `edgeGuardStatus()` di `workers/api/mw-edge.js`
// (dua penjaga yang disalin HARUS bergerak bersama): 'off' hanya kalau memang tidak ada yang
// ditegakkan.
function edgeGuardStatus(env) {
  return edgeSecret(env) || !allowNoSecretOverride(env) ? 'on' : 'off';
}

// Peringatan `off` dicatat SEKALI per isolate, bukan sekali per permintaan: satu baris log per
// permintaan adalah cara tercepat membuat owner mematikan observability, dan owner yang mematikan
// log tidak akan melihat peringatan apa pun lagi.
let edgeWarnedThisIsolate = false;

function resetEdgeWarningForTests() {
  edgeWarnedThisIsolate = false;
  edgeWarnedClosedThisIsolate = false;
}

function warnEdgeGuardOff() {
  if (edgeWarnedThisIsolate) return;
  edgeWarnedThisIsolate = true;
  console.warn(
    'fiezel-owner edgeGuard=off — EDGE_SHARED_SECRET belum dipasang dan ALLOW_NO_EDGE_SECRET=true '
    + 'memaksa gerbang terbuka. Alamat *.workers.dev TERBUKA: halaman masuk owner bisa ditembak '
    + 'langsung tanpa lewat jembatan owner.fiezel.my.id, dan Cloudflare Access tidak berlaku di '
    + 'sana. Jalankan: wrangler secret put EDGE_SHARED_SECRET lalu hapus var ALLOW_NO_EDGE_SECRET. '
    + 'Keadaan ini hanya sah selama masa transisi.'
  );
}

// Peringatan fail-closed juga sekali per isolate, dan lewat console.error: keadaan ini berarti
// dashboard MATI TOTAL sampai secret dipasang — itu bukan warning, itu insiden konfigurasi.
let edgeWarnedClosedThisIsolate = false;

function warnEdgeGuardClosed() {
  if (edgeWarnedClosedThisIsolate) return;
  edgeWarnedClosedThisIsolate = true;
  console.error(
    'fiezel-owner edgeGuard=FAIL-CLOSED — EDGE_SHARED_SECRET belum dipasang, SEMUA permintaan '
    + 'ditolak. Jalankan: wrangler secret put EDGE_SHARED_SECRET (dan pasang nilai yang sama di '
    + 'jembatan PHP owner). Kalau memang sedang masa transisi tanpa jembatan, pasang var '
    + 'ALLOW_NO_EDGE_SECRET=true secara sadar — itu membuka *.workers.dev.'
  );
}

// Pembuka darurat, HARUS string persis 'true' — bukan truthy. '1', 'yes', atau true boolean
// dari kesalahan wrangler.toml TIDAK membuka gerbang; salah ketik gagal ke arah aman.
//
// KOREKSI 28 Agu 2026 (lubang yang ditemukan saat menambah jalur hostname): versi sebelumnya
// memakai `.toLowerCase()`, sehingga `"TRUE"` DAN `"True"` ikut membuka gerbang — padahal
// kembarannya `allowNoSecretOverride()` di `workers/api/mw-edge.js` sengaja TIDAK melakukan itu
// dan komentar di berkas ini sendiri berjanji "string persis 'true'". Janji yang tidak ditegakkan
// adalah lubang: `ALLOW_NO_EDGE_SECRET="TRUE"` yang tersalin dari catatan owner akan membuka
// `*.workers.dev` tanpa ada yang menyadarinya. `.toLowerCase()` DIHAPUS; hanya `'true'` (setelah
// trim) yang dihitung, sama seperti sisi api.
function allowNoSecretOverride(env) {
  const raw = env ? env.ALLOW_NO_EDGE_SECRET : null;
  const norm = typeof raw === 'string' ? raw.trim() : '';
  // Perbandingan biasa di sini AMAN dan disengaja: 'true' bukan nilai rahasia.
  return norm === 'true';
}

// DUA JALUR SAH, satu penolakan. Urutannya disamakan dengan `edgeGuardMiddleware()` di
// `workers/api/mw-edge.js` (dua penjaga ini disalin dan HARUS bergerak bersama):
//
//  [0] `EDGE_FREE_PATHS` — kosong di owner. Nol permukaan terbuka di `*.workers.dev`.
//  [*] mode transisi eksplisit (`ALLOW_NO_EDGE_SECRET === 'true'` tanpa secret): tidak menolak
//      apa pun, DAN itu diumumkan lewat console.warn + `edgeGuardStatus()` bernilai `off`.
//      Var ini hanya sah selama masa transisi; ia BUKAN mode produksi. Sejak custom domain
//      aktif ia TIDAK LAGI DIBUTUHKAN untuk operasi normal — jalur [1] sudah menyelesaikan
//      masalah yang dulu dipaksa dibuka dengan var ini, tanpa membuka `*.workers.dev`.
//  [1] JALUR UTAMA: hostname kanonik (`TRUSTED_EDGE_HOSTS`) lolos TANPA header. Diperiksa
//      SEBELUM `configuredEdge` supaya dashboard TIDAK ikut mati pada langkah pembongkaran
//      jembatan (yaitu saat owner menghapus `EDGE_SHARED_SECRET`).
//  [2] JALUR CADANGAN: proxy PHP -> `*.workers.dev` dengan `X-Fiezel-Edge` yang benar.
//      Perbandingannya waktu-konstan (ctEq): header ini bisa dicoba tanpa batas, dan operator
//      kesetaraan biasa berhenti pada byte pertama yang berbeda sehingga waktunya membocorkan
//      panjang prefiks yang cocok.
//  [3] DEFAULT-DENY: hostname asing/karangan ditolak APA PUN headernya.
//
// YANG SENGAJA TIDAK TERJADI: header `X-Fiezel-Edge` TIDAK menaikkan hak apa pun di hostname
// kanonik. Di sana ia sudah lolos lewat jalur [1] dan headernya tidak pernah dibaca — jadi
// header palsu maupun header benar sama-sama tidak mengubah apa pun, dan tetap tidak
// menggantikan sesi owner (lapis 2).
//
// Sifat lain yang dipertahankan utuh:
//  - penolakannya memakai deny() yang SAMA dengan gate owner, sehingga bentuknya identik untuk
//    header hilang, header salah, hostname asing, fail-closed, dan sesi owner tidak ada.
//    Penyerang tidak bisa menyimpulkan apakah secret terpasang, hostname mana yang dikenal,
//    atau lapis mana yang menolaknya;
//  - nol I/O: tidak ada baca D1, tidak ada await. Penolakan harus lebih murah daripada serangan
//    yang memicunya, dan tidak boleh membakar anggaran plan gratis;
//  - FAIL-CLOSED (audit D3 HIGH-3) tetap berlaku untuk jalur CADANGAN: tanpa secret, hostname
//    `*.workers.dev` dan hostname asing ditolak semuanya.
function edgeGuardDecision(request, env, pathname) {
  if (EDGE_FREE_PATHS.includes(pathname)) return { allowed: true, edgePath: 'free-path' };

  const configuredEdge = edgeSecret(env);

  if (!configuredEdge && allowNoSecretOverride(env)) {
    warnEdgeGuardOff();
    return { allowed: true, edgePath: 'off' };
  }

  const host = requestHostname(request);

  // [1] JALUR UTAMA — hostname kanonik. Tidak membaca satu header pun.
  if (isTrustedEdgeHost(host)) return { allowed: true, edgePath: 'custom-domain' };

  // [2] JALUR CADANGAN — hanya di alamat asal Worker, hanya dengan secret yang benar.
  if (!configuredEdge) {
    warnEdgeGuardClosed();
    return { allowed: false, edgePath: 'denied' };
  }
  if (isWorkersDevHost(host)) {
    const presentedEdge = request && request.headers && request.headers.get
      ? request.headers.get(EDGE_HEADER)
      : null;
    if (ctEq(presentedEdge, configuredEdge)) return { allowed: true, edgePath: 'header' };
    return { allowed: false, edgePath: 'denied' };
  }

  // [3] DEFAULT-DENY untuk hostname asing.
  return { allowed: false, edgePath: 'denied' };
}

// JALUR yang benar-benar dipakai permintaan ini. Cermin `edgeGuardPath()` di
// `workers/api/mw-edge.js`; di owner ia tidak pernah dikirim ke klien (tidak ada `/health`),
// jadi ia bukan oracle publik — ia untuk gerbang test dan untuk penalaran manusia.
function edgeGuardPath(request, env, pathname) {
  const decision = edgeGuardDecision(request, env, pathname);
  return EDGE_PATHS.includes(decision.edgePath) ? decision.edgePath : 'unknown';
}

function edgeGuard(request, env, pathname) {
  // deny() yang SAMA dengan header salah dan sesi tidak ada: fail-closed pun bukan oracle.
  return edgeGuardDecision(request, env, pathname).allowed ? null : deny();
}

/* ============================ Rumus biaya (cf-a10) ======================================== */
// Rumus, bukan angka ajaib. Semua asumsi ikut dikembalikan supaya UI bisa mencetaknya di kartu.
//
//   tts_usd   = tts_chars_rendered / 1e6 × tts_usd_per_1m_chars     (HANYA cache-miss)
//   llm_usd   = ai_tokens_in / 1e6 × in_rate + ai_tokens_out / 1e6 × out_rate
//   kredit    = min(kredit_gratis_Workers_AI, belanja_Workers_AI)
//   total_usd = tts_usd + llm_usd + infra_usd − kredit
//
// Kalibrasi wajib (cf-a10-cost-model.json: scenarios): 1.000 pengguna, aura-1, cache 70% →
// total ≈ US$162,01/bulan dan ≈US$0,162/pengguna. Kalau rumus di sini memberi angka lain untuk
// masukan yang sama, rumus di sini yang salah. Itu yang diuji gerbang (bab 32 #24).
function estimateCost(input = {}) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const ttsChars = Math.max(0, num(input.ttsCharsRendered));
  const tokensIn = Math.max(0, num(input.aiTokensIn));
  const tokensOut = Math.max(0, num(input.aiTokensOut));
  const ttsRate = num(input.ttsUsdPer1MChars != null ? input.ttsUsdPer1MChars : RATE_CARD.ttsUsdPer1MChars['workers-ai aura-1']);
  const inRate = num(input.llmUsdPer1MIn != null ? input.llmUsdPer1MIn : RATE_CARD.llmUsdPer1MIn);
  const outRate = num(input.llmUsdPer1MOut != null ? input.llmUsdPer1MOut : RATE_CARD.llmUsdPer1MOut);
  const infraUsd = num(input.infraUsd);
  const ttsOnWorkersAi = input.ttsOnWorkersAi !== false;

  const ttsUsd = (ttsChars / 1e6) * ttsRate;
  const llmUsd = (tokensIn / 1e6) * inRate + (tokensOut / 1e6) * outRate;
  const workersAiUsd = llmUsd + (ttsOnWorkersAi ? ttsUsd : 0);
  const creditCap = Math.max(0, num(input.freeAiCreditUsd));
  const credit = Math.min(creditCap, workersAiUsd);
  const totalUsd = ttsUsd + llmUsd + infraUsd - credit;

  const activeDevices = Math.max(0, Math.trunc(num(input.activeDevices)));
  const registeredDevices = Math.max(0, Math.trunc(num(input.registeredDevices)));

  return {
    ttsUsd, llmUsd, infraUsd, creditUsd: credit, totalUsd,
    // Pembagi nol TIDAK menghasilkan Infinity/NaN: ia menghasilkan null, dan UI menulis "—".
    usdPerActiveDevice: activeDevices > 0 ? totalUsd / activeDevices : null,
    usdPerRegisteredDevice: registeredDevices > 0 ? totalUsd / registeredDevices : null,
    audioMinutesRendered: ttsChars / RATE_CARD.charsPerAudioMin,
    assumptions: {
      ttsUsdPer1MChars: ttsRate,
      llmUsdPer1MIn: inRate,
      llmUsdPer1MOut: outRate,
      charsPerAudioMin: RATE_CARD.charsPerAudioMin,
      freeAiCreditUsd: creditCap,
      ttsProvider: input.ttsProvider || 'workers-ai aura-1',
      llmModel: input.llmModel || '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      tokensAreEstimated: !!input.tokensAreEstimated,
      billableCharsAreCacheMissOnly: true,
    },
  };
}

/* ============================ Pembacaan data (agregat saja) =============================== */

function dayShift(day, deltaDays) {
  const t = Date.parse(String(day) + 'T00:00:00Z');
  if (!Number.isFinite(t)) return String(day);
  return new Date(t + deltaDays * 86400000).toISOString().slice(0, 10);
}

// Hari WIB (zona murid, bukan UTC) — batas hari mengikuti studyDayKey() di app.js:1085.
function wibDay(nowMs) {
  return new Date(Number(nowMs) + 7 * 3600000).toISOString().slice(0, 10);
}

// Selisih hari kalender antara dua tanggal 'YYYY-MM-DD'. Dipakai untuk mengukur KEBASIAN data:
// berapa hari sejak rollup terakhir. Tanggal tak valid menghasilkan null, bukan angka palsu.
function daysBetween(fromDay, toDay) {
  const a = Date.parse(String(fromDay) + 'T00:00:00Z');
  const b = Date.parse(String(toDay) + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

function periodRange(period, anchorDay) {
  const span = PERIODS[period] || PERIODS['7d'];
  return { from: dayShift(anchorDay, -(span - 1)), to: anchorDay, span };
}

// Buang field yang tidak ada di daftar putih agregat. Yang dibuang DICATAT (bukan didiamkan),
// supaya gerbang bisa membuktikan penyaringan benar-benar terjadi dan owner bisa melihat
// bahwa ada kolom asing di tabelnya.
function sanitizeRow(row, droppedInto) {
  if (!row || typeof row !== 'object') return row === undefined ? null : row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (ALLOWED_ROW_FIELDS.has(k)) out[k] = v;
    else if (droppedInto && !droppedInto.includes(k)) droppedInto.push(k);
  }
  return out;
}

function sanitizeRows(rows, droppedInto) {
  return (Array.isArray(rows) ? rows : []).map((r) => sanitizeRow(r, droppedInto));
}

/* ==========================================================================================
 * BUKTI BELAJAR BRAINCORE — dibaca lewat SUBREQUEST, BUKAN lewat binding D1 baru
 * ==========================================================================================
 * Godaannya jelas: tambahkan `[[d1_databases]] binding = "EVIDENCE_DB"` di wrangler Worker ini
 * dan SELECT langsung. Itu ditolak, dan bukan karena gerbang `owner-edge-guard-test.js` butir
 * (g-g) melarang binding D1 kedua — melainkan karena gerbang itu BENAR: satu Worker owner, satu
 * database agregat, radius ledakan tetap sekecil hari ini. Menambah binding kedua akan menaruh
 * database yang memuat SATU-SATUNYA pengenal perangkat (`evidence_learner_day.cohort`) di
 * isolate yang sama dengan seluruh kode dashboard.
 *
 * Maka jalurnya: Worker ini memanggil `GET /api/owner/braincore-evidence` di Worker `fiezel-api`
 * (owner-gated di sana dengan pola `cron-status.js`), yang sudah HANYA membaca `evidence_daily`
 * dan secara struktur tidak bisa mengembalikan cohort. Konsekuensinya jujur: dashboard menjadi
 * bergantung pada satu subrequest yang bisa gagal — dan kegagalan itu dicetak apa adanya
 * sebagai "pengukuran tidak tersedia", bukan sebagai nol.
 *
 * DUA SECRET BARU, keduanya OPSIONAL (tanpa keduanya panel berbunyi "belum dikonfigurasi",
 * dashboard lama tetap utuh):
 *   EVIDENCE_API_BASE  — basis URL Worker api, mis. https://api.fiezel.my.id
 *   EVIDENCE_API_TOKEN — token owner yang sama yang di-hash di OWNER_TOKEN_HASH Worker api.
 */
const EVIDENCE_PERIOD_DAYS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };

async function readEvidence(env, period, fetchImpl) {
  const base = env && typeof env.EVIDENCE_API_BASE === 'string' ? env.EVIDENCE_API_BASE.trim().replace(/\/+$/, '') : '';
  // Token dibaca lewat variabel perantara: ia hanya DIKIRIM sebagai header, tidak pernah
  // dibandingkan di sini (perbandingan rahasia di Worker ini wajib waktu-konstan lewat ctEq).
  const rawKey = env ? env.EVIDENCE_API_TOKEN : null;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!base || !apiKey) return { state: 'unconfigured', summary: null };
  if (!/^https:\/\//.test(base)) return { state: 'unconfigured', summary: null };
  const days = EVIDENCE_PERIOD_DAYS[period] || 7;
  const doFetch = typeof fetchImpl === 'function' ? fetchImpl : (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return { state: 'unavailable', summary: null };
  try {
    const res = await doFetch(base + '/api/owner/braincore-evidence?days=' + days, {
      method: 'GET',
      headers: { 'x-fiezel-owner-token': apiKey, 'cache-control': 'no-store' },
    });
    if (!res || !res.ok) return { state: 'unavailable', summary: null, status: (res && res.status) || 0 };
    const body = await res.json();
    if (!body || body.migrated === false || !body.summary) return { state: 'not-migrated', summary: null };
    // Sabuk pengaman terakhir. Rute sumber memang tidak bisa mengembalikan cohort, tetapi
    // dashboard tidak boleh bergantung pada janji Worker lain: apa pun yang tidak dikenal
    // dibuang di sini, bukan dirender.
    return { state: 'measured', range: body.range || null, summary: sanitizeEvidenceSummary(body.summary) };
  } catch {
    return { state: 'unavailable', summary: null };
  }
}

/** Daftar putih bentuk ringkasan bukti. Field di luar ini TIDAK PERNAH sampai ke HTML. */
function sanitizeEvidenceSummary(raw) {
  const int = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);
  const dist = (v) => {
    const out = {};
    if (!v || typeof v !== 'object') return out;
    for (const [k, n] of Object.entries(v)) {
      // Kunci distribusi WAJIB berbentuk nilai enum (huruf/angka/-/_ , maks 40 char). Cohort
      // 16-hex pun akan lolos pola itu, jadi pagar sesungguhnya adalah: hanya distribusi yang
      // NAMANYA terdaftar di bawah yang pernah dibaca.
      if (typeof k === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(k)) out[k] = int(n);
    }
    return out;
  };
  return {
    learnersMeasured: int(raw.learnersMeasured),
    evidenceCount: int(raw.evidenceCount),
    decisionCount: int(raw.decisionCount),
    measured: raw.measured === true,
    mastery: dist(raw.mastery),
    masteryTrend: dist(raw.masteryTrend),
    misconception: dist(raw.misconception),
    misconceptionSkill: dist(raw.misconceptionSkill),
    difficultyCalibration: dist(raw.difficultyCalibration),
    calibrationError: dist(raw.calibrationError),
    decision: dist(raw.decision),
    outcome: dist(raw.outcome),
    recommendation: dist(raw.recommendation),
    improvementTrend: dist(raw.improvementTrend),
    level: dist(raw.level),
    days: (Array.isArray(raw.days) ? raw.days : []).slice(0, 90).map((d) => ({
      day: typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day) ? d.day : '',
      learners: int(d.learners), evidence: int(d.evidence), decisions: int(d.decisions),
    })).filter((d) => d.day),
  };
}

async function readModel(env, period, nowMs) {
  const db = env && env.ANALYTICS;
  // Kegagalan baca dicatat per-query dan TIDAK diubah menjadi nol. "Tidak tahu" adalah jawaban
  // yang sah; "nol" adalah klaim, dan klaim itu butuh pengukuran.
  const readErrors = [];
  const droppedFields = [];
  const one = async (label, sql, ...binds) => {
    try {
      if (!db || typeof db.prepare !== 'function') throw new Error('binding ANALYTICS tidak ada');
      const stmt = db.prepare(sql);
      return sanitizeRow(await (binds.length ? stmt.bind(...binds) : stmt).first(), droppedFields);
    } catch (err) {
      if (!readErrors.includes(label)) readErrors.push(label);
      return null;
    }
  };
  const many = async (label, sql, ...binds) => {
    try {
      if (!db || typeof db.prepare !== 'function') throw new Error('binding ANALYTICS tidak ada');
      const stmt = db.prepare(sql);
      const res = await (binds.length ? stmt.bind(...binds) : stmt).all();
      return sanitizeRows((res && res.results) || [], droppedFields);
    } catch (err) {
      if (!readErrors.includes(label)) readErrors.push(label);
      return [];
    }
  };

  const latestDay = (await one('LATEST_DAY', QUERIES.LATEST_DAY)) || null;
  // `day = null` berarti nol baris rollup, BUKAN sebuah hari.
  //
  // DUA JANGKAR, dan bedanya penting:
  //  - Rentang periode dijangkarkan pada HARI WIB SEKARANG. Kalau dijangkarkan pada hari rollup
  //    terakhir, "30 hari terakhir" diam-diam berarti "30 hari terakhir yang PUNYA data", jadi
  //    cron rollup yang mati sebulan lalu tetap merender halaman yang tampak mutakhir dan penuh.
  //    Itu juga membuat keadaan `no-data-in-period` mustahil terjadi secara struktural — keadaan
  //    yang tidak bisa terjadi bukan pembeda, hanya hiasan.
  //  - Nilai keadaan (kartu "hari terakhir") dijangkarkan pada hari rollup TERAKHIR, karena itu
  //    memang angka terukur terbaru yang kita punya. Tanggalnya dicetak apa adanya.
  const today = wibDay(nowMs);
  const anchorDay = (latestDay && latestDay.day) || today;
  const { from, to, span } = periodRange(period, today);

  const [
    totalRows, dayRows, seriesRows, retention, usageRows,
    start, periodDays, dauPeak, broken,
  ] = await Promise.all([
    many('PERIOD_TOTALS', QUERIES.PERIOD_TOTALS, from, to),
    many('DAY_METRICS', QUERIES.DAY_METRICS, anchorDay),
    many('SERIES', QUERIES.SERIES, from, to),
    many('RETENTION', QUERIES.RETENTION, from, to),
    many('USAGE_TOTALS', QUERIES.USAGE_TOTALS, from, to),
    one('COLLECTION_START', QUERIES.COLLECTION_START),
    one('PERIOD_DAYS', QUERIES.PERIOD_DAYS, from, to),
    one('METRIC_PEAK', QUERIES.METRIC_PEAK, 'dau', from, to),
    one('BROKEN_DAYS', QUERIES.BROKEN_DAYS, 'collection_ok', from, to),
  ]);

  // --- Pemutaran bentuk PANJANG → objek yang enak dipakai UI ---------------------------------
  // Ini bukan kosmetik: bentuk panjang berarti sebuah metrik bisa TIDAK PUNYA BARIS sama sekali.
  // Karena itu `totals`/`latest` sengaja TIDAK diberi nilai bawaan nol; metrik tanpa baris tetap
  // `undefined` dan pembungkus fmt* akan mencetak "belum ada pengukuran", bukan "0".
  const totals = {};        // nama metrik -> jumlah dalam periode
  const totalDays = {};     // nama metrik -> jumlah hari yang punya baris untuk metrik itu
  for (const r of totalRows) {
    if (!r || r.metric == null) continue;
    totals[r.metric] = Number(r.total);
    totalDays[r.metric] = Number(r.days);
  }
  const latest = { day: (latestDay && latestDay.day) || null };
  for (const r of dayRows) {
    if (!r || r.metric == null) continue;
    latest[r.metric] = Number(r.value);
  }
  // Seri: satu baris per hari, kolomnya nama metrik. Hari yang tidak punya baris `collection_ok`
  // diperlakukan sebagai TIDAK OK (default 0) supaya sparkline memutus garisnya — bukan
  // menyambungnya dengan asumsi bahwa hari itu baik-baik saja.
  const seriesByDay = new Map();
  for (const r of seriesRows) {
    if (!r || !r.day || r.metric == null) continue;
    if (!seriesByDay.has(r.day)) seriesByDay.set(r.day, { day: r.day, collection_ok: 0 });
    seriesByDay.get(r.day)[r.metric] = Number(r.value);
  }
  const series = [...seriesByDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
  // Dimensi pemakaian: bucket -> jumlah. Bucket tanpa baris tetap `undefined`, alasan sama.
  const usage = {};
  for (const r of usageRows) {
    if (!r || r.bucket == null) continue;
    usage[r.bucket] = Number(r.total);
  }
  // Retensi: `retention_daily` tidak punya kolom ukuran kohor, jadi n= diturunkan dari baris
  // offset 0 kohor YANG SAMA — satu-satunya sumbernya di skema ini.
  // Penyebut per offset dijumlahkan HANYA dari kohor yang punya pengamatan di offset itu. Kalau
  // seluruh kohor dijumlahkan (yang akan terjadi bila ini dikerjakan `GROUP BY` di SQL), kohor
  // berumur 3 hari ikut jadi penyebut D30 padahal ia belum mungkin punya baris D30, dan retensi
  // tampak lebih buruk daripada kenyataan.
  const cohortSize = new Map();
  for (const r of retention) {
    if (Number(r.day_index) === 0) cohortSize.set(r.cohort_day, Number(r.count));
  }
  const byOffset = new Map();
  for (const r of retention) {
    const idx = Number(r.day_index);
    if (!Number.isFinite(idx) || idx === 0) continue;
    const base = cohortSize.get(r.cohort_day);
    // Kohor tanpa baris D0 TIDAK dipakai: tanpa ukuran kohor, persentase apa pun adalah karangan.
    if (!Number.isFinite(base)) continue;
    const acc = byOffset.get(idx) || { day_index: idx, retained: 0, base: 0, cohorts: 0 };
    acc.retained += Number(r.count) || 0;
    acc.base += base;
    acc.cohorts += 1;
    byOffset.set(idx, acc);
  }
  const retentionRollup = [...byOffset.values()].sort((a, b) => a.day_index - b.day_index);

  // Keadaan pengukuran diputuskan dari JUMLAH HARI, bukan dari nilai metrik (COALESCE menutupi
  // ketiadaan baris dengan nol — lihat komentar di kepala berkas).
  const daysTotal = Number(start && start.days_total);
  const daysCounted = Number(periodDays && periodDays.days_counted);
  let state = STATE_MEASURED;
  if (readErrors.length > 0) state = STATE_UNAVAILABLE;
  else if (!Number.isFinite(daysTotal) || daysTotal <= 0) state = STATE_NO_DATA;
  else if (!Number.isFinite(daysCounted) || daysCounted <= 0) state = STATE_NO_DATA_IN_PERIOD;

  const measurement = {
    state,
    daysTotal: Number.isFinite(daysTotal) ? daysTotal : null,
    daysCounted: Number.isFinite(daysCounted) ? daysCounted : null,
    firstCollectedDay: (start && start.day_first_collected) || null,
    readErrors,
    // Nama kolom asing TIDAK diulang keluar (nama kolom pun bisa menjadi petunjuk identitas).
    // Yang keluar hanya JUMLAHNYA; daftarnya tetap ada di dalam model untuk log/gerbang.
    droppedFieldCount: droppedFields.length,
    // Kalimat yang sama dipakai HTML dan JSON, supaya dua permukaan tidak pernah berbeda cerita.
    notice: state === STATE_MEASURED ? null
      : state === STATE_UNAVAILABLE ? UNAVAILABLE_BANNER
        : state === STATE_NO_DATA_IN_PERIOD ? NO_DATA_PERIOD_BANNER : NO_DATA_BANNER,
    zeroMeansMeasured: state === STATE_MEASURED,
  };
  // Daftar nama kolom asing sengaja TIDAK ikut ke `measurement` (lihat di atas); ia hanya
  // dilaporkan sebagai jumlah, dan dicatat sekali ke log supaya owner bisa menyelidikinya.
  if (droppedFields.length > 0) {
    try { console.warn('fiezel-owner kolom di luar daftar putih agregat dibuang: ' + droppedFields.length); } catch { /* noop */ }
  }

  // BIAYA: volume dari `metrics_daily` (terukur), tarif dari kartu di repo (TIDAK tersimpan per
  // hari, dan tidak boleh — tidak ada tabel biaya di database ini). `infraUsd` dan kredit gratis
  // dipaksa 0 karena keduanya tidak pernah masuk D1; keduanya terdaftar di UNMEASURABLE dan
  // dicetak sebagai "tidak bisa diukur", bukan sebagai US$0,00 yang menyesatkan.
  const cost = estimateCost({
    ttsCharsRendered: totals.tts_chars_rendered || 0,
    aiTokensIn: totals.ai_tokens_in || 0,
    aiTokensOut: totals.ai_tokens_out || 0,
    infraUsd: 0,
    freeAiCreditUsd: 0,
    activeDevices: latest.dau || 0,
    // Perangkat terdaftar hidup di database KUOTA dan dilarang disambungkan ke analytics, jadi
    // biaya per perangkat terdaftar TIDAK dihitung (bukan dihitung lalu disembunyikan).
    registeredDevices: 0,
  });

  return {
    period, span, from, to, anchorDay, today,
    // Selisih hari antara hari ini dan hari rollup terakhir. > 1 berarti data basi, dan itu harus
    // terbaca di permukaan, bukan tersembunyi di balik rentang yang menyesuaikan diri.
    staleDays: latestDay && latestDay.day ? daysBetween(anchorDay, today) : null,
    measurement,
    latest,
    totals,
    totalDays,
    usage,
    peak: {
      dau_days: Number(dauPeak && dauPeak.days),
      dau_peak: Number(dauPeak && dauPeak.peak),
      dau_avg: Number(dauPeak && dauPeak.avg),
    },
    series, retention, retentionRollup,
    broken: { days_broken: Number(broken && broken.days_broken) },
    periodDays: periodDays || {},
    cost,
    collection: start || {},
    // Bukti belajar Braincore: satu subrequest, tidak pernah melempar, tidak pernah
    // menjatuhkan panel lain (lihat readEvidence).
    evidence: await readEvidence(env, period),
    // Batas pengukuran ikut ke model — jadi HTML dan JSON menceritakan batas yang SAMA.
    unmeasurable: UNMEASURABLE,
    generatedAtIso: new Date(Number(nowMs)).toISOString(),
  };
}

/* ============================ Render HTML (tanpa CDN, tanpa framework) ==================== */
// Palet FIEZEL: cream #FFF8ED, ink #2B2118, kuning #FFD23F. Mobile-first: satu kolom di bawah
// 640 px, grid otomatis di atasnya. Nol berkas eksternal, nol font remote, nol JavaScript
// pihak ketiga — pemilihan periode adalah tautan biasa (muat ulang), bukan kerangka kerja.

const CSS = `
:root{--cream:#FFF8ED;--ink:#2B2118;--yellow:#FFD23F;--line:#E7DCC9;--muted:#6B5C49;--warn:#8A5A00}
*{box-sizing:border-box}
body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
header{padding:18px 16px 8px;border-bottom:3px solid var(--yellow)}
h1{margin:0;font-size:20px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin-top:4px}
nav{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px}
nav a{padding:7px 13px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);font-size:14px;background:#fff}
nav a[aria-current="page"]{background:var(--yellow);border-color:var(--ink);font-weight:600}
main{padding:0 16px 40px;display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:640px){main{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:24px}}
@media(min-width:1024px){main{grid-template-columns:repeat(3,minmax(0,1fr))}}
section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px}
section h2{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.kv{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:15px}
.kv:last-of-type{border-bottom:0}
.kv b{font-variant-numeric:tabular-nums;font-weight:700}
.big{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1;margin:2px 0 8px}
.note{margin-top:10px;font-size:12px;color:var(--muted);border-left:3px solid var(--yellow);padding-left:9px}
.warn{margin-top:10px;font-size:12px;color:var(--warn);background:#FFF4D6;border:1px solid var(--yellow);border-radius:9px;padding:8px 9px}
.assume{margin-top:10px;font-size:12px;color:var(--muted);background:var(--cream);border:1px dashed var(--line);border-radius:9px;padding:8px 9px}
.assume code{font-size:11px}
.nodata{margin-top:10px;font-size:12px;color:#4A3A22;background:#F2ECE0;border:1px dashed var(--muted);border-radius:9px;padding:8px 9px}
.empty{margin:0 16px 14px;padding:12px 13px;border:2px solid var(--ink);border-radius:12px;background:#FFF4D6;font-size:13px;line-height:1.45}
.empty b{display:block;font-size:14px;margin-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:right;padding:5px 4px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
th:first-child,td:first-child{text-align:left}
svg{display:block;width:100%;height:52px;margin:6px 0 2px}
footer{padding:0 16px 34px;color:var(--muted);font-size:12px}
form{padding:16px;max-width:420px}
input{width:100%;padding:11px;font-size:16px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
button{margin-top:10px;padding:11px 16px;font-size:15px;font-weight:700;border:1px solid var(--ink);border-radius:10px;background:var(--yellow);color:var(--ink)}
`;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtNum(v, digits) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const fixed = n.toFixed(digits == null ? 2 : digits);
  const [a, b] = fixed.split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? ',' + b : '');
}

function fmtUsd(v, digits) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return 'US$' + fmtNum(n, digits == null ? 2 : digits);
}

function fmtPct(part, whole, digits) {
  const p = Number(part), w = Number(whole);
  if (!Number.isFinite(p) || !Number.isFinite(w) || w <= 0) return '—';
  return fmtNum((p / w) * 100, digits == null ? 1 : digits) + '%';
}

/* --- Pembungkus keadaan: satu-satunya tempat angka boleh menjadi teks -------------------- */
// ATURAN: nilai metrik TIDAK PERNAH dicetak lewat fmtInt/fmtUsd langsung di panel. Semua lewat
// pembungkus di bawah, supaya "belum ada pengukuran" tidak mungkin tersamar menjadi "0".

function stateText(m) {
  return (m && m.measurement && m.measurement.state) === STATE_UNAVAILABLE
    ? UNAVAILABLE_TEXT : NO_DATA_TEXT;
}

function isMeasured(m) {
  return !!(m && m.measurement && m.measurement.state === STATE_MEASURED);
}

// Nol yang BENAR-BENAR terukur dicetak dengan penanda eksplisit "nol terukur", supaya ia tidak
// bisa dibaca sebagai "kosong", dan kekosongan tidak bisa dibaca sebagai nol.
function fmtCount(m, v) {
  if (!isMeasured(m)) return stateText(m);
  const n = Number(v);
  if (!Number.isFinite(n)) return NO_DATA_TEXT;
  return n === 0 ? '0 (' + MEASURED_ZERO_TEXT + ')' : fmtInt(n);
}

// Rata-rata/rasio berdesimal (mis. DAU rata-rata, permintaan per perangkat).
function fmtAvg(m, v, digits) {
  if (!isMeasured(m)) return stateText(m);
  const n = Number(v);
  if (!Number.isFinite(n)) return NO_DATA_TEXT;
  return n === 0 ? '0 (' + MEASURED_ZERO_TEXT + ')' : fmtNum(n, digits == null ? 1 : digits);
}

function fmtRate(m, part, whole, digits) {
  if (!isMeasured(m)) return stateText(m);
  return fmtPct(part, whole, digits);
}

function fmtMoney(m, v, digits) {
  if (!isMeasured(m)) return stateText(m);
  return fmtUsd(v, digits);
}

function fmtDay(m, v) {
  if (!isMeasured(m)) return stateText(m);
  return v || NO_DATA_TEXT;
}

function row(label, value, hint) {
  return `<div class="kv"><span>${esc(label)}${hint ? ` <small style="color:var(--muted)">${esc(hint)}</small>` : ''}</span><b>${esc(value)}</b></div>`;
}

// Sparkline: hari dengan collection_ok=0 digambar PUTUS, tidak diinterpolasi. Grafik yang
// mulus di atas hari yang gagal dikumpulkan adalah kebohongan visual.
// Nol hari = TIDAK ADA GRAFIK, bukan garis datar di angka nol: garis datar adalah pengukuran,
// dan pengukuran itu tidak pernah terjadi.
function sparkline(series, key) {
  const points = (series || []).map((r) => Number(r[key]) || 0);
  if (points.length === 0) {
    return `<div class="nodata">Tidak ada grafik: ${esc(NO_DATA_TEXT)}. Garis datar di nol akan menyiratkan pengukuran yang belum pernah terjadi.</div>`;
  }
  if (points.length < 2) return '<div class="note">Belum cukup hari untuk digambar.</div>';
  const max = Math.max(...points, 1);
  const stepX = 100 / (points.length - 1);
  const segments = [];
  let current = [];
  (series || []).forEach((r, i) => {
    const ok = Number(r.collection_ok) !== 0;
    if (!ok) { if (current.length > 1) segments.push(current); current = []; return; }
    current.push(`${(i * stepX).toFixed(2)},${(46 - (Number(r[key]) || 0) / max * 42).toFixed(2)}`);
  });
  if (current.length > 1) segments.push(current);
  const paths = segments.map((s) => `<polyline fill="none" stroke="#2B2118" stroke-width="2" points="${s.join(' ')}"/>`).join('');
  return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="tren ${esc(key)}">
    <rect x="0" y="0" width="100" height="50" fill="#FFF8ED"/>${paths}</svg>`;
}

// Baris "tidak bisa diukur": panel yang MUSTAHIL dijawab dari lima tabel yang ada tidak diberi
// kueri karangan dan tidak dibiarkan kosong. Ia dicetak dengan alasannya, karena owner lebih
// butuh tahu batas datanya daripada menatap kotak kosong yang ia salah tafsirkan sebagai nol.
const UNMEASURABLE_TEXT = 'tidak bisa diukur dari data yang kita simpan';

function limitRows(m, panel) {
  return (m.unmeasurable || []).filter((u) => u.panel === panel).map((u) => (
    `<div class="kv"><span>${esc(u.hal)}</span><b>${esc(UNMEASURABLE_TEXT)}</b></div>`
    + `<div class="nodata">Kenapa: ${esc(u.sebab)}</div>`
  )).join('');
}

// Rentang batas-bawah–batas-atas. WAU/MAU disimpan sepasang karena dedup lintas hari mustahil;
// mencetaknya sebagai satu angka akan mengarang presisi yang datanya tidak punya.
function fmtRange(m, lo, hi) {
  if (!isMeasured(m)) return stateText(m);
  const a = Number(lo), b = Number(hi);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NO_DATA_TEXT;
  if (a === 0 && b === 0) return '0 (' + MEASURED_ZERO_TEXT + ')';
  return fmtInt(a) + '–' + fmtInt(b);
}

function fmtRateRange(m, part, wholeLo, wholeHi) {
  if (!isMeasured(m)) return stateText(m);
  const lo = fmtPct(part, wholeHi), hi = fmtPct(part, wholeLo);
  if (lo === '—' || hi === '—') return '—';
  return lo + '–' + hi;
}

const DEVICE_TRUTH = 'Angka ini ESTIMASI PERANGKAT, bukan orang. Satu orang dengan dua perangkat = dua hitungan; menghapus data browser = perangkat baru; dua orang satu perangkat = satu hitungan.';

/**
 * Distribusi bucket -> baris tabel. Peta KOSONG dicetak "belum ada pengukuran", BUKAN "0" —
 * aturan kejujuran yang sama dengan seluruh halaman ini: nol adalah klaim, dan klaim butuh
 * pengukuran. `order` menjaga urutan bermakna (m0-40 sebelum m80-100) alih-alih alfabetis.
 */
function evidenceDist(map, order) {
  const src = map || {};
  const keys = (order ? order.filter((k) => src[k] != null) : Object.keys(src).sort());
  if (!keys.length) return `<div class="note">${esc(NO_DATA_TEXT)}</div>`;
  const total = keys.reduce((n, k) => n + (Number(src[k]) || 0), 0) || 1;
  return keys.map((k) => row(esc(k), `${esc(fmtInt(src[k]))} (${esc(Math.round(src[k] / total * 100))}%)`)).join('');
}

/**
 * Panel BUKTI BELAJAR BRAINCORE di dalam dashboard yang SUDAH ADA — bukan halaman kedua.
 * Yang dirender hanya agregat berenum tertutup; endpoint sumbernya secara struktur tidak bisa
 * mengembalikan identitas murid (rute owner di Worker api dilarang membaca tabel yang memuat
 * cohort), dan `sanitizeEvidenceSummary` membuang apa pun di luar daftar putih.
 */
function renderEvidenceSection(m) {
  const e = m.evidence || { state: 'unconfigured', summary: null };
  const head = '<section><h2>\u{1F9E0} Braincore evidence</h2>';
  if (e.state === 'unconfigured') {
    return head + `<div class="note">BELUM DIKONFIGURASI. Secret <code>EVIDENCE_API_BASE</code> dan
      <code>EVIDENCE_API_TOKEN</code> belum dipasang di Worker ini, jadi panel ini tidak pernah memanggil
      apa pun. Ini BUKAN "nol murid".</div></section>`;
  }
  if (e.state === 'unavailable') {
    return head + `<div class="warn">${esc(UNAVAILABLE_TEXT.toUpperCase())}. Subrequest ke
      <code>/api/owner/braincore-evidence</code> gagal${e.status ? ` (status ${esc(e.status)})` : ''}.
      Kegagalan baca TIDAK PERNAH dirender sebagai angka nol.</div></section>`;
  }
  if (e.state === 'not-migrated' || !e.summary) {
    return head + `<div class="note">PENGUKURAN BELUM TERSEDIA. Database bukti (<code>fiezel-evidence</code>)
      belum dimigrasi atau binding <code>EVIDENCE_DB</code> belum terpasang di Worker api. Ini BUKAN
      "nol murid".</div></section>`;
  }
  const s = e.summary;
  if (!s.measured) {
    return head + `<div class="note">BELUM ADA PENGUKURAN pada periode ini. Tidak ada satu pun batch bukti
      yang mendarat${e.range ? ` antara ${esc(e.range.from)} dan ${esc(e.range.to)}` : ''}.</div></section>`;
  }
  const dayRows = (s.days || []).map((d) =>
    `<tr><td>${esc(d.day)}</td><td>${esc(fmtInt(d.learners))}</td><td>${esc(fmtInt(d.evidence))}</td><td>${esc(fmtInt(d.decisions))}</td></tr>`
  ).join('');
  return head + `
    <div class="big">${esc(fmtInt(s.learnersMeasured))}</div>
    ${row('Murid terukur (periode)', fmtInt(s.learnersMeasured), 'cohort acak berotasi 14 hari')}
    ${row('Bukti belajar terkirim', fmtInt(s.evidenceCount), 'event learner_evidence')}
    ${row('Keputusan Braincore', fmtInt(s.decisionCount), 'event braincore_decision')}
    <h3>Tren mastery</h3>${evidenceDist(s.masteryTrend, ['up', 'flat', 'down'])}
    <h3>Sebaran mastery</h3>${evidenceDist(s.mastery, ['m0-40', 'm40-60', 'm60-80', 'm80-100'])}
    <h3>Tren miskonsepsi</h3>${evidenceDist(s.misconception, ['none', 'mc1', 'mc2-3', 'mc4p'])}
    <h3>Famili skill miskonsepsi</h3>${evidenceDist(s.misconceptionSkill)}
    <h3>Kalibrasi kesulitan</h3>${evidenceDist(s.difficultyCalibration, ['too_easy', 'calibrated', 'too_hard'])}
    <h3>Galat kalibrasi</h3>${evidenceDist(s.calibrationError, ['e0-10', 'e10-20', 'e20-40', 'e40p'])}
    <h3>Alasan keputusan Braincore</h3>${evidenceDist(s.decision)}
    <h3>Hasil kebijakan</h3>${evidenceDist(s.outcome, ['positive', 'mixed', 'negative', 'insufficient'])}
    <h3>Rekomendasi kebijakan</h3>${evidenceDist(s.recommendation)}
    <h3>Tren perbaikan belajar</h3>${evidenceDist(s.improvementTrend, ['improving', 'steady', 'declining'])}
    <h3>Per hari</h3>
    <table><tr><th>hari</th><th>murid baru</th><th>bukti</th><th>keputusan</th></tr>${dayRows}</table>
    <div class="note">"Murid terukur" dijumlahkan dari murid BARU per hari; satu murid yang aktif tiga hari
      terhitung tiga kali. Angka unik lintas-hari TIDAK dihitung, dan itu disengaja: menghitungnya menuntut
      menyimpan pengenal lebih lama daripada yang dibenarkan.</div>
    <div class="note">NOL identitas di panel ini. Yang tersimpan di server hanyalah bucket berenum tertutup;
      nama murid, jawaban, dan riwayat tidak pernah meninggalkan perangkat.</div>
  </section>`;
}

function renderDashboard(m) {
  const t = m.totals || {}, l = m.latest || {}, c = m.cost || {}, a = (c.assumptions || {});
  const periodLabel = { today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' }[m.period] || m.period;
  const nav = Object.keys(PERIODS).map((p) => `<a href="/?period=${esc(p)}"${p === m.period ? ' aria-current="page"' : ''}>${esc({ today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' }[p])}</a>`).join('');
  const u = m.usage || {};
  const brokenDays = Number(m.broken && m.broken.days_broken) || 0;
  const ttsTotal = (Number(t.tts_cache_hits) || 0) + (Number(t.tts_cache_misses) || 0);
  // Error AI dipecah dari `usage_daily` (bucket `ai_err:<kode>`), bukan dari metrik lebar yang
  // tidak pernah ada penulisnya. Totalnya tetap dari metrik `ai_failure` supaya dua sumber bisa
  // dibandingkan; kalau berbeda, itu sinyal nyata, bukan bug tampilan.
  const aiErrBuckets = ['ai_err:429', 'ai_err:timeout', 'ai_err:4xx', 'ai_err:5xx', 'ai_err:other'];
  const aiErrBucketSum = aiErrBuckets.reduce((s, k) => s + (Number(u[k]) || 0), 0);

  // n= kohor berasal dari baris offset D0 kohor yang sama — tidak ada kolom ukuran kohor di skema.
  const retentionRows = (m.retentionRollup || []).map((r) => {
    const pct = r.base >= RETENTION_MIN_COHORT ? fmtPct(r.retained, r.base) : 'belum cukup data';
    return `<tr><td>D${esc(r.day_index)}</td><td>${esc(fmtInt(r.retained))}</td><td>n=${esc(fmtInt(r.base))}</td><td>${esc(pct)}</td><td>${esc(fmtInt(r.cohorts))}</td></tr>`;
  }).join('') || `<tr><td colspan="5">Nol cohort dalam rentang ini — ${esc(NO_DATA_TEXT)}, bukan retensi 0%.</td></tr>`;

  // Spanduk keadaan: dicetak DI ATAS semua panel, bukan sebagai catatan kaki. Kalau halaman ini
  // belum punya pengukuran, itu berita utamanya.
  const emptyBanner = m.measurement && m.measurement.notice
    ? `<div class="empty"><b>⚠️ ${esc(m.measurement.state === STATE_UNAVAILABLE ? UNAVAILABLE_TEXT.toUpperCase() : NO_DATA_TEXT.toUpperCase())}</b>${esc(m.measurement.notice)}`
      + `<br><br>Hari terrollup di seluruh tabel: <b>${esc(m.measurement.daysTotal == null ? stateText(m) : fmtInt(m.measurement.daysTotal) + ' hari')}</b> · `
      + `hari terrollup di periode ini: <b>${esc(m.measurement.daysCounted == null ? stateText(m) : fmtInt(m.measurement.daysCounted) + ' hari')}</b>.`
      + `${(m.measurement.readErrors || []).length ? `<br>Query yang gagal dibaca: <code>${esc((m.measurement.readErrors || []).join(', '))}</code>.` : ''}`
      + `<br>Semua angka di bawah bertanda “${esc(stateText(m))}”.`
      + `${m.measurement.state === STATE_UNAVAILABLE ? ' Kegagalan baca TIDAK PERNAH dirender sebagai angka nol.' : ` Angka yang benar-benar nol akan bertanda “${esc(MEASURED_ZERO_TEXT)}” — dua hal itu sengaja dibedakan.`}</div>`
    : '';

  // Spanduk KEBASIAN, terpisah dari spanduk keadaan. Halaman bisa "terukur" dan tetap basi, dan
  // itu keadaan paling berbahaya: angkanya nyata, hanya saja bukan angka hari ini.
  const staleBanner = Number.isFinite(m.staleDays) && m.staleDays > 1
    ? `<div class="warn"><b>⚠️ DATA BASI ${esc(fmtInt(m.staleDays))} HARI.</b> Rollup terakhir ${esc(m.anchorDay)}, sedangkan hari ini ${esc(m.today)}.
       Rentang periode di halaman ini dihitung dari HARI INI, bukan dari hari rollup terakhir, jadi hari-hari yang hilang ikut terlihat
       sebagai hari tanpa data. Periksa cron rollup sebelum menyimpulkan pemakaian turun.</div>`
    : '';

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>FIEZEL · Dashboard Owner</title>
<style>${CSS}</style></head><body>
<header>
  <h1>FIEZEL · Dashboard Owner</h1>
  <div class="sub">Periode <b>${esc(periodLabel)}</b> · ${esc(m.from)} → ${esc(m.to)} (hari WIB, zona murid) ·
  rollup terakhir ${esc(l.day || '—')} · dirender ${esc(m.generatedAtIso)}</div>
</header>
<nav>${nav}<a href="/logout" style="margin-left:auto">Keluar</a></nav>
${emptyBanner}${staleBanner}
<main>

  <section>
    <h2>⬇️ Ekspor data (CSV)</h2>
    <div class="note">Berkas mengikuti periode yang sedang dipilih (<b>${esc(periodLabel)}</b>) dan
    berisi angka yang SAMA dengan yang dirender di halaman ini — nol data tambahan, nol dimensi
    baru. Setiap berkas membawa baris <code>measurement_state</code> supaya "belum diukur" tidak
    pernah terbaca sebagai "nol" setelah berkas ini beredar terlepas dari dashboard.</div>
    <p>
      <a href="/api/export/summary.csv?period=${esc(m.period)}">Ringkasan metrik</a> ·
      <a href="/api/export/series.csv?period=${esc(m.period)}">Deret harian (tren)</a> ·
      <a href="/api/export/retention.csv?period=${esc(m.period)}">Retensi per kohor</a> ·
      <a href="/api/export/evidence.csv?period=${esc(m.period)}">Bukti belajar Braincore</a>
    </p>
    <div class="note">Untuk pembaca mesin, JSON yang setara sudah ada di
    <code>/api/summary</code>, <code>/api/series</code>, dan <code>/api/retention</code>.</div>
  </section>


  <section>
    <h2>👥 User growth</h2>
    <div class="big">${esc(fmtCount(m, t.new_users))}</div>
    ${row('Perangkat baru (periode)', fmtCount(m, t.new_users))}
    ${row('Aplikasi dibuka (periode)', fmtCount(m, t.app_open), 'pembukaan, bukan orang unik')}
    ${row('Pembukaan dengan akun tertaut', fmtCount(m, t.app_open_with_identity))}
    ${row('Laporan hari-aktif', fmtCount(m, t.day_active_reports))}
    ${sparkline(m.series, 'new_users')}
    <div class="warn">${esc(DEVICE_TRUTH)}</div>
    <div class="note">"Aplikasi dibuka" adalah BATAS BAWAH: PWA yang dibuka dari precache tanpa jaringan tidak pernah mengirim event, jadi ia tidak terhitung.</div>
    ${limitRows(m, 'User growth')}
  </section>

  <section>
    <h2>🔥 Active users (DAU / WAU / MAU)</h2>
    <div class="big">${esc(fmtCount(m, l.dau))}</div>
    ${row('DAU (hari rollup terakhir)', fmtCount(m, l.dau))}
    ${row('WAU', fmtRange(m, l.wau_lower, l.wau_upper), 'rentang batas bawah–atas')}
    ${row('MAU', fmtRange(m, l.mau_lower, l.mau_upper), 'rentang batas bawah–atas')}
    ${row('Stickiness DAU/MAU', fmtRateRange(m, l.dau, l.mau_lower, l.mau_upper))}
    ${row('Puncak DAU pada periode', fmtCount(m, m.peak.dau_peak))}
    ${row('Rata-rata DAU pada periode', fmtAvg(m, m.peak.dau_avg, 1))}
    ${row('Hari DAU terrollup pada periode', fmtCount(m, m.peak.dau_days), `dari ${esc(m.span)}`)}
    ${sparkline(m.series, 'dau')}
    <div class="warn">${esc(DEVICE_TRUTH)} "Aktif" = hari dengan ≥5 jawaban (ambang yang sama dengan cincin misi murid).</div>
    <div class="warn">WAU dan MAU sengaja RENTANG, bukan satu angka${Number(l.wau_mau_is_estimate) ? ' (penanda estimasi dari job rollup menyala)' : ''}: token perangkat dirotasi tiap 24 jam dan pepper lama dihapus, jadi menyambungkan perangkat lintas hari mustahil. Batas bawah = perangkat harian terbanyak, batas atas = jumlah seluruh hari.</div>
    <div class="note">DAU/WAU/MAU dibaca dari baris agregat harian yang dibekukan job rollup — dashboard tidak pernah menyentuh tabel token per-perangkat.</div>
    ${limitRows(m, 'Active users')}
  </section>

  <section>
    <h2>↩️ Retention (observed)</h2>
    <table><thead><tr><th>Offset</th><th>Kembali</th><th>Cohort</th><th>%</th><th>Kohor</th></tr></thead>
    <tbody>${retentionRows}</tbody></table>
    <div class="note">Kolom Cohort (n=) diturunkan dari baris offset D0 kohor yang sama; skema retensi tidak menyimpan ukuran kohor sebagai kolom sendiri. Penyebut tiap baris hanya menjumlahkan kohor yang BENAR-BENAR punya pengamatan di offset itu — kohor yang belum cukup tua tidak diseret masuk sebagai "hilang". Kolom terakhir = jumlah kohor yang menyumbang, supaya "0%" tidak tertukar dengan "nol kohor".</div>
    <div class="warn">PERINGATAN ESTIMASI PERANGKAT: cohort dibangun dari perangkat, bukan orang.
    Ganti perangkat atau hapus data browser terlihat sebagai "berhenti" walau muridnya tetap belajar.
    Belajar offline berhari-hari juga menurunkan retensi tanpa ada murid yang hilang.
    Safari membatasi storage skrip 7 hari → cohort iOS bisa tampak berhenti di D7.</div>
    <div class="note">Persentase disembunyikan bila cohort &lt; ${esc(RETENTION_MIN_COHORT)}: angka presisi di atas cohort kecil adalah derau, bukan sinyal.</div>
    ${limitRows(m, 'Retention')}
  </section>

  <section>
    <h2>📚 Learning activity</h2>
    ${row('Jawaban', fmtCount(m, t.answers))}
    ${row('Jawaban benar', fmtCount(m, t.answers_ok))}
    ${row('Akurasi', fmtRate(m, t.answers_ok, t.answers))}
    ${row('Sesi dimulai', fmtCount(m, t.sessions))}
    ${row('Sesi tuntas', fmtCount(m, t.sessions_completed))}
    ${row('Pelajaran dimulai', fmtCount(m, t.lessons_started))}
    ${row('Pelajaran tuntas', fmtCount(m, t.lessons_completed))}
    ${row('Rasio tuntas', fmtRate(m, t.lessons_completed, t.lessons_started))}
    ${sparkline(m.series, 'answers')}
    <div class="note">Dilaporkan sendiri oleh klien (self-reported): bisa kurang (murid offline) dan bisa lebih (klien dimodifikasi). Angka biaya TIDAK pernah memakai kanal ini.</div>
  </section>

  <section>
    <h2>🤖 AI usage</h2>
    ${row('Permintaan AI', fmtCount(m, t.ai_calls))}
    ${row('Berhasil', fmtCount(m, t.ai_success))}
    ${row('Gagal', fmtCount(m, t.ai_failure))}
    ${row('Permintaan / perangkat aktif', fmtAvg(m, (Number(t.ai_calls) || 0) / Math.max(1, Number(l.dau) || 0), 2))}
    ${row('Token masuk', fmtCount(m, t.ai_tokens_in))}
    ${row('Token keluaran', fmtCount(m, t.ai_tokens_out))}
    ${row('Error 429', fmtCount(m, u['ai_err:429']))}
    ${row('Timeout', fmtCount(m, u['ai_err:timeout']))}
    ${row('Error 4xx', fmtCount(m, u['ai_err:4xx']))}
    ${row('Error 5xx', fmtCount(m, u['ai_err:5xx']))}
    ${row('Error lain', fmtCount(m, u['ai_err:other']))}
    ${row('Error rate', fmtRate(m, t.ai_failure, t.ai_calls))}
    ${sparkline(m.series, 'ai_calls')}
    ${aiErrBucketSum !== (Number(t.ai_failure) || 0) ? `<div class="warn">Rincian error berjumlah ${esc(fmtInt(aiErrBucketSum))} sedangkan metrik gagal berbunyi ${esc(fmtCount(m, t.ai_failure))}. Selisih ini nyata (event tanpa kode error tidak masuk rincian), bukan salah tampil — pakai metrik gagal sebagai angka resmi.</div>` : ''}
    <div class="warn">Token = bisa PROKSI (karakter ÷ 4). Jalur server tidak menandai hari mana yang memakai proksi, jadi peringatan ini dicetak tanpa syarat: perlakukan biaya LLM sebagai estimasi kasar.</div>
    <div class="note">Semua angka AI lahir di Worker (server-side), bukan dari klien — di situlah biaya lahir. Rincian kode error dibaca dari tabel dimensi pemakaian (bucket <code>ai_err:*</code>), bukan dari metrik terpisah per kode.</div>
    ${limitRows(m, 'AI usage')}
  </section>

  <section>
    <h2>🗣️ TTS usage</h2>
    ${row('Permintaan TTS', fmtCount(m, t.tts_calls))}
    ${row('Cache hit', fmtCount(m, t.tts_cache_hits))}
    ${row('Cache miss (berbayar)', fmtCount(m, t.tts_cache_misses))}
    ${row('Cache hit rate', fmtRate(m, t.tts_cache_hits, ttsTotal))}
    ${row('Karakter dirender', fmtCount(m, t.tts_chars_rendered))}
    ${row('≈ Menit audio', fmtAvg(m, (Number(t.tts_chars_rendered) || 0) / RATE_CARD.charsPerAudioMin, 1), `${fmtInt(RATE_CARD.charsPerAudioMin)} char/menit`)}
    ${row('Berhasil', fmtCount(m, t.tts_success))}
    ${row('Gagal', fmtCount(m, t.tts_failure))}
    ${row('Gagal 429', fmtCount(m, u['tts_err:429']))}
    ${row('Gagal timeout', fmtCount(m, u['tts_err:timeout']))}
    ${row('Gagal 5xx', fmtCount(m, u['tts_err:5xx']))}
    <div class="note">Hanya cache MISS yang berbiaya. Mesin suara on-device dihitung terpisah dan tidak masuk biaya; bandwidth model on-device (±152 MB/perangkat) TIDAK terukur skema ini.</div>
  </section>

  <section>
    <h2>🏗️ Infrastructure</h2>
    ${row('Breaker terbuka', fmtCount(m, t.breaker_trips))}
    ${row('Breaker pulih', fmtCount(m, t.breaker_recoveries))}
    ${row('Event analytics diterima', fmtCount(m, t.events_total))}
    <div class="note">Hanya tiga baris di atas yang benar-benar ada di tabel agregat. Permintaan Worker, objek/byte R2, error backend, dan latensi p50/p95 hidup di Analytics API Cloudflare (butuh token akun) — lihat baris "tidak bisa diukur" di bawah.</div>
    ${limitRows(m, 'Infrastructure')}
  </section>

  <section>
    <h2>💰 Cost estimation</h2>
    <div class="big">${esc(fmtMoney(m, c.totalUsd))}</div>
    ${row('TTS', fmtMoney(m, c.ttsUsd))}
    ${row('LLM', fmtMoney(m, c.llmUsd))}
    ${row('Biaya / perangkat aktif', !isMeasured(m) ? stateText(m) : (c.usdPerActiveDevice == null ? '—' : fmtUsd(c.usdPerActiveDevice, 4)))}
    <div class="assume">ASUMSI YANG DIPAKAI (bukan angka ajaib — sumber: reports/cf-a10-cost.md + cf-a10-cost-model.json):<br>
      · TTS <code>${esc(a.ttsProvider)}</code> = <code>${esc(fmtUsd(a.ttsUsdPer1MChars))}</code> per 1 juta karakter<br>
      · <code>chars_per_audio_min = ${esc(fmtInt(a.charsPerAudioMin))}</code> (kalibrasi 273 aset audio nyata)<br>
      · LLM <code>${esc(a.llmModel)}</code> = <code>${esc(fmtUsd(a.llmUsdPer1MIn, 3))}</code> masuk / <code>${esc(fmtUsd(a.llmUsdPer1MOut, 3))}</code> keluar per 1 juta token<br>
      · Rumus: <code>tts = char_dirender/1e6 × tarif</code>; <code>llm = tok_in/1e6 × tarif_in + tok_out/1e6 × tarif_out</code>; <code>total = tts + llm + infra − kredit</code><br>
      · Hanya cache MISS yang ditagih. TARIF TIDAK DISIMPAN PER HARI: tidak ada tabel biaya di database ini dan tidak boleh ada, jadi tarif di atas dipakai ulang untuk SEMUA hari. Mengubahnya mengubah angka bulan lalu juga — ini estimasi sekarang, bukan jejak audit.
    </div>
    ${limitRows(m, 'Cost estimation')}
    <div class="warn">Penyebut "perangkat aktif" adalah UNDER-COUNT (murid offline tidak terlihat), jadi biaya/perangkat aktif adalah BATAS ATAS, bukan angka pasti.${a.tokensAreEstimated ? ' Token keluaran = proksi char/4 → biaya LLM adalah estimasi kasar.' : ''} Bila TTS berjalan on-device, biaya TTS nyata NOL dan yang perlu dipantau justru bandwidth model.</div>
  </section>

  <section>
    <h2>⚠️ Quota exhaustion</h2>
    <div class="big">${esc(fmtCount(m, t.quota_exhausted))}</div>
    ${row('Penolakan karena kuota habis', fmtCount(m, t.quota_exhausted), 'penolakan, bukan perangkat')}
    ${row('· kuota AI', fmtCount(m, u['quota:ai']))}
    ${row('· kuota TTS', fmtCount(m, u['quota:tts']))}
    ${row('· kuota terjemahan', fmtCount(m, u['quota:translate']))}
    ${row('429 dari AI', fmtCount(m, u['ai_err:429']))}
    ${row('Breaker terbuka', fmtCount(m, t.breaker_trips))}
    ${limitRows(m, 'Quota exhaustion')}
    <div class="note">KEPUTUSAN KUOTA: kalau baris di atas berbunyi "${esc(NO_DATA_TEXT)}", tidak ada satu pun angka di halaman ini yang boleh dipakai untuk menaikkan atau menurunkan kuota. Yang belum diukur tidak bisa dipangkas.</div>
    <div class="note">Dicatat server-side tepat di cabang yang mengembalikan 429. Angka naik = murid ditolak; itu keputusan biaya yang terlihat, bukan bug yang disembunyikan.</div>
  </section>

  <section>
    <h2>🔎 Data quality</h2>
    ${row('Keadaan pengukuran', isMeasured(m) ? 'terukur' : stateText(m))}
    ${row('Pengumpulan dimulai', m.collection.day_first_collected || NO_DATA_TEXT)}
    ${row('Hari terkumpul', m.measurement.daysTotal == null ? stateText(m) : fmtInt(m.measurement.daysTotal) + ' hari')}
    ${row('Hari dalam periode', m.measurement.daysCounted == null ? stateText(m) : fmtInt(m.measurement.daysCounted) + ' hari', `dari ${esc(m.span)}`)}
    ${row('Hari rollup GAGAL', fmtCount(m, brokenDays))}
    ${row('Rentang hari yang terbaca', isMeasured(m) ? `${esc(m.periodDays.day_from || '—')} → ${esc(m.periodDays.day_to || '—')}` : stateText(m))}
    ${brokenDays > 0 ? `<div class="warn">${esc(brokenDays)} hari punya collection_ok=0. Grafik digambar PUTUS di hari itu — tidak diinterpolasi. Jangan bandingkan periode yang memuat hari rusak.</div>` : ''}
    <div class="note">Semua angka historis dimulai dari tanggal pengumpulan di atas. Sebelum tanggal itu tidak ada data — bukan nol, tetapi tidak diketahui.</div>
    ${limitRows(m, 'Data quality')}
  </section>

  ${renderEvidenceSection(m)}

</main>
<footer>Sumber: TIGA tabel agregat saja — metrik harian (bentuk panjang: hari × nama metrik × nilai), dimensi pemakaian berenum tertutup, dan retensi kohor. Tabel token perangkat dan bahan rahasia rotasi ADA di database yang sama tetapi TIDAK PERNAH dibaca halaman ini. Dashboard ini tidak punya jalan untuk membaca baris per-orang, dan tidak menampilkan identitas, surel, isi jawaban, maupun percakapan AI.
Baris bertanda “${esc(UNMEASURABLE_TEXT)}” adalah batas nyata skema, bukan kerusakan: menambah tabel untuk menutupnya melanggar kunci lima tabel yang menjaga privasi murid.
Kontrak: EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL" · bentuk tabel: workers/api/migrations/0002_analytics.sql · rumus biaya: reports/cf-a10-cost.md.</footer>
</body></html>`;
}

function renderLogin(message) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>FIEZEL · Masuk Owner</title><style>${CSS}</style></head><body>
<header><h1>FIEZEL · Masuk Owner</h1><div class="sub">Halaman ini tidak memuat satu angka metrik pun.</div></header>
<form method="POST" action="/login">
  <label for="t">Token owner</label>
  <input id="t" name="t" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>
  <button type="submit">Masuk</button>
  ${message ? `<div class="warn">${esc(message)}</div>` : ''}
  <div class="note">Token tidak disimpan di repo. Yang ada di server hanya sha256 HEX-nya (Secret <code>OWNER_TOKEN_HASH</code>). Sesi berumur 30 menit.</div>
</form></body></html>`;
}

function html(body, status, extraHeaders) {
  return new Response(body, {
    status: status || 200,
    headers: Object.assign({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      // Tanpa CDN dan tanpa framework, jadi CSP bisa seketat ini.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    }, extraHeaders || {}),
  });
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/* ============================ Ekspor CSV ================================================== */
//
// KENAPA ADA, padahal /api/summary sudah mengembalikan JSON yang sama: JSON dibaca mesin,
// CSV dibaca ORANG di spreadsheet. Pembaca yang paling penting untuk angka-angka ini —
// calon pembeli yang melakukan due diligence, guru, akuntan — memeriksa angka di Excel /
// Google Sheets, bukan dengan `curl | jq`. Menyuruh mereka mengubah JSON bersarang menjadi
// tabel sendiri adalah hambatan yang tidak perlu, dan hambatan itu terbaca sebagai
// "angkanya tidak mau diperiksa".
//
// APA YANG TIDAK BERUBAH: nol data baru. Setiap baris CSV berasal dari model yang SAMA yang
// sudah dirender di HTML dan sudah dikembalikan /api/*. Tidak ada kueri baru, tidak ada
// tabel baru, tidak ada dimensi baru — jadi permukaan privasinya identik dengan halaman yang
// sudah dilihat owner. Ekspor yang menambah kolom baru akan melanggar kontrak lima tabel;
// ekspor ini hanya mengubah BENTUK penyajian.
//
// KEADAAN PENGUKURAN IKUT DIEKSPOR, bukan hanya angkanya. Baris `measurement_state` dan
// `measurement_notice` selalu ada di setiap berkas. Alasannya sama dengan alasan panel HTML
// tidak pernah merender nol polos: CSV yang hanya berisi angka membuat "belum diukur" dan
// "nol" tidak bisa dibedakan lagi begitu ia terlepas dari dashboard — dan berkas CSV JUSTRU
// dibuat untuk beredar terlepas dari dashboard.

// RFC 4180: bungkus dengan kutip ganda bila memuat pemisah/kutip/baris baru, dan gandakan
// kutip di dalamnya. Nilai null/undefined menjadi sel KOSONG, bukan string "null" —
// "null" di spreadsheet terbaca sebagai teks dan merusak kolom angka.
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function csvRows(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// Nama berkas membawa periode dan rentang tanggal supaya dua unduhan tidak saling menimpa di
// folder Unduhan, dan supaya berkas yang beredar lepas dari dashboard tetap menyebutkan
// dirinya sendiri.
function csv(rows, namaDasar, model) {
  const nama = `fiezel-${namaDasar}-${model.period}-${model.from}_${model.to}.csv`;
  return new Response(csvRows(rows), {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nama}"`,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
    },
  });
}

// Kepala yang sama untuk SETIAP ekspor: apa ini, periode mana, dan — yang terpenting —
// keadaan pengukurannya.
function csvKepala(model, judul) {
  return [
    ['fiezel_export', judul],
    ['schema', 'fiezel-owner-export-v1'],
    ['period', model.period],
    ['from', model.from],
    ['to', model.to],
    ['generated_at', model.generatedAtIso],
    ['measurement_state', model.measurement.state],
    ['measurement_notice', model.measurement.notice || ''],
    ['measurement_basis', 'perangkat-estimasi'],
    ['honesty', DEVICE_TRUTH],
    [],
  ];
}

/* ============================ Rem penebakan halaman masuk ================================= */
//
// ==========================================================================================
// 🔄 TEMUAN LAPANGAN 28 Agu 2026 (D4) — REM VERSI LAMA DEKORATIF, DIUKUR KE PRODUKSI HIDUP
// ==========================================================================================
// Versi sebelum commit ini:
//
//     const loginAttempts = new Map();                  // <-- lingkup MODUL = per ISOLATE
//     const LOGIN_MAX = 8;
//     if (loginThrottled('login', now)) ...             // <-- KUNCI KONSTAN = satu ember global
//
// Dua cacat, dan keduanya diukur, bukan ditebak:
//
// CACAT 1 — REM TIDAK PERNAH TERKUMPUL. `Map` di lingkup modul hidup di dalam SATU isolate.
//   Cloudflare menjalankan banyak isolate per colo dan mendaur ulangnya sesuka runtime, jadi
//   penghitungnya tidak pernah menumpuk. Bukti lapangan: **12 percobaan token salah berturut-
//   turut** ke `POST https://owner.fiezel.my.id/login` menghasilkan **403 dua belas kali, NOL
//   429**, padahal `LOGIN_MAX` = 8. Remnya tidak pernah menyentuh sekali pun. Ini kelas cacat
//   yang sama dengan `rate-anon.js` sebelum ia memakai D1: "jatuh ke Map per isolate" adalah
//   fail-open yang dinamai lain, karena batas efektifnya = batas x jumlah isolate.
//
// CACAT 2 — KUNCI REM KONSTAN. `loginThrottled('login', now)` memakai string tetap, jadi SATU
//   ember untuk seluruh dunia. Kalau remnya benar-benar bekerja, penyerang cukup delapan kali
//   gagal untuk MENGUNCI OWNER keluar dari dashboardnya sendiri. Salah dua arah sekaligus:
//   tidak menahan penyerang, tetapi sanggup menahan pemilik.
//
// ==========================================================================================
// PENYIMPANAN YANG DIPILIH: KV `fiezel-CFG` (binding `CFG`) — BUKAN D1 `fiezel-stats`
// ==========================================================================================
// D1 `fiezel-stats` sudah terikat di Worker ini sebagai `ANALYTICS`, jadi memakainya "gratis"
// dari sisi konfigurasi. Ia tetap DITOLAK, dan alasannya bisa diperiksa:
//   1. Ia database ANALYTICS. `DEPLOY.md` + `analytics-privacy-test.js` mengunci database itu
//      pada LIMA tabel agregat; tabel rem login adalah data AUTH, dan menaruhnya di sana
//      melanggar pemisahan yang justru menjadi alasan Worker ini berdiri sendiri (README §1
//      "radius ledakan").
//   2. Worker ini HANYA-BACA terhadap `fiezel-stats`, dan sifat itu ditegakkan gerbang
//      (`queries.js` menolak memuat kata tulis; `owner-dashboard-test.js` gagal bila ada
//      pernyataan tulis). Rem yang menulis akan mengubah pembaca menjadi penulis — satu
//      invarian hilang untuk satu penghitung.
//   3. D1 single-threaded per database (cf-a11 risiko 5): tulis rem login akan berebut dengan
//      rollup analytics. Rem auth tidak boleh menjadi tetangga sibuk pekerjaan agregat.
//
// KV `fiezel-CFG` dipilih dengan HARGA YANG DIHITUNG, bukan diasumsikan:
//
// (a) KUOTA TULIS. Plan gratis: **1.000 tulis/hari** untuk kunci berbeda dan **1 tulis/detik**
//     untuk kunci yang sama (developers.cloudflare.com/kv/platform/limits/). Karena itu:
//       · yang menulis HANYA percobaan yang GAGAL. Login berhasil = NOL tulis; owner yang
//         menempel token dengan benar tidak pernah membebani kuota.
//       · percobaan yang DITOLAK 429 = NOL tulis (pola yang sama dengan `rate-anon.js`:
//         "penolakan: 1 SELECT saja, NOL tulis"). Ember yang sudah penuh tidak bisa dipakai
//         penyerang untuk membakar kuota tulis.
//       · konsekuensinya batas atas tulis dari SATU sumber yang menyerang tanpa henti =
//         LOGIN_MAX per jendela = 5 per 10 menit = 30/jam = **720/hari**, yaitu 72% dari
//         1.000/hari, menyisakan ~280 tulis untuk `PUT /api/owner/flags` dan penanda anti-replay
//         `claim:jti:*` yang juga hidup di namespace ini. Angka 8 (nilai lama) akan memberi
//         8 x 6 x 24 = 1.152 tulis/hari, yaitu MELEBIHI kuota harian dari satu penyerang saja.
//         Itu salah satu dari dua alasan LOGIN_MAX diturunkan ke 5; lihat bab ANGKA JENDELA.
//       · serangan TERSEBAR (banyak IP) memang bisa menghabiskan kuota tulis: 200 IP x 5 = 1.000.
//         Yang terjadi kemudian BUKAN owner terkunci — lihat bab KEPUTUSAN KEGAGALAN
//         PENYIMPANAN. Ini ditulis di sini supaya tidak ada yang mengira KV membuat rem ini
//         kebal.
//
// (b) KONSISTENSI EVENTUAL — INI HARGA SEBENARNYA, DAN ANGKANYA JUJUR. KV menyimpan pusat lalu
//     men-cache per lokasi; perubahan bisa butuh **60 detik atau lebih** untuk terlihat di
//     lokasi lain, dan lebih lama di lokasi yang baru saja membaca versi sebelumnya —
//     termasuk pembacaan yang menyatakan kunci TIDAK ADA
//     (developers.cloudflare.com/kv/concepts/how-kv-works/). Nilai `cacheTtl` default 60 detik
//     dan MINIMUM yang diizinkan 30 detik
//     (developers.cloudflare.com/kv/api/read-key-value-pairs/), jadi rem ini memakai **30**:
//     jendela lag paling sempit yang boleh diminta.
//     BERAPA PERCOBAAN BISA LOLOS DI JENDELA LAG: selama satu jendela cache (≤30 detik) sebuah
//     lokasi bisa membaca hitungan yang basi (paling buruk: "kunci tidak ada"), jadi pada
//     jendela itu yang menegakkan batas hanyalah lapis memori per-isolate — yaitu
//     LOGIN_MAX (5) percobaan per isolate per 30 detik. Praktisnya satu klien yang menembak
//     lewat satu koneksi dilayani isolate yang sama, jadi ~5 percobaan/30 detik ≈ 10/menit;
//     penyerang yang benar-benar mendapat isolate baru setiap permintaan bisa melewatinya lebih
//     banyak selama 30 detik pertama. Sesudah jendela lag itu, hitungan terkumpul menjadi
//     terlihat dan sumber itu terkunci untuk sisa jendela 10 menit. Bandingkan dengan keadaan
//     HARI INI (12 dari 12 percobaan lolos, tanpa batas apa pun): remnya berubah dari nol
//     menjadi ratusan kali lebih rapat. Itu sebabnya harga konsistensi eventual DITERIMA di
//     sini — yang dilindungi bukan invarian akuntansi, ini rem banjir.
//     Kunci ember juga SENGAJA berputar per 2 menit (`LOGIN_BUCKET_MS`): nama kunci yang baru
//     belum punya entri cache, jadi kerusakan akibat cache basi terbatas kira-kira selebar SATU
//     ember, bukan selebar seluruh jendela.
//
// (c) KUOTA BACA. 100.000 baca/hari (plan gratis). Satu percobaan = `LOGIN_WINDOW_BUCKETS` (5)
//     baca. Sumber yang sudah diketahui terkunci di isolate ini ditolak dengan **NOL** operasi
//     KV (lapis memori jadi cache-negatif), jadi banjir berkepanjangan tidak menguras kuota
//     baca sebesar 5x jumlah permintaan.
//
// (d) NOL binding baru ke `fiezel-core`. Binding yang ditambahkan HANYA `CFG` -> `fiezel-CFG`
//     (namespace flag/config yang sudah ada, id 6386fc9752e14afd8a8f76a8d45e47d1). Database
//     `fiezel-core` (identity/session/quota_daily = data per-orang) TIDAK pernah terikat di
//     Worker ini, dan `owner-edge-guard-test.js` butir (g-g) tetap memaksanya.
//     Klaim "nol tulis KV" di `wrangler.toml`/README SUDAH DIPERBAIKI, bukan dibiarkan bohong.
//
// ==========================================================================================
// KUNCI EMBER: PER-SUMBER, DAN IP TIDAK PERNAH DISIMPAN MENTAH
// ==========================================================================================
// Sumbernya `CF-Connecting-IP` — header yang DITULIS Cloudflare, bukan klien: apa pun yang
// dikirim klien dengan nama itu ditimpa sebelum Worker melihatnya. Ia dipakai HANYA sebagai
// kunci ember, TIDAK PERNAH sebagai pemilih tarif atau pemberi hak (pola yang sama, dan alasan
// yang sama, seperti `workers/api/rate-anon.js`).
//
// IP MENTAH TIDAK PERNAH DISIMPAN DAN TIDAK PERNAH DICATAT. Yang menjadi kunci adalah
// HMAC-SHA256(salt, 'owner-login|v1|<indeks-hari>|<lingkup>|<ip>') dipotong 128 bit — persis
// pendekatan `rate-anon.js:ipHmacOf()` (indeks hari ikut ditandatangani supaya hash tidak bisa
// dipakai melacak satu jaringan antar hari). Salt: `RATE_SALT` (nama yang sama dengan rem laju
// lain), lalu `OWNER_SESSION_KEY` sebagai lantai kedua supaya kunci tetap ber-secret walau owner
// belum memasang `RATE_SALT` (keluarannya satu arah + terpotong, jadi ia tidak membocorkan kunci
// sesi; memutar kunci itu hanya mengosongkan ember, dan itu tidak berbahaya), lalu konstanta
// sebagai lantai terakhir — masih hash satu arah, hanya tidak ber-secret. Pasang `RATE_SALT`.
//
// KENAPA PER-SUMBER ITU SYARAT, BUKAN PENYEMPURNAAN: dengan satu ember global, delapan
// percobaan gagal dari siapa pun akan MENGUNCI OWNER keluar dari satu-satunya pintunya. Rem
// yang bisa dipakai menyerang ketersediaan owner lebih buruk daripada rem yang tidak ada.
//
// JALUR JEMBATAN (`edgePath === 'header'`, proxy PHP -> *.workers.dev) TIDAK punya IP murid:
// `deploy/edge/*.php` sengaja tidak meneruskannya (keputusan privasi di berkas itu). Di jalur
// itu semua permintaan tampak dari satu IP, jadi embernya memang BERSAMA — dan karena ember
// bersama bisa dipakai mengunci owner, batasnya dipisah dan dilonggarkan (`LOGIN_MAX_SHARED`),
// sama seperti cabang jembatan di `rate-anon.js` yang menjadi anggaran GLOBAL, bukan per-orang.
// Granularitas per-sumber di belakang jembatan MUSTAHIL tanpa meneruskan IP; itu batas nyata,
// bukan kelalaian. Jalur jembatan tetap cadangan; jalur hidup hari ini adalah custom domain.
//
// ==========================================================================================
// ANGKA JENDELA, UNTUK SATU MANUSIA YANG KADANG SALAH TEMPEL TOKEN
// ==========================================================================================
// LOGIN_MAX = 5 percobaan GAGAL per sumber per 10 menit BERGULIR (5 ember x 2 menit).
//   · satu manusia yang salah tempel: 1-2 kali (token terpotong, spasi ikut tersalin, salah
//     entri di password manager). 3 kali sudah hari yang buruk. 5 = ~2x hari terburuk itu.
//   · sisi penyerang: 5 per 10 menit = 720 percobaan/hari/sumber terhadap token 32 byte acak.
//     Peluang menebaknya tetap nol untuk semua maksud praktis (lihat bab KEJUJURAN).
//   · sisi kuota: 720 tulis KV/hari (bab PENYIMPANAN (a)) — di bawah 1.000/hari. Angka 8 lama
//     akan melewatinya sendirian.
// JENDELA BERGULIR, bukan reset di menit ke-0 (pelajaran `rate-anon.js`): dengan ember tetap,
// penyerang cukup MENUNGGU pergantian jendela untuk mendapat kuota penuh, dan dua ember
// berdampingan memberi 2x batas dalam dua menit.
// OWNER TIDAK BISA TERKUNCI SELAMANYA OLEH KESALAHANNYA SENDIRI:
//   · ember tertua keluar dari jendela setiap 2 menit, jadi owner yang kehabisan percobaan
//     mendapat satu percobaan lagi setelah **2 menit** — bukan "tunggu 10 menit", dan bukan
//     "tunggu sampai jam berganti";
//   · seluruh jendela pulih setelah **10 menit** tanpa percobaan gagal baru;
//   · kunci KV berumur `LOGIN_KV_TTL_S` (jendela + satu ember) lalu HILANG SENDIRI — tidak ada
//     baris yang menumpuk, tidak ada cron pembersih, tidak ada keadaan yang bisa "macet"
//     terkunci karena sesuatu lupa dihapus;
//   · login BERHASIL tidak pernah menambah hitungan, dan kegagalan lama tidak pernah menghalangi
//     percobaan setelah jendelanya bergulir habis.
//
// ==========================================================================================
// KEPUTUSAN: KALAU PENYIMPANAN GAGAL (KV galat / kuota habis / binding belum dipasang)
// ==========================================================================================
// YANG DIPILIH: **FAIL-OPEN terhadap PENGUNCIAN** — galat penyimpanan TIDAK PERNAH, dengan
// sendirinya, menghasilkan 429. Remnya tidak menghilang: ia jatuh ke lapis memori per-isolate
// dengan batas YANG SAMA (bukan diperketat), jadi banjir di dalam satu isolate tetap tertahan.
//
// INI SENGAJA KEBALIKAN dari `workers/api/rate-anon.js`, yang memilih "fail-closed terhadap
// pembatas" (pembatas tetap jalan DAN batasnya diperketat ke 5). Kenapa berbeda:
//   · YANG DILINDUNGI BERBEDA. Di jalur murid, yang di belakang pintu adalah UANG: setiap
//     identitas baru membawa jatah AI/TTS, jadi penyerang yang membuat penyimpanan gagal
//     MENDAPAT sesuatu. Di sini yang di belakang pintu adalah token acak 32 byte; penyerang
//     yang membuat KV gagal tidak mendapat apa pun yang bisa ia pakai — ia masih harus menebak
//     yang tak bisa ditebak.
//   · SIAPA YANG MENANGGUNG SALAH-KETAT BERBEDA. Di jalur murid, batas yang terlalu rapat
//     menunda AI/TTS satu murid dan pelajarannya tetap jalan (semua lokal). Di sini pintunya
//     SATU dan penggunanya SATU: kalau rem mengunci owner karena KV sedang tersendat, orang
//     yang terkunci adalah satu-satunya orang yang bisa memperbaiki apa pun — dan ia tidak
//     punya cara mengosongkan ember dari luar. Kegagalan penyimpanan tidak boleh menjadi
//     kunci gembok.
//   · ARAH PENYALAHGUNAANNYA BERBEDA. Membuat rem ini gagal ke arah "terbuka" memberi penyerang
//     paling banyak beberapa percobaan tambahan per isolate; membuat rem murid gagal ke arah
//     "terbuka" memberi penyerang identitas tak terbatas, dan itu tagihan.
// Yang TIDAK dilakukan di sini, dan itu penting: rem tidak pernah mengembalikan 429 karena
// pembacaan penyimpanan GAGAL, dan tidak pernah menaikkan hitungan siapa pun karena galat.
//
// ==========================================================================================
// KEJUJURAN: APA YANG REM INI TIDAK MENCEGAH
// ==========================================================================================
// Rem ini menahan PENEBAKAN dan credential stuffing berlaju tinggi dari satu sumber. Ia TIDAK
// menolong sedikit pun terhadap ancaman yang sebenarnya: **token yang BOCOR**. Token owner
// dibuat `openssl rand -base64 32` (32 byte acak); menebaknya di luar jangkauan siapa pun,
// dengan atau tanpa rem. Penyerang yang MEMEGANG tokennya masuk pada percobaan PERTAMA, dan
// rem apa pun akan meloloskannya karena satu percobaan yang benar tidak pernah tampak seperti
// serangan. Yang menutup jalur itu bukan rem, melainkan: (1) ROTASI token yang bocor, (2)
// Cloudflare Access + MFA di depan `owner.fiezel.my.id` (lapis kedua yang dijanjikan README §2,
// belum aktif — butuh satu tindakan owner di dashboard Zero Trust), (3) umur sesi 30 menit.
// Jangan membaca 429 di halaman ini sebagai "dashboard sudah aman".

const LOGIN_MAX = 5;                        // percobaan GAGAL per sumber per jendela
const LOGIN_MAX_SHARED = 20;                // jalur jembatan: SATU ember untuk semua, jadi lebih longgar
const LOGIN_BUCKET_MS = 2 * 60 * 1000;      // lebar satu ember; juga granularitas pemulihan
const LOGIN_WINDOW_BUCKETS = 5;             // 5 x 2 menit = jendela 10 menit BERGULIR
const LOGIN_WINDOW_MS = LOGIN_BUCKET_MS * LOGIN_WINDOW_BUCKETS;
// `Retry-After` KONSTANTA = lebar satu ember. Keputusan anti-oracle (pola `rate-anon.js`):
// nilai yang dihitung dari ember tertua akan memberi tahu penyerang kapan ia terakhir mencoba.
const LOGIN_RETRY_AFTER_S = LOGIN_BUCKET_MS / 1000;
const LOGIN_KV_PREFIX = 'ownerlogin:v1:';
const LOGIN_KV_CACHE_TTL_S = 30;            // MINIMUM yang diizinkan KV; jendela lag tersempit
const LOGIN_KV_TTL_S = (LOGIN_WINDOW_MS + LOGIN_BUCKET_MS) / 1000;  // kunci hilang sendiri
const LOGIN_DAY_MS = 86400000;
// BUKAN secret — hanya memastikan IP tidak pernah menjadi kunci mentah bahkan tanpa secret.
const LOGIN_SALT_FALLBACK = 'fiezel-owner-login-brake-v1';
const LOGIN_THROTTLE_TEXT = 'Terlalu banyak percobaan token yang gagal dari jaringan ini. '
  + 'Tunggu beberapa menit, lalu coba lagi.';

// Salt kunci rem. Urutan sengaja; lihat bab KUNCI EMBER.
function loginRateSalt(env) {
  const rate = env && typeof env.RATE_SALT === 'string' ? env.RATE_SALT.trim() : '';
  if (rate) return rate;
  const sessionKey = env && typeof env.OWNER_SESSION_KEY === 'string' ? env.OWNER_SESSION_KEY.trim() : '';
  if (sessionKey) return sessionKey;
  return LOGIN_SALT_FALLBACK;
}

// Kunci ember: `YYYY-MM-DDThh:mm` UTC dengan menit dibulatkan ke bawah ke kelipatan lebar ember.
// Lebar tetap + berawalan tanggal (bentuk yang sama dengan `rate-anon.js:bucketKey`).
function loginBucketKey(nowMs) {
  const floored = Math.floor(Number(nowMs) / LOGIN_BUCKET_MS) * LOGIN_BUCKET_MS;
  return new Date(floored).toISOString().slice(0, 16);
}

// Ember jendela BERGULIR: ember sekarang + (LOGIN_WINDOW_BUCKETS-1) sebelumnya. Tidak ada titik
// reset yang bisa ditunggu penyerang.
function loginWindowKeys(nowMs) {
  const keys = [];
  for (let i = 0; i < LOGIN_WINDOW_BUCKETS; i += 1) keys.push(loginBucketKey(Number(nowMs) - i * LOGIN_BUCKET_MS));
  return keys;
}

// IP pemanggil sebagaimana terlihat Cloudflare. Nilai ini HANYA masuk `loginSourceKey()`; ia
// tidak pernah dicatat, tidak pernah dikembalikan ke klien, dan tidak pernah menjadi kunci
// penyimpanan apa adanya. `x-real-ip` hanya lantai untuk harness (pola `rate-anon.js`), dan
// `cf-connecting-ip` SELALU menang bila ada — jadi klien tidak bisa memecah embernya sendiri.
function loginClientIp(request) {
  const headers = request && request.headers && request.headers.get ? request.headers : null;
  const cf = headers ? headers.get('cf-connecting-ip') : '';
  const real = headers ? headers.get('x-real-ip') : '';
  return String(cf || real || '').trim() || 'noip';
}

// Lingkup ember. 'shared' HANYA untuk jalur jembatan yang tidak membawa IP pemanggil.
function loginBrakeScope(edgePath) {
  return edgePath === 'header' ? 'shared' : 'ip';
}

function loginBrakeLimit(scope) {
  return scope === 'shared' ? LOGIN_MAX_SHARED : LOGIN_MAX;
}

// Kunci per-sumber: HMAC bersalt + indeks hari + lingkup, dipotong 128 bit. Tidak ada IP mentah
// yang pernah keluar dari fungsi ini.
async function loginSourceKey(env, request, edgePath, nowMs) {
  const scope = loginBrakeScope(edgePath);
  const source = scope === 'shared' ? 'bridge' : loginClientIp(request);
  const digest = await hmacHex(
    loginRateSalt(env),
    'owner-login|v1|' + Math.floor(Number(nowMs) / LOGIN_DAY_MS) + '|' + scope + '|' + source
  );
  return digest.slice(0, 32);   // 128 bit
}

/* Lapis kedua: ember per-isolate. Tiga tugas — (i) menahan banjir di dalam satu isolate lebih
 * cepat dan lebih murah daripada KV, (ii) cache-negatif supaya sumber yang sudah diketahui
 * terkunci ditolak dengan NOL operasi KV, (iii) satu-satunya rem yang tersisa bila KV gagal. */
const loginMemory = new Map();

function resetLoginBrakeForTests() {
  loginMemory.clear();
}

function loginMemoryPrune(nowMs) {
  const alive = new Set(loginWindowKeys(nowMs));
  for (const key of loginMemory.keys()) {
    if (!alive.has(key.slice(0, key.indexOf('|')))) loginMemory.delete(key);
  }
}

function loginMemoryCount(keys, source) {
  let seen = 0;
  for (const key of keys) seen += loginMemory.get(key + '|' + source) || 0;
  return seen;
}

/**
 * Periksa rem SEBELUM token dibandingkan. Mengembalikan keadaan yang dipakai
 * `loginBrakeRecordFailure()`; `throttled === true` berarti tolak 429.
 * Galat penyimpanan TIDAK PERNAH menghasilkan `throttled` (bab KEPUTUSAN).
 */
async function loginBrakeCheck(env, request, edgePath, nowMs) {
  const scope = loginBrakeScope(edgePath);
  const keys = loginWindowKeys(nowMs);
  const source = await loginSourceKey(env, request, edgePath, nowMs);
  const state = {
    scope, keys, source, limit: loginBrakeLimit(scope),
    throttled: false, headCount: 0, storage: 'memory',
  };

  loginMemoryPrune(nowMs);
  if (loginMemoryCount(keys, source) >= state.limit) {
    state.throttled = true;         // NOL operasi KV: cache-negatif melindungi kuota baca
    return state;
  }

  const kv = env && env.CFG;
  if (!kv || typeof kv.get !== 'function') return state;   // binding belum dipasang: memori saja

  let raw = null;
  try {
    raw = await Promise.all(keys.map((key) => kv.get(
      LOGIN_KV_PREFIX + key + ':' + source, { cacheTtl: LOGIN_KV_CACHE_TTL_S }
    )));
  } catch (_) {
    // FAIL-OPEN terhadap PENGUNCIAN: galat penyimpanan tidak pernah menolak owner. Remnya tetap
    // ada di lapis memori. Sebabnya tidak dicatat dengan nilai apa pun yang berasal dari IP.
    state.storage = 'error';
    return state;
  }

  state.storage = 'kv';
  let total = 0;
  for (const value of raw) {
    const n = Math.floor(Number(value));
    if (Number.isFinite(n) && n > 0) total += n;
  }
  const head = Math.floor(Number(raw[0]));
  state.headCount = Number.isFinite(head) && head > 0 ? head : 0;
  if (total >= state.limit) {
    // Keputusan disimpan di isolate ini supaya percobaan berikutnya dari sumber yang sama
    // ditolak tanpa menyentuh KV sama sekali.
    loginMemory.set(keys[0] + '|' + source, state.limit);
    state.throttled = true;
  }
  return state;
}

/**
 * Catat SATU percobaan GAGAL. Login berhasil tidak pernah memanggil ini (nol tulis untuk owner
 * yang benar), dan percobaan yang sudah ditolak 429 juga tidak (nol tulis untuk ember penuh).
 * Bukan compare-and-swap: dua permintaan serentak bisa kehilangan satu hitungan — rem banjir,
 * bukan invarian akuntansi (pernyataan yang sama ada di `rate-anon.js`).
 */
async function loginBrakeRecordFailure(env, state, nowMs) {
  const head = state.keys[0] + '|' + state.source;
  loginMemory.set(head, (loginMemory.get(head) || 0) + 1);
  loginMemoryPrune(nowMs);
  const kv = env && env.CFG;
  if (state.storage === 'error' || !kv || typeof kv.put !== 'function') return;
  try {
    await kv.put(LOGIN_KV_PREFIX + state.keys[0] + ':' + state.source, String(state.headCount + 1), {
      expirationTtl: LOGIN_KV_TTL_S,
    });
  } catch (_) {
    // Kuota tulis habis atau KV tersendat: rem TIDAK hilang (lapis memori sudah dinaikkan di
    // atas), dan owner TIDAK dikunci karena kegagalan itu.
  }
}

// Amplop 429. Bentuknya tidak bergantung pada riwayat sumber: tidak ada `remaining`, tidak ada
// `limit`, tidak ada `resetAt`, dan `Retry-After` KONSTANTA.
function loginThrottleResponse() {
  return html(renderLogin(LOGIN_THROTTLE_TEXT), 429, { 'retry-after': String(LOGIN_RETRY_AFTER_S) });
}

/* ============================ Penanda buku owner: `GET /` tanpa sesi ====================== */
// CACAT KETIGA (D4): `GET /` tanpa sesi menjawab 403 `{"error":"forbidden"}`. Owner yang membuka
// penanda buku — atau yang sesinya baru kedaluwarsa (30 menit, jadi ini kejadian HARIAN) —
// melihat JSON galat dan menyangka dashboardnya rusak. Yang benar: arahkan ke halaman masuk.
//
// Yang TIDAK dilemahkan oleh perbaikan ini:
//   · LAPIS 1 (penjaga tepi) tetap di depan: pengalihan ini hanya bisa dicapai permintaan yang
//     SUDAH lolos hostname kanonik / header jembatan. Di hostname asing dan di `*.workers.dev`
//     tanpa secret, jawabannya tetap 403 yang sama seperti sebelumnya;
//   · LAPIS 2 tetap default-deny: HANYA `GET /` (satu rute, satu metode) yang dialihkan. Semua
//     rute JSON, semua metode lain, dan semua rute yang belum ada tetap 403 — pembaca mesin
//     tidak pernah dijawab dengan HTML/pengalihan;
//   · NOL kebocoran keadaan konfigurasi: respons ini dibentuk SEBELUM apa pun tentang Secret
//     diperiksa, jadi ia BYTE-IDENTIK baik `OWNER_TOKEN_HASH`/`OWNER_SESSION_KEY` sudah
//     terpasang maupun belum. Tidak ada badan, tidak ada `Set-Cookie` (cookie basi tidak
//     dihapus di sini: menghapusnya membuat respons berbeda antara "punya cookie" dan "tidak",
//     dan itu oracle gratis), tidak ada satu pun nama Secret/metrik.
function loginRedirect() {
  return new Response(null, {
    status: 303,
    headers: {
      location: '/login',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
    },
  });
}

/* ============================ Handler ===================================================== */

async function handle(request, env, ctx, nowMs) {
  const now = Number.isFinite(nowMs) ? Number(nowMs) : Date.now();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = (request.method || 'GET').toUpperCase();

  // --- [LAPIS 1] Penjaga jembatan edge. PALING LUAR: sebelum rute publik, sebelum sesi, sebelum
  //     satu byte pun dibentuk. Lapis ini menjawab "siapa yang boleh memanggil Worker ini sama
  //     sekali"; lapis 2 di bawah menjawab "siapa yang boleh melihat angkanya". Dua lapis, bukan
  //     satu: header jembatan yang benar TIDAK PERNAH menggantikan sesi owner.
  const edgeDenial = edgeGuard(request, env, path);
  if (edgeDenial) return edgeDenial;

  // --- Halaman masuk: satu-satunya rute publik. Tetap fail-closed bila Secret belum dipasang.
  if (PUBLIC_ROUTES.includes(path)) {
    if (!configured(env)) return deny();
    if (method === 'GET') return html(renderLogin(url.searchParams.has('gagal') ? 'Token tidak cocok.' : ''));
    if (method === 'POST') {
      // Rem penebakan LINTAS ISOLATE dan PER-SUMBER. Jalur tepi dibaca dari penjaga yang sama
      // yang sudah meloloskan permintaan ini (nol I/O) — bukan dari header klien.
      const brake = await loginBrakeCheck(env, request, edgeGuardPath(request, env, path), now);
      if (brake.throttled) return loginThrottleResponse();
      let presented = '';
      try {
        const ctype = request.headers.get('content-type') || '';
        if (ctype.includes('application/json')) presented = String(((await request.json()) || {}).t || '');
        else presented = String((await request.formData()).get('t') || '');
      } catch { presented = ''; }
      // Yang dibandingkan adalah DIGEST, bukan token; dan dibandingkan waktu-konstan.
      const presentedDigest = await sha256Hex(presented);
      const accepted = ctEq(presentedDigest, String(env.OWNER_TOKEN_HASH || '').trim().toLowerCase());
      if (!accepted) {
        // HANYA kegagalan yang dihitung: login berhasil = nol tulis penyimpanan.
        await loginBrakeRecordFailure(env, brake, now);
        return html(renderLogin('Token tidak cocok.'), 403, {
          // Cookie apa pun yang tersisa dimatikan pada percobaan gagal.
          'set-cookie': sessionCookieHeader('', 0),
        });
      }
      const value = await issueSession(env, now);
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'cache-control': 'no-store',
          'set-cookie': sessionCookieHeader(value, Math.floor(SESSION_TTL_MS / 1000)),
        },
      });
    }
    return deny();
  }

  // --- [LAPIS 2] Default deny untuk SEMUA sisa rute, termasuk rute yang belum ada.
  //     Tidak satu byte data pun dibentuk sebelum baris ini lulus (bab 20, bab 32 #20).
  const session = await ownerSession(request, env, now);
  if (!session) {
    // Penanda buku / sesi kedaluwarsa: satu rute, satu metode, dialihkan ke halaman masuk.
    // Bentuknya tidak bergantung pada keadaan Secret (lihat bab PENANDA BUKU di atas).
    if (path === '/' && method === 'GET') return loginRedirect();
    return deny();
  }

  // Jejak audit akses owner: tanpa IP, tanpa identitas, hanya rute.
  try {
    if (env.AE && typeof env.AE.writeDataPoint === 'function') {
      env.AE.writeDataPoint({ blobs: ['owner_access', path], doubles: [1], indexes: ['owner'] });
    }
  } catch { /* audit tidak boleh pernah menjatuhkan dashboard */ }

  if (path === '/logout') {
    return new Response(null, {
      status: 303,
      headers: { location: '/login', 'cache-control': 'no-store', 'set-cookie': sessionCookieHeader('', 0) },
    });
  }

  const period = PERIODS[url.searchParams.get('period')] ? url.searchParams.get('period') : '7d';
  // Sesi diperbarui tiap akses supaya umurnya tetap pendek tanpa memaksa owner masuk ulang
  // di tengah pekerjaan.
  const refreshed = sessionCookieHeader(await issueSession(env, now), Math.floor(SESSION_TTL_MS / 1000));

  if (path === '/') {
    const model = await readModel(env, period, now);
    return html(renderDashboard(model), 200, { 'set-cookie': refreshed });
  }
  if (path === '/api/summary') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-summary-v1', period: model.period, from: model.from, to: model.to,
      measurementBasis: 'perangkat-estimasi',
      // Keadaan pengukuran ikut di JSON, bukan hanya di HTML: pembaca mesin juga tidak boleh
      // menyimpulkan "nol" dari ketiadaan baris.
      measurement: model.measurement,
      latest: model.latest, totals: model.totals, totalDays: model.totalDays,
      usage: model.usage,
      peak: model.peak, broken: model.broken, collection: model.collection,
      // Batas pengukuran ikut di JSON juga: pembaca mesin tidak boleh menyimpulkan "nol" dari
      // panel yang memang tidak pernah bisa diisi.
      unmeasurable: model.unmeasurable,
      // Bukti belajar Braincore ikut di JSON juga, dengan KEADAAN-nya, supaya pembaca mesin
      // tidak menyimpulkan "nol murid" dari panel yang belum dikonfigurasi.
      evidence: model.evidence,
      honesty: DEVICE_TRUTH,
      dataHonesty: model.measurement.state === STATE_MEASURED
        ? 'Angka di bawah TERUKUR; nol berarti nol yang terukur.'
        : model.measurement.notice,
    });
  }
  if (path === '/api/series') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-series-v1', period: model.period,
      measurement: model.measurement, series: model.series,
      dataHonesty: model.measurement.notice || 'Seri di bawah TERUKUR.',
    });
  }
  if (path === '/api/retention') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-retention-v1', period: model.period,
      measurement: model.measurement,
      dataHonesty: model.measurement.notice || 'Cohort di bawah TERUKUR.',
      cohorts: model.retention, rollup: model.retentionRollup,
      minCohortForPercent: RETENTION_MIN_COHORT, honesty: DEVICE_TRUTH,
      cohortSizeNote: 'Ukuran kohor (n=) diturunkan dari baris offset 0 kohor yang sama; skema '
        + 'retensi tidak menyimpannya sebagai kolom sendiri. Penyebut per offset hanya '
        + 'menjumlahkan kohor yang punya pengamatan di offset itu.',
    });
  }

  // --- EKSPOR CSV. Rute terpisah per berkas, bukan satu rute ber-parameter `?jenis=`:
  //     nama berkas unduhan lahir dari jalurnya, dan jalur tertutup lebih mudah dijaga
  //     gerbang default-deny daripada parameter yang harus divalidasi.
  if (path === '/api/export/summary.csv') {
    const model = await readModel(env, period, now);
    const rows = csvKepala(model, 'Ringkasan metrik periode');
    rows.push(['bagian', 'metrik', 'nilai', 'hari_terukur']);
    for (const [metric, agg] of Object.entries(model.totals || {})) {
      rows.push(['totals', metric, agg, (model.totalDays || {})[metric]]);
    }
    for (const [metric, value] of Object.entries(model.latest || {})) {
      rows.push(['latest_rollup_day', metric, value, '']);
    }
    for (const [bucket, value] of Object.entries(model.usage || {})) {
      rows.push(['usage_bucket', bucket, value, '']);
    }
    // Batas pengukuran ikut sebagai BARIS, bukan catatan kaki yang hilang saat berkas beredar.
    for (const u of model.unmeasurable || []) {
      rows.push(['tidak_bisa_diukur', `${u.panel}: ${u.hal}`, '', u.sebab]);
    }
    return csv(rows, 'ringkasan', model);
  }

  if (path === '/api/export/series.csv') {
    const model = await readModel(env, period, now);
    const rows = csvKepala(model, 'Deret harian (tren)');
    // `collection_ok` sengaja ikut sebagai kolom: pembaca CSV harus bisa melihat hari mana
    // yang rollup-nya gagal, persis seperti grafik HTML menggambarnya PUTUS di hari itu.
    const metrics = SERIES_METRICS.slice();
    rows.push(['day'].concat(metrics));
    for (const titik of model.series || []) {
      rows.push([titik.day].concat(metrics.map((m) => titik[m])));
    }
    return csv(rows, 'deret-harian', model);
  }

  if (path === '/api/export/retention.csv') {
    const model = await readModel(env, period, now);
    const rows = csvKepala(model, 'Retensi per kohor');
    rows.push(['min_cohort_untuk_persen', RETENTION_MIN_COHORT]);
    rows.push([]);
    // Baris MENTAH per kohor, apa adanya dari tabel — pembaca yang mau menghitung ulang
    // persentasenya sendiri bisa melakukannya tanpa mempercayai aritmetika kami.
    rows.push(['bagian', 'cohort_day', 'day_index', 'count']);
    for (const r of model.retention || []) {
      rows.push(['kohor_mentah', r.cohort_day, r.day_index, r.count]);
    }
    rows.push([]);
    // Rekap per offset, dengan PENYEBUT dan JUMLAH KOHOR ikut dicetak: tanpa keduanya
    // persentase tidak bisa diaudit, dan persentase yang tidak bisa diaudit tidak berguna
    // untuk due diligence.
    rows.push(['bagian', 'day_index', 'retained', 'base_penyebut', 'kohor_menyumbang', 'rate']);
    for (const o of model.retentionRollup || []) {
      const rate = o.base > 0 ? (o.retained / o.base) : '';
      rows.push(['rekap_offset', o.day_index, o.retained, o.base, o.cohorts, rate]);
    }
    return csv(rows, 'retensi', model);
  }

  if (path === '/api/export/evidence.csv') {
    const model = await readModel(env, period, now);
    const e = model.evidence || { state: 'unconfigured', summary: null };
    const rows = csvKepala(model, 'Bukti belajar Braincore (agregat)');
    rows.push(['evidence_state', e.state]);
    rows.push([]);
    if (!e.summary) {
      // Keadaan BUKAN nol. Berkas tetap diterbitkan supaya pembaca tahu panel ini ada dan
      // kenapa ia kosong — CSV kosong tanpa penjelasan akan dibaca sebagai "nol murid".
      rows.push(['catatan', 'Tidak ada ringkasan: lihat evidence_state di atas. '
        + 'Ini BUKAN nol murid.']);
      return csv(rows, 'bukti-belajar', model);
    }
    const s = e.summary;
    rows.push(['ringkasan', 'nilai']);
    rows.push(['measured', s.measured]);
    rows.push(['learner_count', s.learnerCount]);
    rows.push(['evidence_count', s.evidenceCount]);
    rows.push(['decision_count', s.decisionCount]);
    rows.push([]);
    rows.push(['dimensi', 'nilai', 'n']);
    for (const [dimensi, peta] of Object.entries({
      masteryTrend: s.masteryTrend, mastery: s.mastery, misconception: s.misconception,
      misconceptionSkill: s.misconceptionSkill, difficultyCalibration: s.difficultyCalibration,
      calibrationError: s.calibrationError, improvement: s.improvement,
      decision: s.decision, decisionOutcome: s.decisionOutcome,
    })) {
      for (const [nilai, n] of Object.entries(peta || {})) rows.push([dimensi, nilai, n]);
    }
    rows.push([]);
    rows.push(['day', 'learners', 'evidence', 'decisions']);
    for (const d of s.daily || []) rows.push([d.day, d.learners, d.evidence, d.decisions]);
    return csv(rows, 'bukti-belajar', model);
  }
  if (path === '/api/cost') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-cost-v1', period: model.period, from: model.from, to: model.to,
      measurement: model.measurement,
      dataHonesty: model.measurement.notice
        || 'Biaya di bawah dihitung dari hari yang TERUKUR.',
      computed: model.cost, assumptions: model.cost.assumptions,
      unmeasurable: (model.unmeasurable || []).filter((x) => x.panel === 'Cost estimation'),
      honesty: 'Penyebut perangkat aktif adalah under-count; biaya per perangkat aktif adalah '
        + 'batas atas. Tarif TIDAK tersimpan per hari (tidak ada tabel biaya di database ini), '
        + 'jadi angka historis ikut berubah bila tarif diubah: ini estimasi, bukan tagihan.',
    });
  }

  return deny();
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx, Date.now());
    } catch (err) {
      // Galat tidak boleh membocorkan apa pun, bahkan ke owner: pesan vendor bisa memuat SQL.
      return json({ error: 'internal' }, 500);
    }
  },
};

export {
  handle, ctEq, edgeGuard, edgeGuardStatus, edgeSecret, resetEdgeWarningForTests,
  // Jalur tepi: diekspor supaya gerbang bisa mengassert JALUR yang dipakai (bukan hanya status
  // HTTP), sehingga "lolos karena hostname" tidak bisa tertukar dengan "lolos karena header".
  edgeGuardDecision, edgeGuardPath, EDGE_PATHS,
  TRUSTED_EDGE_HOSTS, WORKERS_DEV_SUFFIX, isTrustedEdgeHost, isWorkersDevHost, requestHostname,
  allowNoSecretOverride,
  EDGE_HEADER, EDGE_FREE_PATHS, sha256Hex, hmacHex, issueSession, verifySession, estimateCost,
  renderDashboard, renderLogin, readModel, periodRange, wibDay, dayShift,
  // Panel bukti Braincore: diekspor supaya gerbang bisa mengadu render + sanitasi TANPA
  // menjalankan Worker (dan tanpa jaringan — `readEvidence` menerima fetch yang di-inject).
  readEvidence, sanitizeEvidenceSummary, renderEvidenceSection, EVIDENCE_PERIOD_DAYS,
  // Rem penebakan halaman masuk: diekspor supaya gerbang bisa memodelkan ISOLATE BARU per
  // permintaan (cacat yang tidak pernah diuji) dan mengassert angka jendelanya sebagai kontrak.
  LOGIN_MAX, LOGIN_MAX_SHARED, LOGIN_BUCKET_MS, LOGIN_WINDOW_BUCKETS, LOGIN_WINDOW_MS,
  LOGIN_RETRY_AFTER_S, LOGIN_KV_PREFIX, LOGIN_KV_CACHE_TTL_S, LOGIN_KV_TTL_S,
  loginBucketKey, loginWindowKeys, loginSourceKey, loginBrakeCheck, loginBrakeScope,
  loginBrakeLimit, resetLoginBrakeForTests, loginRedirect,
  RATE_CARD, PERIODS, OWNER_ROUTES, PUBLIC_ROUTES, SESSION_COOKIE, SESSION_TTL_MS,
  RETENTION_MIN_COHORT, DEVICE_TRUTH,
  // Keadaan pengukuran + penyaring field: diekspor supaya gerbang bisa mengassert perbedaan
  // "belum ada pengukuran" vs "nol terukur" sebagai kontrak, bukan sebagai kebetulan teks.
  STATE_MEASURED, STATE_NO_DATA, STATE_NO_DATA_IN_PERIOD, STATE_UNAVAILABLE,
  NO_DATA_TEXT, MEASURED_ZERO_TEXT, UNAVAILABLE_TEXT,
  NO_DATA_BANNER, NO_DATA_PERIOD_BANNER, UNAVAILABLE_BANNER,
  ALLOWED_ROW_FIELDS, sanitizeRow, fmtCount, isMeasured,
  // Batas pengukuran: diekspor supaya gerbang bisa mengassert bahwa panel yang mustahil
  // benar-benar DITANDAI, bukan dibiarkan kosong dan bukan diisi kueri karangan.
  UNMEASURABLE_TEXT, limitRows, fmtRange,
};
