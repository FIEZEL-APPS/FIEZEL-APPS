#!/usr/bin/env node
/**
 * m025-121 gerbang suara cadangan + kartu akun.
 *
 * KENAPA BERKAS INI ADA. Yang dijaga di sini bukan "apakah kodenya jalan" - itu urusan
 * perangkat - melainkan empat janji yang kalau dilanggar, dilanggarnya DIAM-DIAM dan baru
 * ketahuan pada hari murid membutuhkannya:
 *
 *   1. Unduhan cadangan tidak pernah terlihat murid. Satu toast saja sudah membatalkan
 *      seluruh permintaan OWNER ("tanpa ada pemberitahuan").
 *   2. Cadangan hanya dipanggil di jalur GAGAL. Kalau ia ikut dipanggil di jalur sukses,
 *      mesin 152 MB menyala di tengah pelajaran yang suaranya sudah baik-baik saja.
 *   3. Kemajuan unduhan disimpan per potongan. Tanpa ini, satu aset 78 MB yang putus
 *      berarti 78 MB terbuang - dan di iPhone aplikasi yang ditutup SELALU memutus.
 *   4. "Ganti akun" keluar dulu sebelum masuk. Tanpa itu Puter memakai sesi lama dan
 *      tombolnya tidak pernah benar-benar mengganti apa pun.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const AUTOLOAD = read('features/neural-voice/fiezel-voice-offline-autoload.js');
const SAY = read('features/neural-voice/fiezel-voice-say.js');
const APP = read('app.js');
const CONFIG = read('features/neural-voice/fiezel-neural-voice-config.js');
const BOOTSTRAP = read('features/neural-voice/fiezel-neural-voice-bootstrap.js');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

test('pengunduh latar tidak punya satu pun jalan ke layar', () => {
  const loud = ['showToast', 'alert(', 'confirm(', 'Notification', 'registration.showNotification', 'innerHTML', 'document.body'];
  const found = loud.filter((needle) => AUTOLOAD.includes(needle));
  if (found.length) {
    throw new Error('pengunduh diam-diam memanggil ' + found.join(', ')
      + ' - OWNER meminta "tanpa ada pemberitahuan", dan satu saja sudah membatalkannya');
  }
});

test('kemajuan disimpan per potongan, bukan per berkas', () => {
  // Ukuran potongan dipaku ke nilai yang diminta OWNER (m025-122: 20 MB). Yang dijaga
  // bukan angkanya sebagai selera, melainkan bahwa perubahannya disengaja: menurunkannya
  // diam-diam memperlambat unduhan, menaikkannya diam-diam memperbesar yang terbuang saat
  // satu potongan putus.
  const chunk = /CHUNK_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/.exec(AUTOLOAD);
  if (!chunk) throw new Error('ukuran potongan tidak ditemukan');
  if (Number(chunk[1]) !== 20) throw new Error('ukuran potongan ' + chunk[1] + ' MB; OWNER menetapkan 20 MB');
  if (!/Range:\s*'bytes='/.test(AUTOLOAD)) throw new Error('tidak ada Range request; unduhan yang putus akan mengulang dari nol');
  if (!AUTOLOAD.includes('partUrl')) throw new Error('potongan tidak disimpan tersendiri, jadi tidak ada yang bisa dilanjutkan');
});

test('potongan tidak pernah dirakit dari data yang tidak utuh', () => {
  // Perakitan yang menerima ukuran salah menghasilkan model rusak yang baru terdeteksi
  // saat mesin gagal menyala - jauh dari tempat kesalahannya.
  if (!AUTOLOAD.includes('chunk_size_mismatch')) throw new Error('ukuran potongan tidak diperiksa');
  if (!/if \(size !== item\.bytes\) return false;/.test(AUTOLOAD)) throw new Error('ukuran hasil rakitan tidak diperiksa');
  if (!AUTOLOAD.includes('range_unsupported')) throw new Error('server yang mengabaikan Range tidak ditolak; hasilnya aset rusak diam-diam');
});

test('pengunduh menghormati Mode Hemat Data dan keadaan luring', () => {
  if (!AUTOLOAD.includes('saveData')) throw new Error('Mode Hemat Data diabaikan; 152 MB tanpa diminta di kuota murid');
  if (!AUTOLOAD.includes('onLine')) throw new Error('keadaan luring tidak diperiksa');
});

test('pengunduh dan bootstrap memakai SATU nama cache', () => {
  // Dua salinan nama cache berarti aset terunduh dua kali dan yang kedua tidak pernah
  // dianggap sah oleh verifikasi bootstrap.
  if (!/cacheName:\s*cacheName/.test(BOOTSTRAP)) throw new Error('bootstrap tidak mengekspor cacheName');
  if (!AUTOLOAD.includes('rt.cacheName')) throw new Error('pengunduh tidak membaca cacheName dari bootstrap');
  if (/cacheName\s*=\s*[`'"]/.test(AUTOLOAD)) throw new Error('pengunduh menyusun sendiri nama cache; itu salinan yang bisa menyimpang');
});

test('cadangan hanya dipanggil di jalur gagal', () => {
  const idx = SAY.indexOf('localEngine()');
  if (idx < 0) throw new Error('tidak ada mesin cadangan di pintu bicara');
  // Panggilan speak() cadangan harus berada di dalam .catch(), bukan di jalur .then().
  const call = SAY.indexOf('local.speak(');
  const errCatch = SAY.indexOf('}).catch(function (error) {');
  if (call < 0 || errCatch < 0 || call < errCatch) {
    throw new Error('cadangan tidak dipanggil dari jalur gagal; mesin 152 MB bisa menyala saat suara online baik-baik saja');
  }
});

test('cadangan menolak menyala bila asetnya belum lengkap', () => {
  if (!/st\.prepared \|\| st\.ready/.test(SAY)) {
    throw new Error('tidak ada pemeriksaan kesiapan; satu kalimat gagal akan memicu inisialisasi model yang belum lengkap');
  }
});

/* m025-235: gerbang ini DIBALIK, bukan dihapus.
 *
 * Sampai m025-232 ia menuntut kebalikannya - `if(!puterSignedIn())return false;` wajib ada,
 * karena saat itu OWNER menetapkan login Puter sebagai pemicu unduhan. Keputusan itu masuk
 * akal selama TTS peramban masih menampung murid yang belum login. Lapisan itu dihapus, dan
 * OWNER mencabut gerbangnya: mesin neural kini lapisan terakhir yang bersuara, jadi murid
 * yang tidak pernah login Puter justru yang paling butuh unduhan ini.
 *
 * Yang dijaga sekarang adalah arah sebaliknya, dan itu yang berharga: gerbang login tidak
 * boleh MERAYAP KEMBALI. Menghapus uji ini akan membuat penambahan `if(!puterSignedIn())`
 * lolos tanpa seorang pun melihatnya. */
