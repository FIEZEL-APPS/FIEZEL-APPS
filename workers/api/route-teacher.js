/**
 * workers/api/route-teacher.js — DASBOR GURU: pohon konten, bank soal, impor/
 * ekspor CSV, penerbitan, penugasan, dan laporan kelas (§3-§14, §20).
 *
 * ==========================================================================
 * SETIAP HANDLER MENYARING PER BARIS, BUKAN HANYA PER PERAN
 * ==========================================================================
 * `roleGate` sudah menjamin pemanggil BERPERAN guru. Itu tidak cukup, dan
 * kekurangannya adalah kelas kerentanan yang paling sering lolos ke produksi:
 * setiap guru berperan sah, jadi tanpa penyaringan per baris, guru B bisa
 * membaca dan menyunting konten guru A hanya dengan mengetik ID-nya.
 *
 * Karena itu SETIAP kueri di berkas ini membawa `teacher_sub = ?` di WHERE-nya,
 * dan tidak ada satu pun `SELECT ... WHERE id = ?` sendirian. Ini bukan
 * kebiasaan yang dianjurkan — `tests/role-security-test.js` membacanya sebagai teks
 * dan memerah kalau ada kueri tc_* di berkas ini yang tidak menyebut
 * `teacher_sub`.
 */

import { jsonResponse, jsonError } from './errors.js';
import { readJsonFromCtx, readTextLimited } from './mw-guard.js';
import { roleGate, viewerOf } from './auth/gate.js';
import {
  validateNode, validateQuestion, checkParent, checkTransition, checkPublishReady,
  versionStamp, canTeacherWrite, CONTENT_STATUS, NODE_KIND, CONTENT_PROBLEM
} from './teacher/content-core.js';
import {
  buildPreview, planCommit, summarize, exportQuestionsCsv, templateCsv, dedupKey, CSV_LIMITS
} from './teacher/csv-core.js';
import { buildIndex, classProgress, syncStatusOf } from './teacher/braincore-bridge.js';

