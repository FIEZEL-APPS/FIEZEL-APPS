/**
 * workers/api/rate-anon.js — pembatas laju PENERBITAN identitas anonim
 * (`POST /api/auth/anon`). Menutup temuan audit D3 HIGH-2.
 *
 * ==========================================================================
 * MASALAH NYATA YANG DITUTUP BERKAS INI
 * ==========================================================================
 * Sebelum berkas ini ada, setiap `POST /api/auth/anon` tanpa cookie sah selalu
 * menerbitkan identitas baru: tulis D1 (`identity`) per panggilan, dan setiap
 * identitas baru membawa jatah gratisnya sendiri (25 AI/hari, 12.000 char
 * TTS/hari). Skrip yang membuang cookie tiap iterasi bisa (a) mengisi D1 plan
 * gratis sampai penuh, dan (b) memanen identitas segar untuk memutar jatah
 * AI/TTS tanpa batas efektif. Gerbang edge (`mw-edge.js`) menutup jalur
 * `*.workers.dev`, tetapi jalur resmi lewat jembatan `api.fiezel.my.id` tetap
 * terbuka untuk loop yang sama — karena itu penerbitan sendiri harus dibatasi.
 *
 * ==========================================================================
 * APA YANG DIBATASI — PENERBITAN, BUKAN PANGGILAN
 * ==========================================================================
 * Murid dengan cookie `fz_id` yang sah TIDAK pernah kena batas ini: panggilan
 * ber-cookie tidak menerbitkan identitas baru (invarian "identitas stabil"
 * yang sudah dijaga gerbang). Yang dihitung hanya kejadian yang benar-benar
 * akan memanggil `issueAnonIdentity()`.
 *
 * ==========================================================================
 * PENYIMPANAN: TABEL D1 `anon_issue` — BUKAN KV, DAN INI KEPUTUSAN, BUKAN SELERA
 * ==========================================================================
 * Dua alasan yang bisa diperiksa:
 *   1. Invarian repo (dijaga cf-api-contract-test §3): jalur penerbitan NOL
 *      tulis KV — plan gratis hanya punya 1.000 tulis KV/hari, dan penghitung
 *      per-penerbitan akan membakarnya. D1 plan gratis punya 100.000 tulis/hari.
 *   2. Tabel `anon_issue (day, ip_hmac, issued)` SUDAH disiapkan migrasi
 *      `0001_identity.sql` persis untuk ini ("rem penerbitan identitas anonim
 *      per IP ter-HMAC") dan belum pernah dipakai. Berkas ini mengaktifkannya.
 * Biaya per penerbitan: +1 SELECT + 1 UPSERT D1 (penolakan: +1 SELECT saja,
 * nol tulis). Baris berukuran puluhan byte dan bertumbuh maksimal (jumlah
 * ember jam) x (jumlah ip_hmac unik) — di belakang jembatan itu <= 24 baris
 * per hari. Pembersihan baris lama boleh dititip cron; tidak dilakukan di
 * jalur panas supaya penerbitan tetap murah.
 *
 * Fallback: bila `CORE_DB` absen atau melempar, dipakai Map per isolate.
 * Lebih lemah (isolate lain = ember lain) tetapi tetap mematahkan loop satu
 * koneksi — dan ketersediaan menang di jalur degradasi: D1 yang rusak tidak
 * boleh mematikan penerbitan identitas murid.
 *
 * ==========================================================================
 * KUNCI PENGHITUNG: HMAC(IP) BERSALT HARIAN, BUKAN IP MENTAH
 * ==========================================================================
 * IP mentah tidak pernah disimpan (kontrak privasi: `ip` ada di
 * PII_FORBIDDEN_KEYS). `ip_hmac` = HMAC-SHA256(IDENTITY_PEPPER,
 * "<indeks-hari>|<ip>") dipotong 128 bit — indeks hari ikut ditandatangani
 * supaya hash TIDAK bisa dipakai melacak orang antar hari, mengikuti komentar
 * desain tabelnya di `0001_identity.sql`. Tanpa `IDENTITY_PEPPER`, dipakai
 * garam konstanta — masih hash satu arah, hanya tidak ber-pepper; pasang
 * secret-nya.
 *
 * ==========================================================================
 * DUA TARIF, DAN ALASANNYA (batas jembatan)
 * ==========================================================================
 * Proxy PHP jembatan (`deploy/edge/api-index.php`) SENGAJA tidak meneruskan IP
 * murid (keputusan privasi di berkas itu). Akibatnya semua murid yang lewat
 * jembatan terlihat sebagai SATU IP (server origin). Batas 5/jam pada IP itu
 * akan mematikan onboarding semua murid sekaligus. Karena itu:
 *   - pemanggil TANPA gerbang edge terpasang (dev/lokal): 5/jam per IP
 *     (`ANON_ISSUE_LIMIT_PER_HOUR`, default 5);
 *   - pemanggil di belakang gerbang edge yang AKTIF (= semua lalu lintas
 *     produksi lewat jembatan, satu IP bersama): 30/jam TOTAL
 *     (`ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR`, default 30). Ini bukan batas
 *     per-murid — ini anggaran penerbitan global yang membatasi pertumbuhan
 *     D1 ke maksimum 720 identitas/hari. Granularitas per-murid di belakang
 *     jembatan MUSTAHIL tanpa meneruskan IP; untuk kontrol lebih halus pasang
 *     WAF rate-rule Cloudflare pada `POST /api/auth/anon` (tersedia di plan
 *     gratis) — lihat saran D3 HIGH-2.
 * Nilai `<= 0` pada var mematikan pembatas secara eksplisit (jangan lakukan di
 * produksi). Penghitungnya BUKAN compare-and-swap (baca-lalu-tulis), jadi dua
 * permintaan serentak bisa sedikit melewati batas — batas ini rem banjir,
 * bukan invarian akuntansi, dan kelebihannya paling banyak selebar burst.
 *
 * ==========================================================================
 * JITTER RESPONS
 * ==========================================================================
 * `anonJitter()` menunda respons rute anon 0..`ANON_JITTER_MAX_MS` (default
 * 150 ms, acak). Dua tujuan: (1) loop pemanen identitas tidak bisa memakai
 * waktu respons yang rata untuk memaksimalkan laju; (2) perbedaan waktu antara
 * "terbit" / "cookie stabil" / "ditolak" jadi lebih sulit dijadikan oracle.
 * `Math.random` di sini BUKAN untuk nilai keamanan (bukan token/secret) —
 * hanya penundaan; token identitas tetap `crypto.randomUUID()` di
 * `mw-identity.js`.
 */

