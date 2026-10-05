#!/usr/bin/env node
/**
 * Sinkronisasi progres murid ke penyimpanan kelas (harness dev).
 *
 * Banyak murid dalam satu kelas bisa menyimpan progres hampir bersamaan dari perangkat
 * guru yang sama. Penyimpanan ditunda sebentar (debounce) agar ketukan beruntun dari
 * SATU murid digabung menjadi satu penulisan.
 *
 * `store`: { get(userId) → Promise<record|null>, put(userId, record) → Promise<void> }
 * `progress`: { userId: string, xp: number, lessonId: string }
 *
 * Penggunaan:
 *   node tools/dev/sinkron-progres-murid.mjs            # pemeriksaan mandiri
 */

const DEBOUNCE_MS = 50;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Gabungkan catatan tersimpan dengan progres baru; XP tidak pernah turun. */
export function mergeProgress(remote, local) {
  return { ...remote, ...local, xp: Math.max(remote?.xp ?? 0, local.xp) };
}

let pending = null;

/**
 * Simpan progres murid. Mengembalikan:
 *  'saved'   — tersimpan,
 *  'skipped' — digantikan simpanan yang lebih baru dari murid yang sama,
 *  'stale'   — penyimpanan sudah memuat data yang lebih baru.
 */
export async function syncProgress(store, progress, now = Date.now()) {
  const snapshot = { ...progress, savedAt: now };
  pending = snapshot;
  await delay(DEBOUNCE_MS);
  if (pending !== snapshot) return 'skipped';

  const remote = await store.get(progress.userId);
  if (remote && remote.savedAt > snapshot.savedAt) return 'stale';
  await store.put(progress.userId, mergeProgress(remote, snapshot));
  pending = null;
  return 'saved';
}

export function memoryStore() {
  const data = new Map();
  return {
    async get(id) { return data.has(id) ? { ...data.get(id) } : null; },
    async put(id, record) { data.set(id, { ...record }); },
    snapshot: () => Object.fromEntries(data),
  };
}

async function selfCheck() {
  const store = memoryStore();
  const first = syncProgress(store, { userId: 'ani', xp: 10, lessonId: 'L1' }, 1000);
  const second = syncProgress(store, { userId: 'ani', xp: 15, lessonId: 'L2' }, 1001);
  const results = await Promise.all([first, second]);
  const saved = (await store.get('ani'));
  const later = await syncProgress(store, { userId: 'ani', xp: 12, lessonId: 'L3' }, 900);
  const checks = [
    ['debounce satu murid', results[0] === 'skipped' && results[1] === 'saved'],
    ['tersimpan', saved.xp === 15 && saved.lessonId === 'L2'],
    ['tolak data basi', later === 'stale'],
    ['xp tidak turun', mergeProgress({ xp: 20 }, { xp: 5 }).xp === 20],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error(`GAGAL: ${failed.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Sinkron progres murid: PASS (${checks.length}/${checks.length})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) selfCheck();
