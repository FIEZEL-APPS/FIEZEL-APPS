'use strict';
/**
 * Gerbang KEPATUHAN AI & KAPASITAS SEKOLAH (R8, docs/KEPATUHAN-AI-SEKOLAH.md, docs/KAPASITAS-SEKOLAH.md).
 *
 * A1  penjagaan terpusat: selama kunci berdiri, hanya AI penilai (writing_feedback, session_recap) yang lewat
 * A2  tugas LATIHAN dari guru ikut mengunci AI; misi pilihan sendiri tidak
 * A3  kabar terkunci menyebut tugas vs ujian dengan jujur
 * A4  label "dibuat AI" di Tanya FIEZEL, pembimbing PAW, Pustaka — dan TIDAK pada jawaban terdegradasi/lokal
 * A5  deskripsi rapor dan analisis butir tidak memakai AI
 * C1  alat kapasitas membaca ritme dari kode, dan tabel di dokumen sama dengan keluaran alat
 * C2  hitungan: 250 murid sudah melewati paket gratis; plafon AI lebih sempit dari jumlah murid
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const check = (name, fn) => tests.push([name, fn]);
const app = read('app.js');

check('A1 penjagaan AI terpusat di askFiezelAIResult', () => {
  const daftar = (app.match(/const AI_TASKS_SAAT_DINILAI=Object\.freeze\(\[[^\]]*\]\);/) || [])[0];
  const fungsi = (app.match(/function aiTaskBlockedByLock\(task\)\{[^\n]*\}/) || [])[0];
  assert.ok(daftar && fungsi, 'daftar & fungsi penjaga ada');
  const ctx = { terkunci: false };
  vm.createContext(ctx);
  vm.runInContext(daftar.replace('const ', 'var ') + fungsi + ';function examLockActive(){return terkunci}', ctx);
  assert.strictEqual(ctx.aiTaskBlockedByLock('question'), false, 'tanpa kunci semua lewat');
  ctx.terkunci = true;
  for (const t of ['question', 'quiz_explanation', 'vocabulary_explanation', 'coach_question', 'library_question', 'classroom_turn', 'translate_subtitle', undefined]) {
    assert.strictEqual(ctx.aiTaskBlockedByLock(t), true, 'harus terkunci: ' + t);
  }
  assert.strictEqual(ctx.aiTaskBlockedByLock('writing_feedback'), false, 'AI penilai tulisan tetap jalan di ujian menulis');
  assert.ok(/async function askFiezelAIResult\(prompt,task='question',ctx=null\)\{\n  if\(aiTaskBlockedByLock\(task\)\)/.test(app), 'baris pertama askFiezelAIResult adalah penjaga');
});

check('A2 tugas latihan guru mengunci AI, misi tidak', () => {
  const hub = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(/if \(\(a\.mode === 'ujian' \|\| !a\.isMission\) && root\.FiezelExamLock\) root\.FiezelExamLock\.begin\('assignment'/.test(hub));
  assert.strictEqual((hub.match(/FiezelExamLock\.end\('assignment'\)/g) || []).length >= 2, true, 'kunci dilepas saat selesai DAN saat keluar');
});

check('A3 kabar terkunci jujur: tugas vs ujian', () => {
  assert.ok(/examLock\(\)\?\.kind\(\)==='assignment'\?FiezelI18n\.t\('sekolah\.ai-terkunci-tugas'/.test(app));
  const copy = read('features/i18n/copy-id-sekolah.js');
  assert.ok(/'sekolah\.ai-terkunci-tugas': "[^"]*tugas dari guru/.test(copy));
});

check('A4 label AI hanya untuk jawaban yang benar-benar dari AI', () => {
  assert.ok(/const dariAI=hasil\.degraded!==true;/.test(app) && /\(dariAI\?'<p class="ai-label"/.test(app), 'Tanya FIEZEL');
  assert.ok(/\.then\(r=>\(\{text:r\.text,ai:r\.degraded!==true\}\)\)/.test(app) && /aiLocked:\(\)=>examLockActive\(\)/.test(app), 'pembimbing: tanda ai + status kunci');
  const coach = read('features/ui/fiezel-coach-bubble.js');
  assert.ok(/if \(dariAI && !terkunci && answer/.test(coach) && /class="ai-label"/.test(coach), 'pembimbing PAW');
  const lib = read('features/library/fiezel-library-ui.js');
  assert.ok(/dariAI = !!\(r && r\.text && r\.degraded !== true\)/.test(lib) && /if \(dariAI\)/.test(lib), 'Pustaka');
  assert.ok(/'sekolah\.ai-label': "Dibuat oleh AI/.test(read('features/i18n/copy-id-sekolah.js')));
  assert.ok(/\.ai-label \{/.test(read('features/learner-flow/learner-flow.css')));
});

check('A5 rapor dan analisis butir tanpa AI', () => {
  for (const f of ['features/teacher/fiezel-rapor-kktp.js', 'features/teacher/fiezel-analisis-butir.js', 'features/speaking-listening/fiezel-bicara-privat.js']) {
    assert.ok(!/askFiezelAI|\/api\/ai/.test(read(f)), f);
  }
});

check('C1 alat kapasitas membaca kode; dokumen = keluaran alat', async () => {
  const K = await import(path.join(__fzRoot, 'tools/kapasitas-sekolah.mjs'));
  const kode = K.bacaKode();
  assert.ok(kode.notifPollMs > 0 && kode.stagePollMs > 0 && kode.guruSyncMs > 0 && kode.neuronCap > 0);
  const doc = read('docs/KAPASITAS-SEKOLAH.md');
  assert.ok(doc.includes(K.tabel()), 'tabel di docs/KAPASITAS-SEKOLAH.md basi — jalankan node tools/kapasitas-sekolah.mjs dan tempel ulang');
});

check('C2 temuan kapasitas', async () => {
  const K = await import(path.join(__fzRoot, 'tools/kapasitas-sekolah.mjs'));
  const r250 = K.hitung(250), r1000 = K.hitung(1000);
  assert.strictEqual(r250.gratis.cukup, false, '250 murid aktif melewati paket gratis');
  assert.ok(r250.muridAiTerlayani < 250, 'plafon AI lebih sempit dari 250 murid');
  assert.ok(r1000.berbayar.d1Aman, 'D1 bukan masalah pada 1.000 murid');
  assert.ok(r1000.req > r250.req * 3.9, 'beban naik linear dengan murid');
});

(async () => {
  let pass = 0, fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); }
  }
  console.log(`\nkepatuhan-ai-sekolah-test: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
