/**
 * tests/secret-scan-test.js — GERBANG pemindai rahasia seluruh repo.
 *
 * Node murni, NOL dependency, NOL jaringan, NOL berkas temporer (satu-satunya
 * berkas yang ditulis adalah laporannya sendiri, SECRET-SCAN-REPORT.json).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Repo publik terkait (`FIEZEL-APPS/api-`, berkas `api.md`) pernah memuat lima
 * API key MENTAH. Owner sudah menanganinya, tetapi permukaan rahasia repo ini
 * justru bertambah sejak itu:
 *
 *   - `deploy/edge/*.php` memuat placeholder `__EDGE_SECRET__` yang DIGANTI
 *     nilai sungguhan saat pemasangan di origin. Satu `scp` berkas hasil edit
 *     kembali ke repo = secret bersama jembatan edge bocor permanen di riwayat.
 *   - `workers/<worker>/wrangler.toml` memuat DAFTAR NAMA secret (`wrangler secret
 *     put …`). Nama tidak berbahaya; satu orang yang "melengkapi" daftar itu dengan
 *     nilainya membuatnya berbahaya.
 *
 * `tests/edge-guard-test.js` sudah menjaga SATU berkas (`deploy/edge/api-index.php`).
 * Gerbang ini menjaga SELURUH berkas yang dilacak git — karena kebocoran tidak
 * memilih berkas yang sudah dijaga.
 *
 * ==========================================================================
 * PRINSIP: TIDAK BISA DIBOHONGI, DAN TIDAK MEMBANJIRI
 * ==========================================================================
 * Dua kegagalan yang sama fatalnya:
 *   (1) Pemindai yang tidak pernah bisa merah = kebohongan hijau. Karena itu
 *       bagian 1 di bawah menyuntikkan fixture sintetis untuk SETIAP kelas pola
 *       dan meng-assert detektornya menyala. Fixture dibangun dengan
 *       PENGGABUNGAN string ('sk' + '-' + …) supaya berkas ini sendiri tidak
 *       memuat literal yang cocok — jadi ia bisa memindai dirinya sendiri.
 *   (2) Pemindai yang membanjiri positif palsu akan dimatikan orang, dan
 *       gerbang yang dimatikan tidak melindungi apa pun. Angka nyata dari repo
 *       ini: pola base64url naif (>=32 karakter, charset termasuk `+/`) memberi
 *       9.000+ kecocokan di 347 berkas — semuanya nama pelajaran, path, dan
 *       konstanta (`past_continuous_vs_past_simple_interrupted_action`).
 *       Penyaring struktural di `REFINE` menurunkannya menjadi 1 berkas (fixture
 *       `tests/edge-guard-test.js`) TANPA satu pun pengecualian berbasis nama berkas.
 *
 * Konsekuensi desain: ALLOWLIST DI SINI SENGAJA LEMAH. Ia hanya boleh
 * mematikan detektor HEURISTIK (entropi/base64/kv). Detektor KERAS — kunci
 * ber-prefiks (`sk-`, `pk_live_`, `ghp_`, `cfut_`, `AIza`), JWT, blok PEM,
 * hash bcrypt — TETAP BERJALAN pada setiap berkas teks yang dilacak, termasuk
 * yang ada di allowlist. Jadi allowlist secara struktural tidak bisa memaafkan
 * berkas yang benar-benar memuat pola rahasia bernilai, dan itu di-assert
 * (`allowlist tidak mematikan detektor keras`).
 *
 * ==========================================================================
 * BATAS KEJUJURAN (dilaporkan, bukan disembunyikan)
 * ==========================================================================
 * (a) HANYA KEADAAN SAAT INI. Gerbang ini memindai isi berkas yang dilacak git
 *     pada working tree — BUKAN riwayat commit. Berkas yang hari ini bersih
 *     tetapi pernah memuat secret di commit sebelumnya TIDAK terdeteksi di
 *     sini, dan itu keputusan sadar: `git log -p --all` di repo ini berukuran
 *     ratusan MB dan menjalankannya di setiap push mengubah gerbang detik
 *     menjadi gerbang menit. Perintah manual untuk owner ada di
 *     `reports/add-a4-secret-scan.md` §Batas dan di `notes` laporan JSON.
 * (b) Rahasia yang TIDAK berpola tetap lolos: kata sandi pendek yang mirip kata
 *     biasa, ID numerik, atau nilai yang dipecah menjadi potongan-potongan.
 *     Pemindai pola tidak bisa menemukan yang tidak punya bentuk.
 * (c) Berkas biner dilewati (dibuktikan biner lewat byte NUL, bukan dipercaya
 *     lewat ekstensi). Secret yang ditanam di dalam .png/.onnx tidak terlihat.
 * (d) Berkas yang TIDAK dilacak git tidak dipindai — ia tidak bisa bocor lewat
 *     `git push`. Yang dijaga terhadapnya adalah `.gitignore` (bagian 4).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = __fzRoot;
const SELF = path.basename(__filename);
const REPORT_PATH = path.join(ROOT, 'SECRET-SCAN-REPORT.json');

const checks = [];
const notes = [];
let failed = 0;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: String(detail === undefined ? '' : detail).slice(0, 600) });
  if (!ok) failed += 1;
}

/* =========================================================================
 * 0. Alat ukur
 * ======================================================================= */

/** Entropi Shannon per karakter. Bukan bukti, hanya penyaring bentuk. */
function entropy(s) {
  const freq = Object.create(null);
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const key in freq) { const p = freq[key] / s.length; h -= p * Math.log2(p); }
  return h;
}

const uniqueCount = (s) => new Set(s.split('')).size;
const isHexOnly = (s) => /^[0-9a-f]+$/i.test(s);
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * Nilai yang secara jelas BUKAN secret sungguhan melainkan tempat-duduk.
 * Penting: daftar ini menilai NILAI, bukan berkas. Sebuah placeholder tetap
 * placeholder di berkas mana pun, dan sebuah nilai acak tetap temuan di berkas
 * mana pun.
 */
const RE_PLACEHOLDER = new RegExp([
  '^__[A-Z0-9_]+__$',              // __EDGE_SECRET__
  '^<[^>]*>$',                     // <isi setelah: wrangler d1 create …>
  '\\$\\{',                        // ${VAR} interpolasi
  '\\$\\(',                        // $(openssl rand -base64 32) substitusi perintah
  '^\\$[A-Za-z_]',                 // $VAR shell
  'process\\.env',
  '\\benv\\.[A-Z]',
  'REPLACE|CHANGE.?ME|TODO|FIXME',
  'PLACEHOLDER|REDACTED|DIISI|ISI SETELAH',
  '^(?:x|X){6,}$',
  'YOUR[_-]?(?:KEY|TOKEN|SECRET)',
  'contoh|example|dummy|sample|fake|palsu|sentinel'
].join('|'), 'i');

