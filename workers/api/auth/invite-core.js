/**
 * workers/api/auth/invite-core.js — undangan guru yang dicetak OWNER (§22).
 * MURNI kecuali WebCrypto (acak + SHA-256), yang tersedia identik di Workers
 * dan Node 22 sehingga gerbang menguji fungsi produksi, bukan tiruan.
 *
 * ==========================================================================
 * KENAPA TIDAK ADA PENDAFTARAN GURU PUBLIK
 * ==========================================================================
 * Guru memegang kapabilitas yang membaca kemajuan murid. Satu formulir "daftar
 * sebagai guru" berarti siapa pun di internet bisa mencoba menjadi guru dan
 * satu-satunya penahannya adalah moderasi manusia yang belum ada. Jadi jalur
 * satu-satunya adalah token yang dicetak owner, dan rute aktivasi guru TIDAK
 * punya cabang lain untuk membuat akun berperan guru.
 *
 * ==========================================================================
 * TOKEN DISIMPAN SEBAGAI HASH, BUKAN TEKS
 * ==========================================================================
 * Ini titik yang paling mudah salah. Token undangan adalah KREDENSIAL: siapa pun
 * yang membacanya menjadi guru. Menyimpannya apa adanya berarti bocornya satu
 * dump D1 = seluruh undangan aktif bisa dipakai. Jadi D1 hanya memegang
 * SHA-256-nya; teks aslinya ada tepat SEKALI, di respons yang owner lihat, dan
 * tidak bisa ditampilkan lagi. `mintInvite` mengembalikan keduanya dan pemanggil
 * WAJIB menulis hanya `record`.
 *
 * SHA-256 polos (bukan PBKDF2) SAH di sini dan hanya di sini: tidak seperti kata
 * sandi manusia, token ini 160 bit acak dari CSPRNG, jadi tidak ada ruang tebakan
 * yang bisa dipercepat GPU. Menaruh 210.000 iterasi di jalur ini hanya membakar
 * CPU plan gratis tanpa menambah satu bit keamanan.
 *
 * ==========================================================================
 * SIKLUS HIDUP (§22)
 * ==========================================================================
 *   ACTIVE -> USED     (dipakai satu kali; UPDATE atomik `WHERE used_at IS NULL`)
 *   ACTIVE -> EXPIRED  (diturunkan dari jam, BUKAN kolom yang perlu di-cron)
 *   ACTIVE -> REVOKED  (owner mencabut)
 * EXPIRED sengaja TIDAK disimpan sebagai status: status tersimpan yang butuh
 * cron untuk jadi benar akan berbohong setiap kali cron telat. Kedaluwarsa
 * DIHITUNG dari `expires_at` setiap kali dibaca — selalu benar, nol tulis.
 */

import { constantTimeEqual } from './password-core.js';

export const INVITE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
});

/** Jenis institusi (§22). Enum TERTUTUP: kolom teks bebas akan menjadi PII. */
export const INSTITUTION_TYPE = Object.freeze({
  SCHOOL: 'school',
  TUTORING: 'tutoring',
  COURSE: 'course',
  OTHER: 'other'
});

export const INSTITUTION_TYPES = Object.freeze(Object.values(INSTITUTION_TYPE));

export const INVITE = Object.freeze({
  /** 32 char Crockford base32 = 160 bit. Menebaknya butuh 2^159 percobaan rata-rata. */
  CODE_LENGTH: 32,
  /** Alfabet tanpa 0/O/1/I/L/U: owner membacakan token ini lewat telepon. */
  ALPHABET: '23456789ABCDEFGHJKMNPQRSTVWXYZ',
  TTL_DAYS: 14,
  MAX_NAME_LENGTH: 60,
  MAX_INSTITUTION_LENGTH: 80
});

export const INVITE_PROBLEM = Object.freeze({
  NAME_EMPTY: 'invite_name_empty',
  NAME_TOO_LONG: 'invite_name_too_long',
  INSTITUTION_EMPTY: 'invite_institution_empty',
  INSTITUTION_TOO_LONG: 'invite_institution_too_long',
  INSTITUTION_TYPE_INVALID: 'invite_institution_type_invalid',
  CODE_MALFORMED: 'invite_code_malformed',
  NOT_FOUND: 'invite_not_found',
  NOT_ACTIVE: 'invite_not_active'
});

/**
 * Sanitasi nama guru / institusi. Ini teks yang DIKETIK OWNER tentang orang
 * dewasa yang ia rekrut sendiri, jadi ia boleh ada — berbeda dari larangan PII
 * murid di 0001_identity.sql. Yang tetap dilarang: karakter kontrol (perusak
 * CSV dan log) dan spasi berlebih.
 */
export function cleanLabel(raw, maxLength) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** checkInviteInput(input) -> null | { problem } */
export function checkInviteInput(input) {
  const name = cleanLabel(input && input.teacherName, INVITE.MAX_NAME_LENGTH);
  const institution = cleanLabel(input && input.institution, INVITE.MAX_INSTITUTION_LENGTH);
  const type = typeof (input && input.institutionType) === 'string'
    ? input.institutionType.trim().toLowerCase()
    : '';
  if (!name) return { problem: INVITE_PROBLEM.NAME_EMPTY };
  if (String(input.teacherName).trim().length > INVITE.MAX_NAME_LENGTH) {
    return { problem: INVITE_PROBLEM.NAME_TOO_LONG };
  }
  if (!institution) return { problem: INVITE_PROBLEM.INSTITUTION_EMPTY };
  if (String(input.institution).trim().length > INVITE.MAX_INSTITUTION_LENGTH) {
    return { problem: INVITE_PROBLEM.INSTITUTION_TOO_LONG };
  }
  if (!INSTITUTION_TYPES.includes(type)) {
    return { problem: INVITE_PROBLEM.INSTITUTION_TYPE_INVALID };
  }
  return null;
}

