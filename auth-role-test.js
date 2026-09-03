/**
 * auth-role-test.js — GERBANG autentikasi kata sandi, peran, dan undangan guru.
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga:
 *   1. Kebijakan kata sandi menolak yang lemah dan menerima yang wajar.
 *   2. hash/verify BENAR-BENAR bekerja (WebCrypto yang sama dengan produksi),
 *      salt acak, dan kata sandi mentah tidak pernah muncul di bentuk tersimpan.
 *   3. Matriks peran: learner tidak punya satu pun kapabilitas teacher/owner,
 *      teacher tidak punya owner, dan rute tak terdaftar DITOLAK (fail-closed).
 *   4. Cangkang benar-benar TERPISAH — bukan satu cangkang bermenu tersembunyi.
 *   5. Siklus undangan guru: sekali pakai, kedaluwarsa, dicabut, tidak bisa
 *      ditebak, dan teks token TIDAK PERNAH ada di baris D1.
 *   6. Eskalasi peran lewat masukan klien mustahil secara struktural.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const path = require('path');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}
function mod(rel) {
  return import('file://' + path.join(__dirname, rel));
}

(async () => {
  const pw = await mod('workers/api/auth/password-core.js');
  const rc = await mod('workers/api/auth/role-core.js');
  const iv = await mod('workers/api/auth/invite-core.js');

  /* ---------- 1. Kebijakan kata sandi ---------------------------------------- */
  assert(pw.checkPasswordPolicy('') !== null, 'kata sandi kosong DITOLAK');
  assert(pw.checkPasswordPolicy('short1A') !== null, 'kata sandi < 10 char DITOLAK');
  assert(pw.checkPasswordPolicy('aaaaaaaaaaaa') !== null,
    'satu kelas karakter saja DITOLAK (butuh >= 2 kelas)');
  assert(pw.checkPasswordPolicy('password123') !== null, 'kata sandi umum DITOLAK');
  assert(pw.checkPasswordPolicy('PASSWORD123') !== null,
    'daftar umum tidak peka huruf besar-kecil');
  assert(pw.checkPasswordPolicy('x'.repeat(500) + 'A1') !== null,
    'kata sandi sangat panjang DITOLAK (cap CPU, bukan cap keamanan)');
  assert(pw.checkPasswordPolicy('kucing-oranye-9') === null, 'frasa sandi wajar DITERIMA');

  /* ---------- 2. Turunan kunci ----------------------------------------------- */
  const secret = 'kucing-oranye-9';
  // Iterasi rendah HANYA untuk gerbang: 210.000 x banyak assert = menit CI.
  const stored = await pw.hashPassword(secret, { iterations: 5000 });
  assert(stored.startsWith('pbkdf2$5000$'), 'bentuk tersimpan ber-versi algoritma + iterasi');
  assert(!stored.includes(secret), 'kata sandi mentah TIDAK muncul di bentuk tersimpan');
  assert(await pw.verifyPassword(secret, stored) === true, 'kata sandi benar terverifikasi');
  assert(await pw.verifyPassword(secret + 'x', stored) === false, 'kata sandi salah ditolak');
  assert(await pw.verifyPassword('', stored) === false, 'kata sandi kosong ditolak');

  const stored2 = await pw.hashPassword(secret, { iterations: 5000 });
  assert(stored !== stored2, 'salt acak: dua hash atas kata sandi SAMA tetap berbeda');
  assert(await pw.verifyPassword(secret, stored2) === true, 'hash kedua tetap terverifikasi');

  // Baris D1 rusak TIDAK boleh melempar — melempar = 500 yang membedakan akun
  // yang ada dari yang tidak (oracle enumerasi akun).
  for (const broken of [null, undefined, '', 'bukan-hash', 'pbkdf2$abc$x$y', 'argon2$1$a$b', 'pbkdf2$1$a$b']) {
    /* eslint-disable no-await-in-loop */
    let threw = false;
    let verdict = null;
    try { verdict = await pw.verifyPassword(secret, broken); } catch { threw = true; }
    assert(!threw && verdict === false,
      'hash rusak (' + String(broken) + ') menjawab false, TIDAK melempar');
  }
  assert(pw.needsRehash(stored) === true, 'hash beriterasi rendah ditandai perlu di-hash ulang');
  assert(pw.needsRehash(await pw.hashPassword(secret, { iterations: pw.PBKDF2.ITERATIONS })) === false,
    'hash beriterasi terkini tidak perlu di-hash ulang');
  assert(pw.PBKDF2.ITERATIONS >= 210000, 'iterasi produksi >= rekomendasi OWASP 2023');

  assert(pw.constantTimeEqual('abc', 'abc') === true, 'banding waktu-tetap: sama = true');
  assert(pw.constantTimeEqual('abc', 'abd') === false, 'banding waktu-tetap: beda = false');
  assert(pw.constantTimeEqual('abc', 'abcd') === false, 'banding waktu-tetap: panjang beda = false');

  /* ---------- 3. Matriks peran ----------------------------------------------- */
  const { ROLE, CAP } = rc;
  assert(rc.ROLES.length === 3, 'tepat tiga peran');
  assert(rc.normalizeRole('OWNER') === ROLE.OWNER, 'peran dinormalkan huruf besar-kecil');
  assert(rc.normalizeRole('superadmin') === null, 'peran karangan -> null');
  assert(rc.normalizeRole(null) === null, 'peran null -> null');
  assert(rc.normalizeRole('') === null, 'peran kosong -> null (BUKAN default learner)');

  const teacherCaps = Object.values(CAP).filter((c) => c.startsWith('teacher:'));
  const ownerCaps = Object.values(CAP).filter((c) => c.startsWith('owner:'));
  for (const cap of teacherCaps) {
    assert(rc.hasCapability(ROLE.LEARNER, cap) === false, 'learner TIDAK memegang ' + cap);
    assert(rc.hasCapability(ROLE.OWNER, cap) === false,
      'owner TIDAK memegang ' + cap + ' (tanpa hierarki peran, §18)');
  }
  for (const cap of ownerCaps) {
    assert(rc.hasCapability(ROLE.LEARNER, cap) === false, 'learner TIDAK memegang ' + cap);
    assert(rc.hasCapability(ROLE.TEACHER, cap) === false, 'teacher TIDAK memegang ' + cap);
  }
  assert(rc.hasCapability(ROLE.TEACHER, CAP.TEACHER_CONTENT_WRITE) === true,
    'teacher memegang tulis konten guru');
  assert(rc.hasCapability(ROLE.OWNER, CAP.OWNER_INVITE) === true, 'owner memegang cetak undangan');
  assert(rc.hasCapability('teacher ', CAP.TEACHER_CLASS) === true, 'spasi tepi dinormalkan');
  assert(rc.hasCapability(undefined, CAP.LEARNER_SELF) === false, 'peran absen = fail-closed');

  /* ---------- 4. Otorisasi rute + cangkang ----------------------------------- */
  assert(rc.authorizeRoute({ role: ROLE.LEARNER, pathname: '/api/teacher/tree' }).ok === false,
    'murid DITOLAK di rute guru');
  assert(rc.authorizeRoute({ role: ROLE.TEACHER, pathname: '/api/owner/teachers' }).ok === false,
    'guru DITOLAK di rute owner');
  assert(rc.authorizeRoute({ role: ROLE.TEACHER, pathname: '/api/teacher/tree' }).ok === true,
    'guru DITERIMA di rute guru');
  assert(rc.authorizeRoute({ role: ROLE.OWNER, pathname: '/api/owner/teachers' }).ok === true,
    'owner DITERIMA di rute owner');
  assert(rc.authorizeRoute({ role: ROLE.OWNER, pathname: '/api/rute/karangan' }).ok === false,
    'rute tak terdaftar DITOLAK meski peran owner (fail-closed)');
  assert(rc.authorizeRoute({ role: null, pathname: '/api/account/me' }).ok === false,
    'tanpa peran = ditolak');

  // Setiap rute berdata WAJIB punya kapabilitas. Rute baru yang lupa didaftarkan
  // akan tertangkap di sini, bukan lolos terbuka ke produksi.
  for (const [route, cap] of Object.entries(rc.ROUTE_CAPABILITY)) {
    assert(Object.values(CAP).includes(cap), 'rute ' + route + ' memetakan ke kapabilitas sah');
    const holders = rc.ROLES.filter((r) => rc.hasCapability(r, cap));
    assert(holders.length >= 1, 'rute ' + route + ' dipegang setidaknya satu peran');
    // Kapabilitas ber-lingkup DIRI SENDIRI (profil, kotak notifikasi) memang
    // dipegang ketiga peran: guru dan owner juga punya akun. Itu bukan eskalasi,
    // dan datanya tetap disaring per-`sub` di handler. Yang WAJIB eksklusif
    // adalah kapabilitas berawalan `teacher:` dan `owner:` — merekalah yang
    // membuka data ORANG LAIN, dan satu saja bocor lintas peran = §34 gagal.
    if (cap.startsWith('teacher:') || cap.startsWith('owner:')) {
      assert(holders.length === 1,
        'rute ' + route + ' (' + cap + ') dipegang TEPAT satu peran');
    }
  }

  assert(rc.shellForRole(ROLE.LEARNER) === '/learner/', 'cangkang murid');
  assert(rc.shellForRole(ROLE.TEACHER) === '/teacher/', 'cangkang guru');
  assert(rc.shellForRole(ROLE.OWNER) === '/owner/', 'cangkang owner');
  assert(rc.shellForRole('hacker') === null, 'peran karangan tidak punya cangkang');
  const shells = new Set(rc.ROLES.map((r) => rc.shellForRole(r)));
  assert(shells.size === 3, 'tiga cangkang BERBEDA — bukan satu cangkang bermenu tersembunyi');

  assert(rc.canEnterShell(ROLE.LEARNER, '/teacher/lessons') === false,
    'murid tidak bisa masuk cangkang guru');
  assert(rc.canEnterShell(ROLE.TEACHER, '/owner/metrics') === false,
    'guru tidak bisa masuk cangkang owner');
  assert(rc.canEnterShell(ROLE.TEACHER, '/teacher/lessons') === true, 'guru masuk cangkangnya');
  assert(rc.shellOwnerOf('/teacher/csv/import') === ROLE.TEACHER, 'pemilik cangkang dikenali');
  assert(rc.shellOwnerOf('/') === null, 'akar bukan milik cangkang mana pun');

  // Navigasi: menu guru/owner tidak boleh bocor ke murid dan sebaliknya.
  const learnerNav = rc.navigationFor(ROLE.LEARNER);
  const teacherNav = rc.navigationFor(ROLE.TEACHER);
  const ownerNav = rc.navigationFor(ROLE.OWNER);
  assert(!learnerNav.some((k) => teacherNav.includes(k) && k !== 'notifications' && k !== 'profile'),
    'menu khas guru TIDAK muncul di navigasi murid');
  assert(!ownerNav.includes('questionbank'), 'owner tidak punya menu bank soal guru');
  assert(learnerNav.includes('braincore') && learnerNav.includes('friends'),
    'navigasi murid memuat Braincore + Teman (§2)');
  assert(teacherNav.includes('csv-import') && teacherNav.includes('csv-export'),
    'navigasi guru memuat impor + ekspor CSV (§2)');
  assert(rc.navigationFor('penyusup').length === 0,
    'peran tak dikenal mendapat menu KOSONG, bukan menu orang lain');

  /* ---------- 5. Undangan guru ----------------------------------------------- */
  const NOW = 1_800_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  const good = { teacherName: 'Bu Rani', institution: 'ABC Bimbel', institutionType: 'tutoring', ownerSub: 'own1' };

  assert(iv.checkInviteInput({ ...good, teacherName: '  ' }) !== null, 'nama guru kosong ditolak');
  assert(iv.checkInviteInput({ ...good, institution: '' }) !== null, 'institusi kosong ditolak');
  assert(iv.checkInviteInput({ ...good, institutionType: 'kampus' }) !== null,
    'jenis institusi di luar enum ditolak');
  assert(iv.checkInviteInput(good) === null, 'masukan undangan sah diterima');
  assert(iv.INSTITUTION_TYPES.length === 4, 'empat jenis institusi (§22)');

  const minted = await iv.mintInvite(good, NOW);
  assert(minted.code.length === iv.INVITE.CODE_LENGTH, 'kode 32 char');
  assert(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]+$/.test(minted.code),
    'kode memakai alfabet tanpa 0/O/1/I yang membingungkan saat dibacakan');
  assert(!('code' in minted.record), 'baris D1 TIDAK memuat teks token');
  assert(!Object.values(minted.record).includes(minted.code),
    'teks token TIDAK muncul di nilai kolom mana pun');
  assert(minted.record.code_hash.length === 64, 'yang disimpan adalah sha256 hex');
  assert(minted.record.expires_at === NOW + iv.INVITE.TTL_DAYS * DAY, 'TTL 14 hari');

  const hash = await iv.hashCode(minted.code);
  assert(iv.inviteStatus(minted.record, NOW) === 'ACTIVE', 'undangan baru = ACTIVE');
  assert(iv.checkRedeemable(minted.record, NOW, hash) === null, 'undangan aktif bisa ditukar');

  // Normalisasi masukan guru: dia mengetik ulang dari kertas.
  const spaced = minted.code.slice(0, 4) + '-' + minted.code.slice(4).toLowerCase();
  assert(await iv.hashCode(spaced) === hash, 'kode ber-tanda-hubung/huruf kecil tetap cocok');
  assert(iv.codeWellFormed(minted.code) === true, 'kode sah lolos pemeriksaan bentuk');
  assert(iv.codeWellFormed('PENDEK') === false, 'kode pendek ditolak sebelum menyentuh D1');
  assert(iv.codeWellFormed(minted.code.slice(0, 31) + '0') === false,
    'kode ber-karakter di luar alfabet ditolak');

  // SEKALI PAKAI (§22, §28 "token reuse").
  const used = { ...minted.record, used_at: NOW + 1000, used_by: 'guru1' };
  assert(iv.inviteStatus(used, NOW + 2000) === 'USED', 'undangan terpakai = USED');
  assert(iv.checkRedeemable(used, NOW + 2000, hash).problem === iv.INVITE_PROBLEM.NOT_ACTIVE,
    'undangan terpakai TIDAK bisa dipakai ulang');

  // KEDALUWARSA — diturunkan dari jam, tanpa cron.
  assert(iv.inviteStatus(minted.record, NOW + 15 * DAY) === 'EXPIRED', 'lewat TTL = EXPIRED');
  assert(iv.checkRedeemable(minted.record, NOW + 15 * DAY, hash).problem === iv.INVITE_PROBLEM.NOT_ACTIVE,
    'undangan kedaluwarsa ditolak');

  // DICABUT.
  const revoked = { ...minted.record, revoked_at: NOW + 100 };
  assert(iv.inviteStatus(revoked, NOW + 200) === 'REVOKED', 'undangan dicabut = REVOKED');
  assert(iv.checkRedeemable(revoked, NOW + 200, hash) !== null, 'undangan dicabut ditolak');
  assert(iv.inviteStatus({ ...used, revoked_at: NOW + 5000 }, NOW + 6000) === 'REVOKED',
    'REVOKED menang atas USED — owner melihat tindakannya sendiri');

  // TEBAKAN token.
  assert(iv.checkRedeemable(minted.record, NOW, await iv.hashCode(iv.generateCode())).problem
    === iv.INVITE_PROBLEM.NOT_FOUND, 'token tebakan ditolak');
  assert(iv.checkRedeemable(null, NOW, hash).problem === iv.INVITE_PROBLEM.NOT_FOUND,
    'undangan tak ada ditolak dengan alasan yang SAMA dengan token salah (anti-oracle)');

  const codes = new Set();
  for (let i = 0; i < 200; i += 1) codes.add(iv.generateCode());
  assert(codes.size === 200, '200 kode berturut-turut semuanya unik (CSPRNG, bukan Math.random)');

  const view = iv.publicInviteView(minted.record, NOW);
  assert(!('code_hash' in view), 'tampilan owner TIDAK memuat code_hash');
  assert(view.status === 'ACTIVE' && view.institution === 'ABC Bimbel', 'tampilan owner berisi status + institusi');

  /* ---------- 6. Eskalasi peran ---------------------------------------------- */
  // Peran tidak punya jalur masuk dari klien: `authorizeRoute` hanya membaca
  // `role`, dan sumber `role` di rute adalah baris D1. Yang bisa diuji di sini
  // adalah bahwa nilai karangan tidak pernah lolos jadi izin.
  for (const forged of ['owner ', 'Owner', 'OWNER', 'admin', 'root', '*', 'learner,owner', 0, {}, []]) {
    const normalized = rc.normalizeRole(forged);
    const legit = typeof forged === 'string' && ['owner', 'teacher', 'learner'].includes(forged.trim().toLowerCase());
    assert(legit ? normalized !== null : normalized === null,
      'peran palsu ' + JSON.stringify(forged) + ' tidak menjadi izin');
  }
  assert(rc.authorizeRoute({ role: 'owner,teacher', pathname: '/api/owner/teachers' }).ok === false,
    'peran ganda ber-koma tidak lolos');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('auth-role-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('auth-role-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('auth-role-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
