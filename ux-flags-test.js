#!/usr/bin/env node
/**
 * m025-246 — GERBANG SAKELAR PENYEDERHANAAN PENGALAMAN.
 *
 * OWNER meminta lima permukaan DISEMBUNYIKAN, bukan dihapus: empat fase suasana, ujian per
 * skill, Skills Lab sebagai tujuan terpisah, Personal Journey + dashboard skill, dan gerbang
 * paket suara. "Sembunyikan (Feature Flag OFF)" adalah kalimat aslinya.
 *
 * DUA HAL YANG DIJAGA DI SINI, dan keduanya adalah cara pekerjaan ini bisa berbalik diam-diam:
 *
 * 1. NILAI BAWAAN. Bendera yang tanpa sengaja berubah menjadi `true` akan mengembalikan
 *    permukaan yang justru diminta hilang — dan ia tidak akan terlihat di code review, karena
 *    perubahannya satu karakter. Nilai yang diminta owner dipaku di bawah, per bendera,
 *    dengan kalimat aslinya sebagai alasan.
 *
 * 2. DUA SALINAN NILAI BAWAAN HARUS SAMA. app.js memegang salinannya sendiri
 *    (UX_FALLBACK_FLAGS) karena ~40 gerbang menjalankannya di dalam konteks `vm` yang tidak
 *    memuat fiezel-ux-flags.js; tanpa salinan itu, semua gerbang render akan menguji jalur
 *    "semua fitur mati" dan hijau-nya berhenti berarti. Salinan itu aman HANYA selama ada
 *    yang membandingkannya dengan sumber aslinya. Itu pekerjaan asersi di bawah.
 *
 * Konvensi rumah: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const flags = require('./fiezel-ux-flags.js');
const APP = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const SW = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');

let failures = 0;
function check(ok, name, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

/* Nilai yang diminta owner, dengan kalimat aslinya. Mengubah salah satu angka di bawah
   adalah mengubah keputusan produk, dan itu memang harus terlihat sebagai perubahan tes. */
const REQUIRED = {
  scenePhases: [false, '4 FASE SUASANA DAY/DAWN/DUSK/NIGHT ... SEMBUNYIKAN (Feature Flag OFF)'],
  skillExams: [false, 'Ujian per skill - SEMBUNYIKAN'],
  skillsLabDestination: [false, 'Skills Lab sebagai tujuan terpisah - SEMBUNYIKAN'],
  personalJourneyTab: [false, "Personal Journey + dashboard skill - satu tab 'Progres'"],
  voicePackGate: [false, 'Gerbang paket suara 119 MB - pindah ke Pengaturan'],
  tutorRole: [false, 'Peran tutor (minimal) - Fase 4, KONDISIONAL (belum dinyalakan)'],
  todayHome: [true, "Home 'Hari ini': satu kartu, satu CTA"],
  fourTabNav: [true, 'Navigasi: maks 4 tab'],
  leanIntro: [true, 'perkenalan <=3 layar'],
  placementLite: [true, 'placement-lite 8-12 soal'],
  sessionSummary: [true, 'Ringkasan akhir sesi'],
  funnelTelemetry: [true, 'Instrumentasi funnel (opt-in, agregat, tanpa PII)']
};

/* -- T1: setiap bendera punya nilai yang diminta owner -------------------------------- */
for (const name of Object.keys(REQUIRED)) {
  const [want, reason] = REQUIRED[name];
  check(flags.DEFAULTS[name] === want,
    'T1 ' + name + ' = ' + want,
    'nilai sekarang ' + flags.DEFAULTS[name] + ' — alasan owner: "' + reason + '"');
}

/* -- T2: tidak ada bendera liar yang tidak pernah diminta ----------------------------- */
{
  const extra = flags.names().filter(n => !Object.prototype.hasOwnProperty.call(REQUIRED, n));
  check(extra.length === 0,
    'T2 tidak ada bendera yang tidak tercatat di gerbang ini',
    'bendera tanpa catatan: ' + extra.join(', '));
}

/* -- T3: salinan di app.js identik dengan sumbernya ----------------------------------- */
{
  const m = /const UX_FALLBACK_FLAGS=\{([^}]*)\}/.exec(APP);
  check(!!m, 'T3a app.js memegang salinan nilai bawaan untuk harness vm');
  if (m) {
    const copy = {};
    for (const pair of m[1].split(',')) {
      const kv = /^\s*([A-Za-z]+)\s*:\s*(true|false)\s*$/.exec(pair);
      if (kv) copy[kv[1]] = kv[2] === 'true';
    }
    const drift = flags.names()
      .filter(n => copy[n] !== flags.DEFAULTS[n])
      .map(n => n + ' (berkas=' + flags.DEFAULTS[n] + ' app.js=' + copy[n] + ')');
    const orphan = Object.keys(copy).filter(n => !Object.prototype.hasOwnProperty.call(flags.DEFAULTS, n));
    check(drift.length === 0,
      'T3b salinan app.js sama persis dengan fiezel-ux-flags.js',
      'menyimpang: ' + drift.join(', '));
    check(orphan.length === 0,
      'T3c salinan app.js tidak memuat bendera yang sudah tidak ada',
      'bendera yatim: ' + orphan.join(', '));
  }
}

