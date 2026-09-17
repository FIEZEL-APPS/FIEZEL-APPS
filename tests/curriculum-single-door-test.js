// tests/curriculum-single-door-test.js — konsol kurikulum hanya punya SATU pintu,
// dan pintu itu adalah KelasKu.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Keputusan owner (14 September 2026): guru dan murid yang sudah punya akun
// KelasKu tidak boleh diminta identitas kedua untuk membuka Kurikulum &
// Kompetensi. Sebelum itu mesin kurikulum punya TIGA pintu sendiri — token
// undangan `FZG-`, email+sandi, dan sesi Google — masing-masing dengan daftar
// penggunanya sendiri di Mongo, terpisah total dari D1 KelasKu yang dipakai
// dashboard owner. Token `FZG-` bahkan tidak punya satu pun antarmuka penerbit.
//
// Pintu yang dihapus dari LAYAR tetapi masih hidup di SERVER bukan pintu yang
// tertutup: ia pintu yang tidak terlihat. Karena itu gerbang ini memeriksa
// keduanya — naskah layar DAN rute server — lalu menuntut jalur penggantinya
// benar-benar terpasang di ketiga lapis (klien, Worker, FastAPI).
//
// Gerbang ini membaca kode sebagai teks, dan itu disengaja: klaim di sini adalah
// klaim tentang APA YANG TIDAK ADA. Ketiadaan tidak bisa dibuktikan dengan
// memanggil fungsi — hanya dengan menyisir berkasnya.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

/* Komentar dibuang sebelum disisir. Berkas-berkas ini MENJELASKAN pintu lama
   dalam prosa ("versi lama menerima X-Owner-Token…") supaya pembaca berikutnya
   tahu ke mana perginya, dan pemindai yang membaca prosa sebagai kode sudah dua
   kali salah menuduh di repo ini (m025-285, m025-298). */
