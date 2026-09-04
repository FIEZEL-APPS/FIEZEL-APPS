/**
 * workers/api/teacher/braincore-bridge.js — JEMBATAN KONTEN GURU -> BRAINCORE (§15-§17).
 * MURNI: nol D1, nol jam implisit.
 *
 * ==========================================================================
 * APA YANG DIJANJIKAN BERKAS INI, DAN APA YANG TIDAK
 * ==========================================================================
 * §16 melarang "adaptif palsu". Jadi batasnya dinyatakan di depan:
 *
 * YANG DILAKUKAN berkas ini — menerjemahkan soal guru ke BENTUK ITEM yang sudah
 * dibaca mesin adaptif FIEZEL, membangun indeks yang bisa ditanya per
 * keterampilan/level, dan memilih aktivitas berikutnya dari BUKTI NYATA murid.
 *
 * YANG TIDAK dilakukan — mengarang model belajar kedua. Prior kesulitan tetap
 * milik `features/brain/fiezel-item-prior.js` (`difficultyFor`), penguasaan
 * tetap milik `fiezel-mastery-bkt.js`, dan bukti tetap milik lane
 * `learner-evidence`. Berkas ini MEMANGGIL kontrak mereka, tidak menirunya.
 * Karena itu `normalizeForBraincore()` menghasilkan `{ level, domain,
 * stemLength }` — TEPAT tiga bidang yang `difficultyFor` baca (lihat tanda
 * tangannya di fiezel-item-prior.js:115) — bukan angka kesulitan yang dihitung
 * sendiri di sini. Menghitungnya sendiri adalah persis definisi adaptif palsu:
 * dua rumus untuk satu konsep yang akan menyimpang pada perubahan berikutnya.
 *
 * ==========================================================================
 * BATAS DOMAIN (§17)
 * ==========================================================================
 * Setiap item yang keluar dari sini membawa provenans: `contentSource:'TEACHER'`
 * plus teacherId/subjectId/courseId/lessonId. Braincore HARUS bisa tahu asal
 * sebuah item, dan alasannya operasional, bukan administratif: statistik item
 * (kalibrasi) dari satu kelas berisi 24 murid TIDAK boleh dicampur ke prior
 * bank inti yang dipakai seluruh pengguna FIEZEL. Satu soal guru yang menjebak
 * akan menggeser prior nasional kalau batas ini tidak ada.
 */

import {
  CONTENT_SOURCE, CONTENT_STATUS, SKILLS, LEVELS, DIFFICULTY, NODE_KIND
} from './content-core.js';

/**
 * Pemetaan keterampilan FIEZEL -> `domain` yang dibaca `difficultyFor`.
 * Identitas hari ini (nama sudah sama), dan tabel ini tetap ada supaya
 * perubahan nama di salah satu sisi punya SATU tempat untuk diperbaiki
 * alih-alih tersebar di pemanggil.
 */
export const SKILL_TO_DOMAIN = Object.freeze({
  vocabulary: 'vocabulary',
  grammar: 'grammar',
  reading: 'reading',
  listening: 'listening',
  speaking: 'speaking'
});

export const BRIDGE_PROBLEM = Object.freeze({
  NOT_PUBLISHED: 'bridge_not_published',
  SKILL_UNKNOWN: 'bridge_skill_unknown',
  LEVEL_UNKNOWN: 'bridge_level_unknown',
  LESSON_MISSING: 'bridge_lesson_missing'
});

/**
 * normalizeForBraincore(question, context) -> { ok, item } | { ok:false, problem }
 *
 * Hanya konten TERBIT yang boleh dinormalkan. Ini bukan pemeriksaan berlebih di
 * atas otorisasi rute: indeks Braincore adalah tempat item hidup SESUDAH lolos
 * rute, dan draf yang menyelinap masuk ke indeks akan tersaji ke murid tanpa
 * pernah melewati layar terbit guru (§14).
 */
