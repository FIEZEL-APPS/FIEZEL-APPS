/**
 * m025-102 kontrak pencarian materi dan jalur feedback.
 *
 * Dua hal yang dijaga di sini bukan soal rapi.
 *
 * Pertama, pemetaan konsep. OWNER mencontohkan pelajar mengetik "did" dan berharap
 * mendarat di past simple. Kata itu muncul 45 kali di dalam teks soal, jadi pencocokan
 * teks biasa akan mengembalikan soal yang kebetulan memuatnya - hasil penuh tetapi
 * salah, yang membuat pelajar menyimpulkan aplikasinya tidak punya materinya.
 *
 * Kedua, teks feedback anonim. OWNER memilih kiriman terbuka tanpa login, dan teks itu
 * berakhir di dasbor OWNER sendiri. Masukan tidak tepercaya yang tampil di layar orang
 * lain hanya aman bila ditulis sebagai teks, bukan sebagai markup - dan itu harus
 * dijaga tes, karena satu innerHTML yang lolos tidak akan terlihat sampai ada yang
 * memanfaatkannya.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const S = require('./features/search/fiezel-search.js');

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
}

/* ---- indeks dari bank materi yang sebenarnya --------------------------- */

const index = S.buildIndex({
  grammar: JSON.parse(fs.readFileSync(path.join(__dirname, 'grammar-templates.json'), 'utf8')),
  vocabulary: JSON.parse(fs.readFileSync(path.join(__dirname, 'vocabulary-master.json'), 'utf8')),
  reading: JSON.parse(fs.readFileSync(path.join(__dirname, 'reading-bank.json'), 'utf8'))
});

ok(index.length > 500, 'indeks terlalu kecil, dapat ' + index.length + ' entri');

/* ---- kasus yang OWNER contohkan ---------------------------------------- */

const did = S.search(index, 'did');
ok(!did.empty, '"did" tidak menemukan apa pun');
ok(did.tags.indexOf('past_simple') !== -1, '"did" tidak dipetakan ke past simple');
// Inti pemetaan konsep: hasil teratas harus materi TENTANG past simple, bukan soal
// yang kebetulan memuat kata "did".
ok(/past simple|past/.test(did.results[0].title),
  'hasil teratas "did" bukan materi past simple: ' + did.results[0].title);

/* ---- pelajar mengetik bahasa Indonesia --------------------------------- */

const kalau = S.search(index, 'kalau');
ok(kalau.tags.indexOf('conditionals') !== -1, '"kalau" tidak dipetakan ke conditionals');
ok(/conditional/.test(kalau.results[0].title), '"kalau" tidak mendarat di conditionals');

const sudah = S.search(index, 'sudah');
ok(sudah.tags.indexOf('present_perfect') !== -1, '"sudah" tidak dipetakan ke present perfect');

const bantu = S.search(index, 'kata kerja bantu');
ok(!bantu.empty, 'frasa Indonesia "kata kerja bantu" tidak menemukan apa pun');

/* ---- pencocokan harus kata utuh ---------------------------------------- */

// "did" adalah substring dari "candidate" dan "middle". Pemetaan konsep yang tergelincir
// ke sana mengirim pelajar ke pelajaran yang keliru - lebih merugikan daripada nihil.
ok(S.conceptTags('candidate').indexOf('past_simple') === -1,
  '"candidate" tidak boleh memicu konsep past simple');
ok(S.conceptTags('middle').length === 0, '"middle" tidak boleh memicu konsep apa pun');

/* ---- nihil harus benar-benar nihil ------------------------------------- */

const nothing = S.search(index, 'zzzqqq');
ok(nothing.empty, 'kueri omong kosong seharusnya nihil, dapat ' + nothing.results.length);
ok(S.search(index, '').empty, 'kueri kosong seharusnya nihil');
ok(S.search(null, 'did').empty, 'indeks yang hilang seharusnya nihil, bukan melempar');

/* ---- peringkat stabil --------------------------------------------------- */

// Hasil yang berubah urutan untuk kueri yang sama terbaca sebagai kerusakan.
const a = S.search(index, 'passive').results.map((r) => r.id).join('|');
const b = S.search(index, 'passive').results.map((r) => r.id).join('|');
ok(a === b, 'peringkat tidak stabil untuk kueri yang sama');

// Konsep selalu di atas teks, berapa pun kata yang cocok di lapis terakhir.
ok(S.WEIGHT.concept > S.WEIGHT.label && S.WEIGHT.label > S.WEIGHT.text,
  'bobot lapis pencocokan tidak berjenjang');

/* ---- jalur feedback di Worker ------------------------------------------ */

const worker = fs.readFileSync(path.join(__dirname, 'fiezel-core-worker.js'), 'utf8');

ok(worker.includes("'/api/feedback'"), 'Worker belum punya rute pengiriman feedback');
ok(worker.includes("'/api/feedback/list'"), 'Worker belum punya rute pembacaan feedback');

// Membaca kiriman orang lain adalah hak OWNER saja. Rute daftar TANPA penjaga ini
// membuat setiap pengguna bisa membaca keluhan pengguna lain.
const listAt = worker.indexOf("'/api/feedback/list'");
ok(/isOwner\(user\)/.test(worker.slice(listAt, listAt + 400)),
  'rute pembacaan feedback tidak dijaga isOwner');
