/**
 * workers/api/teacher/class-sync-core.js — INTI MURNI sinkron Ruang Guru.
 * Tanpa D1, tanpa Request: hanya validasi bentuk, normalisasi, dan pembatas laju.
 * Handler-nya (route-class-sync.js) tipis; yang diuji gerbang adalah berkas ini.
 *
 * Kontrak privasi (bab 29): laporan murid HANYA memuat nama depan (<=24 huruf),
 * akurasi agregat per skill (benar/total), jumlah sesi, tujuan belajar, dan ID
 * tugas yang selesai. Tidak ada jawaban mentah, teks bebas, atau transkrip.
 */

export const CLASS_CODE_RE = /^FZ-[A-HJ-NP-Z2-9]{6}$/;
export const LIMITS = Object.freeze({
  NAME_MAX: 24, TITLE_MAX: 60, SKILLS_MAX: 12, SKILL_KEY_MAX: 32, COUNT_MAX: 5000,
  ASSIGN_MAX: 8, ASSIGN_ID_MAX: 40, WRONG_MAX: 40, REPORTS_PAGE: 200,
  LEARNER_MIN_INTERVAL_MS: 15000, TEACHER_MIN_INTERVAL_MS: 3000
});

/** normalizeClassCode(raw) -> 'FZ-XXXXXX' | null. Toleran terhadap huruf kecil dan tanpa strip. */
export function normalizeClassCode(raw) {
  let v = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.startsWith('FZ')) v = v.slice(2);
  const code = 'FZ-' + v;
  return CLASS_CODE_RE.test(code) ? code : null;
}

export function firstName(raw) {
  const s = String(raw || '').trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}'’.-]/gu, '');
  return s.slice(0, LIMITS.NAME_MAX);
}
export function learnerKey(name) { return firstName(name).toLocaleLowerCase('id'); }

function intIn(v, max) { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; }

/**
 * normalizeReport(body, nowMs) -> { ok:true, code, name, key, report } | { ok:false, reason }
 * `report` adalah bentuk yang disimpan ke report_json dan dibaca klien guru
 * (sama dengan payload "kode hasil untuk tutor" versi 1).
 */
export function normalizeReport(body, nowMs) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'not_object' };
  const code = normalizeClassCode(body.cls);
  if (!code) return { ok: false, reason: 'bad_class_code' };
  const name = firstName(body.name);
  if (!name) return { ok: false, reason: 'bad_name' };
  const skillsIn = body.skills;
  if (!skillsIn || typeof skillsIn !== 'object' || Array.isArray(skillsIn)) return { ok: false, reason: 'bad_skills' };
  const keys = Object.keys(skillsIn);
  if (keys.length > LIMITS.SKILLS_MAX) return { ok: false, reason: 'too_many_skills' };
  const skills = {};
  for (const k of keys) {
    if (!/^[a-z0-9_]{1,32}$/.test(k)) return { ok: false, reason: 'bad_skill_key' };
    const c = intIn(skillsIn[k] && skillsIn[k].c, LIMITS.COUNT_MAX), t = intIn(skillsIn[k] && skillsIn[k].t, LIMITS.COUNT_MAX);
    if (c == null || t == null || c > t) return { ok: false, reason: 'bad_skill_count' };
    skills[k] = { c, t };
  }
  const at = Number(body.at);
  const reportedAt = Number.isFinite(at) && Math.abs(at - nowMs) < 3 * 86400000 ? Math.round(at) : nowMs;
  const lessons = intIn(body.lessons, LIMITS.COUNT_MAX) || 0;
  const goal = typeof body.goal === 'string' && /^[a-z_]{1,24}$/.test(body.goal) ? body.goal : undefined;
  let assign;
  if (body.assign !== undefined) {
    if (!Array.isArray(body.assign) || body.assign.length > LIMITS.ASSIGN_MAX) return { ok: false, reason: 'bad_assign' };
    assign = [];
    for (const a of body.assign) {
      const id = a && typeof a.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(a.id) ? a.id : null;
      if (!id) return { ok: false, reason: 'bad_assign_id' };
      const c = intIn(a.c, LIMITS.COUNT_MAX), t = intIn(a.t, LIMITS.COUNT_MAX);
      const entry = { id, at: Number(a.at) || reportedAt, c: c == null ? undefined : c, t: t == null ? undefined : t };
      // s = sedang mengerjakan (dibuka, belum selesai); w = soal yang salah {i:itemId, o:pilihan}.
      if (a.s) entry.s = 1;
      if (a.w !== undefined) {
        if (!Array.isArray(a.w) || a.w.length > LIMITS.WRONG_MAX) return { ok: false, reason: 'bad_assign_wrong' };
        entry.w = [];
        for (const x of a.w) {
          const i = x && typeof x.i === 'string' && x.i.length >= 1 && x.i.length <= 40 ? x.i : null;
          const o = intIn(x && x.o, 7);
          if (i == null || o == null) return { ok: false, reason: 'bad_assign_wrong' };
          entry.w.push({ i, o });
        }
      }
      assign.push(entry);
    }
  }
  return { ok: true, code, name, key: learnerKey(name), report: { v: 1, name, at: reportedAt, goal, skills, lessons, cls: code, assign } };
}

