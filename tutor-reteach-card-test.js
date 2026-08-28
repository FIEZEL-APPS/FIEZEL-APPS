#!/usr/bin/env node
/**
 * FIEZEL m025-126 — gerbang untuk dua keputusan tutor yang sampai m025-124 hanya TERDENGAR.
 *
 * Tutor Brain v3 (m025-118) sudah memutuskan `reteach` dan `breathe` pada setiap jawaban,
 * dan handoff-nya mencatat sendiri apa yang belum dikerjakan:
 *
 *   "decideMove sudah memutuskan `reteach` dan `breathe`, tetapi UI-nya belum menyajikan
 *    kartu konsep sebelum soal berikutnya, dan belum menawarkan menutup sesi lebih awal.
 *    Keduanya baru terlihat sebagai naskah tutor."
 *
 * Itulah yang ditutup rilis ini, dan gerbang ini menjaga bentuknya - bukan keberadaannya.
 * Menguji "apakah fungsinya ada" akan diluluskan oleh fungsi yang mengembalikan kartu
 * kosong atau tombol yang tidak menghentikan apa pun. Yang diuji di sini keputusannya:
 *
 *   - kartu tanpa bahan TIDAK ditampilkan (kartu kosong menghentikan sesi tanpa memberi
 *     apa pun sebagai gantinya - lebih buruk daripada tidak ada kartu);
 *   - kartu disusun dari soal yang BARU SAJA keliru, bukan dari soal berikutnya;
 *   - tidak satu pun naskahnya keluar dalam bahasa Inggris (regresi 1 di m025-118);
 *   - kartu muncul SEBELUM soal berikutnya dan menahan alurnya, bukan menumpang di bawah
 *     soal yang gagal;
 *   - tawaran berhenti benar-benar menutup sesi, menghitung soal yang barusan dijawab,
 *     dan hanya ditawarkan SEKALI per sesi.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = __dirname;
// Akhiran baris dinormalkan lebih dulu, dengan sengaja: pohon kerja Windows di-checkout
// sebagai CRLF sementara blob yang dilihat CI LF, dan gerbang yang menuliskan \n di dalam
// pola akan merah di satu tempat dan hijau di tempat lain untuk berkas yang sama persis.
const APP = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\r\n/g, '\n');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + '\n    ' + (e && e.message)); }
}

/* ------------------------------------------------------------------ *
 * A. PERILAKU tutorConceptCard(), dijalankan sungguhan
 * ------------------------------------------------------------------ */

// Fungsi-fungsi yang dipakai kartu diambil apa adanya dari app.js dan dijalankan di VM.
// Menyalin ulang logikanya ke dalam tes akan menguji salinan, bukan yang dikirim.
function loadCardFns() {
  const wanted = ['TUTOR_ID_MARKERS', 'TUTOR_EN_MARKERS', 'tutorIndonesian', 'tutorWhyFails', 'tutorConceptCard'];
  const parts = [];
  for (const name of wanted) {
    const re = name.startsWith('TUTOR_')
      ? new RegExp('const ' + name + '=[^\\n]+', 'm')
      : new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}', 'm');
    const hit = APP.match(re);
    assert.ok(hit, name + ' tidak ditemukan di app.js');
    parts.push(hit[0]);
  }
  const ctx = { console, friendlySkillName: s => String(s || 'materi ini') };
  vm.createContext(ctx);
  vm.runInContext(parts.join('\n') + '\nthis.tutorConceptCard=tutorConceptCard;this.tutorIndonesian=tutorIndonesian;', ctx);
  return ctx;
}
const fns = loadCardFns();

const soal = {
  lessonSkill: 'present_simple',
  question: "Look! The chef ___ a new dish.",
  options: ['is preparing', 'prepares', 'prepared', 'will prepare'],
  answerIndex: 0,
  explain: {
    rule: 'Pakai bentuk sedang berlangsung kalau kejadiannya sedang terjadi saat ini.',
    memory: 'Kata "Look!" menandai kejadian yang sedang berlangsung.',
    distractors: [{ option: 'prepares', reason: '"prepares" memberi kesan kebiasaan, padahal kalimatnya menunjuk kejadian saat ini.' }]
  }
};

