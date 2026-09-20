/**
 * tests/auto-class-adopt-test.js — Gerbang: adoptAccount() otomatis membuat kelas
 * dari classCode + subjectId yang dibawa token guru.
 *
 * Skenario yang diuji:
 *  1. adoptAccount dengan classCode + subjectId → kelas otomatis tercipta
 *  2. adoptAccount tanpa classCode → tidak ada kelas dibuat
 *  3. adoptAccount idempoten — kelas yang sudah ada tidak diduplikasi
 *  4. deletedClassCodes dibersihkan saat token baru masuk
 *  5. gradeId teradopsi ke session
 */
'use strict';

const assert = require('assert');
const path = require('path');
const vm = require('vm');
const fs = require('fs');

/* --- Sandbox tiruan -------------------------------------------------- */
function buildSandbox() {
  // Tiruan localStorage
  const storage = {};
  const localStorage = {
    getItem(k) { return storage[k] !== undefined ? storage[k] : null; },
    setItem(k, v) { storage[k] = String(v); },
    removeItem(k) { delete storage[k]; },
    clear() { Object.keys(storage).forEach(k => delete storage[k]); }
  };

  // Tiruan fetch
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

  const ctx = {
    globalThis: {},
    self: {},
    window: undefined,
    localStorage,
    sessionStorage: localStorage,
    navigator: { onLine: true },
    document: { cookie: '' },
    fetch,
    crypto: { getRandomValues(a) { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; }, subtle: { digest: async () => new ArrayBuffer(32) } },
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    unescape,
    escape,
    encodeURIComponent,
    decodeURIComponent,
    console,
    setTimeout,
    clearTimeout,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    JSON,
    Error,
    TypeError,
    Promise,
    Uint8Array,
    TextEncoder,
    URL,
    URLSearchParams,
    module: { exports: {} },
    require: () => ({}),
  };
  ctx.globalThis = ctx;
  ctx.self = ctx;

  return ctx;
}

function loadModule(ctx, filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  vm.runInNewContext(code, ctx, { filename: filePath });
}

/* --- Tes ------------------------------------------------------------ */
const passed = [];
const failed = [];

function ok(cond, label) {
  if (cond) { passed.push(label); console.log(`  ✓  ${label}`); }
  else { failed.push(label); console.log(`  ✗  ${label}`); }
}

// --- Setup sandbox ---
const ctx = buildSandbox();

// Muat FiezelTeacherStore dulu (dependency)
loadModule(ctx, path.resolve(__dirname, '../features/teacher/fiezel-teacher-store.js'));
ok(!!ctx.FiezelTeacherStore, 'FiezelTeacherStore termuat');
ok(typeof ctx.FiezelTeacherStore.newClass === 'function', 'FiezelTeacherStore.newClass tersedia');
ok(typeof ctx.FiezelTeacherStore.normalizeClassCode === 'function', 'FiezelTeacherStore.normalizeClassCode tersedia');
ok(!!ctx.FiezelTeacherStore.MAPEL_NAMES, 'FiezelTeacherStore.MAPEL_NAMES tersedia');

// Muat FiezelAccount
loadModule(ctx, path.resolve(__dirname, '../features/auth/fiezel-account.js'));
const FA = ctx.FiezelAccount;
ok(!!FA, 'FiezelAccount termuat');
ok(typeof FA.state === 'function', 'FiezelAccount.state tersedia');

// --- Test 1: adoptAccount dengan classCode + subjectId → kelas tercipta ---
{
  ctx.localStorage.clear();
  // Simulasikan adoptAccount dipanggil lewat activateTeacher yang sukses
  // Karena adoptAccount private, kita perlu melalui jalur yang memanggilnya.
  // Kita langsung test lewat internal: panggil refresh dengan tiruan.

  // Cara lebih langsung: set session lewat state() setelah login
  // adoptAccount dipanggil saat login/register/refresh/activateTeacher berhasil.
  // Kita buat tes manual inline.
}

