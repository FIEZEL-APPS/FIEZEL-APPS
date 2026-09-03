/**
 * workers/api/social/notify-core.js — permintaan teman, sorakan, pusat notifikasi,
 * dan kebijakan push (§23-§26). MURNI: nol D1, nol jam implisit.
 *
 * ==========================================================================
 * HUBUNGAN DENGAN LAPISAN SOSIAL YANG SUDAH ADA
 * ==========================================================================
 * `workers/api/route-social.js` + `migrations/0006_social.sql` SUDAH punya
 * pertemanan (dua baris `social_friend`), sorakan ber-enum stiker, dan penghitung
 * ber-cap `social_counter`. Berkas ini TIDAK menggantikannya dan tidak membuat
 * tabel teman kedua — §mandat melarang arsitektur paralel bila yang ada bisa
 * diperluas dengan aman.
 *
 * Yang DITAMBAHKAN, karena memang belum ada:
 *   1. PERMINTAAN teman (§23). Yang ada hari ini adalah kode undangan: pengundang
 *      mencetak kode, penerima menukarkannya, pertemanan langsung jadi. Itu tidak
 *      punya keadaan "menunggu", jadi tidak punya "tolak" — dan §23 menuntut
 *      keduanya. Karena itu ada `friend_request`, dan pertemanan yang DISETUJUI
 *      tetap mendarat di `social_friend` yang lama. Satu sumber kebenaran untuk
 *      "siapa berteman dengan siapa" tetap terjaga.
 *   2. Pusat notifikasi yang PERSISTEN di server (§25).
 *   3. Langganan push per perangkat (§26).
 *
 * ==========================================================================
 * ATURAN PRIVASI DIWARISI UTUH
 * ==========================================================================
 * Larangan di kepala `0006_social.sql` berlaku penuh: TANPA teks bebas antar
 * pengguna. Karena itu notifikasi menyimpan `kind` (enum) + `actor_sub` + hari,
 * dan naskahnya DIRAKIT DI KLIEN dari i18n. Satu kolom `message TEXT` akan
 * menjadi saluran pesan tak termoderasi antar anak dalam satu rilis, dan tidak
 * ada cara menariknya kembali sesudah dipakai.
 */

/** Jenis notifikasi (§25). Enum TERTUTUP — klien memetakannya ke i18n. */
export const NOTIFY_KIND = Object.freeze({
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  CHEER_RECEIVED: 'cheer_received',
  FRIEND_MILESTONE: 'friend_milestone',
  ASSIGNMENT_AVAILABLE: 'assignment_available',
  ASSIGNMENT_UPDATED: 'assignment_updated'
});

export const NOTIFY_KINDS = Object.freeze(Object.values(NOTIFY_KIND));

/**
 * Notifikasi yang boleh MEMICU PUSH. Sengaja bukan seluruh enum: milestone teman
 * adalah kabar baik yang bisa menunggu dibuka aplikasi, dan mendorongnya ke
 * layar kunci anak setiap kali temannya belajar adalah gangguan, bukan fitur.
 */
export const PUSHABLE_KINDS = Object.freeze([
  NOTIFY_KIND.FRIEND_REQUEST,
  NOTIFY_KIND.FRIEND_ACCEPTED,
  NOTIFY_KIND.ASSIGNMENT_AVAILABLE
]);

export const FRIEND_REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED'
});

export const NOTIFY_LIMITS = Object.freeze({
  /** Permintaan teman KELUAR per hari. Menahan penyisiran daftar pengguna. */
  FRIEND_REQUESTS_PER_DAY: 20,
  /** Sorakan per hari PER penerima (§24 "rate-limit to prevent spam"). */
  CHEERS_PER_FRIEND_PER_DAY: 5,
  CHEERS_PER_DAY: 50,
  /** Notifikasi tersimpan per pengguna. Yang tertua dibuang saat penuh. */
  INBOX_MAX: 200,
  RETENTION_DAYS: 30,
  /** Langganan push per pengguna = jumlah perangkat yang wajar dipakai satu anak. */
  PUSH_SUBSCRIPTIONS_MAX: 5
});

