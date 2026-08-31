/**
 * FIEZEL gerbang — VERSI & KEAMANAN SELF-LEARNING (Fase 2 / Phase N, O, P).
 *
 * Brief menyebut Fase N dan O sebagai "dokumentasi saja". Sebuah larangan yang hanya hidup di
 * dalam prosa adalah larangan yang akan dilanggar pada hari orang lupa membacanya. Gerbang ini
 * mengubah dua larangan itu menjadi sifat yang DITEGAKKAN:
 *
 *   Fase N  Global Learning Intelligence BELUM BOLEH ADA. Yang boleh cuma antarmukanya,
 *           tertulis. Kalau agregasi server, pola global, atau hipotesis otomatis muncul di
 *           repo ini, gerbang ini merah.
 *   Fase O  Braincore TIDAK PERNAH BOLEH menulis ulang kode produksinya sendiri karena data
 *           murid. Tidak ada satu pun jalur yang boleh menulis ke features/brain/.
 *   Fase P  Setiap tolok ukur dan setiap Decision Trace WAJIB membawa braincoreVersion.
 *           Membandingkan hasil dari dua versi tanpa mencatat versinya adalah cara paling
 *           mudah menerbitkan angka yang salah dengan yakin.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const Manifest = require('./features/brain/fiezel-brain-manifest.js');
const Trace = require('./features/brain/fiezel-decision-trace.js');
const Evidence = require('./features/brain/fiezel-braincore-evidence.js');

/* ========================================================================================
 * FASE P — VERSI IKUT DI SETIAP ANGKA YANG BISA DIBANDINGKAN
 * ===================================================================================== */
test('P: manifest menyatakan versi bundle Braincore', () => {
  assert.ok(/^\d+\.\d+\.\d+$/.test(String(Manifest.bundleVersion)),
    'bundleVersion bukan versi semantik: ' + Manifest.bundleVersion);
});

test('P: Decision Trace membawa braincoreVersion', () => {
  const t = Trace.build({ decision: 'continue', conceptId: 'c', braincoreVersion: Manifest.bundleVersion });
  assert.strictEqual(t.braincoreVersion, Manifest.bundleVersion);
  // null saat pemanggil tidak memberi — JUJUR, bukan diisi diam-diam dengan versi hari ini.
  // Trace tanpa versi harus TERLIHAT tanpa versi, supaya tidak ikut dibandingkan.
  assert.strictEqual(Trace.build({ decision: 'continue', conceptId: 'c' }).braincoreVersion, null);
});

test('P: catatan bukti membawa braincoreVersion', () => {
  const r = Evidence.build({ conceptId: 'c', attemptNumber: 1, braincoreVersion: Manifest.bundleVersion });
  assert.strictEqual(r.braincoreVersion, Manifest.bundleVersion);
});

test('P: tolok ukur MENOLAK diam saat versinya bergeser', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'benchmarks', 'braincore-benchmark-v1.json'), 'utf8'));
  assert.strictEqual(spec.braincoreVersion, Manifest.bundleVersion,
    'ekspektasi tolok ukur direkam pada versi Braincore lain');
  const gate = fs.readFileSync(path.join(__dirname, 'braincore-benchmark-test.js'), 'utf8');
  assert.ok(gate.indexOf('spec.braincoreVersion') !== -1 && gate.indexOf('Manifest.bundleVersion') !== -1,
    'gerbang tolok ukur tidak lagi membandingkan versi — angka lintas rilis bisa tercampur diam-diam');
});

test('P: studi simulasi mencatat versi di berkas hasilnya', () => {
  const p = path.join(__dirname, 'simulations', 'results.json');
  assert.ok(fs.existsSync(p), 'simulations/results.json tidak ada');
  const res = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(res.braincoreVersion, Manifest.bundleVersion,
    'hasil studi direkam pada versi lain — bandingkan dengan sadar, jangan diam-diam');
});

/* ========================================================================================
 * FASE O — BRAINCORE TIDAK BISA MENULIS ULANG DIRINYA SENDIRI
 *
 * Ini larangan yang paling penting di seluruh Fase 2, dan satu-satunya yang kerugiannya
 * tidak bisa dibatalkan: mesin yang mengubah kode produksinya sendiri karena data murid akan
 * berubah menjadi sesuatu yang tidak seorang pun pernah tinjau, tanpa ada yang menyadarinya.
 * ===================================================================================== */