export const ASSIGN_LIMITS = Object.freeze({
  ID_MAX: 40, TITLE_MAX: 80, SKILLS_MAX: 3, ITEMS_MAX: 40, ITEM_ID_MAX: 40, FROM_MAX: 60, TARGETS_MAX: 80,
  TEACHER_MAX: 60, CUSTOM_MAX: 40, PROMPT_MAX: 400, CONTEXT_MAX: 1200, OPTION_MAX: 120, OPTIONS_MAX: 6, WHY_MAX: 240,
  PAGE: 20, LEARNER_POLL_MIN_INTERVAL_MS: 5000
});

/**
 * normalizeCustomItems(items) -> { ok, items } | { ok:false, reason }
 * Soal kustom guru (tulis sendiri / impor) yang ikut dalam payload tugas. Hanya teks soal,
 * pilihan, kunci, skill, dan alasan distraktor — bentuk yang sama dengan item bank FIEZEL.
 */
export function normalizeCustomItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > ASSIGN_LIMITS.CUSTOM_MAX) return { ok: false, reason: 'bad_custom_items' };
  const out = [];
  for (const q of items) {
    if (!q || typeof q !== 'object') return { ok: false, reason: 'bad_custom_item' };
    const id = typeof q.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(q.id) ? q.id : null;
    if (!id) return { ok: false, reason: 'bad_custom_id' };
    const prompt = String(q.prompt || '').trim().slice(0, ASSIGN_LIMITS.PROMPT_MAX);
    if (!prompt) return { ok: false, reason: 'bad_custom_prompt' };
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > ASSIGN_LIMITS.OPTIONS_MAX) return { ok: false, reason: 'bad_custom_options' };
    const options = q.options.map((o) => String(o == null ? '' : o).trim().slice(0, ASSIGN_LIMITS.OPTION_MAX));
    if (options.some((o) => !o)) return { ok: false, reason: 'bad_custom_options' };
    const answer = intIn(q.answer, options.length - 1);
    if (answer == null) return { ok: false, reason: 'bad_custom_answer' };
    const skill = typeof q.skill === 'string' && /^[a-z0-9_]{1,32}$/.test(q.skill) ? q.skill : 'grammar';
    const item = { id, prompt, options, answer, skill };
    if (typeof q.context === 'string' && q.context.trim()) item.context = q.context.trim().slice(0, ASSIGN_LIMITS.CONTEXT_MAX);
    if (q.why && typeof q.why === 'object' && !Array.isArray(q.why)) {
      const why = {};
      for (const k of Object.keys(q.why)) { const ki = intIn(k, options.length - 1); const txt = String(q.why[k] || '').trim().slice(0, ASSIGN_LIMITS.WHY_MAX); if (ki != null && txt) why[ki] = txt; }
      if (Object.keys(why).length) item.why = why;
    }
    out.push(item);
  }
  return { ok: true, items: out };
}

/**
 * normalizeAssignment(body) -> { ok:true, code, id, payload, targets } | { ok:false, reason }
 * `payload` = bentuk yang SAMA dengan "kode tugas" (assignmentCode v1) sisi klien,
 * `targets` = null (seluruh kelas) atau daftar learner_key.
 */
