/**
 * workers/api/auth/role-core.js — PERAN FIEZEL dan matriks otorisasinya.
 * MURNI: nol D1, nol env, nol jam. Satu-satunya sumber kebenaran tentang
 * "peran apa boleh menyentuh apa", dipakai server (penegakan) DAN gerbang.
 *
 * ==========================================================================
 * PERAN ADALAH FAKTA SERVER
 * ==========================================================================
 * Peran TIDAK PERNAH datang dari body, query, header, atau localStorage. Ia
 * dibaca dari baris `auth_account.role` yang dikunci `sub` dari cookie fz_id
 * ber-HMAC (mw-identity). `resolveRole` di bawah SENGAJA tidak punya jalur
 * yang menerima peran sebagai masukan dari klien; kalau nanti ada yang
 * menambahkannya, `role-security-test.js` akan merah.
 *
 * Frontend TETAP menyimpan peran (untuk memilih cangkang tanpa satu round-trip
 * per navigasi), dan itu tidak apa-apa PERSIS KARENA setiap rute berdata
 * memanggil `authorize()` di server. Peran klien adalah PETUNJUK TAMPILAN, dan
 * dokumen ini menyatakannya supaya tidak ada yang salah membacanya sebagai izin.
 *
 * ==========================================================================
 * KENAPA TIDAK ADA HIERARKI PERAN
 * ==========================================================================
 * Godaan yang wajar: "owner adalah superset teacher, teacher superset learner",
 * lalu otorisasi jadi perbandingan angka. DITOLAK. Owner yang otomatis memegang
 * izin guru berarti owner bisa membaca bank soal privat setiap guru tanpa satu
 * pun jejak yang menyatakannya — dan §18 menuntut isolasi konten guru, termasuk
 * dari peran di atasnya. Jadi izin di sini adalah HIMPUNAN, bukan tangga, dan
 * owner yang butuh melihat data guru harus lewat endpoint owner tersendiri yang
 * mengembalikan agregat, bukan lewat endpoint guru.
 */

/** Peran otoritatif. Nilai kolom `auth_account.role` HANYA boleh salah satu ini. */
export const ROLE = Object.freeze({
  OWNER: 'owner',
  TEACHER: 'teacher',
  LEARNER: 'learner'
});

export const ROLES = Object.freeze([ROLE.OWNER, ROLE.TEACHER, ROLE.LEARNER]);

/** Cangkang aplikasi per peran (§27). Satu peran = tepat satu cangkang. */
export const SHELL = Object.freeze({
  [ROLE.OWNER]: '/owner/',
  [ROLE.TEACHER]: '/teacher/',
  [ROLE.LEARNER]: '/learner/'
});

/**
 * Kapabilitas — kata kerja, bukan path. Path berubah; hak tidak.
 * Rute memetakan dirinya ke kapabilitas di ROUTE_CAPABILITY, sehingga menambah
 * rute baru TIDAK bisa diam-diam memperluas izin: kapabilitasnya harus disebut.
 */
export const CAP = Object.freeze({
  LEARNER_SELF: 'learner:self',
  LEARNER_CONTENT: 'learner:content',
  SOCIAL: 'social:self',
  NOTIFY_SELF: 'notify:self',
  TEACHER_CONTENT_READ: 'teacher:content:read',
  TEACHER_CONTENT_WRITE: 'teacher:content:write',
  TEACHER_CSV_IMPORT: 'teacher:csv:import',
  TEACHER_CSV_EXPORT: 'teacher:csv:export',
  TEACHER_CLASS: 'teacher:class',
  TEACHER_PROGRESS: 'teacher:progress',
  OWNER_INVITE: 'owner:invite',
  OWNER_TEACHERS: 'owner:teachers',
  OWNER_METRICS: 'owner:metrics'
});

