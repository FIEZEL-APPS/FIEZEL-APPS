/**
 * workers/api/mw-edge.js — GERBANG EDGE: HOSTNAME TEPERCAYA **atau** `X-Fiezel-Edge`.
 *
 * ==========================================================================
 * 🔄 TEMUAN LAPANGAN 28 Agu 2026 — CUSTOM DOMAIN SUDAH TERIKAT (BAGIAN INI BARU)
 * ==========================================================================
 * Momen yang sudah diantisipasi bab "PENGECUALIAN EKSPLISIT" di bawah SUDAH
 * TERJADI, sebagian:
 *   - Nameserver `fiezel.my.id` SUDAH pindah ke Cloudflare di DNS publik
 *     (`dig NS` menjawab `sydney/syeef.ns.cloudflare.com`, SOA `dns.cloudflare.com`).
 *   - Worker `fiezel-api` SUDAH terikat sebagai **custom domain** ke
 *     `api.fiezel.my.id` (record AAAA `100::` proxied, cert_id
 *     `cef4989c-…`), sama seperti yang sudah lama tertulis di
 *     `wrangler.toml` `routes = [{ pattern = "api.fiezel.my.id", custom_domain = true }]`.
 *   - Status zona di dashboard masih `pending` (verifikasi otomatis Cloudflare
 *     belum jalan), jadi tanggal aktifnya belum bisa dipastikan dari sini.
 *
 * Akibat langsung yang WAJIB ditangani berkas ini: begitu zona aktif, permintaan
 * murid tiba di Worker **LANGSUNG dari browser**, dan proxy PHP
 * (`deploy/edge/api-index.php`) TIDAK LAGI berada di jalur permintaan. Artinya
 * TIDAK ADA header `X-Fiezel-Edge` pada permintaan yang paling sah di sistem ini.
 * Kalau gerbang dibiarkan seperti sebelum commit ini, seluruh jalur Cloudflare
 * mati dengan `forbidden_edge` kecuali `/healthz`.
 *
 * Yang TIDAK dilakukan sebagai jawaban: mematikan gerbang. Maksud desain aslinya
 * (tutup `*.workers.dev`, nol I/O pada penolakan, satu bentuk galat) tetap utuh.
 * Yang dilakukan: menambah JALUR SAH KEDUA — **hostname tepercaya** —
 * berdampingan dengan jalur header, dengan default-deny untuk hostname lain.
 * Lihat bab "DUA JALUR SAH" di bawah.
 *
 * ==========================================================================
 * MASALAH NYATA YANG DITUTUP BERKAS INI
 * ==========================================================================
 * Worker `fiezel-api` hidup di dua alamat sekaligus:
 *
 *   1. `https://api.fiezel.my.id`      — subdomain cPanel di origin ArenHost yang
 *      menjalankan proxy PHP (`deploy/edge/api-index.php`) dan meneruskan ke (2).
 *      Ini jalur yang dipakai murid, dan satu-satunya jalur yang membuat cookie
 *      identitas `fz_id` tetap PIHAK PERTAMA di `fiezel.my.id`.
 *   2. `https://fiezel-api.fitrajft.workers.dev` — alamat asal Worker.
 *
 * Alamat (2) TIDAK bisa dimatikan selama (1) masih menjadi jembatan: proxy PHP
 * memanggilnya. Tetapi selama ia terbuka tanpa syarat, siapa pun bisa memanggil
 * `POST /api/auth/anon` langsung ke sana, MELEWATI jembatan, dan menerbitkan
 * identitas anonim tanpa batas. Itu bukan kerugian teoretis: setiap penerbitan
 * menulis baris ke D1 (`identity`, `anon_issue`), dan setiap identitas baru
 * membawa jatah gratisnya sendiri (AI/TTS). Artinya alamat (2) yang terbuka =
 * pintu untuk menguras kuota gratis akun DAN mengisi D1 plan gratis.
 *
 * Karena itu: proxy PHP mengirim `X-Fiezel-Edge: <secret>` pada SETIAP
 * permintaan, dan berkas ini menolak permintaan yang tidak membawanya.
 *
 * ==========================================================================
 * KENAPA GERBANG INI PALING LUAR (SEBELUM CORS/ORIGIN DAN IDENTITAS)
 * ==========================================================================
 * Penyerang yang memanggil `*.workers.dev` langsung tidak mengirim `Origin`
 * sama sekali, jadi `originGate` MELOLOSKANNYA dengan sengaja (permintaan
 * non-browser / same-origin). Gerbang origin memang tidak dirancang untuk
 * masalah ini. Jadi satu-satunya tempat yang benar adalah SEBELUM apa pun yang
 * menyentuh D1/KV — supaya biaya penolakan tetap nol tulis, nol baca.
 *
 * ==========================================================================
 * SECRET BELUM TERPASANG = FAIL-CLOSED (audit D3 HIGH-3)
 * ==========================================================================
 * Kalau Secret `EDGE_SHARED_SECRET` TIDAK terpasang, gerbang ini MENOLAK semua
 * permintaan (403, bentuk galat identik dengan header-salah) kecuali
 * `EDGE_FREE_PATHS` (`/healthz`). Default-nya AMAN: deploy yang lupa memasang
 * secret menghasilkan API yang diam, bukan API yang terbuka lebar di
 * `*.workers.dev`. Versi lama justru fail-open ("supaya deploy pertama tidak
 * terlihat rusak") — audit D3 menilai itu HIGH: satu langkah deploy yang
 * terlewat membuka penerbitan identitas tanpa batas, dan tidak ada yang
 * menyadarinya karena semuanya "berfungsi".
 *
 * PENGECUALIAN EKSPLISIT — `ALLOW_NO_EDGE_SECRET = "true"` (var, bukan secret):
 *   - Hanya nilai string persis 'true' yang membuka mode `off` lama: gerbang
 *     meloloskan semua permintaan sambil mencatat peringatan, dan `/health`
 *     melaporkan `edgeGuard:"off"`.
 *   - Mode itu SAH HANYA SELAMA MASA TRANSISI (dev lokal, harness test, atau
 *     jendela singkat sebelum `wrangler secret put EDGE_SHARED_SECRET`).
 *     `off` BUKAN mode produksi: selama `off`, alamat `*.workers.dev` masih
 *     terbuka dan kerentanan di atas MASIH ADA.
 *   - Mode itu HARUS berakhir di dua titik: (i) segera setelah secret
 *     dipasang, dan (ii) selamanya setelah nameserver `fiezel.my.id` pindah ke
 *     Cloudflare, saat custom domain menggantikan jembatan PHP dan
 *     `workers_dev = false` mematikan alamat `*.workers.dev`. Sesudah titik
 *     (ii), var ini harus DIHAPUS dari konfigurasi, bukan disetel 'false'.
 * Jangan menormalkan `off`. Kalau `/health` masih menjawab `edgeGuard:"off"`
 * seminggu setelah deploy, itu temuan, bukan konfigurasi.
 *
 * Kenapa keduanya (fail-closed DAN penolakan header-salah) memakai bentuk galat
 * yang SAMA: penyerang tidak boleh bisa membedakan "secret belum dipasang" dari
 * "secret terpasang tapi headermu salah" — keduanya cuma `forbidden_edge`.
 *
 * ==========================================================================
 * JALUR BEBAS-HEADER: `/healthz` SAJA — `/health` TETAP DILINDUNGI
 * ==========================================================================
 * Pertanyaannya nyata: monitor eksternal (UptimeRobot dsb.) tidak bisa
 * mengirim header rahasia, jadi harus ada satu jalur yang boleh tanpa header.
 * Kandidatnya `/health`. DITOLAK, alasannya bisa diperiksa:
 *   - `/health` mengumumkan `capabilities`, `aiGateway`, `version`, `service`,
 *     dan `plan`. Itu peta permukaan serang: ia memberi tahu penyerang fitur
 *     mana yang hidup (`context-coach-v1`, `alrs`, ...) tanpa ia perlu menebak.
 *     Membebaskan `/health` berarti membocorkan peta itu ke publik selamanya.
 *   - Monitor tidak butuh peta itu. Monitor butuh satu bit: hidup atau mati.
 * Jadi `/healthz` ada: HANYA `{ok:true,protocol:"1.7"}`, nol baca D1/KV, nol
 * kapabilitas, nol nama layanan, nol waktu server. `protocol` tetap ada karena
 * monitor yang berguna harus bisa melihat protokol yang salah, dan angka itu
 * sudah publik di klien.
 *
 * Konsekuensi yang diterima sadar: `/healthz` bisa dipakai memetakan bahwa
 * Worker ini ada. Itu sudah diketahui siapa pun yang membuka aplikasi. Yang
 * TIDAK bocor adalah daftar fitur.
 *
 * ==========================================================================
 * DUA JALUR SAH (HOSTNAME TEPERCAYA **ATAU** HEADER), DAN DEFAULT-DENY
 * ==========================================================================
 * Urutan keputusan gerbang, dari yang paling murah:
 *   0. `EDGE_FREE_PATHS` (`/healthz` saja) — lolos di hostname mana pun, karena
 *      monitor eksternal harus tetap melihat "hidup / mati" di semua keadaan.
 *   1. mode `off` (`ALLOW_NO_EDGE_SECRET="true"` tanpa secret) — dev/harness.
 *   2. **HOSTNAME TEPERCAYA** (`TRUSTED_EDGE_HOSTS`): lolos TANPA header.
 *      Inilah jalur custom domain. Diperiksa SEBELUM `edgeSecret()` supaya
 *      produksi tetap hidup sesudah `wrangler secret delete EDGE_SHARED_SECRET`
 *      pada langkah pembongkaran — jalur utama tidak boleh bergantung pada
 *      artefak jembatan yang sedang dibongkar.
 *   3. **HEADER SAH** (`X-Fiezel-Edge` == `EDGE_SHARED_SECRET`, waktu-konstan),
 *      dan HANYA diterima di hostname jembatan (`*.workers.dev`) — itu satu-satunya
 *      alamat yang dipanggil `api-index.php`.
 *   4. apa pun yang lain: DITOLAK. Termasuk `*.workers.dev` tanpa header (lubang
 *      lama, tetap tertutup) DAN hostname asing yang belum pernah didaftarkan
 *      (default-deny, bukan default-allow).
 *
 * KENAPA HOSTNAME AMAN DIPAKAI SEBAGAI KEPUTUSAN OTORISASI, PADAHAL `Host`
 * BISA DIPALSUKAN — jawaban jujur, bukan jaminan yang dibesar-besarkan:
 *   - Worker tidak punya satu pun sinyal "hostname yang tidak bisa dipalsukan".
 *     `new URL(request.url).hostname` (yang dipakai di sini, lewat `ctx.url`)
 *     berasal dari `Host`/`:authority`. Tidak ada `request.cf` field yang
 *     menyatakan "permintaan ini masuk lewat custom domain X"; mengarang
 *     pemeriksaan seperti itu berarti mengarang jaminan.
 *   - Yang membuat pilihan ini TETAP AMAN adalah SKALA HAK yang diberikannya:
 *     lolos lewat hostname tepercaya memberi penyerang **tepat sama** dengan yang
 *     ia sudah dapat dengan mengirim permintaan biasa ke `https://api.fiezel.my.id`
 *     — alamat publik yang memang dibuka untuk semua murid. Jadi `Host` palsu ke
 *     alamat Worker tidak menaikkan hak apa pun; ia hanya jalan pintas ke pintu
 *     yang sudah terbuka. (Dan untuk sampai ke Worker dengan `Host:
 *     api.fiezel.my.id` lewat HTTPS, permintaan itu tetap harus melalui edge
 *     Cloudflare yang me-rutekan berdasarkan hostname yang sama.)
 *   - Yang HILANG memang nyata dan harus dicatat apa adanya: sesudah custom
 *     domain aktif, `POST /api/auth/anon` **memang** bisa dipanggil siapa pun
 *     tanpa lewat jembatan. Itu bukan regresi yang diperkenalkan gerbang ini,
 *     melainkan konsekuensi membuka API di alamat publik. Penahannya bergeser ke
 *     tempat yang benar: pembatas per-IP `rate-anon.js`
 *     (`ANON_ISSUE_LIMIT_PER_HOUR`), bukan ke sebuah header rahasia yang browser
 *     murid tidak pernah bisa mengirimkannya.
 *   - Yang MASIH dijaga gerbang ini, dan itu sebabnya ia tidak dihapus:
 *     `*.workers.dev` tanpa header tetap 403 (alamat asal yang tidak bisa
 *     dikunci CORS dan tidak bisa membawa cookie pihak pertama), dan hostname
 *     yang tidak dikenal tetap 403 (mis. rute/hostname yang tersalah-pasang di
 *     masa depan tidak diam-diam menjadi API publik kedua).
 *
 * SATU SUMBER KEBENARAN untuk daftar hostname: konstanta `TRUSTED_EDGE_HOSTS` di
 * berkas ini. SENGAJA bukan var env: var bisa diubah di dashboard tanpa jejak di
 * repo, dan daftar host tepercaya adalah keputusan keamanan yang harus terbaca
 * di kode + terjaga gerbang. `tests/edge-guard-test.js` butir (h) meng-assert daftar
 * ini SAMA dengan `custom_domain` di `workers/api/wrangler.toml` — jadi kalau
 * hostname baru dipasang di konfigurasi tanpa dimasukkan ke daftar (atau
 * sebaliknya), CI merah, bukan lolos.
 *
 * ==========================================================================
 * KAPAN JALUR HEADER BOLEH DIHAPUS (DAN SIAPA YANG MEMUTUSKAN)
 * ==========================================================================
 * Jalur `X-Fiezel-Edge` DIPERTAHANKAN di paket ini. Alasannya operasional, bukan
 * sentimental: selama zona masih `pending` dan cache DNS resolver di dunia masih
 * memegang record lama, sebagian permintaan MASIH tiba lewat proxy PHP di origin
 * ArenHost. Mematikan jalur header sekarang berarti memadamkan murid-murid yang
 * resolver-nya belum menyegarkan.
 *
 * Syarat penghapusan (semua harus benar, dan diverifikasi dengan perintah, bukan
 * dengan perasaan):
 *   1. zona `fiezel.my.id` berstatus **Active** di Cloudflare;
 *   2. `dig +short A api.fiezel.my.id` HANYA menjawab IP Cloudflare (tidak lagi
 *      `195.88.211.212`) selama > TTL record lama;
 *   3. `workers_dev = false` sudah ter-deploy sehingga `*.workers.dev` mati
 *      secara struktural;
 *   4. log/monitor menunjukkan NOL permintaan yang lolos lewat jalur `header`
 *      (`/health` melaporkan `edgeGuardPath`, lihat bab berikut) selama satu
 *      periode pengamatan penuh;
 *   5. `deploy/edge/api-index.php` sudah dicabut dari origin.
 * KEPUTUSANNYA MILIK OWNER, dieksekusi MASTER lewat langkah
 * "PEMBONGKARAN" di `deploy/edge/README.md` §PEMBONGKARAN — bukan oleh paket
 * kerja yang kebetulan sedang menyentuh berkas ini. Sesudah dihapus, var
 * `ALLOW_NO_EDGE_SECRET` ikut DIHAPUS (bukan disetel `'false'`), dan Secret
 * `EDGE_SHARED_SECRET` dihapus dari kedua Worker.
 *
 * ==========================================================================
 * `/health` MELAPORKAN JALUR YANG DIPAKAI
 * ==========================================================================
 * `edgeGuardStatus()` tetap menjawab `'on'`/`'off'` — kontrak lama yang dibaca
 * probe hidup (`tools/fiezel-health-probe.mjs` MENGANGGAP KRITIS kalau
 * `edgeGuard !== 'on'`, dan `tests/staging-live-test.js` ikut meng-assert itu). Yang
 * BARU adalah `edgeGuardPath()`: `'custom-domain'` | `'header'` | `'off'`
 * | `'free-path'`, diisi gerbang ini pada `ctx.edgePath` saat ia meloloskan
 * permintaan. Dengan begitu keadaan nyata TERBACA ("permintaan ini sampai lewat
 * custom domain, bukan lewat jembatan") tanpa memalsukan sinyal `on/off` yang
 * sudah dipakai alat lain. Nilai ini hanya bisa dibaca lewat `/health`, dan
 * `/health` sendiri tidak pernah bebas gerbang — jadi ia bukan oracle publik.
 *
 * Preflight `OPTIONS` juga tidak lewat gerbang ini (ia dijawab `index.js`
 * sebelum rantai middleware). Itu benar dan tidak melemahkan apa pun: proxy PHP
 * menjawab preflight sendiri, jadi preflight ke Worker hanya datang dari klien
 * yang salah alamat — dan permintaan sungguhannya tetap kena 403.
 */

