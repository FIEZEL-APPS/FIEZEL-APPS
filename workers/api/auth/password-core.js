/**
 * workers/api/auth/password-core.js — kata sandi FIEZEL: turunan kunci, verifikasi,
 * kebijakan kekuatan. MURNI (nol D1, nol env, nol Date.now) supaya bisa diuji di Node.
 *
 * ==========================================================================
 * KENAPA PBKDF2-HMAC-SHA256 DAN BUKAN ARGON2/BCRYPT
 * ==========================================================================
 * Worker ini berjalan di Cloudflare Workers PLAN GRATIS dan repo ini melarang
 * dependency runtime (alasan lengkap di kepala `workers/api/index.js`). Argon2id
 * dan bcrypt keduanya butuh WASM/native yang harus di-`npm install` ke jalur
 * produksi — jalur yang dilarang. Yang TERSEDIA di WebCrypto Workers, dan juga
 * di Node 22 (`globalThis.crypto.subtle`, jadi gerbang menguji fungsi YANG SAMA
 * yang dipakai produksi, bukan tiruan), hanya PBKDF2.
 *
 * Konsekuensi yang diterima dengan sadar dan WAJIB dibaca sebelum menurunkan
 * angka: PBKDF2 lemah terhadap penyerang ber-GPU dibanding Argon2id. Karena itu
 * iterasinya disetel SETINGGI YANG RUNTIME IZINKAN — 100.000, batas keras
 * WebCrypto Workers (rinciannya di blok PBKDF2 di bawah; OWASP 2023 menganjurkan
 * 210.000, tetapi angka itu MELEMPAR di produksi, jadi tidak tersedia). Ini
 * anggaran CPU nyata di plan gratis: ±40-60 ms per login. Itu SENGAJA — login
 * bukan jalur panas, dan rate limit per identitas menahan penyerang dari
 * membelanjakan CPU kita.
 *
 * KENAPA BUKAN "hash di klien": hash klien MENJADI kata sandi. Bocornya tabel
 * berarti login langsung, dan itu justru yang mau dicegah. Turunan kunci HARUS
 * terjadi di server, atas kata sandi mentah yang tidak pernah ditulis ke mana pun.
 *
 * ==========================================================================
 * BENTUK TERSIMPAN
 * ==========================================================================
 *   pbkdf2$<iterasi>$<salt b64url>$<turunan b64url>
 * Ber-versi lewat awalan algoritma supaya menaikkan iterasi (atau pindah ke
 * Argon2id kalau nanti tersedia tanpa npm) bisa dilakukan TANPA memaksa semua
 * murid reset: `verifyPassword` menerima bentuk lama, dan `needsRehash` memberi
 * tahu pemanggil untuk menulis ulang dengan parameter baru SAAT login berhasil —
 * satu-satunya saat kata sandi mentah ada di memori.
 *
 * LARANGAN KERAS: kata sandi mentah TIDAK PERNAH masuk log, analytics, pesan
 * galat, atau kolom D1 mana pun. Modul ini tidak punya satu pun `console.*` dan
 * itu disengaja.
 */

/**
 * Parameter aktif. Menaikkan ITERATIONS aman DARI SISI MIGRASI (`needsRehash`
 * menangani hash lama), tetapi TIDAK BOLEH melewati `PBKDF2_MAX_ITERATIONS`.
 *
 * ==========================================================================
 * KENAPA 100.000 DAN BUKAN 210.000 — TEMUAN PRODUKSI 3 Sep 2026
 * ==========================================================================
 * Nilai sebelumnya 210.000 (rekomendasi OWASP 2023) dan lolos semua tes lokal,
 * karena Node menjalankan PBKDF2 tanpa batas iterasi. Di PRODUKSI, setiap
 * `POST /api/account/register` menjawab 500 dengan pengecualian dari runtime:
 *
 *     NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not
 *     supported (requested 210000).
 *
 * Ini BATAS KERAS WebCrypto di Cloudflare Workers, bukan batas CPU dan bukan
 * sesuatu yang bisa dinaikkan lewat konfigurasi, plan, atau flag. Jadi angka
 * di sini bukan pilihan keamanan yang bisa ditawar ke atas: 100.000 adalah
 * langit-langit platform, dan hash apa pun di atasnya TIDAK PERNAH berhasil
 * dibuat — bukan "lebih lambat", melainkan 500 di setiap pendaftaran.
 *
 * Konsekuensi yang harus diketahui pembaca berikutnya:
 *   - `needsRehash()` membandingkan `iterations < PBKDF2.ITERATIONS`. Menurunkan
 *     angka ini membuat hash 210.000 lama TIDAK ditandai perlu rehash — dan itu
 *     benar, karena hash begitu memang tidak pernah bisa ada di produksi
 *     (penerbitannya selalu gagal sebelum tersimpan);
 *   - kalau suatu hari Workers menaikkan batasnya, naikkan `PBKDF2_MAX_ITERATIONS`
 *     LEBIH DULU, baru `ITERATIONS`. Tes `auth-role-test.js` menjaga urutan itu.
 */