/**
 * Matriks izin. Dibaca sebagai: peran X memegang himpunan kapabilitas ini dan
 * TIDAK SATU PUN yang lain. Perhatikan tiga hal yang disengaja:
 *   - learner TIDAK punya satu pun kapabilitas `teacher:*` (§34);
 *   - teacher TIDAK punya satu pun kapabilitas `owner:*` (§34);
 *   - owner TIDAK punya `teacher:content:*` — lihat "kenapa tidak ada hierarki".
 * Guru MEMANG memegang NOTIFY_SELF dan LEARNER_SELF-nya sendiri: guru juga
 * punya profil dan kotak notifikasi. Itu bukan eskalasi, itu akun miliknya.
 */
export const ROLE_CAPABILITIES = Object.freeze({
  [ROLE.LEARNER]: Object.freeze([
    CAP.LEARNER_SELF, CAP.LEARNER_CONTENT, CAP.SOCIAL, CAP.NOTIFY_SELF
  ]),
  [ROLE.TEACHER]: Object.freeze([
    CAP.LEARNER_SELF, CAP.NOTIFY_SELF,
    CAP.TEACHER_CONTENT_READ, CAP.TEACHER_CONTENT_WRITE,
    CAP.TEACHER_CSV_IMPORT, CAP.TEACHER_CSV_EXPORT,
    CAP.TEACHER_CLASS, CAP.TEACHER_PROGRESS
  ]),
  [ROLE.OWNER]: Object.freeze([
    CAP.LEARNER_SELF, CAP.NOTIFY_SELF,
    CAP.OWNER_INVITE, CAP.OWNER_TEACHERS, CAP.OWNER_METRICS
  ])
});

/** Peta rute -> kapabilitas. Rute berdata yang tidak ada di sini DITOLAK. */
export const ROUTE_CAPABILITY = Object.freeze({
  '/api/account/me': CAP.LEARNER_SELF,
  '/api/account/logout': CAP.LEARNER_SELF,
  '/api/notify/list': CAP.NOTIFY_SELF,
  '/api/notify/read': CAP.NOTIFY_SELF,
  '/api/notify/push/subscribe': CAP.NOTIFY_SELF,
  '/api/notify/push/unsubscribe': CAP.NOTIFY_SELF,
  '/api/learner/assignments': CAP.LEARNER_CONTENT,
  '/api/learner/assignment/open': CAP.LEARNER_CONTENT,
  '/api/teacher/tree': CAP.TEACHER_CONTENT_READ,
  '/api/teacher/node/save': CAP.TEACHER_CONTENT_WRITE,
  '/api/teacher/node/publish': CAP.TEACHER_CONTENT_WRITE,
  '/api/teacher/node/archive': CAP.TEACHER_CONTENT_WRITE,
  '/api/teacher/question/save': CAP.TEACHER_CONTENT_WRITE,
  '/api/teacher/question/list': CAP.TEACHER_CONTENT_READ,
  '/api/teacher/csv/preview': CAP.TEACHER_CSV_IMPORT,
  '/api/teacher/csv/commit': CAP.TEACHER_CSV_IMPORT,
  '/api/teacher/csv/template': CAP.TEACHER_CSV_EXPORT,
  '/api/teacher/csv/export': CAP.TEACHER_CSV_EXPORT,
  '/api/teacher/assign': CAP.TEACHER_CLASS,
  '/api/teacher/progress': CAP.TEACHER_PROGRESS,
  '/api/teacher/class/claim': CAP.TEACHER_CLASS,
  '/api/teacher/class/list': CAP.TEACHER_CLASS,
  '/api/teacher/class/reports': CAP.TEACHER_PROGRESS,
  '/api/owner/teacher-invite': CAP.OWNER_INVITE,
  '/api/owner/teacher-invite/revoke': CAP.OWNER_INVITE,
  '/api/owner/teachers': CAP.OWNER_TEACHERS
});

/**
 * normalizeRole(raw) -> peran sah | null.
 * Kembalian `null` berarti "bukan peran" dan pemanggil WAJIB memperlakukannya
 * sebagai tidak berizin — BUKAN sebagai learner. Default-ke-learner adalah cara
 * paling umum peran palsu menyelinap masuk.
 */
export function normalizeRole(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return ROLES.includes(value) ? value : null;
}