export function normalizeForBraincore(question, context) {
  if (!question) return { ok: false, problem: BRIDGE_PROBLEM.LESSON_MISSING };
  if (question.status !== CONTENT_STATUS.PUBLISHED) {
    return { ok: false, problem: BRIDGE_PROBLEM.NOT_PUBLISHED };
  }
  const skill = String(question.skill || '');
  if (!SKILLS.includes(skill)) return { ok: false, problem: BRIDGE_PROBLEM.SKILL_UNKNOWN };
  const level = String(question.level || '');
  if (!LEVELS.includes(level)) return { ok: false, problem: BRIDGE_PROBLEM.LEVEL_UNKNOWN };
  const lessonId = question.lesson_id || (context && context.lessonId) || '';
  if (!lessonId) return { ok: false, problem: BRIDGE_PROBLEM.LESSON_MISSING };

  const ctx = context || {};
  return {
    ok: true,
    item: {
      id: question.id,
      // --- bidang yang DIBACA fiezel-item-prior.difficultyFor -----------------
      level,
      domain: SKILL_TO_DOMAIN[skill],
      stemLength: String(question.stem || '').length,
      // --- bidang model item FIEZEL ------------------------------------------
      skill,
      type: question.type,
      stem: question.stem,
      options: Array.isArray(question.options) ? question.options.slice() : [],
      answer: question.answer,
      explanation: question.explanation || '',
      // `teacherDifficulty` SENGAJA bernama begitu dan BUKAN `difficulty`:
      // ia adalah penilaian guru (1..5), bukan kesulitan terkalibrasi FIEZEL.
      // Nama yang sama akan membuat pemanggil berikutnya memasukkannya ke
      // tempat angka terkalibrasi seharusnya, dan itu tidak akan terlihat.
      teacherDifficulty: Number(question.difficulty) || DIFFICULTY.DEFAULT,
      tags: Array.isArray(question.tags) ? question.tags.slice() : [],
      // --- provenans (§17) ----------------------------------------------------
      contentSource: CONTENT_SOURCE.TEACHER,
      teacherId: ctx.teacherId || question.teacher_sub || null,
      institutionId: ctx.institutionId || null,
      subjectId: ctx.subjectId || null,
      courseId: ctx.courseId || null,
      lessonId
    }
  };
}

/**
 * buildIndex(questions, context) -> { items, bySkill, byLevel, skipped }
 *
 * `skipped` DIKEMBALIKAN, tidak dibuang. Item yang tidak bisa dinormalkan adalah
 * materi yang guru kira sampai ke muridnya padahal tidak; laporan sinkronisasi
 * (§29 SYNCED/PENDING/FAILED) membacanya dari sini. Indeks yang menelan
 * kegagalan diam-diam akan membuat guru menunggu hasil yang tidak akan datang.
 */
export function buildIndex(questions, context) {
  const items = [];
  const skipped = [];
  const bySkill = {};
  const byLevel = {};

  for (const question of (Array.isArray(questions) ? questions : [])) {
    const verdict = normalizeForBraincore(question, context);
    if (!verdict.ok) {
      skipped.push({ id: question && question.id, problem: verdict.problem });
      continue;
    }
    const item = verdict.item;
    items.push(item);
    (bySkill[item.skill] = bySkill[item.skill] || []).push(item.id);
    (byLevel[item.level] = byLevel[item.level] || []).push(item.id);
  }
  return { items, bySkill, byLevel, skipped };
}

/* ========================================================================== */
/* BUKTI BELAJAR                                                               */
/* ========================================================================== */

/**
 * evidenceFromAttempt(attempt, item) -> amplop bukti lane learner-evidence.
 *
 * Bentuknya SENGAJA sama dengan bukti item inti (dimensi `skill` + `level` +
 * `correct`), dengan satu tambahan: `contentSource` dan `lessonId`. Kesamaan itu
 * yang membuat §16 mungkin — Braincore tidak butuh cabang khusus untuk membaca
 * kemajuan atas materi guru, ia membaca dimensi yang sama.
 *
 * TIDAK ADA teks jawaban murid di sini. Bukti membawa BENAR/SALAH dan dimensi,
 * bukan transkrip: larangan di kepala 0001_identity.sql ("jawaban/riwayat/
 * transkrip") berlaku penuh atas lane ini.
 */
export function evidenceFromAttempt(attempt, item) {
  if (!attempt || !item) return null;
  return {
    itemId: item.id,
    skill: item.skill,
    level: item.level,
    correct: attempt.correct === true,
    latencyMs: Number(attempt.latencyMs) > 0 ? Math.round(Number(attempt.latencyMs)) : null,
    contentSource: CONTENT_SOURCE.TEACHER,
    teacherId: item.teacherId || null,
    lessonId: item.lessonId,
    subjectId: item.subjectId || null
  };
}

