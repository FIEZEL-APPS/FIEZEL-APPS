/**
 * workers/api/route-user.js — `GET /api/user/me`.
 *
 * Respons berkas ini adalah PERMUKAAN PRIVASI paling sensitif di fase ini, jadi
 * daftar apa yang TIDAK dikembalikan lebih penting dari daftar yang dikembalikan:
 *   - tidak ada nama murid (`learnerName` hari ini dikirim ke Worker Puter,
 *     app.js:2052 — kebiasaan itu TIDAK diwariskan ke gateway CF);
 *   - tidak ada email, uuid Puter, IP, user-agent, zona waktu presisi;
 *   - tidak ada `legacy_ref_hmac` / `account_id` (pengenal turunan akun);
 *   - tidak ada isi belajar (jawaban, riwayat, transkrip AI).
 * Yang keluar hanya: `sub` opaque milik pemanggil sendiri, kelas, plan, tanggal
 * pembuatan, entitlement, angka limit, dan jam server.
 *
 * PLAN GRATIS: 1 baca D1 + maksimum 1 tulis D1 per hari (`last_seen_day`).
 * Kalau endpoint ini nanti dipanggil di setiap navigasi halaman, itu akan
 * menjadi 1 baca D1 per navigasi — klien WAJIB menyimpannya di memori selama
 * satu sesi (dicatat di README sebagai kontrak klien).
 */

import { PROTOCOL } from './schema.js';
import { jsonResponse, unauthenticated } from './errors.js';
import { readIdentityRow, touchLastSeen } from './mw-identity.js';

export async function routeUserMe(ctx) {
  const opt = { headers: ctx.corsHeaders };
  // Tidak ada cookie sah = 401 generik. TIDAK menerbitkan identitas baru di sini:
  // `GET /api/user/me` adalah pertanyaan, bukan pendaftaran. Penerbitan hanya di
  // `POST /api/auth/anon`, supaya crawler tidak membuat baris D1.
  if (!ctx.identity.verified || !ctx.identity.sub) return unauthenticated(opt);

  const row = await readIdentityRow(ctx.env, ctx.identity.sub);
  // Cookie sah secara kripto tetapi baris tidak ada (DB dibuat ulang) atau
  // dicabut ("lupakan perangkat ini") = 401 dengan BODY YANG SAMA. Tidak pernah
  // membedakan "tidak ada" vs "dicabut" vs "kedaluwarsa" (anti-oracle, cf-b2 §5).
  if (!row || row.revoked_at) return unauthenticated(opt);

  await touchLastSeen(ctx.env, ctx.identity.sub, ctx.now, row.last_seen_day);

  return jsonResponse(
    {
      userId: row.sub,
      plan: row.plan || 'free',
      class: row.class || 'visitor',
      createdAt: new Date(Number(row.created_at) || ctx.now).toISOString(),
      entitlements: {
        // Fase ini: entitlement statis dari vars. Lapisan entitlement dinamis
        // (flag KV × plan × rute) adalah slot agen lain — lihat index.js.
        ai: ctx.env.FEATURE_AI === 'on',
        tts: ctx.env.FEATURE_TTS === 'on',
        coach: ctx.env.FEATURE_COACH === 'on'
      },
      limits: {
        aiPerDay: Number(ctx.env.AI_LIMIT_PER_DAY || 0),
        aiPerHour: Number(ctx.env.AI_LIMIT_PER_HOUR || 0),
        ttsCharsPerDay: Number(ctx.env.TTS_CHARS_PER_DAY || 0)
      },
      // Kuota SENGAJA tidak ada di sini. `GET /api/quota` adalah satu-satunya
      // jawaban "berapa jatahku" (cf-b1 §1.b) dan dikerjakan agen lain; dua
      // sumber angka kuota = dua angka yang berbeda di layar murid.
      serverTime: new Date(ctx.now).toISOString(),
      protocol: PROTOCOL
    },
    opt
  );
}