import { jsonError } from './errors.js';

/** Nama header yang dikirim proxy PHP. Satu sumber kebenaran. */
export const EDGE_HEADER = 'x-fiezel-edge';

/**
 * Path yang boleh diakses TANPA header jembatan. Daftar ini SENGAJA sesempit
 * mungkin dan setiap penambahan wajib punya alasan tertulis: setiap path di
 * sini adalah permukaan yang terbuka di `*.workers.dev`.
 */
export const EDGE_FREE_PATHS = Object.freeze(['/healthz']);

/**
 * SATU SUMBER KEBENARAN hostname yang boleh lolos TANPA header jembatan, yaitu
 * hostname yang benar-benar terikat ke Worker ini sebagai CUSTOM DOMAIN.
 * Harus identik dengan `routes = [{ pattern = ..., custom_domain = true }]` di
 * `workers/api/wrangler.toml` — `tests/edge-guard-test.js` butir (h) memaksa keduanya
 * sama. Huruf kecil semua; pembanding menormalkan masukan.
 *
 * `owner.fiezel.my.id` SENGAJA TIDAK ADA di sini: ia milik Worker LAIN
 * (`workers/owner/index.js`, penjaganya disalin ke sana) dan hostname itu belum
 * menjadi custom domain — masih lewat `deploy/edge/owner-index.php`. Menaruhnya
 * di daftar ini tidak akan membuatnya bekerja dan hanya menyesatkan pembaca.
 */