/** ID konten: prefiks yang bisa dibaca manusia + 96 bit acak. */
function newId(prefix) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex.toUpperCase()}`;
}

const jsonCol = (value) => JSON.stringify(Array.isArray(value) ? value : []);
const parseCol = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

function rowToNode(row) {
  return { ...row, tags: parseCol(row.tags), vocabulary: parseCol(row.vocabulary) };
}
function rowToQuestion(row) {
  return { ...row, options: parseCol(row.options), tags: parseCol(row.tags) };
}

/* ========================================================================== */
/* GET /api/teacher/tree                                                       */
/* ========================================================================== */

export async function routeTeacherTree(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;

  const nodes = await gate.db.prepare(
    'SELECT * FROM tc_node WHERE teacher_sub = ?1 ORDER BY kind, title LIMIT 2000'
  ).bind(gate.sub).all();

  const counts = await gate.db.prepare(
    'SELECT lesson_id, COUNT(*) AS n FROM tc_question WHERE teacher_sub = ?1 GROUP BY lesson_id'
  ).bind(gate.sub).all();
  const byLesson = new Map(((counts && counts.results) || []).map((r) => [r.lesson_id, Number(r.n) || 0]));

  return jsonResponse({
    nodes: ((nodes && nodes.results) || []).map((row) => ({
      ...rowToNode(row),
      questionCount: byLesson.get(row.id) || 0
    }))
  }, gate.opt);
}

/* ========================================================================== */
/* POST /api/teacher/node/save                                                 */
/* ========================================================================== */

export async function routeNodeSave(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  const verdict = validateNode(body.value, ctx.now);
  if (!verdict.ok) return jsonError(400, 'content_invalid', { problems: verdict.problems }, gate.opt);

  // Induk dibaca dari D1 ber-`teacher_sub`, jadi ID induk milik guru lain tidak
  // pernah ditemukan dan tidak pernah bisa dipakai sebagai gantungan (IDOR).
  let parent = null;
  if (body.value.parentId) {
    parent = await gate.db.prepare('SELECT id, kind, teacher_sub, status FROM tc_node WHERE id = ?1 AND teacher_sub = ?2')
      .bind(String(body.value.parentId), gate.sub).first();
  }
  const parentProblem = checkParent({ kind: verdict.node.kind, parent, teacherSub: gate.sub });
  if (parentProblem) return jsonError(400, parentProblem.problem, {}, gate.opt);

  const existingId = typeof body.value.id === 'string' && body.value.id ? body.value.id : null;
  let existing = null;
  if (existingId) {
    existing = await gate.db.prepare('SELECT * FROM tc_node WHERE id = ?1 AND teacher_sub = ?2')
      .bind(existingId, gate.sub).first();
    if (!existing) return jsonError(404, CONTENT_PROBLEM.NOT_FOUND, {}, gate.opt);
    if (!canTeacherWrite(existing, viewerOf(gate))) return jsonError(403, CONTENT_PROBLEM.NOT_OWNED, {}, gate.opt);
  }

  const stamp = versionStamp({ record: existing, actorSub: gate.sub, nowMs: ctx.now, isCreate: !existing });
  const n = verdict.node;
  const id = existing ? existing.id : newId(n.kind.toUpperCase().slice(0, 4));
  const scope = body.value.scope === 'institution' ? 'institution' : 'private';

  await gate.db.prepare(
    'INSERT INTO tc_node (id, kind, parent_id, teacher_sub, institution_id, scope, title, description, ' +
    'objective, skill, level, difficulty, duration_min, tags, vocabulary, status, content_source, version, ' +
    'created_at, created_by, updated_at, updated_by) ' +
    'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22) '
    // Sunting mempertahankan `status`: penyimpanan isi TIDAK boleh diam-diam
    // menurunkan konten terbit menjadi draf (murid akan kehilangan tugasnya di
    // tengah jalan), dan tidak boleh menaikkan draf menjadi terbit tanpa lewat
    // /publish yang menjalankan checkPublishReady.
    + 'ON CONFLICT(id) DO UPDATE SET title=?7, description=?8, objective=?9, skill=?10, level=?11, ' +
    'difficulty=?12, duration_min=?13, tags=?14, vocabulary=?15, scope=?6, version=?18, updated_at=?21, updated_by=?22'
  ).bind(
    id, n.kind, parent ? parent.id : null, gate.sub, gate.institutionId, scope, n.title, n.description,
    n.objective, n.skill, n.level, n.difficulty, n.duration_min, jsonCol(n.tags), jsonCol(n.vocabulary),
    existing ? existing.status : CONTENT_STATUS.DRAFT, 'TEACHER', stamp.version,
    stamp.created_at, stamp.created_by, stamp.updated_at, stamp.updated_by
  ).run();

  return jsonResponse({ ok: true, id, version: stamp.version, warnings: verdict.warnings }, gate.opt);
}

/* ========================================================================== */
/* POST /api/teacher/node/publish  &  /archive                                 */
/* ========================================================================== */

async function ancestorsOf(db, node, teacherSub) {
  const chain = [];
  let current = node;
  // Batas 8 putaran adalah penahan siklus, bukan batas kedalaman produk:
  // hierarki hanya 4 tingkat, jadi 8 sudah longgar. Tanpa batas, satu baris
  // parent_id yang menunjuk dirinya sendiri menggantung Worker selamanya.
  for (let i = 0; i < 8 && current && current.parent_id; i += 1) {
    /* eslint-disable no-await-in-loop */
    const parent = await db.prepare('SELECT id, kind, status, parent_id FROM tc_node WHERE id = ?1 AND teacher_sub = ?2')
      .bind(current.parent_id, teacherSub).first();
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
}

async function changeStatus(ctx, target) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  const node = await gate.db.prepare('SELECT * FROM tc_node WHERE id = ?1 AND teacher_sub = ?2')
    .bind(String(body.value.id || ''), gate.sub).first();
  if (!node) return jsonError(404, CONTENT_PROBLEM.NOT_FOUND, {}, gate.opt);

  const transition = checkTransition(node.status, target);
  if (transition) return jsonError(409, transition.problem, { from: node.status, to: target }, gate.opt);

  let questions = [];
  if (node.kind === NODE_KIND.LESSON) {
    const rows = await gate.db.prepare('SELECT * FROM tc_question WHERE lesson_id = ?1 AND teacher_sub = ?2')
      .bind(node.id, gate.sub).all();
    questions = ((rows && rows.results) || []).map(rowToQuestion);
  }

  if (target === CONTENT_STATUS.PUBLISHED) {
    const ready = checkPublishReady({
      node: rowToNode(node), questions, ancestors: await ancestorsOf(gate.db, node, gate.sub)
    });
    if (ready) return jsonError(409, ready.problem, { detail: ready.detail || null }, gate.opt);
  }

  const writes = [
    gate.db.prepare('UPDATE tc_node SET status = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND teacher_sub = ?2')
      .bind(node.id, gate.sub, target, ctx.now, gate.sub)
  ];
  // Soal mengikuti status lesson-nya. Kalau tidak, lesson terbit akan berisi
  // soal draf yang tidak lolos jembatan Braincore, dan guru melihat "terbit"
  // sementara muridnya melihat lesson kosong.
  if (node.kind === NODE_KIND.LESSON) {
    writes.push(gate.db.prepare(
      'UPDATE tc_question SET status = ?3, updated_at = ?4 WHERE lesson_id = ?1 AND teacher_sub = ?2'
    ).bind(node.id, gate.sub, target, ctx.now));
  }
  await gate.db.batch(writes);

  const published = questions.map((q) => ({ ...q, status: target }));
  const index = buildIndex(published, { teacherId: gate.sub, institutionId: gate.institutionId, lessonId: node.id });

  // Status sinkronisasi dilaporkan APA ADANYA (§29). Kalau ada soal yang gagal
  // masuk indeks Braincore, guru melihat FAILED — bukan "berhasil" yang akan
  // ia percayai sampai muridnya mengeluh.
  return jsonResponse({
    ok: true, status: target,
    sync: syncStatusOf({ ...node, status: target }, index),
    indexed: index.items.length,
    skipped: index.skipped
  }, gate.opt);
}

export const routeNodePublish = (ctx) => changeStatus(ctx, CONTENT_STATUS.PUBLISHED);
export const routeNodeArchive = (ctx) => changeStatus(ctx, CONTENT_STATUS.ARCHIVED);

/* ========================================================================== */
/* BANK SOAL                                                                   */
/* ========================================================================== */

export async function routeQuestionList(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const lessonId = ctx.url.searchParams.get('lessonId') || '';
  const rows = lessonId
    ? await gate.db.prepare('SELECT * FROM tc_question WHERE teacher_sub = ?1 AND lesson_id = ?2 LIMIT 1000')
      .bind(gate.sub, lessonId).all()
    : await gate.db.prepare('SELECT * FROM tc_question WHERE teacher_sub = ?1 LIMIT 1000').bind(gate.sub).all();
  return jsonResponse({ questions: ((rows && rows.results) || []).map(rowToQuestion) }, gate.opt);
}

export async function routeQuestionSave(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  const verdict = validateQuestion(body.value, ctx.now);
  if (!verdict.ok) return jsonError(400, 'question_invalid', { problems: verdict.problems }, gate.opt);

  const lesson = await gate.db.prepare(
    'SELECT id, kind FROM tc_node WHERE id = ?1 AND teacher_sub = ?2 AND kind = ?3'
  ).bind(verdict.question.lesson_id, gate.sub, NODE_KIND.LESSON).first();
  if (!lesson) return jsonError(404, CONTENT_PROBLEM.NOT_FOUND, {}, gate.opt);

  let existing = null;
  if (body.value.id) {
    existing = await gate.db.prepare('SELECT * FROM tc_question WHERE id = ?1 AND teacher_sub = ?2')
      .bind(String(body.value.id), gate.sub).first();
    if (!existing) return jsonError(404, CONTENT_PROBLEM.NOT_FOUND, {}, gate.opt);
  }

  const q = verdict.question;
  const stamp = versionStamp({ record: existing, actorSub: gate.sub, nowMs: ctx.now, isCreate: !existing });
  const id = existing ? existing.id : newId('Q');

  try {
    await gate.db.prepare(
      'INSERT INTO tc_question (id, lesson_id, teacher_sub, type, stem, options, answer, explanation, example, ' +
      'skill, level, difficulty, tags, status, content_source, version, dedup_key, created_at, created_by, ' +
      'updated_at, updated_by) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21) ' +
      'ON CONFLICT(id) DO UPDATE SET type=?4, stem=?5, options=?6, answer=?7, explanation=?8, example=?9, ' +
      'skill=?10, level=?11, difficulty=?12, tags=?13, version=?16, dedup_key=?17, updated_at=?20, updated_by=?21'
    ).bind(
      id, q.lesson_id, gate.sub, q.type, q.stem, jsonCol(q.options), q.answer, q.explanation, q.example,
      q.skill, q.level, q.difficulty, jsonCol(q.tags), existing ? existing.status : CONTENT_STATUS.DRAFT,
      'TEACHER', stamp.version, dedupKey(q), stamp.created_at, stamp.created_by, stamp.updated_at, stamp.updated_by
    ).run();
  } catch {
    // Satu-satunya UNIQUE yang bisa gagal di sini adalah ux_tc_question_dedup:
    // soal identik milik guru yang sama. Menjawabnya 409 lebih jujur daripada
    // 500, karena guru bisa bertindak atasnya (sunting yang lama).
    return jsonError(409, 'csv_duplicate_question', {}, gate.opt);
  }

  return jsonResponse({ ok: true, id, version: stamp.version, warnings: verdict.warnings }, gate.opt);
}

/* ========================================================================== */
/* CSV                                                                         */
/* ========================================================================== */

/** Konteks impor: HANYA lesson dan soal milik pemanggil. Inilah yang membuat
 *  rujukan silang ke konten guru lain mustahil lewat unggahan berkas. */
async function importContext(gate) {
  const lessons = await gate.db.prepare('SELECT id FROM tc_node WHERE teacher_sub = ?1 AND kind = ?2')
    .bind(gate.sub, NODE_KIND.LESSON).all();
  const questions = await gate.db.prepare('SELECT id, lesson_id, type, stem FROM tc_question WHERE teacher_sub = ?1')
    .bind(gate.sub).all();
  return {
    knownLessonIds: ((lessons && lessons.results) || []).map((r) => r.id),
    existingIds: ((questions && questions.results) || []).map((r) => r.id),
    existingStems: (questions && questions.results) || []
  };
}

async function csvBody(ctx, gate) {
  // CSV masuk sebagai text/csv mentah, bukan dibungkus JSON: membungkusnya
  // berarti seluruh berkas harus di-escape sebagai string JSON, yang menggandakan
  // byte dan CPU parse pada anggaran yang paling langka.
  //
  // `ctx.bodyText` DIPERIKSA LEBIH DULU karena `guardMiddleware` sudah membaca
  // (dan menghabiskan) stream permintaan saat `Content-Length` tidak ada.
  // Memanggil readTextLimited di jalur itu akan mengembalikan teks KOSONG, dan
  // impor akan gagal dengan alasan "berkas kosong" yang menyesatkan guru.
  if (typeof ctx.bodyText === 'string') return { ok: true, value: ctx.bodyText };
  const limit = Math.min(ctx.byteLimit || CSV_LIMITS.MAX_BYTES, CSV_LIMITS.MAX_BYTES);
  const read = await readTextLimited(ctx.request, limit, gate.opt);
  if (!read.ok) return read;
  return { ok: true, value: read.text };
}

export async function routeCsvPreview(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const text = await csvBody(ctx, gate);
  if (!text.ok) return text.response;

  const overridesRaw = ctx.url.searchParams.get('map');
  let overrides = null;
  try { overrides = overridesRaw ? JSON.parse(overridesRaw) : null; } catch { overrides = null; }

  const report = buildPreview({ text: text.value, overrides, ...(await importContext(gate)) }, ctx.now);
  // PREVIEW TIDAK MENULIS APA PUN. Itu seluruh gunanya (§7): guru melihat
  // keputusan atas SELURUH berkas sebelum satu baris pun menyentuh database.
  return jsonResponse({ summary: summarize(report), report }, gate.opt);
}

export async function routeCsvCommit(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const text = await csvBody(ctx, gate);
  if (!text.ok) return text.response;

  const context = await importContext(gate);
  // Divalidasi ULANG dari teks, bukan mempercayai laporan yang dikirim klien:
  // laporan dari klien bisa dikarang, dan mengarangnya berarti melewati seluruh
  // validasi §8.
  const report = buildPreview({ text: text.value, overrides: null, ...context }, ctx.now);
  const plan = planCommit(report);
  if (!plan.ok) return jsonError(400, 'csv_refused', { summary: summarize(report), report }, gate.opt);

  const writes = [];
  for (const entry of plan.writes) {
    const q = entry.question;
    const stamp = versionStamp({ actorSub: gate.sub, nowMs: ctx.now, isCreate: entry.operation === 'create' });
    if (entry.operation === 'update') {
      writes.push(gate.db.prepare(
        'UPDATE tc_question SET type=?3, stem=?4, options=?5, answer=?6, explanation=?7, example=?8, ' +
        'skill=?9, level=?10, difficulty=?11, tags=?12, dedup_key=?13, version = version + 1, ' +
        'updated_at=?14, updated_by=?15 WHERE id = ?1 AND teacher_sub = ?2'
      ).bind(entry.contentId, gate.sub, q.type, q.stem, jsonCol(q.options), q.answer, q.explanation,
        q.example, q.skill, q.level, q.difficulty, jsonCol(q.tags), dedupKey(q), ctx.now, gate.sub));
    } else {
      writes.push(gate.db.prepare(
        'INSERT INTO tc_question (id, lesson_id, teacher_sub, type, stem, options, answer, explanation, ' +
        'example, skill, level, difficulty, tags, status, content_source, version, dedup_key, created_at, ' +
        'created_by, updated_at, updated_by) ' +
        'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21)'
      ).bind(newId('Q'), q.lesson_id, gate.sub, q.type, q.stem, jsonCol(q.options), q.answer, q.explanation,
        q.example, q.skill, q.level, q.difficulty, jsonCol(q.tags), CONTENT_STATUS.DRAFT, 'TEACHER',
        stamp.version, dedupKey(q), ctx.now, gate.sub, ctx.now, gate.sub));
    }
  }
  if (writes.length) await gate.db.batch(writes);

  return jsonResponse({
    ok: true, summary: summarize(report), refused: plan.refused, report,
    // Dinyatakan eksplisit supaya klien tidak perlu menyimpulkannya: impor
    // mendarat DRAFT dan guru masih harus menerbitkan (§13, §14).
    landedAs: CONTENT_STATUS.DRAFT
  }, gate.opt);
}

export async function routeCsvTemplate(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  return new Response(templateCsv(), {
    status: 200,
    headers: {
      ...gate.opt.headers,
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="fiezel-question-template.csv"'
    }
  });
}

export async function routeCsvExport(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const lessonId = ctx.url.searchParams.get('lessonId') || '';
  const rows = lessonId
    ? await gate.db.prepare('SELECT * FROM tc_question WHERE teacher_sub = ?1 AND lesson_id = ?2 LIMIT 5000')
      .bind(gate.sub, lessonId).all()
    : await gate.db.prepare('SELECT * FROM tc_question WHERE teacher_sub = ?1 LIMIT 5000').bind(gate.sub).all();

  // `exportQuestionsCsv` MENYARING LAGI atas `viewer` meski kueri sudah
  // ber-`teacher_sub`. Ganda dengan sengaja: penyaring di dalam fungsi ekspor
  // ikut terbawa ke setiap pemanggil berikutnya, termasuk yang lupa (§11).
  return new Response(exportQuestionsCsv(((rows && rows.results) || []).map(rowToQuestion), viewerOf(gate)), {
    status: 200,
    headers: {
      ...gate.opt.headers,
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="fiezel-questions.csv"'
    }
  });
}

/* ========================================================================== */
/* PENUGASAN & LAPORAN                                                         */
/* ========================================================================== */

export async function routeAssign(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  const lesson = await gate.db.prepare(
    'SELECT id, status FROM tc_node WHERE id = ?1 AND teacher_sub = ?2 AND kind = ?3'
  ).bind(String(body.value.lessonId || ''), gate.sub, NODE_KIND.LESSON).first();
  if (!lesson) return jsonError(404, CONTENT_PROBLEM.NOT_FOUND, {}, gate.opt);

  // Hanya lesson TERBIT yang boleh ditugaskan. Menugaskan draf berarti murid
  // menerima notifikasi untuk materi yang belum lolos validasi (§14).
  if (lesson.status !== CONTENT_STATUS.PUBLISHED) {
    return jsonError(409, CONTENT_PROBLEM.PUBLISH_NO_QUESTIONS, {}, gate.opt);
  }

  const learners = Array.isArray(body.value.learnerSubs)
    ? body.value.learnerSubs.filter((s) => typeof s === 'string' && s).slice(0, 500) : [];
  if (!learners.length) return jsonError(400, 'assign_no_targets', {}, gate.opt);

  const assignmentId = newId('ASG');
  const writes = [gate.db.prepare(
    'INSERT INTO tc_assignment (id, lesson_id, teacher_sub, class_code, due_day, status, created_at, updated_at) ' +
    'VALUES (?1,?2,?3,?4,?5,?6,?7,?7)'
  ).bind(assignmentId, lesson.id, gate.sub, body.value.classCode || null, body.value.dueDay || null,
    CONTENT_STATUS.PUBLISHED, ctx.now)];

  for (const learnerSub of learners) {
    writes.push(gate.db.prepare(
      'INSERT OR IGNORE INTO tc_assignment_target (assignment_id, learner_sub, assigned_at) VALUES (?1,?2,?3)'
    ).bind(assignmentId, learnerSub, ctx.now));
    writes.push(gate.db.prepare(
      'INSERT INTO notification (id, sub, kind, actor_sub, ref_id, day, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)'
    ).bind(newId('N'), learnerSub, 'assignment_available', gate.sub, assignmentId,
      new Date(ctx.now).toISOString().slice(0, 10), ctx.now));
  }
  await gate.db.batch(writes);

  return jsonResponse({ ok: true, assignmentId, assigned: learners.length }, gate.opt);
}

export async function routeTeacherProgress(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const lessonId = ctx.url.searchParams.get('lessonId') || '';

  const lesson = await gate.db.prepare('SELECT id FROM tc_node WHERE id = ?1 AND teacher_sub = ?2')
    .bind(lessonId, gate.sub).first();
  if (!lesson) return jsonError(404, CONTENT_PROBLEM.NOT_FOUND, {}, gate.opt);

  const targets = await gate.db.prepare(
    'SELECT t.learner_sub FROM tc_assignment_target t JOIN tc_assignment a ON a.id = t.assignment_id ' +
    'WHERE a.lesson_id = ?1 AND a.teacher_sub = ?2'
  ).bind(lessonId, gate.sub).all();
  const learners = ((targets && targets.results) || []).map((r) => r.learner_sub);

  // Bukti per-soal ditulis lane murid ke `tc_lesson_evidence` (skema 0012, jadi
  // tabelnya PASTI ada sesudah ensureAuthSchema). Kelas yang belum mengerjakan
  // apa pun menghasilkan array kosong, dan `classProgress` melaporkannya sebagai
  // nol yang jujur — bukan angka karangan.
  const rows = await gate.db.prepare(
    'SELECT learner_sub AS learnerRef, lesson_id AS lessonId, skill, correct FROM tc_lesson_evidence ' +
    'WHERE lesson_id = ?1 LIMIT 5000'
  ).bind(lessonId).all();
  const evidence = ((rows && rows.results) || []).map((r) => ({ ...r, correct: Number(r.correct) === 1 }));

  // `classProgress` sendiri yang menahan kohor kecil dan membuang pengenal murid
  // (§20). Handler ini tidak menambahkan satu pun bidang per-murid ke keluarannya.
  return jsonResponse({ progress: classProgress({ learners, evidence, lessonId }) }, gate.opt);
}

export const ROUTES = [
  ['GET', '/api/teacher/tree', routeTeacherTree],
  ['POST', '/api/teacher/node/save', routeNodeSave],
  ['POST', '/api/teacher/node/publish', routeNodePublish],
  ['POST', '/api/teacher/node/archive', routeNodeArchive],
  ['GET', '/api/teacher/question/list', routeQuestionList],
  ['POST', '/api/teacher/question/save', routeQuestionSave],
  ['POST', '/api/teacher/csv/preview', routeCsvPreview],
  ['POST', '/api/teacher/csv/commit', routeCsvCommit],
  ['GET', '/api/teacher/csv/template', routeCsvTemplate],
  ['GET', '/api/teacher/csv/export', routeCsvExport],
  ['POST', '/api/teacher/assign', routeAssign],
  ['GET', '/api/teacher/progress', routeTeacherProgress]
];
