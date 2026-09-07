// tests/paw-arena-rules-card-test.js — kartu aturan PAW ARENA muncul SETIAP kali masuk sesi.
//
// KENAPA GERBANG INI ADA (tugas §3.3 + peringatan eksplisit owner)
// ----------------------------------------------------------------
// Keputusan owner: setiap kali murid masuk sesi permainan, kartu aturan HARUS muncul —
// bukan sekali seumur hidup. Bahayanya nyata dan halus: gampang sekali seseorang "menghemat"
// dengan menyimpan flag "sudah lihat aturan" (mis. lewat FiezelTour.completed()/STORAGE_KEY
// dari features/onboarding/fiezel-tour.js yang memang dirancang sekali-seumur-hidup). Begitu
// itu terjadi, kartu hilang selamanya sesudah sekali dibuka, dan tidak ada yang sadar sampai
// murid mengeluh.
//
// GERBANG YANG HANYA MEMERIKSA KEMUNCULAN PERTAMA akan tetap HIJAU saat bug itu masuk —
// persis bug yang diminta owner untuk dicegah. Karena itu inti gerbang ini adalah: buka
// sesi permainan yang SAMA dua kali berturut-turut, dan pastikan aturannya muncul di KEDUA
// kali. Untuk membuktikan gerbang ini BISA MERAH (bukan sekadar mencocokkan sumber), ia
// menjalankan LOGIKA PENILAI yang sama terhadap implementasi TIRUAN yang sengaja dibuat
// sekali-seumur-hidup, dan menuntut penilai itu MERAH atasnya. Kalau salah satu dari dua
// sisi ini goyah, gerbang gagal.
//
// MUTASI YANG DIUJI (ditulis di badan PR juga):
//   M1. newSession kedua tidak lagi lahir di fase 'rules' (once-per-lifetime)  → HARUS MERAH.
//   M2. openHelp mengubah ronde/giliran (petunjuk menghanguskan giliran)       → HARUS MERAH.
//   M3. modul mulai memakai FiezelTour untuk kartu aturan                       → HARUS MERAH.
//
// Nol dependency, nol jaringan, nol berkas temporer.
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');

const ARENA_SRC = path.join(__fzRoot, 'features', 'learner-flow', 'fiezel-paw-arena.js');
const arena = require(ARENA_SRC);

let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
};

/**
 * Penilai kontrak "kartu aturan per-sesi". Dipakai DUA kali: pada modul asli (harus lulus)
 * dan pada stub rusak (harus gagal). Mengembalikan daftar kegagalan; kosong = lulus.
 * `mod` cukup punya: newSession, shouldShowRules, dismissRules, openHelp, GAMES.
 */
function evaluate(mod) {
  const fails = [];
  const gameId = (mod.GAMES && mod.GAMES[0] && mod.GAMES[0].id) || 'story';

  // (1) Masuk PERTAMA: kartu aturan harus tampil.
  const s1 = mod.newSession(gameId, { seed: 42 });
  if (!mod.shouldShowRules(s1)) fails.push('masuk-1: kartu aturan tidak tampil');

  // Mainkan sampai selesai lalu keluar (simulasi murid menutup sesi).
  mod.dismissRules(s1, 'start');
  if (mod.shouldShowRules(s1)) fails.push('sesudah mulai: kartu aturan masih menutup ronde');

  // (2) Masuk KEDUA ke permainan yang SAMA, berturut-turut: kartu aturan HARUS tampil lagi.
  //     Inilah pemeriksaan yang membedakan per-sesi dari sekali-seumur-hidup.
  const s2 = mod.newSession(gameId, { seed: 43 });
  if (!mod.shouldShowRules(s2)) fails.push('masuk-2: kartu aturan TIDAK tampil (bug sekali-seumur-hidup)');

  // (3) Petunjuk di tengah ronde tidak boleh membatalkan ronde / menghanguskan giliran.
  const s3 = mod.newSession(gameId, { seed: 7 });
  mod.dismissRules(s3, 'start');
  const beforeRound = s3.round, beforeTurn = s3.turn, beforePhase = s3.phase;
  if (typeof mod.openHelp === 'function') mod.openHelp(s3);
  if (s3.round !== beforeRound || s3.turn !== beforeTurn || s3.phase !== beforePhase) {
    fails.push('openHelp mengubah ronde/giliran/fase — petunjuk menghanguskan giliran');
  }
  return fails;
}

