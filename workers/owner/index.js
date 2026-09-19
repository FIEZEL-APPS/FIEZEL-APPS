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
// Tabel `cost_daily` yang menyimpannya TIDAK ADA dan TIDAK BOLEH ada (tests/analytics-privacy-test.js
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
// `tests/edge-guard-test.js` (sisi api) dan `tests/owner-edge-guard-test.js` (sisi owner).

const EDGE_HEADER = 'x-fiezel-edge';

// SATU SUMBER KEBENARAN hostname yang boleh lolos TANPA header jembatan: hostname yang benar-benar
// terikat ke Worker ini sebagai CUSTOM DOMAIN. Harus identik dengan
// `routes = [{ pattern = ..., custom_domain = true }]` di `workers/owner/wrangler.toml` —
// `tests/owner-edge-guard-test.js` butir (g-a) memaksa keduanya sama, supaya daftar ini tidak bisa
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
 * dan SELECT langsung. Itu ditolak, dan bukan karena gerbang `tests/owner-edge-guard-test.js` butir
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

/* ==========================================================================================
 * MURID PER ORANG — subrequest ke Worker api, POLA YANG SAMA dengan readEvidence di atas
 * ==========================================================================================
 * Yang berubah dibanding panel agregat: data yang dibaca di sini BERIDENTITAS. Justru karena
 * itu jalannya TIDAK boleh berubah menjadi "tambahkan binding CORE_DB di sini". Binding itu
 * dilarang butir (g-g) `tests/owner-edge-guard-test.js`, dan larangan itu BENAR: `fiezel-core`
 * memegang `identity`, `session`, dan `quota_daily`. Menariknya ke isolate dashboard akan
 * menaruh seluruh tabel identitas di Worker yang merender HTML, demi dua daftar.
 *
 * Maka jalurnya sama seperti bukti agregat: `GET /api/owner/learners` dan
 * `GET /api/owner/learner-evidence?sub=…` di Worker `fiezel-api`, keduanya owner-gated di
 * SANA dengan token yang sama (`EVIDENCE_API_TOKEN` = token yang di-hash di
 * `OWNER_TOKEN_HASH`). Nol Secret baru, nol binding baru, nol dashboard kedua — hanya dua
 * bacaan tambahan pada dashboard yang sudah ada.
 */
async function ownerApiFetch(env, pathAndQuery, fetchImpl, options = {}) {
  const base = (env && typeof env.EVIDENCE_API_BASE === 'string' && env.EVIDENCE_API_BASE.trim().replace(/\/+$/, '')) || 'https://api.fiezel.my.id';
  const rawKey = env ? (env.EVIDENCE_API_TOKEN || env.OWNER_TOKEN || env.OWNER_TOKEN_HASH) : null;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!base || !apiKey) return { state: 'unconfigured', body: null };
  if (!/^https:\/\//.test(base)) return { state: 'unconfigured', body: null };
  const doFetch = typeof fetchImpl === 'function' ? fetchImpl : (typeof fetch === 'function' ? fetch : (typeof globalThis !== 'undefined' && globalThis.fetch ? globalThis.fetch : null));
  if (!doFetch) return { state: 'unavailable', body: null };
  try {
    const fetchOpt = {
      method: options.method || 'GET',
      headers: Object.assign({
        'x-fiezel-owner-token': apiKey,
        'cache-control': 'no-store'
      }, options.headers || {})
    };
    if (options.body) {
      fetchOpt.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      fetchOpt.headers['content-type'] = 'application/json';
    }
    const res = await doFetch(base + pathAndQuery, fetchOpt);
    if (!res || !res.ok) {
      let errBody = null;
      try { errBody = await res.json(); } catch (_) {}
      return { state: 'unavailable', body: errBody, status: (res && res.status) || 0 };
    }
    return { state: 'ok', body: await res.json() };
  } catch {
    return { state: 'unavailable', body: null };
  }
}

async function readTeachers(env, fetchImpl) {
  const res = await ownerApiFetch(env, '/api/owner/teachers', fetchImpl);
  if (res.state !== 'ok') return { state: res.state, status: res.status, invites: [], teachers: [] };
  const body = res.body || {};
  return {
    state: 'ok',
    invites: Array.isArray(body.invites) ? body.invites : [],
    teachers: Array.isArray(body.teachers) ? body.teachers : [],
  };
}

async function mintTeacherInvite(env, input, fetchImpl) {
  const body = {
    teacherName: input.teacherName,
    institution: input.institution,
    institutionType: input.institutionType,
    days: input.days,
  };
  if (input.subject_id || input.subjectId) body.subject_id = input.subject_id || input.subjectId;
  if (input.grade_id || input.gradeId) body.grade_id = input.grade_id || input.gradeId;
  return await ownerApiFetch(env, '/api/owner/teacher-invite', fetchImpl, {
    method: 'POST',
    body
  });
}

async function revokeTeacherInvite(env, input, fetchImpl) {
  return await ownerApiFetch(env, '/api/owner/teacher-invite/revoke', fetchImpl, {
    method: 'POST',
    body: {
      code: input.code || undefined,
      codeHash: input.codeHash || undefined,
    }
  });
}

/** `sub` yang sah = UUID. Dipakai DUA arah: sebelum dikirim ke API, dan sebelum dirender. */
const SUB_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Nama tampilan: karakter kendali dibuang, spasi dirapikan, panjang dipotong. `esc()` tetap
 *  yang menangani HTML — ini lapis kedua supaya satu baris tabel tidak bisa dirusak. */
function safeName(value, max) {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, max || 64) : null;
}

const ENUM_RE = /^[A-Za-z0-9_-]{1,40}$/;
function safeEnum(value) {
  return typeof value === 'string' && ENUM_RE.test(value) ? value : null;
}
function safeDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
function safeInt(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

/**
 * Daftar putih baris direktori. Sabuk pengaman yang sama dengan `sanitizeEvidenceSummary`:
 * rute sumber memang tidak mengembalikan apa pun di luar ini, tetapi dashboard tidak boleh
 * bergantung pada janji Worker lain.
 */
function sanitizeLearnerRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const sub = typeof raw.sub === 'string' && SUB_RE.test(raw.sub) ? raw.sub : null;
  if (!sub) return null;
  return {
    sub,
    // `name` = nama yang sudah DIPILIH server (perkenalan > profil sosial).
    // `nameSource` ikut supaya panel bisa membedakan "belum punya nama di
    // server" dari "namanya kebetulan sama dengan handle" — dua keadaan yang
    // terlihat identik kalau yang datang hanya string.
    name: safeName(raw.name, 64),
    nameSource: /^(onboarding|social_display|social_handle|none)$/.test(String(raw.nameSource || ''))
      ? String(raw.nameSource) : 'none',
    displayName: safeName(raw.displayName, 64),
    handle: safeName(raw.handle, 64),
    firstDay: safeDay(raw.firstDay),
    lastDay: safeDay(raw.lastDay),
    evidenceCount: safeInt(raw.evidenceCount),
    decisionCount: safeInt(raw.decisionCount),
    lastLevel: safeEnum(raw.lastLevel),
    lastMastery: safeEnum(raw.lastMastery),
    lastTrend: safeEnum(raw.lastTrend),
    lastOutcome: safeEnum(raw.lastOutcome),
  };
}

async function readLearners(env, period, fetchImpl) {
  const days = EVIDENCE_PERIOD_DAYS[period] || 7;
  const res = await ownerApiFetch(env, '/api/owner/learners?days=' + days, fetchImpl);
  if (res.state !== 'ok') return { state: res.state, status: res.status, learners: null };
  const body = res.body;
  if (!body || body.migrated === false || !Array.isArray(body.learners)) {
    return { state: 'not-migrated', learners: null };
  }
  return {
    state: 'measured',
    range: body.range || null,
    learners: body.learners.map(sanitizeLearnerRow).filter(Boolean),
  };
}

/** Distribusi {nilai: n} -> hanya kunci berbentuk enum. Sama dengan `dist` panel agregat. */
function safeDist(v) {
  const out = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, n] of Object.entries(v)) if (safeEnum(k)) out[k] = safeInt(n);
  return out;
}

function sanitizeLearnerSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    measured: raw.measured === true,
    evidenceCount: safeInt(raw.evidenceCount),
    decisionCount: safeInt(raw.decisionCount),
    activeDays: safeInt(raw.activeDays),
    firstDay: safeDay(raw.firstDay),
    lastDay: safeDay(raw.lastDay),
    level: safeDist(raw.level),
    mastery: safeDist(raw.mastery),
    masteryTrend: safeDist(raw.masteryTrend),
    misconception: safeDist(raw.misconception),
    misconceptionSkill: safeDist(raw.misconceptionSkill),
    difficultyCalibration: safeDist(raw.difficultyCalibration),
    calibrationError: safeDist(raw.calibrationError),
    improvementTrend: safeDist(raw.improvementTrend),
    decision: safeDist(raw.decision),
    outcome: safeDist(raw.outcome),
    recommendation: safeDist(raw.recommendation),
    masteryDelta: safeDist(raw.masteryDelta),
    masteryFirst: safeEnum(raw.masteryFirst),
    masteryLast: safeEnum(raw.masteryLast),
    // null yang DIPERTAHANKAN: "belum ada pengukuran kalibrasi" tidak boleh menjadi 0%.
    calibratedShare: Number.isFinite(Number(raw.calibratedShare))
      ? Math.max(0, Math.min(100, Math.trunc(Number(raw.calibratedShare))))
      : null,
    recentDecisions: (Array.isArray(raw.recentDecisions) ? raw.recentDecisions : []).slice(0, 30).map((d) => ({
      day: safeDay(d && d.day),
      level: safeEnum(d && d.level),
      decision: safeEnum(d && d.decision),
      outcome: safeEnum(d && d.outcome),
      recommendation: safeEnum(d && d.recommendation),
      masteryDelta: safeEnum(d && d.masteryDelta),
      adherence: safeEnum(d && d.adherence),
    })).filter((d) => d.day),
    days: (Array.isArray(raw.days) ? raw.days : []).slice(0, 180).map((d) => ({
      day: safeDay(d && d.day), evidence: safeInt(d && d.evidence), decisions: safeInt(d && d.decisions),
    })).filter((d) => d.day),
  };
}

async function readLearnerDetail(env, period, sub, fetchImpl) {
  if (!SUB_RE.test(String(sub || ''))) return null;
  const days = EVIDENCE_PERIOD_DAYS[period] || 7;
  const res = await ownerApiFetch(env, '/api/owner/learner-evidence?sub=' + encodeURIComponent(sub) + '&days=' + days, fetchImpl);
  if (res.state !== 'ok') return { state: res.state, status: res.status, learner: null, summary: null };
  const body = res.body;
  if (!body || body.migrated === false) return { state: 'not-migrated', learner: null, summary: null };
  return {
    state: 'measured',
    range: body.range || null,
    learner: sanitizeLearnerRow(Object.assign({ sub }, body.learner || {})),
    summary: sanitizeLearnerSummary(body.summary),
  };
}