/**
 * NAMA secret, bukan nilai secret. `wrangler.toml` repo ini sengaja memuat
 * delapan nama (`SESSION_HMAC_KEY_CURRENT`, `EDGE_SHARED_SECRET`, …) dan itu
 * memang cara yang benar mendokumentasikan secret. SCREAMING_SNAKE_CASE tidak
 * pernah menjadi bentuk nilai acak.
 */
const RE_SECRET_NAME = /^[A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)*$/;

/**
 * Nilai sintetis yang jelas ditandai sebagai contoh oleh BENTUKNYA, bukan oleh
 * nama berkasnya: urutan berjalan (`1234567890`, `abcdefghij`) atau satu
 * karakter yang diulang. Dua gerbang existing memakai
 * `sk-` + `1234567890ABCDEFGHIJKLMNOP` sebagai fixture untuk membuktikan
 * penolakan secret di level render prompt (tests/fiezel-prompt-library-test.js:39,
 * tests/fiezel-self-refine-test.js:64). Menghukum keduanya berarti memaksa orang
 * menghapus tes yang justru mencegah kebocoran. Yang disaring adalah bentuk
 * URUTAN — sebuah kunci sungguhan dengan `1234567890ABCDEFGHIJ` di dalamnya
 * bukan kunci, ia string mainan.
 */
function looksSequentialFixture(value) {
  const lower = value.toLowerCase();
  if (/0123456789|1234567890|9876543210/.test(lower)) return true;
  if (/abcdefghij|jihgfedcba|qwertyuiop/.test(lower)) return true;
  if (/(.)\1{5,}/.test(value)) return true;
  if (entropy(value) < 3.0) return true;
  return false;
}

/* =========================================================================
 * 1. DETEKTOR
 *    `hard: true`  = pola yang tidak punya tafsir sah sebagai teks biasa.
 *                    Berjalan pada SEMUA berkas teks, allowlist tidak berlaku.
 *    `hard: false` = heuristik bentuk/entropi. Bisa dimatikan oleh allowlist
 *                    berjalasan di bagian 2.
 * ======================================================================= */

// Dibangun dari potongan supaya berkas ini tidak memuat literal PEM yang cocok.
const DASH5 = '-'.repeat(5);
const RE_PEM = new RegExp(DASH5 + 'BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?' + DASH5);

