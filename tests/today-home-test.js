#!/usr/bin/env node
/**
 * AUDIT-2026-09-21 — GERBANG HOME "HARI INI" (tests/today-home-test.js).
 *
 * Komentar m025-246 di app.js mengutip berkas ini ("today-home-test.js menghitungnya dan
 * merah kalau ada dua") tetapi berkasnya tidak pernah ditulis — aturan yang paling sering
 * dikutip di layar ini adalah aturan yang tidak dijaga siapa pun. Gerbang ini menutupnya.
 *
 * Yang dijaga (semuanya dari temuan audit reports AUDIT-UIUX-DASHBOARD-MURID-2026-09-21):
 *   T1 satu sumber kebenaran penyebut Ritme Harian = todaySessionShape().soal, bukan literal
 *   T2 learnerFlowHomeMarkup() di BAWAH kartu HARI INI (CTA di atas lipatan)
 *   T3 heroSpeech membaca `selesai` (apresiasi saat tuntas, bukan ajakan)
 *   T4 tepat SATU pawFaceMarkup() di todayHomeMarkup() (satu Pau di Home)
 *   Aturan 1 m025-246: tepat SATU .primary di layar (nol saat tuntas = disengaja)
 *   T6 kokpit Pau ber-semantik tombol (role+tabindex+keydown)
 *   T5 keping LEVEL + REVIEW di today-head
 *   T9 balon tidak menyapa nama (kartu yang menyapa); sapaan memakai {menit}
 *
 * Konvensi rumah: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
const APP = read('app.js');

let failures = 0;
function check(ok, name, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

const at = APP.indexOf('function todayHomeMarkup()');
check(at !== -1, 'T0 todayHomeMarkup() ada');
const end = at === -1 ? -1 : APP.indexOf('\nfunction ', at + 10);
const body = at === -1 ? '' : APP.slice(at, end);

/* Aturan 1 m025-246: SATU tombol primer. */
{
  const primaries = (body.match(/class="primary/g) || []).length;
  check(primaries === 1, 'aturan-1 tepat satu .primary di todayHomeMarkup', 'ditemukan ' + primaries);
}

/* T1: penyebut dari shape, bukan literal 10. */
{
  check(/rhythmTarget/.test(body) && /shape\.soal/.test(body),
    'T1 penyebut Ritme Harian dari todaySessionShape().soal');
  check(!/doneCount\/10/.test(body) && !/\{selesai:doneCount,target:10/.test(body),
    'T1 tidak ada literal 10 sebagai penyebut', 'literal 10 masih hidup di rhythmBar');
  check(/rhythmShown/.test(body) || /Math\.min\(doneCount/.test(body),
    'T1 pembilang dijepit ke penyebut untuk teksnya');
  check(/today\.cta',\{menit:shape\.menit\}/.test(body) || /today\.cta",\{menit:shape\.menit\}/.test(body) || /t\('today\.cta',\{menit/.test(body),
    'T1 CTA memakai {menit} dari shape');
}

/* T4: satu Pau. Hitung pemakaian template ${...}, bukan sebutan di komentar. */
{
  const faces = (body.match(/\$\{pawFaceMarkup\(\)\}/g) || []).length;
  check(faces === 1, 'T4 tepat satu pawFaceMarkup() di todayHomeMarkup', 'ditemukan ' + faces);
}

/* T3: heroSpeech membaca selesai. */
{
  const hsAt = body.indexOf('heroSpeech');
  const hsBody = hsAt === -1 ? '' : body.slice(hsAt, hsAt + 800);
  check(/selesai/.test(hsBody), 'T3 heroSpeech membaca `selesai`');
  check(/sapaan-selesai/.test(hsBody), 'T3 ada naskah apresiasi selesai (bukan ajakan)');
}

/* T2: urutan — kartu dulu, peluncur kemudian. */
{
  const iCard = body.indexOf('today-card');
  const iFlow = body.indexOf('learnerFlowHomeMarkup()');
  check(iCard !== -1 && iFlow !== -1 && iFlow > iCard,
    'T2 learnerFlowHomeMarkup() di bawah kartu HARI INI');
}

/* T6: kokpit ber-semantik tombol. */
{
  check(/role="button"/.test(body) && /tabindex="0"/.test(body) && /onkeydown/.test(body),
    'T6 kokpit Pau dapat difokus keyboard (role+tabindex+keydown)');
  check(!/paw-hero-avatar" aria-label/.test(body),
    'T6 aria-label tidak lagi di div tanpa role');
}

/* T5: LEVEL + REVIEW di today-head. */
{
  check(/today-head-chips/.test(body), 'T5 today-head memuat keping');
  check(/openLevelPanel/.test(body), 'T5 keping LEVEL (openLevelPanel) ada di todayHome');
  check(/startAdaptive/.test(body), 'T5 keping REVIEW dapat dikerjakan (startAdaptive)');
}

/* T9 + copy ID/TH: balon tanpa {nama}, dengan {menit}; selesai dengan apresiasi. */
{
  const load = (f) => {
    const maps = [];
    const stub = { registerCopy: (l, m) => maps.push([String(l), m || {}]), overrideCopy: (l, m) => maps.push([String(l), m || {}]), t: (k) => String(k), getLocale: () => 'id' };
    const ctx = { FiezelI18n: stub, self: { FiezelI18n: stub }, globalThis: { FiezelI18n: stub }, console };
    try { vm.runInNewContext(read(f), ctx, { filename: f }); } catch (_) {}
    const out = {};
    for (const [l, m] of maps) for (const k of Object.keys(m)) out[l + '::' + k] = String(m[k]);
    return out;
  };
  const idR = load('features/i18n/copy-id-redesign.js');
  const thR = load('features/i18n/copy-th-redesign.js');
  const idF = load('features/i18n/copy-id-app-f.js');
  const thF = load('features/i18n/copy-th-app-f.js');
  const aktifId = idR['id::home.sapaan-runtun-aktif'] || '';
  const aktifTh = thR['th::home.sapaan-runtun-aktif'] || '';
  check(/\{menit\}/.test(aktifId) && !/\{nama\}/.test(aktifId),
    'T9 sapaan-aktif ID memakai {menit} tanpa menyapa nama', aktifId);
  check(/\{menit\}/.test(aktifTh) && !/\{nama\}/.test(aktifTh),
    'T9 sapaan-aktif TH memakai {menit} tanpa menyapa nama', aktifTh);
  const baruId = idF['id::home.sapaan-runtun-baru'] || '';
  const baruTh = thF['th::home.sapaan-runtun-baru'] || '';
  check(/\{menit\}/.test(baruId) && !/\{nama\}/.test(baruId),
    'T9 sapaan-baru ID memakai {menit} tanpa menyapa nama', baruId);
  check(/\{menit\}/.test(baruTh) && !/\{nama\}/.test(baruTh),
    'T9 sapaan-baru TH memakai {menit} tanpa menyapa nama', baruTh);
  check(/\{menit\}/.test(idR['id::today.cta'] || '') && /\{menit\}/.test(thR['th::today.cta'] || ''),
    'T1 today.cta ID+TH memakai {menit}');
  check((idR['id::home.sapaan-selesai'] || '').length > 0 && (thR['th::home.sapaan-selesai'] || '').length > 0,
    'T3 kunci sapaan-selesai ada di ID+TH');
  check((idR['id::home.sapaan-selesai-baru'] || '').length > 0 && (thR['th::home.sapaan-selesai-baru'] || '').length > 0,
    'T3 kunci sapaan-selesai-baru ada di ID+TH');
  /* T11: judul seksi tidak menjanjikan menit yang tidak ditepati isinya. */
  check(!/3 Menit/.test(idR['id::home.latihan-singkat'] || '') && !/3 นาที/.test(thR['th::home.latihan-singkat'] || ''),
    'T11 judul Latihan Singkat ID+TH tanpa janji menit');
}

/* T7: label tombol sosial tidak terpotong — bungkus, bukan ellipsis; satu kolom di ≤360px;
   jalan "Lihat semua" setinggi 44px. */
{
  const FZ2 = read('fiezel-2.css');
  check(/\.fz2-act span[^{]*\{[^}]*white-space:normal/.test(FZ2),
    'T7 label .fz2-act membungkus (bukan ellipsis satu-baris)');
  check(/@media\s*\(max-width:360px\)[\s\S]*?\.fz2-acts/.test(FZ2),
    'T7 .fz2-acts satu kolom di layar sangat sempit');
  check(/\.fz2-link[^{]*\{[^}]*min-height:44px/.test(FZ2),
    'T7 .fz2-link setinggi 44px');
}

/* T8: satu h1 per keadaan (ternary selesai/aktif hanya merender satu cabang), urutan tidak
   melompat, tanpa style= inline di kepala seksi. */
{
  const h1Titles = (body.match(/<h1 class="today-title"/g) || []).length;
  const nonH1Titles = (body.match(/<h[2-6] class="today-title"/g) || []).length;
  check(h1Titles === 2 && nonH1Titles === 0, 'T8 judul kartu h1 di kedua cabang selesai/aktif');
  check(/<h1 class="today-title"/.test(body), 'T8 judul kartu adalah h1');
  check(/<h2 class="today-isi-head"/.test(body), 'T8 "Isi sesi" adalah h2 (bukan lompatan h1→h3/h4)');
  check(/<h2 class="quick-practice-title"/.test(body), 'T8 kepala Latihan Singkat adalah h2 lewat kelas');
  check(!/<h4/.test(body), 'T8 tidak ada h4 di todayHomeMarkup');
  const headDiv = /<div class="quick-practice-head">[\s\S]*?<\/div>/.exec(body);
  check(!!headDiv && headDiv[0].indexOf('style="') === -1,
    'T8 kepala seksi tanpa style= inline');
}

/* T10: bendera skillsLabDestination menyaring chip Dengar. */
{
  check(/uxOn\('skillsLabDestination'\)/.test(body),
    'T10 chip Dengar disaring bendera skillsLabDestination');
}

if (failures > 0) { console.error(failures + ' kegagalan'); process.exit(1); }
console.log('today-home-test: hijau');