/* -- T4: nama tak dikenal gagal ke arah AMAN (false), bukan undefined ------------------ */
{
  check(flags.on('bendera-yang-tidak-ada') === false,
    'T4a nama tak dikenal dijawab false, bukan undefined');
  check(flags.off('bendera-yang-tidak-ada') === true,
    'T4b off() adalah kebalikan yang konsisten untuk nama tak dikenal');
  /* Salah ketik yang menyalakan fitur adalah mode kegagalan paling mahal: ia menghidupkan
     permukaan yang sengaja disembunyikan, dan tidak ada yang error. */
  check(/return resolved\[flag\] === true;/.test(fs.readFileSync(path.join(__dirname, 'fiezel-ux-flags.js'), 'utf8')),
    'T4c pembacaan bendera memakai perbandingan ketat ke true');
}

/* -- T5: berkasnya benar-benar sampai ke murid ---------------------------------------- */
{
  const flagAt = INDEX.indexOf('./fiezel-ux-flags.js');
  const appAt = INDEX.indexOf('./app.js');
  check(flagAt !== -1, 'T5a index.html memuat fiezel-ux-flags.js');
  check(flagAt !== -1 && appAt !== -1 && flagAt < appAt,
    'T5b bendera dimuat SEBELUM app.js',
    'flags@' + flagAt + ' app@' + appAt);
  check(SW.indexOf("'./fiezel-ux-flags.js'") !== -1,
    'T5c sw.js ikut mem-precache bendera, supaya murid offline membaca keputusan yang sama');
}

/* -- T6: app.js benar-benar MEMAKAI benderanya --------------------------------------- */
{
  /* Bendera yang tidak pernah ditanya adalah dokumentasi, bukan sakelar. Tiap bendera
     "sembunyikan" wajib punya sedikitnya satu titik baca di kode yang dikirim. */
  const readers = [
    ['scenePhases', APP],
    ['skillExams', APP + fs.readFileSync(path.join(__dirname, 'features/speaking-listening/fiezel-speaking-listening-addon.js'), 'utf8')],
    ['personalJourneyTab', APP],
    /* voicePackGate SENGAJA TIDAK ada di daftar pembaca. OWNER 4 Sep 2026 membatalkan
       sakelar opt-in-nya: unduhan latar 152 MB kembali menyala sendiri di boot dan tidak
       melihat bendera apa pun. Yang tersisa untuk dikendalikan bendera ini adalah GERBANG
       unduhan yang memang sudah tidak ada di kode. Menuntutnya punya titik baca berarti
       memaksa seseorang menambahkan percabangan palsu hanya supaya gerbang ini hijau. */
    ['todayHome', APP],
    ['placementLite', APP],
    ['sessionSummary', APP],
    ['leanIntro', fs.readFileSync(path.join(__dirname, 'features/onboarding/fiezel-onboarding.js'), 'utf8')]
  ];
  for (const [name, source] of readers) {
    check(source.indexOf("'" + name + "'") !== -1,
      'T6 bendera ' + name + ' benar-benar dibaca kode yang dikirim');
  }
  /* Pasangan asersi untuk pengecualian di atas: unduhan latar harus TETAP tidak
     berpagar. Kalau suatu hari seseorang memasang gerbang di depannya lagi, gerbang ini
     merah dan koreksi owner terbaca sebelum rilis, bukan sesudah. */
  {
    const at = APP.indexOf('function armOfflineVoiceAutoload()');
    const body = at === -1 ? '' : APP.slice(at, APP.indexOf('\n}', at));
    check(at !== -1 && !/uxOn\(|uxOff\(|voicePackOptIn/.test(body),
      'T6b unduhan suara latar tidak berpagar bendera maupun opt-in (koreksi OWNER 4 Sep 2026)',
      body.slice(0, 200));
  }
}

console.log('');
if (failures) {
  console.error('FIEZEL ux flags: FAIL (' + failures + ')');
  process.exit(1);
}
console.log('FIEZEL ux flags: PASS (' + flags.names().length + ' bendera)');