console.log('paw-arena-rules-card-test');

// --- SISI 1: modul asli WAJIB LULUS penilai -----------------------------------------
const realFails = evaluate(arena);
check('kartu aturan tampil di KEDUA kali masuk + petunjuk tidak menghanguskan giliran',
  realFails.length === 0, realFails.join('; '));

// --- SISI 2: modul tidak boleh bersandar pada modul tur sekali-seumur-hidup ----------
// Memindai KODE, bukan komentar/string: header modul SENGAJA menyebut anti-pola
// "FiezelTour.completed()/STORAGE_KEY" sebagai dokumentasi kenapa ia dihindari. Gerbang
// yang menghukum kalimat itu adalah gerbang yang akan dimatikan (pola braincore-purity).
function stripCommentsAndStrings(input) {
  let out = '', i = 0; const n = input.length;
  while (i < n) {
    const c = input[i], d = input[i + 1];
    if (c === '/' && d === '/') { const j = input.indexOf('\n', i); if (j < 0) break; i = j; continue; }
    if (c === '/' && d === '*') { const j = input.indexOf('*/', i + 2); if (j < 0) break; i = j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++; while (i < n && input[i] !== q) { if (input[i] === '\\') i++; i++; } i++; out += ' '; continue;
    }
    out += c; i++;
  }
  return out;
}
const code = stripCommentsAndStrings(fs.readFileSync(ARENA_SRC, 'utf8'));
check('USES_TOUR === false (kartu per-sesi tidak bergantung modul tur)', arena.USES_TOUR === false,
  'arena.USES_TOUR = ' + arena.USES_TOUR);
check('KODE tidak memanggil FiezelTour untuk kartu aturan',
  !/FiezelTour\s*\.\s*(completed|STORAGE_KEY)|require\([^)]*fiezel-tour/.test(code),
  'ditemukan panggilan FiezelTour di KODE modul arena');

// --- SISI 3: BUKTI GERBANG BISA MERAH — jalankan penilai atas stub rusak -------------
// M1: sekali-seumur-hidup (newSession kedua tidak lahir di 'rules').
function brokenOncePerLifetime() {
  let seen = false; // "sudah pernah lihat aturan" — persis anti-pola yang dilarang owner.
  return {
    GAMES: arena.GAMES,
    newSession(id) { const s = { game: id, phase: seen ? 'playing' : 'rules', round: 0, turn: 0 }; seen = true; return s; },
    shouldShowRules(s) { return s.phase === 'rules'; },
    dismissRules(s) { s.phase = 'playing'; return s; },
    openHelp(s) { return s; }
  };
}
check('MERAH atas stub sekali-seumur-hidup (M1)', evaluate(brokenOncePerLifetime()).length > 0,
  'penilai HIJAU pada stub rusak — gerbang tidak bisa merah');

// M2: openHelp menghanguskan giliran.
function brokenHelpBurnsTurn() {
  return {
    GAMES: arena.GAMES,
    newSession(id) { return { game: id, phase: 'rules', round: 0, turn: 0 }; },
    shouldShowRules(s) { return s.phase === 'rules'; },
    dismissRules(s) { s.phase = 'playing'; return s; },
    openHelp(s) { s.turn += 1; s.phase = 'rules'; return s; } // membatalkan ronde.
  };
}
check('MERAH atas stub petunjuk-menghanguskan-giliran (M2)', evaluate(brokenHelpBurnsTurn()).length > 0);

if (failed) { console.log('\nPAW ARENA rules-card gate: ' + failed + ' FAIL'); process.exit(1); }
console.log('\nPAW ARENA rules-card gate: semua hijau');
