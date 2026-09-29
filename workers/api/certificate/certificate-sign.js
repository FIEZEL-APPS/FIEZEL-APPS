/**
 * workers/api/certificate/certificate-sign.js — IDENTITAS & TANDA TANGAN SERTIFIKAT.
 *
 * ==========================================================================
 * KENAPA ID PENDEK + CATATAN DI DB, BUKAN TOKEN MANDIRI
 * ==========================================================================
 * Sertifikat diverifikasi oleh MANUSIA yang tidak punya hubungan apa pun dengan FIEZEL —
 * staf HRD yang memegang lembar lamaran, panitia pendaftaran kampus. Mereka MENGETIK kode
 * itu ke halaman verifikasi, atau memindai QR lalu membandingkan yang tertera.
 *
 * Token mandiri bergaya JWT (seluruh data + tanda tangan dikemas di dalam ID) tidak butuh
 * database, tetapi panjangnya ratusan karakter: mustahil diketik, mustahil dibacakan lewat
 * telepon, dan TIDAK BISA DICABUT. Sertifikat yang tidak bisa dicabut adalah masalah nyata:
 * asesmen yang belakangan terbukti curang akan hidup selamanya.
 *
 * Maka bentuknya: ID PENDEK yang bisa diketik (FZ-XXXX-XXXX) + catatan bertanda tangan di
 * database. Tanda tangan tetap wajib meski datanya ada di DB kita sendiri — ia menutup
 * kasus di mana seseorang menulis langsung ke tabel tanpa lewat jalur penerbitan. Catatan
 * tanpa tanda tangan sah TIDAK PERNAH diverifikasi, dari mana pun asalnya.
 *
 * ==========================================================================
 * ALFABET ID: KESALAHAN KETIK ADALAH KASUS NORMAL
 * ==========================================================================
 * 0/O, 1/I/L, 5/S, 8/B tidak bisa dibedakan pada banyak cetakan dan tulisan tangan.
 * Semuanya dibuang. Yang tersisa 27 simbol — tiap karakter ~4,75 bit, 8 karakter ~38 bit.
 *
 * ID ini IDENTITAS, BUKAN RAHASIA. Keamanan sertifikat bersandar pada tanda tangan, bukan
 * pada sulitnya menebak ID: menebak ID yang ada hanya memperlihatkan sertifikat yang
 * memang boleh dilihat siapa pun yang dikirimi kodenya. Karena itu bias modulo pada
 * pemetaan byte→alfabet (256 tidak habis dibagi 27) dibiarkan apa adanya — ia menggeser
 * sedikit distribusi, tidak membuka satu pun sertifikat. Yang TIDAK boleh dilewatkan
 * adalah pemeriksaan tabrakan ke DB sebelum menyimpan.
 *
 * ==========================================================================
 * KANONIKALISASI: SATU SERTIFIKAT, SATU UNTAIAN
 * ==========================================================================
 * Tanda tangan hanya berguna kalau untaian yang ditandatangani SELALU sama untuk
 * sertifikat yang sama. `JSON.stringify` biasa mengikuti urutan sisip kunci, jadi dua
 * objek dengan isi identik bisa menghasilkan dua untaian berbeda — dan verifikasi gagal
 * pada sertifikat yang sebenarnya sah. canonical() di bawah mengurutkan kunci secara
 * rekursif supaya bentuknya tunggal.
 */

import { hmacSign, hmacVerify } from '../util-hmac.js';

// Tanpa 0 O 1 I L 5 S 8 B — lihat catatan alfabet di kepala berkas.
const ALPHABET = '234679ACDEFGHJKMNPQRTUVWXYZ';
const GROUP = 4;
const GROUPS = 2;

/**
 * Untaian kanonik dari nilai apa pun: kunci objek diurutkan rekursif.
 * Array mempertahankan urutannya (urutan array ADALAH datanya).
 */
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

/**
 * Membentuk ID publik dari byte acak.
 * Byte disuntikkan pemanggil supaya fungsi ini murni dan bisa diuji tanpa sumber acak.
 */
export function formatPublicId(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const need = GROUP * GROUPS;
  if (arr.length < need) throw new Error('certificate_id_entropy_short');
  let out = '';
  for (let i = 0; i < need; i += 1) {
    if (i > 0 && i % GROUP === 0) out += '-';
    out += ALPHABET[arr[i] % ALPHABET.length];
  }
  return 'FZ-' + out;
}

/** Bentuk ID yang sah — dipakai halaman verifikasi sebelum menyentuh DB. */
export function isWellFormedId(id) {
  return /^FZ-[234679ACDEFGHJKMNPQRTUVWXYZ]{4}-[234679ACDEFGHJKMNPQRTUVWXYZ]{4}$/
    .test(String(id || '').replace(/\s+/g, ''));
}

/**
 * Normalisasi masukan manusia: spasi dibuang, huruf dibesarkan, awalan FZ- opsional.
 * Orang akan mengetik "fz 8k3m 2p9x" dan itu harus tetap ketemu.
 */
export function normalizeId(input) {
  const raw = String(input || '').toUpperCase().replace(/[\s‐-―]/g, '');
  const body = raw.startsWith('FZ-') ? raw.slice(3) : raw.startsWith('FZ') ? raw.slice(2) : raw;
  const clean = body.replace(/-/g, '');
  if (clean.length !== GROUP * GROUPS) return null;
  return 'FZ-' + clean.slice(0, GROUP) + '-' + clean.slice(GROUP);
}

/**
 * Untaian yang ditandatangani. Mengikat SEMUA yang menentukan arti sertifikat:
 * ID publik, isi sertifikat, dan identitas pemegang. Mengubah salah satunya —
 * termasuk menukar nama pemegang antar dua sertifikat sah — membatalkan tanda tangan.
 */
export function signingPayload(publicId, certificate, holder) {
  return canonical({
    v: 1,
    id: String(publicId),
    cert: certificate,
    holder: {
      name: String((holder && holder.name) || ''),
      ref: String((holder && holder.ref) || '')
    }
  });
}

/** Tanda tangan base64url atas sertifikat. */
export async function signCertificate(secret, publicId, certificate, holder) {
  return hmacSign(secret, signingPayload(publicId, certificate, holder));
}

/**
 * Verifikasi catatan sertifikat.
 * Mengembalikan false (tidak melempar) untuk catatan rusak: tanda tangan hilang,
 * base64 cacat, secret dirotasi. Semua itu kejadian normal, bukan bug.
 */
export async function verifyCertificate(secret, publicId, certificate, holder, signature) {
  if (!signature) return false;
  return hmacVerify(secret, signingPayload(publicId, certificate, holder), signature);
}
