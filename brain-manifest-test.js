/**
 * FIEZEL gate — Brain Manifest (Braincore v3, Fase 0).
 *
 * Manifest yang salah lebih berbahaya daripada tidak ada manifest: ia memberi rasa
 * pasti pada peta yang bohong. Maka gate ini tidak menguji "apakah manifest ada",
 * melainkan APAKAH MANIFEST COCOK DENGAN KENYATAAN DI DISK dan tidak bisa dimutasi:
 *
 *   - setiap file modul yang BENAR-BENAR ada di features/brain/ harus tercantum
 *     (manifest yang melewatkan modul = peta yang menyembunyikan wilayah);
 *   - string SCHEMA yang dicantumkan harus sama persis dengan deklarasi di file
 *     sumbernya — bukan hasil karangan;
 *   - versi bundle & minAppVersion harus bisa diparse semver-ish (kalau tidak,
 *     tidak ada yang bisa membandingkan dua bundle);
 *   - setiap entri otoritas hanya boleh 'active' | 'shadow' | 'off';
 *   - klaim otoritas kunci harus sesuai temuan council (memory aktif, BKT bayangan);
 *   - seluruh manifest benar-benar beku sampai ke dalam.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const manifest = require('./features/brain/fiezel-brain-manifest.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const BRAIN_DIR = path.join(__dirname, 'features', 'brain');
const VALID_AUTHORITY = ['active', 'shadow', 'off'];
// semver-ish: 1-3 komponen angka, komponen pertama wajib angka murni.
const SEMVERISH = /^\d+(\.\d+){0,2}$/;

test('setiap file .js yang ada di features/brain/ tercantum di manifest', () => {
  const onDisk = fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.js')).sort();
  assert.ok(onDisk.length > 0, 'features/brain/ kosong? pembacaan direktori gagal');
  const listed = manifest.modules.map(m => m.file).sort();
  for (const f of onDisk) {
    assert.ok(listed.includes(f), 'modul di disk TIDAK tercantum di manifest: ' + f);
  }
});

test('manifest tidak mencantumkan file hantu yang tidak ada di disk', () => {
  const onDisk = new Set(fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.js')));
  for (const m of manifest.modules) {
    assert.ok(onDisk.has(m.file), 'manifest mencantumkan file yang tidak ada: ' + m.file);
  }
});

test('string SCHEMA di manifest sama persis dengan deklarasi di file sumber', () => {
  for (const m of manifest.modules) {
    const src = fs.readFileSync(path.join(BRAIN_DIR, m.file), 'utf8');
    // Pola deklarasi konvensi repo: var SCHEMA = '...';
    const decl = src.match(/var\s+SCHEMA\s*=\s*'([^']+)'/);
    if (decl) {
      assert.strictEqual(m.schema, decl[1],
        m.file + ': manifest bilang ' + JSON.stringify(m.schema) + ' tetapi sumber mendeklarasikan ' + JSON.stringify(decl[1]));
    } else {
      assert.strictEqual(m.schema, null,
        m.file + ': sumber TIDAK mendeklarasikan SCHEMA, manifest wajib null, bukan ' + JSON.stringify(m.schema));
    }
  }
});

test('bundleVersion dan minAppVersion bisa diparse semver-ish', () => {
  assert.ok(SEMVERISH.test(manifest.bundleVersion), 'bundleVersion tidak semver-ish: ' + manifest.bundleVersion);
  assert.ok(SEMVERISH.test(manifest.minAppVersion), 'minAppVersion tidak semver-ish: ' + manifest.minAppVersion);
});

test('bundleVersion dimulai dari 3.0.0 (identitas bundle Braincore v3 pertama)', () => {
  assert.strictEqual(manifest.bundleVersion, '3.0.0');
});

test('minAppVersion sama dengan FIEZEL_VERSION di version.js (dibaca, bukan dikarang)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'version.js'), 'utf8');
  const decl = src.match(/FIEZEL_VERSION\s*=\s*'([^']+)'/);
  assert.ok(decl, 'version.js tidak terbaca / pola FIEZEL_VERSION berubah');
  assert.strictEqual(manifest.minAppVersion, decl[1]);
});

test("setiap entri authorityMap bernilai valid ('active'|'shadow'|'off')", () => {
  const keys = Object.keys(manifest.authorityMap);
  assert.ok(keys.length > 0, 'authorityMap kosong');
  for (const k of keys) {
    assert.ok(VALID_AUTHORITY.includes(manifest.authorityMap[k]),
      'authorityMap.' + k + ' bernilai tidak sah: ' + JSON.stringify(manifest.authorityMap[k]));
  }
});

test('setiap modul menunjuk authorityKey yang benar-benar ada di authorityMap', () => {
  for (const m of manifest.modules) {
    assert.ok(Object.prototype.hasOwnProperty.call(manifest.authorityMap, m.authorityKey),
      m.file + ' menunjuk authorityKey tak dikenal: ' + m.authorityKey);
  }
});

test('klaim otoritas kunci sesuai temuan council: memory aktif, bktUnlock bayangan', () => {
  assert.strictEqual(manifest.authorityMap.memory, 'active');
  assert.strictEqual(manifest.authorityMap.bktUnlock, 'shadow');
});

/* Otoritas diperiksa DUA ARAH, dan diturunkan dari app.js — bukan dipaku sebagai daftar.
 *
 * Bentuk lama memaku `stepTutor === 'off'` dan `productionGrader === 'off'` berikut alasan
 * "nol pemanggil di app.js". Alasan itu benar saat ditulis dan berhenti benar begitu wiring
 * keduanya mendarat, tetapi assert-nya tidak ikut berubah — jadi gerbang ini MEMAKU KLAIM
 * YANG SALAH: manifest menyebut mesin penilai jawaban cloze 'off' selama berbulan-bulan,
 * dan satu-satunya gerbang yang mengawasinya justru menolak kebenaran.
 *
 * Yang salah bukan angkanya melainkan arahnya: memeriksa hanya "nol referensi => off"
 * membiarkan arah sebaliknya (dipanggil, tapi diaku 'off') lolos selamanya. Sekarang
 * keduanya ditagih, dan daftarnya DITURUNKAN dari manifest + sumber app.js sehingga modul
 * berikutnya yang di-wire ikut terjaga tanpa ada yang perlu ingat memperbarui berkas ini.
 *
 * Batas yang disengaja: beda 'active' vs 'shadow' TIDAK bisa disimpulkan dari jumlah
 * referensi (satu referensi bisa saja cuma memberi makan panel diagnostik). Jadi yang
 * ditegakkan di sini hanya batas 'off' — yang memang bisa dibuktikan mekanis. Penilaian
 * active/shadow tetap milik manusia, dan bukti tiap klasifikasi ada di komentar manifest. */