export function normalizeAssignment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'not_object' };
  const code = normalizeClassCode(body.code);
  if (!code) return { ok: false, reason: 'bad_class_code' };
  const a = body.assignment;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return { ok: false, reason: 'bad_assignment' };
  const id = typeof a.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(a.id) ? a.id : null;
  if (!id) return { ok: false, reason: 'bad_assign_id' };
  const title = String(a.title || '').trim().slice(0, ASSIGN_LIMITS.TITLE_MAX) || 'Tugas';
  if (!Array.isArray(a.skills) || !a.skills.length || a.skills.length > ASSIGN_LIMITS.SKILLS_MAX) return { ok: false, reason: 'bad_skills' };
  for (const k of a.skills) if (!/^[a-z0-9_]{1,32}$/.test(String(k))) return { ok: false, reason: 'bad_skill_key' };
  if (!Array.isArray(a.itemIds) || !a.itemIds.length || a.itemIds.length > ASSIGN_LIMITS.ITEMS_MAX) return { ok: false, reason: 'bad_items' };
  for (const it of a.itemIds) if (typeof it !== 'string' || !it || it.length > ASSIGN_LIMITS.ITEM_ID_MAX) return { ok: false, reason: 'bad_item_id' };
  const minutes = intIn(a.minutes, 240) || 5;
  const mode = a.mode === 'ujian' ? 'ujian' : 'latihan';
  const timer = intIn(a.timer, 240) || 0;
  const deadline = typeof a.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.deadline) ? a.deadline : null;
  const from = String(a.from || '').trim().slice(0, ASSIGN_LIMITS.FROM_MAX);
  const payload = { v: 1, t: 'assign', id, title, skills: a.skills.map(String), itemIds: a.itemIds.slice(), minutes, from, cls: code, deadline, mode, timer, shuffle: !!a.shuffle };
  const teacher = String(a.teacher || '').trim().slice(0, ASSIGN_LIMITS.TEACHER_MAX);
  if (teacher) payload.teacher = teacher;
  if (a.items !== undefined) {
    const ci = normalizeCustomItems(a.items);
    if (!ci.ok) return { ok: false, reason: ci.reason };
    payload.items = ci.items;
  }
  let targets = null;
  if (body.targets != null) {
    if (!Array.isArray(body.targets) || body.targets.length > ASSIGN_LIMITS.TARGETS_MAX) return { ok: false, reason: 'bad_targets' };
    targets = [];
    for (const t of body.targets) { const k = learnerKey(t); if (k && targets.indexOf(k) < 0) targets.push(k); }
    if (!targets.length) return { ok: false, reason: 'bad_targets' };
  }
  return { ok: true, code, id, payload, targets };
}

/** Baris D1 -> tugas untuk murid; targets yang tidak memuat kunci murid dibuang. */
export function rowToAssignment(row, key) {
  let payload = null, targets = null;
  try { payload = JSON.parse(row.payload_json); } catch { payload = null; }
  if (!payload || typeof payload !== 'object') return null;
  if (row.targets_json) { try { targets = JSON.parse(row.targets_json); } catch { targets = null; } }
  if (Array.isArray(targets) && targets.indexOf(key) < 0) return null;
  return { id: row.id, at: Number(row.updated_at) || 0, assignment: payload };
}

/** normalizeClaim(body) -> { ok, code, title, level } | { ok:false, reason } */
export function normalizeClaim(body) {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'not_object' };
  const code = normalizeClassCode(body.code);
  if (!code) return { ok: false, reason: 'bad_class_code' };
  const title = String(body.title || '').trim().slice(0, LIMITS.TITLE_MAX) || 'Kelas';
  const level = typeof body.level === 'string' && /^[ABC][12]$/.test(body.level) ? body.level : null;
  return { ok: true, code, title, level };
}

/** Pembatas laju per kunci dalam memori isolate: cukup untuk menahan banjir satu perangkat. */
export function makeRateLimiter(minIntervalMs, capacity = 4000) {
  const last = new Map();
  return function allow(key, nowMs) {
    const prev = last.get(key) || 0;
    if (nowMs - prev < minIntervalMs) return false;
    if (last.size >= capacity) last.clear();
    last.set(key, nowMs);
    return true;
  };
}

/** Baris D1 -> objek yang dibaca klien guru. report_json yang rusak dibuang, bukan melempar. */
export function rowToReport(row) {
  let report = null;
  try { report = JSON.parse(row.report_json); } catch { report = null; }
  if (!report || typeof report !== 'object') return null;
  return { key: row.learner_key, name: row.display_name, reportedAt: Number(row.reported_at) || 0, updatedAt: Number(row.updated_at) || 0, report };
}
