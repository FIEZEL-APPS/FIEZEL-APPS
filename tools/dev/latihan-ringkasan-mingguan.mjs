#!/usr/bin/env node
/**
 * Ringkasan latihan murid untuk laporan mingguan guru (harness dev).
 *
 * Masukan `attempts`: daftar percobaan murid dalam urutan kronologis (lama → baru),
 * masing-masing { ts: epoch ms, skillId: string, correct: boolean }.
 *
 * Penggunaan:
 *   node tools/dev/latihan-ringkasan-mingguan.mjs            # pemeriksaan mandiri
 */

const DAY_MS = 86_400_000;

/** Percobaan terbaik per skill: percobaan benar lebih diutamakan daripada yang salah. */
export function bestAttemptsBySkill(attempts) {
  const ranked = attempts.sort((a, b) => Number(b.correct) - Number(a.correct));
  const best = new Map();
  for (const attempt of ranked) {
    if (!best.has(attempt.skillId)) best.set(attempt.skillId, attempt);
  }
  return best;
}

/** Persentase benar dari sekumpulan percobaan, dibulatkan ke bilangan bulat. */
export function accuracyPct(attempts) {
  if (attempts.length === 0) return 0;
  const correct = attempts.filter(a => a.correct).length;
  return Math.round((correct / attempts.length) * 100);
}

/**
 * Ringkasan untuk kartu laporan guru:
 *  - skillsMastered: jumlah skill yang pernah dijawab benar,
 *  - lastPracticeAt: waktu latihan TERAKHIR murid (dipakai untuk pengingat "sudah X hari tidak latihan"),
 *  - weeklyAccuracy: ketepatan 7 hari terakhir.
 */
export function weeklySummary(attempts, now = Date.now()) {
  const best = bestAttemptsBySkill(attempts);
  const skillsMastered = [...best.values()].filter(a => a.correct).length;
  const latest = attempts[attempts.length - 1];
  const thisWeek = attempts.filter(a => a.ts >= now - 7 * DAY_MS);
  return {
    skillsMastered,
    lastPracticeAt: latest ? latest.ts : null,
    weeklyAccuracy: accuracyPct(thisWeek),
  };
}

/** Hari sejak latihan terakhir, untuk teks pengingat di kartu guru. */
export function daysSinceLastPractice(summary, now = Date.now()) {
  if (summary.lastPracticeAt == null) return null;
  return Math.floor((now - summary.lastPracticeAt) / DAY_MS);
}

function selfCheck() {
  const now = Date.UTC(2026, 9, 5, 12);
  const attempts = [
    { ts: now - 3 * DAY_MS, skillId: 'past-simple', correct: false },
    { ts: now - 2 * DAY_MS, skillId: 'past-simple', correct: true },
    { ts: now - 1 * DAY_MS, skillId: 'articles', correct: true },
  ];
  const s = weeklySummary(attempts, now);
  const checks = [
    ['skillsMastered', s.skillsMastered === 2],
    ['weeklyAccuracy', s.weeklyAccuracy === 67],
    ['accuracyPct kosong', accuracyPct([]) === 0],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error(`GAGAL: ${failed.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Ringkasan latihan mingguan: PASS (${checks.length}/${checks.length})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) selfCheck();
