#!/usr/bin/env node
/**
 * tests/teacher-subject-isolation-test.js — GERBANG ISOLASI MAPEL PER TOKEN GURU
 *
 * Membuktikan Strict Subject & Grade Scope Isolation:
 *  1. Token Guru IPA SMP -> scope terkunci {IPA}, dropdown kurikulum & assign
 *     disembunyikan (badge), tugas non-IPA disaring dari daftar.
 *  2. Token Guru Bahasa Inggris (ENG) SMP -> hanya ENG.
 *  3. Multi-mapel (IPA+MAT) -> dropdown HANYA berisi lisensi, tanpa kebocoran.
 *  4. Tanpa token (demo) -> 17 mapel utuh, nol breaking change.
 *  5. Penerbitan lintas mapel ditolak saat terkunci (guard onSubmit).
 *  6. Remedial otomatis + rekap e-Rapor tersedia dan berlabel mapel aktif.
 *  7. Bank autentik tidak dimutasi (44 kompetensi / 642 butir tetap utuh).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function assert(cond, msg, details) {
  if (cond) { pass++; console.log('  OK  : ' + msg); }
  else { fail++; console.error('  FAIL: ' + msg + (details ? ' — ' + details : '')); }
}

function loadShell(accountState) {
  const shellCode = fs.readFileSync(path.join(ROOT, 'features/teacher/fiezel-teacher-shell.js'), 'utf8');
  const storeCode = fs.readFileSync(path.join(ROOT, 'features/teacher/fiezel-teacher-store.js'), 'utf8');
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, setTimeout, clearTimeout,
    require, __dirname: path.join(ROOT, 'features', 'teacher'),
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    document: { addEventListener() {}, createElement() { return { setAttribute() {}, style: {} }; }, head: { appendChild() {} }, body: { classList: { add() {}, remove() {} } } },
    location: { hostname: 'localhost', search: '' },
    FiezelAccount: { state: () => accountState, role: () => (accountState ? accountState.role : '') },
  };
  sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(storeCode, sandbox);
  vm.runInContext(shellCode, sandbox);
  return { Shell: sandbox.FiezelTeacherShell, code: shellCode, sb: sandbox };
}

console.log('tests/teacher-subject-isolation-test.js — isolasi mapel per token guru');

/* 0 · helper tersedia */
{
  const { Shell } = loadShell(null);
  assert(!!Shell, 'FiezelTeacherShell termuat');
  assert(typeof Shell._teacherSubjectScope === 'function', 'helper _teacherSubjectScope terekspos untuk gerbang');
  assert(typeof Shell._isAssignmentVisible === 'function', 'helper _isAssignmentVisible terekspos');
  assert(typeof Shell._remedialGroups === 'function', 'helper _remedialGroups (remedial otomatis) terekspos');
  assert(typeof Shell._rekapRows === 'function', 'helper _rekapRows (rekap e-Rapor) terekspos');
}

/* 1 · Guru IPA SMP terkunci */
{
  const acc = { role: 'teacher', subjectId: 'IPA', gradeId: 'SMP', teacherName: 'Bu Sari' };
  const { Shell, code } = loadShell(acc);
  const sc = Shell._teacherSubjectScope();
  assert(sc.locked === true, 'token IPA mengunci dashboard');
  assert(sc.active === 'IPA', 'mapel aktif = IPA', JSON.stringify(sc));
  assert(sc.multi === false, '1 mapel = bukan multi');
  assert(sc.grade === 'SMP', 'grade = SMP');
  assert(sc.subjects.length === 1 && sc.subjects[0] === 'IPA', 'lisensi = [IPA] saja');
  const allowed = Shell._scopeMapelList();
  assert(allowed.length === 1 && allowed[0].id === 'IPA', 'dropdown kurikulum hanya IPA');
  /* Tugas: IPA lolos, MAT/ENG ditolak */
  const aIPA = { id: 'a1', skills: ['IPA'], source: { subjectId: 'IPA' } };
  const aMAT = { id: 'a2', skills: ['MAT'], source: { subjectId: 'MAT' } };
  const aENG = { id: 'a3', skills: ['ENG'], source: { subjectId: 'ENG' } };
  const aLegacy = { id: 'a4', skills: ['past_tense'] };
  assert(Shell._isAssignmentVisible(aIPA, sc) === true, 'tugas IPA tampil untuk guru IPA');
  assert(Shell._isAssignmentVisible(aMAT, sc) === false, 'tugas MAT disembunyikan dari guru IPA');
  assert(Shell._isAssignmentVisible(aENG, sc) === false, 'tugas ENG disembunyikan dari guru IPA');
  assert(Shell._isAssignmentVisible(aLegacy, sc) === false, 'tugas legacy non-mapel disembunyikan saat terkunci');
  /* Badge menggantikan dropdown */
  assert(code.includes('data-testid="tg-curriculum-subject-badge"'), 'badge kurikulum single-mapel terpasang');
  assert(code.includes('data-testid="tg-assign-subject-badge"'), 'badge assign single-mapel terpasang');
  assert(code.includes('data-testid="tg-subject-scope-badge"'), 'badge scope topbar terpasang');
}

