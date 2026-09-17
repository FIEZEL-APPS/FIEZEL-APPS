/**
 * workers/api/auth/curriculum-ticket.js — TIKET IDENTITAS LINTAS-SERVER untuk
 * konsol Kurikulum & Kompetensi.
 *
 * ==========================================================================
 * MASALAH YANG DISELESAIKANNYA, DAN KENAPA TIDAK ADA JALAN YANG LEBIH PENDEK
 * ==========================================================================
 * FIEZEL punya DUA server: Worker ini (identitas KelasKu, cookie `fz_id`
 * ber-HMAC di domain .fiezel.my.id) dan mesin kurikulum FastAPI+MongoDB yang
 * berjalan di domain lain (mis. *.onrender.com). Sampai m025-301 keduanya punya
 * daftar gurunya SENDIRI-SENDIRI: dashboard owner menerbitkan kode KelasKu ke
 * D1, sementara konsol kurikulum menuntut token `FZG-` yang hanya ada di Mongo
 * dan tidak punya satu pun antarmuka untuk menerbitkannya. Guru yang sudah
 * terverifikasi di KelasKu tetap ditolak di pintu kedua. Owner menyebutnya
 * dengan tepat: itu token baru untuk orang yang sudah dikenal.
 *
 * Cookie identitas TIDAK BISA dipakai langsung di server kedua: ia HttpOnly
 * (JavaScript tidak boleh membacanya — itu justru pertahanannya) dan terikat
 * `Domain=.fiezel.my.id`, jadi peramban tidak akan pernah mengirimnya ke
 * onrender.com. Menyalin rahasia cookie ke server kedua juga bukan jawaban:
 * itu memberi server kedua kemampuan MENERBITKAN identitas KelasKu, bukan
 * sekadar membacanya.
 *
 * Jadi yang dipertukarkan adalah TIKET: pernyataan sekali-pakai, berumur
 * pendek, yang hanya bisa DITERBITKAN oleh Worker (pemegang cookie) dan hanya
 * bisa DIBACA oleh mesin kurikulum (pemegang kunci yang sama). Ia tidak
 * memberi mesin kurikulum kuasa apa pun atas akun KelasKu.
 *
 * ==========================================================================
 * BENTUK, DAN ALASAN TIAP RUASNYA
 * ==========================================================================
 *   <b64url(JSON payload)>.<b64url(HMAC-SHA256 atas string b64url payload)>
 *
 *   v     versi bentuk. Pembaca menolak versi yang tidak dikenalnya, jadi
 *         perubahan bentuk tidak pernah terbaca separuh.
 *   aud   'fiezel-curriculum'. Tiket yang ditujukan ke pembaca lain tidak boleh
 *         diterima di sini walau tanda tangannya sah — tanpa ruas ini, satu
 *         kunci yang dipakai dua tujuan membuat tiket bisa dipindah-tujuan.
 *   sub   identitas KelasKu. INILAH kunci akunnya di mesin kurikulum; email
 *         tidak dipakai karena akun KelasKu boleh tidak punya email.
 *   role  peran MENURUT D1 saat tiket diterbitkan (learner/teacher/owner).
 *         Mesin kurikulum tidak boleh menebak peran dari apa pun yang dikirim
 *         peramban; ia membacanya dari sini, dan hanya dari sini.
 *   name  nama tampilan, kenyamanan murni. Tidak pernah menentukan izin.
 *   iat   waktu terbit. Dipakai menolak tiket dari masa depan (jam server yang
 *         melenceng jauh adalah tanda ada yang salah, bukan sesuatu yang
 *         ditoleransi diam-diam).
 *   exp   waktu mati. TTL sengaja DUA MENIT: tiket ini hanya perlu hidup selama
 *         satu perjalanan dari peramban ke mesin kurikulum. Umur panjang tidak
 *         memberi kenyamanan apa pun, ia hanya memperlebar jendela kalau tiket
 *         bocor lewat log atau riwayat peramban.
 *   jti   pengenal acak. Mesin kurikulum menolak jti yang sudah pernah dipakai,
 *         jadi tiket yang tercuri setelah dipakai tidak bisa dipakai ulang.
 *
 * TIDAK ADA kelas, kuota, atau entitlement di dalam payload — alasan yang sama
 * dengan mw-identity.js §2: klaim yang ditandatangani menjadi klaim basi begitu
 * kenyataannya berubah, dan pencabutan akses tidak boleh menunggu kedaluwarsa.
 * Mesin kurikulum membaca kelas dari basis datanya sendiri.
 *
 * Berkas ini SENGAJA bebas dari `env`, D1, dan `fetch`: ia murni fungsi, supaya
 * gerbang bisa menjalankannya di Node biasa dan membuktikan tanda tangannya
 * cocok bit-per-bit dengan pembaca Python di `backend/kelasku.py`.
 */