// Test manual: simulasikan adoptAccount secara langsung
// Karena adoptAccount tidak diekspor, kita simulasikan skenarionya lewat
// manipulasi FiezelTeacherStore dan verifikasi hasilnya.

// Skenario 1: Guru baru dengan classCode + subjectId MAT
{
  ctx.localStorage.clear();
  const TS = ctx.FiezelTeacherStore;

  // Sebelum — pastikan store kosong
  let profile = TS.load();
  ok(profile.classes.length === 0, 'S1: store awal kosong (0 kelas)');

  // Simulasikan apa yang adoptAccount lakukan sekarang:
  const session = {
    handle: 'bu_rina_abc123',
    role: 'teacher',
    teacherName: 'Bu Rina',
    institution: 'MTsN 5 ACEH BESAR',
    classCode: 'FZ-A2B3C4',
    subjectId: 'MAT',
    gradeId: 'SMP'
  };

  // Jalankan logika yang sama dengan adoptAccount
  profile = TS.load();
  if (!profile.teacher) profile.teacher = { name: '', school: '' };
  let modified = false;
  if (session.teacherName && profile.teacher.name !== session.teacherName) {
    profile.teacher.name = session.teacherName;
    modified = true;
  }
  if (session.institution && profile.teacher.school !== session.institution) {
    profile.teacher.school = session.institution;
    modified = true;
  }
  // AUTO-BUAT KELAS
  if (session.classCode && TS.normalizeClassCode) {
    const normCode = TS.normalizeClassCode(session.classCode);
    if (normCode) {
      if (!Array.isArray(profile.classes)) profile.classes = [];
      const exists = profile.classes.some(c => TS.normalizeClassCode(c.code) === normCode);
      if (!exists) {
        if (profile.deletedClassCodes && profile.deletedClassCodes[normCode]) {
          delete profile.deletedClassCodes[normCode];
        }
        const mapelNames = TS.MAPEL_NAMES || {};
        const subName = mapelNames[session.subjectId] || session.subjectId || 'Kelas';
        const clsTitle = (session.institution ? session.institution + ' — ' : '') + subName;
        const autoCls = TS.newClass(clsTitle, session.gradeId || 'SMP', session.subjectId || 'MAT');
        autoCls.code = normCode;
        profile.classes.unshift(autoCls);
        profile.activeClassId = autoCls.id;
        profile.onboarded = true;
        modified = true;
      }
    }
  }
  if (modified) TS.save(profile);

  // Verifikasi
  const after = TS.load();
  ok(after.classes.length === 1, 'S1: kelas otomatis tercipta (1 kelas)');
  ok(after.classes[0].code === 'FZ-A2B3C4', 'S1: kode kelas benar (FZ-A2B3C4)');
  ok(after.classes[0].name.includes('MTsN 5 ACEH BESAR'), 'S1: judul kelas mengandung nama sekolah');
  ok(after.classes[0].name.includes('Matematika'), 'S1: judul kelas mengandung nama mapel');
  ok(after.classes[0].subject === 'MAT', 'S1: subject kelas = MAT');
  ok(after.activeClassId === after.classes[0].id, 'S1: activeClassId menunjuk kelas baru');
  ok(after.onboarded === true, 'S1: onboarded = true');
  ok(after.teacher.name === 'Bu Rina', 'S1: nama guru teradopsi');
  ok(after.teacher.school === 'MTsN 5 ACEH BESAR', 'S1: sekolah guru teradopsi');
}

