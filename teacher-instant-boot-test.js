/**
 * teacher-instant-boot-test.js — Gerbang uji resolusi instan guru saat splash & anti-flash dashboard murid.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failures++;
    console.error('FAIL - ' + name + '\n  ' + (e && e.message));
  }
}

const appSrc = fs.readFileSync('./app.js', 'utf8');
const teacherShellSrc = fs.readFileSync('./features/teacher/fiezel-teacher-shell.js', 'utf8');

test('1. isVerifiedTeacher memeriksa cache lokal fz_teacher_mode & preferences.role secara sinkron', () => {
  assert.ok(/function\s+isVerifiedTeacher\s*\(\)\s*\{[\s\S]*?localStorage\.getItem\('fz_teacher_mode'\)\s*===\s*'1'/.test(appSrc),
    'isVerifiedTeacher harus memeriksa fz_teacher_mode di localStorage');
  assert.ok(/function\s+isVerifiedTeacher\s*\(\)\s*\{[\s\S]*?state\.preferences\?\.role\s*===\s*'guru'/.test(appSrc),
    'isVerifiedTeacher harus memeriksa state.preferences.role === guru');
});

test('2. openApp mengunci state.view = tutor SEBELUM render() dipanggil', () => {
  const openAppIdx = appSrc.indexOf('function openApp(){');
  assert.ok(openAppIdx > 0, 'openApp harus ada di app.js');
  const openAppBody = appSrc.slice(openAppIdx, openAppIdx + 600);
  const renderIdx = openAppBody.indexOf('render();');
  const tutorSetIdx = openAppBody.indexOf("state.view='tutor'");
  assert.ok(renderIdx > 0, 'render() harus dipanggil di openApp()');
  assert.ok(tutorSetIdx > 0, "state.view = 'tutor' harus ada di openApp()");
  assert.ok(tutorSetIdx < renderIdx,
    "state.view = 'tutor' WAJIB terjadi SEBELUM render() agar dashboard murid tidak sempat berkedip");
  assert.ok(openAppBody.includes("document.body?.classList?.add?.('fz-teacher-mode')"),
    'openApp harus menyalakan kelas fz-teacher-mode sebelum render');
});

test('3. startRoleResolution dijalankan paralel selama splash screen', () => {
  assert.ok(/function\s+startRoleResolution\s*\(\)/.test(appSrc),
    'startRoleResolution harus didefinisikan');
  assert.ok(/startRoleResolution\(\);\s*startWelcomeExperience\(\)/.test(appSrc),
    'startRoleResolution harus dipanggil sebelum startWelcomeExperience di load()');
  assert.ok(/function\s+startWelcomeExperience\s*\(\)\s*\{\s*startRoleResolution\(\)/.test(appSrc),
    'startWelcomeExperience harus memastikan startRoleResolution aktif');
});

test('4. checkUrlTeacherToken mengaktifkan token dan menyimpan cache fz_teacher_mode', () => {
  const checkTokenIdx = appSrc.indexOf('async function checkUrlTeacherToken(){');
  assert.ok(checkTokenIdx > 0, 'checkUrlTeacherToken harus ada di app.js');
  const checkTokenBody = appSrc.slice(checkTokenIdx, checkTokenIdx + 2000);
  assert.ok(checkTokenBody.includes("localStorage.setItem('fz_teacher_mode','1')"),
    'checkUrlTeacherToken harus menyimpan bendera fz_teacher_mode');
  assert.ok(checkTokenBody.includes("state.view='tutor'"),
    'checkUrlTeacherToken harus mengarahkan view ke tutor');
});

test('5. Transisi mulus di ekor splash: guru langsung masuk ke Ruang Guru tanpa onboarding/notifikasi murid', () => {
  const welcomeIdx = appSrc.indexOf('function startWelcomeExperience(){');
  assert.ok(welcomeIdx > 0, 'startWelcomeExperience harus ada di app.js');
  const welcomeBody = appSrc.slice(welcomeIdx, welcomeIdx + 1200);
  assert.ok(welcomeBody.includes("if(isVerifiedTeacher()){"),
    'splash onClose callback harus memeriksa isVerifiedTeacher');
  assert.ok(/state\.view='tutor';\s*dismissBootSplash\(\);\s*return openApp\(\);/.test(welcomeBody),
    'guru terverifikasi harus langsung memanggil openApp() menuju tutor dan membuang splash');
});

test('6. Logout guru membersihkan fz_teacher_mode dan mengembalikan ke mode murid', () => {
  assert.ok(teacherShellSrc.includes("localStorage.removeItem('fz_teacher_mode')"),
    'logout di fiezel-teacher-shell.js harus menghapus fz_teacher_mode');
  assert.ok(teacherShellSrc.includes("root.state.preferences.role = 'murid'"),
    'logout di fiezel-teacher-shell.js harus mereset role ke murid');
  assert.ok(teacherShellSrc.includes("root.state.view = 'home'"),
    'logout di fiezel-teacher-shell.js harus mengembalikan view ke home');
  assert.ok(appSrc.includes("localStorage.removeItem('fz_teacher_mode')"),
    'fiezelAccountLogout di app.js harus menghapus fz_teacher_mode');
});

if (failures > 0) {
  console.error(`\nFAILED: ${failures} assertions failed.`);
  process.exit(1);
} else {
  console.log('\nALL 6 CHECKS PASSED · teacher-instant-boot-test.js');
}
