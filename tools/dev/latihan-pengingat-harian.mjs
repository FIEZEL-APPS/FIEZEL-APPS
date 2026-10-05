#!/usr/bin/env node
/**
 * Pengingat latihan harian & hitungan hari beruntun (harness dev).
 *
 * Murid FIEZEL berada di zona WIB (UTC+7). "Hari" di sini selalu hari kalender WIB:
 * latihan pukul 00:30 WIB sudah terhitung hari yang baru.
 *
 * Masukan `attempts`: [{ ts: epoch ms, skillId: string, correct: boolean }] (urutan bebas).
 *
 * Penggunaan:
 *   node tools/dev/latihan-pengingat-harian.mjs            # pemeriksaan mandiri
 */

const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 3_600_000;

/** Kunci hari kalender WIB, format YYYY-MM-DD. */
export function dayKeyWib(ts) {
  return new Date(ts - WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Apakah murid sudah latihan pada hari kalender WIB yang sama dengan `now`. */
export function practicedToday(attempts, now = Date.now()) {
  const today = dayKeyWib(now);
  return attempts.some(a => dayKeyWib(a.ts) === today);
}

/** Jumlah hari beruntun (berakhir hari ini atau kemarin) dengan minimal satu latihan. */
export function currentStreak(attempts, now = Date.now()) {
  if (attempts.length === 0) return 0;
  const days = new Set(attempts.map(a => dayKeyWib(a.ts)));
  let cursor = now;
  if (!days.has(dayKeyWib(cursor))) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(dayKeyWib(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

/** Tiga percobaan terbaru untuk ditampilkan di kartu pengingat (terbaru dulu). */
export function recentAttempts(attempts, limit = 3) {
  return [...attempts].sort((a, b) => b.ts - a.ts).slice(0, limit);
}

/** Teks status untuk kartu guru; `lastSeen` boleh kosong (null/undefined) bila murid belum pernah masuk. */
export function reminderState(attempts, lastSeen, now = Date.now()) {
  if (lastSeen == null) return 'belum-pernah-masuk';
  if (practicedToday(attempts, now)) return 'sudah-latihan';
  return currentStreak(attempts, now) > 0 ? 'jaga-streak' : 'ajak-latihan';
}

function selfCheck() {
  const noonUtc = (d) => Date.UTC(2026, 9, d, 12);
  const attempts = [
    { ts: noonUtc(3), skillId: 'articles', correct: true },
    { ts: noonUtc(4), skillId: 'past-simple', correct: false },
    { ts: noonUtc(5), skillId: 'past-simple', correct: true },
  ];
  const now = noonUtc(5) + 3_600_000;
  const checks = [
    ['dayKeyWib', dayKeyWib(noonUtc(5)) === '2026-10-05'],
    ['practicedToday', practicedToday(attempts, now) === true],
    ['currentStreak', currentStreak(attempts, now) === 3],
    ['recentAttempts', recentAttempts(attempts)[0].ts === noonUtc(5) && attempts[0].ts === noonUtc(3)],
    ['reminderState', reminderState(attempts, undefined, now) === 'belum-pernah-masuk' && reminderState(attempts, now, now) === 'sudah-latihan'],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error(`GAGAL: ${failed.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Pengingat latihan harian: PASS (${checks.length}/${checks.length})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) selfCheck();