export const TRUSTED_EDGE_HOSTS = Object.freeze(['api.fiezel.my.id']);

/** Akhiran alamat asal Worker yang TIDAK boleh pernah menjadi jalur murid. */
export const WORKERS_DEV_SUFFIX = '.workers.dev';

/** Normalisasi hostname: huruf kecil, tanpa titik akhir, tanpa spasi. */
function normalizeHost(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/\.$/, '');
}

/**
 * Hostname permintaan, diambil dari `ctx.url` (yang dirakit `index.js` dari
 * `request.url`). Bukan dari header `X-Forwarded-Host` / `X-Host` / sejenisnya:
 * header seperti itu bisa disuntik pemanggil mana pun dan akan mengubah
 * keputusan otorisasi menjadi sesuatu yang dikendalikan klien sepenuhnya.
 */
export function requestHostname(ctx) {
  if (ctx && ctx.url && ctx.url.hostname) return normalizeHost(ctx.url.hostname);
  try {
    return normalizeHost(new URL(ctx.request.url).hostname);
  } catch (_) {
    return '';
  }
}

/** Alamat asal Worker (`*.workers.dev`) — jalur jembatan, BUKAN jalur murid. */
export function isWorkersDevHost(host) {
  const h = normalizeHost(host);
  return h === 'workers.dev' || h.endsWith(WORKERS_DEV_SUFFIX);
}

