#!/usr/bin/env node
/**
 * GERBANG RESET SIDE-STATE (reset-side-state-test.js)
 *
 * LUBANG YANG DITUTUP GERBANG INI
 * -------------------------------
 * "Reset progres" menjanjikan model bukti murid dihapus permanen. Janji itu ditegakkan oleh
 * SATU baris di app.js: sebuah daftar kunci localStorage yang di-removeItem. Daftar itu
 * ditulis tangan, dan tidak ada apa pun yang menghubungkannya dengan kunci yang benar-benar
 * dipakai aplikasi - jadi setiap kunci bukti murid BARU otomatis lolos dari reset, diam-diam,
 * tanpa satu pun test merah.
 *
 * Itu bukan bahaya teoretis: RETENTION_PROBE_KEY ('fiezel-post-test-v1') mendarat pada
 * Langkah 1 roadmap otonomi dan TIDAK ikut daftar reset. Akibatnya jadwal probe dan `userSeed`
 * murid lama selamat dari reset dan ikut membentuk state probe sesudahnya. Ditemukan OWNER
 * lewat audit manual pada head e68b59c - persis kelas cacat yang seharusnya dijaga mesin,
 * bukan mata manusia.
 *
 * YANG DI-ASSERT
 * --------------
 *   R1  setiap kunci di DIHAPUS_SAAT_RESET benar-benar ada di daftar removeItem resetProgress;
 *   R2  setiap kunci bukti murid yang DITULIS app.js lewat localStorage.setItem berada di
 *       salah satu dari dua daftar: dihapus saat reset, ATAU dikecualikan dengan ALASAN
 *       tertulis. Kunci baru yang tidak masuk keduanya = MERAH, dan itu memang tujuannya:
 *       memaksa keputusan sadar, bukan kelalaian diam;
 *   R3  daftar pengecualian tidak boleh dipakai untuk menyembunyikan kunci otak: tidak ada
 *       kunci di features/brain/ yang boleh dikecualikan;
 *   RED setiap detektor terbukti bisa MERAH terhadap sumber yang sengaja dirusak.
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

/**
 * Kunci bukti murid yang WAJIB dihapus saat reset progres. Daftar ini adalah kontraknya;
 * menambah kunci bukti murid berarti menambah barisnya DI SINI dan di app.js sekaligus.
 */
const DIHAPUS_SAAT_RESET = [
  'BKT_KEY',
  'MISCONCEPTION_LEDGER_KEY',
  'ITEM_CALIBRATION_KEY',
  'CONFUSION_MATRIX_KEY',
  'OLM_NEGOTIATION_KEY',
  'SRL_KEY',
  'RETENTION_PROBE_KEY'
];

/**
 * Kunci yang SENGAJA tidak ikut terhapus, masing-masing dengan alasannya. Alasan wajib
 * ditulis: pengecualian tanpa alasan adalah tempat sampah, dan tempat sampah akan dipakai.
 */
const SENGAJA_TIDAK_DIRESET = {
  LEGACY_STATE_KEY: { literal: 'fiezel-v4-state', alasan: 'state v4 pra-akun; jalur migrasi, bukan bukti murid akun ini' },
  LEGACY_STATE_OWNER_KEY: { literal: 'fiezel-v5-legacy-owner', alasan: 'penanda kepemilikan migrasi — menghapusnya membuat data lama bisa diklaim akun lain' },
  SIDE_STATE_OWNER_KEY: { literal: 'fiezel-side-state-owner-v1', alasan: 'penanda kepemilikan migrasi side-state — alasan sama persis: menghapusnya membuat sisa data datar bisa diklaim akun lain' },
  PUTER_AUTH_SKIP_KEY: { literal: 'fiezel-puter-auth-skipped', alasan: 'preferensi perangkat soal popup login, bukan progres belajar' },
  PUTER_POPUP_LAST_KEY: { literal: 'fiezel-puter-popup-last', alasan: 'anti-spam popup per perangkat, bukan progres belajar' },
  REMINDER_INVITE_KEY: { literal: 'fiezel-reminder-invite-v1', alasan: 'penghitung tawaran notifikasi per perangkat, bukan progres belajar' },
  SOCIAL_MASTERED_KEY: { literal: 'fiezel-social-mastered-v1', alasan: 'cache tampilan sosial; diturunkan ulang dari progres, tidak menggerbang keputusan apa pun' },
  // CATATAN UNTUK OWNER: ini jangkar hari-0 lane telemetri (studyDay relatif), bukan model
  // bukti. Ia dikecualikan supaya perbaikan ini tidak diam-diam mengubah perilaku lane
  // privasi — TAPI apakah reset progres seharusnya juga memulai ulang hari-0 adalah
  // pertanyaan produk yang belum dijawab siapa pun. Dicatat di sini, bukan diputuskan.
  LEARNING_TELEMETRY_DAY0_KEY: { literal: 'fiezel-lt-day0-v1', alasan: 'jangkar hari-0 lane telemetri; lane itu punya jalur opt-out purge sendiri (lihat catatan OWNER di atas)' },
  KEY: { literal: 'fiezel.seenAppVersion', alasan: 'penanda versi aplikasi yang sudah dilihat di perangkat ini, bukan progres belajar' }
};