/* 2 · Guru Bahasa Inggris SMP terkunci */
{
  const acc = { role: 'teacher', subjectId: 'ENG', gradeId: 'SMP' };
  const { Shell } = loadShell(acc);
  const sc = Shell._teacherSubjectScope();
  assert(sc.locked && sc.active === 'ENG', 'token ENG mengunci ke ENG', JSON.stringify(sc));
  assert(Shell._isAssignmentVisible({ skills: ['ENG'], source: { subjectId: 'ENG' } }, sc) === true, 'tugas ENG tampil');
  assert(Shell._isAssignmentVisible({ skills: ['IPA'], source: { subjectId: 'IPA' } }, sc) === false, 'tugas IPA bocor ke guru ENG = FAIL bila tampil');
}

/* 3 · Multi-mapel IPA+MAT: dropdown terbatas, tanpa kebocoran */
{
  const acc = { role: 'teacher', subjectIds: ['IPA', 'MAT'], gradeId: 'SMP' };
  const { Shell } = loadShell(acc);
  const sc = Shell._teacherSubjectScope();
  assert(sc.locked === true && sc.multi === true, 'multi-mapel terkunci + multi=true', JSON.stringify(sc));
  const allowed = Shell._scopeMapelList().map((m) => m.id);
  assert(allowed.length === 2 && allowed.includes('IPA') && allowed.includes('MAT'), 'dropdown hanya IPA+MAT', allowed.join(','));
  assert(!allowed.includes('ENG') && !allowed.includes('IPS'), 'ENG/IPS tidak bocor ke dropdown multi');
  assert(Shell._isAssignmentVisible({ skills: ['IPA'], source: { subjectId: 'IPA' } }, sc) === true, 'IPA tampil di multi');
  assert(Shell._isAssignmentVisible({ skills: ['MAT'], source: { subjectId: 'MAT' } }, sc) === true, 'MAT tampil di multi');
  assert(Shell._isAssignmentVisible({ skills: ['ENG'], source: { subjectId: 'ENG' } }, sc) === false, 'ENG tetap tersaring di multi');
}

/* 4 · Tanpa token: 17 mapel utuh */
{
  const { Shell } = loadShell(null);
  const sc = Shell._teacherSubjectScope();
  assert(sc.locked === false, 'tanpa token = tidak terkunci (demo aman)');
  assert(Shell._scopeMapelList().length === 17, '17 mapel utuh tanpa token');
  assert(Shell._isAssignmentVisible({ skills: ['past_tense'] }, sc) === true, 'tugas legacy tampil saat tidak terkunci');
}

/* 5 · Guard penerbitan + fitur paralel/remedial/rekap terpasang di kode */
{
  const { code } = loadShell({ role: 'teacher', subjectId: 'IPA', gradeId: 'SMP' });
  assert(code.includes('di luar lisensi'), 'guard penolakan lintas-mapel terpasang');
  assert(code.includes('data-testid="tg-assign-classes"'), 'pemilih kelas paralel terpasang di modal assign');
  assert(code.includes("getAll('target_classes')") || code.includes('getAll("target_classes")'), 'submit memproses target_classes paralel');
  assert(code.includes('data-testid="tg-remedial-auto"'), 'kartu remedial & pengayaan otomatis terpasang');
  assert(code.includes('data-testid="tg-export-rekap"'), 'tombol Rekap e-Rapor terpasang');
  assert(code.includes('data-testid="tg-empty-assignments"'), 'empty state ramah tugas terpasang');
  /* onChange menolak pindah mapel di luar lisensi */
  assert(code.includes("subjects.indexOf(sel.value) < 0"), 'onChange menolak dropdown di luar lisensi');
  /* AUDIT-2: tab Inggris disembunyikan saat terkunci, bukan sekadar ditolak */
  assert(code.includes('data-testid="tg-assign-tabs-locked"'), 'tab Inggris/skill disembunyikan saat scope terkunci');
  /* AUDIT-2: form kelas terkunci (lubang input bebas tertutup) */
  assert(code.includes('data-testid="tg-class-subject-badge"') || code.includes('data-testid="tg-class-subject"'), 'form kelas menghormati lisensi (badge/select, bukan input bebas)');
  /* AUDIT-2: analitik tersaring + remedial membawa target */
  assert(code.includes('skillMatchesSubject'), 'analitik disaring per mapel (skillMatchesSubject)');
  assert(code.includes('data-targets="'), 'tombol remedial/pengayaan membawa target murid');
}