/** Hostname custom domain tepercaya. `*.workers.dev` tidak pernah masuk. */
export function isTrustedEdgeHost(host) {
  const h = normalizeHost(host);
  if (!h || isWorkersDevHost(h)) return false;
  return TRUSTED_EDGE_HOSTS.includes(h);
}

/**
 * Perbandingan waktu-konstan. Cermin `ctEq()` di `workers/owner/index.js:65`
 * (pola yang sudah dipakai repo untuk digest token owner), disalin dan BUKAN
 * diimpor karena `workers/owner` adalah Worker terpisah dengan graf modul
 * sendiri — `workers/api` tidak boleh mengimpor lintas Worker.
 *
 * Kenapa bukan operator kesetaraan biasa: perbandingan string berhenti pada
 * byte pertama yang berbeda, jadi waktu eksekusinya membocorkan panjang prefiks
 * yang cocok. Dengan header yang bisa dikirim berulang kali tanpa batas, itu
 * cukup untuk menebak secret byte demi byte. Panjang yang berbeda pun tetap
 * dijalankan sampai habis di sini.
 *
 * TIDAK ADA satu pun operator kesetaraan langsung yang diterapkan pada nilai
 * rahasia di berkas ini — `tests/edge-guard-test.js` butir (d) memindai itu.
 */