export const SOCIAL_PROBLEM = Object.freeze({
  SELF_TARGET: 'social_self_target',
  ALREADY_FRIENDS: 'social_already_friends',
  REQUEST_DUPLICATE: 'social_request_duplicate',
  REQUEST_NOT_FOUND: 'social_request_not_found',
  REQUEST_NOT_PENDING: 'social_request_not_pending',
  NOT_RECIPIENT: 'social_not_recipient',
  NOT_REQUESTER: 'social_not_requester',
  NOT_FRIENDS: 'social_not_friends',
  RATE_LIMITED: 'social_rate_limited',
  KIND_INVALID: 'social_kind_invalid',
  PUSH_ENDPOINT_INVALID: 'social_push_endpoint_invalid',
  PUSH_KEYS_INVALID: 'social_push_keys_invalid',
  PUSH_TOO_MANY: 'social_push_too_many'
});

/* ========================================================================== */
/* PERMINTAAN TEMAN (§23)                                                      */
/* ========================================================================== */

/**
 * Kunci permintaan BERARAH: `<dari>:<ke>`. Sengaja berarah, bukan pasangan
 * terurut, karena "A meminta B" dan "B meminta A" adalah dua peristiwa berbeda
 * yang keduanya sah — dan `checkFriendRequest` di bawah memakai keberadaan
 * permintaan berlawanan sebagai jalur persetujuan cepat, bukan sebagai duplikat.
 */
export function requestKey(fromSub, toSub) {
  return `${fromSub}:${toSub}`;
}

/**
 * checkFriendRequest({ fromSub, toSub, existing, areFriends, sentToday })
 *   -> null | { problem, limit? }
 *
 * Empat penahan §23, masing-masing menutup penyalahgunaan yang berbeda:
 *   - self-friend: bukan sekadar aneh — ia merusak penghitung teman dan membuat
 *     baris `social_friend` (a,a) yang muncul di daftar teman sendiri;
 *   - sudah berteman: mencegah permintaan yang tidak punya arti;
 *   - duplikat PENDING: mencegah pengiriman berulang sebagai alat gangguan
 *     (tiap kirim = satu notifikasi di perangkat penerima);
 *   - cap harian: menahan penyisiran seluruh basis pengguna.
 *
 * Permintaan yang pernah DITOLAK BOLEH dikirim ulang, dan itu disengaja: anak
 * yang salah menolak tidak boleh terkunci selamanya. Yang menahan gangguan di
 * jalur itu adalah cap harian, bukan larangan permanen.
 */
export function checkFriendRequest(input) {
  const fromSub = (input && input.fromSub) || '';
  const toSub = (input && input.toSub) || '';
  if (!fromSub || !toSub || fromSub === toSub) return { problem: SOCIAL_PROBLEM.SELF_TARGET };
  if (input.areFriends) return { problem: SOCIAL_PROBLEM.ALREADY_FRIENDS };
  const existing = input.existing || null;
  if (existing && existing.status === FRIEND_REQUEST_STATUS.PENDING) {
    return { problem: SOCIAL_PROBLEM.REQUEST_DUPLICATE };
  }
  const sentToday = Number(input.sentToday) || 0;
  if (sentToday >= NOTIFY_LIMITS.FRIEND_REQUESTS_PER_DAY) {
    return { problem: SOCIAL_PROBLEM.RATE_LIMITED, limit: NOTIFY_LIMITS.FRIEND_REQUESTS_PER_DAY };
  }
  return null;
}

/**
 * checkFriendResponse({ request, actorSub, action }) -> null | { problem }
 *
 * Penahan IDOR yang paling langsung di lapisan sosial: HANYA penerima yang boleh
 * accept/decline, dan HANYA pengirim yang boleh cancel. Tanpa pemeriksaan ini,
 * siapa pun yang bisa menebak ID permintaan bisa menerima pertemanan atas nama
 * orang lain — dan pertemanan membuka daftar teman serta jalur sorakan.
 */
export function checkFriendResponse(input) {
  const request = (input && input.request) || null;
  const actorSub = (input && input.actorSub) || '';
  const action = (input && input.action) || '';
  if (!request) return { problem: SOCIAL_PROBLEM.REQUEST_NOT_FOUND };
  if (request.status !== FRIEND_REQUEST_STATUS.PENDING) {
    return { problem: SOCIAL_PROBLEM.REQUEST_NOT_PENDING };
  }
  if (action === 'cancel') {
    return request.from_sub === actorSub ? null : { problem: SOCIAL_PROBLEM.NOT_REQUESTER };
  }
  return request.to_sub === actorSub ? null : { problem: SOCIAL_PROBLEM.NOT_RECIPIENT };
}

