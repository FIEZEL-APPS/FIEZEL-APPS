// tests/backend-env-contract-test.js — kontrak pemasangan backend FastAPI.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Backend `backend/` dipasang permanen di hosting cPanel, dan tiga cacat di jalur itu
// semuanya GAGAL DALAM DIAM — API tetap menjawab 200 sementara yang penting tidak
// terjadi. Ketiganya diukur sungguhan (Python 3.11, versi persis dari
// backend/requirements.txt), bukan disimpulkan dari membaca kode:
//
// 1. LIFESPAN TIDAK JALAN DI PASSENGER. Passenger berbicara WSGI, jadi a2wsgi
//    menjembatani ke ASGI — dan a2wsgi tidak menjalankan protokol lifespan sama
//    sekali. `@app.on_event("startup")` di server.py karena itu dilewati, padahal di
//    sanalah ensure_indexes(), seed_owner(), dan penyemaian kurikulum tinggal.
//    Hasil ukur: status 200 OK, body {"startup_sudah_jalan":false}. Tanpa indeks
//    unik, MongoDB dengan patuh menerima email ganda dan attempt ganda; tanpa
//    seed_owner owner tidak bisa masuk. Semuanya tanpa satu pun galat.
//    Penawarnya: backend/bootstrap.py, dijalankan sekali sebagai proses sendiri.
//
// 2. CORS BAWAAN "*" BERSAMA allow_credentials=True. Diukur pada starlette 0.37.2
//    (versi yang dipaku repo): request lintas-situs YANG MEMBAWA COOKIE dijawab
//    Allow-Origin: <origin penuntut> + Allow-Credentials: true. Artinya situs mana
//    pun bisa memanggil API ini dari browser murid yang sedang login dan MEMBACA
//    jawabannya. Bawaannya kini gagal-tertutup (daftar kosong = tidak ada yang
//    diizinkan), dan gerbang ini melarang "*" kembali jadi bawaan.
//
// 3. ENV WAJIB YANG TIDAK TERDOKUMENTASI. db.py dan auth.py memakai
//    os.environ["NAMA"] — bukan .get() — jadi yang kurang mematikan server saat
//    start. Menambah satu env baru tanpa menambahkannya ke .env.example berarti
//    pemasang berikutnya menemukan servernya mati tanpa tahu apa yang kurang.
//    Daftarnya TIDAK ditulis tangan di sini: gerbang memindai backend/*.py dan
//    menuntut setiap nama yang ditemukannya ada di .env.example. Env berikutnya
//    ikut terjaga tanpa ada daftar yang perlu disunting.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
const ada = (p) => fs.existsSync(path.join(__fzRoot, p));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

/* Komentar dan docstring dibuang sebelum memindai os.environ[...]. Berkas-berkas ini
   MENYEBUT nama env di dalam prosa penjelasnya (passenger_wsgi.py dan bootstrap.py
   keduanya panjang komentarnya), dan pemindai yang membaca prosa sebagai kode adalah
   kesalahan yang sudah berulang di repo ini. */
function kodeSaja(py) {
  return py
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/'''[\s\S]*?'''/g, '')
    .replace(/(^|\n)\s*#[^\n]*/g, '$1');
}

const berkasPy = fs.readdirSync(path.join(__fzRoot, 'backend'))
  .filter((f) => f.endsWith('.py'))
  .map((f) => ({ nama: f, kode: kodeSaja(baca(path.join('backend', f))) }));

test('pemindai menemukan berkas Python backend (bukan ruang kosong)', () => {
  assert.ok(berkasPy.length >= 5,
    'hanya ' + berkasPy.length + ' berkas .py ditemukan di backend/ — entah backendnya ' +
    'pindah, entah pemindai gerbang ini yang rusak; keduanya wajib diperiksa tangan');
});

/* ── 1. Kontrak env: setiap os.environ["X"] wajib ada di .env.example ───────────── */