/** hasCapability(role, cap) -> boolean. Fail-closed atas peran tak dikenal. */
export function hasCapability(role, capability) {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  const granted = ROLE_CAPABILITIES[normalized];
  return Array.isArray(granted) && granted.includes(capability);
}

/**
 * capabilityForRoute(pathname) -> kapabilitas | null.
 * `null` = rute ini tidak terdaftar di matriks. Pemanggil (authorizeRoute)
 * memperlakukannya sebagai DITOLAK, bukan sebagai publik: rute berdata baru
 * yang lupa didaftarkan harus mati, bukan terbuka.
 */
export function capabilityForRoute(pathname) {
  return Object.prototype.hasOwnProperty.call(ROUTE_CAPABILITY, pathname)
    ? ROUTE_CAPABILITY[pathname]
    : null;
}

/**
 * authorizeRoute({ role, pathname }) -> { ok:true, capability } | { ok:false, reason }
 * Alasan penolakan sengaja hanya dua nilai dan keduanya dipetakan ke 403 yang
 * SAMA di lapisan rute: membedakan "rute tak dikenal" dari "peran salah" di
 * respons akan memberi tahu penyerang rute mana yang ada.
 */
export function authorizeRoute(input) {
  const pathname = input && typeof input.pathname === 'string' ? input.pathname : '';
  const role = normalizeRole(input && input.role);
  const capability = capabilityForRoute(pathname);
  if (!capability) return { ok: false, reason: 'route_not_governed' };
  if (!role) return { ok: false, reason: 'role_missing' };
  if (!hasCapability(role, capability)) return { ok: false, reason: 'role_forbidden' };
  return { ok: true, capability };
}

/** shellForRole(role) -> path cangkang | null. Dipakai redirect sesudah login. */
export function shellForRole(role) {
  const normalized = normalizeRole(role);
  return normalized ? SHELL[normalized] : null;
}

/**
 * shellOwnerOf(pathname) -> peran pemilik cangkang | null.
 * Dipakai penjaga navigasi klien DAN gerbang untuk membuktikan bahwa tiga
 * cangkang benar-benar terpisah — bukan satu cangkang dengan menu disembunyikan.
 */
export function shellOwnerOf(pathname) {
  const path = typeof pathname === 'string' ? pathname : '';
  for (const role of ROLES) {
    if (path === SHELL[role] || path.startsWith(SHELL[role])) return role;
  }
  return null;
}

/**
 * canEnterShell(role, pathname) -> boolean.
 * Ini adalah penjaga TAMPILAN, dan penjaga tampilan saja. Ia mencegah murid
 * mengetik /teacher/ dan melihat kerangka dasbor guru; ia TIDAK pernah menjadi
 * alasan sebuah rute data melewatkan `authorizeRoute`.
 */
export function canEnterShell(role, pathname) {
  const owner = shellOwnerOf(pathname);
  if (!owner) return true;
  return normalizeRole(role) === owner;
}

/** Navigasi per cangkang (§2). Satu-satunya sumber menu — klien tidak merakit sendiri. */
export const NAVIGATION = Object.freeze({
  [ROLE.LEARNER]: Object.freeze([
    'home', 'learn', 'vocabulary', 'grammar', 'reading', 'listening',
    'speaking', 'braincore', 'progress', 'friends', 'notifications', 'profile'
  ]),
  [ROLE.TEACHER]: Object.freeze([
    'dashboard', 'classes', 'students', 'subjects', 'lessons', 'questionbank',
    'assignments', 'csv-import', 'csv-export', 'student-progress',
    'adaptive', 'notifications', 'profile', 'settings'
  ]),
  [ROLE.OWNER]: Object.freeze([
    'overview', 'teachers', 'invitations', 'institutions', 'metrics',
    'content-integrity', 'notifications', 'settings'
  ])
});

/**
 * navigationFor(role) -> array kunci menu. Kembalian [] untuk peran tak dikenal:
 * cangkang tanpa menu lebih baik daripada cangkang dengan menu orang lain.
 */
export function navigationFor(role) {
  const normalized = normalizeRole(role);
  return normalized ? NAVIGATION[normalized].slice() : [];
}