const DETECTORS = [
  {
    id: 'openaiKey',
    hard: true,
    label: 'kunci gaya sk-',
    why: 'Bentuk kunci OpenAI/kompatibel. Repo terkait pernah membocorkan lima kunci mentah seperti ini.',
    re: /\bsk-(?:proj-|live-|ant-)?[A-Za-z0-9_-]{20,}/g,
    refine: (m) => !looksSequentialFixture(m.replace(/^sk-(?:proj-|live-|ant-)?/, ''))
  },
  {
    id: 'stripeKey',
    hard: true,
    label: 'kunci gaya pk_/sk_ (live/test)',
    why: 'Bentuk kunci Stripe dan turunannya; `pk_live_` cukup untuk memetakan akun, `sk_live_` cukup untuk memindahkan uang.',
    re: /\b(?:pk|sk|rk)_(?:live|test|prod)_[A-Za-z0-9]{16,}/g,
    refine: (m) => !looksSequentialFixture(m.split('_').slice(2).join('_'))
  },
  {
    id: 'githubToken',
    hard: true,
    label: 'token GitHub (ghp_/gho_/ghu_/ghs_/ghr_)',
    why: 'Token GitHub = tulis ke repo ini. Workflow repo ini melakukan auto-deploy dari `main`, jadi token tulis = kendali produksi.',
    re: /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
    refine: (m) => !looksSequentialFixture(m.slice(4))
  },
  {
    id: 'cloudflareToken',
    hard: true,
    label: 'token Cloudflare (cfut_)',
    why: 'Worker, D1, KV, R2, dan zona DNS FIEZEL semuanya di Cloudflare; satu token = seluruh backend.',
    re: /\bcfut_[A-Za-z0-9_-]{20,}/g,
    refine: (m) => !looksSequentialFixture(m.slice(5))
  },
  {
    id: 'googleApiKey',
    hard: true,
    label: 'kunci API Google (AIza…)',
    why: 'Bentuk kunci Google/Gemini/Maps. Prefiksnya unik dan tidak pernah muncul sebagai teks biasa.',
    re: /\bAIza[0-9A-Za-z_-]{30,}/g,
    refine: (m) => !looksSequentialFixture(m.slice(4))
  },
  {
    id: 'jwt',
    hard: true,
    label: 'JWT tiga bagian',
    why: 'Header `eyJ` = `{"` ter-base64url. JWT yang ter-commit sering berisi klaim identitas dan berlaku sampai kedaluwarsa.',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    refine: () => true
  },
  {
    id: 'pemPrivateKey',
    hard: true,
    label: 'blok private key PEM',
    why: 'Tidak ada alasan sah apa pun bagi repo aplikasi murid untuk memuat kunci privat.',
    re: new RegExp(RE_PEM.source, 'g'),
    refine: () => true
  },
  {
    id: 'bcryptHash',
    hard: true,
    label: 'hash bcrypt',
    why: 'Hash bcrypt yang ter-commit adalah kata sandi owner yang bisa diserang offline tanpa batas laju.',
    re: /\$2[abxy]?\$\d{2}\$[.\/A-Za-z0-9]{53}/g,
    refine: () => true
  },
  {
    id: 'base64urlToken',
    hard: false,
    label: 'token base64url panjang berentropi tinggi',
    why: 'Bentuk nilai `EDGE_SHARED_SECRET`, `SESSION_HMAC_KEY_*`, `IDENTITY_PEPPER`, dan `CRON_TOKEN` — semuanya byte acak, bukan kata.',
    re: /[A-Za-z0-9+_-]{32,}={0,2}/g,
    /**
     * Penyaring STRUKTURAL (bukan daftar nama berkas). Alasan tiap baris ada di
     * komentarnya; angka dampaknya diukur pada repo ini, lihat header §(2).
     */
    refine: (token) => {
      if (isHexOnly(token)) return false;            // digest sha256/sha1: 690 berkas repo ini penuh checksum sah
      if (!/[a-z]/.test(token)) return false;         // KONSTANTA / SCREAMING_SNAKE, bukan nilai acak
      if (!/[A-Z]/.test(token)) return false;         // identifier & path snake_case
      if (!/[0-9]/.test(token)) return false;         // kalimat CamelCase (`rawLearnerResponseRequiredForPersistence`)
      // Nama berpemisah: `past_continuous_vs_past_simple`, `m025-172-jembatan-edge`.
      // Nilai acak 24 byte tidak terurai menjadi banyak potongan pendek.
      const segments = token.split(/[-_+]/);
      if (segments.length >= 2 && segments.every((s) => s.length <= 15)) return false;
      if (entropy(token) < 4.0) return false;         // ~ >=16 simbol berbeda terdistribusi rata
      return true;
    }
  },
  {
    id: 'base64Blob',
    hard: false,
    label: 'blob base64 standar (dengan +/ atau padding)',
    why: '`openssl rand -base64 32` — cara yang dianjurkan README worker owner untuk membuat secret — menghasilkan bentuk ini.',
    re: /[A-Za-z0-9+/]{40,}={0,2}/g,
    refine: (token) => {
      if (!/[+/=]/.test(token)) return false;         // sudah ditangani detektor base64url
      if (isHexOnly(token)) return false;
      // Path: `vendor/kokoro-js/licenses/…`, `com/s/fredoka/v17/…`. Satu segmen
      // huruf-kecil saja sudah cukup membuktikan ini nama, bukan byte acak.
      if (/(^|\/)[a-z]{3,}(\/|$)/.test(token)) return false;
      if (uniqueCount(token) < 22) return false;
      if (entropy(token) < 4.6) return false;
      return true;
    }
  },
  {
    id: 'assignedSecretLiteral',
    hard: false,
    label: '`password=`/`secret=`/`token=` dengan nilai literal',
    why: 'Bentuk kebocoran paling umum: nilai ditempel langsung ke tempat nama seharusnya berada.',
    // Grup 1 = kunci, grup 2 = nilai (dalam kutip), grup 3 = nilai (tanpa kutip).
    // `pass` TELANJANG sengaja TIDAK diterima sebagai kunci: repo ini punya ~120
    // gerbang yang menulis `pass: checks.filter(…)` dan `result.pass=…`, dan
    // kunci sepanjang empat huruf itu tidak pernah menandai kredensial di sini.
    re: /\b(password|passwd|secret|token|api[_-]?key|apikey|auth[_-]?token|access[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]\s*(?:['"`]([^'"`\n]{8,})['"`]|([^\s'"`,;)\]}#]{12,}))/gi,
    refine: (_match, groups) => {
      const quoted = groups[1] !== undefined;
      const value = quoted ? groups[1] : groups[2];
      if (value === undefined) return false;
      if (value.length < 12) return false;            // `a1b2c3d4` (fixture tests/analytics-server-only-test.js:39)
      if (RE_PLACEHOLDER.test(value)) return false;   // `__EDGE_SECRET__`, `$(openssl rand …)`, `<isi setelah …>`
      if (RE_SECRET_NAME.test(value)) return false;   // NAMA secret (`SESSION_HMAC_KEY_CURRENT`), bukan nilainya
      if (/\s/.test(value)) return false;             // kalimat/prosa, bukan nilai
      if (/^https?:\/\//i.test(value)) return false;  // URL endpoint
      // Nilai TANPA KUTIP di dalam kode bukan nilai, ia EKSPRESI:
      // `const secret = secretForKid(env, KID)`, `var token = ++narrationToken`.
      // Karena itu bentuk tanpa kutip hanya diterima kalau ia benar-benar
      // berbentuk nilai mentah (charset kredensial saja, ada angka, ada campuran
      // huruf besar/kecil) — bentuk yang muncul di `.env`, `.ini`, dan URL.
      if (!quoted) {
        if (!/^[A-Za-z0-9_+\-=.]+$/.test(value)) return false;
        if (!/[0-9]/.test(value)) return false;
        // sha git (40) dan sha256 (64) beredar di seluruh dokumen repo ini sebagai
        // penanda commit/checksum — heksa polos sepanjang itu bukan kredensial.
        if (isHexOnly(value) && (value.length === 40 || value.length === 64)) return false;
        if (!(/[a-z]/.test(value) && /[A-Z]/.test(value)) && !isHexOnly(value)) return false;
        if (value.length < 16) return false;
      }
      // Nama berpemisah kata (`fiezel-core-worker-proof`, `puter.auth.token`).
      const segments = value.split(/[-_.\/]/);
      if (segments.length >= 2 && segments.every((s) => s.length <= 15 && /^[A-Za-z0-9]*$/.test(s))) return false;
      if (entropy(value) < 3.2) return false;
      return true;
    }
  }
];

const HARD_IDS = DETECTORS.filter((d) => d.hard).map((d) => d.id);

/* =========================================================================
 * 2. ALLOWLIST BERALASAN
 * ======================================================================= */

/**
 * (a) EKSTENSI BINER. Alasannya bukan "berisik" melainkan "tidak bisa
 *     di-review": tidak ada manusia yang bisa membaca diff .onnx/.woff2, jadi
 *     temuan di sana tidak bisa ditindaklanjuti, dan pola base64/entropi pada
 *     byte acak akan menyala di SETIAP berkas. Sifat binernya DIBUKTIKAN
 *     (byte NUL), tidak dipercaya dari ekstensi: berkas berekstensi biner yang
 *     ternyata teks tetap dipindai penuh.
 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',   // gambar & ikon brand
  '.woff', '.woff2', '.ttf', '.otf', '.eot',                   // font
  '.mp3', '.wav', '.m4a', '.ogg', '.opus',                     // aset suara pelajaran
  '.mp4', '.webm', '.mov',                                     // klip pemasaran
  '.onnx', '.wasm', '.bin', '.pt', '.zip', '.gz', '.pdf'       // model neural & arsip vendor
]);

/**
 * (b) PATH yang dikecualikan dari detektor HEURISTIK saja. Tiap entri wajib
 *     punya alasan, dan tiap entri diperiksa masih relevan (`prefix` harus ada
 *     di repo) supaya daftar ini tidak menjadi fosil.
 *
 *     PENTING: `hard` detector tetap berjalan di sini. Sebuah `ghp_…` atau blok
 *     PEM di dalam `vendor/` tetap memerahkan gerbang.
 */
const HEURISTIC_PATH_ALLOWLIST = [
  {
    prefix: 'vendor/',
    reason: 'Runtime TTS pihak ketiga (sherpa-onnx/supertonic). Glue WASM hasil Emscripten '
      + 'adalah rimba simbol campur huruf-angka panjang (`_SherpaOnnxOfflineTtsNumSpeakers`) '
      + 'dan berkas provenance-nya berisi ribuan digest. Tak satu pun ditulis proyek ini, '
      + 'jadi entropi di sana bukan sinyal kebocoran kita. Integritasnya dijaga terpisah '
      + 'oleh vendor/supertonic-3/provenance/SHA256SUMS.txt + neural-vendor-repro.yml.'
  },
  {
    prefix: 'audio/manifest.json',
    reason: 'Manifest 1.170 objek R2 `a/<sha256>.mp3`. Isinya memang ribuan digest konten '
      + '(alamat aset publik yang sudah dilayani audio.fiezel.my.id) — bukan kredensial. '
      + 'Digest heksa sudah lolos penyaring struktural, entri ini hanya membuat niatnya eksplisit.'
  }
];

/**
 * (c) TOKEN yang dimaafkan satu per satu, DIIDENTIFIKASI LEWAT DIGEST — bukan
 *     lewat nama berkas. Konsekuensinya penting: memaafkan satu fixture TIDAK
 *     memaafkan berkasnya. Kalau besok ada nilai acak KEDUA di
 *     `tests/edge-guard-test.js`, gerbang ini merah.
 *
 * Nilai yang dimaafkan di bawah adalah tiga fixture `tests/edge-guard-test.js`
 * (baris 425-427): tiga bentuk nilai acak yang disuntikkan ke salinan
 * `api-index.php` DI MEMORI untuk membuktikan pemindai gerbang itu bisa merah.
 * Nilainya tidak pernah dipakai runtime, tidak pernah dikirim ke mana pun, dan
 * tidak sama dengan secret produksi mana pun — hidupnya berakhir di variabel
 * lokal. Menghapusnya berarti melumpuhkan bukti anti-vakum gerbang tetangga.
 */
const TOKEN_ALLOWLIST = [
  {
    /* Ditambahkan 4 Sep 2026 (m025-250): fixture kata sandi yang SENGAJA SALAH di
     * tests/auth-account-test.js. Ia dipakai untuk membuktikan login GAGAL mengembalikan
     * `invalid_credentials` — jadi nilainya bermakna justru karena ia BUKAN kredensial
     * siapa pun, dan tidak pernah cocok dengan apa pun di server. Tertangkap pemindai
     * karena berbentuk kata+angka 12 karakter di sebelah kata `password`, yaitu heuristik
     * yang memang benar untuk kasus lain; di sini yang salah adalah kesimpulannya, bukan
     * pemindainya. Nilainya sengaja tidak diobfuskasi: menyamarkan literal supaya lolos
     * pemindai adalah kebiasaan yang jauh lebih berbahaya daripada satu entri beralasan. */
    digest: '49ea0f8ce0190fbe31b5b82e269e2855d50469d9e6f2090beacfe2e50829ce50',
    file: 'tests/auth-account-test.js',
    reason: 'fixture kata sandi yang sengaja SALAH untuk membuktikan login gagal mengembalikan invalid_credentials - bukan kredensial siapa pun, tidak pernah cocok di server'
  },
  {
    /* Ditambahkan 29 Agu 2026: BUKAN token — nama kunci metrik riset simulator
     * (gabungan kata: multiseed + residual + nama metrik osilasi, 45 huruf
     * camelCase+underscore; sengaja TIDAK ditulis utuh di sini supaya berkas gerbang
     * ini sendiri tetap bersih dari pola yang ia pindai) yang dipakai
     * tests/adaptivity-simulation-v3-hardened-test.js untuk mencari entri researchVerdicts.
     * Kata Inggris terbaca, publik di kode simulator, bukan kredensial apa pun. */
    digest: '1a5894c9be9af264ded23d44c30c70548fa8eaa70c9829576cb8731da76936f7',
    file: 'tests/adaptivity-simulation-v3-hardened-test.js',
    reason: 'nama kunci metrik researchVerdicts simulator (multiseed residual oscillation), bukan nilai acak - terbaca sebagai kata, publik di adaptivity-simulation-v3.js'
  },
  {
    /* Ditambahkan 28 Agu 2026: probe anti-vakum gerbang owner-edge-guard. Nilainya acak dan
     * hanya masuk String.replace di memori. Digest didaftarkan PER BERKAS karena pemindai
     * sengaja tidak memaafkan satu digest untuk semua berkas — itu pagar yang benar. */
    digest: '42146fb399e993956e9321d8b7f9ccabece30ad236f762427ab1278f89dd36da',
    file: 'tests/owner-edge-guard-test.js',
    reason: 'probe anti-vakum (d) pada gerbang owner-edge-guard, bentuk base64url — dipakai untuk MEMBUKTIKAN pemindai edge menangkap secret sungguhan, bukan secret produksi'
  },
  {
    /* Ditambahkan 28 Agu 2026: probe anti-vakum gerbang owner-edge-guard. Nilainya acak dan
     * hanya masuk String.replace di memori. Digest didaftarkan PER BERKAS karena pemindai
     * sengaja tidak memaafkan satu digest untuk semua berkas — itu pagar yang benar. */
    digest: 'e428dd01dc1a23a8c03ecb0ed32fd0de40141dbd3213a699a6546dd4c0048ca3',
    file: 'tests/owner-edge-guard-test.js',
    reason: 'probe anti-vakum (d) pada gerbang owner-edge-guard, bentuk base64 ber-padding — dipakai untuk MEMBUKTIKAN pemindai edge menangkap secret sungguhan, bukan secret produksi'
  },
  {
    /* Ditambahkan 28 Agu 2026 saat merge: paket owner (S4) dan paket pemindai (A4) dua-duanya
     * hijau sendiri-sendiri, lalu bertabrakan — fixture ini lahir SESUDAH allowlist ditulis.
     * Nilainya sengaja berprefiks `uji-` dan berakhir pada urutan hex+XYZ yang dapat dibaca
     * manusia: ia mustahil menjadi secret produksi karena EDGE_SECRET sungguhan dihasilkan
     * acak dan hidup HANYA di Worker secret + berkas di luar repo. Sudah diverifikasi
     * terpisah bahwa nol nilai rahasia produksi muncul di repo. */
    digest: 'a818bd4194c88225aa592af4c8dda9a9bde3c0090b6d98694acc49225d74a240',
    file: 'tests/owner-edge-guard-test.js',
    reason: 'fixture EDGE_SECRET baris 168 pada gerbang owner-edge-guard — nilai berlabel `uji-` '
      + 'yang hanya dipakai sebagai header tiruan di memori, bukan secret produksi mana pun'
  },
  {
    digest: 'b12ea51fe4a6fd366faed767c51ae5bb37b6d14778de537ce0e0fb3525589d83',
    file: 'tests/edge-guard-test.js',
    reason: 'fixture (g) baris 425, bentuk base64url — bukti anti-vakum pemindai edge-guard; '
      + 'nilainya hanya masuk String.replace di memori, tidak pernah menjadi secret produksi'
  },
  {
    digest: 'f723530ce7d36692dcdc4aeb5513f8cb4f1a0163e2c0364d8964047dd121d136',
    file: 'tests/edge-guard-test.js',
    reason: 'fixture (g) baris 427, bentuk base64 ber-padding (menyalakan dua detektor sekaligus, '
      + 'satu digest) — bukti anti-vakum pemindai edge-guard, in-memory only'
  }
];
const ALLOWED_DIGESTS = new Map(TOKEN_ALLOWLIST.map((e) => [e.digest, e]));

/* =========================================================================
 * 3. Mesin pemindai
 * ======================================================================= */

function pathAllowlistEntry(relative) {
  return HEURISTIC_PATH_ALLOWLIST.find((entry) => relative === entry.prefix || relative.startsWith(entry.prefix));
}

function lineOf(text, index) { return text.slice(0, index).split('\n').length; }

/** Menyamarkan nilai supaya LAPORAN gerbang ini tidak menjadi kebocoran baru. */
function mask(value) {
  const str = String(value);
  if (str.length <= 8) return '*'.repeat(str.length);
  return str.slice(0, 4) + '…' + str.slice(-2) + ' (len=' + str.length + ', sha256:' + sha256(str).slice(0, 12) + ')';
}

/**
 * @param {string} text isi berkas
 * @param {object} opt { relative, heuristicsOff }
 * @returns {{findings: Array, dismissed: Array}}
 */
function scanText(text, opt) {
  const relative = (opt && opt.relative) || '(fixture)';
  const heuristicsOff = !!(opt && opt.heuristicsOff);
  const findings = [];
  const dismissed = [];
  for (const detector of DETECTORS) {
    if (heuristicsOff && !detector.hard) continue;
    const re = new RegExp(detector.re.source, detector.re.flags.includes('g') ? detector.re.flags : detector.re.flags + 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index === re.lastIndex) re.lastIndex += 1;
      const matched = m[0];
      const groups = m.slice(1);
      if (!detector.refine(matched, groups)) continue;
      const value = detector.id === 'assignedSecretLiteral'
        ? (groups[1] !== undefined ? groups[1] : groups[2])
        : matched;
      const digest = sha256(value);
      const record = {
        detector: detector.id,
        label: detector.label,
        hard: detector.hard,
        file: relative,
        line: lineOf(text, m.index),
        masked: mask(value),
        digest
      };
      const forgiven = ALLOWED_DIGESTS.get(digest);
      if (forgiven && forgiven.file === relative) {
        dismissed.push(Object.assign({ reason: 'token-allowlist: ' + forgiven.reason }, record));
        continue;
      }
      findings.push(record);
    }
  }
  return { findings, dismissed };
}