test('O: tidak ada kode yang menulis KE DALAM features/brain/', () => {
  // Versi pertama assert ini menandai berkas yang memuat writeFileSync DAN menyebut
  // "features/brain" di mana pun — dan menuduh enam berkas yang seluruhnya tidak bersalah,
  // termasuk gerbang ini sendiri. Menyebut sebuah folder di dalam require() bukan menulis
  // ke dalamnya. Yang diperiksa sekarang ARGUMEN JALURNYA, bukan keberadaan kata.
  const penulis = [];
  const lihat = (dir) => {
    for (const nama of fs.readdirSync(dir)) {
      if (['node_modules', '.git', 'vendor', 'simulations', 'benchmarks', 'coordination'].includes(nama)) continue;
      const p = path.join(dir, nama);
      const st = fs.statSync(p);
      if (st.isDirectory()) { lihat(p); continue; }
      if (!/\.(js|mjs|cjs)$/.test(nama)) continue;
      const src = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      // Tulis-berkas yang ARGUMEN PERTAMANYA menyebut features/brain di baris yang sama.
      const re = /(?:writeFileSync|createWriteStream)\s*\(([^;]{0,160})/g;
      let m;
      while ((m = re.exec(src))) {
        if (/features[\/\\]brain/.test(m[1])) penulis.push(path.relative(__dirname, p));
      }
    }
  };
  lihat(__dirname);
  assert.deepStrictEqual([...new Set(penulis)], [],
    'berkas ini menulis KE DALAM Braincore: ' + penulis.join(', '));
});

test('O: jumlah modul yang membekukan ekspornya SESUAI yang didokumentasikan', () => {
  // Assert ini lahir dari cacat DOKUMENTASI, bukan cacat kode. SALE/BRAINCORE_ARCHITECTURE.md
  // dulu berkata "Exports are frozen, so nothing can be monkey-patched at runtime" — kalimat
  // yang ditulis untuk calon pembeli, dan TIDAK BENAR. Yang membekukan ekspornya cuma empat.
  //
  // Membekukan sisanya adalah keputusan produk, bukan keputusan audit, jadi yang dikunci di
  // sini adalah ANGKANYA — supaya dokumennya tidak bisa menyimpang dari kenyataan lagi tanpa
  // ada yang merah.
  const beku = [];
  for (const row of Manifest.modules) {
    let mod;
    try { mod = require(path.join(__dirname, 'features', 'brain', row.file)); } catch (_) { continue; }
    if (mod && typeof mod === 'object' && Object.isFrozen(mod)) beku.push(row.file);
  }
  const doc = fs.readFileSync(path.join(__dirname, 'SALE', 'BRAINCORE_ARCHITECTURE.md'), 'utf8');
  const cocok = doc.match(/\*\*(\d+) of (\d+) modules\*\* freeze/);
  assert.ok(cocok, 'SALE/BRAINCORE_ARCHITECTURE.md tidak lagi menyebut jumlah modul yang beku');
  assert.strictEqual(beku.length, Number(cocok[1]),
    'dokumen berkata ' + cocok[1] + ' modul beku, kenyataannya ' + beku.length
    + ' (' + beku.join(', ') + ') — perbarui dokumennya, jangan angkanya');
});

test('O: tidak ada eval/Function-constructor di Braincore — tidak ada kode yang lahir saat jalan', () => {
  const dir = path.join(__dirname, 'features', 'brain');
  const tersangka = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/\beval\s*\(/.test(src) || /new\s+Function\s*\(/.test(src)) tersangka.push(f);
  }
  assert.deepStrictEqual(tersangka, [],
    'modul ini bisa membuat kode baru saat berjalan: ' + tersangka.join(', '));
});

/* ========================================================================================
 * FASE N — GLOBAL LEARNING INTELLIGENCE BELUM BOLEH ADA
 * ===================================================================================== */
test('N: tidak ada agregasi lintas-murid yang memberi umpan balik ke Braincore', () => {
  // Versi pertama mencari kata 'cohort' dan menuduh fiezel-item-calibration.js. Itu SALAH:
  // `recenter()` menghitung median kohort ITEM milik satu murid — bukan kohort MURID. Kata
  // yang sama, wilayah yang berbeda, dan ini kali ketiga saya tertipu daftar kata di sesi ini.
  //
  // Yang berbahaya bukan kata, melainkan JALUR: modul yang menerima data banyak murid.
  // Braincore murni dan tanpa I/O, jadi satu-satunya cara data populasi masuk adalah lewat
  // ARGUMEN. Yang diperiksa: tidak ada modul yang menerima daftar-murid.
  const dir = path.join(__dirname, 'features', 'brain');
  const tersangka = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/\b(?:learners|students|allUsers|perUser|userRows|populationOf)\b/.test(src)) tersangka.push(f);
  }
  assert.deepStrictEqual(tersangka, [],
    'modul ini menerima data banyak murid: ' + tersangka.join(', '));
});

test('N: otoritas modul bukti tetap "off" — antarmukanya ada, jalurnya belum', () => {
  const row = Manifest.modules.find((m) => m.file === 'fiezel-braincore-evidence.js');
  assert.ok(row, 'modul bukti tidak terdaftar');
  assert.strictEqual(Manifest.authorityMap[row.authorityKey], 'off',
    'jalur bukti sudah menyala — Fase N melarangnya sampai ada persetujuan manusia yang tercatat');
});

test('N/O: dokumen yang menuliskan larangan ini ada dan menyebut persetujuan manusia', () => {
  const p = path.join(__dirname, 'AUDIT', '16_FUTURE_LOOP_AND_VERSIONING.md');
  assert.ok(fs.existsSync(p), 'AUDIT/16 tidak ada — larangan tanpa dokumen tidak bisa dirujuk siapa pun');
  const doc = fs.readFileSync(p, 'utf8');
  for (const wajib of ['Human approval', 'Shadow', 'braincoreVersion']) {
    assert.ok(doc.indexOf(wajib) !== -1, 'AUDIT/16 tidak menyebut "' + wajib + '"');
  }
});

test('terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-version-safety-test.js') !== -1, 'gerbang ini tidak terdaftar');
});

console.log(failures === 0 ? 'BraincoreVersionSafety: PASS' : 'BraincoreVersionSafety: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