test('kartu memakai aturan dan pegangan dari soal yang BARU SAJA keliru', () => {
  const kartu = fns.tutorConceptCard(soal, 1);
  assert.ok(kartu, 'kartu tidak dibuat padahal bahannya lengkap');
  assert.strictEqual(kartu.rule, soal.explain.rule);
  assert.strictEqual(kartu.cue, soal.explain.memory);
  assert.ok(/kebiasaan/.test(kartu.why), 'sebab kegagalan tidak ikut: ' + kartu.why);
  assert.strictEqual(kartu.answer, 'is preparing', 'kartu harus tahu jawaban benar soal itu');
});

test('sebab kegagalan mengikuti pilihan yang DIAMBIL, bukan pilihan mana pun', () => {
  const kartu = fns.tutorConceptCard(soal, 2); // "prepared" - tidak punya alasan terdaftar
  assert.strictEqual(kartu.why, '', 'alasan distraktor lain ikut terbawa: ' + kartu.why);
});

test('tanpa aturan dan tanpa pegangan, kartu TIDAK dibuat', () => {
  const kosong = { lessonSkill: 'x', options: ['a', 'b'], answerIndex: 0, explain: { distractors: [] } };
  assert.strictEqual(fns.tutorConceptCard(kosong, 1), null, 'kartu kosong tetap dibuat');
});

test('naskah berbahasa Inggris tidak pernah sampai ke kartu', () => {
  const inggris = {
    lessonSkill: 'present_simple',
    options: ['a', 'b'], answerIndex: 0,
    explain: {
      rule: 'The present continuous is used when the action is happening now and the sentence signals it.',
      memory: 'This verb requires the -ing form because the sentence implies an ongoing action.',
      distractors: [{ option: 'b', reason: '"b" does not match the tense that this sentence requires when the verb is used.' }]
    }
  };
  const kartu = fns.tutorConceptCard(inggris, 1);
  assert.strictEqual(kartu, null, 'kartu tetap dibuat dari naskah Inggris: ' + JSON.stringify(kartu));
});

/* ------------------------------------------------------------------ *
 * B. PENYAMBUNGAN di quizLoop - bentuk alurnya, bukan keberadaannya
 * ------------------------------------------------------------------ */

test('reteach menyiapkan kartu dari soal yang gagal, bukan dari soal berikutnya', () => {
  assert.ok(/if\(decision\.move==='reteach'\)\{forceConcept=quizConcept\(q\);pendingCard=tutorConceptCard\(q,j\)\}/.test(APP),
    'reteach tidak menyiapkan pendingCard dari (q,j) - soal dan pilihan yang barusan keliru');
});