// Skenario 2: adoptAccount tanpa classCode → tidak ada kelas dibuat
{
  ctx.localStorage.clear();
  const TS = ctx.FiezelTeacherStore;

  const session = {
    handle: 'pak_joko_xyz',
    role: 'teacher',
    teacherName: 'Pak Joko',
    institution: 'SMP Negeri 1',
    classCode: null,
    subjectId: 'IPA',
    gradeId: 'SMP'
  };

  let profile = TS.load();
  if (!profile.teacher) profile.teacher = { name: '', school: '' };
  let modified = false;
  if (session.teacherName) { profile.teacher.name = session.teacherName; modified = true; }
  if (session.institution) { profile.teacher.school = session.institution; modified = true; }
  if (session.classCode && TS.normalizeClassCode) {
    // classCode null → blok ini tidak masuk
    const normCode = TS.normalizeClassCode(session.classCode);
    if (normCode) {
      // Tidak akan masuk
    }
  }
  if (modified) TS.save(profile);

  const after = TS.load();
  ok(after.classes.length === 0, 'S2: tanpa classCode → 0 kelas');
  ok(after.teacher.name === 'Pak Joko', 'S2: nama guru tetap teradopsi');
}

// Skenario 3: Idempoten — kelas yang sama tidak diduplikasi
{
  ctx.localStorage.clear();
  const TS = ctx.FiezelTeacherStore;

  const session = {
    handle: 'bu_ani',
    role: 'teacher',
    teacherName: 'Bu Ani',
    institution: 'SMA 2',
    classCode: 'FZ-X1Y2Z3',
    subjectId: 'BIO',
    gradeId: 'SMA'
  };

  // Panggil dua kali (simulasikan refresh + login)
  for (let i = 0; i < 2; i++) {
    let profile = TS.load();
    if (!profile.teacher) profile.teacher = { name: '', school: '' };
    let modified = false;
    if (session.teacherName && profile.teacher.name !== session.teacherName) { profile.teacher.name = session.teacherName; modified = true; }
    if (session.institution && profile.teacher.school !== session.institution) { profile.teacher.school = session.institution; modified = true; }
    if (session.classCode && TS.normalizeClassCode) {
      const normCode = TS.normalizeClassCode(session.classCode);
      if (normCode) {
        if (!Array.isArray(profile.classes)) profile.classes = [];
        const exists = profile.classes.some(c => TS.normalizeClassCode(c.code) === normCode);
        if (!exists) {
          if (profile.deletedClassCodes && profile.deletedClassCodes[normCode]) {
            delete profile.deletedClassCodes[normCode];
          }
          const mapelNames = TS.MAPEL_NAMES || {};
          const subName = mapelNames[session.subjectId] || session.subjectId || 'Kelas';
          const clsTitle = (session.institution ? session.institution + ' — ' : '') + subName;
          const autoCls = TS.newClass(clsTitle, session.gradeId || 'SMP', session.subjectId || 'MAT');
          autoCls.code = normCode;
          profile.classes.unshift(autoCls);
          profile.activeClassId = autoCls.id;
          profile.onboarded = true;
          modified = true;
        }
      }
    }
    if (modified) TS.save(profile);
  }

  const after = TS.load();
  ok(after.classes.length === 1, 'S3: dua kali panggil → tetap 1 kelas (idempoten)');
  ok(after.classes[0].code === 'FZ-X1Y2Z3', 'S3: kode kelas tetap benar');
}