import { hmacSign, hmacVerify, b64urlFromString, stringFromB64url } from '../util-hmac.js';

/** Versi bentuk payload. Naik hanya kalau ruasnya berubah arti. */
export const TICKET_VERSION = 1;

/** Tujuan tiket. Pembaca WAJIB mencocokkannya. */
export const TICKET_AUDIENCE = 'fiezel-curriculum';

/**
 * Umur tiket dalam detik. Dua menit: cukup untuk satu perjalanan peramban yang
 * lambat sekalipun, terlalu pendek untuk berguna bagi siapa pun yang memungutnya
 * dari log.
 */
export const TICKET_TTL_SECONDS = 120;

/**
 * Toleransi jam antar-server, dalam detik. Dua server yang berbeda tidak pernah
 * punya jam yang sama persis; 60 detik menerima selisih wajar tanpa memperpanjang
 * umur tiket secara berarti.
 */
export const TICKET_CLOCK_SKEW_SECONDS = 60;

/** Nama env yang memegang kuncinya di KEDUA sisi. Ditulis sekali, dibaca semua. */
export const TICKET_KEY_ENV = 'CURRICULUM_TICKET_KEY';

/**
 * Panjang minimum kunci. Kunci pendek adalah kunci yang bisa ditebak, dan
 * menolaknya saat penerbitan lebih baik daripada menemukannya setelah dipakai.
 */
export const TICKET_KEY_MIN_LENGTH = 32;

function randomId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * Terbitkan tiket untuk identitas yang SUDAH terverifikasi.
 *
 * `role` datang dari baris D1, bukan dari permintaan. Berkas ini tidak
 * memverifikasi apa pun tentang pemanggilnya — itu tugas roleGate — tetapi ia
 * MENOLAK kunci yang lemah, karena tanda tangan dengan kunci lemah adalah
 * tanda tangan yang menipu pembacanya.
 */
export async function signCurriculumTicket(secret, claims, nowMs) {
  if (typeof secret !== 'string' || secret.length < TICKET_KEY_MIN_LENGTH) {
    throw new Error('curriculum_ticket_key_weak');
  }
  const issuedAt = Math.floor((typeof nowMs === 'number' ? nowMs : Date.now()) / 1000);
  const payload = {
    v: TICKET_VERSION,
    aud: TICKET_AUDIENCE,
    sub: String(claims && claims.sub ? claims.sub : ''),
    role: String(claims && claims.role ? claims.role : ''),
    name: String(claims && claims.name ? claims.name : '').slice(0, 60),
    iat: issuedAt,
    exp: issuedAt + TICKET_TTL_SECONDS,
    jti: randomId()
  };
  if (!payload.sub || !payload.role) throw new Error('curriculum_ticket_claims_incomplete');
  const encoded = b64urlFromString(JSON.stringify(payload));
  const sig = await hmacSign(secret, encoded);
  return { ticket: encoded + '.' + sig, expires_in: TICKET_TTL_SECONDS, payload: payload };
}

/**
 * Baca tiket. Mengembalikan `{ ok:true, payload }` atau `{ ok:false, reason }`.
 *
 * SEMUA kegagalan memakai bentuk yang sama dan pemanggil WAJIB menerjemahkannya
 * jadi satu kalimat penolakan yang sama (anti-oracle, pola gate.js): membedakan
 * "tanda tangan salah" dari "sudah kedaluwarsa" di respons memberi peta kepada
 * penyerang. `reason` hanya untuk log.
 */
export async function verifyCurriculumTicket(secret, ticket, nowMs) {
  if (typeof secret !== 'string' || secret.length < TICKET_KEY_MIN_LENGTH) {
    return { ok: false, reason: 'key_weak' };
  }
  const raw = String(ticket || '');
  const dot = raw.indexOf('.');
  if (dot < 1 || dot === raw.length - 1) return { ok: false, reason: 'malformed' };
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  let good = false;
  try { good = await hmacVerify(secret, encoded, sig); } catch (_) { good = false; }
  if (!good) return { ok: false, reason: 'bad_signature' };

  let payload = null;
  try { payload = JSON.parse(stringFromB64url(encoded)); } catch (_) { payload = null; }
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'malformed' };
  if (payload.v !== TICKET_VERSION) return { ok: false, reason: 'version' };
  if (payload.aud !== TICKET_AUDIENCE) return { ok: false, reason: 'audience' };
  if (!payload.sub || !payload.role) return { ok: false, reason: 'claims' };

  const nowSec = Math.floor((typeof nowMs === 'number' ? nowMs : Date.now()) / 1000);
  if (typeof payload.exp !== 'number' || nowSec > payload.exp + TICKET_CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'expired' };
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + TICKET_CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'future' };
  }
  return { ok: true, payload: payload };
}
