'use strict';
/**
 * tests/exam-lock-test.js — GERBANG: SEMUA UJIAN DIPANTAU, DAN AI TERTUTUP DI DALAMNYA.
 *
 * Dua laporan owner dari kelas, keduanya lahir dari kekurangan yang sama:
 *
 *   "detector hanya berfungsi di ujian mini, tidak berlaku di ujian lain"
 *   "pembimbing kamu berada dalam semua sesi ujian, hasilnya sama aja, murid bisa
 *    menanyakan kepada AI"
 *
 * Sampai m025-272 tidak ada satu pun tempat di aplikasi yang tahu jawaban atas "apakah murid
 * sedang ujian sekarang?". Pendeteksi menanyakannya ke runner tugas Kelas — jadi ia buta
 * terhadap tes penempatan, ujian Skip Level, dan set berformat ujian Reading/Skills Lab/Writing.
 * Pintu AI tidak menanyakannya ke siapa pun — jadi ia selalu terbuka, termasuk di tengah ujian.
 *
 * `features/ui/fiezel-exam-lock.js` menjadi jawaban tunggal itu, dan berkas ini menjaga bahwa
 * SEMUA permukaan ujian benar-benar menyalakannya dan SEMUA pintu AI benar-benar menanyakannya.
 * Menambah permukaan ujian baru tanpa menyalakan kuncinya = gerbang ini merah.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const ROOT = process.env.FIEZEL_ROOT || __fzRoot;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

function withStorage(fn) {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const box = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (k) => (k in box ? box[k] : null), setItem: (k, v) => { box[k] = String(v); }, removeItem: (k) => { delete box[k]; } },
    configurable: true, writable: true
  });
  try { return fn(); } finally { if (before) Object.defineProperty(globalThis, 'localStorage', before); }
}

/* ------------------------------------------------------------------ inti kunci --- */

test('kunci ujian: menyala, menjawab jenisnya, dan hanya bisa dilepas oleh jenis yang sama', () => {
  withStorage(() => {
    delete require.cache[require.resolve('../features/ui/fiezel-exam-lock.js')];
    const L = require('../features/ui/fiezel-exam-lock.js');
    assert.strictEqual(L.active(), false);
    assert.ok(L.begin('placement'));
    assert.strictEqual(L.active(), true);
    assert.strictEqual(L.kind(), 'placement');
    /* Dua permukaan ujian tidak pernah berjalan bersamaan; melepas kunci milik jenis lain
       adalah cara paling halus untuk membuka pintu AI di tengah ujian yang masih berjalan. */
    assert.strictEqual(L.end('reading_exam'), false);
    assert.strictEqual(L.active(), true);
    assert.strictEqual(L.end('placement'), true);
    assert.strictEqual(L.active(), false);
    assert.strictEqual(L.begin('bukan-jenis'), false, 'jenis di luar enum ditolak');
  });
});

test('kunci ujian: bertahan melewati muat ulang, tetapi tidak menyandera selamanya', () => {
  withStorage(() => {
    delete require.cache[require.resolve('../features/ui/fiezel-exam-lock.js')];
    const L = require('../features/ui/fiezel-exam-lock.js');
    L.begin('level_exam', { id: 'x' });
    // "Muat ulang halaman" = modul dimuat ulang di atas penyimpanan yang sama.
    delete require.cache[require.resolve('../features/ui/fiezel-exam-lock.js')];
    const L2 = require('../features/ui/fiezel-exam-lock.js');
    assert.strictEqual(L2.active(), true, 'memuat ulang halaman adalah pelarian termurah — kuncinya harus selamat');
    // Sesi yang tidak pernah ditutup (aplikasi mati di tengah ujian) kedaluwarsa sendiri.
    const raw = JSON.parse(globalThis.localStorage.getItem(L2.KEY));
    raw.until = Date.now() - 1;
    globalThis.localStorage.setItem(L2.KEY, JSON.stringify(raw));
    assert.strictEqual(L2.active(), false, 'kunci yang mati tidak boleh mengunci pembimbing selamanya');
  });
});