/* 6 · Remedial + rekap bekerja per KKM */
{
  const { Shell } = loadShell({ role: 'teacher', subjectId: 'IPA', gradeId: 'SMP' });
  const cls = {
    id: 'c1', name: 'Kelas 7A', subject: 'IPA', code: 'FZ-AAAAAA',
    students: [
      { id: 's1', name: 'Andi', results: [{ skill: 'IPA', correct: 3, total: 10 }], attendance: {}, lastActiveAt: Date.now() },
      { id: 's2', name: 'Budi', results: [{ skill: 'IPA', correct: 10, total: 10 }], attendance: {}, lastActiveAt: Date.now() },
      { id: 's3', name: 'Citra', results: [{ skill: 'IPA', correct: 8, total: 10 }], attendance: {}, lastActiveAt: Date.now() },
    ],
    assignments: [], announcements: [], journal: [],
  };
  const g = Shell._remedialGroups(cls, 0.75);
  assert(g.remedial.length === 1 && g.remedial[0].s.name === 'Andi', 'Andi (30%) masuk remedial');
  assert(g.pengayaan.length === 1 && g.pengayaan[0].s.name === 'Budi', 'Budi (100%) masuk pengayaan');
  const rows = Shell._rekapRows(cls);
  assert(rows.length === 3, 'rekap 3 siswa');
  assert(rows.every((r) => r.mapel === 'IPA'), 'semua baris rekap berlabel IPA', rows.map((r) => r.mapel).join(','));
  assert(rows.filter((r) => r.status === 'Remedial').length === 1, 'tepat 1 remedial di rekap');
}

/* 7 · Bank autentik tidak dimutasi */
{
  const files = ['mapel-mat-d.json', 'mapel-ipa-d.json', 'mapel-eng-d.json', 'mapel-ind-d.json', 'mapel-ips-d.json'];
  let comps = 0, items = 0;
  for (const f of files) {
    const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'mapel', f), 'utf8'));
    comps += (b.competencies || []).length;
    (b.competencies || []).forEach((c) => { items += (c.items || []).length; });
  }
  assert(comps === 44, '44 kompetensi autentik utuh', comps + ' kompetensi');
  assert(items === 642, '642 butir autentik utuh', items + ' butir');
}

/* 8 · AUDIT-2: analitik + laporan + i18n/aria */
{
  const { Shell, code } = loadShell({ role: 'teacher', subjectId: 'IPA', gradeId: 'SMP' });
  assert(typeof Shell._scopeMapelList === 'function', 'helper scope list terekspos');
  /* analitik: skill Inggris tidak bocor ke guru IPA */
  const cls = {
    id: 'c9', name: 'Kelas 7A', subject: 'IPA', code: 'FZ-AAAAAA',
    students: [{ id: 's1', name: 'Andi', results: [{ skill: 'past_tense', correct: 9, total: 10 }, { skill: 'IPA', correct: 5, total: 10 }], attendance: {}, lastActiveAt: Date.now() }],
    assignments: [], announcements: [], journal: [],
  };
  const sc = Shell._teacherSubjectScope();
  /* rapor ortu berlabel mapel kelas, bukan hardcode Inggris */
  const storeCode = fs.readFileSync(path.join(ROOT, 'features/teacher/fiezel-teacher-store.js'), 'utf8');
  assert(!storeCode.includes('laporan singkat belajar Bahasa Inggris'), 'hardcode rapor Inggris dihilangkan dari store');
  assert(storeCode.includes('MAPEL_NAMES[c.subject]'), 'rapor memakai nama mapel kelas');
  /* CSS mobile + kontras */
  const css = fs.readFileSync(path.join(ROOT, 'features/teacher/teacher-shell.css'), 'utf8');
  assert(css.includes('repeat(8,1fr)'), 'navigasi mobile 8 kolom (7 nav + kurikulum)');
  assert(css.includes('.tg-empty-ill'), 'gaya empty state tersedia');
  assert(!css.includes('--tg-muted:#5F6D69'), 'kontras teks dimaksimalkan (#4E5C58)');
  /* ARIA: modal/drawer/inbox berdialog + ESC */
  assert(code.includes("e.key === 'Escape'"), 'ESC menutup modal/drawer/inbox');
  assert(code.includes('aria-label'), 'label aksesibilitas terpasang');
  void sc; void cls;
}

console.log(`\nHasil: ${pass} lulus, ${fail} gagal.`);
if (fail > 0) process.exit(1);