/**
 * friendRows(a, b, day) -> DUA baris `social_friend`, terurut deterministik.
 * Dua baris adalah desain tabel yang sudah ada (0006_social.sql): daftar teman
 * satu orang terjawab prefix PRIMARY KEY tanpa OR dan tanpa indeks kedua.
 */
export function friendRows(subA, subB, day) {
  return [
    { a: subA, b: subB, since_day: day },
    { a: subB, b: subA, since_day: day }
  ];
}

/* ========================================================================== */
/* SORAKAN (§24)                                                               */
/* ========================================================================== */

/**
 * checkCheer({ fromSub, toSub, areFriends, sentToThisFriendToday, sentTodayTotal })
 *   -> null | { problem, limit? }
 *
 * Sorakan HANYA antar teman. Sorakan ke orang asing adalah pesan tak diminta
 * dari orang tak dikenal ke anak — bentuk paling ringan dari kontak yang tidak
 * boleh ada di produk ini, dan pembatasan ke teman adalah cara termurah
 * menutupnya sepenuhnya.
 */
export function checkCheer(input) {
  const fromSub = (input && input.fromSub) || '';
  const toSub = (input && input.toSub) || '';
  if (!fromSub || !toSub || fromSub === toSub) return { problem: SOCIAL_PROBLEM.SELF_TARGET };
  if (!input.areFriends) return { problem: SOCIAL_PROBLEM.NOT_FRIENDS };
  if ((Number(input.sentToThisFriendToday) || 0) >= NOTIFY_LIMITS.CHEERS_PER_FRIEND_PER_DAY) {
    return { problem: SOCIAL_PROBLEM.RATE_LIMITED, limit: NOTIFY_LIMITS.CHEERS_PER_FRIEND_PER_DAY };
  }
  if ((Number(input.sentTodayTotal) || 0) >= NOTIFY_LIMITS.CHEERS_PER_DAY) {
    return { problem: SOCIAL_PROBLEM.RATE_LIMITED, limit: NOTIFY_LIMITS.CHEERS_PER_DAY };
  }
  return null;
}

/* ========================================================================== */
/* PUSAT NOTIFIKASI (§25)                                                      */
/* ========================================================================== */

/**
 * buildNotification({ sub, kind, actorSub, refId, nowMs, day }) -> baris | null
 *
 * `actorSub` adalah SUB, bukan nama. Nama pseudonim dirakit klien dari profil
 * sosial saat menampilkan — jadi pengguna yang mengganti nama tampilannya tidak
 * meninggalkan nama lamanya membeku di kotak notifikasi orang lain.
 *
 * `sub === actorSub` DITOLAK: notifikasi tentang tindakan diri sendiri tidak
 * pernah berguna, dan membiarkannya membuat kotak masuk penuh gema.
 */
export function buildNotification(input) {
  const sub = (input && input.sub) || '';
  const kind = (input && input.kind) || '';
  if (!sub || !NOTIFY_KINDS.includes(kind)) return null;
  const actorSub = (input && input.actorSub) || null;
  if (actorSub && actorSub === sub) return null;
  return {
    sub,
    kind,
    actor_sub: actorSub,
    ref_id: (input && input.refId) || null,
    day: (input && input.day) || '',
    created_at: Number(input && input.nowMs) || 0,
    read_at: null
  };
}

/**
 * Bentuk yang dikirim ke klien. `actor_sub` DIGANTI `actorHandle` oleh pemanggil
 * (yang punya akses profil); fungsi ini tidak pernah mengeluarkan sub mentah
 * milik orang lain — sub adalah pengenal yang dipakai seluruh API, dan
 * membocorkannya ke pengguna lain memberi mereka bahan untuk mencoba IDOR.
 */
export function publicNotificationView(row, actorHandle) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    actorHandle: row.actor_sub ? (actorHandle || null) : null,
    refId: row.ref_id || null,
    day: row.day,
    createdAt: Number(row.created_at) || 0,
    read: Boolean(row.read_at)
  };
}

/**
 * pruneInbox(rows) -> { keep, drop }. Dipanggil saat menulis, bukan lewat cron:
 * token CI repo ini tidak bisa memasang cron baru (catatan yang sama ada di
 * 0006_social.sql soal purge milestone), jadi pemangkasan yang bergantung cron
 * adalah pemangkasan yang tidak akan terjadi.
 */
