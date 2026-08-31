/**
 * FIEZEL — MESIN DASAR (baseline) untuk jalur keputusan per-jawaban (Fase 2 / Phase H).
 *
 * KENAPA BERKAS INI ADA. Klaim "Braincore cerdas" tidak bisa diuji tanpa sesuatu yang BODOH
 * untuk dibandingkan. Berkas ini adalah pembanding itu: mesin belajar paling sederhana yang
 * masih masuk akal ditulis orang, dan ia SENGAJA tidak memakai satu pun modul Braincore.
 *
 * ATURAN YANG MENJAGA KEJUJURANNYA: berkas ini TIDAK BOLEH me-require apa pun dari
 * features/brain/. Gerbangnya (braincore-comparison-test.js) membaca sumber ini dan menolak
 * kalau ada. Sebuah "baseline" yang diam-diam memanggil mesin yang sedang diuji akan membuat
 * setiap perbandingan terlihat dekat, dan kedekatan itu palsu.
 *
 * APA YANG IA LAKUKAN — seluruhnya, tanpa ada yang disembunyikan:
 *   - keyakinan  : akurasi bergulir pada N jawaban terakhir. Itu saja. Tanpa BKT, tanpa slip,
 *                  tanpa guess, tanpa bobot bukti.
 *   - kesulitan  : benar -> naikkan satu langkah kecil; salah -> turunkan. Persis contoh di
 *                  brief Fase H.
 *   - tindakan   : salah dua kali beruntun -> reteach; salah sekali -> hint; akurasi tinggi ->
 *                  advance; selain itu -> continue.
 *   - ingatan    : TIDAK ADA. Baseline tidak tahu apa itu lupa.
 *   - miskonsepsi: TIDAK ADA. Salah adalah salah, tanpa nama.
 *   - kredibilitas: TIDAK ADA. Tebakan 600 ms dan jawaban terpikir 9 detik bernilai sama.
 *
 * Empat baris terakhir itulah hipotesis Fase H: kalau Braincore layak dijual, keunggulannya
 * harus terlihat justru di tempat baseline buta — bukan di tempat keduanya sama-sama benar.
 */
'use strict';

/** Ambang, semuanya terbuka supaya pembaca bisa menuduh angkanya, bukan menebaknya. */
const WINDOW = 10;          // panjang jendela akurasi bergulir
const STEP = 0.25;          // langkah naik/turun kesulitan
const MIN_D = 1;
const MAX_D = 6;
const ADVANCE_AT = 0.85;    // akurasi jendela yang dianggap "sudah bisa"
const MIN_N_ADVANCE = 5;    // jangan menaikkan hanya karena dua jawaban benar

function createLearner(opts = {}) {
  return {
    level: String(opts.level || 'A2'),
    difficulty: Number(opts.difficulty) > 0 ? Number(opts.difficulty) : 2,
    window: [],               // boolean terakhir, panjang <= WINDOW
    missStreak: 0,
    answered: 0
  };
}

/** Keyakinan baseline: akurasi bergulir. Nol bukti -> null, BUKAN nol. */
function belief(learner) {
  if (!learner.window.length) return null;
  let ok = 0;
  for (const b of learner.window) if (b) ok++;
  return ok / learner.window.length;
}

/**
 * Satu jawaban. Tanda tangannya SENGAJA sama dengan braincore-pipeline.answer() supaya
 * pembanding bisa memberi masukan yang identik ke kedua mesin tanpa cabang khusus.
 *
 * Perhatikan apa yang TIDAK dibaca: a.ms, a.langLoad, a.integrity, a.chosenMisconception.
 * Baseline menerimanya lalu mengabaikannya, karena itulah perbedaan yang sedang diukur.
 */
function answer(learner, question, a, now) {
  const correct = a && a.correct === true;
  const win = learner.window.concat([correct]).slice(-WINDOW);
  const missStreak = correct ? 0 : learner.missStreak + 1;
  const difficulty = Math.max(MIN_D, Math.min(MAX_D,
    learner.difficulty + (correct ? STEP : -STEP)));

  const next = {
    ...learner,
    window: win,
    missStreak,
    difficulty,
    answered: learner.answered + 1
  };

  let ok = 0;
  for (const b of win) if (b) ok++;
  const acc = win.length ? ok / win.length : 0;

  let decision;
  if (missStreak >= 2) decision = 'reteach';
  else if (!correct) decision = 'hint';
  else if (win.length >= MIN_N_ADVANCE && acc >= ADVANCE_AT) decision = 'advance';
  else decision = 'continue';

  return {
    learner: next,
    decision,
    belief: belief(next),
    difficulty,
    // Baseline tidak punya alasan berkode. Ia mengembalikan null, bukan alasan karangan —
    // ketidakmampuan menjelaskan ADALAH salah satu hal yang sedang diukur.
    reasonCodes: null
  };
}

module.exports = { WINDOW, STEP, ADVANCE_AT, MIN_N_ADVANCE, createLearner, answer, belief };