/* =========================================================================
 * BAGIAN 1 — ANTI-VAKUM: buktikan setiap detektor hidup SEBELUM dipercaya
 * ======================================================================= */
// Semua fixture dibangun dengan penggabungan string supaya berkas ini TIDAK
// memuat literal yang cocok dan bisa memindai dirinya sendiri (bagian 3c).
// Setiap potongan DIJAGA di bawah 32 karakter supaya tidak ada satu pun literal
// di berkas ini yang bisa menyalakan detektor base64url terhadap dirinya sendiri.
const BODY_A = 'Kj29Lm4Qp7Rt5Vw8' + 'Xz1Bc3Df6Gh9Jk2Mn5Pq8St';
const BODY_B = 'Zq83Wm5Tp1Rv7Yx4' + 'Nc2Bd6Fg9Hj0Kl3M';
const B64URL_SAMPLE = 'kQ7zR2vXm9Lp4Tw' + 'Ys7NcBd1FgHj3Kl' + 'MnOpQrStUvWx8';
const B64STD_SAMPLE = 'aGVsbG8rd29ybGQv' + 'c2VjcmV0K3ZhbHVl' + 'PT0xOTg3NjU0Mzk=';
const FIXTURES = [
  { id: 'openaiKey', text: 'const key = "' + 'sk' + '-' + BODY_A + '";' },
  { id: 'stripeKey', text: 'STRIPE=' + 'sk' + '_live_' + '4eC39HqLyjWDar' + 'jtT1zdp7dc' },
  { id: 'githubToken', text: 'token: ' + 'ghp' + '_' + BODY_B },
  { id: 'cloudflareToken', text: 'CF=' + 'cfut' + '_' + BODY_B },
  { id: 'googleApiKey', text: 'gmaps=' + 'AIza' + BODY_A },
  { id: 'jwt', text: 'Authorization: Bearer ' + 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.' + 'eyJzdWIiOiJvd25lciJ9' + '.' + 'Kj29Lm4Qp7Rt5Vw8Xz1Bc' },
  { id: 'pemPrivateKey', text: DASH5 + 'BEGIN RSA PRIVATE KEY' + DASH5 + '\nMIIEow==\n' },
  { id: 'bcryptHash', text: 'owner_hash = "' + '$2b$12$' + 'Kj29Lm4Qp7Rt5Vw8Xz1' + 'Bc3Df6Gh9Jk2Mn5Pq8St' + 'UvWx1Yz4Ab7Cd0Ef' + '"' },
  { id: 'base64urlToken', text: "const EDGE = '" + B64URL_SAMPLE + "';" },
  { id: 'base64Blob', text: 'SECRET="' + B64STD_SAMPLE + '"' },
  { id: 'assignedSecretLiteral', text: 'password=' + 'Xr7$kQ2mLp9Tw4Ys'.replace('$', 'z') }
];

for (const fixture of FIXTURES) {
  const hits = scanText(fixture.text, { relative: '(fixture:' + fixture.id + ')' }).findings;
  check('anti-vakum: detektor `' + fixture.id + '` menyala pada fixture sintetis',
    hits.some((h) => h.detector === fixture.id),
    hits.map((h) => h.detector).join(',') || 'TIDAK ADA TEMUAN');
}
check('anti-vakum: setiap detektor punya fixture', DETECTORS.every((d) => FIXTURES.some((f) => f.id === d.id)),
  DETECTORS.filter((d) => !FIXTURES.some((f) => f.id === d.id)).map((d) => d.id).join(',') || 'lengkap: ' + DETECTORS.length);

// Arah kedua: yang SAH harus tetap hijau. Kalau salah satu dari ini merah,
// gerbang akan membanjiri repo dan dimatikan orang dalam sehari.
const NEGATIVE_FIXTURES = [
  ['placeholder edge', "const EDGE_SECRET = '__EDGE" + "_SECRET__';"],
  ['placeholder wrangler', 'database_id = "<isi setelah: wrangler d1 create fiezel-core>"'],
  ['nama secret tanpa nilai', '#   wrangler secret put SESSION_HMAC_KEY_CURRENT     # penanda cookie fz_id'],
  ['substitusi perintah', 'SECRET="$(openssl rand -base64 32)"'],
  ['rujukan env', 'const secret = process.env.EDGE_SHARED_SECRET;'],
  ['nama pelajaran panjang', '"past_continuous_vs_past_simple_interrupted_action"'],
  ['digest sha256 sah', '"sha256": "3f9a1c7e5b2d8046a1c3e5f7091b2d4c6e8f0a1b2c3d4e5f60718293a4b5c6d7"'],
  ['path panjang', '"vendor/kokoro-js/licenses/HUGGINGFACE-TRANSFORMERS-APACHE-2.txt"'],
  ['identifier CamelCase', 'rawLearnerResponseRequiredForPersistence'],
  ['token pendek', "const TOKEN = 'a1b2c3d4';"]
];
for (const [label, text] of NEGATIVE_FIXTURES) {
  const hits = scanText(text, { relative: '(fixture-negatif)' }).findings;
  check('anti-banjir: konteks sah tidak menyalakan detektor — ' + label, hits.length === 0,
    hits.map((h) => h.detector + '/' + h.masked).join(' | ') || '0');
}

/* =========================================================================
 * BAGIAN 2 — Daftar berkas: yang DILACAK GIT, bukan yang ada di disk
 * ======================================================================= */
// Kenapa git dan bukan walk direktori: yang bisa bocor lewat `git push` adalah
// yang DILACAK. `node_modules/`, worktree agent, dan berkas kerja lokal bukan
// permukaan kebocoran repo — dan memindainya membuat hasil gerbang berbeda
// antar mesin. Gagal memanggil git = FAIL, bukan SKIP (aturan gerbang repo).
let tracked = [];
let gitError = null;
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0').filter(Boolean);
} catch (err) {
  gitError = err && err.message ? err.message : String(err);
}
check('daftar berkas terlacak berhasil dibaca dari git', tracked.length > 100, gitError || (tracked.length + ' berkas'));

