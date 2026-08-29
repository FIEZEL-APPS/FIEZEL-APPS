#!/usr/bin/env node
/**
 * GERBANG PENYAMBUNGAN OTAK KE HALAMAN (brain-page-wiring-test.js) — m025-201
 *
 * ==========================================================================
 * LUBANG YANG DITUTUP
 * ==========================================================================
 * `brain-manifest-test.js` sudah teliti: ia mengadu manifest dengan ISI DIREKTORI
 * (setiap file di `features/brain/` tercantum, tidak ada file hantu, string SCHEMA
 * dibaca dari sumbernya, seluruh manifest beku). Satu hal yang TIDAK ia periksa:
 * apakah modul yang manifest nyatakan BERWENANG benar-benar DIMUAT HALAMAN.
 *
 * Hari ini keadaannya masih konsisten — satu modul tidak dimuat `index.html`
 * (`fiezel-retention-probe.js`), dan otoritasnya memang `off`, jadi nol modul
 * `active`/`shadow` yang hilang. Tapi konsistensi hari ini bukan gerbang. Kalau
 * besok ada modul berotoritas `active` yang lupa dimasukkan ke halaman, NOL
 * gerbang akan mengatakannya — dan itu persis kelas cacat yang membunuh analytics
 * murid secara senyap pada T-031: dideklarasikan hidup, nyatanya tidak pernah
 * dijalankan, tanpa satu pun galat konsol.
 *
 * Manifest yang mengaku sebuah modul berwenang sementara berkasnya tidak pernah
 * sampai ke perangkat murid lebih berbahaya daripada tidak punya manifest sama
 * sekali: ia memberi rasa pasti pada peta yang bohong, dan setiap laporan yang
 * membacanya ikut bohong.
 *
 * ==========================================================================
 * YANG DI-ASSERT
 * ==========================================================================
 *   W1  setiap modul berotoritas 'active' ATAU 'shadow' punya <script src> di
 *       index.html — otoritas tanpa pemuatan adalah klaim kosong;
 *   W2  setiap modul berotoritas 'active' ATAU 'shadow' ikut di-precache sw.js —
 *       modul yang hanya ada saat online bukan modul yang berwenang, karena
 *       FIEZEL adalah PWA dan sesi offline adalah sesi yang sah;
 *   W3  setiap berkas `features/brain/*.js` yang DIMUAT index.html tercantum di
 *       manifest — skrip otak yang tidak ada di peta adalah wilayah gelap;
 *   W4  setiap berkas `features/brain/*.js` yang di-precache sw.js tercantum di
 *       manifest — sama, dari sisi cache;
 *   W5  index.html dan sw.js sepakat: tidak ada modul otak yang dimuat halaman
 *       tetapi absen dari precache (jebakan "hidup online, mati offline");
 *   W6  modul berotoritas 'off' yang TIDAK dimuat halaman dilaporkan apa adanya
 *       sebagai keputusan sadar, dan jumlahnya dicetak — supaya 'off' tidak
 *       berubah pelan-pelan menjadi tempat sampah;
 *   W7  setiap nilai otoritas yang dipakai gerbang ini memang ada di manifest
 *       (kalau peta otoritasnya diganti bentuk, gerbang ini wajib ikut merah,
 *       bukan diam-diam lulus karena tidak menemukan apa-apa).
 *
 * BUKTI-BISA-MERAH: keempat detektor utama dijalankan ulang terhadap salinan
 * index.html / sw.js / peta otoritas yang SENGAJA DIRUSAK DI MEMORI, dan gerbang
 * menuntut detektornya MERAH. Tidak satu byte pun ditulis ke disk.
 *
 * Nol jaringan, nol tulis berkas, nol eksekusi app.js.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const BRAIN_DIR = path.join(root, 'features', 'brain');
const manifest = require('./features/brain/fiezel-brain-manifest.js');

let failures = 0;
let checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

/**
 * Berkas otak yang benar-benar dimuat HALAMAN. Dibaca dari `src=` sungguhan, bukan
 * dari sebutan di komentar mana pun — komentar tidak pernah mengunduh apa-apa.
 */