test('enum jenis ujian identik antara klien dan server', async () => {
  const L = require('../features/ui/fiezel-exam-lock.js');
  const core = await import('../workers/api/teacher/class-sync-core.js');
  assert.deepStrictEqual(core.EXAM_KINDS.slice().sort(), L.KINDS.slice().sort(),
    'menambah jenis ujian berarti menyunting KEDUA daftar');
});

/* -------------------------------------------------- semua permukaan ujian ikut --- */

test('semua permukaan ujian menyalakan kunci — bukan hanya tugas Kelas', () => {
  const app = read('app.js'), hub = read('features/class-hub/fiezel-class-hub.js');
  // 1. tugas guru mode ujian (jalur lama, tetap ada)
  assert.ok(/FiezelExamLock\.begin\('assignment'/.test(hub), 'runner tugas Kelas');
  // 2. tes penempatan + ujian Skip Level + gerbang lewati materi (semuanya lewat quizLoop)
  assert.ok(/const MEASURE=[\s\S]{0,900}?examLockBegin\(lk/.test(app), 'sesi ukur di quizLoop');
  assert.ok(/\?'placement':/.test(app) && /\?'level_exam':/.test(app), 'penempatan dan ujian level dipetakan');
  // 3. set berformat ujian Reading
  assert.ok(/examKind:'reading_exam'/.test(app), 'set Reading berformat ujian');
  // 4. set berformat ujian Skills Lab (listening + speaking), lewat pembungkus controller.open
  assert.ok(/examLockBegin\('listening_exam'/.test(app) && /examLockBegin\('speaking_exam'/.test(app), 'Skills Lab');
  // 5. Writing berformat ujian (halaman, bukan sesi — disinkronkan per cat ulang view)
  assert.ok(/writingExamTask\(prompt\)\)examLockBegin\('writing_exam'/.test(app), 'Writing berformat ujian');
});

test('kunci dilepas di setiap akhir sesi, bukan hanya saat selesai bersih', () => {
  const app = read('app.js'), hub = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(/function abandonActiveSession[\s\S]{0,400}?examLockEnd/.test(app), 'sesi yang ditinggalkan melepas kunci');
  assert.ok(/function completeActiveSession[\s\S]{0,200}?examLockEnd/.test(app), 'sesi yang selesai melepas kunci');
  assert.ok(/onSessionEnd:\(\)=>\{try\{examLockEnd\('listening_exam'\);examLockEnd\('speaking_exam'\)/.test(app), 'sesi Skills Lab');
  assert.ok(/function syncExamLockForView/.test(app), 'permukaan berbasis layar dilepas saat murid pergi');
  assert.ok(/FiezelExamLock\.end\('assignment'\)/.test(hub), 'runner tugas Kelas');
});

test('murid diberi tahu SEBELUM ia sempat keluar, di permukaan ujian mana pun', () => {
  const app = read('app.js'), hub = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(/ujian\.mode-aktif/.test(app), 'ujian non-tugas memberi tahu saat mulai');
  assert.ok(/class-proctor-notice/.test(hub), 'runner tugas Kelas tetap memakai pitanya');
  const id = read('features/i18n/copy-id-proctor.js'), th = read('features/i18n/copy-th-proctor.js');
  ['ujian.mode-aktif', 'ujian.ai-terkunci', 'ujian.ai-terkunci-singkat', 'ujian.keluar-tercatat'].forEach((k) => {
    assert.ok(id.includes("'" + k + "'"), 'naskah id: ' + k);
    assert.ok(th.includes("'" + k + "'"), 'padanan th: ' + k);
  });
});

/* -------------------------------------------------------- pintu AI tertutup --- */

test('SETIAP pintu AI menanyakan kunci ujian lebih dulu', () => {
  const app = read('app.js');
  assert.ok(/function aiDoorAllowed\(\)\{return examLockActive\(\)\?examLockNotice\(\):true\}/.test(app), 'satu gerbang untuk semua pintu');
  // 1. navigasi ke layar Tanya FIEZEL
  assert.ok(/function go\(v,opts\)\{if\(\(v==='ask'\|\|v==='search'\)&&!aiDoorAllowed\(\)\)return false;/.test(app), 'rute ask/search');
  // 2 & 3. pembimbing PAW: bertanya langsung DAN membuka layarnya
  const bubble = (app.match(/FiezelCoachBubble\?\.install\?\.\([\s\S]{0,700}?\}\);/) || [''])[0];
  assert.ok(/ask:\(question,ctx\)=>\{if\(!aiDoorAllowed\(\)\)/.test(bubble), 'gelembung: bertanya');
  assert.ok(/openAsk:\(\)=>\{if\(!aiDoorAllowed\(\)\)/.test(bubble), 'gelembung: membuka layar Tanya');
  /* Menutup salah satu saja tidak menutup apa pun — gelembungnya sendiri sudah bisa
     menjawab tanpa pernah membuka layar. */
  assert.ok(/examLockNotice[\s\S]{0,400}ujian\.ai-terkunci/.test(app), 'penolakannya menyebut alasan dan batas waktunya');
});

test('pendeteksi ujian non-tugas memakai inti yang sama dan melapor sebagai fx', () => {
  const app = read('app.js'), lf = read('features/learner-flow/fiezel-learner-flow.js');
  assert.ok(/FiezelFocusGuard/.test(app), 'inti pendeteksi yang sama, bukan salinan kedua');
  assert.ok(/GRACE_MS\+200/.test(app), 'masa tenggang yang sama dan laporan untuk yang tidak kembali');
  assert.ok(/recordExamFocus\?\.\(/.test(app), 'catatannya dikirim lewat learner-flow');
  assert.ok(/function recordExamFocus/.test(lf) && /payload\.fx = \{ k:/.test(lf), 'fx ikut ke laporan kelas');
  assert.ok(/recordExamFocus: recordExamFocus/.test(lf), 'diekspor');
});

test('server + sisi guru: fx = jenis (enum) + tiga bilangan, dan kabarnya menyebut ujiannya', async () => {
  const core = await import('../workers/api/teacher/class-sync-core.js');
  const now = Date.now(), base = { cls: 'FZ-AB2C3D', name: 'Ani', skills: {} };
  const ok = core.normalizeReport(Object.assign({ fx: { k: 'placement', n: 2, s: 75, x: 50 } }, base), now);
  assert.deepStrictEqual(ok.report.fx, { k: 'placement', n: 2, s: 75, x: 50 });
  assert.strictEqual(core.normalizeReport(Object.assign({ fx: { k: 'ngarang', n: 1, s: 1, x: 1 } }, base), now).reason, 'bad_exam_kind');
  assert.strictEqual(core.normalizeReport(Object.assign({ fx: { k: 'placement', n: 1, s: 5, x: 9 } }, base), now).reason, 'bad_exam_focus');

  const TS = require('../features/teacher/fiezel-teacher-store.js');
  const c = TS.normalizeClass({ id: 'c1', code: 'FZ-AB2C3D', name: '8A', level: 'A2', students: [TS.newStudent('Ani')], assignments: [] });
  const p = TS.parseLearnerPayload({ v: 1, name: 'Ani', at: now, skills: { past_tense: { c: 1, t: 2 } }, cls: 'FZ-AB2C3D', fx: { k: 'placement', n: 2, s: 75, x: 50 } });
  const r = TS.ingest(c, p);
  assert.strictEqual(r.focusEvents.length, 1);
  const teks = TS.inboxText(Object.assign({ at: now }, r.focusEvents[0]));
  assert.ok(/tes penempatan/.test(teks), 'guru tahu ujian MANA: ' + teks);
  assert.strictEqual(TS.ingest(c, p).focusEvents.length, 0, 'laporan yang sama tidak membangunkan guru berulang kali');
});

test('pemasangan: kunci dimuat sebelum app.js dan ikut precache', () => {
  const html = read('index.html'), sw = read('sw.js');
  assert.ok(html.indexOf('fiezel-exam-lock.js') > -1 && html.indexOf('fiezel-exam-lock.js') < html.indexOf('./app.js'), 'sebelum app.js');
  assert.ok(sw.includes('./features/ui/fiezel-exam-lock.js'), 'ikut precache: ujian sering dikerjakan tanpa jaringan');
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); } catch (e) { fail++; console.log('FAIL - ' + name + '\n  ' + (e && e.stack || e)); }
  }
  console.log(fail ? `\n${fail} gagal` : '\nSemua gerbang kunci ujian lulus');
  process.exit(fail ? 1 : 0);
})();