const clearAt = worker.indexOf("'/api/feedback/clear'");
ok(/isOwner\(user\)/.test(worker.slice(clearAt, clearAt + 300)),
  'rute penghapusan feedback tidak dijaga isOwner');

// Terbuka tanpa login adalah pilihan OWNER, jadi rem globalnya wajib ada.
const postAt = worker.indexOf("router.post('/api/feedback'");
ok(/allowFeedback\(\)/.test(worker.slice(postAt, postAt + 400)),
  'rute pengiriman feedback tidak dibatasi laju');

// Penyimpanan berupa cincin: tanpa batas, satu pengirim bertekad bisa menumbuhkannya
// sampai KV tidak bisa dibaca lagi.
ok(/slice\(-FEEDBACK_MAX\)/.test(worker), 'penyimpanan feedback tidak dibatasi');
ok(/FEEDBACK_MAX_TEXT/.test(worker), 'panjang teks feedback tidak dibatasi');

/* ---- teks anonim tidak boleh menjadi markup ---------------------------- */

ok(/replace\(\/\[<>\]\/g/.test(worker),
  'teks feedback tidak dibersihkan dari penanda sudut di Worker');

const dashboard = fs.readFileSync(path.join(__dirname, 'creator-report-dashboard.html'), 'utf8');
ok(dashboard.includes('feedbackList'), 'dasbor belum menampilkan masukan pengguna');

// Lapis yang sesungguhnya. Pembersih di Worker hanyalah jaring kedua; yang menentukan
// adalah dasbor menuliskan kiriman anonim sebagai TEKS.
//
// Pemeriksaannya sengaja mutlak - nol penugasan innerHTML di seluruh berkas - bukan
// "innerHTML di dekat kata feedback". Versi longgar itu tertipu oleh komentar yang
// justru menjelaskan larangannya, dan pemeriksaan yang lolos karena salah membaca
// lebih berbahaya daripada tidak ada pemeriksaan.
const assignments = (dashboard.match(/\.innerHTML\s*=/g) || []);
ok(assignments.length === 0,
  'dasbor menulis lewat innerHTML (' + assignments.length + 'x); kiriman anonim harus lewat textContent');
ok(/textContent/.test(dashboard), 'dasbor tidak menulis lewat textContent sama sekali');

console.log('m025-102 pencarian + feedback: ' + passed + ' pemeriksaan lolos');

/* ---- m025-103 notifikasi masukan ke OWNER ------------------------------ */

// Jalur push yang sudah ada dipakai ulang: dispatcher, jadwal per jam, dan kunci VAPID
// sudah teruji, dan kunci privat itu memang sengaja tidak pernah menyentuh Worker.
ok(worker.includes('FEEDBACK_NOTIFY_KIND'), 'Worker belum mengenal notifikasi masukan');
ok(worker.includes('ownerFeedbackNotification'), 'antrian push belum menyertakan masukan');

const dueAt = worker.indexOf("router.post('/api/reminders/due'");
ok(/ownerFeedbackNotification\(rows,\s*now\)/.test(worker.slice(dueAt, dueAt + 900)),
  'rute due tidak memanggil pembangun notifikasi masukan');

// Notifikasi hanya untuk OWNER, dan hanya kalau dia memang berlangganan push.
const notifyAt = worker.indexOf('async function ownerFeedbackNotification');
const notifyBody = worker.slice(notifyAt, notifyAt + 1600);
ok(/ownerInfo\(\)/.test(notifyBody), 'notifikasi masukan tidak memastikan penerimanya OWNER');
ok(/rec\.subscription/.test(notifyBody), 'notifikasi dikirim tanpa memeriksa langganan push');

// Satu pesan berisi jumlah, bukan satu pesan per masukan. Sepuluh kiriman dalam satu jam
// yang berbunyi sepuluh kali akan membuat notifikasinya dimatikan - lalu kabar
// berikutnya tidak sampai sama sekali.
ok(/fresh\.length/.test(notifyBody), 'notifikasi masukan tidak diringkas jadi satu pesan');

// INI YANG PALING PENTING. Catatan pengingat belajar memegang lastPushAt, dan ALRS
// menolak mengirim pengingat berikutnya dalam 18 jam sesudahnya. Kalau ack masukan
// menumpang di catatan itu, satu kabar masukan membungkam pengingat belajar seharian.
const ackAt = worker.indexOf("router.post('/api/reminders/ack'");
const ackBody = worker.slice(ackAt, ackAt + 1400);
const guardAt = ackBody.indexOf('kind===FEEDBACK_NOTIFY_KIND');
ok(guardAt !== -1, 'ack tidak memisahkan notifikasi masukan dari pengingat belajar');
ok(guardAt < ackBody.indexOf('rec.lastPushAt'),
  'ack masukan menyentuh lastPushAt; pengingat belajar akan terbungkam 18 jam');

// Notifikasi menunjuk ke dasbor, dan jendela yang sudah terbuka harus DIARAHKAN ke sana.
ok(/creator-report-dashboard\.html/.test(notifyBody), 'notifikasi tidak menunjuk ke dasbor');
const swSrc = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
ok(/client\.navigate/.test(swSrc),
  'service worker hanya memfokuskan jendela lama; notifikasi tidak akan sampai ke dasbor');

console.log('m025-103 notifikasi masukan: pemeriksaan lolos');
