'use strict';

/**
 * FIEZEL level guard & Ujian Skip Level gate (m028-06).
 *
 * Gerbang ini menguji satu klaim produk: "level yang belum dibuktikan boleh dijajal, tetapi
 * tidak boleh dibiarkan diam-diam" — sepuluh kesalahan di level percobaan menurunkan murid ke
 * level TERVERIFIKASI-nya dan mengunci level di atasnya sampai ia lulus ujian, TANPA pernah
 * menghapus satu pun bukti belajar.
 *
 * Pola sama seperti level-grammar-contract-test.js dan grammar-unlock-test.js: tidak ada
 * browser, tidak ada state murid yang disentuh. Fungsi-fungsi keputusan diekstrak dari app.js
 * sebagai teks lalu dijalankan di vm dengan state fixture, jadi yang diuji adalah KODE YANG
 * BENAR-BENAR JALAN, bukan salinan logika di dalam test.
 *
 * Catatan penyimpangan dari reports/desain-test-baru.md §3 (sengaja, kontrak owner menang):
 *  - Bentuk state adalah `state.levelTrust` ({verified, locked, probation.mistakesByLevel,
 *    exams, demotions}) sesuai kontrak owner butir 1, bukan `verifiedLevels`/`lockedLevels`.
 *    Assertion perilakunya identik: verified adalah pelabuhan aman, level di atas verified
 *    terkunci setelah demosi, lulus ujian membuka kunci.
 *  - Pemicunya adalah kesalahan KUMULATIF per level percobaan (bukan `consecutiveWrong`),
 *    dan hooknya di `record()` — satu-satunya titik yang dilewati semua jawaban pertama.
 *    `updateMastery()` juga dilewati percobaan kedua, sehingga tidak cocok jadi penghitung
 *    kesalahan yang membawa konsekuensi.
 *  - Demosi turun ke level VERIFIED (A1 untuk pelompat murni), bukan satu tingkat, sesuai
 *    kontrak owner butir 2.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const checks = [];
let failed = false;

function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details || '' });
  if (!ok) failed = true;
}

function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

function constant(name) {
  const match = app.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9]+)`));
  return match ? Number(match[1]) : null;
}

// ---------------------------------------------------------------------------
// 0. Kontrak nama: konstanta dan fungsi harus ada dengan nama yang disepakati
// ---------------------------------------------------------------------------

const WRONG_LIMIT = constant('LEVEL_GUARD_WRONG_LIMIT');
const EXAM_PASS = constant('LEVEL_EXAM_PASS');
const EXAM_SIZE = constant('LEVEL_EXAM_SIZE');
const COOLDOWN_MS = constant('LEVEL_EXAM_COOLDOWN_MS');

check('LEVEL_GUARD_WRONG_LIMIT terdefinisi sebagai 10', WRONG_LIMIT === 10,
  `nilai terbaca: ${WRONG_LIMIT} — angka ini yang muncul di teks UI, jadi test membacanya dari kode, bukan menghardcode ulang`);
check('Ambang lulus ujian terdefinisi dan >= 80%', Number.isFinite(EXAM_PASS) && EXAM_PASS >= 80,
  `LEVEL_EXAM_PASS=${EXAM_PASS}`);
check('Ukuran ujian 25 soal', EXAM_SIZE === 25, `LEVEL_EXAM_SIZE=${EXAM_SIZE}`);
check('Cooldown gagal ujian tepat 24 jam', COOLDOWN_MS === 86400000,
  `LEVEL_EXAM_COOLDOWN_MS=${COOLDOWN_MS} (anti-eksploitasi, rekomendasi 8 reports/riset-duolingo.md)`);

const blueprintMatch = app.match(/const\s+LEVEL_EXAM_BLUEPRINT\s*=\s*\{grammar:(\d+),vocab:(\d+),reading:(\d+)\}/);
const blueprintSum = blueprintMatch
  ? Number(blueprintMatch[1]) + Number(blueprintMatch[2]) + Number(blueprintMatch[3])
  : null;
check('Blueprint ujian 10 grammar + 8 vocab + 7 reading = 25', blueprintSum === EXAM_SIZE && blueprintMatch?.[1] === '10' && blueprintMatch?.[2] === '8' && blueprintMatch?.[3] === '7',
  blueprintMatch ? `grammar ${blueprintMatch[1]}, vocab ${blueprintMatch[2]}, reading ${blueprintMatch[3]}` : 'LEVEL_EXAM_BLUEPRINT tidak ditemukan');

const NEEDED = ['defaultLevelTrust', 'sanitizeLevelTrust', 'levelTrustState', 'verifiedLevel', 'levelTrustGap',
  'nextVerifiableLevel', 'levelEntryDecision', 'levelEntryDeferLevel', 'levelEntryChoiceCopy', 'levelEntryDefer',
  'probationMistakes', 'probationActive', 'isLevelLocked', 'levelGuardEvaluate',
  'applyLevelDemotion', 'levelExamUnlockable', 'levelExamCooldownRemaining', 'levelExamAvailability',
  'recordSkipExamPass', 'recordSkipExamFail', 'levelTrustAdoptPlacement', 'getActiveLevel', 'placementLevel'];
const blocks = {};
const missing = [];
for (const name of NEEDED) {
  blocks[name] = sourceBlock(name);
  if (!blocks[name]) missing.push(name);
}
check('Semua fungsi keputusan level trust bisa diekstrak per nama', missing.length === 0,
  missing.length ? `hilang: ${missing.join(', ')}` : NEEDED.join(', '));

// ---------------------------------------------------------------------------
// 1. Sandbox: jalankan fungsi asli, bukan tiruannya
// ---------------------------------------------------------------------------

let saves = 0;
const sandbox = {
  LEVELS,
  LEVEL_GUARD_WRONG_LIMIT: WRONG_LIMIT,
  LEVEL_EXAM_PASS: EXAM_PASS,
  LEVEL_EXAM_SIZE: EXAM_SIZE,
  LEVEL_EXAM_COOLDOWN_MS: COOLDOWN_MS,
  state: null,
  // m025-166: teks gerbang masuk level dibangun dari copy yang sama seperti UI, jadi
  // sandbox menyuplai bloknya apa adanya dari app.js - bukan salinan yang bisa menua.
  LEVEL_GUARD_COPY: (() => {
    const block = app.match(/const\s+LEVEL_GUARD_COPY=\{[\s\S]*?\n\};/);
    try { return block ? vm.runInNewContext(`${block[0].replace(/^const\s+LEVEL_GUARD_COPY=/, '')}`) : {}; }
    catch (_) { return {}; }
  })(),
  save: () => { saves++; },
  showToast: () => {},
  coreBrainCache: null,
  console
};
let sandboxReady = false;
try {
  vm.createContext(sandbox);
  vm.runInContext(NEEDED.map(name => blocks[name]).join('\n'), sandbox, { timeout: 4000 });
  sandboxReady = true;
} catch (error) {
  check('Fungsi level trust bisa dievaluasi di vm', false, error.message);
}
if (sandboxReady) check('Fungsi level trust bisa dievaluasi di vm', true, 'blok fungsi dieksekusi tanpa DOM');

function call(expression, s) {
  sandbox.state = s;
  return vm.runInContext(expression, sandbox, { timeout: 2000 });
}

/** Fixture: murid yang sudah membuktikan A2, sekarang menjajal B1, dengan bukti belajar nyata. */
function fixture(overrides = {}) {
  const base = {
    preferences: { activeLevel: 'B1', levelMode: 'manual' },
    placementDone: true,
    level: 2,
    consecutiveWrong: 0,
    totalAnswered: 42,
    vocab: { water: { total: 4, mastery: 75, correct: 3 } },
    grammar: { 'present-simple': { total: 5, mastery: 60, correct: 3 } },
    reading: { 'a1-market': { total: 3, mastery: 66 } },
    history: [{ at: '2026-08-01T00:00:00.000Z', skill: 'water', ok: true }],
    wrongAnswers: [],
    levelTrust: {
      verified: 'A2',
      locked: false,
      probation: { level: 'B1', mistakesByLevel: {}, startedAt: 0, lastMistakeAt: 0 },
      exams: {},
      demotions: [],
      pendingNotice: null
    }
  };
  const next = JSON.parse(JSON.stringify(base));
  if (overrides.preferences) next.preferences = { ...next.preferences, ...overrides.preferences };
  if (overrides.levelTrust) next.levelTrust = { ...next.levelTrust, ...overrides.levelTrust };
  if (overrides.mistakes) {
    next.levelTrust.probation.mistakesByLevel = { ...next.levelTrust.probation.mistakesByLevel, ...overrides.mistakes };
  }
  return next;
}