test('kartu menahan alur SEBELUM soal berikutnya digambar', () => {
  const draw = APP.match(/const draw=\(\)=>\{[\s\S]*?\n {2}q=\(cfg\.placement\|\|cfg\.preserveOrder\)\?remaining\[0\]:\(tutorPick/);
  assert.ok(draw, 'awal draw() tidak terbaca');
  assert.ok(/if\(pendingCard\)\{const c=pendingCard;teach\(c\);return\}/.test(draw[0]),
    'draw() tidak menyerahkan giliran ke kartu sebelum memilih soal');
});

test('tombol lanjut di kartu membuang kartunya, jadi ia tidak bisa muncul dua kali', () => {
  // m025-180: assert DIPERKETAT, bukan dilonggarkan - tombol lanjut kini juga wajib me-reset
  // timer soal (start=Date.now()) sebelum menggambar, supaya waktu membaca kartu reteach tidak
  // mencemari response-time soal berikutnya (bukti: audit A14 teach-card timing). Kartu tetap
  // wajib dikosongkan lebih dulu, jadi properti lama tercakup penuh oleh properti baru.
  assert.ok(/\$\('teachNext'\)\.onclick=\(\)=>\{pendingCard=null;start=Date\.now\(\);draw\(\)\}/.test(APP),
    'tombol lanjut tidak mengosongkan pendingCard DAN me-reset timer sebelum menggambar');
});

test('kartu punya jalan keluar yang sama dengan layar kuis', () => {
  const teach = APP.match(/const teach=info=>\{[\s\S]*?enhanceUI\(\);\n {1,2}\};/);
  assert.ok(teach, 'fungsi teach tidak terbaca');
  assert.ok(/quizExit/.test(teach[0]), 'kartu tidak punya tombol Keluar - murid terkurung di layar mengajar');
});

test('tawaran berhenti benar-benar menutup sesi dan menghitung soal yang barusan', () => {
  assert.ok(/\$\('breatheStop'\)\.onclick=\(\)=>\{audio\.stop\(\);finishQuiz\(cfg,score,asked\+1,tutorSummary\(tutor\)\)\}/.test(APP),
    'tombol berhenti tidak memanggil finishQuiz dengan asked+1');
});

test('tawaran berhenti hanya sekali per sesi', () => {
  // m025-177 (audit skip): breathe juga dikecualikan dari level-exam dan grammar-skip —
  // alat ukur tidak boleh ter-settle dari sampel parsial. Penjaga sekali-tawar tetap sama.
  assert.ok(/if\(answer\.breathe&&!breatheOffered&&!cfg\.placement&&cfg\.type!=='level-exam'&&cfg\.type!=='grammar-skip'\)\{\s*breatheOffered=true;answer\.breathe=false;/.test(APP),
    'penjaga sekali-tawar tidak dipasang sebelum tawaran digambar');
  assert.ok(/let pendingCard=null,breatheOffered=false;/.test(APP),
    'breatheOffered tidak direset per sesi kuis');
});

test('murid boleh menolak berhenti, dan penolakannya tidak menghukum apa pun', () => {
  assert.ok(/\$\('breatheGo'\)\.onclick=\(\)=>\{box\.remove\(\)\}/.test(APP),
    'pilihan "lanjut" tidak sekadar menutup tawaran');
});

test('kedua naskah baru berbahasa Indonesia', () => {
  const strings = [
    ...(APP.match(/Oke, aku siap coba lagi/g) || []),
    ...(APP.match(/Sudahi sesi ini/g) || []),
    ...(APP.match(/Lanjut, aku masih kuat/g) || []),
    ...(APP.match(/Yang bikin tadi keliru/g) || []),
    ...(APP.match(/Jeda mengajar/g) || [])
  ];
  assert.strictEqual(strings.length, 5, 'ada naskah baru yang hilang atau berubah: ' + strings.join(' | '));
});

test('gaya kartu memakai bidang yang punya pasangan gelap', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.ok(/\.tutor-card\{/.test(css), 'gaya .tutor-card tidak ada');
  const why = css.match(/\.tutor-card-why\{[^}]*\}/);
  assert.ok(why, 'gaya .tutor-card-why tidak ada');
  // m028 fase2 F2-09: yang dijaga di sini adalah "bidangnya token bertema, bukan literal",
  // bukan nama satu tokennya. Rebrand "Warm Paper" memindahkan bidang kartu penjelas dari
  // --surface-tint ke --panel-soft (dan aksen kirinya dari --accent marun ke --info) karena
  // petunjuk bukan kesalahan. Kuncinya digeser ke keluarga token baru, tidak dibuang -
  // preseden yang sama dipakai contrast-test saat nilai token m025-115 bergeser.
  assert.ok(/var\(--(?:panel-soft|surface-tint)\)/.test(why[0]),
    'bidang kartu tidak memakai token bertema - inilah pola yang memerahkan gerbang bidang pastel');
  assert.ok(/border-left:3px solid var\(--info\)/.test(why[0]),
    'aksen kiri kartu penjelas harus keluarga info (bantuan), bukan aksen merah (kesalahan)');
});

process.on('exit', () => {
  if (failures.length) {
    console.error('FIEZEL m025-126 kartu konsep + tawaran berhenti: FAIL (' + failures.length + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL m025-126 kartu konsep + tawaran berhenti: PASS ' + pass + '/0');
  }
});
