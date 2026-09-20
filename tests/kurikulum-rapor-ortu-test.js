'use strict';
/**
 * tests/kurikulum-rapor-ortu-test.js — F7: RAPOR KOMPETENSI UNTUK ORANG TUA
 * (m025-351; audit UI/UX KelasKu & Kurikulum 2026-09-20 §F7).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * `makeRaporNarrative` sudah menyusun draf narasi e-Rapor per murid, tetapi draf
 * itu mati di drawer konsol: tidak bisa dibawa pulang. Audit F7 menuntut dua hal:
 * ekspor ke PDF/gambar untuk orang tua, dan versi murid dari dokumen yang sama.
 *
 * Keputusan owner F7: format = Kartu Gambar PNG via Canvas + Cetak/PDF via
 * window.print yang ramah HP; render = sisi KLIEN (hemat server, lokal-dulu).
 * Tidak ada endpoint baru dan tidak ada upload — gambar dibuat di perangkat dan
 * langsung diunduh; cetak memakai dialog cetak peramban (Simpan sebagai PDF).
 *
 * Gerbang ini menjaga tiga janji:
 *  1. SATU modul bersama (`rapor-share.js`) merender dokumen guru DAN murid —
 *     "dokumen yang sama" dijamin struktural, bukan dengan menyalin kode.
 *  2. Kedua halaman memuat modul itu dengan penanda `?v=` yang selaras build.
 *  3. Keadaan kosong tidak dikarang, dan setiap naskah lahir dwibahasa (id+th).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const MODUL = baca('features/curriculum/rapor-share.js');
const KONSOL = baca('features/curriculum/teacher-console.js');
const MISI = baca('features/curriculum/learning-mission.js');
const ID_KUR = baca('features/i18n/copy-id-kurikulum.js');
const TH_KUR = baca('features/i18n/copy-th-kurikulum.js');

/* Muat modul bersama di sandbox: pastikan ia berdiri sendiri (tanpa DOM) dan
   mengekspor permukaan yang dijanjikan. */
function muatModul() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  return vm.runInContext(MODUL + '\nwindow.FiezelRaporShare;', sandbox, { filename: 'rapor-share.js' });
}

/* --------------------------------- 1. satu modul, dokumen yang sama di dua sisi */

test('F7 — modul bersama mengekspor permukaan rapor yang lengkap', () => {
  const RS = muatModul();
  assert.ok(RS, 'window.FiezelRaporShare tidak terpasang.');
  ['narrative', 'ringkas', 'gambarKartu', 'kartuHTML', 'unduhPNG', 'cetak', 'hariIni', 'namaBerkas'].forEach((fn) => {
    assert.ok(typeof RS[fn] === 'function', 'FiezelRaporShare kehilangan fungsi ' + fn + '.');
  });
});

test('F7 — narasi memakai ambang yang sama dengan draf konsol (kuat >= 70)', () => {
  assert.ok(/mastery_pct >= 70/.test(MODUL), 'ambang penguasaan modul menyimpang dari draf konsol.');
  assert.ok(/mastery_pct >= 70/.test(KONSOL), 'draf konsol tidak lagi memakai ambang 70 — dokumen guru & murid pecah.');
  const RS = muatModul();
  const nar = RS.narrative('Budi', [{ mastery_pct: 90, tp_name: 'Aljabar' }], []);
  assert.ok(nar.includes('Budi') && nar.includes('Aljabar'), 'narasi tidak menyebut nama & TP terkuat.');
  const kosong = RS.narrative(null, [], null);
  assert.ok(kosong.length > 0, 'narasi tanpa data harus tetap berkata jujur, bukan string kosong.');
});

test('F7 — ringkas() tidak mengarang: tanpa payload null, field hilang dihilangkan', () => {
  const RS = muatModul();
  assert.strictEqual(RS.ringkas(null), null, 'tanpa payload harus null — dokumen tidak boleh lahir dari udara.');
  const d = RS.ringkas({ nama: 'Ani', totals: null, rows: [] });
  assert.ok(d && d.kelas === null && d.mapel === null, 'field yang tidak ada harus null, bukan karangan.');
  assert.strictEqual(d.tanggal, RS.hariIni(), 'tanggal dokumen harus hari ini.');
});

test('F7 — kartu HTML & Canvas berkata jujur saat tanpa evidence', () => {
  const RS = muatModul();
  const d = RS.ringkas({ nama: 'Ani', rows: [] });
  const html = RS.kartuHTML(d);
  assert.ok(html.includes('data-testid="rapor-doc"'), 'kartu cetak kehilangan penanda rapor-doc.');
  assert.ok(html.includes('Belum ada evidence'), 'kartu cetak tanpa evidence harus mengatakannya.');
  assert.ok(!/undefined|NaN/.test(html), 'kartu cetak membocorkan undefined/NaN.');
});

/* --------------------------------- 2. kedua halaman memuat modul + wiring */