export const PBKDF2_MAX_ITERATIONS = 100000;

export const PBKDF2 = Object.freeze({
  ALGO: 'pbkdf2',
  ITERATIONS: 100000,
  SALT_BYTES: 16,
  DERIVED_BYTES: 32,
  HASH: 'SHA-256'
});

/**
 * Batas minimum yang ditegakkan SERVER. Klien boleh menampilkan meter kekuatan,
 * tetapi keputusan ada di sini — bab 28 "jangan pernah percaya otorisasi klien"
 * berlaku juga untuk validasi.
 *
 * MAX_LENGTH ada bukan untuk keamanan melainkan untuk anggaran CPU: PBKDF2 atas
 * masukan 1 MB adalah DoS gratis bagi penyerang. 200 char jauh di atas kebutuhan
 * frasa sandi mana pun.
 */
export const PASSWORD_RULES = Object.freeze({
  MIN_LENGTH: 10,
  MAX_LENGTH: 200,
  MIN_CLASSES: 2
});

/** Alasan penolakan — enum tertutup, dipetakan ke i18n di klien. */
export const PASSWORD_PROBLEM = Object.freeze({
  EMPTY: 'password_empty',
  TOO_SHORT: 'password_too_short',
  TOO_LONG: 'password_too_long',
  TOO_SIMPLE: 'password_too_simple',
  COMMON: 'password_common'
});

/**
 * Daftar sangat pendek kata sandi yang paling sering dipakai. BUKAN pengganti
 * daftar bocoran jutaan baris — memuat daftar itu di Worker berarti megabyte
 * bundle per isolate dingin. Yang ini menangkap kasus yang benar-benar dipakai
 * murid pada menit pertama pendaftaran, dan itu tujuannya.
 */
const COMMON_PASSWORDS = Object.freeze(new Set([
  'password123', 'qwerty12345', '12345678901', 'iloveyou123', 'admin12345',
  'welcome1234', 'letmein1234', 'passw0rd123', 'fiezel12345', 'abcd12345678'
]));

/** Kelas karakter yang dihitung untuk MIN_CLASSES. */
function characterClasses(password) {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^a-zA-Z0-9]/.test(password)) classes += 1;
  return classes;
}

/**
 * checkPasswordPolicy(raw) -> null (lolos) | { problem, min? }
 * Mengembalikan ALASAN, bukan kalimat: naskahnya milik lapisan i18n.
 */