test('otoritas manifest konsisten dua arah dengan referensi nyata di app.js', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  // Komentar dan isi string dibuang lebih dulu: penyebutan nama global di dalam komentar
  // bukan pemanggilan, dan menghitungnya akan menyatakan modul mati sebagai hidup.
  let code = '', i = 0;
  while (i < appSrc.length) {
    const c = appSrc[i], d = appSrc[i + 1];
    if (c === '/' && d === '/') { const j = appSrc.indexOf('\n', i); if (j < 0) break; i = j; continue; }
    if (c === '/' && d === '*') { const j = appSrc.indexOf('*/', i + 2); if (j < 0) break; i = j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < appSrc.length) { if (appSrc[j] === '\\') { j += 2; continue; } if (appSrc[j] === q) break; j++; }
      code += ' '; i = j + 1; continue;
    }
    code += c; i++;
  }
  const salah = [];
  for (const mod of manifest.modules) {
    if (!mod.global || !mod.authorityKey) continue;
    const refs = (code.match(new RegExp('\\b' + mod.global + '\\b', 'g')) || []).length;
    const otoritas = manifest.authorityMap[mod.authorityKey];
    if (refs === 0 && otoritas !== 'off') {
      salah.push(`${mod.authorityKey}: nol referensi di app.js tetapi diaku '${otoritas}'`);
    }
    if (refs > 0 && otoritas === 'off') {
      salah.push(`${mod.authorityKey}: ${refs} referensi di app.js tetapi diaku 'off'`);
    }
  }
  assert.deepStrictEqual(salah, [], 'otoritas manifest tidak jujur:\n  ' + salah.join('\n  '));
});

