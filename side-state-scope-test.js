#!/usr/bin/env node
/**
 * GERBANG RUANG-AKUN SIDE-STATE (side-state-scope-test.js)
 *
 * LUBANG YANG DITUTUP
 * -------------------
 * State utama sudah lama milik akun (`fiezel-v5-state:<uuid>`), tetapi seluruh side-state
 * otak — BKT, ledger miskonsepsi, matriks konfusi, probe retensi, kalibrasi item, negosiasi
 * OLM, SRL coach, cache sosial — memakai kunci DATAR tanpa uuid. Dua akun di satu perangkat
 * karena itu berbagi model penguasaan dan diagnosis miskonsepsi: murid B mewarisi keyakinan
 * sistem tentang murid A. Cacat itu hidup berbulan-bulan tanpa satu pun gerbang menyebutnya,
 * dan ia juga blokir pertama sinkron antar-perangkat — kunci yang tidak tahu miliknya siapa
 * tidak bisa disinkronkan ke siapa pun.
 *
 * Perbaikannya satu helper (`sideStateKey`) yang dipakai SEMUA pembaca/penulis. Gerbang ini
 * menjaga agar tidak ada yang kembali menulis kunci datar langsung — karena satu pemanggil
 * yang lupa dibungkus sudah cukup untuk mengembalikan kebocoran, dan bug itu senyap: tidak
 * ada galat, tidak ada layar merah, hanya model murid yang salah orang.
 *
 * YANG DI-ASSERT
 *   C1  setiap akses localStorage ke kunci side-state melewati sideStateKey(...);
 *   C2  sideStateKey benar-benar memakai identitas akun aktif, bukan konstanta;
 *   C3  migrasi dipanggil saat akun diaktifkan, dan mencatat pemilik (anti-klaim ganda);
 *   C4  daftar kunci side-state dibaca lazy — daftar yang dievaluasi top-level kena TDZ;
 *   RED setiap detektor terbukti MERAH terhadap sumber yang sengaja dirusak.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = __dirname;
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Kunci side-state yang WAJIB hidup di ruang akun. */
const KUNCI_SIDE_STATE = [
  'BKT_KEY',
  'MISCONCEPTION_LEDGER_KEY',
  'CONFUSION_MATRIX_KEY',
  'RETENTION_PROBE_KEY',
  'ITEM_CALIBRATION_KEY',
  'OLM_NEGOTIATION_KEY',
  'SRL_KEY',
  'SOCIAL_MASTERED_KEY'
];

/**
 * Akses localStorage TELANJANG ke sebuah kunci: getItem/setItem tanpa dibungkus
 * sideStateKey. resetProgress() dikecualikan dengan sengaja — di sana removeItem kunci datar
 * memang diinginkan, supaya murid yang belum pernah login juga benar-benar ter-reset.
 */
function aksesTelanjang(source, nama) {
  const tanpaReset = (() => {
    const mulai = source.indexOf('function resetProgress()');
    if (mulai < 0) return source;
    const akhir = source.indexOf('progres-akun-berhasil-direset', mulai);
    return akhir > mulai ? source.slice(0, mulai) + source.slice(akhir) : source;
  })();
  const re = new RegExp('localStorage\\.(?:getItem|setItem)\\(\\s*' + nama + '\\b', 'g');
  return (tanpaReset.match(re) || []).length;
}

/**
 * Badan activateAccountStateFromPuter(). Pencarian pemanggilan migrasi WAJIB dibatasi ke sini:
 * pola `migrateSideStateToAccount(uuid)` juga cocok dengan DEFINISI fungsinya, sehingga
 * detektor yang mencari di seluruh berkas tetap hijau walau pemanggilnya dihapus — versi
 * pertama gerbang ini persis begitu, dan blok BUKTI-BISA-MERAH-lah yang menangkapnya.
 */
function badanAktivasiAkun(source) {
  const mulai = source.indexOf('async function activateAccountStateFromPuter(');
  if (mulai < 0) return '';
  const akhir = source.indexOf('\nfunction dayKey(', mulai);
  return akhir > mulai ? source.slice(mulai, akhir) : source.slice(mulai);
}