test('unduhan menyala untuk SEMUA murid, tanpa menunggu login', () => {
  if (!/function armOfflineVoiceAutoload\(\)/.test(APP)) throw new Error('tidak ada penyala unduhan di app.js');
  const fn = /function armOfflineVoiceAutoload\(\)\{[\s\S]*?\n\}/.exec(APP);
  if (!fn) throw new Error('badan armOfflineVoiceAutoload tidak terbaca');
  if (/puterSignedIn\(\)/.test(fn[0])) {
    throw new Error('gerbang login kembali: sejak m025-235 unduhan menyala untuk semua murid, bukan hanya yang login Puter');
  }
  if (!APP.includes('noteSignedIn')) throw new Error('penyala tidak pernah memberi tahu pengunduhnya');
});

/* Serah terima Background Fetch: satu-satunya cara unduhan lanjut setelah aplikasi ditutup.
 * Hanya ada di Chromium - di iOS Safari cabang ini selalu gagal dan jalur potongan yang
 * bekerja. Yang dijaga di sini: jalur potongan TIDAK ikut berjalan saat Background Fetch
 * mengambil alih, karena dua pengunduh atas berkas yang sama membayar kuota murid dua kali. */
test('Background Fetch mengambil alih, dan jalur potongan berhenti saat itu', () => {
  const SRC = require('fs').readFileSync(require('path').join(__dirname, 'features/neural-voice/fiezel-voice-offline-autoload.js'), 'utf8');
  if (!/handOffToBackgroundFetch/.test(SRC)) throw new Error('tidak ada serah terima Background Fetch');
  if (!/if \(await handOffToBackgroundFetch\(rt, cache, items\)\) return;/.test(SRC)) {
    throw new Error('jalur potongan tidak berhenti saat Background Fetch mengambil alih: kuota murid terbayar dua kali');
  }
  if (!/'fiezel-neural-voice::' \+ String\(rt\.cacheName/.test(SRC)) {
    throw new Error('id registrasi tidak membawa nama cache; service worker tidak akan tahu ke mana hasilnya disimpan');
  }
  if (!/backgroundFetch\.get/.test(SRC)) {
    throw new Error('pendaftaran yang masih hidup tidak diperiksa; mendaftar ulang membatalkan kemajuan sesi sebelumnya');
  }
});

test('"Ganti akun" keluar dulu, baru masuk', () => {
  const fn = /async function runPuterSwitchAccount\(\)\{[\s\S]*?\n\}/.exec(APP);
  if (!fn) throw new Error('runPuterSwitchAccount tidak ditemukan');
  const out = fn[0].indexOf('signOutPuterAccount()');
  const inn = fn[0].indexOf('auth.signIn()');
  if (out < 0) throw new Error('tidak keluar lebih dulu; Puter akan memakai sesi lama dan akunnya tidak pernah berganti');
  if (inn < 0 || out > inn) throw new Error('urutannya terbalik: signIn dipanggil sebelum signOut');
});

test('kartu akun menawarkan keluar DAN ganti akun', () => {
  if (!APP.includes('accountSignOut')) throw new Error('tidak ada tombol keluar');
  if (!APP.includes('accountSwitch')) throw new Error('tidak ada tombol ganti akun');
  if (!APP.includes('bindAccountSettingControls()')) throw new Error('tombolnya tidak pernah disambungkan');
});

test('pengaturan tidak lagi menjual unduhan kepada murid', () => {
  // Keberatan m025-100. Cadangan menyiapkan dirinya sendiri; tombol yang menawarkan
  // pekerjaan yang sudah berjalan hanya membuat murid mengira ada yang harus ia lakukan.
  if (/id="prepareNeuralVoice"/.test(APP)) throw new Error('tombol "Simpan untuk offline" hidup lagi');
  // Komentar boleh menyebut tombol lama untuk menjelaskan kenapa ia hilang; yang dilarang
  // adalah naskahnya masih dirender.
  const live = APP.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  if (/Simpan untuk offline/.test(live)) throw new Error('naskah penjual unduhan masih dirender di kartu pengaturan');
});

test('mesin cadangan bukan kokoro, dan alasannya tertulis', () => {
  // Ini pagar keselamatan, bukan selera. Catatan m025-26 di bootstrap mencatat kokoro
  // MEMBUNUH content process iOS, dan murid FIEZEL memakai iPhone.
  if (!/supertonic-3/.test(CONFIG)) throw new Error('mesin cadangan bukan supertonic-3');
  if (/kokoro/i.test(CONFIG) && !/content process iOS/.test(CONFIG)) {
    throw new Error('kokoro disebut tanpa alasan kenapa ia TIDAK dipakai');
  }
  if (fs.existsSync(path.join(__dirname, 'vendor/kokoro-model'))) {
    throw new Error('vendor/kokoro-model kembali; jalur yang pernah membunuh proses iOS tidak boleh hidup lagi');
  }
});

test('kemajuan unduhan bisa diperiksa, dan dihitung dari isi cache', () => {
  // OWNER bertanya "sudah berapa persen". Jawaban yang dihitung dari penghitung di
  // localStorage akan terus bertambah walaupun cache-nya sudah dibersihkan browser -
  // laporan yang meyakinkan tentang sesuatu yang tidak ada. Persentasenya harus dibaca
  // dari cache yang sebenarnya.
  if (!/async function progress\(\)/.test(AUTOLOAD)) throw new Error('tidak ada cara membaca kemajuan');
  if (!AUTOLOAD.includes('caches.open')) throw new Error('kemajuan tidak dibaca dari cache');
  const fn = /async function progress\(\)\{?[\s\S]*?\n  \}/.exec(AUTOLOAD);
  if (fn && /readState\(\)\.bytesDone/.test(fn[0])) {
    throw new Error('kemajuan dihitung dari penghitung localStorage, bukan dari isi cache');
  }
  if (!/chunkSize\(item, i\)/.test(AUTOLOAD)) {
    throw new Error('potongan terakhir dihitung sebagai potongan penuh; persentasenya akan lebih besar dari yang benar');
  }
});

test('kemajuan muncul di Diagnostics, bukan di layar murid', () => {
  const diag = read('features/neural-voice/fiezel-diag-panel.js');
  if (!diag.includes('offlineVoiceBackup')) throw new Error('kemajuan tidak dilaporkan di panel diagnostik');
  if (!diag.includes('addOfflineVoiceBackup(dump)')) throw new Error('laporannya tidak pernah dipanggil saat panel disegarkan');
  // Pagar yang sama seperti sebelumnya, dari sisi lain: menambah cara MEMERIKSA tidak
  // boleh berubah menjadi cara MEMBERITAHU.
  const live = APP.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  if (/OfflineAutoload[\s\S]{0,80}showToast/.test(live)) throw new Error('kemajuan unduhan bocor ke toast di layar murid');
});

console.log('');
if (failures.length) {
  console.log('FIEZEL suara cadangan + akun: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL suara cadangan + akun: PASS ' + pass);

// NV-08/NV-09: jalankan regression baru melalui gate yang sudah terdaftar, tanpa mengubah quality.yml.
require('./voice-turn-ownership-regression.js');
