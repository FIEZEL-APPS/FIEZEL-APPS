/**
 * m025-92 kontrak mesin suara Puter dan subtitle Indonesia.
 *
 * Yang dijaga di sini adalah keputusan-keputusan yang mahal kalau tergeser diam-diam:
 * konfigurasi engine yang OWNER pilih setelah mendengar enam kandidat, dan sifat
 * subtitle yang menjadi satu-satunya jalur pemahaman bahasa ibu setelah suara
 * Indonesia dihapus.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const voice = require('./features/neural-voice/fiezel-puter-voice.js');
const subtitle = require('./features/neural-voice/fiezel-subtitle.js');

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
}

/* ---- mesin suara ------------------------------------------------------ */

// Probe membuktikan 'neural' terdengar datar dan hanya 'generative' yang dinilai
// bagus. Menurunkannya kembali berarti mengembalikan cacat yang baru saja dibuang,
// dan itu jenis regresi yang tidak terlihat di layar - hanya terdengar.
ok(voice.ENGINE === 'generative', 'engine bukan generative; konfigurasi pilihan OWNER tergeser');
ok(voice.LANG === 'en-US', 'bahasa mesin bukan en-US');

const status = voice.status();
ok(status.requiresDownload === false, 'mesin masih menuntut unduhan');
ok(status.totalBytes === 0, 'mesin masih melaporkan bobot unduhan');
ok(status.prepared === true && status.ready === true, 'mesin tanpa unduhan seharusnya selalu siap');
ok(status.provider === 'puter-txt2speech', 'penyedia tidak dilaporkan sebagai Puter');

// Batas waktu adalah pelajaran langsung dari probe revisi 1: satu panggilan yang
// menggantung membekukan seluruh antrian karena tidak ada yang menyerah.
ok(voice.CALL_TIMEOUT_MS > 0 && voice.CALL_TIMEOUT_MS <= 60000, 'batas waktu panggilan tidak masuk akal');

// Kunci singgah simpan harus memisahkan konfigurasi yang berbeda. Kalau tidak,
// mengganti engine akan menyajikan audio lama - galat yang sangat sulit dilacak
// karena kodenya benar dan yang salah hanya bunyinya.
const k1 = voice.cacheKey('Hello there.', { engine: 'generative', lang: 'en-US', speed: 1 });
const k2 = voice.cacheKey('Hello there.', { engine: 'neural', lang: 'en-US', speed: 1 });
const k3 = voice.cacheKey('Hello there!', { engine: 'generative', lang: 'en-US', speed: 1 });
ok(k1 !== k2, 'kunci cache tidak membedakan engine');
ok(k1 !== k3, 'kunci cache tidak membedakan teks');
ok(k1 === voice.cacheKey('Hello there.', { engine: 'generative', lang: 'en-US', speed: 1 }),
  'kunci cache tidak stabil untuk masukan yang sama');

// Teks kosong bukan galat: banyak pemanggil meneruskan bidang yang kebetulan kosong.
voice.speak('').then((r) => { ok(r === false, 'teks kosong seharusnya diam, bukan galat'); });

/* ---- subtitle --------------------------------------------------------- */

const lines = subtitle.sentencesOf('Halo Jahran. Apa kabar hari ini? Mantap sekali.', 'id');
ok(lines.length === 3, 'pemecahan kalimat Indonesia salah, dapat ' + lines.length);

const cues = subtitle.cuesFor(lines, 9);
ok(cues.length === 3, 'jumlah isyarat tidak sama dengan jumlah baris');
ok(cues[0].from === 0, 'isyarat pertama tidak mulai dari nol');
ok(cues[cues.length - 1].to === 9, 'isyarat terakhir tidak berakhir tepat di durasi');

// Batas dihitung dari durasi total, bukan ditumpuk - jadi tidak boleh ada celah
// maupun tumpang tindih di antara dua isyarat.
for (let i = 1; i < cues.length; i++) {
  ok(Math.abs(cues[i].from - cues[i - 1].to) < 1e-9, 'ada celah/tumpang tindih di batas isyarat ' + i);
}

// Baris lebih panjang mendapat waktu lebih panjang: itulah seluruh isi perkiraan ini.
const durations = cues.map((c) => c.to - c.from);
const longest = lines.indexOf(lines.slice().sort((a, b) => b.length - a.length)[0]);
ok(durations[longest] === Math.max(...durations), 'baris terpanjang tidak mendapat durasi terpanjang');