const scanned = [];
const skippedBinary = [];
const skippedMissing = [];
const heuristicsOffFiles = [];
const findings = [];
const dismissed = [];

for (const relative of tracked) {
  const abs = path.join(ROOT, relative);
  let buf;
  try { buf = fs.readFileSync(abs); } catch (err) { skippedMissing.push(relative); continue; }
  const ext = path.extname(relative).toLowerCase();
  // Sifat biner DIBUKTIKAN, bukan dipercaya dari ekstensi.
  const probe = buf.subarray(0, 8192);
  const hasNul = probe.includes(0);
  if (hasNul) {
    skippedBinary.push({ file: relative, ext, extensionDeclaredBinary: BINARY_EXTENSIONS.has(ext) });
    continue;
  }
  const allow = pathAllowlistEntry(relative);
  const text = buf.toString('utf8');
  const result = scanText(text, { relative, heuristicsOff: !!allow });
  if (allow) heuristicsOffFiles.push({ file: relative, prefix: allow.prefix });
  scanned.push(relative);
  findings.push(...result.findings);
  dismissed.push(...result.dismissed);
}

check('cakupan pemindaian nyata (>=500 berkas teks terlacak)', scanned.length >= 500, scanned.length + ' berkas teks dipindai');
check('tidak ada berkas terlacak yang hilang dari working tree', skippedMissing.length === 0,
  skippedMissing.join(', ') || '0');