async function readModel(env, period, nowMs, learnerSub, fetchImpl) {
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
    evidence: await readEvidence(env, period, fetchImpl),
    // Murid per orang. Dua subrequest, keduanya fail-soft persis seperti `evidence`:
    // kegagalan baca dicetak sebagai "tidak tersedia", TIDAK PERNAH sebagai "nol murid".
    learners: await readLearners(env, period, fetchImpl),
    learnerSub: SUB_RE.test(String(learnerSub || '')) ? String(learnerSub) : null,
    learnerDetail: SUB_RE.test(String(learnerSub || '')) ? await readLearnerDetail(env, period, learnerSub, fetchImpl) : null,
    // Undangan & token guru. Satu subrequest owner-gated ke Worker api, fail-soft.
    teachers: await readTeachers(env, fetchImpl),
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
:root{
  --cream:#FFF8ED;
  --ink:#2B2118;
  --yellow:#FFD23F;
  --header-bg:#FFFFFF;
  --sidebar-bg:#2b3643;
  --sidebar-hover:#222b35;
  --sidebar-active:#1f2730;
  --sidebar-text:#b4bcc8;
  --sidebar-heading:#708096;
  --bg:#f3f4f7;
  --bg-subtle:#F8FAFC;
  --card-bg:#FFFFFF;
  --card-border:#E2E8F0;
  --card-border-hover:#CBD5E1;
  --text-main:#2c3e50;
  --text-muted:#64748B;
  --text-subtle:#94A3B8;
  --brand-gold:#D97706;
  --brand-accent:#F59E0B;
  --brand-surface:#FEF3C7;
  --brand-tint:#FFFBEB;
  --brand-dark:#78350F;
  --blue:#3F51B5;
  --blue-subtle:#EEF2FF;
  --blue-border:#C7D2FE;
  --emerald:#059669;
  --emerald-subtle:#ECFDF5;
  --emerald-border:#A7F3D0;
  --rose:#DC2626;
  --rose-subtle:#FEF2F2;
  --rose-border:#FECACA;
  --spark-line:#3F51B5;
  --spark-grid:#E2E8F0;
  --spark-bg:#F8FAFC;
  --shadow-xs:0 1px 2px 0 rgba(0,0,0,0.03);
  --shadow-sm:0 1px 3px 0 rgba(0,0,0,0.05),0 1px 2px -1px rgba(0,0,0,0.03);
  --shadow-md:0 4px 10px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.04);
  --shadow-lg:0 10px 20px -3px rgba(0,0,0,0.09),0 4px 6px -4px rgba(0,0,0,0.04);
  --radius-sm:6px;
  --radius-md:8px;
  --radius-lg:10px;
  --radius-xl:14px;
  --radius-full:9999px;
  --trans:all .15s cubic-bezier(.4,0,.2,1);
}
@media(prefers-color-scheme:dark){
  :root{
    --header-bg:#161D2A;
    --sidebar-bg:#111823;
    --sidebar-hover:#1A2332;
    --sidebar-active:#131B28;
    --sidebar-text:#94A3B8;
    --bg:#0B0F17;
    --bg-subtle:#111827;
    --card-bg:#131B2A;
    --card-border:#1E293B;
    --card-border-hover:#334155;
    --text-main:#F1F5F9;
    --text-muted:#94A3B8;
    --text-subtle:#64748B;
    --brand-surface:rgba(245,158,11,.15);
    --brand-tint:rgba(245,158,11,.08);
    --brand-dark:#FDE68A;
    --blue-subtle:rgba(63,81,181,.15);
    --blue-border:#3730A3;
    --emerald-subtle:rgba(5,150,105,.12);
    --emerald-border:#047857;
    --rose-subtle:rgba(220,38,38,.12);
    --rose-border:#B91C1C;
    --spark-line:#818CF8;
    --spark-grid:#1E293B;
    --spark-bg:#0E1522;
  }
}
*{box-sizing:border-box}
body{
  margin:0;
  background:var(--bg);
  color:var(--text-main);
  font:13.5px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
  letter-spacing:-.01em;
}