function loadedByPage(html) {
  const found = new Set();
  const re = /<script[^>]+src\s*=\s*["']\.\/features\/brain\/([A-Za-z0-9_.-]+\.js)["']/g;
  let m;
  while ((m = re.exec(html))) found.add(m[1]);
  return found;
}
/**
 * Berkas otak yang benar-benar di-precache service worker. Sama: dibaca dari string
 * jalur di dalam sumber sw.js, sehingga entri yang cuma disebut di komentar tidak
 * dihitung sebagai bukti.
 */
function precachedBySw(source) {
  const found = new Set();
  const re = /['"]\.\/features\/brain\/([A-Za-z0-9_.-]+\.js)['"]/g;
  let m;
  while ((m = re.exec(source))) found.add(m[1]);
  return found;
}
/** Modul manifest yang otoritasnya benar-benar mengubah pengalaman murid atau tercatat. */
function authoritativeModules(map) {
  return manifest.modules.filter(mod => ['active', 'shadow'].includes(map[mod.authorityKey]));
}
function missingFromPage(map, html) {
  const loaded = loadedByPage(html);
  return authoritativeModules(map).filter(mod => !loaded.has(mod.file)).map(mod => mod.file + ' (' + map[mod.authorityKey] + ')');
}
function missingFromSw(map, source) {
  const cached = precachedBySw(source);
  return authoritativeModules(map).filter(mod => !cached.has(mod.file)).map(mod => mod.file + ' (' + map[mod.authorityKey] + ')');
}

test('W7 · peta otoritas manifest terbaca dan memakai kosakata yang gerbang ini pahami', () => {
  const values = new Set(Object.values(manifest.authorityMap));
  assert.ok(values.size > 0, 'authorityMap kosong — gerbang ini akan lulus tanpa memeriksa apa pun');
  for (const v of values) {
    assert.ok(['active', 'shadow', 'off'].includes(v), 'nilai otoritas asing: ' + JSON.stringify(v));
  }
  assert.ok(authoritativeModules(manifest.authorityMap).length > 0,
    'nol modul active/shadow — gerbang ini jadi hijau kosong, bukan hijau berarti');
});

test('W1 · setiap modul active/shadow benar-benar DIMUAT index.html', () => {
  const missing = missingFromPage(manifest.authorityMap, indexHtml);
  assert.deepStrictEqual(missing, [],
    'manifest mengaku modul ini berwenang tetapi halaman tidak pernah memuatnya: ' + missing.join(', '));
});

test('W2 · setiap modul active/shadow ikut di-precache sw.js (sesi offline tetap sesi yang sah)', () => {
  const missing = missingFromSw(manifest.authorityMap, swSource);
  assert.deepStrictEqual(missing, [],
    'modul berwenang yang hilang dari precache — hidup online, mati offline: ' + missing.join(', '));
});

test('W3 · tidak ada skrip otak di index.html yang absen dari manifest', () => {
  const listed = new Set(manifest.modules.map(m => m.file));
  const ghosts = [...loadedByPage(indexHtml)].filter(f => !listed.has(f));
  assert.deepStrictEqual(ghosts, [],
    'halaman memuat modul otak yang tidak ada di peta: ' + ghosts.join(', '));
});

test('W4 · tidak ada skrip otak di precache sw.js yang absen dari manifest', () => {
  const listed = new Set(manifest.modules.map(m => m.file));
  const ghosts = [...precachedBySw(swSource)].filter(f => !listed.has(f));
  assert.deepStrictEqual(ghosts, [],
    'sw.js men-cache modul otak yang tidak ada di peta: ' + ghosts.join(', '));
});

test('W5 · index.html dan sw.js sepakat tentang modul otak mana yang ada', () => {
  const loaded = loadedByPage(indexHtml), cached = precachedBySw(swSource);
  const pageOnly = [...loaded].filter(f => !cached.has(f));
  assert.deepStrictEqual(pageOnly, [],
    'dimuat halaman tetapi tidak di-precache (mati begitu murid offline): ' + pageOnly.join(', '));
});

test('W6 · modul off yang tidak dimuat halaman dilaporkan sebagai keputusan sadar', () => {
  const loaded = loadedByPage(indexHtml);
  const offAbsent = manifest.modules
    .filter(mod => manifest.authorityMap[mod.authorityKey] === 'off' && !loaded.has(mod.file))
    .map(mod => mod.file);
  // Bukan kegagalan: modul 'off' memang boleh belum tersambung. Yang WAJIB adalah
  // tercatat di manifest (dijamin brain-manifest-test.js) dan terhitung di sini,
  // supaya 'off' tidak pelan-pelan menjadi tempat menyembunyikan modul terlantar.
  assert.ok(Array.isArray(offAbsent), 'perhitungan modul off gagal');
  console.log('     · modul off yang memang belum dimuat halaman (' + offAbsent.length + '): ' +
    (offAbsent.join(', ') || 'tidak ada'));
  assert.ok(offAbsent.length <= manifest.modules.length, 'perhitungan modul off tidak masuk akal');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}
test('RED · setiap detektor terbukti bisa MERAH terhadap peta/halaman yang sengaja dirusak', () => {
  const victim = authoritativeModules(manifest.authorityMap)[0];
  assert.ok(victim, 'tidak ada modul berwenang untuk diracuni — gerbang tidak terbukti apa-apa');

  // (W1) modul berwenang dihapus dari index.html
  const htmlWithout = indexHtml.replace(
    new RegExp('<script[^>]+src\\s*=\\s*["\']\\./features/brain/' + victim.file.replace(/\./g, '\\.') + '["\'][^>]*>\\s*</script>'), '');
  assert.notStrictEqual(htmlWithout, indexHtml, 'racun index.html tidak menempel — pola gerbang sudah basi');
  expectRed('modul berwenang hilang dari halaman', () => {
    assert.deepStrictEqual(missingFromPage(manifest.authorityMap, htmlWithout), []);
  });

  // (W2) modul berwenang dihapus dari precache sw.js
  const swWithout = swSource.split("'./features/brain/" + victim.file + "'").join("'./features/brain/__dihapus__.js'");
  assert.notStrictEqual(swWithout, swSource, 'racun sw.js tidak menempel — pola gerbang sudah basi');
  expectRed('modul berwenang hilang dari precache', () => {
    assert.deepStrictEqual(missingFromSw(manifest.authorityMap, swWithout), []);
  });

  // (W1 dari arah lain) modul yang hari ini 'off' DAN tidak dimuat halaman dinaikkan
  // menjadi 'active'. Inilah bentuk cacat masa depan yang gerbang ini benar-benar tunggu.
  const loaded = loadedByPage(indexHtml);
  const dormant = manifest.modules.find(mod => manifest.authorityMap[mod.authorityKey] === 'off' && !loaded.has(mod.file));
  if (dormant) {
    const promoted = Object.assign({}, manifest.authorityMap, { [dormant.authorityKey]: 'active' });
    expectRed('modul off tanpa <script> dinaikkan jadi active', () => {
      assert.deepStrictEqual(missingFromPage(promoted, indexHtml), []);
    });
  }

  // (W3) skrip otak hantu disisipkan ke halaman
  const htmlGhost = indexHtml.replace('</body>', '  <script defer src="./features/brain/fiezel-hantu.js"></script>\n</body>');
  assert.notStrictEqual(htmlGhost, indexHtml, 'racun skrip hantu tidak menempel — pola gerbang sudah basi');
  expectRed('skrip otak hantu di halaman', () => {
    const listed = new Set(manifest.modules.map(m => m.file));
    assert.deepStrictEqual([...loadedByPage(htmlGhost)].filter(f => !listed.has(f)), []);
  });
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node brain-page-wiring-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL brain page wiring: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL brain page wiring: PASS (' + checks + ' uji · ' +
  authoritativeModules(manifest.authorityMap).length + ' modul berwenang diadu dengan index.html + sw.js)');
