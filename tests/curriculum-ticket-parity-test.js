// tests/curriculum-ticket-parity-test.js — penanda tangan JS dan pembaca Python
// WAJIB sepakat bit per bit.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Tiket identitas KelasKu ditandatangani di runtime Workers (WebCrypto,
// workers/api/auth/curriculum-ticket.js) dan dibaca di CPython
// (backend/kelasku.py). Tidak ada satu berkas yang bisa dijalankan keduanya, jadi
// bentuknya terpaksa ditulis dua kali — dan dua tulisan yang menyimpang adalah
// kelas cacat yang tidak bisa ditemukan dengan membaca salah satunya. Ia muncul
// pertama kali di produksi, sebagai "tiket ditolak" tanpa sebab yang terlihat,
// pada hari guru pertama mencoba masuk.
//
// Karena itu gerbang ini tidak membaca kode: ia MENJALANKAN keduanya atas vektor
// yang sama. Tanda tangan dibuat di JS, diverifikasi di Python; lalu dibuat di
// Python, diverifikasi di JS. Kalau satu sisi mengubah urutan ruas JSON,
// pemisahnya, padding base64url, atau apa yang ditandatangani, gerbang ini merah.
//
// Penolakan ikut diuji, karena tanda tangan yang benar saja tidak cukup: tiket
// kedaluwarsa, salah audience, salah versi, dan tanda tangan yang dirusak satu
// karakter semuanya HARUS ditolak di kedua sisi.
//
// Python dicari lewat FZ_PY (dipakai CI/uji lokal) lalu python3. Tidak ditemukan
// = FAIL, bukan SKIP: gerbang yang diam saat tidak bisa memeriksa adalah gerbang
// yang memberi rasa aman palsu (pelajaran m025-300).

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const __fzRoot = path.join(__dirname, '..');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

function pythonBin() {
  const kandidat = [process.env.FZ_PY, 'python3', 'python'].filter(Boolean);
  for (const bin of kandidat) {
    try {
      execFileSync(bin, ['-c', 'import sys'], { stdio: 'ignore' });
      return bin;
    } catch (_) { /* coba berikutnya */ }
  }
  throw new Error('python3 tidak ditemukan — gerbang paritas tidak bisa memeriksa apa pun');
}

/** Jalankan cuplikan Python yang mengimpor backend/kelasku.py dan cetak JSON. */
function py(script, env) {
  const bin = pythonBin();
  const out = execFileSync(bin, ['-c', script], {
    cwd: path.join(__fzRoot, 'backend'),
    env: Object.assign({}, process.env, env || {}),
    encoding: 'utf8'
  });
  return JSON.parse(out.trim().split('\n').pop());
}

const KEY = 'kunci-uji-paritas-yang-cukup-panjang-0123456789';

