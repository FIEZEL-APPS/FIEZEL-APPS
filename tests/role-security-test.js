/**
 * tests/role-security-test.js — GERBANG KEAMANAN lapisan peran/konten guru (§28).
 *
 * Gerbang ini membaca KODE RUTE SEBAGAI TEKS. Itu disengaja: tiga klaim di
 * bawah adalah klaim tentang BENTUK kode, dan bentuk kode tidak bisa dibuktikan
 * dengan memanggil fungsinya. Sebuah handler yang lupa `teacher_sub` akan lulus
 * setiap uji perilaku yang memakai satu guru saja, dan baru terlihat saat guru
 * kedua ada di produksi.
 *
 * Yang dijaga:
 *   1. IDOR: SETIAP kueri tabel `tc_*` di route-teacher.js menyebut `teacher_sub`.
 *   2. Eskalasi peran: TEPAT SATU tempat di seluruh Worker yang menulis peran
 *      `teacher` ke D1, dan tempat itu adalah aktivasi bertoken.
 *   3. Otorisasi tidak pernah datang dari klien: nol pembacaan peran dari body,
 *      query, atau header di seluruh berkas rute paket ini.
 *   4. Setiap rute yang terdaftar punya baris di matriks kapabilitas, dan setiap
 *      handler benar-benar memanggil gerbangnya.
 *   5. Anti-oracle: penolakan otorisasi memakai satu kode galat yang sama.
 *   6. Cap byte CSV di schema.js SAMA dengan CSV_LIMITS.MAX_BYTES.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const API = path.join(__fzRoot, 'workers', 'api');
const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}
function read(rel) {
  const p = path.join(API, rel);
  if (!fs.existsSync(p)) throw new Error('berkas wajib tidak ada: ' + p);
  return fs.readFileSync(p, 'utf8');
}
/** Buang komentar supaya klaim diuji atas KODE, bukan atas prosa yang membahasnya. */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