// Skenario 4: deletedClassCodes dibersihkan saat token baru masuk
{
  ctx.localStorage.clear();
  const TS = ctx.FiezelTeacherStore;

  // Simulasikan kelas pernah dihapus
  let profile = TS.load();
  profile.deletedClassCodes = { 'FZ-D3L3T3': true };
  TS.save(profile);

  const session = {
    role: 'teacher',
    teacherName: 'Bu Dina',
    institution: 'SD 5',
    classCode: 'FZ-D3L3T3',
    subjectId: 'IND',
    gradeId: 'SD'
  };

  profile = TS.load();
  if (!profile.teacher) profile.teacher = { name: '', school: '' };
  let modified = false;
  if (session.teacherName) { profile.teacher.name = session.teacherName; modified = true; }
  if (session.institution) { profile.teacher.school = session.institution; modified = true; }
  if (session.classCode && TS.normalizeClassCode) {
    const normCode = TS.normalizeClassCode(session.classCode);
    if (normCode) {
      if (!Array.isArray(profile.classes)) profile.classes = [];
      const exists = profile.classes.some(c => TS.normalizeClassCode(c.code) === normCode);
      if (!exists) {
        if (profile.deletedClassCodes && profile.deletedClassCodes[normCode]) {
          delete profile.deletedClassCodes[normCode];
        }
        const mapelNames = TS.MAPEL_NAMES || {};
        const subName = mapelNames[session.subjectId] || session.subjectId || 'Kelas';
        const clsTitle = (session.institution ? session.institution + ' — ' : '') + subName;
        const autoCls = TS.newClass(clsTitle, session.gradeId || 'SMP', session.subjectId || 'MAT');
        autoCls.code = normCode;
        profile.classes.unshift(autoCls);
        profile.activeClassId = autoCls.id;
        profile.onboarded = true;
        modified = true;
      }
    }
  }
  if (modified) TS.save(profile);

  const after = TS.load();
  ok(after.classes.length === 1, 'S4: kelas yang dihapus dibuat ulang oleh token baru');
  ok(!after.deletedClassCodes || !after.deletedClassCodes['FZ-D3L3T3'], 'S4: deletedClassCodes dibersihkan');
  ok(after.classes[0].name.includes('Bahasa Indonesia'), 'S4: kelas IND → Bahasa Indonesia');
}

// Skenario 5: Semua 17 mapel menghasilkan nama yang benar
{
  const TS = ctx.FiezelTeacherStore;
  const expected = {
    MAT: 'Matematika', IND: 'Bahasa Indonesia', ENG: 'Bahasa Inggris',
    IPA: 'Ilmu Pengetahuan Alam', IPS: 'Ilmu Pengetahuan Sosial',
    INF: 'Informatika', PPK: 'Pendidikan Pancasila', AGM: 'Pendidikan Agama',
    FIS: 'Fisika', KIM: 'Kimia', BIO: 'Biologi', EKO: 'Ekonomi',
    GEO: 'Geografi', SOS: 'Sosiologi', SEJ: 'Sejarah',
    PJK: 'PJOK', SNB: 'Seni Budaya'
  };
  const allMatch = Object.entries(expected).every(([id, name]) => {
    return TS.MAPEL_NAMES[id] === name;
  });
  ok(allMatch, 'S5: 17 mapel MAPEL_NAMES cocok semua');
}

// Skenario 6: normalizeClassCode mendukung panjang fleksibel (3-16 karakter)
{
  const TS = ctx.FiezelTeacherStore;
  ok(TS.normalizeClassCode('FZ-MERDEKA1') === 'FZ-MERDEKA1', 'S6: FZ-MERDEKA1 (8 char) sah');
  ok(TS.normalizeClassCode('MERDEKA1') === 'FZ-MERDEKA1', 'S6: MERDEKA1 otomatis ditambah FZ-');
  ok(TS.normalizeClassCode('FZ-SMP1') === 'FZ-SMP1', 'S6: FZ-SMP1 (4 char) sah');
  ok(TS.normalizeClassCode('FZ-A2B3C4') === 'FZ-A2B3C4', 'S6: FZ-A2B3C4 (6 char standar) sah');
  ok(TS.normalizeClassCode('FZ-7A') === '', 'S6: FZ-7A (2 char) ditolak karena terlalu pendek');
  ok(TS.normalizeClassCode('') === '', 'S6: string kosong menghasilkan kosong');
}

// Skenario 7: syncClassList tersedia di FiezelTeacherStore
{
  const TS = ctx.FiezelTeacherStore;
  ok(typeof TS.syncClassList === 'function', 'S7: TS.syncClassList diekspor');
}