export function ctEq(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a == null ? '' : a));
  const y = enc.encode(String(b == null ? '' : b));
  const len = Math.max(x.length, y.length, 1);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i += 1) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

/** Secret yang terpasang, sudah dirapikan. String kosong dianggap tidak ada. */
export function edgeSecret(env) {
  const raw = env && env.EDGE_SHARED_SECRET;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Status gerbang untuk `/health`. Dua nilai saja, dan keduanya JUJUR:
 *   'on'  = gerbang MENEGAKKAN: setiap permintaan (kecuali `EDGE_FREE_PATHS`)
 *           harus datang lewat hostname tepercaya ATAU membawa header sah.
 *   'off' = mode transisi eksplisit (`ALLOW_NO_EDGE_SECRET="true"` tanpa secret);
 *           gerbang tidak menolak apa pun.
 * `/health` sendiri tidak pernah bebas gerbang, jadi nilai ini bukan oracle
 * publik.
 *
 * KENAPA `'on'` TIDAK BOLEH DIGANTI dengan nama jalur: probe hidup
 * `tools/fiezel-health-probe.mjs:247` menilai `edgeGuard !== 'on'` sebagai
 * KRITIS ("penjaga edge MATI"), dan `tests/staging-live-test.js:251` meng-assert hal
 * yang sama terhadap produksi. Mengubah nilai ini menjadi `'custom-domain'`
 * akan membuat kedua alat itu melaporkan kerusakan palsu tepat pada hari zona
 * aktif. Jalur yang dipakai dilaporkan di field TERPISAH — `edgeGuardPath()`.
 *
 * Guard tetap 'on' walau secret tidak terpasang, karena sesudah custom domain
 * aktif secret itu memang tidak lagi dibutuhkan: penegakan hostname tetap jalan.
 */
export function edgeGuardStatus(env) {
  return edgeSecret(env) || !allowNoSecretOverride(env) ? 'on' : 'off';
}

/** Nilai `ctx.edgePath` yang mungkin. Satu sumber kebenaran untuk gerbang+tes. */
export const EDGE_PATHS = Object.freeze(['custom-domain', 'header', 'off', 'free-path']);

/**
 * JALUR yang benar-benar dipakai permintaan ini untuk lolos — supaya keadaan
 * nyata terbaca di `/health` dan tidak perlu ditebak:
 *   'custom-domain' = tiba di hostname tepercaya, tanpa header (jalur UTAMA
 *                     sesudah zona aktif);
 *   'header'        = tiba lewat proxy PHP dengan `X-Fiezel-Edge` sah (jalur
 *                     CADANGAN selama cache DNS lama masih ada);
 *   'off'           = mode transisi eksplisit, tidak ada penegakan;
 *   'free-path'     = `EDGE_FREE_PATHS` (tidak pernah `/health`, jadi tidak
 *                     pernah muncul di respons `/health`).
 * `'unknown'` hanya bisa muncul kalau `/health` dipanggil tanpa melewati rantai
 * middleware — itu bug perakitan, dan lebih baik terlihat daripada disamarkan.
 */
export function edgeGuardPath(ctx) {
  const seen = ctx && typeof ctx.edgePath === 'string' ? ctx.edgePath : '';
  return EDGE_PATHS.includes(seen) ? seen : 'unknown';
}

/**
 * Pengecualian eksplisit fail-closed (lihat bab header). HANYA string persis
 * 'true' (setelah trim) yang dihitung — angka, boolean JSON, atau 'TRUE'
 * dengan kapital tidak, supaya nilai yang tersalin setengah jadi tidak diam-diam
 * membuka gerbang.
 */
export function allowNoSecretOverride(env) {
  const raw = env && env.ALLOW_NO_EDGE_SECRET;
  const norm = typeof raw === 'string' ? raw.trim() : '';
  // Perbandingan biasa di sini AMAN dan disengaja: 'true' bukan nilai rahasia
  // (pemindaian anti-oracle butir (d) hanya melarang kesetaraan pada SECRET).
  return norm === 'true';
}

/**
 * Peringatan `off` dicatat lewat jalur log Worker yang sudah dipakai
 * `index.js` (`console.warn`/`console.error` -> `wrangler tail` /
 * Workers Observability). Sekali per isolate, BUKAN sekali per permintaan:
 * satu baris log per permintaan adalah cara paling cepat membuat owner
 * mematikan observability, dan owner yang mematikan log tidak akan melihat
 * peringatan apa pun lagi.
 */
let warnedThisIsolate = false;

export function resetEdgeWarningForTests() {
  warnedThisIsolate = false;
  warnedClosedThisIsolate = false;
}

function warnGuardOff() {
  if (warnedThisIsolate) return;
  warnedThisIsolate = true;
  console.warn(
    'fiezel-api edgeGuard=off — EDGE_SHARED_SECRET belum dipasang dan ALLOW_NO_EDGE_SECRET=true memaksa gerbang terbuka. ' +
    'Alamat *.workers.dev TERBUKA dan bisa dipakai menerbitkan identitas anonim tanpa lewat jembatan. ' +
    'Jalankan: wrangler secret put EDGE_SHARED_SECRET lalu hapus var ALLOW_NO_EDGE_SECRET. ' +
    'Keadaan ini hanya sah selama masa transisi.'
  );
}

let warnedClosedThisIsolate = false;

function warnGuardClosed() {
  if (warnedClosedThisIsolate) return;
  warnedClosedThisIsolate = true;
  console.error(
    'fiezel-api edgeGuard=FAIL-CLOSED — EDGE_SHARED_SECRET belum dipasang, semua rute (kecuali /healthz) menjawab 403. ' +
    'Ini default aman, bukan kerusakan. Jalankan: wrangler secret put EDGE_SHARED_SECRET. ' +
    'Untuk dev/masa transisi SAJA, var ALLOW_NO_EDGE_SECRET="true" membuka mode lama yang tidak menolak apa pun.'
  );
}

/**
 * Bentuk galat penolakan. SATU bentuk untuk semua sebab (header tidak ada,
 * header salah), mengikuti aturan anti-oracle `errors.js`: penyerang tidak boleh
 * bisa membedakan "secret terpasang tapi punyamu salah" dari "kamu tidak
 * mengirim apa pun". Ia juga tidak boleh bisa menyimpulkan apakah secret
 * terpasang — karena itu jawaban saat guard `off` tidak pernah 403 SEKALIGUS
 * jawaban saat guard `on` tidak pernah menyebut nama header, nama secret, atau
 * nama alamat jembatan.
 *
 * Bentuknya lahir dari `errors.js` (`jsonError`), bukan dirakit di sini: satu
 * tabel bentuk galat adalah aturan keras repo ini, dan gerbang jembatan tidak
 * boleh menjadi pengecualian yang mengembalikan amplop berbeda.
 *
 * `forbidden_edge` dipilih (bukan `forbidden_origin`) supaya log owner bisa
 * memisahkan dua sebab penolakan yang sangat berbeda tanpa memberi tahu klien
 * apa pun lebih dari satu kata.
 */
export const ERR_EDGE = 'forbidden_edge';

/**
 * Middleware [M-1] — dijalankan PALING LUAR, sebelum CORS/origin dan identitas.
 * Mengembalikan Response = permintaan ditolak; `null` = lanjut.
 *
 * Nol I/O: tidak ada baca D1, tidak ada baca KV, tidak ada `await`. Penolakan
 * di plan gratis harus lebih murah daripada serangan yang memicunya.
 */
export function edgeGuardMiddleware(ctx) {
  // Jalur bebas-header dievaluasi lebih dulu supaya /healthz tetap hidup di
  // SEMUA mode, termasuk fail-closed — monitor eksternal harus tetap bisa
  // melihat "Worker hidup tapi tertutup" saat secret belum terpasang.
  if (EDGE_FREE_PATHS.includes(ctx.pathname)) return allow(ctx, 'free-path');

  const configured = edgeSecret(ctx.env);

  // Mode transisi eksplisit (dev/harness) tetap paling atas: kalau owner memang
  // memaksa gerbang terbuka, ia terbuka untuk semua hostname, dan `/health`
  // mengumumkannya sebagai `off` supaya keadaan itu tidak bisa disembunyikan.
  if (!configured && allowNoSecretOverride(ctx.env)) {
    warnGuardOff();
    return allow(ctx, 'off');
  }

  const host = requestHostname(ctx);

  // [1] JALUR UTAMA sesudah custom domain terikat: hostname tepercaya lolos
  // tanpa header. Diperiksa SEBELUM `configured` supaya produksi tidak ikut
  // mati saat `EDGE_SHARED_SECRET` dihapus pada langkah pembongkaran jembatan.
  if (isTrustedEdgeHost(host)) return allow(ctx, 'custom-domain');

  // [2] JALUR CADANGAN: proxy PHP -> `*.workers.dev` dengan header sah. Sabuk
  // dan bretel — header sah TIDAK cukup di hostname yang tidak dikenal, supaya
  // hostname yang tersalah-pasang di masa depan tidak menjadi API publik kedua.
  if (!configured) {
    // FAIL-CLOSED (audit D3 HIGH-3): tanpa secret dan tanpa pengecualian
    // eksplisit, semuanya ditolak dengan bentuk yang sama seperti header salah.
    warnGuardClosed();
    return rejectEdge(ctx);
  }
  if (isWorkersDevHost(host)) {
    const presented = ctx.request.headers.get(EDGE_HEADER);
    if (ctEq(presented, configured)) return allow(ctx, 'header');
    return rejectEdge(ctx);
  }

  // [3] DEFAULT-DENY: hostname asing (bukan tepercaya, bukan alamat jembatan)
  // ditolak apa pun headernya, dengan bentuk galat yang IDENTIK — penyerang
  // tidak boleh bisa memakai gerbang ini untuk memetakan hostname mana yang
  // dikenal Worker.
  return rejectEdge(ctx);
}

/**
 * Meloloskan permintaan sambil MENCATAT jalurnya di ctx (dibaca `/health` lewat
 * `edgeGuardPath`). Mengembalikan `null` karena rantai middleware memakai
 * `null` = lanjut. Nol I/O, satu penugasan properti.
 */
function allow(ctx, path) {
  if (ctx) ctx.edgePath = path;
  return null;
}

function rejectEdge(ctx) {
  // Bentuk galat sopan + header CORS: klien yang salah alamat tetap harus bisa
  // membaca body-nya, kalau tidak browser menampilkan "network error" alih-alih
  // pesan FIEZEL (aturan bab 12 yang sama seperti `mw-guard.js`). SATU fungsi
  // untuk fail-closed maupun header-salah = bentuk identik terjamin (anti-oracle).
  const headers = Object.assign({ vary: 'Origin' }, ctx.corsHeaders || {});
  return jsonError(403, ERR_EDGE, { message: 'Permintaan ini harus lewat alamat resmi FIEZEL.' }, { headers });
}