import { jsonError, ERR } from './errors.js';
import { hmacHex, truncate128 } from './util-hmac.js';
import { edgeSecret } from './mw-edge.js';

const HOUR_MS = 3600000;
const DAY_MS = 86400000;
export const ANON_ISSUE_LIMIT_DEFAULT = 5;
export const ANON_ISSUE_LIMIT_BRIDGE_DEFAULT = 30;
export const ANON_JITTER_MAX_MS_DEFAULT = 150;

/** Garam fallback bila IDENTITY_PEPPER belum dipasang. BUKAN secret — hanya
 *  memastikan IP tidak pernah tersimpan mentah bahkan di mode degradasi. */
const FALLBACK_SALT = 'fiezel-anon-issue-v1';

function limitNumber(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

/** Batas untuk permintaan ini. Gerbang edge aktif = semua pemanggil sah lewat
 *  jembatan (satu IP bersama) -> tarif jembatan. */
export function anonIssueLimit(env) {
  return edgeSecret(env)
    ? limitNumber(env.ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR, ANON_ISSUE_LIMIT_BRIDGE_DEFAULT)
    : limitNumber(env.ANON_ISSUE_LIMIT_PER_HOUR, ANON_ISSUE_LIMIT_DEFAULT);
}

/** IP pemanggil sebagaimana terlihat Cloudflare. 'noip' untuk harness/lokal. */
export function clientIpOf(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
  return ip.trim() || 'noip';
}

/** Ember jam, lebar tetap supaya bisa dibandingkan leksikografis saat cron
 *  membersihkan baris lama (`WHERE day < ?`). */
function hourBucket(nowMs) {
  return 'h' + String(Math.floor(nowMs / HOUR_MS)).padStart(10, '0');
}

async function ipHmacOf(env, ip, nowMs) {
  const pepper = (typeof env.IDENTITY_PEPPER === 'string' && env.IDENTITY_PEPPER.trim())
    ? env.IDENTITY_PEPPER
    : FALLBACK_SALT;
  // Indeks hari ikut ditandatangani: hash hari ini != hash besok untuk IP yang
  // sama, jadi tabel ini tidak bisa dipakai melacak orang antar hari
  // (komentar desain anon_issue di migrations/0001_identity.sql).
  return truncate128(await hmacHex(pepper, Math.floor(nowMs / DAY_MS) + '|' + ip));
}

/* Fallback per isolate. Map kecil: kunci ember jam, dipangkas tiap panggilan
 * supaya tidak tumbuh tanpa batas di isolate yang berumur panjang. */
const memoryBuckets = new Map();

export function resetAnonRateLimitForTests() {
  memoryBuckets.clear();
}

function pruneMemory(nowMs) {
  const current = hourBucket(nowMs);
  for (const key of memoryBuckets.keys()) {
    if (!key.startsWith(current)) memoryBuckets.delete(key);
  }
}

function rejectIssue(ctx) {
  const retryAfter = Math.max(1, Math.ceil((HOUR_MS - (ctx.now % HOUR_MS)) / 1000));
  // Bentuk galat dari errors.js (satu tabel bentuk galat — aturan keras repo).
  // `retryAfter` non-sensitif; header Retry-After ikut supaya klien non-FIEZEL
  // yang patuh HTTP juga melambat.
  return jsonError(429, ERR.RATE_LIMITED, { retryAfter }, {
    headers: { ...(ctx.corsHeaders || {}), 'retry-after': String(retryAfter) }
  });
}

/**
 * Gerbang penerbitan. Panggil HANYA pada jalur yang akan menerbitkan identitas
 * baru (bukan pada panggilan ber-cookie sah). Mengembalikan Response 429 =
 * tolak; `null` = penerbitan boleh jalan (dan sudah terhitung).
 */
export async function anonIssueGate(ctx) {
  const limit = anonIssueLimit(ctx.env);
  if (limit <= 0) return null; // dimatikan eksplisit lewat var — bukan default
  const bucket = hourBucket(ctx.now);
  const hashed = await ipHmacOf(ctx.env, clientIpOf(ctx.request), ctx.now);

  if (ctx.env.CORE_DB) {
    try {
      const row = await ctx.env.CORE_DB
        .prepare('SELECT issued FROM anon_issue WHERE day = ?1 AND ip_hmac = ?2')
        .bind(bucket, hashed)
        .first();
      const issued = Number(row && row.issued) || 0;
      if (issued >= limit) return rejectIssue(ctx); // penolakan: nol tulis
      await ctx.env.CORE_DB
        .prepare(
          'INSERT INTO anon_issue (day, ip_hmac, issued) VALUES (?1, ?2, 1) ' +
          'ON CONFLICT(day, ip_hmac) DO UPDATE SET issued = issued + 1'
        )
        .bind(bucket, hashed)
        .run();
      return null;
    } catch {
      // D1 rusak / tabel belum termigrasi: jatuh ke memori. Ketersediaan
      // penerbitan menang atas presisi lintas-isolate di jalur degradasi.
    }
  }

  pruneMemory(ctx.now);
  const memoryKey = bucket + ':' + hashed;
  const current = memoryBuckets.get(memoryKey) || 0;
  if (current >= limit) return rejectIssue(ctx);
  memoryBuckets.set(memoryKey, current + 1);
  return null;
}

/**
 * Jitter respons rute anon. Dipanggil untuk SEMUA respons rute itu (terbit,
 * stabil, maupun 429) supaya penundaan sendiri tidak menjadi oracle.
 * `ANON_JITTER_MAX_MS = "0"` mematikannya (harness yang butuh determinisme).
 */
export async function anonJitter(env) {
  const max = limitNumber(env && env.ANON_JITTER_MAX_MS, ANON_JITTER_MAX_MS_DEFAULT);
  if (max <= 0) return;
  const ms = Math.floor(Math.random() * (max + 1));
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}