// Berkas biner yang dilewati harus benar-benar biner DAN ekstensinya dikenal.
// Berkas biner berekstensi teks (.js/.json/.md yang mengandung byte NUL) adalah
// anomali yang harus dilihat orang, bukan dilewati diam-diam.
const surpriseBinaries = skippedBinary.filter((s) => !s.extensionDeclaredBinary);
check('setiap berkas biner yang dilewati berekstensi biner yang terdaftar beralasan',
  surpriseBinaries.length === 0,
  surpriseBinaries.map((s) => s.file).join(', ') || skippedBinary.length + ' berkas biner dilewati');

/* --- Allowlist: hidup, beralasan, dan LEMAH secara struktural -------------- */
const allowlistProblems = [];
for (const entry of HEURISTIC_PATH_ALLOWLIST) {
  if (!entry.reason || entry.reason.length < 40) allowlistProblems.push(entry.prefix + ' tanpa alasan yang memadai');
  const exists = tracked.some((f) => f === entry.prefix || f.startsWith(entry.prefix));
  if (!exists) allowlistProblems.push(entry.prefix + ' tidak lagi ada di repo — keluarkan dari daftar');
}
for (const entry of TOKEN_ALLOWLIST) {
  if (!entry.reason || entry.reason.length < 30) allowlistProblems.push(entry.digest.slice(0, 12) + ' tanpa alasan');
  if (!tracked.includes(entry.file)) allowlistProblems.push(entry.file + ' (token-allowlist) tidak ada di repo');
  const stillPresent = dismissed.some((d) => d.digest === entry.digest);
  if (!stillPresent) allowlistProblems.push('digest ' + entry.digest.slice(0, 12) + ' di ' + entry.file
    + ' sudah tidak ada — entri allowlist basi, hapus');
}
check('setiap entri allowlist beralasan, masih relevan, dan tidak basi', allowlistProblems.length === 0,
  allowlistProblems.join(' | ') || (HEURISTIC_PATH_ALLOWLIST.length + ' path + ' + TOKEN_ALLOWLIST.length + ' token'));

// Bukti bahwa allowlist tidak bisa memaafkan rahasia bernilai: detektor keras
// dijalankan ulang pada berkas allowlist dengan satu secret sungguhan disuntikkan.
const hardProofProblems = [];
for (const entry of heuristicsOffFiles) {
  const original = fs.readFileSync(path.join(ROOT, entry.file), 'utf8');
  const poisoned = original + '\n' + 'ghp' + '_' + BODY_B + '\n';
  const hits = scanText(poisoned, { relative: entry.file, heuristicsOff: true }).findings;
  if (!hits.some((h) => h.detector === 'githubToken')) hardProofProblems.push(entry.file);
}
check('allowlist TIDAK mematikan detektor keras (dibuktikan dengan suntikan token GitHub)',
  hardProofProblems.length === 0,
  hardProofProblems.join(', ') || heuristicsOffFiles.length + ' berkas heuristik-off diuji, semua tetap menangkap');
check('detektor keras berjumlah >=6 dan tidak bisa dimatikan allowlist', HARD_IDS.length >= 6, HARD_IDS.join(','));

/* --- Temuan utama --------------------------------------------------------- */
const hardFindings = findings.filter((f) => f.hard);
const softFindings = findings.filter((f) => !f.hard);
check('TIDAK ada pola rahasia keras (kunci ber-prefiks/JWT/PEM/bcrypt) di berkas terlacak',
  hardFindings.length === 0,
  hardFindings.map((f) => f.detector + ' ' + f.file + ':' + f.line + ' ' + f.masked).join(' | ') || '0');
check('TIDAK ada nilai berentropi tinggi / literal secret di luar konteks yang sah',
  softFindings.length === 0,
  softFindings.map((f) => f.detector + ' ' + f.file + ':' + f.line + ' ' + f.masked).join(' | ') || '0');

/* =========================================================================
 * BAGIAN 3 — Pemeriksaan khusus repo ini
 * ======================================================================= */

/* 3a. deploy/edge/*.php WAJIB placeholder, TIDAK BOLEH nilai acak ----------- */
const phpFiles = tracked.filter((f) => f.startsWith('deploy/edge/') && f.endsWith('.php'));
check('ada berkas proxy PHP di deploy/edge/ untuk dijaga (pemeriksaan tidak vakum)',
  phpFiles.length >= 1, phpFiles.join(', ') || 'TIDAK ADA — pemeriksaan placeholder menjadi kosong');