/**
 * masteryFromEvidence(evidence) -> { bySkill: { skill: {seen, correct, rate} } }
 *
 * Ringkasan JUJUR: `rate` hanya proporsi teramati, dan ia BUKAN penguasaan.
 * Penguasaan sesungguhnya adalah keluaran `fiezel-mastery-bkt.js` yang memodelkan
 * tebakan dan kelalaian; menamai keluaran fungsi ini "mastery" akan membuat
 * pemanggil berikutnya memakainya seolah setara. `seen` ikut dikembalikan supaya
 * pemanggil bisa menolak menyimpulkan apa pun dari dua percobaan.
 */
export function masteryFromEvidence(evidence) {
  const bySkill = {};
  for (const record of (Array.isArray(evidence) ? evidence : [])) {
    if (!record || !SKILLS.includes(record.skill)) continue;
    const bucket = bySkill[record.skill] || (bySkill[record.skill] = { seen: 0, correct: 0, rate: 0 });
    bucket.seen += 1;
    if (record.correct === true) bucket.correct += 1;
  }
  for (const bucket of Object.values(bySkill)) {
    bucket.rate = bucket.seen ? bucket.correct / bucket.seen : 0;
  }
  return { bySkill };
}

/**
 * Ambang keputusan. Angkanya dinyatakan sebagai konstanta bernama supaya bisa
 * dikalibrasi ulang di satu tempat dan supaya gerbang bisa mengujinya langsung.
 * MIN_OBSERVATIONS ada karena satu jawaban salah bukan kelemahan — ia kebetulan.
 */
export const DECISION = Object.freeze({
  WEAK_BELOW: 0.6,
  STRONG_AT_OR_ABOVE: 0.85,
  MIN_OBSERVATIONS: 3
});

/**
 * chooseNextActivity({ index, evidence, learnerLevel }) -> keputusan
 *
 * Inilah §16 yang sesungguhnya: BUKAN urutan tetap. Aturannya, terurut, dan
 * masing-masing punya alasan:
 *
 *  1. Keterampilan yang BELUM PERNAH teramati didahulukan. Braincore tidak bisa
 *     menyimpulkan apa pun tentang yang belum pernah dilihat, dan mengabaikannya
 *     berarti murid bisa lulus sebuah lesson tanpa pernah menyentuh listening.
 *  2. Sesudah semua teramati, keterampilan TERLEMAH (rate < WEAK_BELOW dengan
 *     pengamatan cukup) yang dipilih — inti contoh §16: vocabulary kuat,
 *     listening lemah, grammar sedang -> listening yang dilatih.
 *  3. Kalau tidak ada yang lemah, yang rate-nya PALING RENDAH tetap dipilih;
 *     "semua di atas ambang" bukan alasan untuk berhenti mengadaptasi.
 *  4. Kalau seluruh keterampilan sudah STRONG, keputusannya `advance` — dan
 *     itu dilaporkan apa adanya, bukan disamarkan sebagai latihan lain.
 *
 * `reason` selalu ikut keluar. Keputusan adaptif yang tidak bisa dijelaskan
 * tidak bisa diaudit, dan yang tidak bisa diaudit tidak bisa dibuktikan nyata.
 */
export function chooseNextActivity(input) {
  const index = (input && input.index) || { items: [], bySkill: {} };
  const summary = masteryFromEvidence(input && input.evidence);
  const available = Object.keys(index.bySkill || {}).filter((s) => (index.bySkill[s] || []).length);

  if (!available.length) {
    return { action: 'none', reason: 'no_teacher_items', skill: null, itemIds: [] };
  }

  const unseen = available.filter((skill) => !summary.bySkill[skill]);
  if (unseen.length) {
    const skill = pickStable(unseen);
    return { action: 'practice', reason: 'unseen_skill', skill, itemIds: index.bySkill[skill].slice() };
  }

  const scored = available.map((skill) => ({ skill, ...summary.bySkill[skill] }));
  const confident = scored.filter((s) => s.seen >= DECISION.MIN_OBSERVATIONS);

  const weak = confident.filter((s) => s.rate < DECISION.WEAK_BELOW)
    .sort((a, b) => a.rate - b.rate || compareStable(a.skill, b.skill));
  if (weak.length) {
    return {
      action: 'remediate', reason: 'weak_skill', skill: weak[0].skill,
      rate: weak[0].rate, itemIds: index.bySkill[weak[0].skill].slice()
    };
  }

  const allStrong = confident.length === scored.length
    && confident.every((s) => s.rate >= DECISION.STRONG_AT_OR_ABOVE);
  if (allStrong) {
    return { action: 'advance', reason: 'all_skills_strong', skill: null, itemIds: [] };
  }

  const lowest = scored.slice().sort((a, b) => a.rate - b.rate || compareStable(a.skill, b.skill))[0];
  return {
    action: 'practice', reason: 'lowest_observed', skill: lowest.skill,
    rate: lowest.rate, itemIds: index.bySkill[lowest.skill].slice()
  };
}

