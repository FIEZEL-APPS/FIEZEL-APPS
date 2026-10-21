#!/usr/bin/env node
/**
 * GERBANG PENDAFTARAN SEKALI (tests/student-single-registration-test.js) — m025-262.
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * OWNER: "aktivasi murid ribet sekali — bukan sekali dua kali murid harus daftar,
 * melainkan beberapa kali: onboarding, Puter, Pengaturan profil, lalu Online & Teman.
 * Aku mau prosesnya SEKALI SAJA, hanya di onboarding, dan ID online-nya pakai yang dari
 * daftar pertama kali. Hilangkan semua centang persetujuan."
 *
 * Empat permukaan pendaftaran itu hilang di commit ini. Yang menahannya tetap hilang
 * adalah gerbang ini — bukan komentar di app.js, karena permukaan pendaftaran kelima
 * bisa mendarat kapan saja lewat satu formulir baru yang terlihat tidak berbahaya.
 *
 * YANG DIJAGA:
 *   R1  ID online lahir dari nama onboarding: socialHandleCandidates() murni dan SELALU
 *       melahirkan setidaknya satu handle yang lolos validateHandle() milik modul sosial
 *       (termasuk untuk nama kosong, nama satu huruf, angka, dan nama yang diblokir).
 *   R2  Persetujuan DITANAMKAN: profileCreate dipanggil dengan friendsVisible:true dan
 *       leagueOptIn:true, dan tidak ada satu pun kotak centang sosial tersisa di app.js.
 *   R3  Nol gerbang kedua: boot tidak lagi memasang gerbang akun Puter.
 *   R4  Satu pintu untuk murid lama: Pengaturan punya tombol pendaftaran sekali ketuk.
 *   R5  Pendaftaran idempoten: profil yang sudah ada dipakai apa adanya (profileMe dulu).
 *
 * Nol jaringan, nol DOM: fungsi murni di-extract dari app.js dan dijalankan langsung.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');
const checks = [];
let failed = false;
function check(name, ok, detail) {
  checks.push({ name, pass: !!ok, detail: detail || '' });
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ' — ' + (detail || '')}`);
}

/* ---- R1: nama onboarding -> handle yang sah -------------------------------------- */
const start = app.indexOf('function socialHandleCandidates');
const end = app.indexOf('window.__fzSocialHandleCandidates');
check('socialHandleCandidates() bisa di-extract dari app.js', start > 0 && end > start);
const candidates = new Function(app.slice(start, end) + ';return socialHandleCandidates')();

const root = {};
new Function('self', fs.readFileSync(path.join(__fzRoot, 'features/social/fiezel-social.js'), 'utf8'))(root);
const core = root.FiezelSocial;
check('modul sosial memuat validateHandle', typeof core.validateHandle === 'function');

const NAMES = ['Budi', 'A', '', '12345', 'Siti Nurhaliza', 'özgür', 'fiezel official', 'murid 08123456789', '   ', 'X_'];
const noValid = NAMES.filter((n) => !candidates(n, 7).some((h) => core.validateHandle(h).ok));
check(
  'R1 setiap nama melahirkan minimal satu handle yang lolos aturan server',
  noValid.length === 0,
  'nama tanpa kandidat sah: ' + JSON.stringify(noValid)
);
check(
  'R1 kandidat bersifat murni (dua panggilan dengan seed sama = hasil sama)',
  JSON.stringify(candidates('Budi', 3)) === JSON.stringify(candidates('Budi', 3))
);
check(
  'R1 nama sama menghasilkan handle pertama yang sama — ID online tidak berpindah',
  candidates('Budi', 1)[0] === candidates('budi', 999)[0]
);

/* ---- R2: persetujuan ditanamkan, kotak centang hilang ---------------------------- */
const regBlock = app.slice(app.indexOf('function registerStudentOnce'), app.indexOf('window.registerStudentOnce'));
check(
  'R2 profileCreate memakai friendsVisible:true dan leagueOptIn:true',
  /profileCreate\(\{handle:[^}]*friendsVisible:true[^}]*leagueOptIn:true/.test(regBlock),
  'sudah mendaftar = wajib tampil di papan dengan nama yang dipilih sendiri'
);
check(
  'R2 nol kotak centang persetujuan sosial di app.js',
  !/socialFriendsVisible|socialLeagueOptIn|social\.consent-/.test(app)
);
check(
  'R2 nol kartu disclaimer profil di app.js',
  !/social\.privacy-heading|social\.privacy-body/.test(app)
);
const copyId = fs.readFileSync(path.join(__fzRoot, 'features/i18n/copy-id-feat-c.js'), 'utf8');
check(
  'R2 naskah persetujuan ikut dihapus dari copy-map Indonesia',
  !/consent-progress|consent-league|privacy-heading/.test(copyId)
);

/* ---- R3: nol gerbang kedua ------------------------------------------------------- */
check(
  'R3 boot tidak memanggil armPuterAuthGate() lagi',
  (app.match(/armPuterAuthGate\(\)/g) || []).length === 1 &&
    /function armPuterAuthGate\(\)/.test(app),
  'satu-satunya kemunculan yang boleh tersisa adalah definisinya'
);
check(
  'R3 perkenalan yang selesai langsung memicu pendaftaran',
  /maybeRegisterStudentOnce\(\)/.test(app.slice(app.indexOf('function afterOnboardingExit'), app.indexOf('function startWelcomeExperience')))
);

/* ---- R4: satu pintu untuk murid lama --------------------------------------------- */
check(
  'R4 Pengaturan memuat kartu pendaftaran sekali ketuk',
  /\$\{studentRegistrationMarkup\(\)\}/.test(app) &&
    /function studentRegistrationMarkup\(\)/.test(app) &&
    /registerStudentFromSettings\(\)/.test(app)
);

/* ---- R5: idempoten ---------------------------------------------------------------- */
check(
  'R5 pendaftaran memeriksa profil yang sudah ada lebih dulu',
  regBlock.indexOf('profileMe()') > -1 && regBlock.indexOf('profileMe()') < regBlock.indexOf('profileCreate('),
  'mendaftar dua kali adalah persis keluhan owner'
);
check(
  'R5 panggilan yang tumpang tindih berbagi satu promise',
  /if\(studentRegistrationPromise\)return studentRegistrationPromise/.test(regBlock)
);

const report = {
  schema: 'fiezel-student-single-registration-v1',
  generatedAt: new Date().toISOString(),
  pass: !failed,
  checks
};
fs.writeFileSync(path.join(__fzRoot, 'reports/student-single-registration-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\nFIEZEL m025-262 pendaftaran murid sekali: ${failed ? 'FAIL' : 'PASS'}`);
if (failed) process.exitCode = 1;