// `api-index.php` disebut namanya karena ia yang benar-benar ada dan yang dipasang
// owner. `owner-index.php` DIHARAPKAN oleh paket kerja ini tetapi TIDAK ADA di
// branch ini (Worker owner belum punya jembatan PHP; ia dipanggil lewat
// workers.dev + OWNER_SUBJECT). Ketiadaannya dicatat sebagai catatan, BUKAN
// sebagai PASS palsu maupun FAIL palsu — dan loop di bawah otomatis menjaganya
// begitu berkasnya muncul.
check('deploy/edge/api-index.php terlacak dan dijaga', phpFiles.includes('deploy/edge/api-index.php'), phpFiles.join(', '));
if (!tracked.includes('deploy/edge/owner-index.php')) {
  notes.push('deploy/edge/owner-index.php TIDAK ADA di branch ini (hanya api-index.php). '
    + 'Pemeriksaan PHP di bagian 3a memakai glob `deploy/edge/*.php`, jadi berkas itu ikut '
    + 'terjaga otomatis begitu dibuat — tidak perlu mengubah gerbang ini.');
}
const phpProblems = [];
for (const file of phpFiles) {
  const php = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (!php.includes('__EDGE' + '_SECRET__')) phpProblems.push(file + ' tidak memuat placeholder __EDGE_SECRET__');
  // Nilai yang menggantikan placeholder akan tertangkap detektor mana pun; di
  // sini bentuk yang paling mungkin salah-tempel diperiksa langsung juga.
  const assign = php.match(/EDGE_SECRET\s*=\s*'([^']*)'/);
  if (assign && assign[1] !== '__EDGE' + '_SECRET__') {
    phpProblems.push(file + ' EDGE_SECRET bukan placeholder lagi: ' + mask(assign[1]));
  }
  const phpHits = scanText(php, { relative: file }).findings;
  if (phpHits.length) phpProblems.push(file + ' memuat pola rahasia: ' + phpHits.map((h) => h.detector).join(','));
}
check('setiap deploy/edge/*.php memuat placeholder dan TIDAK memuat nilai acak panjang',
  phpProblems.length === 0, phpProblems.join(' | ') || phpFiles.length + ' berkas PHP bersih');

// Bukti bahwa pemeriksaan 3a bisa merah: placeholder diganti nilai acak pada
// salinan DI MEMORI (berkas repo tidak disentuh).
const phpRedProof = [];
for (const file of phpFiles) {
  const poisoned = fs.readFileSync(path.join(ROOT, file), 'utf8').replace('__EDGE' + '_SECRET__', B64URL_SAMPLE);
  if (!scanText(poisoned, { relative: file }).findings.some((h) => h.detector === 'base64urlToken')) {
    phpRedProof.push(file);
  }
}
check('pemeriksaan PHP TERBUKTI bisa merah bila placeholder diganti nilai sungguhan',
  phpRedProof.length === 0 && phpFiles.length > 0, phpRedProof.join(', ') || phpFiles.length + ' berkas diuji');

