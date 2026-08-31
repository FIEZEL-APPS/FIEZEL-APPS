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

/* ============================================================================
 * GERBANG WIRING NYATA (audit Fase 2, 30 Agu 2026) — MENGGANTI TES BERONGGA.
 *
 * KENAPA TES LAMA DIHAPUS. Tes di tempat ini dulu bernama "modul tanpa satu pun
 * referensi di app.js dinyatakan off" tetapi SELURUH ISINYA adalah:
 *
 *     assert.strictEqual(manifest.authorityMap.stepTutor, 'off');
 *     assert.strictEqual(manifest.authorityMap.productionGrader, 'off');
 *
 * Itu membandingkan konstanta beku dengan konstanta beku. Ia TIDAK PERNAH membaca
 * app.js, jadi ia setuju dengan dirinya sendiri selamanya. Ia HIJAU selama berbulan-
 * bulan sementara fakta yang ia klaim jaga sudah salah: productionGrader memutuskan
 * benar/salah jawaban ketik murid (app.js:7944) dan stepTutor merender tuntunan yang
 * dilihat murid (app.js:7732). Gerbang hijau yang tidak menjaga apa pun lebih buruk
 * daripada tidak ada gerbang: ia membuat orang berhenti memeriksa.
 *
 * YANG DILAKUKAN GERBANG BARU. Ia MEMBACA SUMBER — app.js plus setiap berkas yang
 * benar-benar dimuat index.html — lalu memverifikasi klasifikasi manifest terhadap
 * bukti yang bisa ditunjuk:
 *
 *   'off'              => NOL referensi global modul di seluruh permukaan runtime.
 *   'active'/'shadow'  => MINIMAL SATU referensi. Modul yang tidak pernah disebut
 *                         tidak bisa sedang memutuskan apa pun.
 *
 * BATAS JUJUR GERBANG INI, dinyatakan supaya tidak ada yang mengira ia lebih kuat
 * daripada yang sebenarnya: ia membedakan "dipanggil" dari "tidak dipanggil". Ia TIDAK
 * bisa membedakan 'active' dari 'shadow' — perbedaan itu soal apakah keluarannya
 * mengubah pengalaman murid atau dibuang, dan itu butuh penilaian manusia atas jalur
 * keputusan. Batas itu ditandai eksplisit di bawah, bukan disembunyikan.
 * ========================================================================== */

/** Permukaan runtime = app.js + semua <script src="./..."> di index.html, minus
 *  berkas modul Brain itu sendiri (sebuah modul menyebut namanya sendiri saat
 *  mendaftar ke global; itu bukan bukti ada yang memanggilnya). */
function runtimeSurfaceSources() {
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const files = new Set(['app.js']);
  const re = /<script[^>]*src="\.\/([^"]+)"/g;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const rel = m[1];
    if (rel.startsWith('features/brain/')) continue;
    files.add(rel);
  }
  const out = [];
  for (const rel of files) {
    const abs = path.join(__dirname, rel);
    if (fs.existsSync(abs)) out.push({ file: rel, src: fs.readFileSync(abs, 'utf8') });
  }
  return out;
}

/** Hitung referensi global modul di seluruh permukaan runtime. */
function runtimeReferences(globalName, sources) {
  const re = new RegExp('\\b' + globalName + '\\b', 'g');
  const hits = [];
  for (const { file, src } of sources) {
    const n = (src.match(re) || []).length;
    if (n > 0) hits.push(file + '(' + n + ')');
  }
  return hits;
}

/* ---------------------------------------------------------------------------
 * PENGECUALIAN 'off' YANG BERALASAN — dan yang MEMBATALKAN DIRINYA SENDIRI.
 *
 * Sebuah REFERENSI bukan sebuah PANGGILAN. Satu modul bisa disebut di berkas yang
 * dimuat runtime dan tetap tidak pernah dieksekusi karena konfigurasi yang benar-benar
 * dikirim menutup jalurnya lebih dulu. Menolak fakta itu akan memaksa manifest berbohong
 * ke arah sebaliknya (menandai 'active' sesuatu yang tidak pernah jalan).
 *
 * Maka pengecualian diizinkan, dengan dua syarat keras, meniru pola allowlist
 * secret-scan-test.js:
 *   1. alasan tertulis >= 40 karakter, bisa dinilai orang lain;
 *   2. predikat `stillGatedOff()` yang MEMERIKSA ULANG prasyaratnya tiap kali gerbang
 *      berjalan. Begitu prasyarat runtuh, gerbang MERAH dan manifest wajib dinaikkan.
 * Pengecualian tanpa syarat ke-2 hanyalah gerbang yang dimatikan dengan sopan.
 * ------------------------------------------------------------------------- */
const OFF_EXCEPTIONS = {
  FiezelStatGate: {
    reason:
      "content-promotion.js memasang FiezelStatGate.verdict sebagai pemutus promote/rollback " +
      "konten, dan app.js:3004 memanggil CONTENT_PROMOTION.evaluate() tiap kali aplikasi dimuat. " +
      "TETAPI konfigurasi canary yang dikirim (content-canary-config.js: enabled:false, mode:'off') " +
      "membuat evaluate() keluar lebih dulu dengan reason 'canary_not_active', sebelum baris gate " +
      "mana pun. Probe empiris audit Fase 2: verdict dipanggil NOL kali. Jadi 'off' benar UNTUK " +
      "KONFIGURASI YANG DIKIRIM — modul ini satu sakelar konfigurasi dari menjadi aktif.",
    /** Prasyarat: canary MASIH mati di konfigurasi yang dikirim. */
    stillGatedOff() {
      const cfgSrc = fs.readFileSync(path.join(__dirname, 'content-canary-config.js'), 'utf8');
      return /enabled\s*:\s*false/.test(cfgSrc) && /mode\s*:\s*'off'/.test(cfgSrc);
    }
  }
};