test('C1 · nol akses localStorage telanjang ke kunci side-state', () => {
  const telanjang = KUNCI_SIDE_STATE
    .map((k) => ({ k, n: aksesTelanjang(appSource, k) }))
    .filter((x) => x.n > 0)
    .map((x) => x.k + ' (' + x.n + '×)');
  assert.deepStrictEqual(telanjang, [],
    'kunci side-state diakses tanpa sideStateKey() — dua akun di satu perangkat akan berbagi ' +
    'model otak lagi: ' + telanjang.join(', '));
});

test('C2 · sideStateKey memakai identitas akun aktif, bukan konstanta', () => {
  const m = appSource.match(/function sideStateKey\([^)]*\)\s*\{([^}]*)\}/);
  assert.ok(m, 'sideStateKey() tidak ditemukan — pola gerbang sudah basi');
  assert.ok(/activeAccountUuid/.test(m[1]),
    'sideStateKey tidak membaca activeAccountUuid — scoping-nya kosmetik, bukan nyata');
  // Tanpa akun harus jatuh ke kunci datar: murid yang belum login tidak boleh kehilangan
  // progresnya hanya karena perbaikan ini mendarat.
  assert.ok(/\?/.test(m[1]) && /base/.test(m[1]),
    'sideStateKey tidak punya jalur fallback ke kunci datar untuk sesi tanpa akun');
});

test('C3 · migrasi dipanggil saat akun aktif dan mencatat pemilik', () => {
  const aktivasi = badanAktivasiAkun(appSource);
  assert.ok(aktivasi, 'activateAccountStateFromPuter() tidak ditemukan — pola gerbang sudah basi');
  assert.ok(/migrateSideStateToAccount\s*\(\s*uuid\s*\)/.test(aktivasi),
    'migrateSideStateToAccount tidak dipanggil di jalur aktivasi akun');
  const m = appSource.match(/function migrateSideStateToAccount\([\s\S]*?\n\}/);
  assert.ok(m, 'migrateSideStateToAccount() tidak ditemukan');
  const badan = m[0];
  assert.ok(/SIDE_STATE_OWNER_KEY/.test(badan),
    'migrasi tidak mencatat pemilik — akun kedua akan ikut mengklaim data akun pertama');
  assert.ok(/pemilik\s*&&\s*pemilik\s*!==\s*id/.test(badan),
    'migrasi tidak menolak klaim akun lain');
  assert.ok(/getItem\(tujuan\)\s*!==\s*null\s*\)\s*continue/.test(badan),
    'migrasi bisa menimpa data akun yang sudah ada — harus idempoten');
});

test('C4 · daftar kunci side-state dibaca lazy (fungsi), bukan array top-level', () => {
  assert.ok(/function sideStateBaseKeys\(\)/.test(appSource),
    'sideStateBaseKeys bukan fungsi — array top-level akan kena TDZ karena sebagian kunci ' +
    'dideklarasikan jauh di bawahnya');
});

/**
 * Ambil satu deklarasi fungsi dari app.js apa adanya, dengan pencocokan kurung — supaya
 * gerbang di bawah menjalankan KODE SUNGGUHAN, bukan tiruannya. Menguji tiruan berarti
 * menguji gerbangnya sendiri.
 */
function ambilFungsi(source, nama) {
  const mulai = source.indexOf('function ' + nama + '(');
  if (mulai < 0) return '';
  let i = source.indexOf('{', mulai), depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') { depth--; if (depth === 0) return source.slice(mulai, j + 1); }
  }
  return '';
}

/** Panggil retentionProbeSeed() sungguhan dengan identitas akun yang kita tentukan. */
function seedUntuk(uuid, st) {
  const src = ambilFungsi(appSource, 'retentionProbeSeed');
  assert.ok(src, 'retentionProbeSeed() tidak ditemukan — pola gerbang sudah basi');
  const f = new Function('activeAccountUuid', 'activeStateStorageKey',
    src + '; return retentionProbeSeed;');
  return f(uuid, 'fiezel-v5-state:' + uuid)(st);
}