const envWajib = new Set();
berkasPy.forEach((b) => {
  const re = /os\.environ\[["']([A-Z][A-Z0-9_]*)["']\]/g;
  let m;
  while ((m = re.exec(b.kode)) !== null) envWajib.add(m[1]);
});

test('backend memang menuntut env wajib (pemindainya hidup)', () => {
  assert.ok(envWajib.size >= 5,
    'hanya ' + envWajib.size + ' env wajib terdeteksi; pemindai kemungkinan rusak');
});

test('.env.example ada', () => {
  assert.ok(ada('backend/.env.example'),
    'backend/.env.example hilang — pemasang tidak punya daftar apa pun untuk diisi');
});

test('setiap env wajib terdokumentasi di .env.example', () => {
  const contoh = ada('backend/.env.example') ? baca('backend/.env.example') : '';
  const hilang = [...envWajib].filter((n) => !new RegExp('^\\s*#?\\s*' + n + '\\s*=', 'm').test(contoh));
  assert.strictEqual(hilang.length, 0,
    'dipakai os.environ[...] tapi tidak disebut di .env.example: ' + hilang.join(', ') +
    ' — server akan mati saat start dan pemasang tidak tahu apa yang kurang');
});

test('.env asli tidak pernah ikut ter-commit', () => {
  assert.ok(!ada('backend/.env'),
    'backend/.env ada di repo — itu berisi MONGO_URL, JWT_SECRET, dan sandi owner');
});

/* ── 2. CORS gagal-tertutup ─────────────────────────────────────────────────────── */

const server = baca('backend/server.py');
const kodeServer = kodeSaja(server);

test('CORS_ORIGINS TIDAK berbawaan "*"', () => {
  assert.ok(!/os\.environ\.get\(\s*["']CORS_ORIGINS["']\s*,\s*["']\*["']\s*\)/.test(kodeServer),
    'bawaan "*" kembali. Diukur pada starlette 0.37.2: bersama allow_credentials=True, ' +
    'request lintas-situs yang membawa cookie dijawab dengan origin penuntutnya ' +
    'DIPANTULKAN + Allow-Credentials: true — situs mana pun lalu bisa membaca data ' +
    'murid yang sedang login');
});

test('"*" dan kredensial tidak pernah menyala bersamaan', () => {
  assert.ok(/allow_credentials\s*=\s*(?!True\b)/.test(kodeServer),
    'allow_credentials dipaku True. Ia harus mati ketika origin "*" dipakai, karena ' +
    '"terbuka untuk semua" dan "bawa cookie" tidak pernah boleh benar bersamaan');
});

/* ── 3. Jalur Passenger: lifespan ditutupi bootstrap ────────────────────────────── */

test('entri Passenger ada', () => {
  assert.ok(ada('backend/passenger_wsgi.py'),
    'backend/passenger_wsgi.py hilang — cPanel tidak punya titik masuk');
});

test('a2wsgi terpaku di requirements (jembatan WSGI->ASGI)', () => {
  assert.ok(/^a2wsgi==\d+\.\d+/m.test(baca('backend/requirements.txt')),
    'a2wsgi tidak terpaku; passenger_wsgi.py akan mati saat impor di server');
});

test('bootstrap sekali-jalan ada', () => {
  assert.ok(ada('backend/bootstrap.py'),
    'backend/bootstrap.py hilang — di Passenger lifespan TIDAK jalan, jadi tanpa ' +
    'berkas ini indeks unik, akun owner, dan semaian kurikulum tidak pernah dibuat ' +
    'sementara API tetap menjawab 200');
});

test('bootstrap benar-benar mengerjakan KETIGA tugas startup', () => {
  const boot = kodeSaja(baca('backend/bootstrap.py'));
  const kurang = [];
  if (!/ensure_indexes\s*\(/.test(boot)) kurang.push('ensure_indexes()');
  if (!/seed_owner\s*\(/.test(boot)) kurang.push('seed_owner()');
  if (!/seed_curriculum\s*\(/.test(boot)) kurang.push('seed_curriculum()');
  assert.strictEqual(kurang.length, 0,
    'bootstrap.py tidak memanggil: ' + kurang.join(', ') + '. Yang tidak dipanggil di ' +
    'sini TIDAK akan pernah jalan di Passenger, karena lifespan ASGI dilewati diam-diam');
});

test('bootstrap menolak jalan kalau env wajib kurang', () => {
  const boot = baca('backend/bootstrap.py');
  assert.ok(/SystemExit|sys\.exit/.test(boot),
    'bootstrap.py tidak punya jalan keluar bergalat; env yang kurang akan muncul ' +
    'sebagai KeyError telanjang, bukan pesan yang menyebut nama yang hilang');
});

test('passenger_wsgi mengekspor nama `application` yang dicari Passenger', () => {
  assert.ok(/^application\s*=/m.test(baca('backend/passenger_wsgi.py')),
    'Passenger mencari variabel bernama `application`; tanpa itu hasilnya 503 tanpa petunjuk');
});

/* ── 3b. requirements.txt tetap freeze yang utuh ────────────────────────────────── */

/* KENAPA ASSERT INI ADA — kejadian nyata, 8-12 Sep 2026.
   Tiga commit langsung ke main (62380627, 7c3fa7f3, 81f98f5f) mengejar kegagalan deploy
   Render dengan MENCABUT pin paket satu per satu. Yang hilang sama sekali ada empat:
   pydantic, pydantic_core, packaging, librt. FastAPI dan mypy tetap menariknya sendiri,
   jadi deploy-nya "berhasil" — tetapi versinya sejak itu ditentukan oleh HARI KAPAN pip
   kebetulan dijalankan, bukan oleh repo ini. Deploy bulan depan bisa rusak tanpa ada yang
   mengubah apa pun, dan tidak akan ada diff yang bisa ditunjuk.

   Akar kegagalan yang dikejar tiga commit itu ternyata bukan paketnya sama sekali,
   melainkan versi Python (lihat assert .python-version di atas). Menambal requirements.txt
   memadamkan api satu per satu; memaku versi Python memadamkan sumbernya.

   BATAS JUJUR GERBANG INI: ia menangkap pin yang DILONGGARKAN (== jadi >=, atau baris
   tanpa versi), bukan pin yang DIHAPUS — menemukan yang dihapus menuntut meresolusi
   seluruh pohon dependensi ke PyPI, dan gerbang ini offline. Yang dihapus diperiksa
   tangan 12 Sep 2026 dengan `pip install --dry-run --report` di Python 3.11:
   127 dipaku, 127 terpasang, nol mengambang, nol versi melenceng. Ulangi cara itu kalau
   requirements.txt disunting besar-besaran lagi. */

const REQ = baca('backend/requirements.txt');
const barisReq = REQ.split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

test('setiap dependensi backend dipaku persis dengan ==', () => {
  const longgar = barisReq.filter((l) => !/^[A-Za-z0-9][A-Za-z0-9._-]*==[^\s;]+$/.test(l));
  assert.strictEqual(longgar.length, 0,
    'baris yang tidak dipaku persis: ' + longgar.join(', ') + '. Satu baris yang longgar ' +
    'berarti versinya ditentukan oleh hari kapan pip kebetulan dijalankan, bukan oleh repo ' +
    'ini — dan kerusakannya muncul sebagai deploy yang gagal tanpa satu pun diff untuk ' +
    'ditunjuk (terjadi 8 Sep 2026)');
});

test('tidak ada paket yang dipaku dua kali', () => {
  const hitung = new Map();
  barisReq.forEach((l) => {
    const n = l.split('==')[0].replace(/[-_.]+/g, '-').toLowerCase();
    hitung.set(n, (hitung.get(n) || 0) + 1);
  });
  const ganda = [...hitung.entries()].filter(([, c]) => c > 1).map(([n]) => n);
  assert.strictEqual(ganda.length, 0,
    'dipaku lebih dari sekali: ' + ganda.join(', ') + '. pip memakai yang TERAKHIR dibaca, ' +
    'jadi yang di atas diam-diam diabaikan — persis bentuk kesalahan yang lolos review ' +
    'karena kedua barisnya terlihat benar sendiri-sendiri');
});

test('tidak ada pin ke rilis yang sudah ditarik PyPI', () => {
  /* Daftar ini BUKAN katalog yanked PyPI — mustahil dan tidak perlu. Ia mencatat rilis
     yang benar-benar pernah masuk ke berkas ini dan terbukti ditarik, supaya tidak
     kembali lewat revert atau salin-tempel. shellingham 1.5.0 ("Incorrect package
     metadata") masuk lewat 81f98f5f yang MENURUNKANNYA dari 1.5.4 yang sehat; pip
     memperingatkannya di setiap build dan rilis yang ditarik bisa dihapus kapan saja. */
  const DITARIK = ['shellingham==1.5.0', 'shellingham==1.5.1'];
  const ketemu = DITARIK.filter((d) => barisReq.includes(d));
  assert.strictEqual(ketemu.length, 0,
    'dipaku ke rilis yang ditarik PyPI: ' + ketemu.join(', ') + ' — pip memperingatkannya ' +
    'di setiap build, dan rilis yang ditarik bisa lenyap dari PyPI kapan saja');
});

/* ── 4. Gerbang ini sendiri terdaftar ───────────────────────────────────────────── */

/* ── 5. Versi Python dipaku di repo, bukan di dashboard ────────────────────────── */

test('backend memaku versi Python-nya sendiri', () => {
  assert.ok(ada('backend/.python-version'),
    'backend/.python-version hilang. Tanpa berkas ini penyedia hosting memakai Python ' +
    'TERBARU miliknya, dan paket yang dipaku repo ini tidak punya wheel untuk versi itu. ' +
    'Terukur di Render 12 Sep 2026 dengan Python 3.14: pip mengunduh wheel cp314 lalu ' +
    'menyerah dengan ResolutionImpossible pada grpcio-status — bukan karena versinya salah, ' +
    'melainkan karena google-api-core menuntut >=1.75.1 KHUSUS di python_version >= "3.14" ' +
    '(di 3.11 batasnya >=1.49.1 dan pin 1.71.2 memenuhinya). Menambal requirements.txt ' +
    'memadamkan api satu per satu; memaku versi Python memadamkan sumbernya.');
});

test('versi Python yang dipaku adalah versi yang punya wheel untuk paket terpaku', () => {
  if (!ada('backend/.python-version')) return; // sudah dilaporkan assert di atas
  const v = baca('backend/.python-version').trim();
  assert.ok(/^3\.11\.\d+$/.test(v),
    'backend/.python-version berisi "' + v + '". Harus 3.11.x. Diukur di PyPI: ' +
    'pymongo 4.6.3 — driver MongoDB, tanpa dia TIDAK ADA yang jalan — hanya punya wheel ' +
    'untuk cp37..cp312. Di 3.13 ke atas pip terpaksa mengompilasi dari sumber C, dan ' +
    'hosting tanpa compiler gagal di tengah pemasangan. Menaikkan angka ini menuntut ' +
    'menaikkan pin pymongo lebih dulu, bukan sebaliknya.');
});

test('gerbang ini terdaftar di quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('backend-env-contract-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml — ia tidak akan pernah berjalan di CI');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('backend-env-contract-test GAGAL: ' + failures.length + ' assert merah');
  console.log('backend-env-contract-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('backend-env-contract-test: ' + pass + '/' + total + ' assert PASS');