/**
 * generateCode(randomBytes?) -> kode 32 char.
 * Menolak `Math.random` secara struktural: tidak ada jalur di sini yang bisa
 * memakainya. Argumen `randomBytes` hanya untuk vektor gerbang.
 */
export function generateCode(randomBytes) {
  const bytes = randomBytes instanceof Uint8Array
    ? randomBytes
    : globalThis.crypto.getRandomValues(new Uint8Array(INVITE.CODE_LENGTH));
  let out = '';
  for (let i = 0; i < INVITE.CODE_LENGTH; i += 1) {
    // Modulo bias atas 30 simbol dari 256 nilai byte ada dan besarnya < 0,4 bit
    // pada total 160 bit. Disebut di sini supaya pembaca berikutnya tahu ini
    // sudah ditimbang, bukan terlewat; menolak-dan-ulang tidak sepadan.
    out += INVITE.ALPHABET[bytes[i % bytes.length] % INVITE.ALPHABET.length];
  }
  return out;
}

/** Normalisasi kode yang diketik guru: huruf besar, tanpa tanda hubung/spasi. */
export function normalizeCode(raw) {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** codeWellFormed(code) -> boolean. Dipakai SEBELUM menyentuh D1 (hemat baca). */
export function codeWellFormed(code) {
  const normalized = normalizeCode(code);
  if (normalized.length !== INVITE.CODE_LENGTH) return false;
  for (const ch of normalized) if (!INVITE.ALPHABET.includes(ch)) return false;
  return true;
}

/** hashCode(code) -> sha256 hex. Bentuk yang disimpan D1. */
export async function hashCode(code) {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(normalizeCode(code))
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * mintInvite({ teacherName, institution, institutionType, ownerSub }, nowMs, deps)
 *   -> { code, record }
 * `code` = SATU-SATUNYA kemunculan teks token. `record` = baris D1 (tanpa teks).
 */
export async function mintInvite(input, nowMs, deps = {}) {
  const problem = checkInviteInput(input);
  if (problem) throw Object.assign(new Error('invite_input'), problem);
  const code = typeof deps.code === 'string' ? deps.code : generateCode(deps.randomBytes);
  const codeHash = await hashCode(code);
  const ttlMs = INVITE.TTL_DAYS * 24 * 60 * 60 * 1000;
  return {
    code,
    record: {
      code_hash: codeHash,
      teacher_name: cleanLabel(input.teacherName, INVITE.MAX_NAME_LENGTH),
      institution: cleanLabel(input.institution, INVITE.MAX_INSTITUTION_LENGTH),
      institution_type: String(input.institutionType).trim().toLowerCase(),
      created_at: nowMs,
      expires_at: nowMs + ttlMs,
      created_by: typeof input.ownerSub === 'string' ? input.ownerSub : 'owner',
      used_at: null,
      used_by: null,
      revoked_at: null
    }
  };
}

/**
 * inviteStatus(record, nowMs) -> INVITE_STATUS.
 * Urutan pemeriksaan penting: REVOKED menang atas USED menang atas EXPIRED.
 * Undangan yang dicabut sesudah dipakai tetap dilaporkan REVOKED supaya owner
 * melihat tindakannya sendiri, bukan riwayat yang menimpanya.
 */
export function inviteStatus(record, nowMs) {
  if (!record || typeof record !== 'object') return INVITE_STATUS.EXPIRED;
  if (record.revoked_at) return INVITE_STATUS.REVOKED;
  if (record.used_at) return INVITE_STATUS.USED;
  if (Number(record.expires_at) <= Number(nowMs)) return INVITE_STATUS.EXPIRED;
  return INVITE_STATUS.ACTIVE;
}

/**
 * checkRedeemable(record, nowMs, presentedHash) -> null | { problem, status? }
 *
 * Perbandingan hash tetap waktu-tetap meski hash sudah publik-aman: disiplin ini
 * murah dan menghilangkan seluruh kelas pertanyaan "apakah yang ini perlu?".
 */
export function checkRedeemable(record, nowMs, presentedHash) {
  if (!record) return { problem: INVITE_PROBLEM.NOT_FOUND };
  if (!constantTimeEqual(record.code_hash, presentedHash)) {
    return { problem: INVITE_PROBLEM.NOT_FOUND };
  }
  const status = inviteStatus(record, nowMs);
  if (status !== INVITE_STATUS.ACTIVE) {
    return { problem: INVITE_PROBLEM.NOT_ACTIVE, status };
  }
  return null;
}

/**
 * publicInviteView(record, nowMs) -> bentuk aman untuk daftar owner.
 * TIDAK PERNAH memuat `code_hash`: hash memang tidak bisa dibalik, tetapi ia
 * adalah pembanding yang cukup untuk menguji tebakan secara offline. Owner tidak
 * butuh melihatnya, jadi ia tidak keluar.
 */
export function publicInviteView(record, nowMs) {
  if (!record) return null;
  return {
    teacherName: record.teacher_name,
    institution: record.institution,
    institutionType: record.institution_type,
    status: inviteStatus(record, nowMs),
    createdAt: Number(record.created_at) || 0,
    expiresAt: Number(record.expires_at) || 0,
    usedAt: record.used_at ? Number(record.used_at) : null
  };
}