test('contentCompatibility cocok dengan deklarasi schemaVersion grammar-templates.json', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'grammar-templates.json'), 'utf8'));
  const declared = raw.schemaVersion ?? raw.meta?.schemaVersion;
  assert.strictEqual(manifest.contentCompatibility['grammar-templates.json'], declared);
});

test('manifest benar-benar frozen sampai ke dalam (deep freeze, bukan sekadar kulit)', () => {
  assert.ok(Object.isFrozen(manifest), 'objek akar tidak frozen');
  assert.ok(Object.isFrozen(manifest.modules), 'modules tidak frozen');
  assert.ok(Object.isFrozen(manifest.modules[0]), 'entri modul tidak frozen');
  assert.ok(Object.isFrozen(manifest.authorityMap), 'authorityMap tidak frozen');
  assert.ok(Object.isFrozen(manifest.contentCompatibility), 'contentCompatibility tidak frozen');
  // Bukti perilaku, bukan hanya bendera: mutasi harus GAGAL senyap/throw, nilai tak berubah.
  const before = manifest.authorityMap.bktUnlock;
  try { manifest.authorityMap.bktUnlock = 'active'; } catch (e) { /* strict mode boleh throw */ }
  assert.strictEqual(manifest.authorityMap.bktUnlock, before, 'authorityMap bisa dimutasi!');
  try { manifest.modules.push({ file: 'palsu.js' }); } catch (e) { /* frozen array boleh throw */ }
  assert.ok(!manifest.modules.some(m => m.file === 'palsu.js'), 'daftar modul bisa ditambah!');
});

test('describe() membawa rationale brain3_manifest_v1 dan confidence yang masuk akal', () => {
  const d = manifest.describe();
  assert.strictEqual(d.rationale, 'brain3_manifest_v1');
  assert.ok(typeof d.confidence === 'number' && d.confidence > 0 && d.confidence <= 1,
    'confidence tidak sah: ' + d.confidence);
  assert.strictEqual(d.bundleVersion, manifest.bundleVersion);
  assert.strictEqual(d.moduleCount, manifest.modules.length);
  assert.ok(typeof d.summary === 'string' && d.summary.includes('fiezel-core-brain-v2'),
    'ringkasan harus menyebut schema core yang sebenarnya (v2), bukan mengaku v3');
  const total = d.authorityCounts.active + d.authorityCounts.shadow + d.authorityCounts.off;
  assert.strictEqual(total, Object.keys(manifest.authorityMap).length,
    'hitungan otoritas tidak menjumlah ke total entri');
});

test('modul murni: tanpa DOM/jaringan/storage/Math.random/Date.now', () => {
  // Komentar konvensi repo justru WAJIB menyebut larangan-larangan ini ("tanpa
  // Math.random", dst.) — jadi yang dipindai adalah KODE, bukan komentarnya.
  const src = fs.readFileSync(path.join(BRAIN_DIR, 'fiezel-brain-manifest.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  for (const banned of ['document.', 'window.', 'localStorage', 'fetch(', 'XMLHttpRequest', 'Math.random', 'Date.now']) {
    assert.ok(!src.includes(banned), 'modul memakai yang terlarang: ' + banned);
  }
});

if (failures > 0) {
  console.error('BrainManifest: FAIL (' + failures + ' kegagalan)');
  process.exit(1);
}
console.log('BrainManifest: PASS');