function evidenceSnapshot(s) {
  return JSON.stringify({
    vocab: s.vocab, grammar: s.grammar, reading: s.reading,
    history: s.history, totalAnswered: s.totalAnswered
  });
}

if (sandboxReady) {
  // ------------------------------------------------------------------- L1
  // Sepuluh salah di level percobaan = demosi ke level terverifikasi + kunci.
  const l1 = fixture({ mistakes: { B1: WRONG_LIMIT } });
  const verdict = call('levelGuardEvaluate(state)', l1);
  const beforeL1 = evidenceSnapshot(l1);
  const applied = call('applyLevelDemotion(state)', l1);
  const l1ok = verdict.action === 'demote' && verdict.from === 'B1' && verdict.to === 'A2' &&
    applied && call('getActiveLevel(state)', l1) === 'A2' &&
    call("isLevelLocked(state,'B1')", l1) === true &&
    call("isLevelLocked(state,'C1')", l1) === true &&
    l1.consecutiveWrong === 0 &&
    l1.levelTrust.demotions.length === 1;
  check('L1 · 10 salah di level percobaan mendemosi ke level terverifikasi dan mengunci di atasnya', l1ok,
    `verdict=${JSON.stringify(verdict)} aktif=${call('getActiveLevel(state)', l1)} B1Terkunci=${call("isLevelLocked(state,'B1')", l1)} C1Terkunci=${call("isLevelLocked(state,'C1')", l1)}`);
  check('L1b · level terverifikasi tidak ikut terkunci saat demosi', call("isLevelLocked(state,'A2')", l1) === false && call("isLevelLocked(state,'A1')", l1) === false,
    'murid harus punya minimal satu pintu yang boleh dibuka, kalau tidak ia terjebak');

  // ------------------------------------------------------------------- L2
  const l2 = fixture({ mistakes: { B1: WRONG_LIMIT - 1 } });
  const verdict2 = call('levelGuardEvaluate(state)', l2);
  const beforeL2 = evidenceSnapshot(l2);
  const applied2 = call('applyLevelDemotion(state)', l2);
  check('L2 · 9 salah (satu di bawah limit) belum mendemosi siapa pun', verdict2.action === 'none' && applied2 === null &&
    call('getActiveLevel(state)', l2) === 'B1' && call("isLevelLocked(state,'B1')", l2) === false &&
    evidenceSnapshot(l2) === beforeL2,
    `batasnya harus persis LEVEL_GUARD_WRONG_LIMIT (${WRONG_LIMIT}); verdict=${JSON.stringify(verdict2)}`);

  // ------------------------------------------------------------------- L3
  // Lulus ujian: verified naik SATU tangga, kunci terbuka, level aktif ikut naik.
  const l3 = fixture({ mistakes: { B1: WRONG_LIMIT } });
  call('applyLevelDemotion(state)', l3);
  const passed = call("recordSkipExamPass(state,'B1',{score:21,total:25,accuracy:84})", l3);
  const l3ok = passed === true && l3.levelTrust.verified === 'B1' &&
    call("isLevelLocked(state,'B1')", l3) === false &&
    call('getActiveLevel(state)', l3) === 'B1' &&
    l3.levelTrust.exams.B1?.passed === true &&
    (l3.levelTrust.probation.mistakesByLevel.B1 || 0) === 0;
  check('L3 · lulus Ujian Skip Level menaikkan verified, membuka kunci, dan menaikkan level aktif', l3ok,
    `verified=${l3.levelTrust.verified} aktif=${call('getActiveLevel(state)', l3)} terkunci=${call("isLevelLocked(state,'B1')", l3)} ujian=${JSON.stringify(l3.levelTrust.exams.B1 || null)}`);
  check('L3b · setelah lulus B1, level di atas verified tetap belum otomatis terbuka sebagai terverifikasi', l3.levelTrust.verified === 'B1' && call('nextVerifiableLevel(state)', l3) === 'B2',
    'ujian berantai: satu ujian, satu anak tangga (kontrak owner butir 3)');

  // Ujian berantai: C1 tidak bisa dilompati saat verified masih A2.
  const chain = fixture();
  const skipAttempt = call("recordSkipExamPass(state,'C1',{score:25,total:25,accuracy:100})", chain);
  check('L3c · ujian level jauh di atas verified ditolak (berantai, bukan lompat bebas)',
    skipAttempt === false && chain.levelTrust.verified === 'A2' &&
    call("levelExamUnlockable('C1',state)", chain) === false &&
    call("levelExamUnlockable('B1',state)", chain) === true,
    `verified tetap ${chain.levelTrust.verified}; hanya ${call('nextVerifiableLevel(state)', chain)} yang boleh diuji`);

  // ------------------------------------------------------------------- L4
  const l4 = fixture({ preferences: { activeLevel: 'A2' }, mistakes: { A2: WRONG_LIMIT + 5 } });
  const verdict4 = call('levelGuardEvaluate(state)', l4);
  check('L4 · salah sebanyak apa pun di level terverifikasi sendiri tidak pernah mendemosi', verdict4.action === 'none' &&
    call('applyLevelDemotion(state)', l4) === null && call("isLevelLocked(state,'A2')", l4) === false &&
    call('getActiveLevel(state)', l4) === 'A2',
    'level terverifikasi adalah pelabuhan aman — di sana murid sedang belajar, bukan sedang mengklaim');

  // ------------------------------------------------------------------- L5
  const l5 = fixture({ preferences: { activeLevel: 'A1' }, levelTrust: { verified: 'A1' }, mistakes: { A1: WRONG_LIMIT * 3 } });
  const verdict5 = call('levelGuardEvaluate(state)', l5);
  check('L5 · A1 tidak pernah didemosi dan tidak pernah terkunci', verdict5.action === 'none' &&
    call("isLevelLocked(state,'A1')", l5) === false && call('getActiveLevel(state)', l5) === 'A1',
    'tidak ada level di bawah A1; mengunci A1 berarti mengunci murid keluar dari aplikasinya sendiri');

  const trapped = fixture({ levelTrust: { verified: 'A1', locked: true } });
  check('L5b · saat terkunci, level verified tetap bisa dipakai', call("isLevelLocked(state,'A1')", trapped) === false &&
    call("isLevelLocked(state,'B1')", trapped) === true, 'kunci hanya berlaku di atas verified');

  // ------------------------------------------------------------------- L6
  check('L6 · guard dan ujian tidak menghapus satu pun bukti belajar', beforeL1 === evidenceSnapshot(l1) && beforeL1 === evidenceSnapshot(l3) && beforeL2 === evidenceSnapshot(l2),
    'snapshot vocab/grammar/reading/history/totalAnswered identik sebelum dan sesudah demosi + lulus ujian');

  // -------------------------------------------------------- cooldown & gagal
  const failState = fixture();
  const now = Date.now();
  call("recordSkipExamFail(state,'B1',{score:12,total:25,accuracy:48,weakSkill:'Present simple'})", failState);
  const wait = call("levelExamCooldownRemaining('B1',state)", failState);
  const availability = call("levelExamAvailability('B1',state)", failState);
  check('L7 · gagal ujian memberi jeda 24 jam untuk level itu, bukan hukuman progres',
    failState.levelTrust.exams.B1?.attempts === 1 && failState.levelTrust.exams.B1?.passed === false &&
    wait > COOLDOWN_MS - 5000 && wait <= COOLDOWN_MS && availability.ok === false && availability.reason === 'cooldown' &&
    failState.levelTrust.verified === 'A2' && evidenceSnapshot(failState) === beforeL2,
    `sisa cooldown ${Math.round(wait / 3600000)} jam; verified tetap ${failState.levelTrust.verified}`);
  const later = call(`levelExamAvailability('B1',state,${now + COOLDOWN_MS + 1000})`, failState);
  check('L7b · setelah 24 jam lewat, ujian bisa diulang', later.ok === true && later.reason === 'ready',
    JSON.stringify(later));

  // ------------------------------------------- placement adalah bukti langsung
  const fresh = fixture({ preferences: { activeLevel: 'B2' }, levelTrust: { verified: 'A1', locked: true } });
  call("levelTrustAdoptPlacement('B2',state)", fresh);
  check('L8 · hasil placement langsung menjadi level terverifikasi', fresh.levelTrust.verified === 'B2' &&
    fresh.levelTrust.locked === false && call("isLevelLocked(state,'B2')", fresh) === false,
    'placement 25 soal tanpa petunjuk adalah bukti — kontrak owner butir 3');

  // ------------------------------------ kompatibilitas: state lama default-allow
  const legacy = {
    preferences: { activeLevel: 'A1' }, vocab: {}, grammar: {}, reading: {}, history: [], totalAnswered: 0
  };
  const legacyOk = call('verifiedLevel(state)', legacy) === 'A1' &&
    call("isLevelLocked(state,'B1')", legacy) === false &&
    call("isLevelLocked(state,'C2')", legacy) === false &&
    call('levelGuardEvaluate(state)', legacy).action === 'none';
  check('L9 · state lama tanpa levelTrust bersifat DEFAULT-ALLOW', legacyOk,
    'guard menghitung, bukan memblokir pindah level; hanya level TERKUNCI akibat demosi yang ditolak (kontrak owner butir 4)');

  const dirty = { levelTrust: { verified: 'Z9', locked: 'yes', probation: { mistakesByLevel: { B1: -4, ZZ: 3, B2: '6' } }, exams: { B1: { attempts: '2', cooldownUntil: -10 }, QQ: {} }, demotions: 'nope' } };
  const clean = call('levelTrustState(state)', dirty);
  check('L10 · sanitizeLevelTrust menolak nilai sampah tanpa melempar', clean.verified === 'A1' &&
    clean.locked === true && clean.probation.mistakesByLevel.B2 === 6 && !('ZZ' in clean.probation.mistakesByLevel) &&
    !('B1' in clean.probation.mistakesByLevel) && !('QQ' in clean.exams) && Array.isArray(clean.demotions) && clean.demotions.length === 0,
    JSON.stringify(clean.probation.mistakesByLevel));
}