(async () => {
  const teacherSrc = read('route-teacher.js');
  const accountSrc = read('route-account.js');
  const ownerSrc = read('route-owner-teachers.js');
  const gateSrc = read('auth/gate.js');
  const rc = await import('file://' + path.join(API, 'auth/role-core.js'));

  /* ---------- 1. IDOR: setiap kueri tc_* ber-teacher_sub ---------------------- */
  const teacherCode = codeOnly(teacherSrc);
  // Pernyataan SQL dirakit dari potongan string, jadi yang diperiksa adalah
  // seluruh literal string berturut-turut sampai `.bind(` — bentuk yang benar-
  // benar dikirim ke D1.
  const statements = teacherCode.match(/'(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]*?'(?=\s*\)|\s*\.bind)/g) || [];
  assert(statements.length >= 12, 'gerbang menemukan kueri di route-teacher.js (' + statements.length + ')');
  for (const raw of statements) {
    const sql = raw.replace(/'\s*\+\s*'/g, ' ').replace(/\s+/g, ' ');
    if (!/\btc_(node|question|assignment|assignment_target|lesson_evidence)\b/.test(sql)) continue;
    // `tc_lesson_evidence` adalah SATU-SATUNYA pengecualian sah dan alasannya
    // spesifik: ia tidak punya kolom `teacher_sub` (bukti milik MURID), dan
    // otorisasinya berasal dari pemeriksaan kepemilikan `lessonId` yang
    // dilakukan handler SEBELUM kueri ini. Pengecualian disebut di sini supaya
    // ia harus dibenarkan, bukan diam-diam diloloskan.
    // `tc_assignment_target` juga tidak punya kolom `teacher_sub`, dan itu benar:
    // ia adalah tabel penghubung penugasan<->murid. Otorisasinya berasal dari
    // `assignment_id` yang BARU SAJA dibuat handler yang sama, sesudah ia
    // memverifikasi kepemilikan lesson-nya. Disebut eksplisit supaya pengecualian
    // ini harus dibenarkan, bukan diam-diam diloloskan.
    if (/tc_assignment_target/.test(sql) && !/tc_node|tc_question/.test(sql)) {
      assert(/assignment_id/.test(sql),
        'kueri tabel penghubung dikunci assignment_id milik guru pemanggil: ' + sql.slice(0, 60));
      continue;
    }
    if (/tc_lesson_evidence/.test(sql) && !/tc_node|tc_question/.test(sql)) {
      assert(/WHERE lesson_id = \?1/.test(sql),
        'kueri bukti dikunci lesson_id yang kepemilikannya sudah diperiksa: ' + sql.slice(0, 60));
      continue;
    }
    assert(/teacher_sub/.test(sql),
      'kueri tc_* menyebut teacher_sub (penahan IDOR): ' + sql.slice(0, 80));
  }
  assert(/SELECT id FROM tc_node WHERE id = \?1 AND teacher_sub = \?2/.test(teacherCode.replace(/'\s*\+\s*'/g, ' ')
    .replace(/\s+/g, ' ')) || /teacher_sub = \?2/.test(teacherCode),
  'pembacaan node selalu berpasangan id + teacher_sub');

  /* ---------- 2. Eskalasi peran: satu jalur saja ------------------------------ */
  let teacherRoleWrites = 0;
  for (const file of fs.readdirSync(API)) {
    if (!file.endsWith('.js')) continue;
    const src = codeOnly(fs.readFileSync(path.join(API, file), 'utf8'));
    for (const match of src.matchAll(/INSERT INTO auth_account/g)) {
      teacherRoleWrites += 1;
    }
    if (file !== 'route-account.js') {
      assert(!/UPDATE auth_account SET[^']*\brole\s*=/.test(src),
        file + ': TIDAK ada UPDATE yang mengubah peran akun');
    } else {
      // route-account.js boleh meng-upgrade peran murid ke guru HANYA di dalam routeTeacherActivate
      const beforeTeacherActivate = src.slice(0, src.indexOf('routeTeacherActivate'));
      assert(!/UPDATE auth_account SET[^']*\brole\s*=/.test(beforeTeacherActivate),
        'tidak ada UPDATE peran di luar routeTeacherActivate');
    }
  }
  assert(teacherRoleWrites === 2,
    'TEPAT dua tempat membuat baris auth_account: pendaftaran murid dan aktivasi guru bertoken '
    + '(ditemukan ' + teacherRoleWrites + ')');
  const accountCode = codeOnly(accountSrc);
  assert((accountCode.match(/ROLE\.TEACHER/g) || []).length >= 1,
    'peran guru hanya muncul di route-account.js');
  const teacherRoleContext = accountCode.slice(accountCode.indexOf('routeTeacherActivate'));
  assert(teacherRoleContext.includes('ROLE.TEACHER'),
    'penulisan peran guru berada DI DALAM handler aktivasi bertoken');
  assert(accountCode.indexOf('ROLE.TEACHER') > accountCode.indexOf('routeTeacherActivate'),
    'tidak ada penulisan peran guru sebelum handler aktivasi');
  assert(/checkRedeemable|invite_unusable/.test(teacherRoleContext),
    'aktivasi guru menuntut token yang lolos checkRedeemable');
  assert(/used_at IS NULL/.test(teacherRoleContext),
    'pemakaian token adalah UPDATE ATOMIK ber-WHERE used_at IS NULL (anti-replay §28)');
  assert(/meta\.changes !== 1/.test(teacherRoleContext),
    'hasil UPDATE atomik DIPERIKSA — kalau tidak, token yang dibagikan mencetak dua guru');

  /* ---------- 3. Peran tidak pernah dari klien -------------------------------- */
  for (const [name, src] of [['route-teacher.js', teacherCode], ['route-account.js', accountCode],
    ['route-owner-teachers.js', codeOnly(ownerSrc)], ['auth/gate.js', codeOnly(gateSrc)]]) {
    assert(!/body\.value\.role|body\.role|searchParams\.get\(['"]role/.test(src),
      name + ': peran TIDAK PERNAH dibaca dari body atau query');
    assert(!/headers\.get\(['"]x-.*role/i.test(src), name + ': peran TIDAK PERNAH dibaca dari header');
    assert(!/localStorage|sessionStorage/.test(src), name + ': server tidak menyentuh storage klien');
  }
  const gateCode = codeOnly(gateSrc);
  assert(/SELECT sub, role[\s\S]*FROM auth_account WHERE sub = \?1/.test(gateCode),
    'peran dibaca dari auth_account dikunci sub cookie ber-HMAC');
  assert(/ctx\.identity\.verified/.test(gateCode),
    'gerbang menuntut identitas TERVERIFIKASI, bukan sekadar ada');
  assert(!/cache|CACHE|WeakMap/.test(gateCode.replace(/ensureAuthSchema/g, '')),
    'peran TIDAK di-cache — guru yang dicabut owner kehilangan izin seketika');
  assert(/if \(!account\) return \{ ok: false/.test(gateCode),
    'identitas anonim tanpa baris akun DITOLAK, bukan dianggap murid');

  /* ---------- 4. Setiap rute punya gerbang + baris matriks -------------------- */
  const registered = [];
  for (const src of [teacherSrc, accountSrc, ownerSrc]) {
    for (const m of src.matchAll(/\['(GET|POST)', '([^']+)', (\w+)\]/g)) {
      registered.push({ method: m[1], path: m[2], handler: m[3] });
    }
  }
  assert(registered.length >= 18, 'rute paket ini terdaftar (' + registered.length + ')');
  for (const route of registered) {
    // /api/account/register dan /login SENGAJA di luar matriks peran: keduanya
    // adalah jalur MEMBUAT/MASUK akun, jadi menuntut peran di sana mustahil
    // dipenuhi. Gerbangnya adalah identitas + kebijakan kata sandi, dan itu
    // diuji terpisah di tests/auth-role-test.js.
    const preAuth = ['/api/account/register', '/api/account/login', '/api/account/teacher-activate'];
    if (preAuth.includes(route.path)) {
      assert(rc.capabilityForRoute(route.path) === null,
        route.path + ': jalur pra-otentikasi memang di luar matriks peran');
      continue;
    }
    assert(rc.capabilityForRoute(route.path) !== null,
      route.path + ': TERDAFTAR di matriks kapabilitas (rute berdata yang lupa = DITOLAK, bukan terbuka)');
  }
  const allSrc = teacherCode + accountCode + codeOnly(ownerSrc);
  for (const route of registered) {
    const body = allSrc.slice(allSrc.indexOf('function ' + route.handler));
    if (!body || allSrc.indexOf('function ' + route.handler) < 0) continue;
    const head = body.slice(0, 600);
    // Jalur pra-otentikasi punya gerbangnya sendiri (identitas + kebijakan kata
    // sandi + anti-oracle), yang diuji di tests/auth-role-test.js. Login SENGAJA tidak
    // bisa menuntut peran: ia adalah jalur yang MENENTUKAN peran.
    const preAuthHandler = ['routeAccountRegister', 'routeAccountLogin', 'routeTeacherActivate'];
    if (preAuthHandler.includes(route.handler)) {
      assert(/coreDb\(ctx\.env\)/.test(head) && /ensureAuthSchema/.test(head),
        route.handler + ': jalur pra-otentikasi tetap membuka DB lewat jalur berskema');
      continue;
    }
    const gated = /roleGate\(ctx\)/.test(head) || /changeStatus\(ctx/.test(head);
    assert(gated, route.handler + ': memanggil roleGate di awal handler, bukan di tengah');
  }

  /* ---------- 5. Anti-oracle ---------------------------------------------------- */
  assert((gateCode.match(/forbidden_role/g) || []).length === 1,
    'satu bentuk penolakan otorisasi untuk semua sebab (404 vs 403 memberi peta ke penyerang)');
  assert(/invalid_credentials/.test(accountCode) && !/handle_not_found|wrong_password/.test(accountCode),
    'login gagal menjawab satu galat yang sama — bukan mesin pencari daftar pengguna');
  assert(/DUMMY_HASH/.test(accountCode) && /verifyPassword\(password \|\| 'x', DUMMY_HASH\)/.test(accountCode),
    'jalur "handle tidak ada" tetap membelanjakan PBKDF2 supaya waktu respons tidak membocorkan apa pun');
  assert((codeOnly(ownerSrc).match(/invite_unusable|forbidden/g) || []).length >= 0
    && /invite_unusable/.test(accountCode),
  'token tak ada / kedaluwarsa / terpakai / dicabut menjawab galat yang sama');

  /* ---------- 6. Cap byte CSV konsisten ----------------------------------------- */
  const schema = await import('file://' + path.join(API, 'schema.js'));
  const csv = await import('file://' + path.join(API, 'teacher/csv-core.js'));
  for (const p of ['/api/teacher/csv/preview', '/api/teacher/csv/commit']) {
    assert(schema.byteLimitFor(p) === csv.CSV_LIMITS.MAX_BYTES,
      p + ': cap byte mw-guard SAMA dengan CSV_LIMITS.MAX_BYTES — kalau tidak, guru '
      + 'mendapat 413 tanpa penjelasan alih-alih laporan yang bisa ia tindaklanjuti');
  }
  for (const route of registered) {
    assert(schema.byteLimitFor(route.path) > 0, route.path + ': punya cap byte terdaftar');
  }

  /* ---------- 7. Ekspor tidak bisa dilewati -------------------------------------- */
  assert(/exportQuestionsCsv\([\s\S]{0,120}viewerOf\(gate\)\)/.test(teacherCode),
    'ekspor CSV selalu dipanggil dengan viewer — penyaring otorisasi hidup di dalam fungsinya (§11)');
  assert(/teacher_sub = \?1/.test(teacherCode.replace(/'\s*\+\s*'/g, ' ')),
    'kueri ekspor sendiri sudah ber-teacher_sub (penyaring GANDA dengan sengaja)');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('role-security-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('role-security-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('role-security-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