function offExceptionHolds(globalName) {
  const ex = OFF_EXCEPTIONS[globalName];
  return !!ex && ex.stillGatedOff();
}

test('authorityMap diverifikasi terhadap wiring NYATA di app.js + index.html, bukan terhadap konstanta', () => {
  const sources = runtimeSurfaceSources();
  assert.ok(sources.length > 1,
    'permukaan runtime tidak terbaca — index.html tidak memuat satu pun script?');

  const problems = [];
  for (const mod of manifest.modules) {
    const authority = manifest.authorityMap[mod.authorityKey];
    const hits = runtimeReferences(mod.global, sources);

    if (authority === 'off' && hits.length > 0 && !offExceptionHolds(mod.global)) {
      problems.push(
        mod.global + " ditandai 'off' (= tidak pernah dipanggil jalur aplikasi mana pun) " +
        'tetapi DIRUJUK di: ' + hits.join(', ') +
        ' — perbarui authorityMap dari bukti, jangan biarkan manifest basi.');
    }
    if ((authority === 'active' || authority === 'shadow') && hits.length === 0) {
      problems.push(
        mod.global + " ditandai '" + authority + "' tetapi NOL referensi di seluruh " +
        'permukaan runtime — modul yang tidak pernah disebut tidak bisa sedang memutuskan apa pun.');
    }
  }
  assert.strictEqual(problems.length, 0, '\n  - ' + problems.join('\n  - '));
});

test("modul 'off' benar-benar nol referensi runtime (daftar dibuktikan, bukan dihafal)", () => {
  const sources = runtimeSurfaceSources();
  const offModules = manifest.modules.filter(m => manifest.authorityMap[m.authorityKey] === 'off');
  assert.ok(offModules.length > 0, "tidak ada modul 'off' — daftar off tidak boleh kosong diam-diam");
  for (const mod of offModules) {
    if (offExceptionHolds(mod.global)) continue;
    const hits = runtimeReferences(mod.global, sources);
    assert.strictEqual(hits.length, 0,
      mod.global + " diklaim 'off' tetapi muncul di " + hits.join(', '));
  }
});

test('setiap pengecualian off masih SAH — prasyaratnya diperiksa ulang, bukan dipercaya', () => {
  // Pengecualian yang tidak pernah diperiksa ulang adalah lubang permanen. Tes ini
  // menjalankan predikat tiap pengecualian dan MEMERAH begitu prasyaratnya runtuh —
  // itulah yang membuat pengecualian ini berbeda dari sekadar mematikan gerbang.
  for (const [globalName, ex] of Object.entries(OFF_EXCEPTIONS)) {
    assert.ok(ex.reason.length >= 40,
      globalName + ': alasan pengecualian terlalu pendek untuk bisa dinilai orang lain');
    assert.ok(ex.stillGatedOff(),
      globalName + ': PRASYARAT PENGECUALIAN SUDAH TIDAK BERLAKU.\n      ' + ex.reason +
      '\n      => modul ini sekarang benar-benar bisa dipanggil. Naikkan authorityMap.' +
      globalName.replace(/^Fiezel/, '').replace(/^./, c => c.toLowerCase()) +
      " dari 'off' ke klasifikasi yang benar, di commit yang sama dengan perubahan yang membukanya.");
  }
});

test('stepTutor dan productionGrader: klasifikasi dibaca dari app.js, bukan dipatok konstanta', () => {
  // Regresi khusus untuk drift yang ditemukan audit Fase 2. Sengaja TIDAK menuliskan
  // 'active' sebagai konstanta yang dibandingkan dengan konstanta — itu kesalahan tes
  // lama. Yang di-assert: app.js benar-benar memanggil keduanya, DAN manifest tidak
  // menyebutnya 'off'.
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  assert.ok(/FiezelProductionGrader\s*\.\s*grade\s*\(|FiezelProductionGrader;[\s\S]{0,400}?\.grade\(/.test(app)
        || /self\.FiezelProductionGrader\.grade\(/.test(app),
    'app.js tidak lagi memanggil FiezelProductionGrader.grade() — kalau jalur cloze memang ' +
    'dicabut, turunkan manifest ke off DI COMMIT YANG SAMA.');
  assert.notStrictEqual(manifest.authorityMap.productionGrader, 'off',
    "app.js memanggil FiezelProductionGrader.grade() tetapi manifest masih menyebutnya 'off'");

  assert.ok(/FiezelStepTutor/.test(app) && /decompose\s*\(/.test(app),
    'app.js tidak lagi memakai FiezelStepTutor.decompose() — kalau tuntunan langkah memang ' +
    'dicabut, turunkan manifest ke off DI COMMIT YANG SAMA.');
  assert.notStrictEqual(manifest.authorityMap.stepTutor, 'off',
    "app.js memanggil FiezelStepTutor.decompose() tetapi manifest masih menyebutnya 'off'");
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