// ---------------------------------------------------------------------------
// 1b. m025-166 · gerbang masuk level: keputusan MURNI + "nanti aja" jatuh ke A1
//
// Alur baru owner: memilih level yang belum terverifikasi tidak lagi membuka mode percobaan,
// tetapi satu popup keputusan. Keputusan itu harus bisa ditanyai tanpa DOM, tanpa state, dan
// tanpa jam - kalau tidak, satu-satunya cara mengujinya adalah lewat browser, dan rantai
// ujian yang salah akan lolos sampai ke tangan murid.
// ---------------------------------------------------------------------------

if (sandboxReady) {
  const decide = (chosen, verified) => vm.runInContext(`levelEntryDecision(${JSON.stringify(chosen)},${JSON.stringify(verified)})`, sandbox, { timeout: 2000 });
  const b1FromA1 = decide('B1', 'A1');
  const c1FromB1 = decide('C1', 'B1');
  const a1FromA1 = decide('A1', 'A1');
  const b1FromB2 = decide('B1', 'B2');
  check('E1 · levelEntryDecision(chosen, verified) memulangkan {requiredExam, allowed} murni',
    b1FromA1.allowed === false && b1FromA1.requiredExam === 'A2' &&
    c1FromB1.allowed === false && c1FromB1.requiredExam === 'B2',
    `pilih B1 saat verified A1 -> ${JSON.stringify(b1FromA1)}; pilih C1 saat verified B1 -> ${JSON.stringify(c1FromB1)}`);
  check('E1b · level yang sudah terbukti (atau di bawahnya) masuk tanpa gerbang',
    a1FromA1.allowed === true && a1FromA1.requiredExam === '' && b1FromB2.allowed === true,
    'gerbang hanya berlaku ke ATAS; kalau tidak, murid yang sudah lulus dihadang lagi di levelnya sendiri');
  check('E1c · rantainya naik satu tangga per ujian, tidak pernah melompat ke level yang dipilih',
    LEVELS.slice(0, LEVELS.length - 1).every((verified, i) => {
      const target = LEVELS[LEVELS.length - 1];
      return decide(target, verified).requiredExam === LEVELS[i + 1];
    }) && decide('C2', 'C2').allowed === true,
    'memilih C2 dari verified A1 tetap berarti ujian A2 dulu - konsisten dengan nextVerifiableLevel');
  check('E1d · level sampah tidak pernah membuat gerbang menuntut ujian hantu',
    decide('', 'A1').allowed === true && decide('Z9', 'A1').allowed === true && decide('B1', 'Z9').requiredExam === 'A2',
    'verified tak dikenal jatuh ke A1, bukan ke undefined');

  const deferLevel = vm.runInContext('levelEntryDeferLevel()', sandbox, { timeout: 2000 });
  check('E2 · "Nanti aja" mengembalikan murid ke A1', deferLevel === 'A1',
    `levelEntryDeferLevel()=${deferLevel} — pelabuhan paling aman untuk murid yang belum punya bukti apa pun`);

  const deferState = { preferences: { activeLevel: 'B1', levelMode: 'manual' }, vocab: {}, grammar: {}, reading: {}, history: [], totalAnswered: 3 };
  const returned = call("levelEntryDefer('B1','A2',state)", deferState);
  check('E2b · levelEntryDefer memindahkan activeLevel ke A1 dan mengembalikan A1',
    returned === 'A1' && deferState.preferences.activeLevel === 'A1' && deferState.preferences.levelMode === 'manual' &&
    deferState.totalAnswered === 3,
    `kembali=${returned} aktif=${deferState.preferences.activeLevel} — pengalihan tidak menyentuh bukti belajar`);

  const copy = vm.runInContext("levelEntryChoiceCopy('B1','A2')", sandbox, { timeout: 2000 });
  check('E3 · teks gerbang menyebut level pilihan DAN ujian berikutnya di rantai',
    /B1/.test(copy.title) && /A2/.test(copy.line) && /B1/.test(copy.line) &&
    /A1/.test(copy.deferToast) && /B1/.test(copy.deferToast) && copy.line.length <= 140,
    `judul="${copy.title}" kalimat="${copy.line}" toast="${copy.deferToast}" — microcopy, bukan paragraf artikel`);
}