(async function main() {
  const mod = await import(
    'file://' + path.join(__fzRoot, 'workers/api/auth/curriculum-ticket.js')
  );

  // ---------------------------------------------------------------- konstanta
  const pyConst = py(
    'import json,kelasku as k;print(json.dumps({"v":k.TICKET_VERSION,"aud":k.TICKET_AUDIENCE,' +
    '"skew":k.TICKET_CLOCK_SKEW_SECONDS,"env":k.TICKET_KEY_ENV,"min":k.TICKET_KEY_MIN_LENGTH}))'
  );

  test('versi, audience, toleransi jam, nama env, dan panjang kunci minimum sama di kedua sisi', () => {
    assert.strictEqual(pyConst.v, mod.TICKET_VERSION, 'TICKET_VERSION berbeda');
    assert.strictEqual(pyConst.aud, mod.TICKET_AUDIENCE, 'TICKET_AUDIENCE berbeda');
    assert.strictEqual(pyConst.skew, mod.TICKET_CLOCK_SKEW_SECONDS, 'toleransi jam berbeda');
    assert.strictEqual(pyConst.env, mod.TICKET_KEY_ENV, 'nama env kunci berbeda');
    assert.strictEqual(pyConst.min, mod.TICKET_KEY_MIN_LENGTH, 'panjang kunci minimum berbeda');
  });

  // ------------------------------------------------- JS menandatangani -> Python membaca
  const now = Date.now();
  const terbit = await mod.signCurriculumTicket(
    KEY, { sub: 'sub_guru_1', role: 'teacher', name: 'Bu Rina' }, now
  );

  const dibaca = py(
    'import json,kelasku as k;p=k.verify_ticket(' + JSON.stringify(terbit.ticket) + ');print(json.dumps(p))',
    { CURRICULUM_TICKET_KEY: KEY }
  );

  test('tiket terbitan JS dibaca Python dengan payload identik', () => {
    assert.strictEqual(dibaca.sub, 'sub_guru_1');
    assert.strictEqual(dibaca.role, 'teacher');
    assert.strictEqual(dibaca.name, 'Bu Rina');
    assert.strictEqual(dibaca.aud, mod.TICKET_AUDIENCE);
    assert.strictEqual(dibaca.exp - dibaca.iat, mod.TICKET_TTL_SECONDS,
      'umur tiket yang terbaca bukan TTL yang dideklarasikan');
    assert.ok(dibaca.jti && String(dibaca.jti).length >= 16, 'jti hilang — pemakaian ulang jadi mungkin');
  });

  // ------------------------------------------------- Python menandatangani -> JS membaca
  const dariPy = py(
    'import json,time,kelasku as k;' +
    'p={"v":k.TICKET_VERSION,"aud":k.TICKET_AUDIENCE,"sub":"sub_murid_9","role":"learner",' +
    '"name":"Budi","iat":int(time.time()),"exp":int(time.time())+120,"jti":"abcdef0123456789"};' +
    'print(json.dumps({"ticket":k.sign_ticket(' + JSON.stringify(KEY) + ',p)}))'
  );

  const balik = await mod.verifyCurriculumTicket(KEY, dariPy.ticket, Date.now());
  test('tiket terbitan Python diterima JS', () => {
    assert.ok(balik.ok, 'ditolak JS dengan alasan: ' + balik.reason);
    assert.strictEqual(balik.payload.sub, 'sub_murid_9');
    assert.strictEqual(balik.payload.role, 'learner');
  });

  // ------------------------------------------------------------------ penolakan

  /* PERUSAKAN HARUS BENAR-BENAR MERUSAK, DAN DULU TIDAK SELALU.

     Versi sebelumnya membalik karakter TERAKHIR tiket: `...slice(0,-1) + (akhir === 'A' ? 'B' : 'A')`.
     Tanda tangan HMAC-SHA256 panjangnya 32 bita, dan 32 bita menjadi 43 karakter base64url —
     berarti karakter terakhir hanya membawa 4 bit yang berarti; 2 bit sisanya dibuang saat
     didekode. Akibatnya 'A', 'B', 'C', dan 'D' semuanya menghasilkan 32 bita YANG SAMA PERSIS.

     Jadi setiap kali tanda tangan sebuah tiket kebetulan berakhir pada salah satu dari empat
     huruf itu — diukur 6,25% dari percobaan — tiket "rusak" itu sebenarnya tiket yang sama,
     kedua sisi menerimanya dengan benar, dan gerbang ini merah tanpa satu pun cacat produk.
     Gerbang yang merah satu kali dari enam belas mengajari pembacanya menekan jalankan-ulang
     alih-alih membaca pesannya, dan itu justru membunuh gerbang yang menjaga tanda tangan.

     Yang dirusak sekarang karakter di TENGAH tanda tangan, tempat seluruh 6 bitnya berarti,
     dan hasilnya diperiksa memang berbeda sebelum dipakai. */
  const pisah = terbit.ticket.lastIndexOf('.');
  const tandaTangan = terbit.ticket.slice(pisah + 1);
  const titik = Math.floor(tandaTangan.length / 2);
  const gantiDengan = tandaTangan[titik] === 'A' ? 'B' : 'A';
  const rusak = terbit.ticket.slice(0, pisah + 1) +
    tandaTangan.slice(0, titik) + gantiDengan + tandaTangan.slice(titik + 1);

  const baca = (b64) => Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  test('vektor perusakan benar-benar mengubah bita tanda tangan', () => {
    assert.notStrictEqual(rusak, terbit.ticket, 'tiket rusak identik dengan tiket asli');
    assert.ok(!baca(tandaTangan).equals(baca(rusak.slice(pisah + 1))),
      'karakter yang diganti jatuh pada bit yang dibuang saat dekode base64url — ' +
      'perusakan ini tidak merusak apa pun, dan pengujian di bawahnya menguji tiket yang sah');
  });

  const tolakJs = await mod.verifyCurriculumTicket(KEY, rusak, Date.now());
  const tolakPy = py(
    'import json,kelasku as k\ntry:\n k.verify_ticket(' + JSON.stringify(rusak) + ')\n' +
    ' print(json.dumps({"ok":True}))\nexcept k.TicketError as e:\n print(json.dumps({"ok":False,"reason":e.reason}))',
    { CURRICULUM_TICKET_KEY: KEY }
  );

  test('tanda tangan rusak ditolak DI KEDUA SISI', () => {
    assert.strictEqual(tolakJs.ok, false, 'JS menerima tiket yang tanda tangannya dirusak');
    assert.strictEqual(tolakPy.ok, false, 'Python menerima tiket yang tanda tangannya dirusak');
  });

  const kunciLain = await mod.verifyCurriculumTicket(
    'kunci-lain-yang-juga-cukup-panjang-0123456789', terbit.ticket, Date.now()
  );
  test('tiket yang ditandatangani kunci lain ditolak', () => {
    assert.strictEqual(kunciLain.ok, false);
  });

  const kedaluwarsa = await mod.verifyCurriculumTicket(
    KEY, terbit.ticket, now + (mod.TICKET_TTL_SECONDS + mod.TICKET_CLOCK_SKEW_SECONDS + 5) * 1000
  );
  const kedaluwarsaPy = py(
    'import json,kelasku as k\ntry:\n k.verify_ticket(' + JSON.stringify(terbit.ticket) +
    ', now=' + String(Math.floor(now / 1000) + mod.TICKET_TTL_SECONDS + mod.TICKET_CLOCK_SKEW_SECONDS + 5) + ')\n' +
    ' print(json.dumps({"ok":True}))\nexcept k.TicketError as e:\n print(json.dumps({"ok":False,"reason":e.reason}))',
    { CURRICULUM_TICKET_KEY: KEY }
  );

  test('tiket kedaluwarsa ditolak di kedua sisi, dengan batas yang sama', () => {
    assert.strictEqual(kedaluwarsa.ok, false, 'JS masih menerima tiket mati');
    assert.strictEqual(kedaluwarsa.reason, 'expired');
    assert.strictEqual(kedaluwarsaPy.ok, false, 'Python masih menerima tiket mati');
    assert.strictEqual(kedaluwarsaPy.reason, 'expired');
  });

  const audSalah = py(
    'import json,time,kelasku as k;' +
    'p={"v":k.TICKET_VERSION,"aud":"tujuan-lain","sub":"s","role":"teacher","name":"x",' +
    '"iat":int(time.time()),"exp":int(time.time())+120,"jti":"a1b2c3d4e5f60718"};' +
    'print(json.dumps({"ticket":k.sign_ticket(' + JSON.stringify(KEY) + ',p)}))'
  );
  const audJs = await mod.verifyCurriculumTicket(KEY, audSalah.ticket, Date.now());
  const audPy = py(
    'import json,kelasku as k\ntry:\n k.verify_ticket(' + JSON.stringify(audSalah.ticket) + ')\n' +
    ' print(json.dumps({"ok":True}))\nexcept k.TicketError as e:\n print(json.dumps({"ok":False,"reason":e.reason}))',
    { CURRICULUM_TICKET_KEY: KEY }
  );
  test('tiket bertujuan lain ditolak walau tanda tangannya sah', () => {
    assert.strictEqual(audJs.ok, false, 'JS menerima tiket bertujuan lain');
    assert.strictEqual(audJs.reason, 'audience');
    assert.strictEqual(audPy.ok, false, 'Python menerima tiket bertujuan lain');
    assert.strictEqual(audPy.reason, 'audience');
  });

  // ------------------------------------------------------------- kunci lemah
  let lemahDitolak = false;
  try { await mod.signCurriculumTicket('pendek', { sub: 's', role: 'teacher' }, now); }
  catch (_) { lemahDitolak = true; }
  const lemahPy = py(
    'import json,kelasku as k\ntry:\n k.ticket_key()\n print(json.dumps({"ok":True}))\n' +
    'except k.TicketError as e:\n print(json.dumps({"ok":False,"reason":e.reason}))',
    { CURRICULUM_TICKET_KEY: 'pendek' }
  );
  test('kunci pendek MENOLAK bekerja di kedua sisi (fitur mati, bukan nilai cadangan)', () => {
    assert.ok(lemahDitolak, 'JS mau menandatangani dengan kunci pendek');
    assert.strictEqual(lemahPy.ok, false, 'Python mau membaca dengan kunci pendek');
    assert.strictEqual(lemahPy.reason, 'key_weak');
  });

  const tanpaKunci = py(
    'import json,kelasku as k\ntry:\n k.ticket_key()\n print(json.dumps({"ok":True}))\n' +
    'except k.TicketError as e:\n print(json.dumps({"ok":False,"reason":e.reason}))',
    { CURRICULUM_TICKET_KEY: '' }
  );
  test('kunci yang tidak dipasang sama sekali MENOLAK, tidak jatuh ke nilai cadangan', () => {
    assert.strictEqual(tanpaKunci.ok, false);
  });

  test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
    const wf = fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8');
    assert.ok(wf.indexOf('curriculum-ticket-parity-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
  });

  const total = pass + failures.length;
  if (failures.length) {
    failures.forEach((f) => console.error('FAIL: ' + f));
    console.error('curriculum-ticket-parity-test GAGAL: ' + failures.length + ' assert merah');
    console.log('curriculum-ticket-parity-test: ' + pass + '/' + total + ' assert PASS');
    process.exit(1);
  }
  console.log('curriculum-ticket-parity-test: ' + pass + '/' + total + ' assert PASS');
})().catch((err) => {
  console.error('curriculum-ticket-parity-test GAGAL memuat: ' + err.message);
  process.exit(1);
});