/** Isi daftar removeItem di dalam resetProgress(), dibaca dari sumber sungguhan. */
function resetBlock() {
  const mulai = appSource.indexOf('function resetProgress()');
  assert.ok(mulai >= 0, 'resetProgress() tidak ditemukan — pola gerbang sudah basi');
  // Ambil badan fungsi apa adanya sampai penanda akhir yang stabil (toast reset). Membatasi
  // dengan hitungan kurung rapuh: `catch{}` di dalamnya membuat pencocokan non-greedy berhenti
  // di kurung yang salah — itu justru yang membuat versi pertama gerbang ini salah lulus.
  const akhir = appSource.indexOf('progres-akun-berhasil-direset', mulai);
  assert.ok(akhir > mulai, 'penanda akhir resetProgress() tidak ditemukan — pola gerbang sudah basi');
  const badan = appSource.slice(mulai, akhir);
  const m = badan.match(/for\s*\(\s*const\s+k\s+of\s*\[([^\]]*)\]/);
  assert.ok(m, 'daftar kunci di resetProgress() tidak terbaca — pola gerbang sudah basi');
  return { daftar: m[1], badan: badan };
}
function resetKeyList() {
  return resetBlock().daftar.split(',').map(s => s.trim()).filter(Boolean);
}

/** Konstanta kunci yang benar-benar DITULIS ke localStorage oleh app.js. */
function writtenKeyConstants(source) {
  const found = new Set();
  const re = /localStorage\.setItem\(\s*([A-Z][A-Z0-9_]*)\s*,/g;
  let m;
  while ((m = re.exec(source))) found.add(m[1]);
  return found;
}

/**
 * Literal yang benar-benar dideklarasikan sebuah konstanta di app.js. Dipakai supaya
 * pengecualian tidak bisa dibajak nama: `KEY` adalah nama generik, dan pengecualian yang
 * hanya mengunci NAMA akan diam-diam ikut memaafkan konstanta lain bernama sama yang
 * menunjuk data yang sama sekali berbeda.
 */
function declaredLiteral(source, name) {
  const re = new RegExp('\\b' + name + "\\s*=\\s*'([^']*)'");
  const m = source.match(re);
  return m ? m[1] : null;
}

test('R1 · setiap kunci bukti murid yang dikontrakkan benar-benar dihapus saat reset', () => {
  const list = resetKeyList();
  const missing = DIHAPUS_SAAT_RESET.filter(k => !list.includes(k));
  assert.deepStrictEqual(missing, [],
    'kunci bukti murid TIDAK dihapus saat reset progres — "dihapus permanen" jadi bohong untuk: ' + missing.join(', '));
});

test('R2 · tidak ada kunci localStorage yang lolos tanpa keputusan (dihapus, atau dikecualikan beralasan)', () => {
  const list = resetKeyList();
  const written = writtenKeyConstants(appSource);
  const yatim = [...written].filter(k => !list.includes(k) && !Object.prototype.hasOwnProperty.call(SENGAJA_TIDAK_DIRESET, k));
  assert.deepStrictEqual(yatim, [],
    'kunci ini ditulis app.js tetapi tidak dihapus saat reset DAN tidak terdaftar sebagai pengecualian beralasan — ' +
    'tambahkan ke daftar reset di app.js, atau daftarkan alasannya di gerbang ini: ' + yatim.join(', '));
});

test('R3 · pengecualian membawa alasan, terkunci ke literalnya, dan bukan kunci otak', () => {
  for (const [k, spec] of Object.entries(SENGAJA_TIDAK_DIRESET)) {
    assert.ok(String(spec && spec.alasan).trim().length >= 20, k + ': alasan pengecualian terlalu tipis untuk bisa direview');
    const actual = declaredLiteral(appSource, k);
    assert.strictEqual(actual, spec.literal,
      k + ': literal kunci berubah (' + JSON.stringify(actual) + ' vs ' + JSON.stringify(spec.literal) +
      ') — pengecualian dibekukan ke literalnya supaya nama generik tidak bisa dibajak');
  }
  const brainish = Object.keys(SENGAJA_TIDAK_DIRESET).filter(k => /BKT|LEDGER|CALIBRATION|CONFUSION|OLM|SRL|PROBE|MASTERY|MISCONCEPTION/.test(k));
  assert.deepStrictEqual(brainish, [],
    'kunci model otak dikecualikan dari reset — itu bukan pengecualian, itu kebocoran: ' + brainish.join(', '));
});

test('R4 · reset menghapus kunci milik AKUN, bukan hanya kunci datar perangkat', () => {
  // Sejak side-state otak dibuat per akun (fiezel-mastery-bkt-v1:<uuid>, dst.), reset yang
  // hanya menghapus kunci datar akan meninggalkan model penguasaan akun yang sedang login
  // hidup utuh — "dihapus permanen" yang menghapus milik orang yang salah. Blok reset wajib
  // menyebut sideStateKey(...) DAN kunci datarnya (perangkat yang belum pernah login menyimpan
  // di sana, dan melewatkannya membuat reset bohong untuk murid tanpa akun).
  const { badan } = resetBlock();
  assert.ok(/localStorage\.removeItem\(\s*sideStateKey\(\s*k\s*\)\s*\)/.test(badan),
    'reset tidak menghapus kunci berakun — sideStateKey(k) tidak ditemukan di blok reset');
  assert.ok(/localStorage\.removeItem\(\s*k\s*\)/.test(badan),
    'reset tidak menghapus kunci datar — murid yang belum login tidak ikut ter-reset');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}

test('RED · detektor terbukti merah saat kunci dikeluarkan dari daftar reset / muncul tanpa keputusan', () => {
  // (R1) RETENTION_PROBE_KEY dicabut dari daftar — bentuk persis defek yang ditemukan OWNER.
  const list = resetKeyList();
  assert.ok(list.includes('RETENTION_PROBE_KEY'), 'prasyarat racun tidak terpenuhi');
  const dicabut = list.filter(k => k !== 'RETENTION_PROBE_KEY');
  expectRed('RETENTION_PROBE_KEY hilang dari daftar reset', () => {
    const missing = DIHAPUS_SAAT_RESET.filter(k => !dicabut.includes(k));
    assert.deepStrictEqual(missing, []);
  });

  // (R4) blok reset kehilangan sideStateKey — bentuk regresi kalau seseorang menyederhanakan
  // blok itu kembali ke kunci datar setelah side-state dibuat per akun.
  const badanTanpaScope = resetBlock().badan.replace(/localStorage\.removeItem\(\s*sideStateKey\(\s*k\s*\)\s*\)/, 'localStorage.removeItem(k)');
  expectRed('reset kembali ke kunci datar saja', () => {
    assert.ok(/localStorage\.removeItem\(\s*sideStateKey\(\s*k\s*\)\s*\)/.test(badanTanpaScope));
  });

  // (R2) kunci bukti murid baru muncul, tidak dihapus dan tidak dikecualikan.
  const racun = appSource + '\nlocalStorage.setItem(KUNCI_OTAK_BARU_V9, JSON.stringify({}));\n';
  expectRed('kunci baru ditulis tanpa masuk daftar reset maupun pengecualian', () => {
    const written = writtenKeyConstants(racun);
    const yatim = [...written].filter(k => !list.includes(k) && !Object.prototype.hasOwnProperty.call(SENGAJA_TIDAK_DIRESET, k));
    assert.deepStrictEqual(yatim, []);
  });
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node reset-side-state-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL reset side-state: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL reset side-state: PASS (' + checks + ' uji · ' + DIHAPUS_SAAT_RESET.length + ' kunci bukti murid dijaga)');