// ---------------------------------------------------------------------------
// 2. Pemeriksaan statis: penolakan harus ada di PINTUNYA, bukan cuma tersedia
// ---------------------------------------------------------------------------

const recordBlock = sourceBlock('record');
check('S1 · record() memanggil hook guard untuk setiap jawaban salah', /levelTrustNoteMistake\(/.test(recordBlock),
  'record() adalah satu-satunya titik yang dilewati semua jawaban pertama; hook di sini berarti tidak ada jalur latihan yang bisa lupa melapor');

const noteBlock = sourceBlock('levelTrustNoteMistake');
check('S2 · hook kesalahan berkonsultasi ke levelGuardEvaluate(', /levelGuardEvaluate\(/.test(noteBlock) && /LEVEL_GUARD_WARN_STEPS/.test(noteBlock),
  'vonis dihitung di satu tempat, dan peringatan PAW memakai daftar langkah yang sama');
check('S3 · kesalahan di dalam ujian/placement tidak dihitung sebagai pelanggaran guard', /level-exam/.test(noteBlock) && /placement/.test(noteBlock),
  'ujian menilai, bukan menghukum');

const setterBlock = sourceBlock('setActiveLevel');
check('S4 · setActiveLevel() menolak level yang terkunci', /isLevelLocked\(/.test(setterBlock),
  'penolakan ada di pintunya, bukan hanya di tampilan panel');
check('S5 · penolakan setActiveLevel bersifat default-allow', /typeof\s+isLevelLocked\s*===\s*'function'/.test(setterBlock) && /try\s*\{/.test(setterBlock),
  'state lama dan fixture kontrak yang tidak menyuplai helper tetap boleh berpindah level');

const panelBlock = sourceBlock('openLevelPanel');
check('S6 · openLevelPanel merender status terkunci dan jalan keluarnya', /isLevelLocked\(/.test(panelBlock) && /disabled/.test(panelBlock) && /LEVEL_GUARD_COPY/.test(panelBlock),
  'pesan §3d muncul di panel level, bukan hanya di toast');

// -------------------------------------------------- m025-166 kontrak UI alur baru
check('S6b · panel level mengarahkan level belum-terverifikasi ke gerbang popup, bukan langsung aktif',
  /levelEntryDecision\(/.test(panelBlock) && /openLevelEntryGate\(/.test(panelBlock),
  'penegakan alur ada di lapisan handler; setActiveLevel() sendiri tetap default-allow');
check('S6c · tombol "Coba dulu" dan "Ikut Ujian Skip Level" tidak ada lagi di UI',
  !/probationTry/.test(app) && !/'Coba dulu'/.test(app) && !/"Coba dulu"/.test(app) && !/'Ikut Ujian Skip Level'/.test(app),
  'mode percobaan tidak bisa lagi dimasuki dari UI (fungsinya tetap ada sebagai backstop state lama)');

const gateBlock = sourceBlock('openLevelEntryGate');
check('S6d · popup gerbang memakai keputusan murni, dua tombol, dan maskot PAW',
  /levelEntryDecision\(/.test(gateBlock) && /entryExam/.test(gateBlock) && /entryLater/.test(gateBlock) &&
  /pawFaceMarkup\(\)/.test(gateBlock) && /levelEntryDefer\(/.test(gateBlock) && /startLevelExam\(/.test(gateBlock),
  '"Ikuti ujian" membuka ujian berikutnya di rantai; "Nanti aja" mengalihkan ke A1');
check('S6e · gerakan popup hanya transform+opacity, memakai token easing, dan hormat pada gerak minimal',
  /pawMotionAllowed\(/.test(gateBlock) && /is-static/.test(gateBlock),
  'kelas is-static memadamkan animasi saat murid mematikan gerak; prefers-reduced-motion ditangani di style.css');

const gateCss = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const popCss = gateCss.match(/@keyframes\s+fzLevelEntryPop\{[^}]*\}[^@]*/);
check('S6f · style popup memakai var(--fz-spring)/var(--fz-out) dan tidak menganimasikan properti layout',
  /--fz-spring:/.test(gateCss) && /--fz-out:/.test(gateCss) &&
  /\.level-entry-pop\{[^}]*var\(--fz-spring/.test(gateCss) && /\.level-entry-pop>\*\{[^}]*var\(--fz-out/.test(gateCss) &&
  /prefers-reduced-motion:reduce\)\{\s*\.level-entry-pop/.test(gateCss) &&
  !!popCss && /transform:/.test(popCss[0]) && !/(?:height|width|margin|padding|top|left):/.test(popCss[0].replace(/[^{]*\{/, '')),
  'animasi yang menyentuh layout memaksa reflow tiap frame di ponsel murah');

const onboardingHook = app.match(/onGoal:\(\{goal,level\}\)=>\{[\s\S]*?\},\n/);
check('S6g · level pilihan di perkenalan memasang gerbang, dan Home yang membukanya',
  !!onboardingHook && /armLevelEntryGate\(/.test(onboardingHook[0]) && /maybeShowLevelEntryGate\(/.test(sourceBlock('home')),
  'popup tidak pernah muncul menumpuk di atas layar perkenalan');

const defaultStateMatch = app.match(/const\s+defaultState=\{[\s\S]{0,2400}?\};/);
check('S7 · defaultState memuat levelTrust tersanitasi', !!defaultStateMatch && /levelTrust:\{/.test(defaultStateMatch[0]),
  'flag baru punya bentuk default; sanitizeState memanggil sanitizeLevelTrust');
check('S8 · sanitizeState menjalankan sanitizeLevelTrust', /levelTrust:\s*sanitizeLevelTrust\(/.test(sourceBlock('sanitizeState')),
  'state lama dari localStorage naik bentuk tanpa memicu error');

const examBuilder = sourceBlock('buildLevelExamQuestions');
check('S9 · soal ujian diacak dari bank level itu setiap percobaan', /shuffle\(/.test(examBuilder) && /LEVEL_EXAM_BLUEPRINT/.test(examBuilder) && /validateQuestion\(/.test(examBuilder),
  'anti-eksploitasi: kolam besar + acak, dan tiap soal tetap lewat validateQuestion');

const startExam = sourceBlock('startLevelExam');
check('S10 · ujian berjalan tanpa petunjuk dan tanpa percobaan kedua', /noHints:\s*true/.test(startExam) && /noHints/.test(sourceBlock('quizLoop')),
  '"terverifikasi" tidak boleh berarti dituntun sampai benar');

const settle = sourceBlock('levelExamSettle');
check('S11 · penilaian ujian memakai LEVEL_EXAM_PASS dan bercabang lulus/gagal', /LEVEL_EXAM_PASS/.test(settle) && /recordSkipExamPass\(/.test(settle) && /recordSkipExamFail\(/.test(settle),
  'ambang tidak dihardcode di dua tempat');

const finishBlock = sourceBlock('finishQuiz');
check('S12 · finishQuiz menyambungkan ujian dan placement ke level trust', /levelExamSettle\(/.test(finishBlock) && /levelTrustAdoptPlacement\(/.test(finishBlock),
  'hasil ujian dan hasil placement sama-sama tersimpan sebagai bukti');

const homeBlock = sourceBlock('home');
check('S13 · Home menampilkan banner mode percobaan / terkunci', /activeLevelTrustMarkup\(\)/.test(homeBlock),
  'murid harus tahu statusnya tanpa harus membuka panel level');

const copyBlock = app.match(/const\s+LEVEL_GUARD_COPY=\{[\s\S]*?\};/);
const copyText = copyBlock ? copyBlock[0] : '';
check('S14 · copy guard memuat teks peringatan 5, 8, demosi, kunci, dan ujian', /warn5:/.test(copyText) && /warn8:/.test(copyText) && /demotionBody:/.test(copyText) && /lockedFeature:/.test(copyText) && /examDesc:/.test(copyText),
  'teks §3 dan §4 reports/copy-fitur-baru.md tersimpan di satu tempat, bukan tersebar');
check('S14b · copy gerbang baru ada dan penjelasan "belum terverifikasi" sudah jadi microcopy',
  /entryChip:/.test(copyText) && /entryExam:'Ikuti ujian'/.test(copyText) && /entryLater:'Nanti aja'/.test(copyText) &&
  (copyText.match(/probationBody:'([^']*)'/)?.[1] || '').length <= 90,
  `panjang probationBody sekarang ${(copyText.match(/probationBody:'([^']*)'/)?.[1] || '').length} karakter — satu kalimat, bukan artikel`);
check('S15 · angka di copy ujian sinkron dengan LEVEL_EXAM_PASS', new RegExp(`minimal\\s+${EXAM_PASS}%`).test(copyText),
  `teks harus menulis ${EXAM_PASS}% supaya tidak menjanjikan ambang yang berbeda dari kode`);

// ---------------------------------------------------------------------------
// Report dan hasil CLI
// ---------------------------------------------------------------------------

const report = {
  schema: 'fiezel-level-guard-report-v1',
  generatedAt: new Date().toISOString(),
  status: failed ? 'NOT_READY' : 'PASS',
  contract: {
    wrongLimit: WRONG_LIMIT,
    examPass: EXAM_PASS,
    examSize: EXAM_SIZE,
    cooldownMs: COOLDOWN_MS,
    blueprint: blueprintMatch ? { grammar: Number(blueprintMatch[1]), vocab: Number(blueprintMatch[2]), reading: Number(blueprintMatch[3]) } : null
  },
  counts: {
    pass: checks.filter(entry => entry.status === 'PASS').length,
    fail: checks.filter(entry => entry.status === 'FAIL').length,
    saves
  },
  checks
};

fs.writeFileSync(path.join(root, 'LEVEL-GUARD-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