function tanpaKomentarJs(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
function tanpaKomentarPy(src) {
  return src.replace(/"""[\s\S]*?"""/g, '').replace(/^\s*#.*$/gm, '');
}
function tanpaKomentarHtml(src) {
  return src.replace(/<!--[\s\S]*?-->/g, '');
}

const authPy = tanpaKomentarPy(baca('backend/auth.py'));
const seedPy = tanpaKomentarPy(baca('backend/seed.py'));
const fzApi = tanpaKomentarJs(baca('features/curriculum/fz-api.js'));
const konsolGuru = tanpaKomentarJs(baca('features/curriculum/teacher-console.js'));
const misiMurid = tanpaKomentarJs(baca('features/curriculum/learning-mission.js'));
const kurikulumHtml = tanpaKomentarHtml(baca('kurikulum.html'));
const misiHtml = tanpaKomentarHtml(baca('misi.html'));

/* ------------------------------------------------------------------ dicabut */

const PINTU_LAMA_SERVER = [
  ['rute token guru `FZG-`', /@router\.post\(\s*["']\/teacher\/token["']/],
  ['penerbit undangan `FZG-`', /teacher-invites/],
  ['koleksi Mongo teacher_invites', /teacher_invites/],
  ['pendaftaran email\+sandi', /@router\.post\(\s*["']\/register["']/],
  ['login email\+sandi', /@router\.post\(\s*["']\/login["']/],
  ['sesi Google', /google\/session/],
  ['kunci utama X-Owner-Token', /X-Owner-Token/],
  ['penyimpanan kata sandi', /password_hash|bcrypt/]
];

PINTU_LAMA_SERVER.forEach(function (pair) {
  test('backend/auth.py tidak lagi memuat ' + pair[0], () => {
    assert.ok(!pair[1].test(authPy),
      'pintu lama masih hidup di server. Pintu yang hilang dari layar tetapi ada di ' +
      'server bukan pintu tertutup — ia pintu yang tidak terlihat, dan siapa pun yang ' +
      'tahu alamatnya tetap bisa lewat.');
  });
});

test('seed.py tidak lagi bergantung pada kunci utama owner', () => {
  assert.ok(!/X-Owner-Token/.test(seedPy), 'seed.py masih menerima kunci utama');
});

test('backend/db.py tidak lagi membuat indeks untuk daftar guru sendiri', () => {
  assert.ok(!/teacher_invites/.test(tanpaKomentarPy(baca('backend/db.py'))),
    'indeks teacher_invites masih dibuat — koleksinya seharusnya tidak ada lagi');
});

const PINTU_LAMA_KLIEN = [
  ['fz-api.js', fzApi, /teacherToken|studentLogin|studentRegister|googleSession/],
  ['teacher-console.js', konsolGuru, /teacher-token-input|FZG-/],
  ['learning-mission.js', misiMurid, /login-password|reg-password|auth\.emergentagent\.com/]
];

PINTU_LAMA_KLIEN.forEach(function (row) {
  test(row[0] + ' tidak lagi menawarkan pintu lama di layar', () => {
    assert.ok(!row[2].test(row[1]),
      'naskah pintu lama masih dirender — murid/guru akan melihat kolom isian yang ' +
      'tidak lagi punya rute di server');
  });
});

/* ------------------------------------------------------------------ terpasang */

test('fz-api.js punya penukar tiket KelasKu, dan alamatnya dari FIEZEL_CF_CONFIG', () => {
  assert.ok(/curriculum-ticket/.test(fzApi), 'fz-api.js tidak pernah meminta tiket');
  assert.ok(/FIEZEL_CF_CONFIG/.test(fzApi),
    'alamat Worker disalin ke berkas ini alih-alih dibaca dari konfigurasi yang sama ' +
    'dengan KelasKu — sumber kedua yang bisa menyimpang diam-diam');
  assert.ok(/credentials:\s*'include'/.test(fzApi),
    'permintaan tiket tidak mengirim cookie identitas, jadi Worker tidak akan pernah ' +
    'tahu siapa yang meminta');
  assert.ok(/\/auth\/kelasku/.test(fzApi), 'tiket tidak pernah ditukar ke mesin kurikulum');
});

test('Worker punya rute penerbit tiket, dan rutenya dijaga roleGate', () => {
  const rute = baca('workers/api/route-account.js');
  assert.ok(/'\/api\/account\/curriculum-ticket'/.test(rute), 'rute tiket tidak terdaftar');
  const i = rute.indexOf('export async function routeCurriculumTicket');
  assert.ok(i > 0, 'handler tiket tidak ditemukan');
  const badan = rute.slice(i, i + 1400);
  assert.ok(/roleGate\(ctx\)/.test(badan),
    'handler tiket tidak memanggil gerbang peran — siapa pun bisa meminta tiket atas ' +
    'nama siapa pun');
  assert.ok(!/body\.(value\.)?role/.test(badan),
    'peran dibaca dari body: otorisasi tidak pernah boleh datang dari klien');
});

test('rute tiket punya baris di matriks kapabilitas', () => {
  assert.ok(/'\/api\/account\/curriculum-ticket':\s*CAP\./.test(baca('workers/api/auth/role-core.js')),
    'rute berdata tanpa baris matriks akan DITOLAK gerbang — atau lebih buruk, lolos diam-diam');
});

test('backend punya pintu KelasKu, dan tiket sekali pakai benar-benar dibakar', () => {
  assert.ok(/@router\.post\(\s*["']\/kelasku["']/.test(authPy), 'rute /auth/kelasku tidak ada');
  assert.ok(/kelasku_tickets/.test(authPy),
    'tiket tidak pernah dicatat sebagai terpakai — tiket yang tercuri bisa dipakai ulang ' +
    'selama sisa umurnya');
  assert.ok(/verify_ticket/.test(authPy), 'tiket tidak diverifikasi');
});

/* DUA ASSERT DI BAWAH LAHIR DARI REVIEW gitar-bot di PR #428, dan keduanya menjaga
   kelas cacat yang sama: pengaman yang TERLIHAT ada tetapi tidak menjaga apa pun. */

test('catatan "tiket sudah dipakai" hidup selama tiketnya MASIH DITERIMA', () => {
  const i = authPy.indexOf('async def _burn_ticket');
  const badan = authPy.slice(i, i + 900);
  assert.ok(/exp \+ TICKET_CLOCK_SKEW_SECONDS/.test(badan),
    'umur baris dedup diikat ke `exp` saja. verify_ticket menerima tiket sampai ' +
    '`exp + TICKET_CLOCK_SKEW_SECONDS`, jadi indeks TTL bisa menyapu catatan ' +
    '"sudah dipakai" sementara tiketnya masih diterima — jendela pemakaian ulang ' +
    'sampai 60 detik, tepat di pengaman yang ada untuk menutupnya.');
});

test('hanya tabrakan kunci yang jadi 401; galat Mongo lain tetap 5xx', () => {
  const i = authPy.indexOf('async def _burn_ticket');
  const badan = authPy.slice(i, i + 900);
  assert.ok(/except DuplicateKeyError/.test(badan),
    'penangkapnya bukan DuplicateKeyError');
  assert.ok(!/except Exception/.test(badan),
    '`except Exception` menelan gangguan MongoDB menjadi "tiket tidak berlaku, muat ' +
    'ulang" — pengguna memuat ulang, mendapat tiket baru, gagal lagi, dan gangguan ' +
    'infrastruktur menyamar sebagai kesalahan pengguna.');
});

test('peran murid adalah jatuhan bawaan, bukan guru', () => {
  const kelasku = tanpaKomentarPy(baca('backend/kelasku.py'));
  const m = kelasku.match(/ROLE_MAP\.get\([^,]+,\s*"([a-z]+)"\)/);
  assert.ok(m, 'pemetaan peran tidak ditemukan');
  assert.strictEqual(m[1], 'student',
    'peran tak dikenal jatuh ke ' + m[1] + '. Kegagalan pemetaan harus MENUTUP pintu, ' +
    'bukan membukanya.');
});

test('peran diselaraskan ulang setiap masuk, bukan hanya saat akun dibuat', () => {
  const i = authPy.indexOf('async def kelasku_login');
  const badan = authPy.slice(i, i + 2600);
  assert.ok(/update_one[\s\S]{0,200}"role": role/.test(badan),
    'peran hanya ditulis saat pembuatan akun. Guru yang dicabut owner di KelasKu akan ' +
    'tetap memegang akses guru di sini selamanya.');
});

test('kedua halaman konsol memuat konfigurasi KelasKu (core-config.js)', () => {
  [['kurikulum.html', kurikulumHtml], ['misi.html', misiHtml]].forEach(function (row) {
    assert.ok(/<script[^>]+core-config\.js/.test(row[1]),
      row[0] + ' tidak memuat core-config.js — FIEZEL_CF_CONFIG tidak ada di sana, jadi ' +
      'tiket tidak akan pernah bisa diminta');
  });
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('curriculum-single-door-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('curriculum-single-door-test GAGAL: ' + failures.length + ' assert merah');
  console.log('curriculum-single-door-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('curriculum-single-door-test: ' + pass + '/' + total + ' assert PASS');