ok(subtitle.cueIndexAt(cues, 0) === 0, 'isyarat pada detik nol salah');
ok(subtitle.cueIndexAt(cues, 8.9) === cues.length - 1, 'isyarat menjelang akhir salah');
// Sesudah audio habis, baris terakhir dipertahankan: berkedip hilang tepat di akhir
// kalimat terbaca sebagai kerusakan, bukan sebagai selesai.
ok(subtitle.cueIndexAt(cues, 99) === cues.length - 1, 'subtitle mengosongkan diri setelah audio habis');

ok(subtitle.cuesFor([], 5).length === 0, 'baris kosong seharusnya tidak menghasilkan isyarat');
const unknown = subtitle.cuesFor(['Satu.', 'Dua.'], 0);
ok(unknown.length === 1 && unknown[0].to === Infinity,
  'durasi yang belum diketahui seharusnya tetap menampilkan sesuatu');

// Baris kosong tidak boleh menghasilkan isyarat: isyarat tanpa teks tidak pernah
// tampil dan hanya menggeser urutan indeks terhadap teks aslinya.
ok(subtitle.cuesFor(['Ada isi.', '   ', 'Ada lagi.'], 6).length === 2,
  'baris kosong ikut menjadi isyarat');

/* ---- pendaftaran berkas ------------------------------------------------ */

// Modul yang tidak dimuat aplikasi sama saja dengan tidak ada. Ini menangkap
// kelalaian yang tidak terlihat di test unit mana pun.
const index = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
ok(index.includes('fiezel-puter-voice.js'), 'index.html belum memuat mesin suara Puter');
ok(index.includes('fiezel-subtitle.js'), 'index.html belum memuat modul subtitle');

const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
ok(sw.includes('fiezel-puter-voice.js'), 'sw.js belum menyimpan mesin suara Puter di shell');
ok(sw.includes('fiezel-subtitle.js'), 'sw.js belum menyimpan modul subtitle di shell');

console.log('m025-92 puter voice + subtitle: ' + passed + ' pemeriksaan lolos');

/* ---- m025-95 pintu bicara bersama ------------------------------------- */

// Modul ini memuat FiezelSubtitle dan FiezelPuterVoice dari global, jadi keduanya
// dipasang dulu sebagai tiruan sebelum modulnya dibaca.
(function () {
  const say = require('./features/neural-voice/fiezel-voice-say.js');
  ok(typeof say.say === 'function', 'pintu bicara bersama tidak mengekspos say()');
  ok(typeof say.stop === 'function', 'pintu bicara bersama tidak mengekspos stop()');

  // Tanpa kalimat Inggris tidak ada yang bisa diucapkan - baris Indonesia saja tidak
  // cukup, dan memaksakannya akan membuat subtitle muncul tanpa suara apa pun.
  say.say({ id: 'Halo Jahran.' }).then((r) => {
    ok(r === false, 'baris Indonesia tanpa kalimat Inggris seharusnya tidak berbunyi');
  });
  say.say('').then((r) => { ok(r === false, 'teks kosong seharusnya diam'); });

  const src = fs.readFileSync(path.join(__dirname, 'features/neural-voice/fiezel-voice-say.js'), 'utf8');

  // Dialog tutor sudah berpasangan {en, id}. Kalau pintu ini tetap menerjemahkan
  // padahal barisnya sudah ada, tiap jawaban tutor memakan satu jatah AI tanpa guna.
  ok(/if \(ready\)/.test(src) && src.indexOf('if (ready)') < src.indexOf('translate('),
    'terjemahan harus dilewati ketika baris Indonesia sudah tersedia');

  // Menunggu terjemahan sebelum berbunyi akan menambah jeda di depan setiap kalimat
  // dan membuat gangguan jaringan terdengar seperti aplikasi menggantung.
  ok(!/await prepareSubtitle|return prepareSubtitle\([^)]*\)\.then\(function \(\) \{\s*return voice/.test(src),
    'suara tidak boleh menunggu terjemahan selesai');

  // Satu tempat untuk keputusan bicara: itu seluruh alasan modul ini ada.
  const chat = fs.readFileSync(path.join(__dirname, 'features/tutor-classroom/fiezel-tutor-voice-chat.js'), 'utf8');
  const lib = fs.readFileSync(path.join(__dirname, 'features/library/fiezel-library-ui.js'), 'utf8');
  ok(/FiezelVoiceSay/.test(chat), 'tutor tidak lewat pintu bersama');
  ok(/FiezelVoiceSay/.test(lib), 'Library tidak lewat pintu bersama');
  ok(!/FiezelIndonesianVoice/.test(chat + lib), 'masih ada pemanggil mesin Indonesia');
})();

console.log('m025-95 voice-say: pemeriksaan pintu bicara bersama lolos');