/**
 * Pemilihan DETERMINISTIK, bukan acak. Keputusan adaptif yang berubah antar
 * pemanggilan atas bukti yang sama tidak bisa diuji dan tidak bisa dijelaskan
 * ke guru yang bertanya "kenapa muridnya dapat ini".
 */
function pickStable(skills) {
  return skills.slice().sort(compareStable)[0];
}

function compareStable(a, b) {
  return SKILLS.indexOf(a) - SKILLS.indexOf(b);
}

/* ========================================================================== */
/* LAPORAN KELAS UNTUK GURU (§20)                                              */
/* ========================================================================== */

/**
 * classProgress({ learners, evidence, lessonId }) -> ringkasan TINGKAT KELAS.
 *
 * §20 menuntut guru mendapat informasi berguna TANPA membuka isi Braincore
 * per murid. Batas itu ditegakkan di sini, bukan di UI:
 *   - keluaran hanya AGREGAT (jumlah selesai, rata-rata, keterampilan tersulit);
 *   - tidak ada `learnerSub` di dalamnya, jadi tidak ada IDOR yang mungkin;
 *   - MIN_COHORT menahan agregat kelas sangat kecil, karena rata-rata atas dua
 *     murid ADALAH data per murid dengan nama lain.
 */
export const MIN_COHORT = 5;

export function classProgress(input) {
  const learners = Array.isArray(input && input.learners) ? input.learners : [];
  const evidence = Array.isArray(input && input.evidence) ? input.evidence : [];
  const lessonId = (input && input.lessonId) || null;

  const relevant = lessonId ? evidence.filter((e) => e && e.lessonId === lessonId) : evidence;
  const completed = new Set(relevant.map((e) => e && e.learnerRef).filter(Boolean));

  const summary = masteryFromEvidence(relevant);
  const skills = Object.entries(summary.bySkill)
    .map(([skill, stats]) => ({ skill, ...stats }))
    .sort((a, b) => a.rate - b.rate || compareStable(a.skill, b.skill));

  const suppressed = learners.length > 0 && learners.length < MIN_COHORT;
  return {
    lessonId,
    assigned: learners.length,
    completed: completed.size,
    // Agregat ditahan, dan penahanannya DILAPORKAN. Mengembalikan nol diam-diam
    // akan dibaca guru sebagai "muridnya belum mengerjakan" — bohong yang lebih
    // buruk daripada menolak menjawab.
    suppressed,
    averageRate: suppressed || !relevant.length
      ? null
      : relevant.filter((e) => e.correct === true).length / relevant.length,
    hardestSkill: suppressed || !skills.length ? null : skills[0].skill,
    skills: suppressed ? [] : skills
  };
}

/**
 * syncStatusOf(node, indexResult) -> 'SYNCED' | 'PENDING' | 'FAILED' (§29).
 * Tiga keadaan, dan tidak ada keadaan keempat yang berbunyi "mungkin". §29
 * melarang melaporkan operasi server sebagai berhasil kalau tidak.
 */
export function syncStatusOf(node, indexResult) {
  if (!node) return 'FAILED';
  if (node.status !== CONTENT_STATUS.PUBLISHED) return 'PENDING';
  if (node.kind !== NODE_KIND.LESSON) return 'SYNCED';
  const skipped = (indexResult && indexResult.skipped) || [];
  if (skipped.length) return 'FAILED';
  const items = (indexResult && indexResult.items) || [];
  return items.length ? 'SYNCED' : 'PENDING';
}