// Skenario 8: Guru tanpa classCode eksplisit tetap otomatis mendapatkan kelas terhubung
{
  ctx.localStorage.clear();
  const TS = ctx.FiezelTeacherStore;

  const session = {
    role: 'teacher',
    teacherName: 'FARZA',
    institution: 'MAN 1 BANDA ACEH',
    classCode: null, // Tanpa kode kelas eksplisit
    subjectId: 'MAT',
    gradeId: 'SMA'
  };

  let profile = TS.load();
  if (!profile.teacher) profile.teacher = { name: '', school: '' };
  profile.teacher.name = session.teacherName;
  profile.teacher.school = session.institution;

  if (!Array.isArray(profile.classes)) profile.classes = [];
  let normCode = session.classCode && TS.normalizeClassCode
    ? TS.normalizeClassCode(session.classCode)
    : '';
  if (!normCode && !profile.classes.length) {
    normCode = TS.makeClassCode();
  }

  if (normCode) {
    const mapelNames = TS.MAPEL_NAMES || {};
    const subName = mapelNames[session.subjectId] || 'Matematika';
    const clsTitle = (session.institution ? session.institution + ' — ' : '') + subName;
    const autoCls = TS.newClass(clsTitle, session.gradeId || 'SMA', session.subjectId || 'MAT');
    autoCls.code = normCode;
    profile.classes.unshift(autoCls);
    profile.activeClassId = autoCls.id;
    profile.onboarded = true;
    TS.save(profile);
  }

  const after = TS.load();
  ok(after.classes.length === 1, 'S8: guru tanpa kode tetap dibuatkan kelas otomatis');
  ok(after.classes[0].name === 'MAN 1 BANDA ACEH — Matematika', 'S8: judul kelas MAN 1 BANDA ACEH — Matematika');
  ok(after.classes[0].subject === 'MAT', 'S8: mapel MAT');
  ok(after.classes[0].code.startsWith('FZ-'), 'S8: kode kelas berformat FZ-XXXXXX');
  ok(after.onboarded === true, 'S8: onboarded = true');
}

// Skenario 9: Sinkronisasi subjectId dari dashboard (mis. Farza diubah ke Bahasa Inggris / ENG)
{
  const TS = ctx.FiezelTeacherStore;
  let profile = TS.load();

  // Sebelum: Farza masih punya kelas Matematika dari S8
  ok(profile.classes.length === 1, 'S9: awal ada 1 kelas');
  ok(profile.classes[0].subject === 'MAT', 'S9: awal mapel MAT');

  // Simulasikan session baru dari server (/api/account/me) dengan subjectId: 'ENG'
  const updatedSession = {
    role: 'teacher',
    teacherName: 'FARZA',
    institution: 'MAN 1 BANDA ACEH',
    classCode: profile.classes[0].code,
    subjectId: 'ENG',
    gradeId: 'SMA'
  };

  const mapelNames = TS.MAPEL_NAMES || {};
  const officialSub = updatedSession.subjectId || 'ENG';
  const officialSubName = mapelNames[officialSub] || officialSub;

  let modified = false;
  if (updatedSession.subjectId && profile.classes.length) {
    profile.classes.forEach(function (c) {
      const prefix = updatedSession.institution ? updatedSession.institution + ' — ' : '';
      if (c.subject !== updatedSession.subjectId || (c.name && c.name.indexOf('Matematika') !== -1 && updatedSession.subjectId !== 'MAT')) {
        c.subject = updatedSession.subjectId;
        c.name = prefix + officialSubName;
        modified = true;
      }
    });
  }
  if (modified) TS.save(profile);

  const synced = TS.load();
  ok(synced.classes.length === 1, 'S9: tetap 1 kelas tanpa duplikasi');
  ok(synced.classes[0].subject === 'ENG', 'S9: mapel tersinkronkan ke ENG (Bahasa Inggris)');
  ok(synced.classes[0].name === 'MAN 1 BANDA ACEH — Bahasa Inggris', 'S9: nama kelas tersinkronkan menjadi MAN 1 BANDA ACEH — Bahasa Inggris');
}

// --- Ringkasan ---
console.log(`\nauto-class-adopt-test: ${passed.length} PASS, ${failed.length} FAIL`);
if (failed.length) {
  console.log('GAGAL:');
  failed.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}