/* --- Top Header Navigation Bar --- */
.page-header{
  position:sticky;
  top:0;
  z-index:100;
  height:60px;
  background:var(--header-bg);
  border-bottom:1px solid var(--card-border);
  box-shadow:0 1px 4px rgba(0,0,0,0.05);
}
.page-header-inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  height:100%;
  padding:0 20px;
  gap:16px;
}
.page-logo{
  display:flex;
  align-items:center;
  gap:10px;
  width:240px;
  flex-shrink:0;
}
.logo-link{
  display:inline-flex;
  align-items:center;
  gap:8px;
  text-decoration:none;
}
.logo-icon{
  width:32px;
  height:32px;
  background:linear-gradient(135deg,#3F51B5 0%,#2196F3 100%);
  color:#fff;
  border-radius:var(--radius-sm);
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 2px 6px rgba(63,81,181,0.25);
}
.logo-icon .ico{
  width:18px;
  height:18px;
  stroke:#ffffff;
}
.logo-text{
  font-size:17px;
  letter-spacing:-.02em;
}
.logo-bold{
  font-weight:800;
  color:#3F51B5;
}
.logo-gold{
  font-weight:700;
  color:var(--brand-gold);
}
.logo-badge{
  font-size:10px;
  font-weight:700;
  letter-spacing:.06em;
  text-transform:uppercase;
  background:var(--brand-surface);
  color:var(--brand-dark);
  padding:2px 6px;
  border-radius:4px;
}
.header-tools{
  display:flex;
  align-items:center;
  gap:14px;
  flex-wrap:wrap;
}
.nav-periods{
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.nav-group{
  display:inline-flex;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:3px;
  border-radius:var(--radius-full);
  gap:2px;
}
.period-pill{
  padding:5px 12px;
  border-radius:var(--radius-full);
  text-decoration:none;
  color:var(--text-muted);
  font-size:12px;
  font-weight:600;
  background:transparent;
  transition:var(--trans);
}
.period-pill:hover{
  color:var(--text-main);
}
.period-pill[aria-current="page"]{
  background:var(--blue);
  color:#ffffff;
  box-shadow:0 2px 6px rgba(63,81,181,0.3);
}
.header-status-group{
  display:none;
  align-items:center;
  gap:6px;
}
@media(min-width:1100px){
  .header-status-group{display:inline-flex;}
}
.status-chip{
  display:inline-flex;
  align-items:center;
  gap:5px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:4px 10px;
  border-radius:var(--radius-full);
  font-size:11.5px;
  color:var(--text-muted);
}
.user-badge{
  display:none;
  align-items:center;
  gap:8px;
  padding:3px 8px;
  border-radius:var(--radius-full);
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
}
@media(min-width:768px){
  .user-badge{display:inline-flex;}
}
.user-avatar{
  width:28px;
  height:28px;
  border-radius:50%;
  background:linear-gradient(135deg,#D97706 0%,#F59E0B 100%);
  color:#ffffff;
  font-weight:700;
  font-size:11px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.user-details{
  display:flex;
  flex-direction:column;
  line-height:1.2;
}
.user-name{
  font-size:11.5px;
  font-weight:700;
  color:var(--text-main);
}
.user-role{
  font-size:9.5px;
  color:var(--text-muted);
  text-transform:uppercase;
}
.nav-exit{
  display:inline-flex;
  align-items:center;
  gap:5px;
  background:transparent;
  border:1px solid var(--rose-border);
  color:var(--rose);
  font-size:12px;
  font-weight:600;
  padding:5px 12px;
  border-radius:var(--radius-full);
  text-decoration:none;
  transition:var(--trans);
}
.nav-exit:hover{
  background:var(--rose-subtle);
}

/* --- Layout Container: Sidebar & Content --- */
.page-wrapper{
  display:flex;
  flex-direction:column;
  min-height:calc(100vh - 60px);
}
.page-container{
  display:flex;
  flex:1;
  width:100%;
}

/* --- Left Sidebar --- */
.sidebar-wrapper{
  width:240px;
  background:var(--sidebar-bg);
  color:var(--sidebar-text);
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  border-right:1px solid rgba(0,0,0,0.1);
  position:sticky;
  top:60px;
  height:calc(100vh - 60px);
  overflow-y:auto;
  scrollbar-width:thin;
}
.sidebar-user{
  padding:18px 16px;
  border-bottom:1px solid rgba(255,255,255,0.07);
}
.user-panel{
  display:flex;
  align-items:center;
  gap:12px;
}
.user-avatar-circle{
  width:40px;
  height:40px;
  border-radius:50%;
  background:linear-gradient(135deg,#D97706 0%,#F59E0B 100%);
  color:#fff;
  font-weight:700;
  font-size:13px;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  box-shadow:0 2px 6px rgba(0,0,0,0.25);
  flex-shrink:0;
}
.status-dot{
  width:9px;
  height:9px;
  background:#10B981;
  border:2px solid var(--sidebar-bg);
  border-radius:50%;
  position:absolute;
  bottom:0;
  right:0;
}
.user-info{
  display:flex;
  flex-direction:column;
  overflow:hidden;
}
.user-title{
  font-size:13px;
  font-weight:700;
  color:#ffffff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.user-subtitle{
  font-size:10.5px;
  color:#869AB8;
}
.sidebar-menu{
  padding:10px 0 24px;
  display:flex;
  flex-direction:column;
}
.sidebar-heading{
  padding:14px 18px 6px;
  font-size:10.5px;
  font-weight:700;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:var(--sidebar-heading);
}
.sidebar-link{
  display:flex;
  align-items:center;
  gap:10px;
  padding:9px 18px;
  color:var(--sidebar-text);
  text-decoration:none;
  font-size:12.5px;
  font-weight:500;
  border-left:3px solid transparent;
  transition:var(--trans);
}
.sidebar-link:hover{
  background:var(--sidebar-hover);
  color:#ffffff;
  border-left-color:var(--blue);
}
.sidebar-link.active{
  background:var(--sidebar-active);
  color:#ffffff;
  border-left-color:var(--brand-gold);
  font-weight:600;
}
.sidebar-icon{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.sidebar-icon .ico{
  width:16px;
  height:16px;
}
.sidebar-text{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* --- Content Wrapper --- */
.content-wrapper{
  flex:1;
  min-width:0;
  padding:20px 24px 60px;
  background:var(--bg);
}
.page-bar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:12px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  padding:12px 18px;
  margin-bottom:20px;
  box-shadow:var(--shadow-xs);
}
.page-title-breadcrumb{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.page-title{
  font-size:18px;
  font-weight:800;
  color:var(--text-main);
  letter-spacing:-.02em;
  margin:0;
}
.page-breadcrumb{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:11.5px;
  color:var(--text-muted);
  list-style:none;
  margin:0;
  padding:0;
}
.page-breadcrumb a{
  color:var(--text-muted);
  text-decoration:none;
}
.page-breadcrumb a:hover{
  color:var(--blue);
}
.breadcrumb-sep{
  color:var(--text-subtle);
  font-size:10px;
}
.page-bar-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:5px 12px;
  border-radius:var(--radius-full);
  font-size:11.5px;
  color:var(--text-muted);
  font-weight:500;
}

/* --- 4 Smart University Quick Stat Cards --- */
.stat-cards-grid{
  display:grid;
  grid-template-columns:1fr;
  gap:16px;
  margin-bottom:24px;
}
@media(min-width:640px){
  .stat-cards-grid{grid-template-columns:repeat(2,1fr);}
}
@media(min-width:1200px){
  .stat-cards-grid{grid-template-columns:repeat(4,1fr);}
}
.stat-card{
  border-radius:var(--radius-lg);
  padding:18px 20px;
  color:#ffffff;
  box-shadow:0 3px 10px rgba(0,0,0,0.08);
  position:relative;
  overflow:hidden;
  transition:var(--trans);
}
.stat-card:hover{
  transform:translateY(-2px);
  box-shadow:0 6px 16px rgba(0,0,0,0.12);
}
.stat-card.bg-primary{
  background:linear-gradient(135deg,#4F46E5 0%,#3B82F6 100%);
}
.stat-card.bg-success{
  background:linear-gradient(135deg,#059669 0%,#10B981 100%);
}
.stat-card.bg-warning{
  background:linear-gradient(135deg,#D97706 0%,#F59E0B 100%);
}
.stat-card.bg-danger{
  background:linear-gradient(135deg,#DC2626 0%,#EF4444 100%);
}
.stat-card-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:8px;
}
.stat-label{
  font-size:11px;
  font-weight:700;
  letter-spacing:.05em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.85);
}
.stat-icon-wrap{
  width:34px;
  height:34px;
  border-radius:var(--radius-sm);
  background:rgba(255,255,255,0.2);
  display:flex;
  align-items:center;
  justify-content:center;
}
.stat-icon-wrap .ico{
  width:18px;
  height:18px;
  stroke:#ffffff;
}
.stat-value{
  font-size:24px;
  font-weight:800;
  line-height:1.2;
  color:#ffffff;
  font-variant-numeric:tabular-nums;
  letter-spacing:-.02em;
}
.stat-footer-text{
  margin-top:8px;
  font-size:11px;
  color:rgba(255,255,255,0.9);
  border-top:1px solid rgba(255,255,255,0.18);
  padding-top:6px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* --- Mobile Responsiveness for Sidebar --- */
@media(max-width:991px){
  .page-container{flex-direction:column;}
  .sidebar-wrapper{
    width:100%;
    height:auto;
    position:static;
    border-right:none;
    border-bottom:1px solid var(--card-border);
    padding:6px 12px;
  }
  .sidebar-user{display:none;}
  .sidebar-menu{
    flex-direction:row;
    flex-wrap:wrap;
    gap:4px;
    padding:4px 0;
  }
  .sidebar-heading{
    width:100%;
    padding:6px 6px 2px;
    font-size:9.5px;
  }
  .sidebar-link{
    padding:4px 8px;
    border-radius:var(--radius-sm);
    border-left:none;
    font-size:11.5px;
  }
  .content-wrapper{
    padding:14px 14px 48px;
  }
}

/* --- Main Grid & Sections --- */
main{
  display:grid;
  gap:18px;
  grid-template-columns:1fr;
}
@media(min-width:768px){
  main{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media(min-width:1200px){
  main{grid-template-columns:repeat(3,minmax(0,1fr));}
}
section{
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-lg);
  padding:20px 22px;
  box-shadow:var(--shadow-xs);
  display:flex;
  flex-direction:column;
  transition:var(--trans);
  position:relative;
}
section:hover{
  box-shadow:var(--shadow-md);
  border-color:var(--card-border-hover);
}
section:has(.wide-panel),
section:has(.card-full-inner){
  grid-column:1 / -1;
}
@media(min-width:1200px){
  section:has(.col-2-panel){
    grid-column:span 2;
  }
}
section h2{
  margin:0 0 14px;
  font-size:14px;
  font-weight:700;
  letter-spacing:-.01em;
  color:var(--text-main);
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid var(--card-border);
  padding-bottom:10px;
  line-height:1.2;
}
section h2 > span:first-child{
  display:inline-flex;
  align-items:center;
  gap:8px;
}
.section-badge{
  font-size:10.5px;
  font-weight:600;
  text-transform:none;
  letter-spacing:normal;
  padding:2px 8px;
  border-radius:var(--radius-full);
  background:var(--bg-subtle);
  color:var(--text-muted);
  border:1px solid var(--card-border);
  flex-shrink:0;
}
.big{
  font-size:28px;
  font-weight:800;
  font-variant-numeric:tabular-nums;
  letter-spacing:-.03em;
  line-height:1.1;
  color:var(--text-main);
  margin:2px 0 10px;
}
.kpi-hero{
  margin:2px 0 12px;
  padding:12px 14px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  display:flex;
  flex-direction:column;
  gap:2px;
}
.kpi-hero-label{
  font-size:10.5px;
  font-weight:700;
  letter-spacing:.05em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.kpi-hero .big{
  margin:0;
  line-height:1.1;
}
.kv{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:6px 4px;
  border-bottom:1px solid var(--card-border);
  font-size:12.5px;
  transition:var(--trans);
}
.kv:hover{
  background:var(--bg-subtle);
  border-radius:var(--radius-sm);
  padding-left:8px;
  padding-right:8px;
}
.kv:last-of-type{
  border-bottom:0;
}
.kv span{
  color:var(--text-muted);
  display:inline-flex;
  align-items:baseline;
  gap:6px;
  font-size:12px;
}
.kv span small{
  color:var(--text-subtle);
  font-size:10.5px;
}
.kv b{
  font-variant-numeric:tabular-nums;
  font-weight:700;
  color:var(--text-main);
  text-align:right;
  white-space:nowrap;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:2px 7px;
  border-radius:var(--radius-sm);
  font-size:12px;
}
svg{
  display:block;
  width:100%;
  height:52px;
  margin:10px 0 6px;
  border-radius:var(--radius-md);
  background:var(--spark-bg);
  border:1px solid var(--card-border);
  padding:4px;
}
.card-footer{
  margin-top:auto;
  padding-top:12px;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.note{
  margin-top:0;
  font-size:11px;
  color:var(--text-muted);
  border-left:3px solid var(--blue);
  background:var(--bg-subtle);
  border-radius:0 var(--radius-sm) var(--radius-sm) 0;
  padding:8px 12px;
  line-height:1.5;
  border-top:1px solid var(--card-border);
  border-right:1px solid var(--card-border);
  border-bottom:1px solid var(--card-border);
}
.warn{
  margin-top:0;
  font-size:11px;
  color:#92400E;
  background:var(--brand-tint);
  border:1px solid var(--brand-surface);
  border-left:3px solid var(--brand-gold);
  border-radius:0 var(--radius-sm) var(--radius-sm) 0;
  padding:8px 12px;
  line-height:1.5;
}
@media(prefers-color-scheme:dark){
  .warn{color:#FDE68A;border-color:rgba(217,119,6,.3);}
}
.assume{
  margin-top:0;
  font-size:11px;
  color:var(--text-muted);
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-sm);
  padding:9px 12px;
  line-height:1.5;
}
.assume code{
  font-size:10.5px;
  background:var(--card-bg);
  color:var(--brand-gold);
  padding:1px 5px;
  border-radius:4px;
  border:1px solid var(--card-border);
  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
}
.nodata{
  margin-top:0;
  font-size:11px;
  color:var(--text-muted);
  background:var(--bg-subtle);
  border:1px dashed var(--card-border-hover);
  border-radius:var(--radius-sm);
  padding:8px 12px;
}
.empty{
  margin:0 0 20px;
  padding:16px 20px;
  border:1px solid var(--brand-accent);
  border-left:5px solid var(--brand-gold);
  border-radius:var(--radius-lg);
  background:var(--brand-tint);
  color:#92400E;
  font-size:13px;
  line-height:1.6;
  box-shadow:var(--shadow-sm);
}
@media(prefers-color-scheme:dark){
  .empty{color:#FDE68A;}
}
.empty b{
  display:block;
  font-size:14.5px;
  font-weight:700;
  color:var(--text-main);
  margin-bottom:6px;
}
.table-wrap{
  width:100%;
  overflow-x:auto;
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  margin:10px 0;
  background:var(--card-bg);
  box-shadow:var(--shadow-xs);
}
table{
  width:100%;
  border-collapse:separate;
  border-spacing:0;
  font-size:12.5px;
  line-height:1.45;
}
th{
  background:var(--bg-subtle);
  color:var(--text-muted);
  font-weight:600;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.05em;
  padding:8px 12px;
  border-bottom:1px solid var(--card-border);
  text-align:right;
  white-space:nowrap;
}
td{
  padding:8px 12px;
  border-bottom:1px solid var(--card-border);
  font-variant-numeric:tabular-nums;
  text-align:right;
  color:var(--text-main);
}
th:first-child,td:first-child{text-align:left;font-weight:600}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover td{background:var(--bg-subtle)}
tr.sel td{background:var(--brand-surface)!important;font-weight:600;color:var(--brand-dark)}
.muted-mark{color:var(--text-subtle);font-size:10.5px;font-weight:normal}
h3{
  margin:14px 0 8px;
  font-size:13.5px;
  font-weight:700;
  color:var(--text-main);
}
h4{
  margin:10px 0 6px;
  font-size:11.5px;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.subgrid{
  display:grid;
  gap:12px;
  grid-template-columns:1fr;
}
@media(min-width:640px){
  .subgrid-2{grid-template-columns:repeat(2,1fr)}
  .subgrid-3{grid-template-columns:repeat(3,1fr)}
}
.evidence-box{
  background:var(--bg-subtle);
  padding:14px 16px;
  border-radius:var(--radius-md);
  border:1px solid var(--card-border);
}
.evidence-box h3{
  margin:10px 0 6px;
  font-size:12px;
  font-weight:700;
  color:var(--text-main);
  text-transform:uppercase;
  letter-spacing:.04em;
}
.evidence-box h3:first-child{margin-top:0}
form{
  padding:0;
  max-width:100%;
}
input,select{
  width:100%;
  padding:9px 12px;
  font-size:13.5px;
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  background:var(--card-bg);
  color:var(--text-main);
  outline:none;
  box-sizing:border-box;
  transition:var(--trans);
}
input:focus,select:focus{
  border-color:var(--blue);
  box-shadow:0 0 0 3px rgba(63,81,181,.15);
}
button{
  padding:9px 16px;
  font-size:13px;
  font-weight:600;
  border:1px solid transparent;
  border-radius:var(--radius-md);
  background:var(--blue);
  color:#fff;
  cursor:pointer;
  box-shadow:var(--shadow-xs);
  transition:var(--trans);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
}
button:hover{
  opacity:.92;
  transform:translateY(-1px);
  box-shadow:var(--shadow-sm);
}
button:active{
  transform:translateY(0);
}
.export-deck{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:10px;
  margin:12px 0;
}
.export-chip{
  display:flex;
  align-items:center;
  gap:9px;
  padding:10px 14px;
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  background:var(--card-bg);
  color:var(--text-main);
  text-decoration:none;
  font-size:12.5px;
  font-weight:600;
  box-shadow:var(--shadow-xs);
  transition:var(--trans);
}
.export-chip:hover{
  background:var(--bg-subtle);
  border-color:var(--card-border-hover);
  transform:translateY(-1px);
  box-shadow:var(--shadow-sm);
}
footer{
  margin-top:40px;
  padding:24px 0 40px;
  border-top:1px solid var(--card-border);
  color:var(--text-muted);
  font-size:11.5px;
  line-height:1.65;
}
.login-shell{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  background:radial-gradient(circle at 50% 30%,rgba(63,81,181,.06),transparent 55%),var(--bg);
}
.login-card{
  width:100%;
  max-width:400px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-xl);
  padding:32px;
  box-shadow:var(--shadow-md);
}
.ico{
  width:15px;
  height:15px;
  stroke:currentColor;
  stroke-width:2;
  fill:none;
  stroke-linecap:round;
  stroke-linejoin:round;
  vertical-align:-3px;
  flex-shrink:0;
  display:inline-block;
}
.zone-divider{
  grid-column:1 / -1;
  display:flex;
  align-items:center;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:12px;
  margin:28px 0 6px;
  padding:12px 18px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  box-shadow:var(--shadow-xs);
}
.zone-divider:first-of-type{
  margin-top:6px;
}
.zone-title-group{
  display:flex;
  align-items:baseline;
  gap:10px;
  flex-wrap:wrap;
}
.zone-badge{
  font-size:10px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  color:var(--brand-gold);
  padding:2px 8px;
  border-radius:var(--radius-full);
}
.zone-title{
  margin:0;
  font-size:14.5px;
  font-weight:800;
  letter-spacing:-.02em;
  color:var(--text-main);
}
.zone-desc{
  font-size:12px;
  color:var(--text-muted);
}
.stat-highlight{
  margin:2px 0 12px;
  padding:12px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  display:flex;
  flex-direction:column;
  gap:10px;
}
.stat-highlight-label{
  font-size:10.5px;
  font-weight:700;
  letter-spacing:.05em;
  text-transform:uppercase;
  color:var(--text-muted);
  margin-bottom:2px;
}
.stat-highlight .big{
  margin:0;
  line-height:1;
}
.stat-mini-deck{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:6px;
}
.stat-mini{
  display:flex;
  flex-direction:column;
  gap:2px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-sm);
  padding:6px 8px;
}
.stat-mini span{
  font-size:9.5px;
  font-weight:600;
  letter-spacing:.03em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.stat-mini b{
  font-size:12.5px;
  font-weight:700;
  color:var(--text-main);
  font-variant-numeric:tabular-nums;
}
`;

const ICONS = {
  brand: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',

  users: '<svg class="ico" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  activity: '<svg class="ico" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3 6 12H2"/></svg>',
  retention: '<svg class="ico" viewBox="0 0 24 24"><path d="m9 14-5-5 5-5M20 20v-7a4 4 0 0 0-4-4H4"/></svg>',
  book: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  cpu: '<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  voice: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
  cost: '<svg class="ico" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  shield: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  server: '<svg class="ico" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  check: '<svg class="ico" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/></svg>',
  brain: '<svg class="ico" viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54z"/></svg>',
  teacher: '<svg class="ico" viewBox="0 0 24 24"><path d="m4 6 8-4 8 4-8 4-8-4Z"/><path d="m18 10 4 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l4-2"/><path d="M12 10v12"/></svg>',
  download: '<svg class="ico" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  calendar: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  refresh: '<svg class="ico" viewBox="0 0 24 24"><path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  logout: '<svg class="ico" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  file: '<svg class="ico" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"/></svg>',
  alert: '<svg class="ico" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

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
    current.push(`${(i * stepX).toFixed(2)},${(44 - (Number(r[key]) || 0) / max * 38).toFixed(2)}`);
  });
  if (current.length > 1) segments.push(current);
  const paths = segments.map((s) => `<polyline fill="none" stroke="var(--spark-line)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${s.join(' ')}"/>`).join('');
  return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="tren ${esc(key)}">
    <line x1="0" y1="46" x2="100" y2="46" stroke="var(--spark-grid)" stroke-width="1" stroke-dasharray="2,2"/>
    ${paths}</svg>`;
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
  const head = '<section><span class="card-full-inner" id="evidence"></span><h2><span>' + ICONS.brain + ' Braincore evidence</span><span class="section-badge">Pedagogi Agregat</span></h2>';
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
    <div class="subgrid subgrid-2" style="margin-top:14px;">
      <div class="evidence-box">
        <h3>Tren mastery</h3>${evidenceDist(s.masteryTrend, ['up', 'flat', 'down'])}
        <h3>Sebaran mastery</h3>${evidenceDist(s.mastery, ['m0-40', 'm40-60', 'm60-80', 'm80-100'])}
        <h3>Tren perbaikan belajar</h3>${evidenceDist(s.improvementTrend, ['improving', 'steady', 'declining'])}
      </div>
      <div class="evidence-box">
        <h3>Tren miskonsepsi</h3>${evidenceDist(s.misconception, ['none', 'mc1', 'mc2-3', 'mc4p'])}
        <h3>Famili skill miskonsepsi</h3>${evidenceDist(s.misconceptionSkill)}
      </div>
      <div class="evidence-box">
        <h3>Kalibrasi kesulitan</h3>${evidenceDist(s.difficultyCalibration, ['too_easy', 'calibrated', 'too_hard'])}
        <h3>Galat kalibrasi</h3>${evidenceDist(s.calibrationError, ['e0-10', 'e10-20', 'e20-40', 'e40p'])}
      </div>
      <div class="evidence-box">
        <h3>Alasan keputusan Braincore</h3>${evidenceDist(s.decision)}
        <h3>Hasil kebijakan</h3>${evidenceDist(s.outcome, ['positive', 'mixed', 'negative', 'insufficient'])}
        <h3>Rekomendasi kebijakan</h3>${evidenceDist(s.recommendation)}
      </div>
    </div>
    <h3>Per hari</h3>
    <div class="table-wrap"><table><tr><th>hari</th><th>murid baru</th><th>bukti</th><th>keputusan</th></tr>${dayRows}</table></div>
    <div class="note">"Murid terukur" dijumlahkan dari murid BARU per hari; satu murid yang aktif tiga hari
      terhitung tiga kali. Angka unik lintas-hari TIDAK dihitung, dan itu disengaja: menghitungnya menuntut
      menyimpan pengenal lebih lama daripada yang dibenarkan.</div>
    <div class="note">NOL identitas di panel ini. Yang tersimpan di server hanyalah bucket berenum tertutup;
      nama murid, jawaban, dan riwayat tidak pernah meninggalkan perangkat.</div>
  </section>`;
}

/**
 * Panel MURID PER ORANG, di dalam dashboard yang SUDAH ADA — bukan halaman kedua, bukan
 * Worker kedua, bukan rute baru. Pemilihan murid adalah TAUTAN biasa (`/?learner=<sub>`),
 * konsisten dengan pemilihan periode di halaman ini: nol JavaScript, nol kerangka kerja.
 *
 * KEJUJURAN YANG DIPERTAHANKAN DARI PANEL AGREGAT:
 *   - "belum dikonfigurasi" != "nol murid" != "gagal membaca". Tiga keadaan, tiga kalimat.
 *   - distribusi kosong dicetak "belum ada pengukuran", bukan "0".
 *
 * KEJUJURAN YANG BARU, DAN KHUSUS PANEL INI:
 *   - Murid TANPA profil sosial muncul TANPA nama, bukan disembunyikan. Nama tampilan
 *     satu-satunya yang otoritatif di server adalah `social_profile.display_name/handle`;
 *     nama yang diketik murid saat perkenalan hidup di localStorage perangkat dan TIDAK
 *     pernah sampai ke server. Menyembunyikan yang tak bernama akan membuat owner mengira
 *     murid itu tidak ada; menampilkan `sub`-nya jujur dan tetap bisa dibuka.
 */
function learnerLabel(row) {
  if (!row) return 'murid tanpa nama';
  // `name` sudah dipilih server dengan urutan perkenalan > display_name > handle.
  // Panel tidak mengulang logika itu: dua tempat yang memilih nama adalah dua
  // urutan yang pelan-pelan menyimpang.
  if (row.name) return row.nameSource === 'social_handle' ? '@' + row.name : row.name;
  if (row.displayName) return row.displayName;
  if (row.handle) return '@' + row.handle;
  // Delapan hex pertama `sub`. Sejak nama WAJIB diisi di perkenalan, baris seperti
  // ini adalah keadaan LEGACY/GALAT — murid yang mendaftar sebelum `learner_name`
  // ada, atau yang namanya gagal sampai ke server — bukan perilaku normal untuk
  // murid baru. Ia tetap dicetak apa adanya: menyembunyikannya akan membuat owner
  // mengira murid itu tidak ada.
  return 'murid ' + String(row.sub || '').slice(0, 8);
}

function renderLearnerDirectory(m) {
  const d = m.learners || { state: 'unconfigured', learners: null };
  if (d.state === 'unconfigured') {
    return `<div class="note">BELUM DIKONFIGURASI. Secret <code>EVIDENCE_API_BASE</code> dan
      <code>EVIDENCE_API_TOKEN</code> belum dipasang, jadi daftar murid tidak pernah dipanggil.
      Ini BUKAN "nol murid".</div>`;
  }
  if (d.state === 'unavailable') {
    return `<div class="warn">${esc(UNAVAILABLE_TEXT.toUpperCase())}. Subrequest ke
      <code>/api/owner/learners</code> gagal${d.status ? ` (status ${esc(d.status)})` : ''}.
      Kegagalan baca TIDAK PERNAH dirender sebagai daftar kosong.</div>`;
  }
  if (d.state === 'not-migrated' || !d.learners) {
    return `<div class="note">PENGUKURAN BELUM TERSEDIA. Migrasi
      <code>0009_learner_evidence.sql</code> belum diterapkan di <code>fiezel-core</code>, atau
      lane bukti per-murid belum dinyalakan. Ini BUKAN "nol murid".</div>`;
  }
  if (!d.learners.length) {
    return `<div class="note">BELUM ADA MURID yang mengirim bukti per-murid pada periode ini.
      Lane ini menuntut PERSETUJUAN tiap murid (Pengaturan &rsaquo; Bukti belajar per murid);
      daftar kosong berarti belum ada yang menyetujuinya, bukan belum ada yang belajar.</div>`;
  }
  const rows = d.learners.map((x) => {
    const selected = m.learnerSub === x.sub;
    const href = `/?period=${esc(m.period)}&amp;learner=${esc(x.sub)}`;
    // Nama yang BUKAN dari perkenalan ditandai, bukan disamarkan: owner berhak tahu
    // bahwa yang ia baca adalah handle sosial atau tidak ada nama sama sekali.
    const mark = x.nameSource === 'onboarding' ? '' : ' <span class="muted-mark">(bukan nama perkenalan)</span>';
    return `<tr${selected ? ' class="sel"' : ''}>
      <td><a href="${href}">${esc(learnerLabel(x))}</a>${mark}</td>
      <td>${esc(x.lastDay || '—')}</td>
      <td>${esc(fmtInt(x.evidenceCount))}</td>
      <td>${esc(fmtInt(x.decisionCount))}</td>
      <td>${esc(x.lastLevel || '—')}</td>
      <td>${esc(x.lastMastery || '—')}</td>
      <td>${esc(x.lastTrend || '—')}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table><tr><th>murid</th><th>aktivitas terakhir</th><th>bukti</th><th>keputusan</th>
    <th>level</th><th>mastery</th><th>tren</th></tr>${rows}</table></div>
    <div class="note">Nama diambil dari yang DIKETIK murid di langkah pertama perkenalan
      (<code>learner_name</code>, wajib diisi, terikat <code>identity.sub</code>). Profil sosial
      (<code>social_profile</code>) hanya cadangan untuk murid lama. Baris "murid &lt;8 hex sub&gt;"
      berarti murid itu mendaftar sebelum nama disimpan di server, atau namanya belum sampai —
      bukan perilaku normal untuk murid baru.</div>`;
}

function renderLearnerDetail(m) {
  if (!m.learnerSub) {
    return `<div class="note">Pilih satu murid di daftar untuk membuka bukti Braincore-nya.</div>`;
  }
  const d = m.learnerDetail;
  if (!d || d.state === 'unconfigured') {
    return `<div class="note">BELUM DIKONFIGURASI — lihat catatan di daftar murid.</div>`;
  }
  if (d.state === 'unavailable') {
    return `<div class="warn">${esc(UNAVAILABLE_TEXT.toUpperCase())}. Subrequest ke
      <code>/api/owner/learner-evidence</code> gagal${d.status ? ` (status ${esc(d.status)})` : ''}.</div>`;
  }
  if (d.state === 'not-migrated' || !d.summary) {
    return `<div class="note">PENGUKURAN BELUM TERSEDIA untuk murid ini.</div>`;
  }
  const name = esc(learnerLabel(d.learner));
  const s2 = d.summary;
  if (!s2.measured) {
    return `<h3>${name}</h3><div class="note">BELUM ADA PENGUKURAN pada periode ini untuk murid
      ini. Ia mungkin aktif di periode lain — coba rentang yang lebih panjang.</div>`;
  }
  const decisionRows = (s2.recentDecisions || []).map((x) =>
    `<tr><td>${esc(x.day)}</td><td>${esc(x.decision || '—')}</td><td>${esc(x.level || '—')}</td>
      <td>${esc(x.outcome || '—')}</td><td>${esc(x.recommendation || '—')}</td>
      <td>${esc(x.masteryDelta || '—')}</td><td>${esc(x.adherence || '—')}</td></tr>`
  ).join('');
  // "68% -> 78%" tidak bisa dicetak dan TIDAK dikarang: yang meninggalkan perangkat adalah
  // BUCKET (m60-80), bukan persen. Yang jujur adalah bucket pertama -> bucket terakhir.
  const masteryMove = s2.masteryFirst && s2.masteryLast
    ? `${esc(s2.masteryFirst)} &rarr; ${esc(s2.masteryLast)}`
    : NO_DATA_TEXT;
  return `<div class="evidence-box" style="margin-top:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:12px;">
      <h3 style="margin:0;font-size:16px;">${name}</h3>
      <span class="sub-chip">Target Profil</span>
    </div>
    <div class="big">${esc(fmtInt(s2.decisionCount))}</div>
    ${row('Keputusan Braincore (periode)', fmtInt(s2.decisionCount))}
    ${row('Bukti belajar (periode)', fmtInt(s2.evidenceCount))}
    ${row('Hari aktif (periode)', fmtInt(s2.activeDays))}
    ${row('Rentang terukur', s2.firstDay && s2.lastDay ? s2.firstDay + ' – ' + s2.lastDay : NO_DATA_TEXT)}
    ${row('Perpindahan mastery', masteryMove, 'bucket pertama → bucket terakhir pada periode ini')}
    ${row('Kalibrasi kesulitan', s2.calibratedShare === null ? NO_DATA_TEXT : s2.calibratedShare + '%', 'bagian bukti yang menilai kesulitan "calibrated"')}
    ${row('Miskonsepsi (bucket terakhir)', Object.keys(s2.misconception).length ? Object.keys(s2.misconception).join(', ') : NO_DATA_TEXT)}
    <div class="subgrid subgrid-2" style="margin-top:14px;">
      <div class="evidence-box" style="background:#fff;">
        <h4>Tren mastery</h4>${evidenceDist(s2.masteryTrend, ['up', 'flat', 'down'])}
        <h4>Sebaran mastery</h4>${evidenceDist(s2.mastery, ['m0-40', 'm40-60', 'm60-80', 'm80-100'])}
        <h4>Tren perbaikan belajar</h4>${evidenceDist(s2.improvementTrend, ['improving', 'steady', 'declining'])}
      </div>
      <div class="evidence-box" style="background:#fff;">
        <h4>Famili skill miskonsepsi</h4>${evidenceDist(s2.misconceptionSkill)}
        <h4>Kalibrasi kesulitan</h4>${evidenceDist(s2.difficultyCalibration, ['too_easy', 'calibrated', 'too_hard'])}
      </div>
      <div class="evidence-box" style="background:#fff;">
        <h4>Alasan keputusan</h4>${evidenceDist(s2.decision)}
        <h4>Hasil kebijakan</h4>${evidenceDist(s2.outcome, ['positive', 'mixed', 'negative', 'insufficient'])}
      </div>
      <div class="evidence-box" style="background:#fff;">
        <h4>Rekomendasi</h4>${evidenceDist(s2.recommendation)}
      </div>
    </div>
    <h4>Keputusan Braincore terakhir</h4>
    <div class="table-wrap"><table><tr><th>hari</th><th>keputusan</th><th>level</th><th>hasil</th><th>rekomendasi</th>
      <th>Δ mastery</th><th>kepatuhan</th></tr>${decisionRows}</table></div>
  </div>`;
}

function renderLearnerSection(m) {
  return `<section><span class="card-full-inner" id="learners"></span><h2><span>${ICONS.users} Murid per orang (Braincore)</span><span class="section-badge">Data Berizin</span></h2>
    ${renderLearnerDirectory(m)}
    ${renderLearnerDetail(m)}
    <div class="note">Panel ini memuat data BERIDENTITAS, atas persetujuan tiap murid, dan
      terpisah dari panel agregat di atas (yang tetap anonim dan tetap memakai cohort acak
      14 hari). Retensi bukti per-murid <b>180 hari</b>; murid yang mencabut persetujuannya
      menghapus buktinya, dan barisnya hilang dari daftar ini.</div>
  </section>`;
}

function renderTeacherSection(m) {
  const tData = m.teachers || { state: 'ok', invites: [], teachers: [] };
  const action = m.teacherAction;

  let alertBanner = '';
  if (action) {
    if (action.action === 'mint' && action.ok) {
      const inv = action.invite || {};
      const expDate = inv.expiresAt ? wibDay(inv.expiresAt) : '—';
      alertBanner = `
        <div style="background:var(--card-bg);border:1px solid var(--emerald-border);border-left:4px solid var(--emerald);border-radius:var(--radius-lg);padding:20px;margin-bottom:20px;box-shadow:var(--shadow-sm);">
          <div style="font-size:16px;font-weight:700;color:var(--text-main);margin-bottom:8px;display:flex;align-items:center;gap:8px;">${ICONS.check} Token Guru Berhasil Dibuat</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Salin token ini sekarang dan serahkan kepada guru untuk diaktifkan di menu Pengaturan aplikasi.</div>
          <div style="margin:12px 0;text-align:center;">
            <code style="font-size:1.5rem;font-weight:700;letter-spacing:2px;color:var(--brand-gold);background:var(--bg-subtle);padding:10px 20px;border-radius:var(--radius-md);border:1px dashed var(--card-border-hover);user-select:all;display:inline-block;font-family:ui-monospace,monospace;">${esc(action.code)}</code>
            <div style="font-size:11.5px;color:var(--text-subtle);margin-top:6px;">(Klik/blok teks token di atas untuk menyalin langsung)</div>
          </div>
          <div style="font-size:13px;line-height:1.6;margin-top:12px;border-top:1px solid var(--card-border);padding-top:10px;color:var(--text-main);">
            <div>Nama Guru: <b>${esc(inv.teacherName || '—')}</b></div>
            <div>Sekolah/Instansi: <b>${esc(inv.institution || '—')}</b> (${esc(inv.institutionType || '—')})</div>
            <div>Masa Berlaku: <b>s.d. ${esc(expDate)} (WIB)</b></div>
          </div>
          <div class="warn" style="margin-top:14px;"><b>${ICONS.alert} PERHATIAN PENTING:</b> Kode token ini <b>HANYA DITAMPILKAN SEKALI INI SAJA</b> demi keamanan kriptografis. Sistem tidak menyimpan token mentah di basis data. Pastikan Anda telah menyalinnya sebelum berpindah halaman.</div>
        </div>
      `;
    } else if (action.action === 'revoke' && action.ok) {
      alertBanner = `
        <div class="note" style="border-left-color:var(--emerald);color:var(--emerald);background:var(--emerald-subtle);padding:12px 16px;margin-bottom:16px;">
          <b>${ICONS.check} Berhasil:</b> ${esc(action.message)}
        </div>
      `;
    } else if (!action.ok) {
      alertBanner = `
        <div class="warn" style="padding:12px 16px;margin-bottom:16px;">
          <b>❌ Gagal:</b> ${esc(action.message)}${action.error ? ` (kode: ${esc(action.error)})` : ''}
        </div>
      `;
    }
  }

  // Formulir pembuatan token
  const formMint = `
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:20px;">
      <h3 style="margin-top:0;margin-bottom:6px;color:var(--ink);">+ Buat Undangan &amp; Token Guru Baru</h3>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px;">
        Owner dapat mencetak token untuk guru. Guru kemudian memasukkan kode token ini di aplikasi FIEZEL untuk membuka portal guru dan mengelola materi kelas.
      </div>
      <form method="GET" action="/" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;align-items:end;">
        <input type="hidden" name="action" value="mint_teacher">
        <div>
          <label for="f_teacherName" style="display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:var(--ink);">Nama Guru</label>
          <input id="f_teacherName" name="teacherName" type="text" placeholder="Contoh: Mardhiana Hamzah" maxlength="60" required>
        </div>
        <div>
          <label for="f_institution" style="display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:var(--ink);">Nama Sekolah / Instansi</label>
          <input id="f_institution" name="institution" type="text" placeholder="Contoh: MTsN 5 ACEH BESAR" maxlength="80" required>
        </div>
        <div>
          <label for="f_institutionType" style="display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:var(--ink);">Jenis Instansi</label>
          <select id="f_institutionType" name="institutionType">
            <option value="school" selected>Sekolah (school)</option>
            <option value="tutoring">Bimbel (tutoring)</option>
            <option value="course">Kursus (course)</option>
            <option value="other">Lainnya (other)</option>
          </select>
        </div>
        <div>
          <label for="f_days" style="display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:var(--ink);">Masa Aktif Token</label>
          <select id="f_days" name="days">
            <option value="14">14 Hari</option>
            <option value="30">30 Hari (1 Bulan)</option>
            <option value="90" selected>90 Hari (3 Bulan)</option>
            <option value="180">180 Hari (6 Bulan)</option>
            <option value="365">365 Hari (1 Tahun)</option>
          </select>
        </div>
        <div>
          <label for="f_subject" style="display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:var(--ink);">Mata Pelajaran yang Diampu</label>
          <select id="f_subject" name="subject_id">
            <option value="MAT" selected>Matematika</option>
            <option value="ENG">Bahasa Inggris</option>
            <option value="IPA">Ilmu Pengetahuan Alam (IPA)</option>
            <option value="IPS">Ilmu Pengetahuan Sosial (IPS)</option>
            <option value="IND">Bahasa Indonesia</option>
            <option value="INF">Informatika</option>
            <option value="PKN">Pendidikan Pancasila</option>
            <option value="SD-ALL">Guru Kelas SD (Tematik)</option>
            <option value="ALL">Semua Mapel (Kurikulum/Kepsek)</option>
          </select>
        </div>
        <div>
          <label for="f_grade" style="display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:var(--ink);">Jenjang / Fase</label>
          <select id="f_grade" name="grade_id">
            <option value="SMP" selected>Fase D · SMP (Kelas 7–9)</option>
            <option value="SMA">Fase E/F · SMA/SMK (Kelas 10–12)</option>
            <option value="SD">Fase A–C · SD (Kelas 1–6)</option>
            <option value="ALL">Semua Jenjang</option>
          </select>
        </div>
        <div style="grid-column:1/-1;text-align:right;margin-top:6px;">
          <button type="submit">+ Buat Token Guru</button>
        </div>
      </form>
    </div>
  `;

  // Formulir cabut manual
  const formRevokeManual = `
    <div style="background:#fff;border:1px dashed var(--line);border-radius:12px;padding:14px 16px;margin-bottom:20px;">
      <form method="GET" action="/" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <input type="hidden" name="action" value="revoke_invite">
        <label for="f_revoke_code" style="font-size:12px;font-weight:bold;color:var(--muted);white-space:nowrap;">Cabut Token Manual:</label>
        <input id="f_revoke_code" name="code" type="text" placeholder="Ketik atau tempel 32 karakter kode token Crockford" maxlength="32" required style="flex:1;min-width:240px;">
        <button type="submit" style="background:#c62828;color:#fff;box-shadow:0 2px 0 #8e1c1c;">Cabut Token</button>
      </form>
    </div>
  `;

  // Tabel daftar token
  const invites = tData.invites || [];
  let inviteTable = '';
  if (!invites.length) {
    inviteTable = `<div class="note">Belum ada token undangan yang dicetak.</div>`;
  } else {
    const rows = invites.map((inv) => {
      let statusBadge = '';
      if (inv.status === 'ACTIVE') {
        statusBadge = `<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-weight:bold;font-size:11px;">AKTIF</span>`;
      } else if (inv.status === 'USED') {
        statusBadge = `<span style="background:#f5f5f5;color:#616161;padding:2px 8px;border-radius:10px;font-size:11px;">TERPAKAI</span>`;
      } else if (inv.status === 'EXPIRED') {
        statusBadge = `<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:10px;font-size:11px;">KEDALUWARSA</span>`;
      } else if (inv.status === 'REVOKED') {
        statusBadge = `<span style="background:#ffebee;color:#c62828;padding:2px 8px;border-radius:10px;font-size:11px;text-decoration:line-through;">DICABUT</span>`;
      } else {
        statusBadge = `<span style="background:#f5f5f5;color:#616161;padding:2px 8px;border-radius:10px;font-size:11px;">${esc(inv.status || '—')}</span>`;
      }

      let actionCell = '—';
      if (inv.status === 'ACTIVE' && inv.codeHash) {
        actionCell = `
          <form method="GET" action="/" style="display:inline;margin:0;">
            <input type="hidden" name="action" value="revoke_invite">
            <input type="hidden" name="codeHash" value="${esc(inv.codeHash)}">
            <button type="submit" style="background:#c62828;color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer;box-shadow:none;">Cabut</button>
          </form>
        `;
      }

      const createdStr = inv.createdAt ? wibDay(inv.createdAt) : '—';
      const expiresStr = inv.expiresAt ? wibDay(inv.expiresAt) : '—';

      return `<tr>
        <td><b>${esc(inv.teacherName || '—')}</b></td>
        <td>${esc(inv.institution || '—')}</td>
        <td>${esc(inv.institutionType || '—')}</td>
        <td>${statusBadge}</td>
        <td>${esc(createdStr)}</td>
        <td>${esc(expiresStr)}</td>
        <td style="text-align:center;">${actionCell}</td>
      </tr>`;
    }).join('');

    inviteTable = `
      <div class="table-wrap" style="margin-bottom:24px;">
        <table>
          <thead>
            <tr>
              <th>Guru</th>
              <th>Sekolah / Instansi</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Dibuat (WIB)</th>
              <th>Berlaku Hingga</th>
              <th style="text-align:center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Tabel daftar guru aktif
  const teachers = tData.teachers || [];
  let teacherTable = '';
  if (!teachers.length) {
    teacherTable = `<div class="note">Belum ada akun guru yang menyelesaikan aktivasi token.</div>`;
  } else {
    const tRows = teachers.map((tc) => {
      const actDate = tc.activatedAt ? wibDay(tc.activatedAt) : '—';
      return `<tr>
        <td><code>${esc(tc.handle || '—')}</code></td>
        <td><b>${esc(tc.teacherName || '—')}</b></td>
        <td>${esc(tc.institution || '—')}</td>
        <td>${esc(tc.institutionType || '—')}</td>
        <td><span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-weight:bold;font-size:11px;">${esc(tc.status || 'active')}</span></td>
        <td>${esc(actDate)}</td>
      </tr>`;
    }).join('');

    teacherTable = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Handle Akun</th>
              <th>Nama Guru</th>
              <th>Sekolah / Instansi</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Aktivasi (WIB)</th>
            </tr>
          </thead>
          <tbody>
            ${tRows}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <section>
      <span class="card-full-inner" id="teachers"></span>
      <h2><span>${ICONS.teacher} Kelola Token &amp; Undangan Guru</span><span class="section-badge">Manajemen Akses</span></h2>
      ${alertBanner}
      ${formMint}
      ${formRevokeManual}
      <h3 style="color:var(--text-main);margin-top:20px;margin-bottom:8px;">Riwayat Undangan &amp; Token Guru</h3>
      ${inviteTable}
      <h3 style="color:var(--text-main);margin-top:20px;margin-bottom:8px;">Daftar Guru Terdaftar &amp; Aktif</h3>
      ${teacherTable}
      <div class="note" style="margin-top:16px;">
        Undangan guru bersifat sekali pakai. Masa aktif default adalah 90 hari. Begitu guru mengaktifkan token di aplikasi, peran akunnya langsung dipromosikan ke <code>teacher</code> dan profil sekolahnya tersimpan aman di basis data server.
      </div>
    </section>
  `;
}

function renderDashboard(m) {
  const t = m.totals || {}, l = m.latest || {}, c = m.cost || {}, a = (c.assumptions || {});
  const periodLabel = { today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' }[m.period] || m.period;
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
    ? `<div class="empty"><b>⚠️ ${esc(m.measurement.state === STATE_UNAVAILABLE ? UNAVAILABLE_TEXT.toUpperCase() : NO_DATA_TEXT.toUpperCase())}</b>${esc(m.measurement.notice)}<br><br>Hari terrollup di seluruh tabel: <b>${esc(m.measurement.daysTotal == null ? stateText(m) : fmtInt(m.measurement.daysTotal) + ' hari')}</b> · hari terrollup di periode ini: <b>${esc(m.measurement.daysCounted == null ? stateText(m) : fmtInt(m.measurement.daysCounted) + ' hari')}</b>.${(m.measurement.readErrors || []).length ? `<br>Query yang gagal dibaca: <code>${esc((m.measurement.readErrors || []).join(', '))}</code>.` : ''}<br>Semua angka di bawah bertanda “${esc(stateText(m))}”.${m.measurement.state === STATE_UNAVAILABLE ? ' Kegagalan baca TIDAK PERNAH dirender sebagai angka nol.' : ` Angka yang benar-benar nol akan bertanda “${esc(MEASURED_ZERO_TEXT)}” — dua hal itu sengaja dibedakan.`}</div>`
    : '';

  // Spanduk KEBASIAN, terpisah dari spanduk keadaan. Halaman bisa "terukur" dan tetap basi, dan
  // itu keadaan paling berbahaya: angkanya nyata, hanya saja bukan angka hari ini.
  const staleBanner = Number.isFinite(m.staleDays) && m.staleDays > 1
    ? `<div class="warn"><b>⚠️ DATA BASI ${esc(fmtInt(m.staleDays))} HARI.</b> Rollup terakhir ${esc(m.anchorDay)}, sedangkan hari ini ${esc(m.today)}.
       Rentang periode di halaman ini dihitung dari HARI INI, bukan dari hari rollup terakhir, jadi hari-hari yang hilang ikut terlihat
       sebagai hari tanpa data. Periksa cron rollup sebelum menyimpulkan pemakaian turun.</div>`
    : '';

  const nav = Object.keys(PERIODS).map((p) => `<a href="/?period=${esc(p)}"${p === m.period ? ' aria-current="page"' : ''} class="period-pill">${esc({ today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' }[p])}</a>`).join('');

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>FIEZEL · Dashboard Owner</title>
<style>${CSS}</style></head><body>

<header class="page-header">
  <div class="page-header-inner">
    <div class="page-logo">
      <a href="/" class="logo-link">
        <span class="logo-icon">${ICONS.brand}</span>
        <span class="logo-text"><span class="logo-bold">SMART</span> <span class="logo-gold">FIEZEL</span></span>
      </a>
      <span class="logo-badge">Console</span>
    </div>
    <div class="header-tools">
      <nav class="nav-periods">
        <div class="nav-group">${nav}</div>
      </nav>
      <div class="header-status-group">
        <span class="status-chip" title="Rollup Terakhir">${ICONS.refresh} ${esc(l.day || '—')}</span>
        <span class="status-chip" title="Waktu Render">${ICONS.check} ${esc(m.generatedAtIso ? m.generatedAtIso.slice(11, 19) + ' WIB' : '—')}</span>
      </div>
      <div class="user-badge">
        <div class="user-avatar">OW</div>
        <div class="user-details">
          <span class="user-name">Owner</span>
          <span class="user-role">Executive</span>
        </div>
      </div>
      <a href="/logout" class="nav-exit" title="Keluar dari Konsol">${ICONS.logout} <span>Keluar</span></a>
    </div>
  </div>
</header>

<div class="page-wrapper">
  <div class="page-container">
    <aside class="sidebar-wrapper">
      <div class="sidebar-user">
        <div class="user-panel">
          <div class="user-avatar-circle">
            <span>FZ</span>
            <span class="status-dot"></span>
          </div>
          <div class="user-info">
            <span class="user-title">Fiezel Owner</span>
            <span class="user-subtitle">Executive Console</span>
          </div>
        </div>
      </div>
      <nav class="sidebar-menu">
        <div class="sidebar-heading">PERFORMA</div>
        <a href="#users" class="sidebar-link active">
          <span class="sidebar-icon">${ICONS.activity}</span>
          <span class="sidebar-text">Keaktifan (DAU)</span>
        </a>
        <a href="#growth" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.users}</span>
          <span class="sidebar-text">Pertumbuhan Murid</span>
        </a>
        <a href="#cost" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.cost}</span>
          <span class="sidebar-text">Estimasi Biaya</span>
        </a>

        <div class="sidebar-heading">PEDAGOGI</div>
        <a href="#activity" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.book}</span>
          <span class="sidebar-text">Aktivitas Belajar</span>
        </a>
        <a href="#retention" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.retention}</span>
          <span class="sidebar-text">Retensi Kohor</span>
        </a>
        <a href="#evidence" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.brain}</span>
          <span class="sidebar-text">Bukti Braincore</span>
        </a>
        <a href="#learners" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.users}</span>
          <span class="sidebar-text">Direktori Murid</span>
        </a>

        <div class="sidebar-heading">SISTEM &amp; EDGE</div>
        <a href="#ai" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.cpu}</span>
          <span class="sidebar-text">Mesin AI (LLM)</span>
        </a>
        <a href="#tts" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.voice}</span>
          <span class="sidebar-text">Suara TTS</span>
        </a>
        <a href="#quota" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.shield}</span>
          <span class="sidebar-text">Proteksi Kuota</span>
        </a>
        <a href="#infra" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.server}</span>
          <span class="sidebar-text">Sistem Edge</span>
        </a>
        <a href="#quality" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.check}</span>
          <span class="sidebar-text">Kualitas Data</span>
        </a>

        <div class="sidebar-heading">ADMINISTRASI</div>
        <a href="#teachers" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.teacher}</span>
          <span class="sidebar-text">Token &amp; Guru</span>
        </a>
        <a href="#export" class="sidebar-link">
          <span class="sidebar-icon">${ICONS.download}</span>
          <span class="sidebar-text">Ekspor CSV</span>
        </a>
      </nav>
    </aside>

    <div class="content-wrapper">
      <div class="page-bar">
        <div class="page-title-breadcrumb">
          <h1 class="page-title">Executive Dashboard</h1>
          <ul class="page-breadcrumb">
            <li><a href="/">Console</a> <span class="breadcrumb-sep">&gt;</span></li>
            <li><span>Performa</span> <span class="breadcrumb-sep">&gt;</span></li>
            <li class="active">Overview</li>
          </ul>
        </div>
        <div class="page-bar-pill">
          ${ICONS.calendar} Periode: <b>${esc(periodLabel)}</b> (${esc(m.from)} &rarr; ${esc(m.to)} WIB)
        </div>
      </div>

      ${emptyBanner}${staleBanner}

      <main>
        <div class="stat-cards-grid">
          <div class="stat-card bg-primary">
            <div class="stat-card-body">
              <div class="stat-card-top">
                <span class="stat-label">Perangkat Aktif (DAU)</span>
                <div class="stat-icon-wrap">${ICONS.activity}</div>
              </div>
              <div class="stat-value">${esc(fmtCount(m, l.dau))}</div>
              <div class="stat-footer-text">
                Puncak: <b>${esc(fmtCount(m, m.peak.dau_peak))}</b> · Rata: <b>${esc(fmtAvg(m, m.peak.dau_avg, 1))}</b>
              </div>
            </div>
          </div>

          <div class="stat-card bg-success">
            <div class="stat-card-body">
              <div class="stat-card-top">
                <span class="stat-label">Pertumbuhan Perangkat</span>
                <div class="stat-icon-wrap">${ICONS.users}</div>
              </div>
              <div class="stat-value">${esc(fmtCount(m, t.new_users))}</div>
              <div class="stat-footer-text">
                Aplikasi Dibuka: <b>${esc(fmtCount(m, t.app_open))}</b>
              </div>
            </div>
          </div>

          <div class="stat-card bg-warning">
            <div class="stat-card-body">
              <div class="stat-card-top">
                <span class="stat-label">Estimasi Biaya</span>
                <div class="stat-icon-wrap">${ICONS.cost}</div>
              </div>
              <div class="stat-value">${esc(fmtMoney(m, c.totalUsd))}</div>
              <div class="stat-footer-text">
                TTS: <b>${esc(fmtMoney(m, c.ttsUsd))}</b> · LLM: <b>${esc(fmtMoney(m, c.llmUsd))}</b>
              </div>
            </div>
          </div>

          <div class="stat-card bg-danger">
            <div class="stat-card-body">
              <div class="stat-card-top">
                <span class="stat-label">Penolakan Kuota</span>
                <div class="stat-icon-wrap">${ICONS.shield}</div>
              </div>
              <div class="stat-value">${esc(fmtCount(m, t.quota_exhausted))}</div>
              <div class="stat-footer-text">
                Breaker: <b>${esc(fmtCount(m, t.breaker_trips))}</b> · 429: <b>${esc(fmtCount(m, u['ai_err:429']))}</b>
              </div>
            </div>
          </div>
        </div>

  <div class="zone-divider" id="zone-perf">
    <span class="zone-badge">Zona 01</span>
    <div class="zone-title-group">
      <h3 class="zone-title">Ringkasan Eksekutif &amp; Pertumbuhan Pengguna</h3>
      <span class="zone-desc">Keaktifan harian (DAU/WAU/MAU), tren pertumbuhan perangkat, dan estimasi biaya Cloudflare.</span>
    </div>
  </div>

  <section>
    <span id="users"></span>
    <h2><span>${ICONS.activity} Active users (DAU / WAU / MAU)</span><span class="section-badge">Keaktifan</span></h2>
    <div class="stat-highlight">
      <div>
        <div class="stat-highlight-label">Perangkat Aktif (DAU)</div>
        <div class="big">${esc(fmtCount(m, l.dau))}</div>
      </div>
      <div class="stat-mini-deck">
        <div class="stat-mini"><span>Puncak Periode</span><b>${esc(fmtCount(m, m.peak.dau_peak))}</b></div>
        <div class="stat-mini"><span>Rata-rata Harian</span><b>${esc(fmtAvg(m, m.peak.dau_avg, 1))}</b></div>
        <div class="stat-mini"><span>Rasio Stickiness</span><b>${esc(fmtRateRange(m, l.dau, l.mau_lower, l.mau_upper))}</b></div>
        <div class="stat-mini"><span>Hari Terhitung</span><b>${esc(fmtCount(m, m.peak.dau_days))} <small style="color:var(--text-subtle)">/ ${esc(m.span)}</small></b></div>
      </div>
    </div>
    ${row('DAU (hari rollup terakhir)', fmtCount(m, l.dau))}
    ${row('WAU', fmtRange(m, l.wau_lower, l.wau_upper), 'rentang batas bawah–atas')}
    ${row('MAU', fmtRange(m, l.mau_lower, l.mau_upper), 'rentang batas bawah–atas')}
    ${row('Stickiness DAU/MAU', fmtRateRange(m, l.dau, l.mau_lower, l.mau_upper))}
    ${row('Puncak DAU pada periode', fmtCount(m, m.peak.dau_peak))}
    ${row('Rata-rata DAU pada periode', fmtAvg(m, m.peak.dau_avg, 1))}
    ${row('Hari DAU terrollup pada periode', fmtCount(m, m.peak.dau_days), `dari ${esc(m.span)}`)}
    ${sparkline(m.series, 'dau')}
    <div class="card-footer">
      <div class="warn">${esc(DEVICE_TRUTH)} "Aktif" = hari dengan ≥5 jawaban (ambang yang sama dengan cincin misi murid).</div>
      <div class="warn">WAU dan MAU sengaja RENTANG, bukan satu angka${Number(l.wau_mau_is_estimate) ? ' (penanda estimasi dari job rollup menyala)' : ''}: token perangkat dirotasi tiap 24 jam dan pepper lama dihapus, jadi menyambungkan perangkat lintas hari mustahil. Batas bawah = perangkat harian terbanyak, batas atas = jumlah seluruh hari.</div>
      <div class="note">DAU/WAU/MAU dibaca dari baris agregat harian yang dibekukan job rollup — dashboard tidak pernah menyentuh tabel token per-perangkat.</div>
      ${limitRows(m, 'Active users')}
    </div>
  </section>

  <section>
    <span id="growth"></span>
    <h2><span>${ICONS.users} User growth</span><span class="section-badge">Pertumbuhan</span></h2>
    <div class="kpi-hero">
      <span class="kpi-hero-label">Total Perangkat Baru</span>
      <div class="big">${esc(fmtCount(m, t.new_users))}</div>
    </div>
    ${row('Perangkat baru (periode)', fmtCount(m, t.new_users))}
    ${row('Aplikasi dibuka (periode)', fmtCount(m, t.app_open), 'pembukaan, bukan orang unik')}
    ${row('Pembukaan dengan akun tertaut', fmtCount(m, t.app_open_with_identity))}
    ${row('Laporan hari-aktif', fmtCount(m, t.day_active_reports))}
    ${sparkline(m.series, 'new_users')}
    <div class="card-footer">
      <div class="warn">${esc(DEVICE_TRUTH)}</div>
      <div class="note">"Aplikasi dibuka" adalah BATAS BAWAH: PWA yang dibuka dari precache tanpa jaringan tidak pernah mengirim event, jadi ia tidak terhitung.</div>
      ${limitRows(m, 'User growth')}
    </div>
  </section>

  <section>
    <span id="cost"></span>
    <h2><span>${ICONS.cost} Cost estimation</span><span class="section-badge">Finansial</span></h2>
    <div class="kpi-hero">
      <span class="kpi-hero-label">Estimasi Biaya Operasional</span>
      <div class="big">${esc(fmtMoney(m, c.totalUsd))}</div>
    </div>
    ${row('TTS', fmtMoney(m, c.ttsUsd))}
    ${row('LLM', fmtMoney(m, c.llmUsd))}
    ${row('Biaya / perangkat aktif', !isMeasured(m) ? stateText(m) : (c.usdPerActiveDevice == null ? '—' : fmtUsd(c.usdPerActiveDevice, 4)))}
    <div class="card-footer">
      <div class="assume">ASUMSI YANG DIPAKAI (bukan angka ajaib — sumber: reports/cf-a10-cost.md + cf-a10-cost-model.json):<br>
        · TTS <code>${esc(a.ttsProvider)}</code> = <code>${esc(fmtUsd(a.ttsUsdPer1MChars))}</code> per 1 juta karakter<br>
        · <code>chars_per_audio_min = ${esc(fmtInt(a.charsPerAudioMin))}</code> (kalibrasi 273 aset audio nyata)<br>
        · LLM <code>${esc(a.llmModel)}</code> = <code>${esc(fmtUsd(a.llmUsdPer1MIn, 3))}</code> masuk / <code>${esc(fmtUsd(a.llmUsdPer1MOut, 3))}</code> keluar per 1 juta token<br>
        · Rumus: <code>tts = char_dirender/1e6 × tarif</code>; <code>llm = tok_in/1e6 × tarif_in + tok_out/1e6 × tarif_out</code>; <code>total = tts + llm + infra − kredit</code><br>
        · Hanya cache MISS yang ditagih. TARIF TIDAK DISIMPAN PER HARI: tidak ada tabel biaya di database ini dan tidak boleh ada, jadi tarif di atas dipakai ulang untuk SEMUA hari. Mengubahnya mengubah angka bulan lalu juga — ini estimasi sekarang, bukan jejak audit.
      </div>
      <div class="warn">Penyebut "perangkat aktif" adalah UNDER-COUNT (murid offline tidak terlihat), jadi biaya/perangkat aktif adalah BATAS ATAS, bukan angka pasti.${a.tokensAreEstimated ? ' Token keluaran = proksi char/4 → biaya LLM adalah estimasi kasar.' : ''} Bila TTS berjalan on-device, biaya TTS nyata NOL dan yang perlu dipantau justru bandwidth model.</div>
      ${limitRows(m, 'Cost estimation')}
    </div>
  </section>

  <div class="zone-divider" id="zone-pedagogy">
    <span class="zone-badge">Zona 02</span>
    <div class="zone-title-group">
      <h3 class="zone-title">Efektivitas Belajar &amp; Retensi Kohor</h3>
      <span class="zone-desc">Aktivitas belajar murid, kurva retensi pengamatan, dan kecerdasan pedagogi Braincore.</span>
    </div>
  </div>

  <section>
    <span id="activity"></span>
    <h2><span>${ICONS.book} Learning activity</span><span class="section-badge">Pelajaran</span></h2>
    ${row('Jawaban', fmtCount(m, t.answers))}
    ${row('Jawaban benar', fmtCount(m, t.answers_ok))}
    ${row('Akurasi', fmtRate(m, t.answers_ok, t.answers))}
    ${row('Sesi dimulai', fmtCount(m, t.sessions))}
    ${row('Sesi tuntas', fmtCount(m, t.sessions_completed))}
    ${row('Pelajaran dimulai', fmtCount(m, t.lessons_started))}
    ${row('Pelajaran tuntas', fmtCount(m, t.lessons_completed))}
    ${row('Rasio tuntas', fmtRate(m, t.lessons_completed, t.lessons_started))}
    ${sparkline(m.series, 'answers')}
    <div class="card-footer">
      <div class="note">Dilaporkan sendiri oleh klien (self-reported): bisa kurang (murid offline) dan bisa lebih (klien dimodifikasi). Angka biaya TIDAK pernah memakai kanal ini.</div>
    </div>
  </section>

  <section>
    <span class="col-2-panel" id="retention"></span>
    <h2><span>${ICONS.retention} Retention (observed)</span><span class="section-badge">Kohor Bertahan</span></h2>
    <div class="table-wrap">
      <table><thead><tr><th>Offset</th><th>Kembali</th><th>Cohort</th><th>%</th><th>Kohor</th></tr></thead>
      <tbody>${retentionRows}</tbody></table>
    </div>
    <div class="card-footer">
      <div class="note">Kolom Cohort (n=) diturunkan dari baris offset D0 kohor yang sama; skema retensi tidak menyimpan ukuran kohor sebagai kolom sendiri. Penyebut tiap baris hanya menjumlahkan kohor yang BENAR-BENAR punya pengamatan di offset itu — kohor yang belum cukup tua tidak diseret masuk sebagai "hilang". Kolom terakhir = jumlah kohor yang menyumbang, supaya "0%" tidak tertukar dengan "nol kohor".</div>
      <div class="warn">PERINGATAN ESTIMASI PERANGKAT: cohort dibangun dari perangkat, bukan orang.
      Ganti perangkat atau hapus data browser terlihat sebagai "berhenti" walau muridnya tetap belajar.
      Belajar offline berhari-hari juga menurunkan retensi tanpa ada murid yang hilang.
      Safari membatasi storage skrip 7 hari → cohort iOS bisa tampak berhenti di D7.</div>
      <div class="note">Persentase disembunyikan bila cohort &lt; ${esc(RETENTION_MIN_COHORT)}: angka presisi di atas cohort kecil adalah derau, bukan sinyal.</div>
      ${limitRows(m, 'Retention')}
    </div>
  </section>

  ${renderEvidenceSection(m)}
  ${renderLearnerSection(m)}

  <div class="zone-divider" id="zone-systems">
    <span class="zone-badge">Zona 03</span>
    <div class="zone-title-group">
      <h3 class="zone-title">Operasi Sistem, Mesin AI &amp; Keandalan Edge</h3>
      <span class="zone-desc">Throughput token LLM, efisiensi cache suara TTS, proteksi kuota, dan integritas data rollup.</span>
    </div>
  </div>

  <section>
    <span id="ai"></span>
    <h2><span>${ICONS.cpu} AI usage</span><span class="section-badge">Mesin LLM</span></h2>
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
    <div class="card-footer">
      ${aiErrBucketSum !== (Number(t.ai_failure) || 0) ? `<div class="warn">Rincian error berjumlah ${esc(fmtInt(aiErrBucketSum))} sedangkan metrik gagal berbunyi ${esc(fmtCount(m, t.ai_failure))}. Selisih ini nyata (event tanpa kode error tidak masuk rincian), bukan salah tampil — pakai metrik gagal sebagai angka resmi.</div>` : ''}
      <div class="warn">Token = bisa PROKSI (karakter ÷ 4). Jalur server tidak menandai hari mana yang memakai proksi, jadi peringatan ini dicetak tanpa syarat: perlakukan biaya LLM sebagai estimasi kasar.</div>
      <div class="note">Semua angka AI lahir di Worker (server-side), bukan dari klien — di situlah biaya lahir. Rincian kode error dibaca dari tabel dimensi pemakaian (bucket <code>ai_err:*</code>), bukan dari metrik terpisah per kode.</div>
      ${limitRows(m, 'AI usage')}
    </div>
  </section>

  <section>
    <span id="tts"></span>
    <h2><span>${ICONS.voice} TTS usage</span><span class="section-badge">Audio Suara</span></h2>
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
    <div class="card-footer">
      <div class="note">Hanya cache MISS yang berbiaya. Mesin suara on-device dihitung terpisah dan tidak masuk biaya; bandwidth model on-device (±152 MB/perangkat) TIDAK terukur skema ini.</div>
    </div>
  </section>

  <section>
    <span id="quota"></span>
    <h2><span>${ICONS.shield} Quota exhaustion</span><span class="section-badge">Batas Kapasitas</span></h2>
    <div class="kpi-hero">
      <span class="kpi-hero-label">Total Penolakan Kuota</span>
      <div class="big">${esc(fmtCount(m, t.quota_exhausted))}</div>
    </div>
    ${row('Penolakan karena kuota habis', fmtCount(m, t.quota_exhausted), 'penolakan, bukan perangkat')}
    ${row('· kuota AI', fmtCount(m, u['quota:ai']))}
    ${row('· kuota TTS', fmtCount(m, u['quota:tts']))}
    ${row('· kuota terjemahan', fmtCount(m, u['quota:translate']))}
    ${row('429 dari AI', fmtCount(m, u['ai_err:429']))}
    ${row('Breaker terbuka', fmtCount(m, t.breaker_trips))}
    <div class="card-footer">
      ${limitRows(m, 'Quota exhaustion')}
      <div class="note">KEPUTUSAN KUOTA: kalau baris di atas berbunyi "${esc(NO_DATA_TEXT)}", tidak ada satu pun angka di halaman ini yang boleh dipakai untuk menaikkan atau menurunkan kuota. Yang belum diukur tidak bisa dipangkas.</div>
      <div class="note">Dicatat server-side tepat di cabang yang mengembalikan 429. Angka naik = murid ditolak; itu keputusan biaya yang terlihat, bukan bug yang disembunyikan.</div>
    </div>
  </section>

  <section>
    <span id="infra"></span>
    <h2><span>${ICONS.server} Infrastructure</span><span class="section-badge">Sistem Edge</span></h2>
    ${row('Breaker terbuka', fmtCount(m, t.breaker_trips))}
    ${row('Breaker pulih', fmtCount(m, t.breaker_recoveries))}
    ${row('Event analytics diterima', fmtCount(m, t.events_total))}
    <div class="card-footer">
      <div class="note">Hanya tiga baris di atas yang benar-benar ada di tabel agregat. Permintaan Worker, objek/byte R2, error backend, dan latensi p50/p95 hidup di Analytics API Cloudflare (butuh token akun) — lihat baris "tidak bisa diukur" di bawah.</div>
      ${limitRows(m, 'Infrastructure')}
    </div>
  </section>

  <section>
    <span class="col-2-panel" id="quality"></span>
    <h2><span>${ICONS.check} Data quality</span><span class="section-badge">Integritas</span></h2>
    ${row('Keadaan pengukuran', isMeasured(m) ? 'terukur' : stateText(m))}
    ${row('Pengumpulan dimulai', m.collection.day_first_collected || NO_DATA_TEXT)}
    ${row('Hari terkumpul', m.measurement.daysTotal == null ? stateText(m) : fmtInt(m.measurement.daysTotal) + ' hari')}
    ${row('Hari dalam periode', m.measurement.daysCounted == null ? stateText(m) : fmtInt(m.measurement.daysCounted) + ' hari', `dari ${esc(m.span)}`)}
    ${row('Hari rollup GAGAL', fmtCount(m, brokenDays))}
    ${row('Rentang hari yang terbaca', isMeasured(m) ? `${esc(m.periodDays.day_from || '—')} → ${esc(m.periodDays.day_to || '—')}` : stateText(m))}
    <div class="card-footer">
      ${brokenDays > 0 ? `<div class="warn">${esc(brokenDays)} hari punya collection_ok=0. Grafik digambar PUTUS di hari itu — tidak diinterpolasi. Jangan bandingkan periode yang memuat hari rusak.</div>` : ''}
      <div class="note">Semua angka historis dimulai dari tanggal pengumpulan di atas. Sebelum tanggal itu tidak ada data — bukan nol, tetapi tidak diketahui.</div>
      ${limitRows(m, 'Data quality')}
    </div>
  </section>

  <div class="zone-divider" id="zone-admin">
    <span class="zone-badge">Zona 04</span>
    <div class="zone-title-group">
      <h3 class="zone-title">Administrasi, Spesifikasi &amp; Ekspor Data</h3>
      <span class="zone-desc">Otorisasi token guru, batasan skema privasi, dan unduhan laporan agregat CSV.</span>
    </div>
  </div>

  ${renderTeacherSection(m)}

  <section>
    <span class="card-full-inner" id="export"></span>
    <h2><span>${ICONS.download} Ekspor data (CSV)</span><span class="section-badge">Unduh Laporan</span></h2>
    <div class="note">Berkas mengikuti periode yang sedang dipilih (<b>${esc(periodLabel)}</b>) dan
    berisi angka yang SAMA dengan yang dirender di halaman ini — nol data tambahan, nol dimensi
    baru. Setiap berkas membawa baris <code>measurement_state</code> supaya "belum diukur" tidak
    pernah terbaca sebagai "nol" setelah berkas ini beredar terlepas dari dashboard.</div>
    <div class="export-deck">
      <a class="export-chip" href="/api/export/summary.csv?period=${esc(m.period)}">${ICONS.file} Ringkasan metrik</a>
      <a class="export-chip" href="/api/export/series.csv?period=${esc(m.period)}">${ICONS.activity} Deret harian (tren)</a>
      <a class="export-chip" href="/api/export/retention.csv?period=${esc(m.period)}">${ICONS.retention} Retensi per kohor</a>
      <a class="export-chip" href="/api/export/evidence.csv?period=${esc(m.period)}">${ICONS.brain} Bukti belajar Braincore</a>
    </div>
    <div class="note">Untuk pembaca mesin, JSON yang setara sudah ada di
    <code>/api/summary</code>, <code>/api/series</code>, dan <code>/api/retention</code>.</div>
  </section>

