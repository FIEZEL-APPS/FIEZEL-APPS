/**
 * tests/social-notify-test.js — GERBANG permintaan teman, sorakan, notifikasi, push
 * (§23-§26).
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga:
 *   1. Penahan §23: self-friend, duplikat, cap harian, dan OTORISASI balasan
 *      (hanya penerima yang boleh menerima/menolak).
 *   2. Sorakan hanya antar teman, ber-cap ganda (per teman + total harian).
 *   3. Notifikasi persisten TANPA teks bebas — enum + aktor + hari saja.
 *   4. Kotak masuk dipangkas saat tulis (bukan lewat cron yang tidak akan ada).
 *   5. Push: https wajib, kunci bervalidasi, cap perangkat, dan push TIDAK
 *      PERNAH menggantikan notifikasi tersimpan.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const path = require('path');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

(async () => {
  const N = await import('file://' + path.join(__fzRoot, 'workers/api/social/notify-core.js'));
  const NOW = 1_800_000_000_000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const P = N.SOCIAL_PROBLEM;

  /* ---------- 1. Permintaan teman (§23) --------------------------------------- */
  const base = { fromSub: 'a', toSub: 'b', existing: null, areFriends: false, sentToday: 0 };
  assert(N.checkFriendRequest(base) === null, 'permintaan teman wajar DITERIMA');
  assert(N.checkFriendRequest({ ...base, toSub: 'a' }).problem === P.SELF_TARGET,
    'berteman dengan diri sendiri DITOLAK (§23)');
  assert(N.checkFriendRequest({ ...base, toSub: '' }).problem === P.SELF_TARGET,
    'target kosong DITOLAK');
  assert(N.checkFriendRequest({ ...base, areFriends: true }).problem === P.ALREADY_FRIENDS,
    'permintaan ke teman yang sudah ada DITOLAK');
  assert(N.checkFriendRequest({ ...base, existing: { status: 'PENDING' } }).problem === P.REQUEST_DUPLICATE,
    'permintaan duplikat DITOLAK — tiap kirim = satu notifikasi di perangkat penerima');
  assert(N.checkFriendRequest({ ...base, existing: { status: 'DECLINED' } }) === null,
    'permintaan yang pernah ditolak BOLEH dikirim ulang — anak tidak terkunci selamanya');
  assert(N.checkFriendRequest({ ...base, sentToday: N.NOTIFY_LIMITS.FRIEND_REQUESTS_PER_DAY }).problem
    === P.RATE_LIMITED, 'cap harian menahan penyisiran basis pengguna');

  /* ---------- 2. Otorisasi balasan (penahan IDOR) ------------------------------ */
  const pending = { from_sub: 'a', to_sub: 'b', status: 'PENDING' };
  assert(N.checkFriendResponse({ request: pending, actorSub: 'b', action: 'accept' }) === null,
    'penerima boleh menerima');
  assert(N.checkFriendResponse({ request: pending, actorSub: 'b', action: 'decline' }) === null,
    'penerima boleh menolak');
  assert(N.checkFriendResponse({ request: pending, actorSub: 'a', action: 'accept' }).problem
    === P.NOT_RECIPIENT, 'PENGIRIM tidak bisa menerima permintaannya sendiri');
  assert(N.checkFriendResponse({ request: pending, actorSub: 'z', action: 'accept' }).problem
    === P.NOT_RECIPIENT, 'pihak ketiga TIDAK bisa menerima pertemanan atas nama orang lain (IDOR)');
  assert(N.checkFriendResponse({ request: pending, actorSub: 'a', action: 'cancel' }) === null,
    'pengirim boleh membatalkan');
  assert(N.checkFriendResponse({ request: pending, actorSub: 'b', action: 'cancel' }).problem
    === P.NOT_REQUESTER, 'penerima tidak bisa "membatalkan" milik pengirim');
  assert(N.checkFriendResponse({ request: { ...pending, status: 'ACCEPTED' }, actorSub: 'b', action: 'accept' })
    .problem === P.REQUEST_NOT_PENDING, 'permintaan yang sudah selesai tidak bisa dijawab lagi');
  assert(N.checkFriendResponse({ request: null, actorSub: 'b', action: 'accept' }).problem
    === P.REQUEST_NOT_FOUND, 'permintaan tak ada ditolak');

  const rows = N.friendRows('a', 'b', '2026-09-03');
  assert(rows.length === 2 && rows[0].a === 'a' && rows[1].a === 'b',
    'pertemanan disetujui menulis DUA baris social_friend (skema 0006 yang sudah ada)');

  /* ---------- 3. Sorakan (§24) -------------------------------------------------- */
  const cheer = { fromSub: 'a', toSub: 'b', areFriends: true, sentToThisFriendToday: 0, sentTodayTotal: 0 };
  assert(N.checkCheer(cheer) === null, 'sorakan antar teman DITERIMA');
  assert(N.checkCheer({ ...cheer, areFriends: false }).problem === P.NOT_FRIENDS,
    'sorakan ke ORANG ASING DITOLAK — kontak tak diminta dari orang tak dikenal ke anak');
  assert(N.checkCheer({ ...cheer, toSub: 'a' }).problem === P.SELF_TARGET, 'menyoraki diri sendiri DITOLAK');
  assert(N.checkCheer({ ...cheer, sentToThisFriendToday: N.NOTIFY_LIMITS.CHEERS_PER_FRIEND_PER_DAY })
    .problem === P.RATE_LIMITED, 'cap sorakan PER TEMAN per hari ditegakkan');
  assert(N.checkCheer({ ...cheer, sentTodayTotal: N.NOTIFY_LIMITS.CHEERS_PER_DAY }).problem === P.RATE_LIMITED,
    'cap sorakan TOTAL harian ditegakkan');

  /* ---------- 4. Notifikasi (§25) ----------------------------------------------- */
  const note = N.buildNotification({
    sub: 'b', kind: N.NOTIFY_KIND.FRIEND_REQUEST, actorSub: 'a', refId: 'r1', day: '2026-09-03', nowMs: NOW
  });
  assert(note !== null && note.kind === 'friend_request', 'notifikasi terbentuk');
  assert(!('message' in note) && !('text' in note) && !('body' in note),
    'notifikasi TIDAK punya kolom teks bebas — kalau ada, ia jadi saluran pesan antar anak');
  assert(N.buildNotification({ sub: 'a', kind: N.NOTIFY_KIND.CHEER_RECEIVED, actorSub: 'a' }) === null,
    'notifikasi tentang tindakan DIRI SENDIRI ditolak (kotak masuk penuh gema)');
  assert(N.buildNotification({ sub: 'b', kind: 'kabar_karangan', actorSub: 'a' }) === null,
    'jenis notifikasi di luar enum ditolak');
  assert(N.NOTIFY_KINDS.includes('assignment_available') && N.NOTIFY_KINDS.includes('cheer_received'),
    'enum §25 memuat tugas guru dan sorakan');

  const view = N.publicNotificationView({ ...note, id: 'n1' }, 'rani_hebat');
  assert(view.actorHandle === 'rani_hebat', 'tampilan memakai pseudonim, bukan sub');
  assert(!JSON.stringify(view).includes('"a"') || !('actor_sub' in view),
    'sub mentah orang lain TIDAK keluar ke klien (bahan mentah percobaan IDOR)');
  assert(view.read === false, 'notifikasi baru belum terbaca');

  const many = [];
  for (let i = 0; i < N.NOTIFY_LIMITS.INBOX_MAX + 30; i += 1) {
    many.push({ id: 'n' + i, created_at: NOW - i * 1000, read_at: null });
  }
  const pruned = N.pruneInbox(many, NOW);
  assert(pruned.keep.length === N.NOTIFY_LIMITS.INBOX_MAX, 'kotak masuk dipangkas ke cap');
  assert(pruned.keep[0].id === 'n0', 'yang TERBARU dipertahankan, yang tertua dibuang');
  assert(pruned.drop.length === 30, 'yang dibuang dilaporkan supaya pemanggil bisa menghapusnya');
  const old = N.pruneInbox([{ id: 'x', created_at: NOW - (N.NOTIFY_LIMITS.RETENTION_DAYS + 5) * DAY_MS }], NOW);
  assert(old.keep.length === 0 && old.drop.length === 1, 'notifikasi lewat retensi dibuang');
  assert(N.unreadCount([{ read_at: null }, { read_at: NOW }, { read_at: null }]) === 2,
    'jumlah belum terbaca dihitung');

  /* ---------- 5. Push (§26) ------------------------------------------------------ */
  const validKeys = { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) };
  const push = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: validKeys, existingCount: 0 };
  assert(N.checkPushSubscription(push) === null, 'langganan push sah DITERIMA');
  assert(N.checkPushSubscription({ ...push, endpoint: 'http://fcm.googleapis.com/x' }).problem
    === P.PUSH_ENDPOINT_INVALID,
  'endpoint http DITOLAK — payload push mengungkap aktivitas belajar anak di jaringan bersama');
  assert(N.checkPushSubscription({ ...push, endpoint: 'bukan-url' }).problem === P.PUSH_ENDPOINT_INVALID,
    'endpoint bukan URL ditolak');
  assert(N.checkPushSubscription({ ...push, keys: { p256dh: 'pendek', auth: 'x' } }).problem
    === P.PUSH_KEYS_INVALID, 'kunci push sampah ditolak');
  assert(N.checkPushSubscription({ ...push, keys: { p256dh: 'B'.repeat(87), auth: '!!!' } }).problem
    === P.PUSH_KEYS_INVALID, 'kunci di luar alfabet base64url ditolak');
  assert(N.checkPushSubscription({ ...push, existingCount: N.NOTIFY_LIMITS.PUSH_SUBSCRIPTIONS_MAX }).problem
    === P.PUSH_TOO_MANY, 'cap perangkat per pengguna ditegakkan');

  assert(N.shouldPush({ kind: N.NOTIFY_KIND.ASSIGNMENT_AVAILABLE }, 1) === true, 'tugas baru boleh push');
  assert(N.shouldPush({ kind: N.NOTIFY_KIND.FRIEND_MILESTONE }, 1) === false,
    'milestone teman TIDAK di-push — kabar baik yang bisa menunggu, bukan gangguan layar kunci');
  assert(N.shouldPush({ kind: N.NOTIFY_KIND.ASSIGNMENT_AVAILABLE }, 0) === false,
    'tanpa langganan, tidak ada push (opt-in §26)');
  assert(N.PUSHABLE_KINDS.length < N.NOTIFY_KINDS.length,
    'yang boleh push adalah HIMPUNAN BAGIAN — push bukan cerminan seluruh kotak masuk');

  const payload = N.pushPayload({ kind: 'assignment_available', ref_id: 'L1', day: '2026-09-03' });
  assert(payload.kind === 'assignment_available' && !('title' in payload) && !('body' in payload),
    'muatan push TANPA naskah — service worker merakitnya dari i18n perangkat (§30)');
  assert(!JSON.stringify(payload).includes('actor'), 'muatan push tidak membawa identitas orang lain');

  // Notifikasi tersimpan tidak bergantung pada push: pengguna yang menolak izin
  // tetap menerima kabarnya di kotak masuk saat membuka aplikasi.
  assert(N.buildNotification({
    sub: 'b', kind: N.NOTIFY_KIND.ASSIGNMENT_AVAILABLE, actorSub: 'guru', day: '2026-09-03', nowMs: NOW
  }) !== null, 'notifikasi tetap tersimpan tanpa peduli status izin push (§25 + §26)');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('social-notify-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('social-notify-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('social-notify-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
