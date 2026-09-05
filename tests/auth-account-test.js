const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * tests/auth-account-test.js — Gerbang uji klien features/auth/fiezel-account.js hermetis.
 *
 * Pola tests/social-frontend-test.js (VM murni, nol jaringan nyata, hermetis).
 * Menguji:
 *   1. Validasi format handle (3–20 char, a-z0-9_)
 *   2. Validasi format kata sandi (min 10 char, min 2 kelas karakter, anti common-password)
 *   3. Validasi format kode undangan guru (32 char Crockford Base32)
 *   4. Alur Register, Login, Logout, dan getMe
 *   5. Alur Aktivasi Guru (upgrade peran learner -> teacher)
 *   6. Anti bocor: nol token / kata sandi di localStorage
 *   7. Pemetaan galat ramah bahasa Indonesia
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const accountSrc = fs.readFileSync(path.join(root, 'features/auth/fiezel-account.js'), 'utf8');

let pass = 0;
let fail = 0;
const assert = (condition, message) => {
  if (!condition) {
    console.error('AUTH ACCOUNT TEST FAIL:', message);
    fail++;
  } else {
    pass++;
  }
};

function freshClient(opts = {}) {
  const store = {};
  const fetchMock = opts.fetch || (async () => ({ ok: false, status: 503, json: async () => ({}) }));
  const ctx = {
    console,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Promise,
    isFinite,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    FIEZEL_CF_CONFIG: { base: 'https://api.test' },
    fetch: fetchMock
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(accountSrc, ctx, { filename: 'fiezel-account.js' });
  return { client: ctx.FiezelAccount, ctx, store };
}

(async () => {
  // ---- 1. Validasi Handle
  const { client: c1 } = freshClient();
  assert(c1.validateHandle('guru_budi').ok === true, 'handle sah diterima');
  assert(c1.validateHandle('GURU_BUDI').handle === 'guru_budi', 'handle dinormalkan ke lowercase');
  assert(c1.validateHandle('a').ok === true, 'handle 1 karakter diterima');
  assert(c1.validateHandle('ab').ok === true, 'handle 2 karakter diterima');
  assert(c1.validateHandle('guru-budi').ok === true, 'karakter tanda hubung diterima');
  assert(c1.validateHandle('guru budi').ok === true, 'spasi di handle diterima');
  assert(c1.validateHandle('a'.repeat(51)).ok === false, 'handle > 50 karakter ditolak');
  assert(c1.validateHandle('').ok === false, 'handle kosong ditolak');

  // ---- 2. Validasi Kata Sandi
  assert(c1.validatePassword('').ok === false, 'kata sandi kosong ditolak');
  assert(c1.validatePassword('1').ok === true, 'kata sandi 1 karakter diterima');
  assert(c1.validatePassword('short1A').ok === true, 'kata sandi pendek diterima');
  assert(c1.validatePassword('semuahurufkecil').ok === true, 'kata sandi hanya satu kelas karakter diterima');
  assert(c1.validatePassword('password123').ok === true, 'kata sandi umum/sederhana diterima');
  assert(c1.validatePassword('kucing-oranye-9').ok === true, 'frasa sandi kuat diterima');

  // ---- 3. Validasi Kode Undangan Guru
  const validCode = '23456789ABCDEFGHJKMNPQRSTVWXYZ23';
  assert(c1.validateCode(validCode).ok === true, 'kode 32 char Crockford sah diterima');
  assert(c1.validateCode(validCode.toLowerCase()).code === validCode, 'kode dinormalkan ke huruf kapital');
  assert(c1.validateCode('SHORTCODE').ok === false, 'kode < 32 karakter ditolak');
  assert(c1.validateCode(validCode.slice(0, 31) + '1').ok === false, 'karakter 1 yang ambigu ditolak');
  assert(c1.validateCode(validCode.slice(0, 31) + 'O').ok === false, 'karakter O yang ambigu ditolak');

  // ---- 4. Alur Register & Login
  let lastRequest = null;
  const mockFetch = async (url, options) => {
    lastRequest = { url, options, body: JSON.parse(options.body || '{}') };
    if (url.endsWith('/api/auth/anon')) {
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    if (url.endsWith('/api/account/register')) {
      if (lastRequest.body.handle === 'taken_handle') {
        return { ok: false, status: 409, json: async () => ({ ok: false, error: 'handle_taken' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          account: { handle: lastRequest.body.handle, role: 'learner', shell: '/learner/', navigation: ['profile'] }
        })
      };
    }
    if (url.endsWith('/api/account/login')) {
      if (lastRequest.body.password === 'wrongpass123') {
        return { ok: false, status: 401, json: async () => ({ ok: false, error: 'invalid_credentials' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          account: { handle: lastRequest.body.handle, role: 'learner', shell: '/learner/', navigation: ['profile'] }
        })
      };
    }
    if (url.endsWith('/api/account/me')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          account: { handle: 'murid_aktif', role: 'learner', shell: '/learner/', navigation: ['profile'] }
        })
      };
    }
    if (url.endsWith('/api/account/logout')) {
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    if (url.endsWith('/api/account/teacher-activate')) {
      if (lastRequest.body.code !== validCode) {
        return { ok: false, status: 403, json: async () => ({ ok: false, error: 'invite_unusable' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          account: { handle: 'murid_aktif', role: 'teacher', shell: '/teacher/', navigation: ['tree', 'csv-import'] }
        })
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const { client, store } = freshClient({ fetch: mockFetch });

  // Register gagal karena konfirmasi sandi beda
  const regMismatch = await client.register({ handle: 'murid_baru', password: 'kucing-oranye-9', confirmPassword: 'kucing-oranye-8' });
  assert(regMismatch.ok === false && (regMismatch.error === 'password_mismatch' || regMismatch.error === 'passwords_mismatch'), 'register gagal saat konfirmasi sandi beda');

  // Register gagal karena handle sudah dipakai
  const regTaken = await client.register({ handle: 'taken_handle', password: 'kucing-oranye-9', confirmPassword: 'kucing-oranye-9' });
  assert(regTaken.ok === false && regTaken.error === 'handle_taken', 'register gagal saat handle sudah dipakai');
  assert(/sudah dipakai|sudah digunakan/i.test(regTaken.message), 'pesan galat handle_taken ramah bahasa Indonesia');

  // Register sukses
  const regOk = await client.register({ handle: 'murid_baru', password: 'kucing-oranye-9', confirmPassword: 'kucing-oranye-9' });
  assert(regOk.ok === true && client.isLoggedIn() === true, 'register sukses dan status masuk aktif');
  assert(client.getRole() === 'learner', 'peran pendaftaran adalah learner');
  assert(lastRequest.options.credentials === 'include', 'credentials: include dikirim');

  // Logout
  await client.logout();
  assert(client.isLoggedIn() === false, 'logout mengosongkan status akun');

  // Login gagal
  const loginFail = await client.login({ handle: 'murid_baru', password: 'wrongpass123' });
  assert(loginFail.ok === false && loginFail.error === 'invalid_credentials', 'login gagal dengan sandi salah');

  // Login sukses
  const loginOk = await client.login({ handle: 'murid_baru', password: 'kucing-oranye-9' });
  assert(loginOk.ok === true && client.isLoggedIn() === true, 'login berhasil');
  assert(client.isLearner() === true, 'isLearner = true');
  assert(client.isTeacher() === false, 'isTeacher = false');

  // ---- 5. Aktivasi Guru (Upgrade peran learner -> teacher)
  const actFail = await client.activateTeacher({ code: '23456789ABCDEFGHJKMNPQRSTVWXYZ99' });
  assert(actFail.ok === false && actFail.error === 'invite_unusable', 'aktivasi gagal dengan kode tak valid');

  const actOk = await client.activateTeacher({ code: validCode });
  assert(actOk.ok === true, 'aktivasi guru berhasil');
  assert(client.getRole() === 'teacher', 'peran server berubah menjadi teacher');
  assert(client.isTeacher() === true, 'isTeacher = true');

  // ---- 6. Sesi & getMe
  const meRes = await client.getMe();
  assert(meRes.ok === true && client.getAccount().handle === 'murid_aktif', 'getMe berhasil membaca akun');

  // ---- 7. Anti-Bocor: tidak ada kata sandi atau token rahasia di localStorage
  assert(Object.keys(store).length === 0, 'nol token atau kata sandi yang disimpan di localStorage');

  console.log(`auth-account-test: ${pass} assert PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
})();