/* 3b. wrangler.toml: NAMA secret, tanpa nilai ------------------------------- */
const tomlFiles = tracked.filter((f) => /wrangler\.toml$/.test(f));
check('berkas wrangler.toml ditemukan untuk dijaga', tomlFiles.length >= 2, tomlFiles.join(', '));
const tomlProblems = [];
let secretNameCount = 0;
for (const file of tomlFiles) {
  const toml = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const hits = scanText(toml, { relative: file }).findings;
  if (hits.length) tomlProblems.push(file + ': ' + hits.map((h) => h.detector + '@' + h.line).join(','));
  // `wrangler secret put NAMA` harus berhenti pada NAMA. Apa pun sesudahnya
  // selain komentar adalah nilai yang ikut ter-commit.
  const re = /wrangler secret put\s+([A-Z0-9_]+)([^\n]*)/g;
  let m;
  while ((m = re.exec(toml)) !== null) {
    secretNameCount += 1;
    const trailing = m[2].trim();
    if (trailing && !trailing.startsWith('#')) {
      tomlProblems.push(file + ': `secret put ' + m[1] + '` diikuti nilai/argumen: ' + mask(trailing));
    }
  }
  // Var biasa yang namanya berbau rahasia tetap harus kosong nilainya.
  const varRe = /^\s*([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PEPPER|PASSWORD)[A-Z0-9_]*)\s*=\s*(.+)$/gm;
  let v;
  while ((v = varRe.exec(toml)) !== null) {
    const raw = v[2].trim().replace(/\s*#.*$/, '').replace(/^["']|["']$/g, '');
    if (!raw) continue;
    if (RE_PLACEHOLDER.test(raw) || RE_SECRET_NAME.test(raw)) continue;
    if (raw.length >= 12 && entropy(raw) >= 3.2 && !/\s/.test(raw)) {
      tomlProblems.push(file + ': var ' + v[1] + ' berisi nilai literal ' + mask(raw));
    }
  }
}
check('wrangler.toml hanya memuat NAMA secret (tanpa satu pun nilai)', tomlProblems.length === 0,
  tomlProblems.join(' | ') || secretNameCount + ' nama secret terdaftar, 0 nilai');
check('daftar nama secret di wrangler.toml masih ada (dokumentasi tidak hilang)', secretNameCount >= 8,
  secretNameCount + ' baris `wrangler secret put`');

/* 3c. Gerbang ini memindai dirinya sendiri --------------------------------- */
// Berkas ini memuat pola rahasia sebagai REGEX dan fixture sebagai
// PENGGABUNGAN string. Kalau suatu hari seseorang menempel nilai sungguhan ke
// sini, pemindaian-diri di bawah memerahkannya.
const selfHits = scanText(fs.readFileSync(__filename, 'utf8'), { relative: SELF }).findings;
check('gerbang ini sendiri tidak memuat nilai rahasia (fixture digabung, bukan literal)',
  selfHits.length === 0, selfHits.map((h) => h.detector + '@' + h.line).join(', ') || '0');

/* =========================================================================
 * BAGIAN 4 — Higiene git: .gitignore, artefak konflik, .env
 * ======================================================================= */
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
const gitignoreLines = gitignore.split('\n').map((l) => l.trim());
const hasIgnore = (pattern) => gitignoreLines.includes(pattern);

// Berkas laporan yang isinya BERGANTUNG LINGKUNGAN: base URL Worker, hasil
// audit mesin, kunci push. Men-commit-nya menghasilkan "hijau milik orang lain"
// dan, untuk push-secrets*, kebocoran langsung.
const REQUIRED_IGNORES = [
  ['.env', 'berkas env lokal — bentuk kebocoran secret nomor satu'],
  ['.env.*', 'varian per-lingkungan (.env.production dll.)'],
  ['push-secrets*.json', 'kunci push hasil generate-push-secrets.mjs'],
  ['push-secrets*.txt', 'bentuk teks kunci push'],
  ['fiezel-autonomy-config.json', 'config otonomi berisi token/nilai per lingkungan'],
  ['CF-LIVE-REPORT.json', 'laporan cf-live-contract-test — isinya base URL Worker + hasil per lingkungan'],
  ['CF-SHADOW-MODE-REPORT.json', 'laporan shadow mode — bergantung deployment yang ditembak'],
  ['RELEASE-AUDIT-GATE-REPORT.json', 'laporan audit rilis — bergantung mesin/jam yang menjalankannya'],
  ['FINAL-AUDIT-REPORT.json', 'audit akhir per mesin'],
  ['*.bak', 'salinan editor sering berisi versi berkas yang belum disunting placeholder-nya']
];
const missingIgnores = REQUIRED_IGNORES.filter(([pattern]) => !hasIgnore(pattern)).map(([p, why]) => p + ' (' + why + ')');
check('.gitignore memuat berkas laporan bergantung-lingkungan dan berkas bawa-secret',
  missingIgnores.length === 0, missingIgnores.join(' | ') || REQUIRED_IGNORES.length + ' pola hadir');

// Artefak merge/patch/backup yang TERLACAK. `*.orig` dan `*.rej` adalah salinan
// utuh versi lain dari sebuah berkas: kalau berkas aslinya pernah memuat secret
// yang sudah dibersihkan, salinan inilah yang mempertahankannya.
const conflictArtifacts = tracked.filter((f) => /\.(bak|orig|rej|save|swp|~)$/i.test(f));
check('tidak ada artefak *.bak/*.orig/*.rej/*.save yang terlacak git', conflictArtifacts.length === 0,
  conflictArtifacts.join(', ') || '0');
check('.gitignore juga mengabaikan *.orig dan *.rej', hasIgnore('*.orig') && hasIgnore('*.rej'),
  '*.orig=' + hasIgnore('*.orig') + ' *.rej=' + hasIgnore('*.rej'));

// Berkas .env terlacak. Termasuk bentuk berprefiks direktori dan varian
// `.env.production`, tetapi BUKAN `.env.example` (contoh tanpa nilai) — dan
// contoh itu pun tetap dipindai isinya oleh bagian 2.
const envTracked = tracked.filter((f) => {
  const base = path.basename(f);
  if (!/^\.env(\..*)?$/.test(base)) return false;
  return !/\.(example|sample|template|dist)$/.test(base);
});
check('tidak ada berkas .env yang terlacak git', envTracked.length === 0, envTracked.join(', ') || '0');

/* =========================================================================
 * BAGIAN 5 — Gerbang ini terdaftar di CI dan punya catatan
 * ======================================================================= */
// Gerbang yang tidak dijalankan workflow apa pun adalah gerbang yang tidak ada
// (temuan K13, reports/cf-c1-konsistensi.md).
const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/quality.yml'), 'utf8');
check('gerbang ini terdaftar di .github/workflows/quality.yml',
  /node tests\/secret-scan-test\.js/.test(workflow), 'quality.yml');

// Batas kejujuran §(a) harus tertulis di tempat yang dibaca manusia, bukan hanya
// di komentar berkas ini.
const NOTES_PATH = 'reports/add-a4-secret-scan.md';
const notesExists = tracked.includes(NOTES_PATH) || fs.existsSync(path.join(ROOT, NOTES_PATH));
check('catatan gerbang ada di ' + NOTES_PATH, notesExists, String(notesExists));
if (notesExists) {
  const md = fs.readFileSync(path.join(ROOT, NOTES_PATH), 'utf8');
  check('catatan memuat batas kejujuran + perintah manual pemindaian riwayat untuk owner',
    /riwayat/i.test(md) && /git log/.test(md) && /rev-list/.test(md),
    'riwayat=' + /riwayat/i.test(md) + ' git-log=' + /git log/.test(md) + ' rev-list=' + /rev-list/.test(md));
}

notes.push('BATAS: gerbang ini memindai ISI BERKAS TERLACAK pada working tree, BUKAN riwayat commit. '
  + 'Berkas yang bersih hari ini bisa memuat secret di commit sebelumnya dan itu TIDAK terlihat di sini.');
notes.push('PERINTAH MANUAL untuk owner (jalankan lokal, bukan di CI — mahal): '
  + '`git log -p --all -S "__EDGE_SECRET__" -- deploy/edge` untuk melihat kapan placeholder berubah; '
  + '`git rev-list --all | while read c; do git grep -nIE "(sk-|ghp_|cfut_|AIza|eyJ[A-Za-z0-9_-]{10,}\\.)" $c || true; done` '
  + 'untuk memindai semua commit; dan `git rev-list --objects --all | git cat-file --batch-check` untuk blob besar tak terlacak.');
notes.push('PEMULIHAN kalau riwayat memang memuat secret: ROTASI DULU (wrangler secret put ulang + suntik ulang '
  + 'nilai baru ke deploy/edge/*.php), baru pertimbangkan penulisan-ulang riwayat (git filter-repo). Rotasi menutup '
  + 'kebocoran; penulisan-ulang riwayat hanya membersihkan jejak, dan salinan fork/clone tetap memegang yang lama.');
notes.push('BATAS: pola tidak bisa menemukan rahasia tanpa bentuk (kata sandi pendek mirip kata biasa, '
  + 'nilai yang dipecah menjadi potongan). Berkas biner dilewati setelah dibuktikan biner lewat byte NUL.');

/* =========================================================================
 * LAPORAN
 * ======================================================================= */
const report = {
  schema: 'fiezel-secret-scan-v1',
  generatedAt: new Date().toISOString(),
  pass: failed === 0,
  scope: {
    source: 'git ls-files (berkas terlacak, working tree)',
    trackedTotal: tracked.length,
    textScanned: scanned.length,
    binarySkipped: skippedBinary.length,
    heuristicsOffFiles: heuristicsOffFiles.map((f) => f.file),
    historyScanned: false
  },
  detectors: DETECTORS.map((d) => ({ id: d.id, hard: d.hard, label: d.label, why: d.why })),
  allowlist: {
    binaryExtensions: [...BINARY_EXTENSIONS],
    heuristicPaths: HEURISTIC_PATH_ALLOWLIST,
    tokens: TOKEN_ALLOWLIST.map((t) => ({ file: t.file, digest: t.digest.slice(0, 16) + '…', reason: t.reason })),
    rule: 'allowlist hanya mematikan detektor heuristik; detektor keras (' + HARD_IDS.join(', ') + ') selalu berjalan'
  },
  findings,
  dismissed: dismissed.map((d) => ({ file: d.file, line: d.line, detector: d.detector, reason: d.reason })),
  counts: {
    pass: checks.filter((c) => c.status === 'PASS').length,
    fail: failed,
    findings: findings.length,
    dismissed: dismissed.length
  },
  notes,
  checks
};
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

for (const c of checks) if (c.status === 'FAIL') console.error('FAIL: ' + c.name + ' — ' + c.detail);
for (const f of findings) console.error('TEMUAN: ' + f.detector + ' ' + f.file + ':' + f.line + ' ' + f.masked);
console.log('secret-scan-test: ' + report.counts.pass + '/' + checks.length + ' assert PASS, '
  + scanned.length + ' berkas teks dipindai, ' + skippedBinary.length + ' biner dilewati, '
  + findings.length + ' temuan, ' + dismissed.length + ' dimaafkan beralasan');
if (failed) {
  console.error('secret-scan-test GAGAL: ' + failed + ' assert merah');
  process.exit(1);
}