export function pruneInbox(rows, nowMs) {
  const list = (Array.isArray(rows) ? rows : []).slice()
    .sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
  const cutoff = Number(nowMs) - NOTIFY_LIMITS.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const keep = [];
  const drop = [];
  for (const row of list) {
    const tooOld = Number.isFinite(cutoff) && (Number(row.created_at) || 0) < cutoff;
    if (keep.length >= NOTIFY_LIMITS.INBOX_MAX || tooOld) drop.push(row);
    else keep.push(row);
  }
  return { keep, drop };
}

export function unreadCount(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => r && !r.read_at).length;
}

/* ========================================================================== */
/* PUSH (§26)                                                                  */
/* ========================================================================== */

/**
 * checkPushSubscription({ endpoint, keys, existingCount }) -> null | { problem }
 *
 * `endpoint` WAJIB https. Endpoint http bukan sekadar tidak aman: ia berarti
 * payload push melintas terbuka, dan payload push kita memuat `kind` yang
 * mengungkap aktivitas belajar seorang anak kepada siapa pun di jaringan yang
 * sama. Jadi ini penolakan, bukan peringatan.
 *
 * Yang TIDAK dilakukan fungsi ini, dan sengaja: memeriksa apakah host endpoint
 * termasuk daftar penyedia push yang dikenal. Daftar seperti itu akan usang dan
 * memutus peramban baru; yang menahan penyalahgunaan adalah cap per pengguna.
 */
export function checkPushSubscription(input) {
  const endpoint = (input && input.endpoint) || '';
  if (typeof endpoint !== 'string' || endpoint.length < 12 || endpoint.length > 2048) {
    return { problem: SOCIAL_PROBLEM.PUSH_ENDPOINT_INVALID };
  }
  let url;
  try { url = new URL(endpoint); } catch { return { problem: SOCIAL_PROBLEM.PUSH_ENDPOINT_INVALID }; }
  if (url.protocol !== 'https:') return { problem: SOCIAL_PROBLEM.PUSH_ENDPOINT_INVALID };

  const keys = (input && input.keys) || {};
  const p256dh = typeof keys.p256dh === 'string' ? keys.p256dh : '';
  const auth = typeof keys.auth === 'string' ? keys.auth : '';
  // Panjang base64url kunci Web Push: p256dh = 65 byte -> 87-88 char,
  // auth = 16 byte -> 22-24 char. Diperiksa supaya baris sampah tidak memakan
  // jatah perangkat pengguna dan tidak membuat dispatcher gagal berulang.
  if (!/^[A-Za-z0-9_-]{80,200}$/.test(p256dh)) return { problem: SOCIAL_PROBLEM.PUSH_KEYS_INVALID };
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(auth)) return { problem: SOCIAL_PROBLEM.PUSH_KEYS_INVALID };

  if ((Number(input.existingCount) || 0) >= NOTIFY_LIMITS.PUSH_SUBSCRIPTIONS_MAX) {
    return { problem: SOCIAL_PROBLEM.PUSH_TOO_MANY, limit: NOTIFY_LIMITS.PUSH_SUBSCRIPTIONS_MAX };
  }
  return null;
}

/**
 * shouldPush(notification, subscriptionCount) -> boolean.
 * Push adalah TAMBAHAN di atas notifikasi tersimpan, tidak pernah pengganti:
 * setiap notifikasi tetap masuk kotak masuk server (§25) meski push gagal atau
 * pengguna belum pernah mengizinkannya. Itu yang membuat §26 "opt-in,
 * non-blocking, revocable" bisa dipenuhi tanpa ada kabar yang hilang.
 */
export function shouldPush(notification, subscriptionCount) {
  if (!notification || !PUSHABLE_KINDS.includes(notification.kind)) return false;
  return (Number(subscriptionCount) || 0) > 0;
}

/**
 * pushPayload(notification) -> muatan yang dikirim ke perangkat.
 * TANPA naskah dan TANPA nama: hanya `kind` + `refId`. Service worker merakit
 * teksnya dari i18n yang sudah ada di perangkat (§30 melarang string keras
 * baru), dan konsekuensinya notifikasi tetap berbahasa pengguna meski
 * dikirim dari server yang tidak tahu bahasanya.
 */
export function pushPayload(notification) {
  if (!notification) return null;
  return { kind: notification.kind, refId: notification.ref_id || null, day: notification.day || '' };
}