test('C5 · seed probe adalah fungsi MURNI dari identitas akun (dua perangkat = seed sama)', () => {
  // Inti S2: HP dan laptop menghitung angka yang sama sendiri-sendiri, tanpa sinkronisasi.
  const hp = seedUntuk('akun-murid-satu', null);
  const laptop = seedUntuk('akun-murid-satu', null);
  assert.strictEqual(hp, laptop, 'akun sama menghasilkan seed berbeda — jadwal probe akan berbeda antar perangkat');
  assert.ok(Number.isInteger(hp) && hp > 0, 'seed bukan bilangan bulat positif: ' + hp);

  // Dan tetap berbeda antar murid — itu tujuan asli jitter (probe tidak menumpuk sehari).
  const muridLain = seedUntuk('akun-murid-dua', null);
  assert.notStrictEqual(hp, muridLain, 'dua akun berbeda menghasilkan seed sama — jitter kehilangan gunanya');

  // Seed yang sudah tersimpan menang: jadwal murid lama tidak boleh bergeser saat ini mendarat.
  assert.strictEqual(seedUntuk('akun-murid-satu', { userSeed: 12345 }), 12345,
    'seed tersimpan diabaikan — jadwal probe murid lama akan bergeser');
});

test('C6 · seed probe tidak memakai sumber acak', () => {
  const src = ambilFungsi(appSource, 'retentionProbeSeed');
  assert.ok(!/Math\.random|crypto\.getRandomValues|randomUUID/.test(src),
    'seed masih diacak — acak berarti tiap perangkat punya jadwal probe sendiri');
  assert.ok(/activeAccountUuid/.test(src), 'seed tidak diturunkan dari identitas akun');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}

test('RED · detektor terbukti merah saat scoping dilepas', () => {
  // (C1) satu pemanggil kembali ke kunci datar — bentuk regresi yang paling mungkin terjadi.
  const racun = appSource.replace('localStorage.getItem(sideStateKey(BKT_KEY))', 'localStorage.getItem(BKT_KEY)');
  assert.notStrictEqual(racun, appSource, 'racun tidak menempel — pola gerbang sudah basi');
  expectRed('satu pembaca BKT kembali ke kunci datar', () => {
    assert.deepStrictEqual(KUNCI_SIDE_STATE.filter((k) => aksesTelanjang(racun, k)), []);
  });

  // (C2) sideStateKey berhenti membaca akun aktif.
  const racun2 = appSource.replace(/function sideStateKey\([^)]*\)\s*\{[^}]*\}/, 'function sideStateKey(base){return base}');
  assert.notStrictEqual(racun2, appSource, 'racun sideStateKey tidak menempel');
  expectRed('sideStateKey berhenti memakai akun aktif', () => {
    const m = racun2.match(/function sideStateKey\([^)]*\)\s*\{([^}]*)\}/);
    assert.ok(/activeAccountUuid/.test(m[1]));
  });

  // (C5/C6) seed kembali diacak — bentuk regresi yang mengembalikan divergensi antar perangkat.
  expectRed('seed probe kembali diacak', () => {
    const src = 'function retentionProbeSeed(st){return (Math.floor(Math.random()*0xFFFFFFFF)>>>0)||1}';
    assert.ok(!/Math\.random/.test(src));
  });

  // (C3) migrasi tidak lagi dipanggil saat login.
  const racun3 = appSource.replace('migrateSideStateToAccount(uuid);', '');
  assert.notStrictEqual(racun3, appSource, 'racun migrasi tidak menempel');
  expectRed('migrasi tidak dipanggil saat akun aktif', () => {
    assert.ok(/migrateSideStateToAccount\s*\(\s*uuid\s*\)/.test(badanAktivasiAkun(racun3)));
  });
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node side-state-scope-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL side-state scope: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL side-state scope: PASS (' + checks + ' uji · ' + KUNCI_SIDE_STATE.length + ' kunci otak dijaga di ruang akun)');
