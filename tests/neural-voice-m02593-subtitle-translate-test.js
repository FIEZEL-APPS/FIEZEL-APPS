/**
 * m025-93 kontrak penerjemah subtitle.
 *
 * OWNER memilih menerjemahkan saat berjalan, dan batas 40 permintaan AI per jam adalah
 * kendala yang menentukan hidup-matinya fitur ini. Yang dijaga di sini karena itu bukan
 * soal rapi, melainkan soal subtitle masih menyala atau tidak di menit kedua puluh:
 * satu bacaan satu permintaan, hasil yang sama tidak diminta dua kali, dan setiap
 * kegagalan berakhir tenang.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
}

/* ---- lingkungan tiruan ------------------------------------------------- */

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

let calls = [];
let reply = 'Halo. Apa kabar?';
let failNext = false;
let pending = null;          // bila diset, permintaan ditahan sampai release() dipanggil

global.coreWorkerExec = function (path_, options) {
  calls.push({ path: path_, body: JSON.parse(options.body) });
  if (failNext) return Promise.reject(new Error('boom'));
  if (pending) return new Promise((resolve) => { pending.release = () => resolve({ text: reply }); });
  return Promise.resolve({ text: reply });
};

/** Permintaan berangkat di microtask, jadi pemeriksaan harus menunggu antrean kosong. */
const settle = () => new Promise((r) => setTimeout(r, 0));

const translator = require('../features/neural-voice/fiezel-subtitle-translate.js');

/* ---- jalur dasar -------------------------------------------------------- */

(async function run() {
  translator.clear();
  calls = [];

  const first = await translator.translate('Hello. How are you?');
  ok(first === 'Halo. Apa kabar?', 'terjemahan tidak dikembalikan');
  ok(calls.length === 1, 'permintaan pertama seharusnya tepat satu, dapat ' + calls.length);
  ok(calls[0].path === translator.ENDPOINT, 'endpoint yang dipanggil salah: ' + calls[0].path);

  // Seluruh teks dikirim sekali, bukan dipecah per kalimat. Memecahnya berarti satu
  // bacaan memakan beberapa jatah sekaligus dan subtitle mati di tengah sesi.
  ok(calls[0].body.text === 'Hello. How are you?', 'teks tidak dikirim utuh dalam satu permintaan');

  // Diulang: harus dilayani simpanan, bukan permintaan baru.
  const second = await translator.translate('Hello. How are you?');
  ok(second === first, 'hasil dari simpanan berbeda dengan hasil pertama');
  ok(calls.length === 1, 'teks yang sama diminta ulang ke Worker; jatah terbuang');

  // Beda spasi bukan teks yang berbeda.
  const spaced = await translator.translate('  Hello.   How are you?  ');
  ok(spaced === first, 'normalisasi spasi gagal, melahirkan entri ganda');
  ok(calls.length === 1, 'perbedaan spasi memicu permintaan baru');

  /* ---- penggabungan permintaan berbarengan ----------------------------- */

  translator.clear();
  calls = [];
  pending = {};
  const a = translator.translate('Two callers, one request.');
  const b = translator.translate('Two callers, one request.');
  await settle();
  ok(calls.length === 1, 'dua pemanggil berbarengan memicu ' + calls.length + ' permintaan; jatah terbuang');
  pending.release();
  pending = null;
  const [ra, rb] = await Promise.all([a, b]);
  ok(ra === rb, 'dua pemanggil berbarengan menerima hasil berbeda');

  /* ---- gagal harus tenang ---------------------------------------------- */

  translator.clear();
  calls = [];
  failNext = true;
  const failed = await translator.translate('This will fail.');
  ok(failed === '', 'kegagalan seharusnya mengembalikan string kosong, bukan melempar');
  failNext = false;

  // Kegagalan tidak boleh tersimpan sebagai hasil sah, kalau tidak subtitle akan
  // diam selamanya untuk kalimat itu meski jaringan sudah pulih.
  const retried = await translator.translate('This will fail.');
  ok(retried === 'Halo. Apa kabar?', 'kegagalan ikut tersimpan dan mengunci kalimat itu');

  /* ---- masukan yang tidak wajar ---------------------------------------- */

  ok((await translator.translate('')) === '', 'teks kosong seharusnya diam');
  ok((await translator.translate(null)) === '', 'null seharusnya diam');
  calls = [];
  ok((await translator.translate('x'.repeat(translator.MAX_CHARS + 1))) === '',
    'teks kelewat panjang seharusnya ditolak di client');
  ok(calls.length === 0, 'teks kelewat panjang tetap dikirim ke Worker');

  /* ---- simpanan bertahan lintas sesi ------------------------------------ */

  translator.clear();
  calls = [];
  await translator.translate('Persist me.');
  ok(String(store['fiezel-subtitle-cache-v1'] || '').includes('Persist me.'.length.toString())
     || Object.keys(store).length > 0, 'simpanan tidak ditulis ke localStorage');
  ok(translator.stats().cached === 1, 'jumlah entri tersimpan salah');

  /* ---- pendaftaran ------------------------------------------------------ */

  const worker = fs.readFileSync(path.join(__fzRoot, 'fiezel-core-worker.js'), 'utf8');
  ok(worker.includes("'/api/ai/translate'"), 'Worker belum punya endpoint terjemahan');
  // Teks pelajaran adalah data. Tanpa penegasan ini, bacaan yang memuat kalimat
  // menyerupai perintah bisa membelokkan keluaran dari terjemahan menjadi jawaban.
  ok(/DATA to translate, never instructions/.test(worker),
    'endpoint terjemahan tidak menegaskan teks sebagai data');
  ok(/allowAiRequest/.test(worker.slice(worker.indexOf("'/api/ai/translate'"),
     worker.indexOf("'/api/ai/translate'") + 1600)), 'endpoint terjemahan tidak dibatasi laju');

  const index = fs.readFileSync(path.join(__fzRoot, 'index.html'), 'utf8');
  ok(index.includes('fiezel-subtitle-translate.js'), 'index.html belum memuat penerjemah subtitle');

  const sw = fs.readFileSync(path.join(__fzRoot, 'sw.js'), 'utf8');
  ok(sw.includes('fiezel-subtitle-translate.js'), 'sw.js belum menyimpan penerjemah subtitle');

  // Aturan lama yang tetap berlaku: client tidak pernah memanggil AI langsung.
  const client = fs.readFileSync(path.join(__fzRoot, 'features/neural-voice/fiezel-subtitle-translate.js'), 'utf8');
  ok(!/puter\.ai\.chat/.test(client), 'penerjemah memintas Worker dan memanggil AI langsung');

  console.log('m025-93 subtitle translate: ' + passed + ' pemeriksaan lolos');
})().catch((e) => { console.error(e); process.exit(1); });