</main>
<footer>Sumber: TIGA tabel agregat saja — metrik harian (bentuk panjang: hari × nama metrik × nilai), dimensi pemakaian berenum tertutup, dan retensi kohor. Tabel token perangkat dan bahan rahasia rotasi ADA di database yang sama tetapi TIDAK PERNAH dibaca halaman ini. Dashboard ini tidak punya jalan untuk membaca baris per-orang, dan tidak menampilkan identitas, surel, isi jawaban, maupun percakapan AI.
Baris bertanda “${esc(UNMEASURABLE_TEXT)}” adalah batas nyata skema, bukan kerusakan: menambah tabel untuk menutupnya melanggar kunci lima tabel yang menjaga privasi murid.
Kontrak: EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL" · bentuk tabel: workers/api/migrations/0002_analytics.sql · rumus biaya: reports/cf-a10-cost.md.</footer>
    </div>
  </div>
</div>
</body></html>`;
}

function renderLogin(message) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>FIEZEL · Masuk Owner</title><style>${CSS}</style></head><body>
<div class="login-shell">
  <div class="login-card">
    <div class="login-header">
      <span class="brand-badge">Owner Access</span>
      <h1 style="margin-top:8px;">FIEZEL · Masuk Owner</h1>
      <div class="sub" style="justify-content:center;margin-top:4px;">Halaman ini tidak memuat satu angka metrik pun.</div>
    </div>
    <form method="POST" action="/login">
      <div style="margin-bottom:12px;">
        <label for="t" style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--ink);">Token owner</label>
        <input id="t" name="t" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Masukkan token owner" required>
      </div>
      <button type="submit" style="width:100%;">Masuk</button>
      ${message ? `<div class="warn">${esc(message)}</div>` : ''}
      <div class="note">Token tidak disimpan di repo. Yang ada di server hanya sha256 HEX-nya (Secret <code>OWNER_TOKEN_HASH</code>). Sesi berumur 30 menit.</div>
    </form>
  </div>
</div>
</body></html>`;
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
//   1. Ia database ANALYTICS. `DEPLOY.md` + `tests/analytics-privacy-test.js` mengunci database itu
//      pada LIMA tabel agregat; tabel rem login adalah data AUTH, dan menaruhnya di sana
//      melanggar pemisahan yang justru menjadi alasan Worker ini berdiri sendiri (README §1
//      "radius ledakan").
//   2. Worker ini HANYA-BACA terhadap `fiezel-stats`, dan sifat itu ditegakkan gerbang
//      (`queries.js` menolak memuat kata tulis; `tests/owner-dashboard-test.js` gagal bila ada
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
//     Worker ini, dan `tests/owner-edge-guard-test.js` butir (g-g) tetap memaksanya.
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
    const fetchImpl = (ctx && ctx.fetch) || (typeof fetch === 'function' ? fetch : null);
    const action = url.searchParams.get('action');
    let teacherAction = null;
    if (action === 'mint_teacher') {
      const teacherName = url.searchParams.get('teacherName') || '';
      const institution = url.searchParams.get('institution') || '';
      const institutionType = url.searchParams.get('institutionType') || 'school';
      const days = url.searchParams.get('days') || '90';
      const subject_id = url.searchParams.get('subject_id') || 'MAT';
      const grade_id = url.searchParams.get('grade_id') || 'SMP';
      const mintRes = await mintTeacherInvite(env, { teacherName, institution, institutionType, days, subject_id, grade_id }, fetchImpl);
      if (mintRes.state === 'ok' && mintRes.body && mintRes.body.code) {
        teacherAction = {
          ok: true,
          action: 'mint',
          code: mintRes.body.code,
          invite: mintRes.body.invite,
          message: 'Token guru berhasil dibuat! Simpan/salin sekarang karena token hanya ditampilkan satu kali.'
        };
      } else {
        teacherAction = {
          ok: false,
          action: 'mint',
          error: (mintRes.body && mintRes.body.error) || mintRes.state,
          message: 'Gagal membuat token guru. Periksa kembali nama guru, instansi, dan jenis instansi.'
        };
      }
    } else if (action === 'revoke_invite') {
      const code = url.searchParams.get('code') || '';
      const codeHash = url.searchParams.get('codeHash') || '';
      const revokeRes = await revokeTeacherInvite(env, { code, codeHash }, fetchImpl);
      if (revokeRes.state === 'ok' && revokeRes.body && revokeRes.body.ok) {
        teacherAction = {
          ok: true,
          action: 'revoke',
          revoked: revokeRes.body.revoked,
          message: revokeRes.body.revoked ? 'Token guru berhasil dicabut.' : 'Token tidak ditemukan atau sudah dicabut sebelumnya.'
        };
      } else {
        teacherAction = {
          ok: false,
          action: 'revoke',
          error: (revokeRes.body && revokeRes.body.error) || revokeRes.state,
          message: 'Gagal mencabut token guru. Periksa format kode token.'
        };
      }
    }

    // Murid terpilih adalah PARAMETER KUERI pada rute yang sudah ada, bukan rute baru.
    // Konsekuensinya disengaja: OWNER_ROUTES tidak berubah, allowlist proxy
    // `deploy/edge/owner-index.php` tidak berubah, dan tidak ada satu pun permukaan owner
    // baru yang harus dipagari ulang. Validasi bentuk `sub` terjadi di readModel.
    const model = await readModel(env, period, now, url.searchParams.get('learner'), fetchImpl);
    if (teacherAction) {
      model.teacherAction = teacherAction;
    }
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
  readLearners, readLearnerDetail, sanitizeLearnerRow, sanitizeLearnerSummary,
  renderLearnerSection, renderLearnerDirectory, renderLearnerDetail, learnerLabel, SUB_RE,
  readTeachers, mintTeacherInvite, revokeTeacherInvite, renderTeacherSection,
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