test('F7 — kurikulum.html & misi.html memuat rapor-share.js berpenanda build', () => {
  const build = (baca('core-config.js').match(/self\.FIEZEL_PAGE_BUILD='(m025-\d+)'/) || [])[1];
  assert.ok(build, 'FIEZEL_PAGE_BUILD tidak terbaca.');
  ['kurikulum.html', 'misi.html'].forEach((h) => {
    const isi = baca(h);
    assert.ok(isi.includes('./features/curriculum/rapor-share.js?v=' + build),
      h + ' tidak memuat rapor-share.js dengan penanda ?v=' + build + ' — modul bisa tertutup salinan cache lama.');
  });
});

test('F7 — konsol guru: drawer paspor membekukan dokumen + tombol PNG/Cetak', () => {
  assert.ok(/S\.rapor = RS \? RS\.ringkas\(\{/.test(KONSOL), 'konsol tidak membekukan dokumen rapor (S.rapor).');
  assert.ok(/data-a="rapor-png" data-testid="rapor-png-btn"/.test(KONSOL), 'tombol Unduh PNG hilang dari drawer paspor.');
  assert.ok(/data-a="rapor-print" data-testid="rapor-print-btn"/.test(KONSOL), 'tombol Cetak hilang dari drawer paspor.');
  assert.ok(/RS2\.unduhPNG\(S\.rapor\)/.test(KONSOL), 'handler PNG tidak memanggil modul bersama.');
  assert.ok(/RS2\.cetak\(S\.rapor\)/.test(KONSOL), 'handler cetak tidak memanggil modul bersama.');
});

test('F7 — misi murid: paspor punya kartu rapor ortu dari modul yang sama', () => {
  assert.ok(/data-testid="rapor-ortu-card"/.test(MISI), 'kartu rapor ortu hilang dari paspor murid.');
  assert.ok(/RS\.narrative\(namaM, S\.passport\.rows/.test(MISI), 'murid tidak memakai narrative() modul bersama — dokumen bisa menyimpang dari guru.');
  assert.ok(/RS\.unduhPNG\(dok\)/.test(MISI) && /RS\.cetak\(dok\)/.test(MISI), 'murid tidak memakai unduhPNG/cetak modul bersama.');
});

/* --------------------------------- 3. format owner: PNG Canvas + window.print */

test('F7 — PNG dirender via Canvas sisi klien, tanpa endpoint baru', () => {
  assert.ok(/getContext\('2d'\)/.test(MODUL), 'renderer PNG tidak memakai Canvas 2D.');
  assert.ok(/toDataURL\('image\/png'\)/.test(MODUL), 'unduhan bukan PNG.');
  assert.ok(!/fetch\(|\/api\/rapor|XmlHttpRequest/.test(MODUL), 'modul rapor memanggil jaringan — keputusan owner: sisi klien, tanpa endpoint baru.');
});

test('F7 — cetak via window.print dengan CSS cetak yang disuntik sekali', () => {
  assert.ok(/@media print/.test(MODUL), 'modul tidak membawa gaya cetak sendiri.');
  assert.ok(/body>\*:not\(#rapor-print-root\)/.test(MODUL), 'gaya cetak tidak menyembunyikan chrome halaman — yang tercetak bukan dokumen bersih.');
  assert.ok(/\(root\.print \|\| window\.print\)\.call\(root\)/.test(MODUL), 'dialog cetak tidak dipanggil lewat window.print.');
  assert.ok(/fiezel-rapor-print-css/.test(MODUL), 'penanda gaya cetak hilang — risiko suntik ganda.');
});

/* --------------------------------- 4. dwibahasa + anti-bocor */

test('F7 — seluruh naskah rapor lahir dwibahasa (id+th)', () => {
  ['kurikulum.rapor-png-btn', 'kurikulum.rapor-print-btn', 'kurikulum.rapor-doc-title',
    'kurikulum.rapor-kpi-komp', 'kurikulum.rapor-kpi-kuasai', 'kurikulum.rapor-kpi-tahan',
    'kurikulum.rapor-kpi-trans', 'kurikulum.rapor-kuat', 'kurikulum.rapor-berkembang',
    'kurikulum.rapor-awal', 'kurikulum.rapor-tanpa-bukti', 'kurikulum.rapor-kaki',
    'kurikulum.rapor-ortu-card-title', 'kurikulum.rapor-ortu-card-sub',
    'kurikulum.rapor-gagal-unduh', 'kurikulum.rapor-gagal-cetak', 'kurikulum.rapor-modul-hilang'].forEach((k) => {
    assert.ok(ID_KUR.includes("'" + k + "'"), 'copy-id-kurikulum kehilangan ' + k + '.');
    assert.ok(TH_KUR.includes("'" + k + "'"), 'copy-th-kurikulum kehilangan ' + k + ' — paritas id/th robek.');
  });
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL rapor ortu: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