export function checkPasswordPolicy(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return { problem: PASSWORD_PROBLEM.EMPTY };
  if (raw.length < PASSWORD_RULES.MIN_LENGTH) {
    return { problem: PASSWORD_PROBLEM.TOO_SHORT, min: PASSWORD_RULES.MIN_LENGTH };
  }
  if (raw.length > PASSWORD_RULES.MAX_LENGTH) {
    return { problem: PASSWORD_PROBLEM.TOO_LONG, max: PASSWORD_RULES.MAX_LENGTH };
  }
  if (COMMON_PASSWORDS.has(raw.toLowerCase())) return { problem: PASSWORD_PROBLEM.COMMON };
  if (characterClasses(raw) < PASSWORD_RULES.MIN_CLASSES) {
    return { problem: PASSWORD_PROBLEM.TOO_SIMPLE, minClasses: PASSWORD_RULES.MIN_CLASSES };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* base64url — tanpa padding, aman untuk kolom TEXT dan untuk mata manusia.    */
/* -------------------------------------------------------------------------- */

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const padded = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Perbandingan waktu-tetap. `===` atas string membocorkan panjang prefiks yang
 * cocok lewat waktu, dan verifikasi kata sandi adalah tempat kebocoran itu
 * benar-benar bisa dieksploitasi.
 */
export function constantTimeEqual(a, b) {
  const left = String(a);
  const right = String(b);
  // Panjang dibandingkan TANPA short-circuit: XOR panjang ikut masuk akumulator,
  // jadi "panjang beda" tidak keluar lebih cepat daripada "isi beda".
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function subtleOf() {
  const webcrypto = globalThis.crypto;
  if (!webcrypto || !webcrypto.subtle) {
    throw new Error('webcrypto_unavailable');
  }
  return webcrypto;
}

async function derive(password, salt, iterations) {
  const webcrypto = subtleOf();
  const key = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: PBKDF2.HASH },
    key,
    PBKDF2.DERIVED_BYTES * 8
  );
  return new Uint8Array(bits);
}

/**
 * hashPassword(raw, opts) -> 'pbkdf2$<iter>$<salt>$<derived>'
 * `opts.salt` hanya untuk gerbang (vektor tetap). Produksi SELALU acak.
 */
export async function hashPassword(raw, opts = {}) {
  const problem = checkPasswordPolicy(raw);
  if (problem) throw Object.assign(new Error('password_policy'), problem);
  // Dijepit ke langit-langit platform (lihat PBKDF2_MAX_ITERATIONS): pemanggil
  // yang meminta lebih tinggi mendapat hash yang BISA dibuat, bukan 500.
  const asked = Number(opts.iterations) > 0 ? Number(opts.iterations) : PBKDF2.ITERATIONS;
  const iterations = Math.min(asked, PBKDF2_MAX_ITERATIONS);
  const salt = opts.salt instanceof Uint8Array
    ? opts.salt
    : subtleOf().getRandomValues(new Uint8Array(PBKDF2.SALT_BYTES));
  const derived = await derive(raw, salt, iterations);
  return `${PBKDF2.ALGO}$${iterations}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

/** parseStored(stored) -> { algo, iterations, salt, derived } | null (bentuk rusak) */
export function parseStored(stored) {
  if (typeof stored !== 'string') return null;
  const parts = stored.split('$');
  if (parts.length !== 4) return null;
  const [algo, iterationsRaw, saltRaw, derivedRaw] = parts;
  if (algo !== PBKDF2.ALGO) return null;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > 5000000) return null;
  try {
    return { algo, iterations, salt: fromBase64Url(saltRaw), derived: derivedRaw };
  } catch {
    return null;
  }
}

/**
 * verifyPassword(raw, stored) -> boolean
 *
 * TIDAK PERNAH melempar untuk masukan buruk: baris D1 yang rusak, kolom NULL,
 * atau kata sandi kosong semuanya menjawab `false`. Melempar di sini akan
 * mengubah "hash rusak" menjadi 500 yang membedakan akun yang ada dari yang
 * tidak — persis oracle yang `errors.js` larang.
 */
export async function verifyPassword(raw, stored) {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  if (raw.length > PASSWORD_RULES.MAX_LENGTH) return false;
  const parsed = parseStored(stored);
  if (!parsed) return false;
  let derived;
  try {
    derived = await derive(raw, parsed.salt, parsed.iterations);
  } catch {
    return false;
  }
  return constantTimeEqual(toBase64Url(derived), parsed.derived);
}

/**
 * needsRehash(stored) -> boolean. Dipanggil HANYA sesudah verifikasi berhasil,
 * saat kata sandi mentah masih ada di memori dan bisa di-hash ulang gratis.
 */
export function needsRehash(stored) {
  const parsed = parseStored(stored);
  if (!parsed) return true;
  return parsed.iterations < PBKDF2.ITERATIONS;
}
